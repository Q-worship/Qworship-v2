import React, { useRef, useState } from "react";
import { XIcon, PlusIcon, Edit, Trash2, ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isSavedSongId, useCreateSong, useUpdateSong } from "@/features/songs/api/useSongs";
import { useDebounce } from "@/hooks/use-debounce";
import {
  commonLyricStyle,
  mergeLyricStyle,
  sameLyricStyle,
  type LyricAlign,
  type LyricCase,
  type LyricStyle,
} from "@/features/songs/songFormatting";
import {
  applyInlineFontSize,
  lyricHtmlForSection,
  plainToLyricHtml,
  sanitizeLyricHtml,
} from "@/features/songs/songRichText";
import { LyricEditor, readLyricEditor, type LyricEditorValue } from "@/features/songs/LyricEditor";
import { parseLyricsForEditor } from "@/features/songs/songLyrics";
import { LyricToolbar } from "@/features/songs/LyricToolbar";

interface SectionItem {
  id: string;
  type: "verse" | "chorus";
  number: number;
  label: string;
  content: string;
  /** Base formatting for the whole section */
  style?: LyricStyle;
  /** Inline formatting on selected words / lines (sanitised HTML) */
  html?: string;
}

// "rgb(12, 34, 56)" (what the browser reports) as "#0c2238" (what a colour input wants)
const rgbToHex = (value: string): string | undefined => {
  const match = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(value);
  if (!match) return /^#[0-9a-f]{6}$/i.test(value) ? value : undefined;
  return `#${[match[1], match[2], match[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("")}`;
};

interface SongEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (songData: any) => void;
  initialData?: any;
}

export const SongEditorModal: React.FC<SongEditorModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave,
  initialData 
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("title-lyrics");
  const [songTitle, setSongTitle] = useState("");
  const [alternativeTitle, setAlternativeTitle] = useState("");
  const [verseOrder, setVerseOrder] = useState<string[]>([]);
  const [verseOrderInput, setVerseOrderInput] = useState("");
  const debouncedVerseOrderInput = useDebounce(verseOrderInput, 300);
  const [showAddOptions, setShowAddOptions] = useState(false);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  // The section the formatting toolbar applies to; null means the whole song
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  // Bumped to reload every lyric box from the sections' data (opening a song, clearing formatting)
  const [editorEpoch, setEditorEpoch] = useState(0);
  // The lyric boxes by section id, and the words currently selected in them
  const editorsRef = useRef(new Map<string, HTMLDivElement>());
  const savedSelection = useRef<{ sectionId: string; range: Range } | null>(null);
  const [inlineSectionId, setInlineSectionId] = useState<string | null>(null);
  const [, setSelectionTick] = useState(0);

  const [sections, setSections] = useState<SectionItem[]>([
    { id: "v1", type: "verse", number: 1, label: "V1 (Verse 1)", content: "" },
    { id: "v2", type: "verse", number: 2, label: "V2 (Verse 2)", content: "" },
    { id: "v3", type: "verse", number: 3, label: "V3 (Verse 3)", content: "" }
  ]);

  const [authors, setAuthors] = useState("");
  const [topics, setTopics] = useState("");
  const [copyright, setCopyright] = useState("");

  // Mutation hooks from FSD architecture
  const createSongMutation = useCreateSong();
  const updateSongMutation = useUpdateSong();

  // Reset or populate fields when modal opens or initialData changes
  React.useEffect(() => {
    setSelectedSectionId(null);
    savedSelection.current = null;
    setInlineSectionId(null);
    // Reload the lyric boxes from whatever is set below
    setEditorEpoch((epoch) => epoch + 1);
    if (initialData) {
      setSongTitle(initialData.title || "");
      setAlternativeTitle(
        Array.isArray(initialData.alternativeTitles) ? initialData.alternativeTitles[0] || "" : "",
      );

      // For editing existing songs, use authors array, for imports use artist
      if (initialData.authors && Array.isArray(initialData.authors)) {
        setAuthors(initialData.authors.join(", "));
      } else if (initialData.artist) {
        setAuthors(initialData.artist);
      }
      
      // Set topics and copyright for editing existing songs
      if (initialData.topics && Array.isArray(initialData.topics)) {
        setTopics(initialData.topics.join(", "));
      }
      setCopyright(initialData.copyright || "");
      
      // Parse lyrics into sections if provided
      if (initialData.lyrics) {
        const parsedSections = parseLyricsIntoSections(initialData.lyrics).map((section) => {
          const style = initialData.sectionStyles?.[section.label];
          // Inline formatting is only kept while it still matches the section's text
          const html = lyricHtmlForSection(initialData, section.label, section.content);
          return {
            ...section,
            ...(style ? { style } : {}),
            ...(html ? { html } : {}),
          };
        });
        if (parsedSections.length > 0) {
          setSections(parsedSections);
        }
      } else if (initialData.sections && Array.isArray(initialData.sections)) {
        // If sections are directly provided (from existing songs)
        setSections(initialData.sections);
      }
      
      // Handle verse order/structure
      if (initialData.structure) {
        let structureArray;
        if (typeof initialData.structure === 'string') {
          try {
            structureArray = JSON.parse(initialData.structure);
          } catch (e) {
            // If parsing fails, treat as comma-separated string
            structureArray = initialData.structure.split(',').map(s => s.trim());
          }
        } else {
          structureArray = initialData.structure;
        }
        
        setVerseOrder(structureArray);
        setVerseOrderInput(structureArray.join(", "));
      } else if (initialData.verseOrder) {
        // Handle verseOrder string format from song viewer
        const orderArray = initialData.verseOrder.split(", ").map(s => s.trim());
        setVerseOrder(orderArray);
        setVerseOrderInput(initialData.verseOrder);
      }
    } else {
      // Reset form when no initial data (creating new song)
      setSongTitle("");
      setAlternativeTitle("");
      setAuthors("");
      setTopics("");
      setCopyright("");
      setVerseOrder([]);
      setVerseOrderInput("");
      setSections([
        { id: "v1", type: "verse", number: 1, label: "V1 (Verse 1)", content: "" },
        { id: "v2", type: "verse", number: 2, label: "V2 (Verse 2)", content: "" },
        { id: "v3", type: "verse", number: 3, label: "V3 (Verse 3)", content: "" }
      ]);
    }
  }, [initialData, isOpen]);

  // Reads saved lyrics back into sections (blank lines and empty sections are kept)
  const parseLyricsIntoSections = (lyrics: string): SectionItem[] => parseLyricsForEditor(lyrics);

  const addSection = (type: "verse" | "chorus") => {
    const existingSections = sections.filter(section => section.type === type);
    const newNumber = existingSections.length + 1;
    const prefix = type === "verse" ? "V" : "C";
    const label = type === "verse" ? `V${newNumber} (Verse ${newNumber})` : `C${newNumber} (Chorus ${newNumber})`;
    
    // A new section follows the song's formatting when every section shares one
    const firstStyle = sections[0]?.style;
    const sharedStyle =
      firstStyle && sections.every((s) => sameLyricStyle(s.style, firstStyle))
        ? firstStyle
        : undefined;

    const newSection: SectionItem = {
      id: `${type[0]}${newNumber}_${Date.now()}`,
      type,
      number: newNumber,
      label,
      content: "",
      ...(sharedStyle ? { style: { ...sharedStyle } } : {}),
    };
    setSections([...sections, newSection]);
    setShowAddOptions(false);
  };

  // The lyric box reports its text and inline formatting here as it is edited
  const updateSectionText = (sectionId: string, value: LyricEditorValue) => {
    setSections((current) =>
      current.map((section) =>
        section.id === sectionId ? { ...section, content: value.plain, html: value.html } : section,
      ),
    );
  };

  // ---- Formatting: one toolbar, three levels ----
  //  - words selected in a lyric box  -> only those words (inline formatting)
  //  - a section selected             -> that whole section
  //  - nothing selected               -> the whole song (every section)
  const targetSections = selectedSectionId
    ? sections.filter((section) => section.id === selectedSectionId)
    : sections;

  // Keep track of what is selected inside the lyric boxes
  React.useEffect(() => {
    if (!isOpen) return;
    const onSelectionChange = () => {
      const selection = document.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      for (const [id, el] of editorsRef.current) {
        if (el.contains(range.commonAncestorContainer)) {
          savedSelection.current = { sectionId: id, range: range.cloneRange() };
          setInlineSectionId(range.collapsed ? null : id);
          setSelectionTick((tick) => tick + 1);
          return;
        }
      }
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, [isOpen]);

  const registerEditor = (sectionId: string) => (el: HTMLDivElement | null) => {
    if (el) editorsRef.current.set(sectionId, el);
    else editorsRef.current.delete(sectionId);
  };

  // Choosing a section (or none) also drops any words that were selected elsewhere
  const selectSection = (sectionId: string | null) => {
    if (savedSelection.current && savedSelection.current.sectionId !== sectionId) {
      savedSelection.current = null;
      setInlineSectionId(null);
    }
    setSelectedSectionId(sectionId);
  };

  const syncSectionFromEditor = (sectionId: string) => {
    const el = editorsRef.current.get(sectionId);
    if (el) updateSectionText(sectionId, readLyricEditor(el));
  };

  // Runs a browser editing command on the selected words; false when no words are selected
  const runOnSelection = (command: (el: HTMLDivElement) => void): boolean => {
    const saved = savedSelection.current;
    if (!saved || saved.range.collapsed) return false;
    const el = editorsRef.current.get(saved.sectionId);
    if (!el) return false;
    el.focus();
    const selection = document.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(saved.range);
    document.execCommand("styleWithCSS", false, "true");
    command(el);
    syncSectionFromEditor(saved.sectionId);
    return true;
  };

  const applyBaseStyle = (change: LyricStyle) => {
    setSections((current) =>
      current.map((section) =>
        !selectedSectionId || section.id === selectedSectionId
          ? { ...section, style: mergeLyricStyle(section.style, change) }
          : section,
      ),
    );
  };

  // Formats the selected words if there are any, otherwise the section / whole song
  const format = (inline: ((el: HTMLDivElement) => void) | null, base: LyricStyle | null) => {
    if (inline && runOnSelection(inline)) return;
    if (base) applyBaseStyle(base);
  };

  const inlineActive = inlineSectionId !== null;
  const askBrowser = (command: string): boolean => {
    try {
      return document.queryCommandState(command);
    } catch {
      return false;
    }
  };

  // What the toolbar shows: for selected words, what the browser reports at the selection;
  // otherwise the section's own style, or the value every section agrees on
  const shownBase: LyricStyle = commonLyricStyle(targetSections.map((section) => section.style));
  const shown: LyricStyle = (() => {
    if (!inlineActive) return shownBase;
    let fontFamily: string | undefined;
    let color: string | undefined;
    try {
      const family = document.queryCommandValue("fontName").replace(/["']/g, "").split(",")[0].trim();
      fontFamily = family || undefined;
      color = rgbToHex(document.queryCommandValue("foreColor"));
    } catch {
      // not available in this browser
    }
    return {
      ...shownBase,
      bold: askBrowser("bold"),
      italic: askBrowser("italic"),
      underline: askBrowser("underline"),
      strike: askBrowser("strikeThrough"),
      fontFamily,
      color,
      fontSize: undefined,
    };
  })();

  const hasAnyFormatting = targetSections.some(
    (section) => section.style !== undefined || section.html !== undefined,
  );

  // Clear removes the base style and any inline formatting at the current level
  const clearFormatting = () => {
    if (inlineActive && runOnSelection(() => document.execCommand("removeFormat"))) return;
    setSections((current) =>
      current.map((section) => {
        if (selectedSectionId && section.id !== selectedSectionId) return section;
        const { style: _style, html: _html, ...rest } = section;
        return rest;
      }),
    );
    setEditorEpoch((epoch) => epoch + 1); // reload the boxes without their inline formatting
  };

  const scopeLabel = inlineActive
    ? "Selected text"
    : selectedSectionId
      ? (sections.find((s) => s.id === selectedSectionId)?.label ?? "Section")
      : "Whole song";

  const deleteSection = (sectionId: string) => {
    if (sections.length > 1) {
      setSections(sections.filter(section => section.id !== sectionId));
      if (selectedSectionId === sectionId) setSelectedSectionId(null);
    }
  };

  // Get available sections for verse order
  const getAvailableSections = () => {
    return sections.map(section => {
      const prefix = section.type === "verse" ? "V" : "C";
      return `${prefix}${section.number}`;
    });
  };

  // Add section to verse order (allow duplicates)
  const addToVerseOrder = (sectionTag: string) => {
    setVerseOrder([...verseOrder, sectionTag]);
    setVerseOrderInput("");
  };

  // Remove section from verse order
  const removeFromVerseOrder = (index: number) => {
    setVerseOrder(verseOrder.filter((_, i) => i !== index));
  };

  // Filter sections based on input
  const getFilteredSections = () => {
    const available = getAvailableSections();
    if (!debouncedVerseOrderInput) return available;
    return available.filter(section => 
      section.toLowerCase().includes(debouncedVerseOrderInput.toLowerCase())
    );
  };

  const handleSave = () => {
    if (!songTitle.trim()) {
      toast({
        title: "Error",
        description: "Please enter a song title",
        variant: "destructive",
      });
      return;
    }

    // Construct lyrics from sections
    const lyrics = sections.map(section => 
      `[${section.label}]\n${section.content}`
    ).join('\n\n');

    // Formatting per section, keyed by the section label used in the lyrics: the base style
    // of the whole section, and inline formatting on selected words / lines
    const sectionStyles: Record<string, LyricStyle> = {};
    const sectionHtml: Record<string, string> = {};
    sections.forEach((section) => {
      if (section.style) sectionStyles[section.label] = section.style;
      if (section.html) sectionHtml[section.label] = sanitizeLyricHtml(section.html);
    });

    const songData = {
      title: songTitle,
      alternativeTitles: alternativeTitle.trim() ? [alternativeTitle.trim()] : [],
      sectionStyles,
      sectionHtml,
      lyrics,
      structure: JSON.stringify(verseOrder), // Convert array to JSON string
      authors,
      topics,
      copyright
    };
    
    setShowSaveConfirmation(true);
    
    // Only a song that is really saved is updated; the built-in "Example Song" (and anything
    // else without a saved id) is saved as a new song in this account's library
    const isEditing = isSavedSongId(initialData?.id);
    const mutationOptions = {
      onSuccess: (data: any) => {
        setShowSaveConfirmation(false);
        toast({
          title: isEditing ? "Song Updated Successfully!" : "Song Saved Successfully!",
          description: isEditing 
            ? `"${songTitle}" has been updated in your songbook.`
            : `"${songTitle}" has been added to your songbook and will appear in recent songs.`,
        });
        // The saved song comes back from the server so the live service can pick up
        // its new formatting right away
        onSave?.({ title: songTitle, song: data?.song });
        onClose();
      },
      onError: (error: any) => {
        setShowSaveConfirmation(false);
        // 404: the song isn't in this account's library (songs are private to each account)
        const notInLibrary = isEditing && String(error?.message ?? "").startsWith("404");
        toast({
          title: "Error",
          description: notInLibrary
            ? "This song isn't in your library, so it can't be updated. Create it as a new song to keep your changes."
            : "Failed to save song: " + (error.message || "Unknown error"),
          variant: "destructive",
        });
      }
    };

    if (isEditing) {
      updateSongMutation.mutate({ id: initialData!.id, songData }, mutationOptions);
    } else {
      createSongMutation.mutate(songData, mutationOptions);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      {/* Fixed height, so the window keeps its size when switching tabs */}
      <div className="bg-[#2a1f4b] rounded-lg w-full max-w-7xl h-[90vh] flex flex-col text-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-600 flex-shrink-0">
          <h2 className="text-xl font-semibold">Song editor</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <XIcon size={20} />
          </button>
        </div>

        {/* Custom Tab Navigation */}
        <div className="flex border-b border-gray-600 flex-shrink-0">
          <button
            onClick={() => setActiveTab("title-lyrics")}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "title-lyrics" 
                ? "bg-[#8356F3] text-white" 
                : "bg-[#1a1537] text-gray-300 hover:bg-[#6d42c7] hover:text-white"
            }`}
          >
            Title & Lyrics
          </button>
          <button
            onClick={() => setActiveTab("authors-topics")}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "authors-topics" 
                ? "bg-[#8356F3] text-white" 
                : "bg-[#1a1537] text-gray-300 hover:bg-[#6d42c7] hover:text-white"
            }`}
          >
            Authors & Topics
          </button>
          <button
            onClick={() => setActiveTab("copyright")}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "copyright" 
                ? "bg-[#8356F3] text-white" 
                : "bg-[#1a1537] text-gray-300 hover:bg-[#6d42c7] hover:text-white"
            }`}
          >
            Copyright
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* Title & Lyrics Tab */}
          {activeTab === "title-lyrics" && (
            <div className="p-4 space-y-4">
              {/* The title row and the toolbar end where the sections end (the buttons
                  column on the right is w-20 plus a gap-4, which is pr-24) */}
              <div className="pr-24 space-y-4">
              {/* Title Fields: song title and alternative title side by side */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Song Title</label>
                  <Input
                    value={songTitle}
                    onChange={(e) => setSongTitle(e.target.value)}
                    className="bg-[#3d3166] border-gray-500 text-white placeholder-gray-400 h-8 text-sm"
                    placeholder=""
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Alternative Title</label>
                  <Input
                    value={alternativeTitle}
                    onChange={(e) => setAlternativeTitle(e.target.value)}
                    className="bg-[#3d3166] border-gray-500 text-white placeholder-gray-400 h-8 text-sm"
                    placeholder=""
                  />
                </div>
              </div>

              {/* The formatting toolbar: selected words, a selected section, or the whole song */}
              <LyricToolbar
                scopeLabel={scopeLabel}
                inlineActive={inlineActive}
                canFormatWholeSong={selectedSectionId !== null}
                shown={shown}
                canClear={hasAnyFormatting || inlineActive}
                onWholeSong={() => selectSection(null)}
                onBold={() => format(() => document.execCommand("bold"), { bold: !shownBase.bold })}
                onItalic={() => format(() => document.execCommand("italic"), { italic: !shownBase.italic })}
                onUnderline={() =>
                  format(() => document.execCommand("underline"), { underline: !shownBase.underline })
                }
                onStrike={() =>
                  format(() => document.execCommand("strikeThrough"), { strike: !shownBase.strike })
                }
                onColor={(hex) => format(() => document.execCommand("foreColor", false, hex), { color: hex })}
                onHighlight={(hex) => format(() => document.execCommand("hiliteColor", false, hex), null)}
                onFontFamily={(name) =>
                  format(
                    name ? () => document.execCommand("fontName", false, name) : null,
                    { fontFamily: name || undefined },
                  )
                }
                onFontSize={(percent) =>
                  format(
                    (el) => {
                      // The browser only knows seven sizes; use its biggest as a marker and
                      // swap in the exact size wanted
                      document.execCommand("fontSize", false, "7");
                      applyInlineFontSize(el, percent);
                    },
                    { fontSize: percent },
                  )
                }
                onAlign={(align: LyricAlign) => format(null, { align })}
                onCase={(value: LyricCase | undefined) => format(null, { textTransform: value })}
                onLineHeight={(value) => format(null, { lineHeight: value })}
                onLetterSpacing={(value) => format(null, { letterSpacing: value })}
                onClear={clearFormatting}
              />
              </div>

              {/* Sections (Songs & Choruses) */}
              <div className="flex gap-4">
                {/* Sections List: click a section to format only it; click the gap
                    between sections to go back to formatting the whole song */}
                <div
                  className="flex-1 min-w-0 space-y-3"
                  onClick={(e) => {
                    if (e.target === e.currentTarget) selectSection(null);
                  }}
                >
                  {sections.map((section, index) => (
                    <div
                      key={section.id}
                      onClick={() => selectSection(section.id)}
                      className={`bg-[#3d3166] border rounded cursor-pointer ${
                        selectedSectionId === section.id
                          ? "border-[#8356F3] ring-1 ring-[#8356F3]"
                          : "border-gray-500"
                      }`}
                    >
                      <div className="flex items-center justify-between p-2 border-b border-gray-500">
                        <span className="text-gray-300 font-medium text-sm">{section.label}</span>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSection(section.id);
                          }}
                          className="bg-[#8356F3] hover:bg-[#6d42c7] text-white text-xs h-6 w-6 p-0"
                        >
                          ×
                        </Button>
                      </div>
                      <div className="p-2">
                        {/* Edited as it will look: select words or lines to format just those */}
                        <LyricEditor
                          key={`${section.id}-${editorEpoch}`}
                          initialHtml={
                            section.html ? sanitizeLyricHtml(section.html) : plainToLyricHtml(section.content)
                          }
                          style={section.style}
                          placeholder={`Enter ${section.type} lyrics...`}
                          onChange={(value) => updateSectionText(section.id, value)}
                          onFocus={() => selectSection(section.id)}
                          registerEditor={registerEditor(section.id)}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="w-20 space-y-2 flex-shrink-0 relative">
                  <div className="relative">
                    <Button
                      onClick={() => setShowAddOptions(!showAddOptions)}
                      className="w-full bg-[#8356F3] hover:bg-[#6d42c7] text-white text-xs h-8 flex items-center justify-center gap-1"
                    >
                      Add
                      <ChevronDownIcon size={12} />
                    </Button>
                    
                    {/* Add Options Dropdown */}
                    {showAddOptions && (
                      <div className="absolute top-10 left-0 w-full bg-[#3d3166] border border-gray-500 rounded shadow-lg z-10">
                        <Button
                          onClick={() => addSection("verse")}
                          className="w-full bg-transparent hover:bg-[#4a3a75] text-white text-xs h-8 justify-start rounded-none"
                        >
                          Verse
                        </Button>
                        <Button
                          onClick={() => addSection("chorus")}
                          className="w-full bg-transparent hover:bg-[#4a3a75] text-white text-xs h-8 justify-start rounded-none"
                        >
                          Chorus
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <Button
                    className="w-full bg-[#8356F3] hover:bg-[#6d42c7] text-white text-xs h-8"
                  >
                    Edit
                  </Button>
                  <Button
                    className="w-full bg-[#8356F3] hover:bg-[#6d42c7] text-white text-xs h-8"
                  >
                    Edit All
                  </Button>
                </div>
              </div>

              {/* Verse Order - Dynamic Tag System */}
              <div className="mt-4">
                <label className="block text-xs font-medium text-gray-300 mb-1">Verse Order</label>
                
                {/* Current Tags */}
                <div className="flex flex-wrap gap-1 mb-2 min-h-[32px] p-2 bg-[#3d3166] border border-gray-500 rounded">
                  {verseOrder.map((tag, index) => (
                    <span 
                      key={index}
                      className="bg-[#8356F3] text-white px-2 py-1 rounded text-xs flex items-center gap-1"
                    >
                      {tag}
                      <button
                        onClick={() => removeFromVerseOrder(index)}
                        className="hover:bg-[#6d42c7] rounded"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {verseOrder.length === 0 && (
                    <span className="text-gray-400 text-xs">Search and add sections (e.g., V1, C1, V2...)</span>
                  )}
                </div>

                {/* Search Input */}
                <div className="relative">
                  <Input
                    value={verseOrderInput}
                    onChange={(e) => setVerseOrderInput(e.target.value)}
                    className="bg-[#3d3166] border-gray-500 text-white placeholder-gray-400 h-8 text-sm"
                    placeholder="Type to search sections (V1, C1, etc.)"
                  />
                  
                  {/* Dropdown with filtered options */}
                  {verseOrderInput && (
                    <div className="absolute top-10 left-0 right-0 bg-[#3d3166] border border-gray-500 rounded shadow-lg z-20 max-h-32 overflow-y-auto">
                      {getFilteredSections().map((section) => (
                        <button
                          key={section}
                          onClick={() => addToVerseOrder(section)}
                          className="w-full text-left px-3 py-2 text-white text-sm hover:bg-[#4a3a75] flex items-center gap-2"
                        >
                          <span className="bg-[#8356F3] px-1 py-0.5 rounded text-xs">{section}</span>
                          <span className="text-gray-300">
                            {sections.find(s => `${s.type === "verse" ? "V" : "C"}${s.number}` === section)?.label}
                          </span>
                        </button>
                      ))}
                      {getFilteredSections().length === 0 && (
                        <div className="px-3 py-2 text-gray-400 text-sm">No matching sections found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Authors & Topics Tab */}
          {activeTab === "authors-topics" && (
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Authors</label>
                <Textarea
                  value={authors}
                  onChange={(e) => setAuthors(e.target.value)}
                  className="bg-[#3d3166] border-gray-500 text-white placeholder-gray-400 text-sm"
                  placeholder=""
                  rows={4}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Topics</label>
                <Textarea
                  value={topics}
                  onChange={(e) => setTopics(e.target.value)}
                  className="bg-[#3d3166] border-gray-500 text-white placeholder-gray-400 text-sm"
                  placeholder=""
                  rows={4}
                />
              </div>
            </div>
          )}

          {/* Copyright Tab */}
          {activeTab === "copyright" && (
            <div className="p-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Copyright Information</label>
                <Textarea
                  value={copyright}
                  onChange={(e) => setCopyright(e.target.value)}
                  className="bg-[#3d3166] border-gray-500 text-white placeholder-gray-400 text-sm"
                  placeholder=""
                  rows={8}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-600 flex-shrink-0">
          <Button
            onClick={handleCancel}
            variant="outline"
            className="bg-transparent border-gray-500 text-gray-300 hover:bg-[#3d3166] hover:border-gray-400 h-8 px-4 text-sm"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-[#8356F3] hover:bg-[#6d42c7] text-white h-8 px-4 text-sm"
          >
            Save
          </Button>
        </div>
      </div>

      {/* Save Confirmation Modal */}
      {showSaveConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#2a1f3f] border border-gray-500 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-4 border-[#8356F3] border-t-transparent rounded-full mx-auto mb-4" />
              <h3 className="text-white text-lg font-medium mb-2">Saving Song...</h3>
              <p className="text-gray-300 text-sm">
                "{songTitle}" is being added to your songbook
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};