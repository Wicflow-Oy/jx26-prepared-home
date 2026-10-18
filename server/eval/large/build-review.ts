// Generates review.html: one static page (no external requests) for the team to review the draft labels.
// It embeds manifest.json and the check criteria, and loads the photos from ./photos/ next to it.
//   cd server && npx tsx eval/large/build-review.ts      (label.ts --merge runs this too)

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getCheck, type HomeType } from "@prepared-home/engine";
import { writeFormatted } from "./format";

const here = path.dirname(fileURLToPath(import.meta.url));

interface Row {
  file: string;
  checkId: string;
  homeType: HomeType;
}

export async function buildReview(): Promise<string> {
  const rows = JSON.parse(await fs.readFile(path.join(here, "manifest.json"), "utf8")) as Row[];
  const checks: Record<string, unknown> = {};
  for (const r of rows) {
    const key = `${r.checkId}|${r.homeType}`;
    if (checks[key]) continue;
    const c = getCheck(r.checkId, r.homeType);
    checks[key] = {
      title: c.title.en,
      coach: c.coach.en,
      criteria: c.criteria.map((k) => ({ id: k.id, kind: k.kind, text: k.text.en })),
    };
  }
  // "<" is escaped so no string in the data can close the script element.
  const data = JSON.stringify({ checks, rows }).replace(/</g, "\\u003c");
  const out = path.join(here, "review.html");
  await writeFormatted(out, PAGE.replace("__DATA__", data), "html");
  return out;
}

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Label Review</title>
<style>
:root {
  color-scheme: light dark;
  --bg: #f6f7f9; --panel: #ffffff; --text: #16191d; --muted: #5d6670; --line: #dde1e6;
  --accent: #2457c5; --ok: #1d7a46; --warn: #a15c00; --bad: #b3261e; --skip: #6b7280;
  --chip: #eef1f5; --focus: #2457c5;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #111418; --panel: #1a1e24; --text: #e8ebef; --muted: #9aa4af; --line: #2c323a;
    --accent: #7aa2ff; --ok: #4cc38a; --warn: #f0a83c; --bad: #ff7a70; --skip: #9ca3af;
    --chip: #242a32; --focus: #7aa2ff;
  }
}
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; }
body { background: var(--bg); color: var(--text); font: 14px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; display: flex; flex-direction: column; }
header { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; padding: 8px 16px; border-bottom: 1px solid var(--line); background: var(--panel); }
header h1 { font-size: 15px; margin: 0; }
header label { display: inline-flex; gap: 6px; align-items: center; color: var(--muted); }
header select, header button, .actions button, textarea { font: inherit; color: inherit; }
header select { background: var(--panel); border: 1px solid var(--line); border-radius: 6px; padding: 3px 6px; }
.progress { flex: 1 1 200px; min-width: 160px; }
.bar { height: 6px; background: var(--chip); border-radius: 3px; overflow: hidden; margin-top: 3px; }
.bar > div { height: 100%; background: var(--accent); width: 0; }
.btn { border: 1px solid var(--line); background: var(--panel); border-radius: 6px; padding: 5px 10px; cursor: pointer; }
.btn:hover { border-color: var(--accent); }
.btn:focus-visible, textarea:focus-visible, select:focus-visible { outline: 2px solid var(--focus); outline-offset: 1px; }
main { flex: 1; display: grid; grid-template-columns: minmax(0, 1fr) 400px; min-height: 0; }
.photo { display: flex; align-items: center; justify-content: center; padding: 12px; min-height: 0; background: var(--bg); }
.photo img { max-width: 100%; max-height: calc(100vh - 90px); object-fit: contain; border-radius: 4px; background: var(--chip); }
.photo .missing { color: var(--muted); max-width: 420px; text-align: center; }
aside { border-left: 1px solid var(--line); background: var(--panel); overflow-y: auto; padding: 14px 16px 24px; display: flex; flex-direction: column; gap: 12px; }
.meta { color: var(--muted); font-size: 12px; }
.check h2 { font-size: 17px; margin: 2px 0 2px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { background: var(--chip); border-radius: 999px; padding: 2px 9px; font-size: 12px; }
.chip.flag { color: var(--warn); }
ul.criteria { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
ul.criteria li { display: grid; grid-template-columns: 22px 1fr; gap: 6px; align-items: start; }
.mark { font-weight: 700; text-align: center; }
.mark.y { color: var(--ok); } .mark.n { color: var(--bad); } .mark.q { color: var(--warn); } .mark.u { color: var(--muted); }
.kind { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: .03em; }
.draft { border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; }
.draft .label { font-size: 12px; color: var(--muted); }
.verdict { font-weight: 700; }
.v-verified { color: var(--ok); } .v-retake { color: var(--warn); } .v-fix_first { color: var(--bad); } .v-skip { color: var(--skip); }
.second.differs { border-color: var(--warn); }
.actions { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.actions button { border: 1px solid var(--line); background: var(--panel); border-radius: 8px; padding: 10px 8px; cursor: pointer; text-align: left; }
.actions button kbd { float: right; color: var(--muted); font: 12px ui-monospace, monospace; }
.actions button.chosen { outline: 2px solid var(--accent); }
.actions button.is-draft::after { content: "draft"; font-size: 11px; color: var(--muted); margin-left: 6px; }
textarea { width: 100%; min-height: 54px; border: 1px solid var(--line); border-radius: 6px; padding: 6px 8px; background: var(--panel); resize: vertical; }
.nav { display: flex; gap: 8px; align-items: center; justify-content: space-between; }
.help { color: var(--muted); font-size: 12px; }
.credit { color: var(--muted); font-size: 12px; word-break: break-word; }
.credit a { color: var(--accent); }
.done { padding: 40px; text-align: center; color: var(--muted); }
@media (max-width: 860px) {
  main { grid-template-columns: 1fr; }
  aside { border-left: 0; border-top: 1px solid var(--line); }
  .photo img { max-height: 55vh; }
}
</style>
</head>
<body>
<header>
  <h1>Prepared Home: label review</h1>
  <div class="progress"><span id="progressText"></span><div class="bar"><div id="bar"></div></div></div>
  <label>Order <select id="order"><option value="flagged">Flagged and low confidence first</option><option value="manifest">Manifest order</option></select></label>
  <label><input type="checkbox" id="onlyOpen" checked /> Not reviewed only</label>
  <label>Check <select id="checkFilter"><option value="">All</option></select></label>
  <button class="btn" id="export" type="button">Export reviewed manifest</button>
  <button class="btn" id="importBtn" type="button">Import</button>
  <input type="file" id="importFile" accept="application/json,.json" hidden />
</header>
<main>
  <section class="photo" id="photo"></section>
  <aside id="panel"></aside>
</main>
<script id="data" type="application/json">__DATA__</script>
<script>
(function () {
  "use strict";
  var DATA = JSON.parse(document.getElementById("data").textContent);
  var ROWS = DATA.rows;
  var KEY = "prepared-home-large-review-v1";
  var VERDICT_NAME = { verified: "Verified", retake: "Retake", fix_first: "Fix first", skip: "Skip (bad item)" };
  var CONF_RANK = { low: 0, medium: 1, high: 2 };

  var decisions = {};
  try { decisions = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { decisions = {}; }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(decisions)); } catch (e) { /* storage unavailable */ } }
  function decisionFor(row) { var d = decisions[row.file]; return d && d.sha256 === row.sha256 ? d : null; }

  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  var checkIds = Array.from(new Set(ROWS.map(function (r) { return r.checkId; }))).sort();
  checkIds.forEach(function (id) { var o = el("option", null, id); o.value = id; $("checkFilter").appendChild(o); });

  function priority(r) {
    var flags = r.reviewFlags || [];
    var p = 0;
    if (flags.indexOf("passes disagree") >= 0) p -= 100;
    if (flags.length) p -= 10 * flags.length;
    p += 3 * (CONF_RANK[r.confidence] != null ? CONF_RANK[r.confidence] : 1);
    if (r.secondPass) p += CONF_RANK[r.secondPass.confidence] != null ? CONF_RANK[r.secondPass.confidence] : 1;
    return p;
  }

  var queue = [];
  var pos = 0;
  function rebuild(keepFile) {
    var onlyOpen = $("onlyOpen").checked;
    var chk = $("checkFilter").value;
    queue = ROWS.map(function (r, i) { return { r: r, i: i }; }).filter(function (x) {
      return (!chk || x.r.checkId === chk) && (!onlyOpen || !decisionFor(x.r) || x.r.file === keepFile);
    });
    if ($("order").value === "flagged") queue.sort(function (a, b) { return priority(a.r) - priority(b.r) || a.i - b.i; });
    var at = keepFile ? queue.findIndex(function (x) { return x.r.file === keepFile; }) : -1;
    pos = at >= 0 ? at : 0;
    render();
  }

  function progress() {
    var done = 0, agree = 0;
    ROWS.forEach(function (r) { var d = decisionFor(r); if (d) { done++; if (d.verdict === r.expectedVerdict) agree++; } });
    $("progressText").textContent = done + " of " + ROWS.length + " reviewed" + (done ? " (" + agree + " kept the draft verdict)" : "") + (queue.length ? " | item " + (pos + 1) + " of " + queue.length + " in this view" : "");
    $("bar").style.width = (100 * done / ROWS.length).toFixed(1) + "%";
  }

  function mark(met) {
    if (met === true) return ["y", "\\u2713"];
    if (met === false) return ["n", "\\u2717"];
    if (met === null) return ["q", "?"];
    return ["u", "\\u2013"];
  }

  function render() {
    progress();
    var photo = $("photo"), panel = $("panel");
    photo.textContent = ""; panel.textContent = "";
    if (!queue.length) {
      panel.appendChild(el("div", "done", "Nothing left in this view. Untick \\u201cNot reviewed only\\u201d to see reviewed items, or export the reviewed manifest."));
      return;
    }
    var r = queue[pos].r;
    var check = DATA.checks[r.checkId + "|" + r.homeType];
    var d = decisionFor(r);

    var img = new Image();
    img.alt = r.title || r.file;
    img.src = "photos/" + encodeURIComponent(r.file);
    img.title = "Click to open the full image";
    img.addEventListener("click", function () { window.open(img.src, "_blank", "noopener"); });
    img.addEventListener("error", function () {
      photo.textContent = "";
      photo.appendChild(el("p", "missing", "Photo " + r.file + " is not on this computer. Run node fetch.mjs in server/eval/large to download the set."));
    });
    photo.appendChild(img);
    var nextRow = queue[pos + 1];
    if (nextRow) { var pre = new Image(); pre.src = "photos/" + encodeURIComponent(nextRow.r.file); }

    var head = el("div", "check");
    head.appendChild(el("div", "meta", r.file + " \\u00b7 " + r.checkId + " \\u00b7 " + (r.homeType === "house" ? "house" : "flat")));
    head.appendChild(el("h2", null, check ? check.title : r.checkId));
    var chips = el("div", "chips");
    if (r.hardCase) chips.appendChild(el("span", "chip", "hard case: " + r.hardCase));
    if (r.synthetic) chips.appendChild(el("span", "chip", "synthetic: " + r.synthetic));
    (r.reviewFlags || []).forEach(function (f) { chips.appendChild(el("span", "chip flag", f)); });
    if (chips.childNodes.length) head.appendChild(chips);
    panel.appendChild(head);

    if (check) {
      var ul = el("ul", "criteria");
      check.criteria.forEach(function (c) {
        var li = el("li");
        var met = c.kind === "user" ? undefined : (r.draftCriteria || {})[c.id];
        var m = mark(met);
        li.appendChild(el("span", "mark " + m[0], m[1]));
        var body = el("div");
        body.appendChild(el("div", "kind", c.kind === "user" ? "customer answers (yes in the eval)" : c.kind));
        body.appendChild(el("div", null, c.text));
        li.appendChild(body);
        ul.appendChild(li);
      });
      panel.appendChild(ul);
    }

    var draft = el("div", "draft");
    draft.appendChild(el("div", "label", "Draft label (" + (r.labelSource || "draft") + ")"));
    var v = el("div", "verdict v-" + r.expectedVerdict, (VERDICT_NAME[r.expectedVerdict] || r.expectedVerdict) + " \\u00b7 " + (r.confidence || "?") + " confidence");
    draft.appendChild(v);
    if (r.draftReproduction) draft.appendChild(el("div", "meta", "Labeller saw a screen or printout."));
    draft.appendChild(el("div", null, r.rationale || ""));
    panel.appendChild(draft);

    if (r.secondPass) {
      var differs = r.secondPass.verdict !== r.expectedVerdict;
      var sp = el("div", "draft second" + (differs ? " differs" : ""));
      sp.appendChild(el("div", "label", "Second pass (" + r.secondPass.labelSource + ")" + (differs ? ": disagrees" : ": agrees")));
      sp.appendChild(el("div", "verdict v-" + r.secondPass.verdict, (VERDICT_NAME[r.secondPass.verdict] || r.secondPass.verdict) + " \\u00b7 " + r.secondPass.confidence + " confidence"));
      sp.appendChild(el("div", null, r.secondPass.rationale || ""));
      panel.appendChild(sp);
    }

    if (r.tieBreak) {
      var tdiff = r.tieBreak.verdict !== r.expectedVerdict;
      var tb = el("div", "draft second" + (tdiff ? " differs" : ""));
      tb.appendChild(el("div", "label", "Tie-break, prompt a at effort max (" + r.tieBreak.labelSource + ")" + (tdiff ? ": differs from the draft" : ": agrees with the draft")));
      tb.appendChild(el("div", "verdict v-" + r.tieBreak.verdict, (VERDICT_NAME[r.tieBreak.verdict] || r.tieBreak.verdict) + " \u00b7 " + r.tieBreak.confidence + " confidence"));
      tb.appendChild(el("div", null, r.tieBreak.rationale || ""));
      panel.appendChild(tb);
    }

    var actions = el("div", "actions");
    [["verified", "1"], ["retake", "2"], ["fix_first", "3"], ["skip", "0"]].forEach(function (a) {
      var b = el("button", "v-" + a[0] + (d && d.verdict === a[0] ? " chosen" : "") + (r.expectedVerdict === a[0] ? " is-draft" : ""));
      b.type = "button";
      b.appendChild(document.createTextNode(VERDICT_NAME[a[0]]));
      b.appendChild(el("kbd", null, a[1]));
      b.addEventListener("click", function () { decide(a[0]); });
      actions.appendChild(b);
    });
    panel.appendChild(actions);

    var note = el("textarea");
    note.id = "note";
    note.placeholder = "Optional note (saved with your choice)";
    note.value = d && d.note ? d.note : "";
    note.addEventListener("input", function () {
      var cur = decisionFor(r);
      if (cur) { cur.note = note.value; persist(); }
    });
    panel.appendChild(note);

    var nav = el("div", "nav");
    var prev = el("button", "btn", "\\u2190 Previous"); prev.type = "button"; prev.addEventListener("click", function () { move(-1); });
    var next = el("button", "btn", "Next \\u2192"); next.type = "button"; next.addEventListener("click", function () { move(1); });
    nav.appendChild(prev); nav.appendChild(next);
    panel.appendChild(nav);
    panel.appendChild(el("div", "help", "Keys: 1 Verified, 2 Retake, 3 Fix first, 0 Skip (bad item), Enter keeps the draft verdict, \\u2190 \\u2192 move, N focuses the note. A choice moves on to the next item."));
    if (d) panel.appendChild(el("div", "meta", "Reviewed: " + VERDICT_NAME[d.verdict] + (d.at ? " (" + d.at.slice(0, 16).replace("T", " ") + ")" : "")));

    var credit = el("div", "credit");
    credit.appendChild(document.createTextNode("\\u201c" + (r.title || "") + "\\u201d by " + (r.author || "unknown") + ", " + (r.licence || "") + (r.synthetic ? ", modified (" + r.synthetic + ")" : "") + ". "));
    if (/^https:\\/\\/commons\\.wikimedia\\.org\\//.test(r.sourceUrl || "")) {
      var a = el("a", null, "Source on Wikimedia Commons");
      a.href = r.sourceUrl; a.target = "_blank"; a.rel = "noopener noreferrer";
      credit.appendChild(a);
    }
    panel.appendChild(credit);
  }

  function decide(verdict) {
    if (!queue.length) return;
    var r = queue[pos].r;
    var noteEl = $("note");
    decisions[r.file] = { verdict: verdict, note: noteEl ? noteEl.value.trim() : "", sha256: r.sha256, at: new Date().toISOString() };
    persist();
    if ($("onlyOpen").checked) {
      queue.splice(pos, 1);
      if (pos >= queue.length) pos = Math.max(0, queue.length - 1);
      render();
    } else move(1);
  }

  function move(step) {
    if (!queue.length) return;
    pos = Math.min(queue.length - 1, Math.max(0, pos + step));
    render();
  }

  document.addEventListener("keydown", function (e) {
    if (e.target && (e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT" || e.target.tagName === "INPUT")) {
      if (e.key === "Escape") e.target.blur();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var map = { "1": "verified", "2": "retake", "3": "fix_first", "0": "skip" };
    if (map[e.key]) { e.preventDefault(); decide(map[e.key]); }
    else if (e.key === "Enter" && queue.length) { e.preventDefault(); decide(queue[pos].r.expectedVerdict); }
    else if (e.key === "ArrowRight") { e.preventDefault(); move(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); move(-1); }
    else if (e.key === "n" || e.key === "N") { var n = $("note"); if (n) { e.preventDefault(); n.focus(); } }
  });

  ["order", "onlyOpen", "checkFilter"].forEach(function (id) {
    $(id).addEventListener("change", function () { rebuild(queue.length ? queue[pos].r.file : null); });
  });

  $("export").addEventListener("click", function () {
    var stamp = new Date().toISOString();
    var out = ROWS.map(function (r) {
      var d = decisionFor(r);
      if (!d) return r;
      var copy = Object.assign({}, r);
      copy.draftVerdict = r.expectedVerdict;
      copy.labelSource = "reviewed";
      copy.reviewedAt = d.at || stamp;
      if (d.note) copy.reviewNote = d.note;
      if (d.verdict === "skip") copy.excluded = true;
      else copy.expectedVerdict = d.verdict;
      return copy;
    });
    var blob = new Blob([JSON.stringify(out, null, 2) + "\\n"], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "manifest.reviewed.json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });

  $("importBtn").addEventListener("click", function () { $("importFile").click(); });
  $("importFile").addEventListener("change", function () {
    var f = this.files && this.files[0];
    if (!f) return;
    f.text().then(function (text) {
      var rows = JSON.parse(text);
      var n = 0;
      (Array.isArray(rows) ? rows : []).forEach(function (x) {
        if (!x || x.labelSource !== "reviewed" || typeof x.file !== "string") return;
        var own = ROWS.find(function (r) { return r.file === x.file && r.sha256 === x.sha256; });
        if (!own) return;
        decisions[x.file] = { verdict: x.excluded ? "skip" : x.expectedVerdict, note: x.reviewNote || "", sha256: x.sha256, at: x.reviewedAt || "" };
        n++;
      });
      persist();
      alert("Imported " + n + " reviewed rows.");
      rebuild(null);
    }).catch(function () { alert("That file is not a reviewed manifest."); });
    this.value = "";
  });

  rebuild(null);
})();
</script>
</body>
</html>
`;

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildReview().then(
    (file) => console.log(`Wrote ${file}`),
    (err: unknown) => {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    },
  );
}
