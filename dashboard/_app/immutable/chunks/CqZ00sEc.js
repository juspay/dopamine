import {
  D as e,
  H as t,
  I as n,
  O as r,
  T as i,
  X as a,
  Y as o,
  ct as s,
  dt as c,
  f as l,
  h as u,
  i as d,
  k as f,
  nt as p,
  st as m,
} from "./BZ84wCgC.js";
import "./xihTtKlq.js";
import { d as h, u as g } from "./CnvqUUT7.js";
import { d as _, o as v } from "./Dt5KBvTb.js";
var y = f(`<span class="verif-dot svelte-niia12" role="img"></span>`),
  b = f(`<span class="verif-pill-wrap svelte-niia12"><!></span>`);
function x(f, x) {
  s(x, !0);
  let S = d(x, `size`, 3, `badge`),
    C = p(() => h(x.score)),
    w = p(() => g(x.score)),
    T = p(() => (x.confidence == null ? n(C) : `${n(C)} (${Math.round(x.confidence * 100)}% confidence)`)),
    E = p(() =>
      x.score === `verified_useful`
        ? `var(--ok-bg)`
        : x.score === `partially_verified`
          ? `var(--warn-bg)`
          : x.score === `outdated`
            ? `var(--bad-bg)`
            : `var(--neutral-bg)`,
    ),
    D = p(() =>
      x.score === `verified_useful`
        ? `color-mix(in srgb, var(--ok)      28%, transparent)`
        : x.score === `partially_verified`
          ? `color-mix(in srgb, var(--warn)    28%, transparent)`
          : x.score === `outdated`
            ? `color-mix(in srgb, var(--bad)     28%, transparent)`
            : `color-mix(in srgb, var(--neutral) 28%, transparent)`,
    ),
    O = p(() =>
      x.score === `verified_useful`
        ? `color-mix(in srgb, var(--ok)      35%, transparent)`
        : x.score === `partially_verified`
          ? `color-mix(in srgb, var(--warn)    35%, transparent)`
          : x.score === `outdated`
            ? `color-mix(in srgb, var(--bad)     35%, transparent)`
            : `color-mix(in srgb, var(--neutral) 35%, transparent)`,
    );
  var k = r(),
    A = a(k),
    j = (r) => {
      v(r, {
        get text() {
          return n(T);
        },
        position: `top`,
        children: (r) => {
          var i = y();
          t(() => {
            u(i, `background:${n(w) ?? ``}`), l(i, `aria-label`, n(T));
          }),
            e(r, i);
        },
        $$slots: { default: !0 },
      });
    },
    M = (r) => {
      var i = b();
      _(o(i), {
        get text() {
          return n(C);
        },
      }),
        c(i),
        t(() =>
          u(
            i,
            `--pill-color:${n(w) ?? ``};--pill-background:${n(E) ?? ``};--pill-hover-background:${n(D) ?? ``};--pill-hover-color:${n(w) ?? ``};--pill-border:1px solid ${n(O) ?? ``}`,
          ),
        ),
        e(r, i);
    };
  i(A, (e) => {
    S() === `dot` ? e(j) : e(M, -1);
  }),
    e(f, k),
    m();
}
export { x as t };
