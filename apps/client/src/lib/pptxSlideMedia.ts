import { buildUrl } from "@/lib/queryClient";
import type { SlideImage } from "@/lib/pptxParser";

// Picture data can't live inside the slides themselves: presentations are saved
// as JSON and the server rejects request bodies over 100KB. Pictures are uploaded
// to the user's media library (same endpoint as Import Files) and slides keep URLs.

const UPLOAD_BATCH_SIZE = 8;

export interface SlideImageUpload {
  image: SlideImage;
  title: string;
}

export interface SlideImageUploadResult {
  /** URL per upload, in the same order; null where the upload did not happen */
  urls: (string | null)[];
  /** Why uploading stopped early (e.g. the storage limit), empty when all went through */
  failureReason: string;
}

/**
 * Uploads the pictures in batches. A failed batch stops the run, but pictures from
 * earlier batches keep their URLs so a slide deck is never lost to one bad request.
 */
export const uploadSlideImages = async (
  uploads: SlideImageUpload[],
): Promise<SlideImageUploadResult> => {
  const urls: (string | null)[] = uploads.map(() => null);
  let failureReason = "";

  for (let start = 0; start < uploads.length; start += UPLOAD_BATCH_SIZE) {
    const batch = uploads.slice(start, start + UPLOAD_BATCH_SIZE);
    try {
      const formData = new FormData();
      batch.forEach(({ image, title }, index) => {
        formData.append(
          "files",
          new File([image.blob], image.fileName, { type: image.blob.type }),
        );
        formData.append(
          `metadata_${index}`,
          JSON.stringify({
            title,
            tags: ["Imported Presentation"],
            categories: ["Slides"],
            description: "",
          }),
        );
      });

      const response = await fetch(buildUrl("/api/user-media-assets/upload"), {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: formData,
      });
      if (!response.ok) {
        // Surface the server's own reason (e.g. the storage limit being reached)
        let reason = "";
        try {
          reason = (await response.json())?.message ?? "";
        } catch {
          // body was not JSON
        }
        throw new Error(reason || `Picture upload failed (${response.status})`);
      }

      const result = await response.json();
      const assets: any[] = Array.isArray(result?.assets) ? result.assets : [];
      if (assets.length !== batch.length) {
        throw new Error("Picture upload returned an unexpected response");
      }
      assets.forEach((asset, index) => {
        urls[start + index] = buildUrl(`/api/user-media-assets/${asset.id}/file`);
      });
    } catch (error) {
      console.error("Failed to upload imported slide pictures:", error);
      failureReason = error instanceof Error ? error.message : "Picture upload failed";
      break;
    }
  }

  return { urls, failureReason };
};
