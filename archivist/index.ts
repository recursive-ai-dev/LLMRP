import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
const server = new Server({ name: "undead-archivist", version: "1.0.0" }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{ name: "library_autopsy", description: "Perform autopsy", inputSchema: { type: "object", properties: { tome_id: { type: "string" } } } }]
}));
server.setRequestHandler(CallToolRequestSchema, async () => ({ content: [{ type: "text", text: "Autopsy complete." }] }));
async function main() { await server.connect(new StdioServerTransport()); }
main().catch(console.error);
