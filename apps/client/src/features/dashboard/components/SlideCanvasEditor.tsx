import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  LayoutTemplate,
  Type,
  Square,
  Image as ImageIcon,
  Monitor,
  Layers,
  QrCode,
  MousePointer2,
  Trash2,
  Copy,
  Download,
  Play,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronUp,
  ChevronDown,
  X,
  Plus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Search,
  Type as FontIcon,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyEnd
} from "lucide-react";

export interface CanvasElement {
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
  // Text
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
  // Effects
  dropShadow?: boolean;
  stroke?: boolean;
  warp?: boolean;
  textOnCircle?: boolean;
  backgroundShape?: boolean;
}

export interface CanvasBackground {
  type: "color" | "image" | "transparent";
  value: string;
}

interface SlideCanvasEditorProps {
  editingContent: any;
  updateItemContent: (id: string, title?: string, content?: any, slides?: any[]) => void;
  setEditingContent: (content: any) => void;
  onClose?: () => void;
}

export const SlideCanvasEditor: React.FC<SlideCanvasEditorProps> = ({
  editingContent,
  updateItemContent,
  setEditingContent,
  onClose
}) => {
  const [activeTool, setActiveTool] = useState<string>("Text");
  const [elements, setElements] = useState<CanvasElement[]>(editingContent?.content?.elements || []);
  const [canvasBackground, setCanvasBackground] = useState<CanvasBackground>(
    editingContent?.content?.canvasBackground || { type: "transparent", value: "" }
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLDivElement>(null);

  const syncState = (newElements: CanvasElement[], newBg: CanvasBackground) => {
    const newContent = { ...editingContent.content, elements: newElements, canvasBackground: newBg };
    updateItemContent(editingContent.id, editingContent.title, newContent, editingContent.slides);
  };

  const updateElement = (id: string, partial: Partial<CanvasElement>, sync = true) => {
    const newElements = elements.map(el => el.id === id ? { ...el, ...partial } : el);
    setElements(newElements);
    if (sync) syncState(newElements, canvasBackground);
  };

  const moveLayer = (id: string, dir: "up" | "down") => {
    const idx = elements.findIndex(e => e.id === id);
    if (idx < 0) return;
    const newEls = [...elements];
    if (dir === "up" && idx > 0) {
      const temp = newEls[idx];
      newEls[idx] = newEls[idx - 1];
      newEls[idx - 1] = temp;
    } else if (dir === "down" && idx < elements.length - 1) {
      const temp = newEls[idx];
      newEls[idx] = newEls[idx + 1];
      newEls[idx + 1] = temp;
    }
    setElements(newEls);
    syncState(newEls, canvasBackground);
  };

  const addText = (preset: "headline" | "subhead" | "body") => {
    const isHeadline = preset === "headline";
    const isSubhead = preset === "subhead";
    const newEl: CanvasElement = {
      id: `el-${Date.now()}`,
      type: "text",
      layerName: isHeadline ? "Headline" : isSubhead ? "Subhead" : "Body Text",
      x: 100, y: 100, width: isHeadline ? 400 : 300, height: isHeadline ? 100 : 60,
      rotation: 0, opacity: 100, locked: false, hidden: false,
      content: isHeadline ? "Headline Text" : isSubhead ? "Subheading" : "Body text",
      color: "#ffffff", fontSize: isHeadline ? 72 : isSubhead ? 48 : 24,
      fontFamily: "Inter", fontWeight: isHeadline ? "Bold" : "Normal",
      lineHeight: 1.2, letterSpacing: 0, textAlign: "center", alignVertical: "middle",
      textSizing: "Box", textWrap: "Multi-line", dropShadow: false, stroke: false,
    };
    const newElements = [...elements, newEl];
    setElements(newElements);
    setSelectedId(newEl.id);
    setActiveTool(""); // Automatically show properties panel
    syncState(newElements, canvasBackground);
  };

  const tools = [
    { id: "Template", icon: LayoutTemplate, label: "Template" },
    { id: "Text", icon: Type, label: "Text" },
    { id: "Elements", icon: Square, label: "Elements" },
    { id: "Images", icon: ImageIcon, label: "Images" },
    { id: "Bkground", icon: Monitor, label: "Bkground" },
    { id: "Layers", icon: Layers, label: "Layers" },
    { id: "QR Codes", icon: QrCode, label: "QR Codes" },
  ];

  const handleDragStart = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedId(id);
    const element = elements.find(el => el.id === id);
    if (!element || element.locked) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = element.x;
    const initialY = element.y;

    const handleMouseMove = (mvEvent: MouseEvent) => {
      const dx = mvEvent.clientX - startX;
      const dy = mvEvent.clientY - startY;
      updateElement(id, { x: initialX + dx, y: initialY + dy }, false);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      // Sync state after drag completes
      setElements(curr => {
         syncState(curr, canvasBackground);
         return curr;
      });
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const selectedEl = elements.find(e => e.id === selectedId);

  return (
    <div className="flex h-full bg-[#1e1e2e] rounded-xl overflow-hidden shadow-2xl relative border border-gray-700 w-full min-h-[600px]">
      
      {/* Primary Toolbar */}
      <div className="w-20 bg-[#282936] border-r border-[#3a3b4c] flex flex-col items-center py-4 z-30 shrink-0 h-full justify-between">
        <div className="flex flex-col space-y-2 w-full px-2">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => {
                setActiveTool(tool.id);
                setSelectedId(null);
              }}
              className={`flex flex-col items-center justify-center w-full py-3 rounded-lg transition-all duration-200 ${
                activeTool === tool.id || (tool.id === "Text" && selectedEl?.type === "text")
                  ? "bg-[#3a3b4c] text-white"
                  : "text-gray-400 hover:bg-[#323344] hover:text-white"
              }`}
            >
              <tool.icon className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-medium tracking-wide">{tool.label}</span>
            </button>
          ))}
        </div>
        
        <div className="pb-4 w-full px-2">
           <button className="flex flex-col items-center justify-center w-full py-3 rounded-lg text-gray-400 hover:bg-[#323344] hover:text-white transition-all">
             <Plus className="w-5 h-5 mb-1" />
             <span className="text-[10px] font-medium tracking-wide">New Slide</span>
           </button>
        </div>
      </div>

      {/* Secondary Context Panel */}
      {(selectedEl || activeTool) && (
        <div className="w-72 bg-[#313243] border-r border-[#3a3b4c] flex flex-col shrink-0 z-20 overflow-y-auto custom-scrollbar h-full text-white">
          
          {/* PROPERTIES PANEL FOR TEXT ELEMENT */}
          {(selectedEl?.type === "text" || (!selectedId && activeTool === "Text Properties")) ? (
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-4 border-b border-gray-700 tracking-wide font-semibold text-lg">
                Text Properties
                <button onClick={() => setSelectedId(null)} className="text-gray-400 hover:text-white"><X size={18}/></button>
              </div>
              <div className="p-4 space-y-5">
                
                {/* Content */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase text-gray-300 flex items-center gap-1.5"><ChevronDown size={14}/> Content</div>
                  <textarea 
                    className="w-full bg-[#1e1e2c] border border-gray-600 rounded-lg p-3 text-sm focus:border-purple-500 outline-none resize-none h-20"
                    value={selectedEl?.content || ""}
                    onChange={(e) => selectedEl && updateElement(selectedEl.id, {content: e.target.value})}
                  />
                </div>

                {/* Text Formatting */}
                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase text-gray-300 flex items-center gap-1.5"><ChevronDown size={14}/> Text</div>
                  
                  <select 
                    className="w-full bg-[#1e1e2c] border border-gray-600 rounded-lg p-2.5 text-sm outline-none"
                    value={selectedEl?.fontFamily || "Inter"}
                    onChange={(e) => selectedEl && updateElement(selectedEl.id, {fontFamily: e.target.value})}
                  >
                    <option value="Cormorant Garamond">Cormorant Garamond</option>
                    <option value="Inter">Inter</option>
                    <option value="Roboto">Roboto</option>
                    <option value="Outfit">Outfit</option>
                  </select>

                  <div className="flex gap-2">
                    <select 
                      className="flex-1 bg-[#1e1e2c] border border-gray-600 rounded-lg p-2 text-sm outline-none"
                      value={selectedEl?.fontWeight || "Normal"}
                      onChange={(e) => selectedEl && updateElement(selectedEl.id, {fontWeight: e.target.value})}
                    >
                      <option value="Normal">Normal</option>
                      <option value="Medium">Medium</option>
                      <option value="Bold">Bold</option>
                      <option value="Black">Black</option>
                    </select>
                    
                    <select 
                      className="w-24 bg-[#1e1e2c] border border-gray-600 rounded-lg p-2 text-sm outline-none"
                      value={selectedEl?.fontSize || 24}
                      onChange={(e) => selectedEl && updateElement(selectedEl.id, {fontSize: Number(e.target.value)})}
                    >
                      <option value={24}>24</option>
                      <option value={48}>48</option>
                      <option value={72}>72</option>
                      <option value={120}>120</option>
                      <option value={173}>173</option>
                    </select>
                  </div>

                  <div className="flex gap-2 items-center text-gray-400">
                    <div className="flex-1 bg-[#1e1e2c] border border-gray-600 rounded-lg p-2 flex items-center gap-2">
                      <span className="text-xs">|A|</span>
                      <input type="number" className="w-full bg-transparent outline-none text-white text-sm" value={selectedEl?.letterSpacing || 0} onChange={(e) => selectedEl && updateElement(selectedEl.id, {letterSpacing: Number(e.target.value)})} />
                    </div>
                    <div className="flex-1 bg-[#1e1e2c] border border-gray-600 rounded-lg p-2 flex items-center gap-2">
                      <span className="text-xs">A̲</span>
                      <input type="number" step="0.1" className="w-full bg-transparent outline-none text-white text-sm" value={selectedEl?.lineHeight || 1.2} onChange={(e) => selectedEl && updateElement(selectedEl.id, {lineHeight: Number(e.target.value)})} />
                    </div>
                    <button className="w-10 h-10 rounded text-center shrink-0 border border-gray-600 relative overflow-hidden">
                       <input type="color" className="absolute -inset-2 w-16 h-16 cursor-pointer" value={selectedEl?.color || "#ffffff"} onChange={(e) => selectedEl && updateElement(selectedEl.id, {color: e.target.value})} />
                    </button>
                  </div>
                </div>

                {/* Layout */}
                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase text-gray-300 flex items-center gap-1.5"><ChevronDown size={14}/> Layout</div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Text Sizing</span>
                    <div className="flex bg-[#1e1e2c] rounded-md p-1">
                       {["Dynamic", "Box", "Fixed"].map(tm => (
                         <button key={tm} onClick={() => selectedEl && updateElement(selectedEl.id, {textSizing: tm as any})} className={`px-2 py-1 rounded text-xs transition ${selectedEl?.textSizing === tm ? "bg-[#3a3b4c]" : "hover:bg-white/5"}`}>{tm}</button>
                       ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm mt-3">
                    <span className="text-gray-400">Alignment</span>
                    <div className="grid grid-cols-3 gap-1 bg-[#1e1e2c] rounded-md p-1">
                      <button onClick={() => selectedEl && updateElement(selectedEl.id, {textAlign: 'left'})} className={`p-1.5 rounded transition ${selectedEl?.textAlign === 'left' ? "bg-[#3a3b4c]" : "hover:bg-white/5"}`}><AlignLeft size={16}/></button>
                      <button onClick={() => selectedEl && updateElement(selectedEl.id, {textAlign: 'center'})} className={`p-1.5 rounded transition ${selectedEl?.textAlign === 'center' ? "bg-[#3a3b4c]" : "hover:bg-white/5"}`}><AlignCenter size={16}/></button>
                      <button onClick={() => selectedEl && updateElement(selectedEl.id, {textAlign: 'right'})} className={`p-1.5 rounded transition ${selectedEl?.textAlign === 'right' ? "bg-[#3a3b4c]" : "hover:bg-white/5"}`}><AlignRight size={16}/></button>
                      <button onClick={() => selectedEl && updateElement(selectedEl.id, {alignVertical: 'top'})} className={`p-1.5 rounded transition ${selectedEl?.alignVertical === 'top' ? "bg-[#3a3b4c]" : "hover:bg-white/5"}`}><AlignVerticalJustifyStart size={16}/></button>
                      <button onClick={() => selectedEl && updateElement(selectedEl.id, {alignVertical: 'middle'})} className={`p-1.5 rounded transition ${selectedEl?.alignVertical === 'middle' ? "bg-[#3a3b4c]" : "hover:bg-white/5"}`}><AlignVerticalJustifyCenter size={16}/></button>
                      <button onClick={() => selectedEl && updateElement(selectedEl.id, {alignVertical: 'bottom'})} className={`p-1.5 rounded transition ${selectedEl?.alignVertical === 'bottom' ? "bg-[#3a3b4c]" : "hover:bg-white/5"}`}><AlignVerticalJustifyEnd size={16}/></button>
                    </div>
                  </div>
                </div>

                {/* Position */}
                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase text-gray-300 flex items-center gap-1.5"><ChevronDown size={14}/> Position</div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex bg-[#1e1e2c] rounded-lg border border-gray-600 p-2 items-center">
                      <span className="text-gray-400 w-6">X</span>
                      <input type="number" className="w-full bg-transparent outline-none" value={selectedEl?.x || 0} onChange={(e) => selectedEl && updateElement(selectedEl.id, {x: Number(e.target.value)})} />
                    </div>
                    <div className="flex bg-[#1e1e2c] rounded-lg border border-gray-600 p-2 items-center">
                      <span className="text-gray-400 w-6">Y</span>
                      <input type="number" className="w-full bg-transparent outline-none" value={selectedEl?.y || 0} onChange={(e) => selectedEl && updateElement(selectedEl.id, {y: Number(e.target.value)})} />
                    </div>
                    <div className="flex bg-[#1e1e2c] rounded-lg border border-gray-600 p-2 items-center">
                      <span className="text-gray-400 w-6">W</span>
                      <input type="number" className="w-full bg-transparent outline-none" value={selectedEl?.width || 0} onChange={(e) => selectedEl && updateElement(selectedEl.id, {width: Number(e.target.value)})} />
                    </div>
                    <div className="flex bg-[#1e1e2c] rounded-lg border border-gray-600 p-2 items-center">
                      <span className="text-gray-400 w-6">H</span>
                      <input type="number" className="w-full bg-transparent outline-none" value={selectedEl?.height || 0} onChange={(e) => selectedEl && updateElement(selectedEl.id, {height: Number(e.target.value)})} />
                    </div>
                  </div>
                </div>

                {/* Settings & Effects */}
                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase text-gray-300 flex items-center gap-1.5"><ChevronDown size={14}/> Opacity</div>
                  <div className="flex items-center gap-4">
                    <Slider 
                      value={[selectedEl?.opacity || 100]} max={100} step={1} 
                      onValueChange={(v) => selectedEl && updateElement(selectedEl.id, {opacity: v[0]})}
                    />
                    <span className="bg-[#1e1e2c] border border-gray-600 px-3 py-1 rounded-lg text-sm">{selectedEl?.opacity || 100}</span>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-gray-700">
                  <div className="flex items-center justify-between text-sm"><span>Drop Shadow</span> <Switch checked={selectedEl?.dropShadow} onCheckedChange={(v) => selectedEl && updateElement(selectedEl.id, {dropShadow: v})} /></div>
                  <div className="flex items-center justify-between text-sm"><span>Stroke</span> <Switch checked={selectedEl?.stroke} onCheckedChange={(v) => selectedEl && updateElement(selectedEl.id, {stroke: v})} /></div>
                  <div className="flex items-center justify-between text-sm"><span>Warp</span> <Switch checked={selectedEl?.warp} onCheckedChange={(v) => selectedEl && updateElement(selectedEl.id, {warp: v})} /></div>
                  <div className="flex items-center justify-between text-sm"><span>Text on a Circle</span> <Switch checked={selectedEl?.textOnCircle} onCheckedChange={(v) => selectedEl && updateElement(selectedEl.id, {textOnCircle: v})} /></div>
                  <div className="flex items-center justify-between text-sm"><span>Background Shape</span> <Switch checked={selectedEl?.backgroundShape} onCheckedChange={(v) => selectedEl && updateElement(selectedEl.id, {backgroundShape: v})} /></div>
                </div>

              </div>
            </div>
          ) : activeTool === "Text" ? (
            /* ADD TEXT PANEL */
            <div className="flex flex-col h-full">
              <div className="p-5 border-b border-gray-700 tracking-wide font-semibold text-lg">Text</div>
              <div className="p-4 space-y-3">
                 <button onClick={() => addText("headline")} className="w-full bg-[#414258] hover:bg-[#4d4e68] p-4 text-2xl font-bold rounded-lg text-left transition-colors text-white">
                   Add a Headline
                 </button>
                 <button onClick={() => addText("subhead")} className="w-full bg-[#414258] hover:bg-[#4d4e68] p-3 text-lg font-semibold rounded-lg text-left transition-colors text-white">
                   Add a Subhead
                 </button>
                 <button onClick={() => addText("body")} className="w-full bg-[#414258] hover:bg-[#4d4e68] p-3 text-sm font-normal rounded-lg text-left transition-colors text-white">
                   Add body text
                 </button>
              </div>
            </div>
          ) : activeTool === "Layers" ? (
             /* LAYERS PANEL */
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-4 border-b border-gray-700 tracking-wide font-semibold text-lg">
                Layers
                <button onClick={() => setActiveTool("")} className="text-gray-400 hover:text-white"><X size={18}/></button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {elements.map((el) => (
                  <div 
                    key={el.id} 
                    onClick={() => setSelectedId(el.id)}
                    className={`flex items-center justify-between p-3 border-b border-gray-700/50 cursor-pointer transition-colors ${selectedId === el.id ? 'bg-[#414258]' : 'hover:bg-[#3a3b4c]'}`}
                  >
                     <div className="flex items-center gap-3">
                       <FontIcon size={16} className="text-gray-400" />
                       <span className="text-sm font-medium truncate w-24">{el.layerName || el.content?.substring(0, 15) || 'Element'}</span>
                     </div>
                     <div className="flex items-center gap-2 text-gray-400">
                       <button onClick={(e) => { e.stopPropagation(); updateElement(el.id, {hidden: !el.hidden})}} className="hover:text-white">
                         {el.hidden ? <EyeOff size={14}/> : <Eye size={14}/>}
                       </button>
                       <button onClick={(e) => { e.stopPropagation(); updateElement(el.id, {locked: !el.locked})}} className="hover:text-white">
                         {el.locked ? <Lock size={14}/> : <Unlock size={14}/>}
                       </button>
                       <div className="flex flex-col ml-1">
                          <button onClick={(e) => { e.stopPropagation(); moveLayer(el.id, "up")}} className="hover:text-white"><ChevronUp size={14}/></button>
                          <button onClick={(e) => { e.stopPropagation(); moveLayer(el.id, "down")}} className="hover:text-white"><ChevronDown size={14}/></button>
                       </div>
                     </div>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTool === "Bkground" ? (
            /* BACKGROUND PANEL */
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-gray-700 tracking-wide font-semibold text-lg">Background</div>
              <div className="p-4 space-y-6">
                 <div>
                   <h3 className="text-sm font-semibold mb-3">Fill Color</h3>
                   <div className="w-12 h-12 rounded border border-gray-500 overflow-hidden relative cursor-pointer checkboard-pattern">
                     <div className="absolute inset-0 pattern-checks bg-gray-600/30"></div>
                     <input type="color" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                       onChange={(e) => {
                         const color = e.target.value;
                         setCanvasBackground({type: 'color', value: color});
                         syncState(elements, {type: 'color', value: color});
                       }}
                     />
                   </div>
                 </div>

                 <div>
                   <div className="flex items-center justify-between mb-3">
                     <h3 className="text-sm font-semibold">Choose image</h3>
                     <span className="text-xs text-blue-400 cursor-pointer hover:text-blue-300">None</span>
                   </div>
                   <div className="relative mb-4">
                     <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                     <input type="text" placeholder="" className="w-full bg-[#1e1e2c] border border-gray-600 rounded-lg p-2 pl-9 text-sm outline-none" />
                   </div>
                   
                   <div className="grid grid-cols-2 gap-2">
                     {[
                       "https://images.unsplash.com/photo-1542281286-9e0a16bb7366",
                       "https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9",
                       "https://images.unsplash.com/photo-1516222338250-863216ce01ea",
                       "https://images.unsplash.com/photo-1496096265110-f83ad7f96608"
                     ].map((img, i) => (
                       <div key={i} onClick={() => {
                          setCanvasBackground({type: 'image', value: img});
                          syncState(elements, {type: 'image', value: img});
                       }} className="aspect-video rounded hover:border-2 hover:border-purple-500 overflow-hidden cursor-pointer">
                         <img src={img + "?q=80&w=200&fit=crop"} className="w-full h-full object-cover" />
                       </div>
                     ))}
                   </div>
                 </div>
              </div>
            </div>
          ) : (
            <div className="p-4">{activeTool} Options Coming Soon</div>
          )}
        </div>
      )}

      {/* Main Canvas Area */}
      <div className="flex-1 bg-[#101017] relative flex flex-col overflow-hidden"
        onClick={() => setSelectedId(null)}
      >
        <div className="h-14 bg-[#1a1a24] border-b border-[#2a2a3c] flex items-center justify-between px-6 z-10">
           <Input 
             value={editingContent.title || "Untitled Presentation"}
             onChange={(e) => {
                const newTitle = e.target.value;
                setEditingContent({...editingContent, title: newTitle});
                updateItemContent(editingContent.id, newTitle, editingContent.content, editingContent.slides);
             }}
             className="bg-transparent border-transparent hover:border-gray-600 text-white font-medium text-lg focus:border-[#8356F3] w-64 h-8"
           />
           <div className="flex items-center gap-3">
              {selectedId && (
                <Button onClick={() => {setElements(elements.filter(e=>e.id!==selectedId)); setSelectedId(null); syncState(elements.filter(e=>e.id!==selectedId), canvasBackground);}} size="sm" variant="ghost" className="text-red-400 hover:bg-red-400/10 hover:text-red-300 px-2"><Trash2 size={18}/></Button>
              )}
              <Button size="sm" className="bg-[#8356F3] hover:bg-[#7145E6] text-white">Close Canvas</Button>
           </div>
        </div>

        {/* The Artboard */}
        <div className="flex-1 overflow-auto p-8 flex items-center justify-center relative">
          <div 
            ref={canvasRef}
            className="w-[960px] h-[540px] shadow-2xl relative overflow-hidden transition-transform duration-300 shrink-0"
            style={{ 
               transform: 'scale(0.85)',
               boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
               backgroundColor: canvasBackground.type === 'color' ? canvasBackground.value : canvasBackground.type === 'transparent' ? '#1e1e2c' : 'transparent',
               backgroundImage: canvasBackground.type === 'image' ? `url(${canvasBackground.value})` : 'none',
               backgroundSize: 'cover',
               backgroundPosition: 'center',
            }}
          >
             {elements.map((el) => {
                if (el.hidden) return null;
                const isSelected = selectedId === el.id;
                
                // Construct text shadow or stroke based on effects
                let textShadow = "none";
                if (el.dropShadow) textShadow = "2px 2px 4px rgba(0,0,0,0.5)";
                if (el.stroke) textShadow = "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000";

                return (
                  <div
                    key={el.id}
                    onMouseDown={(e) => handleDragStart(e, el.id)}
                    className={`absolute ${el.locked ? '' : 'cursor-move'} ${isSelected ? 'ring-2 ring-[#8356F3]' : 'hover:ring-1 hover:ring-purple-500/50'}`}
                    style={{
                      left: el.x,
                      top: el.y,
                      width: el.width,
                      height: el.height,
                      backgroundColor: el.backgroundShape ? 'rgba(0,0,0,0.4)' : (el.type === 'rect' ? el.color : 'transparent'),
                      opacity: el.opacity / 100,
                      transform: `rotate(${el.rotation}deg)`,
                      display: 'flex',
                      alignItems: el.alignVertical === 'top' ? 'flex-start' : el.alignVertical === 'bottom' ? 'flex-end' : 'center',
                      userSelect: 'none',
                      borderRadius: el.backgroundShape ? '8px' : '0'
                    }}
                  >
                     {el.type === 'text' && (
                        <div 
                          className="w-full break-words"
                          style={{
                             fontFamily: el.fontFamily,
                             fontSize: `${el.fontSize}px`,
                             fontWeight: el.fontWeight,
                             color: el.color,
                             textAlign: el.textAlign,
                             lineHeight: el.lineHeight,
                             letterSpacing: `${el.letterSpacing}px`,
                             textShadow: textShadow,
                          }}
                        >
                           {el.content}
                        </div>
                     )}
                     
                     {/* Resize Handles */}
                     {isSelected && !el.locked && (
                        <>
                          <div className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-[#8356F3] rounded-full cursor-nwse-resize" />
                          <div className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-[#8356F3] rounded-full cursor-nesw-resize" />
                          <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-[#8356F3] rounded-full cursor-nesw-resize" />
                          <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-[#8356F3] rounded-full cursor-nwse-resize" />
                        </>
                     )}
                  </div>
                )
             })}
          </div>
        </div>
        
      </div>
    </div>
  );
};
