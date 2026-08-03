import {
  B as e,
  D as t,
  E as n,
  H as r,
  I as i,
  T as a,
  Y as o,
  Z as s,
  ct as c,
  dt as l,
  it as u,
  k as d,
  nt as f,
  q as p,
  rt as m,
  st as h,
  y as g,
} from "../chunks/BZ84wCgC.js";
import "../chunks/xihTtKlq.js";
import { a as _, o as v } from "../chunks/CdnViQ5q.js";
import { t as y } from "../chunks/B2DVDhc0.js";
import { t as b } from "../chunks/Dt5KBvTb.js";
import { t as x } from "../chunks/Is8ZIs2f.js";
import { t as S } from "../chunks/CyjB8bAN.js";
var C = d(`<p class="count svelte-x60zy"> </p>`),
  w = d(
    `<div class="tag-page svelte-x60zy"><!> <header class="page-header svelte-x60zy"><h1 class="tag-heading svelte-x60zy"><span class="hash svelte-x60zy" aria-hidden="true">#</span> </h1> <!></header> <!></div>`,
  );
function T(d, T) {
  c(T, !0);
  let E = () => u(y, `$page`, D),
    [D, O] = m(),
    k = f(() => decodeURIComponent(E().params.tag ?? ``)),
    A = f(_),
    j = f(v),
    M = f(() => i(A).filter((e) => e.tags.some((e) => e.toLowerCase() === i(k).toLowerCase()))),
    N = f(() => [{ label: `Home`, href: `/` }, { label: `#${i(k)}` }]);
  var P = w();
  g(`x60zy`, (t) => {
    e(() => {
      p.title = `#${i(k) ?? ``} — Dopamine`;
    });
  });
  var F = o(P);
  S(F, {
    get items() {
      return i(N);
    },
  });
  var I = s(F, 2),
    L = o(I),
    R = s(o(L), 1, !0);
  l(L);
  var z = s(L, 2),
    B = (e) => {
      var a = C(),
        s = o(a);
      l(a), r(() => n(s, `${i(M).length ?? ``} ${i(M).length === 1 ? `video` : `videos`}`)), t(e, a);
    };
  a(z, (e) => {
    i(j) && e(B);
  }),
    l(I);
  var V = s(I, 2),
    H = (e) => {
      b(e, {});
    },
    U = (e) => {
      {
        let t = f(() => `No videos tagged #${i(k)}.`);
        x(e, {
          get items() {
            return i(M);
          },
          get emptyMessage() {
            return i(t);
          },
        });
      }
    };
  a(V, (e) => {
    i(j) ? e(U, -1) : e(H);
  }),
    l(P),
    r(() => n(R, i(k))),
    t(d, P),
    h(),
    O();
}
export { T as component };
