import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
  Linking,
} from 'react-native';
import type { GestureResponderEvent } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Dropdown } from 'react-native-element-dropdown';
import { useAuth } from '../../../context/AuthContext';
import { deleteLovedOne, getLovedOneById } from '../../../services/lovedOnesApi';
import { invalidateCalendarCache } from '../../../services/calendarCache';
import { pushAppBackEntry } from '../../../services/navigationHistory';
import { getModalBackdropResponder } from '../../../utils/modalBackdrop';
import { C, R } from '../../../constants/theme';
import {
  completeGiftPlan,
  createGiftPlan,
  deleteGiftPlan,
  getGiftPlans,
  offerGiftPlan,
  updateGiftPlanProducts,
  updateGiftPlan,
} from '../../../services/giftPlansApi';
import { getPartnerStores } from '../../../services/partnerStoresApi';
import { markPriceAlertHighlightSeen } from '../../../services/priceAlertsApi';
import { uploadImageApi } from '../../../services/uploadApi';
import AddLovedOneModal from '../../../components/AddLovedOneModal';
import { LovedOne } from '../../../types/lovedOnes';
import {
  GiftPlan,
  GiftPlanProduct,
  GiftPurpose,
  ProductReaction,
} from '../../../types/giftPlans';
import { PartnerStore, ProductImportItem } from '../../../types/partnerStores';
import { PriceAlert } from '../../../types/priceAlerts';

const GIFT_PURPOSE_OPTIONS = [
  { label: 'Zi de nastere', value: 'Zi de nastere' },
  { label: 'Craciun', value: 'Craciun' },
  { label: 'Paste', value: 'Paste' },
  { label: 'Zi de nume', value: 'Zi de nume' },
  { label: 'Aniversare', value: 'Aniversare' },
  { label: 'Multumire', value: 'Multumire' },
  { label: 'Alta ocazie', value: 'Alta ocazie' },
];

const BUDGET_OPTIONS = [50, 100, 200, 300, 500, 750, 1000];

const HISTORY_FILTER_OPTIONS = [
  { label: 'Toate', value: 'all' },
  ...GIFT_PURPOSE_OPTIONS,
];

const REACTION_OPTIONS = [
  { value: 1, label: ':(' },
  { value: 2, label: ':/' },
  { value: 3, label: ':|' },
  { value: 4, label: ':)' },
  { value: 5, label: ':D' },
];

const ADDED_PRODUCT_TOAST_DURATION = 5000;
const BUDGET_CHART_WIDTH = 920;
const BUDGET_CHART_HEIGHT = 380;
const BUDGET_CHART_PLOT_WIDTH = 760;
const BUDGET_CHART_PLOT_HEIGHT = 230;
const BUDGET_CHART_PLOT_PADDING = 30;

type ProductSuggestion = GiftPlanProduct & {
  availabilityStatus?: string;
  inStock?: boolean;
  searchText: string;
  offerCount?: number;
};

type ProductReactionDraft = {
  reactionRating: number | null;
  details: string;
};

type ActionDateMode = 'today' | 'custom';

const DAYS = Array.from({ length: 31 }, (_, i) => ({
  label: String(i + 1).padStart(2, '0'),
  value: i + 1,
}));

const MONTHS = [
  { label: 'Ianuarie', value: 1 },
  { label: 'Februarie', value: 2 },
  { label: 'Martie', value: 3 },
  { label: 'Aprilie', value: 4 },
  { label: 'Mai', value: 5 },
  { label: 'Iunie', value: 6 },
  { label: 'Iulie', value: 7 },
  { label: 'August', value: 8 },
  { label: 'Septembrie', value: 9 },
  { label: 'Octombrie', value: 10 },
  { label: 'Noiembrie', value: 11 },
  { label: 'Decembrie', value: 12 },
];

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function getTodayParts() {
  const today = new Date();
  return {
    day: today.getDate(),
    month: today.getMonth() + 1,
    year: today.getFullYear(),
  };
}

function getTodayKey() {
  const today = getTodayParts();
  return `${today.year}-${pad(today.month)}-${pad(today.day)}`;
}

function getYearOptions() {
  const currentYear = new Date().getFullYear();

  return Array.from({ length: 31 }, (_, i) => {
    const year = currentYear + i;
    return { label: String(year), value: year };
  });
}

function getActionYearOptions() {
  const currentYear = new Date().getFullYear();

  return Array.from({ length: 11 }, (_, i) => {
    const year = currentYear - i;
    return { label: String(year), value: year };
  });
}

function buildDateKey(day: number, month: number, year: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function isDateBeforeToday(day: number, month: number, year: number) {
  const selected = buildDateKey(day, month, year);
  const todayKey = getTodayKey();

  return selected < todayKey;
}

function isDateAfterToday(day: number, month: number, year: number) {
  return buildDateKey(day, month, year) > getTodayKey();
}

function parseDateParts(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return { day, month, year };
}

function formatDate(dateKey: string) {
  const { day, month, year } = parseDateParts(dateKey);
  return `${pad(day)}.${pad(month)}.${year}`;
}

function formatIsoDate(dateValue?: string) {
  if (!dateValue) return '-';

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
}

function formatShortDateTime(dateValue: string) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function formatChartMonth(dateValue: string) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return { month: '-', year: '' };
  }

  const month = date
    .toLocaleString('ro-RO', { month: 'short' })
    .replace('.', '')
    .toUpperCase();

  return {
    month,
    year: String(date.getFullYear()),
  };
}

function startOfDayTimestamp(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function dateKeyToDate(dateKey?: string) {
  if (!dateKey) return null;

  const { day, month, year } = parseDateParts(dateKey);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function getDeadlineTimingLabel(
  deadlineDateKey: string | undefined,
  actionDateValue: string | undefined,
  earlyLabel: string,
  lateLabel: string
) {
  const deadline = dateKeyToDate(deadlineDateKey);
  const actionDate = actionDateValue ? new Date(actionDateValue) : null;

  if (!deadline || !actionDate || Number.isNaN(actionDate.getTime())) {
    return '-';
  }

  const diffDays = Math.floor(
    (startOfDayTimestamp(actionDate) - startOfDayTimestamp(deadline)) /
      (24 * 60 * 60 * 1000)
  );

  if (diffDays <= 0) {
    const remainingDays = Math.abs(diffDays);
    return remainingDays === 0
      ? `${earlyLabel} exact in ziua deadline-ului`
      : `${earlyLabel} cu ${remainingDays} zile inainte de deadline`;
  }

  return `${lateLabel} cu ${diffDays} zile dupa deadline`;
}

function getPurchaseTimingLabel(giftPlan: GiftPlan) {
  return getDeadlineTimingLabel(
    giftPlan.purchaseDeadlineDate || giftPlan.deadlineDate,
    giftPlan.completedAt,
    'Cumparat la timp',
    'Cumparat mai tarziu'
  );
}

function getOfferTimingLabel(giftPlan: GiftPlan) {
  return getDeadlineTimingLabel(
    giftPlan.deadlineDate,
    giftPlan.offeredAt,
    'Oferit la timp',
    'Oferit mai tarziu'
  );
}

function getCompletionDays(giftPlan: GiftPlan) {
  if (typeof giftPlan.daysUntilCompleted === 'number') {
    return Math.max(1, giftPlan.daysUntilCompleted);
  }

  if (!giftPlan.completedAt) {
    return 0;
  }

  const createdDate = new Date(giftPlan.createdAt);
  const completedDate = new Date(giftPlan.completedAt);

  if (
    Number.isNaN(createdDate.getTime()) ||
    Number.isNaN(completedDate.getTime())
  ) {
    return 1;
  }

  const diff =
    startOfDayTimestamp(completedDate) - startOfDayTimestamp(createdDate);

  return Math.max(1, Math.floor(diff / (24 * 60 * 60 * 1000)));
}

function getRemainingDaysUntilGift(giftPlan: GiftPlan) {
  if (typeof giftPlan.daysRemainingUntilGift === 'number') {
    return Math.max(0, giftPlan.daysRemainingUntilGift);
  }

  if (!giftPlan.completedAt) {
    return 0;
  }

  const { day, month, year } = parseDateParts(giftPlan.deadlineDate);
  const deadlineDate = new Date(year, month - 1, day);
  const completedDate = new Date(giftPlan.completedAt);

  if (
    Number.isNaN(deadlineDate.getTime()) ||
    Number.isNaN(completedDate.getTime())
  ) {
    return 0;
  }

  const diff =
    startOfDayTimestamp(deadlineDate) - startOfDayTimestamp(completedDate);

  return Math.max(0, Math.floor(diff / (24 * 60 * 60 * 1000)));
}

function getYearFromDateKey(dateKey: string) {
  return parseDateParts(dateKey).year;
}

function getYearFromIsoDate(dateValue?: string) {
  if (!dateValue) return new Date().getFullYear();

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return new Date().getFullYear();
  }

  return date.getFullYear();
}

function getHistoryYear(giftPlan: GiftPlan) {
  return getYearFromIsoDate(giftPlan.offeredAt || giftPlan.completedAt);
}

function canModifyGiftPlan(giftPlan: GiftPlan) {
  return giftPlan.status === 'planned';
}

function isFixedGiftPurpose(purpose: GiftPurpose | null) {
  return purpose === 'Zi de nastere' || purpose === 'Craciun' || purpose === 'Paste';
}

function getGiftStatusLabel(status: GiftPlan['status']) {
  if (status === 'completed') return 'Oferit';
  if (status === 'purchased') return 'Cumparat';
  return 'Planificat';
}

function getGiftTimingNotes(giftPlan: GiftPlan) {
  const todayKey = getTodayKey();
  const purchaseDeadlineDate =
    giftPlan.purchaseDeadlineDate || giftPlan.deadlineDate;
  const notes: string[] = [];

  if (giftPlan.status === 'planned' && purchaseDeadlineDate < todayKey) {
    notes.push('Deadline depasit pentru data de cumparare.');
  }

  if (giftPlan.status === 'purchased') {
    if (giftPlan.completedAt) {
      const completedDate = new Date(giftPlan.completedAt);
      const completedKey = Number.isNaN(completedDate.getTime())
        ? ''
        : `${completedDate.getFullYear()}-${pad(completedDate.getMonth() + 1)}-${pad(
            completedDate.getDate()
          )}`;

      if (completedKey && completedKey > purchaseDeadlineDate) {
        notes.push('Deadline depasit pentru data de cumparare.');
      }
    }

    if (giftPlan.deadlineDate < todayKey) {
      notes.push('Deadline depasit pentru data de oferire.');
    }
  }

  if (giftPlan.status === 'completed' && giftPlan.offeredAt) {
    const offeredDate = new Date(giftPlan.offeredAt);
    const offeredKey = Number.isNaN(offeredDate.getTime())
      ? ''
      : `${offeredDate.getFullYear()}-${pad(offeredDate.getMonth() + 1)}-${pad(
          offeredDate.getDate()
        )}`;

    if (offeredKey && offeredKey > giftPlan.deadlineDate) {
      notes.push('Deadline depasit pentru data de oferire.');
    }
  }

  return Array.from(new Set(notes));
}

function getGiftTimingNote(giftPlan: GiftPlan) {
  return getGiftTimingNotes(giftPlan).join(' ');
}

function formatMoney(value: number, currency = 'RON') {
  return `${value} ${currency}`;
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function getProductPriceDetails(product: ProductImportItem) {
  const currentPrice = Number(product.price?.current);

  if (!Number.isFinite(currentPrice)) {
    return null;
  }

  const promo = product.promo;
  const hasPromoCode = Boolean(promo?.hasPromoCode || promo?.code);
  const promoDiscountPercent = Number(promo?.discountPercent);
  const promoDiscountAmount = Number(promo?.discountAmount ?? promo?.discount);
  let promoDiscount = 0;

  if (hasPromoCode) {
    if (Number.isFinite(promoDiscountPercent) && promoDiscountPercent > 0) {
      promoDiscount = (currentPrice * promoDiscountPercent) / 100;
    } else if (Number.isFinite(promoDiscountAmount) && promoDiscountAmount > 0) {
      promoDiscount = promoDiscountAmount;
    }
  }

  promoDiscount = Math.min(currentPrice, Math.max(0, roundMoney(promoDiscount)));
  const effectivePrice = roundMoney(currentPrice - promoDiscount);

  return {
    currentPrice: roundMoney(currentPrice),
    effectivePrice,
    hasPromoCode,
    promoCode: promo?.code ? String(promo.code) : '',
    promoDiscount,
    promoDiscountPercent:
      Number.isFinite(promoDiscountPercent) && promoDiscountPercent > 0
        ? promoDiscountPercent
        : 0,
    promoNote: promo?.note ? String(promo.note) : '',
  };
}

function getProductPrice(product: ProductImportItem) {
  return getProductPriceDetails(product)?.effectivePrice ?? null;
}

function normalizeProductText(value?: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function getProductIdentityKey(product: {
  name?: string;
  brand?: string;
  category?: string;
  subcategory?: string;
  productKey?: string;
}) {
  if (product.productKey) {
    return product.productKey;
  }

  const name = normalizeProductText(product.name);
  const brand = normalizeProductText(product.brand);
  const category = normalizeProductText(product.category);
  const subcategory = normalizeProductText(product.subcategory);
  const descriptor = brand || [category, subcategory].filter(Boolean).join(' ');

  return [name, descriptor].filter(Boolean).join('|');
}

function getProductSuggestionId(store: PartnerStore, product: ProductImportItem, index: number) {
  return `${store.id}-${product.id || product.externalId || product.sku || index}`;
}

function getNextDateParts(day: number, month: number) {
  const today = getTodayParts();
  let year = today.year;

  if (`${year}-${pad(month)}-${pad(day)}` < `${today.year}-${pad(today.month)}-${pad(today.day)}`) {
    year += 1;
  }

  return { day, month, year };
}

function toProductSuggestion(
  store: PartnerStore,
  product: ProductImportItem,
  index: number
): ProductSuggestion | null {
  const priceDetails = getProductPriceDetails(product);
  const price = priceDetails?.effectivePrice ?? null;

  if (price === null) {
    return null;
  }

  const baseDiscount = Number(product.price?.discount);
  const baseDiscountPercent = Number(product.price?.discountPercent);
  const hasPromoDiscount = Boolean(priceDetails && priceDetails.promoDiscount > 0);
  const suggestion: ProductSuggestion = {
    id: getProductSuggestionId(store, product, index),
    productKey: getProductIdentityKey(product),
    productId: product.id || product.sku || '',
    externalId: product.externalId || '',
    storeId: store.id,
    storeName: store.displayName,
    name: product.name,
    brand: product.brand,
    category: product.category,
    subcategory: product.subcategory,
    productUrl: product.productUrl,
    affiliateUrl: product.affiliateUrl,
    imageUrl: product.imageUrl,
    price,
    priceBeforePromo: hasPromoDiscount ? priceDetails?.currentPrice : undefined,
    originalPrice: Number.isFinite(Number(product.price?.original))
      ? Number(product.price?.original)
      : priceDetails?.currentPrice ?? price,
    discount: Number.isFinite(baseDiscount) ? baseDiscount : 0,
    discountPercent: Number.isFinite(baseDiscountPercent) ? baseDiscountPercent : 0,
    hasDiscount: Boolean(product.price?.hasDiscount || hasPromoDiscount),
    hasPromoCode: priceDetails?.hasPromoCode,
    promoCode: priceDetails?.promoCode,
    promoDiscount: priceDetails?.promoDiscount,
    promoDiscountPercent: priceDetails?.promoDiscountPercent,
    promoNote: priceDetails?.promoNote,
    currency: store.currency || 'RON',
    addedAt: new Date().toISOString(),
    availabilityStatus: product.availability?.stockStatus,
    inStock: product.availability?.inStock,
    searchText: [
      product.name,
      product.brand,
      product.category,
      product.subcategory,
      store.displayName,
      store.merchant?.name,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase(),
  };

  return suggestion;
}

function toGiftPlanProduct(product: ProductSuggestion): GiftPlanProduct {
  return {
    id: product.id,
    productKey: getProductIdentityKey(product),
    productId: product.productId,
    externalId: product.externalId,
    storeId: product.storeId,
    storeName: product.storeName,
    name: product.name,
    brand: product.brand,
    category: product.category,
    subcategory: product.subcategory,
    productUrl: product.productUrl,
    affiliateUrl: product.affiliateUrl,
    imageUrl: product.imageUrl,
    price: product.price,
    priceBeforePromo: product.priceBeforePromo,
    originalPrice: product.originalPrice,
    discount: product.discount,
    discountPercent: product.discountPercent,
    hasDiscount: product.hasDiscount,
    hasPromoCode: product.hasPromoCode,
    promoCode: product.promoCode,
    promoDiscount: product.promoDiscount,
    promoDiscountPercent: product.promoDiscountPercent,
    promoNote: product.promoNote,
    currency: product.currency,
    addedAt: new Date().toISOString(),
    isPurchased: false,
    purchasedAt: '',
    purchasedStoreName: '',
    purchasePrice: undefined,
    purchasedFromImportedStore: false,
    selectedAsCheapestOffer: true,
    manualSearchFallback: false,
  };
}

function openProductLink(affiliateUrl?: string, productUrl?: string) {
  const targetUrl = affiliateUrl || productUrl;

  if (!targetUrl) return;

  Linking.openURL(targetUrl).catch((error) => {
    console.error('OPEN PRODUCT LINK ERROR:', error);
  });
}

function getZodiac(day: number, month: number) {
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Berbec';
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Taur';
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'Gemeni';
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'Rac';
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Leu';
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Fecioară';
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'Balanță';
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'Scorpion';
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'Săgetător';
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'Capricorn';
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'Vărsător';
  return 'Pești';
}

function calculateAge(day: number, month: number, year: number) {
  const today = new Date();
  let age = today.getFullYear() - year;
  if (
    today.getMonth() + 1 < month ||
    (today.getMonth() + 1 === month && today.getDate() < day)
  ) {
    age -= 1;
  }
  return age;
}

type Props = {
  lovedOneId: string;
  onBack: () => void;
  initialGiftPlanId?: string | null;
  initialProductId?: string | null;
  priceAlert?: PriceAlert | null;
  onPriceAlertConsumed?: () => void;
  onGiftPlanTargetConsumed?: () => void;
  backLabel?: string;
};

export default function LovedOneDetailsScreen({
  lovedOneId,
  onBack,
  initialGiftPlanId,
  initialProductId,
  priceAlert,
  onPriceAlertConsumed,
  onGiftPlanTargetConsumed,
  backLabel = 'Inapoi la persoana',
}: Props) {
  const { token } = useAuth();
  const [data, setData] = useState<LovedOne | null>(null);
  const [loading, setLoading] = useState(true);
  const [editVisible, setEditVisible] = useState(false);
  const [deleteLovedOneVisible, setDeleteLovedOneVisible] = useState(false);
  const [deletingLovedOne, setDeletingLovedOne] = useState(false);
  const [deleteLovedOneError, setDeleteLovedOneError] = useState('');
  const [giftModalVisible, setGiftModalVisible] = useState(false);
  const [giftPurpose, setGiftPurpose] = useState<GiftPurpose | null>(null);
  const [giftBudget, setGiftBudget] = useState(200);
  const [customBudget, setCustomBudget] = useState('');
  const [isCustomBudget, setIsCustomBudget] = useState(false);
  const [deadlineDay, setDeadlineDay] = useState<number | null>(null);
  const [deadlineMonth, setDeadlineMonth] = useState<number | null>(null);
  const [deadlineYear, setDeadlineYear] = useState<number | null>(null);
  const [canEditFixedGiftDate, setCanEditFixedGiftDate] = useState(false);
  const [purchaseDeadlineDay, setPurchaseDeadlineDay] = useState<number | null>(
    null
  );
  const [purchaseDeadlineMonth, setPurchaseDeadlineMonth] = useState<
    number | null
  >(null);
  const [purchaseDeadlineYear, setPurchaseDeadlineYear] = useState<number | null>(
    null
  );
  const [giftError, setGiftError] = useState('');
  const [giftPlans, setGiftPlans] = useState<GiftPlan[]>([]);
  const [partnerStores, setPartnerStores] = useState<PartnerStore[]>([]);
  const [giftPlansLoading, setGiftPlansLoading] = useState(false);
  const [editingGiftPlan, setEditingGiftPlan] = useState<GiftPlan | null>(null);
  const [selectedGiftPlan, setSelectedGiftPlan] = useState<GiftPlan | null>(null);
  const selectedGiftPlanBackRef = useRef<ReturnType<typeof pushAppBackEntry> | null>(
    null
  );
  const [savingGift, setSavingGift] = useState(false);
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [emptyGiftGuideVisible, setEmptyGiftGuideVisible] = useState(false);
  const [experienceDetails, setExperienceDetails] = useState('');
  const [reactionRating, setReactionRating] = useState<number | null>(null);
  const [productReactions, setProductReactions] = useState<
    Record<string, ProductReactionDraft>
  >({});
  const [purchaseDateMode, setPurchaseDateMode] =
    useState<ActionDateMode>('today');
  const [purchaseDateDay, setPurchaseDateDay] = useState<number | null>(null);
  const [purchaseDateMonth, setPurchaseDateMonth] = useState<number | null>(null);
  const [purchaseDateYear, setPurchaseDateYear] = useState<number | null>(null);
  const [offerDateMode, setOfferDateMode] = useState<ActionDateMode>('today');
  const [offerDateDay, setOfferDateDay] = useState<number | null>(null);
  const [offerDateMonth, setOfferDateMonth] = useState<number | null>(null);
  const [offerDateYear, setOfferDateYear] = useState<number | null>(null);
  const [completeError, setCompleteError] = useState('');
  const [completingGift, setCompletingGift] = useState(false);
  const [offerModalVisible, setOfferModalVisible] = useState(false);
  const [offeringGift, setOfferingGift] = useState(false);
  const [historyToastVisible, setHistoryToastVisible] = useState(false);
  const [
    completeIncompleteProductsConfirmVisible,
    setCompleteIncompleteProductsConfirmVisible,
  ] = useState(false);
  const [historyPurposeFilter, setHistoryPurposeFilter] = useState<'all' | GiftPurpose>('all');
  const [historyYearFilter, setHistoryYearFilter] = useState<'all' | number>(
    new Date().getFullYear()
  );
  const [historyVisible, setHistoryVisible] = useState(false);
  const historyBackRef = useRef<ReturnType<typeof pushAppBackEntry> | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [giftPlanToDelete, setGiftPlanToDelete] = useState<GiftPlan | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deletingGift, setDeletingGift] = useState(false);
  const [productToRemove, setProductToRemove] = useState<GiftPlanProduct | null>(null);
  const [removeProductConfirmVisible, setRemoveProductConfirmVisible] = useState(false);
  const [deadlineModalVisible, setDeadlineModalVisible] = useState(false);
  const [editDeadlineDay, setEditDeadlineDay] = useState<number | null>(null);
  const [editDeadlineMonth, setEditDeadlineMonth] = useState<number | null>(null);
  const [editDeadlineYear, setEditDeadlineYear] = useState<number | null>(null);
  const [editPurchaseDeadlineDay, setEditPurchaseDeadlineDay] = useState<
    number | null
  >(null);
  const [editPurchaseDeadlineMonth, setEditPurchaseDeadlineMonth] = useState<
    number | null
  >(null);
  const [editPurchaseDeadlineYear, setEditPurchaseDeadlineYear] = useState<
    number | null
  >(null);
  const [deadlineEditError, setDeadlineEditError] = useState('');
  const [savingDeadline, setSavingDeadline] = useState(false);
  const [giftDetailTab, setGiftDetailTab] = useState<'details' | 'products'>('details');
  const [productSearch, setProductSearch] = useState('');
  const [productError, setProductError] = useState('');
  const [manualProductName, setManualProductName] = useState('');
  const [manualProductPrice, setManualProductPrice] = useState('');
  const [manualProductError, setManualProductError] = useState('');
  const [savingGiftProducts, setSavingGiftProducts] = useState(false);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [budgetError, setBudgetError] = useState('');
  const [budgetHistoryVisible, setBudgetHistoryVisible] = useState(false);
  const [budgetIncreaseModalVisible, setBudgetIncreaseModalVisible] = useState(false);
  const [budgetDecreaseConfirmVisible, setBudgetDecreaseConfirmVisible] = useState(false);
  const [pendingManualBudget, setPendingManualBudget] = useState<number | null>(null);
  const [pendingBudgetIncreaseProduct, setPendingBudgetIncreaseProduct] =
    useState<GiftPlanProduct | null>(null);
  const [pendingBudgetIncreaseProducts, setPendingBudgetIncreaseProducts] =
    useState<GiftPlanProduct[]>([]);
  const [pendingBudgetIncreaseTotal, setPendingBudgetIncreaseTotal] = useState(0);
  const [pendingBudgetDuplicateAction, setPendingBudgetDuplicateAction] =
    useState<'current' | 'all' | null>(null);
  const [pendingBudgetDuplicatePlans, setPendingBudgetDuplicatePlans] =
    useState<GiftPlan[]>([]);
  const [duplicateProductModalVisible, setDuplicateProductModalVisible] =
    useState(false);
  const [duplicateProductToAdd, setDuplicateProductToAdd] =
    useState<GiftPlanProduct | null>(null);
  const [duplicateProductSelectedProducts, setDuplicateProductSelectedProducts] =
    useState<GiftPlanProduct[]>([]);
  const [duplicateActivePlans, setDuplicateActivePlans] = useState<GiftPlan[]>([]);
  const [duplicateCompletedPlans, setDuplicateCompletedPlans] = useState<GiftPlan[]>([]);
  const [addedProductToast, setAddedProductToast] =
    useState<GiftPlanProduct | null>(null);
  const [addedProductToastProgress, setAddedProductToastProgress] = useState(1);
  const [selectedProductDetailId, setSelectedProductDetailId] = useState<string | null>(null);
  const [activePriceAlert, setActivePriceAlert] = useState<PriceAlert | null>(
    priceAlert || null
  );
  const [priceAlertHighlightActive, setPriceAlertHighlightActive] = useState(Boolean(priceAlert));
  const markedPriceAlertRef = useRef<string | null>(null);
  const productDetailBackRef = useRef<ReturnType<typeof pushAppBackEntry> | null>(
    null
  );
  const [aiHelpModalVisible, setAiHelpModalVisible] = useState(false);
  const [aiPersonDescription, setAiPersonDescription] = useState('');
  const [aiBudget, setAiBudget] = useState('');
  const [aiProductCount, setAiProductCount] = useState('0');
  const [aiKeepExistingProducts, setAiKeepExistingProducts] = useState(false);
  const [aiHelpError, setAiHelpError] = useState('');
  const [aiPromptInput, setAiPromptInput] = useState('');
  const [changeProduct, setChangeProduct] = useState<GiftPlanProduct | null>(null);
  const [changeProductModeVisible, setChangeProductModeVisible] = useState(false);
  const [changeProductManualVisible, setChangeProductManualVisible] = useState(false);
  const [changeProductSearch, setChangeProductSearch] = useState('');
  const [changeProductAiVisible, setChangeProductAiVisible] = useState(false);
  const [changeProductAiDescription, setChangeProductAiDescription] = useState('');
  const [changeProductAiBudget, setChangeProductAiBudget] = useState('');
  const [changeProductAiPromptInput, setChangeProductAiPromptInput] = useState('');
  const [otherStoreModalVisible, setOtherStoreModalVisible] = useState(false);
  const [otherStoreMode, setOtherStoreMode] = useState<'other' | 'manual'>('other');
  const [otherStoreName, setOtherStoreName] = useState('');
  const [otherStorePrice, setOtherStorePrice] = useState('');
  const [otherStoreImageUri, setOtherStoreImageUri] = useState('');
  const [otherStoreImageFile, setOtherStoreImageFile] = useState<File | null>(null);
  const [otherStoreError, setOtherStoreError] = useState('');

  const years = getYearOptions();
  const actionYears = getActionYearOptions();

  const plannedGiftPlans = useMemo(() => {
    return giftPlans
      .filter((giftPlan) => giftPlan.status !== 'completed')
      .sort((a, b) => a.deadlineDate.localeCompare(b.deadlineDate));
  }, [giftPlans]);

  const plannedGiftPlanGroups = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const groups = new Map<number, GiftPlan[]>();

    plannedGiftPlans.forEach((giftPlan) => {
      const year = getYearFromDateKey(giftPlan.deadlineDate);
      const yearPlans = groups.get(year) || [];
      groups.set(year, [...yearPlans, giftPlan]);
    });

    return Array.from(groups.entries())
      .sort(([yearA], [yearB]) => yearA - yearB)
      .map(([year, plans]) => ({
        year,
        title: year === currentYear ? `Anul curent - ${year}` : `Viitor - ${year}`,
        plans,
        totalBudget: plans.reduce((total, giftPlan) => total + giftPlan.budget, 0),
      }));
  }, [plannedGiftPlans]);

  const completedGiftPlanBase = useMemo(() => {
    return giftPlans
      .filter((giftPlan) => giftPlan.status === 'completed')
      .sort((a, b) => a.deadlineDate.localeCompare(b.deadlineDate));
  }, [giftPlans]);

  const historyYearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearsSet = new Set<number>([currentYear]);

    completedGiftPlanBase.forEach((giftPlan) => {
      yearsSet.add(getHistoryYear(giftPlan));
    });

    return [
      { label: 'Toti anii', value: 'all' },
      ...Array.from(yearsSet)
        .sort((a, b) => b - a)
        .map((year) => ({
          label: year === currentYear ? `Anul curent - ${year}` : String(year),
          value: year,
        })),
    ];
  }, [completedGiftPlanBase]);

  const completedGiftPlans = useMemo(() => {
    return completedGiftPlanBase
      .filter((giftPlan) => {
        if (historyPurposeFilter === 'all') return true;
        return giftPlan.purpose === historyPurposeFilter;
      })
      .filter((giftPlan) => {
        if (historyYearFilter === 'all') return true;
        return getHistoryYear(giftPlan) === historyYearFilter;
      })
      .sort((a, b) => a.deadlineDate.localeCompare(b.deadlineDate));
  }, [completedGiftPlanBase, historyPurposeFilter, historyYearFilter]);

  const completedGiftPlanGroups = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const groups = new Map<number, GiftPlan[]>();

    completedGiftPlans.forEach((giftPlan) => {
      const year = getHistoryYear(giftPlan);
      const yearPlans = groups.get(year) || [];
      groups.set(year, [...yearPlans, giftPlan]);
    });

    return Array.from(groups.entries())
      .sort(([yearA], [yearB]) => yearB - yearA)
      .map(([year, plans]) => ({
        year,
        title: year === currentYear ? `Anul curent - ${year}` : `Anul ${year}`,
        plans,
        totalBudget: plans.reduce((total, giftPlan) => total + giftPlan.budget, 0),
      }));
  }, [completedGiftPlans]);

  const historyBudgetChartData = useMemo(() => {
    if (historyPurposeFilter === 'all' || historyYearFilter !== 'all') {
      return [];
    }

    const totalsByYear = new Map<number, number>();

    completedGiftPlanBase
      .filter((giftPlan) => giftPlan.purpose === historyPurposeFilter)
      .forEach((giftPlan) => {
        const year = getHistoryYear(giftPlan);
        totalsByYear.set(year, (totalsByYear.get(year) || 0) + giftPlan.budget);
      });

    return Array.from(totalsByYear.entries())
      .sort(([yearA], [yearB]) => yearA - yearB)
      .map(([year, value]) => ({
        year,
        value,
      }));
  }, [completedGiftPlanBase, historyPurposeFilter, historyYearFilter]);

  const historyBudgetValues = historyBudgetChartData.map((entry) => entry.value);
  const historyBudgetMin =
    historyBudgetValues.length > 0 ? Math.min(...historyBudgetValues) : 0;
  const historyBudgetMax =
    historyBudgetValues.length > 0 ? Math.max(...historyBudgetValues) : 0;
  const historyBudgetRange = Math.max(1, historyBudgetMax - historyBudgetMin);
  const historyBudgetChartPoints = historyBudgetChartData.map((entry, index) => {
    const normalized =
      historyBudgetValues.length <= 1
        ? 0.5
        : (entry.value - historyBudgetMin) / historyBudgetRange;
    const x =
      historyBudgetValues.length <= 1
        ? BUDGET_CHART_PLOT_WIDTH / 2
        : BUDGET_CHART_PLOT_PADDING +
          (index / (historyBudgetValues.length - 1)) *
            (BUDGET_CHART_PLOT_WIDTH - BUDGET_CHART_PLOT_PADDING * 2);
    const y =
      BUDGET_CHART_PLOT_PADDING +
      (1 - normalized) *
        (BUDGET_CHART_PLOT_HEIGHT - BUDGET_CHART_PLOT_PADDING * 2);

    return {
      ...entry,
      x,
      y,
    };
  });
  const historyBudgetChartSegments = historyBudgetChartPoints
    .slice(0, -1)
    .map((point, index) => {
      const nextPoint = historyBudgetChartPoints[index + 1];
      const dx = nextPoint.x - point.x;
      const dy = nextPoint.y - point.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);

      return {
        key: `${point.year}-${nextPoint.year}-${index}`,
        left: point.x + dx / 2 - length / 2,
        top: point.y + dy / 2 - 2,
        width: length,
        angle,
      };
    });

  const load = async () => {
    try {
      if (!token) return;
      setLoading(true);
      const [result, giftPlansResult, partnerStoresResult] = await Promise.all([
        getLovedOneById(token, lovedOneId),
        getGiftPlans(token, lovedOneId),
        getPartnerStores(token),
      ]);
      setData(result);
      setGiftPlans(giftPlansResult);
      setPartnerStores(partnerStoresResult);
    } finally {
      setLoading(false);
    }
  };

  const loadGiftPlans = async () => {
    try {
      if (!token) return;
      setGiftPlansLoading(true);
      const giftPlansResult = await getGiftPlans(token, lovedOneId);
      setGiftPlans(giftPlansResult);
    } catch (error) {
      console.error('LOAD GIFT PLANS ERROR:', error);
    } finally {
      setGiftPlansLoading(false);
    }
  };

  const closeDeleteLovedOneModal = () => {
    if (deletingLovedOne) return;

    setDeleteLovedOneVisible(false);
    setDeleteLovedOneError('');
  };

  const confirmDeleteLovedOne = async () => {
    if (!token || !data) return;

    try {
      setDeletingLovedOne(true);
      setDeleteLovedOneError('');
      await deleteLovedOne(token, data.id);
      invalidateCalendarCache();
      setDeleteLovedOneVisible(false);
      onBack();
    } catch (error) {
      console.error('DELETE LOVED ONE ERROR:', error);
      setDeleteLovedOneError('Nu am putut sterge persoana. Incearca din nou.');
    } finally {
      setDeletingLovedOne(false);
    }
  };

  useEffect(() => {
    load();
  }, [lovedOneId, token]);

  useEffect(() => {
    if (!initialGiftPlanId || selectedGiftPlan) return;

    const giftPlan = giftPlans.find((item) => item.id === initialGiftPlanId);

    if (giftPlan) {
      setSelectedGiftPlan(giftPlan);
      onGiftPlanTargetConsumed?.();
    }
  }, [
    giftPlans,
    initialGiftPlanId,
    onGiftPlanTargetConsumed,
    selectedGiftPlan,
  ]);

  useEffect(() => {
    if (!priceAlert) return;

    setActivePriceAlert(priceAlert);
    setPriceAlertHighlightActive(true);
    markedPriceAlertRef.current = null;
  }, [priceAlert]);

  useEffect(() => {
    if (!initialProductId || !selectedGiftPlan) return;

    const productToOpen = (selectedGiftPlan.selectedProducts || []).find(
      (product) =>
        product.id === initialProductId ||
        (activePriceAlert?.productKey &&
          getProductIdentityKey(product) === activePriceAlert.productKey)
    );

    if (!productToOpen) return;

    setGiftDetailTab('details');
    onPriceAlertConsumed?.();
  }, [
    activePriceAlert,
    initialProductId,
    onPriceAlertConsumed,
    selectedGiftPlan,
  ]);

  useEffect(() => {
    if (!selectedGiftPlan || initialGiftPlanId) return;

    const entry = pushAppBackEntry(() => setSelectedGiftPlan(null));
    selectedGiftPlanBackRef.current = entry;

    return () => {
      entry.remove();
      if (selectedGiftPlanBackRef.current === entry) {
        selectedGiftPlanBackRef.current = null;
      }
    };
  }, [initialGiftPlanId, selectedGiftPlan]);

  useEffect(() => {
    if (!historyVisible) return;

    const entry = pushAppBackEntry(() => setHistoryVisible(false));
    historyBackRef.current = entry;

    return () => {
      entry.remove();
      if (historyBackRef.current === entry) {
        historyBackRef.current = null;
      }
    };
  }, [historyVisible]);

  useEffect(() => {
    if (!selectedProductDetailId) return;

    const entry = pushAppBackEntry(() => setSelectedProductDetailId(null));
    productDetailBackRef.current = entry;

    return () => {
      entry.remove();
      if (productDetailBackRef.current === entry) {
        productDetailBackRef.current = null;
      }
    };
  }, [selectedProductDetailId]);

  useEffect(() => {
    if (selectedGiftPlan?.status !== 'planned' && giftDetailTab !== 'details') {
      setGiftDetailTab('details');
    }
  }, [giftDetailTab, selectedGiftPlan?.status]);

  const goBackFromSelectedGiftPlan = () => {
    if (initialGiftPlanId) {
      onBack();
      return;
    }

    selectedGiftPlanBackRef.current?.remove();
    selectedGiftPlanBackRef.current = null;
    setSelectedGiftPlan(null);
  };

  const goBackFromHistory = () => {
    historyBackRef.current?.remove();
    historyBackRef.current = null;
    setHistoryVisible(false);
  };

  const goBackFromProductDetail = () => {
    productDetailBackRef.current?.remove();
    productDetailBackRef.current = null;
    setSelectedProductDetailId(null);
  };

  useEffect(() => {
    if (
      !token ||
      !activePriceAlert ||
      !selectedProductDetailId ||
      selectedProductDetailId !== activePriceAlert.productId ||
      activePriceAlert.highlightSeenAt ||
      markedPriceAlertRef.current === activePriceAlert.id
    ) {
      return;
    }

    markedPriceAlertRef.current = activePriceAlert.id;
    markPriceAlertHighlightSeen(token, activePriceAlert.id)
      .then(() => {
        const highlightSeenAt = new Date().toISOString();
        setPriceAlertHighlightActive(false);
        setActivePriceAlert((current) =>
          current?.id === activePriceAlert.id
            ? { ...current, highlightSeenAt }
            : current
        );
      })
      .catch((error) => {
        console.error('MARK PRICE ALERT HIGHLIGHT ERROR:', error);
        markedPriceAlertRef.current = null;
      });
  }, [activePriceAlert, selectedProductDetailId, token]);

  useEffect(() => {
    if (!addedProductToast) return;

    setAddedProductToastProgress(1);
    const startedAt = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const nextProgress = Math.max(
        0,
        1 - elapsed / ADDED_PRODUCT_TOAST_DURATION
      );

      setAddedProductToastProgress(nextProgress);
    }, 50);
    const dismissTimeout = setTimeout(() => {
      setAddedProductToast(null);
    }, ADDED_PRODUCT_TOAST_DURATION);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(dismissTimeout);
    };
  }, [addedProductToast]);

  const resetGiftForm = () => {
    setGiftPurpose(null);
    setGiftBudget(200);
    setCustomBudget('');
    setIsCustomBudget(false);
    setDeadlineDay(null);
    setDeadlineMonth(null);
    setDeadlineYear(null);
    setCanEditFixedGiftDate(false);
    setPurchaseDeadlineDay(null);
    setPurchaseDeadlineMonth(null);
    setPurchaseDeadlineYear(null);
    setGiftError('');
    setEditingGiftPlan(null);
  };

  const resetCompleteForm = () => {
    setExperienceDetails('');
    setReactionRating(null);
    setProductReactions({});
    setCompleteError('');
    setCompleteIncompleteProductsConfirmVisible(false);
  };

  const setPurchaseDateToToday = () => {
    const today = getTodayParts();
    setPurchaseDateDay(today.day);
    setPurchaseDateMonth(today.month);
    setPurchaseDateYear(today.year);
  };

  const setOfferDateToToday = () => {
    const today = getTodayParts();
    setOfferDateDay(today.day);
    setOfferDateMonth(today.month);
    setOfferDateYear(today.year);
  };

  const getPurchaseActionDateKey = () => {
    if (purchaseDateMode === 'today') {
      return getTodayKey();
    }

    if (!purchaseDateDay || !purchaseDateMonth || !purchaseDateYear) {
      setCompleteError('Selecteaza ziua in care ai cumparat cadoul.');
      return null;
    }

    if (isDateAfterToday(purchaseDateDay, purchaseDateMonth, purchaseDateYear)) {
      setCompleteError('Data cumpararii nu poate fi in viitor.');
      return null;
    }

    return buildDateKey(purchaseDateDay, purchaseDateMonth, purchaseDateYear);
  };

  const getOfferActionDateKey = () => {
    if (offerDateMode === 'today') {
      return getTodayKey();
    }

    if (!offerDateDay || !offerDateMonth || !offerDateYear) {
      setCompleteError('Selecteaza ziua in care ai oferit cadoul.');
      return null;
    }

    if (isDateAfterToday(offerDateDay, offerDateMonth, offerDateYear)) {
      setCompleteError('Data oferirii nu poate fi in viitor.');
      return null;
    }

    return buildDateKey(offerDateDay, offerDateMonth, offerDateYear);
  };

  const closeGiftModal = () => {
    resetGiftForm();
    setGiftModalVisible(false);
  };

  const openCreateGiftModal = () => {
    resetGiftForm();
    setGiftModalVisible(true);
  };

  const openEditGiftModal = (giftPlan: GiftPlan) => {
    if (!canModifyGiftPlan(giftPlan)) return;

    const isCustomBudgetValue = !BUDGET_OPTIONS.includes(giftPlan.budget);

    setEditingGiftPlan(giftPlan);
    setGiftPurpose(giftPlan.purpose);
    setGiftBudget(isCustomBudgetValue ? 200 : giftPlan.budget);
    setCustomBudget(isCustomBudgetValue ? String(giftPlan.budget) : '');
    setIsCustomBudget(isCustomBudgetValue);

    const parts = parseDateParts(giftPlan.deadlineDate);
    setDeadlineDay(parts.day);
    setDeadlineMonth(parts.month);
    setDeadlineYear(parts.year);
    setCanEditFixedGiftDate(false);
    const purchaseParts = parseDateParts(
      giftPlan.purchaseDeadlineDate || giftPlan.deadlineDate
    );
    setPurchaseDeadlineDay(purchaseParts.day);
    setPurchaseDeadlineMonth(purchaseParts.month);
    setPurchaseDeadlineYear(purchaseParts.year);

    setGiftError('');
    setGiftModalVisible(true);
  };

  const handlePurposeChange = (purpose: GiftPurpose) => {
    setGiftPurpose(purpose);
    setGiftError('');
    setCanEditFixedGiftDate(false);

    if (purpose === 'Zi de nastere' && data) {
      const nextBirthday = getNextDateParts(Number(data.day), Number(data.month));
      setDeadlineDay(nextBirthday.day);
      setDeadlineMonth(nextBirthday.month);
      setDeadlineYear(nextBirthday.year);
    } else if (purpose === 'Craciun') {
      const christmas = getNextDateParts(25, 12);
      setDeadlineDay(christmas.day);
      setDeadlineMonth(christmas.month);
      setDeadlineYear(christmas.year);
    } else {
      const today = getTodayParts();
      if (!deadlineDay || !deadlineMonth || !deadlineYear) {
        setDeadlineDay(today.day);
        setDeadlineMonth(today.month);
        setDeadlineYear(today.year);
      }
    }

    if (!purchaseDeadlineDay || !purchaseDeadlineMonth || !purchaseDeadlineYear) {
      const today = getTodayParts();
      setPurchaseDeadlineDay(today.day);
      setPurchaseDeadlineMonth(today.month);
      setPurchaseDeadlineYear(today.year);
    }
  };

  const saveGiftPlan = async () => {
    if (!giftPurpose) {
      setGiftError('Selecteaza scopul cadoului.');
      return;
    }

    const selectedBudget = isCustomBudget ? Number(customBudget) : giftBudget;

    if (!Number.isFinite(selectedBudget) || selectedBudget <= 0) {
      setGiftError('Introdu o suma valida pentru buget.');
      return;
    }

    if (
      !purchaseDeadlineDay ||
      !purchaseDeadlineMonth ||
      !purchaseDeadlineYear
    ) {
      setGiftError('Selecteaza deadline-ul pana cand vrei sa cumperi cadoul.');
      return;
    }

    if (
      isDateBeforeToday(
        purchaseDeadlineDay,
        purchaseDeadlineMonth,
        purchaseDeadlineYear
      )
    ) {
      setGiftError('Deadline-ul de cumparare nu poate fi in trecut.');
      return;
    }

    if (!deadlineDay || !deadlineMonth || !deadlineYear) {
      setGiftError('Selecteaza data in care vrei sa oferi cadoul.');
      return;
    }

    if (isDateBeforeToday(deadlineDay, deadlineMonth, deadlineYear)) {
      setGiftError('Data oferirii nu poate fi in trecut.');
      return;
    }

    const purchaseDateKey = `${purchaseDeadlineYear}-${pad(
      purchaseDeadlineMonth
    )}-${pad(purchaseDeadlineDay)}`;
    const giftDateKey = `${deadlineYear}-${pad(deadlineMonth)}-${pad(
      deadlineDay
    )}`;

    if (purchaseDateKey > giftDateKey) {
      setGiftError(
        'Deadline-ul de cumparare nu poate fi dupa data oferirii cadoului.'
      );
      return;
    }

    if (!token) return;

    try {
      setSavingGift(true);

      const payload = {
        purpose: giftPurpose,
        budget: selectedBudget,
        deadlineDay,
        deadlineMonth,
        deadlineYear,
        purchaseDeadlineDay,
        purchaseDeadlineMonth,
        purchaseDeadlineYear,
      };

      if (editingGiftPlan) {
        await updateGiftPlan(token, lovedOneId, editingGiftPlan.id, payload);
      } else {
        await createGiftPlan(token, lovedOneId, payload);
      }

      invalidateCalendarCache();
      await loadGiftPlans();
      closeGiftModal();
    } catch (error: any) {
      setGiftError(
        error?.message ||
          (editingGiftPlan
            ? 'Nu am putut actualiza cadoul.'
            : 'Nu am putut salva cadoul.')
      );
    } finally {
      setSavingGift(false);
    }
  };

  const openCompleteModal = (initialError = '') => {
    resetCompleteForm();
    setPurchaseDateMode('today');
    setPurchaseDateToToday();
    setCompleteError(initialError);
    setCompleteModalVisible(true);
  };

  const openOfferModal = () => {
    resetCompleteForm();
    setOfferDateMode('today');
    setOfferDateToToday();
    const initialProductReactions =
      selectedGiftPlan?.selectedProducts
        ?.filter((product) => product.isPurchased)
        .reduce<Record<string, ProductReactionDraft>>((acc, product) => {
          acc[product.id] = { reactionRating: null, details: '' };
          return acc;
        }, {}) || {};

    setProductReactions(initialProductReactions);
    setOfferModalVisible(true);
  };

  const requestCompleteModal = () => {
    if (!selectedGiftPlan) return;

    const selectedProducts = selectedGiftPlan.selectedProducts || [];
    const purchasedProducts = selectedProducts.filter(
      (product) => product.isPurchased
    );
    const unpurchasedProducts = selectedProducts.filter(
      (product) => !product.isPurchased
    );

    if (selectedProducts.length === 0) {
      setEmptyGiftGuideVisible(true);
      return;
    }

    if (purchasedProducts.length === 0) {
      openCompleteModal('Marcheaza cel putin un produs ca fiind cumparat.');
      return;
    }

    if (unpurchasedProducts.length > 0) {
      resetCompleteForm();
      setCompleteIncompleteProductsConfirmVisible(true);
      return;
    }

    openCompleteModal();
  };

  const closeCompleteModal = () => {
    resetCompleteForm();
    setCompleteModalVisible(false);
  };

  const updateProductReaction = (
    productId: string,
    changes: Partial<ProductReactionDraft>
  ) => {
    setProductReactions((current) => ({
      ...current,
      [productId]: {
        reactionRating: current[productId]?.reactionRating ?? null,
        details: current[productId]?.details || '',
        ...changes,
      },
    }));

    if (completeError) {
      setCompleteError('');
    }
  };

  const markGiftAsCompleted = async () => {
    if (!token || !selectedGiftPlan) return;

    const selectedProducts = selectedGiftPlan.selectedProducts || [];
    const purchasedProducts = selectedProducts.filter(
      (product) => product.isPurchased
    );

    if (purchasedProducts.length === 0) {
      setCompleteError('Marcheaza cel putin un produs ca fiind cumparat.');
      return;
    }

    const purchasedAt = getPurchaseActionDateKey();

    if (!purchasedAt) {
      return;
    }

    try {
      setCompletingGift(true);
      setCompleteIncompleteProductsConfirmVisible(false);
      const completedGiftPlan = await completeGiftPlan(
        token,
        lovedOneId,
        selectedGiftPlan.id,
        {
          purchasedAt,
          appFeedbackDetails: experienceDetails.trim(),
          ...(reactionRating ? { appFeedbackRating: reactionRating } : {}),
        }
      );

      invalidateCalendarCache();
      await loadGiftPlans();
      setSelectedGiftPlan(completedGiftPlan);
      closeCompleteModal();
    } catch (error: any) {
      setCompleteError(error?.message || 'Nu am putut finaliza cadoul.');
    } finally {
      setCompletingGift(false);
    }
  };

  const markGiftAsOffered = async () => {
    if (!token || !selectedGiftPlan) return;

    const purchasedProducts = (selectedGiftPlan.selectedProducts || []).filter(
      (product) => product.isPurchased
    );

    if (!reactionRating) {
      setCompleteError('Alege reactia generala pentru cadou.');
      return;
    }

    const missingReactionProduct = purchasedProducts.find(
      (product) => !productReactions[product.id]?.reactionRating
    );

    if (missingReactionProduct) {
      setCompleteError(`Alege reactia pentru ${missingReactionProduct.name}.`);
      return;
    }

    const offeredAt = getOfferActionDateKey();

    if (!offeredAt) {
      return;
    }

    const purchasedAtDate = selectedGiftPlan.completedAt
      ? new Date(selectedGiftPlan.completedAt)
      : null;
    const purchasedAtKey =
      purchasedAtDate && !Number.isNaN(purchasedAtDate.getTime())
        ? buildDateKey(
            purchasedAtDate.getDate(),
            purchasedAtDate.getMonth() + 1,
            purchasedAtDate.getFullYear()
          )
        : null;

    if (purchasedAtKey && offeredAt < purchasedAtKey) {
      setCompleteError('Data oferirii nu poate fi inainte de data cumpararii.');
      return;
    }

    const productReactionsPayload: ProductReaction[] = purchasedProducts.map(
      (product) => ({
        productId: product.id,
        productName: product.name,
        reactionRating: productReactions[product.id]?.reactionRating || 3,
        details: productReactions[product.id]?.details.trim() || '',
      })
    );

    try {
      setOfferingGift(true);
      const offeredGiftPlan = await offerGiftPlan(
        token,
        lovedOneId,
        selectedGiftPlan.id,
        {
          offeredAt,
          experienceDetails: experienceDetails.trim(),
          reactionRating,
          productReactions: productReactionsPayload,
        }
      );

      invalidateCalendarCache();
      await loadGiftPlans();
      setSelectedGiftPlan(offeredGiftPlan);
      setOfferModalVisible(false);
      resetCompleteForm();
      setHistoryToastVisible(true);
    } catch (error: any) {
      setCompleteError(error?.message || 'Nu am putut muta cadoul in istoric.');
    } finally {
      setOfferingGift(false);
    }
  };

  const saveSelectedProducts = async (
    giftPlan: GiftPlan,
    selectedProducts: GiftPlanProduct[],
    budget?: number,
    budgetChangeReason?: string
  ) => {
    if (!token || !canModifyGiftPlan(giftPlan)) return false;

    try {
      setSavingGiftProducts(true);
      setProductError('');

      const updatedGiftPlan = await updateGiftPlanProducts(
        token,
        lovedOneId,
        giftPlan.id,
        {
          selectedProducts,
          ...(budget !== undefined ? { budget, budgetChangeReason } : {}),
        }
      );

      invalidateCalendarCache();
      setGiftPlans((current) =>
        current.map((currentGiftPlan) =>
          currentGiftPlan.id === updatedGiftPlan.id
            ? updatedGiftPlan
            : currentGiftPlan
        )
      );
      setSelectedGiftPlan(updatedGiftPlan);
      return true;
    } catch (error: any) {
      setProductError(error?.message || 'Nu am putut actualiza produsele.');
      return false;
    } finally {
      setSavingGiftProducts(false);
    }
  };

  const updateProductsForAnotherGiftPlan = async (
    giftPlan: GiftPlan,
    selectedProducts: GiftPlanProduct[]
  ) => {
    if (!token || !canModifyGiftPlan(giftPlan)) return null;

    const updatedGiftPlan = await updateGiftPlanProducts(
      token,
      lovedOneId,
      giftPlan.id,
      { selectedProducts }
    );

    invalidateCalendarCache();
    setGiftPlans((current) =>
      current.map((currentGiftPlan) =>
        currentGiftPlan.id === updatedGiftPlan.id
          ? updatedGiftPlan
          : currentGiftPlan
      )
    );

    return updatedGiftPlan;
  };

  const getGiftPlansContainingProduct = (
    productKey: string,
    currentGiftPlanId: string
  ) => {
    return giftPlans
      .filter((giftPlan) => giftPlan.id !== currentGiftPlanId)
      .filter((giftPlan) =>
        (giftPlan.selectedProducts || []).some(
          (product) => getProductIdentityKey(product) === productKey
        )
      );
  };

  const removeProductFromDuplicateActivePlans = async (
    productKey: string,
    activePlans: GiftPlan[]
  ) => {
    await Promise.all(
      activePlans
        .filter((giftPlan) => canModifyGiftPlan(giftPlan))
        .map((giftPlan) =>
          updateProductsForAnotherGiftPlan(
            giftPlan,
            (giftPlan.selectedProducts || []).filter(
              (product) => getProductIdentityKey(product) !== productKey
            )
          )
        )
    );
  };

  const clearDuplicateProductModal = () => {
    setDuplicateProductModalVisible(false);
    setDuplicateProductToAdd(null);
    setDuplicateProductSelectedProducts([]);
    setDuplicateActivePlans([]);
    setDuplicateCompletedPlans([]);
  };

  const saveProductAddition = async (
    giftPlan: GiftPlan,
    productToSave: GiftPlanProduct,
    nextSelectedProducts: GiftPlanProduct[],
    duplicateAction: 'current' | 'all' | null = null,
    activeDuplicatePlans: GiftPlan[] = []
  ) => {
    const nextTotal = nextSelectedProducts.reduce(
      (sum, selectedProduct) => sum + selectedProduct.price,
      0
    );

    if (nextTotal > giftPlan.budget) {
      setPendingBudgetIncreaseProduct(productToSave);
      setPendingBudgetIncreaseProducts(nextSelectedProducts);
      setPendingBudgetIncreaseTotal(nextTotal);
      setPendingBudgetDuplicateAction(duplicateAction);
      setPendingBudgetDuplicatePlans(activeDuplicatePlans);
      setBudgetIncreaseModalVisible(true);
      return;
    }

    const saved = await saveSelectedProducts(giftPlan, nextSelectedProducts);

    if (saved) {
      if (duplicateAction === 'current') {
        await removeProductFromDuplicateActivePlans(
          getProductIdentityKey(productToSave),
          activeDuplicatePlans
        );
      }

      setAddedProductToast(productToSave);
      setAddedProductToastProgress(1);
    }
  };

  const addProductToGift = async (
    giftPlan: GiftPlan,
    product: ProductSuggestion
  ) => {
    const selectedProducts = giftPlan.selectedProducts || [];
    const productKey = getProductIdentityKey(product);

    if (
      selectedProducts.some(
        (selectedProduct) => getProductIdentityKey(selectedProduct) === productKey
      )
    ) {
      setProductError('Produsul este deja adaugat pe acest cadou.');
      return;
    }

    const productToSave = toGiftPlanProduct(product);
    const nextSelectedProducts = [...selectedProducts, productToSave];
    const duplicatePlans = getGiftPlansContainingProduct(productKey, giftPlan.id);

    if (duplicatePlans.length > 0) {
      setDuplicateProductToAdd(productToSave);
      setDuplicateProductSelectedProducts(nextSelectedProducts);
      setDuplicateActivePlans(
        duplicatePlans.filter((duplicatePlan) => duplicatePlan.status !== 'completed')
      );
      setDuplicateCompletedPlans(
        duplicatePlans.filter((duplicatePlan) => duplicatePlan.status === 'completed')
      );
      setDuplicateProductModalVisible(true);
      return;
    }

    await saveProductAddition(giftPlan, productToSave, nextSelectedProducts);
  };

  const addManualProductToGift = async (giftPlan: GiftPlan) => {
    const name = manualProductName.trim() || productSearch.trim();
    const price = Number(manualProductPrice);

    if (!name) {
      setManualProductError('Scrie numele produsului sau ce vrei sa cumperi.');
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      setManualProductError('Introdu un pret valid.');
      return;
    }

    const productKey = getProductIdentityKey({
      name,
      brand: 'manual',
      category: 'manual',
    });
    const selectedProducts = giftPlan.selectedProducts || [];

    if (
      selectedProducts.some(
        (selectedProduct) => getProductIdentityKey(selectedProduct) === productKey
      )
    ) {
      setManualProductError('Produsul manual exista deja pe acest cadou.');
      return;
    }

    const now = Date.now();
    const manualProduct: GiftPlanProduct = {
      id: `manual-${now}`,
      productKey,
      productId: '',
      externalId: '',
      storeId: 'manual',
      storeName: 'Adaugat manual',
      name,
      brand: '',
      category: 'Manual',
      subcategory: '',
      productUrl: '',
      affiliateUrl: '',
      imageUrl: '',
      price,
      originalPrice: price,
      discount: 0,
      discountPercent: 0,
      hasDiscount: false,
      currency: 'RON',
      addedAt: new Date().toISOString(),
      isPurchased: false,
      purchasedAt: '',
      purchasedStoreName: '',
      purchasePrice: undefined,
      purchasedFromImportedStore: false,
      selectedAsCheapestOffer: false,
      manualSearchFallback: true,
    };
    const nextSelectedProducts = [...selectedProducts, manualProduct];

    await saveProductAddition(giftPlan, manualProduct, nextSelectedProducts);
    setProductSearch('');
    setManualProductName('');
    setManualProductPrice('');
    setManualProductError('');
  };

  const keepDuplicateProductInExistingLists = () => {
    clearDuplicateProductModal();
  };

  const keepDuplicateProductInAllLists = async (giftPlan: GiftPlan) => {
    if (!duplicateProductToAdd) return;

    const productToSave = duplicateProductToAdd;
    const nextSelectedProducts = duplicateProductSelectedProducts;

    clearDuplicateProductModal();
    await saveProductAddition(giftPlan, productToSave, nextSelectedProducts, 'all');
  };

  const closeBudgetIncreaseModal = () => {
    if (savingGiftProducts) return;

    setBudgetIncreaseModalVisible(false);
    setPendingBudgetIncreaseProduct(null);
    setPendingBudgetIncreaseProducts([]);
    setPendingBudgetIncreaseTotal(0);
    setPendingBudgetDuplicateAction(null);
    setPendingBudgetDuplicatePlans([]);
  };

  const confirmAddProductWithBudgetIncrease = async (giftPlan: GiftPlan) => {
    if (!pendingBudgetIncreaseProduct) return;

    const saved = await saveSelectedProducts(
      giftPlan,
      pendingBudgetIncreaseProducts,
      pendingBudgetIncreaseTotal,
      'auto_product_over_budget'
    );

    if (saved) {
      if (pendingBudgetDuplicateAction === 'current' && pendingBudgetIncreaseProduct) {
        await removeProductFromDuplicateActivePlans(
          getProductIdentityKey(pendingBudgetIncreaseProduct),
          pendingBudgetDuplicatePlans
        );
      }

      setAddedProductToast(pendingBudgetIncreaseProduct);
      setAddedProductToastProgress(1);
      closeBudgetIncreaseModal();
    }
  };

  const confirmAddProductWithoutBudgetIncrease = async (giftPlan: GiftPlan) => {
    if (!pendingBudgetIncreaseProduct) return;

    const saved = await saveSelectedProducts(
      giftPlan,
      pendingBudgetIncreaseProducts
    );

    if (saved) {
      if (pendingBudgetDuplicateAction === 'current' && pendingBudgetIncreaseProduct) {
        await removeProductFromDuplicateActivePlans(
          getProductIdentityKey(pendingBudgetIncreaseProduct),
          pendingBudgetDuplicatePlans
        );
      }

      setAddedProductToast(pendingBudgetIncreaseProduct);
      setAddedProductToastProgress(1);
      closeBudgetIncreaseModal();
    }
  };

  const replaceProductInGift = async (
    giftPlan: GiftPlan,
    currentProduct: GiftPlanProduct,
    replacementProduct: ProductSuggestion
  ) => {
    if (currentProduct.isPurchased) {
      setProductError('Produsul cumparat nu mai poate fi schimbat.');
      return;
    }

    const selectedProducts = giftPlan.selectedProducts || [];
    const replacementKey = getProductIdentityKey(replacementProduct);
    const alreadySelected = selectedProducts.some(
      (product) =>
        product.id !== currentProduct.id &&
        getProductIdentityKey(product) === replacementKey
    );

    if (alreadySelected) {
      setProductError('Produsul exista deja pe acest cadou.');
      return;
    }

    const replacementToSave = toGiftPlanProduct(replacementProduct);
    const updatedProducts = selectedProducts.map((product) =>
      product.id === currentProduct.id ? replacementToSave : product
    );

    await saveSelectedProducts(giftPlan, updatedProducts);
    setChangeProduct(null);
    setChangeProductManualVisible(false);
    setChangeProductSearch('');
  };

  const replaceProductWithManualGift = async (
    giftPlan: GiftPlan,
    currentProduct: GiftPlanProduct
  ) => {
    if (currentProduct.isPurchased) {
      setManualProductError('Produsul cumparat nu mai poate fi schimbat.');
      return;
    }

    const name = manualProductName.trim() || changeProductSearch.trim();
    const price = Number(manualProductPrice);

    if (!name) {
      setManualProductError('Scrie numele produsului sau ce vrei sa cumperi.');
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      setManualProductError('Introdu un pret valid.');
      return;
    }

    const productKey = getProductIdentityKey({
      name,
      brand: 'manual',
      category: 'manual',
    });
    const selectedProducts = giftPlan.selectedProducts || [];
    const alreadySelected = selectedProducts.some(
      (product) =>
        product.id !== currentProduct.id &&
        getProductIdentityKey(product) === productKey
    );

    if (alreadySelected) {
      setManualProductError('Produsul manual exista deja pe acest cadou.');
      return;
    }

    const manualReplacement: GiftPlanProduct = {
      id: `manual-${Date.now()}`,
      productKey,
      productId: '',
      externalId: '',
      storeId: 'manual',
      storeName: 'Adaugat manual',
      name,
      brand: '',
      category: 'Manual',
      subcategory: '',
      productUrl: '',
      affiliateUrl: '',
      imageUrl: '',
      price,
      originalPrice: price,
      discount: 0,
      discountPercent: 0,
      hasDiscount: false,
      currency: 'RON',
      addedAt: new Date().toISOString(),
      isPurchased: false,
      purchasedAt: '',
      purchasedStoreName: '',
      purchasePrice: undefined,
      purchasedFromImportedStore: false,
      selectedAsCheapestOffer: false,
      manualSearchFallback: true,
    };
    const updatedProducts = selectedProducts.map((product) =>
      product.id === currentProduct.id ? manualReplacement : product
    );

    await saveSelectedProducts(giftPlan, updatedProducts);
    setChangeProduct(null);
    setChangeProductManualVisible(false);
    setChangeProductSearch('');
    setManualProductName('');
    setManualProductPrice('');
    setManualProductError('');
  };

  const removeProductFromGift = async (giftPlan: GiftPlan, productId: string) => {
    const productToRemove = (giftPlan.selectedProducts || []).find(
      (product) => product.id === productId
    );

    if (productToRemove?.isPurchased) {
      setProductError('Produsul cumparat nu mai poate fi scos din lista.');
      return;
    }

    const selectedProducts = (giftPlan.selectedProducts || []).filter(
      (product) => product.id !== productId
    );

    await saveSelectedProducts(giftPlan, selectedProducts);
  };

  const requestRemoveProductFromGift = (product: GiftPlanProduct) => {
    setProductToRemove(product);
    setRemoveProductConfirmVisible(true);
    setProductError('');
  };

  const closeRemoveProductConfirm = () => {
    if (savingGiftProducts) return;

    setProductToRemove(null);
    setRemoveProductConfirmVisible(false);
  };

  const confirmRemoveProductFromGift = async (giftPlan: GiftPlan) => {
    if (!productToRemove) return;

    await removeProductFromGift(giftPlan, productToRemove.id);
    closeRemoveProductConfirm();
  };

  const openDeadlineEditModal = (giftPlan: GiftPlan) => {
    const parts = parseDateParts(giftPlan.deadlineDate);
    const purchaseParts = parseDateParts(
      giftPlan.purchaseDeadlineDate || giftPlan.deadlineDate
    );

    setEditDeadlineDay(parts.day);
    setEditDeadlineMonth(parts.month);
    setEditDeadlineYear(parts.year);
    setEditPurchaseDeadlineDay(purchaseParts.day);
    setEditPurchaseDeadlineMonth(purchaseParts.month);
    setEditPurchaseDeadlineYear(purchaseParts.year);
    setDeadlineEditError('');
    setDeadlineModalVisible(true);
  };

  const closeDeadlineEditModal = () => {
    if (savingDeadline) return;

    setDeadlineModalVisible(false);
    setEditDeadlineDay(null);
    setEditDeadlineMonth(null);
    setEditDeadlineYear(null);
    setEditPurchaseDeadlineDay(null);
    setEditPurchaseDeadlineMonth(null);
    setEditPurchaseDeadlineYear(null);
    setDeadlineEditError('');
  };

  const saveDeadlineOnly = async (giftPlan: GiftPlan) => {
    if (!token) return;

    if (
      !editPurchaseDeadlineDay ||
      !editPurchaseDeadlineMonth ||
      !editPurchaseDeadlineYear
    ) {
      setDeadlineEditError('Selecteaza deadline-ul de cumparare.');
      return;
    }

    if (!editDeadlineDay || !editDeadlineMonth || !editDeadlineYear) {
      setDeadlineEditError('Selecteaza data oferirii cadoului.');
      return;
    }

    if (
      isDateBeforeToday(
        editPurchaseDeadlineDay,
        editPurchaseDeadlineMonth,
        editPurchaseDeadlineYear
      )
    ) {
      setDeadlineEditError('Deadline-ul de cumparare nu poate fi in trecut.');
      return;
    }

    if (isDateBeforeToday(editDeadlineDay, editDeadlineMonth, editDeadlineYear)) {
      setDeadlineEditError('Data oferirii nu poate fi in trecut.');
      return;
    }

    const purchaseDateKey = `${editPurchaseDeadlineYear}-${pad(
      editPurchaseDeadlineMonth
    )}-${pad(editPurchaseDeadlineDay)}`;
    const nextGiftDateKey = `${editDeadlineYear}-${pad(editDeadlineMonth)}-${pad(
      editDeadlineDay
    )}`;

    if (purchaseDateKey > nextGiftDateKey) {
      setDeadlineEditError(
        'Data oferirii nu poate fi inainte de deadline-ul de cumparare.'
      );
      return;
    }

    try {
      setSavingDeadline(true);
      const updatedGiftPlan = await updateGiftPlan(
        token,
        lovedOneId,
        giftPlan.id,
        {
          purpose: giftPlan.purpose,
          budget: giftPlan.budget,
          deadlineDay: editDeadlineDay,
          deadlineMonth: editDeadlineMonth,
          deadlineYear: editDeadlineYear,
          purchaseDeadlineDay: editPurchaseDeadlineDay,
          purchaseDeadlineMonth: editPurchaseDeadlineMonth,
          purchaseDeadlineYear: editPurchaseDeadlineYear,
        }
      );

      invalidateCalendarCache();
      setGiftPlans((current) =>
        current.map((currentGiftPlan) =>
          currentGiftPlan.id === updatedGiftPlan.id
            ? updatedGiftPlan
            : currentGiftPlan
        )
      );
      setSelectedGiftPlan(updatedGiftPlan);
      closeDeadlineEditModal();
    } catch (error: any) {
      setDeadlineEditError(error?.message || 'Nu am putut salva deadline-ul.');
    } finally {
      setSavingDeadline(false);
    }
  };

  const markProductAsPurchased = async (
    giftPlan: GiftPlan,
    productId: string,
    purchaseData?: {
      storeName?: string;
      price?: number;
      imageUrl?: string;
      fromImportedStore?: boolean;
    }
  ) => {
    const selectedProducts = (giftPlan.selectedProducts || []).map((product) =>
      product.id === productId
        ? {
            ...product,
            price:
              purchaseData?.price !== undefined ? purchaseData.price : product.price,
            isPurchased: true,
            purchasedAt: product.purchasedAt || new Date().toISOString(),
            purchasedStoreName:
              purchaseData?.storeName || product.purchasedStoreName || product.storeName,
            purchasePrice:
              purchaseData?.price !== undefined ? purchaseData.price : product.price,
            purchaseImageUrl:
              purchaseData?.imageUrl || product.purchaseImageUrl || product.imageUrl,
            imageUrl: purchaseData?.imageUrl || product.imageUrl,
            purchasedFromImportedStore: Boolean(purchaseData?.fromImportedStore),
          }
        : product
    );

    await saveSelectedProducts(giftPlan, selectedProducts);
  };

  const unmarkProductAsPurchased = async (
    giftPlan: GiftPlan,
    productId: string
  ) => {
    const selectedProducts = (giftPlan.selectedProducts || []).map((product) =>
      product.id === productId
        ? {
            ...product,
            isPurchased: false,
            purchasedAt: '',
            purchasedStoreName: '',
            purchasePrice: undefined,
            purchaseImageUrl: '',
            purchasedFromImportedStore: false,
          }
        : product
    );

    await saveSelectedProducts(giftPlan, selectedProducts);
  };

  const openOtherStoreModal = (mode: 'other' | 'manual' = 'other') => {
    setOtherStoreMode(mode);
    setOtherStoreName('');
    setOtherStorePrice('');
    setOtherStoreImageUri('');
    setOtherStoreImageFile(null);
    setOtherStoreError('');
    setOtherStoreModalVisible(true);
  };

  const closeOtherStoreModal = () => {
    if (savingGiftProducts) return;

    setOtherStoreModalVisible(false);
    setOtherStoreMode('other');
    setOtherStoreName('');
    setOtherStorePrice('');
    setOtherStoreImageUri('');
    setOtherStoreImageFile(null);
    setOtherStoreError('');
  };

  const pickOtherStoreImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.75,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setOtherStoreImageUri(asset.uri);
      setOtherStoreImageFile((asset as any).file ?? null);
      setOtherStoreError('');
    }
  };

  const markProductAsPurchasedFromOtherStore = async (
    giftPlan: GiftPlan,
    productId: string
  ) => {
    const targetProduct = (giftPlan.selectedProducts || []).find(
      (product) => product.id === productId
    );
    const isManualPurchase = otherStoreMode === 'manual';
    const hasCustomPrice = otherStorePrice.trim().length > 0;
    const price = hasCustomPrice
      ? Number(otherStorePrice)
      : targetProduct?.price ?? 0;

    if (!isManualPurchase && !otherStoreName.trim()) {
      setOtherStoreError('Introdu numele magazinului.');
      return;
    }

    if (!isManualPurchase && !hasCustomPrice) {
      setOtherStoreError('Introdu suma platita.');
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      setOtherStoreError('Introdu suma platita.');
      return;
    }

    let imageUrl = '';

    if (otherStoreImageUri && token) {
      try {
        imageUrl = await uploadImageApi(
          {
            uri: otherStoreImageUri,
            file: otherStoreImageFile,
          },
          token
        );
      } catch {
        setOtherStoreError('Nu am putut incarca imaginea. Incearca din nou.');
        return;
      }
    }

    await markProductAsPurchased(giftPlan, productId, {
      storeName:
        otherStoreName.trim() ||
        targetProduct?.purchasedStoreName ||
        targetProduct?.storeName ||
        'Adaugat manual',
      price,
      ...(imageUrl ? { imageUrl } : {}),
      fromImportedStore: false,
    });
    closeOtherStoreModal();
  };

  const openBudgetModal = (giftPlan: GiftPlan) => {
    if (!canModifyGiftPlan(giftPlan)) return;

    setBudgetInput(String(giftPlan.budget));
    setBudgetError('');
    setBudgetModalVisible(true);
  };

  const closeBudgetModal = () => {
    if (savingGiftProducts) return;

    setBudgetModalVisible(false);
    setBudgetInput('');
    setBudgetError('');
  };

  const saveManualBudgetValue = async (giftPlan: GiftPlan, nextBudget: number) => {
    const saved = await saveSelectedProducts(
      giftPlan,
      giftPlan.selectedProducts || [],
      nextBudget,
      'manual'
    );

    if (saved) {
      closeBudgetModal();
    } else {
      setBudgetError('Nu am putut salva bugetul.');
    }
  };

  const saveGiftBudget = async (giftPlan: GiftPlan) => {
    const nextBudget = Number(budgetInput);
    const currentProductsTotal = getGiftPlanProductsTotal(giftPlan);

    if (!Number.isFinite(nextBudget) || nextBudget <= 0) {
      setBudgetError('Introdu un buget valid.');
      return;
    }

    if (nextBudget < currentProductsTotal) {
      setPendingManualBudget(nextBudget);
      setBudgetDecreaseConfirmVisible(true);
      return;
    }

    await saveManualBudgetValue(giftPlan, nextBudget);
  };

  const closeBudgetDecreaseConfirm = () => {
    if (savingGiftProducts) return;

    setBudgetDecreaseConfirmVisible(false);
    setPendingManualBudget(null);
  };

  const confirmBudgetDecrease = async (giftPlan: GiftPlan) => {
    if (pendingManualBudget === null) return;

    await saveManualBudgetValue(giftPlan, pendingManualBudget);
    closeBudgetDecreaseConfirm();
  };

  const getGiftPlanProductsTotal = (giftPlan: GiftPlan) => {
    return (giftPlan.selectedProducts || []).reduce(
      (sum, product) => sum + product.price,
      0
    );
  };

  const getAiHelpBudget = (giftPlan: GiftPlan, keepExistingProducts: boolean) => {
    if (!keepExistingProducts) {
      return giftPlan.budget;
    }

    return Math.max(0, giftPlan.budget - getGiftPlanProductsTotal(giftPlan));
  };

  const openAiHelpModal = (giftPlan: GiftPlan) => {
    const hasSelectedProducts = (giftPlan.selectedProducts || []).length > 0;

    setAiPersonDescription(data?.notes || '');
    setAiKeepExistingProducts(hasSelectedProducts);
    setAiBudget(String(getAiHelpBudget(giftPlan, hasSelectedProducts)));
    setAiProductCount('0');
    setAiHelpError('');
    setAiPromptInput('');
    setAiHelpModalVisible(true);
  };

  const closeAiHelpModal = () => {
    setAiHelpModalVisible(false);
    setAiHelpError('');
    setAiPromptInput('');
  };

  const setAiKeepExistingChoice = (
    giftPlan: GiftPlan,
    keepExistingProducts: boolean
  ) => {
    setAiKeepExistingProducts(keepExistingProducts);
    setAiBudget(String(getAiHelpBudget(giftPlan, keepExistingProducts)));
    setAiPromptInput('');
    setAiHelpError('');
  };

  const getChangeProductBudget = (
    giftPlan: GiftPlan,
    productToChange: GiftPlanProduct
  ) => {
    const usedBudgetWithoutProduct = (giftPlan.selectedProducts || [])
      .filter((product) => product.id !== productToChange.id)
      .reduce((sum, product) => sum + product.price, 0);

    return Math.max(0, giftPlan.budget - usedBudgetWithoutProduct);
  };

  const openChangeProductOptions = (product: GiftPlanProduct) => {
    if (product.isPurchased) {
      setProductError('Produsul cumparat nu mai poate fi schimbat.');
      return;
    }

    setChangeProduct(product);
    setChangeProductSearch('');
    setChangeProductAiPromptInput('');
    setProductError('');
    setChangeProductModeVisible(true);
  };

  const closeChangeProductFlow = () => {
    setChangeProduct(null);
    setChangeProductModeVisible(false);
    setChangeProductManualVisible(false);
    setChangeProductAiVisible(false);
    setChangeProductSearch('');
    setChangeProductAiPromptInput('');
    setManualProductName('');
    setManualProductPrice('');
    setManualProductError('');
  };

  const openManualChange = () => {
    setChangeProductModeVisible(false);
    setManualProductName(changeProduct?.name || '');
    setManualProductPrice('');
    setManualProductError('');
    setChangeProductManualVisible(true);
  };

  const openAiChange = (giftPlan: GiftPlan) => {
    if (!changeProduct) return;

    setChangeProductModeVisible(false);
    setChangeProductAiDescription(data?.notes || '');
    setChangeProductAiBudget(String(getChangeProductBudget(giftPlan, changeProduct)));
    setChangeProductAiPromptInput('');
    setChangeProductAiVisible(true);
  };

  const buildAiHelpInput = (giftPlan: GiftPlan) => {
    const budgetValue = Number(aiBudget);
    const productCountValue = Number(aiProductCount);
    const selectedProducts = giftPlan.selectedProducts || [];
    const keptProducts = aiKeepExistingProducts ? selectedProducts : [];
    const excludedProducts = keptProducts
      .map((product) => product.name)
      .filter(Boolean)
      .join(', ');
    const availableProductsCount = partnerStores.reduce(
      (total, store) => total + store.products.length,
      0
    );

    if (!Number.isFinite(productCountValue) || productCountValue < 1) {
      setAiHelpError('Alege cel putin un produs pentru cautarea AI.');
      setAiPromptInput('');
      return;
    }

    setAiHelpError('');
    setAiPromptInput(
      [
        'Cauta sugestii de cadouri folosind produsele disponibile in magazinele partenere.',
        `Persoana draga: ${data?.name || '-'}.`,
        `Varsta estimata: ${data?.estimatedAgeRange || '-'}.`,
        `Gen: ${
          data?.gender === 'male'
            ? 'Masculin'
            : data?.gender === 'female'
            ? 'Feminin'
            : '-'
        }.`,
        `Zodie: ${zodiac}.`,
        `Descriere persoana: ${aiPersonDescription.trim() || '-'}.`,
        `Scopul cadoului: ${giftPlan.purpose}.`,
        `Deadline cadou: ${formatDate(giftPlan.deadlineDate)}.`,
        `Buget maxim: ${
          aiBudget.trim() !== '' && Number.isFinite(budgetValue) && budgetValue >= 0
            ? `${budgetValue} RON`
            : `${getAiHelpBudget(giftPlan, aiKeepExistingProducts)} RON`
        }.`,
        `Numar produse dorite: ${productCountValue}.`,
        `Pastreaza produsele deja adaugate: ${
          aiKeepExistingProducts ? 'Da' : 'Nu'
        }.`,
        `Produse deja adaugate si excluse din cautare: ${
          excludedProducts || '-'
        }.`,
        `Magazine partenere disponibile: ${partnerStores.length}.`,
        `Produse disponibile in catalog: ${availableProductsCount}.`,
        'Returneaza produse potrivite, argumente scurte si respecta bugetul.',
      ].join('\n')
    );
  };

  const buildChangeProductAiInput = (giftPlan: GiftPlan) => {
    if (!changeProduct) return;

    const budgetValue = Number(changeProductAiBudget);
    const availableProductsCount = partnerStores.reduce(
      (total, store) => total + store.products.length,
      0
    );
    const excludedProducts = (giftPlan.selectedProducts || [])
      .map((product) => product.name)
      .filter(Boolean)
      .join(', ');

    setChangeProductAiPromptInput(
      [
        'Cauta un singur produs inlocuitor folosind produsele disponibile in magazinele partenere.',
        `Persoana draga: ${data?.name || '-'}.`,
        `Varsta estimata: ${data?.estimatedAgeRange || '-'}.`,
        `Gen: ${
          data?.gender === 'male'
            ? 'Masculin'
            : data?.gender === 'female'
            ? 'Feminin'
            : '-'
        }.`,
        `Zodie: ${zodiac}.`,
        `Descriere persoana: ${changeProductAiDescription.trim() || '-'}.`,
        `Scopul cadoului: ${giftPlan.purpose}.`,
        `Deadline cadou: ${formatDate(giftPlan.deadlineDate)}.`,
        `Produs de schimbat: ${changeProduct.name}${
          changeProduct.brand ? ` - ${changeProduct.brand}` : ''
        }, ${formatMoney(changeProduct.price, changeProduct.currency)}.`,
        `Buget maxim pentru inlocuire: ${
          changeProductAiBudget.trim() !== '' &&
          Number.isFinite(budgetValue) &&
          budgetValue >= 0
            ? `${budgetValue} RON`
            : `${getChangeProductBudget(giftPlan, changeProduct)} RON`
        }.`,
        'Numar produse dorite: 1.',
        `Produse excluse pentru ca sunt deja in lista: ${excludedProducts || '-'}.`,
        `Magazine partenere disponibile: ${partnerStores.length}.`,
        `Produse disponibile in catalog: ${availableProductsCount}.`,
        'Returneaza exact un produs potrivit, cu motiv scurt si respecta bugetul.',
      ].join('\n')
    );
  };

  const stopPressPropagation = (event: GestureResponderEvent) => {
    event.stopPropagation();
  };

  const requestDeleteGiftPlan = (giftPlan: GiftPlan) => {
    if (!token || !giftPlan.canModify) return;

    setGiftPlanToDelete(giftPlan);
    setDeleteError('');
    setDeleteModalVisible(true);
  };

  const closeDeleteModal = () => {
    if (deletingGift) return;

    setDeleteModalVisible(false);
    setGiftPlanToDelete(null);
    setDeleteError('');
  };

  const closeTopModal = () => {
    if (savingGiftProducts || deletingGift || deletingLovedOne) return;

    if (otherStoreModalVisible) {
      closeOtherStoreModal();
      return;
    }

    if (addedProductToast) {
      setAddedProductToast(null);
      return;
    }

    if (historyToastVisible) {
      setHistoryToastVisible(false);
      return;
    }

    if (completeIncompleteProductsConfirmVisible) {
      setCompleteIncompleteProductsConfirmVisible(false);
      return;
    }

    if (completeModalVisible) {
      closeCompleteModal();
      return;
    }

    if (offerModalVisible) {
      setOfferModalVisible(false);
      return;
    }

    if (emptyGiftGuideVisible) {
      setEmptyGiftGuideVisible(false);
      return;
    }

    if (budgetDecreaseConfirmVisible) {
      setBudgetDecreaseConfirmVisible(false);
      return;
    }

    if (budgetIncreaseModalVisible) {
      closeBudgetIncreaseModal();
      return;
    }

    if (budgetHistoryVisible) {
      setBudgetHistoryVisible(false);
      return;
    }

    if (budgetModalVisible) {
      closeBudgetModal();
      return;
    }

    if (duplicateProductModalVisible) {
      clearDuplicateProductModal();
      return;
    }

    if (deadlineModalVisible) {
      closeDeadlineEditModal();
      return;
    }

    if (removeProductConfirmVisible) {
      setRemoveProductConfirmVisible(false);
      return;
    }

    if (changeProductAiVisible || changeProductManualVisible || changeProductModeVisible) {
      closeChangeProductFlow();
      return;
    }

    if (aiHelpModalVisible) {
      closeAiHelpModal();
      return;
    }

    if (deleteLovedOneVisible) {
      closeDeleteLovedOneModal();
      return;
    }

    if (deleteModalVisible) {
      closeDeleteModal();
      return;
    }

    if (giftModalVisible) {
      closeGiftModal();
    }
  };

  const confirmDeleteGiftPlan = async () => {
    if (!token || !giftPlanToDelete) return;

    try {
      setDeletingGift(true);
      await deleteGiftPlan(token, lovedOneId, giftPlanToDelete.id);
      setGiftPlans((current) =>
        current.filter((giftPlan) => giftPlan.id !== giftPlanToDelete.id)
      );
      invalidateCalendarCache();
      await loadGiftPlans();
      setDeleteModalVisible(false);
      setGiftPlanToDelete(null);
      setDeleteError('');
    } catch (error: any) {
      setDeleteError(error?.message || 'Nu am putut sterge cadoul.');
    } finally {
      setDeletingGift(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Se încarcă...</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Text>Persoana nu a fost găsită.</Text>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Înapoi</Text>
        </Pressable>
      </View>
    );
  }

  const zodiac = getZodiac(data.day, data.month);
  const visibleSelectedGiftPlan = selectedGiftPlan
    ? giftPlans.find((giftPlan) => giftPlan.id === selectedGiftPlan.id) ||
      selectedGiftPlan
    : null;
  const selectedGiftProducts = visibleSelectedGiftPlan?.selectedProducts || [];
  const allProductOffers = partnerStores.flatMap((store) =>
    store.products
      .map((product, index) => toProductSuggestion(store, product, index))
      .filter((product): product is ProductSuggestion => Boolean(product))
  );
  const selectedGiftProductKeys = new Set(
    selectedGiftProducts.map((product) => getProductIdentityKey(product))
  );
  const productSearchQuery = productSearch.trim().toLowerCase();
  const productSuggestionsByKey = new Map<string, ProductSuggestion>();

  allProductOffers
    .filter((product) => !selectedGiftProductKeys.has(getProductIdentityKey(product)))
    .filter((product) => {
      if (!productSearchQuery) return true;
      return product.searchText.includes(productSearchQuery);
    })
    .forEach((product) => {
      const productKey = getProductIdentityKey(product);
      const existing = productSuggestionsByKey.get(productKey);
      const offerCount = (existing?.offerCount || 0) + 1;
      const bestOffer = !existing || product.price < existing.price ? product : existing;

      productSuggestionsByKey.set(productKey, {
        ...bestOffer,
        offerCount,
      });
    });

  const productSuggestions = Array.from(productSuggestionsByKey.values())
    .sort((a, b) => a.price - b.price)
    .slice(0, 12);
  const changeProductSearchQuery = changeProductSearch.trim().toLowerCase();
  const changeProductSuggestionsByKey = new Map<string, ProductSuggestion>();

  allProductOffers
    .filter((product) => !selectedGiftProductKeys.has(getProductIdentityKey(product)))
    .filter((product) => {
      if (!changeProductSearchQuery) return true;
      return product.searchText.includes(changeProductSearchQuery);
    })
    .forEach((product) => {
      const productKey = getProductIdentityKey(product);
      const existing = changeProductSuggestionsByKey.get(productKey);
      const offerCount = (existing?.offerCount || 0) + 1;
      const bestOffer = !existing || product.price < existing.price ? product : existing;

      changeProductSuggestionsByKey.set(productKey, {
        ...bestOffer,
        offerCount,
      });
    });

  const changeProductSuggestions = Array.from(changeProductSuggestionsByKey.values())
    .sort((a, b) => a.price - b.price)
    .slice(0, 12);
  const selectedGiftProductsTotal = selectedGiftProducts.reduce(
    (sum, product) => sum + product.price,
    0
  );
  const selectedGiftBudgetHistory =
    visibleSelectedGiftPlan?.budgetHistory &&
    visibleSelectedGiftPlan.budgetHistory.length > 0
      ? visibleSelectedGiftPlan.budgetHistory
      : visibleSelectedGiftPlan
      ? [
          {
            value: visibleSelectedGiftPlan.budget,
            changedAt: visibleSelectedGiftPlan.createdAt || new Date().toISOString(),
            reason: 'initial',
          },
        ]
      : [];
  const budgetHistoryValues = selectedGiftBudgetHistory.map((entry) => entry.value);
  const budgetHistoryMin =
    budgetHistoryValues.length > 0 ? Math.min(...budgetHistoryValues) : 0;
  const budgetHistoryMax =
    budgetHistoryValues.length > 0 ? Math.max(...budgetHistoryValues) : 0;
  const budgetHistoryRange = Math.max(1, budgetHistoryMax - budgetHistoryMin);
  const budgetChartPoints = selectedGiftBudgetHistory.map((entry, index) => {
    const normalized =
      budgetHistoryValues.length <= 1
        ? 0.5
        : (entry.value - budgetHistoryMin) / budgetHistoryRange;
    const x =
      budgetHistoryValues.length <= 1
        ? BUDGET_CHART_PLOT_WIDTH / 2
        : BUDGET_CHART_PLOT_PADDING +
          (index / (budgetHistoryValues.length - 1)) *
            (BUDGET_CHART_PLOT_WIDTH - BUDGET_CHART_PLOT_PADDING * 2);
    const y =
      BUDGET_CHART_PLOT_PADDING +
      (1 - normalized) *
        (BUDGET_CHART_PLOT_HEIGHT - BUDGET_CHART_PLOT_PADDING * 2);
    const label = formatChartMonth(entry.changedAt);

    return {
      ...entry,
      x,
      y,
      label,
    };
  });
  const budgetChartSegments = budgetChartPoints.slice(0, -1).map((point, index) => {
    const nextPoint = budgetChartPoints[index + 1];
    const dx = nextPoint.x - point.x;
    const dy = nextPoint.y - point.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    return {
      key: `${point.changedAt}-${nextPoint.changedAt}-${index}`,
      left: point.x + dx / 2 - length / 2,
      top: point.y + dy / 2 - 2,
      width: length,
      angle,
    };
  });
  const selectedGiftCurrency = selectedGiftProducts[0]?.currency || 'RON';
  const isSelectedGiftOverBudget = visibleSelectedGiftPlan
    ? selectedGiftProductsTotal > visibleSelectedGiftPlan.budget
    : false;
  const selectedProductDetail = selectedProductDetailId
    ? selectedGiftProducts.find((product) => product.id === selectedProductDetailId) ||
      null
    : null;
  const selectedProductsPreviousUsage = visibleSelectedGiftPlan
    ? selectedGiftProducts
        .map((product) => {
          const productKey = getProductIdentityKey(product);
          const usedInPlans = giftPlans
            .filter((giftPlan) => giftPlan.id !== visibleSelectedGiftPlan.id)
            .filter((giftPlan) =>
              (giftPlan.selectedProducts || []).some(
                (giftProduct) => getProductIdentityKey(giftProduct) === productKey
              )
            );

          return {
            product,
            usedInPlans,
          };
        })
        .filter((entry) => entry.usedInPlans.length > 0)
    : [];

  if (visibleSelectedGiftPlan && selectedProductDetail) {
    const isManualProduct = selectedProductDetail.storeId === 'manual';
    const selectedProductKey = getProductIdentityKey(selectedProductDetail);
    const productDetailOffers = allProductOffers
      .filter((offer) => getProductIdentityKey(offer) === selectedProductKey)
      .sort((a, b) => a.price - b.price);
    const displayedProductOffers =
      productDetailOffers.length > 0
        ? productDetailOffers
        : [
            {
              ...selectedProductDetail,
              searchText: '',
            } as ProductSuggestion,
          ];

    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable
          style={styles.backButton}
          onPress={goBackFromProductDetail}
        >
          <Text style={styles.backButtonText}>Inapoi la cadou</Text>
        </Pressable>

        <View style={styles.card}>
          <View style={styles.productDetailHeader}>
            {!!selectedProductDetail.imageUrl && (
              <Image
                source={{ uri: selectedProductDetail.imageUrl }}
                style={styles.productDetailImage}
              />
            )}
            <View style={styles.productInfo}>
              <Text style={styles.sectionTitle}>{selectedProductDetail.name}</Text>
              <Text style={styles.info}>
                Magazin: {selectedProductDetail.storeName}
              </Text>
              {!!selectedProductDetail.brand && (
                <Text style={styles.info}>Brand: {selectedProductDetail.brand}</Text>
              )}
              {!!selectedProductDetail.category && (
                <Text style={styles.info}>
                  Categorie: {selectedProductDetail.category}
                  {selectedProductDetail.subcategory
                    ? ` - ${selectedProductDetail.subcategory}`
                    : ''}
                </Text>
              )}
              {selectedProductDetail.isPurchased && (
                <Text style={styles.purchasedBadge}>Cumparat</Text>
              )}
            </View>
          </View>

          <View style={styles.priceDetailsBox}>
            <Text style={styles.productSectionTitle}>Magazine si preturi</Text>

            {displayedProductOffers.map((offer, index) => {
              const originalPrice = offer.originalPrice || offer.price;
              const storePrice = offer.priceBeforePromo || offer.price;
              const discount = offer.discount || 0;
              const discountPercent = offer.discountPercent || 0;
              const promoDiscount = offer.promoDiscount || 0;
              const promoDiscountPercent = offer.promoDiscountPercent || 0;
              const hasPromoCode = Boolean(
                offer.hasPromoCode && offer.promoCode && promoDiscount > 0
              );
              const hasDiscount =
                Boolean(offer.hasDiscount) && originalPrice > offer.price;
              const isBestOffer = index === 0;
              const isFreshPriceChange =
                priceAlertHighlightActive &&
                !!activePriceAlert &&
                activePriceAlert.storeId === offer.storeId &&
                getProductIdentityKey(offer) === activePriceAlert.productKey;
              const priceChangeDirectionText =
                activePriceAlert?.changeDirection === 'up'
                  ? 'Pret crescut'
                  : activePriceAlert?.changeDirection === 'down'
                    ? 'Pret scazut'
                    : 'Pret modificat';

              return (
                <View
                  key={`${offer.storeId}-${offer.id}`}
                  style={[
                    styles.offerCard,
                    isBestOffer && styles.bestOfferCard,
                    isFreshPriceChange && styles.freshPriceDropCard,
                  ]}
                >
                  <View style={styles.offerHeader}>
                    <View style={styles.productInfo}>
                      <Text style={styles.offerStoreName}>{offer.storeName}</Text>
                      {isFreshPriceChange && (
                        <Text style={styles.freshPriceDropBadge}>
                          Pret modificat la acest magazin
                        </Text>
                      )}
                      {isBestOffer && (
                        <Text style={styles.bestOfferBadge}>
                          Cel mai mic pret efectiv
                        </Text>
                      )}
                      {hasPromoCode && (
                        <Text style={styles.promoBadge}>
                          Cu cod {offer.promoCode}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.reducedPriceDetail}>
                      {formatMoney(offer.price, offer.currency)}
                    </Text>
                  </View>
                  {hasPromoCode && (
                    <View style={styles.priceDetailRow}>
                      <Text style={styles.priceDetailLabel}>Pret in magazin</Text>
                      <Text style={styles.priceDetailValue}>
                        {formatMoney(storePrice, offer.currency)}
                      </Text>
                    </View>
                  )}
                  {isFreshPriceChange && (
                    <Text style={styles.freshPriceDropText}>
                      {priceChangeDirectionText}: de la{' '}
                      {formatMoney(activePriceAlert.oldPrice, offer.currency)} la{' '}
                      {formatMoney(offer.price, offer.currency)} pentru
                      acest magazin.
                    </Text>
                  )}

                  <View style={styles.priceDetailRow}>
                    <Text style={styles.priceDetailLabel}>Pret original</Text>
                    <Text style={styles.priceDetailValue}>
                      {formatMoney(originalPrice, offer.currency)}
                    </Text>
                  </View>
                  <View style={styles.priceDetailRow}>
                    <Text style={styles.priceDetailLabel}>Reducere</Text>
                    <Text style={styles.priceDetailValue}>
                      {formatMoney(discount, offer.currency)}
                      {discountPercent > 0 ? ` (${discountPercent}%)` : ''}
                    </Text>
                  </View>
                  {hasPromoCode && (
                    <>
                      <View style={styles.priceDetailRow}>
                        <Text style={styles.priceDetailLabel}>Reducere cod</Text>
                        <Text style={styles.priceDetailValue}>
                          {formatMoney(promoDiscount, offer.currency)}
                          {promoDiscountPercent > 0
                            ? ` (${promoDiscountPercent}%)`
                            : ''}
                        </Text>
                      </View>
                      <Text style={styles.productMeta}>
                        Codul {offer.promoCode} trebuie introdus pe site pentru pretul final.
                      </Text>
                      {!!offer.promoNote && (
                        <Text style={styles.productMeta}>{offer.promoNote}</Text>
                      )}
                    </>
                  )}
                  {!hasDiscount && !hasPromoCode && (
                    <Text style={styles.productMeta}>
                      Produsul nu are reducere notata in import.
                    </Text>
                  )}

                  {!isManualProduct && (
                    <Pressable
                      style={[
                        styles.offerLinkButton,
                        !offer.affiliateUrl &&
                          !offer.productUrl &&
                          styles.disabledButton,
                      ]}
                      onPress={() =>
                        openProductLink(offer.affiliateUrl, offer.productUrl)
                      }
                      disabled={!offer.affiliateUrl && !offer.productUrl}
                    >
                      <Text style={styles.saveGiftButtonText}>
                        Mergi la magazin
                      </Text>
                    </Pressable>
                  )}
                  {!selectedProductDetail.isPurchased &&
                    visibleSelectedGiftPlan.status === 'planned' && (
                    <Pressable
                      style={[
                        styles.purchasedButton,
                        styles.offerPurchaseButton,
                        savingGiftProducts && styles.disabledButton,
                      ]}
                      onPress={() =>
                        isManualProduct
                          ? openOtherStoreModal('manual')
                          : markProductAsPurchased(
                              visibleSelectedGiftPlan,
                              selectedProductDetail.id,
                              {
                                storeName: offer.storeName,
                                price: offer.price,
                                fromImportedStore: true,
                              }
                            )
                      }
                      disabled={savingGiftProducts}
                    >
                      <Text style={styles.purchasedButtonText}>
                        {isManualProduct
                          ? 'Marcheaza ca fiind cumparat'
                          : `Achizitionat de pe ${offer.storeName}`}
                      </Text>
                    </Pressable>
                  )}
                </View>
              );
            })}

            {selectedProductDetail.isPurchased ? (
              <View style={styles.purchasedDetailBox}>
                <Text style={styles.purchasedDetailTitle}>
                  Produs cumparat
                </Text>
                <Text style={styles.productMeta}>
                  Achizitionat de pe{' '}
                  {selectedProductDetail.purchasedStoreName ||
                    selectedProductDetail.storeName}
                  {selectedProductDetail.purchasePrice !== undefined
                    ? ` cu ${formatMoney(
                        selectedProductDetail.purchasePrice,
                        selectedProductDetail.currency
                      )}`
                    : ''}.
                </Text>
                {!!selectedProductDetail.purchaseImageUrl && (
                  <Image
                    source={{ uri: selectedProductDetail.purchaseImageUrl }}
                    style={styles.purchasePreviewImage}
                  />
                )}
                {visibleSelectedGiftPlan.status === 'planned' && (
                  <Pressable
                    style={[styles.changeProductButton, styles.productDetailAction]}
                    onPress={() =>
                      unmarkProductAsPurchased(
                        visibleSelectedGiftPlan,
                        selectedProductDetail.id
                      )
                    }
                    disabled={savingGiftProducts}
                  >
                    <Text style={styles.changeProductButtonText}>
                      Scoate din stadiul cumparat
                    </Text>
                  </Pressable>
                )}
              </View>
            ) : visibleSelectedGiftPlan.status === 'planned' && !isManualProduct ? (
              <Pressable
                style={[
                  styles.changeProductButton,
                  styles.productDetailAction,
                  savingGiftProducts && styles.disabledButton,
                ]}
                onPress={() => openOtherStoreModal('other')}
                disabled={savingGiftProducts}
              >
                <Text style={styles.changeProductButtonText}>
                  Achizitionat de pe alt magazin
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <Modal
          visible={otherStoreModalVisible}
          animationType="fade"
          transparent
          onRequestClose={closeOtherStoreModal}
        >
          <View
            style={styles.modalOverlay}
            {...getModalBackdropResponder(closeTopModal)}
          >
            <View style={styles.confirmModalCard}>
              <Text style={styles.modalTitle}>
                {otherStoreMode === 'manual'
                  ? 'Marcheaza produsul cumparat'
                  : 'Alt magazin'}
              </Text>
              <Text style={styles.confirmText}>
                {otherStoreMode === 'manual'
                  ? 'Poti nota magazinul, pretul concret si o imagine. Toate sunt optionale.'
                  : 'Noteaza magazinul si suma cu care ai cumparat produsul. Poti adauga si o imagine optionala.'}
              </Text>
              {otherStoreMode === 'manual' && (
                <Text style={styles.productMeta}>
                  Daca nu completezi pretul, produsul ramane cumparat cu pretul
                  estimat initial:{' '}
                  {formatMoney(selectedProductDetail.price, selectedProductDetail.currency)}.
                </Text>
              )}

              {!!otherStoreError && (
                <Text style={styles.giftErrorText}>{otherStoreError}</Text>
              )}

              <Text style={styles.modalLabel}>
                Numele magazinului
                {otherStoreMode === 'manual' ? ' (optional)' : ''}
              </Text>
              <TextInput
                placeholder="Ex: Farmacia X, magazin local..."
                style={styles.modalInput}
                value={otherStoreName}
                onChangeText={(value) => {
                  setOtherStoreName(value);
                  setOtherStoreError('');
                }}
              />

              <Text style={styles.modalLabel}>
                Suma platita
                {otherStoreMode === 'manual' ? ' (optional)' : ''}
              </Text>
              <TextInput
                placeholder={
                  otherStoreMode === 'manual'
                    ? `Ex: ${selectedProductDetail.price}`
                    : 'Introdu suma'
                }
                style={styles.modalInput}
                keyboardType="numeric"
                value={otherStorePrice}
                onChangeText={(value) => {
                  setOtherStorePrice(value.replace(/[^0-9]/g, ''));
                  setOtherStoreError('');
                }}
              />

              <Text style={styles.modalLabel}>Imagine (optional)</Text>
              <Pressable
                style={styles.imageButton}
                onPress={pickOtherStoreImage}
              >
                <Text style={styles.imageButtonText}>
                  {otherStoreImageUri ? 'Schimba imaginea' : 'Alege imagine'}
                </Text>
              </Pressable>

              {!!otherStoreImageUri && (
                <Image
                  source={{ uri: otherStoreImageUri }}
                  style={styles.purchasePreviewImage}
                />
              )}

              <Pressable
                style={[styles.saveGiftButton, savingGiftProducts && styles.disabledButton]}
                onPress={() =>
                  markProductAsPurchasedFromOtherStore(
                    visibleSelectedGiftPlan,
                    selectedProductDetail.id
                  )
                }
                disabled={savingGiftProducts}
              >
                <Text style={styles.saveGiftButtonText}>
                  Salveaza cumpararea
                </Text>
              </Pressable>

              <Pressable style={styles.cancelGiftButton} onPress={closeOtherStoreModal}>
                <Text style={styles.cancelGiftButtonText}>Inchide</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </ScrollView>
    );
  }

  if (visibleSelectedGiftPlan) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable
          style={styles.backButton}
          onPress={goBackFromSelectedGiftPlan}
        >
          <Text style={styles.backButtonText}>{backLabel}</Text>
        </Pressable>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{visibleSelectedGiftPlan.purpose}</Text>
          <Text style={styles.info}>
            Cumpara pana la:{' '}
            {formatDate(
              visibleSelectedGiftPlan.purchaseDeadlineDate ||
                visibleSelectedGiftPlan.deadlineDate
            )}
          </Text>
          <Text style={styles.info}>
            Ofera pe: {formatDate(visibleSelectedGiftPlan.deadlineDate)}
          </Text>
          <Text style={styles.info}>
            Buget: {visibleSelectedGiftPlan.budget} RON
          </Text>
          <Text style={styles.info}>
            Status:{' '}
            {getGiftStatusLabel(visibleSelectedGiftPlan.status)}
          </Text>
          {visibleSelectedGiftPlan.status !== 'planned' && (
            <>
              <Text style={styles.info}>
                Cumparat la:{' '}
                {formatIsoDate(visibleSelectedGiftPlan.completedAt)}
              </Text>
              <Text style={styles.info}>
                {getPurchaseTimingLabel(visibleSelectedGiftPlan)}
              </Text>
            </>
          )}
          {visibleSelectedGiftPlan.status === 'completed' && (
            <>
              <Text style={styles.info}>
                Oferit la:{' '}
                {formatIsoDate(visibleSelectedGiftPlan.offeredAt)}
              </Text>
              <Text style={styles.info}>
                {getOfferTimingLabel(visibleSelectedGiftPlan)}
              </Text>
            </>
          )}
          {getGiftTimingNotes(visibleSelectedGiftPlan).map((note) => (
            <Text key={note} style={styles.expiredText}>
              {note}
            </Text>
          ))}

          {visibleSelectedGiftPlan.status === 'planned' && (
            <Pressable
              style={[
                styles.deadlineEditButton,
                !canModifyGiftPlan(visibleSelectedGiftPlan) && styles.disabledButton,
              ]}
              onPress={() => openDeadlineEditModal(visibleSelectedGiftPlan)}
              disabled={!canModifyGiftPlan(visibleSelectedGiftPlan)}
            >
              <Text style={styles.deadlineEditButtonText}>
                Editeaza deadline
              </Text>
            </Pressable>
          )}

          {visibleSelectedGiftPlan.status === 'completed' ? (
            <>
              <View style={styles.notesBox}>
                <Text style={styles.notesTitle}>Experienta</Text>
                <Text style={styles.historyDetails}>
                  Cumparat la:{' '}
                  {formatIsoDate(visibleSelectedGiftPlan.completedAt)}
                </Text>
                <Text style={styles.historyDetails}>
                  {getPurchaseTimingLabel(visibleSelectedGiftPlan)}
                </Text>
                <Text style={styles.historyDetails}>
                  Oferit la: {formatIsoDate(visibleSelectedGiftPlan.offeredAt)}
                </Text>
                <Text style={styles.historyDetails}>
                  {getOfferTimingLabel(visibleSelectedGiftPlan)}
                </Text>
                <Text style={styles.historyDetails}>
                  Perioada de finalizare cadou:{' '}
                  {getCompletionDays(visibleSelectedGiftPlan)}
                </Text>
                <Text style={styles.historyDetails}>
                  Zile ramase pana la ziua cadoului:{' '}
                  {getRemainingDaysUntilGift(visibleSelectedGiftPlan)}
                </Text>
                {!!visibleSelectedGiftPlan.experienceDetails && (
                  <Text style={styles.notesText}>
                    {visibleSelectedGiftPlan.experienceDetails}
                  </Text>
                )}
              </View>

              <View style={styles.notesBox}>
                <Text style={styles.notesTitle}>Lista de cumparaturi</Text>
                {selectedGiftProducts
                  .filter((product) => product.isPurchased)
                  .map((product) => {
                    const productReaction =
                      visibleSelectedGiftPlan.productReactions?.find(
                        (reaction) => reaction.productId === product.id
                      );

                    return (
                      <View key={product.id} style={styles.shoppingHistoryRow}>
                        <View style={styles.productInfo}>
                          <Text style={styles.productName}>{product.name}</Text>
                          <Text style={styles.productMeta}>
                            Magazin:{' '}
                            {product.purchasedStoreName || product.storeName}
                          </Text>
                          <Text style={styles.productMeta}>
                            Cumparat la:{' '}
                            {formatIsoDate(product.purchasedAt || '')}
                          </Text>
                          <Text style={styles.productMeta}>
                            Reactie:{' '}
                            {REACTION_OPTIONS.find(
                              (option) =>
                                option.value === productReaction?.reactionRating
                            )?.label || '-'}
                          </Text>
                          {!!productReaction?.details && (
                            <Text style={styles.notesText}>
                              {productReaction.details}
                            </Text>
                          )}
                        </View>
                        <Text style={styles.productPrice}>
                          {formatMoney(
                            product.purchasePrice ?? product.price,
                            product.currency
                          )}
                        </Text>
                      </View>
                    );
                  })}
              </View>
            </>
          ) : (
            <>
              <View style={styles.detailTabs}>
                <Pressable
                  style={[
                    styles.detailTab,
                    giftDetailTab === 'details' && styles.detailTabActive,
                  ]}
                  onPress={() => setGiftDetailTab('details')}
                >
                  <Text
                    style={[
                      styles.detailTabText,
                      giftDetailTab === 'details' && styles.detailTabTextActive,
                    ]}
                  >
                    Detalii
                  </Text>
                </Pressable>
                {visibleSelectedGiftPlan.status === 'planned' && (
                  <>
                    <Pressable
                      style={[
                        styles.detailTab,
                        giftDetailTab === 'products' && styles.detailTabActive,
                      ]}
                      onPress={() => setGiftDetailTab('products')}
                    >
                      <Text
                        style={[
                          styles.detailTabText,
                          giftDetailTab === 'products' && styles.detailTabTextActive,
                        ]}
                      >
                        Cauta produse
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.detailTab, styles.aiHelpTab]}
                      onPress={() => openAiHelpModal(visibleSelectedGiftPlan)}
                    >
                      <Text style={styles.aiHelpButtonText}>Ajutor AI</Text>
                    </Pressable>
                  </>
                )}
              </View>

              {giftDetailTab === 'products' && visibleSelectedGiftPlan.status === 'planned' ? (
                <View style={styles.productSearchBox}>
                  <Text style={styles.notesTitle}>Produse pentru cadou</Text>

                  <TextInput
                    placeholder="Cauta dupa nume, brand, categorie sau magazin"
                    style={styles.modalInput}
                    value={productSearch}
                    onChangeText={(value) => {
                      setProductSearch(value);
                      setProductError('');
                      setManualProductError('');
                      setManualProductName(value);
                    }}
                  />

                  {!!productError && (
                    <Text style={styles.giftErrorText}>{productError}</Text>
                  )}

                  {partnerStores.length === 0 ? (
                    <Text style={styles.emptyHistoryText}>
                      Nu exista produse importate momentan.
                    </Text>
                  ) : productSuggestions.length === 0 ? (
                    <View style={styles.manualProductBox}>
                      <Text style={styles.notesTitle}>
                        Nu am gasit produsul cautat
                      </Text>
                      <Text style={styles.productMeta}>
                        Il poti adauga manual in lista. Avem nevoie doar de ce
                        este si pretul estimat.
                      </Text>

                      {!!manualProductError && (
                        <Text style={styles.giftErrorText}>
                          {manualProductError}
                        </Text>
                      )}

                      <Text style={styles.modalLabel}>Ce vrei sa cumperi?</Text>
                      <TextInput
                        placeholder="Ex: esarfa rosie, carte, set cafea..."
                        style={styles.modalInput}
                        value={manualProductName}
                        onChangeText={(value) => {
                          setManualProductName(value);
                          setManualProductError('');
                        }}
                      />

                      <Text style={styles.modalLabel}>Pret estimat</Text>
                      <TextInput
                        placeholder="Ex: 120"
                        style={styles.modalInput}
                        keyboardType="numeric"
                        value={manualProductPrice}
                        onChangeText={(value) => {
                          setManualProductPrice(value.replace(/[^0-9]/g, ''));
                          setManualProductError('');
                        }}
                      />

                      <Pressable
                        style={[
                          styles.saveGiftButton,
                          savingGiftProducts && styles.disabledButton,
                        ]}
                        onPress={() => addManualProductToGift(visibleSelectedGiftPlan)}
                        disabled={savingGiftProducts}
                      >
                        <Text style={styles.saveGiftButtonText}>
                          Adauga manual in lista
                        </Text>
                      </Pressable>
                    </View>
                  ) : (
                    productSuggestions.map((product) => {
                      const isAlreadySelected = selectedGiftProducts.some(
                        (selectedProduct) => selectedProduct.id === product.id
                      );

                      return (
                        <View key={product.id} style={styles.productSuggestionRow}>
                          {!!product.imageUrl && (
                            <Image
                              source={{ uri: product.imageUrl }}
                              style={styles.productThumb}
                            />
                          )}
                          <View style={styles.productInfo}>
                            <Text style={styles.productName}>{product.name}</Text>
                            <Text style={styles.productMeta}>
                              {product.brand || product.category || 'Produs partener'}
                            </Text>
                            {(product.offerCount || 0) > 1 && (
                              <Text style={styles.productMeta}>
                                {product.offerCount} magazine disponibile
                              </Text>
                            )}
                            {!!product.promoCode && (
                              <Text style={styles.productMeta}>
                                Pret cu cod {product.promoCode}
                              </Text>
                            )}
                            {!!product.category && (
                              <Text style={styles.productMeta}>
                                {product.category}
                                {product.subcategory
                                  ? ` - ${product.subcategory}`
                                  : ''}
                              </Text>
                            )}
                          </View>
                          <View style={styles.productPriceBox}>
                            <Text style={styles.productPrice}>
                              {formatMoney(product.price, product.currency)}
                            </Text>
                            <Pressable
                              style={[
                                styles.addProductButton,
                                (savingGiftProducts || isAlreadySelected) &&
                                  styles.disabledButton,
                              ]}
                              onPress={() =>
                                addProductToGift(visibleSelectedGiftPlan, product)
                              }
                              disabled={savingGiftProducts || isAlreadySelected}
                            >
                              <Text style={styles.addProductButtonText}>
                                {isAlreadySelected ? 'Adaugat' : 'Adauga'}
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              ) : (
                <>
                  <View style={styles.detailsProductsBox}>
                    <Text style={styles.notesTitle}>Lista de cadouri</Text>

                    {selectedGiftProducts.length === 0 ? (
                      <Text style={styles.emptyHistoryText}>
                        Nu ai adaugat produse pe acest cadou.
                      </Text>
                    ) : (
                      <>
                        <View
                          style={[
                            styles.budgetCompareBox,
                            isSelectedGiftOverBudget &&
                              styles.budgetCompareBoxOver,
                          ]}
                        >
                          <Text style={styles.budgetCompareText}>
                            Total produse:{' '}
                            {formatMoney(
                              selectedGiftProductsTotal,
                              selectedGiftCurrency
                            )}
                          </Text>
                          <Text style={styles.budgetCompareText}>
                            Buget stabilit:{' '}
                            {formatMoney(visibleSelectedGiftPlan.budget)}
                          </Text>
                          {isSelectedGiftOverBudget ? (
                            <Text style={styles.budgetOverText}>
                              Buget depasit cu{' '}
                              {formatMoney(
                                selectedGiftProductsTotal -
                                  visibleSelectedGiftPlan.budget,
                                selectedGiftCurrency
                              )}
                            </Text>
                          ) : (
                            <Text style={styles.budgetOkText}>
                              Produsele se incadreaza in buget.
                            </Text>
                          )}
                        </View>

                        {visibleSelectedGiftPlan.status === 'planned' && (
                          <Pressable
                            style={[
                              styles.updateBudgetButton,
                              savingGiftProducts && styles.disabledButton,
                            ]}
                            onPress={() => openBudgetModal(visibleSelectedGiftPlan)}
                            disabled={savingGiftProducts}
                          >
                            <Text style={styles.updateBudgetButtonText}>
                              Modifica bugetul
                            </Text>
                          </Pressable>
                        )}

                        <Pressable
                          style={styles.budgetHistoryButton}
                          onPress={() => setBudgetHistoryVisible(true)}
                        >
                          <Text style={styles.budgetHistoryButtonText}>
                            Vezi istoricul bugetului
                          </Text>
                        </Pressable>

                        {selectedGiftProducts.map((product) => {
                          const isAlertProduct =
                            priceAlertHighlightActive &&
                            !!activePriceAlert &&
                            (!activePriceAlert.storeId || !product.storeId || activePriceAlert.storeId === product.storeId) &&
                            (product.id === activePriceAlert.productId ||
                              getProductIdentityKey(product) ===
                                activePriceAlert.productKey);

                          return (
                            <Pressable
                              key={product.id}
                              style={[
                                styles.selectedProductRow,
                                product.isPurchased && styles.purchasedProductRow,
                                isAlertProduct && styles.alertSelectedProductRow,
                              ]}
                              onPress={() => setSelectedProductDetailId(product.id)}
                            >
                              {!!product.imageUrl && (
                                <Image
                                  source={{ uri: product.imageUrl }}
                                  style={styles.productThumb}
                                />
                              )}
                              <View style={styles.productInfo}>
                                <Text style={styles.productName}>{product.name}</Text>
                                <Text style={styles.productMeta}>
                                  {product.brand || product.category || 'Produs adaugat'}
                                </Text>
                                {isAlertProduct && (
                                  <Text style={styles.alertProductHint}>
                                    Pret schimbat la {activePriceAlert.storeName}. Apasa pentru detalii.
                                  </Text>
                                )}
                                {product.isPurchased && (
                                  <Text style={styles.purchasedBadge}>
                                    Cumparat
                                  </Text>
                                )}
                              </View>
                              <View style={styles.productPriceBox}>
                                <Text style={styles.productPrice}>
                                  {formatMoney(product.price, product.currency)}
                                </Text>
                                {visibleSelectedGiftPlan.status !== 'planned' ? (
                                  <Text style={styles.lockedProductText}>
                                    {product.isPurchased
                                      ? 'Cumparat'
                                      : 'Neinclus in buget'}
                                  </Text>
                                ) : product.isPurchased ? (
                                  <Text style={styles.lockedProductText}>
                                    Ramane in lista
                                  </Text>
                                ) : (
                                  <>
                                    <Pressable
                                      style={[
                                        styles.changeProductButton,
                                        savingGiftProducts && styles.disabledButton,
                                      ]}
                                      onPress={(event) => {
                                        stopPressPropagation(event);
                                        openChangeProductOptions(product);
                                      }}
                                      disabled={savingGiftProducts}
                                    >
                                      <Text style={styles.changeProductButtonText}>
                                        Schimba produs
                                      </Text>
                                    </Pressable>
                                    <Pressable
                                      style={[
                                        styles.removeProductButton,
                                        savingGiftProducts && styles.disabledButton,
                                      ]}
                                      onPress={(event) => {
                                        stopPressPropagation(event);
                                        requestRemoveProductFromGift(product);
                                      }}
                                      disabled={savingGiftProducts}
                                    >
                                      <Text style={styles.removeProductText}>
                                        Scoate
                                      </Text>
                                    </Pressable>
                                  </>
                                )}
                              </View>
                            </Pressable>
                          );
                        })}
                      </>
                    )}
                  </View>

                  {visibleSelectedGiftPlan.status === 'purchased' ? (
                    <Pressable
                      style={styles.saveGiftButton}
                      onPress={openOfferModal}
                    >
                      <Text style={styles.saveGiftButtonText}>
                        Cadoul a fost oferit
                      </Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={[
                        styles.saveGiftButton,
                        !visibleSelectedGiftPlan.canModify && styles.disabledButton,
                      ]}
                      onPress={requestCompleteModal}
                      disabled={!visibleSelectedGiftPlan.canModify}
                    >
                      <Text style={styles.saveGiftButtonText}>
                        Marcheaza ca fiind cumparat
                      </Text>
                    </Pressable>
                  )}

                </>
              )}
            </>
          )}
        </View>

        <Modal
          visible={Boolean(addedProductToast)}
          animationType="fade"
          transparent
          onRequestClose={() => setAddedProductToast(null)}
        >
          <View
            style={styles.toastModalOverlay}
            {...getModalBackdropResponder(closeTopModal)}
          >
            {!!addedProductToast && (
              <View style={styles.addedProductToast}>
                <View style={styles.addedProductToastHeader}>
                  <View style={styles.addedProductSnapshot}>
                    {!!addedProductToast.imageUrl ? (
                      <Image
                        source={{ uri: addedProductToast.imageUrl }}
                        style={styles.addedProductToastImage}
                      />
                    ) : (
                      <View style={styles.addedProductToastImage} />
                    )}
                    <View style={styles.productInfo}>
                      <Text style={styles.addedProductToastTitle}>
                        Produs adaugat in lista
                      </Text>
                      <Text style={styles.productName}>
                        {addedProductToast.name}
                      </Text>
                      <Text style={styles.productMeta}>
                        {addedProductToast.storeName}
                        {addedProductToast.brand
                          ? ` - ${addedProductToast.brand}`
                          : ''}
                      </Text>
                      <Text style={styles.productMeta}>
                        L-ai adaugat in cadoul {visibleSelectedGiftPlan.purpose}.
                      </Text>
                      <Text style={styles.productMeta}>
                        Il poti vedea si gestiona in detaliile cadoului.
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    style={styles.toastCloseButton}
                    onPress={() => setAddedProductToast(null)}
                  >
                    <Text style={styles.toastCloseButtonText}>Inchide</Text>
                  </Pressable>
                </View>

                <View style={styles.addedProductToastFooter}>
                  <Pressable
                    style={styles.toastDetailsButton}
                    onPress={() => {
                      setGiftDetailTab('details');
                      setAddedProductToast(null);
                    }}
                  >
                    <Text style={styles.toastDetailsButtonText}>
                      Vezi detalii cadou
                    </Text>
                  </Pressable>
                  <Text style={styles.productPrice}>
                    {formatMoney(
                      addedProductToast.price,
                      addedProductToast.currency
                    )}
                  </Text>
                </View>

                <View style={styles.toastProgressTrack}>
                  <View
                    style={[
                      styles.toastProgressBar,
                      {
                        width: `${Math.round(
                          addedProductToastProgress * 100
                        )}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            )}
          </View>
        </Modal>

        <Modal
          visible={emptyGiftGuideVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setEmptyGiftGuideVisible(false)}
        >
          <View
            style={styles.modalOverlay}
            {...getModalBackdropResponder(closeTopModal)}
          >
            <View style={styles.confirmModalCard}>
              <Text style={styles.modalTitle}>Adauga mai intai un cadou</Text>
              <Text style={styles.confirmText}>
                Lista este goala, asa ca nu ai ce marca drept cumparat. Poti
                cauta manual produse din magazinele partenere sau poti porni
                Ajutor AI ca sa primesti un punct de plecare.
              </Text>

              <Pressable
                style={styles.saveGiftButton}
                onPress={() => {
                  setEmptyGiftGuideVisible(false);
                  setGiftDetailTab('products');
                }}
              >
                <Text style={styles.saveGiftButtonText}>
                  Cauta produse manual
                </Text>
              </Pressable>

              <Pressable
                style={styles.aiChangeButton}
                onPress={() => {
                  setEmptyGiftGuideVisible(false);
                  openAiHelpModal(visibleSelectedGiftPlan);
                }}
              >
                <Text style={styles.saveGiftButtonText}>
                  Cauta cu Ajutor AI
                </Text>
              </Pressable>

              <Pressable
                style={styles.cancelGiftButton}
                onPress={() => setEmptyGiftGuideVisible(false)}
              >
                <Text style={styles.cancelGiftButtonText}>Inchide</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal
          visible={historyToastVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setHistoryToastVisible(false)}
        >
          <View
            style={styles.toastModalOverlay}
            {...getModalBackdropResponder(closeTopModal)}
          >
            <View style={styles.addedProductToast}>
              <Text style={styles.addedProductToastTitle}>
                Cadoul a fost mutat in istoric
              </Text>
              <Text style={styles.productMeta}>
                Il poti vedea din butonul Istoric cadouri de pe pagina persoanei
                dragi.
              </Text>
              <Pressable
                style={styles.toastDetailsButton}
                onPress={() => setHistoryToastVisible(false)}
              >
                <Text style={styles.toastDetailsButtonText}>Am inteles</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal
          visible={completeModalVisible}
          animationType="slide"
          transparent
          onRequestClose={closeCompleteModal}
        >
          <View
            style={styles.modalOverlay}
            {...getModalBackdropResponder(closeTopModal)}
          >
            <View style={styles.giftModalCard}>
              <View style={styles.modalHandle} />

              <ScrollView contentContainerStyle={styles.giftModalBody}>
                <Text style={styles.modalTitle}>Marcheaza ca fiind cumparat</Text>

                {!!completeError && (
                  <Text style={styles.giftErrorText}>{completeError}</Text>
                )}

                <View style={styles.duplicateInfoBox}>
                  <Text style={styles.duplicateInfoTitle}>
                    Bugetul final se calculeaza din produsele cumparate
                  </Text>
                  <Text style={styles.duplicateInfoText}>
                    Produsele nemarcate ca fiind cumparate vor fi excluse din
                    lista, iar bugetul final va ramane suma produselor cumparate.
                  </Text>
                </View>

                <Text style={styles.modalLabel}>Cand ai cumparat cadoul?</Text>
                <View style={styles.aiChoiceRow}>
                  <Pressable
                    style={[
                      styles.aiChoiceButton,
                      purchaseDateMode === 'today' && styles.aiChoiceButtonActive,
                    ]}
                    onPress={() => {
                      setPurchaseDateMode('today');
                      setPurchaseDateToToday();
                      setCompleteError('');
                    }}
                  >
                    <Text
                      style={[
                        styles.aiChoiceButtonText,
                        purchaseDateMode === 'today' &&
                          styles.aiChoiceButtonTextActive,
                      ]}
                    >
                      Azi
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.aiChoiceButton,
                      purchaseDateMode === 'custom' && styles.aiChoiceButtonActive,
                    ]}
                    onPress={() => {
                      setPurchaseDateMode('custom');
                      setPurchaseDateToToday();
                      setCompleteError('');
                    }}
                  >
                    <Text
                      style={[
                        styles.aiChoiceButtonText,
                        purchaseDateMode === 'custom' &&
                          styles.aiChoiceButtonTextActive,
                      ]}
                    >
                      Alta zi
                    </Text>
                  </Pressable>
                </View>

                {purchaseDateMode === 'custom' && (
                  <View style={styles.dateRow}>
                    <View style={styles.dateDropdownWrapper}>
                      <Dropdown
                        style={styles.compactDropdown}
                        containerStyle={styles.dropdownContainer}
                        placeholderStyle={styles.dropdownPlaceholder}
                        selectedTextStyle={styles.dropdownSelectedText}
                        data={DAYS}
                        maxHeight={240}
                        labelField="label"
                        valueField="value"
                        placeholder="Zi"
                        value={purchaseDateDay}
                        onChange={(item) => {
                          setPurchaseDateDay(item.value);
                          setCompleteError('');
                        }}
                      />
                    </View>
                    <View style={styles.dateDropdownWrapper}>
                      <Dropdown
                        style={styles.compactDropdown}
                        containerStyle={styles.dropdownContainer}
                        placeholderStyle={styles.dropdownPlaceholder}
                        selectedTextStyle={styles.dropdownSelectedText}
                        data={MONTHS}
                        maxHeight={240}
                        labelField="label"
                        valueField="value"
                        placeholder="Luna"
                        value={purchaseDateMonth}
                        onChange={(item) => {
                          setPurchaseDateMonth(item.value);
                          setCompleteError('');
                        }}
                      />
                    </View>
                    <View style={styles.dateDropdownWrapper}>
                      <Dropdown
                        style={styles.compactDropdown}
                        containerStyle={styles.dropdownContainer}
                        placeholderStyle={styles.dropdownPlaceholder}
                        selectedTextStyle={styles.dropdownSelectedText}
                        data={actionYears}
                        maxHeight={240}
                        labelField="label"
                        valueField="value"
                        placeholder="An"
                        value={purchaseDateYear}
                        onChange={(item) => {
                          setPurchaseDateYear(item.value);
                          setCompleteError('');
                        }}
                      />
                    </View>
                  </View>
                )}

                <Text style={styles.modalLabel}>
                  Feedback despre cum te-a ajutat aplicatia
                </Text>
                <TextInput
                  placeholder="Optional: ce a mers bine, ce putea fi mai clar..."
                  style={[styles.modalInput, styles.modalTextArea]}
                  multiline
                  value={experienceDetails}
                  onChangeText={(value) => {
                    setExperienceDetails(value);
                    if (completeError) setCompleteError('');
                  }}
                />

                <Text style={styles.modalLabel}>Emoji feedback aplicatie</Text>
                <View style={styles.reactionRow}>
                  {REACTION_OPTIONS.map((option) => {
                    const selectedReaction = reactionRating === option.value;

                    return (
                      <Pressable
                        key={option.value}
                        style={[
                          styles.reactionButton,
                          selectedReaction && styles.reactionButtonSelected,
                        ]}
                        onPress={() => {
                          setReactionRating(option.value);
                          if (completeError) setCompleteError('');
                        }}
                      >
                        <Text
                          style={[
                            styles.reactionText,
                            selectedReaction && styles.reactionTextSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Pressable
                  style={[styles.saveGiftButton, completingGift && styles.disabledButton]}
                  onPress={markGiftAsCompleted}
                  disabled={completingGift}
                >
                  <Text style={styles.saveGiftButtonText}>
                    {completingGift ? 'Se salveaza...' : 'Cadoul este cumparat'}
                  </Text>
                </Pressable>

              <Pressable style={styles.cancelGiftButton} onPress={closeCompleteModal}>
                  <Text style={styles.cancelGiftButtonText}>Inchide</Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal
          visible={offerModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => {
            resetCompleteForm();
            setOfferModalVisible(false);
          }}
        >
          <View
            style={styles.modalOverlay}
            {...getModalBackdropResponder(closeTopModal)}
          >
            <View style={styles.giftModalCard}>
              <View style={styles.modalHandle} />

              <ScrollView contentContainerStyle={styles.giftModalBody}>
                <Text style={styles.modalTitle}>Cadoul a fost oferit</Text>

                {!!completeError && (
                  <Text style={styles.giftErrorText}>{completeError}</Text>
                )}

                {selectedProductsPreviousUsage.length > 0 && (
                  <View style={styles.duplicateInfoBox}>
                    <Text style={styles.duplicateInfoTitle}>
                      Produse folosite si in alte cadouri
                    </Text>
                    {selectedProductsPreviousUsage.map(({ product, usedInPlans }) => (
                      <Text key={product.id} style={styles.duplicateInfoText}>
                        {product.name} a fost in cadoul{' '}
                        {usedInPlans
                          .map(
                            (giftPlan) =>
                              `${giftPlan.purpose} din ${formatDate(
                                giftPlan.deadlineDate
                              )}`
                          )
                          .join(', ')}
                        .
                      </Text>
                    ))}
                  </View>
                )}

                <Text style={styles.modalLabel}>Cand ai oferit cadoul?</Text>
                <View style={styles.aiChoiceRow}>
                  <Pressable
                    style={[
                      styles.aiChoiceButton,
                      offerDateMode === 'today' && styles.aiChoiceButtonActive,
                    ]}
                    onPress={() => {
                      setOfferDateMode('today');
                      setOfferDateToToday();
                      setCompleteError('');
                    }}
                  >
                    <Text
                      style={[
                        styles.aiChoiceButtonText,
                        offerDateMode === 'today' &&
                          styles.aiChoiceButtonTextActive,
                      ]}
                    >
                      Azi
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.aiChoiceButton,
                      offerDateMode === 'custom' && styles.aiChoiceButtonActive,
                    ]}
                    onPress={() => {
                      setOfferDateMode('custom');
                      setOfferDateToToday();
                      setCompleteError('');
                    }}
                  >
                    <Text
                      style={[
                        styles.aiChoiceButtonText,
                        offerDateMode === 'custom' &&
                          styles.aiChoiceButtonTextActive,
                      ]}
                    >
                      Alta zi
                    </Text>
                  </Pressable>
                </View>

                {offerDateMode === 'custom' && (
                  <View style={styles.dateRow}>
                    <View style={styles.dateDropdownWrapper}>
                      <Dropdown
                        style={styles.compactDropdown}
                        containerStyle={styles.dropdownContainer}
                        placeholderStyle={styles.dropdownPlaceholder}
                        selectedTextStyle={styles.dropdownSelectedText}
                        data={DAYS}
                        maxHeight={240}
                        labelField="label"
                        valueField="value"
                        placeholder="Zi"
                        value={offerDateDay}
                        onChange={(item) => {
                          setOfferDateDay(item.value);
                          setCompleteError('');
                        }}
                      />
                    </View>
                    <View style={styles.dateDropdownWrapper}>
                      <Dropdown
                        style={styles.compactDropdown}
                        containerStyle={styles.dropdownContainer}
                        placeholderStyle={styles.dropdownPlaceholder}
                        selectedTextStyle={styles.dropdownSelectedText}
                        data={MONTHS}
                        maxHeight={240}
                        labelField="label"
                        valueField="value"
                        placeholder="Luna"
                        value={offerDateMonth}
                        onChange={(item) => {
                          setOfferDateMonth(item.value);
                          setCompleteError('');
                        }}
                      />
                    </View>
                    <View style={styles.dateDropdownWrapper}>
                      <Dropdown
                        style={styles.compactDropdown}
                        containerStyle={styles.dropdownContainer}
                        placeholderStyle={styles.dropdownPlaceholder}
                        selectedTextStyle={styles.dropdownSelectedText}
                        data={actionYears}
                        maxHeight={240}
                        labelField="label"
                        valueField="value"
                        placeholder="An"
                        value={offerDateYear}
                        onChange={(item) => {
                          setOfferDateYear(item.value);
                          setCompleteError('');
                        }}
                      />
                    </View>
                  </View>
                )}

                <Text style={styles.modalLabel}>
                  Cum a fost experienta oferirii cadoului?
                </Text>
                <TextInput
                  placeholder="Optional: cum a reactionat, cum a decurs momentul..."
                  style={[styles.modalInput, styles.modalTextArea]}
                  multiline
                  value={experienceDetails}
                  onChangeText={(value) => {
                    setExperienceDetails(value);
                    if (completeError) setCompleteError('');
                  }}
                />

                <Text style={styles.modalLabel}>Reactia generala la cadou</Text>
                <View style={styles.reactionRow}>
                  {REACTION_OPTIONS.map((option) => {
                    const selectedReaction = reactionRating === option.value;

                    return (
                      <Pressable
                        key={option.value}
                        style={[
                          styles.reactionButton,
                          selectedReaction && styles.reactionButtonSelected,
                        ]}
                        onPress={() => {
                          setReactionRating(option.value);
                          if (completeError) setCompleteError('');
                        }}
                      >
                        <Text
                          style={[
                            styles.reactionText,
                            selectedReaction && styles.reactionTextSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.modalLabel}>
                  Reactia pentru fiecare produs cumparat
                </Text>
                {selectedGiftProducts
                  .filter((product) => product.isPurchased)
                  .map((product) => (
                    <View key={product.id} style={styles.productReactionCard}>
                      <Text style={styles.productReactionTitle}>{product.name}</Text>
                      <Text style={styles.productMeta}>
                        Cumparat de la{' '}
                        {product.purchasedStoreName || product.storeName} cu{' '}
                        {formatMoney(
                          product.purchasePrice ?? product.price,
                          product.currency
                        )}
                      </Text>

                      <View style={styles.reactionRow}>
                        {REACTION_OPTIONS.map((option) => {
                          const selectedReaction =
                            productReactions[product.id]?.reactionRating ===
                            option.value;

                          return (
                            <Pressable
                              key={option.value}
                              style={[
                                styles.reactionButton,
                                selectedReaction && styles.reactionButtonSelected,
                              ]}
                              onPress={() =>
                                updateProductReaction(product.id, {
                                  reactionRating: option.value,
                                })
                              }
                            >
                              <Text
                                style={[
                                  styles.reactionText,
                                  selectedReaction && styles.reactionTextSelected,
                                ]}
                              >
                                {option.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>

                      <TextInput
                        placeholder="Optional: cum a reactionat la produs..."
                        style={[styles.modalInput, styles.productReactionInput]}
                        multiline
                        value={productReactions[product.id]?.details || ''}
                        onChangeText={(value) =>
                          updateProductReaction(product.id, { details: value })
                        }
                      />
                    </View>
                  ))}

                <Pressable
                  style={[styles.saveGiftButton, offeringGift && styles.disabledButton]}
                  onPress={markGiftAsOffered}
                  disabled={offeringGift}
                >
                  <Text style={styles.saveGiftButtonText}>
                    {offeringGift ? 'Se salveaza...' : 'Muta in istoric'}
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.cancelGiftButton}
                  onPress={() => {
                    resetCompleteForm();
                    setOfferModalVisible(false);
                  }}
                >
                  <Text style={styles.cancelGiftButtonText}>Inchide</Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal
          visible={completeIncompleteProductsConfirmVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setCompleteIncompleteProductsConfirmVisible(false)}
        >
          <View
            style={styles.modalOverlay}
            {...getModalBackdropResponder(closeTopModal)}
          >
            <View style={styles.confirmModalCard}>
              <Text style={styles.modalTitle}>Produse nemarcate</Text>
              <Text style={styles.confirmText}>
                Ai produse in lista care nu sunt marcate ca fiind cumparate. Esti
                sigur ca ai completat toate produsele cumparate? Dupa confirmare,
                produsele nemarcate vor fi scoase din lista, iar bugetul final va
                include doar produsele cumparate.
              </Text>

              <Pressable
                style={styles.saveGiftButton}
                onPress={() => {
                  setCompleteIncompleteProductsConfirmVisible(false);
                  openCompleteModal();
                }}
              >
                <Text style={styles.saveGiftButtonText}>
                  Da, continui
                </Text>
              </Pressable>

              <Pressable
                style={styles.cancelGiftButton}
                onPress={() => setCompleteIncompleteProductsConfirmVisible(false)}
              >
                <Text style={styles.cancelGiftButtonText}>
                  Ma intorc la verificare
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal
          visible={budgetModalVisible}
          animationType="fade"
          transparent
          onRequestClose={closeBudgetModal}
        >
          <View
            style={styles.modalOverlay}
            {...getModalBackdropResponder(closeTopModal)}
          >
            <View style={styles.confirmModalCard}>
              <Text style={styles.modalTitle}>Modifica bugetul</Text>
              <Text style={styles.confirmText}>
                Total produse acum:{' '}
                {formatMoney(selectedGiftProductsTotal, selectedGiftCurrency)}.
                Poti seta orice buget pozitiv, chiar daca produsele se incadreaza
                deja in suma curenta.
              </Text>

              {!!budgetError && (
                <Text style={styles.giftErrorText}>{budgetError}</Text>
              )}

              <Text style={styles.modalLabel}>Buget nou</Text>
              <TextInput
                placeholder="Introdu suma"
                style={styles.modalInput}
                keyboardType="numeric"
                value={budgetInput}
                onChangeText={(value) => {
                  setBudgetInput(value.replace(/[^0-9]/g, ''));
                  setBudgetError('');
                }}
              />

              <Pressable
                style={[styles.saveGiftButton, savingGiftProducts && styles.disabledButton]}
                onPress={() => saveGiftBudget(visibleSelectedGiftPlan)}
                disabled={savingGiftProducts}
              >
                <Text style={styles.saveGiftButtonText}>
                  {savingGiftProducts ? 'Se salveaza...' : 'Salveaza bugetul'}
                </Text>
              </Pressable>

              <Pressable style={styles.cancelGiftButton} onPress={closeBudgetModal}>
                <Text style={styles.cancelGiftButtonText}>Inchide</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal
          visible={duplicateProductModalVisible}
          animationType="fade"
          transparent
          onRequestClose={keepDuplicateProductInExistingLists}
        >
          <View
            style={styles.modalOverlay}
            {...getModalBackdropResponder(closeTopModal)}
          >
            <View style={styles.confirmModalCard}>
              <Text style={styles.modalTitle}>Produs deja folosit</Text>
              <Text style={styles.confirmText}>
                {duplicateProductToAdd
                  ? `"${duplicateProductToAdd.name}"`
                  : 'Produsul'}{' '}
                exista deja intr-o alta lista pentru {data.name}.
              </Text>

              {duplicateActivePlans.length > 0 && (
                <View style={styles.duplicateInfoBox}>
                  <Text style={styles.duplicateInfoTitle}>
                    Lista/liste unde este deja
                  </Text>
                  {duplicateActivePlans.map((giftPlan) => (
                    <Text key={giftPlan.id} style={styles.duplicateInfoText}>
                      {giftPlan.purpose} din {formatDate(giftPlan.deadlineDate)}
                    </Text>
                  ))}
                </View>
              )}

              {duplicateCompletedPlans.length > 0 && (
                <View style={styles.duplicateInfoBox}>
                  <Text style={styles.duplicateInfoTitle}>
                    A fost inclus si in cadouri finalizate
                  </Text>
                  {duplicateCompletedPlans.map((giftPlan) => (
                    <Text key={giftPlan.id} style={styles.duplicateInfoText}>
                      {giftPlan.purpose} din {formatDate(giftPlan.deadlineDate)}
                    </Text>
                  ))}
                </View>
              )}

              <Pressable
                style={[
                  styles.saveGiftButton,
                  savingGiftProducts && styles.disabledButton,
                ]}
                onPress={() =>
                  keepDuplicateProductInAllLists(visibleSelectedGiftPlan)
                }
                disabled={savingGiftProducts}
              >
                <Text style={styles.saveGiftButtonText}>
                  Pune cadoul si in lista pentru {visibleSelectedGiftPlan.purpose}
                </Text>
              </Pressable>

              <Pressable
                style={styles.cancelGiftButton}
                onPress={keepDuplicateProductInExistingLists}
              >
                <Text style={styles.cancelGiftButtonText}>Anulare</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal
          visible={budgetIncreaseModalVisible}
          animationType="fade"
          transparent
          onRequestClose={closeBudgetIncreaseModal}
        >
          <View
            style={styles.modalOverlay}
            {...getModalBackdropResponder(closeTopModal)}
          >
            <View style={styles.confirmModalCard}>
              <Text style={styles.modalTitle}>Buget depasit</Text>
              <Text style={styles.confirmText}>
                Daca adaugi{' '}
                {pendingBudgetIncreaseProduct
                  ? `"${pendingBudgetIncreaseProduct.name}"`
                  : 'produsul'}
                , totalul listei devine{' '}
                {formatMoney(pendingBudgetIncreaseTotal, selectedGiftCurrency)}.
                Bugetul curent este{' '}
                {formatMoney(visibleSelectedGiftPlan.budget, selectedGiftCurrency)}.
              </Text>
              <Text style={styles.confirmText}>
                Vrei sa marim bugetul ca sa acopere intreaga lista de cadouri?
              </Text>

              <Pressable
                style={[styles.saveGiftButton, savingGiftProducts && styles.disabledButton]}
                onPress={() =>
                  confirmAddProductWithBudgetIncrease(visibleSelectedGiftPlan)
                }
                disabled={savingGiftProducts}
              >
                <Text style={styles.saveGiftButtonText}>
                  Da, mareste bugetul la{' '}
                  {formatMoney(pendingBudgetIncreaseTotal, selectedGiftCurrency)}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.cancelGiftButton,
                  styles.keepBudgetButton,
                  savingGiftProducts && styles.disabledButton,
                ]}
                onPress={() =>
                  confirmAddProductWithoutBudgetIncrease(visibleSelectedGiftPlan)
                }
                disabled={savingGiftProducts}
              >
                <Text style={styles.keepBudgetButtonText}>
                  Nu, pastreaza bugetul curent
                </Text>
              </Pressable>

              <Pressable
                style={styles.cancelGiftButton}
                onPress={closeBudgetIncreaseModal}
              >
                <Text style={styles.cancelGiftButtonText}>Renunta</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal
          visible={budgetDecreaseConfirmVisible}
          animationType="fade"
          transparent
          onRequestClose={closeBudgetDecreaseConfirm}
        >
          <View
            style={styles.modalOverlay}
            {...getModalBackdropResponder(closeTopModal)}
          >
            <View style={styles.confirmModalCard}>
              <Text style={styles.modalTitle}>Buget sub totalul listei</Text>
              <Text style={styles.confirmText}>
                Totalul produselor este{' '}
                {formatMoney(selectedGiftProductsTotal, selectedGiftCurrency)},
                iar bugetul introdus este{' '}
                {formatMoney(pendingManualBudget || 0, selectedGiftCurrency)}.
              </Text>
              <Text style={styles.confirmText}>
                Lista de cadouri nu mai poate fi acoperita complet cu acest
                buget. Vrei sa salvezi totusi modificarea?
              </Text>

              <Pressable
                style={[
                  styles.saveGiftButton,
                  styles.deleteConfirmButton,
                  savingGiftProducts && styles.disabledButton,
                ]}
                onPress={() => confirmBudgetDecrease(visibleSelectedGiftPlan)}
                disabled={savingGiftProducts}
              >
                <Text style={styles.saveGiftButtonText}>
                  Da, salveaza bugetul
                </Text>
              </Pressable>

              <Pressable
                style={styles.cancelGiftButton}
                onPress={closeBudgetDecreaseConfirm}
              >
                <Text style={styles.cancelGiftButtonText}>Nu, revin</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal
          visible={budgetHistoryVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setBudgetHistoryVisible(false)}
        >
          <View
            style={styles.modalOverlay}
            {...getModalBackdropResponder(closeTopModal)}
          >
            <View style={styles.giftModalCard}>
              <View style={styles.modalHandle} />

              <ScrollView
                contentContainerStyle={styles.giftModalBody}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.modalTitle}>Istoric buget</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.budgetChartScroll}
                >
                  <View
                    style={[
                      styles.budgetLineChart,
                      { width: BUDGET_CHART_WIDTH, height: BUDGET_CHART_HEIGHT },
                    ]}
                  >
                    <View style={styles.budgetChartTitleBlock}>
                      <Text style={styles.budgetLineChartTitle}>
                        Evolutie buget
                      </Text>
                      <Text style={styles.budgetLineChartSubtitle}>
                        IN RON
                      </Text>
                    </View>

                    <View style={styles.budgetLineChartYAxis}>
                      {[
                        budgetHistoryMax,
                        Math.round(
                          budgetHistoryMax -
                            (budgetHistoryMax - budgetHistoryMin) * 0.25
                        ),
                        Math.round((budgetHistoryMax + budgetHistoryMin) / 2),
                        Math.round(
                          budgetHistoryMin +
                            (budgetHistoryMax - budgetHistoryMin) * 0.25
                        ),
                        budgetHistoryMin,
                      ].map((value, index) => (
                        <Text
                          key={`${value}-${index}`}
                          style={styles.budgetLineChartAxisText}
                        >
                          {value}
                        </Text>
                      ))}
                    </View>

                    <View style={styles.budgetLineChartPlot}>
                      <View style={styles.budgetLineChartYAxisLine} />
                      <View style={styles.budgetLineChartXAxisLine} />

                      {budgetChartSegments.map((segment) => (
                        <View
                          key={segment.key}
                          style={[
                            styles.budgetLineChartSegment,
                            {
                              left: segment.left,
                              top: segment.top,
                              width: segment.width,
                              transform: [{ rotateZ: `${segment.angle}deg` }],
                            },
                          ]}
                        />
                      ))}

                      {budgetChartPoints.map((point, index) => (
                        <View
                          key={`${point.changedAt}-point-${index}`}
                          style={[
                            styles.budgetLineChartPointWrap,
                            {
                              left: point.x - 26,
                              top: point.y - 10,
                            },
                          ]}
                        >
                          <View style={styles.budgetLineChartPoint} />
                          <Text style={styles.budgetLineChartPointValue}>
                            {point.value}
                          </Text>
                        </View>
                      ))}

                      {budgetChartPoints.map((point, index) => (
                        <View
                          key={`${point.changedAt}-label-${index}`}
                          style={[
                            styles.budgetLineChartXLabel,
                            { left: point.x - 34 },
                          ]}
                        >
                          <Text style={styles.budgetLineChartMonth}>
                            {point.label.month}
                          </Text>
                          <Text style={styles.budgetLineChartYear}>
                            {point.label.year}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </ScrollView>

                {selectedGiftBudgetHistory.map((entry, index) => (
                  <View key={`${entry.changedAt}-row-${index}`} style={styles.budgetHistoryRow}>
                    <Text style={styles.budgetHistoryDate}>
                      {formatShortDateTime(entry.changedAt)}
                    </Text>
                    <Text style={styles.budgetHistoryValue}>
                      {formatMoney(entry.value)}
                    </Text>
                  </View>
                ))}

                <Pressable
                  style={styles.cancelGiftButton}
                  onPress={() => setBudgetHistoryVisible(false)}
                >
                  <Text style={styles.cancelGiftButtonText}>Inchide</Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal
          visible={deadlineModalVisible}
          animationType="slide"
          transparent
          onRequestClose={closeDeadlineEditModal}
        >
          <View
            style={styles.modalOverlay}
            {...getModalBackdropResponder(closeTopModal)}
          >
            <View style={styles.giftModalCard}>
              <View style={styles.modalHandle} />

              <ScrollView
                contentContainerStyle={styles.giftModalBody}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.modalTitle}>Editeaza deadline</Text>
                <Text style={styles.confirmText}>
                  Alege deadline-ul de cumparare si data oferirii pentru cadoul{' '}
                  {visibleSelectedGiftPlan.purpose}. Data de cumparare nu poate
                  fi dupa data oferirii.
                </Text>

                {!!deadlineEditError && (
                  <Text style={styles.giftErrorText}>{deadlineEditError}</Text>
                )}

                <Text style={styles.modalLabel}>Cumpara cadoul pana la</Text>
                <View style={styles.dateRow}>
                  <View style={styles.dateDropdownWrapper}>
                    <Dropdown
                      style={styles.compactDropdown}
                      containerStyle={styles.dropdownContainer}
                      placeholderStyle={styles.dropdownPlaceholder}
                      selectedTextStyle={styles.dropdownSelectedText}
                      data={DAYS}
                      maxHeight={240}
                      labelField="label"
                      valueField="value"
                      placeholder="Zi"
                      value={editPurchaseDeadlineDay}
                      onChange={(item) => {
                        setEditPurchaseDeadlineDay(item.value);
                        setDeadlineEditError('');
                      }}
                    />
                  </View>

                  <View style={styles.dateDropdownWrapper}>
                    <Dropdown
                      style={styles.compactDropdown}
                      containerStyle={styles.dropdownContainer}
                      placeholderStyle={styles.dropdownPlaceholder}
                      selectedTextStyle={styles.dropdownSelectedText}
                      data={MONTHS}
                      maxHeight={240}
                      labelField="label"
                      valueField="value"
                      placeholder="Luna"
                      value={editPurchaseDeadlineMonth}
                      onChange={(item) => {
                        setEditPurchaseDeadlineMonth(item.value);
                        setDeadlineEditError('');
                      }}
                    />
                  </View>

                  <View style={styles.dateDropdownWrapper}>
                    <Dropdown
                      style={styles.compactDropdown}
                      containerStyle={styles.dropdownContainer}
                      placeholderStyle={styles.dropdownPlaceholder}
                      selectedTextStyle={styles.dropdownSelectedText}
                      data={years}
                      maxHeight={240}
                      labelField="label"
                      valueField="value"
                      placeholder="An"
                      value={editPurchaseDeadlineYear}
                      onChange={(item) => {
                        setEditPurchaseDeadlineYear(item.value);
                        setDeadlineEditError('');
                      }}
                    />
                  </View>
                </View>

                <Text style={styles.modalLabel}>Data oferirii cadoului</Text>
                <View style={styles.dateRow}>
                  <View style={styles.dateDropdownWrapper}>
                    <Dropdown
                      style={styles.compactDropdown}
                      containerStyle={styles.dropdownContainer}
                      placeholderStyle={styles.dropdownPlaceholder}
                      selectedTextStyle={styles.dropdownSelectedText}
                      data={DAYS}
                      maxHeight={240}
                      labelField="label"
                      valueField="value"
                      placeholder="Zi"
                      value={editDeadlineDay}
                      onChange={(item) => {
                        setEditDeadlineDay(item.value);
                        setDeadlineEditError('');
                      }}
                    />
                  </View>

                  <View style={styles.dateDropdownWrapper}>
                    <Dropdown
                      style={styles.compactDropdown}
                      containerStyle={styles.dropdownContainer}
                      placeholderStyle={styles.dropdownPlaceholder}
                      selectedTextStyle={styles.dropdownSelectedText}
                      data={MONTHS}
                      maxHeight={240}
                      labelField="label"
                      valueField="value"
                      placeholder="Luna"
                      value={editDeadlineMonth}
                      onChange={(item) => {
                        setEditDeadlineMonth(item.value);
                        setDeadlineEditError('');
                      }}
                    />
                  </View>

                  <View style={styles.dateDropdownWrapper}>
                    <Dropdown
                      style={styles.compactDropdown}
                      containerStyle={styles.dropdownContainer}
                      placeholderStyle={styles.dropdownPlaceholder}
                      selectedTextStyle={styles.dropdownSelectedText}
                      data={years}
                      maxHeight={240}
                      labelField="label"
                      valueField="value"
                      placeholder="An"
                      value={editDeadlineYear}
                      onChange={(item) => {
                        setEditDeadlineYear(item.value);
                        setDeadlineEditError('');
                      }}
                    />
                  </View>
                </View>

                <Pressable
                  style={[
                    styles.saveGiftButton,
                    savingDeadline && styles.disabledButton,
                  ]}
                  onPress={() => saveDeadlineOnly(visibleSelectedGiftPlan)}
                  disabled={savingDeadline}
                >
                  <Text style={styles.saveGiftButtonText}>
                    {savingDeadline ? 'Se salveaza...' : 'Salveaza deadline'}
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.cancelGiftButton}
                  onPress={closeDeadlineEditModal}
                >
                  <Text style={styles.cancelGiftButtonText}>Inchide</Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal
          visible={removeProductConfirmVisible}
          animationType="fade"
          transparent
          onRequestClose={closeRemoveProductConfirm}
        >
          <View
            style={styles.modalOverlay}
            {...getModalBackdropResponder(closeTopModal)}
          >
            <View style={styles.confirmModalCard}>
              <Text style={styles.modalTitle}>Scoate produsul?</Text>
              <Text style={styles.confirmText}>
                Sigur vrei sa scoti{' '}
                {productToRemove ? `"${productToRemove.name}"` : 'produsul'} din
                lista acestui cadou?
              </Text>

              <Pressable
                style={[
                  styles.saveGiftButton,
                  styles.deleteConfirmButton,
                  savingGiftProducts && styles.disabledButton,
                ]}
                onPress={() => confirmRemoveProductFromGift(visibleSelectedGiftPlan)}
                disabled={savingGiftProducts}
              >
                <Text style={styles.saveGiftButtonText}>
                  {savingGiftProducts ? 'Se scoate...' : 'Scoate produsul'}
                </Text>
              </Pressable>

              <Pressable
                style={styles.cancelGiftButton}
                onPress={closeRemoveProductConfirm}
              >
                <Text style={styles.cancelGiftButtonText}>Anuleaza</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal
          visible={aiHelpModalVisible}
          animationType="slide"
          transparent
          onRequestClose={closeAiHelpModal}
        >
          <View
            style={styles.modalOverlay}
            {...getModalBackdropResponder(closeTopModal)}
          >
            <View style={styles.giftModalCard}>
              <View style={styles.modalHandle} />

              <ScrollView
                contentContainerStyle={styles.giftModalBody}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.modalTitle}>Ajutor AI</Text>

                {!!aiHelpError && (
                  <Text style={styles.giftErrorText}>{aiHelpError}</Text>
                )}

                <View style={styles.aiPersonBox}>
                  <Text style={styles.notesTitle}>Persoana draga</Text>
                  <Text style={styles.historyDetails}>Nume: {data.name}</Text>
                  <Text style={styles.historyDetails}>
                    Varsta estimata: {data.estimatedAgeRange || '-'}
                  </Text>
                  <Text style={styles.historyDetails}>
                    Gen:{' '}
                    {data.gender === 'male'
                      ? 'Masculin'
                      : data.gender === 'female'
                      ? 'Feminin'
                      : '-'}
                  </Text>
                  <Text style={styles.historyDetails}>Zodie: {zodiac}</Text>
                  <Text style={styles.historyDetails}>
                    Data nasterii: {String(data.day).padStart(2, '0')}.
                    {String(data.month).padStart(2, '0')}
                    {data.year ? `.${data.year}` : ''}
                  </Text>
                  {!!data.year && (
                    <Text style={styles.historyDetails}>
                      Vârstă: {calculateAge(data.day, data.month, data.year)} ani
                    </Text>
                  )}
                </View>

                {selectedGiftProducts.length > 0 && (
                  <View style={styles.aiPersonBox}>
                    <Text style={styles.notesTitle}>
                      Pastrezi produsele deja adaugate?
                    </Text>
                    <Text style={styles.productMeta}>
                      Ai {selectedGiftProducts.length} produse in lista, total{' '}
                      {formatMoney(selectedGiftProductsTotal, selectedGiftCurrency)}.
                    </Text>
                    <View style={styles.aiChoiceRow}>
                      <Pressable
                        style={[
                          styles.aiChoiceButton,
                          aiKeepExistingProducts && styles.aiChoiceButtonActive,
                        ]}
                        onPress={() =>
                          setAiKeepExistingChoice(visibleSelectedGiftPlan, true)
                        }
                      >
                        <Text
                          style={[
                            styles.aiChoiceButtonText,
                            aiKeepExistingProducts &&
                              styles.aiChoiceButtonTextActive,
                          ]}
                        >
                          Da, le pastrez
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.aiChoiceButton,
                          !aiKeepExistingProducts && styles.aiChoiceButtonActive,
                        ]}
                        onPress={() =>
                          setAiKeepExistingChoice(visibleSelectedGiftPlan, false)
                        }
                      >
                        <Text
                          style={[
                            styles.aiChoiceButtonText,
                            !aiKeepExistingProducts &&
                              styles.aiChoiceButtonTextActive,
                          ]}
                        >
                          Nu, caut de la zero
                        </Text>
                      </Pressable>
                    </View>
                    <Text style={styles.productMeta}>
                      Buget folosit pentru cautare:{' '}
                      {formatMoney(Number(aiBudget) || 0)}
                    </Text>
                  </View>
                )}

                <Text style={styles.modalLabel}>Descriere despre ea</Text>
                <TextInput
                  placeholder="Ex: preferinte, hobby-uri, stil, lucruri pe care le evita..."
                  style={[styles.modalInput, styles.modalTextArea]}
                  multiline
                  value={aiPersonDescription}
                  onChangeText={setAiPersonDescription}
                />

                <Text style={styles.modalLabel}>Scopul cadoului</Text>
                <TextInput
                  style={[styles.modalInput, styles.disabledInput]}
                  value={visibleSelectedGiftPlan.purpose}
                  editable={false}
                />

                <Text style={styles.modalLabel}>Buget</Text>
                <TextInput
                  placeholder="Buget maxim"
                  style={styles.modalInput}
                  keyboardType="numeric"
                  value={aiBudget}
                  onChangeText={(value) => setAiBudget(value.replace(/[^0-9]/g, ''))}
                />

                <Text style={styles.modalLabel}>Numarul de produse dorite</Text>
                <TextInput
                  placeholder="Minim 1"
                  style={styles.modalInput}
                  keyboardType="numeric"
                  value={aiProductCount}
                  onChangeText={(value) => {
                    setAiProductCount(value.replace(/[^0-9]/g, ''));
                    setAiHelpError('');
                    setAiPromptInput('');
                  }}
                />

                <Pressable
                  style={styles.saveGiftButton}
                  onPress={() => buildAiHelpInput(visibleSelectedGiftPlan)}
                >
                  <Text style={styles.saveGiftButtonText}>OK</Text>
                </Pressable>

                {!!aiPromptInput && (
                  <View style={styles.aiPromptBox}>
                    <Text style={styles.notesTitle}>Input pentru AI</Text>
                    <TextInput
                      style={[styles.modalInput, styles.aiPromptInput]}
                      multiline
                      value={aiPromptInput}
                      onChangeText={setAiPromptInput}
                    />
                  </View>
                )}

                <Pressable style={styles.cancelGiftButton} onPress={closeAiHelpModal}>
                  <Text style={styles.cancelGiftButtonText}>Inchide</Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal
          visible={changeProductModeVisible}
          animationType="fade"
          transparent
          onRequestClose={closeChangeProductFlow}
        >
          <View
            style={styles.modalOverlay}
            {...getModalBackdropResponder(closeTopModal)}
          >
            <View style={styles.confirmModalCard}>
              <Text style={styles.modalTitle}>Schimba produs</Text>
              <Text style={styles.confirmText}>
                Cum vrei sa cauti un inlocuitor pentru{' '}
                {changeProduct?.name || 'produsul selectat'}?
              </Text>

              <Pressable style={styles.saveGiftButton} onPress={openManualChange}>
                <Text style={styles.saveGiftButtonText}>Cauta manual</Text>
              </Pressable>

              <Pressable
                style={[styles.aiChangeButton, !changeProduct && styles.disabledButton]}
                onPress={() => openAiChange(visibleSelectedGiftPlan)}
                disabled={!changeProduct}
              >
                <Text style={styles.saveGiftButtonText}>
                  Cauta cu ajutor AI
                </Text>
              </Pressable>

              <Pressable style={styles.cancelGiftButton} onPress={closeChangeProductFlow}>
                <Text style={styles.cancelGiftButtonText}>Inchide</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal
          visible={changeProductManualVisible}
          animationType="slide"
          transparent
          onRequestClose={closeChangeProductFlow}
        >
          <View
            style={styles.modalOverlay}
            {...getModalBackdropResponder(closeTopModal)}
          >
            <View style={styles.giftModalCard}>
              <View style={styles.modalHandle} />

              <ScrollView
                contentContainerStyle={styles.giftModalBody}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.modalTitle}>Cauta manual</Text>
                <Text style={styles.confirmText}>
                  Alege produsul care va inlocui{' '}
                  {changeProduct?.name || 'produsul selectat'}. Lista nu include
                  produsele deja adaugate pe cadou.
                </Text>

                <TextInput
                  placeholder="Cauta dupa nume, brand, categorie sau magazin"
                  style={styles.modalInput}
                  value={changeProductSearch}
                  onChangeText={(value) => {
                    setChangeProductSearch(value);
                    setProductError('');
                    setManualProductError('');
                    setManualProductName(value);
                  }}
                />

                {!!productError && (
                  <Text style={styles.giftErrorText}>{productError}</Text>
                )}

                {partnerStores.length === 0 ? (
                  <Text style={styles.emptyHistoryText}>
                    Nu exista produse importate momentan.
                  </Text>
                ) : changeProductSuggestions.length === 0 ? (
                  <View style={styles.manualProductBox}>
                    <Text style={styles.notesTitle}>
                      Nu am gasit un inlocuitor
                    </Text>
                    <Text style={styles.productMeta}>
                      Il poti introduce manual ca sa inlocuiasca produsul curent.
                      Completeaza doar ce este si pretul estimat.
                    </Text>

                    {!!manualProductError && (
                      <Text style={styles.giftErrorText}>
                        {manualProductError}
                      </Text>
                    )}

                    <Text style={styles.modalLabel}>Ce vrei sa cumperi?</Text>
                    <TextInput
                      placeholder="Ex: esarfa rosie, carte, set cafea..."
                      style={styles.modalInput}
                      value={manualProductName}
                      onChangeText={(value) => {
                        setManualProductName(value);
                        setManualProductError('');
                      }}
                    />

                    <Text style={styles.modalLabel}>Pret estimat</Text>
                    <TextInput
                      placeholder="Ex: 120"
                      style={styles.modalInput}
                      keyboardType="numeric"
                      value={manualProductPrice}
                      onChangeText={(value) => {
                        setManualProductPrice(value.replace(/[^0-9]/g, ''));
                        setManualProductError('');
                      }}
                    />

                    <Pressable
                      style={[
                        styles.saveGiftButton,
                        (!changeProduct || savingGiftProducts) &&
                          styles.disabledButton,
                      ]}
                      onPress={() =>
                        changeProduct &&
                        replaceProductWithManualGift(
                          visibleSelectedGiftPlan,
                          changeProduct
                        )
                      }
                      disabled={!changeProduct || savingGiftProducts}
                    >
                      <Text style={styles.saveGiftButtonText}>
                        Inlocuieste cu produs manual
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  changeProductSuggestions.map((product) => (
                    <View key={product.id} style={styles.productSuggestionRow}>
                      {!!product.imageUrl && (
                        <Image
                          source={{ uri: product.imageUrl }}
                          style={styles.productThumb}
                        />
                      )}
                      <View style={styles.productInfo}>
                        <Text style={styles.productName}>{product.name}</Text>
                        <Text style={styles.productMeta}>
                          {product.brand || product.category || 'Produs partener'}
                        </Text>
                        {(product.offerCount || 0) > 1 && (
                          <Text style={styles.productMeta}>
                            {product.offerCount} magazine disponibile
                          </Text>
                        )}
                        {!!product.promoCode && (
                          <Text style={styles.productMeta}>
                            Pret cu cod {product.promoCode}
                          </Text>
                        )}
                        {!!product.category && (
                          <Text style={styles.productMeta}>
                            {product.category}
                            {product.subcategory
                              ? ` - ${product.subcategory}`
                              : ''}
                          </Text>
                        )}
                      </View>
                      <View style={styles.productPriceBox}>
                        <Text style={styles.productPrice}>
                          {formatMoney(product.price, product.currency)}
                        </Text>
                        <Pressable
                          style={[
                            styles.addProductButton,
                            (!changeProduct || savingGiftProducts) &&
                              styles.disabledButton,
                          ]}
                          onPress={() =>
                            changeProduct &&
                            replaceProductInGift(
                              visibleSelectedGiftPlan,
                              changeProduct,
                              product
                            )
                          }
                          disabled={!changeProduct || savingGiftProducts}
                        >
                          <Text style={styles.addProductButtonText}>
                            Inlocuieste
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ))
                )}

                <Pressable style={styles.cancelGiftButton} onPress={closeChangeProductFlow}>
                  <Text style={styles.cancelGiftButtonText}>Inchide</Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal
          visible={changeProductAiVisible}
          animationType="slide"
          transparent
          onRequestClose={closeChangeProductFlow}
        >
          <View
            style={styles.modalOverlay}
            {...getModalBackdropResponder(closeTopModal)}
          >
            <View style={styles.giftModalCard}>
              <View style={styles.modalHandle} />

              <ScrollView
                contentContainerStyle={styles.giftModalBody}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.modalTitle}>Ajutor AI pentru schimbare</Text>

                <View style={styles.aiPersonBox}>
                  <Text style={styles.notesTitle}>Persoana draga</Text>
                  <Text style={styles.historyDetails}>Nume: {data.name}</Text>
                  <Text style={styles.historyDetails}>
                    Varsta estimata: {data.estimatedAgeRange || '-'}
                  </Text>
                  <Text style={styles.historyDetails}>Zodie: {zodiac}</Text>
                  <Text style={styles.historyDetails}>
                    Produs schimbat: {changeProduct?.name || '-'}
                  </Text>
                </View>

                <Text style={styles.modalLabel}>Descriere despre ea</Text>
                <TextInput
                  placeholder="Ex: preferinte, hobby-uri, stil, lucruri pe care le evita..."
                  style={[styles.modalInput, styles.modalTextArea]}
                  multiline
                  value={changeProductAiDescription}
                  onChangeText={setChangeProductAiDescription}
                />

                <Text style={styles.modalLabel}>Scopul cadoului</Text>
                <TextInput
                  style={[styles.modalInput, styles.disabledInput]}
                  value={visibleSelectedGiftPlan.purpose}
                  editable={false}
                />

                <Text style={styles.modalLabel}>Buget pentru inlocuire</Text>
                <TextInput
                  placeholder="Buget maxim"
                  style={styles.modalInput}
                  keyboardType="numeric"
                  value={changeProductAiBudget}
                  onChangeText={(value) =>
                    setChangeProductAiBudget(value.replace(/[^0-9]/g, ''))
                  }
                />

                <Text style={styles.modalLabel}>Numarul de produse dorite</Text>
                <TextInput
                  style={[styles.modalInput, styles.disabledInput]}
                  value="1"
                  editable={false}
                />

                <Pressable
                  style={[styles.saveGiftButton, !changeProduct && styles.disabledButton]}
                  onPress={() => buildChangeProductAiInput(visibleSelectedGiftPlan)}
                  disabled={!changeProduct}
                >
                  <Text style={styles.saveGiftButtonText}>OK</Text>
                </Pressable>

                {!!changeProductAiPromptInput && (
                  <View style={styles.aiPromptBox}>
                    <Text style={styles.notesTitle}>Input pentru AI</Text>
                    <TextInput
                      style={[styles.modalInput, styles.aiPromptInput]}
                      multiline
                      value={changeProductAiPromptInput}
                      onChangeText={setChangeProductAiPromptInput}
                    />
                  </View>
                )}

                <Pressable style={styles.cancelGiftButton} onPress={closeChangeProductFlow}>
                  <Text style={styles.cancelGiftButtonText}>Inchide</Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
    );
  }

  if (historyVisible) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable
          style={styles.backButton}
          onPress={goBackFromHistory}
        >
          <Text style={styles.backButtonText}>Inapoi la persoana</Text>
        </Pressable>

        <View style={styles.giftsSection}>
          <Text style={styles.sectionTitle}>Istoric cadouri</Text>

          <Dropdown
            style={styles.dropdown}
            containerStyle={styles.dropdownContainer}
            placeholderStyle={styles.dropdownPlaceholder}
            selectedTextStyle={styles.dropdownSelectedText}
            data={HISTORY_FILTER_OPTIONS}
            maxHeight={260}
            labelField="label"
            valueField="value"
            placeholder="Filtreaza dupa ocazie"
            value={historyPurposeFilter}
            onChange={(item) =>
              setHistoryPurposeFilter(item.value as 'all' | GiftPurpose)
            }
          />

          <Dropdown
            style={styles.dropdown}
            containerStyle={styles.dropdownContainer}
            placeholderStyle={styles.dropdownPlaceholder}
            selectedTextStyle={styles.dropdownSelectedText}
            data={historyYearOptions}
            maxHeight={260}
            labelField="label"
            valueField="value"
            placeholder="Filtreaza dupa an"
            value={historyYearFilter}
            onChange={(item) =>
              setHistoryYearFilter(item.value as 'all' | number)
            }
          />

          {giftPlansLoading ? (
            <ActivityIndicator />
          ) : completedGiftPlanGroups.length === 0 ? (
            <Text style={styles.emptyHistoryText}>
              Nu exista cadouri finalizate pentru filtrul selectat.
            </Text>
          ) : (
            <>
              {historyBudgetChartPoints.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.budgetChartScroll}
                >
                  <View
                    style={[
                      styles.budgetLineChart,
                      { width: BUDGET_CHART_WIDTH, height: BUDGET_CHART_HEIGHT },
                    ]}
                  >
                    <View style={styles.budgetChartTitleBlock}>
                      <Text style={styles.budgetLineChartTitle}>
                        Evolutie buget
                      </Text>
                      <Text style={styles.budgetLineChartSubtitle}>
                        {historyPurposeFilter} - RON pe ani
                      </Text>
                    </View>

                    <View style={styles.budgetLineChartYAxis}>
                      {[
                        historyBudgetMax,
                        Math.round(
                          historyBudgetMin +
                            (historyBudgetMax - historyBudgetMin) * 0.75
                        ),
                        Math.round((historyBudgetMax + historyBudgetMin) / 2),
                        Math.round(
                          historyBudgetMin +
                            (historyBudgetMax - historyBudgetMin) * 0.25
                        ),
                        historyBudgetMin,
                      ].map((value, index) => (
                        <Text
                          key={`${value}-${index}`}
                          style={styles.budgetLineChartAxisText}
                        >
                          {value}
                        </Text>
                      ))}
                    </View>

                    <View style={styles.budgetLineChartPlot}>
                      <View style={styles.budgetLineChartYAxisLine} />
                      <View style={styles.budgetLineChartXAxisLine} />

                      {historyBudgetChartSegments.map((segment) => (
                        <View
                          key={segment.key}
                          style={[
                            styles.budgetLineChartSegment,
                            {
                              left: segment.left,
                              top: segment.top,
                              width: segment.width,
                              transform: [{ rotateZ: `${segment.angle}deg` }],
                            },
                          ]}
                        />
                      ))}

                      {historyBudgetChartPoints.map((point) => (
                        <View
                          key={`${point.year}-point`}
                          style={[
                            styles.budgetLineChartPointWrap,
                            {
                              left: point.x - 26,
                              top: point.y - 10,
                            },
                          ]}
                        >
                          <View style={styles.budgetLineChartPoint} />
                          <Text style={styles.budgetLineChartPointValue}>
                            {point.value}
                          </Text>
                        </View>
                      ))}

                      {historyBudgetChartPoints.map((point) => (
                        <View
                          key={`${point.year}-label`}
                          style={[
                            styles.budgetLineChartXLabel,
                            { left: point.x - 34 },
                          ]}
                        >
                          <Text style={styles.budgetLineChartMonth}>
                            {point.year}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </ScrollView>
              )}

              {completedGiftPlanGroups.map((group) => (
                <View key={group.year} style={styles.yearGroup}>
                  <View style={styles.yearGroupHeader}>
                    <Text style={styles.yearGroupTitle}>{group.title}</Text>
                    <Text style={styles.yearGroupMeta}>
                      {group.plans.length} cadouri - {group.totalBudget} RON
                    </Text>
                  </View>

                  {group.plans.map((gift) => (
                    <Pressable
                      key={gift.id}
                      style={styles.historyItem}
                      onPress={() => setSelectedGiftPlan(gift)}
                    >
                      <View style={styles.historyItemHeader}>
                        <Text style={styles.historyPurpose}>{gift.purpose}</Text>
                        <Text style={styles.historyBudget}>{gift.budget} RON</Text>
                      </View>
                      <Text style={styles.historyDeadline}>
                        Oferit pe: {formatDate(gift.deadlineDate)}
                      </Text>
                      <Text style={styles.historyDetails}>
                        Cumparat la: {formatIsoDate(gift.completedAt)}
                      </Text>
                      <Text style={styles.historyDetails}>
                        {getPurchaseTimingLabel(gift)}
                      </Text>
                      <Text style={styles.historyDetails}>
                        Oferit la: {formatIsoDate(gift.offeredAt)}
                      </Text>
                      <Text style={styles.historyDetails}>
                        {getOfferTimingLabel(gift)}
                      </Text>
                      <Text style={styles.historyDetails}>
                        Perioada de finalizare cadou: {getCompletionDays(gift)}
                      </Text>
                      <Text style={styles.historyDetails}>
                        Zile ramase pana la ziua cadoului:{' '}
                        {getRemainingDaysUntilGift(gift)}
                      </Text>
                      <Text style={styles.historyDetails}>
                        Reactie: {REACTION_OPTIONS.find(
                          (option) => option.value === gift.reactionRating
                        )?.label || ':|'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ))}
            </>
          )}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>{backLabel}</Text>
      </Pressable>

      <View style={styles.card}>
        {data.imageUrl ? (
          <Image source={{ uri: data.imageUrl }} style={styles.image} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              {data.name?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
        )}

        <Text style={styles.name}>{data.name}</Text>

        <Text style={styles.info}>
          Data: {String(data.day).padStart(2, '0')}.{String(data.month).padStart(2, '0')}
          {data.year ? `.${data.year}` : ''}
        </Text>

        {data.year ? (
          <Text style={styles.info}>Vârstă: {calculateAge(data.day, data.month, data.year)} ani</Text>
        ) : !!data.estimatedAgeRange ? (
          <Text style={styles.info}>Vârstă estimată: {data.estimatedAgeRange}</Text>
        ) : null}

        <Text style={styles.info}>
          Gen:{' '}
          {data.gender === 'male'
            ? 'Masculin'
            : data.gender === 'female'
            ? 'Feminin'
            : '-'}
        </Text>

        <Text style={styles.info}>Zodie: {zodiac}</Text>

        {!!data.notes && (
          <View style={styles.notesBox}>
            <Text style={styles.notesTitle}>Detalii</Text>
            <Text style={styles.notesText}>{data.notes}</Text>
          </View>
        )}

        <Pressable style={styles.editButton} onPress={() => setEditVisible(true)}>
          <Text style={styles.editButtonText}>Editează</Text>
        </Pressable>
        <Pressable
          style={styles.deleteLovedOneButton}
          onPress={() => setDeleteLovedOneVisible(true)}
        >
          <Text style={styles.deleteLovedOneButtonText}>
            Sterge persoana
          </Text>
        </Pressable>
      </View>

      <View style={styles.giftsSection}>
        <Text style={styles.sectionTitle}>Cadouri</Text>

        <Pressable
          style={styles.newGiftButton}
          onPress={openCreateGiftModal}
        >
          <Text style={styles.newGiftButtonText}>Stabileste un nou cadou</Text>
        </Pressable>

        <Pressable
          style={styles.historyButton}
          onPress={() => setHistoryVisible(true)}
        >
          <Text style={styles.historyButtonText}>Istoric cadouri</Text>
        </Pressable>

        <View style={styles.historyBox}>
          <Text style={styles.historyTitle}>Cadouri stabilite</Text>

          {giftPlansLoading ? (
            <ActivityIndicator />
          ) : plannedGiftPlans.length === 0 ? (
            <Text style={styles.emptyHistoryText}>
              Nu exista cadouri active pentru aceasta persoana.
            </Text>
          ) : (
            plannedGiftPlanGroups.map((group) => (
              <View key={group.year} style={styles.yearGroup}>
                <View style={styles.yearGroupHeader}>
                  <Text style={styles.yearGroupTitle}>{group.title}</Text>
                  <Text style={styles.yearGroupMeta}>
                    {group.plans.length} cadouri - {group.totalBudget} RON
                  </Text>
                </View>

                {group.plans.map((gift) => {
                  const timingNotes = getGiftTimingNotes(gift);

                  return (
                    <Pressable
                      key={gift.id}
                      style={styles.historyItem}
                      onPress={() => setSelectedGiftPlan(gift)}
                    >
                      <View style={styles.historyItemHeader}>
                        <Text style={styles.historyPurpose}>{gift.purpose}</Text>
                        <Text style={styles.historyBudget}>{gift.budget} RON</Text>
                      </View>
                      {gift.status === 'planned' && (
                        <Text style={styles.historyDeadline}>
                          Cumpara pana la:{' '}
                          {formatDate(gift.purchaseDeadlineDate || gift.deadlineDate)}
                        </Text>
                      )}
                      {gift.status === 'purchased' && (
                        <Text style={styles.historyDeadline}>
                          Ofera pe: {formatDate(gift.deadlineDate)}
                        </Text>
                      )}
                      {timingNotes.map((note) => (
                        <Text key={note} style={styles.expiredText}>
                          {note}
                        </Text>
                      ))}
                      {gift.status === 'planned' && (
                        <View style={styles.historyActions}>
                          <Pressable
                            style={styles.historyActionButton}
                            onPress={(event) => {
                              stopPressPropagation(event);
                              openEditGiftModal(gift);
                            }}
                          >
                            <Text style={styles.historyActionText}>Editeaza</Text>
                          </Pressable>
                          <Pressable
                            style={[
                              styles.historyActionButton,
                              styles.deleteActionButton,
                            ]}
                            onPress={(event) => {
                              stopPressPropagation(event);
                              requestDeleteGiftPlan(gift);
                            }}
                          >
                            <Text style={styles.deleteActionText}>Sterge</Text>
                          </Pressable>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))
          )}
        </View>
      </View>

      <AddLovedOneModal
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        onSaved={() => {
          invalidateCalendarCache();
          load();
        }}
        initialData={data}
      />

      <Modal
        visible={deleteLovedOneVisible}
        animationType="fade"
        transparent
        onRequestClose={closeDeleteLovedOneModal}
      >
        <View
          style={styles.modalOverlay}
          {...getModalBackdropResponder(closeTopModal)}
        >
          <View style={styles.confirmModalCard}>
            <Text style={styles.modalTitle}>Sterge persoana</Text>
            <Text style={styles.confirmText}>
              {data.name} va disparea din lista ta si din calendar. Cadourile
              si produsele deja salvate raman in baza de date pentru statisticile
              admin.
            </Text>
            <Text style={styles.confirmText}>
              Daca adaugi din nou aceeasi persoana, va fi tratata ca o persoana
              noua, fara istoricul vechi.
            </Text>

            {!!deleteLovedOneError && (
              <Text style={styles.giftErrorText}>{deleteLovedOneError}</Text>
            )}

            <Pressable
              style={[
                styles.saveGiftButton,
                styles.deleteConfirmButton,
                deletingLovedOne && styles.disabledButton,
              ]}
              onPress={confirmDeleteLovedOne}
              disabled={deletingLovedOne}
            >
              <Text style={styles.saveGiftButtonText}>
                {deletingLovedOne ? 'Se sterge...' : 'Sterge persoana'}
              </Text>
            </Pressable>

            <Pressable
              style={styles.cancelGiftButton}
              onPress={closeDeleteLovedOneModal}
              disabled={deletingLovedOne}
            >
              <Text style={styles.cancelGiftButtonText}>Anuleaza</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={deleteModalVisible}
        animationType="fade"
        transparent
        onRequestClose={closeDeleteModal}
      >
        <View
          style={styles.modalOverlay}
          {...getModalBackdropResponder(closeTopModal)}
        >
          <View style={styles.confirmModalCard}>
            <Text style={styles.modalTitle}>Sterge cadoul</Text>
            <Text style={styles.confirmText}>
              Sigur vrei sa stergi cadoul{' '}
              {giftPlanToDelete ? `"${giftPlanToDelete.purpose}"` : ''}?
            </Text>

            {!!deleteError && (
              <Text style={styles.giftErrorText}>{deleteError}</Text>
            )}

            <Pressable
              style={[
                styles.saveGiftButton,
                styles.deleteConfirmButton,
                deletingGift && styles.disabledButton,
              ]}
              onPress={confirmDeleteGiftPlan}
              disabled={deletingGift}
            >
              <Text style={styles.saveGiftButtonText}>
                {deletingGift ? 'Se sterge...' : 'Sterge cadoul'}
              </Text>
            </Pressable>

            <Pressable style={styles.cancelGiftButton} onPress={closeDeleteModal}>
              <Text style={styles.cancelGiftButtonText}>Anuleaza</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={giftModalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeGiftModal}
      >
        <View
          style={styles.modalOverlay}
          {...getModalBackdropResponder(closeTopModal)}
        >
          <View style={styles.giftModalCard}>
            <View style={styles.modalHandle} />

            <ScrollView
              contentContainerStyle={styles.giftModalBody}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalTitle}>
                {editingGiftPlan ? 'Editeaza cadoul' : 'Stabileste un nou cadou'}
              </Text>

              {!!giftError && <Text style={styles.giftErrorText}>{giftError}</Text>}

              <Text style={styles.modalLabel}>Scopul cadoului</Text>
              <Dropdown
                style={styles.dropdown}
                containerStyle={styles.dropdownContainer}
                placeholderStyle={styles.dropdownPlaceholder}
                selectedTextStyle={styles.dropdownSelectedText}
                data={GIFT_PURPOSE_OPTIONS}
                maxHeight={260}
                labelField="label"
                valueField="value"
                placeholder="Alege ocazia"
                value={giftPurpose}
                onChange={(item) => {
                  handlePurposeChange(item.value as GiftPurpose);
                }}
              />

              <Text style={styles.modalLabel}>
                Cumpara cadoul pana la
              </Text>
              <View style={styles.dateRow}>
                    <View style={styles.dateDropdownWrapper}>
                      <Dropdown
                        style={styles.compactDropdown}
                        containerStyle={styles.dropdownContainer}
                        placeholderStyle={styles.dropdownPlaceholder}
                        selectedTextStyle={styles.dropdownSelectedText}
                        data={DAYS}
                        maxHeight={240}
                        labelField="label"
                        valueField="value"
                        placeholder="Zi"
                        value={purchaseDeadlineDay}
                        onChange={(item) => {
                          setPurchaseDeadlineDay(item.value);
                          setGiftError('');
                        }}
                      />
                    </View>

                    <View style={styles.dateDropdownWrapper}>
                      <Dropdown
                        style={styles.compactDropdown}
                        containerStyle={styles.dropdownContainer}
                        placeholderStyle={styles.dropdownPlaceholder}
                        selectedTextStyle={styles.dropdownSelectedText}
                        data={MONTHS}
                        maxHeight={240}
                        labelField="label"
                        valueField="value"
                        placeholder="Luna"
                        value={purchaseDeadlineMonth}
                        onChange={(item) => {
                          setPurchaseDeadlineMonth(item.value);
                          setGiftError('');
                        }}
                      />
                    </View>

                    <View style={styles.dateDropdownWrapper}>
                      <Dropdown
                        style={styles.compactDropdown}
                        containerStyle={styles.dropdownContainer}
                        placeholderStyle={styles.dropdownPlaceholder}
                        selectedTextStyle={styles.dropdownSelectedText}
                        data={years}
                        maxHeight={240}
                        labelField="label"
                        valueField="value"
                        placeholder="An"
                        value={purchaseDeadlineYear}
                        onChange={(item) => {
                          setPurchaseDeadlineYear(item.value);
                          setGiftError('');
                        }}
                      />
                    </View>
              </View>

              {giftPurpose &&
              isFixedGiftPurpose(giftPurpose) &&
              !canEditFixedGiftDate ? (
                <View style={styles.duplicateInfoBox}>
                  <Text style={styles.duplicateInfoTitle}>Data oferirii</Text>
                  <Text style={styles.duplicateInfoText}>
                    {deadlineDay && deadlineMonth && deadlineYear
                      ? formatDate(
                          `${deadlineYear}-${pad(deadlineMonth)}-${pad(
                            deadlineDay
                          )}`
                        )
                      : 'Se calculeaza automat pentru aceasta ocazie.'}
                  </Text>
                  <Pressable
                    style={styles.inlineEditDateButton}
                    onPress={() => setCanEditFixedGiftDate(true)}
                  >
                    <Text style={styles.inlineEditDateButtonText}>
                      Modifica data
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <Text style={styles.modalLabel}>Data oferirii cadoului</Text>
                  <View style={styles.dateRow}>
                    <View style={styles.dateDropdownWrapper}>
                      <Dropdown
                        style={styles.compactDropdown}
                        containerStyle={styles.dropdownContainer}
                        placeholderStyle={styles.dropdownPlaceholder}
                        selectedTextStyle={styles.dropdownSelectedText}
                        data={DAYS}
                        maxHeight={240}
                        labelField="label"
                        valueField="value"
                        placeholder="Zi"
                        value={deadlineDay}
                        onChange={(item) => {
                          setDeadlineDay(item.value);
                          setGiftError('');
                        }}
                      />
                    </View>

                    <View style={styles.dateDropdownWrapper}>
                      <Dropdown
                        style={styles.compactDropdown}
                        containerStyle={styles.dropdownContainer}
                        placeholderStyle={styles.dropdownPlaceholder}
                        selectedTextStyle={styles.dropdownSelectedText}
                        data={MONTHS}
                        maxHeight={240}
                        labelField="label"
                        valueField="value"
                        placeholder="Luna"
                        value={deadlineMonth}
                        onChange={(item) => {
                          setDeadlineMonth(item.value);
                          setGiftError('');
                        }}
                      />
                    </View>

                    <View style={styles.dateDropdownWrapper}>
                      <Dropdown
                        style={styles.compactDropdown}
                        containerStyle={styles.dropdownContainer}
                        placeholderStyle={styles.dropdownPlaceholder}
                        selectedTextStyle={styles.dropdownSelectedText}
                        data={years}
                        maxHeight={240}
                        labelField="label"
                        valueField="value"
                        placeholder="An"
                        value={deadlineYear}
                        onChange={(item) => {
                          setDeadlineYear(item.value);
                          setGiftError('');
                        }}
                      />
                    </View>
                  </View>
                </>
              )}

              <View style={styles.budgetHeader}>
                <Text style={styles.modalLabel}>Buget</Text>
                <Text style={styles.budgetValue}>
                  {isCustomBudget && customBudget ? customBudget : giftBudget} RON
                </Text>
              </View>

              <View style={styles.budgetBar}>
                {BUDGET_OPTIONS.map((budget) => (
                  <Pressable
                    key={budget}
                    style={[
                      styles.budgetStep,
                      !isCustomBudget && giftBudget >= budget && styles.budgetStepActive,
                      !isCustomBudget && giftBudget === budget && styles.budgetStepSelected,
                    ]}
                    onPress={() => {
                      setGiftBudget(budget);
                      setCustomBudget('');
                      setIsCustomBudget(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.budgetStepText,
                        !isCustomBudget &&
                          giftBudget === budget &&
                          styles.budgetStepTextSelected,
                      ]}
                    >
                      {budget}
                    </Text>
                  </Pressable>
                ))}

                <Pressable
                  style={[
                    styles.budgetStep,
                    styles.customBudgetStep,
                    isCustomBudget && styles.budgetStepSelected,
                  ]}
                  onPress={() => setIsCustomBudget(true)}
                >
                  <Text
                    style={[
                      styles.budgetStepText,
                      isCustomBudget && styles.budgetStepTextSelected,
                    ]}
                  >
                    Alta
                  </Text>
                </Pressable>
              </View>

              {isCustomBudget && (
                <TextInput
                  placeholder="Introdu suma dorita"
                  style={styles.modalInput}
                  keyboardType="numeric"
                  value={customBudget}
                  onChangeText={(value) => {
                    setCustomBudget(value.replace(/[^0-9]/g, ''));
                    if (giftError) setGiftError('');
                  }}
                />
              )}

              <Pressable
                style={[styles.saveGiftButton, savingGift && styles.disabledButton]}
                onPress={saveGiftPlan}
                disabled={savingGift}
              >
                <Text style={styles.saveGiftButtonText}>
                  {savingGift
                    ? 'Se salveaza...'
                    : editingGiftPlan
                    ? 'Salveaza modificarile'
                    : 'Salveaza cadoul'}
                </Text>
              </Pressable>

              <Pressable style={styles.cancelGiftButton} onPress={closeGiftModal}>
                <Text style={styles.cancelGiftButtonText}>Inchide</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
    backgroundColor: C.bg,
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 10,
    color: C.textDim,
    fontWeight: '500',
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: C.surface2,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: R.pill,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  backButtonText: {
    color: C.textDim,
    fontWeight: '500',
    fontSize: 13,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: R.xl,
    borderWidth: 0.5,
    borderColor: C.border,
    padding: 18,
    alignItems: 'flex-start',
    shadowColor: C.text,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 14,
  },
  placeholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: C.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  placeholderText: {
    fontFamily: 'serif',
    fontSize: 40,
    fontWeight: '400',
    color: C.accent,
  },
  name: {
    fontFamily: 'serif',
    fontSize: 28,
    fontWeight: '400',
    color: C.text,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  info: {
    fontSize: 14,
    color: C.textDim,
    marginBottom: 6,
  },
  notesBox: {
    marginTop: 14,
    width: '100%',
    backgroundColor: C.surface2,
    borderRadius: R.lg,
    padding: 14,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: C.textDim,
    lineHeight: 20,
  },
  shoppingHistoryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.md,
    padding: 10,
    backgroundColor: C.surface,
    marginTop: 8,
  },
  productReactionCard: {
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.md,
    padding: 10,
    backgroundColor: C.surface2,
    marginBottom: 10,
  },
  productReactionTitle: {
    color: C.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  productReactionInput: {
    minHeight: 72,
    textAlignVertical: 'top',
    marginTop: 8,
  },
  aiHelpButton: {
    width: '100%',
    backgroundColor: C.sage,
    borderRadius: R.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  aiHelpButtonText: {
    color: C.accentInk,
    fontWeight: '700',
  },
  aiHelpTab: {
    backgroundColor: C.sage,
    borderColor: C.sage,
  },
  aiPersonBox: {
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.md,
    padding: 12,
    backgroundColor: C.surface2,
    marginBottom: 14,
  },
  aiPromptBox: {
    marginTop: 14,
  },
  aiPromptInput: {
    minHeight: 180,
    textAlignVertical: 'top',
  },
  aiChoiceRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    marginBottom: 10,
  },
  aiChoiceButton: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.md,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    backgroundColor: C.surface,
  },
  aiChoiceButtonActive: {
    backgroundColor: C.sage,
    borderColor: C.sage,
  },
  aiChoiceButtonText: {
    color: C.textDim,
    fontSize: 12,
    fontWeight: '600',
  },
  aiChoiceButtonTextActive: {
    color: C.accentInk,
  },
  disabledInput: {
    backgroundColor: C.surface2,
    color: C.textDim,
  },
  detailTabs: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    marginTop: 12,
    marginBottom: 14,
  },
  deadlineEditButton: {
    width: '100%',
    backgroundColor: C.surface2,
    borderRadius: R.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 12,
  },
  deadlineEditButtonText: {
    color: C.text,
    fontWeight: '600',
  },
  detailTab: {
    flex: 1,
    minHeight: 42,
    borderRadius: R.lg,
    borderWidth: 0.5,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface2,
  },
  detailTabActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  detailTabText: {
    color: C.textDim,
    fontWeight: '600',
    fontSize: 13,
  },
  detailTabTextActive: {
    color: C.accentInk,
  },
  productSearchBox: {
    width: '100%',
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.md,
    padding: 12,
    backgroundColor: C.surface,
  },
  manualProductBox: {
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.md,
    padding: 12,
    backgroundColor: C.surface2,
    marginTop: 10,
  },
  productDetailHeader: {
    width: '100%',
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  productDetailImage: {
    width: 96,
    height: 96,
    borderRadius: R.md,
    backgroundColor: C.surface2,
  },
  priceDetailsBox: {
    width: '100%',
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.md,
    padding: 12,
    backgroundColor: C.surface,
    marginTop: 12,
  },
  priceDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  priceDetailLabel: {
    color: C.textDim,
    fontSize: 14,
    fontWeight: '500',
  },
  priceDetailValue: {
    color: C.text,
    fontSize: 14,
    fontWeight: '600',
  },
  reducedPriceDetail: {
    color: C.sage,
    fontSize: 16,
    fontWeight: '700',
  },
  offerCard: {
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.md,
    padding: 12,
    backgroundColor: C.surface2,
    marginTop: 10,
  },
  bestOfferCard: {
    borderColor: C.sage,
    backgroundColor: C.sageBg,
  },
  freshPriceDropCard: {
    borderColor: C.accent,
    backgroundColor: C.accentSoft,
    shadowColor: C.accent,
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  offerStoreName: {
    color: C.text,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  bestOfferBadge: {
    alignSelf: 'flex-start',
    backgroundColor: C.sage,
    borderRadius: R.pill,
    color: C.accentInk,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  freshPriceDropBadge: {
    alignSelf: 'flex-start',
    backgroundColor: C.accent,
    borderRadius: R.pill,
    color: C.accentInk,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  freshPriceDropText: {
    backgroundColor: C.accentSoft,
    borderRadius: R.md,
    color: C.accent,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 10,
    padding: 10,
  },
  promoBadge: {
    alignSelf: 'flex-start',
    backgroundColor: C.accentSoft,
    borderRadius: R.pill,
    color: C.accent,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  offerLinkButton: {
    backgroundColor: C.accent,
    borderRadius: R.md,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 10,
  },
  budgetCompareBox: {
    borderWidth: 0.5,
    borderColor: C.sage,
    borderRadius: R.md,
    padding: 12,
    backgroundColor: C.sageBg,
    marginBottom: 12,
  },
  budgetCompareBoxOver: {
    borderColor: C.danger,
    backgroundColor: C.dangerBg,
  },
  budgetCompareText: {
    color: C.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  budgetOkText: {
    color: C.sage,
    fontSize: 13,
    fontWeight: '700',
  },
  budgetOverText: {
    color: C.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  updateBudgetButton: {
    backgroundColor: C.danger,
    borderRadius: R.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  updateBudgetButtonText: {
    color: C.accentInk,
    fontWeight: '700',
  },
  budgetHistoryButton: {
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: C.surface,
  },
  budgetHistoryButtonText: {
    color: C.text,
    fontWeight: '600',
  },
  keepBudgetButton: {
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.md,
    paddingVertical: 12,
    marginTop: 10,
  },
  keepBudgetButtonText: {
    color: C.text,
    fontWeight: '600',
  },
  duplicateInfoBox: {
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.md,
    padding: 12,
    backgroundColor: C.surface2,
    marginBottom: 12,
  },
  duplicateInfoTitle: {
    color: C.text,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  duplicateInfoText: {
    color: C.textDim,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  inlineEditDateButton: {
    marginTop: 10,
    backgroundColor: C.accentSoft,
    borderRadius: R.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  inlineEditDateButtonText: {
    color: C.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  budgetChartScroll: {
    marginBottom: 14,
  },
  budgetLineChart: {
    backgroundColor: C.surface,
    borderRadius: R.md,
    borderWidth: 0.5,
    borderColor: C.border,
    overflow: 'hidden',
    paddingTop: 18,
    paddingLeft: 24,
    paddingRight: 24,
    paddingBottom: 14,
    position: 'relative',
  },
  budgetChartTitleBlock: {
    position: 'absolute',
    left: 24,
    top: 18,
  },
  budgetLineChartTitle: {
    fontFamily: 'serif',
    color: C.text,
    fontSize: 28,
    fontWeight: '400',
  },
  budgetLineChartSubtitle: {
    color: C.textDim,
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  budgetLineChartYAxis: {
    position: 'absolute',
    left: 22,
    top: 104,
    height: BUDGET_CHART_PLOT_HEIGHT,
    justifyContent: 'space-between',
  },
  budgetLineChartAxisText: {
    color: C.textFaint,
    fontSize: 13,
    fontWeight: '500',
  },
  budgetLineChartPlot: {
    position: 'absolute',
    left: 92,
    top: 104,
    width: BUDGET_CHART_PLOT_WIDTH,
    height: BUDGET_CHART_PLOT_HEIGHT + 70,
  },
  budgetLineChartYAxisLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 1,
    height: BUDGET_CHART_PLOT_HEIGHT,
    backgroundColor: C.border,
  },
  budgetLineChartXAxisLine: {
    position: 'absolute',
    left: 0,
    top: BUDGET_CHART_PLOT_HEIGHT,
    width: BUDGET_CHART_PLOT_WIDTH,
    height: 1,
    backgroundColor: C.border,
  },
  budgetLineChartSegment: {
    position: 'absolute',
    height: 4,
    borderRadius: 8,
    backgroundColor: C.accent,
  },
  budgetLineChartPointWrap: {
    position: 'absolute',
    width: 54,
    alignItems: 'center',
  },
  budgetLineChartPoint: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.accent,
  },
  budgetLineChartPointValue: {
    color: C.text,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  budgetLineChartXLabel: {
    position: 'absolute',
    top: BUDGET_CHART_PLOT_HEIGHT + 20,
    width: 68,
    alignItems: 'center',
  },
  budgetLineChartMonth: {
    color: C.textFaint,
    fontSize: 16,
    fontWeight: '500',
  },
  budgetLineChartYear: {
    color: C.textFaint,
    fontSize: 13,
    fontWeight: '400',
    marginTop: 4,
  },
  budgetHistoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
    paddingVertical: 10,
  },
  budgetHistoryDate: {
    color: C.textDim,
    fontSize: 13,
    fontWeight: '500',
  },
  budgetHistoryValue: {
    color: C.sage,
    fontSize: 13,
    fontWeight: '600',
  },
  selectedProductsBox: {
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    paddingTop: 12,
    marginBottom: 12,
  },
  detailsProductsBox: {
    width: '100%',
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.md,
    padding: 12,
    backgroundColor: C.surface,
    marginBottom: 14,
  },
  productSectionTitle: {
    color: C.text,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  selectedProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.md,
    padding: 10,
    marginBottom: 8,
    backgroundColor: C.surface2,
  },
  purchasedProductRow: {
    borderColor: C.sage,
    backgroundColor: C.sageBg,
  },
  alertSelectedProductRow: {
    borderColor: C.accent,
    backgroundColor: C.accentSoft,
    shadowColor: C.accent,
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  alertProductHint: {
    alignSelf: 'flex-start',
    backgroundColor: C.accentSoft,
    borderRadius: R.pill,
    color: C.accent,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  productSuggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.md,
    padding: 10,
    marginTop: 8,
    backgroundColor: C.surface2,
  },
  productThumb: {
    width: 54,
    height: 54,
    borderRadius: R.sm,
    backgroundColor: C.surface2,
  },
  productInfo: {
    flex: 1,
    minWidth: 0,
  },
  productName: {
    color: C.text,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  productMeta: {
    color: C.textDim,
    fontSize: 12,
    fontWeight: '400',
    marginBottom: 2,
  },
  productLink: {
    color: C.accent,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  toastModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(31,27,22,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  addedProductToast: {
    width: '100%',
    maxWidth: 520,
    borderWidth: 0.5,
    borderColor: C.sage,
    borderRadius: R.md,
    backgroundColor: C.sageBg,
    padding: 12,
    gap: 10,
  },
  addedProductToastHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  addedProductSnapshot: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  addedProductToastImage: {
    width: 48,
    height: 48,
    borderRadius: R.sm,
    backgroundColor: C.surface2,
  },
  addedProductToastTitle: {
    color: C.sage,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  toastCloseButton: {
    backgroundColor: C.sageBg,
    borderRadius: R.sm,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  toastCloseButtonText: {
    color: C.sage,
    fontSize: 12,
    fontWeight: '700',
  },
  addedProductToastFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  toastDetailsButton: {
    backgroundColor: C.sage,
    borderRadius: R.sm,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  toastDetailsButtonText: {
    color: C.accentInk,
    fontSize: 12,
    fontWeight: '700',
  },
  toastProgressTrack: {
    width: '100%',
    height: 5,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: C.sageBg,
  },
  toastProgressBar: {
    height: '100%',
    borderRadius: 8,
    backgroundColor: C.sage,
  },
  purchasedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: C.sageBg,
    borderColor: C.sage,
    borderWidth: 0.5,
    borderRadius: R.pill,
    color: C.sage,
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 6,
  },
  productPriceBox: {
    alignItems: 'flex-end',
    gap: 8,
    maxWidth: 170,
  },
  productPrice: {
    fontFamily: 'serif',
    color: C.sage,
    fontSize: 14,
    fontWeight: '400',
  },
  addProductButton: {
    backgroundColor: C.accent,
    borderRadius: R.pill,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  addProductButtonText: {
    color: C.accentInk,
    fontSize: 12,
    fontWeight: '600',
  },
  removeProductButton: {
    backgroundColor: C.dangerBg,
    borderRadius: R.pill,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  changeProductButton: {
    backgroundColor: C.surface2,
    borderRadius: R.pill,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  changeProductButtonText: {
    color: C.textDim,
    fontSize: 12,
    fontWeight: '600',
  },
  purchasedButton: {
    backgroundColor: C.sage,
    borderRadius: R.pill,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  productDetailAction: {
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 12,
  },
  offerPurchaseButton: {
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 11,
  },
  purchasedButtonText: {
    color: C.accentInk,
    fontSize: 12,
    fontWeight: '600',
  },
  removeProductText: {
    color: C.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  lockedProductText: {
    color: C.sage,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
  purchasedDetailBox: {
    borderWidth: 0.5,
    borderColor: C.sage,
    borderRadius: R.md,
    backgroundColor: C.sageBg,
    padding: 12,
    marginTop: 12,
  },
  purchasedDetailTitle: {
    color: C.sage,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  editButton: {
    marginTop: 18,
    backgroundColor: C.accent,
    borderRadius: R.xl,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  editButtonText: {
    color: C.accentInk,
    fontWeight: '600',
  },
  deleteLovedOneButton: {
    marginTop: 10,
    backgroundColor: C.dangerBg,
    borderRadius: R.xl,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  deleteLovedOneButtonText: {
    color: C.danger,
    fontWeight: '600',
  },
  giftsSection: {
    backgroundColor: C.surface,
    borderRadius: R.xl,
    borderWidth: 0.5,
    borderColor: C.border,
    padding: 18,
    shadowColor: C.text,
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  sectionTitle: {
    fontFamily: 'serif',
    fontSize: 22,
    fontWeight: '400',
    color: C.text,
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  newGiftButton: {
    backgroundColor: C.accent,
    borderRadius: R.pill,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  newGiftButtonText: {
    color: C.accentInk,
    fontWeight: '600',
  },
  budgetSummaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  budgetSummaryBox: {
    flex: 1,
    backgroundColor: C.surface2,
    borderRadius: R.lg,
    borderWidth: 0.5,
    borderColor: C.border,
    padding: 12,
  },
  budgetSummaryLabel: {
    color: C.textDim,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontWeight: '500',
    marginBottom: 4,
  },
  budgetSummaryValue: {
    fontFamily: 'serif',
    color: C.text,
    fontSize: 18,
    fontWeight: '400',
  },
  historyButton: {
    backgroundColor: C.text,
    borderRadius: R.pill,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  historyButtonText: {
    color: C.accentInk,
    fontWeight: '600',
  },
  historyBox: {
    width: '100%',
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    paddingTop: 14,
  },
  historyTitle: {
    fontFamily: 'serif',
    fontSize: 18,
    fontWeight: '400',
    color: C.text,
    marginBottom: 8,
  },
  historyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emptyHistoryText: {
    color: C.textDim,
    fontSize: 14,
    lineHeight: 20,
  },
  yearGroup: {
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.lg,
    padding: 12,
    marginTop: 12,
    backgroundColor: C.surface,
  },
  yearGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 4,
  },
  yearGroupTitle: {
    flex: 1,
    fontFamily: 'serif',
    color: C.text,
    fontSize: 16,
    fontWeight: '400',
  },
  yearGroupMeta: {
    color: C.sage,
    fontSize: 13,
    fontWeight: '600',
  },
  historyItem: {
    backgroundColor: C.surface2,
    borderRadius: R.lg,
    borderWidth: 0.5,
    borderColor: C.border,
    padding: 12,
    marginTop: 10,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 6,
  },
  historyPurpose: {
    flex: 1,
    color: C.text,
    fontSize: 15,
    fontWeight: '500',
  },
  historyBudget: {
    fontFamily: 'serif',
    color: C.sage,
    fontSize: 14,
    fontWeight: '400',
  },
  historyDeadline: {
    color: C.textDim,
    fontSize: 13,
    fontWeight: '400',
    marginBottom: 6,
  },
  historyDetails: {
    color: C.textDim,
    fontSize: 13,
    lineHeight: 20,
  },
  historyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  historyActionButton: {
    backgroundColor: C.surface2,
    borderRadius: R.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  historyActionText: {
    color: C.text,
    fontSize: 13,
    fontWeight: '500',
  },
  deleteActionButton: {
    backgroundColor: C.dangerBg,
    borderColor: C.dangerBg,
  },
  deleteActionText: {
    color: C.danger,
    fontSize: 13,
    fontWeight: '500',
  },
  expiredText: {
    color: C.textFaint,
    fontSize: 13,
    fontWeight: '400',
  },
  reactionSummary: {
    fontFamily: 'serif',
    color: C.text,
    fontSize: 16,
    fontWeight: '400',
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  giftModalCard: {
    backgroundColor: C.surface,
    borderTopLeftRadius: R.xxl,
    borderTopRightRadius: R.xxl,
    maxHeight: '88%',
    minHeight: '48%',
    paddingBottom: 16,
  },
  confirmModalCard: {
    backgroundColor: C.surface,
    borderRadius: R.xl,
    margin: 16,
    padding: 20,
  },
  confirmText: {
    color: C.textDim,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 14,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: C.border,
    marginTop: 10,
    marginBottom: 6,
  },
  giftModalBody: {
    padding: 16,
  },
  modalTitle: {
    fontFamily: 'serif',
    fontSize: 24,
    fontWeight: '400',
    color: C.text,
    marginBottom: 14,
    letterSpacing: -0.4,
  },
  giftErrorText: {
    color: C.danger,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textDim,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  dropdown: {
    height: 50,
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.lg,
    paddingHorizontal: 12,
    backgroundColor: C.surface,
    marginBottom: 14,
  },
  dropdownContainer: {
    borderRadius: R.lg,
    borderColor: C.border,
  },
  dropdownPlaceholder: {
    color: C.textFaint,
    fontSize: 14,
  },
  dropdownSelectedText: {
    color: C.text,
    fontSize: 14,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  dateDropdownWrapper: {
    flex: 1,
  },
  compactDropdown: {
    height: 50,
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.lg,
    paddingHorizontal: 10,
    backgroundColor: C.surface,
  },
  modalInput: {
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    backgroundColor: C.surface,
    color: C.text,
    fontSize: 14,
  },
  imageButton: {
    backgroundColor: C.surface2,
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.lg,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  imageButtonText: {
    color: C.textDim,
    fontSize: 14,
    fontWeight: '500',
  },
  purchasePreviewImage: {
    width: 86,
    height: 86,
    borderRadius: R.lg,
    backgroundColor: C.surface2,
    marginBottom: 14,
  },
  modalTextArea: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  reactionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  reactionButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: R.md,
    borderWidth: 0.5,
    borderColor: C.border,
    backgroundColor: C.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionButtonSelected: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  reactionText: {
    color: C.textDim,
    fontSize: 18,
    fontWeight: '500',
  },
  reactionTextSelected: {
    color: C.accentInk,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  budgetValue: {
    fontFamily: 'serif',
    color: C.sage,
    fontSize: 15,
    fontWeight: '400',
  },
  budgetBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 18,
  },
  budgetStep: {
    flex: 1,
    minHeight: 38,
    borderRadius: R.md,
    borderWidth: 0.5,
    borderColor: C.border,
    backgroundColor: C.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customBudgetStep: {
    minWidth: 44,
  },
  budgetStepActive: {
    backgroundColor: C.sageBg,
    borderColor: C.sage,
  },
  budgetStepSelected: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  budgetStepText: {
    color: C.textDim,
    fontSize: 11,
    fontWeight: '500',
  },
  budgetStepTextSelected: {
    color: C.accentInk,
  },
  saveGiftButton: {
    backgroundColor: C.accent,
    borderRadius: R.xl,
    paddingVertical: 14,
    alignItems: 'center',
  },
  aiChangeButton: {
    backgroundColor: C.sage,
    borderRadius: R.lg,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  deleteConfirmButton: {
    backgroundColor: C.danger,
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveGiftButtonText: {
    color: C.accentInk,
    fontWeight: '600',
  },
  cancelGiftButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 8,
  },
  cancelGiftButtonText: {
    color: C.textFaint,
    fontWeight: '500',
  },
});
