# ZenIDE

Tauri v2 + React + Monaco based lightweight, cross-platform IDE.

## Özellikler

- Monaco tabanlı editör: çoklu sekme, dirty-state, sözdizimi vurgulama, minimap, Vim modu (`monaco-vim`), breakpoint dekorasyonları, outline, formatlama.
- LSP entegrasyonu: rust-analyzer, clangd, pylsp/pyright. Tanılama, tamamlama, hover, tanıma gitme, referanslar, yeniden adlandırma, kod eylemleri, belge/çalışma alanı sembolleri, formatlama.
- DAP tabanlı debugger: lldb-dap (Rust/C++) ve debugpy (Python). Breakpoint, adım adım yürütme, çağrı yığını, değişkenler, watch, debug konsolu.
- Entegre terminal: xterm.js + Rust PTY; sekme başına oturum, yeniden boyutlandırma, kalıcı oturumlar.
- Dosya gezgini: oluşturma, yeniden adlandırma, silme, sürükle-bırak taşıma, hariç tutma listesi, git durum işaretleri, problem rozetleri.
- Arama: dosya içeriğinde ve dosya adlarında arama.
- Git paneli: durum, stage/unstage, commit, diff, dal listesi/değiştirme, pull.
- Görevler: build/run/test, çıktı paneli ve görev çıkış kodları.
- Ayarlar: modal UI + `zenide.config.toml` üzerinden canlı (hot-reload) yapılandırma.
- Hızlı açma (Ctrl+P), tema, Türkçe arayüz, durum çubuğu, bildirimler.

## Gereksinimler

Linux için WebKitGTK bağımlılıkları gereklidir:
```bash
# Arch
sudo pacman -S webkit2gtk-4.1
# Debian/Ubuntu
sudo apt install libwebkit2gtk-4.1-dev libjavascriptcoregtk-4.1-dev
```

- Node.js 18+ ve npm
- Rust stable (MSVC toolchain) ve Visual Studio Build Tools (C++ iş yükü)
- WebView2 (Windows 10/11'de genellikle hazırdır)
- İsteğe bağlı araçlar:
  - `rust-analyzer` (Rust LSP; `rustup component add rust-analyzer`)
  - `clangd` (C++ LSP)
  - `pylsp` (`pip install python-lsp-server`) veya `pyright`
  - `lldb-dap` (Rust/C++ debug)
  - `debugpy` (`pip install debugpy`, Python debug)
  - `git`, `cmake` (ilgili özellikler için)

> PowerShell `npm.ps1` çalıştırmayı engelliyorsa `npm.cmd` kullanın.

## Kurulum ve Çalıştırma

```powershell
npm install
npm run tauri dev
```

Üretim derlemesi:

```powershell
npm run tauri build
```

Paket oluşturmadan hızlı derleme doğrulaması:

```powershell
npm run tauri build -- --no-bundle
```

Yalnızca ön yüz:

```powershell
npm run dev        # http://localhost:1420
npm run typecheck
npm run build
```

## İlk Kullanım

1. `Ctrl+Shift+N` ile yeni proje oluşturun veya karşılama ekranından bir klasör açın.
2. Proje türü (`Cargo.toml`, `CMakeLists.txt`, Python dosyaları) otomatik algılanır.
3. `Ctrl+Shift+B` derler, `Ctrl+F5` çalıştırır, `F5` debug başlatır.
4. Terminal `Ctrl+\`` ile açılır.

## Varsayılan Kısayollar

| Eylem | Kısayol |
| --- | --- |
| Kaydet | `Ctrl+S` |
| Tümünü kaydet | `Ctrl+Shift+S` |
| Sekmeyi kapat | `Ctrl+W` |
| Hızlı aç | `Ctrl+P` |
| Metin arama | `Ctrl+Shift+F` |
| Git paneli | `Ctrl+Shift+G` |
| Problemler | `Ctrl+Shift+M` |
| Terminal | `Ctrl+\`` |
| Derle | `Ctrl+Shift+B` |
| Çalıştır | `Ctrl+F5` |
| Debug | `F5` |
| Formatla | `Shift+Alt+F` |
| Ayarlar | `Ctrl+,` |
| Yeni proje | `Ctrl+Shift+N` |
| Config yeniden yükle | `Ctrl+Alt+R` |

Kısayollar `zenide.config.toml` içindeki `[keybindings]` bölümünden değiştirilebilir.

## Yapılandırma

Config dosyası ilk çalıştırmada otomatik oluşturulur:

- Windows: `%APPDATA%\com.zenide.ide\zenide.config.toml`
- macOS: `~/Library/Application Support/com.zenide.ide/zenide.config.toml`
- Linux: `~/.config/com.zenide.ide/zenide.config.toml`

Dosya izlenir; kaydedildiğinde ayarlar yeniden başlatma olmadan uygulanır (`config-changed` olayı).

Örnek:

```toml
[editor]
font_family = "JetBrains Mono"
font_size = 14
tab_size = 4
vim_mode = false
word_wrap = false
minimap = true
line_numbers = true

[theme]
background = "#0b0b0c"
panel = "#151517"
border = "#27272b"
text = "#f0f0f2"
accent = "#d9d9de"
editor_background = "#08080a"

[ui]
sidebar_width = 270
bottom_panel_height = 240
right_panel_width = 300
show_right_panel = false

[terminal]
shell = ""            # boşsa platform varsayılanı
font_family = "JetBrains Mono"
font_size = 13
scrollback = 5000

[lsp]
rust_analyzer_path = ""       # boşsa PATH'teki rust-analyzer
rust_analyzer_args = []
clangd_path = ""              # boşsa PATH'teki clangd
clangd_args = []
python_lsp = "pylsp"          # "pylsp" veya "pyright"
pylsp_path = ""
pyright_path = ""
python_path = ""              # boşsa proje Python'u / python

[build]
cargo_extra_args = []
cmake_extra_args = []
python_extra_args = []
cmake_build_dir = "build"

[debug]
lldb_dap_path = ""            # boşsa PATH'teki lldb-dap
debugpy_path = ""             # debugpy kurulu Python yorumlayıcısı (boşsa python_path)
rust_program = ""             # boşsa target/debug/<paket>
cpp_program = ""              # boşsa CMake çıktısı

[explorer]
exclude = [".git", "node_modules", "target", "build", ".venv", "venv", "__pycache__", ".idea", ".DS_Store"]

[keybindings]
save = "Ctrl+S"
quick_open = "Ctrl+P"
toggle_terminal = "Ctrl+`"
debug = "F5"
```

### LSP Notları

- Rust: `rust-analyzer` PATH'te olmalı veya `lsp.rust_analyzer_path` verilmeli.
- C++: `clangd` PATH'te olmalı; derleme veritabanı için `build` klasöründe `compile_commands.json` üretin (`-DCMAKE_EXPORT_COMPILE_COMMANDS=ON`).
- Python: `pylsp` varsayılandır; `pyright` için `python_lsp = "pyright"` ve gerekirse `pyright_path` ayarlayın.
- Dil sunucusu yoksa editör çalışmaya devam eder; durum çubuğunda/uyarılarda hata gösterilir.

### Debug Notları

- Rust/C++: `lldb-dap` gerekir. Rust için debug derlemesi (`cargo build`) ve `debug.rust_program` yolu (örn. `target/debug/uygulama`) kullanılır.
- C++: `build` klasöründeki çalıştırılabilir dosya otomatik aranır; gerekirse `debug.cpp_program` ile belirtin.
- Python: `debugpy` modülü kurulu bir yorumlayıcı kullanılır (`debug.debugpy_path` veya `lsp.python_path`).

## Mimari

```
src/                     React + TypeScript ön yüz
  components/            UI bileşenleri (editör, paneller, modaller)
  editor/                Monaco kurulumu, dil tanımları, model yönetimi
  lsp/                   LSP istemcisi, sunucu eşlemesi, sağlayıcılar
  debug/                 DAP istemcisi
  services/              build, task, python, debug servisleri
  store.ts, actions.ts   Zustand durumu ve komut eşlemesi
src-tauri/src/           Rust arka uç
  config.rs              TOML config + dosya izleyici
  fs_ops.rs              dosya sistemi işlemleri ve arama
  projects.rs            proje tespiti ve çalıştırılabilir bulma
  process.rs, pty.rs     görev ve terminal süreçleri
  lsp.rs, dap.rs         Content-Length çerçeveleme ve süreç köprüsü
  git.rs                 git komutları
  lib.rs                 Tauri komut kayıtları
```

Ön yüz ile arka uç arasındaki olaylar: `config-changed`, `pty-output`, `pty-exit`, `task-output`, `task-exit`, `lsp-message`, `lsp-stderr`, `lsp-exit`, `dap-message`, `dap-stderr`, `dap-exit`.

Tauri izinleri `src-tauri/capabilities/default.json` içinde `core:default` ve `dialog:default` ile sınırlıdır.

## Bilinen Sınırlar

- Monaco tam paket olarak yüklendiği için üretim paketi büyüktür (Vite chunk uyarısı normaldir).
- LSP, debugger, git ve cmake araçları pakete dahil değildir; sistemde kurulu olmalıdır.
- Git entegrasyonu için `git` PATH'te olmalıdır; yoksa git paneli hata mesajı gösterir.
- Proje deposu henüz git ile başlatılmadıysa commit geçmişi oluşturulamaz.
- Tam paket (installer) üretimi `npm run tauri build` ile yapılır; platforma özgü imzalama yapılandırılmamıştır.
