import React from "react";
import { ShieldQuestion, Lock, Eye } from "lucide-react";
import type { SidecarNote } from "./AccountShell";

/**
 * The explainer that sits beside the fields on every account spoke.
 *
 * One list rather than a copy per screen. It answers the three questions
 * support actually gets — why a value is masked, why a field will not open,
 * and where any of it goes — and those answers are the same wherever the
 * person is standing when they ask.
 */
export const ACCOUNT_NOTES: SidecarNote[] = [
  {
    icon: <ShieldQuestion className="h-11 w-11" />,
    question: "Why isn't my info shown here?",
    answer: "We're hiding some account details to protect your identity.",
  },
  {
    icon: <Lock className="h-11 w-11" />,
    question: "Which details can be edited?",
    answer:
      "Details we use to verify your identity can't be changed. Contact info and some personal details can be edited.",
  },
  {
    icon: <Eye className="h-11 w-11" />,
    question: "What info is shared with others?",
    answer:
      "Q-worship does not share any personal information with third parties. Your information is only used to provide a tailored experience.",
  },
];
