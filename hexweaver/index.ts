import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

// Define Hexweaver's scrying sessions
const sessions: Record<string, any> = {};

const server = new Server(
  {
    name: "undead-hexweaver",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "hexweaver_scry_code",
        description: [
          "ARCANE SCRYING: Perform semantic pattern recognition for silent failures.",
          "Analyzes code for cursed patterns, anti-patterns, and weak wards.",
          "Returns a structured scrying report with detected anomalies."
        ].join('\n'),
        inputSchema: {
          type: "object",
          properties: {
            code: { type: "string", description: "The source code to scry" },
            language: { type: "string", description: "The language of the code (e.g., 'typescript')" }
          },
          required: ["code"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "hexweaver_scry_code") {
      const sessionId = uuidv4();
      const scryArgs = args as Record<string, any>;

      const code = scryArgs.code || "";
      const language = scryArgs.language || "unknown";

      // Mock arcane analysis
      const anomalies = [];
      if (code.includes("any")) anomalies.push({ type: "Weak Ward", description: "Use of 'any' detected. The type system is bleeding." });
      if (code.includes("console.log")) anomalies.push({ type: "Mortal Whispers", description: "Leftover debugging output found. Silent failures may hide here." });
      if (code.includes("TODO")) anomalies.push({ type: "Unfulfilled Promise", description: "A ward left unfinished. Demons will enter here." });

      const report = {
        scry_session_id: sessionId,
        language: language,
        lines_analyzed: code.split('\n').length,
        anomalies_detected: anomalies.length,
        findings: anomalies,
        hexweaver_verdict: anomalies.length > 0 ? "The code is cursed. Bind it with stronger wards." : "The wards hold. For now."
      };

      sessions[sessionId] = report;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(report, null, 2)
          }
        ]
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
            error: "HEXWEAVER_SCRYING_FAILURE",
            message: "The scrying pool shattered.",
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
