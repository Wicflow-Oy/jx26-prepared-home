// CONTRACTS §5 home-based routes. Mounted only when STORE_MODE=file: the server keeps homes and records,
// modelling an insurer that holds each check's status, date and photo hash. The public demo is stateless (v1.ts).

import {
  adjusterView,
  DEMO,
  homeCard,
  notApplicableOutcome,
  perilStatuses,
  recordFromOutcome,
  reminders,
  type AdjusterView,
  type Home,
  type HomeStatus,
} from "@prepared-home/engine";
import { Router } from "express";
import type { AppDeps } from "../deps";
import type { FileStore } from "../store";
import {
  bad,
  hashShared,
  HttpError,
  isPlainObject,
  parseHomeType,
  parseId,
  parseIsoDate,
  parseLang,
  parseOptionalHomeType,
  parsePeril,
  parseUserAnswers,
  receiveImage,
} from "../validate";
import { checkForHome, checksView, clientKey, healthBase, runCheck } from "./common";

export function fileModeRouter(deps: AppDeps, store: FileStore): Router {
  const r = Router();
  const claims = new Map<string, AdjusterView>(); // in memory only

  const homeOr404 = (homeId: string): Home => {
    const home = store.getHome(homeId);
    if (!home) throw new HttpError(404, "unknown_home", "Unknown home id");
    return home;
  };

  r.get("/health", async (_req, res) => {
    res.json(await healthBase(deps));
  });

  r.get("/checks", (req, res) => {
    res.json(checksView(parseOptionalHomeType(req.query.homeType), parseLang(req.query.lang)));
  });

  r.get("/frost", async (req, res) => {
    res.json(await deps.frost.forecast(req.query.place));
  });

  r.post("/homes", async (req, res) => {
    const body: unknown = req.body;
    if (!isPlainObject(body)) throw bad("JSON body required");
    if (typeof body.hasLeakAlarm !== "boolean") throw bad("hasLeakAlarm must be a boolean");
    const home: Home = {
      homeId: deps.newId("home"),
      homeType: parseHomeType(body.homeType),
      label:
        typeof body.label === "string" && body.label.trim()
          ? body.label.trim().slice(0, 120)
          : "My home",
      moveInDate: parseIsoDate(body.moveInDate, "moveInDate"),
      hasLeakAlarm: body.hasLeakAlarm,
    };
    await store.addHome(home);
    res.status(201).json(home);
  });

  r.get("/homes/:homeId/status", async (req, res) => {
    const home = homeOr404(req.params.homeId);
    const lang = parseLang(req.query.lang);
    const now = deps.clock();
    const records = store.records(home.homeId);
    const frost = await deps.frost.forecast("Turku");
    const status: HomeStatus = {
      home,
      perils: perilStatuses(home, records, now),
      reminders: reminders(home, records, now, frost),
      homeCard: homeCard(home, records, now, frost, lang),
    };
    res.json(status);
  });

  r.post("/homes/:homeId/checks/:checkId", async (req, res) => {
    const home = homeOr404(req.params.homeId);
    const check = checkForHome(req.params.checkId, home.homeType);
    const body: unknown = req.body;
    if (!isPlainObject(body)) throw bad("JSON body required");
    if (body.photoSha256 === undefined) throw bad("photoSha256 is required");
    const image = receiveImage(body.imageBase64, body.photoSha256);
    const result = await runCheck(deps, {
      check,
      homeId: home.homeId,
      homeType: home.homeType,
      lang: parseLang(body.lang),
      image,
      userAnswers: parseUserAnswers(body.userAnswers),
      clientKey: clientKey(deps, req),
    });
    await store.putRecord(result.record);
    res.json(result);
  });

  r.post("/homes/:homeId/checks/:checkId/not-applicable", async (req, res) => {
    const home = homeOr404(req.params.homeId);
    const check = checkForHome(req.params.checkId, home.homeType);
    if (!check.notApplicableAllowed)
      throw new HttpError(
        400,
        "not_applicable_not_allowed",
        `Check ${check.id} can't be marked not applicable`,
      );
    const outcome = notApplicableOutcome(check, parseLang(req.query.lang), home.homeType);
    const record = recordFromOutcome(home.homeId, outcome, deps.clock(), null, home.homeType);
    await store.putRecord(record);
    res.json({ record });
  });

  r.post("/homes/:homeId/reset", async (req, res) => {
    const home = homeOr404(req.params.homeId);
    if (!home.demo) throw new HttpError(400, "not_a_demo_home", "Only demo homes can be reset");
    await store.resetHome(home.homeId, DEMO);
    res.json({ ok: true });
  });

  r.get("/demo/homes", (_req, res) => {
    const ids = new Set(DEMO.homes.map((h) => h.homeId));
    res.json(store.homes().filter((h) => ids.has(h.homeId)));
  });

  r.post("/claims", (req, res) => {
    const body: unknown = req.body;
    if (!isPlainObject(body)) throw bad("JSON body required");
    const home = homeOr404(parseId(body.homeId, "homeId"));
    const peril = parsePeril(body.peril);
    const lossDate = parseIsoDate(body.lossDate, "lossDate");
    const shared = hashShared(body.shared); // hashed, compared by the engine, then discarded
    const view = adjusterView({
      claimId: deps.newId("claim"),
      home,
      records: store.records(home.homeId),
      peril,
      lossDate,
      shared,
    });
    claims.set(view.claimId, view);
    if (claims.size > 500) claims.delete(claims.keys().next().value as string);
    res.json(view);
  });

  r.get("/claims/:claimId", (req, res) => {
    const view = claims.get(req.params.claimId);
    if (!view) throw new HttpError(404, "unknown_claim", "Unknown claim id");
    res.json(view);
  });

  return r;
}
