import { ThemeEngine, ColorTokens, GeometryTokens, DEFAULT_COLORS, DEFAULT_GEOMETRY, BUILTIN_PRESETS } from './theme-engine';

const COLOR_GROUPS: Record<string, (keyof ColorTokens)[]> = {
  'Window & View': ['window_bg_color', 'window_fg_color', 'view_bg_color', 'view_fg_color'],
  'Cards, Dialogs & Popovers': ['card_bg_color', 'dialog_bg_color', 'popover_bg_color'],
  'Headerbar': ['headerbar_bg_color', 'headerbar_fg_color', 'headerbar_border_color', 'headerbar_backdrop_color'],
  'Sidebar & Navigation': ['sidebar_bg_color', 'sidebar_fg_color', 'sidebar_backdrop_color', 'sidebar_border_color', 'secondary_sidebar_bg_color', 'secondary_sidebar_backdrop_color'],
};

const GEOMETRY_CONTROLS: Array<{
  key: keyof GeometryTokens;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  group: string;
}> = [
  { key: 'headerbar_min_height', label: 'Headerbar Height', min: 20, max: 46, step: 1, unit: 'px', group: 'Headerbar Geometry' },
  { key: 'headerbar_padding_top', label: 'Headerbar Padding Top', min: 0, max: 8, step: 1, unit: 'px', group: 'Headerbar Geometry' },
  { key: 'headerbar_padding_bottom', label: 'Headerbar Padding Bottom', min: 0, max: 8, step: 1, unit: 'px', group: 'Headerbar Geometry' },
  { key: 'gtk4_button_min_height', label: 'GTK4 Button Height', min: 15, max: 24, step: 1, unit: 'px', group: 'Window Controls (GTK4)' },
  { key: 'gtk4_button_min_width', label: 'GTK4 Button Width', min: 15, max: 24, step: 1, unit: 'px', group: 'Window Controls (GTK4)' },
  { key: 'gtk4_button_padding', label: 'GTK4 Button Padding', min: 0, max: 8, step: 1, unit: 'px', group: 'Window Controls (GTK4)' },
  { key: 'gtk4_title_min_height', label: 'GTK4 Title Height', min: 15, max: 24, step: 1, unit: 'px', group: 'Window Controls (GTK4)' },
  { key: 'gtk3_button_min_height', label: 'GTK3 Button Height', min: 12, max: 20, step: 1, unit: 'px', group: 'Window Controls (GTK3)' },
  { key: 'gtk3_button_min_width', label: 'GTK3 Button Width', min: 12, max: 20, step: 1, unit: 'px', group: 'Window Controls (GTK3)' },
  { key: 'gtk3_button_padding', label: 'GTK3 Button Padding', min: 0, max: 8, step: 1, unit: 'px', group: 'Window Controls (GTK3)' },
  { key: 'gtk3_title_min_height', label: 'GTK3 Title Height', min: 12, max: 20, step: 1, unit: 'px', group: 'Window Controls (GTK3)' },
];

export class UIController {
  engine: ThemeEngine;
  unsub: (() => void) | null = null;

  constructor(engine: ThemeEngine) {
    this.engine = engine;
  }

  async initialize(): Promise<void> {
    this.unsub = this.engine.subscribe(() => this.render());
    this.bindEvents();
  }

  bindEvents(): void {
    document.addEventListener('input', (e) => {
      const target = e.target as HTMLElement;
      if (target.dataset.colorKey) {
        this.engine.setColor(target.dataset.colorKey as keyof ColorTokens, target.value);
        const swatch = target.nextElementSibling as HTMLElement;
        if (swatch?.classList.contains('color-swatch')) {
          swatch.style.backgroundColor = target.value;
        }
      }
      if (target.dataset.geometryKey) {
        const value = target.type === 'checkbox' ? (target as HTMLInputElement).checked : parseFloat(target.value);
        this.engine.setGeometry(target.dataset.geometryKey as keyof GeometryTokens, value);
      }
    });

    document.addEventListener('change', (e) => {
      const target = e.target as HTMLElement;
      if (target.dataset.presetAction === 'load') {
        this.engine.loadPreset(target.dataset.presetName!);
      }
      if (target.dataset.presetAction === 'save') {
        const name = (document.getElementById('preset-name-input') as HTMLInputElement)?.value?.trim();
        if (name) {
          this.engine.savePreset(name);
          this.render();
        }
      }
      if (target.dataset.action === 'apply') {
        this.engine.applyTheme();
      }
      if (target.dataset.action === 'rollback') {
        this.engine.rollback();
      }
      if (target.dataset.action === 'flatpak') {
        this.engine.setupFlatpakOverrides();
      }
      if (target.dataset.action === 'reset') {
        this.engine.state.colors = { ...DEFAULT_COLORS };
        this.engine.state.geometry = { ...DEFAULT_GEOMETRY };
        this.engine.state.presetName = 'Custom';
        this.engine.notify();
      }
    });

    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.dataset.presetAction === 'delete') {
        const name = target.dataset.presetName!;
        if (name !== 'Fedora OLED Slate Compact' && confirm(`Delete preset "${name}"?`)) {
          delete BUILTIN_PRESETS[name];
          this.render();
        }
      }
    });
  }

  render(): void {
    const app = document.getElementById('app');
    if (!app) return;

    const { colors, geometry, presetName } = this.engine.state;

    app.innerHTML = `
      <div class="panel scrollbar-thin" role="navigation" aria-label="Theme controls">
        <div class="panel-header">Palette Tokens</div>
        <div class="panel-content">
          ${Object.entries(COLOR_GROUPS).map(([group, keys]) => `
            <section class="section animate-in">
              <h3 class="section-title">${group}</h3>
              <div class="token-group">
                ${keys.map(key => `
                  <div class="token-row">
                    <label class="token-label" for="color-${key}">${this.formatTokenName(key)}</label>
                    <div class="token-input">
                      <input
                        type="color"
                        id="color-${key}"
                        class="color-input"
                        value="${colors[key]}"
                        data-color-key="${key}"
                        aria-label="${this.formatTokenName(key)}"
                      >
                      <div class="color-swatch" style="background-color: ${colors[key]}" aria-hidden="true"></div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </section>
          `).join('')}

          <section class="section animate-in">
            <h3 class="section-title">Presets</h3>
            <div class="preset-list" role="listbox" aria-label="Theme presets">
              ${this.engine.getPresets().map(name => `
                <div class="preset-item ${name === presetName ? 'active' : ''}" role="option" aria-selected="${name === presetName}">
                  <span class="preset-name">${name}</span>
                  <div class="preset-actions">
                    <button class="preset-btn" data-preset-action="load" data-preset-name="${name}" aria-label="Load ${name}" title="Load">↘</button>
                    ${name !== 'Fedora OLED Slate Compact' ? `
                      <button class="preset-btn danger" data-preset-action="delete" data-preset-name="${name}" aria-label="Delete ${name}" title="Delete">✕</button>
                    ` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
            <div style="margin-top: 12px; display: flex; gap: 8px;">
              <input type="text" id="preset-name-input" class="color-input" style="flex: 1;" placeholder="New preset name" aria-label="Preset name">
              <button class="btn primary" data-preset-action="save" aria-label="Save preset">Save</button>
            </div>
          </section>
        </div>
        <div class="action-bar">
          <button class="btn danger" data-action="reset" aria-label="Reset to defaults">Reset</button>
          <button class="btn primary" data-action="apply" aria-label="Apply theme">Apply</button>
        </div>
      </div>

      <div class="panel scrollbar-thin" role="navigation" aria-label="Geometry controls">
        <div class="panel-header">Geometry & Behavior</div>
        <div class="panel-content">
          ${this.renderGeometryGroups(geometry)}
          <section class="section animate-in">
            <h3 class="section-title">Behavior</h3>
            <div class="token-group">
              <label class="toggle-row">
                <span class="toggle-label">Disable ScrolledWindow Overshoot/Undershoot</span>
                <label class="toggle">
                  <input type="checkbox" data-geometry-key="disable_overshoot" ${geometry.disable_overshoot ? 'checked' : ''} aria-label="Disable overshoot">
                  <span class="toggle-slider"></span>
                </label>
              </label>
            </div>
          </section>
        </div>
        <div class="action-bar">
          <button class="btn" data-action="flatpak" aria-label="Setup Flatpak overrides">Flatpak Overrides</button>
          <button class="btn" data-action="rollback" aria-label="Rollback to last backup">Rollback</button>
        </div>
      </div>

      <div class="preview-pane">
        <div class="preview-header">Live Preview</div>
        <div class="preview-content">
          <div class="mock-window" style="--headerbar-height: ${geometry.headerbar_min_height}px">
            <div class="mock-headerbar">
              <div class="mock-window-controls">
                <button class="mock-window-control close" aria-label="Close"></button>
                <button class="mock-window-control minimize" aria-label="Minimize"></button>
                <button class="mock-window-control maximize" aria-label="Maximize"></button>
              </div>
              <span class="mock-title">Fedora Theme Tailor — theme-engine.ts</span>
              <div style="width: 72px;"></div>
            </div>
            <div class="mock-tabs">
              <button class="mock-tab active" aria-selected="true">theme-engine.ts</button>
              <button class="mock-tab" aria-selected="false">ui-controller.ts</button>
              <button class="mock-tab" aria-selected="false">main.ts</button>
              <button class="mock-tab" aria-selected="false">styles.css</button>
            </div>
            <div class="mock-body">
              <nav class="mock-sidebar" aria-label="File navigation">
                <div class="mock-sidebar-item active" aria-current="page">src/lib</div>
                <div class="mock-sidebar-item">src/components</div>
                <div class="mock-sidebar-item">src/styles</div>
                <div class="mock-sidebar-item">src-tauri</div>
                <div class="mock-sidebar-item">Cargo.toml</div>
                <div class="mock-sidebar-item">package.json</div>
                <div class="mock-sidebar-item">tauri.conf.json</div>
              </nav>
              <main class="mock-content" role="main">
                <div class="mock-card">
                  <div class="mock-card-title">Theme Engine Status</div>
                  <div class="mock-card-text">Current preset: <strong>${presetName}</strong>. Modify colors and geometry above to see live updates in this preview window.</div>
                </div>
                <div class="mock-card">
                  <div class="mock-card-title">Color Tokens</div>
                  <div class="mock-card-text">${Object.keys(colors).length} color tokens defined. All values use CSS custom properties for instant preview updates.</div>
                </div>
                <div class="mock-card">
                  <div class="mock-card-title">Geometry Tokens</div>
                  <div class="mock-card-text">${Object.keys(geometry).length} geometry parameters. Headerbar height: ${geometry.headerbar_min_height}px. GTK4 button size: ${geometry.gtk4_button_min_height}×${geometry.gtk4_button_min_width}px.</div>
                </div>
                <button class="mock-button primary">Primary Action</button>
                <button class="mock-button secondary">Secondary Action</button>
                <button class="mock-button" style="background: var(--danger);">Destructive</button>
              </main>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderGeometryGroups(geometry: GeometryTokens): string {
    const groups: Record<string, typeof GEOMETRY_CONTROLS> = {};
    GEOMETRY_CONTROLS.forEach(control => {
      if (!groups[control.group]) groups[control.group] = [];
      groups[control.group].push(control);
    });

    return Object.entries(groups).map(([group, controls]) => `
      <section class="section animate-in">
        <h3 class="section-title">${group}</h3>
        <div class="token-group">
          ${controls.map(control => `
            <div class="slider-row">
              <label class="slider-label" for="geo-${control.key}">${control.label}</label>
              <input
                type="range"
                id="geo-${control.key}"
                class="slider"
                min="${control.min}"
                max="${control.max}"
                step="${control.step}"
                value="${geometry[control.key]}"
                data-geometry-key="${control.key}"
                aria-label="${control.label}"
              >
              <span class="slider-value">${geometry[control.key]}${control.unit}</span>
            </div>
          `).join('')}
        </div>
      </section>
    `).join('');
  }

  formatTokenName(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, c => c.toUpperCase());
  }
}