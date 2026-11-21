use base64::{engine::general_purpose::STANDARD, Engine as _};
use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use serde::Serialize;
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Mutex;
use std::thread;
use tauri::{AppHandle, Emitter, Manager};

pub struct PtySession {
    master: Box<dyn MasterPty + Send>,
    writer: Box<dyn Write + Send>,
    child: Box<dyn portable_pty::Child + Send + Sync>,
}

#[derive(Default)]
pub struct PtyState {
    pub sessions: Mutex<HashMap<u32, PtySession>>,
}

#[derive(Clone, Serialize)]
struct PtyOutput {
    id: u32,
    data: String,
}

#[derive(Clone, Serialize)]
struct PtyExit {
    id: u32,
}

fn default_shell() -> String {
    #[cfg(windows)]
    {
        if let Ok(system_root) = std::env::var("SystemRoot") {
            let powershell = format!(
                "{system_root}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"
            );
            if std::path::Path::new(&powershell).exists() {
                return powershell;
            }
        }
        std::env::var("COMSPEC").unwrap_or_else(|_| "cmd.exe".into())
    }
    #[cfg(not(windows))]
    {
        std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".into())
    }
}

#[tauri::command]
pub fn pty_spawn(
    app: AppHandle,
    state: tauri::State<'_, PtyState>,
    id: u32,
    cwd: Option<String>,
    shell: Option<String>,
    cols: u16,
    rows: u16,
) -> Result<u32, String> {
    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize {
            rows: rows.max(2),
            cols: cols.max(2),
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("PTY açılamadı: {e}"))?;

    let shell_command = shell
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(default_shell);
    let mut cmd = CommandBuilder::new(shell_command);
    let workdir = cwd
        .filter(|value| !value.is_empty())
        .or_else(|| dirs::home_dir().map(|path| path.to_string_lossy().to_string()));
    if let Some(workdir) = workdir {
        cmd.cwd(workdir);
    }
    cmd.env("TERM", "xterm-256color");
    cmd.env("TERM_PROGRAM", "ZenIDE");

    let child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("Terminal başlatılamadı: {e}"))?;
    drop(pair.slave);

    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| format!("Terminal çıktısı okunamadı: {e}"))?;
    let writer = pair
        .master
        .take_writer()
        .map_err(|e| format!("Terminal girişi alınamadı: {e}"))?;

    let app_output = app.clone();
    thread::spawn(move || {
        let mut buffer = [0u8; 8192];
        loop {
            match reader.read(&mut buffer) {
                Ok(0) => break,
                Ok(n) => {
                    let data = STANDARD.encode(&buffer[..n]);
                    if app_output.emit("pty-output", PtyOutput { id, data }).is_err() {
                        break;
                    }
                }
                Err(_) => break,
            }
        }
        let _ = app_output.emit("pty-exit", PtyExit { id });
    });

    state.sessions.lock().unwrap().insert(
        id,
        PtySession {
            master: pair.master,
            writer,
            child,
        },
    );
    Ok(id)
}

#[tauri::command]
pub fn pty_write(
    state: tauri::State<'_, PtyState>,
    id: u32,
    data: String,
) -> Result<(), String> {
    let mut sessions = state.sessions.lock().unwrap();
    let session = sessions
        .get_mut(&id)
        .ok_or_else(|| "Terminal oturumu bulunamadı.".to_string())?;
    session
        .writer
        .write_all(data.as_bytes())
        .and_then(|_| session.writer.flush())
        .map_err(|e| format!("Terminale yazılamadı: {e}"))
}

#[tauri::command]
pub fn pty_resize(
    state: tauri::State<'_, PtyState>,
    id: u32,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let sessions = state.sessions.lock().unwrap();
    let session = sessions
        .get(&id)
        .ok_or_else(|| "Terminal oturumu bulunamadı.".to_string())?;
    session
        .master
        .resize(PtySize {
            rows: rows.max(2),
            cols: cols.max(2),
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Terminal boyutlandırılamadı: {e}"))
}

#[tauri::command]
pub fn pty_kill(state: tauri::State<'_, PtyState>, id: u32) -> Result<(), String> {
    if let Some(mut session) = state.sessions.lock().unwrap().remove(&id) {
        let _ = session.child.kill();
    }
    Ok(())
}

pub fn shutdown(app: &AppHandle) {
    let state = app.state::<PtyState>();
    let sessions: Vec<_> = state
        .sessions
        .lock()
        .unwrap()
        .drain()
        .map(|(_, session)| session)
        .collect();
    for mut session in sessions {
        let _ = session.child.kill();
    }
}
