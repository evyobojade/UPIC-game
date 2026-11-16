/* UPIC: word puzzle -> campus discovery -> Passport stamp */
(() => {
  "use strict";
  const api = window.UPic;
  if (!api) return;
  const buildings = api.buildings;
  const storageKey = "upic-campus-missions-v3";
  const purposes = {
    mcpherson:"borrow a book or ask for research help",
    cornett:"attend humanities and social-science classes",
    strong:"attend classes in the David Strong Building",
    maclaurin:"study education and teaching",
    ecss:"study engineering or computer science",
    bob:"study physics and astronomy",
    jcc:"attend a university event",
    cle:"study languages or humanities"
  };
  const photos = {
    mcpherson:"UVic McPherson Library.jpg",
    cle:"UVic Clearihue Building.jpg",
    ecss:"UVic ECS Building.png"
  };
  let completed = [];
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
    if (Array.isArray(saved)) completed = saved.filter(id=>buildings.some(b=>b.id===id));
  } catch (_) {}
  const save = () => { try {localStorage.setItem(storageKey,JSON.stringify(completed));} catch (_){} };
  const mk = (tag, cls, value) => {
    const e=document.createElement(tag);
    if(cls)e.className=cls;
    if(value!==undefined)e.textContent=value;
    return e;
  };
  let active = null;
  const win=document.getElementById("win-modal");
  const actions=win?.querySelector(".win-actions");
  const button=mk("button","button gold mission-launch","🧭 Find this building");
  button.type="button";
  button.hidden=true;
  actions?.prepend(button);
  const modal=mk("div","mission-overlay");
  modal.id="campus-mission-modal";
  modal.hidden=true;
  modal.setAttribute("role","dialog");
  modal.setAttribute("aria-modal","true");
  modal.setAttribute("aria-labelledby","mission-title");
  modal.innerHTML='<div class="mission-sheet"><button class="mission-close" type="button" aria-label="Close discovery mission">×</button><p class="mission-eyebrow">🧭 CAMPUS DISCOVERY</p><h2 id="mission-title"></h2><p id="mission-prompt"></p><p id="mission-count"></p><div id="mission-options" class="mission-options"></div><p id="mission-feedback" role="status" aria-live="polite"></p><button class="mission-done" type="button">Return to campus map</button></div>';
  document.body.appendChild(modal);
  const options=document.getElementById("mission-options");
  const feedback=document.getElementById("mission-feedback");
  const count=document.getElementById("mission-count");
  function crop(b, node) {
    // Map crops rather than answer labels ensure a spatial-recognition task.
    const cx=b.left+b.width/2,cy=b.top+b.height/2;
    const w=35,h=35;
    const x=Math.max(0,Math.min(100-w,cx-w/2));
    const y=Math.max(0,Math.min(100-h,cy-h/2));
    node.style.backgroundImage='url("assets/campus-map-hd.png")';
    node.style.backgroundSize=(10000/w)+"% "+(10000/h)+"%";
    node.style.backgroundPosition=(x/(100-w)*100)+"% "+(y/(100-h)*100)+"%";
  }
  function choicesFor(b) {
    const p=buildings.findIndex(item=>item.id===b.id);
    const choices=[b,buildings[(p+3)%buildings.length],buildings[(p+5)%buildings.length]];
    const offset=p%3;
    return choices.slice(offset).concat(choices.slice(0,offset));
  }
  function showMission(b) {
    if(!b)return;
    active=b;
    win?.classList.remove("open");
    win?.setAttribute("aria-hidden","true");
    modal.hidden=false;
    document.getElementById("mission-title").textContent="Find "+b.name;
    document.getElementById("mission-prompt").textContent="Your next campus mission: someone needs to "+purposes[b.id]+". Which map area contains "+b.name+"? Pick one of the three locations.";
    count.textContent=completed.length+"/8 discovery stamps earned";
    feedback.textContent="Look closely at the buildings and paths. Your answer won't cost hints.";
    options.replaceChildren();
    choicesFor(b).forEach((item,index)=>{
      const pick=mk("button","mission-option");
      pick.type="button";
      pick.setAttribute("aria-label","Campus map area "+(index+1));
      const view=mk("span","mission-map-crop");
      view.setAttribute("aria-hidden","true");
      crop(item,view);
      const label=mk("span","mission-area-label","Location "+(index+1));
      pick.append(view,label);
      pick.addEventListener("click",()=>{
        if(item.id!==b.id){
          feedback.textContent="Not quite. Look for the correct campus landmark and try again.";
          pick.classList.add("incorrect");
          return;
        }
        options.querySelectorAll("button").forEach(x=>x.disabled=true);
        pick.classList.add("correct");
        label.textContent="✓ "+b.name;
        const newStamp=!completed.includes(b.id);
        if(newStamp){completed.push(b.id);save();}
        const earnedHint=newStamp && api.addHint();
        feedback.textContent="🎉 Campus discovered! "+b.name+" added to your Passport. "+(earnedHint?"You earned +1 hint!":newStamp?"New discovery stamp earned!":"You've already earned this stamp.")+" "+completed.length+"/8 missions complete.";
        count.textContent=completed.length+"/8 discovery stamps earned";
        document.dispatchEvent(new CustomEvent("upic:missioncomplete",{detail:{building:b,count:completed.length}}));
      });
      options.appendChild(pick);
    });
    modal.querySelector(".mission-close").focus();
  }
  function closeMission(){
    modal.hidden=true;
    active=null;
    api.showPage("map");
  }
  button.addEventListener("click",()=>showMission(active));
  modal.querySelector(".mission-close").addEventListener("click",closeMission);
  modal.querySelector(".mission-done").addEventListener("click",closeMission);
  modal.addEventListener("click",e=>{if(e.target===modal)closeMission();});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!modal.hidden)closeMission();});
  document.addEventListener("upic:puzzlesolved",({detail})=>{
    active=detail.building;
    button.hidden=false;
    button.textContent=completed.includes(active.id)?"🧭 Replay building mission":"🧭 Find this building";
  });
  document.addEventListener("upic:puzzlestart",({detail})=>{
    button.hidden=true;
    active=detail.building;
    const card=document.querySelector("#clue-grid .clue-card:last-child");
    if(!card)return;
    const b=detail.building;
    const img=card.querySelector("img");
    const caption=card.querySelector(".clue-caption");
    if(img){
      const url=photos[b.id];
      img.src=url?"https://commons.wikimedia.org/wiki/Special:FilePath/"+encodeURIComponent(url)+"?width=540":"assets/campus-map-hd.png";
      img.alt="Campus landmark clue for "+b.name;
      img.onerror=()=>{
        img.onerror=null;
        img.src="assets/campus-map-hd.png";
      };
    }
    card.setAttribute("aria-label","Campus destination clue for "+b.name);
    card.classList.add("campus-landmark-clue");
    if(caption)caption.textContent="Campus connection: "+b.name;
  });
  document.addEventListener("upic:reset",()=>{
    completed=[];
    active=null;
    save();
    modal.hidden=true;
    button.hidden=true;
  });
})();