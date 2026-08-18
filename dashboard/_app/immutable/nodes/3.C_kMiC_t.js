import {
  $ as e,
  C as t,
  D as n,
  E as r,
  H as i,
  I as a,
  M as o,
  N as s,
  T as c,
  U as l,
  Y as u,
  Z as d,
  ct as f,
  dt as p,
  et as m,
  f as h,
  g,
  h as _,
  it as v,
  k as y,
  nt as b,
  rt as x,
  st as S,
} from "../chunks/BZ84wCgC.js";
import "../chunks/xihTtKlq.js";
import { a as C, o as w } from "../chunks/CdnViQ5q.js";
import { t as T } from "../chunks/BoAKB7FT.js";
import { i as E, r as D } from "../chunks/CnvqUUT7.js";
import { t as O } from "../chunks/Dt5KBvTb.js";
import { t as k } from "../chunks/BOZ4LI1h.js";
import { t as A } from "../chunks/CyjB8bAN.js";
var ee = y(`<span class="cat-count svelte-jw8jye"> </span>`),
  j = y(`<button> <span class="subcat-count svelte-jw8jye"> </span></button>`),
  M = y(
    `<div class="subcat-row svelte-jw8jye" role="group" aria-label="Filter by subcategory"><button>All</button> <!></div>`,
  ),
  N = y(
    `<div class="page svelte-jw8jye"><!> <header class="cat-header svelte-jw8jye"><div class="cat-badge svelte-jw8jye"><span class="cat-name svelte-jw8jye"> </span> <!></div></header> <!> <!></div>`,
  );
function P(o, y) {
  f(y, !0);
  let P = () => v(T, `$page`, F),
    [F, I] = x(),
    L = b(() => decodeURIComponent(P().params.cat ?? ``)),
    R = b(() => C().filter((e) => e.category === a(L))),
    z = b(() =>
      [
        ...new Set(
          a(R)
            .map((e) => e.subcategory)
            .filter(Boolean),
        ),
      ].sort(),
    ),
    B = m(null);
  l(() => {
    a(L), e(B, null);
  });
  let V = b(() => (a(B) ? a(R).filter((e) => e.subcategory === a(B)) : a(R))),
    H = b(w),
    U = b(() => E(a(L))),
    W = b(() => D(a(L))),
    G = b(() => [{ label: `Home`, href: `/` }, { label: a(L) }]);
  function K(t) {
    e(B, a(B) === t ? null : t, !0);
  }
  var q = N(),
    J = u(q);
  A(J, {
    get items() {
      return a(G);
    },
  });
  var Y = d(J, 2),
    X = u(Y),
    Z = u(X),
    Q = u(Z, !0);
  p(Z);
  var te = d(Z, 2),
    ne = (e) => {
      var t = ee(),
        o = u(t);
      p(t), i(() => r(o, `${a(R).length ?? ``} video${a(R).length === 1 ? `` : `s`}`)), n(e, t);
    };
  c(te, (e) => {
    a(H) && e(ne);
  }),
    p(X),
    p(Y);
  var $ = d(Y, 2),
    re = (o) => {
      var c = M(),
        l = u(c);
      let f;
      t(
        d(l, 2),
        16,
        () => a(z),
        (e) => e,
        (e, t) => {
          var o = j();
          let c;
          var l = u(o),
            f = d(l),
            m = u(f, !0);
          p(f),
            p(o),
            i(
              (e) => {
                (c = g(o, 1, `subcat-chip svelte-jw8jye`, null, c, { active: a(B) === t })),
                  h(o, `aria-pressed`, a(B) === t),
                  r(l, `${t ?? ``} `),
                  r(m, e);
              },
              [() => a(R).filter((e) => e.subcategory === t).length],
            ),
            s(`click`, o, () => K(t)),
            n(e, o);
        },
      ),
        p(c),
        i(() => {
          (f = g(l, 1, `subcat-chip svelte-jw8jye`, null, f, { active: a(B) === null })),
            h(l, `aria-pressed`, a(B) === null);
        }),
        s(`click`, l, () => {
          e(B, null);
        }),
        n(o, c);
    };
  c($, (e) => {
    a(z).length > 1 && e(re);
  });
  var ie = d($, 2),
    ae = (e) => {
      O(e, { size: 40 });
    },
    oe = (e) => {
      {
        let t = b(() => (a(B) ? `No videos in "${a(B)}" for this category.` : `No videos found in "${a(L)}".`));
        k(e, {
          get items() {
            return a(V);
          },
          get emptyMessage() {
            return a(t);
          },
        });
      }
    };
  c(ie, (e) => {
    a(H) ? e(oe, -1) : e(ae);
  }),
    p(q),
    i(() => {
      _(Y, `--cat-color:${a(U) ?? ``};--cat-bg:${a(W) ?? ``}`), r(Q, a(L));
    }),
    n(o, q),
    S(),
    I();
}
o([`click`]);
export { P as component };
