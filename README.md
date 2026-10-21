# Fedora Theme Tailor

Fedora Theme Tailor is a desktop app for editing GTK 3, GTK 4, and GNOME Shell appearance settings. Changes can be previewed before applying; the app also includes presets and backups.

## Build from source

On Fedora, install the [Tauri Linux prerequisites](https://v2.tauri.app/start/prerequisites/), plus Node.js 22 and Rust. Then run:

```sh
cd fedora-theme-tailor
npm ci
npm run tauri -- build
```

The RPM build is written to `src-tauri/target/release/bundle/rpm/`.

## Download and install

The GitHub Actions workflow builds an RPM and publishes a GitHub Release for every branch push. Each release lists commits since the previous RPM build. Download the RPM from the latest release and install it with:

```sh
sudo dnf install ./<downloaded-rpm-file>.rpm
```

## Apply and restore themes

Use the app preview to review changes before applying them. Keep the generated backups so you can roll back or restore your original GTK files if needed. GTK themes affect GTK applications; GNOME Shell styling depends on GNOME Shell and the User Themes extension.
