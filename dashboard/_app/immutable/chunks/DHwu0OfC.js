import { I as e, ct as t, i as n, nt as r, st as i } from "./BZ84wCgC.js";
import { t as a } from "./CcqLSuep.js";
import "./xihTtKlq.js";
import "./C513ZtO5.js";
import { n as o } from "./CnvqUUT7.js";
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
