/**
 * data/activities.js
 * Activités physiques (valeurs MET approximatives) et niveaux d'activité quotidienne.
 * UMD: fonctionne en <script> navigateur (window.ActivitiesData) et en Node (require).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.ActivitiesData = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {

  const ACTIVITIES_DB = [
    {id:"marche", name:"Marche", icon:"🚶", met:3.5},
    {id:"course", name:"Course à pied", icon:"🏃", met:8.0},
    {id:"velo", name:"Vélo", icon:"🚲", met:6.0},
    {id:"natation", name:"Natation", icon:"🏊", met:6.0},
    {id:"randonnee", name:"Randonnée", icon:"🥾", met:5.3},
    {id:"danse", name:"Danse", icon:"💃", met:4.8},
    {id:"jardinage", name:"Jardinage", icon:"🌱", met:3.8},
    {id:"doux", name:"Exercices doux", icon:"🧘", met:2.5},
    {id:"autre", name:"Autre activité", icon:"⭐", met:4.0}
  ];

  const ACTIVITY_LEVELS = [
    {id:"sedentaire", label:"Sédentaire", desc:"Peu ou pas d'exercice, travail assis", factor:1.2},
    {id:"peu_actif", label:"Peu actif", desc:"Exercice léger 1 à 3 jours par semaine", factor:1.375},
    {id:"modere", label:"Modérément actif", desc:"Exercice modéré 3 à 5 jours par semaine", factor:1.55},
    {id:"actif", label:"Actif", desc:"Exercice intense 6 à 7 jours par semaine", factor:1.725},
    {id:"tres_actif", label:"Très actif", desc:"Exercice quotidien intense ou travail physique", factor:1.9}
  ];

  function activityById(id) {
    return ACTIVITIES_DB.find(a => a.id === id) || null;
  }

  function levelById(id) {
    return ACTIVITY_LEVELS.find(l => l.id === id) || null;
  }

  return { ACTIVITIES_DB, activityById, ACTIVITY_LEVELS, levelById };
});
