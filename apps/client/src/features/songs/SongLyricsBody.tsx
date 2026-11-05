import React, { useMemo } from "react";
import { lyricStyleToCss } from "./songFormatting";
import { htmlMatchesContent, sanitizeLyricHtml } from "./songRichText";

/**
 * The lyrics of a song slide with the formatting chosen in the Song editor: the section's base
 * style (font, size, bold, colour, alignment ...) plus any inline formatting on selected words
 * or lines. It sits inside each screen's own text container, so everything it does not set
 * (size, colour, shadow ...) still comes from that screen's live settings.
 */
export const SongLyricsBody: React.FC<{ slide: any }> = ({ slide }) => {
  const content: string = slide?.content ?? "";
  const lyricHtml: string | undefined = slide?.lyricHtml;

  // Inline formatting is only used while it still says what the slide's text says
  const html = useMemo(() => {
    if (!lyricHtml) return null;
    const clean = sanitizeLyricHtml(lyricHtml);
    return clean && htmlMatchesContent(clean, content) ? clean : null;
  }, [lyricHtml, content]);

  return (
    <div style={lyricStyleToCss(slide?.lyricStyle)}>
      {html ? <div dangerouslySetInnerHTML={{ __html: html }} /> : content}
    </div>
  );
};
