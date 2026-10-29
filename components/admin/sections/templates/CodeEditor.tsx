"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Database, Loader2 } from "lucide-react";
import type { BeforeMount, OnMount } from "@monaco-editor/react";

import {
  BINDING_OPTIONS,
  DATA_DTS,
  DATA_MARK,
  EMPTY_DATA,
  LOOP_SNIPPET,
  injectReactData,
  resolveText,
  tokenFor,
  type FieldOption,
  type InvitationData,
} from "@/lib/elementor/invitation-data";

const Monaco = dynamic(
  () => import("@monaco-editor/react").then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full place-items-center bg-[#0f172a] text-slate-500">
        <Loader2 className="size-5 animate-spin" />
      </div>
    ),
  },
);

export type CodeLang = "html" | "css" | "jsx" | "tsx";

const LANGS: { id: CodeLang; label: string; monaco: string; file: string }[] = [
  { id: "html", label: "HTML", monaco: "html", file: "index.html" },
  { id: "css", label: "CSS", monaco: "css", file: "styles.css" },
  { id: "jsx", label: "JSX", monaco: "javascript", file: "App.jsx" },
  { id: "tsx", label: "TSX", monaco: "typescript", file: "App.tsx" },
];

type PosLike = { lineNumber: number; column: number };
type ModelLike = {
  getValueInRange(r: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  }): string;
  getWordUntilPosition(p: PosLike): { startColumn: number };
};

let completionsRegistered = false;

const beforeMount: BeforeMount = (monaco) => {
  monaco.editor.defineTheme("riwa-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#0f172a",
      "editorLineNumber.foreground": "#475569",
      "editorLineNumber.activeForeground": "#fb923c",
      "editor.lineHighlightBackground": "#1e293b66",
      "editorCursor.foreground": "#f97316",
      "editor.selectionBackground": "#f9731640",
    },
  });

  const ts = monaco.languages.typescript;
  const opts = {
    jsx: ts.JsxEmit.React,
    target: ts.ScriptTarget.ES2020,
    allowNonTsExtensions: true,
    allowJs: true,
    esModuleInterop: true,
  };
  ts.typescriptDefaults.setCompilerOptions(opts);
  ts.javascriptDefaults.setCompilerOptions(opts);
  const diag = { noSemanticValidation: true, noSyntaxValidation: false };
  ts.typescriptDefaults.setDiagnosticsOptions(diag);
  ts.javascriptDefaults.setDiagnosticsOptions(diag);

  if (completionsRegistered) return;
  completionsRegistered = true;

  // IntelliSense for `data.names.bride` etc.
  ts.typescriptDefaults.addExtraLib(DATA_DTS, "ts:riwa-invitation-data.d.ts");
  ts.javascriptDefaults.addExtraLib(DATA_DTS, "ts:riwa-invitation-data.d.ts");

  // {{token}} completion for HTML / CSS
  for (const lang of ["html", "css"] as const) {
    monaco.languages.registerCompletionItemProvider(lang, {
      triggerCharacters: ["{", "."],
      provideCompletionItems: (model: ModelLike, position: PosLike) => {
        const before = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });
        const m = /\{{1,2}[\w.]*$/.exec(before);
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: m ? position.column - m[0].length : word.startColumn,
          endColumn: position.column,
        };
        return {
          suggestions: BINDING_OPTIONS.map((o: FieldOption) => {
            const text = tokenFor(o.value, "html");
            return {
              label: text,
              detail: o.label,
              kind: monaco.languages.CompletionItemKind.Variable,
              insertText: text,
              filterText: text,
              range,
            };
          }),
        };
      },
    });
  }
};

type EditorInstance = Parameters<OnMount>[0];

export function CodeEditor({
  value,
  onChange,
  language,
  onLanguageChange,
}: {
  value: string;
  onChange: (v: string) => void;
  language: CodeLang;
  onLanguageChange: (l: CodeLang) => void;
}) {
  const cfg = LANGS.find((l) => l.id === language) ?? LANGS[0];
  const editorRef = React.useRef<EditorInstance | null>(null);
  const [fieldsOpen, setFieldsOpen] = React.useState(false);
  const isReact = language === "jsx" || language === "tsx";

  const insert = (text: string) => {
    const ed = editorRef.current;
    if (!ed) return;
    const sel = ed.getSelection();
    if (!sel) return;
    ed.executeEdits("insert-field", [
      { range: sel, text, forceMoveMarkers: true },
    ]);
    ed.focus();
    setFieldsOpen(false);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0f172a]">
      <div className="relative flex shrink-0 items-center gap-1 border-b border-slate-800 bg-[#0b1220] p-1.5">
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden">
        {LANGS.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => onLanguageChange(l.id)}
            className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition ${
              language === l.id
                ? "bg-orange-500 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            {l.label}
          </button>
        ))}
        </div>
        <button
          type="button"
          onClick={() => setFieldsOpen((o) => !o)}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300 hover:border-orange-400 hover:text-orange-300"
        >
          <Database className="size-3.5" />
          Fields
        </button>

        {fieldsOpen && (
          <div className="absolute inset-x-1.5 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-lg border border-slate-700 bg-[#0b1220] p-1 shadow-2xl">
            <p className="px-2 py-1 text-[10px] text-slate-500">
              Click to insert at cursor
            </p>
            {BINDING_OPTIONS.map((o: FieldOption) => (
              <button
                key={o.value}
                type="button"
                onClick={() => insert(tokenFor(o.value, language))}
                className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs text-slate-300 hover:bg-slate-800"
              >
                <span>{o.label}</span>
                <code className="truncate text-[10px] text-orange-300">
                  {tokenFor(o.value, language)}
                </code>
              </button>
            ))}
            <button
              type="button"
              onClick={() =>
                insert(isReact ? LOOP_SNIPPET.react : LOOP_SNIPPET.html)
              }
              className="mt-1 w-full rounded-md border border-dashed border-slate-700 px-2 py-1.5 text-left text-xs text-slate-300 hover:border-orange-400"
            >
              Gallery loop (all images)
            </button>
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <Monaco
          path={cfg.file}
          language={cfg.monaco}
          theme="riwa-dark"
          value={value}
          onChange={(v) => onChange(v ?? "")}
          beforeMount={beforeMount}
          onMount={(ed: EditorInstance) => {
            editorRef.current = ed;
          }}
          options={{
            minimap: { enabled: false },
            fontSize: 12.5,
            lineHeight: 20,
            fontFamily: "ui-monospace, 'JetBrains Mono', Menlo, monospace",
            fontLigatures: true,
            tabSize: 2,
            wordWrap: "on",
            automaticLayout: true,
            scrollBeyondLastLine: false,
            padding: { top: 12, bottom: 12 },
            bracketPairColorization: { enabled: true },
            formatOnPaste: true,
            smoothScrolling: true,
            renderLineHighlight: "all",
            scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
          }}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sandboxed preview. HTML/CSS: no scripts. JSX/TSX: isolated origin.          */
/* -------------------------------------------------------------------------- */

const esc = (s: string) => s.replace(/<\/script/gi, "<\\/script");

export function buildPreviewDoc(
  lang: CodeLang,
  code: string,
  css = "",
  data: InvitationData = EMPTY_DATA,
): string {
  const reset = `<style>html,body{margin:0;font-family:ui-sans-serif,system-ui,sans-serif}${css.replace(/<\/style/gi, "")}</style>`;
  const height = `<script>const s=()=>parent.postMessage({__riwaH:document.documentElement.scrollHeight},"*");new ResizeObserver(s).observe(document.documentElement);addEventListener("load",s)</script>`;

  if (lang === "html") {
    const html = resolveText(code, data, true);
    return `<!doctype html><html><head>${reset}</head><body>${esc(html)}${height}</body></html>`;
  }
  if (lang === "css") {
    const styles = resolveText(code, data, false);
    return `<!doctype html><html><head>${reset}<style>${styles.replace(/<\/style/gi, "")}</style></head><body><div class="preview">CSS preview</div>${height}</body></html>`;
  }

  // JSX / TSX — inject `data` once (resolver may already have done it)
  let src = code.includes(DATA_MARK) ? code : injectReactData(code, data);
  src = src.replace(/import\s+.*?from\s+['"].*?['"];?/g, "");
  src = src.replace(/["']use client["'];?/g, "");
  src = src.replace(/export\s+default\s+function\s+(\w+)/g, "function $1");

  if (/export\s+default\s+App;?/.test(src)) {
    src = src.replace(/export\s+default\s+App;?/g, "");
  } else {
    src = src.replace(/export\s+default\s+(\w+);?/g, "const App = $1;");
  }

  const preset = lang === "tsx" ? "typescript,react" : "react";

  return `<!doctype html><html><head>${reset}
<script>
  window.onerror = function(message) {
    document.getElementById('root').innerHTML = \`<div style="color: #991b1b; padding: 20px; font-family: monospace; background: #fee2e2; border: 1px solid #f87171; border-radius: 8px; margin: 20px;"><h3 style="margin-top: 0; font-size: 14px;">Syntax Error</h3><pre style="white-space: pre-wrap; font-size: 12px; margin: 0;">\${message}</pre></div>\`;
    return true;
  };
</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.26.4/babel.min.js"></script></head>
<body><div id="root"></div>
<script type="text/babel" data-presets="${preset}">
  const { useState, useEffect, useRef, useMemo, useCallback } = React;
  ${esc(src)}
  if (typeof App !== "undefined") {
    ReactDOM.createRoot(document.getElementById("root")).render(<App data={data} />);
  }
</script>${height}</body></html>`;
}

export type CodePreviewProps = {
  lang: CodeLang;
  code: string;
  css?: string;
  data?: InvitationData;
};

export function CodePreview({ lang, code, css, data }: CodePreviewProps) {
  const ref = React.useRef<HTMLIFrameElement>(null);
  const [h, setH] = React.useState(160);

  React.useEffect(() => {
    const on = (e: MessageEvent) => {
      const payload = e.data as { __riwaH?: unknown } | null;
      if (
        e.source === ref.current?.contentWindow &&
        typeof payload?.__riwaH === "number"
      ) {
        setH(Math.min(Math.max(payload.__riwaH, 60), 5000));
      }
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, []);

  const doc = React.useMemo(
    () => buildPreviewDoc(lang, code, css, data ?? EMPTY_DATA),
    [lang, code, css, data],
  );

  return (
    <iframe
      ref={ref}
      title="Custom code preview"
      srcDoc={doc}
      sandbox={lang === "jsx" || lang === "tsx" ? "allow-scripts" : ""}
      style={{ width: "100%", height: h, border: 0, display: "block" }}
    />
  );
}