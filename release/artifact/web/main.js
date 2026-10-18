const APP_PATH = "/app/";

// Phones get the app itself, full screen; the framed preview only makes sense on larger screens.
// The path check avoids a reload loop if the server ever answers /app/ with this page.
if (matchMedia("(max-width: 500px)").matches && location.pathname !== APP_PATH) {
  location.replace(APP_PATH);
} else {
  document.addEventListener("DOMContentLoaded", setUp);
}

// Island copy follows the app language picked under the phone.
const COPY = {
  checking: { en: "Checking…", fi: "Tarkistetaan…", sv: "Kontrollerar…" },
  verified: { en: "Looks good", fi: "Näyttää hyvältä", sv: "Ser bra ut" },
  retake: { en: "Try again", fi: "Yritä uudelleen", sv: "Försök igen" },
  fix_first: { en: "Fix first", fi: "Korjaa ensin", sv: "Åtgärda först" },
  "second-angle": { en: "Move a step aside", fi: "Siirry sivuun", sv: "Ta ett steg åt sidan" },
};
// Milliseconds before the island rests again. Checking only times out; results stay this long
// even if the app sends idle/camera straight away, so the judge actually sees them.
const HOLD = { checking: 30000, verified: 2200 };
const RESULT_HOLD = 4000;
const RESTING = ["idle", "camera"];
// Island widths: resting, smallest open (so short results still visibly grow), and widest.
const ISLAND = { rest: 126, open: 190, max: 330 };

function setUp() {
  const $ = (id) => document.getElementById(id);
  const [frame, screen, island, device] = ["app", "screen", "island", "device"].map($);
  const stage = document.querySelector(".stage");
  const fit = document.querySelector(".device-fit");

  const url = new URL(APP_PATH, location.origin).href;
  $("app-url").href = url;
  $("app-url").textContent = url.replace(/^https?:\/\//, "");

  // Status bar clock, re-armed just after each minute boundary.
  (function tick() {
    const now = new Date();
    $("clock").textContent = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
    setTimeout(tick, 60050 - now.getSeconds() * 1000 - now.getMilliseconds());
  })();

  // ---- Live Dynamic Island, driven by status messages from the embedded app ----
  let lang = "en";
  let rest = "idle";
  // tour.js marks the page while the guided tour plays (it may start before this runs, via ?tour=1).
  const touring = () => document.documentElement.classList.contains("is-touring");
  let holdTimer = 0;

  function render(state, label = "") {
    island.dataset.state = state;
    $("island-text").textContent = COPY[state]?.[lang] ?? "";
    $("island-label").textContent = label;
    const open = !RESTING.includes(state);
    // Measured at natural width, so the island fits any language or label.
    const natural = island.firstElementChild.scrollWidth;
    const width = open ? Math.min(ISLAND.max, Math.max(ISLAND.open, natural)) : ISLAND.rest;
    island.style.setProperty("--island-w", `${width}px`);
    screen.classList.toggle("island-open", open);
  }

  function settle() {
    clearTimeout(holdTimer);
    holdTimer = 0;
    render(rest);
  }

  function onStatus(state, label) {
    if (RESTING.includes(state)) {
      rest = state;
      const showingResult = holdTimer && island.dataset.state !== "checking";
      if (!showingResult) settle();
      return;
    }
    render(state, label);
    clearTimeout(holdTimer);
    holdTimer = setTimeout(settle, HOLD[state] ?? RESULT_HOLD);
  }

  window.addEventListener("message", (event) => {
    const { data } = event;
    if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
    if (data?.type !== "prepared-home:status") return;
    if (!RESTING.includes(data.state) && !Object.hasOwn(COPY, data.state)) return;
    // The web tour has no second angle, so its prompt must never appear during it.
    if (touring() && data.state === "second-angle") return;
    onStatus(data.state, typeof data.label === "string" ? data.label.trim().slice(0, 80) : "");
  });

  // ---- Demo controls ----
  let example = "flat";
  let langParam = ""; // Sent only once a language is picked, so the app keeps its own default.
  function loadApp(next = example) {
    example = next;
    frame.src = `${APP_PATH}?example=${example}${langParam}`;
    rest = "idle";
    settle();
    // The guided tour (tour.js) re-sends its step once the reloaded app is ready.
    document.dispatchEvent(new CustomEvent("prepared-home:app-load", { detail: { lang } }));
  }

  for (const button of document.querySelectorAll("[data-example]")) {
    button.addEventListener("click", () => loadApp(button.dataset.example));
  }
  const langButtons = document.querySelectorAll("[data-lang]");
  for (const button of langButtons) {
    button.addEventListener("click", () => {
      lang = button.dataset.lang;
      langParam = `&lang=${lang}`;
      for (const b of langButtons) b.setAttribute("aria-pressed", String(b === button));
      loadApp();
    });
  }
  // Keys typed inside the app go to the iframe, so this only fires on the page around it.
  document.addEventListener("keydown", (event) => {
    if (event.key !== "r" || event.metaKey || event.ctrlKey || event.altKey) return;
    if (!event.target.closest("input, textarea, select, [contenteditable]")) loadApp("flat");
  });

  // ---- Subtle 3D tilt toward the pointer; flat while the pointer is on the screen ----
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  let target = { x: 0, y: 0 };
  let tilt = { x: 0, y: 0 };
  let onScreen = false;
  let frameId = 0;

  function step() {
    const ease = onScreen ? 0.22 : 0.07;
    tilt = { x: tilt.x + (target.x - tilt.x) * ease, y: tilt.y + (target.y - tilt.y) * ease };
    const settled = Math.hypot(target.x - tilt.x, target.y - tilt.y) < 0.01;
    if (settled) tilt = { ...target };
    // No transform at rest keeps the app crisp and every click pixel-exact.
    const flat = tilt.x === 0 && tilt.y === 0;
    device.style.transform = flat ? "" : `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`;
    stage.style.setProperty("--tilt-y", tilt.y.toFixed(3));
    frameId = settled ? 0 : requestAnimationFrame(step);
  }
  function aim(x, y) {
    target = { x, y };
    if (!frameId) frameId = requestAnimationFrame(step);
  }
  const clamp = (value, max) => Math.max(-max, Math.min(max, value));

  document.addEventListener("pointermove", (event) => {
    if (reduce.matches || onScreen || touring() || event.pointerType === "touch") return;
    const r = fit.getBoundingClientRect();
    const dx = (event.clientX - (r.left + r.width / 2)) / innerWidth;
    const dy = (event.clientY - (r.top + r.height / 2)) / innerHeight;
    aim(clamp(-dy * 10, 5), clamp(dx * 14, 7));
  });
  // The pointer inside the iframe sends no moves here, so entering the screen means "hold still".
  screen.addEventListener("pointerenter", () => {
    onScreen = true;
    aim(0, 0);
  });
  screen.addEventListener("pointerleave", () => (onScreen = false));
  document.documentElement.addEventListener("pointerleave", () => aim(0, 0));
  reduce.addEventListener("change", () => aim(0, 0));
  // The phone settles flat when the tour starts and stays flat while it plays.
  document.addEventListener("prepared-home:tour-state", () => aim(0, 0));
}
