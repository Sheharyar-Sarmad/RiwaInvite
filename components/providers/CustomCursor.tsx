"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function CustomCursor() {
  const pathname = usePathname();
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  const springConfig = { damping: 20, stiffness: 300, mass: 0.5 };
  const cursorX = useSpring(mouseX, springConfig);
  const cursorY = useSpring(mouseY, springConfig);

  const [isVisible, setIsVisible] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  // Do not show custom cursor on admin or dashboard routes
  const isProtectedRoute = pathname?.startsWith("/admin") || pathname?.startsWith("/dashboard") || pathname?.startsWith("/login") || pathname?.startsWith("/register");

  useEffect(() => {
    if (isProtectedRoute) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const moveCursor = (e: MouseEvent) => {
      mouseX.set(e.clientX - 12);
      mouseY.set(e.clientY - 12);
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    const handleHoverStart = () => setIsHovering(true);
    const handleHoverEnd = () => setIsHovering(false);

    window.addEventListener("mousemove", moveCursor);
    document.body.addEventListener("mouseleave", handleMouseLeave);
    document.body.addEventListener("mouseenter", handleMouseEnter);

    // Attach hover events to all clickable elements
    const clickables = document.querySelectorAll("a, button");
    clickables.forEach((el) => {
      el.addEventListener("mouseenter", handleHoverStart);
      el.addEventListener("mouseleave", handleHoverEnd);
    });

    return () => {
      window.removeEventListener("mousemove", moveCursor);
      document.body.removeEventListener("mouseleave", handleMouseLeave);
      document.body.removeEventListener("mouseenter", handleMouseEnter);
      clickables.forEach((el) => {
        el.removeEventListener("mouseenter", handleHoverStart);
        el.removeEventListener("mouseleave", handleHoverEnd);
      });
    };
  }, [mouseX, mouseY, isVisible, isProtectedRoute]);

  if (!isVisible || isProtectedRoute) return null;

  return (
    <motion.div
      className="pointer-events-none fixed left-0 top-0 z-[9999] hidden md:block"
      style={{ x: cursorX, y: cursorY }}
    >
      <motion.div
        animate={{
          scale: isHovering ? 1.8 : 1,
          backgroundColor: isHovering ? "rgba(249,115,22,0.2)" : "rgba(249,115,22,1)",
          borderColor: isHovering ? "rgba(249,115,22,0.5)" : "rgba(255,255,255,0.8)",
        }}
        transition={{ duration: 0.2 }}
        className="h-6 w-6 rounded-full border-2 shadow-[0_0_20px_rgba(249,115,22,0.8)] backdrop-blur-sm"
      />
    </motion.div>
  );
}