import {
  $ as e,
  A as t,
  B as n,
  C as r,
  D as i,
  E as a,
  J as o,
  K as s,
  P as c,
  Q as l,
  R as u,
  S as d,
  T as f,
  V as p,
  W as m,
  X as h,
  Z as g,
  _,
  d as v,
  et as y,
  it as b,
  j as x,
  lt as S,
  ot as C,
  p as w,
  q as T,
  rt as E,
  st as D,
  w as O,
  x as k,
} from "../chunks/KQ3eEBfb.js";
import "../chunks/xihTtKlq.js";
import { c as A, n as j } from "../chunks/5wXqoPKv.js";
import { t as M } from "../chunks/DukFlL_f.js";
import { a as ee, c as N, o as P, s as F, t as te } from "../chunks/WltnivmA.js";
import { a as ne, d as I, f as L, i as R, p as z, r as B, s as V, t as H } from "../chunks/BcfutCr0.js";
import { n as re, t as ie } from "../chunks/8hiyGRUO.js";
import { n as ae, t as oe } from "../chunks/BF0F8NE4.js";
import { t as U } from "../chunks/Bi4ZSEfO.js";
import { t as se } from "../chunks/Bd4orgHw.js";
var W = S({ ssr: () => !1 }),
  G = i(`<nav aria-label="Page sections"><!></nav>`);
function ce(e, t) {
  b(t, !0);
  let n = g(0);
  p(() => {
    if (typeof IntersectionObserver > `u`) return;
    let e = [];
    return (
      t.sections.forEach((t, r) => {
        let i = document.getElementById(t.id);
        if (!i) return;
        let a = new IntersectionObserver(
          (e) => {
            e[0]?.isIntersecting && h(n, r, !0);
          },
          { rootMargin: `-20% 0px -70% 0px` },
        );
        a.observe(i), e.push(a);
      }),
      () => e.forEach((e) => e.disconnect())
    );
  });
  function r(e) {
    h(n, e, !0);
    let r = t.sections[e];
    if (!r) return;
    let i = document.getElementById(r.id);
    i && i.scrollIntoView({ behavior: `smooth`, block: `start` });
  }
  var i = G(),
    a = s(i);
  {
    let e = l(() => t.sections.map((e) => e.label));
    V(a, {
      get items() {
        return c(e);
      },
      get activeIndex() {
        return c(n);
      },
      onchange: r,
    });
  }
  D(i), f(e, i), E();
}
var K = i(
    `<a target="_blank" rel="noopener noreferrer" class="ext-link svelte-17etibv"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15,3 21,3 21,9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a>`,
  ),
  le = i(
    `<button class="toggle-btn svelte-17etibv"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"></path></svg></button>`,
  ),
  ue = i(`<p class="item-desc svelte-17etibv"> </p>`),
  de = i(`<div class="code-block svelte-17etibv"><span class="code-label svelte-17etibv">Install</span> <!></div>`),
  q = i(`<div class="code-block svelte-17etibv"><span class="code-label svelte-17etibv">Usage</span> <!></div>`),
  fe = i(`<div class="item-code svelte-17etibv"><!> <!></div>`),
  pe = i(
    `<div class="actionable-item svelte-17etibv"><div class="item-header svelte-17etibv"><div class="item-left svelte-17etibv"><!> <span class="item-name svelte-17etibv"> </span></div> <div class="item-right svelte-17etibv"><span class="url-status svelte-17etibv"> </span> <!> <!></div></div> <!> <!></div>`,
  );
function me(e, t) {
  b(t, !0);
  let i = g(!1),
    a = l(() => !!(t.item.installCommand || t.item.code)),
    u = l(() =>
      t.item.urlStatus === `live` || t.item.urlStatus === `ok`
        ? `var(--ok-bg)`
        : t.item.urlStatus === `redirect`
          ? `var(--warn-bg)`
          : t.item.urlStatus === `dead` || t.item.urlStatus === `error`
            ? `var(--bad-bg)`
            : `var(--neutral-bg)`,
    ),
    d = l(() =>
      t.item.urlStatus === `live` || t.item.urlStatus === `ok`
        ? `var(--ok)`
        : t.item.urlStatus === `redirect`
          ? `var(--warn)`
          : t.item.urlStatus === `dead` || t.item.urlStatus === `error`
            ? `var(--bad)`
            : `var(--neutral)`,
    ),
    p = l(() =>
      t.item.urlStatus === `live` || t.item.urlStatus === `ok`
        ? `Live`
        : t.item.urlStatus === `redirect`
          ? `Redirect`
          : t.item.urlStatus === `dead` || t.item.urlStatus === `error`
            ? `Dead`
            : t.item.urlStatus || `—`,
    );
  var m = pe(),
    _ = s(m),
    y = s(_),
    S = s(y);
  I(S, {
    get text() {
      return t.item.type;
    },
  });
  var C = o(S, 2),
    T = s(C, !0);
  D(C), D(y);
  var k = o(y, 2),
    A = s(k),
    j = s(A, !0);
  D(A);
  var M = o(A, 2),
    ee = (e) => {
      var r = K();
      n(() => {
        v(r, `href`, t.item.url),
          v(r, `title`, `Open ${t.item.name ?? ``}`),
          v(r, `aria-label`, `Open ${t.item.name ?? ``} (opens in new tab)`);
      }),
        f(e, r);
    };
  r(M, (e) => {
    t.item.url && e(ee);
  });
  var N = o(M, 2),
    P = (e) => {
      var t = le(),
        r = s(t);
      D(t),
        n(() => {
          v(t, `aria-expanded`, c(i)),
            v(t, `aria-label`, c(i) ? `Collapse details` : `Expand details`),
            w(r, `transform: rotate(${c(i) ? 180 : 0}deg); transition: transform var(--t-fast)`);
        }),
        x(`click`, t, () => {
          h(i, !c(i));
        }),
        f(e, t);
    };
  r(N, (e) => {
    c(a) && e(P);
  }),
    D(k),
    D(_);
  var F = o(_, 2),
    te = (e) => {
      var r = ue(),
        i = s(r, !0);
      D(r), n(() => O(i, t.item.description)), f(e, r);
    };
  r(F, (e) => {
    t.item.description && e(te);
  });
  var ne = o(F, 2),
    L = (e) => {
      z(e, {
        get expand() {
          return c(i);
        },
        children: (e, n) => {
          var i = fe(),
            a = s(i),
            c = (e) => {
              var n = de();
              R(o(s(n), 2), {
                get text() {
                  return t.item.installCommand;
                },
                prompt: `$`,
                showCopyButton: !0,
              }),
                D(n),
                f(e, n);
            };
          r(a, (e) => {
            t.item.installCommand && e(c);
          });
          var l = o(a, 2),
            u = (e) => {
              var n = q();
              R(o(s(n), 2), {
                get text() {
                  return t.item.code;
                },
                showCopyButton: !0,
              }),
                D(n),
                f(e, n);
            };
          r(l, (e) => {
            t.item.code && e(u);
          }),
            D(i),
            f(e, i);
        },
        $$slots: { default: !0 },
      });
    };
  r(ne, (e) => {
    c(a) && e(L);
  }),
    D(m),
    n(() => {
      O(T, t.item.name),
        w(
          A,
          `color:${c(d) ?? ``};background:${c(u) ?? ``};border-color:color-mix(in srgb,${c(d) ?? ``} 30%,transparent)`,
        ),
        O(j, c(p));
    }),
    f(e, m),
    E();
}
t([`click`]);
var he = i(`<span class="rail-dur svelte-1ap7pnz"> </span>`),
  ge = i(
    `<a class="rail-card svelte-1ap7pnz"><div class="rail-thumb svelte-1ap7pnz"><!> <!></div> <div class="rail-meta svelte-1ap7pnz"><p class="rail-title svelte-1ap7pnz"> </p> <span class="rail-creator svelte-1ap7pnz"> </span></div></a>`,
  ),
  J = i(`<div class="rail svelte-1ap7pnz"></div>`);
function _e(e, t) {
  b(t, !0);
  let i = l(() => t.ids.map((e) => j(e)).filter((e) => e !== void 0));
  var u = a(),
    p = T(u),
    m = (e) => {
      B(e, {
        direction: `horizontal`,
        showArrows: !0,
        dragToScroll: !0,
        hideScrollbar: !0,
        children: (e) => {
          var t = J();
          k(
            t,
            21,
            () => c(i),
            d,
            (e, t) => {
              var i = ge(),
                a = s(i),
                l = s(a);
              L(l, {
                get src() {
                  return c(t).thumb;
                },
                get alt() {
                  return c(t).title;
                },
                classes: `rail-thumb-img`,
              });
              var u = o(l, 2),
                d = (e) => {
                  var r = he(),
                    i = s(r, !0);
                  D(r), n((e) => O(i, e), [() => P(c(t).durationSec)]), f(e, r);
                };
              r(u, (e) => {
                c(t).durationSec > 0 && e(d);
              }),
                D(a);
              var p = o(a, 2),
                m = s(p),
                h = s(m, !0);
              D(m);
              var g = o(m, 2),
                _ = s(g);
              D(g),
                D(p),
                D(i),
                n(
                  (e) => {
                    v(i, `href`, e), v(i, `title`, c(t).title), O(h, c(t).title), O(_, `@${c(t).username ?? ``}`);
                  },
                  [() => `/video/` + encodeURIComponent(c(t).id)],
                ),
                f(e, i);
            },
          ),
            D(t),
            f(e, t);
        },
        $$slots: { default: !0 },
      });
    };
  r(p, (e) => {
    c(i).length > 0 && e(m);
  }),
    f(e, u),
    E();
}
var ve = i(
    `<a target="_blank" rel="noopener noreferrer" class="ig-link svelte-vkyiuk" aria-label="Open Instagram reel"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><circle cx="12" cy="12" r="4"></circle><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"></circle></svg> Instagram</a>`,
  ),
  ye = i(`<div class="tags-row svelte-vkyiuk" aria-label="Tags"></div>`),
  be = i(`<div class="tags-row svelte-vkyiuk" aria-label="Applies to projects"></div>`),
  xe = i(
    `<video class="video-player svelte-vkyiuk" controls="" preload="metadata"><track kind="captions"/> Your browser does not support the video element.</video>`,
    2,
  ),
  Se = i(`<img class="thumb-img svelte-vkyiuk" loading="lazy" decoding="async"/>`),
  Ce = i(`<li class="svelte-vkyiuk"> </li>`),
  we = i(`<ul class="takeaways-list svelte-vkyiuk"></ul>`),
  Te = i(`<p class="empty-text svelte-vkyiuk">No takeaways available.</p>`),
  Ee = i(`<div class="transcript-body svelte-vkyiuk"><pre class="transcript-pre svelte-vkyiuk"> </pre></div>`),
  De = i(`<p class="empty-text svelte-vkyiuk">No transcript available.</p>`),
  Oe = i(`<p class="prose svelte-vkyiuk"> </p>`),
  ke = i(`<p class="empty-text svelte-vkyiuk">No visual description available.</p>`),
  Ae = i(`<div class="tools-list svelte-vkyiuk"></div>`),
  je = i(`<p class="empty-text svelte-vkyiuk">No tools extracted.</p>`),
  Me = i(`<span class="link-desc svelte-vkyiuk"> </span>`),
  Ne = i(
    `<li class="link-item svelte-vkyiuk"><a target="_blank" rel="noopener noreferrer" class="link-anchor svelte-vkyiuk"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" class="link-icon svelte-vkyiuk"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15,3 21,3 21,9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg> </a> <!></li>`,
  ),
  Pe = i(`<ul class="links-list svelte-vkyiuk"></ul>`),
  Fe = i(`<p class="empty-text svelte-vkyiuk">No links extracted.</p>`),
  Ie = i(`<p class="sidebar-prose svelte-vkyiuk"> </p>`),
  Le = i(
    `<div class="stat-row svelte-vkyiuk"><dt class="svelte-vkyiuk">Usefulness</dt> <dd class="stat-text svelte-vkyiuk"> </dd></div>`,
  ),
  Re = i(
    `<div class="sidebar-card svelte-vkyiuk"><h3 class="sidebar-section-title svelte-vkyiuk">Related</h3> <!></div>`,
  ),
  ze = i(
    `<div class="layout svelte-vkyiuk"><div class="main svelte-vkyiuk"><h1 class="title svelte-vkyiuk"> </h1> <div class="meta-row svelte-vkyiuk"><!> <!> <!> <span class="meta-sep svelte-vkyiuk" aria-hidden="true">·</span> <span class="meta-item svelte-vkyiuk"> </span> <span class="meta-sep svelte-vkyiuk" aria-hidden="true">·</span> <span class="meta-item svelte-vkyiuk"> </span> <span class="meta-sep svelte-vkyiuk" aria-hidden="true">·</span> <span class="meta-item svelte-vkyiuk"> </span></div> <!> <!> <div class="media-wrap svelte-vkyiuk"><!></div> <!>  <section class="content-section svelte-vkyiuk" id="takeaways" aria-labelledby="takeaways-heading"><h2 id="takeaways-heading" class="section-heading svelte-vkyiuk">Key Takeaways</h2> <!></section> <section class="content-section svelte-vkyiuk" id="transcript" aria-labelledby="transcript-heading"><h2 id="transcript-heading" class="section-heading svelte-vkyiuk">Transcript</h2> <!></section> <section class="content-section svelte-vkyiuk" id="onscreen" aria-labelledby="onscreen-heading"><h2 id="onscreen-heading" class="section-heading svelte-vkyiuk">On-screen</h2> <!></section> <section class="content-section svelte-vkyiuk" id="tools" aria-labelledby="tools-heading"><h2 id="tools-heading" class="section-heading svelte-vkyiuk">Tools &amp; Resources</h2> <!></section> <section class="content-section svelte-vkyiuk" id="links" aria-labelledby="links-heading"><h2 id="links-heading" class="section-heading svelte-vkyiuk">Links</h2> <!></section></div> <aside class="sidebar svelte-vkyiuk" aria-label="Video details and related"><div class="sidebar-card svelte-vkyiuk"><div class="verif-header svelte-vkyiuk"><!></div> <!> <dl class="stats-dl svelte-vkyiuk"><div class="stat-row svelte-vkyiuk"><dt class="svelte-vkyiuk">Implementability</dt> <dd class="svelte-vkyiuk"><div class="score-bar-wrap svelte-vkyiuk"><div class="progress-wrap svelte-vkyiuk"><!></div> <span class="score-val svelte-vkyiuk"> <span class="score-denom svelte-vkyiuk">/10</span></span></div></dd></div> <!></dl></div> <!></aside></div>`,
  ),
  Be = i(`<div class="video-page svelte-vkyiuk"><!> <!></div>`);
function Ve(t, i) {
  b(i, !0);
  let a = () => y(M, `$page`, x),
    [x, S] = e(),
    w = l(() => decodeURIComponent(a().params.id ?? ``)),
    T = g(null),
    j = g(!0),
    I = g(!1);
  p(() => {
    let e = c(w);
    h(j, !0),
      h(I, !1),
      h(T, null),
      A(e).then((e) => {
        h(T, e, !0), h(j, !1), e || h(I, !0);
      });
  });
  let L = l(() =>
      c(T)
        ? [
            { label: `Home`, href: `/` },
            { label: c(T).category, href: `/category/${encodeURIComponent(c(T).category)}` },
            { label: c(T).title },
          ]
        : [{ label: `Home`, href: `/` }, { label: `Video` }],
    ),
    R = [
      { id: `takeaways`, label: `Takeaways` },
      { id: `transcript`, label: `Transcript` },
      { id: `onscreen`, label: `On-screen` },
      { id: `tools`, label: `Tools` },
      { id: `links`, label: `Links` },
    ];
  var z = Be();
  _(`vkyiuk`, (e) => {
    u(() => {
      m.title = c(T) ? `${c(T).title} — Dopamine` : `Video — Dopamine`;
    });
  });
  var B = s(z);
  se(B, {
    get items() {
      return c(L);
    },
  });
  var V = o(B, 2),
    W = (e) => {
      H(e, {});
    },
    G = (e) => {
      U(e, { message: `This video could not be found.`, icon: `◌` });
    },
    K = (e) => {
      var t = ze(),
        i = s(t),
        a = s(i),
        u = s(a, !0);
      D(a);
      var p = o(a, 2),
        m = s(p);
      ie(m, {
        get name() {
          return c(T).username;
        },
        get fullName() {
          return c(T).fullName;
        },
      });
      var h = o(m, 2);
      te(h, {
        get cat() {
          return c(T).category;
        },
      });
      var g = o(h, 2),
        _ = (e) => {
          var t = ve();
          n((e) => v(t, `href`, e), [() => N(c(T).code)]), f(e, t);
        };
      r(g, (e) => {
        c(T).code && e(_);
      });
      var y = o(g, 4),
        b = s(y, !0);
      D(y);
      var x = o(y, 4),
        S = s(x);
      D(x);
      var w = o(x, 4),
        E = s(w, !0);
      D(w), D(p);
      var A = o(p, 2),
        j = (e) => {
          var t = ye();
          k(
            t,
            21,
            () => c(T).tags,
            d,
            (e, t) => {
              re(e, {
                get tag() {
                  return c(t);
                },
              });
            },
          ),
            D(t),
            f(e, t);
        };
      r(A, (e) => {
        c(T).tags.length > 0 && e(j);
      });
      var M = o(A, 2),
        I = (e) => {
          var t = be();
          k(
            t,
            21,
            () => c(T).appliesTo,
            d,
            (e, t) => {
              ae(e, {
                get project() {
                  return c(t);
                },
              });
            },
          ),
            D(t),
            f(e, t);
        };
      r(M, (e) => {
        (c(T).appliesTo ?? []).length > 0 && e(I);
      });
      var L = o(M, 2),
        z = s(L),
        B = (e) => {
          var t = xe();
          n(() => {
            v(t, `src`, c(T).videoPath), v(t, `poster`, c(T).thumb), v(t, `aria-label`, c(T).title);
          }),
            f(e, t);
        },
        V = (e) => {
          var t = Se();
          n(() => {
            v(t, `src`, c(T).thumb), v(t, `alt`, c(T).title);
          }),
            f(e, t);
        };
      r(z, (e) => {
        c(T).videoPath ? e(B) : e(V, -1);
      }),
        D(L);
      var H = o(L, 2);
      ce(H, {
        get sections() {
          return R;
        },
      });
      var U = o(H, 2),
        se = o(s(U), 2),
        W = (e) => {
          var t = we();
          k(
            t,
            21,
            () => c(T).keyTakeaways,
            d,
            (e, t) => {
              var r = Ce(),
                i = s(r, !0);
              D(r), n(() => O(i, c(t))), f(e, r);
            },
          ),
            D(t),
            f(e, t);
        },
        G = (e) => {
          f(e, Te());
        };
      r(se, (e) => {
        c(T).keyTakeaways.length > 0 ? e(W) : e(G, -1);
      }),
        D(U);
      var K = o(U, 2),
        le = o(s(K), 2),
        ue = (e) => {
          var t = Ee(),
            r = s(t),
            i = s(r, !0);
          D(r), D(t), n(() => O(i, c(T).transcript)), f(e, t);
        },
        de = (e) => {
          f(e, De());
        };
      r(le, (e) => {
        c(T).transcript ? e(ue) : e(de, -1);
      }),
        D(K);
      var q = o(K, 2),
        fe = o(s(q), 2),
        pe = (e) => {
          var t = Oe(),
            r = s(t, !0);
          D(t), n(() => O(r, c(T).visualDescription)), f(e, t);
        },
        he = l(() => c(T).visualDescription && !c(T).visualDescription.includes(`[object Object]`)),
        ge = (e) => {
          f(e, ke());
        };
      r(fe, (e) => {
        c(he) ? e(pe) : e(ge, -1);
      }),
        D(q);
      var J = o(q, 2),
        Be = o(s(J), 2),
        Ve = (e) => {
          var t = Ae();
          k(
            t,
            21,
            () => c(T).actionableItems,
            d,
            (e, t) => {
              me(e, {
                get item() {
                  return c(t);
                },
              });
            },
          ),
            D(t),
            f(e, t);
        },
        He = (e) => {
          f(e, je());
        };
      r(Be, (e) => {
        c(T).actionableItems.length > 0 ? e(Ve) : e(He, -1);
      }),
        D(J);
      var Ue = o(J, 2),
        We = o(s(Ue), 2),
        Ge = (e) => {
          var t = Pe();
          k(
            t,
            21,
            () => c(T).links,
            d,
            (e, t) => {
              var i = Ne(),
                a = s(i),
                l = o(s(a));
              D(a);
              var u = o(a, 2),
                d = (e) => {
                  var r = Me(),
                    i = s(r, !0);
                  D(r), n(() => O(i, c(t).description)), f(e, r);
                };
              r(u, (e) => {
                c(t).description && e(d);
              }),
                D(i),
                n(() => {
                  v(a, `href`, c(t).url), O(l, ` ${(c(t).name || c(t).url) ?? ``}`);
                }),
                f(e, i);
            },
          ),
            D(t),
            f(e, t);
        },
        Ke = (e) => {
          f(e, Fe());
        };
      r(We, (e) => {
        c(T).links.length > 0 ? e(Ge) : e(Ke, -1);
      }),
        D(Ue),
        D(i);
      var qe = o(i, 2),
        Y = s(qe),
        X = s(Y);
      oe(s(X), {
        get score() {
          return c(T).verification;
        },
        get confidence() {
          return c(T).confidence;
        },
      }),
        D(X);
      var Je = o(X, 2),
        Ye = (e) => {
          var t = Ie(),
            r = s(t, !0);
          D(t), n(() => O(r, c(T).verificationSummary)), f(e, t);
        };
      r(Je, (e) => {
        c(T).verificationSummary && e(Ye);
      });
      var Xe = o(Je, 2),
        Z = s(Xe),
        Ze = o(s(Z), 2),
        Q = s(Ze),
        $ = s(Q);
      ne(s($), {
        get value() {
          return c(T).implementability;
        },
        max: 10,
      }),
        D($);
      var Qe = o($, 2),
        $e = s(Qe, !0);
      C(), D(Qe), D(Q), D(Ze), D(Z);
      var et = o(Z, 2),
        tt = (e) => {
          var t = Le(),
            r = o(s(t), 2),
            i = s(r, !0);
          D(r), D(t), n(() => O(i, c(T).usefulness)), f(e, t);
        };
      r(et, (e) => {
        c(T).usefulness && c(T).usefulness !== `unknown` && e(tt);
      }),
        D(Xe),
        D(Y);
      var nt = o(Y, 2),
        rt = (e) => {
          var t = Re();
          _e(o(s(t), 2), {
            get ids() {
              return c(T).relatedIds;
            },
          }),
            D(t),
            f(e, t);
        };
      r(nt, (e) => {
        c(T).relatedIds.length > 0 && e(rt);
      }),
        D(qe),
        D(t),
        n(
          (e, t, n) => {
            O(u, c(T).title),
              O(b, e),
              O(S, `${t ?? ``} likes`),
              O(E, n),
              v(Q, `aria-label`, `Implementability ${c(T).implementability ?? ``}/10`),
              O($e, c(T).implementability);
          },
          [() => ee(c(T).date), () => F(c(T).likes), () => P(c(T).durationSec)],
        ),
        f(e, t);
    };
  r(V, (e) => {
    c(j) ? e(W) : c(I) || !c(T) ? e(G, 1) : e(K, -1);
  }),
    D(z),
    f(t, z),
    E(),
    S();
}
export { Ve as component, W as universal };
