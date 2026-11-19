# Install TokenGo from GitHub

Requires Node.js 22.12 or newer, npm, Git, and a graphical desktop session. macOS, Windows and Linux use the same commands. On Linux, Electron also needs the system libraries required by Chromium and a working display server; a headless SSH session can use `scan` or `watch` instead.

```sh
npm install --global github:DragonYJ/TokenGo
tokengo start --collect
```

The package is a CLI-launched desktop companion. It does not register as a Codex marketplace plugin, modify Codex configuration, or inject UI into Codex. Codex can install it by following these commands. A local process provides native cards even when no agent turn is running.

## What installation does

1. npm installs TokenGo's public source from GitHub. There are no TokenGo install hooks, no production dependencies, and no collection during installation.
2. The first `start` or `open` downloads Electron, pinned to the version in `package.json`, using npm and Electron's installer. Its runtime is stored in `~/.cache/tokengo/electron-VERSION`. A development checkout reuses its matching Electron dependency.
3. TokenGo starts as a separate process. `--collect` explicitly enables local collection; `open` preserves the existing preference. Closing the cabinet leaves the tray process running. Quit stops it. Automatic login startup is currently supported by the standalone packaged app. With the GitHub CLI installation, run `tokengo open` after restarting your computer.

Downloads contact GitHub and the npm registry, which can see ordinary request metadata such as your IP address. No Codex records are uploaded. Once installed, collection, notifications, statistics and card generation work offline. No account or paid backend is required.

## Commands

```sh
tokengo open                    # Open; preserve collection preference
tokengo start --collect         # Open and enable collection
tokengo start --foreground      # Show startup errors in the terminal
tokengo scan                    # Headless history scan
tokengo watch                   # Headless live collection; Ctrl+C to stop
```

Desktop records use the Electron user-data directory under `records`. Headless commands default to `~/.tokengo`. `TOKENGO_HOME` selects a custom records directory, `CODEX_HOME` selects a Codex log directory, and `TOKENGO_RUNTIME_HOME` selects the runtime cache. Do not run desktop and headless writers against the same records directory.

The launcher writes diagnostics to `~/.cache/tokengo/desktop.log` (or your custom runtime directory). These logs may contain local filesystem paths; review them before sharing.

## Updating and removal

Quit TokenGo before updating or uninstalling. Repeat the GitHub install command to update. To select a reviewed revision, append `#COMMIT_SHA` to `github:DragonYJ/TokenGo`.

```sh
npm uninstall --global tokengo
```

Uninstalling removes the command, not your achievement records or downloaded runtime. You may separately delete the runtime cache. Disable login startup in Settings before removing an installation configured to start at login.

If npm's global directory is not writable, use a user-managed Node installation or the `npx` command in the README. Administrator privileges are not required by TokenGo. If `tokengo` is not found, ensure npm's global executable directory is on your PATH.

If a window does not appear, run `tokengo start --foreground`. Missing Electron downloads can usually be repaired by deleting only the affected `electron-VERSION` runtime directory and launching again. Corporate proxies and restricted networks may require npm/Electron download configuration.

Standalone release installers remain an alternative; command-line installation does not require them.
