import {
  B as e,
  D as t,
  E as n,
  H as r,
  I as i,
  T as a,
  Y as o,
  Z as s,
  ct as c,
  dt as l,
  it as u,
  k as d,
  nt as f,
  q as p,
  rt as m,
  st as h,
  y as g,
} from "../chunks/BZ84wCgC.js";
import "../chunks/xihTtKlq.js";
import { a as _, o as v } from "../chunks/CdnViQ5q.js";
import { t as y } from "../chunks/D5x1uFyw.js";
import { s as b } from "../chunks/bfCGhs6S.js";
import { c as x, t as S } from "../chunks/Dt5KBvTb.js";
import { t as C } from "../chunks/BPB2CjVM.js";
import { t as w } from "../chunks/BbG86UsG.js";
import { t as T } from "../chunks/CyjB8bAN.js";
var E = d(`<p class="full-name svelte-o5l84x"> </p>`),
  D = d(
    `<dl class="stats svelte-o5l84x"><div class="stat svelte-o5l84x"><dt class="stat-label svelte-o5l84x">Videos</dt> <dd class="stat-value svelte-o5l84x"> </dd></div> <div class="stat svelte-o5l84x"><dt class="stat-label svelte-o5l84x">Total likes</dt> <dd class="stat-value svelte-o5l84x"> </dd></div></dl>`,
  ),
  O = d(
    `<div class="creator-page svelte-o5l84x"><!> <header class="page-header svelte-o5l84x"><div class="identity svelte-o5l84x"><!> <div class="identity-text svelte-o5l84x"><h1 class="handle svelte-o5l84x"><span class="at svelte-o5l84x" aria-hidden="true">@</span> </h1> <!></div></div> <!></header> <!></div>`,
  );
function k(d, k) {
  c(k, !0);
  let A = () => u(y, `$page`, j),
    [j, M] = m(),
    N = f(() => A().params.name ?? ``),
    P = f(_),
    F = f(v),
    I = f(() => i(P).filter((e) => e.username === i(N))),
    L = f(() => i(I)[0]?.fullName ?? ``),
    R = f(() => i(I).length),
    z = f(() => i(I).reduce((e, t) => e + (t.likes ?? 0), 0)),
    B = f(() => [{ label: `Home`, href: `/` }, { label: `@${i(N)}` }]);
  var V = O();
  g(`o5l84x`, (t) => {
    e(() => {
      p.title = `@${i(N) ?? ``} — Dopamine`;
    });
  });
  var H = o(V);
  T(H, {
    get items() {
      return i(B);
    },
  });
  var U = s(H, 2),
    W = o(U),
    G = o(W);
  {
    let e = f(() => i(L) || i(N)),
      t = f(() => i(L) || i(N));
    x(G, {
      get alt() {
        return i(e);
      },
      get name() {
        return i(t);
      },
      size: `large`,
    });
  }
  var K = s(G, 2),
    q = o(K),
    J = s(o(q), 1, !0);
  l(q);
  var Y = s(q, 2),
    X = (e) => {
      var a = E(),
        s = o(a, !0);
      l(a), r(() => n(s, i(L))), t(e, a);
    };
  a(Y, (e) => {
    i(L) && e(X);
  }),
    l(K),
    l(W);
  var Z = s(W, 2),
    Q = (e) => {
      var a = D(),
        c = o(a),
        u = s(o(c), 2),
        d = o(u, !0);
      l(u), l(c);
      var f = s(c, 2),
        p = s(o(f), 2),
        m = o(p, !0);
      l(p),
        l(f),
        l(a),
        r(
          (e, t) => {
            n(d, e), n(m, t);
          },
          [() => b(i(R)), () => b(i(z))],
        ),
        t(e, a);
    };
  a(Z, (e) => {
    i(F) && i(R) > 0 && e(Q);
  }),
    l(U);
  var $ = s(U, 2),
    ee = (e) => {
      S(e, {});
    },
    te = (e) => {
      {
        let t = f(() => `No videos found for @${i(N)}.`);
        w(e, {
          get message() {
            return i(t);
          },
        });
      }
    },
    ne = (e) => {
      {
        let t = f(() => `No videos found for @${i(N)}.`);
        C(e, {
          get items() {
            return i(I);
          },
          get emptyMessage() {
            return i(t);
          },
        });
      }
    };
  a($, (e) => {
    i(F) ? (i(I).length === 0 ? e(te, 1) : e(ne, -1)) : e(ee);
  }),
    l(V),
    r(() => n(J, i(N))),
    t(d, V),
    h(),
    M();
}
export { k as component };
