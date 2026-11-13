// The pictures of an imported PowerPoint are stored as media assets (the slides load them by
// URL), but they are not part of the user's own library, so "My Assets" leaves them out.
// The server leaves them out of its listing too; this is the same rule on the client, so the
// list is right whichever side has been updated.

/** The tag the PowerPoint import puts on its pictures. */
export const IMPORTED_PRESENTATION_TAG = "Imported Presentation";

interface AssetLike {
  hiddenFromLibrary?: boolean;
  tags?: unknown;
}

/** True for a picture that belongs to an imported presentation rather than to the user's library. */
export const isInternalMediaAsset = (asset: AssetLike | null | undefined): boolean =>
  !!asset &&
  (asset.hiddenFromLibrary === true ||
    (Array.isArray(asset.tags) && asset.tags.includes(IMPORTED_PRESENTATION_TAG)));

/** The assets that belong in the user's library. */
export const visibleMediaAssets = <T extends AssetLike>(assets: readonly T[]): T[] =>
  assets.filter((asset) => !isInternalMediaAsset(asset));

/** A "/api/user-media-assets" response with the imported presentations' pictures removed. */
export const withoutInternalAssets = <T>(response: T): T => {
  const assets = (response as { assets?: unknown } | null | undefined)?.assets;
  return Array.isArray(assets)
    ? ({ ...(response as object), assets: visibleMediaAssets(assets) } as T)
    : response;
};
