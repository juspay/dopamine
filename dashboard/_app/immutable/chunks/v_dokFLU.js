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
import { a as S, l as C, o as w, s as T, t as E } from "./DLokxzUJ.js";
import { f as D } from "./Dt5KBvTb.js";
import { n as ee, t as te } from "./BxqmUSMk.js";
import { t as ne } from "./DrAFDkqO.js";
import { t as O } from "./Cl_I9Zju.js";
import { t as k } from "./BbG86UsG.js";
var A = _(`<div class="thumb-placeholder svelte-t34n65" aria-hidden="true"> </div>`),
  j = _(`<div class="overlay-src svelte-t34n65"> </div>`),
  M = _(`<div class="overlay-dur svelte-t34n65"> </div>`),
  N = _(`<div class="tags-row svelte-t34n65"></div>`),
  P = _(`<div class="tags-row svelte-t34n65"></div>`),
  F = _(
    `<span class="footer-meta svelte-t34n65"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="vertical-align:middle;opacity:0.6"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg> </span>`,
  ),
  re = _(
    `<article class="video-card svelte-t34n65"><div class="thumb-wrap svelte-t34n65"><!> <div class="overlay-cat svelte-t34n65"><!></div> <!> <!></div> <div class="card-body svelte-t34n65"><h3 class="title svelte-t34n65"><a class="title-link svelte-t34n65"> </a></h3> <div class="meta-row svelte-t34n65"><!></div> <!> <!> <div class="footer-row svelte-t34n65"><span class="footer-meta svelte-t34n65"> </span> <!> <!></div></div></article>`,
  );
function I(e, o) {
  f(o, !0);
  let c = v(() => o.record.tags.slice(0, 5)),
    l = v(() => (o.record.appliesTo ?? []).slice(0, 5)),
    m = v(() => w(o.record.durationSec)),
    g = v(() => S(o.record.date)),
    _ = v(() => T(o.record.likes));
  var y = re(),
    k = u(y),
    I = u(k),
    L = (e) => {
      D(e, {
        get src() {
          return o.record.thumb;
        },
        get alt() {
          return o.record.title;
        },
        classes: `thumb-img`,
      });
    },
    R = (e) => {
      var t = A(),
        a = u(t, !0);
      p(t), i((e) => r(a, e), [() => C(o.record.source)]), n(e, t);
    };
  s(I, (e) => {
    o.record.thumb ? e(L) : e(R, -1);
  });
  var z = d(I, 2);
  E(u(z), {
    get cat() {
      return o.record.category;
    },
  }),
    p(z);
  var B = d(z, 2),
    V = (e) => {
      var t = j(),
        a = u(t, !0);
      p(t), i((e) => r(a, e), [() => C(o.record.source)]), n(e, t);
    };
  s(B, (e) => {
    o.record.source && o.record.source !== `instagram` && e(V);
  });
  var H = d(B, 2),
    U = (e) => {
      var t = M(),
        o = u(t, !0);
      p(t), i(() => r(o, a(m))), n(e, t);
    };
  s(H, (e) => {
    o.record.durationSec > 0 && e(U);
  }),
    p(k);
  var W = d(k, 2),
    G = u(W),
    K = u(G),
    q = u(K, !0);
  p(K), p(G);
  var J = d(G, 2);
  te(u(J), {
    get name() {
      return o.record.username;
    },
    get fullName() {
      return o.record.fullName;
    },
  }),
    p(J);
  var Y = d(J, 2),
    ie = (e) => {
      var r = N();
      t(
        r,
        21,
        () => a(c),
        x,
        (e, t) => {
          ee(e, {
            get tag() {
              return a(t);
            },
          });
        },
      ),
        p(r),
        n(e, r);
    };
  s(Y, (e) => {
    a(c).length > 0 && e(ie);
  });
  var X = d(Y, 2),
    ae = (e) => {
      var r = P();
      t(
        r,
        21,
        () => a(l),
        x,
        (e, t) => {
          ne(e, {
            get project() {
              return a(t);
            },
          });
        },
      ),
        p(r),
        n(e, r);
    };
  s(X, (e) => {
    a(l).length > 0 && e(ae);
  });
  var Z = d(X, 2),
    Q = u(Z),
    oe = u(Q, !0);
  p(Q);
  var $ = d(Q, 2),
    se = (e) => {
      var t = F(),
        o = d(u(t));
      p(t), i(() => r(o, ` ${a(_) ?? ``}`)), n(e, t);
    };
  s($, (e) => {
    o.record.likes > 0 && e(se);
  }),
    O(d($, 2), {
      get score() {
        return o.record.verification;
      },
      get confidence() {
        return o.record.confidence;
      },
      size: `dot`,
    }),
    p(Z),
    p(W),
    p(y),
    i(
      (e) => {
        h(K, `href`, e), r(q, o.record.title), r(oe, a(g));
      },
      [() => `/video/` + encodeURIComponent(o.record.id)],
    ),
    n(e, y),
    b();
}
var L = _(`<div class="sentinel svelte-16xszx7" aria-hidden="true"></div>`),
  R = _(`<div class="grid svelte-16xszx7"></div> <!>`, 1);
function z(r, i) {
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
      k(e, {
        get message() {
          return u();
        },
      });
    },
    E = (r) => {
      var i = R(),
        o = l(i);
      t(
        o,
        21,
        () => a(_),
        (e) => e.id,
        (e, t) => {
          I(e, {
            get record() {
              return a(t);
            },
          });
        },
      ),
        p(o);
      var c = d(o, 2),
        u = (t) => {
          var r = L();
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
export { z as t };
