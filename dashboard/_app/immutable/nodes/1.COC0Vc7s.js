import {
  D as e,
  E as t,
  H as n,
  X as r,
  Y as i,
  Z as a,
  ct as o,
  dt as s,
  k as c,
  st as l,
} from "../chunks/BZ84wCgC.js";
import { a as u, i as d, r as f } from "../chunks/DsZFQft9.js";
import "../chunks/xihTtKlq.js";
var p = {
  get data() {
    return u.data;
  },
  get error() {
    return u.error;
  },
  get form() {
    return u.form;
  },
  get params() {
    return u.params;
  },
  get route() {
    return u.route;
  },
  get state() {
    return u.state;
  },
  get status() {
    return u.status;
  },
  get url() {
    return u.url;
  },
};
Object.defineProperty(
  {
    get from() {
      return d.current ? d.current.from : null;
    },
    get to() {
      return d.current ? d.current.to : null;
    },
    get type() {
      return d.current ? d.current.type : null;
    },
    get willUnload() {
      return d.current ? d.current.willUnload : null;
    },
    get delta() {
      return d.current ? d.current.delta : null;
    },
    get complete() {
      return d.current ? d.current.complete : null;
    },
  },
  "current",
  {
    get() {
      throw Error(`Replace navigating.current.<prop> with navigating.<prop>`);
    },
  },
),
  f.updated.check;
var m = p,
  h = c(`<h1> </h1> <p> </p>`, 1);
function g(c, u) {
  o(u, !0);
  var d = h(),
    f = r(d),
    p = i(f, !0);
  s(f);
  var g = a(f, 2),
    _ = i(g, !0);
  s(g),
    n(() => {
      t(p, m.status), t(_, m.error?.message);
    }),
    e(c, d),
    l();
}
export { g as component };
