const GITHUB_BASE = "https://github.com/wingz-inc/wingz-react-component-registry/blob/main";

/**
 * Maps component showcase section titles to their source file paths (relative to repo root).
 */
export const COMPONENT_SOURCE_PATHS: Record<string, string> = {
  // UI Primitives
  Accordion: "components/ui/accordion.tsx",
  Alert: "components/ui/alert.tsx",
  Avatar: "components/ui/avatar.tsx",
  Badge: "components/ui/badge.tsx",
  Breadcrumb: "components/ui/breadcrumb.tsx",
  Button: "components/ui/button.tsx",
  Card: "components/ui/card.tsx",
  Checkbox: "components/ui/checkbox.tsx",
  Input: "components/ui/input.tsx",
  Progress: "components/ui/progress.tsx",
  RadioGroup: "components/ui/radio-group.tsx",
  Select: "components/ui/select.tsx",
  Skeleton: "components/ui/skeleton.tsx",
  Slider: "components/ui/slider.tsx",
  Switch: "components/ui/switch.tsx",
  Tabs: "components/ui/tabs.tsx",
  Textarea: "components/ui/textarea.tsx",
  // Overlays
  AlertDialog: "components/ui/alert-dialog.tsx",
  Collapsible: "components/ui/collapsible.tsx",
  Dialog: "components/ui/dialog.tsx",
  DropdownMenu: "components/ui/dropdown-menu.tsx",
  HoverCard: "components/ui/hover-card.tsx",
  Popover: "components/ui/popover.tsx",
  Sheet: "components/ui/sheet.tsx",
  Toggle: "components/ui/toggle.tsx",
  ToggleGroup: "components/ui/toggle-group.tsx",
  Tooltip: "components/ui/tooltip.tsx",
  // Layout & Data
  AspectRatio: "components/ui/aspect-ratio.tsx",
  ScrollArea: "components/ui/scroll-area.tsx",
  Table: "components/ui/table.tsx",
  TablePagination: "components/agent/table-pagination.tsx",
  // Forms
  Calendar: "components/ui/calendar.tsx",
  DatePicker: "components/ui/date-picker.tsx",
  InputOTP: "components/ui/input-otp.tsx",
  PhoneNumberInput: "components/ui/phone-number-input.tsx",
  TimeInput: "components/ui/time-input.tsx",
  // Agent Portal
  "Agent Portal – CommsHistory": "components/agent/comms-history.tsx",
  "Agent Portal – ComposeMessageModal": "components/agent/compose-message-modal.tsx",
  "Agent Portal – DriverTable": "components/agent/driver-table.tsx",
  "Agent Portal – SortableHeader": "components/agent/sortable-header.tsx",
  "Agent Portal – SubmittedFieldsDisplay": "components/agent/submitted-fields-display.tsx",
  // Dispatch Tool
  "Dispatch Tool – ColorLegendModal": "components/dispatch-tool/color-legend-modal.tsx",
  "Dispatch Tool – DateSelector": "components/dispatch-tool/date-selector.tsx",
  "Dispatch Tool – RidePreviewCard": "components/ui/ride-preview-card.tsx",
  "Dispatch Tool – TopNavTabs": "components/dispatch-tool/top-nav-tabs.tsx",
  // Post-Hire Compliance
  "Post-Hire Compliance – EmptyState": "components/post-hire-compliance/post-hire-compliance-empty-state.tsx",
  "Post-Hire Compliance – Header": "components/post-hire-compliance/post-hire-compliance-header.tsx",
  "Post-Hire Compliance – Navigation": "components/post-hire-compliance/post-hire-compliance-navigation.tsx",
  // In-App Announcements
  "In-App Announcements – CollapsibleContent": "components/in-app-announcements/collapsible-content.tsx",
  "In-App Announcements – PhonePreview": "components/in-app-announcements/phone-preview.tsx",
  // Onboarding
  "Onboarding – InterviewScheduler": "components/onboarding/interview-scheduler.tsx",
  "Onboarding – RejectionScreen": "components/onboarding/rejection-screen.tsx",
};

export function getComponentSourceUrl(title: string): string | null {
  const path = COMPONENT_SOURCE_PATHS[title];
  return path ? `${GITHUB_BASE}/${path}` : null;
}
