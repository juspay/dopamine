import {
  B as e,
  C as t,
  D as n,
  E as r,
  H as i,
  I as a,
  T as o,
  U as s,
  X as c,
  Y as l,
  Z as u,
  ct as d,
  dt as f,
  f as p,
  it as m,
  k as h,
  nt as g,
  q as _,
  rt as v,
  st as y,
  w as b,
  y as x,
} from "../chunks/BZ84wCgC.js";
import "../chunks/xihTtKlq.js";
import { a as S, n as C, o as w, s as T, t as E } from "../chunks/CdnViQ5q.js";
import { t as D } from "../chunks/BoAKB7FT.js";
import { t as O } from "../chunks/Dt5KBvTb.js";
import { t as k } from "../chunks/BOZ4LI1h.js";
import { t as A } from "../chunks/CyjB8bAN.js";
var ee = (e) => e.exploratory ?? e.basedOn.length < 2,
  te = h(`<p class="count svelte-1l0ru94"> <a class="review-link svelte-1l0ru94">Review these →</a></p>`),
  ne = h(`<span class="exploratory-badge svelte-1l0ru94">Exploratory — one learning</span>`),
  re = h(`<span class="hunch-tag svelte-1l0ru94">hunch</span>`),
  ie = h(`<a class="based-link svelte-1l0ru94"> </a> `, 1),
  ae = h(`<p class="based-on svelte-1l0ru94">Based on: <!></p>`),
  j = h(
    `<li class="action svelte-1l0ru94"><p class="action-head svelte-1l0ru94"> <!></p> <p class="action-detail svelte-1l0ru94"> </p> <!></li>`,
  ),
  M = h(
    `<section class="actions svelte-1l0ru94"><div class="actions-head svelte-1l0ru94"><h2 class="actions-title svelte-1l0ru94">Actions to try</h2> <!></div> <ol class="action-list svelte-1l0ru94"></ol></section>`,
  ),
  N = h(`<h2 class="learnings-title svelte-1l0ru94">Learnings</h2> <!>`, 1),
  P = h(
    `<div class="project-page svelte-1l0ru94"><!> <header class="page-header svelte-1l0ru94"><h1 class="project-heading svelte-1l0ru94"><span class="arrow svelte-1l0ru94" aria-hidden="true">→</span> </h1> <!></header> <!> <!></div>`,
  );
function F(h, F) {
  d(F, !0);
  let I = () => m(D, `$page`, L),
    [L, R] = v(),
    z = g(() => decodeURIComponent(I().params.name ?? ``));
  s(() => {
    T();
  });
  let B = g(S),
    V = g(w),
    H = g(() => a(B).filter((e) => (e.appliesTo ?? []).some((e) => e.toLowerCase() === a(z).toLowerCase()))),
    U = g(() => Object.entries(E()).find(([e]) => e.toLowerCase() === a(z).toLowerCase())?.[1] ?? null),
    W = g(() => (a(U) ? (a(U).sourceCount ?? new Set(a(U).actions.flatMap((e) => e.basedOn)).size) : 0)),
    G = g(() => a(W) <= 1),
    K = g(() => (e) => C(e)?.title ?? e),
    q = g(() => [{ label: `Home`, href: `/` }, { label: `→ ${a(z)}` }]);
  var J = P();
  x(`1l0ru94`, (t) => {
    e(() => {
      _.title = `${a(z) ?? ``} — Dopamine`;
    });
  });
  var Y = l(J);
  A(Y, {
    get items() {
      return a(q);
    },
  });
  var X = u(Y, 2),
    Z = l(X),
    oe = u(l(Z));
  f(Z);
  var se = u(Z, 2),
    ce = (e) => {
      var t = te(),
        o = l(t),
        s = u(o);
      f(t),
        i(
          (e) => {
            r(o, `${a(H).length ?? ``} ${a(H).length === 1 ? `learning` : `learnings`} `), p(s, `href`, e);
          },
          [() => `/review?project=` + encodeURIComponent(a(z))],
        ),
        n(e, t);
    };
  o(se, (e) => {
    a(V) && e(ce);
  }),
    f(X);
  var Q = u(X, 2),
    le = (e) => {
      var s = M(),
        d = l(s),
        m = u(l(d), 2),
        h = (e) => {
          n(e, ne());
        };
      o(m, (e) => {
        a(G) && e(h);
      }),
        f(d);
      var _ = u(d, 2);
      t(
        _,
        21,
        () => a(U).actions,
        b,
        (e, s) => {
          var d = j(),
            m = l(d),
            h = l(m),
            _ = u(h),
            v = (e) => {
              n(e, re());
            },
            y = g(() => !a(G) && ee(a(s)));
          o(_, (e) => {
            a(y) && e(v);
          }),
            f(m);
          var x = u(m, 2),
            S = l(x, !0);
          f(x);
          var C = u(x, 2),
            w = (e) => {
              var o = ae();
              t(
                u(l(o)),
                17,
                () => a(s).basedOn,
                b,
                (e, t, o) => {
                  var d = ie(),
                    m = c(d),
                    h = l(m, !0);
                  f(m);
                  var g = u(m, 1, !0);
                  i(
                    (e, t) => {
                      p(m, `href`, e), r(h, t), r(g, o < a(s).basedOn.length - 1 ? `, ` : ``);
                    },
                    [() => `/video/` + encodeURIComponent(a(t)), () => a(K)(a(t))],
                  ),
                    n(e, d);
                },
              ),
                f(o),
                n(e, o);
            };
          o(C, (e) => {
            a(s).basedOn.length && e(w);
          }),
            f(d),
            i(() => {
              r(h, `${a(s).title ?? ``} `), r(S, a(s).detail);
            }),
            n(e, d);
        },
      ),
        f(_),
        f(s),
        n(e, s);
    };
  o(Q, (e) => {
    a(V) && a(U) && a(U).actions.length && e(le);
  });
  var $ = u(Q, 2),
    ue = (e) => {
      O(e, {});
    },
    de = (e) => {
      var t = N(),
        r = u(c(t), 2);
      {
        let e = g(() => `No learnings mapped to ${a(z)}.`);
        k(r, {
          get items() {
            return a(H);
          },
          get emptyMessage() {
            return a(e);
          },
        });
      }
      n(e, t);
    };
  o($, (e) => {
    a(V) ? e(de, -1) : e(ue);
  }),
    f(J),
    i(() => r(oe, ` ${a(z) ?? ``}`)),
    n(h, J),
    y(),
    R();
}
export { F as component };
