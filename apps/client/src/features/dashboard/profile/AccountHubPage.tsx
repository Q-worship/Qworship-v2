import React from "react";
import { Link } from "wouter";
import { UserSquare2, ShieldCheck, Network, Banknote, SlidersHorizontal, User } from "lucide-react";

/**
 * The account hub: five doors, nothing else.
 *
 * Replaces a six-tab page. The tabs were cheap to add and expensive to read —
 * "Account" and "Security" both sounded like where a password lives, and the
 * strip scrolled sideways on a phone. Cards carry a sentence each, so the
 * choice is made before the click rather than after it.
 */

interface Destination {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

const DESTINATIONS: Destination[] = [
  {
    href: "/dashboard-profile/personal",
    icon: <UserSquare2 className="h-[15px] w-[15px]" />,
    title: "Personal Information",
    description: "Provide personal details and how we can reach you",
  },
  {
    href: "/dashboard-profile/security",
    icon: <ShieldCheck className="h-[15px] w-[15px]" />,
    title: "Login & Security",
    description: "Update your password and secure your account",
  },
  {
    href: "/dashboard-profile/organization",
    icon: <Network className="h-[15px] w-[15px]" />,
    title: "Organization",
    description: "Update your organization name, size, branches and other details.",
  },
  {
    href: "/dashboard-subscription",
    icon: <Banknote className="h-[15px] w-[15px]" />,
    title: "Payments & billing",
    description: "Review payments, branches, invoices, coupons and much more.",
  },
  {
    href: "/dashboard-profile/preferences",
    icon: <SlidersHorizontal className="h-[15px] w-[15px]" />,
    title: "Preferences",
    description: "Set your default language, currency, time zone, and notification preferences.",
  },
];

/**
 * Measurements come from the design export, which renders 1:1 against a 36px
 * page title: a 1254px content column, three 382px cards with 53px gutters,
 * 36px card padding and a 28px icon chip. They are written as explicit values
 * rather than the nearest Tailwind step because the nearest step was what made
 * the first build read as a denser, smaller page than the one drawn.
 */
export const AccountHubPage: React.FC = () => (
  <div className="min-h-full bg-account-bg text-white">
    <div className="mx-auto w-full max-w-[1318px] p-4 sm:p-6 lg:px-8 lg:pb-8 lg:pt-14">
      <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-[#8356F3] sm:text-4xl">
        <User className="h-7 w-7" aria-hidden />
        Profile Settings
      </h1>
      <p className="mt-[18px] max-w-[680px] text-[15px] leading-[26px] text-gray-400 sm:text-[17px]">
        Manage your personal information, organization details, account preferences, and security
        settings and billing information
      </p>

      <div className="mt-16 grid gap-[53px] sm:grid-cols-2 lg:mt-[124px] lg:grid-cols-3">
        {DESTINATIONS.map((destination) => (
          <Link
            key={destination.href}
            href={destination.href}
            className="group flex min-h-[215px] flex-col rounded-2xl bg-account-card px-9 pb-6 pt-7 transition-colors hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8356F3]"
          >
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/15 text-gray-300 transition-colors group-hover:border-[#8356F3]/50 group-hover:text-white">
              {destination.icon}
            </span>
            <h2 className="mt-[38px] text-[22px] font-semibold leading-tight text-white">
              {destination.title}
            </h2>
            <p className="mt-6 text-[15px] leading-[23px] text-gray-400">
              {destination.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  </div>
);

export default AccountHubPage;
