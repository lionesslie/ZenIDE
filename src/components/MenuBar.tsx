import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import {
  openConfigFile,
  openFolder,
  runAction,
} from "../actions";
import * as api from "../api";
import {
  BugIcon,
  BuildIcon,
  PlayIcon,
  SaveIcon,
  SettingsIcon,
  TerminalIcon,
} from "./Icons";

interface MenuItem {
  label?: string;
  action?: string;
  shortcut?: string;
  separator?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export function MenuBar() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const keybindings = useStore((state) => state.config.keybindings);
  const projectKind = useStore((state) => state.project?.kind ?? "unknown");
  const workspace = useStore((state) => state.workspace);
  const projectName = useStore((state) => state.project?.name ?? "");

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, []);

  const shortcut = (action: string) => keybindings[action] ?? "";
  const isRust = projectKind === "rust";

  const handleItem = async (item: MenuItem) => {
    if (item.disabled) return;
    setOpenMenu(null);
    if (item.onClick) {
      await item.onClick();
      return;
    }
    if (item.action) {
      await runAction(item.action);
    }
  };

  const gitOperation = async (
    operation: "push" | "pull" | "init"
  ): Promise<void> => {
    const state = useStore.getState();
    if (!state.workspace) return;
    try {
      if (operation === "push") {
        const output = await api.gitPush(state.workspace);
        state.toast(output.trim().split("\n").pop() || "Push tamamlandı.", "success");
      } else if (operation === "pull") {
        const output = await api.gitPull(state.workspace);
        state.toast(output.trim().split("\n").pop() || "Pull tamamlandı.", "success");
      } else {
        await api.gitInit(state.workspace);
        state.toast("Git deposu oluşturuldu.", "success");
      }
      await Promise.all([
        state.refreshGit(),
        state.refreshBranches(),
        state.refreshGitLog(),
      ]);
    } catch (error) {
      state.toast(String(error), "error");
    }
  };

  const menus: { label: string; items: MenuItem[] }[] = [
    {
      label: "Dosya",
      items: [
        { label: "Yeni Proje…", action: "new_project", shortcut: shortcut("new_project") },
        { label: "Klasör Aç…", onClick: openFolder },
        { separator: true },
        { label: "Kaydet", action: "save", shortcut: shortcut("save") },
        { label: "Tümünü Kaydet", action: "save_all", shortcut: shortcut("save_all") },
        { label: "Sekmeyi Kapat", action: "close_tab", shortcut: shortcut("close_tab") },
        { separator: true },
        { label: "Ayarlar", action: "settings", shortcut: shortcut("settings") },
        { label: "Config Dosyasını Aç", onClick: openConfigFile },
        { label: "Config'i Yeniden Yükle", action: "reload_config", shortcut: shortcut("reload_config") },
      ],
    },
    {
      label: "Görünüm",
      items: [
        { label: "Gezgin", onClick: () => useStore.getState().setSidebarView("explorer") },
        { label: "Arama", action: "search", shortcut: shortcut("search") },
        { label: "Kaynak Kontrolü", action: "git", shortcut: shortcut("git") },
        { label: "Hata Ayıklama", onClick: () => useStore.getState().setSidebarView("debug") },
        { label: "Python", action: "python_packages" },
        { separator: true },
        { label: "Terminal", action: "toggle_terminal", shortcut: shortcut("toggle_terminal") },
        { label: "Sorunlar", action: "problems", shortcut: shortcut("problems") },
        { label: "Sağ Paneli Aç/Kapat", onClick: () => useStore.getState().toggleRightPanel() },
      ],
    },
    {
      label: "Derle",
      items: [
        { label: "Derle", action: "build", shortcut: shortcut("build") },
        { label: "Çalıştır", action: "run", shortcut: shortcut("run") },
        { label: "Test Et", action: "test" },
        { separator: true },
        { label: "cargo check", action: "rust_check", disabled: !isRust },
        { label: "cargo clippy", action: "rust_clippy", disabled: !isRust },
        { label: "cargo fmt", action: "rust_fmt", disabled: !isRust },
        { label: "Belgeyi Biçimlendir (LSP)", action: "format", shortcut: shortcut("format") },
      ],
    },
    {
      label: "Hata Ayıkla",
      items: [
        { label: "Hata Ayıklamayı Başlat", action: "debug", shortcut: shortcut("debug") },
        { label: "Durdur", action: "stop_debug" },
        { separator: true },
        { label: "Devam", onClick: () => void runAction("debug_continue") },
        { label: "Adım Üstü", onClick: () => void runAction("debug_next") },
        { label: "İçine Gir", onClick: () => void runAction("debug_step_in") },
        { label: "Dışına Çık", onClick: () => void runAction("debug_step_out") },
      ],
    },
    {
      label: "Git",
      items: [
        { label: "Paneli Yenile", onClick: () => {
          const state = useStore.getState();
          void Promise.all([state.refreshGit(), state.refreshBranches(), state.refreshGitLog()]);
        } },
        { label: "Kaynak Kontrolü", action: "git", shortcut: shortcut("git") },
        { separator: true },
        { label: "Push", disabled: !workspace, onClick: () => void gitOperation("push") },
        { label: "Pull", disabled: !workspace, onClick: () => void gitOperation("pull") },
        { label: "Depo Başlat", disabled: !workspace, onClick: () => void gitOperation("init") },
      ],
    },
    {
      label: "Yardım",
      items: [
        { label: "Config Dosyasını Aç", onClick: openConfigFile },
        { label: "Hakkında", onClick: () => useStore.getState().toast("ZenIDE 0.1.0 — Rust, C++ ve Python için minimal IDE", "info") },
      ],
    },
  ];

  return (
    <div className="menubar" ref={rootRef}>
      <div className="menubar-brand">
        <span className="brand-mark">Z</span>
        <span className="brand-name">ZenIDE</span>
        {projectName && <span className="brand-project">{projectName}</span>}
      </div>
      <div className="menus">
        {menus.map((menu) => (
          <div className="menu-root" key={menu.label}>
            <button
              className={`menu-button ${openMenu === menu.label ? "open" : ""}`}
              onClick={() =>
                setOpenMenu(openMenu === menu.label ? null : menu.label)
              }
            >
              {menu.label}
            </button>
            {openMenu === menu.label && (
              <div className="menu-dropdown">
                {menu.items.map((item, index) =>
                  item.separator ? (
                    <div className="menu-separator" key={`sep-${index}`} />
                  ) : (
                    <button
                      className={`menu-item ${item.disabled ? "disabled" : ""}`}
                      key={item.label}
                      onClick={() => void handleItem(item)}
                    >
                      <span>{item.label}</span>
                      {item.shortcut && (
                        <span className="menu-shortcut">{item.shortcut}</span>
                      )}
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="menubar-actions">
        <button className="icon-button" title="Derle (Ctrl+Shift+B)" onClick={() => void runAction("build")}>
          <BuildIcon size={15} />
        </button>
        <button className="icon-button" title="Çalıştır (Ctrl+F5)" onClick={() => void runAction("run")}>
          <PlayIcon size={15} />
        </button>
        <button className="icon-button" title="Hata Ayıkla (F5)" onClick={() => void runAction("debug")}>
          <BugIcon size={15} />
        </button>
        <span className="toolbar-divider" />
        <button className="icon-button" title="Kaydet (Ctrl+S)" onClick={() => void runAction("save")}>
          <SaveIcon size={15} />
        </button>
        <button className="icon-button" title="Terminal (Ctrl+`)" onClick={() => void runAction("toggle_terminal")}>
          <TerminalIcon size={15} />
        </button>
        <button className="icon-button" title="Ayarlar (Ctrl+,)" onClick={() => useStore.getState().setSettingsOpen(true)}>
          <SettingsIcon size={15} />
        </button>
      </div>
    </div>
  );
}
