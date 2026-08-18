import {
  $ as e,
  D as t,
  H as n,
  I as r,
  P as i,
  U as a,
  Y as o,
  Z as s,
  c,
  ct as l,
  d as u,
  dt as d,
  et as f,
  f as p,
  i as m,
  k as h,
  st as g,
  ut as _,
} from "./BZ84wCgC.js";
import { t as v } from "./DsZFQft9.js";
import "./xihTtKlq.js";
import "./DsboxpXm.js";
var y = h(
  `<form class="search-box svelte-1o0c7a1" role="search"><span class="search-icon svelte-1o0c7a1" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg></span> <input class="search-input svelte-1o0c7a1" type="search" name="q" aria-label="Search" autocomplete="off" spellcheck="false"/> <button class="search-submit svelte-1o0c7a1" type="submit" aria-label="Submit search"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"></path></svg></button></form>`,
);
function b(h, b) {
  l(b, !0);
  let x = m(b, `placeholder`, 3, `Search videos, tools, creators…`),
    S = m(b, `initialValue`, 3, ``),
    C = f(``);
  a(() => {
    e(C, S());
  });
  function w(e) {
    e.preventDefault();
    let t = r(C).trim();
    t && (b.onSubmit ? b.onSubmit(t) : v(`/search?q=` + encodeURIComponent(t)));
  }
  var T = y(),
    E = s(o(T), 2);
  u(E),
    _(2),
    d(T),
    n(() => p(E, `placeholder`, x())),
    i(`submit`, T, w),
    c(
      E,
      () => r(C),
      (t) => e(C, t),
    ),
    t(h, T),
    g();
}
export { b as t };
