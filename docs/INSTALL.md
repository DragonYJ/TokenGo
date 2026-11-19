# Install TokenGo from GitHub

Requires Node.js 22.12 or newer, npm, Git, and a graphical desktop session. macOS, Windows and Linux use the same commands. On Linux, Electron also needs the system libraries required by Chromium and a working display server; a headless SSH session can use `scan` or `watch` instead.

```sh
npm install --global github:DragonYJ/TokenGo
tokengo connect
```

On macOS, `enable` installs a local companion that follows Codex automatically. On Windows and Linux, automatic following is not implemented yet; use `tokengo start --collect` for manual collection. The `connect` command registers TokenGo as a local Codex marketplace plugin through the official CLI, then starts collection. It does not modify the Codex application binary. Set `TOKENGO_CODEX_BIN` if the CLI cannot be found. The plugin uses bundled Node code and a local stdio MCP connection; it has no remote MCP endpoint. A local process provides native cards while Codex is running, even between agent turns.

## What installation does

1. npm installs TokenGo's public source from GitHub. There are no TokenGo install hooks, no production dependencies, and no collection during installation.
2. The first `start` or `open` downloads Electron, pinned to the version in `package.json`, using npm and Electron's official release archives. Downloads are verified against Electron's published SHA-256 checksums; cached archives are reused. The launcher uses curl when available, with a bounded download timeout, and native extraction on macOS. Its runtime is stored in `~/.cache/tokengo/electron-VERSION`. A development checkout reuses its matching Electron dependency.
3. TokenGo starts as a separate process. `--collect` explicitly enables local collection; `open` preserves the existing preference. Closing the cabinet leaves the tray process running. Quit stops it. On macOS, `enable` or `connect` installs the user-level follow service, which also survives logout/restart. Manual `start` does not install that service.

Downloads contact GitHub and the npm registry, which can see ordinary request metadata such as your IP address. No Codex records are uploaded. Once installed, collection, notifications, statistics and card generation work offline. No account or paid backend is required.

## Sidebar plugin

Open TokenGo from the Plugins Directory or the sidebar menu, then pin its entry. Pinning and ordering are controlled by Codex. Restart the client if its entry list is stale. The installed plugin ID is `tokengo@tokengo`.

### If TokenGo is missing from the plugin list

CLI installation and activation do not establish that the desktop client has loaded the entry. The MCP protocol and embedded UI have passed integration tests; visibility in the actual desktop sidebar remains unverified.

Fully quit the desktop client, reopen it, and look for **TokenGo** in the Plugins Directory's marketplace/source selector. It is a local marketplace, not a listing in the universal public directory.

The desktop client documents discovery through a repository's `.agents/plugins/marketplace.json` or the personal catalog at `~/.agents/plugins/marketplace.json`. If a CLI-registered source is absent, add TokenGo to the personal catalog, preserving any existing entries. Its local source path must begin with `./`, resolve relative to your home directory, and point to a stable folder containing the plugin's `plugin.json`, `mcp.json`, `server.mjs` and `cabinet.html`. Use the catalog's existing name if it already exists; plugin IDs use `plugin-name@marketplace-name`. Do not overwrite another personal catalog with TokenGo's repository catalog.

The current `connect` command registers a CLI marketplace; it does not create or merge this personal catalog. Restart again after changing a catalog. See the [official local marketplace instructions](https://developers.openai.com/plugins/build/plugins#build-your-own-curated-plugin-list). If the entry is still missing, report the client version, operating system and an image of the Plugins Directory; do not include your logs or conversations.

The plugin and notification helper must both be version 0.4.0 or newer. The helper is the only record writer. The plugin accesses it using a local authenticated socket; it never reads the Codex log directory directly. All UI assets and dependencies are bundled.

A successful first UI connection enables native notification deep links into Codex. Until then, notification clicks use the companion cabinet. To remove the sidebar plugin, run `tokengo disconnect` while the collector is running. This resets notification routing to the local cabinet, removes the plugin through the Codex CLI, and preserves records. Then run `tokengo disable` if you also want to stop collection.

For Git-only marketplace setup after preparing the local collector:

```sh
codex plugin marketplace add DragonYJ/TokenGo
codex plugin add tokengo@tokengo
```

Local marketplace installation does not require publication to the universal plugin directory. `connect` registers the installed npm package as the local marketplace, so keep that package installed. Clearing an npx cache or moving a checkout can break its stored paths; rerun setup from a stable installation.

## Following Codex on macOS

`tokengo enable` explicitly enables local collection and installs `~/Library/LaunchAgents/io.tokengo.codex-companion.plist`. The login service runs a small Node observer that checks executable names for the current user every five seconds. It does not inspect command arguments, conversations, or other applications' data. Supported hosts include the Codex desktop executable, the Codex host inside ChatGPT, and the native `codex` CLI. Helper/rendering processes alone do not activate it.

When Codex appears, the observer starts the collector and notification renderer without a main window or Dock icon. When Codex exits, the companion exits. Closing a Codex window may leave Codex running; quit the client to end the process. The observer itself remains available for the next launch. Choosing Quit in TokenGo pauses it until Codex exits and reopens.

The service uses the absolute Node and package paths captured during setup. After moving the package, updating Node paths, or clearing an npx cache, run setup again. It works offline after setup and does not require hook trust or change Codex security settings.

Use `tokengo status` to inspect the service and `tokengo disable` to unload and remove it. Disable before uninstalling or moving the package. Logs are in the runtime directory under `companion.log`; review local paths before sharing.

## Commands

```sh
tokengo connect                 # Install sidebar plugin and start local collection
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
