// Stateless API (CONTRACTS §9.1): nothing is stored; photos are hashed and checked in memory, then dropped.

import { adjusterView } from "@prepared-home/engine";
import { Router } from "express";
import type { AppDeps } from "../deps";
import { sampleView } from "../samples";
import {
  bad,
  hashShared,
  isRecord,
  parseHome,
  parseHomeType,
  parseId,
  parseIsoDate,
  parseLang,
  parseOptionalHomeType,
  parsePeril,
  parseRecord,
  parseUserAnswers,
  receiveImage,
} from "../validate";
import { checkForHome, checksView, clientKey, healthBase, runCheck } from "./common";

export function v1Router(deps: AppDeps): Router {
  const r = Router();

  r.get("/health", async (_req, res) => {
    const base = await healthBase(deps);
    const limits = deps.guard.snapshot();
    res.json({
      ...base,
      liveAvailable: deps.chain.liveAvailable(),
      storeMode: deps.config.storeMode,
      limits: {
        perIpPer10Min: limits.perIpPer10Min,
        dailyLive: limits.dailyLive,
        usedToday: limits.usedToday,
        dailySpendCapUsd: limits.dailySpendCapUsd,
        spentTodayUsd: limits.spentTodayUsd,
      },
    });
  });

  r.get("/checks", (req, res) => {
    res.json(checksView(parseOptionalHomeType(req.query.homeType), parseLang(req.query.lang)));
  });

  r.get("/frost", async (req, res) => {
    res.json(await deps.frost.forecast(req.query.place));
  });

  r.get("/samples", async (req, res) => {
    const lang = parseLang(req.query.lang);
    const files = await deps.samples.all();
    const list = await Promise.all(
      files.map(async (s) => {
        const hit = await deps.chain.cache.lookup(s.sha256, s.def.checkId);
        return sampleView(s, lang, hit ? hit.recordedAt : null);
      }),
    );
    res.json(list);
  });

  r.post("/check", async (req, res) => {
    const body: unknown = req.body;
    if (!isRecord(body)) throw bad("JSON body required");
    const homeId = parseId(body.homeId, "homeId");
    const homeType = parseHomeType(body.homeType);
    const check = checkForHome(body.checkId, homeType);
    if (body.photoSha256 === undefined) throw bad("photoSha256 is required");
    const image = receiveImage(body.imageBase64, body.photoSha256);
    const result = await runCheck(deps, {
      check,
      homeId,
      homeType,
      lang: parseLang(body.lang),
      image,
      userAnswers: parseUserAnswers(body.userAnswers),
      clientKey: clientKey(deps, req),
      capture: parseCapture(body.capture),
    });
    res.json(result);
  });

  r.post("/claims", (req, res) => {
    const body: unknown = req.body;
    if (!isRecord(body)) throw bad("JSON body required");
    const home = parseHome(body.home);
    if (!Array.isArray(body.records) || body.records.length > 200)
      throw bad("records must be an array (at most 200)");
    const records = body.records.map((rec) => parseRecord(rec, home.homeId));
    const peril = parsePeril(body.peril);
    const lossDate = parseIsoDate(body.lossDate, "lossDate");
    const shared = hashShared(body.shared); // hashed in memory; the images go out of scope here
    const view = adjusterView({
      claimId: deps.newId("claim"),
      home,
      records,
      peril,
      lossDate,
      shared,
    });
    res.json(view);
  });

  return r;
}

/** The client says how the photo was taken. Unknown values count as "library", so they never earn the relief. */
function parseCapture(v: unknown): "camera" | "library" | "sample" {
  return v === "camera" || v === "sample" ? v : "library";
}
