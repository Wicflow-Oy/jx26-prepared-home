// Everything that changes a home: opening an example, setting up a new home, saving check results and claims.
import {
  getCheck,
  makeDemo,
  notApplicableOutcome,
  perilStatuses,
  recordFromOutcome,
  type AdjusterView,
  type CaptureSource,
  type CheckRecord,
  type Home,
  type HomeType,
  type Lang,
  type Peril,
} from "@prepared-home/engine";
import { useCallback } from "react";

import type { CheckResponse } from "../api";
import { savePhoto } from "../photo/store";
import type { StoredOutcome } from "./storage";
import type { DeviceStore } from "./useDeviceStore";

export interface NewHome {
  homeType: HomeType;
  moveInDate: string;
  hasLeakAlarm: boolean;
  label: string;
}

export interface CheckResultInput {
  home: Home;
  response: CheckResponse;
  photo: { sha256: string; bytes: Uint8Array; origin: CaptureSource };
  second?: { sha256: string; bytes: Uint8Array };
  previousVerdict: CheckRecord["verdict"] | undefined;
}

export interface SaveResult {
  stored: StoredOutcome;
  /** Risks that became prepared with this record. */
  newlyPrepared: Peril[];
}

const preparedPerils = (home: Home, records: CheckRecord[], now: Date) =>
  perilStatuses(home, records, now)
    .filter((p) => p.state === "prepared")
    .map((p) => p.peril);

export function useHomeActions(store: DeviceStore, lang: Lang) {
  const { latest: homesNow, update: updateHomes } = store.homes;
  const { latest: outcomesNow, update: updateOutcomes } = store.outcomes;
  const { latest: claimsNow, update: updateClaims } = store.claims;

  /** An example always opens as a fresh copy, without results from an earlier visit. */
  const openDemo = useCallback(
    (homeId: string): Home | null => {
      const demo = makeDemo(new Date());
      const home = demo.homes.find((h) => h.homeId === homeId);
      if (!home) return null;
      const cur = homesNow.current;
      updateHomes({
        homes: { ...cur.homes, [homeId]: home },
        records: { ...cur.records, [homeId]: demo.records.filter((r) => r.homeId === homeId) },
        currentHomeId: homeId,
      });
      const rest = { ...outcomesNow.current };
      delete rest[homeId];
      updateOutcomes(rest);
      return home;
    },
    [homesNow, outcomesNow, updateHomes, updateOutcomes],
  );

  const createHome = useCallback(
    (input: NewHome): Home => {
      const home: Home = {
        homeId: `home-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        ...input,
      };
      const cur = homesNow.current;
      updateHomes({
        homes: { ...cur.homes, [home.homeId]: home },
        records: { ...cur.records, [home.homeId]: [] },
        currentHomeId: home.homeId,
      });
      return home;
    },
    [homesNow, updateHomes],
  );

  /** Adds a record and returns the risks it made prepared, for a calm confirmation. */
  const appendRecord = useCallback(
    (home: Home, record: CheckRecord): Peril[] => {
      const cur = homesNow.current;
      const before = cur.records[home.homeId] ?? [];
      const after = [...before, record];
      updateHomes({ ...cur, records: { ...cur.records, [home.homeId]: after } });
      const now = new Date();
      const was = new Set(preparedPerils(home, before, now));
      return preparedPerils(home, after, now).filter((p) => !was.has(p));
    },
    [homesNow, updateHomes],
  );

  const putOutcome = useCallback(
    (stored: StoredOutcome) => {
      const cur = outcomesNow.current;
      const forHome = { ...(cur[stored.homeId] ?? {}), [stored.checkId]: stored };
      updateOutcomes({ ...cur, [stored.homeId]: forHome });
    },
    [outcomesNow, updateOutcomes],
  );

  const saveCheckResult = useCallback(
    async ({
      home,
      response,
      photo,
      second,
      previousVerdict,
    }: CheckResultInput): Promise<SaveResult> => {
      await savePhoto(photo.sha256, photo.bytes);
      if (second) await savePhoto(second.sha256, second.bytes);
      // How the photo was taken decides whether it counts; an older server may not echo it back.
      const capture = response.record.capture ?? photo.origin;
      const record: CheckRecord = { ...response.record, homeId: home.homeId, capture };
      const newlyPrepared = appendRecord(home, record);
      // An unclear photo never undoes an earlier decided result; the engine applies the same rule.
      const keptEarlier =
        response.outcome.verdict === "retake" && !!previousVerdict && previousVerdict !== "retake";
      const stored: StoredOutcome = {
        homeId: home.homeId,
        checkId: record.checkId,
        outcome: response.outcome,
        source: response.source,
        sourceNote: response.sourceNote,
        lang,
        model: response.model,
        checkedAt: record.checkedAt,
        photoSha256: record.photoSha256,
        secondPhotoSha256: record.secondPhotoSha256 ?? null,
        capture,
        recordReplaced: !keptEarlier,
        previousVerdict,
      };
      putOutcome(stored);
      return { stored, newlyPrepared };
    },
    [appendRecord, putOutcome, lang],
  );

  const markNotApplicable = useCallback(
    (home: Home, checkId: string): SaveResult => {
      const outcome = notApplicableOutcome(getCheck(checkId, home.homeType), lang, home.homeType);
      const record = recordFromOutcome(home.homeId, outcome, new Date(), null, home.homeType);
      const newlyPrepared = appendRecord(home, record);
      const stored: StoredOutcome = {
        homeId: home.homeId,
        checkId,
        outcome,
        source: "offline",
        model: "",
        checkedAt: record.checkedAt,
        photoSha256: null,
        recordReplaced: true,
      };
      putOutcome(stored);
      return { stored, newlyPrepared };
    },
    [appendRecord, putOutcome, lang],
  );

  const saveClaim = useCallback(
    (homeId: string, view: AdjusterView) => {
      const entry = { view, homeId, createdAt: new Date().toISOString() };
      updateClaims({ ...claimsNow.current, [view.claimId]: entry });
    },
    [claimsNow, updateClaims],
  );

  return {
    openDemo,
    createHome,
    saveCheckResult,
    markNotApplicable,
    saveClaim,
  };
}
