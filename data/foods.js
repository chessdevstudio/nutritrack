/**
 * data/foods.js
 * Base de données alimentaire — valeurs pour 100 g / 100 ml.
 * Ordres de grandeur usuels (tables nutritionnelles génériques).
 * Ce sont des ESTIMATIONS — voir mention légale dans l'application.
 * UMD: fonctionne en <script> navigateur (window.FoodsData) et en Node (require).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.FoodsData = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {

  const FOODS_DB = [
    {id:"avoine", name:"Flocons d'avoine", kcal:389, protein:16.9, carbs:66.3, fat:6.9},
    {id:"lait", name:"Lait demi-écrémé", kcal:46, protein:3.3, carbs:4.8, fat:1.6},
    {id:"banane", name:"Banane", kcal:89, protein:1.1, carbs:22.8, fat:0.3},
    {id:"miel", name:"Miel", kcal:304, protein:0.3, carbs:82.4, fat:0},
    {id:"oeuf", name:"Œufs", kcal:143, protein:12.6, carbs:0.7, fat:9.5},
    {id:"pain_complet", name:"Pain complet", kcal:247, protein:10.7, carbs:41.3, fat:3.4},
    {id:"avocat", name:"Avocat", kcal:160, protein:2, carbs:8.5, fat:14.7},
    {id:"tomate", name:"Tomate", kcal:18, protein:0.9, carbs:3.9, fat:0.2},
    {id:"fromage_blanc", name:"Fromage blanc 0%", kcal:45, protein:7.5, carbs:4, fat:0.2},
    {id:"myrtilles", name:"Myrtilles", kcal:57, protein:0.7, carbs:14.5, fat:0.3},
    {id:"amandes", name:"Amandes", kcal:579, protein:21.2, carbs:21.6, fat:49.9},
    {id:"poulet", name:"Blanc de poulet", kcal:165, protein:31, carbs:0, fat:3.6},
    {id:"riz_complet", name:"Riz complet cuit", kcal:123, protein:2.6, carbs:25.8, fat:1},
    {id:"brocoli", name:"Brocoli", kcal:34, protein:2.8, carbs:6.6, fat:0.4},
    {id:"huile_olive", name:"Huile d'olive", kcal:884, protein:0, carbs:0, fat:100},
    {id:"saumon", name:"Saumon", kcal:208, protein:20.4, carbs:0, fat:13.4},
    {id:"patate_douce", name:"Patate douce", kcal:86, protein:1.6, carbs:20.1, fat:0.1},
    {id:"epinards", name:"Épinards", kcal:23, protein:2.9, carbs:3.6, fat:0.4},
    {id:"yaourt_grec", name:"Yaourt grec", kcal:97, protein:9, carbs:3.6, fat:5},
    {id:"quinoa", name:"Quinoa cuit", kcal:120, protein:4.4, carbs:21.3, fat:1.9},
    {id:"lentilles", name:"Lentilles cuites", kcal:116, protein:9, carbs:20.1, fat:0.4},
    {id:"feta", name:"Feta", kcal:264, protein:14.2, carbs:4.1, fat:21.3},
    {id:"concombre", name:"Concombre", kcal:15, protein:0.7, carbs:3.6, fat:0.1},
    {id:"thon", name:"Thon (conserve, au naturel)", kcal:116, protein:25.5, carbs:0, fat:0.8},
    {id:"pomme", name:"Pomme", kcal:52, protein:0.3, carbs:13.8, fat:0.2},
    {id:"beurre_cacahuete", name:"Beurre de cacahuète", kcal:588, protein:25, carbs:20, fat:50},
    {id:"courgette", name:"Courgette", kcal:17, protein:1.2, carbs:3.1, fat:0.3},
    {id:"champignons", name:"Champignons", kcal:22, protein:3.1, carbs:3.3, fat:0.3},
    {id:"jambon", name:"Jambon blanc", kcal:145, protein:20, carbs:1.5, fat:6},
    {id:"pates_completes", name:"Pâtes complètes cuites", kcal:124, protein:5, carbs:25, fat:1},
    {id:"haricots_verts", name:"Haricots verts", kcal:31, protein:1.8, carbs:7, fat:0.1},
    {id:"carotte", name:"Carotte", kcal:41, protein:0.9, carbs:10, fat:0.2},
    {id:"graines_chia", name:"Graines de chia", kcal:486, protein:17, carbs:42, fat:31},
    {id:"orange", name:"Orange", kcal:47, protein:0.9, carbs:11.8, fat:0.1},
    {id:"noix", name:"Noix", kcal:654, protein:15.2, carbs:13.7, fat:65.2},
    {id:"chocolat_noir", name:"Chocolat noir 70%", kcal:598, protein:7.8, carbs:45.9, fat:42.6},
    {id:"pomme_de_terre", name:"Pomme de terre cuite", kcal:87, protein:1.9, carbs:20.1, fat:0.1}
  ];

  function foodById(id) {
    return FOODS_DB.find(f => f.id === id) || null;
  }

  function searchFoods(query) {
    const q = (query || "").trim().toLowerCase();
    if (!q) return FOODS_DB;
    return FOODS_DB.filter(f => f.name.toLowerCase().includes(q));
  }

  return { FOODS_DB, foodById, searchFoods };
});
