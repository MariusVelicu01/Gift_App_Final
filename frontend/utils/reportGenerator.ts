import * as XLSX from 'xlsx';
import { Platform } from 'react-native';

export type ReportStats = {
  totalGiftPlans: number;
  purchasedCount: number;
  averageBudget: number;
  maxBudget: number;
  minBudget: number;
  averageDaysToPurchase: number;
  averageDelayDays: number;
  onTimePercent: number;
  latePercent: number;
  onTimeCount: number;
  lateCount: number;
  selectedProductsCount: number;
  purchasedProductsCount: number;
  purchasedCheapestProductsCount: number;
  purchasedCheapestProductsPercent: number;
  manualSearchFallbackProductsCount: number;
  manualSearchFallbackProductsPercent: number;
};

export type ReportTopEntry = {
  label: string;
  count: number;
  hint?: string;
};

export type ReportStoreStats = {
  listedProductsCount: number;
  purchasedProductsCount: number;
  purchasedCategories: ReportTopEntry[];
  listedStores: ReportTopEntry[];
  purchasedStores: ReportTopEntry[];
  topPurchasedProducts: ReportTopEntry[];
  productDemandAdded: ReportTopEntry[];
  productDemandPurchased: ReportTopEntry[];
};

export type ReportFilters = {
  year: string;
  purpose: string;
  genders: string[];
};

function formattedDate() {
  const now = new Date();
  const d = now.getDate().toString().padStart(2, '0');
  const m = (now.getMonth() + 1).toString().padStart(2, '0');
  const y = now.getFullYear();
  return `${d}.${m}.${y}`;
}

function r1(n: number) {
  return Math.round(n * 10) / 10;
}

function genderLabel(genders: string[]) {
  if (genders.includes('male') && genders.includes('female')) return 'Ambele';
  if (genders.includes('male')) return 'Masculin';
  if (genders.includes('female')) return 'Feminin';
  return 'Niciunul';
}

function gdprHeader(title: string, filters: ReportFilters): any[][] {
  return [
    ['PresentPerfect – Raport Date Agregate pentru Magazin Partener'],
    [title],
    [`Data generării: ${formattedDate()}`],
    [
      `Filtre aplicate: An = ${filters.year === 'all' ? 'Toți anii' : filters.year}  |  Scop = ${filters.purpose === 'all' ? 'Toate scopurile' : filters.purpose}  |  Gen = ${genderLabel(filters.genders)}`,
    ],
    [''],
    [
      'NOTĂ GDPR: Raportul conține exclusiv date statistice agregate și anonimizate, fără identificatori personali.',
    ],
    [
      'Furnizat partenerului în baza Art. 6(1)(b) și Art. 89 GDPR – prelucrare în scop statistic, cu garanții de anonimizare.',
    ],
    [''],
  ];
}

function triggerDownload(wb: XLSX.WorkBook, filename: string) {
  if (Platform.OS !== 'web') {
    alert('Descărcarea rapoartelor Excel este disponibilă doar în browser (web).');
    return;
  }
  XLSX.writeFile(wb, filename);
}

function fileDate() {
  return formattedDate().replace(/\./g, '-');
}

export function generateUsersReport(stats: ReportStats, filters: ReportFilters) {
  const wb = XLSX.utils.book_new();

  const rows: any[][] = [
    ...gdprHeader('Statistici Comportament Utilizatori', filters),
    ['Indicator', 'Valoare', 'Detalii'],
    ['Total planuri cadou analizate', stats.totalGiftPlans, ''],
    ['Total cadouri marcate ca achiziționate', stats.purchasedCount, ''],
    ['Buget mediu per plan cadou (RON)', Math.round(stats.averageBudget), ''],
    ['Buget maxim înregistrat (RON)', Math.round(stats.maxBudget), ''],
    ['Buget minim înregistrat (RON)', Math.round(stats.minBudget), ''],
    [
      'Media zilelor de la creare până la achiziție',
      r1(stats.averageDaysToPurchase),
      'zile',
    ],
    [
      'Media zilelor de întârziere față de termen',
      r1(stats.averageDelayDays),
      'zile',
    ],
    [
      'Achiziții la timp (%)',
      r1(stats.onTimePercent),
      `${stats.onTimeCount} cadouri`,
    ],
    [
      'Achiziții cu întârziere (%)',
      r1(stats.latePercent),
      `${stats.lateCount} cadouri`,
    ],
    ['Total produse adăugate în liste', stats.selectedProductsCount, ''],
    ['Total produse achiziționate', stats.purchasedProductsCount, ''],
    [
      'Produse achiziționate la cea mai mică ofertă (%)',
      r1(stats.purchasedCheapestProductsPercent),
      `${stats.purchasedCheapestProductsCount} din ${stats.purchasedProductsCount}`,
    ],
    [
      'Produse negăsite în căutări – adăugate manual (%)',
      r1(stats.manualSearchFallbackProductsPercent),
      `${stats.manualSearchFallbackProductsCount} din ${stats.selectedProductsCount}`,
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 52 }, { wch: 18 }, { wch: 42 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Statistici_Useri');

  triggerDownload(wb, `PresentPerfect_Raport_Useri_${fileDate()}.xlsx`);
}

export function generateStoresReport(storeStats: ReportStoreStats, filters: ReportFilters) {
  const wb = XLSX.utils.book_new();
  const header = gdprHeader('Statistici Magazine Partenere', filters);

  const summaryRows: any[][] = [
    ...header,
    ['Indicator', 'Valoare'],
    ['Total produse adăugate de utilizatori în liste', storeStats.listedProductsCount],
    ['Total produse achiziționate', storeStats.purchasedProductsCount],
    ['Nr. categorii de produse achiziționate (distincte)', storeStats.purchasedCategories.length],
    ['Nr. magazine cu produse în listele utilizatorilor', storeStats.listedStores.length],
    ['Nr. magazine de la care s-a cumpărat efectiv', storeStats.purchasedStores.length],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 55 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Sumar');

  const catRows: any[][] = [
    ...header,
    ['Rang', 'Categorie', 'Nr. achiziții'],
    ...storeStats.purchasedCategories.map((e, i) => [i + 1, e.label, e.count]),
  ];
  const wsCat = XLSX.utils.aoa_to_sheet(catRows);
  wsCat['!cols'] = [{ wch: 8 }, { wch: 35 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsCat, 'Categorii_Cumparate');

  const listedStoreRows: any[][] = [
    ...header,
    ['Rang', 'Magazin', 'Nr. apariții în liste'],
    ...storeStats.listedStores.map((e, i) => [i + 1, e.label, e.count]),
  ];
  const wsListed = XLSX.utils.aoa_to_sheet(listedStoreRows);
  wsListed['!cols'] = [{ wch: 8 }, { wch: 35 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, wsListed, 'Magazine_In_Liste');

  const purchasedStoreRows: any[][] = [
    ...header,
    ['Rang', 'Magazin', 'Nr. achiziții'],
    ...storeStats.purchasedStores.map((e, i) => [i + 1, e.label, e.count]),
  ];
  const wsPurchased = XLSX.utils.aoa_to_sheet(purchasedStoreRows);
  wsPurchased['!cols'] = [{ wch: 8 }, { wch: 35 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsPurchased, 'Magazine_Cumparate');

  const topProductRows: any[][] = [
    ...header,
    ['Rang', 'Produs', 'Categorie', 'Nr. achiziții'],
    ...storeStats.topPurchasedProducts.map((e, i) => [
      i + 1,
      e.label,
      e.hint || '',
      e.count,
    ]),
  ];
  const wsTop = XLSX.utils.aoa_to_sheet(topProductRows);
  wsTop['!cols'] = [{ wch: 8 }, { wch: 40 }, { wch: 25 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsTop, 'Top_Produse');

  triggerDownload(wb, `PresentPerfect_Raport_Magazine_${fileDate()}.xlsx`);
}

export function generateProductDemandReport(
  storeStats: ReportStoreStats,
  filters: ReportFilters
) {
  const wb = XLSX.utils.book_new();
  const header = gdprHeader('Cerere de Produse – Date pentru Parteneri', filters);

  const addedRows: any[][] = [
    ...header,
    ['Rang', 'Produs căutat', 'Nr. cereri (adăugat manual)'],
    ...storeStats.productDemandAdded.map((e, i) => [i + 1, e.label, e.count]),
  ];
  const wsAdded = XLSX.utils.aoa_to_sheet(addedRows);
  wsAdded['!cols'] = [{ wch: 8 }, { wch: 45 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(wb, wsAdded, 'Cerere_Adaugate_Manual');

  const purchasedRows: any[][] = [
    ...header,
    ['Rang', 'Produs căutat', 'Nr. achiziții'],
    ...storeStats.productDemandPurchased.map((e, i) => [i + 1, e.label, e.count]),
  ];
  const wsPurchased = XLSX.utils.aoa_to_sheet(purchasedRows);
  wsPurchased['!cols'] = [{ wch: 8 }, { wch: 45 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsPurchased, 'Cerere_Cumparate');

  triggerDownload(
    wb,
    `PresentPerfect_Raport_CerereProduse_${fileDate()}.xlsx`
  );
}
