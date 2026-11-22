use notify::{EventKind, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct EditorConfig {
    pub font_family: String,
    pub font_size: u32,
    pub tab_size: u32,
    pub vim_mode: bool,
    pub word_wrap: bool,
    pub minimap: bool,
    pub line_numbers: bool,
}

impl Default for EditorConfig {
    fn default() -> Self {
        Self {
            font_family: "JetBrains Mono".into(),
            font_size: 14,
            tab_size: 4,
            vim_mode: false,
            word_wrap: false,
            minimap: true,
            line_numbers: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct ThemeConfig {
    pub background: String,
    pub panel: String,
    pub border: String,
    pub text: String,
    pub accent: String,
    pub editor_background: String,
}

impl Default for ThemeConfig {
    fn default() -> Self {
        Self {
            background: "#0b0b0c".into(),
            panel: "#151517".into(),
            border: "#27272b".into(),
            text: "#f0f0f2".into(),
            accent: "#d9d9de".into(),
            editor_background: "#08080a".into(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct UiConfig {
    pub sidebar_width: u32,
    pub bottom_panel_height: u32,
    pub right_panel_width: u32,
    pub show_right_panel: bool,
    pub animations_enabled: bool,
    pub font_weight: u32,
}

impl Default for UiConfig {
    fn default() -> Self {
        Self {
            sidebar_width: 270,
            bottom_panel_height: 240,
            right_panel_width: 300,
            show_right_panel: false,
            animations_enabled: true,
            font_weight: 400,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct TerminalConfig {
    pub shell: String,
    pub font_family: String,
    pub font_size: u32,
    pub scrollback: u32,
}

impl Default for TerminalConfig {
    fn default() -> Self {
        Self {
            shell: String::new(),
            font_family: "JetBrains Mono".into(),
            font_size: 13,
            scrollback: 5000,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct LspConfig {
    pub rust_analyzer_path: String,
    pub rust_analyzer_args: Vec<String>,
    pub clangd_path: String,
    pub clangd_args: Vec<String>,
    pub python_lsp: String,
    pub pylsp_path: String,
    pub pyright_path: String,
    pub python_path: String,
}

impl Default for LspConfig {
    fn default() -> Self {
        Self {
            rust_analyzer_path: String::new(),
            rust_analyzer_args: Vec::new(),
            clangd_path: String::new(),
            clangd_args: Vec::new(),
            python_lsp: "pylsp".into(),
            pylsp_path: String::new(),
            pyright_path: String::new(),
            python_path: String::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct BuildConfig {
    pub cargo_extra_args: Vec<String>,
    pub cmake_extra_args: Vec<String>,
    pub python_extra_args: Vec<String>,
    pub cmake_build_dir: String,
}

impl Default for BuildConfig {
    fn default() -> Self {
        Self {
            cargo_extra_args: Vec::new(),
            cmake_extra_args: Vec::new(),
            python_extra_args: Vec::new(),
            cmake_build_dir: "build".into(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct DebugConfig {
    pub lldb_dap_path: String,
    pub debugpy_path: String,
    pub rust_program: String,
    pub cpp_program: String,
}

impl Default for DebugConfig {
    fn default() -> Self {
        Self {
            lldb_dap_path: String::new(),
            debugpy_path: String::new(),
            rust_program: String::new(),
            cpp_program: String::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct ExplorerConfig {
    pub exclude: Vec<String>,
    pub font_size: u32,
}

impl Default for ExplorerConfig {
    fn default() -> Self {
        Self {
            font_size: 14,
            exclude: vec![
                ".git".into(),
                "node_modules".into(),
                "target".into(),
                "build".into(),
                ".venv".into(),
                "venv".into(),
                "__pycache__".into(),
                ".idea".into(),
                ".DS_Store".into(),
            ],
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct ZenConfig {
    pub editor: EditorConfig,
    pub theme: ThemeConfig,
    pub ui: UiConfig,
    pub terminal: TerminalConfig,
    pub lsp: LspConfig,
    pub build: BuildConfig,
    pub debug: DebugConfig,
    pub explorer: ExplorerConfig,
    pub keybindings: HashMap<String, String>,
}

impl Default for ZenConfig {
    fn default() -> Self {
        Self {
            editor: EditorConfig::default(),
            theme: ThemeConfig::default(),
            ui: UiConfig::default(),
            terminal: TerminalConfig::default(),
            lsp: LspConfig::default(),
            build: BuildConfig::default(),
            debug: DebugConfig::default(),
            explorer: ExplorerConfig::default(),
            keybindings: default_keybindings(),
        }
    }
}

fn default_keybindings() -> HashMap<String, String> {
    let mut map = HashMap::new();
    map.insert("save".into(), "Ctrl+S".into());
    map.insert("save_all".into(), "Ctrl+Shift+S".into());
    map.insert("close_tab".into(), "Ctrl+W".into());
    map.insert("quick_open".into(), "Ctrl+P".into());
    map.insert("search".into(), "Ctrl+Shift+F".into());
    map.insert("git".into(), "Ctrl+Shift+G".into());
    map.insert("problems".into(), "Ctrl+Shift+M".into());
    map.insert("toggle_terminal".into(), "Ctrl+`".into());
    map.insert("build".into(), "Ctrl+Shift+B".into());
    map.insert("run".into(), "Ctrl+F5".into());
    map.insert("debug".into(), "F5".into());
    map.insert("format".into(), "Shift+Alt+F".into());
    map.insert("settings".into(), "Ctrl+,".into());
    map.insert("new_project".into(), "Ctrl+Shift+N".into());
    map.insert("reload_config".into(), "Ctrl+Alt+R".into());
    map
}

impl ZenConfig {
    pub fn normalize(&mut self) {
        let defaults = default_keybindings();
        for (key, value) in defaults {
            self.keybindings.entry(key).or_insert(value);
        }
        self.editor.font_size = self.editor.font_size.clamp(8, 40);
        self.editor.tab_size = self.editor.tab_size.clamp(1, 12);
        self.terminal.font_size = self.terminal.font_size.clamp(8, 32);
        self.terminal.scrollback = self.terminal.scrollback.clamp(500, 100_000);
        self.ui.sidebar_width = self.ui.sidebar_width.clamp(180, 600);
        self.ui.bottom_panel_height = self.ui.bottom_panel_height.clamp(120, 800);
        self.ui.right_panel_width = self.ui.right_panel_width.clamp(200, 700);
        self.ui.font_weight = self.ui.font_weight.clamp(300, 800);
        self.explorer.font_size = self.explorer.font_size.clamp(10, 24);
        if self.build.cmake_build_dir.trim().is_empty() {
            self.build.cmake_build_dir = "build".into();
        }
        if self.lsp.python_lsp != "pyright" {
            self.lsp.python_lsp = "pylsp".into();
        }
    }
}

pub struct ConfigState {
    pub path: PathBuf,
    pub config: Mutex<ZenConfig>,
    pub watcher: Mutex<Option<notify::RecommendedWatcher>>,
}

fn read_config(path: &PathBuf) -> Result<ZenConfig, String> {
    let raw = fs::read_to_string(path).map_err(|e| format!("Config could not be read: {e}"))?;
    let mut config: ZenConfig =
        toml::from_str(&raw).map_err(|e| format!("Config could not be parsed: {e}"))?;
    config.normalize();
    Ok(config)
}

fn write_config(path: &PathBuf, config: &ZenConfig) -> Result<(), String> {
    let body = toml::to_string_pretty(config).map_err(|e| format!("Config could not be serialized: {e}"))?;
    let header = "# ZenIDE configuration\n\
                  # This file is watched by the IDE; settings apply without restart when saved.\n\
                  # Colors, font, vim mode, keybindings, LSP paths and terminal are managed here.\n\n";
    fs::write(path, format!("{header}{body}")).map_err(|e| format!("Config could not be written: {e}"))
}

pub fn init(app: &AppHandle) -> Result<(), String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Config folder not found: {e}"))?;
    fs::create_dir_all(&dir).map_err(|e| format!("Config folder could not be created: {e}"))?;
    let path = dir.join("zenide.config.toml");

    let mut config = if path.exists() {
        match read_config(&path) {
            Ok(config) => config,
            Err(err) => {
                eprintln!("{err}");
                ZenConfig::default()
            }
        }
    } else {
        let config = ZenConfig::default();
        write_config(&path, &config)?;
        config
    };
    config.normalize();

    app.manage(ConfigState {
        path: path.clone(),
        config: Mutex::new(config),
        watcher: Mutex::new(None),
    });

    let handle = app.clone();
    let watched_path = path.clone();
    let mut watcher = notify::recommended_watcher(
        move |result: notify::Result<notify::Event>| {
            let Ok(event) = result else { return };
            if !matches!(event.kind, EventKind::Modify(_) | EventKind::Create(_)) {
                return;
            }
            let relevant = event.paths.iter().any(|p| {
                p == &watched_path
                    || p.file_name()
                        .map(|n| n == "zenide.config.toml")
                        .unwrap_or(false)
            });
            if !relevant {
                return;
            }
            let state = handle.state::<ConfigState>();
            if let Ok(config) = read_config(&watched_path) {
                if let Ok(mut current) = state.config.lock() {
                    *current = config.clone();
                }
                let _ = handle.emit("config-changed", config);
            }
        },
    )
    .map_err(|e| format!("Config watcher could not be created: {e}"))?;

    watcher
        .watch(&dir, RecursiveMode::NonRecursive)
        .map_err(|e| format!("Config izlenemedi: {e}"))?;

    let state = app.state::<ConfigState>();
    *state.watcher.lock().unwrap() = Some(watcher);
    Ok(())
}

#[tauri::command]
pub fn get_config(state: tauri::State<'_, ConfigState>) -> ZenConfig {
    state.config.lock().unwrap().clone()
}

#[tauri::command]
pub fn get_config_path(state: tauri::State<'_, ConfigState>) -> String {
    state.path.to_string_lossy().to_string()
}

#[tauri::command]
pub fn save_config(
    app: AppHandle,
    state: tauri::State<'_, ConfigState>,
    config: ZenConfig,
) -> Result<(), String> {
    let mut config = config;
    config.normalize();
    write_config(&state.path, &config)?;
    *state.config.lock().unwrap() = config.clone();
    let _ = app.emit("config-changed", config);
    Ok(())
}

#[tauri::command]
pub fn reload_config(
    app: AppHandle,
    state: tauri::State<'_, ConfigState>,
) -> Result<ZenConfig, String> {
    let config = read_config(&state.path)?;
    *state.config.lock().unwrap() = config.clone();
    let _ = app.emit("config-changed", config.clone());
    Ok(config)
}
