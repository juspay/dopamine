import {
  C as e,
  D as t,
  E as n,
  H as r,
  I as i,
  T as a,
  Y as o,
  Z as s,
  ct as c,
  dt as l,
  f as u,
  k as d,
  st as f,
  w as p,
} from "./BZ84wCgC.js";
import "./xihTtKlq.js";
var m = d(`<a class="svelte-1jovwxm"> </a>`),
  h = d(`<span class="svelte-1jovwxm"> </span>`),
  g = d(`<span class="sep svelte-1jovwxm" aria-hidden="true">›</span>`),
  _ = d(`<li class="svelte-1jovwxm"><!> <!></li>`),
  v = d(`<nav class="breadcrumbs svelte-1jovwxm" aria-label="Breadcrumb"><ol class="svelte-1jovwxm"></ol></nav>`);
function y(d, y) {
  c(y, !0);
  var b = v(),
    x = o(b);
  e(
    x,
    21,
    () => y.items,
    p,
    (e, c, d) => {
      var f = _(),
        p = o(f),
        v = (e) => {
          var a = m(),
            s = o(a, !0);
          l(a),
            r(() => {
              u(a, `href`, i(c).href), n(s, i(c).label);
            }),
            t(e, a);
        },
        b = (e) => {
          var a = h(),
            s = o(a, !0);
          l(a),
            r(() => {
              u(a, `aria-current`, d === y.items.length - 1 ? `page` : void 0), n(s, i(c).label);
            }),
            t(e, a);
        };
      a(p, (e) => {
        i(c).href && d < y.items.length - 1 ? e(v) : e(b, -1);
      });
      var x = s(p, 2),
        S = (e) => {
          t(e, g());
        };
      a(x, (e) => {
        d < y.items.length - 1 && e(S);
      }),
        l(f),
        t(e, f);
    },
  ),
    l(x),
    l(b),
    t(d, b),
    f();
}
export { y as t };
