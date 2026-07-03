use std::io::{Read, Write};
use std::net::TcpListener;
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use std::time::Duration;

use tauri::{AppHandle, Emitter, Manager};

static OAUTH_LISTENER_BUSY: AtomicBool = AtomicBool::new(false);

#[derive(Clone, serde::Serialize)]
struct OAuthCallbackPayload {
    token: Option<String>,
    error: Option<String>,
}

fn percent_decode(input: &str) -> String {
    let bytes = input.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let Ok(v) = u8::from_str_radix(
                std::str::from_utf8(&bytes[i + 1..i + 3]).unwrap_or(""),
                16,
            ) {
                out.push(v);
                i += 3;
                continue;
            }
        }
        if bytes[i] == b'+' {
            out.push(b' ');
        } else {
            out.push(bytes[i]);
        }
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

fn parse_query(query: &str) -> (Option<String>, Option<String>) {
    let mut token = None;
    let mut error = None;
    for pair in query.split('&') {
        let mut parts = pair.splitn(2, '=');
        let key = parts.next().unwrap_or("");
        let value = percent_decode(parts.next().unwrap_or(""));
        match key {
            "token" if !value.is_empty() => token = Some(value),
            "error" if !value.is_empty() => error = Some(value),
            _ => {}
        }
    }
    (token, error)
}

fn parse_oauth_request(req: &str) -> (Option<String>, Option<String>) {
    let line = req.lines().next().unwrap_or("");
    let path = line.split_whitespace().nth(1).unwrap_or("");
    let query = path.split('?').nth(1).unwrap_or("");
    parse_query(query)
}

fn oauth_success_html() -> &'static str {
    r#"<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>BibliaAPP</title></head>
<body style="font-family:system-ui,sans-serif;text-align:center;padding:3rem;background:#FAF8F5;color:#3D3835">
<h1>Sesión iniciada</h1>
<p>Ya puedes cerrar esta pestaña y volver a BibliaAPP.</p>
</body></html>"#
}

fn oauth_error_html(message: &str) -> String {
    format!(
        r#"<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>BibliaAPP</title></head>
<body style="font-family:system-ui,sans-serif;text-align:center;padding:3rem;background:#FAF8F5;color:#3D3835">
<h1>No se pudo iniciar sesión</h1>
<p>{message}</p>
</body></html>"#
    )
}

#[tauri::command]
fn start_google_oauth_listener(app: AppHandle) -> Result<u16, String> {
    if OAUTH_LISTENER_BUSY.swap(true, Ordering::SeqCst) {
        return Err("Ya hay un inicio de sesión con Google en curso.".into());
    }

    let listener =
        TcpListener::bind("127.0.0.1:0").map_err(|e| format!("No se pudo abrir localhost: {e}"))?;
    listener
        .set_nonblocking(false)
        .map_err(|e| e.to_string())?;
    let port = listener
        .local_addr()
        .map_err(|e| e.to_string())?
        .port();

    let app_handle = app.clone();
    thread::spawn(move || {
        let _busy = OAuthBusyGuard;
        let deadline = std::time::Instant::now() + Duration::from_secs(120);

        while std::time::Instant::now() < deadline {
            if listener.set_nonblocking(true).is_err() {
                break;
            }
            let (mut stream, _) = match listener.accept() {
                Ok(pair) => pair,
                Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                    thread::sleep(Duration::from_millis(100));
                    continue;
                }
                Err(_) => break,
            };

            let _ = stream.set_read_timeout(Some(Duration::from_secs(10)));
            let mut buf = [0u8; 8192];
            let n = stream.read(&mut buf).unwrap_or(0);
            let req = String::from_utf8_lossy(&buf[..n]);
            let (token, error) = parse_oauth_request(&req);

            // Ignorar favicon/probes hasta recibir token o error OAuth
            if token.is_none() && error.is_none() {
                let _ = stream.write_all(b"HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n");
                continue;
            }

            let body = if error.is_some() {
                oauth_error_html(error.as_deref().unwrap_or("Error desconocido"))
            } else {
                oauth_success_html().to_string()
            };

            let _ = app_handle.emit_to(
                "main",
                "google-oauth-callback",
                OAuthCallbackPayload { token, error },
            );
            let response = format!(
                "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                body.len(),
                body
            );
            let _ = stream.write_all(response.as_bytes());
            let _ = stream.flush();
            break;
        }

        if let Some(window) = app_handle.get_webview_window("main") {
            let _ = window.unminimize();
            let _ = window.show();
            let _ = window.set_focus();
        }
    });

    Ok(port)
}

struct OAuthBusyGuard;

impl Drop for OAuthBusyGuard {
    fn drop(&mut self) {
        OAUTH_LISTENER_BUSY.store(false, Ordering::SeqCst);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }));
    }

    builder
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![start_google_oauth_listener])
        .setup(|app| {
            #[cfg(desktop)]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                let _ = app.deep_link().register_all();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
