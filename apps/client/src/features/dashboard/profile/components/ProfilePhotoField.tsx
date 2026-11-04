import React from "react";
import { Upload } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

/**
 * The photo well.
 *
 * Uploads as soon as a file is chosen rather than holding it for a Save button
 * further down: every other row on the page commits on its own, and one
 * control that waited would be the odd one out.
 *
 * Presentational only — it is handed a URL and a callback, and knows nothing
 * about how either is produced.
 */
export const ProfilePhotoField: React.FC<{
  src?: string;
  initial: string;
  busy: boolean;
  onSelect: (file: File) => void;
}> = ({ src, initial, busy, onSelect }) => {
  const inputId = "profile-photo-input";

  return (
    <div className="py-5">
      <div className="text-sm font-medium text-white">Profile photo</div>
      <label
        htmlFor={inputId}
        className="group mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-account-field px-6 py-10 transition-colors hover:border-[#8356F3]/50 hover:bg-white/[0.03]"
      >
        <Avatar className="h-20 w-20 border-2 border-[#8356F3] bg-account-card">
          {src ? (
            <img src={src} alt="" className="h-full w-full rounded-full object-cover" />
          ) : (
            <AvatarFallback className="bg-account-card text-2xl font-medium text-gray-300">
              {initial}
            </AvatarFallback>
          )}
        </Avatar>

        <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-white transition-colors group-hover:text-[#a98bff]">
          <Upload className="h-4 w-4" aria-hidden />
          {busy ? "Uploading…" : src ? "Change photo" : "Upload photo"}
        </span>
        <span className="mt-1 text-xs text-gray-500">Recommended: square, 500x500px</span>

        <input
          id={inputId}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            // Clear it so choosing the same file twice still fires a change.
            e.target.value = "";
            if (file) onSelect(file);
          }}
        />
      </label>
    </div>
  );
};
