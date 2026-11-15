// The one page of grow.flisk.si: the home page with the link box, and a saved plan at /p/<id> (drawn from /api/plan/<id>).
// Style: the inference.flisk.si look (square corners, hairline rules, Fraunces headings, mono labels, numbered sections).
// Everything the model wrote is put in with textContent, never as HTML.

const esc = (t) => String(t).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const CSS = String.raw`
:root{--bg:#eeece5;--bg2:#e5e2d9;--panel:#f6f4ee;--panel2:#e8e5dc;--ink:#121212;--mut:#3d3d42;--faint:#6a6a70;--line:rgba(18,18,18,.13);--line2:rgba(18,18,18,.82);
--acc:#22c55e;--accink:#04120a;--acctext:#137a3a;--tint:rgba(34,197,94,.12);--red:#be123c;--amber:#9a5300;
--display:"Fraunces",Georgia,"Times New Roman",serif;--font:"DM Sans",system-ui,-apple-system,"Segoe UI",sans-serif;--mono:"JetBrains Mono",ui-monospace,"SF Mono",Menlo,Consolas,monospace;color-scheme:light}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#0b0b0d;--bg2:#0f0f12;--panel:#111114;--panel2:#18181c;--ink:#ececf1;--mut:rgba(236,236,241,.7);--faint:rgba(236,236,241,.48);--line:rgba(255,255,255,.1);--line2:rgba(255,255,255,.62);--acctext:#6ee7a0;--red:#fb7185;--amber:#f5c26b;color-scheme:dark}}
:root[data-theme=dark]{--bg:#0b0b0d;--bg2:#0f0f12;--panel:#111114;--panel2:#18181c;--ink:#ececf1;--mut:rgba(236,236,241,.7);--faint:rgba(236,236,241,.48);--line:rgba(255,255,255,.1);--line2:rgba(255,255,255,.62);--acctext:#6ee7a0;--red:#fb7185;--amber:#f5c26b;color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 var(--font);-webkit-font-smoothing:antialiased;counter-reset:sec}
body::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;opacity:.05;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
a{color:inherit}h1,h2,h3{margin:0;line-height:1.1}h1,h2{font-family:var(--display);font-weight:800;letter-spacing:-.025em}
button,input{font:inherit;color:inherit}:focus-visible{outline:2px solid var(--acc);outline-offset:2px}
.wrap{position:relative;z-index:1;max-width:1120px;margin:0 auto;padding:0 36px;border-left:1px solid var(--line2);border-right:1px solid var(--line2);min-height:100vh}
.nav{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 -36px;padding:14px 36px;border-bottom:1px solid var(--line2)}
.brand{display:flex;align-items:center;gap:10px;font-family:var(--display);font-weight:800;font-size:21px;text-decoration:none;white-space:nowrap}.brand img{width:26px;height:26px}
.navr{display:flex;gap:4px}.navr a{font:600 11px var(--mono);text-transform:uppercase;letter-spacing:.08em;text-decoration:none;padding:8px 12px;border:1px solid transparent}.navr a:hover{border-color:var(--line2)}
.btn{display:inline-flex;align-items:center;gap:8px;white-space:nowrap;border:1px solid var(--line2);border-radius:0;background:transparent;padding:10px 16px;font:600 11px var(--mono);text-transform:uppercase;letter-spacing:.08em;text-decoration:none;cursor:pointer}
.btn:hover{background:var(--panel2)}.btn.go{background:var(--acc);border-color:var(--acc);color:var(--accink)}.btn.go::after{content:"\2192"}.btn.go:hover{filter:brightness(1.06)}.btn:disabled{opacity:.6;cursor:default}
.hero{display:grid;grid-template-columns:1.3fr .7fr;margin:0 -36px;border-bottom:1px solid var(--line2)}
.hero>div:first-child{padding:64px 40px 56px 36px;border-right:1px solid var(--line2)}
.kicker{font:600 11px var(--mono);text-transform:uppercase;letter-spacing:.12em;color:var(--faint)}
.hero h1{font-size:clamp(36px,4.4vw,56px);line-height:1;margin:20px 0}
.lead{font-size:18px;color:var(--mut);max-width:32em;margin:0 0 26px}
form{display:flex;max-width:600px}form input{flex:1;min-width:0;height:48px;padding:0 14px;border:1px solid var(--line2);border-right:0;border-radius:0;background:var(--panel);font:14px var(--mono)}form input:focus{outline:2px solid var(--acc);outline-offset:-2px}form .btn{height:48px}
.proof{display:flex;flex-wrap:wrap;gap:6px 18px;list-style:none;padding:0;margin:20px 0 0;color:var(--faint);font:500 12px var(--mono)}.proof li::before{content:"";display:inline-block;width:7px;height:7px;background:var(--acc);margin-right:9px;vertical-align:1px}
.band{background:repeating-linear-gradient(-45deg,var(--acc) 0 2px,transparent 2px 11px);min-height:120px}
.status{margin:14px 0 0;font:500 12.5px var(--mono);color:var(--mut);min-height:1.5em}.status.err{color:var(--red)}
section{margin:0 -36px;padding:52px 36px;border-bottom:1px solid var(--line2)}
section h2{font-size:clamp(28px,3.4vw,40px);margin-bottom:10px}
section h2::before{counter-increment:sec;content:counter(sec,decimal-leading-zero) " /";display:block;font:500 11px var(--mono);letter-spacing:.12em;color:var(--faint);margin-bottom:14px}
.sub{color:var(--mut);max-width:44em;margin:0 0 22px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--line2);border-left:1px solid var(--line2)}
.grid>*{background:var(--panel);padding:20px;min-width:0;border-right:1px solid var(--line2);border-bottom:1px solid var(--line2)}.grid h3{font-size:15.5px;margin:0 0 6px}.grid p{margin:0;color:var(--mut);font-size:14px}
a.cell{text-decoration:none;display:block}a.cell:hover{background:var(--panel2)}a.cell h3::after{content:" \2197";color:var(--faint);font-weight:400}
.score{display:flex;align-items:baseline;gap:10px}.score b{font-family:var(--display);font-weight:800;font-size:72px;line-height:1}.score span{font:600 13px var(--mono);color:var(--faint)}
.fix{border-top:1px solid var(--line);padding:12px 0}.fix:first-child{border-top:0;padding-top:0}.fix b{display:block}.fix p{margin:2px 0 0;color:var(--mut)}
.two{display:grid;grid-template-columns:.8fr 1.2fr;gap:1px;background:var(--line2);border:1px solid var(--line2)}.two>*{background:var(--panel);padding:22px;min-width:0}
.pitch{font-family:var(--display);font-size:24px;font-weight:700;line-height:1.25;margin:0 0 14px}
.today{border:1px solid var(--acc);background:var(--tint);padding:14px 16px;margin-top:16px}.today small{display:block;font:600 10.5px var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--acctext);margin-bottom:4px}
.mail{display:flex;flex-direction:column;gap:8px}.mail .to{font:600 10.5px var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--faint)}.mail h3{font-size:16px}
.mail pre{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.55 var(--font);color:var(--mut);flex:1}
.acts{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.acts .btn{padding:8px 11px;font-size:10.5px}
.code{border:1px solid var(--line2);background:var(--bg2);padding:16px;overflow:auto;font:12.5px/1.65 var(--mono);white-space:pre-wrap;overflow-wrap:anywhere;margin:0}
.share{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:18px}.share span{font:500 12px var(--mono);color:var(--faint);overflow-wrap:anywhere}
.note{font:500 12px var(--mono);color:var(--faint);margin-top:14px}
footer{margin:0 -36px;padding:22px 36px 40px;font:500 11px var(--mono);text-transform:uppercase;letter-spacing:.08em;color:var(--faint);display:flex;flex-wrap:wrap;gap:8px 18px}
.toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);background:var(--ink);color:var(--bg);padding:9px 16px;font:600 12px var(--mono);opacity:0;transition:opacity .2s;pointer-events:none;z-index:9}.toast.show{opacity:1}
[hidden]{display:none!important}
@media(max-width:860px){.wrap{padding:0 16px}.nav,.hero,section,footer{margin:0 -16px;padding-left:16px;padding-right:16px}.hero{grid-template-columns:1fr}.hero>div:first-child{padding:40px 16px 32px;border-right:0;border-bottom:1px solid var(--line2)}.band{min-height:44px}
 .grid{grid-template-columns:repeat(2,1fr)}.two{grid-template-columns:1fr}}
@media(max-width:560px){.grid{grid-template-columns:1fr}form{flex-direction:column}form input{flex:none;border-right:1px solid var(--line2);border-bottom:0}.navr a.hide-s{display:none}}
@media(prefers-reduced-motion:reduce){*{transition:none!important}}
`;

// Runs in the browser. No template placeholders and no backslashes inside, on purpose.
const JS = String.raw`
const $ = (s) => document.querySelector(s);
const el = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; };
const toast = (t) => { const n = $('#toast'); n.textContent = t; n.classList.add('show'); setTimeout(() => n.classList.remove('show'), 1600); };
const copy = (t, b) => { if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => toast('Copied')); };
const link = (label, href, cls) => { const a = el('a', 'btn' + (cls ? ' ' + cls : ''), label); a.href = href; a.target = '_blank'; a.rel = 'noopener'; return a; };
const button = (label, fn) => { const b = el('button', 'btn', label); b.type = 'button'; b.onclick = fn; return b; };
function section(title, sub) { const s = el('section'); s.append(el('h2', '', title)); if (sub) s.append(el('p', 'sub', sub)); return s; }
function host(u) { try { return new URL(u).host; } catch (e) { return u; } }

function draw(id, plan) {
  const out = $('#plan'); out.replaceChildren();
  document.title = 'Grow plan for ' + host(plan.url) + ' · Flisk Grow';

  const head = section('A plan for ' + host(plan.url), plan.product || '');
  const share = el('div', 'share');
  const here = location.origin + '/p/' + id;
  share.append(button('Copy link to this plan', () => copy(here)), link('Open the site', plan.url), el('span', '', 'Kept 30 days: ' + here));
  head.append(share); out.append(head);

  const c = section('Can AI search find it', 'ChatGPT, Claude and Perplexity answer from pages they can read. Citable checks yours.');
  if (plan.check) {
    const g = el('div', 'two');
    const left = el('div'); const sc = el('div', 'score'); sc.append(el('b', '', String(plan.check.score)), el('span', '', '/100 · ' + plan.check.grade)); left.append(sc);
    const a = el('div', 'acts'); a.append(link('Full report on Citable', plan.check.report)); left.append(a);
    const right = el('div');
    if (plan.check.fixes.length) plan.check.fixes.forEach((f) => { const d = el('div', 'fix'); d.append(el('b', '', f.title), el('p', '', f.summary)); right.append(d); });
    else right.append(el('p', '', 'Nothing to fix: AI search can read this page.'));
    g.append(left, right); c.append(g);
  } else c.append(el('p', 'note', 'The check did not answer this time. Try it on citable.flisk.si.'));
  out.append(c);

  const b = section('Who would buy it');
  const two = el('div', 'two'); const l = el('div'); l.append(el('p', 'pitch', plan.pitch || '')); const r = el('div'); r.append(el('p', '', plan.buyers));
  if (plan.today) { const t = el('div', 'today'); t.append(el('small', '', 'Do this today'), el('div', '', plan.today)); r.append(t); }
  two.append(l, r); b.append(two); out.append(b);

  const p = section('Where to find them', 'Places these buyers already talk. Read the rules of each place before you post.');
  const pg = el('div', 'grid');
  plan.places.forEach((x) => { const cell = el(x.url ? 'a' : 'div', x.url ? 'cell' : ''); if (x.url) { cell.href = x.url; cell.target = '_blank'; cell.rel = 'noopener'; } cell.append(el('h3', '', x.name), el('p', '', x.why)); pg.append(cell); });
  p.append(pg); out.append(p);

  const m = section('Emails to send (' + plan.emails.length + ')', 'Drafts only. Add the address in your mail and press Send yourself: nothing is sent for you.');
  const mg = el('div', 'grid');
  plan.emails.forEach((e) => {
    const d = el('div', 'mail'); d.append(el('div', 'to', 'To: ' + (e.to || 'someone who fits')), el('h3', '', e.subject), el('pre', '', e.body));
    const a = el('div', 'acts');
    a.append(link('Open in Gmail', 'https://mail.google.com/mail/?view=cm&fs=1&su=' + encodeURIComponent(e.subject) + '&body=' + encodeURIComponent(e.body), 'go'),
      link('Mail app', 'mailto:?subject=' + encodeURIComponent(e.subject) + '&body=' + encodeURIComponent(e.body)),
      button('Copy', () => copy(e.subject + '\n\n' + e.body)));
    d.append(a); mg.append(d);
  });
  m.append(mg); out.append(m);

  if (plan.posts && plan.posts.length) {
    const s = section('Posts to write', 'Opens the post box with the text filled in. You read it, change it and post it yourself.');
    const sg = el('div', 'grid');
    plan.posts.forEach((x) => {
      const d = el('div', 'mail'); d.append(el('div', 'to', x.where), el('h3', '', x.title), el('pre', '', x.body));
      const a = el('div', 'acts');
      if (x.where === 'X') a.append(link('Open in X', 'https://x.com/intent/post?text=' + encodeURIComponent((x.body || x.title) + ' ' + plan.url), 'go'));
      if (x.where === 'Reddit') a.append(link('Open in Reddit', 'https://www.reddit.com/submit?url=' + encodeURIComponent(plan.url) + '&title=' + encodeURIComponent(x.title), 'go'));
      if (x.where === 'Hacker News') a.append(link('Open in Hacker News', 'https://news.ycombinator.com/submitlink?u=' + encodeURIComponent(plan.url) + '&t=' + encodeURIComponent(x.title), 'go'));
      a.append(button('Copy', () => copy((x.title ? x.title + '\n\n' : '') + x.body)));
      d.append(a); sg.append(d);
    });
    s.append(sg); out.append(s);
  }

  const li = section('Where to list it', 'Directories and launch lists. Each one is a link to its own submit page.');
  const lg = el('div', 'grid');
  plan.listings.forEach((x) => { const a = el('a', 'cell'); a.href = x.url; a.target = '_blank'; a.rel = 'noopener'; a.append(el('h3', '', x.name), el('p', '', x.why)); lg.append(a); });
  li.append(lg); out.append(li);

  const t = section('More free checks');
  const tg = el('div', 'grid');
  plan.tools.forEach((x) => { const a = el('a', 'cell'); a.href = x.url; a.target = '_blank'; a.rel = 'noopener'; a.append(el('h3', '', x.name), el('p', '', x.why)); tg.append(a); });
  t.append(tg); out.append(t);
  out.hidden = false; $('#about').hidden = true;
}

const STEPS = ['Reading the page', 'Checking if AI search can read it', 'Finding who would buy it', 'Writing the emails', 'Writing the posts'];
async function make(ev) {
  ev.preventDefault();
  const url = $('#url').value.trim(); const st = $('#status'); const go = $('#go');
  st.className = 'status';
  if (!/^https?:[/][/][^ ]+[.][^ ]+/.test(url)) { st.className = 'status err'; st.textContent = 'Paste a full link that starts with https://'; return; }
  go.disabled = true; let i = 0; st.textContent = STEPS[0] + '...';
  const tick = setInterval(() => { i = Math.min(i + 1, STEPS.length - 1); st.textContent = STEPS[i] + '...'; }, 4000);
  try {
    const r = await fetch('/api/plan', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url }), signal: AbortSignal.timeout(100000) })
      .catch((e) => { throw new Error(e.name === 'TimeoutError' ? 'The plan took too long. Press the button again in a minute.' : 'Could not reach the server. Check your connection and press the button again.'); });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'Something went wrong. Press the button again.');
    history.pushState(null, '', '/p/' + j.id);
    st.textContent = j.reused ? 'This link got a plan today already; here it is.' : 'Done. The plan is below.';
    draw(j.id, j.plan); document.getElementById('plan').scrollIntoView({ behavior: 'smooth' });
  } catch (e) { st.className = 'status err'; st.textContent = e.message; }
  finally { clearInterval(tick); go.disabled = false; }
}

async function load(id) {
  const st = $('#status'); st.textContent = 'Opening the plan...';
  try {
    const r = await fetch('/api/plan/' + id); const j = await r.json();
    if (!r.ok) throw new Error(j.error);
    $('#url').value = j.plan.url; st.textContent = ''; draw(id, j.plan);
  } catch (e) { st.className = 'status err'; st.textContent = e.message || 'This plan is not here.'; }
}

$('#form').addEventListener('submit', make);
if (window.PLAN_ID) load(window.PLAN_ID);
`;

export function page({ planId = '', prefill = '' } = {}) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Flisk Grow: find your first customers</title>
<meta name="description" content="Paste a link to what you made. Get who would buy it, where they are, 5 email drafts, 3 post drafts, an AI search check and where to list it. Free, no sign-in.">
<meta property="og:title" content="Flisk Grow: find your first customers"><meta property="og:description" content="Who would buy it, where they are, and what to send them. Free, no sign-in.">
<link rel="icon" href="/icon.svg" type="image/svg+xml"><link rel="canonical" href="https://grow.flisk.si/">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Fraunces:opsz,wght@9..144,700;9..144,800&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body>
<script src="https://flisk.si/assets/bar.js" defer></script>
<div class="wrap">
<header class="nav"><a class="brand" href="/"><img src="/icon.svg" alt="">Flisk Grow</a>
<nav class="navr"><a href="#api" class="hide-s">API</a><a href="https://github.com/flisk-sh/grow" class="hide-s">GitHub</a><a href="https://flisk.si">More from Flisk</a></nav></header>
<div class="hero"><div>
<div class="kicker">Beta · free · no sign-in</div>
<h1>Find your first customers.</h1>
<p class="lead">Paste a link to what you made. Get who would buy it, where they are, emails and posts to send, whether AI search can read your page, and where to list it.</p>
<form id="form" novalidate><input id="url" type="url" inputmode="url" autocomplete="url" placeholder="https://your-site.com" aria-label="Link to your site" value="${esc(prefill)}"><button id="go" class="btn go" type="submit">Make my plan</button></form>
<p id="status" class="status" role="status" aria-live="polite"></p>
<ul class="proof"><li>About 20 seconds</li><li>Nothing is sent for you</li><li>Plans kept 30 days</li></ul>
</div><div class="band" aria-hidden="true"></div></div>
<div id="plan" hidden></div>
<div id="about">
<section><h2>What you get</h2><p class="sub">One page with everything for the first week, made from your own page.</p>
<div class="grid">
<div><h3>Can AI search find it</h3><p>A score out of 100 from Citable and the top fixes, so ChatGPT and Perplexity can quote you.</p></div>
<div><h3>Who would buy it</h3><p>A narrow first group, the problem they have today, and a one-line pitch.</p></div>
<div><h3>Where to find them</h3><p>5 to 8 real communities, forums and lists where those people already talk.</p></div>
<div><h3>Emails to send</h3><p>5 short drafts. One click opens each in Gmail or your mail app; you press Send.</p></div>
<div><h3>Posts to write</h3><p>Drafts for X, Reddit and Hacker News that open the post box filled in.</p></div>
<div><h3>Where to list it</h3><p>Show HN, Product Hunt, SaaSHub, AlternativeTo and more, each a link to its submit page.</p></div>
</div></section>
<section id="api"><h2>API</h2><p class="sub">The same plan as JSON, for scripts and agents. Same free limits: 3 plans a day per visitor.</p>
<pre class="code">curl -s https://grow.flisk.si/api/plan \\
  -H 'content-type: application/json' \\
  -d '{"url": "https://your-site.com"}'</pre>
<p class="note">Answers {"id", "plan"}. Read a saved plan with GET /api/plan/&lt;id&gt;.</p></section>
</div>
<footer><span>Flisk Grow · beta</span><a href="https://flisk.si">flisk.si</a><a href="https://github.com/flisk-sh/grow">Source</a><a href="/llms.txt">llms.txt</a></footer>
</div>
<div id="toast" class="toast" role="status"></div>
<script>window.PLAN_ID=${JSON.stringify(planId)};${JS}</script>
</body></html>`;
}
