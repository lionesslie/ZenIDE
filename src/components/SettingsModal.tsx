import { useEffect, useRef, useState } from "react";
import { defaultConfig, keybindingLabels } from "../config";
import { useStore } from "../store";
import { openConfigFile } from "../actions";
import type { ZenConfig } from "../types";
import { CloseIcon } from "./Icons";

type Section =
  | "general"
  | "editor"
  | "terminal"
  | "lsp"
  | "build"
  | "debug"
  | "explorer"
  | "keys";

const sections: { id: Section; label: string }[] = [
  { id: "general", label: "Genel" },
  { id: "editor", label: "Editör" },
  { id: "terminal", label: "Terminal" },
  { id: "lsp", label: "Dil Sunucuları" },
  { id: "build", label: "Derleme" },
  { id: "debug", label: "Hata Ayıklama" },
  { id: "explorer", label: "Gezgin" },
  { id: "keys", label: "Kısayollar" },
];

function clone(config: ZenConfig): ZenConfig {
  return JSON.parse(JSON.stringify(config)) as ZenConfig;
}

function ArgsField({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}) {
  const joined = value.join(" ");
  const [text, setText] = useState(joined);
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(joined);
  }, [joined]);

  return (
    <input
      className="form-input"
      value={text}
      placeholder={placeholder ?? "Boşlukla ayırın"}
      onFocus={() => {
        focused.current = true;
      }}
      onChange={(event) => setText(event.target.value)}
      onBlur={() => {
        focused.current = false;
        onChange(text.split(/\s+/).filter(Boolean));
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          (event.target as HTMLInputElement).blur();
        }
      }}
    />
  );
}

function ColorField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="color-field">
      <input
        type="color"
        value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000"}
        onChange={(event) => onChange(event.target.value)}
      />
      <input
        className="form-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function SettingsModal() {
  const config = useStore((state) => state.config);
  const configPath = useStore((state) => state.configPath);
  const [draft, setDraft] = useState<ZenConfig>(() => clone(config));
  const [section, setSection] = useState<Section>("general");

  useEffect(() => {
    setDraft(clone(config));
  }, [config]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") useStore.getState().setSettingsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const updateEditor = (patch: Partial<ZenConfig["editor"]>) =>
    setDraft((previous) => ({
      ...previous,
      editor: { ...previous.editor, ...patch },
    }));
  const updateTheme = (patch: Partial<ZenConfig["theme"]>) =>
    setDraft((previous) => ({
      ...previous,
      theme: { ...previous.theme, ...patch },
    }));
  const updateUi = (patch: Partial<ZenConfig["ui"]>) =>
    setDraft((previous) => ({
      ...previous,
      ui: { ...previous.ui, ...patch },
    }));
  const updateTerminal = (patch: Partial<ZenConfig["terminal"]>) =>
    setDraft((previous) => ({
      ...previous,
      terminal: { ...previous.terminal, ...patch },
    }));
  const updateLsp = (patch: Partial<ZenConfig["lsp"]>) =>
    setDraft((previous) => ({
      ...previous,
      lsp: { ...previous.lsp, ...patch },
    }));
  const updateBuild = (patch: Partial<ZenConfig["build"]>) =>
    setDraft((previous) => ({
      ...previous,
      build: { ...previous.build, ...patch },
    }));
  const updateDebug = (patch: Partial<ZenConfig["debug"]>) =>
    setDraft((previous) => ({
      ...previous,
      debug: { ...previous.debug, ...patch },
    }));
  const updateExplorer = (patch: Partial<ZenConfig["explorer"]>) =>
    setDraft((previous) => ({
      ...previous,
      explorer: { ...previous.explorer, ...patch },
    }));
  const updateKeybinding = (action: string, value: string) =>
    setDraft((previous) => ({
      ...previous,
      keybindings: { ...previous.keybindings, [action]: value },
    }));

  const save = async () => {
    await useStore.getState().updateConfig(draft);
    useStore.getState().setSettingsOpen(false);
    useStore.getState().toast("Ayarlar kaydedildi.", "success");
  };

  return (
    <div
      className="overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          useStore.getState().setSettingsOpen(false);
        }
      }}
    >
      <div className="settings-modal">
        <div className="settings-header">
          <h2>Ayarlar</h2>
          <span className="settings-path" title={configPath}>
            {configPath}
          </span>
          <button
            className="icon-button small"
            title="Kapat"
            onClick={() => useStore.getState().setSettingsOpen(false)}
          >
            <CloseIcon size={14} />
          </button>
        </div>
        <div className="settings-layout">
          <div className="settings-tabs">
            {sections.map((item) => (
              <button
                key={item.id}
                className={`settings-tab ${
                  section === item.id ? "active" : ""
                }`}
                onClick={() => setSection(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="settings-body">
            {section === "general" && (
              <>
                <div className="settings-section">
                  <h3>Tema</h3>
                  <div className="settings-row">
                    <label className="settings-label">Arka plan</label>
                    <ColorField
                      value={draft.theme.background}
                      onChange={(value) => updateTheme({ background: value })}
                    />
                  </div>
                  <div className="settings-row">
                    <label className="settings-label">Panel</label>
                    <ColorField
                      value={draft.theme.panel}
                      onChange={(value) => updateTheme({ panel: value })}
                    />
                  </div>
                  <div className="settings-row">
                    <label className="settings-label">Kenarlık</label>
                    <ColorField
                      value={draft.theme.border}
                      onChange={(value) => updateTheme({ border: value })}
                    />
                  </div>
                  <div className="settings-row">
                    <label className="settings-label">Metin</label>
                    <ColorField
                      value={draft.theme.text}
                      onChange={(value) => updateTheme({ text: value })}
                    />
                  </div>
                  <div className="settings-row">
                    <label className="settings-label">Vurgu</label>
                    <ColorField
                      value={draft.theme.accent}
                      onChange={(value) => updateTheme({ accent: value })}
                    />
                  </div>
                  <div className="settings-row">
                    <label className="settings-label">Editör arka planı</label>
                    <ColorField
                      value={draft.theme.editor_background}
                      onChange={(value) =>
                        updateTheme({ editor_background: value })
                      }
                    />
                  </div>
                </div>
                <div className="settings-section">
                  <h3>Yerleşim</h3>
                  <div className="settings-row">
                    <label className="settings-label">Kenar çubuğu genişliği</label>
                    <input
                      className="form-input number"
                      type="number"
                      min={180}
                      max={500}
                      value={draft.ui.sidebar_width}
                      onChange={(event) =>
                        updateUi({ sidebar_width: Number(event.target.value) })
                      }
                    />
                  </div>
                  <div className="settings-row">
                    <label className="settings-label">Alt panel yüksekliği</label>
                    <input
                      className="form-input number"
                      type="number"
                      min={120}
                      max={800}
                      value={draft.ui.bottom_panel_height}
                      onChange={(event) =>
                        updateUi({
                          bottom_panel_height: Number(event.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="settings-row">
                    <label className="settings-label">Sağ panel genişliği</label>
                    <input
                      className="form-input number"
                      type="number"
                      min={200}
                      max={600}
                      value={draft.ui.right_panel_width}
                      onChange={(event) =>
                        updateUi({ right_panel_width: Number(event.target.value) })
                      }
                    />
                  </div>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={draft.ui.show_right_panel}
                      onChange={(event) =>
                        updateUi({ show_right_panel: event.target.checked })
                      }
                    />
                    Sağ panel açık başlasın
                  </label>
                </div>
              </>
            )}

            {section === "editor" && (
              <div className="settings-section">
                <h3>Editör</h3>
                <div className="settings-row">
                  <label className="settings-label">Yazı tipi</label>
                  <input
                    className="form-input"
                    value={draft.editor.font_family}
                    onChange={(event) =>
                      updateEditor({ font_family: event.target.value })
                    }
                  />
                </div>
                <div className="settings-row">
                  <label className="settings-label">Punto</label>
                  <input
                    className="form-input number"
                    type="number"
                    min={9}
                    max={32}
                    value={draft.editor.font_size}
                    onChange={(event) =>
                      updateEditor({ font_size: Number(event.target.value) })
                    }
                  />
                </div>
                <div className="settings-row">
                  <label className="settings-label">Sekme boyutu</label>
                  <input
                    className="form-input number"
                    type="number"
                    min={1}
                    max={12}
                    value={draft.editor.tab_size}
                    onChange={(event) =>
                      updateEditor({ tab_size: Number(event.target.value) })
                    }
                  />
                </div>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={draft.editor.vim_mode}
                    onChange={(event) =>
                      updateEditor({ vim_mode: event.target.checked })
                    }
                  />
                  Vim modu
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={draft.editor.word_wrap}
                    onChange={(event) =>
                      updateEditor({ word_wrap: event.target.checked })
                    }
                  />
                  Sözcük kaydırma
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={draft.editor.minimap}
                    onChange={(event) =>
                      updateEditor({ minimap: event.target.checked })
                    }
                  />
                  Mini harita
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={draft.editor.line_numbers}
                    onChange={(event) =>
                      updateEditor({ line_numbers: event.target.checked })
                    }
                  />
                  Satır numaraları
                </label>
              </div>
            )}

            {section === "terminal" && (
              <div className="settings-section">
                <h3>Terminal</h3>
                <div className="settings-row">
                  <label className="settings-label">Kabuk</label>
                  <input
                    className="form-input"
                    placeholder="Boş = sistem varsayılanı"
                    value={draft.terminal.shell}
                    onChange={(event) =>
                      updateTerminal({ shell: event.target.value })
                    }
                  />
                </div>
                <div className="settings-row">
                  <label className="settings-label">Yazı tipi</label>
                  <input
                    className="form-input"
                    value={draft.terminal.font_family}
                    onChange={(event) =>
                      updateTerminal({ font_family: event.target.value })
                    }
                  />
                </div>
                <div className="settings-row">
                  <label className="settings-label">Punto</label>
                  <input
                    className="form-input number"
                    type="number"
                    min={9}
                    max={28}
                    value={draft.terminal.font_size}
                    onChange={(event) =>
                      updateTerminal({ font_size: Number(event.target.value) })
                    }
                  />
                </div>
                <div className="settings-row">
                  <label className="settings-label">Geri kaydırma</label>
                  <input
                    className="form-input number"
                    type="number"
                    min={500}
                    max={50000}
                    step={500}
                    value={draft.terminal.scrollback}
                    onChange={(event) =>
                      updateTerminal({ scrollback: Number(event.target.value) })
                    }
                  />
                </div>
                <p className="settings-hint">
                  Yeni terminaller için geçerlidir. Değişiklikler kaydedildiğinde
                  açık terminallerin yazı tipi de güncellenir.
                </p>
              </div>
            )}

            {section === "lsp" && (
              <div className="settings-section">
                <h3>Dil Sunucuları</h3>
                <p className="settings-hint">
                  Boş bırakılan yollar PATH üzerinden aranır (rust-analyzer,
                  clangd, pylsp / pyright-langserver).
                </p>
                <div className="settings-row">
                  <label className="settings-label">rust-analyzer yolu</label>
                  <input
                    className="form-input"
                    placeholder="rust-analyzer"
                    value={draft.lsp.rust_analyzer_path}
                    onChange={(event) =>
                      updateLsp({ rust_analyzer_path: event.target.value })
                    }
                  />
                </div>
                <div className="settings-row">
                  <label className="settings-label">rust-analyzer argümanları</label>
                  <ArgsField
                    value={draft.lsp.rust_analyzer_args}
                    onChange={(value) => updateLsp({ rust_analyzer_args: value })}
                  />
                </div>
                <div className="settings-row">
                  <label className="settings-label">clangd yolu</label>
                  <input
                    className="form-input"
                    placeholder="clangd"
                    value={draft.lsp.clangd_path}
                    onChange={(event) =>
                      updateLsp({ clangd_path: event.target.value })
                    }
                  />
                </div>
                <div className="settings-row">
                  <label className="settings-label">clangd argümanları</label>
                  <ArgsField
                    value={draft.lsp.clangd_args}
                    onChange={(value) => updateLsp({ clangd_args: value })}
                  />
                </div>
                <div className="settings-row">
                  <label className="settings-label">Python LSP</label>
                  <select
                    className="form-input"
                    value={draft.lsp.python_lsp}
                    onChange={(event) =>
                      updateLsp({ python_lsp: event.target.value })
                    }
                  >
                    <option value="pylsp">pylsp</option>
                    <option value="pyright">pyright-langserver</option>
                  </select>
                </div>
                <div className="settings-row">
                  <label className="settings-label">pylsp yolu</label>
                  <input
                    className="form-input"
                    placeholder="pylsp"
                    value={draft.lsp.pylsp_path}
                    onChange={(event) =>
                      updateLsp({ pylsp_path: event.target.value })
                    }
                  />
                </div>
                <div className="settings-row">
                  <label className="settings-label">pyright yolu</label>
                  <input
                    className="form-input"
                    placeholder="pyright-langserver"
                    value={draft.lsp.pyright_path}
                    onChange={(event) =>
                      updateLsp({ pyright_path: event.target.value })
                    }
                  />
                </div>
                <div className="settings-row">
                  <label className="settings-label">Python yorumlayıcısı</label>
                  <input
                    className="form-input"
                    placeholder="python"
                    value={draft.lsp.python_path}
                    onChange={(event) =>
                      updateLsp({ python_path: event.target.value })
                    }
                  />
                </div>
              </div>
            )}

            {section === "build" && (
              <div className="settings-section">
                <h3>Derleme ve Çalıştırma</h3>
                <div className="settings-row">
                  <label className="settings-label">cargo ek argümanları</label>
                  <ArgsField
                    value={draft.build.cargo_extra_args}
                    onChange={(value) =>
                      updateBuild({ cargo_extra_args: value })
                    }
                  />
                </div>
                <div className="settings-row">
                  <label className="settings-label">cmake ek argümanları</label>
                  <ArgsField
                    value={draft.build.cmake_extra_args}
                    onChange={(value) =>
                      updateBuild({ cmake_extra_args: value })
                    }
                  />
                </div>
                <div className="settings-row">
                  <label className="settings-label">python ek argümanları</label>
                  <ArgsField
                    value={draft.build.python_extra_args}
                    onChange={(value) =>
                      updateBuild({ python_extra_args: value })
                    }
                  />
                </div>
                <div className="settings-row">
                  <label className="settings-label">CMake derleme klasörü</label>
                  <input
                    className="form-input"
                    value={draft.build.cmake_build_dir}
                    onChange={(event) =>
                      updateBuild({ cmake_build_dir: event.target.value })
                    }
                  />
                </div>
                <p className="settings-hint">
                  CMake projelerinde clangd, derleme klasöründeki
                  compile_commands.json dosyasını kullanır.
                </p>
              </div>
            )}

            {section === "debug" && (
              <div className="settings-section">
                <h3>Hata Ayıklama</h3>
                <div className="settings-row">
                  <label className="settings-label">lldb-dap yolu</label>
                  <input
                    className="form-input"
                    placeholder="lldb-dap"
                    value={draft.debug.lldb_dap_path}
                    onChange={(event) =>
                      updateDebug({ lldb_dap_path: event.target.value })
                    }
                  />
                </div>
                <div className="settings-row">
                  <label className="settings-label">debugpy Python yolu</label>
                  <input
                    className="form-input"
                    placeholder="python (debugpy kurulu olmalı)"
                    value={draft.debug.debugpy_path}
                    onChange={(event) =>
                      updateDebug({ debugpy_path: event.target.value })
                    }
                  />
                </div>
                <div className="settings-row">
                  <label className="settings-label">Rust programı</label>
                  <input
                    className="form-input"
                    placeholder="target/debug/uygulama"
                    value={draft.debug.rust_program}
                    onChange={(event) =>
                      updateDebug({ rust_program: event.target.value })
                    }
                  />
                </div>
                <div className="settings-row">
                  <label className="settings-label">C++ programı</label>
                  <input
                    className="form-input"
                    placeholder="build/bin/uygulama"
                    value={draft.debug.cpp_program}
                    onChange={(event) =>
                      updateDebug({ cpp_program: event.target.value })
                    }
                  />
                </div>
                <p className="settings-hint">
                  Rust/C++ için lldb-dap, Python için debugpy gerekir. Boş
                  bırakılırsa PATH üzerinden aranır.
                </p>
              </div>
            )}

            {section === "explorer" && (
              <div className="settings-section">
                <h3>Gezgin</h3>
                <p className="settings-hint">
                  Dışlanan klasör/dosya adları (her satır bir ad).
                </p>
                <textarea
                  className="form-input exclude-textarea"
                  rows={10}
                  value={draft.explorer.exclude.join("\n")}
                  onChange={(event) =>
                    updateExplorer({
                      exclude: event.target.value
                        .split("\n")
                        .map((line) => line.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </div>
            )}

            {section === "keys" && (
              <div className="settings-section">
                <h3>Klavye Kısayolları</h3>
                <p className="settings-hint">
                  Örnek: Ctrl+S, Ctrl+Shift+P, F5, Shift+Alt+F. Değişiklikler
                  kaydedildiğinde etkinleşir.
                </p>
                {keybindingLabels.map((item) => (
                  <div className="settings-row" key={item.action}>
                    <label className="settings-label">{item.label}</label>
                    <input
                      className="form-input"
                      value={draft.keybindings[item.action] ?? ""}
                      onChange={(event) =>
                        updateKeybinding(item.action, event.target.value)
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="settings-footer">
          <div className="settings-actions">
            <button
              className="secondary-button"
              onClick={() => {
                void openConfigFile();
                useStore.getState().setSettingsOpen(false);
              }}
            >
              Config Dosyasını Aç
            </button>
            <button
              className="secondary-button"
              onClick={() => setDraft(clone(defaultConfig))}
            >
              Varsayılanlara Sıfırla
            </button>
          </div>
          <div className="settings-actions">
            <button
              className="secondary-button"
              onClick={() => useStore.getState().setSettingsOpen(false)}
            >
              İptal
            </button>
            <button className="primary-button" onClick={() => void save()}>
              Kaydet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
