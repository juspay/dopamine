import { P as e, X as t, Z as n } from "./KQ3eEBfb.js";
var r = n(null),
  i = n(null),
  a = n(null),
  o = n(null),
  s = null,
  c = null,
  l = null,
  u = null,
  d = new Map(),
  f = new Map();
async function p(e) {
  try {
    let t = await fetch(e);
    return t.ok ? await t.json() : null;
  } catch {
    return null;
  }
}
function m() {
  return e(r) ? Promise.resolve(e(r)) : s || ((s = p(`/data/index.json`).then((n) => (n && t(r, n, !0), e(r)))), s);
}
function h() {
  return e(r)?.videos ?? [];
}
function g() {
  return e(r) !== null;
}
function _(t) {
  return e(r)?.videos.find((e) => e.id === t);
}
function v() {
  return e(i) ? Promise.resolve(e(i)) : c || ((c = p(`/data/facets.json`).then((n) => (n && t(i, n, !0), e(i)))), c);
}
function y() {
  return e(i);
}
function b() {
  return e(a) ? Promise.resolve(e(a)) : u || ((u = p(`/data/tools.json`).then((n) => (t(a, n ?? [], !0), e(a)))), u);
}
function x() {
  return e(a) ?? [];
}
function S() {
  return e(o)
    ? Promise.resolve(e(o))
    : l ||
        ((l = p(`/data/briefs.json`).then((e) => {
          let n = e ?? {};
          return t(o, n, !0), n;
        })),
        l);
}
function C() {
  return e(o) ?? {};
}
function w(e) {
  if (d.has(e)) return Promise.resolve(d.get(e) ?? null);
  let t = f.get(e);
  if (t) return t;
  let n = p(`/data/video/${encodeURIComponent(e)}.json`).then((t) => (d.set(e, t), t));
  return f.set(e, n), n;
}
export { h as a, w as c, b as d, x as i, v as l, _ as n, g as o, y as r, S as s, C as t, m as u };
