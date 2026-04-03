



  /* ---------------- AUTH (backend untouched) ---------------- */

  let selectedId = null;

  let selectedName = null;

  let selectedGameId = "";

  let selectedStatus = "";

  let editorRequestId = 0;



  // Auth is cookie-based (HttpOnly). This prevents curl/view-source from fetching /dashboard.html

  // unless they are actually logged in.

  async function authFetch(url, opts = {}) {

    return fetch(url, { credentials: "same-origin", ...opts });

  }



  // Show current user (optional)

  (async () => {

    try {

      const r = await authFetch('/me');

      if (!r.ok) return (window.location.href = '/');

      const j = await r.json().catch(() => ({}));

      document.getElementById('who').textContent = j.user || 'admin';

    } catch {

      window.location.href = '/';

    }

  })();



  async function logout(){

    try{

      await authFetch("/logout", { method: "POST" });

    }catch{}

    window.location.href = "/";

  }



  /* ---------------- New Script Name Modal (custom UI) ---------------- */

  const nameModal = document.getElementById('nameModal');

  const nameInput = document.getElementById('nameInput');

  const gameIdInput = document.getElementById('gameIdInput');

  const statusInput = document.getElementById('statusInput');

  const nameError = document.getElementById('nameError');



  function openNameModal(){

    nameError.classList.add('hidden');

    nameError.textContent = '';

    nameInput.value = '';

    gameIdInput.value = '';

    statusInput.value = '';

    nameModal.classList.remove('hidden');

    nameModal.classList.add('flex');

    document.body.style.overflow = 'hidden';

    setTimeout(()=>nameInput.focus(), 0);

  }



  function closeNameModal(){

    nameModal.classList.add('hidden');

    nameModal.classList.remove('flex');

    document.body.style.overflow = '';

  }



  function showNameError(msg){

    nameError.textContent = msg;

    nameError.classList.remove('hidden');

  }



  function submitNameModal(){

    const name = (nameInput.value || '').trim();

    const gameId = (gameIdInput.value || '').trim();

    const status = (statusInput.value || '').trim();

    if(!name) return showNameError('Please enter a script name.');

    if(name.length < 2) return showNameError('Name must be at least 2 characters.');

    if(name.length > 64) return showNameError('Name is too long.');

    closeNameModal();

    openNewEditor(name, gameId, status);

  }



  // Events

  document.getElementById('nameCreate').addEventListener('click', submitNameModal);

  document.getElementById('nameCancel').addEventListener('click', closeNameModal);

  document.getElementById('nameModalClose').addEventListener('click', closeNameModal);

  document.getElementById('nameModalBackdrop').addEventListener('click', closeNameModal);

  nameInput.addEventListener('keydown', (e)=>{ if(e.key === 'Enter') submitNameModal(); if(e.key === 'Escape') closeNameModal(); });



  async function copyHexOut(){

    const out = document.getElementById("out");

    if(!out) return;

    const val = out.value || "";

    try{

      await navigator.clipboard.writeText(val);

    }catch{

      out.focus();

      out.select();

      try{ document.execCommand("copy"); }catch{}

    }

  }





  function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}



  /* ---------------- LOAD SCRIPTS (backend untouched) ---------------- */

  async function loadScripts(){

    const r = await authFetch("/pastes");

    if (r.status === 401) { window.location.href = "/"; return; }

    const data = await r.json();

    const list = data.pastes;



    const grid = document.getElementById("scriptsGrid");

    grid.innerHTML = "";



    Object.entries(list).forEach(([name, entry]) => {

      // entry is now an object {id, name, path}; fall back to string for old format

      const id = (entry && typeof entry === 'object') ? entry.id : entry;

      const gameId = (entry && typeof entry === 'object' && entry.gameId) ? entry.gameId : "-";

      const card = document.createElement("div");

      card.className = "script-card";

      card.innerHTML = `

        <div class="font-bold mb-1">${escapeHtml(name)}</div>

        <div class="text-xs text-zinc-300 mb-1">GameId: ${escapeHtml(gameId)}</div>

        <div class="text-xs text-zinc-400">Double click to edit</div>

      `;

      card.ondblclick = () => openEditor(name, id);

      grid.appendChild(card);

    });

  }



  /* ---------------- EDITOR ---------------- */

  function setEditorLoading(isLoading, text = 'Loading...'){

    const area = document.getElementById('editorArea');

    const gameIdField = document.getElementById('editorGameId');

    const statusField = document.getElementById('editorStatus');

    const saveBtn = document.getElementById('saveButton');

    const delBtn = document.getElementById('deleteButton');

    const loadingEl = document.getElementById('editorLoading');



    area.disabled = isLoading;

    gameIdField.disabled = isLoading;

    statusField.disabled = isLoading;

    saveBtn.disabled = isLoading;

    delBtn.disabled = isLoading;

    loadingEl.textContent = isLoading ? (' ' + text) : '';

    if(isLoading) { area.value = '// ' + text; area.scrollTop = 0; }

  }



  async function openEditor(name, id){

    selectedId = id;

    selectedName = name;



    document.getElementById('editorTitle').textContent = name || 'Editor';

    document.getElementById('deleteButton').style.display = '';



    editorRequestId++;

    const thisReq = editorRequestId;

    setEditorLoading(true, 'Loading...');



    window.scrollTo({ top: 0, behavior: 'smooth' });

    document.body.style.overflow = 'hidden';

    document.getElementById('editorOverlay').classList.add('show');



    try{

      const res = await authFetch('/script/' + encodeURIComponent(id));

      if(thisReq !== editorRequestId) return;

      if(!res.ok){

        document.getElementById('editorArea').value = '// paste not found on pastefy';

        return;

      }

      const j = await res.json().catch(()=>({}));

      const txt = j.content ?? '';

      selectedGameId = j.gameId ?? '';

      selectedStatus = j.status ?? '';

      if(thisReq !== editorRequestId) return;



      const area = document.getElementById('editorArea');

      const gameIdField = document.getElementById('editorGameId');

      const statusField = document.getElementById('editorStatus');

      area.value = txt;

      gameIdField.value = selectedGameId;

      statusField.value = selectedStatus;

      area.disabled = false;

      area.scrollTop = 0;

      try{ area.setSelectionRange(0,0); }catch{}

      area.focus();

    }catch(e){

      if(thisReq !== editorRequestId) return;

      const area = document.getElementById('editorArea');

      area.value = '// connection error';

      area.disabled = false;

    }finally{

      if(thisReq === editorRequestId) setEditorLoading(false);

    }

  }



  function closeEditor(){

    editorRequestId++;

    document.getElementById('editorOverlay').classList.remove('show');

    document.body.style.overflow = '';

    selectedId = null;

    selectedName = null;

    selectedGameId = "";

    selectedStatus = "";

    document.getElementById('editorArea').value = '';

    document.getElementById('editorGameId').value = '';

    document.getElementById('editorStatus').value = '';

    document.getElementById('editorTitle').textContent = 'Editor';

    document.getElementById('editorLoading').textContent = '';

    document.getElementById('deleteButton').style.display = 'none';

  }



  function newScript(){

    openNameModal();

  }



  function openNewEditor(name, gameId = "", status = ""){

    selectedId = null;

    selectedName = name;

    selectedGameId = gameId;

    selectedStatus = status;



    document.getElementById('editorTitle').textContent = name;

    const area = document.getElementById('editorArea');

    const gameIdField = document.getElementById('editorGameId');

    const statusField = document.getElementById('editorStatus');

    area.value = '';

    gameIdField.value = selectedGameId;

    statusField.value = selectedStatus;

    area.disabled = false;



    window.scrollTo({ top: 0, behavior: 'smooth' });

    document.body.style.overflow = 'hidden';

    document.getElementById('editorOverlay').classList.add('show');

    document.getElementById('deleteButton').style.display = 'none';



    area.scrollTop = 0;

    try{ area.setSelectionRange(0,0); }catch{}

    area.focus();

  }



  async function saveScript(){

    const content = document.getElementById('editorArea').value;

    selectedGameId = (document.getElementById('editorGameId').value || '').trim();

    selectedStatus = (document.getElementById('editorStatus').value || '').trim();

    if(!selectedName){ alert('Missing script name.'); return; }



    try{

      setEditorLoading(true, 'Saving...');



      let res = null;

      if(!selectedId){

        res = await authFetch('/script', {

          method: 'POST',

          headers: { 'Content-Type': 'application/json' },

          body: JSON.stringify({

            name: selectedName,

            content,

            gameId: selectedGameId,

            status: selectedStatus

          })

        });

      } else {

        res = await authFetch('/script/' + encodeURIComponent(selectedId), {

          method: 'PUT',

          headers: { 'Content-Type': 'application/json' },

          body: JSON.stringify({ content, gameId: selectedGameId, status: selectedStatus })

        });

      }



      const text = await res.text();

      let data; try { data = JSON.parse(text); } catch { data = { message: text }; }



      if(!res.ok) throw new Error(data.error || data.message || 'Save failed');

      if(!selectedId && data.id) selectedId = data.id;



      closeEditor();

      await loadScripts();

    }catch(e){

      alert('Save failed: ' + e.message);

    }finally{

      setEditorLoading(false);

    }

  }



  async function deleteScript(){

    if(!selectedId){ alert("Can't delete unsaved script."); return; }

    if(!confirm("Delete this paste?")) return;



    try{

      setEditorLoading(true, 'Deleting...');

      const res = await authFetch('/script/' + encodeURIComponent(selectedId), { method: 'DELETE' });



      const text = await res.text();

      let data; try { data = JSON.parse(text); } catch { data = { message: text }; }

      if(!res.ok) throw new Error(data.error || data.message || 'Delete failed');



      closeEditor();

      await loadScripts();

    }catch(e){

      alert('Delete failed: ' + e.message);

    }finally{

      setEditorLoading(false);

    }

  }





  const SALT = 12;

  const ADD = [91,14,203,44,19,77,162,3,55,29,151,8,66,40,11,222];



  function R(n){ let a=new Uint8Array(n); crypto.getRandomValues(a); return a; }

  function B2H(b){ return [...b].map(x=>x.toString(16).padStart(2,"0")).join("").toUpperCase(); }

  function S2B(s){ return new TextEncoder().encode(s); }



  function makeKey(n,salt){

      let k=[];

      let extra=(n*3+51)&0xFF;

      for(let i=0;i<n;i++){

          let pos=i%ADD.length;

          let sv=salt[i%salt.length];

          k[i]=(ADD[pos] ^ (extra + sv)) & 0xFF;

      }

      return k;

  }



  function xorBytes(d,k){

      let o=new Uint8Array(d.length);

      for(let i=0;i<d.length;i++) o[i]=d[i]^k[i];

      return o;

  }



  // bind once

  (function(){

    const btn = document.getElementById("gen");

    if(!btn) return;

    btn.onclick = function(){

      let src=document.getElementById("src").value;

      if(!src) return alert("Enter Lua");



      let salt=R(SALT);

      let data=S2B(src);

      let n=data.length;



      let key=makeKey(n,salt);

      let x=xorBytes(data,key);



      let lenHex = ((n>>8)&0xFF).toString(16).padStart(2,"0")

                  + (n&0xFF).toString(16).padStart(2,"0");



      let pad=R(Math.floor(Math.random()*80)+40);



      let full = B2H(salt) + lenHex.toUpperCase() + B2H(x) + B2H(pad);



      document.getElementById("out").value =

          `loadstring(game:HttpGet("https://zort-obf.vercel.app/api/obf_v1.lua"))()("${full}")`;

    };

  })();





  /* ---------------- CREDITS (UI ONLY, no backend changes) ---------------- */

  async function loadCredits(){

    const grid = document.getElementById("creditsGrid");

    const status = document.getElementById("creditsStatus");

    if(!grid) return;

    if(status) status.textContent = "Loading…";

    grid.innerHTML = "";



    const SOURCE = "https://bot.risehub.fun/devs";



    // Your exact bios (as requested)

    const bios = {

      hankiwastaken: "Owner of Zort Auth And Developer of Hankey",

      righthit_: "Owner of Zort Auth And Developer of RIGHTARMOR"

    };



    const fallback = {

      hankiwastaken: {

        username:"hankiwastaken", global_name:"Hanki", display_name:"Hanki",

        avatar_url:"https://cdn.discordapp.com/avatars/1355555077330440435/07e58d6338eb381521d4a824b2fa78be.webp?size=512",

         created_at:"2025-03-29T14:51:55.431Z"

      },

      righthit_: {

        id:"688847033070911719", username:"righthit_", global_name:"RIGHTHIT", display_name:"RIGHTHIT",

        avatar_url:"https://cdn.discordapp.com/avatars/688847033070911719/fa89c1daae055548f40a4dc8c2105b30.webp?size=512",

        badges:[], status:"offline", created_at:"2020-03-15T20:32:10.843Z"

      }

    };



    function pill(text, purple=false){

      return `<span class="metaPill ${purple ? "purple":""}">${escapeHtml(text)}</span>`;

    }



    function fmtDate(iso){

      try{ return new Date(iso).toLocaleDateString(); }catch{ return ""; }

    }



    function renderCard(roleLabel, u){

      const display = u.display_name || u.global_name || u.username || "Unknown";

      const user = u.username ? "@" + u.username : "";

      const created = u.created_at ? fmtDate(u.created_at) : "";

      const badges = Array.isArray(u.badges) ? u.badges : [];

      const statusTxt = u.status || "unknown";

      const id = u.id || "";



      const parts = [];

      parts.push(pill("status: " + statusTxt, true));

      if(created) parts.push(pill("created: " + created));

      if(id) parts.push(pill("id: " + id));

      for(const b of badges.slice(0,3)) parts.push(pill(b));



      const bio = bios[u.username] || "";



      const card = document.createElement("div");

      card.className = "creditCard";

      card.innerHTML = `

        <div class="creditTop">

          <img class="creditAvatar" src="${u.avatar_url || ""}" alt="${escapeHtml(display)}" loading="lazy">

          <div class="creditNames">

            <div class="creditDisplay">${escapeHtml(display)}</div>

            <div class="creditUser">${escapeHtml(user)}</div>

          </div>

          <div class="creditRole">${escapeHtml(roleLabel)}</div>

        </div>

        <div class="creditBio">${escapeHtml(bio)}</div>

      `;



      card.addEventListener("mousemove", (e)=>{

        const r = card.getBoundingClientRect();

        const mx = ((e.clientX - r.left) / r.width) * 100;

        const my = ((e.clientY - r.top) / r.height) * 100;

        card.style.setProperty("--mx", mx + "%");

        card.style.setProperty("--my", my + "%");

      });



      return card;

    }



    try{

      const r = await fetch(SOURCE, { cache: "no-store" });

      if(!r.ok) throw new Error("HTTP " + r.status);

      const data = await r.json();



      const right = data.righthit_ || data["righthit_"] || fallback.righthit_;

      const hanki = data.hankiwastaken || data["hankiwastaken"] || fallback.hankiwastaken;



      grid.appendChild(renderCard("Owner", hanki));

      grid.appendChild(renderCard("Owner", right));



      if(status) status.textContent = "   ";

    }catch(e){

      // If the endpoint blocks CORS / returns 403, keep UI working.

      grid.appendChild(renderCard("Owner", fallback.hankiwastaken));

      grid.appendChild(renderCard("Owner", fallback.righthit_));

      if(status) status.textContent = "   ";

    }

  }



    



/* ---------------- USERS (Supabase, via server) ---------------- */

let USERS_CACHE = null;



function norm(v){

  if(v === null || v === undefined) return "";

  return String(v).toLowerCase().trim();

}



function renderUsersTable(users, filter=""){

  const status = document.getElementById("usersStatus");

  const headRow = document.getElementById("usersHeadRow");

  const body = document.getElementById("usersBody");

  if(!headRow || !body) return;



  const list = Array.isArray(users) ? users : [];

  const cols = list.length ? Object.keys(list[0]) : [];



  headRow.innerHTML = cols.map(c => `<th class="px-3 py-3 text-left font-semibold border-r border-white/5">${escapeHtml(c)}</th>`).join("") || `<th class="px-3 py-3 text-left font-semibold">No columns</th>`;



  const f = norm(filter);

  const filtered = (!f) ? list : list.filter(u => Object.values(u).some(val => norm(val).includes(f)));



  body.innerHTML = "";

  for(const u of filtered){

    const tr = document.createElement("tr");

    tr.className = "border-b border-white/5 hover:bg-white/5 transition";

    tr.innerHTML = cols.map(c => `<td class="px-3 py-2 border-r border-white/5 text-white/85">${escapeHtml(u?.[c] ?? "")}</td>`).join("");

    body.appendChild(tr);

  }



  if(status){

    status.textContent = filtered.length ? `Showing ${filtered.length} / ${list.length}` : (list.length ? "No results for this search." : "No users returned.");

  }

}





let KEYSYSTEM_CACHE = null;



async function loadKeysystem(){

  if(KEYSYSTEM_CACHE !== null){

    const el = document.getElementById("keysystemStatus");

    if(el) el.textContent = "Keysystem: " + KEYSYSTEM_CACHE;

    return;

  }

  const el = document.getElementById("keysystemStatus");

  if(el) el.textContent = "Keysystem: checking...";

  try{

    const r = await authFetch("/api/keysystem");

    if(!r.ok){

      if(el) el.textContent = "Keysystem: unavailable";

      return;

    }

    const j = await r.json().catch(()=>({}));

    KEYSYSTEM_CACHE = (j && "keysystem" in j) ? j.keysystem : null;

    if(el) el.textContent = "Keysystem: " + (KEYSYSTEM_CACHE ?? "null");

  }catch{

    if(el) el.textContent = "Keysystem: connection error";

  }

}



async function loadUsers(){

  // avoid re-fetching every tab switch

  if(USERS_CACHE){

    renderUsersTable(USERS_CACHE, document.getElementById("usersSearch")?.value || "");

    return;

  }



  const status = document.getElementById("usersStatus");

  if(status) status.textContent = "Loading users...";



  await loadKeysystem();



  const r = await authFetch("/api/users");

  if (r.status === 401) { window.location.href = "/"; return; }

  if (!r.ok) {

    const j = await r.json().catch(()=>({}));

    if(status) status.textContent = j.message || ("Failed to load users (HTTP " + r.status + ")");

    return;

  }



  const j = await r.json();

  USERS_CACHE = j.users || [];

  renderUsersTable(USERS_CACHE);



  const input = document.getElementById("usersSearch");

  if(input && !input.dataset.bound){

    input.dataset.bound = "1";

    input.addEventListener("input", (e)=>{

      renderUsersTable(USERS_CACHE, e.target.value);

    });

  }

}





/* ---------------- UI ONLY: tabs + underline + animations ---------------- */

  (function(){

    const tabsWrap = document.getElementById("tabsWrap");

    const underline = document.getElementById("tabUnderline");



    const tabs = {

      scripts: {

        btn: document.getElementById("tabScripts"),

        panel: document.getElementById("pageScripts"),

        onShow: null

      },

      hex: {

        btn: document.getElementById("tabHex"),

        panel: document.getElementById("pageHex"),

        onShow: null

      },

      credits: {

        btn: document.getElementById("tabCredits"),

        panel: document.getElementById("pageCredits"),

        onShow: loadCredits

      },

      users: {

        btn: document.getElementById("tabUsers"),

        panel: document.getElementById("pageUsers"),

        onShow: loadUsers

      },

      settings: {

        btn: document.getElementById("tabSettings"),

        panel: document.getElementById("pageSettings"),

        onShow: renderThemeGrid

      }

    };



    let current = "scripts";



    function placeUnderline(btn){

      if(!tabsWrap || !underline || !btn) return;

      const r = btn.getBoundingClientRect();

      const pr = tabsWrap.getBoundingClientRect();

      const h = Math.max(18, r.height - 10);

      underline.style.height = h + "px";

      underline.style.transform = `translateY(${(r.top - pr.top) + 5}px)`;

    }



    function animateSwitch(show, hide){

      if(show === hide) return;



      // show

      show.classList.remove("hidden");

      show.classList.add("is-enter");



      // hide

      hide.classList.add("is-leave");



      requestAnimationFrame(()=>{

        requestAnimationFrame(()=>{

          show.classList.remove("is-enter");

        });

      });



      setTimeout(()=>{

        hide.classList.remove("is-leave");

        hide.classList.add("hidden");

      }, 230);

    }



    window.showTab = function(which){

      if(!tabs[which]) which = "scripts";

      if(which === current) return;



      const prev = current;

      current = which;



      for(const [k, v] of Object.entries(tabs)){

        v.btn.classList.toggle("is-active", k === which);

      }



      placeUnderline(tabs[which].btn);

      animateSwitch(tabs[which].panel, tabs[prev].panel);



      if(typeof tabs[which].onShow === "function"){

        tabs[which].onShow();

      }

    };



    // init

    requestAnimationFrame(()=>placeUnderline(tabs[current].btn));

    window.addEventListener("resize", ()=>{

      placeUnderline(tabs[current].btn);

    });

  })();





/* hover glow tracking for scripts cards */

  document.addEventListener("mousemove", (e) => {

    document.querySelectorAll(".script-card").forEach(card => {

      const r = card.getBoundingClientRect();

      const mx = ((e.clientX - r.left) / r.width) * 100;

      const my = ((e.clientY - r.top) / r.height) * 100;

      card.style.setProperty("--mx", mx + "%");

      card.style.setProperty("--my", my + "%");

    });

  });





  /* ---------------- SETTINGS: THEMES ---------------- */

  const THEMES = [

    { id:"purple",   name:"Zort Purple (Default)", a1:[168,85,247], a2:[99,102,241],  bg:"#04020b", glass:"rgba(255,255,255,0.03)", border:"rgba(255,255,255,0.10)", text:"rgba(255,255,255,0.92)", muted:"rgba(255,255,255,0.62)", sidebar:"#060612" },

    { id:"pink",     name:"Soft Pink (Pastel)",    a1:[255,140,210], a2:[255,190,225], bg:"#07020a", glass:"rgba(255,255,255,0.035)", border:"rgba(255,255,255,0.11)", text:"rgba(255,255,255,0.92)", muted:"rgba(255,255,255,0.64)", sidebar:"#070214" },

    { id:"femboy",   name:"Femboy Glow",           a1:[255,140,200],a2:[180,120,255], bg:"#080310", glass:"rgba(255,255,255,0.035)", border:"rgba(255,255,255,0.11)", text:"rgba(255,255,255,0.92)", muted:"rgba(255,255,255,0.64)", sidebar:"#090316" },

    { id:"red",      name:"Blood Red",             a1:[239,68,68],  a2:[220,38,38],   bg:"#080205", glass:"rgba(255,255,255,0.03)",  border:"rgba(255,255,255,0.10)", text:"rgba(255,255,255,0.92)", muted:"rgba(255,255,255,0.62)", sidebar:"#08020b" },

    { id:"hawk",     name:"Hawk Amber",            a1:[245,158,11], a2:[249,115,22],  bg:"#08060a", glass:"rgba(255,255,255,0.03)",  border:"rgba(255,255,255,0.10)", text:"rgba(255,255,255,0.92)", muted:"rgba(255,255,255,0.62)", sidebar:"#0a060f" },

    { id:"cyber",    name:"Cyberpunk",             a1:[236,72,153], a2:[34,211,238],  bg:"#05020a", glass:"rgba(255,255,255,0.03)",  border:"rgba(255,255,255,0.10)", text:"rgba(255,255,255,0.92)", muted:"rgba(255,255,255,0.62)", sidebar:"#060012" },

    { id:"tokyo",    name:"Tokyo Night",           a1:[129,140,248],a2:[56,189,248],  bg:"#060816", glass:"rgba(255,255,255,0.03)",  border:"rgba(255,255,255,0.10)", text:"rgba(255,255,255,0.92)", muted:"rgba(255,255,255,0.62)", sidebar:"#070a1a" },

    { id:"oled",     name:"OLED",                  a1:[255,255,255],a2:[168,85,247],  bg:"#000000", glass:"rgba(255,255,255,0.02)",  border:"rgba(255,255,255,0.08)", text:"rgba(255,255,255,0.94)", muted:"rgba(255,255,255,0.60)", sidebar:"#000000" },

    { id:"ocean",    name:"Ocean",                 a1:[34,211,238], a2:[59,130,246],  bg:"#030916", glass:"rgba(255,255,255,0.03)",  border:"rgba(255,255,255,0.10)", text:"rgba(255,255,255,0.92)", muted:"rgba(255,255,255,0.62)", sidebar:"#04102a" },

    { id:"forest",   name:"Forest",                a1:[34,197,94],  a2:[16,185,129],  bg:"#04110b", glass:"rgba(255,255,255,0.03)",  border:"rgba(255,255,255,0.10)", text:"rgba(255,255,255,0.92)", muted:"rgba(255,255,255,0.62)", sidebar:"#06160f" },

    { id:"sunset",   name:"Sunset",                a1:[249,115,22], a2:[236,72,153],  bg:"#0b0503", glass:"rgba(255,255,255,0.03)",  border:"rgba(255,255,255,0.10)", text:"rgba(255,255,255,0.92)", muted:"rgba(255,255,255,0.62)", sidebar:"#120607" },

    { id:"glacier",  name:"Glacier",               a1:[56,189,248], a2:[99,102,241],  bg:"#050a14", glass:"rgba(255,255,255,0.03)",  border:"rgba(255,255,255,0.10)", text:"rgba(255,255,255,0.92)", muted:"rgba(255,255,255,0.62)", sidebar:"#070f22" },

    { id:"ubuntu",   name:"Ubuntu",                a1:[249,115,22], a2:[168,85,247],  bg:"#120513", glass:"rgba(255,255,255,0.03)",  border:"rgba(255,255,255,0.10)", text:"rgba(255,255,255,0.92)", muted:"rgba(255,255,255,0.62)", sidebar:"#1a0820" },

    { id:"midnight", name:"Midnight",              a1:[99,102,241], a2:[20,184,166],  bg:"#03040d", glass:"rgba(255,255,255,0.028)", border:"rgba(255,255,255,0.10)", text:"rgba(255,255,255,0.92)", muted:"rgba(255,255,255,0.62)", sidebar:"#04051a" },

    { id:"light",    name:"Light (Soft)",          a1:[168,85,247], a2:[236,72,153],  bg:"#ececf4", glass:"rgba(0,0,0,0.05)",        border:"rgba(0,0,0,0.16)",       text:"rgba(0,0,0,0.92)",         muted:"rgba(0,0,0,0.62)",        sidebar:"#f7f7fb" },

  ];



  function setCSSVars(theme){

    const r = document.documentElement;

    r.style.setProperty("--a1", theme.a1.join(","));

    r.style.setProperty("--a2", theme.a2.join(","));

    r.style.setProperty("--bg0", theme.bg);

    r.style.setProperty("--glassBg", theme.glass);

    r.style.setProperty("--glassBorder", theme.border);

    r.style.setProperty("--textMain", theme.text);

    r.style.setProperty("--textMuted", theme.muted);

    r.style.setProperty("--sidebarBg", theme.sidebar);

  }



  function applyTheme(themeId){

    const t = THEMES.find(x=>x.id===themeId) || THEMES[0];

    setCSSVars(t);

    localStorage.setItem("zort_theme", t.id);

    // mode hint for light themes

    document.documentElement.dataset.mode = (t.bg || "").toLowerCase().startsWith("#f") ? "light" : "dark";

    document.querySelectorAll("[data-theme-card]").forEach(el=>{

      const on = el.dataset.themeCard === t.id;

      el.classList.toggle("ring-2", on);

      el.classList.toggle("ring-purple-400/40", on);

    });

  }



  function resetTheme(){

    localStorage.removeItem("zort_theme");

    localStorage.removeItem("zort_glow");

    localStorage.removeItem("zort_grid");

    localStorage.removeItem("zort_font");

    setUIRanges(60,55);

    setFontScale(100);

    applyTheme("purple");

  }



  function setUIRanges(glow, grid){

    document.documentElement.style.setProperty("--glow", String(glow));

    document.documentElement.style.setProperty("--grid", String(grid));

    localStorage.setItem("zort_glow", String(glow));

    localStorage.setItem("zort_grid", String(grid));



    const g = document.getElementById("glowRange");

    const gr = document.getElementById("gridRange");

    if(g) g.value = String(glow);

    if(gr) gr.value = String(grid);

  }



  function renderThemeGrid(){

    const grid = document.getElementById("themeGrid");

    if(!grid) return;

    grid.innerHTML = "";



    THEMES.forEach(t=>{

      const card = document.createElement("button");

      card.type = "button";

      card.dataset.themeCard = t.id;

      card.setAttribute("data-theme-card", "1");

      card.className =

        "glass rounded-2xl p-4 border border-white/10 text-left transition hover:bg-white/5 hover:border-white/20";

      card.innerHTML = `

        <div class="flex items-center justify-between gap-3">

          <div class="font-semibold text-white/90">${t.name}</div>

          <div class="flex items-center gap-2">

            <span class="w-4 h-4 rounded-full" style="background: rgb(${t.a1.join(",")}); box-shadow:0 0 18px rgba(${t.a1.join(",")},.35)"></span>

            <span class="w-4 h-4 rounded-full" style="background: rgb(${t.a2.join(",")}); box-shadow:0 0 18px rgba(${t.a2.join(",")},.25)"></span>

          </div>

        </div>

        <div class="mt-3 rounded-xl h-14 border border-white/10 overflow-hidden"

             style="background: radial-gradient(600px 180px at 30% 20%, rgba(${t.a1.join(",")},.28), transparent 60%),

                              radial-gradient(600px 180px at 70% 80%, rgba(${t.a2.join(",")},.20), transparent 60%),

                              ${t.bg};">

        </div>

      `;

      card.addEventListener("click", ()=>applyTheme(t.id));

      grid.appendChild(card);

    });



    // apply active ring after render

    applyTheme(localStorage.getItem("zort_theme") || "purple");

  }



  function initSettings(){

    renderThemeGrid();



    // sliders

    const glow = Number(localStorage.getItem("zort_glow") ?? 60);

    const grid = Number(localStorage.getItem("zort_grid") ?? 55);

    const font = Number(localStorage.getItem("zort_font") ?? 100);



    setUIRanges(glow, grid);

    setFontScale(font);



    const glowRange = document.getElementById("glowRange");

    const gridRange = document.getElementById("gridRange");

    const fontRange = document.getElementById("fontRange");



    if(glowRange) glowRange.addEventListener("input", e=>{

      setUIRanges(Number(e.target.value), Number(localStorage.getItem("zort_grid") ?? 55));

    });

    if(gridRange) gridRange.addEventListener("input", e=>{

      setUIRanges(Number(localStorage.getItem("zort_glow") ?? 60), Number(e.target.value));

    });

    if(fontRange){

      fontRange.value = String(font);

      fontRange.addEventListener("input", e=>setFontScale(Number(e.target.value)));

    }

  }



  function setFontScale(v){

    const vv = Math.min(115, Math.max(85, Number(v)||100));

    document.documentElement.style.setProperty("--fontScale", String(vv));

    localStorage.setItem("zort_font", String(vv));

  }



  initSettings();





  // boot

  loadScripts();



