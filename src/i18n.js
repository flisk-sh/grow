// Languages of the page shell. English is the default at /, every other language lives under /<code>/.
// The strings the Worker renders before the app loads are here; the app's own strings are in web/src/i18n.js.
export const LANGS = ['en', 'lv'];
export const SITE = 'https://grow.flisk.si';

export const SHELL = {
  en: {
    title: 'Flisk Grow: find your first customers',
    desc: 'Who would buy it, where they are, and what to send them. Free, no sign-in.',
    heading: 'Find your first customers.',
    placeholder: 'https://your-site.com',
    ariaLink: 'Link to your site',
    paste: 'Paste',
    cabinet: 'My cabinet · Flisk Grow',
    planFor: (host) => `Grow plan for ${host}`,
    planDesc: 'Who would buy it, where they are, and what to send them.',
    barText: 'Find your first customers with a plan made from your link.',
  },
  lv: {
    title: 'Flisk Grow: atrodi savus pirmos klientus',
    desc: 'Kas to pirks, kur viņi ir un ko viņiem nosūtīt. Bez maksas, bez reģistrēšanās.',
    heading: 'Atrodi savus pirmos klientus.',
    placeholder: 'https://tava-vietne.lv',
    ariaLink: 'Saite uz tavu vietni',
    paste: 'Ielīmēt',
    cabinet: 'Mans kabinets · Flisk Grow',
    planFor: (host) => `Grow plāns vietnei ${host}`,
    planDesc: 'Kas to pirks, kur viņi ir un ko viņiem nosūtīt.',
    barText: 'Atrodi savus pirmos klientus ar plānu, kas veidots no tavas saites.',
  },
};

// '/lv/example' -> { lang: 'lv', path: '/example' }; a path with no language prefix is English.
export function splitLang(pathname) {
  const m = /^\/([a-z]{2})(\/.*)?$/.exec(pathname);
  if (m && m[1] !== 'en' && LANGS.includes(m[1])) return { lang: m[1], path: m[2] || '/' };
  return { lang: 'en', path: pathname };
}

export const prefixOf = (lang) => (lang === 'en' ? '' : '/' + lang);

// The hreflang links for the home page: every language, plus x-default pointing at English.
export function hreflangLinks() {
  const one = (code, href) => `<link rel="alternate" hreflang="${code}" href="${href}">`;
  return LANGS.map((l) => one(l, SITE + (l === 'en' ? '/' : `/${l}/`))).concat(one('x-default', SITE + '/')).join('');
}
