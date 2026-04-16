import React, { useState, useRef, useCallback } from "react";
import { SearchIcon, Globe, ExternalLink, RefreshCw, XIcon, ArrowLeft, ArrowRight, Lock, Maximize2, Minimize2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface WebPageEditorProps {
  editingContent: any;
  updateItemContent: (
    id: string,
    title: string,
    content: any,
    slides?: any[],
    metadata?: Record<string, any>,
  ) => void;
}

export const WebPageEditor: React.FC<WebPageEditorProps> = ({
  editingContent,
  updateItemContent,
}) => {
  const [urlInput, setUrlInput] = useState<string>(
    editingContent?.content?.url || ""
  );
  const [loadedUrl, setLoadedUrl] = useState<string>(
    editingContent?.content?.url || ""
  );
  const [isLoading, setIsLoading] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Normalize URL - add https:// if not present
  const normalizeUrl = (url: string): string => {
    let trimmed = url.trim();
    if (!trimmed) return "";
    if (
      !trimmed.startsWith("http://") &&
      !trimmed.startsWith("https://")
    ) {
      trimmed = "https://" + trimmed;
    }
    return trimmed;
  };

  // Handle URL submission
  const handleLoadUrl = useCallback(() => {
    const normalized = normalizeUrl(urlInput);
    if (!normalized) return;

    setIsLoading(true);
    setIframeError(false);
    setLoadedUrl(normalized);
    setUrlInput(normalized);

    // Update the service item with the URL
    if (editingContent) {
      const newContent = {
        ...(typeof editingContent.content === "object"
          ? editingContent.content
          : {}),
        url: normalized,
      };

      updateItemContent(
        editingContent.id,
        editingContent.title || "Web Page",
        newContent,
        [
          {
            id:
              editingContent.slides?.[0]?.id ||
              `slide-${editingContent.id}-${Date.now()}`,
            type: "media" as const,
            subtype: "webpage",
            title: editingContent.title || "Web Page",
            content: normalized,
            sectionLabel: "Web Page",
          },
        ],
        { subtype: "webpage" },
      );
    }
  }, [urlInput, editingContent, updateItemContent]);

  // Handle key press in URL input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleLoadUrl();
    }
  };

  // Handle iframe load
  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  // Handle iframe error
  const handleIframeError = () => {
    setIsLoading(false);
    setIframeError(true);
  };

  // Refresh iframe
  const handleRefresh = () => {
    if (iframeRef.current && loadedUrl) {
      setIsLoading(true);
      setIframeError(false);
      iframeRef.current.src = loadedUrl;
    }
  };

  // Clear URL
  const handleClear = () => {
    setUrlInput("");
    setLoadedUrl("");
    setIframeError(false);
    setIsLoading(false);

    if (editingContent) {
      updateItemContent(
        editingContent.id,
        "Web Page",
        { url: "" },
        [
          {
            id:
              editingContent.slides?.[0]?.id ||
              `slide-${editingContent.id}-${Date.now()}`,
            type: "media" as const,
            subtype: "webpage",
            title: "Web Page",
            content: "",
            sectionLabel: "Web Page",
          },
        ],
        { subtype: "webpage" },
      );
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500/30 to-cyan-500/30 border border-teal-500/40 flex items-center justify-center">
            <Globe className="w-5 h-5 text-teal-300" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg">Webpage</h3>
            <p className="text-gray-400 text-xs">
              Load and display external web content
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-400 hover:text-white hover:bg-[#ffffff15] w-8 h-8 p-0"
          title={isExpanded ? "Collapse" : "Expand"}
        >
          {isExpanded ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* URL Search Bar */}
      <div className="mb-4">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter a webpage url to search"
              className="bg-[#1a0f2e] border-gray-600 text-white pl-10 pr-10 placeholder:text-gray-500 focus:border-teal-500/50 focus:ring-teal-500/20 h-10"
            />
            {urlInput && (
              <button
                onClick={handleClear}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                <XIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <Button
            onClick={handleLoadUrl}
            disabled={!urlInput.trim()}
            className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white px-4 h-10 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ExternalLink className="w-4 h-4 mr-1.5" />
            Load
          </Button>
        </div>
        {loadedUrl && (
          <div className="flex items-center mt-2 text-xs">
            <Lock className="w-3 h-3 text-green-400 mr-1.5 flex-shrink-0" />
            <span className="text-teal-400 truncate">{loadedUrl}</span>
          </div>
        )}
      </div>

      {/* Browser Navigation Bar (shown when URL is loaded) */}
      {loadedUrl && (
        <div className="flex items-center gap-2 mb-3 px-1">
          <button
            onClick={() => {
              if (iframeRef.current) {
                try {
                  iframeRef.current.contentWindow?.history.back();
                } catch {
                  /* cross-origin */
                }
              }
            }}
            className="w-7 h-7 rounded-md bg-[#1a0f2e] border border-gray-600 flex items-center justify-center text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
            title="Go back"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              if (iframeRef.current) {
                try {
                  iframeRef.current.contentWindow?.history.forward();
                } catch {
                  /* cross-origin */
                }
              }
            }}
            className="w-7 h-7 rounded-md bg-[#1a0f2e] border border-gray-600 flex items-center justify-center text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
            title="Go forward"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRefresh}
            className="w-7 h-7 rounded-md bg-[#1a0f2e] border border-gray-600 flex items-center justify-center text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <div className="flex-1 bg-[#0f0624] border border-gray-700 rounded-md px-3 py-1 flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-green-400 flex-shrink-0" />
            <span className="text-gray-300 text-xs truncate font-mono">
              {loadedUrl}
            </span>
          </div>
        </div>
      )}

      {/* iframe / Content Area */}
      <div
        className={`flex-1 border border-gray-600 rounded-lg overflow-hidden relative ${
          isExpanded ? "min-h-[500px]" : "min-h-[300px]"
        }`}
        style={{ backgroundColor: "#1a0f2e" }}
      >
        {loadedUrl ? (
          <>
            {/* Loading overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-[#1a0f2e]/90 flex items-center justify-center z-20">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-3 border-teal-500/30 border-t-teal-400 rounded-full animate-spin" />
                  <span className="text-teal-300 text-sm font-medium">
                    Loading webpage...
                  </span>
                </div>
              </div>
            )}

            {/* Error overlay */}
            {iframeError && (
              <div className="absolute inset-0 bg-[#1a0f2e] flex items-center justify-center z-20">
                <div className="flex flex-col items-center gap-3 text-center p-6">
                  <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                    <Globe className="w-7 h-7 text-red-400" />
                  </div>
                  <h4 className="text-white font-medium">
                    Unable to load webpage
                  </h4>
                  <p className="text-gray-400 text-sm max-w-xs">
                    This website may not allow embedding. Try a different URL or
                    check the website's security settings.
                  </p>
                  <Button
                    onClick={handleRefresh}
                    variant="ghost"
                    className="text-teal-400 hover:text-teal-300 hover:bg-teal-500/10 mt-2"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              </div>
            )}

            {/* Live URL indicator badge */}
            <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm rounded-md px-2 py-1">
              <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" />
              <span className="text-teal-300 text-[10px] font-semibold uppercase tracking-wider">
                Live
              </span>
            </div>

            {/* The iframe */}
            <iframe
              ref={iframeRef}
              src={loadedUrl}
              title="Web Page Preview"
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              style={{ minHeight: isExpanded ? "500px" : "300px" }}
            />
          </>
        ) : (
          /* Empty State */
          <div className="flex items-center justify-center h-full min-h-[300px]">
            <div className="flex flex-col items-center gap-4 text-center p-8">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-500/10 to-cyan-500/10 border border-teal-500/20 flex items-center justify-center">
                <Globe className="w-10 h-10 text-teal-500/50" />
              </div>
              <div>
                <h4 className="text-gray-300 font-medium text-base mb-1">
                  Ready for content
                </h4>
                <p className="text-gray-500 text-sm max-w-xs">
                  Enter a webpage URL above to load and display interactive web
                  content in your presentation
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {[
                  { label: "YouTube", url: "https://www.youtube.com" },
                  { label: "Qworship", url: "https://www.qworship.com" },
                ].map((suggestion) => (
                  <button
                    key={suggestion.label}
                    onClick={() => {
                      setUrlInput(suggestion.url);
                    }}
                    className="px-3 py-1.5 rounded-md bg-[#2a1f3d] border border-gray-600 text-gray-300 text-xs hover:border-teal-500/40 hover:text-teal-300 hover:bg-teal-500/5 transition-all"
                  >
                    {suggestion.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info footer */}
      <div className="mt-3 p-3 bg-teal-900/15 border border-teal-500/20 rounded-lg">
        <p className="text-teal-300/80 text-xs flex items-start gap-2">
          <Globe className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>
            The loaded webpage will be displayed in the Live Preview,
            audience screen, and live console. Some websites may restrict
            embedding for security reasons.
          </span>
        </p>
      </div>
    </div>
  );
};
