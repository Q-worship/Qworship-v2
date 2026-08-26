import React, { useState } from 'react';
import { Redirect, useLocation } from 'wouter';
import { Check, Calendar, AlertTriangle, Radio, Sparkles, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/features/auth/auth.store';
import { extendSelfTrialApi } from '@/lib/authApi';
import { useToast } from '@/hooks/use-toast';
import { images } from '@/lib/theme';

export default function TrialExpiredPage() {
  const [, navigate] = useLocation();
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const { toast } = useToast();

  const [isExtended, setIsExtended] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const [extendedUserData, setExtendedUserData] = useState<any>(null);

  // If not logged in at all, redirect to login
  if (!localStorage.getItem('token')) {
    return <Redirect to="/login" />;
  }

  const firstName = user?.firstName || user?.email?.split('@')[0] || 'there';

  const handleExtendTrial = async () => {
    try {
      setIsExtending(true);
      const res = await extendSelfTrialApi();
      if (res.success && res.user) {
        setExtendedUserData(res.user);
        // Switch to the Confirmation Screen (Screen 2) first
        setIsExtended(true);
        toast({
          title: "Trial Extended",
          description: "Your 30-day free trial has been successfully activated!",
        });
      }
    } catch (err: any) {
      toast({
        title: "Extension Failed",
        description: err.message || "Failed to extend trial. Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsExtending(false);
    }
  };

  const handleContinueToPresentations = () => {
    // Commit new active state to auth store and route into the presentation workspace
    if (extendedUserData) {
      setAuth({
        ...user,
        ...extendedUserData,
        trialStatus: 'active',
      });
    } else if (user) {
      setAuth({
        ...user,
        trialStatus: 'active',
      });
    }
    navigate('/project-selection');
  };

  // ─────────────────────────────────────────────────────────────
  // SCREEN 2: SUCCESS STATE (Image 1: "Your new free trial is in place")
  // ─────────────────────────────────────────────────────────────
  if (isExtended) {
    return (
      <main className="min-h-screen bg-[#0d071d] text-white flex flex-col justify-center items-center px-4 py-12 selection:bg-purple-500 selection:text-white">
        <div className="w-full max-w-5xl mx-auto">
          {/* Top Checkmark Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-full bg-[#00d2b4] text-[#0d071d] flex items-center justify-center mx-auto mb-4 shadow-[0_0_35px_rgba(0,210,180,0.35)]">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Your new free trial is in place
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-gray-300">
              Congratulations {firstName} ! You have another 30 days to enjoy Q-worship cloud Pro.
            </p>
          </div>

          {/* Section Heading */}
          <div className="mb-4">
            <h2 className="text-xs sm:text-sm font-medium text-gray-300">
              What&apos;s included in your free trial
            </h2>
          </div>

          {/* 3-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {/* Column 1: Features List */}
            <div className="bg-[#150d27] border border-white/5 rounded-2xl p-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2.5 text-[#00d2b4]">
                  <Radio className="w-5 h-5" />
                  <h3 className="text-sm sm:text-base font-semibold text-purple-200">
                    Features
                  </h3>
                </div>

                <ul className="space-y-2.5 text-xs text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-pink-500 font-bold">✓</span>
                    <span>Online Voice Bible Search (6+ Bibles)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-pink-500 font-bold">✓</span>
                    <span>On-screen Bible - 6+ Bibles</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-pink-500 font-bold">✓</span>
                    <span>Rich Slide Canvas – text, elements, images, QR codes, layers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-pink-500 font-bold">✓</span>
                    <span>Lower Third Builder &amp; Pre-built templates</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-pink-500 font-bold">✓</span>
                    <span>Advanced media tagging &amp; collections</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-pink-500 font-bold">✓</span>
                    <span>Multi- Branch Discount - Up to 5 branches</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-pink-500 font-bold">✓</span>
                    <span>PowerPoint Export &amp; Back-up</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-pink-500 font-bold">✓</span>
                    <span>Priority Email Support</span>
                  </li>
                  <li className="pt-2 text-[11px] text-gray-400 italic">
                    ... And Everything in Pro, plus more
                  </li>
                </ul>
              </div>
            </div>

            {/* Column 2: Middle Stack (Duration & After trial) */}
            <div className="flex flex-col gap-4">
              {/* Card A: Duration */}
              <div className="bg-[#150d27] border border-white/5 rounded-2xl p-6 space-y-2.5 flex-1">
                <div className="flex items-center gap-2.5 text-[#00d2b4]">
                  <Calendar className="w-5 h-5" />
                  <h3 className="text-sm sm:text-base font-semibold text-purple-200">
                    Trial Extension Duration
                  </h3>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Your trial starts today and runs for another <strong className="text-white">30 full days</strong>. You&apos;ll receive email reminders as your trial approaches its end.
                </p>
              </div>

              {/* Card B: What happens after trial */}
              <div className="bg-[#150d27] border border-white/5 rounded-2xl p-6 space-y-2.5 flex-1">
                <div className="flex items-center gap-2.5 text-[#00d2b4]">
                  <Sparkles className="w-5 h-5" />
                  <h3 className="text-sm sm:text-base font-semibold text-purple-200">
                    What happens after my free trial
                  </h3>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Near the end of your trial, you&apos;ll be prompted to choose a paid plan to continue using Q-worship. If no plan is selected, your account will be safely locked with all data preserved for 90 days.
                </p>
              </div>
            </div>

            {/* Column 3: Important Notice */}
            <div className="bg-[#150d27] border border-white/5 rounded-2xl p-6 space-y-3">
              <div className="flex items-center gap-2.5 text-[#00d2b4]">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-sm sm:text-base font-semibold text-purple-200">
                  Important
                </h3>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">
                No payment information is required during your trial. You can explore all features risk-free and decide if Q-worship is right for your ministry
              </p>
            </div>
          </div>

          {/* Bottom CTA Button */}
          <div className="mt-10 flex justify-center">
            <button
              type="button"
              onClick={handleContinueToPresentations}
              className="px-8 py-3 rounded-lg bg-[#8b3dff] hover:bg-[#792fe6] text-white font-medium text-sm transition shadow-lg shadow-purple-900/40 cursor-pointer"
            >
              Continue to presentations
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // SCREEN 1: EXPIRED NOTICE MODAL (Image 2: "Your free trail has ended")
  // ─────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#0d071d] text-white flex items-center justify-center p-4 sm:p-6 selection:bg-purple-500 selection:text-white">
      <div className="w-full max-w-lg bg-[#140b24] border border-purple-500/20 rounded-3xl p-8 sm:p-12 text-center shadow-2xl relative overflow-hidden backdrop-blur-xl">
        {/* Glow ambient background */}
        <div className="absolute -top-24 -left-24 w-52 h-52 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-52 h-52 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Logo / Official Q-Worship Logo */}
        <div className="relative mx-auto mb-6 flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 p-2.5 flex items-center justify-center shadow-[0_0_30px_rgba(139,61,255,0.25)]">
            <img
              src={images.logo || '/Photos/logo.png'}
              alt="Q-Worship"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Heading & Subtitle */}
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Your free trail has ended
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-gray-300">
          Purchase a subscription or extend your trial to continue
        </p>

        {/* Body Description */}
        <p className="mt-8 text-xs sm:text-sm text-gray-300 leading-relaxed max-w-md mx-auto">
          Hi {firstName}, your Q-worship 30 days free trial has ended. Dont worry, your projects remain safe. Upgrade now or extend your free trail by a further 30 days
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          {/* Upgrade Now (Disabled for now as Stripe isn't live) */}
          <div className="relative group w-full sm:w-auto">
            <button
              type="button"
              disabled
              className="w-full sm:w-auto px-7 py-3 rounded-xl bg-[#8b3dff] text-white/70 font-semibold text-xs sm:text-sm opacity-60 cursor-not-allowed transition"
            >
              Upgrade now
            </button>
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/90 border border-white/10 rounded text-[10px] text-gray-300 opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none shadow-md">
              Card payments coming soon
            </div>
          </div>

          {/* Extend Free Trial Button */}
          <button
            type="button"
            onClick={handleExtendTrial}
            disabled={isExtending}
            className="w-full sm:w-auto px-7 py-3 rounded-xl border border-[#00d2b4] text-[#00d2b4] font-semibold text-xs sm:text-sm hover:bg-[#00d2b4]/10 transition flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(0,210,180,0.15)] hover:shadow-[0_0_20px_rgba(0,210,180,0.3)]"
          >
            {isExtending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Extending...</span>
              </>
            ) : (
              <span>Extend Free Trial</span>
            )}
          </button>
        </div>
      </div>
    </main>
  );
}

