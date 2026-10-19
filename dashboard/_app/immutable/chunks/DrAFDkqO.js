import { I as e, ct as t, i as n, nt as r, st as i } from "./BZ84wCgC.js";
import { t as a } from "./0RM2V3US.js";
import "./xihTtKlq.js";
import "./B0KHRcAh.js";
import { n as o } from "./DLokxzUJ.js";
function s(s, c) {
  t(c, !0);
  let l = n(c, `size`, 3, `sm`);
  function u(e) {
    e.stopPropagation(), c.onclick ? c.onclick(e) : a(`/project/` + encodeURIComponent(c.project));
  }
  {
    let t = r(() => `→ ` + c.project);
    o(s, {
      get label() {
        return e(t);
      },
      get size() {
        return l();
      },
      onclick: u,
    });
  }
  i();
}
export { s as t };
