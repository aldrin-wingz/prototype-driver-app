"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ChatCoexistence, ChatPlacement } from "./chat-placement";

interface ChatPlacementValue {
  /** Axis 1 — where the chat affordance sits. */
  placement: ChatPlacement;
  setPlacement: (placement: ChatPlacement) => void;
  /** Axis 2 — how In-App Chat and Zendesk Support Chat relate. */
  coexistence: ChatCoexistence;
  setCoexistence: (coexistence: ChatCoexistence) => void;
  /** Draw a dashed ghost where the affordance would have gone but doesn't. */
  showAbsences: boolean;
  setShowAbsences: (showAbsences: boolean) => void;
}

const ChatPlacementContext = createContext<ChatPlacementValue | null>(null);

/**
 * Which placement the study is currently showing.
 *
 * Context rather than a prop because the affordance is read in 12 places — seven
 * `<Header>` call sites (Requests renders it twice, once in its Suspense
 * fallback), six `<BottomNav>` sites and five bespoke headers. Threading a prop
 * would mean re-touching all twelve every time a placement is added; this way a
 * new placement is one entry in `chat-placement.ts`.
 *
 * Defaults to `off` so the app boots identical to `luis/rider-no-show`. Resets on
 * reload, matching `RideFlowProvider` — every demo starts from the same state.
 */
export function ChatPlacementProvider({ children }: { children: React.ReactNode }) {
  const [placement, setPlacement] = useState<ChatPlacement>("off");
  const [coexistence, setCoexistence] = useState<ChatCoexistence>("unified");
  const [showAbsences, setShowAbsences] = useState(false);

  const value = useMemo<ChatPlacementValue>(
    () => ({
      placement,
      setPlacement,
      coexistence,
      setCoexistence,
      showAbsences,
      setShowAbsences,
    }),
    [placement, coexistence, showAbsences]
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
 * Returns the `off` defaults rather than throwing when no provider is mounted, so
 * a chrome component stays renderable in the component showcase.
 */
export function useChatPlacement(): ChatPlacementValue {
  const context = useContext(ChatPlacementContext);
  if (context) return context;
  return {
    placement: "off",
    setPlacement: () => {},
    coexistence: "unified",
    setCoexistence: () => {},
    showAbsences: false,
    setShowAbsences: () => {},
  };
}
