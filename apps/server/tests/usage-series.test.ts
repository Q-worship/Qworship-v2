import { resolveRange, type Granularity } from '../src/modules/usage/usage.series.js';

/**
 * Range resolution, without a database.
 *
 * `resolveRange` decides the window and the bucket size for every option the
 * usage screen offers, so it is the part worth pinning down: an off-by-one
 * here shows a church the wrong month of its own usage.
 */

let pass = 0, fail = 0;
const check = (l: string, ok: boolean, d = '') => {
  ok ? (pass++, console.log(`  PASS  ${l}`)) : (fail++, console.log(`  FAIL  ${l}${d ? ' :: ' + d : ''}`));
};
const DAY = 24 * 60 * 60 * 1000;
const spanDays = (r: { from: Date; to: Date }) => Math.round((r.to.getTime() - r.from.getTime()) / DAY);

console.log('');

const d7 = resolveRange({ preset: '7d' });
check('last 7 days spans 7 days', spanDays(d7) === 7, `${spanDays(d7)}`);
check('last 7 days is cut into days', d7.granularity === 'day', d7.granularity);

const d30 = resolveRange({ preset: '30d' });
check('last 30 days spans 30 days', spanDays(d30) === 30, `${spanDays(d30)}`);
check('last 30 days is cut into days', d30.granularity === 'day', d30.granularity);

const d90 = resolveRange({ preset: '90d' });
check('last 90 days spans 90 days', spanDays(d90) === 90, `${spanDays(d90)}`);
check('last 90 days is cut into weeks, not 90 bars', d90.granularity === 'week', d90.granularity);

check('weekly is four weeks of weeks', spanDays(resolveRange({ preset: 'weekly' })) === 28);
check('monthly is cut into months', resolveRange({ preset: 'monthly' }).granularity === 'month');

// Today must be a WHOLE bucket, or the latest bar always looks like a collapse.
const endsTomorrow = resolveRange({ preset: '7d' }).to.getTime() > Date.now();
check('the range ends after now, so today is a complete bucket', endsTomorrow);

// Custom ranges.
const custom = resolveRange({ preset: 'custom', from: '2026-03-01', to: '2026-03-31' });
check('a custom month includes its last day', spanDays(custom) === 31, `${spanDays(custom)} days`);
check('a custom month is cut into days', custom.granularity === 'day', custom.granularity);
check(
  'a custom season is cut into weeks',
  resolveRange({ preset: 'custom', from: '2026-01-01', to: '2026-03-31' }).granularity === 'week',
);
check(
  'a custom year is cut into months',
  resolveRange({ preset: 'custom', from: '2025-01-01', to: '2026-01-01' }).granularity === 'month',
);

// An explicit granularity always wins — this is what Sunday-to-Sunday needs.
const sundays = resolveRange({ preset: '90d', granularity: 'sunday' as Granularity });
check('an explicit granularity overrides the preset default', sundays.granularity === 'sunday');

// Defensive cases.
check(
  'a backwards custom range does not invert',
  resolveRange({ preset: 'custom', from: '2026-06-01', to: '2026-01-01' }).to >
    resolveRange({ preset: 'custom', from: '2026-06-01', to: '2026-01-01' }).from,
);
check(
  'an absurd range is clamped rather than refused',
  spanDays(resolveRange({ preset: 'custom', from: '1999-01-01', to: '2026-01-01' })) <= 732,
);
check('garbage dates fall back to a usable window', spanDays(resolveRange({ preset: 'custom', from: 'nonsense' })) > 0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
