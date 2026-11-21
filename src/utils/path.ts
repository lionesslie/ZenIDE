export const isWindows =
  typeof navigator !== "undefined" && /windows/i.test(navigator.userAgent);

export function normalizePath(path: string): string {
  return path.replace(/\\/g, "/");
}

export function pathKey(path: string): string {
  const normalized = normalizePath(path);
  return isWindows ? normalized.toLowerCase() : normalized;
}

export function isSamePath(a: string, b: string): boolean {
  return pathKey(a) === pathKey(b);
}

export function isSubPath(parent: string, child: string): boolean {
  const parentKey = pathKey(parent).replace(/\/+$/, "");
  const childKey = pathKey(child);
  return childKey === parentKey || childKey.startsWith(parentKey + "/");
}

export function joinPath(base: string, name: string): string {
  if (!base) return name;
  if (base === "/") return "/" + name;
  const separator = base.includes("\\") && !base.includes("/") ? "\\" : isWindows ? "\\" : "/";
  return base.replace(/[\\/]+$/, "") + separator + name.replace(/^[\\/]+/, "");
}

export function baseName(path: string): string {
  const normalized = normalizePath(path).replace(/\/+$/, "");
  const index = normalized.lastIndexOf("/");
  return index >= 0 ? normalized.slice(index + 1) : normalized;
}

export function dirName(path: string): string {
  const trimmed = path.replace(/[\\/]+$/, "");
  const index = Math.max(trimmed.lastIndexOf("\\"), trimmed.lastIndexOf("/"));
  if (index <= 0) return trimmed;
  return trimmed.slice(0, index);
}

export function relativePath(root: string, path: string): string {
  const rootKey = pathKey(root).replace(/\/+$/, "");
  const normalized = normalizePath(path);
  if (pathKey(normalized).startsWith(rootKey + "/")) {
    return normalized.slice(rootKey.length + 1);
  }
  return normalized;
}

export function pathToUri(path: string): string {
  let normalized = normalizePath(path);
  if (!normalized.startsWith("/")) normalized = "/" + normalized;
  const encoded = normalized
    .split("/")
    .map((segment) => encodeURIComponent(segment).replace(/%3A/gi, ":"))
    .join("/");
  return "file://" + encoded;
}

export function uriToPath(uri: string): string {
  if (!uri.startsWith("file://")) return uri;
  let rest = decodeURIComponent(uri.slice(7));
  if (/^\/[A-Za-z]:/.test(rest)) rest = rest.slice(1);
  return isWindows ? rest.replace(/\//g, "\\") : rest;
}

export function offsetAt(text: string, line: number, character: number): number {
  let currentLine = 0;
  let index = 0;
  while (currentLine < line && index < text.length) {
    if (text[index] === "\n") currentLine++;
    index++;
  }
  return Math.min(index + character, text.length);
}
