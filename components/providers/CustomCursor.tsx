"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  useVelocity,
} from "framer-motion";

/* -------------------------------------------------------------------------- */
/*  Config                                                                    */
/* -------------------------------------------------------------------------- */

// Routes where the native cursor should stay
const HIDDEN_ROUTES = ["/admin", "/dashboard", "/login", "/register"];

const CLICKABLE =
  "a, button, [role='button'], [role='tab'], input, select, textarea, label, summary, [data-cursor='pointer']";

/** Put data-cursor-label="Preview" on any element to show a label next to the cursor. */
const LABELLED = "[data-cursor-label]";

const DOT_SPRING = { damping: 34, stiffness: 900, mass: 0.3 };
const RING_SPRING = { damping: 22, stiffness: 320, mass: 0.5 };
const TORCH_SPRING = { damping: 30, stiffness: 90, mass: 1 };

const TORCH_SIZE = 720;
const RING_SIZE = 36;
const DOT_SIZE = 8;

type Ripple = { id: number; x: number; y: number };

/** Only fine pointers (a real mouse) get the custom cursor. Decided in JS, not just CSS. */
function useFinePointer(): boolean {
  const [fine, setFine] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setFine(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return fine;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function CustomCursor() {
  const pathname = usePathname();
  const reduce = !!useReducedMotion();
  const finePointer = useFinePointer();
  const hiddenRoute = HIDDEN_ROUTES.some((r) => pathname?.startsWith(r));
  const enabled = finePointer && !hiddenRoute;

  // Raw pointer position. Everything below derives from these.
  const mouseX = useMotionValue(-1000);
  const mouseY = useMotionValue(-1000);

  // Three followers at three speeds: dot (tight), ring (soft), torch (slow, trailing).
  const dotX = useSpring(mouseX, DOT_SPRING);
  const dotY = useSpring(mouseY, DOT_SPRING);
  const ringX = useSpring(mouseX, RING_SPRING);
  const ringY = useSpring(mouseY, RING_SPRING);
  const torchX = useSpring(mouseX, TORCH_SPRING);
  const torchY = useSpring(mouseY, TORCH_SPRING);

  // The torch brightens a little while the pointer is moving.
  const velX = useVelocity(mouseX);
  const velY = useVelocity(mouseY);
  const speed = useTransform([velX, velY], (v: number[]) => Math.hypot(v[0], v[1]));
  const speedSmooth = useSpring(speed, { stiffness: 80, damping: 20 });
  const torchBoost = useTransform(speedSmooth, [0, 3000], [1, 1.18]);

  const [visible, setVisible] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [label, setLabel] = useState("");
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const shown = useRef(false);
  const rippleId = useRef(0);
  const lastLabel = useRef("");
  if (label) lastLabel.current = label;

  useEffect(() => {
    if (!enabled) {
      shown.current = false;
      setVisible(false);
      setHovering(false);
      setPressed(false);
      setLabel("");
      setRipples([]);
      return;
    }

    const onMove = (e: PointerEvent) => {
      // Decide per event: touch or pen hides it, a real mouse shows it.
      if (e.pointerType !== "mouse") {
        shown.current = false;
        setVisible(false);
        return;
      }
      const { clientX: x, clientY: y } = e;
      mouseX.set(x);
      mouseY.set(y);

      // First appearance: snap the followers so nothing flies in from the corner.
      if (!shown.current) {
        shown.current = true;
        dotX.jump(x);
        dotY.jump(y);
        ringX.jump(x);
        ringY.jump(y);
        torchX.jump(x);
        torchY.jump(y);
        setVisible(true);
      }
    };

    // One delegated listener covers links and buttons rendered at any time.
    const onOver = (e: MouseEvent) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      setHovering(!!t.closest(CLICKABLE));
      setLabel(t.closest<HTMLElement>(LABELLED)?.dataset.cursorLabel ?? "");
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      setPressed(true);
      if (reduce) return;
      const id = ++rippleId.current;
      setRipples((r) => [...r.slice(-3), { id, x: e.clientX, y: e.clientY }]);
    };

    const onUp = () => setPressed(false);

    const onLeaveWindow = () => {
      shown.current = false;
      setVisible(false);
      setPressed(false);
    };

    // Capture phase, so a modal that calls stopPropagation can't starve these listeners.
    const capture = { capture: true } as const;
    const passiveCapture = { passive: true, capture: true } as const;

    window.addEventListener("pointermove", onMove, passiveCapture);
    window.addEventListener("pointerdown", onDown, passiveCapture);
    window.addEventListener("pointerup", onUp, passiveCapture);
    window.addEventListener("pointercancel", onUp, passiveCapture);
    window.addEventListener("blur", onUp);
    document.addEventListener("mouseover", onOver, capture);
    document.documentElement.addEventListener("mouseleave", onLeaveWindow);

    return () => {
      window.removeEventListener("pointermove", onMove, passiveCapture);
      window.removeEventListener("pointerdown", onDown, passiveCapture);
      window.removeEventListener("pointerup", onUp, passiveCapture);
      window.removeEventListener("pointercancel", onUp, passiveCapture);
      window.removeEventListener("blur", onUp);
      document.removeEventListener("mouseover", onOver, capture);
      document.documentElement.removeEventListener("mouseleave", onLeaveWindow);
    };
  }, [enabled, reduce, mouseX, mouseY, dotX, dotY, ringX, ringY, torchX, torchY]);

  if (!enabled) return null;

  // With reduced motion the followers track the pointer directly, with no lag or boost.
  const dx = reduce ? mouseX : dotX;
  const dy = reduce ? mouseY : dotY;
  const rx = reduce ? mouseX : ringX;
  const ry = reduce ? mouseY : ringY;
  const tx = reduce ? mouseX : torchX;
  const ty = reduce ? mouseY : torchY;

  const hasLabel = label !== "";
  const springy = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 400, damping: 28 };

  const ringAnimate = pressed
    ? { scale: 0.8, backgroundColor: "rgba(249,115,22,0.25)", borderColor: "rgba(249,115,22,0.9)" }
    : hasLabel
    ? { scale: 1.3, backgroundColor: "rgba(249,115,22,0.1)", borderColor: "rgba(249,115,22,0.5)" }
    : hovering
    ? { scale: 1.6, backgroundColor: "rgba(249,115,22,0.16)", borderColor: "rgba(249,115,22,0.8)" }
    : { scale: 1, backgroundColor: "rgba(249,115,22,0)", borderColor: "rgba(249,115,22,0.55)" };

  // Portaled to <body> at the maximum z-index, so no layout stacking context or modal covers it.
  return createPortal(
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[2147483647]">
      {/* Torch: a warm pool of light that trails the pointer */}
      <motion.div
        className="absolute left-0 top-0"
        style={{
          x: tx,
          y: ty,
          width: TORCH_SIZE,
          height: TORCH_SIZE,
          marginLeft: -TORCH_SIZE / 2,
          marginTop: -TORCH_SIZE / 2,
        }}
      >
        <motion.div className="h-full w-full" style={reduce ? undefined : { scale: torchBoost }}>
          <motion.div
            className="relative h-full w-full"
            initial={false}
            animate={{
              opacity: visible ? (hovering || hasLabel ? 1 : 0.8) : 0,
              scale: hovering || hasLabel ? 1.15 : 1,
            }}
            transition={reduce ? { duration: 0 } : { duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Wide, soft pool */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  "radial-gradient(circle at center, rgba(251,146,60,0.2) 0%, rgba(249,115,22,0.09) 30%, rgba(249,115,22,0) 65%)",
              }}
            />
            {/* Bright core */}
            <div
              className="absolute left-1/2 top-1/2 h-[240px] w-[240px] rounded-full mix-blend-soft-light"
              style={{
                marginLeft: -120,
                marginTop: -120,
                background:
                  "radial-gradient(circle at center, rgba(255,244,234,0.55) 0%, rgba(255,244,234,0) 70%)",
              }}
            />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Click ripples */}
      {ripples.map((r) => (
        <motion.span
          key={r.id}
          className="absolute left-0 top-0 rounded-full border-2 border-orange-500/70"
          style={{
            x: r.x,
            y: r.y,
            width: 40,
            height: 40,
            marginLeft: -20,
            marginTop: -20,
          }}
          initial={{ scale: 0.3, opacity: 0.7 }}
          animate={{ scale: 2.6, opacity: 0 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          onAnimationComplete={() => setRipples((list) => list.filter((x) => x.id !== r.id))}
        />
      ))}

      {/* Ring (and label) */}
      <motion.div
        className="absolute left-0 top-0"
        style={{ x: rx, y: ry, width: RING_SIZE, height: RING_SIZE, marginLeft: -RING_SIZE / 2, marginTop: -RING_SIZE / 2 }}
      >
        <motion.div
          initial={false}
          animate={{ ...ringAnimate, opacity: visible ? 1 : 0 }}
          transition={springy}
          className="h-full w-full rounded-full border-[1.5px] shadow-[0_0_24px_rgba(249,115,22,0.45),inset_0_0_0_1px_rgba(255,255,255,0.35)] backdrop-blur-[2px]"
        />
        <motion.span
          initial={false}
          animate={{ opacity: visible && hasLabel ? 1 : 0, scale: hasLabel ? 1 : 0.85, x: hasLabel ? 0 : -6 }}
          transition={springy}
          className="absolute left-[34px] top-[22px] whitespace-nowrap rounded-full bg-gray-900/90 px-3 py-1 font-[family-name:var(--font-body)] text-xs font-semibold text-white shadow-lg backdrop-blur-md"
        >
          {label || lastLabel.current}
        </motion.span>
      </motion.div>

      {/* Dot: sits on the pointer */}
      <motion.div
        className="absolute left-0 top-0"
        style={{ x: dx, y: dy, width: DOT_SIZE, height: DOT_SIZE, marginLeft: -DOT_SIZE / 2, marginTop: -DOT_SIZE / 2 }}
      >
        <motion.div
          initial={false}
          animate={{
            opacity: visible && !hovering && !hasLabel ? 1 : 0,
            scale: pressed ? 0.6 : 1,
          }}
          transition={springy}
          className="h-full w-full rounded-full bg-orange-500 shadow-[0_0_14px_3px_rgba(249,115,22,0.8)] ring-1 ring-white/80"
        />
      </motion.div>
    </div>,
    document.body,
  );
}