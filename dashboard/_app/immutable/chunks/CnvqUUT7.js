import {
  D as e,
  H as t,
  I as n,
  Y as r,
  ct as i,
  dt as a,
  g as o,
  h as s,
  i as c,
  k as l,
  nt as u,
  st as d,
} from "./BZ84wCgC.js";
import { t as f } from "./CcqLSuep.js";
import "./xihTtKlq.js";
import "./C513ZtO5.js";
import { d as p } from "./Dt5KBvTb.js";
function m(e) {
  if (!Number.isFinite(e) || e < 0) return `0:00`;
  let t = Math.round(e),
    n = Math.floor(t / 3600),
    r = Math.floor((t % 3600) / 60),
    i = t % 60;
  return n > 0
    ? `${n}:${String(r).padStart(2, `0`)}:${String(i).padStart(2, `0`)}`
    : `${r}:${String(i).padStart(2, `0`)}`;
}
function h(e) {
  if (!e) return ``;
  try {
    return new Intl.DateTimeFormat(`en-US`, { year: `numeric`, month: `short`, day: `numeric` }).format(new Date(e));
  } catch {
    return e;
  }
}
function g(e) {
  return Number.isFinite(e)
    ? e >= 1e6
      ? `${(e / 1e6).toFixed(1).replace(/\.0$/, ``)}M`
      : e >= 1e3
        ? `${(e / 1e3).toFixed(1).replace(/\.0$/, ``)}k`
        : String(e)
    : `0`;
}
var _ = {
    "Tech & Coding": `#d5e8f5`,
    "AI & Machine Learning": `#e8d5f5`,
    "UI/UX Design": `#f5d5e8`,
    "Business & Marketing": `#d5f5e0`,
    Education: `#f5f5d5`,
    Finance: `#d5f5f0`,
    "Interior Design & Home": `#f5e8d5`,
    "Food & Cooking": `#f5d5d5`,
    "Travel & Lifestyle": `#f0d5f5`,
    "Fitness & Health": `#e0f5d5`,
    "Entertainment & Comedy": `#f5e8e0`,
    Other: `#ddd`,
  },
  v = {
    "Tech & Coding": `#1f2d3d`,
    "AI & Machine Learning": `#2d1f3d`,
    "UI/UX Design": `#3d1f2d`,
    "Business & Marketing": `#1f3d2d`,
    Education: `#3d3d1f`,
    Finance: `#1f3d3a`,
    "Interior Design & Home": `#3d2d1f`,
    "Food & Cooking": `#3d1f1f`,
    "Travel & Lifestyle": `#351f3d`,
    "Fitness & Health": `#2a3d1f`,
    "Entertainment & Comedy": `#3d2e25`,
    Other: `#333`,
  },
  y = `#9aa3ad`,
  b = `rgba(154,163,173,0.12)`;
function x(e) {
  return _[e] ?? y;
}
function S(e) {
  return v[e] ?? b;
}
function C(e) {
  return e ? `https://instagram.com/reel/${encodeURIComponent(e)}/` : ``;
}
var w = {
    verified_useful: `Verified`,
    partially_verified: `Partial`,
    not_verified: `Unverified`,
    outdated: `Outdated`,
    not_verifiable: `Not verifiable`,
    unknown: `Not analysed`,
  },
  T = {
    verified_useful: `var(--ok)`,
    partially_verified: `var(--warn)`,
    not_verified: `var(--neutral)`,
    outdated: `var(--bad)`,
    not_verifiable: `var(--neutral)`,
    unknown: `var(--neutral)`,
  };
function E(e) {
  return w[e] ?? e;
}
function D(e) {
  return T[e] ?? `var(--neutral)`;
}
function O(e) {
  switch (e) {
    case `classification-failed`:
      return `Classification failed for this video — it was never processed.`;
    case `not-extracted`:
      return `Knowledge extraction has not run for this video yet.`;
    case `extraction-empty`:
      return `Extraction ran but found little content in this video.`;
    case `low-signal`:
      return `This video was processed, but carries little actionable content.`;
    default:
      return ``;
  }
}
var k = l(`<span><!></span>`);
function A(l, m) {
  i(m, !0);
  let h = c(m, `size`, 3, `sm`),
    g = u(() =>
      [
        m.bg ? `--pill-background:${m.bg}` : ``,
        m.bg ? `--pill-hover-background:${m.bg}` : ``,
        m.color ? `--pill-color:${m.color}` : ``,
        m.color ? `--pill-hover-color:${m.color}` : ``,
      ]
        .filter(Boolean)
        .join(`;`),
    ),
    _ = u(() => !!(m.onclick || m.href));
  function v(e) {
    m.onclick ? m.onclick(e) : m.href && f(m.href);
  }
  var y = k();
  let b;
  var x = r(y);
  {
    let e = u(() => (n(_) ? v : void 0));
    p(x, {
      get text() {
        return m.label;
      },
      get onclick() {
        return n(e);
      },
    });
  }
  a(y),
    t(() => {
      (b = o(y, 1, `chip-wrap svelte-ogjsci`, null, b, { "chip-md": h() === `md`, "chip-passive": !n(_) })),
        s(y, n(g) || void 0);
    }),
    e(l, y),
    d();
}
function j(e, t) {
  i(t, !0);
  let r = c(t, `size`, 3, `sm`),
    a = u(() => S(t.cat)),
    o = u(() => x(t.cat));
  function s(e) {
    e.stopPropagation(), t.onclick ? t.onclick(e) : f(`/category/` + encodeURIComponent(t.cat));
  }
  A(e, {
    get label() {
      return t.cat;
    },
    get size() {
      return r();
    },
    get color() {
      return n(o);
    },
    get bg() {
      return n(a);
    },
    onclick: s,
  }),
    d();
}
export { h as a, C as c, E as d, x as i, O as l, A as n, m as o, S as r, g as s, j as t, D as u };
