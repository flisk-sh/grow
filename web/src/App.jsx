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
  ChevronDownIcon, ChatBubbleOvalLeftEllipsisIcon, BriefcaseIcon, PencilSquareIcon, HomeIcon, RocketLaunchIcon, LinkIcon, DocumentTextIcon, ClipboardDocumentCheckIcon, ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import {Logo} from './logos.jsx';

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
const planLink = (id) => location.origin + (id === 'example' ? '/next/example' : id ? '/next/p/' + id : '/next');
const BSKY = (n) => n === 'Bluesky';
const POST = (t, n) => (BSKY(n) ? 'https://bsky.app/intent/compose?text=' : 'https://x.com/intent/post?text=') + enc(t);
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
const copy = (t) => { if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => toast('Copied')); };
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
        <HStack gap={2} align="center">{icon && <Icon icon={icon} size="md" />}<Heading level={3}>{title}</Heading>{count != null && <Badge label={String(count)} />}</HStack>
        {sub && <Text type="supporting" color="secondary">{sub}</Text>}
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
        {text && <Text type="supporting" color="secondary" style={{overflowWrap: 'anywhere'}}>{text}</Text>}
        {actions && <HStack gap={2} wrap="wrap">{actions}</HStack>}
      </VStack>
    </HStack></Card>
  );
}

function Draft({id, done, toggle, to, title, body, actions, logo, preview}) {
  const on = done.has(id);
  return (
    <Card variant="subtle"><VStack gap={2} className={on ? 'done' : ''}>
      <HStack gap={2} align="center"><CheckboxInput label={'Done: ' + title} isLabelHidden value={on} onChange={() => toggle(id)} />{logo}<Text type="supporting" color="secondary">{to}</Text></HStack>
      <Text weight="semibold">{title}</Text>
      {preview || <div className="pre">{body}</div>}
      <HStack gap={2} wrap="wrap">{actions}</HStack>
    </VStack></Card>
  );
}

// A simulated view of the post as its network shows it, so people see what they will publish.
function PostPreview({where = '', title, body, url}) {
  const site = host(url);
  const who = (
    <div className="sim-who"><span className="sim-av">You</span><span>@you</span></div>
  );
  const link = site && <div className="sim-link">{site}</div>;
  if (where === 'X') return <div className="sim sim-x">{who}<div className="sim-body">{body}</div>{link}</div>;
  if (where === 'Reddit') return <div className="sim sim-reddit"><div className="sim-meta">r/yourcommunity · Posted by u/you</div><div className="sim-title">{title}</div><div className="sim-body">{body}</div><div className="sim-meta">0 comments · Share · Save</div></div>;
  if (where === 'Hacker News') return <div className="sim sim-hn"><div className="sim-hnbar">Hacker News · submit</div><div className="sim-title">{title} <span className="sim-meta">({site})</span></div><div className="sim-meta">1 point by you just now · 0 comments</div><div className="sim-body">{body}</div></div>;
  if (where === 'Bluesky') return <div className="sim sim-bsky">{who}<div className="sim-body">{body}</div>{link}<div className="sim-meta">Bluesky · 0 replies · 0 reposts</div></div>;
  if (where === 'Discord') return <div className="sim sim-discord"><div className="sim-meta"># show-your-stack</div>{who}<div className="sim-body">{body}</div></div>;
  return <div className="sim sim-plain">{title && <div className="sim-title">{title}</div>}<div className="sim-body">{body}</div>{link}</div>;
}

// ---------- plan ----------
function StepBody({step, plan, id, done, toggle, goAbout}) {
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
            <VStack gap={0} style={{flex: 1}}><Text weight="semibold">{f.title}</Text><Text type="supporting" color="secondary">{f.summary}</Text></VStack><CopyBtn text={f.title + ': ' + f.summary} /></HStack>)) : <Text color="secondary">Nothing to fix: AI search can read this page.</Text>}</VStack>
      </div> : <HStack gap={3} align="center"><Text color="secondary">{p.noSite ? 'This link is a GitHub repo, so there is no page of yours to check. Add your website and make the plan again.' : 'The check did not answer this time.'}</Text><OpenBtn label="Try on Citable" href="https://citable.flisk.si" logo={lg('Citable')} /></HStack>}
    </Section>
    <GapsCard id={id} plan={p} />
    {p.ranker && <Section title="Your rank on Ranker" icon={ChartBarIcon} sub={p.ranker.listed ? 'Ranker ranks ' + p.ranker.repo + ' by stars gained each day.' : 'Ranker could not list ' + p.ranker.repo + ' just now.'}>
      <HStack gap={2} wrap="wrap">{p.ranker.badge && <img src={p.ranker.badge} alt="Flisk Ranker badge" width="250" height="55" />}<OpenBtn label={p.ranker.listed ? 'Open on Ranker' : 'List it on Ranker'} href={p.ranker.url} logo={lg('Ranker')} primary />{p.ranker.markdown && <CopyBtn text={p.ranker.markdown} label="Copy badge" />}</HStack></Section>}
    {(p.tools || []).length > 0 && <Section title="More free checks" icon={WrenchScrewdriverIcon}><VStack gap={2}>{p.tools.map((x, i) => row('tool' + i, lg(x.name, x.url), x.name, x.why, <OpenBtn label="Open" href={x.url} />))}</VStack></Section>}
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
    <div className="grid">{(p.emails || []).map((e, i) => <Draft key={i} id={'mail' + i} done={done} toggle={toggle} logo={lg('Gmail')} to={'To: ' + (e.to || 'someone who fits')} title={e.subject}
      body={e.body + (e.find ? '\n\nFind them: ' + e.find : '')}
      preview={<div className="sim sim-mail"><div className="sim-meta">To: {e.to || 'someone who fits'}</div><div className="sim-title">{e.subject}</div><div className="sim-body">{e.body + (e.find ? '\n\nFind them: ' + e.find : '')}</div></div>}
      actions={<>
        <OpenBtn label="Open in Gmail" href={gmail(e)} logo={lg('Gmail')} primary />
        <OpenBtn label="Mail app" href={mailto(e)} icon={EnvelopeIcon} />
        {e.followup && <OpenBtn label="Day 7 follow-up" href={'https://mail.google.com/mail/?view=cm&fs=1&su=' + enc('Re: ' + e.subject) + '&body=' + enc(e.followup)} icon={PaperAirplaneIcon} />}
        <CopyBtn text={e.subject + '\n\n' + e.body} /></>} />)}</div></Section>;

  if (step === 3) return <Section title="Posts to write" icon={PencilSquareIcon} count={(p.posts || []).length} sub="Opens the post box with the text filled in. You read it, change it and post it yourself.">
    <div className="grid">{(p.posts || []).length ? p.posts.map((x, i) => { const h = postHref(x, p); return <Draft key={i} id={'post' + i} done={done} toggle={toggle} logo={lg(x.where)} to={x.where} title={x.title || clip(x.body, 60)} body={x.body} preview={<PostPreview where={x.where} title={x.title} body={x.body} url={p.url} />}
      actions={<>{h && <OpenBtn label={'Open in ' + x.where} href={h} logo={lg(x.where)} primary />}<CopyBtn text={(x.title ? x.title + '\n\n' : '') + x.body} /></>} />; }) : <Text color="secondary">No post drafts this time. Press the button again for drafts for X, Reddit and Hacker News.</Text>}</div></Section>;

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
    <Section title="Posts to write" icon={PencilSquareIcon} count={(plan.posts || []).length}><div className="grid">{(plan.posts || []).map((x, i) => <Draft key={i} id={'post' + i} done={done} toggle={toggle} logo={lg(net)} to={net} title={x.title} body={x.body} preview={<PostPreview where={net} title={x.title} body={x.body} url={plan.url} />} actions={<><OpenBtn label={'Open in ' + net} href={POST(x.body, net)} logo={lg(net)} primary /><CopyBtn text={x.body} /></>} />)}</div></Section>
    {(plan.accounts || []).length > 0 && <Section title="Accounts to follow and answer" icon={ChatBubbleLeftRightIcon}><div className="grid">{plan.accounts.map((x, i) => <Row key={i} id={'acc' + i} done={done} toggle={toggle} logo={lg(net)} title={x.name} text={x.why} />)}</div></Section>}
  </VStack>;
}

function PlanView({id, plan}) {
  const ex = id === 'example';
  const [step, setStep] = useState(() => { const m = location.hash.match(/step-([1-5])/); return m ? +m[1] - 1 : 0; });
  const [done, setDone] = useState(() => loadDone(id));
  const [full, setFull] = useState(() => /step-/.test(location.hash));
  const [saveAsk, setSaveAsk] = useState('');
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
              <Text weight="semibold">{n.label}</Text><Text type="supporting" color="secondary" style={{overflowWrap: 'anywhere'}}>{n.sub}</Text>
              <div>{n.href ? <OpenBtn label={n.cta} href={n.href} logo={n.icon} primary={i === 0} /> : <Button label={n.cta} size="sm" variant={i === 0 ? 'primary' : 'secondary'} icon={ic(ArrowRightIcon)} onClick={() => { setStep(n.go); setFull(true); }} />}</div>
            </VStack></Card>))}</div>
          <div><Button label={'Show the whole plan (' + total + ' tasks)'} variant="ghost" icon={ic(ListBulletIcon)} onClick={() => setFull(true)} /></div>
        </VStack>}
        {(full || nexts.length === 0) && <VStack gap={3}>
          <div><SegmentedControl label="Plan steps" value={String(step)} onChange={(v) => { setStep(+v); history.replaceState(null, '', '#step-' + (+v + 1)); }}>
            {STEPS.map((s, i) => <SegmentedControlItem key={s.k} value={String(i)} label={(i + 1) + '. ' + s.t} icon={ic(s.icon)} />)}
          </SegmentedControl></div>
          <Text color="secondary">{STEPS[step].say}</Text>
          <StepBody step={step} plan={plan} id={id} done={done} toggle={toggle} />
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
const MAKE_STEPS = ['Reading your page', 'Checking AI search', 'Finding who would buy it', 'Writing emails and posts', 'Finding places to list it'];

function Home({onPlan}) {
  const [url, setUrl] = useState(BOOT.prefill || '');
  const [about, setAbout] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [tick, setTick] = useState(0);
  useEffect(() => { if (!busy) return undefined; setTick(0); const t = setInterval(() => setTick((n) => n + 1), 3500); return () => clearInterval(t); }, [busy]);
  const make = async (e) => {
    e && e.preventDefault(); setErr('');
    const u = url.trim(); if (!/^https?:\/\//i.test(u)) { setErr('Paste a full link that starts with https://'); return; }
    setBusy(true);
    try {
      const r = await fetch('/api/plan', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({url: u, about: about.trim() || undefined})});
      const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Something went wrong. Press the button again.');
      onPlan(j.id || '', j.plan);
    } catch (x) { setErr(x.message); setBusy(false); }
  };
  const paste = async () => { try { const t = await navigator.clipboard.readText(); if (t) setUrl(t.trim()); } catch { toast('Paste with Ctrl+V or Cmd+V'); } };
  return (
    <div className="hero"><VStack gap={4} align="center">
      <Badge label="Free · no sign-in · plans kept 30 days" icon={ic(SparklesIcon)} />
      <Heading level={1}>Find your first customers.</Heading>
      <Text color="secondary" type="lead">Paste a link to what you made. Get who would buy it, where they are, emails and posts to send, whether AI search can read your page, and where to list it.</Text>
      <form onSubmit={make}><VStack gap={2}>
        <TextInput label="Link to your site" isLabelHidden type="url" value={url} onChange={setUrl} placeholder="https://your-site.com" startIcon={ic(LinkIcon)} size="lg" />
        <TextInput label="What is it about (optional)" isLabelHidden value={about} onChange={setAbout} placeholder="Optional: one line on who it is for" startIcon={ic(PencilSquareIcon)} />
        <HStack gap={2} justify="center" wrap="wrap">
          <Button label="Paste" variant="secondary" icon={ic(ClipboardDocumentIcon)} onClick={paste} type="button" />
          <Button label={busy ? 'Making your plan…' : 'Make my plan'} variant="primary" type="submit" isDisabled={busy} icon={ic(RocketLaunchIcon)} />
          <Button label="See an example plan" variant="ghost" icon={ic(DocumentTextIcon)} href="/next/example" />
        </HStack>
      </VStack></form>
      {err && <Banner status="error" title={err} />}
      {busy && <Card><VStack gap={2}>
        <ProgressBar label="Making your plan" isLabelHidden value={Math.min(95, 12 + tick * 16)} max={100} />
        {MAKE_STEPS.map((s, i) => <div key={s} className="prog-step" style={{opacity: i > tick ? 0.45 : 1}}><Icon icon={i < tick ? ClipboardDocumentCheckIcon : SparklesIcon} size="sm" /><Text>{s}</Text></div>)}
        <Text type="supporting" color="secondary">About 20 seconds.</Text>
      </VStack></Card>}
      <HStack gap={2} wrap="wrap" justify="center">
        {['Hacker News', 'Reddit', 'Product Hunt', 'X', 'Bluesky'].map((n) => <Badge key={n} label={n} icon={lg(n)} />)}
      </HStack>
      <Text type="supporting" color="secondary">Followers plan for a profile: paste an X or Bluesky profile link.</Text>
    </VStack></div>
  );
}


// ---------- the chat window ----------
// The full Flisk Chat (models from inference, tasks, fleet computers) in a window docked at the bottom, so people can do things
// with their plan right here. It is chat.flisk.si/embed in a frame; Grow tells it the plan and what is worth asking.
const CHAT = 'https://chat.flisk.si';
function planContext(plan) {
  if (!plan) return 'The visitor is on Flisk Grow, a tool that makes a plan to find the first customers for a product. They have not made a plan yet.';
  if (plan.kind === 'followers') return 'The visitor is looking at their Flisk Grow followers plan for @' + plan.handle + '. ' + (plan.account || '') + ' Audience: ' + (plan.audience || '') + ' Bio: ' + (plan.bio || '');
  return 'The visitor is looking at their Flisk Grow plan to find first customers for ' + plan.url + '. About it: ' + (plan.product || '') + ' Buyers: ' + (plan.buyers || '') + ' Pitch: ' + (plan.pitch || '') + ' Emails drafted: ' + (plan.emails || []).map((e) => e.subject).join('; ') + '. Posts drafted: ' + (plan.posts || []).map((x) => x.where + ': ' + (x.title || '')).join('; ') + '. Help them with it: rewrite drafts, pick where to post first, build a landing page or a short video for it.';
}
function planAsks(plan) {
  if (!plan) return ['Build me a landing page for my product', 'Who would buy a tool that…', 'Write a Show HN title for my project', 'Make a 30-second video script for my launch'];
  if (plan.kind === 'followers') return ['Write 5 posts in my voice', 'Rewrite my bio to get more follows', 'Which account should I reply to first?', 'Plan my week of posts'];
  return ['Rewrite email 1 shorter and friendlier', 'Where should I post first, and why?', 'Build a landing page for ' + planName(plan.url), 'Make a 30-second launch video script', 'Write a better Show HN title', 'Fix my AI-search problems for me'];
}

function ChatDock({plan}) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [frame, setFrame] = useState(null);
  const asks = useMemo(() => planAsks(plan), [plan]);
  const ctx = useMemo(() => planContext(plan), [plan]);
  useEffect(() => { if (open) return undefined; const t = setInterval(() => setI((n) => n + 1), 3500); return () => clearInterval(t); }, [open]);
  const send = () => { if (frame && frame.contentWindow) frame.contentWindow.postMessage({type: 'grow:context', context: ctx, suggestions: asks}, CHAT); };
  useEffect(() => {
    const on = (e) => { if (e.origin === CHAT && e.data && e.data.type === 'chat:ready') send(); };
    addEventListener('message', on); return () => removeEventListener('message', on);
  });
  useEffect(() => { if (open) send(); }, [ctx, asks, open, frame]);
  return (
    <div className={'chatdock' + (open ? ' open' : '')}>
      {open && <div className="chatwin">
        <HStack gap={2} align="center" justify="space-between" className="chathead">
          <HStack gap={2} align="center"><Logo name="Chat" url="https://chat.flisk.si" size={20} /><Text weight="semibold">Flisk Chat</Text><Badge label="Knows your plan" icon={ic(SparklesIcon)} /></HStack>
          <Button label="Close chat" variant="ghost" size="sm" isIconOnly icon={ic(ChevronDownIcon)} onClick={() => setOpen(false)} />
        </HStack>
        <iframe ref={setFrame} title="Flisk Chat" src={CHAT + '/embed'} allow="clipboard-write; microphone" />
      </div>}
      {!open && <button type="button" className="chatbar" onClick={() => setOpen(true)} aria-label="Open Flisk Chat">
        <Logo name="Chat" url="https://chat.flisk.si" size={22} />
        <span className="chatph">{asks[i % asks.length]}</span>
        <span className="chatgo"><Icon icon={ChatBubbleOvalLeftEllipsisIcon} size="sm" /></span>
      </button>}
    </div>
  );
}

// ---------- shell ----------
function Nav({go, plan, id}) {
  return (
    <SideNav collapsible
      header={<HStack gap={2} align="center"><span className="brand"><Icon icon={RocketLaunchIcon} size="sm" /></span><Text type="emphasized">Flisk Grow</Text></HStack>}
      topContent={<Button label="New plan" variant="secondary" icon={ic(PlusIcon)} isFullWidth onClick={() => go('/next')} />}
      footer={<Text type="supporting" color="secondary">No account needed. Sign in only to save a plan.</Text>}>
      <SideNavSection title="Workspace">
        <SideNavItem label="Home" icon={HomeIcon} isSelected={!plan} onClick={() => go('/next')} />
        {plan && <SideNavItem label="This plan" icon={DocumentTextIcon} isSelected onClick={() => {}} />}
        <SideNavItem label="My cabinet" icon={BookmarkIcon} href="/me" />
      </SideNavSection>
      <SideNavSection title="Flisk">
        <SideNavItem label="Example plan" icon={SparklesIcon} onClick={() => go('/next/example')} />
        <SideNavItem label="GitHub" icon={LinkIcon} href="https://github.com/flisk-sh/grow" target="_blank" />
      </SideNavSection>
    </SideNav>
  );
}

export default function App() {
  const parse = () => { const m = location.pathname.match(/^\/next\/(?:p\/([0-9a-f]{12})|(example))$/); return m ? (m[1] || 'example') : ''; };
  const [id, setId] = useState(parse);
  const [plan, setPlan] = useState(BOOT.plan || null);
  const [error, setError] = useState('');
  const [navOpen, setNavOpen] = useState(false);
  const go = (path) => { history.pushState(null, '', path); setPlan(null); setError(''); setId(parse()); setNavOpen(false); };
  useEffect(() => { const f = () => { setPlan(null); setId(parse()); }; addEventListener('popstate', f); return () => removeEventListener('popstate', f); }, []);
  useEffect(() => {
    if (!id || plan) return;
    let live = true;
    fetch('/api/plan/' + id).then((r) => r.json()).then((j) => { if (!live) return; if (j.error) setError(j.error); else setPlan(j.plan); }).catch(() => live && setError('Could not load this plan.'));
    return () => { live = false; };
  }, [id, plan]);
  const onPlan = (newId, p) => { if (newId) history.pushState(null, '', '/next/p/' + newId); setId(newId || 'guide'); setPlan(p); };
  const drawer = <MobileNav header="Flisk Grow"><SideNavRenderContext value="drawer-content"><Nav go={go} plan={plan} id={id} /></SideNavRenderContext></MobileNav>;
  return (
    <AppShell height="fill" mobileNav={{hasToggle: false, isOpen: navOpen, onOpenChange: setNavOpen, content: drawer}}
      topNav={<HStack gap={2} align="center" style={{padding: 'var(--spacing-2) var(--spacing-3)'}}><MobileNavToggle /><Text type="supporting" color="secondary">{plan ? 'Plans / ' + planName(plan.url || '') : 'Flisk Grow'}</Text></HStack>}
      sideNav={<Nav go={go} plan={plan} id={id} />}>
      <div style={{height: '100%', overflow: 'auto', paddingBottom: 84}}>
        {error ? <div className="page"><VStack gap={3}><Banner status="error" title={error} /><div><Button label="Make a new plan" variant="primary" icon={ic(PlusIcon)} onClick={() => go('/next')} /></div></VStack></div>
          : id && !plan ? <div className="page"><Text color="secondary">Loading the plan…</Text></div>
          : plan ? <PlanView key={id} id={id === 'guide' ? '' : id} plan={plan} />
          : <Home onPlan={onPlan} />}
      </div>
      <ChatDock plan={plan} />
    </AppShell>
  );
}
