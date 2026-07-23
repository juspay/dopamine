import {
  $ as e,
  A as t,
  B as n,
  C as r,
  D as i,
  J as a,
  K as o,
  P as s,
  Q as c,
  T as l,
  V as u,
  X as d,
  Z as f,
  d as p,
  et as m,
  it as h,
  j as g,
  m as _,
  p as v,
  rt as y,
  st as b,
  w as x,
  x as S,
} from "../chunks/KQ3eEBfb.js";
import "../chunks/xihTtKlq.js";
import { a as C, o as w } from "../chunks/5wXqoPKv.js";
import { t as T } from "../chunks/DukFlL_f.js";
import { i as E, r as D } from "../chunks/WltnivmA.js";
import { t as O } from "../chunks/BcfutCr0.js";
import { t as ee } from "../chunks/WJjxiR19.js";
import { t as k } from "../chunks/Bd4orgHw.js";
var A = i(`<span class="cat-count svelte-jw8jye"> </span>`),
  j = i(`<button> <span class="subcat-count svelte-jw8jye"> </span></button>`),
  M = i(
    `<div class="subcat-row svelte-jw8jye" role="group" aria-label="Filter by subcategory"><button>All</button> <!></div>`,
  ),
  N = i(
    `<div class="page svelte-jw8jye"><!> <header class="cat-header svelte-jw8jye"><div class="cat-badge svelte-jw8jye"><span class="cat-name svelte-jw8jye"> </span> <!></div></header> <!> <!></div>`,
  );
function P(t, i) {
  h(i, !0);
  let P = () => m(T, `$page`, F),
    [F, I] = e(),
    L = c(() => decodeURIComponent(P().params.cat ?? ``)),
    R = c(() => C().filter((e) => e.category === s(L))),
    z = c(() =>
      [
        ...new Set(
          s(R)
            .map((e) => e.subcategory)
            .filter(Boolean),
        ),
      ].sort(),
    ),
    B = f(null);
  u(() => {
    s(L), d(B, null);
  });
  let V = c(() => (s(B) ? s(R).filter((e) => e.subcategory === s(B)) : s(R))),
    H = c(w),
    U = c(() => E(s(L))),
    W = c(() => D(s(L))),
    G = c(() => [{ label: `Home`, href: `/` }, { label: s(L) }]);
  function K(e) {
    d(B, s(B) === e ? null : e, !0);
  }
  var q = N(),
    J = o(q);
  k(J, {
    get items() {
      return s(G);
    },
  });
  var Y = a(J, 2),
    X = o(Y),
    Z = o(X),
    Q = o(Z, !0);
  b(Z);
  var te = a(Z, 2),
    ne = (e) => {
      var t = A(),
        r = o(t);
      b(t), n(() => x(r, `${s(R).length ?? ``} video${s(R).length === 1 ? `` : `s`}`)), l(e, t);
    };
  r(te, (e) => {
    s(H) && e(ne);
  }),
    b(X),
    b(Y);
  var $ = a(Y, 2),
    re = (e) => {
      var t = M(),
        r = o(t);
      let i;
      S(
        a(r, 2),
        16,
        () => s(z),
        (e) => e,
        (e, t) => {
          var r = j();
          let i;
          var c = o(r),
            u = a(c),
            d = o(u, !0);
          b(u),
            b(r),
            n(
              (e) => {
                (i = _(r, 1, `subcat-chip svelte-jw8jye`, null, i, { active: s(B) === t })),
                  p(r, `aria-pressed`, s(B) === t),
                  x(c, `${t ?? ``} `),
                  x(d, e);
              },
              [() => s(R).filter((e) => e.subcategory === t).length],
            ),
            g(`click`, r, () => K(t)),
            l(e, r);
        },
      ),
        b(t),
        n(() => {
          (i = _(r, 1, `subcat-chip svelte-jw8jye`, null, i, { active: s(B) === null })),
            p(r, `aria-pressed`, s(B) === null);
        }),
        g(`click`, r, () => {
          d(B, null);
        }),
        l(e, t);
    };
  r($, (e) => {
    s(z).length > 1 && e(re);
  });
  var ie = a($, 2),
    ae = (e) => {
      O(e, { size: 40 });
    },
    oe = (e) => {
      {
        let t = c(() => (s(B) ? `No videos in "${s(B)}" for this category.` : `No videos found in "${s(L)}".`));
        ee(e, {
          get items() {
            return s(V);
          },
          get emptyMessage() {
            return s(t);
          },
        });
      }
    };
  r(ie, (e) => {
    s(H) ? e(oe, -1) : e(ae);
  }),
    b(q),
    n(() => {
      v(Y, `--cat-color:${s(U) ?? ``};--cat-bg:${s(W) ?? ``}`), x(Q, s(L));
    }),
    l(t, q),
    y(),
    I();
}
t([`click`]);
export { P as component };
