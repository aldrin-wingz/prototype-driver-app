"use client";

/**
 * Demo session for the T&C prototype — FEATURE `prototype/driver-terms-acceptance`.
 *
 * Stands in for the backend (PRD stories 1, 3, 4): which T&C version is current, which
 * version this driver accepted, and the last acceptance record. Kept in localStorage so
 * it survives navigation and reloads; every access is wrapped because storage can be
 * blocked (private windows, previews).
 */
import { useSyncExternalStore } from "react";
import { APP_VERSION, DRIVER_NAME } from "@/lib/driver-data/options-menu";
import {
  buildAcceptanceRecord, termsForVersion,
  type DriverTermsAcceptanceRecord, type DriverTermsVersion,
} from "./acceptance";

export interface DriverTermsSession {
  loggedIn: boolean;
  currentVersion: number;
  /** When each version after v1 was "published" in the demo (version → date label). */
  publishedOn: Record<number, string>;
  acceptedVersion: number | null;
  lastRecord: DriverTermsAcceptanceRecord | null;
  /** Bumped on every simulated return to the foreground, so the gate re-checks. */
  resumeCount: number;
}

const KEY = "driver-terms-prototype-session-v1";
const EVENT = "driver-terms-session-change";
export const DEMO_DRIVER_ID = "dev-verida-ga-test-driver";
export const DEMO_DRIVER_NAME = DRIVER_NAME;
export const DEMO_APP_VERSION = APP_VERSION;

export const INITIAL_SESSION: DriverTermsSession = {
  loggedIn: false,
  currentVersion: 1,
  publishedOn: {},
  acceptedVersion: null,
  lastRecord: null,
  resumeCount: 0,
};

let cache: DriverTermsSession | null = null;

function read(): DriverTermsSession {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? { ...INITIAL_SESSION, ...JSON.parse(raw) } : INITIAL_SESSION;
  } catch {
    cache = INITIAL_SESSION;
  }
  return cache!;
}

function write(next: DriverTermsSession) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage blocked: the demo still works for this page view */
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) { cache = null; cb(); }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

/** `null` during server render and the first client paint (storage is not readable yet). */
export function useDriverTermsSession(): DriverTermsSession | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

export function currentTerms(s: DriverTermsSession): DriverTermsVersion {
  return termsForVersion(s.currentVersion, s.publishedOn[s.currentVersion]);
}

export const driverTermsActions = {
  logIn() { write({ ...read(), loggedIn: true }); },
  logOut() { write({ ...read(), loggedIn: false }); },
  accept() {
    const s = read();
    const record = buildAcceptanceRecord({
      driverId: DEMO_DRIVER_ID,
      terms: currentTerms(s),
      agreed: true,
      appVersion: DEMO_APP_VERSION,
    });
    if (!record) return;
    write({ ...s, acceptedVersion: s.currentVersion, lastRecord: record });
  },
  publishNewVersion() {
    const s = read();
    const next = s.currentVersion + 1;
    const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    write({ ...s, currentVersion: next, publishedOn: { ...s.publishedOn, [next]: today } });
  },
  simulateResume() { const s = read(); write({ ...s, resumeCount: s.resumeCount + 1 }); },
  reset() { write(INITIAL_SESSION); },
};
