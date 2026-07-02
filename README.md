# Notepad App — Tauri + React + Tailwind Starter

A minimal but nice-looking notepad app: sidebar note list, dark/light mode,
open/save to real files on disk, monospace editor.

## Setup on Arch Linux

1. Install prerequisites:
   ```bash
   sudo pacman -S webkit2gtk-4.1 base-devel curl wget file openssl appmenu-gtk-module libappindicator-gtk3 librsvg
   ```

2. Install Rust (if you don't have it already):
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

3. Install Node dependencies:
   ```bash
   npm install
   ```

4. Run in dev mode (hot reload, opens a native window):
   ```bash
   npm run tauri dev
   ```

5. Build a release binary:
   ```bash
   npm run tauri build
   ```
   Output lands in `src-tauri/target/release/`.

## Notes

- Icons: Tauri expects icons in `src-tauri/icons/`. Generate a full set from
  a single PNG with `npm run tauri icon path/to/logo.png` before your first
  release build (dev mode works fine without them).
- The editor uses a plain `<textarea>` for now — swap in something like
  `@uiw/react-codemirror` later if you want syntax highlighting or markdown
  preview.
- Styling is all Tailwind utility classes in `App.jsx` — easiest place to
  start customizing colors, spacing, fonts.
