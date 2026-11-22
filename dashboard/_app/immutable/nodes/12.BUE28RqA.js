import {
  $ as e,
  B as t,
  C as n,
  D as r,
  E as i,
  H as a,
  I as o,
  M as s,
  N as c,
  O as l,
  T as u,
  U as d,
  X as f,
  Y as p,
  Z as m,
  ct as h,
  dt as g,
  et as _,
  f as v,
  h as y,
  it as b,
  k as x,
  nt as S,
  pt as C,
  q as w,
  rt as T,
  st as E,
  ut as D,
  w as O,
  y as k,
} from "../chunks/BZ84wCgC.js";
import "../chunks/xihTtKlq.js";
import { c as A, n as j } from "../chunks/CdnViQ5q.js";
import { t as M } from "../chunks/Rtih1jsT.js";
import { a as ee, c as te, l as N, o as P, s as ne, t as re, u as ie } from "../chunks/CtcZUmSy.js";
import { a as ae, d as F, f as I, i as L, p as oe, r as R, s as z, t as se } from "../chunks/Dt5KBvTb.js";
import { n as ce, t as le } from "../chunks/CI7rR3Vp.js";
import { t as ue } from "../chunks/DdFFSzHw.js";
import { t as de } from "../chunks/zoTXWZ7v.js";
import { t as fe } from "../chunks/BbG86UsG.js";
import { t as pe } from "../chunks/CyjB8bAN.js";
var B = C({ ssr: () => !1 }),
  V = x(`<nav aria-label="Page sections"><!></nav>`);
function me(t, n) {
  h(n, !0);
  let i = _(0);
  d(() => {
    if (typeof IntersectionObserver > `u`) return;
    let t = [];
    return (
      n.sections.forEach((n, r) => {
        let a = document.getElementById(n.id);
        if (!a) return;
        let o = new IntersectionObserver(
          (t) => {
            t[0]?.isIntersecting && e(i, r, !0);
          },
          { rootMargin: `-20% 0px -70% 0px` },
        );
        o.observe(a), t.push(o);
      }),
      () => t.forEach((e) => e.disconnect())
    );
  });
  function a(t) {
    e(i, t, !0);
    let r = n.sections[t];
    if (!r) return;
    let a = document.getElementById(r.id);
    a && a.scrollIntoView({ behavior: `smooth`, block: `start` });
  }
  var s = V(),
    c = p(s);
  {
    let e = S(() => n.sections.map((e) => e.label));
    z(c, {
      get items() {
        return o(e);
      },
      get activeIndex() {
        return o(i);
      },
      onchange: a,
    });
  }
  g(s), r(t, s), E();
}
var H = x(
    `<a target="_blank" rel="noopener noreferrer" class="ext-link svelte-17etibv"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15,3 21,3 21,9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a>`,
  ),
  U = x(
    `<button class="toggle-btn svelte-17etibv"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"></path></svg></button>`,
  ),
  he = x(`<p class="item-desc svelte-17etibv"> </p>`),
  W = x(`<div class="code-block svelte-17etibv"><span class="code-label svelte-17etibv">Install</span> <!></div>`),
  ge = x(`<div class="code-block svelte-17etibv"><span class="code-label svelte-17etibv">Usage</span> <!></div>`),
  G = x(`<div class="item-code svelte-17etibv"><!> <!></div>`),
  _e = x(
    `<div class="actionable-item svelte-17etibv"><div class="item-header svelte-17etibv"><div class="item-left svelte-17etibv"><!> <span class="item-name svelte-17etibv"> </span></div> <div class="item-right svelte-17etibv"><span class="url-status svelte-17etibv"> </span> <!> <!></div></div> <!> <!></div>`,
  );
function ve(t, n) {
  h(n, !0);
  let s = _(!1),
    l = S(() => !!(n.item.installCommand || n.item.code)),
    d = S(() =>
      n.item.urlStatus === `live` || n.item.urlStatus === `ok`
        ? `var(--ok-bg)`
        : n.item.urlStatus === `redirect`
          ? `var(--warn-bg)`
          : n.item.urlStatus === `dead` || n.item.urlStatus === `error`
            ? `var(--bad-bg)`
            : `var(--neutral-bg)`,
    ),
    f = S(() =>
      n.item.urlStatus === `live` || n.item.urlStatus === `ok`
        ? `var(--ok)`
        : n.item.urlStatus === `redirect`
          ? `var(--warn)`
          : n.item.urlStatus === `dead` || n.item.urlStatus === `error`
            ? `var(--bad)`
            : `var(--neutral)`,
    ),
    b = S(() =>
      n.item.urlStatus === `live` || n.item.urlStatus === `ok`
        ? `Live`
        : n.item.urlStatus === `redirect`
          ? `Redirect`
          : n.item.urlStatus === `dead` || n.item.urlStatus === `error`
            ? `Dead`
            : n.item.urlStatus || `—`,
    );
  var x = _e(),
    C = p(x),
    w = p(C),
    T = p(w);
  F(T, {
    get text() {
      return n.item.type;
    },
  });
  var D = m(T, 2),
    O = p(D, !0);
  g(D), g(w);
  var k = m(w, 2),
    A = p(k),
    j = p(A, !0);
  g(A);
  var M = m(A, 2),
    ee = (e) => {
      var t = H();
      a(() => {
        v(t, `href`, n.item.url),
          v(t, `title`, `Open ${n.item.name ?? ``}`),
          v(t, `aria-label`, `Open ${n.item.name ?? ``} (opens in new tab)`);
      }),
        r(e, t);
    };
  u(M, (e) => {
    n.item.url && e(ee);
  });
  var te = m(M, 2),
    N = (t) => {
      var n = U(),
        i = p(n);
      g(n),
        a(() => {
          v(n, `aria-expanded`, o(s)),
            v(n, `aria-label`, o(s) ? `Collapse details` : `Expand details`),
            y(i, `transform: rotate(${o(s) ? 180 : 0}deg); transition: transform var(--t-fast)`);
        }),
        c(`click`, n, () => {
          e(s, !o(s));
        }),
        r(t, n);
    };
  u(te, (e) => {
    o(l) && e(N);
  }),
    g(k),
    g(C);
  var P = m(C, 2),
    ne = (e) => {
      var t = he(),
        o = p(t, !0);
      g(t), a(() => i(o, n.item.description)), r(e, t);
    };
  u(P, (e) => {
    n.item.description && e(ne);
  });
  var re = m(P, 2),
    ie = (e) => {
      oe(e, {
        get expand() {
          return o(s);
        },
        children: (e, t) => {
          var i = G(),
            a = p(i),
            o = (e) => {
              var t = W();
              L(m(p(t), 2), {
                get text() {
                  return n.item.installCommand;
                },
                prompt: `$`,
                showCopyButton: !0,
              }),
                g(t),
                r(e, t);
            };
          u(a, (e) => {
            n.item.installCommand && e(o);
          });
          var s = m(a, 2),
            c = (e) => {
              var t = ge();
              L(m(p(t), 2), {
                get text() {
                  return n.item.code;
                },
                showCopyButton: !0,
              }),
                g(t),
                r(e, t);
            };
          u(s, (e) => {
            n.item.code && e(c);
          }),
            g(i),
            r(e, i);
        },
        $$slots: { default: !0 },
      });
    };
  u(re, (e) => {
    o(l) && e(ie);
  }),
    g(x),
    a(() => {
      i(O, n.item.name),
        y(
          A,
          `color:${o(f) ?? ``};background:${o(d) ?? ``};border-color:color-mix(in srgb,${o(f) ?? ``} 30%,transparent)`,
        ),
        i(j, o(b));
    }),
    r(t, x),
    E();
}
s([`click`]);
var ye = x(`<span class="rail-dur svelte-1ap7pnz"> </span>`),
  be = x(
    `<a class="rail-card svelte-1ap7pnz"><div class="rail-thumb svelte-1ap7pnz"><!> <!></div> <div class="rail-meta svelte-1ap7pnz"><p class="rail-title svelte-1ap7pnz"> </p> <span class="rail-creator svelte-1ap7pnz"> </span></div></a>`,
  ),
  K = x(`<div class="rail svelte-1ap7pnz"></div>`);
function xe(e, t) {
  h(t, !0);
  let s = S(() => t.ids.map((e) => j(e)).filter((e) => e !== void 0));
  var c = l(),
    d = f(c),
    _ = (e) => {
      R(e, {
        direction: `horizontal`,
        showArrows: !0,
        dragToScroll: !0,
        hideScrollbar: !0,
        children: (e) => {
          var t = K();
          n(
            t,
            21,
            () => o(s),
            O,
            (e, t) => {
              var n = be(),
                s = p(n),
                c = p(s),
                l = (e) => {
                  I(e, {
                    get src() {
                      return o(t).thumb;
                    },
                    get alt() {
                      return o(t).title;
                    },
                    classes: `rail-thumb-img`,
                  });
                };
              u(c, (e) => {
                o(t).thumb && e(l);
              });
              var d = m(c, 2),
                f = (e) => {
                  var n = ye(),
                    s = p(n, !0);
                  g(n), a((e) => i(s, e), [() => P(o(t).durationSec)]), r(e, n);
                };
              u(d, (e) => {
                o(t).durationSec > 0 && e(f);
              }),
                g(s);
              var h = m(s, 2),
                _ = p(h),
                y = p(_, !0);
              g(_);
              var b = m(_, 2),
                x = p(b);
              g(b),
                g(h),
                g(n),
                a(
                  (e) => {
                    v(n, `href`, e), v(n, `title`, o(t).title), i(y, o(t).title), i(x, `@${o(t).username ?? ``}`);
                  },
                  [() => `/video/` + encodeURIComponent(o(t).id)],
                ),
                r(e, n);
            },
          ),
            g(t),
            r(e, t);
        },
        $$slots: { default: !0 },
      });
    };
  u(d, (e) => {
    o(s).length > 0 && e(_);
  }),
    r(e, c),
    E();
}
var Se = x(
    `<a target="_blank" rel="noopener noreferrer" class="ig-link svelte-vkyiuk" aria-label="Open Instagram reel"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><circle cx="12" cy="12" r="4"></circle><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"></circle></svg> Instagram</a>`,
  ),
  Ce = x(`<a target="_blank" rel="noopener noreferrer" class="ig-link svelte-vkyiuk"> </a>`),
  we = x(
    `<span class="meta-sep svelte-vkyiuk" aria-hidden="true">·</span> <span class="meta-item svelte-vkyiuk"> </span>`,
    1,
  ),
  Te = x(
    `<span class="meta-sep svelte-vkyiuk" aria-hidden="true">·</span> <span class="meta-item svelte-vkyiuk"> </span>`,
    1,
  ),
  Ee = x(
    `<span class="meta-sep svelte-vkyiuk" aria-hidden="true">·</span> <span class="meta-item svelte-vkyiuk"> </span>`,
    1,
  ),
  De = x(`<div class="tags-row svelte-vkyiuk" aria-label="Tags"></div>`),
  Oe = x(`<div class="tags-row svelte-vkyiuk" aria-label="Applies to projects"></div>`),
  ke = x(
    `<video class="video-player svelte-vkyiuk" controls="" preload="metadata"><track kind="captions"/> Your browser does not support the video element.</video>`,
    2,
  ),
  Ae = x(`<img class="thumb-img svelte-vkyiuk" loading="lazy" decoding="async"/>`),
  je = x(`<p class="thin-note svelte-vkyiuk"> </p>`),
  Me = x(`<li class="svelte-vkyiuk"> </li>`),
  Ne = x(`<ul class="takeaways-list svelte-vkyiuk"></ul>`),
  Pe = x(`<p class="empty-text svelte-vkyiuk">No takeaways available.</p>`),
  Fe = x(`<div class="transcript-body svelte-vkyiuk"><pre class="transcript-pre svelte-vkyiuk"> </pre></div>`),
  Ie = x(`<p class="empty-text svelte-vkyiuk">No transcript available.</p>`),
  Le = x(`<p class="prose svelte-vkyiuk"> </p>`),
  Re = x(`<p class="empty-text svelte-vkyiuk">No visual description available.</p>`),
  ze = x(`<div class="tools-list svelte-vkyiuk"></div>`),
  Be = x(`<p class="empty-text svelte-vkyiuk">No tools extracted.</p>`),
  Ve = x(`<span class="link-desc svelte-vkyiuk"> </span>`),
  He = x(
    `<li class="link-item svelte-vkyiuk"><a target="_blank" rel="noopener noreferrer" class="link-anchor svelte-vkyiuk"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" class="link-icon svelte-vkyiuk"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15,3 21,3 21,9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg> </a> <!></li>`,
  ),
  Ue = x(`<ul class="links-list svelte-vkyiuk"></ul>`),
  We = x(`<p class="empty-text svelte-vkyiuk">No links extracted.</p>`),
  Ge = x(`<p class="sidebar-prose svelte-vkyiuk"> </p>`),
  Ke = x(
    `<div class="stat-row svelte-vkyiuk"><dt class="svelte-vkyiuk">Usefulness</dt> <dd class="stat-text svelte-vkyiuk"> </dd></div>`,
  ),
  qe = x(
    `<div class="sidebar-card svelte-vkyiuk"><h3 class="sidebar-section-title svelte-vkyiuk">Related</h3> <!></div>`,
  ),
  Je = x(
    `<div class="layout svelte-vkyiuk"><div class="main svelte-vkyiuk"><h1 class="title svelte-vkyiuk"> </h1> <div class="meta-row svelte-vkyiuk"><!> <!> <!> <!> <!> <!> <!></div> <!> <!> <div class="media-wrap svelte-vkyiuk"><!></div> <!> <!>  <section class="content-section svelte-vkyiuk" id="takeaways" aria-labelledby="takeaways-heading"><h2 id="takeaways-heading" class="section-heading svelte-vkyiuk">Key Takeaways</h2> <!></section> <section class="content-section svelte-vkyiuk" id="transcript" aria-labelledby="transcript-heading"><h2 id="transcript-heading" class="section-heading svelte-vkyiuk">Transcript</h2> <!></section> <section class="content-section svelte-vkyiuk" id="onscreen" aria-labelledby="onscreen-heading"><h2 id="onscreen-heading" class="section-heading svelte-vkyiuk">On-screen</h2> <!></section> <section class="content-section svelte-vkyiuk" id="tools" aria-labelledby="tools-heading"><h2 id="tools-heading" class="section-heading svelte-vkyiuk">Tools &amp; Resources</h2> <!></section> <section class="content-section svelte-vkyiuk" id="links" aria-labelledby="links-heading"><h2 id="links-heading" class="section-heading svelte-vkyiuk">Links</h2> <!></section></div> <aside class="sidebar svelte-vkyiuk" aria-label="Video details and related"><div class="sidebar-card svelte-vkyiuk"><div class="verif-header svelte-vkyiuk"><!></div> <!> <dl class="stats-dl svelte-vkyiuk"><div class="stat-row svelte-vkyiuk"><dt class="svelte-vkyiuk">Implementability</dt> <dd class="svelte-vkyiuk"><div class="score-bar-wrap svelte-vkyiuk"><div class="progress-wrap svelte-vkyiuk"><!></div> <span class="score-val svelte-vkyiuk"> <span class="score-denom svelte-vkyiuk">/10</span></span></div></dd></div> <!></dl></div> <!></aside></div>`,
  ),
  Ye = x(`<div class="video-page svelte-vkyiuk"><!> <!></div>`);
function Xe(s, c) {
  h(c, !0);
  let l = () => b(M, `$page`, y),
    [y, x] = T(),
    C = S(() => decodeURIComponent(l().params.id ?? ``)),
    j = _(null),
    F = _(!0),
    I = _(!1);
  d(() => {
    let t = o(C);
    e(F, !0),
      e(I, !1),
      e(j, null),
      A(t).then((t) => {
        e(j, t, !0), e(F, !1), t || e(I, !0);
      });
  });
  let L = S(() =>
      o(j)
        ? [
            { label: `Home`, href: `/` },
            { label: o(j).category, href: `/category/${encodeURIComponent(o(j).category)}` },
            { label: o(j).title },
          ]
        : [{ label: `Home`, href: `/` }, { label: `Video` }],
    ),
    oe = [
      { id: `takeaways`, label: `Takeaways` },
      { id: `transcript`, label: `Transcript` },
      { id: `onscreen`, label: `On-screen` },
      { id: `tools`, label: `Tools` },
      { id: `links`, label: `Links` },
    ];
  var R = Ye();
  k(`vkyiuk`, (e) => {
    t(() => {
      w.title = o(j) ? `${o(j).title} — Dopamine` : `Video — Dopamine`;
    });
  });
  var z = p(R);
  pe(z, {
    get items() {
      return o(L);
    },
  });
  var B = m(z, 2),
    V = (e) => {
      se(e, {});
    },
    H = (e) => {
      fe(e, { message: `This video could not be found.`, icon: `◌` });
    },
    U = (e) => {
      var t = Je(),
        s = p(t),
        c = p(s),
        l = p(c, !0);
      g(c);
      var d = m(c, 2),
        h = p(d);
      le(h, {
        get name() {
          return o(j).username;
        },
        get fullName() {
          return o(j).fullName;
        },
      });
      var _ = m(h, 2);
      re(_, {
        get cat() {
          return o(j).category;
        },
      });
      var y = m(_, 2),
        b = (e) => {
          var t = Se();
          a((e) => v(t, `href`, e), [() => te(o(j).code)]), r(e, t);
        };
      u(y, (e) => {
        o(j).code && e(b);
      });
      var x = m(y, 2),
        C = (e) => {
          var t = Ce(),
            n = p(t);
          g(t),
            a(
              (e, r) => {
                v(t, `href`, o(j).sourceUrl), v(t, `aria-label`, e), i(n, `Open original on ${r ?? ``}`);
              },
              [() => `Open original on ` + N(o(j).source), () => N(o(j).source)],
            ),
            r(e, t);
        };
      u(x, (e) => {
        o(j).sourceUrl && e(C);
      });
      var w = m(x, 2),
        T = (e) => {
          var t = we(),
            n = m(f(t), 2),
            s = p(n, !0);
          g(n), a((e) => i(s, e), [() => ee(o(j).date)]), r(e, t);
        };
      u(w, (e) => {
        o(j).date && e(T);
      });
      var E = m(w, 2),
        k = (e) => {
          var t = Te(),
            n = m(f(t), 2),
            s = p(n);
          g(n), a((e) => i(s, `${e ?? ``} likes`), [() => ne(o(j).likes)]), r(e, t);
        };
      u(E, (e) => {
        o(j).likes > 0 && e(k);
      });
      var A = m(E, 2),
        M = (e) => {
          var t = Ee(),
            n = m(f(t), 2),
            s = p(n, !0);
          g(n), a((e) => i(s, e), [() => P(o(j).durationSec)]), r(e, t);
        };
      u(A, (e) => {
        o(j).durationSec > 0 && e(M);
      }),
        g(d);
      var F = m(d, 2),
        I = (e) => {
          var t = De();
          n(
            t,
            21,
            () => o(j).tags,
            O,
            (e, t) => {
              ce(e, {
                get tag() {
                  return o(t);
                },
              });
            },
          ),
            g(t),
            r(e, t);
        };
      u(F, (e) => {
        o(j).tags.length > 0 && e(I);
      });
      var L = m(F, 2),
        R = (e) => {
          var t = Oe();
          n(
            t,
            21,
            () => o(j).appliesTo,
            O,
            (e, t) => {
              ue(e, {
                get project() {
                  return o(t);
                },
              });
            },
          ),
            g(t),
            r(e, t);
        };
      u(L, (e) => {
        (o(j).appliesTo ?? []).length > 0 && e(R);
      });
      var z = m(L, 2),
        se = p(z),
        fe = (e) => {
          var t = ke();
          a(() => {
            v(t, `src`, o(j).videoPath), v(t, `poster`, o(j).thumb), v(t, `aria-label`, o(j).title);
          }),
            r(e, t);
        },
        pe = (e) => {
          var t = Ae();
          a(() => {
            v(t, `src`, o(j).thumb), v(t, `alt`, o(j).title);
          }),
            r(e, t);
        };
      u(se, (e) => {
        o(j).videoPath ? e(fe) : o(j).thumb && e(pe, 1);
      }),
        g(z);
      var B = m(z, 2),
        V = (e) => {
          var t = je(),
            n = p(t, !0);
          g(t), a((e) => i(n, e), [() => ie(o(j).thinReason)]), r(e, t);
        };
      u(B, (e) => {
        o(j).tier === `thin` && o(j).thinReason && e(V);
      });
      var H = m(B, 2);
      me(H, {
        get sections() {
          return oe;
        },
      });
      var U = m(H, 2),
        he = m(p(U), 2),
        W = (e) => {
          var t = Ne();
          n(
            t,
            21,
            () => o(j).keyTakeaways,
            O,
            (e, t) => {
              var n = Me(),
                s = p(n, !0);
              g(n), a(() => i(s, o(t))), r(e, n);
            },
          ),
            g(t),
            r(e, t);
        },
        ge = (e) => {
          r(e, Pe());
        };
      u(he, (e) => {
        o(j).keyTakeaways.length > 0 ? e(W) : e(ge, -1);
      }),
        g(U);
      var G = m(U, 2),
        _e = m(p(G), 2),
        ye = (e) => {
          var t = Fe(),
            n = p(t),
            s = p(n, !0);
          g(n), g(t), a(() => i(s, o(j).transcript)), r(e, t);
        },
        be = (e) => {
          r(e, Ie());
        };
      u(_e, (e) => {
        o(j).transcript ? e(ye) : e(be, -1);
      }),
        g(G);
      var K = m(G, 2),
        Ye = m(p(K), 2),
        Xe = (e) => {
          var t = Le(),
            n = p(t, !0);
          g(t), a(() => i(n, o(j).visualDescription)), r(e, t);
        },
        Ze = S(() => o(j).visualDescription && !o(j).visualDescription.includes(`[object Object]`)),
        Qe = (e) => {
          r(e, Re());
        };
      u(Ye, (e) => {
        o(Ze) ? e(Xe) : e(Qe, -1);
      }),
        g(K);
      var q = m(K, 2),
        $e = m(p(q), 2),
        et = (e) => {
          var t = ze();
          n(
            t,
            21,
            () => o(j).actionableItems,
            O,
            (e, t) => {
              ve(e, {
                get item() {
                  return o(t);
                },
              });
            },
          ),
            g(t),
            r(e, t);
        },
        tt = (e) => {
          r(e, Be());
        };
      u($e, (e) => {
        o(j).actionableItems.length > 0 ? e(et) : e(tt, -1);
      }),
        g(q);
      var nt = m(q, 2),
        rt = m(p(nt), 2),
        it = (e) => {
          var t = Ue();
          n(
            t,
            21,
            () => o(j).links,
            O,
            (e, t) => {
              var n = He(),
                s = p(n),
                c = m(p(s));
              g(s);
              var l = m(s, 2),
                d = (e) => {
                  var n = Ve(),
                    s = p(n, !0);
                  g(n), a(() => i(s, o(t).description)), r(e, n);
                };
              u(l, (e) => {
                o(t).description && e(d);
              }),
                g(n),
                a(() => {
                  v(s, `href`, o(t).url), i(c, ` ${(o(t).name || o(t).url) ?? ``}`);
                }),
                r(e, n);
            },
          ),
            g(t),
            r(e, t);
        },
        at = (e) => {
          r(e, We());
        };
      u(rt, (e) => {
        o(j).links.length > 0 ? e(it) : e(at, -1);
      }),
        g(nt),
        g(s);
      var ot = m(s, 2),
        J = p(ot),
        Y = p(J);
      de(p(Y), {
        get score() {
          return o(j).verification;
        },
        get confidence() {
          return o(j).confidence;
        },
      }),
        g(Y);
      var st = m(Y, 2),
        ct = (e) => {
          var t = Ge(),
            n = p(t, !0);
          g(t), a(() => i(n, o(j).verificationSummary)), r(e, t);
        };
      u(st, (e) => {
        o(j).verificationSummary && e(ct);
      });
      var lt = m(st, 2),
        X = p(lt),
        ut = m(p(X), 2),
        Z = p(ut),
        Q = p(Z);
      ae(p(Q), {
        get value() {
          return o(j).implementability;
        },
        max: 10,
      }),
        g(Q);
      var $ = m(Q, 2),
        dt = p($, !0);
      D(), g($), g(Z), g(ut), g(X);
      var ft = m(X, 2),
        pt = (e) => {
          var t = Ke(),
            n = m(p(t), 2),
            s = p(n, !0);
          g(n), g(t), a(() => i(s, o(j).usefulness)), r(e, t);
        };
      u(ft, (e) => {
        o(j).usefulness && o(j).usefulness !== `unknown` && e(pt);
      }),
        g(lt),
        g(J);
      var mt = m(J, 2),
        ht = (e) => {
          var t = qe();
          xe(m(p(t), 2), {
            get ids() {
              return o(j).relatedIds;
            },
          }),
            g(t),
            r(e, t);
        };
      u(mt, (e) => {
        o(j).relatedIds.length > 0 && e(ht);
      }),
        g(ot),
        g(t),
        a(() => {
          i(l, o(j).title),
            v(Z, `aria-label`, `Implementability ${o(j).implementability ?? ``}/10`),
            i(dt, o(j).implementability);
        }),
        r(e, t);
    };
  u(B, (e) => {
    o(F) ? e(V) : o(I) || !o(j) ? e(H, 1) : e(U, -1);
  }),
    g(R),
    r(s, R),
    E(),
    x();
}
export { Xe as component, B as universal };
