import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s*–\s*/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Wingz Component Registry</h1>
          <p className="mt-2 text-muted-foreground">
            Design system and reusable React components for driver portal, agent portal, dispatch tool, and new prototypes.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/components#accordion" className="block transition-opacity hover:opacity-90">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  UI Components
                  <Badge variant="secondary">shadcn/ui</Badge>
                </CardTitle>
                <CardDescription>
                  Primitives (Accordion, Alert, Badge, Button, Card, Input, etc.), overlays (Dialog, Sheet, Tooltip), layout (Table, ScrollArea), forms (DatePicker, PhoneNumberInput, TimeInput). 50+ components.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  <code className="rounded bg-muted px-1 py-0.5">components/ui/</code>
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href={`/components#${slugify("Agent Portal – DriverTable")}`} className="block transition-opacity hover:opacity-90">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Agent Portal
                  <Badge>5 components</Badge>
                </CardTitle>
                <CardDescription>
                  DriverTable, CommsHistory, ComposeMessageModal, SortableHeader, SubmittedFieldsDisplay. TablePagination is the design system standard for tables.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  <code className="rounded bg-muted px-1 py-0.5">components/agent/</code>
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href={`/components#${slugify("Dispatch Tool – DateSelector")}`} className="block transition-opacity hover:opacity-90">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Dispatch Tool
                  <Badge>4 components</Badge>
                </CardTitle>
                <CardDescription>
                  DateSelector, TopNavTabs, ColorLegendModal, RidePreviewCard. Shared nav and date picker across dispatch and post-hire compliance.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  <code className="rounded bg-muted px-1 py-0.5">components/dispatch-tool/</code>, <code className="rounded bg-muted px-1 py-0.5">components/ui/ride-preview-card.tsx</code>
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href={`/components#${slugify("Post-Hire Compliance – EmptyState")}`} className="block transition-opacity hover:opacity-90">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Post-Hire Compliance
                  <Badge>3 components</Badge>
                </CardTitle>
                <CardDescription>
                  PostHireComplianceHeader, PostHireComplianceNavigation, PostHireComplianceEmptyState. Uses ColorLegendModal from dispatch-tool.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  <code className="rounded bg-muted px-1 py-0.5">components/post-hire-compliance/</code>
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href={`/components#${slugify("In-App Announcements – CollapsibleContent")}`} className="block transition-opacity hover:opacity-90">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  In-App Announcements
                  <Badge>2 components</Badge>
                </CardTitle>
                <CardDescription>
                  PhonePreview (iPhone-style announcement preview), CollapsibleContent (expandable content with &quot;Show more&quot;).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  <code className="rounded bg-muted px-1 py-0.5">components/in-app-announcements/</code>
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href={`/components#${slugify("Onboarding – InterviewScheduler")}`} className="block transition-opacity hover:opacity-90">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Onboarding (Driver Portal)
                  <Badge>2 components</Badge>
                </CardTitle>
                <CardDescription>
                  InterviewScheduler, RejectionScreen. Full onboarding flow in wingz-driver-portal.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  <code className="rounded bg-muted px-1 py-0.5">components/onboarding/</code>
                </p>
              </CardContent>
            </Card>
          </Link>

          <Card>
            <CardHeader>
              <CardTitle>Design System</CardTitle>
              <CardDescription>
                Wingz brand colors (primary green #16CFA9, destructive red, warning yellow), tokens, typography (DM Sans). Tailwind config.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                <code className="rounded bg-muted px-1 py-0.5">app/globals.css</code>,{" "}
                <code className="rounded bg-muted px-1 py-0.5">tailwind.config.ts</code>. See{" "}
                <Link href="https://github.com/wingz-inc/wingz-react-component-registry/blob/main/docs/DESIGN-SYSTEM.md" className="underline hover:no-underline">docs/DESIGN-SYSTEM.md</Link>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Utilities & Hooks</CardTitle>
              <CardDescription>
                Shared utilities (phone formatting, dayjs), types, constants. Theme provider, view-only banner. use-mobile, use-toast hooks.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                <code className="rounded bg-muted px-1 py-0.5">lib/</code>, <code className="rounded bg-muted px-1 py-0.5">hooks/</code>, <code className="rounded bg-muted px-1 py-0.5">components/theme-provider.tsx</code>
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-4">
          <Button asChild>
            <Link href="/components">View component showcase</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="https://github.com/wingz-inc/wingz-react-component-registry">
              GitHub
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="https://github.com/wingz-inc/wingz-react-component-registry/blob/main/docs/HOW-TO-USE.md">
              How to use
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
