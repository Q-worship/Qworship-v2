export interface SlideCanvasElementTemplate {
  id: string;
  type: "text" | "rect" | "image";
  layerName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  locked: boolean;
  hidden: boolean;
  content?: string;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: "left" | "center" | "right" | "justify";
  alignVertical?: "top" | "middle" | "bottom";
  textSizing?: "Dynamic" | "Box" | "Fixed";
  textWrap?: "Single-line" | "Multi-line";
  dropShadow?: boolean;
  stroke?: boolean;
  warp?: boolean;
  textOnCircle?: boolean;
  backgroundShape?: boolean;
  shapeType?: "square" | "circle" | "triangle" | "star" | "line";
}

export interface SlideCanvasBackgroundTemplate {
  type: "color" | "image" | "transparent";
  value: string;
}

export interface SlideCanvasTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  canvasBackground: SlideCanvasBackgroundTemplate;
  elements: SlideCanvasElementTemplate[];
  source: "built-in" | "custom";
  createdAt?: string;
  preview: {
    gradient: string;
    accent: string;
  };
}

const CUSTOM_TEMPLATE_STORAGE_KEY = "qworship-slide-canvas-custom-templates-v1";

const textEl = (
  id: string,
  layerName: string,
  content: string,
  x: number,
  y: number,
  width: number,
  height: number,
  overrides: Partial<SlideCanvasElementTemplate> = {},
): SlideCanvasElementTemplate => ({
  id,
  type: "text",
  layerName,
  x,
  y,
  width,
  height,
  rotation: 0,
  opacity: 100,
  locked: false,
  hidden: false,
  content,
  color: "#ffffff",
  fontSize: 64,
  fontFamily: "Inter",
  fontWeight: "Bold",
  lineHeight: 1.15,
  letterSpacing: 0,
  textAlign: "center",
  alignVertical: "middle",
  textSizing: "Box",
  textWrap: "Multi-line",
  dropShadow: false,
  stroke: false,
  warp: false,
  textOnCircle: false,
  backgroundShape: false,
  ...overrides,
});

const shapeEl = (
  id: string,
  layerName: string,
  color: string,
  x: number,
  y: number,
  width: number,
  height: number,
  shapeType: "square" | "circle" | "triangle" | "star" | "line" = "square",
  overrides: Partial<SlideCanvasElementTemplate> = {},
): SlideCanvasElementTemplate => ({
  id,
  type: "rect",
  layerName,
  x,
  y,
  width,
  height,
  rotation: 0,
  opacity: 100,
  locked: false,
  hidden: false,
  color,
  shapeType,
  backgroundShape: shapeType === "circle",
  ...overrides,
});

export const BUILT_IN_SLIDE_CANVAS_TEMPLATES: SlideCanvasTemplate[] = [
  {
    id: "worship-hero-light",
    name: "Worship Hero Light",
    description: "Clean title centered with a soft lower accent.",
    category: "Worship",
    source: "built-in",
    canvasBackground: { type: "color", value: "#0f1220" },
    preview: { gradient: "linear-gradient(135deg, #272f53 0%, #121628 100%)", accent: "#9b8cff" },
    elements: [
      shapeEl("bg-bar", "Accent Bar", "#9b8cff", 120, 410, 720, 12, "square", { opacity: 85 }),
      textEl("title", "Title", "Amazing Grace", 110, 180, 740, 140, {
        fontSize: 92,
        fontFamily: "Cormorant Garamond",
      }),
      textEl("subtitle", "Subtitle", "How sweet the sound", 210, 330, 540, 60, {
        fontSize: 34,
        fontWeight: "Medium",
        color: "#d5d9f3",
      }),
    ],
  },
  {
    id: "minimal-lower-third",
    name: "Minimal Lower Third",
    description: "Bottom-aligned title and scripture reference.",
    category: "Scripture",
    source: "built-in",
    canvasBackground: { type: "color", value: "#111111" },
    preview: { gradient: "linear-gradient(140deg, #1a1a1a 0%, #0c0c0c 100%)", accent: "#f59e0b" },
    elements: [
      shapeEl("band", "Bottom Band", "#111827", 0, 410, 960, 130, "square", { opacity: 92 }),
      shapeEl("accent", "Accent Line", "#f59e0b", 70, 430, 8, 84, "square"),
      textEl("title", "Verse", "Psalm 23:1", 95, 430, 360, 50, {
        fontSize: 42,
        textAlign: "left",
      }),
      textEl("body", "Scripture", "The Lord is my shepherd; I shall not want.", 95, 472, 820, 52, {
        fontSize: 27,
        fontWeight: "Normal",
        textAlign: "left",
      }),
    ],
  },
  {
    id: "announcement-card",
    name: "Announcement Card",
    description: "Event card style for notices and reminders.",
    category: "Announcement",
    source: "built-in",
    canvasBackground: { type: "color", value: "#1b102c" },
    preview: { gradient: "linear-gradient(150deg, #29114a 0%, #12081e 100%)", accent: "#a855f7" },
    elements: [
      shapeEl("card", "Card", "#26153f", 180, 95, 600, 350, "square", { opacity: 95 }),
      shapeEl("stripe", "Top Stripe", "#a855f7", 180, 95, 600, 14, "square"),
      textEl("heading", "Heading", "Youth Night", 220, 145, 520, 80, {
        fontSize: 62,
      }),
      textEl("details", "Details", "Friday 7:30 PM  |  Main Hall", 220, 238, 520, 56, {
        fontSize: 30,
        fontWeight: "Medium",
        color: "#e5dbff",
      }),
      textEl("cta", "CTA", "Everyone is welcome!", 220, 305, 520, 80, {
        fontSize: 34,
        fontFamily: "Outfit",
        color: "#c4b5fd",
      }),
    ],
  },
  {
    id: "lyrics-dual-line",
    name: "Lyrics Dual Line",
    description: "Two stacked lyric lines with strong readability.",
    category: "Lyrics",
    source: "built-in",
    canvasBackground: { type: "color", value: "#0a1d2b" },
    preview: { gradient: "linear-gradient(135deg, #12354c 0%, #0a1d2b 100%)", accent: "#38bdf8" },
    elements: [
      shapeEl("overlay", "Overlay", "#000000", 110, 150, 740, 240, "square", { opacity: 48 }),
      textEl("line1", "Line 1", "You are worthy of it all", 130, 185, 700, 90, {
        fontSize: 58,
        fontWeight: "Bold",
      }),
      textEl("line2", "Line 2", "For from You are all things", 130, 278, 700, 90, {
        fontSize: 52,
        fontWeight: "Medium",
        color: "#d6f3ff",
      }),
    ],
  },
  {
    id: "split-message",
    name: "Split Message",
    description: "Left title panel with right-side content.",
    category: "Sermon",
    source: "built-in",
    canvasBackground: { type: "color", value: "#121827" },
    preview: { gradient: "linear-gradient(135deg, #1f2937 0%, #0f172a 100%)", accent: "#22d3ee" },
    elements: [
      shapeEl("left-panel", "Left Panel", "#0b1020", 0, 0, 320, 540, "square"),
      shapeEl("left-accent", "Accent", "#22d3ee", 304, 0, 16, 540, "square"),
      textEl("section", "Section", "Sermon Series", 38, 135, 244, 60, {
        fontSize: 30,
        color: "#99f6e4",
      }),
      textEl("title", "Title", "Living in Faith", 38, 210, 244, 150, {
        fontSize: 56,
        fontFamily: "Cormorant Garamond",
      }),
      textEl("body", "Body", "Walk by faith, not by sight.", 370, 208, 540, 130, {
        fontSize: 50,
      }),
    ],
  },
  {
    id: "countdown-focus",
    name: "Countdown Focus",
    description: "Service start countdown and welcome text.",
    category: "Service",
    source: "built-in",
    canvasBackground: { type: "color", value: "#121212" },
    preview: { gradient: "linear-gradient(145deg, #2f2f2f 0%, #0f0f0f 100%)", accent: "#ef4444" },
    elements: [
      shapeEl("circle", "Timer Circle", "#ef4444", 365, 130, 230, 230, "circle", {
        opacity: 78,
      }),
      textEl("time", "Timer", "05:00", 382, 190, 196, 90, {
        fontSize: 78,
        fontFamily: "Outfit",
      }),
      textEl("caption", "Caption", "Service Begins Soon", 220, 380, 520, 70, {
        fontSize: 42,
        fontWeight: "Medium",
      }),
    ],
  },
  {
    id: "welcome-bold",
    name: "Welcome Bold",
    description: "High contrast welcome frame for opening moments.",
    category: "Service",
    source: "built-in",
    canvasBackground: { type: "color", value: "#140b2d" },
    preview: { gradient: "linear-gradient(145deg, #2a0f56 0%, #12072a 100%)", accent: "#f97316" },
    elements: [
      shapeEl("top", "Top Bar", "#f97316", 90, 84, 780, 10, "square"),
      shapeEl("bottom", "Bottom Bar", "#f97316", 90, 446, 780, 10, "square"),
      textEl("welcome", "Welcome", "WELCOME", 170, 150, 620, 130, {
        fontSize: 108,
        fontFamily: "Outfit",
      }),
      textEl("sub", "Subtext", "We are glad you are here", 180, 310, 600, 90, {
        fontSize: 38,
        fontWeight: "Medium",
      }),
    ],
  },
  {
    id: "quote-framed",
    name: "Quote Framed",
    description: "Framed quote layout with subtle decorative shapes.",
    category: "Scripture",
    source: "built-in",
    canvasBackground: { type: "color", value: "#0d1b14" },
    preview: { gradient: "linear-gradient(160deg, #1a3a2d 0%, #0b1712 100%)", accent: "#4ade80" },
    elements: [
      shapeEl("frame-top", "Frame Top", "#4ade80", 150, 110, 660, 6, "square"),
      shapeEl("frame-bottom", "Frame Bottom", "#4ade80", 150, 425, 660, 6, "square"),
      shapeEl("dot-left", "Decorative Dot", "#4ade80", 130, 252, 18, 18, "circle"),
      shapeEl("dot-right", "Decorative Dot", "#4ade80", 812, 252, 18, 18, "circle"),
      textEl("quote", "Quote", "\"Be still, and know that I am God.\"", 190, 182, 580, 120, {
        fontSize: 52,
        fontFamily: "Cormorant Garamond",
      }),
      textEl("ref", "Reference", "Psalm 46:10", 310, 324, 340, 60, {
        fontSize: 30,
        fontWeight: "Medium",
        color: "#bbf7d0",
      }),
    ],
  },
  {
    id: "prayer-focus",
    name: "Prayer Focus",
    description: "Prayer points with left rail and highlighted focus.",
    category: "Prayer",
    source: "built-in",
    canvasBackground: { type: "color", value: "#17132f" },
    preview: { gradient: "linear-gradient(145deg, #262150 0%, #120f25 100%)", accent: "#f472b6" },
    elements: [
      shapeEl("rail", "Rail", "#f472b6", 115, 110, 10, 320, "square"),
      textEl("title", "Title", "Prayer Focus", 145, 118, 620, 70, {
        fontSize: 44,
        textAlign: "left",
      }),
      textEl("point1", "Point 1", "• Healing for families", 145, 210, 640, 58, {
        fontSize: 34,
        textAlign: "left",
        fontWeight: "Medium",
      }),
      textEl("point2", "Point 2", "• Strength for leaders", 145, 272, 640, 58, {
        fontSize: 34,
        textAlign: "left",
        fontWeight: "Medium",
      }),
      textEl("point3", "Point 3", "• Revival in our city", 145, 334, 640, 58, {
        fontSize: 34,
        textAlign: "left",
        fontWeight: "Medium",
      }),
    ],
  },
  {
    id: "minimal-scripture-center",
    name: "Minimal Scripture Center",
    description: "Center-weight scripture block with clean spacing.",
    category: "Scripture",
    source: "built-in",
    canvasBackground: { type: "color", value: "#111827" },
    preview: { gradient: "linear-gradient(150deg, #1f2937 0%, #0f172a 100%)", accent: "#60a5fa" },
    elements: [
      shapeEl("card", "Center Card", "#1e293b", 150, 140, 660, 260, "square", { opacity: 88 }),
      textEl("verse", "Verse", "\"The joy of the Lord is your strength.\"", 190, 208, 580, 100, {
        fontSize: 46,
        fontFamily: "Cormorant Garamond",
      }),
      textEl("ref", "Reference", "Nehemiah 8:10", 270, 320, 420, 50, {
        fontSize: 30,
        fontWeight: "Medium",
        color: "#bfdbfe",
      }),
    ],
  },
  {
    id: "event-poster",
    name: "Event Poster",
    description: "Poster style slide for conferences and special events.",
    category: "Announcement",
    source: "built-in",
    canvasBackground: { type: "color", value: "#271003" },
    preview: { gradient: "linear-gradient(145deg, #4a1c03 0%, #220d02 100%)", accent: "#facc15" },
    elements: [
      shapeEl("glow", "Glow", "#facc15", 88, 70, 784, 400, "square", { opacity: 14 }),
      shapeEl("inner", "Inner Frame", "#3a1a0a", 130, 110, 700, 320, "square", { opacity: 95 }),
      textEl("title", "Title", "NIGHT OF WORSHIP", 155, 160, 650, 120, {
        fontSize: 70,
        fontFamily: "Outfit",
      }),
      textEl("meta", "Meta", "SATURDAY 6:00 PM", 250, 292, 460, 58, {
        fontSize: 34,
        fontWeight: "Medium",
        color: "#fde68a",
      }),
      textEl("venue", "Venue", "Main Sanctuary", 290, 350, 380, 50, {
        fontSize: 30,
        color: "#fde68a",
      }),
    ],
  },
  {
    id: "mountain-dawn-worship",
    name: "Mountain Dawn Worship",
    description: "Sunrise mountain photo with centered worship title.",
    category: "Worship",
    source: "built-in",
    canvasBackground: {
      type: "image",
      value:
        "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1920&q=80",
    },
    preview: { gradient: "linear-gradient(145deg, #f59e0b 0%, #7c3aed 100%)", accent: "#fde68a" },
    elements: [
      shapeEl("overlay", "Dark Overlay", "#000000", 0, 0, 960, 540, "square", { opacity: 42 }),
      textEl("title", "Title", "COME, LET US WORSHIP", 120, 170, 720, 120, {
        fontSize: 72,
        fontFamily: "Outfit",
        letterSpacing: 2,
      }),
      textEl("sub", "Subtext", "Psalm 95:6", 350, 305, 260, 60, {
        fontSize: 30,
        fontWeight: "Medium",
        color: "#fde68a",
      }),
    ],
  },
  {
    id: "hands-raised-praise",
    name: "Hands Raised Praise",
    description: "Congregation worship photo with lyric lines.",
    category: "Lyrics",
    source: "built-in",
    canvasBackground: {
      type: "image",
      value:
        "https://images.unsplash.com/photo-1464375117522-1311d6a5b81f?auto=format&fit=crop&w=1920&q=80",
    },
    preview: { gradient: "linear-gradient(145deg, #111827 0%, #7c2d12 100%)", accent: "#fb923c" },
    elements: [
      shapeEl("lyric-overlay", "Lyric Overlay", "#000000", 100, 150, 760, 230, "square", { opacity: 54 }),
      textEl("line1", "Line 1", "I lift my hands to You", 130, 200, 700, 80, {
        fontSize: 56,
        fontWeight: "Bold",
      }),
      textEl("line2", "Line 2", "You are my refuge and strength", 130, 286, 700, 80, {
        fontSize: 48,
        fontWeight: "Medium",
        color: "#ffedd5",
      }),
    ],
  },
  {
    id: "cross-light-scripture",
    name: "Cross Light Scripture",
    description: "Cross silhouette style background with scripture focus.",
    category: "Scripture",
    source: "built-in",
    canvasBackground: {
      type: "image",
      value:
        "https://images.unsplash.com/photo-1519491050282-cf00c82424b4?auto=format&fit=crop&w=1920&q=80",
    },
    preview: { gradient: "linear-gradient(145deg, #1e293b 0%, #0f172a 100%)", accent: "#93c5fd" },
    elements: [
      shapeEl("panel", "Scripture Panel", "#020617", 120, 120, 720, 300, "square", { opacity: 62 }),
      textEl("verse", "Verse", "\"The steadfast love of the Lord never ceases.\"", 160, 180, 640, 120, {
        fontSize: 44,
        fontFamily: "Cormorant Garamond",
      }),
      textEl("ref", "Reference", "Lamentations 3:22", 300, 320, 360, 50, {
        fontSize: 28,
        fontWeight: "Medium",
        color: "#bfdbfe",
      }),
    ],
  },
  {
    id: "choir-stage-night",
    name: "Choir Stage Night",
    description: "Night worship stage with large welcome wording.",
    category: "Service",
    source: "built-in",
    canvasBackground: {
      type: "image",
      value:
        "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1920&q=80",
    },
    preview: { gradient: "linear-gradient(145deg, #0f172a 0%, #4c1d95 100%)", accent: "#c4b5fd" },
    elements: [
      shapeEl("top-shadow", "Top Shadow", "#000000", 0, 0, 960, 190, "square", { opacity: 48 }),
      textEl("main", "Main", "WELCOME TO WORSHIP", 90, 84, 780, 110, {
        fontSize: 74,
        fontFamily: "Outfit",
      }),
      textEl("sub", "Sub", "Prepare your heart for His presence", 190, 200, 580, 70, {
        fontSize: 32,
        color: "#ddd6fe",
      }),
    ],
  },
  {
    id: "prayer-candle-room",
    name: "Prayer Candle Room",
    description: "Warm prayer background with guided prayer prompts.",
    category: "Prayer",
    source: "built-in",
    canvasBackground: {
      type: "image",
      value:
        "https://images.unsplash.com/photo-1474623809196-26c1d33457cc?auto=format&fit=crop&w=1920&q=80",
    },
    preview: { gradient: "linear-gradient(145deg, #451a03 0%, #111827 100%)", accent: "#fdba74" },
    elements: [
      shapeEl("prompt-box", "Prompt Box", "#111827", 110, 130, 740, 300, "square", { opacity: 58 }),
      textEl("title", "Title", "PRAYER MOMENT", 140, 162, 680, 70, {
        fontSize: 46,
        letterSpacing: 1,
      }),
      textEl("p1", "Prompt 1", "• Thank God for His goodness", 150, 245, 660, 54, {
        fontSize: 32,
        textAlign: "left",
        fontWeight: "Medium",
      }),
      textEl("p2", "Prompt 2", "• Intercede for our city", 150, 302, 660, 54, {
        fontSize: 32,
        textAlign: "left",
        fontWeight: "Medium",
      }),
      textEl("p3", "Prompt 3", "• Ask for fresh revival", 150, 359, 660, 54, {
        fontSize: 32,
        textAlign: "left",
        fontWeight: "Medium",
      }),
    ],
  },
  {
    id: "sunset-sea-chorus",
    name: "Sunset Sea Chorus",
    description: "Ocean sunset worship background for choruses.",
    category: "Lyrics",
    source: "built-in",
    canvasBackground: {
      type: "image",
      value:
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80",
    },
    preview: { gradient: "linear-gradient(145deg, #1d4ed8 0%, #f97316 100%)", accent: "#fed7aa" },
    elements: [
      shapeEl("band", "Bottom Band", "#0f172a", 70, 318, 820, 150, "square", { opacity: 57 }),
      textEl("lyric", "Lyric", "Great are You Lord", 120, 345, 720, 90, {
        fontSize: 68,
        fontFamily: "Cormorant Garamond",
      }),
      textEl("echo", "Echo", "All the earth will shout Your praise", 130, 422, 700, 52, {
        fontSize: 30,
        color: "#ffedd5",
        fontWeight: "Medium",
      }),
    ],
  },
  {
    id: "city-lights-worship-night",
    name: "City Lights Worship Night",
    description: "Urban worship-night template with event details.",
    category: "Announcement",
    source: "built-in",
    canvasBackground: {
      type: "image",
      value:
        "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1920&q=80",
    },
    preview: { gradient: "linear-gradient(145deg, #0f172a 0%, #db2777 100%)", accent: "#f9a8d4" },
    elements: [
      shapeEl("event-card", "Event Card", "#111827", 150, 105, 660, 330, "square", { opacity: 70 }),
      shapeEl("event-accent", "Event Accent", "#db2777", 150, 105, 660, 10, "square"),
      textEl("event-title", "Event Title", "WORSHIP NIGHT", 185, 155, 590, 105, {
        fontSize: 66,
        fontFamily: "Outfit",
      }),
      textEl("event-time", "Event Time", "Friday 8:00 PM", 280, 280, 400, 60, {
        fontSize: 36,
        color: "#fbcfe8",
      }),
      textEl("event-place", "Event Place", "Downtown Campus", 280, 344, 400, 52, {
        fontSize: 30,
        color: "#fbcfe8",
      }),
    ],
  },
  {
    id: "acoustic-worship-session",
    name: "Acoustic Worship Session",
    description: "Acoustic guitar background with intimate lyric style.",
    category: "Worship",
    source: "built-in",
    canvasBackground: {
      type: "image",
      value:
        "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1920&q=80",
    },
    preview: { gradient: "linear-gradient(145deg, #1f2937 0%, #92400e 100%)", accent: "#fcd34d" },
    elements: [
      shapeEl("focus", "Focus Panel", "#030712", 180, 145, 600, 250, "square", { opacity: 56 }),
      textEl("line1", "Line 1", "Jesus, You're all I need", 220, 205, 520, 90, {
        fontSize: 56,
        fontFamily: "Cormorant Garamond",
      }),
      textEl("line2", "Line 2", "My soul will rest in You", 240, 295, 480, 70, {
        fontSize: 36,
        color: "#fde68a",
        fontWeight: "Medium",
      }),
    ],
  },
  {
    id: "open-bible-reflection",
    name: "Open Bible Reflection",
    description: "Bible photo with reflective scripture framing.",
    category: "Scripture",
    source: "built-in",
    canvasBackground: {
      type: "image",
      value:
        "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=1920&q=80",
    },
    preview: { gradient: "linear-gradient(145deg, #78350f 0%, #111827 100%)", accent: "#fbbf24" },
    elements: [
      shapeEl("read-panel", "Read Panel", "#111827", 95, 120, 770, 300, "square", { opacity: 60 }),
      textEl("scripture", "Scripture", "\"Your word is a lamp to my feet and a light to my path.\"", 130, 188, 700, 120, {
        fontSize: 44,
        fontFamily: "Cormorant Garamond",
      }),
      textEl("reference", "Reference", "Psalm 119:105", 320, 326, 320, 52, {
        fontSize: 30,
        color: "#fde68a",
        fontWeight: "Medium",
      }),
    ],
  },
  {
    id: "revival-prayer-fire",
    name: "Revival Prayer Fire",
    description: "Passionate prayer/revival slide with strong contrast.",
    category: "Prayer",
    source: "built-in",
    canvasBackground: {
      type: "image",
      value:
        "https://images.unsplash.com/photo-1521334884684-d80222895322?auto=format&fit=crop&w=1920&q=80",
    },
    preview: { gradient: "linear-gradient(145deg, #450a0a 0%, #7f1d1d 100%)", accent: "#fb7185" },
    elements: [
      shapeEl("smoke", "Smoke Layer", "#000000", 0, 0, 960, 540, "square", { opacity: 40 }),
      shapeEl("center-card", "Center Card", "#1f2937", 190, 125, 580, 290, "square", { opacity: 62 }),
      textEl("call", "Call", "REVIVAL PRAYER", 220, 170, 520, 90, {
        fontSize: 60,
        fontFamily: "Outfit",
        letterSpacing: 1,
      }),
      textEl("line", "Line", "Lord, awaken hearts again", 240, 270, 480, 70, {
        fontSize: 36,
        color: "#fecdd3",
        fontWeight: "Medium",
      }),
      textEl("time", "Time", "Tuesday 6:30 PM", 300, 340, 360, 46, {
        fontSize: 28,
        color: "#fecdd3",
      }),
    ],
  },
  {
    id: "morning-devotion-field",
    name: "Morning Devotion Field",
    description: "Soft nature photo for devotion and quiet worship.",
    category: "Worship",
    source: "built-in",
    canvasBackground: {
      type: "image",
      value:
        "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1920&q=80",
    },
    preview: { gradient: "linear-gradient(145deg, #065f46 0%, #84cc16 100%)", accent: "#bbf7d0" },
    elements: [
      shapeEl("devotion-overlay", "Devotion Overlay", "#064e3b", 120, 140, 720, 260, "square", {
        opacity: 52,
      }),
      textEl("heading", "Heading", "MORNING DEVOTION", 170, 180, 620, 90, {
        fontSize: 58,
        fontFamily: "Outfit",
      }),
      textEl("content", "Content", "\"This is the day the Lord has made; we will rejoice.\"", 165, 266, 630, 90, {
        fontSize: 34,
        fontFamily: "Cormorant Garamond",
      }),
      textEl("tag", "Tag", "Psalm 118:24", 360, 350, 240, 44, {
        fontSize: 26,
        color: "#dcfce7",
      }),
    ],
  },
];

const normalizeTemplate = (
  value: Partial<SlideCanvasTemplate>,
): SlideCanvasTemplate | null => {
  if (!value || !value.name || !Array.isArray(value.elements)) {
    return null;
  }

  const id = (value.id || `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`).toString();
  return {
    id,
    name: value.name.trim(),
    description: (value.description || "Custom slide canvas template").trim(),
    category: (value.category || "Custom").trim(),
    canvasBackground: value.canvasBackground || { type: "transparent", value: "" },
    elements: value.elements as SlideCanvasElementTemplate[],
    source: "custom",
    createdAt: value.createdAt || new Date().toISOString(),
    preview: value.preview || {
      gradient: "linear-gradient(145deg, #3f3f46 0%, #18181b 100%)",
      accent: "#a1a1aa",
    },
  };
};

export const getCustomSlideCanvasTemplates = (): SlideCanvasTemplate[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_TEMPLATE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry: Partial<SlideCanvasTemplate>) => normalizeTemplate(entry))
      .filter((entry): entry is SlideCanvasTemplate => !!entry);
  } catch {
    return [];
  }
};

export const getAllSlideCanvasTemplates = (): SlideCanvasTemplate[] => [
  ...BUILT_IN_SLIDE_CANVAS_TEMPLATES,
  ...getCustomSlideCanvasTemplates(),
];

export const saveCurrentCanvasTemplateToAssets = (payload: {
  name: string;
  description?: string;
  category?: string;
  elements: SlideCanvasElementTemplate[];
  canvasBackground: SlideCanvasBackgroundTemplate;
}): SlideCanvasTemplate => {
  const customTemplate: SlideCanvasTemplate = {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: payload.name.trim() || "Custom Template",
    description: (payload.description || "Saved from Slide Canvas").trim(),
    category: payload.category || "Custom",
    canvasBackground: payload.canvasBackground,
    elements: payload.elements,
    source: "custom",
    createdAt: new Date().toISOString(),
    preview: {
      gradient:
        payload.canvasBackground.type === "color" && payload.canvasBackground.value
          ? `linear-gradient(145deg, ${payload.canvasBackground.value} 0%, #0f172a 100%)`
          : "linear-gradient(145deg, #3f3f46 0%, #18181b 100%)",
      accent: "#a1a1aa",
    },
  };

  const existing = getCustomSlideCanvasTemplates();
  const next = [customTemplate, ...existing];
  if (typeof window !== "undefined") {
    window.localStorage.setItem(CUSTOM_TEMPLATE_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("qworship-slide-template-updated"));
  }
  return customTemplate;
};

export const cloneTemplateForCanvas = (template: SlideCanvasTemplate): {
  elements: SlideCanvasElementTemplate[];
  canvasBackground: SlideCanvasBackgroundTemplate;
} => ({
  canvasBackground: { ...template.canvasBackground },
  elements: template.elements.map((element, index) => ({
    ...element,
    id: `el-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
  })),
});
