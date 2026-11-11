import { useState } from 'react';
import { Redirect, useLocation } from 'wouter';
import { Check } from 'lucide-react';
import { FREE_HOURS, TRIAL_DAYS } from '@qworship/shared';
import { useAuthStore } from '@/features/auth/auth.store';
import { useContinueFree } from '@/hooks/useBilling';
import { useToast } from '@/hooks/use-toast';
import { images } from '@/lib/theme';

/**
 * What a church sees when its trial runs out: buy, or stay on free.
 *
 * There used to be a third option — "Extend Free Trial" — which called an
 * endpoint that awarded another thirty days to anyone who pressed it, as
 * often as they liked. That made the trial unbounded and the paywall
 * decorative, so both the button and the endpoint are gone.
 *
 * The free plan is now a real place to land rather than a euphemism for
 * being locked out, so the second option is honest: the church keeps working
 * with {FREE_HOURS} hours a month and KJV, and everything premium is visible
 * but locked.
 */
export default function TrialExpiredPage() {
  const [, navigate] = useLocation();
  const user = useAuthStore((state) => state.user);
  const { toast } = useToast();
  const continueFree = useContinueFree();

  const [settled, setSettled] = useState(false);

  if (!localStorage.getItem('token')) {
    return <Redirect to="/login" />;
  }

  const firstName = user?.firstName || user?.email?.split('@')[0] || 'there';

  const handleContinueFree = async () => {
    try {
      await continueFree.mutateAsync();
      setSettled(true);
    } catch (error: any) {
      toast({
        title: 'Could not switch to the free plan',
        description: error?.message || 'Please try again, or contact support.',
        variant: 'destructive',
      });
    }
  };

  if (settled) {
    return <FreePlanConfirmed onContinue={() => navigate('/project-selection')} onUpgrade={() => navigate('/dashboard-subscription/plans')} />;
  }

  return (
    <Shell>
      <div className="relative mx-auto mb-8 flex items-center justify-center">
        <img src={images.logo || '/Photos/logo.png'} alt="Q-worship" className="h-16 w-16 object-contain" />
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-white sm:text-4xl">
        Your free trial has ended
      </h1>
      <p className="mt-3 text-sm text-gray-400">
        Purchase a subscription to continue
      </p>

      <p className="mx-auto mt-10 max-w-xl text-sm leading-relaxed text-gray-300 sm:text-base">
        Hi {firstName}, your Q-worship {TRIAL_DAYS} day free trial has ended. Don't worry — your
        projects remain safe. Upgrade now, or stay on the Q-worship free plan with {FREE_HOURS}{' '}
        hours a month of hands-free Bible and transcription.
      </p>

      <div className="mt-12 flex flex-col items-center gap-5">
        <button
          type="button"
          onClick={() => navigate('/dashboard-subscription/plans')}
          className="w-full max-w-sm rounded-lg bg-[#8b3dff] px-8 py-4 text-base font-bold text-white transition hover:bg-[#7a2df0]"
        >
          Upgrade now
        </button>

        <button
          type="button"
          onClick={handleContinueFree}
          disabled={continueFree.isPending}
          className="text-sm font-bold text-[#00d2b4] transition hover:text-[#00e8c6] disabled:opacity-50"
        >
          {continueFree.isPending ? 'Switching…' : 'Continue with Free Plan'}
        </button>
      </div>
    </Shell>
  );
}

/**
 * The confirmation, once the account is actually on free.
 *
 * Shown only after the server has settled the account, never optimistically.
 * Telling somebody their plan is in place before it is would be the one
 * claim on this screen they could easily catch us getting wrong.
 */
function FreePlanConfirmed({ onContinue, onUpgrade }: { onContinue: () => void; onUpgrade: () => void }) {
  return (
    <Shell>
      <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-[#00c4b4]">
        <Check className="h-12 w-12 stroke-[3] text-white" />
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-white sm:text-4xl">
        Your new free plan is in place
      </h1>
      <p className="mt-4 text-sm text-gray-400 sm:text-base">
        Congratulations! Your new free plan starts today. Enjoy Q-worship cloud.
      </p>

      <div className="mt-14 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <button
          type="button"
          onClick={onUpgrade}
          className="w-full rounded-lg bg-[#8b3dff] px-10 py-4 text-base font-bold text-white transition hover:bg-[#7a2df0] sm:w-auto"
        >
          Upgrade now
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="w-full rounded-lg border border-[#00c4b4] px-10 py-4 text-base font-bold text-[#00c4b4] transition hover:bg-[#00c4b4]/10 sm:w-auto"
        >
          Continue to dashboard
        </button>
      </div>
    </Shell>
  );
}

/** The shared dark card both screens sit in. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#15102b] p-4 text-white selection:bg-purple-500 sm:p-6">
      <div className="w-full max-w-3xl rounded-3xl bg-[#1a1333] px-6 py-16 text-center sm:px-12 sm:py-20">
        {children}
      </div>
    </main>
  );
}
