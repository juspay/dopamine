import {
  $ as e,
  C as t,
  D as n,
  E as r,
  H as i,
  I as a,
  T as o,
  U as s,
  V as c,
  X as l,
  Y as u,
  Z as d,
  ct as f,
  dt as p,
  et as m,
  f as h,
  k as g,
  nt as _,
  q as v,
  st as y,
  y as b,
} from "../chunks/BZ84wCgC.js";
import "../chunks/xihTtKlq.js";
import { l as x, r as S } from "../chunks/CdnViQ5q.js";
import { c as C, m as w, t as T } from "../chunks/Dt5KBvTb.js";
import { t as E } from "../chunks/BbG86UsG.js";
import { t as D } from "../chunks/CyjB8bAN.js";
var O = g(`<span class="count svelte-3fpyji"> </span>`),
  k = g(`<span class="full svelte-3fpyji"> </span>`),
  A = g(
    `<a class="creator-card svelte-3fpyji"><!> <span class="info svelte-3fpyji"><span class="name svelte-3fpyji"> </span> <!></span> <span class="count-badge svelte-3fpyji"> </span></a>`,
  ),
  j = g(`<div class="grid svelte-3fpyji"></div>`),
  M = g(
    `<!> <header class="head svelte-3fpyji"><h1 class="title svelte-3fpyji">Creators</h1> <!></header> <div class="search svelte-3fpyji"><!></div> <!>`,
    1,
  );
function N(g, N) {
  f(N, !0),
    s(() => {
      x();
    });
  let P = _(S),
    F = _(() => a(P)?.creators ?? []),
    I = m(``),
    L = _(() =>
      a(I).trim()
        ? a(F).filter(
            (e) =>
              e.name.toLowerCase().includes(a(I).toLowerCase()) ||
              (e.fullName ?? ``).toLowerCase().includes(a(I).toLowerCase()),
          )
        : a(F),
    );
  var R = M();
  b(`3fpyji`, (e) => {
    c(() => {
      v.title = `Creators — Dopamine`;
    });
  });
  var z = l(R);
  D(z, { items: [{ label: `Home`, href: `/` }, { label: `Creators` }] });
  var B = d(z, 2),
    V = d(u(B), 2),
    H = (e) => {
      var t = O(),
        o = u(t, !0);
      p(t), i(() => r(o, a(F).length)), n(e, t);
    };
  o(V, (e) => {
    a(P) && e(H);
  }),
    p(B);
  var U = d(B, 2);
  w(u(U), {
    get value() {
      return a(I);
    },
    placeholder: `Search creators…`,
    addFocusColor: !0,
    autoComplete: `off`,
    onInput: (t) => {
      e(I, t, !0);
    },
    classes: `creators-search-input`,
  }),
    p(U);
  var W = d(U, 2),
    G = (e) => {
      T(e, {});
    },
    K = (e) => {
      {
        let t = _(() => (a(I) ? `No creators match “${a(I)}”.` : `No creators yet.`));
        E(e, {
          get message() {
            return a(t);
          },
        });
      }
    },
    q = (e) => {
      var s = j();
      t(
        s,
        21,
        () => a(L),
        (e) => e.name,
        (e, t) => {
          var s = A(),
            c = u(s);
          C(c, {
            get name() {
              return a(t).name;
            },
            get alt() {
              return a(t).name;
            },
            size: `medium`,
          });
          var l = d(c, 2),
            f = u(l),
            m = u(f);
          p(f);
          var g = d(f, 2),
            _ = (e) => {
              var o = k(),
                s = u(o, !0);
              p(o), i(() => r(s, a(t).fullName)), n(e, o);
            };
          o(g, (e) => {
            a(t).fullName && e(_);
          }),
            p(l);
          var v = d(l, 2),
            y = u(v, !0);
          p(v),
            p(s),
            i(
              (e) => {
                h(s, `href`, e), r(m, `@${a(t).name ?? ``}`), r(y, a(t).count);
              },
              [() => `/creator/` + encodeURIComponent(a(t).name)],
            ),
            n(e, s);
        },
      ),
        p(s),
        n(e, s);
    };
  o(W, (e) => {
    a(P) === null ? e(G) : a(L).length === 0 ? e(K, 1) : e(q, -1);
  }),
    n(g, R),
    y();
}
export { N as component };
