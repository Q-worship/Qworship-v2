import React from "react";
import { Link } from "wouter";
import { ChevronRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The chrome every account screen shares.
 *
 * The account area is a hub with spokes rather than one page of tabs: each
 * screen owns a URL, so "change your password" in an email lands on the right
 * one and Back steps between them. Tabs could not do that without a query
 * parameter nobody could read.
 *
 * Everything here is presentational. Each spoke owns its own query and its own
 * mutation, which is why they could be split off the old 943-line tabbed page
 * without untangling one shared block of state.
 */

/** Trail back to the hub. The second crumb is the page, never a fixed label. */
export const AccountBreadcrumb: React.FC<{ page: string }> = ({ page }) => (
  <nav className="flex items-center gap-2 text-sm" aria-label="Breadcrumb">
    <Link
      href="/dashboard-profile"
      className="font-medium text-[#768092] transition-colors hover:text-white"
    >
      Account
    </Link>
    <ChevronRight className="h-3.5 w-3.5 text-[#767676]" aria-hidden />
    <span className="font-medium text-[#CBCED5]">{page}</span>
  </nav>
);

interface AccountPageProps {
  title: string;
  subtitle: string;
  breadcrumb?: string;
  /** The static explainer card on the right. Omitted on screens without one. */
  sidecar?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * A spoke: breadcrumb, title, subtitle, then a body beside an explainer.
 *
 * The sidecar is a sibling of the body rather than floating, so on a phone it
 * drops below the fields instead of squeezing them.
 */
export const AccountPage: React.FC<AccountPageProps> = ({ title, subtitle, breadcrumb, sidecar, children }) => (
  <div className="min-h-full bg-[#1A102D] bg-profile-bg text-white">
    {/*
      Geometry taken from the design export: a 1002px content column split
      579 / 101 / 323 between fields, gutter and explainer, under a 45px title
      and a 19px subtitle. The gutter especially is measured rather than
      guessed — the first build used 32px, which collapsed the two columns
      into something that read as one crowded block.
    */}
    {/*
      Two widths, as drawn. A screen with an explainer gets the 1002px reading
      column it is measured on; one without — Preferences — gets the wider
      1183px column the export uses there, so its rows reach the full width
      instead of stopping short where the explainer would have been.
    */}
    <div
      className={`mx-auto w-full p-4 sm:p-6 lg:px-8 lg:pb-8 lg:pt-14 ${
        sidecar ? "max-w-[1066px]" : "max-w-[1247px]"
      }`}
    >
      <AccountBreadcrumb page={breadcrumb ?? title} />
      <h1 className="mt-[26px] text-[32px] font-bold leading-[1.1] tracking-tight text-white sm:text-[45px]">
        {title}
      </h1>
      <p className="mt-[22px] text-base text-[#CBCED5] sm:text-[19px]">{subtitle}</p>

      {sidecar ? (
        <div className="mt-[72px] grid gap-y-12 lg:grid-cols-[minmax(0,1fr)_323px] lg:gap-x-[101px]">
          <div className="min-w-0">{children}</div>
          <div>{sidecar}</div>
        </div>
      ) : (
        <div className="mt-[72px]">{children}</div>
      )}
    </div>
  </div>
);

/** One question-and-answer in the explainer card. */
export interface SidecarNote {
  icon: React.ReactNode;
  question: string;
  answer: string;
}

/**
 * The standing explainer beside the fields.
 *
 * Sidecar container has a 1px border #484848, rounded-xl, matching the
 * personal-information, login-and-security, and church-organisation-settings SVGs.
 */
export const InfoSidecar: React.FC<{ notes: SidecarNote[] }> = ({ notes }) => (
  <aside className="rounded-xl border border-[#484848] border-profile-border bg-transparent p-[25px]">
    {notes.map((note, i) => (
      <div
        key={note.question}
        className={i > 0 ? "mt-[53px] border-t border-[#484848] border-profile-border pt-[54px]" : undefined}
      >
        <div className="text-[#8356F3] text-profile-primary">{note.icon}</div>
        <h2 className="mt-[22px] text-[20px] font-semibold leading-[28px] text-white">
          {note.question}
        </h2>
        <p className="mt-[27px] text-base leading-[23px] text-[#CBCED5] text-profile-text">{note.answer}</p>
      </div>
    ))}
  </aside>
);

interface FieldRowProps {
  label: string;
  /** What to show when not editing. Falsy falls back to `empty`. */
  value?: string | null;
  /** Shown instead of a value when there is nothing yet. */
  empty?: string;
  /** No edit control, with a padlock to say so rather than a silent absence. */
  locked?: boolean;
  /** Replaces the Edit/Add link entirely — used for "Change password". */
  action?: React.ReactNode;
  editing?: boolean;
  onEdit?: () => void;
  onCancel?: () => void;
  onSave?: () => void;
  saving?: boolean;
  /** The editor, shown in place of the value while editing. */
  children?: React.ReactNode;
  /** Drops the divider. Set on the last row of a group. */
  last?: boolean;
}

/**
 * One editable line: label, current value, and a link to change it.
 *
 * Row-level editing rather than one big form with a single Save. Dividers
 * use #484848, values use #CBCED5, and the primary brand purple is #8356F3.
 */
export const FieldRow: React.FC<FieldRowProps> = ({
  label, value, empty = "Not provided", locked, action,
  editing, onEdit, onCancel, onSave, saving, children, last,
}) => (
  <div className={last ? "pb-6 pt-[31px]" : "border-b border-[#484848] border-profile-border pb-6 pt-[31px]"}>
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="text-base font-medium leading-[22px] text-white">{label}</div>

        {editing ? (
          <div className="mt-3 space-y-3">
            {children}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={onSave}
                disabled={saving}
                className="bg-[#8356F3] bg-profile-primary text-white hover:bg-[#7245e2] disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onCancel}
                disabled={saving}
                className="text-[#768092] text-profile-muted hover:bg-white/5 hover:text-white"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div
            className={`mt-0.5 truncate text-[15px] leading-5 ${
              value ? "text-[#CBCED5] text-profile-text" : "text-[#768092] text-profile-muted"
            }`}
          >
            {value || empty}
          </div>
        )}
      </div>

      {!editing && (
        <div className="shrink-0">
          {locked ? (
            <Lock className="h-4 w-4 text-[#8356F3] text-profile-primary" aria-label="Cannot be changed" />
          ) : action ? (
            action
          ) : (
            <button
              type="button"
              onClick={onEdit}
              className="text-[15px] font-medium leading-[22px] text-white underline underline-offset-4 transition-colors hover:text-[#8356F3] hover:text-profile-primary"
            >
              {value ? "Edit" : "Add"}
            </button>
          )}
        </div>
      )}
    </div>
  </div>
);

/**
 * A label-and-control line that is always on, for toggles and pickers.
 */
export const SettingRow: React.FC<{
  label: string;
  description?: string;
  control: React.ReactNode;
  last?: boolean;
}> = ({ label, description, control, last }) => (
  <div className={last ? "pb-6 pt-[31px]" : "border-b border-[#484848] border-profile-border pb-6 pt-[31px]"}>
    <div className="flex items-center justify-between gap-6">
      <div className="min-w-0">
        <div className="text-base font-medium leading-[22px] text-white">{label}</div>
        {description && (
          <div className="mt-0.5 text-[15px] leading-5 text-[#CBCED5] text-profile-text">{description}</div>
        )}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  </div>
);

/** Shared input styling matching design SVGs: bg #2A203C, border #484848, text #CBCED5. */
export const fieldInputClass =
  "bg-[#2A203C] bg-profile-field border-[#484848] border-profile-border text-white placeholder:text-[#768092] placeholder:text-profile-muted focus-visible:ring-[#8356F3] focus-visible:ring-profile-primary";
