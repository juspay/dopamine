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
  return O(z(D));
}
function Xe(e) {
  if (T) {
    if (z(D) !== null) throw (Ke(), Be);
    D = e;
  }
}
function Ze(e = 1) {
  if (T) {
    for (var t = e, n = D; t--; ) n = z(n);
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
    var i = z(n);
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
    var r = K.f;
    (!U && r & 32 && !A.i) || Fe();
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
  A = { p: A, i: !1, c: null, e: null, s: e, x: null, r: K, l: rt && !t ? { s: null, u: null, $: [] } : null };
}
function dt(e) {
  var t = A,
    n = t.e;
  if (n !== null) {
    t.e = null;
    for (var r of n) ir(r);
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
function j(e) {
  if (ht.length === 0 && !Rt) {
    var t = ht;
    queueMicrotask(() => {
      t === ht && gt();
    });
  }
  ht.push(e);
}
function _t() {
  for (; ht.length > 0; ) gt();
}
function vt(e) {
  var t = K;
  if (t === null) return (U.f |= ue), e;
  if (!(t.f & 32768) && !(t.f & 4)) throw e;
  yt(e, t);
}
function yt(e, t) {
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
var bt = ~(y | b | v);
function M(e, t) {
  e.f = (e.f & bt) | t;
}
function xt(e) {
  e.f & 512 || e.deps === null ? M(e, v) : M(e, b);
}
function St(e) {
  if (e !== null) for (let t of e) !(t.f & 2) || !(t.f & 65536) || ((t.f ^= se), St(t.deps));
}
function Ct(e, t, n) {
  e.f & 2048 ? t.add(e) : e.f & 4096 && n.add(e), St(e.deps), M(e, v);
}
function wt(e, t, n) {
  if (e == null) return t(void 0), n && n(void 0), m;
  let r = Gr(() => e.subscribe(t, n));
  return r.unsubscribe ? () => r.unsubscribe() : r;
}
var Tt = [];
function Et(e, t = m) {
  let n = null,
    r = new Set();
  function i(t) {
    if (tt(e, t) && ((e = t), n)) {
      let t = !Tt.length;
      for (let t of r) t[1](), Tt.push(t, e);
      if (t) {
        for (let e = 0; e < Tt.length; e += 2) Tt[e][0](Tt[e + 1]);
        Tt.length = 0;
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
function Dt(e) {
  let t;
  return wt(e, (e) => (t = e))(), t;
}
var Ot = !1,
  kt = !1,
  At = Symbol(`unmounted`);
function jt(e, t, n) {
  let r = (n[t] ??= { store: null, source: En(void 0), unsubscribe: m });
  if (r.store !== e && !(At in n))
    if ((r.unsubscribe(), (r.store = e ?? null), e == null)) (r.source.v = void 0), (r.unsubscribe = m);
    else {
      var i = !0;
      (r.unsubscribe = wt(e, (e) => {
        i ? (r.source.v = e) : I(r.source, e);
      })),
        (i = !1);
    }
  return e && At in n ? Dt(e) : Q(r.source);
}
function Mt() {
  let e = {};
  function t() {
    nr(() => {
      for (var t in e) e[t].unsubscribe();
      o(e, At, { enumerable: !1, value: !0 });
    });
  }
  return [e, t];
}
function Nt(e) {
  var t = kt;
  try {
    return (kt = !1), [e(), kt];
  } finally {
    kt = t;
  }
}
var Pt = null,
  Ft = null,
  N = null,
  It = null,
  P = null,
  Lt = null,
  Rt = !1,
  zt = !1,
  Bt = null,
  Vt = null,
  Ht = 0,
  Ut = 1,
  Wt = class e {
    id = Ut++;
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
      Ft === null ? (Pt = Ft = this) : ((Ft.#n = this), (this.#t = Ft)), (Ft = this);
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
        for (var r of n.d) M(r, y), t(r);
        for (r of n.m) M(r, b), t(r);
      }
      this.#m.add(e);
    }
    #_() {
      (this.#e = !0), Ht++ > 1e3 && (this.#C(), Kt());
      for (let e of this.#d) this.#f.delete(e), M(e, y), this.schedule(e);
      for (let e of this.#f) M(e, b), this.schedule(e);
      let t = this.#l;
      (this.#l = []), this.apply();
      var n = (Bt = []),
        r = [],
        i = (Vt = []);
      for (let e of t)
        try {
          this.#v(e, n, r);
        } catch (t) {
          throw ($t(e), this.#g() || this.discard(), t);
        }
      if (((N = null), i.length > 0)) {
        var a = e.ensure();
        for (let e of i) a.schedule(e);
      }
      if (((Bt = null), (Vt = null), this.#g())) {
        this.#x(r), this.#x(n);
        for (let [e, t] of this.#p) Qt(e, t);
        i.length > 0 && N.#_();
        return;
      }
      let o = this.#y();
      if (o) {
        this.#x(r), this.#x(n), o.#b(this);
        return;
      }
      this.#d.clear(), this.#f.clear();
      for (let e of this.#r) e(this);
      this.#r.clear(), (It = this), qt(r), qt(n), (It = null), this.#c?.resolve();
      var s = N;
      if (
        (this.#o === 0 && (this.#l.length === 0 || s !== null) && (this.#C(), k && (this.#S(), (N = s))),
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
                : Fr(r) && (i & 16 && this.#f.add(r), Br(r));
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
              r & 4194320 && !this.async_deriveds.has(i) && (this.#f.delete(i), M(i, y), this.schedule(i));
            }
          }
      };
      for (let e of this.current.keys()) t(e);
      this.oncommit(() => e.discard()), e.#C(), (N = this), this.#_();
    }
    #x(e) {
      for (var t = 0; t < e.length; t += 1) Ct(e[t], this.#d, this.#f);
    }
    capture(e, t, n = !1) {
      e.v !== w && !this.previous.has(e) && this.previous.set(e, e.v),
        e.f & 8388608 || (this.current.set(e, [t, n]), P?.set(e, t)),
        this.is_fork || (e.v = t);
    }
    activate() {
      N = this;
    }
    deactivate() {
      (N = null), (P = null);
    }
    flush() {
      try {
        (zt = !0), (N = this), this.#_();
      } finally {
        (Ht = 0), (Lt = null), (Bt = null), (Vt = null), (zt = !1), (N = null), (P = null), xn.clear();
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
      for (let l = Pt; l !== null; l = l.#n) {
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
            for (var o of t) Jt(o, r, i, a);
            a = new Map();
            var s = [...l.current]
              .filter(([e, t]) => {
                let n = this.current.get(e);
                return n ? n[0] !== t[0] || n[1] !== t[1] : !0;
              })
              .map(([e]) => e);
            if (s.length > 0)
              for (let e of this.#u)
                !(e.f & 155648) && Xt(e, s, a) && (e.f & 4194320 ? (M(e, y), l.schedule(e)) : l.#d.add(e));
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
        j(() => {
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
      if (N === null) {
        let t = (N = new e());
        !zt &&
          !Rt &&
          j(() => {
            t.#e || t.flush();
          });
      }
      return N;
    }
    apply() {
      if (!k || (!this.is_fork && this.#t === null && this.#n === null)) {
        P = null;
        return;
      }
      P = new Map();
      for (let [e, [t]] of this.current) P.set(e, t);
      for (let t = Pt; t !== null; t = t.#n)
        if (!(t === this || t.is_fork)) {
          var e = !1;
          if (t.id < this.id) {
            for (let [n, [, r]] of t.current)
              if (!r && this.current.has(n)) {
                e = !0;
                break;
              }
          }
          if (!e) for (let [e, n] of t.previous) P.has(e) || P.set(e, n);
        }
    }
    schedule(e) {
      if (((Lt = e), e.b?.is_pending && e.f & 16777228 && !(e.f & 32768))) {
        e.b.defer_effect(e);
        return;
      }
      for (var t = e; t.parent !== null; ) {
        t = t.parent;
        var n = t.f;
        if (Bt !== null && t === K && (k || ((U === null || !(U.f & 2)) && !Ot))) return;
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
        e === null ? (Pt = t) : (e.#n = t), t === null ? (Ft = e) : (t.#t = e), (this.linked = !1);
      }
    }
  };
function Gt(e) {
  var t = Rt;
  Rt = !0;
  try {
    var n;
    for (e && (N !== null && !N.is_fork && N.flush(), (n = e())); ; ) {
      if ((_t(), N === null)) return n;
      N.flush();
    }
  } finally {
    Rt = t;
  }
}
function Kt() {
  try {
    Oe();
  } catch (e) {
    yt(e, Lt);
  }
}
var F = null;
function qt(e) {
  var t = e.length;
  if (t !== 0) {
    for (var n = 0; n < t; ) {
      var r = e[n++];
      if (
        !(r.f & 24576) &&
        Fr(r) &&
        ((F = new Set()),
        Br(r),
        r.deps === null && r.first === null && r.nodes === null && r.teardown === null && r.ac === null && vr(r),
        F?.size > 0)
      ) {
        xn.clear();
        for (let e of F) {
          if (e.f & 24576) continue;
          let t = [e],
            n = e.parent;
          for (; n !== null; ) F.has(n) && (F.delete(n), t.push(n)), (n = n.parent);
          for (let e = t.length - 1; e >= 0; e--) {
            let n = t[e];
            n.f & 24576 || Br(n);
          }
        }
        F.clear();
      }
    }
    F = null;
  }
}
function Jt(e, t, n, r) {
  if (!n.has(e) && (n.add(e), e.reactions !== null))
    for (let i of e.reactions) {
      let e = i.f;
      e & 2 ? Jt(i, t, n, r) : e & 4194320 && !(e & 2048) && Xt(i, t, r) && (M(i, y), Zt(i));
    }
}
function Yt(e, t) {
  if (e.reactions !== null)
    for (let n of e.reactions) {
      let e = n.f;
      e & 2 ? Yt(n, t) : e & 131072 && (M(n, y), t.add(n));
    }
}
function Xt(e, t, n) {
  let r = n.get(e);
  if (r !== void 0) return r;
  if (e.deps !== null)
    for (let r of e.deps) {
      if (i.call(t, r)) return !0;
      if (r.f & 2 && Xt(r, t, n)) return n.set(r, !0), !0;
    }
  return n.set(e, !1), !1;
}
function Zt(e) {
  N.schedule(e);
}
function Qt(e, t) {
  if (!(e.f & 32 && e.f & 1024)) {
    e.f & 2048 ? t.d.push(e) : e.f & 4096 && t.m.push(e), M(e, v);
    for (var n = e.first; n !== null; ) Qt(n, t), (n = n.next);
  }
}
function $t(e) {
  M(e, v);
  for (var t = e.first; t !== null; ) $t(t), (t = t.next);
}
function en(e) {
  k || be(`fork`), N !== null && Ae();
  var t = Wt.ensure();
  (t.is_fork = !0), (P = new Map());
  var n = !1,
    r = t.settled();
  return (
    Gt(e),
    {
      commit: async () => {
        if (n) {
          await r;
          return;
        }
        t.linked || ke(), (n = !0), (t.is_fork = !1);
        for (var [e, [i]] of t.current) (e.v = i), (e.wv = Pr());
        t.activate(),
          t.run_fork_commit_callbacks(),
          t.deactivate(),
          Gt(() => {
            var e = new Set();
            for (var n of t.current.keys()) Yt(n, e);
            Sn(e), On();
          }),
          t.flush(),
          await r;
      },
      discard: () => {
        for (var e of t.current.keys()) e.wv = Pr();
        !n && t.linked && t.discard();
      },
    }
  );
}
function tn(e) {
  let t = 0,
    n = wn(0),
    r;
  return () => {
    tr() &&
      (Q(n),
      lr(
        () => (
          t === 0 && (r = Gr(() => e(() => kn(n)))),
          (t += 1),
          () => {
            j(() => {
              --t, t === 0 && (r?.(), (r = void 0), kn(n));
            });
          }
        ),
      ));
  };
}
var nn = ne | ie;
function rn(e, t, n, r) {
  new an(e, t, n, r);
}
var an = class {
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
  #h = tn(
    () => (
      (this.#m = wn(this.#l)),
      () => {
        this.#m = null;
      }
    ),
  );
  constructor(e, t, n, r) {
    (this.#e = e),
      (this.#n = t),
      (this.#r = (e) => {
        var t = K;
        (t.b = this), (t.f |= 128), n(e);
      }),
      (this.parent = K.b),
      (this.transform_error = r ?? this.parent?.transform_error ?? ((e) => e)),
      (this.#i = fr(() => {
        if (T) {
          let e = this.#t;
          Ye();
          let t = e.data === `[!`;
          if (e.data.startsWith(`[?`)) {
            let t = JSON.parse(e.data.slice(2));
            this.#_(t);
          } else t ? this.#v() : this.#g();
        } else this.#y();
      }, nn)),
      T && (this.#e = D);
  }
  #g() {
    try {
      this.#a = V(() => this.#r(this.#e));
    } catch (e) {
      this.error(e);
    }
  }
  #_(e) {
    let t = this.#n.failed;
    t &&
      (this.#s = V(() => {
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
      (this.#o = V(() => e(this.#e))),
      j(() => {
        var e = (this.#c = document.createDocumentFragment()),
          t = L();
        e.append(t),
          (this.#a = this.#x(() => V(() => this.#r(t)))),
          this.#u === 0 &&
            (this.#e.before(e),
            (this.#c = null),
            yr(this.#o, () => {
              this.#o = null;
            }),
            this.#b(N));
      }));
  }
  #y() {
    try {
      if (
        ((this.is_pending = this.has_pending_snippet()),
        (this.#u = 0),
        (this.#l = 0),
        (this.#a = V(() => {
          this.#r(this.#e);
        })),
        this.#u > 0)
      ) {
        var e = (this.#c = document.createDocumentFragment());
        Cr(this.#a, e);
        let t = this.#n.pending;
        this.#o = V(() => t(this.#e));
      } else this.#b(N);
    } catch (e) {
      this.error(e);
    }
  }
  #b(e) {
    (this.is_pending = !1), e.transfer_effects(this.#f, this.#p);
  }
  defer_effect(e) {
    Ct(e, this.#f, this.#p);
  }
  is_rendered() {
    return !this.is_pending && (!this.parent || this.parent.is_rendered());
  }
  has_pending_snippet() {
    return !!this.#n.pending;
  }
  #x(e) {
    var t = K,
      n = U,
      r = A;
    q(this.#i), G(this.#i), it(this.#i.ctx);
    try {
      return Wt.ensure(), e();
    } catch (e) {
      return vt(e), null;
    } finally {
      q(t), G(n), it(r);
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
          yr(this.#o, () => {
            this.#o = null;
          }),
        (this.#c &&= (this.#e.before(this.#c), null)));
  }
  update_pending_count(e, t) {
    this.#S(e, t),
      (this.#l += e),
      !(!this.#m || this.#d) &&
        ((this.#d = !0),
        j(() => {
          (this.#d = !1), this.#m && Dn(this.#m, this.#l);
        }));
  }
  get_effect_pending() {
    return this.#h(), Q(this.#m);
  }
  error(e) {
    if (!this.#n.onerror && !this.#n.failed) throw e;
    N?.is_fork
      ? (this.#a && N.skip_effect(this.#a),
        this.#o && N.skip_effect(this.#o),
        this.#s && N.skip_effect(this.#s),
        N.on_fork_commit(() => {
          this.#C(e);
        }))
      : this.#C(e);
  }
  #C(e) {
    (this.#a &&= (H(this.#a), null)),
      (this.#o &&= (H(this.#o), null)),
      (this.#s &&= (H(this.#s), null)),
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
            yr(this.#s, () => {
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
          yt(e, this.#i && this.#i.parent);
        }
        n &&
          (this.#s = this.#x(() => {
            try {
              return V(() => {
                var t = K;
                (t.b = this),
                  (t.f |= 128),
                  n(
                    this.#e,
                    () => e,
                    () => a,
                  );
              });
            } catch (e) {
              return yt(e, this.#i.parent), null;
            }
          }));
      };
    j(() => {
      var t;
      try {
        t = this.transform_error(e);
      } catch (e) {
        yt(e, this.#i && this.#i.parent);
        return;
      }
      typeof t == `object` && t && typeof t.then == `function`
        ? t.then(o, (e) => yt(e, this.#i && this.#i.parent))
        : o(t);
    });
  }
};
function on(e, t, n, r) {
  let i = ft() ? un : mn;
  var a = e.filter((e) => !e.settled);
  if (n.length === 0 && a.length === 0) {
    r(t.map(i));
    return;
  }
  var o = K,
    s = sn(),
    c = a.length === 1 ? a[0].promise : a.length > 1 ? Promise.all(a.map((e) => e.promise)) : null;
  function l(e) {
    if (!(o.f & 16384)) {
      s();
      try {
        r(e);
      } catch (e) {
        yt(e, o);
      }
      cn();
    }
  }
  var u = ln();
  if (n.length === 0) {
    c.then(() => l(t.map(i))).finally(u);
    return;
  }
  function d() {
    Promise.all(n.map((e) => fn(e)))
      .then((e) => l([...t.map(i), ...e]))
      .catch((e) => yt(e, o))
      .finally(u);
  }
  c
    ? c.then(() => {
        s(), d(), cn();
      })
    : d();
}
function sn() {
  var e = K,
    t = U,
    n = A,
    r = N;
  return function (i = !0) {
    q(e), G(t), it(n), i && !(e.f & 16384) && (r?.activate(), r?.apply());
  };
}
function cn(e = !0) {
  q(null), G(null), it(null), e && N?.deactivate();
}
function ln() {
  var e = K,
    t = e.b,
    n = N,
    r = !!t?.is_rendered();
  return (
    t?.update_pending_count(1, n),
    n.increment(r, e),
    () => {
      t?.update_pending_count(-1, n), n.decrement(r, e);
    }
  );
}
function un(e) {
  var t = 2 | y;
  return (
    K !== null && (K.f |= ie),
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
      parent: K,
      ac: null,
    }
  );
}
var dn = Symbol(`obsolete`);
function fn(e, t, n) {
  let r = K;
  r === null && Ce();
  var i = void 0,
    a = wn(w),
    o = !U,
    s = new Set();
  return (
    cr(() => {
      var t = K,
        n = g();
      i = n.promise;
      try {
        Promise.resolve(e())
          .then(n.resolve, (e) => {
            e !== ve && n.reject(e);
          })
          .finally(cn);
      } catch (e) {
        n.reject(e), cn();
      }
      var c = N;
      if (o) {
        if (t.f & 32768) var l = ln();
        if (r.b?.is_rendered()) c.async_deriveds.get(t)?.reject(dn);
        else for (let e of s.values()) e.reject(dn);
        s.add(n), c.async_deriveds.set(t, n);
      }
      let u = (e, t = void 0) => {
        l?.(),
          s.delete(n),
          t !== dn &&
            (c.activate(), t ? ((a.f |= ue), Dn(a, t)) : (a.f & 8388608 && (a.f ^= ue), Dn(a, e)), c.deactivate());
      };
      n.promise.then(u, (e) => u(null, e || `unknown`));
    }),
    nr(() => {
      for (let e of s) e.reject(dn);
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
function pn(e) {
  let t = un(e);
  return k || Or(t), t;
}
function mn(e) {
  let t = un(e);
  return (t.equals = nt), t;
}
function hn(e) {
  var t = e.effects;
  if (t !== null) {
    e.effects = null;
    for (var n = 0; n < t.length; n += 1) H(t[n]);
  }
}
function gn(e) {
  var t,
    n = K,
    r = e.parent;
  if (!Er && r !== null && e.v !== w && r.f & 24576) return We(), e.v;
  q(r);
  try {
    (e.f &= ~se), hn(e), (t = Lr(e));
  } finally {
    q(n);
  }
  return t;
}
function _n(e) {
  var t = gn(e);
  if (
    !e.equals(t) &&
    ((e.wv = Pr()),
    (!N?.is_fork || e.deps === null) &&
      (N === null ? (e.v = t) : (N.capture(e, t, !0), It?.capture(e, t, !0)), e.deps === null))
  ) {
    M(e, v);
    return;
  }
  Er || (P === null ? xt(e) : (tr() || N?.is_fork) && P.set(e, t));
}
function vn(e) {
  if (e.effects !== null)
    for (let t of e.effects)
      (t.teardown || t.ac) &&
        (t.teardown?.(), t.ac?.abort(ve), t.fn !== null && (t.teardown = m), (t.ac = null), zr(t, 0), hr(t));
}
function yn(e) {
  if (e.effects !== null) for (let t of e.effects) t.teardown && t.fn !== null && Br(t);
}
var bn = new Set(),
  xn = new Map();
function Sn(e) {
  bn = e;
}
var Cn = !1;
function wn(e, t) {
  return { f: 0, v: e, reactions: null, equals: et, rv: 0, wv: 0 };
}
function Tn(e, t) {
  let n = wn(e, t);
  return Or(n), n;
}
function En(e, t = !1, n = !0) {
  let r = wn(e);
  return t || (r.equals = nt), rt && n && A !== null && A.l !== null && (A.l.s ??= []).push(r), r;
}
function I(e, t, n = !1) {
  return (
    U !== null && (!W || U.f & 131072) && ft() && U.f & 4325394 && (J === null || !i.call(J, e)) && Re(),
    Dn(e, n ? jn(t) : t, Vt)
  );
}
function Dn(e, t, n = null) {
  if (!e.equals(t)) {
    xn.set(e, Er ? t : e.v);
    var r = Wt.ensure();
    if ((r.capture(e, t), e.f & 2)) {
      let t = e;
      e.f & 2048 && gn(t), P === null && xt(t);
    }
    (e.wv = Pr()),
      An(e, y, n),
      ft() && K !== null && K.f & 1024 && !(K.f & 96) && (Z === null ? kr([e]) : Z.push(e)),
      !r.is_fork && bn.size > 0 && !Cn && On();
  }
  return t;
}
function On() {
  Cn = !1;
  for (let e of bn) {
    e.f & 1024 && M(e, b);
    let t;
    try {
      t = Fr(e);
    } catch {
      t = !0;
    }
    t && Br(e);
  }
  bn.clear();
}
function kn(e) {
  I(e, e.v + 1);
}
function An(e, t, n) {
  var r = e.reactions;
  if (r !== null)
    for (var i = ft(), a = r.length, o = 0; o < a; o++) {
      var s = r[o],
        c = s.f;
      if (!(!i && s === K)) {
        var l = (c & y) === 0;
        if ((l && M(s, t), c & 131072)) bn.add(s);
        else if (c & 2) {
          var u = s;
          P?.delete(u), c & 65536 || (c & 512 && (K === null || !(K.f & 2097152)) && (s.f |= se), An(u, b, n));
        } else if (l) {
          var d = s;
          c & 16 && F !== null && F.add(d), n === null ? Zt(d) : n.push(d);
        }
      }
    }
}
function jn(e) {
  if (typeof e != `object` || !e || C in e) return e;
  let t = d(e);
  if (t !== l && t !== u) return e;
  var r = new Map(),
    i = n(e),
    a = Tn(0),
    o = null,
    c = Mr,
    f = (e) => {
      if (Mr === c) return e();
      var t = U,
        n = Mr;
      G(null), Nr(c);
      var r = e();
      return G(t), Nr(n), r;
    };
  return (
    i && r.set(`length`, Tn(e.length, o)),
    new Proxy(e, {
      defineProperty(e, t, n) {
        (!(`value` in n) || n.configurable === !1 || n.enumerable === !1 || n.writable === !1) && Ie();
        var i = r.get(t);
        return (
          i === void 0
            ? f(() => {
                var e = Tn(n.value, o);
                return r.set(t, e), e;
              })
            : I(i, n.value, !0),
          !0
        );
      },
      deleteProperty(e, t) {
        var n = r.get(t);
        if (n === void 0) {
          if (t in e) {
            let e = f(() => Tn(w, o));
            r.set(t, e), kn(a);
          }
        } else I(n, w), kn(a);
        return !0;
      },
      get(t, n, i) {
        if (n === C) return e;
        var a = r.get(n),
          c = n in t;
        if (
          (a === void 0 && (!c || s(t, n)?.writable) && ((a = f(() => Tn(jn(c ? t[n] : w), o))), r.set(n, a)),
          a !== void 0)
        ) {
          var l = Q(a);
          return l === w ? void 0 : l;
        }
        return Reflect.get(t, n, i);
      },
      getOwnPropertyDescriptor(e, t) {
        var n = Reflect.getOwnPropertyDescriptor(e, t);
        if (n && `value` in n) {
          var i = r.get(t);
          i && (n.value = Q(i));
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
        return (n !== void 0 || (K !== null && (!i || s(e, t)?.writable))) &&
          (n === void 0 && ((n = f(() => Tn(i ? jn(e[t]) : w, o))), r.set(t, n)), Q(n) === w)
          ? !1
          : i;
      },
      set(e, t, n, c) {
        var l = r.get(t),
          u = t in e;
        if (i && t === `length`)
          for (var d = n; d < l.v; d += 1) {
            var p = r.get(d + ``);
            p === void 0 ? d in e && ((p = f(() => Tn(w, o))), r.set(d + ``, p)) : I(p, w);
          }
        if (l === void 0) (!u || s(e, t)?.writable) && ((l = f(() => Tn(void 0, o))), I(l, jn(n)), r.set(t, l));
        else {
          u = l.v !== w;
          var m = f(() => jn(n));
          I(l, m);
        }
        var h = Reflect.getOwnPropertyDescriptor(e, t);
        if ((h?.set && h.set.call(c, n), !u)) {
          if (i && typeof t == `string`) {
            var g = r.get(`length`),
              _ = Number(t);
            Number.isInteger(_) && _ >= g.v && I(g, _ + 1);
          }
          kn(a);
        }
        return !0;
      },
      ownKeys(e) {
        Q(a);
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
function Mn(e) {
  try {
    if (typeof e == `object` && e && C in e) return e[C];
  } catch {}
  return e;
}
function Nn(e, t) {
  return Object.is(Mn(e), Mn(t));
}
var Pn, Fn, In, Ln, Rn;
function zn() {
  if (Pn === void 0) {
    (Pn = window), (Fn = document), (In = /Firefox/.test(navigator.userAgent));
    var e = Element.prototype,
      t = Node.prototype,
      n = Text.prototype;
    (Ln = s(t, `firstChild`).get),
      (Rn = s(t, `nextSibling`).get),
      f(e) && ((e[me] = void 0), (e[pe] = null), (e[he] = void 0), (e.__e = void 0)),
      f(n) && (n[ge] = void 0);
  }
}
function L(e = ``) {
  return document.createTextNode(e);
}
function R(e) {
  return Ln.call(e);
}
function z(e) {
  return Rn.call(e);
}
function Bn(e, t) {
  if (!T) return R(e);
  var n = R(D);
  if (n === null) n = D.appendChild(L());
  else if (t && n.nodeType !== 3) {
    var r = L();
    return n?.before(r), O(r), r;
  }
  return t && Kn(n), O(n), n;
}
function Vn(e, t = !1) {
  if (!T) {
    var n = R(e);
    return n instanceof Comment && n.data === `` ? z(n) : n;
  }
  if (t) {
    if (D?.nodeType !== 3) {
      var r = L();
      return D?.before(r), O(r), r;
    }
    Kn(D);
  }
  return D;
}
function Hn(e, t = 1, n = !1) {
  let r = T ? D : e;
  for (var i; t--; ) (i = r), (r = z(r));
  if (!T) return r;
  if (n) {
    if (r?.nodeType !== 3) {
      var a = L();
      return r === null ? i?.after(a) : r.before(a), O(a), a;
    }
    Kn(r);
  }
  return O(r), r;
}
function Un(e) {
  e.textContent = ``;
}
function Wn() {
  return !k || F !== null ? !1 : (K.f & ee) !== 0;
}
function Gn(e, t, n) {
  let r = n ? { is: n } : void 0;
  return document.createElementNS(t ?? `http://www.w3.org/1999/xhtml`, e, r);
}
function Kn(e) {
  if (e.nodeValue.length < 65536) return;
  let t = e.nextSibling;
  for (; t !== null && t.nodeType === 3; ) t.remove(), (e.nodeValue += t.nodeValue), (t = e.nextSibling);
}
function qn(e, t) {
  if (t) {
    let t = document.body;
    (e.autofocus = !0),
      j(() => {
        document.activeElement === t && e.focus();
      });
  }
}
function Jn(e) {
  T && R(e) !== null && Un(e);
}
var Yn = !1;
function Xn() {
  Yn ||
    ((Yn = !0),
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
function Zn(e) {
  var t = U,
    n = K;
  G(null), q(null);
  try {
    return e();
  } finally {
    G(t), q(n);
  }
}
function Qn(e, t, n, r = n) {
  e.addEventListener(t, () => Zn(n));
  let i = e[_e];
  i
    ? (e[_e] = () => {
        i(), r(!0);
      })
    : (e[_e] = () => r(!0)),
    Xn();
}
function $n(e) {
  K === null && (U === null && De(e), Ee()), Er && Te(e);
}
function er(e, t) {
  var n = t.last;
  n === null ? (t.last = t.first = e) : ((n.next = e), (e.prev = n), (t.last = e));
}
function B(e, t) {
  var n = K;
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
  N?.register_created_effect(r);
  var i = r;
  if (e & 4) Bt === null ? Wt.ensure().schedule(r) : Bt.push(r);
  else if (t !== null) {
    try {
      Br(r);
    } catch (e) {
      throw (H(r), e);
    }
    i.deps === null &&
      i.teardown === null &&
      i.nodes === null &&
      i.first === i.last &&
      !(i.f & 524288) &&
      ((i = i.first), e & 16 && e & 65536 && i !== null && (i.f |= ne));
  }
  if (i !== null && ((i.parent = n), n !== null && er(i, n), U !== null && U.f & 2 && !(e & 64))) {
    var a = U;
    (a.effects ??= []).push(i);
  }
  return r;
}
function tr() {
  return U !== null && !W;
}
function nr(e) {
  let t = B(8, null);
  return M(t, v), (t.teardown = e), t;
}
function rr(e) {
  $n(`$effect`);
  var t = K.f;
  if (!U && t & 32 && A !== null && !A.i) {
    var n = A;
    (n.e ??= []).push(e);
  } else return ir(e);
}
function ir(e) {
  return B(4 | ae, e);
}
function ar(e) {
  return $n(`$effect.pre`), B(8 | ae, e);
}
function or(e) {
  Wt.ensure();
  let t = B(64 | ie, e);
  return (e = {}) =>
    new Promise((n) => {
      e.outro
        ? yr(t, () => {
            H(t), n(void 0);
          })
        : (H(t), n(void 0));
    });
}
function sr(e) {
  return B(4, e);
}
function cr(e) {
  return B(le | ie, e);
}
function lr(e, t = 0) {
  return B(8 | t, e);
}
function ur(e, t = [], n = [], r = []) {
  on(r, t, n, (t) => {
    B(8, () => e(...t.map(Q)));
  });
}
function dr(e, t = [], n = [], r = []) {
  on(r, t, n, (t) => {
    B(4, () => e(...t.map(Q)));
  });
}
function fr(e, t = 0) {
  return B(16 | t, e);
}
function pr(e, t = 0) {
  return B(_ | t, e);
}
function V(e) {
  return B(32 | ie, e);
}
function mr(e) {
  var t = e.teardown;
  if (t !== null) {
    let e = Er,
      n = U;
    Dr(!0), G(null);
    try {
      t.call(null);
    } finally {
      Dr(e), G(n);
    }
  }
}
function hr(e, t = !1) {
  var n = e.first;
  for (e.first = e.last = null; n !== null; ) {
    let e = n.ac;
    e !== null &&
      Zn(() => {
        e.abort(ve);
      });
    var r = n.next;
    n.f & 64 ? (n.parent = null) : H(n, t), (n = r);
  }
}
function gr(e) {
  for (var t = e.first; t !== null; ) {
    var n = t.next;
    t.f & 32 || H(t), (t = n);
  }
}
function H(e, t = !0) {
  var n = !1;
  (t || e.f & 262144) && e.nodes !== null && e.nodes.end !== null && (_r(e.nodes.start, e.nodes.end), (n = !0)),
    M(e, te),
    hr(e, t && !n),
    zr(e, 0);
  var r = e.nodes && e.nodes.t;
  if (r !== null) for (let e of r) e.stop();
  mr(e), (e.f ^= te), (e.f |= S);
  var i = e.parent;
  i !== null && i.first !== null && vr(e),
    (e.next = e.prev = e.teardown = e.ctx = e.deps = e.fn = e.nodes = e.ac = e.b = null);
}
function _r(e, t) {
  for (; e !== null; ) {
    var n = e === t ? null : z(e);
    e.remove(), (e = n);
  }
}
function vr(e) {
  var t = e.parent,
    n = e.prev,
    r = e.next;
  n !== null && (n.next = r),
    r !== null && (r.prev = n),
    t !== null && (t.first === e && (t.first = r), t.last === e && (t.last = n));
}
function yr(e, t, n = !0) {
  var r = [];
  br(e, r, !0);
  var i = () => {
      n && H(e), t && t();
    },
    a = r.length;
  if (a > 0) {
    var o = () => --a || i();
    for (var s of r) s.out(o);
  } else i();
}
function br(e, t, n) {
  if (!(e.f & 8192)) {
    e.f ^= x;
    var r = e.nodes && e.nodes.t;
    if (r !== null) for (let e of r) (e.is_global || n) && t.push(e);
    for (var i = e.first; i !== null; ) {
      var a = i.next;
      if (!(i.f & 64)) {
        var o = (i.f & 65536) != 0 || ((i.f & 32) != 0 && (e.f & 16) != 0);
        br(i, t, o ? n : !1);
      }
      i = a;
    }
  }
}
function xr(e) {
  Sr(e, !0);
}
function Sr(e, t) {
  if (e.f & 8192) {
    (e.f ^= x), e.f & 1024 || (M(e, y), Wt.ensure().schedule(e));
    for (var n = e.first; n !== null; ) {
      var r = n.next,
        i = (n.f & 65536) != 0 || (n.f & 32) != 0;
      Sr(n, i ? t : !1), (n = r);
    }
    var a = e.nodes && e.nodes.t;
    if (a !== null) for (let e of a) (e.is_global || t) && e.in();
  }
}
function Cr(e, t) {
  if (e.nodes)
    for (var n = e.nodes.start, r = e.nodes.end; n !== null; ) {
      var i = n === r ? null : z(n);
      t.append(n), (n = i);
    }
}
var wr = null,
  Tr = !1,
  Er = !1;
function Dr(e) {
  Er = e;
}
var U = null,
  W = !1;
function G(e) {
  U = e;
}
var K = null;
function q(e) {
  K = e;
}
var J = null;
function Or(e) {
  U !== null && (!k || U.f & 2) && (J === null ? (J = [e]) : J.push(e));
}
var Y = null,
  X = 0,
  Z = null;
function kr(e) {
  Z = e;
}
var Ar = 1,
  jr = 0,
  Mr = jr;
function Nr(e) {
  Mr = e;
}
function Pr() {
  return ++Ar;
}
function Fr(e) {
  var t = e.f;
  if (t & 2048) return !0;
  if ((t & 2 && (e.f &= ~se), t & 4096)) {
    for (var n = e.deps, r = n.length, i = 0; i < r; i++) {
      var a = n[i];
      if ((Fr(a) && _n(a), a.wv > e.wv)) return !0;
    }
    t & 512 && P === null && M(e, v);
  }
  return !1;
}
function Ir(e, t, n = !0) {
  var r = e.reactions;
  if (r !== null && !(!k && J !== null && i.call(J, e)))
    for (var a = 0; a < r.length; a++) {
      var o = r[a];
      o.f & 2 ? Ir(o, t, !1) : t === o && (n ? M(o, y) : o.f & 1024 && M(o, b), Zt(o));
    }
}
function Lr(e) {
  var t = Y,
    n = X,
    r = Z,
    i = U,
    a = J,
    o = A,
    s = W,
    c = Mr,
    l = e.f;
  (Y = null),
    (X = 0),
    (Z = null),
    (U = l & 96 ? null : e),
    (J = null),
    it(e.ctx),
    (W = !1),
    (Mr = ++jr),
    e.ac !== null &&
      (Zn(() => {
        e.ac.abort(ve);
      }),
      (e.ac = null));
  try {
    e.f |= ce;
    var u = e.fn,
      d = u();
    e.f |= ee;
    var f = e.deps,
      p = N?.is_fork;
    if (Y !== null) {
      var m;
      if ((p || zr(e, X), f !== null && X > 0)) for (f.length = X + Y.length, m = 0; m < Y.length; m++) f[X + m] = Y[m];
      else e.deps = f = Y;
      if (tr() && e.f & 512) for (m = X; m < f.length; m++) (f[m].reactions ??= []).push(e);
    } else !p && f !== null && X < f.length && (zr(e, X), (f.length = X));
    if (ft() && Z !== null && !W && f !== null && !(e.f & 6146)) for (m = 0; m < Z.length; m++) Ir(Z[m], e);
    if (i !== null && i !== e) {
      if ((jr++, i.deps !== null)) for (let e = 0; e < n; e += 1) i.deps[e].rv = jr;
      if (t !== null) for (let e of t) e.rv = jr;
      Z !== null && (r === null ? (r = Z) : r.push(...Z));
    }
    return e.f & 8388608 && (e.f ^= ue), d;
  } catch (e) {
    return vt(e);
  } finally {
    (e.f ^= ce), (Y = t), (X = n), (Z = r), (U = i), (J = a), it(o), (W = s), (Mr = c);
  }
}
function Rr(e, t) {
  let n = t.reactions;
  if (n !== null) {
    var a = r.call(n, e);
    if (a !== -1) {
      var o = n.length - 1;
      o === 0 ? (n = t.reactions = null) : ((n[a] = n[o]), n.pop());
    }
  }
  if (n === null && t.f & 2 && (Y === null || !i.call(Y, t))) {
    var s = t;
    s.f & 512 && ((s.f ^= 512), (s.f &= ~se)), s.v !== w && xt(s), vn(s), zr(s, 0);
  }
}
function zr(e, t) {
  var n = e.deps;
  if (n !== null) for (var r = t; r < n.length; r++) Rr(e, n[r]);
}
function Br(e) {
  var t = e.f;
  if (!(t & 16384)) {
    M(e, v);
    var n = K,
      r = Tr;
    (K = e), (Tr = !0);
    try {
      t & 16777232 ? gr(e) : hr(e), mr(e);
      var i = Lr(e);
      (e.teardown = typeof i == `function` ? i : null), (e.wv = Ar);
    } finally {
      (Tr = r), (K = n);
    }
  }
}
async function Vr() {
  if (k)
    return new Promise((e) => {
      requestAnimationFrame(() => e()), setTimeout(() => e());
    });
  await Promise.resolve(), Gt();
}
function Hr() {
  return Wt.ensure().settled();
}
function Q(e) {
  var t = (e.f & 2) != 0;
  if ((wr?.add(e), U !== null && !W && !(K !== null && K.f & 16384) && (J === null || !i.call(J, e)))) {
    var n = U.deps;
    if (U.f & 2097152)
      e.rv < jr && ((e.rv = jr), Y === null && n !== null && n[X] === e ? X++ : Y === null ? (Y = [e]) : Y.push(e));
    else {
      (U.deps ??= []), i.call(U.deps, e) || U.deps.push(e);
      var r = e.reactions;
      r === null ? (e.reactions = [U]) : i.call(r, U) || r.push(U);
    }
  }
  if (Er && xn.has(e)) return xn.get(e);
  if (t) {
    var a = e;
    if (Er) {
      var o = a.v;
      return ((!(a.f & 1024) && a.reactions !== null) || Wr(a)) && (o = gn(a)), xn.set(a, o), o;
    }
    var s = (a.f & 512) == 0 && !W && U !== null && (Tr || (U.f & 512) != 0),
      c = (a.f & ee) === 0;
    Fr(a) && (s && (a.f |= 512), _n(a)), s && !c && (yn(a), Ur(a));
  }
  if (P?.has(e)) return P.get(e);
  if (e.f & 8388608) throw e.v;
  return e.v;
}
function Ur(e) {
  if (((e.f |= 512), e.deps !== null))
    for (let t of e.deps) (t.reactions ??= []).push(e), t.f & 2 && !(t.f & 512) && (yn(t), Ur(t));
}
function Wr(e) {
  if (e.v === w) return !0;
  if (e.deps === null) return !1;
  for (let t of e.deps) if (xn.has(t) || (t.f & 2 && Wr(t))) return !0;
  return !1;
}
function Gr(e) {
  var t = W;
  try {
    return (W = !0), e();
  } finally {
    W = t;
  }
}
function Kr(e) {
  if (!(typeof e != `object` || !e || e instanceof EventTarget)) {
    if (C in e) qr(e);
    else if (!Array.isArray(e))
      for (let t in e) {
        let n = e[t];
        typeof n == `object` && n && C in n && qr(n);
      }
  }
}
function qr(e, t = new Set()) {
  if (typeof e == `object` && e && !(e instanceof EventTarget) && !t.has(e)) {
    t.add(e), e instanceof Date && e.getTime();
    for (let n in e)
      try {
        qr(e[n], t);
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
function Jr(e) {
  return e.endsWith(`capture`) && e !== `gotpointercapture` && e !== `lostpointercapture`;
}
var Yr = [
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
function Xr(e) {
  return Yr.includes(e);
}
var Zr =
    `allowfullscreen.async.autofocus.autoplay.checked.controls.default.disabled.formnovalidate.indeterminate.inert.ismap.loop.multiple.muted.nomodule.novalidate.open.playsinline.readonly.required.reversed.seamless.selected.webkitdirectory.defer.disablepictureinpicture.disableremoteplayback`.split(
      `.`,
    ),
  Qr = {
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
function $r(e) {
  return (e = e.toLowerCase()), Qr[e] ?? e;
}
[...Zr];
var ei = [`touchstart`, `touchmove`];
function ti(e) {
  return ei.includes(e);
}
var ni = Symbol(`events`),
  ri = new Set(),
  ii = new Set();
function ai(e) {
  if (!T) return;
  e.removeAttribute(`onload`), e.removeAttribute(`onerror`);
  let t = e.__e;
  t !== void 0 &&
    ((e.__e = void 0),
    queueMicrotask(() => {
      e.isConnected && e.dispatchEvent(t);
    }));
}
function oi(e, t, n, r = {}) {
  function i(e) {
    if ((r.capture || di.call(t, e), !e.cancelBubble)) return Zn(() => n?.call(this, e));
  }
  return (
    e.startsWith(`pointer`) || e.startsWith(`touch`) || e === `wheel`
      ? j(() => {
          t.addEventListener(e, i, r);
        })
      : t.addEventListener(e, i, r),
    i
  );
}
function si(e, t, n, r, i) {
  var a = { capture: r, passive: i },
    o = oi(e, t, n, a);
  (t === document.body || t === window || t === document || t instanceof HTMLMediaElement) &&
    nr(() => {
      t.removeEventListener(e, o, a);
    });
}
function ci(e, t, n) {
  (t[ni] ??= {})[e] = n;
}
function li(e) {
  for (var t = 0; t < e.length; t++) ri.add(e[t]);
  for (var n of ii) n(e);
}
var ui = null;
function di(e) {
  var t = this,
    n = t.ownerDocument,
    r = e.type,
    i = e.composedPath?.() || [],
    a = i[0] || e.target;
  ui = e;
  var s = 0,
    c = ui === e && e[ni];
  if (c) {
    var l = i.indexOf(c);
    if (l !== -1 && (t === document || t === window)) {
      e[ni] = t;
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
    var d = U,
      f = K;
    G(null), q(null);
    try {
      for (var p, m = []; a !== null && a !== t; ) {
        try {
          var h = a[ni]?.[r];
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
      (e[ni] = t), delete e.currentTarget, G(d), q(f);
    }
  }
}
var fi =
  globalThis?.window?.trustedTypes &&
  globalThis.window.trustedTypes.createPolicy(`svelte-trusted-html`, { createHTML: (e) => e });
function pi(e) {
  return fi?.createHTML(e) ?? e;
}
function mi(e) {
  var t = Gn(`template`);
  return (t.innerHTML = pi(e.replaceAll(`<!>`, `<!---->`))), t.content;
}
function $(e, t) {
  var n = K;
  n.nodes === null && (n.nodes = { start: e, end: t, a: null, t: null });
}
function hi(e, t) {
  var n = (t & 1) != 0,
    r = (t & 2) != 0,
    i,
    a = !e.startsWith(`<!>`);
  return () => {
    if (T) return $(D, null), D;
    i === void 0 && ((i = mi(a ? e : `<!>` + e)), n || (i = R(i)));
    var t = r || In ? document.importNode(i, !0) : i.cloneNode(!0);
    if (n) {
      var o = R(t),
        s = t.lastChild;
      $(o, s);
    } else $(t, t);
    return t;
  };
}
function gi(e, t, n = `svg`) {
  var r = !e.startsWith(`<!>`),
    i = (t & 1) != 0,
    a = `<${n}>${r ? e : `<!>` + e}</${n}>`,
    o;
  return () => {
    if (T) return $(D, null), D;
    if (!o) {
      var e = R(mi(a));
      if (i) for (o = document.createDocumentFragment(); R(e); ) o.appendChild(R(e));
      else o = R(e);
    }
    var t = o.cloneNode(!0);
    if (i) {
      var n = R(t),
        r = t.lastChild;
      $(n, r);
    } else $(t, t);
    return t;
  };
}
function _i(e, t) {
  return gi(e, t, `svg`);
}
function vi(e = ``) {
  if (!T) {
    var t = L(e + ``);
    return $(t, t), t;
  }
  var n = D;
  return n.nodeType === 3 ? Kn(n) : (n.before((n = L())), O(n)), $(n, n), n;
}
function yi() {
  if (T) return $(D, null), D;
  var e = document.createDocumentFragment(),
    t = document.createComment(``),
    n = L();
  return e.append(t, n), $(t, n), e;
}
function bi(e, t) {
  if (T) {
    var n = K;
    (!(n.f & 32768) || n.nodes.end === null) && (n.nodes.end = D), Ye();
    return;
  }
  e !== null && e.before(t);
}
function xi(e, t) {
  var n = t == null ? `` : typeof t == `object` ? `${t}` : t;
  n !== (e[ge] ??= e.nodeValue) && ((e[ge] = n), (e.nodeValue = `${n}`));
}
function Si(e, t) {
  return Ti(e, t);
}
function Ci(e, t) {
  zn(), (t.intro = t.intro ?? !1);
  let n = t.target,
    r = T,
    i = D;
  try {
    for (var a = R(n); a && (a.nodeType !== 8 || a.data !== `[`); ) a = z(a);
    if (!a) throw Be;
    E(!0), O(a);
    let r = Ti(e, { ...t, anchor: a });
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
    return r !== Be && console.warn(`Failed to hydrate: `, r), t.recover === !1 && Me(), zn(), Un(n), E(!1), Si(e, t);
  } finally {
    E(r), O(i);
  }
}
var wi = new Map();
function Ti(e, { target: t, anchor: n, props: r = {}, events: i, context: o, intro: s = !0, transformError: c }) {
  zn();
  var l = void 0,
    u = or(() => {
      var s = n ?? t.appendChild(L());
      rn(
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
            T && ((K.nodes.end = D), D === null || D.nodeType !== 8 || D.data !== `]`))
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
              var i = ti(r);
              for (let e of [t, document]) {
                var a = wi.get(e);
                a === void 0 && ((a = new Map()), wi.set(e, a));
                var o = a.get(r);
                o === void 0 ? (e.addEventListener(r, di, { passive: i }), a.set(r, 1)) : a.set(r, o + 1);
              }
            }
          }
        };
      return (
        d(a(ri)),
        ii.add(d),
        () => {
          for (var e of u)
            for (let n of [t, document]) {
              var r = wi.get(n),
                i = r.get(e);
              --i == 0 ? (n.removeEventListener(e, di), r.delete(e), r.size === 0 && wi.delete(n)) : r.set(e, i);
            }
          ii.delete(d), s !== n && s.parentNode?.removeChild(s);
        }
      );
    });
  return Ei.set(l, u), l;
}
var Ei = new WeakMap();
function Di(e, t) {
  let n = Ei.get(e);
  return n ? (Ei.delete(e), n(t)) : Promise.resolve();
}
var Oi = class {
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
      if (n) xr(n), this.#r.delete(t);
      else {
        var r = this.#n.get(t);
        r &&
          (xr(r.effect),
          this.#t.set(t, r.effect),
          this.#n.delete(t),
          r.fragment.lastChild.remove(),
          this.anchor.before(r.fragment),
          (n = r.effect));
      }
      for (let [t, n] of this.#e) {
        if ((this.#e.delete(t), t === e)) break;
        let r = this.#n.get(n);
        r && (H(r.effect), this.#n.delete(n));
      }
      for (let [e, r] of this.#t) {
        if (e === t || this.#r.has(e)) continue;
        let i = () => {
          if (Array.from(this.#e.values()).includes(e)) {
            var t = document.createDocumentFragment();
            Cr(r, t), t.append(L()), this.#n.set(e, { effect: r, fragment: t });
          } else H(r);
          this.#r.delete(e), this.#t.delete(e);
        };
        this.#i || !n ? (this.#r.add(e), yr(r, i, !1)) : i();
      }
    }
  };
  #o = (e) => {
    this.#e.delete(e);
    let t = Array.from(this.#e.values());
    for (let [e, n] of this.#n) t.includes(e) || (H(n.effect), this.#n.delete(e));
  };
  ensure(e, t) {
    var n = N,
      r = Wn();
    if (t && !this.#t.has(e) && !this.#n.has(e))
      if (r) {
        var i = document.createDocumentFragment(),
          a = L();
        i.append(a), this.#n.set(e, { effect: V(() => t(a)), fragment: i });
      } else
        this.#t.set(
          e,
          V(() => t(this.anchor)),
        );
    if ((this.#e.set(n, e), r)) {
      for (let [t, r] of this.#t) t === e ? n.unskip_effect(r) : n.skip_effect(r);
      for (let [t, r] of this.#n) t === e ? n.unskip_effect(r.effect) : n.skip_effect(r.effect);
      n.oncommit(this.#a), n.ondiscard(this.#o);
    } else T && (this.anchor = D), this.#a(n);
  }
};
function ki(e, t, n = !1) {
  var r;
  T && ((r = D), Ye());
  var i = new Oi(e),
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
  fr(() => {
    var e = !1;
    t((t, n = 0) => {
      (e = !0), o(n, t);
    }),
      e || o(-1, null);
  }, a);
}
function Ai(e, t) {
  return t;
}
function ji(e, t, n) {
  for (var r = [], i = t.length, o, s = t.length, c = 0; c < i; c++) {
    let n = t[c];
    yr(
      n,
      () => {
        if (o) {
          if ((o.pending.delete(n), o.done.add(n), o.pending.size === 0)) {
            var t = e.outrogroups;
            Mi(e, a(o.done)), t.delete(o), t.size === 0 && (e.outrogroups = null);
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
      Un(d), d.append(u), e.items.clear();
    }
    Mi(e, t, !l);
  } else (o = { pending: new Set(t), done: new Set() }), (e.outrogroups ??= new Set()).add(o);
}
function Mi(e, t, n = !0) {
  var r;
  if (e.pending.size > 0) {
    r = new Set();
    for (let t of e.pending.values()) for (let n of t) r.add(e.items.get(n).e);
  }
  for (var i = 0; i < t.length; i++) {
    var a = t[i];
    r?.has(a) ? ((a.f |= oe), Cr(a, document.createDocumentFragment())) : H(t[i], n);
  }
}
var Ni;
function Pi(e, t, r, i, o, s = null) {
  var c = e,
    l = new Map();
  if (t & 4) {
    var u = e;
    c = T ? O(R(u)) : u.appendChild(L());
  }
  T && Ye();
  var d = null,
    f = mn(() => {
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
      Ii(v, p, c, t, i),
      d !== null &&
        (p.length === 0
          ? d.f & 33554432
            ? ((d.f ^= oe), Ri(d, null, c))
            : xr(d)
          : yr(d, () => {
              d = null;
            })));
  }
  function _(e) {
    v.pending.delete(e);
  }
  var v = {
    effect: fr(() => {
      p = Q(f);
      var e = p.length;
      let n = !1;
      T && ($e(c) === `[!`) != (e === 0) && ((c = Qe()), O(c), E(!1), (n = !0));
      for (var a = new Set(), u = N, v = Wn(), y = 0; y < e; y += 1) {
        T && D.nodeType === 8 && D.data === `]` && ((c = D), (n = !0), E(!1));
        var b = p[y],
          x = i(b, y),
          S = h ? null : l.get(x);
        S
          ? (S.v && Dn(S.v, b), S.i && Dn(S.i, y), v && u.unskip_effect(S.e))
          : ((S = Li(l, h ? c : (Ni ??= L()), b, x, y, o, t, r)), h || (S.e.f |= oe), l.set(x, S)),
          a.add(x);
      }
      if (
        (e === 0 && s && !d && (h ? (d = V(() => s(c))) : ((d = V(() => s((Ni ??= L())))), (d.f |= oe))),
        e > a.size && we(``, ``, ``),
        T && e > 0 && O(Qe()),
        !h)
      )
        if ((m.set(u, a), v)) {
          for (let [e, t] of l) a.has(e) || u.skip_effect(t.e);
          u.oncommit(g), u.ondiscard(_);
        } else g(u);
      n && E(!0), Q(f);
    }),
    flags: t,
    items: l,
    pending: m,
    outrogroups: null,
    fallback: d,
  };
  (h = !1), T && (c = D);
}
function Fi(e) {
  for (; e !== null && !(e.f & 32); ) e = e.next;
  return e;
}
function Ii(e, t, n, r, i) {
  var o = (r & 8) != 0,
    s = t.length,
    c = e.items,
    l = Fi(e.effect.first),
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
    if ((_.f & 8192 && (xr(_), o && (_.nodes?.a?.unfix(), (f ??= new Set()).delete(_))), _.f & 33554432))
      if (((_.f ^= oe), _ === l)) Ri(_, null, n);
      else {
        var y = d ? d.next : l;
        _ === e.effect.last && (e.effect.last = _.prev),
          _.prev && (_.prev.next = _.next),
          _.next && (_.next.prev = _.prev),
          zi(e, d, _),
          zi(e, _, y),
          Ri(_, y, n),
          (d = _),
          (p = []),
          (m = []),
          (l = Fi(d.next));
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
          for (x = 0; x < p.length; x += 1) Ri(p[x], b, n);
          for (x = 0; x < m.length; x += 1) u.delete(m[x]);
          zi(e, S.prev, ee.next), zi(e, d, S), zi(e, ee, b), (l = b), (d = ee), --v, (p = []), (m = []);
        } else
          u.delete(_),
            Ri(_, l, n),
            zi(e, _.prev, _.next),
            zi(e, _, d === null ? e.effect.first : d.next),
            zi(e, d, _),
            (d = _);
        continue;
      }
      for (p = [], m = []; l !== null && l !== _; ) (u ??= new Set()).add(l), m.push(l), (l = Fi(l.next));
      if (l === null) continue;
    }
    _.f & 33554432 || p.push(_), (d = _), (l = Fi(_.next));
  }
  if (e.outrogroups !== null) {
    for (let t of e.outrogroups) t.pending.size === 0 && (Mi(e, a(t.done)), e.outrogroups?.delete(t));
    e.outrogroups.size === 0 && (e.outrogroups = null);
  }
  if (l !== null || u !== void 0) {
    var te = [];
    if (u !== void 0) for (_ of u) _.f & 8192 || te.push(_);
    for (; l !== null; ) !(l.f & 8192) && l !== e.fallback && te.push(l), (l = Fi(l.next));
    var ne = te.length;
    if (ne > 0) {
      var re = r & 4 && s === 0 ? n : null;
      if (o) {
        for (v = 0; v < ne; v += 1) te[v].nodes?.a?.measure();
        for (v = 0; v < ne; v += 1) te[v].nodes?.a?.fix();
      }
      ji(e, te, re);
    }
  }
  o &&
    j(() => {
      if (f !== void 0) for (_ of f) _.nodes?.a?.apply();
    });
}
function Li(e, t, n, r, i, a, o, s) {
  var c = o & 1 ? (o & 16 ? wn(n) : En(n, !1, !1)) : null,
    l = o & 2 ? wn(i) : null;
  return {
    v: c,
    i: l,
    e: V(
      () => (
        a(t, c ?? n, l ?? i, s),
        () => {
          e.delete(r);
        }
      ),
    ),
  };
}
function Ri(e, t, n) {
  if (e.nodes)
    for (var r = e.nodes.start, i = e.nodes.end, a = t && !(t.f & 33554432) ? t.nodes.start : n; r !== null; ) {
      var o = z(r);
      if ((a.before(r), r === i)) return;
      r = o;
    }
}
function zi(e, t, n) {
  t === null ? (e.effect.first = n) : (t.next = n), n === null ? (e.effect.last = t) : (n.prev = t);
}
function Bi(e, t, n = !1, r = !1, i = !1, a = !1) {
  var o = e,
    s = ``;
  if (n) {
    var c = e;
    T && (o = O(R(c)));
  }
  ur(() => {
    var e = K;
    if (s === (s = t() ?? ``)) {
      T && Ye();
      return;
    }
    if (n && !T) {
      (e.nodes = null), (c.innerHTML = s), s !== `` && $(R(c), c.lastChild);
      return;
    }
    if ((e.nodes !== null && (_r(e.nodes.start, e.nodes.end), (e.nodes = null)), s !== ``)) {
      if (T) {
        for (var a = D.data, l = Ye(), u = l; l !== null && (l.nodeType !== 8 || l.data !== ``); ) (u = l), (l = z(l));
        if (l === null) throw (Ke(), Be);
        $(D, u), (o = O(l));
        return;
      }
      var d = Gn(r ? `svg` : i ? `math` : `template`, r ? He : i ? Ue : void 0);
      d.innerHTML = s;
      var f = r || i ? d : d.content;
      if (($(R(f), f.lastChild), r || i)) for (; R(f); ) o.before(R(f));
      else o.before(f);
    }
  });
}
function Vi(e, t, ...n) {
  var r = new Oi(e);
  fr(() => {
    let e = t() ?? null;
    r.ensure(e, e && ((t) => e(t, ...n)));
  }, ne);
}
function Hi(e) {
  return (t, ...n) => {
    var r = e(...n),
      i;
    T ? ((i = D), Ye()) : ((i = R(mi(r.render().trim()))), t.before(i));
    let a = r.setup?.(i);
    $(i, i), typeof a == `function` && nr(a);
  };
}
function Ui(e, t, n) {
  var r;
  T && ((r = D), Ye());
  var i = new Oi(e);
  fr(() => {
    var e = t() ?? null;
    if (T && ($e(r) === `[`) != (e !== null)) {
      var a = Qe();
      O(a), (i.anchor = a), E(!1), i.ensure(e, e && ((t) => n(t, e))), E(!0);
      return;
    }
    i.ensure(e, e && ((t) => n(t, e)));
  }, ne);
}
function Wi(e, t) {
  let n = null,
    r = T;
  var i;
  if (T) {
    n = D;
    for (var a = R(document.head); a !== null && (a.nodeType !== 8 || a.data !== e); ) a = z(a);
    if (a === null) E(!1);
    else {
      var o = z(a);
      a.remove(), O(o);
    }
  }
  T || (i = document.head.appendChild(L()));
  try {
    fr(() => {
      var e = V(() => t(i));
      e.f |= re;
    });
  } finally {
    r && (E(!0), O(n));
  }
}
function Gi(e, t, n) {
  sr(() => {
    var r = Gr(() => t(e, n?.()) || {});
    if (n && r?.update) {
      var i = !1,
        a = {};
      lr(() => {
        var e = n();
        Kr(e), i && tt(a, e) && ((a = e), r.update(e));
      }),
        (i = !0);
    }
    if (r?.destroy) return () => r.destroy();
  });
}
function Ki(e, t) {
  var n = void 0,
    r;
  pr(() => {
    n !== (n = t()) &&
      ((r &&= (H(r), null)),
      n &&
        (r = V(() => {
          sr(() => n(e));
        })));
  });
}
function qi(e) {
  var t,
    n,
    r = ``;
  if (typeof e == `string` || typeof e == `number`) r += e;
  else if (typeof e == `object`)
    if (Array.isArray(e)) {
      var i = e.length;
      for (t = 0; t < i; t++) e[t] && (n = qi(e[t])) && (r && (r += ` `), (r += n));
    } else for (n in e) e[n] && (r && (r += ` `), (r += n));
  return r;
}
function Ji() {
  for (var e, t, n = 0, r = ``, i = arguments.length; n < i; n++)
    (e = arguments[n]) && (t = qi(e)) && (r && (r += ` `), (r += t));
  return r;
}
function Yi(e) {
  return typeof e == `object` ? Ji(e) : (e ?? ``);
}
var Xi = [
  ...` 	
\r\f\xA0\v﻿`,
];
function Zi(e, t, n) {
  var r = e == null ? `` : `` + e;
  if ((t && (r = r ? r + ` ` + t : t), n)) {
    for (var i of Object.keys(n))
      if (n[i]) r = r ? r + ` ` + i : i;
      else if (r.length)
        for (var a = i.length, o = 0; (o = r.indexOf(i, o)) >= 0; ) {
          var s = o + a;
          (o === 0 || Xi.includes(r[o - 1])) && (s === r.length || Xi.includes(r[s]))
            ? (r = (o === 0 ? `` : r.substring(0, o)) + r.substring(s + 1))
            : (o = s);
        }
  }
  return r === `` ? null : r;
}
function Qi(e, t = !1) {
  var n = t ? ` !important;` : `;`,
    r = ``;
  for (var i of Object.keys(e)) {
    var a = e[i];
    a != null && a !== `` && (r += ` ` + i + `: ` + a + n);
  }
  return r;
}
function $i(e) {
  return e[0] !== `-` || e[1] !== `-` ? e.toLowerCase() : e;
}
function ea(e, t) {
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
      r && c.push(...Object.keys(r).map($i)), i && c.push(...Object.keys(i).map($i));
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
              var p = $i(e.substring(l, u).trim());
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
    return r && (n += Qi(r)), i && (n += Qi(i, !0)), (n = n.trim()), n === `` ? null : n;
  }
  return e == null ? null : String(e);
}
function ta(e, t, n, r, i, a) {
  var o = e[me];
  if (T || o !== n || o === void 0) {
    var s = Zi(n, r, a);
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
function na(e, t = {}, n, r) {
  for (var i in n) {
    var a = n[i];
    t[i] !== a && (n[i] == null ? e.style.removeProperty(i) : e.style.setProperty(i, a, r));
  }
}
function ra(e, t, n, r) {
  var i = e[he];
  if (T || i !== t) {
    var a = ea(t, r);
    (!T || a !== e.getAttribute(`style`)) && (a == null ? e.removeAttribute(`style`) : (e.style.cssText = a)),
      (e[he] = t);
  } else r && (Array.isArray(r) ? (na(e, n?.[0], r[0]), na(e, n?.[1], r[1], `important`)) : na(e, n, r));
  return r;
}
function ia(e, t, r = !1) {
  if (e.multiple) {
    if (t == null) return;
    if (!n(t)) return qe();
    for (var i of e.options) i.selected = t.includes(oa(i));
    return;
  }
  for (i of e.options)
    if (Nn(oa(i), t)) {
      i.selected = !0;
      return;
    }
  (!r || t !== void 0) && (e.selectedIndex = -1);
}
function aa(e) {
  var t = new MutationObserver(() => {
    ia(e, e.__value);
  });
  t.observe(e, { childList: !0, subtree: !0, attributes: !0, attributeFilter: [`value`] }),
    nr(() => {
      t.disconnect();
    });
}
function oa(e) {
  return `__value` in e ? e.__value : e.value;
}
var sa = Symbol(`class`),
  ca = Symbol(`style`),
  la = Symbol(`is custom element`),
  ua = Symbol(`is html`),
  da = ye ? `link` : `LINK`,
  fa = ye ? `input` : `INPUT`,
  pa = ye ? `option` : `OPTION`,
  ma = ye ? `select` : `SELECT`,
  ha = ye ? `progress` : `PROGRESS`;
function ga(e) {
  if (T) {
    var t = !1,
      n = () => {
        if (!t) {
          if (((t = !0), e.hasAttribute(`value`))) {
            var n = e.value;
            ya(e, `value`, null), (e.value = n);
          }
          if (e.hasAttribute(`checked`)) {
            var r = e.checked;
            ya(e, `checked`, null), (e.checked = r);
          }
        }
      };
    (e[_e] = n), j(n), Xn();
  }
}
function _a(e, t) {
  var n = Sa(e);
  n.value === (n.value = t ?? void 0) || (e.value === t && (t !== 0 || e.nodeName !== ha)) || (e.value = t ?? ``);
}
function va(e, t) {
  t ? e.hasAttribute(`selected`) || e.setAttribute(`selected`, ``) : e.removeAttribute(`selected`);
}
function ya(e, t, n, r) {
  var i = Sa(e);
  (T && ((i[t] = e.getAttribute(t)), t === `src` || t === `srcset` || (t === `href` && e.nodeName === da))) ||
    (i[t] !== (i[t] = n) &&
      (t === `loading` && (e[fe] = n),
      n == null
        ? e.removeAttribute(t)
        : typeof n != `string` && wa(e).includes(t)
          ? (e[t] = n)
          : e.setAttribute(t, n)));
}
function ba(e, t, n, r, i = !1, a = !1) {
  if (T && i && e.nodeName === fa) {
    var o = e;
    (o.type === `checkbox` ? `defaultChecked` : `defaultValue`) in n || ga(o);
  }
  var s = Sa(e),
    c = s[la],
    l = !s[ua];
  let u = T && c;
  u && E(!1);
  var d = t || {},
    f = e.nodeName === pa;
  for (var p in t) p in n || (n[p] = null);
  n.class ? (n.class = Yi(n.class)) : (r || n[sa]) && (n.class = null), n[ca] && (n.style ??= null);
  var m = wa(e);
  for (let i in n) {
    let o = n[i];
    if (f && i === `value` && o == null) {
      (e.value = e.__value = ``), (d[i] = o);
      continue;
    }
    if (i === `class`) {
      ta(e, e.namespaceURI === `http://www.w3.org/1999/xhtml`, o, r, t?.[sa], n[sa]), (d[i] = o), (d[sa] = n[sa]);
      continue;
    }
    if (i === `style`) {
      ra(e, o, t?.[ca], n[ca]), (d[i] = o), (d[ca] = n[ca]);
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
          var _ = Xr(r);
          if ((Jr(r) && ((r = r.slice(0, -7)), (t.capture = !0)), !_ && h)) {
            if (o != null) continue;
            e.removeEventListener(r, d[n], t), (d[n] = null);
          }
          if (_) ci(r, e, o), li([r]);
          else if (o != null) {
            function a(e) {
              d[i].call(this, e);
            }
            d[n] = oi(r, e, a, t);
          }
        } else if (i === `style`) ya(e, i, o);
        else if (i === `autofocus`) qn(e, !!o);
        else if (!c && (i === `__value` || (i === `value` && o != null))) e.value = e.__value = o;
        else if (i === `selected` && f) va(e, o);
        else {
          var v = i;
          l || (v = $r(v));
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
              : typeof o != `function` && ya(e, v, o, a);
        }
    }
  }
  return u && E(!0), d;
}
function xa(e, t, n = [], r = [], i = [], a, o = !1, s = !1) {
  on(i, n, r, (n) => {
    var r = void 0,
      i = {},
      c = e.nodeName === ma,
      l = !1;
    if (
      (pr(() => {
        var u = t(...n.map(Q)),
          d = ba(e, r, u, a, o, s);
        l && c && `value` in u && ia(e, u.value);
        for (let e of Object.getOwnPropertySymbols(i)) u[e] || H(i[e]);
        for (let t of Object.getOwnPropertySymbols(u)) {
          var f = u[t];
          t.description === `@attach` && (!r || f !== r[t]) && (i[t] && H(i[t]), (i[t] = V(() => Ki(e, () => f)))),
            (d[t] = f);
        }
        r = d;
      }),
      c)
    ) {
      var u = e;
      sr(() => {
        ia(u, r.value, !0), aa(u);
      });
    }
    l = !0;
  });
}
function Sa(e) {
  return (e[pe] ??= { [la]: e.nodeName.includes(`-`), [ua]: e.namespaceURI === Ve });
}
var Ca = new Map();
function wa(e) {
  var t = e.getAttribute(`is`) || e.nodeName,
    n = Ca.get(t);
  if (n) return n;
  Ca.set(t, (n = []));
  for (var r, i = e, a = Element.prototype; a !== i; ) {
    for (var o in ((r = c(i)), r))
      r[o].set && o !== `innerHTML` && o !== `textContent` && o !== `innerText` && n.push(o);
    i = d(i);
  }
  return n;
}
function Ta(e, t, n = t) {
  var r = new WeakSet();
  Qn(e, `input`, async (i) => {
    var a = i ? e.defaultValue : e.value;
    if (((a = Ea(e) ? Da(a) : a), n(a), N !== null && r.add(N), await Vr(), a !== (a = t()))) {
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
    ((T && e.defaultValue !== e.value) || (Gr(t) == null && e.value)) &&
      (n(Ea(e) ? Da(e.value) : e.value), N !== null && r.add(N)),
    lr(() => {
      var n = t();
      if (e === document.activeElement) {
        var i = k ? It : N;
        if (r.has(i)) return;
      }
      (Ea(e) && n === Da(e.value)) || (e.type === `date` && !n && !e.value) || (n !== e.value && (e.value = n ?? ``));
    });
}
function Ea(e) {
  var t = e.type;
  return t === `number` || t === `range`;
}
function Da(e) {
  return e === `` ? null : +e;
}
function Oa(e, t) {
  return e === t || e?.[C] === t;
}
function ka(e = {}, t, n, r) {
  var i = A.r,
    a = K;
  return (
    sr(() => {
      var o, s;
      return (
        lr(() => {
          (o = s),
            (s = r?.() || []),
            Gr(() => {
              Oa(n(...s), e) || (t(e, ...s), o && Oa(n(...o), e) && t(null, ...o));
            });
        }),
        () => {
          let r = a;
          for (; r !== i && r.parent !== null && r.parent.f & 33554432; ) r = r.parent;
          let o = () => {
              s && Oa(n(...s), e) && t(null, ...s);
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
var Aa = {
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
function ja(...e) {
  return new Proxy({ props: e }, Aa);
}
function Ma(e, t, n, r) {
  var i = !rt || (n & 2) != 0,
    a = (n & 8) != 0,
    o = (n & 16) != 0,
    c = r,
    l = !0,
    u = void 0,
    d = () => (o && i ? ((u ??= un(r)), Q(u)) : (l && ((l = !1), (c = o ? Gr(r) : r)), c));
  let f;
  if (a) {
    var p = C in e || de in e;
    f = s(e, t)?.set ?? (p && t in e ? (n) => (e[t] = n) : void 0);
  }
  var m,
    h = !1;
  a ? ([m, h] = Nt(() => e[t])) : (m = e[t]), m === void 0 && r !== void 0 && ((m = d()), f && (i && Pe(t), f(m)));
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
    y = (n & 1 ? un : mn)(() => ((v = !1), g()));
  a && Q(y);
  var b = K;
  return function (e, t) {
    if (arguments.length > 0) {
      let n = t ? Q(y) : i && a ? jn(e) : e;
      return I(y, n), (v = !0), c !== void 0 && (c = n), e;
    }
    return (Er && v) || b.f & 16384 ? y.v : Q(y);
  };
}
function Na(e) {
  return class extends Pa {
    constructor(t) {
      super({ component: e, ...t });
    }
  };
}
var Pa = class {
  #e;
  #t;
  constructor(e) {
    var t = new Map(),
      n = (e, n) => {
        var r = En(n, !1, !1);
        return t.set(e, r), r;
      };
    let r = new Proxy(
      { ...(e.props || {}), $$events: {} },
      {
        get(e, r) {
          return Q(t.get(r) ?? n(r, Reflect.get(e, r)));
        },
        has(e, r) {
          return r === de ? !0 : (Q(t.get(r) ?? n(r, Reflect.get(e, r))), Reflect.has(e, r));
        },
        set(e, r, i) {
          return I(t.get(r) ?? n(r, i), i), Reflect.set(e, r, i);
        },
      },
    );
    (this.#t = (e.hydrate ? Ci : Si)(e.component, {
      target: e.target,
      anchor: e.anchor,
      props: r,
      context: e.context,
      intro: e.intro ?? !1,
      recover: e.recover,
      transformError: e.transformError,
    })),
      !k && (!e?.props?.$$host || e.sync === !1) && Gt(),
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
        Di(this.#t);
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
function Fa(e, t) {
  if ((k || be(`hydratable`), T)) {
    let t = window.__svelte?.h;
    if (t?.has(e)) return t.get(e);
    Ge(e);
  }
  return t();
}
var Ia = t({
  afterUpdate: () => Ua,
  beforeUpdate: () => Ha,
  createContext: () => at,
  createEventDispatcher: () => Va,
  createRawSnippet: () => Hi,
  flushSync: () => Gt,
  fork: () => en,
  getAbortSignal: () => La,
  getAllContexts: () => lt,
  getContext: () => ot,
  hasContext: () => ct,
  hydratable: () => Fa,
  hydrate: () => Ci,
  mount: () => Si,
  onDestroy: () => za,
  onMount: () => Ra,
  setContext: () => st,
  settled: () => Hr,
  tick: () => Vr,
  unmount: () => Di,
  untrack: () => Gr,
});
function La() {
  return U === null && je(), (U.ac ??= new AbortController()).signal;
}
function Ra(e) {
  A === null && xe(`onMount`),
    rt && A.l !== null
      ? Wa(A).m.push(e)
      : rr(() => {
          let t = Gr(e);
          if (typeof t == `function`) return t;
        });
}
function za(e) {
  A === null && xe(`onDestroy`), Ra(() => () => Gr(e));
}
function Ba(e, t, { bubbles: n = !1, cancelable: r = !1 } = {}) {
  return new CustomEvent(e, { detail: t, bubbles: n, cancelable: r });
}
function Va() {
  let e = A;
  return (
    e === null && xe(`createEventDispatcher`),
    (t, r, i) => {
      let a = e.s.$$events?.[t];
      if (a) {
        let o = n(a) ? a.slice() : [a],
          s = Ba(t, r, i);
        for (let t of o) t.call(e.x, s);
        return !s.defaultPrevented;
      }
      return !0;
    }
  );
}
function Ha(e) {
  A === null && xe(`beforeUpdate`), A.l === null && Ne(`beforeUpdate`), Wa(A).b.push(e);
}
function Ua(e) {
  A === null && xe(`afterUpdate`), A.l === null && Ne(`afterUpdate`), Wa(A).a.push(e);
}
function Wa(e) {
  var t = e.l;
  return (t.u ??= { a: [], b: [], m: [] });
}
export {
  Mt as $,
  li as A,
  ur as B,
  ki as C,
  hi as D,
  yi as E,
  Hr as F,
  Pn as G,
  ar as H,
  Vr as I,
  Hn as J,
  Bn as K,
  Gr as L,
  si as M,
  ai as N,
  _i as O,
  Q as P,
  pn as Q,
  dr as R,
  Ai as S,
  bi as T,
  Jn as U,
  rr as V,
  Fn as W,
  I as X,
  jn as Y,
  Tn as Z,
  Wi as _,
  ja as a,
  st as at,
  Bi as b,
  sa as c,
  m as ct,
  ya as d,
  jt as et,
  _a as f,
  Gi as g,
  Yi as h,
  Ma as i,
  ut as it,
  ci as j,
  vi as k,
  xa as l,
  t as lt,
  ta as m,
  Ra as n,
  ot as nt,
  ka as o,
  Ze as ot,
  ra as p,
  Vn as q,
  Na as r,
  dt as rt,
  Ta as s,
  Xe as st,
  Ia as t,
  Et as tt,
  ga as u,
  Ui as v,
  xi as w,
  Pi as x,
  Vi as y,
  sr as z,
};
