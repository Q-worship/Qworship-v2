import React, { useState } from "react";
import { XIcon, Edit, Play, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isSavedSongId, useDeleteSong } from "@/features/songs/api/useSongs";
import { SongLyricsBody } from "@/features/songs/SongLyricsBody";
import { sectionFormat } from "@/features/songs/songSlides";
import { formatExactTime, formatRelativeTime, wasEdited } from "@/features/songs/songTime";
import { useNow } from "@/features/songs/useNow";

interface SongData {
  id: string;
  title: string;
  alternativeTitles?: string[];
  sections?: Array<{
    id: string;
    type: "verse" | "chorus";
    number: number;
    label: string;
    content: string;
  }>;
  verseOrder?: string;
  authors?: string[] | string;
  topics?: string[] | string;
  copyright?: string;
  dateAdded: string;
  createdAt?: string;
  /** When the song was last saved (changes on every edit) */
  updatedAt?: string;
  artist?: string;
  sectionStyles?: Record<string, any>;
  sectionHtml?: Record<string, string>;
}

// Authors / topics are saved as lists; show them as "A, B"
const listText = (value: string[] | string | undefined): string =>
  (Array.isArray(value) ? value.join(", ") : (value ?? "")).trim();

interface SongViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  song: SongData | null;
  onEdit?: (song: SongData) => void;
  onDelete?: (songId: string) => void;
  onAddToServiceSection?: (songItem: any, sectionIds: string[]) => void;
}

export const SongViewerModal: React.FC<SongViewerModalProps> = ({ 
  isOpen, 
  onClose, 
  song,
  onEdit,
  onDelete,
  onAddToServiceSection
}) => {
  const [activeTab, setActiveTab] = useState("lyrics");
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showServiceSectionModal, setShowServiceSectionModal] = useState(false);
  const [selectedServiceSections, setSelectedServiceSections] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // Ticks, so "Last edited 5 min ago" stays right while the song is open
  const now = useNow();

  // Service sections for presentation
  const serviceSections = [
    { id: "PRE-SERVICE ITEMS", label: "PRE-SERVICE ITEMS", description: "Items to display before the service begins" },
    { id: "WARM - UP", label: "WARM - UP", description: "Opening songs and welcome content" },
    { id: "SERVICE ITEMS", label: "SERVICE ITEMS", description: "Main service content and worship songs" },
    { id: "POST SERVICE LOOP", label: "POST SERVICE LOOP", description: "Closing songs and announcements" }
  ];

  // Delete mutation
  const deleteMutation = useDeleteSong();

  const handleDelete = () => {
    // The built-in "Example Song" isn't stored on the server, so there is nothing to delete;
    // it disappears by itself once the account has songs of its own
    if (song?.id && !isSavedSongId(song.id)) {
      toast({
        title: "This is the built-in example",
        description: "It goes away on its own as soon as you add your own songs.",
        className: "bg-gradient-to-r from-purple-900 to-purple-800 text-white backdrop-blur-sm"
      });
      onClose();
      setShowDeleteConfirmation(false);
      return;
    }
    if (song?.id) {
      deleteMutation.mutate(song.id, {
        onSuccess: () => {
          toast({
            title: "Song deleted successfully",
            description: "The song has been removed from your songbook.",
            className: "bg-gradient-to-r from-purple-900 to-purple-800 text-white backdrop-blur-sm"
          });
          onClose();
          setShowDeleteConfirmation(false);
        },
        onError: (error: any) => {
          toast({
            title: "Delete failed",
            description: error.message || "Failed to delete the song. Please try again.",
            variant: "destructive"
          });
        }
      });
    }
  };

  const handlePresent = () => {
    setSelectedServiceSections([]);
    setShowServiceSectionModal(true);
  };

  const handleServiceSectionToggle = (sectionId: string) => {
    setSelectedServiceSections(prev => {
      if (prev.includes(sectionId)) {
        return prev.filter(id => id !== sectionId);
      } else {
        return [...prev, sectionId];
      }
    });
  };

  const handleAddToSelectedSections = () => {
    if (!song || selectedServiceSections.length === 0) return;

    const presentableSections = (song.sections || []).filter((section) => section.content?.trim());

    // Create song item for the service sections
    const songItem = {
      id: `song-${song.id}-${Date.now()}`,
      type: "song",
      title: song.title,
      artist: song.artist || (Array.isArray(song.authors) ? song.authors.join(", ") : song.authors) || "Unknown Artist",
      // Sections with no words are left out, so they don't become blank slides on the screen
      content: presentableSections,
      sections: presentableSections, // Add sections field for slide creation
      lyrics: (song as any).lyrics, // Include lyrics field for fallback slide creation
      structure: (song as any).structure, // Include structure field
      verseOrder: song.verseOrder,
      // Formatting saved with the song, so its slides show it on the live screen
      sectionStyles: song.sectionStyles,
      sectionHtml: song.sectionHtml,
      songId: song.id
    };

    if (onAddToServiceSection) {
      // Use the prop function to integrate with dashboard state
      onAddToServiceSection(songItem, selectedServiceSections);
    } else {
      // Fallback to localStorage (for backward compatibility)
      const existingItems = JSON.parse(localStorage.getItem('qworship-service-items') || '{}');
      
      selectedServiceSections.forEach(sectionId => {
        const sectionItems = existingItems[sectionId] || [];
        sectionItems.push({...songItem, id: `song-${song.id}-${sectionId}-${Date.now()}`});
        existingItems[sectionId] = sectionItems;
      });
      
      localStorage.setItem('qworship-service-items', JSON.stringify(existingItems));
    }

    const sectionNames = selectedServiceSections.join(", ");
    toast({
      title: "Song added to service sections",
      description: `"${song.title}" has been added to: ${sectionNames}`,
      className: "bg-gradient-to-r from-purple-900 to-purple-800 text-white backdrop-blur-sm"
    });

    setShowServiceSectionModal(false);
    setSelectedServiceSections([]);
    onClose(); // Close the song viewer modal
  };

  if (!isOpen || !song) return null;

  type ViewSection = NonNullable<SongData["sections"]>[number];

  // One saved section, shown the way it was saved: with its formatting and its blank lines
  const renderSection = (section: ViewSection, key: string) => (
    <div key={key} className="bg-[#3d3166] rounded-lg p-4">
      <h4 className="text-[#8356F3] font-medium mb-2">{section.label}</h4>
      <div className="text-white whitespace-pre-line leading-relaxed">
        {section.content ? (
          <SongLyricsBody
            slide={{
              content: section.content,
              ...sectionFormat(song, section.label, section.content),
            }}
          />
        ) : (
          "No lyrics added yet..."
        )}
      </div>
    </div>
  );

  // The tag the editor gives a section in the verse order: V1, V2 ... C1 ...
  const sectionMatchesTag = (section: ViewSection, tag: string) => {
    const expected = `${section.type === "verse" ? "V" : "C"}${section.number}`;
    return expected === tag || (section.type === "chorus" && section.number === 1 && tag === "C");
  };

  const renderSongLyrics = () => {
    // A section with no words has nothing to show
    const sections = (song.sections ?? []).filter((section) => section.content?.trim());
    if (sections.length === 0) {
      return (
        <div className="bg-[#3d3166] rounded-lg p-4">
          <p className="text-gray-400">No lyrics available for this song.</p>
        </div>
      );
    }

    if (!song.verseOrder) {
      return <div className="space-y-4">{sections.map((section) => renderSection(section, section.id))}</div>;
    }

    // In the verse order first (a section can repeat), then any saved section the order does
    // not list, so nothing that was saved is ever hidden
    const order = song.verseOrder.split(",").map((tag) => tag.trim()).filter(Boolean);
    const inOrder = order.flatMap((tag, index) => {
      const section = sections.find((candidate) => sectionMatchesTag(candidate, tag));
      return section ? [{ section, key: `${section.id}-${index}` }] : [];
    });
    const used = new Set(inOrder.map((entry) => entry.section.id));
    const leftOut = sections.filter((section) => !used.has(section.id));

    return (
      <div className="space-y-4">
        {inOrder.map((entry) => renderSection(entry.section, entry.key))}
        {leftOut.length > 0 && (
          <>
            {inOrder.length > 0 && (
              <p className="pt-2 text-xs uppercase tracking-wide text-gray-400">Not in the verse order</p>
            )}
            {leftOut.map((section) => renderSection(section, `extra-${section.id}`))}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#2a1f3f] rounded-lg w-full max-w-6xl h-[750px] flex flex-col text-white">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-600">
          <div>
            <h2 className="text-2xl font-semibold">{song.title}</h2>
            {song.alternativeTitles && song.alternativeTitles.length > 0 && (
              <p className="text-sm text-gray-400 mt-1">
                Also known as: {song.alternativeTitles.filter(Boolean).join(", ")}
              </p>
            )}
            {(song.authors && Array.isArray(song.authors) && song.authors.length > 0) ? (
              <p className="text-sm text-gray-400">by {song.authors.join(", ")}</p>
            ) : song.artist && song.artist !== "Unknown Artist" && song.artist ? (
              <p className="text-sm text-gray-400">by {song.artist}</p>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <XIcon size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-600">
          <button
            onClick={() => setActiveTab("lyrics")}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "lyrics"
                ? "text-[#8356F3] border-b-2 border-[#8356F3]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Lyrics
          </button>
          <button
            onClick={() => setActiveTab("details")}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "details"
                ? "text-[#8356F3] border-b-2 border-[#8356F3]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Details
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "lyrics" && (
            <div className="p-6">
              <div className="mb-4">
                <h3 className="text-lg font-medium mb-2">Song Structure</h3>
                {song.verseOrder && (
                  <div className="bg-[#3d3166] rounded-lg p-3 mb-4">
                    <p className="text-sm text-gray-300">
                      <span className="font-medium">Order:</span> {song.verseOrder}
                    </p>
                  </div>
                )}
              </div>
              {renderSongLyrics()}
            </div>
          )}

          {activeTab === "details" && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Authors</h4>
                  <p className="text-white">{listText(song.authors) || "Not specified"}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Topics</h4>
                  <p className="text-white">{listText(song.topics) || "Not specified"}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Date Added</h4>
                  <p className="text-white" title={formatExactTime(song.createdAt)}>
                    {song.createdAt ? formatRelativeTime(song.createdAt, now) : song.dateAdded}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Last Edited</h4>
                  <p className="text-white" title={formatExactTime(song.updatedAt)}>
                    {wasEdited(song.createdAt, song.updatedAt)
                      ? formatRelativeTime(song.updatedAt, now)
                      : "Not edited yet"}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Sections</h4>
                  <p className="text-white">{song.sections?.length || 0} sections</p>
                </div>
              </div>
              
              {song.copyright && (
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Copyright</h4>
                  <div className="bg-[#3d3166] rounded-lg p-4">
                    <p className="text-white whitespace-pre-line">{song.copyright}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-6 border-t border-gray-600">
          <Button
            onClick={onClose}
            variant="outline"
            className="bg-transparent border-gray-500 text-gray-300 hover:bg-[#3d3166] hover:border-gray-400"
          >
            Close
          </Button>
          <div className="flex gap-3">
            <Button
              onClick={handlePresent}
              className="bg-[#8356F3] hover:bg-[#6d42c7] text-white"
            >
              <Play size={16} className="mr-2" />
              Present
            </Button>
            {onEdit && (
              <Button
                onClick={() => onEdit(song)}
                className="bg-[#8356F3] hover:bg-[#6d42c7] text-white"
              >
                <Edit size={16} className="mr-2" />
                Edit
              </Button>
            )}
            <Button
              onClick={() => setShowDeleteConfirmation(true)}
              variant="outline"
              className="bg-transparent border-red-500 text-red-400 hover:bg-red-500/10 hover:border-red-400"
            >
              <Trash2 size={16} className="mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
          <div className="bg-[#2a1f3f] rounded-lg p-6 w-full max-w-md mx-4 text-white border border-gray-600">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-500/10 border border-red-500/20">
                <Trash2 size={20} className="text-red-400" />
              </div>
              <h3 className="text-xl font-semibold">Delete Song</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-300 mb-2">
                Are you sure you want to delete <span className="font-semibold text-white">"{song.title}"</span>?
              </p>
              <p className="text-sm text-gray-400">
                This action cannot be undone. The song and all its lyrics will be permanently removed from your songbook.
              </p>
            </div>
            
            <div className="flex gap-3 justify-end">
              <Button
                onClick={() => setShowDeleteConfirmation(false)}
                variant="outline"
                className="bg-transparent border-gray-500 text-gray-300 hover:bg-[#3d3166] hover:border-gray-400"
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white border-0"
              >
                {deleteMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} className="mr-2" />
                    Delete Song
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Service Section Selection Modal */}
      {showServiceSectionModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
          <div className="bg-[#2a1f3f] rounded-lg p-6 w-full max-w-md mx-4 text-white border border-gray-600">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-purple-500/10 border border-purple-500/20">
                <Play size={20} className="text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold">Add to Service</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-300 mb-4">
                Choose which service section to add <span className="font-semibold text-white">"{song?.title}"</span> to:
              </p>
              
              <div className="space-y-2">
                {serviceSections.map((section) => {
                  const isSelected = selectedServiceSections.includes(section.id);
                  return (
                    <button
                      key={section.id}
                      onClick={() => handleServiceSectionToggle(section.id)}
                      className={`w-full text-left p-3 rounded-lg transition-colors border ${
                        isSelected 
                          ? 'bg-purple-600/20 border-purple-500 hover:bg-purple-600/30' 
                          : 'bg-[#3d3166] hover:bg-[#4a3a75] border-gray-600 hover:border-purple-500/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-white mb-1">{section.label}</div>
                          <div className="text-sm text-gray-400">{section.description}</div>
                        </div>
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ml-3 ${
                          isSelected 
                            ? 'bg-purple-600 border-purple-500' 
                            : 'border-gray-500'
                        }`}>
                          {isSelected && <Check size={14} className="text-white" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="flex gap-3 justify-end">
              <Button
                onClick={() => {
                  setShowServiceSectionModal(false);
                  setSelectedServiceSections([]);
                }}
                variant="outline"
                className="bg-transparent border-gray-500 text-gray-300 hover:bg-[#3d3166] hover:border-gray-400"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddToSelectedSections}
                disabled={selectedServiceSections.length === 0}
                className="bg-[#8356F3] hover:bg-[#6d42c7] text-white disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                Add ({selectedServiceSections.length})
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};