import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthModal from '../components/AuthModal';
import OnboardingModal from '../components/OnboardingModal';
import LegalDocumentModal from '../components/LegalDocumentModal';
import RevealIn from '../components/landing/RevealIn';
import Marquee from '../components/landing/Marquee';
import MagneticButton from '../components/landing/MagneticButton';
import AnimatedGiftIcon from '../components/landing/AnimatedGiftIcon';
import GiftMascot from '../components/landing/GiftMascot';
import { AuthProvider, useAuth } from '../context/AuthContext';
import ClientDashboard from '../features/client/screens/ClientDashboard';
import AdminDashboard from '../features/admin/screens/AdminDashboard';
import { checkServerHealth } from '../services/authApi';
import { initAnalytics, identifyUser, resetAnalyticsUser, track, Events } from '../services/analytics';
import { initSentry, setSentryUser, clearSentryUser } from '../services/sentry';

initSentry();
initAnalytics();

const ONBOARDING_KEY = 'gift_app_onboarding_done';

const FEATURES = [
  {
    title: 'Alerte de preț',
    desc: 'Urmărești un produs? Te anunțăm instant când prețul scade — prinde mereu cea mai bună ofertă pentru cadoul perfect.',
    accent: '#ff4d6d',
  },
  {
    title: 'Persoane dragi',
    desc: 'Preferințe, zile de naștere, cadouri istorice — totul organizat elegant pentru fiecare persoană din viața ta.',
    accent: '#2dd4bf',
  },
  {
    title: 'GiftBot AI',
    desc: 'Fără inspirație? Descrie persoana și bugetul — GiftBot-ul îți sugerează cadoul perfect în câteva secunde.',
    accent: '#a78bfa',
  },
];

const STEPS = [
  {
    num: '01',
    title: 'Adaugi persoanele dragi',
    desc: 'Nume, zi de naștere, preferințe. Gata — nu mai uiți niciodată.',
  },
  {
    num: '02',
    title: 'Găsești produsele dorite',
    desc: 'Navighezi prin magazinele partenere și adaugi produse în lista de cadouri.',
  },
  {
    num: '03',
    title: 'Primești alerta la prețul optim',
    desc: 'Ne ocupăm noi de monitorizare. Tu cumperi exact când prețul e cel mai bun.',
  },
];

// Placeholder slots — swap in real partner store names/logos once confirmed.
const PARTNERS = ['Partener 01', 'Partener 02', 'Partener 03', 'Partener 04', 'Partener 05'];

function AnimatedBlob({
  style,
  driftX = 18,
  driftY = 14,
  duration = 6000,
}: {
  style: any;
  driftX?: number;
  driftY?: number;
  duration?: number;
}) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(
      withSequence(
        withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration, easing: Easing.inOut(Easing.sin) })
      ),
      -1
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: t.value * driftX },
      { translateY: t.value * driftY },
    ],
  }));

  return <Animated.View style={[style, animatedStyle]} pointerEvents="none" />;
}

function ScrollCue() {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 700, easing: Easing.inOut(Easing.quad) })
      ),
      -1
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + t.value * 0.6,
    transform: [{ translateY: t.value * 6 }],
  }));

  return (
    <View style={styles.scrollCueWrap} pointerEvents="none">
      <Animated.Text style={[styles.scrollCueChevron, animatedStyle]}>⌄</Animated.Text>
    </View>
  );
}

function GiftFeatureCard({
  index,
  title,
  desc,
  accent,
}: {
  index: number;
  title: string;
  desc: string;
  accent: string;
}) {
  const [opened, setOpened] = useState(false);
  const reveal = useSharedValue(0);

  const open = () => {
    setOpened((current) => {
      if (current) return current;
      reveal.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
      return true;
    });
  };

  const revealStyle = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [{ translateY: (1 - reveal.value) * 10 }],
  }));

  return (
    <Pressable style={styles.featureCardInner} onHoverIn={open} onPress={open}>
      <Text style={styles.featureIndex}>{String(index + 1).padStart(2, '0')}</Text>
      <GiftMascot
        size={88}
        mood={opened ? 'success' : 'idle'}
        boxColor={accent}
        sparkleColor={accent}
      />
      <Text style={styles.featureTitle}>{title}</Text>
      <Animated.View style={revealStyle}>
        <Text style={styles.featureDesc}>{desc}</Text>
      </Animated.View>
      {!opened && <Text style={styles.featureHint}>Atinge cadoul ✦</Text>}
    </Pressable>
  );
}

function GuestHome({
  onOpenAuth,
  scrollY,
}: {
  onOpenAuth: () => void;
  scrollY: SharedValue<number>;
}) {
  const { width } = useWindowDimensions();
  const isWide = width >= 860;
  const [legalDoc, setLegalDoc] = useState<'privacy' | 'terms' | null>(null);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const bigBrandStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 90], [1, 0], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(scrollY.value, [0, 90], [0, -18], Extrapolation.CLAMP) },
      { scale: interpolate(scrollY.value, [0, 90], [1, 0.85], Extrapolation.CLAMP) },
    ],
  }));

  // Same fade-out recipe as the brand mark above, just timed to hand off to the sticky
  // header's motto + gift icon once they've faded in (see stickyMottoStyle in IndexContent).
  const heroHeadlineFadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [130, 220], [1, 0], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(scrollY.value, [130, 220], [0, -18], Extrapolation.CLAMP) },
      { scale: interpolate(scrollY.value, [130, 220], [1, 0.9], Extrapolation.CLAMP) },
    ],
  }));

  const heroVisualFadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [130, 220], [1, 0], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(scrollY.value, [130, 220], [0, -18], Extrapolation.CLAMP) },
      { scale: interpolate(scrollY.value, [130, 220], [1, 0.9], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <>
      <Animated.ScrollView
        contentContainerStyle={styles.landingContainer}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
      {/* ── HERO ── */}
      <View style={styles.hero}>
        <AnimatedBlob style={styles.blobTopRight} driftX={16} driftY={12} duration={6200} />
        <AnimatedBlob style={styles.blobBottomLeft} driftX={-14} driftY={-10} duration={7400} />

        <View style={[styles.heroInner, isWide && styles.heroInnerWide]}>
          <View style={styles.heroCopy}>
            <RevealIn delay={0}>
              <Animated.Text
                style={[styles.heroBrandMark, isWide && styles.heroBrandMarkWide, bigBrandStyle]}
              >
                PresentPerfect
              </Animated.Text>
            </RevealIn>

            <Animated.View style={heroHeadlineFadeStyle}>
              <RevealIn delay={90}>
                <Text style={[styles.heroHeadline, isWide && styles.heroHeadlineWide]}>
                  Cadoul potrivit.
                </Text>
              </RevealIn>
              <RevealIn delay={180}>
                <Text
                  style={[
                    styles.heroHeadline,
                    styles.heroHeadlineAccent,
                    isWide && styles.heroHeadlineWide,
                  ]}
                >
                  La timpul potrivit.
                </Text>
              </RevealIn>
            </Animated.View>

            <RevealIn delay={300} style={styles.heroActions}>
              <MagneticButton onPress={onOpenAuth} style={styles.heroButton}>
                <Text style={styles.heroButtonText}>Începe acum</Text>
                <Text style={styles.heroButtonArrow}>→</Text>
              </MagneticButton>
            </RevealIn>
          </View>

          {isWide && (
            <Animated.View style={heroVisualFadeStyle}>
              <RevealIn delay={220} style={styles.heroVisual}>
                <AnimatedGiftIcon size={260} />
              </RevealIn>
            </Animated.View>
          )}
        </View>

        <ScrollCue />
      </View>

      {/* ── MARQUEE ── */}
      <View style={styles.marqueeStrip}>
        <Marquee
          text="   Ⓟ DEDICAȚII PENTRU PRESENTPERFECT   Ⓟ Un student: „Eram la testul de engleză și am ajuns aici...”   Ⓟ O soacră: „Nu mai caut cadouri la întâmplare, PresentPerfect știe mai bine ca mine!”   Ⓟ Un burlac în panică: „Ziua ei e mâine. Salvați-mă!”   Ⓟ O mamă ocupată: „Copilul zice că vrea «orice». Mulțumesc că traduceți pentru mine!”   Ⓟ Un coleg de birou: „Secret Santa nu mai e coșmar de birou grație vouă.”   Ⓟ Un tată uituc: „Aniversarea era azi? Bine că am alertă de preț, nu doar scuze.”   Ⓟ O bunică modernă: „Nepotu-i pe telefon toată ziua, măcar cadoul i-l aleg eu bine.”   Ⓟ Un mire emoționat: „Lista de nuntă s-a transformat în listă de cadouri perfecte.”   "
          textStyle={styles.marqueeText}
          pxPerSecond={55}
        />
      </View>

      {/* ── FEATURES ── */}
      <View style={styles.section}>
        <RevealIn>
          <Text style={styles.sectionLabel}>Ce poți face</Text>
        </RevealIn>
        <RevealIn delay={60}>
          <Text style={[styles.sectionTitle, isWide && styles.sectionTitleWide]}>
            Tot ce ai nevoie pentru{'\n'}cadouri memorabile
          </Text>
        </RevealIn>
        <RevealIn delay={110}>
          <Text style={styles.sectionHint}>Atinge sau treci cu mouse-ul peste fiecare cadou</Text>
        </RevealIn>

        <View style={[styles.featuresRow, isWide && styles.featuresRowWide]}>
          {FEATURES.map((f, i) => (
            <RevealIn
              key={f.title}
              delay={160 + i * 100}
              style={[styles.featureCard, isWide ? styles.featureCardWide : null]}
            >
              <GiftFeatureCard index={i} title={f.title} desc={f.desc} accent={f.accent} />
            </RevealIn>
          ))}
        </View>
      </View>

      {/* ── PARTNERS ── */}
      <View style={[styles.section, styles.partnersSection]}>
        <RevealIn>
          <Text style={styles.sectionLabel}>Parteneri</Text>
        </RevealIn>
        <RevealIn delay={60}>
          <Text style={[styles.sectionTitle, isWide && styles.sectionTitleWide]}>
            Cumperi direct din magazinele{'\n'}tale preferate
          </Text>
        </RevealIn>

        <RevealIn delay={140} style={styles.partnersRow}>
          {PARTNERS.map((name) => (
            <View key={name} style={styles.partnerChip}>
              <Text style={styles.partnerChipText}>{name}</Text>
            </View>
          ))}
        </RevealIn>
      </View>

      {/* ── HOW IT WORKS ── */}
      <View style={[styles.section, styles.storySection]}>
        <RevealIn>
          <Text style={styles.sectionLabel}>Cum funcționează</Text>
        </RevealIn>
        <RevealIn delay={60}>
          <Text style={[styles.sectionTitle, isWide && styles.sectionTitleWide]}>
            Trei pași spre cadoul ideal
          </Text>
        </RevealIn>

        <View style={styles.stepsContainer}>
          {STEPS.map((step, i) => (
            <RevealIn key={step.num} delay={160 + i * 110}>
              <View style={styles.step}>
                <Text style={styles.stepBigNum}>{step.num}</Text>
                <View style={styles.stepBody}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDesc}>{step.desc}</Text>
                </View>
              </View>
              {i < STEPS.length - 1 && <View style={styles.stepConnector} />}
            </RevealIn>
          ))}
        </View>
      </View>

      {/* ── BOTTOM CTA ── */}
      <View style={styles.ctaSection}>
        <AnimatedBlob style={styles.ctaBlob} driftX={18} driftY={14} duration={8200} />

        <RevealIn>
          <Text style={[styles.ctaHeadline, isWide && styles.ctaHeadlineWide]}>
            PresentPerfect
          </Text>
        </RevealIn>

        <RevealIn delay={90} style={styles.ctaButtonWrap}>
          <MagneticButton onPress={onOpenAuth} style={styles.ctaButton}>
            <Text style={styles.ctaButtonText}>Începe acum</Text>
          </MagneticButton>
        </RevealIn>

        <Pressable onPress={onOpenAuth} style={styles.ctaLoginWrap}>
          <Text style={styles.ctaLoginLink}>Ai deja cont? Autentifică-te →</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <View style={[styles.footerTop, isWide && styles.footerTopWide]}>
          <View style={[styles.footerBrand, !isWide && styles.footerBrandCentered]}>
            <Text style={styles.footerBrandText}>PresentPerfect</Text>
            <Text style={styles.footerTagline}>Cadoul potrivit, la timpul potrivit.</Text>
          </View>

          <View style={styles.footerLinks}>
            <Pressable onPress={() => setLegalDoc('privacy')}>
              <Text style={styles.footerLink}>Politica de confidențialitate</Text>
            </Pressable>
            <Text style={styles.footerLinkDot}>·</Text>
            <Pressable onPress={() => setLegalDoc('terms')}>
              <Text style={styles.footerLink}>Termeni și condiții</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.footerDivider} />

        <Text style={styles.footerCopyright}>
          © {new Date().getFullYear()} PresentPerfect. Toate drepturile rezervate.
        </Text>
      </View>
      </Animated.ScrollView>

      <LegalDocumentModal type={legalDoc} onClose={() => setLegalDoc(null)} />
    </>
  );
}

function ServerDown({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.centerBlock}>
      <Text style={styles.serverDownTitle}>Server indisponibil</Text>
      <Text style={styles.serverDownText}>
        Backend-ul nu răspunde momentan. Pornește serverul și încearcă din nou.
      </Text>
      <Pressable style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryButtonText}>Reîncearcă</Text>
      </Pressable>
    </View>
  );
}

function IndexContent() {
  const { loading, profile, logout } = useAuth();
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [serverChecking, setServerChecking] = useState(true);
  const [serverUp, setServerUp] = useState(false);
  const [onboardingVisible, setOnboardingVisible] = useState(false);
  const scrollY = useSharedValue(0);

  const checkServer = async () => {
    setServerChecking(true);
    try {
      await checkServerHealth();
      setServerUp(true);
    } catch {
      setServerUp(false);
    } finally {
      setServerChecking(false);
    }
  };

  useEffect(() => {
    checkServer();
    track(Events.APP_OPEN);
  }, []);

  useEffect(() => {
    if (!profile) return;
    identifyUser(profile.uid, { role: profile.role, firstName: profile.firstName });
    setSentryUser(profile.uid);

    if (profile.role === 'client') {
      AsyncStorage.getItem(ONBOARDING_KEY).then((done) => {
        if (!done) {
          setOnboardingVisible(true);
          track(Events.ONBOARDING_STARTED);
        }
      });
    }
  }, [profile?.uid]);

  const handleLogout = () => {
    resetAnalyticsUser();
    clearSentryUser();
    track(Events.LOGOUT);
    logout();
  };

  const handleOnboardingDone = () => {
    setOnboardingVisible(false);
    AsyncStorage.setItem(ONBOARDING_KEY, 'true');
  };

  const handleOnboardingSkip = () => {
    setOnboardingVisible(false);
    AsyncStorage.setItem(ONBOARDING_KEY, 'true');
  };

  const headerButtonLabel = useMemo(() => {
    if (!profile) return 'Autentificare';
    return `${profile.firstName} (${profile.role})`;
  }, [profile]);

  const { width: windowWidth } = useWindowDimensions();
  const isWide = windowWidth >= 860;

  const isGuestLanding = !profile && !serverChecking && serverUp && !loading;

  const smallLogoStyle = useAnimatedStyle(() => {
    if (!isGuestLanding) {
      return { opacity: 1, transform: [{ translateY: 0 }] };
    }
    return {
      opacity: interpolate(scrollY.value, [40, 110], [0, 1], Extrapolation.CLAMP),
      transform: [
        { translateY: interpolate(scrollY.value, [40, 110], [8, 0], Extrapolation.CLAMP) },
      ],
    };
  }, [isGuestLanding]);

  const stickyMottoStyle = useAnimatedStyle(() => {
    if (!isGuestLanding) {
      return { opacity: 0 };
    }
    return {
      opacity: interpolate(scrollY.value, [130, 210], [0, 1], Extrapolation.CLAMP),
      transform: [
        { translateY: interpolate(scrollY.value, [130, 210], [8, 0], Extrapolation.CLAMP) },
      ],
    };
  }, [isGuestLanding]);

  return (
    <SafeAreaView style={styles.container}>
      {(!profile || serverChecking || !serverUp || loading) && (
        <View style={styles.topBar}>
          <View style={styles.topBarBrand}>
            <Animated.Text style={[styles.appName, smallLogoStyle]}>PresentPerfect</Animated.Text>
            {isWide && (
              <Animated.View style={[styles.topBarMottoRow, stickyMottoStyle]}>
                <Text style={styles.topBarGiftEmoji}>🎁</Text>
                <Text style={styles.topBarMotto} numberOfLines={1}>
                  Cadoul potrivit. La timpul potrivit.
                </Text>
              </Animated.View>
            )}
          </View>
          {!profile && (
            <Pressable
              style={[styles.topBarButton, !serverUp && styles.topBarButtonDisabled]}
              onPress={() => setAuthModalVisible(true)}
              disabled={!serverUp}
            >
              <Text style={styles.topBarButtonText}>{headerButtonLabel}</Text>
            </Pressable>
          )}
        </View>
      )}

      <View style={styles.content}>
        {serverChecking ? (
          <View style={styles.centerBlock}>
            <ActivityIndicator size="large" color="#be123c" />
            <Text style={styles.loadingText}>Se verifică serverul...</Text>
          </View>
        ) : !serverUp ? (
          <ServerDown onRetry={checkServer} />
        ) : loading ? (
          <View style={styles.centerBlock}>
            <ActivityIndicator size="large" color="#be123c" />
            <Text style={styles.loadingText}>Se încarcă sesiunea...</Text>
          </View>
        ) : !profile ? (
          <GuestHome onOpenAuth={() => setAuthModalVisible(true)} scrollY={scrollY} />
        ) : profile.role === 'client' ? (
          <ClientDashboard
            firstName={profile.firstName}
            lastName={(profile as any).lastName}
            userGender={(profile as any).gender}
            onLogout={handleLogout}
          />
        ) : (
          <AdminDashboard
            firstName={profile.firstName}
            lastName={(profile as any).lastName}
            onLogout={handleLogout}
          />
        )}
      </View>

      <AuthModal
        visible={authModalVisible}
        onClose={() => setAuthModalVisible(false)}
      />

      <OnboardingModal
        visible={onboardingVisible}
        onDone={handleOnboardingDone}
        onSkip={handleOnboardingSkip}
      />
    </SafeAreaView>
  );
}

export default function Index() {
  return (
    <AuthProvider>
      <IndexContent />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff7ed',
  },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#0b0508',
  },
  appName: {
    fontSize: 19,
    fontWeight: '800',
    color: '#fdf2f4',
    letterSpacing: -0.5,
  },
  topBarBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flexShrink: 1,
  },
  topBarMottoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  topBarMotto: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(253,242,244,0.6)',
    flexShrink: 1,
  },
  topBarGiftEmoji: {
    fontSize: 16,
  },
  topBarButton: {
    backgroundColor: '#ff4d6d',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
  },
  topBarButtonDisabled: {
    opacity: 0.4,
  },
  topBarButtonText: {
    color: '#1c0a13',
    fontWeight: '700',
    fontSize: 13,
  },
  content: {
    flex: 1,
  },

  /* ── LANDING ── */
  landingContainer: {
    paddingBottom: 0,
  },

  /* HERO */
  hero: {
    backgroundColor: '#0b0508',
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 56,
    overflow: 'hidden',
  },
  heroInner: {
    alignItems: 'center',
  },
  heroInnerWide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 48,
    maxWidth: 1080,
    alignSelf: 'center',
    width: '100%',
  },
  heroCopy: {
    alignItems: 'center',
    maxWidth: 620,
  },
  heroVisual: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  blobTopRight: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#ff4d6d',
    opacity: 0.16,
  },
  blobBottomLeft: {
    position: 'absolute',
    bottom: -90,
    left: -90,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#9f1239',
    opacity: 0.14,
  },
  heroBrandMark: {
    fontSize: 30,
    fontWeight: '900',
    color: '#fdf2f4',
    letterSpacing: -0.8,
    marginBottom: 22,
  },
  heroBrandMarkWide: {
    fontSize: 40,
  },
  heroHeadline: {
    fontSize: 42,
    fontWeight: '900',
    color: '#fdf2f4',
    textAlign: 'center',
    lineHeight: 46,
    letterSpacing: -1.4,
  },
  heroHeadlineAccent: {
    color: '#ff4d6d',
  },
  heroHeadlineWide: {
    fontSize: 68,
    lineHeight: 72,
  },
  heroActions: {
    alignItems: 'center',
    marginTop: 34,
    gap: 16,
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ff4d6d',
    borderRadius: 100,
    paddingHorizontal: 30,
    paddingVertical: 17,
    shadowColor: '#ff4d6d',
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  heroButtonText: {
    color: '#1c0a13',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  heroButtonArrow: {
    color: '#1c0a13',
    fontWeight: '800',
    fontSize: 16,
  },
  scrollCueWrap: {
    alignItems: 'center',
    marginTop: 44,
  },
  scrollCueChevron: {
    color: 'rgba(253,242,244,0.35)',
    fontSize: 26,
    lineHeight: 26,
  },

  /* MARQUEE */
  marqueeStrip: {
    backgroundColor: '#ff4d6d',
    paddingVertical: 12,
  },
  marqueeText: {
    color: '#1c0a13',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },

  /* SECTIONS */
  section: {
    paddingHorizontal: 24,
    paddingVertical: 56,
    backgroundColor: '#fff7ed',
  },
  storySection: {
    backgroundColor: '#fff',
  },
  sectionLabel: {
    color: '#be123c',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 27,
    fontWeight: '900',
    color: '#111827',
    textAlign: 'center',
    lineHeight: 35,
    marginBottom: 36,
    letterSpacing: -0.8,
  },
  sectionTitleWide: {
    fontSize: 36,
    lineHeight: 44,
  },
  sectionHint: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 13,
    marginTop: -20,
    marginBottom: 30,
  },

  /* FEATURES */
  featuresRow: {
    gap: 16,
  },
  featuresRowWide: {
    flexDirection: 'row',
  },
  featureCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#fce7e0',
    backgroundColor: '#fff',
    padding: 24,
    flex: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  featureCardWide: {
    flex: 1,
  },
  featureCardInner: {
    flex: 1,
  },
  featureIndex: {
    fontFamily: 'serif',
    fontSize: 15,
    fontWeight: '400',
    color: '#d1d5db',
    marginBottom: 8,
    letterSpacing: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginTop: 14,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  featureDesc: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 21,
  },
  featureHint: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '700',
    color: '#be123c',
    letterSpacing: 0.3,
  },

  /* PARTNERS */
  partnersSection: {
    backgroundColor: '#fff',
  },
  partnersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  partnerChip: {
    borderWidth: 1,
    borderColor: '#fce7e0',
    borderRadius: 100,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#fff7ed',
  },
  partnerChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9f1239',
    letterSpacing: 0.4,
  },

  /* STEPS */
  stepsContainer: {
    maxWidth: 560,
    alignSelf: 'center',
    width: '100%',
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  stepBigNum: {
    fontFamily: 'serif',
    fontSize: 40,
    fontWeight: '400',
    color: '#fecdd3',
    flexShrink: 0,
    width: 64,
  },
  stepBody: {
    flex: 1,
    paddingTop: 4,
  },
  stepTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  stepDesc: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 21,
  },
  stepConnector: {
    width: 2,
    height: 32,
    backgroundColor: '#fce7e0',
    marginLeft: 32,
    marginVertical: 6,
  },

  /* BOTTOM CTA */
  ctaSection: {
    backgroundColor: '#0b0508',
    paddingHorizontal: 24,
    paddingVertical: 68,
    alignItems: 'center',
    overflow: 'hidden',
  },
  ctaBlob: {
    position: 'absolute',
    top: -70,
    left: '50%',
    marginLeft: -140,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#ff4d6d',
    opacity: 0.12,
  },
  ctaHeadline: {
    fontSize: 34,
    fontWeight: '900',
    color: '#fdf2f4',
    textAlign: 'center',
    letterSpacing: -1,
  },
  ctaHeadlineWide: {
    fontSize: 48,
  },
  ctaButtonWrap: {
    marginTop: 36,
  },
  ctaButton: {
    backgroundColor: '#ff4d6d',
    borderRadius: 100,
    paddingHorizontal: 36,
    paddingVertical: 18,
    shadowColor: '#ff4d6d',
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  ctaButtonText: {
    color: '#1c0a13',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  ctaLoginWrap: {
    marginTop: 20,
    paddingVertical: 8,
  },
  ctaLoginLink: {
    color: 'rgba(253,242,244,0.55)',
    fontSize: 14,
    fontWeight: '600',
  },

  /* FOOTER */
  footer: {
    backgroundColor: '#080305',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 28,
  },
  footerTop: {
    alignItems: 'center',
    gap: 20,
  },
  footerTopWide: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerBrand: {
    gap: 6,
    alignItems: 'flex-start',
  },
  footerBrandCentered: {
    alignItems: 'center',
  },
  footerBrandText: {
    color: '#fdf2f4',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  footerTagline: {
    color: 'rgba(253,242,244,0.4)',
    fontSize: 13,
  },
  footerLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  footerLink: {
    color: 'rgba(253,242,244,0.55)',
    fontSize: 13,
    fontWeight: '600',
  },
  footerLinkDot: {
    color: 'rgba(253,242,244,0.25)',
    fontSize: 13,
  },
  footerDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 24,
  },
  footerCopyright: {
    color: 'rgba(253,242,244,0.3)',
    fontSize: 12,
    textAlign: 'center',
  },

  /* MISC */
  centerBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  loadingText: {
    color: '#6b7280',
    fontSize: 15,
  },
  serverDownTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  serverDownText: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 23,
    maxWidth: 340,
  },
  retryButton: {
    backgroundColor: '#be123c',
    borderRadius: 100,
    paddingHorizontal: 24,
    paddingVertical: 13,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
