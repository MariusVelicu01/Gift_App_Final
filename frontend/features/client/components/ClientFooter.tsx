import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import LegalDocumentModal from '../../../components/LegalDocumentModal';
import type { ClientTab } from '../screens/ClientDashboard';

type Props = {
  onNavigate?: (tab: ClientTab) => void;
};

type FooterLink = { label: string; tab: ClientTab };

const NAV_COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: 'Navigare',
    links: [
      { label: 'Acasă', tab: 'home' },
      { label: 'Persoane dragi', tab: 'lovedOnes' },
      { label: 'Calendar', tab: 'calendar' },
      { label: 'Magazine partenere', tab: 'partnerStores' },
    ],
  },
  {
    title: 'Cont',
    links: [
      { label: 'Notificări', tab: 'notifications' },
      { label: 'Setări', tab: 'settings' },
    ],
  },
];

// Sits at the end of each client screen's scrollable content — not pinned to the
// viewport — so it only shows once you actually scroll to the bottom of a page.
// Full-bleed (breaks out of the screen's own 16px padding) to span edge to edge.
export default function ClientFooter({ onNavigate }: Props) {
  const [legalDoc, setLegalDoc] = useState<'privacy' | 'terms' | 'affiliate' | null>(null);
  const { width } = useWindowDimensions();
  const isWide = width >= 700;

  return (
    <>
      <View style={[styles.footer, isWide && styles.footerWide]}>
        <View style={[styles.brandColumn, isWide && styles.column]}>
          <Text style={styles.footerBrand}>PresentPerfect</Text>
          <Text style={styles.footerTagline}>Cadoul potrivit, la timpul potrivit.</Text>
          <Text style={styles.footerCopyright}>© {new Date().getFullYear()} PresentPerfect</Text>
        </View>

        {NAV_COLUMNS.map((col) => (
          <View key={col.title} style={[styles.column, isWide && styles.columnWide]}>
            <Text style={styles.columnTitle}>{col.title}</Text>
            {col.links.map((link) => (
              <Pressable
                key={link.tab}
                onPress={() => onNavigate?.(link.tab)}
                style={({ hovered }) => hovered && styles.footerLinkHover}
              >
                <Text style={styles.footerLink}>{link.label}</Text>
              </Pressable>
            ))}
          </View>
        ))}

        <View style={[styles.column, isWide && styles.columnWide]}>
          <Text style={styles.columnTitle}>Legal</Text>
          <Pressable
            onPress={() => setLegalDoc('privacy')}
            style={({ hovered }) => hovered && styles.footerLinkHover}
          >
            <Text style={styles.footerLink}>Politica de confidențialitate</Text>
          </Pressable>
          <Pressable
            onPress={() => setLegalDoc('terms')}
            style={({ hovered }) => hovered && styles.footerLinkHover}
          >
            <Text style={styles.footerLink}>Termeni și condiții</Text>
          </Pressable>
          <Pressable
            onPress={() => setLegalDoc('affiliate')}
            style={({ hovered }) => hovered && styles.footerLinkHover}
          >
            <Text style={styles.footerLink}>Marketing afiliat</Text>
          </Pressable>
        </View>
      </View>

      <LegalDocumentModal type={legalDoc} onClose={() => setLegalDoc(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  footer: {
    marginHorizontal: -16,
    marginBottom: -32,
    backgroundColor: '#0b0508',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 22,
    gap: 24,
  },
  footerWide: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  column: {
    gap: 9,
  },
  columnWide: {
    flex: 1,
  },
  brandColumn: {
    gap: 6,
  },
  columnTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ff4d6d',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  footerBrand: {
    fontSize: 19,
    fontWeight: '800',
    color: '#fdf2f4',
    letterSpacing: -0.5,
  },
  footerTagline: {
    fontSize: 13,
    color: 'rgba(253,242,244,0.45)',
  },
  footerCopyright: {
    fontSize: 12,
    color: 'rgba(253,242,244,0.3)',
    marginTop: 6,
  },
  footerLink: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(253,242,244,0.65)',
    paddingVertical: 2,
  },
  footerLinkHover: {
    opacity: 0.75,
  },
});
