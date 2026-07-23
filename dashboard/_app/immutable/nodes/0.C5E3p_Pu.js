import {
  $ as e,
  A as t,
  B as n,
  C as r,
  D as i,
  G as a,
  J as o,
  K as s,
  M as c,
  O as l,
  P as u,
  S as d,
  T as f,
  X as p,
  Z as m,
  d as h,
  et as g,
  it as _,
  j as v,
  lt as y,
  m as b,
  n as x,
  q as S,
  rt as C,
  st as w,
  w as T,
  x as E,
  y as D,
} from "../chunks/KQ3eEBfb.js";
import "../chunks/xihTtKlq.js";
import { u as O } from "../chunks/5wXqoPKv.js";
import { t as k } from "../chunks/DukFlL_f.js";
import { t as A } from "../chunks/C9NVFsZM.js";
var j = y({ prerender: () => !1, ssr: () => !1, trailingSlash: () => M }),
  M = `never`,
  N = i(`<a> </a>`),
  P = l(
    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"></path></svg>`,
  ),
  F = l(
    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"></path></svg>`,
  ),
  I = i(`<a> </a>`),
  L = i(`<nav id="mobile-menu" class="nav-mobile svelte-yic9pk" aria-label="Mobile navigation"></nav>`),
  R = i(
    `<header class="topbar svelte-yic9pk"><div class="topbar-inner svelte-yic9pk"><a href="/" class="logo svelte-yic9pk" aria-label="Dopamine home"><span class="logo-dot svelte-yic9pk" aria-hidden="true">◉</span> Dopamine</a> <div class="search-wrap svelte-yic9pk"><!></div> <nav class="nav-desktop svelte-yic9pk" aria-label="Main navigation"></nav> <div class="mobile-controls svelte-yic9pk"><a href="/search" class="icon-btn svelte-yic9pk" aria-label="Search"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg></a> <button class="icon-btn hamburger svelte-yic9pk" aria-controls="mobile-menu"><!></button></div></div> <!></header>`,
  );
function z(t, i) {
  _(i, !0);
  let l = () => g(k, `$page`, y),
    [y, x] = e(),
    S = m(!1);
  function D() {
    p(S, !u(S));
  }
  function O() {
    p(S, !1);
  }
  let j = [
    { href: `/`, label: `Home` },
    { href: `/videos`, label: `Videos` },
    { href: `/tools`, label: `Tools` },
    { href: `/kb`, label: `Knowledge` },
  ];
  function M(e) {
    let t = l().url.pathname;
    return e === `/` ? t === `/` : t.startsWith(e);
  }
  var z = R();
  c(`click`, a, (e) => {
    e.target.closest(`.topbar`) || O();
  });
  var B = s(z),
    V = o(s(B), 2);
  A(s(V), {}), w(V);
  var H = o(V, 2);
  E(
    H,
    21,
    () => j,
    d,
    (e, t) => {
      var r = N();
      let i;
      var a = s(r, !0);
      w(r),
        n(
          (e, n) => {
            h(r, `href`, u(t).href),
              (i = b(r, 1, `nav-link svelte-yic9pk`, null, i, e)),
              h(r, `aria-current`, n),
              T(a, u(t).label);
          },
          [() => ({ active: M(u(t).href) }), () => (M(u(t).href) ? `page` : void 0)],
        ),
        f(e, r);
    },
  ),
    w(H);
  var U = o(H, 2),
    W = o(s(U), 2),
    G = s(W),
    K = (e) => {
      f(e, P());
    },
    q = (e) => {
      f(e, F());
    };
  r(G, (e) => {
    u(S) ? e(K) : e(q, -1);
  }),
    w(W),
    w(U),
    w(B);
  var J = o(B, 2),
    Y = (e) => {
      var t = L();
      E(
        t,
        21,
        () => j,
        d,
        (e, t) => {
          var r = I();
          let i;
          var a = s(r, !0);
          w(r),
            n(
              (e, n) => {
                h(r, `href`, u(t).href),
                  (i = b(r, 1, `mobile-link svelte-yic9pk`, null, i, e)),
                  h(r, `aria-current`, n),
                  T(a, u(t).label);
              },
              [() => ({ active: M(u(t).href) }), () => (M(u(t).href) ? `page` : void 0)],
            ),
            v(`click`, r, O),
            f(e, r);
        },
      ),
        w(t),
        f(e, t);
    };
  r(J, (e) => {
    u(S) && e(Y);
  }),
    w(z),
    n(() => {
      h(W, `aria-label`, u(S) ? `Close menu` : `Open menu`), h(W, `aria-expanded`, u(S));
    }),
    v(`click`, W, D),
    f(t, z),
    C(),
    x();
}
t([`click`]);
var B = i(`<!> <main class="container"><!></main>`, 1);
function V(e, t) {
  _(t, !0),
    x(() => {
      O();
    });
  var n = B(),
    r = S(n);
  z(r, {});
  var i = o(r, 2);
  D(s(i), () => t.children), w(i), f(e, n), C();
}
export { V as component, j as universal };
