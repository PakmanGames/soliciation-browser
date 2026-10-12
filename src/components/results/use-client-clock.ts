"use client";

import { useSyncExternalStore } from "react";

/**
 * The current time, rounded down to the minute, shared by every caller through one
 * interval. Returns null during server render and hydration, so relative labels
 * ("12 min ago", "3 days left") can never cause a hydration mismatch.
 */
export function useMinuteClock(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * False during server render and hydration, true after. The query cache is shared by
 * every Suspense boundary on the page, so it can already hold data when a later
 * boundary hydrates; gating on this keeps that first render identical to the server's.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribeNever, isClient, isServer);
}

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(listener: () => void) {
  listeners.add(listener);
  timer ??= setInterval(() => listeners.forEach((notify) => notify()), 15_000);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

// A primitive that only changes once a minute, so React skips re-renders in between.
// Ticking every 15 s keeps a label at most 15 s behind the real minute.
function getSnapshot() {
  return Math.floor(Date.now() / 60_000) * 60_000;
}

function getServerSnapshot() {
  return null;
}

function subscribeNever() {
  return () => {};
}

function isClient() {
  return true;
}

function isServer() {
  return false;
}
