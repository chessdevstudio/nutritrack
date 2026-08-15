/**
 * js/storage.js
 * Façade de persistance locale (localStorage). Isole la logique de stockage
 * de l'interface pour faciliter une migration future (Firebase, Supabase, API...).
 * Détecte et gère le cas où localStorage est indisponible (navigation privée,
 * stockage plein, quota dépassé) sans jamais faire planter l'application.
 */
(function (root) {
  const STORAGE_KEYS = {
    profile: "nutriapp_profile_v1",
    days: "nutriapp_days_v1",
    onboarded: "nutriapp_onboarded_v1",
    selectedDate: "nutriapp_selected_date_v1",
    recipes: "nutriapp_recipes_v1",
    favorites: "nutriapp_favorites_v1"
  };

  // Détection de disponibilité réelle (et pas seulement de l'existence de l'objet) :
  // certains navigateurs en navigation privée exposent localStorage mais lèvent
  // une erreur au premier setItem (quota à 0).
  function detectAvailability() {
    try {
      const testKey = "__nutriapp_storage_test__";
      window.localStorage.setItem(testKey, "1");
      window.localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  const isAvailable = detectAvailability();
  // Stockage de secours en mémoire (perdu à la fermeture de l'onglet) si
  // localStorage est indisponible, pour que l'app reste utilisable pendant la session.
  const memoryFallback = {};

  function safeGet(key) {
    if (isAvailable) {
      try { return window.localStorage.getItem(key); }
      catch (e) { return memoryFallback[key] || null; }
    }
    return memoryFallback[key] || null;
  }

  function safeSet(key, value) {
    if (isAvailable) {
      try { window.localStorage.setItem(key, value); return true; }
      catch (e) {
        // Quota dépassé en cours de session malgré la détection initiale positive
        memoryFallback[key] = value;
        return false;
      }
    }
    memoryFallback[key] = value;
    return false;
  }

  const Storage = {
    isAvailable() { return isAvailable; },

    getProfile() {
      try { const raw = safeGet(STORAGE_KEYS.profile); return raw ? JSON.parse(raw) : null; }
      catch (e) { return null; }
    },
    setProfile(profile) {
      return safeSet(STORAGE_KEYS.profile, JSON.stringify(profile));
    },

    isOnboarded() {
      return safeGet(STORAGE_KEYS.onboarded) === "1";
    },
    setOnboarded() {
      return safeSet(STORAGE_KEYS.onboarded, "1");
    },

    getAllDays() {
      try { const raw = safeGet(STORAGE_KEYS.days); return raw ? JSON.parse(raw) : {}; }
      catch (e) { return {}; }
    },
    getDay(dateStr) {
      const days = this.getAllDays();
      const day = days[dateStr] || { date: dateStr, meals: [], activities: [], water: [] };
      if (!day.water) day.water = []; // journées créées avant l'ajout du suivi hydratation
      return day;
    },
    setDay(dateStr, dayData) {
      const days = this.getAllDays();
      days[dateStr] = dayData;
      return safeSet(STORAGE_KEYS.days, JSON.stringify(days));
    },

    getSelectedDate() {
      return safeGet(STORAGE_KEYS.selectedDate);
    },
    setSelectedDate(dateStr) {
      return safeSet(STORAGE_KEYS.selectedDate, dateStr);
    },

    getRecipes() {
      try { const raw = safeGet(STORAGE_KEYS.recipes); return raw ? JSON.parse(raw) : []; }
      catch (e) { return []; }
    },
    setRecipes(recipes) {
      return safeSet(STORAGE_KEYS.recipes, JSON.stringify(recipes));
    },

    getFavorites() {
      try { const raw = safeGet(STORAGE_KEYS.favorites); return raw ? JSON.parse(raw) : []; }
      catch (e) { return []; }
    },
    setFavorites(favs) {
      return safeSet(STORAGE_KEYS.favorites, JSON.stringify(favs));
    }
  };

  root.Storage = Storage;
})(typeof window !== "undefined" ? window : this);