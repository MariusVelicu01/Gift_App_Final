import { Request, Response } from 'express';
import { db } from '../config/firebase';

type UserGender = 'male' | 'female' | 'unknown';

function getYearFromDateKey(value?: string) {
  const match = String(value || '').match(/^(\d{4})-/);
  return match ? Number(match[1]) : null;
}

function dateKeyToTimestamp(value?: string) {
  if (!value) return null;

  const [year, month, day] = String(value).split('-').map(Number);
  const date = new Date(year, month - 1, day);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function daysBetween(startDate?: string, endDate?: string) {
  const start = dateKeyToTimestamp(startDate);
  const end = dateKeyToTimestamp(endDate);

  if (start === null || end === null) return null;

  return Math.round((end - start) / 86400000);
}

function getUidFromGiftPlanPath(path: string) {
  const parts = path.split('/');
  const userIndex = parts.indexOf('users');

  return userIndex >= 0 ? parts[userIndex + 1] || '' : '';
}

function getCompletedDateKey(giftPlan: any) {
  const completedAt = String(giftPlan.completedAt || '').trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(completedAt)) {
    return completedAt;
  }

  const date = new Date(completedAt);
  if (Number.isNaN(date.getTime())) return '';

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

function getCreatedDateKey(giftPlan: any) {
  const createdAt = String(giftPlan.createdAt || '').trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(createdAt)) {
    return createdAt;
  }

  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '';

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

export async function getUserStatistics(req: Request, res: Response) {
  try {
    const snapshot = await db.collectionGroup('giftPlans').get();
    const userIds = Array.from(
      new Set(snapshot.docs.map((doc) => getUidFromGiftPlanPath(doc.ref.path)).filter(Boolean))
    );
    const userGenderById = new Map<string, UserGender>();

    await Promise.all(
      userIds.map(async (uid) => {
        const userDoc = await db.collection('users').doc(uid).get();
        const gender = String(userDoc.data()?.gender || 'unknown') as UserGender;
        userGenderById.set(
          uid,
          ['male', 'female', 'unknown'].includes(gender) ? gender : 'unknown'
        );
      })
    );

    const giftPlans = snapshot.docs.map((doc) => {
      const data = doc.data();
      const uid = getUidFromGiftPlanPath(doc.ref.path);
      const purchaseDeadlineDate = data.purchaseDeadlineDate || data.deadlineDate || '';
      const completedDate = getCompletedDateKey(data);
      const createdDate = getCreatedDateKey(data);
      const daysToPurchase =
        data.daysUntilCompleted !== undefined
          ? Number(data.daysUntilCompleted)
          : daysBetween(createdDate, completedDate);
      const delayDays =
        completedDate && purchaseDeadlineDate
          ? Math.max(0, daysBetween(purchaseDeadlineDate, completedDate) || 0)
          : null;
      const purchasedOnTime =
        completedDate && purchaseDeadlineDate ? completedDate <= purchaseDeadlineDate : null;

      return {
        id: data.id || doc.id,
        userId: uid,
        userGender: userGenderById.get(uid) || 'unknown',
        purpose: data.purpose || '',
        year: getYearFromDateKey(data.deadlineDate),
        budget: Number(data.budget || 0),
        status: data.status || 'planned',
        createdAt: data.createdAt || '',
        deadlineDate: data.deadlineDate || '',
        purchaseDeadlineDate,
        completedAt: completedDate,
        daysToPurchase:
          Number.isFinite(daysToPurchase) && daysToPurchase !== null ? daysToPurchase : null,
        delayDays,
        purchasedOnTime,
        selectedProducts: Array.isArray(data.selectedProducts)
          ? data.selectedProducts.map((product: any) => ({
              storeId: String(product?.storeId || ''),
              storeName: String(product?.storeName || ''),
              name: String(product?.name || ''),
              brand: String(product?.brand || ''),
              category: String(product?.category || ''),
              subcategory: String(product?.subcategory || ''),
              productKey: String(product?.productKey || ''),
              isPurchased: Boolean(product?.isPurchased),
              purchasedStoreName: String(product?.purchasedStoreName || ''),
              selectedAsCheapestOffer:
                product?.selectedAsCheapestOffer !== undefined
                  ? Boolean(product?.selectedAsCheapestOffer)
                  : String(product?.storeId || '') !== 'manual',
              manualSearchFallback:
                product?.manualSearchFallback !== undefined
                  ? Boolean(product?.manualSearchFallback)
                  : String(product?.storeId || '') === 'manual',
            }))
          : [],
      };
    });

    const years = Array.from(
      new Set(giftPlans.map((giftPlan) => giftPlan.year).filter((year) => typeof year === 'number'))
    ).sort((a, b) => b - a);
    const purposes = Array.from(
      new Set(giftPlans.map((giftPlan) => String(giftPlan.purpose || '').trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    return res.status(200).json({
      years,
      purposes,
      giftPlans,
    });
  } catch (error) {
    console.error('GET USER STATISTICS ERROR:', error);
    return res.status(500).json({ message: 'Nu am putut calcula statisticile userilor.' });
  }
}
