import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

// Define the Dragon's operational state
const missions: Record<string, any> = {};

const server = new Server(
  {
    name: "undead-dragon",
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
        name: "dragon_issue_mission_signature",
        description: [
          "ORCHESTRATION ENGINE: Issue a formal mission signature.",
          "Defines success criteria, allocates parallel workstreams, and bounds the scope.",
          "Returns a structured JSON response with a mission ID and orchestration plan."
        ].join('\n'),
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "The name of the mission (e.g. 'Refactor Auth Module')" },
            objectives: {
              type: "array",
              items: { type: "string" },
              description: "Specific verifiable objectives for this mission"
            },
            complexity_estimate: {
              type: "string",
              enum: ["low", "medium", "high", "critical"],
              description: "The initial estimation of the mission's scope."
            }
          },
          required: ["name"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "dragon_issue_mission_signature") {
      const missionId = uuidv4();
      const missionArgs = args as Record<string, any>;

      const missionName = missionArgs.name || "UNNAMED_MISSION";
      const objectives = missionArgs.objectives || ["Survive the ordeal"];
      const complexity = missionArgs.complexity_estimate || "medium";

      const allocated_workstreams = [
        { role: "Architect", task: "Design structural skeleton for " + missionName },
        { role: "Berserker", task: "Execute core logic and destroy bugs" },
        { role: "Hound", task: "Verify assertions and hunt regressions" }
      ];

      const signature = {
        mission_id: missionId,
        status: "ACTIVE",
        name: missionName,
        objectives: objectives,
        complexity: complexity,
        workstreams: allocated_workstreams,
        success_criteria: "All objectives met, zero critical regressions, architecturally sound.",
        dragon_verdict: `Mission [${missionId}] signed. The Legion is unleashed.`
      };

      missions[missionId] = signature;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(signature, null, 2)
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
            error: "DRAGON_ORCHESTRATION_FAILURE",
            message: "The Dragon could not issue the signature.",
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
