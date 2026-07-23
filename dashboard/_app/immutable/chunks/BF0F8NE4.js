import {
  B as e,
  C as t,
  D as n,
  E as r,
  K as i,
  P as a,
  Q as o,
  T as s,
  d as c,
  i as l,
  it as u,
  p as d,
  q as f,
  rt as p,
  st as m,
} from "./KQ3eEBfb.js";
import { t as h } from "./BHIZHYj4.js";
import "./xihTtKlq.js";
import "./Cd4YZbZJ.js";
import { l as g, n as _, u as v } from "./WltnivmA.js";
import { d as y, o as b } from "./BcfutCr0.js";
function x(e, t) {
  u(t, !0);
  let n = l(t, `size`, 3, `sm`);
  function r(e) {
    e.stopPropagation(), t.onclick ? t.onclick(e) : h(`/project/` + encodeURIComponent(t.project));
  }
  {
    let i = o(() => `→ ` + t.project);
    _(e, {
      get label() {
        return a(i);
      },
      get size() {
        return n();
      },
      onclick: r,
    });
  }
  p();
}
var S = n(`<span class="verif-dot svelte-niia12" role="img"></span>`),
  C = n(`<span class="verif-pill-wrap svelte-niia12"><!></span>`);
function w(n, h) {
  u(h, !0);
  let _ = l(h, `size`, 3, `badge`),
    x = o(() => v(h.score)),
    w = o(() => g(h.score)),
    T = o(() => (h.confidence == null ? a(x) : `${a(x)} (${Math.round(h.confidence * 100)}% confidence)`)),
    E = o(() =>
      h.score === `verified_useful`
        ? `var(--ok-bg)`
        : h.score === `partially_verified`
          ? `var(--warn-bg)`
          : h.score === `outdated`
            ? `var(--bad-bg)`
            : `var(--neutral-bg)`,
    ),
    D = o(() =>
      h.score === `verified_useful`
        ? `color-mix(in srgb, var(--ok)      28%, transparent)`
        : h.score === `partially_verified`
          ? `color-mix(in srgb, var(--warn)    28%, transparent)`
          : h.score === `outdated`
            ? `color-mix(in srgb, var(--bad)     28%, transparent)`
            : `color-mix(in srgb, var(--neutral) 28%, transparent)`,
    ),
    O = o(() =>
      h.score === `verified_useful`
        ? `color-mix(in srgb, var(--ok)      35%, transparent)`
        : h.score === `partially_verified`
          ? `color-mix(in srgb, var(--warn)    35%, transparent)`
          : h.score === `outdated`
            ? `color-mix(in srgb, var(--bad)     35%, transparent)`
            : `color-mix(in srgb, var(--neutral) 35%, transparent)`,
    );
  var k = r(),
    A = f(k),
    j = (t) => {
      b(t, {
        get text() {
          return a(T);
        },
        position: `top`,
        children: (t) => {
          var n = S();
          e(() => {
            d(n, `background:${a(w) ?? ``}`), c(n, `aria-label`, a(T));
          }),
            s(t, n);
        },
        $$slots: { default: !0 },
      });
    },
    M = (t) => {
      var n = C();
      y(i(n), {
        get text() {
          return a(x);
        },
      }),
        m(n),
        e(() =>
          d(
            n,
            `--pill-color:${a(w) ?? ``};--pill-background:${a(E) ?? ``};--pill-hover-background:${a(D) ?? ``};--pill-hover-color:${a(w) ?? ``};--pill-border:1px solid ${a(O) ?? ``}`,
          ),
        ),
        s(t, n);
    };
  t(A, (e) => {
    _() === `dot` ? e(j) : e(M, -1);
  }),
    s(n, k),
    p();
}
export { x as n, w as t };
