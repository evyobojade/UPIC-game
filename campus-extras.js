(() => {
  "use strict";
  const api = window.UPic;
  if (!api) return;
  // Verified Wikimedia Commons campus photographs. Use illustrated map if unavailable.
  const photos = {
    mcpherson: "UVic McPherson Library.jpg",
    cle: "UVic Clearihue Building.jpg",
    ecss: "UVic ECS Building.png",
    maclaurin: "MacLaurin building. READ MORE IN PANORAMIO-COMMENT - panoramio.jpg"
  };
  document.addEventListener("upic:puzzlestart", ({detail}) => {
    const building = detail.building;
    const spot = document.getElementById("campus-photo-spot");
    if (!spot || !building) return;
    spot.replaceChildren();
    const img = document.createElement("img");
    img.alt = photos[building.id] ? "Photo of " + building.name : "Illustrated UVic campus";
    img.loading = "lazy";
    img.src = photos[building.id]
      ? "https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(photos[building.id]) + "?width=640"
      : "assets/campus-map-hd.png";
    img.onerror = () => { img.onerror = null; img.src = "assets/campus-map-hd.png"; img.alt = "Illustrated UVic map"; };
    const desc = document.createElement("div");
    desc.className = "campus-photo-text";
    const heading = document.createElement("strong");
    heading.textContent = photos[building.id] ? "Recognize this UVic building?" : "Locate this building on campus";
    const caption = document.createElement("span");
    caption.textContent = photos[building.id] ? "Campus building photo · Wikimedia Commons" : "Campus map preview";
    desc.append(heading, caption);
    spot.append(img, desc);
    spot.hidden = false;
  });

  const prompts = {
    mcpherson: "Find the university's main library for books, study and research.",
    cornett: "Find Cornett, linked to humanities and social sciences.",
    strong: "Find David Strong, a place for classes and coursework.",
    maclaurin: "Find the MacLaurin Building, connected with education and teaching.",
    ecss: "Find Engineering & Computer Science.",
    bob: "Find the Bob Wright Centre, linked to physics and astronomy.",
    jcc: "Find Jamie Cassels Centre, a campus gathering space.",
    cle: "Find Clearihue, linked to languages and humanities."
  };
  const storageKey = "u-pic-wayfinding-v1";
  let completed = [];
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
    if (Array.isArray(saved)) completed = saved.filter(id => api.buildings.some(b => b.id === id));
  } catch (_) {}
  let current = null;
  let message = "";
  const panel = document.getElementById("campus-challenge");
  const nodes = document.getElementById("map-nodes");
  const save = () => { try { localStorage.setItem(storageKey, JSON.stringify(completed)); } catch (_) {} };
  function render() {
    if (!panel) return;
    panel.replaceChildren();
    const title = document.createElement("strong");
    title.textContent = "🧭 Campus wayfinding challenge";
    const description = document.createElement("p");
    description.textContent = current
      ? prompts[current.id] + " Tap the correct building on the map above."
      : (message || ("Practice finding UVic landmarks · " + completed.length + "/8 completed"));
    const button = document.createElement("button");
    button.type = "button";
    button.className = "button secondary";
    button.textContent = current ? "Cancel challenge" : (completed.length === 8 ? "Practice again" : "Start a challenge");
    button.addEventListener("click", () => {
      if (current) {
        current = null;
        message = "Challenge cancelled.";
      } else {
        const choices = api.buildings.filter(b => !completed.includes(b.id));
        current = (choices.length ? choices : api.buildings)[0];
        message = "";
      }
      render();
    });
    panel.append(title, description, button);
  }
  nodes?.addEventListener("click", event => {
    if (!current) return;
    const hotspot = event.target.closest(".map-hotspot");
    if (!hotspot) return;
    event.preventDefault();
    event.stopPropagation();
    if (hotspot.dataset.buildingId !== current.id) {
      message = "Not quite! Look at the map labels and try again. " + prompts[current.id];
      panel.querySelector("p").textContent = message;
      return;
    }
    if (!completed.includes(current.id)) completed.push(current.id);
    save();
    message = "🎉 You found " + current.name + "! " + completed.length + "/8 challenges complete.";
    current = null;
    render();
  }, true);
  document.addEventListener("upic:reset", () => { completed = []; current = null; message = ""; save(); render(); });
  render();
})();
