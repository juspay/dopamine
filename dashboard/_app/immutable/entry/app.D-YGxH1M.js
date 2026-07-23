const __vite__mapDeps = (
  i,
  m = __vite__mapDeps,
  d = m.f ||
    (m.f = [
      "../nodes/0.C5E3p_Pu.js",
      "../chunks/KQ3eEBfb.js",
      "../chunks/xihTtKlq.js",
      "../chunks/5wXqoPKv.js",
      "../chunks/DukFlL_f.js",
      "../chunks/BHIZHYj4.js",
      "../chunks/C9NVFsZM.js",
      "../chunks/Cd4YZbZJ.js",
      "../assets/SearchBox.Chx-WfoP.css",
      "../assets/0.Cz3mIEj4.css",
      "../nodes/1.BbkUbOMI.js",
      "../nodes/2.CxgQyFRY.js",
      "../chunks/BcfutCr0.js",
      "../assets/Spinner.5Eo0uK9j.css",
      "../chunks/8hiyGRUO.js",
      "../chunks/WltnivmA.js",
      "../assets/CategoryChip.BcgSIRFs.css",
      "../assets/CreatorLink.DRO1_89J.css",
      "../chunks/BF0F8NE4.js",
      "../assets/VerificationBadge.7gnp0T7e.css",
      "../chunks/WJjxiR19.js",
      "../chunks/Bi4ZSEfO.js",
      "../assets/EmptyState.Mb3m4kIT.css",
      "../assets/VideoGrid.DNdp7qt-.css",
      "../assets/2.CkIaSUcP.css",
      "../nodes/3.45-NZMOa.js",
      "../chunks/Bd4orgHw.js",
      "../assets/Breadcrumbs.TjqA0CPI.css",
      "../assets/3.C0gXdC77.css",
      "../nodes/4.CiI1U4BA.js",
      "../assets/4.Bb3JTwEz.css",
      "../nodes/5.dHIcZe0t.js",
      "../assets/5.W6G_nvVq.css",
      "../nodes/6.Cdxo9d-6.js",
      "../assets/6.KxcmDT-W.css",
      "../nodes/7.BeDgEdnR.js",
      "../assets/7.DxmJUvHc.css",
      "../nodes/8.DRtUrGsj.js",
      "../assets/8.Sk4UoIZ-.css",
      "../nodes/9.BefG5RLy.js",
      "../assets/9.BBkzlglJ.css",
      "../nodes/10.BQh060w_.js",
      "../assets/10.Bkqs2Ngo.css",
      "../nodes/11.B2Uct2ID.js",
      "../assets/11.rMMpauoB.css",
      "../nodes/12.Cu8xzjsr.js",
      "../assets/12.DUF3nLMZ.css",
    ]),
) => i.map((i) => d[i]);
import {
  B as e,
  C as t,
  D as n,
  E as r,
  H as i,
  I as a,
  J as o,
  K as s,
  P as c,
  Q as l,
  T as u,
  V as d,
  X as f,
  Z as p,
  i as m,
  it as h,
  k as g,
  n as _,
  o as v,
  q as y,
  r as b,
  rt as x,
  st as S,
  v as C,
  w,
} from "../chunks/KQ3eEBfb.js";
import { t as T } from "../chunks/DYl5dUZ5.js";
import "../chunks/xihTtKlq.js";
var E = {},
  D = n(
    `<div id="svelte-announcer" aria-live="assertive" aria-atomic="true" style="position: absolute; left: 0; top: 0; clip: rect(0 0 0 0); clip-path: inset(50%); overflow: hidden; white-space: nowrap; width: 1px; height: 1px"><!></div>`,
  ),
  O = n(`<!> <!>`, 1);
function k(n, b) {
  h(b, !0);
  let T = m(b, `components`, 23, () => []),
    E = m(b, `data_0`, 3, null),
    k = m(b, `data_1`, 3, null);
  i(() => b.stores.page.set(b.page)),
    d(() => {
      b.stores, b.page, b.constructors, T(), b.form, E(), k(), b.stores.page.notify();
    });
  let A = p(!1),
    j = p(!1),
    M = p(null);
  _(() => {
    let e = b.stores.page.subscribe(() => {
      c(A) &&
        (f(j, !0),
        a().then(() => {
          f(M, document.title || `untitled page`, !0);
        }));
    });
    return f(A, !0), e;
  });
  let N = l(() => b.constructors[1]);
  var P = O(),
    F = y(P),
    I = (e) => {
      let t = l(() => b.constructors[0]);
      var n = r();
      C(
        y(n),
        () => c(t),
        (e, t) => {
          v(
            t(e, {
              get data() {
                return E();
              },
              get form() {
                return b.form;
              },
              get params() {
                return b.page.params;
              },
              children: (e, t) => {
                var n = r();
                C(
                  y(n),
                  () => c(N),
                  (e, t) => {
                    v(
                      t(e, {
                        get data() {
                          return k();
                        },
                        get form() {
                          return b.form;
                        },
                        get params() {
                          return b.page.params;
                        },
                      }),
                      (e) => (T()[1] = e),
                      () => T()?.[1],
                    );
                  },
                ),
                  u(e, n);
              },
              $$slots: { default: !0 },
            }),
            (e) => (T()[0] = e),
            () => T()?.[0],
          );
        },
      ),
        u(e, n);
    },
    L = (e) => {
      let t = l(() => b.constructors[0]);
      var n = r();
      C(
        y(n),
        () => c(t),
        (e, t) => {
          v(
            t(e, {
              get data() {
                return E();
              },
              get form() {
                return b.form;
              },
              get params() {
                return b.page.params;
              },
            }),
            (e) => (T()[0] = e),
            () => T()?.[0],
          );
        },
      ),
        u(e, n);
    };
  t(F, (e) => {
    b.constructors[1] ? e(I) : e(L, -1);
  });
  var R = o(F, 2),
    z = (n) => {
      var r = D(),
        i = s(r),
        a = (t) => {
          var n = g();
          e(() => w(n, c(M))), u(t, n);
        };
      t(i, (e) => {
        c(j) && e(a);
      }),
        S(r),
        u(n, r);
    };
  t(R, (e) => {
    c(A) && e(z);
  }),
    u(n, P),
    x();
}
var A = b(k),
  j = [
    () => T(() => import(`../nodes/0.C5E3p_Pu.js`), __vite__mapDeps([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]), import.meta.url),
    () => T(() => import(`../nodes/1.BbkUbOMI.js`), __vite__mapDeps([10, 1, 5, 2]), import.meta.url),
    () =>
      T(
        () => import(`../nodes/2.CxgQyFRY.js`),
        __vite__mapDeps([11, 1, 2, 3, 6, 5, 7, 8, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]),
        import.meta.url,
      ),
    () =>
      T(
        () => import(`../nodes/3.45-NZMOa.js`),
        __vite__mapDeps([25, 1, 2, 3, 4, 5, 15, 7, 12, 13, 16, 20, 14, 17, 18, 19, 21, 22, 23, 26, 27, 28]),
        import.meta.url,
      ),
    () =>
      T(
        () => import(`../nodes/4.CiI1U4BA.js`),
        __vite__mapDeps([29, 1, 2, 3, 4, 5, 15, 7, 12, 13, 16, 20, 14, 17, 18, 19, 21, 22, 23, 26, 27, 30]),
        import.meta.url,
      ),
    () =>
      T(
        () => import(`../nodes/5.dHIcZe0t.js`),
        __vite__mapDeps([31, 1, 2, 3, 12, 13, 21, 22, 26, 27, 32]),
        import.meta.url,
      ),
    () =>
      T(
        () => import(`../nodes/6.Cdxo9d-6.js`),
        __vite__mapDeps([33, 1, 2, 3, 15, 5, 7, 12, 13, 16, 14, 17, 21, 22, 34]),
        import.meta.url,
      ),
    () =>
      T(
        () => import(`../nodes/7.BeDgEdnR.js`),
        __vite__mapDeps([35, 1, 2, 3, 4, 5, 12, 13, 20, 15, 7, 16, 14, 17, 18, 19, 21, 22, 23, 26, 27, 36]),
        import.meta.url,
      ),
    () =>
      T(
        () => import(`../nodes/8.DRtUrGsj.js`),
        __vite__mapDeps([37, 1, 5, 2, 3, 4, 7, 6, 8, 15, 12, 13, 16, 14, 17, 20, 18, 19, 21, 22, 23, 38]),
        import.meta.url,
      ),
    () =>
      T(
        () => import(`../nodes/9.BefG5RLy.js`),
        __vite__mapDeps([39, 1, 2, 3, 4, 5, 12, 13, 20, 15, 7, 16, 14, 17, 18, 19, 21, 22, 23, 26, 27, 40]),
        import.meta.url,
      ),
    () =>
      T(
        () => import(`../nodes/10.BQh060w_.js`),
        __vite__mapDeps([41, 1, 5, 2, 3, 4, 7, 15, 12, 13, 16, 26, 27, 42]),
        import.meta.url,
      ),
    () =>
      T(
        () => import(`../nodes/11.B2Uct2ID.js`),
        __vite__mapDeps([43, 1, 2, 3, 4, 5, 15, 7, 12, 13, 16, 14, 17, 18, 19, 21, 22, 26, 27, 44]),
        import.meta.url,
      ),
    () =>
      T(
        () => import(`../nodes/12.Cu8xzjsr.js`),
        __vite__mapDeps([45, 1, 5, 2, 3, 4, 7, 15, 12, 13, 16, 20, 14, 17, 18, 19, 21, 22, 23, 46]),
        import.meta.url,
      ),
  ],
  M = [],
  N = {
    "/": [2],
    "/category/[cat]": [3],
    "/creators": [5],
    "/creator/[name]": [4],
    "/kb": [6],
    "/project/[name]": [7],
    "/search": [8],
    "/tag/[tag]": [9],
    "/tools": [10],
    "/videos": [12],
    "/video/[id]": [11],
  },
  P = {
    handleError: ({ error: e }) => {
      console.error(e);
    },
    reroute: () => {},
    transport: {},
  },
  F = Object.fromEntries(Object.entries(P.transport).map(([e, t]) => [e, t.decode])),
  I = Object.fromEntries(Object.entries(P.transport).map(([e, t]) => [e, t.encode])),
  L = !1,
  R = (e, t) => F[e](t);
export {
  R as decode,
  F as decoders,
  N as dictionary,
  I as encoders,
  L as hash,
  P as hooks,
  E as matchers,
  j as nodes,
  A as root,
  M as server_loads,
};
