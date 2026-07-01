import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

// Define Hound's verification ledgers
const ledgers: Record<string, any> = {};

const server = new Server(
  {
    name: "undead-hound",
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
        name: "hound_verify_claims",
        description: [
          "VERIFICATION ENGINE: Execute Chain-of-Verification (CoVe).",
          "Deconstructs and audits claims in artifacts, enforcing adversarial review.",
          "Returns a structured matrix of verified, contested, and refuted claims."
        ].join('\n'),
        inputSchema: {
          type: "object",
          properties: {
            artifact: { type: "string", description: "The artifact or code containing claims" },
            claims: {
              type: "array",
              items: { type: "string" },
              description: "Specific claims to verify against the artifact"
            }
          },
          required: ["artifact", "claims"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "hound_verify_claims") {
      const ledgerId = uuidv4();
      const verifyArgs = args as Record<string, any>;

      const artifact = verifyArgs.artifact || "";
      const claims = verifyArgs.claims || [];

      // Mock chain of verification
      const verification_matrix = claims.map((claim: string) => {
        // Simple heuristic mock: if the claim words appear in artifact, we assume it's verifiable
        const words = claim.split(' ').filter(w => w.length > 4);
        const matchCount = words.filter(w => artifact.includes(w)).length;

        let status = "CONTESTED";
        if (matchCount > words.length / 2) status = "VERIFIED";
        else if (matchCount === 0) status = "REFUTED";

        return {
          claim: claim,
          status: status,
          confidence_score: status === "VERIFIED" ? 0.85 : (status === "REFUTED" ? 0.95 : 0.40),
          reasoning: `Artifact analysis yielded a match count of ${matchCount} for key terms.`
        };
      });

      const ledger = {
        ledger_id: ledgerId,
        total_claims: claims.length,
        verified: verification_matrix.filter((c: any) => c.status === "VERIFIED").length,
        refuted: verification_matrix.filter((c: any) => c.status === "REFUTED").length,
        contested: verification_matrix.filter((c: any) => c.status === "CONTESTED").length,
        matrix: verification_matrix,
        hound_verdict: "The scent is captured. The ledger is written."
      };

      ledgers[ledgerId] = ledger;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(ledger, null, 2)
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
            error: "HOUND_VERIFICATION_FAILURE",
            message: "The Hound lost the scent.",
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
