# Native sidebar integration research

Investigated on 2026-11-19. Implementation status: the bundled local plugin is implemented. Official CLI installation and enabled status, live collector connectivity, MCP metadata, embedded UI, language, pins, and native deep-link routing have been checked. The live Codex sidebar itself could not be visually inspected because computer-use access to the Codex application is blocked; a client refresh or restart may still be needed.

## Finding

OpenAI MCP Extensions provides a **global entrypoint** that opens an MCP App from the primary sidebar navigation. TokenGo does not need to patch the host application or overlay a floating button on its window.

The prior assumption that only pinned chats or conversation panels were available was incorrect. The plugin packaging manifest alone is not the complete extension API: the entrypoint belongs in the MCP tool metadata.

Official references:

- [Sidebar apps](https://developers.openai.com/plugins/build/extensions#sidebar-apps)
- [Global entrypoint specification, icons, titles and deep links](https://github.com/openai/mcp-extensions/blob/main/docs/spec.md#global-entrypoint)
- [Plugin packaging and local marketplaces](https://developers.openai.com/plugins/build/plugins)
- [Local stdio MCP servers and desktop-only distribution](https://developers.openai.com/plugins/deploy/desktop-only)

Read-only inspection of the installed desktop build, version `26.1111.21308`, also found code that converts MCP global entries into navigation destinations with icons, selection handlers and pinning state. This corroborates the documented path on this installed build; it does not establish that a TokenGo installation already works or guarantee placement at a particular pixel position. No installed application files or host preferences were changed during this investigation. Proprietary application sources are not included in this repository.

## Entry registration

The registration follows this descriptor (the implemented server also sets app-only visibility):

```json
{
  "name": "tokengo.cabinet",
  "title": "TokenGo",
  "description": "Open your local achievement cabinet.",
  "inputSchema": { "type": "object", "properties": {}, "additionalProperties": false },
  "annotations": { "readOnlyHint": true, "destructiveHint": false, "openWorldHint": false },
  "_meta": {
    "ui": { "resourceUri": "ui://tokengo/cabinet" },
    "openai/ui": { "entrypoints": [{ "type": "global" }] }
  }
}
```

Register the matching HTML UI resource through the MCP Apps protocol. The entry tool must accept an empty argument object. The host resolves the title from the tool title and the icon from the tool's MCP `icons` field, then server/app branding, then its generic fallback. Bundle TokenGo's icon and verify a supported local/data icon representation during implementation.

The host controls discovery, pinning, ordering and available space. The plugin should supply a native entry; it should not overwrite the user's sidebar preferences or promise forced placement at the exact screenshot coordinates.

## Local architecture

1. Package a local stdio MCP server with TokenGo and declare it in `mcp.json`. Use `node` and `${PLUGIN_ROOT}` for the executable arguments, with dependencies shipped or prepared during explicit setup.
2. Serve the existing cabinet and statistics interface as a bundled MCP App resource. Replace the Electron-only IPC adapter with an MCP Apps bridge; maintain the existing adapter for notifications during migration.
3. Add narrowly scoped local operations for snapshots, pinning and settings. Preserve source labels, localization and sharing consent. Review which tool results the host may expose to a model; do not place raw logs or private paths in responses. Validate privacy behavior before advertising strict offline guarantees for the embedded UI.
4. Keep a single owner of the achievement store. The MCP server must not independently create another collector writing to the same files while the existing companion runs. Use a local authenticated channel to the collector, or consolidate collection and reads into one process.
5. Keep native desktop notifications in the background helper initially. A global sidebar entry is not a guarantee of OS notification or continuous background execution. The existing macOS follow service remains responsible for collection while Codex is open until MCP lifecycle behavior is measured.
6. Redirect notification clicks to the plugin's global entry using the documented deep-link scheme. Preserve a fallback if the plugin is not installed.

Example deep link after naming the plugin and local marketplace `tokengo`:

```text
codex://plugins/tokengo@tokengo/app/tokengo.cabinet?path=%2Fachievements%2Fsecrets.still-working
```

This route is implemented by the installed local plugin. The UI must implement the route and handle the `openai/deepLink` host context on initialization and subsequent navigation.

## Distribution

A GitHub repository can carry the plugin package and a local marketplace catalog. The official CLI supports adding a Git-backed marketplace; the user then installs/enables the plugin through the desktop Plugins Directory. Marketplace registration is not equivalent to completing plugin installation. Verify actual installation and activation on a clean profile.

Local stdio operation does not require a paid hosted server. Installation and updates still require network access. Publication in the universal public directory is a separate process: the current desktop-only documentation limits local MCP submissions to approved partners. This restriction should not be confused with distributing source and a local marketplace through GitHub.

## Acceptance checks and remaining host verification

- Install from a clean local marketplace and confirm the actual TokenGo icon appears in global navigation; check the user's pinning flow.
- Click the icon and open the real local cabinet, not the fictional website gallery.
- Verify the cabinet, statistics, eight languages, pins and progress inside the host resource sandbox.
- Verify notification clicks reach the correct achievement through a deep link, including when the cabinet has not yet been opened.
- Check Codex cold start, reopening, multiple chats and shutdown without duplicate writers or unintended foreground windows.
- Inspect outgoing requests and model-visible tool results. Test local collection and cabinet interaction with network access disabled.
- Test disable/uninstall and preserve achievement records.

No client binary patch, remote-debugging injection, account feature-flag modification or fake sidebar overlay is needed for the documented approach.
