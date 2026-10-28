// Puts the reader's paper on the page before it paints (D-033): light, warm or dark, or "auto",
// which follows the device's light or dark setting. A plain file rather than an inline script so
// the Content-Security-Policy can keep forbidding inline scripts. The key matches THEME_KEY in
// src/config.js (scripts/check-themes.mjs checks). src/lib/theme.js takes over once the page runs.
(function () {
  var choice = 'auto';
  try {
    var saved = localStorage.getItem('eightfold:v1:theme');
    if (saved === 'light' || saved === 'warm' || saved === 'dark') choice = saved;
  } catch (e) { /* storage blocked: follow the device */ }
  var night = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  var root = document.documentElement;
  root.setAttribute('data-theme', choice === 'auto' ? (night ? 'dark' : 'light') : choice);
  root.setAttribute('data-theme-choice', choice);
})();
