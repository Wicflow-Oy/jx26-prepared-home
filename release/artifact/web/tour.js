// Guided tour: plays the app in the phone chapter by chapter and explains each step beside it.
// Tour contract v1 with the app:
//   landing → app: { type: "prepared-home:tour", step }
//   app → landing: { type: "prepared-home:tour-ready" } on every app load,
//                  { type: "prepared-home:tour-done", step } when a step's on-screen work is done.
import {
  STEPS,
  CHAPTERS,
  LABELS,
  CAPTIONS,
  FIGURES,
  CHIPS,
  NOTICE,
  VOICE,
  VOICE_CARD,
} from "./tour-captions.js";

// capture and fix wait for the app, then leave time to read; the fallback covers a silent app.
const WAIT_FOR_APP = new Set(["capture", "fix"]);
const READ_AFTER_DONE = 5000;
const DONE_FALLBACK = 20000;
const LOCALES = { en: "en-GB", fi: "fi-FI", sv: "sv-FI" };

const $ = (id) => document.getElementById(id);
const frame = $("app");
const root = document.documentElement;
const tour = $("tour");
const scene = $("tour-scene");
const reduce = matchMedia("(prefers-reduced-motion: reduce)");
const motion = () => !reduce.matches;

// Film timeline: one clickable chapter per step; the current one fills as it plays.
const timeline = $("timeline");
timeline.style.setProperty("--chapters", CHAPTERS.length);
const chapters = CHAPTERS.map((name, i) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "tl";
  button.innerHTML = '<span class="tl-bar"><i></i></span><span class="tl-num"></span><span></span>';
  button.querySelector(".tl-num").textContent = String(i + 1).padStart(2, "0");
  button.lastChild.textContent = name;
  button.addEventListener("click", () => go(i));
  timeline.append(button);
  return button;
});

let lang = "en";
let appReady = false; // set by tour-ready, cleared whenever the iframe reloads
let lastSent = null;
let index = -1; // -1 while the tour is off
let paused = false;
let waiting = false; // capture/fix before tour-done
let elapsed = 0;
let clockId = 0;
let countId = 0;

// ---- Talking to the app ----

function post(step) {
  lastSent = step;
  frame.contentWindow?.postMessage({ type: "prepared-home:tour", step }, location.origin);
}

// Until the app says it is ready, the current step simply waits and is sent on tour-ready.
function sendStep() {
  if (appReady && index >= 0) post(STEPS[index]);
}

window.addEventListener("message", (event) => {
  if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
  const { type, step } = event.data ?? {};
  if (type === "prepared-home:tour-ready") {
    appReady = true;
    sendStep();
  } else if (type === "prepared-home:tour-done" && STEPS.includes(step)) {
    if (index >= 0 && STEPS[index] === step && waiting) {
      waiting = false;
      elapsed = 0;
    }
  }
});

// main.js announces every reload (Restart demo, Start fresh, language) and the language in use.
document.addEventListener("prepared-home:app-load", (event) => {
  appReady = false;
  lang = event.detail.lang;
  if (index >= 0) fillStep(false);
});

// Free use comes first: any real tap or key inside the phone hands control to the judge.
function onAppInput(event) {
  if (event.isTrusted && index >= 0 && !paused) setPaused(true, true);
}
function watchApp() {
  try {
    frame.contentWindow.addEventListener("pointerdown", onAppInput, true);
    frame.contentWindow.addEventListener("keydown", onAppInput, true);
  } catch {
    // A cross-origin app cannot be watched; the tour then keeps playing until paused here.
  }
}
frame.addEventListener("load", watchApp);
watchApp();
$("device").addEventListener("pointerdown", onAppInput);

// ---- Building the stage for a step ----

function setTitle(title) {
  // Each word rises out of its own clip; the stagger comes from --i in tour.css.
  const parts = title.split(" ").flatMap((word, i) => {
    const clip = document.createElement("span");
    const inner = document.createElement("span");
    clip.className = "tour-word";
    inner.textContent = word;
    inner.style.setProperty("--i", i);
    clip.append(inner);
    return i ? [" ", clip] : [clip];
  });
  $("tour-title").replaceChildren(...parts);
  return parts.length;
}

function setFigure(step, animate) {
  const figure = FIGURES[step];
  const box = $("tour-figure");
  box.hidden = !figure;
  cancelAnimationFrame(countId);
  if (!figure) return;
  box.classList.toggle("is-pill", Boolean(figure.pill));
  $("tour-figure-label").textContent = (figure.pill ?? figure.label)[lang];
  if (figure.pill) return;
  const digits = figure.decimals ?? 0;
  const format = new Intl.NumberFormat(LOCALES[lang], {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  const show = (t) => {
    const values = figure.values.map((value) => format.format(value * t));
    $("tour-figure-num").textContent = values.join(" / ") + (figure.suffix ?? "");
  };
  if (!animate || !motion()) return show(1);
  const begin = performance.now() + 350;
  const count = (now) => {
    const t = Math.min(1, Math.max(0, (now - begin) / 1400));
    show(1 - (1 - t) ** 4);
    if (t < 1) countId = requestAnimationFrame(count);
  };
  show(0);
  countId = requestAnimationFrame(count);
}

function setChip(step) {
  const chip = CHIPS[step];
  const line = $("tour-chip");
  line.classList.toggle("is-on", Boolean(chip));
  if (!chip) return;
  // Screen % → % of the whole device (15 px titanium and bezel around a 390 × 898 screen).
  line.style.setProperty("--tx", `${((15 + (chip.x / 100) * 390) / 420) * 100}%`);
  line.style.setProperty("--ty", `${((15 + (chip.y / 100) * 898) / 928) * 100}%`);
  $("tour-chip-text").textContent = chip.text;
}

function fillStep(animate) {
  const step = STEPS[index];
  const text = CAPTIONS[lang][step];
  const labels = LABELS[lang];
  tour.lang = lang;
  $("tour-numeral").textContent = String(index + 1).padStart(2, "0");
  $("tour-count").textContent = labels.count(index + 1, STEPS.length);
  const words = setTitle(text.title);
  $("tour-what-label").textContent = labels.what;
  $("tour-what").textContent = text.what;
  $("tour-why-label").textContent = labels.why;
  $("tour-why").textContent = text.why;
  setFigure(step, animate);
  setChip(step);
  setVoice(step);
  $("tour-back").disabled = index === 0;
  chapters.forEach((button, i) => {
    button.setAttribute("aria-current", i === index ? "step" : "false");
    button.style.setProperty("--p", i < index ? 1 : 0);
  });
  if (!animate || !motion()) return;
  for (const el of [scene, $("tour-body")]) el.getAnimations().forEach((a) => a.cancel());
  const rise = [
    { opacity: 0, filter: "blur(8px)", transform: "translateY(12px)" },
    { opacity: 1, filter: "blur(0)", transform: "none" },
  ];
  const ease = "cubic-bezier(0.2, 0.7, 0.2, 1)";
  scene.animate(rise, { duration: 600, easing: ease });
  $("tour-body").animate(rise, {
    duration: 600,
    delay: 200 + words * 40,
    easing: ease,
    fill: "backwards",
  });
}

// Crossfade: the old step blurs out, then the new one rises in.
let swap = 0;
function showStep(crossfade) {
  const token = ++swap;
  if (!crossfade || !motion()) return fillStep(true);
  const out = scene.animate([{ opacity: 0, filter: "blur(8px)" }], {
    duration: 180,
    fill: "forwards",
  });
  out.finished.then(() => token === swap && index >= 0 && fillStep(true)).catch(() => {});
}

// ---- Quick step: a simulated notification drops out of the Dynamic Island, then returns ----

const notice = $("notice");
let noticeTimer = 0;

function closeNotice() {
  clearTimeout(noticeTimer);
  notice.classList.remove("is-open");
}

function openNotice() {
  const text = NOTICE[lang];
  $("notice-time").textContent = text.time;
  $("notice-title").textContent = text.title;
  $("notice-body").textContent = text.body;
  notice.classList.add("is-open");
  // About 0.6 s to unfold, 2.5 s to read, then it shrinks back into the island.
  noticeTimer = setTimeout(closeNotice, 3100);
}

// ---- Settings step: what a blind user hears, typed line by line and optionally spoken ----

const SPEECH_LANGS = { en: "en-GB", fi: "fi-FI", sv: "sv-SE" };
const canSpeak = "speechSynthesis" in window;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let soundOn = false;
let voiceRun = 0;

function speak(text) {
  if (!soundOn || !canSpeak) return Promise.resolve();
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = SPEECH_LANGS[lang];
    utterance.onend = resolve;
    utterance.onerror = resolve;
    speechSynthesis.speak(utterance);
  });
}

function voiceLine(text) {
  const line = document.createElement("li");
  const words = document.createElement("span");
  words.textContent = text;
  line.append(words);
  return line;
}

// Stops typing and speech; with `complete`, every line is shown in full (used when pausing).
function stopVoice(complete = false) {
  voiceRun++;
  if (canSpeak) speechSynthesis.cancel();
  if (complete && STEPS[index] === "settings") {
    $("voice-lines").replaceChildren(...VOICE[lang].map(voiceLine));
  }
}

async function playVoice() {
  const run = ++voiceRun;
  const list = $("voice-lines");
  list.replaceChildren();
  await pause(500);
  for (const text of VOICE[lang]) {
    if (run !== voiceRun) return;
    const line = voiceLine("");
    const words = line.firstChild;
    const wave = document.createElement("span");
    wave.className = "wave";
    wave.setAttribute("aria-hidden", "true");
    wave.append(...[0, 1, 2].map(() => document.createElement("i")));
    line.className = "is-speaking";
    line.append(wave);
    list.append(line);
    const spoken = speak(text);
    for (let n = 1; motion() && n < text.length && run === voiceRun; n++) {
      words.textContent = text.slice(0, n);
      await pause(22);
    }
    words.textContent = text;
    await Promise.all([spoken, pause(450)]);
    line.classList.remove("is-speaking");
    wave.remove();
  }
}

function setVoice(step) {
  const on = step === "settings";
  $("voice").hidden = !on;
  if (!on) return;
  $("voice-head").textContent = VOICE_CARD[lang].head;
  $("voice-note").textContent = VOICE_CARD[lang].note;
  playVoice();
}

// ---- Clock, steps, pause ----

function readTime(step) {
  const { what, why } = CAPTIONS[lang][step];
  return Math.min(11000, Math.max(7000, 4000 + (what.length + why.length) * 22));
}

function stepTime() {
  const step = STEPS[index];
  // The voice transcript needs longer, and longer still when it is spoken aloud.
  if (step === "settings") return Math.max(readTime(step), soundOn ? 15000 : 11000);
  if (!WAIT_FOR_APP.has(step)) return readTime(step);
  return waiting ? DONE_FALLBACK : READ_AFTER_DONE;
}

function runClock() {
  cancelAnimationFrame(clockId);
  let last = performance.now();
  const tick = (now) => {
    if (index < 0 || paused) return;
    // Capped so a hidden tab (no frames) never skips steps when it comes back.
    elapsed += Math.min(100, now - last);
    last = now;
    const current = chapters[index];
    current.classList.toggle("is-waiting", waiting);
    current.style.setProperty("--p", waiting ? 0 : Math.min(1, elapsed / stepTime()));
    if (elapsed >= stepTime()) go(index + 1);
    if (index >= 0) clockId = requestAnimationFrame(tick);
  };
  clockId = requestAnimationFrame(tick);
}

function go(i, crossfade = true) {
  if (index < 0 || i < 0) return;
  if (i >= STEPS.length) return stop();
  index = i;
  waiting = WAIT_FOR_APP.has(STEPS[i]);
  elapsed = 0;
  stopVoice();
  sendStep();
  showStep(crossfade);
  closeNotice();
  if (STEPS[i] === "quick") noticeTimer = setTimeout(openNotice, 400);
}

function setPaused(value, byJudge = false) {
  if (index < 0) return;
  paused = value;
  tour.classList.toggle("is-paused", paused);
  tour.classList.toggle("is-in-control", paused && byJudge);
  $("tour-pause-label").textContent = paused ? "Play" : "Pause";
  if (paused) stopVoice(true);
  else runClock();
}

function start() {
  if (index >= 0) return;
  root.classList.add("is-touring");
  document.dispatchEvent(new CustomEvent("prepared-home:tour-state", { detail: { active: true } }));
  index = 0;
  go(0, false);
  setPaused(false);
  $("tour-pause").focus({ preventScroll: true });
}

// Exit returns to free use and leaves the app where it is.
function stop() {
  if (index < 0) return;
  const hadFocus =
    tour.contains(document.activeElement) || timeline.contains(document.activeElement);
  index = -1;
  swap++;
  closeNotice();
  stopVoice();
  cancelAnimationFrame(clockId);
  cancelAnimationFrame(countId);
  if (appReady && lastSent !== "end") post("end");
  tour.classList.remove("is-paused", "is-in-control");
  root.classList.remove("is-touring");
  document.dispatchEvent(
    new CustomEvent("prepared-home:tour-state", { detail: { active: false } }),
  );
  if (hadFocus) $("tour-start").focus({ preventScroll: true });
}

// ---- Controls ----

$("tour-start").addEventListener("click", start);
$("tour-back").addEventListener("click", () => go(index - 1));
$("tour-next").addEventListener("click", () => go(index + 1));
$("tour-pause").addEventListener("click", () => setPaused(!paused));
$("tour-resume").addEventListener("click", () => setPaused(false));
$("tour-exit").addEventListener("click", stop);
$("tour-skip").addEventListener("click", stop);

// Sound is off by default; it only speaks the voice transcript on the settings step.
const soundButton = $("tour-sound");
soundButton.hidden = !canSpeak;
soundButton.addEventListener("click", () => {
  soundOn = !soundOn;
  soundButton.setAttribute("aria-pressed", String(soundOn));
  if (!soundOn && canSpeak) speechSynthesis.cancel();
});

document.addEventListener("keydown", (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.target.closest("input, textarea, select, [contenteditable]")) return;
  if (index < 0) {
    if (event.key.toLowerCase() === "t") start();
    return;
  }
  // Space is the tour's pause key, also on its own buttons; other buttons and links keep Space.
  const control = event.target.closest("button, a");
  if (event.key === " " && control && !control.closest("#tour, #timeline")) return;
  const keys = {
    ArrowLeft: () => go(index - 1),
    ArrowRight: () => go(index + 1),
    " ": () => setPaused(!paused),
    Escape: stop,
  };
  if (!keys[event.key]) return;
  event.preventDefault();
  keys[event.key]();
});

if (new URLSearchParams(location.search).get("tour") === "1") start();
