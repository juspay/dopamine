import {
  $ as e,
  C as t,
  D as n,
  E as r,
  H as i,
  I as a,
  M as o,
  N as s,
  O as c,
  Q as l,
  T as u,
  X as d,
  Y as f,
  Z as p,
  ct as m,
  dt as h,
  et as g,
  f as _,
  g as v,
  j as y,
  k as b,
  nt as x,
  st as S,
  w as C,
} from "../chunks/BZ84wCgC.js";
import "../chunks/xihTtKlq.js";
import { a as w, c as T, o as E } from "../chunks/CdnViQ5q.js";
import { a as D, t as O } from "../chunks/bfCGhs6S.js";
import { m as k, t as A } from "../chunks/Dt5KBvTb.js";
import { n as j, t as M } from "../chunks/Bljx9-9G.js";
import { t as N } from "../chunks/BbG86UsG.js";
var ee = b(`<span class="meta-date svelte-1fwm0aa"> </span>`),
  te = b(`<div class="inline-spinner svelte-1fwm0aa"><!></div>`),
  ne = b(`<p class="detail-error svelte-1fwm0aa">Could not load detail for this entry.</p>`),
  P = b(`<li class="takeaway-item svelte-1fwm0aa"> </li>`),
  F = b(
    `<section class="detail-section svelte-1fwm0aa"><h3 class="detail-heading svelte-1fwm0aa">Key Takeaways</h3> <ul class="takeaway-list svelte-1fwm0aa"></ul></section>`,
  ),
  I = b(
    `<section class="detail-section svelte-1fwm0aa"><h3 class="detail-heading svelte-1fwm0aa">Topics</h3> <div class="chip-row svelte-1fwm0aa"></div></section>`,
  ),
  L = b(
    `<section class="detail-section svelte-1fwm0aa"><h3 class="detail-heading svelte-1fwm0aa">Transcript excerpt</h3> <blockquote class="transcript-excerpt svelte-1fwm0aa"> </blockquote></section>`,
  ),
  R = b(
    `<!> <!> <!> <a class="read-more svelte-1fwm0aa">Read full entry <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"></path></svg></a>`,
    1,
  ),
  z = b(`<div class="entry-body svelte-1fwm0aa"><!></div>`),
  B = b(
    `<li><div class="entry-head svelte-1fwm0aa"><div class="entry-top svelte-1fwm0aa"><a class="entry-title svelte-1fwm0aa"> </a> <button class="expand-btn svelte-1fwm0aa" type="button"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"></path></svg></button></div> <div class="entry-meta svelte-1fwm0aa"><!> <!> <!></div></div> <!></li>`,
  ),
  V = b(
    `<p class="result-count svelte-1fwm0aa" aria-live="polite"><!></p> <ol class="entry-list svelte-1fwm0aa" aria-label="Knowledge base entries"></ol>`,
    1,
  ),
  H = b(
    `<div class="kb-page svelte-1fwm0aa"><header class="kb-header svelte-1fwm0aa"><h1 class="kb-title svelte-1fwm0aa">Knowledge Base</h1> <p class="kb-subtitle svelte-1fwm0aa"><!></p> <div class="kb-search svelte-1fwm0aa"><!></div></header> <div class="kb-body"><!></div></div>`,
  );
function U(o, b) {
  m(b, !0);
  let U = x(w),
    W = x(E),
    G = g(``),
    K = x(() => {
      let e = a(G).trim().toLowerCase();
      return e
        ? a(U).filter(
            (t) =>
              t.title.toLowerCase().includes(e) ||
              t.category.toLowerCase().includes(e) ||
              t.username.toLowerCase().includes(e) ||
              (t.fullName && t.fullName.toLowerCase().includes(e)) ||
              t.tags.some((t) => t.toLowerCase().includes(e)),
          )
        : a(U);
    }),
    q = g(l({}));
  function J(t) {
    if (t in a(q)) {
      let n = { ...a(q) };
      delete n[t], e(q, n, !0);
    } else
      e(q, { ...a(q), [t]: `loading` }, !0),
        T(t).then((n) => {
          e(q, { ...a(q), [t]: n ?? null }, !0);
        });
  }
  function re(e) {
    return e in a(q);
  }
  function ie(e) {
    return a(q)[e] ?? `loading`;
  }
  var Y = H(),
    X = f(Y),
    Z = p(f(X), 2),
    ae = f(Z),
    oe = (e) => {
      var t = y();
      i(() => r(t, `${a(U).length ?? ``} entries — expand any to read key takeaways, topics, and transcript.`)),
        n(e, t);
    },
    se = (e) => {
      n(e, y(`Loading entries…`));
    };
  u(ae, (e) => {
    a(W) ? e(oe) : e(se, -1);
  }),
    h(Z);
  var Q = p(Z, 2);
  k(f(Q), {
    get value() {
      return a(G);
    },
    placeholder: `Filter by title, category, creator, or tag…`,
    addFocusColor: !0,
    autoComplete: `off`,
    onInput: (t) => {
      e(G, t, !0);
    },
    classes: `kb-search-input`,
  }),
    h(Q),
    h(X);
  var $ = p(X, 2),
    ce = f($),
    le = (e) => {
      A(e, { label: `Loading knowledge base…` });
    },
    ue = (e) => {
      var t = c(),
        r = d(t),
        i = (e) => {
          {
            let t = x(() => `No entries matching "${a(G)}".`);
            N(e, {
              get message() {
                return a(t);
              },
              icon: `⊘`,
            });
          }
        },
        o = (e) => {
          N(e, { message: `No entries in the knowledge base yet.` });
        };
      u(r, (e) => {
        a(G) ? e(i) : e(o, -1);
      }),
        n(e, t);
    },
    de = (e) => {
      var o = V(),
        c = d(o),
        l = f(c),
        m = (e) => {
          var t = y();
          i(() => r(t, `${a(K).length ?? ``} of ${a(U).length ?? ``} entries`)), n(e, t);
        },
        g = (e) => {
          var t = y();
          i(() => r(t, `${a(U).length ?? ``} entries`)), n(e, t);
        };
      u(l, (e) => {
        a(G) ? e(m) : e(g, -1);
      }),
        h(c);
      var b = p(c, 2);
      t(
        b,
        21,
        () => a(K),
        (e) => e.id,
        (e, o) => {
          let c = x(() => re(a(o).id));
          var l = B();
          let m;
          var g = f(l),
            y = f(g),
            b = f(y),
            S = f(b, !0);
          h(b);
          var w = p(b, 2),
            T = f(w);
          let E;
          h(w), h(y);
          var k = p(y, 2),
            N = f(k);
          M(N, {
            get name() {
              return a(o).username;
            },
            get fullName() {
              return a(o).fullName;
            },
          });
          var V = p(N, 2);
          O(V, {
            get cat() {
              return a(o).category;
            },
          });
          var H = p(V, 2),
            U = (e) => {
              var t = ee(),
                s = f(t, !0);
              h(t), i((e) => r(s, e), [() => D(a(o).date)]), n(e, t);
            };
          u(H, (e) => {
            a(o).date && e(U);
          }),
            h(k),
            h(g);
          var W = p(g, 2),
            G = (e) => {
              let s = x(() => ie(a(o).id));
              var c = z(),
                l = f(c),
                m = (e) => {
                  var t = te();
                  A(f(t), { size: 18, label: `Loading detail…` }), h(t), n(e, t);
                },
                g = (e) => {
                  n(e, ne());
                },
                v = (e) => {
                  var c = R(),
                    l = d(c),
                    m = (e) => {
                      var o = F(),
                        c = p(f(o), 2);
                      t(
                        c,
                        21,
                        () => a(s).keyTakeaways,
                        C,
                        (e, t) => {
                          var o = P(),
                            s = f(o, !0);
                          h(o), i(() => r(s, a(t))), n(e, o);
                        },
                      ),
                        h(c),
                        h(o),
                        n(e, o);
                    };
                  u(l, (e) => {
                    a(s).keyTakeaways && a(s).keyTakeaways.length > 0 && e(m);
                  });
                  var g = p(l, 2),
                    v = (e) => {
                      var r = I(),
                        i = p(f(r), 2);
                      t(
                        i,
                        21,
                        () => a(s).topics,
                        C,
                        (e, t) => {
                          j(e, {
                            get tag() {
                              return a(t);
                            },
                          });
                        },
                      ),
                        h(i),
                        h(r),
                        n(e, r);
                    };
                  u(g, (e) => {
                    a(s).topics && a(s).topics.length > 0 && e(v);
                  });
                  var y = p(g, 2),
                    b = (e) => {
                      var t = L(),
                        o = p(f(t), 2),
                        c = f(o);
                      h(o),
                        h(t),
                        i(
                          (e, t) => r(c, `${e ?? ``}${t ?? ``}`),
                          [
                            () => a(s).transcript.trim().slice(0, 400),
                            () => (a(s).transcript.trim().length > 400 ? `…` : ``),
                          ],
                        ),
                        n(e, t);
                    },
                    S = x(() => a(s).transcript && a(s).transcript.trim().length > 0);
                  u(y, (e) => {
                    a(S) && e(b);
                  });
                  var w = p(y, 2);
                  i((e) => _(w, `href`, e), [() => `/video/${encodeURIComponent(a(o).id)}`]), n(e, c);
                };
              u(l, (e) => {
                a(s) === `loading` ? e(m) : a(s) === null ? e(g, 1) : e(v, -1);
              }),
                h(c),
                n(e, c);
            };
          u(W, (e) => {
            a(c) && e(G);
          }),
            h(l),
            i(
              (e) => {
                (m = v(l, 1, `entry svelte-1fwm0aa`, null, m, { "entry--expanded": a(c) })),
                  _(b, `href`, e),
                  r(S, a(o).title),
                  _(w, `aria-expanded`, a(c)),
                  _(w, `aria-label`, a(c) ? `Collapse entry` : `Expand to read more`),
                  (E = v(T, 0, `chevron svelte-1fwm0aa`, null, E, { "chevron--open": a(c) }));
              },
              [() => `/video/${encodeURIComponent(a(o).id)}`],
            ),
            s(`click`, w, () => J(a(o).id)),
            n(e, l);
        },
      ),
        h(b),
        n(e, o);
    };
  u(ce, (e) => {
    a(W) ? (a(K).length === 0 ? e(ue, 1) : e(de, -1)) : e(le);
  }),
    h($),
    h(Y),
    n(o, Y),
    S();
}
o([`click`]);
export { U as component };
