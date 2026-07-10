import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { track, Events } from '../services/analytics';

const SLIDES = [
  {
    emoji: '🎁',
    title: 'Bun venit în PresentPerfect!',
    body: 'Aplicația care te ajută să oferi cadouri memorabile, mereu la momentul potrivit și la cel mai bun preț.',
    accent: '#be123c',
    bg: '#fff1f2',
  },
  {
    emoji: '👤',
    title: 'Adaugă persoanele dragi',
    body: 'Salvează ziua de naștere, preferințele și bugetul pentru fiecare persoană importantă din viața ta. Nu mai uiți niciodată o zi specială.',
    accent: '#0d9488',
    bg: '#f0fdfa',
  },
  {
    emoji: '🔔',
    title: 'Prețuri monitorizate automat',
    body: 'Adaugă produse din magazinele partenere la planul de cadou și primești alertă instant când prețul scade. Cumperi exact la momentul optim.',
    accent: '#7c3aed',
    bg: '#f5f3ff',
  },
  {
    emoji: '🤖',
    title: 'GiftBot îți sugerează idei',
    body: 'Fără inspirație? Descrie persoana și bugetul, iar GiftBot îți sugerează produse din catalogul nostru — cu link direct de cumpărare.',
    accent: '#d97706',
    bg: '#fffbeb',
  },
];

type Props = {
  visible: boolean;
  onDone: () => void;
  onSkip: () => void;
};

export default function OnboardingModal({ visible, onDone, onSkip }: Props) {
  const [slide, setSlide] = useState(0);
  const { width } = useWindowDimensions();
  const isLast = slide === SLIDES.length - 1;
  const current = SLIDES[slide];

  const handleNext = () => {
    if (isLast) {
      track(Events.ONBOARDING_COMPLETED);
      onDone();
    } else {
      setSlide((s) => s + 1);
    }
  };

  const handleSkip = () => {
    track(Events.ONBOARDING_SKIPPED, { at_slide: slide });
    onSkip();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.card, { maxWidth: Math.min(width - 32, 480) }]}>

          {/* Skip */}
          {!isLast && (
            <Pressable onPress={handleSkip} style={styles.skipBtn}>
              <Text style={styles.skipText}>Sari peste</Text>
            </Pressable>
          )}

          {/* Emoji */}
          <View style={[styles.emojiWrap, { backgroundColor: current.bg }]}>
            <Text style={styles.emoji}>{current.emoji}</Text>
          </View>

          {/* Content */}
          <Text style={[styles.title, { color: current.accent }]}>{current.title}</Text>
          <Text style={styles.body}>{current.body}</Text>

          {/* Dots */}
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === slide && { backgroundColor: current.accent, width: 20 },
                ]}
              />
            ))}
          </View>

          {/* CTA */}
          <Pressable
            style={({ pressed }) => [
              styles.nextBtn,
              { backgroundColor: current.accent },
              pressed && styles.pressed,
            ]}
            onPress={handleNext}
          >
            <Text style={styles.nextBtnText}>
              {isLast ? 'Să începem!' : 'Continuă →'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 16,
  },
  skipBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  skipText: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '500',
  },
  emojiWrap: {
    width: 96,
    height: 96,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  emoji: {
    fontSize: 44,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.4,
    marginTop: 4,
  },
  body: {
    fontSize: 15,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 23,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    marginTop: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e5e7eb',
  },
  nextBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 100,
    alignItems: 'center',
    marginTop: 4,
  },
  nextBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
});
