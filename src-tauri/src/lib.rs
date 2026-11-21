mod config;
mod dap;
mod fs_ops;
mod git;
mod lsp;
mod process;
mod projects;
mod pty;

pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(pty::PtyState::default())
        .manage(process::ProcState::default())
        .manage(lsp::LspState::default())
        .manage(dap::DapState::default())
        .setup(|app| {
            if let Err(err) = config::init(app.handle()) {
                eprintln!("ZenIDE config initialization failed: {err}");
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            config::get_config,
            config::get_config_path,
            config::save_config,
            config::reload_config,
            fs_ops::list_dir,
            fs_ops::read_file,
            fs_ops::write_file,
            fs_ops::create_file,
            fs_ops::create_dir,
            fs_ops::rename_path,
            fs_ops::delete_path,
            fs_ops::path_exists,
            fs_ops::home_dir,
            fs_ops::search_files,
            fs_ops::search_in_files,
            projects::detect_project,
            projects::create_project,
            projects::create_venv,
            process::run_process,
            process::kill_process,
            process::run_capture,
            pty::pty_spawn,
            pty::pty_write,
            pty::pty_resize,
            pty::pty_kill,
            lsp::lsp_start,
            lsp::lsp_send,
            lsp::lsp_stop,
            dap::dap_start,
            dap::dap_send,
            dap::dap_stop,
            git::git_status,
            git::git_file_head,
            git::git_diff,
            git::git_log,
            git::git_commit,
            git::git_push,
            git::git_pull,
            git::git_branches,
            git::git_checkout,
            git::git_create_branch,
            git::git_init,
        ])
        .build(tauri::generate_context!())
        .expect("error while building ZenIDE");

    app.run(|handle, event| {
        if let tauri::RunEvent::Exit = event {
            lsp::shutdown(handle);
            dap::shutdown(handle);
            pty::shutdown(handle);
            process::shutdown(handle);
        }
    });
}
