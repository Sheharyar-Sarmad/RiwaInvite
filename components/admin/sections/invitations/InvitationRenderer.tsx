"use client";

import React, { useMemo } from "react";
import { LayoutTemplate } from "lucide-react";

type SchemaElement = {
  type: string;
  props?: Record<string, any>;
  children?: string[];
};

type DesignSchema = {
  root: string | SchemaElement;
  elements: Record<string, SchemaElement>;
};

/* -------------------------------------------------------------------------- */
/*  Token hydration                                                           */
/* -------------------------------------------------------------------------- */

const safeDate = (value?: string, opts?: Intl.DateTimeFormatOptions) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-US", opts);
};

/** Flat map of every supported `{{token}}`. Add new tokens here only. */
function buildTokenMap(data: any): Record<string, string> {
  const venue = data?.venue_details ?? {};
  return {
    "names.bride": data?.bride_name || "Bride",
    "names.groom": data?.groom_name || "Groom",
    "event.title": data?.title || "Our Celebration",
    "event.date": safeDate(data?.event_date, { dateStyle: "long" }) || "Event Date",
    "event.time": data?.event_time || venue?.time || "Event Time",
    "venue.name": venue?.name || "Venue Name",
    "venue.address": venue?.address || "Venue Address",
    "venue.city": venue?.city || "City",
  };
}

function hydrate(value: unknown, tokens: Record<string, string>) {
  if (typeof value !== "string" || !value) return value ?? "";
  // Unknown tokens are left untouched so template authors can spot typos.
  return value.replace(/{{\s*([\w.]+)\s*}}/g, (match, key) => tokens[key] ?? match);
}

/* -------------------------------------------------------------------------- */
/*  Empty states                                                              */
/* -------------------------------------------------------------------------- */

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex min-h-[320px] h-full flex-col items-center justify-center gap-3 p-10 text-center">
      <div className="rounded-2xl border border-orange-100 bg-orange-50 p-3 text-orange-500 shadow-inner">
        <LayoutTemplate className="h-6 w-6" />
      </div>
      <div>
        <p className="text-base font-semibold text-gray-700 font-[family-name:var(--font-display)]">{title}</p>
        <p className="mt-1 max-w-xs text-sm text-gray-400 font-[family-name:var(--font-body)]">{hint}</p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Renderer                                                                  */
/* -------------------------------------------------------------------------- */

export function InvitationRenderer({
  schema,
  invitationData,
}: {
  schema: DesignSchema;
  invitationData: any;
}) {
  const tokens = useMemo(() => buildTokenMap(invitationData), [invitationData]);

  const resolved = useMemo(() => {
    const elements = schema?.elements ?? {};

    // 1. Root can be an id ("root": "hero-1") OR an inline object ("root": { type: "container" }).
    let rootId: string | null = null;
    let rootElement: SchemaElement | null = null;

    if (typeof schema?.root === "string") {
      rootId = schema.root;
      rootElement = elements[schema.root] ?? null;
    } else if (schema?.root && typeof schema.root === "object") {
      rootElement = schema.root;
    }

    // 2. Smart fallback: elements nobody references as a child are "orphans".
    //    Rendering only orphans avoids drawing nested elements twice.
    const referenced = new Set<string>();
    Object.values(elements).forEach((el) => el?.children?.forEach((c) => referenced.add(c)));
    rootElement?.children?.forEach((c) => referenced.add(c));
    if (rootId) referenced.add(rootId);

    let fallbackIds = Object.keys(elements).filter((id) => !referenced.has(id));
    if (fallbackIds.length === 0) fallbackIds = Object.keys(elements).filter((id) => id !== rootId);

    return { elements, rootElement, fallbackIds };
  }, [schema]);

  if (!schema) return <EmptyState title="Invalid design schema" hint="The invitation has no readable design data." />;

  const { elements, rootElement, fallbackIds } = resolved;

  if (!rootElement && fallbackIds.length === 0) {
    return (
      <EmptyState
        title="This invitation is empty"
        hint="The design schema has no valid root element and no widgets to render."
      />
    );
  }

  const renderElement = (elementId: string, trail: string[] = []): React.ReactNode => {
    // Guard against circular child references.
    if (trail.includes(elementId)) return null;

    const element = elements[elementId];
    if (!element) return null;

    const { type, props = {}, children } = element;
    const className = props.className || "";
    const style = props.style as React.CSSProperties | undefined;

    switch (type) {
      case "text":
        return (
          <div key={elementId} className={className} style={style}>
            {hydrate(props.text, tokens) as string}
          </div>
        );

      case "image":
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={elementId}
            src={props.src || "https://placehold.co/400x400?text=Image"}
            alt={(hydrate(props.alt, tokens) as string) || "Invitation image"}
            loading="lazy"
            className={className}
            style={style}
          />
        );

      case "container":
        return (
          <div key={elementId} className={className} style={style}>
            {children?.map((childId) => renderElement(childId, [...trail, elementId]))}
          </div>
        );

      default:
        // Surface unknown widgets to template authors, hide them from guests.
        return process.env.NODE_ENV !== "production" ? (
          <div key={elementId} className="m-2 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-500">
            Unknown widget: {type}
          </div>
        ) : null;
    }
  };

  const hasChildren = !!rootElement?.children?.length;

  return (
    // `min-h-full` (not `h-full`) lets content grow past the frame so the parent scroller can scroll it.
    <div className="min-h-full w-full">
      <div className={`min-h-full ${rootElement?.props?.className || ""}`} style={rootElement?.props?.style}>
        {hasChildren
          ? rootElement!.children!.map((childId) => renderElement(childId, rootElement && typeof schema.root === "string" ? [schema.root] : []))
          : fallbackIds.map((id) => renderElement(id))}
      </div>
    </div>
  );
}