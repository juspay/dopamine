import { B as e, D as t, K as n, T as r, i, st as a, w as o } from "./KQ3eEBfb.js";
import "./xihTtKlq.js";
import { n as s } from "./BcfutCr0.js";
var c = t(`<span class="empty-icon svelte-13862ru" aria-hidden="true"> </span>`);
function l(t, l) {
  let u = (t) => {
      var i = c(),
        s = n(i, !0);
      a(i), e(() => o(s, f())), r(t, i);
    },
    d = i(l, `message`, 3, `Nothing here yet.`),
    f = i(l, `icon`, 3, `○`);
  s(t, {
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
