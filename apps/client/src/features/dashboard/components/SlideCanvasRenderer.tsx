import React, { useRef, useEffect, useState } from "react";
import { resolveMediaUrl } from "@/lib/queryClient";

export const SlideCanvasRenderer = ({ content, background }: { content: any; background?: any }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scalerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && scalerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        // Calculate the scale needed to fit 960x540 exactly in the container
        const scale = Math.min(width / 960, height / 540);
        scalerRef.current.style.transform = `translate(-50%, -50%) scale(${scale})`;
      }
    };
    
    handleResize();

    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    
    return () => observer.disconnect();
  }, []);

  let elements = [];
  let canvasBackground = { type: 'color', value: '#101017' };

  if (typeof content === 'string') {
    try {
      // Basic check to see if it looks like JSON before parsing
      if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
        const parsed = JSON.parse(content);
        elements = parsed.elements || [];
        canvasBackground = parsed.background || canvasBackground;
      } else {
        // If it's a plain string, we could optionally render it as a single text element
        // or just ignore it. Let's create a temporary text element if it's not JSON.
        elements = [{
          id: 'temp-fallback',
          type: 'text',
          layerName: 'Fallback Text',
          x: 480, y: 270, width: 800, height: 100,
          rotation: 0, opacity: 100, locked: true, hidden: false,
          content: content,
          color: '#ffffff',
          fontSize: 32,
          textAlign: 'center',
          alignVertical: 'middle',
          fontWeight: 'normal',
          dropShadow: true
        }];
      }
    } catch (e) {
      console.error('Failed to parse canvas content', e);
    }
  } else if (content && typeof content === 'object') {
    elements = content.elements || [];
    if (content.background) {
       canvasBackground = content.background;
    }
  }

  if (background && background.type) {
    canvasBackground = background;
  }

  // resolve image URLs for background
  let bgUrl = canvasBackground.value;
  if (canvasBackground.type === 'image' && bgUrl) {
    bgUrl = resolveMediaUrl(bgUrl) || bgUrl;
  }

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden flex items-center justify-center bg-black">
      <div 
        ref={scalerRef}
        className="transform-origin-center absolute bg-black shrink-0 pointer-events-none"
        style={{
          width: '960px',
          height: '540px',
          top: '50%',
          left: '50%',
          backgroundColor: canvasBackground.type === 'color' ? canvasBackground.value : canvasBackground.type === 'transparent' ? '#000000' : 'transparent',
          backgroundImage: canvasBackground.type === 'image' ? `url("${bgUrl}")` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transformOrigin: 'center center'
        }}
      >
         {elements.map((el: any) => {
            if (el.hidden) return null;
            
            let textShadow = "none";
            if (el.dropShadow) textShadow = "2px 2px 4px rgba(0,0,0,0.5)";
            if (el.stroke) textShadow = "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000";

            // Resolve image source
            let contentSrc = el.content;
            if (el.type === 'image' && contentSrc) {
               contentSrc = resolveMediaUrl(contentSrc) || contentSrc;
            }

            return (
              <div
                key={el.id}
                className="absolute"
                style={{
                  left: el.x,
                  top: el.y,
                  width: el.width,
                  height: el.height,
                  backgroundColor: el.type === 'rect' ? el.color : 'transparent',
                  opacity: el.opacity / 100,
                  transform: `rotate(${el.rotation}deg)`,
                  display: 'flex',
                  alignItems: el.alignVertical === 'top' ? 'flex-start' : el.alignVertical === 'bottom' ? 'flex-end' : 'center',
                  justifyContent: 'center',
                  userSelect: 'none',
                  borderRadius: el.backgroundShape ? '50%' : '0',
                  clipPath: el.shapeType === 'triangle' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : el.shapeType === 'star' ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' : 'none',
                }}
              >
                 {el.type === 'text' && (
                    <div 
                      className="w-full break-words"
                      style={{
                         fontFamily: el.fontFamily || "Inter",
                         fontSize: `${el.fontSize}px`,
                         fontWeight: el.fontWeight || "Normal",
                         color: el.color || "#FFFFFF",
                         textAlign: el.textAlign || "center",
                         lineHeight: el.lineHeight || 1.2,
                         letterSpacing: `${el.letterSpacing || 0}px`,
                         textShadow: textShadow,
                      }}
                    >
                       {el.content}
                    </div>
                 )}

                 {el.type === 'image' && (
                    <img src={contentSrc} alt={el.layerName} className="w-full h-full object-cover select-none pointer-events-none" />
                 )}
              </div>
            )
         })}
      </div>
    </div>
  );
};
