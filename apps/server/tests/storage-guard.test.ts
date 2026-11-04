import { BYTES_PER_GB } from '@qworship/shared';
import { verdictFor, type StorageAllowance } from '../src/modules/usage/storage.guard.js';

/**
 * The storage policy, exercised without a database or a server.
 *
 * `verdictFor` is pure precisely so this can be: the rules about refusing an
 * upload are the ones worth being able to run anywhere, on every change.
 */

const allowance = (usedGb: number, limitGb = 1): StorageAllowance => ({
  organizationId: 'org',
  churchName: 'Test Church',
  accountId: 'acct',
  limitGb,
  limitBytes: limitGb * BYTES_PER_GB,
  usedBytes: usedGb * BYTES_PER_GB,
  remainingBytes: Math.max(0, (limitGb - usedGb) * BYTES_PER_GB),
});
const gb = (n: number) => n * BYTES_PER_GB;

let pass = 0, fail = 0;
const check = (l: string, ok: boolean, d = '') => {
  ok ? (pass++, console.log(`  PASS  ${l}`)) : (fail++, console.log(`  FAIL  ${l}${d ? ' :: ' + d : ''}`));
};

console.log('');

// The headline case from the notes: a Free church putting 50 GB against 1 GB.
const free = allowance(0);
check(
  'a Free church cannot upload 50 GB against its 1 GB',
  verdictFor(free, gb(50)).state === 'deny',
  verdictFor(free, gb(50)).state,
);

check(
  'an upload that fits is allowed',
  verdictFor(allowance(0.1), gb(0.2)).state === 'ok',
);

check(
  'an upload that exactly fills the allowance is allowed, and warns',
  verdictFor(allowance(0.5), gb(0.5)).state === 'warn',
  'the limit is a ceiling to reach, not a thing to stay under — but filling it is worth a notice',
);

check(
  'one byte past the allowance is refused',
  verdictFor(allowance(0.5), gb(0.5) + 1).state === 'deny',
);

check(
  'a full church is refused even a tiny upload',
  verdictFor(allowance(1), 1).state === 'deny',
);

// Warn-before-you-block: crossing 80% warns, sitting above it does not nag.
const crossing = verdictFor(allowance(0.7), gb(0.15));
check(
  'crossing 80% warns rather than refusing',
  crossing.state === 'warn',
  crossing.state,
);
check(
  'the warning carries the figures to act on',
  crossing.state === 'warn' && crossing.limitGb === 1 && crossing.usedGb === 0.85,
  crossing.state === 'warn' ? `${crossing.usedGb}/${crossing.limitGb} GB` : crossing.state,
);
check(
  'a church already above 80% is not warned again',
  verdictFor(allowance(0.9), gb(0.05)).state === 'ok',
  'the notice is sent on crossing, not on every upload',
);

// The batch is judged as a whole, so a multi-file upload cannot half-land.
check(
  'a batch that only fits in part is refused whole',
  verdictFor(allowance(0.6), gb(0.3) + gb(0.3)).state === 'deny',
);

// Standard's 10 GB, to prove the limit is read rather than assumed.
check(
  'the same upload that fails on Free succeeds on Standard',
  verdictFor(allowance(0, 1), gb(5)).state === 'deny' &&
    verdictFor(allowance(0, 10), gb(5)).state !== 'deny',
);

const denial = verdictFor(allowance(0.9), gb(5));
check(
  'a refusal reports used, limit and what was asked for',
  denial.state === 'deny' && denial.usedGb === 0.9 && denial.limitGb === 1 && denial.incomingGb === 5,
  denial.state === 'deny' ? `${denial.usedGb}/${denial.limitGb}, wanted ${denial.incomingGb}` : denial.state,
);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
