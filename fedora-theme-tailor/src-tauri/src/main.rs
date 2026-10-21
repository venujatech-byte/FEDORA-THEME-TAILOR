use serde::Serialize;
use std::{collections::BTreeMap, fs, path::PathBuf, process::Command};

#[derive(Serialize)]
struct DesktopApp {
    id: String,
    name: String,
    icon: String,
}

fn desktop_dirs() -> Vec<PathBuf> {
    let home = dirs::home_dir().unwrap_or_default();
    [
        home.join(".local/share/applications"),
        PathBuf::from("/usr/share/applications"),
        PathBuf::from("/var/lib/flatpak/exports/share/applications"),
    ]
    .into_iter()
    .collect()
}

#[tauri::command]
fn list_desktop_apps() -> Vec<DesktopApp> {
    let mut apps = BTreeMap::new();
    for dir in desktop_dirs() {
        let Ok(entries) = fs::read_dir(dir) else {
            continue;
        };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().is_none_or(|ext| ext != "desktop") {
                continue;
            }
            let Ok(text) = fs::read_to_string(&path) else {
                continue;
            };
            let mut section = false;
            let mut name = String::new();
            let mut icon = String::new();
            let mut hidden = false;
            for line in text.lines() {
                if line.starts_with('[') {
                    section = line == "[Desktop Entry]";
                    continue;
                }
                if !section {
                    continue;
                }
                if let Some(v) = line.strip_prefix("Name=") {
                    if name.is_empty() {
                        name = v.into();
                    }
                }
                if let Some(v) = line.strip_prefix("Icon=") {
                    icon = v.into();
                }
                if line == "NoDisplay=true" || line == "Hidden=true" {
                    hidden = true;
                }
            }
            let Some(id) = path.file_name().and_then(|n| n.to_str()).map(str::to_owned) else {
                continue;
            };
            if !hidden && !name.is_empty() {
                apps.insert(id.clone(), DesktopApp { id, name, icon });
            }
        }
    }
    apps.into_values().collect()
}

fn valid_desktop_id(id: &str) -> bool {
    id.ends_with(".desktop")
        && id
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b"._-".contains(&b))
}

#[tauri::command]
fn set_app_icon(id: String, icon: String) -> Result<(), String> {
    if !valid_desktop_id(&id)
        || icon.trim().is_empty()
        || icon.contains('\n')
        || icon.contains('\r')
    {
        return Err("Invalid application or icon".into());
    }
    let home = dirs::home_dir().ok_or("Home directory unavailable")?;
    let target = home.join(".local/share/applications").join(&id);
    let backup = target.with_extension("desktop.fedora-theme-tailor-original");
    let source = if target.exists() {
        target.clone()
    } else {
        desktop_dirs()
            .into_iter()
            .skip(1)
            .map(|d| d.join(&id))
            .find(|p| p.exists())
            .ok_or("Application launcher not found")?
    };
    let mut text = fs::read_to_string(&source).map_err(|e| e.to_string())?;
    if !backup.exists() && target.exists() {
        fs::copy(&target, &backup).map_err(|e| e.to_string())?;
    }
    let mut section = false;
    let mut replaced = false;
    let mut updated = Vec::new();
    for line in text.lines() {
        if line.starts_with('[') {
            section = line == "[Desktop Entry]";
        }
        if section && line.starts_with("Icon=") {
            updated.push(format!("Icon={icon}"));
            replaced = true;
        } else {
            updated.push(line.to_owned());
        }
    }
    if !replaced {
        return Err("Application launcher has no Icon entry".into());
    }
    text = updated.join("\n") + "\n";
    fs::create_dir_all(target.parent().unwrap()).map_err(|e| e.to_string())?;
    fs::write(target, text).map_err(|e| e.to_string())
}

#[tauri::command]
fn reset_app_icon(id: String) -> Result<(), String> {
    if !valid_desktop_id(&id) {
        return Err("Invalid application".into());
    }
    let target = dirs::home_dir()
        .ok_or("Home directory unavailable")?
        .join(".local/share/applications")
        .join(&id);
    let backup = target.with_extension("desktop.fedora-theme-tailor-original");
    if backup.exists() {
        fs::rename(backup, target).map_err(|e| e.to_string())
    } else if target.exists() {
        fs::remove_file(target).map_err(|e| e.to_string())
    } else {
        Ok(())
    }
}

#[tauri::command]
fn get_touchpad_settings() -> Result<BTreeMap<String, String>, String> {
    let mut settings = BTreeMap::new();
    for key in [
        "tap-to-click",
        "natural-scroll",
        "two-finger-scrolling-enabled",
        "disable-while-typing",
        "tap-and-drag",
        "middle-click-emulation",
        "speed",
    ] {
        let output = Command::new("gsettings")
            .args(["get", "org.gnome.desktop.peripherals.touchpad", key])
            .output()
            .map_err(|e| e.to_string())?;
        if output.status.success() {
            settings.insert(
                key.into(),
                String::from_utf8_lossy(&output.stdout).trim().into(),
            );
        }
    }
    Ok(settings)
}

#[tauri::command]
fn set_touchpad_setting(key: String, value: String) -> Result<(), String> {
    let bool_keys = [
        "tap-to-click",
        "natural-scroll",
        "two-finger-scrolling-enabled",
        "disable-while-typing",
        "tap-and-drag",
        "middle-click-emulation",
    ];
    if bool_keys.contains(&key.as_str()) && ["true", "false"].contains(&value.as_str())
        || key == "speed"
            && value
                .parse::<f64>()
                .is_ok_and(|v| (-1.0..=1.0).contains(&v))
    {
        let status = Command::new("gsettings")
            .args([
                "set",
                "org.gnome.desktop.peripherals.touchpad",
                &key,
                &value,
            ])
            .status()
            .map_err(|e| e.to_string())?;
        if status.success() {
            return Ok(());
        }
    }
    Err("Unsupported touchpad setting or value".into())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            list_desktop_apps,
            set_app_icon,
            reset_app_icon,
            get_touchpad_settings,
            set_touchpad_setting
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn main() {
    run();
}
