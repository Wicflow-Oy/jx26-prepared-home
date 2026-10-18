// Builds the large eval set from Wikimedia Commons (read-only API, at most one request per second).
//
//   node collect.mjs search   --work <dir>                     # runs SEARCH_PLAN, writes <dir>/candidates.json
//   node collect.mjs download --work <dir> [--ids <file>]      # 1280 px thumbnails of the candidates into <dir>/thumbs/
//   node collect.mjs build    --work <dir> --selection <file>  # copies the picked photos to photos/ and writes manifest.json
//
// Only CC0, public domain, CC BY and CC BY-SA files are kept (from each file's extmetadata), JPEG only, no file
// tagged with personality rights. Candidates were shortlisted from their titles and descriptions, and every
// shortlisted thumbnail was then looked at on contact sheets to pick the photos, assign each to one check and mark
// hard cases (see README.md). The picks are the --selection file. Labels are added later by label.ts.

import { existsSync, promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import {
  acceptedLicence,
  apiQuery,
  cleanAuthor,
  cleanThumbUrl,
  degrade,
  download,
  hasPersonalityRestriction,
  plainText,
  sha256Hex,
  SYNTHETIC_RECIPES,
  THUMB_WIDTH,
} from "./commons.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

/** Search plan: Commons categories (cat) and full-text searches (q) per check, plus hard-case sources (H-*). */
export const SEARCH_PLAN = {
  L1: {
    cat: ["Ball valves", "Stopcocks", "Water meters"],
    q: [
      "ball valve water pipe",
      "water shut-off valve",
      "main water valve",
      "water meter valve",
      "stop valve water",
      "water shutoff valve",
    ],
  },
  L2: {
    cat: ["Laundry rooms", "Washing machines"],
    q: [
      "washing machine hose",
      "washing machine tap",
      "washing machine connection",
      "washing machine inlet hose",
      "washing machine valve",
      "washing machine water supply",
      "washing machine back",
      "behind washing machine",
      "washing machine installation",
      "washing machine plumbing",
      "Waschmaschine Anschluss",
      "washing machine bathroom",
      "pesukone",
      "tvättmaskin",
    ],
  },
  L3: {
    cat: ["Trap (plumbing)", "Dishwashers"],
    q: [
      "dishwasher connection",
      "dishwasher hose",
      "dishwasher valve",
      "angle valve",
      "under sink plumbing",
      "under the kitchen sink",
      "kitchen renovation dishwasher",
      "dishwasher installation",
      "dishwasher plumbing",
      "kitchen renovation under sink",
      "dishwasher drain hose",
      "astianpesukone",
    ],
  },
  L4: {
    cat: ["Wet rooms"],
    q: [
      "drip tray washing machine",
      "washing machine drain pan",
      "drain pan",
      "washing machine bathroom floor",
      "refrigerator floor",
      "washing machine floor drain",
      "water heater drain pan",
      "leak under washing machine",
      "refrigerator water leak",
    ],
  },
  L5: {
    cat: ["Floor drains", "Trap (plumbing)"],
    q: ["floor drain", "shower drain", "sink trap", "P-trap", "clogged drain", "bathroom drain"],
  },
  L6: {
    cat: ["Silicone sealant", "Caulking"],
    q: [
      "silicone bathroom",
      "bathtub caulk",
      "shower silicone",
      "mould shower",
      "black mold bathroom",
      "sealant bath",
      "silicone joint",
      "mouldy silicone",
      "caulking bathtub",
      "Silikonfuge",
      "bathtub tiles",
      "shower tray",
      "mold shower",
      "bathroom silicone",
    ],
  },
  F1: {
    cat: ["Smoke detectors"],
    q: ["smoke detector ceiling", "smoke alarm ceiling", "smoke detector", "Rauchmelder"],
  },
  F2: {
    cat: [
      "Fuse boxes",
      "Fuse boxes with DIN rail",
      "Distribution boards",
      "Fuse boxes with cork fuses",
    ],
    q: ["consumer unit", "breaker panel", "electrical panel", "fuse box"],
  },
  F3: {
    cat: ["Refrigerator fan condensers"],
    q: [
      "refrigerator back",
      "back of refrigerator",
      "refrigerator condenser coil",
      "refrigerator compressor",
      "fridge coils",
      "refrigerator coils",
      "condenser coil dust",
      "behind the fridge",
      "refrigerator rear",
      "dusty refrigerator",
      "Kühlschrank Rückseite",
      "fridge back side",
    ],
  },
  F4: {
    cat: ["Cooktops", "Induction cookers", "Home kitchens in Finland"],
    q: ["stove top", "gas hob", "electric stove", "ceramic hob", "pots on stove", "kitchen stove"],
  },
  F5: {
    cat: ["Mobile phone chargers", "Batteries for electrically-powered bicycles"],
    q: [
      "phone charging",
      "laptop charging",
      "charging smartphone",
      "e-bike battery charging",
      "phone charging bed",
      "laptop on bed",
      "phone on charger",
      "smartphone charging cable",
      "e-bike charger",
    ],
  },
  Z1: {
    cat: ["Thermostatic radiator valves", "Thermostats"],
    q: ["radiator thermostat", "room thermostat", "heating controller", "radiator valve"],
  },
  Z2: {
    cat: [
      "Outdoor water taps",
      "Frostproof outdoor water taps",
      "Outdoor water taps in the Netherlands",
    ],
    q: [
      "outdoor tap",
      "garden tap hose",
      "hose bib",
      "outside faucet",
      "garden hose tap wall",
      "garden tap",
      "outside tap",
      "frost free faucet",
      "outdoor faucet hose",
      "garden hose connected",
      "Außenwasserhahn",
      "spigot hose",
    ],
  },
  S1: {
    cat: ["Rain gutters", "Gutter guards", "Leader heads"],
    q: ["gutter leaves", "clogged gutter", "downpipe", "rain gutter house", "downspout"],
  },
  "H-kitchen": { cat: ["Home kitchens in Finland", "Kitchens in Finland"], q: [] },
  "H-product": {
    cat: [],
    q: [
      "valve white background",
      "thermostat white background",
      "smoke detector white background",
      "refrigerator white background",
    ],
  },
  "H-dark": {
    cat: [],
    q: [
      "incategory:Underexposed_images kitchen",
      "incategory:Underexposed_images bathroom",
      "incategory:Underexposed_images pipe",
    ],
  },
  "H-blur": {
    cat: [],
    q: [
      "incategory:Blurred_images kitchen",
      "incategory:Blurred_images bathroom",
      "incategory:Blurred_images pipe",
      "incategory:Blurred_images radiator",
    ],
  },
  "H-screen": {
    cat: [],
    q: [
      "photo of computer screen",
      "laptop screen showing",
      "photograph of a television screen",
      "printed photograph",
      "photo of a monitor",
      "smartphone screen photo",
      "television screen showing",
    ],
  },
};

const META_FIELDS = [
  "LicenseShortName",
  "License",
  "LicenseUrl",
  "Artist",
  "Credit",
  "Restrictions",
  "ImageDescription",
  "AttributionRequired",
].join("|");

const IMAGEINFO = {
  prop: "imageinfo",
  iiprop: "url|size|mime|sha1|extmetadata",
  iiurlwidth: String(THUMB_WIDTH),
  iiextmetadatafilter: META_FIELDS,
  iiextmetadatalanguage: "en",
};

function toCandidate(page) {
  const ii = page.imageinfo?.[0];
  if (!ii) return { reject: "no imageinfo" };
  if (ii.mime !== "image/jpeg") return { reject: `mime ${ii.mime}` };
  const meta = ii.extmetadata ?? {};
  const licence = acceptedLicence(meta);
  if (!licence)
    return { reject: `licence ${plainText(meta.LicenseShortName?.value) || "unknown"}` };
  if (hasPersonalityRestriction(meta)) return { reject: "personality rights" };
  const long = Math.max(ii.width, ii.height);
  const ratio = ii.width / ii.height;
  if (long < 640) return { reject: "too small" };
  if (ratio < 0.45 || ratio > 2.4) return { reject: "aspect" };
  const author = plainText(meta.Artist?.value) || plainText(meta.Credit?.value);
  if (!author && licence.family !== "CC0" && licence.family !== "PD")
    return { reject: "no author for an attribution licence" };
  return {
    title: page.title,
    pageid: page.pageid,
    sourceUrl: ii.descriptionurl,
    thumbUrl: ii.thumburl ?? ii.url,
    thumbWidth: ii.thumbwidth ?? ii.width,
    thumbHeight: ii.thumbheight ?? ii.height,
    width: ii.width,
    height: ii.height,
    commonsSha1: ii.sha1,
    licence: licence.name,
    licenceFamily: licence.family,
    licenceUrl: licence.url,
    author: author || "Unknown author",
    description: plainText(meta.ImageDescription?.value).slice(0, 240),
  };
}

async function* pagesOf(params, maxFiles) {
  let cont = {};
  let seen = 0;
  for (;;) {
    const json = await apiQuery({ ...params, ...IMAGEINFO, ...cont });
    const pages = json.query?.pages ?? [];
    for (const p of pages) yield p;
    seen += pages.length;
    if (!json.continue || seen >= maxFiles) return;
    cont = json.continue;
  }
}

async function search(work) {
  const file = path.join(work, "candidates.json");
  const state = existsSync(file)
    ? JSON.parse(await fs.readFile(file, "utf8"))
    : { done: [], candidates: {}, rejected: {} };
  const save = () => fs.writeFile(file, JSON.stringify(state, null, 1));
  for (const [tag, plan] of Object.entries(SEARCH_PLAN)) {
    const jobs = [
      ...plan.cat.map((c) => ({
        key: `${tag}|cat|${c}`,
        params: {
          generator: "categorymembers",
          gcmtitle: `Category:${c}`,
          gcmtype: "file",
          gcmlimit: "50",
        },
        max: 200,
      })),
      ...plan.q.map((q) => ({
        key: `${tag}|q|${q}`,
        params: {
          generator: "search",
          gsrsearch: `${q} filemime:image/jpeg`,
          gsrnamespace: "6",
          gsrlimit: "50",
        },
        max: 50,
      })),
    ];
    for (const job of jobs) {
      if (state.done.includes(job.key)) continue;
      let added = 0;
      for await (const page of pagesOf(job.params, job.max)) {
        const c = toCandidate(page);
        if (c.reject) {
          state.rejected[c.reject] = (state.rejected[c.reject] ?? 0) + 1;
          continue;
        }
        const prev = state.candidates[c.title];
        if (prev) {
          if (!prev.tags.includes(tag)) prev.tags.push(tag);
          if (!prev.found.includes(job.key)) prev.found.push(job.key);
        } else {
          state.candidates[c.title] = { ...c, tags: [tag], found: [job.key] };
          added++;
        }
      }
      state.done.push(job.key);
      await save();
      console.log(`${job.key}: +${added} (total ${Object.keys(state.candidates).length})`);
    }
  }
  console.log("Rejected:", state.rejected);
}

async function downloadAll(work, idsFile) {
  const state = JSON.parse(await fs.readFile(path.join(work, "candidates.json"), "utf8"));
  const dir = path.join(work, "thumbs");
  await fs.mkdir(dir, { recursive: true });
  // Hashes go to thumbs/index.json, so a search can run at the same time without either overwriting the other.
  const indexFile = path.join(dir, "index.json");
  const index = existsSync(indexFile) ? JSON.parse(await fs.readFile(indexFile, "utf8")) : {};
  // With --ids, only the shortlisted candidates (picked from their titles and descriptions) are downloaded.
  const ids = idsFile ? new Set(JSON.parse(await fs.readFile(idsFile, "utf8")).map(Number)) : null;
  const list = Object.values(state.candidates).filter((c) => !ids || ids.has(c.pageid));
  let n = 0;
  for (const c of list) {
    const out = path.join(dir, `${c.pageid}.jpg`);
    if (index[c.pageid]?.sha256 && existsSync(out)) continue;
    if (existsSync(out) && !index[c.pageid]) {
      // Downloaded before an interrupted run saved its index: hash the file instead of fetching it again.
      index[c.pageid] = { sha256: sha256Hex(await fs.readFile(out)), title: c.title };
      continue;
    }
    try {
      const bytes = await download(c.thumbUrl);
      index[c.pageid] = { sha256: sha256Hex(bytes), title: c.title };
      await fs.writeFile(out, bytes);
    } catch (err) {
      index[c.pageid] = { error: String(err?.message ?? err), title: c.title };
      console.warn(`  ${c.title}: ${index[c.pageid].error}`);
    }
    if (++n % 20 === 0) {
      await fs.writeFile(indexFile, JSON.stringify(index, null, 1));
      console.log(`downloaded ${n}`);
    }
  }
  await fs.writeFile(indexFile, JSON.stringify(index, null, 1));
  console.log(`downloaded ${n} new thumbnails`);
}

/** selection: [{ title, checkId, homeType, hardCase?, synthetic?, author?, note? }], in manifest order. */
async function build(work, selectionFile) {
  const state = JSON.parse(await fs.readFile(path.join(work, "candidates.json"), "utf8"));
  const index = JSON.parse(await fs.readFile(path.join(work, "thumbs", "index.json"), "utf8"));
  const selection = JSON.parse(await fs.readFile(selectionFile, "utf8"));
  const photos = path.join(here, "photos");
  // photos/ is generated (and gitignored): start empty so no file from an earlier build is left behind.
  await fs.rm(photos, { recursive: true, force: true });
  await fs.mkdir(photos, { recursive: true });
  const seenSha = new Map();
  const usedTitles = new Set();
  const counters = {};
  const rows = [];
  for (const s of selection) {
    const c = state.candidates[s.title];
    const thumb = c ? path.join(work, "thumbs", `${c.pageid}.jpg`) : null;
    // A download that finished after the downloader last saved its index is accepted once it is 10 s old.
    const settled =
      thumb && existsSync(thumb) && Date.now() - (await fs.stat(thumb)).mtimeMs > 10_000;
    if (!c || (!index[c.pageid]?.sha256 && !settled)) throw new Error(`not downloaded: ${s.title}`);
    let bytes = await fs.readFile(thumb);
    const sourceSha256 = sha256Hex(bytes);
    if (index[c.pageid]?.sha256 && sourceSha256 !== index[c.pageid].sha256)
      throw new Error(`hash changed: ${s.title}`);
    if (s.synthetic) bytes = await degrade(bytes, s.synthetic);
    const sha256 = sha256Hex(bytes);
    if (seenSha.has(sha256)) throw new Error(`duplicate of ${seenSha.get(sha256)}: ${s.title}`);
    if (!s.synthetic && usedTitles.has(s.title))
      throw new Error(`same file used twice: ${s.title}`);
    if (!s.synthetic) usedTitles.add(s.title);
    seenSha.set(sha256, s.title);
    const prefix = s.hardCase ? `H-${s.checkId}` : s.checkId;
    counters[prefix] = (counters[prefix] ?? 0) + 1;
    const file = `${prefix}-${String(counters[prefix]).padStart(2, "0")}.jpg`;
    await fs.writeFile(path.join(photos, file), bytes);
    rows.push({
      file,
      checkId: s.checkId,
      homeType: s.homeType,
      ...(s.hardCase ? { hardCase: s.hardCase } : {}),
      ...(s.synthetic
        ? { synthetic: s.synthetic, syntheticRecipe: SYNTHETIC_RECIPES[s.synthetic], sourceSha256 }
        : {}),
      title: c.title.replace(/^File:/, ""),
      author: s.author ?? cleanAuthor(c.author), // s.author: a hand-shortened credit when Commons' text is a long note
      licence: c.licence,
      licenceUrl: c.licenceUrl,
      sourceUrl: c.sourceUrl,
      thumbUrl: cleanThumbUrl(c.thumbUrl),
      sha256,
      ...(s.note ? { curatorNote: s.note } : {}),
    });
  }
  return rows;
}

async function main() {
  const { values, positionals } = parseArgs({
    options: { work: { type: "string" }, selection: { type: "string" }, ids: { type: "string" } },
    allowPositionals: true,
  });
  const cmd = positionals[0];
  if (!values.work || !["search", "download", "build"].includes(cmd)) {
    console.error(
      "usage: node collect.mjs search|download|build --work <dir> [--selection <file>]",
    );
    return 2;
  }
  await fs.mkdir(values.work, { recursive: true });
  if (cmd === "search") await search(values.work);
  if (cmd === "download") await downloadAll(values.work, values.ids);
  if (cmd === "build") {
    if (!values.selection) throw new Error("--selection is required");
    const rows = await build(values.work, values.selection);
    const out = path.join(values.work, "built-rows.json");
    await fs.writeFile(out, JSON.stringify(rows, null, 2));
    console.log(`built ${rows.length} photos; rows in ${out}`);
  }
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(
    (code) => process.exit(code),
    (err) => {
      console.error(err?.stack ?? err);
      process.exit(1);
    },
  );
}
