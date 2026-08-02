import { D as e, E as t, H as n, Y as r, dt as i, i as a, k as o } from "./BZ84wCgC.js";
import "./xihTtKlq.js";
import { n as s } from "./Dt5KBvTb.js";
var c = o(`<span class="empty-icon svelte-13862ru" aria-hidden="true"> </span>`);
function l(o, l) {
  let u = (a) => {
      var o = c(),
        s = r(o, !0);
      i(o), n(() => t(s, f())), e(a, o);
    },
    d = a(l, `message`, 3, `Nothing here yet.`),
    f = a(l, `icon`, 3, `○`);
  s(o, {
    get title() {
      return d();
    },
    description: ``,
    get icon() {
      return u;
    },
  });
}
export { l as t };
