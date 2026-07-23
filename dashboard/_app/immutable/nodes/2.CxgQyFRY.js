import {
  B as e,
  C as t,
  D as n,
  J as r,
  K as i,
  P as a,
  Q as o,
  T as s,
  V as c,
  d as l,
  it as u,
  p as d,
  q as f,
  rt as p,
  st as m,
  w as h,
  x as g,
} from "../chunks/KQ3eEBfb.js";
import "../chunks/xihTtKlq.js";
import { a as _, d as v, i as y, l as b, o as x, r as S } from "../chunks/5wXqoPKv.js";
import { t as ee } from "../chunks/C9NVFsZM.js";
import { t as C } from "../chunks/BcfutCr0.js";
import { n as te, t as ne } from "../chunks/8hiyGRUO.js";
import { t as re } from "../chunks/BF0F8NE4.js";
import { t as w } from "../chunks/WJjxiR19.js";
var ie = n(`<p class="empty-hint svelte-1uha8ag">No categories yet.</p>`),
  ae = n(
    `<a class="cat-tile svelte-1uha8ag"><span class="cat-name svelte-1uha8ag"> </span> <span class="cat-count svelte-1uha8ag"> </span></a>`,
  ),
  oe = n(`<div class="cat-grid svelte-1uha8ag"></div>`),
  se = n(`<p class="empty-hint svelte-1uha8ag">No learnings found.</p>`),
  T = n(`<p class="empty-hint svelte-1uha8ag">No videos found.</p>`),
  E = n(`<p class="empty-hint svelte-1uha8ag">No creators yet.</p>`),
  D = n(`<div class="creator-chip svelte-1uha8ag"><!> <span class="creator-count svelte-1uha8ag"> </span></div>`),
  O = n(`<div class="creators-row svelte-1uha8ag"></div>`),
  k = n(`<p class="empty-hint svelte-1uha8ag">No tags yet.</p>`),
  A = n(`<div class="tags-wrap svelte-1uha8ag"></div>`),
  j = n(`<p class="empty-hint svelte-1uha8ag">No tools indexed yet.</p>`),
  ce = n(`<a class="tool-name svelte-1uha8ag" target="_blank" rel="noopener noreferrer"> </a>`),
  le = n(`<span class="tool-name tool-name--plain svelte-1uha8ag"> </span>`),
  ue = n(
    `<div class="tool-row svelte-1uha8ag"><div class="tool-main svelte-1uha8ag"><!> <span class="tool-type svelte-1uha8ag"> </span></div> <div class="tool-meta svelte-1uha8ag"><!> <a class="tool-source svelte-1uha8ag"> </a></div></div>`,
  ),
  de = n(`<div class="tools-table svelte-1uha8ag"></div>`),
  fe = n(
    `<section class="hero svelte-1uha8ag"><h1 class="hero-title svelte-1uha8ag">Dopamine</h1> <p class="hero-sub svelte-1uha8ag">Discover curated AI & tech content, verified tools, and creator insights.</p> <div class="search-wrap svelte-1uha8ag"><!></div></section> <section class="section svelte-1uha8ag"><div class="section-header svelte-1uha8ag"><h2 class="section-title svelte-1uha8ag">Browse by Category</h2></div> <!></section> <section class="section svelte-1uha8ag"><div class="section-header svelte-1uha8ag"><h2 class="section-title svelte-1uha8ag">Top learnings</h2> <a class="see-all svelte-1uha8ag" href="/videos">See all videos →</a></div> <!></section> <section class="section svelte-1uha8ag"><div class="section-header svelte-1uha8ag"><h2 class="section-title svelte-1uha8ag">Recently added</h2> <a class="see-all svelte-1uha8ag" href="/videos?sort=date-desc">See all videos →</a></div> <!></section> <section class="section svelte-1uha8ag"><div class="section-header svelte-1uha8ag"><h2 class="section-title svelte-1uha8ag">Top Creators</h2> <a class="see-all svelte-1uha8ag" href="/creators">See all →</a></div> <!></section> <section class="section svelte-1uha8ag"><div class="section-header svelte-1uha8ag"><h2 class="section-title svelte-1uha8ag">Trending Tags</h2></div> <!></section> <section class="section svelte-1uha8ag"><div class="section-header svelte-1uha8ag"><h2 class="section-title svelte-1uha8ag">Verified Tools</h2> <a class="see-all svelte-1uha8ag" href="/tools">See all tools →</a></div> <!></section>`,
    1,
  );
function M(n, M) {
  u(M, !0),
    c(() => {
      b(), v();
    });
  let N = o(x),
    P = o(S),
    F = o(_),
    I = o(y),
    L = { featured: 0, standard: 1, thin: 2 },
    R = o(() =>
      [...a(F)]
        .filter((e) => e.tier !== `thin`)
        .sort(
          (e, t) => L[e.tier] - L[t.tier] || t.quality - e.quality || (t.date > e.date ? 1 : t.date < e.date ? -1 : 0),
        )
        .slice(0, 12),
    ),
    z = o(() => [...a(F)].sort((e, t) => (t.date > e.date ? 1 : t.date < e.date ? -1 : 0)).slice(0, 12)),
    B = o(() => (a(P)?.creators ?? []).slice(0, 10)),
    V = o(() => (a(P)?.tags ?? []).slice(0, 20)),
    H = o(() =>
      [...a(I)]
        .sort((e, t) => {
          let n = (e) => (e === `verified_useful` ? 0 : e === `partially_verified` ? 1 : 2);
          return n(e.verification) - n(t.verification);
        })
        .slice(0, 6),
    ),
    U = o(() => a(P)?.categories ?? []);
  var W = fe(),
    G = f(W),
    K = r(i(G), 4);
  ee(i(K), { placeholder: `Search videos, tools, creators…` }), m(K), m(G);
  var q = r(G, 2),
    pe = r(i(q), 2),
    me = (e) => {
      C(e, {});
    },
    he = (e) => {
      s(e, ie());
    },
    ge = (t) => {
      var n = oe();
      g(
        n,
        21,
        () => a(U),
        (e) => e.name,
        (t, n) => {
          var o = ae(),
            c = i(o),
            u = i(c, !0);
          m(c);
          var f = r(c, 2),
            p = i(f);
          m(f),
            m(o),
            e(
              (e) => {
                l(o, `href`, e),
                  d(o, `color:${a(n).color ?? ``};background:${a(n).bg ?? ``}`),
                  h(u, a(n).name),
                  h(p, `${a(n).count ?? ``} video${a(n).count === 1 ? `` : `s`}`);
              },
              [() => `/category/` + encodeURIComponent(a(n).name)],
            ),
            s(t, o);
        },
      ),
        m(n),
        s(t, n);
    };
  t(pe, (e) => {
    a(P) === null ? e(me) : a(U).length === 0 ? e(he, 1) : e(ge, -1);
  }),
    m(q);
  var J = r(q, 2),
    _e = r(i(J), 2),
    ve = (e) => {
      C(e, {});
    },
    ye = (e) => {
      s(e, se());
    },
    be = (e) => {
      w(e, {
        get items() {
          return a(R);
        },
        emptyMessage: `No learnings yet.`,
      });
    };
  t(_e, (e) => {
    a(N) ? (a(R).length === 0 ? e(ye, 1) : e(be, -1)) : e(ve);
  }),
    m(J);
  var Y = r(J, 2),
    xe = r(i(Y), 2),
    Se = (e) => {
      C(e, {});
    },
    Ce = (e) => {
      s(e, T());
    },
    we = (e) => {
      w(e, {
        get items() {
          return a(z);
        },
        emptyMessage: `No recent videos.`,
      });
    };
  t(xe, (e) => {
    a(N) ? (a(z).length === 0 ? e(Ce, 1) : e(we, -1)) : e(Se);
  }),
    m(Y);
  var X = r(Y, 2),
    Te = r(i(X), 2),
    Ee = (e) => {
      C(e, { size: 20 });
    },
    Z = (e) => {
      s(e, E());
    },
    De = (t) => {
      var n = O();
      g(
        n,
        21,
        () => a(B),
        (e) => e.name,
        (t, n) => {
          var o = D(),
            c = i(o);
          ne(c, {
            get name() {
              return a(n).name;
            },
            get fullName() {
              return a(n).fullName;
            },
          });
          var l = r(c, 2),
            u = i(l, !0);
          m(l), m(o), e(() => h(u, a(n).count)), s(t, o);
        },
      ),
        m(n),
        s(t, n);
    };
  t(Te, (e) => {
    a(P) === null ? e(Ee) : a(B).length === 0 ? e(Z, 1) : e(De, -1);
  }),
    m(X);
  var Q = r(X, 2),
    Oe = r(i(Q), 2),
    ke = (e) => {
      C(e, { size: 20 });
    },
    Ae = (e) => {
      s(e, k());
    },
    je = (e) => {
      var t = A();
      g(
        t,
        21,
        () => a(V),
        (e) => e.name,
        (e, t) => {
          te(e, {
            get tag() {
              return a(t).name;
            },
          });
        },
      ),
        m(t),
        s(e, t);
    };
  t(Oe, (e) => {
    a(P) === null ? e(ke) : a(V).length === 0 ? e(Ae, 1) : e(je, -1);
  }),
    m(Q);
  var $ = r(Q, 2),
    Me = r(i($), 2),
    Ne = (e) => {
      C(e, { size: 20 });
    },
    Pe = (e) => {
      s(e, j());
    },
    Fe = (n) => {
      var o = de();
      g(
        o,
        21,
        () => a(H),
        (e) => e.name + e.videoId,
        (n, o) => {
          var c = ue(),
            u = i(c),
            d = i(u),
            f = (t) => {
              var n = ce(),
                r = i(n, !0);
              m(n),
                e(() => {
                  l(n, `href`, a(o).url), h(r, a(o).name);
                }),
                s(t, n);
            },
            p = (t) => {
              var n = le(),
                r = i(n, !0);
              m(n), e(() => h(r, a(o).name)), s(t, n);
            };
          t(d, (e) => {
            a(o).url ? e(f) : e(p, -1);
          });
          var g = r(d, 2),
            _ = i(g, !0);
          m(g), m(u);
          var v = r(u, 2),
            y = i(v);
          re(y, {
            get score() {
              return a(o).verification;
            },
            size: `badge`,
          });
          var b = r(y, 2),
            x = i(b, !0);
          m(b),
            m(v),
            m(c),
            e(
              (e, t) => {
                h(_, a(o).type), l(b, `href`, e), h(x, t);
              },
              [
                () => `/video/` + encodeURIComponent(a(o).videoId),
                () => (a(o).videoTitle.length > 48 ? a(o).videoTitle.slice(0, 48) + `…` : a(o).videoTitle),
              ],
            ),
            s(n, c);
        },
      ),
        m(o),
        s(n, o);
    };
  t(Me, (e) => {
    a(I).length === 0 && a(P) !== null ? e(Ne) : a(H).length === 0 ? e(Pe, 1) : e(Fe, -1);
  }),
    m($),
    s(n, W),
    p();
}
export { M as component };
