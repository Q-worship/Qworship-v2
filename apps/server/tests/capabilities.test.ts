import {
  FEATURE_IDS, FREE_HOURS, FREE_SONG_LIMIT, TRIAL_DAYS, TRIAL_HOURS,
  FEATURES, bibleVersionNeedsPlan, featureMapFor, featuresFor, hasFeature,
} from '@qworship/shared';
import { capabilitiesForAccount } from '../src/modules/billing/capability.service.js';
import { trialGrantFor } from '../src/modules/billing/trial.service.js';
import { hoursPerChurchOf, isTrialing, trialDaysRemaining } from '../src/modules/organization/account.model.js';

/**
 * The plan rules, exercised without a database or a server.
 *
 * Everything here is pure on purpose: what a plan includes, what a trial
 * grants, and when a trial has lapsed are the three answers that decide
 * whether a church can work on a Sunday, so they are the ones worth being
 * able to run anywhere on every change.
 */

let pass = 0, fail = 0;
const check = (l: string, ok: boolean, d = '') => {
  ok ? (pass++, console.log(`  PASS  ${l}`)) : (fail++, console.log(`  FAIL  ${l}${d ? ' :: ' + d : ''}`));
};

const DAY = 24 * 60 * 60 * 1000;
const inDays = (n: number) => new Date(Date.now() + n * DAY);

console.log('');

// ── What each plan includes ────────────────────────────────────────────────

check('free includes no premium capability', featuresFor('free').length === 0);
check('standard includes every premium capability', featuresFor('standard').length === FEATURE_IDS.length);

check(
  'a trial grants the full Standard set',
  featuresFor('free', true).length === FEATURE_IDS.length,
  'the trial is Standard, free, for thirty days',
);

check('free cannot use other Bible versions', !hasFeature('free', 'bible.allVersions'));
check('standard can use other Bible versions', hasFeature('standard', 'bible.allVersions'));
check('a trialing free account can use them too', hasFeature('free', 'bible.allVersions', true));

check(
  'the feature map answers false for everything on free',
  Object.values(featureMapFor('free')).every((v) => v === false),
);
check(
  'the feature map answers true for everything on standard',
  Object.values(featureMapFor('standard')).every((v) => v === true),
);

// ── What free keeps ────────────────────────────────────────────────────────

check('KJV needs no plan', !bibleVersionNeedsPlan('KJV'));
check('KJV is matched case-insensitively', !bibleVersionNeedsPlan('kjv'));
check('NIV needs a plan', bibleVersionNeedsPlan('NIV'));
check(
  'a missing version is not treated as premium',
  !bibleVersionNeedsPlan(undefined),
  'an unreadable request must not refuse somebody mid-service',
);

// ── When a trial is live ───────────────────────────────────────────────────

check('a trial with days left is live', isTrialing({ status: 'trialing', trialEndsAt: inDays(5) }));
check('a trial past its end date is not', !isTrialing({ status: 'trialing', trialEndsAt: inDays(-1) }));
check(
  'a lapsed trial is dead before the sweep notices',
  !isTrialing({ status: 'trialing', trialEndsAt: inDays(-0.001) }),
  'the status alone would still read trialing for up to an hour',
);
check('an active account is not trialing', !isTrialing({ status: 'active', trialEndsAt: inDays(5) }));
check('a trial with no end date is not live', !isTrialing({ status: 'trialing' }));

check('days remaining rounds up', trialDaysRemaining({ trialEndsAt: inDays(4.2) }) === 5);
check('days remaining never goes negative', trialDaysRemaining({ trialEndsAt: inDays(-9) }) === 0);

// ── Hours ──────────────────────────────────────────────────────────────────

check(
  'a free church gets the free allowance',
  hoursPerChurchOf({ planId: 'free', status: 'active' }) === FREE_HOURS,
);
check(
  'a trialing church gets the TRIAL allowance, not the free one',
  hoursPerChurchOf({ planId: 'free', status: 'trialing', trialEndsAt: inDays(10) }) === TRIAL_HOURS,
);
check(
  'a trial keeps the hours it was granted when the catalog changes',
  hoursPerChurchOf({ planId: 'free', status: 'trialing', trialEndsAt: inDays(10), trialHours: 9 }) === 9,
  'changing TRIAL_HOURS must not shorten a trial already running',
);
check(
  'a paid church keeps the rate it bought',
  hoursPerChurchOf({ planId: 'standard', hoursPerChurch: 30, status: 'active' }) === 30,
);
check(
  'a legacy pooled row is divided back out per church',
  hoursPerChurchOf({ planId: 'standard', monthlyHours: 90, slots: 3, status: 'active' }) === 30,
);

// ── Buying hours must never buy features ──────────────────────────────────
//
// The structural guarantee is the signature of `capabilitiesForAccount`: it
// is handed planId, status and trialEndsAt, and there is no hours field for
// it to be influenced by. These lock that in, so a later "helpful" change
// that passes hours through fails here rather than in production.

check(
  'a free church that has bought hours still has no premium features',
  Object.values(capabilitiesForAccount({ planId: 'free', status: 'active' }).features)
    .every((v) => v === false),
  'top-ups sell transcription time, never the feature set',
);

check(
  'a cancelled Standard account loses its premium features',
  Object.values(capabilitiesForAccount({ planId: 'standard', status: 'cancelled' }).features)
    .every((v) => v === false),
);

check(
  'a past_due Standard account KEEPS its features',
  Object.values(capabilitiesForAccount({ planId: 'standard', status: 'past_due' }).features)
    .every((v) => v === true),
  'a card failing on Saturday must not strip a church on Sunday',
);

check(
  'a resolved verdict is marked resolved',
  capabilitiesForAccount({ planId: 'free', status: 'active' }).resolved === true,
  'only a confident verdict may refuse anybody',
);

// ── The canvas is free, in full ────────────────────────────────────────────

check(
  'the canvas is not a gated capability at all',
  !FEATURE_IDS.includes('canvas.rich' as never),
  'client-side only, so there is no line we could hold — we do not sell one',
);
check(
  'PowerPoint import is not a gated capability either',
  !FEATURE_IDS.includes('powerpoint.import' as never),
  'parsed in the browser; the server never sees the file',
);
check(
  'every gated capability the server can actually refuse is enforceable',
  FEATURE_IDS.filter((id) => !FEATURES[id].enforceable)
    .every((id) => id === 'projection.multiWindow' || id === 'support.priority'),
  'anything else unenforceable in this list is a promise we cannot keep',
);

// ── Songs ──────────────────────────────────────────────────────────────────

check(
  'free does not hold the full song book',
  !hasFeature('free', 'songs.full'),
);
check('standard does', hasFeature('standard', 'songs.full'));
check(
  'a trialing church gets the full song book',
  hasFeature('free', 'songs.full', true),
);
check(
  'the free song cap is a real number',
  Number.isInteger(FREE_SONG_LIMIT) && FREE_SONG_LIMIT > 0,
  String(FREE_SONG_LIMIT),
);

// ── Who gets a trial ───────────────────────────────────────────────────────

const fresh = trialGrantFor({});
check('a brand-new account starts a trial', fresh.status === 'trialing');
check(
  `a new trial runs ${TRIAL_DAYS} days`,
  Math.round((fresh.trialEndsAt!.getTime() - fresh.trialStartedAt!.getTime()) / DAY) === TRIAL_DAYS,
);

check(
  'a legacy trial still running is honoured, not restarted',
  (() => {
    const ends = inDays(19);
    const grant = trialGrantFor({ trialStatus: 'active', trialEndDate: ends });
    return grant.status === 'trialing' && grant.trialEndsAt!.getTime() === ends.getTime();
  })(),
  'somebody eleven days in keeps nineteen days, not a fresh thirty',
);

check(
  'a lapsed legacy trial does not get a second one',
  trialGrantFor({ trialStatus: 'expired', trialEndDate: inDays(-3) }).status === 'active',
);
check(
  'a converted user is not put on a trial',
  trialGrantFor({ trialStatus: 'converted' }).status === 'active',
);
check(
  'an actively subscribed user is not put on a trial',
  trialGrantFor({ subscriptionStatus: 'active' }).status === 'active',
);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail > 0 ? 1 : 0);
