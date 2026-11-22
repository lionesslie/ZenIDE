import { useEffect, useRef } from "react";
import * as monaco from "monaco-editor";
import { initVimMode, type VimMode } from "monaco-vim";
import { useStore } from "../store";
import { getModel, getModelPath, viewStates } from "../editor/models";
import { setActiveEditor } from "../editor/editorService";
import { lspManager } from "../lsp/LspManager";
import { baseName, pathKey } from "../utils/path";
import { runAction } from "../actions";
import { CloseIcon, FileIcon, PlusIcon } from "./Icons";
import { Welcome } from "./Welcome";

export function EditorArea() {
  const openFiles = useStore((state) => state.openFiles);
  const activeFile = useStore((state) => state.activeFile);
  const editorConfig = useStore((state) => state.config.editor);
  const breakpoints = useStore((state) => state.breakpoints);
  const debugActive = useStore((state) => state.debugActive);
  const debugPaused = useStore((state) => state.debugPaused);
  const debugFrames = useStore((state) => state.debugFrames);
  const debugSelectedFrame = useStore((state) => state.debugSelectedFrame);
  const pendingReveal = useStore((state) => state.pendingReveal);
  const lspStatus = useStore((state) => state.lspStatus);

  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const vimRef = useRef<VimMode | null>(null);
  const vimStatusRef = useRef<HTMLDivElement>(null);
  const breakpointDecorations = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const debugDecorations = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const previousPath = useRef<string | null>(null);
  const outlineTimer = useRef<number | null>(null);

  const scheduleOutline = (path: string | null) => {
    if (outlineTimer.current) window.clearTimeout(outlineTimer.current);
    if (!path) {
      useStore.getState().setOutline([]);
      return;
    }
    outlineTimer.current = window.setTimeout(() => {
      outlineTimer.current = null;
      const state = useStore.getState();
      if (!state.activeFile || pathKey(state.activeFile) !== pathKey(path)) return;
      void lspManager.documentSymbols(path).then((symbols) => {
        const current = useStore.getState().activeFile;
        if (current && pathKey(current) === pathKey(path)) {
          useStore.getState().setOutline(symbols);
        }
      });
    }, 900);
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const config = useStore.getState().config.editor;
    const editor = monaco.editor.create(containerRef.current, {
      model: null,
      theme: "zen-dark",
      automaticLayout: true,
      fontSize: config.font_size,
      fontFamily: `"${config.font_family.replace(/"/g, "")}", "Cascadia Code", Consolas, monospace`,
      fontLigatures: true,
      tabSize: config.tab_size,
      insertSpaces: true,
      wordWrap: config.word_wrap ? "on" : "off",
      minimap: { enabled: config.minimap },
      lineNumbers: config.line_numbers ? "on" : "off",
      glyphMargin: true,
      folding: true,
      renderWhitespace: "selection",
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      cursorBlinking: "smooth",
      cursorSmoothCaretAnimation: "on",
      bracketPairColorization: { enabled: true },
      guides: { bracketPairs: true, indentation: true },
      padding: { top: 8 },
      fixedOverflowWidgets: true,
      mouseWheelZoom: true,
      stickyScroll: { enabled: false },
    });

    editorRef.current = editor;
    breakpointDecorations.current = editor.createDecorationsCollection([]);
    debugDecorations.current = editor.createDecorationsCollection([]);
    setActiveEditor(editor);

    editor.onDidChangeModelContent(() => {
      const model = editor.getModel();
      const path = getModelPath(model);
      if (!path) return;
      useStore.getState().markDirty(path);
      lspManager.didChange(path);
      scheduleOutline(path);
    });

    editor.onDidChangeCursorPosition((event) => {
      useStore
        .getState()
        .setCursor(event.position.lineNumber, event.position.column);
    });

    editor.onMouseDown((event) => {
      if (
        event.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN ||
        event.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS
      ) {
        const line = event.target.position?.lineNumber;
        const path = getModelPath(editor.getModel());
        if (line && path) {
          useStore.getState().toggleBreakpoint(path, line);
        }
      }
    });

    const ctrl = monaco.KeyMod.CtrlCmd;
    editor.addCommand(ctrl | monaco.KeyCode.KeyS, () => {
      void useStore.getState().saveActive();
    });
    editor.addCommand(ctrl | monaco.KeyMod.Shift | monaco.KeyCode.KeyS, () => {
      void useStore.getState().saveAll();
    });
    editor.addCommand(ctrl | monaco.KeyCode.KeyW, () => {
      void useStore.getState().closeActive();
    });
    editor.addCommand(ctrl | monaco.KeyCode.KeyP, () => {
      useStore.getState().setQuickOpenOpen(true);
    });
    editor.addCommand(ctrl | monaco.KeyMod.Shift | monaco.KeyCode.KeyM, () => {
      useStore.getState().setBottomTab("problems");
    });
    editor.addCommand(ctrl | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
      useStore.getState().setSidebarView("search");
    });
    editor.addCommand(ctrl | monaco.KeyMod.Shift | monaco.KeyCode.KeyB, () => {
      void runAction("build");
    });
    editor.addCommand(monaco.KeyCode.F5, () => {
      void runAction("debug");
    });
    editor.addCommand(ctrl | monaco.KeyCode.Backquote, () => {
      useStore.getState().toggleBottom("terminal");
    });

    return () => {
      if (outlineTimer.current) window.clearTimeout(outlineTimer.current);
      vimRef.current?.dispose();
      vimRef.current = null;
      setActiveEditor(null);
      editor.dispose();
      editorRef.current = null;
    };
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const previous = previousPath.current;
    if (previous && previous !== activeFile) {
      viewStates.set(pathKey(previous), editor.saveViewState());
    }
    if (!activeFile) {
      editor.setModel(null);
      previousPath.current = null;
      useStore.getState().setOutline([]);
      return;
    }
    const model = getModel(activeFile);
    if (!model) return;
    if (editor.getModel() !== model) {
      editor.setModel(model);
      useStore.getState().setOutline([]);
      const state = viewStates.get(pathKey(activeFile));
      if (state) editor.restoreViewState(state);
    }
    editor.focus();
    previousPath.current = activeFile;
    scheduleOutline(activeFile);
  }, [activeFile]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.updateOptions({
      fontSize: editorConfig.font_size,
      fontFamily: `"${editorConfig.font_family.replace(/"/g, "")}", "Cascadia Code", Consolas, monospace`,
      tabSize: editorConfig.tab_size,
      wordWrap: editorConfig.word_wrap ? "on" : "off",
      minimap: { enabled: editorConfig.minimap },
      lineNumbers: editorConfig.line_numbers ? "on" : "off",
    });
  }, [editorConfig]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (editorConfig.vim_mode) {
      if (!vimRef.current) {
        vimRef.current = initVimMode(editor, vimStatusRef.current);
      }
    } else if (vimRef.current) {
      vimRef.current.dispose();
      vimRef.current = null;
    }
  }, [editorConfig.vim_mode]);

  useEffect(() => {
    if (!activeFile) return;
    const file = openFiles.find(
      (item) => pathKey(item.path) === pathKey(activeFile)
    );
    if (file && lspStatus[file.language] === "ready") {
      scheduleOutline(activeFile);
    }
  }, [lspStatus, activeFile, openFiles]);

  useEffect(() => {
    const collection = breakpointDecorations.current;
    if (!collection || !activeFile) {
      collection?.clear();
      return;
    }
    const key = pathKey(activeFile);
    const decorations = breakpoints
      .filter((breakpoint) => pathKey(breakpoint.path) === key)
      .map((breakpoint) => ({
        range: new monaco.Range(breakpoint.line, 1, breakpoint.line, 1),
        options: {
          isWholeLine: true,
          glyphMarginClassName: "breakpoint-glyph",
          linesDecorationsClassName: "breakpoint-lines",
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
      }));
    collection.set(decorations);
  }, [breakpoints, activeFile]);

  useEffect(() => {
    const collection = debugDecorations.current;
    if (!collection || !activeFile || !debugActive || !debugPaused) {
      collection?.clear();
      return;
    }
    const frame = debugFrames.find(
      (item) => item.id === debugSelectedFrame
    ) ?? debugFrames[0];
    if (!frame || !frame.file || !frame.line) {
      collection.clear();
      return;
    }
    if (pathKey(frame.file) !== pathKey(activeFile)) {
      collection.clear();
      return;
    }
    collection.set([
      {
        range: new monaco.Range(frame.line, 1, frame.line, 1),
        options: {
          isWholeLine: true,
          className: "debug-current-line",
          glyphMarginClassName: "debug-current-arrow",
        },
      },
    ]);
  }, [debugActive, debugPaused, debugFrames, debugSelectedFrame, activeFile]);

  useEffect(() => {
    if (!pendingReveal || !activeFile) return;
    if (pathKey(pendingReveal.path) !== pathKey(activeFile)) return;
    const editor = editorRef.current;
    if (!editor) return;
    const line = Math.max(1, pendingReveal.line);
    const column = Math.max(1, pendingReveal.column);
    editor.revealLineInCenter(line, monaco.editor.ScrollType.Smooth);
    editor.setPosition({ lineNumber: line, column });
    editor.focus();
    useStore.getState().clearPendingReveal();
  }, [pendingReveal, activeFile]);

  return (
    <div className="editor-area">
      <div className="tabbar">
        <div className="tabs">
          {openFiles.map((file) => (
            <div
              key={file.path}
              className={`tab ${
                activeFile && pathKey(activeFile) === pathKey(file.path)
                  ? "active"
                  : ""
              }`}
              title={file.path}
              onClick={() => useStore.getState().setActiveFile(file.path)}
              onAuxClick={(event) => {
                if (event.button === 1) {
                  void useStore.getState().closeFile(file.path);
                }
              }}
            >
              <span className="tab-icon">
                <FileIcon size={12} />
              </span>
              <span className="tab-name">{baseName(file.path)}</span>
              {file.dirty && <span className="tab-dirty" />}
              <button
                className="tab-close"
                title="Kapat"
                onClick={(event) => {
                  event.stopPropagation();
                  void useStore.getState().closeFile(file.path);
                }}
              >
                <CloseIcon size={11} />
              </button>
            </div>
          ))}
        </div>
        <button
          className="icon-button small tab-quick-open"
          title="Quick Open (Ctrl+P)"
          onClick={() => useStore.getState().setQuickOpenOpen(true)}
        >
          <PlusIcon size={13} />
        </button>
      </div>
      <div className="editor-body">
        <div
          ref={containerRef}
          className={`monaco-host ${activeFile ? "" : "hidden"}`}
        />
        {!activeFile && <Welcome />}
      </div>
      <div
        className="vim-status"
        ref={vimStatusRef}
        style={{ display: editorConfig.vim_mode ? "block" : "none" }}
      />
    </div>
  );
}
