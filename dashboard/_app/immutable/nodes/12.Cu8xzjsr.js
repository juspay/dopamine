import {
  $ as e,
  A as t,
  B as n,
  C as r,
  D as i,
  J as a,
  K as o,
  P as s,
  Q as c,
  S as l,
  T as u,
  V as d,
  X as f,
  Y as p,
  Z as m,
  d as h,
  et as g,
  it as ee,
  j as _,
  m as v,
  p as y,
  rt as te,
  st as b,
  w as x,
  x as S,
} from "../chunks/KQ3eEBfb.js";
import { t as ne } from "../chunks/BHIZHYj4.js";
import "../chunks/xihTtKlq.js";
import { a as re, l as ie, o as ae, r as oe } from "../chunks/5wXqoPKv.js";
import { t as se } from "../chunks/DukFlL_f.js";
import "../chunks/Cd4YZbZJ.js";
import { i as ce, l as C, r as le } from "../chunks/WltnivmA.js";
import { m as ue, t as de, u as fe } from "../chunks/BcfutCr0.js";
import { t as pe } from "../chunks/WJjxiR19.js";
var me = i(`<span class="count-badge svelte-yxunt"> </span>`),
  he = i(`<button class="clear-btn svelte-yxunt" type="button">Clear filters</button>`),
  ge = i(`<button type="button"> </button>`),
  _e = i(`<button type="button"> </button>`),
  ve = i(`<div class="cat-chips svelte-yxunt" role="group" aria-label="Filter by category"></div>`),
  ye = i(`<button type="button"> </button>`),
  be = i(`<div class="cat-chips svelte-yxunt" role="group" aria-label="Filter by project"></div>`),
  xe = i(`<span class="verif-dot svelte-yxunt" aria-hidden="true"></span>`),
  Se = i(`<button type="button"><!> </button>`),
  Ce = i(
    `<div class="library-page svelte-yxunt"><div class="page-header svelte-yxunt"><div class="header-left svelte-yxunt"><h1 class="page-title svelte-yxunt">Library</h1> <!></div> <!></div> <div class="controls svelte-yxunt"><div class="search-wrap svelte-yxunt"><!></div> <div class="select-wrap svelte-yxunt"><!></div> <!></div> <!> <!> <div class="verif-pills svelte-yxunt" role="group" aria-label="Filter by verification"></div> <div class="results svelte-yxunt"><!></div></div>`,
  );
function w(t, i) {
  ee(i, !0);
  let w = () => g(se, `$page`, we),
    [we, Te] = e();
  d(() => {
    ie();
  });
  let T = c(re),
    E = c(ae),
    D = c(oe),
    O = c(() => w().url.searchParams),
    k = m(``),
    A = m(p([])),
    j = m(p([])),
    M = m(`all`),
    N = m(`best`),
    P = m(!1);
  d(() => {
    f(k, s(O).get(`q`) ?? ``, !0),
      f(M, s(O).get(`verif`) ?? `all`, !0),
      f(N, s(O).get(`sort`) ?? `best`, !0),
      f(P, s(O).get(`thin`) === `1`);
    let e = s(O).get(`cat`);
    f(A, e ? e.split(`,`).filter(Boolean) : [], !0);
    let t = s(O).get(`project`);
    f(j, t ? t.split(`,`).filter(Boolean) : [], !0);
  });
  function F() {
    let e = new URL(w().url);
    s(k).trim() ? e.searchParams.set(`q`, s(k).trim()) : e.searchParams.delete(`q`),
      s(A).length ? e.searchParams.set(`cat`, s(A).join(`,`)) : e.searchParams.delete(`cat`),
      s(j).length ? e.searchParams.set(`project`, s(j).join(`,`)) : e.searchParams.delete(`project`),
      s(M) === `all` ? e.searchParams.delete(`verif`) : e.searchParams.set(`verif`, s(M)),
      s(N) === `best` ? e.searchParams.delete(`sort`) : e.searchParams.set(`sort`, s(N)),
      s(P) ? e.searchParams.set(`thin`, `1`) : e.searchParams.delete(`thin`),
      ne(e.toString(), { replaceState: !0, keepFocus: !0, noScroll: !0 });
  }
  let I = c(() => (s(D) ? s(D).categories.map((e) => e.name) : [...new Set(s(T).map((e) => e.category))].sort())),
    L = c(() => s(D)?.projects?.map((e) => e.name) ?? []),
    Ee = [
      { value: `all`, label: `All` },
      { value: `verified_useful`, label: `Verified` },
      { value: `partially_verified`, label: `Partial` },
      { value: `not_verified`, label: `Unverified` },
      { value: `outdated`, label: `Outdated` },
      { value: `unknown`, label: `Not analysed` },
    ],
    R = [
      { id: `best`, label: `Best first` },
      { id: `date-desc`, label: `Newest first` },
      { id: `date-asc`, label: `Oldest first` },
      { id: `dur-desc`, label: `Longest first` },
      { id: `likes-desc`, label: `Most liked` },
      { id: `cat-asc`, label: `Category A–Z` },
    ],
    z = { featured: 0, standard: 1, thin: 2 };
  function B(e) {
    let t = s(k).trim().toLowerCase();
    return !(
      (t &&
        ![e.title, e.username, e.fullName, e.category, e.subcategory, ...e.tags].join(` `).toLowerCase().includes(t)) ||
      (s(A).length && !s(A).includes(e.category)) ||
      (s(j).length && !s(j).some((t) => (e.appliesTo ?? []).includes(t))) ||
      (s(M) !== `all` && e.verification !== s(M))
    );
  }
  let V = c(() => () => {
    let e = s(T).filter((e) => B(e) && (s(P) || e.tier !== `thin`));
    switch (s(N)) {
      case `best`:
        e = [...e].sort((e, t) => z[e.tier] - z[t.tier] || t.quality - e.quality || t.date.localeCompare(e.date));
        break;
      case `date-asc`:
        e = [...e].sort((e, t) => e.date.localeCompare(t.date));
        break;
      case `date-desc`:
        e = [...e].sort((e, t) => t.date.localeCompare(e.date));
        break;
      case `dur-desc`:
        e = [...e].sort((e, t) => t.durationSec - e.durationSec);
        break;
      case `likes-desc`:
        e = [...e].sort((e, t) => t.likes - e.likes);
        break;
      case `cat-asc`:
        e = [...e].sort((e, t) => e.category.localeCompare(t.category));
        break;
    }
    return e;
  });
  function De(e) {
    f(A, s(A).includes(e) ? s(A).filter((t) => t !== e) : [...s(A), e], !0), F();
  }
  function Oe(e) {
    f(j, s(j).includes(e) ? s(j).filter((t) => t !== e) : [...s(j), e], !0), F();
  }
  function ke() {
    f(k, ``), f(A, [], !0), f(j, [], !0), f(M, `all`), f(N, `best`), f(P, !1), F();
  }
  function Ae() {
    f(P, !s(P)), F();
  }
  let H = c(() => (s(P) ? 0 : s(T).filter((e) => e.tier === `thin` && B(e)).length));
  function je(e) {
    let t = e[0];
    t && t !== s(N) && (f(N, t, !0), F());
  }
  let U = c(
    () => s(k).trim() !== `` || s(A).length > 0 || s(j).length > 0 || s(M) !== `all` || s(N) !== `best` || s(P),
  );
  var W = Ce(),
    G = o(W),
    K = o(G),
    Me = a(o(K), 2),
    Ne = (e) => {
      var t = me(),
        r = o(t, !0);
      b(t), n((e) => x(r, e), [() => s(V)().length.toLocaleString()]), u(e, t);
    };
  r(Me, (e) => {
    s(E) && e(Ne);
  }),
    b(K);
  var Pe = a(K, 2),
    Fe = (e) => {
      var t = he();
      _(`click`, t, ke), u(e, t);
    };
  r(Pe, (e) => {
    s(U) && e(Fe);
  }),
    b(G);
  var q = a(G, 2),
    J = o(q);
  ue(o(J), {
    get value() {
      return s(k);
    },
    placeholder: `Search titles, creators, tags…`,
    addFocusColor: !0,
    autoComplete: `off`,
    onInput: (e) => {
      f(k, e, !0), F();
    },
    classes: `videos-search-input`,
  }),
    b(J);
  var Y = a(J, 2),
    Ie = o(Y);
  {
    let e = c(() => [s(N)]);
    fe(Ie, {
      get items() {
        return R;
      },
      get value() {
        return s(e);
      },
      onchange: je,
      classes: `videos-sort-select`,
    });
  }
  b(Y);
  var Le = a(Y, 2),
    Re = (e) => {
      var t = ge();
      let r;
      var i = o(t, !0);
      b(t),
        n(() => {
          (r = v(t, 1, `thin-toggle svelte-yxunt`, null, r, { active: s(P) })),
            h(t, `aria-pressed`, s(P)),
            x(i, s(P) ? `Hide low-quality` : `Show ${s(H)} low-quality`);
        }),
        _(`click`, t, Ae),
        u(e, t);
    };
  r(Le, (e) => {
    (s(P) || s(H) > 0) && e(Re);
  }),
    b(q);
  var X = a(q, 2),
    ze = (e) => {
      var t = ve();
      S(
        t,
        21,
        () => s(I),
        l,
        (e, t) => {
          let r = c(() => s(A).includes(s(t)));
          var i = _e();
          let a;
          var l = o(i, !0);
          b(i),
            n(
              (e, n) => {
                (a = v(i, 1, `cat-chip svelte-yxunt`, null, a, { active: s(r) })),
                  h(i, `aria-pressed`, s(r)),
                  y(i, `--chip-color:${e ?? ``};--chip-bg:${n ?? ``}`),
                  x(l, s(t));
              },
              [() => ce(s(t)), () => le(s(t))],
            ),
            _(`click`, i, () => De(s(t))),
            u(e, i);
        },
      ),
        b(t),
        u(e, t);
    };
  r(X, (e) => {
    s(I).length > 0 && e(ze);
  });
  var Z = a(X, 2),
    Be = (e) => {
      var t = be();
      S(
        t,
        21,
        () => s(L),
        l,
        (e, t) => {
          let r = c(() => s(j).includes(s(t)));
          var i = ye();
          let a;
          var l = o(i);
          b(i),
            n(() => {
              (a = v(i, 1, `cat-chip svelte-yxunt`, null, a, { active: s(r) })),
                h(i, `aria-pressed`, s(r)),
                x(l, `→ ${s(t) ?? ``}`);
            }),
            _(`click`, i, () => Oe(s(t))),
            u(e, i);
        },
      ),
        b(t),
        u(e, t);
    };
  r(Z, (e) => {
    s(L).length > 0 && e(Be);
  });
  var Q = a(Z, 2);
  S(
    Q,
    21,
    () => Ee,
    l,
    (e, t) => {
      let i = c(() => s(M) === s(t).value);
      var l = Se();
      let d;
      var p = o(l),
        m = (e) => {
          var r = xe();
          n((e) => y(r, `background:${e ?? ``}`), [() => C(s(t).value)]), u(e, r);
        };
      r(p, (e) => {
        s(t).value !== `all` && e(m);
      });
      var g = a(p);
      b(l),
        n(
          (e) => {
            (d = v(l, 1, `verif-pill svelte-yxunt`, null, d, { active: s(i) })),
              h(l, `aria-pressed`, s(i)),
              y(l, e),
              x(g, ` ${s(t).label ?? ``}`);
          },
          [() => (s(t).value === `all` ? `` : `--pill-color:${C(s(t).value)}`)],
        ),
        _(`click`, l, () => {
          f(M, s(t).value, !0), F();
        }),
        u(e, l);
    },
  ),
    b(Q);
  var $ = a(Q, 2),
    Ve = o($),
    He = (e) => {
      de(e, { label: `Loading library…` });
    },
    Ue = (e) => {
      {
        let t = c(() => s(V)()),
          n = c(() => (s(U) ? `No videos match your filters. Try adjusting or clearing them.` : `No videos found.`));
        pe(e, {
          get items() {
            return s(t);
          },
          get emptyMessage() {
            return s(n);
          },
        });
      }
    };
  r(Ve, (e) => {
    s(E) ? e(Ue, -1) : e(He);
  }),
    b($),
    b(W),
    u(t, W),
    te(),
    Te();
}
t([`click`]);
export { w as component };
