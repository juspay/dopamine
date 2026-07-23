import {
  B as e,
  C as t,
  D as n,
  E as r,
  J as i,
  K as a,
  P as o,
  Q as s,
  S as c,
  T as l,
  V as u,
  X as d,
  Z as f,
  d as p,
  i as m,
  it as h,
  o as g,
  q as _,
  rt as v,
  st as y,
  w as b,
  x,
} from "./KQ3eEBfb.js";
import "./xihTtKlq.js";
import { a as S, o as C, s as w, t as T } from "./WltnivmA.js";
import { f as E } from "./BcfutCr0.js";
import { n as D, t as O } from "./8hiyGRUO.js";
import { n as k, t as A } from "./BF0F8NE4.js";
import { t as j } from "./Bi4ZSEfO.js";
var M = n(`<div class="overlay-dur svelte-t34n65"> </div>`),
  N = n(`<div class="tags-row svelte-t34n65"></div>`),
  P = n(`<div class="tags-row svelte-t34n65"></div>`),
  F = n(
    `<span class="footer-meta svelte-t34n65"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="vertical-align:middle;opacity:0.6"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg> </span>`,
  ),
  I = n(
    `<article class="video-card svelte-t34n65"><div class="thumb-wrap svelte-t34n65"><!> <div class="overlay-cat svelte-t34n65"><!></div> <!></div> <div class="card-body svelte-t34n65"><h3 class="title svelte-t34n65"><a class="title-link svelte-t34n65"> </a></h3> <div class="meta-row svelte-t34n65"><!></div> <!> <!> <div class="footer-row svelte-t34n65"><span class="footer-meta svelte-t34n65"> </span> <!> <!></div></div></article>`,
  );
function L(n, r) {
  h(r, !0);
  let u = s(() => r.record.tags.slice(0, 5)),
    d = s(() => (r.record.appliesTo ?? []).slice(0, 5)),
    f = s(() => C(r.record.durationSec)),
    m = s(() => S(r.record.date)),
    g = s(() => w(r.record.likes));
  var _ = I(),
    j = a(_),
    L = a(j);
  E(L, {
    get src() {
      return r.record.thumb;
    },
    get alt() {
      return r.record.title;
    },
    classes: `thumb-img`,
  });
  var R = i(L, 2);
  T(a(R), {
    get cat() {
      return r.record.category;
    },
  }),
    y(R);
  var z = i(R, 2),
    B = (t) => {
      var n = M(),
        r = a(n, !0);
      y(n), e(() => b(r, o(f))), l(t, n);
    };
  t(z, (e) => {
    r.record.durationSec > 0 && e(B);
  }),
    y(j);
  var V = i(j, 2),
    H = a(V),
    U = a(H),
    W = a(U, !0);
  y(U), y(H);
  var G = i(H, 2);
  O(a(G), {
    get name() {
      return r.record.username;
    },
    get fullName() {
      return r.record.fullName;
    },
  }),
    y(G);
  var K = i(G, 2),
    q = (e) => {
      var t = N();
      x(
        t,
        21,
        () => o(u),
        c,
        (e, t) => {
          D(e, {
            get tag() {
              return o(t);
            },
          });
        },
      ),
        y(t),
        l(e, t);
    };
  t(K, (e) => {
    o(u).length > 0 && e(q);
  });
  var J = i(K, 2),
    Y = (e) => {
      var t = P();
      x(
        t,
        21,
        () => o(d),
        c,
        (e, t) => {
          k(e, {
            get project() {
              return o(t);
            },
          });
        },
      ),
        y(t),
        l(e, t);
    };
  t(J, (e) => {
    o(d).length > 0 && e(Y);
  });
  var X = i(J, 2),
    Z = a(X),
    Q = a(Z, !0);
  y(Z);
  var $ = i(Z, 2),
    ee = (t) => {
      var n = F(),
        r = i(a(n));
      y(n), e(() => b(r, ` ${o(g) ?? ``}`)), l(t, n);
    };
  t($, (e) => {
    r.record.likes > 0 && e(ee);
  }),
    A(i($, 2), {
      get score() {
        return r.record.verification;
      },
      get confidence() {
        return r.record.confidence;
      },
      size: `dot`,
    }),
    y(X),
    y(V),
    y(_),
    e(
      (e) => {
        p(U, `href`, e), b(W, r.record.title), b(Q, o(m));
      },
      [() => `/video/` + encodeURIComponent(r.record.id)],
    ),
    l(n, _),
    v();
}
var R = n(`<div class="sentinel svelte-16xszx7" aria-hidden="true"></div>`),
  z = n(`<div class="grid svelte-16xszx7"></div> <!>`, 1);
function B(e, n) {
  h(n, !0);
  let a = m(n, `emptyMessage`, 3, `No videos found.`),
    c = f(48);
  u(() => {
    n.items, d(c, 48);
  });
  let p = s(() => n.items.slice(0, o(c))),
    b = s(() => o(c) < n.items.length),
    S = f(void 0);
  u(() => {
    if (!o(S) || !o(b)) return;
    let e = new IntersectionObserver(
      (e) => {
        e[0]?.isIntersecting && d(c, Math.min(o(c) + 48, n.items.length), !0);
      },
      { rootMargin: `200px` },
    );
    return e.observe(o(S)), () => e.disconnect();
  });
  var C = r(),
    w = _(C),
    T = (e) => {
      j(e, {
        get message() {
          return a();
        },
      });
    },
    E = (e) => {
      var n = z(),
        r = _(n);
      x(
        r,
        21,
        () => o(p),
        (e) => e.id,
        (e, t) => {
          L(e, {
            get record() {
              return o(t);
            },
          });
        },
      ),
        y(r);
      var a = i(r, 2),
        s = (e) => {
          var t = R();
          g(
            t,
            (e) => d(S, e),
            () => o(S),
          ),
            l(e, t);
        };
      t(a, (e) => {
        o(b) && e(s);
      }),
        l(e, n);
    };
  t(w, (e) => {
    n.items.length === 0 ? e(T) : e(E, -1);
  }),
    l(e, C),
    v();
}
export { B as t };
