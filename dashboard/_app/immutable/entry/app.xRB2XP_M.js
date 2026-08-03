const __vite__mapDeps = (
  i,
  m = __vite__mapDeps,
  d = m.f ||
    (m.f = [
      "../nodes/0.BhHsqcgn.js",
      "../chunks/BZ84wCgC.js",
      "../chunks/xihTtKlq.js",
      "../chunks/CdnViQ5q.js",
      "../chunks/B2DVDhc0.js",
      "../chunks/Dmb9twoO.js",
      "../chunks/BqeBlQOp.js",
      "../chunks/DauwGVTW.js",
      "../assets/SearchBox.Chx-WfoP.css",
      "../assets/0.Cz3mIEj4.css",
      "../nodes/1.C0jfmEyS.js",
      "../nodes/2.B---A6DT.js",
      "../chunks/Dt5KBvTb.js",
      "../assets/Spinner.5Eo0uK9j.css",
      "../chunks/BE_OFooT.js",
      "../chunks/H8Kuq40O.js",
      "../assets/CategoryChip.BcgSIRFs.css",
      "../assets/CreatorLink.DRO1_89J.css",
      "../chunks/CAwE-eJr.js",
      "../assets/VerificationBadge.7gnp0T7e.css",
      "../chunks/Is8ZIs2f.js",
      "../chunks/BbG86UsG.js",
      "../assets/EmptyState.Mb3m4kIT.css",
      "../assets/VideoGrid.DNdp7qt-.css",
      "../assets/2.CkIaSUcP.css",
      "../nodes/3.NPxQCL2I.js",
      "../chunks/CyjB8bAN.js",
      "../assets/Breadcrumbs.TjqA0CPI.css",
      "../assets/3.C0gXdC77.css",
      "../nodes/4.yksG1z8c.js",
      "../assets/4.Bb3JTwEz.css",
      "../nodes/5.CnZuGeEx.js",
      "../assets/5.W6G_nvVq.css",
      "../nodes/6.C_D_gBTN.js",
      "../assets/6.KxcmDT-W.css",
      "../nodes/7.B7H67UH9.js",
      "../assets/7.DuAp6JEC.css",
      "../nodes/8.RJLpmho2.js",
      "../assets/8.DZLJ_gVJ.css",
      "../nodes/9.CyQeb9cv.js",
      "../assets/9.Sk4UoIZ-.css",
      "../nodes/10.DcMuj4Wk.js",
      "../assets/10.BBkzlglJ.css",
      "../nodes/11.BWzJ9QaM.js",
      "../assets/11.Bkqs2Ngo.css",
      "../nodes/12.wEDrZyJM.js",
      "../assets/12.Bs9RCSEy.css",
      "../nodes/13.txau03um.js",
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
    () => T(() => import(`../nodes/0.BhHsqcgn.js`), __vite__mapDeps([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]), import.meta.url),
    () => T(() => import(`../nodes/1.C0jfmEyS.js`), __vite__mapDeps([10, 1, 5, 2]), import.meta.url),
    () =>
      T(
        () => import(`../nodes/2.B---A6DT.js`),
        __vite__mapDeps([11, 1, 2, 3, 6, 5, 7, 8, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]),
        import.meta.url,
      ),
    () =>
      T(
        () => import(`../nodes/3.NPxQCL2I.js`),
        __vite__mapDeps([25, 1, 2, 3, 4, 5, 15, 7, 12, 13, 16, 20, 14, 17, 18, 19, 21, 22, 23, 26, 27, 28]),
        import.meta.url,
      ),
    () =>
      T(
        () => import(`../nodes/4.yksG1z8c.js`),
        __vite__mapDeps([29, 1, 2, 3, 4, 5, 15, 7, 12, 13, 16, 20, 14, 17, 18, 19, 21, 22, 23, 26, 27, 30]),
        import.meta.url,
      ),
    () =>
      T(
        () => import(`../nodes/5.CnZuGeEx.js`),
        __vite__mapDeps([31, 1, 2, 3, 12, 13, 21, 22, 26, 27, 32]),
        import.meta.url,
      ),
    () =>
      T(
        () => import(`../nodes/6.C_D_gBTN.js`),
        __vite__mapDeps([33, 1, 2, 3, 15, 5, 7, 12, 13, 16, 14, 17, 21, 22, 34]),
        import.meta.url,
      ),
    () =>
      T(
        () => import(`../nodes/7.B7H67UH9.js`),
        __vite__mapDeps([35, 1, 2, 3, 4, 5, 12, 13, 20, 15, 7, 16, 14, 17, 18, 19, 21, 22, 23, 26, 27, 36]),
        import.meta.url,
      ),
    () =>
      T(
        () => import(`../nodes/8.RJLpmho2.js`),
        __vite__mapDeps([37, 1, 2, 3, 4, 5, 12, 13, 26, 27, 38]),
        import.meta.url,
      ),
    () =>
      T(
        () => import(`../nodes/9.CyQeb9cv.js`),
        __vite__mapDeps([39, 1, 5, 2, 3, 4, 7, 6, 8, 15, 12, 13, 16, 14, 17, 20, 18, 19, 21, 22, 23, 40]),
        import.meta.url,
      ),
    () =>
      T(
        () => import(`../nodes/10.DcMuj4Wk.js`),
        __vite__mapDeps([41, 1, 2, 3, 4, 5, 12, 13, 20, 15, 7, 16, 14, 17, 18, 19, 21, 22, 23, 26, 27, 42]),
        import.meta.url,
      ),
    () =>
      T(
        () => import(`../nodes/11.BWzJ9QaM.js`),
        __vite__mapDeps([43, 1, 5, 2, 3, 4, 7, 15, 12, 13, 16, 26, 27, 44]),
        import.meta.url,
      ),
    () =>
      T(
        () => import(`../nodes/12.wEDrZyJM.js`),
        __vite__mapDeps([45, 1, 2, 3, 4, 5, 15, 7, 12, 13, 16, 14, 17, 18, 19, 21, 22, 26, 27, 46]),
        import.meta.url,
      ),
    () =>
      T(
        () => import(`../nodes/13.txau03um.js`),
        __vite__mapDeps([47, 1, 5, 2, 3, 4, 7, 15, 12, 13, 16, 20, 14, 17, 18, 19, 21, 22, 23, 48]),
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
