// ──────────────────────────────────────────────────────────────
// Pure serializable mock data – no React / Lucide imports.
// This file is the single source of truth for mock driver data.
// ──────────────────────────────────────────────────────────────

export type SubStatus = "in_progress" | "pending_review" | "on_hold" | "completed" | "change_requested" | "rejected";

export interface MockDriver {
  id: string;
  name: string;
  email: string;
  phone: string;
  county: string;
  currentStageId: string;
  subStatus: SubStatus;
  appliedDate: string;
  lastActivity: string;
  lastActivityDetail: string; // e.g. "Submitted DL photos", "Completed interview"
  daysInStage: number;
  currentStep: string;
  holdReason?: string;
  lastAgentNote?: string; // Most recent note left by an agent
  isOptedOut?: boolean; // DNC list / Opt-out of communications flag
}

export interface StageMetaData {
  stageId: string;
  title: string;
  shortTitle: string;
  order: number;
}

export const STAGES_META: StageMetaData[] = [
  { stageId: "contact-info",       title: "Contact Information",           shortTitle: "Contact Info",       order: 1 },
  { stageId: "terms-conditions",   title: "Terms & Conditions",            shortTitle: "Terms",              order: 2 },
  { stageId: "intro-video",        title: "Wingz Intro Video",             shortTitle: "Intro Video",        order: 3 },
  { stageId: "initial-screening",  title: "Initial Screening",             shortTitle: "Screening",          order: 4 },
  { stageId: "profile-docs",       title: "Profile & Documents",           shortTitle: "Profile & Docs",     order: 5 },
  { stageId: "nemt-interview",     title: "NEMT Interview",                shortTitle: "NEMT Interview",     order: 6 },
  { stageId: "inspections-certs",  title: "Inspections & Certifications",  shortTitle: "Inspections",        order: 7 },
  { stageId: "background-check",   title: "Background Check",              shortTitle: "Background Check",   order: 8 },
  { stageId: "drug-screening",     title: "Drug Screening",                shortTitle: "Drug Screening",     order: 9 },
  { stageId: "final-training",     title: "Training",                      shortTitle: "Training",           order: 10 },
  { stageId: "payment-tax",        title: "Payment & Tax Setup",           shortTitle: "Payment & Tax",      order: 11 },
  { stageId: "final-review",       title: "Final Review",                  shortTitle: "Final Review",       order: 12 },
];

export const ALL_DRIVERS: MockDriver[] = [
  // ── Stage 1: Contact Information ─────────────────────
  { id: "ci-1", name: "Ana Garcia",       email: "ana.g@email.com",       phone: "+1 (407) 555-0211", county: "Orange",        currentStageId: "contact-info",      subStatus: "in_progress",    appliedDate: "Feb 10", lastActivity: "02/19/2026, 10:26:36 AM (EST)",  lastActivityDetail: "Verified email address",             daysInStage: 1, currentStep: "Email Verification" },
  { id: "ci-2", name: "Tony Nguyen",      email: "tony.n@email.com",      phone: "+1 (321) 555-0334", county: "Brevard",       currentStageId: "contact-info",      subStatus: "in_progress",    appliedDate: "Feb 9",  lastActivity: "02/19/2026, 08:26:36 AM (EST)",  lastActivityDetail: "Submitted phone number",             daysInStage: 2, currentStep: "Phone Verification" },

  // ── Stage 2: Terms & Conditions ──────────────────────
  { id: "tc-1", name: "Luis Herrera",     email: "luis.h@email.com",      phone: "+1 (305) 555-0522", county: "Miami-Dade",    currentStageId: "terms-conditions",  subStatus: "in_progress",    appliedDate: "Feb 7",  lastActivity: "02/19/2026, 09:26:36 AM (EST)",  lastActivityDetail: "Opened terms page",                  daysInStage: 4, currentStep: "Review Terms", isOptedOut: true },
  { id: "tc-2", name: "Priya Patel",      email: "priya.p@email.com",     phone: "+1 (813) 555-0669", county: "Hillsborough",  currentStageId: "terms-conditions",  subStatus: "in_progress",    appliedDate: "Feb 6",  lastActivity: "02/19/2026, 06:26:36 AM (EST)",  lastActivityDetail: "Scrolled through TOS",               daysInStage: 5, currentStep: "Terms of Service" },

  // ── Stage 3: Wingz Intro Video ───────────────────────
  { id: "iv-1", name: "Derek Johnson",    email: "derek.j@email.com",     phone: "+1 (727) 555-0710", county: "Pinellas",      currentStageId: "intro-video",       subStatus: "in_progress",    appliedDate: "Feb 5",  lastActivity: "02/19/2026, 07:26:36 AM (EST)",  lastActivityDetail: "Started watching video",             daysInStage: 6, currentStep: "Watch Intro Video", isOptedOut: true },
  { id: "iv-2", name: "Mei Lin",          email: "mei.l@email.com",       phone: "+1 (954) 555-0833", county: "Broward",       currentStageId: "intro-video",       subStatus: "in_progress",    appliedDate: "Feb 4",  lastActivity: "02/18/2026, 11:26:36 AM (EST)",  lastActivityDetail: "Paused video at 2:30",               daysInStage: 7, currentStep: "Watch Intro Video" },

  // ── Stage 4: Initial Screening ───────────────────────
  { id: "is-1", name: "Karen White",      email: "karen.w@email.com",     phone: "+1 (561) 555-0478", county: "Palm Beach",    currentStageId: "initial-screening", subStatus: "in_progress",    appliedDate: "Feb 3",  lastActivity: "02/19/2026, 10:56:36 AM (EST)", lastActivityDetail: "Submitted personal details",         daysInStage: 3, currentStep: "Personal Details" },
  { id: "is-2", name: "Carlos Mendez",    email: "carlos.m@email.com",    phone: "+1 (407) 555-0399", county: "Orange",        currentStageId: "initial-screening", subStatus: "in_progress",    appliedDate: "Feb 2",  lastActivity: "02/19/2026, 10:26:36 AM (EST)",  lastActivityDetail: "Entered vehicle info",               daysInStage: 5, currentStep: "Personal Details" },

  // ── Stage 5: Profile & Documents ─────────────────────
  { id: "pd-1", name: "David Martinez",   email: "david.m@email.com",     phone: "+1 (407) 555-0147", county: "Orange",        currentStageId: "profile-docs",      subStatus: "in_progress",    appliedDate: "Feb 1",  lastActivity: "02/19/2026, 10:56:36 AM (EST)", lastActivityDetail: "Uploaded insurance card",             daysInStage: 8,  currentStep: "Vehicle Insurance & Registration" },
  { id: "pd-2", name: "Jennifer Lee",     email: "jennifer.l@email.com",  phone: "+1 (407) 555-0987", county: "Seminole",      currentStageId: "profile-docs",      subStatus: "in_progress",    appliedDate: "Jan 30", lastActivity: "02/19/2026, 09:26:36 AM (EST)",  lastActivityDetail: "Uploaded DL front photo",            daysInStage: 9,  currentStep: "Driver's License & SSN", isOptedOut: true },
  { id: "pd-3", name: "Robert Kim",       email: "robert.k@email.com",    phone: "+1 (727) 555-0654", county: "Pinellas",      currentStageId: "profile-docs",      subStatus: "on_hold",        appliedDate: "Jan 25", lastActivity: "02/16/2026, 11:26:36 AM (EST)",  lastActivityDetail: "Profile photo rejected",             daysInStage: 18, currentStep: "Profile Photos & Bio", holdReason: "Photo doesn't meet requirements", lastAgentNote: "Photo is too dark and face not visible. Asked driver to retake." },
  { id: "pd-4", name: "Fatima Al-Rashid", email: "fatima.a@email.com",    phone: "+1 (321) 555-0291", county: "Brevard",       currentStageId: "profile-docs",      subStatus: "pending_review", appliedDate: "Jan 28", lastActivity: "02/19/2026, 10:26:36 AM (EST)",  lastActivityDetail: "Submitted all documents",            daysInStage: 13, currentStep: "All Documents Submitted", lastAgentNote: "All docs look complete, verifying insurance expiry date." },
  { id: "pd-5", name: "Chris Evans",      email: "chris.e@email.com",     phone: "+1 (561) 555-0188", county: "Palm Beach",    currentStageId: "profile-docs",      subStatus: "pending_review", appliedDate: "Jan 26", lastActivity: "02/19/2026, 05:26:36 AM (EST)",  lastActivityDetail: "Resubmitted vehicle photos",        daysInStage: 15, currentStep: "All Documents Submitted", lastAgentNote: "Second submission looks good, needs final verification." },

  // ── Stage 6: NEMT Interview ──────────────────────────
  { id: "ni-1", name: "Maria Santos",     email: "maria.s@email.com",     phone: "+1 (407) 555-0199", county: "Orange",        currentStageId: "nemt-interview",    subStatus: "pending_review", appliedDate: "Jan 26", lastActivity: "02/19/2026, 09:26:36 AM (EST)",  lastActivityDetail: "Completed interview",                daysInStage: 15, currentStep: "Interview Completed", isOptedOut: true, lastAgentNote: "Strong interview, recommend approval." },
  { id: "ni-2", name: "Patricia Wilson",  email: "patricia.w@email.com",  phone: "+1 (813) 555-0321", county: "Hillsborough",  currentStageId: "nemt-interview",    subStatus: "pending_review", appliedDate: "Jan 23", lastActivity: "02/19/2026, 07:26:36 AM (EST)",  lastActivityDetail: "Completed interview",                daysInStage: 18, currentStep: "Interview Completed", lastAgentNote: "Needs follow-up on wheelchair transport experience." },
  { id: "ni-3", name: "Sam Okafor",       email: "sam.o@email.com",       phone: "+1 (954) 555-0412", county: "Broward",       currentStageId: "nemt-interview",    subStatus: "in_progress",    appliedDate: "Jan 29", lastActivity: "02/18/2026, 11:26:36 AM (EST)",  lastActivityDetail: "Requested interview slot",           daysInStage: 11, currentStep: "Schedule Interview" },
  { id: "ni-4", name: "Yuki Tanaka",      email: "yuki.t@email.com",      phone: "+1 (305) 555-0598", county: "Miami-Dade",    currentStageId: "nemt-interview",    subStatus: "on_hold",        appliedDate: "Jan 20", lastActivity: "02/17/2026, 11:26:36 AM (EST)",  lastActivityDetail: "Missed scheduled interview",         daysInStage: 23, currentStep: "Schedule Interview", holdReason: "No-show, rescheduling", lastAgentNote: "Second no-show. Sent final reminder via SMS." },
  { id: "ni-5", name: "Andre Williams",   email: "andre.w@email.com",     phone: "+1 (407) 555-0775", county: "Orange",        currentStageId: "nemt-interview",    subStatus: "pending_review", appliedDate: "Jan 22", lastActivity: "02/19/2026, 06:26:36 AM (EST)",  lastActivityDetail: "Completed interview",                daysInStage: 21, currentStep: "Interview Completed", lastAgentNote: "Good candidate. Reviewing NEMT certifications." },

  // ── Stage 7: Inspections & Certifications ────────────
  { id: "ic-1", name: "James Rodriguez",  email: "james.r@email.com",     phone: "+1 (321) 555-0123", county: "Brevard",       currentStageId: "inspections-certs", subStatus: "on_hold",        appliedDate: "Jan 15", lastActivity: "02/18/2026, 11:26:36 AM (EST)",  lastActivityDetail: "Insurance doc flagged",              daysInStage: 28, currentStep: "Vehicle Inspection", holdReason: "Missing insurance docs", lastAgentNote: "Insurance card is expired. Requested current one." },
  { id: "ic-2", name: "Lisa Chang",       email: "lisa.c@email.com",      phone: "+1 (727) 555-0366", county: "Pinellas",      currentStageId: "inspections-certs", subStatus: "in_progress",    appliedDate: "Jan 22", lastActivity: "02/19/2026, 08:26:36 AM (EST)",  lastActivityDetail: "Started CTAA PASS module",           daysInStage: 21, currentStep: "CTAA PASS Training", isOptedOut: true },
  { id: "ic-3", name: "Mohammed Ali",     email: "mohammed.a@email.com",  phone: "+1 (813) 555-0499", county: "Hillsborough",  currentStageId: "inspections-certs", subStatus: "pending_review", appliedDate: "Jan 20", lastActivity: "02/19/2026, 05:26:36 AM (EST)",  lastActivityDetail: "Submitted all certifications",       daysInStage: 23, currentStep: "All Items Submitted", lastAgentNote: "CPR cert expires next month, note for follow-up." },
  { id: "ic-4", name: "Diana Reyes",      email: "diana.r@email.com",    phone: "+1 (954) 555-0502", county: "Broward",       currentStageId: "inspections-certs", subStatus: "on_hold",        appliedDate: "Jan 18", lastActivity: "02/17/2026, 11:26:36 AM (EST)",  lastActivityDetail: "Failed vehicle inspection",          daysInStage: 25, currentStep: "Vehicle Inspection", holdReason: "Failed tire inspection - needs replacement", lastAgentNote: "Tires below minimum tread. Driver aware, getting replaced." },

  // ── Stage 8: Background Check ────────────────────────
  { id: "bc-1", name: "Sarah Chen",       email: "sarah.c@email.com",     phone: "+1 (305) 555-0456", county: "Miami-Dade",    currentStageId: "background-check",  subStatus: "in_progress",    appliedDate: "Jan 29", lastActivity: "02/19/2026, 08:26:36 AM (EST)",  lastActivityDetail: "Filling out consent form",           daysInStage: 11, currentStep: "D.Lawson Consent Form" },
  { id: "bc-2", name: "Kevin Park",       email: "kevin.p@email.com",     phone: "+1 (407) 555-0633", county: "Orange",        currentStageId: "background-check",  subStatus: "in_progress",    appliedDate: "Jan 26", lastActivity: "02/18/2026, 11:26:36 AM (EST)",  lastActivityDetail: "Consent submitted, awaiting results", daysInStage: 15, currentStep: "Awaiting Results", lastAgentNote: "Consent verified. D.Lawson check submitted 1/27." },

  // ── Stage 9: Drug Screening ──────────────────────────
  { id: "ds-1", name: "Jessica Brown",    email: "jessica.b@email.com",   phone: "+1 (321) 555-0855", county: "Brevard",       currentStageId: "drug-screening",    subStatus: "in_progress",    appliedDate: "Jan 22", lastActivity: "02/18/2026, 11:26:36 AM (EST)",  lastActivityDetail: "Scheduled screening appointment",    daysInStage: 21, currentStep: "Drug Screening", isOptedOut: true },
  { id: "ds-2", name: "Tom O'Brien",      email: "tom.o@email.com",       phone: "+1 (727) 555-0968", county: "Pinellas",      currentStageId: "drug-screening",    subStatus: "in_progress",    appliedDate: "Jan 20", lastActivity: "02/19/2026, 05:26:36 AM (EST)",  lastActivityDetail: "Completed screening, awaiting lab",  daysInStage: 23, currentStep: "Drug Screening", lastAgentNote: "Screening done at Quest Diagnostics. Lab results in 3-5 days." },
  { id: "ds-3", name: "Aaliyah Jackson",  email: "aaliyah.j@email.com",   phone: "+1 (813) 555-0177", county: "Hillsborough",  currentStageId: "drug-screening",    subStatus: "on_hold",        appliedDate: "Jan 18", lastActivity: "02/16/2026, 11:26:36 AM (EST)",  lastActivityDetail: "Missed screening appointment",       daysInStage: 25, currentStep: "Drug Screening", holdReason: "Failed to appear - rescheduling appointment", lastAgentNote: "Third missed appointment. Final attempt scheduled for 2/20." },

  // ── Stage 10: Training ───────────────────────────────
  { id: "ft-1", name: "Michael Thompson", email: "michael.t@email.com",   phone: "+1 (954) 555-0789", county: "Broward",       currentStageId: "final-training",    subStatus: "in_progress",    appliedDate: "Jan 20", lastActivity: "02/19/2026, 06:26:36 AM (EST)",  lastActivityDetail: "Completed HIPAA module 2/3",        daysInStage: 23, currentStep: "HIPAA Training" },
  { id: "ft-2", name: "Sophia Rossi",     email: "sophia.r@email.com",    phone: "+1 (305) 555-0294", county: "Miami-Dade",    currentStageId: "final-training",    subStatus: "in_progress",    appliedDate: "Jan 18", lastActivity: "02/19/2026, 09:26:36 AM (EST)",  lastActivityDetail: "Started driver app tutorial",        daysInStage: 25, currentStep: "Driver App Tutorial" },

  // ── Stage 11: Payment & Tax Setup ────────────────────
  { id: "pt-1", name: "Hassan Ahmed",     email: "hassan.a@email.com",    phone: "+1 (407) 555-0388", county: "Orange",        currentStageId: "payment-tax",       subStatus: "in_progress",    appliedDate: "Jan 15", lastActivity: "02/19/2026, 10:26:36 AM (EST)",  lastActivityDetail: "Entered bank account details",       daysInStage: 28, currentStep: "Bank Account" },
  { id: "pt-2", name: "Rachel Green",     email: "rachel.g@email.com",    phone: "+1 (561) 555-0744", county: "Palm Beach",    currentStageId: "payment-tax",       subStatus: "pending_review", appliedDate: "Jan 14", lastActivity: "02/19/2026, 07:26:36 AM (EST)",  lastActivityDetail: "Submitted W-9 and bank info",        daysInStage: 29, currentStep: "All Items Submitted", lastAgentNote: "Bank routing number looks unusual, double-checking." },

  // ── Stage 12: Final Review ───────────────────────────
  { id: "fr-1", name: "Emily Davis",      email: "emily.d@email.com",     phone: "+1 (561) 555-0411", county: "Palm Beach",    currentStageId: "final-review",      subStatus: "pending_review", appliedDate: "Jan 10", lastActivity: "02/19/2026, 10:56:36 AM (EST)", lastActivityDetail: "All stages completed",               daysInStage: 33, currentStep: "Awaiting Final Approval", lastAgentNote: "Everything looks good. Ready for final sign-off." },
  { id: "fr-2", name: "Alex Rivera",      email: "alex.r@email.com",      phone: "+1 (321) 555-0544", county: "Brevard",       currentStageId: "final-review",      subStatus: "pending_review", appliedDate: "Jan 8",  lastActivity: "02/19/2026, 09:26:36 AM (EST)",  lastActivityDetail: "All stages completed",               daysInStage: 35, currentStep: "Awaiting Final Approval", isOptedOut: true, lastAgentNote: "Background check was decisional but approved. Clear to go." },
  { id: "fr-3", name: "Natasha Volkov",   email: "natasha.v@email.com",   phone: "+1 (727) 555-0667", county: "Pinellas",      currentStageId: "final-review",      subStatus: "pending_review", appliedDate: "Jan 12", lastActivity: "02/19/2026, 07:26:36 AM (EST)",  lastActivityDetail: "All stages completed",               daysInStage: 31, currentStep: "Awaiting Final Approval", lastAgentNote: "Drug screening results clean. Final review in progress." },

  // ── Completed (finished onboarding) ──────────────────
  { id: "co-1", name: "Ryan Mitchell",    email: "ryan.m@email.com",      phone: "+1 (407) 555-0901", county: "Orange",        currentStageId: "completed",         subStatus: "completed",         appliedDate: "Dec 15", lastActivity: "02/17/2026, 11:26:36 AM (EST)",  lastActivityDetail: "Onboarding approved",     daysInStage: 0, currentStep: "Onboarding Complete", isOptedOut: true },
  { id: "co-2", name: "Isabella Torres",  email: "isabella.t@email.com",  phone: "+1 (321) 555-0922", county: "Brevard",       currentStageId: "completed",         subStatus: "completed",         appliedDate: "Dec 20", lastActivity: "02/14/2026, 11:26:36 AM (EST)",  lastActivityDetail: "Onboarding approved",     daysInStage: 0, currentStep: "Onboarding Complete" },
  { id: "co-3", name: "Daniel Wright",    email: "daniel.w@email.com",    phone: "+1 (813) 555-0933", county: "Hillsborough",  currentStageId: "completed",         subStatus: "completed",         appliedDate: "Jan 3",  lastActivity: "02/18/2026, 11:26:36 AM (EST)",  lastActivityDetail: "Onboarding approved",     daysInStage: 0, currentStep: "Onboarding Complete" },

  // ── Change Requested ─────────────────────────────────
  { id: "cr-1", name: "Olivia Bennett",   email: "olivia.b@email.com",    phone: "+1 (954) 555-0944", county: "Broward",       currentStageId: "profile-docs",      subStatus: "change_requested",  appliedDate: "Jan 28", lastActivity: "02/18/2026, 11:26:36 AM (EST)",  lastActivityDetail: "Change request sent to driver",  daysInStage: 15, currentStep: "Driver's License & SSN", holdReason: "License photo is blurry, please re-upload", lastAgentNote: "DL photo blurry. Flagged front and back for re-upload." },
  { id: "cr-2", name: "Marcus Johnson",   email: "marcus.j@email.com",    phone: "+1 (305) 555-0955", county: "Miami-Dade",    currentStageId: "inspections-certs", subStatus: "change_requested",  appliedDate: "Jan 20", lastActivity: "02/17/2026, 11:26:36 AM (EST)",  lastActivityDetail: "Change request sent to driver",  daysInStage: 23, currentStep: "Vehicle Inspection", holdReason: "Insurance document expired, upload current one", lastAgentNote: "Insurance expired 12/31. Driver notified to upload new card." },

  // ── Rejected (application closed) ────────────────────
  { id: "rj-1", name: "Victor Reese",     email: "victor.r@email.com",    phone: "+1 (561) 555-0966", county: "Palm Beach",    currentStageId: "rejected",          subStatus: "rejected",          appliedDate: "Dec 10", lastActivity: "02/04/2026, 11:26:36 AM (EST)", lastActivityDetail: "Application rejected",       daysInStage: 0, currentStep: "Application Rejected", holdReason: "Failed background check", lastAgentNote: "Background check returned disqualifying findings." },
  { id: "rj-2", name: "Tanya Brooks",     email: "tanya.b@email.com",     phone: "+1 (727) 555-0977", county: "Pinellas",      currentStageId: "rejected",          subStatus: "rejected",          appliedDate: "Dec 5",  lastActivity: "01/30/2026, 11:26:36 AM (EST)", lastActivityDetail: "Application rejected",       daysInStage: 0, currentStep: "Application Rejected", holdReason: "Did not meet age requirement", lastAgentNote: "Under minimum age requirement. Non-recoverable." },
];
