import * as monaco from "monaco-editor";
import type {
  EditorConfig,
  ExplorerConfig,
  ThemeConfig,
  UiConfig,
} from "./types";

function parseHex(value: string): [number, number, number] | null {
  const hex = value.trim();
  const short = /^#([0-9a-f]{3})$/i.exec(hex);
  if (short) {
    const [r, g, b] = short[1].split("");
    return [
      parseInt(r + r, 16),
      parseInt(g + g, 16),
      parseInt(b + b, 16),
    ];
  }
  const full = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!full) return null;
  const raw = full[1];
  return [
    parseInt(raw.slice(0, 2), 16),
    parseInt(raw.slice(2, 4), 16),
    parseInt(raw.slice(4, 6), 16),
  ];
}

function withAlpha(value: string, alpha: number): string {
  const rgb = parseHex(value);
  if (!rgb) return value;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

function lighten(value: string, amount: number): string {
  const rgb = parseHex(value);
  if (!rgb) return value;
  const mixed = rgb.map((channel) =>
    Math.round(channel + (255 - channel) * amount)
  );
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function alphaSuffix(value: string, suffix: string): string {
  return /^#[0-9a-f]{6}$/i.test(value.trim()) ? `${value.trim()}${suffix}` : value;
}

export function applyTheme(theme: ThemeConfig): void {
  const root = document.documentElement;
  const surfaceSolid = theme.panel;
  const surface2Solid = lighten(theme.panel, 0.07);
  root.style.setProperty("--bg", theme.background);
  root.style.setProperty("--surface-solid", surfaceSolid);
  root.style.setProperty("--surface-2-solid", surface2Solid);
  root.style.setProperty("--surface", withAlpha(surfaceSolid, 0.72));
  root.style.setProperty("--surface-2", withAlpha(surface2Solid, 0.82));
  root.style.setProperty("--border", theme.border);
  root.style.setProperty("--border-strong", withAlpha(theme.text, 0.16));
  root.style.setProperty("--text", theme.text);
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--accent-soft", withAlpha(theme.accent, 0.16));
  root.style.setProperty("--accent-strong", withAlpha(theme.accent, 0.34));
  root.style.setProperty("--active", withAlpha(theme.accent, 0.15));
  root.style.setProperty("--editor-bg", theme.editor_background);
  defineMonacoTheme(theme);
}

export function applyUiSettings(ui: UiConfig, explorer: ExplorerConfig): void {
  const root = document.documentElement;
  root.style.setProperty("--font-weight", String(ui.font_weight));
  root.style.setProperty("--explorer-font-size", `${explorer.font_size}px`);
  root.classList.toggle("no-animations", !ui.animations_enabled);
}

export function applyEditorFont(editor: EditorConfig): void {
  const family = editor.font_family.replace(/"/g, "").trim() || "JetBrains Mono";
  document.documentElement.style.setProperty(
    "--font-code",
    `"${family}", "Cascadia Code", Consolas, "Courier New", monospace`
  );
}

export function defineMonacoTheme(theme: ThemeConfig): void {
  monaco.editor.defineTheme("zen-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      // CLion / JetBrains Darcula-inspired token palette.
      // Comments.
      { token: "comment", foreground: "7a7e85", fontStyle: "italic" },
      { token: "comment.doc", foreground: "8a8f98", fontStyle: "italic" },

      // Keywords and preprocessor directives.
      { token: "keyword", foreground: "cf8e6d" },
      { token: "keyword.control", foreground: "cf8e6d" },
      { token: "keyword.operator", foreground: "cf8e6d" },
      { token: "keyword.type", foreground: "56a8f5" },
      { token: "keyword.directive", foreground: "bbb529" },
      { token: "keyword.directive.include", foreground: "bbb529" },
      { token: "keyword.directive.include.begin", foreground: "bbb529" },
      { token: "keyword.directive.include.end", foreground: "bbb529" },

      // Strings, numbers, regexes and escapes.
      { token: "string", foreground: "6aab73" },
      { token: "string.quote", foreground: "6aab73" },
      { token: "string.escape", foreground: "cf8e6d" },
      { token: "string.escape.invalid", foreground: "f44747", fontStyle: "underline" },
      { token: "string.invalid", foreground: "f44747", fontStyle: "underline" },
      { token: "string.include.identifier", foreground: "6aab73" },
      { token: "string.raw", foreground: "6aab73" },
      { token: "string.key.json", foreground: "c77dbb" },
      { token: "string.value.json", foreground: "6aab73" },
      { token: "number", foreground: "2aacb8" },
      { token: "number.float", foreground: "2aacb8" },
      { token: "number.hex", foreground: "2aacb8" },
      { token: "number.octal", foreground: "2aacb8" },
      { token: "number.binary", foreground: "2aacb8" },
      { token: "regexp", foreground: "6aab73" },

      // Types, functions, constants and ordinary identifiers.
      { token: "type", foreground: "56a8f5" },
      { token: "type.identifier", foreground: "56a8f5" },
      { token: "type.parameter", foreground: "56a8f5" },
      { token: "namespace", foreground: "56a8f5" },
      { token: "function", foreground: "ffc66d" },
      { token: "function.call", foreground: "56a8f5" },
      { token: "constant", foreground: "9876aa" },
      { token: "constant.numeric", foreground: "2aacb8" },
      { token: "identifier", foreground: "bcbec4" },
      { token: "variable", foreground: "bcbec4" },
      { token: "variable.name", foreground: "bcbec4" },
      { token: "variable.parameter", foreground: "bcbec4" },
      { token: "key", foreground: "c77dbb" },

      // Punctuation and operators.
      { token: "delimiter", foreground: "bcbec4" },
      { token: "delimiter.curly", foreground: "bcbec4" },
      { token: "delimiter.parenthesis", foreground: "bcbec4" },
      { token: "delimiter.square", foreground: "bcbec4" },
      { token: "delimiter.angle", foreground: "bcbec4" },
      { token: "operator", foreground: "bcbec4" },

      // HTML / JSX / CSS.
      { token: "tag", foreground: "bbb529" },
      { token: "tag.id", foreground: "bbb529" },
      { token: "tag.class", foreground: "bbb529" },
      { token: "attribute.name", foreground: "cf8e6d" },
      { token: "attribute.value", foreground: "6aab73" },
      { token: "metatag", foreground: "7a7e85" },
      { token: "doctype", foreground: "7a7e85" },
      { token: "annotation", foreground: "bbb529" },

      // Markdown and fallback error tokens.
      { token: "keyword.md", foreground: "cf8e6d", fontStyle: "bold" },
      { token: "string.link.md", foreground: "56a8f5", fontStyle: "underline" },
      { token: "variable.md", foreground: "bcbec4" },
      { token: "invalid", foreground: "f44747", fontStyle: "underline" },
    ],
    colors: {
      "editor.background": theme.editor_background,
      "editor.foreground": "#bcbec4",
      "editorLineNumber.foreground": "#575757",
      "editorLineNumber.activeForeground": "#d0d0d0",
      "editor.selectionBackground": alphaSuffix(theme.accent, "40"),
      "editor.inactiveSelectionBackground": alphaSuffix(theme.accent, "22"),
      "editor.lineHighlightBackground": "#ffffff08",
      "editor.lineHighlightBorder": "#00000000",
      "editorCursor.foreground": theme.accent,
      "editorIndentGuide.background1": "#242424",
      "editorIndentGuide.activeBackground1": "#3d3d3d",
      "editorGutter.background": theme.editor_background,
      "editorGutter.addedBackground": "#d0d0d0",
      "editorGutter.modifiedBackground": "#a8a8a8",
      "editorGutter.deletedBackground": "#808080",
      "editorWidget.background": theme.panel,
      "editorWidget.border": theme.border,
      "editorSuggestWidget.background": theme.panel,
      "editorSuggestWidget.border": theme.border,
      "editorSuggestWidget.selectedBackground": "#2a2a2a",
      "editorSuggestWidget.highlightForeground": theme.accent,
      "editorHoverWidget.background": theme.panel,
      "editorHoverWidget.border": theme.border,
      "editor.findMatchBackground": alphaSuffix(theme.accent, "40"),
      "editor.findMatchHighlightBackground": "#ffffff1f",
      "editorBracketMatch.background": "#ffffff14",
      "editorBracketMatch.border": theme.accent,
      "scrollbarSlider.background": "#ffffff1f",
      "scrollbarSlider.hoverBackground": "#ffffff33",
      "scrollbarSlider.activeBackground": "#ffffff47",
      "minimap.background": theme.editor_background,
      "editorOverviewRuler.border": "#00000000",
      "editorOverviewRuler.addedForeground": "#d0d0d0",
      "editorOverviewRuler.modifiedForeground": "#a8a8a8",
      "editorOverviewRuler.deletedForeground": "#808080",
      "editorError.foreground": "#f2f2f2",
      "editorWarning.foreground": "#bdbdbd",
      "editorInfo.foreground": theme.accent,
      "menu.background": theme.panel,
      "menu.foreground": theme.text,
      "menu.selectionBackground": "#2a2a2a",
      "menu.border": theme.border,
    },
  });
  monaco.editor.setTheme("zen-dark");
}
