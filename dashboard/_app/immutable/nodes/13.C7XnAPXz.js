import {
  $ as e,
  C as t,
  D as n,
  E as r,
  H as i,
  I as a,
  M as o,
  N as s,
  Q as c,
  T as l,
  U as u,
  Y as d,
  Z as f,
  ct as p,
  dt as m,
  et as h,
  f as g,
  g as _,
  h as v,
  it as y,
  k as b,
  nt as x,
  rt as ee,
  st as te,
  w as S,
} from "../chunks/BZ84wCgC.js";
import { t as ne } from "../chunks/CavVGUas.js";
import "../chunks/xihTtKlq.js";
import { a as re, l as ie, o as ae, r as oe } from "../chunks/CdnViQ5q.js";
import { t as se } from "../chunks/BnXMJaDQ.js";
import "../chunks/g0KpAiwe.js";
import { i as ce, r as le, u as C } from "../chunks/DJJkK5-l.js";
import { m as ue, t as de, u as fe } from "../chunks/Dt5KBvTb.js";
import { t as pe } from "../chunks/C-AURLHu.js";
var me = b(`<span class="count-badge svelte-yxunt"> </span>`),
  he = b(`<button class="clear-btn svelte-yxunt" type="button">Clear filters</button>`),
  ge = b(`<button type="button"> </button>`),
  _e = b(`<button type="button"> <span class="cat-chip-count svelte-yxunt"> </span></button>`),
  ve = b(`<div class="cat-chips svelte-yxunt" role="group" aria-label="Filter by category"></div>`),
  ye = b(`<button type="button"> </button>`),
  be = b(`<div class="cat-chips svelte-yxunt" role="group" aria-label="Filter by project"></div>`),
  xe = b(`<span class="verif-dot svelte-yxunt" aria-hidden="true"></span>`),
  Se = b(`<button type="button"><!> </button>`),
  Ce = b(`<span class="verif-dot svelte-yxunt" aria-hidden="true"></span>`),
  we = b(`<button type="button"><!> </button>`),
  Te = b(
    `<div class="library-page svelte-yxunt"><div class="page-header svelte-yxunt"><div class="header-left svelte-yxunt"><h1 class="page-title svelte-yxunt">Library</h1> <!></div> <!></div> <div class="controls svelte-yxunt"><div class="search-wrap svelte-yxunt"><!></div> <div class="select-wrap svelte-yxunt"><!></div> <!></div> <!> <!> <div class="verif-pills svelte-yxunt" role="group" aria-label="Filter by verification"></div> <div class="verif-pills svelte-yxunt" role="group" aria-label="Filter by actionability"></div> <div class="results svelte-yxunt"><!></div></div>`,
  );
function w(o, b) {
  p(b, !0);
  let w = () => y(se, `$page`, Ee),
    [Ee, De] = ee();
  u(() => {
    ie();
  });
  let T = x(re),
    E = x(ae),
    D = x(oe),
    O = x(() => w().url.searchParams),
    k = h(``),
    A = h(c([])),
    j = h(c([])),
    M = h(`all`),
    N = h(`all`),
    P = h(`best`),
    F = h(!1);
  u(() => {
    e(k, a(O).get(`q`) ?? ``, !0),
      e(M, a(O).get(`verif`) ?? `all`, !0),
      e(N, a(O).get(`act`) ?? `all`, !0),
      e(P, a(O).get(`sort`) ?? `best`, !0),
      e(F, a(O).get(`thin`) === `1`);
    let t = a(O).get(`cat`);
    e(A, t ? t.split(`,`).filter(Boolean) : [], !0);
    let n = a(O).get(`project`);
    e(j, n ? n.split(`,`).filter(Boolean) : [], !0);
  });
  function I() {
    let e = new URL(w().url);
    a(k).trim() ? e.searchParams.set(`q`, a(k).trim()) : e.searchParams.delete(`q`),
      a(A).length ? e.searchParams.set(`cat`, a(A).join(`,`)) : e.searchParams.delete(`cat`),
      a(j).length ? e.searchParams.set(`project`, a(j).join(`,`)) : e.searchParams.delete(`project`),
      a(M) === `all` ? e.searchParams.delete(`verif`) : e.searchParams.set(`verif`, a(M)),
      a(N) === `all` ? e.searchParams.delete(`act`) : e.searchParams.set(`act`, a(N)),
      a(P) === `best` ? e.searchParams.delete(`sort`) : e.searchParams.set(`sort`, a(P)),
      a(F) ? e.searchParams.set(`thin`, `1`) : e.searchParams.delete(`thin`),
      ne(e.toString(), { replaceState: !0, keepFocus: !0, noScroll: !0 });
  }
  let L = x(() => (a(D) ? a(D).categories.map((e) => e.name) : [...new Set(a(T).map((e) => e.category))].sort())),
    R = x(() => a(D)?.projects?.map((e) => e.name) ?? []),
    Oe = [
      { value: `all`, label: `All` },
      { value: `verified_useful`, label: `Verified` },
      { value: `partially_verified`, label: `Partial` },
      { value: `not_verified`, label: `Unverified` },
      { value: `outdated`, label: `Outdated` },
      { value: `unknown`, label: `Not analysed` },
    ],
    ke = [
      { value: `all`, label: `All` },
      { value: `apply-now`, label: `Apply now` },
      { value: `evaluate-later`, label: `Evaluate later` },
      { value: `reference-only`, label: `Reference` },
      { value: `skip`, label: `Saved` },
      { value: `untriaged`, label: `Not triaged` },
    ],
    z = (e) =>
      ({
        "apply-now": `#12924a`,
        "evaluate-later": `#0b8ea3`,
        "reference-only": `#a06a2c`,
        skip: `#7d8896`,
        untriaged: `#9aa0a6`,
      })[e] ?? `#7d8896`,
    Ae = [
      { id: `best`, label: `Best first` },
      { id: `date-desc`, label: `Newest first` },
      { id: `date-asc`, label: `Oldest first` },
      { id: `dur-desc`, label: `Longest first` },
      { id: `likes-desc`, label: `Most liked` },
      { id: `cat-asc`, label: `Category A–Z` },
    ],
    B = { featured: 0, standard: 1, thin: 2 };
  function V(e) {
    let t = a(k).trim().toLowerCase();
    return !(
      (t &&
        ![e.title, e.username, e.fullName, e.category, e.subcategory, ...e.tags].join(` `).toLowerCase().includes(t)) ||
      (a(j).length && !a(j).some((t) => (e.appliesTo ?? []).includes(t))) ||
      (a(M) !== `all` && e.verification !== a(M)) ||
      (a(N) !== `all` && e.actionability !== a(N))
    );
  }
  let je = x(() => {
    let e = new Map();
    for (let t of a(T)) (!a(F) && t.tier === `thin`) || (V(t) && e.set(t.category, (e.get(t.category) ?? 0) + 1));
    return e;
  });
  function Me(e) {
    return a(A).length && !a(A).includes(e.category) ? !1 : V(e);
  }
  let Ne = x(() => () => {
    let e = a(T).filter((e) => Me(e) && (a(F) || e.tier !== `thin`));
    switch (a(P)) {
      case `best`:
        e = [...e].sort((e, t) => B[e.tier] - B[t.tier] || t.quality - e.quality || t.date.localeCompare(e.date));
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
  function Pe(t) {
    e(A, a(A).includes(t) ? a(A).filter((e) => e !== t) : [...a(A), t], !0), I();
  }
  function Fe(t) {
    e(j, a(j).includes(t) ? a(j).filter((e) => e !== t) : [...a(j), t], !0), I();
  }
  function Ie() {
    e(k, ``), e(A, [], !0), e(j, [], !0), e(M, `all`), e(N, `all`), e(P, `best`), e(F, !1), I();
  }
  function Le() {
    e(F, !a(F)), I();
  }
  let H = x(() => (a(F) ? 0 : a(T).filter((e) => e.tier === `thin` && Me(e)).length));
  function Re(t) {
    let n = t[0];
    n && n !== a(P) && (e(P, n, !0), I());
  }
  let U = x(
    () =>
      a(k).trim() !== `` ||
      a(A).length > 0 ||
      a(j).length > 0 ||
      a(M) !== `all` ||
      a(N) !== `all` ||
      a(P) !== `best` ||
      a(F),
  );
  var W = Te(),
    G = d(W),
    K = d(G),
    ze = f(d(K), 2),
    Be = (e) => {
      var t = me(),
        o = d(t, !0);
      m(t), i((e) => r(o, e), [() => a(Ne)().length.toLocaleString()]), n(e, t);
    };
  l(ze, (e) => {
    a(E) && e(Be);
  }),
    m(K);
  var Ve = f(K, 2),
    He = (e) => {
      var t = he();
      s(`click`, t, Ie), n(e, t);
    };
  l(Ve, (e) => {
    a(U) && e(He);
  }),
    m(G);
  var q = f(G, 2),
    J = d(q);
  ue(d(J), {
    get value() {
      return a(k);
    },
    placeholder: `Search titles, creators, tags…`,
    addFocusColor: !0,
    autoComplete: `off`,
    onInput: (t) => {
      e(k, t, !0), I();
    },
    classes: `videos-search-input`,
  }),
    m(J);
  var Y = f(J, 2),
    Ue = d(Y);
  {
    let e = x(() => [a(P)]);
    fe(Ue, {
      get items() {
        return Ae;
      },
      get value() {
        return a(e);
      },
      onchange: Re,
      classes: `videos-sort-select`,
    });
  }
  m(Y);
  var We = f(Y, 2),
    Ge = (e) => {
      var t = ge();
      let o;
      var c = d(t, !0);
      m(t),
        i(() => {
          (o = _(t, 1, `thin-toggle svelte-yxunt`, null, o, { active: a(F) })),
            g(t, `aria-pressed`, a(F)),
            r(c, a(F) ? `Hide low-quality` : `Show ${a(H)} low-quality`);
        }),
        s(`click`, t, Le),
        n(e, t);
    };
  l(We, (e) => {
    (a(F) || a(H) > 0) && e(Ge);
  }),
    m(q);
  var X = f(q, 2),
    Ke = (e) => {
      var o = ve();
      t(
        o,
        21,
        () => a(L),
        S,
        (e, t) => {
          let o = x(() => a(A).includes(a(t))),
            c = x(() => a(je).get(a(t)));
          var l = _e();
          let u;
          var p = d(l, !0),
            h = f(p),
            y = d(h, !0);
          m(h),
            m(l),
            i(
              (e, n) => {
                (u = _(l, 1, `cat-chip svelte-yxunt`, null, u, { active: a(o) })),
                  g(l, `aria-pressed`, a(o)),
                  v(l, `--chip-color:${e ?? ``};--chip-bg:${n ?? ``}`),
                  r(p, a(t)),
                  r(y, a(c) ?? 0);
              },
              [() => ce(a(t)), () => le(a(t))],
            ),
            s(`click`, l, () => Pe(a(t))),
            n(e, l);
        },
      ),
        m(o),
        n(e, o);
    };
  l(X, (e) => {
    a(L).length > 0 && e(Ke);
  });
  var qe = f(X, 2),
    Je = (e) => {
      var o = be();
      t(
        o,
        21,
        () => a(R),
        S,
        (e, t) => {
          let o = x(() => a(j).includes(a(t)));
          var c = ye();
          let l;
          var u = d(c);
          m(c),
            i(() => {
              (l = _(c, 1, `cat-chip svelte-yxunt`, null, l, { active: a(o) })),
                g(c, `aria-pressed`, a(o)),
                r(u, `→ ${a(t) ?? ``}`);
            }),
            s(`click`, c, () => Fe(a(t))),
            n(e, c);
        },
      ),
        m(o),
        n(e, o);
    };
  l(qe, (e) => {
    a(R).length > 0 && e(Je);
  });
  var Z = f(qe, 2);
  t(
    Z,
    21,
    () => Oe,
    S,
    (t, o) => {
      let c = x(() => a(M) === a(o).value);
      var u = Se();
      let p;
      var h = d(u),
        y = (e) => {
          var t = xe();
          i((e) => v(t, `background:${e ?? ``}`), [() => C(a(o).value)]), n(e, t);
        };
      l(h, (e) => {
        a(o).value !== `all` && e(y);
      });
      var b = f(h);
      m(u),
        i(
          (e) => {
            (p = _(u, 1, `verif-pill svelte-yxunt`, null, p, { active: a(c) })),
              g(u, `aria-pressed`, a(c)),
              v(u, e),
              r(b, ` ${a(o).label ?? ``}`);
          },
          [() => (a(o).value === `all` ? `` : `--pill-color:${C(a(o).value)}`)],
        ),
        s(`click`, u, () => {
          e(M, a(o).value, !0), I();
        }),
        n(t, u);
    },
  ),
    m(Z);
  var Q = f(Z, 2);
  t(
    Q,
    21,
    () => ke,
    S,
    (t, o) => {
      let c = x(() => a(N) === a(o).value);
      var u = we();
      let p;
      var h = d(u),
        y = (e) => {
          var t = Ce();
          i((e) => v(t, `background:${e ?? ``}`), [() => z(a(o).value)]), n(e, t);
        };
      l(h, (e) => {
        a(o).value !== `all` && e(y);
      });
      var b = f(h);
      m(u),
        i(
          (e) => {
            (p = _(u, 1, `verif-pill svelte-yxunt`, null, p, { active: a(c) })),
              g(u, `aria-pressed`, a(c)),
              v(u, e),
              r(b, ` ${a(o).label ?? ``}`);
          },
          [() => (a(o).value === `all` ? `` : `--pill-color:${z(a(o).value)}`)],
        ),
        s(`click`, u, () => {
          e(N, a(o).value, !0), I();
        }),
        n(t, u);
    },
  ),
    m(Q);
  var $ = f(Q, 2),
    Ye = d($),
    Xe = (e) => {
      de(e, { label: `Loading library…` });
    },
    Ze = (e) => {
      {
        let t = x(() => a(Ne)()),
          n = x(() => (a(U) ? `No videos match your filters. Try adjusting or clearing them.` : `No videos found.`));
        pe(e, {
          get items() {
            return a(t);
          },
          get emptyMessage() {
            return a(n);
          },
        });
      }
    };
  l(Ye, (e) => {
    a(E) ? e(Ze, -1) : e(Xe);
  }),
    m($),
    m(W),
    n(o, W),
    te(),
    De();
}
o([`click`]);
export { w as component };
