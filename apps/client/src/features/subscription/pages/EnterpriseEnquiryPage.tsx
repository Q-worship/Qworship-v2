import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Check } from "lucide-react";
import { submitEnterpriseEnquiry } from "@/lib/billingApi";
import { useToast } from "@/hooks/use-toast";

/**
 * Talk to sales: the form behind the Enterprise card.
 *
 * Public, because the largest prospects arrive from the marketing site with
 * no account, and a sign-up wall in front of a sales conversation loses
 * exactly the customers it is meant to catch.
 *
 * There is no Enterprise plan behind this. Whatever sales agrees is applied
 * as ordinary slots and bonus hours on a Standard account, so nothing here
 * grants an entitlement.
 */

const SCHEDULER_URL = import.meta.env.VITE_SALES_SCHEDULER_URL as string | undefined;

export default function EnterpriseEnquiryPage() {
  const { toast } = useToast();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await submitEnterpriseEnquiry({
        name: String(form.get("name") || ""),
        email: String(form.get("email") || ""),
        organizationName: String(form.get("organizationName") || ""),
        churches: String(form.get("churches") || ""),
        phone: String(form.get("phone") || ""),
        message: String(form.get("message") || ""),
      });
      setSent(true);
    } catch (error: any) {
      toast({
        title: "Could not send your enquiry",
        description: error?.message || "Please try again, or email us directly.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <Page>
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#00c4b4]">
          <Check className="h-8 w-8 stroke-[3] text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">Thanks — we have your details</h1>
        <p className="mt-3 text-sm text-gray-400">
          Someone from the team will be in touch. If you would rather pick a time now, book a call
          below.
        </p>
        {/*
          Only offered when a scheduler is actually configured. A "Book a
          call" button that goes nowhere is worse than no button, and this is
          the last screen on which to disappoint somebody.
        */}
        {SCHEDULER_URL && (
          <a
            href={SCHEDULER_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-block rounded-lg bg-[#8b3dff] px-8 py-3 text-sm font-bold text-white hover:bg-[#7a2df0]"
          >
            Book a call
          </a>
        )}
      </Page>
    );
  }

  return (
    <Page>
      <h1 className="text-2xl font-bold text-white sm:text-3xl">Talk to sales</h1>
      <p className="mt-3 text-sm text-gray-400">
        For large networks, dioceses and multi-campus ministries — volume terms and tailored
        onboarding. Tell us a little about your ministry and we will be in touch.
      </p>

      <form onSubmit={handleSubmit} className="mt-10 space-y-5 text-left">
        <Field name="name" label="Your name" required />
        <Field name="email" label="Email" type="email" required />
        <Field name="organizationName" label="Church or organisation" required />
        <Field name="churches" label="How many churches or campuses?" placeholder="e.g. 12" />
        <Field name="phone" label="Phone (optional)" />

        <label className="block">
          <span className="mb-2 block text-xs font-medium text-gray-400">
            Anything else we should know?
          </span>
          <textarea
            name="message"
            rows={4}
            className="w-full rounded-lg bg-account-field px-4 py-3 text-sm text-white outline-none ring-[#8b3dff] focus:ring-2"
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-[#8b3dff] px-8 py-3.5 text-sm font-bold text-white transition hover:bg-[#7a2df0] disabled:opacity-50"
        >
          {busy ? "Sending…" : "Send enquiry"}
        </button>
      </form>
    </Page>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  placeholder,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium text-gray-400">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg bg-account-field px-4 py-3 text-sm text-white outline-none ring-[#8b3dff] focus:ring-2"
      />
    </label>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-account-bg px-4 py-14 text-white">
      <div className="mx-auto w-full max-w-xl">
        <Link
          href="/dashboard-subscription/plans"
          className="mb-8 inline-flex items-center gap-2 text-xs text-gray-400 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to plans
        </Link>
        <div className="rounded-2xl bg-account-card p-8 text-center sm:p-10">{children}</div>
      </div>
    </main>
  );
}
