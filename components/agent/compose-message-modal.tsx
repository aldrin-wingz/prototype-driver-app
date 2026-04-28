"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageSquare,
  X,
  Send,
  Users,
  User,
  ChevronDown,
} from "lucide-react";

export interface MessageRecipient {
  id: string;
  name: string;
  phone: string;
  email: string;
}

const MESSAGE_TEMPLATES = [
  { id: "reminder", label: "Onboarding Reminder", body: "Hi {name}, just a friendly reminder to complete your Wingz driver onboarding. You can resume where you left off by logging in at app.wingz.us. Let us know if you need help!" },
  { id: "docs-needed", label: "Documents Needed", body: "Hi {name}, we noticed some documents are still pending for your Wingz driver application. Please upload the required documents at your earliest convenience. Contact us if you have questions." },
  { id: "interview-schedule", label: "Interview Scheduling", body: "Hi {name}, it's time to schedule your NEMT interview as part of the Wingz onboarding process. Please select an available time slot in your driver portal. We look forward to meeting you!" },
  { id: "hold-notice", label: "Application On Hold", body: "Hi {name}, your Wingz driver application has been placed on hold. Our team will follow up with you shortly regarding the next steps. If you have questions, please reply to this message." },
  { id: "approved", label: "Application Approved", body: "Congratulations {name}! Your Wingz driver application has been approved. Welcome to the team! Please check your email for next steps on getting started with your first ride." },
  { id: "custom", label: "Custom Message", body: "" },
];

interface ComposeMessageModalProps {
  recipients: MessageRecipient[];
  onClose: () => void;
  onSend: (data: {
    recipients: MessageRecipient[];
    channel: "sms" | "email";
    subject?: string;
    body: string;
    templateId?: string;
  }) => void;
}

export function ComposeMessageModal({
  recipients,
  onClose,
  onSend,
}: ComposeMessageModalProps) {
  const [channel, setChannel] = useState<"sms" | "email">("sms");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const isBulk = recipients.length > 1;

  function handleTemplateSelect(templateId: string) {
    const template = MESSAGE_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setBody(template.body);
      if (templateId !== "custom") {
        setSubject(template.label);
      }
    }
    setShowTemplates(false);
  }

  async function handleSend() {
    if (!body.trim()) return;
    setSending(true);
    await new Promise((r) => setTimeout(r, 800));
    onSend({
      recipients,
      channel,
      subject: channel === "email" ? subject : undefined,
      body,
      templateId: selectedTemplate || undefined,
    });
    setSending(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
        onClick={onClose}
        onKeyDown={() => {}}
        role="button"
        tabIndex={-1}
      />

      <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <MessageSquare className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {isBulk ? "Send Bulk Message" : "Send Message"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isBulk ? (
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {recipients.length} recipients selected
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {recipients[0]?.name} -- {recipients[0]?.phone}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Channel
            </label>
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

          {isBulk && (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Recipients
              </label>
              <div className="mt-1.5 flex flex-wrap gap-1.5 max-h-20 overflow-y-auto rounded-lg border border-border p-2">
                {recipients.map((r) => (
                  <span
                    key={r.id}
                    className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-foreground"
                  >
                    {r.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="relative">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Template
            </label>
            <button
              type="button"
              onClick={() => setShowTemplates(!showTemplates)}
              className="mt-1.5 flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-left hover:bg-accent/30 transition-colors"
            >
              <span className={selectedTemplate ? "text-foreground" : "text-muted-foreground"}>
                {selectedTemplate
                  ? MESSAGE_TEMPLATES.find((t) => t.id === selectedTemplate)?.label
                  : "Select a template..."}
              </span>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showTemplates && "rotate-180")} />
            </button>
            {showTemplates && (
              <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-card shadow-lg overflow-hidden">
                {MESSAGE_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleTemplateSelect(t.id)}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-left text-sm hover:bg-accent/50 transition-colors border-b border-border last:border-0",
                      selectedTemplate === t.id && "bg-accent"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{t.label}</p>
                      {t.body && (
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                          {t.body}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {channel === "email" && (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Subject
              </label>
              <Input
                className="mt-1.5"
                placeholder="Email subject..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Message
              </label>
              {body.includes("{name}") && (
                <span className="text-[10px] text-primary font-medium">
                  {"'{{name}}'"}  will be personalized per recipient
                </span>
              )}
            </div>
            <Textarea
              className="mt-1.5 min-h-[120px] text-sm"
              placeholder="Type your message..."
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                if (selectedTemplate !== "custom") setSelectedTemplate("custom");
              }}
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              {channel === "sms" ? `${body.length} / 160 characters` : `${body.length} characters`}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <Button variant="outline" size="sm" onClick={onClose} className="bg-transparent">
            Cancel
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            disabled={!body.trim() || sending}
            onClick={handleSend}
          >
            {sending ? (
              "Sending..."
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                Send {channel === "sms" ? "SMS" : "Email"}
                {isBulk && ` to ${recipients.length}`}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
