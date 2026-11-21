import * as monaco from "monaco-editor";
import { pathKey } from "../utils/path";

const modelMap = new Map<string, monaco.editor.ITextModel>();

export const viewStates = new Map<
  string,
  monaco.editor.ICodeEditorViewState | null
>();

export function ensureModel(
  path: string,
  content: string,
  language: string
): monaco.editor.ITextModel {
  const key = pathKey(path);
  let model = modelMap.get(key);
  if (!model) {
    model = monaco.editor.createModel(content, language, monaco.Uri.file(path));
    (model as any).__zenPath = path;
    modelMap.set(key, model);
  }
  return model;
}

export function getModel(path: string): monaco.editor.ITextModel | undefined {
  return modelMap.get(pathKey(path));
}

export function getModelPath(
  model: monaco.editor.ITextModel | null | undefined
): string | undefined {
  return model ? (model as any).__zenPath : undefined;
}

export function disposeModel(path: string): void {
  const key = pathKey(path);
  const model = modelMap.get(key);
  if (model) {
    model.dispose();
    modelMap.delete(key);
  }
  viewStates.delete(key);
}

export function allModels(): monaco.editor.ITextModel[] {
  return [...modelMap.values()];
}
