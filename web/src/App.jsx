import {useEffect, useMemo, useState} from 'react';
import {AppShell, useAppShellMobile} from '@astryxdesign/core/AppShell';
import {MobileNav, MobileNavToggle} from '@astryxdesign/core/MobileNav';
import {SideNav, SideNavItem, SideNavSection, SideNavRenderContext} from '@astryxdesign/core/SideNav';
import {HStack, VStack} from '@astryxdesign/core/Layout';
import {Card} from '@astryxdesign/core/Card';
import {Badge} from '@astryxdesign/core/Badge';
import {Button} from '@astryxdesign/core/Button';
import {Icon} from '@astryxdesign/core/Icon';
import {Text, Heading} from '@astryxdesign/core/Text';
import {Banner} from '@astryxdesign/core/Banner';
import {TextInput} from '@astryxdesign/core/TextInput';
import {CheckboxInput} from '@astryxdesign/core/CheckboxInput';
import {ProgressBar} from '@astryxdesign/core/ProgressBar';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {
  ArrowTopRightOnSquareIcon, ClipboardDocumentIcon, EnvelopeIcon, PaperAirplaneIcon, BookmarkIcon, ShareIcon, ArrowDownTrayIcon, SparklesIcon,
  MagnifyingGlassIcon, ChartBarIcon, MegaphoneIcon, ListBulletIcon, WrenchScrewdriverIcon, PlusIcon, UsersIcon, MapPinIcon, ArrowRightIcon,
  BriefcaseIcon, PencilSquareIcon, HomeIcon, RocketLaunchIcon, LinkIcon, DocumentTextIcon, ClipboardDocumentCheckIcon, ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import {Logo, Names} from './logos.jsx';
import {GmailCard} from './cards/GmailCard.jsx';
import {postCardFor} from './cards/PostCard.jsx';
import Cabinet from './Cabinet.jsx';
import {PREFIX, t} from './i18n.js';

const GitHubIcon = () => <Logo name="GitHub" size={18} />;
const ic = (I) => <Icon icon={I} size="sm" />;
const lg = (name, url) => <Logo name={name} url={url} size={18} />;
const BOOT = window.__BOOT__ || {};

// ---------- helpers ----------
const host = (u) => { try { return new URL(u).host; } catch { return String(u); } };
function planName(u) {
  try {
    const x = new URL(u); const h = x.host.replace(/^www\./, '');
    if (/^(github\.com|gitlab\.com|bitbucket\.org)$/.test(h)) { const p = x.pathname.split('/').filter(Boolean); if (p[1]) return p[1].replace(/\.git$/, ''); }
    return x.host;
  } catch { return String(u); }
}
const clip = (t, n) => (t.length > n ? t.slice(0, n - 1) + '…' : t);
const enc = encodeURIComponent;
const gmail = (e) => 'https://mail.google.com/mail/?view=cm&fs=1&su=' + enc(e.subject) + '&body=' + enc(e.body);
const mailto = (e) => 'mailto:?subject=' + enc(e.subject) + '&body=' + enc(e.body);
const withScheme = (t) => { const v = String(t || '').trim(); return v && !/^[a-z][a-z0-9+.-]*:\/\//i.test(v) ? 'https://' + v : v; };
const planLink = (id) => location.origin + PREFIX + (id === 'example' ? '/example' : id ? '/p/' + id : '/');
const BSKY = (n) => n === 'Bluesky';
// Instagram has no "write a post" link, so its button opens Instagram and the text is copied beside it.
const POST = (t, n) => n === 'Instagram' ? 'https://www.instagram.com/' : (BSKY(n) ? 'https://bsky.app/intent/compose?text=' : 'https://x.com/intent/post?text=') + enc(t);
function postHref(x, plan) {
  const body = (x.body || x.title || '') + ' ' + plan.url;
  if (x.where === 'X') return 'https://x.com/intent/post?text=' + enc(body);
  if (x.where === 'Reddit') return 'https://www.reddit.com/submit?url=' + enc(plan.url) + '&title=' + enc(x.title || '');
  if (x.where === 'Hacker News') return 'https://news.ycombinator.com/submitlink?u=' + enc(plan.url) + '&t=' + enc(x.title || '');
  return '';
}
const LAUNCH = /product hunt|betalist|uneed|devhunt|foundrlist|launchamp|show hn|peerlist/i;

function toast(t) {
  const n = document.createElement('div'); n.className = 'toast-mini'; n.textContent = t; n.setAttribute('role', 'status');
  Object.assign(n.style, {position: 'fixed', left: '50%', bottom: '24px', transform: 'translateX(-50%)', background: '#111', color: '#fff', padding: '9px 16px', borderRadius: '999px', fontSize: '13px', zIndex: 99});
  document.body.append(n); setTimeout(() => n.remove(), 1700);
}
const copy = (t) => { if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => toast('Copied'), () => toast('Could not copy here. Select the text and copy it yourself.')); else toast('Could not copy here. Select the text and copy it yourself.'); };
const saveFile = (name, type, text) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], {type})); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };

function planMd(id, plan) {
  const L = ['# Grow plan for ' + planName(plan.url), '', plan.product || '', '', '## Do this today', plan.today || '', '', '## Where to find buyers'];
  (plan.places || []).forEach((x) => L.push('- [ ] ' + x.name + (x.url ? ' ' + x.url : '') + ': ' + x.why));
  L.push('', '## Emails'); (plan.emails || []).forEach((e) => L.push('- [ ] ' + e.subject + ' (to ' + (e.to || 'someone who fits') + ')'));
  L.push('', '## Posts'); (plan.posts || []).forEach((x) => L.push('- [ ] ' + x.where + ': ' + (x.title || clip(x.body, 60))));
  L.push('', '## Listings'); (plan.listings || []).forEach((x) => L.push('- [ ] ' + x.name + ' ' + x.url));
  L.push('', 'Plan: ' + planLink(id)); return L.join('\n');
}

// Sign-in is only ever asked for here, when a person chooses to keep a plan.
async function saveSite(id, plan) {
  await fetch('/me');
  const r = await fetch('/api/sites', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({url: plan.url, plan: id})});
  const j = await r.json(); if (j.error) throw new Error(j.error); return j;
}

const doneKey = (id) => 'grow-done:' + (id || 'guide');
const loadDone = (id) => { try { return new Set(JSON.parse(localStorage.getItem(doneKey(id)) || '[]')); } catch { return new Set(); } };

// ---------- building blocks ----------
function OpenBtn({label, href, logo, primary, icon}) {
  return <Button label={label} size="sm" variant={primary ? 'primary' : 'secondary'} href={href} target="_blank" icon={logo || ic(icon || ArrowTopRightOnSquareIcon)} />;
}
const CopyBtn = ({text, label = 'Copy'}) => <Button label={label} size="sm" variant="ghost" icon={ic(ClipboardDocumentIcon)} onClick={() => copy(text)} />;

function Section({title, sub, icon, count, children}) {
  return (
    <Card><VStack gap={3}>
      <VStack gap={1}>
        <HStack gap={2} align="center">{icon && <Icon icon={icon} size="md" />}<Heading level={3}><Names text={title} /></Heading>{count != null && <Badge label={String(count)} />}</HStack>
        {sub && <Text type="supporting" color="secondary"><Names text={sub} /></Text>}
      </VStack>
      {children}
    </VStack></Card>
  );
}

function Row({id, done, toggle, logo, title, text, actions}) {
  const on = done.has(id);
  return (
    <Card variant="subtle"><HStack gap={3} align="start">
      <CheckboxInput label={'Done: ' + title} isLabelHidden value={on} onChange={() => toggle(id)} />
      {logo}
      <VStack gap={1} style={{flex: 1, minWidth: 0}} className={on ? 'done' : ''}>
        <Text weight="semibold">{title}</Text>
        {text && <Text type="supporting" color="secondary" style={{overflowWrap: 'anywhere'}}><Names text={text} /></Text>}
        {actions && <HStack gap={2} wrap="wrap">{actions}</HStack>}
      </VStack>
    </HStack></Card>
  );
}

function Draft({id, done, toggle, to, title, body, actions, logo}) {
  const on = done.has(id);
  return (
    <Card variant="subtle"><VStack gap={2} className={on ? 'done' : ''}>
      <HStack gap={2} align="center"><CheckboxInput label={'Done: ' + title} isLabelHidden value={on} onChange={() => toggle(id)} />{logo}<Text type="supporting" color="secondary">{to}</Text></HStack>
      <Text weight="semibold">{title}</Text>
      <div className="pre">{body}</div>
      <HStack gap={2} wrap="wrap">{actions}</HStack>
    </VStack></Card>
  );
}

// ---------- plan ----------
function StepBody({step, plan, id, done, toggle, goAbout, rw}) {
  const p = plan;
  const row = (key, logoEl, title, text, actions) => <Row key={key} id={key} done={done} toggle={toggle} logo={logoEl} title={title} text={text} actions={actions} />;
  if (step === 0) return <VStack gap={4}>
    <Section title="Can AI search find it" icon={MagnifyingGlassIcon} sub="ChatGPT, Claude and Perplexity answer from pages they can read. Citable checks yours.">
      {p.check ? <div className="cols">
        <HStack gap={3} align="center"><div className="ring" style={{'--p': p.check.score, '--c': p.check.score >= 70 ? '#22a55a' : p.check.score >= 40 ? '#e0a000' : '#d33'}}><b>{p.check.score}<small>/100 · {p.check.grade}</small></b></div>
          <VStack gap={2}><Text weight="semibold">{p.check.score >= 70 ? 'AI search can read it' : 'Fix these first'}</Text>
            <OpenBtn label="Full report on Citable" href={p.check.report} logo={lg('Citable')} primary /></VStack></HStack>
        <VStack gap={3}>{p.check.fixes.length ? p.check.fixes.map((f, i) => (
          <HStack key={f.title} gap={2} align="start"><Badge label={f.status === 'pass' ? 'OK' : f.status === 'warn' ? 'Warn' : 'Fail'} variant={f.status === 'pass' ? 'success' : f.status === 'warn' ? 'warning' : 'error'} />
            <VStack gap={0} style={{flex: 1}}><Text weight="semibold"><Names text={f.title} /></Text><Text type="supporting" color="secondary"><Names text={f.summary} /></Text></VStack><CopyBtn text={f.title + ': ' + f.summary} /></HStack>)) : <Text color="secondary">Nothing to fix: AI search can read this page.</Text>}</VStack>
      </div> : <HStack gap={3} align="center"><Text color="secondary">{p.noSite ? 'This link is a GitHub repo, so there is no page of yours to check. Add your website and make the plan again.' : 'The check did not answer this time.'}</Text><OpenBtn label="Try on Citable" href="https://citable.flisk.si" logo={lg('Citable')} /></HStack>}
    </Section>
    <GapsCard id={id} plan={p} />
    {p.ranker && <Section title="Your rank on Ranker" icon={ChartBarIcon} sub={p.ranker.listed ? 'Ranker ranks ' + p.ranker.repo + ' by stars gained each day.' : 'Ranker could not list ' + p.ranker.repo + ' just now.'}>
      <HStack gap={2} wrap="wrap">{p.ranker.badge && <img src={p.ranker.badge} alt="Flisk Ranker badge" width="250" height="55" />}<OpenBtn label={p.ranker.listed ? 'Open on Ranker' : 'List it on Ranker'} href={p.ranker.url} logo={lg('Ranker')} primary />{p.ranker.markdown && <CopyBtn text={p.ranker.markdown} label="Copy badge" />}</HStack></Section>}
    {(p.tools || []).length > 0 && <Section title="More free checks" icon={WrenchScrewdriverIcon}><VStack gap={2}>{p.tools.map((x, i) => <Card key={'tool' + i} variant="subtle"><HStack gap={3} align="start">{lg(x.name, x.url)}<VStack gap={1} style={{flex: 1, minWidth: 0}}><Text weight="semibold">{x.name}</Text><Text type="supporting" color="secondary" style={{overflowWrap: 'anywhere'}}>{x.why}</Text><HStack gap={2} wrap="wrap"><OpenBtn label="Open" href={x.url} /></HStack></VStack></HStack></Card>)}</VStack></Section>}
  </VStack>;

  if (step === 1) return <VStack gap={4}>
    <Section title="Who would buy it" icon={UsersIcon}>
      <div className="cols"><Heading level={3}>{p.pitch}</Heading>
        <VStack gap={3}><Text>{p.buyers}</Text>
          {p.today && <Card variant="blue"><VStack gap={1}><Text type="supporting" weight="semibold">Do this today</Text><Text>{p.today}</Text></VStack></Card>}
          {p.pitch && <div><CopyBtn text={p.pitch} label="Copy the pitch" /></div>}</VStack></div>
    </Section>
    <Section title="Where to find them" icon={MapPinIcon} sub="Places these buyers already talk. Read the rules of each place before you post.">
      <div className="grid">{(p.places || []).map((x, i) => row('place' + i, lg(x.name, x.url), x.name, x.why, x.url && <OpenBtn label="Open" href={x.url} />))}</div></Section>
    {(p.promo || []).length > 0 && <Section title="Where you may promote yourself" icon={MegaphoneIcon} sub="Communities with a place for your own work, each with its own rule.">
      <div className="grid">{p.promo.map((x, i) => row('promo' + i, lg(x.where || x.name, x.url), x.name, x.rule, <OpenBtn label="Open" href={x.url} />))}</div></Section>}
  </VStack>;

  if (step === 2) return <Section title="Emails to send" icon={EnvelopeIcon} count={(p.emails || []).length} sub="Drafts only. Add the address in your mail and press Send yourself: nothing is sent for you.">
    <div className="grid">{(p.emails || []).map((e, i) => <GmailCard key={i + ':' + e.subject + e.body} id={'mail' + i} done={done} toggle={toggle} email={e} rewrite={rw('email', i)}
      actions={<>
        <OpenBtn label="Open in Gmail" href={gmail(e)} logo={lg('Gmail')} primary />
        <OpenBtn label="Mail app" href={mailto(e)} icon={EnvelopeIcon} />
        {e.followup && <OpenBtn label="Day 7 follow-up" href={'https://mail.google.com/mail/?view=cm&fs=1&su=' + enc('Re: ' + e.subject) + '&body=' + enc(e.followup)} icon={PaperAirplaneIcon} />}
        <CopyBtn text={e.subject + '\n\n' + e.body} /></>} />)}</div></Section>;

  if (step === 3) return <Section title="Posts to write" icon={PencilSquareIcon} count={(p.posts || []).length} sub="Opens the post box with the text filled in. You read it, change it and post it yourself.">
    <div className="grid">{(p.posts || []).length ? p.posts.map((x, i) => { const h = postHref(x, p); const Card = postCardFor(x.where);
      const actions = <>{h && <OpenBtn label={'Open in ' + x.where} href={h} logo={lg(x.where)} primary />}<CopyBtn text={(x.title ? x.title + '\n\n' : '') + x.body} /></>;
      return Card ? <Card key={i + ':' + x.body} id={'post' + i} done={done} toggle={toggle} post={x} plan={p} rewrite={rw('post', i)} actions={actions} />
        : <Draft key={i} id={'post' + i} done={done} toggle={toggle} logo={lg(x.where)} to={x.where} title={x.title || clip(x.body, 60)} body={x.body} actions={actions} />; }) : <Text color="secondary">No post drafts this time. Press the button again for drafts for <Names text="X, Reddit and Hacker News" />.</Text>}</div></Section>;

  const ls = p.listings || [];
  const lrow = (x, i) => row('list' + i, lg(x.name, x.url), x.name, x.why, <OpenBtn label="Submit" href={x.url} logo={lg(x.name, x.url)} primary />);
  return <VStack gap={4}>
    <Section title="Launch sites" icon={RocketLaunchIcon} sub="One day of attention, best on a weekday."><div className="grid">{ls.map((x, i) => [x, i]).filter(([x]) => LAUNCH.test(x.name)).map(([x, i]) => lrow(x, i))}</div></Section>
    <Section title="Directories" icon={ListBulletIcon} sub="People search these; they keep sending visitors."><div className="grid">{ls.map((x, i) => [x, i]).filter(([x]) => !LAUNCH.test(x.name)).map(([x, i]) => lrow(x, i))}</div></Section>
  </VStack>;
}

function GapsCard({id, plan}) {
  const [state, setState] = useState({busy: false, out: null, err: ''});
  const go = async () => {
    setState({busy: true, out: null, err: ''});
    try {
      const a = await saveSite(id, plan);
      const j = await fetch('/api/sites/' + a.id + '/jobs', {method: 'POST', headers: {'content-type': 'application/json'}, body: '{}'}).then((r) => r.json());
      if (j.error) throw new Error(j.error);
      setState({busy: false, out: {...j, site: a.id}, err: ''});
    } catch (e) { setState({busy: false, out: null, err: e.message}); }
  };
  return (
    <Section title="Get the gaps done" icon={BriefcaseIcon} sub="Posts the checks a bot really does to jobs.flisk.si: can AI search find your site, and how good is your README. Free and public.">
      <HStack gap={2} wrap="wrap">
        <Button label={state.out ? 'Posted' : 'Post as jobs'} variant="primary" icon={lg('jobs.flisk.si')} isDisabled={state.busy || !!state.out} onClick={go} />
        {state.out && (state.out.posted || []).map((x) => <OpenBtn key={x.link} label={x.title} href={x.link} logo={lg('jobs.flisk.si')} />)}
        {state.out && <OpenBtn label="See them in my cabinet" href={'/me?site=' + state.out.site} icon={HomeIcon} />}
      </HStack>
      {state.err && <Banner status="error" title={state.err} />}
      <Text type="supporting" color="secondary">Posting keeps the plan in your cabinet, so this is where a sign-in is asked, and only here.</Text>
    </Section>
  );
}

const STEPS = [
  {k: 'ready', t: 'Get ready', icon: ClipboardDocumentCheckIcon, say: 'Make your page readable for AI search and people before you send anyone to it.'},
  {k: 'buyers', t: 'Find buyers', icon: UsersIcon, say: 'Who buys first, and the places they already talk.'},
  {k: 'reach', t: 'Reach out', icon: EnvelopeIcon, say: 'A few emails a day. Gmail opens with the draft filled in; you press Send.'},
  {k: 'post', t: 'Post', icon: PencilSquareIcon, say: 'Post where your buyers read. You read, change and post each one yourself.'},
  {k: 'listed', t: 'Get listed', icon: RocketLaunchIcon, say: 'Directories and launch lists. Each link opens its submit page.'},
];

function Followers({plan, id, done, toggle}) {
  const net = plan.network || 'X';
  return <VStack gap={4}>
    <Section title="Who should follow you" icon={UsersIcon}><div className="cols"><VStack gap={2}><Heading level={3}>{plan.bio}</Heading>{plan.bio && <div><CopyBtn text={plan.bio} label="Copy bio" /></div>}</VStack>
      <VStack gap={3}><Text>{plan.audience}</Text>{plan.today && <Card variant="blue"><VStack gap={1}><Text type="supporting" weight="semibold">Do this today</Text><Text>{plan.today}</Text></VStack></Card>}</VStack></div></Section>
    {plan.pinned && <Section title="Your pinned post" icon={PencilSquareIcon} sub="The first thing a stranger sees."><div className="pre">{plan.pinned}</div><HStack gap={2}><OpenBtn label={'Open in ' + net} href={POST(plan.pinned, net)} logo={lg(net)} primary /><CopyBtn text={plan.pinned} /></HStack></Section>}
    <Section title="Your first 7 days" icon={ListBulletIcon} sub="About 20 minutes a day."><div className="grid">{(plan.week || []).map((x, i) => <Row key={i} id={'day' + i} done={done} toggle={toggle} logo={ic(ListBulletIcon)} title={x.day} text={x.do} />)}</div></Section>
    <Section title="Posts to write" icon={PencilSquareIcon} count={(plan.posts || []).length}><div className="grid">{(plan.posts || []).map((x, i) => { const Card = postCardFor(net);
      const actions = <><OpenBtn label={'Open in ' + net} href={POST(x.body, net)} logo={lg(net)} primary /><CopyBtn text={x.body} /></>;
      return Card ? <Card key={i + ':' + x.body} id={'post' + i} done={done} toggle={toggle} post={{...x, where: net}} plan={plan} rewrite={null} actions={actions} />
        : <Draft key={i} id={'post' + i} done={done} toggle={toggle} logo={lg(net)} to={net} title={x.title} body={x.body} actions={actions} />; })}</div>
    </Section>
    {(plan.accounts || []).length > 0 && <Section title="Accounts to follow and answer" icon={ChatBubbleLeftRightIcon}><div className="grid">{plan.accounts.map((x, i) => <Row key={i} id={'acc' + i} done={done} toggle={toggle} logo={lg(net)} title={x.name} text={x.why} />)}</div></Section>}
  </VStack>;
}

function PlanView({id, plan, onPlan}) {
  const [busyKey, setBusyKey] = useState('');
  const ex = id === 'example';
  const [step, setStep] = useState(() => { const m = location.hash.match(/step-([1-5])/); return m ? +m[1] - 1 : 0; });
  const [done, setDone] = useState(() => loadDone(id));
  const [full, setFull] = useState(() => /step-/.test(location.hash));
  const [saveAsk, setSaveAsk] = useState('');
  // The sparkle menu on a card: a ready-made change or free text goes to the model, and the new plan replaces this one.
  const rw = (kind, index) => {
    if (!id || id === 'example' || plan.generic || !onPlan) return null;
    const key = kind + index;
    return {busy: busyKey === key, onPick: async (tweak, note) => {
      setBusyKey(key);
      try {
        const r = await fetch('/api/rewrite', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({id, kind, index, tweak: tweak || undefined, note: note || undefined})});
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || 'The rewrite did not work. Press again.');
        setDone((d) => { const n = new Set(d); n.delete((kind === 'email' ? 'mail' : kind) + index); try { localStorage.setItem(doneKey(id), JSON.stringify([...n])); } catch { /* storage blocked */ } return n; });
        onPlan(j.plan); toast('Rewritten');
      } catch (e) { toast(e.message); } finally { setBusyKey(''); }
    }};
  };
  const toggle = (k) => setDone((d) => { const n = new Set(d); n.has(k) ? n.delete(k) : n.add(k); try { localStorage.setItem(doneKey(id), JSON.stringify([...n])); } catch { /* storage blocked */ } return n; });
  useEffect(() => { document.title = (plan.kind === 'followers' ? 'Followers plan for @' + plan.handle : 'Grow plan for ' + planName(plan.url)) + ' · Flisk Grow'; }, [plan]);
  const title = plan.kind === 'followers' ? 'A followers plan for @' + plan.handle : 'A plan for ' + planName(plan.url);

  const e0 = (plan.emails || [])[0];
  const f0 = plan.check && plan.check.fixes.find((f) => f.status !== 'pass');
  const p0 = (plan.posts || []).map((x) => [x, postHref(x, plan)]).find(([x, h]) => h);
  const l0 = (plan.listings || [])[0];
  const nexts = [
    e0 && {n: 3, label: 'Email your first buyer', sub: 'To: ' + (e0.to || 'someone who fits'), icon: lg('Gmail'), href: gmail(e0), cta: 'Open in Gmail'},
    f0 && {n: 1, label: 'Fix the top problem', sub: f0.title, icon: ic(MagnifyingGlassIcon), go: 0, cta: 'Show the fix'},
    p0 && {n: 4, label: 'Post on ' + p0[0].where, sub: p0[0].title || clip(p0[0].body, 60), icon: lg(p0[0].where), href: p0[1], cta: 'Open ' + p0[0].where},
    l0 && {n: 5, label: 'Get listed on ' + l0.name, sub: clip(l0.why || 'Open the submit page', 70), icon: lg(l0.name, l0.url), href: l0.url, cta: 'Open ' + l0.name},
  ].filter(Boolean);

  const save = async () => { try { const j = await saveSite(id, plan); location.href = '/me?site=' + j.id; } catch (e) { setSaveAsk(e.message || 'Sign in to save this plan.'); } };
  const share = () => { const u = planLink(id); if (navigator.share) navigator.share({title: document.title, url: u}).catch(() => {}); else copy(u); };
  const total = (plan.emails || []).length + (plan.posts || []).length + (plan.listings || []).length + (plan.places || []).length;

  return (
    <div className="page"><VStack gap={4}>
      <HStack gap={3} align="start" justify="space-between" wrap="wrap">
        <VStack gap={2} style={{flex: 1, minWidth: 260}}>
          <Text type="supporting" color="secondary">{ex ? 'An example plan · paste your own link on the home page' : id ? 'Your plan · kept 30 days' : 'A general guide'}</Text>
          <HStack gap={2} align="center">{plan.kind !== 'followers' && <Logo name={planName(plan.url)} url={plan.url} size={28} />}<Heading level={1}>{title}</Heading></HStack>
          {(plan.product || plan.account) && <Text color="secondary">{plan.product || plan.account}</Text>}
          <HStack gap={2} wrap="wrap"><Badge label="Nothing is posted for you" /><Badge label={done.size + ' of ' + total + ' done'} variant="blue" />{plan.generic && <Badge label="General guide" variant="warning" />}</HStack>
        </VStack>
        <HStack gap={2} wrap="wrap">
          {!ex && <Button label="Save to my cabinet" variant="primary" icon={ic(BookmarkIcon)} onClick={save} />}
          {id && <Button label="Share" variant="secondary" icon={ic(ShareIcon)} onClick={share} />}
          <Button label="Export" variant="secondary" icon={ic(ArrowDownTrayIcon)} onClick={() => { const md = planMd(id, plan); saveFile(planName(plan.url) + '-grow-plan.md', 'text/markdown', md); copy(md); }} />
          <Button label="Open the site" variant="secondary" href={plan.url} target="_blank" icon={ic(ArrowTopRightOnSquareIcon)} />
        </HStack>
      </HStack>

      {saveAsk && <Banner status="info" title="Sign in to keep this plan" description={saveAsk + ' Only saving needs an account; everything else works without one.'} icon={ic(BookmarkIcon)}
        endContent={<Button label="Sign in" size="sm" variant="primary" href="/me" icon={ic(ArrowRightIcon)} />} isDismissable onDismiss={() => setSaveAsk('')} />}
      {plan.generic && <Banner status="warning" title="Made without the model" description="Its free budget is used up or it is too slow right now (it resets at 00:00 UTC). The AI-search check and the listings are real; the rest is a general guide. Press the button again tomorrow for a plan written for your page." />}

      {plan.kind === 'followers' ? <Followers plan={plan} id={id} done={done} toggle={toggle} /> : <>
        {!full && nexts.length > 0 && <VStack gap={2}>
          <Text type="emphasized">Your next step</Text>
          <div className="grid">{nexts.map((n, i) => (
            <Card key={n.label} variant={i === 0 ? 'blue' : 'subtle'}><VStack gap={2}>
              <HStack gap={2} align="center">{n.icon}<Text type="supporting" color="secondary">Step {n.n}</Text></HStack>
              <Text weight="semibold">{n.label}</Text><Text type="supporting" color="secondary" style={{overflowWrap: 'anywhere'}}><Names text={n.sub} /></Text>
              <div>{n.href ? <OpenBtn label={n.cta} href={n.href} logo={n.icon} primary={i === 0} /> : <Button label={n.cta} size="sm" variant={i === 0 ? 'primary' : 'secondary'} icon={ic(ArrowRightIcon)} onClick={() => { setStep(n.go); setFull(true); }} />}</div>
            </VStack></Card>))}</div>
          <div><Button label={'Show the whole plan (' + total + ' tasks)'} variant="ghost" icon={ic(ListBulletIcon)} onClick={() => setFull(true)} /></div>
        </VStack>}
        {(full || nexts.length === 0) && <VStack gap={3}>
          <div className="steps-seg"><SegmentedControl label="Plan steps" value={String(step)} onChange={(v) => { setStep(+v); history.replaceState(null, '', '#step-' + (+v + 1)); }}>
            {STEPS.map((s, i) => <SegmentedControlItem key={s.k} value={String(i)} label={(i + 1) + '. ' + s.t} icon={ic(s.icon)} />)}
          </SegmentedControl></div>
          <Text color="secondary">{STEPS[step].say}</Text>
          <StepBody step={step} plan={plan} id={id} done={done} toggle={toggle} rw={rw} />
          <HStack gap={2} justify="space-between">
            <Button label="Back" variant="secondary" icon={ic(ArrowRightIcon)} isDisabled={step === 0} onClick={() => setStep(step - 1)} style={{transform: 'scaleX(-1)'}} />
            <Button label="Next step" variant="primary" icon={ic(ArrowRightIcon)} isDisabled={step === 4} onClick={() => setStep(step + 1)} />
          </HStack>
        </VStack>}
      </>}
    </VStack></div>
  );
}

// ---------- home ----------
const URL_HINTS = ['https://your-site.com', 'https://github.com/you/your-repo', 'https://your-app.vercel.app', 'https://producthunt.com/products/your-product', 'https://bsky.app/profile/you.bsky.social', 'https://your-shop.com'];
const HIST_KEY = 'grow:recent-urls';
const loadRecent = () => { try { const a = JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); return Array.isArray(a) ? a.filter((x) => typeof x === 'string').slice(0, 10) : []; } catch { return []; } };
const saveRecent = (u) => { const n = [u, ...loadRecent().filter((x) => x !== u)].slice(0, 10); try { localStorage.setItem(HIST_KEY, JSON.stringify(n)); } catch { /* storage blocked */ } return n; };
// Cycles the placeholder every 2 seconds so a visitor sees the kinds of links that work.
function useRotatingHint(list, ms = 2000) {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((n) => (n + 1) % list.length), ms); return () => clearInterval(t); }, [list, ms]);
  return list[i];
}
const MAKE_STEPS = ['makeStep1', 'makeStep2', 'makeStep3', 'makeStep4', 'makeStep5'].map(t);

function Home({onPlan}) {
  const [url, setUrl] = useState(BOOT.prefill || '');
  const [about, setAbout] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [tick, setTick] = useState(0);
  const [recent, setRecent] = useState(loadRecent);
  const hint = useRotatingHint(URL_HINTS);
  // TextInput has no `list` prop, so attach the native <datalist> to its input directly.
  useEffect(() => { const el = document.querySelector('input[name="url"]'); if (el) el.setAttribute('list', 'grow-recent-urls'); }, []);
  useEffect(() => { if (!busy) return undefined; setTick(0); const t = setInterval(() => setTick((n) => n + 1), 3500); return () => clearInterval(t); }, [busy]);
  const make = async (e) => {
    e && e.preventDefault(); setErr('');
    const u = withScheme(url); if (!/^https?:\/\/[^\s/]+\.[^\s/]{2,}/i.test(u)) { setErr(t('badLink')); return; }
    setRecent(saveRecent(u)); setBusy(true);
    try {
      const r = await fetch('/api/plan', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({url: u, about: about.trim() || undefined})});
      const j = await r.json(); if (!r.ok) throw new Error(j.error || t('wrong'));
      onPlan(j.id || '', j.plan);
    } catch (x) { setErr(x.message); setBusy(false); }
  };
  const paste = async () => { try { const t = await navigator.clipboard.readText(); if (t) setUrl(t.trim()); } catch { toast(t('pasteHint')); } };
  return (
    <div className="hero"><VStack gap={4} align="center">
      <Badge label={t('badge')} icon={ic(SparklesIcon)} />
      <Heading level={1}>{t('h1')}</Heading>
      <Text color="secondary" type="lead">{t('lead')}</Text>
      <form onSubmit={make}><VStack gap={2}>
        <datalist id="grow-recent-urls">{recent.map((r) => <option key={r} value={r} />)}</datalist>
        <div className="url-row">
          <div className="url-field"><TextInput label={t('linkLabel')} isLabelHidden type="url" htmlName="url" autoComplete="url" value={url} onChange={setUrl} placeholder={hint} startIcon={ic(LinkIcon)} size="lg" /></div>
          <Button label={t('paste')} variant="secondary" size="lg" icon={ic(ClipboardDocumentIcon)} onClick={paste} type="button" />
          <span className="next-cta" data-next-cta style={{display: 'inline-block', borderRadius: 12}}><Button label={busy ? t('making') : t('make')} variant="primary" size="lg" type="submit" isDisabled={busy} icon={ic(RocketLaunchIcon)} /></span>
        </div>
        {recent.length > 0 && <HStack gap={1} wrap="wrap" justify="center" align="center">
          <Text type="supporting" color="secondary">{t('recent')}</Text>
          {recent.slice(0, 5).map((r) => <Button key={r} label={clip(r.replace(/^https?:\/\//, ''), 32)} variant="ghost" size="sm" type="button" onClick={() => setUrl(r)} />)}
        </HStack>}
        <TextInput label={t('aboutLabel')} isLabelHidden value={about} onChange={setAbout} placeholder={t('aboutPlaceholder')} startIcon={ic(PencilSquareIcon)} />
        <HStack gap={2} justify="center" wrap="wrap">
          <Button label={t('example')} variant="ghost" icon={ic(DocumentTextIcon)} href={PREFIX + '/example'} />
        </HStack>
      </VStack></form>
      {err && <Banner status="error" title={err} />}
      {busy && <Card><VStack gap={2}>
        <ProgressBar label={t('making')} isLabelHidden value={Math.min(95, 12 + tick * 16)} max={100} />
        {MAKE_STEPS.map((s, i) => <div key={s} className="prog-step" style={{opacity: i > tick ? 0.45 : 1}}><Icon icon={i < tick ? ClipboardDocumentCheckIcon : SparklesIcon} size="sm" /><Text>{s}</Text></div>)}
        <Text type="supporting" color="secondary">{t('about20')}</Text>
      </VStack></Card>}
      <HStack gap={2} wrap="wrap" justify="center">
        {['Hacker News', 'Reddit', 'Product Hunt', 'X', 'Bluesky', 'Instagram'].map((n) => <Badge key={n} label={n} icon={lg(n)} />)}
      </HStack>
      <HStack gap={2} wrap="wrap" justify="center">
        {['LinkedIn', 'YouTube', 'TikTok'].map((n) => <Badge key={n} label={n + ' · ' + t('comingSoon')} icon={lg(n)} />)}
      </HStack>
      <Text type="supporting" color="secondary">{t('followers')} <Names text="X" />, <Names text="Bluesky" /> {t('followersOr')} <Names text="Instagram" /> {t('followersEnd')}</Text>
    </VStack></div>
  );
}

// ---------- shell ----------
function Nav({go, plan, id, me}) {
  return (
    <SideNav collapsible
      header={<HStack gap={2} align="center"><span className="brand"><Icon icon={RocketLaunchIcon} size="sm" /></span><Text type="emphasized">Flisk Grow</Text></HStack>}
      topContent={<Button label={t('navNew')} variant="secondary" icon={ic(PlusIcon)} isFullWidth onClick={() => go('/')} />}
      footer={<Text type="supporting" color="secondary">{t('navFooter')}</Text>}>
      <SideNavSection title={t('navWorkspace')}>
        <SideNavItem label={t('navHome')} icon={HomeIcon} isSelected={!plan && !me} onClick={() => go('/')} />
        {plan && <SideNavItem label={t('navThisPlan')} icon={DocumentTextIcon} isSelected onClick={() => {}} />}
        <SideNavItem label={t('navCabinet')} icon={BookmarkIcon} isSelected={me} href="/me" />
      </SideNavSection>
      <SideNavSection title="Flisk">
        <SideNavItem label={t('navExample')} icon={SparklesIcon} onClick={() => go('/example')} />
        <SideNavItem label="GitHub" icon={GitHubIcon} href="https://github.com/flisk-sh/grow" target="_blank" />
      </SideNavSection>
    </SideNav>
  );
}

export default function App() {
  const bare = () => location.pathname.slice(PREFIX.length);
  const parse = () => { const m = bare().match(/^\/(?:p\/([0-9a-f]{12})|(example))$/); return m ? (m[1] || 'example') : ''; };
  const isMe = () => location.pathname.replace(/\/+$/, '') === '/me';
  const [me, setMe] = useState(isMe);
  const [id, setId] = useState(parse);
  const [plan, setPlan] = useState(BOOT.plan || null);
  const [error, setError] = useState('');
  const [navOpen, setNavOpen] = useState(false);
  const go = (path) => { history.pushState(null, '', PREFIX + path); setPlan(null); setError(''); setId(parse()); setMe(isMe()); setNavOpen(false); };
  useEffect(() => { const f = () => { setPlan(null); setId(parse()); setMe(isMe()); }; addEventListener('popstate', f); return () => removeEventListener('popstate', f); }, []);
  useEffect(() => {
    if (!id || plan || me) return;
    let live = true;
    fetch('/api/plan/' + id).then((r) => r.json()).then((j) => { if (!live) return; if (j.error) setError(j.error); else setPlan(j.plan); }).catch(() => live && setError(t('loadFail')));
    return () => { live = false; };
  }, [id, plan]);
  const onPlan = (newId, p) => { if (newId) history.pushState(null, '', PREFIX + '/p/' + newId); setId(newId || 'guide'); setPlan(p); };
  const drawer = <MobileNav header="Flisk Grow"><SideNavRenderContext value="drawer-content"><Nav go={go} plan={plan} id={id} me={me} /></SideNavRenderContext></MobileNav>;
  return (
    <AppShell height="fill" mobileNav={{hasToggle: false, isOpen: navOpen, onOpenChange: setNavOpen, content: drawer}}
      topNav={<HStack gap={2} align="center" style={{padding: 'var(--spacing-2) var(--spacing-3)'}}><MobileNavToggle /><Text type="supporting" color="secondary">{me ? t('cabinet') : plan ? t('plans') + ' / ' + planName(plan.url || '') : 'Flisk Grow'}</Text></HStack>}
      sideNav={<Nav go={go} plan={plan} id={id} me={me} />}>
      <div style={{height: '100%', overflow: 'auto'}}>
        {me ? <Cabinet /> : error ? <div className="page"><VStack gap={3}><Banner status="error" title={error} /><div><Button label={t('newPlan')} variant="primary" icon={ic(PlusIcon)} onClick={() => go('/')} /></div></VStack></div>
          : id && !plan ? <div className="page"><Text color="secondary">{t('loading')}</Text></div>
          : plan ? <PlanView key={id} id={id === 'guide' ? '' : id} plan={plan} onPlan={setPlan} />
          : <Home onPlan={onPlan} />}
      </div>
      <a className="pro-fab" href="https://chat.flisk.si" target="_blank" rel="noopener" title={t('proTitle')}>
        <Logo name="chat.flisk.si" url="https://chat.flisk.si" size={20} /><span>{t('pro')}</span>
      </a>
    </AppShell>
  );
}
