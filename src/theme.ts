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
      { token: "comment", foreground: "7c7c7c", fontStyle: "italic" },
      { token: "keyword", foreground: "e8e8e8" },
      { token: "keyword.control", foreground: "e8e8e8" },
      { token: "string", foreground: "b8b8b8" },
      { token: "string.escape", foreground: "d4d4d4" },
      { token: "number", foreground: "cfcfcf" },
      { token: "regexp", foreground: "c4c4c4" },
      { token: "type", foreground: "dedede" },
      { token: "type.identifier", foreground: "dedede" },
      { token: "function", foreground: "f0f0f0" },
      { token: "constant", foreground: "c9c9c9" },
      { token: "identifier", foreground: theme.text.replace("#", "") },
      { token: "delimiter", foreground: "8a8a8a" },
      { token: "operator", foreground: "bdbdbd" },
      { token: "tag", foreground: "e0e0e0" },
      { token: "attribute.name", foreground: "c9c9c9" },
    ],
    colors: {
      "editor.background": theme.editor_background,
      "editor.foreground": theme.text,
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
