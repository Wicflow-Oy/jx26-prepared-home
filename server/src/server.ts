import { randomBytes } from "node:crypto";
import { DEMO } from "@prepared-home/engine";
import type { ServerConfig } from "./config";
import type { AppDeps } from "./deps";
import { FrostService, type FetchLike } from "./fmi";
import { makeIpHasher } from "./hash";
import { LiveGuard } from "./limits";
import { consoleLogger, type Logger } from "./log";
import { SampleCatalog } from "./samples";
import { FileStore } from "./store";
import { AnthropicVisionProvider } from "./vision/anthropic";
import { CachedVisionProvider } from "./vision/cached";
import { VisionChain } from "./vision/chain";
import type { VisionProvider } from "./vision/types";

export interface BuildOptions {
  live?: VisionProvider | null; // override the Anthropic provider (tests)
  fetchImpl?: FetchLike; // override FMI fetch (tests)
  clock?: () => Date;
  logger?: Logger;
}

export async function buildDeps(config: ServerConfig, opts: BuildOptions = {}): Promise<AppDeps> {
  const clock = opts.clock ?? (() => new Date());
  const logger = opts.logger ?? consoleLogger;
  const guard = new LiveGuard(
    {
      perIpPer10Min: config.ratePerIp10Min,
      dailyLive: config.dailyLiveLimit,
      dailySpendCapUsd: config.dailySpendCapUsd,
      estCostPerCallUsd: config.estCostPerCallUsd,
    },
    clock,
  );
  const live =
    opts.live !== undefined
      ? opts.live
      : config.apiKey
        ? new AnthropicVisionProvider({
            apiKey: config.apiKey,
            model: config.visionModel,
            effort: config.visionEffort,
          })
        : null;
  const cache = new CachedVisionProvider(config.cacheDir, config.cacheWrite);
  const chain = new VisionChain({ cache, live, guard, clock, logger });

  let store: FileStore | null = null;
  if (config.storeMode === "file") {
    store = new FileStore(config.storePath);
    await store.load();
    await store.seedDemo(DEMO);
  }

  return {
    config,
    chain,
    guard,
    frost: new FrostService({ fetchImpl: opts.fetchImpl, clock }),
    samples: new SampleCatalog(config.samplesDir),
    store,
    logger,
    ipHash: makeIpHasher(config.logSalt),
    clock,
    newId: (prefix) => `${prefix}-${randomBytes(6).toString("hex")}`,
  };
}
