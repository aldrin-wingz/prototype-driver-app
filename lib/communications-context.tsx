"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { ALL_DRIVERS } from "@/lib/agent-mock/drivers-data";

export interface InboxMessage {
  id: string;
  direction: "inbound" | "outbound" | "automated";
  channel: "sms" | "email";
  body: string;
  subject?: string;
  timestamp: string;
  status: "delivered" | "sent" | "failed" | "pending";
  agent?: string;
}

export interface InboxThread {
  driverId: string;
  driverName: string;
  driverPhone: string;
  driverEmail: string;
  currentStage: string;
  unreadCount: number;
  lastMessage: string;
  lastTimestamp: string;
  messages: InboxMessage[];
  isOptedOut?: boolean;
}

type OverlayView = "closed" | "inbox" | "thread" | "compose";

interface CommsContextValue {
  view: OverlayView;
  activeDriverId: string | null;
  preSelectedDriverIds: string[];
  threads: InboxThread[];
  totalUnread: number;
  openInbox: () => void;
  openThread: (driverId: string) => void;
  openCompose: (driverIds?: string | string[]) => void;
  close: () => void;
  goBack: () => void;
  sendMessage: (driverId: string, body: string, channel: "sms" | "email") => void;
}

const CommsContext = createContext<CommsContextValue | null>(null);

export function useComms() {
  const ctx = useContext(CommsContext);
  if (!ctx) throw new Error("useComms must be used within <CommsProvider>");
  return ctx;
}

function buildMockThreads(): InboxThread[] {
  const driverSubset = [
    { id: "ni-1", msgs: [
      { id: "m1", direction: "outbound" as const, channel: "sms" as const, body: "Hi Maria, your NEMT interview has been scheduled for Feb 5 at 2:00 PM. Please confirm by replying YES.", timestamp: "Feb 3, 2:15 PM", status: "delivered" as const, agent: "Agent Torres" },
      { id: "m2", direction: "inbound" as const, channel: "sms" as const, body: "YES, confirmed! Looking forward to it.", timestamp: "Feb 3, 2:32 PM", status: "delivered" as const },
      { id: "m3", direction: "automated" as const, channel: "email" as const, body: "Hi Maria, we've received your profile documents and they are now under review. You'll hear from us within 2 business days.", subject: "Documents Received", timestamp: "Feb 1, 10:00 AM", status: "delivered" as const },
      { id: "m4", direction: "automated" as const, channel: "email" as const, body: "Welcome to Wingz! Your driver application has been started. Complete each step in order to get on the road.", subject: "Welcome to Wingz", timestamp: "Jan 28, 11:20 AM", status: "delivered" as const },
    ], unread: 1 },
    { id: "pd-3", msgs: [
      { id: "m5", direction: "outbound" as const, channel: "sms" as const, body: "Hi Robert, your application is on hold because your profile photo doesn't meet our requirements. Please upload a clear headshot.", timestamp: "Feb 8, 9:30 AM", status: "delivered" as const, agent: "Agent Kim" },
      { id: "m6", direction: "inbound" as const, channel: "sms" as const, body: "Ok I'll re-upload it today. What are the exact requirements?", timestamp: "Feb 8, 10:15 AM", status: "delivered" as const },
      { id: "m7", direction: "outbound" as const, channel: "sms" as const, body: "It needs to be a clear front-facing headshot, no sunglasses, with good lighting. Minimum 400x400px.", timestamp: "Feb 8, 10:22 AM", status: "delivered" as const, agent: "Agent Kim" },
      { id: "m8", direction: "inbound" as const, channel: "sms" as const, body: "Got it, uploading now", timestamp: "Feb 8, 11:45 AM", status: "delivered" as const },
    ], unread: 2 },
    { id: "ic-1", msgs: [
      { id: "m9", direction: "outbound" as const, channel: "sms" as const, body: "Hi James, we noticed your insurance docs are missing from your inspection step. Can you upload them as soon as possible?", timestamp: "Feb 7, 3:00 PM", status: "delivered" as const, agent: "Agent Torres" },
      { id: "m10", direction: "inbound" as const, channel: "sms" as const, body: "Sorry about that, I'll get them from my insurance company tomorrow", timestamp: "Feb 7, 4:10 PM", status: "delivered" as const },
    ], unread: 0 },
    { id: "ni-4", msgs: [
      { id: "m11", direction: "outbound" as const, channel: "sms" as const, body: "Hi Yuki, we noticed you missed your interview. Would you like to reschedule?", timestamp: "Feb 5, 3:00 PM", status: "delivered" as const, agent: "Agent Torres" },
      { id: "m12", direction: "inbound" as const, channel: "sms" as const, body: "Yes please! I had an emergency. Can I do next week?", timestamp: "Feb 5, 5:30 PM", status: "delivered" as const },
      { id: "m13", direction: "outbound" as const, channel: "sms" as const, body: "No problem! I've put your application on hold while we reschedule. I'll send you available slots shortly.", timestamp: "Feb 5, 5:45 PM", status: "delivered" as const, agent: "Agent Torres" },
    ], unread: 1 },
    { id: "ds-3", msgs: [
      { id: "m14", direction: "outbound" as const, channel: "sms" as const, body: "Hi Aaliyah, you missed your drug screening appointment. We need to reschedule this before we can proceed.", timestamp: "Feb 4, 11:00 AM", status: "delivered" as const, agent: "Agent Kim" },
    ], unread: 0 },
    { id: "pt-1", msgs: [
      { id: "m15", direction: "inbound" as const, channel: "sms" as const, body: "Hi, I submitted my bank info but the portal still shows pending. Is everything ok?", timestamp: "Feb 10, 8:30 AM", status: "delivered" as const },
      { id: "m16", direction: "outbound" as const, channel: "sms" as const, body: "Hi Hassan, let me check on that for you. Your bank info looks good on our end -- the status should update within 24hrs.", timestamp: "Feb 10, 9:15 AM", status: "delivered" as const, agent: "Agent Torres" },
      { id: "m17", direction: "inbound" as const, channel: "sms" as const, body: "Great, thank you!", timestamp: "Feb 10, 9:20 AM", status: "delivered" as const },
    ], unread: 1 },
  ];

  return driverSubset.map(({ id, msgs, unread }) => {
    const driver = ALL_DRIVERS.find((d) => d.id === id);
    if (!driver) return null;
    return {
      driverId: driver.id,
      driverName: driver.name,
      driverPhone: driver.phone,
      driverEmail: driver.email,
      currentStage: driver.currentStageId,
      unreadCount: unread,
      lastMessage: msgs[msgs.length - 1].body,
      lastTimestamp: msgs[msgs.length - 1].timestamp,
      isOptedOut: driver.isOptedOut,
      messages: msgs,
    };
  }).filter(Boolean) as InboxThread[];
}

export function CommsProvider({ children }: { children: React.ReactNode }) {
  const [view, setView] = useState<OverlayView>("closed");
  const [activeDriverId, setActiveDriverId] = useState<string | null>(null);
  const [preSelectedDriverIds, setPreSelectedDriverIds] = useState<string[]>([]);
  const [threads, setThreads] = useState<InboxThread[]>(buildMockThreads);

  const totalUnread = threads.reduce((sum, t) => sum + t.unreadCount, 0);

  const openInbox = useCallback(() => {
    setView("inbox");
    setActiveDriverId(null);
  }, []);

  const openThread = useCallback((driverId: string) => {
    setActiveDriverId(driverId);
    setView("thread");
    setThreads((prev) => {
      const existing = prev.find((t) => t.driverId === driverId);
      if (existing) {
        return prev.map((t) => (t.driverId === driverId ? { ...t, unreadCount: 0 } : t));
      }
      const driver = ALL_DRIVERS.find((d) => d.id === driverId);
      if (!driver) return prev;
      return [
        ...prev,
        {
          driverId: driver.id,
          driverName: driver.name,
          driverPhone: driver.phone,
          driverEmail: driver.email,
          currentStage: driver.currentStageId,
          unreadCount: 0,
          lastMessage: "No messages yet",
          lastTimestamp: new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true }),
          messages: [],
          isOptedOut: driver.isOptedOut,
        },
      ];
    });
  }, []);

  const openCompose = useCallback((driverIds?: string | string[]) => {
    if (typeof driverIds === "string") {
      setActiveDriverId(driverIds);
      setPreSelectedDriverIds([driverIds]);
    } else if (Array.isArray(driverIds) && driverIds.length > 0) {
      setActiveDriverId(null);
      setPreSelectedDriverIds(driverIds);
    } else {
      setActiveDriverId(null);
      setPreSelectedDriverIds([]);
    }
    setView("compose");
  }, []);

  const close = useCallback(() => {
    setView("closed");
    setActiveDriverId(null);
    setPreSelectedDriverIds([]);
  }, []);

  const goBack = useCallback(() => {
    if (view === "thread" || view === "compose") {
      setView("inbox");
      setActiveDriverId(null);
      setPreSelectedDriverIds([]);
    } else {
      setView("closed");
    }
  }, [view]);

  const sendMessage = useCallback((driverId: string, body: string, channel: "sms" | "email") => {
    const targetDriver = ALL_DRIVERS.find((d) => d.id === driverId);
    if (targetDriver?.isOptedOut) return;

    const newMsg: InboxMessage = {
      id: `m-${Date.now()}`,
      direction: "outbound",
      channel,
      body,
      timestamp: new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true }),
      status: "sent",
      agent: "You",
    };
    setThreads((prev) => {
      const existing = prev.find((t) => t.driverId === driverId);
      if (existing) {
        return prev.map((t) =>
          t.driverId === driverId
            ? { ...t, messages: [...t.messages, newMsg], lastMessage: body, lastTimestamp: newMsg.timestamp }
            : t
        );
      }
      const driver = ALL_DRIVERS.find((d) => d.id === driverId);
      if (!driver) return prev;
      return [
        ...prev,
        {
          driverId: driver.id,
          driverName: driver.name,
          driverPhone: driver.phone,
          driverEmail: driver.email,
          currentStage: driver.currentStageId,
          unreadCount: 0,
          lastMessage: body,
          lastTimestamp: newMsg.timestamp,
          messages: [newMsg],
          isOptedOut: driver.isOptedOut,
        },
      ];
    });
  }, []);

  return (
    <CommsContext.Provider
      value={{ view, activeDriverId, preSelectedDriverIds, threads, totalUnread, openInbox, openThread, openCompose, close, goBack, sendMessage }}
    >
      {children}
    </CommsContext.Provider>
  );
}
