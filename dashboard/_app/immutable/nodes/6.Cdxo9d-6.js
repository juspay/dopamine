import {
  A as e,
  B as t,
  C as n,
  D as r,
  E as i,
  J as a,
  K as o,
  P as s,
  Q as c,
  S as l,
  T as u,
  X as d,
  Y as f,
  Z as p,
  d as m,
  it as h,
  j as g,
  k as _,
  m as v,
  q as y,
  rt as b,
  st as x,
  w as S,
  x as C,
} from "../chunks/KQ3eEBfb.js";
import "../chunks/xihTtKlq.js";
import { a as w, c as T, o as E } from "../chunks/5wXqoPKv.js";
import { a as D, t as O } from "../chunks/WltnivmA.js";
import { m as k, t as A } from "../chunks/BcfutCr0.js";
import { n as j, t as M } from "../chunks/8hiyGRUO.js";
import { t as N } from "../chunks/Bi4ZSEfO.js";
var ee = r(`<span class="meta-date svelte-1fwm0aa"> </span>`),
  te = r(`<div class="inline-spinner svelte-1fwm0aa"><!></div>`),
  ne = r(`<p class="detail-error svelte-1fwm0aa">Could not load detail for this entry.</p>`),
  P = r(`<li class="takeaway-item svelte-1fwm0aa"> </li>`),
  F = r(
    `<section class="detail-section svelte-1fwm0aa"><h3 class="detail-heading svelte-1fwm0aa">Key Takeaways</h3> <ul class="takeaway-list svelte-1fwm0aa"></ul></section>`,
  ),
  I = r(
    `<section class="detail-section svelte-1fwm0aa"><h3 class="detail-heading svelte-1fwm0aa">Topics</h3> <div class="chip-row svelte-1fwm0aa"></div></section>`,
  ),
  L = r(
    `<section class="detail-section svelte-1fwm0aa"><h3 class="detail-heading svelte-1fwm0aa">Transcript excerpt</h3> <blockquote class="transcript-excerpt svelte-1fwm0aa"> </blockquote></section>`,
  ),
  R = r(
    `<!> <!> <!> <a class="read-more svelte-1fwm0aa">Read full entry <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"></path></svg></a>`,
    1,
  ),
  z = r(`<div class="entry-body svelte-1fwm0aa"><!></div>`),
  B = r(
    `<li><div class="entry-head svelte-1fwm0aa"><div class="entry-top svelte-1fwm0aa"><a class="entry-title svelte-1fwm0aa"> </a> <button class="expand-btn svelte-1fwm0aa" type="button"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"></path></svg></button></div> <div class="entry-meta svelte-1fwm0aa"><!> <!> <!></div></div> <!></li>`,
  ),
  V = r(
    `<p class="result-count svelte-1fwm0aa" aria-live="polite"><!></p> <ol class="entry-list svelte-1fwm0aa" aria-label="Knowledge base entries"></ol>`,
    1,
  ),
  H = r(
    `<div class="kb-page svelte-1fwm0aa"><header class="kb-header svelte-1fwm0aa"><h1 class="kb-title svelte-1fwm0aa">Knowledge Base</h1> <p class="kb-subtitle svelte-1fwm0aa"><!></p> <div class="kb-search svelte-1fwm0aa"><!></div></header> <div class="kb-body"><!></div></div>`,
  );
function U(e, r) {
  h(r, !0);
  let U = c(w),
    W = c(E),
    G = p(``),
    K = c(() => {
      let e = s(G).trim().toLowerCase();
      return e
        ? s(U).filter(
            (t) =>
              t.title.toLowerCase().includes(e) ||
              t.category.toLowerCase().includes(e) ||
              t.username.toLowerCase().includes(e) ||
              (t.fullName && t.fullName.toLowerCase().includes(e)) ||
              t.tags.some((t) => t.toLowerCase().includes(e)),
          )
        : s(U);
    }),
    q = p(f({}));
  function J(e) {
    if (e in s(q)) {
      let t = { ...s(q) };
      delete t[e], d(q, t, !0);
    } else
      d(q, { ...s(q), [e]: `loading` }, !0),
        T(e).then((t) => {
          d(q, { ...s(q), [e]: t ?? null }, !0);
        });
  }
  function re(e) {
    return e in s(q);
  }
  function ie(e) {
    return s(q)[e] ?? `loading`;
  }
  var Y = H(),
    X = o(Y),
    Z = a(o(X), 2),
    ae = o(Z),
    oe = (e) => {
      var n = _();
      t(() => S(n, `${s(U).length ?? ``} entries — expand any to read key takeaways, topics, and transcript.`)),
        u(e, n);
    },
    se = (e) => {
      u(e, _(`Loading entries…`));
    };
  n(ae, (e) => {
    s(W) ? e(oe) : e(se, -1);
  }),
    x(Z);
  var Q = a(Z, 2);
  k(o(Q), {
    get value() {
      return s(G);
    },
    placeholder: `Filter by title, category, creator, or tag…`,
    addFocusColor: !0,
    autoComplete: `off`,
    onInput: (e) => {
      d(G, e, !0);
    },
    classes: `kb-search-input`,
  }),
    x(Q),
    x(X);
  var $ = a(X, 2),
    ce = o($),
    le = (e) => {
      A(e, { label: `Loading knowledge base…` });
    },
    ue = (e) => {
      var t = i(),
        r = y(t),
        a = (e) => {
          {
            let t = c(() => `No entries matching "${s(G)}".`);
            N(e, {
              get message() {
                return s(t);
              },
              icon: `⊘`,
            });
          }
        },
        o = (e) => {
          N(e, { message: `No entries in the knowledge base yet.` });
        };
      n(r, (e) => {
        s(G) ? e(a) : e(o, -1);
      }),
        u(e, t);
    },
    de = (e) => {
      var r = V(),
        i = y(r),
        d = o(i),
        f = (e) => {
          var n = _();
          t(() => S(n, `${s(K).length ?? ``} of ${s(U).length ?? ``} entries`)), u(e, n);
        },
        p = (e) => {
          var n = _();
          t(() => S(n, `${s(U).length ?? ``} entries`)), u(e, n);
        };
      n(d, (e) => {
        s(G) ? e(f) : e(p, -1);
      }),
        x(i);
      var h = a(i, 2);
      C(
        h,
        21,
        () => s(K),
        (e) => e.id,
        (e, r) => {
          let i = c(() => re(s(r).id));
          var d = B();
          let f;
          var p = o(d),
            h = o(p),
            _ = o(h),
            b = o(_, !0);
          x(_);
          var w = a(_, 2),
            T = o(w);
          let E;
          x(w), x(h);
          var k = a(h, 2),
            N = o(k);
          M(N, {
            get name() {
              return s(r).username;
            },
            get fullName() {
              return s(r).fullName;
            },
          });
          var V = a(N, 2);
          O(V, {
            get cat() {
              return s(r).category;
            },
          });
          var H = a(V, 2),
            U = (e) => {
              var n = ee(),
                i = o(n, !0);
              x(n), t((e) => S(i, e), [() => D(s(r).date)]), u(e, n);
            };
          n(H, (e) => {
            s(r).date && e(U);
          }),
            x(k),
            x(p);
          var W = a(p, 2),
            G = (e) => {
              let i = c(() => ie(s(r).id));
              var d = z(),
                f = o(d),
                p = (e) => {
                  var t = te();
                  A(o(t), { size: 18, label: `Loading detail…` }), x(t), u(e, t);
                },
                h = (e) => {
                  u(e, ne());
                },
                g = (e) => {
                  var d = R(),
                    f = y(d),
                    p = (e) => {
                      var n = F(),
                        r = a(o(n), 2);
                      C(
                        r,
                        21,
                        () => s(i).keyTakeaways,
                        l,
                        (e, n) => {
                          var r = P(),
                            i = o(r, !0);
                          x(r), t(() => S(i, s(n))), u(e, r);
                        },
                      ),
                        x(r),
                        x(n),
                        u(e, n);
                    };
                  n(f, (e) => {
                    s(i).keyTakeaways && s(i).keyTakeaways.length > 0 && e(p);
                  });
                  var h = a(f, 2),
                    g = (e) => {
                      var t = I(),
                        n = a(o(t), 2);
                      C(
                        n,
                        21,
                        () => s(i).topics,
                        l,
                        (e, t) => {
                          j(e, {
                            get tag() {
                              return s(t);
                            },
                          });
                        },
                      ),
                        x(n),
                        x(t),
                        u(e, t);
                    };
                  n(h, (e) => {
                    s(i).topics && s(i).topics.length > 0 && e(g);
                  });
                  var _ = a(h, 2),
                    v = (e) => {
                      var n = L(),
                        r = a(o(n), 2),
                        c = o(r);
                      x(r),
                        x(n),
                        t(
                          (e, t) => S(c, `${e ?? ``}${t ?? ``}`),
                          [
                            () => s(i).transcript.trim().slice(0, 400),
                            () => (s(i).transcript.trim().length > 400 ? `…` : ``),
                          ],
                        ),
                        u(e, n);
                    },
                    b = c(() => s(i).transcript && s(i).transcript.trim().length > 0);
                  n(_, (e) => {
                    s(b) && e(v);
                  });
                  var w = a(_, 2);
                  t((e) => m(w, `href`, e), [() => `/video/${encodeURIComponent(s(r).id)}`]), u(e, d);
                };
              n(f, (e) => {
                s(i) === `loading` ? e(p) : s(i) === null ? e(h, 1) : e(g, -1);
              }),
                x(d),
                u(e, d);
            };
          n(W, (e) => {
            s(i) && e(G);
          }),
            x(d),
            t(
              (e) => {
                (f = v(d, 1, `entry svelte-1fwm0aa`, null, f, { "entry--expanded": s(i) })),
                  m(_, `href`, e),
                  S(b, s(r).title),
                  m(w, `aria-expanded`, s(i)),
                  m(w, `aria-label`, s(i) ? `Collapse entry` : `Expand to read more`),
                  (E = v(T, 0, `chevron svelte-1fwm0aa`, null, E, { "chevron--open": s(i) }));
              },
              [() => `/video/${encodeURIComponent(s(r).id)}`],
            ),
            g(`click`, w, () => J(s(r).id)),
            u(e, d);
        },
      ),
        x(h),
        u(e, r);
    };
  n(ce, (e) => {
    s(W) ? (s(K).length === 0 ? e(ue, 1) : e(de, -1)) : e(le);
  }),
    x($),
    x(Y),
    u(e, Y),
    b();
}
e([`click`]);
export { U as component };
