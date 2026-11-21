import type * as monaco from "monaco-editor";

let activeEditor: monaco.editor.IStandaloneCodeEditor | null = null;

export function setActiveEditor(
  editor: monaco.editor.IStandaloneCodeEditor | null
): void {
  activeEditor = editor;
}

export function getActiveEditor(): monaco.editor.IStandaloneCodeEditor | null {
  return activeEditor;
}

export async function formatActiveDocument(): Promise<void> {
  await activeEditor?.getAction("editor.action.formatDocument")?.run();
}
