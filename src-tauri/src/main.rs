// Prevents additional console window on Windows in release mode
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::greet,
            // Adicionar mais comandos aqui conforme implementarmos
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}