import React from "react";
import { Link } from "wouter";
import { UserSquare2, ShieldCheck, Network, CreditCard, SlidersHorizontal, User } from "lucide-react";

/**
 * The account hub: five doors, matching screenshot 1.
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
    icon: <UserSquare2 className="h-6 w-6 stroke-[1.5]" />,
    title: "Personal Information",
    description: "Provide personal details and how we can reach you",
  },
  {
    href: "/dashboard-profile/security",
    icon: <ShieldCheck className="h-6 w-6 stroke-[1.5]" />,
    title: "Login & Security",
    description: "Update your password and secure your account",
  },
  {
    href: "/dashboard-profile/organization",
    icon: <Network className="h-6 w-6 stroke-[1.5]" />,
    title: "Organization",
    description: "Update your organization name, size, branches and other details.",
  },
  {
    href: "/dashboard-subscription",
    icon: <CreditCard className="h-6 w-6 stroke-[1.5]" />,
    title: "Payments & billing",
    description: "Review payments, branches, invoices, coupons and much more.",
  },
  {
    href: "/dashboard-profile/preferences",
    icon: <SlidersHorizontal className="h-6 w-6 stroke-[1.5]" />,
    title: "Preferences",
    description: "Set your default language, currency, time zone, and notification preferences.",
  },
];

export const AccountHubPage: React.FC = () => (
  <div className="min-h-full bg-[#1A102D] bg-profile-bg text-white">
    <div className="mx-auto w-full max-w-[1318px] p-6 lg:px-12 lg:pb-12 lg:pt-14">
      <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-[#8356F3] text-profile-primary sm:text-4xl">
        <User className="h-8 w-8 stroke-[1.75]" aria-hidden />
        Profile Settings
      </h1>
      <p className="mt-4 max-w-[680px] text-[15px] leading-[26px] text-[#CBCED5] text-profile-text sm:text-[16px]">
        Manage your personal information, organization details, account preferences, and security
        settings and billing information
      </p>

      <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:mt-16 lg:grid-cols-3">
        {DESTINATIONS.map((destination) => (
          <Link
            key={destination.href}
            href={destination.href}
            className="group flex min-h-[210px] flex-col rounded-xl bg-[#393048] bg-profile-card p-8 transition-all hover:bg-[#433954] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8356F3]"
          >
            <span className="text-[#CBCED5] transition-colors group-hover:text-white">
              {destination.icon}
            </span>
            <h2 className="mt-7 text-[20px] font-semibold leading-tight text-white">
              {destination.title}
            </h2>
            <p className="mt-3.5 text-[14px] leading-relaxed text-[#CBCED5] text-profile-text">
              {destination.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  </div>
);

export default AccountHubPage;
