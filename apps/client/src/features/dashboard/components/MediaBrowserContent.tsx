import { useCapabilities } from "@/hooks/useCapabilities";
import { useUpgradePrompt } from "@/components/upgrade/UpgradeContext";
import React from "react";
import type { MediaAsset, User } from "@/types";
import { DynamicMediaSections } from "@/components/sections/DynamicMediaSections";

// Enhanced media browser component for background selection - matches Assets page design
export const MediaBrowserContent: React.FC<{
  onSelectMedia: (asset: MediaAsset) => void;
  currentUser: User | null;
}> = ({ onSelectMedia, currentUser }) => {
  // The shared cloud collections are Standard; My Media stays free.
  const { can } = useCapabilities();
  const { openUpgrade } = useUpgradePrompt();
  const canUseCloudMedia = can("media.cloudCollections");

  const [activeTab, setActiveTab] = React.useState<"cloud-media" | "my-media" | "templates">(
    "my-media",
  );
  const [selectedMedia, setSelectedMedia] = React.useState<any>(null);
  const [activeFilters, setActiveFilters] = React.useState({
    categories: [],
    mediaTypes: [],
    tags: [],
    seasons: [],
    recent: [],
    service: [],
    liveScreen: [],
  });

  return (
    <div className="flex flex-col h-full">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-600 bg-[#0f0920]">
        {/* The cloud collections are Standard; My Media is not. Locked
            rather than hidden, and opening the plan modal rather than a tab
            whose every request would 402. */}
        <button
          onClick={() => canUseCloudMedia
            ? setActiveTab("cloud-media")
            : openUpgrade("media.cloudCollections")}
          title={canUseCloudMedia ? undefined : "Cloud media collections come with Standard"}
          className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
            !canUseCloudMedia
              ? "text-gray-600 border-transparent hover:text-gray-500"
              : activeTab === "cloud-media"
                ? "text-[#8356F3] border-[#8356F3]"
                : "text-gray-400 border-transparent hover:text-white"
          }`}>
          CLOUD MEDIA
          {!canUseCloudMedia && (
            <span className="rounded-full bg-[#8b3dff]/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#b388ff]">
              Standard
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("my-media")}
          className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "my-media"
              ? "text-[#8356F3] border-[#8356F3]"
              : "text-gray-400 border-transparent hover:text-white"
          }`}>
          MY MEDIA
        </button>
        <button
          onClick={() => setActiveTab("templates")}
          className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "templates"
              ? "text-[#8356F3] border-[#8356F3]"
              : "text-gray-400 border-transparent hover:text-white"
          }`}>
          TEMPLATES
        </button>
      </div>

      {/* Media Content */}
      <div className="flex-1 overflow-hidden">
        <DynamicMediaSections
          activeTab={activeTab}
          userId={currentUser?.id?.toString() || ""}
          hasUsedAssets={false}
          hasUploadedAssets={true}
          selectedMedia={selectedMedia}
          onMediaSelect={(selectedItem: any) => {
            setSelectedMedia(selectedItem);
            if (selectedItem?.asset) {
              onSelectMedia(selectedItem.asset);
            }
          }}
          isModal={true}
          onAssetSelect={(url: string) => {
            onSelectMedia(url as any);
          }}
          activeFilters={activeFilters}
        />
      </div>
    </div>
  );
};
