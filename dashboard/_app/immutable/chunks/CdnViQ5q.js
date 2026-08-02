import { $ as e, I as t, et as n } from "./BZ84wCgC.js";
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
  return t(r) ? Promise.resolve(t(r)) : s || ((s = p(`/data/index.json`).then((n) => (n && e(r, n, !0), t(r)))), s);
}
function h() {
  return t(r)?.videos ?? [];
}
function g() {
  return t(r) !== null;
}
function _(e) {
  return t(r)?.videos.find((t) => t.id === e);
}
function v() {
  return t(i) ? Promise.resolve(t(i)) : c || ((c = p(`/data/facets.json`).then((n) => (n && e(i, n, !0), t(i)))), c);
}
function y() {
  return t(i);
}
function b() {
  return t(a) ? Promise.resolve(t(a)) : u || ((u = p(`/data/tools.json`).then((n) => (e(a, n ?? [], !0), t(a)))), u);
}
function x() {
  return t(a) ?? [];
}
function S() {
  return t(o)
    ? Promise.resolve(t(o))
    : l ||
        ((l = p(`/data/briefs.json`).then((t) => {
          let n = t ?? {};
          return e(o, n, !0), n;
        })),
        l);
}
function C() {
  return t(o) ?? {};
}
function w(e) {
  if (d.has(e)) return Promise.resolve(d.get(e) ?? null);
  let t = f.get(e);
  if (t) return t;
  let n = p(`/data/video/${encodeURIComponent(e)}.json`).then((t) => (d.set(e, t), t));
  return f.set(e, n), n;
}
export { h as a, w as c, b as d, x as i, v as l, _ as n, g as o, y as r, S as s, C as t, m as u };
