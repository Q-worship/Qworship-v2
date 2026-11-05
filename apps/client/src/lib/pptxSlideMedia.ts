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

/** Uploads the pictures and returns their URLs, in the same order as `uploads`. */
export const uploadSlideImages = async (
  uploads: SlideImageUpload[],
): Promise<string[]> => {
  const urls: string[] = [];

  for (let start = 0; start < uploads.length; start += UPLOAD_BATCH_SIZE) {
    const batch = uploads.slice(start, start + UPLOAD_BATCH_SIZE);
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
    assets.forEach((asset) =>
      urls.push(buildUrl(`/api/user-media-assets/${asset.id}/file`)),
    );
  }

  return urls;
};
