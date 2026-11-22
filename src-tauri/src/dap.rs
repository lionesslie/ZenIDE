use crate::process::command;
use serde::Serialize;
use std::collections::HashMap;
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, ChildStdin, Stdio};
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::{AppHandle, Emitter, Manager};

pub struct DapSession {
    stdin: Arc<Mutex<ChildStdin>>,
    child: Arc<Mutex<Child>>,
}

#[derive(Default)]
pub struct DapState {
    pub sessions: Mutex<HashMap<u32, DapSession>>,
    pub next: AtomicU32,
}

#[derive(Clone, Serialize)]
struct RpcMessage {
    session: u32,
    message: String,
}

#[derive(Clone, Serialize)]
struct RpcStderr {
    session: u32,
    data: String,
}

#[derive(Clone, Serialize)]
struct RpcExit {
    session: u32,
}

fn read_frame<R: BufRead>(reader: &mut R) -> std::io::Result<Option<String>> {
    let mut content_length: Option<usize> = None;
    loop {
        let mut line = String::new();
        let read = reader.read_line(&mut line)?;
        if read == 0 {
            return Ok(None);
        }
        let trimmed = line.trim_end();
        if trimmed.is_empty() {
            break;
        }
        if let Some(rest) = trimmed.strip_prefix("Content-Length:") {
            content_length = rest.trim().parse::<usize>().ok();
        }
    }
    let Some(length) = content_length else {
        return Ok(None);
    };
    let mut buffer = vec![0u8; length];
    reader.read_exact(&mut buffer)?;
    Ok(Some(String::from_utf8_lossy(&buffer).to_string()))
}

#[tauri::command]
pub fn dap_start(
    app: AppHandle,
    state: tauri::State<'_, DapState>,
    program: String,
    args: Vec<String>,
    cwd: Option<String>,
) -> Result<u32, String> {
    let mut cmd = command(&program, &args);
    if let Some(cwd) = cwd.filter(|value| !value.is_empty()) {
        cmd.current_dir(cwd);
    }
    cmd.stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Debugger could not be started ({program}): {e}"))?;
    let stdin = child.stdin.take().ok_or("DAP stdin could not be obtained.")?;
    let stdout = child.stdout.take().ok_or("DAP stdout could not be obtained.")?;
    let stderr = child.stderr.take();
    let id = state.next.fetch_add(1, Ordering::SeqCst) + 1;

    let app_output = app.clone();
    thread::spawn(move || {
        let mut reader = BufReader::new(stdout);
        loop {
            match read_frame(&mut reader) {
                Ok(Some(message)) => {
                    if app_output
                        .emit(
                            "dap-message",
                            RpcMessage {
                                session: id,
                                message,
                            },
                        )
                        .is_err()
                    {
                        break;
                    }
                }
                Ok(None) => break,
                Err(_) => break,
            }
        }
        let _ = app_output.emit("dap-exit", RpcExit { session: id });
    });

    if let Some(stderr) = stderr {
        let app_error = app.clone();
        thread::spawn(move || {
            let reader = BufReader::new(stderr);
            for line in reader.lines() {
                let Ok(line) = line else { break };
                let _ = app_error.emit(
                    "dap-stderr",
                    RpcStderr {
                        session: id,
                        data: line,
                    },
                );
            }
        });
    }

    let stdin = Arc::new(Mutex::new(stdin));
    let child = Arc::new(Mutex::new(child));
    state
        .sessions
        .lock()
        .unwrap()
        .insert(id, DapSession { stdin, child });
    Ok(id)
}

#[tauri::command]
pub fn dap_send(
    state: tauri::State<'_, DapState>,
    session: u32,
    message: String,
) -> Result<(), String> {
    let sessions = state.sessions.lock().unwrap();
    let entry = sessions
        .get(&session)
        .ok_or_else(|| "DAP session not found.".to_string())?;
    let mut stdin = entry.stdin.lock().unwrap();
    write!(
        stdin,
        "Content-Length: {}\r\n\r\n{}",
        message.as_bytes().len(),
        message
    )
    .and_then(|_| stdin.flush())
    .map_err(|e| format!("Could not write to DAP: {e}"))
}

#[tauri::command]
pub fn dap_stop(state: tauri::State<'_, DapState>, session: u32) -> Result<(), String> {
    if let Some(entry) = state.sessions.lock().unwrap().remove(&session) {
        let _ = entry.child.lock().unwrap().kill();
    }
    Ok(())
}

pub fn shutdown(app: &AppHandle) {
    let state = app.state::<DapState>();
    let sessions: Vec<_> = state
        .sessions
        .lock()
        .unwrap()
        .drain()
        .map(|(_, session)| session)
        .collect();
    for session in sessions {
        let _ = session.child.lock().unwrap().kill();
    }
}
