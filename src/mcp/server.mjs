import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from '@modelcontextprotocol/ext-apps/server';
import { z } from 'zod';
import { readFileSync } from 'node:fs';
import { requestBridge, actions } from './bridge.mjs';

const icon =
  'data:image/svg+xml;base64,' +
  readFileSync(new URL('./icon.svg', import.meta.url)).toString('base64');
const server = new McpServer({
  name: 'tokengo',
  version: '0.4.0',
  icons: [{ src: icon, mimeType: 'image/svg+xml', sizes: ['any'] }],
});
const uri = 'ui://tokengo/cabinet';
const result = async (action, payload) => {
  try {
    return { content: [], _meta: { value: await requestBridge(action, payload) } };
  } catch (error) {
    return { content: [], isError: true, _meta: { error: error.message } };
  }
};
registerAppTool(
  server,
  'tokengo.cabinet',
  {
    title: 'TokenGo',
    description: 'Open your local Codex achievement cabinet.',
    inputSchema: {},
    icons: [{ src: icon, mimeType: 'image/svg+xml', sizes: ['any'] }],
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    _meta: {
      ui: { resourceUri: uri, visibility: ['app'] },
      'openai/ui': { entrypoints: [{ type: 'global' }] },
    },
  },
  () => result('snapshot'),
);
registerAppTool(
  server,
  'tokengo.action',
  {
    description: 'Handle an explicit interaction with the local achievement cabinet.',
    inputSchema: { action: z.enum(actions), payload: z.unknown().optional() },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    _meta: { ui: { visibility: ['app'] } },
  },
  ({ action, payload }) => result(action, payload),
);
registerAppResource(server, 'cabinet', uri, {}, async () => ({
  contents: [
    {
      uri,
      mimeType: RESOURCE_MIME_TYPE,
      text: readFileSync(new URL('./cabinet.html', import.meta.url), 'utf8'),
      _meta: {
        ui: { csp: { connectDomains: [], resourceDomains: [] } },
        'openai/ui': { preferredDisplayMode: 'fullscreen', availableDisplayModes: ['fullscreen'] },
      },
    },
  ],
}));
await server.connect(new StdioServerTransport());
