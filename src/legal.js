// The Privacy and Terms pages are static; this only fills in the contact address from config.js,
// so it's written in one place. Without scripts the pages still read "the email address at the
// bottom of the home page".
import { AUTHOR } from './config.js';
import { esc } from './lib/sanitize.js';
import { watchTheme } from './lib/theme.js';

watchTheme();

document.querySelectorAll('[data-contact]').forEach((el) => {
  el.innerHTML = `<a href="mailto:${esc(AUTHOR.email)}">${esc(AUTHOR.email)}</a>`;
});
