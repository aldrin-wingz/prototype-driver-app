// ──────────────────────────────────────────────────────────────
// Generates a full driver detail object with stage/step data
// that is consistent with the driver's currentStageId.
// Stages before the current one → completed
// Current stage → active / waiting_agent / on_hold based on subStatus
// Stages after → locked
// ──────────────────────────────────────────────────────────────

import { STAGES_META, ALL_DRIVERS, type MockDriver } from "./drivers-data";

// ── Types ───────────────────────────────────────────────────────
export type StageStatus = "completed" | "active" | "waiting_agent" | "on_hold" | "locked" | "waiting_external" | "flagged";
export type StepStatus = "completed" | "active" | "locked" | "needs_attention";

export interface FieldData {
  label: string;
  value: string;
  colSpan?: 4 | 6 | 12;
}

export interface MockStep {
  id: string;
  title: string;
  status: StepStatus;
  submittedData?: FieldData[];
  flagged?: boolean;
  flagNote?: string;
}

export interface MockStage {
  id: string;
  title: string;
  status: StageStatus;
  completedAt: string | null;
  steps: MockStep[];
}

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  type: "status_change" | "stage_advance" | "note_added" | "message_sent" | "document_uploaded" | "flag_raised" | "system";
  description: string;
  agent?: string;
  metadata?: string;
}

export interface DriverDetail {
  id: string;
  name: string;
  email: string;
  phone: string;
  appliedDate: string;
  status: string;
  isOptedOut?: boolean;
  stages: MockStage[];
  notes: { agent: string; date: string; text: string; pinned?: boolean }[];
  activityLog: ActivityLogEntry[];
}

// ── Step templates per stage ────────────────────────────────────
interface StepTemplate {
  id: string;
  title: string;
  completedData?: FieldData[];
}

const STAGE_STEPS: Record<string, StepTemplate[]> = {
  "contact-info": [
    { id: "phone-verification", title: "Phone Verification", completedData: [
      { label: "Phone Number", value: "{{phone}}" },
      { label: "Verified At", value: "Jan 27, 2026 10:45 AM", colSpan: 6 },
    ]},
    { id: "email-verification", title: "Email Verification", completedData: [
      { label: "Email Address", value: "{{email}}" },
      { label: "Verified At", value: "Jan 27, 2026 10:48 AM", colSpan: 6 },
    ]},
  ],
  "terms-conditions": [
    { id: "tos-review", title: "Terms of Service", completedData: [
      { label: "Accepted Terms", value: "Yes", colSpan: 6 },
      { label: "Accepted At", value: "Jan 28, 2026 11:32 AM", colSpan: 6 },
      { label: "IP Address", value: "72.198.45.102" },
    ]},
  ],
  "intro-video": [
    { id: "watch-intro-video", title: "Welcome to Wingz", completedData: [
      { label: "Video Completed", value: "Yes", colSpan: 6 },
      { label: "Completion Date", value: "Jan 29, 2026 3:15 PM", colSpan: 6 },
      { label: "Watch Duration", value: "12 min 43 sec", colSpan: 6 },
      { label: "Acknowledgment", value: "Confirmed", colSpan: 6 },
    ]},
  ],
  "initial-screening": [
    { id: "personal-details", title: "Personal Details", completedData: [
      { label: "First Name (Legal)", value: "{{firstName}}", colSpan: 6 },
      { label: "Last Name (Legal)", value: "{{lastName}}", colSpan: 6 },
      { label: "Date of Birth", value: "03/15/1990", colSpan: 6 },
      { label: "Address", value: "1234 Oak Avenue, Orlando, FL 32801" },
      { label: "County", value: "Orange", colSpan: 6 },
      { label: "VIN", value: "1HGCM82633A123456" },
      { label: "Vehicle Year", value: "2022", colSpan: 4 },
      { label: "Vehicle Make/Model", value: "Honda CR-V", colSpan: 4 },
      { label: "Vehicle Type", value: "SUV or Van", colSpan: 4 },
    ]},
  ],
  "profile-docs": [
    { id: "profile-photos-bio", title: "Profile Photos & Bio", completedData: [
      { label: "Profile Photo", value: "Uploaded" },
      { label: "Vehicle Photo (Exterior)", value: "Uploaded", colSpan: 6 },
      { label: "Vehicle Photo (Interior)", value: "Uploaded", colSpan: 6 },
      { label: "Bio", value: "Experienced NEMT driver passionate about helping patients." },
    ]},
    { id: "vehicle-insurance", title: "Vehicle Insurance & Registration", completedData: [
      { label: "VIN", value: "1HGCM82633A123456" },
      { label: "Vehicle Color", value: "Silver", colSpan: 6 },
      { label: "License Plate", value: "ABC1234", colSpan: 6 },
      { label: "Insurance Provider", value: "State Farm Insurance", colSpan: 6 },
      { label: "Policy Number", value: "SF-2026-FL-844729", colSpan: 6 },
      { label: "Insurance Expiration", value: "December 15, 2026" },
    ]},
    { id: "dl-ssn", title: "Driver's License & SSN", completedData: [
      { label: "Driver's License Number", value: "S530-820-59-247" },
      { label: "DL State", value: "Florida", colSpan: 6 },
      { label: "DL Expiration", value: "08/15/2029", colSpan: 6 },
      { label: "SSN", value: "***-**-4521" },
    ]},
    { id: "accident-policy", title: "Accident & Eligibility Policy", completedData: [
      { label: "Policy Acknowledged", value: "Yes", colSpan: 6 },
      { label: "Acknowledged At", value: "Feb 1, 2026 4:22 PM", colSpan: 6 },
    ]},
  ],
  "nemt-interview": [
    { id: "schedule-interview", title: "Schedule Interview", completedData: [
      { label: "Selected Time Slot", value: "Wednesday, Feb 5, 2026 at 2:00 PM EST" },
      { label: "Interview Type", value: "Phone", colSpan: 6 },
      { label: "Confirmation Code", value: "INT-2026-0205", colSpan: 6 },
    ]},
  ],
  "inspections-certs": [
    { id: "vehicle-inspection", title: "Vehicle Inspection", completedData: [
      { label: "Inspection Date", value: "Feb 8, 2026", colSpan: 6 },
      { label: "Inspector", value: "AutoCheck FL #1247", colSpan: 6 },
      { label: "Result", value: "Passed", colSpan: 6 },
      { label: "Certificate No.", value: "VI-2026-FL-00482", colSpan: 6 },
    ]},
    { id: "ctaa-pass", title: "CTAA PASS Training", completedData: [
      { label: "Training Completed", value: "Yes", colSpan: 6 },
      { label: "Completion Date", value: "Feb 9, 2026", colSpan: 6 },
      { label: "Certificate No.", value: "CTAA-2026-1893" },
    ]},
  ],
  "background-check": [
    { id: "dlawson-consent", title: "D.Lawson Consent Form", completedData: [
      { label: "Full Legal Name", value: "{{firstName}} {{lastName}}" },
      { label: "Consent Given", value: "Yes", colSpan: 6 },
      { label: "Consent Date", value: "Feb 10, 2026", colSpan: 6 },
      { label: "Digital Signature", value: "Signed" },
    ]},
  ],
  "drug-screening": [
    { id: "drug-screen", title: "Drug Screening", completedData: [
      { label: "Screening Date", value: "Feb 11, 2026", colSpan: 6 },
      { label: "Acknowledged Completion", value: "Yes", colSpan: 6 },
    ]},
  ],
  "final-training": [
    { id: "hipaa-training", title: "HIPAA Training", completedData: [
      { label: "Completed", value: "Yes", colSpan: 6 },
      { label: "Completion Date", value: "Feb 12, 2026", colSpan: 6 },
    ]},
    { id: "driver-app-tutorial", title: "Driver App Tutorial", completedData: [
      { label: "Tutorial Completed", value: "Yes", colSpan: 6 },
      { label: "Completion Date", value: "Feb 13, 2026", colSpan: 6 },
    ]},
    { id: "being-a-wingz-driver", title: "Being a Wingz Driver", completedData: [
      { label: "Module Completed", value: "Yes", colSpan: 6 },
      { label: "Completion Date", value: "Feb 14, 2026", colSpan: 6 },
    ]},
  ],
  "payment-tax": [
    { id: "bank-account", title: "Bank Account", completedData: [
      { label: "Bank Name", value: "Chase Bank", colSpan: 6 },
      { label: "Account Ending", value: "***4829", colSpan: 6 },
      { label: "Account Type", value: "Checking" },
    ]},
    { id: "emergency-contact", title: "Emergency Contact", completedData: [
      { label: "Emergency Contact Name", value: "Maria Garcia" },
      { label: "Relationship", value: "Spouse", colSpan: 6 },
      { label: "Phone", value: "(407) 555-0823", colSpan: 6 },
    ]},
    { id: "w9-form", title: "W9 Form", completedData: [
      { label: "Legal Name", value: "{{firstName}} {{lastName}}" },
      { label: "Tax Classification", value: "Individual / Sole Proprietor" },
      { label: "SSN/EIN", value: "***-**-4521" },
      { label: "Certified", value: "Yes", colSpan: 6 },
    ]},
  ],
  "final-review": [
    { id: "awaiting-review", title: "Application Under Review", completedData: [
      { label: "Review Status", value: "Pending Final Approval" },
    ]},
  ],
};

const STAGE_COMPLETION_DATES: Record<string, string> = {
  "contact-info":       "Jan 27, 2026",
  "terms-conditions":   "Jan 28, 2026",
  "intro-video":        "Jan 29, 2026",
  "initial-screening":  "Jan 30, 2026",
  "profile-docs":       "Feb 1, 2026",
  "nemt-interview":     "Feb 5, 2026",
  "inspections-certs":  "Feb 9, 2026",
  "background-check":   "Feb 14, 2026",
  "drug-screening":     "Feb 16, 2026",
  "final-training":     "Feb 18, 2026",
  "payment-tax":        "Feb 19, 2026",
  "final-review":       "Feb 20, 2026",
};

const NOTES_POOL = [
  { agent: "Agent Torres", date: "Feb 3, 2026", text: "Driver is responsive and submitting docs on time." },
  { agent: "Agent Kim", date: "Jan 29, 2026", text: "Documents look clean. Approved for next stage." },
  { agent: "Agent Torres", date: "Feb 6, 2026", text: "Interview went well. Driver is very professional." },
  { agent: "Agent Park", date: "Feb 1, 2026", text: "Following up on missing vehicle photos.", pinned: true },
  { agent: "Agent Chen", date: "Feb 10, 2026", text: "Background check submitted, awaiting results." },
  { agent: "Agent Torres", date: "Feb 12, 2026", text: "IMPORTANT: Driver has medical accommodation request on file. Ensure vehicle inspection accounts for wheelchair ramp.", pinned: true },
];

function fillTemplate(fields: FieldData[], driver: MockDriver): FieldData[] {
  const [firstName, ...lastParts] = driver.name.split(" ");
  const lastName = lastParts.join(" ");
  return fields.map((f) => ({
    ...f,
    value: f.value
      .replace("{{firstName}}", firstName)
      .replace("{{lastName}}", lastName)
      .replace("{{email}}", driver.email)
      .replace("{{phone}}", driver.phone),
  }));
}

export function generateDriverDetail(driverId: string): DriverDetail | null {
  const driver = ALL_DRIVERS.find((d) => d.id === driverId);
  if (!driver) return null;

  const stageOrder = STAGES_META.map((s) => s.stageId);
  const currentIdx = driver.subStatus === "completed" || driver.subStatus === "rejected"
    ? stageOrder.length
    : stageOrder.indexOf(driver.currentStageId);

  const currentStageStatus: StageStatus =
    driver.subStatus === "on_hold"
      ? "on_hold"
      : driver.subStatus === "pending_review"
      ? "waiting_agent"
      : driver.subStatus === "change_requested"
      ? "flagged"
      : "active";

  const stages: MockStage[] = STAGES_META.map((stageMeta, idx) => {
    const stepTemplates = STAGE_STEPS[stageMeta.stageId] || [];
    let stageStatus: StageStatus;
    let steps: MockStep[];
    let completedAt: string | null = null;

    if (idx < currentIdx) {
      stageStatus = "completed";
      completedAt = STAGE_COMPLETION_DATES[stageMeta.stageId] || null;
      steps = stepTemplates.map((t) => ({
        id: t.id,
        title: t.title,
        status: "completed" as StepStatus,
        submittedData: t.completedData ? fillTemplate(t.completedData, driver) : undefined,
      }));
    } else if (idx === currentIdx) {
      stageStatus = currentStageStatus;
      const totalSteps = stepTemplates.length;
      steps = stepTemplates.map((t, stepIdx) => {
        if (driver.subStatus === "pending_review") {
          return {
            id: t.id,
            title: t.title,
            status: "completed" as StepStatus,
            submittedData: t.completedData ? fillTemplate(t.completedData, driver) : undefined,
          };
        } else if (driver.subStatus === "on_hold") {
          if (stepIdx < totalSteps - 1) {
            return {
              id: t.id,
              title: t.title,
              status: "completed" as StepStatus,
              submittedData: t.completedData ? fillTemplate(t.completedData, driver) : undefined,
            };
          }
          return {
            id: t.id,
            title: t.title,
            status: "needs_attention" as StepStatus,
            flagged: true,
            flagNote: driver.holdReason,
          };
        } else if (driver.subStatus === "change_requested") {
          if (stepIdx < totalSteps - 1) {
            return {
              id: t.id,
              title: t.title,
              status: "completed" as StepStatus,
              submittedData: t.completedData ? fillTemplate(t.completedData, driver) : undefined,
            };
          }
          return {
            id: t.id,
            title: t.title,
            status: "needs_attention" as StepStatus,
            flagged: true,
            flagNote: driver.holdReason,
          };
        } else {
          const activeIdx = Math.min(Math.floor(totalSteps / 2), totalSteps - 1);
          if (stepIdx < activeIdx) {
            return {
              id: t.id,
              title: t.title,
              status: "completed" as StepStatus,
              submittedData: t.completedData ? fillTemplate(t.completedData, driver) : undefined,
            };
          } else if (stepIdx === activeIdx) {
            return { id: t.id, title: t.title, status: "active" as StepStatus };
          }
          return { id: t.id, title: t.title, status: "locked" as StepStatus };
        }
      });
    } else {
      stageStatus = "locked";
      steps = stepTemplates.map((t) => ({
        id: t.id,
        title: t.title,
        status: "locked" as StepStatus,
      }));
    }

    return {
      id: stageMeta.stageId,
      title: stageMeta.title,
      status: stageStatus,
      completedAt,
      steps,
    };
  });

  const hash = driverId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const noteCount = 2 + (hash % 3);
  const noteStart = hash % NOTES_POOL.length;
  const notes = Array.from({ length: noteCount }, (_, i) =>
    NOTES_POOL[(noteStart + i) % NOTES_POOL.length]
  );

  const activityLog: ActivityLogEntry[] = [
    { id: "log-1", timestamp: "Jan 28, 2026 11:00 AM", type: "system", description: "Application submitted by driver", metadata: "Source: Online portal" },
    { id: "log-2", timestamp: "Jan 28, 2026 11:05 AM", type: "system", description: "Verification email sent", metadata: "Auto-triggered" },
    { id: "log-3", timestamp: "Jan 28, 2026 11:15 AM", type: "system", description: "Email verified successfully" },
    { id: "log-4", timestamp: "Jan 29, 2026 9:30 AM", type: "status_change", description: "Application status changed to In Review", agent: "System" },
    { id: "log-5", timestamp: "Jan 30, 2026 2:15 PM", type: "note_added", description: "Agent added a note", agent: "Agent Torres", metadata: "Contacted driver regarding missing insurance docs" },
    { id: "log-6", timestamp: "Jan 31, 2026 10:00 AM", type: "message_sent", description: "SMS sent to driver", agent: "Agent Torres", metadata: "Reminder: Please upload insurance documents" },
    { id: "log-7", timestamp: "Feb 1, 2026 3:45 PM", type: "document_uploaded", description: "Driver uploaded insurance document", metadata: "insurance_card.pdf" },
    { id: "log-8", timestamp: "Feb 1, 2026 4:00 PM", type: "stage_advance", description: "Advanced from Contact Info to Profile Documents", agent: "Agent Torres" },
    { id: "log-9", timestamp: "Feb 2, 2026 11:30 AM", type: "document_uploaded", description: "Driver uploaded driver license photo", metadata: "license_front.jpg" },
    { id: "log-10", timestamp: "Feb 3, 2026 9:00 AM", type: "flag_raised", description: "Changes requested on Profile Documents", agent: "Agent Torres", metadata: "License photo is blurry" },
    { id: "log-11", timestamp: "Feb 3, 2026 2:15 PM", type: "message_sent", description: "SMS sent to driver", agent: "Agent Torres", metadata: "Interview scheduling confirmation" },
    { id: "log-12", timestamp: "Feb 4, 2026 10:00 AM", type: "stage_advance", description: "Advanced from Profile Documents to NEMT Interview", agent: "Agent Torres" },
  ];

  const completedCount = stages.filter((s) => s.status === "completed").length;
  const logSlice = Math.min(activityLog.length, 4 + completedCount * 2);

  return {
    id: driver.id,
    name: driver.name,
    email: driver.email,
    phone: driver.phone,
    appliedDate: driver.appliedDate,
    status: driver.subStatus,
    isOptedOut: driver.isOptedOut,
    stages,
    notes,
    activityLog: activityLog.slice(0, logSlice).reverse(),
  };
}
