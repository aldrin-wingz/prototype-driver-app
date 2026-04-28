"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PhoneNumberInput } from "@/components/ui/phone-number-input";
import { TimeInput } from "@/components/ui/time-input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Calendar } from "@/components/ui/calendar";
import { DatePicker } from "@/components/ui/date-picker";
import { DriverTable } from "@/components/agent/driver-table";
import { TablePagination } from "@/components/agent/table-pagination";
import { ComposeMessageModal } from "@/components/agent/compose-message-modal";
import { SubmittedFieldsDisplay } from "@/components/agent/submitted-fields-display";
import { CommsHistory } from "@/components/agent/comms-history";
import { SortableHeader } from "@/components/agent/sortable-header";
import { InterviewScheduler } from "@/components/onboarding/interview-scheduler";
import { RejectionScreen } from "@/components/onboarding/rejection-screen";
import { DateSelector } from "@/components/dispatch-tool/date-selector";
import { TopNavTabs } from "@/components/dispatch-tool/top-nav-tabs";
import { ColorLegendModal } from "@/components/dispatch-tool/color-legend-modal";
import { PostHireComplianceHeader } from "@/components/post-hire-compliance/post-hire-compliance-header";
import { PostHireComplianceNavigation } from "@/components/post-hire-compliance/post-hire-compliance-navigation";
import { PostHireComplianceEmptyState } from "@/components/post-hire-compliance/post-hire-compliance-empty-state";
import { CollapsibleContent as AnnouncementCollapsibleContent } from "@/components/in-app-announcements/collapsible-content";
import { PhonePreview } from "@/components/in-app-announcements/phone-preview";
import { RidePreviewCard, ApiRidePreviewCard } from "@/components/ui/ride-preview-card";
import { ALL_DRIVERS } from "@/lib/agent-mock/drivers-data";
import type { DriverRejection } from "@/lib/api/types";
import { ComponentsShowcaseNav, slugifyTitle } from "./components-showcase-nav";
import { getComponentSourceUrl } from "./component-source-paths";
import { ExternalLink } from "lucide-react";

function Section({
  title,
  id,
  children,
}: {
  title: string;
  id?: string;
  children: React.ReactNode;
}) {
  const sectionId = id ?? slugifyTitle(title);
  const sourceUrl = getComponentSourceUrl(title);
  return (
    <section id={sectionId} className="scroll-mt-24">
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-xl font-semibold">{title}</h2>
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            title="View source on GitHub"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Source
          </a>
        )}
      </div>
      {children}
    </section>
  );
}

/**
 * Component showcase — VIEW ONLY.
 * Do not use this page as context when building other projects.
 * Use the source code from the repository.
 */
const sampleCommsEntries = [
  {
    id: "1",
    timestamp: "2026-03-13T07:57:28.000Z",
    channel: "sms" as const,
    direction: "outbound" as const,
    from: "Agent",
    to: "+1 (555) 123-4567",
    body: "Reminder to complete onboarding.",
    status: "delivered" as const,
  },
  {
    id: "2",
    timestamp: "2026-03-13T08:12:15.000Z",
    channel: "email" as const,
    direction: "inbound" as const,
    from: "driver@example.com",
    to: "agent@wingz.com",
    subject: "Re: Documents",
    body: "I've uploaded the documents.",
    status: "delivered" as const,
  },
];

export default function ComponentsPage() {
  const [sliderVal, setSliderVal] = useState([50]);
  const [collapsibleOpen, setCollapsibleOpen] = useState(false);
  const [phoneValue, setPhoneValue] = useState("");
  const [timeValue, setTimeValue] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [colorLegendOpen, setColorLegendOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => new Date("2026-03-13"));

  const sampleRejection: DriverRejection = {
    ruleId: "demo",
    type: "manual",
    recoverable: true,
    reason: "FileWarning",
    message: "Document verification failed",
    description: "The uploaded document could not be verified.",
    rejectedAt: "2026-03-13T07:45:00.000Z",
  };

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden">
        <ComponentsShowcaseNav />
        <main className="min-h-0 flex-1 overflow-auto">
          <div className="mx-auto max-w-4xl space-y-12 p-6 lg:p-8 pt-6 lg:pt-8">
            <div className="lg:hidden border-b border-border pb-4 mb-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/">← Back to home</Link>
              </Button>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Component Showcase</h1>
              <p className="mt-2 text-muted-foreground">
                Visual reference only. Use the source code in the repo for implementation.
              </p>
            </div>

          <Section title="Accordion">
            <Accordion type="single" collapsible className="max-w-md">
              <AccordionItem value="item-1">
                <AccordionTrigger>Is it accessible?</AccordionTrigger>
                <AccordionContent>Yes. It uses Radix UI primitives.</AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>Is it styled?</AccordionTrigger>
                <AccordionContent>Yes. It uses Tailwind CSS.</AccordionContent>
              </AccordionItem>
            </Accordion>
          </Section>

          <Separator />

          <Section title="Alert">
            <div className="space-y-4 max-w-md">
              <Alert>
                <AlertTitle>Default alert</AlertTitle>
                <AlertDescription>This is a default alert message.</AlertDescription>
              </Alert>
              <Alert variant="destructive">
                <AlertTitle>Destructive</AlertTitle>
                <AlertDescription>This is a destructive alert.</AlertDescription>
              </Alert>
            </div>
          </Section>

          <Separator />

          <Section title="Avatar">
            <div className="flex gap-4">
              <Avatar>
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
              <Avatar>
                <AvatarFallback>AB</AvatarFallback>
              </Avatar>
            </div>
          </Section>

          <Separator />

          <Section title="Badge">
            <div className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge variant="outline">Outline</Badge>
            </div>
          </Section>

          <Separator />

          <Section title="Breadcrumb">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="#">Home</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="#">Components</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </Section>

          <Separator />

          <Section title="Button">
            <div className="flex flex-wrap gap-3">
              <Button>Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
              <Button size="sm">Small</Button>
              <Button size="lg">Large</Button>
            </div>
          </Section>

          <Separator />

          <Section title="Card">
            <Card className="max-w-md">
              <CardHeader>
                <CardTitle>Card Title</CardTitle>
                <CardDescription>Card description goes here.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Card content with some example text.</p>
              </CardContent>
            </Card>
          </Section>

          <Separator />

          <Section title="Checkbox">
            <div className="flex items-center space-x-2">
              <Checkbox id="demo-checkbox" />
              <Label htmlFor="demo-checkbox">Accept terms</Label>
            </div>
          </Section>

          <Separator />

          <Section title="Input">
            <div className="max-w-md space-y-2">
              <Label htmlFor="demo-input">Label</Label>
              <Input id="demo-input" placeholder="Placeholder text" />
            </div>
          </Section>

          <Separator />

          <Section title="Progress">
            <div className="max-w-md space-y-2">
              <Progress value={33} />
              <Progress value={66} />
              <Progress value={100} />
            </div>
          </Section>

          <Separator />

          <Section title="RadioGroup">
            <RadioGroup defaultValue="option1" className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="option1" id="r1" />
                <Label htmlFor="r1">Option 1</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="option2" id="r2" />
                <Label htmlFor="r2">Option 2</Label>
              </div>
            </RadioGroup>
          </Section>

          <Separator />

          <Section title="Select">
            <Select>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="a">Option A</SelectItem>
                <SelectItem value="b">Option B</SelectItem>
                <SelectItem value="c">Option C</SelectItem>
              </SelectContent>
            </Select>
          </Section>

          <Separator />

          <Section title="Skeleton">
            <div className="max-w-md space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </Section>

          <Separator />

          <Section title="Slider">
            <div className="max-w-md">
              <Slider value={sliderVal} onValueChange={setSliderVal} max={100} step={1} />
            </div>
          </Section>

          <Separator />

          <Section title="Switch">
            <div className="flex items-center space-x-2">
              <Switch id="demo-switch" />
              <Label htmlFor="demo-switch">Enable notifications</Label>
            </div>
          </Section>

          <Separator />

          <Section title="Tabs">
            <Tabs defaultValue="tab1" className="max-w-md">
              <TabsList>
                <TabsTrigger value="tab1">Tab 1</TabsTrigger>
                <TabsTrigger value="tab2">Tab 2</TabsTrigger>
                <TabsTrigger value="tab3">Tab 3</TabsTrigger>
              </TabsList>
              <TabsContent value="tab1" className="rounded-md border p-4">
                Content for tab 1
              </TabsContent>
              <TabsContent value="tab2" className="rounded-md border p-4">
                Content for tab 2
              </TabsContent>
              <TabsContent value="tab3" className="rounded-md border p-4">
                Content for tab 3
              </TabsContent>
            </Tabs>
          </Section>

          <Separator />

          <Section title="Textarea">
            <Textarea placeholder="Type your message here." className="max-w-md" />
          </Section>

          <Separator />

          <Section title="AlertDialog">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">Open Alert Dialog</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction>Continue</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </Section>

          <Separator />

          <Section title="Collapsible">
            <Collapsible open={collapsibleOpen} onOpenChange={setCollapsibleOpen} className="max-w-md">
              <CollapsibleTrigger asChild>
                <Button variant="outline">{collapsibleOpen ? "Collapse" : "Expand"}</Button>
              </CollapsibleTrigger>
              <CollapsibleContent>Collapsible content goes here.</CollapsibleContent>
            </Collapsible>
          </Section>

          <Separator />

          <Section title="Dialog">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Open Dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Dialog Title</DialogTitle>
                  <DialogDescription>Dialog description.</DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>
          </Section>

          <Separator />

          <Section title="DropdownMenu">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Open Menu</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Section>

          <Separator />

          <Section title="HoverCard">
            <HoverCard>
              <HoverCardTrigger asChild>
                <Button variant="outline">Hover for card</Button>
              </HoverCardTrigger>
              <HoverCardContent>Hover card content</HoverCardContent>
            </HoverCard>
          </Section>

          <Separator />

          <Section title="Popover">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">Open Popover</Button>
              </PopoverTrigger>
              <PopoverContent>Popover content</PopoverContent>
            </Popover>
          </Section>

          <Separator />

          <Section title="Sheet">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">Open Sheet</Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Sheet Title</SheetTitle>
                  <SheetDescription>Sheet description.</SheetDescription>
                </SheetHeader>
              </SheetContent>
            </Sheet>
          </Section>

          <Separator />

          <Section title="Tooltip">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">Hover me</Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Tooltip content</p>
              </TooltipContent>
            </Tooltip>
          </Section>

          <Separator />

          <Section title="Toggle">
            <div className="flex gap-2">
              <Toggle>Toggle</Toggle>
              <Toggle variant="outline">Outline</Toggle>
            </div>
          </Section>

          <Separator />

          <Section title="ToggleGroup">
            <ToggleGroup type="single">
              <ToggleGroupItem value="a">A</ToggleGroupItem>
              <ToggleGroupItem value="b">B</ToggleGroupItem>
              <ToggleGroupItem value="c">C</ToggleGroupItem>
            </ToggleGroup>
          </Section>

          <Separator />

          <Section title="AspectRatio">
            <div className="max-w-[200px]">
              <AspectRatio ratio={16 / 9}>
                <div className="flex h-full w-full items-center justify-center rounded-md bg-muted">
                  <span className="text-sm text-muted-foreground">16:9</span>
                </div>
              </AspectRatio>
            </div>
          </Section>

          <Separator />

          <Section title="ScrollArea">
            <ScrollArea className="h-24 w-48 rounded-md border">
              <div className="p-4 space-y-2">
                <p>Line 1</p>
                <p>Line 2</p>
                <p>Line 3</p>
                <p>Line 4</p>
                <p>Line 5</p>
              </div>
            </ScrollArea>
          </Section>

          <Separator />

          <Section title="Table">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Row 1</TableCell>
                  <TableCell>Active</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Row 2</TableCell>
                  <TableCell>Pending</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Section>

          <Separator />

          <Section title="TablePagination">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Standard pagination for tables and lists. Use <code className="rounded bg-muted px-1">itemLabel</code> for context.
              </p>
              <div className="rounded-md border">
                <TablePagination
                  currentPage={1}
                  totalItems={100}
                  onPageChange={() => {}}
                  pageSize={20}
                  itemLabel="drivers"
                />
              </div>
              <div className="rounded-md border">
                <TablePagination
                  currentPage={2}
                  totalItems={45}
                  onPageChange={() => {}}
                  pageSize={25}
                  itemLabel="announcements"
                />
              </div>
            </div>
          </Section>

          <Separator />

          <Section title="Calendar">
            <Calendar mode="single" className="rounded-md border" />
          </Section>

          <Separator />

          <Section title="DatePicker">
            <div className="max-w-[200px]">
              <DatePicker value="" onChange={() => {}} placeholder="Pick a date" />
            </div>
          </Section>

          <Separator />

          <Section title="InputOTP">
            <InputOTP maxLength={6}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </Section>

          <Separator />

          <Section title="PhoneNumberInput">
            <div className="max-w-[240px]">
              <PhoneNumberInput value={phoneValue} onChange={setPhoneValue} label="Phone" />
            </div>
          </Section>

          <Separator />

          <Section title="TimeInput">
            <div className="max-w-[200px]">
              <TimeInput value={timeValue} onChange={setTimeValue} />
            </div>
          </Section>

          <Separator />

          <Section title="Agent Portal – CommsHistory">
            <div className="max-w-md">
              <CommsHistory entries={sampleCommsEntries} />
            </div>
          </Section>

          <Separator />

          <Section title="Agent Portal – ComposeMessageModal">
            <Button variant="outline" onClick={() => setComposeOpen(true)}>
              Open Compose Modal
            </Button>
            {composeOpen && (
              <ComposeMessageModal
                recipients={[{ id: "1", name: "Demo Driver", phone: "+15551234567", email: "demo@example.com" }]}
                onClose={() => setComposeOpen(false)}
                onSend={() => setComposeOpen(false)}
              />
            )}
          </Section>

          <Separator />

          <Section title="Agent Portal – DriverTable">
            <div className="space-y-4">
              <div className="rounded-md border">
                <DriverTable
                  drivers={ALL_DRIVERS.slice(0, 4)}
                  showPagination={false}
                  linkToStage={false}
                />
              </div>
            </div>
          </Section>

          <Separator />

          <Section title="Agent Portal – SortableHeader">
            <div className="flex gap-4">
              <SortableHeader
                label="Name"
                sortKey="name"
                currentSort="name"
                sortDesc={true}
                onSort={() => {}}
              />
              <SortableHeader
                label="Status"
                sortKey="status"
                currentSort="name"
                sortDesc={true}
                onSort={() => {}}
              />
            </div>
          </Section>

          <Separator />

          <Section title="Agent Portal – SubmittedFieldsDisplay">
            <SubmittedFieldsDisplay
              fields={[
                { label: "First Name", value: "Jane" },
                { label: "Last Name", value: "Doe" },
                { label: "Email", value: "jane@example.com" },
              ]}
            />
          </Section>

          <Separator />

          <Section title="Dispatch Tool – ColorLegendModal">
            <Button variant="outline" onClick={() => setColorLegendOpen(true)}>
              Open Color Legend
            </Button>
            <ColorLegendModal isOpen={colorLegendOpen} onClose={() => setColorLegendOpen(false)} />
          </Section>

          <Separator />

          <Section title="Dispatch Tool – DateSelector">
            <DateSelector
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              placeholder="Select date"
            />
          </Section>

          <Separator />

          <Section title="Dispatch Tool – RidePreviewCard">
            <div className="max-w-xs space-y-2">
              <RidePreviewCard
                ride={{
                  id_ride: 1,
                  id_group_ride: "GR-001",
                  start_time: "2025-03-13T09:00:00Z",
                  end_time: "2025-03-13T09:30:00Z",
                  leg: "A",
                  rider_first_name: "Jane",
                  rider_last_name: "Doe",
                  ride_type: "scheduled",
                  local_timezone: "America/New_York",
                  pickup_address: "123 Main St",
                  dropoff_address: "456 Oak Ave",
                }}
              />
            </div>
          </Section>

          <Separator />

          <Section title="Dispatch Tool – TopNavTabs">
            <TopNavTabs tabs={[{ href: "/", label: "Dispatch" }, { href: "/components", label: "Components" }]} />
          </Section>

          <Separator />

          <Section title="Post-Hire Compliance – EmptyState">
            <PostHireComplianceEmptyState />
          </Section>

          <Separator />

          <Section title="Post-Hire Compliance – Header">
            <PostHireComplianceHeader />
          </Section>

          <Separator />

          <Section title="Post-Hire Compliance – Navigation">
            <PostHireComplianceNavigation />
          </Section>

          <Separator />

          <Section title="In-App Announcements – CollapsibleContent">
            <div className="max-w-md">
              <AnnouncementCollapsibleContent
                content="This is a long piece of content that will be truncated with a Show more button. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
              />
            </div>
          </Section>

          <Separator />

          <Section title="In-App Announcements – PhonePreview">
            <div className="max-w-[200px]">
              <PhonePreview
                title="Sample Announcement"
                content="Your message here."
                actions={[{ label: "Got it", type: "dismiss" }, { label: "Later", type: "dismiss" }]}
              />
            </div>
          </Section>

          <Separator />

          <Section title="Onboarding – InterviewScheduler">
            <div className="max-w-md">
              <InterviewScheduler value="" onChange={() => {}} />
            </div>
          </Section>

          <Separator />

          <Section title="Onboarding – RejectionScreen">
            <div className="rounded-md border p-4">
              <RejectionScreen
                rejection={sampleRejection}
                driverName="Demo Driver"
                onRetry={() => {}}
              />
            </div>
          </Section>

          <Separator />

          <p className="text-sm text-muted-foreground">
            Additional components (carousel, chart, command, context-menu, drawer, form, menubar,
            navigation-menu, resizable, sidebar, sonner) require more setup. See{" "}
            <code className="rounded bg-muted px-1">components/ui/</code>.
          </p>

            <div className="pt-8">
              <Button variant="outline" asChild>
                <Link href="/">Back to home</Link>
              </Button>
            </div>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
