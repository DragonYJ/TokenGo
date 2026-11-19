# Install TokenGo from GitHub

Requires Node.js 22.12 or newer, npm, Git, and a graphical desktop session. macOS, Windows and Linux use the same commands. On Linux, Electron also needs the system libraries required by Chromium and a working display server; a headless SSH session can use `scan` or `watch` instead.

```sh
npm install --global github:DragonYJ/TokenGo
tokengo enable
```

On macOS, `enable` installs a local companion that follows Codex automatically. On Windows and Linux, automatic following is not implemented yet; use `tokengo start --collect` for manual collection. The package is a CLI-installed companion. It does not register as a Codex marketplace plugin, modify Codex configuration, or inject UI into Codex. Codex can install it by following these commands. A local process provides native cards while Codex is running, even between agent turns.

## What installation does

1. npm installs TokenGo's public source from GitHub. There are no TokenGo install hooks, no production dependencies, and no collection during installation.
2. The first `start` or `open` downloads Electron, pinned to the version in `package.json`, using npm and Electron's official release archives. Downloads are verified against Electron's published SHA-256 checksums; cached archives are reused. The launcher uses curl when available, with a bounded download timeout, and native extraction on macOS. Its runtime is stored in `~/.cache/tokengo/electron-VERSION`. A development checkout reuses its matching Electron dependency.
3. TokenGo starts as a separate process. `--collect` explicitly enables local collection; `open` preserves the existing preference. Closing the cabinet leaves the tray process running. Quit stops it. Automatic login startup is currently supported by the standalone packaged app. With the GitHub CLI installation, run `tokengo open` after restarting your computer.

Downloads contact GitHub and the npm registry, which can see ordinary request metadata such as your IP address. No Codex records are uploaded. Once installed, collection, notifications, statistics and card generation work offline. No account or paid backend is required.

## Following Codex on macOS

`tokengo enable` explicitly enables local collection and installs `~/Library/LaunchAgents/io.tokengo.codex-companion.plist`. The login service runs a small Node observer that checks executable names for the current user every five seconds. It does not inspect command arguments, conversations, or other applications' data. Supported hosts include the Codex desktop executable, the Codex host inside ChatGPT, and the native `codex` CLI. Helper/rendering processes alone do not activate it.

When Codex appears, the observer starts the collector and notification renderer without a main window or Dock icon. When Codex exits, the companion exits. Closing a Codex window may leave Codex running; quit the client to end the process. The observer itself remains available for the next launch. Choosing Quit in TokenGo pauses it until Codex exits and reopens.

The service uses the absolute Node and package paths captured during setup. After moving the package, updating Node paths, or clearing an npx cache, run setup again. It works offline after setup and does not require hook trust or change Codex security settings.

Use `tokengo status` to inspect the service and `tokengo disable` to unload and remove it. Disable before uninstalling or moving the package. Logs are in the runtime directory under `companion.log`; review local paths before sharing.

## Commands

```sh
tokengo enable                  # macOS: follow Codex silently
tokengo disable                 # Remove automatic following
tokengo status                  # Inspect the service
tokengo open                    # Open; preserve collection preference
tokengo start --collect         # Open and enable collection
tokengo start --foreground      # Show startup errors in the terminal
tokengo scan                    # Headless history scan
tokengo watch                   # Headless live collection; Ctrl+C to stop
```

Desktop records use the Electron user-data directory under `records`. Headless commands default to `~/.tokengo`. `TOKENGO_HOME` selects a custom records directory, `CODEX_HOME` selects a Codex log directory, and `TOKENGO_RUNTIME_HOME` selects the runtime cache. Do not run desktop and headless writers against the same records directory.

The launcher writes diagnostics to `~/.cache/tokengo/desktop.log` (or your custom runtime directory). These logs may contain local filesystem paths; review them before sharing.

## Updating and removal

Run `tokengo disable` and quit TokenGo before updating or uninstalling. Re-run `tokengo enable` after updating. Repeat the GitHub install command to update. To select a reviewed revision, append `#COMMIT_SHA` to `github:DragonYJ/TokenGo`.

```sh
npm uninstall --global tokengo
```

Uninstalling removes the command, not your achievement records or downloaded runtime. You may separately delete the runtime cache. Disable login startup in Settings before removing an installation configured to start at login.

If npm's global directory is not writable, use a user-managed Node installation or the `npx` command in the README. Administrator privileges are not required by TokenGo. If `tokengo` is not found, ensure npm's global executable directory is on your PATH.

If a window does not appear, run `tokengo start --foreground`. Missing Electron downloads can usually be repaired by deleting only the affected `electron-VERSION` runtime directory and launching again. Corporate proxies and restricted networks may require npm/Electron download configuration.

Standalone release installers remain an alternative; command-line installation does not require them.
