// Where each check usually is in a home. Presentation only: the rules never depend on rooms.
import type { Lang, Localized } from "@prepared-home/engine";

export type Room = "kitchen" | "bathroom" | "hall" | "living" | "outside" | "utility";

const ROOM_OF: Record<string, Room> = {
  L1: "hall",
  L2: "hall",
  F1: "hall",
  F2: "hall",
  L3: "kitchen",
  L4: "kitchen",
  F3: "kitchen",
  F4: "kitchen",
  L5: "bathroom",
  L6: "bathroom",
  F5: "living",
  Z2: "outside",
  S1: "outside",
  Z1: "utility",
};

const ROOM_NAMES: Record<Room, Localized> = {
  kitchen: { en: "Kitchen", fi: "Keittiö", sv: "Kök" },
  bathroom: { en: "Bathroom", fi: "Kylpyhuone", sv: "Badrum" },
  hall: { en: "Hallway", fi: "Eteinen", sv: "Tambur" },
  living: { en: "Living room", fi: "Olohuone", sv: "Vardagsrum" },
  outside: { en: "Outside", fi: "Ulkona", sv: "Utomhus" },
  utility: { en: "Utility room", fi: "Tekninen tila", sv: "Tekniskt utrymme" },
};

export const roomOf = (checkId: string): Room | null => ROOM_OF[checkId] ?? null;
export const roomName = (room: Room, lang: Lang) => ROOM_NAMES[room][lang];

/** Rooms for a set of checks, in first-seen order, with how many of each room's checks are done. */
export function roomProgress(
  checkIds: string[],
  isDone: (id: string) => boolean,
): { room: Room; done: number; total: number }[] {
  const out = new Map<Room, { room: Room; done: number; total: number }>();
  for (const id of checkIds) {
    const room = roomOf(id);
    if (!room) continue;
    const entry = out.get(room) ?? { room, done: 0, total: 0 };
    entry.total += 1;
    if (isDone(id)) entry.done += 1;
    out.set(room, entry);
  }
  return [...out.values()];
}
