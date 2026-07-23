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
  V as u,
  W as d,
  _ as f,
  d as p,
  et as m,
  it as h,
  q as g,
  rt as _,
  st as v,
  w as y,
  x as b,
} from "../chunks/KQ3eEBfb.js";
import { t as x } from "../chunks/BHIZHYj4.js";
import "../chunks/xihTtKlq.js";
import { a as S, d as C, i as w, o as T } from "../chunks/5wXqoPKv.js";
import { t as E } from "../chunks/DukFlL_f.js";
import "../chunks/Cd4YZbZJ.js";
import { t as D } from "../chunks/C9NVFsZM.js";
import { t as O } from "../chunks/WltnivmA.js";
import { t as k } from "../chunks/BcfutCr0.js";
import { n as ee, t as A } from "../chunks/8hiyGRUO.js";
import { t as te } from "../chunks/WJjxiR19.js";
import { t as j } from "../chunks/Bi4ZSEfO.js";
var ne = r(`<strong> </strong> <em class="query-echo svelte-e12qt1"> </em>`, 1),
  re = r(`No results for <em class="query-echo svelte-e12qt1"> </em>`, 1),
  ie = r(`<p class="summary svelte-e12qt1" role="status" aria-live="polite"><!></p>`),
  ae = r(
    `<section class="result-group svelte-e12qt1" aria-labelledby="videos-heading"><div class="group-header svelte-e12qt1"><h2 id="videos-heading" class="group-title svelte-e12qt1">Videos</h2> <span class="group-count svelte-e12qt1"> </span></div> <!></section>`,
  ),
  oe = r(`<span class="creator-fullname svelte-e12qt1"> </span>`),
  se = r(
    `<li class="creator-item svelte-e12qt1"><!> <!> <span class="creator-video-count svelte-e12qt1"> </span></li>`,
  ),
  ce = r(
    `<section class="result-group svelte-e12qt1" aria-labelledby="creators-heading"><div class="group-header svelte-e12qt1"><h2 id="creators-heading" class="group-title svelte-e12qt1">Creators</h2> <span class="group-count svelte-e12qt1"> </span></div> <ul class="creator-list svelte-e12qt1" role="list"></ul></section>`,
  ),
  le = r(`<div role="listitem"><!></div>`),
  ue = r(
    `<section class="result-group svelte-e12qt1" aria-labelledby="tags-heading"><div class="group-header svelte-e12qt1"><h2 id="tags-heading" class="group-title svelte-e12qt1">Tags</h2> <span class="group-count svelte-e12qt1"> </span></div> <div class="chip-cloud svelte-e12qt1" role="list" aria-label="Matching tags"></div></section>`,
  ),
  de = r(`<a class="tool-name svelte-e12qt1" target="_blank" rel="noopener noreferrer"> </a>`),
  fe = r(`<span class="tool-name svelte-e12qt1"> </span>`),
  pe = r(`<span class="status-dot status-live svelte-e12qt1" title="URL is live" aria-label="Live"></span>`),
  me = r(`<span class="status-dot status-dead svelte-e12qt1" title="URL is unreachable" aria-label="Dead"></span>`),
  he = r(`<p class="tool-desc svelte-e12qt1"> </p>`),
  M = r(`<span class="tool-source-sep svelte-e12qt1" aria-hidden="true">·</span> <!>`, 1),
  N = r(
    `<div class="tool-source svelte-e12qt1"><span class="tool-source-label svelte-e12qt1">from</span> <a class="tool-video-link svelte-e12qt1"> </a> <!></div>`,
  ),
  P = r(
    `<li class="tool-item svelte-e12qt1"><div class="tool-header svelte-e12qt1"><div class="tool-name-row svelte-e12qt1"><!> <span class="tool-type svelte-e12qt1"> </span> <!></div> <!></div> <!> <!></li>`,
  ),
  F = r(
    `<section class="result-group svelte-e12qt1" aria-labelledby="tools-heading"><div class="group-header svelte-e12qt1"><h2 id="tools-heading" class="group-title svelte-e12qt1">Tools</h2> <span class="group-count svelte-e12qt1"> </span></div> <ul class="tool-list svelte-e12qt1" role="list"></ul></section>`,
  ),
  I = r(`<div class="results svelte-e12qt1"><!> <!> <!> <!></div>`),
  L = r(
    `<div class="search-page svelte-e12qt1"><header class="page-header svelte-e12qt1"><div class="header-top svelte-e12qt1"><h1 class="page-title svelte-e12qt1">Search</h1> <!></div> <div class="search-bar svelte-e12qt1"><!></div></header> <!></div>`,
  );
function R(r, R) {
  h(R, !0);
  let ge = () => m(E, `$page`, _e),
    [_e, ve] = e();
  u(() => {
    C();
  });
  let z = s(() => ge().url.searchParams.get(`q`) ?? ``),
    B = s(() => o(z).toLowerCase().trim()),
    V = s(S),
    ye = s(w),
    H = s(T),
    U = s(() =>
      o(B) === ``
        ? []
        : o(V).filter(
            (e) =>
              e.title.toLowerCase().includes(o(B)) ||
              e.username.toLowerCase().includes(o(B)) ||
              e.fullName.toLowerCase().includes(o(B)) ||
              e.category.toLowerCase().includes(o(B)) ||
              e.subcategory.toLowerCase().includes(o(B)) ||
              e.tags.some((e) => e.toLowerCase().includes(o(B))),
          ),
    ),
    W = s(() => () => {
      if (o(B) === ``) return [];
      let e = new Map();
      for (let t of o(V))
        if (t.username.toLowerCase().includes(o(B)) || t.fullName.toLowerCase().includes(o(B))) {
          let n = e.get(t.username);
          n ? (n.count += 1) : e.set(t.username, { name: t.username, fullName: t.fullName, count: 1 });
        }
      return Array.from(e.values()).sort((e, t) => t.count - e.count);
    }),
    G = s(() => () => {
      if (o(B) === ``) return [];
      let e = new Set();
      for (let t of o(V)) for (let n of t.tags) n.toLowerCase().includes(o(B)) && e.add(n);
      return Array.from(e).sort((e, t) => e.localeCompare(t));
    }),
    K = s(() =>
      o(B) === ``
        ? []
        : o(ye).filter(
            (e) =>
              e.name.toLowerCase().includes(o(B)) ||
              e.description.toLowerCase().includes(o(B)) ||
              e.type.toLowerCase().includes(o(B)),
          ),
    ),
    q = s(() => o(U).length + o(W)().length + o(G)().length + o(K).length),
    J = s(() => o(q) > 0);
  function be(e) {
    x(`/search?q=` + encodeURIComponent(e.trim()));
  }
  var Y = L();
  f(`e12qt1`, (e) => {
    c(() => {
      d.title = `${o(z) ? `"${o(z)}" — Search` : `Search`} — Dopamine`;
    });
  });
  var X = a(Y),
    Z = a(X),
    xe = i(a(Z), 2),
    Se = (e) => {
      var r = ie(),
        s = a(r),
        c = (e) => {
          var n = ne(),
            r = g(n),
            s = a(r, !0);
          v(r);
          var c = i(r),
            u = i(c),
            d = a(u, !0);
          v(u),
            t(() => {
              y(s, o(q)), y(c, ` result${o(q) === 1 ? `` : `s`} for `), y(d, o(z));
            }),
            l(e, n);
        },
        u = (e) => {
          var n = re(),
            r = i(g(n)),
            s = a(r, !0);
          v(r), t(() => y(s, o(z))), l(e, n);
        };
      n(s, (e) => {
        o(J) ? e(c) : e(u, -1);
      }),
        v(r),
        l(e, r);
    };
  n(xe, (e) => {
    o(z) && o(H) && e(Se);
  }),
    v(Z);
  var Q = i(Z, 2);
  D(a(Q), {
    get initialValue() {
      return o(z);
    },
    onSubmit: be,
  }),
    v(Q),
    v(X);
  var Ce = i(X, 2),
    $ = (e) => {
      k(e, { label: `Loading index…` });
    },
    we = (e) => {
      j(e, { icon: `⌕`, message: `Type something above to search across videos, creators, tags, and tools.` });
    },
    Te = (e) => {
      {
        let t = s(() => `No results for "${o(z)}". Try a different keyword.`);
        j(e, {
          icon: `○`,
          get message() {
            return o(t);
          },
        });
      }
    },
    Ee = (e) => {
      var r = I(),
        c = a(r),
        u = (e) => {
          var n = ae(),
            r = a(n),
            s = i(a(r), 2),
            c = a(s, !0);
          v(s),
            v(r),
            te(i(r, 2), {
              get items() {
                return o(U);
              },
            }),
            v(n),
            t(() => y(c, o(U).length)),
            l(e, n);
        };
      n(c, (e) => {
        o(U).length > 0 && e(u);
      });
      var d = i(c, 2),
        f = (e) => {
          var r = ce(),
            s = a(r),
            c = i(a(s), 2),
            u = a(c, !0);
          v(c), v(s);
          var d = i(s, 2);
          b(
            d,
            21,
            () => o(W)(),
            (e) => e.name,
            (e, r) => {
              var s = se(),
                c = a(s);
              A(c, {
                get name() {
                  return o(r).name;
                },
                get fullName() {
                  return o(r).fullName;
                },
              });
              var u = i(c, 2),
                d = (e) => {
                  var n = oe(),
                    i = a(n, !0);
                  v(n), t(() => y(i, o(r).fullName)), l(e, n);
                };
              n(u, (e) => {
                o(r).fullName && o(r).fullName !== o(r).name && e(d);
              });
              var f = i(u, 2),
                p = a(f);
              v(f), v(s), t(() => y(p, `${o(r).count ?? ``} ${o(r).count === 1 ? `video` : `videos`}`)), l(e, s);
            },
          ),
            v(d),
            v(r),
            t((e) => y(u, e), [() => o(W)().length]),
            l(e, r);
        },
        m = s(() => o(W)().length > 0);
      n(d, (e) => {
        o(m) && e(f);
      });
      var h = i(d, 2),
        _ = (e) => {
          var n = ue(),
            r = a(n),
            s = i(a(r), 2),
            c = a(s, !0);
          v(s), v(r);
          var u = i(r, 2);
          b(
            u,
            20,
            () => o(G)(),
            (e) => e,
            (e, t) => {
              var n = le();
              ee(a(n), {
                get tag() {
                  return t;
                },
                size: `md`,
              }),
                v(n),
                l(e, n);
            },
          ),
            v(u),
            v(n),
            t((e) => y(c, e), [() => o(G)().length]),
            l(e, n);
        },
        x = s(() => o(G)().length > 0);
      n(h, (e) => {
        o(x) && e(_);
      });
      var S = i(h, 2),
        C = (e) => {
          var r = F(),
            s = a(r),
            c = i(a(s), 2),
            u = a(c, !0);
          v(c), v(s);
          var d = i(s, 2);
          b(
            d,
            21,
            () => o(K),
            (e) => e.name + e.videoId,
            (e, r) => {
              var s = P(),
                c = a(s),
                u = a(c),
                d = a(u),
                f = (e) => {
                  var n = de(),
                    i = a(n, !0);
                  v(n),
                    t(() => {
                      p(n, `href`, o(r).url), p(n, `title`, o(r).url), y(i, o(r).name);
                    }),
                    l(e, n);
                },
                m = (e) => {
                  var n = fe(),
                    i = a(n, !0);
                  v(n), t(() => y(i, o(r).name)), l(e, n);
                };
              n(d, (e) => {
                o(r).url ? e(f) : e(m, -1);
              });
              var h = i(d, 2),
                _ = a(h, !0);
              v(h);
              var b = i(h, 2),
                x = (e) => {
                  l(e, pe());
                },
                S = (e) => {
                  l(e, me());
                };
              n(b, (e) => {
                o(r).urlStatus === `live` ? e(x) : o(r).urlStatus === `dead` && e(S, 1);
              }),
                v(u);
              var C = i(u, 2),
                w = (e) => {
                  O(e, {
                    get cat() {
                      return o(r).category;
                    },
                    size: `sm`,
                  });
                };
              n(C, (e) => {
                o(r).category && e(w);
              }),
                v(c);
              var T = i(c, 2),
                E = (e) => {
                  var n = he(),
                    i = a(n, !0);
                  v(n), t(() => y(i, o(r).description)), l(e, n);
                };
              n(T, (e) => {
                o(r).description && e(E);
              });
              var D = i(T, 2),
                k = (e) => {
                  var s = N(),
                    c = i(a(s), 2),
                    u = a(c, !0);
                  v(c);
                  var d = i(c, 2),
                    f = (e) => {
                      var t = M();
                      A(i(g(t), 2), {
                        get name() {
                          return o(r).username;
                        },
                      }),
                        l(e, t);
                    };
                  n(d, (e) => {
                    o(r).username && e(f);
                  }),
                    v(s),
                    t(
                      (e) => {
                        p(c, `href`, e), y(u, o(r).videoTitle || o(r).videoId);
                      },
                      [() => `/video/${encodeURIComponent(o(r).videoId)}`],
                    ),
                    l(e, s);
                };
              n(D, (e) => {
                o(r).videoId && e(k);
              }),
                v(s),
                t(() => y(_, o(r).type)),
                l(e, s);
            },
          ),
            v(d),
            v(r),
            t(() => y(u, o(K).length)),
            l(e, r);
        };
      n(S, (e) => {
        o(K).length > 0 && e(C);
      }),
        v(r),
        l(e, r);
    };
  n(Ce, (e) => {
    o(H) ? (o(B) === `` ? e(we, 1) : o(J) ? e(Ee, -1) : e(Te, 2)) : e($);
  }),
    v(Y),
    l(r, Y),
    _(),
    ve();
}
export { R as component };
