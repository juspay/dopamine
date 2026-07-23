import {
  B as e,
  C as t,
  D as n,
  J as r,
  K as i,
  P as a,
  S as o,
  T as s,
  d as c,
  it as l,
  rt as u,
  st as d,
  w as f,
  x as p,
} from "./KQ3eEBfb.js";
import "./xihTtKlq.js";
var m = n(`<a class="svelte-1jovwxm"> </a>`),
  h = n(`<span class="svelte-1jovwxm"> </span>`),
  g = n(`<span class="sep svelte-1jovwxm" aria-hidden="true">›</span>`),
  _ = n(`<li class="svelte-1jovwxm"><!> <!></li>`),
  v = n(`<nav class="breadcrumbs svelte-1jovwxm" aria-label="Breadcrumb"><ol class="svelte-1jovwxm"></ol></nav>`);
function y(n, y) {
  l(y, !0);
  var b = v(),
    x = i(b);
  p(
    x,
    21,
    () => y.items,
    o,
    (n, o, l) => {
      var u = _(),
        p = i(u),
        v = (t) => {
          var n = m(),
            r = i(n, !0);
          d(n),
            e(() => {
              c(n, `href`, a(o).href), f(r, a(o).label);
            }),
            s(t, n);
        },
        b = (t) => {
          var n = h(),
            r = i(n, !0);
          d(n),
            e(() => {
              c(n, `aria-current`, l === y.items.length - 1 ? `page` : void 0), f(r, a(o).label);
            }),
            s(t, n);
        };
      t(p, (e) => {
        a(o).href && l < y.items.length - 1 ? e(v) : e(b, -1);
      });
      var x = r(p, 2),
        S = (e) => {
          s(e, g());
        };
      t(x, (e) => {
        l < y.items.length - 1 && e(S);
      }),
        d(u),
        s(n, u);
    },
  ),
    d(x),
    d(b),
    s(n, b),
    u();
}
export { y as t };
