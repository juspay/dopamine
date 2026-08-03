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
import { t as h } from "./Dmb9twoO.js";
import "./xihTtKlq.js";
import "./DauwGVTW.js";
import { d as g, n as _, u as v } from "./H8Kuq40O.js";
import { d as y, o as b } from "./Dt5KBvTb.js";
function x(e, t) {
  s(t, !0);
  let r = d(t, `size`, 3, `sm`);
  function i(e) {
    e.stopPropagation(), t.onclick ? t.onclick(e) : h(`/project/` + encodeURIComponent(t.project));
  }
  {
    let a = p(() => `→ ` + t.project);
    _(e, {
      get label() {
        return n(a);
      },
      get size() {
        return r();
      },
      onclick: i,
    });
  }
  m();
}
var S = f(`<span class="verif-dot svelte-niia12" role="img"></span>`),
  C = f(`<span class="verif-pill-wrap svelte-niia12"><!></span>`);
function w(f, h) {
  s(h, !0);
  let _ = d(h, `size`, 3, `badge`),
    x = p(() => g(h.score)),
    w = p(() => v(h.score)),
    T = p(() => (h.confidence == null ? n(x) : `${n(x)} (${Math.round(h.confidence * 100)}% confidence)`)),
    E = p(() =>
      h.score === `verified_useful`
        ? `var(--ok-bg)`
        : h.score === `partially_verified`
          ? `var(--warn-bg)`
          : h.score === `outdated`
            ? `var(--bad-bg)`
            : `var(--neutral-bg)`,
    ),
    D = p(() =>
      h.score === `verified_useful`
        ? `color-mix(in srgb, var(--ok)      28%, transparent)`
        : h.score === `partially_verified`
          ? `color-mix(in srgb, var(--warn)    28%, transparent)`
          : h.score === `outdated`
            ? `color-mix(in srgb, var(--bad)     28%, transparent)`
            : `color-mix(in srgb, var(--neutral) 28%, transparent)`,
    ),
    O = p(() =>
      h.score === `verified_useful`
        ? `color-mix(in srgb, var(--ok)      35%, transparent)`
        : h.score === `partially_verified`
          ? `color-mix(in srgb, var(--warn)    35%, transparent)`
          : h.score === `outdated`
            ? `color-mix(in srgb, var(--bad)     35%, transparent)`
            : `color-mix(in srgb, var(--neutral) 35%, transparent)`,
    );
  var k = r(),
    A = a(k),
    j = (r) => {
      b(r, {
        get text() {
          return n(T);
        },
        position: `top`,
        children: (r) => {
          var i = S();
          t(() => {
            u(i, `background:${n(w) ?? ``}`), l(i, `aria-label`, n(T));
          }),
            e(r, i);
        },
        $$slots: { default: !0 },
      });
    },
    M = (r) => {
      var i = C();
      y(o(i), {
        get text() {
          return n(x);
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
    _() === `dot` ? e(j) : e(M, -1);
  }),
    e(f, k),
    m();
}
export { x as n, w as t };
