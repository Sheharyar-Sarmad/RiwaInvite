"use client";

import { WidgetRenderer } from "./WidgetRenderer";
import { motion } from "framer-motion";

export function Canvas({ elements, setSelectedElement, device }: { elements: any[], setSelectedElement: any, device: string }) {
  const canvasWidth = device === "desktop" ? "max-w-[1200px]" : device === "tablet" ? "w-[768px]" : "w-[375px]";

  return (
    <div className={`bg-white min-h-[800px] shadow-2xl transition-all duration-300 ease-in-out ${canvasWidth} p-8 mx-auto`}>
      {elements.length === 0 ? (
        <div className="h-full flex items-center justify-center text-gray-300 border-2 border-dashed border-gray-200 rounded-xl py-32">
          Drag and drop widgets here
        </div>
      ) : (
        elements.map((el) => (
          <motion.div
            key={el.id}
            onClick={(e) => { e.stopPropagation(); setSelectedElement(el); }}
            className="relative group border-2 border-transparent hover:border-orange-400 p-2 -m-2 cursor-pointer transition-colors"
          >
            {/* The Magic Renderer */}
            <WidgetRenderer element={el} />
            
            {/* Element Controls (Delete, Duplicate) on Hover */}
            <div className="absolute -top-3 right-0 opacity-0 group-hover:opacity-100 flex items-center gap-1 bg-orange-500 text-white rounded-md shadow-lg px-2 py-1 text-xs">
              <button className="hover:text-orange-200" onClick={() => {}}>Edit</button>
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
}