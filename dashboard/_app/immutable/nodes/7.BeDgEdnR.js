import {
  $ as e,
  B as t,
  C as n,
  D as r,
  J as i,
  K as a,
  P as o,
  Q as s,
  R as c,
  S as l,
  T as u,
  V as d,
  W as f,
  _ as p,
  d as m,
  et as h,
  it as g,
  q as _,
  rt as v,
  st as y,
  w as b,
  x,
} from "../chunks/KQ3eEBfb.js";
import "../chunks/xihTtKlq.js";
import { a as S, n as C, o as w, s as T, t as E } from "../chunks/5wXqoPKv.js";
import { t as D } from "../chunks/DukFlL_f.js";
import { t as O } from "../chunks/BcfutCr0.js";
import { t as k } from "../chunks/WJjxiR19.js";
import { t as A } from "../chunks/Bd4orgHw.js";
var ee = r(`<p class="count svelte-1l0ru94"> </p>`),
  j = r(`<a class="based-link svelte-1l0ru94"> </a> `, 1),
  M = r(`<p class="based-on svelte-1l0ru94">Based on: <!></p>`),
  N = r(
    `<li class="action svelte-1l0ru94"><p class="action-head svelte-1l0ru94"> </p> <p class="action-detail svelte-1l0ru94"> </p> <!></li>`,
  ),
  P = r(
    `<section class="actions svelte-1l0ru94"><h2 class="actions-title svelte-1l0ru94">Actions to try</h2> <ol class="action-list svelte-1l0ru94"></ol></section>`,
  ),
  F = r(`<h2 class="learnings-title svelte-1l0ru94">Learnings</h2> <!>`, 1),
  I = r(
    `<div class="project-page svelte-1l0ru94"><!> <header class="page-header svelte-1l0ru94"><h1 class="project-heading svelte-1l0ru94"><span class="arrow svelte-1l0ru94" aria-hidden="true">→</span> </h1> <!></header> <!> <!></div>`,
  );
function L(r, L) {
  g(L, !0);
  let R = () => h(D, `$page`, z),
    [z, B] = e(),
    V = s(() => decodeURIComponent(R().params.name ?? ``));
  d(() => {
    T();
  });
  let H = s(S),
    U = s(w),
    W = s(() => o(H).filter((e) => (e.appliesTo ?? []).some((e) => e.toLowerCase() === o(V).toLowerCase()))),
    G = s(() => Object.entries(E()).find(([e]) => e.toLowerCase() === o(V).toLowerCase())?.[1] ?? null),
    K = s(() => (e) => C(e)?.title ?? e),
    q = s(() => [{ label: `Home`, href: `/` }, { label: `→ ${o(V)}` }]);
  var J = I();
  p(`1l0ru94`, (e) => {
    c(() => {
      f.title = `${o(V) ?? ``} — Dopamine`;
    });
  });
  var Y = a(J);
  A(Y, {
    get items() {
      return o(q);
    },
  });
  var X = i(Y, 2),
    Z = a(X),
    Q = i(a(Z));
  y(Z);
  var te = i(Z, 2),
    ne = (e) => {
      var n = ee(),
        r = a(n);
      y(n), t(() => b(r, `${o(W).length ?? ``} ${o(W).length === 1 ? `learning` : `learnings`}`)), u(e, n);
    };
  n(te, (e) => {
    o(U) && e(ne);
  }),
    y(X);
  var $ = i(X, 2),
    re = (e) => {
      var r = P(),
        s = i(a(r), 2);
      x(
        s,
        21,
        () => o(G).actions,
        l,
        (e, r) => {
          var s = N(),
            c = a(s),
            d = a(c, !0);
          y(c);
          var f = i(c, 2),
            p = a(f, !0);
          y(f);
          var h = i(f, 2),
            g = (e) => {
              var n = M();
              x(
                i(a(n)),
                17,
                () => o(r).basedOn,
                l,
                (e, n, s) => {
                  var c = j(),
                    l = _(c),
                    d = a(l, !0);
                  y(l);
                  var f = i(l, 1, !0);
                  t(
                    (e, t) => {
                      m(l, `href`, e), b(d, t), b(f, s < o(r).basedOn.length - 1 ? `, ` : ``);
                    },
                    [() => `/video/` + encodeURIComponent(o(n)), () => o(K)(o(n))],
                  ),
                    u(e, c);
                },
              ),
                y(n),
                u(e, n);
            };
          n(h, (e) => {
            o(r).basedOn.length && e(g);
          }),
            y(s),
            t(() => {
              b(d, o(r).title), b(p, o(r).detail);
            }),
            u(e, s);
        },
      ),
        y(s),
        y(r),
        u(e, r);
    };
  n($, (e) => {
    o(U) && o(G) && o(G).actions.length && e(re);
  });
  var ie = i($, 2),
    ae = (e) => {
      O(e, {});
    },
    oe = (e) => {
      var t = F(),
        n = i(_(t), 2);
      {
        let e = s(() => `No learnings mapped to ${o(V)}.`);
        k(n, {
          get items() {
            return o(W);
          },
          get emptyMessage() {
            return o(e);
          },
        });
      }
      u(e, t);
    };
  n(ie, (e) => {
    o(U) ? e(oe, -1) : e(ae);
  }),
    y(J),
    t(() => b(Q, ` ${o(V) ?? ``}`)),
    u(r, J),
    v(),
    B();
}
export { L as component };
