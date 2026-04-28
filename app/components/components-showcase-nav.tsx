"use client";

import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s*–\s*/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export const NAV_GROUPS = [
  {
    label: "UI Primitives",
    items: [
      "Accordion",
      "Alert",
      "Avatar",
      "Badge",
      "Breadcrumb",
      "Button",
      "Card",
      "Checkbox",
      "Input",
      "Progress",
      "RadioGroup",
      "Select",
      "Skeleton",
      "Slider",
      "Switch",
      "Tabs",
      "Textarea",
    ],
  },
  {
    label: "Overlays",
    items: [
      "AlertDialog",
      "Collapsible",
      "Dialog",
      "DropdownMenu",
      "HoverCard",
      "Popover",
      "Sheet",
      "Toggle",
      "ToggleGroup",
      "Tooltip",
    ],
  },
  {
    label: "Layout & Data",
    items: ["AspectRatio", "ScrollArea", "Table", "TablePagination"],
  },
  {
    label: "Forms",
    items: ["Calendar", "DatePicker", "InputOTP", "PhoneNumberInput", "TimeInput"],
  },
  {
    label: "Agent Portal",
    items: [
      "Agent Portal – CommsHistory",
      "Agent Portal – ComposeMessageModal",
      "Agent Portal – DriverTable",
      "Agent Portal – SortableHeader",
      "Agent Portal – SubmittedFieldsDisplay",
    ],
  },
  {
    label: "Dispatch Tool",
    items: [
      "Dispatch Tool – ColorLegendModal",
      "Dispatch Tool – DateSelector",
      "Dispatch Tool – RidePreviewCard",
      "Dispatch Tool – TopNavTabs",
    ],
  },
  {
    label: "Post-Hire Compliance",
    items: [
      "Post-Hire Compliance – EmptyState",
      "Post-Hire Compliance – Header",
      "Post-Hire Compliance – Navigation",
    ],
  },
  {
    label: "In-App Announcements",
    items: [
      "In-App Announcements – CollapsibleContent",
      "In-App Announcements – PhonePreview",
    ],
  },
  {
    label: "Onboarding",
    items: ["Onboarding – InterviewScheduler", "Onboarding – RejectionScreen"],
  },
] as const;

export function slugifyTitle(title: string): string {
  return slugify(title);
}

export function ComponentsShowcaseNav() {
  return (
    <aside className="sticky top-0 z-10 hidden w-64 shrink-0 border-r border-border bg-background lg:block">
      <div className="flex h-full flex-col">
        <div className="border-b border-border p-4">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to home
          </Link>
        </div>
        <ScrollArea className="flex-1">
          <nav className="p-4 space-y-6">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </h3>
                <ul className="space-y-1">
                  {group.items.map((item) => {
                    const id = slugify(item);
                    return (
                      <li key={id}>
                        <a
                          href={`#${id}`}
                          className="block rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          {item}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </ScrollArea>
      </div>
    </aside>
  );
}
