import {
  $ as e,
  C as t,
  D as n,
  E as r,
  G as i,
  H as a,
  I as o,
  K as s,
  M as c,
  N as l,
  P as u,
  Q as d,
  T as f,
  U as p,
  V as m,
  X as h,
  Y as g,
  Z as _,
  c as v,
  ct as y,
  d as ee,
  dt as b,
  et as x,
  f as S,
  g as C,
  i as w,
  it as T,
  j as E,
  k as D,
  m as O,
  nt as k,
  q as A,
  rt as j,
  s as M,
  st as te,
  tt as N,
  ut as ne,
  w as re,
  y as ie,
} from "../chunks/BZ84wCgC.js";
import "../chunks/xihTtKlq.js";
import { a as ae, l as oe, o as se, r as ce } from "../chunks/CdnViQ5q.js";
import { t as P } from "../chunks/BnXMJaDQ.js";
import { t as F } from "../chunks/Dt5KBvTb.js";
import { t as I } from "../chunks/CyjB8bAN.js";
var L = x(d({})),
  R = x(!1),
  z = x(null),
  B = x(0),
  V = null;
function le() {
  return (
    V ||
    ((V = (async () => {
      try {
        let t = await fetch(`/api/labels`);
        if (!t.ok) throw Error(`HTTP ${t.status}`);
        e(L, (await t.json()).labels ?? {}, !0);
      } catch (t) {
        e(z, `Labels unavailable: ${t instanceof Error ? t.message : String(t)}`);
      } finally {
        e(R, !0);
      }
    })()),
    V)
  );
}
function H(e) {
  return o(L)[e];
}
function U() {
  return o(L);
}
function ue() {
  return o(R);
}
function de() {
  return o(z);
}
var fe = { projects: [], tags: [], verdict: `applies`, note: ``, updatedAt: `` };
async function W(t, n) {
  let r = o(L)[t],
    i = { ...(r ?? fe), ...n, updatedAt: new Date().toISOString() };
  e(L, { ...o(L), [t]: i }, !0), N(B), e(z, null);
  try {
    let r = await fetch(`/api/labels/${encodeURIComponent(t)}`, {
      method: `PUT`,
      headers: { "Content-Type": `application/json` },
      body: JSON.stringify(n),
    });
    if (!r.ok) throw Error(`HTTP ${r.status}`);
    let { label: i } = await r.json();
    if (i) e(L, { ...o(L), [t]: i }, !0);
    else {
      let { [t]: n, ...r } = o(L);
      e(L, r, !0);
    }
  } catch (n) {
    if (r) e(L, { ...o(L), [t]: r }, !0);
    else {
      let { [t]: n, ...r } = o(L);
      e(L, r, !0);
    }
    e(z, `Save failed: ${n instanceof Error ? n.message : String(n)}`);
  } finally {
    N(B, -1);
  }
}
function pe(e, t) {
  let n = o(L)[e]?.projects ?? [],
    r = n.includes(t) ? n.filter((e) => e !== t) : [...n, t];
  return W(e, { projects: r, ...(r.length ? { verdict: `applies` } : {}) });
}
function me(e, t) {
  return W(e, t === `none` ? { verdict: t, projects: [] } : { verdict: t });
}
function G(e, t) {
  return W(e, { tags: t });
}
function K(e, t) {
  return W(e, { note: t });
}
function q(e) {
  let t = o(L)[e];
  return t ? t.verdict === `none` || t.projects.length > 0 || t.tags.length > 0 || t.note.trim() !== `` : !1;
}
var J = D(`<span class="dot svelte-11a69os" aria-hidden="true">•</span>`),
  he = D(`<button type="button"> <!></button>`),
  Y = D(`<button type="button" class="tag svelte-11a69os" title="Remove tag"> </button>`),
  X = D(
    `<div class="note-edit svelte-11a69os"><textarea rows="2" placeholder="why?" class="svelte-11a69os"></textarea> <button type="button" class="mini svelte-11a69os">Save</button></div>`,
  ),
  Z = D(`<button type="button" class="mini ghost svelte-11a69os"> </button>`),
  ge = D(
    `<div class="row svelte-11a69os"><span class="lede svelte-11a69os">Tags</span> <div class="chips svelte-11a69os"><!> <input class="tag-input svelte-11a69os" type="text" placeholder="add tag…"/></div></div> <div class="row svelte-11a69os"><span class="lede svelte-11a69os">Note</span> <!></div>`,
    1,
  ),
  Q = D(`<p class="state svelte-11a69os"><!></p>`),
  _e = D(
    `<div><div class="row svelte-11a69os"><span class="lede svelte-11a69os">Applies to</span> <div class="chips svelte-11a69os"><!> <button type="button" title="Confirmed non-match — a positive datum, not a skip">Nothing</button></div></div> <!> <!></div>`,
  );
function ve(c, d) {
  y(d, !0);
  let p = w(d, `suggested`, 19, () => []),
    m = w(d, `compact`, 3, !1),
    T = k(() => H(d.id)),
    D = k(() => o(T)?.projects ?? []),
    O = k(() => o(T)?.verdict ?? `applies`),
    A = k(() => q(d.id)),
    j = x(``),
    M = x(!1),
    N = x(``);
  function ne() {
    e(N, o(T)?.note ?? ``, !0), e(M, !0);
  }
  function ie() {
    let t = o(j).trim();
    if (!t) return;
    let n = [...(o(T)?.tags ?? []), t];
    e(j, ``), G(d.id, n);
  }
  function ae(e) {
    e.key === `Enter` && (e.preventDefault(), ie());
  }
  function oe(e) {
    G(
      d.id,
      (o(T)?.tags ?? []).filter((t) => t !== e),
    );
  }
  function se() {
    K(d.id, o(N)), e(M, !1);
  }
  let ce = k(
    () =>
      p().length > 0 &&
      o(D).length === p().length &&
      p().every((e) => o(D).some((t) => t.toLowerCase() === e.toLowerCase())),
  );
  var P = _e();
  let F;
  var I = g(P),
    L = _(g(I), 2),
    R = g(L);
  t(
    R,
    17,
    () => d.projects,
    re,
    (e, t) => {
      let i = k(() => o(D).some((e) => e.toLowerCase() === o(t).toLowerCase())),
        s = k(() => p().some((e) => e.toLowerCase() === o(t).toLowerCase()));
      var c = he();
      let u;
      var m = g(c, !0),
        h = _(m),
        v = (e) => {
          n(e, J());
        };
      f(h, (e) => {
        o(s) && e(v);
      }),
        b(c),
        a(() => {
          (u = C(c, 1, `pick svelte-11a69os`, null, u, { on: o(i), suggested: o(s) && !o(i) })),
            S(c, `aria-pressed`, o(i)),
            S(c, `title`, o(s) ? `The pipeline mapped this here` : void 0),
            r(m, o(t));
        }),
        l(`click`, c, () => pe(d.id, o(t))),
        n(e, c);
    },
  );
  var z = _(R, 2);
  let B;
  b(L), b(I);
  var V = _(I, 2),
    le = (c) => {
      var d = ge(),
        p = h(d),
        m = _(g(p), 2),
        y = g(m);
      t(
        y,
        17,
        () => o(T)?.tags ?? [],
        re,
        (e, t) => {
          var i = Y(),
            s = g(i);
          b(i), a(() => r(s, `${o(t) ?? ``} ×`)), l(`click`, i, () => oe(o(t))), n(e, i);
        },
      );
      var x = _(y, 2);
      ee(x), b(m), b(p);
      var S = _(p, 2),
        C = _(g(S), 2),
        w = (t) => {
          var r = X(),
            a = g(r);
          s(a), i(a, !0);
          var c = _(a, 2);
          b(r),
            v(
              a,
              () => o(N),
              (t) => e(N, t),
            ),
            l(`click`, c, se),
            n(t, r);
        },
        E = (e) => {
          var t = Z(),
            i = g(t, !0);
          b(t),
            a((e) => r(i, e), [() => (o(T)?.note ? o(T).note.slice(0, 80) : `add note`)]),
            l(`click`, t, ne),
            n(e, t);
        };
      f(C, (e) => {
        o(M) ? e(w) : e(E, -1);
      }),
        b(S),
        l(`keydown`, x, ae),
        u(`blur`, x, ie),
        v(
          x,
          () => o(j),
          (t) => e(j, t),
        ),
        n(c, d);
    };
  f(V, (e) => {
    m() || e(le);
  });
  var U = _(V, 2),
    ue = (e) => {
      var t = Q(),
        i = g(t),
        s = (e) => {
          n(e, E(`Marked as applying nowhere`));
        },
        c = (e) => {
          n(e, E(`Confirms the pipeline`));
        },
        l = (e) => {
          var t = E();
          a((e) => r(t, `Corrected → ${e ?? ``}`), [() => o(D).join(`, `)]), n(e, t);
        },
        u = (e) => {
          n(e, E(`Reviewed`));
        };
      f(i, (e) => {
        o(O) === `none` ? e(s) : o(ce) ? e(c, 1) : o(D).length ? e(l, 2) : e(u, -1);
      }),
        b(t),
        n(e, t);
    };
  f(U, (e) => {
    o(A) && e(ue);
  }),
    b(P),
    a(() => {
      (F = C(P, 1, `label-panel svelte-11a69os`, null, F, { compact: m(), reviewed: o(A) })),
        (B = C(z, 1, `pick none svelte-11a69os`, null, B, { on: o(O) === `none` })),
        S(z, `aria-pressed`, o(O) === `none`);
    }),
    l(`click`, z, () => me(d.id, o(O) === `none` ? `applies` : `none`)),
    n(c, P),
    te();
}
c([`click`, `keydown`]);
var ye = D(`<p class="err svelte-1mr7uv1"> </p>`),
  be = D(`<option> </option>`),
  xe = D(`<p class="progress svelte-1mr7uv1"><strong> </strong> </p>`),
  Se = D(`<p class="done svelte-1mr7uv1">Nothing left in this scope. Widen the scope or untick “hide reviewed”.</p>`),
  Ce = D(`<span class="sep svelte-1mr7uv1">·</span> `, 1),
  we = D(`<span class="sep svelte-1mr7uv1">·</span> `, 1),
  Te = D(
    `<li class="row svelte-1mr7uv1"><div class="meta svelte-1mr7uv1"><a class="title svelte-1mr7uv1"> </a> <span class="sub2 svelte-1mr7uv1"> <!> <!></span></div> <!></li>`,
  ),
  Ee = D(`<button class="more svelte-1mr7uv1">Show more</button>`),
  De = D(`<ul class="rows svelte-1mr7uv1"></ul> <!>`, 1),
  Oe =
    D(`<div class="review svelte-1mr7uv1"><!> <header class="head svelte-1mr7uv1"><h1 class="svelte-1mr7uv1">Review</h1> <p class="sub svelte-1mr7uv1">Mark where each learning actually applies. Your verdicts are the only ground truth in the system —
      everything else is the pipeline grading its own work.</p></header> <!> <div class="controls svelte-1mr7uv1"><div class="group svelte-1mr7uv1"><span class="lbl svelte-1mr7uv1">Scope</span> <button>Mapped</button> <button>Actionable</button> <button>All</button></div> <div class="group svelte-1mr7uv1"><span class="lbl svelte-1mr7uv1">Project</span> <select class="svelte-1mr7uv1"><option>any</option><!></select></div> <label class="chk svelte-1mr7uv1"><input type="checkbox"/> hide reviewed</label></div> <!> <!></div>`);
function ke(i, s) {
  y(s, !0);
  let c = () => T(P, `$page`, u),
    [u, d] = j();
  p(() => {
    oe(), le();
  });
  let v = k(ae),
    w = k(() => se() && ue()),
    E = k(de),
    D = k(() => (ce()?.projects ?? []).map((e) => e.name)),
    N = x(`mapped`),
    L = x(!0),
    R = x(``),
    z = x(25),
    B = !1;
  p(() => {
    let t = c().url.searchParams.get(`project`) ?? ``;
    !B && t && (e(R, t, !0), (B = !0));
  });
  let V = new Set([`apply-now`, `evaluate-later`]),
    H = k(() => {
      let e = o(v);
      return (
        o(N) === `mapped`
          ? (e = e.filter((e) => (e.appliesTo ?? []).length > 0))
          : o(N) === `actionable` && (e = e.filter((e) => V.has(e.actionability))),
        o(R) && (e = e.filter((e) => (e.appliesTo ?? []).some((e) => e.toLowerCase() === o(R).toLowerCase()))),
        [...e].sort((e, t) => (t.quality ?? 0) - (e.quality ?? 0))
      );
    }),
    fe = k(() => (U(), o(H).filter((e) => q(e.id)).length)),
    W = k(() => (U(), (o(L) ? o(H).filter((e) => !q(e.id)) : o(H)).slice(0, o(z)))),
    pe = k(() => Object.keys(U()).length),
    me = [{ label: `Home`, href: `/` }, { label: `→ Review` }];
  var G = Oe();
  ie(`1mr7uv1`, (e) => {
    m(() => {
      A.title = `Review — Dopamine`;
    });
  });
  var K = g(G);
  I(K, {
    get items() {
      return me;
    },
  });
  var J = _(K, 4),
    he = (e) => {
      var t = ye(),
        i = g(t);
      b(t), a(() => r(i, `${o(E) ?? ``} — the dashboard server must be running for labelling to save.`)), n(e, t);
    };
  f(J, (e) => {
    o(E) && e(he);
  });
  var Y = _(J, 2),
    X = g(Y),
    Z = _(g(X), 2);
  let ge;
  var Q = _(Z, 2);
  let _e;
  var ke = _(Q, 2);
  let Ae;
  b(X);
  var je = _(X, 2),
    Me = _(g(je), 2),
    $ = g(Me);
  ($.value = $.__value = ``),
    t(
      _($),
      17,
      () => o(D),
      re,
      (e, t) => {
        var i = be(),
          s = g(i, !0);
        b(i);
        var c = {};
        a(() => {
          r(s, o(t)), c !== (c = o(t)) && (i.value = (i.__value = o(t)) ?? ``);
        }),
          n(e, i);
      },
    ),
    b(Me),
    b(je);
  var Ne = _(je, 2),
    Pe = g(Ne);
  ee(Pe), ne(), b(Ne), b(Y);
  var Fe = _(Y, 2),
    Ie = (e) => {
      var t = xe(),
        i = g(t),
        s = g(i, !0);
      b(i);
      var c = _(i);
      b(t),
        a(() => {
          r(s, o(fe)), r(c, ` of ${o(H).length ?? ``} in scope reviewed · ${o(pe) ?? ``} labelled overall`);
        }),
        n(e, t);
    };
  f(Fe, (e) => {
    o(w) && e(Ie);
  });
  var Le = _(Fe, 2),
    Re = (e) => {
      F(e, {});
    },
    ze = (e) => {
      n(e, Se());
    },
    Be = (i) => {
      var s = De(),
        c = h(s);
      t(
        c,
        21,
        () => o(W),
        (e) => e.id,
        (e, t) => {
          var i = Te(),
            s = g(i),
            c = g(s),
            l = g(c, !0);
          b(c);
          var u = _(c, 2),
            d = g(u, !0),
            p = _(d),
            m = (e) => {
              var i = Ce(),
                s = _(h(i), 1, !0);
              a(() => r(s, o(t).actionability)), n(e, i);
            };
          f(p, (e) => {
            o(t).actionability && e(m);
          });
          var v = _(p, 2),
            y = (e) => {
              var i = we(),
                s = _(h(i));
              a((e) => r(s, `pipeline says ${e ?? ``}`), [() => o(t).appliesTo.join(`, `)]), n(e, i);
            };
          f(v, (e) => {
            (o(t).appliesTo ?? []).length && e(y);
          }),
            b(u),
            b(s);
          var ee = _(s, 2);
          {
            let e = k(() => o(t).appliesTo ?? []);
            ve(ee, {
              get id() {
                return o(t).id;
              },
              get projects() {
                return o(D);
              },
              get suggested() {
                return o(e);
              },
            });
          }
          b(i),
            a(
              (e) => {
                S(c, `href`, e), r(l, o(t).title), r(d, o(t).category);
              },
              [() => `/video/` + encodeURIComponent(o(t).id)],
            ),
            n(e, i);
        },
      ),
        b(c);
      var u = _(c, 2),
        d = (t) => {
          var r = Ee();
          l(`click`, r, () => e(z, o(z) + 25)), n(t, r);
        };
      f(u, (e) => {
        o(W).length >= o(z) && e(d);
      }),
        n(i, s);
    };
  f(Le, (e) => {
    o(w) ? (o(W).length === 0 ? e(ze, 1) : e(Be, -1)) : e(Re);
  }),
    b(G),
    a(() => {
      (ge = C(Z, 1, `seg svelte-1mr7uv1`, null, ge, { on: o(N) === `mapped` })),
        (_e = C(Q, 1, `seg svelte-1mr7uv1`, null, _e, { on: o(N) === `actionable` })),
        (Ae = C(ke, 1, `seg svelte-1mr7uv1`, null, Ae, { on: o(N) === `all` }));
    }),
    l(`click`, Z, () => e(N, `mapped`)),
    l(`click`, Q, () => e(N, `actionable`)),
    l(`click`, ke, () => e(N, `all`)),
    O(
      Me,
      () => o(R),
      (t) => e(R, t),
    ),
    M(
      Pe,
      () => o(L),
      (t) => e(L, t),
    ),
    n(i, G),
    te(),
    d();
}
c([`click`]);
export { ke as component };
