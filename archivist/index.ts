import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

// Define Archivist's tome storage
const tomes: Record<string, any> = {};

const server = new Server(
  {
    name: "undead-archivist",
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
        name: "library_autopsy",
        description: [
          "THE BLACK LIBRARY: Perform Kingdom Autopsy.",
          "Analyzes complex system failures by extracting institutional memory.",
          "Returns a structured autopsy report."
        ].join('\n'),
        inputSchema: {
          type: "object",
          properties: {
            tome_id: { type: "string", description: "The ID of the tome or incident to autopsy" },
            symptoms: { type: "array", items: { type: "string" }, description: "Observed symptoms of the failure" }
          },
          required: ["tome_id"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "library_autopsy") {
      const autopsyId = uuidv4();
      const autopsyArgs = args as Record<string, any>;

      const tomeId = autopsyArgs.tome_id || "UNKNOWN_TOME";
      const symptoms = autopsyArgs.symptoms || [];

      // Mock autopsy logic
      const historical_patterns = symptoms.length > 0 ?
        symptoms.map((s: string) => `Symptom '${s}' matches incident from the Third Era.`) :
        ["No clear symptoms provided. Analyzing residual aether."];

      const report = {
        autopsy_id: autopsyId,
        tome_analyzed: tomeId,
        historical_patterns_matched: historical_patterns,
        root_cause_hypothesis: "Compounding technical debt intersecting with a misunderstood requirement.",
        institutional_memory_loss: "High. The original authors are no longer present.",
        archivist_verdict: `Autopsy on [${tomeId}] complete. The system died exactly as it was designed to.`
      };

      tomes[autopsyId] = report;

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
            error: "ARCHIVIST_AUTOPSY_FAILURE",
            message: "The tome could not be opened.",
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
