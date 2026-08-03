import {
  B as e,
  C as t,
  D as n,
  E as r,
  H as i,
  I as a,
  T as o,
  U as s,
  X as c,
  Y as l,
  Z as u,
  ct as d,
  dt as f,
  f as p,
  it as m,
  k as h,
  nt as g,
  q as _,
  rt as v,
  st as y,
  y as b,
} from "../chunks/BZ84wCgC.js";
import { t as x } from "../chunks/Dmb9twoO.js";
import "../chunks/xihTtKlq.js";
import { a as S, d as C, i as w, o as T } from "../chunks/CdnViQ5q.js";
import { t as E } from "../chunks/B2DVDhc0.js";
import "../chunks/DauwGVTW.js";
import { t as D } from "../chunks/BqeBlQOp.js";
import { t as O } from "../chunks/H8Kuq40O.js";
import { t as k } from "../chunks/Dt5KBvTb.js";
import { n as ee, t as A } from "../chunks/BE_OFooT.js";
import { t as te } from "../chunks/Is8ZIs2f.js";
import { t as j } from "../chunks/BbG86UsG.js";
var ne = h(`<strong> </strong> <em class="query-echo svelte-e12qt1"> </em>`, 1),
  re = h(`No results for <em class="query-echo svelte-e12qt1"> </em>`, 1),
  ie = h(`<p class="summary svelte-e12qt1" role="status" aria-live="polite"><!></p>`),
  ae = h(
    `<section class="result-group svelte-e12qt1" aria-labelledby="videos-heading"><div class="group-header svelte-e12qt1"><h2 id="videos-heading" class="group-title svelte-e12qt1">Videos</h2> <span class="group-count svelte-e12qt1"> </span></div> <!></section>`,
  ),
  oe = h(`<span class="creator-fullname svelte-e12qt1"> </span>`),
  se = h(
    `<li class="creator-item svelte-e12qt1"><!> <!> <span class="creator-video-count svelte-e12qt1"> </span></li>`,
  ),
  ce = h(
    `<section class="result-group svelte-e12qt1" aria-labelledby="creators-heading"><div class="group-header svelte-e12qt1"><h2 id="creators-heading" class="group-title svelte-e12qt1">Creators</h2> <span class="group-count svelte-e12qt1"> </span></div> <ul class="creator-list svelte-e12qt1" role="list"></ul></section>`,
  ),
  le = h(`<div role="listitem"><!></div>`),
  ue = h(
    `<section class="result-group svelte-e12qt1" aria-labelledby="tags-heading"><div class="group-header svelte-e12qt1"><h2 id="tags-heading" class="group-title svelte-e12qt1">Tags</h2> <span class="group-count svelte-e12qt1"> </span></div> <div class="chip-cloud svelte-e12qt1" role="list" aria-label="Matching tags"></div></section>`,
  ),
  de = h(`<a class="tool-name svelte-e12qt1" target="_blank" rel="noopener noreferrer"> </a>`),
  fe = h(`<span class="tool-name svelte-e12qt1"> </span>`),
  pe = h(`<span class="status-dot status-live svelte-e12qt1" title="URL is live" aria-label="Live"></span>`),
  me = h(`<span class="status-dot status-dead svelte-e12qt1" title="URL is unreachable" aria-label="Dead"></span>`),
  he = h(`<p class="tool-desc svelte-e12qt1"> </p>`),
  M = h(`<span class="tool-source-sep svelte-e12qt1" aria-hidden="true">·</span> <!>`, 1),
  N = h(
    `<div class="tool-source svelte-e12qt1"><span class="tool-source-label svelte-e12qt1">from</span> <a class="tool-video-link svelte-e12qt1"> </a> <!></div>`,
  ),
  P = h(
    `<li class="tool-item svelte-e12qt1"><div class="tool-header svelte-e12qt1"><div class="tool-name-row svelte-e12qt1"><!> <span class="tool-type svelte-e12qt1"> </span> <!></div> <!></div> <!> <!></li>`,
  ),
  F = h(
    `<section class="result-group svelte-e12qt1" aria-labelledby="tools-heading"><div class="group-header svelte-e12qt1"><h2 id="tools-heading" class="group-title svelte-e12qt1">Tools</h2> <span class="group-count svelte-e12qt1"> </span></div> <ul class="tool-list svelte-e12qt1" role="list"></ul></section>`,
  ),
  I = h(`<div class="results svelte-e12qt1"><!> <!> <!> <!></div>`),
  L = h(
    `<div class="search-page svelte-e12qt1"><header class="page-header svelte-e12qt1"><div class="header-top svelte-e12qt1"><h1 class="page-title svelte-e12qt1">Search</h1> <!></div> <div class="search-bar svelte-e12qt1"><!></div></header> <!></div>`,
  );
function R(h, R) {
  d(R, !0);
  let ge = () => m(E, `$page`, _e),
    [_e, ve] = v();
  s(() => {
    C();
  });
  let z = g(() => ge().url.searchParams.get(`q`) ?? ``),
    B = g(() => a(z).toLowerCase().trim()),
    V = g(S),
    ye = g(w),
    H = g(T),
    U = g(() =>
      a(B) === ``
        ? []
        : a(V).filter(
            (e) =>
              e.title.toLowerCase().includes(a(B)) ||
              e.username.toLowerCase().includes(a(B)) ||
              e.fullName.toLowerCase().includes(a(B)) ||
              e.category.toLowerCase().includes(a(B)) ||
              e.subcategory.toLowerCase().includes(a(B)) ||
              e.tags.some((e) => e.toLowerCase().includes(a(B))),
          ),
    ),
    W = g(() => () => {
      if (a(B) === ``) return [];
      let e = new Map();
      for (let t of a(V))
        if (t.username.toLowerCase().includes(a(B)) || t.fullName.toLowerCase().includes(a(B))) {
          let n = e.get(t.username);
          n ? (n.count += 1) : e.set(t.username, { name: t.username, fullName: t.fullName, count: 1 });
        }
      return Array.from(e.values()).sort((e, t) => t.count - e.count);
    }),
    G = g(() => () => {
      if (a(B) === ``) return [];
      let e = new Set();
      for (let t of a(V)) for (let n of t.tags) n.toLowerCase().includes(a(B)) && e.add(n);
      return Array.from(e).sort((e, t) => e.localeCompare(t));
    }),
    K = g(() =>
      a(B) === ``
        ? []
        : a(ye).filter(
            (e) =>
              e.name.toLowerCase().includes(a(B)) ||
              e.description.toLowerCase().includes(a(B)) ||
              e.type.toLowerCase().includes(a(B)),
          ),
    ),
    q = g(() => a(U).length + a(W)().length + a(G)().length + a(K).length),
    J = g(() => a(q) > 0);
  function be(e) {
    x(`/search?q=` + encodeURIComponent(e.trim()));
  }
  var Y = L();
  b(`e12qt1`, (t) => {
    e(() => {
      _.title = `${a(z) ? `"${a(z)}" — Search` : `Search`} — Dopamine`;
    });
  });
  var X = l(Y),
    Z = l(X),
    xe = u(l(Z), 2),
    Se = (e) => {
      var t = ie(),
        s = l(t),
        d = (e) => {
          var t = ne(),
            o = c(t),
            s = l(o, !0);
          f(o);
          var d = u(o),
            p = u(d),
            m = l(p, !0);
          f(p),
            i(() => {
              r(s, a(q)), r(d, ` result${a(q) === 1 ? `` : `s`} for `), r(m, a(z));
            }),
            n(e, t);
        },
        p = (e) => {
          var t = re(),
            o = u(c(t)),
            s = l(o, !0);
          f(o), i(() => r(s, a(z))), n(e, t);
        };
      o(s, (e) => {
        a(J) ? e(d) : e(p, -1);
      }),
        f(t),
        n(e, t);
    };
  o(xe, (e) => {
    a(z) && a(H) && e(Se);
  }),
    f(Z);
  var Q = u(Z, 2);
  D(l(Q), {
    get initialValue() {
      return a(z);
    },
    onSubmit: be,
  }),
    f(Q),
    f(X);
  var Ce = u(X, 2),
    $ = (e) => {
      k(e, { label: `Loading index…` });
    },
    we = (e) => {
      j(e, { icon: `⌕`, message: `Type something above to search across videos, creators, tags, and tools.` });
    },
    Te = (e) => {
      {
        let t = g(() => `No results for "${a(z)}". Try a different keyword.`);
        j(e, {
          icon: `○`,
          get message() {
            return a(t);
          },
        });
      }
    },
    Ee = (e) => {
      var s = I(),
        d = l(s),
        m = (e) => {
          var t = ae(),
            o = l(t),
            s = u(l(o), 2),
            c = l(s, !0);
          f(s),
            f(o),
            te(u(o, 2), {
              get items() {
                return a(U);
              },
            }),
            f(t),
            i(() => r(c, a(U).length)),
            n(e, t);
        };
      o(d, (e) => {
        a(U).length > 0 && e(m);
      });
      var h = u(d, 2),
        _ = (e) => {
          var s = ce(),
            c = l(s),
            d = u(l(c), 2),
            p = l(d, !0);
          f(d), f(c);
          var m = u(c, 2);
          t(
            m,
            21,
            () => a(W)(),
            (e) => e.name,
            (e, t) => {
              var s = se(),
                c = l(s);
              A(c, {
                get name() {
                  return a(t).name;
                },
                get fullName() {
                  return a(t).fullName;
                },
              });
              var d = u(c, 2),
                p = (e) => {
                  var o = oe(),
                    s = l(o, !0);
                  f(o), i(() => r(s, a(t).fullName)), n(e, o);
                };
              o(d, (e) => {
                a(t).fullName && a(t).fullName !== a(t).name && e(p);
              });
              var m = u(d, 2),
                h = l(m);
              f(m), f(s), i(() => r(h, `${a(t).count ?? ``} ${a(t).count === 1 ? `video` : `videos`}`)), n(e, s);
            },
          ),
            f(m),
            f(s),
            i((e) => r(p, e), [() => a(W)().length]),
            n(e, s);
        },
        v = g(() => a(W)().length > 0);
      o(h, (e) => {
        a(v) && e(_);
      });
      var y = u(h, 2),
        b = (e) => {
          var o = ue(),
            s = l(o),
            c = u(l(s), 2),
            d = l(c, !0);
          f(c), f(s);
          var p = u(s, 2);
          t(
            p,
            20,
            () => a(G)(),
            (e) => e,
            (e, t) => {
              var r = le();
              ee(l(r), {
                get tag() {
                  return t;
                },
                size: `md`,
              }),
                f(r),
                n(e, r);
            },
          ),
            f(p),
            f(o),
            i((e) => r(d, e), [() => a(G)().length]),
            n(e, o);
        },
        x = g(() => a(G)().length > 0);
      o(y, (e) => {
        a(x) && e(b);
      });
      var S = u(y, 2),
        C = (e) => {
          var s = F(),
            d = l(s),
            m = u(l(d), 2),
            h = l(m, !0);
          f(m), f(d);
          var g = u(d, 2);
          t(
            g,
            21,
            () => a(K),
            (e) => e.name + e.videoId,
            (e, t) => {
              var s = P(),
                d = l(s),
                m = l(d),
                h = l(m),
                g = (e) => {
                  var o = de(),
                    s = l(o, !0);
                  f(o),
                    i(() => {
                      p(o, `href`, a(t).url), p(o, `title`, a(t).url), r(s, a(t).name);
                    }),
                    n(e, o);
                },
                _ = (e) => {
                  var o = fe(),
                    s = l(o, !0);
                  f(o), i(() => r(s, a(t).name)), n(e, o);
                };
              o(h, (e) => {
                a(t).url ? e(g) : e(_, -1);
              });
              var v = u(h, 2),
                y = l(v, !0);
              f(v);
              var b = u(v, 2),
                x = (e) => {
                  n(e, pe());
                },
                S = (e) => {
                  n(e, me());
                };
              o(b, (e) => {
                a(t).urlStatus === `live` ? e(x) : a(t).urlStatus === `dead` && e(S, 1);
              }),
                f(m);
              var C = u(m, 2),
                w = (e) => {
                  O(e, {
                    get cat() {
                      return a(t).category;
                    },
                    size: `sm`,
                  });
                };
              o(C, (e) => {
                a(t).category && e(w);
              }),
                f(d);
              var T = u(d, 2),
                E = (e) => {
                  var o = he(),
                    s = l(o, !0);
                  f(o), i(() => r(s, a(t).description)), n(e, o);
                };
              o(T, (e) => {
                a(t).description && e(E);
              });
              var D = u(T, 2),
                k = (e) => {
                  var s = N(),
                    d = u(l(s), 2),
                    m = l(d, !0);
                  f(d);
                  var h = u(d, 2),
                    g = (e) => {
                      var r = M();
                      A(u(c(r), 2), {
                        get name() {
                          return a(t).username;
                        },
                      }),
                        n(e, r);
                    };
                  o(h, (e) => {
                    a(t).username && e(g);
                  }),
                    f(s),
                    i(
                      (e) => {
                        p(d, `href`, e), r(m, a(t).videoTitle || a(t).videoId);
                      },
                      [() => `/video/${encodeURIComponent(a(t).videoId)}`],
                    ),
                    n(e, s);
                };
              o(D, (e) => {
                a(t).videoId && e(k);
              }),
                f(s),
                i(() => r(y, a(t).type)),
                n(e, s);
            },
          ),
            f(g),
            f(s),
            i(() => r(h, a(K).length)),
            n(e, s);
        };
      o(S, (e) => {
        a(K).length > 0 && e(C);
      }),
        f(s),
        n(e, s);
    };
  o(Ce, (e) => {
    a(H) ? (a(B) === `` ? e(we, 1) : a(J) ? e(Ee, -1) : e(Te, 2)) : e($);
  }),
    f(Y),
    n(h, Y),
    y(),
    ve();
}
export { R as component };
