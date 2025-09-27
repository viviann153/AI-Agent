// ---------- theme ----------
const themeToggle = document.getElementById("themeToggle");
themeToggle?.addEventListener("click", () => {
  const dark = document.documentElement.dataset.theme !== "light";
  document.documentElement.dataset.theme = dark ? "light" : "dark";
  themeToggle.textContent = dark ? "☀️" : "🌙";
});

// ---------- toast ----------
const toastEl = document.getElementById("toast");
function toast(msg){
  if(!toastEl) return;
  toastEl.textContent = msg;
  toastEl.hidden = false;
  toastEl.classList.add("show");
  setTimeout(()=>{ toastEl.hidden=true; toastEl.classList.remove("show"); }, 2400);
}

// ---------- mock data (swap with your API) ----------
/** Backend contract:
 *  id, title, img, price, beds, baths, sqft, address, distanceMi,
 *  commuteMin, amenities: string[], provider, lat, lng, link, matchScore (0-1)
 */
let DATA = [
  {id:"foxridge-2b", title:"Foxridge 2BR", img:"https://images.unsplash.com/photo-1600585154340-1e4ce9a6f107?q=80&w=800", price:820, beds:2, baths:1, sqft:780, address:"1515 Heather Dr", distanceMi:2.1, commuteMin:12, amenities:["parking","laundry","pet"], provider:"Foxridge", lat:37.223, lng:-80.447, link:"#", matchScore:.92},
  {id:"smiths-1b", title:"Smith's Landing 1BR", img:"https://images.unsplash.com/photo-1560185007-c5ca3a39c787?q=80&w=800", price:1025, beds:1, baths:1, sqft:610, address:"870 Plantation Rd", distanceMi:1.4, commuteMin:8, amenities:["parking","laundry","furnished"], provider:"Smith's", lat:37.241, lng:-80.424, link:"#", matchScore:.88},
  {id:"pointe-3b", title:"The Pointe 3BR", img:"https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=800", price:700, beds:3, baths:2, sqft:1100, address:"1200 University City Blvd", distanceMi:1.1, commuteMin:6, amenities:["parking","laundry","pet"], provider:"The Pointe", lat:37.237, lng:-80.432, link:"#", matchScore:.86},
  {id:"chez-std", title:"Downtown Studio", img:"https://images.unsplash.com/photo-1502673530728-f79b4cab31b1?q=80&w=800", price:900, beds:"Studio", baths:1, sqft:420, address:"Main St Downtown", distanceMi:0.6, commuteMin:5, amenities:["laundry","furnished"], provider:"Private", lat:37.229, lng:-80.414, link:"#", matchScore:.79},
  {id:"knoll-4b", title:"Knollwood 4BR", img:"https://images.unsplash.com/photo-1600585154154-3d36b86a9a83?q=80&w=800", price:650, beds:"4+", baths:2, sqft:1250, address:"Knollwood Dr", distanceMi:2.8, commuteMin:14, amenities:["parking","pet"], provider:"Knollwood", lat:37.229, lng:-80.452, link:"#", matchScore:.81}
];

// ---------- state ----------
const cardsEl = document.getElementById("listings");
const resultsCount = document.getElementById("resultsCount");
const compareBtn = document.getElementById("compareBtn");
const filterForm = document.getElementById("filterForm");
const resetBtn = document.getElementById("resetBtn");
const sortEl = document.getElementById("sort");

let compareSet = new Set();
let favs = new Map(); // id -> item

// ---------- rendering ----------
function card(item){
  const am = item.amenities.map(a=>`<span class="badge">${a}</span>`).join("");
  const bedsText = item.beds === "Studio" ? "Studio" : `${item.beds} BR`;
  const distance = `${item.distanceMi.toFixed(1)} mi`;
  const score = Math.round((item.matchScore ?? 0)*100);

  return `
  <article class="card" data-id="${item.id}">
    <a href="${item.link || '#'}" target="_blank" rel="noopener" class="img" style="background-image:url('${item.img}')"
       aria-label="Open listing ${item.title}"></a>
    <div class="body">
      <div style="display:flex; justify-content:space-between; gap:6px; align-items:center;">
        <h4 style="margin:0">${item.title}</h4>
        <span class="badge">Match ${score}%</span>
      </div>
      <div class="badges">
        <span class="badge">${bedsText}</span>
        <span class="badge">${item.baths} BA</span>
        <span class="badge">${item.sqft} sqft</span>
        <span class="badge">${distance}</span>
        <span class="badge">${item.commuteMin} min</span>
      </div>
      <div class="meta">
        <div>
          <div class="price">$${item.price}/mo</div>
          <small class="muted">${item.address} • ${item.provider}</small>
        </div>
        <div class="actions-row">
          <button class="btn ghost" data-action="compare">↔️</button>
          <button class="btn" data-action="favorite">❤️</button>
          <a class="btn primary" href="${item.link || '#'}" target="_blank" rel="noopener">Details</a>
        </div>
      </div>
      <div class="badges" style="margin-top:8px">${am}</div>
    </div>
  </article>`;
}

function render(list){
  if(!cardsEl) return;
  cardsEl.innerHTML = list.length
    ? list.map(card).join("")
    : `<div class="empty">No matches yet. Try widening your filters.</div>`;
  resultsCount.textContent = `Listings (${list.length})`;

  cardsEl.querySelectorAll(".card .btn").forEach(btn=>{
    btn.addEventListener("click", (e)=>{
      const id = e.currentTarget.closest(".card").dataset.id;
      const item = DATA.find(d=>d.id===id);
      const action = e.currentTarget.dataset.action;
      if(action==="compare"){
        if(compareSet.has(id)) compareSet.delete(id); else compareSet.add(id);
        compareBtn.disabled = compareSet.size === 0;
        compareBtn.textContent = `Compare (${compareSet.size})`;
      } else if(action==="favorite"){
        if(favs.has(id)){ favs.delete(id); toast("Removed from favorites"); }
        else { favs.set(id, item); toast("Saved to favorites"); }
        renderFavs();
      }
    });
  });
}

// ---------- filtering & sorting ----------
function matches(item, f){
  if(f.q && !(item.title+item.address+item.provider).toLowerCase().includes(f.q)) return false;
  if(f.budget && item.price > f.budget) return false;
  if(f.beds){
    if(f.beds==="4+" && !(item.beds===4 || item.beds==="4+" || item.beds>4)) return false;
    else if(f.beds==="Studio" && item.beds!=="Studio") return false;
    else if(["1","2","3"].includes(f.beds) && String(item.beds)!==f.beds) return false;
  }
  if(f.distance && item.distanceMi > f.distance) return false;
  if(f.commute && item.commuteMin > f.commute) return false;
  if(f.amenities?.length){
    const haveAll = f.amenities.every(a=>item.amenities.includes(a));
    if(!haveAll) return false;
  }
  return true;
}
function getFilters(){
  const fd = new FormData(filterForm);
  return {
    q: (fd.get("q")||"").toString().trim().toLowerCase(),
    budget: Number(fd.get("budget")) || 0,
    beds: fd.get("beds")||"",
    distance: Number(fd.get("distance")) || 0,
    commute: Number(fd.get("commute")) || 0,
    amenities: fd.getAll("amenities")
  };
}
function sortList(list){
  const v = sortEl.value;
  const cpy = [...list];
  if(v==="price-asc") cpy.sort((a,b)=>a.price-b.price);
  else if(v==="price-desc") cpy.sort((a,b)=>b.price-a.price);
  else if(v==="distance-asc") cpy.sort((a,b)=>a.distanceMi-b.distanceMi);
  else cpy.sort((a,b)=>(b.matchScore??0)-(a.matchScore??0));
  return cpy;
}
function applyFilters(){
  const f = getFilters();
  const filtered = DATA.filter(d=>matches(d,f));
  render(sortList(filtered));
}

// ---------- favorites drawer ----------
const favDrawer = document.getElementById("favorites");
const closeFav = document.getElementById("closeFav");
const favBody = document.getElementById("favBody");

function renderFavs(){
  if(!favBody) return;
  favBody.innerHTML = [...favs.values()].map(x=>`
    <div class="fav-item">
      <img src="${x.img}" alt="">
      <div>
        <div><strong>${x.title}</strong></div>
        <small class="muted">$${x.price}/mo • ${x.distanceMi.toFixed(1)} mi • ${x.commuteMin} min</small>
      </div>
      <button class="btn ghost" data-id="${x.id}">Remove</button>
    </div>
  `).join("") || `<div class="empty">No favorites yet.</div>`;
  favBody.querySelectorAll("button[data-id]").forEach(b=>{
    b.addEventListener("click", ()=>{ favs.delete(b.dataset.id); renderFavs(); render(sortList(DATA)); });
  });
}
document.addEventListener("keydown", (e)=>{
  if(e.key==="f" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault(); favDrawer.classList.add("open"); favDrawer.setAttribute("aria-hidden","false");
  }
});
closeFav?.addEventListener("click", ()=>{
  favDrawer.classList.remove("open"); favDrawer.setAttribute("aria-hidden","true");
});

// ---------- compare ----------
const compareModal = document.getElementById("compareModal");
const compareTable = document.getElementById("compareTable");
compareBtn?.addEventListener("click", ()=>{
  const items = [...compareSet].map(id=>DATA.find(d=>d.id===id));
  if(items.length===0) return;
  compareTable.innerHTML = `
    <div class="compare-grid">
      <div class="col">
        <h5>Feature</h5>
        <p>Price</p><p>Bedrooms</p><p>Baths</p><p>Distance to VT</p><p>Commute</p>
        <p>Amenities</p><p>Sq Ft</p><p>Provider</p>
      </div>
      ${items.map(x=>`
        <div class="col">
          <h5>${x.title}</h5>
          <p>$${x.price}/mo</p>
          <p>${x.beds=== 'Studio' ? 'Studio' : x.beds + ' BR'}</p>
          <p>${x.baths}</p>
          <p>${x.distanceMi.toFixed(1)} mi</p>
          <p>${x.commuteMin} min</p>
          <p>${x.amenities.join(', ')}</p>
          <p>${x.sqft}</p>
          <p>${x.provider}</p>
        </div>
      `).join("")}
    </div>`;
  compareModal.showModal();
});
compareModal?.addEventListener("close", ()=>{});

// ---------- sorting & filters events ----------
filterForm?.addEventListener("submit",(e)=>{ e.preventDefault(); applyFilters(); });
resetBtn?.addEventListener("click", ()=>{ setTimeout(applyFilters, 0); });
sortEl?.addEventListener("change", applyFilters);

// ---------- initial load ----------
(async function init(){
  // When backend is ready, replace with:
  // const res = await fetch('/api/listings');
  // DATA = await res.json();
  applyFilters();
  renderFavs();
})();

// ====== AI Agent UI ======
const agentPanel = document.getElementById("agentPanel");
const openAgent = document.getElementById("openAgent");
const closeAgent = document.getElementById("closeAgent");
const agentBody = document.getElementById("agentBody");
const agentForm = document.getElementById("agentForm");
const agentInput = document.getElementById("agentInput");
const applyPlanBtn = document.getElementById("applyPlan");

let lastAgentPlan = null; // { summary, explanation, filters }

openAgent?.addEventListener("click", ()=>{
  agentPanel.classList.add("open");
  agentPanel.setAttribute("aria-hidden","false");
  agentInput?.focus();
});
closeAgent?.addEventListener("click", ()=>{
  agentPanel.classList.remove("open");
  agentPanel.setAttribute("aria-hidden","true");
});

// Quick chips
agentBody?.addEventListener("click", (e)=>{
  if(e.target.matches(".chip")){
    agentInput.value = e.target.dataset.prompt;
    agentInput.focus();
  }
});

agentForm?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const text = agentInput.value.trim();
  if(!text) return;
  pushMsg("user", text);
  agentInput.value = "";
  pushMsg("bot", "Thinking…");

  try{
    // Swap this with your real backend:
    // const res = await fetch('/api/agent/message', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ message: text })});
    // const ai = await res.json(); // -> { summary, explanation, filters }
    const ai = await mockAgent(text);

    replaceLastBot(`
      <div><strong>Plan:</strong> ${escapeHtml(ai.summary)}</div>
      <small>${escapeHtml(ai.explanation)}</small>
      <div style="margin-top:6px">
        <code style="font-size:.8rem">${escapeHtml(JSON.stringify(ai.filters))}</code>
      </div>
    `);

    lastAgentPlan = ai;
    applyPlanBtn.disabled = false;
    toast("Agent has a plan. Click “Apply Plan to Filters”.");
  }catch(err){
    replaceLastBot(`<div>Sorry, I hit an error. Try again.</div><small class="muted">${escapeHtml(String(err))}</small>`);
  }
});

// Apply agent filters → UI filters
applyPlanBtn?.addEventListener("click", ()=>{
  if(!lastAgentPlan) return;
  applyAgentFilters(lastAgentPlan.filters);
  applyFilters();
  toast("Filters updated from agent plan.");
});

// Chat UI helpers
function pushMsg(who, html){
  const d = document.createElement("div");
  d.className = `msg ${who}`;
  d.textContent = html; // simple, safe
  agentBody.appendChild(d);
  agentBody.scrollTop = agentBody.scrollHeight;
}
function replaceLastBot(html){
  const nodes = [...agentBody.querySelectorAll(".msg.bot")];
  const last = nodes[nodes.length-1];
  if(last){ last.innerHTML = html; }
}
function escapeHtml(s){ return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

// Take filters from agent and push into the existing form
function applyAgentFilters(f){
  if(f.keywords != null) document.getElementById("q").value = f.keywords;
  if(f.budget != null) document.getElementById("budget").value = f.budget;
  if(f.beds != null){
    const bedsSel = document.getElementById("beds");
    bedsSel.value = (f.beds >= 4) ? "4+" : (f.beds===0 ? "Studio" : String(f.beds));
  }
  if(f.distance != null) document.getElementById("distance").value = f.distance;
  if(f.commute != null) document.getElementById("commute").value = f.commute;

  const am = new Set(f.amenities || []);
  document.querySelectorAll('input[type="checkbox"][name="amenities"]').forEach(cb=>{
    cb.checked = am.has(cb.value);
  });

  const sort = document.getElementById("sort");
  if(sort) sort.value = "match";
}

// ----- Mock AI (replace with your Python endpoint later) -----
async function mockAgent(userText){
  const t = userText.toLowerCase();

  const filters = {
    keywords: /downtown|main/.test(t) ? "downtown" : "",
    budget: (/(\$)?(\d{3,4})/).test(userText) ? Number(userText.match(/(\d{3,4})/)[0]) : 0,
    beds: /studio/.test(t) ? 0 : (/(\b[1-4]\b)\s*br|\b([1-4])\s*bed/.test(t) ? Number((t.match(/(\b[1-4]\b)\s*br|\b([1-4])\s*bed/)||[])[1] || (t.match(/(\b[1-4]\b)\s*br|\b([1-4])\s*bed/)||[])[2]) : ""),
    distance: /walk|walking/.test(t) ? 1.0 : (/bike|biking/.test(t) ? 2.0 : (/bus|bt/.test(t) ? 3.0 : "")),
    commute: /(<|less than|under)\s*15/.test(t) ? 15 : (/(\d+)\s*min/.test(t) ? Number(t.match(/(\d+)\s*min/)[1]) : ""),
    amenities: [
      /dog|pet|cat/.test(t) ? "pet" : null,
      /laundry|washer/.test(t) ? "laundry" : null,
      /furnish/.test(t) ? "furnished" : null,
      /parking|car/.test(t) ? "parking" : null
    ].filter(Boolean)
  };

  const wants = [
    filters.budget ? `max $${filters.budget}` : null,
    filters.beds === 0 ? "studio" : (filters.beds ? `${filters.beds}BR` : null),
    filters.distance ? `≤ ${filters.distance} mi to VT` : null,
    filters.commute ? `≤ ${filters.commute} min commute` : null,
    filters.amenities.length ? `amenities: ${filters.amenities.join(", ")}` : null,
    filters.keywords ? `keywords: ${filters.keywords}` : null
  ].filter(Boolean).join(" • ");

  const explanation = [
    filters.distance ? "Walking implies ≤1 mi; biking ~2 mi; BT bus ≤3 mi." : null,
    filters.amenities.includes("pet") ? "Pet-friendly units prioritized; may reduce inventory." : null,
    filters.budget ? "Budget used to filter price ceiling." : null
  ].filter(Boolean).join(" ");

  await new Promise(r=>setTimeout(r, 350));

  return {
    summary: wants || "I'll infer preferences as you share more details.",
    explanation: explanation || "Adjust any constraint and I'll refine the plan.",
    filters
  };
}