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
import { t as M } from "../chunks/DPhD9Nez.js";
import { a as ee, c as N, l as P, o as F, s as te, t as ne, u as re } from "../chunks/DLokxzUJ.js";
import { a as ie, d as I, f as L, i as R, p as z, r as B, s as V, t as ae } from "../chunks/Dt5KBvTb.js";
import { n as oe, t as se } from "../chunks/BxqmUSMk.js";
import { t as ce } from "../chunks/DrAFDkqO.js";
import { t as le } from "../chunks/Cl_I9Zju.js";
import { t as ue } from "../chunks/BbG86UsG.js";
import { t as H } from "../chunks/CyjB8bAN.js";
var U = C({ ssr: () => !1 }),
  W = x(`<nav aria-label="Page sections"><!></nav>`);
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
  var s = W(),
    c = p(s);
  {
    let e = S(() => n.sections.map((e) => e.label));
    V(c, {
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
var G = x(
    `<a target="_blank" rel="noopener noreferrer" class="ext-link svelte-17etibv"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15,3 21,3 21,9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a>`,
  ),
  fe = x(
    `<button class="toggle-btn svelte-17etibv"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"></path></svg></button>`,
  ),
  pe = x(`<p class="item-desc svelte-17etibv"> </p>`),
  me = x(`<div class="code-block svelte-17etibv"><span class="code-label svelte-17etibv">Install</span> <!></div>`),
  K = x(`<div class="code-block svelte-17etibv"><span class="code-label svelte-17etibv">Usage</span> <!></div>`),
  he = x(`<div class="item-code svelte-17etibv"><!> <!></div>`),
  ge = x(
    `<div class="actionable-item svelte-17etibv"><div class="item-header svelte-17etibv"><div class="item-left svelte-17etibv"><!> <span class="item-name svelte-17etibv"> </span></div> <div class="item-right svelte-17etibv"><span class="url-status svelte-17etibv"> </span> <!> <!></div></div> <!> <!></div>`,
  );
function _e(t, n) {
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
  var x = ge(),
    C = p(x),
    w = p(C),
    T = p(w);
  I(T, {
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
      var t = G();
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
  var N = m(M, 2),
    P = (t) => {
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
  u(N, (e) => {
    o(l) && e(P);
  }),
    g(k),
    g(C);
  var F = m(C, 2),
    te = (e) => {
      var t = pe(),
        o = p(t, !0);
      g(t), a(() => i(o, n.item.description)), r(e, t);
    };
  u(F, (e) => {
    n.item.description && e(te);
  });
  var ne = m(F, 2),
    re = (e) => {
      z(e, {
        get expand() {
          return o(s);
        },
        children: (e, t) => {
          var i = he(),
            a = p(i),
            o = (e) => {
              var t = me();
              R(m(p(t), 2), {
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
              var t = K();
              R(m(p(t), 2), {
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
  u(ne, (e) => {
    o(l) && e(re);
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
var ve = x(`<span class="rail-dur svelte-1ap7pnz"> </span>`),
  q = x(
    `<a class="rail-card svelte-1ap7pnz"><div class="rail-thumb svelte-1ap7pnz"><!> <!></div> <div class="rail-meta svelte-1ap7pnz"><p class="rail-title svelte-1ap7pnz"> </p> <span class="rail-creator svelte-1ap7pnz"> </span></div></a>`,
  ),
  ye = x(`<div class="rail svelte-1ap7pnz"></div>`);
function be(e, t) {
  h(t, !0);
  let s = S(() => t.ids.map((e) => j(e)).filter((e) => e !== void 0));
  var c = l(),
    d = f(c),
    _ = (e) => {
      B(e, {
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
              var n = q(),
                s = p(n),
                c = p(s),
                l = (e) => {
                  L(e, {
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
                  var n = ve(),
                    s = p(n, !0);
                  g(n), a((e) => i(s, e), [() => F(o(t).durationSec)]), r(e, n);
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
var xe = x(
    `<a target="_blank" rel="noopener noreferrer" class="ig-link svelte-vkyiuk" aria-label="Open Instagram reel"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><circle cx="12" cy="12" r="4"></circle><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"></circle></svg> Instagram</a>`,
  ),
  Se = x(`<a target="_blank" rel="noopener noreferrer" class="ig-link svelte-vkyiuk"> </a>`),
  Ce = x(`<div class="tags-row svelte-vkyiuk" aria-label="Tags"></div>`),
  we = x(`<div class="tags-row svelte-vkyiuk" aria-label="Applies to projects"></div>`),
  Te = x(
    `<video class="video-player svelte-vkyiuk" controls="" preload="metadata"><track kind="captions"/> Your browser does not support the video element.</video>`,
    2,
  ),
  Ee = x(`<img class="thumb-img svelte-vkyiuk" loading="lazy" decoding="async"/>`),
  De = x(`<p class="thin-note svelte-vkyiuk"> </p>`),
  Oe = x(`<li class="svelte-vkyiuk"> </li>`),
  ke = x(`<ul class="takeaways-list svelte-vkyiuk"></ul>`),
  Ae = x(`<p class="empty-text svelte-vkyiuk">No takeaways available.</p>`),
  je = x(`<div class="transcript-body svelte-vkyiuk"><pre class="transcript-pre svelte-vkyiuk"> </pre></div>`),
  Me = x(`<p class="empty-text svelte-vkyiuk">No transcript available.</p>`),
  Ne = x(`<p class="prose svelte-vkyiuk"> </p>`),
  Pe = x(`<p class="empty-text svelte-vkyiuk">No visual description available.</p>`),
  Fe = x(`<div class="tools-list svelte-vkyiuk"></div>`),
  Ie = x(`<p class="empty-text svelte-vkyiuk">No tools extracted.</p>`),
  Le = x(`<span class="link-desc svelte-vkyiuk"> </span>`),
  Re = x(
    `<li class="link-item svelte-vkyiuk"><a target="_blank" rel="noopener noreferrer" class="link-anchor svelte-vkyiuk"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" class="link-icon svelte-vkyiuk"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15,3 21,3 21,9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg> </a> <!></li>`,
  ),
  ze = x(`<ul class="links-list svelte-vkyiuk"></ul>`),
  Be = x(`<p class="empty-text svelte-vkyiuk">No links extracted.</p>`),
  Ve = x(`<p class="sidebar-prose svelte-vkyiuk"> </p>`),
  He = x(
    `<div class="stat-row svelte-vkyiuk"><dt class="svelte-vkyiuk">Usefulness</dt> <dd class="stat-text svelte-vkyiuk"> </dd></div>`,
  ),
  Ue = x(
    `<div class="sidebar-card svelte-vkyiuk"><h3 class="sidebar-section-title svelte-vkyiuk">Related</h3> <!></div>`,
  ),
  We = x(
    `<div class="layout svelte-vkyiuk"><div class="main svelte-vkyiuk"><h1 class="title svelte-vkyiuk"> </h1> <div class="meta-row svelte-vkyiuk"><!> <!> <!> <!> <span class="meta-sep svelte-vkyiuk" aria-hidden="true">·</span> <span class="meta-item svelte-vkyiuk"> </span> <span class="meta-sep svelte-vkyiuk" aria-hidden="true">·</span> <span class="meta-item svelte-vkyiuk"> </span> <span class="meta-sep svelte-vkyiuk" aria-hidden="true">·</span> <span class="meta-item svelte-vkyiuk"> </span></div> <!> <!> <div class="media-wrap svelte-vkyiuk"><!></div> <!> <!>  <section class="content-section svelte-vkyiuk" id="takeaways" aria-labelledby="takeaways-heading"><h2 id="takeaways-heading" class="section-heading svelte-vkyiuk">Key Takeaways</h2> <!></section> <section class="content-section svelte-vkyiuk" id="transcript" aria-labelledby="transcript-heading"><h2 id="transcript-heading" class="section-heading svelte-vkyiuk">Transcript</h2> <!></section> <section class="content-section svelte-vkyiuk" id="onscreen" aria-labelledby="onscreen-heading"><h2 id="onscreen-heading" class="section-heading svelte-vkyiuk">On-screen</h2> <!></section> <section class="content-section svelte-vkyiuk" id="tools" aria-labelledby="tools-heading"><h2 id="tools-heading" class="section-heading svelte-vkyiuk">Tools &amp; Resources</h2> <!></section> <section class="content-section svelte-vkyiuk" id="links" aria-labelledby="links-heading"><h2 id="links-heading" class="section-heading svelte-vkyiuk">Links</h2> <!></section></div> <aside class="sidebar svelte-vkyiuk" aria-label="Video details and related"><div class="sidebar-card svelte-vkyiuk"><div class="verif-header svelte-vkyiuk"><!></div> <!> <dl class="stats-dl svelte-vkyiuk"><div class="stat-row svelte-vkyiuk"><dt class="svelte-vkyiuk">Implementability</dt> <dd class="svelte-vkyiuk"><div class="score-bar-wrap svelte-vkyiuk"><div class="progress-wrap svelte-vkyiuk"><!></div> <span class="score-val svelte-vkyiuk"> <span class="score-denom svelte-vkyiuk">/10</span></span></div></dd></div> <!></dl></div> <!></aside></div>`,
  ),
  Ge = x(`<div class="video-page svelte-vkyiuk"><!> <!></div>`);
function Ke(s, c) {
  h(c, !0);
  let l = () => b(M, `$page`, f),
    [f, y] = T(),
    x = S(() => decodeURIComponent(l().params.id ?? ``)),
    C = _(null),
    j = _(!0),
    I = _(!1);
  d(() => {
    let t = o(x);
    e(j, !0),
      e(I, !1),
      e(C, null),
      A(t).then((t) => {
        e(C, t, !0), e(j, !1), t || e(I, !0);
      });
  });
  let L = S(() =>
      o(C)
        ? [
            { label: `Home`, href: `/` },
            { label: o(C).category, href: `/category/${encodeURIComponent(o(C).category)}` },
            { label: o(C).title },
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
  var z = Ge();
  k(`vkyiuk`, (e) => {
    t(() => {
      w.title = o(C) ? `${o(C).title} — Dopamine` : `Video — Dopamine`;
    });
  });
  var B = p(z);
  H(B, {
    get items() {
      return o(L);
    },
  });
  var V = m(B, 2),
    U = (e) => {
      ae(e, {});
    },
    W = (e) => {
      ue(e, { message: `This video could not be found.`, icon: `◌` });
    },
    G = (e) => {
      var t = We(),
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
      ne(h, {
        get cat() {
          return o(C).category;
        },
      });
      var _ = m(h, 2),
        y = (e) => {
          var t = xe();
          a((e) => v(t, `href`, e), [() => N(o(C).code)]), r(e, t);
        };
      u(_, (e) => {
        o(C).code && e(y);
      });
      var b = m(_, 2),
        x = (e) => {
          var t = Se(),
            n = p(t);
          g(t),
            a(
              (e, r) => {
                v(t, `href`, o(C).sourceUrl), v(t, `aria-label`, e), i(n, `Open original on ${r ?? ``}`);
              },
              [() => `Open original on ` + P(o(C).source), () => P(o(C).source)],
            ),
            r(e, t);
        };
      u(b, (e) => {
        o(C).sourceUrl && e(x);
      });
      var w = m(b, 4),
        T = p(w, !0);
      g(w);
      var E = m(w, 4),
        k = p(E);
      g(E);
      var A = m(E, 4),
        j = p(A, !0);
      g(A), g(d);
      var M = m(d, 2),
        I = (e) => {
          var t = Ce();
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
      u(M, (e) => {
        o(C).tags.length > 0 && e(I);
      });
      var L = m(M, 2),
        z = (e) => {
          var t = we();
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
      u(L, (e) => {
        (o(C).appliesTo ?? []).length > 0 && e(z);
      });
      var B = m(L, 2),
        V = p(B),
        ae = (e) => {
          var t = Te();
          a(() => {
            v(t, `src`, o(C).videoPath), v(t, `poster`, o(C).thumb), v(t, `aria-label`, o(C).title);
          }),
            r(e, t);
        },
        ue = (e) => {
          var t = Ee();
          a(() => {
            v(t, `src`, o(C).thumb), v(t, `alt`, o(C).title);
          }),
            r(e, t);
        };
      u(V, (e) => {
        o(C).videoPath ? e(ae) : o(C).thumb && e(ue, 1);
      }),
        g(B);
      var H = m(B, 2),
        U = (e) => {
          var t = De(),
            n = p(t, !0);
          g(t), a((e) => i(n, e), [() => re(o(C).thinReason)]), r(e, t);
        };
      u(H, (e) => {
        o(C).tier === `thin` && o(C).thinReason && e(U);
      });
      var W = m(H, 2);
      de(W, {
        get sections() {
          return R;
        },
      });
      var G = m(W, 2),
        fe = m(p(G), 2),
        pe = (e) => {
          var t = ke();
          n(
            t,
            21,
            () => o(C).keyTakeaways,
            O,
            (e, t) => {
              var n = Oe(),
                s = p(n, !0);
              g(n), a(() => i(s, o(t))), r(e, n);
            },
          ),
            g(t),
            r(e, t);
        },
        me = (e) => {
          r(e, Ae());
        };
      u(fe, (e) => {
        o(C).keyTakeaways.length > 0 ? e(pe) : e(me, -1);
      }),
        g(G);
      var K = m(G, 2),
        he = m(p(K), 2),
        ge = (e) => {
          var t = je(),
            n = p(t),
            s = p(n, !0);
          g(n), g(t), a(() => i(s, o(C).transcript)), r(e, t);
        },
        ve = (e) => {
          r(e, Me());
        };
      u(he, (e) => {
        o(C).transcript ? e(ge) : e(ve, -1);
      }),
        g(K);
      var q = m(K, 2),
        ye = m(p(q), 2),
        Ge = (e) => {
          var t = Ne(),
            n = p(t, !0);
          g(t), a(() => i(n, o(C).visualDescription)), r(e, t);
        },
        Ke = S(() => o(C).visualDescription && !o(C).visualDescription.includes(`[object Object]`)),
        qe = (e) => {
          r(e, Pe());
        };
      u(ye, (e) => {
        o(Ke) ? e(Ge) : e(qe, -1);
      }),
        g(q);
      var J = m(q, 2),
        Je = m(p(J), 2),
        Ye = (e) => {
          var t = Fe();
          n(
            t,
            21,
            () => o(C).actionableItems,
            O,
            (e, t) => {
              _e(e, {
                get item() {
                  return o(t);
                },
              });
            },
          ),
            g(t),
            r(e, t);
        },
        Xe = (e) => {
          r(e, Ie());
        };
      u(Je, (e) => {
        o(C).actionableItems.length > 0 ? e(Ye) : e(Xe, -1);
      }),
        g(J);
      var Ze = m(J, 2),
        Qe = m(p(Ze), 2),
        $e = (e) => {
          var t = ze();
          n(
            t,
            21,
            () => o(C).links,
            O,
            (e, t) => {
              var n = Re(),
                s = p(n),
                c = m(p(s));
              g(s);
              var l = m(s, 2),
                d = (e) => {
                  var n = Le(),
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
        et = (e) => {
          r(e, Be());
        };
      u(Qe, (e) => {
        o(C).links.length > 0 ? e($e) : e(et, -1);
      }),
        g(Ze),
        g(s);
      var tt = m(s, 2),
        Y = p(tt),
        X = p(Y);
      le(p(X), {
        get score() {
          return o(C).verification;
        },
        get confidence() {
          return o(C).confidence;
        },
      }),
        g(X);
      var nt = m(X, 2),
        rt = (e) => {
          var t = Ve(),
            n = p(t, !0);
          g(t), a(() => i(n, o(C).verificationSummary)), r(e, t);
        };
      u(nt, (e) => {
        o(C).verificationSummary && e(rt);
      });
      var it = m(nt, 2),
        Z = p(it),
        at = m(p(Z), 2),
        Q = p(at),
        $ = p(Q);
      ie(p($), {
        get value() {
          return o(C).implementability;
        },
        max: 10,
      }),
        g($);
      var ot = m($, 2),
        st = p(ot, !0);
      D(), g(ot), g(Q), g(at), g(Z);
      var ct = m(Z, 2),
        lt = (e) => {
          var t = He(),
            n = m(p(t), 2),
            s = p(n, !0);
          g(n), g(t), a(() => i(s, o(C).usefulness)), r(e, t);
        };
      u(ct, (e) => {
        o(C).usefulness && o(C).usefulness !== `unknown` && e(lt);
      }),
        g(it),
        g(Y);
      var ut = m(Y, 2),
        dt = (e) => {
          var t = Ue();
          be(m(p(t), 2), {
            get ids() {
              return o(C).relatedIds;
            },
          }),
            g(t),
            r(e, t);
        };
      u(ut, (e) => {
        o(C).relatedIds.length > 0 && e(dt);
      }),
        g(tt),
        g(t),
        a(
          (e, t, n) => {
            i(l, o(C).title),
              i(T, e),
              i(k, `${t ?? ``} likes`),
              i(j, n),
              v(Q, `aria-label`, `Implementability ${o(C).implementability ?? ``}/10`),
              i(st, o(C).implementability);
          },
          [() => ee(o(C).date), () => te(o(C).likes), () => F(o(C).durationSec)],
        ),
        r(e, t);
    };
  u(V, (e) => {
    o(j) ? e(U) : o(I) || !o(C) ? e(W, 1) : e(G, -1);
  }),
    g(z),
    r(s, z),
    E(),
    y();
}
export { Ke as component, U as universal };
