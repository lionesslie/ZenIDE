use crate::process::command;
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

#[derive(Serialize, Clone)]
pub struct ProjectInfo {
    pub kind: String,
    pub name: String,
    pub path: String,
    pub venv: Option<String>,
    pub python: Option<String>,
    pub executable: Option<String>,
}

fn venv_python_in(dir: &Path) -> Option<String> {
    #[cfg(windows)]
    let candidate = dir.join("Scripts").join("python.exe");
    #[cfg(not(windows))]
    let candidate = dir.join("bin").join("python");

    if candidate.exists() {
        Some(candidate.to_string_lossy().to_string())
    } else {
        None
    }
}

fn find_venv(root: &Path) -> Option<(String, String)> {
    for name in [".venv", "venv", "env"] {
        let dir = root.join(name);
        if dir.is_dir() {
            if let Some(python) = venv_python_in(&dir) {
                return Some((dir.to_string_lossy().to_string(), python));
            }
        }
    }
    None
}

fn cargo_package_name(root: &Path) -> Option<String> {
    let raw = fs::read_to_string(root.join("Cargo.toml")).ok()?;
    let mut in_package = false;
    for line in raw.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with('[') {
            in_package = trimmed == "[package]";
            continue;
        }
        if in_package {
            if let Some(rest) = trimmed.strip_prefix("name") {
                if let Some(rest) = rest.trim_start().strip_prefix('=') {
                    return Some(rest.trim().trim_matches('"').trim_matches('\'').to_string());
                }
            }
        }
    }
    None
}

fn rust_executable(root: &Path) -> Option<String> {
    let name = cargo_package_name(root)?;
    #[cfg(windows)]
    let binaries = [format!("{name}.exe"), name.clone()];
    #[cfg(not(windows))]
    let binaries = [name.clone(), name.clone()];
    for profile in ["debug", "release"] {
        for binary in &binaries {
            let candidate = root.join("target").join(profile).join(binary);
            if candidate.exists() {
                return Some(candidate.to_string_lossy().to_string());
            }
        }
    }
    None
}

#[cfg(windows)]
fn is_executable_file(path: &Path) -> bool {
    path.extension()
        .map(|ext| ext.to_string_lossy().eq_ignore_ascii_case("exe"))
        .unwrap_or(false)
}

#[cfg(not(windows))]
fn is_executable_file(path: &Path) -> bool {
    use std::os::unix::fs::PermissionsExt;
    fs::metadata(path)
        .map(|meta| meta.is_file() && meta.permissions().mode() & 0o111 != 0)
        .unwrap_or(false)
}

fn cpp_executable(root: &Path) -> Option<String> {
    let build = root.join("build");
    if !build.is_dir() {
        return None;
    }
    let mut newest: Option<(std::time::SystemTime, String)> = None;
    let mut scanned = 0usize;
    for entry in WalkDir::new(&build)
        .max_depth(4)
        .into_iter()
        .filter_entry(|e| e.file_name() != "CMakeFiles")
        .filter_map(|entry| entry.ok())
    {
        scanned += 1;
        if scanned > 20_000 {
            break;
        }
        if !entry.file_type().is_file() || !is_executable_file(entry.path()) {
            continue;
        }
        let modified = entry
            .metadata()
            .ok()
            .and_then(|meta| meta.modified().ok())
            .unwrap_or(std::time::UNIX_EPOCH);
        let path = entry.path().to_string_lossy().to_string();
        if newest.as_ref().map(|(time, _)| modified > *time).unwrap_or(true) {
            newest = Some((modified, path));
        }
    }
    newest.map(|(_, path)| path)
}

fn detect_kind(root: &Path) -> String {
    if root.join("Cargo.toml").exists() {
        return "rust".into();
    }
    if root.join("CMakeLists.txt").exists() {
        return "cpp".into();
    }
    if root.join("pyproject.toml").exists()
        || root.join("requirements.txt").exists()
        || root.join("setup.py").exists()
    {
        return "python".into();
    }
    if let Ok(entries) = fs::read_dir(root) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file()
                && path
                    .extension()
                    .map(|ext| ext.eq_ignore_ascii_case("py"))
                    .unwrap_or(false)
            {
                return "python".into();
            }
        }
    }
    "unknown".into()
}

#[tauri::command]
pub fn detect_project(root: String) -> Result<ProjectInfo, String> {
    let path = Path::new(&root);
    if !path.is_dir() {
        return Err("Proje klasörü bulunamadı.".into());
    }
    let kind = detect_kind(path);
    let venv = find_venv(path);
    let executable = match kind.as_str() {
        "rust" => rust_executable(path),
        "cpp" => cpp_executable(path),
        _ => None,
    };
    Ok(ProjectInfo {
        kind,
        name: path
            .file_name()
            .map(|name| name.to_string_lossy().to_string())
            .unwrap_or_else(|| root.clone()),
        path: root.clone(),
        venv: venv.as_ref().map(|(dir, _)| dir.clone()),
        python: venv.map(|(_, python)| python),
        executable,
    })
}

fn sanitize_identifier(name: &str) -> String {
    let mut out = String::new();
    for ch in name.chars() {
        if ch.is_ascii_alphanumeric() || ch == '_' || ch == '-' {
            out.push(ch);
        } else if ch == ' ' {
            out.push('_');
        }
    }
    if out.is_empty() {
        "project".into()
    } else if out.chars().next().map(|c| c.is_ascii_digit()).unwrap_or(false) {
        format!("p_{out}")
    } else {
        out
    }
}

fn validate_name(name: &str) -> Result<(), String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("Proje adı boş olamaz.".into());
    }
    if trimmed.contains('/') || trimmed.contains('\\') || trimmed.contains("..") {
        return Err("Proje adı yol ayırıcı içeremez.".into());
    }
    Ok(())
}

fn venv_python_path(root: &Path) -> PathBuf {
    #[cfg(windows)]
    {
        root.join(".venv").join("Scripts").join("python.exe")
    }
    #[cfg(not(windows))]
    {
        root.join(".venv").join("bin").join("python")
    }
}

fn spawn_venv(root: &Path, python: &str) -> Result<(), String> {
    let mut cmd = command(python, &["-m".to_string(), "venv".to_string(), ".venv".to_string()]);
    cmd.current_dir(root);
    let output = cmd
        .output()
        .map_err(|e| format!("Python çalıştırılamadı ({python}): {e}"))?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    Ok(())
}

fn create_project_blocking(
    kind: String,
    parent: String,
    name: String,
    python_path: Option<String>,
) -> Result<String, String> {
    validate_name(&name)?;
    let parent_path = Path::new(&parent);
    if !parent_path.is_dir() {
        return Err("Üst klasör bulunamadı.".into());
    }
    let root = parent_path.join(name.trim());
    if root.exists() {
        return Err("Bu isimde bir klasör zaten var.".into());
    }
    fs::create_dir_all(&root).map_err(|e| format!("Proje klasörü oluşturulamadı: {e}"))?;
    let ident = sanitize_identifier(name.trim());

    match kind.as_str() {
        "rust" => {
            fs::create_dir_all(root.join("src")).map_err(|e| e.to_string())?;
            fs::write(
                root.join("Cargo.toml"),
                format!(
                    "[package]\nname = \"{ident}\"\nversion = \"0.1.0\"\nedition = \"2021\"\n\n[dependencies]\n"
                ),
            )
            .map_err(|e| e.to_string())?;
            fs::write(
                root.join("src").join("main.rs"),
                format!(
                    "fn main() {{\n    println!(\"Merhaba, {ident}!\");\n}}\n"
                ),
            )
            .map_err(|e| e.to_string())?;
            fs::write(root.join(".gitignore"), "/target\n").map_err(|e| e.to_string())?;
        }
        "cpp" => {
            fs::create_dir_all(root.join("src")).map_err(|e| e.to_string())?;
            fs::write(
                root.join("CMakeLists.txt"),
                format!(
                    "cmake_minimum_required(VERSION 3.16)\n\
                     project({ident} LANGUAGES CXX)\n\n\
                     set(CMAKE_CXX_STANDARD 17)\n\
                     set(CMAKE_CXX_STANDARD_REQUIRED ON)\n\
                     set(CMAKE_EXPORT_COMPILE_COMMANDS ON)\n\
                     set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${{CMAKE_BINARY_DIR}}/bin)\n\n\
                     add_executable({ident} src/main.cpp)\n"
                ),
            )
            .map_err(|e| e.to_string())?;
            fs::write(
                root.join("src").join("main.cpp"),
                "#include <iostream>\n\nint main() {\n    std::cout << \"Merhaba, ZenIDE!\" << std::endl;\n    return 0;\n}\n",
            )
            .map_err(|e| e.to_string())?;
            fs::write(root.join(".gitignore"), "build/\n").map_err(|e| e.to_string())?;
        }
        "python" => {
            fs::write(
                root.join("main.py"),
                "def main():\n    print(\"Merhaba, ZenIDE!\")\n\n\nif __name__ == \"__main__\":\n    main()\n",
            )
            .map_err(|e| e.to_string())?;
            fs::write(root.join("requirements.txt"), "").map_err(|e| e.to_string())?;
            fs::write(
                root.join(".gitignore"),
                ".venv/\n__pycache__/\n*.pyc\n",
            )
            .map_err(|e| e.to_string())?;
            let python = python_path.unwrap_or_else(|| "python".into());
            let _ = spawn_venv(&root, &python);
        }
        _ => return Err("Bilinmeyen proje türü.".into()),
    }

    Ok(root.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn create_project(
    kind: String,
    parent: String,
    name: String,
    python_path: Option<String>,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        create_project_blocking(kind, parent, name, python_path)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn create_venv(root: String, python_path: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let root_path = PathBuf::from(&root);
        if !root_path.is_dir() {
            return Err("Proje klasörü bulunamadı.".into());
        }
        let python = if python_path.trim().is_empty() {
            "python".to_string()
        } else {
            python_path
        };
        let target = venv_python_path(&root_path);
        if !target.exists() {
            spawn_venv(&root_path, &python)?;
        }
        if target.exists() {
            Ok(target.to_string_lossy().to_string())
        } else {
            Err("Sanal ortam oluşturulamadı. Python yolunu kontrol edin.".into())
        }
    })
    .await
    .map_err(|e| e.to_string())?
}
