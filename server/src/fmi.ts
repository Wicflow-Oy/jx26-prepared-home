// First forecast frost from FMI open data (keyless WFS), with a 1-hour cache and an offline fixture.

import type { FrostForecast } from "@prepared-home/engine";
import { FIXTURE_FETCHED_AT, FIXTURE_PLACE, FIXTURE_SERIES } from "./fmiFixture";
import { helsinkiDayKey } from "./limits";

export const FMI_WFS = "https://opendata.fmi.fi/wfs";
export const USER_AGENT = "prepared-home-prototype/0.1";
export const STORED_QUERIES = [
  "fmi::forecast::edited::weather::scandinavia::point::simple", // about 10 days
  "fmi::forecast::harmonie::surface::point::simple", // about 2 days; used if the first fails
];

const HOUR = 60 * 60 * 1000;
const HORIZON_DAYS = 10;

export type Point = [time: string, tempC: number];

/** Pulls (time, value) pairs out of a BsWfs "simple" feature collection. */
export function parseWfsSimple(xml: string): Point[] {
  const out: Point[] = [];
  const re = /<BsWfs:BsWfsElement\b[\s\S]*?<\/BsWfs:BsWfsElement>/g;
  for (const match of xml.matchAll(re)) {
    const el = match[0];
    const time = /<BsWfs:Time>([^<]+)<\/BsWfs:Time>/.exec(el)?.[1]?.trim();
    const name = /<BsWfs:ParameterName>([^<]+)<\/BsWfs:ParameterName>/.exec(el)?.[1]?.trim();
    const raw = /<BsWfs:ParameterValue>([^<]+)<\/BsWfs:ParameterValue>/.exec(el)?.[1]?.trim();
    if (!time || (name && name !== "Temperature") || raw === undefined) continue;
    const value = Number(raw);
    if (!Number.isFinite(value) || Number.isNaN(Date.parse(time))) continue; // FMI uses NaN for gaps
    out.push([time, value]);
  }
  return out;
}

export interface DailyMin {
  date: string; // YYYY-MM-DD, Europe/Helsinki
  minC: number;
}

export function dailyMinimums(points: Point[]): DailyMin[] {
  const byDay = new Map<string, number>();
  for (const [time, value] of points) {
    const day = helsinkiDayKey(new Date(time));
    const prev = byDay.get(day);
    if (prev === undefined || value < prev) byDay.set(day, value);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, minC]) => ({ date, minC }));
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** First day with a minimum at or below 0 °C. minTempC is that day's minimum, or the lowest minimum in the horizon if no frost. */
export function frostFromPoints(
  points: Point[],
  place: string,
  fetchedAt: string,
  source: FrostForecast["source"],
): FrostForecast {
  const days = dailyMinimums(points);
  const frost = days.find((d) => d.minC <= 0) ?? null;
  const lowest = days.length ? Math.min(...days.map((d) => d.minC)) : null;
  return {
    place,
    fetchedAt,
    firstFrostDate: frost ? frost.date : null,
    minTempC: frost ? round1(frost.minC) : lowest === null ? null : round1(lowest),
    source,
  };
}

export function fixtureForecast(place = FIXTURE_PLACE): FrostForecast {
  return frostFromPoints(FIXTURE_SERIES, place, FIXTURE_FETCHED_AT, "fixture");
}

export function cleanPlace(raw: unknown): string {
  if (typeof raw !== "string") return "Turku";
  const t = raw.trim();
  return /^[\p{L}][\p{L} .'-]{0,39}$/u.test(t) ? t : "Turku";
}

export type FetchLike = (
  url: string,
  init: { headers: Record<string, string>; signal: AbortSignal },
) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

export interface FrostServiceOptions {
  fetchImpl?: FetchLike;
  clock?: () => Date;
  cacheMs?: number;
  timeoutMs?: number;
}

export class FrostService {
  private cache = new Map<string, { at: number; value: FrostForecast }>();
  private readonly fetchImpl: FetchLike;
  private readonly clock: () => Date;
  private readonly cacheMs: number;
  private readonly timeoutMs: number;

  constructor(opts: FrostServiceOptions = {}) {
    this.fetchImpl = opts.fetchImpl ?? ((url, init) => fetch(url, init));
    this.clock = opts.clock ?? (() => new Date());
    this.cacheMs = opts.cacheMs ?? HOUR;
    this.timeoutMs = opts.timeoutMs ?? 8000;
  }

  private url(query: string, place: string, now: Date): string {
    const end = new Date(now.getTime() + HORIZON_DAYS * 24 * HOUR);
    end.setUTCMinutes(0, 0, 0);
    const params = new URLSearchParams({
      service: "WFS",
      version: "2.0.0",
      request: "getFeature",
      storedquery_id: query,
      place,
      parameters: "Temperature",
      timestep: "60",
      endtime: end.toISOString().replace(/\.\d{3}Z$/, "Z"),
    });
    return `${FMI_WFS}?${params.toString()}`;
  }

  private async fetchLive(place: string, now: Date): Promise<FrostForecast | null> {
    for (const query of STORED_QUERIES) {
      try {
        const res = await this.fetchImpl(this.url(query, place, now), {
          headers: { "User-Agent": USER_AGENT, Accept: "application/xml" },
          signal: AbortSignal.timeout(this.timeoutMs),
        });
        if (!res.ok) continue;
        const points = parseWfsSimple(await res.text());
        if (points.length === 0) continue;
        return frostFromPoints(points, place, now.toISOString(), "fmi_live");
      } catch {
        // try the next stored query, then the fixture
      }
    }
    return null;
  }

  async forecast(rawPlace: unknown = "Turku"): Promise<FrostForecast> {
    const place = cleanPlace(rawPlace);
    const now = this.clock();
    const key = place.toLowerCase();
    const cached = this.cache.get(key);
    if (cached && now.getTime() - cached.at < this.cacheMs) return cached.value;
    const live = await this.fetchLive(place, now);
    const value = live ?? fixtureForecast(); // the fixture is Turku data, so it keeps Turku as its place
    // Cache a fixture result only briefly, so the service recovers soon after FMI is reachable again.
    this.cache.set(key, {
      at: live ? now.getTime() : now.getTime() - this.cacheMs + 5 * 60 * 1000,
      value,
    });
    return value;
  }
}
