import { F as e, I as t, P as n, X as r, Z as i, n as a, t as o, tt as s } from "./KQ3eEBfb.js";
var c = class {
    constructor(e, t) {
      (this.status = e),
        typeof t == `string`
          ? (this.body = { message: t })
          : t
            ? (this.body = t)
            : (this.body = { message: `Error: ${e}` });
    }
    toString() {
      return JSON.stringify(this.body);
    }
  },
  l = class {
    constructor(e, t) {
      try {
        new Headers({ location: t });
      } catch {
        throw Error(
          `Invalid redirect location ${JSON.stringify(t)}: this string contains characters that cannot be used in HTTP headers`,
        );
      }
      (this.status = e), (this.location = t);
    }
  },
  u = class extends Error {
    constructor(e, t, n) {
      super(n), (this.status = e), (this.text = t);
    }
  };
new URL(`sveltekit-internal://`);
function d(e, t) {
  return e === `/` || t === `ignore`
    ? e
    : t === `never`
      ? e.endsWith(`/`)
        ? e.slice(0, -1)
        : e
      : t === `always` && !e.endsWith(`/`)
        ? e + `/`
        : e;
}
function f(e) {
  return e.split(`%25`).map(decodeURI).join(`%25`);
}
function p(e) {
  for (let t in e) e[t] = decodeURIComponent(e[t]);
  return e;
}
function m({ href: e }) {
  return e.split(`#`)[0];
}
function h() {}
function g(...e) {
  let t = 5381;
  for (let n of e)
    if (typeof n == `string`) {
      let e = n.length;
      for (; e; ) t = (t * 33) ^ n.charCodeAt(--e);
    } else if (ArrayBuffer.isView(n)) {
      let e = new Uint8Array(n.buffer, n.byteOffset, n.byteLength),
        r = e.length;
      for (; r; ) t = (t * 33) ^ e[--r];
    } else throw TypeError(`value must be a string or TypedArray`);
  return (t >>> 0).toString(36);
}
new TextEncoder();
function _(e) {
  let t = atob(e),
    n = new Uint8Array(t.length);
  for (let e = 0; e < t.length; e++) n[e] = t.charCodeAt(e);
  return n;
}
var v = window.fetch;
window.fetch = (e, t) => ((e instanceof Request ? e.method : t?.method || `GET`) !== `GET` && y.delete(x(e)), v(e, t));
var y = new Map();
function ee(e, t) {
  let n = x(e, t),
    r = document.querySelector(n);
  if (r?.textContent) {
    r.remove();
    let { body: e, ...t } = JSON.parse(r.textContent),
      i = r.getAttribute(`data-ttl`);
    return (
      i && y.set(n, { body: e, init: t, ttl: 1e3 * Number(i) }),
      r.getAttribute(`data-b64`) !== null && (e = _(e)),
      Promise.resolve(new Response(e, t))
    );
  }
  return window.fetch(e, t);
}
function b(e, t, n) {
  if (y.size > 0) {
    let t = x(e, n),
      r = y.get(t);
    if (r) {
      if (performance.now() < r.ttl && [`default`, `force-cache`, `only-if-cached`, void 0].includes(n?.cache))
        return new Response(r.body, r.init);
      y.delete(t);
    }
  }
  return window.fetch(t, n);
}
function x(e, t) {
  let n = `script[data-sveltekit-fetched][data-url=${JSON.stringify(e instanceof Request ? e.url : e)}]`;
  if (t?.headers || t?.body) {
    let e = [];
    t.headers && e.push([...new Headers(t.headers)].join(`,`)),
      t.body && (typeof t.body == `string` || ArrayBuffer.isView(t.body)) && e.push(t.body),
      (n += `[data-hash="${g(...e)}"]`);
  }
  return n;
}
var S = /^(\[)?(\.\.\.)?(\w+)(?:=(\w+))?(\])?$/,
  te = /^\/\((?:[^)]+)\)$/;
function C(e) {
  let t = [];
  return {
    pattern:
      e === `/` || te.test(e)
        ? /^\/$/
        : RegExp(
            `^${re(e)
              .map((e) => {
                let n = /^\[\.\.\.(\w+)(?:=(\w+))?\]$/.exec(e);
                if (n)
                  return t.push({ name: n[1], matcher: n[2], optional: !1, rest: !0, chained: !0 }), `(?:/([^]*))?`;
                let r = /^\[\[(\w+)(?:=(\w+))?\]\]$/.exec(e);
                if (r)
                  return t.push({ name: r[1], matcher: r[2], optional: !0, rest: !1, chained: !0 }), `(?:/([^/]+))?`;
                if (!e) return;
                let i = e.split(/\[(.+?)\](?!\])/);
                return (
                  `/` +
                  i
                    .map((e, n) => {
                      if (n % 2) {
                        if (e.startsWith(`x+`)) return ae(String.fromCharCode(parseInt(e.slice(2), 16)));
                        if (e.startsWith(`u+`))
                          return ae(
                            String.fromCharCode(
                              ...e
                                .slice(2)
                                .split(`-`)
                                .map((e) => parseInt(e, 16)),
                            ),
                          );
                        let [, r, a, o, s] = S.exec(e);
                        return (
                          t.push({
                            name: o,
                            matcher: s,
                            optional: !!r,
                            rest: !!a,
                            chained: a ? n === 1 && i[0] === `` : !1,
                          }),
                          a ? `([^]*?)` : r ? `([^/]*)?` : `([^/]+?)`
                        );
                      }
                      return ae(e);
                    })
                    .join(``)
                );
              })
              .join(``)}/?$`,
          ),
    params: t,
  };
}
function ne(e) {
  return e !== `` && !/^\([^)]+\)$/.test(e);
}
function re(e) {
  return e.slice(1).split(`/`).filter(ne);
}
function ie(e, t, n) {
  let r = {},
    i = e.slice(1),
    a = i.filter((e) => e !== void 0),
    o = 0;
  for (let e = 0; e < t.length; e += 1) {
    let s = t[e],
      c = i[e - o];
    if (
      (s.chained &&
        s.rest &&
        o &&
        ((c = i
          .slice(e - o, e + 1)
          .filter((e) => e)
          .join(`/`)),
        (o = 0)),
      c === void 0)
    )
      if (s.rest) c = ``;
      else continue;
    if (!s.matcher || n[s.matcher](c)) {
      r[s.name] = c;
      let n = t[e + 1],
        l = i[e + 1];
      n && !n.rest && n.optional && l && s.chained && (o = 0),
        !n && !l && Object.keys(r).length === a.length && (o = 0);
      continue;
    }
    if (s.optional && s.chained) {
      o++;
      continue;
    }
    return;
  }
  if (!o) return r;
}
function ae(e) {
  return e
    .normalize()
    .replace(/[[\]]/g, `\\$&`)
    .replace(/%/g, `%25`)
    .replace(/\//g, `%2[Ff]`)
    .replace(/\?/g, `%3[Ff]`)
    .replace(/#/g, `%23`)
    .replace(/[.*+?^${}()|\\]/g, `\\$&`);
}
function oe({ nodes: e, server_loads: t, dictionary: n, matchers: r }) {
  let i = new Set(t);
  return Object.entries(n).map(([t, [n, i, s]]) => {
    let { pattern: c, params: l } = C(t),
      u = {
        id: t,
        exec: (e) => {
          let t = c.exec(e);
          if (t) return ie(t, l, r);
        },
        errors: [1, ...(s || [])].map((t) => e[t]),
        layouts: [0, ...(i || [])].map(o),
        leaf: a(n),
      };
    return (u.errors.length = u.layouts.length = Math.max(u.errors.length, u.layouts.length)), u;
  });
  function a(t) {
    let n = t < 0;
    return n && (t = ~t), [n, e[t]];
  }
  function o(t) {
    return t === void 0 ? t : [i.has(t), e[t]];
  }
}
function se(e, t = JSON.parse) {
  try {
    return t(sessionStorage[e]);
  } catch {}
}
function ce(e, t, n = JSON.stringify) {
  let r = n(t);
  try {
    sessionStorage[e] = r;
  } catch {}
}
var w = globalThis.__sveltekit_shvguo?.base ?? ``,
  le = globalThis.__sveltekit_shvguo?.assets ?? w ?? ``,
  ue = `1784784291385`,
  de = `sveltekit:snapshot`,
  fe = `sveltekit:scroll`,
  pe = `sveltekit:states`,
  T = `sveltekit:history`,
  E = `sveltekit:navigation`,
  D = { tap: 1, hover: 2, viewport: 3, eager: 4, off: -1, false: -1 },
  O = location.origin;
function me(e) {
  if (e instanceof URL) return e;
  let t = document.baseURI;
  if (!t) {
    let e = document.getElementsByTagName(`base`);
    t = e.length ? e[0].href : document.URL;
  }
  return new URL(e, t);
}
function k() {
  return { x: pageXOffset, y: pageYOffset };
}
function A(e, t) {
  return e.getAttribute(`data-sveltekit-${t}`);
}
var he = { ...D, "": D.hover };
function ge(e) {
  let t = e.assignedSlot ?? e.parentNode;
  return t?.nodeType === 11 && (t = t.host), t;
}
function _e(e, t) {
  for (; e && e !== t; ) {
    if (e.nodeName.toUpperCase() === `A` && e.hasAttribute(`href`)) return e;
    e = ge(e);
  }
}
function ve(e, t, n) {
  let r;
  try {
    if (
      ((r = new URL(e instanceof SVGAElement ? e.href.baseVal : e.href, document.baseURI)), n && r.hash.match(/^#[^/]/))
    ) {
      let e = location.hash.split(`#`)[1] || `/`;
      r.hash = `#${e}${r.hash}`;
    }
  } catch {}
  let i = e instanceof SVGAElement ? e.target.baseVal : e.target,
    a = !r || !!i || M(r, t, n) || (e.getAttribute(`rel`) || ``).split(/\s+/).includes(`external`),
    o = r?.origin === O && e.hasAttribute(`download`);
  return { url: r, external: a, target: i, download: o };
}
function j(e) {
  let t = null,
    n = null,
    r = null,
    i = null,
    a = null,
    o = null,
    s = e;
  for (; s && s !== document.documentElement; )
    r === null && (r = A(s, `preload-code`)),
      i === null && (i = A(s, `preload-data`)),
      t === null && (t = A(s, `keepfocus`)),
      n === null && (n = A(s, `noscroll`)),
      a === null && (a = A(s, `reload`)),
      o === null && (o = A(s, `replacestate`)),
      (s = ge(s));
  function c(e) {
    switch (e) {
      case ``:
      case `true`:
        return !0;
      case `off`:
      case `false`:
        return !1;
      default:
        return;
    }
  }
  return {
    preload_code: he[r ?? `off`],
    preload_data: he[i ?? `off`],
    keepfocus: c(t),
    noscroll: c(n),
    reload: c(a),
    replace_state: c(o),
  };
}
function ye(e) {
  let t = s(e),
    n = !0;
  function r() {
    (n = !0), t.update((e) => e);
  }
  function i(e) {
    (n = !1), t.set(e);
  }
  function a(e) {
    let r;
    return t.subscribe((t) => {
      (r === void 0 || (n && t !== r)) && e((r = t));
    });
  }
  return { notify: r, set: i, subscribe: a };
}
var be = { v: h };
function xe() {
  let { set: e, subscribe: t } = s(!1);
  async function n() {
    clearTimeout(void 0);
    try {
      let t = await fetch(`${le}/_app/version.json`, { headers: { pragma: `no-cache`, "cache-control": `no-cache` } });
      if (!t.ok) return !1;
      let n = (await t.json()).version !== ue;
      return n && (e(!0), be.v(), clearTimeout(void 0)), n;
    } catch {
      return !1;
    }
  }
  return { subscribe: t, check: n };
}
function M(e, t, n) {
  return e.origin !== O || !e.pathname.startsWith(t) ? !0 : n ? e.pathname !== location.pathname : !1;
}
function Se(e) {}
var Ce = new Set([`load`, `prerender`, `csr`, `ssr`, `trailingSlash`, `config`]);
[...Ce], [...new Set([...Ce])];
function we(e) {
  return e.filter((e) => e != null);
}
function N(e, t) {
  return e + `/` + t;
}
function Te(e) {
  return e instanceof c || e instanceof u ? e.status : 500;
}
function Ee(e) {
  return e instanceof u ? e.text : `Internal Error`;
}
var P,
  F,
  I,
  De = a.toString().includes(`$$`) || /function \w+\(\) \{\}/.test(a.toString()),
  Oe = `a:`;
De
  ? ((P = {
      data: {},
      form: null,
      error: null,
      params: {},
      route: { id: null },
      state: {},
      status: -1,
      url: new URL(Oe),
    }),
    (F = { current: null }),
    (I = { current: !1 }))
  : ((P = new (class {
      #e = i({});
      get data() {
        return n(this.#e);
      }
      set data(e) {
        r(this.#e, e);
      }
      #t = i(null);
      get form() {
        return n(this.#t);
      }
      set form(e) {
        r(this.#t, e);
      }
      #n = i(null);
      get error() {
        return n(this.#n);
      }
      set error(e) {
        r(this.#n, e);
      }
      #r = i({});
      get params() {
        return n(this.#r);
      }
      set params(e) {
        r(this.#r, e);
      }
      #i = i({ id: null });
      get route() {
        return n(this.#i);
      }
      set route(e) {
        r(this.#i, e);
      }
      #a = i({});
      get state() {
        return n(this.#a);
      }
      set state(e) {
        r(this.#a, e);
      }
      #o = i(-1);
      get status() {
        return n(this.#o);
      }
      set status(e) {
        r(this.#o, e);
      }
      #s = i(new URL(Oe));
      get url() {
        return n(this.#s);
      }
      set url(e) {
        r(this.#s, e);
      }
    })()),
    (F = new (class {
      #e = i(null);
      get current() {
        return n(this.#e);
      }
      set current(e) {
        r(this.#e, e);
      }
    })()),
    (I = new (class {
      #e = i(!1);
      get current() {
        return n(this.#e);
      }
      set current(e) {
        r(this.#e, e);
      }
    })()),
    (be.v = () => (I.current = !0)));
function ke(e) {
  Object.assign(P, e);
}
var { onMount: Ae, tick: je } = o,
  Me = new Set([`icon`, `shortcut icon`, `apple-touch-icon`]),
  L = null,
  R = se(`sveltekit:scroll`) ?? {},
  z = se(`sveltekit:snapshot`) ?? {},
  B = { url: ye({}), page: ye({}), navigating: s(null), updated: xe() };
function Ne(e) {
  R[e] = k();
}
function Pe(e, t) {
  let n = e + 1;
  for (; R[n]; ) delete R[n], (n += 1);
  for (n = t + 1; z[n]; ) delete z[n], (n += 1);
}
function V(e, t = !1) {
  return t ? location.replace(e.href) : (location.href = e.href), new Promise(h);
}
async function Fe() {
  if (`serviceWorker` in navigator) {
    let e = await navigator.serviceWorker.getRegistration(w || `/`);
    e && (await e.update());
  }
}
var Ie,
  Le,
  Re,
  H,
  ze,
  U,
  Be = [],
  Ve = [],
  W = null;
function He() {
  W?.fork?.then((e) => e?.discard()), (W = null);
}
var Ue = new Map(),
  We = new Set(),
  Ge = new Set(),
  G = new Set(),
  K = { branch: [], error: null, url: null, nav: null },
  Ke = !1,
  qe = !1,
  Je = !0,
  q = !1,
  J = !1,
  Ye = !1,
  Xe = !1,
  Ze,
  Y,
  X,
  Z,
  Qe = new Set(),
  $e = new Map(),
  et = new Map();
async function tt(e, t, n) {
  globalThis.__sveltekit_shvguo && (globalThis.__sveltekit_shvguo.query, globalThis.__sveltekit_shvguo.prerender),
    document.URL !== location.href && (location.href = location.href),
    (U = e),
    await e.hooks.init?.(),
    (Ie = oe(e)),
    (H = document.documentElement),
    (ze = t),
    (Le = e.nodes[0]),
    (Re = e.nodes[1]),
    Le(),
    Re(),
    (Y = history.state?.[T]),
    (X = history.state?.[E]),
    Y || ((Y = X = Date.now()), history.replaceState({ ...history.state, [T]: Y, [E]: X }, ``));
  let r = R[Y];
  function i() {
    r && ((history.scrollRestoration = `manual`), scrollTo(r.x, r.y));
  }
  n
    ? (i(), await At(ze, n))
    : (await Q({ type: `enter`, url: me(U.hash ? It(new URL(location.href)) : location.href), replace_state: !0 }),
      i()),
    kt();
}
function nt() {
  (Be.length = 0), (Xe = !1);
}
function rt(e) {
  Ve.some((e) => e?.snapshot) && (z[e] = Ve.map((e) => e?.snapshot?.capture()));
}
function it(e) {
  z[e]?.forEach((e, t) => {
    Ve[t]?.snapshot?.restore(e);
  });
}
function at() {
  Ne(Y), ce(fe, R), rt(X), ce(de, z);
}
async function ot(e, n, r, i) {
  let a, o;
  n.invalidateAll && He(),
    await Q({
      type: `goto`,
      url: me(e),
      keepfocus: n.keepFocus,
      noscroll: n.noScroll,
      replace_state: n.replaceState,
      state: n.state,
      redirect_count: r,
      nav_token: i,
      accept: () => {
        if (n.invalidateAll) {
          (Xe = !0), (a = new Set());
          for (let [e, t] of $e) for (let n of t.keys()) a.add(N(e, n));
          o = new Set();
          for (let [e, t] of et) for (let n of t.keys()) o.add(N(e, n));
        }
        n.invalidate && n.invalidate.forEach(Ot);
      },
    }),
    n.invalidateAll &&
      t()
        .then(t)
        .then(() => {
          for (let [e, t] of $e) for (let [n, { resource: r }] of t) a?.has(N(e, n)) && r.refresh();
          for (let [e, t] of et) for (let [n, { resource: r }] of t) o?.has(N(e, n)) && r.reconnect();
        });
}
async function st(e) {
  if (e.id !== W?.id) {
    He();
    let t = {};
    Qe.add(t),
      (W = {
        id: e.id,
        token: t,
        promise: _t({ ...e, preload: t }).then((e) => (Qe.delete(t), e.type === `loaded` && e.state.error && He(), e)),
        fork: null,
      });
  }
  return W.promise;
}
async function ct(e) {
  let t = (await xt(e, !1))?.route;
  t && (await Promise.all([...t.layouts, t.leaf].filter(Boolean).map((e) => e[1]())));
}
async function lt(e, t, n) {
  let r = { params: K.params, route: { id: K.route?.id ?? null }, url: new URL(location.href) };
  if (
    ((K = { ...e.state, nav: r }),
    ke(e.props.page),
    (Ze = new U.root({
      target: t,
      props: { ...e.props, stores: B, components: Ve },
      hydrate: n,
      sync: !1,
      transformError: void 0,
    })),
    await Promise.resolve(),
    it(X),
    n)
  ) {
    let e = {
      from: null,
      to: { ...r, scroll: R[Y] ?? k() },
      willUnload: !1,
      type: `enter`,
      complete: Promise.resolve(),
    };
    G.forEach((t) => t(e));
  }
  qe = !0;
}
async function ut({ url: e, params: t, branch: n, errors: r, status: i, error: a, route: o, form: s }) {
  let c = `never`;
  if (w && (e.pathname === w || e.pathname === w + `/`)) c = `always`;
  else for (let e of n) e?.slash !== void 0 && (c = e.slash);
  (e.pathname = d(e.pathname, c)), (e.search = e.search);
  let l = {
    type: `loaded`,
    state: { url: e, params: t, branch: n, error: a, route: o },
    props: { constructors: we(n).map((e) => e.node.component), page: Ft(P) },
  };
  s !== void 0 && (l.props.form = s);
  let u = {},
    f = !P,
    p = 0;
  for (let e = 0; e < Math.max(n.length, K.branch.length); e += 1) {
    let t = n[e],
      r = K.branch[e];
    t?.data !== r?.data && (f = !0), t && ((u = { ...u, ...t.data }), f && (l.props[`data_${p}`] = u), (p += 1));
  }
  return (
    (!K.url || e.href !== K.url.href || K.error !== a || (s !== void 0 && s !== P.form) || f) &&
      (l.props.page = {
        error: a,
        params: t,
        route: { id: o?.id ?? null },
        state: {},
        status: i,
        url: new URL(e),
        form: s ?? null,
        data: f ? u : P.data,
      }),
    l
  );
}
async function dt({ loader: e, parent: t, url: n, params: r, route: i, server_data_node: a }) {
  let o = { dependencies: new Set(), params: new Set(), parent: !1, route: !1, url: !1, search_params: new Set() },
    s = await e();
  return {
    node: s,
    loader: e,
    server: a,
    universal: s.universal?.load ? { type: `data`, data: null, uses: o } : null,
    data: a?.data ?? null,
    slash: s.universal?.trailingSlash ?? a?.slash,
  };
}
function ft(e, t, n) {
  let r = e instanceof Request ? e.url : e,
    i = new URL(r, n);
  return (
    i.origin === n.origin && (r = i.href.slice(n.origin.length)),
    { resolved: i, promise: qe ? b(r, i.href, t) : ee(r, t) }
  );
}
function pt(e, t, n, r, i, a) {
  if (Xe) return !0;
  if (!i) return !1;
  if ((i.parent && e) || (i.route && t) || (i.url && n)) return !0;
  for (let e of i.search_params) if (r.has(e)) return !0;
  for (let e of i.params) if (a[e] !== K.params[e]) return !0;
  for (let e of i.dependencies) if (Be.some((t) => t(new URL(e)))) return !0;
  return !1;
}
function mt(e, t) {
  return e?.type === `data` ? e : e?.type === `skip` ? (t ?? null) : null;
}
function ht(e, t) {
  if (!e) return new Set(t.searchParams.keys());
  let n = new Set([...e.searchParams.keys(), ...t.searchParams.keys()]);
  for (let r of n) {
    let i = e.searchParams.getAll(r),
      a = t.searchParams.getAll(r);
    i.every((e) => a.includes(e)) && a.every((e) => i.includes(e)) && n.delete(r);
  }
  return n;
}
function gt({ error: e, url: t, route: n, params: r }) {
  return {
    type: `loaded`,
    state: { error: e, url: t, route: n, params: r, branch: [] },
    props: { page: Ft(P), constructors: [] },
  };
}
async function _t({ id: e, invalidating: t, url: n, params: r, route: i, preload: a }) {
  if (W?.id === e) return Qe.delete(W.token), W.promise;
  let { errors: o, layouts: s, leaf: u } = i,
    d = [...s, u];
  o.forEach((e) => e?.().catch(h)), d.forEach((e) => e?.[1]().catch(h));
  let f = K.url ? e !== Ct(K.url) : !1,
    p = K.route ? i.id !== K.route.id : !1,
    m = ht(K.url, n),
    g = !1,
    _ = d.map(async (e, t) => {
      if (!e) return;
      let a = K.branch[t];
      return e[1] === a?.loader && !pt(g, p, f, m, a.universal?.uses, r)
        ? a
        : ((g = !0),
          dt({
            loader: e[1],
            url: n,
            params: r,
            route: i,
            parent: async () => {
              let e = {};
              for (let n = 0; n < t; n += 1) Object.assign(e, (await _[n])?.data);
              return e;
            },
            server_data_node: mt(e[0] ? { type: `skip` } : null, e[0] ? a?.server : void 0),
          }));
    });
  for (let e of _) e.catch(h);
  let v = [];
  for (let e = 0; e < d.length; e += 1)
    if (d[e])
      try {
        v.push(await _[e]);
      } catch (t) {
        if (t instanceof l) return { type: `redirect`, location: t.location };
        if (Qe.has(a))
          return gt({ error: await $(t, { params: r, url: n, route: { id: i.id } }), url: n, params: r, route: i });
        let s = Te(t),
          u;
        if (t instanceof c) u = t.body;
        else {
          if (await B.updated.check()) return await Fe(), await V(n);
          u = await $(t, { params: r, url: n, route: { id: i.id } });
        }
        let d = await vt(e, v, o);
        return d
          ? ut({
              url: n,
              params: r,
              branch: v.slice(0, d.idx).concat(d.node),
              errors: o,
              status: s,
              error: u,
              route: i,
            })
          : await Tt(n, { id: i.id }, u, s);
      }
    else v.push(void 0);
  return ut({ url: n, params: r, branch: v, errors: o, status: 200, error: null, route: i, form: t ? void 0 : null });
}
async function vt(e, t, n) {
  for (; e--; )
    if (n[e]) {
      let r = e;
      for (; !t[r]; ) --r;
      try {
        return { idx: r + 1, node: { node: await n[e](), loader: n[e], data: {}, server: null, universal: null } };
      } catch {
        continue;
      }
    }
}
async function yt({ status: e, error: t, url: n, route: r }) {
  let i = {};
  try {
    return ut({
      url: n,
      params: i,
      branch: [
        await dt({
          loader: Le,
          url: n,
          params: i,
          route: r,
          parent: () => Promise.resolve({}),
          server_data_node: mt(null),
        }),
        { node: await Re(), loader: Re, universal: null, server: null, data: null },
      ],
      status: e,
      error: t,
      errors: [],
      route: null,
    });
  } catch (e) {
    if (e instanceof l) return ot(new URL(e.location, location.href), {}, 0);
    throw e;
  }
}
async function bt(e) {
  let t = e.href;
  if (Ue.has(t)) return Ue.get(t);
  let n;
  try {
    let r = (async () => {
      let t = (await U.hooks.reroute({ url: new URL(e), fetch: async (t, n) => ft(t, n, e).promise })) ?? e;
      if (typeof t == `string`) {
        let n = new URL(e);
        U.hash ? (n.hash = t) : (n.pathname = t), (t = n);
      }
      return t;
    })();
    Ue.set(t, r), (n = await r);
  } catch {
    Ue.delete(t);
    return;
  }
  return n;
}
async function xt(e, t) {
  if (e && !M(e, w, U.hash)) {
    let n = await bt(e);
    if (!n) return;
    let r = St(n);
    for (let n of Ie) {
      let i = n.exec(r);
      if (i) return { id: Ct(e), invalidating: t, route: n, params: p(i), url: e };
    }
  }
}
function St(e) {
  return f(U.hash ? e.hash.replace(/^#/, ``).replace(/[?#].+/, ``) : e.pathname.slice(w.length)) || `/`;
}
function Ct(e) {
  return (U.hash ? e.hash.replace(/^#/, ``) : e.pathname) + e.search;
}
function wt({ url: e, type: t, intent: n, delta: r, event: i, scroll: a }) {
  let o = !1,
    s = Pt(K, n, e, t, a ?? null);
  r !== void 0 && (s.navigation.delta = r), i !== void 0 && (s.navigation.event = i);
  let c = {
    ...s.navigation,
    cancel: () => {
      (o = !0), s.reject(Error(`navigation cancelled`));
    },
  };
  return q || We.forEach((e) => e(c)), o ? null : s;
}
async function Q({
  type: n,
  url: r,
  popped: i,
  keepfocus: a,
  noscroll: o,
  replace_state: s,
  state: c = {},
  redirect_count: l = 0,
  nav_token: d = {},
  accept: f = h,
  block: p = h,
  event: m,
}) {
  let g = Z;
  Z = d;
  let _ = await xt(r, !1),
    v =
      n === `enter` ? Pt(K, _, r, n) : wt({ url: r, type: n, delta: i?.delta, intent: _, scroll: i?.scroll, event: m });
  if (!v) {
    p(), Z === d && (Z = g);
    return;
  }
  let y = Y,
    ee = X;
  f(), (q = !0), qe && v.navigation.type !== `enter` && B.navigating.set((F.current = v.navigation));
  let b = _ && (await _t(_));
  if (!b) {
    if (M(r, w, U.hash)) return await V(r, s);
    b = await Tt(
      r,
      { id: null },
      await $(new u(404, `Not Found`, `Not found: ${r.pathname}`), { url: r, params: {}, route: { id: null } }),
      404,
      s,
    );
  }
  if (((r = _?.url || r), Z !== d)) return v.reject(Error(`navigation aborted`)), !1;
  if (b.type === `redirect`) {
    if (l < 20) {
      await Q({
        type: n,
        url: new URL(b.location, r),
        popped: i,
        keepfocus: a,
        noscroll: o,
        replace_state: s,
        state: c,
        redirect_count: l + 1,
        nav_token: d,
      }),
        v.fulfil(void 0);
      return;
    }
    b = await yt({
      status: 500,
      error: await $(Error(`Redirect loop`), { url: r, params: {}, route: { id: null } }),
      url: r,
      route: { id: null },
    });
  } else b.props.page.status >= 400 && (await B.updated.check()) && (await Fe(), await V(r, s));
  if (
    (nt(),
    Ne(y),
    rt(ee),
    b.props.page.url.pathname !== r.pathname && (r.pathname = b.props.page.url.pathname),
    (c = i ? i.state : c),
    !i)
  ) {
    let e = +!s,
      t = { [T]: (Y += e), [E]: (X += e), [pe]: c };
    (s ? history.replaceState : history.pushState).call(history, t, ``, r), s || Pe(Y, X);
  }
  let x = _ && W?.id === _.id ? W.fork : null;
  W?.fork && !x && He(), (W = null), (b.props.page.state = c);
  let S;
  if (qe) {
    let t = (await Promise.all(Array.from(Ge, (e) => e(v.navigation)))).filter((e) => typeof e == `function`);
    if (t.length > 0) {
      function e() {
        t.forEach((e) => {
          G.delete(e);
        });
      }
      t.push(e),
        t.forEach((e) => {
          G.add(e);
        });
    }
    let n = v.navigation.to;
    (K = { ...b.state, nav: { params: n.params, route: n.route, url: n.url } }), b.props.page && (b.props.page.url = r);
    let i = x && (await x);
    i
      ? (S = i.commit())
      : ((L = null), Ze.$set(b.props), L && Object.assign(b.props.page, L), ke(b.props.page), (S = e?.())),
      (Ye = !0);
  } else await lt(b, ze, !1);
  let { activeElement: te } = document;
  if ((await S, await t(), await t(), Z !== d)) return v.reject(Error(`navigation aborted`)), !1;
  b.props.page && L && Object.assign(b.props.page, L);
  let C = null;
  if (Je) {
    let e = i ? i.scroll : o ? k() : null;
    e ? scrollTo(e.x, e.y) : (C = r.hash && document.getElementById(Lt(r))) ? C.scrollIntoView() : scrollTo(0, 0);
  }
  let ne = document.activeElement !== te && document.activeElement !== document.body;
  !a && !ne && Nt(r, !C),
    (Je = !0),
    (q = !1),
    n === `popstate` && it(X),
    v.fulfil(void 0),
    v.navigation.to && (v.navigation.to.scroll = k()),
    G.forEach((e) => e(v.navigation)),
    B.navigating.set((F.current = null));
}
async function Tt(e, t, n, r, i) {
  return e.origin === O && e.pathname === location.pathname && !Ke
    ? await yt({ status: r, error: n, url: e, route: t })
    : await V(e, i);
}
function Et() {
  let e,
    t = { element: void 0, href: void 0 },
    n;
  H.addEventListener(`mousemove`, (t) => {
    let n = t.target;
    clearTimeout(e),
      (e = setTimeout(() => {
        a(n, D.hover);
      }, 20));
  });
  function r(e) {
    e.defaultPrevented || a(e.composedPath()[0], D.tap);
  }
  H.addEventListener(`mousedown`, r), H.addEventListener(`touchstart`, r, { passive: !0 });
  let i = new IntersectionObserver(
    (e) => {
      for (let t of e) t.isIntersecting && (ct(new URL(t.target.href)), i.unobserve(t.target));
    },
    { threshold: 0 },
  );
  async function a(e, r) {
    let i = _e(e, H),
      a = i === t.element && i?.href === t.href && r >= n;
    if (!i || a) return;
    let { url: o, external: s, download: c } = ve(i, w, U.hash);
    if (s || c) return;
    let l = j(i),
      u = o && Ct(K.url) === Ct(o);
    if (!(l.reload || u))
      if (r <= l.preload_data) {
        (t = { element: i, href: i.href }), (n = D.tap);
        let e = await xt(o, !1);
        if (!e) return;
        st(e);
      } else r <= l.preload_code && ((t = { element: i, href: i.href }), (n = r), ct(o));
  }
  function o() {
    i.disconnect();
    for (let e of H.querySelectorAll(`a`)) {
      let { url: t, external: n, download: r } = ve(e, w, U.hash);
      if (n || r) continue;
      let a = j(e);
      a.reload || (a.preload_code === D.viewport && i.observe(e), a.preload_code === D.eager && ct(t));
    }
  }
  G.add(o), o();
}
function $(e, t) {
  if (e instanceof c) return e.body;
  let n = Te(e),
    r = Ee(e);
  return U.hooks.handleError({ error: e, event: t, status: n, message: r }) ?? { message: r };
}
function Dt(e, t = {}) {
  return (e = new URL(me(e))), e.origin === O ? ot(e, t, 0) : Promise.reject(Error(`goto: invalid URL`));
}
function Ot(e) {
  if (typeof e == `function`) Be.push(e);
  else {
    let { href: t } = new URL(e, location.href);
    Be.push((e) => e.href === t);
  }
}
function kt() {
  (history.scrollRestoration = `manual`),
    addEventListener(`beforeunload`, (e) => {
      let t = !1;
      if ((at(), !q)) {
        let e = Pt(K, void 0, null, `leave`),
          n = {
            ...e.navigation,
            cancel: () => {
              (t = !0), e.reject(Error(`navigation cancelled`));
            },
          };
        We.forEach((e) => e(n));
      }
      t ? (e.preventDefault(), (e.returnValue = ``)) : (history.scrollRestoration = `auto`);
    }),
    addEventListener(`visibilitychange`, () => {
      document.visibilityState === `hidden` && at();
    }),
    !navigator.connection?.saveData && !/2g/.test(navigator.connection?.effectiveType) && Et(),
    H.addEventListener(`click`, async (t) => {
      if (t.button || t.which !== 1 || t.metaKey || t.ctrlKey || t.shiftKey || t.altKey || t.defaultPrevented) return;
      let n = _e(t.composedPath()[0], H);
      if (!n) return;
      let { url: r, external: i, target: a, download: o } = ve(n, w, U.hash);
      if (!r) return;
      if (a === `_parent` || a === `_top`) {
        if (window.parent !== window) return;
      } else if (a && a !== `_self`) return;
      let s = j(n);
      if (
        (!(n instanceof SVGAElement) &&
          r.protocol !== location.protocol &&
          !(r.protocol === `https:` || r.protocol === `http:`)) ||
        o
      )
        return;
      let [c, l] = (U.hash ? r.hash.replace(/^#/, ``) : r.href).split(`#`),
        u = c === m(location);
      if (i || (s.reload && (!u || !l))) {
        wt({ url: r, type: `link`, event: t }) ? (q = !0) : t.preventDefault();
        return;
      }
      if (l !== void 0 && u) {
        let [, i] = K.url.href.split(`#`);
        if (i === l) {
          if ((t.preventDefault(), l === `` || (l === `top` && n.ownerDocument.getElementById(`top`) === null)))
            scrollTo({ top: 0 });
          else {
            let e = n.ownerDocument.getElementById(decodeURIComponent(l));
            e && (e.scrollIntoView(), e.focus());
          }
          return;
        }
        if (((J = !0), Ne(Y), e(r), !s.replace_state)) return;
        J = !1;
      }
      t.preventDefault(),
        await new Promise((e) => {
          requestAnimationFrame(() => {
            setTimeout(e, 0);
          }),
            setTimeout(e, 100);
        }),
        await Q({
          type: `link`,
          url: r,
          keepfocus: s.keepfocus,
          noscroll: s.noscroll,
          replace_state: s.replace_state ?? r.href === location.href,
          event: t,
        });
    }),
    H.addEventListener(`submit`, (e) => {
      if (e.defaultPrevented) return;
      let t = HTMLFormElement.prototype.cloneNode.call(e.target),
        n = e.submitter;
      if ((n?.formTarget || t.target) === `_blank` || (n?.formMethod || t.method) !== `get`) return;
      let r = new URL((n?.hasAttribute(`formaction`) && n?.formAction) || t.action);
      if (M(r, w, !1)) return;
      let i = e.target,
        a = j(i);
      if (a.reload) return;
      e.preventDefault(), e.stopPropagation();
      let o = new FormData(i, n);
      (r.search = new URLSearchParams(o).toString()),
        Q({
          type: `form`,
          url: r,
          keepfocus: a.keepfocus,
          noscroll: a.noscroll,
          replace_state: a.replace_state ?? r.href === location.href,
          event: e,
        });
    }),
    addEventListener(`popstate`, async (t) => {
      if (!Mt)
        if (t.state?.[`sveltekit:history`]) {
          let n = t.state[T];
          if (((Z = {}), n === Y)) return;
          let r = R[n],
            i = t.state[`sveltekit:states`] ?? {},
            a = new URL(t.state[`sveltekit:pageurl`] ?? location.href),
            o = t.state[E],
            s = K.url ? m(location) === m(K.url) : !1;
          if (o === X && (Ye || s)) {
            i !== P.state && (P.state = i), e(a), (R[Y] = k()), r && scrollTo(r.x, r.y), (Y = n);
            return;
          }
          let c = n - Y;
          await Q({
            type: `popstate`,
            url: a,
            popped: { state: i, scroll: r, delta: c },
            accept: () => {
              (Y = n), (X = o);
            },
            block: () => {
              history.go(-c);
            },
            nav_token: Z,
            event: t,
          });
        } else J || (e(new URL(location.href)), U.hash && location.reload());
    }),
    addEventListener(`hashchange`, () => {
      J && ((J = !1), history.replaceState({ ...history.state, [T]: ++Y, [E]: X }, ``, location.href));
    });
  for (let e of document.querySelectorAll(`link`)) Me.has(e.rel) && (e.href = e.href);
  addEventListener(`pageshow`, (e) => {
    e.persisted && B.navigating.set((F.current = null));
  });
  function e(e) {
    (K.url = P.url = e), B.page.set(Ft(P)), B.page.notify();
  }
}
async function At(
  e,
  { status: t = 200, error: n, node_ids: r, params: i, route: a, server_route: o, data: s, form: c },
) {
  Ke = !0;
  let u = new URL(location.href),
    d;
  ({ params: i = {}, route: a = { id: null } } = (await xt(u, !1)) || {}), (d = Ie.find(({ id: e }) => e === a.id));
  let f,
    p = !0;
  try {
    let e = r.map(async (t, n) => {
        let r = s[n];
        return (
          r?.uses && (r.uses = jt(r.uses)),
          dt({
            loader: U.nodes[t],
            url: u,
            params: i,
            route: a,
            parent: async () => {
              let t = {};
              for (let r = 0; r < n; r += 1) Object.assign(t, (await e[r]).data);
              return t;
            },
            server_data_node: mt(r),
          })
        );
      }),
      o = await Promise.all(e);
    if (d) {
      let e = d.layouts;
      for (let t = 0; t < e.length; t++) e[t] || o.splice(t, 0, void 0);
    }
    f = await ut({ url: u, params: i, branch: o, status: t, error: n, errors: d?.errors, form: c, route: d ?? null });
  } catch (t) {
    if (t instanceof l) {
      await V(new URL(t.location, location.href));
      return;
    }
    (f = await yt({ status: Te(t), error: await $(t, { url: u, params: i, route: a }), url: u, route: a })),
      (e.textContent = ``),
      (p = !1);
  }
  f.props.page && (f.props.page.state = {}), await lt(f, e, p);
}
function jt(e) {
  return {
    dependencies: new Set(e?.dependencies ?? []),
    params: new Set(e?.params ?? []),
    parent: !!e?.parent,
    route: !!e?.route,
    url: !!e?.url,
    search_params: new Set(e?.search_params ?? []),
  };
}
var Mt = !1;
function Nt(e, t = !0) {
  let n = document.querySelector(`[autofocus]`);
  if (n) n.focus();
  else {
    let n = Lt(e);
    if (n && document.getElementById(n)) {
      let { x: r, y: i } = k();
      setTimeout(() => {
        let a = history.state;
        (Mt = !0),
          location.replace(new URL(`#${n}`, location.href)),
          history.replaceState(a, ``, e),
          t && scrollTo(r, i),
          (Mt = !1);
      });
    } else {
      let e = document.body,
        t = e.getAttribute(`tabindex`);
      (e.tabIndex = -1),
        e.focus({ preventScroll: !0, focusVisible: !1 }),
        t === null ? e.removeAttribute(`tabindex`) : e.setAttribute(`tabindex`, t);
    }
    let r = getSelection();
    if (r && r.type !== `None`) {
      let e = [];
      for (let t = 0; t < r.rangeCount; t += 1) e.push(r.getRangeAt(t));
      setTimeout(() => {
        if (r.rangeCount === e.length) {
          for (let t = 0; t < r.rangeCount; t += 1) {
            let n = e[t],
              i = r.getRangeAt(t);
            if (
              n.commonAncestorContainer !== i.commonAncestorContainer ||
              n.startContainer !== i.startContainer ||
              n.endContainer !== i.endContainer ||
              n.startOffset !== i.startOffset ||
              n.endOffset !== i.endOffset
            )
              return;
          }
          r.removeAllRanges();
        }
      });
    }
  }
}
function Pt(e, t, n, r, i = null) {
  let a,
    o,
    s = new Promise((e, t) => {
      (a = e), (o = t);
    });
  return (
    s.catch(h),
    {
      navigation: {
        from: { params: e.params, route: { id: e.route?.id ?? null }, url: e.url, scroll: k() },
        to: n && { params: t?.params ?? null, route: { id: t?.route?.id ?? null }, url: n, scroll: i },
        willUnload: !t,
        type: r,
        complete: s,
      },
      fulfil: a,
      reject: o,
    }
  );
}
function Ft(e) {
  return {
    data: e.data,
    error: e.error,
    form: e.form,
    params: e.params,
    route: e.route,
    state: e.state,
    status: e.status,
    url: e.url,
  };
}
function It(e) {
  let t = new URL(e);
  return (t.hash = decodeURIComponent(e.hash)), t;
}
function Lt(e) {
  let t;
  if (U.hash) {
    let [, , n] = e.hash.split(`#`, 3);
    t = n ?? ``;
  } else t = e.hash.slice(1);
  return decodeURIComponent(t);
}
export { P as a, F as i, tt as n, I as o, B as r, Se as s, Dt as t };
