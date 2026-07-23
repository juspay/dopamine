import {
  B as e,
  D as t,
  K as n,
  P as r,
  Q as i,
  T as a,
  i as o,
  it as s,
  m as c,
  p as l,
  rt as u,
  st as d,
} from "./KQ3eEBfb.js";
import { t as f } from "./BHIZHYj4.js";
import "./xihTtKlq.js";
import "./Cd4YZbZJ.js";
import { d as p } from "./BcfutCr0.js";
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
var O = t(`<span><!></span>`);
function k(t, m) {
  s(m, !0);
  let h = o(m, `size`, 3, `sm`),
    g = i(() =>
      [
        m.bg ? `--pill-background:${m.bg}` : ``,
        m.bg ? `--pill-hover-background:${m.bg}` : ``,
        m.color ? `--pill-color:${m.color}` : ``,
        m.color ? `--pill-hover-color:${m.color}` : ``,
      ]
        .filter(Boolean)
        .join(`;`),
    ),
    _ = i(() => !!(m.onclick || m.href));
  function v(e) {
    m.onclick ? m.onclick(e) : m.href && f(m.href);
  }
  var y = O();
  let b;
  var x = n(y);
  {
    let e = i(() => (r(_) ? v : void 0));
    p(x, {
      get text() {
        return m.label;
      },
      get onclick() {
        return r(e);
      },
    });
  }
  d(y),
    e(() => {
      (b = c(y, 1, `chip-wrap svelte-ogjsci`, null, b, { "chip-md": h() === `md`, "chip-passive": !r(_) })),
        l(y, r(g) || void 0);
    }),
    a(t, y),
    u();
}
function A(e, t) {
  s(t, !0);
  let n = o(t, `size`, 3, `sm`),
    a = i(() => S(t.cat)),
    c = i(() => x(t.cat));
  function l(e) {
    e.stopPropagation(), t.onclick ? t.onclick(e) : f(`/category/` + encodeURIComponent(t.cat));
  }
  k(e, {
    get label() {
      return t.cat;
    },
    get size() {
      return n();
    },
    get color() {
      return r(c);
    },
    get bg() {
      return r(a);
    },
    onclick: l,
  }),
    u();
}
export { h as a, C as c, x as i, D as l, k as n, m as o, S as r, g as s, A as t, E as u };
