import { existsSync } from "node:fs";
import type { ServerResponse } from "node:http";
import path from "node:path";
import express, { type NextFunction, type Request, type Response } from "express";
import type { AppDeps } from "./deps";
import { legacyRouter } from "./routes/legacy";
import { v1Router } from "./routes/v1";
import { HttpError } from "./validate";

export const BODY_LIMIT = "12mb";

const staticOptions = {
  extensions: ["html"],
  index: "index.html",
  // Hashed bundles can be cached; HTML must be revalidated so a redeploy shows up at once.
  setHeaders: (res: ServerResponse, file: string) => {
    res.setHeader("Cache-Control", file.endsWith(".html") ? "no-cache" : "public, max-age=3600");
  },
};

/** A browser navigation (no file extension, or .html), as opposed to a missing asset. */
function isPageRequest(req: Request): boolean {
  const ext = path.extname(req.path);
  return (req.method === "GET" || req.method === "HEAD") && (!ext || ext === ".html");
}

function notFound(res: Response): void {
  res.status(404).type("text/plain").send("Not found\n");
}

function sendFileOr404(res: Response, file: string): void {
  res.sendFile(file, (err) => {
    if (err && !res.headersSent) notFound(res);
  });
}

function sendPage(res: Response, file: string): void {
  res.setHeader("Cache-Control", "no-cache");
  sendFileOr404(res, file);
}

export function createApp(deps: AppDeps): express.Express {
  const { config, logger } = deps;
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", config.trustProxy); // a hop count: only the proxy's own X-Forwarded-For entry is trusted
  app.set("etag", false);

  // Headers on every response; never indexed.
  app.use((_req, res, next) => {
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    next();
  });

  // Request log: method, path, status, duration and a salted IP tag. Never bodies or query strings.
  app.use((req, res, next) => {
    const started = Date.now();
    const fullPath = req.originalUrl.split("?")[0];
    res.on("finish", () => {
      if (fullPath === "/api/v1/health" && res.statusCode === 200) return; // container healthchecks
      logger.request({
        method: req.method,
        path: fullPath.slice(0, 200),
        status: res.statusCode,
        ms: Date.now() - started,
        ip: deps.ipHash(req.ip ?? "unknown"),
      });
    });
    next();
  });

  // CORS for the API (the dev web app runs on another port).
  app.use("/api", (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", config.corsOrigin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Max-Age", "600");
    res.setHeader("Cache-Control", "no-store");
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });

  app.use("/api", express.json({ limit: BODY_LIMIT }));
  app.use("/api/v1", v1Router(deps));
  if (config.storeMode === "file" && deps.store) app.use("/api", legacyRouter(deps, deps.store));
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "not_found", message: "Unknown API route" });
  });

  // Licensed sample photos: only the listed files, never a directory listing.
  app.get("/samples/:file", async (req, res, next) => {
    const sample = await deps.samples.byFile(req.params.file);
    if (!sample) {
      next();
      return;
    }
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.type("image/jpeg");
    sendFileOr404(res, sample.path);
  });

  // Web export: a static landing page at WEB_DIST/index.html and the Expo app (an SPA) under WEB_DIST/app/.
  const landingHtml = path.join(config.webDist, "index.html");
  const appDir = path.join(config.webDist, "app");
  const appHtml = path.join(appDir, "index.html");
  const hasLanding = existsSync(landingHtml);
  const hasApp = existsSync(appHtml);

  if (hasApp) {
    app.use("/app", express.static(appDir, staticOptions));
    app.use("/app", (req, res) => {
      if (isPageRequest(req)) sendPage(res, appHtml);
      else notFound(res);
    });
  }
  if (hasLanding) app.use(express.static(config.webDist, staticOptions));

  app.get("/robots.txt", (_req, res) => {
    res.type("text/plain").send("User-agent: *\nDisallow: /\n");
  });

  app.use((req, res) => {
    if (hasLanding && isPageRequest(req)) {
      sendPage(res, landingHtml);
      return;
    }
    if (!hasLanding && req.path === "/") {
      res
        .type("text/plain")
        .send(
          "Prepared Home API (prototype for JunctionX, not an If service). The web app is not built here; see /api/v1/health.\n",
        );
      return;
    }
    notFound(res);
  });

  // Errors as JSON, without echoing the request. Express needs all four parameters to treat this as an error handler.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.code, message: err.message });
      return;
    }
    const type = (err as { type?: unknown })?.type;
    if (type === "entity.too.large") {
      res
        .status(413)
        .json({ error: "payload_too_large", message: `Request body is larger than ${BODY_LIMIT}` });
      return;
    }
    if (
      type === "entity.parse.failed" ||
      type === "encoding.unsupported" ||
      type === "charset.unsupported"
    ) {
      res.status(400).json({ error: "bad_request", message: "Body must be valid JSON" });
      return;
    }
    const status = (err as { status?: unknown })?.status;
    if (typeof status === "number" && status >= 400 && status < 500) {
      res.status(status).json({ error: "bad_request", message: "The request could not be served" });
      return;
    }
    logger.warn(`unhandled error (${(err as { name?: string })?.name ?? "Error"})`);
    res.status(500).json({ error: "internal", message: "Something went wrong" });
  });

  return app;
}
