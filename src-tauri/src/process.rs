use serde::Serialize;
use std::collections::HashMap;
use std::io::{BufRead, BufReader};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};

#[derive(Default)]
pub struct ProcState {
    pub children: Mutex<HashMap<u32, Arc<Mutex<Child>>>>,
}

#[derive(Clone, Serialize)]
struct TaskOutput {
    id: u32,
    stream: String,
    data: String,
}

#[derive(Clone, Serialize)]
struct TaskExit {
    id: u32,
    code: Option<i32>,
}

#[derive(Serialize)]
pub struct Capture {
    pub code: Option<i32>,
    pub stdout: String,
    pub stderr: String,
}

pub fn hide_window(cmd: &mut Command) {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x0800_0000);
    }
    #[cfg(not(windows))]
    {
        let _ = cmd;
    }
}

pub fn command(program: &str, args: &[String]) -> Command {
    #[cfg(windows)]
    {
        let lower = program.to_lowercase();
        if lower.ends_with(".cmd") || lower.ends_with(".bat") {
            let mut cmd = Command::new("cmd.exe");
            cmd.arg("/C").arg(program).args(args);
            hide_window(&mut cmd);
            return cmd;
        }
    }
    let mut cmd = Command::new(program);
    cmd.args(args);
    hide_window(&mut cmd);
    cmd
}

#[tauri::command]
pub fn run_process(
    app: AppHandle,
    state: tauri::State<'_, ProcState>,
    id: u32,
    program: String,
    args: Vec<String>,
    cwd: Option<String>,
    env: Option<HashMap<String, String>>,
) -> Result<u32, String> {
    let mut cmd = command(&program, &args);
    if let Some(cwd) = cwd.filter(|value| !value.is_empty()) {
        cmd.current_dir(cwd);
    }
    if let Some(env) = env {
        for (key, value) in env {
            cmd.env(key, value);
        }
    }
    cmd.stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("'{program}' başlatılamadı: {e}"))?;

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();
    let child = Arc::new(Mutex::new(child));
    state
        .children
        .lock()
        .unwrap()
        .insert(id, child.clone());

    if let Some(stdout) = stdout {
        let app = app.clone();
        thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines() {
                let Ok(line) = line else { break };
                let _ = app.emit(
                    "task-output",
                    TaskOutput {
                        id,
                        stream: "stdout".into(),
                        data: format!("{line}\n"),
                    },
                );
            }
        });
    }

    if let Some(stderr) = stderr {
        let app = app.clone();
        thread::spawn(move || {
            let reader = BufReader::new(stderr);
            for line in reader.lines() {
                let Ok(line) = line else { break };
                let _ = app.emit(
                    "task-output",
                    TaskOutput {
                        id,
                        stream: "stderr".into(),
                        data: format!("{line}\n"),
                    },
                );
            }
        });
    }

    let app_exit = app.clone();
    let child_exit = child.clone();
    thread::spawn(move || loop {
        let status = child_exit.lock().unwrap().try_wait();
        match status {
            Ok(Some(status)) => {
                let _ = app_exit.emit(
                    "task-exit",
                    TaskExit {
                        id,
                        code: status.code(),
                    },
                );
                app_exit
                    .state::<ProcState>()
                    .children
                    .lock()
                    .unwrap()
                    .remove(&id);
                break;
            }
            Ok(None) => thread::sleep(Duration::from_millis(120)),
            Err(_) => break,
        }
    });

    Ok(id)
}

#[tauri::command]
pub fn kill_process(state: tauri::State<'_, ProcState>, id: u32) -> Result<(), String> {
    if let Some(child) = state.children.lock().unwrap().remove(&id) {
        child
            .lock()
            .unwrap()
            .kill()
            .map_err(|e| format!("Süreç durdurulamadı: {e}"))?;
    }
    Ok(())
}

#[tauri::command]
pub async fn run_capture(
    program: String,
    args: Vec<String>,
    cwd: Option<String>,
) -> Result<Capture, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut cmd = command(&program, &args);
        if let Some(cwd) = cwd.filter(|value| !value.is_empty()) {
            cmd.current_dir(cwd);
        }
        cmd.stdin(Stdio::null());
        let output = cmd
            .output()
            .map_err(|e| format!("'{program}' çalıştırılamadı: {e}"))?;
        Ok(Capture {
            code: output.status.code(),
            stdout: String::from_utf8_lossy(&output.stdout).to_string(),
            stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

pub fn shutdown(app: &AppHandle) {
    let state = app.state::<ProcState>();
    let children: Vec<_> = state.children.lock().unwrap().drain().map(|(_, c)| c).collect();
    for child in children {
        let _ = child.lock().unwrap().kill();
    }
}
