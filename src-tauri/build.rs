use std::process::Command;

fn main() {
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap_or_default();
    let root = std::path::Path::new(&manifest_dir).join("..");
    let frontend_dist = root.join("dist/index.html");
    println!("cargo:rerun-if-changed=../dist/index.html");
    if !frontend_dist.exists() {
        match Command::new("npm").arg("run").arg("build").current_dir(&root).status() {
            Ok(status) if status.success() => {}
            Ok(_) => panic!("frontend build failed; run `npm run build` manually"),
            Err(_) => panic!(
                "Node.js/npm not found. Install Node.js (https://nodejs.org) and run `npm run build`, then `cargo build` again."
            ),
        }
    }
    tauri_build::build()
}