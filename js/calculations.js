/**
 * js/calculations.js
 * Toutes les fonctions de calcul de l'application, isolées et testables.
 * UMD: fonctionne en <script> navigateur (window.Calculations) et en Node (require).
 * En Node, charge directement data/foods.js et data/activities.js.
 * En navigateur, s'appuie sur window.FoodsData et window.ActivitiesData
 * (qui doivent être chargés AVANT ce script — voir index.html).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    const FoodsData = require("../data/foods.js");
    const ActivitiesData = require("../data/activities.js");
    module.exports = factory(FoodsData, ActivitiesData);
  } else {
    root.Calculations = factory(root.FoodsData, root.ActivitiesData);
  }
})(typeof self !== "undefined" ? self : this, function (FoodsData, ActivitiesData) {

  // ----------------------------------------------------------------
  // Besoin énergétique — formule de Mifflin-St Jeor
  // ----------------------------------------------------------------
  function calculateBMR({ age, sex, height, weight }) {
    const base = 10 * weight + 6.25 * height - 5 * age;
    if (sex === "homme") return base + 5;
    if (sex === "femme") return base - 161;
    return base - 78; // moyenne, pour "autre / préfère ne pas dire"
  }

  function calculateDailyEnergyNeeds({ age, sex, height, weight, activityLevel }) {
    const bmr = calculateBMR({ age, sex, height, weight });
    const level = ActivitiesData.levelById(activityLevel) || ActivitiesData.ACTIVITY_LEVELS[0];
    return Math.round(bmr * level.factor);
  }

  // ----------------------------------------------------------------
  // Recettes — calcul à partir des ingrédients (jamais de valeur inventée)
  // ----------------------------------------------------------------
  function calculateRecipeTotals(ingredients) {
    return (ingredients || []).reduce((tot, ing) => {
      const food = FoodsData.foodById(ing.food);
      if (!food) return tot;
      const factor = ing.g / 100;
      tot.kcal += food.kcal * factor;
      tot.protein += food.protein * factor;
      tot.carbs += food.carbs * factor;
      tot.fat += food.fat * factor;
      return tot;
    }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  }

  function calculateCaloriesPerPortion(totals, portions) {
    if (!portions || portions <= 0) return totals;
    return {
      kcal: totals.kcal / portions,
      protein: totals.protein / portions,
      carbs: totals.carbs / portions,
      fat: totals.fat / portions
    };
  }

  // ----------------------------------------------------------------
  // Activité physique — méthode MET
  // ----------------------------------------------------------------
  function calculateBurnedCalories({ weight, met, durationMin, intensity }) {
    const intensityFactor = intensity === "leger" ? 0.8 : intensity === "intense" ? 1.2 : 1.0;
    const adjustedMet = met * intensityFactor;
    return (adjustedMet * 3.5 * weight / 200) * durationMin;
  }

  // ----------------------------------------------------------------
  // Besoin en eau — base (poids) + niveau d'activité général + activité du jour
  // Constantes regroupées ici pour rester faciles à ajuster.
  // ----------------------------------------------------------------
  const WATER_ML_PER_KG = 33; // ml d'eau de base par kg de poids corporel (ordre de grandeur usuel : 30-35 ml/kg)
  const WATER_ACTIVITY_LEVEL_BONUS = {
    sedentaire: 0,
    peu_actif: 200,
    modere: 400,
    actif: 600,
    tres_actif: 800
  };
  const WATER_ML_PER_KCAL_BURNED = 0.5; // ml supplémentaires par kcal dépensée via l'activité enregistrée du jour

  function calculateWaterNeeds({ weight, activityLevel, activityCaloriesToday }) {
    const base = weight * WATER_ML_PER_KG;
    const levelBonus = WATER_ACTIVITY_LEVEL_BONUS[activityLevel] || 0;
    const dailyBonus = Math.max(0, activityCaloriesToday || 0) * WATER_ML_PER_KCAL_BURNED;
    return Math.round(base + levelBonus + dailyBonus);
  }

  // ----------------------------------------------------------------
  // Agrégats quotidiens / hebdomadaires / mensuels
  // ----------------------------------------------------------------
  function calculateDailyTotal(day) {
    const consumed = (day.meals || []).reduce((s, m) => s + m.kcal, 0);
    const burned = (day.activities || []).reduce((s, a) => s + a.kcal, 0);
    const water = (day.water || []).reduce((s, w) => s + w.ml, 0);
    return { consumed: Math.round(consumed), burned: Math.round(burned), water: Math.round(water) };
  }

  function calculateWeeklyAverage(days) {
    const vals = Object.values(days || {});
    if (!vals.length) return { avgConsumed: 0, avgBurned: 0, avgWater: 0, count: 0 };
    let c = 0, b = 0, w = 0;
    vals.forEach(d => { const t = calculateDailyTotal(d); c += t.consumed; b += t.burned; w += t.water; });
    return { avgConsumed: Math.round(c / vals.length), avgBurned: Math.round(b / vals.length), avgWater: Math.round(w / vals.length), count: vals.length };
  }

  function calculateMonthlyStats(days) {
    const vals = Object.values(days || {});
    const daysWithData = vals.filter(d => (d.meals && d.meals.length) || (d.activities && d.activities.length));
    const mealsCount = vals.reduce((s, d) => s + ((d.meals && d.meals.length) || 0), 0);
    const activitiesCount = vals.reduce((s, d) => s + ((d.activities && d.activities.length) || 0), 0);
    const avg = calculateWeeklyAverage(days);
    return {
      daysRecorded: daysWithData.length,
      mealsCount,
      activitiesCount,
      avgConsumed: avg.avgConsumed,
      avgBurned: avg.avgBurned
    };
  }

  return {
    calculateBMR,
    calculateDailyEnergyNeeds,
    calculateRecipeTotals,
    calculateCaloriesPerPortion,
    calculateBurnedCalories,
    calculateWaterNeeds,
    calculateDailyTotal,
    calculateWeeklyAverage,
    calculateMonthlyStats
  };
});