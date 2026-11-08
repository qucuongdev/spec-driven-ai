const fs = require('fs');
const path = require('path');

// Excalidraw JSON generator adhering to excalidraw-diagram skill
// Colors from color-palette.md:
const C = {
  primaryFill: '#3b82f6',
  primaryStroke: '#1e3a5f',
  secondaryFill: '#60a5fa',
  secondaryStroke: '#1e3a5f',
  startFill: '#fed7aa',
  startStroke: '#c2410c',
  endFill: '#a7f3d0',
  endStroke: '#047857',
  decisionFill: '#fef3c7',
  decisionStroke: '#b45309',
  aiFill: '#ddd6fe',
  aiStroke: '#6d28d9',
  errorFill: '#fee2e2',
  errorStroke: '#dc2626',
  evidenceBg: '#1e293b',
  evidenceGreen: '#22c55e',
  evidenceCyan: '#38bdf8',
  evidenceText: '#f8fafc',
  titleColor: '#1e40af',
  subtitleColor: '#3b82f6',
  bodyColor: '#64748b',
  textLight: '#1e293b',
  textDark: '#ffffff',
  structLine: '#94a3b8'
};

let seedCounter = 10000;
function getSeed() { return seedCounter++; }

const elements = [];

// Helper: Free-floating text
function addText({ id, x, y, text, size = 16, color = C.bodyColor, align = 'left', bold = false, w = 300, h = 25 }) {
  elements.push({
    type: 'text',
    id: id,
    x, y,
    width: w, height: h,
    text: text,
    originalText: text,
    fontSize: size,
    fontFamily: 3,
    textAlign: align,
    verticalAlign: 'top',
    strokeColor: color,
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 1,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 100,
    angle: 0,
    seed: getSeed(),
    version: 1,
    versionNonce: getSeed(),
    isDeleted: false,
    groupIds: [],
    boundElements: null,
    link: null,
    locked: false,
    containerId: null,
    lineHeight: 1.25
  });
}

// Helper: Box with centered text
function addBox({ id, textId, x, y, w, h, text, fill, stroke, textColor = C.textLight, round = 3, strokeW = 2 }) {
  elements.push({
    type: 'rectangle',
    id: id,
    x, y, width: w, height: h,
    strokeColor: stroke,
    backgroundColor: fill,
    fillStyle: 'solid',
    strokeWidth: strokeW,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 100,
    angle: 0,
    seed: getSeed(),
    version: 1,
    versionNonce: getSeed(),
    isDeleted: false,
    groupIds: [],
    boundElements: [{ id: textId, type: 'text' }],
    link: null,
    locked: false,
    roundness: { type: round }
  });

  elements.push({
    type: 'text',
    id: textId,
    x: x + 10, y: y + (h - 22) / 2,
    width: w - 20, height: 24,
    text: text,
    originalText: text,
    fontSize: 15,
    fontFamily: 3,
    textAlign: 'center',
    verticalAlign: 'middle',
    strokeColor: textColor,
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 1,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 100,
    angle: 0,
    seed: getSeed(),
    version: 1,
    versionNonce: getSeed(),
    isDeleted: false,
    groupIds: [],
    boundElements: null,
    link: null,
    locked: false,
    containerId: id,
    lineHeight: 1.25
  });
}

// Helper: Decision Diamond
function addDiamond({ id, textId, x, y, w, h, text, stroke = C.decisionStroke, fill = C.decisionFill, textColor = '#78350f' }) {
  elements.push({
    type: 'diamond',
    id: id,
    x, y, width: w, height: h,
    strokeColor: stroke,
    backgroundColor: fill,
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 100,
    angle: 0,
    seed: getSeed(),
    version: 1,
    versionNonce: getSeed(),
    isDeleted: false,
    groupIds: [],
    boundElements: [{ id: textId, type: 'text' }],
    link: null,
    locked: false
  });

  elements.push({
    type: 'text',
    id: textId,
    x: x + 15, y: y + (h - 20) / 2,
    width: w - 30, height: 20,
    text: text,
    originalText: text,
    fontSize: 13,
    fontFamily: 3,
    textAlign: 'center',
    verticalAlign: 'middle',
    strokeColor: textColor,
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 1,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 100,
    angle: 0,
    seed: getSeed(),
    version: 1,
    versionNonce: getSeed(),
    isDeleted: false,
    groupIds: [],
    boundElements: null,
    link: null,
    locked: false,
    containerId: id,
    lineHeight: 1.2
  });
}

// Helper: Ellipse (Start/End)
function addEllipse({ id, textId, x, y, w, h, text, fill, stroke, textColor = C.textLight }) {
  elements.push({
    type: 'ellipse',
    id: id,
    x, y, width: w, height: h,
    strokeColor: stroke,
    backgroundColor: fill,
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 100,
    angle: 0,
    seed: getSeed(),
    version: 1,
    versionNonce: getSeed(),
    isDeleted: false,
    groupIds: [],
    boundElements: [{ id: textId, type: 'text' }],
    link: null,
    locked: false
  });

  elements.push({
    type: 'text',
    id: textId,
    x: x + 10, y: y + (h - 22) / 2,
    width: w - 20, height: 22,
    text: text,
    originalText: text,
    fontSize: 15,
    fontFamily: 3,
    textAlign: 'center',
    verticalAlign: 'middle',
    strokeColor: textColor,
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 1,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 100,
    angle: 0,
    seed: getSeed(),
    version: 1,
    versionNonce: getSeed(),
    isDeleted: false,
    groupIds: [],
    boundElements: null,
    link: null,
    locked: false,
    containerId: id,
    lineHeight: 1.2
  });
}

// Helper: Evidence Artifact Card (Dark theme)
function addEvidenceCard({ id, x, y, w, h, title, content, stroke = '#334155' }) {
  // Container box
  elements.push({
    type: 'rectangle',
    id: id,
    x, y, width: w, height: h,
    strokeColor: stroke,
    backgroundColor: C.evidenceBg,
    fillStyle: 'solid',
    strokeWidth: 1.5,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 100,
    angle: 0,
    seed: getSeed(),
    version: 1,
    versionNonce: getSeed(),
    isDeleted: false,
    groupIds: [],
    boundElements: null,
    link: null,
    locked: false,
    roundness: { type: 3 }
  });

  // Title tag
  addText({
    id: id + '_title',
    x: x + 14, y: y + 10,
    text: title,
    size: 11,
    color: '#94a3b8',
    w: w - 28, h: 16
  });

  // Content body
  addText({
    id: id + '_body',
    x: x + 14, y: y + 30,
    text: content,
    size: 12,
    color: content.includes('FAIL') ? '#f87171' : content.includes('PASS') ? '#4ade80' : '#38bdf8',
    w: w - 28, h: h - 38
  });
}

// Helper: Section Boundary Box
function addSectionBoundary({ id, x, y, w, h, stroke = '#cbd5e1' }) {
  elements.push({
    type: 'rectangle',
    id: id,
    x, y, width: w, height: h,
    strokeColor: stroke,
    backgroundColor: '#f8fafc',
    fillStyle: 'solid',
    strokeWidth: 1,
    strokeStyle: 'dashed',
    roughness: 0,
    opacity: 100,
    angle: 0,
    seed: getSeed(),
    version: 1,
    versionNonce: getSeed(),
    isDeleted: false,
    groupIds: [],
    boundElements: null,
    link: null,
    locked: false,
    roundness: { type: 3 }
  });
}

// Helper: Connecting Arrow
function addArrow({ id, fromId, toId, points, color = C.primaryStroke, dashed = false, label = null }) {
  const [p0, ...rest] = points;
  const last = rest[rest.length - 1] || p0;
  const w = Math.abs(last[0]);
  const h = Math.abs(last[1]);

  elements.push({
    type: 'arrow',
    id: id,
    x: p0[0], y: p0[1],
    width: w, height: h,
    strokeColor: color,
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: dashed ? 'dashed' : 'solid',
    roughness: 0,
    opacity: 100,
    angle: 0,
    seed: getSeed(),
    version: 1,
    versionNonce: getSeed(),
    isDeleted: false,
    groupIds: [],
    boundElements: null,
    link: null,
    locked: false,
    points: [[0, 0], ...rest.map(p => [p[0] - p0[0], p[1] - p0[1]])],
    startBinding: fromId ? { elementId: fromId, focus: 0, gap: 2 } : null,
    endBinding: toId ? { elementId: toId, focus: 0, gap: 2 } : null,
    startArrowhead: null,
    endArrowhead: 'arrow'
  });

  if (label) {
    const midX = p0[0] + (last[0] - p0[0]) * 0.5 - 30;
    const midY = p0[1] + (last[1] - p0[1]) * 0.5 - 18;
    addText({
      id: id + '_lbl',
      x: midX, y: midY,
      text: label,
      size: 11,
      color: dashed ? C.errorStroke : C.bodyColor,
      w: 120, h: 16
    });
  }
}

// ============================================================================
// 1. HEADER & META BANNER
// ============================================================================
addText({
  id: 'h_title',
  x: 60, y: 40,
  text: 'AI-DLC v2.0: Spec-Driven Autonomous Lifecycle',
  size: 28,
  color: C.titleColor,
  w: 1000, h: 36
});

addText({
  id: 'h_sub',
  x: 60, y: 80,
  text: 'Multi-agent orchestration with adversarial testing, strict filesystem RBAC, and immutable candidate verification.',
  size: 15,
  color: C.bodyColor,
  w: 1100, h: 24
});

// Level 1: Summary Flow Pipeline (Timeline with dots)
const summarySteps = [
  '0. Context', '1-4. Inception & Plan', '5. Red Test', '6. Green Code',
  '7. Auditor Hash', '8. Candidate PR', 'Release Gate'
];
summarySteps.forEach((s, idx) => {
  const dotX = 60 + idx * 290;
  const dotY = 125;
  // Marker Dot
  elements.push({
    type: 'ellipse',
    id: `sum_dot_${idx}`,
    x: dotX, y: dotY,
    width: 12, height: 12,
    strokeColor: C.primaryStroke,
    backgroundColor: C.primaryFill,
    fillStyle: 'solid',
    strokeWidth: 1,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 100,
    angle: 0,
    seed: getSeed(),
    version: 1,
    versionNonce: getSeed(),
    isDeleted: false,
    groupIds: [],
    boundElements: null,
    link: null,
    locked: false
  });
  // Label
  addText({
    id: `sum_txt_${idx}`,
    x: dotX + 18, y: dotY - 4,
    text: s,
    size: 13,
    color: C.titleColor,
    w: 240, h: 18
  });
  // Connecting line to next dot
  if (idx < summarySteps.length - 1) {
    elements.push({
      type: 'line',
      id: `sum_line_${idx}`,
      x: dotX + 170, y: dotY + 6,
      width: 100, height: 0,
      strokeColor: '#cbd5e1',
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1.5,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      angle: 0,
      seed: getSeed(),
      version: 1,
      versionNonce: getSeed(),
      isDeleted: false,
      groupIds: [],
      boundElements: null,
      link: null,
      locked: false,
      points: [[0, 0], [100, 0]]
    });
  }
});

// ============================================================================
// SECTION 1: INCEPTION & SCOPE LOCKING (Architect Subagent)
// ============================================================================
const s1X = 60, s1Y = 170, s1W = 540, s1H = 820;
addSectionBoundary({ id: 'sec_1_bg', x: s1X, y: s1Y, w: s1W, h: s1H });

addText({
  id: 'sec_1_title',
  x: s1X + 20, y: s1Y + 20,
  text: 'PHASE 1: INCEPTION & SCOPE LOCK',
  size: 17, color: C.titleColor, w: 400, h: 24
});
addText({
  id: 'sec_1_sub',
  x: s1X + 20, y: s1Y + 44,
  text: 'Architect Subagent • Read-only codebase • AC & boundary freeze',
  size: 12, color: C.bodyColor, w: 450, h: 18
});

// Step 0: Jira Intake
addEllipse({
  id: 'node_intake', textId: 'txt_intake',
  x: s1X + 30, y: s1Y + 80, w: 220, h: 64,
  text: 'Jira Ticket Intake\n(AC & Profile Selection)',
  fill: C.startFill, stroke: C.startStroke, textColor: '#7c2d12'
});

// Step 1: Context & Discovery
addBox({
  id: 'node_context', textId: 'txt_context',
  x: s1X + 30, y: s1Y + 180, w: 220, h: 64,
  text: '0. Context & Discovery\n(Survey Callers / Callee)',
  fill: C.aiFill, stroke: C.aiStroke, textColor: '#4c1d95'
});

// Step 2: Spec & Plan
addBox({
  id: 'node_plan', textId: 'txt_plan',
  x: s1X + 30, y: s1Y + 280, w: 220, h: 64,
  text: '4. Plan & Lock plan.json\n(Define Boundaries)',
  fill: C.aiFill, stroke: C.aiStroke, textColor: '#4c1d95'
});

// Evidence Artifact 1: plan.json
const planJsonContent = `// .aidlc/specs/active/TICKET/plan.json
{
  "maxFiles": 2,
  "allowedFiles": [
    "src/auth/jwt-verifier.ts"
  ],
  "testFiles": [
    "tests/auth/jwt.test.ts"
  ],
  "verificationCommands": [
    "npm test tests/auth/jwt.test.ts"
  ]
}`;
addEvidenceCard({
  id: 'ev_plan',
  x: s1X + 30, y: s1Y + 380, w: 480, h: 220,
  title: 'EVIDENCE ARTIFACT 1: plan.json (Boundaries Locked)',
  content: planJsonContent,
  stroke: '#6366f1'
});

// Decision Diamond: Plan Valid?
addDiamond({
  id: 'dia_plan', textId: 'txt_dia_plan',
  x: s1X + 170, y: s1Y + 630, w: 160, h: 90,
  text: 'Plan Valid?\n(Scope ≤ budget)'
});

// Arrows in Section 1
addArrow({
  id: 'arr_s1_1', fromId: 'node_intake', toId: 'node_context',
  points: [[s1X + 140, s1Y + 144], [s1X + 140, s1Y + 180]],
  color: C.primaryStroke
});

addArrow({
  id: 'arr_s1_2', fromId: 'node_context', toId: 'node_plan',
  points: [[s1X + 140, s1Y + 244], [s1X + 140, s1Y + 280]],
  color: C.primaryStroke, label: 'AC verified'
});

addArrow({
  id: 'arr_s1_3', fromId: 'node_plan', toId: 'ev_plan',
  points: [[s1X + 140, s1Y + 344], [s1X + 140, s1Y + 380]],
  color: C.aiStroke
});

addArrow({
  id: 'arr_s1_4', fromId: 'ev_plan', toId: 'dia_plan',
  points: [[s1X + 250, s1Y + 600], [s1X + 250, s1Y + 630]],
  color: C.primaryStroke
});

// ============================================================================
// SECTION 2: ADVERSARIAL CONSTRUCTION (QA Tester vs Coder Subagents)
// ============================================================================
const s2X = 630, s2Y = 170, s2W = 750, s2H = 820;
addSectionBoundary({ id: 'sec_2_bg', x: s2X, y: s2Y, w: s2W, h: s2H });

addText({
  id: 'sec_2_title',
  x: s2X + 20, y: s2Y + 20,
  text: 'PHASE 2: ADVERSARIAL CONSTRUCTION (RED-TO-GREEN)',
  size: 17, color: C.titleColor, w: 600, h: 24
});
addText({
  id: 'sec_2_sub',
  x: s2X + 20, y: s2Y + 44,
  text: 'Strict RBAC: QA owns tests/** (Exit!=0) • Coder owns allowedFiles (Exit=0) • No crossover',
  size: 12, color: C.bodyColor, w: 680, h: 18
});

// Sub-lane 1: QA Tester (Write tests/**)
addText({
  id: 'qa_badge', x: s2X + 30, y: s2Y + 76,
  text: 'ROLE: QA TESTER SUBAGENT (Scope: tests/** only)',
  size: 12, color: '#047857', bold: true, w: 320, h: 18
});

addBox({
  id: 'node_qa_red', textId: 'txt_qa_red',
  x: s2X + 30, y: s2Y + 105, w: 260, h: 64,
  text: '5. Author Red Tests from Spec\n(Assert expected failure)',
  fill: C.aiFill, stroke: C.aiStroke, textColor: '#4c1d95'
});

// Evidence Artifact 2: Red Test Log
const redLogContent = `// Execution: npm test tests/auth/jwt.test.ts
FAIL tests/auth/jwt.test.ts
  ✕ should reject expired token with 401 Unauthorized
    AssertionError: expected 401, received undefined

Tests: 1 failed, 0 passed
Exit Code: 1 (CONFIRMED VALID RED BEHAVIOR)`;

addEvidenceCard({
  id: 'ev_red',
  x: s2X + 30, y: s2Y + 200, w: 320, h: 180,
  title: 'EVIDENCE ARTIFACT 2: Valid Red Test Evidence',
  content: redLogContent,
  stroke: '#ef4444'
});

// Decision Diamond: Valid Red?
addDiamond({
  id: 'dia_red', textId: 'txt_dia_red',
  x: s2X + 110, y: s2Y + 410, w: 160, h: 90,
  text: 'Valid Red?\n(Fail by missing logic)'
});

// Sub-lane 2: Coder Subagent (Write allowedFiles)
addText({
  id: 'coder_badge', x: s2X + 410, y: s2Y + 76,
  text: 'ROLE: CODER SUBAGENT (Scope: allowedFiles only)',
  size: 12, color: '#b45309', bold: true, w: 320, h: 18
});

addBox({
  id: 'node_coder_green', textId: 'txt_coder_green',
  x: s2X + 410, y: s2Y + 105, w: 260, h: 64,
  text: '6. Implement Patch Logic\n(Minimal code in allowedFiles)',
  fill: C.aiFill, stroke: C.aiStroke, textColor: '#4c1d95'
});

// Evidence Artifact 3: Green Test Log
const greenLogContent = `// Execution: npm test tests/auth/jwt.test.ts
PASS tests/auth/jwt.test.ts
  ✓ should reject expired token with 401 Unauthorized
  ✓ should decode verified payload correctly

Tests: 2 passed, 0 failed
Exit Code: 0 (GREEN PASS)
git status: ONLY allowedFiles modified`;

addEvidenceCard({
  id: 'ev_green',
  x: s2X + 410, y: s2Y + 200, w: 320, h: 180,
  title: 'EVIDENCE ARTIFACT 3: Clean Green Pass Evidence',
  content: greenLogContent,
  stroke: '#22c55e'
});

// Decision Diamond: Scope & Tests Pass?
addDiamond({
  id: 'dia_scope', textId: 'txt_dia_scope',
  x: s2X + 490, y: s2Y + 410, w: 160, h: 90,
  text: 'Scope Pass?\n(No extra files)'
});

// Connecting arrows in Section 2
addArrow({
  id: 'arr_cross_sec1_to_sec2', fromId: 'dia_plan', toId: 'node_qa_red',
  points: [[s1X + 330, s1Y + 675], [s2X + 160, s1Y + 675], [s2X + 160, s2Y + 169]],
  color: C.primaryStroke, label: 'Plan Approved'
});

addArrow({
  id: 'arr_qa_to_evred', fromId: 'node_qa_red', toId: 'ev_red',
  points: [[s2X + 160, s2Y + 169], [s2X + 160, s2Y + 200]],
  color: C.errorStroke
});

addArrow({
  id: 'arr_evred_to_diared', fromId: 'ev_red', toId: 'dia_red',
  points: [[s2X + 160, s2Y + 380], [s2X + 160, s2Y + 410]],
  color: C.primaryStroke
});

// Valid Red handoff to Coder
addArrow({
  id: 'arr_red_to_coder', fromId: 'dia_red', toId: 'node_coder_green',
  points: [[s2X + 270, s2Y + 455], [s2X + 350, s2Y + 455], [s2X + 350, s2Y + 137], [s2X + 410, s2Y + 137]],
  color: C.primaryStroke, label: 'Red confirmed (Exit!=0)'
});

addArrow({
  id: 'arr_coder_to_evgreen', fromId: 'node_coder_green', toId: 'ev_green',
  points: [[s2X + 540, s2Y + 169], [s2X + 540, s2Y + 200]],
  color: C.endStroke
});

addArrow({
  id: 'arr_evgreen_to_diascope', fromId: 'ev_green', toId: 'dia_scope',
  points: [[s2X + 540, s2Y + 380], [s2X + 540, s2Y + 410]],
  color: C.primaryStroke
});

// REVISION LOOPS (Dashed red/amber loops)
// Loop 1: Test failed after coder -> refactor coder logic
addArrow({
  id: 'loop_coder_fix', fromId: 'dia_scope', toId: 'node_coder_green',
  points: [[s2X + 650, s2Y + 455], [s2X + 700, s2Y + 455], [s2X + 700, s2Y + 137], [s2X + 670, s2Y + 137]],
  color: C.errorStroke, dashed: true, label: 'Test Failed (Exit!=0)'
});

// Loop 2: Invalid red (assertion flaw) -> QA revise
addArrow({
  id: 'loop_qa_flaw', fromId: 'dia_red', toId: 'node_qa_red',
  points: [[s2X + 110, s2Y + 455], [s2X + 15, s2Y + 455], [s2X + 15, s2Y + 137], [s2X + 30, s2Y + 137]],
  color: C.errorStroke, dashed: true, label: 'Syntax error (Fix assertion)'
});

// Loop 3: Scope violation -> Architect replan
addArrow({
  id: 'loop_scope_violation', fromId: 'dia_scope', toId: 'node_plan',
  points: [[s2X + 570, s2Y + 500], [s2X + 570, s2Y + 760], [s1X + 450, s2Y + 760], [s1X + 250, s1Y + 312]],
  color: '#c2410c', dashed: true, label: 'Scope budget violated (Replan)'
});

// ============================================================================
// SECTION 3: INDEPENDENT VERIFICATION & PR (Auditor & Coordinator)
// ============================================================================
const s3X = 1410, s3Y = 170, s3W = 560, s3H = 820;
addSectionBoundary({ id: 'sec_3_bg', x: s3X, y: s3Y, w: s3W, h: s3H });

addText({
  id: 'sec_3_title',
  x: s3X + 20, y: s3Y + 20,
  text: 'PHASE 3: INDEPENDENT AUDIT & CANDIDATE PR',
  size: 17, color: C.titleColor, w: 500, h: 24
});
addText({
  id: 'sec_3_sub',
  x: s3X + 20, y: s3Y + 44,
  text: 'Auditor Subagent • Read-only code/tests • SHA-256 fingerprint on exact HEAD',
  size: 12, color: C.bodyColor, w: 520, h: 18
});

// Step 7: Verify & Fingerprint
addBox({
  id: 'node_audit', textId: 'txt_audit',
  x: s3X + 30, y: s3Y + 90, w: 260, h: 64,
  text: '7. Verify & SHA Fingerprint\n(Zero diff against plan.json)',
  fill: C.aiFill, stroke: C.aiStroke, textColor: '#4c1d95'
});

// Evidence Artifact 4: SHA-256 Fingerprint
const fingerprintContent = `// Execution: node .aidlc/tools/cli.js verify
Git HEAD Commit: 3b9e4a81f02c (Candidate)
SHA256 Fingerprint:
  7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1f...
Audit Result: 
  - Allowed files match: 1/1 (PASS)
  - Tests match spec: 2/2 ACs covered (PASS)
  - Secrets scan: 0 leaks detected (PASS)`;

addEvidenceCard({
  id: 'ev_audit',
  x: s3X + 30, y: s3Y + 180, w: 500, h: 180,
  title: 'EVIDENCE ARTIFACT 4: Immutable Candidate SHA Fingerprint',
  content: fingerprintContent,
  stroke: '#06b6d4'
});

// Step 8: Candidate PR & AI Comment
addBox({
  id: 'node_pr', textId: 'txt_pr',
  x: s3X + 30, y: s3Y + 390, w: 280, h: 64,
  text: '8. Publish Idempotent PR\n(Draft pr.md & Post AI COMMENT)',
  fill: C.primaryFill, stroke: C.primaryStroke, textColor: '#ffffff'
});

// Note on AI Comment
addText({
  id: 'ai_comment_note',
  x: s3X + 30, y: s3Y + 465,
  text: 'RULE: AI findings posted as GitHub COMMENT.\nAI NEVER signs APPROVE on PR (Human control).',
  size: 12, color: '#dc2626', w: 450, h: 32
});

// Arrow from Section 2 to Section 3
addArrow({
  id: 'arr_green_to_audit', fromId: 'dia_scope', toId: 'node_audit',
  points: [[s2X + 650, s2Y + 455], [s3X - 20, s2Y + 455], [s3X - 20, s3Y + 122], [s3X + 30, s3Y + 122]],
  color: C.primaryStroke, label: 'Scope clean'
});

addArrow({
  id: 'arr_audit_to_ev', fromId: 'node_audit', toId: 'ev_audit',
  points: [[s3X + 160, s3Y + 154], [s3X + 160, s3Y + 180]],
  color: C.primaryStroke
});

addArrow({
  id: 'arr_ev_to_pr', fromId: 'ev_audit', toId: 'node_pr',
  points: [[s3X + 160, s3Y + 360], [s3X + 160, s3Y + 390]],
  color: C.primaryStroke
});

// ============================================================================
// SECTION 4: GOVERNANCE & CLOSE KNOWLEDGE LOOP
// ============================================================================
// Decision Diamond: Human Release Gate
addDiamond({
  id: 'dia_release', textId: 'txt_dia_release',
  x: s3X + 90, y: s3Y + 540, w: 180, h: 90,
  text: 'RELEASE GATE?\n(Human Codeowner Review)'
});

addArrow({
  id: 'arr_pr_to_gate', fromId: 'node_pr', toId: 'dia_release',
  points: [[s3X + 170, s3Y + 454], [s3X + 170, s3Y + 540]],
  color: C.primaryStroke
});

// Final Step: Complete & Close Loop
addEllipse({
  id: 'node_complete', textId: 'txt_complete',
  x: s3X + 60, y: s3Y + 680, w: 240, h: 70,
  text: '9-10. Deploy & Feedback\n(Close Knowledge Loop)',
  fill: C.endFill, stroke: C.endStroke, textColor: '#064e3b'
});

addArrow({
  id: 'arr_gate_to_complete', fromId: 'dia_release', toId: 'node_complete',
  points: [[s3X + 180, s3Y + 630], [s3X + 180, s3Y + 680]],
  color: C.endStroke, label: 'Human Approved'
});

// Loop 4: Knowledge feedback loop returning to Step 0 Context
addArrow({
  id: 'loop_knowledge', fromId: 'node_complete', toId: 'node_context',
  points: [
    [s3X + 180, s3Y + 750],
    [s3X + 180, s1Y + 790],
    [s1X + 40, s1Y + 790],
    [s1X + 40, s1Y + 212],
    [s1X + 30, s1Y + 212]
  ],
  color: '#0284c7', dashed: true, label: 'Update .aidlc/context/ with lessons'
});

// Review thread loop (CI fail / Changes requested by human)
addArrow({
  id: 'loop_review_fix', fromId: 'dia_release', toId: 'node_coder_green',
  points: [
    [s3X + 270, s3Y + 585],
    [s3X + 330, s3Y + 585],
    [s3X + 330, s1Y + 810],
    [s2X + 540, s1Y + 810],
    [s2X + 540, s2Y + 455]
  ],
  color: C.errorStroke, dashed: true, label: 'Reviewer Changes Requested ➔ Fix'
});

// ============================================================================
// BOTTOM ARCHITECTURAL INVARIANTS (The Visual Argument Summary)
// ============================================================================
const invX = 60, invY = 1010, invW = 1910, invH = 180;
addSectionBoundary({ id: 'sec_inv_bg', x: invX, y: invY, w: invW, h: invH, stroke: '#94a3b8' });

addText({
  id: 'inv_title',
  x: invX + 30, y: invY + 18,
  text: 'CORE ARCHITECTURAL INVARIANTS (Why AI-DLC Guarantees Zero Hallucinations & Zero Regressions)',
  size: 15, color: C.titleColor, w: 900, h: 22
});

const invariants = [
  {
    title: '1. Separation of Duties (RBAC)',
    desc: 'Architect explores read-only.\nQA only writes tests/**.\nCoder only writes allowedFiles.\nAuditor verifies with zero edits.'
  },
  {
    title: '2. Adversarial Red Baseline',
    desc: 'Never write logic before test.\nA test MUST fail validly (Exit!=0)\nbefore Coder is dispatched.\nPrevents tautological tests.'
  },
  {
    title: '3. Hard Scope Boundaries',
    desc: 'plan.json strictly caps maxFiles.\nExtra files = hard test failure.\nPrevents agent feature-creep\nand unauthorized refactoring.'
  },
  {
    title: '4. Sovereign Human Control',
    desc: 'AI publishes labeled COMMENT.\nAI never approves its own PR.\nMerge, deployment, and Jira\nrequire explicit human signoff.'
  }
];

invariants.forEach((inv, i) => {
  const cardX = invX + 30 + i * 465;
  const cardY = invY + 48;
  // Card
  elements.push({
    type: 'rectangle',
    id: `inv_card_${i}`,
    x: cardX, y: cardY, width: 440, height: 110,
    strokeColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    fillStyle: 'solid',
    strokeWidth: 1,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 100,
    angle: 0,
    seed: getSeed(),
    version: 1,
    versionNonce: getSeed(),
    isDeleted: false,
    groupIds: [],
    boundElements: null,
    link: null,
    locked: false,
    roundness: { type: 3 }
  });

  addText({
    id: `inv_card_t_${i}`,
    x: cardX + 15, y: cardY + 12,
    text: inv.title,
    size: 13, color: C.primaryStroke, bold: true, w: 410, h: 18
  });

  addText({
    id: `inv_card_d_${i}`,
    x: cardX + 15, y: cardY + 34,
    text: inv.desc,
    size: 12, color: C.bodyColor, w: 410, h: 65
  });
});

// Construct complete Excalidraw document
const excalidrawDoc = {
  type: 'excalidraw',
  version: 2,
  source: 'https://excalidraw.com',
  elements: elements,
  appState: {
    viewBackgroundColor: '#ffffff',
    gridSize: 20
  },
  files: {}
};

const outputPath = path.resolve(__dirname, '../aidlc-workflow.excalidraw');
fs.writeFileSync(outputPath, JSON.stringify(excalidrawDoc, null, 2), 'utf8');
console.log('Successfully generated Excalidraw diagram:');
console.log('Path:', outputPath);
console.log('Total Elements:', elements.length);
console.log('File Size:', fs.statSync(outputPath).size, 'bytes');
