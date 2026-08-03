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
  d as b,
  dt as x,
  et as S,
  f as C,
  g as w,
  i as T,
  it as E,
  j as D,
  k as O,
  m as k,
  nt as A,
  q as ee,
  rt as j,
  s as M,
  st as te,
  tt as N,
  ut as ne,
  w as P,
  y as re,
  z as ie,
} from "../chunks/BZ84wCgC.js";
import "../chunks/xihTtKlq.js";
import { a as ae, l as oe, o as se, r as F } from "../chunks/CdnViQ5q.js";
import { t as ce } from "../chunks/B2DVDhc0.js";
import { t as I } from "../chunks/Dt5KBvTb.js";
import { t as le } from "../chunks/CyjB8bAN.js";
var L = S(d({})),
  R = S(!1),
  z = S(null),
  B = S(0),
  V = null;
function ue() {
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
function de(e) {
  return o(L)[e];
}
function H() {
  return o(L);
}
function fe() {
  return o(R);
}
function pe() {
  return o(z);
}
var U = { projects: [], tags: [], verdict: `applies`, note: ``, updatedAt: `` };
async function W(t, n) {
  let r = o(L)[t],
    i = { ...(r ?? U), ...n, updatedAt: new Date().toISOString() };
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
function G(e, t) {
  let n = o(L)[e]?.projects ?? [],
    r = n.includes(t) ? n.filter((e) => e !== t) : [...n, t];
  return W(e, { projects: r, ...(r.length ? { verdict: `applies` } : {}) });
}
function me(e, t) {
  return W(e, t === `none` ? { verdict: t, projects: [] } : { verdict: t });
}
function K(e, t) {
  return W(e, { tags: t });
}
function q(e, t) {
  return W(e, { note: t });
}
function J(e) {
  let t = o(L)[e];
  return t ? t.verdict === `none` || t.projects.length > 0 || t.tags.length > 0 || t.note.trim() !== `` : !1;
}
var he = O(`<span class="dot svelte-11a69os" aria-hidden="true">•</span>`),
  ge = O(`<button type="button"> <!></button>`),
  Y = O(`<button type="button" class="tag svelte-11a69os" title="Remove tag"> </button>`),
  _e = O(
    `<div class="note-edit svelte-11a69os"><textarea rows="2" placeholder="why?" class="svelte-11a69os"></textarea> <button type="button" class="mini svelte-11a69os">Save</button></div>`,
  ),
  ve = O(`<button type="button" class="mini ghost svelte-11a69os"> </button>`),
  ye = O(
    `<div class="row svelte-11a69os"><span class="lede svelte-11a69os">Tags</span> <div class="chips svelte-11a69os"><!> <input class="tag-input svelte-11a69os" type="text" placeholder="add tag…"/></div></div> <div class="row svelte-11a69os"><span class="lede svelte-11a69os">Note</span> <!></div>`,
    1,
  ),
  X = O(`<p class="state svelte-11a69os"><!></p>`),
  Z = O(
    `<div><div class="row svelte-11a69os"><span class="lede svelte-11a69os">Applies to</span> <div class="chips svelte-11a69os"><!> <button type="button" title="Confirmed non-match — a positive datum, not a skip">Nothing</button></div></div> <!> <!></div>`,
  );
function be(c, d) {
  y(d, !0);
  let p = T(d, `suggested`, 19, () => []),
    m = T(d, `compact`, 3, !1),
    E = A(() => de(d.id)),
    O = A(() => o(E)?.projects ?? []),
    k = A(() => o(E)?.verdict ?? `applies`),
    ee = A(() => J(d.id)),
    j = S(``),
    M = S(!1),
    N = S(``);
  function ne() {
    e(N, o(E)?.note ?? ``, !0), e(M, !0);
  }
  function re() {
    let t = o(j).trim();
    if (!t) return;
    let n = [...(o(E)?.tags ?? []), t];
    e(j, ``), K(d.id, n);
  }
  function ie(e) {
    e.key === `Enter` && (e.preventDefault(), re());
  }
  function ae(e) {
    K(
      d.id,
      (o(E)?.tags ?? []).filter((t) => t !== e),
    );
  }
  function oe() {
    q(d.id, o(N)), e(M, !1);
  }
  let se = A(
    () =>
      p().length > 0 &&
      o(O).length === p().length &&
      p().every((e) => o(O).some((t) => t.toLowerCase() === e.toLowerCase())),
  );
  var F = Z();
  let ce;
  var I = g(F),
    le = _(g(I), 2),
    L = g(le);
  t(
    L,
    17,
    () => d.projects,
    P,
    (e, t) => {
      let i = A(() => o(O).some((e) => e.toLowerCase() === o(t).toLowerCase())),
        s = A(() => p().some((e) => e.toLowerCase() === o(t).toLowerCase()));
      var c = ge();
      let u;
      var m = g(c, !0),
        h = _(m),
        v = (e) => {
          n(e, he());
        };
      f(h, (e) => {
        o(s) && e(v);
      }),
        x(c),
        a(() => {
          (u = w(c, 1, `pick svelte-11a69os`, null, u, { on: o(i), suggested: o(s) && !o(i) })),
            C(c, `aria-pressed`, o(i)),
            C(c, `title`, o(s) ? `The pipeline mapped this here` : void 0),
            r(m, o(t));
        }),
        l(`click`, c, () => G(d.id, o(t))),
        n(e, c);
    },
  );
  var R = _(L, 2);
  let z;
  x(le), x(I);
  var B = _(I, 2),
    V = (c) => {
      var d = ye(),
        p = h(d),
        m = _(g(p), 2),
        y = g(m);
      t(
        y,
        17,
        () => o(E)?.tags ?? [],
        P,
        (e, t) => {
          var i = Y(),
            s = g(i);
          x(i), a(() => r(s, `${o(t) ?? ``} ×`)), l(`click`, i, () => ae(o(t))), n(e, i);
        },
      );
      var S = _(y, 2);
      b(S), x(m), x(p);
      var C = _(p, 2),
        w = _(g(C), 2),
        T = (t) => {
          var r = _e(),
            a = g(r);
          s(a), i(a, !0);
          var c = _(a, 2);
          x(r),
            v(
              a,
              () => o(N),
              (t) => e(N, t),
            ),
            l(`click`, c, oe),
            n(t, r);
        },
        D = (e) => {
          var t = ve(),
            i = g(t, !0);
          x(t),
            a((e) => r(i, e), [() => (o(E)?.note ? o(E).note.slice(0, 80) : `add note`)]),
            l(`click`, t, ne),
            n(e, t);
        };
      f(w, (e) => {
        o(M) ? e(T) : e(D, -1);
      }),
        x(C),
        l(`keydown`, S, ie),
        u(`blur`, S, re),
        v(
          S,
          () => o(j),
          (t) => e(j, t),
        ),
        n(c, d);
    };
  f(B, (e) => {
    m() || e(V);
  });
  var ue = _(B, 2),
    H = (e) => {
      var t = X(),
        i = g(t),
        s = (e) => {
          n(e, D(`Marked as applying nowhere`));
        },
        c = (e) => {
          n(e, D(`Confirms the pipeline`));
        },
        l = (e) => {
          var t = D();
          a((e) => r(t, `Corrected → ${e ?? ``}`), [() => o(O).join(`, `)]), n(e, t);
        },
        u = (e) => {
          n(e, D(`Reviewed`));
        };
      f(i, (e) => {
        o(k) === `none` ? e(s) : o(se) ? e(c, 1) : o(O).length ? e(l, 2) : e(u, -1);
      }),
        x(t),
        n(e, t);
    };
  f(ue, (e) => {
    o(ee) && e(H);
  }),
    x(F),
    a(() => {
      (ce = w(F, 1, `label-panel svelte-11a69os`, null, ce, { compact: m(), reviewed: o(ee) })),
        (z = w(R, 1, `pick none svelte-11a69os`, null, z, { on: o(k) === `none` })),
        C(R, `aria-pressed`, o(k) === `none`);
    }),
    l(`click`, R, () => me(d.id, o(k) === `none` ? `applies` : `none`)),
    n(c, F),
    te();
}
c([`click`, `keydown`]);
var xe = O(`<p class="err svelte-1mr7uv1"> </p>`),
  Se = O(`<option> </option>`),
  Ce = O(`<p class="progress svelte-1mr7uv1"><strong> </strong> </p>`),
  we = O(`<p class="done svelte-1mr7uv1">Nothing left in this scope. Widen the scope or untick “hide reviewed”.</p>`),
  Te = O(`<span class="sep svelte-1mr7uv1">·</span> `, 1),
  Ee = O(`<span class="sep svelte-1mr7uv1">·</span> `, 1),
  De = O(
    `<li class="row svelte-1mr7uv1"><div class="meta svelte-1mr7uv1"><a class="title svelte-1mr7uv1"> </a> <span class="sub2 svelte-1mr7uv1"> <!> <!></span></div> <!></li>`,
  ),
  Oe = O(`<button class="more svelte-1mr7uv1">Show more</button>`),
  ke = O(`<ul class="rows svelte-1mr7uv1"></ul> <!>`, 1),
  Ae =
    O(`<div class="review svelte-1mr7uv1"><!> <header class="head svelte-1mr7uv1"><h1 class="svelte-1mr7uv1">Review</h1> <p class="sub svelte-1mr7uv1">Mark where each learning actually applies. Your verdicts are the only ground truth in the system —
      everything else is the pipeline grading its own work.</p></header> <!> <div class="controls svelte-1mr7uv1"><div class="group svelte-1mr7uv1"><span class="lbl svelte-1mr7uv1">Scope</span> <button>Mapped</button> <button>Actionable</button> <button>All</button></div> <div class="group svelte-1mr7uv1"><span class="lbl svelte-1mr7uv1">Project</span> <select class="svelte-1mr7uv1"><option>any</option><!></select></div> <label class="chk svelte-1mr7uv1"><input type="checkbox"/> hide reviewed</label> <button class="seg svelte-1mr7uv1"> </button></div> <!> <!></div>`);
function Q(i, s) {
  y(s, !0);
  let c = () => E(ce, `$page`, u),
    [u, v] = j();
  p(() => {
    oe(), ue();
  });
  let T = A(ae),
    D = A(() => se() && fe()),
    O = A(pe),
    N = A(() => (F()?.projects ?? []).map((e) => e.name)),
    L = S(`mapped`),
    R = S(!0),
    z = S(``),
    B = S(25),
    V = !1;
  p(() => {
    let t = c().url.searchParams.get(`project`) ?? ``;
    !V && t && (e(z, t, !0), (V = !0));
  });
  let de = new Set([`apply-now`, `evaluate-later`]),
    U = A(() => {
      let e = o(T);
      return (
        o(L) === `mapped`
          ? (e = e.filter((e) => (e.appliesTo ?? []).length > 0))
          : o(L) === `actionable` && (e = e.filter((e) => de.has(e.actionability))),
        o(z) && (e = e.filter((e) => (e.appliesTo ?? []).some((e) => e.toLowerCase() === o(z).toLowerCase()))),
        [...e].sort((e, t) => (t.quality ?? 0) - (e.quality ?? 0))
      );
    }),
    W = A(() => (H(), o(U).filter((e) => J(e.id)).length)),
    G = S(d([]));
  function me() {
    e(G, (o(R) ? o(U).filter((e) => !J(e.id)) : o(U)).slice(0, o(B)), !0);
  }
  p(() => {
    o(L), o(z), o(R), o(B), o(D), ie(me);
  });
  let K = A(() => o(G)),
    q = A(() => (H(), o(G).filter((e) => J(e.id)).length)),
    he = A(() => Object.keys(H()).length),
    ge = [{ label: `Home`, href: `/` }, { label: `→ Review` }];
  var Y = Ae();
  re(`1mr7uv1`, (e) => {
    m(() => {
      ee.title = `Review — Dopamine`;
    });
  });
  var _e = g(Y);
  le(_e, {
    get items() {
      return ge;
    },
  });
  var ve = _(_e, 4),
    ye = (e) => {
      var t = xe(),
        i = g(t);
      x(t), a(() => r(i, `${o(O) ?? ``} — the dashboard server must be running for labelling to save.`)), n(e, t);
    };
  f(ve, (e) => {
    o(O) && e(ye);
  });
  var X = _(ve, 2),
    Z = g(X),
    Q = _(g(Z), 2);
  let je;
  var Me = _(Q, 2);
  let Ne;
  var Pe = _(Me, 2);
  let Fe;
  x(Z);
  var Ie = _(Z, 2),
    Le = _(g(Ie), 2),
    Re = g(Le);
  (Re.value = Re.__value = ``),
    t(
      _(Re),
      17,
      () => o(N),
      P,
      (e, t) => {
        var i = Se(),
          s = g(i, !0);
        x(i);
        var c = {};
        a(() => {
          r(s, o(t)), c !== (c = o(t)) && (i.value = (i.__value = o(t)) ?? ``);
        }),
          n(e, i);
      },
    ),
    x(Le),
    x(Ie);
  var ze = _(Ie, 2),
    Be = g(ze);
  b(Be), ne(), x(ze);
  var $ = _(ze, 2),
    Ve = g($);
  x($), x(X);
  var He = _(X, 2),
    Ue = (e) => {
      var t = Ce(),
        i = g(t),
        s = g(i, !0);
      x(i);
      var c = _(i);
      x(t),
        a(() => {
          r(s, o(W)), r(c, ` of ${o(U).length ?? ``} in scope reviewed · ${o(he) ?? ``} labelled overall`);
        }),
        n(e, t);
    };
  f(He, (e) => {
    o(D) && e(Ue);
  });
  var We = _(He, 2),
    Ge = (e) => {
      I(e, {});
    },
    Ke = (e) => {
      n(e, we());
    },
    qe = (i) => {
      var s = ke(),
        c = h(s);
      t(
        c,
        21,
        () => o(K),
        (e) => e.id,
        (e, t) => {
          var i = De(),
            s = g(i),
            c = g(s),
            l = g(c, !0);
          x(c);
          var u = _(c, 2),
            d = g(u, !0),
            p = _(d),
            m = (e) => {
              var i = Te(),
                s = _(h(i), 1, !0);
              a(() => r(s, o(t).actionability)), n(e, i);
            };
          f(p, (e) => {
            o(t).actionability && e(m);
          });
          var v = _(p, 2),
            y = (e) => {
              var i = Ee(),
                s = _(h(i));
              a((e) => r(s, `pipeline says ${e ?? ``}`), [() => o(t).appliesTo.join(`, `)]), n(e, i);
            };
          f(v, (e) => {
            (o(t).appliesTo ?? []).length && e(y);
          }),
            x(u),
            x(s);
          var b = _(s, 2);
          {
            let e = A(() => o(t).appliesTo ?? []);
            be(b, {
              get id() {
                return o(t).id;
              },
              get projects() {
                return o(N);
              },
              get suggested() {
                return o(e);
              },
            });
          }
          x(i),
            a(
              (e) => {
                C(c, `href`, e), r(l, o(t).title), r(d, o(t).category);
              },
              [() => `/video/` + encodeURIComponent(o(t).id)],
            ),
            n(e, i);
        },
      ),
        x(c);
      var u = _(c, 2),
        d = (t) => {
          var r = Oe();
          l(`click`, r, () => e(B, o(B) + 25)), n(t, r);
        };
      f(u, (e) => {
        o(K).length >= o(B) && e(d);
      }),
        n(i, s);
    };
  f(We, (e) => {
    o(D) ? (o(K).length === 0 ? e(Ke, 1) : e(qe, -1)) : e(Ge);
  }),
    x(Y),
    a(() => {
      (je = w(Q, 1, `seg svelte-1mr7uv1`, null, je, { on: o(L) === `mapped` })),
        (Ne = w(Me, 1, `seg svelte-1mr7uv1`, null, Ne, { on: o(L) === `actionable` })),
        (Fe = w(Pe, 1, `seg svelte-1mr7uv1`, null, Fe, { on: o(L) === `all` })),
        ($.disabled = o(q) === 0),
        r(Ve, `Clear reviewed${o(q) ? ` (${o(q)})` : ``}`);
    }),
    l(`click`, Q, () => e(L, `mapped`)),
    l(`click`, Me, () => e(L, `actionable`)),
    l(`click`, Pe, () => e(L, `all`)),
    k(
      Le,
      () => o(z),
      (t) => e(z, t),
    ),
    M(
      Be,
      () => o(R),
      (t) => e(R, t),
    ),
    l(`click`, $, me),
    n(i, Y),
    te(),
    v();
}
c([`click`]);
export { Q as component };
