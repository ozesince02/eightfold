// Runs before the page paints: marks that scripts are on (so entrance animations can start hidden),
// and shows everything anyway if the main script hasn't loaded within 3 seconds.
// Kept as a file rather than inline so the Content-Security-Policy can forbid inline scripts.
document.documentElement.classList.add('js');
setTimeout(function () { if (!window.__oz) document.documentElement.classList.add('js-failed'); }, 3000);
