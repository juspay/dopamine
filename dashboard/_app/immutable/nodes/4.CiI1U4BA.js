import {
  $ as e,
  B as t,
  C as n,
  D as r,
  J as i,
  K as a,
  P as o,
  Q as s,
  R as c,
  T as l,
  W as u,
  _ as d,
  et as f,
  it as p,
  rt as m,
  st as h,
  w as g,
} from "../chunks/KQ3eEBfb.js";
import "../chunks/xihTtKlq.js";
import { a as _, o as v } from "../chunks/5wXqoPKv.js";
import { t as y } from "../chunks/DukFlL_f.js";
import { s as b } from "../chunks/WltnivmA.js";
import { c as x, t as S } from "../chunks/BcfutCr0.js";
import { t as C } from "../chunks/WJjxiR19.js";
import { t as w } from "../chunks/Bi4ZSEfO.js";
import { t as T } from "../chunks/Bd4orgHw.js";
var E = r(`<p class="full-name svelte-o5l84x"> </p>`),
  D = r(
    `<dl class="stats svelte-o5l84x"><div class="stat svelte-o5l84x"><dt class="stat-label svelte-o5l84x">Videos</dt> <dd class="stat-value svelte-o5l84x"> </dd></div> <div class="stat svelte-o5l84x"><dt class="stat-label svelte-o5l84x">Total likes</dt> <dd class="stat-value svelte-o5l84x"> </dd></div></dl>`,
  ),
  O = r(
    `<div class="creator-page svelte-o5l84x"><!> <header class="page-header svelte-o5l84x"><div class="identity svelte-o5l84x"><!> <div class="identity-text svelte-o5l84x"><h1 class="handle svelte-o5l84x"><span class="at svelte-o5l84x" aria-hidden="true">@</span> </h1> <!></div></div> <!></header> <!></div>`,
  );
function k(r, k) {
  p(k, !0);
  let A = () => f(y, `$page`, j),
    [j, M] = e(),
    N = s(() => A().params.name ?? ``),
    P = s(_),
    F = s(v),
    I = s(() => o(P).filter((e) => e.username === o(N))),
    L = s(() => o(I)[0]?.fullName ?? ``),
    R = s(() => o(I).length),
    z = s(() => o(I).reduce((e, t) => e + (t.likes ?? 0), 0)),
    B = s(() => [{ label: `Home`, href: `/` }, { label: `@${o(N)}` }]);
  var V = O();
  d(`o5l84x`, (e) => {
    c(() => {
      u.title = `@${o(N) ?? ``} — Dopamine`;
    });
  });
  var H = a(V);
  T(H, {
    get items() {
      return o(B);
    },
  });
  var U = i(H, 2),
    W = a(U),
    G = a(W);
  {
    let e = s(() => o(L) || o(N)),
      t = s(() => o(L) || o(N));
    x(G, {
      get alt() {
        return o(e);
      },
      get name() {
        return o(t);
      },
      size: `large`,
    });
  }
  var K = i(G, 2),
    q = a(K),
    J = i(a(q), 1, !0);
  h(q);
  var Y = i(q, 2),
    X = (e) => {
      var n = E(),
        r = a(n, !0);
      h(n), t(() => g(r, o(L))), l(e, n);
    };
  n(Y, (e) => {
    o(L) && e(X);
  }),
    h(K),
    h(W);
  var Z = i(W, 2),
    Q = (e) => {
      var n = D(),
        r = a(n),
        s = i(a(r), 2),
        c = a(s, !0);
      h(s), h(r);
      var u = i(r, 2),
        d = i(a(u), 2),
        f = a(d, !0);
      h(d),
        h(u),
        h(n),
        t(
          (e, t) => {
            g(c, e), g(f, t);
          },
          [() => b(o(R)), () => b(o(z))],
        ),
        l(e, n);
    };
  n(Z, (e) => {
    o(F) && o(R) > 0 && e(Q);
  }),
    h(U);
  var $ = i(U, 2),
    ee = (e) => {
      S(e, {});
    },
    te = (e) => {
      {
        let t = s(() => `No videos found for @${o(N)}.`);
        w(e, {
          get message() {
            return o(t);
          },
        });
      }
    },
    ne = (e) => {
      {
        let t = s(() => `No videos found for @${o(N)}.`);
        C(e, {
          get items() {
            return o(I);
          },
          get emptyMessage() {
            return o(t);
          },
        });
      }
    };
  n($, (e) => {
    o(F) ? (o(I).length === 0 ? e(te, 1) : e(ne, -1)) : e(ee);
  }),
    h(V),
    t(() => g(J, o(N))),
    l(r, V),
    m(),
    M();
}
export { k as component };
