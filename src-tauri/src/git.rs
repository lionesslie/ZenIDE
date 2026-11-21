use crate::process::command;
use serde::Serialize;
use std::path::Path;
use std::process::{Output, Stdio};

#[derive(Serialize, Clone)]
pub struct GitEntry {
    pub path: String,
    pub status: String,
    pub staged: bool,
    pub index: String,
    pub worktree: String,
}

#[derive(Serialize, Clone)]
pub struct GitStatus {
    pub is_repo: bool,
    pub branch: String,
    pub entries: Vec<GitEntry>,
    pub error: Option<String>,
}

#[derive(Serialize, Clone)]
pub struct GitCommit {
    pub hash: String,
    pub author: String,
    pub message: String,
    pub date: String,
}

async fn blocking<T, F>(work: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce() -> Result<T, String> + Send + 'static,
{
    tauri::async_runtime::spawn_blocking(work)
        .await
        .map_err(|e| e.to_string())?
}

fn run_git(root: &str, args: &[&str]) -> Result<Output, String> {
    let owned: Vec<String> = args.iter().map(|arg| arg.to_string()).collect();
    command("git", &owned)
        .current_dir(root)
        .stdin(Stdio::null())
        .output()
        .map_err(|e| format!("Git çalıştırılamadı: {e}"))
}

fn combined_output(output: &Output) -> String {
    let mut text = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr);
    if !stderr.trim().is_empty() {
        if !text.is_empty() && !text.ends_with('\n') {
            text.push('\n');
        }
        text.push_str(&stderr);
    }
    text
}

fn relative_path(root: &str, path: &str) -> String {
    let relative = Path::new(path)
        .strip_prefix(Path::new(root))
        .unwrap_or(Path::new(path));
    relative.to_string_lossy().replace('\\', "/")
}

#[tauri::command]
pub async fn git_status(root: String) -> Result<GitStatus, String> {
    blocking(move || {
        let probe = match run_git(&root, &["rev-parse", "--is-inside-work-tree"]) {
            Ok(output) => output,
            Err(error) => {
                return Ok(GitStatus {
                    is_repo: false,
                    branch: String::new(),
                    entries: Vec::new(),
                    error: Some(error),
                })
            }
        };
        if !probe.status.success() {
            return Ok(GitStatus {
                is_repo: false,
                branch: String::new(),
                entries: Vec::new(),
                error: Some("Bu klasör bir git deposu değil.".into()),
            });
        }

        let branch = run_git(&root, &["rev-parse", "--abbrev-ref", "HEAD"])
            .map(|output| String::from_utf8_lossy(&output.stdout).trim().to_string())
            .unwrap_or_default();

        let output = run_git(&root, &["status", "--porcelain", "--relative"])?;
        let mut entries = Vec::new();
        for line in String::from_utf8_lossy(&output.stdout).lines() {
            if line.len() < 4 {
                continue;
            }
            let index = line.chars().next().unwrap_or(' ');
            let worktree = line.chars().nth(1).unwrap_or(' ');
            let mut path = line[3..].to_string();
            if let Some((_, new_path)) = path.split_once(" -> ") {
                path = new_path.to_string();
            }
            path = path.trim_matches('"').to_string();
            let status = if index == '?' {
                "U".to_string()
            } else if worktree != ' ' {
                worktree.to_string()
            } else {
                index.to_string()
            };
            entries.push(GitEntry {
                path,
                status,
                staged: index != ' ' && index != '?',
                index: index.to_string(),
                worktree: worktree.to_string(),
            });
        }

        Ok(GitStatus {
            is_repo: true,
            branch,
            entries,
            error: None,
        })
    })
    .await
}

#[tauri::command]
pub async fn git_file_head(root: String, path: String) -> Result<String, String> {
    blocking(move || {
        let relative = relative_path(&root, &path);
        let prefix = run_git(&root, &["rev-parse", "--show-prefix"])
            .ok()
            .filter(|output| output.status.success())
            .map(|output| String::from_utf8_lossy(&output.stdout).trim().to_string())
            .unwrap_or_default();
        let output = run_git(&root, &["show", &format!("HEAD:{prefix}{relative}")])?;
        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            Ok(String::new())
        }
    })
    .await
}

#[tauri::command]
pub async fn git_diff(root: String, path: String, staged: bool) -> Result<String, String> {
    blocking(move || {
        let relative = relative_path(&root, &path);
        let mut args = vec!["diff", "--no-color"];
        if staged {
            args.push("--cached");
        }
        args.push("--");
        args.push(relative.as_str());
        let output = run_git(&root, &args)?;
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    })
    .await
}

#[tauri::command]
pub async fn git_log(root: String, limit: u32) -> Result<Vec<GitCommit>, String> {
    blocking(move || {
        let count = format!("-{limit}");
        let output = run_git(
            &root,
            &[
                "log",
                &count,
                "--pretty=format:%h%x1f%an%x1f%s%x1f%cr",
            ],
        )?;
        if !output.status.success() {
            return Ok(Vec::new());
        }
        let mut commits = Vec::new();
        for line in String::from_utf8_lossy(&output.stdout).lines() {
            let parts: Vec<&str> = line.split('\u{1f}').collect();
            if parts.len() >= 4 {
                commits.push(GitCommit {
                    hash: parts[0].to_string(),
                    author: parts[1].to_string(),
                    message: parts[2].to_string(),
                    date: parts[3].to_string(),
                });
            }
        }
        Ok(commits)
    })
    .await
}

#[tauri::command]
pub async fn git_commit(root: String, message: String) -> Result<String, String> {
    blocking(move || {
        let add = run_git(&root, &["add", "-A"])?;
        if !add.status.success() {
            return Err(combined_output(&add));
        }
        let commit = run_git(&root, &["commit", "-m", &message])?;
        if !commit.status.success() {
            return Err(combined_output(&commit));
        }
        Ok(combined_output(&commit))
    })
    .await
}

#[tauri::command]
pub async fn git_push(root: String) -> Result<String, String> {
    blocking(move || {
        let output = run_git(&root, &["push"])?;
        if output.status.success() {
            return Ok(combined_output(&output));
        }
        let branch = run_git(&root, &["rev-parse", "--abbrev-ref", "HEAD"])
            .map(|out| String::from_utf8_lossy(&out.stdout).trim().to_string())
            .unwrap_or_default();
        if !branch.is_empty() {
            let retry = run_git(&root, &["push", "--set-upstream", "origin", &branch])?;
            if retry.status.success() {
                return Ok(combined_output(&retry));
            }
            return Err(combined_output(&retry));
        }
        Err(combined_output(&output))
    })
    .await
}

#[tauri::command]
pub async fn git_pull(root: String) -> Result<String, String> {
    blocking(move || {
        let output = run_git(&root, &["pull"])?;
        if output.status.success() {
            Ok(combined_output(&output))
        } else {
            Err(combined_output(&output))
        }
    })
    .await
}

#[tauri::command]
pub async fn git_branches(root: String) -> Result<Vec<String>, String> {
    blocking(move || {
        let output = run_git(
            &root,
            &[
                "for-each-ref",
                "--format=%(refname:short)",
                "refs/heads",
            ],
        )?;
        if !output.status.success() {
            return Ok(Vec::new());
        }
        Ok(String::from_utf8_lossy(&output.stdout)
            .lines()
            .map(|line| line.trim().to_string())
            .filter(|line| !line.is_empty())
            .collect())
    })
    .await
}

#[tauri::command]
pub async fn git_checkout(root: String, branch: String) -> Result<String, String> {
    blocking(move || {
        let output = run_git(&root, &["checkout", &branch])?;
        if output.status.success() {
            Ok(combined_output(&output))
        } else {
            Err(combined_output(&output))
        }
    })
    .await
}

#[tauri::command]
pub async fn git_create_branch(root: String, branch: String) -> Result<String, String> {
    blocking(move || {
        let output = run_git(&root, &["checkout", "-b", &branch])?;
        if output.status.success() {
            Ok(combined_output(&output))
        } else {
            Err(combined_output(&output))
        }
    })
    .await
}

#[tauri::command]
pub async fn git_init(root: String) -> Result<String, String> {
    blocking(move || {
        let output = run_git(&root, &["init"])?;
        if output.status.success() {
            Ok(combined_output(&output))
        } else {
            Err(combined_output(&output))
        }
    })
    .await
}
