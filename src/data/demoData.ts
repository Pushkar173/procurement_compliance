/**
 * ProcureComply — DEMO DATA
 *
 * All records below are fictional sample data created for an academic
 * prototype. Document titles, authorities, vendors, tenders, contracts and
 * reference numbers are illustrative only and are NOT actual government
 * documents, circulars or legal instruments.
 *
 * This module is the single seed source. A backend API can later replace it:
 * every consumer reads through the store in `src/store/app-store.tsx`.
 */

export type Role = "officer" | "admin" | "auditor";

export type ComplianceStatus =
  | "Compliant"
  | "Pending"
  | "Partially Compliant"
  | "Non-Compliant"
  | "Not Applicable";

export type DocumentType =
  | "Regulation"
  | "Policy"
  | "Guideline"
  | "Circular"
  | "Manual"
  | "Office Memorandum";

export type Authority =
  | "Government of India"
  | "Ministry of Finance"
  | "Ministry of Power"
  | "Central Vigilance Commission"
  | "Other Authorities";

export type TenderStatus =
  | "Draft"
  | "Under Review"
  | "Published"
  | "Evaluation"
  | "Awarded"
  | "Closed";

export type ContractStatus = "Active" | "Expiring Soon" | "Completed" | "Terminated";

export interface DocVersion {
  version: string;
  date: string;
  note: string;
  by: string;
}

export interface RegDocument {
  id: string;
  title: string;
  authority: Authority;
  type: DocumentType;
  category: string;
  year: number;
  issueDate: string;
  effectiveDate: string;
  version: string;
  status: "Active" | "Archived" | "Superseded" | "In Review";
  description: string;
  summary?: string;
  refNumber?: string;
  fileSize?: string;
  pages?: number;
  tags?: string[];
  mandatoryFor?: string[];
  relatedDocIds?: string[];
  applicability: string;
  stages: string[];
  requirements: string[];
  relatedTenders: string[];
  relatedContracts: string[];
  relatedDocs: string[];
  uploadedBy: string;
  uploadDate: string;
  history: DocVersion[];
}

export interface Tender {
  id: string;
  title: string;
  department: string;
  type: string;
  value: number;
  issueDate: string;
  closingDate: string;
  evaluationDate: string;
  status: TenderStatus;
  officer: string;
  description: string;
  regulationIds: string[];
  documents: { name: string; date: string; by: string }[];
  stage: string;
}

export interface Milestone {
  name: string;
  date: string;
  status: "Completed" | "In Progress" | "Pending";
}

export interface Contract {
  id: string;
  name: string;
  vendor: string;
  tenderId: string;
  value: number;
  startDate: string;
  endDate: string;
  renewalDate: string;
  status: ContractStatus;
  paymentStatus: "On Schedule" | "Partially Released" | "Pending" | "Closed";
  department: string;
  manager: string;
  vendorContact: { person: string; email: string; phone: string; address: string };
  milestones: Milestone[];
  documents: { name: string; date: string; by: string }[];
}

export interface ComplianceItem {
  id: string;
  requirement: string;
  sourceDocId: string;
  applicable: boolean;
  includedInTender: boolean;
  evidence: string;
  status: ComplianceStatus;
  remarks: string;
  responsible: string;
  dueDate: string;
  completionDate: string;
  tenderId?: string;
  contractId?: string;
  category: string;
}

export interface AuditEvent {
  id: string;
  user: string;
  role: Role;
  action: string;
  object: string;
  objectType: "Document" | "Tender" | "Contract" | "Compliance" | "Report" | "User" | "Session";
  date: string;
  time: string;
  previous?: string;
  next?: string;
}

export interface Notification {
  id: string;
  kind: "info" | "warning" | "success" | "document";
  title: string;
  body: string;
  date: string;
  read: boolean;
  link?: string;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  status: "Active" | "Disabled";
  lastLogin: string;
  designation: string;
}

export const ROLE_LABEL: Record<Role, string> = {
  officer: "Procurement Officer",
  admin: "Administrator",
  auditor: "Auditor / Vigilance Officer",
};

export const AUTHORITIES: Authority[] = [
  "Government of India",
  "Ministry of Finance",
  "Ministry of Power",
  "Central Vigilance Commission",
  "Other Authorities",
];

export const DOC_TYPES: DocumentType[] = [
  "Regulation",
  "Policy",
  "Guideline",
  "Circular",
  "Manual",
  "Office Memorandum",
];

export const CATEGORIES = [
  "Procurement",
  "Vigilance",
  "Contract",
  "Finance",
  "Quality",
  "Records",
  "Safety",
];

export const DEPARTMENTS = [
  "Information Technology",
  "Civil Works",
  "Power Distribution",
  "Finance & Accounts",
  "Stores & Purchase",
  "Health Services",
];

export const LIFECYCLE_STAGES = [
  "Planning",
  "Tender Preparation",
  "Tender Publication",
  "Evaluation",
  "Award",
  "Contract Creation",
  "Contract Execution",
  "Compliance Monitoring",
  "Contract Completion",
  "Reporting / Audit",
];

export const COMPLIANCE_STATUSES: ComplianceStatus[] = [
  "Compliant",
  "Pending",
  "Partially Compliant",
  "Non-Compliant",
  "Not Applicable",
];

export const users: AppUser[] = [
  {
    id: "USR-001",
    name: "Pushkar Bhati",
    email: "p.bhati@demo-procure.gov.in",
    role: "officer",
    department: "Information Technology",
    status: "Active",
    lastLogin: "28 Sep 2026, 17:42",
    designation: "Procurement Officer (Grade I)",
  },
  {
    id: "USR-002",
    name: "R. Nandakumar",
    email: "r.nandakumar@demo-procure.gov.in",
    role: "admin",
    department: "Stores & Purchase",
    status: "Active",
    lastLogin: "28 Sep 2026, 09:10",
    designation: "System Administrator",
  },
  {
    id: "USR-003",
    name: "S. Iyer",
    email: "s.iyer@demo-vigilance.gov.in",
    role: "auditor",
    department: "Finance & Accounts",
    status: "Active",
    lastLogin: "27 Sep 2026, 15:05",
    designation: "Vigilance Officer",
  },
  {
    id: "USR-004",
    name: "A. Deshmukh",
    email: "a.deshmukh@demo-procure.gov.in",
    role: "officer",
    department: "Civil Works",
    status: "Active",
    lastLogin: "26 Sep 2026, 11:20",
    designation: "Assistant Engineer (Procurement)",
  },
  {
    id: "USR-005",
    name: "M. Fernandes",
    email: "m.fernandes@demo-procure.gov.in",
    role: "officer",
    department: "Power Distribution",
    status: "Disabled",
    lastLogin: "02 Aug 2026, 10:00",
    designation: "Procurement Assistant",
  },
  {
    id: "USR-006",
    name: "K. Bhattacharya",
    email: "k.bhattacharya@demo-procure.gov.in",
    role: "auditor",
    department: "Health Services",
    status: "Active",
    lastLogin: "25 Sep 2026, 16:30",
    designation: "Internal Auditor",
  },
];

const v = (version: string, date: string, note: string, by = "R. Nandakumar"): DocVersion => ({
  version,
  date,
  note,
  by,
});

export const documents: RegDocument[] = [
  {
    id: "DOC-001",
    title: "General Procurement Guidelines (Demo)",
    authority: "Ministry of Finance",
    type: "Guideline",
    category: "Procurement",
    year: 2026,
    issueDate: "12 Jan 2026",
    effectiveDate: "01 Feb 2026",
    version: "2.0",
    status: "Active",
    description:
      "Consolidated demo guideline describing the end-to-end procurement process: requirement planning, estimate approval, bid publication periods, bid opening, evaluation committees and award records.",
    applicability: "All procurements above the prescribed demo threshold value.",
    stages: ["Planning", "Tender Preparation", "Tender Publication", "Evaluation", "Award"],
    requirements: [
      "Publish tender notice for the minimum prescribed period",
      "Record the basis of estimated value in the tender file",
      "Constitute a documented evaluation committee",
    ],
    relatedTenders: ["TDR-2026-014", "TDR-2026-011"],
    relatedContracts: ["CON-2026-008"],
    relatedDocs: ["DOC-002", "DOC-003", "DOC-007"],
    uploadedBy: "R. Nandakumar",
    uploadDate: "12 Jan 2026",
    history: [
      v("1.0", "04 Mar 2024", "Initial demo release"),
      v("1.1", "18 Sep 2025", "Clarification on evaluation records"),
      v("2.0", "12 Jan 2026", "Restructured chapters; current active version"),
    ],
  },
  {
    id: "DOC-002",
    title: "Procurement Integrity Guidelines (Demo)",
    authority: "Central Vigilance Commission",
    type: "Guideline",
    category: "Vigilance",
    year: 2026,
    issueDate: "05 Feb 2026",
    effectiveDate: "05 Feb 2026",
    version: "1.2",
    status: "Active",
    description:
      "Demo integrity guideline covering conflict-of-interest declarations, integrity undertakings in bid documents, complaint handling and retention of procurement records for audit.",
    applicability: "All tenders and contracts irrespective of value.",
    stages: ["Tender Preparation", "Evaluation", "Compliance Monitoring", "Reporting / Audit"],
    requirements: [
      "Include an integrity undertaking clause in the bid document",
      "Obtain conflict-of-interest declarations from committee members",
      "Maintain a retrievable record of complaints and their disposal",
    ],
    relatedTenders: ["TDR-2026-014", "TDR-2026-009", "TDR-2026-012"],
    relatedContracts: ["CON-2026-008", "CON-2026-003"],
    relatedDocs: ["DOC-001", "DOC-009"],
    uploadedBy: "R. Nandakumar",
    uploadDate: "05 Feb 2026",
    history: [
      v("1.0", "11 Nov 2024", "Initial demo release"),
      v("1.2", "05 Feb 2026", "Added record retention section"),
    ],
  },
  {
    id: "DOC-003",
    title: "Contract Management Manual (Demo)",
    authority: "Government of India",
    type: "Manual",
    category: "Contract",
    year: 2025,
    issueDate: "22 Jul 2025",
    effectiveDate: "01 Aug 2025",
    version: "3.1",
    status: "Active",
    description:
      "Demo manual for contract administration: milestone definition, performance security, variation orders, payment certification, renewal planning and contract closure records.",
    applicability: "All contracts executed after the effective date.",
    stages: ["Contract Creation", "Contract Execution", "Compliance Monitoring", "Contract Completion"],
    requirements: [
      "Define measurable milestones in the contract schedule",
      "Obtain and track performance security validity",
      "Record milestone verification before payment release",
    ],
    relatedTenders: ["TDR-2026-014"],
    relatedContracts: ["CON-2026-008", "CON-2026-005", "CON-2025-019"],
    relatedDocs: ["DOC-001", "DOC-006"],
    uploadedBy: "R. Nandakumar",
    uploadDate: "22 Jul 2025",
    history: [
      v("2.0", "15 Feb 2023", "Second demo edition"),
      v("3.0", "10 Jan 2025", "Chapters on renewals added"),
      v("3.1", "22 Jul 2025", "Payment certification annexure updated"),
    ],
  },
  {
    id: "DOC-004",
    title: "Procurement Circular on Bid Validity (Demo)",
    authority: "Ministry of Power",
    type: "Circular",
    category: "Procurement",
    year: 2026,
    issueDate: "18 Mar 2026",
    effectiveDate: "18 Mar 2026",
    version: "1.0",
    status: "Active",
    description:
      "Demo circular standardising bid validity periods and the procedure for seeking validity extension with recorded justification.",
    applicability: "Tenders published by power distribution formations.",
    stages: ["Tender Publication", "Evaluation"],
    requirements: [
      "State bid validity period explicitly in the notice",
      "Record written justification for any validity extension",
    ],
    relatedTenders: ["TDR-2026-012", "TDR-2026-016"],
    relatedContracts: ["CON-2026-011"],
    relatedDocs: ["DOC-001"],
    uploadedBy: "R. Nandakumar",
    uploadDate: "18 Mar 2026",
    history: [v("1.0", "18 Mar 2026", "Initial demo release")],
  },
  {
    id: "DOC-005",
    title: "Public Procurement Policy for Local Suppliers (Demo)",
    authority: "Ministry of Finance",
    type: "Policy",
    category: "Procurement",
    year: 2025,
    issueDate: "09 Apr 2025",
    effectiveDate: "01 May 2025",
    version: "1.4",
    status: "Active",
    description:
      "Demo policy describing preference categories for local suppliers, the self-certification format and verification of claims during evaluation.",
    applicability: "Goods and services tenders where local content claims are made.",
    stages: ["Tender Preparation", "Evaluation"],
    requirements: [
      "Include preference criteria in the tender conditions",
      "Verify supplier self-certification during evaluation",
    ],
    relatedTenders: ["TDR-2026-011", "TDR-2026-015"],
    relatedContracts: ["CON-2026-005"],
    relatedDocs: ["DOC-001"],
    uploadedBy: "R. Nandakumar",
    uploadDate: "09 Apr 2025",
    history: [
      v("1.0", "21 Jun 2023", "Initial demo release"),
      v("1.4", "09 Apr 2025", "Verification annexure revised"),
    ],
  },
  {
    id: "DOC-006",
    title: "Office Memorandum on Contract Renewal Timelines (Demo)",
    authority: "Government of India",
    type: "Office Memorandum",
    category: "Contract",
    year: 2026,
    issueDate: "02 Jun 2026",
    effectiveDate: "02 Jun 2026",
    version: "1.0",
    status: "Active",
    description:
      "Demo memorandum requiring renewal proposals to be initiated a defined number of days before contract expiry, with performance review on record.",
    applicability: "Service contracts eligible for renewal.",
    stages: ["Contract Execution", "Compliance Monitoring"],
    requirements: [
      "Initiate renewal proposal before the prescribed lead time",
      "Attach vendor performance review to the renewal note",
    ],
    relatedTenders: [],
    relatedContracts: ["CON-2026-008", "CON-2026-003", "CON-2026-011"],
    relatedDocs: ["DOC-003"],
    uploadedBy: "R. Nandakumar",
    uploadDate: "02 Jun 2026",
    history: [v("1.0", "02 Jun 2026", "Initial demo release")],
  },
  {
    id: "DOC-007",
    title: "E-Procurement Portal Operating Regulation (Demo)",
    authority: "Government of India",
    type: "Regulation",
    category: "Procurement",
    year: 2026,
    issueDate: "14 Jan 2026",
    effectiveDate: "01 Mar 2026",
    version: "2.2",
    status: "Active",
    description:
      "Demo regulation on electronic publication of tenders, digital signing of bid documents, electronic bid opening records and system audit logs.",
    applicability: "All tenders processed through the electronic portal.",
    stages: ["Tender Publication", "Evaluation", "Reporting / Audit"],
    requirements: [
      "Publish the tender on the electronic portal",
      "Retain system-generated bid opening record",
      "Preserve portal audit logs for the prescribed period",
    ],
    relatedTenders: ["TDR-2026-014", "TDR-2026-016", "TDR-2026-009"],
    relatedContracts: [],
    relatedDocs: ["DOC-001", "DOC-013"],
    uploadedBy: "R. Nandakumar",
    uploadDate: "14 Jan 2026",
    history: [
      v("2.0", "03 Mar 2025", "Digital signature chapter"),
      v("2.2", "14 Jan 2026", "Audit log retention clarified"),
    ],
  },
  {
    id: "DOC-008",
    title: "Quality Assurance and Inspection Manual (Demo)",
    authority: "Ministry of Power",
    type: "Manual",
    category: "Quality",
    year: 2025,
    issueDate: "27 Oct 2025",
    effectiveDate: "27 Oct 2025",
    version: "1.1",
    status: "Active",
    description:
      "Demo manual describing inspection stages, sampling plans, third-party inspection reports and rejection handling for supplied materials.",
    applicability: "Supply contracts for equipment and materials.",
    stages: ["Contract Execution", "Compliance Monitoring"],
    requirements: [
      "Record stage-wise inspection reports",
      "Obtain third-party inspection certificate where prescribed",
    ],
    relatedTenders: ["TDR-2026-012"],
    relatedContracts: ["CON-2026-011", "CON-2025-019"],
    relatedDocs: ["DOC-003"],
    uploadedBy: "R. Nandakumar",
    uploadDate: "27 Oct 2025",
    history: [v("1.1", "27 Oct 2025", "Sampling annexure updated")],
  },
  {
    id: "DOC-009",
    title: "Vigilance Circular on Complaint Handling (Demo)",
    authority: "Central Vigilance Commission",
    type: "Circular",
    category: "Vigilance",
    year: 2025,
    issueDate: "16 Dec 2025",
    effectiveDate: "16 Dec 2025",
    version: "1.0",
    status: "Active",
    description:
      "Demo circular on registering procurement-related complaints, timelines for preliminary examination and reporting of disposal.",
    applicability: "All procurement formations.",
    stages: ["Compliance Monitoring", "Reporting / Audit"],
    requirements: [
      "Maintain a complaint register with disposal status",
      "Report quarterly complaint statistics",
    ],
    relatedTenders: ["TDR-2026-009"],
    relatedContracts: [],
    relatedDocs: ["DOC-002"],
    uploadedBy: "R. Nandakumar",
    uploadDate: "16 Dec 2025",
    history: [v("1.0", "16 Dec 2025", "Initial demo release")],
  },
  {
    id: "DOC-010",
    title: "Records Retention and Retrieval Policy (Demo)",
    authority: "Government of India",
    type: "Policy",
    category: "Records",
    year: 2026,
    issueDate: "03 Feb 2026",
    effectiveDate: "03 Feb 2026",
    version: "1.3",
    status: "Active",
    description:
      "Demo policy on classification, retention period, indexing and retrieval of procurement records so that records remain authentic and traceable.",
    applicability: "All procurement and contract records.",
    stages: ["Reporting / Audit", "Contract Completion"],
    requirements: [
      "Index every tender file with a unique reference",
      "Link compliance evidence to the corresponding requirement",
      "Retain records for the prescribed retention period",
    ],
    relatedTenders: ["TDR-2026-014", "TDR-2026-011"],
    relatedContracts: ["CON-2026-008"],
    relatedDocs: ["DOC-007"],
    uploadedBy: "R. Nandakumar",
    uploadDate: "03 Feb 2026",
    history: [
      v("1.0", "09 Jan 2024", "Initial demo release"),
      v("1.3", "03 Feb 2026", "Indexing requirements expanded"),
    ],
  },
  {
    id: "DOC-011",
    title: "Financial Powers and Sanction Regulation (Demo)",
    authority: "Ministry of Finance",
    type: "Regulation",
    category: "Finance",
    year: 2024,
    issueDate: "30 May 2024",
    effectiveDate: "01 Jul 2024",
    version: "4.0",
    status: "Active",
    description:
      "Demo regulation listing delegated financial powers for administrative approval, expenditure sanction and variation approval limits.",
    applicability: "All expenditure proposals.",
    stages: ["Planning", "Award", "Contract Execution"],
    requirements: [
      "Obtain administrative approval from the competent authority",
      "Record expenditure sanction reference in the tender file",
    ],
    relatedTenders: ["TDR-2026-014", "TDR-2026-015"],
    relatedContracts: ["CON-2026-005"],
    relatedDocs: ["DOC-001"],
    uploadedBy: "R. Nandakumar",
    uploadDate: "30 May 2024",
    history: [v("4.0", "30 May 2024", "Fourth demo edition")],
  },
  {
    id: "DOC-012",
    title: "Safety Compliance Guideline for Works Contracts (Demo)",
    authority: "Other Authorities",
    type: "Guideline",
    category: "Safety",
    year: 2025,
    issueDate: "08 Aug 2025",
    effectiveDate: "08 Aug 2025",
    version: "1.0",
    status: "Active",
    description:
      "Demo guideline on site safety plans, safety officer deployment and monthly safety reporting for works contracts.",
    applicability: "Civil and electrical works contracts.",
    stages: ["Contract Execution", "Compliance Monitoring"],
    requirements: [
      "Obtain an approved site safety plan before work start",
      "Submit monthly safety compliance report",
    ],
    relatedTenders: ["TDR-2026-010"],
    relatedContracts: ["CON-2026-003"],
    relatedDocs: [],
    uploadedBy: "R. Nandakumar",
    uploadDate: "08 Aug 2025",
    history: [v("1.0", "08 Aug 2025", "Initial demo release")],
  },
  {
    id: "DOC-013",
    title: "Office Memorandum on Bid Security Declarations (Demo)",
    authority: "Ministry of Finance",
    type: "Office Memorandum",
    category: "Finance",
    year: 2026,
    issueDate: "21 Apr 2026",
    effectiveDate: "21 Apr 2026",
    version: "1.1",
    status: "Active",
    description:
      "Demo memorandum permitting bid security declarations in place of monetary bid security for specified categories, with the declaration format annexed.",
    applicability: "Tenders in specified categories.",
    stages: ["Tender Preparation", "Tender Publication"],
    requirements: [
      "Use the prescribed bid security declaration format",
      "Record the category justification in the tender file",
    ],
    relatedTenders: ["TDR-2026-016", "TDR-2026-015"],
    relatedContracts: [],
    relatedDocs: ["DOC-007"],
    uploadedBy: "R. Nandakumar",
    uploadDate: "21 Apr 2026",
    history: [
      v("1.0", "14 Feb 2026", "Initial demo release"),
      v("1.1", "21 Apr 2026", "Format annexure corrected"),
    ],
  },
  {
    id: "DOC-014",
    title: "Vendor Performance Evaluation Guideline (Demo)",
    authority: "Government of India",
    type: "Guideline",
    category: "Contract",
    year: 2026,
    issueDate: "11 May 2026",
    effectiveDate: "11 May 2026",
    version: "1.0",
    status: "Active",
    description:
      "Demo guideline with a scoring framework for vendor performance covering timeliness, quality, documentation and responsiveness.",
    applicability: "Contracts exceeding six months in duration.",
    stages: ["Contract Execution", "Compliance Monitoring", "Contract Completion"],
    requirements: [
      "Record half-yearly vendor performance score",
      "Communicate adverse performance observations in writing",
    ],
    relatedTenders: [],
    relatedContracts: ["CON-2026-008", "CON-2026-011", "CON-2025-019"],
    relatedDocs: ["DOC-003", "DOC-006"],
    uploadedBy: "R. Nandakumar",
    uploadDate: "11 May 2026",
    history: [v("1.0", "11 May 2026", "Initial demo release")],
  },
  {
    id: "DOC-015",
    title: "Procurement Planning Circular (Demo)",
    authority: "Ministry of Finance",
    type: "Circular",
    category: "Procurement",
    year: 2026,
    issueDate: "07 Jul 2026",
    effectiveDate: "07 Jul 2026",
    version: "1.0",
    status: "Active",
    description:
      "Demo circular requiring an annual procurement plan with indicative timelines, consolidated demand and quarterly review of plan adherence.",
    applicability: "All departments preparing annual procurement plans.",
    stages: ["Planning"],
    requirements: [
      "Publish the annual procurement plan internally",
      "Review plan adherence every quarter",
    ],
    relatedTenders: ["TDR-2026-015", "TDR-2026-016"],
    relatedContracts: [],
    relatedDocs: ["DOC-001"],
    uploadedBy: "R. Nandakumar",
    uploadDate: "07 Jul 2026",
    history: [v("1.0", "07 Jul 2026", "Initial demo release")],
  },
  {
    id: "DOC-016",
    title: "Legacy Procurement Guidelines (Demo, Superseded)",
    authority: "Ministry of Finance",
    type: "Guideline",
    category: "Procurement",
    year: 2022,
    issueDate: "19 Sep 2022",
    effectiveDate: "19 Sep 2022",
    version: "1.0",
    status: "Superseded",
    description:
      "Earlier demo guideline retained for historical reference. Superseded by DOC-001 version 2.0; retained so that older tender files remain traceable.",
    applicability: "Tenders published before 01 Feb 2026 only.",
    stages: ["Tender Preparation", "Tender Publication"],
    requirements: ["Historical reference only — not applicable to new tenders"],
    relatedTenders: [],
    relatedContracts: ["CON-2025-019"],
    relatedDocs: ["DOC-001"],
    uploadedBy: "R. Nandakumar",
    uploadDate: "19 Sep 2022",
    history: [
      v("1.0", "19 Sep 2022", "Initial demo release"),
      v("1.0", "12 Jan 2026", "Marked superseded by DOC-001 v2.0"),
    ],
  },
  {
    id: "DOC-017",
    title: "Archived Stores Handling Manual (Demo, Archived)",
    authority: "Other Authorities",
    type: "Manual",
    category: "Records",
    year: 2021,
    issueDate: "05 Mar 2021",
    effectiveDate: "05 Mar 2021",
    version: "1.0",
    status: "Archived",
    description:
      "Archived demo manual on stores receipt, inspection registers and issue notes. Kept for record traceability only.",
    applicability: "Not applicable to current procurements.",
    stages: ["Contract Execution"],
    requirements: ["Historical reference only"],
    relatedTenders: [],
    relatedContracts: [],
    relatedDocs: [],
    uploadedBy: "R. Nandakumar",
    uploadDate: "05 Mar 2021",
    history: [v("1.0", "05 Mar 2021", "Initial demo release")],
  },
];

export const tenders: Tender[] = [
  {
    id: "TDR-2026-014",
    title: "IT Infrastructure Procurement",
    department: "Information Technology",
    type: "Open Tender (Goods)",
    value: 25000000,
    issueDate: "08 Sep 2026",
    closingDate: "02 Oct 2026",
    evaluationDate: "07 Oct 2026",
    status: "Under Review",
    officer: "Pushkar Bhati",
    description:
      "Supply, installation and commissioning of demo server, storage and networking infrastructure for the departmental data centre, including three years of onsite support.",
    regulationIds: ["DOC-001", "DOC-002", "DOC-003", "DOC-007", "DOC-010", "DOC-011"],
    documents: [
      { name: "Tender Notice.pdf", date: "08 Sep 2026", by: "Pushkar Bhati" },
      { name: "Technical Specifications.pdf", date: "08 Sep 2026", by: "Pushkar Bhati" },
      { name: "Bid Opening Record.pdf", date: "22 Sep 2026", by: "Pushkar Bhati" },
    ],
    stage: "Evaluation",
  },
  {
    id: "TDR-2026-016",
    title: "Distribution Transformer Supply",
    department: "Power Distribution",
    type: "Open Tender (Goods)",
    value: 41500000,
    issueDate: "15 Sep 2026",
    closingDate: "10 Oct 2026",
    evaluationDate: "16 Oct 2026",
    status: "Published",
    officer: "M. Fernandes",
    description:
      "Demo tender for supply of distribution transformers with stage inspection and performance guarantee requirements.",
    regulationIds: ["DOC-001", "DOC-004", "DOC-007", "DOC-013", "DOC-015"],
    documents: [{ name: "Tender Notice.pdf", date: "15 Sep 2026", by: "M. Fernandes" }],
    stage: "Tender Publication",
  },
  {
    id: "TDR-2026-015",
    title: "Hospital Consumables Annual Rate Contract",
    department: "Health Services",
    type: "Rate Contract",
    value: 8600000,
    issueDate: "01 Sep 2026",
    closingDate: "26 Sep 2026",
    evaluationDate: "30 Sep 2026",
    status: "Evaluation",
    officer: "A. Deshmukh",
    description:
      "Demo annual rate contract tender for medical consumables with quarterly call-off quantities.",
    regulationIds: ["DOC-001", "DOC-005", "DOC-011", "DOC-013", "DOC-015"],
    documents: [
      { name: "Tender Notice.pdf", date: "01 Sep 2026", by: "A. Deshmukh" },
      { name: "Price Bid Format.xlsx", date: "01 Sep 2026", by: "A. Deshmukh" },
    ],
    stage: "Evaluation",
  },
  {
    id: "TDR-2026-012",
    title: "Substation Civil Works Package",
    department: "Civil Works",
    type: "Open Tender (Works)",
    value: 63200000,
    issueDate: "20 Aug 2026",
    closingDate: "18 Sep 2026",
    evaluationDate: "24 Sep 2026",
    status: "Awarded",
    officer: "A. Deshmukh",
    description:
      "Demo works tender for substation civil construction including boundary works and drainage.",
    regulationIds: ["DOC-001", "DOC-002", "DOC-004", "DOC-008", "DOC-012"],
    documents: [
      { name: "Tender Notice.pdf", date: "20 Aug 2026", by: "A. Deshmukh" },
      { name: "Award Letter.pdf", date: "26 Sep 2026", by: "A. Deshmukh" },
    ],
    stage: "Award",
  },
  {
    id: "TDR-2026-011",
    title: "Departmental Vehicle Hiring Services",
    department: "Stores & Purchase",
    type: "Limited Tender (Services)",
    value: 4200000,
    issueDate: "05 Aug 2026",
    closingDate: "28 Aug 2026",
    evaluationDate: "02 Sep 2026",
    status: "Closed",
    officer: "Pushkar Bhati",
    description: "Demo tender for hiring of departmental vehicles on a monthly basis.",
    regulationIds: ["DOC-001", "DOC-005", "DOC-010"],
    documents: [{ name: "Tender Notice.pdf", date: "05 Aug 2026", by: "Pushkar Bhati" }],
    stage: "Contract Creation",
  },
  {
    id: "TDR-2026-010",
    title: "Office Building Electrical Renovation",
    department: "Civil Works",
    type: "Open Tender (Works)",
    value: 15800000,
    issueDate: "24 Jul 2026",
    closingDate: "20 Aug 2026",
    evaluationDate: "27 Aug 2026",
    status: "Awarded",
    officer: "A. Deshmukh",
    description: "Demo renovation tender for internal electrical distribution and lighting.",
    regulationIds: ["DOC-001", "DOC-011", "DOC-012"],
    documents: [{ name: "Tender Notice.pdf", date: "24 Jul 2026", by: "A. Deshmukh" }],
    stage: "Contract Execution",
  },
  {
    id: "TDR-2026-009",
    title: "Cyber Security Audit Services",
    department: "Information Technology",
    type: "Quality & Cost Based Selection",
    value: 6900000,
    issueDate: "10 Sep 2026",
    closingDate: "08 Oct 2026",
    evaluationDate: "14 Oct 2026",
    status: "Under Review",
    officer: "Pushkar Bhati",
    description:
      "Demo consultancy tender for an independent security audit of departmental applications.",
    regulationIds: ["DOC-001", "DOC-002", "DOC-007", "DOC-009"],
    documents: [{ name: "Request for Proposal.pdf", date: "10 Sep 2026", by: "Pushkar Bhati" }],
    stage: "Tender Preparation",
  },
  {
    id: "TDR-2026-018",
    title: "Solar Rooftop Installation (Draft)",
    department: "Power Distribution",
    type: "Open Tender (Works)",
    value: 32000000,
    issueDate: "—",
    closingDate: "—",
    evaluationDate: "—",
    status: "Draft",
    officer: "Pushkar Bhati",
    description:
      "Demo draft tender under preparation for rooftop solar installation across departmental buildings.",
    regulationIds: ["DOC-001", "DOC-015"],
    documents: [],
    stage: "Planning",
  },
];

export const contracts: Contract[] = [
  {
    id: "CON-2026-008",
    name: "IT Infrastructure Maintenance",
    vendor: "ABC Technologies Pvt. Ltd. (Demo)",
    tenderId: "TDR-2026-014",
    value: 18000000,
    startDate: "01 Nov 2025",
    endDate: "26 Oct 2026",
    renewalDate: "26 Sep 2026",
    status: "Expiring Soon",
    paymentStatus: "Partially Released",
    department: "Information Technology",
    manager: "Pushkar Bhati",
    vendorContact: {
      person: "S. Raghavan",
      email: "contracts@abc-demo.example",
      phone: "+91 99000 11223",
      address: "Plot 14, Demo Technology Park, Pune",
    },
    milestones: [
      { name: "Contract Created", date: "20 Oct 2025", status: "Completed" },
      { name: "Agreement Signed", date: "28 Oct 2025", status: "Completed" },
      { name: "Work Started", date: "01 Nov 2025", status: "Completed" },
      { name: "Milestone 1 — Quarterly Preventive Maintenance", date: "31 Jan 2026", status: "Completed" },
      { name: "Milestone 2 — Half-Yearly System Audit", date: "30 Apr 2026", status: "Completed" },
      { name: "Milestone 3 — Annual Performance Review", date: "30 Sep 2026", status: "In Progress" },
      { name: "Renewal / Completion", date: "26 Oct 2026", status: "Pending" },
    ],
    documents: [
      { name: "Signed Agreement.pdf", date: "28 Oct 2025", by: "Pushkar Bhati" },
      { name: "Performance Security.pdf", date: "28 Oct 2025", by: "Pushkar Bhati" },
      { name: "Milestone 2 Verification.pdf", date: "05 May 2026", by: "Pushkar Bhati" },
    ],
  },
  {
    id: "CON-2026-011",
    name: "Distribution Transformer Supply & Commissioning",
    vendor: "Meridian Electricals (Demo)",
    tenderId: "TDR-2026-016",
    value: 39500000,
    startDate: "15 Mar 2026",
    endDate: "14 Mar 2027",
    renewalDate: "—",
    status: "Active",
    paymentStatus: "On Schedule",
    department: "Power Distribution",
    manager: "M. Fernandes",
    vendorContact: {
      person: "D. Kulkarni",
      email: "orders@meridian-demo.example",
      phone: "+91 98220 44551",
      address: "Industrial Estate Road, Demo Nagar, Nashik",
    },
    milestones: [
      { name: "Contract Created", date: "05 Mar 2026", status: "Completed" },
      { name: "Agreement Signed", date: "12 Mar 2026", status: "Completed" },
      { name: "Work Started", date: "15 Mar 2026", status: "Completed" },
      { name: "Milestone 1 — First Lot Inspection", date: "20 Jun 2026", status: "Completed" },
      { name: "Milestone 2 — Second Lot Delivery", date: "15 Oct 2026", status: "In Progress" },
      { name: "Renewal / Completion", date: "14 Mar 2027", status: "Pending" },
    ],
    documents: [
      { name: "Signed Agreement.pdf", date: "12 Mar 2026", by: "M. Fernandes" },
      { name: "Lot 1 Inspection Report.pdf", date: "22 Jun 2026", by: "M. Fernandes" },
    ],
  },
  {
    id: "CON-2026-005",
    name: "Hospital Consumables Rate Contract",
    vendor: "Nivara Medical Supplies (Demo)",
    tenderId: "TDR-2026-015",
    value: 8200000,
    startDate: "01 Feb 2026",
    endDate: "31 Jan 2027",
    renewalDate: "01 Jan 2027",
    status: "Active",
    paymentStatus: "On Schedule",
    department: "Health Services",
    manager: "A. Deshmukh",
    vendorContact: {
      person: "P. Menon",
      email: "sales@nivara-demo.example",
      phone: "+91 97400 88112",
      address: "Unit 7, Demo Medical Complex, Kochi",
    },
    milestones: [
      { name: "Contract Created", date: "22 Jan 2026", status: "Completed" },
      { name: "Agreement Signed", date: "29 Jan 2026", status: "Completed" },
      { name: "Work Started", date: "01 Feb 2026", status: "Completed" },
      { name: "Milestone 1 — Q1 Call-off Supply", date: "30 Apr 2026", status: "Completed" },
      { name: "Milestone 2 — Q2 Call-off Supply", date: "31 Jul 2026", status: "Completed" },
      { name: "Renewal / Completion", date: "31 Jan 2027", status: "Pending" },
    ],
    documents: [{ name: "Signed Agreement.pdf", date: "29 Jan 2026", by: "A. Deshmukh" }],
  },
  {
    id: "CON-2026-003",
    name: "Office Electrical Renovation Works",
    vendor: "Sahyadri Constructions (Demo)",
    tenderId: "TDR-2026-010",
    value: 15200000,
    startDate: "10 Sep 2026",
    endDate: "09 Jun 2027",
    renewalDate: "—",
    status: "Active",
    paymentStatus: "Pending",
    department: "Civil Works",
    manager: "A. Deshmukh",
    vendorContact: {
      person: "V. Pawar",
      email: "projects@sahyadri-demo.example",
      phone: "+91 90280 33447",
      address: "Survey No. 22, Demo Works Road, Nagpur",
    },
    milestones: [
      { name: "Contract Created", date: "01 Sep 2026", status: "Completed" },
      { name: "Agreement Signed", date: "08 Sep 2026", status: "Completed" },
      { name: "Work Started", date: "10 Sep 2026", status: "In Progress" },
      { name: "Milestone 1 — Wiring Phase", date: "30 Nov 2026", status: "Pending" },
      { name: "Milestone 2 — Lighting Phase", date: "28 Feb 2027", status: "Pending" },
      { name: "Renewal / Completion", date: "09 Jun 2027", status: "Pending" },
    ],
    documents: [{ name: "Signed Agreement.pdf", date: "08 Sep 2026", by: "A. Deshmukh" }],
  },
  {
    id: "CON-2026-014",
    name: "Departmental Vehicle Hiring",
    vendor: "Trinetra Fleet Services (Demo)",
    tenderId: "TDR-2026-011",
    value: 4100000,
    startDate: "01 Oct 2026",
    endDate: "30 Sep 2027",
    renewalDate: "31 Aug 2027",
    status: "Active",
    paymentStatus: "On Schedule",
    department: "Stores & Purchase",
    manager: "Pushkar Bhati",
    vendorContact: {
      person: "H. Shetty",
      email: "ops@trinetra-demo.example",
      phone: "+91 96430 55668",
      address: "Depot Lane, Demo Transport Hub, Mumbai",
    },
    milestones: [
      { name: "Contract Created", date: "18 Sep 2026", status: "Completed" },
      { name: "Agreement Signed", date: "25 Sep 2026", status: "Completed" },
      { name: "Work Started", date: "01 Oct 2026", status: "Pending" },
      { name: "Milestone 1 — Fleet Verification", date: "31 Dec 2026", status: "Pending" },
      { name: "Renewal / Completion", date: "30 Sep 2027", status: "Pending" },
    ],
    documents: [{ name: "Signed Agreement.pdf", date: "25 Sep 2026", by: "Pushkar Bhati" }],
  },
  {
    id: "CON-2026-019",
    name: "Security Audit Services (Phase I)",
    vendor: "Kavach Assurance LLP (Demo)",
    tenderId: "TDR-2026-009",
    value: 3400000,
    startDate: "01 May 2026",
    endDate: "20 Oct 2026",
    renewalDate: "—",
    status: "Expiring Soon",
    paymentStatus: "Partially Released",
    department: "Information Technology",
    manager: "Pushkar Bhati",
    vendorContact: {
      person: "N. Qureshi",
      email: "engage@kavach-demo.example",
      phone: "+91 99870 22114",
      address: "Level 3, Demo Cyber Tower, Hyderabad",
    },
    milestones: [
      { name: "Contract Created", date: "22 Apr 2026", status: "Completed" },
      { name: "Agreement Signed", date: "28 Apr 2026", status: "Completed" },
      { name: "Work Started", date: "01 May 2026", status: "Completed" },
      { name: "Milestone 1 — Interim Audit Report", date: "31 Jul 2026", status: "Completed" },
      { name: "Milestone 2 — Final Audit Report", date: "10 Oct 2026", status: "In Progress" },
      { name: "Renewal / Completion", date: "20 Oct 2026", status: "Pending" },
    ],
    documents: [{ name: "Interim Audit Report.pdf", date: "02 Aug 2026", by: "Pushkar Bhati" }],
  },
  {
    id: "CON-2025-019",
    name: "Legacy Network Equipment Supply",
    vendor: "Orion Systems (Demo)",
    tenderId: "TDR-2026-011",
    value: 7600000,
    startDate: "01 Jun 2025",
    endDate: "31 May 2026",
    renewalDate: "—",
    status: "Completed",
    paymentStatus: "Closed",
    department: "Information Technology",
    manager: "Pushkar Bhati",
    vendorContact: {
      person: "T. Bose",
      email: "support@orion-demo.example",
      phone: "+91 98310 77665",
      address: "Block C, Demo Business Park, Kolkata",
    },
    milestones: [
      { name: "Contract Created", date: "20 May 2025", status: "Completed" },
      { name: "Agreement Signed", date: "27 May 2025", status: "Completed" },
      { name: "Work Started", date: "01 Jun 2025", status: "Completed" },
      { name: "Milestone 1 — Delivery", date: "30 Sep 2025", status: "Completed" },
      { name: "Milestone 2 — Commissioning", date: "28 Feb 2026", status: "Completed" },
      { name: "Renewal / Completion", date: "31 May 2026", status: "Completed" },
    ],
    documents: [{ name: "Completion Certificate.pdf", date: "05 Jun 2026", by: "Pushkar Bhati" }],
  },
  {
    id: "CON-2025-007",
    name: "Terminated Housekeeping Services",
    vendor: "Vistaar Facility Services (Demo)",
    tenderId: "TDR-2026-011",
    value: 2900000,
    startDate: "01 Apr 2025",
    endDate: "31 Mar 2026",
    renewalDate: "—",
    status: "Terminated",
    paymentStatus: "Closed",
    department: "Stores & Purchase",
    manager: "A. Deshmukh",
    vendorContact: {
      person: "L. Dsouza",
      email: "admin@vistaar-demo.example",
      phone: "+91 95550 66778",
      address: "Shop 4, Demo Service Lane, Panaji",
    },
    milestones: [
      { name: "Contract Created", date: "20 Mar 2025", status: "Completed" },
      { name: "Agreement Signed", date: "27 Mar 2025", status: "Completed" },
      { name: "Work Started", date: "01 Apr 2025", status: "Completed" },
      { name: "Milestone 1 — Half-Yearly Review", date: "30 Sep 2025", status: "Completed" },
      { name: "Termination on Performance Grounds", date: "14 Jan 2026", status: "Completed" },
    ],
    documents: [{ name: "Termination Notice.pdf", date: "14 Jan 2026", by: "A. Deshmukh" }],
  },
];

const ci = (
  id: string,
  requirement: string,
  sourceDocId: string,
  status: ComplianceStatus,
  opts: Partial<ComplianceItem> = {},
): ComplianceItem => ({
  id,
  requirement,
  sourceDocId,
  applicable: status !== "Not Applicable",
  includedInTender: status === "Compliant" || status === "Partially Compliant",
  evidence: status === "Compliant" ? "Evidence_" + id + ".pdf" : "",
  status,
  remarks: "",
  responsible: "Pushkar Bhati",
  dueDate: "02 Oct 2026",
  completionDate: status === "Compliant" ? "22 Sep 2026" : "",
  category: "Procurement",
  ...opts,
});

export const complianceItems: ComplianceItem[] = [
  ci("CR-001", "Publish tender notice for the minimum prescribed period", "DOC-001", "Compliant", {
    tenderId: "TDR-2026-014",
    remarks: "Notice published on the portal on 08 Sep 2026.",
  }),
  ci("CR-002", "Record the basis of estimated value in the tender file", "DOC-001", "Compliant", {
    tenderId: "TDR-2026-014",
    remarks: "Estimate note approved by competent authority.",
  }),
  ci("CR-003", "Constitute a documented evaluation committee", "DOC-001", "Compliant", {
    tenderId: "TDR-2026-014",
  }),
  ci("CR-004", "Include an integrity undertaking clause in the bid document", "DOC-002", "Compliant", {
    tenderId: "TDR-2026-014",
    category: "Vigilance",
  }),
  ci("CR-005", "Obtain conflict-of-interest declarations from committee members", "DOC-002", "Pending", {
    tenderId: "TDR-2026-014",
    category: "Vigilance",
    remarks: "Two declarations awaited from technical members.",
    dueDate: "02 Oct 2026",
  }),
  ci("CR-006", "Maintain a retrievable record of complaints and their disposal", "DOC-002", "Compliant", {
    tenderId: "TDR-2026-014",
    category: "Vigilance",
  }),
  ci("CR-007", "Publish the tender on the electronic portal", "DOC-007", "Compliant", {
    tenderId: "TDR-2026-014",
  }),
  ci("CR-008", "Retain system-generated bid opening record", "DOC-007", "Compliant", {
    tenderId: "TDR-2026-014",
    evidence: "Bid_Opening_Record.pdf",
  }),
  ci("CR-009", "Preserve portal audit logs for the prescribed period", "DOC-007", "Partially Compliant", {
    tenderId: "TDR-2026-014",
    remarks: "Logs available from Mar 2026 onward; earlier export in progress.",
    category: "Records",
  }),
  ci("CR-010", "Index the tender file with a unique reference", "DOC-010", "Compliant", {
    tenderId: "TDR-2026-014",
    category: "Records",
  }),
  ci("CR-011", "Link compliance evidence to the corresponding requirement", "DOC-010", "Compliant", {
    tenderId: "TDR-2026-014",
    category: "Records",
  }),
  ci("CR-012", "Obtain administrative approval from the competent authority", "DOC-011", "Compliant", {
    tenderId: "TDR-2026-014",
    category: "Finance",
  }),
  ci("CR-013", "Record expenditure sanction reference in the tender file", "DOC-011", "Pending", {
    tenderId: "TDR-2026-014",
    category: "Finance",
    remarks: "Sanction file under circulation.",
    dueDate: "05 Oct 2026",
  }),
  ci("CR-014", "Define measurable milestones in the contract schedule", "DOC-003", "Pending", {
    tenderId: "TDR-2026-014",
    category: "Contract",
    remarks: "Draft milestone schedule prepared, approval awaited.",
  }),
  ci("CR-015", "Obtain and track performance security validity", "DOC-003", "Not Applicable", {
    tenderId: "TDR-2026-014",
    category: "Contract",
    remarks: "Applicable only after award of contract.",
  }),
  ci("CR-016", "Record milestone verification before payment release", "DOC-003", "Not Applicable", {
    tenderId: "TDR-2026-014",
    category: "Contract",
    remarks: "Applicable during contract execution stage.",
  }),
  ci("CR-017", "State bid validity period explicitly in the notice", "DOC-004", "Compliant", {
    tenderId: "TDR-2026-016",
    responsible: "M. Fernandes",
    dueDate: "10 Oct 2026",
  }),
  ci("CR-018", "Use the prescribed bid security declaration format", "DOC-013", "Pending", {
    tenderId: "TDR-2026-016",
    responsible: "M. Fernandes",
    category: "Finance",
    dueDate: "08 Oct 2026",
  }),
  ci("CR-019", "Record stage-wise inspection reports", "DOC-008", "Compliant", {
    contractId: "CON-2026-011",
    responsible: "M. Fernandes",
    category: "Quality",
    evidence: "Lot1_Inspection_Report.pdf",
  }),
  ci("CR-020", "Obtain third-party inspection certificate where prescribed", "DOC-008", "Partially Compliant", {
    contractId: "CON-2026-011",
    responsible: "M. Fernandes",
    category: "Quality",
    remarks: "Certificate received for lot 1; lot 2 pending.",
  }),
  ci("CR-021", "Initiate renewal proposal before the prescribed lead time", "DOC-006", "Pending", {
    contractId: "CON-2026-008",
    category: "Contract",
    remarks: "Renewal note to be initiated; contract expiry approaching.",
    dueDate: "05 Oct 2026",
  }),
  ci("CR-022", "Attach vendor performance review to the renewal note", "DOC-006", "Pending", {
    contractId: "CON-2026-008",
    category: "Contract",
    dueDate: "05 Oct 2026",
  }),
  ci("CR-023", "Record half-yearly vendor performance score", "DOC-014", "Compliant", {
    contractId: "CON-2026-008",
    category: "Contract",
    evidence: "Vendor_Score_H1.pdf",
  }),
  ci("CR-024", "Obtain an approved site safety plan before work start", "DOC-012", "Compliant", {
    contractId: "CON-2026-003",
    responsible: "A. Deshmukh",
    category: "Safety",
  }),
  ci("CR-025", "Submit monthly safety compliance report", "DOC-012", "Non-Compliant", {
    contractId: "CON-2026-003",
    responsible: "A. Deshmukh",
    category: "Safety",
    remarks: "September report not submitted by the contractor.",
    dueDate: "30 Sep 2026",
  }),
  ci("CR-026", "Verify supplier self-certification during evaluation", "DOC-005", "Compliant", {
    tenderId: "TDR-2026-015",
    responsible: "A. Deshmukh",
  }),
  ci("CR-027", "Include preference criteria in the tender conditions", "DOC-005", "Compliant", {
    tenderId: "TDR-2026-015",
    responsible: "A. Deshmukh",
  }),
  ci("CR-028", "Maintain a complaint register with disposal status", "DOC-009", "Pending", {
    tenderId: "TDR-2026-009",
    category: "Vigilance",
    dueDate: "08 Oct 2026",
  }),
];

export const auditEvents: AuditEvent[] = [
  {
    id: "AUD-1010",
    user: "Pushkar Bhati",
    role: "officer",
    action: "Compliance status updated",
    object: "CR-008 — Retain system-generated bid opening record",
    objectType: "Compliance",
    date: "28 Sep 2026",
    time: "17:12",
    previous: "Pending",
    next: "Compliant",
  },
  {
    id: "AUD-1009",
    user: "Pushkar Bhati",
    role: "officer",
    action: "Regulation linked to tender",
    object: "DOC-002 → TDR-2026-014",
    objectType: "Tender",
    date: "28 Sep 2026",
    time: "16:40",
  },
  {
    id: "AUD-1008",
    user: "R. Nandakumar",
    role: "admin",
    action: "Document uploaded",
    object: "DOC-015 — Procurement Planning Circular (Demo)",
    objectType: "Document",
    date: "27 Sep 2026",
    time: "11:05",
  },
  {
    id: "AUD-1007",
    user: "Pushkar Bhati",
    role: "officer",
    action: "Contract updated",
    object: "CON-2026-008 — IT Infrastructure Maintenance",
    objectType: "Contract",
    date: "26 Sep 2026",
    time: "15:22",
    previous: "Active",
    next: "Expiring Soon",
  },
  {
    id: "AUD-1006",
    user: "S. Iyer",
    role: "auditor",
    action: "Compliance report generated",
    object: "RPT-2026-0031 — Tender Compliance Report",
    objectType: "Report",
    date: "26 Sep 2026",
    time: "10:48",
  },
  {
    id: "AUD-1005",
    user: "Pushkar Bhati",
    role: "officer",
    action: "Tender created",
    object: "TDR-2026-014 — IT Infrastructure Procurement",
    objectType: "Tender",
    date: "08 Sep 2026",
    time: "09:30",
  },
  {
    id: "AUD-1004",
    user: "R. Nandakumar",
    role: "admin",
    action: "Document version updated",
    object: "DOC-013 — v1.0 → v1.1",
    objectType: "Document",
    date: "21 Apr 2026",
    time: "14:02",
    previous: "1.0",
    next: "1.1",
  },
  {
    id: "AUD-1003",
    user: "R. Nandakumar",
    role: "admin",
    action: "User role changed",
    object: "USR-003 — S. Iyer",
    objectType: "User",
    date: "12 Mar 2026",
    time: "12:15",
    previous: "Procurement Officer",
    next: "Auditor / Vigilance Officer",
  },
  {
    id: "AUD-1002",
    user: "A. Deshmukh",
    role: "officer",
    action: "Compliance status updated",
    object: "CR-025 — Submit monthly safety compliance report",
    objectType: "Compliance",
    date: "30 Sep 2026",
    time: "18:05",
    previous: "Pending",
    next: "Non-Compliant",
  },
  {
    id: "AUD-1001",
    user: "R. Nandakumar",
    role: "admin",
    action: "Document archived",
    object: "DOC-017 — Archived Stores Handling Manual (Demo)",
    objectType: "Document",
    date: "05 Feb 2026",
    time: "09:55",
    previous: "Active",
    next: "Archived",
  },
];

export const notifications: Notification[] = [
  {
    id: "NTF-010",
    kind: "document",
    title: "New procurement guideline added",
    body: "DOC-015 Procurement Planning Circular (Demo) has been published to the repository.",
    date: "27 Sep 2026, 11:05",
    read: false,
    link: "/documents",
  },
  {
    id: "NTF-009",
    kind: "warning",
    title: "Compliance requirement pending",
    body: "CR-005 conflict-of-interest declarations pending for TDR-2026-014.",
    date: "28 Sep 2026, 09:14",
    read: false,
    link: "/compliance",
  },
  {
    id: "NTF-008",
    kind: "warning",
    title: "Contract expires in 28 days",
    body: "CON-2026-008 IT Infrastructure Maintenance expires on 26 Oct 2026.",
    date: "28 Sep 2026, 08:00",
    read: false,
    link: "/contracts",
  },
  {
    id: "NTF-007",
    kind: "success",
    title: "Tender compliance updated",
    body: "Compliance for TDR-2026-014 moved to 69% after CR-008 was marked compliant.",
    date: "28 Sep 2026, 17:12",
    read: true,
    link: "/tenders",
  },
  {
    id: "NTF-006",
    kind: "document",
    title: "New document uploaded",
    body: "Milestone 2 verification report attached to CON-2026-008.",
    date: "05 May 2026, 10:20",
    read: true,
    link: "/contracts",
  },
  {
    id: "NTF-005",
    kind: "warning",
    title: "Renewal documentation pending",
    body: "Renewal note and performance review pending for CON-2026-008.",
    date: "26 Sep 2026, 15:30",
    read: false,
    link: "/contracts",
  },
  {
    id: "NTF-004",
    kind: "info",
    title: "Evaluation scheduled",
    body: "Evaluation for TDR-2026-014 is scheduled on 07 Oct 2026.",
    date: "25 Sep 2026, 12:00",
    read: true,
    link: "/tenders",
  },
  {
    id: "NTF-003",
    kind: "warning",
    title: "Non-compliance recorded",
    body: "CR-025 monthly safety report not submitted for CON-2026-003.",
    date: "30 Sep 2026, 18:05",
    read: false,
    link: "/compliance",
  },
  {
    id: "NTF-002",
    kind: "success",
    title: "Compliance report generated",
    body: "RPT-2026-0031 Tender Compliance Report was generated and is available for download.",
    date: "26 Sep 2026, 10:48",
    read: true,
    link: "/reports",
  },
  {
    id: "NTF-001",
    kind: "info",
    title: "Document version superseded",
    body: "DOC-016 has been superseded by DOC-001 version 2.0.",
    date: "12 Jan 2026, 09:00",
    read: true,
    link: "/documents",
  },
];

export const recentActivity = [
  {
    id: "ACT-1",
    icon: "link",
    text: "CVC integrity guideline (DOC-002) added to Tender TDR-2026-014",
    user: "Pushkar Bhati",
    at: "28 Sep 2026, 16:40",
  },
  {
    id: "ACT-2",
    icon: "check",
    text: "Compliance requirement CR-008 marked as completed",
    user: "Pushkar Bhati",
    at: "28 Sep 2026, 17:12",
  },
  {
    id: "ACT-3",
    icon: "contract",
    text: "Contract CON-2026-008 updated to Expiring Soon",
    user: "Pushkar Bhati",
    at: "26 Sep 2026, 15:22",
  },
  {
    id: "ACT-4",
    icon: "upload",
    text: "New procurement circular DOC-015 uploaded",
    user: "R. Nandakumar",
    at: "27 Sep 2026, 11:05",
  },
  {
    id: "ACT-5",
    icon: "report",
    text: "Compliance report RPT-2026-0031 generated",
    user: "S. Iyer",
    at: "26 Sep 2026, 10:48",
  },
  {
    id: "ACT-6",
    icon: "tender",
    text: "Tender TDR-2026-016 published on the electronic portal",
    user: "M. Fernandes",
    at: "15 Sep 2026, 10:12",
  },
  {
    id: "ACT-7",
    icon: "alert",
    text: "CR-025 recorded as non-compliant for CON-2026-003",
    user: "A. Deshmukh",
    at: "30 Sep 2026, 18:05",
  },
  {
    id: "ACT-8",
    icon: "check",
    text: "Lot 1 inspection report verified for CON-2026-011",
    user: "M. Fernandes",
    at: "22 Jun 2026, 14:30",
  },
];

export const deadlines = [
  {
    id: "DL-1",
    title: "Tender compliance review — TDR-2026-014",
    date: "02 Oct 2026",
    severity: "high" as const,
    link: "/tenders/TDR-2026-014",
  },
  {
    id: "DL-2",
    title: "Contract renewal note — CON-2026-008",
    date: "05 Oct 2026",
    severity: "high" as const,
    link: "/contracts/CON-2026-008",
  },
  {
    id: "DL-3",
    title: "Compliance report submission — Q2",
    date: "08 Oct 2026",
    severity: "medium" as const,
    link: "/reports",
  },
  {
    id: "DL-4",
    title: "Document review — DOC-010 indexing update",
    date: "11 Oct 2026",
    severity: "low" as const,
    link: "/documents",
  },
];

export const complianceTrend = [
  { month: "Apr", compliance: 72 },
  { month: "May", compliance: 76 },
  { month: "Jun", compliance: 81 },
  { month: "Jul", compliance: 84 },
  { month: "Aug", compliance: 87 },
  { month: "Sep", compliance: 89 },
];

export const reportTypes = [
  {
    id: "tender-compliance",
    name: "Tender Compliance Report",
    description: "Requirement-wise compliance status for a selected tender.",
  },
  {
    id: "contract-compliance",
    name: "Contract Compliance Report",
    description: "Compliance and milestone status for a selected contract.",
  },
  {
    id: "regulation-adoption",
    name: "Regulation Adoption Report",
    description: "How widely each regulation has been applied across tenders and contracts.",
  },
  {
    id: "pending-compliance",
    name: "Pending Compliance Report",
    description: "All pending, partially compliant and non-compliant requirements.",
  },
  {
    id: "department-compliance",
    name: "Department-wise Compliance Report",
    description: "Comparison of compliance performance across departments.",
  },
  {
    id: "monthly-compliance",
    name: "Monthly Compliance Report",
    description: "Month-wise compliance percentage trend with counts.",
  },
];

export const futureExtensions = [
  "AI-assisted document classification",
  "OCR for scanned procurement documents",
  "Semantic search over the document repository",
  "Automatic identification of potentially applicable regulations",
  "Compliance recommendation support",
  "Anomaly detection in procurement records",
  "Natural-language querying of procurement records",
  "Blockchain-based audit integrity",
  "Integration with external government procurement systems",
  "Interoperability with other government information systems",
];
