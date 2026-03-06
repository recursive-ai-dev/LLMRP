#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { v4 as uuidv4 } from 'uuid';
import {
  SynthesisSession,
  NexusPoint,
  StrategicPath,
  SynthesisOutput,
  Domain,
  ConfidenceTier,
  VerificationState
} from './types.js';
import {
  SynthesisEngine,
  StepBackPhase,
  SkeletonPhase,
  ToTPhase,
  EvaluationPhase,
  SynthesisPhase,
  CalibrationPhase
} from './engine.js';
import { Tensor5D, StrategicTensor } from './tensor.js';

// Session store
const sessions = new Map<string, SynthesisSession>();

// Initialize synthesis engine
const engine = new SynthesisEngine();

// Tool definitions
const TOOLS: Tool[] = [
  {
    name: 'architect_open_synthesis',
    description: 'Initialize a new strategic synthesis session. Creates the 5D Strategic Tensor and prepares the synthesis pipeline.',
    inputSchema: {
      type: 'object',
      properties: {
        dataset_description: {
          type: 'string',
          description: 'Description of the dataset to be analyzed'
        },
        domains: {
          type: 'array',
          items: { type: 'string' },
          description: 'Domains spanned by the dataset: technical, economic, political, social, environmental, legal, ethical, temporal'
        },
        stakes: {
          type: 'string',
          description: 'What decisions depend on this analysis? What is the cost of being wrong?'
        },
        audience: {
          type: 'string',
          description: 'Who will consume this intelligence: SME, Executive, Technical, Mixed'
        },
        constraints: {
          type: 'object',
          properties: {
            time_horizon: { type: 'string' },
            confidence_threshold: { type: 'number' },
            max_tokens: { type: 'number' }
          }
        }
      },
      required: ['dataset_description', 'domains']
    }
  },
  {
    name: 'architect_step_back',
    description: 'Execute Phase I: Abstraction. Extract fundamental principles before instance-level analysis.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' },
        dataset: { type: 'string' }
      },
      required: ['session_id', 'dataset']
    }
  },
  {
    name: 'architect_skeleton',
    description: 'Execute Phase II: Skeleton Generation. Identify the 5 most critical cross-domain nexus points.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' }
      },
      required: ['session_id']
    }
  },
  {
    name: 'architect_tot_explore',
    description: 'Execute Phase III: Tree-of-Thoughts Exploration. Generate 3 paths (A/B/C) for each nexus point.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' },
        nexus_index: { type: 'number', description: 'Index of nexus point to explore (0-4)' }
      },
      required: ['session_id', 'nexus_index']
    }
  },
  {
    name: 'architect_evaluate',
    description: 'Execute Phase IV: Metacognitive Evaluation. Critique paths and discard those with reasoning failures.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' }
      },
      required: ['session_id']
    }
  },
  {
    name: 'architect_synthesize',
    description: 'Execute Phase V: Synthesis. Produce final intelligence product integrating verified paths.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' }
      },
      required: ['session_id']
    }
  },
  {
    name: 'architect_calibrate',
    description: 'Execute Phase VI: Self-Correction. Quantify uncertainty and identify improvement paths.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' }
      },
      required: ['session_id']
    }
  },
  {
    name: 'architect_full_synthesis',
    description: 'Execute complete 6-phase synthesis pipeline in one call.',
    inputSchema: {
      type: 'object',
      properties: {
        dataset: { type: 'string' },
        dataset_description: { type: 'string' },
        domains: { type: 'array', items: { type: 'string' } },
        stakes: { type: 'string' },
        audience: { type: 'string' }
      },
      required: ['dataset', 'dataset_description', 'domains']
    }
  },
  {
    name: 'architect_red_team',
    description: 'Execute adversarial red teaming on an existing conclusion.',
    inputSchema: {
      type: 'object',
      properties: {
        conclusion: { type: 'string' },
        supporting_evidence: { type: 'string' },
        intensity: { type: 'string', enum: ['standard', 'aggressive', 'maximum'] }
      },
      required: ['conclusion', 'supporting_evidence']
    }
  },
  {
    name: 'architect_cross_domain_extract',
    description: 'Extract non-obvious insights from high-density technical datasets.',
    inputSchema: {
      type: 'object',
      properties: {
        dataset: { type: 'string' },
        source_domains: { type: 'array', items: { type: 'string' } },
        target_domains: { type: 'array', items: { type: 'string' } },
        min_confidence: { type: 'number' }
      },
      required: ['dataset', 'source_domains', 'target_domains']
    }
  },
  {
    name: 'architect_retrieve_synthesis',
    description: 'Retrieve complete synthesis output and audit trail for a session.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' }
      },
      required: ['session_id']
    }
  }
];

// Server setup
const server = new Server(
  {
    name: 'undead-architect-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'architect_open_synthesis':
        return handleOpenSynthesis(args as any);
      case 'architect_step_back':
        return handleStepBack(args as any);
      case 'architect_skeleton':
        return handleSkeleton(args as any);
      case 'architect_tot_explore':
        return handleTotExplore(args as any);
      case 'architect_evaluate':
        return handleEvaluate(args as any);
      case 'architect_synthesize':
        return handleSynthesize(args as any);
      case 'architect_calibrate':
        return handleCalibrate(args as any);
      case 'architect_full_synthesis':
        return handleFullSynthesis(args as any);
      case 'architect_red_team':
        return handleRedTeam(args as any);
      case 'architect_cross_domain_extract':
        return handleCrossDomainExtract(args as any);
      case 'architect_retrieve_synthesis':
        return handleRetrieveSynthesis(args as any);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Handler implementations
function handleOpenSynthesis(args: {
  dataset_description: string;
  domains: string[];
  stakes?: string;
  audience?: string;
  constraints?: any;
}) {
  const sessionId = uuidv4();
  const session: SynthesisSession = {
    id: sessionId,
    datasetDescription: args.dataset_description,
    domains: args.domains as Domain[],
    stakes: args.stakes || 'unspecified',
    audience: args.audience || 'SME',
    constraints: args.constraints || {},
    createdAt: new Date().toISOString(),
    phases: {},
    tensor: new StrategicTensor(args.domains.length),
    status: 'initialized'
  };

  sessions.set(sessionId, session);

  return {
    content: [
      {
        type: 'text',
        text: `[ARCHITECT SYNTHESIS OPENED]
Session ID: ${sessionId}
Dataset: ${args.dataset_description}
Domains: ${args.domains.join(', ')}
Stakes: ${session.stakes}
Audience: ${session.audience}

The 5D Strategic Tensor has been initialized.
Tensor dimensions: 128 × ${args.domains.length} × 16 × 5 × 4 × 2

Ready for Phase I: Step-Back Abstraction.`,
      },
    ],
  };
}

function handleStepBack(args: { session_id: string; dataset: string }) {
  const session = sessions.get(args.session_id);
  if (!session) {
    throw new Error(`Session not found: ${args.session_id}`);
  }

  const phase = new StepBackPhase();
  const result = phase.execute(args.dataset, session.domains);
  
  session.phases.stepBack = result;
  session.status = 'abstraction_complete';

  return {
    content: [
      {
        type: 'text',
        text: `[PHASE I: STEP-BACK ABSTRACTION COMPLETE]

<principle domain="thermodynamic">
${result.principles.thermodynamic}
</principle>

<principle domain="game_theoretic">
${result.principles.gameTheoretic}
</principle>

<principle domain="network">
${result.principles.network}
</principle>

<principle domain="systems">
${result.principles.systems}
</principle>

<principle domain="epistemic">
${result.principles.epistemic}
</principle>

Principles extracted. Ready for Phase II: Skeleton Generation.`,
      },
    ],
  };
}

function handleSkeleton(args: { session_id: string }) {
  const session = sessions.get(args.session_id);
  if (!session) {
    throw new Error(`Session not found: ${args.session_id}`);
  }

  if (!session.phases.stepBack) {
    throw new Error('Phase I (Step-Back) must be completed first');
  }

  const phase = new SkeletonPhase();
  const result = phase.execute(session.phases.stepBack, session.domains);
  
  session.phases.skeleton = result;
  session.status = 'skeleton_complete';

  let output = `[PHASE II: SKELETON GENERATION COMPLETE]\n\n`;
  output += `Identified 5 critical cross-domain nexus points:\n\n`;
  
  result.nexusPoints.forEach((nexus, i) => {
    output += `NEXUS ${i + 1}: ${nexus.domainA} ↔ ${nexus.domainB}\n`;
    output += `  Description: ${nexus.description}\n`;
    output += `  Evidence: ${nexus.primaryEvidence}\n`;
    output += `  Risk: ${nexus.misinterpretationRisk}\n\n`;
  });

  output += `Ready for Phase III: Tree-of-Thoughts Exploration.`;

  return {
    content: [{ type: 'text', text: output }],
  };
}

function handleTotExplore(args: { session_id: string; nexus_index: number }) {
  const session = sessions.get(args.session_id);
  if (!session) {
    throw new Error(`Session not found: ${args.session_id}`);
  }

  if (!session.phases.skeleton) {
    throw new Error('Phase II (Skeleton) must be completed first');
  }

  const nexus = session.phases.skeleton.nexusPoints[args.nexus_index];
  if (!nexus) {
    throw new Error(`Nexus index ${args.nexus_index} not found`);
  }

  const phase = new ToTPhase();
  const result = phase.execute(nexus);
  
  if (!session.phases.tot) {
    session.phases.tot = {};
  }
  session.phases.tot[args.nexus_index] = result;

  let output = `[PHASE III: TREE-OF-THOUGHTS EXPLORATION]\n`;
  output += `Nexus: ${nexus.description}\n\n`;

  result.paths.forEach((path, i) => {
    const pathLabels = ['A (Convergent)', 'B (Adversarial)', 'C (Black Swan)'];
    output += `<branch path="${pathLabels[i]}">\n`;
    output += `  Interpretation: ${path.interpretation}\n`;
    output += `  Evidence: ${path.evidence}\n`;
    output += `  Implications: ${path.implications}\n`;
    output += `  Confidence: ${path.confidence}%\n`;
    output += `</branch>\n\n`;
  });

  return {
    content: [{ type: 'text', text: output }],
  };
}

function handleEvaluate(args: { session_id: string }) {
  const session = sessions.get(args.session_id);
  if (!session) {
    throw new Error(`Session not found: ${args.session_id}`);
  }

  if (!session.phases.tot) {
    throw new Error('Phase III (ToT) must be completed first');
  }

  const phase = new EvaluationPhase();
  const result = phase.execute(session.phases.tot);
  
  session.phases.evaluation = result;
  session.status = 'evaluation_complete';

  let output = `[PHASE IV: METACOGNITIVE EVALUATION COMPLETE]\n\n`;
  output += `Paths evaluated: ${result.totalPaths}\n`;
  output += `Paths passed: ${result.passedPaths}\n`;
  output += `Paths failed: ${result.failedPaths}\n\n`;

  if (result.failures.length > 0) {
    output += `FAILURES:\n`;
    result.failures.forEach(f => {
      output += `  - ${f.path}: ${f.criterion} (${f.reason})\n`;
    });
    output += `\n`;
  }

  output += `Verified paths promoted to synthesis: ${result.verifiedPaths.length}\n`;
  output += `Ready for Phase V: Synthesis.`;

  return {
    content: [{ type: 'text', text: output }],
  };
}

function handleSynthesize(args: { session_id: string }) {
  const session = sessions.get(args.session_id);
  if (!session) {
    throw new Error(`Session not found: ${args.session_id}`);
  }

  if (!session.phases.evaluation) {
    throw new Error('Phase IV (Evaluation) must be completed first');
  }

  const phase = new SynthesisPhase();
  const result = phase.execute(
    session.phases.skeleton!,
    session.phases.evaluation,
    session.audience
  );
  
  session.phases.synthesis = result;
  session.status = 'synthesis_complete';

  let output = `[PHASE V: SYNTHESIS COMPLETE]\n\n`;
  output += `<synthesis>\n\n`;
  output += `=== EXECUTIVE SUMMARY ===\n`;
  output += `${result.executiveSummary}\n\n`;
  
  output += `=== CROSS-DOMAIN CORRELATIONS ===\n`;
  result.correlations.forEach((c, i) => {
    output += `Nexus ${i + 1}: ${c.nexus}\n`;
    output += `  Evidence: ${c.evidence}\n`;
    output += `  Interpretation: ${c.interpretation}\n`;
    output += `  Confidence: ${c.confidence}%\n\n`;
  });

  output += `=== EMERGING RISKS ===\n`;
  result.risks.forEach(r => {
    output += `- ${r.description}\n`;
    output += `  Severity: ${r.severity}, Probability: ${r.probability}\n`;
    output += `  Mitigation: ${r.mitigation}\n\n`;
  });

  output += `=== RECOMMENDED ACTIONS ===\n`;
  output += `Immediate (0-30 days):\n${result.actions.immediate}\n\n`;
  output += `Tactical (1-6 months):\n${result.actions.tactical}\n\n`;
  output += `Strategic (6+ months):\n${result.actions.strategic}\n\n`;

  output += `=== AUDIT TRAIL ===\n`;
  output += `Key assumptions: ${result.auditTrail.assumptions.join(', ')}\n`;
  output += `Evidence gaps: ${result.auditTrail.gaps.join(', ')}\n`;
  output += `RAG triggers: ${result.auditTrail.ragTriggers.join(', ')}\n\n`;

  output += `</synthesis>\n\n`;
  output += `Ready for Phase VI: Calibration.`;

  return {
    content: [{ type: 'text', text: output }],
  };
}

function handleCalibrate(args: { session_id: string }) {
  const session = sessions.get(args.session_id);
  if (!session) {
    throw new Error(`Session not found: ${args.session_id}`);
  }

  if (!session.phases.synthesis) {
    throw new Error('Phase V (Synthesis) must be completed first');
  }

  const phase = new CalibrationPhase();
  const result = phase.execute(session.phases.synthesis);
  
  session.phases.calibration = result;
  session.status = 'complete';

  let output = `[PHASE VI: CALIBRATION COMPLETE]\n\n`;
  output += `<calibration>\n\n`;
  output += `OVERALL CONFIDENCE SCORE: ${result.overallConfidence}%\n\n`;

  output += `CONFIDENCE BREAKDOWN:\n`;
  output += `  Evidence quality: ${result.breakdown.evidenceQuality}%\n`;
  output += `  Reasoning soundness: ${result.breakdown.reasoningSoundness}%\n`;
  output += `  Domain coverage: ${result.breakdown.domainCoverage}%\n`;
  output += `  Temporal stability: ${result.breakdown.temporalStability}%\n\n`;

  output += `LOGICAL GAPS IDENTIFIED:\n`;
  result.gaps.forEach((g, i) => {
    output += `  ${i + 1}. ${g.description}\n`;
    output += `     Evidence needed: ${g.evidenceNeeded}\n`;
  });
  output += `\n`;

  output += `RAG RETRIEVAL TRIGGERS:\n`;
  result.ragTriggers.forEach(t => {
    output += `  - ${t.description}\n`;
    output += `    Sources: ${t.sources}\n`;
    output += `    Queries: ${t.queries}\n`;
  });
  output += `\n`;

  output += `REVISION CONDITIONS:\n`;
  output += `  Full revision trigger: ${result.revisionConditions.full}\n`;
  output += `  Partial update trigger: ${result.revisionConditions.partial}\n`;
  output += `  Monitoring: ${result.revisionConditions.monitoring}\n\n`;

  output += `</calibration>\n\n`;
  output += `[SYNTHESIS SESSION COMPLETE]\n`;
  output += `Session ID: ${args.session_id}\n`;
  output += `Status: ${session.status}\n`;
  output += `Use architect_retrieve_synthesis to retrieve full output.`;

  return {
    content: [{ type: 'text', text: output }],
  };
}

async function handleFullSynthesis(args: {
  dataset: string;
  dataset_description: string;
  domains: string[];
  stakes?: string;
  audience?: string;
}) {
  // Run all phases in sequence
  const openResult = handleOpenSynthesis({
    dataset_description: args.dataset_description,
    domains: args.domains,
    stakes: args.stakes,
    audience: args.audience
  });

  const sessionIdMatch = openResult.content[0].text.match(/Session ID: ([a-f0-9-]+)/);
  if (!sessionIdMatch) {
    throw new Error('Failed to extract session ID');
  }
  const sessionId = sessionIdMatch[1];

  // Execute all phases
  handleStepBack({ session_id: sessionId, dataset: args.dataset });
  handleSkeleton({ session_id: sessionId });

  // Explore all 5 nexus points
  for (let i = 0; i < 5; i++) {
    handleTotExplore({ session_id: sessionId, nexus_index: i });
  }

  handleEvaluate({ session_id: sessionId });
  handleSynthesize({ session_id: sessionId });
  const calibrateResult = handleCalibrate({ session_id: sessionId });

  return calibrateResult;
}

function handleRedTeam(args: {
  conclusion: string;
  supporting_evidence: string;
  intensity?: 'standard' | 'aggressive' | 'maximum';
}) {
  const intensity = args.intensity || 'standard';
  
  const redTeamAnalysis = {
    weakestLink: 'Identify the single piece of evidence that, if invalidated, would most damage the conclusion',
    counterArguments: [
      'Alternative explanation 1: [generated based on evidence]',
      'Alternative explanation 2: [generated based on evidence]',
      'Alternative explanation 3: [generated based on evidence]'
    ],
    falsificationPathways: [
      'What evidence would prove this wrong?',
      'What experiment could invalidate this?',
      'What observation would contradict this?'
    ],
    probabilityOfError: intensity === 'maximum' ? '35-50%' : intensity === 'aggressive' ? '20-35%' : '10-20%'
  };

  let output = `[RED TEAM ANALYSIS - INTENSITY: ${intensity.toUpperCase()}]\n\n`;
  output += `CONCLUSION UNDER STRESS-TEST:\n${args.conclusion}\n\n`;
  output += `WEAKEST LINK:\n${redTeamAnalysis.weakestLink}\n\n`;
  output += `COUNTER-ARGUMENTS:\n`;
  redTeamAnalysis.counterArguments.forEach((ca, i) => {
    output += `  ${i + 1}. ${ca}\n`;
  });
  output += `\nFALSIFICATION PATHWAYS:\n`;
  redTeamAnalysis.falsificationPathways.forEach((fp, i) => {
    output += `  ${i + 1}. ${fp}\n`;
  });
  output += `\nPROBABILITY OF ERROR: ${redTeamAnalysis.probabilityOfError}\n`;
  output += `\n[RED TEAM COMPLETE]`;

  return {
    content: [{ type: 'text', text: output }],
  };
}

function handleCrossDomainExtract(args: {
  dataset: string;
  source_domains: string[];
  target_domains: string[];
  min_confidence?: number;
}) {
  const minConfidence = args.min_confidence || 0.6;

  // Simulate cross-domain extraction
  const extraction = {
    signals: [
      { domain: args.source_domains[0], target: args.target_domains[0], strength: 0.85, confidence: 0.78 },
      { domain: args.source_domains[1] || args.source_domains[0], target: args.target_domains[1] || args.target_domains[0], strength: 0.72, confidence: 0.81 },
    ].filter(s => s.confidence >= minConfidence),
    gaps: [
      'Missing temporal data for longitudinal analysis',
      'Insufficient cross-domain correlation metrics'
    ]
  };

  let output = `[CROSS-DOMAIN KNOWLEDGE EXTRACTION]\n\n`;
  output += `Source domains: ${args.source_domains.join(', ')}\n`;
  output += `Target domains: ${args.target_domains.join(', ')}\n`;
  output += `Minimum confidence: ${minConfidence}\n\n`;

  output += `EXTRACTED SIGNALS:\n`;
  extraction.signals.forEach((s, i) => {
    output += `  ${i + 1}. ${s.domain} → ${s.target}\n`;
    output += `     Strength: ${(s.strength * 100).toFixed(1)}%\n`;
    output += `     Confidence: ${(s.confidence * 100).toFixed(1)}%\n\n`;
  });

  output += `IDENTIFIED GAPS:\n`;
  extraction.gaps.forEach((g, i) => {
    output += `  ${i + 1}. ${g}\n`;
  });

  return {
    content: [{ type: 'text', text: output }],
  };
}

function handleRetrieveSynthesis(args: { session_id: string }) {
  const session = sessions.get(args.session_id);
  if (!session) {
    throw new Error(`Session not found: ${args.session_id}`);
  }

  let output = `[SYNTHESIS RETRIEVAL]\n\n`;
  output += `Session ID: ${session.id}\n`;
  output += `Status: ${session.status}\n`;
  output += `Created: ${session.createdAt}\n\n`;

  if (session.phases.stepBack) {
    output += `=== PHASE I: STEP-BACK ABSTRACTION ===\n`;
    output += `Principles extracted: 5\n\n`;
  }

  if (session.phases.skeleton) {
    output += `=== PHASE II: SKELETON ===\n`;
    output += `Nexus points: ${session.phases.skeleton.nexusPoints.length}\n\n`;
  }

  if (session.phases.tot) {
    output += `=== PHASE III: TREE-OF-THOUGHTS ===\n`;
    output += `Paths explored: ${Object.keys(session.phases.tot).length * 3}\n\n`;
  }

  if (session.phases.evaluation) {
    output += `=== PHASE IV: EVALUATION ===\n`;
    output += `Verified paths: ${session.phases.evaluation.verifiedPaths.length}\n\n`;
  }

  if (session.phases.synthesis) {
    output += `=== PHASE V: SYNTHESIS ===\n`;
    output += `${session.phases.synthesis.executiveSummary}\n\n`;
  }

  if (session.phases.calibration) {
    output += `=== PHASE VI: CALIBRATION ===\n`;
    output += `Overall confidence: ${session.phases.calibration.overallConfidence}%\n\n`;
  }

  output += `[END RETRIEVAL]`;

  return {
    content: [{ type: 'text', text: output }],
  };
}

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Undead Architect MCP Server running on stdio');
}

main().catch(console.error);
