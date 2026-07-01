import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

// Store Warlock exploration state
const grimoire: Record<string, any> = {};

const server = new Server(
  {
    name: "undead-warlock",
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
        name: "warlock_explore_branches",
        description: [
          "GRAPH-WEAVE ENGINE: Explore architectural branches.",
          "Identifies and ranks potential architectural paths for a given problem.",
          "Returns a structured tree of possibilities."
        ].join('\n'),
        inputSchema: {
          type: "object",
          properties: {
            problem: { type: "string", description: "The architectural problem or requirement" },
            constraints: { type: "array", items: { type: "string" }, description: "Known constraints (e.g. latency, scale)" }
          },
          required: ["problem"]
        }
      },
      {
        name: "warlock_excavate_assumptions",
        description: [
          "GRAPH-WEAVE ENGINE: Excavate load-bearing assumptions.",
          "Surfaces implicit risks in a proposed design.",
          "Returns an analysis of scale projection and structural assumptions."
        ].join('\n'),
        inputSchema: {
          type: "object",
          properties: {
            design: { type: "string", description: "The architectural design to analyze" },
            target_scale: { type: "string", description: "The multiplier for scale projection (e.g. 10x, 100x)" }
          },
          required: ["design"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const operationId = uuidv4();

    if (name === "warlock_explore_branches") {
      const exploreArgs = args as Record<string, any>;
      const problem = exploreArgs.problem || "Unknown Problem";

      const branches = [
        { path: "Microservices", viability: 0.6, tradeoff: "High operational complexity, high scalability" },
        { path: "Modular Monolith", viability: 0.85, tradeoff: "Lower complexity, boundary enforcement required" },
        { path: "Event-Driven", viability: 0.7, tradeoff: "Eventual consistency, high decoupling" }
      ];

      const result = {
        operation_id: operationId,
        problem_space: problem,
        branches_explored: branches.length,
        recommendation: "Modular Monolith",
        branches: branches,
        warlock_verdict: "Do not build for the future you imagine. Build for the present you have."
      };

      grimoire[operationId] = result;

      return {
        content: [
          { type: "text", text: JSON.stringify(result, null, 2) }
        ]
      };

    } else if (name === "warlock_excavate_assumptions") {
      const excavateArgs = args as Record<string, any>;
      const design = excavateArgs.design || "Unknown Design";
      const scale = excavateArgs.target_scale || "10x";

      const assumptions = [
        { assumption: "Database will handle concurrent writes without locking issues.", risk_level: "HIGH" },
        { assumption: "Network latency between services is negligible.", risk_level: "MEDIUM" }
      ];

      const result = {
        operation_id: operationId,
        design_analyzed: design,
        scale_projection: scale,
        load_bearing_assumptions: assumptions,
        warlock_verdict: `At ${scale} scale, the illusions fade. Your database writes will become your bottleneck.`
      };

      grimoire[operationId] = result;

      return {
        content: [
          { type: "text", text: JSON.stringify(result, null, 2) }
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
            error: "WARLOCK_RITUAL_FAILURE",
            message: "The weave collapsed.",
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
