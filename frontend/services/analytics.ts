import PostHog from 'posthog-react-native';

const KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

let client: PostHog | null = null;

export function initAnalytics() {
  if (!KEY || client || __DEV__) return;
  client = new PostHog(KEY, {
    host: HOST,
    flushAt: 10,
    flushInterval: 30000,
  });
}

export function identifyUser(uid: string, props?: Record<string, any>) {
  client?.identify(uid, props);
}

export function resetAnalyticsUser() {
  client?.reset();
}

export function track(event: string, props?: Record<string, any>) {
  client?.capture(event, props ?? {});
}

export const Events = {
  APP_OPEN: 'app_open',
  REGISTER: 'register',
  LOGIN: 'login',
  LOGOUT: 'logout',

  LOVED_ONE_ADDED: 'loved_one_added',
  GIFT_PLAN_CREATED: 'gift_plan_created',
  GIFT_PLAN_COMPLETED: 'gift_plan_completed',

  PRODUCT_ADDED_TO_PLAN: 'product_added_to_plan',
  AFFILIATE_LINK_CLICKED: 'affiliate_link_clicked',
  PROMO_CODE_COPIED: 'promo_code_copied',

  GIFTBOT_USED: 'giftbot_used',
  GIFTBOT_PRODUCT_ADDED: 'giftbot_product_added',

  NOTIFICATION_OPENED: 'notification_opened',
  PRICE_ALERT_VIEWED: 'price_alert_viewed',

  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  ONBOARDING_SKIPPED: 'onboarding_skipped',
} as const;
