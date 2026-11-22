"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Types & style context                                                     */
/* -------------------------------------------------------------------------- */

export type TabsVariant = "default" | "underline" | "solid";
export type TabsSize = "sm" | "md" | "lg";

const TabsStyleContext = React.createContext<{
  variant: TabsVariant;
  size: TabsSize;
}>({ variant: "default", size: "md" });

const useIsoLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

/* -------------------------------------------------------------------------- */
/*  Variants                                                                  */
/* -------------------------------------------------------------------------- */

export const tabsListVariants = cva(
  "group/tabs relative inline-flex items-center text-muted-foreground data-[orientation=vertical]:h-auto data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch",
  {
    variants: {
      variant: {
        default: "rounded-lg bg-muted p-1",
        underline:
          "gap-1 border-b border-border data-[orientation=vertical]:border-b-0 data-[orientation=vertical]:border-r",
        solid: "gap-1",
      },
      size: {
        sm: "h-9",
        md: "h-10",
        lg: "h-12",
      },
      fullWidth: {
        true: "flex w-full [&>[role=tab]]:flex-1",
        false: "",
      },
      scrollable: {
        true: "max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      fullWidth: false,
      scrollable: false,
    },
  },
);

export const tabsTriggerVariants = cva(
  "relative z-10 inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-medium ring-offset-background transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[orientation=vertical]:justify-start [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // The sliding indicator paints the active background. The
        // group-data-[ready=false] classes are a fallback for the first paint
        // (SSR) before the indicator has been measured.
        default:
          "rounded-md hover:text-foreground data-[state=active]:text-foreground group-data-[ready=false]/tabs:data-[state=active]:bg-background group-data-[ready=false]/tabs:data-[state=active]:shadow-sm",
        underline:
          "rounded-none hover:text-foreground data-[state=active]:text-foreground group-data-[ready=false]/tabs:data-[state=active]:shadow-[inset_0_-2px_0_0_hsl(var(--primary))]",
        solid:
          "rounded-md hover:bg-muted hover:text-foreground data-[state=active]:text-primary-foreground data-[state=active]:hover:bg-transparent group-data-[ready=false]/tabs:data-[state=active]:bg-primary",
      },
      size: {
        sm: "px-2.5 py-1 text-xs",
        md: "px-3 py-1.5 text-sm",
        lg: "px-4 py-2 text-base",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);

const indicatorClasses: Record<TabsVariant, string> = {
  default: "rounded-md bg-background shadow-sm",
  underline: "rounded-full bg-primary",
  solid: "rounded-md bg-primary shadow-sm",
};

const badgeClasses: Record<TabsVariant, string> = {
  default: "bg-foreground/10",
  underline: "bg-foreground/10",
  solid:
    "bg-foreground/10 group-data-[state=active]/trigger:bg-primary-foreground/20",
};

/* -------------------------------------------------------------------------- */
/*  Sliding indicator hook                                                    */
/* -------------------------------------------------------------------------- */

type Rect = { x: number; y: number; w: number; h: number };

function useTabIndicator(
  listRef: React.RefObject<HTMLDivElement | null>,
  variant: TabsVariant,
  scrollable: boolean,
) {
  const [rect, setRect] = React.useState<Rect | null>(null);
  const [animate, setAnimate] = React.useState(false);
  const lastActive = React.useRef<HTMLElement | null>(null);
  const hasMeasured = React.useRef(false);

  const measure = React.useCallback(() => {
    const list = listRef.current;
    if (!list) return;

    const active = list.querySelector<HTMLElement>(
      '[role="tab"][data-state="active"]',
    );
    if (!active) {
      setRect(null);
      return;
    }

    const vertical = list.getAttribute("data-orientation") === "vertical";
    const { offsetLeft: x, offsetTop: y, offsetWidth: w, offsetHeight: h } = active;
    const T = 2; // underline thickness

    const next: Rect =
      variant === "underline"
        ? vertical
          ? { x: x + w - T, y, w: T, h }
          : { x, y: y + h - T, w, h: T }
        : { x, y, w, h };

    setRect((prev) =>
      prev && prev.x === next.x && prev.y === next.y && prev.w === next.w && prev.h === next.h
        ? prev
        : next,
    );

    // Keep the active tab visible in scrollable lists.
    if (scrollable && !vertical && lastActive.current !== active) {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      list.scrollTo({
        left: x - (list.clientWidth - w) / 2,
        behavior: hasMeasured.current && !reduced ? "smooth" : "auto",
      });
    }
    lastActive.current = active;
    hasMeasured.current = true;
  }, [listRef, variant, scrollable]);

  useIsoLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;

    measure();

    const ro = new ResizeObserver(measure);
    const observeTabs = () => {
      ro.observe(list);
      list.querySelectorAll('[role="tab"]').forEach((t) => ro.observe(t));
    };
    observeTabs();

    const mo = new MutationObserver(() => {
      observeTabs();
      measure();
    });
    mo.observe(list, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-state", "data-orientation"],
    });

    // Enable transitions only after the first position has been applied,
    // so the indicator doesn't fly in from the corner on mount.
    const raf = requestAnimationFrame(() => setAnimate(true));

    return () => {
      ro.disconnect();
      mo.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [listRef, measure]);

  return { rect, animate };
}

/* -------------------------------------------------------------------------- */
/*  Tabs (root)                                                               */
/* -------------------------------------------------------------------------- */

const Tabs = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Root
    ref={ref}
    className={cn(
      "data-[orientation=vertical]:flex data-[orientation=vertical]:gap-4",
      className,
    )}
    {...props}
  />
));
Tabs.displayName = TabsPrimitive.Root.displayName;

/* -------------------------------------------------------------------------- */
/*  TabsList                                                                  */
/* -------------------------------------------------------------------------- */

export interface TabsListProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> {
  /** Visual style. `default` is the original pill-in-a-track look. */
  variant?: TabsVariant;
  size?: TabsSize;
  /** Stretch triggers to fill the available width. */
  fullWidth?: boolean;
  /** Horizontal scroll instead of overflowing; scrolls the active tab into view. */
  scrollable?: boolean;
}

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  TabsListProps
>(
  (
    {
      className,
      children,
      variant = "default",
      size = "md",
      fullWidth = false,
      scrollable = false,
      ...props
    },
    forwardedRef,
  ) => {
    const listRef = React.useRef<HTMLDivElement | null>(null);
    const { rect, animate } = useTabIndicator(listRef, variant, scrollable);

    const setRefs = React.useCallback(
      (node: HTMLDivElement | null) => {
        listRef.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef)
          (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      },
      [forwardedRef],
    );

    const ctx = React.useMemo(() => ({ variant, size }), [variant, size]);

    return (
      <TabsStyleContext.Provider value={ctx}>
        <TabsPrimitive.List
          ref={setRefs}
          data-ready={rect ? "true" : "false"}
          className={cn(
            tabsListVariants({ variant, size, fullWidth, scrollable }),
            className,
          )}
          {...props}
        >
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute left-0 top-0 z-0 opacity-0",
              rect && "opacity-100",
              animate &&
                "transition-[transform,width,height,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
              indicatorClasses[variant],
            )}
            style={
              rect
                ? {
                    width: rect.w,
                    height: rect.h,
                    transform: `translate(${rect.x}px, ${rect.y}px)`,
                  }
                : undefined
            }
          />
          {children}
        </TabsPrimitive.List>
      </TabsStyleContext.Provider>
    );
  },
);
TabsList.displayName = TabsPrimitive.List.displayName;

/* -------------------------------------------------------------------------- */
/*  TabsTrigger                                                               */
/* -------------------------------------------------------------------------- */

export interface TabsTriggerProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  /** Optional leading icon. */
  icon?: React.ReactNode;
  /** Optional trailing count or label, e.g. unread number. */
  badge?: React.ReactNode;
}

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, icon, badge, children, ...props }, ref) => {
  const { variant, size } = React.useContext(TabsStyleContext);

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn("group/trigger", tabsTriggerVariants({ variant, size }), className)}
      {...props}
    >
      {icon}
      {children}
      {badge != null && badge !== false && (
        <span
          className={cn(
            "min-w-5 rounded-full px-1.5 text-center text-[0.6875rem] font-medium leading-5 tabular-nums transition-colors",
            badgeClasses[variant],
          )}
        >
          {badge}
        </span>
      )}
    </TabsPrimitive.Trigger>
  );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

/* -------------------------------------------------------------------------- */
/*  TabsContent                                                               */
/* -------------------------------------------------------------------------- */

export interface TabsContentProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content> {
  /**
   * Keep the panel mounted while inactive (hidden with CSS) so local state,
   * scroll position and form inputs survive tab switches.
   */
  keepMounted?: boolean;
}

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  TabsContentProps
>(({ className, keepMounted = false, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    forceMount={keepMounted ? true : undefined}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "data-[orientation=vertical]:mt-0 data-[orientation=vertical]:flex-1",
      // Requires tailwindcss-animate (included in standard shadcn setups).
      "data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-1 data-[state=active]:duration-200 motion-reduce:animate-none",
      keepMounted && "data-[state=inactive]:hidden",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };