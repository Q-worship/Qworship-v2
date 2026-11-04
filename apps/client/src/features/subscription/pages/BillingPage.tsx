import React from "react";
import { Link, useRoute } from "wouter";
import { AccountBreadcrumb } from "@/components/account/AccountShell";
import { BillingOverviewTab } from "../components/billing/BillingOverviewTab";
import { BillingUsageTab } from "../components/billing/BillingUsageTab";
import { BillingBranchesTab } from "../components/billing/BillingBranchesTab";
import { BillingHistoryTab } from "../components/billing/BillingHistoryTab";
import { BillingPlansTab } from "../components/billing/BillingPlansTab";

/**
 * Payments & billing, as five tabs under one route.
 *
 * Tabs here, a hub elsewhere: the account hub splits unrelated jobs, whereas
 * these five are one job seen five ways and a person moves between them
 * constantly. The tab lives in the path rather than in component state so a
 * link can open one and Back steps between them.
 */

const TABS = [
  { slug: "", label: "Overview" },
  { slug: "usage", label: "Usage" },
  { slug: "branches", label: "Your Branches" },
  { slug: "history", label: "Billing History" },
  { slug: "plans", label: "Plans" },
] as const;

type TabSlug = (typeof TABS)[number]["slug"];

const BASE = "/dashboard-subscription";
const hrefFor = (slug: TabSlug) => (slug ? `${BASE}/${slug}` : BASE);

export const BillingPage: React.FC = () => {
  const [, params] = useRoute(`${BASE}/:tab`);
  const requested = (params?.tab ?? "") as TabSlug;
  const active: TabSlug = TABS.some((t) => t.slug === requested) ? requested : "";

  return (
    <div className="min-h-full bg-account-bg text-white">
      {/*
        The export puts this on a 1183px column with 128px between tab labels
        and 38px between the stat tiles — wider and far airier than the
        max-w-6xl / gap-2 first pass, which packed the five tabs together at
        the left and made the strip read as a segmented control.
      */}
      <div className="mx-auto w-full max-w-[1247px] p-4 sm:p-6 lg:px-8 lg:pb-8 lg:pt-14">
        <AccountBreadcrumb page="Payments & billing" />
        <h1 className="mt-[26px] text-[32px] font-bold leading-[1.1] tracking-tight text-white sm:text-[45px]">
          Payments &amp; billing
        </h1>
        <p className="mt-[22px] text-base text-gray-400 sm:text-[19px]">
          Review payments, branches, invoices and your plan.
        </p>

        {/* Scrolls rather than squeezing: five tabs do not fit a phone. */}
        <nav className="mt-[46px] flex gap-8 overflow-x-auto border-b border-white/10 lg:mt-[66px] lg:gap-[128px]">
          {TABS.map((tab) => {
            const isActive = tab.slug === active;
            return (
              <Link
                key={tab.slug || "overview"}
                href={hrefFor(tab.slug)}
                className={`-mb-px whitespace-nowrap border-b-[3px] pb-[14px] text-base font-medium transition-colors lg:text-[19px] ${
                  isActive
                    ? "border-[#8356F3] text-white"
                    : "border-transparent text-gray-400 hover:text-white"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-[71px]">
          {active === "" && <BillingOverviewTab />}
          {active === "usage" && <BillingUsageTab />}
          {active === "branches" && <BillingBranchesTab />}
          {active === "history" && <BillingHistoryTab />}
          {active === "plans" && <BillingPlansTab />}
        </div>
      </div>
    </div>
  );
};

export default BillingPage;
