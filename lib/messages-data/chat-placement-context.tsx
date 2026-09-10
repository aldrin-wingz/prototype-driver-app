"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ChatPlacement } from "./chat-placement";

/** Which surface the sheet is showing. `null` = closed. */
export type ChatView = "chooser" | "wingz" | "zendesk" | null;

interface ChatPlacementValue {
  /** Which of the four proposals is being shown. */
  placement: ChatPlacement;
  setPlacement: (placement: ChatPlacement) => void;
  /** Draw a dashed ghost where the affordance would have gone but doesn't. */
  showAbsences: boolean;
  setShowAbsences: (showAbsences: boolean) => void;

  view: ChatView;
  /** The in-app icon. Under `merged` this lands on the chooser instead. */
  openInApp: () => void;
  /** The Zendesk icon. */
  openSupport: () => void;
  /** The single merged bubble — always the chooser first. */
  openChooser: () => void;
  close: () => void;
  /** Which in-app thread the sheet is showing; null = the inbox. */
  activeThreadId: string | null;
  openThread: (id: string) => void;
  back: () => void;
}

const ChatPlacementContext = createContext<ChatPlacementValue | null>(null);

/**
 * Which option the study is showing, and what the chat sheet has open.
 *
 * Context rather than props because the affordance is read in the shared header
 * plus five bespoke ones; a new option is one entry in `chat-placement.ts`
 * rather than an edit in twelve files.
 *
 * Defaults to `off` so the app boots identical to production. Resets on reload,
 * matching `RideFlowProvider` — every demo starts from the same state.
 */
export function ChatPlacementProvider({ children }: { children: React.ReactNode }) {
  const [placement, setPlacementRaw] = useState<ChatPlacement>("off");
  const [showAbsences, setShowAbsences] = useState(false);
  const [view, setView] = useState<ChatView>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  const value = useMemo<ChatPlacementValue>(
    () => ({
      placement,
      // Switching options mid-demo must not leave a sheet from the old one open.
      setPlacement: (next) => {
        setPlacementRaw(next);
        setView(null);
        setActiveThreadId(null);
      },
      showAbsences,
      setShowAbsences,
      view,
      openInApp: () => {
        setActiveThreadId(null);
        setView("wingz");
      },
      openSupport: () => {
        setActiveThreadId(null);
        setView("zendesk");
      },
      openChooser: () => {
        setActiveThreadId(null);
        setView("chooser");
      },
      close: () => {
        setView(null);
        setActiveThreadId(null);
      },
      activeThreadId,
      openThread: setActiveThreadId,
      // Inside a thread, back returns to its inbox; from an inbox opened via
      // the chooser, back returns to the chooser.
      back: () => {
        if (activeThreadId) {
          setActiveThreadId(null);
          return;
        }
        setView(placement === "merged" ? "chooser" : null);
      },
    }),
    [placement, showAbsences, view, activeThreadId]
  );

  return (
    <ChatPlacementContext.Provider value={value}>
      {children}
    </ChatPlacementContext.Provider>
  );
}

/**
 * Read the current study state.
 *
 * Returns the `off` defaults rather than throwing when no provider is mounted,
 * so a chrome component stays renderable in the component showcase.
 */
export function useChatPlacement(): ChatPlacementValue {
  const context = useContext(ChatPlacementContext);
  if (context) return context;
  return {
    placement: "off",
    setPlacement: () => {},
    showAbsences: false,
    setShowAbsences: () => {},
    view: null,
    openInApp: () => {},
    openSupport: () => {},
    openChooser: () => {},
    close: () => {},
    activeThreadId: null,
    openThread: () => {},
    back: () => {},
  };
}
