import { buildUrl } from "@/lib/queryClient";
import type { SlideImage } from "@/lib/pptxParser";

// Picture data can't live inside the slides themselves, so pictures are uploaded as media
// assets (same endpoint as Import Files) and slides keep URLs. They are flagged as belonging
// to the presentation, so they work like any asset but do not show up in "My Assets".

// The server re-compresses and stores the files of one request one after another, so
// the speed-up comes from several requests in flight at once, each carrying one picture.
const UPLOAD_CONCURRENCY = 4;
const ATTEMPTS = 2;

export interface SlideImageUploadItem {
  title: string;
  /** Renders / decodes the picture; null when it can't be decoded */
  load: () => Promise<SlideImage | null>;
}

export interface SlideImageUploadResult {
  /** URL per item, in the same order; null where the picture was not uploaded */
  urls: (string | null)[];
  /** Why uploading stopped early (e.g. the storage limit), empty when nothing went wrong */
  failureReason: string;
}

class UploadError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

const uploadOne = async (image: SlideImage, title: string): Promise<string> => {
  const formData = new FormData();
  formData.append("files", new File([image.blob], image.fileName, { type: image.blob.type }));
  formData.append(
    "metadata_0",
    JSON.stringify({
      title,
      tags: ["Imported Presentation"],
      categories: ["Slides"],
      description: "",
      hiddenFromLibrary: true,
    }),
  );

  let response: Response;
  try {
    response = await fetch(buildUrl("/api/user-media-assets/upload"), {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      body: formData,
    });
  } catch {
    throw new UploadError("Picture upload failed (network error)", true);
  }

  if (!response.ok) {
    // Surface the server's own reason (e.g. the storage limit being reached)
    let reason = "";
    try {
      reason = (await response.json())?.message ?? "";
    } catch {
      // body was not JSON
    }
    throw new UploadError(
      reason || `Picture upload failed (${response.status})`,
      response.status >= 500,
    );
  }

  const result = await response.json();
  const asset = Array.isArray(result?.assets) ? result.assets[0] : null;
  if (!asset?.id) throw new UploadError("Picture upload returned an unexpected response", false);
  return buildUrl(`/api/user-media-assets/${asset.id}/file`);
};

/**
 * Renders and uploads the pictures with a few in flight at once, so rendering one
 * overlaps uploading another. A failure that retrying can't fix (such as the storage
 * limit) stops the run, but pictures already uploaded keep their URLs.
 */
export const uploadSlideImages = async (
  items: SlideImageUploadItem[],
): Promise<SlideImageUploadResult> => {
  const urls: (string | null)[] = items.map(() => null);
  let failureReason = "";
  let stopped = false;
  let cursor = 0;

  const worker = async () => {
    while (!stopped) {
      const index = cursor++;
      if (index >= items.length) return;

      try {
        const image = await items[index].load();
        if (!image) continue; // can't be decoded: that picture is left out

        for (let attempt = 1; ; attempt++) {
          try {
            urls[index] = await uploadOne(image, items[index].title);
            break;
          } catch (error) {
            const retryable = error instanceof UploadError && error.retryable;
            if (!retryable || attempt >= ATTEMPTS) throw error;
          }
        }
      } catch (error) {
        console.error("Failed to upload imported slide picture:", error);
        failureReason ||= error instanceof Error ? error.message : "Picture upload failed";
        stopped = true;
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(UPLOAD_CONCURRENCY, items.length) }, worker),
  );
  return { urls, failureReason };
};
