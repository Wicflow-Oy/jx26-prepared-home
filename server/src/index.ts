import { createApp } from "./app";
import { IS_BUNDLED, loadConfig } from "./config";
import { buildDeps } from "./deps";
import { consoleLogger } from "./log";

const config = loadConfig();
const deps = await buildDeps(config);
const app = createApp(deps);

const server = app.listen(config.port, () => {
  consoleLogger.info(
    [
      `Prepared Home server on port ${config.port}`,
      `vision=${config.apiKey ? `anthropic:${config.visionModel}` : "offline"}`,
      `cacheWrite=${config.cacheWrite ? "on" : "off"}`,
      `bundled=${IS_BUNDLED ? "yes" : "no"}`,
    ].join(" "),
  );
});
server.requestTimeout = 120_000;

function shutdown(signal: string): void {
  consoleLogger.info(`${signal}: shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
