import {
  $ as e,
  C as t,
  D as n,
  E as r,
  H as i,
  I as a,
  O as o,
  T as s,
  U as c,
  X as l,
  Y as u,
  Z as d,
  ct as f,
  dt as p,
  et as m,
  f as h,
  i as g,
  k as _,
  nt as v,
  o as y,
  st as b,
  w as x,
} from "./BZ84wCgC.js";
import "./xihTtKlq.js";
import { a as S, o as C, s as w, t as T } from "./bfCGhs6S.js";
import { f as E } from "./Dt5KBvTb.js";
import { n as D, t as O } from "./Bljx9-9G.js";
import { n as k, t as A } from "./C_PJEGaj.js";
import { t as j } from "./BbG86UsG.js";
var M = _(`<div class="overlay-dur svelte-t34n65"> </div>`),
  N = _(`<div class="tags-row svelte-t34n65"></div>`),
  P = _(`<div class="tags-row svelte-t34n65"></div>`),
  F = _(
    `<span class="footer-meta svelte-t34n65"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="vertical-align:middle;opacity:0.6"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg> </span>`,
  ),
  I = _(
    `<article class="video-card svelte-t34n65"><div class="thumb-wrap svelte-t34n65"><!> <div class="overlay-cat svelte-t34n65"><!></div> <!></div> <div class="card-body svelte-t34n65"><h3 class="title svelte-t34n65"><a class="title-link svelte-t34n65"> </a></h3> <div class="meta-row svelte-t34n65"><!></div> <!> <!> <div class="footer-row svelte-t34n65"><span class="footer-meta svelte-t34n65"> </span> <!> <!></div></div></article>`,
  );
function L(e, o) {
  f(o, !0);
  let c = v(() => o.record.tags.slice(0, 5)),
    l = v(() => (o.record.appliesTo ?? []).slice(0, 5)),
    m = v(() => C(o.record.durationSec)),
    g = v(() => S(o.record.date)),
    _ = v(() => w(o.record.likes));
  var y = I(),
    j = u(y),
    L = u(j);
  E(L, {
    get src() {
      return o.record.thumb;
    },
    get alt() {
      return o.record.title;
    },
    classes: `thumb-img`,
  });
  var R = d(L, 2);
  T(u(R), {
    get cat() {
      return o.record.category;
    },
  }),
    p(R);
  var z = d(R, 2),
    B = (e) => {
      var t = M(),
        o = u(t, !0);
      p(t), i(() => r(o, a(m))), n(e, t);
    };
  s(z, (e) => {
    o.record.durationSec > 0 && e(B);
  }),
    p(j);
  var V = d(j, 2),
    H = u(V),
    U = u(H),
    W = u(U, !0);
  p(U), p(H);
  var G = d(H, 2);
  O(u(G), {
    get name() {
      return o.record.username;
    },
    get fullName() {
      return o.record.fullName;
    },
  }),
    p(G);
  var K = d(G, 2),
    q = (e) => {
      var r = N();
      t(
        r,
        21,
        () => a(c),
        x,
        (e, t) => {
          D(e, {
            get tag() {
              return a(t);
            },
          });
        },
      ),
        p(r),
        n(e, r);
    };
  s(K, (e) => {
    a(c).length > 0 && e(q);
  });
  var J = d(K, 2),
    Y = (e) => {
      var r = P();
      t(
        r,
        21,
        () => a(l),
        x,
        (e, t) => {
          k(e, {
            get project() {
              return a(t);
            },
          });
        },
      ),
        p(r),
        n(e, r);
    };
  s(J, (e) => {
    a(l).length > 0 && e(Y);
  });
  var X = d(J, 2),
    Z = u(X),
    Q = u(Z, !0);
  p(Z);
  var $ = d(Z, 2),
    ee = (e) => {
      var t = F(),
        o = d(u(t));
      p(t), i(() => r(o, ` ${a(_) ?? ``}`)), n(e, t);
    };
  s($, (e) => {
    o.record.likes > 0 && e(ee);
  }),
    A(d($, 2), {
      get score() {
        return o.record.verification;
      },
      get confidence() {
        return o.record.confidence;
      },
      size: `dot`,
    }),
    p(X),
    p(V),
    p(y),
    i(
      (e) => {
        h(U, `href`, e), r(W, o.record.title), r(Q, a(g));
      },
      [() => `/video/` + encodeURIComponent(o.record.id)],
    ),
    n(e, y),
    b();
}
var R = _(`<div class="sentinel svelte-16xszx7" aria-hidden="true"></div>`),
  z = _(`<div class="grid svelte-16xszx7"></div> <!>`, 1);
function B(r, i) {
  f(i, !0);
  let u = g(i, `emptyMessage`, 3, `No videos found.`),
    h = m(48);
  c(() => {
    i.items, e(h, 48);
  });
  let _ = v(() => i.items.slice(0, a(h))),
    x = v(() => a(h) < i.items.length),
    S = m(void 0);
  c(() => {
    if (!a(S) || !a(x)) return;
    let t = new IntersectionObserver(
      (t) => {
        t[0]?.isIntersecting && e(h, Math.min(a(h) + 48, i.items.length), !0);
      },
      { rootMargin: `200px` },
    );
    return t.observe(a(S)), () => t.disconnect();
  });
  var C = o(),
    w = l(C),
    T = (e) => {
      j(e, {
        get message() {
          return u();
        },
      });
    },
    E = (r) => {
      var i = z(),
        o = l(i);
      t(
        o,
        21,
        () => a(_),
        (e) => e.id,
        (e, t) => {
          L(e, {
            get record() {
              return a(t);
            },
          });
        },
      ),
        p(o);
      var c = d(o, 2),
        u = (t) => {
          var r = R();
          y(
            r,
            (t) => e(S, t),
            () => a(S),
          ),
            n(t, r);
        };
      s(c, (e) => {
        a(x) && e(u);
      }),
        n(r, i);
    };
  s(w, (e) => {
    i.items.length === 0 ? e(T) : e(E, -1);
  }),
    n(r, C),
    b();
}
export { B as t };
