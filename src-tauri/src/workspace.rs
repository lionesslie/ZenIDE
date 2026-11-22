use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use std::path::{Path, PathBuf};
use std::sync::mpsc::Receiver;
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Emitter, State};

#[derive(Default)]
pub struct WorkspaceWatchState {
    watcher: Mutex<Option<RecommendedWatcher>>,
}

#[derive(Clone, Serialize)]
pub struct FsChanged {
    pub path: String,
    pub root: String,
}

fn is_ignored(path: &Path) -> bool {
    path.components().any(|component| {
        matches!(component.as_os_str().to_str(), Some(name) if matches!(
            name,
            ".git"
                | "node_modules"
                | "target"
                | "dist"
                | ".venv"
                | "venv"
                | "__pycache__"
                | ".idea"
                | ".vscode"
        ))
    })
}

fn is_relevant(event: &Event) -> bool {
    matches!(
        event.kind,
        EventKind::Create(_) | EventKind::Modify(_) | EventKind::Remove(_)
    ) && event.paths.iter().any(|path| !is_ignored(path))
}

fn listen(app: AppHandle, root: PathBuf, receiver: Receiver<notify::Result<Event>>) {
    std::thread::spawn(move || {
        let root_string = root.to_string_lossy().to_string();
        while let Ok(result) = receiver.recv() {
            let Ok(event) = result else { continue };
            if !is_relevant(&event) {
                continue;
            }
            let path = event
                .paths
                .first()
                .map(|value| value.to_string_lossy().to_string())
                .unwrap_or_else(|| root_string.clone());
            // A single save usually produces several notify events. Coalesce them
            // so the explorer is refreshed once with the final state on disk.
            while receiver.try_recv().is_ok() {}
            std::thread::sleep(Duration::from_millis(90));
            let _ = app.emit(
                "fs-changed",
                FsChanged {
                    path,
                    root: root_string.clone(),
                },
            );
        }
    });
}

#[tauri::command]
pub fn watch_workspace(
    path: String,
    app: AppHandle,
    state: State<'_, WorkspaceWatchState>,
) -> Result<(), String> {
    // Drop the previous watcher so only the active workspace is observed.
    if let Some(previous) = state.watcher.lock().unwrap().take() {
        drop(previous);
    }

    let root = PathBuf::from(&path);
    if path.trim().is_empty() || !root.is_dir() {
        return Ok(());
    }

    let (sender, receiver) = std::sync::mpsc::channel::<notify::Result<Event>>();
    let mut watcher = notify::recommended_watcher(sender)
        .map_err(|error| format!("File watcher could not be created: {error}"))?;
    watcher
        .watch(&root, RecursiveMode::Recursive)
        .map_err(|error| format!("Workspace could not be watched: {error}"))?;

    *state.watcher.lock().unwrap() = Some(watcher);
    listen(app, root, receiver);
    Ok(())
}
