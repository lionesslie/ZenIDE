import * as monaco from "monaco-editor";

let registered = false;

export function registerExtraLanguages(): void {
  if (registered) return;
  registered = true;

  monaco.languages.register({ id: "toml", extensions: [".toml"] });
  monaco.languages.setLanguageConfiguration("toml", {
    comments: { lineComment: "#" },
    brackets: [
      ["[", "]"],
      ["{", "}"],
      ["(", ")"],
    ],
    autoClosingPairs: [
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: "[", close: "]" },
      { open: "{", close: "}" },
      { open: "(", close: ")" },
    ],
  });
  monaco.languages.setMonarchTokensProvider("toml", {
    tokenizer: {
      root: [
        [/#.*$/, "comment"],
        [/^\s*\[\[?[^\]]*\]\]?\s*$/, "keyword"],
        [/[A-Za-z0-9_.-]+(?=\s*=)/, "type.identifier"],
        [/"/, { token: "string", next: "@basicString" }],
        [/'/, { token: "string", next: "@literalString" }],
        [/\b(true|false)\b/, "keyword"],
        [/\b\d{4}-\d{2}-\d{2}([Tt ].*)?\b/, "number"],
        [/\b\d+(\.\d+)?([eE][+-]?\d+)?\b/, "number"],
        [/[{}[\],=]/, "delimiter"],
      ],
      basicString: [
        [/[^"\\]+/, "string"],
        [/\\./, "string.escape"],
        [/"/, { token: "string", next: "@pop" }],
      ],
      literalString: [
        [/[^']+/, "string"],
        [/'/, { token: "string", next: "@pop" }],
      ],
    },
  });

  monaco.languages.register({ id: "cmake", extensions: [".cmake"] });
  monaco.languages.setLanguageConfiguration("cmake", {
    comments: { lineComment: "#" },
    brackets: [
      ["(", ")"],
    ],
    autoClosingPairs: [
      { open: "(", close: ")" },
      { open: '"', close: '"' },
    ],
  });
  monaco.languages.setMonarchTokensProvider("cmake", {
    tokenizer: {
      root: [
        [/#.*$/, "comment"],
        [/\b(cmake_minimum_required|project|add_executable|add_library|target_link_libraries|target_include_directories|set|find_package|include_directories|add_subdirectory|if|elseif|else|endif|foreach|endforeach|function|endfunction|macro|endmacro)\b/i, "keyword"],
        [/\$\{[^}]*\}/, "variable"],
        [/"[^"]*"/, "string"],
        [/\b(ON|OFF|TRUE|FALSE)\b/i, "keyword"],
        [/\b\d+(\.\d+)*\b/, "number"],
        [/[()]/, "delimiter"],
      ],
    },
  });
}
