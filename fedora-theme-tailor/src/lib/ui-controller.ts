import { ThemeEngine, ColorTokens, GeometryTokens, ShellTokens } from './theme-engine';

const groups: Record<string, (keyof ColorTokens)[]> = {
  'Window & content': ['window_bg_color', 'window_fg_color', 'view_bg_color', 'view_fg_color'],
  'Cards & popovers': ['card_bg_color', 'dialog_bg_color', 'popover_bg_color'],
  'Title bars': ['headerbar_bg_color', 'headerbar_fg_color', 'headerbar_border_color', 'headerbar_backdrop_color'],
  'Sidebars': ['sidebar_bg_color', 'sidebar_fg_color', 'sidebar_backdrop_color', 'sidebar_border_color', 'secondary_sidebar_bg_color', 'secondary_sidebar_backdrop_color'],
};
const geometry: Array<[keyof GeometryTokens, string, number, number]> = [
  ['headerbar_min_height', 'Title bar minimum height', 20, 46], ['headerbar_padding_top', 'Top padding', 0, 8], ['headerbar_padding_bottom', 'Bottom padding', 0, 8],
  ['gtk4_button_min_height', 'GTK 4 title-button minimum height', 15, 24], ['gtk4_button_min_width', 'GTK 4 title-button minimum width', 15, 24], ['gtk4_button_padding', 'GTK 4 title-button padding', 0, 8], ['gtk4_title_min_height', 'GTK 4 title text minimum height', 15, 24],
  ['gtk3_button_min_height', 'GTK 3 title-button minimum height', 12, 20], ['gtk3_button_min_width', 'GTK 3 title-button minimum width', 12, 20], ['gtk3_button_padding', 'GTK 3 title-button padding', 0, 8], ['gtk3_title_min_height', 'GTK 3 title text minimum height', 12, 20],
];
const shellNames: Record<keyof ShellTokens, string> = { panel: 'Top bar', menu: 'Menus & quick settings', text: 'Shell text', accent: 'Highlights', dock: 'Dock' };

export class UIController {
  active = 'gtk';
  preview = 'gtk4';
  constructor(public engine: ThemeEngine) {}
  async initialize(): Promise<void> { this.bindEvents(); }

  bindEvents(): void {
    document.addEventListener('input', e => {
      const input = e.target as HTMLInputElement;
      if (input.dataset.color) this.engine.setColor(input.dataset.color as keyof ColorTokens, input.value);
      if (input.dataset.shell) this.engine.setShellColor(input.dataset.shell as keyof ShellTokens, input.value);
      if (input.dataset.effect) this.engine.setEffect(input.dataset.effect as 'glass' | 'motion', input.checked);
      if (input.dataset.geometry) this.engine.setGeometry(input.dataset.geometry as keyof GeometryTokens, input.type === 'checkbox' ? input.checked : +input.value);
      if (input.dataset.color || input.dataset.shell || input.dataset.geometry || input.dataset.effect) {
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
      const action = button.dataset.action;
      if (action === 'apply') this.run('Saving GTK and Shell styles…', 'GTK styles saved. Restart apps to reload; enable User Themes to use the Shell theme.', () => this.engine.applyTheme());
      if (action === 'rollback') this.run('Undoing the last apply…', 'Previous GTK and Shell styles restored.', () => this.engine.rollback());
      if (action === 'original' && confirm('Restore the GTK and Shell files saved before the first apply?')) this.run('Restoring original styles…', 'Original styles restored.', () => this.engine.restoreOriginal());
      if (action === 'flatpak') this.run('Enabling Flatpak access…', 'Flatpak apps can now read GTK 3 and GTK 4 styles.', () => this.engine.setupFlatpakOverrides());
      if (action === 'reset') { this.engine.loadPreset('Fedora OLED Slate Compact'); this.render(); }
    });
  }

  render(): void {
    const { colors: c, geometry: g, shell: s, presetName } = this.engine.state;
    const app = document.getElementById('app');
    if (!app) return;
    const colorRows = (items: Array<[string, string, string]>) => items.map(([label, key, value]) => `<label class="color-row"><span>${label}</span><input type="color" value="${value}" data-${key.startsWith('shell:') ? 'shell' : 'color'}="${key.replace('shell:', '')}" aria-label="${label}"></label>`).join('');
    const tabs = [['gtk', 'GTK apps'], ['shell', 'GNOME Shell'], ['recovery', 'Presets & backups']];
    const body = this.active === 'gtk' ? `
      <p class="intro">Choose how GTK 3 and GTK 4 apps look. Your original files are backed up the first time you apply.</p>
      ${Object.entries(groups).map(([name, keys]) => `<section><h3>${name}</h3>${colorRows(keys.map(k => [this.colorLabel(k), k, c[k]]))}</section>`).join('')}
      <section><h3>Size & spacing</h3>${geometry.map(([key, label, min, max]) => `<label class="range-row"><span>${label}</span><input type="range" min="${min}" max="${max}" value="${g[key]}" data-geometry="${key}"><output>${g[key]} px</output></label>`).join('')}<p>These values set minimum sizes. GTK may grow controls to fit an app. Restart apps after applying to see changes.</p>
      <label class="check-row"><input type="checkbox" data-geometry="disable_overshoot" ${g.disable_overshoot ? 'checked' : ''}> Hide scroll edge glow</label><label class="check-row"><input type="checkbox" data-effect="glass" ${this.engine.state.effects.glass ? 'checked' : ''}> Translucent glass surfaces</label><label class="check-row"><input type="checkbox" data-effect="motion" ${this.engine.state.effects.motion ? 'checked' : ''}> Subtle hover animations</label><p>Glass uses transparency; GTK themes cannot add true backdrop blur.</p></section>
      <section><h3>Current preset</h3><p>${this.escape(presetName)}</p><button class="button" data-action="reset">Reset to starter theme</button></section>
      <footer><button class="button primary" data-action="apply">Apply GTK + Shell styles</button><small>GTK apps need a restart. Libadwaita apps may only partly follow custom CSS.</small></footer>`
      : this.active === 'shell' ? `<p class="intro">Style the top bar, quick settings buttons, menus and dock.</p><section><h3>Desktop colors</h3>${colorRows(Object.entries(shellNames).map(([key, label]) => [label, `shell:${key}`, s[key as keyof ShellTokens]]))}<label class="check-row"><input type="checkbox" data-effect="glass" ${this.engine.state.effects.glass ? 'checked' : ''}> Glass tint for menus and dock</label><label class="check-row"><input type="checkbox" data-effect="motion" ${this.engine.state.effects.motion ? 'checked' : ''}> Subtle hover animations</label><p>Glass is translucent; GNOME Shell theme CSS cannot reliably blur the desktop behind it.</p></section>
        <aside class="notice">Save the theme, then enable the <b>User Themes</b> extension in Extensions or Tweaks and choose <b>FedoraThemeTailor</b>. GNOME Shell styles can vary between GNOME versions.</aside><footer><button class="button primary" data-action="apply">Save GTK + Shell styles</button><small>GTK files apply globally; Shell requires User Themes.</small></footer>`
      : `<p class="intro">Load a ready-made look, save your own, or recover the files from before an apply.</p><section><h3>Built-in and saved looks</h3>${this.engine.getPresets().map(name => `<div class="preset-row"><span>${this.escape(name)}</span><button class="button" data-preset="load" data-name="${this.escape(name)}">Preview</button>${!['Fedora OLED Slate Compact', 'Fedora Blue', 'Violet Night', 'Glass Night'].includes(name) ? `<button class="button danger" data-preset="delete" data-name="${this.escape(name)}">Delete</button>` : ''}</div>`).join('')}
        <div class="save-row"><input id="preset-name" placeholder="Name this look" aria-label="Preset name"><button class="button primary" data-preset="save">Save preset</button></div></section>
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
      : this.preview === 'shell' ? `<div class="desktop-sample"><div class="topbar" style="background:${s.panel};color:${s.text}">Activities <span>Oct 21  •••</span> ● ◖</div><div class="desktop-window" style="background:${c.window_bg_color};color:${c.window_fg_color}">Fedora desktop <small>GNOME Shell top bar preview</small></div></div>`
      : `<div class="desktop-sample"><div class="topbar" style="background:${s.panel};color:${s.text}">Activities <span>Oct 21  •••</span> ● ◖</div><div class="quick-menu" style="background:${s.menu};color:${s.text}"><b>Quick Settings</b><button style="background:${s.accent}">Wi-Fi　On</button><button>Bluetooth　On</button><button>Dark Style</button></div><div class="dock-sample" style="background:${s.dock}">◉　▣　●　▰　⚙</div></div>`;
    return `<section class="preview-pane"><header class="preview-head"><div><small>LIVE PREVIEW</small><b>${this.escape(preset)}</b></div><span>Approximation</span></header><div class="preview-tabs" role="tablist">${views.map(([id, label]) => `<button role="tab" aria-selected="${this.preview === id}" class="${this.preview === id ? 'active' : ''}" data-preview="${id}">${label}</button>`).join('')}</div><div class="preview-canvas">${tab}</div><p class="preview-note">Move a slider to preview it. Apply to save; restart GTK apps to see the change.</p></section>`;
  }

  escape(value: string): string { return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!); }
  colorLabel(key: keyof ColorTokens): string { return key.replace(/_bg_color$/, ' background').replace(/_fg_color$/, ' text').replace(/_color$/, '').replace(/_/g, ' ').replace('headerbar', 'title bar').replace(/^view /, 'content '); }
  async run(pending: string, success: string, action: () => Promise<void>): Promise<void> {
    const status = document.getElementById('action-status'); if (status) status.textContent = pending;
    try { await action(); this.render(); const result = document.getElementById('action-status'); if (result) result.textContent = success; }
    catch (error) { const result = document.getElementById('action-status'); if (result) result.textContent = `Could not finish: ${String(error)}`; }
  }
}
