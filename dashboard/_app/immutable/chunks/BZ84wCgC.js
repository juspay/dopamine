var e = Object.defineProperty,
  t = (t, n) => {
    let r = {};
    for (var i in t) e(r, i, { get: t[i], enumerable: !0 });
    return n || e(r, Symbol.toStringTag, { value: `Module` }), r;
  },
  n = Array.isArray,
  r = Array.prototype.indexOf,
  i = Array.prototype.includes,
  a = Array.from,
  o = Object.defineProperty,
  s = Object.getOwnPropertyDescriptor,
  c = Object.getOwnPropertyDescriptors,
  l = Object.prototype,
  u = Array.prototype,
  d = Object.getPrototypeOf,
  f = Object.isExtensible;
function p(e) {
  return typeof e == `function`;
}
var m = () => {};
function h(e) {
  for (var t = 0; t < e.length; t++) e[t]();
}
function g() {
  var e, t;
  return {
    promise: new Promise((n, r) => {
      (e = n), (t = r);
    }),
    resolve: e,
    reject: t,
  };
}
var _ = 1 << 24,
  v = 1024,
  y = 2048,
  b = 4096,
  x = 8192,
  S = 16384,
  ee = 32768,
  te = 1 << 25,
  ne = 65536,
  re = 1 << 18,
  ie = 1 << 19,
  ae = 1 << 20,
  oe = 1 << 25,
  se = 65536,
  ce = 1 << 21,
  le = 1 << 22,
  ue = 1 << 23,
  C = Symbol(`$state`),
  de = Symbol(`legacy props`),
  fe = Symbol(``),
  pe = Symbol(`attributes`),
  me = Symbol(`class`),
  he = Symbol(`style`),
  ge = Symbol(`text`),
  _e = Symbol(`form reset`),
  ve = new (class extends Error {
    name = `StaleReactionError`;
    message = "The reaction that called `getAbortSignal()` was re-run or destroyed";
  })(),
  ye = !!globalThis.document?.contentType && globalThis.document.contentType.includes(`xml`);
function be(e) {
  throw Error(`https://svelte.dev/e/experimental_async_required`);
}
function xe(e) {
  throw Error(`https://svelte.dev/e/lifecycle_outside_component`);
}
function Se() {
  throw Error(`https://svelte.dev/e/missing_context`);
}
function Ce() {
  throw Error(`https://svelte.dev/e/async_derived_orphan`);
}
function we(e, t, n) {
  throw Error(`https://svelte.dev/e/each_key_duplicate`);
}
function Te(e) {
  throw Error(`https://svelte.dev/e/effect_in_teardown`);
}
function Ee() {
  throw Error(`https://svelte.dev/e/effect_in_unowned_derived`);
}
function De(e) {
  throw Error(`https://svelte.dev/e/effect_orphan`);
}
function Oe() {
  throw Error(`https://svelte.dev/e/effect_update_depth_exceeded`);
}
function ke() {
  throw Error(`https://svelte.dev/e/fork_discarded`);
}
function Ae() {
  throw Error(`https://svelte.dev/e/fork_timing`);
}
function je() {
  throw Error(`https://svelte.dev/e/get_abort_signal_outside_reaction`);
}
function Me() {
  throw Error(`https://svelte.dev/e/hydration_failed`);
}
function Ne(e) {
  throw Error(`https://svelte.dev/e/lifecycle_legacy_only`);
}
function Pe(e) {
  throw Error(`https://svelte.dev/e/props_invalid_value`);
}
function Fe() {
  throw Error(`https://svelte.dev/e/set_context_after_init`);
}
function Ie() {
  throw Error(`https://svelte.dev/e/state_descriptors_fixed`);
}
function Le() {
  throw Error(`https://svelte.dev/e/state_prototype_fixed`);
}
function Re() {
  throw Error(`https://svelte.dev/e/state_unsafe_mutation`);
}
function ze() {
  throw Error(`https://svelte.dev/e/svelte_boundary_reset_onerror`);
}
var Be = {},
  w = Symbol(`uninitialized`),
  Ve = `http://www.w3.org/1999/xhtml`,
  He = `http://www.w3.org/2000/svg`,
  Ue = `http://www.w3.org/1998/Math/MathML`;
function We() {
  console.warn(`https://svelte.dev/e/derived_inert`);
}
function Ge(e) {
  console.warn(`https://svelte.dev/e/hydratable_missing_but_expected`);
}
function Ke(e) {
  console.warn(`https://svelte.dev/e/hydration_mismatch`);
}
function qe() {
  console.warn(`https://svelte.dev/e/select_multiple_invalid_value`);
}
function Je() {
  console.warn(`https://svelte.dev/e/svelte_boundary_reset_noop`);
}
var T = !1;
function E(e) {
  T = e;
}
var D;
function O(e) {
  if (e === null) throw (Ke(), Be);
  return (D = e);
}
function Ye() {
  return O(R(D));
}
function Xe(e) {
  if (T) {
    if (R(D) !== null) throw (Ke(), Be);
    D = e;
  }
}
function Ze(e = 1) {
  if (T) {
    for (var t = e, n = D; t--; ) n = R(n);
    D = n;
  }
}
function Qe(e = !0) {
  for (var t = 0, n = D; ; ) {
    if (n.nodeType === 8) {
      var r = n.data;
      if (r === `]`) {
        if (t === 0) return n;
        --t;
      } else (r === `[` || r === `[!` || (r[0] === `[` && !isNaN(Number(r.slice(1))))) && (t += 1);
    }
    var i = R(n);
    e && n.remove(), (n = i);
  }
}
function $e(e) {
  if (!e || e.nodeType !== 8) throw (Ke(), Be);
  return e.data;
}
function et(e) {
  return e === this.v;
}
function tt(e, t) {
  return e == e ? e !== t || (typeof e == `object` && !!e) || typeof e == `function` : t == t;
}
function nt(e) {
  return !tt(e, this.v);
}
var k = !1,
  rt = !1,
  A = null;
function it(e) {
  A = e;
}
function at() {
  let e = {};
  return [() => (ct(e) || Se(), ot(e)), (t) => st(e, t)];
}
function ot(e) {
  return pt(`getContext`).get(e);
}
function st(e, t) {
  let n = pt(`setContext`);
  if (k) {
    var r = G.f;
    (!H && r & 32 && !A.i) || Fe();
  }
  return n.set(e, t), t;
}
function ct(e) {
  return pt(`hasContext`).has(e);
}
function lt() {
  return pt(`getAllContexts`);
}
function ut(e, t = !1, n) {
  A = { p: A, i: !1, c: null, e: null, s: e, x: null, r: G, l: rt && !t ? { s: null, u: null, $: [] } : null };
}
function dt(e) {
  var t = A,
    n = t.e;
  if (n !== null) {
    t.e = null;
    for (var r of n) or(r);
  }
  return e !== void 0 && (t.x = e), (t.i = !0), (A = t.p), e ?? {};
}
function ft() {
  return !rt || (A !== null && A.l === null);
}
function pt(e) {
  return A === null && xe(e), (A.c ??= new Map(mt(A) || void 0));
}
function mt(e) {
  let t = e.p;
  for (; t !== null; ) {
    let e = t.c;
    if (e !== null) return e;
    t = t.p;
  }
  return null;
}
var ht = [];
function gt() {
  var e = ht;
  (ht = []), h(e);
}
function _t(e) {
  if (ht.length === 0 && !zt) {
    var t = ht;
    queueMicrotask(() => {
      t === ht && gt();
    });
  }
  ht.push(e);
}
function vt() {
  for (; ht.length > 0; ) gt();
}
function yt(e) {
  var t = G;
  if (t === null) return (H.f |= ue), e;
  if (!(t.f & 32768) && !(t.f & 4)) throw e;
  bt(e, t);
}
function bt(e, t) {
  for (; t !== null; ) {
    if (t.f & 128) {
      if (!(t.f & 32768)) throw e;
      try {
        t.b.error(e);
        return;
      } catch (t) {
        e = t;
      }
    }
    t = t.parent;
  }
  throw e;
}
var xt = ~(y | b | v);
function j(e, t) {
  e.f = (e.f & xt) | t;
}
function St(e) {
  e.f & 512 || e.deps === null ? j(e, v) : j(e, b);
}
function Ct(e) {
  if (e !== null) for (let t of e) !(t.f & 2) || !(t.f & 65536) || ((t.f ^= se), Ct(t.deps));
}
function wt(e, t, n) {
  e.f & 2048 ? t.add(e) : e.f & 4096 && n.add(e), Ct(e.deps), j(e, v);
}
function Tt(e, t, n) {
  if (e == null) return t(void 0), n && n(void 0), m;
  let r = Q(() => e.subscribe(t, n));
  return r.unsubscribe ? () => r.unsubscribe() : r;
}
var Et = [];
function Dt(e, t = m) {
  let n = null,
    r = new Set();
  function i(t) {
    if (tt(e, t) && ((e = t), n)) {
      let t = !Et.length;
      for (let t of r) t[1](), Et.push(t, e);
      if (t) {
        for (let e = 0; e < Et.length; e += 2) Et[e][0](Et[e + 1]);
        Et.length = 0;
      }
    }
  }
  function a(t) {
    i(t(e));
  }
  function o(o, s = m) {
    let c = [o, s];
    return (
      r.add(c),
      r.size === 1 && (n = t(i, a) || m),
      o(e),
      () => {
        r.delete(c), r.size === 0 && n && (n(), (n = null));
      }
    );
  }
  return { set: i, update: a, subscribe: o };
}
function Ot(e) {
  let t;
  return Tt(e, (e) => (t = e))(), t;
}
var kt = !1,
  At = !1,
  jt = Symbol(`unmounted`);
function Mt(e, t, n) {
  let r = (n[t] ??= { store: null, source: Dn(void 0), unsubscribe: m });
  if (r.store !== e && !(jt in n))
    if ((r.unsubscribe(), (r.store = e ?? null), e == null)) (r.source.v = void 0), (r.unsubscribe = m);
    else {
      var i = !0;
      (r.unsubscribe = Tt(e, (e) => {
        i ? (r.source.v = e) : F(r.source, e);
      })),
        (i = !1);
    }
  return e && jt in n ? Ot(e) : Z(r.source);
}
function Nt() {
  let e = {};
  function t() {
    ir(() => {
      for (var t in e) e[t].unsubscribe();
      o(e, jt, { enumerable: !1, value: !0 });
    });
  }
  return [e, t];
}
function Pt(e) {
  var t = At;
  try {
    return (At = !1), [e(), At];
  } finally {
    At = t;
  }
}
var Ft = null,
  It = null,
  M = null,
  Lt = null,
  N = null,
  Rt = null,
  zt = !1,
  Bt = !1,
  Vt = null,
  Ht = null,
  Ut = 0,
  Wt = 1,
  Gt = class e {
    id = Wt++;
    #e = !1;
    linked = !0;
    #t = null;
    #n = null;
    async_deriveds = new Map();
    current = new Map();
    previous = new Map();
    #r = new Set();
    #i = new Set();
    #a = new Set();
    #o = 0;
    #s = new Map();
    #c = null;
    #l = [];
    #u = [];
    #d = new Set();
    #f = new Set();
    #p = new Map();
    #m = new Set();
    is_fork = !1;
    #h = !1;
    constructor() {
      It === null ? (Ft = It = this) : ((It.#n = this), (this.#t = It)), (It = this);
    }
    #g() {
      if (this.is_fork) return !0;
      for (let n of this.#s.keys()) {
        for (var e = n, t = !1; e.parent !== null; ) {
          if (this.#p.has(e)) {
            t = !0;
            break;
          }
          e = e.parent;
        }
        if (!t) return !0;
      }
      return !1;
    }
    skip_effect(e) {
      this.#p.has(e) || this.#p.set(e, { d: [], m: [] }), this.#m.delete(e);
    }
    unskip_effect(e, t = (e) => this.schedule(e)) {
      var n = this.#p.get(e);
      if (n) {
        this.#p.delete(e);
        for (var r of n.d) j(r, y), t(r);
        for (r of n.m) j(r, b), t(r);
      }
      this.#m.add(e);
    }
    #_() {
      (this.#e = !0), Ut++ > 1e3 && (this.#C(), qt());
      for (let e of this.#d) this.#f.delete(e), j(e, y), this.schedule(e);
      for (let e of this.#f) j(e, b), this.schedule(e);
      let t = this.#l;
      (this.#l = []), this.apply();
      var n = (Vt = []),
        r = [],
        i = (Ht = []);
      for (let e of t)
        try {
          this.#v(e, n, r);
        } catch (t) {
          throw (en(e), this.#g() || this.discard(), t);
        }
      if (((M = null), i.length > 0)) {
        var a = e.ensure();
        for (let e of i) a.schedule(e);
      }
      if (((Vt = null), (Ht = null), this.#g())) {
        this.#x(r), this.#x(n);
        for (let [e, t] of this.#p) $t(e, t);
        i.length > 0 && M.#_();
        return;
      }
      let o = this.#y();
      if (o) {
        this.#x(r), this.#x(n), o.#b(this);
        return;
      }
      this.#d.clear(), this.#f.clear();
      for (let e of this.#r) e(this);
      this.#r.clear(), (Lt = this), Jt(r), Jt(n), (Lt = null), this.#c?.resolve();
      var s = M;
      if (
        (this.#o === 0 && (this.#l.length === 0 || s !== null) && (this.#C(), k && (this.#S(), (M = s))),
        this.#l.length > 0)
      )
        if (s !== null) {
          let e = s;
          e.#l.push(...this.#l.filter((t) => !e.#l.includes(t)));
        } else s = this;
      s !== null && s.#_();
    }
    #v(e, t, n) {
      e.f ^= v;
      for (var r = e.first; r !== null; ) {
        var i = r.f,
          a = (i & 96) != 0;
        if (!((a && i & 1024) || i & 8192 || this.#p.has(r)) && r.fn !== null) {
          a
            ? (r.f ^= v)
            : i & 4
              ? t.push(r)
              : k && i & 16777224
                ? n.push(r)
                : Lr(r) && (i & 16 && this.#f.add(r), Hr(r));
          var o = r.first;
          if (o !== null) {
            r = o;
            continue;
          }
        }
        for (; r !== null; ) {
          var s = r.next;
          if (s !== null) {
            r = s;
            break;
          }
          r = r.parent;
        }
      }
    }
    #y() {
      for (var e = this.#t; e !== null; ) {
        if (!e.is_fork) {
          for (let [t, [, n]] of this.current) if (e.current.has(t) && !n) return e;
        }
        e = e.#t;
      }
      return null;
    }
    #b(e) {
      for (let [t, n] of e.current)
        !this.previous.has(t) && e.previous.has(t) && this.previous.set(t, e.previous.get(t)), this.current.set(t, n);
      for (let [t, n] of e.async_deriveds) {
        let e = this.async_deriveds.get(t);
        e && n.promise.then(e.resolve).catch(e.reject);
      }
      this.transfer_effects(e.#d, e.#f);
      let t = (e) => {
        var n = e.reactions;
        if (n !== null)
          for (let e of n) {
            var r = e.f;
            if (r & 2) t(e);
            else {
              var i = e;
              r & 4194320 && !this.async_deriveds.has(i) && (this.#f.delete(i), j(i, y), this.schedule(i));
            }
          }
      };
      for (let e of this.current.keys()) t(e);
      this.oncommit(() => e.discard()), e.#C(), (M = this), this.#_();
    }
    #x(e) {
      for (var t = 0; t < e.length; t += 1) wt(e[t], this.#d, this.#f);
    }
    capture(e, t, n = !1) {
      e.v !== w && !this.previous.has(e) && this.previous.set(e, e.v),
        e.f & 8388608 || (this.current.set(e, [t, n]), N?.set(e, t)),
        this.is_fork || (e.v = t);
    }
    activate() {
      M = this;
    }
    deactivate() {
      (M = null), (N = null);
    }
    flush() {
      try {
        (Bt = !0), (M = this), this.#_();
      } finally {
        (Ut = 0), (Rt = null), (Vt = null), (Ht = null), (Bt = !1), (M = null), (N = null), Sn.clear();
      }
    }
    discard() {
      for (let e of this.#i) e(this);
      this.#i.clear(), this.#a.clear(), this.#C(), this.#c?.resolve();
    }
    register_created_effect(e) {
      this.#u.push(e);
    }
    #S() {
      for (let l = Ft; l !== null; l = l.#n) {
        var e = l.id < this.id,
          t = [];
        for (let [r, [i, a]] of this.current) {
          if (l.current.has(r)) {
            var n = l.current.get(r)[0];
            if (e && i !== n) l.current.set(r, [i, a]);
            else continue;
          }
          t.push(r);
        }
        if (e)
          for (let [e, t] of this.async_deriveds) {
            let n = l.async_deriveds.get(e);
            n && t.promise.then(n.resolve).catch(n.reject);
          }
        if (l.#e) {
          var r = [...l.current.keys()].filter((e) => !l.current.get(e)[1] && !this.current.has(e));
          if (r.length === 0) e && l.discard();
          else if (t.length > 0) {
            if (e)
              for (let e of this.#m)
                l.unskip_effect(e, (e) => {
                  e.f & 4194320 ? l.schedule(e) : l.#x([e]);
                });
            l.activate();
            var i = new Set(),
              a = new Map();
            for (var o of t) Yt(o, r, i, a);
            a = new Map();
            var s = [...l.current]
              .filter(([e, t]) => {
                let n = this.current.get(e);
                return n ? n[0] !== t[0] || n[1] !== t[1] : !0;
              })
              .map(([e]) => e);
            if (s.length > 0)
              for (let e of this.#u)
                !(e.f & 155648) && Zt(e, s, a) && (e.f & 4194320 ? (j(e, y), l.schedule(e)) : l.#d.add(e));
            if (l.#l.length > 0 && !l.#h) {
              l.apply();
              for (var c of l.#l) l.#v(c, [], []);
              l.#l = [];
            }
            l.deactivate();
          }
        }
      }
    }
    increment(e, t) {
      if (((this.#o += 1), e)) {
        let e = this.#s.get(t) ?? 0;
        this.#s.set(t, e + 1);
      }
    }
    decrement(e, t) {
      if ((--this.#o, e)) {
        let e = this.#s.get(t) ?? 0;
        e === 1 ? this.#s.delete(t) : this.#s.set(t, e - 1);
      }
      this.#h ||
        ((this.#h = !0),
        _t(() => {
          (this.#h = !1), this.linked && this.flush();
        }));
    }
    transfer_effects(e, t) {
      for (let t of e) this.#d.add(t);
      for (let e of t) this.#f.add(e);
      e.clear(), t.clear();
    }
    oncommit(e) {
      this.#r.add(e);
    }
    ondiscard(e) {
      this.#i.add(e);
    }
    on_fork_commit(e) {
      this.#a.add(e);
    }
    run_fork_commit_callbacks() {
      for (let e of this.#a) e(this);
      this.#a.clear();
    }
    settled() {
      return (this.#c ??= g()).promise;
    }
    static ensure() {
      if (M === null) {
        let t = (M = new e());
        !Bt &&
          !zt &&
          _t(() => {
            t.#e || t.flush();
          });
      }
      return M;
    }
    apply() {
      if (!k || (!this.is_fork && this.#t === null && this.#n === null)) {
        N = null;
        return;
      }
      N = new Map();
      for (let [e, [t]] of this.current) N.set(e, t);
      for (let t = Ft; t !== null; t = t.#n)
        if (!(t === this || t.is_fork)) {
          var e = !1;
          if (t.id < this.id) {
            for (let [n, [, r]] of t.current)
              if (!r && this.current.has(n)) {
                e = !0;
                break;
              }
          }
          if (!e) for (let [e, n] of t.previous) N.has(e) || N.set(e, n);
        }
    }
    schedule(e) {
      if (((Rt = e), e.b?.is_pending && e.f & 16777228 && !(e.f & 32768))) {
        e.b.defer_effect(e);
        return;
      }
      for (var t = e; t.parent !== null; ) {
        t = t.parent;
        var n = t.f;
        if (Vt !== null && t === G && (k || ((H === null || !(H.f & 2)) && !kt))) return;
        if (n & 96) {
          if (!(n & 1024)) return;
          t.f ^= v;
        }
      }
      this.#l.push(t);
    }
    #C() {
      if (this.linked) {
        var e = this.#t,
          t = this.#n;
        e === null ? (Ft = t) : (e.#n = t), t === null ? (It = e) : (t.#t = e), (this.linked = !1);
      }
    }
  };
function Kt(e) {
  var t = zt;
  zt = !0;
  try {
    var n;
    for (e && (M !== null && !M.is_fork && M.flush(), (n = e())); ; ) {
      if ((vt(), M === null)) return n;
      M.flush();
    }
  } finally {
    zt = t;
  }
}
function qt() {
  try {
    Oe();
  } catch (e) {
    bt(e, Rt);
  }
}
var P = null;
function Jt(e) {
  var t = e.length;
  if (t !== 0) {
    for (var n = 0; n < t; ) {
      var r = e[n++];
      if (
        !(r.f & 24576) &&
        Lr(r) &&
        ((P = new Set()),
        Hr(r),
        r.deps === null && r.first === null && r.nodes === null && r.teardown === null && r.ac === null && br(r),
        P?.size > 0)
      ) {
        Sn.clear();
        for (let e of P) {
          if (e.f & 24576) continue;
          let t = [e],
            n = e.parent;
          for (; n !== null; ) P.has(n) && (P.delete(n), t.push(n)), (n = n.parent);
          for (let e = t.length - 1; e >= 0; e--) {
            let n = t[e];
            n.f & 24576 || Hr(n);
          }
        }
        P.clear();
      }
    }
    P = null;
  }
}
function Yt(e, t, n, r) {
  if (!n.has(e) && (n.add(e), e.reactions !== null))
    for (let i of e.reactions) {
      let e = i.f;
      e & 2 ? Yt(i, t, n, r) : e & 4194320 && !(e & 2048) && Zt(i, t, r) && (j(i, y), Qt(i));
    }
}
function Xt(e, t) {
  if (e.reactions !== null)
    for (let n of e.reactions) {
      let e = n.f;
      e & 2 ? Xt(n, t) : e & 131072 && (j(n, y), t.add(n));
    }
}
function Zt(e, t, n) {
  let r = n.get(e);
  if (r !== void 0) return r;
  if (e.deps !== null)
    for (let r of e.deps) {
      if (i.call(t, r)) return !0;
      if (r.f & 2 && Zt(r, t, n)) return n.set(r, !0), !0;
    }
  return n.set(e, !1), !1;
}
function Qt(e) {
  M.schedule(e);
}
function $t(e, t) {
  if (!(e.f & 32 && e.f & 1024)) {
    e.f & 2048 ? t.d.push(e) : e.f & 4096 && t.m.push(e), j(e, v);
    for (var n = e.first; n !== null; ) $t(n, t), (n = n.next);
  }
}
function en(e) {
  j(e, v);
  for (var t = e.first; t !== null; ) en(t), (t = t.next);
}
function tn(e) {
  k || be(`fork`), M !== null && Ae();
  var t = Gt.ensure();
  (t.is_fork = !0), (N = new Map());
  var n = !1,
    r = t.settled();
  return (
    Kt(e),
    {
      commit: async () => {
        if (n) {
          await r;
          return;
        }
        t.linked || ke(), (n = !0), (t.is_fork = !1);
        for (var [e, [i]] of t.current) (e.v = i), (e.wv = Ir());
        t.activate(),
          t.run_fork_commit_callbacks(),
          t.deactivate(),
          Kt(() => {
            var e = new Set();
            for (var n of t.current.keys()) Xt(n, e);
            Cn(e), kn();
          }),
          t.flush(),
          await r;
      },
      discard: () => {
        for (var e of t.current.keys()) e.wv = Ir();
        !n && t.linked && t.discard();
      },
    }
  );
}
function nn(e) {
  let t = 0,
    n = Tn(0),
    r;
  return () => {
    rr() &&
      (Z(n),
      dr(
        () => (
          t === 0 && (r = Q(() => e(() => jn(n)))),
          (t += 1),
          () => {
            _t(() => {
              --t, t === 0 && (r?.(), (r = void 0), jn(n));
            });
          }
        ),
      ));
  };
}
var rn = ne | ie;
function an(e, t, n, r) {
  new on(e, t, n, r);
}
var on = class {
  parent;
  is_pending = !1;
  transform_error;
  #e;
  #t = T ? D : null;
  #n;
  #r;
  #i;
  #a = null;
  #o = null;
  #s = null;
  #c = null;
  #l = 0;
  #u = 0;
  #d = !1;
  #f = new Set();
  #p = new Set();
  #m = null;
  #h = nn(
    () => (
      (this.#m = Tn(this.#l)),
      () => {
        this.#m = null;
      }
    ),
  );
  constructor(e, t, n, r) {
    (this.#e = e),
      (this.#n = t),
      (this.#r = (e) => {
        var t = G;
        (t.b = this), (t.f |= 128), n(e);
      }),
      (this.parent = G.b),
      (this.transform_error = r ?? this.parent?.transform_error ?? ((e) => e)),
      (this.#i = mr(() => {
        if (T) {
          let e = this.#t;
          Ye();
          let t = e.data === `[!`;
          if (e.data.startsWith(`[?`)) {
            let t = JSON.parse(e.data.slice(2));
            this.#_(t);
          } else t ? this.#v() : this.#g();
        } else this.#y();
      }, rn)),
      T && (this.#e = D);
  }
  #g() {
    try {
      this.#a = B(() => this.#r(this.#e));
    } catch (e) {
      this.error(e);
    }
  }
  #_(e) {
    let t = this.#n.failed;
    t &&
      (this.#s = B(() => {
        t(
          this.#e,
          () => e,
          () => () => {},
        );
      }));
  }
  #v() {
    let e = this.#n.pending;
    e &&
      ((this.is_pending = !0),
      (this.#o = B(() => e(this.#e))),
      _t(() => {
        var e = (this.#c = document.createDocumentFragment()),
          t = I();
        e.append(t),
          (this.#a = this.#x(() => B(() => this.#r(t)))),
          this.#u === 0 &&
            (this.#e.before(e),
            (this.#c = null),
            xr(this.#o, () => {
              this.#o = null;
            }),
            this.#b(M));
      }));
  }
  #y() {
    try {
      if (
        ((this.is_pending = this.has_pending_snippet()),
        (this.#u = 0),
        (this.#l = 0),
        (this.#a = B(() => {
          this.#r(this.#e);
        })),
        this.#u > 0)
      ) {
        var e = (this.#c = document.createDocumentFragment());
        Tr(this.#a, e);
        let t = this.#n.pending;
        this.#o = B(() => t(this.#e));
      } else this.#b(M);
    } catch (e) {
      this.error(e);
    }
  }
  #b(e) {
    (this.is_pending = !1), e.transfer_effects(this.#f, this.#p);
  }
  defer_effect(e) {
    wt(e, this.#f, this.#p);
  }
  is_rendered() {
    return !this.is_pending && (!this.parent || this.parent.is_rendered());
  }
  has_pending_snippet() {
    return !!this.#n.pending;
  }
  #x(e) {
    var t = G,
      n = H,
      r = A;
    K(this.#i), W(this.#i), it(this.#i.ctx);
    try {
      return Gt.ensure(), e();
    } catch (e) {
      return yt(e), null;
    } finally {
      K(t), W(n), it(r);
    }
  }
  #S(e, t) {
    if (!this.has_pending_snippet()) {
      this.parent && this.parent.#S(e, t);
      return;
    }
    (this.#u += e),
      this.#u === 0 &&
        (this.#b(t),
        this.#o &&
          xr(this.#o, () => {
            this.#o = null;
          }),
        (this.#c &&= (this.#e.before(this.#c), null)));
  }
  update_pending_count(e, t) {
    this.#S(e, t),
      (this.#l += e),
      !(!this.#m || this.#d) &&
        ((this.#d = !0),
        _t(() => {
          (this.#d = !1), this.#m && On(this.#m, this.#l);
        }));
  }
  get_effect_pending() {
    return this.#h(), Z(this.#m);
  }
  error(e) {
    if (!this.#n.onerror && !this.#n.failed) throw e;
    M?.is_fork
      ? (this.#a && M.skip_effect(this.#a),
        this.#o && M.skip_effect(this.#o),
        this.#s && M.skip_effect(this.#s),
        M.on_fork_commit(() => {
          this.#C(e);
        }))
      : this.#C(e);
  }
  #C(e) {
    (this.#a &&= (V(this.#a), null)),
      (this.#o &&= (V(this.#o), null)),
      (this.#s &&= (V(this.#s), null)),
      T && (O(this.#t), Ze(), O(Qe()));
    var t = this.#n.onerror;
    let n = this.#n.failed;
    var r = !1,
      i = !1;
    let a = () => {
        if (r) {
          Je();
          return;
        }
        (r = !0),
          i && ze(),
          this.#s !== null &&
            xr(this.#s, () => {
              this.#s = null;
            }),
          this.#x(() => {
            this.#y();
          });
      },
      o = (e) => {
        try {
          (i = !0), t?.(e, a), (i = !1);
        } catch (e) {
          bt(e, this.#i && this.#i.parent);
        }
        n &&
          (this.#s = this.#x(() => {
            try {
              return B(() => {
                var t = G;
                (t.b = this),
                  (t.f |= 128),
                  n(
                    this.#e,
                    () => e,
                    () => a,
                  );
              });
            } catch (e) {
              return bt(e, this.#i.parent), null;
            }
          }));
      };
    _t(() => {
      var t;
      try {
        t = this.transform_error(e);
      } catch (e) {
        bt(e, this.#i && this.#i.parent);
        return;
      }
      typeof t == `object` && t && typeof t.then == `function`
        ? t.then(o, (e) => bt(e, this.#i && this.#i.parent))
        : o(t);
    });
  }
};
function sn(e, t, n, r) {
  let i = ft() ? dn : hn;
  var a = e.filter((e) => !e.settled);
  if (n.length === 0 && a.length === 0) {
    r(t.map(i));
    return;
  }
  var o = G,
    s = cn(),
    c = a.length === 1 ? a[0].promise : a.length > 1 ? Promise.all(a.map((e) => e.promise)) : null;
  function l(e) {
    if (!(o.f & 16384)) {
      s();
      try {
        r(e);
      } catch (e) {
        bt(e, o);
      }
      ln();
    }
  }
  var u = un();
  if (n.length === 0) {
    c.then(() => l(t.map(i))).finally(u);
    return;
  }
  function d() {
    Promise.all(n.map((e) => pn(e)))
      .then((e) => l([...t.map(i), ...e]))
      .catch((e) => bt(e, o))
      .finally(u);
  }
  c
    ? c.then(() => {
        s(), d(), ln();
      })
    : d();
}
function cn() {
  var e = G,
    t = H,
    n = A,
    r = M;
  return function (i = !0) {
    K(e), W(t), it(n), i && !(e.f & 16384) && (r?.activate(), r?.apply());
  };
}
function ln(e = !0) {
  K(null), W(null), it(null), e && M?.deactivate();
}
function un() {
  var e = G,
    t = e.b,
    n = M,
    r = !!t?.is_rendered();
  return (
    t?.update_pending_count(1, n),
    n.increment(r, e),
    () => {
      t?.update_pending_count(-1, n), n.decrement(r, e);
    }
  );
}
function dn(e) {
  var t = 2 | y;
  return (
    G !== null && (G.f |= ie),
    {
      ctx: A,
      deps: null,
      effects: null,
      equals: et,
      f: t,
      fn: e,
      reactions: null,
      rv: 0,
      v: w,
      wv: 0,
      parent: G,
      ac: null,
    }
  );
}
var fn = Symbol(`obsolete`);
function pn(e, t, n) {
  let r = G;
  r === null && Ce();
  var i = void 0,
    a = Tn(w),
    o = !H,
    s = new Set();
  return (
    ur(() => {
      var t = G,
        n = g();
      i = n.promise;
      try {
        Promise.resolve(e())
          .then(n.resolve, (e) => {
            e !== ve && n.reject(e);
          })
          .finally(ln);
      } catch (e) {
        n.reject(e), ln();
      }
      var c = M;
      if (o) {
        if (t.f & 32768) var l = un();
        if (r.b?.is_rendered()) c.async_deriveds.get(t)?.reject(fn);
        else for (let e of s.values()) e.reject(fn);
        s.add(n), c.async_deriveds.set(t, n);
      }
      let u = (e, t = void 0) => {
        l?.(),
          s.delete(n),
          t !== fn &&
            (c.activate(), t ? ((a.f |= ue), On(a, t)) : (a.f & 8388608 && (a.f ^= ue), On(a, e)), c.deactivate());
      };
      n.promise.then(u, (e) => u(null, e || `unknown`));
    }),
    ir(() => {
      for (let e of s) e.reject(fn);
    }),
    new Promise((e) => {
      function t(n) {
        function r() {
          n === i ? e(a) : t(i);
        }
        n.then(r, r);
      }
      t(i);
    })
  );
}
function mn(e) {
  let t = dn(e);
  return k || Ar(t), t;
}
function hn(e) {
  let t = dn(e);
  return (t.equals = nt), t;
}
function gn(e) {
  var t = e.effects;
  if (t !== null) {
    e.effects = null;
    for (var n = 0; n < t.length; n += 1) V(t[n]);
  }
}
function _n(e) {
  var t,
    n = G,
    r = e.parent;
  if (!Or && r !== null && e.v !== w && r.f & 24576) return We(), e.v;
  K(r);
  try {
    (e.f &= ~se), gn(e), (t = zr(e));
  } finally {
    K(n);
  }
  return t;
}
function vn(e) {
  var t = _n(e);
  if (
    !e.equals(t) &&
    ((e.wv = Ir()),
    (!M?.is_fork || e.deps === null) &&
      (M === null ? (e.v = t) : (M.capture(e, t, !0), Lt?.capture(e, t, !0)), e.deps === null))
  ) {
    j(e, v);
    return;
  }
  Or || (N === null ? St(e) : (rr() || M?.is_fork) && N.set(e, t));
}
function yn(e) {
  if (e.effects !== null)
    for (let t of e.effects)
      (t.teardown || t.ac) &&
        (t.teardown?.(), t.ac?.abort(ve), t.fn !== null && (t.teardown = m), (t.ac = null), Vr(t, 0), _r(t));
}
function bn(e) {
  if (e.effects !== null) for (let t of e.effects) t.teardown && t.fn !== null && Hr(t);
}
var xn = new Set(),
  Sn = new Map();
function Cn(e) {
  xn = e;
}
var wn = !1;
function Tn(e, t) {
  return { f: 0, v: e, reactions: null, equals: et, rv: 0, wv: 0 };
}
function En(e, t) {
  let n = Tn(e, t);
  return Ar(n), n;
}
function Dn(e, t = !1, n = !0) {
  let r = Tn(e);
  return t || (r.equals = nt), rt && n && A !== null && A.l !== null && (A.l.s ??= []).push(r), r;
}
function F(e, t, n = !1) {
  return (
    H !== null && (!U || H.f & 131072) && ft() && H.f & 4325394 && (q === null || !i.call(q, e)) && Re(),
    On(e, n ? Nn(t) : t, Ht)
  );
}
function On(e, t, n = null) {
  if (!e.equals(t)) {
    Sn.set(e, Or ? t : e.v);
    var r = Gt.ensure();
    if ((r.capture(e, t), e.f & 2)) {
      let t = e;
      e.f & 2048 && _n(t), N === null && St(t);
    }
    (e.wv = Ir()),
      Mn(e, y, n),
      ft() && G !== null && G.f & 1024 && !(G.f & 96) && (X === null ? jr([e]) : X.push(e)),
      !r.is_fork && xn.size > 0 && !wn && kn();
  }
  return t;
}
function kn() {
  wn = !1;
  for (let e of xn) {
    e.f & 1024 && j(e, b);
    let t;
    try {
      t = Lr(e);
    } catch {
      t = !0;
    }
    t && Hr(e);
  }
  xn.clear();
}
function An(e, t = 1) {
  var n = Z(e),
    r = t === 1 ? n++ : n--;
  return F(e, n), r;
}
function jn(e) {
  F(e, e.v + 1);
}
function Mn(e, t, n) {
  var r = e.reactions;
  if (r !== null)
    for (var i = ft(), a = r.length, o = 0; o < a; o++) {
      var s = r[o],
        c = s.f;
      if (!(!i && s === G)) {
        var l = (c & y) === 0;
        if ((l && j(s, t), c & 131072)) xn.add(s);
        else if (c & 2) {
          var u = s;
          N?.delete(u), c & 65536 || (c & 512 && (G === null || !(G.f & 2097152)) && (s.f |= se), Mn(u, b, n));
        } else if (l) {
          var d = s;
          c & 16 && P !== null && P.add(d), n === null ? Qt(d) : n.push(d);
        }
      }
    }
}
function Nn(e) {
  if (typeof e != `object` || !e || C in e) return e;
  let t = d(e);
  if (t !== l && t !== u) return e;
  var r = new Map(),
    i = n(e),
    a = En(0),
    o = null,
    c = Pr,
    f = (e) => {
      if (Pr === c) return e();
      var t = H,
        n = Pr;
      W(null), Fr(c);
      var r = e();
      return W(t), Fr(n), r;
    };
  return (
    i && r.set(`length`, En(e.length, o)),
    new Proxy(e, {
      defineProperty(e, t, n) {
        (!(`value` in n) || n.configurable === !1 || n.enumerable === !1 || n.writable === !1) && Ie();
        var i = r.get(t);
        return (
          i === void 0
            ? f(() => {
                var e = En(n.value, o);
                return r.set(t, e), e;
              })
            : F(i, n.value, !0),
          !0
        );
      },
      deleteProperty(e, t) {
        var n = r.get(t);
        if (n === void 0) {
          if (t in e) {
            let e = f(() => En(w, o));
            r.set(t, e), jn(a);
          }
        } else F(n, w), jn(a);
        return !0;
      },
      get(t, n, i) {
        if (n === C) return e;
        var a = r.get(n),
          c = n in t;
        if (
          (a === void 0 && (!c || s(t, n)?.writable) && ((a = f(() => En(Nn(c ? t[n] : w), o))), r.set(n, a)),
          a !== void 0)
        ) {
          var l = Z(a);
          return l === w ? void 0 : l;
        }
        return Reflect.get(t, n, i);
      },
      getOwnPropertyDescriptor(e, t) {
        var n = Reflect.getOwnPropertyDescriptor(e, t);
        if (n && `value` in n) {
          var i = r.get(t);
          i && (n.value = Z(i));
        } else if (n === void 0) {
          var a = r.get(t),
            o = a?.v;
          if (a !== void 0 && o !== w) return { enumerable: !0, configurable: !0, value: o, writable: !0 };
        }
        return n;
      },
      has(e, t) {
        if (t === C) return !0;
        var n = r.get(t),
          i = (n !== void 0 && n.v !== w) || Reflect.has(e, t);
        return (n !== void 0 || (G !== null && (!i || s(e, t)?.writable))) &&
          (n === void 0 && ((n = f(() => En(i ? Nn(e[t]) : w, o))), r.set(t, n)), Z(n) === w)
          ? !1
          : i;
      },
      set(e, t, n, c) {
        var l = r.get(t),
          u = t in e;
        if (i && t === `length`)
          for (var d = n; d < l.v; d += 1) {
            var p = r.get(d + ``);
            p === void 0 ? d in e && ((p = f(() => En(w, o))), r.set(d + ``, p)) : F(p, w);
          }
        if (l === void 0) (!u || s(e, t)?.writable) && ((l = f(() => En(void 0, o))), F(l, Nn(n)), r.set(t, l));
        else {
          u = l.v !== w;
          var m = f(() => Nn(n));
          F(l, m);
        }
        var h = Reflect.getOwnPropertyDescriptor(e, t);
        if ((h?.set && h.set.call(c, n), !u)) {
          if (i && typeof t == `string`) {
            var g = r.get(`length`),
              _ = Number(t);
            Number.isInteger(_) && _ >= g.v && F(g, _ + 1);
          }
          jn(a);
        }
        return !0;
      },
      ownKeys(e) {
        Z(a);
        var t = Reflect.ownKeys(e).filter((e) => {
          var t = r.get(e);
          return t === void 0 || t.v !== w;
        });
        for (var [n, i] of r) i.v !== w && !(n in e) && t.push(n);
        return t;
      },
      setPrototypeOf() {
        Le();
      },
    })
  );
}
function Pn(e) {
  try {
    if (typeof e == `object` && e && C in e) return e[C];
  } catch {}
  return e;
}
function Fn(e, t) {
  return Object.is(Pn(e), Pn(t));
}
var In, Ln, Rn, zn, Bn;
function Vn() {
  if (In === void 0) {
    (In = window), (Ln = document), (Rn = /Firefox/.test(navigator.userAgent));
    var e = Element.prototype,
      t = Node.prototype,
      n = Text.prototype;
    (zn = s(t, `firstChild`).get),
      (Bn = s(t, `nextSibling`).get),
      f(e) && ((e[me] = void 0), (e[pe] = null), (e[he] = void 0), (e.__e = void 0)),
      f(n) && (n[ge] = void 0);
  }
}
function I(e = ``) {
  return document.createTextNode(e);
}
function L(e) {
  return zn.call(e);
}
function R(e) {
  return Bn.call(e);
}
function Hn(e, t) {
  if (!T) return L(e);
  var n = L(D);
  if (n === null) n = D.appendChild(I());
  else if (t && n.nodeType !== 3) {
    var r = I();
    return n?.before(r), O(r), r;
  }
  return t && Jn(n), O(n), n;
}
function Un(e, t = !1) {
  if (!T) {
    var n = L(e);
    return n instanceof Comment && n.data === `` ? R(n) : n;
  }
  if (t) {
    if (D?.nodeType !== 3) {
      var r = I();
      return D?.before(r), O(r), r;
    }
    Jn(D);
  }
  return D;
}
function Wn(e, t = 1, n = !1) {
  let r = T ? D : e;
  for (var i; t--; ) (i = r), (r = R(r));
  if (!T) return r;
  if (n) {
    if (r?.nodeType !== 3) {
      var a = I();
      return r === null ? i?.after(a) : r.before(a), O(a), a;
    }
    Jn(r);
  }
  return O(r), r;
}
function Gn(e) {
  e.textContent = ``;
}
function Kn() {
  return !k || P !== null ? !1 : (G.f & ee) !== 0;
}
function qn(e, t, n) {
  let r = n ? { is: n } : void 0;
  return document.createElementNS(t ?? `http://www.w3.org/1999/xhtml`, e, r);
}
function Jn(e) {
  if (e.nodeValue.length < 65536) return;
  let t = e.nextSibling;
  for (; t !== null && t.nodeType === 3; ) t.remove(), (e.nodeValue += t.nodeValue), (t = e.nextSibling);
}
function Yn(e, t) {
  if (t) {
    let t = document.body;
    (e.autofocus = !0),
      _t(() => {
        document.activeElement === t && e.focus();
      });
  }
}
function Xn(e) {
  T && L(e) !== null && Gn(e);
}
var Zn = !1;
function Qn() {
  Zn ||
    ((Zn = !0),
    document.addEventListener(
      `reset`,
      (e) => {
        Promise.resolve().then(() => {
          if (!e.defaultPrevented) for (let t of e.target.elements) t[_e]?.();
        });
      },
      { capture: !0 },
    ));
}
function $n(e) {
  var t = H,
    n = G;
  W(null), K(null);
  try {
    return e();
  } finally {
    W(t), K(n);
  }
}
function er(e, t, n, r = n) {
  e.addEventListener(t, () => $n(n));
  let i = e[_e];
  i
    ? (e[_e] = () => {
        i(), r(!0);
      })
    : (e[_e] = () => r(!0)),
    Qn();
}
function tr(e) {
  G === null && (H === null && De(e), Ee()), Or && Te(e);
}
function nr(e, t) {
  var n = t.last;
  n === null ? (t.last = t.first = e) : ((n.next = e), (e.prev = n), (t.last = e));
}
function z(e, t) {
  var n = G;
  n !== null && n.f & 8192 && (e |= x);
  var r = {
    ctx: A,
    deps: null,
    nodes: null,
    f: e | y | 512,
    first: null,
    fn: t,
    last: null,
    next: null,
    parent: n,
    b: n && n.b,
    prev: null,
    teardown: null,
    wv: 0,
    ac: null,
  };
  M?.register_created_effect(r);
  var i = r;
  if (e & 4) Vt === null ? Gt.ensure().schedule(r) : Vt.push(r);
  else if (t !== null) {
    try {
      Hr(r);
    } catch (e) {
      throw (V(r), e);
    }
    i.deps === null &&
      i.teardown === null &&
      i.nodes === null &&
      i.first === i.last &&
      !(i.f & 524288) &&
      ((i = i.first), e & 16 && e & 65536 && i !== null && (i.f |= ne));
  }
  if (i !== null && ((i.parent = n), n !== null && nr(i, n), H !== null && H.f & 2 && !(e & 64))) {
    var a = H;
    (a.effects ??= []).push(i);
  }
  return r;
}
function rr() {
  return H !== null && !U;
}
function ir(e) {
  let t = z(8, null);
  return j(t, v), (t.teardown = e), t;
}
function ar(e) {
  tr(`$effect`);
  var t = G.f;
  if (!H && t & 32 && A !== null && !A.i) {
    var n = A;
    (n.e ??= []).push(e);
  } else return or(e);
}
function or(e) {
  return z(4 | ae, e);
}
function sr(e) {
  return tr(`$effect.pre`), z(8 | ae, e);
}
function cr(e) {
  Gt.ensure();
  let t = z(64 | ie, e);
  return (e = {}) =>
    new Promise((n) => {
      e.outro
        ? xr(t, () => {
            V(t), n(void 0);
          })
        : (V(t), n(void 0));
    });
}
function lr(e) {
  return z(4, e);
}
function ur(e) {
  return z(le | ie, e);
}
function dr(e, t = 0) {
  return z(8 | t, e);
}
function fr(e, t = [], n = [], r = []) {
  sn(r, t, n, (t) => {
    z(8, () => e(...t.map(Z)));
  });
}
function pr(e, t = [], n = [], r = []) {
  sn(r, t, n, (t) => {
    z(4, () => e(...t.map(Z)));
  });
}
function mr(e, t = 0) {
  return z(16 | t, e);
}
function hr(e, t = 0) {
  return z(_ | t, e);
}
function B(e) {
  return z(32 | ie, e);
}
function gr(e) {
  var t = e.teardown;
  if (t !== null) {
    let e = Or,
      n = H;
    kr(!0), W(null);
    try {
      t.call(null);
    } finally {
      kr(e), W(n);
    }
  }
}
function _r(e, t = !1) {
  var n = e.first;
  for (e.first = e.last = null; n !== null; ) {
    let e = n.ac;
    e !== null &&
      $n(() => {
        e.abort(ve);
      });
    var r = n.next;
    n.f & 64 ? (n.parent = null) : V(n, t), (n = r);
  }
}
function vr(e) {
  for (var t = e.first; t !== null; ) {
    var n = t.next;
    t.f & 32 || V(t), (t = n);
  }
}
function V(e, t = !0) {
  var n = !1;
  (t || e.f & 262144) && e.nodes !== null && e.nodes.end !== null && (yr(e.nodes.start, e.nodes.end), (n = !0)),
    j(e, te),
    _r(e, t && !n),
    Vr(e, 0);
  var r = e.nodes && e.nodes.t;
  if (r !== null) for (let e of r) e.stop();
  gr(e), (e.f ^= te), (e.f |= S);
  var i = e.parent;
  i !== null && i.first !== null && br(e),
    (e.next = e.prev = e.teardown = e.ctx = e.deps = e.fn = e.nodes = e.ac = e.b = null);
}
function yr(e, t) {
  for (; e !== null; ) {
    var n = e === t ? null : R(e);
    e.remove(), (e = n);
  }
}
function br(e) {
  var t = e.parent,
    n = e.prev,
    r = e.next;
  n !== null && (n.next = r),
    r !== null && (r.prev = n),
    t !== null && (t.first === e && (t.first = r), t.last === e && (t.last = n));
}
function xr(e, t, n = !0) {
  var r = [];
  Sr(e, r, !0);
  var i = () => {
      n && V(e), t && t();
    },
    a = r.length;
  if (a > 0) {
    var o = () => --a || i();
    for (var s of r) s.out(o);
  } else i();
}
function Sr(e, t, n) {
  if (!(e.f & 8192)) {
    e.f ^= x;
    var r = e.nodes && e.nodes.t;
    if (r !== null) for (let e of r) (e.is_global || n) && t.push(e);
    for (var i = e.first; i !== null; ) {
      var a = i.next;
      if (!(i.f & 64)) {
        var o = (i.f & 65536) != 0 || ((i.f & 32) != 0 && (e.f & 16) != 0);
        Sr(i, t, o ? n : !1);
      }
      i = a;
    }
  }
}
function Cr(e) {
  wr(e, !0);
}
function wr(e, t) {
  if (e.f & 8192) {
    (e.f ^= x), e.f & 1024 || (j(e, y), Gt.ensure().schedule(e));
    for (var n = e.first; n !== null; ) {
      var r = n.next,
        i = (n.f & 65536) != 0 || (n.f & 32) != 0;
      wr(n, i ? t : !1), (n = r);
    }
    var a = e.nodes && e.nodes.t;
    if (a !== null) for (let e of a) (e.is_global || t) && e.in();
  }
}
function Tr(e, t) {
  if (e.nodes)
    for (var n = e.nodes.start, r = e.nodes.end; n !== null; ) {
      var i = n === r ? null : R(n);
      t.append(n), (n = i);
    }
}
var Er = null,
  Dr = !1,
  Or = !1;
function kr(e) {
  Or = e;
}
var H = null,
  U = !1;
function W(e) {
  H = e;
}
var G = null;
function K(e) {
  G = e;
}
var q = null;
function Ar(e) {
  H !== null && (!k || H.f & 2) && (q === null ? (q = [e]) : q.push(e));
}
var J = null,
  Y = 0,
  X = null;
function jr(e) {
  X = e;
}
var Mr = 1,
  Nr = 0,
  Pr = Nr;
function Fr(e) {
  Pr = e;
}
function Ir() {
  return ++Mr;
}
function Lr(e) {
  var t = e.f;
  if (t & 2048) return !0;
  if ((t & 2 && (e.f &= ~se), t & 4096)) {
    for (var n = e.deps, r = n.length, i = 0; i < r; i++) {
      var a = n[i];
      if ((Lr(a) && vn(a), a.wv > e.wv)) return !0;
    }
    t & 512 && N === null && j(e, v);
  }
  return !1;
}
function Rr(e, t, n = !0) {
  var r = e.reactions;
  if (r !== null && !(!k && q !== null && i.call(q, e)))
    for (var a = 0; a < r.length; a++) {
      var o = r[a];
      o.f & 2 ? Rr(o, t, !1) : t === o && (n ? j(o, y) : o.f & 1024 && j(o, b), Qt(o));
    }
}
function zr(e) {
  var t = J,
    n = Y,
    r = X,
    i = H,
    a = q,
    o = A,
    s = U,
    c = Pr,
    l = e.f;
  (J = null),
    (Y = 0),
    (X = null),
    (H = l & 96 ? null : e),
    (q = null),
    it(e.ctx),
    (U = !1),
    (Pr = ++Nr),
    e.ac !== null &&
      ($n(() => {
        e.ac.abort(ve);
      }),
      (e.ac = null));
  try {
    e.f |= ce;
    var u = e.fn,
      d = u();
    e.f |= ee;
    var f = e.deps,
      p = M?.is_fork;
    if (J !== null) {
      var m;
      if ((p || Vr(e, Y), f !== null && Y > 0)) for (f.length = Y + J.length, m = 0; m < J.length; m++) f[Y + m] = J[m];
      else e.deps = f = J;
      if (rr() && e.f & 512) for (m = Y; m < f.length; m++) (f[m].reactions ??= []).push(e);
    } else !p && f !== null && Y < f.length && (Vr(e, Y), (f.length = Y));
    if (ft() && X !== null && !U && f !== null && !(e.f & 6146)) for (m = 0; m < X.length; m++) Rr(X[m], e);
    if (i !== null && i !== e) {
      if ((Nr++, i.deps !== null)) for (let e = 0; e < n; e += 1) i.deps[e].rv = Nr;
      if (t !== null) for (let e of t) e.rv = Nr;
      X !== null && (r === null ? (r = X) : r.push(...X));
    }
    return e.f & 8388608 && (e.f ^= ue), d;
  } catch (e) {
    return yt(e);
  } finally {
    (e.f ^= ce), (J = t), (Y = n), (X = r), (H = i), (q = a), it(o), (U = s), (Pr = c);
  }
}
function Br(e, t) {
  let n = t.reactions;
  if (n !== null) {
    var a = r.call(n, e);
    if (a !== -1) {
      var o = n.length - 1;
      o === 0 ? (n = t.reactions = null) : ((n[a] = n[o]), n.pop());
    }
  }
  if (n === null && t.f & 2 && (J === null || !i.call(J, t))) {
    var s = t;
    s.f & 512 && ((s.f ^= 512), (s.f &= ~se)), s.v !== w && St(s), yn(s), Vr(s, 0);
  }
}
function Vr(e, t) {
  var n = e.deps;
  if (n !== null) for (var r = t; r < n.length; r++) Br(e, n[r]);
}
function Hr(e) {
  var t = e.f;
  if (!(t & 16384)) {
    j(e, v);
    var n = G,
      r = Dr;
    (G = e), (Dr = !0);
    try {
      t & 16777232 ? vr(e) : _r(e), gr(e);
      var i = zr(e);
      (e.teardown = typeof i == `function` ? i : null), (e.wv = Mr);
    } finally {
      (Dr = r), (G = n);
    }
  }
}
async function Ur() {
  if (k)
    return new Promise((e) => {
      requestAnimationFrame(() => e()), setTimeout(() => e());
    });
  await Promise.resolve(), Kt();
}
function Wr() {
  return Gt.ensure().settled();
}
function Z(e) {
  var t = (e.f & 2) != 0;
  if ((Er?.add(e), H !== null && !U && !(G !== null && G.f & 16384) && (q === null || !i.call(q, e)))) {
    var n = H.deps;
    if (H.f & 2097152)
      e.rv < Nr && ((e.rv = Nr), J === null && n !== null && n[Y] === e ? Y++ : J === null ? (J = [e]) : J.push(e));
    else {
      (H.deps ??= []), i.call(H.deps, e) || H.deps.push(e);
      var r = e.reactions;
      r === null ? (e.reactions = [H]) : i.call(r, H) || r.push(H);
    }
  }
  if (Or && Sn.has(e)) return Sn.get(e);
  if (t) {
    var a = e;
    if (Or) {
      var o = a.v;
      return ((!(a.f & 1024) && a.reactions !== null) || Kr(a)) && (o = _n(a)), Sn.set(a, o), o;
    }
    var s = (a.f & 512) == 0 && !U && H !== null && (Dr || (H.f & 512) != 0),
      c = (a.f & ee) === 0;
    Lr(a) && (s && (a.f |= 512), vn(a)), s && !c && (bn(a), Gr(a));
  }
  if (N?.has(e)) return N.get(e);
  if (e.f & 8388608) throw e.v;
  return e.v;
}
function Gr(e) {
  if (((e.f |= 512), e.deps !== null))
    for (let t of e.deps) (t.reactions ??= []).push(e), t.f & 2 && !(t.f & 512) && (bn(t), Gr(t));
}
function Kr(e) {
  if (e.v === w) return !0;
  if (e.deps === null) return !1;
  for (let t of e.deps) if (Sn.has(t) || (t.f & 2 && Kr(t))) return !0;
  return !1;
}
function Q(e) {
  var t = U;
  try {
    return (U = !0), e();
  } finally {
    U = t;
  }
}
function qr(e) {
  if (!(typeof e != `object` || !e || e instanceof EventTarget)) {
    if (C in e) Jr(e);
    else if (!Array.isArray(e))
      for (let t in e) {
        let n = e[t];
        typeof n == `object` && n && C in n && Jr(n);
      }
  }
}
function Jr(e, t = new Set()) {
  if (typeof e == `object` && e && !(e instanceof EventTarget) && !t.has(e)) {
    t.add(e), e instanceof Date && e.getTime();
    for (let n in e)
      try {
        Jr(e[n], t);
      } catch {}
    let n = d(e);
    if (
      n !== Object.prototype &&
      n !== Array.prototype &&
      n !== Map.prototype &&
      n !== Set.prototype &&
      n !== Date.prototype
    ) {
      let t = c(n);
      for (let n in t) {
        let r = t[n].get;
        if (r)
          try {
            r.call(e);
          } catch {}
      }
    }
  }
}
function Yr(e) {
  return e.endsWith(`capture`) && e !== `gotpointercapture` && e !== `lostpointercapture`;
}
var Xr = [
  `beforeinput`,
  `click`,
  `change`,
  `dblclick`,
  `contextmenu`,
  `focusin`,
  `focusout`,
  `input`,
  `keydown`,
  `keyup`,
  `mousedown`,
  `mousemove`,
  `mouseout`,
  `mouseover`,
  `mouseup`,
  `pointerdown`,
  `pointermove`,
  `pointerout`,
  `pointerover`,
  `pointerup`,
  `touchend`,
  `touchmove`,
  `touchstart`,
];
function Zr(e) {
  return Xr.includes(e);
}
var Qr =
    `allowfullscreen.async.autofocus.autoplay.checked.controls.default.disabled.formnovalidate.indeterminate.inert.ismap.loop.multiple.muted.nomodule.novalidate.open.playsinline.readonly.required.reversed.seamless.selected.webkitdirectory.defer.disablepictureinpicture.disableremoteplayback`.split(
      `.`,
    ),
  $r = {
    formnovalidate: `formNoValidate`,
    ismap: `isMap`,
    nomodule: `noModule`,
    playsinline: `playsInline`,
    readonly: `readOnly`,
    defaultvalue: `defaultValue`,
    defaultchecked: `defaultChecked`,
    srcobject: `srcObject`,
    novalidate: `noValidate`,
    allowfullscreen: `allowFullscreen`,
    disablepictureinpicture: `disablePictureInPicture`,
    disableremoteplayback: `disableRemotePlayback`,
  };
function ei(e) {
  return (e = e.toLowerCase()), $r[e] ?? e;
}
[...Qr];
var ti = [`touchstart`, `touchmove`];
function ni(e) {
  return ti.includes(e);
}
var ri = Symbol(`events`),
  ii = new Set(),
  ai = new Set();
function oi(e) {
  if (!T) return;
  e.removeAttribute(`onload`), e.removeAttribute(`onerror`);
  let t = e.__e;
  t !== void 0 &&
    ((e.__e = void 0),
    queueMicrotask(() => {
      e.isConnected && e.dispatchEvent(t);
    }));
}
function si(e, t, n, r = {}) {
  function i(e) {
    if ((r.capture || fi.call(t, e), !e.cancelBubble)) return $n(() => n?.call(this, e));
  }
  return (
    e.startsWith(`pointer`) || e.startsWith(`touch`) || e === `wheel`
      ? _t(() => {
          t.addEventListener(e, i, r);
        })
      : t.addEventListener(e, i, r),
    i
  );
}
function ci(e, t, n, r, i) {
  var a = { capture: r, passive: i },
    o = si(e, t, n, a);
  (t === document.body || t === window || t === document || t instanceof HTMLMediaElement) &&
    ir(() => {
      t.removeEventListener(e, o, a);
    });
}
function li(e, t, n) {
  (t[ri] ??= {})[e] = n;
}
function ui(e) {
  for (var t = 0; t < e.length; t++) ii.add(e[t]);
  for (var n of ai) n(e);
}
var di = null;
function fi(e) {
  var t = this,
    n = t.ownerDocument,
    r = e.type,
    i = e.composedPath?.() || [],
    a = i[0] || e.target;
  di = e;
  var s = 0,
    c = di === e && e[ri];
  if (c) {
    var l = i.indexOf(c);
    if (l !== -1 && (t === document || t === window)) {
      e[ri] = t;
      return;
    }
    var u = i.indexOf(t);
    if (u === -1) return;
    l <= u && (s = l);
  }
  if (((a = i[s] || e.target), a !== t)) {
    o(e, `currentTarget`, {
      configurable: !0,
      get() {
        return a || n;
      },
    });
    var d = H,
      f = G;
    W(null), K(null);
    try {
      for (var p, m = []; a !== null && a !== t; ) {
        try {
          var h = a[ri]?.[r];
          h != null && (!a.disabled || e.target === a) && h.call(a, e);
        } catch (e) {
          p ? m.push(e) : (p = e);
        }
        if (e.cancelBubble) break;
        s++, (a = s < i.length ? i[s] : null);
      }
      if (p) {
        for (let e of m)
          queueMicrotask(() => {
            throw e;
          });
        throw p;
      }
    } finally {
      (e[ri] = t), delete e.currentTarget, W(d), K(f);
    }
  }
}
var pi =
  globalThis?.window?.trustedTypes &&
  globalThis.window.trustedTypes.createPolicy(`svelte-trusted-html`, { createHTML: (e) => e });
function mi(e) {
  return pi?.createHTML(e) ?? e;
}
function hi(e) {
  var t = qn(`template`);
  return (t.innerHTML = mi(e.replaceAll(`<!>`, `<!---->`))), t.content;
}
function $(e, t) {
  var n = G;
  n.nodes === null && (n.nodes = { start: e, end: t, a: null, t: null });
}
function gi(e, t) {
  var n = (t & 1) != 0,
    r = (t & 2) != 0,
    i,
    a = !e.startsWith(`<!>`);
  return () => {
    if (T) return $(D, null), D;
    i === void 0 && ((i = hi(a ? e : `<!>` + e)), n || (i = L(i)));
    var t = r || Rn ? document.importNode(i, !0) : i.cloneNode(!0);
    if (n) {
      var o = L(t),
        s = t.lastChild;
      $(o, s);
    } else $(t, t);
    return t;
  };
}
function _i(e, t, n = `svg`) {
  var r = !e.startsWith(`<!>`),
    i = (t & 1) != 0,
    a = `<${n}>${r ? e : `<!>` + e}</${n}>`,
    o;
  return () => {
    if (T) return $(D, null), D;
    if (!o) {
      var e = L(hi(a));
      if (i) for (o = document.createDocumentFragment(); L(e); ) o.appendChild(L(e));
      else o = L(e);
    }
    var t = o.cloneNode(!0);
    if (i) {
      var n = L(t),
        r = t.lastChild;
      $(n, r);
    } else $(t, t);
    return t;
  };
}
function vi(e, t) {
  return _i(e, t, `svg`);
}
function yi(e = ``) {
  if (!T) {
    var t = I(e + ``);
    return $(t, t), t;
  }
  var n = D;
  return n.nodeType === 3 ? Jn(n) : (n.before((n = I())), O(n)), $(n, n), n;
}
function bi() {
  if (T) return $(D, null), D;
  var e = document.createDocumentFragment(),
    t = document.createComment(``),
    n = I();
  return e.append(t, n), $(t, n), e;
}
function xi(e, t) {
  if (T) {
    var n = G;
    (!(n.f & 32768) || n.nodes.end === null) && (n.nodes.end = D), Ye();
    return;
  }
  e !== null && e.before(t);
}
function Si(e, t) {
  var n = t == null ? `` : typeof t == `object` ? `${t}` : t;
  n !== (e[ge] ??= e.nodeValue) && ((e[ge] = n), (e.nodeValue = `${n}`));
}
function Ci(e, t) {
  return Ei(e, t);
}
function wi(e, t) {
  Vn(), (t.intro = t.intro ?? !1);
  let n = t.target,
    r = T,
    i = D;
  try {
    for (var a = L(n); a && (a.nodeType !== 8 || a.data !== `[`); ) a = R(a);
    if (!a) throw Be;
    E(!0), O(a);
    let r = Ei(e, { ...t, anchor: a });
    return E(!1), r;
  } catch (r) {
    if (
      r instanceof Error &&
      r.message
        .split(`
`)
        .some((e) => e.startsWith(`https://svelte.dev/e/`))
    )
      throw r;
    return r !== Be && console.warn(`Failed to hydrate: `, r), t.recover === !1 && Me(), Vn(), Gn(n), E(!1), Ci(e, t);
  } finally {
    E(r), O(i);
  }
}
var Ti = new Map();
function Ei(e, { target: t, anchor: n, props: r = {}, events: i, context: o, intro: s = !0, transformError: c }) {
  Vn();
  var l = void 0,
    u = cr(() => {
      var s = n ?? t.appendChild(I());
      an(
        s,
        { pending: () => {} },
        (t) => {
          ut({});
          var n = A;
          if (
            (o && (n.c = o),
            i && (r.$$events = i),
            T && $(t, null),
            (l = e(t, r) || {}),
            T && ((G.nodes.end = D), D === null || D.nodeType !== 8 || D.data !== `]`))
          )
            throw (Ke(), Be);
          dt();
        },
        c,
      );
      var u = new Set(),
        d = (e) => {
          for (var n = 0; n < e.length; n++) {
            var r = e[n];
            if (!u.has(r)) {
              u.add(r);
              var i = ni(r);
              for (let e of [t, document]) {
                var a = Ti.get(e);
                a === void 0 && ((a = new Map()), Ti.set(e, a));
                var o = a.get(r);
                o === void 0 ? (e.addEventListener(r, fi, { passive: i }), a.set(r, 1)) : a.set(r, o + 1);
              }
            }
          }
        };
      return (
        d(a(ii)),
        ai.add(d),
        () => {
          for (var e of u)
            for (let n of [t, document]) {
              var r = Ti.get(n),
                i = r.get(e);
              --i == 0 ? (n.removeEventListener(e, fi), r.delete(e), r.size === 0 && Ti.delete(n)) : r.set(e, i);
            }
          ai.delete(d), s !== n && s.parentNode?.removeChild(s);
        }
      );
    });
  return Di.set(l, u), l;
}
var Di = new WeakMap();
function Oi(e, t) {
  let n = Di.get(e);
  return n ? (Di.delete(e), n(t)) : Promise.resolve();
}
var ki = class {
  anchor;
  #e = new Map();
  #t = new Map();
  #n = new Map();
  #r = new Set();
  #i = !0;
  constructor(e, t = !0) {
    (this.anchor = e), (this.#i = t);
  }
  #a = (e) => {
    if (this.#e.has(e)) {
      var t = this.#e.get(e),
        n = this.#t.get(t);
      if (n) Cr(n), this.#r.delete(t);
      else {
        var r = this.#n.get(t);
        r &&
          (Cr(r.effect),
          this.#t.set(t, r.effect),
          this.#n.delete(t),
          r.fragment.lastChild.remove(),
          this.anchor.before(r.fragment),
          (n = r.effect));
      }
      for (let [t, n] of this.#e) {
        if ((this.#e.delete(t), t === e)) break;
        let r = this.#n.get(n);
        r && (V(r.effect), this.#n.delete(n));
      }
      for (let [e, r] of this.#t) {
        if (e === t || this.#r.has(e)) continue;
        let i = () => {
          if (Array.from(this.#e.values()).includes(e)) {
            var t = document.createDocumentFragment();
            Tr(r, t), t.append(I()), this.#n.set(e, { effect: r, fragment: t });
          } else V(r);
          this.#r.delete(e), this.#t.delete(e);
        };
        this.#i || !n ? (this.#r.add(e), xr(r, i, !1)) : i();
      }
    }
  };
  #o = (e) => {
    this.#e.delete(e);
    let t = Array.from(this.#e.values());
    for (let [e, n] of this.#n) t.includes(e) || (V(n.effect), this.#n.delete(e));
  };
  ensure(e, t) {
    var n = M,
      r = Kn();
    if (t && !this.#t.has(e) && !this.#n.has(e))
      if (r) {
        var i = document.createDocumentFragment(),
          a = I();
        i.append(a), this.#n.set(e, { effect: B(() => t(a)), fragment: i });
      } else
        this.#t.set(
          e,
          B(() => t(this.anchor)),
        );
    if ((this.#e.set(n, e), r)) {
      for (let [t, r] of this.#t) t === e ? n.unskip_effect(r) : n.skip_effect(r);
      for (let [t, r] of this.#n) t === e ? n.unskip_effect(r.effect) : n.skip_effect(r.effect);
      n.oncommit(this.#a), n.ondiscard(this.#o);
    } else T && (this.anchor = D), this.#a(n);
  }
};
function Ai(e, t, n = !1) {
  var r;
  T && ((r = D), Ye());
  var i = new ki(e),
    a = n ? ne : 0;
  function o(e, t) {
    if (T) {
      var n = $e(r);
      if (e !== parseInt(n.substring(1))) {
        var a = Qe();
        O(a), (i.anchor = a), E(!1), i.ensure(e, t), E(!0);
        return;
      }
    }
    i.ensure(e, t);
  }
  mr(() => {
    var e = !1;
    t((t, n = 0) => {
      (e = !0), o(n, t);
    }),
      e || o(-1, null);
  }, a);
}
function ji(e, t) {
  return t;
}
function Mi(e, t, n) {
  for (var r = [], i = t.length, o, s = t.length, c = 0; c < i; c++) {
    let n = t[c];
    xr(
      n,
      () => {
        if (o) {
          if ((o.pending.delete(n), o.done.add(n), o.pending.size === 0)) {
            var t = e.outrogroups;
            Ni(e, a(o.done)), t.delete(o), t.size === 0 && (e.outrogroups = null);
          }
        } else --s;
      },
      !1,
    );
  }
  if (s === 0) {
    var l = r.length === 0 && n !== null;
    if (l) {
      var u = n,
        d = u.parentNode;
      Gn(d), d.append(u), e.items.clear();
    }
    Ni(e, t, !l);
  } else (o = { pending: new Set(t), done: new Set() }), (e.outrogroups ??= new Set()).add(o);
}
function Ni(e, t, n = !0) {
  var r;
  if (e.pending.size > 0) {
    r = new Set();
    for (let t of e.pending.values()) for (let n of t) r.add(e.items.get(n).e);
  }
  for (var i = 0; i < t.length; i++) {
    var a = t[i];
    r?.has(a) ? ((a.f |= oe), Tr(a, document.createDocumentFragment())) : V(t[i], n);
  }
}
var Pi;
function Fi(e, t, r, i, o, s = null) {
  var c = e,
    l = new Map();
  if (t & 4) {
    var u = e;
    c = T ? O(L(u)) : u.appendChild(I());
  }
  T && Ye();
  var d = null,
    f = hn(() => {
      var e = r();
      return n(e) ? e : e == null ? [] : a(e);
    }),
    p,
    m = new Map(),
    h = !0;
  function g(e) {
    v.effect.f & 16384 ||
      (v.pending.delete(e),
      (v.fallback = d),
      Li(v, p, c, t, i),
      d !== null &&
        (p.length === 0
          ? d.f & 33554432
            ? ((d.f ^= oe), zi(d, null, c))
            : Cr(d)
          : xr(d, () => {
              d = null;
            })));
  }
  function _(e) {
    v.pending.delete(e);
  }
  var v = {
    effect: mr(() => {
      p = Z(f);
      var e = p.length;
      let n = !1;
      T && ($e(c) === `[!`) != (e === 0) && ((c = Qe()), O(c), E(!1), (n = !0));
      for (var a = new Set(), u = M, v = Kn(), y = 0; y < e; y += 1) {
        T && D.nodeType === 8 && D.data === `]` && ((c = D), (n = !0), E(!1));
        var b = p[y],
          x = i(b, y),
          S = h ? null : l.get(x);
        S
          ? (S.v && On(S.v, b), S.i && On(S.i, y), v && u.unskip_effect(S.e))
          : ((S = Ri(l, h ? c : (Pi ??= I()), b, x, y, o, t, r)), h || (S.e.f |= oe), l.set(x, S)),
          a.add(x);
      }
      if (
        (e === 0 && s && !d && (h ? (d = B(() => s(c))) : ((d = B(() => s((Pi ??= I())))), (d.f |= oe))),
        e > a.size && we(``, ``, ``),
        T && e > 0 && O(Qe()),
        !h)
      )
        if ((m.set(u, a), v)) {
          for (let [e, t] of l) a.has(e) || u.skip_effect(t.e);
          u.oncommit(g), u.ondiscard(_);
        } else g(u);
      n && E(!0), Z(f);
    }),
    flags: t,
    items: l,
    pending: m,
    outrogroups: null,
    fallback: d,
  };
  (h = !1), T && (c = D);
}
function Ii(e) {
  for (; e !== null && !(e.f & 32); ) e = e.next;
  return e;
}
function Li(e, t, n, r, i) {
  var o = (r & 8) != 0,
    s = t.length,
    c = e.items,
    l = Ii(e.effect.first),
    u,
    d = null,
    f,
    p = [],
    m = [],
    h,
    g,
    _,
    v;
  if (o)
    for (v = 0; v < s; v += 1)
      (h = t[v]), (g = i(h, v)), (_ = c.get(g).e), _.f & 33554432 || (_.nodes?.a?.measure(), (f ??= new Set()).add(_));
  for (v = 0; v < s; v += 1) {
    if (((h = t[v]), (g = i(h, v)), (_ = c.get(g).e), e.outrogroups !== null))
      for (let t of e.outrogroups) t.pending.delete(_), t.done.delete(_);
    if ((_.f & 8192 && (Cr(_), o && (_.nodes?.a?.unfix(), (f ??= new Set()).delete(_))), _.f & 33554432))
      if (((_.f ^= oe), _ === l)) zi(_, null, n);
      else {
        var y = d ? d.next : l;
        _ === e.effect.last && (e.effect.last = _.prev),
          _.prev && (_.prev.next = _.next),
          _.next && (_.next.prev = _.prev),
          Bi(e, d, _),
          Bi(e, _, y),
          zi(_, y, n),
          (d = _),
          (p = []),
          (m = []),
          (l = Ii(d.next));
        continue;
      }
    if (_ !== l) {
      if (u !== void 0 && u.has(_)) {
        if (p.length < m.length) {
          var b = m[0],
            x;
          d = b.prev;
          var S = p[0],
            ee = p[p.length - 1];
          for (x = 0; x < p.length; x += 1) zi(p[x], b, n);
          for (x = 0; x < m.length; x += 1) u.delete(m[x]);
          Bi(e, S.prev, ee.next), Bi(e, d, S), Bi(e, ee, b), (l = b), (d = ee), --v, (p = []), (m = []);
        } else
          u.delete(_),
            zi(_, l, n),
            Bi(e, _.prev, _.next),
            Bi(e, _, d === null ? e.effect.first : d.next),
            Bi(e, d, _),
            (d = _);
        continue;
      }
      for (p = [], m = []; l !== null && l !== _; ) (u ??= new Set()).add(l), m.push(l), (l = Ii(l.next));
      if (l === null) continue;
    }
    _.f & 33554432 || p.push(_), (d = _), (l = Ii(_.next));
  }
  if (e.outrogroups !== null) {
    for (let t of e.outrogroups) t.pending.size === 0 && (Ni(e, a(t.done)), e.outrogroups?.delete(t));
    e.outrogroups.size === 0 && (e.outrogroups = null);
  }
  if (l !== null || u !== void 0) {
    var te = [];
    if (u !== void 0) for (_ of u) _.f & 8192 || te.push(_);
    for (; l !== null; ) !(l.f & 8192) && l !== e.fallback && te.push(l), (l = Ii(l.next));
    var ne = te.length;
    if (ne > 0) {
      var re = r & 4 && s === 0 ? n : null;
      if (o) {
        for (v = 0; v < ne; v += 1) te[v].nodes?.a?.measure();
        for (v = 0; v < ne; v += 1) te[v].nodes?.a?.fix();
      }
      Mi(e, te, re);
    }
  }
  o &&
    _t(() => {
      if (f !== void 0) for (_ of f) _.nodes?.a?.apply();
    });
}
function Ri(e, t, n, r, i, a, o, s) {
  var c = o & 1 ? (o & 16 ? Tn(n) : Dn(n, !1, !1)) : null,
    l = o & 2 ? Tn(i) : null;
  return {
    v: c,
    i: l,
    e: B(
      () => (
        a(t, c ?? n, l ?? i, s),
        () => {
          e.delete(r);
        }
      ),
    ),
  };
}
function zi(e, t, n) {
  if (e.nodes)
    for (var r = e.nodes.start, i = e.nodes.end, a = t && !(t.f & 33554432) ? t.nodes.start : n; r !== null; ) {
      var o = R(r);
      if ((a.before(r), r === i)) return;
      r = o;
    }
}
function Bi(e, t, n) {
  t === null ? (e.effect.first = n) : (t.next = n), n === null ? (e.effect.last = t) : (n.prev = t);
}
function Vi(e, t, n = !1, r = !1, i = !1, a = !1) {
  var o = e,
    s = ``;
  if (n) {
    var c = e;
    T && (o = O(L(c)));
  }
  fr(() => {
    var e = G;
    if (s === (s = t() ?? ``)) {
      T && Ye();
      return;
    }
    if (n && !T) {
      (e.nodes = null), (c.innerHTML = s), s !== `` && $(L(c), c.lastChild);
      return;
    }
    if ((e.nodes !== null && (yr(e.nodes.start, e.nodes.end), (e.nodes = null)), s !== ``)) {
      if (T) {
        for (var a = D.data, l = Ye(), u = l; l !== null && (l.nodeType !== 8 || l.data !== ``); ) (u = l), (l = R(l));
        if (l === null) throw (Ke(), Be);
        $(D, u), (o = O(l));
        return;
      }
      var d = qn(r ? `svg` : i ? `math` : `template`, r ? He : i ? Ue : void 0);
      d.innerHTML = s;
      var f = r || i ? d : d.content;
      if (($(L(f), f.lastChild), r || i)) for (; L(f); ) o.before(L(f));
      else o.before(f);
    }
  });
}
function Hi(e, t, ...n) {
  var r = new ki(e);
  mr(() => {
    let e = t() ?? null;
    r.ensure(e, e && ((t) => e(t, ...n)));
  }, ne);
}
function Ui(e) {
  return (t, ...n) => {
    var r = e(...n),
      i;
    T ? ((i = D), Ye()) : ((i = L(hi(r.render().trim()))), t.before(i));
    let a = r.setup?.(i);
    $(i, i), typeof a == `function` && ir(a);
  };
}
function Wi(e, t, n) {
  var r;
  T && ((r = D), Ye());
  var i = new ki(e);
  mr(() => {
    var e = t() ?? null;
    if (T && ($e(r) === `[`) != (e !== null)) {
      var a = Qe();
      O(a), (i.anchor = a), E(!1), i.ensure(e, e && ((t) => n(t, e))), E(!0);
      return;
    }
    i.ensure(e, e && ((t) => n(t, e)));
  }, ne);
}
function Gi(e, t) {
  let n = null,
    r = T;
  var i;
  if (T) {
    n = D;
    for (var a = L(document.head); a !== null && (a.nodeType !== 8 || a.data !== e); ) a = R(a);
    if (a === null) E(!1);
    else {
      var o = R(a);
      a.remove(), O(o);
    }
  }
  T || (i = document.head.appendChild(I()));
  try {
    mr(() => {
      var e = B(() => t(i));
      e.f |= re;
    });
  } finally {
    r && (E(!0), O(n));
  }
}
function Ki(e, t, n) {
  lr(() => {
    var r = Q(() => t(e, n?.()) || {});
    if (n && r?.update) {
      var i = !1,
        a = {};
      dr(() => {
        var e = n();
        qr(e), i && tt(a, e) && ((a = e), r.update(e));
      }),
        (i = !0);
    }
    if (r?.destroy) return () => r.destroy();
  });
}
function qi(e, t) {
  var n = void 0,
    r;
  hr(() => {
    n !== (n = t()) &&
      ((r &&= (V(r), null)),
      n &&
        (r = B(() => {
          lr(() => n(e));
        })));
  });
}
function Ji(e) {
  var t,
    n,
    r = ``;
  if (typeof e == `string` || typeof e == `number`) r += e;
  else if (typeof e == `object`)
    if (Array.isArray(e)) {
      var i = e.length;
      for (t = 0; t < i; t++) e[t] && (n = Ji(e[t])) && (r && (r += ` `), (r += n));
    } else for (n in e) e[n] && (r && (r += ` `), (r += n));
  return r;
}
function Yi() {
  for (var e, t, n = 0, r = ``, i = arguments.length; n < i; n++)
    (e = arguments[n]) && (t = Ji(e)) && (r && (r += ` `), (r += t));
  return r;
}
function Xi(e) {
  return typeof e == `object` ? Yi(e) : (e ?? ``);
}
var Zi = [
  ...` 	
\r\f\xA0\v﻿`,
];
function Qi(e, t, n) {
  var r = e == null ? `` : `` + e;
  if ((t && (r = r ? r + ` ` + t : t), n)) {
    for (var i of Object.keys(n))
      if (n[i]) r = r ? r + ` ` + i : i;
      else if (r.length)
        for (var a = i.length, o = 0; (o = r.indexOf(i, o)) >= 0; ) {
          var s = o + a;
          (o === 0 || Zi.includes(r[o - 1])) && (s === r.length || Zi.includes(r[s]))
            ? (r = (o === 0 ? `` : r.substring(0, o)) + r.substring(s + 1))
            : (o = s);
        }
  }
  return r === `` ? null : r;
}
function $i(e, t = !1) {
  var n = t ? ` !important;` : `;`,
    r = ``;
  for (var i of Object.keys(e)) {
    var a = e[i];
    a != null && a !== `` && (r += ` ` + i + `: ` + a + n);
  }
  return r;
}
function ea(e) {
  return e[0] !== `-` || e[1] !== `-` ? e.toLowerCase() : e;
}
function ta(e, t) {
  if (t) {
    var n = ``,
      r,
      i;
    if ((Array.isArray(t) ? ((r = t[0]), (i = t[1])) : (r = t), e)) {
      e = String(e)
        .replaceAll(/\s*\/\*.*?\*\/\s*/g, ``)
        .trim();
      var a = !1,
        o = 0,
        s = !1,
        c = [];
      r && c.push(...Object.keys(r).map(ea)), i && c.push(...Object.keys(i).map(ea));
      var l = 0,
        u = -1;
      let t = e.length;
      for (var d = 0; d < t; d++) {
        var f = e[d];
        if (
          (s
            ? f === `/` && e[d - 1] === `*` && (s = !1)
            : a
              ? a === f && (a = !1)
              : f === `/` && e[d + 1] === `*`
                ? (s = !0)
                : f === `"` || f === `'`
                  ? (a = f)
                  : f === `(`
                    ? o++
                    : f === `)` && o--,
          !s && a === !1 && o === 0)
        ) {
          if (f === `:` && u === -1) u = d;
          else if (f === `;` || d === t - 1) {
            if (u !== -1) {
              var p = ea(e.substring(l, u).trim());
              if (!c.includes(p)) {
                f !== `;` && d++;
                var m = e.substring(l, d).trim();
                n += ` ` + m + `;`;
              }
            }
            (l = d + 1), (u = -1);
          }
        }
      }
    }
    return r && (n += $i(r)), i && (n += $i(i, !0)), (n = n.trim()), n === `` ? null : n;
  }
  return e == null ? null : String(e);
}
function na(e, t, n, r, i, a) {
  var o = e[me];
  if (T || o !== n || o === void 0) {
    var s = Qi(n, r, a);
    (!T || s !== e.getAttribute(`class`)) &&
      (s == null ? e.removeAttribute(`class`) : t ? (e.className = s) : e.setAttribute(`class`, s)),
      (e[me] = n);
  } else if (a && i !== a)
    for (var c in a) {
      var l = !!a[c];
      (i == null || l !== !!i[c]) && e.classList.toggle(c, l);
    }
  return a;
}
function ra(e, t = {}, n, r) {
  for (var i in n) {
    var a = n[i];
    t[i] !== a && (n[i] == null ? e.style.removeProperty(i) : e.style.setProperty(i, a, r));
  }
}
function ia(e, t, n, r) {
  var i = e[he];
  if (T || i !== t) {
    var a = ta(t, r);
    (!T || a !== e.getAttribute(`style`)) && (a == null ? e.removeAttribute(`style`) : (e.style.cssText = a)),
      (e[he] = t);
  } else r && (Array.isArray(r) ? (ra(e, n?.[0], r[0]), ra(e, n?.[1], r[1], `important`)) : ra(e, n, r));
  return r;
}
function aa(e, t, r = !1) {
  if (e.multiple) {
    if (t == null) return;
    if (!n(t)) return qe();
    for (var i of e.options) i.selected = t.includes(ca(i));
    return;
  }
  for (i of e.options)
    if (Fn(ca(i), t)) {
      i.selected = !0;
      return;
    }
  (!r || t !== void 0) && (e.selectedIndex = -1);
}
function oa(e) {
  var t = new MutationObserver(() => {
    aa(e, e.__value);
  });
  t.observe(e, { childList: !0, subtree: !0, attributes: !0, attributeFilter: [`value`] }),
    ir(() => {
      t.disconnect();
    });
}
function sa(e, t, n = t) {
  var r = new WeakSet(),
    i = !0;
  er(e, `change`, (t) => {
    var i = t ? `[selected]` : `:checked`,
      a;
    if (e.multiple) a = [].map.call(e.querySelectorAll(i), ca);
    else {
      var o = e.querySelector(i) ?? e.querySelector(`option:not([disabled])`);
      a = o && ca(o);
    }
    n(a), (e.__value = a), M !== null && r.add(M);
  }),
    lr(() => {
      var a = t();
      if (e === document.activeElement) {
        var o = k ? Lt : M;
        if (r.has(o)) return;
      }
      if ((aa(e, a, i), i && a === void 0)) {
        var s = e.querySelector(`:checked`);
        s !== null && ((a = ca(s)), n(a));
      }
      (e.__value = a), (i = !1);
    }),
    oa(e);
}
function ca(e) {
  return `__value` in e ? e.__value : e.value;
}
var la = Symbol(`class`),
  ua = Symbol(`style`),
  da = Symbol(`is custom element`),
  fa = Symbol(`is html`),
  pa = ye ? `link` : `LINK`,
  ma = ye ? `input` : `INPUT`,
  ha = ye ? `option` : `OPTION`,
  ga = ye ? `select` : `SELECT`,
  _a = ye ? `progress` : `PROGRESS`;
function va(e) {
  if (T) {
    var t = !1,
      n = () => {
        if (!t) {
          if (((t = !0), e.hasAttribute(`value`))) {
            var n = e.value;
            xa(e, `value`, null), (e.value = n);
          }
          if (e.hasAttribute(`checked`)) {
            var r = e.checked;
            xa(e, `checked`, null), (e.checked = r);
          }
        }
      };
    (e[_e] = n), _t(n), Qn();
  }
}
function ya(e, t) {
  var n = wa(e);
  n.value === (n.value = t ?? void 0) || (e.value === t && (t !== 0 || e.nodeName !== _a)) || (e.value = t ?? ``);
}
function ba(e, t) {
  t ? e.hasAttribute(`selected`) || e.setAttribute(`selected`, ``) : e.removeAttribute(`selected`);
}
function xa(e, t, n, r) {
  var i = wa(e);
  (T && ((i[t] = e.getAttribute(t)), t === `src` || t === `srcset` || (t === `href` && e.nodeName === pa))) ||
    (i[t] !== (i[t] = n) &&
      (t === `loading` && (e[fe] = n),
      n == null
        ? e.removeAttribute(t)
        : typeof n != `string` && Ea(e).includes(t)
          ? (e[t] = n)
          : e.setAttribute(t, n)));
}
function Sa(e, t, n, r, i = !1, a = !1) {
  if (T && i && e.nodeName === ma) {
    var o = e;
    (o.type === `checkbox` ? `defaultChecked` : `defaultValue`) in n || va(o);
  }
  var s = wa(e),
    c = s[da],
    l = !s[fa];
  let u = T && c;
  u && E(!1);
  var d = t || {},
    f = e.nodeName === ha;
  for (var p in t) p in n || (n[p] = null);
  n.class ? (n.class = Xi(n.class)) : (r || n[la]) && (n.class = null), n[ua] && (n.style ??= null);
  var m = Ea(e);
  for (let i in n) {
    let o = n[i];
    if (f && i === `value` && o == null) {
      (e.value = e.__value = ``), (d[i] = o);
      continue;
    }
    if (i === `class`) {
      na(e, e.namespaceURI === `http://www.w3.org/1999/xhtml`, o, r, t?.[la], n[la]), (d[i] = o), (d[la] = n[la]);
      continue;
    }
    if (i === `style`) {
      ia(e, o, t?.[ua], n[ua]), (d[i] = o), (d[ua] = n[ua]);
      continue;
    }
    var h = d[i];
    if (!(o === h && !(o === void 0 && e.hasAttribute(i)))) {
      d[i] = o;
      var g = i[0] + i[1];
      if (g !== `$$`)
        if (g === `on`) {
          let t = {},
            n = `$$` + i,
            r = i.slice(2);
          var _ = Zr(r);
          if ((Yr(r) && ((r = r.slice(0, -7)), (t.capture = !0)), !_ && h)) {
            if (o != null) continue;
            e.removeEventListener(r, d[n], t), (d[n] = null);
          }
          if (_) li(r, e, o), ui([r]);
          else if (o != null) {
            function a(e) {
              d[i].call(this, e);
            }
            d[n] = si(r, e, a, t);
          }
        } else if (i === `style`) xa(e, i, o);
        else if (i === `autofocus`) Yn(e, !!o);
        else if (!c && (i === `__value` || (i === `value` && o != null))) e.value = e.__value = o;
        else if (i === `selected` && f) ba(e, o);
        else {
          var v = i;
          l || (v = ei(v));
          var y = v === `defaultValue` || v === `defaultChecked`;
          if (o == null && !c && !y)
            if (((s[i] = null), v === `value` || v === `checked`)) {
              let n = e,
                r = t === void 0;
              if (v === `value`) {
                let e = n.defaultValue;
                n.removeAttribute(v), (n.defaultValue = e), (n.value = n.__value = r ? e : null);
              } else {
                let e = n.defaultChecked;
                n.removeAttribute(v), (n.defaultChecked = e), (n.checked = r ? e : !1);
              }
            } else e.removeAttribute(i);
          else
            y || (m.includes(v) && (c || typeof o != `string`))
              ? ((e[v] = o), v in s && (s[v] = w))
              : typeof o != `function` && xa(e, v, o, a);
        }
    }
  }
  return u && E(!0), d;
}
function Ca(e, t, n = [], r = [], i = [], a, o = !1, s = !1) {
  sn(i, n, r, (n) => {
    var r = void 0,
      i = {},
      c = e.nodeName === ga,
      l = !1;
    if (
      (hr(() => {
        var u = t(...n.map(Z)),
          d = Sa(e, r, u, a, o, s);
        l && c && `value` in u && aa(e, u.value);
        for (let e of Object.getOwnPropertySymbols(i)) u[e] || V(i[e]);
        for (let t of Object.getOwnPropertySymbols(u)) {
          var f = u[t];
          t.description === `@attach` && (!r || f !== r[t]) && (i[t] && V(i[t]), (i[t] = B(() => qi(e, () => f)))),
            (d[t] = f);
        }
        r = d;
      }),
      c)
    ) {
      var u = e;
      lr(() => {
        aa(u, r.value, !0), oa(u);
      });
    }
    l = !0;
  });
}
function wa(e) {
  return (e[pe] ??= { [da]: e.nodeName.includes(`-`), [fa]: e.namespaceURI === Ve });
}
var Ta = new Map();
function Ea(e) {
  var t = e.getAttribute(`is`) || e.nodeName,
    n = Ta.get(t);
  if (n) return n;
  Ta.set(t, (n = []));
  for (var r, i = e, a = Element.prototype; a !== i; ) {
    for (var o in ((r = c(i)), r))
      r[o].set && o !== `innerHTML` && o !== `textContent` && o !== `innerText` && n.push(o);
    i = d(i);
  }
  return n;
}
function Da(e, t, n = t) {
  var r = new WeakSet();
  er(e, `input`, async (i) => {
    var a = i ? e.defaultValue : e.value;
    if (((a = ka(e) ? Aa(a) : a), n(a), M !== null && r.add(M), await Ur(), a !== (a = t()))) {
      var o = e.selectionStart,
        s = e.selectionEnd,
        c = e.value.length;
      if (((e.value = a ?? ``), s !== null)) {
        var l = e.value.length;
        o === s && s === c && l > c
          ? ((e.selectionStart = l), (e.selectionEnd = l))
          : ((e.selectionStart = o), (e.selectionEnd = Math.min(s, l)));
      }
    }
  }),
    ((T && e.defaultValue !== e.value) || (Q(t) == null && e.value)) &&
      (n(ka(e) ? Aa(e.value) : e.value), M !== null && r.add(M)),
    dr(() => {
      var n = t();
      if (e === document.activeElement) {
        var i = k ? Lt : M;
        if (r.has(i)) return;
      }
      (ka(e) && n === Aa(e.value)) || (e.type === `date` && !n && !e.value) || (n !== e.value && (e.value = n ?? ``));
    });
}
function Oa(e, t, n = t) {
  er(e, `change`, (t) => {
    n(t ? e.defaultChecked : e.checked);
  }),
    ((T && e.defaultChecked !== e.checked) || Q(t) == null) && n(e.checked),
    dr(() => {
      e.checked = !!t();
    });
}
function ka(e) {
  var t = e.type;
  return t === `number` || t === `range`;
}
function Aa(e) {
  return e === `` ? null : +e;
}
function ja(e, t) {
  return e === t || e?.[C] === t;
}
function Ma(e = {}, t, n, r) {
  var i = A.r,
    a = G;
  return (
    lr(() => {
      var o, s;
      return (
        dr(() => {
          (o = s),
            (s = r?.() || []),
            Q(() => {
              ja(n(...s), e) || (t(e, ...s), o && ja(n(...o), e) && t(null, ...o));
            });
        }),
        () => {
          let r = a;
          for (; r !== i && r.parent !== null && r.parent.f & 33554432; ) r = r.parent;
          let o = () => {
              s && ja(n(...s), e) && t(null, ...s);
            },
            c = r.teardown;
          r.teardown = () => {
            o(), c?.();
          };
        }
      );
    }),
    e
  );
}
var Na = {
  get(e, t) {
    let n = e.props.length;
    for (; n--; ) {
      let r = e.props[n];
      if ((p(r) && (r = r()), typeof r == `object` && r && t in r)) return r[t];
    }
  },
  set(e, t, n) {
    let r = e.props.length;
    for (; r--; ) {
      let i = e.props[r];
      p(i) && (i = i());
      let a = s(i, t);
      if (a && a.set) return a.set(n), !0;
    }
    return !1;
  },
  getOwnPropertyDescriptor(e, t) {
    let n = e.props.length;
    for (; n--; ) {
      let r = e.props[n];
      if ((p(r) && (r = r()), typeof r == `object` && r && t in r)) {
        let e = s(r, t);
        return e && !e.configurable && (e.configurable = !0), e;
      }
    }
  },
  has(e, t) {
    if (t === C || t === de) return !1;
    for (let n of e.props) if ((p(n) && (n = n()), n != null && t in n)) return !0;
    return !1;
  },
  ownKeys(e) {
    let t = [];
    for (let n of e.props)
      if ((p(n) && (n = n()), n)) {
        for (let e in n) t.includes(e) || t.push(e);
        for (let e of Object.getOwnPropertySymbols(n)) t.includes(e) || t.push(e);
      }
    return t;
  },
};
function Pa(...e) {
  return new Proxy({ props: e }, Na);
}
function Fa(e, t, n, r) {
  var i = !rt || (n & 2) != 0,
    a = (n & 8) != 0,
    o = (n & 16) != 0,
    c = r,
    l = !0,
    u = void 0,
    d = () => (o && i ? ((u ??= dn(r)), Z(u)) : (l && ((l = !1), (c = o ? Q(r) : r)), c));
  let f;
  if (a) {
    var p = C in e || de in e;
    f = s(e, t)?.set ?? (p && t in e ? (n) => (e[t] = n) : void 0);
  }
  var m,
    h = !1;
  a ? ([m, h] = Pt(() => e[t])) : (m = e[t]), m === void 0 && r !== void 0 && ((m = d()), f && (i && Pe(t), f(m)));
  var g = i
    ? () => {
        var n = e[t];
        return n === void 0 ? d() : ((l = !0), n);
      }
    : () => {
        var n = e[t];
        return n !== void 0 && (c = void 0), n === void 0 ? c : n;
      };
  if (i && !(n & 4)) return g;
  if (f) {
    var _ = e.$$legacy;
    return function (e, t) {
      return arguments.length > 0 ? ((!i || !t || _ || h) && f(t ? g() : e), e) : g();
    };
  }
  var v = !1,
    y = (n & 1 ? dn : hn)(() => ((v = !1), g()));
  a && Z(y);
  var b = G;
  return function (e, t) {
    if (arguments.length > 0) {
      let n = t ? Z(y) : i && a ? Nn(e) : e;
      return F(y, n), (v = !0), c !== void 0 && (c = n), e;
    }
    return (Or && v) || b.f & 16384 ? y.v : Z(y);
  };
}
function Ia(e) {
  return class extends La {
    constructor(t) {
      super({ component: e, ...t });
    }
  };
}
var La = class {
  #e;
  #t;
  constructor(e) {
    var t = new Map(),
      n = (e, n) => {
        var r = Dn(n, !1, !1);
        return t.set(e, r), r;
      };
    let r = new Proxy(
      { ...(e.props || {}), $$events: {} },
      {
        get(e, r) {
          return Z(t.get(r) ?? n(r, Reflect.get(e, r)));
        },
        has(e, r) {
          return r === de ? !0 : (Z(t.get(r) ?? n(r, Reflect.get(e, r))), Reflect.has(e, r));
        },
        set(e, r, i) {
          return F(t.get(r) ?? n(r, i), i), Reflect.set(e, r, i);
        },
      },
    );
    (this.#t = (e.hydrate ? wi : Ci)(e.component, {
      target: e.target,
      anchor: e.anchor,
      props: r,
      context: e.context,
      intro: e.intro ?? !1,
      recover: e.recover,
      transformError: e.transformError,
    })),
      !k && (!e?.props?.$$host || e.sync === !1) && Kt(),
      (this.#e = r.$$events);
    for (let e of Object.keys(this.#t))
      e === `$set` ||
        e === `$destroy` ||
        e === `$on` ||
        o(this, e, {
          get() {
            return this.#t[e];
          },
          set(t) {
            this.#t[e] = t;
          },
          enumerable: !0,
        });
    (this.#t.$set = (e) => {
      Object.assign(r, e);
    }),
      (this.#t.$destroy = () => {
        Oi(this.#t);
      });
  }
  $set(e) {
    this.#t.$set(e);
  }
  $on(e, t) {
    this.#e[e] = this.#e[e] || [];
    let n = (...e) => t.call(this, ...e);
    return (
      this.#e[e].push(n),
      () => {
        this.#e[e] = this.#e[e].filter((e) => e !== n);
      }
    );
  }
  $destroy() {
    this.#t.$destroy();
  }
};
function Ra(e, t) {
  if ((k || be(`hydratable`), T)) {
    let t = window.__svelte?.h;
    if (t?.has(e)) return t.get(e);
    Ge(e);
  }
  return t();
}
var za = t({
  afterUpdate: () => Ka,
  beforeUpdate: () => Ga,
  createContext: () => at,
  createEventDispatcher: () => Wa,
  createRawSnippet: () => Ui,
  flushSync: () => Kt,
  fork: () => tn,
  getAbortSignal: () => Ba,
  getAllContexts: () => lt,
  getContext: () => ot,
  hasContext: () => ct,
  hydratable: () => Ra,
  hydrate: () => wi,
  mount: () => Ci,
  onDestroy: () => Ha,
  onMount: () => Va,
  setContext: () => st,
  settled: () => Wr,
  tick: () => Ur,
  unmount: () => Oi,
  untrack: () => Q,
});
function Ba() {
  return H === null && je(), (H.ac ??= new AbortController()).signal;
}
function Va(e) {
  A === null && xe(`onMount`),
    rt && A.l !== null
      ? qa(A).m.push(e)
      : ar(() => {
          let t = Q(e);
          if (typeof t == `function`) return t;
        });
}
function Ha(e) {
  A === null && xe(`onDestroy`), Va(() => () => Q(e));
}
function Ua(e, t, { bubbles: n = !1, cancelable: r = !1 } = {}) {
  return new CustomEvent(e, { detail: t, bubbles: n, cancelable: r });
}
function Wa() {
  let e = A;
  return (
    e === null && xe(`createEventDispatcher`),
    (t, r, i) => {
      let a = e.s.$$events?.[t];
      if (a) {
        let o = n(a) ? a.slice() : [a],
          s = Ua(t, r, i);
        for (let t of o) t.call(e.x, s);
        return !s.defaultPrevented;
      }
      return !0;
    }
  );
}
function Ga(e) {
  A === null && xe(`beforeUpdate`), A.l === null && Ne(`beforeUpdate`), qa(A).b.push(e);
}
function Ka(e) {
  A === null && xe(`afterUpdate`), A.l === null && Ne(`afterUpdate`), qa(A).a.push(e);
}
function qa(e) {
  var t = e.l;
  return (t.u ??= { a: [], b: [], m: [] });
}
export {
  F as $,
  vi as A,
  pr as B,
  Fi as C,
  xi as D,
  Si as E,
  oi as F,
  Yn as G,
  fr as H,
  Z as I,
  In as J,
  Xn as K,
  Wr as L,
  ui as M,
  li as N,
  bi as O,
  ci as P,
  Nn as Q,
  Ur as R,
  Vi as S,
  Ai as T,
  ar as U,
  lr as V,
  sr as W,
  Un as X,
  Hn as Y,
  Wn as Z,
  Xi as _,
  Pa as a,
  Dt as at,
  Wi as b,
  Da as c,
  ut as ct,
  va as d,
  Xe as dt,
  En as et,
  xa as f,
  m as ft,
  na as g,
  ia as h,
  Fa as i,
  Mt as it,
  yi as j,
  gi as k,
  la as l,
  st as lt,
  sa as m,
  Va as n,
  mn as nt,
  Ma as o,
  ot,
  ya as p,
  t as pt,
  Ln as q,
  Ia as r,
  Nt as rt,
  Oa as s,
  dt as st,
  za as t,
  An as tt,
  Ca as u,
  Ze as ut,
  Ki as v,
  ji as w,
  Hi as x,
  Gi as y,
  Q as z,
};
