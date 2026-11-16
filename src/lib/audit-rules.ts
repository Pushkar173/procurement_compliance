/**
 * Audit rule definitions for tender compliance checking.
 *
 * IMPORTANT: These are DEMO rules for an academic prototype. They are NOT
 * official legal requirements. Every rule clearly states its source type.
 * No legal citations, thresholds, or clause wording has been invented.
 */

/* ───────── Types ───────── */

export type RuleSourceType = "demo" | "reference";
export type RulePriority = "High" | "Medium" | "Low";

export interface RuleSource {
  /** Human-readable document name */
  name: string;
  /** Issuing authority or origin */
  authority: string;
  /** Whether this is a demo rule or references a real document */
  type: RuleSourceType;
  /** Version or date if known */
  version?: string;
  /** URL to the source document, if available */
  url?: string;
}

export interface AuditRule {
  /** Unique rule identifier */
  id: string;
  /** Short human-readable name */
  name: string;
  /** Category for grouping */
  category: string;
  /** Compliance Priority */
  priority: RulePriority;
  /** What this rule checks for (plain language) */
  description: string;
  /** Where this rule comes from */
  source: RuleSource;
  /**
   * Search terms used to detect this requirement in the tender text.
   * Each inner array is a phrase group — a match occurs when ALL terms
   * in at least one group are found (case-insensitive).
   *
   * Example: [["bid security", "earnest money"], ["emd", "bank guarantee"]]
   * means: (("bid security" AND "earnest money") OR ("emd" AND "bank guarantee"))
   */
  searchGroups: string[][];
  /**
   * Optional secondary terms — if the primary searchGroups match but these
   * don't, the result is "Needs Review" instead of "Found", since the
   * requirement may be mentioned but not fully addressed.
   */
  strengthenTerms?: string[];
  /** What "Found" means for this rule */
  foundExplanation: string;
  /** What "Missing" means for this rule */
  missingExplanation: string;
  /** What "Needs Review" means */
  needsReviewExplanation: string;
}

/* ───────── Demo Source ───────── */

const DEMO_SOURCE: RuleSource = {
  name: "ProcureComply Demo Rule Library",
  authority: "Academic Prototype",
  type: "demo",
  version: "v1.0 — November 2025",
};

const GFR_REFERENCE: RuleSource = {
  name: "General Financial Rules (GFR)",
  authority: "Department of Expenditure, Ministry of Finance, Government of India",
  type: "reference",
  version: "2017 (as referenced — verify current version)",
  url: "https://doe.gov.in/general-financial-rules",
};

const CVC_REFERENCE: RuleSource = {
  name: "CVC Guidelines on Procurement",
  authority: "Central Vigilance Commission, Government of India",
  type: "reference",
  version: "Various circulars (as referenced — verify current versions)",
  url: "https://cvc.gov.in",
};

/* ───────── Rule Definitions ───────── */

export const AUDIT_RULES: AuditRule[] = [
  /* ── 1. Budget & Financial ── */
  {
    id: "BUDGET_ALLOCATION",
    name: "Budget / Cost Estimate",
    category: "Financial",
    priority: "High",
    description:
      "Check whether the tender mentions a budget allocation, estimated cost, or financial provision for the procurement.",
    source: DEMO_SOURCE,
    searchGroups: [
      ["budget"],
      ["estimated cost"],
      ["estimated value"],
      ["financial provision"],
      ["cost estimate"],
      ["lakh"],
      ["crore"],
    ],
    strengthenTerms: ["payment", "schedule", "advance", "retention"],
    foundExplanation: "The tender document mentions a budget or cost estimate.",
    missingExplanation:
      "No budget or cost estimate was found. Tenders should disclose the estimated value for transparency.",
    needsReviewExplanation:
      "A cost reference was found but payment terms or schedule details may be incomplete.",
  },
  {
    id: "PAYMENT_TERMS",
    name: "Payment Terms & Schedule",
    category: "Financial",
    priority: "Medium",
    description:
      "Check whether the tender specifies payment terms, milestones, or a payment schedule.",
    source: DEMO_SOURCE,
    searchGroups: [
      ["payment", "schedule"],
      ["payment", "terms"],
      ["payment", "milestone"],
      ["running account", "bills"],
      ["advance", "payment"],
      ["retention money"],
    ],
    foundExplanation: "Payment terms or a payment schedule is described in the tender.",
    missingExplanation:
      "No clear payment terms were found. Bidders need to know when and how they will be paid.",
    needsReviewExplanation: "Payment is mentioned but the terms may not be fully detailed.",
  },

  /* ── 2. Eligibility ── */
  {
    id: "ELIGIBILITY_CRITERIA",
    name: "Bidder Eligibility Criteria",
    category: "Eligibility",
    priority: "High",
    description:
      "Check whether the tender defines who is eligible to bid, such as registration, experience, or turnover requirements.",
    source: GFR_REFERENCE,
    searchGroups: [
      ["eligibility"],
      ["eligible", "bidder"],
      ["qualification", "criteria"],
      ["registered", "company"],
      ["minimum", "experience"],
      ["annual turnover"],
    ],
    strengthenTerms: ["blacklisted", "gst", "pan", "registration"],
    foundExplanation: "Eligibility criteria for bidders are defined in the tender.",
    missingExplanation:
      "No eligibility criteria found. Clear criteria help ensure fair and transparent bidder selection.",
    needsReviewExplanation:
      "Some eligibility language was found but the criteria may not be comprehensive.",
  },

  /* ── 3. Bid Security ── */
  {
    id: "BID_SECURITY",
    name: "Bid Security / Earnest Money Deposit (EMD)",
    category: "Financial",
    priority: "High",
    description: "Check whether the tender requires a bid security or earnest money deposit.",
    source: GFR_REFERENCE,
    searchGroups: [
      ["bid security"],
      ["earnest money"],
      ["emd"],
      ["bank guarantee"],
      ["demand draft"],
    ],
    strengthenTerms: ["valid for", "days", "refund", "forfeit"],
    foundExplanation: "Bid security or EMD requirements are stated.",
    missingExplanation:
      "No bid security or EMD requirement found. This is typically required for tenders above a threshold value.",
    needsReviewExplanation:
      "Bid security is mentioned but the amount, validity, or terms may be unclear.",
  },

  /* ── 4. Technical Specifications ── */
  {
    id: "TECHNICAL_SPECS",
    name: "Technical Specifications",
    category: "Technical",
    priority: "High",
    description:
      "Check whether the tender provides technical specifications or standards for the goods, works, or services being procured.",
    source: DEMO_SOURCE,
    searchGroups: [
      ["technical specification"],
      ["specifications"],
      ["standards"],
      ["bis standard"],
      ["irc"],
      ["is:"],
      ["conform to"],
      ["quality", "standard"],
    ],
    foundExplanation: "Technical specifications or standards are referenced.",
    missingExplanation:
      "No technical specifications found. Bidders need clear specs to prepare responsive bids.",
    needsReviewExplanation:
      "Standards are mentioned but detailed specifications may be in an annexure or separate document.",
  },

  /* ── 5. Delivery / Timeline ── */
  {
    id: "DELIVERY_TIMELINE",
    name: "Delivery Timeline / Project Duration",
    category: "Timeline",
    priority: "High",
    description:
      "Check whether the tender specifies a delivery timeline, project duration, or completion period.",
    source: DEMO_SOURCE,
    searchGroups: [
      ["delivery", "days"],
      ["delivery", "timeline"],
      ["completion", "days"],
      ["project duration"],
      ["calendar days"],
      ["work order"],
      ["milestone"],
      ["phase"],
    ],
    strengthenTerms: ["staggered", "weekly", "progress"],
    foundExplanation: "A delivery timeline or project duration is specified.",
    missingExplanation:
      "No delivery timeline found. A clear timeline is essential for project planning and accountability.",
    needsReviewExplanation:
      "A timeline is mentioned but milestones or phasing may not be fully defined.",
  },

  /* ── 6. Evaluation Criteria ── */
  {
    id: "EVALUATION_CRITERIA",
    name: "Bid Evaluation Criteria",
    category: "Evaluation",
    priority: "Medium",
    description:
      "Check whether the tender describes how bids will be evaluated (technical scoring, financial comparison, QCBS, L1, etc.).",
    source: GFR_REFERENCE,
    searchGroups: [
      ["evaluation criteria"],
      ["evaluation", "method"],
      ["technical score"],
      ["financial score"],
      ["qcbs"],
      ["lowest", "price"],
      ["l1"],
      ["quality and cost"],
    ],
    foundExplanation: "Bid evaluation criteria or method is described.",
    missingExplanation:
      "No evaluation criteria found. Bidders should know how their bids will be assessed.",
    needsReviewExplanation:
      "Evaluation is mentioned but the scoring method or weightage may be unclear.",
  },

  /* ── 7. Penalty / Liquidated Damages ── */
  {
    id: "PENALTY_CLAUSE",
    name: "Penalty / Liquidated Damages Clause",
    category: "Contractual",
    priority: "High",
    description:
      "Check whether the tender includes penalties for delays or non-performance (liquidated damages).",
    source: DEMO_SOURCE,
    searchGroups: [
      ["penalty"],
      ["liquidated damages"],
      ["delay", "penalty"],
      ["delay beyond"],
      ["forfeited"],
      ["deduction", "delay"],
    ],
    strengthenTerms: ["per week", "per day", "maximum", "terminated"],
    foundExplanation: "A penalty or liquidated damages clause is present.",
    missingExplanation:
      "No penalty clause found. Without consequences for delays, schedule adherence may suffer.",
    needsReviewExplanation: "Penalty is mentioned but the rate or cap may not be clearly defined.",
  },

  /* ── 8. Dispute Resolution ── */
  {
    id: "DISPUTE_RESOLUTION",
    name: "Dispute Resolution Mechanism",
    category: "Contractual",
    priority: "Medium",
    description:
      "Check whether the tender describes how disputes will be resolved (arbitration, jurisdiction, escalation).",
    source: DEMO_SOURCE,
    searchGroups: [
      ["dispute", "resolution"],
      ["arbitration"],
      ["jurisdiction"],
      ["conciliation"],
      ["dispute", "referred"],
    ],
    strengthenTerms: ["arbitrator", "appointment", "act"],
    foundExplanation: "A dispute resolution mechanism is described.",
    missingExplanation:
      "No dispute resolution clause found. This is important for handling disagreements during contract execution.",
    needsReviewExplanation:
      "Dispute resolution is mentioned but the process (e.g., arbitrator appointment) may be vague.",
  },

  /* ── 9. Performance Guarantee ── */
  {
    id: "PERFORMANCE_GUARANTEE",
    name: "Performance Guarantee / Security",
    category: "Financial",
    priority: "High",
    description:
      "Check whether the tender requires a performance guarantee or security deposit after contract award.",
    source: GFR_REFERENCE,
    searchGroups: [
      ["performance guarantee"],
      ["performance security"],
      ["security deposit"],
      ["defect liability"],
      ["retention", "released"],
    ],
    foundExplanation: "A performance guarantee or security requirement is stated.",
    missingExplanation:
      "No performance guarantee found. This protects the procuring entity against non-performance.",
    needsReviewExplanation:
      "Performance security is mentioned but the amount or terms may need verification.",
  },

  /* ── 10. Environmental Compliance ── */
  {
    id: "ENVIRONMENTAL_COMPLIANCE",
    name: "Environmental / Green Procurement Clause",
    category: "Compliance",
    priority: "Medium",
    description:
      "Check whether the tender addresses environmental concerns such as green procurement, e-waste, energy efficiency, or environmental clearances.",
    source: DEMO_SOURCE,
    searchGroups: [
      ["environmental", "compliance"],
      ["environmental", "clearance"],
      ["green procurement"],
      ["e-waste", "disposal"],
      ["energy efficiency", "standard"],
      ["environmental impact", "assessment"],
      ["carbon", "emission"],
      ["eco-friendly", "material"],
    ],
    foundExplanation: "Environmental or green procurement considerations are addressed.",
    missingExplanation:
      "No environmental or green procurement clause found. Consider adding sustainability requirements.",
    needsReviewExplanation:
      "Environmental terms are mentioned but specific requirements may not be detailed.",
  },

  /* ── 11. Safety & Occupational Health ── */
  {
    id: "SAFETY_COMPLIANCE",
    name: "Safety & Occupational Health Requirements",
    category: "Compliance",
    priority: "High",
    description:
      "Check whether the tender addresses worker safety, PPE requirements, or occupational health standards.",
    source: DEMO_SOURCE,
    searchGroups: [
      ["safety", "measures"],
      ["safety", "compliance"],
      ["occupational health"],
      ["ppe", "requirement"],
      ["personal protective equipment"],
      ["safety regulations", "applicable"],
    ],
    foundExplanation: "Safety or occupational health requirements are mentioned.",
    missingExplanation:
      "No safety requirements found. Worker safety provisions are important, especially for works contracts.",
    needsReviewExplanation: "Safety is referenced but specific measures may not be detailed.",
  },

  /* ── 12. Insurance ── */
  {
    id: "INSURANCE_REQUIREMENTS",
    name: "Insurance Provisions",
    category: "Contractual",
    priority: "Medium",
    description:
      "Check whether the tender requires insurance coverage (transit, CAR, third-party liability, workmen's compensation).",
    source: DEMO_SOURCE,
    searchGroups: [
      ["insurance", "coverage"],
      ["insurance", "policy"],
      ["insurance", "required"],
      ["workmen compensation", "insurance"],
      ["third party liability", "insurance"],
      ["contractor all risk"],
      ["transit insurance", "required"],
    ],
    foundExplanation: "Insurance requirements are specified.",
    missingExplanation:
      "No insurance requirements found. Insurance protects against loss or damage during contract execution.",
    needsReviewExplanation: "Insurance is mentioned but the type or coverage level may be unclear.",
  },

  /* ── 13. Accessibility ── */
  {
    id: "ACCESSIBILITY",
    name: "Accessibility Requirements",
    category: "Compliance",
    priority: "Medium",
    description:
      "Check whether the tender addresses accessibility for persons with disabilities (equipment usability, physical access, assistive features).",
    source: DEMO_SOURCE,
    searchGroups: [
      ["accessibility", "requirement"],
      ["accessibility", "compliance"],
      ["persons with disabilities", "provision"],
      ["assistive", "technology"],
      ["screen reader", "support"],
      ["wheelchair", "accessible"],
      ["ramp", "accessible"],
      ["divyangjan", "provision"],
    ],
    foundExplanation: "Accessibility provisions for persons with disabilities are mentioned.",
    missingExplanation:
      "No accessibility requirements found. Consider inclusive procurement practices.",
    needsReviewExplanation:
      "Accessibility is mentioned but specific requirements may need verification.",
  },

  /* ── 14. Integrity / Anti-Corruption ── */
  {
    id: "INTEGRITY_PACT",
    name: "Integrity Pact / Anti-Corruption Clause",
    category: "Governance",
    priority: "Medium",
    description:
      "Check whether the tender includes an integrity pact, anti-corruption declaration, or ethical conduct requirements.",
    source: CVC_REFERENCE,
    searchGroups: [
      ["integrity pact", "signed"],
      ["integrity pact", "required"],
      ["anti-corruption", "declaration"],
      ["anti-bribery", "undertaking"],
      ["ethical conduct", "requirement"],
      ["code of conduct", "bidder"],
      ["corrupt practice", "disqualif"],
      ["vigilance", "clearance"],
    ],
    foundExplanation: "An integrity pact or anti-corruption clause is included.",
    missingExplanation:
      "No integrity pact or anti-corruption clause found. CVC guidelines recommend transparency measures for procurements above a threshold.",
    needsReviewExplanation:
      "Anti-corruption language exists but a formal integrity pact may not be included.",
  },

  /* ── 15. Grievance Redressal ── */
  {
    id: "GRIEVANCE_REDRESSAL",
    name: "Grievance Redressal Mechanism",
    category: "Governance",
    priority: "Low",
    description:
      "Check whether the tender provides a process for bidders to raise complaints or seek clarification after evaluation.",
    source: DEMO_SOURCE,
    searchGroups: [
      ["grievance", "mechanism"],
      ["grievance", "officer"],
      ["complaint", "mechanism"],
      ["complaint", "process"],
      ["redressal", "mechanism"],
      ["appeal", "process"],
      ["objection", "process", "days"],
    ],
    foundExplanation: "A grievance or complaint mechanism is described.",
    missingExplanation:
      "No grievance redressal mechanism found. Bidders should have a way to raise concerns about the process.",
    needsReviewExplanation: "A complaints process is referenced but may not be fully defined.",
  },

  /* ── 16. Subcontracting ── */
  {
    id: "SUBCONTRACTING",
    name: "Subcontracting Restrictions",
    category: "Contractual",
    priority: "Low",
    description:
      "Check whether the tender addresses subcontracting — whether it is allowed, restricted, or requires prior approval.",
    source: DEMO_SOURCE,
    searchGroups: [
      ["subcontract", "allowed"],
      ["subcontract", "prohibited"],
      ["subcontract", "approval"],
      ["sub-contract", "permitted"],
      ["sublet", "work"],
      ["assignment", "contract", "consent"],
    ],
    foundExplanation: "Subcontracting provisions or restrictions are stated.",
    missingExplanation:
      "No subcontracting clause found. It is good practice to state whether subcontracting is permitted.",
    needsReviewExplanation:
      "Subcontracting is mentioned but the approval process may not be clear.",
  },

  /* ── 17. Scope of Work ── */
  {
    id: "SCOPE_OF_WORK",
    name: "Scope of Work / Supply List",
    category: "Technical",
    priority: "High",
    description:
      "Check whether the tender clearly defines the scope of work, items to be supplied, or services to be rendered.",
    source: DEMO_SOURCE,
    searchGroups: [
      ["scope of work"],
      ["scope of supply"],
      ["shall supply"],
      ["items", "supply"],
      ["supply", "delivery"],
      ["selected vendor"],
      ["selected contractor"],
    ],
    foundExplanation: "The scope of work or supply requirements are defined.",
    missingExplanation:
      "No clear scope of work found. This is essential for bidders to prepare responsive bids.",
    needsReviewExplanation: "A scope is mentioned but may not be sufficiently detailed.",
  },

  /* ── 18. Warranty ── */
  {
    id: "WARRANTY_TERMS",
    name: "Warranty / Defect Liability Terms",
    category: "Contractual",
    priority: "Medium",
    description:
      "Check whether the tender specifies warranty period or defect liability period for the supplied goods or completed works.",
    source: DEMO_SOURCE,
    searchGroups: [
      ["warranty"],
      ["defect liability period"],
      ["guarantee period"],
      ["comprehensive", "warranty"],
    ],
    strengthenTerms: ["year", "month", "on-site", "replacement"],
    foundExplanation: "Warranty or defect liability terms are specified.",
    missingExplanation:
      "No warranty terms found. Warranty protection is important for goods and works contracts.",
    needsReviewExplanation:
      "Warranty is mentioned but the duration or coverage scope may be unclear.",
  },
];

/** Get a rule by ID */
export function getRuleById(id: string): AuditRule | undefined {
  return AUDIT_RULES.find((r) => r.id === id);
}

/** Get rules grouped by category */
export function getRulesByCategory(): Record<string, AuditRule[]> {
  const map: Record<string, AuditRule[]> = {};
  for (const rule of AUDIT_RULES) {
    (map[rule.category] ??= []).push(rule);
  }
  return map;
}
