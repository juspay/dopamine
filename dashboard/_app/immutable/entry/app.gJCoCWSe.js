const __vite__mapDeps = (
  i,
  m = __vite__mapDeps,
  d = m.f ||
    (m.f = [
      "../nodes/0.ByS0wFGl.js",
      "../chunks/BZ84wCgC.js",
      "../chunks/xihTtKlq.js",
      "../chunks/CdnViQ5q.js",
      "../chunks/BoAKB7FT.js",
      "../chunks/CcqLSuep.js",
      "../chunks/C_jMLJ8F.js",
      "../chunks/C513ZtO5.js",
      "../assets/SearchBox.Chx-WfoP.css",
      "../assets/0.Cz3mIEj4.css",
      "../nodes/1.C0-dSvHd.js",
      "../nodes/2.CxNO-m_n.js",
      "../chunks/Dt5KBvTb.js",
      "../assets/Spinner.5Eo0uK9j.css",
      "../chunks/BlaHOqTL.js",
      "../chunks/CnvqUUT7.js",
      "../assets/CategoryChip.BcgSIRFs.css",
      "../assets/CreatorLink.DRO1_89J.css",
      "../chunks/CqZ00sEc.js",
      "../assets/VerificationBadge.7gnp0T7e.css",
      "../chunks/BOZ4LI1h.js",
      "../chunks/DHwu0OfC.js",
      "../chunks/BbG86UsG.js",
      "../assets/EmptyState.Mb3m4kIT.css",
      "../assets/VideoGrid.DNdp7qt-.css",
      "../assets/2.CkIaSUcP.css",
      "../nodes/3.C_kMiC_t.js",
      "../chunks/CyjB8bAN.js",
      "../assets/Breadcrumbs.TjqA0CPI.css",
      "../assets/3.C0gXdC77.css",
      "../nodes/4.PT4ONZ3h.js",
      "../assets/4.Bb3JTwEz.css",
      "../nodes/5.CnZuGeEx.js",
      "../assets/5.W6G_nvVq.css",
      "../nodes/6.B3B1_iv7.js",
      "../assets/6.KxcmDT-W.css",
      "../nodes/7.C3mNVrJ5.js",
      "../assets/7.DuAp6JEC.css",
      "../nodes/8.v68zwAAr.js",
      "../assets/8.DZLJ_gVJ.css",
      "../nodes/9.Biq3rPa-.js",
      "../assets/9.Sk4UoIZ-.css",
      "../nodes/10.Bm17tCNh.js",
      "../assets/10.BBkzlglJ.css",
      "../nodes/11.pbu2n7bZ.js",
      "../assets/11.Bkqs2Ngo.css",
      "../nodes/12.CMmfN55h.js",
      "../assets/12.Bs9RCSEy.css",
      "../nodes/13.0nMWDvis.js",
      "../assets/13.DhVDWXhH.css",
    ]),
) => i.map((i) => d[i]);
import {
  $ as e,
  D as t,
  E as n,
  H as r,
  I as i,
  O as a,
  R as o,
  T as s,
  U as c,
  W as l,
  X as u,
  Y as d,
  Z as f,
  b as p,
  ct as m,
  dt as h,
  et as g,
  i as _,
  j as v,
  k as y,
  n as b,
  nt as x,
  o as S,
  r as C,
  st as w,
} from "../chunks/BZ84wCgC.js";
import { t as T } from "../chunks/DYl5dUZ5.js";
import "../chunks/xihTtKlq.js";
var E = {},
  D = y(
    `<div id="svelte-announcer" aria-live="assertive" aria-atomic="true" style="position: absolute; left: 0; top: 0; clip: rect(0 0 0 0); clip-path: inset(50%); overflow: hidden; white-space: nowrap; width: 1px; height: 1px"><!></div>`,
  ),
  O = y(`<!> <!>`, 1);
function k(y, C) {
  m(C, !0);
  let T = _(C, `components`, 23, () => []),
    E = _(C, `data_0`, 3, null),
    k = _(C, `data_1`, 3, null);
  l(() => C.stores.page.set(C.page)),
    c(() => {
      C.stores, C.page, C.constructors, T(), C.form, E(), k(), C.stores.page.notify();
    });
  let A = g(!1),
    j = g(!1),
    M = g(null);
  b(() => {
    let t = C.stores.page.subscribe(() => {
      i(A) &&
        (e(j, !0),
        o().then(() => {
          e(M, document.title || `untitled page`, !0);
        }));
    });
    return e(A, !0), t;
  });
  let N = x(() => C.constructors[1]);
  var P = O(),
    F = u(P),
    I = (e) => {
      let n = x(() => C.constructors[0]);
      var r = a();
      p(
        u(r),
        () => i(n),
        (e, n) => {
          S(
            n(e, {
              get data() {
                return E();
              },
              get form() {
                return C.form;
              },
              get params() {
                return C.page.params;
              },
              children: (e, n) => {
                var r = a();
                p(
                  u(r),
                  () => i(N),
                  (e, t) => {
                    S(
                      t(e, {
                        get data() {
                          return k();
                        },
                        get form() {
                          return C.form;
                        },
                        get params() {
                          return C.page.params;
                        },
                      }),
                      (e) => (T()[1] = e),
                      () => T()?.[1],
                    );
                  },
                ),
                  t(e, r);
              },
              $$slots: { default: !0 },
            }),
            (e) => (T()[0] = e),
            () => T()?.[0],
          );
        },
      ),
        t(e, r);
    },
    L = (e) => {
      let n = x(() => C.constructors[0]);
      var r = a();
      p(
        u(r),
        () => i(n),
        (e, t) => {
          S(
            t(e, {
              get data() {
                return E();
              },
              get form() {
                return C.form;
              },
              get params() {
                return C.page.params;
              },
            }),
            (e) => (T()[0] = e),
            () => T()?.[0],
          );
        },
      ),
        t(e, r);
    };
  s(F, (e) => {
    C.constructors[1] ? e(I) : e(L, -1);
  });
  var R = f(F, 2),
    z = (e) => {
      var a = D(),
        o = d(a),
        c = (e) => {
          var a = v();
          r(() => n(a, i(M))), t(e, a);
        };
      s(o, (e) => {
        i(j) && e(c);
      }),
        h(a),
        t(e, a);
    };
  s(R, (e) => {
    i(A) && e(z);
  }),
    t(y, P),
    w();
}
var A = C(k),
  j = [
    () => T(() => import(`../nodes/0.ByS0wFGl.js`), __vite__mapDeps([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]), import.meta.url),
    () => T(() => import(`../nodes/1.C0-dSvHd.js`), __vite__mapDeps([10, 1, 5, 2]), import.meta.url),
    () =>
      T(
        () => import(`../nodes/2.CxNO-m_n.js`),
        __vite__mapDeps([11, 1, 2, 3, 6, 5, 7, 8, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]),
        import.meta.url,
      ),
    () =>
      T(
        () => import(`../nodes/3.C_kMiC_t.js`),
        __vite__mapDeps([26, 1, 2, 3, 4, 5, 15, 7, 12, 13, 16, 20, 14, 17, 21, 18, 19, 22, 23, 24, 27, 28, 29]),
        import.meta.url,
      ),
    () =>
      T(
        () => import(`../nodes/4.PT4ONZ3h.js`),
        __vite__mapDeps([30, 1, 2, 3, 4, 5, 15, 7, 12, 13, 16, 20, 14, 17, 21, 18, 19, 22, 23, 24, 27, 28, 31]),
        import.meta.url,
      ),
    () =>
      T(
        () => import(`../nodes/5.CnZuGeEx.js`),
        __vite__mapDeps([32, 1, 2, 3, 12, 13, 22, 23, 27, 28, 33]),
        import.meta.url,
      ),
    () =>
      T(
        () => import(`../nodes/6.B3B1_iv7.js`),
        __vite__mapDeps([34, 1, 2, 3, 15, 5, 7, 12, 13, 16, 14, 17, 22, 23, 35]),
        import.meta.url,
      ),
    () =>
      T(
        () => import(`../nodes/7.C3mNVrJ5.js`),
        __vite__mapDeps([36, 1, 2, 3, 4, 5, 12, 13, 20, 15, 7, 16, 14, 17, 21, 18, 19, 22, 23, 24, 27, 28, 37]),
        import.meta.url,
      ),
    () =>
      T(
        () => import(`../nodes/8.v68zwAAr.js`),
        __vite__mapDeps([38, 1, 2, 3, 4, 5, 12, 13, 27, 28, 39]),
        import.meta.url,
      ),
    () =>
      T(
        () => import(`../nodes/9.Biq3rPa-.js`),
        __vite__mapDeps([40, 1, 5, 2, 3, 4, 7, 6, 8, 15, 12, 13, 16, 14, 17, 20, 21, 18, 19, 22, 23, 24, 41]),
        import.meta.url,
      ),
    () =>
      T(
        () => import(`../nodes/10.Bm17tCNh.js`),
        __vite__mapDeps([42, 1, 2, 3, 4, 5, 12, 13, 20, 15, 7, 16, 14, 17, 21, 18, 19, 22, 23, 24, 27, 28, 43]),
        import.meta.url,
      ),
    () =>
      T(
        () => import(`../nodes/11.pbu2n7bZ.js`),
        __vite__mapDeps([44, 1, 5, 2, 3, 4, 7, 15, 12, 13, 16, 18, 19, 27, 28, 45]),
        import.meta.url,
      ),
    () =>
      T(
        () => import(`../nodes/12.CMmfN55h.js`),
        __vite__mapDeps([46, 1, 2, 3, 4, 5, 15, 7, 12, 13, 16, 14, 17, 21, 18, 19, 22, 23, 27, 28, 47]),
        import.meta.url,
      ),
    () =>
      T(
        () => import(`../nodes/13.0nMWDvis.js`),
        __vite__mapDeps([48, 1, 5, 2, 3, 4, 7, 15, 12, 13, 16, 20, 14, 17, 21, 18, 19, 22, 23, 24, 49]),
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
    "/review": [8],
    "/search": [9],
    "/tag/[tag]": [10],
    "/tools": [11],
    "/videos": [13],
    "/video/[id]": [12],
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
