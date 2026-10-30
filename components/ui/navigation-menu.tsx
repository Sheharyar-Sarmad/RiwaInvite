"use client";

import * as React from "react";
import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu";
import { cva } from "class-variance-authority";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Context — lets Content know whether it is the panel itself (no viewport)   */
/*  or just content rendered inside the shared Viewport.                       */
/* -------------------------------------------------------------------------- */

const NavigationMenuContext = React.createContext<{ viewport: boolean }>({
  viewport: true,
});

// One source of truth for the premium glass panel (used by Content + Viewport).
const glassPanel = [
  "rounded-2xl border border-orange-100/60 bg-white/95 backdrop-blur-2xl",
  "shadow-[0_20px_50px_-15px_rgba(249,115,22,0.3)]",
  // warm sheen in the top-left corner
  "bg-[radial-gradient(120%_80%_at_0%_0%,rgba(255,237,213,0.55),transparent_60%)]",
].join(" ");

/* -------------------------------------------------------------------------- */
/*  Root                                                                      */
/* -------------------------------------------------------------------------- */

const NavigationMenu = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Root> & {
    /** Shared viewport (classic shadcn). Set false for per-item floating panels. */
    viewport?: boolean;
  }
>(({ className, children, viewport = true, ...props }, ref) => (
  <NavigationMenuContext.Provider value={{ viewport }}>
    <NavigationMenuPrimitive.Root
      ref={ref}
      // Snappier hover intent than Radix's 200ms default
      delayDuration={80}
      skipDelayDuration={300}
      className={cn(
        "relative z-10 flex max-w-max flex-1 items-center justify-center",
        className
      )}
      {...props}
    >
      {children}
      {viewport && <NavigationMenuViewport />}
    </NavigationMenuPrimitive.Root>
  </NavigationMenuContext.Provider>
));
NavigationMenu.displayName = NavigationMenuPrimitive.Root.displayName;

/* -------------------------------------------------------------------------- */
/*  List / Item                                                               */
/* -------------------------------------------------------------------------- */

const NavigationMenuList = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.List>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.List
    ref={ref}
    className={cn(
      "group flex flex-1 list-none items-center justify-center gap-1",
      className
    )}
    {...props}
  />
));
NavigationMenuList.displayName = NavigationMenuPrimitive.List.displayName;

// `relative` so floating panels anchor to their own trigger.
const NavigationMenuItem = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Item>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.Item
    ref={ref}
    className={cn("relative", className)}
    {...props}
  />
));
NavigationMenuItem.displayName = NavigationMenuPrimitive.Item.displayName;

/* -------------------------------------------------------------------------- */
/*  Trigger                                                                   */
/* -------------------------------------------------------------------------- */

const navigationMenuTriggerStyle = cva(
  [
    "group relative inline-flex h-10 w-max items-center justify-center rounded-xl px-4 py-2",
    "bg-transparent text-sm font-semibold text-stone-600",
    "transition-colors duration-200 motion-reduce:transition-none",
    "hover:bg-orange-50 hover:text-orange-600",
    "focus:bg-orange-50 focus:text-orange-600 focus:outline-none",
    "focus-visible:ring-2 focus-visible:ring-orange-400/60 focus-visible:ring-offset-1",
    "disabled:pointer-events-none disabled:opacity-50",
    "data-[active]:text-orange-600 data-[state=open]:bg-orange-50 data-[state=open]:text-orange-600",
    // animated underline
    "after:pointer-events-none after:absolute after:inset-x-4 after:bottom-1.5 after:h-[2px] after:origin-left after:scale-x-0 after:rounded-full after:bg-gradient-to-r after:from-orange-400 after:to-orange-600 after:transition-transform after:duration-300 motion-reduce:after:transition-none",
    "hover:after:scale-x-100 data-[active]:after:scale-x-100 data-[state=open]:after:scale-x-100",
  ].join(" ")
);

const NavigationMenuTrigger = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <NavigationMenuPrimitive.Trigger
    ref={ref}
    className={cn(navigationMenuTriggerStyle(), "group", className)}
    {...props}
  >
    {children}
    <ChevronDown
      className="relative top-px ml-1 h-3.5 w-3.5 text-orange-400 transition-transform duration-300 group-data-[state=open]:rotate-180 motion-reduce:transition-none"
      aria-hidden="true"
    />
  </NavigationMenuPrimitive.Trigger>
));
NavigationMenuTrigger.displayName = NavigationMenuPrimitive.Trigger.displayName;

/* -------------------------------------------------------------------------- */
/*  Content                                                                   */
/*  - viewport mode: only handles motion; the Viewport is the panel.           */
/*  - floating mode (viewport={false}): Content IS the premium panel.          */
/* -------------------------------------------------------------------------- */

const NavigationMenuContent = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Content>
>(({ className, ...props }, ref) => {
  const { viewport } = React.useContext(NavigationMenuContext);

  return (
    <NavigationMenuPrimitive.Content
      ref={ref}
      className={cn(
        "left-0 top-0 w-full md:absolute md:w-auto",
        viewport
          ? // classic: big slide between sections inside the shared viewport
            "data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52"
          : [
              // floating premium panel
              "z-50 p-6 md:top-full md:mt-3",
              glassPanel,
              // notch pointing at the trigger
              "before:pointer-events-none before:absolute before:-top-[7px] before:left-8 before:h-3.5 before:w-3.5 before:rotate-45 before:rounded-tl-[4px] before:border-l before:border-t before:border-orange-100/60 before:bg-white before:content-['']",
              // open / close
              "origin-top data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 data-[state=open]:slide-in-from-top-2",
              // moving between neighbouring items: short, tasteful slide
              "data-[motion=from-start]:slide-in-from-left-4 data-[motion=from-end]:slide-in-from-right-4 data-[motion=to-start]:slide-out-to-left-4 data-[motion=to-end]:slide-out-to-right-4",
              "motion-reduce:animate-none",
            ],
        className
      )}
      {...props}
    />
  );
});
NavigationMenuContent.displayName = NavigationMenuPrimitive.Content.displayName;

/* -------------------------------------------------------------------------- */
/*  Link                                                                      */
/* -------------------------------------------------------------------------- */

const NavigationMenuLink = NavigationMenuPrimitive.Link;

/* -------------------------------------------------------------------------- */
/*  Viewport (only rendered when `viewport` is true)                           */
/* -------------------------------------------------------------------------- */

const NavigationMenuViewport = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <div className="absolute left-0 top-full flex justify-center">
    <NavigationMenuPrimitive.Viewport
      className={cn(
        "relative mt-3 h-[var(--radix-navigation-menu-viewport-height)] w-full origin-top overflow-hidden text-stone-800",
        glassPanel,
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "md:w-[var(--radix-navigation-menu-viewport-width)]",
        className
      )}
      ref={ref}
      {...props}
    />
  </div>
));
NavigationMenuViewport.displayName =
  NavigationMenuPrimitive.Viewport.displayName;

export {
  navigationMenuTriggerStyle,
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuViewport,
};