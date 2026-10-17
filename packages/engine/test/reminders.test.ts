import { describe, expect, it } from "vitest";
import { DEMO, reminders } from "../src/index";
import type { FrostForecast } from "../src/index";
import { NOW, demoHome, demoRecords, rec } from "./helpers";

const frostOn = (date: string | null, minTempC: number | null = -1.2): FrostForecast => ({
  place: "Turku",
  fetchedAt: "2026-10-17T06:00:00Z",
  firstFrostDate: date,
  minTempC,
  source: "fmi_live",
});

describe("reminders", () => {
  it("demo flat: fix_first for L4, then one yearly re-check for the 8 verified checks", () => {
    const list = reminders(demoHome("demo-turku-flat"), DEMO.records, NOW, frostOn("2026-10-20"));
    expect(list.map((r) => [r.kind, r.dueAt, r.checkIds])).toEqual([
      ["fix_first", "2026-10-19", ["L4"]],
      ["yearly", "2027-10-12", ["L1", "L2", "L3", "L5", "L6", "F1", "F2", "F3"]],
    ]);
    expect(list[0]!.title.en).toBe("Fix it and take a new photo: Drip trays under the washing machine and fridge");
    expect(list[0]!.title.fi).toBe("Korjaa ja ota uusi kuva: Turvakaukalot pesukoneen ja jääkaapin alla");
    expect(list[1]!.title).toEqual({ fi: "Vuositarkistus: 8 kohdetta", sv: "Årlig kontroll: 8 kontroller", en: "Yearly re-check: 8 checks" });
    expect(list.every((r) => r.kind !== "frost")).toBe(true); // a flat has no outdoor tap check
  });

  it("demo house: frost reminder when frost is forecast within 7 days and Z2 is from before 1 July", () => {
    const list = reminders(demoHome("demo-house"), DEMO.records, NOW, frostOn("2026-10-20"));
    const frost = list[0]!;
    expect(frost).toMatchObject({
      id: "frost-Z2-2026-10-20",
      kind: "frost",
      checkIds: ["Z2"],
      dueAt: "2026-10-19",
      trigger: "FMI forecast minimum -1.2 °C on 2026-10-20",
    });
    expect(frost.title.en).toBe("Frost is coming: check the outdoor tap");
    // Z2 appears only once, in the frost reminder.
    expect(list.filter((r) => r.checkIds.includes("Z2"))).toHaveLength(1);
    // Seasonal reminders for gutters and heating, yearly for the rest.
    expect(list.map((r) => [r.kind, r.dueAt, r.checkIds.join(",")])).toEqual([
      ["frost", "2026-10-19", "Z2"],
      ["seasonal", "2027-04-01", "S1"],
      ["yearly", "2027-06-14", "L1,L2,L3,L4,L5,L6,F1,F2,F3,F4,F5"],
      ["seasonal", "2027-09-01", "Z1"],
    ]);
    expect(list[1]!.title.sv).toBe("Säsongskontroll: Hängrännor och stuprör");
  });

  it("no frost reminder when the frost is more than 7 days away; Z2 shows as its overdue seasonal date", () => {
    const list = reminders(demoHome("demo-house"), DEMO.records, NOW, frostOn("2026-10-25"));
    expect(list.some((r) => r.kind === "frost")).toBe(false);
    expect(list[0]).toMatchObject({ kind: "seasonal", dueAt: "2026-10-01", checkIds: ["Z2"] });
    expect(reminders(demoHome("demo-house"), DEMO.records, NOW, null).some((r) => r.kind === "frost")).toBe(false);
    expect(reminders(demoHome("demo-house"), DEMO.records, NOW, frostOn(null, null)).some((r) => r.kind === "frost")).toBe(false);
  });

  it("frost on the day itself still triggers, with a due date of today", () => {
    const list = reminders(demoHome("demo-house"), DEMO.records, NOW, { ...frostOn("2026-10-17", null), source: "fixture" });
    expect(list[0]).toMatchObject({ kind: "frost", dueAt: "2026-10-17", trigger: "FMI forecast (fixture): first frost on 2026-10-17" });
  });

  it("no frost reminder when Z2 was verified since 1 July, or is not applicable", () => {
    const house = demoHome("demo-house");
    const fresh = [...demoRecords("demo-house"), rec("demo-house", "Z2", "verified", "2026-10-10T09:00:00Z")];
    expect(reminders(house, fresh, NOW, frostOn("2026-10-20")).some((r) => r.kind === "frost")).toBe(false);
    const na = [...demoRecords("demo-house"), rec("demo-house", "Z2", "not_applicable", "2026-06-20T09:00:00Z")];
    expect(reminders(house, na, NOW, frostOn("2026-10-20")).some((r) => r.kind === "frost")).toBe(false);
  });

  it("frost reminder for a cottage that never checked Z2", () => {
    const cottage = { homeId: "c1", homeType: "cottage" as const, label: "Mökki", moveInDate: "2026-05-01", hasLeakAlarm: false };
    const list = reminders(cottage, [], NOW, frostOn("2026-10-18"));
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ kind: "frost", checkIds: ["Z2"], dueAt: "2026-10-17" });
  });

  it("no reminders for a fresh home", () => {
    expect(reminders(demoHome("demo-fresh"), DEMO.records, NOW, frostOn("2026-10-20"))).toEqual([]);
  });
});
