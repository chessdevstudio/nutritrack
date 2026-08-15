/**
 * data/menus.js
 * Menus prédéfinis (petit-déjeuner / déjeuner / dîner).
 * Chaque recette référence des aliments de data/foods.js par id + quantité (g).
 * UMD: fonctionne en <script> navigateur (window.MenusData) et en Node (require).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.MenusData = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {

  const MENUS = [
    // ---- PETIT-DÉJEUNER ----
    {id:"pdj1", cat:"petit-dejeuner", name:"Porridge banane & miel", emoji:"🥣", time:10, difficulty:"Facile",
      ingredients:[{food:"avoine",g:50},{food:"lait",g:200},{food:"banane",g:100},{food:"miel",g:10}],
      steps:["Faire chauffer le lait avec les flocons d'avoine 5 min à feu doux.","Verser dans un bol, ajouter la banane coupée en rondelles.","Terminer avec un filet de miel."]},
    {id:"pdj2", cat:"petit-dejeuner", name:"Œufs, avocat & pain complet", emoji:"🍳", time:12, difficulty:"Facile",
      ingredients:[{food:"oeuf",g:110},{food:"pain_complet",g:60},{food:"avocat",g:50}],
      steps:["Faire cuire les œufs au plat ou brouillés.","Toaster le pain complet.","Écraser l'avocat sur le pain et déposer les œufs par-dessus."]},
    {id:"pdj3", cat:"petit-dejeuner", name:"Yaourt grec, myrtilles & amandes", emoji:"🫐", time:5, difficulty:"Facile",
      ingredients:[{food:"yaourt_grec",g:200},{food:"myrtilles",g:80},{food:"amandes",g:15},{food:"miel",g:10}],
      steps:["Verser le yaourt grec dans un bol.","Ajouter les myrtilles et les amandes.","Terminer avec un filet de miel."]},
    {id:"pdj4", cat:"petit-dejeuner", name:"Tartines avocat-tomate", emoji:"🥑", time:8, difficulty:"Facile",
      ingredients:[{food:"pain_complet",g:70},{food:"avocat",g:80},{food:"tomate",g:60},{food:"huile_olive",g:5}],
      steps:["Toaster le pain complet.","Écraser l'avocat et l'étaler sur les tartines.","Ajouter des rondelles de tomate et un filet d'huile d'olive."]},
    {id:"pdj5", cat:"petit-dejeuner", name:"Bol fromage blanc & fruits", emoji:"🍓", time:5, difficulty:"Facile",
      ingredients:[{food:"fromage_blanc",g:200},{food:"banane",g:100},{food:"myrtilles",g:50},{food:"graines_chia",g:10}],
      steps:["Verser le fromage blanc dans un bol.","Ajouter la banane en rondelles et les myrtilles.","Saupoudrer de graines de chia."]},
    {id:"pdj6", cat:"petit-dejeuner", name:"Smoothie bowl avoine-banane", emoji:"🥤", time:8, difficulty:"Facile",
      ingredients:[{food:"avoine",g:40},{food:"lait",g:150},{food:"banane",g:120},{food:"beurre_cacahuete",g:15}],
      steps:["Mixer l'avoine, le lait et la banane jusqu'à consistance lisse.","Verser dans un bol.","Ajouter une cuillère de beurre de cacahuète."]},

    // ---- DÉJEUNER ----
    {id:"dej1", cat:"dejeuner", name:"Poulet, riz complet & brocoli", emoji:"🍗", time:25, difficulty:"Facile",
      ingredients:[{food:"poulet",g:150},{food:"riz_complet",g:150},{food:"brocoli",g:150},{food:"huile_olive",g:8}],
      steps:["Faire cuire le riz complet selon les indications.","Cuire le poulet à la poêle ou au four.","Faire revenir le brocoli à la vapeur, assembler et arroser d'huile d'olive."]},
    {id:"dej2", cat:"dejeuner", name:"Saumon, patate douce & épinards", emoji:"🐟", time:30, difficulty:"Intermédiaire",
      ingredients:[{food:"saumon",g:130},{food:"patate_douce",g:180},{food:"epinards",g:100},{food:"huile_olive",g:6}],
      steps:["Cuire la patate douce au four en dés, 25 min.","Poêler le saumon 4 min de chaque côté.","Faire tomber les épinards à la poêle avec l'huile d'olive."]},
    {id:"dej3", cat:"dejeuner", name:"Salade quinoa, feta & concombre", emoji:"🥗", time:15, difficulty:"Facile",
      ingredients:[{food:"quinoa",g:150},{food:"feta",g:50},{food:"concombre",g:100},{food:"tomate",g:80},{food:"huile_olive",g:10}],
      steps:["Mélanger le quinoa cuit refroidi avec les légumes coupés en dés.","Émietter la feta par-dessus.","Assaisonner avec l'huile d'olive."]},
    {id:"dej4", cat:"dejeuner", name:"Wrap complet poulet & crudités", emoji:"🌯", time:12, difficulty:"Facile",
      ingredients:[{food:"pain_complet",g:60},{food:"poulet",g:120},{food:"tomate",g:60},{food:"avocat",g:50}],
      steps:["Faire cuire et effilocher le poulet.","Garnir la tranche de pain complet avec le poulet, la tomate et l'avocat.","Rouler et déguster."]},
    {id:"dej5", cat:"dejeuner", name:"Pâtes complètes au thon", emoji:"🍝", time:18, difficulty:"Facile",
      ingredients:[{food:"pates_completes",g:200},{food:"thon",g:100},{food:"tomate",g:100},{food:"huile_olive",g:8}],
      steps:["Cuire les pâtes complètes selon les indications.","Égoutter le thon et l'ajouter avec la tomate coupée.","Mélanger le tout avec l'huile d'olive."]},
    {id:"dej6", cat:"dejeuner", name:"Bowl lentilles & légumes rôtis", emoji:"🥘", time:25, difficulty:"Intermédiaire",
      ingredients:[{food:"lentilles",g:200},{food:"carotte",g:100},{food:"courgette",g:100},{food:"huile_olive",g:10},{food:"feta",g:30}],
      steps:["Rôtir la carotte et la courgette au four 20 min avec l'huile d'olive.","Réchauffer les lentilles.","Assembler dans un bol et parsemer de feta."]},

    // ---- DÎNER ----
    {id:"din1", cat:"diner", name:"Soupe de légumes & jambon blanc", emoji:"🍲", time:25, difficulty:"Facile",
      ingredients:[{food:"carotte",g:100},{food:"courgette",g:100},{food:"champignons",g:80},{food:"jambon",g:60},{food:"huile_olive",g:5}],
      steps:["Faire revenir les légumes coupés dans l'huile d'olive.","Couvrir d'eau et laisser mijoter 20 min.","Mixer ou non, ajouter le jambon coupé en dés."]},
    {id:"din2", cat:"diner", name:"Omelette champignons & salade", emoji:"🍳", time:12, difficulty:"Facile",
      ingredients:[{food:"oeuf",g:100},{food:"champignons",g:80},{food:"huile_olive",g:5},{food:"concombre",g:100},{food:"tomate",g:80}],
      steps:["Faire revenir les champignons dans l'huile d'olive.","Battre les œufs et verser sur les champignons, cuire en omelette.","Servir avec une salade concombre-tomate."]},
    {id:"din3", cat:"diner", name:"Saumon vapeur & haricots verts", emoji:"🐟", time:20, difficulty:"Facile",
      ingredients:[{food:"saumon",g:120},{food:"haricots_verts",g:150},{food:"huile_olive",g:6}],
      steps:["Cuire le saumon à la vapeur 12 min.","Cuire les haricots verts à la vapeur.","Assaisonner d'un filet d'huile d'olive."]},
    {id:"din4", cat:"diner", name:"Salade poulet, avocat & concombre", emoji:"🥗", time:12, difficulty:"Facile",
      ingredients:[{food:"poulet",g:100},{food:"avocat",g:60},{food:"concombre",g:100},{food:"tomate",g:80},{food:"huile_olive",g:8}],
      steps:["Faire cuire le poulet et le couper en morceaux.","Mélanger avec l'avocat, le concombre et la tomate.","Assaisonner avec l'huile d'olive."]},
    {id:"din5", cat:"diner", name:"Velouté épinards & fromage blanc", emoji:"🥣", time:18, difficulty:"Facile",
      ingredients:[{food:"epinards",g:200},{food:"fromage_blanc",g:100},{food:"patate_douce",g:100}],
      steps:["Cuire la patate douce et les épinards à l'eau 15 min.","Mixer avec le fromage blanc jusqu'à consistance lisse.","Rectifier l'assaisonnement et servir chaud."]},
    {id:"din6", cat:"diner", name:"Bol quinoa, légumes & feta légère", emoji:"🥙", time:20, difficulty:"Facile",
      ingredients:[{food:"quinoa",g:100},{food:"courgette",g:100},{food:"carotte",g:80},{food:"feta",g:30},{food:"huile_olive",g:6}],
      steps:["Cuire le quinoa selon les indications.","Faire revenir la courgette et la carotte râpées.","Assembler dans un bol et parsemer de feta."]}
  ];

  const MENU_CATS = [
    {id:"petit-dejeuner", label:"Petit-déjeuner", icon:"🌅"},
    {id:"dejeuner", label:"Déjeuner", icon:"☀️"},
    {id:"diner", label:"Dîner", icon:"🌙"}
  ];

  function menuById(id) {
    return MENUS.find(m => m.id === id) || null;
  }

  return { MENUS, MENU_CATS, menuById };
});