import {
  B as e,
  D as t,
  J as n,
  K as r,
  T as i,
  it as a,
  q as o,
  rt as s,
  st as c,
  w as l,
} from "../chunks/KQ3eEBfb.js";
import { a as u, i as d, r as f } from "../chunks/BHIZHYj4.js";
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
  h = t(`<h1> </h1> <p> </p>`, 1);
function g(t, u) {
  a(u, !0);
  var d = h(),
    f = o(d),
    p = r(f, !0);
  c(f);
  var g = n(f, 2),
    _ = r(g, !0);
  c(g),
    e(() => {
      l(p, m.status), l(_, m.error?.message);
    }),
    i(t, d),
    s();
}
export { g as component };
