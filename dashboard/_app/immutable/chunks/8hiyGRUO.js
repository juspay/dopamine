import {
  A as e,
  B as t,
  C as n,
  D as r,
  E as i,
  J as a,
  K as o,
  P as s,
  Q as c,
  T as l,
  d as u,
  i as d,
  it as f,
  j as p,
  q as m,
  rt as h,
  st as g,
  w as _,
} from "./KQ3eEBfb.js";
import { t as v } from "./BHIZHYj4.js";
import "./xihTtKlq.js";
import "./Cd4YZbZJ.js";
import { n as y } from "./WltnivmA.js";
function b(e, t) {
  f(t, !0);
  let n = d(t, `size`, 3, `sm`);
  function r(e) {
    e.stopPropagation(), t.onclick ? t.onclick(e) : v(`/tag/` + encodeURIComponent(t.tag));
  }
  {
    let i = c(() => (t.tag.startsWith(`#`) ? t.tag : `#` + t.tag));
    y(e, {
      get label() {
        return s(i);
      },
      get size() {
        return n();
      },
      onclick: r,
    });
  }
  h();
}
var x = r(`<a class="creator-link svelte-11cl8ko"><span class="at svelte-11cl8ko" aria-hidden="true">@</span> </a>`),
  S = r(`<span class="creator-link creator-unknown svelte-11cl8ko" title="Unknown creator">unknown</span>`);
function C(e, r) {
  f(r, !0);
  function s(e) {
    e.stopPropagation(), r.onclick && r.onclick(e);
  }
  var c = i(),
    d = m(c),
    v = (e) => {
      var n = x(),
        i = a(o(n), 1, !0);
      g(n),
        t(
          (e) => {
            u(n, `href`, e), u(n, `title`, r.fullName || r.name), _(i, r.name);
          },
          [() => `/creator/` + encodeURIComponent(r.name)],
        ),
        p(`click`, n, s),
        l(e, n);
    },
    y = (e) => {
      l(e, S());
    };
  n(d, (e) => {
    r.name ? e(v) : e(y, -1);
  }),
    l(e, c),
    h();
}
e([`click`]);
export { b as n, C as t };
