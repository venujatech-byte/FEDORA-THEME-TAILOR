import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { ThemeEngine, ColorTokens, GeometryTokens, ShellTokens, ShellGeometry } from './theme-engine';

const groups: Record<string, (keyof ColorTokens)[]> = {
  'Window & content': ['window_bg_color', 'window_fg_color', 'view_bg_color', 'view_fg_color'],
  'Cards, menus & popovers': ['card_bg_color', 'dialog_bg_color', 'popover_bg_color', 'context_menu_bg_color'],
  'Title bars': ['headerbar_bg_color', 'headerbar_fg_color', 'headerbar_border_color', 'headerbar_backdrop_color'],
  'Sidebars': ['sidebar_bg_color', 'sidebar_fg_color', 'sidebar_backdrop_color', 'sidebar_border_color', 'secondary_sidebar_bg_color', 'secondary_sidebar_backdrop_color'],
};
const geometry: Array<[keyof GeometryTokens, string, number, number]> = [
  ['headerbar_min_height', 'Title bar minimum height', 20, 46], ['headerbar_padding_top', 'Top padding', 0, 8], ['headerbar_padding_bottom', 'Bottom padding', 0, 8],
  ['gtk4_button_min_height', 'GTK 4 title-button minimum height', 15, 24], ['gtk4_button_min_width', 'GTK 4 title-button minimum width', 15, 24], ['gtk4_button_padding', 'GTK 4 title-button padding', 0, 8], ['gtk4_title_min_height', 'GTK 4 title text minimum height', 15, 24],
  ['gtk3_button_min_height', 'GTK 3 title-button minimum height', 12, 20], ['gtk3_button_min_width', 'GTK 3 title-button minimum width', 12, 20], ['gtk3_button_padding', 'GTK 3 title-button padding', 0, 8], ['gtk3_title_min_height', 'GTK 3 title text minimum height', 12, 20],
  ['context_menu_min_width', 'Context menu minimum width', 120, 320],
];
const shellNames: Record<keyof ShellTokens, string> = { panel: 'Top bar', menu: 'Menus', quickSettings: 'Quick Settings', notifications: 'Notifications', text: 'Shell text', accent: 'Highlights', dock: 'Dock' };
const shellGeometry: Array<[keyof ShellGeometry, string, number, number]> = [['panelHeight', 'Top bar height', 24, 48], ['quickSettingsRadius', 'Quick Settings corner radius', 8, 36], ['dockRadius', 'Overview dash corner radius', 4, 32]];
const touchpadLabels: Record<string, string> = { 'tap-to-click': 'Tap to click', 'natural-scroll': 'Natural scrolling', 'two-finger-scrolling-enabled': 'Two-finger scrolling', 'disable-while-typing': 'Disable while typing', 'tap-and-drag': 'Tap and drag', 'middle-click-emulation': 'Middle-click emulation' };
const appIconOptions = [{ name: 'PNG image', extensions: ['png'] }, { name: 'SVG image', extensions: ['svg'] }, { name: 'XPM image', extensions: ['xpm'] }];

export class UIController {
  active = 'gtk';
  preview = 'gtk4';
  apps: Array<{ id: string; name: string; icon: string; customized: boolean }> = [];
  touchpad: Record<string, string> = {};
  constructor(public engine: ThemeEngine) {}
  async initialize(): Promise<void> {
    this.bindEvents();
    this.apps = await invoke<UIController['apps']>('list_desktop_apps').catch(() => []);
    this.touchpad = await invoke<Record<string, string>>('get_touchpad_settings').catch(() => ({}));
    this.render();
  }

  bindEvents(): void {
    document.addEventListener('input', e => {
      const input = e.target as HTMLInputElement;
      if (input.dataset.color) this.engine.setColor(input.dataset.color as keyof ColorTokens, input.value);
      if (input.dataset.shell) this.engine.setShellColor(input.dataset.shell as keyof ShellTokens, input.value);
      if (input.dataset.shellGeometry) this.engine.setShellGeometry(input.dataset.shellGeometry as keyof ShellGeometry, +input.value);
      if (input.dataset.effect) this.engine.setEffect(input.dataset.effect as 'glass' | 'motion' | 'contextMenuTransparent', input.checked);
      if (input.dataset.geometry) this.engine.setGeometry(input.dataset.geometry as keyof GeometryTokens, input.type === 'checkbox' ? input.checked : +input.value);
      if (input.dataset.color || input.dataset.shell || input.dataset.shellGeometry || input.dataset.geometry || input.dataset.effect) {
        const output = input.parentElement?.querySelector('output');
        if (output) output.textContent = `${input.value} px`;
        const { colors, shell, presetName } = this.engine.state;
        const preview = document.querySelector('.preview-pane');
        if (preview) preview.outerHTML = this.renderPreview(colors, shell, this.engine.state.geometry, presetName);
        const chip = document.querySelector('.preset-chip');
        if (chip) chip.textContent = presetName;
        const status = document.getElementById('action-status');
        if (status) status.textContent = 'Unsaved edits · apply when ready.';
      }
    });
    document.addEventListener('change', e => {
      const input = e.target as HTMLInputElement;
      if (input.dataset.touchpad) this.setTouchpad(input.dataset.touchpad, input.value);
    });
    document.addEventListener('input', e => {
      const input = e.target as HTMLInputElement;
      if (input.id === 'app-search') document.querySelectorAll<HTMLElement>('[data-app-name]').forEach(row => row.hidden = !row.dataset.appName!.includes(input.value.toLowerCase()));
    });
    document.addEventListener('click', e => {
      const button = (e.target as HTMLElement).closest<HTMLElement>('[data-tab], [data-preview], [data-action], [data-preset]');
      if (!button) return;
      if (button.dataset.tab) { this.active = button.dataset.tab; this.render(); }
      if (button.dataset.preview) { this.preview = button.dataset.preview; this.render(); }
      if (button.dataset.preset === 'load') { this.engine.loadPreset(button.dataset.name!); this.render(); }
      if (button.dataset.preset === 'save') {
        const name = (document.getElementById('preset-name') as HTMLInputElement).value.trim();
        if (name) { this.engine.savePreset(name); this.render(); }
      }
      if (button.dataset.preset === 'delete' && confirm(`Delete “${button.dataset.name}”?`)) { this.engine.deletePreset(button.dataset.name!); this.render(); }
      if (button.dataset.action === 'choose-icon') this.chooseIcon(button.dataset.app!);
      if (button.dataset.action === 'reset-icon') this.run('Restoring app icon…', 'Original app icon restored.', async () => { await invoke('reset_app_icon', { id: button.dataset.app }); this.apps = await invoke<UIController['apps']>('list_desktop_apps'); this.render(); });
      const action = button.dataset.action;
      if (action === 'apply') this.run('Saving GTK and Shell styles…', 'Theme changes applied successfully.', () => this.engine.applyTheme());
      if (action === 'rollback') this.run('Undoing the last apply…', 'Previous GTK and Shell styles restored.', () => this.engine.rollback());
      if (action === 'backup') this.run('Backing up current styles…', 'Current theme backup created.', () => this.engine.createBackup());
      if (action === 'original' && confirm('Restore the GTK and Shell files saved before the first apply?')) this.run('Restoring original styles…', 'Original styles restored.', () => this.engine.restoreOriginal());
      if (action === 'flatpak') this.run('Enabling Flatpak access…', 'Flatpak apps can now read GTK 3 and GTK 4 styles.', () => this.engine.setupFlatpakOverrides());
      if (action === 'reset') { this.engine.loadPreset('Fedora OLED Slate Compact'); this.render(); }
    });
  }

  async setTouchpad(key: string, value: string): Promise<void> {
    const status = document.getElementById('action-status');
    try { await invoke('set_touchpad_setting', { key, value }); this.touchpad[key] = value; const output = document.querySelector(`[data-touchpad="${key}"]`)?.parentElement?.querySelector('output'); if (output) output.textContent = value; if (status) status.textContent = 'Touchpad setting saved.'; }
    catch (error) { if (status) status.textContent = `Could not update touchpad: ${String(error)}`; }
  }

  async chooseIcon(id: string): Promise<void> {
    const path = await open({ multiple: false, filters: appIconOptions });
    if (typeof path !== 'string') return;
    await this.run('Changing app icon…', 'App icon changed. GNOME may take a moment to refresh its launcher cache.', async () => {
      await invoke('set_app_icon', { id, icon: path }); this.apps = await invoke<UIController['apps']>('list_desktop_apps'); this.render();
    });
  }

  render(): void {
    const { colors: c, geometry: g, shell: s, shellGeometry: sg, presetName } = this.engine.state;
    const app = document.getElementById('app');
    if (!app) return;
    const colorRows = (items: Array<[string, string, string]>) => items.map(([label, key, value]) => `<label class="color-row"><span>${label}</span><input type="color" value="${value}" data-${key.startsWith('shell:') ? 'shell' : 'color'}="${key.replace('shell:', '')}" aria-label="${label}"></label>`).join('');
    const tabs = [['gtk', 'GTK apps'], ['shell', 'GNOME Shell'], ['icons', 'App icons'], ['touchpad', 'Touchpad'], ['recovery', 'Presets & backups']];
    const body = this.active === 'gtk' ? `
      <p class="intro">Choose how GTK 3 and GTK 4 apps look. Your original files are backed up the first time you apply.</p>
      ${Object.entries(groups).map(([name, keys]) => `<section><h3>${name}</h3>${colorRows(keys.map(k => [this.colorLabel(k), k, c[k]]))}${name === 'Cards, menus & popovers' ? `<label class="check-row"><input type="checkbox" data-effect="contextMenuTransparent" ${this.engine.state.effects.contextMenuTransparent ? 'checked' : ''}> Transparent</label>` : ''}</section>`).join('')}
      <section><h3>Size & spacing</h3>${geometry.map(([key, label, min, max]) => `<label class="range-row"><span>${label}</span><input type="range" min="${min}" max="${max}" value="${g[key]}" data-geometry="${key}"><output>${g[key]} px</output></label>`).join('')}<p>These values set minimum sizes. GTK may grow controls to fit an app. Restart apps after applying to see changes.</p>
      <label class="check-row"><input type="checkbox" data-geometry="disable_overshoot" ${g.disable_overshoot ? 'checked' : ''}> Hide scroll edge glow</label><label class="check-row"><input type="checkbox" data-effect="glass" ${this.engine.state.effects.glass ? 'checked' : ''}> Translucent glass surfaces</label><label class="check-row"><input type="checkbox" data-effect="motion" ${this.engine.state.effects.motion ? 'checked' : ''}> Subtle hover animations</label><p>Glass uses transparency; GTK themes cannot add true backdrop blur.</p></section>
      <section><h3>Current preset</h3><p>${this.escape(presetName)}</p><button class="button" data-action="reset">Reset to starter theme</button></section>
      <footer><button class="button primary" data-action="apply">Apply GTK + Shell styles</button><small>GTK apps need a restart. Libadwaita apps may only partly follow custom CSS.</small></footer>`
      : this.active === 'shell' ? `<p class="intro">Style the top bar, Quick Settings, notifications, menus and overview dash.</p><section><h3>Desktop colors</h3>${colorRows(Object.entries(shellNames).map(([key, label]) => [label, `shell:${key}`, s[key as keyof ShellTokens]]))}<label class="check-row"><input type="checkbox" data-effect="glass" ${this.engine.state.effects.glass ? 'checked' : ''}> Glass tint for menus and dock</label><label class="check-row"><input type="checkbox" data-effect="motion" ${this.engine.state.effects.motion ? 'checked' : ''}> Subtle hover animations</label><p>Glass is translucent; GNOME Shell theme CSS cannot reliably blur the desktop behind it.</p></section>
        <section><h3>Size & shape</h3>${shellGeometry.map(([key, label, min, max]) => `<label class="range-row"><span>${label}</span><input type="range" min="${min}" max="${max}" value="${sg[key]}" data-shell-geometry="${key}"><output>${sg[key]} px</output></label>`).join('')}</section>
        <aside class="notice">Save the theme, then enable the <b>User Themes</b> extension in Extensions or Tweaks and choose <b>FedoraThemeTailor</b>. GNOME Shell styles can vary between GNOME versions.</aside><footer><button class="button primary" data-action="apply">Save GTK + Shell styles</button><small>GTK files apply globally; Shell requires User Themes.</small></footer>`
      : this.active === 'icons' ? `<p class="intro">Choose an image for a launcher. The change is saved in your user account and can be reset per app.</p><section><input id="app-search" class="app-search" placeholder="Search installed apps" aria-label="Search installed apps">${this.apps.map(app => `<div class="preset-row app-icon-row" data-app-name="${this.escape(app.name.toLowerCase())}"><span>${this.escape(app.name)}<small>${this.escape(app.icon || app.id)}</small></span><button class="button" data-action="choose-icon" data-app="${this.escape(app.id)}">Choose icon</button>${app.customized ? `<button class="button" data-action="reset-icon" data-app="${this.escape(app.id)}" aria-label="Reset ${this.escape(app.name)} icon">Reset</button>` : ''}</div>`).join('') || '<p>Could not load desktop launchers.</p>'}</section>`
      : this.active === 'touchpad' ? `<p class="intro">Change your touchpad’s built-in GNOME behavior. Updates take effect immediately.</p><section><h3>Touchpad behavior</h3>${Object.entries(touchpadLabels).filter(([key]) => key in this.touchpad).map(([key, label]) => `<label class="select-row"><span>${label}</span><select data-touchpad="${key}"><option value="true" ${this.touchpad[key] === 'true' ? 'selected' : ''}>On</option><option value="false" ${this.touchpad[key] === 'false' ? 'selected' : ''}>Off</option></select></label>`).join('')}${'speed' in this.touchpad ? `<label class="range-row"><span>Pointer speed</span><input type="range" min="-1" max="1" step="0.05" value="${this.touchpad.speed}" data-touchpad="speed"><output>${this.touchpad.speed}</output></label>` : ''}${Object.keys(this.touchpad).length ? '' : '<p>GNOME touchpad settings are not available on this system.</p>'}</section><section><h3>Gesture shortcuts</h3>${['3-Finger Gestures', '4-Finger Gestures'].map((title, n) => `<b>${title}</b>${['Swipe Up', 'Swipe Down', 'Swipe Left', 'Swipe Right', n ? 'Four-Finger Tap' : 'Three-Finger Tap'].map(action => `<label class="select-row"><span>${action}</span><select disabled aria-label="${title} ${action}"><option>Controlled by GNOME</option></select></label>`).join('')}`).join('')}<aside class="notice">Custom gesture assignments need a compatible GNOME Shell extension. GNOME’s built-in gestures are system-defined; this app does not change them.</aside></section>`
      : `<p class="intro">Load a ready-made look, save your own, or recover the files from before an apply.</p><section><h3>Built-in and saved looks</h3>${this.engine.getPresets().map(name => `<div class="preset-row"><span>${this.escape(name)}</span><button class="button" data-preset="load" data-name="${this.escape(name)}">Preview</button>${!['Fedora OLED Slate Compact', 'Fedora Blue', 'Violet Night', 'Glass Night'].includes(name) ? `<button class="button danger" data-preset="delete" data-name="${this.escape(name)}">Delete</button>` : ''}</div>`).join('')}
        <div class="save-row"><input id="preset-name" placeholder="Name this look" aria-label="Preset name"><button class="button primary" data-preset="save">Save preset</button></div></section>
        <section><h3>Back up current theme</h3><p>Save copies of your current GTK 3, GTK 4 and GNOME Shell styles. “Undo last apply” can restore this backup.</p><button class="button" data-action="backup">Back up current styles</button></section>
        <section><h3>Recovery</h3><button class="button" data-action="rollback">Undo last apply</button><p>Restores the files saved immediately before the last apply.</p><button class="button danger" data-action="original">Restore original files</button><p>Restores the first backup made by this app.</p></section>
        <section><h3>Flatpak apps</h3><p>Give sandboxed apps read-only access to GTK styles.</p><button class="button" data-action="flatpak">Enable Flatpak GTK styles</button></section>`;
    app.innerHTML = `<nav class="side-nav"><div class="brand">FEDORA THEME TAILOR<small>DESKTOP APPEARANCE</small></div>${tabs.map(([id, label]) => `<button class="nav-tab ${this.active === id ? 'selected' : ''}" data-tab="${id}" aria-current="${this.active === id ? 'page' : 'false'}">${label}</button>`).join('')}<div class="nav-foot">Edits are previewed first.<br>Apply when you are ready.</div></nav>
      <main class="inspector"><header class="inspector-head"><div><small>THEME SETTINGS</small><h1>${tabs.find(([id]) => id === this.active)?.[1]}</h1></div><span class="preset-chip">${this.escape(presetName)}</span></header><div class="inspector-content">${body}<div id="action-status" role="status" aria-live="polite"></div></div></main>${this.renderPreview(c, s, g, presetName)}`;
  }

  renderPreview(c: ColorTokens, s: ShellTokens, g: GeometryTokens, preset: string): string {
    const views = [['gtk3', 'GTK 3'], ['gtk4', 'GTK 4'], ['settings', 'Settings'], ['shell', 'Top bar'], ['dock', 'Dock & quick settings']];
    const gtkSample = (version: 3 | 4) => {
      const h = version === 4 ? g.gtk4_button_min_height : g.gtk3_button_min_height;
      const w = version === 4 ? g.gtk4_button_min_width : g.gtk3_button_min_width;
      const p = version === 4 ? g.gtk4_button_padding : g.gtk3_button_padding;
      const title = version === 4 ? g.gtk4_title_min_height : g.gtk3_title_min_height;
      const control = `min-height:${h}px;min-width:${w}px;padding:0 ${p}px;margin:${version === 4 ? g.gtk4_button_margin : g.gtk3_button_margin}px`;
      return `<div class="sample-window"><header style="background:${c.headerbar_bg_color};color:${c.headerbar_fg_color};min-height:${g.headerbar_min_height}px;padding-block:${g.headerbar_padding_top}px ${g.headerbar_padding_bottom}px"><div class="mock-controls"><button style="${control};background:#ff625f" aria-label="Close"></button><button style="${control};background:#ffc04a" aria-label="Minimize"></button><button style="${control};background:#49c879" aria-label="Maximize"></button></div><b style="min-height:${title}px">Files · GTK ${version}</b><span class="control-spacer"></span></header><div class="sample-tabs"><span>Recent</span><span>Starred</span><span>Home</span></div><div class="sample-body" style="background:${c.view_bg_color};color:${c.view_fg_color}"><aside style="background:${c.sidebar_bg_color}">Home<br>Documents<br>Downloads<br>Pictures</aside><article><h2>Welcome to Files</h2><p>Title bar and window controls · GTK ${version}</p><div class="sample-card" style="background:${c.card_bg_color}">Header height: ${g.headerbar_min_height}px · Control: ${h} × ${w}px</div><button style="min-height:${h}px;min-width:${w}px;padding:0 ${p}px">Open folder</button><div class="scroll-demo">Scroll edge effect <i class="${g.disable_overshoot ? 'hidden' : ''}"></i></div></article></div></div>`;
    };
    const tab = this.preview === 'gtk3' ? gtkSample(3) : this.preview === 'gtk4' ? gtkSample(4)
      : this.preview === 'settings' ? `<div class="sample-window settings-sample"><header style="background:${c.headerbar_bg_color};color:${c.headerbar_fg_color}"><i></i><b>Settings</b><i></i></header><div class="settings-body"><aside style="background:${c.sidebar_bg_color}">Network<br>Bluetooth<br>Appearance<br>Applications<br>Privacy</aside><article style="background:${c.window_bg_color};color:${c.window_fg_color}"><h2>Appearance</h2><p>Personalize your desktop</p><div class="sample-card" style="background:${c.card_bg_color}">Style <b>Dark</b></div><div class="sample-card" style="background:${c.card_bg_color}">Accent color <b style="color:${s.accent}">Blue</b></div></article></div></div>`
      : this.preview === 'shell' ? `<div class="desktop-sample"><div class="topbar" style="height:${this.engine.state.shellGeometry.panelHeight}px;background:${s.panel};color:${s.text}">Activities <span>Oct 21  •••</span> ● ◖</div><div class="desktop-window" style="background:${c.window_bg_color};color:${c.window_fg_color}">Fedora desktop <small>GNOME Shell top bar preview</small></div></div>`
      : `<div class="desktop-sample"><div class="topbar" style="height:${this.engine.state.shellGeometry.panelHeight}px;background:${s.panel};color:${s.text}">Activities <span>Oct 21  •••</span> ● ◖</div><div class="quick-menu" style="background:${s.quickSettings};color:${s.text};border-radius:${this.engine.state.shellGeometry.quickSettingsRadius}px"><b>Quick Settings</b><button style="background:${s.accent}">Wi-Fi　On</button><button>Bluetooth　On</button><button>Dark Style</button></div><div class="dock-sample" style="background:${s.dock};border-radius:${this.engine.state.shellGeometry.dockRadius}px">◉　▣　●　▰　⚙</div></div>`;
    const contextMenu = ['gtk3', 'gtk4'].includes(this.preview) ? `<div class="context-menu-preview" style="background:${this.engine.state.effects.contextMenuTransparent ? 'transparent' : c.context_menu_bg_color};color:${c.headerbar_fg_color};min-width:${g.context_menu_min_width}px"><b>Open</b><span>Rename…</span><span>Move to…</span><hr><span>Properties</span></div>` : '';
    return `<section class="preview-pane ${this.engine.state.effects.glass ? 'glass' : ''} ${this.engine.state.effects.motion ? 'motion' : ''}"><header class="preview-head"><div><small>LIVE PREVIEW</small><b>${this.escape(preset)}</b></div><span>Approximation</span></header><div class="preview-tabs" role="tablist">${views.map(([id, label]) => `<button role="tab" aria-selected="${this.preview === id}" class="${this.preview === id ? 'active' : ''}" data-preview="${id}">${label}</button>`).join('')}</div><div class="preview-canvas">${tab}${contextMenu}</div><p class="preview-note">Move a slider to preview it. Apply to save; restart GTK apps to see the change.</p></section>`;
  }

  escape(value: string): string { return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!); }
  colorLabel(key: keyof ColorTokens): string { return key.replace(/_bg_color$/, ' background').replace(/_fg_color$/, ' text').replace(/_color$/, '').replace(/_/g, ' ').replace('headerbar', 'title bar').replace(/^view /, 'content '); }
  async run(pending: string, success: string, action: () => Promise<void>): Promise<void> {
    const status = document.getElementById('action-status'); if (status) status.textContent = pending;
    try { await action(); this.render(); const result = document.getElementById('action-status'); if (result) result.textContent = success; if (success === 'Theme changes applied successfully.') this.showToast(success); }
    catch (error) { const result = document.getElementById('action-status'); if (result) result.textContent = `Could not finish: ${String(error)}`; }
  }

  showToast(message: string): void {
    document.getElementById('apply-toast')?.remove();
    const toast = document.createElement('div');
    toast.id = 'apply-toast'; toast.className = 'apply-toast'; toast.setAttribute('role', 'status'); toast.setAttribute('aria-live', 'polite'); toast.textContent = message;
    document.body.appendChild(toast);
    window.setTimeout(() => toast.remove(), 3200);
  }
}
