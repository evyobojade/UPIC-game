/* U-pic — Campus Wallet, grey-to-colour map reveal, and win celebrations.
   Builds on script.js through window.UPic and the upic:* events it fires. */
(() => {
  "use strict";
  const api = window.UPic;
  if (!api) { console.warn("U-pic wallet: script.js API not found."); return; }

  const MAP_ASPECT = 1094 / 768;          // displayed map proportions (matches style.css)
  const CARD_ASPECT = 4 / 3;              // wallet card picture proportions
  const walletKey = "u-pic-wallet-v1";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const total = api.buildings.length;

  let collected = {};                      // building id -> ISO date collected
  try { collected = JSON.parse(localStorage.getItem(walletKey) || "{}") || {}; } catch (e) { collected = {}; }
  const saveWallet = () => { try { localStorage.setItem(walletKey, JSON.stringify(collected)); } catch (e) { /* session only */ } };

  let pendingReveal = null;                // building waiting for its colour bloom
  let revealProgress = {};                 // id -> 0..1 while blooming

  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  };

  /* ---------- Map geometry ---------- */
  const centre = b => ({ x: b.left + b.width / 2, y: b.top + b.height / 2 });

  function pieceStyle(b) {
    // A crop of the campus art around the building, at the card's aspect ratio.
    const c = centre(b);
    let cw = Math.max(b.width * 1.55, b.height * 1.55 * CARD_ASPECT / MAP_ASPECT);
    let ch = cw * MAP_ASPECT / CARD_ASPECT;
    cw = Math.min(cw, 100); ch = Math.min(ch, 100);
    const x0 = Math.min(Math.max(c.x - cw / 2, 0), 100 - cw);
    const y0 = Math.min(Math.max(c.y - ch / 2, 0), 100 - ch);
    const px = cw >= 100 ? 0 : (x0 / (100 - cw)) * 100;
    const py = ch >= 100 ? 0 : (y0 / (100 - ch)) * 100;
    return `background-size:${(10000 / cw).toFixed(2)}% ${(10000 / ch).toFixed(2)}%;background-position:${px.toFixed(2)}% ${py.toFixed(2)}%`;
  }

  function colourMask(scaleFor = () => 1) {
    const unlocked = api.buildings.filter(b => api.isUnlocked(b.level));
    if (unlocked.length === total && !Object.keys(revealProgress).length) return "none";
    if (!unlocked.length) return "linear-gradient(transparent, transparent)";
    return unlocked.map(b => {
      const s = scaleFor(b);
      if (s <= 0) return null;
      const c = centre(b);
      const rx = (b.width * 0.95 * s).toFixed(2), ry = (b.height * 1.05 * s).toFixed(2);
      return `radial-gradient(${rx}% ${ry}% at ${c.x}% ${c.y}%, #000 0 58%, rgb(0 0 0 / 55%) 78%, transparent 100%)`;
    }).filter(Boolean).join(",") || "linear-gradient(transparent, transparent)";
  }

  function applyMask(layer, mask) {
    if (!layer) return;
    layer.style.webkitMaskImage = mask;
    layer.style.maskImage = mask;
  }

  /* ---------- Grey map with colour layer ---------- */
  const campusMap = document.getElementById("campus-map");
  const baseArt = campusMap && campusMap.querySelector(".campus-map-art");
  let colourArt = null;
  if (baseArt) {
    campusMap.classList.add("is-grey");
    colourArt = baseArt.cloneNode();
    colourArt.classList.add("campus-map-colour");
    colourArt.alt = "";
    colourArt.setAttribute("aria-hidden", "true");
    baseArt.after(colourArt);
  }

  function renderMapColour() {
    const scale = b => (b.id in revealProgress ? revealProgress[b.id] : 1);
    applyMask(colourArt, colourMask(scale));
    applyMask(miniColour, colourMask());
    campusMap && campusMap.classList.toggle("is-complete", api.unlockedCount() === total && !Object.keys(revealProgress).length);
  }

  function mapIsVisible() {
    const game = document.getElementById("game-page");
    const map = document.getElementById("map-page");
    const anyModal = document.querySelector(".win-modal.open, .building-modal.open, .wallet-modal.open");
    return map && map.classList.contains("active") && !(game && game.classList.contains("active")) && !anyModal;
  }

  function runPendingReveal() {
    if (!pendingReveal || !mapIsVisible()) return;
    const b = pendingReveal;
    pendingReveal = null;
    flyCardToWallet(b, () => bloom(b));
  }

  function bloom(b) {
    const finish = () => {
      delete revealProgress[b.id];
      renderMapColour();
      if (api.unlockedCount() === total) campusComplete();
    };
    if (reduceMotion) { finish(); return; }
    playSparkle();
    const hotspot = [...document.querySelectorAll(".map-hotspot")][api.buildings.indexOf(b)];
    if (hotspot) {
      hotspot.classList.remove("just-unlocked");
      void hotspot.offsetWidth;
      hotspot.classList.add("just-unlocked");
    }
    const start = performance.now(), duration = 1300;
    const step = now => {
      const t = Math.min(1, (now - start) / duration);
      revealProgress[b.id] = 1 - Math.pow(1 - t, 3);  // ease-out
      renderMapColour();
      if (t < 1) requestAnimationFrame(step); else finish();
    };
    revealProgress[b.id] = 0;
    requestAnimationFrame(step);
  }

  /* ---------- Sound ---------- */
  function tone(ctx, freq, at, dur, type = "triangle", vol = 0.13) {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(vol, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(at); osc.stop(at + dur + 0.05);
  }
  function withAudio(fn) {
    if (!api.effectsOn()) return;
    const ctx = api.audio();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    fn(ctx, ctx.currentTime + 0.03);
  }
  const playFanfare = (big = false) => withAudio((ctx, t) => {
    const notes = big ? [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5] : [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => tone(ctx, f, t + i * 0.11, i === notes.length - 1 ? 0.7 : 0.18));
    tone(ctx, 261.63, t, 0.5 + notes.length * 0.11, "sine", 0.07);           // warm bass under the run
    [1568, 2093, 2637].forEach((f, i) => tone(ctx, f, t + notes.length * 0.11 + i * 0.07, 0.25, "sine", 0.05));
  });
  const playSparkle = () => withAudio((ctx, t) => {
    [1318.5, 1567.98, 2093, 2637].forEach((f, i) => tone(ctx, f, t + i * 0.06, 0.35, "sine", 0.05));
  });
  const playCardIn = () => withAudio((ctx, t) => {
    tone(ctx, 988, t, 0.09, "square", 0.04);
    tone(ctx, 1318.5, t + 0.08, 0.22, "triangle", 0.1);
  });
  const playFlip = () => withAudio((ctx, t) => tone(ctx, 740, t, 0.08, "triangle", 0.06));

  /* ---------- Confetti ---------- */
  function confetti(amount = 140) {
    if (reduceMotion) return;
    const canvas = el("canvas", "upic-confetti");
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth, H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    const colours = ["#ffc629", "#123d70", "#2584df", "#2a9464", "#ff7a59", "#ffffff"];
    const parts = Array.from({ length: amount }, (_, i) => {
      const fromLeft = i % 2 === 0;
      return {
        x: fromLeft ? -10 : W + 10, y: H * (0.55 + Math.random() * 0.25),
        vx: (fromLeft ? 1 : -1) * (5 + Math.random() * 9), vy: -(10 + Math.random() * 11),
        w: 6 + Math.random() * 7, h: 9 + Math.random() * 9,
        rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.35,
        c: colours[i % colours.length], round: Math.random() < 0.25
      };
    });
    const start = performance.now();
    const frame = now => {
      const age = now - start;
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, age - 2200) / 800);
      parts.forEach(p => {
        p.vy += 0.32; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c;
        if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2); ctx.fill(); }
        else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.rot * 2)) + 2);
        ctx.restore();
      });
      if (age < 3000) requestAnimationFrame(frame); else canvas.remove();
    };
    requestAnimationFrame(frame);
  }

  /* ---------- Wallet card ---------- */
  function formatDate(iso) {
    if (!iso) return "Collected";
    try { return "Collected " + new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
    catch (e) { return "Collected"; }
  }

  function makeCard(b, { big = false } = {}) {
    const owned = api.isUnlocked(b.level);
    const card = el(owned ? "button" : "div", `wallet-card${owned ? " owned" : " missing"}${big ? " big" : ""}`);
    if (owned) {
      card.type = "button";
      card.setAttribute("aria-label", `${b.name}, map piece ${b.level} of ${total}. Open building information.`);
    } else {
      card.setAttribute("aria-label", `Map piece ${b.level} of ${total}, not collected yet.`);
    }
    const art = el("div", "wallet-card-art");
    art.setAttribute("style", pieceStyle(b));
    if (!owned) art.appendChild(el("span", "wallet-card-question", "?"));
    const badge = el("span", "wallet-card-badge", owned ? b.icon : "🔒");
    badge.setAttribute("aria-hidden", "true");
    const body = el("div", "wallet-card-body");
    body.appendChild(el("span", "wallet-card-level", `Piece ${b.level} / ${total}`));
    body.appendChild(el("strong", "wallet-card-name", owned ? b.name : "Not found yet"));
    body.appendChild(el("span", "wallet-card-date", owned ? formatDate(collected[b.id]) : `Solve Level ${b.level} to collect`));
    card.append(art, badge, body);
    if (owned) {
      card.appendChild(el("span", "wallet-card-stamp", "UVic ✓"));
      card.addEventListener("click", () => {
        playFlip();
        closeWallet();
        api.openBuilding(b);
      });
    }
    return card;
  }

  /* ---------- Wallet launcher + modal ---------- */
  const dock = document.querySelector(".exploration-dock");
  const launcher = el("button", "wallet-launcher");
  launcher.type = "button";
  launcher.id = "wallet-open";
  launcher.innerHTML = `👛<span class="wallet-label"> Campus Wallet</span> <span id="wallet-count">0/${total}</span>`;
  launcher.setAttribute("aria-label", "Open Campus Wallet");
  // The wallet button sits on the map itself (the activity strip above the map is hidden in v14.2+).
  if (campusMap) campusMap.appendChild(launcher);
  else if (dock) dock.prepend(launcher);

  const menuPanel = document.getElementById("menu-panel");
  if (menuPanel) {
    const item = el("button", null, "Campus Wallet");
    item.type = "button";
    item.setAttribute("role", "menuitem");
    item.addEventListener("click", () => { api.closeMenu(); openWallet(); });
    menuPanel.insertBefore(item, menuPanel.children[1] || null);
  }

  const modal = el("div", "wallet-modal");
  modal.id = "wallet-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "wallet-title");
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div class="wallet-sheet">
      <button class="modal-close wallet-close" type="button" aria-label="Close Campus Wallet">×</button>
      <header class="wallet-head">
        <div>
          <p class="eyebrow">Your collection</p>
          <h2 id="wallet-title">Campus Wallet</h2>
          <p class="wallet-sub" id="wallet-sub"></p>
        </div>
        <div class="wallet-mini" aria-hidden="true">
          <img class="wallet-mini-grey" alt="" src="${baseArt ? baseArt.getAttribute("src") : ""}">
          <img class="wallet-mini-colour" alt="" src="${baseArt ? baseArt.getAttribute("src") : ""}">
        </div>
      </header>
      <div class="wallet-meter" role="progressbar" aria-label="Map pieces collected" aria-valuemin="0" aria-valuemax="${total}">
        <span class="wallet-meter-fill"></span>
      </div>
      <div class="wallet-grid" id="wallet-grid"></div>
    </div>`;
  document.body.appendChild(modal);
  const miniColour = modal.querySelector(".wallet-mini-colour");

  function renderWallet() {
    const count = api.unlockedCount();
    const countEl = document.getElementById("wallet-count");
    if (countEl) countEl.textContent = `${count}/${total}`;
    const grid = document.getElementById("wallet-grid");
    grid.replaceChildren(...api.buildings.map(b => makeCard(b)));
    document.getElementById("wallet-sub").textContent = count === total
      ? "Every piece collected. Your whole campus is in colour!"
      : `${count} of ${total} map pieces collected. Each piece you collect brings that part of campus back into colour.`;
    const meter = modal.querySelector(".wallet-meter");
    meter.setAttribute("aria-valuenow", String(count));
    modal.querySelector(".wallet-meter-fill").style.width = `${(count / total) * 100}%`;
    renderMapColour();
  }

  function openWallet() {
    renderWallet();
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    playFlip();
    modal.querySelector(".wallet-close").focus();
  }
  function closeWallet() {
    if (!modal.classList.contains("open")) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    setTimeout(runPendingReveal, 50);
  }
  launcher.addEventListener("click", openWallet);
  modal.querySelector(".wallet-close").addEventListener("click", closeWallet);
  modal.addEventListener("click", e => { if (e.target === modal) closeWallet(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeWallet(); });

  /* ---------- Win modal: show the new card ---------- */
  const winModal = document.getElementById("win-modal");
  const winCard = winModal && winModal.querySelector(".modal-card");
  let rewardSlot = null, openWalletBtn = null;
  if (winCard) {
    winCard.classList.add("has-reward");
    const icon = winCard.querySelector(".modal-icon");
    if (icon) icon.hidden = true;
    rewardSlot = el("div", "wallet-reward");
    const title = winCard.querySelector("#win-title");
    winCard.insertBefore(rewardSlot, title);
    const note = el("p", "wallet-reward-note", "");
    note.id = "wallet-reward-note";
    title.after(note);
    openWalletBtn = el("button", "button secondary wallet-win-open", "👛 Open Campus Wallet");
    openWalletBtn.type = "button";
    winCard.querySelector(".win-actions").appendChild(openWalletBtn);
    openWalletBtn.addEventListener("click", () => {
      api.closeModal(winModal);
      api.showPage("map");
      openWallet();
    });
    // When the win popup closes, play the map reveal as soon as the map is in view.
    new MutationObserver(() => {
      if (!winModal.classList.contains("open")) setTimeout(runPendingReveal, 80);
    }).observe(winModal, { attributes: true, attributeFilter: ["class"] });
  }

  function flyCardToWallet(b, done) {
    const target = launcher.getBoundingClientRect();
    if (reduceMotion || !target.width) { bumpLauncher(); done(); return; }
    const flyer = makeCard(b);
    flyer.classList.add("wallet-flyer");
    flyer.removeAttribute("aria-label");
    flyer.setAttribute("aria-hidden", "true");
    document.body.appendChild(flyer);
    const fr = flyer.getBoundingClientRect();
    const sx = window.innerWidth / 2 - fr.width / 2, sy = window.innerHeight / 2 - fr.height / 2;
    const tx = target.left + target.width / 2 - fr.width / 2, ty = target.top + target.height / 2 - fr.height / 2;
    const anim = flyer.animate([
      { transform: `translate(${sx}px, ${sy}px) scale(1) rotate(0deg)`, opacity: 1 },
      { transform: `translate(${(sx + tx) / 2}px, ${Math.min(sy, ty) - 60}px) scale(.7) rotate(-8deg)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${tx}px, ${ty}px) scale(.12) rotate(4deg)`, opacity: 0.3 }
    ], { duration: 850, easing: "cubic-bezier(.45,.05,.3,1)", fill: "forwards" });
    anim.onfinish = () => { flyer.remove(); bumpLauncher(); playCardIn(); done(); };
  }

  function bumpLauncher() {
    launcher.classList.remove("bump");
    void launcher.offsetWidth;
    launcher.classList.add("bump");
    const countEl = document.getElementById("wallet-count");
    if (countEl) countEl.textContent = `${api.unlockedCount()}/${total}`;
  }

  function campusComplete() {
    confetti(220);
    playFanfare(true);
    if (campusMap) {
      campusMap.classList.add("is-complete");
      const banner = el("div", "campus-complete-banner", "🎓 Campus complete! Every building is back in colour.");
      campusMap.appendChild(banner);
      setTimeout(() => banner.remove(), 4200);
    }
  }

  /* ---------- Events from script.js ---------- */
  document.addEventListener("upic:unlock", e => {
    const b = e.detail.building;
    if (!collected[b.id]) { collected[b.id] = new Date().toISOString(); saveWallet(); }
    revealProgress[b.id] = 0;                          // keep it grey until the bloom plays
    pendingReveal = b;
    renderMapColour();
    if (rewardSlot) {
      const card = makeCard(b, { big: true });
      card.classList.add("dealing");
      card.disabled = true;
      rewardSlot.replaceChildren(card);
      const remaining = total - api.unlockedCount();
      document.getElementById("wallet-reward-note").textContent = remaining
        ? `Map piece ${b.level} added to your Campus Wallet. ${remaining} to go!`
        : "The final map piece! Your Campus Wallet is complete.";
    }
    confetti();
    playFanfare(api.unlockedCount() === total);
    renderWalletCount();
  });
  document.addEventListener("upic:maprender", () => {
    renderMapColour();
    renderWalletCount();
    setTimeout(runPendingReveal, 120);
  });
  document.addEventListener("upic:reset", () => {
    collected = {};
    saveWallet();
    revealProgress = {};
    pendingReveal = null;
    setTimeout(() => { renderMapColour(); renderWalletCount(); }, 0);
  });

  function renderWalletCount() {
    const countEl = document.getElementById("wallet-count");
    // While a new piece is still "flying", show the previous count so the bump lands with the card.
    const shown = api.unlockedCount() - (pendingReveal ? 1 : 0);
    if (countEl) countEl.textContent = `${Math.max(0, shown)}/${total}`;
  }

  // Pieces unlocked before the wallet existed still count as collected.
  api.buildings.forEach(b => { if (api.isUnlocked(b.level) && !collected[b.id]) collected[b.id] = null; });
  renderMapColour();
  renderWalletCount();
})();
