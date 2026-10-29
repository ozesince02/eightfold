// The story of the thousand cranes (D-023): a hanging scroll that unrolls over the page. Three
// ways in, all opening this one scroll: the folded note on the landing page's wish card, the
// crane's line after the demo, and "Why 1,000?" in the tracker's crane panel.
// Loaded only when someone asks for it, so neither page pays for it up front. The text is fixed
// here and contains nothing from storage or the address bar.
import '../styles/story.css';
import { APP_PATH, CRANE_GOAL_TEXT } from '../config.js';

const CHAPTERS = [
  ['一', 'The bird of a thousand years', `
    <p>In Japan the red-crowned crane, <i>tsuru</i>, has stood for long life and good fortune for
    centuries. An old saying gives the crane a thousand years and the turtle ten thousand. Cranes fly
    across wedding kimonos, New Year cards and temple screens, wishing whoever sees them a long and
    lucky life.</p>`],
  ['二', 'A thousand of them', `
    <p>Fold one paper crane and you have a small charm. Fold a thousand and string them together and
    you have <i>senbazuru</i>, 千羽鶴, "a thousand cranes". Folk belief says the patience it takes
    earns a wish.</p>
    <p>Strands are folded for a friend in hospital, given at weddings, and left at shrines and
    temples, where they hang in long bright curtains until the sun fades them.</p>`],
  ['三', 'The oldest folding book', `
    <p>In 1797 a small woodblock-printed book, <i>Hiden Senbazuru Orikata</i>, "the secret of folding
    a thousand cranes", showed forty-nine ways to fold cranes still joined to one another, cut
    part-way from a single sheet. It is the oldest known book about folding paper for pleasure. The
    old pages on this site come from that time.</p>`],
  ['四', 'Sadako’s cranes', `
    <p>Sadako Sasaki was two years old when the atomic bomb fell on Hiroshima in August 1945. Ten
    years later she was a fast runner in her school's relay team when she fell ill with leukaemia.
    In hospital she began folding cranes from any paper she could find, even the wrappers of her
    medicine, wishing to get well. She died in October 1955, aged twelve.</p>
    <p>Her classmates raised money for a memorial. Since 1958 the Children's Peace Monument in
    Hiroshima has shown a girl holding a crane high above her head, and strands of cranes arrive
    there from all over the world every year.</p>
    <p>The retellings don't agree on how many she folded. A well-known children's book says she
    stopped at 644 and her friends finished the thousand; her family says she passed a thousand and
    kept going. Either way, she kept folding.</p>`],
  ['五', 'Fall seven times, rise eight', `
    <p><i>Nanakorobi yaoki</i>, 七転び八起き. You fall seven times and get up eight. The daruma doll
    is weighted at the bottom so that it rights itself every time it is knocked over. The proverb
    doesn't count your falls against you. It only asks for one more rise than fall.</p>`],
  ['六', 'One more fold', `
    <p>One More Fold is named for that one more rise. Here every tick folds a crane: tick a day's habits and
    you watch today's crane take shape, and the year's ticks become your strand. At ${CRANE_GOAL_TEXT},
    the wish you wrote is yours to make.</p>
    <p>A missed day doesn't unfold anything. It is only a fall, and tomorrow you fold again.</p>`],
];

let dialog = null;

function build(page) {
  const el = document.createElement('dialog');
  el.className = 'story';
  el.setAttribute('aria-labelledby', 'story-h');
  const onward = page === 'landing'
    ? `<a class="btn" href="${APP_PATH}">Start folding</a><button class="btn btn--quiet" type="button" data-story-close>Back to the page</button>`
    : '<button class="btn" type="button" data-story-close>Back to folding</button>';
  el.innerHTML = `
    <div class="story-scroll">
      <button class="story-x" type="button" data-story-close aria-label="Close the story">✕</button>
      <span class="story-rod" aria-hidden="true"></span>
      <div class="story-roll">
        <div class="story-paper">
          <p class="story-kicker" lang="ja">千羽鶴</p>
          <h2 id="story-h">Why a thousand cranes?</h2>
          <figure class="story-print">
            <img src="/img/senbazuru-page.jpg" width="961" height="1400" alt="A page from a 1797 folding book: a line drawing of a paper crane beside its folding square" loading="lazy">
          </figure>
          ${CHAPTERS.map(([n, h, body]) => `<section class="story-ch">
            <h3><span class="story-num" lang="ja" aria-hidden="true">${n}</span>${h}</h3>${body}
          </section>`).join('')}
          <div class="story-end">
            <span class="story-seal" lang="ja" aria-hidden="true">八</span>
            <div class="story-actions">${onward}</div>
          </div>
        </div>
      </div>
      <span class="story-rod story-rod--low" aria-hidden="true"></span>
    </div>`;
  document.body.append(el);

  // Escape, the ✕, the buttons and a tap outside the scroll all roll it back up first.
  el.addEventListener('cancel', (e) => { e.preventDefault(); rollUp(); });
  // The browser can close it on its own (a second Escape, say). Its close event may arrive late,
  // so it only counts while the dialog is actually closed.
  el.addEventListener('close', () => { if (!el.open) finish(); });
  el.addEventListener('click', (e) => {
    if (e.target === el || e.target.closest('[data-story-close]')) rollUp();
  });
  return el;
}

const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
let opener = null;
let whenClosed = null;
let stopRolling = null;

// Every way of closing ends here, once: close the dialog, give focus back to whatever opened it
// and tell the page. Doesn't wait for the dialog's own close event, which not every browser sends.
function finish() {
  stopRolling?.();
  stopRolling = null;
  dialog.classList.remove('is-closing');
  if (dialog.open) dialog.close();
  if (opener?.isConnected && (!document.activeElement || document.activeElement === document.body)) opener.focus();
  const cb = whenClosed;
  opener = null;
  whenClosed = null;
  cb?.();
}

function rollUp() {
  if (!dialog?.open || dialog.classList.contains('is-closing')) return;
  if (still()) { finish(); return; }
  dialog.classList.add('is-closing');
  // The roll-up takes 320ms; close anyway if the animation never reports back. Either way the
  // other one is cleared, so nothing left over can close the scroll the next time it opens.
  const roll = dialog.querySelector('.story-roll');
  const onEnd = (e) => { if (e.target === roll && e.animationName === 'story-rollup') finish(); };
  const timer = setTimeout(finish, 600);
  roll.addEventListener('animationend', onEnd);
  stopRolling = () => { clearTimeout(timer); roll.removeEventListener('animationend', onEnd); };
}

// Opens the scroll. page: 'landing' | 'app', which decides where the closing button leads.
// onClose runs once the scroll is rolled up again.
export function openCraneStory({ page = 'app', onClose } = {}) {
  dialog ||= build(page);
  if (dialog.open) return;
  opener = document.activeElement;
  whenClosed = onClose || null;
  dialog.querySelector('.story-paper').scrollTop = 0;
  dialog.showModal();
}
