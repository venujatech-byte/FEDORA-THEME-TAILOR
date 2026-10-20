# AGENTS.md — Linux Theme & GTK/Shell Customizer

## 1. Project Overview
This project is a Linux desktop application designed primarily for Fedora Workstation (GNOME / GTK3 / GTK4 / Libadwaita) to customize system colors, window titlebars, sidebars, compact headerbar geometries, and GNOME Shell themes. 

The core engine parses, previews, and safely injects structured CSS rulesets (variables + direct widget overrides + geometry tweaks) into `~/.config/gtk-4.0/gtk.css`, `~/.config/gtk-3.0/gtk.css`, and Flatpak overrides.

---

## 2. Mandatory Agent Operating Protocols

### 2.1 Strict Atomic Git Commit Rule (CRITICAL)
You MUST create a git commit after **every single file system or code change**. Never batch multiple logical changes or multiple new files into a single commit.

- **Rule 1 (File Creation):** The moment you create a new file (even a config, boilerplate, or empty module), immediately stage and commit it:
  `git add <file> && git commit -m "chore: create <filename>"`
- **Rule 2 (File Modification):** After any edit to an existing file (adding a function, fixing a bug, updating styles, or editing documentation), immediately stage and commit that specific change before moving to the next file or step.
- **Rule 3 (File Deletion/Rename):** Commit file deletions or moves immediately as standalone commits.
- **Rule 4 (Conventional Commits):** Always use descriptive Conventional Commit prefixes:
  - `feat:` new feature or UI component
  - `fix:` bug fix or CSS selector correction
  - `refactor:` code cleanup (Ponytail pass)
  - `style:` UI/UX polish (Taste-Skill pass)
  - `chore:` file creation, scaffolding, or config updates
  - `docs:` updating `AGENTS.md` or `README.md`
- **Rule 5 (Pre-Action Check):** Before starting a new task, run `git status` to verify the working tree is clean. If uncommitted files exist, commit them individually first.

---

### 2.2 Skill & Ruleset Enforcement: `ponytail` (Code Minimalism)
You must strictly operate under the **Ponytail** YAGNI-first minimalism philosophy:
1. **Justify Every Line:** Before writing any class, helper, or wrapper, ask if the standard library or native GTK/HTML/CSS feature already solves it.
2. **Zero Dependency Sprawl:** Do NOT install third-party libraries for color hex/RGB conversion, CSS string templating, file I/O, or state management. Write lean, native standard library functions.
3. **No Speculative Abstractions:** Do not create abstract base classes, complex factory patterns, or plugin interfaces until at least 3 concrete implementations exist.
4. **Small Diffs:** Aim to cut generated LOC by >50%. Prefer flat data structures, pure functions, and direct DOM/widget bindings over deep component hierarchies.
5. **Self-Audit:** Before committing a feature, run a mental `/ponytail-review` pass to strip unused imports, dead variables, and redundant wrappers.

---

### 2.3 Skill & Ruleset Enforcement: `taste-skill` (UI/UX & Aesthetic Direction)
You must strictly apply **Taste-Skill (`design-taste-frontend`)** principles to avoid generic, boilerplate AI interfaces. The app must feel like a high-craft, native developer/designer studio tool.

#### Taste-Skill Dials Configuration:
- **`DESIGN_VARIANCE`: Low-Medium (Clean, Precision Studio)** — Use crisp alignment, intentional asymmetry (split inspector + live interactive mock window preview), and zero visual clutter.
- **`MOTION_INTENSITY`: Subtle & Tactile** — Use smooth 150ms–200ms cubic-bezier transitions for color swatch switches, live preview updates, and compact-mode toggles. Avoid jarring bounces.
- **`VISUAL_DENSITY`: High-Craft Compact** — Match the philosophy of the user's CSS (compact, high utility, zero wasted vertical space, crisp 1px borders).

#### Visual & Typography Rules:
- **No Boilerplate Layouts:** Never build a generic centered landing-page form. Build a 2-pane studio layout:
  - **Left Pane:** Categorized Palette Tokens, Geometry Sliders (Headerbar height, button size), and Preset Manager.
  - **Right Pane:** Live Interactive Mock Window (showing an accurate GTK4/GTK3 window with headerbar, windowcontrols, `.navigation-sidebar`, and content view updating in real time).
- **Color & Contrast:** Default the app's own theme to the user's dark carbon/slate aesthetic (`#000000` canvas, `#141414` cards/popovers, `#1e232d` headerbars and sidebars, `#ffffff` crisp typography).
- **Full Output Enforcement:** Never leave `// TODO` or placeholder comments in UI or CSS generator code. Write complete implementations.

---

## 3. Core CSS Engine Specification (Baseline Template)
The application's generator must be built around this exact architecture and support dynamic customization of all tokens and geometry rules below:

### 3.1 Color Tokens (`@define-color`)
- **Window & View:**
  - `window_bg_color` (Default: `#000000`)
  - `window_fg_color` (Default: `#ffffff`)
  - `view_bg_color` (Default: `#000000`)
  - `view_fg_color` (Default: `#ffffff`)
- **Surfaces (Cards, Dialogs, Popovers):**
  - `card_bg_color` (Default: `#141414`)
  - `dialog_bg_color` (Default: `#141414`)
  - `popover_bg_color` (Default: `#141414`)
- **Headerbar:**
  - `headerbar_bg_color` (Default: `#1e232d`)
  - `headerbar_fg_color` (Default: `#ffffff`)
  - `headerbar_border_color` (Default: `#1e232d`)
  - `headerbar_backdrop_color` (Default: `#1e232d`)
- **Sidebar & Navigation:**
  - `sidebar_bg_color` (Default: `#1e232d`)
  - `sidebar_fg_color` (Default: `#ffffff`)
  - `sidebar_backdrop_color` (Default: `#1e232d`)
  - `sidebar_border_color` (Default: `#1e232d`)
  - `secondary_sidebar_bg_color` (Default: `#1e232d`)
  - `secondary_sidebar_backdrop_color` (Default: `#1e232d`)

### 3.2 Direct Widget & Geometry Overrides
1. **Titlebar & Tabbar Unification:**
   - Selectors: `headerbar, .titlebar, windowcontrols, tabbar, tab`
   - Rules: `background-color: <headerbar_bg_color> !important; background-image: none !important;`
2. **Compact Headerbar Geometry:**
   - Selector: `headerbar`
   - Configurable props: `min-height` (Default: `26px`), `padding-top` (`1px`), `padding-bottom` (`1px`).
3. **Sidebar Overrides & Transparent Lists:**
   - Selectors: `.navigation-sidebar, navigation-sidebar, stacksidebar, .sidebar` -> `background-color: <sidebar_bg_color> !important;`
   - Inner Lists: `.navigation-sidebar list, .navigation-sidebar listview, stacksidebar list` -> `background-color: transparent !important;`
4. **Compact GTK4 Window Controls & Title:**
   - `windowcontrols button, windowcontrols button.image-button`: `min-height: 18px; min-width: 18px; padding: 0 3px; margin: 0;`
   - `windowtitle, windowtitle label.title`: `min-height: 18px; padding: 0; margin: 0;`
5. **Compact GTK3 & SSD Fallbacks:**
   - `window.ssd headerbar button.titlebutton, headerbar.default-decoration button.titlebutton`: `min-height: 15px; min-width: 15px; padding: 0 3px; margin: 0;`
   - `window.ssd headerbar label.title, headerbar.default-decoration label.title, headerbar.default-decoration windowtitle`: `min-height: 15px; padding: 0; margin: 0;`
6. **Kinetic Scroll / Overshoot Disabler (Toggleable):**
   - `scrolledwindow overshoot, scrolledwindow undershoot { opacity: 0; }`

---

## 4. Recommended Tech Stack (Ponytail-Aligned)
Choose ONE of the following ultra-lean stacks (confirm with the user in Phase 0 if not yet initialized):
- **Option A (Native Fedora Desktop App):** **Python 3 + PyGObject (GTK4 / Libadwaita)**. Zero web bundle overhead, native Linux file access, native GTK CSS provider previewing.
- **Option B (Lightweight Web-UI Desktop App):** **Tauri (Rust + Vanilla TS/HTML/CSS)**. Tiny binary (~3MB), zero Electron bloat, ideal for custom `taste-skill` studio interfaces.

---

## 5. Development Roadmap

*(Reminder: Every single checkbox item and every single file creation below requires its own immediate `git commit`!)*

### Phase 0: Repository Initialization & Scaffolding
- [ ] Initialize Git repository (`git init`) and commit `.gitignore`.
- [ ] Commit `AGENTS.md` to the repository root.
- [ ] Commit `README.md` with project vision and Fedora usage instructions.
- [ ] Scaffold minimal project directory structure (commit each config/entry file individually).

### Phase 1: Core CSS Parser, AST & Generator Engine
- [ ] Create `theme_schema` module defining default palette tokens and geometry parameters (Defaulting to the Fedora OLED Dark `#000000` / `#141414` / `#1e232d` theme).
- [ ] Build pure-function CSS generator that compiles state into valid GTK3/GTK4 CSS with zero external dependencies (Ponytail rule).
- [ ] Build a parser to read existing `gtk.css` files and extract `@define-color` values and pixel dimensions back into the app state.
- [ ] Add unit tests for CSS generation and parsing.

### Phase 2: Safe File System & Backup Manager
- [ ] Build path resolver for `~/.config/gtk-4.0/gtk.css` and `~/.config/gtk-3.0/gtk.css`.
- [ ] Implement automatic timestamped backup creation (`gtk.css.bak.<timestamp>`) before any write operation.
- [ ] Implement One-Click Rollback / Restore to original Fedora Adwaita defaults.
- [ ] Add optional Flatpak filesystem override helper (`flatpak override --user --filesystem=xdg-config/gtk-4.0:ro` and `gtk-3.0:ro`) so sandboxed apps inherit the theme.

### Phase 3: Studio UI & Live Interactive Preview (`taste-skill`)
- [ ] Design and commit the base studio layout shell using `taste-skill` high-craft dark aesthetics.
- [ ] Build the **Color Palette Editor** (grouped by Window/View, Cards/Dialogs, Headerbar, and Sidebar) with hex inputs, contrast badges, and linked token toggles (e.g., sync `headerbar_bg_color` and `sidebar_bg_color`).
- [ ] Build the **Geometry & Behavior Inspector**:
  - Sliders for Headerbar `min-height` (e.g., `20px` to `46px`, default `26px`) and vertical padding.
  - Sliders for GTK4 & GTK3 Window Control button dimensions (`15px`–`24px`).
  - Toggle switch for "Disable ScrolledWindow Overshoot/Undershoot Glow".
- [ ] Build the **Live Mock GTK Window Preview**:
  - Real-time interactive mock showing a window headerbar, minimize/maximize/close buttons, tabs, `.navigation-sidebar`, card surfaces, and dialogs that update instantly as sliders/colors change.

### Phase 4: Preset Management & GNOME Shell Integration
- [ ] Implement JSON/CSS Preset saving, loading, and exporting (include the user's baseline CSS as the built-in `"Fedora OLED Slate Compact"` preset).
- [ ] Add GNOME Shell `gnome-shell.css` generator for matching top panel and quick-settings colors (`~/.themes/<ThemeName>/gnome-shell/gnome-shell.css`).
- [ ] Add Live Reload trigger (notifying running GTK apps or refreshing `gsettings` where supported without requiring a full logout).

### Phase 5: Polish, Audit & Packaging
- [ ] Run a full **Ponytail Audit**: remove any unused functions, compress redundant CSS string builders, and verify zero unnecessary dependencies.
- [ ] Run a full **Taste-Skill UI Audit**: verify spacing hierarchy, keyboard navigation, focus states, and smooth micro-interactions.
- [ ] Create Fedora packaging script (RPM spec or Flatpak manifest / local `~/.local/share/applications` desktop entry installer).

---

## 6. Agent Execution Checklist (Run Before Every Step)
1. **Did I just create a file?** -> Stop and `git commit` right now.
2. **Did I just edit a file?** -> Stop and `git commit` right now.
3. **Am I about to install a package?** -> Stop. Apply `ponytail`: can I write this in 15 lines of standard library code instead?
4. **Am I building a UI component?** -> Apply `taste-skill`: does this look like a bespoke, high-density Linux design tool rather than generic web boilerplate?