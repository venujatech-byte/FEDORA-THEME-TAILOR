export interface ColorTokens {
  window_bg_color: string;
  window_fg_color: string;
  view_bg_color: string;
  view_fg_color: string;
  card_bg_color: string;
  dialog_bg_color: string;
  popover_bg_color: string;
  headerbar_bg_color: string;
  headerbar_fg_color: string;
  headerbar_border_color: string;
  headerbar_backdrop_color: string;
  sidebar_bg_color: string;
  sidebar_fg_color: string;
  sidebar_backdrop_color: string;
  sidebar_border_color: string;
  secondary_sidebar_bg_color: string;
  secondary_sidebar_backdrop_color: string;
}

export interface GeometryTokens {
  headerbar_min_height: number;
  headerbar_padding_top: number;
  headerbar_padding_bottom: number;
  gtk4_button_min_height: number;
  gtk4_button_min_width: number;
  gtk4_button_padding: number;
  gtk4_button_margin: number;
  gtk4_title_min_height: number;
  gtk3_button_min_height: number;
  gtk3_button_min_width: number;
  gtk3_button_padding: number;
  gtk3_button_margin: number;
  gtk3_title_min_height: number;
  disable_overshoot: boolean;
}

export interface ThemeState {
  colors: ColorTokens;
  geometry: GeometryTokens;
  presetName: string;
}

export const DEFAULT_COLORS: ColorTokens = {
  window_bg_color: '#000000',
  window_fg_color: '#ffffff',
  view_bg_color: '#000000',
  view_fg_color: '#ffffff',
  card_bg_color: '#141414',
  dialog_bg_color: '#141414',
  popover_bg_color: '#141414',
  headerbar_bg_color: '#1e232d',
  headerbar_fg_color: '#ffffff',
  headerbar_border_color: '#1e232d',
  headerbar_backdrop_color: '#1e232d',
  sidebar_bg_color: '#1e232d',
  sidebar_fg_color: '#ffffff',
  sidebar_backdrop_color: '#1e232d',
  sidebar_border_color: '#1e232d',
  secondary_sidebar_bg_color: '#1e232d',
  secondary_sidebar_backdrop_color: '#1e232d',
};

export const DEFAULT_GEOMETRY: GeometryTokens = {
  headerbar_min_height: 26,
  headerbar_padding_top: 1,
  headerbar_padding_bottom: 1,
  gtk4_button_min_height: 18,
  gtk4_button_min_width: 18,
  gtk4_button_padding: 3,
  gtk4_button_margin: 0,
  gtk4_title_min_height: 18,
  gtk3_button_min_height: 15,
  gtk3_button_min_width: 15,
  gtk3_button_padding: 3,
  gtk3_button_margin: 0,
  gtk3_title_min_height: 15,
  disable_overshoot: true,
};

export const BUILTIN_PRESETS: Record<string, ThemeState> = {
  'Fedora OLED Slate Compact': {
    colors: DEFAULT_COLORS,
    geometry: DEFAULT_GEOMETRY,
    presetName: 'Fedora OLED Slate Compact',
  },
};

const COLOR_TOKEN_KEYS = Object.keys(DEFAULT_COLORS) as (keyof ColorTokens)[];
const PRESET_STORAGE_KEY = 'fedora-theme-tailor.presets';

export class ThemeEngine {
  state: ThemeState = {
    colors: { ...DEFAULT_COLORS },
    geometry: { ...DEFAULT_GEOMETRY },
    presetName: 'Custom',
  };
  listeners: Set<() => void> = new Set();

  constructor() {
    try {
      const saved = JSON.parse(localStorage.getItem(PRESET_STORAGE_KEY) || '{}') as Record<string, ThemeState>;
      Object.entries(saved).forEach(([name, preset]) => {
        if (name !== 'Fedora OLED Slate Compact' && preset?.colors && preset?.geometry) BUILTIN_PRESETS[name] = preset;
      });
    } catch {}
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  notify() {
    this.listeners.forEach(fn => fn());
  }

  getCSS(): string {
    const { colors, geometry } = this.state;
    const px = (v: number) => `${v}px`;

    const colorDefs = COLOR_TOKEN_KEYS.map(key =>
      `@define-color ${key} ${colors[key]};`
    ).join('\n');

    const headerbarHeight = px(geometry.headerbar_min_height);

    const css = `
${colorDefs}

/* Titlebar & Tabbar Unification */
headerbar,
.titlebar,
windowcontrols,
tabbar,
tab {
  background-color: @headerbar_bg_color !important;
  background-image: none !important;
}

/* Compact Headerbar Geometry */
headerbar {
  min-height: ${headerbarHeight} !important;
  padding-top: ${px(geometry.headerbar_padding_top)} !important;
  padding-bottom: ${px(geometry.headerbar_padding_bottom)} !important;
}

/* Sidebar Overrides & Transparent Lists */
.navigation-sidebar,
navigation-sidebar,
stacksidebar,
.sidebar {
  background-color: @sidebar_bg_color !important;
}

.navigation-sidebar list,
.navigation-sidebar listview,
stacksidebar list {
  background-color: transparent !important;
}

/* Compact GTK4 Window Controls & Title */
windowcontrols button,
windowcontrols button.image-button {
  min-height: ${px(geometry.gtk4_button_min_height)} !important;
  min-width: ${px(geometry.gtk4_button_min_width)} !important;
  padding: 0 ${px(geometry.gtk4_button_padding)} !important;
  margin: ${px(geometry.gtk4_button_margin)} !important;
}

windowtitle,
windowtitle label.title {
  min-height: ${px(geometry.gtk4_title_min_height)} !important;
  padding: 0 !important;
  margin: 0 !important;
}

/* Compact GTK3 & SSD Fallbacks */
window.ssd headerbar button.titlebutton,
headerbar.default-decoration button.titlebutton {
  min-height: ${px(geometry.gtk3_button_min_height)} !important;
  min-width: ${px(geometry.gtk3_button_min_width)} !important;
  padding: 0 ${px(geometry.gtk3_button_padding)} !important;
  margin: ${px(geometry.gtk3_button_margin)} !important;
}

window.ssd headerbar label.title,
headerbar.default-decoration label.title,
headerbar.default-decoration windowtitle {
  min-height: ${px(geometry.gtk3_title_min_height)} !important;
  padding: 0 !important;
  margin: 0 !important;
}

/* Kinetic Scroll / Overshoot Disabler */
${geometry.disable_overshoot ? `
scrolledwindow overshoot,
scrolledwindow undershoot {
  opacity: 0;
}
` : ''}
`.trim();

    return css;
  }

  async loadCurrentTheme(): Promise<void> {
    this.state = { colors: { ...DEFAULT_COLORS }, geometry: { ...DEFAULT_GEOMETRY }, presetName: 'Custom' };
    try {
      const { readTextFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
      const configDir = await import('@tauri-apps/api/path').then(m => m.configDir());

      const gtk4Path = `${configDir}/gtk-4.0/gtk.css`;
      const gtk3Path = `${configDir}/gtk-3.0/gtk.css`;

      let cssContent = '';
      try {
        cssContent = await readTextFile(gtk4Path, { baseDir: BaseDirectory.Home });
      } catch {
        try {
          cssContent = await readTextFile(gtk3Path, { baseDir: BaseDirectory.Home });
        } catch {
          return;
        }
      }

      this.parseCSS(cssContent);
      this.notify();
    } catch (error) {
      console.warn('Could not load current theme:', error);
    }
  }

  parseCSS(css: string): void {
    const colorRegex = /@define-color\s+(\w+)\s+([^;]+);/g;
    let match;
    while ((match = colorRegex.exec(css)) !== null) {
      const key = match[1] as keyof ColorTokens;
      const value = match[2].trim();
      if (key in this.state.colors) {
        (this.state.colors as Record<keyof ColorTokens, string>)[key] = value;
      }
    }

    const heightRegex = /min-height:\s*(\d+)px\s*!important;/g;
    const heights = [...css.matchAll(heightRegex)].map(m => parseInt(m[1], 10));
    if (heights.length > 0) {
      this.state.geometry.headerbar_min_height = heights[0];
    }

    const paddingRegex = /padding-top:\s*(\d+)px\s*!important;/g;
    const paddingMatch = paddingRegex.exec(css);
    if (paddingMatch) {
      this.state.geometry.headerbar_padding_top = parseInt(paddingMatch[1], 10);
    }
  }

  setColor(key: keyof ColorTokens, value: string): void {
    this.state.colors[key] = value;
    if (this.state.presetName !== 'Custom') {
      this.state.presetName = 'Custom';
    }
    this.notify();
  }

  setGeometry(key: keyof GeometryTokens, value: number | boolean): void {
    (this.state.geometry as Record<keyof GeometryTokens, number | boolean>)[key] = value;
    if (this.state.presetName !== 'Custom') {
      this.state.presetName = 'Custom';
    }
    this.notify();
  }

  loadPreset(name: string): boolean {
    const preset = BUILTIN_PRESETS[name];
    if (!preset) return false;
    this.state = { ...preset, colors: { ...preset.colors }, geometry: { ...preset.geometry } };
    this.notify();
    return true;
  }

  savePreset(name: string): void {
    BUILTIN_PRESETS[name] = { ...this.state, colors: { ...this.state.colors }, geometry: { ...this.state.geometry }, presetName: name };
    this.persistPresets();
  }

  deletePreset(name: string): void {
    if (name === 'Fedora OLED Slate Compact') return;
    delete BUILTIN_PRESETS[name];
    this.persistPresets();
  }

  persistPresets(): void {
    try {
      const custom = Object.fromEntries(Object.entries(BUILTIN_PRESETS).filter(([name]) => name !== 'Fedora OLED Slate Compact'));
      localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(custom));
    } catch (error) {
      console.warn('Could not save presets:', error);
    }
  }

  getPresets(): string[] {
    return Object.keys(BUILTIN_PRESETS);
  }

  async applyTheme(): Promise<void> {
    const { writeTextFile, BaseDirectory, mkdir, readTextFile, exists } = await import('@tauri-apps/plugin-fs');
    const configDir = await import('@tauri-apps/api/path').then(m => m.configDir());

    const css = this.getCSS();

    const gtk4Dir = `${configDir}/gtk-4.0`;
    const gtk3Dir = `${configDir}/gtk-3.0`;
    const gtk4Path = `${gtk4Dir}/gtk.css`;
    const gtk3Path = `${gtk3Dir}/gtk.css`;

    await mkdir(gtk4Dir, { baseDir: BaseDirectory.Home, recursive: true });
    await mkdir(gtk3Dir, { baseDir: BaseDirectory.Home, recursive: true });

    const backupId = new Date().toISOString().replace(/[:.]/g, '-');
    for (const path of [gtk4Path, gtk3Path]) {
      const original = `${path}.original`;
      const absent = `${path}.original.absent`;
      if (!await exists(original, { baseDir: BaseDirectory.Home }) && !await exists(absent, { baseDir: BaseDirectory.Home })) {
        if (await exists(path, { baseDir: BaseDirectory.Home })) {
          const existing = await readTextFile(path, { baseDir: BaseDirectory.Home });
          await writeTextFile(original, existing, { baseDir: BaseDirectory.Home });
        } else await writeTextFile(absent, '', { baseDir: BaseDirectory.Home });
      }
      if (await exists(path, { baseDir: BaseDirectory.Home })) {
        const existing = await readTextFile(path, { baseDir: BaseDirectory.Home });
        await writeTextFile(`${path}.bak.${backupId}`, existing, { baseDir: BaseDirectory.Home });
      }
    }

    await writeTextFile(gtk4Path, css, { baseDir: BaseDirectory.Home });
    await writeTextFile(gtk3Path, css, { baseDir: BaseDirectory.Home });
  }

  async restoreOriginal(): Promise<void> {
    const { BaseDirectory, readTextFile, writeTextFile, exists, remove } = await import('@tauri-apps/plugin-fs');
    const configDir = await import('@tauri-apps/api/path').then(m => m.configDir());

    const gtk4Path = `${configDir}/gtk-4.0/gtk.css`;
    const gtk3Path = `${configDir}/gtk-3.0/gtk.css`;

    let restored = false;
    for (const path of [gtk4Path, gtk3Path]) {
      if (await exists(`${path}.original`, { baseDir: BaseDirectory.Home })) {
        const original = await readTextFile(`${path}.original`, { baseDir: BaseDirectory.Home });
        await writeTextFile(path, original, { baseDir: BaseDirectory.Home });
        restored = true;
      } else if (await exists(`${path}.original.absent`, { baseDir: BaseDirectory.Home })) {
        if (await exists(path, { baseDir: BaseDirectory.Home })) await remove(path, { baseDir: BaseDirectory.Home });
        restored = true;
      }
    }
    if (!restored) throw new Error('No original theme backup exists yet.');

    await this.loadCurrentTheme();
  }

  async rollback(): Promise<void> {
    const { readDir, copyFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
    const configDir = await import('@tauri-apps/api/path').then(m => m.configDir());

    const gtk4Dir = `${configDir}/gtk-4.0`;
    const gtk3Dir = `${configDir}/gtk-3.0`;

    let restored = false;
    for (const dir of [gtk4Dir, gtk3Dir]) {
      try {
        const files = await readDir(dir, { baseDir: BaseDirectory.Home });
        const backups = files
          .filter(f => f.name.startsWith('gtk.css.bak.'))
          .sort((a, b) => b.name.localeCompare(a.name));

        if (backups.length > 0) {
          await copyFile(`${dir}/${backups[0].name}`, `${dir}/gtk.css`, { fromPathBaseDir: BaseDirectory.Home, toPathBaseDir: BaseDirectory.Home });
          restored = true;
        }
      } catch {}
    }

    if (!restored) throw new Error('No previous theme backup exists yet.');
    await this.loadCurrentTheme();
  }

  async setupFlatpakOverrides(): Promise<void> {
    const { Command } = await import('@tauri-apps/plugin-shell');
    const cmd1 = Command.create('flatpak', ['override', '--user', '--filesystem=xdg-config/gtk-4.0:ro']);
    const cmd2 = Command.create('flatpak', ['override', '--user', '--filesystem=xdg-config/gtk-3.0:ro']);
    await cmd1.execute();
    await cmd2.execute();
  }
}
