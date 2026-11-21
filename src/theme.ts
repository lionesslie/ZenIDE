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
      { token: "comment", foreground: "6a737d", fontStyle: "italic" },
      { token: "keyword", foreground: "cf8e6d" },
      { token: "keyword.control", foreground: "cf8e6d" },
      { token: "string", foreground: "6aab73" },
      { token: "string.escape", foreground: "d9a56b" },
      { token: "number", foreground: "2aacb8" },
      { token: "regexp", foreground: "56a8f5" },
      { token: "type", foreground: "b5cea8" },
      { token: "type.identifier", foreground: "b5cea8" },
      { token: "identifier", foreground: theme.text.replace("#", "") },
      { token: "delimiter", foreground: "8f949e" },
      { token: "operator", foreground: "bcbec4" },
      { token: "tag", foreground: "4a88ff" },
      { token: "attribute.name", foreground: "cf8e6d" },
    ],
    colors: {
      "editor.background": theme.editor_background,
      "editor.foreground": theme.text,
      "editorLineNumber.foreground": "#4b5059",
      "editorLineNumber.activeForeground": "#a1a7b3",
      "editor.selectionBackground": "#2b4b7a",
      "editor.inactiveSelectionBackground": "#27364a",
      "editor.lineHighlightBackground": "#26282c",
      "editor.lineHighlightBorder": "#00000000",
      "editorCursor.foreground": "#d4d4d4",
      "editorIndentGuide.background1": "#303236",
      "editorIndentGuide.activeBackground1": "#43464c",
      "editorGutter.background": theme.editor_background,
      "editorGutter.addedBackground": "#487e4f",
      "editorGutter.modifiedBackground": "#8f7b4a",
      "editorGutter.deletedBackground": "#a34a4a",
      "editorWidget.background": theme.panel,
      "editorWidget.border": theme.border,
      "editorSuggestWidget.background": theme.panel,
      "editorSuggestWidget.border": theme.border,
      "editorSuggestWidget.selectedBackground": "#2e436e",
      "editorSuggestWidget.highlightForeground": theme.accent,
      "editorHoverWidget.background": theme.panel,
      "editorHoverWidget.border": theme.border,
      "editor.findMatchBackground": "#3a5a8a",
      "editor.findMatchHighlightBackground": "#2a4566",
      "editorBracketMatch.background": "#2f3a4a",
      "editorBracketMatch.border": "#4a88ff",
      "scrollbarSlider.background": "#3a3d4380",
      "scrollbarSlider.hoverBackground": "#4a4d5480",
      "scrollbarSlider.activeBackground": "#5a5d6480",
      "minimap.background": theme.editor_background,
      "editorOverviewRuler.border": "#00000000",
      "editorOverviewRuler.addedForeground": "#487e4f",
      "editorOverviewRuler.modifiedForeground": "#8f7b4a",
      "editorOverviewRuler.deletedForeground": "#a34a4a",
      "editorError.foreground": "#e5484d",
      "editorWarning.foreground": "#d6a44a",
      "editorInfo.foreground": "#4a88ff",
      "menu.background": theme.panel,
      "menu.foreground": theme.text,
      "menu.selectionBackground": "#2e436e",
      "menu.border": theme.border,
    },
  });
  monaco.editor.setTheme("zen-dark");
}
