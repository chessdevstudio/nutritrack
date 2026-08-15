"use strict";
/**
 * js/app.js
 * État de l'application, routeur, rendu et logique d'interaction.
 * S'appuie sur : data/foods.js, data/activities.js, data/menus.js,
 * js/calculations.js, js/storage.js (tous chargés avant ce fichier).
 */

const FoodsData = window.FoodsData;
const ActivitiesData = window.ActivitiesData;
const MenusData = window.MenusData;
const Calc = window.Calculations;
const Storage = window.Storage;

const { FOODS_DB, foodById, searchFoods } = FoodsData;
const { ACTIVITIES_DB, activityById, ACTIVITY_LEVELS, levelById } = ActivitiesData;
const { MENUS, MENU_CATS, menuById } = MenusData;

/* ============================================================
   UTIL
   ============================================================ */
function todayStr(){ return formatDateISO(new Date()); }
function formatDateISO(d){
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,"0"), day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function formatDateHuman(dateStr){
  const d = new Date(dateStr + "T00:00:00");
  const s = d.toLocaleDateString("fr-FR", {weekday:"long", day:"numeric", month:"long"});
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function formatDateShort(dateStr){
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("fr-FR", {day:"numeric", month:"short"});
}
function addDays(dateStr, n){
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return formatDateISO(d);
}
function addMonths(dateStr, n){
  const d = new Date(dateStr + "T00:00:00");
  d.setMonth(d.getMonth() + n);
  return formatDateISO(d);
}
function startOfWeek(dateStr){
  const d = new Date(dateStr + "T00:00:00");
  const day = (d.getDay() + 6) % 7; // lundi = 0
  d.setDate(d.getDate() - day);
  return formatDateISO(d);
}
function uid(){ return Math.random().toString(36).slice(2,10); }
function round(n){ return Math.round(n); }
function esc(s){ const d = document.createElement("div"); d.textContent = s == null ? "" : String(s); return d.innerHTML; }
function clamp(n,min,max){ return Math.min(max, Math.max(min, n)); }

function showToast(msg, icon, kind){
  const host = document.getElementById("toast-host");
  const el = document.createElement("div");
  el.className = "toast" + (kind === "warning" ? " toast-warning" : "");
  el.innerHTML = `<span class="checkpop">${icon||"✓"}</span><span>${esc(msg)}</span>`;
  host.innerHTML = "";
  host.appendChild(el);
  setTimeout(() => { el.remove(); }, 2600);
}

function downloadCSV(filename, rows){
  const csv = rows.map(r => r.map(cell => {
    const v = (cell === null || cell === undefined) ? "" : String(cell);
    return /[",;\n]/.test(v) ? `"${v.replace(/"/g,'""')}"` : v;
  }).join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], {type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* Résout un menu prédéfini OU une recette maison par id */
function getItemById(id){
  const menu = menuById(id);
  if(menu) return { ...menu, source:"menu" };
  const recipe = (Storage.getRecipes() || []).find(r => r.id === id);
  if(recipe) return { ...recipe, source:"recipe" };
  return null;
}

const CAT_LABELS = {"petit-dejeuner":"Petit-déjeuner","dejeuner":"Déjeuner","diner":"Dîner","collation":"Collation"};
const CAT_ICONS = {"petit-dejeuner":"🌅","dejeuner":"☀️","diner":"🌙","collation":"🍎"};

/* ============================================================
   STATE
   ============================================================ */
const State = {
  route: "dashboard",
  menusView: "suggestions", // suggestions | recettes | favoris
  menuCat: "petit-dejeuner",
  searchQuery: "",
  selectedDate: todayStr(),
  calendarMode: "semaine", // semaine | mois
  calendarView: "calendrier", // calendrier | historique
  calendarCursor: todayStr(),
  onboardStep: 1,
  onboardData: {age:null, sex:null, height:null, weight:null, activityLevel:null},
  activeMenuModal: null,
  activeActivityModal: false,
  activeCollationModal: false,
  activeWaterModal: false,
  editingProfile: false,
  lastAddedMealId: null,
  lastAddedActivityId: null,
  lastAddedWaterId: null,
  recipeDraft: null,
  collationDraft: null,
  savingLock: false
};

// Restaure la date sélectionnée si elle a été persistée (et reste valide)
(function restoreSelectedDate(){
  const saved = Storage.getSelectedDate();
  if(saved && saved <= todayStr()) State.selectedDate = saved;
})();

function navigate(route){
  State.route = route;
  render();
  window.scrollTo(0,0);
}

function setSelectedDate(dateStr){
  State.selectedDate = dateStr;
  Storage.setSelectedDate(dateStr);
}

/* ============================================================
   ICONS
   ============================================================ */
const ICONS = {
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10"/></svg>`,
  meal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`,
  activity: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
  calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="3"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  profile: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  leaf: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="24" height="24" style="color:var(--sage)"><path d="M11 20A7 7 0 0 1 4 13H2a10 10 0 0 0 10 10 10 10 0 0 0 10-10c0-5-4-10-11-10 3 3 3 7 0 10a5 5 0 0 1-7-7"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  water: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.5s7 7.2 7 12.2a7 7 0 0 1-14 0c0-5 7-12.2 7-12.2z"/></svg>`
};

/* ============================================================
   RENDER — SHELL
   ============================================================ */
function render(){
  const app = document.getElementById("app");
  if(!Storage.isOnboarded()){
    app.innerHTML = renderOnboarding();
    bindOnboarding();
    return;
  }

  let screenHtml = "";
  if(State.route === "dashboard") screenHtml = renderDashboard();
  else if(State.route === "menus") screenHtml = renderMenus();
  else if(State.route === "recette-nouvelle") screenHtml = renderRecipeBuilder();
  else if(State.route === "activite") screenHtml = renderActivite();
  else if(State.route === "hydratation") screenHtml = renderHydratation();
  else if(State.route === "calendrier") screenHtml = renderCalendrier();
  else if(State.route === "profil") screenHtml = renderProfil();

  const storageBanner = !Storage.isAvailable() ? `
    <div class="banner banner-warning">
      <span class="ico">⚠️</span>
      <span>Vos données ne peuvent pas être enregistrées sur cet appareil (navigation privée ou stockage plein). Elles seront perdues à la fermeture de l'onglet.</span>
    </div>` : "";

  app.innerHTML = `
    ${renderTopNav()}
    <main class="screen">${storageBanner}${screenHtml}</main>
    ${renderBottomNav()}
    ${State.activeMenuModal ? renderItemModal(State.activeMenuModal) : ""}
    ${State.activeActivityModal ? renderActivityModal() : ""}
    ${State.activeCollationModal ? renderCollationModal() : ""}
    ${State.activeWaterModal ? renderWaterModal() : ""}
  `;
  bindGlobalEvents();

  if(State.lastAddedMealId || State.lastAddedActivityId || State.lastAddedWaterId){
    setTimeout(() => { State.lastAddedMealId = null; State.lastAddedActivityId = null; State.lastAddedWaterId = null; }, 600);
  }
}

function renderTopNav(){
  const links = [
    {id:"dashboard", label:"Accueil"},
    {id:"menus", label:"Menus"},
    {id:"activite", label:"Activité"},
    {id:"hydratation", label:"Hydratation"},
    {id:"calendrier", label:"Calendrier"},
    {id:"profil", label:"Profil"}
  ];
  const activeRoute = (State.route === "recette-nouvelle") ? "menus" : State.route;
  return `
  <header class="topnav">
    <div class="brand">${ICONS.leaf}<span>Feuille</span></div>
    <nav class="topnav-links">
      ${links.map(l => `<a href="#" data-nav="${l.id}" class="${activeRoute===l.id?'active':''}">${l.label}</a>`).join("")}
    </nav>
  </header>`;
}

function renderBottomNav(){
  const items = [
    {id:"dashboard", label:"Accueil", icon:ICONS.home},
    {id:"menus", label:"Repas", icon:ICONS.meal},
    {id:"activite", label:"Activité", icon:ICONS.activity},
    {id:"hydratation", label:"Eau", icon:ICONS.water},
    {id:"calendrier", label:"Calendrier", icon:ICONS.calendar},
    {id:"profil", label:"Profil", icon:ICONS.profile}
  ];
  const activeRoute = (State.route === "recette-nouvelle") ? "menus" : State.route;
  return `
  <nav class="bottomnav">
    ${items.map(i => `
      <button data-nav="${i.id}" class="${activeRoute===i.id?'active':''}" aria-label="${i.label}">
        ${i.icon}<span>${i.label}</span>
      </button>`).join("")}
  </nav>`;
}

/* ============================================================
   ONBOARDING
   ============================================================ */
function renderOnboarding(){
  const step = State.onboardStep;
  const total = 4;
  let body = "";

  if(step === 1){
    body = `
      <span class="eyebrow">Étape 1 sur ${total}</span>
      <h1 class="h1" style="margin-top:8px;">Commençons par votre âge</h1>
      <p class="subtle" style="margin-top:8px;">Cette information nous aide à estimer votre besoin énergétique.</p>
      <div class="field" id="field-age" style="margin-top:28px;">
        <label for="input-age">Âge</label>
        <input type="number" id="input-age" inputmode="numeric" placeholder="Ex. 32" min="1" max="120" value="${State.onboardData.age ?? ""}">
        <div class="error-msg" style="display:none;"></div>
      </div>`;
  } else if(step === 2){
    body = `
      <span class="eyebrow">Étape 2 sur ${total}</span>
      <h1 class="h1" style="margin-top:8px;">Quelques informations supplémentaires</h1>
      <p class="subtle" style="margin-top:8px;">Utilisées uniquement pour affiner votre estimation.</p>
      <div class="field" style="margin-top:24px;">
        <label>Sexe (pour la formule de calcul)</label>
        <div class="choice-list">
          ${["homme","femme","autre"].map(v => `
            <button type="button" class="choice-card sex-choice ${State.onboardData.sex===v?'selected':''}" data-sex="${v}">
              <strong>${v==="homme"?"Homme":v==="femme"?"Femme":"Autre / je préfère ne pas dire"}</strong>
            </button>`).join("")}
        </div>
      </div>
      <div class="field" id="field-height">
        <label for="input-height">Taille (cm)</label>
        <input type="number" id="input-height" inputmode="numeric" placeholder="Ex. 170" value="${State.onboardData.height ?? ""}">
        <div class="error-msg" style="display:none;"></div>
      </div>
      <div class="field" id="field-weight">
        <label for="input-weight">Poids (kg)</label>
        <input type="number" id="input-weight" inputmode="numeric" placeholder="Ex. 68" value="${State.onboardData.weight ?? ""}">
        <div class="error-msg" style="display:none;"></div>
      </div>`;
  } else if(step === 3){
    body = `
      <span class="eyebrow">Étape 3 sur ${total}</span>
      <h1 class="h1" style="margin-top:8px;">À quoi ressemble votre activité quotidienne ?</h1>
      <div class="choice-list" style="margin-top:24px;">
        ${ACTIVITY_LEVELS.map(l => `
          <button type="button" class="choice-card level-choice ${State.onboardData.activityLevel===l.id?'selected':''}" data-level="${l.id}">
            <strong>${l.label}</strong>
            <span class="level-desc">${l.desc}</span>
          </button>`).join("")}
      </div>
      <div class="error-msg" id="level-error" style="display:none; margin-top:4px;">Veuillez choisir un niveau d'activité.</div>`;
  } else if(step === 4){
    const needs = Calc.calculateDailyEnergyNeeds({
      age: Number(State.onboardData.age),
      sex: State.onboardData.sex,
      height: Number(State.onboardData.height),
      weight: Number(State.onboardData.weight),
      activityLevel: State.onboardData.activityLevel
    });
    body = `
      <div class="result-ring-screen">
        <div class="result-badge">✨ Profil créé</div>
        <h1 class="h1">Votre besoin énergétique estimé</h1>
        <div class="ring-wrap" style="margin-top:28px;">
          <svg viewBox="0 0 172 172" width="172" height="172">
            <circle class="ring-bg" cx="86" cy="86" r="72"></circle>
            <circle class="ring-fg" cx="86" cy="86" r="72" stroke-dasharray="452" stroke-dashoffset="0"></circle>
          </svg>
          <div class="ring-center">
            <div class="num">≈ ${needs}</div>
            <div class="lbl">kcal / jour</div>
          </div>
        </div>
        <p class="subtle" style="margin-top:22px;">Cette estimation se recalcule automatiquement si vous modifiez votre profil.</p>
        <div class="disclaimer" style="text-align:left;">
          <span class="ico">ℹ️</span>
          <span>Les informations fournies par cette application sont des estimations générales et ne remplacent pas l'avis d'un professionnel de santé.</span>
        </div>
      </div>`;
  }

  const progressSegs = Array.from({length: total}, (_,i) => `<div class="seg ${i < step ? 'done':''}"></div>`).join("");

  return `
  <div class="onboard-shell">
    <div class="onboard-progress">${progressSegs}</div>
    <div class="onboard-body">${body}</div>
    <div class="onboard-nav">
      ${step > 1 ? `<button class="btn btn-secondary" id="ob-back">Retour</button>` : ""}
      ${step < 4 ? `<button class="btn btn-primary btn-block" id="ob-next">Continuer</button>` : `<button class="btn btn-primary btn-block" id="ob-finish">Découvrir mes menus</button>`}
    </div>
  </div>`;
}

function bindOnboarding(){
  const app = document.getElementById("app");
  app.querySelectorAll(".sex-choice").forEach(btn => btn.addEventListener("click", () => { State.onboardData.sex = btn.dataset.sex; render(); }));
  app.querySelectorAll(".level-choice").forEach(btn => btn.addEventListener("click", () => { State.onboardData.activityLevel = btn.dataset.level; render(); }));

  const back = document.getElementById("ob-back");
  if(back) back.addEventListener("click", () => { State.onboardStep--; render(); });
  const next = document.getElementById("ob-next");
  if(next) next.addEventListener("click", onboardValidateAndNext);
  const finish = document.getElementById("ob-finish");
  if(finish) finish.addEventListener("click", () => {
    const ok = Storage.setProfile({
      age: Number(State.onboardData.age), sex: State.onboardData.sex,
      height: Number(State.onboardData.height), weight: Number(State.onboardData.weight),
      activityLevel: State.onboardData.activityLevel
    });
    Storage.setOnboarded();
    State.route = "dashboard";
    render();
    if(!ok) showToast("Profil non sauvegardé (stockage indisponible sur cet appareil).", "⚠️", "warning");
  });
}

function fieldError(fieldId, msg){
  const field = document.getElementById(fieldId);
  if(!field) return;
  field.classList.add("has-error");
  const em = field.querySelector(".error-msg");
  if(em){ em.textContent = msg; em.style.display = "block"; }
}
function clearFieldError(fieldId){
  const field = document.getElementById(fieldId);
  if(!field) return;
  field.classList.remove("has-error");
  const em = field.querySelector(".error-msg");
  if(em) em.style.display = "none";
}

function onboardValidateAndNext(){
  const step = State.onboardStep;
  let valid = true;

  if(step === 1){
    const ageVal = document.getElementById("input-age").value.trim();
    const age = Number(ageVal);
    clearFieldError("field-age");
    if(!ageVal || isNaN(age) || age <= 0 || age > 120){
      fieldError("field-age", "Veuillez renseigner un âge valide.");
      valid = false;
    } else { State.onboardData.age = age; }
  }

  if(step === 2){
    clearFieldError("field-height"); clearFieldError("field-weight");
    const heightVal = Number(document.getElementById("input-height").value);
    const weightVal = Number(document.getElementById("input-weight").value);
    if(!heightVal || heightVal <= 0 || heightVal > 260){ fieldError("field-height", "Veuillez renseigner une taille valide."); valid = false; }
    else { State.onboardData.height = heightVal; }
    if(!weightVal || weightVal <= 0 || weightVal > 400){ fieldError("field-weight", "Indiquez votre poids pour effectuer l'estimation."); valid = false; }
    else { State.onboardData.weight = weightVal; }
    if(!State.onboardData.sex){ valid = false; showToast("Veuillez choisir une option.", "⚠️"); }
  }

  if(step === 3){
    if(!State.onboardData.activityLevel){ document.getElementById("level-error").style.display = "block"; valid = false; }
  }

  if(valid){ State.onboardStep++; render(); }
}

/* ============================================================
   DASHBOARD
   ============================================================ */
function renderDashboard(){
  const profile = Storage.getProfile();
  const day = Storage.getDay(State.selectedDate);
  const needs = Calc.calculateDailyEnergyNeeds(profile);
  const totals = Calc.calculateDailyTotal(day);
  const pct = Math.min(100, Math.round((totals.consumed / needs) * 100)) || 0;
  const circumference = 452;
  const offset = circumference - (circumference * Math.min(pct,100) / 100);

  const isToday = State.selectedDate === todayStr();
  const greeting = isToday ? "Bonjour 👋" : formatDateHuman(State.selectedDate);
  const mealsByCategory = groupMealsByCategory(day.meals);

  return `
    <div class="date-strip">
      <h2 class="h2">${greeting}</h2>
      <div style="display:flex; gap:6px;">
        <button class="nav-btn" id="date-prev" aria-label="Jour précédent">‹</button>
        ${!isToday ? `<button class="btn btn-ghost btn-sm" id="date-today">Aujourd'hui</button>` : ""}
        <button class="nav-btn" id="date-next" aria-label="Jour suivant" ${addDays(State.selectedDate,1) > todayStr() ? "disabled" : ""}>›</button>
      </div>
    </div>
    <p class="subtle" style="margin-bottom:18px;">${isToday ? "Votre journée" : "Résumé de la journée"}</p>

    <div class="hero-card">
      <div class="blob"></div>
      <div class="blob b2"></div>
      <div class="eyebrow">Besoin estimé</div>
      <div class="ring-wrap" style="margin-top:12px;">
        <svg viewBox="0 0 172 172" width="172" height="172">
          <circle class="ring-bg" cx="86" cy="86" r="72"></circle>
          <circle class="ring-fg" cx="86" cy="86" r="72" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"></circle>
        </svg>
        <div class="ring-center">
          <div class="num">${totals.consumed}</div>
          <div class="lbl">sur ≈ ${needs} kcal</div>
        </div>
      </div>
      <p class="tiny" style="margin-top:14px;">Comparaison avec votre estimation quotidienne — pas une limite à respecter.</p>
    </div>

    <div class="stat-grid">
      <div class="stat-box"><div class="stat-icon">🍽️</div><div class="stat-num">${totals.consumed}</div><div class="stat-lbl">kcal repas</div></div>
      <div class="stat-box"><div class="stat-icon">🔥</div><div class="stat-num">${totals.burned}</div><div class="stat-lbl">kcal activité</div></div>
      <div class="stat-box"><div class="stat-icon">🎯</div><div class="stat-num">≈ ${needs}</div><div class="stat-lbl">besoin estimé</div></div>
      <div class="stat-box"><div class="stat-icon">📊</div><div class="stat-num">${pct}%</div><div class="stat-lbl">de l'estimation</div></div>
    </div>

    <div class="section-block">
      <div class="section-head">
        <h3 class="h3">Repas</h3>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-secondary btn-sm" id="open-collation-modal-dash">+ Collation</button>
          <button class="btn btn-secondary btn-sm" data-nav="menus">+ Menu</button>
        </div>
      </div>
      ${renderMealsForDashboard(mealsByCategory)}
    </div>

    <div class="section-block">
      <div class="section-head">
        <h3 class="h3">Activité</h3>
        <button class="btn btn-secondary btn-sm" id="open-activity-modal">+ Ajouter</button>
      </div>
      ${day.activities && day.activities.length ? day.activities.map(a => renderActivityRow(a)).join("") : `
        <div class="empty-state">
          <div class="emoji">🏃</div>
          <p>Aucune activité enregistrée pour cette journée.</p>
          <button class="btn btn-primary btn-sm" id="open-activity-modal-2">+ Ajouter une activité</button>
        </div>`}
    </div>

    <div class="section-block">
      <div class="section-head">
        <h3 class="h3">Eau</h3>
        <a href="#" data-nav="hydratation" class="btn btn-ghost btn-sm">Voir tout</a>
      </div>
      ${renderWaterMiniCard(day, profile)}
    </div>

    <div style="display:flex; gap:10px; margin-top:18px;">
      <button class="btn btn-ghost btn-block" id="export-day-csv">⬇ Exporter (CSV)</button>
      <button class="btn btn-ghost btn-block" id="export-day-pdf">🖨 Exporter (PDF)</button>
    </div>

    <div class="disclaimer">
      <span class="ico">ℹ️</span>
      <span>Les informations fournies par cette application sont des estimations générales et ne remplacent pas l'avis d'un professionnel de santé.</span>
    </div>
  `;
}

function groupMealsByCategory(meals){
  const cats = {"petit-dejeuner":[], "dejeuner":[], "diner":[], "collation":[]};
  (meals||[]).forEach(m => { if(cats[m.category]) cats[m.category].push(m); else cats.collation.push(m); });
  return cats;
}

function renderMealsForDashboard(grouped){
  const cats = ["petit-dejeuner","dejeuner","diner","collation"];
  const anyMeal = cats.some(c => grouped[c].length);
  if(!anyMeal){
    return `
      <div class="empty-state">
        <div class="emoji">🍽️</div>
        <p>Aucun repas enregistré pour cette journée. Ajoutez un menu ou une collation pour commencer.</p>
        <button class="btn btn-primary btn-sm" data-nav="menus">+ Ajouter un repas</button>
      </div>`;
  }
  return cats.map(c => grouped[c].length ? grouped[c].map(m => renderMealRow(m)).join("") : "").join("");
}

function renderMealRow(m){
  const enter = (m.id === State.lastAddedMealId) ? " row-enter" : "";
  return `
  <div class="list-row${enter}" data-meal-row="${m.id}">
    <div class="row-main">
      <div class="row-icon">${CAT_ICONS[m.category]||"🍎"}</div>
      <div style="min-width:0;">
        <div class="row-title">${esc(m.name)}</div>
        <div class="row-sub">${CAT_LABELS[m.category]||"Collation"}${m.portions ? " · " + m.portions + (m.portions>1?" portions":" portion") : ""}</div>
      </div>
    </div>
    <div style="display:flex; align-items:center; gap:6px;">
      <div class="row-kcal">${round(m.kcal)} kcal</div>
      <button class="row-del" data-del-meal="${m.id}" aria-label="Supprimer ce repas">✕</button>
    </div>
  </div>`;
}

function renderActivityRow(a){
  const act = activityById(a.activityId);
  const enter = (a.id === State.lastAddedActivityId) ? " row-enter" : "";
  return `
  <div class="list-row${enter}" data-activity-row="${a.id}">
    <div class="row-main">
      <div class="row-icon">${act ? act.icon : "⭐"}</div>
      <div style="min-width:0;">
        <div class="row-title">${esc(a.name)}</div>
        <div class="row-sub">${a.duration} min</div>
      </div>
    </div>
    <div style="display:flex; align-items:center; gap:6px;">
      <div class="row-kcal">≈ ${round(a.kcal)} kcal</div>
      <button class="row-del" data-del-activity="${a.id}" aria-label="Supprimer cette activité">✕</button>
    </div>
  </div>`;
}

/* ============================================================
   MENUS (suggestions / mes recettes / favoris / recherche)
   ============================================================ */
function renderMenus(){
  const q = State.searchQuery.trim();

  const searchBar = `
    <div class="search-bar">
      <span class="ico">${ICONS.search}</span>
      <input type="text" id="global-search-input" placeholder="Rechercher un repas, un aliment ou une recette..." value="${esc(q)}">
    </div>`;

  if(q){
    return `<h1 class="h1">Menus</h1>${searchBar}${renderSearchResults(q)}`;
  }

  const tabs = [
    {id:"suggestions", label:"Suggestions"},
    {id:"recettes", label:"Mes recettes"},
    {id:"favoris", label:"Favoris"}
  ];

  let content = "";
  if(State.menusView === "suggestions") content = renderSuggestionsTab();
  else if(State.menusView === "recettes") content = renderMyRecipesTab();
  else if(State.menusView === "favoris") content = renderFavoritesTab();

  return `
    <h1 class="h1">Menus</h1>
    ${searchBar}
    <div class="segmented" style="margin-top:4px;">
      ${tabs.map(t => `<button data-menus-view="${t.id}" class="${State.menusView===t.id?'active':''}">${t.label}</button>`).join("")}
    </div>
    <div style="margin-top:18px;">${content}</div>
  `;
}

function renderSuggestionsTab(){
  const profile = Storage.getProfile();
  const needs = Calc.calculateDailyEnergyNeeds(profile);
  const items = MENUS.filter(m => m.cat === State.menuCat);
  const ranges = {
    "petit-dejeuner": [Math.round(needs*0.20), Math.round(needs*0.28)],
    "dejeuner": [Math.round(needs*0.32), Math.round(needs*0.40)],
    "diner": [Math.round(needs*0.28), Math.round(needs*0.36)]
  };
  const r = ranges[State.menuCat];
  return `
    <p class="subtle">Suggestions calculées à partir de votre besoin estimé (≈ ${needs} kcal/jour).</p>
    <div class="menu-cat-scroller" style="margin-top:16px;">
      ${MENU_CATS.map(c => `<button class="menu-cat-pill ${State.menuCat===c.id?'active':''}" data-menu-cat="${c.id}">${c.icon} ${c.label}</button>`).join("")}
    </div>
    <p class="tiny" style="margin-bottom:6px;">Repère indicatif pour ce repas : ≈ ${r[0]}–${r[1]} kcal. Ces répartitions sont un paramètre modifiable, pas une règle universelle.</p>
    <div class="recipe-grid">${items.map(m => renderRecipeCard(m, "menu")).join("")}</div>
  `;
}

function renderMyRecipesTab(){
  const recipes = Storage.getRecipes() || [];
  return `
    <div class="section-head">
      <h3 class="h3">Mes recettes</h3>
      <button class="btn btn-primary btn-sm" data-nav="recette-nouvelle">+ Créer une recette</button>
    </div>
    ${recipes.length === 0 ? `
      <div class="empty-state">
        <div class="emoji">👩‍🍳</div>
        <p>Aucune recette pour le moment. Créez votre première recette maison et calculez automatiquement son apport énergétique.</p>
        <button class="btn btn-primary btn-sm" data-nav="recette-nouvelle">+ Créer une recette</button>
      </div>` : `
      <div class="recipe-grid">
        ${recipes.map(r => renderRecipeCard({...r, emoji: r.emoji || "🍽️", time: r.time || 0, difficulty: r.difficulty || "Personnalisée"}, "recipe")).join("")}
      </div>`}
  `;
}

function renderFavoritesTab(){
  const favs = Storage.getFavorites() || [];
  const items = favs.map(f => getItemById(f.id)).filter(Boolean);
  return `
    <h3 class="h3" style="margin-bottom:14px;">Favoris</h3>
    ${items.length === 0 ? `
      <div class="empty-state">
        <div class="emoji">🤍</div>
        <p>Vos menus et recettes favoris apparaîtront ici. Touchez le cœur sur une carte pour l'ajouter.</p>
      </div>` : `
      <div class="recipe-grid">${items.map(m => renderRecipeCard(m, m.source)).join("")}</div>`}
  `;
}

function isFavorite(id){
  return (Storage.getFavorites() || []).some(f => f.id === id);
}

function renderRecipeCard(m, source){
  const totals = Calc.calculateRecipeTotals(m.ingredients);
  const fav = isFavorite(m.id);
  return `
  <div class="recipe-card">
    <button type="button" class="card-fav-btn ${fav?'active':''}" data-toggle-fav="${m.id}" aria-label="${fav?'Retirer des favoris':'Ajouter aux favoris'}">${fav?"♥":"♡"}</button>
    <button type="button" style="all:unset; display:block; width:100%; cursor:pointer;" data-open-item="${m.id}">
      <div class="thumb">${m.emoji || "🍽️"}</div>
      <div class="body">
        <div class="title">${esc(m.name)}</div>
        <div class="kcal">≈ ${round(totals.kcal)} kcal${m.portions ? " · " + m.portions + " portions" : ""}</div>
        <div class="macro-row">
          <span class="macro-pill">🥩 ${round(totals.protein)} g</span>
          <span class="macro-pill">🌾 ${round(totals.carbs)} g</span>
          <span class="macro-pill">🥑 ${round(totals.fat)} g</span>
        </div>
        <div class="meta">${m.time ? `<span>⏱ ${m.time} min</span><span>·</span>` : ""}<span>${m.difficulty || ""}</span></div>
        <span class="btn btn-secondary btn-sm btn-block">Voir la recette</span>
      </div>
    </button>
    ${source === "recipe" ? `<div style="padding:0 16px 14px;"><button class="btn btn-ghost btn-sm btn-block" data-del-recipe="${m.id}">Supprimer cette recette</button></div>` : ""}
  </div>`;
}

/* ---------------- Search ---------------- */
function renderSearchResults(q){
  const lc = q.toLowerCase();
  const menuResults = MENUS.filter(m => m.name.toLowerCase().includes(lc));
  const recipeResults = (Storage.getRecipes()||[]).filter(r => r.name.toLowerCase().includes(lc));
  const foodResults = searchFoods(q).slice(0, 12);

  const groups = [];
  if(menuResults.length) groups.push(`
    <div class="search-results-group"><h3 class="h3">Menus</h3>
      <div class="recipe-grid">${menuResults.map(m => renderRecipeCard(m,"menu")).join("")}</div>
    </div>`);
  if(recipeResults.length) groups.push(`
    <div class="search-results-group"><h3 class="h3">Recettes</h3>
      <div class="recipe-grid">${recipeResults.map(r => renderRecipeCard(r,"recipe")).join("")}</div>
    </div>`);
  if(foodResults.length) groups.push(`
    <div class="search-results-group"><h3 class="h3">Aliments</h3>
      <div class="card-flat">
        ${foodResults.map(f => `<div class="profile-row"><span class="lbl">${esc(f.name)}</span><span class="val">${f.kcal} kcal / 100 g</span></div>`).join("")}
      </div>
    </div>`);

  if(!groups.length){
    return `<div class="empty-state" style="margin-top:18px;"><div class="emoji">🔎</div><p>Aucun résultat pour « ${esc(q)} ».</p></div>`;
  }
  return groups.join("");
}

/* ============================================================
   ITEM MODAL (menu prédéfini ou recette) — ajout à la journée
   ============================================================ */
function renderItemModal(itemId){
  const m = getItemById(itemId);
  if(!m) return "";
  const totals = Calc.calculateRecipeTotals(m.ingredients);
  const perPortion = m.portions ? Calc.calculateCaloriesPerPortion(totals, m.portions) : totals;
  const needsCategory = !m.cat;

  return `
  <div class="overlay" id="menu-overlay">
    <div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(m.name)}" style="position:relative;">
      <button class="sheet-close" id="close-menu-modal" aria-label="Fermer">✕</button>
      <div class="sheet-handle"></div>
      <div style="font-size:44px; text-align:center; margin-bottom:6px;">${m.emoji || "🍽️"}</div>
      <h2 class="h2" style="text-align:center;">${esc(m.name)}</h2>
      <div style="text-align:center; margin-top:6px;">
        ${m.time ? `<span class="badge">⏱ ${m.time} min</span>` : ""}
        <span class="badge">${m.difficulty || "Personnalisée"}</span>
        ${m.portions ? `<span class="badge">${m.portions} portions (recette)</span>` : ""}
      </div>

      <div class="stat-grid" style="margin-top:20px; grid-template-columns:repeat(4,1fr);">
        <div class="stat-box"><div class="stat-num">${round(m.portions ? perPortion.kcal : totals.kcal)}</div><div class="stat-lbl">kcal${m.portions?" / portion":""}</div></div>
        <div class="stat-box"><div class="stat-num">${round(m.portions ? perPortion.protein : totals.protein)}g</div><div class="stat-lbl">protéines</div></div>
        <div class="stat-box"><div class="stat-num">${round(m.portions ? perPortion.carbs : totals.carbs)}g</div><div class="stat-lbl">glucides</div></div>
        <div class="stat-box"><div class="stat-num">${round(m.portions ? perPortion.fat : totals.fat)}g</div><div class="stat-lbl">lipides</div></div>
      </div>

      <div class="section-block">
        <h3 class="h3">Ingrédients</h3>
        <div class="card-flat" style="margin-top:10px;">
          ${m.ingredients.map(ing => {
            const f = foodById(ing.food);
            return `<div class="profile-row"><span class="lbl">${f?esc(f.name):esc(ing.food)}</span><span class="val">${ing.g} g</span></div>`;
          }).join("")}
        </div>
      </div>

      ${m.steps && m.steps.length ? `
      <div class="section-block">
        <h3 class="h3">Préparation</h3>
        <ol style="margin-top:10px; padding-left:20px; display:flex; flex-direction:column; gap:10px;">
          ${m.steps.map(s => `<li class="subtle">${esc(s)}</li>`).join("")}
        </ol>
      </div>` : ""}

      ${needsCategory ? `
      <div class="field" style="margin-top:22px;">
        <label for="item-category-select">Catégorie de repas</label>
        <select id="item-category-select">
          <option value="petit-dejeuner">Petit-déjeuner</option>
          <option value="dejeuner" selected>Déjeuner</option>
          <option value="diner">Dîner</option>
          <option value="collation">Collation</option>
        </select>
      </div>` : ""}

      <div class="field" style="margin-top:${needsCategory?0:22}px;">
        <label for="portion-input">Portions à ajouter à votre journée</label>
        <div style="display:flex; align-items:center; gap:12px;">
          <button class="btn btn-secondary" id="portion-minus" aria-label="Diminuer">−</button>
          <input type="number" id="portion-input" value="1" min="0.5" step="0.5" style="width:80px; text-align:center; border:1.5px solid var(--border); border-radius:14px; padding:12px; font-size:16px;">
          <button class="btn btn-secondary" id="portion-plus" aria-label="Augmenter">+</button>
        </div>
        <div class="error-msg" id="portion-error" style="display:none;"></div>
      </div>

      <button class="btn btn-primary btn-block" id="add-meal-to-day" data-menu-id="${m.id}">
        <span class="btn-label">Ajouter à ma journée</span>
      </button>
    </div>
  </div>`;
}

/* ============================================================
   RECIPE BUILDER — "Créer mon plat"
   ============================================================ */
function ensureRecipeDraft(){
  if(!State.recipeDraft){
    State.recipeDraft = { name:"", portions:4, ingredients:[{food:null, g:100}] };
  }
  return State.recipeDraft;
}

function foodsDatalist(){
  return `<datalist id="foods-datalist">${FOODS_DB.map(f => `<option value="${esc(f.name)}"></option>`).join("")}</datalist>`;
}

function renderIngredientRows(ingredients, rowPrefix){
  return ingredients.map((ing, idx) => {
    const food = ing.food ? foodById(ing.food) : null;
    return `
    <div class="ingredient-row" data-${rowPrefix}-row="${idx}">
      <input type="text" list="foods-datalist" placeholder="Aliment..." value="${food ? esc(food.name) : ''}" data-${rowPrefix}-food="${idx}">
      <input type="number" min="1" placeholder="g" value="${ing.g || ''}" data-${rowPrefix}-qty="${idx}">
      <button type="button" class="rm-ing" data-${rowPrefix}-remove="${idx}" aria-label="Supprimer cet ingrédient">✕</button>
    </div>`;
  }).join("");
}

function renderRecipeBuilder(){
  const draft = ensureRecipeDraft();
  const totals = Calc.calculateRecipeTotals(draft.ingredients);
  const perPortion = Calc.calculateCaloriesPerPortion(totals, Number(draft.portions) || 1);

  return `
    ${foodsDatalist()}
    <h1 class="h1">Créer mon plat</h1>
    <p class="subtle" style="margin-top:6px;">Renseignez les ingrédients et leur quantité — les calories sont calculées automatiquement, jamais estimées à la main.</p>

    <div class="field" style="margin-top:22px;" id="rb-field-name">
      <label for="rb-name">Nom du plat</label>
      <input type="text" id="rb-name" placeholder="Ex. Gratin de légumes" value="${esc(draft.name)}">
      <div class="error-msg" style="display:none;"></div>
    </div>

    <div class="field">
      <label>Ingrédients</label>
      <div id="rb-ingredients">${renderIngredientRows(draft.ingredients, "rb")}</div>
      <button type="button" class="btn btn-secondary btn-sm" id="rb-add-ingredient">+ Ajouter un ingrédient</button>
      <div class="error-msg" id="rb-ing-error" style="display:none; margin-top:8px;"></div>
    </div>

    <div class="field" id="rb-field-portions" style="max-width:200px;">
      <label for="rb-portions">Nombre de portions</label>
      <input type="number" id="rb-portions" min="1" step="1" value="${draft.portions}">
      <div class="error-msg" style="display:none;"></div>
    </div>

    <div class="card-flat" style="margin-top:6px;">
      <div class="eyebrow">Total de la recette</div>
      <div class="builder-summary" style="margin-top:8px;">
        <div><strong>${round(totals.kcal)}</strong> kcal</div>
        <div class="tiny">🥩 ${round(totals.protein)} g</div>
        <div class="tiny">🌾 ${round(totals.carbs)} g</div>
        <div class="tiny">🥑 ${round(totals.fat)} g</div>
      </div>
      <div class="eyebrow" style="margin-top:14px;">Par portion</div>
      <div class="h2" style="margin-top:4px;">≈ ${round(perPortion.kcal)} kcal</div>
    </div>

    <div style="display:flex; gap:10px; margin-top:20px;">
      <button class="btn btn-secondary btn-block" id="rb-cancel">Annuler</button>
      <button class="btn btn-primary btn-block" id="rb-save"><span class="btn-label">Enregistrer la recette</span></button>
    </div>
  `;
}

/* ============================================================
   ACTIVITÉ
   ============================================================ */
function renderActivite(){
  const day = Storage.getDay(State.selectedDate);
  const totals = Calc.calculateDailyTotal(day);
  return `
    <h1 class="h1">Activité</h1>
    <p class="subtle" style="margin-top:6px;">${formatDateHuman(State.selectedDate)}${State.selectedDate===todayStr() ? " · Aujourd'hui" : ""}</p>

    <div class="card" style="margin-top:18px; text-align:center;">
      <div class="eyebrow">Total dépensé aujourd'hui</div>
      <div class="h1" style="margin-top:6px;">≈ ${totals.burned} kcal</div>
      <p class="tiny" style="margin-top:6px;">Estimation basée sur votre poids, l'activité sélectionnée et sa durée.</p>
    </div>

    <button class="btn btn-primary btn-block" style="margin-top:20px;" id="open-activity-modal-main">+ Ajouter une activité</button>

    <div class="section-block">
      <h3 class="h3">Activités du jour</h3>
      <div style="margin-top:12px;">
        ${day.activities && day.activities.length ? day.activities.map(a => renderActivityRow(a)).join("") : `
        <div class="empty-state">
          <div class="emoji">🏃</div>
          <p>Aucune activité enregistrée pour le moment.</p>
        </div>`}
      </div>
    </div>
  `;
}

function renderActivityModal(){
  return `
  <div class="overlay" id="activity-overlay">
    <div class="sheet" role="dialog" aria-modal="true" aria-label="Ajouter une activité" style="position:relative;">
      <button class="sheet-close" id="close-activity-modal" aria-label="Fermer">✕</button>
      <div class="sheet-handle"></div>
      <h2 class="h2">Ajouter une activité</h2>

      <div class="field" style="margin-top:18px;">
        <label>Type d'activité</label>
        <div class="choice-list" id="activity-type-list">
          ${ACTIVITIES_DB.map(a => `
            <button type="button" class="choice-card activity-choice" data-activity="${a.id}">
              <strong>${a.icon}&nbsp;&nbsp;${a.name}</strong>
            </button>`).join("")}
        </div>
      </div>

      <div class="field" id="field-duration">
        <label for="input-duration">Durée (minutes)</label>
        <input type="number" id="input-duration" inputmode="numeric" placeholder="Ex. 30" min="1">
        <div class="error-msg" style="display:none;"></div>
      </div>

      <div class="field" id="field-intensity" style="display:none;">
        <label>Intensité</label>
        <div class="segmented">
          <button type="button" class="intensity-choice active" data-intensity="leger">Légère</button>
          <button type="button" class="intensity-choice" data-intensity="modere">Modérée</button>
          <button type="button" class="intensity-choice" data-intensity="intense">Intense</button>
        </div>
      </div>

      <div class="card-flat" id="activity-preview" style="display:none; text-align:center; margin-bottom:18px;">
        <div class="eyebrow">Estimation</div>
        <div class="h2" id="activity-preview-kcal" style="margin-top:4px;">≈ 0 kcal</div>
      </div>

      <button class="btn btn-primary btn-block" id="confirm-add-activity" disabled><span class="btn-label">Ajouter à ma journée</span></button>
    </div>
  </div>`;
}

/* ============================================================
   COLLATION (ajout rapide, à base d'aliments réels)
   ============================================================ */
function ensureCollationDraft(){
  if(!State.collationDraft){
    State.collationDraft = { name:"", ingredients:[{food:null, g:100}] };
  }
  return State.collationDraft;
}

function renderCollationModal(){
  const draft = ensureCollationDraft();
  const totals = Calc.calculateRecipeTotals(draft.ingredients);
  return `
  <div class="overlay" id="collation-overlay">
    <div class="sheet" role="dialog" aria-modal="true" aria-label="Ajouter une collation" style="position:relative;">
      <button class="sheet-close" id="close-collation-modal" aria-label="Fermer">✕</button>
      <div class="sheet-handle"></div>
      ${foodsDatalist()}
      <h2 class="h2">Ajouter une collation</h2>
      <p class="subtle" style="margin-top:6px;">Choisissez un ou plusieurs aliments — les calories sont calculées à partir des quantités.</p>

      <div class="field" style="margin-top:18px;">
        <label for="col-name">Nom (facultatif)</label>
        <input type="text" id="col-name" placeholder="Ex. Fruit, poignée d'amandes..." value="${esc(draft.name)}">
      </div>

      <div class="field">
        <label>Aliments</label>
        <div id="col-ingredients">${renderIngredientRows(draft.ingredients, "col")}</div>
        <button type="button" class="btn btn-secondary btn-sm" id="col-add-ingredient">+ Ajouter un aliment</button>
        <div class="error-msg" id="col-ing-error" style="display:none; margin-top:8px;"></div>
      </div>

      <div class="card-flat" style="text-align:center;">
        <div class="eyebrow">Estimation</div>
        <div class="h2" id="col-total-kcal" style="margin-top:4px;">≈ ${round(totals.kcal)} kcal</div>
      </div>

      <button class="btn btn-primary btn-block" style="margin-top:18px;" id="confirm-add-collation"><span class="btn-label">Ajouter à ma journée</span></button>
    </div>
  </div>`;
}

/* ============================================================
   HYDRATATION
   Besoin estimé = poids × 33 ml/kg + bonus selon le niveau d'activité
   du profil + bonus selon les calories brûlées ce jour-là (activités enregistrées).
   ============================================================ */
const WATER_QUICK_AMOUNTS = [
  {ml:150, label:"Verre", icon:"🥛"},
  {ml:250, label:"Grand verre", icon:"🥤"},
  {ml:500, label:"Bouteille", icon:"🍶"}
];

function getWaterNeedsForDay(profile, day){
  const totals = Calc.calculateDailyTotal(day);
  return Calc.calculateWaterNeeds({
    weight: profile.weight,
    activityLevel: profile.activityLevel,
    activityCaloriesToday: totals.burned
  });
}

function formatLiters(ml){
  const l = ml / 1000;
  // Affiche au plus 2 décimales, sans zéros inutiles (1.20 -> 1.2, 2.00 -> 2)
  return (Math.round(l * 100) / 100).toString().replace(/\.0$/, "");
}

function renderWaterMiniCard(day, profile){
  const totals = Calc.calculateDailyTotal(day);
  const needs = getWaterNeedsForDay(profile, day);
  const pct = Math.min(100, Math.round((totals.water / needs) * 100)) || 0;
  return `
    <div class="card-flat">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
        <div>
          <div class="h3" style="display:flex; align-items:center; gap:6px;">💧 ${formatLiters(totals.water)} L</div>
          <div class="tiny">sur ≈ ${formatLiters(needs)} L estimés</div>
        </div>
        <div class="tiny" style="font-weight:700; color:var(--sage-dark);">${pct}%</div>
      </div>
      <div class="progress-bar"><div class="progress-bar-fill" style="width:${pct}%;"></div></div>
      <div style="display:flex; gap:8px; margin-top:14px;">
        ${WATER_QUICK_AMOUNTS.map(q => `<button class="btn btn-secondary btn-sm" data-quick-water="${q.ml}"><span class="btn-label">${q.icon} +${q.ml >= 1000 ? (q.ml/1000)+'L' : q.ml+'ml'}</span></button>`).join("")}
      </div>
    </div>`;
}

function renderWaterRow(w){
  const enter = (w.id === State.lastAddedWaterId) ? " row-enter" : "";
  return `
  <div class="list-row${enter}" data-water-row="${w.id}">
    <div class="row-main">
      <div class="row-icon">💧</div>
      <div style="min-width:0;">
        <div class="row-title">${w.ml >= 1000 ? (w.ml/1000)+' L' : w.ml+' ml'}</div>
        <div class="row-sub">${w.time || ''}</div>
      </div>
    </div>
    <button class="row-del" data-del-water="${w.id}" aria-label="Supprimer cette boisson">✕</button>
  </div>`;
}

function renderHydratation(){
  const profile = Storage.getProfile();
  const day = Storage.getDay(State.selectedDate);
  const totals = Calc.calculateDailyTotal(day);
  const needs = getWaterNeedsForDay(profile, day);
  const pct = Math.min(100, Math.round((totals.water / needs) * 100)) || 0;
  const circumference = 452;
  const offset = circumference - (circumference * Math.min(pct,100) / 100);
  const isToday = State.selectedDate === todayStr();

  // Moyenne des 7 derniers jours pour donner un repère
  const last7 = Array.from({length:7}, (_,i) => addDays(todayStr(), -(6-i)));
  const avgWater = Math.round(last7.reduce((s,d) => s + Calc.calculateDailyTotal(Storage.getDay(d)).water, 0) / 7);

  return `
    <h1 class="h1">Hydratation</h1>
    <p class="subtle" style="margin-top:6px;">${formatDateHuman(State.selectedDate)}${isToday ? " · Aujourd'hui" : ""}</p>

    <div class="hero-card" style="margin-top:16px;">
      <div class="blob" style="background:var(--blue-light);"></div>
      <div class="blob b2"></div>
      <div class="eyebrow">Besoin en eau estimé</div>
      <div class="ring-wrap" style="margin-top:12px;">
        <svg viewBox="0 0 172 172" width="172" height="172">
          <circle class="ring-bg" cx="86" cy="86" r="72"></circle>
          <circle class="ring-fg" cx="86" cy="86" r="72" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" style="stroke:var(--blue);"></circle>
        </svg>
        <div class="ring-center">
          <div class="num">${formatLiters(totals.water)} L</div>
          <div class="lbl">sur ≈ ${formatLiters(needs)} L</div>
        </div>
      </div>
      <p class="tiny" style="margin-top:14px;">Calculé à partir de votre poids, votre niveau d'activité et l'activité enregistrée ce jour-là.</p>
    </div>

    <div class="stat-grid">
      <div class="stat-box"><div class="stat-icon">💧</div><div class="stat-num">${totals.water}</div><div class="stat-lbl">ml bu</div></div>
      <div class="stat-box"><div class="stat-icon">🎯</div><div class="stat-num">${needs}</div><div class="stat-lbl">ml estimés</div></div>
      <div class="stat-box"><div class="stat-icon">📊</div><div class="stat-num">${pct}%</div><div class="stat-lbl">de l'estimation</div></div>
      <div class="stat-box"><div class="stat-icon">📅</div><div class="stat-num">${avgWater}</div><div class="stat-lbl">ml moy. 7j</div></div>
    </div>

    <div class="section-block">
      <h3 class="h3">Ajout rapide</h3>
      <div style="display:flex; gap:8px; margin-top:12px; flex-wrap:wrap;">
        ${WATER_QUICK_AMOUNTS.map(q => `<button class="btn btn-secondary" data-quick-water="${q.ml}"><span class="btn-label">${q.icon} +${q.ml >= 1000 ? (q.ml/1000)+'L' : q.ml+'ml'}</span></button>`).join("")}
        <button class="btn btn-ghost" id="open-water-modal">✎ Quantité personnalisée</button>
      </div>
    </div>

    <div class="section-block">
      <h3 class="h3">Boissons enregistrées</h3>
      <div style="margin-top:12px;">
        ${day.water && day.water.length ? day.water.map(w => renderWaterRow(w)).join("") : `
        <div class="empty-state">
          <div class="emoji">💧</div>
          <p>Aucune boisson enregistrée pour cette journée.</p>
        </div>`}
      </div>
    </div>

    <div class="disclaimer">
      <span class="ico">ℹ️</span>
      <span>Les informations fournies par cette application sont des estimations générales et ne remplacent pas l'avis d'un professionnel de santé.</span>
    </div>
  `;
}

function renderWaterModal(){
  return `
  <div class="overlay" id="water-overlay">
    <div class="sheet" role="dialog" aria-modal="true" aria-label="Ajouter une quantité d'eau" style="position:relative;">
      <button class="sheet-close" id="close-water-modal" aria-label="Fermer">✕</button>
      <div class="sheet-handle"></div>
      <h2 class="h2">Quantité personnalisée</h2>
      <div class="field" style="margin-top:18px;" id="field-water-ml">
        <label for="input-water-ml">Quantité (ml)</label>
        <input type="number" id="input-water-ml" inputmode="numeric" placeholder="Ex. 330" min="1">
        <div class="error-msg" style="display:none;"></div>
      </div>
      <button class="btn btn-primary btn-block" id="confirm-add-water"><span class="btn-label">Ajouter à ma journée</span></button>
    </div>
  </div>`;
}

/* ============================================================
   CALENDRIER + HISTORIQUE
   ============================================================ */
function renderCalendrier(){
  const tabs = [{id:"calendrier", label:"Calendrier"},{id:"historique", label:"Historique"}];
  let content = State.calendarView === "calendrier" ? renderCalendarView() : renderHistoriqueView();
  return `
    <h1 class="h1">Calendrier</h1>
    <div class="segmented" style="margin-top:14px;">
      ${tabs.map(t => `<button data-calendar-view="${t.id}" class="${State.calendarView===t.id?'active':''}">${t.label}</button>`).join("")}
    </div>
    <div style="margin-top:18px;">${content}</div>
  `;
}

function dayHasData(dateStr){
  const d = Storage.getDay(dateStr);
  return (d.meals && d.meals.length) || (d.activities && d.activities.length);
}

function renderCalendarView(){
  const modes = [{id:"semaine",label:"Semaine"},{id:"mois",label:"Mois"}];
  const modeSwitch = `
    <div class="segmented" style="margin-bottom:16px;">
      ${modes.map(m => `<button data-calendar-mode="${m.id}" class="${State.calendarMode===m.id?'active':''}">${m.label}</button>`).join("")}
    </div>`;

  if(State.calendarMode === "semaine"){
    const start = startOfWeek(State.calendarCursor);
    const days = Array.from({length:7}, (_,i) => addDays(start,i));
    const dayLabels = ["L","M","M","J","V","S","D"];
    return `
      ${modeSwitch}
      <div class="cal-header">
        <button class="nav-btn" id="week-prev" aria-label="Semaine précédente">‹</button>
        <div class="cal-title">${formatDateShort(days[0])} – ${formatDateShort(days[6])}</div>
        <button class="nav-btn" id="week-next" aria-label="Semaine suivante" ${addDays(days[6],1) > todayStr() ? "disabled" : ""}>›</button>
      </div>
      <div class="week-strip">
        ${days.map((d,i) => {
          const has = dayHasData(d);
          const isSel = d === State.selectedDate;
          const future = d > todayStr();
          return `<button class="week-day ${isSel?'selected':''}" data-cal-select-day="${d}" ${future?'disabled':''}>
            <span>${dayLabels[i]}</span><span class="dnum">${new Date(d+"T00:00:00").getDate()}</span><span class="dot ${has?'':'empty'}"></span>
          </button>`;
        }).join("")}
      </div>
      ${renderDaySummaryCard(State.selectedDate)}
    `;
  }

  // mode mois
  const cursor = State.calendarCursor;
  const d = new Date(cursor + "T00:00:00");
  const year = d.getFullYear(), month = d.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7; // lundi=0
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const monthLabel = firstOfMonth.toLocaleDateString("fr-FR", {month:"long", year:"numeric"});

  let cells = "";
  for(let i=0;i<startOffset;i++) cells += `<div class="month-cell empty-cell"></div>`;
  for(let day=1; day<=daysInMonth; day++){
    const dateStr = formatDateISO(new Date(year, month, day));
    const has = dayHasData(dateStr);
    const isToday = dateStr === todayStr();
    const isSel = dateStr === State.selectedDate;
    const future = dateStr > todayStr();
    cells += `<button class="month-cell ${isToday?'today':''} ${isSel?'selected':''}" data-cal-select-day="${dateStr}" ${future?'disabled':''}>
      <span>${day}</span><span class="dot" style="${has?'':'background:transparent;'}"></span>
    </button>`;
  }

  return `
    ${modeSwitch}
    <div class="cal-header">
      <button class="nav-btn" id="month-prev" aria-label="Mois précédent">‹</button>
      <div class="cal-title" style="text-transform:capitalize;">${monthLabel}</div>
      <button class="nav-btn" id="month-next" aria-label="Mois suivant" ${addMonths(cursor,1) > todayStr() ? "disabled" : ""}>›</button>
    </div>
    <div class="month-grid">
      ${["L","M","M","J","V","S","D"].map(l => `<div class="month-daylabel">${l}</div>`).join("")}
      ${cells}
    </div>
    ${renderDaySummaryCard(State.selectedDate)}
  `;
}

function renderDaySummaryCard(dateStr){
  const day = Storage.getDay(dateStr);
  const totals = Calc.calculateDailyTotal(day);
  const grouped = groupMealsByCategory(day.meals);
  const hasAny = dayHasData(dateStr);

  if(!hasAny){
    return `
      <div class="empty-state" style="margin-top:18px;">
        <div class="emoji">📭</div>
        <p>Aucune donnée enregistrée pour le ${formatDateShort(dateStr)}.</p>
      </div>`;
  }

  return `
    <div class="card" style="margin-top:18px;">
      <div class="eyebrow">${formatDateHuman(dateStr)}</div>
      <div class="stat-grid" style="grid-template-columns:1fr 1fr; margin-top:12px;">
        <div class="stat-box"><div class="stat-icon">🍽️</div><div class="stat-num">${totals.consumed}</div><div class="stat-lbl">kcal repas</div></div>
        <div class="stat-box"><div class="stat-icon">🔥</div><div class="stat-num">${totals.burned}</div><div class="stat-lbl">kcal activité</div></div>
      </div>
      ${["petit-dejeuner","dejeuner","diner","collation"].map(c => grouped[c].length ? `
        <div style="margin-top:14px;">
          <div class="tiny" style="font-weight:700; margin-bottom:6px;">${CAT_LABELS[c]}</div>
          ${grouped[c].map(m => `<div class="profile-row"><span class="lbl">${esc(m.name)}</span><span class="val">${round(m.kcal)} kcal</span></div>`).join("")}
        </div>` : "").join("")}
      ${day.activities && day.activities.length ? `
        <div style="margin-top:14px;">
          <div class="tiny" style="font-weight:700; margin-bottom:6px;">Activités</div>
          ${day.activities.map(a => `<div class="profile-row"><span class="lbl">${esc(a.name)}</span><span class="val">${a.duration} min · ${round(a.kcal)} kcal</span></div>`).join("")}
        </div>` : ""}
      <button class="btn btn-ghost btn-sm btn-block" id="goto-dashboard-from-cal" style="margin-top:14px;">Ouvrir dans le tableau de bord</button>
    </div>
  `;
}

function renderHistoriqueView(){
  const allDays = Storage.getAllDays();
  const stats = Calc.calculateMonthlyStats(allDays);

  const last14 = Array.from({length:14}, (_,i) => addDays(todayStr(), -(13-i)));
  const dayTotals = last14.map(d => Calc.calculateDailyTotal(Storage.getDay(d)));
  const maxVal = Math.max(1, ...dayTotals.map(t => Math.max(t.consumed, t.burned)));

  if(stats.daysRecorded === 0){
    return `
      <div class="empty-state">
        <div class="emoji">📊</div>
        <p>Votre historique apparaîtra ici lorsque vous commencerez à enregistrer vos journées.</p>
      </div>`;
  }

  return `
    <div class="stat-grid">
      <div class="stat-box"><div class="stat-num">${stats.daysRecorded}</div><div class="stat-lbl">jours enregistrés</div></div>
      <div class="stat-box"><div class="stat-num">${stats.mealsCount}</div><div class="stat-lbl">repas enregistrés</div></div>
      <div class="stat-box"><div class="stat-num">${stats.avgConsumed}</div><div class="stat-lbl">moy. kcal repas</div></div>
      <div class="stat-box"><div class="stat-num">${stats.avgBurned}</div><div class="stat-lbl">moy. kcal activité</div></div>
    </div>

    <div class="section-block">
      <h3 class="h3">14 derniers jours</h3>
      <div class="card-flat bar-chart-wrap" style="margin-top:12px;">
        <div class="bar-chart">
          ${last14.map((d,i) => {
            const t = dayTotals[i];
            const hC = Math.round((t.consumed / maxVal) * 100);
            const hB = Math.round((t.burned / maxVal) * 100);
            const lbl = new Date(d+"T00:00:00").toLocaleDateString("fr-FR",{day:"numeric",month:"numeric"});
            return `
            <div class="bar-col">
              <div style="display:flex; align-items:flex-end; gap:2px; height:100%; width:100%; justify-content:center;">
                <div class="bar" style="height:${hC}%;" title="${t.consumed} kcal repas"></div>
                <div class="bar burned" style="height:${hB}%;" title="${t.burned} kcal activité"></div>
              </div>
              <div class="bar-lbl">${lbl}</div>
            </div>`;
          }).join("")}
        </div>
        <div class="legend-row">
          <span><span class="legend-dot" style="background:var(--sage);"></span>Repas</span>
          <span><span class="legend-dot" style="background:var(--blue);"></span>Activité</span>
        </div>
      </div>
    </div>

    <div style="display:flex; gap:10px; margin-top:20px;">
      <button class="btn btn-ghost btn-block" id="export-week-csv">⬇ CSV (14 jours)</button>
      <button class="btn btn-ghost btn-block" id="export-week-pdf">🖨 PDF (14 jours)</button>
    </div>
  `;
}

/* ============================================================
   PROFIL
   ============================================================ */
function renderProfil(){
  const p = Storage.getProfile();
  const needs = Calc.calculateDailyEnergyNeeds(p);
  const level = levelById(p.activityLevel);

  if(State.editingProfile){
    return `
      <h1 class="h1">Modifier mon profil</h1>
      <div class="field" id="pf-field-age" style="margin-top:20px;">
        <label for="pf-age">Âge</label>
        <input type="number" id="pf-age" value="${p.age}">
        <div class="error-msg" style="display:none;"></div>
      </div>
      <div class="field">
        <label>Sexe (pour la formule de calcul)</label>
        <div class="choice-list">
          ${["homme","femme","autre"].map(v => `
            <button type="button" class="choice-card pf-sex-choice ${p.sex===v?'selected':''}" data-sex="${v}">
              <strong>${v==="homme"?"Homme":v==="femme"?"Femme":"Autre / je préfère ne pas dire"}</strong>
            </button>`).join("")}
        </div>
      </div>
      <div class="field" id="pf-field-height">
        <label for="pf-height">Taille (cm)</label>
        <input type="number" id="pf-height" value="${p.height}">
        <div class="error-msg" style="display:none;"></div>
      </div>
      <div class="field" id="pf-field-weight">
        <label for="pf-weight">Poids (kg)</label>
        <input type="number" id="pf-weight" value="${p.weight}">
        <div class="error-msg" style="display:none;"></div>
      </div>
      <div class="field">
        <label>Niveau d'activité</label>
        <div class="choice-list">
          ${ACTIVITY_LEVELS.map(l => `
            <button type="button" class="choice-card pf-level-choice ${p.activityLevel===l.id?'selected':''}" data-level="${l.id}">
              <strong>${l.label}</strong><span class="level-desc">${l.desc}</span>
            </button>`).join("")}
        </div>
      </div>
      <div style="display:flex; gap:10px; margin-top:8px;">
        <button class="btn btn-secondary btn-block" id="pf-cancel">Annuler</button>
        <button class="btn btn-primary btn-block" id="pf-save"><span class="btn-label">Enregistrer</span></button>
      </div>
    `;
  }

  return `
    <h1 class="h1">Profil</h1>
    <div class="hero-card" style="margin-top:18px;">
      <div class="blob"></div>
      <div class="eyebrow">Besoin énergétique estimé</div>
      <div class="h1" style="margin-top:6px;">≈ ${needs} kcal / jour</div>
    </div>

    <div class="card" style="margin-top:18px;">
      <div class="profile-row"><span class="lbl">Âge</span><span class="val">${p.age} ans</span></div>
      <div class="profile-row"><span class="lbl">Sexe</span><span class="val">${p.sex==="homme"?"Homme":p.sex==="femme"?"Femme":"Autre"}</span></div>
      <div class="profile-row"><span class="lbl">Taille</span><span class="val">${p.height} cm</span></div>
      <div class="profile-row"><span class="lbl">Poids</span><span class="val">${p.weight} kg</span></div>
      <div class="profile-row"><span class="lbl">Niveau d'activité</span><span class="val">${level ? level.label : "—"}</span></div>
    </div>

    <button class="btn btn-primary btn-block" style="margin-top:18px;" id="pf-edit">Modifier mon profil</button>

    <div class="disclaimer">
      <span class="ico">ℹ️</span>
      <span>Les informations fournies par cette application sont des estimations générales et ne remplacent pas l'avis d'un professionnel de santé.</span>
    </div>

    <div class="section-block">
      <h3 class="h3">À venir</h3>
      <p class="subtle" style="margin-top:8px;">Compte utilisateur, synchronisation cloud et notifications sont prévus dans une prochaine version.</p>
    </div>
  `;
}

/* ============================================================
   EVENT BINDING — GLOBAL
   ============================================================ */
function bindGlobalEvents(){
  const app = document.getElementById("app");

  app.querySelectorAll("[data-nav]").forEach(el => {
    el.addEventListener("click", (e) => { e.preventDefault(); navigate(el.dataset.nav); });
  });

  // Dashboard date navigation
  const prev = document.getElementById("date-prev");
  if(prev) prev.addEventListener("click", () => { setSelectedDate(addDays(State.selectedDate,-1)); render(); });
  const next = document.getElementById("date-next");
  if(next) next.addEventListener("click", () => {
    const n = addDays(State.selectedDate,1);
    if(n <= todayStr()){ setSelectedDate(n); render(); }
  });
  const todayBtn = document.getElementById("date-today");
  if(todayBtn) todayBtn.addEventListener("click", () => { setSelectedDate(todayStr()); render(); });

  // Delete meal / activity
  app.querySelectorAll("[data-del-meal]").forEach(btn => {
    btn.addEventListener("click", () => {
      const day = Storage.getDay(State.selectedDate);
      day.meals = day.meals.filter(m => m.id !== btn.dataset.delMeal);
      Storage.setDay(State.selectedDate, day);
      showToast("Repas supprimé", "🗑️");
      render();
    });
  });
  app.querySelectorAll("[data-del-activity]").forEach(btn => {
    btn.addEventListener("click", () => {
      const day = Storage.getDay(State.selectedDate);
      day.activities = day.activities.filter(a => a.id !== btn.dataset.delActivity);
      Storage.setDay(State.selectedDate, day);
      showToast("Activité supprimée", "🗑️");
      render();
    });
  });
  app.querySelectorAll("[data-del-water]").forEach(btn => {
    btn.addEventListener("click", () => {
      const day = Storage.getDay(State.selectedDate);
      day.water = day.water.filter(w => w.id !== btn.dataset.delWater);
      Storage.setDay(State.selectedDate, day);
      showToast("Boisson supprimée", "🗑️");
      render();
    });
  });

  // Eau : ajout rapide (150 / 250 / 500 ml)
  app.querySelectorAll("[data-quick-water]").forEach(btn => {
    btn.addEventListener("click", () => {
      if(State.savingLock) return;
      setButtonSaving(btn, true);
      addWaterEntry(Number(btn.dataset.quickWater), btn);
    });
  });

  // Export CSV
  const exportDay = document.getElementById("export-day-csv");
  if(exportDay) exportDay.addEventListener("click", () => exportDayCSV(State.selectedDate));
  const exportWeek = document.getElementById("export-week-csv");
  if(exportWeek) exportWeek.addEventListener("click", exportLast14DaysCSV);

  // Export PDF (impression, sans dépendance externe)
  const printDay = document.getElementById("export-day-pdf");
  if(printDay) printDay.addEventListener("click", () => printRange(State.selectedDate, State.selectedDate));
  const printWeek = document.getElementById("export-week-pdf");
  if(printWeek) printWeek.addEventListener("click", () => printRange(addDays(todayStr(),-13), todayStr()));

  // Menus: search
  const searchInput = document.getElementById("global-search-input");
  if(searchInput){
    searchInput.addEventListener("input", () => { State.searchQuery = searchInput.value; render(); });
    // Keep focus & caret position after re-render
    searchInput.focus();
    searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
  }

  // Menus tabs
  app.querySelectorAll("[data-menus-view]").forEach(btn => {
    btn.addEventListener("click", () => { State.menusView = btn.dataset.menusView; render(); });
  });
  app.querySelectorAll("[data-menu-cat]").forEach(btn => {
    btn.addEventListener("click", () => { State.menuCat = btn.dataset.menuCat; render(); });
  });

  // Favorites toggle
  app.querySelectorAll("[data-toggle-fav]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.toggleFav;
      let favs = Storage.getFavorites() || [];
      if(favs.some(f => f.id === id)){
        favs = favs.filter(f => f.id !== id);
        showToast("Retiré des favoris", "♡");
      } else {
        favs.push({id});
        showToast("Ajouté aux favoris", "♥");
      }
      Storage.setFavorites(favs);
      render();
    });
  });

  // Delete a user recipe
  app.querySelectorAll("[data-del-recipe]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.delRecipe;
      const recipes = (Storage.getRecipes()||[]).filter(r => r.id !== id);
      Storage.setRecipes(recipes);
      let favs = (Storage.getFavorites()||[]).filter(f => f.id !== id);
      Storage.setFavorites(favs);
      showToast("Recette supprimée", "🗑️");
      render();
    });
  });

  // Open item modal (menu or recipe)
  app.querySelectorAll("[data-open-item]").forEach(btn => {
    btn.addEventListener("click", () => { State.activeMenuModal = btn.dataset.openItem; render(); });
  });
  const closeMenuModal = document.getElementById("close-menu-modal");
  if(closeMenuModal) closeMenuModal.addEventListener("click", () => { State.activeMenuModal = null; render(); });
  const menuOverlay = document.getElementById("menu-overlay");
  if(menuOverlay) menuOverlay.addEventListener("click", (e) => { if(e.target === menuOverlay){ State.activeMenuModal = null; render(); } });

  bindPortionControls();
  bindAddMealButton();

  // Recipe builder
  const rbCancel = document.getElementById("rb-cancel");
  if(rbCancel) rbCancel.addEventListener("click", () => { State.recipeDraft = null; navigate("menus"); });
  bindRecipeBuilderEvents();

  // Activity modal
  ["open-activity-modal","open-activity-modal-2","open-activity-modal-main"].forEach(id => {
    const b = document.getElementById(id);
    if(b) b.addEventListener("click", () => { State.activeActivityModal = true; render(); });
  });
  const closeActivityModal = document.getElementById("close-activity-modal");
  if(closeActivityModal) closeActivityModal.addEventListener("click", () => { State.activeActivityModal = false; render(); });
  const activityOverlay = document.getElementById("activity-overlay");
  if(activityOverlay) activityOverlay.addEventListener("click", (e) => { if(e.target === activityOverlay){ State.activeActivityModal = false; render(); } });
  bindActivityModalLogic();

  // Collation modal
  ["open-collation-modal-dash"].forEach(id => {
    const b = document.getElementById(id);
    if(b) b.addEventListener("click", () => { State.collationDraft = null; State.activeCollationModal = true; render(); });
  });
  const closeCollationModal = document.getElementById("close-collation-modal");
  if(closeCollationModal) closeCollationModal.addEventListener("click", () => { State.activeCollationModal = false; render(); });
  const collationOverlay = document.getElementById("collation-overlay");
  if(collationOverlay) collationOverlay.addEventListener("click", (e) => { if(e.target === collationOverlay){ State.activeCollationModal = false; render(); } });
  bindCollationModalEvents();

  // Eau : modal quantité personnalisée
  const openWaterModal = document.getElementById("open-water-modal");
  if(openWaterModal) openWaterModal.addEventListener("click", () => { State.activeWaterModal = true; render(); });
  const closeWaterModal = document.getElementById("close-water-modal");
  if(closeWaterModal) closeWaterModal.addEventListener("click", () => { State.activeWaterModal = false; render(); });
  const waterOverlay = document.getElementById("water-overlay");
  if(waterOverlay) waterOverlay.addEventListener("click", (e) => { if(e.target === waterOverlay){ State.activeWaterModal = false; render(); } });
  const confirmWaterBtn = document.getElementById("confirm-add-water");
  if(confirmWaterBtn) confirmWaterBtn.addEventListener("click", () => {
    if(State.savingLock) return;
    const input = document.getElementById("input-water-ml");
    const ml = Number(input.value);
    clearFieldError("field-water-ml");
    if(!ml || ml <= 0){
      fieldError("field-water-ml", "Veuillez renseigner une quantité supérieure à 0.");
      return;
    }
    addWaterEntry(ml, confirmWaterBtn, () => { State.activeWaterModal = false; });
  });

  // Calendar
  app.querySelectorAll("[data-calendar-view]").forEach(btn => {
    btn.addEventListener("click", () => { State.calendarView = btn.dataset.calendarView; render(); });
  });
  app.querySelectorAll("[data-calendar-mode]").forEach(btn => {
    btn.addEventListener("click", () => { State.calendarMode = btn.dataset.calendarMode; render(); });
  });
  app.querySelectorAll("[data-cal-select-day]").forEach(btn => {
    btn.addEventListener("click", () => { setSelectedDate(btn.dataset.calSelectDay); render(); });
  });
  const weekPrev = document.getElementById("week-prev");
  if(weekPrev) weekPrev.addEventListener("click", () => { State.calendarCursor = addDays(State.calendarCursor,-7); render(); });
  const weekNext = document.getElementById("week-next");
  if(weekNext) weekNext.addEventListener("click", () => { State.calendarCursor = addDays(State.calendarCursor,7); render(); });
  const monthPrev = document.getElementById("month-prev");
  if(monthPrev) monthPrev.addEventListener("click", () => { State.calendarCursor = addMonths(State.calendarCursor,-1); render(); });
  const monthNext = document.getElementById("month-next");
  if(monthNext) monthNext.addEventListener("click", () => { State.calendarCursor = addMonths(State.calendarCursor,1); render(); });
  const gotoDash = document.getElementById("goto-dashboard-from-cal");
  if(gotoDash) gotoDash.addEventListener("click", () => navigate("dashboard"));

  // Profile
  const pfEdit = document.getElementById("pf-edit");
  if(pfEdit) pfEdit.addEventListener("click", () => { State.editingProfile = true; render(); });
  const pfCancel = document.getElementById("pf-cancel");
  if(pfCancel) pfCancel.addEventListener("click", () => { State.editingProfile = false; render(); });
  const pfSave = document.getElementById("pf-save");
  if(pfSave) pfSave.addEventListener("click", saveProfileEdits);
  app.querySelectorAll(".pf-sex-choice").forEach(btn => {
    btn.addEventListener("click", () => { const p = Storage.getProfile(); p.sex = btn.dataset.sex; Storage.setProfile(p); render(); });
  });
  app.querySelectorAll(".pf-level-choice").forEach(btn => {
    btn.addEventListener("click", () => { const p = Storage.getProfile(); p.activityLevel = btn.dataset.level; Storage.setProfile(p); render(); });
  });
}

/* ---------------- Portion controls (item modal) ---------------- */
function bindPortionControls(){
  const input = document.getElementById("portion-input");
  if(!input) return;
  const minus = document.getElementById("portion-minus");
  const plus = document.getElementById("portion-plus");
  minus.addEventListener("click", () => { input.value = Math.max(0.5, (Number(input.value)||1) - 0.5); });
  plus.addEventListener("click", () => { input.value = (Number(input.value)||1) + 0.5; });
}

function setButtonSaving(btn, saving){
  const label = btn.querySelector(".btn-label");
  if(saving){
    btn.disabled = true;
    btn.dataset.originalLabel = label ? label.textContent : btn.textContent;
    if(label) label.innerHTML = `<span class="spinner"></span> Enregistrement…`;
  }
}

/* ---------------- Add meal from item modal ---------------- */
function bindAddMealButton(){
  const btn = document.getElementById("add-meal-to-day");
  if(!btn) return;
  btn.addEventListener("click", () => {
    if(State.savingLock) return;
    const itemId = btn.dataset.menuId;
    const item = getItemById(itemId);
    const portionsInput = document.getElementById("portion-input");
    const portions = Number(portionsInput.value);
    const errBox = document.getElementById("portion-error");
    const catSelect = document.getElementById("item-category-select");

    if(!portions || portions <= 0){
      errBox.textContent = "Veuillez renseigner une quantité supérieure à 0.";
      errBox.style.display = "block";
      return;
    }
    errBox.style.display = "none";
    State.savingLock = true;
    setButtonSaving(btn, true);

    setTimeout(() => {
      const totals = Calc.calculateRecipeTotals(item.ingredients);
      const category = item.cat || (catSelect ? catSelect.value : "dejeuner");
      const day = Storage.getDay(State.selectedDate);
      day.meals = day.meals || [];
      const newMeal = {
        id: uid(), name: item.name, category, portions,
        kcal: totals.kcal * portions, protein: totals.protein * portions,
        carbs: totals.carbs * portions, fat: totals.fat * portions
      };
      day.meals.push(newMeal);
      const ok = Storage.setDay(State.selectedDate, day);
      State.activeMenuModal = null;
      State.lastAddedMealId = newMeal.id;
      State.route = "dashboard";
      State.savingLock = false;
      render();
      showToast(ok ? "Repas ajouté à votre journée" : "Repas ajouté (non sauvegardé — stockage indisponible)", ok ? "✓" : "⚠️", ok ? undefined : "warning");
    }, 420);
  });
}

/* ---------------- Ingredient row editor (shared: recipe builder + collation) ---------------- */
function bindIngredientRowEditor(prefix, getDraft, containerId, addBtnId, errorId){
  const container = document.getElementById(containerId);
  if(!container) return;

  container.querySelectorAll(`[data-${prefix}-food]`).forEach(input => {
    input.addEventListener("change", () => {
      const idx = Number(input.dataset[prefix + "Food"] !== undefined ? input.getAttribute(`data-${prefix}-food`) : 0);
      const draft = getDraft();
      const match = FOODS_DB.find(f => f.name.toLowerCase() === input.value.trim().toLowerCase());
      draft.ingredients[idx].food = match ? match.id : null;
      render();
    });
  });
  container.querySelectorAll(`[data-${prefix}-qty]`).forEach(input => {
    input.addEventListener("input", () => {
      const idx = Number(input.getAttribute(`data-${prefix}-qty`));
      const draft = getDraft();
      draft.ingredients[idx].g = Number(input.value) || 0;
      render();
    });
  });
  container.querySelectorAll(`[data-${prefix}-remove]`).forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.getAttribute(`data-${prefix}-remove`));
      const draft = getDraft();
      if(draft.ingredients.length <= 1){
        draft.ingredients[idx] = {food:null, g:100};
      } else {
        draft.ingredients.splice(idx,1);
      }
      render();
    });
  });

  const addBtn = document.getElementById(addBtnId);
  if(addBtn){
    addBtn.addEventListener("click", () => {
      const draft = getDraft();
      draft.ingredients.push({food:null, g:100});
      render();
    });
  }
}

/* ---------------- Recipe builder events ---------------- */
function bindRecipeBuilderEvents(){
  const nameInput = document.getElementById("rb-name");
  if(!nameInput) return; // pas sur cette page

  nameInput.addEventListener("input", () => { ensureRecipeDraft().name = nameInput.value; });
  const portionsInput = document.getElementById("rb-portions");
  portionsInput.addEventListener("input", () => { ensureRecipeDraft().portions = Number(portionsInput.value) || 1; render(); });

  bindIngredientRowEditor("rb", ensureRecipeDraft, "rb-ingredients", "rb-add-ingredient", "rb-ing-error");

  const saveBtn = document.getElementById("rb-save");
  saveBtn.addEventListener("click", () => {
    if(State.savingLock) return;
    const draft = ensureRecipeDraft();
    clearFieldError("rb-field-name");
    document.getElementById("rb-ing-error").style.display = "none";

    let valid = true;
    if(!draft.name || !draft.name.trim()){
      fieldError("rb-field-name", "Veuillez donner un nom à votre recette.");
      valid = false;
    }
    const validIngredients = draft.ingredients.filter(ing => ing.food && ing.g > 0);
    if(validIngredients.length === 0){
      const eb = document.getElementById("rb-ing-error");
      eb.textContent = "Ajoutez au moins un aliment reconnu avec une quantité supérieure à 0.";
      eb.style.display = "block";
      valid = false;
    }
    if(!draft.portions || draft.portions <= 0){
      fieldError("rb-field-portions", "Veuillez renseigner un nombre de portions valide.");
      valid = false;
    }
    if(!valid) return;

    State.savingLock = true;
    setButtonSaving(saveBtn, true);

    setTimeout(() => {
      const recipes = Storage.getRecipes() || [];
      const newRecipe = {
        id: "r_" + uid(), name: draft.name.trim(), emoji:"🍽️",
        portions: Number(draft.portions), ingredients: validIngredients, steps: []
      };
      recipes.push(newRecipe);
      const ok = Storage.setRecipes(recipes);
      State.recipeDraft = null;
      State.menusView = "recettes";
      State.savingLock = false;
      navigate("menus");
      showToast(ok ? "Recette enregistrée" : "Recette enregistrée (non sauvegardée — stockage indisponible)", ok ? "✓" : "⚠️", ok ? undefined : "warning");
    }, 420);
  });
}

/* ---------------- Activity modal events ---------------- */
function bindActivityModalLogic(){
  const list = document.getElementById("activity-type-list");
  if(!list) return;

  let selectedActivity = null;
  const durationInput = document.getElementById("input-duration");
  const intensityField = document.getElementById("field-intensity");
  const preview = document.getElementById("activity-preview");
  const previewKcal = document.getElementById("activity-preview-kcal");
  const confirmBtn = document.getElementById("confirm-add-activity");
  let selectedIntensity = "modere";

  function needsIntensity(id){ return ["marche","course","velo","natation","danse"].includes(id); }

  function updatePreview(){
    const profile = Storage.getProfile();
    const duration = Number(durationInput.value);
    if(!selectedActivity || !duration || duration <= 0){
      preview.style.display = "none";
      confirmBtn.disabled = true;
      return;
    }
    const act = activityById(selectedActivity);
    const kcal = Calc.calculateBurnedCalories({weight: profile.weight, met: act.met, durationMin: duration, intensity: selectedIntensity});
    previewKcal.textContent = `≈ ${round(kcal)} kcal`;
    preview.style.display = "block";
    confirmBtn.disabled = false;
  }

  list.querySelectorAll(".activity-choice").forEach(btn => {
    btn.addEventListener("click", () => {
      selectedActivity = btn.dataset.activity;
      list.querySelectorAll(".activity-choice").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      intensityField.style.display = needsIntensity(selectedActivity) ? "block" : "none";
      updatePreview();
    });
  });
  durationInput.addEventListener("input", updatePreview);
  document.querySelectorAll(".intensity-choice").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".intensity-choice").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedIntensity = btn.dataset.intensity;
      updatePreview();
    });
  });

  confirmBtn.addEventListener("click", () => {
    if(State.savingLock) return;
    const duration = Number(durationInput.value);
    if(!selectedActivity){ showToast("Choisissez un type d'activité.", "⚠️"); return; }
    if(!duration || duration <= 0){ fieldError("field-duration", "Veuillez renseigner une durée valide."); return; }

    State.savingLock = true;
    setButtonSaving(confirmBtn, true);

    setTimeout(() => {
      const profile = Storage.getProfile();
      const act = activityById(selectedActivity);
      const kcal = Calc.calculateBurnedCalories({weight: profile.weight, met: act.met, durationMin: duration, intensity: selectedIntensity});
      const day = Storage.getDay(State.selectedDate);
      day.activities = day.activities || [];
      const newActivity = { id: uid(), activityId: selectedActivity, name: act.name, duration, kcal };
      day.activities.push(newActivity);
      const ok = Storage.setDay(State.selectedDate, day);
      State.activeActivityModal = false;
      State.lastAddedActivityId = newActivity.id;
      State.savingLock = false;
      render();
      showToast(ok ? "Activité ajoutée à votre journée" : "Activité ajoutée (non sauvegardée)", ok ? "✓" : "⚠️", ok ? undefined : "warning");
    }, 420);
  });
}

/* ---------------- Collation modal events ---------------- */
function bindCollationModalEvents(){
  const nameInput = document.getElementById("col-name");
  if(!nameInput) return;

  nameInput.addEventListener("input", () => { ensureCollationDraft().name = nameInput.value; });
  bindIngredientRowEditor("col", ensureCollationDraft, "col-ingredients", "col-add-ingredient", "col-ing-error");

  const confirmBtn = document.getElementById("confirm-add-collation");
  confirmBtn.addEventListener("click", () => {
    if(State.savingLock) return;
    const draft = ensureCollationDraft();
    const validIngredients = draft.ingredients.filter(ing => ing.food && ing.g > 0);
    const errBox = document.getElementById("col-ing-error");
    if(validIngredients.length === 0){
      errBox.textContent = "Ajoutez au moins un aliment reconnu avec une quantité supérieure à 0.";
      errBox.style.display = "block";
      return;
    }
    errBox.style.display = "none";

    State.savingLock = true;
    setButtonSaving(confirmBtn, true);

    setTimeout(() => {
      const totals = Calc.calculateRecipeTotals(validIngredients);
      const day = Storage.getDay(State.selectedDate);
      day.meals = day.meals || [];
      const newMeal = {
        id: uid(), name: draft.name.trim() || "Collation", category:"collation", portions:null,
        kcal: totals.kcal, protein: totals.protein, carbs: totals.carbs, fat: totals.fat
      };
      day.meals.push(newMeal);
      const ok = Storage.setDay(State.selectedDate, day);
      State.activeCollationModal = false;
      State.collationDraft = null;
      State.lastAddedMealId = newMeal.id;
      State.savingLock = false;
      render();
      showToast(ok ? "Collation ajoutée à votre journée" : "Collation ajoutée (non sauvegardée)", ok ? "✓" : "⚠️", ok ? undefined : "warning");
    }, 420);
  });
}

/* ---------------- Eau : ajout d'une entrée ---------------- */
function addWaterEntry(ml, btn, onDone){
  if(State.savingLock) return;
  State.savingLock = true;
  if(btn) setButtonSaving(btn, true);

  setTimeout(() => {
    const day = Storage.getDay(State.selectedDate);
    day.water = day.water || [];
    const now = new Date();
    const timeLabel = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    const newEntry = { id: uid(), ml: ml, time: timeLabel };
    day.water.push(newEntry);
    const ok = Storage.setDay(State.selectedDate, day);
    State.lastAddedWaterId = newEntry.id;
    State.savingLock = false;
    if(onDone) onDone();
    render();
    showToast(ok ? "Boisson ajoutée à votre journée" : "Boisson ajoutée (non sauvegardée — stockage indisponible)", ok ? "✓" : "⚠️", ok ? undefined : "warning");
  }, 420);
}

/* ---------------- Profile edits ---------------- */
function saveProfileEdits(){
  const p = Storage.getProfile();
  clearFieldError("pf-field-age"); clearFieldError("pf-field-height"); clearFieldError("pf-field-weight");

  const age = Number(document.getElementById("pf-age").value);
  const height = Number(document.getElementById("pf-height").value);
  const weight = Number(document.getElementById("pf-weight").value);
  let valid = true;
  if(!age || age <= 0 || age > 120){ fieldError("pf-field-age","Veuillez renseigner un âge valide."); valid = false; }
  if(!height || height <= 0 || height > 260){ fieldError("pf-field-height","Veuillez renseigner une taille valide."); valid = false; }
  if(!weight || weight <= 0 || weight > 400){ fieldError("pf-field-weight","Indiquez votre poids pour effectuer l'estimation."); valid = false; }
  if(!valid) return;

  const btn = document.getElementById("pf-save");
  setButtonSaving(btn, true);
  setTimeout(() => {
    p.age = age; p.height = height; p.weight = weight;
    const ok = Storage.setProfile(p);
    State.editingProfile = false;
    render();
    showToast(ok ? "Profil mis à jour" : "Profil mis à jour (non sauvegardé)", ok ? "✓" : "⚠️", ok ? undefined : "warning");
  }, 380);
}

/* ---------------- CSV export ---------------- */
function exportDayCSV(dateStr){
  const day = Storage.getDay(dateStr);
  const totals = Calc.calculateDailyTotal(day);
  const rows = [
    ["Feuille — Export journalier"],
    ["Date", dateStr],
    [],
    ["Repas","Catégorie","Portions","Calories (kcal)"]
  ];
  (day.meals||[]).forEach(m => rows.push([m.name, CAT_LABELS[m.category]||m.category, m.portions||"-", round(m.kcal)]));
  rows.push([]);
  rows.push(["Activité","Durée (min)","Calories dépensées (kcal)"]);
  (day.activities||[]).forEach(a => rows.push([a.name, a.duration, round(a.kcal)]));
  rows.push([]);
  rows.push(["Total repas (kcal)", totals.consumed]);
  rows.push(["Total activité (kcal)", totals.burned]);
  downloadCSV(`feuille_${dateStr}.csv`, rows);
  showToast("Export CSV téléchargé", "⬇");
}

function exportLast14DaysCSV(){
  const days = Array.from({length:14}, (_,i) => addDays(todayStr(), -(13-i)));
  const rows = [["Date","Calories repas (kcal)","Calories activité (kcal)","Repas enregistrés","Activités enregistrées"]];
  days.forEach(d => {
    const day = Storage.getDay(d);
    const t = Calc.calculateDailyTotal(day);
    rows.push([d, t.consumed, t.burned, (day.meals||[]).length, (day.activities||[]).length]);
  });
  downloadCSV(`feuille_14_derniers_jours.csv`, rows);
  showToast("Export CSV téléchargé", "⬇");
}

/* ---------------- PDF export (impression navigateur, sans dépendance) ---------------- */
function printRange(startDate, endDate){
  const dates = [];
  let cur = startDate;
  while(cur <= endDate){ dates.push(cur); cur = addDays(cur, 1); }

  const profile = Storage.getProfile();
  const needs = Calc.calculateDailyEnergyNeeds(profile);

  const sections = dates.map(d => {
    const day = Storage.getDay(d);
    const totals = Calc.calculateDailyTotal(day);
    const grouped = groupMealsByCategory(day.meals);
    const hasAny = (day.meals && day.meals.length) || (day.activities && day.activities.length);
    if(!hasAny){
      return `<section><h2>${esc(formatDateHuman(d))}</h2><p class="muted">Aucune donnée enregistrée.</p></section>`;
    }
    const mealsHtml = ["petit-dejeuner","dejeuner","diner","collation"].map(c => grouped[c].length ? `
      <div class="grp"><strong>${CAT_LABELS[c]}</strong>
        <ul>${grouped[c].map(m => `<li>${esc(m.name)} — ${round(m.kcal)} kcal</li>`).join("")}</ul>
      </div>` : "").join("");
    const actHtml = (day.activities||[]).length ? `
      <div class="grp"><strong>Activités</strong>
        <ul>${day.activities.map(a => `<li>${esc(a.name)} — ${a.duration} min — ${round(a.kcal)} kcal</li>`).join("")}</ul>
      </div>` : "";
    return `
      <section>
        <h2>${esc(formatDateHuman(d))}</h2>
        <p class="totals">Repas : <strong>${totals.consumed} kcal</strong> &nbsp;·&nbsp; Activité : <strong>${totals.burned} kcal</strong> &nbsp;·&nbsp; Besoin estimé : <strong>≈ ${needs} kcal</strong></p>
        ${mealsHtml}${actHtml}
      </section>`;
  }).join("");

  const title = startDate === endDate ? `Journée du ${formatDateHuman(startDate)}` : `Du ${formatDateShort(startDate)} au ${formatDateShort(endDate)}`;

  const doc = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Feuille — ${esc(title)}</title>
  <style>
    body{font-family:'DM Sans',Arial,sans-serif; color:#2B2723; padding:32px; max-width:720px; margin:0 auto;}
    h1{font-family:'Manrope',Arial,sans-serif; font-size:22px; margin-bottom:4px;}
    .sub{color:#726B62; font-size:13px; margin-bottom:24px;}
    section{margin-bottom:22px; page-break-inside:avoid;}
    h2{font-family:'Manrope',Arial,sans-serif; font-size:16px; border-bottom:1.5px solid #E9E1D2; padding-bottom:6px; margin-bottom:8px;}
    .totals{font-size:13px; margin-bottom:8px;}
    .grp{font-size:13px; margin-bottom:8px;}
    .grp ul{margin:4px 0 0 18px; padding:0;}
    .muted{color:#A39A8E; font-size:13px;}
    .legal{margin-top:28px; font-size:11px; color:#A39A8E; border-top:1px solid #E9E1D2; padding-top:12px;}
    @media print{ body{padding:0;} }
  </style></head><body>
    <h1>Feuille — ${esc(title)}</h1>
    <p class="sub">Exporté le ${esc(formatDateHuman(todayStr()))}</p>
    ${sections}
    <p class="legal">Les informations fournies par cette application sont des estimations générales et ne remplacent pas l'avis d'un professionnel de santé.</p>
  </body></html>`;

  const win = window.open("", "_blank");
  if(!win){
    showToast("Autorisez les fenêtres popup pour exporter en PDF.", "⚠️", "warning");
    return;
  }
  win.document.open();
  win.document.write(doc);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

/* ============================================================
   INIT
   ============================================================ */
render();