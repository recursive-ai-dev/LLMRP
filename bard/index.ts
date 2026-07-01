import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

const server = new Server(
  {
    name: "undead-bard",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Store Bard's chronicles
const sessions: Record<string, any> = {};

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "bard_open_chronicle",
        description: "Open a new chronicle session for a codebase or module.",
        inputSchema: {
          type: "object",
          properties: {
            codebase_description: { type: "string" },
            chronicle_type: {
              type: "string",
              enum: ["documentation", "semantic_hunt", "release"]
            },
          },
          required: ["codebase_description", "chronicle_type"],
        },
      },
      {
        name: "bard_document_artifact",
        description: "Generate documentation for a code artifact in its language's native format.",
        inputSchema: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            code: { type: "string" },
            filename: { type: "string" },
            audience: {
              type: "string",
              enum: ["developer", "architect", "stakeholder"]
            },
            adversarial_mode: { type: "boolean" },
          },
          required: ["session_id", "code", "filename", "audience"],
        },
      },
      {
        name: "bard_semantic_hunt",
        description: "Run a semantic hunt for code that matches a natural language intent description.",
        inputSchema: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            query: { type: "string" },
            artifacts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  filename: { type: "string" },
                  code: { type: "string" },
                },
                required: ["filename", "code"],
              },
            },
            threshold: { type: "number" },
          },
          required: ["session_id", "query", "artifacts"],
        },
      },
      {
        name: "bard_release_chronicle",
        description: "Generate a release chronicle from commits, PRs, or a change description.",
        inputSchema: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            changes: { type: "string" },
            version: { type: "string" },
            audience: {
              type: "string",
              enum: ["developer", "architect", "stakeholder", "public", "security"]
            },
          },
          required: ["session_id", "changes", "version", "audience"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const argsObj = args as Record<string, any>;

    if (name === "bard_open_chronicle") {
      const id = uuidv4();
      sessions[id] = { ...argsObj, status: "OPEN", entries: [] };
      return {
        content: [{ type: "text", text: JSON.stringify({ session_id: id, status: "Chronicle Opened" }, null, 2) }]
      };

    } else if (name === "bard_document_artifact") {
      const { session_id, code, filename, audience, adversarial_mode } = argsObj;
      if (!sessions[session_id]) throw new Error("Chronicle session not found.");

      let doc = `// Documentation for ${filename} (Audience: ${audience})\n`;
      doc += `// Describes logic: ${code.substring(0, 50)}...\n`;
      if (adversarial_mode) {
        doc += `// [ADVERSARIAL NOTE]: This implementation assumes happy path and ignores boundary conditions.\n`;
      }

      const record = { filename, documentation: doc };
      sessions[session_id].entries.push(record);

      return {
        content: [{ type: "text", text: JSON.stringify(record, null, 2) }]
      };

    } else if (name === "bard_semantic_hunt") {
      const { session_id, query, artifacts, threshold } = argsObj;
      if (!sessions[session_id]) throw new Error("Chronicle session not found.");

      const matchThreshold = threshold || 0.5;
      const matches = artifacts.map((a: any) => ({
        filename: a.filename,
        match_score: Math.random() > 0.5 ? 0.8 : 0.3, // Mock semantic scoring
        reasoning: `Contextually aligns with intent '${query.substring(0, 20)}...'`
      })).filter((m: any) => m.match_score >= matchThreshold);

      const result = { query, total_analyzed: artifacts.length, matches };
      sessions[session_id].entries.push(result);

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
      };

    } else if (name === "bard_release_chronicle") {
      const { session_id, changes, version, audience } = argsObj;
      if (!sessions[session_id]) throw new Error("Chronicle session not found.");

      const chronicle = `
# RELEASE CHRONICLE: Version ${version}
**Audience:** ${audience.toUpperCase()}
**Changes Addressed:**
- ${changes.split('\n').join('\n- ')}

*The Bard notes: The code changed, but the debt remains.*
      `.trim();

      sessions[session_id].entries.push({ version, chronicle });

      return {
        content: [{ type: "text", text: JSON.stringify({ version, chronicle }, null, 2) }]
      };

    } else {
      throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: "BARD_CHRONICLE_FAILURE",
            message: "The ink spilled.",
            detail: msg
          }, null, 2)
        }
      ],
      isError: true
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
