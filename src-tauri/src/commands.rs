// Comando de exemplo - será expandido depois
#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to Log Analyzer!", name)
}

// TODO: Adicionar comandos de parsing
// - parse_log
// - analyze_log
// - detect_format
// - search_logs
// - export_log