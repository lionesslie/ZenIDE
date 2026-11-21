import * as monaco from "monaco-editor";
import { lspManager, rangeToMonaco } from "./LspManager";
import { getModelPath } from "../editor/models";
import { pathToUri } from "../utils/path";

const LANGUAGES = ["rust", "cpp", "python"];
let registered = false;

const completionKinds: Record<number, monaco.languages.CompletionItemKind> = {
  1: monaco.languages.CompletionItemKind.Text,
  2: monaco.languages.CompletionItemKind.Method,
  3: monaco.languages.CompletionItemKind.Function,
  4: monaco.languages.CompletionItemKind.Constructor,
  5: monaco.languages.CompletionItemKind.Field,
  6: monaco.languages.CompletionItemKind.Variable,
  7: monaco.languages.CompletionItemKind.Class,
  8: monaco.languages.CompletionItemKind.Interface,
  9: monaco.languages.CompletionItemKind.Module,
  10: monaco.languages.CompletionItemKind.Property,
  11: monaco.languages.CompletionItemKind.Unit,
  12: monaco.languages.CompletionItemKind.Value,
  13: monaco.languages.CompletionItemKind.Enum,
  14: monaco.languages.CompletionItemKind.Keyword,
  15: monaco.languages.CompletionItemKind.Snippet,
  16: monaco.languages.CompletionItemKind.Color,
  17: monaco.languages.CompletionItemKind.File,
  18: monaco.languages.CompletionItemKind.Reference,
  19: monaco.languages.CompletionItemKind.Folder,
  20: monaco.languages.CompletionItemKind.EnumMember,
  21: monaco.languages.CompletionItemKind.Constant,
  22: monaco.languages.CompletionItemKind.Struct,
  23: monaco.languages.CompletionItemKind.Event,
  24: monaco.languages.CompletionItemKind.Operator,
  25: monaco.languages.CompletionItemKind.TypeParameter,
};

function documentParams(model: monaco.editor.ITextModel) {
  const path = getModelPath(model);
  if (!path) return null;
  return { path, uri: pathToUri(path) };
}

function documentationOf(item: any): string | monaco.IMarkdownString | undefined {
  if (!item) return undefined;
  if (typeof item === "string") return item;
  if (typeof item.value === "string") return { value: item.value };
  return undefined;
}

function markdownContents(contents: any): monaco.IMarkdownString[] {
  const parts = Array.isArray(contents) ? contents : [contents];
  const result: monaco.IMarkdownString[] = [];
  for (const part of parts) {
    if (part == null) continue;
    if (typeof part === "string") {
      result.push({ value: part });
    } else if (typeof part.value === "string") {
      if (typeof part.language === "string" && part.value) {
        result.push({
          value: "```" + part.language + "\n" + part.value + "\n```",
        });
      } else {
        result.push({ value: part.value });
      }
    }
  }
  return result;
}

function locationToMonaco(location: any): monaco.languages.Location | null {
  if (!location) return null;
  const uri = location.targetUri ?? location.uri;
  const range = location.targetSelectionRange ?? location.range;
  if (!uri || !range) return null;
  try {
    return { uri: monaco.Uri.parse(uri), range: rangeToMonaco(range) };
  } catch {
    return null;
  }
}

function rangeToLsp(range: monaco.IRange) {
  return {
    start: {
      line: range.startLineNumber - 1,
      character: range.startColumn - 1,
    },
    end: {
      line: range.endLineNumber - 1,
      character: range.endColumn - 1,
    },
  };
}

function markerToDiagnostic(marker: monaco.editor.IMarker): any {
  const severity =
    marker.severity === monaco.MarkerSeverity.Error
      ? 1
      : marker.severity === monaco.MarkerSeverity.Warning
        ? 2
        : marker.severity === monaco.MarkerSeverity.Info
          ? 3
          : 4;
  return {
    range: rangeToLsp(marker),
    severity,
    message: marker.message,
    source: marker.source,
    code: marker.code,
  };
}

function workspaceEditToMonaco(
  edit: any
): monaco.languages.WorkspaceEdit | undefined {
  const result: monaco.languages.WorkspaceEdit = { edits: [] };
  const add = (uri: string, edits: any[]) => {
    if (!uri || !Array.isArray(edits)) return;
    const resource = monaco.Uri.parse(uri);
    for (const item of edits) {
      if (!item?.range) continue;
      result.edits.push({
        resource,
        versionId: undefined,
        textEdit: {
          range: rangeToMonaco(item.range),
          text: item.newText ?? "",
        },
      });
    }
  };
  if (edit?.changes) {
    for (const [uri, edits] of Object.entries(edit.changes)) {
      add(uri, edits as any[]);
    }
  }
  if (Array.isArray(edit?.documentChanges)) {
    for (const change of edit.documentChanges) {
      if (change?.textDocument?.uri) {
        add(change.textDocument.uri, change.edits ?? []);
      }
    }
  }
  return result.edits.length > 0 ? result : undefined;
}

function convertDocumentSymbol(
  item: any
): monaco.languages.DocumentSymbol | null {
  if (!item) return null;
  const range = item.range ?? item.location?.range;
  const selectionRange = item.selectionRange ?? range;
  if (!range || !selectionRange) return null;
  const children = Array.isArray(item.children)
    ? (item.children
        .map(convertDocumentSymbol)
        .filter(Boolean) as monaco.languages.DocumentSymbol[])
    : undefined;
  return {
    name: item.name ?? "?",
    detail: item.detail ?? "",
    kind: Math.max(0, (item.kind ?? 1) - 1) as monaco.languages.SymbolKind,
    tags: [],
    range: rangeToMonaco(range),
    selectionRange: rangeToMonaco(selectionRange),
    children,
  };
}

export function registerLspProviders(): void {
  if (registered) return;
  registered = true;

  monaco.editor.registerCommand(
    "zenide.lspExecuteCommand",
    (_accessor, path: string, command: any) => {
      if (!path || !command?.command) return;
      void lspManager
        .request(path, "workspace/executeCommand", {
          command: command.command,
          arguments: command.arguments ?? [],
        })
        .then(async (result) => {
          if (result) await lspManager.applyWorkspaceEdit(result);
        });
    }
  );

  monaco.languages.registerCompletionItemProvider(LANGUAGES, {
    triggerCharacters: [".", ":", "<", '"', "'", "/", "@", ">", "("],
    provideCompletionItems: async (model, position, context) => {
      const doc = documentParams(model);
      if (!doc) return { suggestions: [] };
      const result = await lspManager.request(
        doc.path,
        "textDocument/completion",
        {
          textDocument: { uri: doc.uri },
          position: {
            line: position.lineNumber - 1,
            character: position.column - 1,
          },
          context: {
            triggerKind: context.triggerKind,
            triggerCharacter: context.triggerCharacter,
          },
        }
      );
      if (!result) return { suggestions: [] };
      const items: any[] = Array.isArray(result)
        ? result
        : result.items ?? [];
      const word = model.getWordUntilPosition(position);
      const defaultRange = {
        startLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endLineNumber: position.lineNumber,
        endColumn: word.endColumn,
      };
      const suggestions: monaco.languages.CompletionItem[] = [];
      for (const item of items) {
        if (!item) continue;
        const label =
          typeof item.label === "string"
            ? item.label
            : item.label?.label ?? item.insertText ?? "?";
        const text =
          item.textEdit?.newText ??
          item.insertText ??
          (typeof item.label === "string" ? item.label : item.label?.label) ??
          "";
        const textEditRange = item.textEdit?.range;
        const suggestion: monaco.languages.CompletionItem = {
          label,
          kind:
            completionKinds[item.kind as number] ??
            monaco.languages.CompletionItemKind.Text,
          insertText: text,
          detail: item.detail,
          documentation: documentationOf(item.documentation),
          sortText: item.sortText,
          filterText: item.filterText,
          preselect: item.preselect,
          range: textEditRange
            ? (rangeToMonaco(
                textEditRange.insert ?? textEditRange
              ) as monaco.IRange)
            : (defaultRange as monaco.IRange),
          insertTextRules:
            item.insertTextFormat === 2
              ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              : undefined,
        };
        if (Array.isArray(item.additionalTextEdits)) {
          suggestion.additionalTextEdits = item.additionalTextEdits.map(
            (edit: any) => ({
              range: rangeToMonaco(edit.range),
              text: edit.newText,
            })
          );
        }
        suggestions.push(suggestion);
      }
      return {
        suggestions,
        incomplete: Boolean(result.isIncomplete),
      };
    },
  });

  monaco.languages.registerHoverProvider(LANGUAGES, {
    provideHover: async (model, position) => {
      const doc = documentParams(model);
      if (!doc) return null;
      const result = await lspManager.request(doc.path, "textDocument/hover", {
        textDocument: { uri: doc.uri },
        position: {
          line: position.lineNumber - 1,
          character: position.column - 1,
        },
      });
      if (!result || !result.contents) return null;
      const contents = markdownContents(result.contents);
      if (contents.length === 0) return null;
      return {
        contents,
        range: result.range ? rangeToMonaco(result.range) : undefined,
      };
    },
  });

  monaco.languages.registerDefinitionProvider(LANGUAGES, {
    provideDefinition: async (model, position) => {
      const doc = documentParams(model);
      if (!doc) return null;
      const result = await lspManager.request(
        doc.path,
        "textDocument/definition",
        {
          textDocument: { uri: doc.uri },
          position: {
            line: position.lineNumber - 1,
            character: position.column - 1,
          },
        }
      );
      if (!result) return null;
      const locations = Array.isArray(result) ? result : [result];
      const converted = locations
        .map(locationToMonaco)
        .filter(Boolean) as monaco.languages.Location[];
      return converted.length > 0 ? converted : null;
    },
  });

  monaco.languages.registerRenameProvider(LANGUAGES, {
    resolveRenameLocation: async (model, position) => {
      const word = model.getWordAtPosition(position);
      if (!word) return null;
      return {
        range: new monaco.Range(
          position.lineNumber,
          word.startColumn,
          position.lineNumber,
          word.endColumn
        ),
        text: word.word,
      };
    },
    provideRenameEdits: async (model, position, newName) => {
      const doc = documentParams(model);
      if (!doc) return { edits: [] };
      const result = await lspManager.request(
        doc.path,
        "textDocument/rename",
        {
          textDocument: { uri: doc.uri },
          position: {
            line: position.lineNumber - 1,
            character: position.column - 1,
          },
          newName,
        }
      );
      if (result) {
        await lspManager.applyWorkspaceEdit(result);
      }
      return { edits: [] };
    },
  });

  monaco.languages.registerReferenceProvider(LANGUAGES, {
    provideReferences: async (model, position, context) => {
      const doc = documentParams(model);
      if (!doc) return null;
      const result = await lspManager.request(
        doc.path,
        "textDocument/references",
        {
          textDocument: { uri: doc.uri },
          position: {
            line: position.lineNumber - 1,
            character: position.column - 1,
          },
          context: { includeDeclaration: context.includeDeclaration },
        }
      );
      if (!Array.isArray(result)) return null;
      const converted = result
        .map(locationToMonaco)
        .filter(Boolean) as monaco.languages.Location[];
      return converted.length > 0 ? converted : null;
    },
  });

  monaco.languages.registerDocumentSymbolProvider(LANGUAGES, {
    provideDocumentSymbols: async (model) => {
      const doc = documentParams(model);
      if (!doc) return [];
      const result = await lspManager.request(
        doc.path,
        "textDocument/documentSymbol",
        { textDocument: { uri: doc.uri } }
      );
      if (!Array.isArray(result)) return [];
      return result
        .map(convertDocumentSymbol)
        .filter(Boolean) as monaco.languages.DocumentSymbol[];
    },
  });

  monaco.languages.registerCodeActionProvider(
    LANGUAGES,
    {
      provideCodeActions: async (model, range, context) => {
        const doc = documentParams(model);
        if (!doc) return { actions: [], dispose: () => undefined };
        const result = await lspManager.request(
          doc.path,
          "textDocument/codeAction",
          {
            textDocument: { uri: doc.uri },
            range: rangeToLsp(range),
            context: {
              diagnostics: context.markers.map(markerToDiagnostic),
              only: context.only ? [context.only] : undefined,
            },
          }
        );
        if (!Array.isArray(result)) {
          return { actions: [], dispose: () => undefined };
        }
        const actions: monaco.languages.CodeAction[] = [];
        for (const item of result) {
          if (!item?.title) continue;
          const action: monaco.languages.CodeAction = {
            title: item.title,
            kind: item.kind,
            isPreferred: item.isPreferred,
            disabled: item.disabled?.reason,
          };
          if (item.edit) {
            action.edit = workspaceEditToMonaco(item.edit);
          }
          if (item.command?.command) {
            action.command = {
              id: "zenide.lspExecuteCommand",
              title: item.command.title ?? item.title,
              arguments: [doc.path, item.command],
            };
          }
          if (action.edit || action.command) actions.push(action);
        }
        return { actions, dispose: () => undefined };
      },
    },
    {
      providedCodeActionKinds: ["quickfix", "refactor", "source"],
    }
  );

  monaco.languages.registerDocumentFormattingEditProvider(LANGUAGES, {
    provideDocumentFormattingEdits: async (model, options) => {
      const doc = documentParams(model);
      if (!doc) return [];
      const result = await lspManager.request(
        doc.path,
        "textDocument/formatting",
        {
          textDocument: { uri: doc.uri },
          options: {
            tabSize: options.tabSize,
            insertSpaces: options.insertSpaces,
          },
        }
      );
      if (!Array.isArray(result)) return [];
      return result.map((edit: any) => ({
        range: rangeToMonaco(edit.range),
        text: edit.newText,
      }));
    },
  });
}
