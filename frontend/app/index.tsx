import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import AuthModal from '../components/AuthModal';
import { AuthProvider, useAuth } from '../context/AuthContext';
import ClientDashboard from '../features/client/screens/ClientDashboard';
import AdminDashboard from '../features/admin/screens/AdminDashboard';
import { checkServerHealth } from '../services/authApi';

const FEATURES = [
  {
    icon: '🔔',
    title: 'Alerte de preț',
    desc: 'Urmărești un produs? Te anunțăm instant când prețul scade — prinde mereu cea mai bună ofertă pentru cadoul perfect.',
    accent: '#be123c',
    bg: '#fff1f2',
    border: '#fecdd3',
  },
  {
    icon: '🎁',
    title: 'Persoane dragi',
    desc: 'Preferințe, zile de naștere, cadouri istorice — totul organizat elegant pentru fiecare persoană din viața ta.',
    accent: '#0d9488',
    bg: '#f0fdfa',
    border: '#99f6e4',
  },
  {
    icon: '🤖',
    title: 'GiftBot AI',
    desc: 'Fără inspirație? Descrie persoana și bugetul — GiftBot-ul îți sugerează cadoul perfect în câteva secunde.',
    accent: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd6fe',
  },
];

const STEPS = [
  {
    num: '1',
    title: 'Adaugi persoanele dragi',
    desc: 'Nume, zi de naștere, preferințe. Gata — nu mai uiți niciodată.',
  },
  {
    num: '2',
    title: 'Găsești produsele dorite',
    desc: 'Navighezi prin magazinele partenere și adaugi produse în lista de cadouri.',
  },
  {
    num: '3',
    title: 'Primești alerta la prețul optim',
    desc: 'Ne ocupăm noi de monitorizare. Tu cumperi exact când prețul e cel mai bun.',
  },
];

function GuestHome({ onOpenAuth }: { onOpenAuth: () => void }) {
  const { width } = useWindowDimensions();
  const isWide = width >= 760;

  return (
    <ScrollView
      contentContainerStyle={styles.landingContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* ── HERO ── */}
      <View style={styles.hero}>
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>🎀 Planificatorul tău de cadouri</Text>
        </View>

        <Text style={[styles.heroHeadline, isWide && styles.heroHeadlineWide]}>
          Cadoul perfect,{'\n'}la momentul potrivit.
        </Text>

        <Text style={[styles.heroTagline, isWide && styles.heroTaglineWide]}>
          Planifică, urmărește prețuri și oferă cadouri memorabile —
          toate într-o singură aplicație inteligentă.
        </Text>

        <Pressable
          style={({ hovered, pressed }) => [
            styles.heroButton,
            hovered && styles.heroButtonHover,
            pressed && styles.heroButtonPressed,
          ]}
          onPress={onOpenAuth}
        >
          <Text style={styles.heroButtonText}>Începe gratuit  →</Text>
        </Pressable>

        <Text style={styles.heroNote}>Fără card. Fără abonament.</Text>

        {/* Decorative blobs */}
        <View style={styles.blobTopRight} />
        <View style={styles.blobBottomLeft} />
      </View>

      {/* ── FEATURES ── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Ce poți face</Text>
        <Text style={[styles.sectionTitle, isWide && styles.sectionTitleWide]}>
          Tot ce ai nevoie pentru cadouri memorabile
        </Text>

        <View style={[styles.featuresRow, isWide && styles.featuresRowWide]}>
          {FEATURES.map((f) => (
            <View
              key={f.title}
              style={[
                styles.featureCard,
                isWide && styles.featureCardWide,
                { backgroundColor: f.bg, borderColor: f.border },
              ]}
            >
              <View style={[styles.featureIconWrap, { backgroundColor: f.accent }]}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
              </View>
              <Text style={[styles.featureTitle, { color: f.accent }]}>{f.title}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── HOW IT WORKS ── */}
      <View style={[styles.section, styles.storySection]}>
        <Text style={styles.sectionLabel}>Cum funcționează</Text>
        <Text style={[styles.sectionTitle, isWide && styles.sectionTitleWide]}>
          Trei pași simpli spre cadoul ideal
        </Text>

        <View style={styles.stepsContainer}>
          {STEPS.map((step, i) => (
            <View key={step.num}>
              <View style={styles.step}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{step.num}</Text>
                </View>
                <View style={styles.stepBody}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDesc}>{step.desc}</Text>
                </View>
              </View>
              {i < STEPS.length - 1 && <View style={styles.stepConnector} />}
            </View>
          ))}
        </View>
      </View>

      {/* ── QUOTE ── */}
      <View style={styles.quoteSection}>
        <Text style={styles.quoteText}>
          "Nu mai uita niciodată o zi de naștere.{'\n'}
          Nu mai plăti niciodată prea mult pentru un cadou."
        </Text>
        <Text style={styles.quoteAuthor}>— Gift Affiliate App</Text>
      </View>

      {/* ── BOTTOM CTA ── */}
      <View style={styles.ctaSection}>
        <Text style={[styles.ctaHeadline, isWide && styles.ctaHeadlineWide]}>
          Gata să oferi cadouri{'\n'}cu adevărat speciale?
        </Text>
        <Text style={styles.ctaSubtext}>
          Alătură-te și începe să planifici cadouri inteligent — gratuit.
        </Text>

        <Pressable
          style={({ hovered, pressed }) => [
            styles.ctaButton,
            hovered && styles.ctaButtonHover,
            pressed && styles.heroButtonPressed,
          ]}
          onPress={onOpenAuth}
        >
          <Text style={styles.ctaButtonText}>Creează cont gratuit</Text>
        </Pressable>

        <Pressable onPress={onOpenAuth} style={styles.ctaLoginWrap}>
          <Text style={styles.ctaLoginLink}>Ai deja cont? Autentifică-te →</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Gift Affiliate App · Cadouri inteligente</Text>
      </View>
    </ScrollView>
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
  }, []);

  const headerButtonLabel = useMemo(() => {
    if (!profile) return 'Autentificare';
    return `${profile.firstName} (${profile.role})`;
  }, [profile]);

  return (
    <SafeAreaView style={styles.container}>
      {(!profile || serverChecking || !serverUp || loading) && (
        <View style={styles.topBar}>
          <Text style={styles.appName}>🎀 GiftApp</Text>
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
          <GuestHome onOpenAuth={() => setAuthModalVisible(true)} />
        ) : profile.role === 'client' ? (
          <ClientDashboard firstName={profile.firstName} onLogout={logout} />
        ) : (
          <AdminDashboard firstName={profile.firstName} onLogout={logout} />
        )}
      </View>

      <AuthModal
        visible={authModalVisible}
        onClose={() => setAuthModalVisible(false)}
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
    borderBottomColor: '#fce7e0',
    backgroundColor: '#fff7ed',
  },
  appName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#be123c',
    letterSpacing: -0.5,
  },
  topBarButton: {
    backgroundColor: '#be123c',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
  },
  topBarButtonDisabled: {
    opacity: 0.4,
  },
  topBarButtonText: {
    color: '#fff',
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
    backgroundColor: '#1c0a13',
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 72,
    alignItems: 'center',
    overflow: 'hidden',
  },
  blobTopRight: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#be123c',
    opacity: 0.18,
  },
  blobBottomLeft: {
    position: 'absolute',
    bottom: -80,
    left: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#9f1239',
    opacity: 0.12,
  },
  heroBadge: {
    backgroundColor: '#be123c22',
    borderWidth: 1,
    borderColor: '#be123c55',
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 24,
  },
  heroBadgeText: {
    color: '#fda4af',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  heroHeadline: {
    fontSize: 38,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 46,
    letterSpacing: -1,
  },
  heroHeadlineWide: {
    fontSize: 52,
    lineHeight: 62,
  },
  heroTagline: {
    marginTop: 16,
    fontSize: 16,
    color: '#fca5a5',
    textAlign: 'center',
    lineHeight: 25,
    maxWidth: 420,
  },
  heroTaglineWide: {
    fontSize: 18,
    maxWidth: 540,
  },
  heroButton: {
    marginTop: 32,
    backgroundColor: '#be123c',
    borderRadius: 100,
    paddingHorizontal: 32,
    paddingVertical: 16,
    shadowColor: '#be123c',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  heroButtonHover: {
    backgroundColor: '#9f1239',
    transform: [{ translateY: -2 }],
  },
  heroButtonPressed: {
    transform: [{ scale: 0.97 }],
  },
  heroButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  heroNote: {
    marginTop: 14,
    color: '#9ca3af',
    fontSize: 13,
  },

  /* SECTIONS */
  section: {
    paddingHorizontal: 24,
    paddingVertical: 52,
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
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 32,
    letterSpacing: -0.5,
  },
  sectionTitleWide: {
    fontSize: 34,
    lineHeight: 42,
  },

  /* FEATURES */
  featuresRow: {
    gap: 16,
  },
  featuresRowWide: {
    flexDirection: 'row',
  },
  featureCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
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
  featureIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  featureIcon: {
    fontSize: 24,
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  featureDesc: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 21,
  },

  /* STEPS */
  stepsContainer: {
    maxWidth: 560,
    alignSelf: 'center',
    width: '100%',
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  stepNum: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#be123c',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNumText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 18,
  },
  stepBody: {
    flex: 1,
    paddingTop: 4,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 21,
  },
  stepConnector: {
    width: 2,
    height: 28,
    backgroundColor: '#fce7e0',
    marginLeft: 21,
    marginVertical: 4,
  },

  /* QUOTE */
  quoteSection: {
    backgroundColor: '#be123c',
    paddingHorizontal: 32,
    paddingVertical: 52,
    alignItems: 'center',
  },
  quoteText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 34,
    fontStyle: 'italic',
    letterSpacing: -0.3,
  },
  quoteAuthor: {
    marginTop: 18,
    color: '#fecdd3',
    fontSize: 14,
    fontWeight: '600',
  },

  /* BOTTOM CTA */
  ctaSection: {
    backgroundColor: '#1c0a13',
    paddingHorizontal: 24,
    paddingVertical: 64,
    alignItems: 'center',
  },
  ctaHeadline: {
    fontSize: 30,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 40,
    letterSpacing: -0.8,
  },
  ctaHeadlineWide: {
    fontSize: 40,
    lineHeight: 50,
  },
  ctaSubtext: {
    marginTop: 12,
    color: '#9ca3af',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 23,
    maxWidth: 420,
  },
  ctaButton: {
    marginTop: 28,
    backgroundColor: '#be123c',
    borderRadius: 100,
    paddingHorizontal: 36,
    paddingVertical: 18,
    shadowColor: '#be123c',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  ctaButtonHover: {
    backgroundColor: '#9f1239',
    transform: [{ translateY: -2 }],
  },
  ctaButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  ctaLoginWrap: {
    marginTop: 18,
    paddingVertical: 8,
  },
  ctaLoginLink: {
    color: '#fca5a5',
    fontSize: 14,
    fontWeight: '600',
  },

  /* FOOTER */
  footer: {
    backgroundColor: '#120608',
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    color: '#4b5563',
    fontSize: 13,
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
