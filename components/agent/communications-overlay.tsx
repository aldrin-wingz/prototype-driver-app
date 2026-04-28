"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  X,
  ArrowLeft,
  Search,
  Send,
  MessageSquare,
  Phone,
  PhoneOff,
  Mail,
  Bot,
  User,
  PenSquare,
  ChevronDown,
  Info,
  ShieldBan,
} from "lucide-react";
import { useComms, type InboxThread, type InboxMessage } from "@/lib/communications-context";
import { STAGES_META, ALL_DRIVERS } from "@/lib/agent-mock/drivers-data";

// ── SMS Templates ────────────────────────────────────────────────
const SMS_TEMPLATES = [
  {
    id: "welcome",
    label: "Welcome Message",
    content: "Hi {{name}}, welcome to Wingz! We're excited to have you join our team. Your onboarding journey starts now. Reply HELP if you have any questions.",
  },
  {
    id: "document-reminder",
    label: "Document Reminder",
    content: "Hi {{name}}, we're still waiting for some documents from you. Please upload them as soon as possible to continue your onboarding. Check your portal for details.",
  },
  {
    id: "interview-scheduled",
    label: "Interview Scheduled",
    content: "Hi {{name}}, your NEMT interview has been scheduled. Please check your email for the meeting link and time. Looking forward to speaking with you!",
  },
  {
    id: "approval-congrats",
    label: "Approval Congratulations",
    content: "Congratulations {{name}}! You've been approved and are ready to start driving with Wingz. Check your app for available trips. Welcome to the team!",
  },
  {
    id: "follow-up",
    label: "Follow-Up Check",
    content: "Hi {{name}}, just checking in on your onboarding progress. Do you have any questions or need assistance with anything? We're here to help!",
  },
  {
    id: "training-reminder",
    label: "Training Reminder",
    content: "Hi {{name}}, please complete your required training modules in the next 48 hours. Access them through your driver portal. Let us know if you need help!",
  },
];

// ── Helpers ──────────────────────────────────────────────────────
function getStageName(stageId: string) {
  return STAGES_META.find((s) => s.stageId === stageId)?.shortTitle ?? stageId;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// ── Main Overlay ─────────────────────────────────────────────────
export function CommunicationsOverlay() {
  const { view, close } = useComms();

  if (view === "closed") return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-foreground/15 backdrop-blur-sm transition-opacity"
        onClick={close}
        role="button"
        tabIndex={-1}
        onKeyDown={() => {}}
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md flex flex-col bg-card border-l border-border shadow-2xl animate-in slide-in-from-right duration-200">
        {view === "inbox" && <InboxView />}
        {view === "thread" && <ThreadView />}
        {view === "compose" && <ComposeView />}
      </div>
    </>
  );
}

// ── Inbox View ───────────────────────────────────────────────────
function InboxView() {
  const { threads, close, openThread, openCompose } = useComms();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const filtered = threads
    .filter((t) => {
      if (filter === "unread" && t.unreadCount === 0) return false;
      if (search && !t.driverName.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      // Unread first, then by recency (use lastTimestamp string comparison)
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
      return 0;
    });

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <MessageSquare className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Messages</h2>
            <p className="text-[11px] text-muted-foreground">{threads.length} conversations</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => openCompose()}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent transition-colors"
            aria-label="New message"
          >
            <PenSquare className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={close}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Search + filter */}
      <div className="px-4 py-3 flex flex-col gap-2.5 border-b border-border shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search drivers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex gap-1.5">
          {(["all", "unread"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors",
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              {f === "all" ? "All" : "Unread"}
            </button>
          ))}
        </div>
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {search ? "No conversations found" : "No messages yet"}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {search ? "Try a different search term" : "Start a conversation from a driver's profile"}
            </p>
          </div>
        ) : (
          filtered.map((thread) => (
            <ThreadRow key={thread.driverId} thread={thread} onOpen={() => openThread(thread.driverId)} />
          ))
        )}
      </div>
    </>
  );
}

function ThreadRow({ thread, onOpen }: { thread: InboxThread; onOpen: () => void }) {
  const lastMsg = thread.messages[thread.messages.length - 1];
  const isInbound = lastMsg?.direction === "inbound";
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "w-full flex items-start gap-3 px-5 py-3.5 text-left border-b border-border/50 hover:bg-accent/40 transition-colors",
        thread.unreadCount > 0 && "bg-primary/[0.03]"
      )}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold",
          thread.isOptedOut
            ? "bg-destructive/10 text-destructive"
            : thread.unreadCount > 0
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground"
        )}>
          {thread.isOptedOut ? (
            <PhoneOff className="h-4 w-4" />
          ) : (
            getInitials(thread.driverName)
          )}
        </div>
        {thread.unreadCount > 0 && !thread.isOptedOut && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
            {thread.unreadCount}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={cn(
              "text-sm truncate",
              thread.unreadCount > 0 ? "font-semibold text-foreground" : "font-medium text-foreground"
            )}>
              {thread.driverName}
            </span>
            {thread.isOptedOut && (
              <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold bg-destructive/10 text-destructive border border-destructive/20 shrink-0">
                DNC
              </span>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
            {thread.lastTimestamp}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground/70 mb-1">{getStageName(thread.currentStage)}</p>
        <p className={cn(
          "text-xs line-clamp-1",
          thread.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"
        )}>
          {!isInbound && <span className="text-muted-foreground/70">You: </span>}
          {thread.lastMessage}
        </p>
      </div>
    </button>
  );
}

// ── Thread / Chat View ───────────────────────────────────────────
function ThreadView() {
  const { activeDriverId, threads, close, goBack, sendMessage, openCompose } = useComms();
  const thread = threads.find((t) => t.driverId === activeDriverId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [channel, setChannel] = useState<"sms" | "email">("sms");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread?.messages.length]);

  if (!thread) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">Conversation not found</p>
        <Button variant="ghost" size="sm" onClick={goBack} className="mt-2">Go Back</Button>
      </div>
    );
  }

  function handleSend() {
    if (!input.trim() || !activeDriverId) return;
    sendMessage(activeDriverId, input.trim(), channel);
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleTemplateSelect(templateId: string) {
    if (!templateId || templateId === "none") {
      setSelectedTemplate("");
      return;
    }
    
    const template = SMS_TEMPLATES.find((t) => t.id === templateId);
    if (template && thread) {
      // Replace {{name}} with driver's first name
      const firstName = thread.driverName.split(" ")[0] || "there";
      const content = template.content.replace(/\{\{name\}\}/g, firstName);
      setInput(content);
      setSelectedTemplate(templateId);
    }
  }

  // Group messages by date-like sections
  const smsMsgs = thread.messages.filter((m) => m.channel === "sms");
  const emailMsgs = thread.messages.filter((m) => m.channel === "email");

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3 shrink-0">
        <button
          type="button"
          onClick={goBack}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent transition-colors shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold shrink-0",
          thread.isOptedOut ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
        )}>
          {thread.isOptedOut ? <PhoneOff className="h-4 w-4" /> : getInitials(thread.driverName)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground truncate">{thread.driverName}</p>
            {thread.isOptedOut && (
              <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold bg-destructive/10 text-destructive border border-destructive/20 shrink-0">
                DNC
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground truncate">
            {thread.driverPhone} &middot; {getStageName(thread.currentStage)}
          </p>
        </div>
        <button
          type="button"
          onClick={close}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent transition-colors shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* DNC Warning Banner */}
      {thread.isOptedOut && (
        <div className="border-b border-destructive/20 bg-destructive/5 px-4 py-3 shrink-0">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 shrink-0 mt-0.5">
              <ShieldBan className="h-4 w-4 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-destructive">Do Not Contact (DNC)</p>
              <p className="text-[11px] text-destructive/80 mt-0.5 leading-relaxed">
                This driver has opted out of automated communications. Sending messages is disabled to comply with DNC regulations.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Channel tabs */}
      <div className="flex border-b border-border shrink-0">
        {(["sms", "email"] as const).map((ch) => {
          const count = ch === "sms" ? smsMsgs.length : emailMsgs.length;
          return (
            <button
              key={ch}
              type="button"
              onClick={() => setChannel(ch)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2",
                channel === ch
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {ch === "sms" ? <Phone className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
              {ch === "sms" ? "SMS" : "Email"}
              {count > 0 && (
                <span className="ml-0.5 text-[10px] font-semibold bg-muted rounded-full px-1.5 py-0.5 text-muted-foreground">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {channel === "sms" ? (
          <SmsThread messages={smsMsgs} driverName={thread.driverName} />
        ) : (
          <EmailThread messages={emailMsgs} driverName={thread.driverName} />
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Compose bar */}
      <div className="border-t border-border px-4 py-3 shrink-0">
        {thread.isOptedOut ? (
          /* DNC blocked state - clear visual indicator */
          <div className="flex items-center gap-3 rounded-lg border border-dashed border-destructive/30 bg-destructive/5 px-4 py-3">
            <PhoneOff className="h-4 w-4 text-destructive/60 shrink-0" />
            <p className="text-xs text-destructive/80">
              Messaging is disabled for this driver.
              <span className="text-destructive/60 ml-1">DNC opt-out active.</span>
            </p>
          </div>
        ) : (
          <>
            {/* Template selector for SMS */}
            {channel === "sms" && (
              <div className="mb-3">
                <Select value={selectedTemplate || "none"} onValueChange={handleTemplateSelect}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Choose a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-muted-foreground">No template</span>
                    </SelectItem>
                    {SMS_TEMPLATES.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-end gap-2">
              <Textarea
                placeholder={channel === "sms" ? "Type an SMS..." : "Type an email..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[80px] max-h-[200px] resize-none text-sm flex-1"
                rows={3}
              />
              <Button
                size="sm"
                className="h-9 w-9 p-0 shrink-0"
                disabled={!input.trim()}
                onClick={handleSend}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              {channel === "sms" ? `${input.length}/160 chars` : `Sending as email to ${thread.driverEmail}`}
              <span className="ml-1">&middot; Press Enter to send</span>
            </p>
          </>
        )}
      </div>
    </>
  );
}

// ── SMS chat bubbles ─────────────────────────────────────────────
function SmsThread({ messages, driverName }: { messages: InboxMessage[]; driverName: string }) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <Phone className="h-8 w-8 text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground">No SMS messages yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Send the first message below</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {messages.map((msg) => {
        const isOutbound = msg.direction === "outbound" || msg.direction === "automated";
        return (
          <div key={msg.id} className={cn("flex flex-col gap-0.5", isOutbound ? "items-end" : "items-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                isOutbound
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted text-foreground rounded-bl-md"
              )}
            >
              {msg.body}
            </div>
            <div className="flex items-center gap-1.5 px-1">
              <span className="text-[10px] text-muted-foreground">
                {msg.timestamp}
              </span>
              {msg.agent && (
                <span className="text-[10px] text-muted-foreground/60">&middot; {msg.agent}</span>
              )}
              {msg.direction === "automated" && (
                <Bot className="h-2.5 w-2.5 text-muted-foreground/50" />
              )}
              {msg.direction === "inbound" && (
                <span className="text-[10px] text-muted-foreground/60">{driverName.split(" ")[0]}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Email thread view ────────────────────────────────────────────
function EmailThread({ messages, driverName }: { messages: InboxMessage[]; driverName: string }) {
  const [expandedId, setExpandedId] = useState<string | null>(
    messages.length > 0 ? messages[messages.length - 1].id : null
  );

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <Mail className="h-8 w-8 text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground">No email messages yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Switch to SMS or send an email below</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {messages.map((msg) => {
        const isExpanded = expandedId === msg.id;
        const isOutbound = msg.direction !== "inbound";
        return (
          <button
            key={msg.id}
            type="button"
            onClick={() => setExpandedId(isExpanded ? null : msg.id)}
            className="w-full text-left rounded-lg border border-border bg-card hover:bg-accent/20 transition-colors"
          >
            <div className="flex items-center gap-3 px-3.5 py-2.5">
              <div className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold shrink-0",
                isOutbound ? "bg-primary/10 text-primary" : "bg-accent text-foreground"
              )}>
                {isOutbound ? (msg.direction === "automated" ? <Bot className="h-3 w-3" /> : <User className="h-3 w-3" />) : getInitials(driverName)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-foreground truncate">
                    {msg.subject || "No Subject"}
                  </p>
                  <ChevronDown className={cn("h-3 w-3 text-muted-foreground shrink-0 transition-transform", isExpanded && "rotate-180")} />
                </div>
                {!isExpanded && (
                  <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{msg.body}</p>
                )}
              </div>
            </div>
            {isExpanded && (
              <div className="px-3.5 pb-3 border-t border-border/50 pt-2.5">
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-2">
                  <span>{msg.timestamp}</span>
                  {msg.agent && <span>&middot; {msg.agent}</span>}
                  <span className="capitalize">{msg.status}</span>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                </div>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Compose View (new conversation / new message to driver) ──────
function ComposeView() {
  const { activeDriverId, preSelectedDriverIds, goBack, close, sendMessage, threads } = useComms();
  const [channel, setChannel] = useState<"sms" | "email">("sms");
  const [body, setBody] = useState("");
  const [subject, setSubject] = useState("");
  const [sending, setSending] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedDriverIds, setSelectedDriverIds] = useState<string[]>(
    preSelectedDriverIds.length > 0 ? preSelectedDriverIds : activeDriverId ? [activeDriverId] : []
  );
  const [recipientSearch, setRecipientSearch] = useState("");
  const [recipientFocused, setRecipientFocused] = useState(false);
  const recipientInputRef = useRef<HTMLInputElement>(null);
  const recipientDropdownRef = useRef<HTMLDivElement>(null);

  // If we have a driver context, show their info
  const thread = activeDriverId ? threads.find((t) => t.driverId === activeDriverId) : null;
  
  // Get all available drivers from ALL_DRIVERS
  const availableDrivers = ALL_DRIVERS.filter((d) => d.id && d.name && d.phone);
  
  // Filter drivers based on search
  const filteredDrivers = availableDrivers.filter((d) => {
    const q = recipientSearch.toLowerCase();
    if (!q) return true;
    return (
      d.name.toLowerCase().includes(q) ||
      d.phone.includes(q) ||
      d.email.toLowerCase().includes(q)
    );
  });
  
  // Selected driver objects for rendering chips
  const selectedDrivers = selectedDriverIds
    .map((id) => availableDrivers.find((d) => d.id === id))
    .filter(Boolean) as typeof availableDrivers;

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        recipientDropdownRef.current &&
        !recipientDropdownRef.current.contains(e.target as Node)
      ) {
        setRecipientFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const templates = [
    { id: "reminder", label: "Onboarding Reminder", body: `Hi${thread ? ` ${thread.driverName.split(" ")[0]}` : ""}, just a friendly reminder to complete your Wingz driver onboarding. You can resume where you left off by logging in at app.wingz.us.` },
    { id: "docs-needed", label: "Documents Needed", body: `Hi${thread ? ` ${thread.driverName.split(" ")[0]}` : ""}, we noticed some documents are still pending for your application. Please upload them at your earliest convenience.` },
    { id: "interview", label: "Interview Scheduling", body: `Hi${thread ? ` ${thread.driverName.split(" ")[0]}` : ""}, it's time to schedule your NEMT interview. Please select an available time slot in your driver portal.` },
    { id: "hold-notice", label: "Application On Hold", body: `Hi${thread ? ` ${thread.driverName.split(" ")[0]}` : ""}, your application has been placed on hold. Our team will follow up shortly regarding next steps.` },
  ];

  // Compute DNC stats for selected drivers
  const selectedDriversData = ALL_DRIVERS.filter(d => selectedDriverIds.includes(d.id));
  const optedOutSelected = selectedDriversData.filter(d => d.isOptedOut);
  const eligibleSelected = selectedDriversData.filter(d => !d.isOptedOut);

  async function handleSend() {
    if (!body.trim() || eligibleSelected.length === 0) return;
    
    setSending(true);
    await new Promise((r) => setTimeout(r, 400));
    
    // Send only to eligible drivers (not opted out)
    for (const driver of eligibleSelected) {
      sendMessage(driver.id, body.trim(), channel);
    }
    
    setSending(false);
    goBack();
  }
  
  function toggleDriver(driverId: string) {
    setSelectedDriverIds((prev) =>
      prev.includes(driverId)
        ? prev.filter((id) => id !== driverId)
        : [...prev, driverId]
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3 shrink-0">
        <button
          type="button"
          onClick={goBack}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent transition-colors shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">New Message</p>
          <p className="text-[10px] text-muted-foreground">Drivers on the DNC list will be automatically excluded</p>
        </div>
        <button
          type="button"
          onClick={close}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent transition-colors shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4">
        {/* Recipient selector */}
        <div ref={recipientDropdownRef} className="relative">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">To</label>
          
          {/* Selected chips + search input */}
          <div
            className={cn(
              "mt-1.5 flex flex-wrap items-center gap-1.5 rounded-lg border bg-background px-2.5 py-2 cursor-text transition-colors min-h-[42px]",
              recipientFocused ? "border-primary ring-1 ring-primary/20" : "border-border"
            )}
            onClick={() => {
              recipientInputRef.current?.focus();
              setRecipientFocused(true);
            }}
          >
            {selectedDrivers.map((driver) => (
              <Badge
                key={driver.id}
                variant="secondary"
                className={cn(
                  "gap-1 pl-2 pr-1 py-0.5 text-[11px] font-medium shrink-0",
                  driver.isOptedOut && "bg-destructive/10 text-destructive border border-destructive/20"
                )}
              >
                {driver.isOptedOut && <PhoneOff className="h-2.5 w-2.5" />}
                {driver.name}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleDriver(driver.id);
                  }}
                  className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full hover:bg-muted-foreground/20 transition-colors"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ))}
            <input
              ref={recipientInputRef}
              type="text"
              placeholder={selectedDriverIds.length === 0 ? "Search drivers by name, phone, or email..." : "Add more..."}
              value={recipientSearch}
              onChange={(e) => setRecipientSearch(e.target.value)}
              onFocus={() => setRecipientFocused(true)}
              className="flex-1 min-w-[120px] bg-transparent text-xs outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Dropdown list */}
          {recipientFocused && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-card shadow-lg max-h-[220px] overflow-y-auto">
              {/* Select all / clear */}
              {filteredDrivers.length > 0 && (
                <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                    {filteredDrivers.length} driver{filteredDrivers.length !== 1 ? "s" : ""}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const allIds = filteredDrivers.map((d) => d.id);
                        setSelectedDriverIds((prev) => [...new Set([...prev, ...allIds])]);
                      }}
                      className="text-[10px] font-medium text-primary hover:underline"
                    >
                      Select all
                    </button>
                    {selectedDriverIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedDriverIds([])}
                        className="text-[10px] font-medium text-muted-foreground hover:text-foreground hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              {filteredDrivers.map((driver) => {
                const isSelected = selectedDriverIds.includes(driver.id);
                return (
                  <div
                    key={driver.id}
                    onClick={() => toggleDriver(driver.id)}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors cursor-pointer",
                      isSelected ? "bg-primary/5" : "hover:bg-accent/50",
                      driver.isOptedOut && "opacity-60"
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      className="shrink-0 pointer-events-none"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium text-foreground truncate">{driver.name}</p>
                        {driver.isOptedOut && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-destructive/50 text-destructive shrink-0">
                            DNC
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{driver.phone} &middot; {driver.email}</p>
                    </div>
                    {isSelected && (
                      <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                );
              })}
              
              {filteredDrivers.length === 0 && (
                <div className="px-4 py-6 text-center">
                  <p className="text-xs text-muted-foreground">No drivers matching &ldquo;{recipientSearch}&rdquo;</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* DNC Info Box - shown when any opted-out driver is selected */}
        {optedOutSelected.length > 0 && (
          <div className="rounded-lg border border-muted bg-muted/30 p-3">
            <div className="flex items-start gap-2.5">
              <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-semibold text-foreground">What is DNC?</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">
                  DNC (Do Not Contact) drivers have opted out of receiving automated messages via SMS or email. 
                  This is a legally binding preference. Messages will only be sent to eligible recipients.
                  Drivers marked with a DNC badge below will be automatically excluded.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Channel selector */}
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Channel</label>
          <div className="mt-1.5 flex rounded-lg border border-border overflow-hidden">
            {(["sms", "email"] as const).map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => setChannel(ch)}
                className={cn(
                  "flex-1 py-2 text-xs font-medium transition-colors",
                  channel === ch
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-accent"
                )}
              >
                {ch === "sms" ? "SMS" : "Email"}
              </button>
            ))}
          </div>
        </div>

        {/* Template selector */}
        <div className="relative">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Quick Template</label>
          <button
            type="button"
            onClick={() => setShowTemplates(!showTemplates)}
            className="mt-1.5 flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-left hover:bg-accent/30 transition-colors"
          >
            <span className="text-muted-foreground text-xs">Select a template...</span>
            <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", showTemplates && "rotate-180")} />
          </button>
          {showTemplates && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-card shadow-lg overflow-hidden">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setBody(t.body);
                    setSubject(t.label);
                    setShowTemplates(false);
                  }}
                  className="flex w-full flex-col px-4 py-2.5 text-left hover:bg-accent/50 transition-colors border-b border-border/50 last:border-0"
                >
                  <span className="text-xs font-medium text-foreground">{t.label}</span>
                  <span className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{t.body}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Subject (email only) */}
        {channel === "email" && (
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Subject</label>
            <Input
              className="mt-1.5"
              placeholder="Email subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
        )}

        {/* Message body */}
        <div className="flex-1 flex flex-col">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Message</label>
          <Textarea
            className="mt-1.5 flex-1 min-h-[140px] text-sm resize-none"
            placeholder="Type your message..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <p className="mt-1 text-[10px] text-muted-foreground">
            {channel === "sms" ? `${body.length}/160 characters` : `${body.length} characters`}
          </p>
        </div>
      </div>

      {/* DNC Warning Panel - shown above footer when opted-out drivers are selected */}
      {optedOutSelected.length > 0 && (
        <div className="border-t border-destructive/20 bg-destructive/5 px-5 py-3 shrink-0">
          <div className="flex items-start gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-destructive/10 shrink-0 mt-0.5">
              <ShieldBan className="h-3.5 w-3.5 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-destructive">
                {optedOutSelected.length} recipient{optedOutSelected.length > 1 ? "s" : ""} on DNC list
              </p>
              <p className="text-[10px] text-destructive/70 mt-0.5 leading-relaxed">
                {optedOutSelected.map(d => d.name).join(", ")} will not receive this message.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border px-5 py-3 shrink-0">
        <Button variant="outline" size="sm" onClick={goBack} className="bg-transparent text-xs">
          Cancel
        </Button>
        <Button
          size="sm"
          className="gap-1.5 text-xs"
          disabled={!body.trim() || sending || eligibleSelected.length === 0}
          onClick={handleSend}
        >
          {sending ? (
            "Sending..."
          ) : (
            <>
              <Send className="h-3.5 w-3.5" />
              Send {channel === "sms" ? "SMS" : "Email"}
              {eligibleSelected.length > 0 && (
                <span className="text-primary-foreground/70">
                  to {eligibleSelected.length}
                </span>
              )}
            </>
          )}
        </Button>
      </div>
    </>
  );
}
