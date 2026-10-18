// The web app inside a page that frames it, such as the landing page's phone. The frame picks the
// language with ?lang=, hears the check's progress for its Dynamic Island, and can run a guided tour.
// Same-origin frames only; a no-op on native and at top level.
import type { Lang } from "@prepared-home/engine";
import { useEffect, useSyncExternalStore } from "react";
import { Platform } from "react-native";

import type { SamplePhoto } from "./api";
import type { ReviewRun } from "./screens/check/useCheckRun";

export type EmbedState =
  "idle" | "camera" | "checking" | "verified" | "retake" | "fix_first" | "second-angle";

const LANGS: readonly string[] = ["en", "fi", "sv"] satisfies Lang[];

const framed = () =>
  Platform.OS === "web" && typeof window !== "undefined" && window.parent !== window;

// The target origin keeps messages from leaking to a page on another site.
const toParent = (message: Record<string, string>) => {
  if (framed()) window.parent.postMessage(message, window.location.origin);
};

/** The language asked for with ?lang=en|fi|sv on web, or null. */
export function urlLang(): Lang | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("lang");
  return value && LANGS.includes(value) ? (value as Lang) : null;
}

// "idle" on leaving still names the check that was left.
let lastLabel = "";

function postStatus(state: EmbedState, label = lastLabel): void {
  if (!framed()) return;
  lastLabel = label;
  toParent({ type: "prepared-home:status", state, label });
}

function embedState(run: ReviewRun): EmbedState {
  switch (run.status) {
    case "idle":
      return "camera";
    case "secondAngle":
      return "second-angle";
    case "done": {
      const verdict = run.stored.outcome.verdict;
      return verdict === "not_applicable" ? "idle" : verdict;
    }
    case "error":
    case "allDone":
      return "idle";
    default:
      return "checking";
  }
}

/** Tells the framing page what the check screen shows, and "idle" when it closes. */
export function useEmbedStatus(run: ReviewRun, label: string): void {
  const state = embedState(run);
  useEffect(() => postStatus(state, label), [state, label]);
  useEffect(() => () => postStatus("idle"), []);
}

export const TOUR_STEPS = [
  "start",
  "choose",
  "capture",
  "fix",
  "status",
  "deductible",
  "quick",
  "card",
  "claim",
  "settings",
  "end",
] as const;
export type TourStep = (typeof TOUR_STEPS)[number];

/** Hears the framing page's tour steps and tells it the tour is ready; returns the unsubscribe. */
export function listenForTour(onStep: (step: TourStep) => void): () => void {
  if (!framed()) return () => undefined;
  const onMessage = (e: MessageEvent) => {
    if (e.source !== window.parent || e.origin !== window.location.origin) return;
    const data: unknown = e.data;
    if (typeof data !== "object" || data === null) return;
    const { type, step } = data as { type?: unknown; step?: unknown };
    if (type !== "prepared-home:tour") return;
    const known = TOUR_STEPS.find((s) => s === step);
    if (known) onStep(known);
  };
  window.addEventListener("message", onMessage);
  toParent({ type: "prepared-home:tour-ready" });
  return () => window.removeEventListener("message", onMessage);
}

export const tourDone = (step: TourStep) => toParent({ type: "prepared-home:tour-done", step });

/** What a tour step asks of the screen it opened: a check to shoot with a recorded sample, or a sheet. */
export type TourCue =
  | { kind: "shot"; step: TourStep; checkId: string; sample: SamplePhoto; fired: boolean }
  | { kind: "deductible" };

/** The step asked for last, whether a tour is running, and its cue for the screen in front. */
let tour: { step: TourStep | null; active: boolean; cue: TourCue | null } = {
  step: null,
  active: false,
  cue: null,
};
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function setTour(next: Partial<typeof tour>): void {
  tour = { ...tour, ...next };
  listeners.forEach((listener) => listener());
}

export const getTour = () => tour;

/** The tour's state: whether one is running, and its cue for the screen in front. */
export const useTour = () => useSyncExternalStore(subscribe, () => tour);
