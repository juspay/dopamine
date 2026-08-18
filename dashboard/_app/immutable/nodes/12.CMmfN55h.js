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
import { t as M } from "../chunks/BoAKB7FT.js";
import { a as ee, c as te, l as ne, o as N, s as re, t as ie } from "../chunks/CnvqUUT7.js";
import { a as ae, d as P, f as F, i as I, p as L, r as R, s as z, t as B } from "../chunks/Dt5KBvTb.js";
import { n as oe, t as se } from "../chunks/BlaHOqTL.js";
import { t as ce } from "../chunks/DHwu0OfC.js";
import { t as le } from "../chunks/CqZ00sEc.js";
import { t as ue } from "../chunks/BbG86UsG.js";
import { t as V } from "../chunks/CyjB8bAN.js";
var H = C({ ssr: () => !1 }),
  U = x(`<nav aria-label="Page sections"><!></nav>`);
function de(t, n) {
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
  var s = U(),
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
var W = x(
    `<a target="_blank" rel="noopener noreferrer" class="ext-link svelte-17etibv"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15,3 21,3 21,9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a>`,
  ),
  fe = x(
    `<button class="toggle-btn svelte-17etibv"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"></path></svg></button>`,
  ),
  G = x(`<p class="item-desc svelte-17etibv"> </p>`),
  pe = x(`<div class="code-block svelte-17etibv"><span class="code-label svelte-17etibv">Install</span> <!></div>`),
  me = x(`<div class="code-block svelte-17etibv"><span class="code-label svelte-17etibv">Usage</span> <!></div>`),
  he = x(`<div class="item-code svelte-17etibv"><!> <!></div>`),
  K = x(
    `<div class="actionable-item svelte-17etibv"><div class="item-header svelte-17etibv"><div class="item-left svelte-17etibv"><!> <span class="item-name svelte-17etibv"> </span></div> <div class="item-right svelte-17etibv"><span class="url-status svelte-17etibv"> </span> <!> <!></div></div> <!> <!></div>`,
  );
function ge(t, n) {
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
  var x = K(),
    C = p(x),
    w = p(C),
    T = p(w);
  P(T, {
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
      var t = W();
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
    ne = (t) => {
      var n = fe(),
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
    o(l) && e(ne);
  }),
    g(k),
    g(C);
  var N = m(C, 2),
    re = (e) => {
      var t = G(),
        o = p(t, !0);
      g(t), a(() => i(o, n.item.description)), r(e, t);
    };
  u(N, (e) => {
    n.item.description && e(re);
  });
  var ie = m(N, 2),
    ae = (e) => {
      L(e, {
        get expand() {
          return o(s);
        },
        children: (e, t) => {
          var i = he(),
            a = p(i),
            o = (e) => {
              var t = pe();
              I(m(p(t), 2), {
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
              var t = me();
              I(m(p(t), 2), {
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
  u(ie, (e) => {
    o(l) && e(ae);
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
var _e = x(`<span class="rail-dur svelte-1ap7pnz"> </span>`),
  ve = x(
    `<a class="rail-card svelte-1ap7pnz"><div class="rail-thumb svelte-1ap7pnz"><!> <!></div> <div class="rail-meta svelte-1ap7pnz"><p class="rail-title svelte-1ap7pnz"> </p> <span class="rail-creator svelte-1ap7pnz"> </span></div></a>`,
  ),
  ye = x(`<div class="rail svelte-1ap7pnz"></div>`);
function be(e, t) {
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
          var t = ye();
          n(
            t,
            21,
            () => o(s),
            O,
            (e, t) => {
              var n = ve(),
                s = p(n),
                c = p(s);
              F(c, {
                get src() {
                  return o(t).thumb;
                },
                get alt() {
                  return o(t).title;
                },
                classes: `rail-thumb-img`,
              });
              var l = m(c, 2),
                d = (e) => {
                  var n = _e(),
                    s = p(n, !0);
                  g(n), a((e) => i(s, e), [() => N(o(t).durationSec)]), r(e, n);
                };
              u(l, (e) => {
                o(t).durationSec > 0 && e(d);
              }),
                g(s);
              var f = m(s, 2),
                h = p(f),
                _ = p(h, !0);
              g(h);
              var y = m(h, 2),
                b = p(y);
              g(y),
                g(f),
                g(n),
                a(
                  (e) => {
                    v(n, `href`, e), v(n, `title`, o(t).title), i(_, o(t).title), i(b, `@${o(t).username ?? ``}`);
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
var xe = x(
    `<a target="_blank" rel="noopener noreferrer" class="ig-link svelte-vkyiuk" aria-label="Open Instagram reel"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><circle cx="12" cy="12" r="4"></circle><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"></circle></svg> Instagram</a>`,
  ),
  Se = x(`<div class="tags-row svelte-vkyiuk" aria-label="Tags"></div>`),
  Ce = x(`<div class="tags-row svelte-vkyiuk" aria-label="Applies to projects"></div>`),
  we = x(
    `<video class="video-player svelte-vkyiuk" controls="" preload="metadata"><track kind="captions"/> Your browser does not support the video element.</video>`,
    2,
  ),
  Te = x(`<img class="thumb-img svelte-vkyiuk" loading="lazy" decoding="async"/>`),
  Ee = x(`<p class="thin-note svelte-vkyiuk"> </p>`),
  De = x(`<li class="svelte-vkyiuk"> </li>`),
  Oe = x(`<ul class="takeaways-list svelte-vkyiuk"></ul>`),
  ke = x(`<p class="empty-text svelte-vkyiuk">No takeaways available.</p>`),
  Ae = x(`<div class="transcript-body svelte-vkyiuk"><pre class="transcript-pre svelte-vkyiuk"> </pre></div>`),
  je = x(`<p class="empty-text svelte-vkyiuk">No transcript available.</p>`),
  Me = x(`<p class="prose svelte-vkyiuk"> </p>`),
  Ne = x(`<p class="empty-text svelte-vkyiuk">No visual description available.</p>`),
  Pe = x(`<div class="tools-list svelte-vkyiuk"></div>`),
  Fe = x(`<p class="empty-text svelte-vkyiuk">No tools extracted.</p>`),
  Ie = x(`<span class="link-desc svelte-vkyiuk"> </span>`),
  Le = x(
    `<li class="link-item svelte-vkyiuk"><a target="_blank" rel="noopener noreferrer" class="link-anchor svelte-vkyiuk"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" class="link-icon svelte-vkyiuk"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15,3 21,3 21,9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg> </a> <!></li>`,
  ),
  Re = x(`<ul class="links-list svelte-vkyiuk"></ul>`),
  ze = x(`<p class="empty-text svelte-vkyiuk">No links extracted.</p>`),
  Be = x(`<p class="sidebar-prose svelte-vkyiuk"> </p>`),
  Ve = x(
    `<div class="stat-row svelte-vkyiuk"><dt class="svelte-vkyiuk">Usefulness</dt> <dd class="stat-text svelte-vkyiuk"> </dd></div>`,
  ),
  He = x(
    `<div class="sidebar-card svelte-vkyiuk"><h3 class="sidebar-section-title svelte-vkyiuk">Related</h3> <!></div>`,
  ),
  Ue = x(
    `<div class="layout svelte-vkyiuk"><div class="main svelte-vkyiuk"><h1 class="title svelte-vkyiuk"> </h1> <div class="meta-row svelte-vkyiuk"><!> <!> <!> <span class="meta-sep svelte-vkyiuk" aria-hidden="true">·</span> <span class="meta-item svelte-vkyiuk"> </span> <span class="meta-sep svelte-vkyiuk" aria-hidden="true">·</span> <span class="meta-item svelte-vkyiuk"> </span> <span class="meta-sep svelte-vkyiuk" aria-hidden="true">·</span> <span class="meta-item svelte-vkyiuk"> </span></div> <!> <!> <div class="media-wrap svelte-vkyiuk"><!></div> <!> <!>  <section class="content-section svelte-vkyiuk" id="takeaways" aria-labelledby="takeaways-heading"><h2 id="takeaways-heading" class="section-heading svelte-vkyiuk">Key Takeaways</h2> <!></section> <section class="content-section svelte-vkyiuk" id="transcript" aria-labelledby="transcript-heading"><h2 id="transcript-heading" class="section-heading svelte-vkyiuk">Transcript</h2> <!></section> <section class="content-section svelte-vkyiuk" id="onscreen" aria-labelledby="onscreen-heading"><h2 id="onscreen-heading" class="section-heading svelte-vkyiuk">On-screen</h2> <!></section> <section class="content-section svelte-vkyiuk" id="tools" aria-labelledby="tools-heading"><h2 id="tools-heading" class="section-heading svelte-vkyiuk">Tools &amp; Resources</h2> <!></section> <section class="content-section svelte-vkyiuk" id="links" aria-labelledby="links-heading"><h2 id="links-heading" class="section-heading svelte-vkyiuk">Links</h2> <!></section></div> <aside class="sidebar svelte-vkyiuk" aria-label="Video details and related"><div class="sidebar-card svelte-vkyiuk"><div class="verif-header svelte-vkyiuk"><!></div> <!> <dl class="stats-dl svelte-vkyiuk"><div class="stat-row svelte-vkyiuk"><dt class="svelte-vkyiuk">Implementability</dt> <dd class="svelte-vkyiuk"><div class="score-bar-wrap svelte-vkyiuk"><div class="progress-wrap svelte-vkyiuk"><!></div> <span class="score-val svelte-vkyiuk"> <span class="score-denom svelte-vkyiuk">/10</span></span></div></dd></div> <!></dl></div> <!></aside></div>`,
  ),
  We = x(`<div class="video-page svelte-vkyiuk"><!> <!></div>`);
function q(s, c) {
  h(c, !0);
  let l = () => b(M, `$page`, f),
    [f, y] = T(),
    x = S(() => decodeURIComponent(l().params.id ?? ``)),
    C = _(null),
    j = _(!0),
    P = _(!1);
  d(() => {
    let t = o(x);
    e(j, !0),
      e(P, !1),
      e(C, null),
      A(t).then((t) => {
        e(C, t, !0), e(j, !1), t || e(P, !0);
      });
  });
  let F = S(() =>
      o(C)
        ? [
            { label: `Home`, href: `/` },
            { label: o(C).category, href: `/category/${encodeURIComponent(o(C).category)}` },
            { label: o(C).title },
          ]
        : [{ label: `Home`, href: `/` }, { label: `Video` }],
    ),
    I = [
      { id: `takeaways`, label: `Takeaways` },
      { id: `transcript`, label: `Transcript` },
      { id: `onscreen`, label: `On-screen` },
      { id: `tools`, label: `Tools` },
      { id: `links`, label: `Links` },
    ];
  var L = We();
  k(`vkyiuk`, (e) => {
    t(() => {
      w.title = o(C) ? `${o(C).title} — Dopamine` : `Video — Dopamine`;
    });
  });
  var R = p(L);
  V(R, {
    get items() {
      return o(F);
    },
  });
  var z = m(R, 2),
    H = (e) => {
      B(e, {});
    },
    U = (e) => {
      ue(e, { message: `This video could not be found.`, icon: `◌` });
    },
    W = (e) => {
      var t = Ue(),
        s = p(t),
        c = p(s),
        l = p(c, !0);
      g(c);
      var d = m(c, 2),
        f = p(d);
      se(f, {
        get name() {
          return o(C).username;
        },
        get fullName() {
          return o(C).fullName;
        },
      });
      var h = m(f, 2);
      ie(h, {
        get cat() {
          return o(C).category;
        },
      });
      var _ = m(h, 2),
        y = (e) => {
          var t = xe();
          a((e) => v(t, `href`, e), [() => te(o(C).code)]), r(e, t);
        };
      u(_, (e) => {
        o(C).code && e(y);
      });
      var b = m(_, 4),
        x = p(b, !0);
      g(b);
      var w = m(b, 4),
        T = p(w);
      g(w);
      var E = m(w, 4),
        k = p(E, !0);
      g(E), g(d);
      var A = m(d, 2),
        j = (e) => {
          var t = Se();
          n(
            t,
            21,
            () => o(C).tags,
            O,
            (e, t) => {
              oe(e, {
                get tag() {
                  return o(t);
                },
              });
            },
          ),
            g(t),
            r(e, t);
        };
      u(A, (e) => {
        o(C).tags.length > 0 && e(j);
      });
      var M = m(A, 2),
        P = (e) => {
          var t = Ce();
          n(
            t,
            21,
            () => o(C).appliesTo,
            O,
            (e, t) => {
              ce(e, {
                get project() {
                  return o(t);
                },
              });
            },
          ),
            g(t),
            r(e, t);
        };
      u(M, (e) => {
        (o(C).appliesTo ?? []).length > 0 && e(P);
      });
      var F = m(M, 2),
        L = p(F),
        R = (e) => {
          var t = we();
          a(() => {
            v(t, `src`, o(C).videoPath), v(t, `poster`, o(C).thumb), v(t, `aria-label`, o(C).title);
          }),
            r(e, t);
        },
        z = (e) => {
          var t = Te();
          a(() => {
            v(t, `src`, o(C).thumb), v(t, `alt`, o(C).title);
          }),
            r(e, t);
        };
      u(L, (e) => {
        o(C).videoPath ? e(R) : e(z, -1);
      }),
        g(F);
      var B = m(F, 2),
        ue = (e) => {
          var t = Ee(),
            n = p(t, !0);
          g(t), a((e) => i(n, e), [() => ne(o(C).thinReason)]), r(e, t);
        };
      u(B, (e) => {
        o(C).tier === `thin` && o(C).thinReason && e(ue);
      });
      var V = m(B, 2);
      de(V, {
        get sections() {
          return I;
        },
      });
      var H = m(V, 2),
        U = m(p(H), 2),
        W = (e) => {
          var t = Oe();
          n(
            t,
            21,
            () => o(C).keyTakeaways,
            O,
            (e, t) => {
              var n = De(),
                s = p(n, !0);
              g(n), a(() => i(s, o(t))), r(e, n);
            },
          ),
            g(t),
            r(e, t);
        },
        fe = (e) => {
          r(e, ke());
        };
      u(U, (e) => {
        o(C).keyTakeaways.length > 0 ? e(W) : e(fe, -1);
      }),
        g(H);
      var G = m(H, 2),
        pe = m(p(G), 2),
        me = (e) => {
          var t = Ae(),
            n = p(t),
            s = p(n, !0);
          g(n), g(t), a(() => i(s, o(C).transcript)), r(e, t);
        },
        he = (e) => {
          r(e, je());
        };
      u(pe, (e) => {
        o(C).transcript ? e(me) : e(he, -1);
      }),
        g(G);
      var K = m(G, 2),
        _e = m(p(K), 2),
        ve = (e) => {
          var t = Me(),
            n = p(t, !0);
          g(t), a(() => i(n, o(C).visualDescription)), r(e, t);
        },
        ye = S(() => o(C).visualDescription && !o(C).visualDescription.includes(`[object Object]`)),
        We = (e) => {
          r(e, Ne());
        };
      u(_e, (e) => {
        o(ye) ? e(ve) : e(We, -1);
      }),
        g(K);
      var q = m(K, 2),
        Ge = m(p(q), 2),
        Ke = (e) => {
          var t = Pe();
          n(
            t,
            21,
            () => o(C).actionableItems,
            O,
            (e, t) => {
              ge(e, {
                get item() {
                  return o(t);
                },
              });
            },
          ),
            g(t),
            r(e, t);
        },
        qe = (e) => {
          r(e, Fe());
        };
      u(Ge, (e) => {
        o(C).actionableItems.length > 0 ? e(Ke) : e(qe, -1);
      }),
        g(q);
      var Je = m(q, 2),
        Ye = m(p(Je), 2),
        Xe = (e) => {
          var t = Re();
          n(
            t,
            21,
            () => o(C).links,
            O,
            (e, t) => {
              var n = Le(),
                s = p(n),
                c = m(p(s));
              g(s);
              var l = m(s, 2),
                d = (e) => {
                  var n = Ie(),
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
        Ze = (e) => {
          r(e, ze());
        };
      u(Ye, (e) => {
        o(C).links.length > 0 ? e(Xe) : e(Ze, -1);
      }),
        g(Je),
        g(s);
      var Qe = m(s, 2),
        J = p(Qe),
        Y = p(J);
      le(p(Y), {
        get score() {
          return o(C).verification;
        },
        get confidence() {
          return o(C).confidence;
        },
      }),
        g(Y);
      var $e = m(Y, 2),
        et = (e) => {
          var t = Be(),
            n = p(t, !0);
          g(t), a(() => i(n, o(C).verificationSummary)), r(e, t);
        };
      u($e, (e) => {
        o(C).verificationSummary && e(et);
      });
      var X = m($e, 2),
        Z = p(X),
        tt = m(p(Z), 2),
        Q = p(tt),
        $ = p(Q);
      ae(p($), {
        get value() {
          return o(C).implementability;
        },
        max: 10,
      }),
        g($);
      var nt = m($, 2),
        rt = p(nt, !0);
      D(), g(nt), g(Q), g(tt), g(Z);
      var it = m(Z, 2),
        at = (e) => {
          var t = Ve(),
            n = m(p(t), 2),
            s = p(n, !0);
          g(n), g(t), a(() => i(s, o(C).usefulness)), r(e, t);
        };
      u(it, (e) => {
        o(C).usefulness && o(C).usefulness !== `unknown` && e(at);
      }),
        g(X),
        g(J);
      var ot = m(J, 2),
        st = (e) => {
          var t = He();
          be(m(p(t), 2), {
            get ids() {
              return o(C).relatedIds;
            },
          }),
            g(t),
            r(e, t);
        };
      u(ot, (e) => {
        o(C).relatedIds.length > 0 && e(st);
      }),
        g(Qe),
        g(t),
        a(
          (e, t, n) => {
            i(l, o(C).title),
              i(x, e),
              i(T, `${t ?? ``} likes`),
              i(k, n),
              v(Q, `aria-label`, `Implementability ${o(C).implementability ?? ``}/10`),
              i(rt, o(C).implementability);
          },
          [() => ee(o(C).date), () => re(o(C).likes), () => N(o(C).durationSec)],
        ),
        r(e, t);
    };
  u(z, (e) => {
    o(j) ? e(H) : o(P) || !o(C) ? e(U, 1) : e(W, -1);
  }),
    g(L),
    r(s, L),
    E(),
    y();
}
export { q as component, H as universal };
