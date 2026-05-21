(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  else { root.TTT = root.TTT || {}; root.TTT.lemma = mod; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Irregular verbs/nouns lookup (past/participle/plural → base)
  var irregulars = {
    went:'go', gone:'go', ran:'run', running:'run', taken:'take', took:'take',
    was:'be', were:'be', been:'be', am:'be', is:'be', are:'be',
    had:'have', has:'have', having:'have',
    did:'do', done:'do', does:'do',
    said:'say', says:'say',
    made:'make', making:'make',
    got:'get', gotten:'get', getting:'get',
    came:'come', coming:'come',
    knew:'know', known:'know',
    thought:'think', thinking:'think',
    gave:'give', given:'give', giving:'give',
    saw:'see', seen:'see',
    told:'tell', told:'tell',
    found:'find', finding:'find',
    left:'leave', leaving:'leave',
    felt:'feel', feeling:'feel',
    put:'put', putting:'put',
    brought:'bring', bringing:'bring',
    began:'begin', begun:'begin', beginning:'begin',
    kept:'keep', keeping:'keep',
    held:'hold', holding:'hold',
    wrote:'write', written:'write', writing:'write',
    stood:'stand', standing:'stand',
    heard:'hear', hearing:'hear',
    let:'let', letting:'let',
    meant:'mean', meaning:'mean',
    set:'set', setting:'set',
    met:'meet', meeting:'meet',
    paid:'pay', paying:'pay',
    read:'read', reading:'read',
    grew:'grow', grown:'grow', growing:'grow',
    lost:'lose', losing:'lose',
    caught:'catch', catching:'catch',
    bought:'buy', buying:'buy',
    sent:'send', sending:'send',
    fell:'fall', fallen:'fall', falling:'fall',
    chose:'choose', chosen:'choose', choosing:'choose',
    slept:'sleep', sleeping:'sleep',
    spoke:'speak', spoken:'speak', speaking:'speak',
    children:'child', men:'man', women:'woman', mice:'mouse', teeth:'tooth', feet:'foot', people:'person',
    studies:'study', studied:'study', studying:'study',
    carries:'carry', carried:'carry', carrying:'carry',
    tries:'try', tried:'try', trying:'try',
    dies:'die', died:'die', dying:'die',
    lies:'lie', lied:'lie', lying:'lie',
    ties:'tie', tied:'tie', tying:'tie'
  };

  // Doubled consonant endings for -ing/-ed removal
  var doubled = /([bcdfghlmnprstvwz])\1(ing|ed)$/;

  function lemmatize(word) {
    if (!word) return '';
    var w = word.toLowerCase().trim();
    if (w.length < 3) return w;

    // Check irregulars first
    if (irregulars[w]) return irregulars[w];

    // -ies → -y (studies → study) but not "series"
    if (w.endsWith('ies') && w.length > 4) {
      var base = w.slice(0, -3) + 'y';
      return base;
    }
    // -ied → -y
    if (w.endsWith('ied') && w.length > 4) return w.slice(0, -3) + 'y';

    // doubled consonant + ing/ed (running → run, hopped → hop)
    var dm = w.match(doubled);
    if (dm) return w.slice(0, -(dm[2].length + 1));

    // -ing
    if (w.endsWith('ing') && w.length > 4) {
      var noIng = w.slice(0, -3);
      // If removing -ing leaves a consonant ending and the pattern is C+V+C (like "mak" from "making"),
      // it likely dropped an 'e', so restore it.
      if (/[^aeiou]$/.test(noIng) && /[aeiou]/.test(noIng.slice(-2, -1))) {
        return noIng + 'e';
      }
      return noIng;
    }

    // -ed
    if (w.endsWith('ed') && w.length > 4) {
      var noEd = w.slice(0, -2);
      // baked → bake (ends consonant, add e)
      if (/[^aeiou]$/.test(noEd)) return noEd + 'e';
      return noEd;
    }
    if (w.endsWith('ed') && w.length === 4) return w.slice(0, -2);

    // -es → -e or strip (boxes → box, places → place)
    if (w.endsWith('es') && w.length > 4) {
      if (/[sxz]es$/.test(w) || /[sc]hes$/.test(w)) return w.slice(0, -2);
      return w.slice(0, -1); // places → place
    }

    // -s (runs → run) but not words ending in ss
    if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) return w.slice(0, -1);

    return w;
  }

  return { lemmatize: lemmatize, irregulars: irregulars };
});
