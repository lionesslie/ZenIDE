declare module "monaco-vim" {
  import type * as monaco from "monaco-editor";

  export interface VimMode {
    dispose(): void;
  }

  export function initVimMode(
    editor: monaco.editor.IStandaloneCodeEditor,
    statusbarNode?: HTMLElement | null
  ): VimMode;

  export const Vim: {
    defineEx(
      name: string,
      prefix: string,
      handler: (args?: any) => void
    ): void;
    defineAction(name: string, handler: (args?: any) => void): void;
    mapCommand(keys: string, type: string, name?: string): void;
    [key: string]: any;
  };
}
