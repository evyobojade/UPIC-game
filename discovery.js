/* U-pic — Campus discovery challenges + navigation missions.
   After each building is unlocked, the map asks a short question about where things are on campus:
   - purpose challenge: "Which building would you visit to borrow a book?" (3 buildings highlighted)
   - navigation mission: "You're leaving X and need to reach Y. Tap it on the map." (compass hint after a miss)
   Builds on script.js (window.UPic) and wallet.js. */
(() => {
  "use strict";
  const api = window.UPic;
  if (!api) return;

  const discoveredKey = "u-pic-discovered-v1";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const byId = Object.fromEntries(api.buildings.map(b => [b.id, b]));

  // Questions use the same facts as each building's description in script.js.
  const purposeQuestions = {
    mcpherson: "You need to borrow a book and get research help. Which building do you head to?",
    cornett: "Your class is about people, behaviour and communication (humanities and social sciences). Which building is it likely in?",
    maclaurin: "You're studying to become a teacher. Which building is closely tied to education?",
    ecss: "You've got a programming lab this afternoon. Which building do you go to?",
    bob: "Your physics and astronomy lecture is about to start. Where are you going?",
    jcc: "There's a big campus event today. Which venue are you heading to?",
    cle: "You have a language class. Which building is associated with language learning?"
  };

  let discovered = [];
  try { discovered = JSON.parse(localStorage.getItem(discoveredKey) || "[]"); } catch (e) { discovered = []; }
  const saveDiscovered = () => { try { localStorage.setItem(discoveredKey, JSON.stringify(discovered)); } catch (e) { /* session only */ } };

  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const centre = b => ({ x: b.left + b.width / 2, y: b.top + b.height / 2 });
  const shuffle = list => { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  function chime(good) {
    if (!api.effectsOn()) return;
    const ctx = api.audio(); if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const t = ctx.currentTime + 0.02;
    (good ? [659.25, 987.77, 1318.5] : [311.13, 261.63]).forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = good ? "triangle" : "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + i * 0.09);
      g.gain.exponentialRampToValueAtTime(good ? 0.1 : 0.06, t + i * 0.09 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + 0.25);
      o.connect(g); g.connect(ctx.destination); o.start(t + i * 0.09); o.stop(t + i * 0.09 + 0.3);
    });
  }

  function direction(from, to) {
    const a = centre(from), b = centre(to);
    const dx = b.x - a.x, dy = b.y - a.y;
    const ns = Math.abs(dy) > 8 ? (dy < 0 ? "north" : "south") : "";
    const ew = Math.abs(dx) > 8 ? (dx < 0 ? "west" : "east") : "";
    return (ns + (ns && ew ? "-" : "") + ew) || "very close by";
  }

  /* ---------- Panel on the map ---------- */
  const campusMap = document.getElementById("campus-map");
  const mapNodes = document.getElementById("map-nodes");
  const arrival = document.getElementById("map-arrival");
  if (!campusMap || !mapNodes) return;
  const panel = el("section", "discovery-panel");
  panel.setAttribute("aria-live", "polite");
  panel.hidden = true;
  panel.innerHTML = `
    <div class="discovery-text">
      <p class="discovery-eyebrow" id="discovery-eyebrow"></p>
      <h3 id="discovery-question"></h3>
      <p class="discovery-feedback" id="discovery-feedback"></p>
    </div>
    <div class="discovery-actions">
      <button type="button" class="discovery-show" id="discovery-show" hidden>Show me</button>
      <button type="button" class="discovery-skip" id="discovery-skip">Skip</button>
    </div>`;
  campusMap.appendChild(panel);
  const $ = id => panel.querySelector("#" + id);

  let challenge = null;   // { type, answer, origin, options, misses, done }
  let queued = null;      // building just unlocked, waiting for the map to be visible
  let challengeCount = 0;
  try { challengeCount = Number(localStorage.getItem("u-pic-challenge-count-v1") || 0) || 0; } catch (e) { challengeCount = 0; }

  function mapIsFree() {
    const map = document.getElementById("map-page"), game = document.getElementById("game-page");
    const modal = document.querySelector(".win-modal.open, .building-modal.open, .wallet-modal.open, .activity-modal.open, #activity-modal.open, #tour-backdrop.open");
    return map && map.classList.contains("active") && !(game && game.classList.contains("active")) && !modal;
  }

  function decorateHotspots() {
    const spots = [...mapNodes.querySelectorAll(".map-hotspot")];
    spots.forEach(s => { s.classList.remove("challenge-option", "challenge-answer", "challenge-wrong"); s.querySelectorAll(".challenge-tag").forEach(t => t.remove()); });
    if (!challenge || challenge.done) return;
    if (challenge.type === "purpose") {
      challenge.options.forEach((b, i) => {
        const s = spots[api.buildings.indexOf(b)];
        if (!s) return;
        s.classList.add("challenge-option");
        const tag = el("span", "challenge-tag", "ABC"[i]);
        tag.setAttribute("aria-hidden", "true");
        s.appendChild(tag);
      });
    }
    if (challenge.showAnswer) {
      const s = spots[api.buildings.indexOf(challenge.answer)];
      if (s) s.classList.add("challenge-answer");
    }
  }

  function start(origin) {
    const others = api.buildings.filter(b => b !== origin);
    const usePurpose = challengeCount % 2 === 0 && purposeQuestions[origin.id];
    challengeCount += 1;
    try { localStorage.setItem("u-pic-challenge-count-v1", String(challengeCount)); } catch (e) { /* ignore */ }
    if (usePurpose) {
      const options = shuffle([origin, ...shuffle(others).slice(0, 2)]);
      challenge = { type: "purpose", answer: origin, origin, options, misses: 0 };
      $("discovery-eyebrow").textContent = "📍 Campus discovery";
      $("discovery-question").textContent = purposeQuestions[origin.id];
      $("discovery-feedback").textContent = "Tap A, B or C on the map.";
    } else {
      const dest = shuffle(others)[0];
      challenge = { type: "nav", answer: dest, origin, options: [], misses: 0 };
      $("discovery-eyebrow").textContent = "🧭 Campus mission: find your next class!";
      $("discovery-question").textContent = `You're leaving ${origin.name} and need to reach ${dest.name}.`;
      $("discovery-feedback").textContent = "Tap your destination on the map.";
    }
    $("discovery-feedback").className = "discovery-feedback";
    $("discovery-show").hidden = true;
    $("discovery-skip").textContent = "Skip";
    panel.hidden = false;
    panel.classList.remove("solved");
    if (arrival) arrival.classList.add("discovery-hidden");
    decorateHotspots();
  }

  function finish() {
    challenge = null;
    panel.hidden = true;
    if (arrival) arrival.classList.remove("discovery-hidden");
    decorateHotspots();
  }

  function moveCharacterTo(b) {
    const c = document.getElementById("map-character");
    if (!c) return;
    const p = centre(b);
    c.classList.add("walking");
    c.style.left = `${p.x}%`;
    c.style.top = `${p.y}%`;
    setTimeout(() => c.classList.remove("walking"), reduceMotion ? 0 : 800);
  }

  function answer(tapped) {
    const ch = challenge;
    if (!ch || ch.done) return;
    if (ch.type === "purpose" && !ch.options.includes(tapped)) {
      $("discovery-feedback").textContent = "Pick one of the highlighted buildings: A, B or C.";
      return;
    }
    const fb = $("discovery-feedback");
    if (tapped !== ch.answer) {
      ch.misses += 1;
      chime(false);
      const spot = mapNodes.querySelectorAll(".map-hotspot")[api.buildings.indexOf(tapped)];
      if (spot) { spot.classList.remove("challenge-wrong"); void spot.offsetWidth; spot.classList.add("challenge-wrong"); }
      fb.className = "discovery-feedback wrong";
      if (ch.type === "nav") {
        fb.textContent = ch.misses === 1
          ? `That's ${tapped.name}. Not quite. Even fourth-years get lost sometimes! Hint: head ${direction(ch.origin, ch.answer)} from ${ch.origin.name}.`
          : `That's ${tapped.name}. Still lost? Tap "Show me" and we'll point the way.`;
        if (ch.misses >= 2) $("discovery-show").hidden = false;
      } else {
        fb.textContent = `That's ${tapped.name}. Not quite. Even fourth-years mix these up! Try another one.`;
        if (ch.misses >= 2) $("discovery-show").hidden = false;
      }
      return;
    }
    ch.done = true;
    chime(true);
    const b = ch.answer;
    if (!discovered.includes(b.id)) { discovered.push(b.id); saveDiscovered(); }
    const gotHint = ch.misses === 0 && api.addHint();
    fb.className = "discovery-feedback right";
    const bonus = gotHint ? ` Found it first try: +1 hint! (${api.hintCount()}/3)` : "";
    fb.textContent = ch.type === "nav"
      ? `You made it to ${b.name}. Your campus confidence is growing!${bonus}`
      : `Yes! You'd find that at ${b.name}. One less building to get lost in.${bonus}`;
    $("discovery-question").textContent = ch.type === "nav" ? "📍 Destination reached" : "📍 Building found";
    $("discovery-show").hidden = true;
    $("discovery-skip").textContent = "Continue";
    panel.classList.add("solved");
    moveCharacterTo(b);
    decorateHotspots();
    document.dispatchEvent(new CustomEvent("upic:discovered", { detail: { building: b } }));
  }

  // Intercept building taps while a challenge is running (capture phase, before the map's own travel handler).
  mapNodes.addEventListener("click", e => {
    if (!challenge || challenge.done) return;
    const spot = e.target.closest(".map-hotspot");
    if (!spot) return;
    e.stopPropagation();
    e.preventDefault();
    const idx = [...mapNodes.querySelectorAll(".map-hotspot")].indexOf(spot);
    if (idx >= 0) answer(api.buildings[idx]);
  }, true);

  $("discovery-skip").addEventListener("click", finish);
  $("discovery-show").addEventListener("click", () => {
    if (!challenge) return;
    challenge.showAnswer = true;
    $("discovery-feedback").textContent = challenge.type === "nav"
      ? `${challenge.answer.name} is glowing on the map. Tap it to get there.`
      : `The answer is glowing on the map. Tap it to continue.`;
    $("discovery-feedback").className = "discovery-feedback";
    decorateHotspots();
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && challenge && !document.querySelector(".open")) finish(); });

  /* ---------- Queue a challenge after each unlock, once the map is in view ---------- */
  document.addEventListener("upic:unlock", e => { queued = e.detail.building; });
  document.addEventListener("upic:maprender", () => setTimeout(decorateHotspots, 0));
  document.addEventListener("upic:reset", () => {
    discovered = []; saveDiscovered(); queued = null; challengeCount = 0;
    try { localStorage.removeItem("u-pic-challenge-count-v1"); } catch (err) { /* ignore */ }
    finish();
  });
  let freeSince = 0;
  setInterval(() => {
    if (!queued) { freeSince = 0; return; }
    if (!mapIsFree()) { freeSince = 0; return; }
    if (!freeSince) { freeSince = Date.now(); return; }
    if (Date.now() - freeSince >= 1700) {     // let the colour bloom finish first
      const b = queued; queued = null; freeSince = 0;
      start(b);
    }
  }, 250);

  /* ---------- Letters-placed counter in the puzzle ---------- */
  const slots = document.getElementById("letter-slots");
  if (slots) {
    const counter = el("p", "slot-progress");
    counter.setAttribute("aria-live", "polite");
    slots.after(counter);
    const update = () => {
      const all = [...slots.querySelectorAll(".letter-slot")];
      const filled = all.filter(s => s.textContent.trim()).length;
      counter.textContent = all.length ? `${filled} of ${all.length} letters placed` : "";
    };
    new MutationObserver(update).observe(slots, { childList: true, subtree: true, characterData: true });
    update();
  }

  window.UPicDiscovery = { isDiscovered: id => discovered.includes(id), startFor: id => byId[id] && start(byId[id]) };
})();
