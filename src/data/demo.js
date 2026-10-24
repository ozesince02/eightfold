// Six made-up habits for the landing page's "Try it with today's six" demo (D-016).
// Generic on purpose: nothing here is anyone's real habit or schedule.

export const DEMO_HABITS = [
  { id: 'demo-water', name: 'Drink a glass of water', time: '06:30', color: '#A9CBD6' },
  { id: 'demo-bed', name: 'Make your bed', time: '07:00', color: '#C8302C' },
  { id: 'demo-stretch', name: 'Stretch for ten minutes', time: '07:15', color: '#8EA46B' },
  { id: 'demo-walk', name: 'Walk outside', time: '18:00', color: '#E9B33F' },
  { id: 'demo-learn', name: 'Learn something new', time: '20:30', color: '#24496B' },
  { id: 'demo-read', name: 'Read ten pages', time: '22:30', color: '#C9A57A' },
];

// The landing page shows real numbers from oze's own sheet (D-016, D-021), but under everyday
// habit names: every habit id in the sheet gets a stand-in, with a time for those that had one.
export const STORY_ALIASES = {
  german: { name: 'Make your bed', time: '07:00' },
  core: { name: 'Stretch for ten minutes', time: '07:15' },
  move: { name: 'Walk outside', time: '18:00' },
  sysdesign: { name: 'Practise a skill', time: '19:30' },
  dsa: { name: 'Learn something new', time: '20:30' },
  read: { name: 'Read ten pages', time: '22:30' },
  java: { name: 'Tidy one corner', time: '' },
  ovemau: { name: 'Call someone you love', time: '' },
  soak: { name: 'Drink a glass of water', time: '' },
  protein: { name: 'Eat a piece of fruit', time: '' },
};
