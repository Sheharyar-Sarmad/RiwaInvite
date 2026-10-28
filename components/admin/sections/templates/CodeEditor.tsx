"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { BeforeMount } from "@monaco-editor/react";

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
};

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
  const cfg = LANGS.find((l) => l.id === language)!;
  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0f172a]">
      <div className="flex shrink-0 gap-1 border-b border-slate-800 bg-[#0b1220] p-1.5">
        {LANGS.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => onLanguageChange(l.id)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition ${
              language === l.id
                ? "bg-orange-500 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1">
        <Monaco
          path={cfg.file}
          language={cfg.monaco}
          theme="riwa-dark"
          value={value}
          onChange={(v) => onChange(v ?? "")}
          beforeMount={beforeMount}
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
export function buildPreviewDoc(lang: CodeLang, code: string, css = "") {
  const reset = `<style>html,body{margin:0;font-family:ui-sans-serif,system-ui,sans-serif}${css.replace(/<\/style/gi, "")}</style>`;
  const height = `<script>const s=()=>parent.postMessage({__riwaH:document.documentElement.scrollHeight},"*");new ResizeObserver(s).observe(document.documentElement);addEventListener("load",s)</script>`;
  
  if (lang === "html") return `<!doctype html><html><head>${reset}</head><body>${esc(code)}${height}</body></html>`;
  if (lang === "css") return `<!doctype html><html><head>${reset}<style>${code.replace(/<\/style/gi, "")}</style></head><body><div class="preview">CSS preview</div>${height}</body></html>`;
  
  let src = code;
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
    ReactDOM.createRoot(document.getElementById("root")).render(<App />);
  }
</script>${height}</body></html>`;
}

// THIS WAS MISSING:
export function CodePreview({ lang, code, css }: { lang: CodeLang; code: string; css?: string }) {
  const ref = React.useRef<HTMLIFrameElement>(null);
  const [h, setH] = React.useState(160);
  
  React.useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.source === ref.current?.contentWindow && typeof e.data?.__riwaH === "number") setH(Math.min(Math.max(e.data.__riwaH, 60), 5000));
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, []);
  
  const doc = React.useMemo(() => buildPreviewDoc(lang, code, css), [lang, code, css]);
  
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