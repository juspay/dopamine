import {
  $ as e,
  B as t,
  C as n,
  D as r,
  E as i,
  J as a,
  K as o,
  P as s,
  Q as c,
  T as l,
  V as u,
  W as d,
  X as f,
  Z as p,
  _ as m,
  ct as h,
  d as g,
  et as _,
  it as v,
  ot as y,
  p as b,
  q as x,
  rt as S,
  st as C,
  w,
  x as T,
  z as E,
} from "../chunks/KQ3eEBfb.js";
import { t as D } from "../chunks/BHIZHYj4.js";
import "../chunks/xihTtKlq.js";
import { d as O, i as k } from "../chunks/5wXqoPKv.js";
import { t as ee } from "../chunks/DukFlL_f.js";
import "../chunks/Cd4YZbZJ.js";
import { t as A } from "../chunks/WltnivmA.js";
import { d as j, l as te, m as ne, n as M, t as re, u as N } from "../chunks/BcfutCr0.js";
import { t as ie } from "../chunks/Bd4orgHw.js";
var ae = r(`<span class="counts-total svelte-171l7w4"> </span>`),
  oe = r(`<p class="counts svelte-171l7w4"> <!> </p>`),
  se = r(
    `<a class="tool-name svelte-171l7w4" target="_blank" rel="noopener noreferrer"> <span class="ext-icon svelte-171l7w4" aria-hidden="true"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></span></a>`,
  ),
  ce = r(`<span class="tool-name tool-name--no-link svelte-171l7w4"> </span>`),
  le = r(`<p class="tool-desc svelte-171l7w4"> </p>`),
  ue = r(`<div class="tool-name-cell svelte-171l7w4"><!> <!></div>`),
  de = r(`<span class="na svelte-171l7w4">—</span>`),
  fe = r(`<span><!></span>`),
  pe = r(`<a class="video-link svelte-171l7w4"> </a>`),
  me = r(`<span class="na svelte-171l7w4">—</span>`),
  he = r(`<span class="na svelte-171l7w4">—</span>`),
  ge = r(
    `<a class="mobile-tool-name svelte-171l7w4" target="_blank" rel="noopener noreferrer"> <span class="ext-icon svelte-171l7w4" aria-hidden="true"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></span></a>`,
  ),
  _e = r(`<span class="mobile-tool-name mobile-tool-name--no-link svelte-171l7w4"> </span>`),
  ve = r(`<p class="mobile-tool-desc svelte-171l7w4"> </p>`),
  ye = r(
    `<a class="mobile-video-link svelte-171l7w4"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> </a>`,
  ),
  be = r(
    `<div class="mobile-card svelte-171l7w4"><div class="mobile-card-header svelte-171l7w4"><div class="mobile-card-title-row svelte-171l7w4"><!></div> <span class="mobile-status-badge svelte-171l7w4"> </span></div> <!> <div class="mobile-card-meta svelte-171l7w4"><!> <!> <!></div></div>`,
  ),
  xe = r(
    `<div class="table-container-wrap svelte-171l7w4"><!></div> <div class="mobile-card-list svelte-171l7w4" aria-label="Tools list"><!></div>`,
    1,
  ),
  Se = r(
    `<div class="tools-page container svelte-171l7w4"><!> <header class="page-header svelte-171l7w4"><div class="title-row svelte-171l7w4"><h1 class="page-title svelte-171l7w4">Tools</h1> <!></div> <div class="filters svelte-171l7w4"><div class="search-wrap svelte-171l7w4"><!></div> <div class="filter-group svelte-171l7w4"><label class="filter-label svelte-171l7w4" for="filter-status">Status</label> <div class="select-wrap svelte-171l7w4"><!></div></div> <div class="filter-group svelte-171l7w4"><label class="filter-label svelte-171l7w4" for="filter-type">Type</label> <div class="select-wrap svelte-171l7w4"><!></div></div> <div class="filter-group svelte-171l7w4"><label class="filter-label svelte-171l7w4" for="filter-cat">Category</label> <div class="select-wrap svelte-171l7w4"><!></div></div></div></header> <!></div>`,
  );
function P(r, P) {
  v(P, !0);
  let F = () => _(ee, `$page`, Ce),
    [Ce, we] = e(),
    I = p(!1);
  u(() => {
    O().then(() => {
      f(I, !0);
    });
  });
  let L = c(k),
    R = c(() => F().url.searchParams.get(`status`) ?? `all`),
    z = c(() => F().url.searchParams.get(`type`) ?? `all`),
    B = c(() => F().url.searchParams.get(`cat`) ?? `all`),
    V = c(() => F().url.searchParams.get(`q`) ?? ``),
    Te = c(() => [s(R)]),
    Ee = c(() => [s(z)]),
    De = c(() => [s(B)]),
    Oe = [
      { id: `all`, label: `All statuses` },
      { id: `live`, label: `Live only` },
      { id: `redirect`, label: `Redirect` },
      { id: `dead`, label: `Dead` },
    ],
    ke = c(() => [
      { id: `all`, label: `All types` },
      ...[
        ...new Set(
          s(L)
            .map((e) => e.type)
            .filter(Boolean)
            .sort(),
        ),
      ].map((e) => ({ id: e, label: e })),
    ]),
    Ae = c(() => [
      { id: `all`, label: `All categories` },
      ...[
        ...new Set(
          s(L)
            .map((e) => e.category)
            .filter(Boolean)
            .sort(),
        ),
      ].map((e) => ({ id: e, label: e })),
    ]),
    H = c(() => {
      let e = [...s(L)];
      if (
        (s(R) !== `all` && (e = e.filter((e) => e.urlStatus === s(R))),
        s(z) !== `all` && (e = e.filter((e) => e.type === s(z))),
        s(B) !== `all` && (e = e.filter((e) => e.category === s(B))),
        s(V).trim())
      ) {
        let t = s(V).trim().toLowerCase();
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
    Me = c(() =>
      s(H).map((e) => [
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
  m(`171l7w4`, (e) => {
    E(() => {
      d.title = `Tools — Dopamine`;
    });
  });
  var Ie = o(K);
  ie(Ie, {
    get items() {
      return Fe;
    },
  });
  var q = a(Ie, 2),
    J = o(q),
    Le = a(o(J), 2),
    Re = (e) => {
      var r = oe(),
        i = o(r),
        c = a(i),
        u = (e) => {
          var n = ae(),
            r = o(n);
          C(n), t(() => w(r, `of ${s(L).length ?? ``}`)), l(e, n);
        };
      n(c, (e) => {
        s(H).length !== s(L).length && e(u);
      });
      var d = a(c);
      C(r),
        t(() => {
          w(i, `${s(H).length ?? ``} `), w(d, ` ${s(H).length === 1 ? `tool` : `tools`}`);
        }),
        l(e, r);
    };
  n(Le, (e) => {
    s(I) && e(Re);
  }),
    C(J);
  var ze = a(J, 2),
    Y = o(ze);
  ne(o(Y), {
    get value() {
      return s(V);
    },
    placeholder: `Search tools…`,
    onInput: (e) => Ne(e),
    classes: `tools-search-input`,
  }),
    C(Y);
  var X = a(Y, 2),
    Z = a(o(X), 2);
  N(o(Z), {
    get items() {
      return Oe;
    },
    get value() {
      return s(Te);
    },
    onchange: (e) => U(`status`, e[0] ?? `all`),
    placeholder: `All statuses`,
  }),
    C(Z),
    C(X);
  var Q = a(X, 2),
    Be = a(o(Q), 2);
  N(o(Be), {
    get items() {
      return s(ke);
    },
    get value() {
      return s(Ee);
    },
    onchange: (e) => U(`type`, e[0] ?? `all`),
    placeholder: `All types`,
    searchable: !0,
  }),
    C(Be),
    C(Q);
  var Ve = a(Q, 2),
    $ = a(o(Ve), 2);
  N(o($), {
    get items() {
      return s(Ae);
    },
    get value() {
      return s(De);
    },
    onchange: (e) => U(`cat`, e[0] ?? `all`),
    placeholder: `All categories`,
    searchable: !0,
  }),
    C($),
    C(Ve),
    C(ze),
    C(q);
  var He = a(q, 2),
    Ue = (e) => {
      re(e, {});
    },
    We = (e) => {
      var r = xe(),
        u = x(r);
      te(o(u), {
        get tableHeaders() {
          return je;
        },
        get tableData() {
          return s(Me);
        },
        sortable: !1,
        stickyHeader: !0,
        isTableScrollable: !0,
        classes: `tools-table-override`,
        cell: (e, r = h, u = h, d = h) => {
          let f = c(() => s(H)[u()]);
          var p = i(),
            m = x(p),
            _ = (e) => {
              var r = ue(),
                i = o(r),
                c = (e) => {
                  var n = se(),
                    r = o(n);
                  y(),
                    C(n),
                    t(() => {
                      g(n, `href`, s(f).url), g(n, `title`, s(f).url), w(r, `${s(f).name ?? ``} `);
                    }),
                    l(e, n);
                },
                u = (e) => {
                  var n = ce(),
                    r = o(n, !0);
                  C(n), t(() => w(r, s(f)?.name)), l(e, n);
                };
              n(i, (e) => {
                s(f)?.url ? e(c) : e(u, -1);
              });
              var d = a(i, 2),
                p = (e) => {
                  var n = le(),
                    r = o(n, !0);
                  C(n), t(() => w(r, s(f).description)), l(e, n);
                };
              n(d, (e) => {
                s(f)?.description && e(p);
              }),
                C(r),
                l(e, r);
            },
            v = (e) => {
              var t = i(),
                r = x(t),
                a = (e) => {
                  j(e, {
                    get text() {
                      return s(f).type;
                    },
                  });
                },
                o = (e) => {
                  l(e, de());
                };
              n(r, (e) => {
                s(f)?.type ? e(a) : e(o, -1);
              }),
                l(e, t);
            },
            S = (e) => {
              var n = fe(),
                r = o(n);
              {
                let e = c(() => Pe(s(f)?.urlStatus ?? ``));
                j(r, {
                  get text() {
                    return s(e);
                  },
                });
              }
              C(n),
                t(
                  (e, t, r, i) =>
                    b(
                      n,
                      `--pill-background:${e ?? ``};--pill-color:${t ?? ``};--pill-hover-background:${r ?? ``};--pill-hover-color:${i ?? ``}`,
                    ),
                  [
                    () => G(s(f)?.urlStatus ?? ``),
                    () => W(s(f)?.urlStatus ?? ``),
                    () => G(s(f)?.urlStatus ?? ``),
                    () => W(s(f)?.urlStatus ?? ``),
                  ],
                ),
                l(e, n);
            },
            T = (e) => {
              var r = i(),
                a = x(r),
                c = (e) => {
                  var n = pe(),
                    r = o(n, !0);
                  C(n),
                    t(
                      (e) => {
                        g(n, `href`, e), w(r, s(f).videoTitle || s(f).videoId);
                      },
                      [() => `/video/${encodeURIComponent(s(f).videoId)}`],
                    ),
                    l(e, n);
                },
                u = (e) => {
                  l(e, me());
                };
              n(a, (e) => {
                s(f)?.videoId ? e(c) : e(u, -1);
              }),
                l(e, r);
            },
            E = (e) => {
              var t = i(),
                r = x(t),
                a = (e) => {
                  A(e, {
                    get cat() {
                      return s(f).category;
                    },
                  });
                },
                o = (e) => {
                  l(e, he());
                };
              n(r, (e) => {
                s(f)?.category ? e(a) : e(o, -1);
              }),
                l(e, t);
            };
          n(m, (e) => {
            d() === 0 ? e(_) : d() === 1 ? e(v, 1) : d() === 2 ? e(S, 2) : d() === 3 ? e(T, 3) : d() === 4 && e(E, 4);
          }),
            l(e, p);
        },
        empty: (e) => {
          {
            let t = c(() => (s(L).length === 0 ? `No tools found` : `No tools match your filters`)),
              n = c(() =>
                s(L).length === 0
                  ? `Tools will appear here once the data loads.`
                  : `Try adjusting your search or filter criteria.`,
              );
            M(e, {
              get title() {
                return s(t);
              },
              get description() {
                return s(n);
              },
            });
          }
        },
        $$slots: { cell: !0, empty: !0 },
      }),
        C(u);
      var d = a(u, 2),
        f = o(d),
        p = (e) => {
          {
            let t = c(() => (s(L).length === 0 ? `No tools found` : `No tools match your filters`)),
              n = c(() =>
                s(L).length === 0
                  ? `Tools will appear here once the data loads.`
                  : `Try adjusting your search or filter criteria.`,
              );
            M(e, {
              get title() {
                return s(t);
              },
              get description() {
                return s(n);
              },
            });
          }
        },
        m = (e) => {
          var r = i();
          T(
            x(r),
            17,
            () => s(H),
            (e) => e.name + e.videoId,
            (e, r) => {
              var i = be(),
                c = o(i),
                u = o(c),
                d = o(u),
                f = (e) => {
                  var n = ge(),
                    i = o(n);
                  y(),
                    C(n),
                    t(() => {
                      g(n, `href`, s(r).url), w(i, `${s(r).name ?? ``} `);
                    }),
                    l(e, n);
                },
                p = (e) => {
                  var n = _e(),
                    i = o(n, !0);
                  C(n), t(() => w(i, s(r).name)), l(e, n);
                };
              n(d, (e) => {
                s(r).url ? e(f) : e(p, -1);
              }),
                C(u);
              var m = a(u, 2),
                h = o(m, !0);
              C(m), C(c);
              var _ = a(c, 2),
                v = (e) => {
                  var n = ve(),
                    i = o(n, !0);
                  C(n), t(() => w(i, s(r).description)), l(e, n);
                };
              n(_, (e) => {
                s(r).description && e(v);
              });
              var x = a(_, 2),
                S = o(x),
                T = (e) => {
                  j(e, {
                    get text() {
                      return s(r).type;
                    },
                  });
                };
              n(S, (e) => {
                s(r).type && e(T);
              });
              var E = a(S, 2),
                D = (e) => {
                  A(e, {
                    get cat() {
                      return s(r).category;
                    },
                  });
                };
              n(E, (e) => {
                s(r).category && e(D);
              });
              var O = a(E, 2),
                k = (e) => {
                  var n = ye(),
                    i = a(o(n));
                  C(n),
                    t(
                      (e) => {
                        g(n, `href`, e), w(i, ` ${(s(r).videoTitle || `Source video`) ?? ``}`);
                      },
                      [() => `/video/${encodeURIComponent(s(r).videoId)}`],
                    ),
                    l(e, n);
                };
              n(O, (e) => {
                s(r).videoId && e(k);
              }),
                C(x),
                C(i),
                t(
                  (e, t, n, r) => {
                    b(
                      m,
                      `color:${e ?? ``};background:${t ?? ``};border-color:color-mix(in srgb,${n ?? ``} 30%,transparent)`,
                    ),
                      w(h, r);
                  },
                  [() => W(s(r).urlStatus), () => G(s(r).urlStatus), () => W(s(r).urlStatus), () => Pe(s(r).urlStatus)],
                ),
                l(e, i);
            },
          ),
            l(e, r);
        };
      n(f, (e) => {
        s(H).length === 0 ? e(p) : e(m, -1);
      }),
        C(d),
        l(e, r);
    };
  n(He, (e) => {
    s(I) ? e(We, -1) : e(Ue);
  }),
    C(K),
    l(r, K),
    S(),
    we();
}
export { P as component };
