import {
  D as e,
  E as t,
  H as n,
  I as r,
  M as i,
  N as a,
  O as o,
  T as s,
  X as c,
  Y as l,
  Z as u,
  ct as d,
  dt as f,
  f as p,
  i as m,
  k as h,
  nt as g,
  st as _,
} from "./BZ84wCgC.js";
import { t as v } from "./Dmb9twoO.js";
import "./xihTtKlq.js";
import "./DauwGVTW.js";
import { n as y } from "./H8Kuq40O.js";
function b(e, t) {
  d(t, !0);
  let n = m(t, `size`, 3, `sm`);
  function i(e) {
    e.stopPropagation(), t.onclick ? t.onclick(e) : v(`/tag/` + encodeURIComponent(t.tag));
  }
  {
    let a = g(() => (t.tag.startsWith(`#`) ? t.tag : `#` + t.tag));
    y(e, {
      get label() {
        return r(a);
      },
      get size() {
        return n();
      },
      onclick: i,
    });
  }
  _();
}
var x = h(`<a class="creator-link svelte-11cl8ko"><span class="at svelte-11cl8ko" aria-hidden="true">@</span> </a>`),
  S = h(`<span class="creator-link creator-unknown svelte-11cl8ko" title="Unknown creator">unknown</span>`);
function C(r, i) {
  d(i, !0);
  function m(e) {
    e.stopPropagation(), i.onclick && i.onclick(e);
  }
  var h = o(),
    g = c(h),
    v = (r) => {
      var o = x(),
        s = u(l(o), 1, !0);
      f(o),
        n(
          (e) => {
            p(o, `href`, e), p(o, `title`, i.fullName || i.name), t(s, i.name);
          },
          [() => `/creator/` + encodeURIComponent(i.name)],
        ),
        a(`click`, o, m),
        e(r, o);
    },
    y = (t) => {
      e(t, S());
    };
  s(g, (e) => {
    i.name ? e(v) : e(y, -1);
  }),
    e(r, h),
    _();
}
i([`click`]);
export { b as n, C as t };
