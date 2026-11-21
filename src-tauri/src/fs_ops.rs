use serde::Serialize;
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::Path;
use walkdir::WalkDir;

#[derive(Serialize, Clone)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
}

#[derive(Serialize, Clone)]
pub struct SearchMatch {
    pub path: String,
    pub line: usize,
    pub column: usize,
    pub preview: String,
}

fn path_string(path: &Path) -> String {
    path.to_string_lossy().to_string()
}

#[tauri::command]
pub fn list_dir(path: String) -> Result<Vec<FileEntry>, String> {
    let mut entries = Vec::new();
    let dir = fs::read_dir(&path).map_err(|e| format!("{path} okunamadı: {e}"))?;
    for entry in dir {
        let entry = entry.map_err(|e| e.to_string())?;
        let entry_path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        let is_dir = entry
            .file_type()
            .map(|file_type| file_type.is_dir())
            .unwrap_or(false);
        entries.push(FileEntry {
            name,
            path: path_string(&entry_path),
            is_dir,
        });
    }
    entries.sort_by(|a, b| {
        b.is_dir
            .cmp(&a.is_dir)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });
    Ok(entries)
}

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    let meta = fs::metadata(&path).map_err(|e| format!("{path}: {e}"))?;
    if meta.len() > 10 * 1024 * 1024 {
        return Err("Dosya 10 MB sınırından büyük; editörde açılmadı.".into());
    }
    let bytes = fs::read(&path).map_err(|e| format!("{path} okunamadı: {e}"))?;
    let text = String::from_utf8_lossy(&bytes).to_string();
    Ok(text.trim_start_matches('\u{feff}').to_string())
}

#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<(), String> {
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, content).map_err(|e| format!("{path} yazılamadı: {e}"))
}

#[tauri::command]
pub fn create_file(path: String) -> Result<(), String> {
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&path)
        .map(|_| ())
        .map_err(|e| format!("{path} oluşturulamadı: {e}"))
}

#[tauri::command]
pub fn create_dir(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| format!("{path} oluşturulamadı: {e}"))
}

#[tauri::command]
pub fn rename_path(from: String, to: String) -> Result<(), String> {
    if Path::new(&to).exists() {
        return Err("Hedef konumda aynı isimde bir öğe zaten var.".into());
    }
    fs::rename(&from, &to).map_err(|e| format!("Yeniden adlandırılamadı: {e}"))
}

#[tauri::command]
pub fn delete_path(path: String) -> Result<(), String> {
    let meta = fs::metadata(&path).map_err(|e| e.to_string())?;
    if meta.is_dir() {
        fs::remove_dir_all(&path).map_err(|e| format!("{path} silinemedi: {e}"))
    } else {
        fs::remove_file(&path).map_err(|e| format!("{path} silinemedi: {e}"))
    }
}

#[tauri::command]
pub fn path_exists(path: String) -> bool {
    Path::new(&path).exists()
}

#[tauri::command]
pub fn home_dir() -> String {
    dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| ".".into())
}

fn is_excluded(entry: &walkdir::DirEntry, excludes: &[String]) -> bool {
    if entry.depth() == 0 {
        return false;
    }
    let name = entry.file_name().to_string_lossy().to_string();
    entry.file_type().is_dir() && excludes.iter().any(|excluded| excluded == &name)
}

#[tauri::command]
pub fn search_files(
    root: String,
    query: String,
    excludes: Vec<String>,
    limit: usize,
) -> Result<Vec<String>, String> {
    let needle = query.to_lowercase();
    let limit = limit.max(1);
    let mut results = Vec::new();
    let walker = WalkDir::new(&root)
        .sort_by_file_name()
        .into_iter()
        .filter_entry(|entry| !is_excluded(entry, &excludes));

    for entry in walker.filter_map(|entry| entry.ok()) {
        if !entry.file_type().is_file() {
            continue;
        }
        let name = entry.file_name().to_string_lossy().to_string();
        let relative = entry
            .path()
            .strip_prefix(&root)
            .unwrap_or(entry.path())
            .to_string_lossy()
            .replace('\\', "/");
        if needle.is_empty()
            || relative.to_lowercase().contains(&needle)
            || name.to_lowercase().contains(&needle)
        {
            results.push(path_string(entry.path()));
            if results.len() >= limit {
                break;
            }
        }
    }
    Ok(results)
}

fn is_binary_extension(ext: &str) -> bool {
    matches!(
        ext,
        "png"
            | "jpg"
            | "jpeg"
            | "gif"
            | "bmp"
            | "ico"
            | "pdf"
            | "zip"
            | "gz"
            | "tar"
            | "7z"
            | "rar"
            | "exe"
            | "dll"
            | "so"
            | "dylib"
            | "a"
            | "lib"
            | "obj"
            | "o"
            | "class"
            | "pyc"
            | "woff"
            | "woff2"
            | "ttf"
            | "otf"
            | "mp3"
            | "mp4"
            | "mov"
            | "avi"
            | "webp"
            | "icns"
            | "lock"
    )
}

#[tauri::command]
pub fn search_in_files(
    root: String,
    query: String,
    case_sensitive: bool,
    excludes: Vec<String>,
) -> Result<Vec<SearchMatch>, String> {
    if query.is_empty() {
        return Ok(Vec::new());
    }
    let needle = if case_sensitive {
        query.clone()
    } else {
        query.to_lowercase()
    };
    let mut results = Vec::new();
    let walker = WalkDir::new(&root)
        .sort_by_file_name()
        .into_iter()
        .filter_entry(|entry| !is_excluded(entry, &excludes));

    for entry in walker.filter_map(|entry| entry.ok()) {
        if results.len() >= 800 {
            break;
        }
        if !entry.file_type().is_file() {
            continue;
        }
        let meta = match entry.metadata() {
            Ok(meta) => meta,
            Err(_) => continue,
        };
        if meta.len() > 1_500_000 {
            continue;
        }
        let extension = entry
            .path()
            .extension()
            .map(|ext| ext.to_string_lossy().to_lowercase())
            .unwrap_or_default();
        if is_binary_extension(&extension) {
            continue;
        }
        let file = match fs::File::open(entry.path()) {
            Ok(file) => file,
            Err(_) => continue,
        };
        let reader = BufReader::new(file);
        for (index, line) in reader.lines().enumerate() {
            let Ok(line) = line else { continue };
            let haystack = if case_sensitive {
                line.clone()
            } else {
                line.to_lowercase()
            };
            if let Some(byte_index) = haystack.find(&needle) {
                let column = line
                    .get(..byte_index)
                    .map(|prefix| prefix.chars().count() + 1)
                    .unwrap_or(1);
                let preview: String = line.trim().chars().take(200).collect();
                results.push(SearchMatch {
                    path: path_string(entry.path()),
                    line: index + 1,
                    column,
                    preview,
                });
                if results.len() >= 800 {
                    break;
                }
            }
        }
    }
    Ok(results)
}
