import {
  C as e,
  D as t,
  E as n,
  H as r,
  I as i,
  T as a,
  U as o,
  X as s,
  Y as c,
  Z as l,
  ct as u,
  dt as d,
  f,
  h as p,
  k as m,
  nt as h,
  st as g,
} from "../chunks/BZ84wCgC.js";
import "../chunks/xihTtKlq.js";
import { a as _, d as v, i as y, l as b, o as x, r as S } from "../chunks/CdnViQ5q.js";
import { t as ee } from "../chunks/BqeBlQOp.js";
import { t as C } from "../chunks/Dt5KBvTb.js";
import { n as te, t as ne } from "../chunks/BE_OFooT.js";
import { t as re } from "../chunks/CAwE-eJr.js";
import { t as w } from "../chunks/Is8ZIs2f.js";
var ie = m(`<p class="empty-hint svelte-1uha8ag">No categories yet.</p>`),
  ae = m(
    `<a class="cat-tile svelte-1uha8ag"><span class="cat-name svelte-1uha8ag"> </span> <span class="cat-count svelte-1uha8ag"> </span></a>`,
  ),
  oe = m(`<div class="cat-grid svelte-1uha8ag"></div>`),
  se = m(`<p class="empty-hint svelte-1uha8ag">No learnings found.</p>`),
  T = m(`<p class="empty-hint svelte-1uha8ag">No videos found.</p>`),
  E = m(`<p class="empty-hint svelte-1uha8ag">No creators yet.</p>`),
  D = m(`<div class="creator-chip svelte-1uha8ag"><!> <span class="creator-count svelte-1uha8ag"> </span></div>`),
  O = m(`<div class="creators-row svelte-1uha8ag"></div>`),
  k = m(`<p class="empty-hint svelte-1uha8ag">No tags yet.</p>`),
  A = m(`<div class="tags-wrap svelte-1uha8ag"></div>`),
  j = m(`<p class="empty-hint svelte-1uha8ag">No tools indexed yet.</p>`),
  ce = m(`<a class="tool-name svelte-1uha8ag" target="_blank" rel="noopener noreferrer"> </a>`),
  le = m(`<span class="tool-name tool-name--plain svelte-1uha8ag"> </span>`),
  ue = m(
    `<div class="tool-row svelte-1uha8ag"><div class="tool-main svelte-1uha8ag"><!> <span class="tool-type svelte-1uha8ag"> </span></div> <div class="tool-meta svelte-1uha8ag"><!> <a class="tool-source svelte-1uha8ag"> </a></div></div>`,
  ),
  de = m(`<div class="tools-table svelte-1uha8ag"></div>`),
  fe = m(
    `<section class="hero svelte-1uha8ag"><h1 class="hero-title svelte-1uha8ag">Dopamine</h1> <p class="hero-sub svelte-1uha8ag">Discover curated AI & tech content, verified tools, and creator insights.</p> <div class="search-wrap svelte-1uha8ag"><!></div></section> <section class="section svelte-1uha8ag"><div class="section-header svelte-1uha8ag"><h2 class="section-title svelte-1uha8ag">Browse by Category</h2></div> <!></section> <section class="section svelte-1uha8ag"><div class="section-header svelte-1uha8ag"><h2 class="section-title svelte-1uha8ag">Top learnings</h2> <a class="see-all svelte-1uha8ag" href="/videos">See all videos →</a></div> <!></section> <section class="section svelte-1uha8ag"><div class="section-header svelte-1uha8ag"><h2 class="section-title svelte-1uha8ag">Recently added</h2> <a class="see-all svelte-1uha8ag" href="/videos?sort=date-desc">See all videos →</a></div> <!></section> <section class="section svelte-1uha8ag"><div class="section-header svelte-1uha8ag"><h2 class="section-title svelte-1uha8ag">Top Creators</h2> <a class="see-all svelte-1uha8ag" href="/creators">See all →</a></div> <!></section> <section class="section svelte-1uha8ag"><div class="section-header svelte-1uha8ag"><h2 class="section-title svelte-1uha8ag">Trending Tags</h2></div> <!></section> <section class="section svelte-1uha8ag"><div class="section-header svelte-1uha8ag"><h2 class="section-title svelte-1uha8ag">Verified Tools</h2> <a class="see-all svelte-1uha8ag" href="/tools">See all tools →</a></div> <!></section>`,
    1,
  );
function M(m, M) {
  u(M, !0),
    o(() => {
      b(), v();
    });
  let N = h(x),
    P = h(S),
    F = h(_),
    I = h(y),
    L = { featured: 0, standard: 1, thin: 2 },
    R = h(() =>
      [...i(F)]
        .filter((e) => e.tier !== `thin`)
        .sort(
          (e, t) => L[e.tier] - L[t.tier] || t.quality - e.quality || (t.date > e.date ? 1 : t.date < e.date ? -1 : 0),
        )
        .slice(0, 12),
    ),
    z = h(() => [...i(F)].sort((e, t) => (t.date > e.date ? 1 : t.date < e.date ? -1 : 0)).slice(0, 12)),
    B = h(() => (i(P)?.creators ?? []).slice(0, 10)),
    V = h(() => (i(P)?.tags ?? []).slice(0, 20)),
    H = h(() =>
      [...i(I)]
        .sort((e, t) => {
          let n = (e) => (e === `verified_useful` ? 0 : e === `partially_verified` ? 1 : 2);
          return n(e.verification) - n(t.verification);
        })
        .slice(0, 6),
    ),
    U = h(() => i(P)?.categories ?? []);
  var W = fe(),
    G = s(W),
    K = l(c(G), 4);
  ee(c(K), { placeholder: `Search videos, tools, creators…` }), d(K), d(G);
  var q = l(G, 2),
    pe = l(c(q), 2),
    me = (e) => {
      C(e, {});
    },
    he = (e) => {
      t(e, ie());
    },
    ge = (a) => {
      var o = oe();
      e(
        o,
        21,
        () => i(U),
        (e) => e.name,
        (e, a) => {
          var o = ae(),
            s = c(o),
            u = c(s, !0);
          d(s);
          var m = l(s, 2),
            h = c(m);
          d(m),
            d(o),
            r(
              (e) => {
                f(o, `href`, e),
                  p(o, `color:${i(a).color ?? ``};background:${i(a).bg ?? ``}`),
                  n(u, i(a).name),
                  n(h, `${i(a).count ?? ``} video${i(a).count === 1 ? `` : `s`}`);
              },
              [() => `/category/` + encodeURIComponent(i(a).name)],
            ),
            t(e, o);
        },
      ),
        d(o),
        t(a, o);
    };
  a(pe, (e) => {
    i(P) === null ? e(me) : i(U).length === 0 ? e(he, 1) : e(ge, -1);
  }),
    d(q);
  var J = l(q, 2),
    _e = l(c(J), 2),
    ve = (e) => {
      C(e, {});
    },
    ye = (e) => {
      t(e, se());
    },
    be = (e) => {
      w(e, {
        get items() {
          return i(R);
        },
        emptyMessage: `No learnings yet.`,
      });
    };
  a(_e, (e) => {
    i(N) ? (i(R).length === 0 ? e(ye, 1) : e(be, -1)) : e(ve);
  }),
    d(J);
  var Y = l(J, 2),
    xe = l(c(Y), 2),
    Se = (e) => {
      C(e, {});
    },
    Ce = (e) => {
      t(e, T());
    },
    we = (e) => {
      w(e, {
        get items() {
          return i(z);
        },
        emptyMessage: `No recent videos.`,
      });
    };
  a(xe, (e) => {
    i(N) ? (i(z).length === 0 ? e(Ce, 1) : e(we, -1)) : e(Se);
  }),
    d(Y);
  var X = l(Y, 2),
    Te = l(c(X), 2),
    Ee = (e) => {
      C(e, { size: 20 });
    },
    Z = (e) => {
      t(e, E());
    },
    De = (a) => {
      var o = O();
      e(
        o,
        21,
        () => i(B),
        (e) => e.name,
        (e, a) => {
          var o = D(),
            s = c(o);
          ne(s, {
            get name() {
              return i(a).name;
            },
            get fullName() {
              return i(a).fullName;
            },
          });
          var u = l(s, 2),
            f = c(u, !0);
          d(u), d(o), r(() => n(f, i(a).count)), t(e, o);
        },
      ),
        d(o),
        t(a, o);
    };
  a(Te, (e) => {
    i(P) === null ? e(Ee) : i(B).length === 0 ? e(Z, 1) : e(De, -1);
  }),
    d(X);
  var Q = l(X, 2),
    Oe = l(c(Q), 2),
    ke = (e) => {
      C(e, { size: 20 });
    },
    Ae = (e) => {
      t(e, k());
    },
    je = (n) => {
      var r = A();
      e(
        r,
        21,
        () => i(V),
        (e) => e.name,
        (e, t) => {
          te(e, {
            get tag() {
              return i(t).name;
            },
          });
        },
      ),
        d(r),
        t(n, r);
    };
  a(Oe, (e) => {
    i(P) === null ? e(ke) : i(V).length === 0 ? e(Ae, 1) : e(je, -1);
  }),
    d(Q);
  var $ = l(Q, 2),
    Me = l(c($), 2),
    Ne = (e) => {
      C(e, { size: 20 });
    },
    Pe = (e) => {
      t(e, j());
    },
    Fe = (o) => {
      var s = de();
      e(
        s,
        21,
        () => i(H),
        (e) => e.name + e.videoId,
        (e, o) => {
          var s = ue(),
            u = c(s),
            p = c(u),
            m = (e) => {
              var a = ce(),
                s = c(a, !0);
              d(a),
                r(() => {
                  f(a, `href`, i(o).url), n(s, i(o).name);
                }),
                t(e, a);
            },
            h = (e) => {
              var a = le(),
                s = c(a, !0);
              d(a), r(() => n(s, i(o).name)), t(e, a);
            };
          a(p, (e) => {
            i(o).url ? e(m) : e(h, -1);
          });
          var g = l(p, 2),
            _ = c(g, !0);
          d(g), d(u);
          var v = l(u, 2),
            y = c(v);
          re(y, {
            get score() {
              return i(o).verification;
            },
            size: `badge`,
          });
          var b = l(y, 2),
            x = c(b, !0);
          d(b),
            d(v),
            d(s),
            r(
              (e, t) => {
                n(_, i(o).type), f(b, `href`, e), n(x, t);
              },
              [
                () => `/video/` + encodeURIComponent(i(o).videoId),
                () => (i(o).videoTitle.length > 48 ? i(o).videoTitle.slice(0, 48) + `…` : i(o).videoTitle),
              ],
            ),
            t(e, s);
        },
      ),
        d(s),
        t(o, s);
    };
  a(Me, (e) => {
    i(I).length === 0 && i(P) !== null ? e(Ne) : i(H).length === 0 ? e(Pe, 1) : e(Fe, -1);
  }),
    d($),
    t(m, W),
    g();
}
export { M as component };
