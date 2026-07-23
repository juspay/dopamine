import {
  B as e,
  D as t,
  J as n,
  K as r,
  M as i,
  P as a,
  T as o,
  V as s,
  X as c,
  Z as l,
  d as u,
  i as d,
  it as f,
  ot as p,
  rt as m,
  s as h,
  st as g,
  u as _,
} from "./KQ3eEBfb.js";
import { t as v } from "./BHIZHYj4.js";
import "./xihTtKlq.js";
import "./Cd4YZbZJ.js";
var y = t(
  `<form class="search-box svelte-1o0c7a1" role="search"><span class="search-icon svelte-1o0c7a1" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg></span> <input class="search-input svelte-1o0c7a1" type="search" name="q" aria-label="Search" autocomplete="off" spellcheck="false"/> <button class="search-submit svelte-1o0c7a1" type="submit" aria-label="Submit search"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"></path></svg></button></form>`,
);
function b(t, b) {
  f(b, !0);
  let x = d(b, `placeholder`, 3, `Search videos, tools, creators…`),
    S = d(b, `initialValue`, 3, ``),
    C = l(``);
  s(() => {
    c(C, S());
  });
  function w(e) {
    e.preventDefault();
    let t = a(C).trim();
    t && (b.onSubmit ? b.onSubmit(t) : v(`/search?q=` + encodeURIComponent(t)));
  }
  var T = y(),
    E = n(r(T), 2);
  _(E),
    p(2),
    g(T),
    e(() => u(E, `placeholder`, x())),
    i(`submit`, T, w),
    h(
      E,
      () => a(C),
      (e) => c(C, e),
    ),
    o(t, T),
    m();
}
export { b as t };
