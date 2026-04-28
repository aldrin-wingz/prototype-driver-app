"use client";

import { cn } from "@/lib/utils";
import {
  MessageSquare,
  Mail,
  Phone,
  Bot,
  User,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import { useState } from "react";

export interface CommsEntry {
  id: string;
  timestamp: string;
  channel: "sms" | "email" | "system";
  direction: "outbound" | "inbound" | "automated";
  from: string;
  to: string;
  subject?: string;
  body: string;
  templateId?: string;
  status: "delivered" | "sent" | "failed" | "pending";
  agent?: string;
}

const CHANNEL_CONFIG = {
  sms: { icon: Phone, label: "SMS", color: "text-primary" },
  email: { icon: Mail, label: "Email", color: "text-primary" },
  system: { icon: Bot, label: "System", color: "text-muted-foreground" },
};

const DIRECTION_CONFIG = {
  outbound: { icon: User, label: "Agent", badgeClass: "bg-primary/10 text-primary" },
  inbound: { icon: User, label: "Driver", badgeClass: "bg-accent text-foreground" },
  automated: { icon: Bot, label: "Automated", badgeClass: "bg-muted text-muted-foreground" },
};

const STATUS_CONFIG = {
  delivered: { label: "Delivered", dotClass: "bg-primary" },
  sent: { label: "Sent", dotClass: "bg-amber-500" },
  failed: { label: "Failed", dotClass: "bg-red-500" },
  pending: { label: "Pending", dotClass: "bg-muted-foreground" },
};

interface CommsHistoryProps {
  entries: CommsEntry[];
  className?: string;
}

export function CommsHistory({ entries, className }: CommsHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "sms" | "email" | "system">("all");

  const filtered = entries.filter(
    (e) => filter === "all" || e.channel === filter
  );

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          Communication History
        </h3>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(["all", "sms", "email", "system"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide transition-colors",
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-accent"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-2 text-sm text-muted-foreground">
            No communication history
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          {filtered.map((entry, idx) => {
            const channelCfg = CHANNEL_CONFIG[entry.channel];
            const dirCfg = DIRECTION_CONFIG[entry.direction];
            const statusCfg = STATUS_CONFIG[entry.status];
            const ChannelIcon = channelCfg.icon;
            const isExpanded = expandedId === entry.id;
            const isLast = idx === filtered.length - 1;

            return (
              <div key={entry.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2",
                      entry.direction === "automated"
                        ? "border-border bg-muted"
                        : entry.direction === "inbound"
                          ? "border-accent bg-accent"
                          : "border-primary/30 bg-primary/10"
                    )}
                  >
                    <ChannelIcon className={cn("h-3.5 w-3.5", channelCfg.color)} />
                  </div>
                  {!isLast && (
                    <div className="w-px flex-1 bg-border min-h-4" />
                  )}
                </div>

                <div className={cn("flex-1 min-w-0 pb-4", isLast && "pb-0")}>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    className="w-full text-left rounded-lg border border-border bg-card p-3 hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                              dirCfg.badgeClass
                            )}
                          >
                            {dirCfg.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground uppercase">
                            {channelCfg.label}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <span className={cn("h-1.5 w-1.5 rounded-full", statusCfg.dotClass)} />
                            {statusCfg.label}
                          </span>
                        </div>
                        {entry.subject && (
                          <p className="mt-1 text-sm font-medium text-foreground truncate">
                            {entry.subject}
                          </p>
                        )}
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                          {entry.body}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {entry.timestamp}
                        </span>
                        <ChevronDown
                          className={cn(
                            "h-3.5 w-3.5 text-muted-foreground transition-transform",
                            isExpanded && "rotate-180"
                          )}
                        />
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 border-t border-border pt-3">
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                          <div>
                            <span className="font-medium text-foreground">From: </span>
                            {entry.from}
                          </div>
                          <div>
                            <span className="font-medium text-foreground">To: </span>
                            {entry.to}
                          </div>
                          {entry.agent && (
                            <div>
                              <span className="font-medium text-foreground">Agent: </span>
                              {entry.agent}
                            </div>
                          )}
                          {entry.templateId && (
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-foreground">Template: </span>
                              {entry.templateId}
                              <ExternalLink className="h-2.5 w-2.5" />
                            </div>
                          )}
                        </div>
                        <div className="mt-2 rounded-lg bg-muted/50 p-3">
                          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                            {entry.body}
                          </p>
                        </div>
                      </div>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
