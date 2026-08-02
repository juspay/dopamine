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
  V as l,
  X as u,
  Y as d,
  Z as f,
  ct as p,
  dt as m,
  et as h,
  f as g,
  ft as _,
  h as v,
  it as y,
  k as b,
  nt as x,
  q as S,
  rt as C,
  st as w,
  ut as T,
  y as E,
} from "../chunks/BZ84wCgC.js";
import { t as D } from "../chunks/CavVGUas.js";
import "../chunks/xihTtKlq.js";
import { d as O, i as k } from "../chunks/CdnViQ5q.js";
import { t as ee } from "../chunks/BnXMJaDQ.js";
import "../chunks/g0KpAiwe.js";
import { t as A } from "../chunks/DJJkK5-l.js";
import { d as j, l as te, m as ne, n as M, t as re, u as N } from "../chunks/Dt5KBvTb.js";
import { t as ie } from "../chunks/CyjB8bAN.js";
var ae = b(`<span class="counts-total svelte-171l7w4"> </span>`),
  oe = b(`<p class="counts svelte-171l7w4"> <!> </p>`),
  se = b(
    `<a class="tool-name svelte-171l7w4" target="_blank" rel="noopener noreferrer"> <span class="ext-icon svelte-171l7w4" aria-hidden="true"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></span></a>`,
  ),
  ce = b(`<span class="tool-name tool-name--no-link svelte-171l7w4"> </span>`),
  le = b(`<p class="tool-desc svelte-171l7w4"> </p>`),
  ue = b(`<div class="tool-name-cell svelte-171l7w4"><!> <!></div>`),
  de = b(`<span class="na svelte-171l7w4">—</span>`),
  fe = b(`<span><!></span>`),
  pe = b(`<a class="video-link svelte-171l7w4"> </a>`),
  me = b(`<span class="na svelte-171l7w4">—</span>`),
  he = b(`<span class="na svelte-171l7w4">—</span>`),
  ge = b(
    `<a class="mobile-tool-name svelte-171l7w4" target="_blank" rel="noopener noreferrer"> <span class="ext-icon svelte-171l7w4" aria-hidden="true"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></span></a>`,
  ),
  _e = b(`<span class="mobile-tool-name mobile-tool-name--no-link svelte-171l7w4"> </span>`),
  ve = b(`<p class="mobile-tool-desc svelte-171l7w4"> </p>`),
  ye = b(
    `<a class="mobile-video-link svelte-171l7w4"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> </a>`,
  ),
  be = b(
    `<div class="mobile-card svelte-171l7w4"><div class="mobile-card-header svelte-171l7w4"><div class="mobile-card-title-row svelte-171l7w4"><!></div> <span class="mobile-status-badge svelte-171l7w4"> </span></div> <!> <div class="mobile-card-meta svelte-171l7w4"><!> <!> <!></div></div>`,
  ),
  xe = b(
    `<div class="table-container-wrap svelte-171l7w4"><!></div> <div class="mobile-card-list svelte-171l7w4" aria-label="Tools list"><!></div>`,
    1,
  ),
  Se = b(
    `<div class="tools-page container svelte-171l7w4"><!> <header class="page-header svelte-171l7w4"><div class="title-row svelte-171l7w4"><h1 class="page-title svelte-171l7w4">Tools</h1> <!></div> <div class="filters svelte-171l7w4"><div class="search-wrap svelte-171l7w4"><!></div> <div class="filter-group svelte-171l7w4"><label class="filter-label svelte-171l7w4" for="filter-status">Status</label> <div class="select-wrap svelte-171l7w4"><!></div></div> <div class="filter-group svelte-171l7w4"><label class="filter-label svelte-171l7w4" for="filter-type">Type</label> <div class="select-wrap svelte-171l7w4"><!></div></div> <div class="filter-group svelte-171l7w4"><label class="filter-label svelte-171l7w4" for="filter-cat">Category</label> <div class="select-wrap svelte-171l7w4"><!></div></div></div></header> <!></div>`,
  );
function P(b, P) {
  p(P, !0);
  let F = () => y(ee, `$page`, Ce),
    [Ce, we] = C(),
    I = h(!1);
  c(() => {
    O().then(() => {
      e(I, !0);
    });
  });
  let L = x(k),
    R = x(() => F().url.searchParams.get(`status`) ?? `all`),
    z = x(() => F().url.searchParams.get(`type`) ?? `all`),
    B = x(() => F().url.searchParams.get(`cat`) ?? `all`),
    V = x(() => F().url.searchParams.get(`q`) ?? ``),
    Te = x(() => [a(R)]),
    Ee = x(() => [a(z)]),
    De = x(() => [a(B)]),
    Oe = [
      { id: `all`, label: `All statuses` },
      { id: `live`, label: `Live only` },
      { id: `redirect`, label: `Redirect` },
      { id: `dead`, label: `Dead` },
    ],
    ke = x(() => [
      { id: `all`, label: `All types` },
      ...[
        ...new Set(
          a(L)
            .map((e) => e.type)
            .filter(Boolean)
            .sort(),
        ),
      ].map((e) => ({ id: e, label: e })),
    ]),
    Ae = x(() => [
      { id: `all`, label: `All categories` },
      ...[
        ...new Set(
          a(L)
            .map((e) => e.category)
            .filter(Boolean)
            .sort(),
        ),
      ].map((e) => ({ id: e, label: e })),
    ]),
    H = x(() => {
      let e = [...a(L)];
      if (
        (a(R) !== `all` && (e = e.filter((e) => e.urlStatus === a(R))),
        a(z) !== `all` && (e = e.filter((e) => e.type === a(z))),
        a(B) !== `all` && (e = e.filter((e) => e.category === a(B))),
        a(V).trim())
      ) {
        let t = a(V).trim().toLowerCase();
        e = e.filter((e) => e.name.toLowerCase().includes(t) || (e.description ?? ``).toLowerCase().includes(t));
      }
      return (
        e.sort((e, t) => {
          let n = e.urlStatus === `live` ? 0 : e.urlStatus === `redirect` ? 1 : 2,
            r = t.urlStatus === `live` ? 0 : t.urlStatus === `redirect` ? 1 : 2;
          if (n !== r) return n - r;
          let i = (e.category ?? ``).localeCompare(t.category ?? ``);
          return i === 0 ? (e.name ?? ``).localeCompare(t.name ?? ``) : i;
        }),
        e
      );
    }),
    je = [`Tool`, `Type`, `Status`, `Source`, `Category`],
    Me = x(() =>
      a(H).map((e) => [
        e.name ?? null,
        e.type ?? null,
        e.urlStatus ?? null,
        e.videoTitle || e.videoId || null,
        e.category ?? null,
      ]),
    );
  function U(e, t) {
    let n = new URLSearchParams(F().url.searchParams.toString());
    t === `all` || t === `` ? n.delete(e) : n.set(e, t),
      D(`/tools?${n.toString()}`, { replaceState: !0, keepFocus: !0 });
  }
  function Ne(e) {
    U(`q`, e);
  }
  function W(e) {
    switch (e) {
      case `live`:
        return `var(--ok)`;
      case `redirect`:
        return `var(--warn)`;
      case `dead`:
        return `var(--bad)`;
      default:
        return `var(--neutral)`;
    }
  }
  function G(e) {
    switch (e) {
      case `live`:
        return `var(--ok-bg)`;
      case `redirect`:
        return `var(--warn-bg)`;
      case `dead`:
        return `var(--bad-bg)`;
      default:
        return `var(--neutral-bg)`;
    }
  }
  function Pe(e) {
    switch (e) {
      case `live`:
        return `Live`;
      case `redirect`:
        return `Redirect`;
      case `dead`:
        return `Dead`;
      default:
        return e || `Unknown`;
    }
  }
  let Fe = [{ label: `Home`, href: `/` }, { label: `Tools` }];
  var K = Se();
  E(`171l7w4`, (e) => {
    l(() => {
      S.title = `Tools — Dopamine`;
    });
  });
  var Ie = d(K);
  ie(Ie, {
    get items() {
      return Fe;
    },
  });
  var q = f(Ie, 2),
    J = d(q),
    Le = f(d(J), 2),
    Re = (e) => {
      var t = oe(),
        o = d(t),
        c = f(o),
        l = (e) => {
          var t = ae(),
            o = d(t);
          m(t), i(() => r(o, `of ${a(L).length ?? ``}`)), n(e, t);
        };
      s(c, (e) => {
        a(H).length !== a(L).length && e(l);
      });
      var u = f(c);
      m(t),
        i(() => {
          r(o, `${a(H).length ?? ``} `), r(u, ` ${a(H).length === 1 ? `tool` : `tools`}`);
        }),
        n(e, t);
    };
  s(Le, (e) => {
    a(I) && e(Re);
  }),
    m(J);
  var ze = f(J, 2),
    Y = d(ze);
  ne(d(Y), {
    get value() {
      return a(V);
    },
    placeholder: `Search tools…`,
    onInput: (e) => Ne(e),
    classes: `tools-search-input`,
  }),
    m(Y);
  var X = f(Y, 2),
    Z = f(d(X), 2);
  N(d(Z), {
    get items() {
      return Oe;
    },
    get value() {
      return a(Te);
    },
    onchange: (e) => U(`status`, e[0] ?? `all`),
    placeholder: `All statuses`,
  }),
    m(Z),
    m(X);
  var Q = f(X, 2),
    Be = f(d(Q), 2);
  N(d(Be), {
    get items() {
      return a(ke);
    },
    get value() {
      return a(Ee);
    },
    onchange: (e) => U(`type`, e[0] ?? `all`),
    placeholder: `All types`,
    searchable: !0,
  }),
    m(Be),
    m(Q);
  var Ve = f(Q, 2),
    $ = f(d(Ve), 2);
  N(d($), {
    get items() {
      return a(Ae);
    },
    get value() {
      return a(De);
    },
    onchange: (e) => U(`cat`, e[0] ?? `all`),
    placeholder: `All categories`,
    searchable: !0,
  }),
    m($),
    m(Ve),
    m(ze),
    m(q);
  var He = f(q, 2),
    Ue = (e) => {
      re(e, {});
    },
    We = (e) => {
      var c = xe(),
        l = u(c);
      te(d(l), {
        get tableHeaders() {
          return je;
        },
        get tableData() {
          return a(Me);
        },
        sortable: !1,
        stickyHeader: !0,
        isTableScrollable: !0,
        classes: `tools-table-override`,
        cell: (e, t = _, c = _, l = _) => {
          let p = x(() => a(H)[c()]);
          var h = o(),
            y = u(h),
            b = (e) => {
              var t = ue(),
                o = d(t),
                c = (e) => {
                  var t = se(),
                    o = d(t);
                  T(),
                    m(t),
                    i(() => {
                      g(t, `href`, a(p).url), g(t, `title`, a(p).url), r(o, `${a(p).name ?? ``} `);
                    }),
                    n(e, t);
                },
                l = (e) => {
                  var t = ce(),
                    o = d(t, !0);
                  m(t), i(() => r(o, a(p)?.name)), n(e, t);
                };
              s(o, (e) => {
                a(p)?.url ? e(c) : e(l, -1);
              });
              var u = f(o, 2),
                h = (e) => {
                  var t = le(),
                    o = d(t, !0);
                  m(t), i(() => r(o, a(p).description)), n(e, t);
                };
              s(u, (e) => {
                a(p)?.description && e(h);
              }),
                m(t),
                n(e, t);
            },
            S = (e) => {
              var t = o(),
                r = u(t),
                i = (e) => {
                  j(e, {
                    get text() {
                      return a(p).type;
                    },
                  });
                },
                c = (e) => {
                  n(e, de());
                };
              s(r, (e) => {
                a(p)?.type ? e(i) : e(c, -1);
              }),
                n(e, t);
            },
            C = (e) => {
              var t = fe(),
                r = d(t);
              {
                let e = x(() => Pe(a(p)?.urlStatus ?? ``));
                j(r, {
                  get text() {
                    return a(e);
                  },
                });
              }
              m(t),
                i(
                  (e, n, r, i) =>
                    v(
                      t,
                      `--pill-background:${e ?? ``};--pill-color:${n ?? ``};--pill-hover-background:${r ?? ``};--pill-hover-color:${i ?? ``}`,
                    ),
                  [
                    () => G(a(p)?.urlStatus ?? ``),
                    () => W(a(p)?.urlStatus ?? ``),
                    () => G(a(p)?.urlStatus ?? ``),
                    () => W(a(p)?.urlStatus ?? ``),
                  ],
                ),
                n(e, t);
            },
            w = (e) => {
              var t = o(),
                c = u(t),
                l = (e) => {
                  var t = pe(),
                    o = d(t, !0);
                  m(t),
                    i(
                      (e) => {
                        g(t, `href`, e), r(o, a(p).videoTitle || a(p).videoId);
                      },
                      [() => `/video/${encodeURIComponent(a(p).videoId)}`],
                    ),
                    n(e, t);
                },
                f = (e) => {
                  n(e, me());
                };
              s(c, (e) => {
                a(p)?.videoId ? e(l) : e(f, -1);
              }),
                n(e, t);
            },
            E = (e) => {
              var t = o(),
                r = u(t),
                i = (e) => {
                  A(e, {
                    get cat() {
                      return a(p).category;
                    },
                  });
                },
                c = (e) => {
                  n(e, he());
                };
              s(r, (e) => {
                a(p)?.category ? e(i) : e(c, -1);
              }),
                n(e, t);
            };
          s(y, (e) => {
            l() === 0 ? e(b) : l() === 1 ? e(S, 1) : l() === 2 ? e(C, 2) : l() === 3 ? e(w, 3) : l() === 4 && e(E, 4);
          }),
            n(e, h);
        },
        empty: (e) => {
          {
            let t = x(() => (a(L).length === 0 ? `No tools found` : `No tools match your filters`)),
              n = x(() =>
                a(L).length === 0
                  ? `Tools will appear here once the data loads.`
                  : `Try adjusting your search or filter criteria.`,
              );
            M(e, {
              get title() {
                return a(t);
              },
              get description() {
                return a(n);
              },
            });
          }
        },
        $$slots: { cell: !0, empty: !0 },
      }),
        m(l);
      var p = f(l, 2),
        h = d(p),
        y = (e) => {
          {
            let t = x(() => (a(L).length === 0 ? `No tools found` : `No tools match your filters`)),
              n = x(() =>
                a(L).length === 0
                  ? `Tools will appear here once the data loads.`
                  : `Try adjusting your search or filter criteria.`,
              );
            M(e, {
              get title() {
                return a(t);
              },
              get description() {
                return a(n);
              },
            });
          }
        },
        b = (e) => {
          var c = o();
          t(
            u(c),
            17,
            () => a(H),
            (e) => e.name + e.videoId,
            (e, t) => {
              var o = be(),
                c = d(o),
                l = d(c),
                u = d(l),
                p = (e) => {
                  var o = ge(),
                    s = d(o);
                  T(),
                    m(o),
                    i(() => {
                      g(o, `href`, a(t).url), r(s, `${a(t).name ?? ``} `);
                    }),
                    n(e, o);
                },
                h = (e) => {
                  var o = _e(),
                    s = d(o, !0);
                  m(o), i(() => r(s, a(t).name)), n(e, o);
                };
              s(u, (e) => {
                a(t).url ? e(p) : e(h, -1);
              }),
                m(l);
              var _ = f(l, 2),
                y = d(_, !0);
              m(_), m(c);
              var b = f(c, 2),
                x = (e) => {
                  var o = ve(),
                    s = d(o, !0);
                  m(o), i(() => r(s, a(t).description)), n(e, o);
                };
              s(b, (e) => {
                a(t).description && e(x);
              });
              var S = f(b, 2),
                C = d(S),
                w = (e) => {
                  j(e, {
                    get text() {
                      return a(t).type;
                    },
                  });
                };
              s(C, (e) => {
                a(t).type && e(w);
              });
              var E = f(C, 2),
                D = (e) => {
                  A(e, {
                    get cat() {
                      return a(t).category;
                    },
                  });
                };
              s(E, (e) => {
                a(t).category && e(D);
              });
              var O = f(E, 2),
                k = (e) => {
                  var o = ye(),
                    s = f(d(o));
                  m(o),
                    i(
                      (e) => {
                        g(o, `href`, e), r(s, ` ${(a(t).videoTitle || `Source video`) ?? ``}`);
                      },
                      [() => `/video/${encodeURIComponent(a(t).videoId)}`],
                    ),
                    n(e, o);
                };
              s(O, (e) => {
                a(t).videoId && e(k);
              }),
                m(S),
                m(o),
                i(
                  (e, t, n, i) => {
                    v(
                      _,
                      `color:${e ?? ``};background:${t ?? ``};border-color:color-mix(in srgb,${n ?? ``} 30%,transparent)`,
                    ),
                      r(y, i);
                  },
                  [() => W(a(t).urlStatus), () => G(a(t).urlStatus), () => W(a(t).urlStatus), () => Pe(a(t).urlStatus)],
                ),
                n(e, o);
            },
          ),
            n(e, c);
        };
      s(h, (e) => {
        a(H).length === 0 ? e(y) : e(b, -1);
      }),
        m(p),
        n(e, c);
    };
  s(He, (e) => {
    a(I) ? e(We, -1) : e(Ue);
  }),
    m(K),
    n(b, K),
    w(),
    we();
}
export { P as component };
