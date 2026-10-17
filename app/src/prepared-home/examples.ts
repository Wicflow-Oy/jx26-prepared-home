// Example homes, opened from Settings or with a link such as /app/?example=flat (preparedhome://?example=flat).
import { DEMO_FLAT_ID, DEMO_FRESH_ID, DEMO_HOUSE_ID } from "@prepared-home/engine";

import type { StringKey } from "./i18n";

export const EXAMPLES = {
  flat: { homeId: DEMO_FLAT_ID, label: "exampleFlat" },
  house: { homeId: DEMO_HOUSE_ID, label: "exampleHouse" },
  fresh: { homeId: DEMO_FRESH_ID, label: "exampleFresh" },
} as const satisfies Record<string, { homeId: string; label: StringKey }>;

export type ExampleKey = keyof typeof EXAMPLES;

export const isExampleKey = (value: unknown): value is ExampleKey =>
  typeof value === "string" && Object.hasOwn(EXAMPLES, value);
