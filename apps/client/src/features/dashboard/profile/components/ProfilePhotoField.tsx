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
    <div className="py-6">
      <div className="text-base font-medium leading-[22px] text-white">Profile photo</div>
      <label
        htmlFor={inputId}
        className="group mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-[#484848] border-profile-border bg-transparent px-6 py-8 transition-colors hover:border-[#8356F3] hover:bg-[#393048]/30"
      >
        {src ? (
          <Avatar className="h-20 w-20 border-2 border-[#8356F3] border-profile-primary bg-[#393048] bg-profile-card mb-2">
            <img src={src} alt="" className="h-full w-full rounded-full object-cover" />
          </Avatar>
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#393048] bg-profile-card text-white shadow-sm transition-colors group-hover:bg-[#433954]">
            <Upload className="h-5 w-5" aria-hidden />
          </div>
        )}

        <span className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-white transition-colors group-hover:text-[#8356F3] group-hover:text-profile-primary">
          {busy ? "Uploading…" : src ? "Change photo" : "Upload photo"}
        </span>
        <span className="mt-1 text-xs text-[#768092] text-profile-muted">Recommended: Square, min 500x500px.</span>

        <input
          id={inputId}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) onSelect(file);
          }}
        />
      </label>
    </div>
  );
};
