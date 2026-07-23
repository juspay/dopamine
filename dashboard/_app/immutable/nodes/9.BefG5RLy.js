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
  T as l,
  W as u,
  _ as d,
  et as f,
  it as p,
  rt as m,
  st as h,
  w as g,
} from "../chunks/KQ3eEBfb.js";
import "../chunks/xihTtKlq.js";
import { a as _, o as v } from "../chunks/5wXqoPKv.js";
import { t as y } from "../chunks/DukFlL_f.js";
import { t as b } from "../chunks/BcfutCr0.js";
import { t as x } from "../chunks/WJjxiR19.js";
import { t as S } from "../chunks/Bd4orgHw.js";
var C = r(`<p class="count svelte-x60zy"> </p>`),
  w = r(
    `<div class="tag-page svelte-x60zy"><!> <header class="page-header svelte-x60zy"><h1 class="tag-heading svelte-x60zy"><span class="hash svelte-x60zy" aria-hidden="true">#</span> </h1> <!></header> <!></div>`,
  );
function T(r, T) {
  p(T, !0);
  let E = () => f(y, `$page`, D),
    [D, O] = e(),
    k = s(() => decodeURIComponent(E().params.tag ?? ``)),
    A = s(_),
    j = s(v),
    M = s(() => o(A).filter((e) => e.tags.some((e) => e.toLowerCase() === o(k).toLowerCase()))),
    N = s(() => [{ label: `Home`, href: `/` }, { label: `#${o(k)}` }]);
  var P = w();
  d(`x60zy`, (e) => {
    c(() => {
      u.title = `#${o(k) ?? ``} — Dopamine`;
    });
  });
  var F = a(P);
  S(F, {
    get items() {
      return o(N);
    },
  });
  var I = i(F, 2),
    L = a(I),
    R = i(a(L), 1, !0);
  h(L);
  var z = i(L, 2),
    B = (e) => {
      var n = C(),
        r = a(n);
      h(n), t(() => g(r, `${o(M).length ?? ``} ${o(M).length === 1 ? `video` : `videos`}`)), l(e, n);
    };
  n(z, (e) => {
    o(j) && e(B);
  }),
    h(I);
  var V = i(I, 2),
    H = (e) => {
      b(e, {});
    },
    U = (e) => {
      {
        let t = s(() => `No videos tagged #${o(k)}.`);
        x(e, {
          get items() {
            return o(M);
          },
          get emptyMessage() {
            return o(t);
          },
        });
      }
    };
  n(V, (e) => {
    o(j) ? e(U, -1) : e(H);
  }),
    h(P),
    t(() => g(R, o(k))),
    l(r, P),
    m(),
    O();
}
export { T as component };
