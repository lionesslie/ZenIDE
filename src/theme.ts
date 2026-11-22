import * as monaco from "monaco-editor";
import type { EditorConfig, ThemeConfig } from "./types";

export function applyTheme(theme: ThemeConfig): void {
  const root = document.documentElement;
  root.style.setProperty("--bg", theme.background);
  root.style.setProperty("--panel", theme.panel);
  root.style.setProperty("--border", theme.border);
  root.style.setProperty("--text", theme.text);
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--editor-bg", theme.editor_background);
  defineMonacoTheme(theme);
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
      { token: "comment", foreground: "7b7b82", fontStyle: "italic" },
      { token: "keyword", foreground: "d0a184" },
      { token: "keyword.control", foreground: "d0a184" },
      { token: "string", foreground: "8fbf95" },
      { token: "string.escape", foreground: "d9a56b" },
      { token: "number", foreground: "8fc4c9" },
      { token: "regexp", foreground: "c7c7cd" },
      { token: "type", foreground: "c3d6b8" },
      { token: "type.identifier", foreground: "c3d6b8" },
      { token: "identifier", foreground: theme.text.replace("#", "") },
      { token: "delimiter", foreground: "94949b" },
      { token: "operator", foreground: "c9c9cf" },
      { token: "tag", foreground: "d9d9de" },
      { token: "attribute.name", foreground: "d0a184" },
    ],
    colors: {
      "editor.background": theme.editor_background,
      "editor.foreground": theme.text,
      "editorLineNumber.foreground": "#4c4c52",
      "editorLineNumber.activeForeground": "#b8b8be",
      "editor.selectionBackground": "#3a3a40",
      "editor.inactiveSelectionBackground": "#2a2a2f",
      "editor.lineHighlightBackground": "#1a1a1d",
      "editor.lineHighlightBorder": "#00000000",
      "editorCursor.foreground": "#e4e4e8",
      "editorIndentGuide.background1": "#2a2a2e",
      "editorIndentGuide.activeBackground1": "#3c3c42",
      "editorGutter.background": theme.editor_background,
      "editorGutter.addedBackground": "#487e4f",
      "editorGutter.modifiedBackground": "#8f7b4a",
      "editorGutter.deletedBackground": "#a34a4a",
      "editorWidget.background": theme.panel,
      "editorWidget.border": theme.border,
      "editorSuggestWidget.background": theme.panel,
      "editorSuggestWidget.border": theme.border,
      "editorSuggestWidget.selectedBackground": "#2e2e33",
      "editorSuggestWidget.highlightForeground": theme.accent,
      "editorHoverWidget.background": theme.panel,
      "editorHoverWidget.border": theme.border,
      "editor.findMatchBackground": "#3f3f45",
      "editor.findMatchHighlightBackground": "#303036",
      "editorBracketMatch.background": "#2c2c31",
      "editorBracketMatch.border": theme.accent,
      "scrollbarSlider.background": "#33333880",
      "scrollbarSlider.hoverBackground": "#43434880",
      "scrollbarSlider.activeBackground": "#53535880",
      "minimap.background": theme.editor_background,
      "editorOverviewRuler.border": "#00000000",
      "editorOverviewRuler.addedForeground": "#487e4f",
      "editorOverviewRuler.modifiedForeground": "#8f7b4a",
      "editorOverviewRuler.deletedForeground": "#a34a4a",
      "editorError.foreground": "#e5484d",
      "editorWarning.foreground": "#d6a44a",
      "editorInfo.foreground": theme.accent,
      "menu.background": theme.panel,
      "menu.foreground": theme.text,
      "menu.selectionBackground": "#2c2c31",
      "menu.border": theme.border,
    },
  });
  monaco.editor.setTheme("zen-dark");
}
