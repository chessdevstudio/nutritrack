/**
 * tests/calculations.test.js
 * Tests unitaires pour js/calculations.js — exécutable avec :
 *   node tests/calculations.test.js
 * Utilise le test runner intégré de Node (aucune dépendance externe).
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const Calculations = require("../js/calculations.js");

// ----------------------------------------------------------------
// calculateBMR
// ----------------------------------------------------------------
test("calculateBMR - homme, valeurs de référence", () => {
  const bmr = Calculations.calculateBMR({ age: 30, sex: "homme", height: 180, weight: 75 });
  // 10*75 + 6.25*180 - 5*30 + 5 = 750 + 1125 - 150 + 5 = 1730
  assert.equal(bmr, 1730);
});

test("calculateBMR - femme, valeurs de référence", () => {
  const bmr = Calculations.calculateBMR({ age: 28, sex: "femme", height: 165, weight: 60 });
  // 10*60 + 6.25*165 - 5*28 - 161 = 600 + 1031.25 - 140 - 161 = 1330.25
  assert.equal(bmr, 1330.25);
});

test("calculateBMR - sexe non renseigné utilise la moyenne homme/femme", () => {
  const bmr = Calculations.calculateBMR({ age: 40, sex: "autre", height: 170, weight: 70 });
  // 10*70 + 6.25*170 - 5*40 - 78 = 700 + 1062.5 - 200 - 78 = 1484.5
  assert.equal(bmr, 1484.5);
});

// ----------------------------------------------------------------
// calculateDailyEnergyNeeds
// ----------------------------------------------------------------
test("calculateDailyEnergyNeeds - applique le bon facteur d'activité", () => {
  const needs = Calculations.calculateDailyEnergyNeeds({
    age: 30, sex: "homme", height: 180, weight: 75, activityLevel: "sedentaire"
  });
  // BMR 1730 * 1.2 = 2076
  assert.equal(needs, 2076);
});

test("calculateDailyEnergyNeeds - niveau d'activité inconnu retombe sur le premier niveau (sédentaire)", () => {
  const needs = Calculations.calculateDailyEnergyNeeds({
    age: 30, sex: "homme", height: 180, weight: 75, activityLevel: "inexistant"
  });
  assert.equal(needs, 2076);
});

test("calculateDailyEnergyNeeds - augmente avec le niveau d'activité", () => {
  const base = { age: 25, sex: "femme", height: 165, weight: 60 };
  const sed = Calculations.calculateDailyEnergyNeeds({ ...base, activityLevel: "sedentaire" });
  const actif = Calculations.calculateDailyEnergyNeeds({ ...base, activityLevel: "tres_actif" });
  assert.ok(actif > sed, "le besoin d'un profil très actif doit être supérieur à celui d'un profil sédentaire");
});

// ----------------------------------------------------------------
// calculateRecipeTotals
// ----------------------------------------------------------------
test("calculateRecipeTotals - additionne correctement les ingrédients connus", () => {
  const totals = Calculations.calculateRecipeTotals([
    { food: "banane", g: 100 },  // 89 kcal
    { food: "miel", g: 10 }      // 30.4 kcal
  ]);
  assert.equal(Math.round(totals.kcal * 10) / 10, 119.4);
});

test("calculateRecipeTotals - ignore silencieusement un aliment inconnu", () => {
  const totals = Calculations.calculateRecipeTotals([
    { food: "banane", g: 100 },
    { food: "aliment_qui_n_existe_pas", g: 50 }
  ]);
  assert.equal(totals.kcal, 89);
});

test("calculateRecipeTotals - liste vide renvoie des totaux à zéro", () => {
  const totals = Calculations.calculateRecipeTotals([]);
  assert.deepEqual(totals, { kcal: 0, protein: 0, carbs: 0, fat: 0 });
});

test("calculateRecipeTotals - la quantité est bien proportionnelle (100g vs 200g)", () => {
  const t100 = Calculations.calculateRecipeTotals([{ food: "pomme", g: 100 }]);
  const t200 = Calculations.calculateRecipeTotals([{ food: "pomme", g: 200 }]);
  assert.equal(t200.kcal, t100.kcal * 2);
});

// ----------------------------------------------------------------
// calculateCaloriesPerPortion
// ----------------------------------------------------------------
test("calculateCaloriesPerPortion - divise correctement par le nombre de portions", () => {
  const totals = { kcal: 1000, protein: 40, carbs: 100, fat: 20 };
  const perPortion = Calculations.calculateCaloriesPerPortion(totals, 4);
  assert.equal(perPortion.kcal, 250);
  assert.equal(perPortion.protein, 10);
});

test("calculateCaloriesPerPortion - portions à 0 ou absentes renvoie les totaux inchangés", () => {
  const totals = { kcal: 1000, protein: 40, carbs: 100, fat: 20 };
  assert.deepEqual(Calculations.calculateCaloriesPerPortion(totals, 0), totals);
  assert.deepEqual(Calculations.calculateCaloriesPerPortion(totals, null), totals);
});

// ----------------------------------------------------------------
// calculateBurnedCalories
// ----------------------------------------------------------------
test("calculateBurnedCalories - formule MET standard", () => {
  // kcal = MET * 3.5 * poids(kg) / 200 * durée(min)
  const kcal = Calculations.calculateBurnedCalories({ weight: 70, met: 3.5, durationMin: 30, intensity: "modere" });
  // 3.5 * 3.5 * 70 / 200 * 30 = 128.625
  assert.equal(Math.round(kcal * 1000) / 1000, 128.625);
});

test("calculateBurnedCalories - intensité légère réduit la dépense, intense l'augmente", () => {
  const base = { weight: 70, met: 6, durationMin: 30 };
  const leger = Calculations.calculateBurnedCalories({ ...base, intensity: "leger" });
  const modere = Calculations.calculateBurnedCalories({ ...base, intensity: "modere" });
  const intense = Calculations.calculateBurnedCalories({ ...base, intensity: "intense" });
  assert.ok(leger < modere);
  assert.ok(intense > modere);
});

test("calculateBurnedCalories - une durée plus longue brûle davantage", () => {
  const half = Calculations.calculateBurnedCalories({ weight: 70, met: 5, durationMin: 30, intensity: "modere" });
  const full = Calculations.calculateBurnedCalories({ weight: 70, met: 5, durationMin: 60, intensity: "modere" });
  assert.equal(full, half * 2);
});

// ----------------------------------------------------------------
// calculateDailyTotal
// ----------------------------------------------------------------
test("calculateDailyTotal - additionne repas, activités et eau correctement, arrondi", () => {
  const day = {
    meals: [{ kcal: 300.4 }, { kcal: 199.8 }],
    activities: [{ kcal: 150.2 }],
    water: [{ ml: 250 }, { ml: 500.6 }]
  };
  const totals = Calculations.calculateDailyTotal(day);
  assert.equal(totals.consumed, 500);
  assert.equal(totals.burned, 150);
  assert.equal(totals.water, 751);
});

test("calculateDailyTotal - journée vide renvoie zéro, y compris pour l'eau", () => {
  const totals = Calculations.calculateDailyTotal({ meals: [], activities: [], water: [] });
  assert.deepEqual(totals, { consumed: 0, burned: 0, water: 0 });
});

test("calculateDailyTotal - tolère l'absence du tableau water (anciennes journées)", () => {
  const totals = Calculations.calculateDailyTotal({ meals: [], activities: [] });
  assert.equal(totals.water, 0);
});

// ----------------------------------------------------------------
// calculateWaterNeeds
// ----------------------------------------------------------------
test("calculateWaterNeeds - base : poids x 33 ml/kg pour un profil sédentaire sans activité du jour", () => {
  const ml = Calculations.calculateWaterNeeds({ weight: 70, activityLevel: "sedentaire", activityCaloriesToday: 0 });
  // 70 * 33 = 2310
  assert.equal(ml, 2310);
});

test("calculateWaterNeeds - le niveau d'activité général du profil augmente le besoin", () => {
  const base = { weight: 70, activityCaloriesToday: 0 };
  const sed = Calculations.calculateWaterNeeds({ ...base, activityLevel: "sedentaire" });
  const actif = Calculations.calculateWaterNeeds({ ...base, activityLevel: "tres_actif" });
  assert.ok(actif > sed, "un profil très actif doit avoir un besoin en eau plus élevé");
  assert.equal(actif - sed, 800);
});

test("calculateWaterNeeds - l'activité physique du jour ajoute de l'eau supplémentaire", () => {
  const sansActivite = Calculations.calculateWaterNeeds({ weight: 70, activityLevel: "modere", activityCaloriesToday: 0 });
  const avecActivite = Calculations.calculateWaterNeeds({ weight: 70, activityLevel: "modere", activityCaloriesToday: 400 });
  // 400 kcal * 0.5 ml/kcal = 200 ml de plus
  assert.equal(avecActivite - sansActivite, 200);
});

test("calculateWaterNeeds - niveau d'activité inconnu n'ajoute aucun bonus (pas d'erreur)", () => {
  const ml = Calculations.calculateWaterNeeds({ weight: 70, activityLevel: "inexistant", activityCaloriesToday: 0 });
  assert.equal(ml, 2310);
});

test("calculateWaterNeeds - des calories d'activité négatives ne réduisent jamais le besoin", () => {
  const ml = Calculations.calculateWaterNeeds({ weight: 70, activityLevel: "sedentaire", activityCaloriesToday: -50 });
  assert.equal(ml, 2310);
});

// ----------------------------------------------------------------
// calculateWeeklyAverage / calculateMonthlyStats
// ----------------------------------------------------------------
test("calculateWeeklyAverage - calcule la moyenne sur plusieurs jours, y compris l'eau", () => {
  const days = {
    "2026-08-10": { meals: [{ kcal: 1000 }], activities: [], water: [{ ml: 1500 }] },
    "2026-08-11": { meals: [{ kcal: 2000 }], activities: [], water: [{ ml: 2500 }] }
  };
  const avg = Calculations.calculateWeeklyAverage(days);
  assert.equal(avg.avgConsumed, 1500);
  assert.equal(avg.avgWater, 2000);
  assert.equal(avg.count, 2);
});

test("calculateWeeklyAverage - aucun jour renvoie des moyennes à zéro sans erreur", () => {
  const avg = Calculations.calculateWeeklyAverage({});
  assert.deepEqual(avg, { avgConsumed: 0, avgBurned: 0, avgWater: 0, count: 0 });
});

test("calculateMonthlyStats - compte correctement jours/repas/activités enregistrés", () => {
  const days = {
    "2026-08-01": { meals: [{ kcal: 500 }, { kcal: 300 }], activities: [{ kcal: 100 }] },
    "2026-08-02": { meals: [], activities: [] } // journée vide, ne doit pas compter comme "enregistrée"
  };
  const stats = Calculations.calculateMonthlyStats(days);
  assert.equal(stats.daysRecorded, 1);
  assert.equal(stats.mealsCount, 2);
  assert.equal(stats.activitiesCount, 1);
});