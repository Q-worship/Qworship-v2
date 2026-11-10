import React from "react";

/** A page with a folded corner and a plus cut out of it. Takes its colour from the text colour. */
export const AddFileIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="currentColor"
    aria-hidden="true"
    focusable="false">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M6 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6H6zm5 7.5h2V12h2.5v2H13v2.5h-2V14H8.5v-2H11V9.5z"
    />
  </svg>
);
