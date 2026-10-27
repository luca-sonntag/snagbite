import { excerpt, maskEmail } from './privacy.js';
import type {
  AlertEventMap,
  AlertEventType,
  FormatContext,
  FormattedAlert,
  SignupMethod,
} from './types.js';

type Formatter<K extends AlertEventType> = (
  payload: AlertEventMap[K],
  ctx: FormatContext,
) => FormattedAlert;

/** One formatter per event type — adding an event without one fails to compile. */
type AlertFormatters = { [K in AlertEventType]: Formatter<K> };

const SIGNUP_METHOD_LABEL: Record<SignupMethod, string> = {
  email: 'E-Mail & Passwort',
  google: 'Google',
  'google-one-tap': 'Google One-Tap',
  oauth: 'OAuth',
  unknown: 'unbekannt',
};

const FEEDBACK_EXCERPT_LENGTH = 200;
const JOB_DETAIL_LENGTH = 160;

/** Appends the masked e-mail line only when PII rendering is enabled. */
function emailLine(email: string | null, ctx: FormatContext): string[] {
  if (!ctx.includePii) return [];
  const masked = maskEmail(email);
  return masked ? [`E-Mail: ${masked}`] : [];
}

const formatters: AlertFormatters = {
  'user.signed_up': (p, ctx) => ({
    title: p.userNumber !== null ? `Neuer User #${p.userNumber}` : 'Neuer User',
    message: [`Registrierung via ${SIGNUP_METHOD_LABEL[p.method]}`, ...emailLine(p.email, ctx)].join('\n'),
    priority: 3,
    tags: ['tada'],
    clickUrl: ctx.adminUrl,
  }),

  'user.deleted': (p, ctx) => ({
    title: 'Account gelöscht',
    message: [
      p.accountAgeDays !== null ? `Konto-Alter: ${p.accountAgeDays} Tage` : 'Konto-Alter: unbekannt',
      ...emailLine(p.email, ctx),
    ].join('\n'),
    priority: 2,
    tags: ['wave'],
    clickUrl: ctx.adminUrl,
  }),

  'subscription.changed': (p, ctx) => {
    const isUpgrade = p.newTier === 'premium';
    return {
      title: `Abo: ${p.previousTier ?? 'unbekannt'} → ${p.newTier}`,
      message: `Quelle: ${p.source === 'revenuecat' ? 'RevenueCat' : 'Client-Fallback (kein RevenueCat-Key)'}`,
      priority: isUpgrade ? 4 : 3,
      tags: [isUpgrade ? 'moneybag' : 'chart_with_downwards_trend'],
      clickUrl: ctx.adminUrl,
    };
  },

  'feedback.created': (p, ctx) => ({
    title: p.feedbackType === 'idea' ? 'Neue Idee' : 'Neuer Bug-Report',
    message: [
      ctx.includePii ? excerpt(p.message, FEEDBACK_EXCERPT_LENGTH) : `${p.message.length} Zeichen`,
      ...(p.screenshotCount > 0 ? [`Screenshots: ${p.screenshotCount}`] : []),
    ].join('\n'),
    priority: 3,
    tags: [p.feedbackType === 'idea' ? 'bulb' : 'bug'],
    clickUrl: ctx.adminUrl,
  }),

  'job.failed': (p, ctx) => ({
    title: 'Extraktion fehlgeschlagen',
    message: [
      `Code: ${p.errorCode}`,
      `Quelle: ${p.source}`,
      ...(p.detail ? [`Detail: ${excerpt(p.detail, JOB_DETAIL_LENGTH)}`] : []),
    ].join('\n'),
    priority: 3,
    tags: ['warning'],
    clickUrl: ctx.adminUrl,
  }),
};

/** Renders an event into a channel-neutral alert. */
export function formatAlert<K extends AlertEventType>(
  type: K,
  payload: AlertEventMap[K],
  ctx: FormatContext,
): FormattedAlert {
  const format: Formatter<K> = formatters[type];
  return format(payload, ctx);
}
