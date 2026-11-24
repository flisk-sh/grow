// The one page of grow.flisk.si: the home page with the link box, and a saved plan at /p/<id> (drawn from /api/plan/<id>).
// Style: the inference.flisk.si look (square corners, hairline rules, Fraunces headings, mono labels, numbered sections).
// Everything the model wrote is put in with textContent, never as HTML.

const esc = (t) => String(t).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export const CSS = String.raw`.gaps{margin-top:18px;padding-top:14px;border-top:1px solid var(--line,#333)}.gaps h3{margin:0 0 6px}.gaps .btn{margin:6px 8px 0 0}.logo{width:16px;height:16px;vertical-align:-3px;margin-right:6px;border-radius:3px;flex:none;background:#fff;padding:1px;box-sizing:border-box}
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
.brand{display:flex;align-items:center;gap:10px;font-family:var(--display);font-weight:800;font-size:21px;text-decoration:none;white-space:nowrap}
.navr{display:flex;gap:4px}.navr a{font:600 11px var(--mono);text-transform:uppercase;letter-spacing:.08em;text-decoration:none;padding:8px 12px;border:1px solid transparent}.navr a:hover{border-color:var(--line2)}
.btn{display:inline-flex;align-items:center;gap:8px;white-space:nowrap;border:1px solid var(--line2);border-radius:0;background:transparent;padding:10px 16px;font:600 11px var(--mono);text-transform:uppercase;letter-spacing:.08em;text-decoration:none;cursor:pointer}
.btn:hover{background:var(--panel2)}.btn.go{background:var(--acc);border-color:var(--acc);color:var(--accink)}.btn.go::after{content:"\2192"}.btn.go:hover{filter:brightness(1.06)}.btn:disabled{opacity:.6;cursor:default}
.hero{display:grid;grid-template-columns:1.3fr .7fr;margin:0 -36px;border-bottom:1px solid var(--line2)}
.hero>div:first-child{padding:64px 40px 56px 36px;border-right:1px solid var(--line2)}
.kicker{font:600 11px var(--mono);text-transform:uppercase;letter-spacing:.12em;color:var(--faint)}
.hero h1{font-size:clamp(36px,4.4vw,56px);line-height:1;margin:20px 0}
.lead{font-size:18px;color:var(--mut);max-width:32em;margin:0 0 26px}
form{display:flex;max-width:600px}form input{flex:1;min-width:0;height:48px;padding:0 14px;border:1px solid var(--line2);border-right:0;border-radius:0;background:var(--panel);font:14px var(--mono)}form input:focus{outline:2px solid var(--acc);outline-offset:-2px}form .btn{height:48px}.socials{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:14px 0 0;font-size:13px;color:var(--mute,#666)}.soc{display:inline-flex;gap:6px;align-items:center;padding:4px 10px;border:1px solid var(--line2);background:var(--panel);opacity:.6}.soc.on{opacity:1;font-weight:600}.soc em{font:600 10px var(--mono);text-transform:uppercase;letter-spacing:.06em;font-style:normal}.aboutme{display:block;width:100%;max-width:600px;margin-top:8px;height:44px;padding:0 14px;border:1px solid var(--line2);background:var(--panel);font:14px var(--mono)}.aboutme[hidden]{display:none}.brief{max-width:600px;margin-top:8px;font:13px var(--mono)}.brief[hidden]{display:none}.brief summary{cursor:pointer;color:var(--faint);padding:4px 0}.brief .bq{display:grid;gap:6px;margin-top:6px}.brief input{height:40px;padding:0 12px;border:1px solid var(--line2);background:var(--panel);font:13px var(--mono)}.example-link{display:inline-block;margin-top:12px;font:600 13px var(--mono);color:var(--ink)}
.fb{display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-top:6px;font:11px var(--mono);color:var(--faint)}.fb .ib{padding:2px 6px}.fb .chip{padding:3px 8px;border:1px solid var(--line2);background:transparent;color:inherit;font:600 10px var(--mono);text-transform:uppercase;letter-spacing:.05em;cursor:pointer}.fb .ib.on,.fb .chip.on{background:var(--acc);color:var(--acctext,#000);border-color:var(--acc)}.fb .worked{display:none;gap:4px;align-items:center;flex-wrap:wrap}.rw.done .fb .worked{display:inline-flex}.fb .sep{width:1px;height:14px;background:var(--line2);margin:0 4px}.rw.busy{opacity:.5;pointer-events:none}
.proof{display:flex;flex-wrap:wrap;gap:6px 18px;list-style:none;padding:0;margin:20px 0 0;color:var(--faint);font:500 12px var(--mono)}.proof li::before{content:"";display:inline-block;width:7px;height:7px;background:var(--acc);margin-right:9px;vertical-align:1px}
.band{background:repeating-linear-gradient(-45deg,var(--acc) 0 2px,transparent 2px 11px);min-height:120px}
.status{margin:14px 0 0;font:500 12.5px var(--mono);color:var(--mut);min-height:1.5em}.status.err{color:var(--red)}
.prog{margin:16px 0 0;border:1px solid var(--line);padding:16px 18px;max-width:560px}.prog[hidden]{display:none}.prog .bar{height:4px;background:var(--line);overflow:hidden}.prog .bar i{display:block;height:100%;width:0;background:var(--acc);transition:width .9s linear}
.prog ol{list-style:none;margin:14px 0 0;padding:0;display:grid;gap:8px;font:500 13px var(--font)}.prog li{display:flex;gap:10px;align-items:center;color:var(--faint)}.prog li.on{color:var(--ink)}.prog li.ok{color:var(--mut)}
.prog li b{flex:none;width:16px;height:16px;border:2px solid var(--line);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:10px}.prog li.on b{border-color:var(--acc);border-right-color:transparent;animation:spin .8s linear infinite}.prog li.ok b{border-color:var(--acc);background:var(--acc);color:var(--accink)}
.prog .meta{display:flex;justify-content:space-between;margin-top:12px;font:500 11.5px var(--mono);color:var(--faint)}@keyframes spin{to{transform:rotate(360deg)}}@media (prefers-reduced-motion:reduce){.prog li.on b{animation:none}}
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
.jhead{margin:0 -36px;padding:26px 36px 16px;border-bottom:1px solid var(--line2)}.jhead h2{font-size:clamp(26px,3.2vw,38px);margin:10px 0 6px}.jhead .sub{margin:0}.jhead .note{margin-top:10px}
.jbar{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:12px}.jcwrap{display:inline-flex;align-items:center;gap:6px;font:600 11px var(--mono);text-transform:uppercase;letter-spacing:.06em;margin-right:6px}
.jtabs{position:sticky;top:0;z-index:5;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));margin:0 -36px;border-bottom:1px solid var(--line2);background:var(--bg)}
.jtab{display:flex;gap:9px;align-items:center;min-width:0;padding:9px 12px;border:0;border-right:1px solid var(--line2);border-radius:0;background:transparent;text-align:left;cursor:pointer}.jtab:last-child{border-right:0}.jtab:hover{background:var(--panel2)}
.jtab[aria-selected=true]{background:var(--panel);box-shadow:inset 0 -3px 0 var(--acc)}
.jtab .num{flex:none;width:24px;height:24px;display:grid;place-items:center;border:1px solid var(--line2);font:600 11px var(--mono)}.jtab[aria-selected=true] .num{background:var(--ink);color:var(--bg)}.jtab.fin .num{background:var(--acc);border-color:var(--acc);color:var(--accink)}
.jtab .tx{flex:1;min-width:0}.jtab .tt{display:block;font-weight:700;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.jtab .st{display:block;font:500 10.5px var(--mono);color:var(--faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.jtab .b2{display:block;height:3px;background:var(--line);margin-top:5px}.jtab .b2 i{display:block;height:100%;width:0;background:var(--acc);transition:width .3s}.jtab .pg{flex:none;font:600 10.5px var(--mono);color:var(--faint)}
.stage{margin:0 -36px;padding:14px 36px 18px;border-bottom:1px solid var(--line2)}
.jlinks{margin-top:12px;border:1px solid var(--line2)}.ltop{display:flex;align-items:center;gap:8px;padding:6px 8px}.lh{font:600 10.5px var(--mono);text-transform:uppercase;letter-spacing:.06em;color:var(--faint);flex:none}
.lks{display:flex;gap:4px;overflow-x:auto;flex:1;min-width:0;scrollbar-width:none}.lks::-webkit-scrollbar{display:none}
.lk{display:inline-flex;align-items:center;gap:5px;flex:none;padding:3px 7px;border:1px solid var(--line2);background:var(--bg);font:12px var(--sans,inherit);white-space:nowrap;cursor:pointer;color:inherit}.lk:hover{border-color:var(--ink)}
.lk.empty{border-style:dashed;color:var(--mut)}.lk.empty img{filter:grayscale(1);opacity:.55}.lk img{width:14px;height:14px}
.jdrawer{border-top:1px solid var(--line2);padding:8px;display:grid;gap:6px}.jdrawer[hidden]{display:none}
.lgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:4px}
.lin{display:flex;align-items:center;gap:6px;border:1px solid var(--line2);padding:3px 7px;background:var(--bg)}.lin img{width:14px;height:14px}.lin .k{font:600 10px var(--mono);text-transform:uppercase;letter-spacing:.05em;color:var(--mut);min-width:84px}
.lin input{flex:1;min-width:0;border:0;background:transparent;outline:0;font:12px var(--mono);color:inherit;padding:3px 0}.lin:focus-within{border-color:var(--acc)}.lin input[readonly]{color:var(--mut)}
.jdrawer textarea{border:1px dashed var(--line2);background:transparent;color:inherit;font:12px var(--mono);padding:6px 8px;resize:vertical}.jdrawer .note{margin:0}
.rw .m{flex:none;font:600 10px var(--mono);color:var(--faint);padding-top:2px;white-space:nowrap}
.jlead{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 12px;margin-bottom:10px}.jlead h3{font-family:var(--display);font-weight:800;font-size:22px;letter-spacing:-.02em}.jlead .say{color:var(--mut);font-size:14px}.jlead .pg{margin-left:auto;font:600 11px var(--mono);color:var(--faint);text-transform:uppercase;letter-spacing:.06em}
.cols{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));grid-auto-rows:300px;padding:0 1px 1px 0}
.pn{display:flex;flex-direction:column;min-width:0;min-height:0;margin:0 -1px -1px 0;background:var(--panel);border:1px solid var(--line2)}
.pn .ph{display:flex;align-items:center;gap:7px;flex:none;padding:8px 10px;border-bottom:1px solid var(--line2);font:600 10.5px var(--mono);text-transform:uppercase;letter-spacing:.07em}.pn .ph .logo{margin:0}.pn .ph .n{margin-left:auto;color:var(--faint)}
.pn .bd{flex:1;min-height:0;overflow:auto}
.rw{display:flex;gap:8px;align-items:flex-start;padding:7px 10px;border-bottom:1px solid var(--line);font-size:13px;line-height:1.35}.rw:hover{background:var(--panel2)}
.rw .ck>input{flex:none;margin:1px 0 0;width:14px;height:14px;accent-color:var(--acc);cursor:pointer}.rw>.logo{margin:0}.rw>svg.i{margin-top:2px}
.rw .t{flex:1;min-width:0;cursor:pointer}.rw .t b{display:block;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rw .t small{display:block;margin-top:1px;font-size:12px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rw.open .t b,.rw.open .t small{white-space:pre-wrap;overflow-wrap:anywhere}.rw.done .t b{text-decoration:line-through;color:var(--faint)}
.ra{display:flex;flex-wrap:wrap;gap:4px;flex:none}.rw .t .ra{margin-top:6px}
.ib{display:inline-flex;align-items:center;gap:5px;padding:4px 8px;border:1px solid var(--line2);border-radius:0;background:transparent;font:600 10px var(--mono);text-transform:uppercase;letter-spacing:.05em;text-decoration:none;white-space:nowrap;cursor:pointer}
.ib:hover{background:var(--ink);color:var(--bg)}.ib.go{background:var(--acc);border-color:var(--acc);color:var(--accink)}.ib.go:hover{filter:brightness(1.06)}.ib:disabled{opacity:.6;cursor:default}
svg.i{width:12px;height:12px;flex:none;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.jcwrap svg.i{width:14px;height:14px;color:var(--acctext)}
.dot{flex:none;width:8px;height:8px;margin-top:4px;border-radius:50%}.dot.bad{background:var(--red)}.dot.warn{background:var(--amber)}.dot.ok{background:var(--acc)}
.pc{padding:12px;display:flex;flex-direction:column;gap:8px}.pc p{margin:0;color:var(--mut);font-size:13.5px}.pc .pitch{color:var(--ink);font-size:19px;margin:0}.pc .today{margin:0;padding:10px 12px}.pc .badge{max-width:100%;height:auto}
.big{font-family:var(--display);font-weight:800;font-size:56px;line-height:1}.big small{font:600 12px var(--mono);color:var(--faint);margin-left:6px}
.skf{display:flex;margin:8px 10px}.skf input{flex:1;min-width:0;height:32px;padding:0 8px;border:1px solid var(--line2);border-right:0;background:var(--bg);font:12px var(--mono)}.skf .ib{height:32px}
.tip{position:fixed;z-index:30;max-width:290px;padding:5px 9px;background:var(--ink);color:var(--bg);font:500 11.5px/1.4 var(--font);pointer-events:none;opacity:0;transition:opacity .12s}.tip.on{opacity:1}
@media(max-width:860px){.jhead,.jtabs,.stage{margin:0 -16px}.jhead,.stage{padding-left:16px;padding-right:16px}.jtab{justify-content:center;padding:8px 4px}.jtab .tx,.jtab .pg{display:none}
 .cols{grid-template-columns:1fr;grid-auto-rows:auto}.pn .bd{max-height:380px}.jlead .pg{margin-left:0}}
body.has-plan .hero{grid-template-columns:1fr}body.has-plan .hero>div:first-child{padding:14px 36px;border-right:0}body.has-plan .hero h1,body.has-plan .hero .lead,body.has-plan .hero .kicker,body.has-plan .proof,body.has-plan .socials,body.has-plan .band{display:none}body.has-plan form{max-width:none}
/* ---- Grow "cool layer": static, vanilla, no build ---- */
/* ruled paper + grain */
body{background-image:
  linear-gradient(var(--line) 1px,transparent 1px),
  linear-gradient(90deg,var(--line) 1px,transparent 1px);
  background-size:48px 48px;background-position:-1px -1px;background-attachment:fixed}
body::after{content:"";position:fixed;inset:0;pointer-events:none;z-index:50;opacity:.07;mix-blend-mode:multiply;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}

/* headline: green marker sweep under the product name */
.jhead h2 .hl{background:linear-gradient(var(--acc),var(--acc)) 0 88%/0 .28em no-repeat;animation:sweep .9s .55s cubic-bezier(.7,0,.2,1) forwards}
@keyframes sweep{to{background-size:100% .28em}}

/* load reveal */
.cool-in{opacity:0;transform:translateY(10px);animation:rise .6s cubic-bezier(.2,.7,.2,1) forwards;animation-delay:calc(var(--i,0) * 45ms)}
@keyframes rise{to{opacity:1;transform:none}}

/* tabs: sliding underline instead of per-tab inset */
.jtabs{position:sticky}
.jtab[aria-selected=true]{box-shadow:none}
.jtabs .slide{position:absolute;left:0;bottom:-1px;height:3px;background:var(--acc);pointer-events:none;
  transition:transform .45s cubic-bezier(.6,0,.2,1),width .45s cubic-bezier(.6,0,.2,1)}
.jtab .b2 i{transition:width .7s cubic-bezier(.2,.8,.2,1)}
.jtab.fin .num{animation:pop .5s cubic-bezier(.3,1.6,.5,1)}
@keyframes pop{0%{transform:scale(.4) rotate(-90deg)}100%{transform:none}}

/* panels: cursor spotlight + crisp hard shadow on hover */
.pn{position:relative;transition:transform .2s,box-shadow .2s}
.pn::before{content:"";position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .25s;
  background:radial-gradient(260px circle at var(--mx,50%) var(--my,50%),color-mix(in srgb,var(--acc) 14%,transparent),transparent 70%)}
.pn:hover::before{opacity:1}
.pn:hover{transform:translate(-2px,-2px);box-shadow:4px 4px 0 var(--ink);z-index:2}

/* rows: growing accent rule on the left */
.rw{position:relative}
.rw::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--acc);transform:scaleY(0);transform-origin:top;transition:transform .22s}
.rw:hover::before{transform:scaleY(1)}

/* custom square check that draws itself */
.rw .ck>input{appearance:none;-webkit-appearance:none;position:relative;width:16px;height:16px;border:1.5px solid var(--line2);background:var(--bg);display:grid;place-items:center;transition:background .2s,border-color .2s}
.rw .ck>input::after{content:"";width:9px;height:5px;border:2px solid var(--accink,#000);border-top:0;border-right:0;transform:translateY(-1px) rotate(-45deg) scale(0);transition:transform .25s cubic-bezier(.3,1.6,.5,1)}
.rw .ck>input:checked{background:var(--acc);border-color:var(--acc)}
.rw .ck>input:checked::after{transform:translateY(-1px) rotate(-45deg) scale(1)}
.rw .ck>input:focus-visible{outline:2px solid var(--ink);outline-offset:2px}

/* animated strike-through */
.rw.done .t b{text-decoration:none;background:linear-gradient(currentColor,currentColor) 0 55%/100% 1.5px no-repeat}
.rw.cool-justdone .t b{animation:strike .4s ease-out}
@keyframes strike{from{background-size:0 1.5px}to{background-size:100% 1.5px}}

/* minutes pill */
.rw .m{border:1px solid var(--line);padding:1px 5px}
.rw.done .m{opacity:.4}

/* link chips: logo greys out until hover */
.lk{transition:transform .15s,box-shadow .15s}
.lk:hover{transform:translate(-1px,-1px);box-shadow:2px 2px 0 var(--ink)}

/* square confetti */
.cool-bit{position:fixed;width:7px;height:7px;pointer-events:none;z-index:60;will-change:transform,opacity}

/* step-finished toast */
.cool-toast{position:fixed;left:50%;bottom:22px;z-index:61;transform:translate(-50%,140%);background:var(--ink);color:var(--bg);
  font:600 12px var(--mono);padding:10px 14px;border:1px solid var(--ink);box-shadow:4px 4px 0 var(--acc);transition:transform .45s cubic-bezier(.3,1.4,.5,1)}
.cool-toast.on{transform:translate(-50%,0)}

/* marquee ticker under the head */
.cool-tick{overflow:hidden;border-bottom:1px solid var(--line2);margin:0 -36px;background:var(--ink);color:var(--bg)}
.cool-tick div{display:flex;gap:28px;width:max-content;padding:6px 0;font:600 11px var(--mono);letter-spacing:.06em;text-transform:uppercase;animation:mq 38s linear infinite}
.cool-tick span::before{content:"■ ";color:var(--acc)}
@keyframes mq{to{transform:translateX(-50%)}}
@media (max-width:700px){.cool-tick{margin:0 -16px}}

@media (prefers-reduced-motion:reduce){
  .cool-in,.jhead h2 .hl,.cool-tick div,.rw.cool-justdone .t b,.jtab.fin .num{animation:none!important;opacity:1;transform:none}
  .jhead h2 .hl{background-size:100% .28em}
  .jtabs .slide,.pn,.rw::before,.cool-toast{transition:none}
  .pn:hover{transform:none}
}
/* ---- The Grow Gazette: broadsheet look ---- */
:root{--bg:#f3efe3;--bg2:#ebe6d6;--panel:#f8f5ea;--panel2:#ebe6d6;--ink:#161412;--mut:#3b362d;--faint:#5d574b;--line:rgba(22,20,18,.2);--line2:#161412;--red:#b4281e;--acctext:#137a3a;--tint:rgba(34,197,94,.14);
--display:"Playfair Display",Georgia,"Times New Roman",serif;--font:"Source Serif 4",Georgia,"Times New Roman",serif;--dek:"Old Standard TT",Georgia,serif}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#17150f;--bg2:#1e1b14;--panel:#1c1a13;--panel2:#26231a;--ink:#efe9d8;--mut:rgba(239,233,216,.78);--faint:rgba(239,233,216,.55);--line:rgba(239,233,216,.18);--line2:rgba(239,233,216,.75);--red:#ee7a6e;--acctext:#6ee7a0}}
:root[data-theme=dark]{--bg:#17150f;--bg2:#1e1b14;--panel:#1c1a13;--panel2:#26231a;--ink:#efe9d8;--mut:rgba(239,233,216,.78);--faint:rgba(239,233,216,.55);--line:rgba(239,233,216,.18);--line2:rgba(239,233,216,.75);--red:#ee7a6e;--acctext:#6ee7a0}
body{font:16px/1.6 var(--font);background-image:radial-gradient(var(--line) .6px,transparent .7px);background-size:5px 5px;background-attachment:scroll}
body::after{opacity:.04}
h1,h2,h3{font-family:var(--display)}
.wrap{border-left:1px solid var(--line);border-right:1px solid var(--line);background:color-mix(in srgb,var(--bg) 82%,transparent)}
/* dateline + masthead */
.dateline{display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 18px;margin:0 -36px;padding:7px 36px;font:500 10.5px var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--faint);border-bottom:1px solid var(--line2)}
.mast{margin:0 -36px;padding:20px 36px 14px;text-align:center;border-bottom:4px double var(--line2)}
.mast .name{display:block;font:900 clamp(40px,8.6vw,92px)/.95 var(--display);letter-spacing:-.02em;text-decoration:none;color:var(--ink)}
.mast .name em{color:var(--red);font-style:italic}
.mast .tag{margin:8px 0 0;font:italic 400 clamp(13px,1.6vw,17px) var(--dek);color:var(--mut)}
/* rubric nav */
.nav{justify-content:center;gap:6px 22px;flex-wrap:wrap;padding:9px 36px;border-bottom:3px solid var(--line2)}
.nav .brand{font:800 15px var(--display)}
.navr{flex-wrap:wrap;justify-content:center;gap:2px 6px}.navr a{font:600 10.5px var(--mono);letter-spacing:.14em;padding:6px 10px}.navr a:hover{border-color:transparent;color:var(--red);text-decoration:underline}
/* lead story */
.hero{grid-template-columns:2.2fr 1fr}
.hero>div:first-child{padding:34px 36px 30px}
.kicker{font:700 11px var(--mono);letter-spacing:.16em;color:var(--red)}
.hero h1{font:900 clamp(38px,6vw,74px)/1.02 var(--display);letter-spacing:-.02em;margin:10px 0 14px}
.hero .lead{font:italic 400 clamp(17px,1.9vw,21px)/1.45 var(--dek);color:var(--mut);max-width:34em}
.byline{margin:12px 0 18px;padding:6px 0;border-top:1px solid var(--line2);border-bottom:1px solid var(--line);font:600 10.5px var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--faint)}
form{box-shadow:5px 5px 0 var(--ink)}
.proof li{font-family:var(--mono)}
.band{background:none;min-height:0;padding:22px 22px 18px}
.band h4{margin:0 0 10px;padding-bottom:8px;border-bottom:3px double var(--line2);font:700 11px var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--red)}
.band ol{margin:0;padding:0;list-style:none;counter-reset:ins}
.band li{counter-increment:ins;display:flex;gap:10px;padding:9px 0;border-bottom:1px dotted var(--line2);font:600 15px/1.3 var(--display)}
.band li::before{content:counter(ins);font:900 24px/1 var(--display);color:var(--red);min-width:16px}
.band li small{display:block;font:400 12.5px/1.4 var(--font);color:var(--mut);margin-top:2px}
/* what you get: rubric columns */
section h2{font:900 clamp(26px,3.4vw,38px) var(--display)}
section h2::before{color:var(--red);letter-spacing:.16em}
.sub{font:italic 400 17px/1.45 var(--dek)}
.grid{border:0;grid-template-columns:repeat(3,1fr);gap:0}
.grid>*{background:none;border:0;border-right:1px solid var(--line);border-top:3px solid var(--line2);padding:12px 18px 18px 0;margin-right:18px}
.grid>*:nth-child(3n){border-right:0;margin-right:0}
.grid h3{font:800 12px var(--mono);letter-spacing:.14em;text-transform:uppercase;padding-bottom:8px;margin-bottom:10px;border-bottom:1px solid var(--line2)}
.grid p::first-letter{font:900 2.4em/.8 var(--display);float:left;padding:4px 6px 0 0;color:var(--red)}
.grid p{font-size:15px;line-height:1.55}
pre.code{border:1px solid var(--line2);box-shadow:4px 4px 0 var(--ink)}
footer{border-top:4px double var(--line2);margin-top:18px;justify-content:center;text-align:center}
/* plan page */
.jhead{text-align:left}.jhead h2{font:900 clamp(30px,4.6vw,52px)/1.05 var(--display);letter-spacing:-.02em}
.jhead .sub{font:italic 400 17px/1.45 var(--dek)}
.cool-tick{background:var(--ink);color:var(--bg)}
.cool-tick div{font-family:var(--mono)}
.jtabs{border-top:3px solid var(--line2);border-bottom:1px solid var(--line2);background:var(--bg)}
.jtab{font-family:var(--mono);letter-spacing:.08em}
.jlead h3{font:900 28px var(--display)}.jlead .say{font:italic 400 16px var(--dek)}
.pn{background:var(--panel)}
.pn .ph{border-top:3px solid var(--line2);border-bottom:1px solid var(--line2);font:700 10.5px var(--mono);letter-spacing:.12em}
.rw{border-bottom:1px dotted var(--line2)}
.rw .t b{font-family:var(--display);font-weight:700}
.score b{font-family:var(--display);font-weight:900}
.cool-toast{font-family:var(--mono)}
@media(max-width:860px){.dateline,.mast{margin:0 -16px;padding-left:16px;padding-right:16px}.nav{padding-left:16px;padding-right:16px}.hero{grid-template-columns:1fr}.hero>div:first-child{padding:26px 16px 22px}.grid{grid-template-columns:1fr}.grid>*,.grid>*:nth-child(3n){margin-right:0;border-right:0}.dateline span:nth-child(n+3){display:none}}
body.has-plan .dateline,body.has-plan .byline{display:none}
body.has-plan .mast{padding:10px 36px 8px}body.has-plan .mast .name{font-size:clamp(28px,4vw,44px)}body.has-plan .mast .tag{display:none}
form .btn.paste{border-width:1px 0 1px 1px;background:var(--panel2);height:48px}form .btn.paste:hover{background:var(--bg2)}
@media(max-width:560px){form .btn.paste{border-width:0 1px 1px 1px;justify-content:center}}
@property --next-cta-angle{syntax:'<angle>';initial-value:0deg;inherits:false}
.next-cta,form input.next-cta{border:2px solid transparent;background:linear-gradient(var(--panel),var(--panel)) padding-box,conic-gradient(from var(--next-cta-angle),#ef4444,#f59e0b,#eab308,#22c55e,#3b82f6,#8b5cf6,#ef4444) border-box;animation:next-cta-spin 3s linear infinite}
@keyframes next-cta-spin{to{--next-cta-angle:360deg}}
@media (prefers-reduced-motion:reduce){.next-cta,form input.next-cta{animation:none}}
.firstw{margin:14px 0 18px}.firstw .lh{margin-bottom:6px}.first{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px}
.fs{display:flex;flex-direction:column;gap:3px;min-height:72px;padding:12px 14px;border:1px solid var(--line2);background:var(--panel);color:inherit;text-decoration:none;text-align:left;font:inherit;cursor:pointer}
.fs:first-child{background:var(--acc);border-color:var(--acc);color:var(--accink)}.fs:hover{border-color:var(--ink);box-shadow:3px 3px 0 var(--ink)}
.fs .k{font:600 10px var(--mono);letter-spacing:.08em;text-transform:uppercase;opacity:.7}.fs b{font-size:16px;line-height:1.2}.fs small{font-size:12.5px;opacity:.8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rw[hidden]{display:none}.pn .more{display:block;width:100%;min-height:36px;border:0;border-top:1px dashed var(--line2);background:transparent;font:600 10.5px var(--mono);letter-spacing:.06em;text-transform:uppercase;cursor:pointer;color:inherit}.pn .more:hover{background:var(--panel2)}
@media(max-width:560px){.first{grid-template-columns:1fr 1fr}.fs{min-height:84px;padding:10px}.fs b{font-size:14.5px}.fs small{white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}}
/* click targets: sized from a 1,000-user synthetic click map (desktop 28px, touch 40px) */
.pn .btn,.stage .btn,.ib,.lk{min-height:28px}.rw .ck>input{width:18px;height:18px;margin:0}.ck{flex:none;display:flex;padding:7px;margin:-7px -3px -7px -7px;cursor:pointer}h2 a.hl{text-decoration:none;color:inherit}h2 a.hl:hover{text-decoration:underline}a.big{display:inline-block;text-decoration:none;color:inherit}a.big:hover{color:var(--red,var(--acc))}
@media(pointer:coarse){.pn .btn,.stage .btn,.ib,.lk,.navr a{min-height:40px}.pn .ra,.stage .ra{gap:6px}.rw .ck>input{width:24px;height:24px}.skf input,.skf .ib{height:40px}.navr a{display:inline-flex;align-items:center}.rw{padding:10px}footer a{display:inline-flex;align-items:center;min-height:40px;padding:0 8px}}
.pn .btn,.stage .btn{padding:3px 7px;gap:4px;font-size:9.5px;letter-spacing:.05em;line-height:1.3}.pn .btn.go::after,.stage .btn.go::after{content:none}.pn .ra,.stage .ra{gap:3px}.rw .t .ra{margin-top:4px}
/* Copy and Open are icon-only in the columns; the label stays in the DOM for screen readers and the tooltip says what it does */
.pn .ib:not(.go):not([type=submit]),.stage .ib:not(.go):not([type=submit]){font-size:0;gap:0;padding:0;width:26px;height:24px;justify-content:center}
.pn .ib:not(.go) svg.i,.stage .ib:not(.go) svg.i{width:14px;height:14px;stroke-width:1.75}
.pn .ib.go,.stage .ib.go{padding:3px 8px;font-size:9.5px}
/* one tidy toolbar per item: main action, then icon tools, thumbs on the same line when they fit */
.rw .t .ra,.rw .t .fb{display:inline-flex;flex-wrap:wrap;align-items:center;vertical-align:middle;margin:5px 6px 0 0;gap:3px}
.rw .t .fb{padding-left:8px;border-left:1px solid var(--line);margin-left:2px}
.rw .t .fb .worked{flex-basis:100%}
.pn .ib:not(.go):not([type=submit]),.stage .ib:not(.go):not([type=submit]){width:24px;height:22px}
.pn .ib:not(.go) svg.i,.stage .ib:not(.go) svg.i{width:13px;height:13px}
/* inside rows every tool is a square icon, the green one is the main action */
.rw .ib,.rw .ib.go{font-size:0;gap:0;padding:0;width:24px;height:22px;justify-content:center}
.rw .ib svg.i{width:13px;height:13px;stroke-width:1.75}
.rw .t .fb{padding-left:0;border-left:0;margin-left:0}
/* readability pass: solid paper, upright serif for reading, bigger and darker small text */
:root{--mut:#26221b;--faint:#454035;--dek:"Source Serif 4",Georgia,serif}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--mut:rgba(239,233,216,.92);--faint:rgba(239,233,216,.76);--line:rgba(239,233,216,.22)}}
:root[data-theme=dark]{--mut:rgba(239,233,216,.92);--faint:rgba(239,233,216,.76);--line:rgba(239,233,216,.22)}
body{background-image:none;font-size:17px;line-height:1.65}
body::after{display:none}
.wrap{background:none}
.dateline{font-size:11.5px;letter-spacing:.04em;color:var(--mut)}
.mast .tag,.hero .lead,.sub,.jhead .sub,.jlead .say{font-style:normal;font-family:var(--font)}
.mast .tag{font-size:clamp(14px,1.6vw,17px);color:var(--mut)}
.navr a{font-size:12px;letter-spacing:.05em;color:var(--ink)}
.nav .brand{font-size:16px}
.kicker{font-size:12px;letter-spacing:.08em}
.hero h1{font-weight:800;letter-spacing:0}
.hero .lead{font-size:clamp(18px,1.9vw,21px);line-height:1.55;color:var(--ink);max-width:36em}
.byline{font-size:12px;letter-spacing:.04em;color:var(--mut)}
.proof li,.socials,.socials .soc{font-size:12.5px;color:var(--ink)}
.socials .soc{opacity:1}.socials .soc em{color:var(--mut)}
.band h4{font-size:12px;letter-spacing:.08em}
.band li{font-size:17px}.band li small{font-size:14.5px;color:var(--mut)}
section h2::before{font-size:12px;letter-spacing:.08em}
.grid h3{font-size:12.5px;letter-spacing:.06em}
.grid p,.grid p{font-size:16px;color:var(--ink)}
footer,.jtab,.pn .ph,.rw .m,.jtab .pg{letter-spacing:.04em}
.pn .ph{font-size:11.5px}
.rw{font-size:14.5px}.rw .t small{color:var(--mut)}
.cool-tick div{font-size:12px;letter-spacing:.04em}
/* one type system: Fraunces headlines + Source Serif text, three sizes (17 text, 14 small, 12 tiny caps) */
:root{--mono:"Source Serif 4",Georgia,serif;--font:"Source Serif 4",Georgia,serif}
form input,.aboutme,.brief,.brief input{font-family:var(--font)!important;font-size:16px!important}
.navr a,.btn,.kicker,.dateline,.byline,.proof li,.socials,.soc,.soc em,.status,.prog .meta,section h2::before,.band h4,.grid h3,.pn .ph,.rw .m,.fb,.fb .chip,.cool-tick div,.example-link,.brief summary,.band li small,.rw .t small,.rw,.mast .tag,.jtab,.jtab small,.score small{font-size:14px!important;letter-spacing:.03em!important;font-weight:600}
.rw,.band li small,.rw .t small,.mast .tag,.proof li,.status,.socials,.brief summary{font-weight:400}
.dateline,.kicker,.band h4,.pn .ph,section h2::before,.grid h3,.byline{font-size:12px!important;letter-spacing:.08em!important}
.hero .lead,.band li,.grid p{font-size:17px!important}
/* one next step: a single big card, everything else folded away until asked */
.plan-collapsed .jtabs,.plan-collapsed .stage{display:none}
#plan:not(.plan-collapsed) .showall{display:none}
.firstw{margin:22px 0 28px}
.firstw .lh{font-size:12px!important;letter-spacing:.08em!important;text-transform:uppercase;margin:0 0 10px}
.first{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:10px}
.first .lh.then{display:none}
.fs:first-child{padding:24px 26px;gap:10px}
.fs:first-child b{font-size:clamp(24px,3vw,32px);line-height:1.1}
.fs:first-child small{font-size:17px;white-space:normal;opacity:.92}
.fs:first-child .gob{align-self:flex-start;margin-top:8px;padding:12px 20px;background:var(--ink);color:var(--bg);font-weight:700;font-size:16px}
.fs:first-child .gob::after{content:" \2192"}
.fs:not(:first-child){min-height:0;padding:14px 16px}.fs:not(:first-child) small{white-space:normal}
@media(max-width:860px){.first{grid-template-columns:1fr}}
.fs:not(:first-child) .gob{display:none}.showall{display:none}
.showall{margin-top:22px;font-size:14px}
/* fewer buttons: one main button up top, the rest under More; row extras appear on hover or focus */
.jbar details.more{position:relative}
.jbar details.more>summary{list-style:none;cursor:pointer}.jbar details.more>summary::-webkit-details-marker{display:none}
.jbar details.more>summary::after{content:"";display:inline-block;margin-left:7px;border:4px solid transparent;border-top-color:currentColor;border-bottom:0;vertical-align:2px}
.jbar details.more .mm{position:absolute;right:0;top:calc(100% + 6px);z-index:30;display:flex;flex-direction:column;gap:2px;min-width:200px;padding:6px;background:var(--panel);border:1px solid var(--ink);box-shadow:4px 4px 0 var(--ink)}
.jbar details.more .mm .ib{justify-content:flex-start;width:100%;border-color:transparent}
.jbar details.more .mm .ib:hover{background:var(--panel2)}
@media (hover:hover){
 .rw .ra>.ib:not(:first-child),.rw .fb{opacity:0;pointer-events:none;transition:opacity .15s}
 .rw:hover .ra>.ib,.rw:focus-within .ra>.ib,.rw.open .ra>.ib,.rw:hover .fb,.rw:focus-within .fb,.rw.open .fb{opacity:1;pointer-events:auto}
}
@media(prefers-reduced-motion:reduce){*{transition:none!important}}
`;

// Runs in the browser. No template placeholders and no backslashes inside, on purpose.
const JS = String.raw`
const $ = (s) => document.querySelector(s);
const el = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; };
const LOGO_HOSTS = { 'hacker news': 'news.ycombinator.com', 'hacker news (show hn)': 'news.ycombinator.com', 'show hn': 'news.ycombinator.com', bluesky: 'bsky.app', github: 'github.com', reddit: 'reddit.com', 'product hunt': 'producthunt.com', saashub: 'saashub.com', alternativeto: 'alternativeto.net', betalist: 'betalist.com', toolradar: 'toolradar.com', uneed: 'uneed.best', devhunt: 'devhunt.org', foundrlist: 'foundrlist.com', launchamp: 'launchamp.eu', toolpotion: 'toolpotion.ai', aichief: 'aichief.com', sourceforge: 'sourceforge.net', 'x': 'x.com', twitter: 'x.com', linkedin: 'linkedin.com', 'indie hackers': 'indiehackers.com', 'dev.to': 'dev.to', discord: 'discord.com', youtube: 'youtube.com', 'stack overflow': 'stackoverflow.com', medium: 'medium.com', slack: 'slack.com', mastodon: 'joinmastodon.org', lobsters: 'lobste.rs', 'lobste.rs': 'lobste.rs', citable: 'citable.flisk.si', 'readme score': 'readme.flisk.si', 'flisk analytics': 'analytics.flisk.si' };
const logoHost = (name, url) => { const n = String(name || '').toLowerCase().trim(); const k = Object.keys(LOGO_HOSTS).find((x) => n === x || n.startsWith(x + ' ') || n.startsWith('r/') && x === 'reddit'); if (k) return LOGO_HOSTS[k]; try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } };
const logo = (name, url) => { const h = logoHost(name, url); const i = document.createElement('img'); i.className = 'logo'; i.alt = ''; i.width = 16; i.height = 16; i.loading = 'lazy'; if (h) i.src = '/logo/' + h; else i.hidden = true; i.onerror = () => { i.hidden = true; }; return i; };
const named = (tag, cls, name, url) => { const n = el(tag, cls); n.append(logo(name, url), document.createTextNode(name)); return n; };

const LOGO_WORDS = { 'Hacker News': 'news.ycombinator.com', 'Show HN': 'news.ycombinator.com', Bluesky: 'bsky.app', GitHub: 'github.com', Reddit: 'reddit.com', 'Product Hunt': 'producthunt.com', SaaSHub: 'saashub.com', AlternativeTo: 'alternativeto.net', BetaList: 'betalist.com', Toolradar: 'toolradar.com', Uneed: 'uneed.best', DevHunt: 'devhunt.org', FoundrList: 'foundrlist.com', LaunchAmp: 'launchamp.eu', ToolPotion: 'toolpotion.ai', AIChief: 'aichief.com', SourceForge: 'sourceforge.net', LinkedIn: 'linkedin.com', 'Indie Hackers': 'indiehackers.com', 'dev.to': 'dev.to', Discord: 'discord.com', YouTube: 'youtube.com', 'Stack Overflow': 'stackoverflow.com', Medium: 'medium.com', Slack: 'slack.com', Mastodon: 'joinmastodon.org', Lobsters: 'lobste.rs', ChatGPT: 'chatgpt.com', Claude: 'claude.ai', Perplexity: 'perplexity.ai', Gemini: 'gemini.google.com', Twitter: 'x.com', Citable: 'citable.flisk.si', 'Flisk Tools': 'tools.flisk.si', 'skills.sh': 'skills.sh', 'Anthropic skills': 'anthropic.com', 'README Score': 'readme.flisk.si', 'jobs.flisk.si': 'jobs.flisk.si', 'bot.flisk.si': 'bot.flisk.si' };
const LOGO_RE = new RegExp('(?<![\\w.])(' + Object.keys(LOGO_WORDS).sort((a, b) => b.length - a.length).map((w) => w.replace(/\./g, '\\.')).join('|') + ')(?![\\w])', 'g');
// Puts a logo before every company name in the page's text, after each render.
function logoize(root) {
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (t) => { const p = t.parentElement; if (!p || p.closest('script,style,textarea,input,select,option,.nologo')) return NodeFilter.FILTER_REJECT; if (t.previousSibling?.classList?.contains('logo')) return NodeFilter.FILTER_REJECT; LOGO_RE.lastIndex = 0; return LOGO_RE.test(t.data) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; } });
  const todo = []; while (walk.nextNode()) todo.push(walk.currentNode);
  for (const t of todo) {
    const frag = document.createDocumentFragment(); let last = 0; LOGO_RE.lastIndex = 0;
    for (const m of t.data.matchAll(LOGO_RE)) { frag.append(t.data.slice(last, m.index)); const i = document.createElement('img'); i.className = 'logo'; i.alt = ''; i.width = 16; i.height = 16; i.loading = 'lazy'; i.src = '/logo/' + LOGO_WORDS[m[1]]; i.onerror = () => { i.hidden = true; }; frag.append(i, m[1]); last = m.index + m[1].length; }
    frag.append(t.data.slice(last)); t.replaceWith(frag);
  }
}
let logoBusy = false;
new MutationObserver(() => { if (logoBusy) return; logoBusy = true; requestAnimationFrame(() => { logoize(document.body); logoBusy = false; }); }).observe(document.documentElement, { childList: true, subtree: true });
document.addEventListener('DOMContentLoaded', () => logoize(document.body));

const toast = (t) => { const n = $('#toast'); n.textContent = t; n.classList.add('show'); setTimeout(() => n.classList.remove('show'), 1600); };
// The link a friend can open: the plan itself at /p/<id>, kept 30 days. Phones get the share sheet, desktops a copy.
const shareBtn = (id) => button('Share this plan', () => {
  const u = location.origin + '/p/' + id;
  if (navigator.share) navigator.share({ title: document.title, url: u }).catch(() => {});
  else copy(u);
}, 'go');
const copy = (t, b) => { if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => toast('Copied')); };
const link = (label, href, cls) => { const a = el('a', 'btn' + (cls ? ' ' + cls : ''), label); a.href = href; a.target = '_blank'; a.rel = 'noopener'; return a; };
const button = (label, fn) => { const b = el('button', 'btn', label); b.type = 'button'; b.onclick = fn; return b; };
function section(title, sub) { const s = el('section'); s.append(el('h2', '', title)); if (sub) s.append(el('p', 'sub', sub)); return s; }
function host(u) { try { return new URL(u).host; } catch (e) { return u; } }
// A repo link (github.com/owner/repo) is a plan for the repo, not for the code host.
function planName(u) {
  try {
    const x = new URL(u); const h = x.host.replace(/^www\./, '');
    if (/^(github\.com|gitlab\.com|bitbucket\.org)$/.test(h)) { const p = x.pathname.split('/').filter(Boolean); if (p[1]) return p[1].replace(/\.git$/, ''); }
    return x.host;
  } catch (e) { return u; }
}

const BSKY = (n) => n === 'Bluesky';
const XQ = (q, n) => n === 'Instagram' ? 'https://www.instagram.com/explore/search/keyword/?q=' + encodeURIComponent(q) : BSKY(n) ? 'https://bsky.app/search?q=' + encodeURIComponent(q) : 'https://x.com/search?f=live&q=' + encodeURIComponent(q);
const POST = (t, n) => n === 'Instagram' ? 'https://www.instagram.com/' : (BSKY(n) ? 'https://bsky.app/intent/compose?text=' : 'https://x.com/intent/post?text=') + encodeURIComponent(t);
function drawFollowers(id, plan) {
  const out = $('#plan'); out.replaceChildren();
  document.title = 'Followers plan for @' + plan.handle + ' · Flisk Grow';
  const head = section('A followers plan for @' + plan.handle, plan.account || '');
  const share = el('div', 'share');
  share.append(button('Save to my cabinet', () => fetch('/me').then(() => fetch('/api/sites', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: plan.url, plan: id }) })).then((r) => r.json()).then((j) => { location.href = '/me?site=' + j.id; })), shareBtn(id), link('Open the profile', plan.url), el('span', '', 'Kept 30 days. Nothing is posted for you.'));
  if (!id) share.querySelectorAll('button')[1].remove();
  head.append(share);
  if (plan.generic) head.append(el('p', 'note', 'Made without the model: its free budget is used up or it is too slow right now (the budget resets at 00:00 UTC). This is a general playbook with blanks to fill. Press the button again tomorrow for a plan written for your account.'));
  out.append(head);

  const a = section('Who should follow you');
  const two = el('div', 'two'); const l = el('div'); l.append(el('p', 'pitch', plan.bio || '')); l.append(el('div', 'acts', ''));
  if (plan.bio) l.lastChild.append(button('Copy bio', () => copy(plan.bio)));
  const r = el('div'); r.append(el('p', '', plan.audience));
  if (plan.today) { const t = el('div', 'today'); t.append(el('small', '', 'Do this today'), el('div', '', plan.today)); r.append(t); }
  two.append(l, r); a.append(two); out.append(a);

  if (plan.pinned) {
    const pn = section('Your pinned post', 'The first thing a stranger sees. Pin it, then send people to your profile.');
    const d = el('div', 'mail'); d.append(el('pre', '', plan.pinned));
    const ac = el('div', 'acts'); ac.append(link('Open in ' + plan.network, POST(plan.pinned, plan.network), 'go'), button('Copy', () => copy(plan.pinned)));
    d.append(ac); pn.append(d); out.append(pn);
  }

  const w = section('Your first 7 days', 'About 20 minutes a day. Keep going every week after: followers come from showing up.');
  const wg = el('div', 'grid');
  plan.week.forEach((x) => { const c = el('div'); c.append(el('h3', '', x.day), el('p', '', x.do)); wg.append(c); });
  w.append(wg); out.append(w);

  const p = section('Posts to write (' + plan.posts.length + ')', 'Opens the post box with the text filled in. You read it, change it and post it yourself.');
  const pg = el('div', 'grid');
  plan.posts.forEach((x) => {
    const d = el('div', 'mail'); d.append(el('h3', '', x.title), el('pre', '', x.body));
    const ac = el('div', 'acts'); ac.append(link('Open in ' + plan.network, POST(x.body, plan.network), 'go'), button('Copy', () => copy(x.body)));
    d.append(ac); pg.append(d);
  });
  p.append(pg); out.append(p);

  if (plan.queries.length || plan.replies.length) {
    const rp = section('Replies that bring followers', 'Answer people who are asking right now. A useful reply is read by everyone who follows the post. No pitch.');
    if (plan.queries.length) { const qa = el('div', 'acts'); plan.queries.forEach((q) => qa.append(link('Find: ' + q, XQ(q, plan.network)))); rp.append(qa); }
    const rg = el('div', 'grid');
    plan.replies.forEach((x) => { const d = el('div', 'mail'); d.append(el('div', 'to', 'To: ' + (x.to || 'a post that fits')), el('pre', '', x.body)); const ac = el('div', 'acts'); ac.append(button('Copy', () => copy(x.body))); d.append(ac); rg.append(d); });
    rp.append(rg); out.append(rp);
  }

  if (plan.accounts.length) {
    const ag = el('div', 'grid');
    plan.accounts.forEach((x) => { const c = el('div'); c.append(el('h3', '', x.name), el('p', '', x.why)); ag.append(c); });
    const as = section('Accounts to follow and answer', 'Reply under their posts first. Their readers are your audience.'); as.append(ag); out.append(as);
  }
  out.hidden = false; $('#about').hidden = true;
}

// The customer plan as one page in five steps, in the order a maker does them. Sticky tabs jump to a step and
// follow the scroll; every row is a task with a tick box (kept in this browser), every action has an icon and a tooltip.
const ICON = {
  open: '<path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  post: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  up: '<path d="M7 10v11H3V10z"/><path d="M7 10l4-8a3 3 0 0 1 3 3v4h5a2 2 0 0 1 2 2.3l-1.4 8A2 2 0 0 1 17.6 21H7"/>',
  down: '<path d="M17 14V3h4v11z"/><path d="M17 14l-4 8a3 3 0 0 1-3-3v-4H5a2 2 0 0 1-2-2.3l1.4-8A2 2 0 0 1 6.4 3H17"/>',
  redo: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  down2: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
};
const svg = (k) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('class', 'i'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = ICON[k]; return s; };
const tip = (n, t) => { n.setAttribute('data-tip', t); return n; };
const iopen = (label, href, t, go, icon) => { const a = el('a', 'ib' + (go ? ' go' : '')); a.href = href; a.target = '_blank'; a.rel = 'noopener'; a.append(svg(icon || 'open'), label); return tip(a, t); };
const icopy = (text, t) => { const b = el('button', 'ib'); b.type = 'button'; b.append(svg('copy'), 'Copy'); b.onclick = () => copy(text); return tip(b, t || 'Copy the text'); };
const ibtn = (label, icon, t, fn, go) => { const b = el('button', 'ib' + (go ? ' go' : '')); b.type = 'button'; b.append(svg(icon), label); b.onclick = fn; return tip(b, t); };
const dot = (s, t) => tip(el('span', 'dot ' + s), t);
const clip = (t, n) => (t.length > n ? t.slice(0, n - 1) + '…' : t);

let J = null; // the plan on screen: id, ticked rows, steps, tabs
const doneKey = (id) => 'grow-done:' + (id || 'guide');
function loadDone(id) { try { return new Set(JSON.parse(localStorage.getItem(doneKey(id)) || '[]')); } catch (e) { return new Set(); } }
function saveDone() { try { localStorage.setItem(doneKey(J.id), JSON.stringify([...J.done])); } catch (e) {} }

// Feedback on one item: thumbs up or down, and once it is ticked, did it work. Sent to /api/feedback as counts only,
// remembered in this browser so a second click does not count twice.
const FB = /^(mail|post|place|promo|list)\d+$/;
const fbKey = (id) => 'grow-fb:' + id;
function fbLoad(id) { try { return JSON.parse(localStorage.getItem(fbKey(id)) || '{}'); } catch (e) { return {}; } }
function fbSend(key, slot, value, box) {
  const m = J.fb[key] = J.fb[key] || {}; if (m[slot] === value) return; m[slot] = value;
  try { localStorage.setItem(fbKey(J.id), JSON.stringify(J.fb)); } catch (e) {}
  box.querySelectorAll('[data-' + slot + ']').forEach((b) => b.classList.toggle('on', b.dataset[slot] === value));
  fetch('/api/feedback', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ plan: J.id, item: key, value }) }).catch(() => {});
  toast(slot === 't' ? 'Thanks. This helps the next plans.' : 'Noted. Thanks.');
}
function fbBar(key) {
  const box = el('div', 'fb'); const m = J.fb[key] || {};
  const thumb = (v, label, icon, t) => { const b = ibtn(label, icon, t, () => fbSend(key, 't', v, box)); b.dataset.t = v; if (m.t === v) b.classList.add('on'); return b; };
  box.append(thumb('up', 'Good', 'up', 'A good suggestion'), thumb('down', 'Bad', 'down', 'A bad suggestion: wrong place, wrong people or bad text'));
  const w = el('span', 'worked'); w.append(el('span', 'sep'), el('span', '', 'Did it work?'));
  [['reply', 'Reply'], ['signup', 'Signup'], ['upvotes', 'Upvotes'], ['nothing', 'Nothing yet']].forEach(([v, l]) => { const b = el('button', 'chip'); b.type = 'button'; b.textContent = l; b.dataset.w = v; if (m.w === v) b.classList.add('on'); b.onclick = () => fbSend(key, 'w', v, box); w.append(b); });
  box.append(w); return box;
}
// Rewrite one email, post or place; the rest of the plan stays as it is.
function rewriteBtn(kind, index) {
  if (!J.canEdit) return null;
  return ibtn('Rewrite', 'redo', 'Write this one again with a new angle. The rest of the plan stays.', async (e) => {
    const rw = e.currentTarget.closest('.rw'); rw.classList.add('busy'); toast('Rewriting...');
    try {
      const r = await fetch('/api/rewrite', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: J.id, kind, index }) });
      const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'The rewrite did not work. Press again.');
      const y = scrollY, key = (kind === 'email' ? 'mail' : kind) + index; J.done.delete(key); saveDone(); delete J.fb[key];
      draw(J.id, j.plan); scrollTo(0, y); const n = document.querySelector('.rw input[data-k="' + key + '"]'); if (n) n.closest('.rw').classList.add('open');
      toast('Rewritten');
    } catch (err) { rw.classList.remove('busy'); toast(err.message); }
  });
}

// One task: tick box, a logo or dot, the text (click to read all of it), about how long it takes, and its actions.
function row(key, lead, title, sub, acts, under, m) {
  const r = el('div', 'rw'); const c = el('input'); c.type = 'checkbox'; c.dataset.k = key; c.setAttribute('aria-label', 'Done: ' + title); tip(c, 'Tick when done. Kept in this browser.');
  if (J.done.has(key)) { c.checked = true; r.classList.add('done'); }
  const t = el('div', 't' + (lead && lead.classList && lead.classList.contains('logo') ? ' nologo' : '')); t.append(el('b', '', title)); if (sub) t.append(el('small', '', sub));
  tip(t, clip(sub ? title + ': ' + sub : title, 280) + (sub && sub.length > 60 ? ' (click to read all)' : ''));
  t.onclick = (e) => { if (!e.target.closest('a,button,input')) r.classList.toggle('open'); };
  const ck = el('label', 'ck'); ck.append(c); r.append(ck); if (lead) r.append(lead); r.append(t);
  if (m) { const ms = el('span', 'm', mins(m)); tip(ms, 'Takes about ' + mins(m)); r.dataset.m = m; r.append(ms); }
  if (acts && acts.length) { const a = el('div', 'ra'); a.append(...acts.filter(Boolean)); (under ? t : r).append(a); }
  if (J.canEdit && FB.test(key)) t.append(fbBar(key));
  return r;
}
const FOLD = 4; // rows a pane shows before Show all
function pane(title, lead, rows, hint, cls) {
  const p = el('div', 'pn' + (cls ? ' ' + cls : '')); const h = el('div', 'ph nologo'); if (lead) h.append(lead);
  h.append(el('span', 'pt', title)); if (rows) h.append(el('span', 'n', String(rows.length)));
  if (hint) tip(h, hint);
  const b = el('div', 'bd'); if (rows) b.append(...rows);
  if (rows && rows.length > FOLD + 1) { rows.slice(FOLD).forEach((r) => { r.hidden = true; }); const m = el('button', 'more'); m.type = 'button'; m.textContent = 'Show all ' + rows.length; m.onclick = () => { rows.forEach((r) => { r.hidden = false; }); m.remove(); }; b.append(m); }
  p.append(h, b); return p;
}
function card(title, lead, kids, hint) { const p = pane(title, lead, null, hint); const c = el('div', 'pc'); c.append(...kids.filter(Boolean)); p.lastChild.append(c); return p; }
const LAUNCH = /hacker news|product hunt|betalist|uneed|devhunt|foundrlist|launchamp/i;
const postLink = (x, plan) => {
  const u = plan.site || plan.url;
  if (x.where === 'X') return iopen('Post', 'https://x.com/intent/post?text=' + encodeURIComponent((x.body || x.title) + ' ' + u), 'Open X with this post filled in. You post it.', true, 'post');
  if (x.where === 'Reddit') return iopen('Post', 'https://www.reddit.com/submit?url=' + encodeURIComponent(u) + '&title=' + encodeURIComponent(x.title), 'Open the Reddit submit page with the title filled in', true, 'post');
  if (x.where === 'Hacker News') return iopen('Post', 'https://news.ycombinator.com/submitlink?u=' + encodeURIComponent(u) + '&t=' + encodeURIComponent(x.title), 'Open the Hacker News submit page with the title filled in', true, 'post');
  if (x.where === 'Discord') return iopen('Channel', 'https://discord.com/channels/1562937840071999538/1569404291196915904', 'Open the #show-your-stack channel; paste the copied text there', true);
  return null;
};
const saveSite = (id, plan) => fetch('/me').then(() => fetch('/api/sites', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: plan.url, plan: id }) })).then((r) => r.json());

// Your links: the pages the plan read (the site, then its GitHub, X ...). Click one, or Edit links, to add
// more; a new plan reads them too. Pasted links go to their place by host.
const SLOTS = [['GitHub', 'github.com'], ['X', 'x.com'], ['LinkedIn', 'linkedin.com'], ['Product Hunt', 'producthunt.com'], ['Hacker News', 'news.ycombinator.com'], ['Reddit', 'reddit.com'], ['YouTube', 'youtube.com'], ['Docs', ''], ['npm', 'npmjs.com'], ['PyPI', 'pypi.org'], ['Discord', 'discord.com'], ['Bluesky', 'bsky.app']];
const SLOT_RE = { GitHub: /(^|[.])github[.]com$/, X: /(^|[.])(x|twitter)[.]com$/, LinkedIn: /(^|[.])linkedin[.]com$/, 'Product Hunt': /(^|[.])producthunt[.]com$/, 'Hacker News': /^news[.]ycombinator[.]com$/, Reddit: /(^|[.])reddit[.]com$/, YouTube: /(^|[.])(youtube[.]com|youtu[.]be)$/, npm: /(^|[.])npmjs[.]com$/, PyPI: /^pypi[.]org$/, Discord: /(^|[.])(discord[.]gg|discord[.]com)$/, Bluesky: /^bsky[.]app$/ };
function slotOf(u) {
  let x; try { x = new URL(u); } catch (e) { return ''; }
  const h = x.hostname.toLowerCase(); const k = Object.keys(SLOT_RE).find((s) => SLOT_RE[s].test(h));
  return k || (/^(docs|developer|developers)[.]/.test(h) || /[/]docs([/]|$)/.test(x.pathname) ? 'Docs' : '');
}
const asLink = (v) => {
  v = String(v || '').trim().replace(/[),;]+$/, ''); if (!v) return '';
  if (!/^https?:[/][/]/i.test(v)) v = 'https://' + v.replace(/^[/]+/, '');
  try { const u = new URL(v); return u.hostname.includes('.') ? u.href : ''; } catch (e) { return ''; }
};
const short = (u) => String(u).replace(/^https?:[/][/](www[.])?/, '').replace(/[/]$/, '');

function linksBar(plan) {
  const by = {}; const other = [];
  const more = {};
  (Array.isArray(plan.links) ? plan.links : []).forEach((u) => { const k = slotOf(u); if (k && !by[k]) by[k] = u; else { other.push(u); if (k) more[k] = (more[k] || 0) + 1; } });
  const wrap = el('div', 'jlinks nologo'); const top = el('div', 'ltop'); const strip = el('div', 'lks');
  const drawer = el('div', 'jdrawer'); drawer.hidden = true;
  const openDrawer = (k) => {
    drawer.hidden = false; ed.setAttribute('aria-expanded', 'true');
    const f = k && drawer.querySelector('input[data-k="' + k + '"]');
    (f && !f.readOnly ? f : drawer.querySelector('input:not([readonly])')).focus();
  };
  const chip = (label, u, hint, n) => {
    const b = el('button', 'lk' + (u ? '' : ' empty')); b.type = 'button';
    b.append(logo(label, u || (hint ? 'https://' + hint : '')), el('span', '', u ? label : '+ ' + label));
    tip(b, u ? label + ': ' + short(u) + (n ? ' and ' + n + ' more' : '') + ' · click to edit' : 'Add your ' + label + ' link to get more ideas');
    b.onclick = () => openDrawer(label); return b;
  };
  strip.append(chip('Website', plan.url, ''));
  SLOTS.forEach(([k, h]) => strip.append(chip(k, by[k], h, more[k])));
  // A second GitHub repo and the like stay in the paste box, not as more chips.
  other.filter((u) => !slotOf(u)).forEach((u) => strip.append(chip(host(u).replace(/^www[.]/, ''), u, '')));
  const ed = ibtn('Edit links', 'post', 'Add or change your links. Paste many at once.', () => { if (drawer.hidden) openDrawer(); else close(); });
  ed.setAttribute('aria-expanded', 'false');
  top.append(el('span', 'lh', 'Your links'), strip, ed);

  const grid = el('div', 'lgrid');
  const field = (k, v, h, ro) => {
    const l = el('label', 'lin'); l.append(logo(k, v || (h ? 'https://' + h : '')), el('span', 'k', k));
    const i = el('input'); i.type = 'text'; i.inputMode = 'url'; i.value = v || ''; i.dataset.k = k; i.placeholder = ro ? '' : (h || 'docs.your-site.com') + '/...';
    i.setAttribute('aria-label', k + ' link'); if (ro) { i.readOnly = true; tip(l, 'The page this plan is for'); } l.append(i); return l;
  };
  grid.append(field('Website', plan.url, '', true), ...SLOTS.map(([k, h]) => field(k, by[k], h, false)));
  const ta = el('textarea'); ta.rows = 2; ta.value = other.join('\n'); ta.setAttribute('aria-label', 'More links');
  ta.placeholder = 'Paste many links here, one per line. Each one goes to its place above.';
  // Pasted links fill the empty places they belong to; the rest stay in the box.
  const sortPaste = () => {
    const keep = [];
    ta.value.split(/[\s,]+/).map(asLink).filter(Boolean).forEach((u) => {
      const f = grid.querySelector('input[data-k="' + slotOf(u) + '"]');
      if (f && !f.readOnly && !f.value.trim()) f.value = u; else keep.push(u);
    });
    ta.value = keep.join('\n');
  };
  ta.addEventListener('blur', sortPaste); ta.addEventListener('paste', () => setTimeout(sortPaste, 0));
  const msg = el('p', 'note'); msg.hidden = true;
  const LABEL = 'Make a new plan with these links';
  const go = ibtn(LABEL, 'send', 'Makes a new plan that also reads these links. It counts as one of your plans today.', async () => {
    sortPaste();
    const ls = [...grid.querySelectorAll('input:not([readonly])')].map((i) => asLink(i.value)).concat(ta.value.split(/[\s,]+/).map(asLink)).filter(Boolean);
    if (!ls.length) { msg.hidden = false; msg.textContent = 'Add at least one link first.'; return; }
    go.disabled = true; go.lastChild.textContent = 'Making the plan...'; msg.hidden = false; msg.textContent = 'Reading your links. This takes about 20 seconds.';
    try {
      const r = await fetch('/api/plan', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: plan.url, links: ls }), signal: AbortSignal.timeout(120000) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.id) throw new Error(j.error || 'Something went wrong. Press the button again.');
      location.href = '/p/' + j.id;
    } catch (e) {
      go.disabled = false; go.lastChild.textContent = LABEL;
      msg.textContent = e.name === 'TimeoutError' ? 'The plan took too long. Press the button again in a minute.' : e.message;
    }
  }, true);
  const close = () => { drawer.hidden = true; ed.setAttribute('aria-expanded', 'false'); };
  const acts = el('div', 'ra'); acts.append(go, ibtn('Cancel', 'x', 'Close without changes', close));
  drawer.append(grid, ta, acts, msg);
  drawer.addEventListener('keydown', (e) => { if (e.key === 'Escape') { close(); ed.focus(); } });
  wrap.append(top, drawer); return wrap;
}
const mins = (m) => (m >= 60 ? Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '') : m + ' min');

// Export: the plan as a Markdown to-do list, and the email days as calendar events. Both are made in the browser.
function planLink(id) { return id === 'example' ? location.origin + '/example' : id ? location.origin + '/p/' + id : location.origin; }
function saveFile(name, type, text) {
  const a = el('a'); a.href = URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' })); a.download = name.replace(/[^A-Za-z0-9._-]+/g, '-');
  document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function planMd(id, plan) {
  const L = ['# Grow plan for ' + planName(plan.url), '', plan.url + (plan.product ? ': ' + plan.product : ''), 'Plan: ' + planLink(id), ''];
  if (plan.buyers) L.push('**Who would buy it:** ' + plan.buyers, '');
  if (plan.pitch) L.push('**Pitch:** ' + plan.pitch, '');
  if (plan.today) L.push('**Do this today:** ' + plan.today, '');
  const sec = (t, rows) => { if (rows.length) L.push('## ' + t, '', ...rows, ''); };
  sec('1. Get ready', ((plan.check && plan.check.fixes) || []).filter((f) => f.status !== 'pass').map((f) => '- [ ] Fix: ' + f.title + ' (' + f.summary + ')'));
  sec('2. Find buyers', plan.places.map((x) => '- [ ] ' + x.name + (x.url ? ' <' + x.url + '>' : '') + ': ' + x.why));
  sec('3. Reach out', plan.emails.flatMap((e, i) => ['- [ ] Day ' + [1, 1, 3, 3, 5][Math.min(i, 4)] + ', email ' + (e.to ? 'to ' + e.to : '') + ': **' + e.subject + '**', ...(e.find ? ['  - Find them: ' + e.find + (e.place != null && plan.places[e.place] && plan.places[e.place].url ? ' <' + plan.places[e.place].url + '>' : '')] : []), '', '  > ' + e.body.split('\n').join('\n  > '), ...(e.followup ? ['', '  - [ ] Day 7 follow-up if no reply: ' + e.followup.split('\n').join(' ')] : []), '']));
  sec('4. Post', (plan.posts || []).flatMap((x) => ['- [ ] ' + x.where + (x.title ? ': **' + x.title + '**' : ''), '', '  > ' + x.body.split('\n').join('\n  > '), '']));
  sec('5. Get listed', plan.listings.map((x) => '- [ ] ' + x.name + ' <' + x.url + '>'));
  return L.join('\n');
}
function planIcs(id, plan) {
  const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n - 1); return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0'); };
  const esc2 = (t) => String(t).replace(/[\\;,]/g, (c) => '\\' + c).replace(/\r?\n/g, '\\n');
  const fold = (line) => { const out = []; for (let i = 0; i < line.length; i += 70) out.push((i ? ' ' : '') + line.slice(i, i + 70)); return out.join('\r\n'); };
  const link = planLink(id), name = planName(plan.url), stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const mails = (a, b) => plan.emails.slice(a, b).map((e) => '- Email ' + (e.to || '') + ': ' + e.subject);
  const p = (w) => (plan.posts || []).filter((x) => x.where === w).map((x) => '- Post on ' + w + ': ' + (x.title || clip(x.body, 60)));
  const f0 = plan.check && plan.check.fixes.find((f) => f.status !== 'pass');
  const ev = [
    [1, 'Day 1: first emails', [...mails(0, 2), ...(f0 ? ['- Fix: ' + f0.title] : []), ...p('X')]],
    [3, 'Day 3: next emails and Reddit', [...mails(2, 4), ...p('Reddit'), ...p('Discord')]],
    [5, 'Day 5: last emails, Hacker News and listings', [...mails(4, 99), ...p('Hacker News'), ...plan.listings.slice(0, 3).map((x) => '- List it on ' + x.name)]],
    [8, 'Day 8: follow up the Day 1 emails', plan.emails.slice(0, 2).filter((e) => e.followup).map((e) => '- Re: ' + e.subject)],
    [10, 'Day 10: follow up the Day 3 emails', plan.emails.slice(2, 4).filter((e) => e.followup).map((e) => '- Re: ' + e.subject)],
    [12, 'Day 12: follow up the Day 5 emails', plan.emails.slice(4).filter((e) => e.followup).map((e) => '- Re: ' + e.subject)],
  ].filter((e) => e[2].length);
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Flisk//Grow//EN', 'CALSCALE:GREGORIAN'];
  ev.forEach(([n, t, rows], k) => L.push('BEGIN:VEVENT', 'UID:' + (id || 'guide') + '-' + k + '-' + day(1) + '@grow.flisk.si', 'DTSTAMP:' + stamp, 'DTSTART;VALUE=DATE:' + day(n), 'DTEND;VALUE=DATE:' + day(n + 1), fold('SUMMARY:' + esc2('Grow · ' + name + ' · ' + t)), fold('DESCRIPTION:' + esc2(rows.join('\n') + '\n\nThe plan: ' + link)), fold('URL:' + link), 'END:VEVENT'));
  L.push('END:VCALENDAR'); return L.join('\r\n') + '\r\n';
}

function draw(id, plan) {
  if (plan.kind === 'followers') { J = null; return drawFollowers(id, plan); }
  const out = $('#plan'); out.replaceChildren();
  document.title = 'Grow plan for ' + planName(plan.url) + ' · Flisk Grow';
  const ex = id === 'example';
  J = { id, done: loadDone(id), cur: 0, lock: 0, fb: id ? fbLoad(id) : {}, canEdit: !!id && !ex && !plan.generic };

  const head = el('div', 'jhead');
  head.append(el('div', 'kicker', ex ? 'An example plan · paste your own link above' : id ? 'Your plan · kept 30 days' : 'A general guide'), (() => { const h = el('h2', '', 'A plan for '); const a = el('a', 'hl', planName(plan.url)); a.href = plan.url; a.dataset.c = 'site name'; a.target = '_blank'; a.rel = 'noopener'; tip(a, 'Open ' + host(plan.url) + ' in a new tab'); h.append(a); return h; })());
  if (plan.product) head.append(el('p', 'sub', plan.product));
  head.append(linksBar(plan));
  const bar = el('div', 'jbar');
  J.count = el('span', 'jcount'); tip(J.count, 'Tasks done across all 5 steps');
  const cnt = el('span', 'jcwrap'); cnt.append(svg('check'), J.count);
  bar.append(cnt); if (!ex) bar.append(ibtn('Save to my cabinet', 'save', 'Keep this plan in your cabinet and watch new places to post', () => saveSite(id, plan).then((j) => { location.href = '/me?site=' + j.id; })));
  if (id) bar.append(ibtn('Share this plan', 'share', 'Send a link to this plan to your team', () => { const u = location.origin + (ex ? '/example' : '/p/' + id); if (navigator.share) navigator.share({ title: document.title, url: u }).catch(() => {}); else copy(u); }, true));
  bar.append(ibtn('Calendar', 'cal', 'Download the Day 1, 3 and 5 tasks and the follow-ups as calendar events (.ics) for Google Calendar, Outlook or Apple', () => saveFile(planName(plan.url) + '-grow-plan.ics', 'text/calendar', planIcs(id, plan))));
  bar.append(ibtn('Export', 'down2', 'Download the plan as a Markdown to-do list (pastes into Notion, Obsidian, GitHub). The text is copied too.', () => { const md = planMd(id, plan); saveFile(planName(plan.url) + '-grow-plan.md', 'text/markdown', md); copy(md); }));
  bar.append(iopen('Open the site', plan.url, 'Open ' + host(plan.url) + ' in a new tab'));
  { const its = [...bar.querySelectorAll(':scope > .ib:not(.go)')]; if (its.length > 1) { const d = el('details', 'more'); const sm = el('summary', 'ib', 'More'); const mm = el('div', 'mm'); mm.append(...its); d.append(sm, mm); bar.append(d); } }
  head.append(bar);
  if (plan.generic) head.append(el('p', 'note', 'Made without the model: its free budget is used up or it is too slow right now (the budget resets at 00:00 UTC). The AI-search check and the listings are real; the rest is a general guide with blanks to fill. Press the button again tomorrow for a plan written for your page.'));
  out.append(head);

  // 1. Get ready
  const ready = [];
  if (plan.check) {
    const sc = el('a', 'big'); sc.href = plan.check.report; sc.dataset.c = 'score'; sc.target = '_blank'; sc.rel = 'noopener'; tip(sc, 'Open the full Citable report'); sc.append(String(plan.check.score), el('small', '', '/100 · ' + plan.check.grade));
    ready.push(card('Can AI search find it', logo('Citable', 'https://citable.flisk.si'), [sc, el('p', '', 'ChatGPT, Claude and Perplexity answer from pages they can read. Citable checks yours.'), (() => { const a = el('div', 'ra'); a.append(iopen('Full report', plan.check.report, 'Open the full Citable report for your page', true)); return a; })()], 'The AI-search score from Citable'));
    const fx = plan.check.fixes.map((f, i) => row('fix' + i, dot(f.status === 'pass' ? 'ok' : f.status === 'warn' ? 'warn' : 'bad', f.status === 'warn' ? 'Should fix soon' : 'Fix first: this hurts most'), f.title, f.summary, [icopy(f.title + ': ' + f.summary, 'Copy this fix to send to whoever edits your site')], false, 15));
    ready.push(pane('Fix your page', logo('', plan.url), fx.length ? fx : [row('fix-none', dot('ok', 'Fine as it is'), 'Nothing to fix', 'AI search can read this page.')], 'What stops AI search from quoting your page'));
  } else if (plan.noSite) ready.push(card('Can AI search find it', logo('Citable', 'https://citable.flisk.si'), [el('p', '', 'This link is a GitHub repo, so there is no page of yours to check: github.com is not yours to fix. Add your website in Edit links, or set the repo\'s Website field, and make the plan again.'), (() => { const a = el('div', 'ra'); a.append(iopen('Check the README', 'https://readme.flisk.si', 'Score the README on README Score', true)); return a; })()], 'No website to check yet'));
  else ready.push(card('Can AI search find it', logo('Citable', 'https://citable.flisk.si'), [el('p', '', 'The check did not answer this time.'), (() => { const a = el('div', 'ra'); a.append(iopen('Try on Citable', 'https://citable.flisk.si', 'Run the AI-search check on Citable')); return a; })()]));
  const gres = el('div', 'ra');
  const gb = ibtn('Post as jobs', 'send', 'Post these checks as jobs on jobs.flisk.si; a bot does them within about 5 minutes', async () => {
    gb.disabled = true; gb.lastChild.textContent = 'Posting...';
    try {
      const a = await saveSite(id, plan);
      const j = await fetch('/api/sites/' + a.id + '/jobs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).then((r) => r.json());
      if (j.error) throw new Error(j.error);
      gres.replaceChildren(); j.posted.forEach((x) => gres.append(iopen(x.title, x.link, 'Open this job on jobs.flisk.si', true)));
      if (!j.posted.length) gres.append(el('p', 'note', j.note || 'Nothing to post.'));
      gres.append(iopen(j.posted.length ? 'See all in my cabinet' : 'See them in my cabinet', '/me?site=' + a.id, 'Open your cabinet for this site'));
      gb.lastChild.textContent = 'Posted'; toast('Posted');
    } catch (e) { gb.disabled = false; gb.lastChild.textContent = 'Post as jobs'; toast(e.message); }
  }, true);
  const gbx = el('div', 'ra'); gbx.append(gb);
  ready.push(card('Get the gaps done', null, [el('p', '', 'Posts the checks a bot really does to jobs.flisk.si: can AI search find your site, and how good is your README (when the site links its GitHub repo). Free and public.'), gbx, gres], 'A bot does the checks for you'));
  if (plan.ranker) {
    const k = plan.ranker; const kids = [el('p', '', k.listed ? 'Ranker ranks ' + k.repo + ' by stars gained each day. Put the live badge in your README.' : 'Ranker could not list ' + k.repo + ' just now; open it to try again.')];
    if (k.badge) { const img = el('img', 'badge'); img.src = k.badge; img.alt = 'Flisk Ranker badge'; img.width = 250; img.height = 55; kids.push(img); }
    const a = el('div', 'ra'); a.append(iopen(k.listed ? 'Open on Ranker' : 'List it on Ranker', k.url, 'See your repo on Ranker', true)); if (k.markdown) a.append(icopy(k.markdown, 'Copy the badge as Markdown for your README')); kids.push(a);
    ready.push(card('Your rank on Ranker', null, kids, 'GitHub repos ranked by stars gained each day'));
  }
  ready.push(pane('More free checks', null, plan.tools.map((x, i) => row('tool' + i, logo(x.name, x.url), x.name, x.why, [iopen('Open', x.url, 'Open ' + x.name + ' in a new tab')], false, 2)), 'Free Flisk checks for your page'));
  const SKILL_SOURCES = [
    { name: 'Flisk Tools', why: 'Free agent skills from GitHub, sorted by stars, with search and categories.', url: (q) => 'https://tools.flisk.si/skills' + (q ? '?q=' + encodeURIComponent(q) : '') },
    { name: 'skills.sh', why: 'The open skills directory that the npx skills command installs from.', url: (q) => 'https://skills.sh/' + (q ? '?q=' + encodeURIComponent(q) : '') },
    { name: 'GitHub', why: 'Every skill is a SKILL.md file in a repository; search them all.', url: (q) => 'https://github.com/search?type=code&q=' + encodeURIComponent('filename:SKILL.md ' + q) },
    { name: 'Anthropic skills', why: 'The official example skills from Anthropic, free to copy.', url: () => 'https://github.com/anthropics/skills' },
  ];
  const sf = el('form', 'skf'); sf.setAttribute('role', 'search');
  const si = el('input'); si.type = 'search'; si.placeholder = 'review code, write tests, deploy'; si.setAttribute('aria-label', 'What should the skill do');
  const sb = el('button', 'ib go'); sb.type = 'submit'; sb.append(svg('search'), 'Find skill'); tip(sb, 'Search Flisk Tools for a skill that does this');
  sf.append(si, sb);
  const skl = SKILL_SOURCES.map((x) => { const a = iopen('Open', x.url(''), 'Search ' + x.name + ' for skills'); return { a, x }; });
  const sync = () => skl.forEach((s) => { s.a.href = s.x.url(si.value.trim()); });
  si.addEventListener('input', sync);
  sf.addEventListener('submit', (e) => { e.preventDefault(); window.open(SKILL_SOURCES[0].url(si.value.trim()), '_blank', 'noopener'); });
  const skp = pane('Find a skill for your AI agent', null, null, 'Agents like Claude Code load skills from folders with a SKILL.md file');
  skp.lastChild.append(sf, ...skl.map((s) => { const r = el('div', 'rw'); const t = el('div', 't nologo'); t.append(el('b', '', s.x.name), el('small', '', s.x.why)); tip(t, s.x.why); r.append(logo(s.x.name, s.x.url('')), t, s.a); return r; }));
  ready.push(skp);

  // 2. Find buyers
  const buyers = [card('Who would buy it', null, [el('p', 'pitch', plan.pitch || ''), el('p', '', plan.buyers || ''), plan.today ? (() => { const t = el('div', 'today'); t.append(el('small', '', 'Do this today'), el('div', '', plan.today)); return t; })() : null, plan.pitch ? (() => { const a = el('div', 'ra'); a.append(icopy(plan.pitch, 'Copy the one-line pitch')); return a; })() : null], 'The first group to sell to')];
  buyers.push(pane('Where to find them', null, plan.places.map((x, i) => row('place' + i, logo(x.name, x.url), x.name, x.why, [x.url ? iopen('Open', x.url, 'Open ' + x.name + '. Read its rules before you post.') : null, rewriteBtn('place', i)], false, 10)), 'Places these buyers already talk'));
  if (plan.promo && plan.promo.length) buyers.push(pane('Where you may promote yourself', null, plan.promo.map((x, i) => row('promo' + i, logo(x.where || x.name, x.url), x.name, x.rule, [iopen('Open', x.url, 'Open ' + x.name + ' and read its rule first')], false, 10)), 'Communities with a place for your own work, each with its own rule'));

  // 3. Reach out: the emails, a few a day
  const mails = plan.emails.map((e, i) => {
    const gm = 'https://mail.google.com/mail/?view=cm&fs=1&su=' + encodeURIComponent(e.subject) + '&body=' + encodeURIComponent(e.body);
    const mt = 'mailto:?subject=' + encodeURIComponent(e.subject) + '&body=' + encodeURIComponent(e.body);
    // The Day 7 follow-up goes in the same thread: same subject with Re:, sent only when there was no reply.
    const fu = e.followup && iopen('Day 7 follow-up', 'https://mail.google.com/mail/?view=cm&fs=1&su=' + encodeURIComponent('Re: ' + e.subject) + '&body=' + encodeURIComponent(e.followup), 'Seven days later, if there was no reply: open the follow-up in Gmail', false);
    // Where to find this reader: the place in the plan the email was tied to.
    const fp = e.place != null && plan.places[e.place];
    const ft = fp && fp.url ? iopen('Find them', fp.url, 'Open ' + fp.name + ' to find people like this reader', false) : null;
    return row('mail' + i, svg('mail'), e.subject, 'To: ' + (e.to || 'someone who fits') + '. ' + (e.find ? 'Find them: ' + e.find + ' ' : '') + e.body + (e.followup ? '\n\nDay 7, if no reply: ' + e.followup : ''), [iopen('Gmail', gm, 'Open a Gmail draft with this email. Add the address and press Send.', true, 'mail'), fu, iopen('Mail app', mt, 'Open a draft in your own mail app'), icopy(e.subject + '\n\n' + e.body, 'Copy the subject and the email text'), ft, rewriteBtn('email', i)].filter(Boolean), true, 5);
  });
  const days = [['Day 1 · today', 0, 2], ['Day 3', 2, 4], ['Day 5', 4, 99]];
  const reach = mails.length > 2 ? days.map((d) => [d[0], mails.slice(d[1], d[2])]).filter((d) => d[1].length).map((d) => pane(d[0], svg('mail'), d[1], 'Send these on ' + d[0].replace(' · today', ', today') + '. Nothing is sent for you.')) : [pane('Emails to send', svg('mail'), mails, 'Drafts only. Nothing is sent for you.')];

  // 4. Post: one column per place
  const byWhere = {}; (plan.posts || []).forEach((x, i) => { (byWhere[x.where] = byWhere[x.where] || []).push([x, i]); });
  const posts = Object.keys(byWhere).map((w) => pane(w, logo(w, ''), byWhere[w].map(([x, i]) => row('post' + i, null, x.title || clip(x.body, 60), x.body, [postLink(x, plan), icopy((x.title ? x.title + '\n\n' : '') + x.body + (x.where === 'Discord' ? ' ' + (plan.site || plan.url) : ''), 'Copy this post, ready to paste on ' + w), rewriteBtn('post', i)].filter(Boolean), true, 10)), 'Opens the post box with the text filled in. You read it, change it and post it yourself.'));
  if (!posts.length) posts.push(card('Posts to write', null, [el('p', '', 'No post drafts this time. Press the button again for drafts for X, Reddit and Hacker News.')]));

  // 5. Get listed
  const ls = plan.listings.map((x, i) => [x, i]);
  const lrow = ([x, i]) => row('list' + i, logo(x.name, x.url), x.name, x.why, [iopen('Submit', x.url, 'Open the ' + x.name + ' submit page')], false, 10);
  const listed = [pane('Launch sites', null, ls.filter(([x]) => LAUNCH.test(x.name)).map(lrow), 'Launch lists: one day of attention, best on a weekday'), pane('Directories', null, ls.filter(([x]) => !LAUNCH.test(x.name)).map(lrow), 'Directories people search; they keep sending visitors')];

  const steps = [
    { t: 'Get ready', st: 'Fix what blocks you', say: 'Make your page readable for AI search and people before you send anyone to it.', panes: ready },
    { t: 'Find buyers', st: 'Who and where', say: 'Who buys first, and the places they already talk.', panes: buyers },
    { t: 'Reach out', st: plan.emails.length + ' emails', say: 'A few emails a day. Gmail opens with the draft filled in; you press Send.', panes: reach },
    { t: 'Post', st: (plan.posts || []).length + ' drafts', say: 'Post where your buyers read. You read, change and post each one yourself.', panes: posts },
    { t: 'Get listed', st: plan.listings.length + ' places', say: 'Directories and launch lists. Each link opens its submit page.', panes: listed },
  ];
  // Do this first: the one next move for each reason people open a plan, at the top, so nobody has to scroll to find it.
  const first = el('div', 'first'); first.setAttribute('aria-label', 'Do this first');
  const fs = (n, label, sub, href, onclick) => {
    const a = el(href ? 'a' : 'button', 'fs'); if (href) { a.href = href; a.target = '_blank'; a.rel = 'noopener'; } else { a.type = 'button'; a.onclick = onclick; }
    a.dataset.c = 'first: ' + label.split(' ').slice(0, 3).join(' '); a.append(el('span', 'k', 'Step ' + n), el('b', '', label), el('small', '', sub), el('span', 'gob', 'Do it now')); return a;
  };
  const e0 = plan.emails[0];
  if (e0) first.append(fs(3, 'Email your first buyer', 'To: ' + (e0.to || 'someone who fits') + '. Gmail opens with the draft.', 'https://mail.google.com/mail/?view=cm&fs=1&su=' + encodeURIComponent(e0.subject) + '&body=' + encodeURIComponent(e0.body)));
  const f0 = plan.check && plan.check.fixes.find((f) => f.status !== 'pass');
  if (f0) first.append(fs(1, 'Fix the top problem', f0.title, null, () => { goStep(0); const r = J.stages[0].querySelector('.rw'); if (r) r.classList.add('open'); }));
  const p0 = (plan.posts || []).map((x) => [x, postLink(x, plan)]).find(([x, a]) => a && x.where !== 'Discord');
  if (p0) first.append(fs(4, 'Post on ' + p0[0].where, p0[0].title || clip(p0[0].body, 60), p0[1].href));
  const l0 = plan.listings[0];
  if (l0) first.append(fs(5, 'Get listed on ' + l0.name, clip(l0.why || 'Open the submit page', 70), l0.url));
  if (first.children.length > 1) first.children[1].before(el('div', 'lh then', 'After that'));
  if (first.children.length) { const fw = el('div', 'firstw'); fw.append(el('div', 'lh', 'Your next step'), first); out.append(fw); const all = el('button', 'btn showall'); all.type = 'button'; all.textContent = 'Show the whole plan'; all.onclick = () => goStep(J.cur || 0);  }
  const tabs = el('div', 'jtabs'); tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'Steps');
  J.tabs = []; J.stages = []; J.tabsEl = tabs;
  out.append(tabs);
  steps.forEach((s, i) => {
    const tb = el('button', 'jtab'); tb.type = 'button'; tb.setAttribute('role', 'tab'); tip(tb, 'Step ' + (i + 1) + ': ' + s.say); tb.onclick = () => goStep(i);
    const tx = el('span', 'tx'); tx.append(el('span', 'tt', s.t), el('span', 'st', s.st)); const b2 = el('span', 'b2'); b2.append(el('i')); tx.append(b2);
    tb.append(el('span', 'num', String(i + 1)), tx, el('span', 'pg')); tabs.append(tb); J.tabs.push(tb);
    const st = el('div', 'stage'); st.id = 'step-' + (i + 1); st.setAttribute('role', 'tabpanel');
    const ld = el('div', 'jlead'); ld.append(el('h3', '', (i + 1) + '. ' + s.t), el('span', 'say', s.say), el('span', 'pg')); const cols = el('div', 'cols'); cols.append(...s.panes);
    st.append(ld, cols); out.append(st); J.stages.push(st);
  });
  prog();
  { const sa = out.querySelector('.showall'); if (sa) sa.textContent = 'Show the whole plan (' + out.querySelectorAll('.rw').length + ' tasks)'; }
  out.hidden = false; $('#about').hidden = true; document.body.classList.add('has-plan'); cool();
  const h = +(location.hash.match(/step-([1-5])/) || [])[1]; if (h) requestAnimationFrame(() => goStep(h - 1));
}

function prog() {
  if (!J) return; let D = 0, T = 0, L = 0;
  J.stages.forEach((st, i) => {
    const b = [...st.querySelectorAll('.rw input')]; const d = b.filter((x) => x.checked).length; D += d; T += b.length;
    const tb = J.tabs[i]; const fin = b.length > 0 && d === b.length;
    tb.classList.toggle('fin', fin); tb.querySelector('.num').textContent = fin ? '✓' : String(i + 1);
    tb.querySelector('.b2 i').style.width = (b.length ? d / b.length * 100 : 0) + '%'; tb.querySelector('.pg').textContent = d + '/' + b.length;
    tb.setAttribute('aria-selected', String(i === J.cur));
    const left = b.filter((x) => !x.checked).reduce((a, x) => a + (+x.closest('.rw').dataset.m || 0), 0); L += left;
    st.querySelector('.jlead .pg').textContent = d + '/' + b.length + ' done' + (left ? ' · ' + mins(left) + ' left' : '');
  });
  J.count.textContent = D + '/' + T + ' done' + (L ? ' · about ' + mins(L) + ' left' : '');
}
function goStep(i) {
  if (!J) return; const po = $('#plan'); if (po) po.classList.remove('plan-collapsed'); J.cur = Math.max(0, Math.min(J.stages.length - 1, i)); J.lock = Date.now();
  const y = J.stages[J.cur].getBoundingClientRect().top + scrollY - J.tabsEl.offsetHeight - 2;
  scrollTo({ top: y, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  history.replaceState(null, '', location.pathname + '#step-' + (J.cur + 1)); prog();
}
addEventListener('scroll', () => {
  if (!J || Date.now() - J.lock < 1000) return;
  const line = J.tabsEl.getBoundingClientRect().bottom + 60; let c = 0;
  J.stages.forEach((s, j) => { if (s.getBoundingClientRect().top <= line) c = j; });
  if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4 && J.tabsEl.getBoundingClientRect().top <= 1) c = J.stages.length - 1;
  if (c !== J.cur) { J.cur = c; prog(); }
}, { passive: true });
document.addEventListener('change', (e) => { if (!J || !e.target.matches('.rw input')) return; const k = e.target.dataset.k; e.target.closest('.rw').classList.toggle('done', e.target.checked); if (e.target.checked) J.done.add(k); else J.done.delete(k); saveDone(); prog(); });
// Real click map (GET /api/clicks): where people click, sent in small batches. No id, no cookie; skipped with Do Not Track.
(() => {
  if (navigator.doNotTrack === '1' || navigator.globalPrivacyControl) return;
  let q = [];
  const send = () => { if (!q.length) return; const b = JSON.stringify({ page: J ? 'plan' : 'home', dev: innerWidth < 768 ? 'mobile' : 'desktop', clicks: q }); q = []; try { navigator.sendBeacon('/api/clicks', new Blob([b], { type: 'application/json' })); } catch (e) { /* not sent */ } };
  document.addEventListener('click', (e) => {
    const c = e.target.closest && e.target.closest('a,button,input,label,select,textarea,summary,[role=tab]');
    let t = '';
    if (c) t = c.dataset.c ? c.dataset.c : c.matches('input,textarea,select,label') ? (c.type || c.tagName).toLowerCase() : (c.classList.contains('jtab') ? 'step tab' : (c.innerText || c.getAttribute('aria-label') || c.tagName).replace(/\s+/g, ' ').trim().slice(0, 30));
    else t = e.target.tagName ? e.target.tagName.toLowerCase() : '';
    q.push({ x: +(e.pageX / document.documentElement.scrollWidth).toFixed(3), y: Math.round(e.pageY), k: c ? 'ctl' : 'dead', t });
    if (q.length >= 20) send();
  }, true);
  addEventListener('pagehide', send); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') send(); });
})();
document.addEventListener('keydown', (e) => { if (!J || e.target.closest('input,textarea,select,[contenteditable]') || e.altKey || e.metaKey || e.ctrlKey) return; if (e.key === 'ArrowRight') goStep(J.cur + 1); if (e.key === 'ArrowLeft') goStep(J.cur - 1); });
// One floating tooltip for every [data-tip], so a scroll box never cuts it off.
const tipEl = el('div', 'tip'); tipEl.setAttribute('role', 'tooltip'); document.body.append(tipEl);
function showTip(e) {
  const t = e.target.closest && e.target.closest('[data-tip]'); if (!t) { tipEl.classList.remove('on'); return; }
  tipEl.textContent = t.getAttribute('data-tip'); const r = t.getBoundingClientRect(), w = tipEl.offsetWidth, h = tipEl.offsetHeight;
  tipEl.style.left = Math.max(6, Math.min(innerWidth - w - 6, r.left + r.width / 2 - w / 2)) + 'px'; tipEl.style.top = (r.top > h + 10 ? r.top - h - 6 : r.bottom + 6) + 'px'; tipEl.classList.add('on');
}
document.addEventListener('mouseover', showTip); document.addEventListener('focusin', showTip);
document.addEventListener('scroll', () => tipEl.classList.remove('on'), true);

const isProfile = (u) => /^https?:[/][/](((www[.]|mobile[.])?(x|twitter)[.]com[/][A-Za-z0-9_]+)|((www[.])?bsky[.]app[/]profile[/][A-Za-z0-9.-]+)|((www[.])?instagram[.]com[/][A-Za-z0-9._]+))/i.test(u.trim());
const STEPS = ['Reading the page', 'Checking if AI search can read it', 'Finding who would buy it', 'Writing the emails', 'Writing the posts'];
function loader(on) {
  const box = $('#prog'); box.hidden = !on; if (!on) return () => {};
  box.querySelector('ol').innerHTML = STEPS.map((x) => '<li><b></b>' + x + '</li>').join('');
  const li = [...box.querySelectorAll('li')], bar = box.querySelector('.bar i'), sec = box.querySelector('[data-sec]'), note = box.querySelector('[data-note]'), t0 = Date.now();
  const draw = () => {
    const s = (Date.now() - t0) / 1000; // every step runs at the same time on the server, so all of them spin together
    li.forEach((e) => { e.className = 'on'; });
    bar.style.width = Math.min(95, 100 * (1 - Math.exp(-s / 35))) + '%';
    sec.textContent = Math.floor(s) + ' s';
    note.textContent = s > 40 ? 'The model is slow right now. Keep this tab open; it can take up to 90 seconds.' : 'Usually 10 to 30 seconds.';
    $('#status').textContent = s > 40 ? 'Still writing. The model is slow right now; this can take up to 90 seconds.' : 'Working on all of it at once...';
  };
  draw(); const t = setInterval(draw, 1000);
  return (ok) => { clearInterval(t); if (ok) { li.forEach((e) => { e.className = 'ok'; e.firstChild.textContent = '✓'; }); bar.style.width = '100%'; } setTimeout(() => { box.hidden = true; }, ok ? 600 : 0); };
}
async function make(ev) {
  ev.preventDefault();
  const url = $('#url').value.trim(); const st = $('#status'); const go = $('#go');
  st.className = 'status';
  if (!/^https?:[/][/][^ ]+[.][^ ]+/.test(url)) { st.className = 'status err'; st.textContent = 'Paste a full link that starts with https://'; return; }
  go.disabled = true; const label = go.textContent; go.textContent = 'Working...';
  const stop = loader(true); let ok = false;
  try {
    const r = await fetch('/api/plan', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url, about: $('#about-me').value.trim(), ...(isProfile(url) ? {} : { brief: { who: $('#q-who').value.trim(), price: $('#q-price').value.trim(), name: $('#q-name').value.trim() } }) }), signal: AbortSignal.timeout(120000) })
      .catch((e) => { throw new Error(e.name === 'TimeoutError' ? 'The plan took too long. Press the button again in a minute.' : 'Could not reach the server. Check your connection and press the button again.'); });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'Something went wrong. Press the button again.');
    if (j.id) history.pushState(null, '', '/p/' + j.id);
    ok = true; stop(true);
    st.textContent = j.slow ? 'The model is too slow right now, so this is a general guide with the real checks. Press the button again in a few minutes for a plan written for your page.' : j.generic ? 'The model is out of budget today, so this is a general playbook.' : j.reused ? 'This link got a plan today already; here it is.' : 'Done. The plan is below.';
    draw(j.id, j.plan); document.getElementById('plan').scrollIntoView({ behavior: 'smooth' });
  } catch (e) { stop(false); st.className = 'status err'; st.textContent = e.message; }
  finally { if (!ok) stop(false); go.disabled = false; go.textContent = label; }
}

async function load(id) {
  const st = $('#status'); st.textContent = 'Opening the plan...';
  try {
    const r = await fetch('/api/plan/' + id); const j = await r.json();
    if (!r.ok) throw new Error(j.error);
    if (id !== 'example') $('#url').value = j.plan.url; st.textContent = ''; draw(id, j.plan);
  } catch (e) { st.className = 'status err'; st.textContent = e.message || 'This plan is not here.'; }
}

// The motion layer: reveal, sliding tab line, spotlight, ticked rows, confetti when a step is done.
// Turned off by prefers-reduced-motion. Called at the end of draw().
const CALM = matchMedia('(prefers-reduced-motion: reduce)').matches;
let coolPlace = null;
function countUp(node, to, ms) {
  if (CALM) { node.textContent = String(to); return; }
  const t0 = performance.now();
  const f = (t) => { const p = Math.min(1, (t - t0) / ms); node.textContent = String(Math.round(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) requestAnimationFrame(f); };
  requestAnimationFrame(f);
}
function cool() {
  const out = $('#plan'); if (!out) return;
  const h2 = out.querySelector('.jhead h2');
  if (h2 && h2.textContent.indexOf('A plan for ') === 0 && !h2.querySelector('.hl')) { const n = h2.textContent.slice(11); h2.textContent = 'A plan for '; h2.append(el('span', 'hl', n)); }
  const head = out.querySelector('.jhead');
  if (head && !out.querySelector('.cool-tick')) {
    const words = ['Find your first customers', 'One page for week one', 'Made from your own page', 'Tick it, ship it', 'Five steps, no fluff'];
    const tk = el('div', 'cool-tick'); tk.setAttribute('aria-hidden', 'true'); const row = el('div');
    words.concat(words, words, words).forEach((w) => row.append(el('span', '', w)));
    tk.append(row); head.after(tk);
  }
  let i = 0;
  out.querySelectorAll('.jhead > *, .jtab, .pn').forEach((n) => { n.classList.add('cool-in'); n.style.setProperty('--i', String(i++)); });
  out.querySelectorAll('.pn').forEach((pn) => { let k = 0; pn.querySelectorAll('.rw').forEach((r) => { r.classList.add('cool-in'); r.style.setProperty('--i', String(Math.min(i + k++, 40))); }); });
  out.querySelectorAll('.score b').forEach((b) => { const v = parseInt(b.textContent, 10); if (!isNaN(v)) countUp(b, v, 1100); });
  const tabs = out.querySelector('.jtabs');
  if (tabs && !tabs.querySelector('.slide')) {
    const bar = el('span', 'slide'); tabs.append(bar);
    coolPlace = () => { const on = tabs.querySelector('.jtab[aria-selected=true]'); if (!on) return; bar.style.width = on.offsetWidth + 'px'; bar.style.transform = 'translateX(' + on.offsetLeft + 'px)'; };
    new MutationObserver(coolPlace).observe(tabs, { attributes: true, subtree: true, attributeFilter: ['aria-selected'] });
    coolPlace();
  }
  if (out.dataset.cool) return; out.dataset.cool = '1';
  addEventListener('resize', () => { if (coolPlace) coolPlace(); });
  out.addEventListener('pointermove', (e) => { const pn = e.target.closest && e.target.closest('.pn'); if (!pn) return; const r = pn.getBoundingClientRect(); pn.style.setProperty('--mx', (e.clientX - r.left) + 'px'); pn.style.setProperty('--my', (e.clientY - r.top) + 'px'); });
  out.addEventListener('change', (e) => {
    const cb = e.target; if (!cb.matches || !cb.matches('.rw > input') || !cb.checked) return;
    const rw = cb.closest('.rw'); rw.classList.remove('cool-justdone'); void rw.offsetWidth; rw.classList.add('cool-justdone');
    const box = cb.closest('.stage'); if (!box) return;
    const all = box.querySelectorAll('.rw > input').length; const done = box.querySelectorAll('.rw > input:checked').length;
    const r = cb.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, all === done ? 70 : 10);
    if (all === done) coolToast('Step done. On to the next one.');
  });
}
function burst(x, y, n) {
  if (CALM) return;
  const cs = getComputedStyle(document.documentElement);
  const cols = [cs.getPropertyValue('--acc'), cs.getPropertyValue('--ink'), cs.getPropertyValue('--acctext')];
  for (let k = 0; k < n; k++) {
    const d = el('i', 'cool-bit'); d.style.left = x + 'px'; d.style.top = y + 'px'; d.style.background = cols[k % 3]; document.body.append(d);
    const a = Math.random() * Math.PI * 2; const v = (n > 20 ? 140 : 50) + Math.random() * (n > 20 ? 220 : 60);
    d.animate([{ transform: 'translate(-50%,-50%) rotate(0)', opacity: 1 }, { transform: 'translate(' + (Math.cos(a) * v) + 'px,' + (Math.sin(a) * v + 120) + 'px) rotate(' + (Math.random() * 540) + 'deg)', opacity: 0 }], { duration: 700 + Math.random() * 600, easing: 'cubic-bezier(.2,.7,.4,1)' }).onfinish = () => d.remove();
  }
}
let coolToastT;
function coolToast(msg) {
  let t = $('.cool-toast'); if (!t) { t = el('div', 'cool-toast'); t.setAttribute('role', 'status'); document.body.append(t); }
  t.textContent = msg; requestAnimationFrame(() => t.classList.add('on')); clearTimeout(coolToastT); coolToastT = setTimeout(() => t.classList.remove('on'), 2400);
}

$('#form').addEventListener('submit', make);
const sideAsk = () => { const p = isProfile($('#url').value); $('#about-me').hidden = !p; $('#brief').hidden = p; };
$('#url').addEventListener('input', sideAsk); sideAsk();
$('#paste').addEventListener('click', async () => {
  const u = $('#url');
  try { const t = (await navigator.clipboard.readText()).trim(); if (!t) { toast('Clipboard is empty'); return; } u.value = t; u.dispatchEvent(new Event('input')); u.focus(); }
  catch (e) { u.focus(); toast('Press Ctrl or Cmd + V to paste'); }
});
if (window.PLAN_ID) load(window.PLAN_ID);
`;

export function page({ planId = '', prefill = '', share = null } = {}) {
  const now = new Date();
  const edDate = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const edNo = Math.floor((now - Date.UTC(now.getUTCFullYear(), 0, 0)) / 864e5);
  const ogTitle = share ? `Grow plan for ${share.host}` : 'Flisk Grow: find your first customers';
  const ogDesc = share ? (share.summary || 'Who would buy it, where they are, and what to send them.') : 'Who would buy it, where they are, and what to send them. Free, no sign-in.';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#eeece5"><meta name="theme-color" content="#eeece5" media="(prefers-color-scheme: light)"><meta name="theme-color" content="#0b0b0d" media="(prefers-color-scheme: dark)">
<title>${esc(share ? ogTitle + ' · Flisk Grow' : 'Flisk Grow: find your first customers')}</title>
<meta name="description" content="Paste a link to what you made. Get who would buy it, where they are, 5 email drafts, 3 post drafts, an AI search check and where to list it. Free, no sign-in.">
<meta property="og:title" content="${esc(ogTitle)}"><meta property="og:description" content="${esc(ogDesc)}"><meta property="og:type" content="website"><meta property="og:url" content="https://grow.flisk.si${planId === 'example' ? '/example' : planId ? '/p/' + planId : '/'}"><meta name="twitter:card" content="summary">
<link rel="icon" href="/icon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="canonical" href="https://grow.flisk.si/">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Fraunces:opsz,wght@9..144,700;9..144,800&family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Old+Standard+TT:ital@1&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&family=JetBrains+Mono:wght@500;600;700&display=swap" rel="stylesheet">
<style>${CSS}</style>
<script defer data-domain="grow.flisk.si" src="https://flisk.sh/a.js"></script></head><body>
<script src="https://flisk.si/assets/bar.js" data-product="Grow" data-icon="grow" data-accent="#22c55e" data-siblings="Cilytics,Ranker" data-text="Find your first customers with a plan made from your link." defer></script>
<div class="wrap">
<div class="dateline"><span>Vol. 1 · No. ${edNo} · ${edDate}</span><span>Free · No sign-in · Beta</span><span>Printed fresh in 20 seconds</span></div>
<div class="mast"><a class="name" href="/">The Grow <em>Gazette</em></a><p class="tag">All the news that helps you find your first customers</p></div>
<header class="nav"><a class="brand" href="/">Flisk Grow</a>
<nav class="navr"><a href="#about">Front page</a><a href="#about">The Market</a><a href="#about">Letters</a><a href="#about">The Wire</a><a href="#about">Classifieds</a><a href="/me">My cabinet</a><a href="#api" class="hide-s">API</a><a href="https://github.com/flisk-sh/grow" class="hide-s">GitHub</a><a href="https://flisk.si">More from Flisk</a></nav></header>
<main>
<div class="hero"><div>
<div class="kicker">Beta · free · no sign-in</div>
<h1>Find your first customers.</h1>
<p class="lead">Paste a link to what you made. Get who would buy it, where they are, emails and posts to send, whether AI search can read your page, and where to list it.</p>
<p class="byline">By our plan desk · Edition ready in about 20 seconds</p>
<form id="form" novalidate><input id="url" class="next-cta" data-next-cta type="url" inputmode="url" autocomplete="url" placeholder="https://your-site.com" aria-label="Link to your site" value="${esc(prefill)}"><button id="paste" class="btn paste" type="button" title="Paste a link from your clipboard">Paste</button><button id="go" class="btn go" type="submit">Make my plan</button></form>
<input id="about-me" class="aboutme" maxlength="300" placeholder="Optional: what is this account about?" aria-label="What the account is about" hidden>
<details id="brief" class="brief"><summary>Optional: tell it who it is for, the price and your name</summary><div class="bq">
<input id="q-who" maxlength="160" placeholder="Who is it for? e.g. dentists with a small clinic" aria-label="Who it is for">
<input id="q-price" maxlength="160" placeholder="Price? e.g. $19 a month, or free" aria-label="The price">
<input id="q-name" maxlength="60" autocomplete="given-name" placeholder="Your name, to sign the emails" aria-label="Your name"></div></details>
<p id="status" class="status" role="status" aria-live="polite"></p>
<div id="prog" class="prog" hidden aria-hidden="true"><div class="bar"><i></i></div><ol></ol><div class="meta"><span data-note></span><span data-sec></span></div></div>
<p class="socials nologo"><span>Followers plan for a profile:</span>
<span class="soc on"><img src="/logo/x.com" alt="" width="16" height="16">X</span>
<span class="soc"><img src="/logo/linkedin.com" alt="" width="16" height="16">LinkedIn<em>soon</em></span>
<span class="soc on"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><defs><linearGradient id="ig" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#f9a825"/><stop offset=".5" stop-color="#e1306c"/><stop offset="1" stop-color="#5b51d8"/></linearGradient></defs><rect x="1" y="1" width="14" height="14" rx="4" fill="url(#ig)"/><circle cx="8" cy="8" r="3" fill="none" stroke="#fff" stroke-width="1.5"/><circle cx="12" cy="4" r="1" fill="#fff"/></svg>Instagram</span>
<span class="soc"><img src="/logo/tiktok.com" alt="" width="16" height="16">TikTok<em>soon</em></span>
<span class="soc"><img src="/logo/youtube.com" alt="" width="16" height="16">YouTube<em>soon</em></span>
<span class="soc on"><img src="/logo/bsky.app" alt="" width="16" height="16">Bluesky</span></p>
<ul class="proof"><li>About 20 seconds</li><li>Nothing is sent for you</li><li>Plans kept 30 days</li></ul>
<a class="example-link" href="/example" data-c="example plan">See an example plan →</a>
</div><aside class="band" aria-label="Inside today's edition"><h4>Inside today's edition</h4><ol>
<li><span>Front page<small>Can AI search find you, and the fixes</small></span></li>
<li><span>The Market<small>Who would buy it, and the one-line pitch</small></span></li>
<li><span>Letters<small>Five email drafts, ready to open</small></span></li>
<li><span>The Wire<small>Posts ready to share, three drafts</small></span></li>
<li><span>Classifieds<small>Where to list it, one link each</small></span></li></ol></aside></div>
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
<section id="api"><h2>API</h2><p class="sub">The same plan as JSON, for scripts and agents. Same free limits: 10 plans a day per visitor.</p>
<pre class="code">curl -s https://grow.flisk.si/api/plan \\
  -H 'content-type: application/json' \\
  -d '{"url": "https://your-site.com"}'</pre>
<p class="note">Answers {"id", "plan"}. Read a saved plan with GET /api/plan/&lt;id&gt;.</p></section>
</div>
</main>
<footer><span>Flisk Grow · beta</span><a href="https://flisk.si">flisk.si</a><a href="https://github.com/flisk-sh/grow">Source</a><a href="/llms.txt">llms.txt</a></footer>
</div>
<div id="toast" class="toast" role="status"></div>
<script>window.PLAN_ID=${JSON.stringify(planId)};${JS}</script>
</body></html>`;
}
