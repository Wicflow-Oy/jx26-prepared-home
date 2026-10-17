import type { ServerConfig } from "./config";
import type { FrostService } from "./fmi";
import type { LiveGuard } from "./limits";
import type { Logger } from "./log";
import type { SampleCatalog } from "./samples";
import type { FileStore } from "./store";
import type { VisionChain } from "./vision/chain";

export interface AppDeps {
  config: ServerConfig;
  chain: VisionChain;
  guard: LiveGuard;
  frost: FrostService;
  samples: SampleCatalog;
  store: FileStore | null; // only in STORE_MODE=file
  logger: Logger;
  ipHash: (ip: string) => string;
  clock: () => Date;
  newId: (prefix: string) => string;
}
