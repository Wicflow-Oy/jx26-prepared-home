// Demo homes and records (CONTRACTS §6). The server seeds these at start.
// Photo hashes are fake but deterministic: SHA-256 of "prepared-home-demo:<homeId>:<checkId>". No photos exist for them.

import type { CheckRecord, Home, Verdict } from "./types";
import { getCheck } from "./checks";
import { toDay } from "./dates";
import { dueDateFor } from "./rules";

const DEMO_HASHES: Record<string, string> = {
  "demo-turku-flat:L1": "9e5e1a8ee40d7f85ccc4eb1ab5891ad73691933265f26f4ab4c93b09da5164b8",
  "demo-turku-flat:L2": "3639b874ccc1abff298b706fb89746cde421bd663d63f2e82b1dae89d5a03cf1",
  "demo-turku-flat:L3": "a6246ce84f9588bca7f66416a31bee376198a7143bcb593a3e9685f19300cd54",
  "demo-turku-flat:L4": "ba6064eb56c5009ea97a37d57ff7162458ebadbfd6bf0ffb6580ef26bc1e4e2c",
  "demo-turku-flat:L5": "f24d12ee9d28d746b2dc42eccaba26918900e5349c1fd8af98f055a1b04546b3",
  "demo-turku-flat:L6": "b7ad478e8d154cf59a2a83f8d115c7bb12cb1bac1394a6a7fffcf0db40778791",
  "demo-turku-flat:F1": "83488907206a9f11d8fcb5b3d9f4ac0bdb840be3e5f565c82f0993465b856fe4",
  "demo-turku-flat:F2": "ca342e265dbfc9b62a347fb69512d586abfec03cf3215be1e5eadd85f7c0e9c2",
  "demo-turku-flat:F3": "b8237df7c3844d0fd6f9556d905df779e35b7d476417e9abf19185bc0c07e87d",
  "demo-house:L1": "5584d55d2aa3dff006f78d69480a521761f788b1343298c8c0816ce630543071",
  "demo-house:L2": "1f1d81e90c7dae820e547b118b7fabe022adad3da62871685f0af72baa2efde6",
  "demo-house:L3": "4abe309fd62036d0457e7845bfbc8757a5d615e1e11c01e882812364cd488364",
  "demo-house:L4": "e3649eaf1aec44f9805b7dba0ed73c3158fca159b36974e517a53709560c67d1",
  "demo-house:L5": "152a9efd911c7a0a371440fdc747211d7c5a6c7469a03842966104b27b2618d8",
  "demo-house:L6": "04374f5824d5dc49756a1829bfc03d1207dee50c49492cb38d492b4e953897ca",
  "demo-house:F1": "f352b5a1d70291d9e6304a889af9c3b7da99dae97d63b4787778dd7a739f7830",
  "demo-house:F2": "280a532653f554797e7122c7718ba75fecbdfa391d6ced35dc3c5fc08f891df7",
  "demo-house:F3": "e472f5537f0224885f105cfad4053306da7d306ceba7fbd48fab3d6b283a98d8",
  "demo-house:F4": "b3a1feb99d12094fa106803e3cf1239d5ce946a6713ddf4f931f1f7a7287b3f1",
  "demo-house:F5": "8db5a674f00aefd78b873ef0a9bcc9511f371c9ac7cb3d9f5ab63350e71c17b6",
  "demo-house:Z1": "4ce0a83dbb53336872b48b34fd072ff6fdf8d8a4a0885365efed1934ac48974c",
  "demo-house:Z2": "52e9e203473eac854c028be8c30e28e8680b220ebf7cd9c63aa4092f12e0675d",
  "demo-house:S1": "1c300211874720b5c9e968dd8bd40c824efd62b5e389f460257dedc300e64a88",
};

export const DEMO_FLAT_ID = "demo-turku-flat";
export const DEMO_FRESH_ID = "demo-fresh";
export const DEMO_HOUSE_ID = "demo-house";

/** The demo leak claim on the demo flat (CONTRACTS §6). */
export const DEMO_CLAIM = { homeId: DEMO_FLAT_ID, peril: "leak" as const, lossDate: "2027-02-03" };

function record(homeId: string, checkId: string, verdict: Verdict, checkedAt: string, userAnswers?: Record<string, boolean>): CheckRecord {
  const current = verdict === "verified" || verdict === "not_applicable";
  return {
    homeId,
    checkId,
    verdict,
    checkedAt,
    dueAt: current ? dueDateFor(getCheck(checkId).recheck, checkedAt) : null,
    photoSha256: verdict === "not_applicable" ? null : (DEMO_HASHES[`${homeId}:${checkId}`] ?? null),
    ...(userAnswers ? { userAnswers } : {}),
  };
}

/** Fresh copies of the demo data. `today` sets the move-in date of "demo-fresh". */
export function makeDemo(today: Date = new Date()): { homes: Home[]; records: CheckRecord[] } {
  const homes: Home[] = [
    { homeId: DEMO_FLAT_ID, homeType: "flat", label: "Demo flat, Turku", moveInDate: "2026-10-10", hasLeakAlarm: false, demo: true },
    { homeId: DEMO_FRESH_ID, homeType: "flat", label: "New home", moveInDate: toDay(today), hasLeakAlarm: false, demo: true },
    { homeId: DEMO_HOUSE_ID, homeType: "house", label: "Demo house, Turku", moveInDate: "2026-06-01", hasLeakAlarm: true, demo: true },
  ];

  const F = DEMO_FLAT_ID;
  const H = DEMO_HOUSE_ID;
  const records: CheckRecord[] = [
    // Demo flat, checked on 12 Oct 2026: Leak 5/6 (L4 fix first), Fire 3/5 (F4, F5 not started).
    record(F, "L1", "verified", "2026-10-12T09:04:00.000Z", { "L1.know_how": true }),
    record(F, "L2", "verified", "2026-10-12T09:09:00.000Z"),
    record(F, "L3", "verified", "2026-10-12T09:13:00.000Z"),
    record(F, "L4", "fix_first", "2026-10-12T09:18:00.000Z"),
    record(F, "L5", "verified", "2026-10-12T09:24:00.000Z"),
    record(F, "L6", "verified", "2026-10-12T09:29:00.000Z"),
    record(F, "F1", "verified", "2026-10-12T09:35:00.000Z", { "F1.beeped": true }),
    record(F, "F2", "verified", "2026-10-12T09:40:00.000Z"),
    record(F, "F3", "verified", "2026-10-12T09:46:00.000Z"),

    // Demo house: all 14 verified. Indoor checks in June; gutters and heating in early October.
    // The outdoor tap (Z2) was checked in June, before this frost season: it fell due on 1 Oct 2026,
    // so freeze shows "lapsed" and a frost forecast within 7 days triggers the frost reminder.
    record(H, "L1", "verified", "2026-06-14T07:02:00.000Z", { "L1.know_how": true }),
    record(H, "L2", "verified", "2026-06-14T07:08:00.000Z"),
    record(H, "L3", "verified", "2026-06-14T07:13:00.000Z"),
    record(H, "L4", "verified", "2026-06-14T07:19:00.000Z"),
    record(H, "L5", "verified", "2026-06-14T07:25:00.000Z"),
    record(H, "L6", "verified", "2026-06-14T07:31:00.000Z"),
    record(H, "F1", "verified", "2026-06-14T07:38:00.000Z", { "F1.beeped": true }),
    record(H, "F2", "verified", "2026-06-14T07:44:00.000Z"),
    record(H, "F3", "verified", "2026-06-14T07:50:00.000Z"),
    record(H, "F4", "verified", "2026-06-14T07:55:00.000Z"),
    record(H, "F5", "verified", "2026-06-14T08:01:00.000Z"),
    record(H, "Z2", "verified", "2026-06-14T08:09:00.000Z", { "Z2.indoor_valve_closed": true }),
    record(H, "Z1", "verified", "2026-10-04T10:12:00.000Z", { "Z1.heating_on": true }),
    record(H, "S1", "verified", "2026-10-04T10:20:00.000Z"),
  ];
  return { homes, records };
}

export const DEMO: { homes: Home[]; records: CheckRecord[] } = makeDemo();
