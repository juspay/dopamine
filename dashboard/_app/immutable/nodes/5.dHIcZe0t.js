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
  W as l,
  X as u,
  Z as d,
  _ as f,
  d as p,
  it as m,
  q as h,
  rt as g,
  st as _,
  w as v,
  x as y,
  z as b,
} from "../chunks/KQ3eEBfb.js";
import "../chunks/xihTtKlq.js";
import { l as x, r as S } from "../chunks/5wXqoPKv.js";
import { c as C, m as w, t as T } from "../chunks/BcfutCr0.js";
import { t as E } from "../chunks/Bi4ZSEfO.js";
import { t as D } from "../chunks/Bd4orgHw.js";
var O = n(`<span class="count svelte-3fpyji"> </span>`),
  k = n(`<span class="full svelte-3fpyji"> </span>`),
  A = n(
    `<a class="creator-card svelte-3fpyji"><!> <span class="info svelte-3fpyji"><span class="name svelte-3fpyji"> </span> <!></span> <span class="count-badge svelte-3fpyji"> </span></a>`,
  ),
  j = n(`<div class="grid svelte-3fpyji"></div>`),
  M = n(
    `<!> <header class="head svelte-3fpyji"><h1 class="title svelte-3fpyji">Creators</h1> <!></header> <div class="search svelte-3fpyji"><!></div> <!>`,
    1,
  );
function N(n, N) {
  m(N, !0),
    c(() => {
      x();
    });
  let P = o(S),
    F = o(() => a(P)?.creators ?? []),
    I = d(``),
    L = o(() =>
      a(I).trim()
        ? a(F).filter(
            (e) =>
              e.name.toLowerCase().includes(a(I).toLowerCase()) ||
              (e.fullName ?? ``).toLowerCase().includes(a(I).toLowerCase()),
          )
        : a(F),
    );
  var R = M();
  f(`3fpyji`, (e) => {
    b(() => {
      l.title = `Creators — Dopamine`;
    });
  });
  var z = h(R);
  D(z, { items: [{ label: `Home`, href: `/` }, { label: `Creators` }] });
  var B = r(z, 2),
    V = r(i(B), 2),
    H = (t) => {
      var n = O(),
        r = i(n, !0);
      _(n), e(() => v(r, a(F).length)), s(t, n);
    };
  t(V, (e) => {
    a(P) && e(H);
  }),
    _(B);
  var U = r(B, 2);
  w(i(U), {
    get value() {
      return a(I);
    },
    placeholder: `Search creators…`,
    addFocusColor: !0,
    autoComplete: `off`,
    onInput: (e) => {
      u(I, e, !0);
    },
    classes: `creators-search-input`,
  }),
    _(U);
  var W = r(U, 2),
    G = (e) => {
      T(e, {});
    },
    K = (e) => {
      {
        let t = o(() => (a(I) ? `No creators match “${a(I)}”.` : `No creators yet.`));
        E(e, {
          get message() {
            return a(t);
          },
        });
      }
    },
    q = (n) => {
      var o = j();
      y(
        o,
        21,
        () => a(L),
        (e) => e.name,
        (n, o) => {
          var c = A(),
            l = i(c);
          C(l, {
            get name() {
              return a(o).name;
            },
            get alt() {
              return a(o).name;
            },
            size: `medium`,
          });
          var u = r(l, 2),
            d = i(u),
            f = i(d);
          _(d);
          var m = r(d, 2),
            h = (t) => {
              var n = k(),
                r = i(n, !0);
              _(n), e(() => v(r, a(o).fullName)), s(t, n);
            };
          t(m, (e) => {
            a(o).fullName && e(h);
          }),
            _(u);
          var g = r(u, 2),
            y = i(g, !0);
          _(g),
            _(c),
            e(
              (e) => {
                p(c, `href`, e), v(f, `@${a(o).name ?? ``}`), v(y, a(o).count);
              },
              [() => `/creator/` + encodeURIComponent(a(o).name)],
            ),
            s(n, c);
        },
      ),
        _(o),
        s(n, o);
    };
  t(W, (e) => {
    a(P) === null ? e(G) : a(L).length === 0 ? e(K, 1) : e(q, -1);
  }),
    s(n, R),
    g();
}
export { N as component };
