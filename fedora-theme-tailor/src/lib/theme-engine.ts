export interface ColorTokens {
  window_bg_color: string;
  window_fg_color: string;
  view_bg_color: string;
  view_fg_color: string;
  card_bg_color: string;
  dialog_bg_color: string;
  popover_bg_color: string;
  context_menu_bg_color: string;
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

export interface ShellTokens {
  panel: string;
  menu: string;
  text: string;
  accent: string;
  dock: string;
}
export interface ThemeEffects { glass: boolean; motion: boolean }

export interface ThemeState {
  colors: ColorTokens;
  geometry: GeometryTokens;
  shell: ShellTokens;
  effects: ThemeEffects;
  presetName: string;
}

export const DEFAULT_SHELL: ShellTokens = {
  panel: '#1e232d', menu: '#141414', text: '#ffffff', accent: '#4a9eff', dock: '#1e232d',
};
export const DEFAULT_EFFECTS: ThemeEffects = { glass: false, motion: true };

export const DEFAULT_COLORS: ColorTokens = {
  window_bg_color: '#000000',
  window_fg_color: '#ffffff',
  view_bg_color: '#000000',
  view_fg_color: '#ffffff',
  card_bg_color: '#141414',
  dialog_bg_color: '#141414',
  popover_bg_color: '#141414',
  context_menu_bg_color: '#1e232d',
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
    shell: DEFAULT_SHELL,
    effects: DEFAULT_EFFECTS,
    presetName: 'Fedora OLED Slate Compact',
  },
  'Fedora Blue': {
    colors: { ...DEFAULT_COLORS, context_menu_bg_color: '#174f99', headerbar_bg_color: '#1a5fb4', headerbar_border_color: '#1a5fb4', headerbar_backdrop_color: '#174f99', sidebar_bg_color: '#1a5fb4', sidebar_border_color: '#1a5fb4' },
    geometry: DEFAULT_GEOMETRY, shell: { ...DEFAULT_SHELL, panel: '#1a5fb4', accent: '#3584e4' }, effects: DEFAULT_EFFECTS, presetName: 'Fedora Blue',
  },
  'Violet Night': {
    colors: { ...DEFAULT_COLORS, context_menu_bg_color: '#241c30', headerbar_bg_color: '#30233f', headerbar_border_color: '#30233f', headerbar_backdrop_color: '#261b34', sidebar_bg_color: '#241c30', sidebar_border_color: '#241c30' },
    geometry: DEFAULT_GEOMETRY, shell: { ...DEFAULT_SHELL, panel: '#241c30', menu: '#17121e', accent: '#c061cb', dock: '#241c30' }, effects: DEFAULT_EFFECTS, presetName: 'Violet Night',
  },
  'Glass Night': {
    colors: { ...DEFAULT_COLORS, window_bg_color: '#101722', view_bg_color: '#101722', card_bg_color: '#202b3a', dialog_bg_color: '#202b3a', popover_bg_color: '#202b3a', context_menu_bg_color: '#202b3a', headerbar_bg_color: '#202b3a', headerbar_border_color: '#202b3a', headerbar_backdrop_color: '#182230', sidebar_bg_color: '#182230', sidebar_border_color: '#182230' },
    geometry: DEFAULT_GEOMETRY, shell: { ...DEFAULT_SHELL, panel: '#182230', menu: '#202b3a', dock: '#182230', accent: '#62a0ea' }, effects: { glass: true, motion: true }, presetName: 'Glass Night',
  },
};

const COLOR_TOKEN_KEYS = Object.keys(DEFAULT_COLORS) as (keyof ColorTokens)[];
const PRESET_STORAGE_KEY = 'fedora-theme-tailor.presets';

export class ThemeEngine {
  state: ThemeState = {
    colors: { ...DEFAULT_COLORS },
    geometry: { ...DEFAULT_GEOMETRY },
    shell: { ...DEFAULT_SHELL },
    effects: { ...DEFAULT_EFFECTS },
    presetName: 'Custom',
  };
  listeners: Set<() => void> = new Set();

  constructor() {
    try {
      const saved = JSON.parse(localStorage.getItem(PRESET_STORAGE_KEY) || '{}') as Record<string, ThemeState>;
      Object.entries(saved).forEach(([name, preset]) => {
        if (preset?.colors && preset?.geometry && !['Fedora OLED Slate Compact', 'Fedora Blue', 'Violet Night', 'Glass Night'].includes(name)) BUILTIN_PRESETS[name] = { ...preset, shell: { ...DEFAULT_SHELL, ...preset.shell }, effects: { ...DEFAULT_EFFECTS, ...preset.effects } };
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

/* Window, content, cards and dialogs */
window,
.background {
  background-color: @window_bg_color;
  color: @window_fg_color;
}

.view,
textview text,
list,
listview,
treeview {
  background-color: @view_bg_color;
  color: @view_fg_color;
}

.card,
.boxed-list {
  background-color: @card_bg_color;
}

dialog,
.dialog {
  background-color: @dialog_bg_color;
}

popover,
popover contents {
  background-color: @popover_bg_color;
  color: @window_fg_color;
}

/* GTK 3 menus and GTK 4 context-menu popovers */
menu,
.menu,
popover.menu {
  background-color: @context_menu_bg_color;
  color: @headerbar_fg_color;
  border: 1px solid alpha(@headerbar_fg_color, 0.14);
  border-radius: 14px;
  box-shadow: 0 5px 18px alpha(#000000, 0.35);
}

menuitem,
popover.menu modelbutton {
  background-color: transparent;
  color: @headerbar_fg_color;
  padding: 8px 12px;
}

menuitem:hover,
popover.menu modelbutton:hover {
  background-color: alpha(@headerbar_fg_color, 0.10);
  color: @headerbar_fg_color;
}

menu separator,
popover.menu separator {
  background-color: alpha(@headerbar_fg_color, 0.14);
  min-height: 1px;
}

/* Titlebar & Tabbar Unification */
window headerbar,
window .titlebar,
headerbar.titlebar,
headerbar,
.titlebar,
windowcontrols,
tabbar,
tab {
  background-color: @headerbar_bg_color;
  background-image: none;
  color: @headerbar_fg_color;
  border-color: @headerbar_border_color;
  border-bottom: 0 none;
  border-image: none;
  box-shadow: none;
}

headerbar:backdrop {
  background-color: @headerbar_backdrop_color;
}

${this.state.effects.glass ? `popover, popover contents, dialog, .dialog { background-color: alpha(@popover_bg_color, 0.90); }` : ''}
${this.state.effects.motion ? `button, switch, checkbutton, radiobutton { transition: all 160ms ease; }` : ''}

/* Compact Headerbar Geometry */
headerbar {
  min-height: ${headerbarHeight};
  padding-top: ${px(geometry.headerbar_padding_top)};
  padding-bottom: ${px(geometry.headerbar_padding_bottom)};
}

/* Sidebar Overrides & Transparent Lists */
.navigation-sidebar,
navigation-sidebar,
stacksidebar,
.sidebar {
  background-color: @sidebar_bg_color;
  color: @sidebar_fg_color;
  border-color: @sidebar_border_color;
}

.sidebar:backdrop {
  background-color: @sidebar_backdrop_color;
}

.navigation-sidebar.sidebar,
.sidebar-pane {
  background-color: @secondary_sidebar_bg_color;
}

.sidebar-pane:backdrop {
  background-color: @secondary_sidebar_backdrop_color;
}

.navigation-sidebar list,
.navigation-sidebar listview,
stacksidebar list {
  background-color: transparent;
}

/* Compact GTK4 Window Controls & Title */
windowcontrols button,
windowcontrols button.image-button {
  min-height: ${px(geometry.gtk4_button_min_height)};
  min-width: ${px(geometry.gtk4_button_min_width)};
  padding: 0 ${px(geometry.gtk4_button_padding)};
  margin: ${px(geometry.gtk4_button_margin)};
}

windowtitle,
windowtitle label.title {
  min-height: ${px(geometry.gtk4_title_min_height)};
  padding: 0;
  margin: 0;
}

/* Compact GTK3 & SSD Fallbacks */
window.ssd headerbar button.titlebutton,
headerbar.default-decoration button.titlebutton {
  min-height: ${px(geometry.gtk3_button_min_height)};
  min-width: ${px(geometry.gtk3_button_min_width)};
  padding: 0 ${px(geometry.gtk3_button_padding)};
  margin: ${px(geometry.gtk3_button_margin)};
}

window.ssd headerbar label.title,
headerbar.default-decoration label.title,
headerbar.default-decoration windowtitle {
  min-height: ${px(geometry.gtk3_title_min_height)};
  padding: 0;
  margin: 0;
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

  getShellCSS(): string {
    const { panel, menu, text, accent, dock } = this.state.shell;
    const rgba = (value: string, alpha: number) => {
      const hex = value.replace('#', '');
      return hex.length === 6 ? `rgba(${parseInt(hex.slice(0, 2), 16)},${parseInt(hex.slice(2, 4), 16)},${parseInt(hex.slice(4, 6), 16)},${alpha})` : value;
    };
    return `#panel { background-color: ${panel}; color: ${text}; background-image: none; border: none; border-image: none; box-shadow: none; }\n.popup-menu-content, .quick-settings, .calendar, .message-list, .modal-dialog { background-color: ${this.state.effects.glass ? rgba(menu, .9) : menu}; color: ${text}; }\n.quick-toggle { border-radius: 999px; }\n.quick-toggle:checked, #panel .panel-button:hover, #panel .panel-button:active { background-color: ${accent}; color: ${text}; }\n#dash, .dash-background { background-color: ${this.state.effects.glass ? rgba(dock, .86) : dock}; border-radius: 14px; box-shadow: 0 8px 24px rgba(0,0,0,.28); }${this.state.effects.motion ? '\n#panel .panel-button, .quick-toggle, #dash .app-well-app { transition-duration: 160ms; }' : ''}`;
  }

  async loadCurrentTheme(): Promise<void> {
    this.state = { colors: { ...DEFAULT_COLORS }, geometry: { ...DEFAULT_GEOMETRY }, shell: { ...DEFAULT_SHELL }, effects: { ...DEFAULT_EFFECTS }, presetName: 'Custom' };
    try {
      const { readTextFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
      const gtk4Path = 'gtk-4.0/gtk.css';
      const gtk3Path = 'gtk-3.0/gtk.css';

      let cssContent = '';
      try {
        cssContent = await readTextFile(gtk4Path, { baseDir: BaseDirectory.Config });
      } catch {
        try {
          cssContent = await readTextFile(gtk3Path, { baseDir: BaseDirectory.Config });
        } catch {}
      }

      if (cssContent) this.parseCSS(cssContent);
      const shellCSS = await readTextFile('.themes/FedoraThemeTailor/gnome-shell/gnome-shell.css', { baseDir: BaseDirectory.Home }).catch(() => '');
      const rule = (selector: string) => shellCSS.split('}').find(block => block.slice(0, block.indexOf('{')).includes(selector)) || '';
      const color = (selector: string, property: string) => rule(selector).match(new RegExp(`${property}:\\s*(#[\\da-f]{6})`, 'i'))?.[1];
      this.state.shell = {
        panel: color('#panel', 'background-color') || this.state.shell.panel,
        menu: color('.popup-menu-content', 'background-color') || this.state.shell.menu,
        text: color('#panel', 'color') || this.state.shell.text,
        accent: color('.quick-toggle:checked', 'background-color') || this.state.shell.accent,
        dock: color('#dash', 'background-color') || this.state.shell.dock,
      };
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

    const heightRegex = /min-height:\s*(\d+)px\s*;/g;
    const heights = [...css.matchAll(heightRegex)].map(m => parseInt(m[1], 10));
    if (heights.length > 0) {
      this.state.geometry.headerbar_min_height = heights[0];
    }

    const paddingRegex = /padding-top:\s*(\d+)px\s*;/g;
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

  setShellColor(key: keyof ShellTokens, value: string): void {
    this.state.shell[key] = value;
    this.state.presetName = 'Custom';
    this.notify();
  }

  setEffect(key: keyof ThemeEffects, value: boolean): void {
    this.state.effects[key] = value;
    this.state.presetName = 'Custom';
    this.notify();
  }

  loadPreset(name: string): boolean {
    const preset = BUILTIN_PRESETS[name];
    if (!preset) return false;
    this.state = { ...preset, colors: { ...preset.colors }, geometry: { ...preset.geometry }, shell: { ...DEFAULT_SHELL, ...preset.shell }, effects: { ...DEFAULT_EFFECTS, ...preset.effects } };
    this.notify();
    return true;
  }

  savePreset(name: string): void {
    BUILTIN_PRESETS[name] = { ...this.state, colors: { ...this.state.colors }, geometry: { ...this.state.geometry }, shell: { ...this.state.shell }, effects: { ...this.state.effects }, presetName: name };
    this.persistPresets();
  }

  deletePreset(name: string): void {
    if (name === 'Fedora OLED Slate Compact') return;
    delete BUILTIN_PRESETS[name];
    this.persistPresets();
  }

  persistPresets(): void {
    try {
      const custom = Object.fromEntries(Object.entries(BUILTIN_PRESETS).filter(([name]) => !['Fedora OLED Slate Compact', 'Fedora Blue', 'Violet Night', 'Glass Night'].includes(name)));
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
    const css = this.getCSS();

    const gtk4Dir = 'gtk-4.0';
    const gtk3Dir = 'gtk-3.0';
    const gtk4Path = `${gtk4Dir}/gtk.css`;
    const gtk3Path = `${gtk3Dir}/gtk.css`;
    const shellDir = '.themes/FedoraThemeTailor/gnome-shell';
    const shellPath = `${shellDir}/gnome-shell.css`;

    await mkdir(gtk4Dir, { baseDir: BaseDirectory.Config, recursive: true });
    await mkdir(gtk3Dir, { baseDir: BaseDirectory.Config, recursive: true });
    await mkdir(shellDir, { baseDir: BaseDirectory.Home, recursive: true });

    const backupId = new Date().toISOString().replace(/[:.]/g, '-');
    for (const [path, baseDir] of [[gtk4Path, BaseDirectory.Config], [gtk3Path, BaseDirectory.Config], [shellPath, BaseDirectory.Home]] as const) {
      const original = `${path}.original`;
      const absent = `${path}.original.absent`;
      if (!await exists(original, { baseDir }) && !await exists(absent, { baseDir })) {
        if (await exists(path, { baseDir })) {
          const existing = await readTextFile(path, { baseDir });
          await writeTextFile(original, existing, { baseDir });
        } else await writeTextFile(absent, '', { baseDir });
      }
      if (await exists(path, { baseDir })) {
        const existing = await readTextFile(path, { baseDir });
        await writeTextFile(`${path}.bak.${backupId}`, existing, { baseDir });
      }
    }

    await writeTextFile(gtk4Path, css, { baseDir: BaseDirectory.Config });
    await writeTextFile(gtk3Path, css, { baseDir: BaseDirectory.Config });
    await writeTextFile(shellPath, this.getShellCSS(), { baseDir: BaseDirectory.Home });
  }

  async restoreOriginal(): Promise<void> {
    const { BaseDirectory, readTextFile, writeTextFile, exists, remove } = await import('@tauri-apps/plugin-fs');
    const gtk4Path = 'gtk-4.0/gtk.css';
    const gtk3Path = 'gtk-3.0/gtk.css';
    const shellPath = '.themes/FedoraThemeTailor/gnome-shell/gnome-shell.css';

    let restored = false;
    for (const [path, baseDir] of [[gtk4Path, BaseDirectory.Config], [gtk3Path, BaseDirectory.Config], [shellPath, BaseDirectory.Home]] as const) {
      if (await exists(`${path}.original`, { baseDir })) {
        const original = await readTextFile(`${path}.original`, { baseDir });
        await writeTextFile(path, original, { baseDir });
        restored = true;
      } else if (await exists(`${path}.original.absent`, { baseDir })) {
        if (await exists(path, { baseDir })) await remove(path, { baseDir });
        restored = true;
      }
    }
    if (!restored) throw new Error('No original theme backup exists yet.');

    await this.loadCurrentTheme();
  }

  async rollback(): Promise<void> {
    const { readDir, copyFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
    const gtk4Dir = 'gtk-4.0';
    const gtk3Dir = 'gtk-3.0';
    const shellDir = '.themes/FedoraThemeTailor/gnome-shell';

    let restored = false;
    for (const [dir, baseDir] of [[gtk4Dir, BaseDirectory.Config], [gtk3Dir, BaseDirectory.Config], [shellDir, BaseDirectory.Home]] as const) {
      try {
        const files = await readDir(dir, { baseDir });
        const backups = files
          .filter(f => f.name.startsWith(dir === shellDir ? 'gnome-shell.css.bak.' : 'gtk.css.bak.'))
          .sort((a, b) => b.name.localeCompare(a.name));

        if (backups.length > 0) {
          await copyFile(`${dir}/${backups[0].name}`, `${dir}/${dir === shellDir ? 'gnome-shell.css' : 'gtk.css'}`, { fromPathBaseDir: baseDir, toPathBaseDir: baseDir });
          restored = true;
        }
      } catch {}
    }

    if (!restored) throw new Error('No previous theme backup exists yet.');
    await this.loadCurrentTheme();
  }

  async setupFlatpakOverrides(): Promise<void> {
    const { Command } = await import('@tauri-apps/plugin-shell');
    const command = Command.create('flatpak', ['override', '--user', '--filesystem=xdg-config/gtk-4.0:ro', '--filesystem=xdg-config/gtk-3.0:ro']);
    await command.execute();
  }
}
