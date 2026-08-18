import {
  $ as e,
  A as t,
  C as n,
  D as r,
  E as i,
  H as a,
  I as o,
  J as s,
  M as c,
  N as l,
  P as u,
  T as d,
  X as f,
  Y as p,
  Z as m,
  ct as h,
  dt as g,
  et as _,
  f as v,
  g as y,
  it as b,
  k as x,
  n as S,
  pt as C,
  rt as w,
  st as T,
  w as E,
  x as D,
} from "../chunks/BZ84wCgC.js";
import "../chunks/xihTtKlq.js";
import { u as O } from "../chunks/CdnViQ5q.js";
import { t as k } from "../chunks/D5x1uFyw.js";
import { t as A } from "../chunks/tSv2dGBu.js";
var j = C({ prerender: () => !1, ssr: () => !1, trailingSlash: () => M }),
  M = `never`,
  N = x(`<a> </a>`),
  P = t(
    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"></path></svg>`,
  ),
  F = t(
    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"></path></svg>`,
  ),
  I = x(`<a> </a>`),
  L = x(`<nav id="mobile-menu" class="nav-mobile svelte-yic9pk" aria-label="Mobile navigation"></nav>`),
  R = x(
    `<header class="topbar svelte-yic9pk"><div class="topbar-inner svelte-yic9pk"><a href="/" class="logo svelte-yic9pk" aria-label="Dopamine home"><span class="logo-dot svelte-yic9pk" aria-hidden="true">◉</span> Dopamine</a> <div class="search-wrap svelte-yic9pk"><!></div> <nav class="nav-desktop svelte-yic9pk" aria-label="Main navigation"></nav> <div class="mobile-controls svelte-yic9pk"><a href="/search" class="icon-btn svelte-yic9pk" aria-label="Search"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg></a> <button class="icon-btn hamburger svelte-yic9pk" aria-controls="mobile-menu"><!></button></div></div> <!></header>`,
  );
function z(t, c) {
  h(c, !0);
  let f = () => b(k, `$page`, x),
    [x, S] = w(),
    C = _(!1);
  function D() {
    e(C, !o(C));
  }
  function O() {
    e(C, !1);
  }
  let j = [
    { href: `/`, label: `Home` },
    { href: `/videos`, label: `Videos` },
    { href: `/tools`, label: `Tools` },
    { href: `/kb`, label: `Knowledge` },
    { href: `/review`, label: `Review` },
  ];
  function M(e) {
    let t = f().url.pathname;
    return e === `/` ? t === `/` : t.startsWith(e);
  }
  var z = R();
  u(`click`, s, (e) => {
    e.target.closest(`.topbar`) || O();
  });
  var B = p(z),
    V = m(p(B), 2);
  A(p(V), {}), g(V);
  var H = m(V, 2);
  n(
    H,
    21,
    () => j,
    E,
    (e, t) => {
      var n = N();
      let s;
      var c = p(n, !0);
      g(n),
        a(
          (e, r) => {
            v(n, `href`, o(t).href),
              (s = y(n, 1, `nav-link svelte-yic9pk`, null, s, e)),
              v(n, `aria-current`, r),
              i(c, o(t).label);
          },
          [() => ({ active: M(o(t).href) }), () => (M(o(t).href) ? `page` : void 0)],
        ),
        r(e, n);
    },
  ),
    g(H);
  var U = m(H, 2),
    W = m(p(U), 2),
    G = p(W),
    K = (e) => {
      r(e, P());
    },
    q = (e) => {
      r(e, F());
    };
  d(G, (e) => {
    o(C) ? e(K) : e(q, -1);
  }),
    g(W),
    g(U),
    g(B);
  var J = m(B, 2),
    Y = (e) => {
      var t = L();
      n(
        t,
        21,
        () => j,
        E,
        (e, t) => {
          var n = I();
          let s;
          var c = p(n, !0);
          g(n),
            a(
              (e, r) => {
                v(n, `href`, o(t).href),
                  (s = y(n, 1, `mobile-link svelte-yic9pk`, null, s, e)),
                  v(n, `aria-current`, r),
                  i(c, o(t).label);
              },
              [() => ({ active: M(o(t).href) }), () => (M(o(t).href) ? `page` : void 0)],
            ),
            l(`click`, n, O),
            r(e, n);
        },
      ),
        g(t),
        r(e, t);
    };
  d(J, (e) => {
    o(C) && e(Y);
  }),
    g(z),
    a(() => {
      v(W, `aria-label`, o(C) ? `Close menu` : `Open menu`), v(W, `aria-expanded`, o(C));
    }),
    l(`click`, W, D),
    r(t, z),
    T(),
    S();
}
c([`click`]);
var B = x(`<!> <main class="container"><!></main>`, 1);
function V(e, t) {
  h(t, !0),
    S(() => {
      O();
    });
  var n = B(),
    i = f(n);
  z(i, {});
  var a = m(i, 2);
  D(p(a), () => t.children), g(a), r(e, n), T();
}
export { V as component, j as universal };
