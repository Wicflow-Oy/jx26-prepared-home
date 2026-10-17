// Abuse and cost guard for live vision calls (CONTRACTS §9.2). In memory: fine for one instance.

import type { UsageInfo } from "./vision/types";

export interface LimitsConfig {
  perIpPer10Min: number;
  dailyLive: number;
  dailySpendCapUsd: number;
  estCostPerCallUsd: number;
}

export type Denial = "per_ip" | "daily";

export interface Ticket {
  dayKey: string;
  estimateUsd: number;
}

export interface LimitsSnapshot {
  perIpPer10Min: number;
  dailyLive: number;
  usedToday: number;
  spentTodayUsd: number;
  dailySpendCapUsd: number;
  day: string;
}

const WINDOW_MS = 10 * 60 * 1000;

const helsinkiDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Helsinki",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** YYYY-MM-DD in Europe/Helsinki: the daily counter resets at local midnight. */
export function helsinkiDayKey(d: Date): string {
  return helsinkiDay.format(d);
}

// USD per million tokens (input, output). Unknown models use the most expensive row so the cap errs on the safe side.
const PRICES: { prefix: string; input: number; output: number }[] = [
  { prefix: "claude-haiku-5-5", input: 0.1, output: 0.5 },
  { prefix: "claude-haiku-4-5", input: 1, output: 5 },
  { prefix: "claude-sonnet-5-5", input: 2, output: 10 },
  { prefix: "claude-sonnet-5", input: 2, output: 10 },
  { prefix: "claude-sonnet-4", input: 3, output: 15 },
  { prefix: "claude-opus-5-5", input: 4, output: 20 },
  { prefix: "claude-opus-5", input: 5, output: 25 },
  { prefix: "claude-opus-4", input: 5, output: 25 },
];
const FALLBACK_PRICE = { input: 10, output: 50 };

export function costUsd(model: string, usage: UsageInfo): number {
  const row = PRICES.find((p) => model.startsWith(p.prefix)) ?? FALLBACK_PRICE;
  return (usage.inputTokens * row.input + usage.outputTokens * row.output) / 1_000_000;
}

export class LiveGuard {
  private hits = new Map<string, number[]>();
  private day: string;
  private used = 0;
  private spent = 0;

  constructor(
    private readonly cfg: LimitsConfig,
    private readonly clock: () => Date = () => new Date(),
  ) {
    this.day = helsinkiDayKey(this.clock());
  }

  private rollDay(now: Date): void {
    const key = helsinkiDayKey(now);
    if (key !== this.day) {
      this.day = key;
      this.used = 0;
      this.spent = 0;
    }
  }

  private recent(clientKey: string, nowMs: number): number[] {
    const list = (this.hits.get(clientKey) ?? []).filter((t) => nowMs - t < WINDOW_MS);
    if (list.length) this.hits.set(clientKey, list);
    else this.hits.delete(clientKey);
    return list;
  }

  private prune(nowMs: number): void {
    if (this.hits.size < 5000) return;
    for (const key of [...this.hits.keys()]) this.recent(key, nowMs);
  }

  /** True while a live call would be allowed by the daily count and spend caps. */
  dailyAvailable(): boolean {
    this.rollDay(this.clock());
    return (
      this.used < this.cfg.dailyLive &&
      this.spent + this.cfg.estCostPerCallUsd <= this.cfg.dailySpendCapUsd
    );
  }

  /** Reserves one live call for this client, or says which limit stops it. Counts attempts, not successes. */
  tryReserve(clientKey: string): { ok: true; ticket: Ticket } | { ok: false; reason: Denial } {
    const now = this.clock();
    const nowMs = now.getTime();
    this.rollDay(now);
    this.prune(nowMs);
    if (!this.dailyAvailable()) return { ok: false, reason: "daily" };
    const list = this.recent(clientKey, nowMs);
    if (list.length >= this.cfg.perIpPer10Min) return { ok: false, reason: "per_ip" };
    list.push(nowMs);
    this.hits.set(clientKey, list);
    this.used += 1;
    this.spent += this.cfg.estCostPerCallUsd;
    return { ok: true, ticket: { dayKey: this.day, estimateUsd: this.cfg.estCostPerCallUsd } };
  }

  /** Replaces the estimate with the real cost once the call returns usage. */
  settle(ticket: Ticket, actualUsd: number | null): void {
    if (actualUsd === null || !Number.isFinite(actualUsd) || ticket.dayKey !== this.day) return;
    this.spent = Math.max(0, this.spent - ticket.estimateUsd + actualUsd);
  }

  snapshot(): LimitsSnapshot {
    this.rollDay(this.clock());
    return {
      perIpPer10Min: this.cfg.perIpPer10Min,
      dailyLive: this.cfg.dailyLive,
      usedToday: this.used,
      spentTodayUsd: Math.round(this.spent * 10000) / 10000,
      dailySpendCapUsd: this.cfg.dailySpendCapUsd,
      day: this.day,
    };
  }
}
