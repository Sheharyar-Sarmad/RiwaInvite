// hooks/useTemplateBuilder.ts
import { useState, useCallback } from "react";

export type ElementType = "text" | "image" | "video" | "audio" | "rsvp" | "divider";

export interface CanvasElement {
  id: string;
  type: ElementType;
  content: string;
  x: number;
  y: number;
  width?: number;
  fontSize?: number;
  color?: string;
}

export function useTemplateBuilder() {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const addElement = useCallback((type: ElementType) => {
    const newEl: CanvasElement = {
      id: crypto.randomUUID(),
      type,
      content: type === "text" ? "Double click to edit" : "",
      x: 50,
      y: 100 + elements.length * 20,
      width: type === "divider" ? 200 : 250,
      fontSize: 24,
      color: "#333333",
    };
    setElements((prev) => [...prev, newEl]);
    setSelectedId(newEl.id);
  }, [elements.length]);

  const updateElement = useCallback((id: string, updates: Partial<CanvasElement>) => {
    setElements((prev) => prev.map((el) => (el.id === id ? { ...el, ...updates } : el)));
  }, []);

  const removeElement = useCallback((id: string) => {
    setElements((prev) => prev.filter((el) => el.id !== id));
    setSelectedId(null);
  }, []);

  const selectedElement = elements.find((el) => el.id === selectedId) || null;

  return {
    elements,
    selectedId,
    selectedElement,
    setSelectedId,
    addElement,
    updateElement,
    removeElement,
  };
}