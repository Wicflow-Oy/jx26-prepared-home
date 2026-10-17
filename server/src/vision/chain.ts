import type { VisionAssessment } from "@prepared-home/engine";
import { costUsd, type LiveGuard } from "../limits";
import { errorTag, silentLogger, type Logger } from "../log";
import { note } from "../notes";
import type { CachedVisionProvider } from "./cached";
import { MockVisionProvider } from "./mock";
import { allNull } from "./prompt";
import type { LiveAssessment, Source, VisionInput, VisionProvider } from "./types";

export interface ChainResult {
  /** null means the live call failed: the engine then says "Couldn't check the photo. Try again." */
  assessment: VisionAssessment | null;
  source: Source;
  sourceNote?: string;
  model: string;
  recordedAt?: string;
}

export interface ChainOptions {
  cache: CachedVisionProvider;
  live: VisionProvider | null; // null when ANTHROPIC_API_KEY is not set
  mock?: VisionProvider;
  guard?: LiveGuard | null;
  clock?: () => Date;
  logger?: Logger;
}

/**
 * CONTRACTS §3 chain with §9.2 limits: cached (by photo hash) → anthropic (when the key is set and limits allow)
 * → offline mock. Every result says which source answered. Limits never surface as errors.
 */
export class VisionChain {
  readonly cache: CachedVisionProvider;
  readonly live: VisionProvider | null;
  private readonly mock: VisionProvider;
  private readonly guard: LiveGuard | null;
  private readonly clock: () => Date;
  private readonly logger: Logger;

  constructor(opts: ChainOptions) {
    this.cache = opts.cache;
    this.live = opts.live;
    this.mock = opts.mock ?? new MockVisionProvider();
    this.guard = opts.guard ?? null;
    this.clock = opts.clock ?? (() => new Date());
    this.logger = opts.logger ?? silentLogger;
  }

  /** True when a live call could happen right now (key set and the daily caps not reached). */
  liveAvailable(): boolean {
    return this.live !== null && (this.guard ? this.guard.dailyAvailable() : true);
  }

  async assess(input: VisionInput & { sha256: string; clientKey: string }): Promise<ChainResult> {
    const { check, lang, sha256, clientKey } = input;

    // Recorded results are single photos (the samples); a two-angle check always goes live.
    const hit = input.secondImage ? null : await this.cache.lookup(sha256, check.id);
    if (hit) {
      return {
        assessment: hit.assessment,
        source: "cached",
        sourceNote: note("recorded", lang, { date: hit.recordedAt.slice(0, 10) }),
        model: hit.model,
        recordedAt: hit.recordedAt,
      };
    }

    if (!this.live) {
      return {
        assessment: await this.mock.assess(input),
        source: "offline",
        sourceNote: note("offline", lang),
        model: this.mock.model,
      };
    }

    const reservation = this.guard ? this.guard.tryReserve(clientKey) : null;
    if (reservation && !reservation.ok) {
      const text = note(reservation.reason === "daily" ? "daily" : "perIp", lang);
      return {
        assessment: allNull(check, this.mock.model, text),
        source: "offline",
        sourceNote: text,
        model: this.mock.model,
      };
    }

    try {
      const assessment = (await this.live.assess(input)) as LiveAssessment;
      const { usage, ...clean } = assessment;
      if (reservation?.ok && this.guard)
        this.guard.settle(reservation.ticket, usage ? costUsd(clean.model, usage) : null);
      if (this.cache.canWrite) {
        try {
          await this.cache.store(sha256, check.id, clean, this.clock());
        } catch {
          this.logger.warn("cache write failed");
        }
      }
      return { assessment: clean, source: "live", model: clean.model };
    } catch (err) {
      this.logger.warn(`live vision call failed (${errorTag(err)})`);
      return {
        assessment: null,
        source: "offline",
        sourceNote: note("error", lang),
        model: this.live.model,
      };
    }
  }
}
