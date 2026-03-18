var Rl = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function Yf(h) {
  return h && h.__esModule && Object.prototype.hasOwnProperty.call(h, "default") ? h.default : h;
}
var Ti = { exports: {} }, kr = {}, Pi = { exports: {} }, Z = {};
var Ra;
function Xf() {
  if (Ra) return Z;
  Ra = 1;
  var h = Symbol.for("react.element"), k = Symbol.for("react.portal"), c = Symbol.for("react.fragment"), x = Symbol.for("react.strict_mode"), L = Symbol.for("react.profiler"), U = Symbol.for("react.provider"), W = Symbol.for("react.context"), b = Symbol.for("react.forward_ref"), C = Symbol.for("react.suspense"), Q = Symbol.for("react.memo"), oe = Symbol.for("react.lazy"), Y = Symbol.iterator;
  function V(f) {
    return f === null || typeof f != "object" ? null : (f = Y && f[Y] || f["@@iterator"], typeof f == "function" ? f : null);
  }
  var ee = { isMounted: function() {
    return !1;
  }, enqueueForceUpdate: function() {
  }, enqueueReplaceState: function() {
  }, enqueueSetState: function() {
  } }, ue = Object.assign, K = {};
  function $(f, v, H) {
    this.props = f, this.context = v, this.refs = K, this.updater = H || ee;
  }
  $.prototype.isReactComponent = {}, $.prototype.setState = function(f, v) {
    if (typeof f != "object" && typeof f != "function" && f != null) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
    this.updater.enqueueSetState(this, f, v, "setState");
  }, $.prototype.forceUpdate = function(f) {
    this.updater.enqueueForceUpdate(this, f, "forceUpdate");
  };
  function he() {
  }
  he.prototype = $.prototype;
  function we(f, v, H) {
    this.props = f, this.context = v, this.refs = K, this.updater = H || ee;
  }
  var ke = we.prototype = new he();
  ke.constructor = we, ue(ke, $.prototype), ke.isPureReactComponent = !0;
  var ce = Array.isArray, I = Object.prototype.hasOwnProperty, M = { current: null }, ne = { key: !0, ref: !0, __self: !0, __source: !0 };
  function se(f, v, H) {
    var G, te = {}, q = null, B = null;
    if (v != null) for (G in v.ref !== void 0 && (B = v.ref), v.key !== void 0 && (q = "" + v.key), v) I.call(v, G) && !ne.hasOwnProperty(G) && (te[G] = v[G]);
    var X = arguments.length - 2;
    if (X === 1) te.children = H;
    else if (1 < X) {
      for (var ie = Array(X), Ue = 0; Ue < X; Ue++) ie[Ue] = arguments[Ue + 2];
      te.children = ie;
    }
    if (f && f.defaultProps) for (G in X = f.defaultProps, X) te[G] === void 0 && (te[G] = X[G]);
    return { $$typeof: h, type: f, key: q, ref: B, props: te, _owner: M.current };
  }
  function Ee(f, v) {
    return { $$typeof: h, type: f.type, key: v, ref: f.ref, props: f.props, _owner: f._owner };
  }
  function ve(f) {
    return typeof f == "object" && f !== null && f.$$typeof === h;
  }
  function je(f) {
    var v = { "=": "=0", ":": "=2" };
    return "$" + f.replace(/[=:]/g, function(H) {
      return v[H];
    });
  }
  var ye = /\/+/g;
  function _e(f, v) {
    return typeof f == "object" && f !== null && f.key != null ? je("" + f.key) : v.toString(36);
  }
  function Me(f, v, H, G, te) {
    var q = typeof f;
    (q === "undefined" || q === "boolean") && (f = null);
    var B = !1;
    if (f === null) B = !0;
    else switch (q) {
      case "string":
      case "number":
        B = !0;
        break;
      case "object":
        switch (f.$$typeof) {
          case h:
          case k:
            B = !0;
        }
    }
    if (B) return B = f, te = te(B), f = G === "" ? "." + _e(B, 0) : G, ce(te) ? (H = "", f != null && (H = f.replace(ye, "$&/") + "/"), Me(te, v, H, "", function(Ue) {
      return Ue;
    })) : te != null && (ve(te) && (te = Ee(te, H + (!te.key || B && B.key === te.key ? "" : ("" + te.key).replace(ye, "$&/") + "/") + f)), v.push(te)), 1;
    if (B = 0, G = G === "" ? "." : G + ":", ce(f)) for (var X = 0; X < f.length; X++) {
      q = f[X];
      var ie = G + _e(q, X);
      B += Me(q, v, H, ie, te);
    }
    else if (ie = V(f), typeof ie == "function") for (f = ie.call(f), X = 0; !(q = f.next()).done; ) q = q.value, ie = G + _e(q, X++), B += Me(q, v, H, ie, te);
    else if (q === "object") throw v = String(f), Error("Objects are not valid as a React child (found: " + (v === "[object Object]" ? "object with keys {" + Object.keys(f).join(", ") + "}" : v) + "). If you meant to render a collection of children, use an array instead.");
    return B;
  }
  function qe(f, v, H) {
    if (f == null) return f;
    var G = [], te = 0;
    return Me(f, G, "", "", function(q) {
      return v.call(H, q, te++);
    }), G;
  }
  function Pe(f) {
    if (f._status === -1) {
      var v = f._result;
      v = v(), v.then(function(H) {
        (f._status === 0 || f._status === -1) && (f._status = 1, f._result = H);
      }, function(H) {
        (f._status === 0 || f._status === -1) && (f._status = 2, f._result = H);
      }), f._status === -1 && (f._status = 0, f._result = v);
    }
    if (f._status === 1) return f._result.default;
    throw f._result;
  }
  var fe = { current: null }, E = { transition: null }, F = { ReactCurrentDispatcher: fe, ReactCurrentBatchConfig: E, ReactCurrentOwner: M };
  function N() {
    throw Error("act(...) is not supported in production builds of React.");
  }
  return Z.Children = { map: qe, forEach: function(f, v, H) {
    qe(f, function() {
      v.apply(this, arguments);
    }, H);
  }, count: function(f) {
    var v = 0;
    return qe(f, function() {
      v++;
    }), v;
  }, toArray: function(f) {
    return qe(f, function(v) {
      return v;
    }) || [];
  }, only: function(f) {
    if (!ve(f)) throw Error("React.Children.only expected to receive a single React element child.");
    return f;
  } }, Z.Component = $, Z.Fragment = c, Z.Profiler = L, Z.PureComponent = we, Z.StrictMode = x, Z.Suspense = C, Z.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = F, Z.act = N, Z.cloneElement = function(f, v, H) {
    if (f == null) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + f + ".");
    var G = ue({}, f.props), te = f.key, q = f.ref, B = f._owner;
    if (v != null) {
      if (v.ref !== void 0 && (q = v.ref, B = M.current), v.key !== void 0 && (te = "" + v.key), f.type && f.type.defaultProps) var X = f.type.defaultProps;
      for (ie in v) I.call(v, ie) && !ne.hasOwnProperty(ie) && (G[ie] = v[ie] === void 0 && X !== void 0 ? X[ie] : v[ie]);
    }
    var ie = arguments.length - 2;
    if (ie === 1) G.children = H;
    else if (1 < ie) {
      X = Array(ie);
      for (var Ue = 0; Ue < ie; Ue++) X[Ue] = arguments[Ue + 2];
      G.children = X;
    }
    return { $$typeof: h, type: f.type, key: te, ref: q, props: G, _owner: B };
  }, Z.createContext = function(f) {
    return f = { $$typeof: W, _currentValue: f, _currentValue2: f, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null }, f.Provider = { $$typeof: U, _context: f }, f.Consumer = f;
  }, Z.createElement = se, Z.createFactory = function(f) {
    var v = se.bind(null, f);
    return v.type = f, v;
  }, Z.createRef = function() {
    return { current: null };
  }, Z.forwardRef = function(f) {
    return { $$typeof: b, render: f };
  }, Z.isValidElement = ve, Z.lazy = function(f) {
    return { $$typeof: oe, _payload: { _status: -1, _result: f }, _init: Pe };
  }, Z.memo = function(f, v) {
    return { $$typeof: Q, type: f, compare: v === void 0 ? null : v };
  }, Z.startTransition = function(f) {
    var v = E.transition;
    E.transition = {};
    try {
      f();
    } finally {
      E.transition = v;
    }
  }, Z.unstable_act = N, Z.useCallback = function(f, v) {
    return fe.current.useCallback(f, v);
  }, Z.useContext = function(f) {
    return fe.current.useContext(f);
  }, Z.useDebugValue = function() {
  }, Z.useDeferredValue = function(f) {
    return fe.current.useDeferredValue(f);
  }, Z.useEffect = function(f, v) {
    return fe.current.useEffect(f, v);
  }, Z.useId = function() {
    return fe.current.useId();
  }, Z.useImperativeHandle = function(f, v, H) {
    return fe.current.useImperativeHandle(f, v, H);
  }, Z.useInsertionEffect = function(f, v) {
    return fe.current.useInsertionEffect(f, v);
  }, Z.useLayoutEffect = function(f, v) {
    return fe.current.useLayoutEffect(f, v);
  }, Z.useMemo = function(f, v) {
    return fe.current.useMemo(f, v);
  }, Z.useReducer = function(f, v, H) {
    return fe.current.useReducer(f, v, H);
  }, Z.useRef = function(f) {
    return fe.current.useRef(f);
  }, Z.useState = function(f) {
    return fe.current.useState(f);
  }, Z.useSyncExternalStore = function(f, v, H) {
    return fe.current.useSyncExternalStore(f, v, H);
  }, Z.useTransition = function() {
    return fe.current.useTransition();
  }, Z.version = "18.3.1", Z;
}
var ja;
function Di() {
  return ja || (ja = 1, Pi.exports = Xf()), Pi.exports;
}
var Ia;
function Zf() {
  if (Ia) return kr;
  Ia = 1;
  var h = Di(), k = Symbol.for("react.element"), c = Symbol.for("react.fragment"), x = Object.prototype.hasOwnProperty, L = h.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, U = { key: !0, ref: !0, __self: !0, __source: !0 };
  function W(b, C, Q) {
    var oe, Y = {}, V = null, ee = null;
    Q !== void 0 && (V = "" + Q), C.key !== void 0 && (V = "" + C.key), C.ref !== void 0 && (ee = C.ref);
    for (oe in C) x.call(C, oe) && !U.hasOwnProperty(oe) && (Y[oe] = C[oe]);
    if (b && b.defaultProps) for (oe in C = b.defaultProps, C) Y[oe] === void 0 && (Y[oe] = C[oe]);
    return { $$typeof: k, type: b, key: V, ref: ee, props: Y, _owner: L.current };
  }
  return kr.Fragment = c, kr.jsx = W, kr.jsxs = W, kr;
}
var Oa;
function Jf() {
  return Oa || (Oa = 1, Ti.exports = Zf()), Ti.exports;
}
var j = Jf(), J = Di();
const qf = /* @__PURE__ */ Yf(J);
var jl = {}, zi = { exports: {} }, Je = {}, Li = { exports: {} }, Ri = {};
var Da;
function bf() {
  return Da || (Da = 1, (function(h) {
    function k(E, F) {
      var N = E.length;
      E.push(F);
      e: for (; 0 < N; ) {
        var f = N - 1 >>> 1, v = E[f];
        if (0 < L(v, F)) E[f] = F, E[N] = v, N = f;
        else break e;
      }
    }
    function c(E) {
      return E.length === 0 ? null : E[0];
    }
    function x(E) {
      if (E.length === 0) return null;
      var F = E[0], N = E.pop();
      if (N !== F) {
        E[0] = N;
        e: for (var f = 0, v = E.length, H = v >>> 1; f < H; ) {
          var G = 2 * (f + 1) - 1, te = E[G], q = G + 1, B = E[q];
          if (0 > L(te, N)) q < v && 0 > L(B, te) ? (E[f] = B, E[q] = N, f = q) : (E[f] = te, E[G] = N, f = G);
          else if (q < v && 0 > L(B, N)) E[f] = B, E[q] = N, f = q;
          else break e;
        }
      }
      return F;
    }
    function L(E, F) {
      var N = E.sortIndex - F.sortIndex;
      return N !== 0 ? N : E.id - F.id;
    }
    if (typeof performance == "object" && typeof performance.now == "function") {
      var U = performance;
      h.unstable_now = function() {
        return U.now();
      };
    } else {
      var W = Date, b = W.now();
      h.unstable_now = function() {
        return W.now() - b;
      };
    }
    var C = [], Q = [], oe = 1, Y = null, V = 3, ee = !1, ue = !1, K = !1, $ = typeof setTimeout == "function" ? setTimeout : null, he = typeof clearTimeout == "function" ? clearTimeout : null, we = typeof setImmediate < "u" ? setImmediate : null;
    typeof navigator < "u" && navigator.scheduling !== void 0 && navigator.scheduling.isInputPending !== void 0 && navigator.scheduling.isInputPending.bind(navigator.scheduling);
    function ke(E) {
      for (var F = c(Q); F !== null; ) {
        if (F.callback === null) x(Q);
        else if (F.startTime <= E) x(Q), F.sortIndex = F.expirationTime, k(C, F);
        else break;
        F = c(Q);
      }
    }
    function ce(E) {
      if (K = !1, ke(E), !ue) if (c(C) !== null) ue = !0, Pe(I);
      else {
        var F = c(Q);
        F !== null && fe(ce, F.startTime - E);
      }
    }
    function I(E, F) {
      ue = !1, K && (K = !1, he(se), se = -1), ee = !0;
      var N = V;
      try {
        for (ke(F), Y = c(C); Y !== null && (!(Y.expirationTime > F) || E && !je()); ) {
          var f = Y.callback;
          if (typeof f == "function") {
            Y.callback = null, V = Y.priorityLevel;
            var v = f(Y.expirationTime <= F);
            F = h.unstable_now(), typeof v == "function" ? Y.callback = v : Y === c(C) && x(C), ke(F);
          } else x(C);
          Y = c(C);
        }
        if (Y !== null) var H = !0;
        else {
          var G = c(Q);
          G !== null && fe(ce, G.startTime - F), H = !1;
        }
        return H;
      } finally {
        Y = null, V = N, ee = !1;
      }
    }
    var M = !1, ne = null, se = -1, Ee = 5, ve = -1;
    function je() {
      return !(h.unstable_now() - ve < Ee);
    }
    function ye() {
      if (ne !== null) {
        var E = h.unstable_now();
        ve = E;
        var F = !0;
        try {
          F = ne(!0, E);
        } finally {
          F ? _e() : (M = !1, ne = null);
        }
      } else M = !1;
    }
    var _e;
    if (typeof we == "function") _e = function() {
      we(ye);
    };
    else if (typeof MessageChannel < "u") {
      var Me = new MessageChannel(), qe = Me.port2;
      Me.port1.onmessage = ye, _e = function() {
        qe.postMessage(null);
      };
    } else _e = function() {
      $(ye, 0);
    };
    function Pe(E) {
      ne = E, M || (M = !0, _e());
    }
    function fe(E, F) {
      se = $(function() {
        E(h.unstable_now());
      }, F);
    }
    h.unstable_IdlePriority = 5, h.unstable_ImmediatePriority = 1, h.unstable_LowPriority = 4, h.unstable_NormalPriority = 3, h.unstable_Profiling = null, h.unstable_UserBlockingPriority = 2, h.unstable_cancelCallback = function(E) {
      E.callback = null;
    }, h.unstable_continueExecution = function() {
      ue || ee || (ue = !0, Pe(I));
    }, h.unstable_forceFrameRate = function(E) {
      0 > E || 125 < E ? console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported") : Ee = 0 < E ? Math.floor(1e3 / E) : 5;
    }, h.unstable_getCurrentPriorityLevel = function() {
      return V;
    }, h.unstable_getFirstCallbackNode = function() {
      return c(C);
    }, h.unstable_next = function(E) {
      switch (V) {
        case 1:
        case 2:
        case 3:
          var F = 3;
          break;
        default:
          F = V;
      }
      var N = V;
      V = F;
      try {
        return E();
      } finally {
        V = N;
      }
    }, h.unstable_pauseExecution = function() {
    }, h.unstable_requestPaint = function() {
    }, h.unstable_runWithPriority = function(E, F) {
      switch (E) {
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
          break;
        default:
          E = 3;
      }
      var N = V;
      V = E;
      try {
        return F();
      } finally {
        V = N;
      }
    }, h.unstable_scheduleCallback = function(E, F, N) {
      var f = h.unstable_now();
      switch (typeof N == "object" && N !== null ? (N = N.delay, N = typeof N == "number" && 0 < N ? f + N : f) : N = f, E) {
        case 1:
          var v = -1;
          break;
        case 2:
          v = 250;
          break;
        case 5:
          v = 1073741823;
          break;
        case 4:
          v = 1e4;
          break;
        default:
          v = 5e3;
      }
      return v = N + v, E = { id: oe++, callback: F, priorityLevel: E, startTime: N, expirationTime: v, sortIndex: -1 }, N > f ? (E.sortIndex = N, k(Q, E), c(C) === null && E === c(Q) && (K ? (he(se), se = -1) : K = !0, fe(ce, N - f))) : (E.sortIndex = v, k(C, E), ue || ee || (ue = !0, Pe(I))), E;
    }, h.unstable_shouldYield = je, h.unstable_wrapCallback = function(E) {
      var F = V;
      return function() {
        var N = V;
        V = F;
        try {
          return E.apply(this, arguments);
        } finally {
          V = N;
        }
      };
    };
  })(Ri)), Ri;
}
var Ma;
function ed() {
  return Ma || (Ma = 1, Li.exports = bf()), Li.exports;
}
var Fa;
function td() {
  if (Fa) return Je;
  Fa = 1;
  var h = Di(), k = ed();
  function c(e) {
    for (var t = "https://reactjs.org/docs/error-decoder.html?invariant=" + e, n = 1; n < arguments.length; n++) t += "&args[]=" + encodeURIComponent(arguments[n]);
    return "Minified React error #" + e + "; visit " + t + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  var x = /* @__PURE__ */ new Set(), L = {};
  function U(e, t) {
    W(e, t), W(e + "Capture", t);
  }
  function W(e, t) {
    for (L[e] = t, e = 0; e < t.length; e++) x.add(t[e]);
  }
  var b = !(typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u"), C = Object.prototype.hasOwnProperty, Q = /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/, oe = {}, Y = {};
  function V(e) {
    return C.call(Y, e) ? !0 : C.call(oe, e) ? !1 : Q.test(e) ? Y[e] = !0 : (oe[e] = !0, !1);
  }
  function ee(e, t, n, r) {
    if (n !== null && n.type === 0) return !1;
    switch (typeof t) {
      case "function":
      case "symbol":
        return !0;
      case "boolean":
        return r ? !1 : n !== null ? !n.acceptsBooleans : (e = e.toLowerCase().slice(0, 5), e !== "data-" && e !== "aria-");
      default:
        return !1;
    }
  }
  function ue(e, t, n, r) {
    if (t === null || typeof t > "u" || ee(e, t, n, r)) return !0;
    if (r) return !1;
    if (n !== null) switch (n.type) {
      case 3:
        return !t;
      case 4:
        return t === !1;
      case 5:
        return isNaN(t);
      case 6:
        return isNaN(t) || 1 > t;
    }
    return !1;
  }
  function K(e, t, n, r, l, u, i) {
    this.acceptsBooleans = t === 2 || t === 3 || t === 4, this.attributeName = r, this.attributeNamespace = l, this.mustUseProperty = n, this.propertyName = e, this.type = t, this.sanitizeURL = u, this.removeEmptyString = i;
  }
  var $ = {};
  "children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(e) {
    $[e] = new K(e, 0, !1, e, null, !1, !1);
  }), [["acceptCharset", "accept-charset"], ["className", "class"], ["htmlFor", "for"], ["httpEquiv", "http-equiv"]].forEach(function(e) {
    var t = e[0];
    $[t] = new K(t, 1, !1, e[1], null, !1, !1);
  }), ["contentEditable", "draggable", "spellCheck", "value"].forEach(function(e) {
    $[e] = new K(e, 2, !1, e.toLowerCase(), null, !1, !1);
  }), ["autoReverse", "externalResourcesRequired", "focusable", "preserveAlpha"].forEach(function(e) {
    $[e] = new K(e, 2, !1, e, null, !1, !1);
  }), "allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(e) {
    $[e] = new K(e, 3, !1, e.toLowerCase(), null, !1, !1);
  }), ["checked", "multiple", "muted", "selected"].forEach(function(e) {
    $[e] = new K(e, 3, !0, e, null, !1, !1);
  }), ["capture", "download"].forEach(function(e) {
    $[e] = new K(e, 4, !1, e, null, !1, !1);
  }), ["cols", "rows", "size", "span"].forEach(function(e) {
    $[e] = new K(e, 6, !1, e, null, !1, !1);
  }), ["rowSpan", "start"].forEach(function(e) {
    $[e] = new K(e, 5, !1, e.toLowerCase(), null, !1, !1);
  });
  var he = /[\-:]([a-z])/g;
  function we(e) {
    return e[1].toUpperCase();
  }
  "accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(e) {
    var t = e.replace(
      he,
      we
    );
    $[t] = new K(t, 1, !1, e, null, !1, !1);
  }), "xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(e) {
    var t = e.replace(he, we);
    $[t] = new K(t, 1, !1, e, "http://www.w3.org/1999/xlink", !1, !1);
  }), ["xml:base", "xml:lang", "xml:space"].forEach(function(e) {
    var t = e.replace(he, we);
    $[t] = new K(t, 1, !1, e, "http://www.w3.org/XML/1998/namespace", !1, !1);
  }), ["tabIndex", "crossOrigin"].forEach(function(e) {
    $[e] = new K(e, 1, !1, e.toLowerCase(), null, !1, !1);
  }), $.xlinkHref = new K("xlinkHref", 1, !1, "xlink:href", "http://www.w3.org/1999/xlink", !0, !1), ["src", "href", "action", "formAction"].forEach(function(e) {
    $[e] = new K(e, 1, !1, e.toLowerCase(), null, !0, !0);
  });
  function ke(e, t, n, r) {
    var l = $.hasOwnProperty(t) ? $[t] : null;
    (l !== null ? l.type !== 0 : r || !(2 < t.length) || t[0] !== "o" && t[0] !== "O" || t[1] !== "n" && t[1] !== "N") && (ue(t, n, l, r) && (n = null), r || l === null ? V(t) && (n === null ? e.removeAttribute(t) : e.setAttribute(t, "" + n)) : l.mustUseProperty ? e[l.propertyName] = n === null ? l.type === 3 ? !1 : "" : n : (t = l.attributeName, r = l.attributeNamespace, n === null ? e.removeAttribute(t) : (l = l.type, n = l === 3 || l === 4 && n === !0 ? "" : "" + n, r ? e.setAttributeNS(r, t, n) : e.setAttribute(t, n))));
  }
  var ce = h.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, I = Symbol.for("react.element"), M = Symbol.for("react.portal"), ne = Symbol.for("react.fragment"), se = Symbol.for("react.strict_mode"), Ee = Symbol.for("react.profiler"), ve = Symbol.for("react.provider"), je = Symbol.for("react.context"), ye = Symbol.for("react.forward_ref"), _e = Symbol.for("react.suspense"), Me = Symbol.for("react.suspense_list"), qe = Symbol.for("react.memo"), Pe = Symbol.for("react.lazy"), fe = Symbol.for("react.offscreen"), E = Symbol.iterator;
  function F(e) {
    return e === null || typeof e != "object" ? null : (e = E && e[E] || e["@@iterator"], typeof e == "function" ? e : null);
  }
  var N = Object.assign, f;
  function v(e) {
    if (f === void 0) try {
      throw Error();
    } catch (n) {
      var t = n.stack.trim().match(/\n( *(at )?)/);
      f = t && t[1] || "";
    }
    return `
` + f + e;
  }
  var H = !1;
  function G(e, t) {
    if (!e || H) return "";
    H = !0;
    var n = Error.prepareStackTrace;
    Error.prepareStackTrace = void 0;
    try {
      if (t) if (t = function() {
        throw Error();
      }, Object.defineProperty(t.prototype, "props", { set: function() {
        throw Error();
      } }), typeof Reflect == "object" && Reflect.construct) {
        try {
          Reflect.construct(t, []);
        } catch (m) {
          var r = m;
        }
        Reflect.construct(e, [], t);
      } else {
        try {
          t.call();
        } catch (m) {
          r = m;
        }
        e.call(t.prototype);
      }
      else {
        try {
          throw Error();
        } catch (m) {
          r = m;
        }
        e();
      }
    } catch (m) {
      if (m && r && typeof m.stack == "string") {
        for (var l = m.stack.split(`
`), u = r.stack.split(`
`), i = l.length - 1, o = u.length - 1; 1 <= i && 0 <= o && l[i] !== u[o]; ) o--;
        for (; 1 <= i && 0 <= o; i--, o--) if (l[i] !== u[o]) {
          if (i !== 1 || o !== 1)
            do
              if (i--, o--, 0 > o || l[i] !== u[o]) {
                var s = `
` + l[i].replace(" at new ", " at ");
                return e.displayName && s.includes("<anonymous>") && (s = s.replace("<anonymous>", e.displayName)), s;
              }
            while (1 <= i && 0 <= o);
          break;
        }
      }
    } finally {
      H = !1, Error.prepareStackTrace = n;
    }
    return (e = e ? e.displayName || e.name : "") ? v(e) : "";
  }
  function te(e) {
    switch (e.tag) {
      case 5:
        return v(e.type);
      case 16:
        return v("Lazy");
      case 13:
        return v("Suspense");
      case 19:
        return v("SuspenseList");
      case 0:
      case 2:
      case 15:
        return e = G(e.type, !1), e;
      case 11:
        return e = G(e.type.render, !1), e;
      case 1:
        return e = G(e.type, !0), e;
      default:
        return "";
    }
  }
  function q(e) {
    if (e == null) return null;
    if (typeof e == "function") return e.displayName || e.name || null;
    if (typeof e == "string") return e;
    switch (e) {
      case ne:
        return "Fragment";
      case M:
        return "Portal";
      case Ee:
        return "Profiler";
      case se:
        return "StrictMode";
      case _e:
        return "Suspense";
      case Me:
        return "SuspenseList";
    }
    if (typeof e == "object") switch (e.$$typeof) {
      case je:
        return (e.displayName || "Context") + ".Consumer";
      case ve:
        return (e._context.displayName || "Context") + ".Provider";
      case ye:
        var t = e.render;
        return e = e.displayName, e || (e = t.displayName || t.name || "", e = e !== "" ? "ForwardRef(" + e + ")" : "ForwardRef"), e;
      case qe:
        return t = e.displayName || null, t !== null ? t : q(e.type) || "Memo";
      case Pe:
        t = e._payload, e = e._init;
        try {
          return q(e(t));
        } catch {
        }
    }
    return null;
  }
  function B(e) {
    var t = e.type;
    switch (e.tag) {
      case 24:
        return "Cache";
      case 9:
        return (t.displayName || "Context") + ".Consumer";
      case 10:
        return (t._context.displayName || "Context") + ".Provider";
      case 18:
        return "DehydratedFragment";
      case 11:
        return e = t.render, e = e.displayName || e.name || "", t.displayName || (e !== "" ? "ForwardRef(" + e + ")" : "ForwardRef");
      case 7:
        return "Fragment";
      case 5:
        return t;
      case 4:
        return "Portal";
      case 3:
        return "Root";
      case 6:
        return "Text";
      case 16:
        return q(t);
      case 8:
        return t === se ? "StrictMode" : "Mode";
      case 22:
        return "Offscreen";
      case 12:
        return "Profiler";
      case 21:
        return "Scope";
      case 13:
        return "Suspense";
      case 19:
        return "SuspenseList";
      case 25:
        return "TracingMarker";
      case 1:
      case 0:
      case 17:
      case 2:
      case 14:
      case 15:
        if (typeof t == "function") return t.displayName || t.name || null;
        if (typeof t == "string") return t;
    }
    return null;
  }
  function X(e) {
    switch (typeof e) {
      case "boolean":
      case "number":
      case "string":
      case "undefined":
        return e;
      case "object":
        return e;
      default:
        return "";
    }
  }
  function ie(e) {
    var t = e.type;
    return (e = e.nodeName) && e.toLowerCase() === "input" && (t === "checkbox" || t === "radio");
  }
  function Ue(e) {
    var t = ie(e) ? "checked" : "value", n = Object.getOwnPropertyDescriptor(e.constructor.prototype, t), r = "" + e[t];
    if (!e.hasOwnProperty(t) && typeof n < "u" && typeof n.get == "function" && typeof n.set == "function") {
      var l = n.get, u = n.set;
      return Object.defineProperty(e, t, { configurable: !0, get: function() {
        return l.call(this);
      }, set: function(i) {
        r = "" + i, u.call(this, i);
      } }), Object.defineProperty(e, t, { enumerable: n.enumerable }), { getValue: function() {
        return r;
      }, setValue: function(i) {
        r = "" + i;
      }, stopTracking: function() {
        e._valueTracker = null, delete e[t];
      } };
    }
  }
  function Sr(e) {
    e._valueTracker || (e._valueTracker = Ue(e));
  }
  function Mi(e) {
    if (!e) return !1;
    var t = e._valueTracker;
    if (!t) return !0;
    var n = t.getValue(), r = "";
    return e && (r = ie(e) ? e.checked ? "true" : "false" : e.value), e = r, e !== n ? (t.setValue(e), !0) : !1;
  }
  function xr(e) {
    if (e = e || (typeof document < "u" ? document : void 0), typeof e > "u") return null;
    try {
      return e.activeElement || e.body;
    } catch {
      return e.body;
    }
  }
  function Ol(e, t) {
    var n = t.checked;
    return N({}, t, { defaultChecked: void 0, defaultValue: void 0, value: void 0, checked: n ?? e._wrapperState.initialChecked });
  }
  function Fi(e, t) {
    var n = t.defaultValue == null ? "" : t.defaultValue, r = t.checked != null ? t.checked : t.defaultChecked;
    n = X(t.value != null ? t.value : n), e._wrapperState = { initialChecked: r, initialValue: n, controlled: t.type === "checkbox" || t.type === "radio" ? t.checked != null : t.value != null };
  }
  function Ai(e, t) {
    t = t.checked, t != null && ke(e, "checked", t, !1);
  }
  function Dl(e, t) {
    Ai(e, t);
    var n = X(t.value), r = t.type;
    if (n != null) r === "number" ? (n === 0 && e.value === "" || e.value != n) && (e.value = "" + n) : e.value !== "" + n && (e.value = "" + n);
    else if (r === "submit" || r === "reset") {
      e.removeAttribute("value");
      return;
    }
    t.hasOwnProperty("value") ? Ml(e, t.type, n) : t.hasOwnProperty("defaultValue") && Ml(e, t.type, X(t.defaultValue)), t.checked == null && t.defaultChecked != null && (e.defaultChecked = !!t.defaultChecked);
  }
  function Ui(e, t, n) {
    if (t.hasOwnProperty("value") || t.hasOwnProperty("defaultValue")) {
      var r = t.type;
      if (!(r !== "submit" && r !== "reset" || t.value !== void 0 && t.value !== null)) return;
      t = "" + e._wrapperState.initialValue, n || t === e.value || (e.value = t), e.defaultValue = t;
    }
    n = e.name, n !== "" && (e.name = ""), e.defaultChecked = !!e._wrapperState.initialChecked, n !== "" && (e.name = n);
  }
  function Ml(e, t, n) {
    (t !== "number" || xr(e.ownerDocument) !== e) && (n == null ? e.defaultValue = "" + e._wrapperState.initialValue : e.defaultValue !== "" + n && (e.defaultValue = "" + n));
  }
  var Dn = Array.isArray;
  function sn(e, t, n, r) {
    if (e = e.options, t) {
      t = {};
      for (var l = 0; l < n.length; l++) t["$" + n[l]] = !0;
      for (n = 0; n < e.length; n++) l = t.hasOwnProperty("$" + e[n].value), e[n].selected !== l && (e[n].selected = l), l && r && (e[n].defaultSelected = !0);
    } else {
      for (n = "" + X(n), t = null, l = 0; l < e.length; l++) {
        if (e[l].value === n) {
          e[l].selected = !0, r && (e[l].defaultSelected = !0);
          return;
        }
        t !== null || e[l].disabled || (t = e[l]);
      }
      t !== null && (t.selected = !0);
    }
  }
  function Fl(e, t) {
    if (t.dangerouslySetInnerHTML != null) throw Error(c(91));
    return N({}, t, { value: void 0, defaultValue: void 0, children: "" + e._wrapperState.initialValue });
  }
  function Bi(e, t) {
    var n = t.value;
    if (n == null) {
      if (n = t.children, t = t.defaultValue, n != null) {
        if (t != null) throw Error(c(92));
        if (Dn(n)) {
          if (1 < n.length) throw Error(c(93));
          n = n[0];
        }
        t = n;
      }
      t == null && (t = ""), n = t;
    }
    e._wrapperState = { initialValue: X(n) };
  }
  function Vi(e, t) {
    var n = X(t.value), r = X(t.defaultValue);
    n != null && (n = "" + n, n !== e.value && (e.value = n), t.defaultValue == null && e.defaultValue !== n && (e.defaultValue = n)), r != null && (e.defaultValue = "" + r);
  }
  function Hi(e) {
    var t = e.textContent;
    t === e._wrapperState.initialValue && t !== "" && t !== null && (e.value = t);
  }
  function Wi(e) {
    switch (e) {
      case "svg":
        return "http://www.w3.org/2000/svg";
      case "math":
        return "http://www.w3.org/1998/Math/MathML";
      default:
        return "http://www.w3.org/1999/xhtml";
    }
  }
  function Al(e, t) {
    return e == null || e === "http://www.w3.org/1999/xhtml" ? Wi(t) : e === "http://www.w3.org/2000/svg" && t === "foreignObject" ? "http://www.w3.org/1999/xhtml" : e;
  }
  var Er, Qi = (function(e) {
    return typeof MSApp < "u" && MSApp.execUnsafeLocalFunction ? function(t, n, r, l) {
      MSApp.execUnsafeLocalFunction(function() {
        return e(t, n, r, l);
      });
    } : e;
  })(function(e, t) {
    if (e.namespaceURI !== "http://www.w3.org/2000/svg" || "innerHTML" in e) e.innerHTML = t;
    else {
      for (Er = Er || document.createElement("div"), Er.innerHTML = "<svg>" + t.valueOf().toString() + "</svg>", t = Er.firstChild; e.firstChild; ) e.removeChild(e.firstChild);
      for (; t.firstChild; ) e.appendChild(t.firstChild);
    }
  });
  function Mn(e, t) {
    if (t) {
      var n = e.firstChild;
      if (n && n === e.lastChild && n.nodeType === 3) {
        n.nodeValue = t;
        return;
      }
    }
    e.textContent = t;
  }
  var Fn = {
    animationIterationCount: !0,
    aspectRatio: !0,
    borderImageOutset: !0,
    borderImageSlice: !0,
    borderImageWidth: !0,
    boxFlex: !0,
    boxFlexGroup: !0,
    boxOrdinalGroup: !0,
    columnCount: !0,
    columns: !0,
    flex: !0,
    flexGrow: !0,
    flexPositive: !0,
    flexShrink: !0,
    flexNegative: !0,
    flexOrder: !0,
    gridArea: !0,
    gridRow: !0,
    gridRowEnd: !0,
    gridRowSpan: !0,
    gridRowStart: !0,
    gridColumn: !0,
    gridColumnEnd: !0,
    gridColumnSpan: !0,
    gridColumnStart: !0,
    fontWeight: !0,
    lineClamp: !0,
    lineHeight: !0,
    opacity: !0,
    order: !0,
    orphans: !0,
    tabSize: !0,
    widows: !0,
    zIndex: !0,
    zoom: !0,
    fillOpacity: !0,
    floodOpacity: !0,
    stopOpacity: !0,
    strokeDasharray: !0,
    strokeDashoffset: !0,
    strokeMiterlimit: !0,
    strokeOpacity: !0,
    strokeWidth: !0
  }, Ja = ["Webkit", "ms", "Moz", "O"];
  Object.keys(Fn).forEach(function(e) {
    Ja.forEach(function(t) {
      t = t + e.charAt(0).toUpperCase() + e.substring(1), Fn[t] = Fn[e];
    });
  });
  function $i(e, t, n) {
    return t == null || typeof t == "boolean" || t === "" ? "" : n || typeof t != "number" || t === 0 || Fn.hasOwnProperty(e) && Fn[e] ? ("" + t).trim() : t + "px";
  }
  function Ki(e, t) {
    e = e.style;
    for (var n in t) if (t.hasOwnProperty(n)) {
      var r = n.indexOf("--") === 0, l = $i(n, t[n], r);
      n === "float" && (n = "cssFloat"), r ? e.setProperty(n, l) : e[n] = l;
    }
  }
  var qa = N({ menuitem: !0 }, { area: !0, base: !0, br: !0, col: !0, embed: !0, hr: !0, img: !0, input: !0, keygen: !0, link: !0, meta: !0, param: !0, source: !0, track: !0, wbr: !0 });
  function Ul(e, t) {
    if (t) {
      if (qa[e] && (t.children != null || t.dangerouslySetInnerHTML != null)) throw Error(c(137, e));
      if (t.dangerouslySetInnerHTML != null) {
        if (t.children != null) throw Error(c(60));
        if (typeof t.dangerouslySetInnerHTML != "object" || !("__html" in t.dangerouslySetInnerHTML)) throw Error(c(61));
      }
      if (t.style != null && typeof t.style != "object") throw Error(c(62));
    }
  }
  function Bl(e, t) {
    if (e.indexOf("-") === -1) return typeof t.is == "string";
    switch (e) {
      case "annotation-xml":
      case "color-profile":
      case "font-face":
      case "font-face-src":
      case "font-face-uri":
      case "font-face-format":
      case "font-face-name":
      case "missing-glyph":
        return !1;
      default:
        return !0;
    }
  }
  var Vl = null;
  function Hl(e) {
    return e = e.target || e.srcElement || window, e.correspondingUseElement && (e = e.correspondingUseElement), e.nodeType === 3 ? e.parentNode : e;
  }
  var Wl = null, an = null, cn = null;
  function Gi(e) {
    if (e = ur(e)) {
      if (typeof Wl != "function") throw Error(c(280));
      var t = e.stateNode;
      t && (t = Kr(t), Wl(e.stateNode, e.type, t));
    }
  }
  function Yi(e) {
    an ? cn ? cn.push(e) : cn = [e] : an = e;
  }
  function Xi() {
    if (an) {
      var e = an, t = cn;
      if (cn = an = null, Gi(e), t) for (e = 0; e < t.length; e++) Gi(t[e]);
    }
  }
  function Zi(e, t) {
    return e(t);
  }
  function Ji() {
  }
  var Ql = !1;
  function qi(e, t, n) {
    if (Ql) return e(t, n);
    Ql = !0;
    try {
      return Zi(e, t, n);
    } finally {
      Ql = !1, (an !== null || cn !== null) && (Ji(), Xi());
    }
  }
  function An(e, t) {
    var n = e.stateNode;
    if (n === null) return null;
    var r = Kr(n);
    if (r === null) return null;
    n = r[t];
    e: switch (t) {
      case "onClick":
      case "onClickCapture":
      case "onDoubleClick":
      case "onDoubleClickCapture":
      case "onMouseDown":
      case "onMouseDownCapture":
      case "onMouseMove":
      case "onMouseMoveCapture":
      case "onMouseUp":
      case "onMouseUpCapture":
      case "onMouseEnter":
        (r = !r.disabled) || (e = e.type, r = !(e === "button" || e === "input" || e === "select" || e === "textarea")), e = !r;
        break e;
      default:
        e = !1;
    }
    if (e) return null;
    if (n && typeof n != "function") throw Error(c(231, t, typeof n));
    return n;
  }
  var $l = !1;
  if (b) try {
    var Un = {};
    Object.defineProperty(Un, "passive", { get: function() {
      $l = !0;
    } }), window.addEventListener("test", Un, Un), window.removeEventListener("test", Un, Un);
  } catch {
    $l = !1;
  }
  function ba(e, t, n, r, l, u, i, o, s) {
    var m = Array.prototype.slice.call(arguments, 3);
    try {
      t.apply(n, m);
    } catch (g) {
      this.onError(g);
    }
  }
  var Bn = !1, Cr = null, _r = !1, Kl = null, ec = { onError: function(e) {
    Bn = !0, Cr = e;
  } };
  function tc(e, t, n, r, l, u, i, o, s) {
    Bn = !1, Cr = null, ba.apply(ec, arguments);
  }
  function nc(e, t, n, r, l, u, i, o, s) {
    if (tc.apply(this, arguments), Bn) {
      if (Bn) {
        var m = Cr;
        Bn = !1, Cr = null;
      } else throw Error(c(198));
      _r || (_r = !0, Kl = m);
    }
  }
  function Yt(e) {
    var t = e, n = e;
    if (e.alternate) for (; t.return; ) t = t.return;
    else {
      e = t;
      do
        t = e, (t.flags & 4098) !== 0 && (n = t.return), e = t.return;
      while (e);
    }
    return t.tag === 3 ? n : null;
  }
  function bi(e) {
    if (e.tag === 13) {
      var t = e.memoizedState;
      if (t === null && (e = e.alternate, e !== null && (t = e.memoizedState)), t !== null) return t.dehydrated;
    }
    return null;
  }
  function eo(e) {
    if (Yt(e) !== e) throw Error(c(188));
  }
  function rc(e) {
    var t = e.alternate;
    if (!t) {
      if (t = Yt(e), t === null) throw Error(c(188));
      return t !== e ? null : e;
    }
    for (var n = e, r = t; ; ) {
      var l = n.return;
      if (l === null) break;
      var u = l.alternate;
      if (u === null) {
        if (r = l.return, r !== null) {
          n = r;
          continue;
        }
        break;
      }
      if (l.child === u.child) {
        for (u = l.child; u; ) {
          if (u === n) return eo(l), e;
          if (u === r) return eo(l), t;
          u = u.sibling;
        }
        throw Error(c(188));
      }
      if (n.return !== r.return) n = l, r = u;
      else {
        for (var i = !1, o = l.child; o; ) {
          if (o === n) {
            i = !0, n = l, r = u;
            break;
          }
          if (o === r) {
            i = !0, r = l, n = u;
            break;
          }
          o = o.sibling;
        }
        if (!i) {
          for (o = u.child; o; ) {
            if (o === n) {
              i = !0, n = u, r = l;
              break;
            }
            if (o === r) {
              i = !0, r = u, n = l;
              break;
            }
            o = o.sibling;
          }
          if (!i) throw Error(c(189));
        }
      }
      if (n.alternate !== r) throw Error(c(190));
    }
    if (n.tag !== 3) throw Error(c(188));
    return n.stateNode.current === n ? e : t;
  }
  function to(e) {
    return e = rc(e), e !== null ? no(e) : null;
  }
  function no(e) {
    if (e.tag === 5 || e.tag === 6) return e;
    for (e = e.child; e !== null; ) {
      var t = no(e);
      if (t !== null) return t;
      e = e.sibling;
    }
    return null;
  }
  var ro = k.unstable_scheduleCallback, lo = k.unstable_cancelCallback, lc = k.unstable_shouldYield, uc = k.unstable_requestPaint, Ne = k.unstable_now, ic = k.unstable_getCurrentPriorityLevel, Gl = k.unstable_ImmediatePriority, uo = k.unstable_UserBlockingPriority, Nr = k.unstable_NormalPriority, oc = k.unstable_LowPriority, io = k.unstable_IdlePriority, Tr = null, vt = null;
  function sc(e) {
    if (vt && typeof vt.onCommitFiberRoot == "function") try {
      vt.onCommitFiberRoot(Tr, e, void 0, (e.current.flags & 128) === 128);
    } catch {
    }
  }
  var at = Math.clz32 ? Math.clz32 : fc, ac = Math.log, cc = Math.LN2;
  function fc(e) {
    return e >>>= 0, e === 0 ? 32 : 31 - (ac(e) / cc | 0) | 0;
  }
  var Pr = 64, zr = 4194304;
  function Vn(e) {
    switch (e & -e) {
      case 1:
        return 1;
      case 2:
        return 2;
      case 4:
        return 4;
      case 8:
        return 8;
      case 16:
        return 16;
      case 32:
        return 32;
      case 64:
      case 128:
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
        return e & 4194240;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
      case 67108864:
        return e & 130023424;
      case 134217728:
        return 134217728;
      case 268435456:
        return 268435456;
      case 536870912:
        return 536870912;
      case 1073741824:
        return 1073741824;
      default:
        return e;
    }
  }
  function Lr(e, t) {
    var n = e.pendingLanes;
    if (n === 0) return 0;
    var r = 0, l = e.suspendedLanes, u = e.pingedLanes, i = n & 268435455;
    if (i !== 0) {
      var o = i & ~l;
      o !== 0 ? r = Vn(o) : (u &= i, u !== 0 && (r = Vn(u)));
    } else i = n & ~l, i !== 0 ? r = Vn(i) : u !== 0 && (r = Vn(u));
    if (r === 0) return 0;
    if (t !== 0 && t !== r && (t & l) === 0 && (l = r & -r, u = t & -t, l >= u || l === 16 && (u & 4194240) !== 0)) return t;
    if ((r & 4) !== 0 && (r |= n & 16), t = e.entangledLanes, t !== 0) for (e = e.entanglements, t &= r; 0 < t; ) n = 31 - at(t), l = 1 << n, r |= e[n], t &= ~l;
    return r;
  }
  function dc(e, t) {
    switch (e) {
      case 1:
      case 2:
      case 4:
        return t + 250;
      case 8:
      case 16:
      case 32:
      case 64:
      case 128:
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
        return t + 5e3;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
      case 67108864:
        return -1;
      case 134217728:
      case 268435456:
      case 536870912:
      case 1073741824:
        return -1;
      default:
        return -1;
    }
  }
  function pc(e, t) {
    for (var n = e.suspendedLanes, r = e.pingedLanes, l = e.expirationTimes, u = e.pendingLanes; 0 < u; ) {
      var i = 31 - at(u), o = 1 << i, s = l[i];
      s === -1 ? ((o & n) === 0 || (o & r) !== 0) && (l[i] = dc(o, t)) : s <= t && (e.expiredLanes |= o), u &= ~o;
    }
  }
  function Yl(e) {
    return e = e.pendingLanes & -1073741825, e !== 0 ? e : e & 1073741824 ? 1073741824 : 0;
  }
  function oo() {
    var e = Pr;
    return Pr <<= 1, (Pr & 4194240) === 0 && (Pr = 64), e;
  }
  function Xl(e) {
    for (var t = [], n = 0; 31 > n; n++) t.push(e);
    return t;
  }
  function Hn(e, t, n) {
    e.pendingLanes |= t, t !== 536870912 && (e.suspendedLanes = 0, e.pingedLanes = 0), e = e.eventTimes, t = 31 - at(t), e[t] = n;
  }
  function mc(e, t) {
    var n = e.pendingLanes & ~t;
    e.pendingLanes = t, e.suspendedLanes = 0, e.pingedLanes = 0, e.expiredLanes &= t, e.mutableReadLanes &= t, e.entangledLanes &= t, t = e.entanglements;
    var r = e.eventTimes;
    for (e = e.expirationTimes; 0 < n; ) {
      var l = 31 - at(n), u = 1 << l;
      t[l] = 0, r[l] = -1, e[l] = -1, n &= ~u;
    }
  }
  function Zl(e, t) {
    var n = e.entangledLanes |= t;
    for (e = e.entanglements; n; ) {
      var r = 31 - at(n), l = 1 << r;
      l & t | e[r] & t && (e[r] |= t), n &= ~l;
    }
  }
  var ae = 0;
  function so(e) {
    return e &= -e, 1 < e ? 4 < e ? (e & 268435455) !== 0 ? 16 : 536870912 : 4 : 1;
  }
  var ao, Jl, co, fo, po, ql = !1, Rr = [], zt = null, Lt = null, Rt = null, Wn = /* @__PURE__ */ new Map(), Qn = /* @__PURE__ */ new Map(), jt = [], hc = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");
  function mo(e, t) {
    switch (e) {
      case "focusin":
      case "focusout":
        zt = null;
        break;
      case "dragenter":
      case "dragleave":
        Lt = null;
        break;
      case "mouseover":
      case "mouseout":
        Rt = null;
        break;
      case "pointerover":
      case "pointerout":
        Wn.delete(t.pointerId);
        break;
      case "gotpointercapture":
      case "lostpointercapture":
        Qn.delete(t.pointerId);
    }
  }
  function $n(e, t, n, r, l, u) {
    return e === null || e.nativeEvent !== u ? (e = { blockedOn: t, domEventName: n, eventSystemFlags: r, nativeEvent: u, targetContainers: [l] }, t !== null && (t = ur(t), t !== null && Jl(t)), e) : (e.eventSystemFlags |= r, t = e.targetContainers, l !== null && t.indexOf(l) === -1 && t.push(l), e);
  }
  function vc(e, t, n, r, l) {
    switch (t) {
      case "focusin":
        return zt = $n(zt, e, t, n, r, l), !0;
      case "dragenter":
        return Lt = $n(Lt, e, t, n, r, l), !0;
      case "mouseover":
        return Rt = $n(Rt, e, t, n, r, l), !0;
      case "pointerover":
        var u = l.pointerId;
        return Wn.set(u, $n(Wn.get(u) || null, e, t, n, r, l)), !0;
      case "gotpointercapture":
        return u = l.pointerId, Qn.set(u, $n(Qn.get(u) || null, e, t, n, r, l)), !0;
    }
    return !1;
  }
  function ho(e) {
    var t = Xt(e.target);
    if (t !== null) {
      var n = Yt(t);
      if (n !== null) {
        if (t = n.tag, t === 13) {
          if (t = bi(n), t !== null) {
            e.blockedOn = t, po(e.priority, function() {
              co(n);
            });
            return;
          }
        } else if (t === 3 && n.stateNode.current.memoizedState.isDehydrated) {
          e.blockedOn = n.tag === 3 ? n.stateNode.containerInfo : null;
          return;
        }
      }
    }
    e.blockedOn = null;
  }
  function jr(e) {
    if (e.blockedOn !== null) return !1;
    for (var t = e.targetContainers; 0 < t.length; ) {
      var n = eu(e.domEventName, e.eventSystemFlags, t[0], e.nativeEvent);
      if (n === null) {
        n = e.nativeEvent;
        var r = new n.constructor(n.type, n);
        Vl = r, n.target.dispatchEvent(r), Vl = null;
      } else return t = ur(n), t !== null && Jl(t), e.blockedOn = n, !1;
      t.shift();
    }
    return !0;
  }
  function vo(e, t, n) {
    jr(e) && n.delete(t);
  }
  function yc() {
    ql = !1, zt !== null && jr(zt) && (zt = null), Lt !== null && jr(Lt) && (Lt = null), Rt !== null && jr(Rt) && (Rt = null), Wn.forEach(vo), Qn.forEach(vo);
  }
  function Kn(e, t) {
    e.blockedOn === t && (e.blockedOn = null, ql || (ql = !0, k.unstable_scheduleCallback(k.unstable_NormalPriority, yc)));
  }
  function Gn(e) {
    function t(l) {
      return Kn(l, e);
    }
    if (0 < Rr.length) {
      Kn(Rr[0], e);
      for (var n = 1; n < Rr.length; n++) {
        var r = Rr[n];
        r.blockedOn === e && (r.blockedOn = null);
      }
    }
    for (zt !== null && Kn(zt, e), Lt !== null && Kn(Lt, e), Rt !== null && Kn(Rt, e), Wn.forEach(t), Qn.forEach(t), n = 0; n < jt.length; n++) r = jt[n], r.blockedOn === e && (r.blockedOn = null);
    for (; 0 < jt.length && (n = jt[0], n.blockedOn === null); ) ho(n), n.blockedOn === null && jt.shift();
  }
  var fn = ce.ReactCurrentBatchConfig, Ir = !0;
  function gc(e, t, n, r) {
    var l = ae, u = fn.transition;
    fn.transition = null;
    try {
      ae = 1, bl(e, t, n, r);
    } finally {
      ae = l, fn.transition = u;
    }
  }
  function wc(e, t, n, r) {
    var l = ae, u = fn.transition;
    fn.transition = null;
    try {
      ae = 4, bl(e, t, n, r);
    } finally {
      ae = l, fn.transition = u;
    }
  }
  function bl(e, t, n, r) {
    if (Ir) {
      var l = eu(e, t, n, r);
      if (l === null) yu(e, t, r, Or, n), mo(e, r);
      else if (vc(l, e, t, n, r)) r.stopPropagation();
      else if (mo(e, r), t & 4 && -1 < hc.indexOf(e)) {
        for (; l !== null; ) {
          var u = ur(l);
          if (u !== null && ao(u), u = eu(e, t, n, r), u === null && yu(e, t, r, Or, n), u === l) break;
          l = u;
        }
        l !== null && r.stopPropagation();
      } else yu(e, t, r, null, n);
    }
  }
  var Or = null;
  function eu(e, t, n, r) {
    if (Or = null, e = Hl(r), e = Xt(e), e !== null) if (t = Yt(e), t === null) e = null;
    else if (n = t.tag, n === 13) {
      if (e = bi(t), e !== null) return e;
      e = null;
    } else if (n === 3) {
      if (t.stateNode.current.memoizedState.isDehydrated) return t.tag === 3 ? t.stateNode.containerInfo : null;
      e = null;
    } else t !== e && (e = null);
    return Or = e, null;
  }
  function yo(e) {
    switch (e) {
      case "cancel":
      case "click":
      case "close":
      case "contextmenu":
      case "copy":
      case "cut":
      case "auxclick":
      case "dblclick":
      case "dragend":
      case "dragstart":
      case "drop":
      case "focusin":
      case "focusout":
      case "input":
      case "invalid":
      case "keydown":
      case "keypress":
      case "keyup":
      case "mousedown":
      case "mouseup":
      case "paste":
      case "pause":
      case "play":
      case "pointercancel":
      case "pointerdown":
      case "pointerup":
      case "ratechange":
      case "reset":
      case "resize":
      case "seeked":
      case "submit":
      case "touchcancel":
      case "touchend":
      case "touchstart":
      case "volumechange":
      case "change":
      case "selectionchange":
      case "textInput":
      case "compositionstart":
      case "compositionend":
      case "compositionupdate":
      case "beforeblur":
      case "afterblur":
      case "beforeinput":
      case "blur":
      case "fullscreenchange":
      case "focus":
      case "hashchange":
      case "popstate":
      case "select":
      case "selectstart":
        return 1;
      case "drag":
      case "dragenter":
      case "dragexit":
      case "dragleave":
      case "dragover":
      case "mousemove":
      case "mouseout":
      case "mouseover":
      case "pointermove":
      case "pointerout":
      case "pointerover":
      case "scroll":
      case "toggle":
      case "touchmove":
      case "wheel":
      case "mouseenter":
      case "mouseleave":
      case "pointerenter":
      case "pointerleave":
        return 4;
      case "message":
        switch (ic()) {
          case Gl:
            return 1;
          case uo:
            return 4;
          case Nr:
          case oc:
            return 16;
          case io:
            return 536870912;
          default:
            return 16;
        }
      default:
        return 16;
    }
  }
  var It = null, tu = null, Dr = null;
  function go() {
    if (Dr) return Dr;
    var e, t = tu, n = t.length, r, l = "value" in It ? It.value : It.textContent, u = l.length;
    for (e = 0; e < n && t[e] === l[e]; e++) ;
    var i = n - e;
    for (r = 1; r <= i && t[n - r] === l[u - r]; r++) ;
    return Dr = l.slice(e, 1 < r ? 1 - r : void 0);
  }
  function Mr(e) {
    var t = e.keyCode;
    return "charCode" in e ? (e = e.charCode, e === 0 && t === 13 && (e = 13)) : e = t, e === 10 && (e = 13), 32 <= e || e === 13 ? e : 0;
  }
  function Fr() {
    return !0;
  }
  function wo() {
    return !1;
  }
  function be(e) {
    function t(n, r, l, u, i) {
      this._reactName = n, this._targetInst = l, this.type = r, this.nativeEvent = u, this.target = i, this.currentTarget = null;
      for (var o in e) e.hasOwnProperty(o) && (n = e[o], this[o] = n ? n(u) : u[o]);
      return this.isDefaultPrevented = (u.defaultPrevented != null ? u.defaultPrevented : u.returnValue === !1) ? Fr : wo, this.isPropagationStopped = wo, this;
    }
    return N(t.prototype, { preventDefault: function() {
      this.defaultPrevented = !0;
      var n = this.nativeEvent;
      n && (n.preventDefault ? n.preventDefault() : typeof n.returnValue != "unknown" && (n.returnValue = !1), this.isDefaultPrevented = Fr);
    }, stopPropagation: function() {
      var n = this.nativeEvent;
      n && (n.stopPropagation ? n.stopPropagation() : typeof n.cancelBubble != "unknown" && (n.cancelBubble = !0), this.isPropagationStopped = Fr);
    }, persist: function() {
    }, isPersistent: Fr }), t;
  }
  var dn = { eventPhase: 0, bubbles: 0, cancelable: 0, timeStamp: function(e) {
    return e.timeStamp || Date.now();
  }, defaultPrevented: 0, isTrusted: 0 }, nu = be(dn), Yn = N({}, dn, { view: 0, detail: 0 }), kc = be(Yn), ru, lu, Xn, Ar = N({}, Yn, { screenX: 0, screenY: 0, clientX: 0, clientY: 0, pageX: 0, pageY: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, getModifierState: iu, button: 0, buttons: 0, relatedTarget: function(e) {
    return e.relatedTarget === void 0 ? e.fromElement === e.srcElement ? e.toElement : e.fromElement : e.relatedTarget;
  }, movementX: function(e) {
    return "movementX" in e ? e.movementX : (e !== Xn && (Xn && e.type === "mousemove" ? (ru = e.screenX - Xn.screenX, lu = e.screenY - Xn.screenY) : lu = ru = 0, Xn = e), ru);
  }, movementY: function(e) {
    return "movementY" in e ? e.movementY : lu;
  } }), ko = be(Ar), Sc = N({}, Ar, { dataTransfer: 0 }), xc = be(Sc), Ec = N({}, Yn, { relatedTarget: 0 }), uu = be(Ec), Cc = N({}, dn, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }), _c = be(Cc), Nc = N({}, dn, { clipboardData: function(e) {
    return "clipboardData" in e ? e.clipboardData : window.clipboardData;
  } }), Tc = be(Nc), Pc = N({}, dn, { data: 0 }), So = be(Pc), zc = {
    Esc: "Escape",
    Spacebar: " ",
    Left: "ArrowLeft",
    Up: "ArrowUp",
    Right: "ArrowRight",
    Down: "ArrowDown",
    Del: "Delete",
    Win: "OS",
    Menu: "ContextMenu",
    Apps: "ContextMenu",
    Scroll: "ScrollLock",
    MozPrintableKey: "Unidentified"
  }, Lc = {
    8: "Backspace",
    9: "Tab",
    12: "Clear",
    13: "Enter",
    16: "Shift",
    17: "Control",
    18: "Alt",
    19: "Pause",
    20: "CapsLock",
    27: "Escape",
    32: " ",
    33: "PageUp",
    34: "PageDown",
    35: "End",
    36: "Home",
    37: "ArrowLeft",
    38: "ArrowUp",
    39: "ArrowRight",
    40: "ArrowDown",
    45: "Insert",
    46: "Delete",
    112: "F1",
    113: "F2",
    114: "F3",
    115: "F4",
    116: "F5",
    117: "F6",
    118: "F7",
    119: "F8",
    120: "F9",
    121: "F10",
    122: "F11",
    123: "F12",
    144: "NumLock",
    145: "ScrollLock",
    224: "Meta"
  }, Rc = { Alt: "altKey", Control: "ctrlKey", Meta: "metaKey", Shift: "shiftKey" };
  function jc(e) {
    var t = this.nativeEvent;
    return t.getModifierState ? t.getModifierState(e) : (e = Rc[e]) ? !!t[e] : !1;
  }
  function iu() {
    return jc;
  }
  var Ic = N({}, Yn, { key: function(e) {
    if (e.key) {
      var t = zc[e.key] || e.key;
      if (t !== "Unidentified") return t;
    }
    return e.type === "keypress" ? (e = Mr(e), e === 13 ? "Enter" : String.fromCharCode(e)) : e.type === "keydown" || e.type === "keyup" ? Lc[e.keyCode] || "Unidentified" : "";
  }, code: 0, location: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, repeat: 0, locale: 0, getModifierState: iu, charCode: function(e) {
    return e.type === "keypress" ? Mr(e) : 0;
  }, keyCode: function(e) {
    return e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
  }, which: function(e) {
    return e.type === "keypress" ? Mr(e) : e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
  } }), Oc = be(Ic), Dc = N({}, Ar, { pointerId: 0, width: 0, height: 0, pressure: 0, tangentialPressure: 0, tiltX: 0, tiltY: 0, twist: 0, pointerType: 0, isPrimary: 0 }), xo = be(Dc), Mc = N({}, Yn, { touches: 0, targetTouches: 0, changedTouches: 0, altKey: 0, metaKey: 0, ctrlKey: 0, shiftKey: 0, getModifierState: iu }), Fc = be(Mc), Ac = N({}, dn, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }), Uc = be(Ac), Bc = N({}, Ar, {
    deltaX: function(e) {
      return "deltaX" in e ? e.deltaX : "wheelDeltaX" in e ? -e.wheelDeltaX : 0;
    },
    deltaY: function(e) {
      return "deltaY" in e ? e.deltaY : "wheelDeltaY" in e ? -e.wheelDeltaY : "wheelDelta" in e ? -e.wheelDelta : 0;
    },
    deltaZ: 0,
    deltaMode: 0
  }), Vc = be(Bc), Hc = [9, 13, 27, 32], ou = b && "CompositionEvent" in window, Zn = null;
  b && "documentMode" in document && (Zn = document.documentMode);
  var Wc = b && "TextEvent" in window && !Zn, Eo = b && (!ou || Zn && 8 < Zn && 11 >= Zn), Co = " ", _o = !1;
  function No(e, t) {
    switch (e) {
      case "keyup":
        return Hc.indexOf(t.keyCode) !== -1;
      case "keydown":
        return t.keyCode !== 229;
      case "keypress":
      case "mousedown":
      case "focusout":
        return !0;
      default:
        return !1;
    }
  }
  function To(e) {
    return e = e.detail, typeof e == "object" && "data" in e ? e.data : null;
  }
  var pn = !1;
  function Qc(e, t) {
    switch (e) {
      case "compositionend":
        return To(t);
      case "keypress":
        return t.which !== 32 ? null : (_o = !0, Co);
      case "textInput":
        return e = t.data, e === Co && _o ? null : e;
      default:
        return null;
    }
  }
  function $c(e, t) {
    if (pn) return e === "compositionend" || !ou && No(e, t) ? (e = go(), Dr = tu = It = null, pn = !1, e) : null;
    switch (e) {
      case "paste":
        return null;
      case "keypress":
        if (!(t.ctrlKey || t.altKey || t.metaKey) || t.ctrlKey && t.altKey) {
          if (t.char && 1 < t.char.length) return t.char;
          if (t.which) return String.fromCharCode(t.which);
        }
        return null;
      case "compositionend":
        return Eo && t.locale !== "ko" ? null : t.data;
      default:
        return null;
    }
  }
  var Kc = { color: !0, date: !0, datetime: !0, "datetime-local": !0, email: !0, month: !0, number: !0, password: !0, range: !0, search: !0, tel: !0, text: !0, time: !0, url: !0, week: !0 };
  function Po(e) {
    var t = e && e.nodeName && e.nodeName.toLowerCase();
    return t === "input" ? !!Kc[e.type] : t === "textarea";
  }
  function zo(e, t, n, r) {
    Yi(r), t = Wr(t, "onChange"), 0 < t.length && (n = new nu("onChange", "change", null, n, r), e.push({ event: n, listeners: t }));
  }
  var Jn = null, qn = null;
  function Gc(e) {
    Go(e, 0);
  }
  function Ur(e) {
    var t = gn(e);
    if (Mi(t)) return e;
  }
  function Yc(e, t) {
    if (e === "change") return t;
  }
  var Lo = !1;
  if (b) {
    var su;
    if (b) {
      var au = "oninput" in document;
      if (!au) {
        var Ro = document.createElement("div");
        Ro.setAttribute("oninput", "return;"), au = typeof Ro.oninput == "function";
      }
      su = au;
    } else su = !1;
    Lo = su && (!document.documentMode || 9 < document.documentMode);
  }
  function jo() {
    Jn && (Jn.detachEvent("onpropertychange", Io), qn = Jn = null);
  }
  function Io(e) {
    if (e.propertyName === "value" && Ur(qn)) {
      var t = [];
      zo(t, qn, e, Hl(e)), qi(Gc, t);
    }
  }
  function Xc(e, t, n) {
    e === "focusin" ? (jo(), Jn = t, qn = n, Jn.attachEvent("onpropertychange", Io)) : e === "focusout" && jo();
  }
  function Zc(e) {
    if (e === "selectionchange" || e === "keyup" || e === "keydown") return Ur(qn);
  }
  function Jc(e, t) {
    if (e === "click") return Ur(t);
  }
  function qc(e, t) {
    if (e === "input" || e === "change") return Ur(t);
  }
  function bc(e, t) {
    return e === t && (e !== 0 || 1 / e === 1 / t) || e !== e && t !== t;
  }
  var ct = typeof Object.is == "function" ? Object.is : bc;
  function bn(e, t) {
    if (ct(e, t)) return !0;
    if (typeof e != "object" || e === null || typeof t != "object" || t === null) return !1;
    var n = Object.keys(e), r = Object.keys(t);
    if (n.length !== r.length) return !1;
    for (r = 0; r < n.length; r++) {
      var l = n[r];
      if (!C.call(t, l) || !ct(e[l], t[l])) return !1;
    }
    return !0;
  }
  function Oo(e) {
    for (; e && e.firstChild; ) e = e.firstChild;
    return e;
  }
  function Do(e, t) {
    var n = Oo(e);
    e = 0;
    for (var r; n; ) {
      if (n.nodeType === 3) {
        if (r = e + n.textContent.length, e <= t && r >= t) return { node: n, offset: t - e };
        e = r;
      }
      e: {
        for (; n; ) {
          if (n.nextSibling) {
            n = n.nextSibling;
            break e;
          }
          n = n.parentNode;
        }
        n = void 0;
      }
      n = Oo(n);
    }
  }
  function Mo(e, t) {
    return e && t ? e === t ? !0 : e && e.nodeType === 3 ? !1 : t && t.nodeType === 3 ? Mo(e, t.parentNode) : "contains" in e ? e.contains(t) : e.compareDocumentPosition ? !!(e.compareDocumentPosition(t) & 16) : !1 : !1;
  }
  function Fo() {
    for (var e = window, t = xr(); t instanceof e.HTMLIFrameElement; ) {
      try {
        var n = typeof t.contentWindow.location.href == "string";
      } catch {
        n = !1;
      }
      if (n) e = t.contentWindow;
      else break;
      t = xr(e.document);
    }
    return t;
  }
  function cu(e) {
    var t = e && e.nodeName && e.nodeName.toLowerCase();
    return t && (t === "input" && (e.type === "text" || e.type === "search" || e.type === "tel" || e.type === "url" || e.type === "password") || t === "textarea" || e.contentEditable === "true");
  }
  function ef(e) {
    var t = Fo(), n = e.focusedElem, r = e.selectionRange;
    if (t !== n && n && n.ownerDocument && Mo(n.ownerDocument.documentElement, n)) {
      if (r !== null && cu(n)) {
        if (t = r.start, e = r.end, e === void 0 && (e = t), "selectionStart" in n) n.selectionStart = t, n.selectionEnd = Math.min(e, n.value.length);
        else if (e = (t = n.ownerDocument || document) && t.defaultView || window, e.getSelection) {
          e = e.getSelection();
          var l = n.textContent.length, u = Math.min(r.start, l);
          r = r.end === void 0 ? u : Math.min(r.end, l), !e.extend && u > r && (l = r, r = u, u = l), l = Do(n, u);
          var i = Do(
            n,
            r
          );
          l && i && (e.rangeCount !== 1 || e.anchorNode !== l.node || e.anchorOffset !== l.offset || e.focusNode !== i.node || e.focusOffset !== i.offset) && (t = t.createRange(), t.setStart(l.node, l.offset), e.removeAllRanges(), u > r ? (e.addRange(t), e.extend(i.node, i.offset)) : (t.setEnd(i.node, i.offset), e.addRange(t)));
        }
      }
      for (t = [], e = n; e = e.parentNode; ) e.nodeType === 1 && t.push({ element: e, left: e.scrollLeft, top: e.scrollTop });
      for (typeof n.focus == "function" && n.focus(), n = 0; n < t.length; n++) e = t[n], e.element.scrollLeft = e.left, e.element.scrollTop = e.top;
    }
  }
  var tf = b && "documentMode" in document && 11 >= document.documentMode, mn = null, fu = null, er = null, du = !1;
  function Ao(e, t, n) {
    var r = n.window === n ? n.document : n.nodeType === 9 ? n : n.ownerDocument;
    du || mn == null || mn !== xr(r) || (r = mn, "selectionStart" in r && cu(r) ? r = { start: r.selectionStart, end: r.selectionEnd } : (r = (r.ownerDocument && r.ownerDocument.defaultView || window).getSelection(), r = { anchorNode: r.anchorNode, anchorOffset: r.anchorOffset, focusNode: r.focusNode, focusOffset: r.focusOffset }), er && bn(er, r) || (er = r, r = Wr(fu, "onSelect"), 0 < r.length && (t = new nu("onSelect", "select", null, t, n), e.push({ event: t, listeners: r }), t.target = mn)));
  }
  function Br(e, t) {
    var n = {};
    return n[e.toLowerCase()] = t.toLowerCase(), n["Webkit" + e] = "webkit" + t, n["Moz" + e] = "moz" + t, n;
  }
  var hn = { animationend: Br("Animation", "AnimationEnd"), animationiteration: Br("Animation", "AnimationIteration"), animationstart: Br("Animation", "AnimationStart"), transitionend: Br("Transition", "TransitionEnd") }, pu = {}, Uo = {};
  b && (Uo = document.createElement("div").style, "AnimationEvent" in window || (delete hn.animationend.animation, delete hn.animationiteration.animation, delete hn.animationstart.animation), "TransitionEvent" in window || delete hn.transitionend.transition);
  function Vr(e) {
    if (pu[e]) return pu[e];
    if (!hn[e]) return e;
    var t = hn[e], n;
    for (n in t) if (t.hasOwnProperty(n) && n in Uo) return pu[e] = t[n];
    return e;
  }
  var Bo = Vr("animationend"), Vo = Vr("animationiteration"), Ho = Vr("animationstart"), Wo = Vr("transitionend"), Qo = /* @__PURE__ */ new Map(), $o = "abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
  function Ot(e, t) {
    Qo.set(e, t), U(t, [e]);
  }
  for (var mu = 0; mu < $o.length; mu++) {
    var hu = $o[mu], nf = hu.toLowerCase(), rf = hu[0].toUpperCase() + hu.slice(1);
    Ot(nf, "on" + rf);
  }
  Ot(Bo, "onAnimationEnd"), Ot(Vo, "onAnimationIteration"), Ot(Ho, "onAnimationStart"), Ot("dblclick", "onDoubleClick"), Ot("focusin", "onFocus"), Ot("focusout", "onBlur"), Ot(Wo, "onTransitionEnd"), W("onMouseEnter", ["mouseout", "mouseover"]), W("onMouseLeave", ["mouseout", "mouseover"]), W("onPointerEnter", ["pointerout", "pointerover"]), W("onPointerLeave", ["pointerout", "pointerover"]), U("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" ")), U("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")), U("onBeforeInput", ["compositionend", "keypress", "textInput", "paste"]), U("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" ")), U("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" ")), U("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
  var tr = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "), lf = new Set("cancel close invalid load scroll toggle".split(" ").concat(tr));
  function Ko(e, t, n) {
    var r = e.type || "unknown-event";
    e.currentTarget = n, nc(r, t, void 0, e), e.currentTarget = null;
  }
  function Go(e, t) {
    t = (t & 4) !== 0;
    for (var n = 0; n < e.length; n++) {
      var r = e[n], l = r.event;
      r = r.listeners;
      e: {
        var u = void 0;
        if (t) for (var i = r.length - 1; 0 <= i; i--) {
          var o = r[i], s = o.instance, m = o.currentTarget;
          if (o = o.listener, s !== u && l.isPropagationStopped()) break e;
          Ko(l, o, m), u = s;
        }
        else for (i = 0; i < r.length; i++) {
          if (o = r[i], s = o.instance, m = o.currentTarget, o = o.listener, s !== u && l.isPropagationStopped()) break e;
          Ko(l, o, m), u = s;
        }
      }
    }
    if (_r) throw e = Kl, _r = !1, Kl = null, e;
  }
  function pe(e, t) {
    var n = t[Eu];
    n === void 0 && (n = t[Eu] = /* @__PURE__ */ new Set());
    var r = e + "__bubble";
    n.has(r) || (Yo(t, e, 2, !1), n.add(r));
  }
  function vu(e, t, n) {
    var r = 0;
    t && (r |= 4), Yo(n, e, r, t);
  }
  var Hr = "_reactListening" + Math.random().toString(36).slice(2);
  function nr(e) {
    if (!e[Hr]) {
      e[Hr] = !0, x.forEach(function(n) {
        n !== "selectionchange" && (lf.has(n) || vu(n, !1, e), vu(n, !0, e));
      });
      var t = e.nodeType === 9 ? e : e.ownerDocument;
      t === null || t[Hr] || (t[Hr] = !0, vu("selectionchange", !1, t));
    }
  }
  function Yo(e, t, n, r) {
    switch (yo(t)) {
      case 1:
        var l = gc;
        break;
      case 4:
        l = wc;
        break;
      default:
        l = bl;
    }
    n = l.bind(null, t, n, e), l = void 0, !$l || t !== "touchstart" && t !== "touchmove" && t !== "wheel" || (l = !0), r ? l !== void 0 ? e.addEventListener(t, n, { capture: !0, passive: l }) : e.addEventListener(t, n, !0) : l !== void 0 ? e.addEventListener(t, n, { passive: l }) : e.addEventListener(t, n, !1);
  }
  function yu(e, t, n, r, l) {
    var u = r;
    if ((t & 1) === 0 && (t & 2) === 0 && r !== null) e: for (; ; ) {
      if (r === null) return;
      var i = r.tag;
      if (i === 3 || i === 4) {
        var o = r.stateNode.containerInfo;
        if (o === l || o.nodeType === 8 && o.parentNode === l) break;
        if (i === 4) for (i = r.return; i !== null; ) {
          var s = i.tag;
          if ((s === 3 || s === 4) && (s = i.stateNode.containerInfo, s === l || s.nodeType === 8 && s.parentNode === l)) return;
          i = i.return;
        }
        for (; o !== null; ) {
          if (i = Xt(o), i === null) return;
          if (s = i.tag, s === 5 || s === 6) {
            r = u = i;
            continue e;
          }
          o = o.parentNode;
        }
      }
      r = r.return;
    }
    qi(function() {
      var m = u, g = Hl(n), w = [];
      e: {
        var y = Qo.get(e);
        if (y !== void 0) {
          var _ = nu, P = e;
          switch (e) {
            case "keypress":
              if (Mr(n) === 0) break e;
            case "keydown":
            case "keyup":
              _ = Oc;
              break;
            case "focusin":
              P = "focus", _ = uu;
              break;
            case "focusout":
              P = "blur", _ = uu;
              break;
            case "beforeblur":
            case "afterblur":
              _ = uu;
              break;
            case "click":
              if (n.button === 2) break e;
            case "auxclick":
            case "dblclick":
            case "mousedown":
            case "mousemove":
            case "mouseup":
            case "mouseout":
            case "mouseover":
            case "contextmenu":
              _ = ko;
              break;
            case "drag":
            case "dragend":
            case "dragenter":
            case "dragexit":
            case "dragleave":
            case "dragover":
            case "dragstart":
            case "drop":
              _ = xc;
              break;
            case "touchcancel":
            case "touchend":
            case "touchmove":
            case "touchstart":
              _ = Fc;
              break;
            case Bo:
            case Vo:
            case Ho:
              _ = _c;
              break;
            case Wo:
              _ = Uc;
              break;
            case "scroll":
              _ = kc;
              break;
            case "wheel":
              _ = Vc;
              break;
            case "copy":
            case "cut":
            case "paste":
              _ = Tc;
              break;
            case "gotpointercapture":
            case "lostpointercapture":
            case "pointercancel":
            case "pointerdown":
            case "pointermove":
            case "pointerout":
            case "pointerover":
            case "pointerup":
              _ = xo;
          }
          var z = (t & 4) !== 0, Te = !z && e === "scroll", d = z ? y !== null ? y + "Capture" : null : y;
          z = [];
          for (var a = m, p; a !== null; ) {
            p = a;
            var S = p.stateNode;
            if (p.tag === 5 && S !== null && (p = S, d !== null && (S = An(a, d), S != null && z.push(rr(a, S, p)))), Te) break;
            a = a.return;
          }
          0 < z.length && (y = new _(y, P, null, n, g), w.push({ event: y, listeners: z }));
        }
      }
      if ((t & 7) === 0) {
        e: {
          if (y = e === "mouseover" || e === "pointerover", _ = e === "mouseout" || e === "pointerout", y && n !== Vl && (P = n.relatedTarget || n.fromElement) && (Xt(P) || P[St])) break e;
          if ((_ || y) && (y = g.window === g ? g : (y = g.ownerDocument) ? y.defaultView || y.parentWindow : window, _ ? (P = n.relatedTarget || n.toElement, _ = m, P = P ? Xt(P) : null, P !== null && (Te = Yt(P), P !== Te || P.tag !== 5 && P.tag !== 6) && (P = null)) : (_ = null, P = m), _ !== P)) {
            if (z = ko, S = "onMouseLeave", d = "onMouseEnter", a = "mouse", (e === "pointerout" || e === "pointerover") && (z = xo, S = "onPointerLeave", d = "onPointerEnter", a = "pointer"), Te = _ == null ? y : gn(_), p = P == null ? y : gn(P), y = new z(S, a + "leave", _, n, g), y.target = Te, y.relatedTarget = p, S = null, Xt(g) === m && (z = new z(d, a + "enter", P, n, g), z.target = p, z.relatedTarget = Te, S = z), Te = S, _ && P) t: {
              for (z = _, d = P, a = 0, p = z; p; p = vn(p)) a++;
              for (p = 0, S = d; S; S = vn(S)) p++;
              for (; 0 < a - p; ) z = vn(z), a--;
              for (; 0 < p - a; ) d = vn(d), p--;
              for (; a--; ) {
                if (z === d || d !== null && z === d.alternate) break t;
                z = vn(z), d = vn(d);
              }
              z = null;
            }
            else z = null;
            _ !== null && Xo(w, y, _, z, !1), P !== null && Te !== null && Xo(w, Te, P, z, !0);
          }
        }
        e: {
          if (y = m ? gn(m) : window, _ = y.nodeName && y.nodeName.toLowerCase(), _ === "select" || _ === "input" && y.type === "file") var R = Yc;
          else if (Po(y)) if (Lo) R = qc;
          else {
            R = Zc;
            var O = Xc;
          }
          else (_ = y.nodeName) && _.toLowerCase() === "input" && (y.type === "checkbox" || y.type === "radio") && (R = Jc);
          if (R && (R = R(e, m))) {
            zo(w, R, n, g);
            break e;
          }
          O && O(e, y, m), e === "focusout" && (O = y._wrapperState) && O.controlled && y.type === "number" && Ml(y, "number", y.value);
        }
        switch (O = m ? gn(m) : window, e) {
          case "focusin":
            (Po(O) || O.contentEditable === "true") && (mn = O, fu = m, er = null);
            break;
          case "focusout":
            er = fu = mn = null;
            break;
          case "mousedown":
            du = !0;
            break;
          case "contextmenu":
          case "mouseup":
          case "dragend":
            du = !1, Ao(w, n, g);
            break;
          case "selectionchange":
            if (tf) break;
          case "keydown":
          case "keyup":
            Ao(w, n, g);
        }
        var D;
        if (ou) e: {
          switch (e) {
            case "compositionstart":
              var A = "onCompositionStart";
              break e;
            case "compositionend":
              A = "onCompositionEnd";
              break e;
            case "compositionupdate":
              A = "onCompositionUpdate";
              break e;
          }
          A = void 0;
        }
        else pn ? No(e, n) && (A = "onCompositionEnd") : e === "keydown" && n.keyCode === 229 && (A = "onCompositionStart");
        A && (Eo && n.locale !== "ko" && (pn || A !== "onCompositionStart" ? A === "onCompositionEnd" && pn && (D = go()) : (It = g, tu = "value" in It ? It.value : It.textContent, pn = !0)), O = Wr(m, A), 0 < O.length && (A = new So(A, e, null, n, g), w.push({ event: A, listeners: O }), D ? A.data = D : (D = To(n), D !== null && (A.data = D)))), (D = Wc ? Qc(e, n) : $c(e, n)) && (m = Wr(m, "onBeforeInput"), 0 < m.length && (g = new So("onBeforeInput", "beforeinput", null, n, g), w.push({ event: g, listeners: m }), g.data = D));
      }
      Go(w, t);
    });
  }
  function rr(e, t, n) {
    return { instance: e, listener: t, currentTarget: n };
  }
  function Wr(e, t) {
    for (var n = t + "Capture", r = []; e !== null; ) {
      var l = e, u = l.stateNode;
      l.tag === 5 && u !== null && (l = u, u = An(e, n), u != null && r.unshift(rr(e, u, l)), u = An(e, t), u != null && r.push(rr(e, u, l))), e = e.return;
    }
    return r;
  }
  function vn(e) {
    if (e === null) return null;
    do
      e = e.return;
    while (e && e.tag !== 5);
    return e || null;
  }
  function Xo(e, t, n, r, l) {
    for (var u = t._reactName, i = []; n !== null && n !== r; ) {
      var o = n, s = o.alternate, m = o.stateNode;
      if (s !== null && s === r) break;
      o.tag === 5 && m !== null && (o = m, l ? (s = An(n, u), s != null && i.unshift(rr(n, s, o))) : l || (s = An(n, u), s != null && i.push(rr(n, s, o)))), n = n.return;
    }
    i.length !== 0 && e.push({ event: t, listeners: i });
  }
  var uf = /\r\n?/g, of = /\u0000|\uFFFD/g;
  function Zo(e) {
    return (typeof e == "string" ? e : "" + e).replace(uf, `
`).replace(of, "");
  }
  function Qr(e, t, n) {
    if (t = Zo(t), Zo(e) !== t && n) throw Error(c(425));
  }
  function $r() {
  }
  var gu = null, wu = null;
  function ku(e, t) {
    return e === "textarea" || e === "noscript" || typeof t.children == "string" || typeof t.children == "number" || typeof t.dangerouslySetInnerHTML == "object" && t.dangerouslySetInnerHTML !== null && t.dangerouslySetInnerHTML.__html != null;
  }
  var Su = typeof setTimeout == "function" ? setTimeout : void 0, sf = typeof clearTimeout == "function" ? clearTimeout : void 0, Jo = typeof Promise == "function" ? Promise : void 0, af = typeof queueMicrotask == "function" ? queueMicrotask : typeof Jo < "u" ? function(e) {
    return Jo.resolve(null).then(e).catch(cf);
  } : Su;
  function cf(e) {
    setTimeout(function() {
      throw e;
    });
  }
  function xu(e, t) {
    var n = t, r = 0;
    do {
      var l = n.nextSibling;
      if (e.removeChild(n), l && l.nodeType === 8) if (n = l.data, n === "/$") {
        if (r === 0) {
          e.removeChild(l), Gn(t);
          return;
        }
        r--;
      } else n !== "$" && n !== "$?" && n !== "$!" || r++;
      n = l;
    } while (n);
    Gn(t);
  }
  function Dt(e) {
    for (; e != null; e = e.nextSibling) {
      var t = e.nodeType;
      if (t === 1 || t === 3) break;
      if (t === 8) {
        if (t = e.data, t === "$" || t === "$!" || t === "$?") break;
        if (t === "/$") return null;
      }
    }
    return e;
  }
  function qo(e) {
    e = e.previousSibling;
    for (var t = 0; e; ) {
      if (e.nodeType === 8) {
        var n = e.data;
        if (n === "$" || n === "$!" || n === "$?") {
          if (t === 0) return e;
          t--;
        } else n === "/$" && t++;
      }
      e = e.previousSibling;
    }
    return null;
  }
  var yn = Math.random().toString(36).slice(2), yt = "__reactFiber$" + yn, lr = "__reactProps$" + yn, St = "__reactContainer$" + yn, Eu = "__reactEvents$" + yn, ff = "__reactListeners$" + yn, df = "__reactHandles$" + yn;
  function Xt(e) {
    var t = e[yt];
    if (t) return t;
    for (var n = e.parentNode; n; ) {
      if (t = n[St] || n[yt]) {
        if (n = t.alternate, t.child !== null || n !== null && n.child !== null) for (e = qo(e); e !== null; ) {
          if (n = e[yt]) return n;
          e = qo(e);
        }
        return t;
      }
      e = n, n = e.parentNode;
    }
    return null;
  }
  function ur(e) {
    return e = e[yt] || e[St], !e || e.tag !== 5 && e.tag !== 6 && e.tag !== 13 && e.tag !== 3 ? null : e;
  }
  function gn(e) {
    if (e.tag === 5 || e.tag === 6) return e.stateNode;
    throw Error(c(33));
  }
  function Kr(e) {
    return e[lr] || null;
  }
  var Cu = [], wn = -1;
  function Mt(e) {
    return { current: e };
  }
  function me(e) {
    0 > wn || (e.current = Cu[wn], Cu[wn] = null, wn--);
  }
  function de(e, t) {
    wn++, Cu[wn] = e.current, e.current = t;
  }
  var Ft = {}, Be = Mt(Ft), Ke = Mt(!1), Zt = Ft;
  function kn(e, t) {
    var n = e.type.contextTypes;
    if (!n) return Ft;
    var r = e.stateNode;
    if (r && r.__reactInternalMemoizedUnmaskedChildContext === t) return r.__reactInternalMemoizedMaskedChildContext;
    var l = {}, u;
    for (u in n) l[u] = t[u];
    return r && (e = e.stateNode, e.__reactInternalMemoizedUnmaskedChildContext = t, e.__reactInternalMemoizedMaskedChildContext = l), l;
  }
  function Ge(e) {
    return e = e.childContextTypes, e != null;
  }
  function Gr() {
    me(Ke), me(Be);
  }
  function bo(e, t, n) {
    if (Be.current !== Ft) throw Error(c(168));
    de(Be, t), de(Ke, n);
  }
  function es(e, t, n) {
    var r = e.stateNode;
    if (t = t.childContextTypes, typeof r.getChildContext != "function") return n;
    r = r.getChildContext();
    for (var l in r) if (!(l in t)) throw Error(c(108, B(e) || "Unknown", l));
    return N({}, n, r);
  }
  function Yr(e) {
    return e = (e = e.stateNode) && e.__reactInternalMemoizedMergedChildContext || Ft, Zt = Be.current, de(Be, e), de(Ke, Ke.current), !0;
  }
  function ts(e, t, n) {
    var r = e.stateNode;
    if (!r) throw Error(c(169));
    n ? (e = es(e, t, Zt), r.__reactInternalMemoizedMergedChildContext = e, me(Ke), me(Be), de(Be, e)) : me(Ke), de(Ke, n);
  }
  var xt = null, Xr = !1, _u = !1;
  function ns(e) {
    xt === null ? xt = [e] : xt.push(e);
  }
  function pf(e) {
    Xr = !0, ns(e);
  }
  function At() {
    if (!_u && xt !== null) {
      _u = !0;
      var e = 0, t = ae;
      try {
        var n = xt;
        for (ae = 1; e < n.length; e++) {
          var r = n[e];
          do
            r = r(!0);
          while (r !== null);
        }
        xt = null, Xr = !1;
      } catch (l) {
        throw xt !== null && (xt = xt.slice(e + 1)), ro(Gl, At), l;
      } finally {
        ae = t, _u = !1;
      }
    }
    return null;
  }
  var Sn = [], xn = 0, Zr = null, Jr = 0, rt = [], lt = 0, Jt = null, Et = 1, Ct = "";
  function qt(e, t) {
    Sn[xn++] = Jr, Sn[xn++] = Zr, Zr = e, Jr = t;
  }
  function rs(e, t, n) {
    rt[lt++] = Et, rt[lt++] = Ct, rt[lt++] = Jt, Jt = e;
    var r = Et;
    e = Ct;
    var l = 32 - at(r) - 1;
    r &= ~(1 << l), n += 1;
    var u = 32 - at(t) + l;
    if (30 < u) {
      var i = l - l % 5;
      u = (r & (1 << i) - 1).toString(32), r >>= i, l -= i, Et = 1 << 32 - at(t) + l | n << l | r, Ct = u + e;
    } else Et = 1 << u | n << l | r, Ct = e;
  }
  function Nu(e) {
    e.return !== null && (qt(e, 1), rs(e, 1, 0));
  }
  function Tu(e) {
    for (; e === Zr; ) Zr = Sn[--xn], Sn[xn] = null, Jr = Sn[--xn], Sn[xn] = null;
    for (; e === Jt; ) Jt = rt[--lt], rt[lt] = null, Ct = rt[--lt], rt[lt] = null, Et = rt[--lt], rt[lt] = null;
  }
  var et = null, tt = null, ge = !1, ft = null;
  function ls(e, t) {
    var n = st(5, null, null, 0);
    n.elementType = "DELETED", n.stateNode = t, n.return = e, t = e.deletions, t === null ? (e.deletions = [n], e.flags |= 16) : t.push(n);
  }
  function us(e, t) {
    switch (e.tag) {
      case 5:
        var n = e.type;
        return t = t.nodeType !== 1 || n.toLowerCase() !== t.nodeName.toLowerCase() ? null : t, t !== null ? (e.stateNode = t, et = e, tt = Dt(t.firstChild), !0) : !1;
      case 6:
        return t = e.pendingProps === "" || t.nodeType !== 3 ? null : t, t !== null ? (e.stateNode = t, et = e, tt = null, !0) : !1;
      case 13:
        return t = t.nodeType !== 8 ? null : t, t !== null ? (n = Jt !== null ? { id: Et, overflow: Ct } : null, e.memoizedState = { dehydrated: t, treeContext: n, retryLane: 1073741824 }, n = st(18, null, null, 0), n.stateNode = t, n.return = e, e.child = n, et = e, tt = null, !0) : !1;
      default:
        return !1;
    }
  }
  function Pu(e) {
    return (e.mode & 1) !== 0 && (e.flags & 128) === 0;
  }
  function zu(e) {
    if (ge) {
      var t = tt;
      if (t) {
        var n = t;
        if (!us(e, t)) {
          if (Pu(e)) throw Error(c(418));
          t = Dt(n.nextSibling);
          var r = et;
          t && us(e, t) ? ls(r, n) : (e.flags = e.flags & -4097 | 2, ge = !1, et = e);
        }
      } else {
        if (Pu(e)) throw Error(c(418));
        e.flags = e.flags & -4097 | 2, ge = !1, et = e;
      }
    }
  }
  function is(e) {
    for (e = e.return; e !== null && e.tag !== 5 && e.tag !== 3 && e.tag !== 13; ) e = e.return;
    et = e;
  }
  function qr(e) {
    if (e !== et) return !1;
    if (!ge) return is(e), ge = !0, !1;
    var t;
    if ((t = e.tag !== 3) && !(t = e.tag !== 5) && (t = e.type, t = t !== "head" && t !== "body" && !ku(e.type, e.memoizedProps)), t && (t = tt)) {
      if (Pu(e)) throw os(), Error(c(418));
      for (; t; ) ls(e, t), t = Dt(t.nextSibling);
    }
    if (is(e), e.tag === 13) {
      if (e = e.memoizedState, e = e !== null ? e.dehydrated : null, !e) throw Error(c(317));
      e: {
        for (e = e.nextSibling, t = 0; e; ) {
          if (e.nodeType === 8) {
            var n = e.data;
            if (n === "/$") {
              if (t === 0) {
                tt = Dt(e.nextSibling);
                break e;
              }
              t--;
            } else n !== "$" && n !== "$!" && n !== "$?" || t++;
          }
          e = e.nextSibling;
        }
        tt = null;
      }
    } else tt = et ? Dt(e.stateNode.nextSibling) : null;
    return !0;
  }
  function os() {
    for (var e = tt; e; ) e = Dt(e.nextSibling);
  }
  function En() {
    tt = et = null, ge = !1;
  }
  function Lu(e) {
    ft === null ? ft = [e] : ft.push(e);
  }
  var mf = ce.ReactCurrentBatchConfig;
  function ir(e, t, n) {
    if (e = n.ref, e !== null && typeof e != "function" && typeof e != "object") {
      if (n._owner) {
        if (n = n._owner, n) {
          if (n.tag !== 1) throw Error(c(309));
          var r = n.stateNode;
        }
        if (!r) throw Error(c(147, e));
        var l = r, u = "" + e;
        return t !== null && t.ref !== null && typeof t.ref == "function" && t.ref._stringRef === u ? t.ref : (t = function(i) {
          var o = l.refs;
          i === null ? delete o[u] : o[u] = i;
        }, t._stringRef = u, t);
      }
      if (typeof e != "string") throw Error(c(284));
      if (!n._owner) throw Error(c(290, e));
    }
    return e;
  }
  function br(e, t) {
    throw e = Object.prototype.toString.call(t), Error(c(31, e === "[object Object]" ? "object with keys {" + Object.keys(t).join(", ") + "}" : e));
  }
  function ss(e) {
    var t = e._init;
    return t(e._payload);
  }
  function as(e) {
    function t(d, a) {
      if (e) {
        var p = d.deletions;
        p === null ? (d.deletions = [a], d.flags |= 16) : p.push(a);
      }
    }
    function n(d, a) {
      if (!e) return null;
      for (; a !== null; ) t(d, a), a = a.sibling;
      return null;
    }
    function r(d, a) {
      for (d = /* @__PURE__ */ new Map(); a !== null; ) a.key !== null ? d.set(a.key, a) : d.set(a.index, a), a = a.sibling;
      return d;
    }
    function l(d, a) {
      return d = Kt(d, a), d.index = 0, d.sibling = null, d;
    }
    function u(d, a, p) {
      return d.index = p, e ? (p = d.alternate, p !== null ? (p = p.index, p < a ? (d.flags |= 2, a) : p) : (d.flags |= 2, a)) : (d.flags |= 1048576, a);
    }
    function i(d) {
      return e && d.alternate === null && (d.flags |= 2), d;
    }
    function o(d, a, p, S) {
      return a === null || a.tag !== 6 ? (a = Si(p, d.mode, S), a.return = d, a) : (a = l(a, p), a.return = d, a);
    }
    function s(d, a, p, S) {
      var R = p.type;
      return R === ne ? g(d, a, p.props.children, S, p.key) : a !== null && (a.elementType === R || typeof R == "object" && R !== null && R.$$typeof === Pe && ss(R) === a.type) ? (S = l(a, p.props), S.ref = ir(d, a, p), S.return = d, S) : (S = El(p.type, p.key, p.props, null, d.mode, S), S.ref = ir(d, a, p), S.return = d, S);
    }
    function m(d, a, p, S) {
      return a === null || a.tag !== 4 || a.stateNode.containerInfo !== p.containerInfo || a.stateNode.implementation !== p.implementation ? (a = xi(p, d.mode, S), a.return = d, a) : (a = l(a, p.children || []), a.return = d, a);
    }
    function g(d, a, p, S, R) {
      return a === null || a.tag !== 7 ? (a = on(p, d.mode, S, R), a.return = d, a) : (a = l(a, p), a.return = d, a);
    }
    function w(d, a, p) {
      if (typeof a == "string" && a !== "" || typeof a == "number") return a = Si("" + a, d.mode, p), a.return = d, a;
      if (typeof a == "object" && a !== null) {
        switch (a.$$typeof) {
          case I:
            return p = El(a.type, a.key, a.props, null, d.mode, p), p.ref = ir(d, null, a), p.return = d, p;
          case M:
            return a = xi(a, d.mode, p), a.return = d, a;
          case Pe:
            var S = a._init;
            return w(d, S(a._payload), p);
        }
        if (Dn(a) || F(a)) return a = on(a, d.mode, p, null), a.return = d, a;
        br(d, a);
      }
      return null;
    }
    function y(d, a, p, S) {
      var R = a !== null ? a.key : null;
      if (typeof p == "string" && p !== "" || typeof p == "number") return R !== null ? null : o(d, a, "" + p, S);
      if (typeof p == "object" && p !== null) {
        switch (p.$$typeof) {
          case I:
            return p.key === R ? s(d, a, p, S) : null;
          case M:
            return p.key === R ? m(d, a, p, S) : null;
          case Pe:
            return R = p._init, y(
              d,
              a,
              R(p._payload),
              S
            );
        }
        if (Dn(p) || F(p)) return R !== null ? null : g(d, a, p, S, null);
        br(d, p);
      }
      return null;
    }
    function _(d, a, p, S, R) {
      if (typeof S == "string" && S !== "" || typeof S == "number") return d = d.get(p) || null, o(a, d, "" + S, R);
      if (typeof S == "object" && S !== null) {
        switch (S.$$typeof) {
          case I:
            return d = d.get(S.key === null ? p : S.key) || null, s(a, d, S, R);
          case M:
            return d = d.get(S.key === null ? p : S.key) || null, m(a, d, S, R);
          case Pe:
            var O = S._init;
            return _(d, a, p, O(S._payload), R);
        }
        if (Dn(S) || F(S)) return d = d.get(p) || null, g(a, d, S, R, null);
        br(a, S);
      }
      return null;
    }
    function P(d, a, p, S) {
      for (var R = null, O = null, D = a, A = a = 0, De = null; D !== null && A < p.length; A++) {
        D.index > A ? (De = D, D = null) : De = D.sibling;
        var le = y(d, D, p[A], S);
        if (le === null) {
          D === null && (D = De);
          break;
        }
        e && D && le.alternate === null && t(d, D), a = u(le, a, A), O === null ? R = le : O.sibling = le, O = le, D = De;
      }
      if (A === p.length) return n(d, D), ge && qt(d, A), R;
      if (D === null) {
        for (; A < p.length; A++) D = w(d, p[A], S), D !== null && (a = u(D, a, A), O === null ? R = D : O.sibling = D, O = D);
        return ge && qt(d, A), R;
      }
      for (D = r(d, D); A < p.length; A++) De = _(D, d, A, p[A], S), De !== null && (e && De.alternate !== null && D.delete(De.key === null ? A : De.key), a = u(De, a, A), O === null ? R = De : O.sibling = De, O = De);
      return e && D.forEach(function(Gt) {
        return t(d, Gt);
      }), ge && qt(d, A), R;
    }
    function z(d, a, p, S) {
      var R = F(p);
      if (typeof R != "function") throw Error(c(150));
      if (p = R.call(p), p == null) throw Error(c(151));
      for (var O = R = null, D = a, A = a = 0, De = null, le = p.next(); D !== null && !le.done; A++, le = p.next()) {
        D.index > A ? (De = D, D = null) : De = D.sibling;
        var Gt = y(d, D, le.value, S);
        if (Gt === null) {
          D === null && (D = De);
          break;
        }
        e && D && Gt.alternate === null && t(d, D), a = u(Gt, a, A), O === null ? R = Gt : O.sibling = Gt, O = Gt, D = De;
      }
      if (le.done) return n(
        d,
        D
      ), ge && qt(d, A), R;
      if (D === null) {
        for (; !le.done; A++, le = p.next()) le = w(d, le.value, S), le !== null && (a = u(le, a, A), O === null ? R = le : O.sibling = le, O = le);
        return ge && qt(d, A), R;
      }
      for (D = r(d, D); !le.done; A++, le = p.next()) le = _(D, d, A, le.value, S), le !== null && (e && le.alternate !== null && D.delete(le.key === null ? A : le.key), a = u(le, a, A), O === null ? R = le : O.sibling = le, O = le);
      return e && D.forEach(function(Gf) {
        return t(d, Gf);
      }), ge && qt(d, A), R;
    }
    function Te(d, a, p, S) {
      if (typeof p == "object" && p !== null && p.type === ne && p.key === null && (p = p.props.children), typeof p == "object" && p !== null) {
        switch (p.$$typeof) {
          case I:
            e: {
              for (var R = p.key, O = a; O !== null; ) {
                if (O.key === R) {
                  if (R = p.type, R === ne) {
                    if (O.tag === 7) {
                      n(d, O.sibling), a = l(O, p.props.children), a.return = d, d = a;
                      break e;
                    }
                  } else if (O.elementType === R || typeof R == "object" && R !== null && R.$$typeof === Pe && ss(R) === O.type) {
                    n(d, O.sibling), a = l(O, p.props), a.ref = ir(d, O, p), a.return = d, d = a;
                    break e;
                  }
                  n(d, O);
                  break;
                } else t(d, O);
                O = O.sibling;
              }
              p.type === ne ? (a = on(p.props.children, d.mode, S, p.key), a.return = d, d = a) : (S = El(p.type, p.key, p.props, null, d.mode, S), S.ref = ir(d, a, p), S.return = d, d = S);
            }
            return i(d);
          case M:
            e: {
              for (O = p.key; a !== null; ) {
                if (a.key === O) if (a.tag === 4 && a.stateNode.containerInfo === p.containerInfo && a.stateNode.implementation === p.implementation) {
                  n(d, a.sibling), a = l(a, p.children || []), a.return = d, d = a;
                  break e;
                } else {
                  n(d, a);
                  break;
                }
                else t(d, a);
                a = a.sibling;
              }
              a = xi(p, d.mode, S), a.return = d, d = a;
            }
            return i(d);
          case Pe:
            return O = p._init, Te(d, a, O(p._payload), S);
        }
        if (Dn(p)) return P(d, a, p, S);
        if (F(p)) return z(d, a, p, S);
        br(d, p);
      }
      return typeof p == "string" && p !== "" || typeof p == "number" ? (p = "" + p, a !== null && a.tag === 6 ? (n(d, a.sibling), a = l(a, p), a.return = d, d = a) : (n(d, a), a = Si(p, d.mode, S), a.return = d, d = a), i(d)) : n(d, a);
    }
    return Te;
  }
  var Cn = as(!0), cs = as(!1), el = Mt(null), tl = null, _n = null, Ru = null;
  function ju() {
    Ru = _n = tl = null;
  }
  function Iu(e) {
    var t = el.current;
    me(el), e._currentValue = t;
  }
  function Ou(e, t, n) {
    for (; e !== null; ) {
      var r = e.alternate;
      if ((e.childLanes & t) !== t ? (e.childLanes |= t, r !== null && (r.childLanes |= t)) : r !== null && (r.childLanes & t) !== t && (r.childLanes |= t), e === n) break;
      e = e.return;
    }
  }
  function Nn(e, t) {
    tl = e, Ru = _n = null, e = e.dependencies, e !== null && e.firstContext !== null && ((e.lanes & t) !== 0 && (Ye = !0), e.firstContext = null);
  }
  function ut(e) {
    var t = e._currentValue;
    if (Ru !== e) if (e = { context: e, memoizedValue: t, next: null }, _n === null) {
      if (tl === null) throw Error(c(308));
      _n = e, tl.dependencies = { lanes: 0, firstContext: e };
    } else _n = _n.next = e;
    return t;
  }
  var bt = null;
  function Du(e) {
    bt === null ? bt = [e] : bt.push(e);
  }
  function fs(e, t, n, r) {
    var l = t.interleaved;
    return l === null ? (n.next = n, Du(t)) : (n.next = l.next, l.next = n), t.interleaved = n, _t(e, r);
  }
  function _t(e, t) {
    e.lanes |= t;
    var n = e.alternate;
    for (n !== null && (n.lanes |= t), n = e, e = e.return; e !== null; ) e.childLanes |= t, n = e.alternate, n !== null && (n.childLanes |= t), n = e, e = e.return;
    return n.tag === 3 ? n.stateNode : null;
  }
  var Ut = !1;
  function Mu(e) {
    e.updateQueue = { baseState: e.memoizedState, firstBaseUpdate: null, lastBaseUpdate: null, shared: { pending: null, interleaved: null, lanes: 0 }, effects: null };
  }
  function ds(e, t) {
    e = e.updateQueue, t.updateQueue === e && (t.updateQueue = { baseState: e.baseState, firstBaseUpdate: e.firstBaseUpdate, lastBaseUpdate: e.lastBaseUpdate, shared: e.shared, effects: e.effects });
  }
  function Nt(e, t) {
    return { eventTime: e, lane: t, tag: 0, payload: null, callback: null, next: null };
  }
  function Bt(e, t, n) {
    var r = e.updateQueue;
    if (r === null) return null;
    if (r = r.shared, (re & 2) !== 0) {
      var l = r.pending;
      return l === null ? t.next = t : (t.next = l.next, l.next = t), r.pending = t, _t(e, n);
    }
    return l = r.interleaved, l === null ? (t.next = t, Du(r)) : (t.next = l.next, l.next = t), r.interleaved = t, _t(e, n);
  }
  function nl(e, t, n) {
    if (t = t.updateQueue, t !== null && (t = t.shared, (n & 4194240) !== 0)) {
      var r = t.lanes;
      r &= e.pendingLanes, n |= r, t.lanes = n, Zl(e, n);
    }
  }
  function ps(e, t) {
    var n = e.updateQueue, r = e.alternate;
    if (r !== null && (r = r.updateQueue, n === r)) {
      var l = null, u = null;
      if (n = n.firstBaseUpdate, n !== null) {
        do {
          var i = { eventTime: n.eventTime, lane: n.lane, tag: n.tag, payload: n.payload, callback: n.callback, next: null };
          u === null ? l = u = i : u = u.next = i, n = n.next;
        } while (n !== null);
        u === null ? l = u = t : u = u.next = t;
      } else l = u = t;
      n = { baseState: r.baseState, firstBaseUpdate: l, lastBaseUpdate: u, shared: r.shared, effects: r.effects }, e.updateQueue = n;
      return;
    }
    e = n.lastBaseUpdate, e === null ? n.firstBaseUpdate = t : e.next = t, n.lastBaseUpdate = t;
  }
  function rl(e, t, n, r) {
    var l = e.updateQueue;
    Ut = !1;
    var u = l.firstBaseUpdate, i = l.lastBaseUpdate, o = l.shared.pending;
    if (o !== null) {
      l.shared.pending = null;
      var s = o, m = s.next;
      s.next = null, i === null ? u = m : i.next = m, i = s;
      var g = e.alternate;
      g !== null && (g = g.updateQueue, o = g.lastBaseUpdate, o !== i && (o === null ? g.firstBaseUpdate = m : o.next = m, g.lastBaseUpdate = s));
    }
    if (u !== null) {
      var w = l.baseState;
      i = 0, g = m = s = null, o = u;
      do {
        var y = o.lane, _ = o.eventTime;
        if ((r & y) === y) {
          g !== null && (g = g.next = {
            eventTime: _,
            lane: 0,
            tag: o.tag,
            payload: o.payload,
            callback: o.callback,
            next: null
          });
          e: {
            var P = e, z = o;
            switch (y = t, _ = n, z.tag) {
              case 1:
                if (P = z.payload, typeof P == "function") {
                  w = P.call(_, w, y);
                  break e;
                }
                w = P;
                break e;
              case 3:
                P.flags = P.flags & -65537 | 128;
              case 0:
                if (P = z.payload, y = typeof P == "function" ? P.call(_, w, y) : P, y == null) break e;
                w = N({}, w, y);
                break e;
              case 2:
                Ut = !0;
            }
          }
          o.callback !== null && o.lane !== 0 && (e.flags |= 64, y = l.effects, y === null ? l.effects = [o] : y.push(o));
        } else _ = { eventTime: _, lane: y, tag: o.tag, payload: o.payload, callback: o.callback, next: null }, g === null ? (m = g = _, s = w) : g = g.next = _, i |= y;
        if (o = o.next, o === null) {
          if (o = l.shared.pending, o === null) break;
          y = o, o = y.next, y.next = null, l.lastBaseUpdate = y, l.shared.pending = null;
        }
      } while (!0);
      if (g === null && (s = w), l.baseState = s, l.firstBaseUpdate = m, l.lastBaseUpdate = g, t = l.shared.interleaved, t !== null) {
        l = t;
        do
          i |= l.lane, l = l.next;
        while (l !== t);
      } else u === null && (l.shared.lanes = 0);
      nn |= i, e.lanes = i, e.memoizedState = w;
    }
  }
  function ms(e, t, n) {
    if (e = t.effects, t.effects = null, e !== null) for (t = 0; t < e.length; t++) {
      var r = e[t], l = r.callback;
      if (l !== null) {
        if (r.callback = null, r = n, typeof l != "function") throw Error(c(191, l));
        l.call(r);
      }
    }
  }
  var or = {}, gt = Mt(or), sr = Mt(or), ar = Mt(or);
  function en(e) {
    if (e === or) throw Error(c(174));
    return e;
  }
  function Fu(e, t) {
    switch (de(ar, t), de(sr, e), de(gt, or), e = t.nodeType, e) {
      case 9:
      case 11:
        t = (t = t.documentElement) ? t.namespaceURI : Al(null, "");
        break;
      default:
        e = e === 8 ? t.parentNode : t, t = e.namespaceURI || null, e = e.tagName, t = Al(t, e);
    }
    me(gt), de(gt, t);
  }
  function Tn() {
    me(gt), me(sr), me(ar);
  }
  function hs(e) {
    en(ar.current);
    var t = en(gt.current), n = Al(t, e.type);
    t !== n && (de(sr, e), de(gt, n));
  }
  function Au(e) {
    sr.current === e && (me(gt), me(sr));
  }
  var Se = Mt(0);
  function ll(e) {
    for (var t = e; t !== null; ) {
      if (t.tag === 13) {
        var n = t.memoizedState;
        if (n !== null && (n = n.dehydrated, n === null || n.data === "$?" || n.data === "$!")) return t;
      } else if (t.tag === 19 && t.memoizedProps.revealOrder !== void 0) {
        if ((t.flags & 128) !== 0) return t;
      } else if (t.child !== null) {
        t.child.return = t, t = t.child;
        continue;
      }
      if (t === e) break;
      for (; t.sibling === null; ) {
        if (t.return === null || t.return === e) return null;
        t = t.return;
      }
      t.sibling.return = t.return, t = t.sibling;
    }
    return null;
  }
  var Uu = [];
  function Bu() {
    for (var e = 0; e < Uu.length; e++) Uu[e]._workInProgressVersionPrimary = null;
    Uu.length = 0;
  }
  var ul = ce.ReactCurrentDispatcher, Vu = ce.ReactCurrentBatchConfig, tn = 0, xe = null, Le = null, Ie = null, il = !1, cr = !1, fr = 0, hf = 0;
  function Ve() {
    throw Error(c(321));
  }
  function Hu(e, t) {
    if (t === null) return !1;
    for (var n = 0; n < t.length && n < e.length; n++) if (!ct(e[n], t[n])) return !1;
    return !0;
  }
  function Wu(e, t, n, r, l, u) {
    if (tn = u, xe = t, t.memoizedState = null, t.updateQueue = null, t.lanes = 0, ul.current = e === null || e.memoizedState === null ? wf : kf, e = n(r, l), cr) {
      u = 0;
      do {
        if (cr = !1, fr = 0, 25 <= u) throw Error(c(301));
        u += 1, Ie = Le = null, t.updateQueue = null, ul.current = Sf, e = n(r, l);
      } while (cr);
    }
    if (ul.current = al, t = Le !== null && Le.next !== null, tn = 0, Ie = Le = xe = null, il = !1, t) throw Error(c(300));
    return e;
  }
  function Qu() {
    var e = fr !== 0;
    return fr = 0, e;
  }
  function wt() {
    var e = { memoizedState: null, baseState: null, baseQueue: null, queue: null, next: null };
    return Ie === null ? xe.memoizedState = Ie = e : Ie = Ie.next = e, Ie;
  }
  function it() {
    if (Le === null) {
      var e = xe.alternate;
      e = e !== null ? e.memoizedState : null;
    } else e = Le.next;
    var t = Ie === null ? xe.memoizedState : Ie.next;
    if (t !== null) Ie = t, Le = e;
    else {
      if (e === null) throw Error(c(310));
      Le = e, e = { memoizedState: Le.memoizedState, baseState: Le.baseState, baseQueue: Le.baseQueue, queue: Le.queue, next: null }, Ie === null ? xe.memoizedState = Ie = e : Ie = Ie.next = e;
    }
    return Ie;
  }
  function dr(e, t) {
    return typeof t == "function" ? t(e) : t;
  }
  function $u(e) {
    var t = it(), n = t.queue;
    if (n === null) throw Error(c(311));
    n.lastRenderedReducer = e;
    var r = Le, l = r.baseQueue, u = n.pending;
    if (u !== null) {
      if (l !== null) {
        var i = l.next;
        l.next = u.next, u.next = i;
      }
      r.baseQueue = l = u, n.pending = null;
    }
    if (l !== null) {
      u = l.next, r = r.baseState;
      var o = i = null, s = null, m = u;
      do {
        var g = m.lane;
        if ((tn & g) === g) s !== null && (s = s.next = { lane: 0, action: m.action, hasEagerState: m.hasEagerState, eagerState: m.eagerState, next: null }), r = m.hasEagerState ? m.eagerState : e(r, m.action);
        else {
          var w = {
            lane: g,
            action: m.action,
            hasEagerState: m.hasEagerState,
            eagerState: m.eagerState,
            next: null
          };
          s === null ? (o = s = w, i = r) : s = s.next = w, xe.lanes |= g, nn |= g;
        }
        m = m.next;
      } while (m !== null && m !== u);
      s === null ? i = r : s.next = o, ct(r, t.memoizedState) || (Ye = !0), t.memoizedState = r, t.baseState = i, t.baseQueue = s, n.lastRenderedState = r;
    }
    if (e = n.interleaved, e !== null) {
      l = e;
      do
        u = l.lane, xe.lanes |= u, nn |= u, l = l.next;
      while (l !== e);
    } else l === null && (n.lanes = 0);
    return [t.memoizedState, n.dispatch];
  }
  function Ku(e) {
    var t = it(), n = t.queue;
    if (n === null) throw Error(c(311));
    n.lastRenderedReducer = e;
    var r = n.dispatch, l = n.pending, u = t.memoizedState;
    if (l !== null) {
      n.pending = null;
      var i = l = l.next;
      do
        u = e(u, i.action), i = i.next;
      while (i !== l);
      ct(u, t.memoizedState) || (Ye = !0), t.memoizedState = u, t.baseQueue === null && (t.baseState = u), n.lastRenderedState = u;
    }
    return [u, r];
  }
  function vs() {
  }
  function ys(e, t) {
    var n = xe, r = it(), l = t(), u = !ct(r.memoizedState, l);
    if (u && (r.memoizedState = l, Ye = !0), r = r.queue, Gu(ks.bind(null, n, r, e), [e]), r.getSnapshot !== t || u || Ie !== null && Ie.memoizedState.tag & 1) {
      if (n.flags |= 2048, pr(9, ws.bind(null, n, r, l, t), void 0, null), Oe === null) throw Error(c(349));
      (tn & 30) !== 0 || gs(n, t, l);
    }
    return l;
  }
  function gs(e, t, n) {
    e.flags |= 16384, e = { getSnapshot: t, value: n }, t = xe.updateQueue, t === null ? (t = { lastEffect: null, stores: null }, xe.updateQueue = t, t.stores = [e]) : (n = t.stores, n === null ? t.stores = [e] : n.push(e));
  }
  function ws(e, t, n, r) {
    t.value = n, t.getSnapshot = r, Ss(t) && xs(e);
  }
  function ks(e, t, n) {
    return n(function() {
      Ss(t) && xs(e);
    });
  }
  function Ss(e) {
    var t = e.getSnapshot;
    e = e.value;
    try {
      var n = t();
      return !ct(e, n);
    } catch {
      return !0;
    }
  }
  function xs(e) {
    var t = _t(e, 1);
    t !== null && ht(t, e, 1, -1);
  }
  function Es(e) {
    var t = wt();
    return typeof e == "function" && (e = e()), t.memoizedState = t.baseState = e, e = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: dr, lastRenderedState: e }, t.queue = e, e = e.dispatch = gf.bind(null, xe, e), [t.memoizedState, e];
  }
  function pr(e, t, n, r) {
    return e = { tag: e, create: t, destroy: n, deps: r, next: null }, t = xe.updateQueue, t === null ? (t = { lastEffect: null, stores: null }, xe.updateQueue = t, t.lastEffect = e.next = e) : (n = t.lastEffect, n === null ? t.lastEffect = e.next = e : (r = n.next, n.next = e, e.next = r, t.lastEffect = e)), e;
  }
  function Cs() {
    return it().memoizedState;
  }
  function ol(e, t, n, r) {
    var l = wt();
    xe.flags |= e, l.memoizedState = pr(1 | t, n, void 0, r === void 0 ? null : r);
  }
  function sl(e, t, n, r) {
    var l = it();
    r = r === void 0 ? null : r;
    var u = void 0;
    if (Le !== null) {
      var i = Le.memoizedState;
      if (u = i.destroy, r !== null && Hu(r, i.deps)) {
        l.memoizedState = pr(t, n, u, r);
        return;
      }
    }
    xe.flags |= e, l.memoizedState = pr(1 | t, n, u, r);
  }
  function _s(e, t) {
    return ol(8390656, 8, e, t);
  }
  function Gu(e, t) {
    return sl(2048, 8, e, t);
  }
  function Ns(e, t) {
    return sl(4, 2, e, t);
  }
  function Ts(e, t) {
    return sl(4, 4, e, t);
  }
  function Ps(e, t) {
    if (typeof t == "function") return e = e(), t(e), function() {
      t(null);
    };
    if (t != null) return e = e(), t.current = e, function() {
      t.current = null;
    };
  }
  function zs(e, t, n) {
    return n = n != null ? n.concat([e]) : null, sl(4, 4, Ps.bind(null, t, e), n);
  }
  function Yu() {
  }
  function Ls(e, t) {
    var n = it();
    t = t === void 0 ? null : t;
    var r = n.memoizedState;
    return r !== null && t !== null && Hu(t, r[1]) ? r[0] : (n.memoizedState = [e, t], e);
  }
  function Rs(e, t) {
    var n = it();
    t = t === void 0 ? null : t;
    var r = n.memoizedState;
    return r !== null && t !== null && Hu(t, r[1]) ? r[0] : (e = e(), n.memoizedState = [e, t], e);
  }
  function js(e, t, n) {
    return (tn & 21) === 0 ? (e.baseState && (e.baseState = !1, Ye = !0), e.memoizedState = n) : (ct(n, t) || (n = oo(), xe.lanes |= n, nn |= n, e.baseState = !0), t);
  }
  function vf(e, t) {
    var n = ae;
    ae = n !== 0 && 4 > n ? n : 4, e(!0);
    var r = Vu.transition;
    Vu.transition = {};
    try {
      e(!1), t();
    } finally {
      ae = n, Vu.transition = r;
    }
  }
  function Is() {
    return it().memoizedState;
  }
  function yf(e, t, n) {
    var r = Qt(e);
    if (n = { lane: r, action: n, hasEagerState: !1, eagerState: null, next: null }, Os(e)) Ds(t, n);
    else if (n = fs(e, t, n, r), n !== null) {
      var l = $e();
      ht(n, e, r, l), Ms(n, t, r);
    }
  }
  function gf(e, t, n) {
    var r = Qt(e), l = { lane: r, action: n, hasEagerState: !1, eagerState: null, next: null };
    if (Os(e)) Ds(t, l);
    else {
      var u = e.alternate;
      if (e.lanes === 0 && (u === null || u.lanes === 0) && (u = t.lastRenderedReducer, u !== null)) try {
        var i = t.lastRenderedState, o = u(i, n);
        if (l.hasEagerState = !0, l.eagerState = o, ct(o, i)) {
          var s = t.interleaved;
          s === null ? (l.next = l, Du(t)) : (l.next = s.next, s.next = l), t.interleaved = l;
          return;
        }
      } catch {
      } finally {
      }
      n = fs(e, t, l, r), n !== null && (l = $e(), ht(n, e, r, l), Ms(n, t, r));
    }
  }
  function Os(e) {
    var t = e.alternate;
    return e === xe || t !== null && t === xe;
  }
  function Ds(e, t) {
    cr = il = !0;
    var n = e.pending;
    n === null ? t.next = t : (t.next = n.next, n.next = t), e.pending = t;
  }
  function Ms(e, t, n) {
    if ((n & 4194240) !== 0) {
      var r = t.lanes;
      r &= e.pendingLanes, n |= r, t.lanes = n, Zl(e, n);
    }
  }
  var al = { readContext: ut, useCallback: Ve, useContext: Ve, useEffect: Ve, useImperativeHandle: Ve, useInsertionEffect: Ve, useLayoutEffect: Ve, useMemo: Ve, useReducer: Ve, useRef: Ve, useState: Ve, useDebugValue: Ve, useDeferredValue: Ve, useTransition: Ve, useMutableSource: Ve, useSyncExternalStore: Ve, useId: Ve, unstable_isNewReconciler: !1 }, wf = { readContext: ut, useCallback: function(e, t) {
    return wt().memoizedState = [e, t === void 0 ? null : t], e;
  }, useContext: ut, useEffect: _s, useImperativeHandle: function(e, t, n) {
    return n = n != null ? n.concat([e]) : null, ol(
      4194308,
      4,
      Ps.bind(null, t, e),
      n
    );
  }, useLayoutEffect: function(e, t) {
    return ol(4194308, 4, e, t);
  }, useInsertionEffect: function(e, t) {
    return ol(4, 2, e, t);
  }, useMemo: function(e, t) {
    var n = wt();
    return t = t === void 0 ? null : t, e = e(), n.memoizedState = [e, t], e;
  }, useReducer: function(e, t, n) {
    var r = wt();
    return t = n !== void 0 ? n(t) : t, r.memoizedState = r.baseState = t, e = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: e, lastRenderedState: t }, r.queue = e, e = e.dispatch = yf.bind(null, xe, e), [r.memoizedState, e];
  }, useRef: function(e) {
    var t = wt();
    return e = { current: e }, t.memoizedState = e;
  }, useState: Es, useDebugValue: Yu, useDeferredValue: function(e) {
    return wt().memoizedState = e;
  }, useTransition: function() {
    var e = Es(!1), t = e[0];
    return e = vf.bind(null, e[1]), wt().memoizedState = e, [t, e];
  }, useMutableSource: function() {
  }, useSyncExternalStore: function(e, t, n) {
    var r = xe, l = wt();
    if (ge) {
      if (n === void 0) throw Error(c(407));
      n = n();
    } else {
      if (n = t(), Oe === null) throw Error(c(349));
      (tn & 30) !== 0 || gs(r, t, n);
    }
    l.memoizedState = n;
    var u = { value: n, getSnapshot: t };
    return l.queue = u, _s(ks.bind(
      null,
      r,
      u,
      e
    ), [e]), r.flags |= 2048, pr(9, ws.bind(null, r, u, n, t), void 0, null), n;
  }, useId: function() {
    var e = wt(), t = Oe.identifierPrefix;
    if (ge) {
      var n = Ct, r = Et;
      n = (r & ~(1 << 32 - at(r) - 1)).toString(32) + n, t = ":" + t + "R" + n, n = fr++, 0 < n && (t += "H" + n.toString(32)), t += ":";
    } else n = hf++, t = ":" + t + "r" + n.toString(32) + ":";
    return e.memoizedState = t;
  }, unstable_isNewReconciler: !1 }, kf = {
    readContext: ut,
    useCallback: Ls,
    useContext: ut,
    useEffect: Gu,
    useImperativeHandle: zs,
    useInsertionEffect: Ns,
    useLayoutEffect: Ts,
    useMemo: Rs,
    useReducer: $u,
    useRef: Cs,
    useState: function() {
      return $u(dr);
    },
    useDebugValue: Yu,
    useDeferredValue: function(e) {
      var t = it();
      return js(t, Le.memoizedState, e);
    },
    useTransition: function() {
      var e = $u(dr)[0], t = it().memoizedState;
      return [e, t];
    },
    useMutableSource: vs,
    useSyncExternalStore: ys,
    useId: Is,
    unstable_isNewReconciler: !1
  }, Sf = { readContext: ut, useCallback: Ls, useContext: ut, useEffect: Gu, useImperativeHandle: zs, useInsertionEffect: Ns, useLayoutEffect: Ts, useMemo: Rs, useReducer: Ku, useRef: Cs, useState: function() {
    return Ku(dr);
  }, useDebugValue: Yu, useDeferredValue: function(e) {
    var t = it();
    return Le === null ? t.memoizedState = e : js(t, Le.memoizedState, e);
  }, useTransition: function() {
    var e = Ku(dr)[0], t = it().memoizedState;
    return [e, t];
  }, useMutableSource: vs, useSyncExternalStore: ys, useId: Is, unstable_isNewReconciler: !1 };
  function dt(e, t) {
    if (e && e.defaultProps) {
      t = N({}, t), e = e.defaultProps;
      for (var n in e) t[n] === void 0 && (t[n] = e[n]);
      return t;
    }
    return t;
  }
  function Xu(e, t, n, r) {
    t = e.memoizedState, n = n(r, t), n = n == null ? t : N({}, t, n), e.memoizedState = n, e.lanes === 0 && (e.updateQueue.baseState = n);
  }
  var cl = { isMounted: function(e) {
    return (e = e._reactInternals) ? Yt(e) === e : !1;
  }, enqueueSetState: function(e, t, n) {
    e = e._reactInternals;
    var r = $e(), l = Qt(e), u = Nt(r, l);
    u.payload = t, n != null && (u.callback = n), t = Bt(e, u, l), t !== null && (ht(t, e, l, r), nl(t, e, l));
  }, enqueueReplaceState: function(e, t, n) {
    e = e._reactInternals;
    var r = $e(), l = Qt(e), u = Nt(r, l);
    u.tag = 1, u.payload = t, n != null && (u.callback = n), t = Bt(e, u, l), t !== null && (ht(t, e, l, r), nl(t, e, l));
  }, enqueueForceUpdate: function(e, t) {
    e = e._reactInternals;
    var n = $e(), r = Qt(e), l = Nt(n, r);
    l.tag = 2, t != null && (l.callback = t), t = Bt(e, l, r), t !== null && (ht(t, e, r, n), nl(t, e, r));
  } };
  function Fs(e, t, n, r, l, u, i) {
    return e = e.stateNode, typeof e.shouldComponentUpdate == "function" ? e.shouldComponentUpdate(r, u, i) : t.prototype && t.prototype.isPureReactComponent ? !bn(n, r) || !bn(l, u) : !0;
  }
  function As(e, t, n) {
    var r = !1, l = Ft, u = t.contextType;
    return typeof u == "object" && u !== null ? u = ut(u) : (l = Ge(t) ? Zt : Be.current, r = t.contextTypes, u = (r = r != null) ? kn(e, l) : Ft), t = new t(n, u), e.memoizedState = t.state !== null && t.state !== void 0 ? t.state : null, t.updater = cl, e.stateNode = t, t._reactInternals = e, r && (e = e.stateNode, e.__reactInternalMemoizedUnmaskedChildContext = l, e.__reactInternalMemoizedMaskedChildContext = u), t;
  }
  function Us(e, t, n, r) {
    e = t.state, typeof t.componentWillReceiveProps == "function" && t.componentWillReceiveProps(n, r), typeof t.UNSAFE_componentWillReceiveProps == "function" && t.UNSAFE_componentWillReceiveProps(n, r), t.state !== e && cl.enqueueReplaceState(t, t.state, null);
  }
  function Zu(e, t, n, r) {
    var l = e.stateNode;
    l.props = n, l.state = e.memoizedState, l.refs = {}, Mu(e);
    var u = t.contextType;
    typeof u == "object" && u !== null ? l.context = ut(u) : (u = Ge(t) ? Zt : Be.current, l.context = kn(e, u)), l.state = e.memoizedState, u = t.getDerivedStateFromProps, typeof u == "function" && (Xu(e, t, u, n), l.state = e.memoizedState), typeof t.getDerivedStateFromProps == "function" || typeof l.getSnapshotBeforeUpdate == "function" || typeof l.UNSAFE_componentWillMount != "function" && typeof l.componentWillMount != "function" || (t = l.state, typeof l.componentWillMount == "function" && l.componentWillMount(), typeof l.UNSAFE_componentWillMount == "function" && l.UNSAFE_componentWillMount(), t !== l.state && cl.enqueueReplaceState(l, l.state, null), rl(e, n, l, r), l.state = e.memoizedState), typeof l.componentDidMount == "function" && (e.flags |= 4194308);
  }
  function Pn(e, t) {
    try {
      var n = "", r = t;
      do
        n += te(r), r = r.return;
      while (r);
      var l = n;
    } catch (u) {
      l = `
Error generating stack: ` + u.message + `
` + u.stack;
    }
    return { value: e, source: t, stack: l, digest: null };
  }
  function Ju(e, t, n) {
    return { value: e, source: null, stack: n ?? null, digest: t ?? null };
  }
  function qu(e, t) {
    try {
      console.error(t.value);
    } catch (n) {
      setTimeout(function() {
        throw n;
      });
    }
  }
  var xf = typeof WeakMap == "function" ? WeakMap : Map;
  function Bs(e, t, n) {
    n = Nt(-1, n), n.tag = 3, n.payload = { element: null };
    var r = t.value;
    return n.callback = function() {
      yl || (yl = !0, pi = r), qu(e, t);
    }, n;
  }
  function Vs(e, t, n) {
    n = Nt(-1, n), n.tag = 3;
    var r = e.type.getDerivedStateFromError;
    if (typeof r == "function") {
      var l = t.value;
      n.payload = function() {
        return r(l);
      }, n.callback = function() {
        qu(e, t);
      };
    }
    var u = e.stateNode;
    return u !== null && typeof u.componentDidCatch == "function" && (n.callback = function() {
      qu(e, t), typeof r != "function" && (Ht === null ? Ht = /* @__PURE__ */ new Set([this]) : Ht.add(this));
      var i = t.stack;
      this.componentDidCatch(t.value, { componentStack: i !== null ? i : "" });
    }), n;
  }
  function Hs(e, t, n) {
    var r = e.pingCache;
    if (r === null) {
      r = e.pingCache = new xf();
      var l = /* @__PURE__ */ new Set();
      r.set(t, l);
    } else l = r.get(t), l === void 0 && (l = /* @__PURE__ */ new Set(), r.set(t, l));
    l.has(n) || (l.add(n), e = Mf.bind(null, e, t, n), t.then(e, e));
  }
  function Ws(e) {
    do {
      var t;
      if ((t = e.tag === 13) && (t = e.memoizedState, t = t !== null ? t.dehydrated !== null : !0), t) return e;
      e = e.return;
    } while (e !== null);
    return null;
  }
  function Qs(e, t, n, r, l) {
    return (e.mode & 1) === 0 ? (e === t ? e.flags |= 65536 : (e.flags |= 128, n.flags |= 131072, n.flags &= -52805, n.tag === 1 && (n.alternate === null ? n.tag = 17 : (t = Nt(-1, 1), t.tag = 2, Bt(n, t, 1))), n.lanes |= 1), e) : (e.flags |= 65536, e.lanes = l, e);
  }
  var Ef = ce.ReactCurrentOwner, Ye = !1;
  function Qe(e, t, n, r) {
    t.child = e === null ? cs(t, null, n, r) : Cn(t, e.child, n, r);
  }
  function $s(e, t, n, r, l) {
    n = n.render;
    var u = t.ref;
    return Nn(t, l), r = Wu(e, t, n, r, u, l), n = Qu(), e !== null && !Ye ? (t.updateQueue = e.updateQueue, t.flags &= -2053, e.lanes &= ~l, Tt(e, t, l)) : (ge && n && Nu(t), t.flags |= 1, Qe(e, t, r, l), t.child);
  }
  function Ks(e, t, n, r, l) {
    if (e === null) {
      var u = n.type;
      return typeof u == "function" && !ki(u) && u.defaultProps === void 0 && n.compare === null && n.defaultProps === void 0 ? (t.tag = 15, t.type = u, Gs(e, t, u, r, l)) : (e = El(n.type, null, r, t, t.mode, l), e.ref = t.ref, e.return = t, t.child = e);
    }
    if (u = e.child, (e.lanes & l) === 0) {
      var i = u.memoizedProps;
      if (n = n.compare, n = n !== null ? n : bn, n(i, r) && e.ref === t.ref) return Tt(e, t, l);
    }
    return t.flags |= 1, e = Kt(u, r), e.ref = t.ref, e.return = t, t.child = e;
  }
  function Gs(e, t, n, r, l) {
    if (e !== null) {
      var u = e.memoizedProps;
      if (bn(u, r) && e.ref === t.ref) if (Ye = !1, t.pendingProps = r = u, (e.lanes & l) !== 0) (e.flags & 131072) !== 0 && (Ye = !0);
      else return t.lanes = e.lanes, Tt(e, t, l);
    }
    return bu(e, t, n, r, l);
  }
  function Ys(e, t, n) {
    var r = t.pendingProps, l = r.children, u = e !== null ? e.memoizedState : null;
    if (r.mode === "hidden") if ((t.mode & 1) === 0) t.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, de(Ln, nt), nt |= n;
    else {
      if ((n & 1073741824) === 0) return e = u !== null ? u.baseLanes | n : n, t.lanes = t.childLanes = 1073741824, t.memoizedState = { baseLanes: e, cachePool: null, transitions: null }, t.updateQueue = null, de(Ln, nt), nt |= e, null;
      t.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, r = u !== null ? u.baseLanes : n, de(Ln, nt), nt |= r;
    }
    else u !== null ? (r = u.baseLanes | n, t.memoizedState = null) : r = n, de(Ln, nt), nt |= r;
    return Qe(e, t, l, n), t.child;
  }
  function Xs(e, t) {
    var n = t.ref;
    (e === null && n !== null || e !== null && e.ref !== n) && (t.flags |= 512, t.flags |= 2097152);
  }
  function bu(e, t, n, r, l) {
    var u = Ge(n) ? Zt : Be.current;
    return u = kn(t, u), Nn(t, l), n = Wu(e, t, n, r, u, l), r = Qu(), e !== null && !Ye ? (t.updateQueue = e.updateQueue, t.flags &= -2053, e.lanes &= ~l, Tt(e, t, l)) : (ge && r && Nu(t), t.flags |= 1, Qe(e, t, n, l), t.child);
  }
  function Zs(e, t, n, r, l) {
    if (Ge(n)) {
      var u = !0;
      Yr(t);
    } else u = !1;
    if (Nn(t, l), t.stateNode === null) dl(e, t), As(t, n, r), Zu(t, n, r, l), r = !0;
    else if (e === null) {
      var i = t.stateNode, o = t.memoizedProps;
      i.props = o;
      var s = i.context, m = n.contextType;
      typeof m == "object" && m !== null ? m = ut(m) : (m = Ge(n) ? Zt : Be.current, m = kn(t, m));
      var g = n.getDerivedStateFromProps, w = typeof g == "function" || typeof i.getSnapshotBeforeUpdate == "function";
      w || typeof i.UNSAFE_componentWillReceiveProps != "function" && typeof i.componentWillReceiveProps != "function" || (o !== r || s !== m) && Us(t, i, r, m), Ut = !1;
      var y = t.memoizedState;
      i.state = y, rl(t, r, i, l), s = t.memoizedState, o !== r || y !== s || Ke.current || Ut ? (typeof g == "function" && (Xu(t, n, g, r), s = t.memoizedState), (o = Ut || Fs(t, n, o, r, y, s, m)) ? (w || typeof i.UNSAFE_componentWillMount != "function" && typeof i.componentWillMount != "function" || (typeof i.componentWillMount == "function" && i.componentWillMount(), typeof i.UNSAFE_componentWillMount == "function" && i.UNSAFE_componentWillMount()), typeof i.componentDidMount == "function" && (t.flags |= 4194308)) : (typeof i.componentDidMount == "function" && (t.flags |= 4194308), t.memoizedProps = r, t.memoizedState = s), i.props = r, i.state = s, i.context = m, r = o) : (typeof i.componentDidMount == "function" && (t.flags |= 4194308), r = !1);
    } else {
      i = t.stateNode, ds(e, t), o = t.memoizedProps, m = t.type === t.elementType ? o : dt(t.type, o), i.props = m, w = t.pendingProps, y = i.context, s = n.contextType, typeof s == "object" && s !== null ? s = ut(s) : (s = Ge(n) ? Zt : Be.current, s = kn(t, s));
      var _ = n.getDerivedStateFromProps;
      (g = typeof _ == "function" || typeof i.getSnapshotBeforeUpdate == "function") || typeof i.UNSAFE_componentWillReceiveProps != "function" && typeof i.componentWillReceiveProps != "function" || (o !== w || y !== s) && Us(t, i, r, s), Ut = !1, y = t.memoizedState, i.state = y, rl(t, r, i, l);
      var P = t.memoizedState;
      o !== w || y !== P || Ke.current || Ut ? (typeof _ == "function" && (Xu(t, n, _, r), P = t.memoizedState), (m = Ut || Fs(t, n, m, r, y, P, s) || !1) ? (g || typeof i.UNSAFE_componentWillUpdate != "function" && typeof i.componentWillUpdate != "function" || (typeof i.componentWillUpdate == "function" && i.componentWillUpdate(r, P, s), typeof i.UNSAFE_componentWillUpdate == "function" && i.UNSAFE_componentWillUpdate(r, P, s)), typeof i.componentDidUpdate == "function" && (t.flags |= 4), typeof i.getSnapshotBeforeUpdate == "function" && (t.flags |= 1024)) : (typeof i.componentDidUpdate != "function" || o === e.memoizedProps && y === e.memoizedState || (t.flags |= 4), typeof i.getSnapshotBeforeUpdate != "function" || o === e.memoizedProps && y === e.memoizedState || (t.flags |= 1024), t.memoizedProps = r, t.memoizedState = P), i.props = r, i.state = P, i.context = s, r = m) : (typeof i.componentDidUpdate != "function" || o === e.memoizedProps && y === e.memoizedState || (t.flags |= 4), typeof i.getSnapshotBeforeUpdate != "function" || o === e.memoizedProps && y === e.memoizedState || (t.flags |= 1024), r = !1);
    }
    return ei(e, t, n, r, u, l);
  }
  function ei(e, t, n, r, l, u) {
    Xs(e, t);
    var i = (t.flags & 128) !== 0;
    if (!r && !i) return l && ts(t, n, !1), Tt(e, t, u);
    r = t.stateNode, Ef.current = t;
    var o = i && typeof n.getDerivedStateFromError != "function" ? null : r.render();
    return t.flags |= 1, e !== null && i ? (t.child = Cn(t, e.child, null, u), t.child = Cn(t, null, o, u)) : Qe(e, t, o, u), t.memoizedState = r.state, l && ts(t, n, !0), t.child;
  }
  function Js(e) {
    var t = e.stateNode;
    t.pendingContext ? bo(e, t.pendingContext, t.pendingContext !== t.context) : t.context && bo(e, t.context, !1), Fu(e, t.containerInfo);
  }
  function qs(e, t, n, r, l) {
    return En(), Lu(l), t.flags |= 256, Qe(e, t, n, r), t.child;
  }
  var ti = { dehydrated: null, treeContext: null, retryLane: 0 };
  function ni(e) {
    return { baseLanes: e, cachePool: null, transitions: null };
  }
  function bs(e, t, n) {
    var r = t.pendingProps, l = Se.current, u = !1, i = (t.flags & 128) !== 0, o;
    if ((o = i) || (o = e !== null && e.memoizedState === null ? !1 : (l & 2) !== 0), o ? (u = !0, t.flags &= -129) : (e === null || e.memoizedState !== null) && (l |= 1), de(Se, l & 1), e === null)
      return zu(t), e = t.memoizedState, e !== null && (e = e.dehydrated, e !== null) ? ((t.mode & 1) === 0 ? t.lanes = 1 : e.data === "$!" ? t.lanes = 8 : t.lanes = 1073741824, null) : (i = r.children, e = r.fallback, u ? (r = t.mode, u = t.child, i = { mode: "hidden", children: i }, (r & 1) === 0 && u !== null ? (u.childLanes = 0, u.pendingProps = i) : u = Cl(i, r, 0, null), e = on(e, r, n, null), u.return = t, e.return = t, u.sibling = e, t.child = u, t.child.memoizedState = ni(n), t.memoizedState = ti, e) : ri(t, i));
    if (l = e.memoizedState, l !== null && (o = l.dehydrated, o !== null)) return Cf(e, t, i, r, o, l, n);
    if (u) {
      u = r.fallback, i = t.mode, l = e.child, o = l.sibling;
      var s = { mode: "hidden", children: r.children };
      return (i & 1) === 0 && t.child !== l ? (r = t.child, r.childLanes = 0, r.pendingProps = s, t.deletions = null) : (r = Kt(l, s), r.subtreeFlags = l.subtreeFlags & 14680064), o !== null ? u = Kt(o, u) : (u = on(u, i, n, null), u.flags |= 2), u.return = t, r.return = t, r.sibling = u, t.child = r, r = u, u = t.child, i = e.child.memoizedState, i = i === null ? ni(n) : { baseLanes: i.baseLanes | n, cachePool: null, transitions: i.transitions }, u.memoizedState = i, u.childLanes = e.childLanes & ~n, t.memoizedState = ti, r;
    }
    return u = e.child, e = u.sibling, r = Kt(u, { mode: "visible", children: r.children }), (t.mode & 1) === 0 && (r.lanes = n), r.return = t, r.sibling = null, e !== null && (n = t.deletions, n === null ? (t.deletions = [e], t.flags |= 16) : n.push(e)), t.child = r, t.memoizedState = null, r;
  }
  function ri(e, t) {
    return t = Cl({ mode: "visible", children: t }, e.mode, 0, null), t.return = e, e.child = t;
  }
  function fl(e, t, n, r) {
    return r !== null && Lu(r), Cn(t, e.child, null, n), e = ri(t, t.pendingProps.children), e.flags |= 2, t.memoizedState = null, e;
  }
  function Cf(e, t, n, r, l, u, i) {
    if (n)
      return t.flags & 256 ? (t.flags &= -257, r = Ju(Error(c(422))), fl(e, t, i, r)) : t.memoizedState !== null ? (t.child = e.child, t.flags |= 128, null) : (u = r.fallback, l = t.mode, r = Cl({ mode: "visible", children: r.children }, l, 0, null), u = on(u, l, i, null), u.flags |= 2, r.return = t, u.return = t, r.sibling = u, t.child = r, (t.mode & 1) !== 0 && Cn(t, e.child, null, i), t.child.memoizedState = ni(i), t.memoizedState = ti, u);
    if ((t.mode & 1) === 0) return fl(e, t, i, null);
    if (l.data === "$!") {
      if (r = l.nextSibling && l.nextSibling.dataset, r) var o = r.dgst;
      return r = o, u = Error(c(419)), r = Ju(u, r, void 0), fl(e, t, i, r);
    }
    if (o = (i & e.childLanes) !== 0, Ye || o) {
      if (r = Oe, r !== null) {
        switch (i & -i) {
          case 4:
            l = 2;
            break;
          case 16:
            l = 8;
            break;
          case 64:
          case 128:
          case 256:
          case 512:
          case 1024:
          case 2048:
          case 4096:
          case 8192:
          case 16384:
          case 32768:
          case 65536:
          case 131072:
          case 262144:
          case 524288:
          case 1048576:
          case 2097152:
          case 4194304:
          case 8388608:
          case 16777216:
          case 33554432:
          case 67108864:
            l = 32;
            break;
          case 536870912:
            l = 268435456;
            break;
          default:
            l = 0;
        }
        l = (l & (r.suspendedLanes | i)) !== 0 ? 0 : l, l !== 0 && l !== u.retryLane && (u.retryLane = l, _t(e, l), ht(r, e, l, -1));
      }
      return wi(), r = Ju(Error(c(421))), fl(e, t, i, r);
    }
    return l.data === "$?" ? (t.flags |= 128, t.child = e.child, t = Ff.bind(null, e), l._reactRetry = t, null) : (e = u.treeContext, tt = Dt(l.nextSibling), et = t, ge = !0, ft = null, e !== null && (rt[lt++] = Et, rt[lt++] = Ct, rt[lt++] = Jt, Et = e.id, Ct = e.overflow, Jt = t), t = ri(t, r.children), t.flags |= 4096, t);
  }
  function ea(e, t, n) {
    e.lanes |= t;
    var r = e.alternate;
    r !== null && (r.lanes |= t), Ou(e.return, t, n);
  }
  function li(e, t, n, r, l) {
    var u = e.memoizedState;
    u === null ? e.memoizedState = { isBackwards: t, rendering: null, renderingStartTime: 0, last: r, tail: n, tailMode: l } : (u.isBackwards = t, u.rendering = null, u.renderingStartTime = 0, u.last = r, u.tail = n, u.tailMode = l);
  }
  function ta(e, t, n) {
    var r = t.pendingProps, l = r.revealOrder, u = r.tail;
    if (Qe(e, t, r.children, n), r = Se.current, (r & 2) !== 0) r = r & 1 | 2, t.flags |= 128;
    else {
      if (e !== null && (e.flags & 128) !== 0) e: for (e = t.child; e !== null; ) {
        if (e.tag === 13) e.memoizedState !== null && ea(e, n, t);
        else if (e.tag === 19) ea(e, n, t);
        else if (e.child !== null) {
          e.child.return = e, e = e.child;
          continue;
        }
        if (e === t) break e;
        for (; e.sibling === null; ) {
          if (e.return === null || e.return === t) break e;
          e = e.return;
        }
        e.sibling.return = e.return, e = e.sibling;
      }
      r &= 1;
    }
    if (de(Se, r), (t.mode & 1) === 0) t.memoizedState = null;
    else switch (l) {
      case "forwards":
        for (n = t.child, l = null; n !== null; ) e = n.alternate, e !== null && ll(e) === null && (l = n), n = n.sibling;
        n = l, n === null ? (l = t.child, t.child = null) : (l = n.sibling, n.sibling = null), li(t, !1, l, n, u);
        break;
      case "backwards":
        for (n = null, l = t.child, t.child = null; l !== null; ) {
          if (e = l.alternate, e !== null && ll(e) === null) {
            t.child = l;
            break;
          }
          e = l.sibling, l.sibling = n, n = l, l = e;
        }
        li(t, !0, n, null, u);
        break;
      case "together":
        li(t, !1, null, null, void 0);
        break;
      default:
        t.memoizedState = null;
    }
    return t.child;
  }
  function dl(e, t) {
    (t.mode & 1) === 0 && e !== null && (e.alternate = null, t.alternate = null, t.flags |= 2);
  }
  function Tt(e, t, n) {
    if (e !== null && (t.dependencies = e.dependencies), nn |= t.lanes, (n & t.childLanes) === 0) return null;
    if (e !== null && t.child !== e.child) throw Error(c(153));
    if (t.child !== null) {
      for (e = t.child, n = Kt(e, e.pendingProps), t.child = n, n.return = t; e.sibling !== null; ) e = e.sibling, n = n.sibling = Kt(e, e.pendingProps), n.return = t;
      n.sibling = null;
    }
    return t.child;
  }
  function _f(e, t, n) {
    switch (t.tag) {
      case 3:
        Js(t), En();
        break;
      case 5:
        hs(t);
        break;
      case 1:
        Ge(t.type) && Yr(t);
        break;
      case 4:
        Fu(t, t.stateNode.containerInfo);
        break;
      case 10:
        var r = t.type._context, l = t.memoizedProps.value;
        de(el, r._currentValue), r._currentValue = l;
        break;
      case 13:
        if (r = t.memoizedState, r !== null)
          return r.dehydrated !== null ? (de(Se, Se.current & 1), t.flags |= 128, null) : (n & t.child.childLanes) !== 0 ? bs(e, t, n) : (de(Se, Se.current & 1), e = Tt(e, t, n), e !== null ? e.sibling : null);
        de(Se, Se.current & 1);
        break;
      case 19:
        if (r = (n & t.childLanes) !== 0, (e.flags & 128) !== 0) {
          if (r) return ta(e, t, n);
          t.flags |= 128;
        }
        if (l = t.memoizedState, l !== null && (l.rendering = null, l.tail = null, l.lastEffect = null), de(Se, Se.current), r) break;
        return null;
      case 22:
      case 23:
        return t.lanes = 0, Ys(e, t, n);
    }
    return Tt(e, t, n);
  }
  var na, ui, ra, la;
  na = function(e, t) {
    for (var n = t.child; n !== null; ) {
      if (n.tag === 5 || n.tag === 6) e.appendChild(n.stateNode);
      else if (n.tag !== 4 && n.child !== null) {
        n.child.return = n, n = n.child;
        continue;
      }
      if (n === t) break;
      for (; n.sibling === null; ) {
        if (n.return === null || n.return === t) return;
        n = n.return;
      }
      n.sibling.return = n.return, n = n.sibling;
    }
  }, ui = function() {
  }, ra = function(e, t, n, r) {
    var l = e.memoizedProps;
    if (l !== r) {
      e = t.stateNode, en(gt.current);
      var u = null;
      switch (n) {
        case "input":
          l = Ol(e, l), r = Ol(e, r), u = [];
          break;
        case "select":
          l = N({}, l, { value: void 0 }), r = N({}, r, { value: void 0 }), u = [];
          break;
        case "textarea":
          l = Fl(e, l), r = Fl(e, r), u = [];
          break;
        default:
          typeof l.onClick != "function" && typeof r.onClick == "function" && (e.onclick = $r);
      }
      Ul(n, r);
      var i;
      n = null;
      for (m in l) if (!r.hasOwnProperty(m) && l.hasOwnProperty(m) && l[m] != null) if (m === "style") {
        var o = l[m];
        for (i in o) o.hasOwnProperty(i) && (n || (n = {}), n[i] = "");
      } else m !== "dangerouslySetInnerHTML" && m !== "children" && m !== "suppressContentEditableWarning" && m !== "suppressHydrationWarning" && m !== "autoFocus" && (L.hasOwnProperty(m) ? u || (u = []) : (u = u || []).push(m, null));
      for (m in r) {
        var s = r[m];
        if (o = l?.[m], r.hasOwnProperty(m) && s !== o && (s != null || o != null)) if (m === "style") if (o) {
          for (i in o) !o.hasOwnProperty(i) || s && s.hasOwnProperty(i) || (n || (n = {}), n[i] = "");
          for (i in s) s.hasOwnProperty(i) && o[i] !== s[i] && (n || (n = {}), n[i] = s[i]);
        } else n || (u || (u = []), u.push(
          m,
          n
        )), n = s;
        else m === "dangerouslySetInnerHTML" ? (s = s ? s.__html : void 0, o = o ? o.__html : void 0, s != null && o !== s && (u = u || []).push(m, s)) : m === "children" ? typeof s != "string" && typeof s != "number" || (u = u || []).push(m, "" + s) : m !== "suppressContentEditableWarning" && m !== "suppressHydrationWarning" && (L.hasOwnProperty(m) ? (s != null && m === "onScroll" && pe("scroll", e), u || o === s || (u = [])) : (u = u || []).push(m, s));
      }
      n && (u = u || []).push("style", n);
      var m = u;
      (t.updateQueue = m) && (t.flags |= 4);
    }
  }, la = function(e, t, n, r) {
    n !== r && (t.flags |= 4);
  };
  function mr(e, t) {
    if (!ge) switch (e.tailMode) {
      case "hidden":
        t = e.tail;
        for (var n = null; t !== null; ) t.alternate !== null && (n = t), t = t.sibling;
        n === null ? e.tail = null : n.sibling = null;
        break;
      case "collapsed":
        n = e.tail;
        for (var r = null; n !== null; ) n.alternate !== null && (r = n), n = n.sibling;
        r === null ? t || e.tail === null ? e.tail = null : e.tail.sibling = null : r.sibling = null;
    }
  }
  function He(e) {
    var t = e.alternate !== null && e.alternate.child === e.child, n = 0, r = 0;
    if (t) for (var l = e.child; l !== null; ) n |= l.lanes | l.childLanes, r |= l.subtreeFlags & 14680064, r |= l.flags & 14680064, l.return = e, l = l.sibling;
    else for (l = e.child; l !== null; ) n |= l.lanes | l.childLanes, r |= l.subtreeFlags, r |= l.flags, l.return = e, l = l.sibling;
    return e.subtreeFlags |= r, e.childLanes = n, t;
  }
  function Nf(e, t, n) {
    var r = t.pendingProps;
    switch (Tu(t), t.tag) {
      case 2:
      case 16:
      case 15:
      case 0:
      case 11:
      case 7:
      case 8:
      case 12:
      case 9:
      case 14:
        return He(t), null;
      case 1:
        return Ge(t.type) && Gr(), He(t), null;
      case 3:
        return r = t.stateNode, Tn(), me(Ke), me(Be), Bu(), r.pendingContext && (r.context = r.pendingContext, r.pendingContext = null), (e === null || e.child === null) && (qr(t) ? t.flags |= 4 : e === null || e.memoizedState.isDehydrated && (t.flags & 256) === 0 || (t.flags |= 1024, ft !== null && (vi(ft), ft = null))), ui(e, t), He(t), null;
      case 5:
        Au(t);
        var l = en(ar.current);
        if (n = t.type, e !== null && t.stateNode != null) ra(e, t, n, r, l), e.ref !== t.ref && (t.flags |= 512, t.flags |= 2097152);
        else {
          if (!r) {
            if (t.stateNode === null) throw Error(c(166));
            return He(t), null;
          }
          if (e = en(gt.current), qr(t)) {
            r = t.stateNode, n = t.type;
            var u = t.memoizedProps;
            switch (r[yt] = t, r[lr] = u, e = (t.mode & 1) !== 0, n) {
              case "dialog":
                pe("cancel", r), pe("close", r);
                break;
              case "iframe":
              case "object":
              case "embed":
                pe("load", r);
                break;
              case "video":
              case "audio":
                for (l = 0; l < tr.length; l++) pe(tr[l], r);
                break;
              case "source":
                pe("error", r);
                break;
              case "img":
              case "image":
              case "link":
                pe(
                  "error",
                  r
                ), pe("load", r);
                break;
              case "details":
                pe("toggle", r);
                break;
              case "input":
                Fi(r, u), pe("invalid", r);
                break;
              case "select":
                r._wrapperState = { wasMultiple: !!u.multiple }, pe("invalid", r);
                break;
              case "textarea":
                Bi(r, u), pe("invalid", r);
            }
            Ul(n, u), l = null;
            for (var i in u) if (u.hasOwnProperty(i)) {
              var o = u[i];
              i === "children" ? typeof o == "string" ? r.textContent !== o && (u.suppressHydrationWarning !== !0 && Qr(r.textContent, o, e), l = ["children", o]) : typeof o == "number" && r.textContent !== "" + o && (u.suppressHydrationWarning !== !0 && Qr(
                r.textContent,
                o,
                e
              ), l = ["children", "" + o]) : L.hasOwnProperty(i) && o != null && i === "onScroll" && pe("scroll", r);
            }
            switch (n) {
              case "input":
                Sr(r), Ui(r, u, !0);
                break;
              case "textarea":
                Sr(r), Hi(r);
                break;
              case "select":
              case "option":
                break;
              default:
                typeof u.onClick == "function" && (r.onclick = $r);
            }
            r = l, t.updateQueue = r, r !== null && (t.flags |= 4);
          } else {
            i = l.nodeType === 9 ? l : l.ownerDocument, e === "http://www.w3.org/1999/xhtml" && (e = Wi(n)), e === "http://www.w3.org/1999/xhtml" ? n === "script" ? (e = i.createElement("div"), e.innerHTML = "<script><\/script>", e = e.removeChild(e.firstChild)) : typeof r.is == "string" ? e = i.createElement(n, { is: r.is }) : (e = i.createElement(n), n === "select" && (i = e, r.multiple ? i.multiple = !0 : r.size && (i.size = r.size))) : e = i.createElementNS(e, n), e[yt] = t, e[lr] = r, na(e, t, !1, !1), t.stateNode = e;
            e: {
              switch (i = Bl(n, r), n) {
                case "dialog":
                  pe("cancel", e), pe("close", e), l = r;
                  break;
                case "iframe":
                case "object":
                case "embed":
                  pe("load", e), l = r;
                  break;
                case "video":
                case "audio":
                  for (l = 0; l < tr.length; l++) pe(tr[l], e);
                  l = r;
                  break;
                case "source":
                  pe("error", e), l = r;
                  break;
                case "img":
                case "image":
                case "link":
                  pe(
                    "error",
                    e
                  ), pe("load", e), l = r;
                  break;
                case "details":
                  pe("toggle", e), l = r;
                  break;
                case "input":
                  Fi(e, r), l = Ol(e, r), pe("invalid", e);
                  break;
                case "option":
                  l = r;
                  break;
                case "select":
                  e._wrapperState = { wasMultiple: !!r.multiple }, l = N({}, r, { value: void 0 }), pe("invalid", e);
                  break;
                case "textarea":
                  Bi(e, r), l = Fl(e, r), pe("invalid", e);
                  break;
                default:
                  l = r;
              }
              Ul(n, l), o = l;
              for (u in o) if (o.hasOwnProperty(u)) {
                var s = o[u];
                u === "style" ? Ki(e, s) : u === "dangerouslySetInnerHTML" ? (s = s ? s.__html : void 0, s != null && Qi(e, s)) : u === "children" ? typeof s == "string" ? (n !== "textarea" || s !== "") && Mn(e, s) : typeof s == "number" && Mn(e, "" + s) : u !== "suppressContentEditableWarning" && u !== "suppressHydrationWarning" && u !== "autoFocus" && (L.hasOwnProperty(u) ? s != null && u === "onScroll" && pe("scroll", e) : s != null && ke(e, u, s, i));
              }
              switch (n) {
                case "input":
                  Sr(e), Ui(e, r, !1);
                  break;
                case "textarea":
                  Sr(e), Hi(e);
                  break;
                case "option":
                  r.value != null && e.setAttribute("value", "" + X(r.value));
                  break;
                case "select":
                  e.multiple = !!r.multiple, u = r.value, u != null ? sn(e, !!r.multiple, u, !1) : r.defaultValue != null && sn(
                    e,
                    !!r.multiple,
                    r.defaultValue,
                    !0
                  );
                  break;
                default:
                  typeof l.onClick == "function" && (e.onclick = $r);
              }
              switch (n) {
                case "button":
                case "input":
                case "select":
                case "textarea":
                  r = !!r.autoFocus;
                  break e;
                case "img":
                  r = !0;
                  break e;
                default:
                  r = !1;
              }
            }
            r && (t.flags |= 4);
          }
          t.ref !== null && (t.flags |= 512, t.flags |= 2097152);
        }
        return He(t), null;
      case 6:
        if (e && t.stateNode != null) la(e, t, e.memoizedProps, r);
        else {
          if (typeof r != "string" && t.stateNode === null) throw Error(c(166));
          if (n = en(ar.current), en(gt.current), qr(t)) {
            if (r = t.stateNode, n = t.memoizedProps, r[yt] = t, (u = r.nodeValue !== n) && (e = et, e !== null)) switch (e.tag) {
              case 3:
                Qr(r.nodeValue, n, (e.mode & 1) !== 0);
                break;
              case 5:
                e.memoizedProps.suppressHydrationWarning !== !0 && Qr(r.nodeValue, n, (e.mode & 1) !== 0);
            }
            u && (t.flags |= 4);
          } else r = (n.nodeType === 9 ? n : n.ownerDocument).createTextNode(r), r[yt] = t, t.stateNode = r;
        }
        return He(t), null;
      case 13:
        if (me(Se), r = t.memoizedState, e === null || e.memoizedState !== null && e.memoizedState.dehydrated !== null) {
          if (ge && tt !== null && (t.mode & 1) !== 0 && (t.flags & 128) === 0) os(), En(), t.flags |= 98560, u = !1;
          else if (u = qr(t), r !== null && r.dehydrated !== null) {
            if (e === null) {
              if (!u) throw Error(c(318));
              if (u = t.memoizedState, u = u !== null ? u.dehydrated : null, !u) throw Error(c(317));
              u[yt] = t;
            } else En(), (t.flags & 128) === 0 && (t.memoizedState = null), t.flags |= 4;
            He(t), u = !1;
          } else ft !== null && (vi(ft), ft = null), u = !0;
          if (!u) return t.flags & 65536 ? t : null;
        }
        return (t.flags & 128) !== 0 ? (t.lanes = n, t) : (r = r !== null, r !== (e !== null && e.memoizedState !== null) && r && (t.child.flags |= 8192, (t.mode & 1) !== 0 && (e === null || (Se.current & 1) !== 0 ? Re === 0 && (Re = 3) : wi())), t.updateQueue !== null && (t.flags |= 4), He(t), null);
      case 4:
        return Tn(), ui(e, t), e === null && nr(t.stateNode.containerInfo), He(t), null;
      case 10:
        return Iu(t.type._context), He(t), null;
      case 17:
        return Ge(t.type) && Gr(), He(t), null;
      case 19:
        if (me(Se), u = t.memoizedState, u === null) return He(t), null;
        if (r = (t.flags & 128) !== 0, i = u.rendering, i === null) if (r) mr(u, !1);
        else {
          if (Re !== 0 || e !== null && (e.flags & 128) !== 0) for (e = t.child; e !== null; ) {
            if (i = ll(e), i !== null) {
              for (t.flags |= 128, mr(u, !1), r = i.updateQueue, r !== null && (t.updateQueue = r, t.flags |= 4), t.subtreeFlags = 0, r = n, n = t.child; n !== null; ) u = n, e = r, u.flags &= 14680066, i = u.alternate, i === null ? (u.childLanes = 0, u.lanes = e, u.child = null, u.subtreeFlags = 0, u.memoizedProps = null, u.memoizedState = null, u.updateQueue = null, u.dependencies = null, u.stateNode = null) : (u.childLanes = i.childLanes, u.lanes = i.lanes, u.child = i.child, u.subtreeFlags = 0, u.deletions = null, u.memoizedProps = i.memoizedProps, u.memoizedState = i.memoizedState, u.updateQueue = i.updateQueue, u.type = i.type, e = i.dependencies, u.dependencies = e === null ? null : { lanes: e.lanes, firstContext: e.firstContext }), n = n.sibling;
              return de(Se, Se.current & 1 | 2), t.child;
            }
            e = e.sibling;
          }
          u.tail !== null && Ne() > Rn && (t.flags |= 128, r = !0, mr(u, !1), t.lanes = 4194304);
        }
        else {
          if (!r) if (e = ll(i), e !== null) {
            if (t.flags |= 128, r = !0, n = e.updateQueue, n !== null && (t.updateQueue = n, t.flags |= 4), mr(u, !0), u.tail === null && u.tailMode === "hidden" && !i.alternate && !ge) return He(t), null;
          } else 2 * Ne() - u.renderingStartTime > Rn && n !== 1073741824 && (t.flags |= 128, r = !0, mr(u, !1), t.lanes = 4194304);
          u.isBackwards ? (i.sibling = t.child, t.child = i) : (n = u.last, n !== null ? n.sibling = i : t.child = i, u.last = i);
        }
        return u.tail !== null ? (t = u.tail, u.rendering = t, u.tail = t.sibling, u.renderingStartTime = Ne(), t.sibling = null, n = Se.current, de(Se, r ? n & 1 | 2 : n & 1), t) : (He(t), null);
      case 22:
      case 23:
        return gi(), r = t.memoizedState !== null, e !== null && e.memoizedState !== null !== r && (t.flags |= 8192), r && (t.mode & 1) !== 0 ? (nt & 1073741824) !== 0 && (He(t), t.subtreeFlags & 6 && (t.flags |= 8192)) : He(t), null;
      case 24:
        return null;
      case 25:
        return null;
    }
    throw Error(c(156, t.tag));
  }
  function Tf(e, t) {
    switch (Tu(t), t.tag) {
      case 1:
        return Ge(t.type) && Gr(), e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
      case 3:
        return Tn(), me(Ke), me(Be), Bu(), e = t.flags, (e & 65536) !== 0 && (e & 128) === 0 ? (t.flags = e & -65537 | 128, t) : null;
      case 5:
        return Au(t), null;
      case 13:
        if (me(Se), e = t.memoizedState, e !== null && e.dehydrated !== null) {
          if (t.alternate === null) throw Error(c(340));
          En();
        }
        return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
      case 19:
        return me(Se), null;
      case 4:
        return Tn(), null;
      case 10:
        return Iu(t.type._context), null;
      case 22:
      case 23:
        return gi(), null;
      case 24:
        return null;
      default:
        return null;
    }
  }
  var pl = !1, We = !1, Pf = typeof WeakSet == "function" ? WeakSet : Set, T = null;
  function zn(e, t) {
    var n = e.ref;
    if (n !== null) if (typeof n == "function") try {
      n(null);
    } catch (r) {
      Ce(e, t, r);
    }
    else n.current = null;
  }
  function ii(e, t, n) {
    try {
      n();
    } catch (r) {
      Ce(e, t, r);
    }
  }
  var ua = !1;
  function zf(e, t) {
    if (gu = Ir, e = Fo(), cu(e)) {
      if ("selectionStart" in e) var n = { start: e.selectionStart, end: e.selectionEnd };
      else e: {
        n = (n = e.ownerDocument) && n.defaultView || window;
        var r = n.getSelection && n.getSelection();
        if (r && r.rangeCount !== 0) {
          n = r.anchorNode;
          var l = r.anchorOffset, u = r.focusNode;
          r = r.focusOffset;
          try {
            n.nodeType, u.nodeType;
          } catch {
            n = null;
            break e;
          }
          var i = 0, o = -1, s = -1, m = 0, g = 0, w = e, y = null;
          t: for (; ; ) {
            for (var _; w !== n || l !== 0 && w.nodeType !== 3 || (o = i + l), w !== u || r !== 0 && w.nodeType !== 3 || (s = i + r), w.nodeType === 3 && (i += w.nodeValue.length), (_ = w.firstChild) !== null; )
              y = w, w = _;
            for (; ; ) {
              if (w === e) break t;
              if (y === n && ++m === l && (o = i), y === u && ++g === r && (s = i), (_ = w.nextSibling) !== null) break;
              w = y, y = w.parentNode;
            }
            w = _;
          }
          n = o === -1 || s === -1 ? null : { start: o, end: s };
        } else n = null;
      }
      n = n || { start: 0, end: 0 };
    } else n = null;
    for (wu = { focusedElem: e, selectionRange: n }, Ir = !1, T = t; T !== null; ) if (t = T, e = t.child, (t.subtreeFlags & 1028) !== 0 && e !== null) e.return = t, T = e;
    else for (; T !== null; ) {
      t = T;
      try {
        var P = t.alternate;
        if ((t.flags & 1024) !== 0) switch (t.tag) {
          case 0:
          case 11:
          case 15:
            break;
          case 1:
            if (P !== null) {
              var z = P.memoizedProps, Te = P.memoizedState, d = t.stateNode, a = d.getSnapshotBeforeUpdate(t.elementType === t.type ? z : dt(t.type, z), Te);
              d.__reactInternalSnapshotBeforeUpdate = a;
            }
            break;
          case 3:
            var p = t.stateNode.containerInfo;
            p.nodeType === 1 ? p.textContent = "" : p.nodeType === 9 && p.documentElement && p.removeChild(p.documentElement);
            break;
          case 5:
          case 6:
          case 4:
          case 17:
            break;
          default:
            throw Error(c(163));
        }
      } catch (S) {
        Ce(t, t.return, S);
      }
      if (e = t.sibling, e !== null) {
        e.return = t.return, T = e;
        break;
      }
      T = t.return;
    }
    return P = ua, ua = !1, P;
  }
  function hr(e, t, n) {
    var r = t.updateQueue;
    if (r = r !== null ? r.lastEffect : null, r !== null) {
      var l = r = r.next;
      do {
        if ((l.tag & e) === e) {
          var u = l.destroy;
          l.destroy = void 0, u !== void 0 && ii(t, n, u);
        }
        l = l.next;
      } while (l !== r);
    }
  }
  function ml(e, t) {
    if (t = t.updateQueue, t = t !== null ? t.lastEffect : null, t !== null) {
      var n = t = t.next;
      do {
        if ((n.tag & e) === e) {
          var r = n.create;
          n.destroy = r();
        }
        n = n.next;
      } while (n !== t);
    }
  }
  function oi(e) {
    var t = e.ref;
    if (t !== null) {
      var n = e.stateNode;
      switch (e.tag) {
        case 5:
          e = n;
          break;
        default:
          e = n;
      }
      typeof t == "function" ? t(e) : t.current = e;
    }
  }
  function ia(e) {
    var t = e.alternate;
    t !== null && (e.alternate = null, ia(t)), e.child = null, e.deletions = null, e.sibling = null, e.tag === 5 && (t = e.stateNode, t !== null && (delete t[yt], delete t[lr], delete t[Eu], delete t[ff], delete t[df])), e.stateNode = null, e.return = null, e.dependencies = null, e.memoizedProps = null, e.memoizedState = null, e.pendingProps = null, e.stateNode = null, e.updateQueue = null;
  }
  function oa(e) {
    return e.tag === 5 || e.tag === 3 || e.tag === 4;
  }
  function sa(e) {
    e: for (; ; ) {
      for (; e.sibling === null; ) {
        if (e.return === null || oa(e.return)) return null;
        e = e.return;
      }
      for (e.sibling.return = e.return, e = e.sibling; e.tag !== 5 && e.tag !== 6 && e.tag !== 18; ) {
        if (e.flags & 2 || e.child === null || e.tag === 4) continue e;
        e.child.return = e, e = e.child;
      }
      if (!(e.flags & 2)) return e.stateNode;
    }
  }
  function si(e, t, n) {
    var r = e.tag;
    if (r === 5 || r === 6) e = e.stateNode, t ? n.nodeType === 8 ? n.parentNode.insertBefore(e, t) : n.insertBefore(e, t) : (n.nodeType === 8 ? (t = n.parentNode, t.insertBefore(e, n)) : (t = n, t.appendChild(e)), n = n._reactRootContainer, n != null || t.onclick !== null || (t.onclick = $r));
    else if (r !== 4 && (e = e.child, e !== null)) for (si(e, t, n), e = e.sibling; e !== null; ) si(e, t, n), e = e.sibling;
  }
  function ai(e, t, n) {
    var r = e.tag;
    if (r === 5 || r === 6) e = e.stateNode, t ? n.insertBefore(e, t) : n.appendChild(e);
    else if (r !== 4 && (e = e.child, e !== null)) for (ai(e, t, n), e = e.sibling; e !== null; ) ai(e, t, n), e = e.sibling;
  }
  var Fe = null, pt = !1;
  function Vt(e, t, n) {
    for (n = n.child; n !== null; ) aa(e, t, n), n = n.sibling;
  }
  function aa(e, t, n) {
    if (vt && typeof vt.onCommitFiberUnmount == "function") try {
      vt.onCommitFiberUnmount(Tr, n);
    } catch {
    }
    switch (n.tag) {
      case 5:
        We || zn(n, t);
      case 6:
        var r = Fe, l = pt;
        Fe = null, Vt(e, t, n), Fe = r, pt = l, Fe !== null && (pt ? (e = Fe, n = n.stateNode, e.nodeType === 8 ? e.parentNode.removeChild(n) : e.removeChild(n)) : Fe.removeChild(n.stateNode));
        break;
      case 18:
        Fe !== null && (pt ? (e = Fe, n = n.stateNode, e.nodeType === 8 ? xu(e.parentNode, n) : e.nodeType === 1 && xu(e, n), Gn(e)) : xu(Fe, n.stateNode));
        break;
      case 4:
        r = Fe, l = pt, Fe = n.stateNode.containerInfo, pt = !0, Vt(e, t, n), Fe = r, pt = l;
        break;
      case 0:
      case 11:
      case 14:
      case 15:
        if (!We && (r = n.updateQueue, r !== null && (r = r.lastEffect, r !== null))) {
          l = r = r.next;
          do {
            var u = l, i = u.destroy;
            u = u.tag, i !== void 0 && ((u & 2) !== 0 || (u & 4) !== 0) && ii(n, t, i), l = l.next;
          } while (l !== r);
        }
        Vt(e, t, n);
        break;
      case 1:
        if (!We && (zn(n, t), r = n.stateNode, typeof r.componentWillUnmount == "function")) try {
          r.props = n.memoizedProps, r.state = n.memoizedState, r.componentWillUnmount();
        } catch (o) {
          Ce(n, t, o);
        }
        Vt(e, t, n);
        break;
      case 21:
        Vt(e, t, n);
        break;
      case 22:
        n.mode & 1 ? (We = (r = We) || n.memoizedState !== null, Vt(e, t, n), We = r) : Vt(e, t, n);
        break;
      default:
        Vt(e, t, n);
    }
  }
  function ca(e) {
    var t = e.updateQueue;
    if (t !== null) {
      e.updateQueue = null;
      var n = e.stateNode;
      n === null && (n = e.stateNode = new Pf()), t.forEach(function(r) {
        var l = Af.bind(null, e, r);
        n.has(r) || (n.add(r), r.then(l, l));
      });
    }
  }
  function mt(e, t) {
    var n = t.deletions;
    if (n !== null) for (var r = 0; r < n.length; r++) {
      var l = n[r];
      try {
        var u = e, i = t, o = i;
        e: for (; o !== null; ) {
          switch (o.tag) {
            case 5:
              Fe = o.stateNode, pt = !1;
              break e;
            case 3:
              Fe = o.stateNode.containerInfo, pt = !0;
              break e;
            case 4:
              Fe = o.stateNode.containerInfo, pt = !0;
              break e;
          }
          o = o.return;
        }
        if (Fe === null) throw Error(c(160));
        aa(u, i, l), Fe = null, pt = !1;
        var s = l.alternate;
        s !== null && (s.return = null), l.return = null;
      } catch (m) {
        Ce(l, t, m);
      }
    }
    if (t.subtreeFlags & 12854) for (t = t.child; t !== null; ) fa(t, e), t = t.sibling;
  }
  function fa(e, t) {
    var n = e.alternate, r = e.flags;
    switch (e.tag) {
      case 0:
      case 11:
      case 14:
      case 15:
        if (mt(t, e), kt(e), r & 4) {
          try {
            hr(3, e, e.return), ml(3, e);
          } catch (z) {
            Ce(e, e.return, z);
          }
          try {
            hr(5, e, e.return);
          } catch (z) {
            Ce(e, e.return, z);
          }
        }
        break;
      case 1:
        mt(t, e), kt(e), r & 512 && n !== null && zn(n, n.return);
        break;
      case 5:
        if (mt(t, e), kt(e), r & 512 && n !== null && zn(n, n.return), e.flags & 32) {
          var l = e.stateNode;
          try {
            Mn(l, "");
          } catch (z) {
            Ce(e, e.return, z);
          }
        }
        if (r & 4 && (l = e.stateNode, l != null)) {
          var u = e.memoizedProps, i = n !== null ? n.memoizedProps : u, o = e.type, s = e.updateQueue;
          if (e.updateQueue = null, s !== null) try {
            o === "input" && u.type === "radio" && u.name != null && Ai(l, u), Bl(o, i);
            var m = Bl(o, u);
            for (i = 0; i < s.length; i += 2) {
              var g = s[i], w = s[i + 1];
              g === "style" ? Ki(l, w) : g === "dangerouslySetInnerHTML" ? Qi(l, w) : g === "children" ? Mn(l, w) : ke(l, g, w, m);
            }
            switch (o) {
              case "input":
                Dl(l, u);
                break;
              case "textarea":
                Vi(l, u);
                break;
              case "select":
                var y = l._wrapperState.wasMultiple;
                l._wrapperState.wasMultiple = !!u.multiple;
                var _ = u.value;
                _ != null ? sn(l, !!u.multiple, _, !1) : y !== !!u.multiple && (u.defaultValue != null ? sn(
                  l,
                  !!u.multiple,
                  u.defaultValue,
                  !0
                ) : sn(l, !!u.multiple, u.multiple ? [] : "", !1));
            }
            l[lr] = u;
          } catch (z) {
            Ce(e, e.return, z);
          }
        }
        break;
      case 6:
        if (mt(t, e), kt(e), r & 4) {
          if (e.stateNode === null) throw Error(c(162));
          l = e.stateNode, u = e.memoizedProps;
          try {
            l.nodeValue = u;
          } catch (z) {
            Ce(e, e.return, z);
          }
        }
        break;
      case 3:
        if (mt(t, e), kt(e), r & 4 && n !== null && n.memoizedState.isDehydrated) try {
          Gn(t.containerInfo);
        } catch (z) {
          Ce(e, e.return, z);
        }
        break;
      case 4:
        mt(t, e), kt(e);
        break;
      case 13:
        mt(t, e), kt(e), l = e.child, l.flags & 8192 && (u = l.memoizedState !== null, l.stateNode.isHidden = u, !u || l.alternate !== null && l.alternate.memoizedState !== null || (di = Ne())), r & 4 && ca(e);
        break;
      case 22:
        if (g = n !== null && n.memoizedState !== null, e.mode & 1 ? (We = (m = We) || g, mt(t, e), We = m) : mt(t, e), kt(e), r & 8192) {
          if (m = e.memoizedState !== null, (e.stateNode.isHidden = m) && !g && (e.mode & 1) !== 0) for (T = e, g = e.child; g !== null; ) {
            for (w = T = g; T !== null; ) {
              switch (y = T, _ = y.child, y.tag) {
                case 0:
                case 11:
                case 14:
                case 15:
                  hr(4, y, y.return);
                  break;
                case 1:
                  zn(y, y.return);
                  var P = y.stateNode;
                  if (typeof P.componentWillUnmount == "function") {
                    r = y, n = y.return;
                    try {
                      t = r, P.props = t.memoizedProps, P.state = t.memoizedState, P.componentWillUnmount();
                    } catch (z) {
                      Ce(r, n, z);
                    }
                  }
                  break;
                case 5:
                  zn(y, y.return);
                  break;
                case 22:
                  if (y.memoizedState !== null) {
                    ma(w);
                    continue;
                  }
              }
              _ !== null ? (_.return = y, T = _) : ma(w);
            }
            g = g.sibling;
          }
          e: for (g = null, w = e; ; ) {
            if (w.tag === 5) {
              if (g === null) {
                g = w;
                try {
                  l = w.stateNode, m ? (u = l.style, typeof u.setProperty == "function" ? u.setProperty("display", "none", "important") : u.display = "none") : (o = w.stateNode, s = w.memoizedProps.style, i = s != null && s.hasOwnProperty("display") ? s.display : null, o.style.display = $i("display", i));
                } catch (z) {
                  Ce(e, e.return, z);
                }
              }
            } else if (w.tag === 6) {
              if (g === null) try {
                w.stateNode.nodeValue = m ? "" : w.memoizedProps;
              } catch (z) {
                Ce(e, e.return, z);
              }
            } else if ((w.tag !== 22 && w.tag !== 23 || w.memoizedState === null || w === e) && w.child !== null) {
              w.child.return = w, w = w.child;
              continue;
            }
            if (w === e) break e;
            for (; w.sibling === null; ) {
              if (w.return === null || w.return === e) break e;
              g === w && (g = null), w = w.return;
            }
            g === w && (g = null), w.sibling.return = w.return, w = w.sibling;
          }
        }
        break;
      case 19:
        mt(t, e), kt(e), r & 4 && ca(e);
        break;
      case 21:
        break;
      default:
        mt(
          t,
          e
        ), kt(e);
    }
  }
  function kt(e) {
    var t = e.flags;
    if (t & 2) {
      try {
        e: {
          for (var n = e.return; n !== null; ) {
            if (oa(n)) {
              var r = n;
              break e;
            }
            n = n.return;
          }
          throw Error(c(160));
        }
        switch (r.tag) {
          case 5:
            var l = r.stateNode;
            r.flags & 32 && (Mn(l, ""), r.flags &= -33);
            var u = sa(e);
            ai(e, u, l);
            break;
          case 3:
          case 4:
            var i = r.stateNode.containerInfo, o = sa(e);
            si(e, o, i);
            break;
          default:
            throw Error(c(161));
        }
      } catch (s) {
        Ce(e, e.return, s);
      }
      e.flags &= -3;
    }
    t & 4096 && (e.flags &= -4097);
  }
  function Lf(e, t, n) {
    T = e, da(e);
  }
  function da(e, t, n) {
    for (var r = (e.mode & 1) !== 0; T !== null; ) {
      var l = T, u = l.child;
      if (l.tag === 22 && r) {
        var i = l.memoizedState !== null || pl;
        if (!i) {
          var o = l.alternate, s = o !== null && o.memoizedState !== null || We;
          o = pl;
          var m = We;
          if (pl = i, (We = s) && !m) for (T = l; T !== null; ) i = T, s = i.child, i.tag === 22 && i.memoizedState !== null ? ha(l) : s !== null ? (s.return = i, T = s) : ha(l);
          for (; u !== null; ) T = u, da(u), u = u.sibling;
          T = l, pl = o, We = m;
        }
        pa(e);
      } else (l.subtreeFlags & 8772) !== 0 && u !== null ? (u.return = l, T = u) : pa(e);
    }
  }
  function pa(e) {
    for (; T !== null; ) {
      var t = T;
      if ((t.flags & 8772) !== 0) {
        var n = t.alternate;
        try {
          if ((t.flags & 8772) !== 0) switch (t.tag) {
            case 0:
            case 11:
            case 15:
              We || ml(5, t);
              break;
            case 1:
              var r = t.stateNode;
              if (t.flags & 4 && !We) if (n === null) r.componentDidMount();
              else {
                var l = t.elementType === t.type ? n.memoizedProps : dt(t.type, n.memoizedProps);
                r.componentDidUpdate(l, n.memoizedState, r.__reactInternalSnapshotBeforeUpdate);
              }
              var u = t.updateQueue;
              u !== null && ms(t, u, r);
              break;
            case 3:
              var i = t.updateQueue;
              if (i !== null) {
                if (n = null, t.child !== null) switch (t.child.tag) {
                  case 5:
                    n = t.child.stateNode;
                    break;
                  case 1:
                    n = t.child.stateNode;
                }
                ms(t, i, n);
              }
              break;
            case 5:
              var o = t.stateNode;
              if (n === null && t.flags & 4) {
                n = o;
                var s = t.memoizedProps;
                switch (t.type) {
                  case "button":
                  case "input":
                  case "select":
                  case "textarea":
                    s.autoFocus && n.focus();
                    break;
                  case "img":
                    s.src && (n.src = s.src);
                }
              }
              break;
            case 6:
              break;
            case 4:
              break;
            case 12:
              break;
            case 13:
              if (t.memoizedState === null) {
                var m = t.alternate;
                if (m !== null) {
                  var g = m.memoizedState;
                  if (g !== null) {
                    var w = g.dehydrated;
                    w !== null && Gn(w);
                  }
                }
              }
              break;
            case 19:
            case 17:
            case 21:
            case 22:
            case 23:
            case 25:
              break;
            default:
              throw Error(c(163));
          }
          We || t.flags & 512 && oi(t);
        } catch (y) {
          Ce(t, t.return, y);
        }
      }
      if (t === e) {
        T = null;
        break;
      }
      if (n = t.sibling, n !== null) {
        n.return = t.return, T = n;
        break;
      }
      T = t.return;
    }
  }
  function ma(e) {
    for (; T !== null; ) {
      var t = T;
      if (t === e) {
        T = null;
        break;
      }
      var n = t.sibling;
      if (n !== null) {
        n.return = t.return, T = n;
        break;
      }
      T = t.return;
    }
  }
  function ha(e) {
    for (; T !== null; ) {
      var t = T;
      try {
        switch (t.tag) {
          case 0:
          case 11:
          case 15:
            var n = t.return;
            try {
              ml(4, t);
            } catch (s) {
              Ce(t, n, s);
            }
            break;
          case 1:
            var r = t.stateNode;
            if (typeof r.componentDidMount == "function") {
              var l = t.return;
              try {
                r.componentDidMount();
              } catch (s) {
                Ce(t, l, s);
              }
            }
            var u = t.return;
            try {
              oi(t);
            } catch (s) {
              Ce(t, u, s);
            }
            break;
          case 5:
            var i = t.return;
            try {
              oi(t);
            } catch (s) {
              Ce(t, i, s);
            }
        }
      } catch (s) {
        Ce(t, t.return, s);
      }
      if (t === e) {
        T = null;
        break;
      }
      var o = t.sibling;
      if (o !== null) {
        o.return = t.return, T = o;
        break;
      }
      T = t.return;
    }
  }
  var Rf = Math.ceil, hl = ce.ReactCurrentDispatcher, ci = ce.ReactCurrentOwner, ot = ce.ReactCurrentBatchConfig, re = 0, Oe = null, ze = null, Ae = 0, nt = 0, Ln = Mt(0), Re = 0, vr = null, nn = 0, vl = 0, fi = 0, yr = null, Xe = null, di = 0, Rn = 1 / 0, Pt = null, yl = !1, pi = null, Ht = null, gl = !1, Wt = null, wl = 0, gr = 0, mi = null, kl = -1, Sl = 0;
  function $e() {
    return (re & 6) !== 0 ? Ne() : kl !== -1 ? kl : kl = Ne();
  }
  function Qt(e) {
    return (e.mode & 1) === 0 ? 1 : (re & 2) !== 0 && Ae !== 0 ? Ae & -Ae : mf.transition !== null ? (Sl === 0 && (Sl = oo()), Sl) : (e = ae, e !== 0 || (e = window.event, e = e === void 0 ? 16 : yo(e.type)), e);
  }
  function ht(e, t, n, r) {
    if (50 < gr) throw gr = 0, mi = null, Error(c(185));
    Hn(e, n, r), ((re & 2) === 0 || e !== Oe) && (e === Oe && ((re & 2) === 0 && (vl |= n), Re === 4 && $t(e, Ae)), Ze(e, r), n === 1 && re === 0 && (t.mode & 1) === 0 && (Rn = Ne() + 500, Xr && At()));
  }
  function Ze(e, t) {
    var n = e.callbackNode;
    pc(e, t);
    var r = Lr(e, e === Oe ? Ae : 0);
    if (r === 0) n !== null && lo(n), e.callbackNode = null, e.callbackPriority = 0;
    else if (t = r & -r, e.callbackPriority !== t) {
      if (n != null && lo(n), t === 1) e.tag === 0 ? pf(ya.bind(null, e)) : ns(ya.bind(null, e)), af(function() {
        (re & 6) === 0 && At();
      }), n = null;
      else {
        switch (so(r)) {
          case 1:
            n = Gl;
            break;
          case 4:
            n = uo;
            break;
          case 16:
            n = Nr;
            break;
          case 536870912:
            n = io;
            break;
          default:
            n = Nr;
        }
        n = _a(n, va.bind(null, e));
      }
      e.callbackPriority = t, e.callbackNode = n;
    }
  }
  function va(e, t) {
    if (kl = -1, Sl = 0, (re & 6) !== 0) throw Error(c(327));
    var n = e.callbackNode;
    if (jn() && e.callbackNode !== n) return null;
    var r = Lr(e, e === Oe ? Ae : 0);
    if (r === 0) return null;
    if ((r & 30) !== 0 || (r & e.expiredLanes) !== 0 || t) t = xl(e, r);
    else {
      t = r;
      var l = re;
      re |= 2;
      var u = wa();
      (Oe !== e || Ae !== t) && (Pt = null, Rn = Ne() + 500, ln(e, t));
      do
        try {
          Of();
          break;
        } catch (o) {
          ga(e, o);
        }
      while (!0);
      ju(), hl.current = u, re = l, ze !== null ? t = 0 : (Oe = null, Ae = 0, t = Re);
    }
    if (t !== 0) {
      if (t === 2 && (l = Yl(e), l !== 0 && (r = l, t = hi(e, l))), t === 1) throw n = vr, ln(e, 0), $t(e, r), Ze(e, Ne()), n;
      if (t === 6) $t(e, r);
      else {
        if (l = e.current.alternate, (r & 30) === 0 && !jf(l) && (t = xl(e, r), t === 2 && (u = Yl(e), u !== 0 && (r = u, t = hi(e, u))), t === 1)) throw n = vr, ln(e, 0), $t(e, r), Ze(e, Ne()), n;
        switch (e.finishedWork = l, e.finishedLanes = r, t) {
          case 0:
          case 1:
            throw Error(c(345));
          case 2:
            un(e, Xe, Pt);
            break;
          case 3:
            if ($t(e, r), (r & 130023424) === r && (t = di + 500 - Ne(), 10 < t)) {
              if (Lr(e, 0) !== 0) break;
              if (l = e.suspendedLanes, (l & r) !== r) {
                $e(), e.pingedLanes |= e.suspendedLanes & l;
                break;
              }
              e.timeoutHandle = Su(un.bind(null, e, Xe, Pt), t);
              break;
            }
            un(e, Xe, Pt);
            break;
          case 4:
            if ($t(e, r), (r & 4194240) === r) break;
            for (t = e.eventTimes, l = -1; 0 < r; ) {
              var i = 31 - at(r);
              u = 1 << i, i = t[i], i > l && (l = i), r &= ~u;
            }
            if (r = l, r = Ne() - r, r = (120 > r ? 120 : 480 > r ? 480 : 1080 > r ? 1080 : 1920 > r ? 1920 : 3e3 > r ? 3e3 : 4320 > r ? 4320 : 1960 * Rf(r / 1960)) - r, 10 < r) {
              e.timeoutHandle = Su(un.bind(null, e, Xe, Pt), r);
              break;
            }
            un(e, Xe, Pt);
            break;
          case 5:
            un(e, Xe, Pt);
            break;
          default:
            throw Error(c(329));
        }
      }
    }
    return Ze(e, Ne()), e.callbackNode === n ? va.bind(null, e) : null;
  }
  function hi(e, t) {
    var n = yr;
    return e.current.memoizedState.isDehydrated && (ln(e, t).flags |= 256), e = xl(e, t), e !== 2 && (t = Xe, Xe = n, t !== null && vi(t)), e;
  }
  function vi(e) {
    Xe === null ? Xe = e : Xe.push.apply(Xe, e);
  }
  function jf(e) {
    for (var t = e; ; ) {
      if (t.flags & 16384) {
        var n = t.updateQueue;
        if (n !== null && (n = n.stores, n !== null)) for (var r = 0; r < n.length; r++) {
          var l = n[r], u = l.getSnapshot;
          l = l.value;
          try {
            if (!ct(u(), l)) return !1;
          } catch {
            return !1;
          }
        }
      }
      if (n = t.child, t.subtreeFlags & 16384 && n !== null) n.return = t, t = n;
      else {
        if (t === e) break;
        for (; t.sibling === null; ) {
          if (t.return === null || t.return === e) return !0;
          t = t.return;
        }
        t.sibling.return = t.return, t = t.sibling;
      }
    }
    return !0;
  }
  function $t(e, t) {
    for (t &= ~fi, t &= ~vl, e.suspendedLanes |= t, e.pingedLanes &= ~t, e = e.expirationTimes; 0 < t; ) {
      var n = 31 - at(t), r = 1 << n;
      e[n] = -1, t &= ~r;
    }
  }
  function ya(e) {
    if ((re & 6) !== 0) throw Error(c(327));
    jn();
    var t = Lr(e, 0);
    if ((t & 1) === 0) return Ze(e, Ne()), null;
    var n = xl(e, t);
    if (e.tag !== 0 && n === 2) {
      var r = Yl(e);
      r !== 0 && (t = r, n = hi(e, r));
    }
    if (n === 1) throw n = vr, ln(e, 0), $t(e, t), Ze(e, Ne()), n;
    if (n === 6) throw Error(c(345));
    return e.finishedWork = e.current.alternate, e.finishedLanes = t, un(e, Xe, Pt), Ze(e, Ne()), null;
  }
  function yi(e, t) {
    var n = re;
    re |= 1;
    try {
      return e(t);
    } finally {
      re = n, re === 0 && (Rn = Ne() + 500, Xr && At());
    }
  }
  function rn(e) {
    Wt !== null && Wt.tag === 0 && (re & 6) === 0 && jn();
    var t = re;
    re |= 1;
    var n = ot.transition, r = ae;
    try {
      if (ot.transition = null, ae = 1, e) return e();
    } finally {
      ae = r, ot.transition = n, re = t, (re & 6) === 0 && At();
    }
  }
  function gi() {
    nt = Ln.current, me(Ln);
  }
  function ln(e, t) {
    e.finishedWork = null, e.finishedLanes = 0;
    var n = e.timeoutHandle;
    if (n !== -1 && (e.timeoutHandle = -1, sf(n)), ze !== null) for (n = ze.return; n !== null; ) {
      var r = n;
      switch (Tu(r), r.tag) {
        case 1:
          r = r.type.childContextTypes, r != null && Gr();
          break;
        case 3:
          Tn(), me(Ke), me(Be), Bu();
          break;
        case 5:
          Au(r);
          break;
        case 4:
          Tn();
          break;
        case 13:
          me(Se);
          break;
        case 19:
          me(Se);
          break;
        case 10:
          Iu(r.type._context);
          break;
        case 22:
        case 23:
          gi();
      }
      n = n.return;
    }
    if (Oe = e, ze = e = Kt(e.current, null), Ae = nt = t, Re = 0, vr = null, fi = vl = nn = 0, Xe = yr = null, bt !== null) {
      for (t = 0; t < bt.length; t++) if (n = bt[t], r = n.interleaved, r !== null) {
        n.interleaved = null;
        var l = r.next, u = n.pending;
        if (u !== null) {
          var i = u.next;
          u.next = l, r.next = i;
        }
        n.pending = r;
      }
      bt = null;
    }
    return e;
  }
  function ga(e, t) {
    do {
      var n = ze;
      try {
        if (ju(), ul.current = al, il) {
          for (var r = xe.memoizedState; r !== null; ) {
            var l = r.queue;
            l !== null && (l.pending = null), r = r.next;
          }
          il = !1;
        }
        if (tn = 0, Ie = Le = xe = null, cr = !1, fr = 0, ci.current = null, n === null || n.return === null) {
          Re = 1, vr = t, ze = null;
          break;
        }
        e: {
          var u = e, i = n.return, o = n, s = t;
          if (t = Ae, o.flags |= 32768, s !== null && typeof s == "object" && typeof s.then == "function") {
            var m = s, g = o, w = g.tag;
            if ((g.mode & 1) === 0 && (w === 0 || w === 11 || w === 15)) {
              var y = g.alternate;
              y ? (g.updateQueue = y.updateQueue, g.memoizedState = y.memoizedState, g.lanes = y.lanes) : (g.updateQueue = null, g.memoizedState = null);
            }
            var _ = Ws(i);
            if (_ !== null) {
              _.flags &= -257, Qs(_, i, o, u, t), _.mode & 1 && Hs(u, m, t), t = _, s = m;
              var P = t.updateQueue;
              if (P === null) {
                var z = /* @__PURE__ */ new Set();
                z.add(s), t.updateQueue = z;
              } else P.add(s);
              break e;
            } else {
              if ((t & 1) === 0) {
                Hs(u, m, t), wi();
                break e;
              }
              s = Error(c(426));
            }
          } else if (ge && o.mode & 1) {
            var Te = Ws(i);
            if (Te !== null) {
              (Te.flags & 65536) === 0 && (Te.flags |= 256), Qs(Te, i, o, u, t), Lu(Pn(s, o));
              break e;
            }
          }
          u = s = Pn(s, o), Re !== 4 && (Re = 2), yr === null ? yr = [u] : yr.push(u), u = i;
          do {
            switch (u.tag) {
              case 3:
                u.flags |= 65536, t &= -t, u.lanes |= t;
                var d = Bs(u, s, t);
                ps(u, d);
                break e;
              case 1:
                o = s;
                var a = u.type, p = u.stateNode;
                if ((u.flags & 128) === 0 && (typeof a.getDerivedStateFromError == "function" || p !== null && typeof p.componentDidCatch == "function" && (Ht === null || !Ht.has(p)))) {
                  u.flags |= 65536, t &= -t, u.lanes |= t;
                  var S = Vs(u, o, t);
                  ps(u, S);
                  break e;
                }
            }
            u = u.return;
          } while (u !== null);
        }
        Sa(n);
      } catch (R) {
        t = R, ze === n && n !== null && (ze = n = n.return);
        continue;
      }
      break;
    } while (!0);
  }
  function wa() {
    var e = hl.current;
    return hl.current = al, e === null ? al : e;
  }
  function wi() {
    (Re === 0 || Re === 3 || Re === 2) && (Re = 4), Oe === null || (nn & 268435455) === 0 && (vl & 268435455) === 0 || $t(Oe, Ae);
  }
  function xl(e, t) {
    var n = re;
    re |= 2;
    var r = wa();
    (Oe !== e || Ae !== t) && (Pt = null, ln(e, t));
    do
      try {
        If();
        break;
      } catch (l) {
        ga(e, l);
      }
    while (!0);
    if (ju(), re = n, hl.current = r, ze !== null) throw Error(c(261));
    return Oe = null, Ae = 0, Re;
  }
  function If() {
    for (; ze !== null; ) ka(ze);
  }
  function Of() {
    for (; ze !== null && !lc(); ) ka(ze);
  }
  function ka(e) {
    var t = Ca(e.alternate, e, nt);
    e.memoizedProps = e.pendingProps, t === null ? Sa(e) : ze = t, ci.current = null;
  }
  function Sa(e) {
    var t = e;
    do {
      var n = t.alternate;
      if (e = t.return, (t.flags & 32768) === 0) {
        if (n = Nf(n, t, nt), n !== null) {
          ze = n;
          return;
        }
      } else {
        if (n = Tf(n, t), n !== null) {
          n.flags &= 32767, ze = n;
          return;
        }
        if (e !== null) e.flags |= 32768, e.subtreeFlags = 0, e.deletions = null;
        else {
          Re = 6, ze = null;
          return;
        }
      }
      if (t = t.sibling, t !== null) {
        ze = t;
        return;
      }
      ze = t = e;
    } while (t !== null);
    Re === 0 && (Re = 5);
  }
  function un(e, t, n) {
    var r = ae, l = ot.transition;
    try {
      ot.transition = null, ae = 1, Df(e, t, n, r);
    } finally {
      ot.transition = l, ae = r;
    }
    return null;
  }
  function Df(e, t, n, r) {
    do
      jn();
    while (Wt !== null);
    if ((re & 6) !== 0) throw Error(c(327));
    n = e.finishedWork;
    var l = e.finishedLanes;
    if (n === null) return null;
    if (e.finishedWork = null, e.finishedLanes = 0, n === e.current) throw Error(c(177));
    e.callbackNode = null, e.callbackPriority = 0;
    var u = n.lanes | n.childLanes;
    if (mc(e, u), e === Oe && (ze = Oe = null, Ae = 0), (n.subtreeFlags & 2064) === 0 && (n.flags & 2064) === 0 || gl || (gl = !0, _a(Nr, function() {
      return jn(), null;
    })), u = (n.flags & 15990) !== 0, (n.subtreeFlags & 15990) !== 0 || u) {
      u = ot.transition, ot.transition = null;
      var i = ae;
      ae = 1;
      var o = re;
      re |= 4, ci.current = null, zf(e, n), fa(n, e), ef(wu), Ir = !!gu, wu = gu = null, e.current = n, Lf(n), uc(), re = o, ae = i, ot.transition = u;
    } else e.current = n;
    if (gl && (gl = !1, Wt = e, wl = l), u = e.pendingLanes, u === 0 && (Ht = null), sc(n.stateNode), Ze(e, Ne()), t !== null) for (r = e.onRecoverableError, n = 0; n < t.length; n++) l = t[n], r(l.value, { componentStack: l.stack, digest: l.digest });
    if (yl) throw yl = !1, e = pi, pi = null, e;
    return (wl & 1) !== 0 && e.tag !== 0 && jn(), u = e.pendingLanes, (u & 1) !== 0 ? e === mi ? gr++ : (gr = 0, mi = e) : gr = 0, At(), null;
  }
  function jn() {
    if (Wt !== null) {
      var e = so(wl), t = ot.transition, n = ae;
      try {
        if (ot.transition = null, ae = 16 > e ? 16 : e, Wt === null) var r = !1;
        else {
          if (e = Wt, Wt = null, wl = 0, (re & 6) !== 0) throw Error(c(331));
          var l = re;
          for (re |= 4, T = e.current; T !== null; ) {
            var u = T, i = u.child;
            if ((T.flags & 16) !== 0) {
              var o = u.deletions;
              if (o !== null) {
                for (var s = 0; s < o.length; s++) {
                  var m = o[s];
                  for (T = m; T !== null; ) {
                    var g = T;
                    switch (g.tag) {
                      case 0:
                      case 11:
                      case 15:
                        hr(8, g, u);
                    }
                    var w = g.child;
                    if (w !== null) w.return = g, T = w;
                    else for (; T !== null; ) {
                      g = T;
                      var y = g.sibling, _ = g.return;
                      if (ia(g), g === m) {
                        T = null;
                        break;
                      }
                      if (y !== null) {
                        y.return = _, T = y;
                        break;
                      }
                      T = _;
                    }
                  }
                }
                var P = u.alternate;
                if (P !== null) {
                  var z = P.child;
                  if (z !== null) {
                    P.child = null;
                    do {
                      var Te = z.sibling;
                      z.sibling = null, z = Te;
                    } while (z !== null);
                  }
                }
                T = u;
              }
            }
            if ((u.subtreeFlags & 2064) !== 0 && i !== null) i.return = u, T = i;
            else e: for (; T !== null; ) {
              if (u = T, (u.flags & 2048) !== 0) switch (u.tag) {
                case 0:
                case 11:
                case 15:
                  hr(9, u, u.return);
              }
              var d = u.sibling;
              if (d !== null) {
                d.return = u.return, T = d;
                break e;
              }
              T = u.return;
            }
          }
          var a = e.current;
          for (T = a; T !== null; ) {
            i = T;
            var p = i.child;
            if ((i.subtreeFlags & 2064) !== 0 && p !== null) p.return = i, T = p;
            else e: for (i = a; T !== null; ) {
              if (o = T, (o.flags & 2048) !== 0) try {
                switch (o.tag) {
                  case 0:
                  case 11:
                  case 15:
                    ml(9, o);
                }
              } catch (R) {
                Ce(o, o.return, R);
              }
              if (o === i) {
                T = null;
                break e;
              }
              var S = o.sibling;
              if (S !== null) {
                S.return = o.return, T = S;
                break e;
              }
              T = o.return;
            }
          }
          if (re = l, At(), vt && typeof vt.onPostCommitFiberRoot == "function") try {
            vt.onPostCommitFiberRoot(Tr, e);
          } catch {
          }
          r = !0;
        }
        return r;
      } finally {
        ae = n, ot.transition = t;
      }
    }
    return !1;
  }
  function xa(e, t, n) {
    t = Pn(n, t), t = Bs(e, t, 1), e = Bt(e, t, 1), t = $e(), e !== null && (Hn(e, 1, t), Ze(e, t));
  }
  function Ce(e, t, n) {
    if (e.tag === 3) xa(e, e, n);
    else for (; t !== null; ) {
      if (t.tag === 3) {
        xa(t, e, n);
        break;
      } else if (t.tag === 1) {
        var r = t.stateNode;
        if (typeof t.type.getDerivedStateFromError == "function" || typeof r.componentDidCatch == "function" && (Ht === null || !Ht.has(r))) {
          e = Pn(n, e), e = Vs(t, e, 1), t = Bt(t, e, 1), e = $e(), t !== null && (Hn(t, 1, e), Ze(t, e));
          break;
        }
      }
      t = t.return;
    }
  }
  function Mf(e, t, n) {
    var r = e.pingCache;
    r !== null && r.delete(t), t = $e(), e.pingedLanes |= e.suspendedLanes & n, Oe === e && (Ae & n) === n && (Re === 4 || Re === 3 && (Ae & 130023424) === Ae && 500 > Ne() - di ? ln(e, 0) : fi |= n), Ze(e, t);
  }
  function Ea(e, t) {
    t === 0 && ((e.mode & 1) === 0 ? t = 1 : (t = zr, zr <<= 1, (zr & 130023424) === 0 && (zr = 4194304)));
    var n = $e();
    e = _t(e, t), e !== null && (Hn(e, t, n), Ze(e, n));
  }
  function Ff(e) {
    var t = e.memoizedState, n = 0;
    t !== null && (n = t.retryLane), Ea(e, n);
  }
  function Af(e, t) {
    var n = 0;
    switch (e.tag) {
      case 13:
        var r = e.stateNode, l = e.memoizedState;
        l !== null && (n = l.retryLane);
        break;
      case 19:
        r = e.stateNode;
        break;
      default:
        throw Error(c(314));
    }
    r !== null && r.delete(t), Ea(e, n);
  }
  var Ca;
  Ca = function(e, t, n) {
    if (e !== null) if (e.memoizedProps !== t.pendingProps || Ke.current) Ye = !0;
    else {
      if ((e.lanes & n) === 0 && (t.flags & 128) === 0) return Ye = !1, _f(e, t, n);
      Ye = (e.flags & 131072) !== 0;
    }
    else Ye = !1, ge && (t.flags & 1048576) !== 0 && rs(t, Jr, t.index);
    switch (t.lanes = 0, t.tag) {
      case 2:
        var r = t.type;
        dl(e, t), e = t.pendingProps;
        var l = kn(t, Be.current);
        Nn(t, n), l = Wu(null, t, r, e, l, n);
        var u = Qu();
        return t.flags |= 1, typeof l == "object" && l !== null && typeof l.render == "function" && l.$$typeof === void 0 ? (t.tag = 1, t.memoizedState = null, t.updateQueue = null, Ge(r) ? (u = !0, Yr(t)) : u = !1, t.memoizedState = l.state !== null && l.state !== void 0 ? l.state : null, Mu(t), l.updater = cl, t.stateNode = l, l._reactInternals = t, Zu(t, r, e, n), t = ei(null, t, r, !0, u, n)) : (t.tag = 0, ge && u && Nu(t), Qe(null, t, l, n), t = t.child), t;
      case 16:
        r = t.elementType;
        e: {
          switch (dl(e, t), e = t.pendingProps, l = r._init, r = l(r._payload), t.type = r, l = t.tag = Bf(r), e = dt(r, e), l) {
            case 0:
              t = bu(null, t, r, e, n);
              break e;
            case 1:
              t = Zs(null, t, r, e, n);
              break e;
            case 11:
              t = $s(null, t, r, e, n);
              break e;
            case 14:
              t = Ks(null, t, r, dt(r.type, e), n);
              break e;
          }
          throw Error(c(
            306,
            r,
            ""
          ));
        }
        return t;
      case 0:
        return r = t.type, l = t.pendingProps, l = t.elementType === r ? l : dt(r, l), bu(e, t, r, l, n);
      case 1:
        return r = t.type, l = t.pendingProps, l = t.elementType === r ? l : dt(r, l), Zs(e, t, r, l, n);
      case 3:
        e: {
          if (Js(t), e === null) throw Error(c(387));
          r = t.pendingProps, u = t.memoizedState, l = u.element, ds(e, t), rl(t, r, null, n);
          var i = t.memoizedState;
          if (r = i.element, u.isDehydrated) if (u = { element: r, isDehydrated: !1, cache: i.cache, pendingSuspenseBoundaries: i.pendingSuspenseBoundaries, transitions: i.transitions }, t.updateQueue.baseState = u, t.memoizedState = u, t.flags & 256) {
            l = Pn(Error(c(423)), t), t = qs(e, t, r, n, l);
            break e;
          } else if (r !== l) {
            l = Pn(Error(c(424)), t), t = qs(e, t, r, n, l);
            break e;
          } else for (tt = Dt(t.stateNode.containerInfo.firstChild), et = t, ge = !0, ft = null, n = cs(t, null, r, n), t.child = n; n; ) n.flags = n.flags & -3 | 4096, n = n.sibling;
          else {
            if (En(), r === l) {
              t = Tt(e, t, n);
              break e;
            }
            Qe(e, t, r, n);
          }
          t = t.child;
        }
        return t;
      case 5:
        return hs(t), e === null && zu(t), r = t.type, l = t.pendingProps, u = e !== null ? e.memoizedProps : null, i = l.children, ku(r, l) ? i = null : u !== null && ku(r, u) && (t.flags |= 32), Xs(e, t), Qe(e, t, i, n), t.child;
      case 6:
        return e === null && zu(t), null;
      case 13:
        return bs(e, t, n);
      case 4:
        return Fu(t, t.stateNode.containerInfo), r = t.pendingProps, e === null ? t.child = Cn(t, null, r, n) : Qe(e, t, r, n), t.child;
      case 11:
        return r = t.type, l = t.pendingProps, l = t.elementType === r ? l : dt(r, l), $s(e, t, r, l, n);
      case 7:
        return Qe(e, t, t.pendingProps, n), t.child;
      case 8:
        return Qe(e, t, t.pendingProps.children, n), t.child;
      case 12:
        return Qe(e, t, t.pendingProps.children, n), t.child;
      case 10:
        e: {
          if (r = t.type._context, l = t.pendingProps, u = t.memoizedProps, i = l.value, de(el, r._currentValue), r._currentValue = i, u !== null) if (ct(u.value, i)) {
            if (u.children === l.children && !Ke.current) {
              t = Tt(e, t, n);
              break e;
            }
          } else for (u = t.child, u !== null && (u.return = t); u !== null; ) {
            var o = u.dependencies;
            if (o !== null) {
              i = u.child;
              for (var s = o.firstContext; s !== null; ) {
                if (s.context === r) {
                  if (u.tag === 1) {
                    s = Nt(-1, n & -n), s.tag = 2;
                    var m = u.updateQueue;
                    if (m !== null) {
                      m = m.shared;
                      var g = m.pending;
                      g === null ? s.next = s : (s.next = g.next, g.next = s), m.pending = s;
                    }
                  }
                  u.lanes |= n, s = u.alternate, s !== null && (s.lanes |= n), Ou(
                    u.return,
                    n,
                    t
                  ), o.lanes |= n;
                  break;
                }
                s = s.next;
              }
            } else if (u.tag === 10) i = u.type === t.type ? null : u.child;
            else if (u.tag === 18) {
              if (i = u.return, i === null) throw Error(c(341));
              i.lanes |= n, o = i.alternate, o !== null && (o.lanes |= n), Ou(i, n, t), i = u.sibling;
            } else i = u.child;
            if (i !== null) i.return = u;
            else for (i = u; i !== null; ) {
              if (i === t) {
                i = null;
                break;
              }
              if (u = i.sibling, u !== null) {
                u.return = i.return, i = u;
                break;
              }
              i = i.return;
            }
            u = i;
          }
          Qe(e, t, l.children, n), t = t.child;
        }
        return t;
      case 9:
        return l = t.type, r = t.pendingProps.children, Nn(t, n), l = ut(l), r = r(l), t.flags |= 1, Qe(e, t, r, n), t.child;
      case 14:
        return r = t.type, l = dt(r, t.pendingProps), l = dt(r.type, l), Ks(e, t, r, l, n);
      case 15:
        return Gs(e, t, t.type, t.pendingProps, n);
      case 17:
        return r = t.type, l = t.pendingProps, l = t.elementType === r ? l : dt(r, l), dl(e, t), t.tag = 1, Ge(r) ? (e = !0, Yr(t)) : e = !1, Nn(t, n), As(t, r, l), Zu(t, r, l, n), ei(null, t, r, !0, e, n);
      case 19:
        return ta(e, t, n);
      case 22:
        return Ys(e, t, n);
    }
    throw Error(c(156, t.tag));
  };
  function _a(e, t) {
    return ro(e, t);
  }
  function Uf(e, t, n, r) {
    this.tag = e, this.key = n, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.ref = null, this.pendingProps = t, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = r, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
  }
  function st(e, t, n, r) {
    return new Uf(e, t, n, r);
  }
  function ki(e) {
    return e = e.prototype, !(!e || !e.isReactComponent);
  }
  function Bf(e) {
    if (typeof e == "function") return ki(e) ? 1 : 0;
    if (e != null) {
      if (e = e.$$typeof, e === ye) return 11;
      if (e === qe) return 14;
    }
    return 2;
  }
  function Kt(e, t) {
    var n = e.alternate;
    return n === null ? (n = st(e.tag, t, e.key, e.mode), n.elementType = e.elementType, n.type = e.type, n.stateNode = e.stateNode, n.alternate = e, e.alternate = n) : (n.pendingProps = t, n.type = e.type, n.flags = 0, n.subtreeFlags = 0, n.deletions = null), n.flags = e.flags & 14680064, n.childLanes = e.childLanes, n.lanes = e.lanes, n.child = e.child, n.memoizedProps = e.memoizedProps, n.memoizedState = e.memoizedState, n.updateQueue = e.updateQueue, t = e.dependencies, n.dependencies = t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }, n.sibling = e.sibling, n.index = e.index, n.ref = e.ref, n;
  }
  function El(e, t, n, r, l, u) {
    var i = 2;
    if (r = e, typeof e == "function") ki(e) && (i = 1);
    else if (typeof e == "string") i = 5;
    else e: switch (e) {
      case ne:
        return on(n.children, l, u, t);
      case se:
        i = 8, l |= 8;
        break;
      case Ee:
        return e = st(12, n, t, l | 2), e.elementType = Ee, e.lanes = u, e;
      case _e:
        return e = st(13, n, t, l), e.elementType = _e, e.lanes = u, e;
      case Me:
        return e = st(19, n, t, l), e.elementType = Me, e.lanes = u, e;
      case fe:
        return Cl(n, l, u, t);
      default:
        if (typeof e == "object" && e !== null) switch (e.$$typeof) {
          case ve:
            i = 10;
            break e;
          case je:
            i = 9;
            break e;
          case ye:
            i = 11;
            break e;
          case qe:
            i = 14;
            break e;
          case Pe:
            i = 16, r = null;
            break e;
        }
        throw Error(c(130, e == null ? e : typeof e, ""));
    }
    return t = st(i, n, t, l), t.elementType = e, t.type = r, t.lanes = u, t;
  }
  function on(e, t, n, r) {
    return e = st(7, e, r, t), e.lanes = n, e;
  }
  function Cl(e, t, n, r) {
    return e = st(22, e, r, t), e.elementType = fe, e.lanes = n, e.stateNode = { isHidden: !1 }, e;
  }
  function Si(e, t, n) {
    return e = st(6, e, null, t), e.lanes = n, e;
  }
  function xi(e, t, n) {
    return t = st(4, e.children !== null ? e.children : [], e.key, t), t.lanes = n, t.stateNode = { containerInfo: e.containerInfo, pendingChildren: null, implementation: e.implementation }, t;
  }
  function Vf(e, t, n, r, l) {
    this.tag = t, this.containerInfo = e, this.finishedWork = this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.pendingContext = this.context = null, this.callbackPriority = 0, this.eventTimes = Xl(0), this.expirationTimes = Xl(-1), this.entangledLanes = this.finishedLanes = this.mutableReadLanes = this.expiredLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = Xl(0), this.identifierPrefix = r, this.onRecoverableError = l, this.mutableSourceEagerHydrationData = null;
  }
  function Ei(e, t, n, r, l, u, i, o, s) {
    return e = new Vf(e, t, n, o, s), t === 1 ? (t = 1, u === !0 && (t |= 8)) : t = 0, u = st(3, null, null, t), e.current = u, u.stateNode = e, u.memoizedState = { element: r, isDehydrated: n, cache: null, transitions: null, pendingSuspenseBoundaries: null }, Mu(u), e;
  }
  function Hf(e, t, n) {
    var r = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return { $$typeof: M, key: r == null ? null : "" + r, children: e, containerInfo: t, implementation: n };
  }
  function Na(e) {
    if (!e) return Ft;
    e = e._reactInternals;
    e: {
      if (Yt(e) !== e || e.tag !== 1) throw Error(c(170));
      var t = e;
      do {
        switch (t.tag) {
          case 3:
            t = t.stateNode.context;
            break e;
          case 1:
            if (Ge(t.type)) {
              t = t.stateNode.__reactInternalMemoizedMergedChildContext;
              break e;
            }
        }
        t = t.return;
      } while (t !== null);
      throw Error(c(171));
    }
    if (e.tag === 1) {
      var n = e.type;
      if (Ge(n)) return es(e, n, t);
    }
    return t;
  }
  function Ta(e, t, n, r, l, u, i, o, s) {
    return e = Ei(n, r, !0, e, l, u, i, o, s), e.context = Na(null), n = e.current, r = $e(), l = Qt(n), u = Nt(r, l), u.callback = t ?? null, Bt(n, u, l), e.current.lanes = l, Hn(e, l, r), Ze(e, r), e;
  }
  function _l(e, t, n, r) {
    var l = t.current, u = $e(), i = Qt(l);
    return n = Na(n), t.context === null ? t.context = n : t.pendingContext = n, t = Nt(u, i), t.payload = { element: e }, r = r === void 0 ? null : r, r !== null && (t.callback = r), e = Bt(l, t, i), e !== null && (ht(e, l, i, u), nl(e, l, i)), i;
  }
  function Nl(e) {
    if (e = e.current, !e.child) return null;
    switch (e.child.tag) {
      case 5:
        return e.child.stateNode;
      default:
        return e.child.stateNode;
    }
  }
  function Pa(e, t) {
    if (e = e.memoizedState, e !== null && e.dehydrated !== null) {
      var n = e.retryLane;
      e.retryLane = n !== 0 && n < t ? n : t;
    }
  }
  function Ci(e, t) {
    Pa(e, t), (e = e.alternate) && Pa(e, t);
  }
  function Wf() {
    return null;
  }
  var za = typeof reportError == "function" ? reportError : function(e) {
    console.error(e);
  };
  function _i(e) {
    this._internalRoot = e;
  }
  Tl.prototype.render = _i.prototype.render = function(e) {
    var t = this._internalRoot;
    if (t === null) throw Error(c(409));
    _l(e, t, null, null);
  }, Tl.prototype.unmount = _i.prototype.unmount = function() {
    var e = this._internalRoot;
    if (e !== null) {
      this._internalRoot = null;
      var t = e.containerInfo;
      rn(function() {
        _l(null, e, null, null);
      }), t[St] = null;
    }
  };
  function Tl(e) {
    this._internalRoot = e;
  }
  Tl.prototype.unstable_scheduleHydration = function(e) {
    if (e) {
      var t = fo();
      e = { blockedOn: null, target: e, priority: t };
      for (var n = 0; n < jt.length && t !== 0 && t < jt[n].priority; n++) ;
      jt.splice(n, 0, e), n === 0 && ho(e);
    }
  };
  function Ni(e) {
    return !(!e || e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11);
  }
  function Pl(e) {
    return !(!e || e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11 && (e.nodeType !== 8 || e.nodeValue !== " react-mount-point-unstable "));
  }
  function La() {
  }
  function Qf(e, t, n, r, l) {
    if (l) {
      if (typeof r == "function") {
        var u = r;
        r = function() {
          var m = Nl(i);
          u.call(m);
        };
      }
      var i = Ta(t, r, e, 0, null, !1, !1, "", La);
      return e._reactRootContainer = i, e[St] = i.current, nr(e.nodeType === 8 ? e.parentNode : e), rn(), i;
    }
    for (; l = e.lastChild; ) e.removeChild(l);
    if (typeof r == "function") {
      var o = r;
      r = function() {
        var m = Nl(s);
        o.call(m);
      };
    }
    var s = Ei(e, 0, !1, null, null, !1, !1, "", La);
    return e._reactRootContainer = s, e[St] = s.current, nr(e.nodeType === 8 ? e.parentNode : e), rn(function() {
      _l(t, s, n, r);
    }), s;
  }
  function zl(e, t, n, r, l) {
    var u = n._reactRootContainer;
    if (u) {
      var i = u;
      if (typeof l == "function") {
        var o = l;
        l = function() {
          var s = Nl(i);
          o.call(s);
        };
      }
      _l(t, i, e, l);
    } else i = Qf(n, t, e, l, r);
    return Nl(i);
  }
  ao = function(e) {
    switch (e.tag) {
      case 3:
        var t = e.stateNode;
        if (t.current.memoizedState.isDehydrated) {
          var n = Vn(t.pendingLanes);
          n !== 0 && (Zl(t, n | 1), Ze(t, Ne()), (re & 6) === 0 && (Rn = Ne() + 500, At()));
        }
        break;
      case 13:
        rn(function() {
          var r = _t(e, 1);
          if (r !== null) {
            var l = $e();
            ht(r, e, 1, l);
          }
        }), Ci(e, 1);
    }
  }, Jl = function(e) {
    if (e.tag === 13) {
      var t = _t(e, 134217728);
      if (t !== null) {
        var n = $e();
        ht(t, e, 134217728, n);
      }
      Ci(e, 134217728);
    }
  }, co = function(e) {
    if (e.tag === 13) {
      var t = Qt(e), n = _t(e, t);
      if (n !== null) {
        var r = $e();
        ht(n, e, t, r);
      }
      Ci(e, t);
    }
  }, fo = function() {
    return ae;
  }, po = function(e, t) {
    var n = ae;
    try {
      return ae = e, t();
    } finally {
      ae = n;
    }
  }, Wl = function(e, t, n) {
    switch (t) {
      case "input":
        if (Dl(e, n), t = n.name, n.type === "radio" && t != null) {
          for (n = e; n.parentNode; ) n = n.parentNode;
          for (n = n.querySelectorAll("input[name=" + JSON.stringify("" + t) + '][type="radio"]'), t = 0; t < n.length; t++) {
            var r = n[t];
            if (r !== e && r.form === e.form) {
              var l = Kr(r);
              if (!l) throw Error(c(90));
              Mi(r), Dl(r, l);
            }
          }
        }
        break;
      case "textarea":
        Vi(e, n);
        break;
      case "select":
        t = n.value, t != null && sn(e, !!n.multiple, t, !1);
    }
  }, Zi = yi, Ji = rn;
  var $f = { usingClientEntryPoint: !1, Events: [ur, gn, Kr, Yi, Xi, yi] }, wr = { findFiberByHostInstance: Xt, bundleType: 0, version: "18.3.1", rendererPackageName: "react-dom" }, Kf = { bundleType: wr.bundleType, version: wr.version, rendererPackageName: wr.rendererPackageName, rendererConfig: wr.rendererConfig, overrideHookState: null, overrideHookStateDeletePath: null, overrideHookStateRenamePath: null, overrideProps: null, overridePropsDeletePath: null, overridePropsRenamePath: null, setErrorHandler: null, setSuspenseHandler: null, scheduleUpdate: null, currentDispatcherRef: ce.ReactCurrentDispatcher, findHostInstanceByFiber: function(e) {
    return e = to(e), e === null ? null : e.stateNode;
  }, findFiberByHostInstance: wr.findFiberByHostInstance || Wf, findHostInstancesForRefresh: null, scheduleRefresh: null, scheduleRoot: null, setRefreshHandler: null, getCurrentFiber: null, reconcilerVersion: "18.3.1-next-f1338f8080-20240426" };
  if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
    var Ll = __REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!Ll.isDisabled && Ll.supportsFiber) try {
      Tr = Ll.inject(Kf), vt = Ll;
    } catch {
    }
  }
  return Je.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = $f, Je.createPortal = function(e, t) {
    var n = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
    if (!Ni(t)) throw Error(c(200));
    return Hf(e, t, null, n);
  }, Je.createRoot = function(e, t) {
    if (!Ni(e)) throw Error(c(299));
    var n = !1, r = "", l = za;
    return t != null && (t.unstable_strictMode === !0 && (n = !0), t.identifierPrefix !== void 0 && (r = t.identifierPrefix), t.onRecoverableError !== void 0 && (l = t.onRecoverableError)), t = Ei(e, 1, !1, null, null, n, !1, r, l), e[St] = t.current, nr(e.nodeType === 8 ? e.parentNode : e), new _i(t);
  }, Je.findDOMNode = function(e) {
    if (e == null) return null;
    if (e.nodeType === 1) return e;
    var t = e._reactInternals;
    if (t === void 0)
      throw typeof e.render == "function" ? Error(c(188)) : (e = Object.keys(e).join(","), Error(c(268, e)));
    return e = to(t), e = e === null ? null : e.stateNode, e;
  }, Je.flushSync = function(e) {
    return rn(e);
  }, Je.hydrate = function(e, t, n) {
    if (!Pl(t)) throw Error(c(200));
    return zl(null, e, t, !0, n);
  }, Je.hydrateRoot = function(e, t, n) {
    if (!Ni(e)) throw Error(c(405));
    var r = n != null && n.hydratedSources || null, l = !1, u = "", i = za;
    if (n != null && (n.unstable_strictMode === !0 && (l = !0), n.identifierPrefix !== void 0 && (u = n.identifierPrefix), n.onRecoverableError !== void 0 && (i = n.onRecoverableError)), t = Ta(t, null, e, 1, n ?? null, l, !1, u, i), e[St] = t.current, nr(e), r) for (e = 0; e < r.length; e++) n = r[e], l = n._getVersion, l = l(n._source), t.mutableSourceEagerHydrationData == null ? t.mutableSourceEagerHydrationData = [n, l] : t.mutableSourceEagerHydrationData.push(
      n,
      l
    );
    return new Tl(t);
  }, Je.render = function(e, t, n) {
    if (!Pl(t)) throw Error(c(200));
    return zl(null, e, t, !1, n);
  }, Je.unmountComponentAtNode = function(e) {
    if (!Pl(e)) throw Error(c(40));
    return e._reactRootContainer ? (rn(function() {
      zl(null, null, e, !1, function() {
        e._reactRootContainer = null, e[St] = null;
      });
    }), !0) : !1;
  }, Je.unstable_batchedUpdates = yi, Je.unstable_renderSubtreeIntoContainer = function(e, t, n, r) {
    if (!Pl(n)) throw Error(c(200));
    if (e == null || e._reactInternals === void 0) throw Error(c(38));
    return zl(e, t, n, !1, r);
  }, Je.version = "18.3.1-next-f1338f8080-20240426", Je;
}
var Aa;
function nd() {
  if (Aa) return zi.exports;
  Aa = 1;
  function h() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(h);
      } catch (k) {
        console.error(k);
      }
  }
  return h(), zi.exports = td(), zi.exports;
}
var Ua;
function rd() {
  if (Ua) return jl;
  Ua = 1;
  var h = nd();
  return jl.createRoot = h.createRoot, jl.hydrateRoot = h.hydrateRoot, jl;
}
var ld = rd();
function $a(h) {
  var k, c, x = "";
  if (typeof h == "string" || typeof h == "number") x += h;
  else if (typeof h == "object") if (Array.isArray(h)) {
    var L = h.length;
    for (k = 0; k < L; k++) h[k] && (c = $a(h[k])) && (x && (x += " "), x += c);
  } else for (c in h) h[c] && (x && (x += " "), x += c);
  return x;
}
function Il() {
  for (var h, k, c = 0, x = "", L = arguments.length; c < L; c++) (h = arguments[c]) && (k = $a(h)) && (x && (x += " "), x += k);
  return x;
}
const ud = { DEV: !1, MODE: "production" }, Ka = typeof import.meta < "u" ? ud : void 0, id = !!Ka?.DEV, od = typeof navigator < "u" && /(jsdom|happy-dom)/i.test(navigator.userAgent) || typeof globalThis.happyDOM == "object", Ga = Ka?.MODE === "test" || od, sd = typeof window < "u", Ya = typeof document < "u", ad = sd && Ya, cd = (h) => {
  const k = h.currentTarget;
  if (!(k instanceof HTMLElement))
    return;
  const c = k.offsetWidth;
  let x = 0.985;
  c <= 80 ? x = 0.96 : c <= 150 ? x = 0.97 : c <= 220 ? x = 0.98 : c > 600 && (x = 0.995), k.style.setProperty("--scale", x.toString());
}, Ba = (h, k) => {
  const c = () => {
    const W = setTimeout(h);
    return () => {
      clearTimeout(W);
    };
  };
  if (!ad || typeof window.requestAnimationFrame != "function" || Ya && document.visibilityState === "hidden")
    return c();
  let L = 2, U = window.requestAnimationFrame(function W() {
    L -= 1, L === 0 ? h() : U = window.requestAnimationFrame(W);
  });
  return () => {
    typeof window.cancelAnimationFrame == "function" && window.cancelAnimationFrame(U);
  };
}, fd = (h) => Object.keys(h).reduce((c, x) => {
  const L = h[x];
  if (L || L === 0) {
    const U = x.startsWith("--") ? "" : "--", W = typeof L == "number" ? `${L}px` : L;
    c[`${U}${x}`] = W;
  }
  return c;
}, {}), dd = (h) => {
  const k = J.Children.toArray(h), c = [];
  let x = "";
  const L = () => {
    x !== "" && (c.push(x), x = "");
  };
  for (const U of k)
    if (!(U == null || typeof U == "boolean")) {
      if (typeof U == "string" || typeof U == "number") {
        x += String(U);
        continue;
      }
      L(), c.push(U);
    }
  return L(), c;
}, Xa = (h) => {
  const k = dd(h), c = J.Children.count(k);
  return J.Children.map(k, (x) => {
    if (typeof x == "string" && x.trim())
      return c <= 1 ? x : j.jsx("span", { children: x });
    if (J.isValidElement(x)) {
      const L = x, { children: U, ...W } = L.props;
      return U != null ? J.cloneElement(L, W, Xa(U)) : L;
    }
    return x;
  });
}, pd = J.createContext(null);
function md() {
  return J.useContext(pd)?.linkComponent ?? "a";
}
var ji, Va;
function hd() {
  if (Va) return ji;
  Va = 1;
  var h = "Expected a function", k = NaN, c = "[object Symbol]", x = /^\s+|\s+$/g, L = /^[-+]0x[0-9a-f]+$/i, U = /^0b[01]+$/i, W = /^0o[0-7]+$/i, b = parseInt, C = typeof Rl == "object" && Rl && Rl.Object === Object && Rl, Q = typeof self == "object" && self && self.Object === Object && self, oe = C || Q || Function("return this")(), Y = Object.prototype, V = Y.toString, ee = Math.max, ue = Math.min, K = function() {
    return oe.Date.now();
  };
  function $(I, M, ne) {
    var se, Ee, ve, je, ye, _e, Me = 0, qe = !1, Pe = !1, fe = !0;
    if (typeof I != "function")
      throw new TypeError(h);
    M = ce(M) || 0, he(ne) && (qe = !!ne.leading, Pe = "maxWait" in ne, ve = Pe ? ee(ce(ne.maxWait) || 0, M) : ve, fe = "trailing" in ne ? !!ne.trailing : fe);
    function E(B) {
      var X = se, ie = Ee;
      return se = Ee = void 0, Me = B, je = I.apply(ie, X), je;
    }
    function F(B) {
      return Me = B, ye = setTimeout(v, M), qe ? E(B) : je;
    }
    function N(B) {
      var X = B - _e, ie = B - Me, Ue = M - X;
      return Pe ? ue(Ue, ve - ie) : Ue;
    }
    function f(B) {
      var X = B - _e, ie = B - Me;
      return _e === void 0 || X >= M || X < 0 || Pe && ie >= ve;
    }
    function v() {
      var B = K();
      if (f(B))
        return H(B);
      ye = setTimeout(v, N(B));
    }
    function H(B) {
      return ye = void 0, fe && se ? E(B) : (se = Ee = void 0, je);
    }
    function G() {
      ye !== void 0 && clearTimeout(ye), Me = 0, se = _e = Ee = ye = void 0;
    }
    function te() {
      return ye === void 0 ? je : H(K());
    }
    function q() {
      var B = K(), X = f(B);
      if (se = arguments, Ee = this, _e = B, X) {
        if (ye === void 0)
          return F(_e);
        if (Pe)
          return ye = setTimeout(v, M), E(_e);
      }
      return ye === void 0 && (ye = setTimeout(v, M)), je;
    }
    return q.cancel = G, q.flush = te, q;
  }
  function he(I) {
    var M = typeof I;
    return !!I && (M == "object" || M == "function");
  }
  function we(I) {
    return !!I && typeof I == "object";
  }
  function ke(I) {
    return typeof I == "symbol" || we(I) && V.call(I) == c;
  }
  function ce(I) {
    if (typeof I == "number")
      return I;
    if (ke(I))
      return k;
    if (he(I)) {
      var M = typeof I.valueOf == "function" ? I.valueOf() : I;
      I = he(M) ? M + "" : M;
    }
    if (typeof I != "string")
      return I === 0 ? I : +I;
    I = I.replace(x, "");
    var ne = U.test(I);
    return ne || W.test(I) ? b(I.slice(2), ne ? 2 : 8) : L.test(I) ? k : +I;
  }
  return ji = $, ji;
}
hd();
var vd = typeof window < "u" ? J.useLayoutEffect : J.useEffect;
function yd(h, k) {
  const c = J.useRef(h);
  vd(() => {
    c.current = h;
  }, [h]), J.useEffect(() => {
    if (!k && k !== 0)
      return;
    const x = setTimeout(() => {
      c.current();
    }, k);
    return () => {
      clearTimeout(x);
    };
  }, [k]);
}
const gd = "_LoadingIndicator_7yl6f_1", wd = {
  LoadingIndicator: gd
}, kd = ({ className: h, size: k, strokeWidth: c, style: x, ...L }) => j.jsx("div", { ...L, className: Il(wd.LoadingIndicator, h), style: x || fd({
  "indicator-size": k,
  "indicator-stroke": c
}) });
function Sd(h) {
  return (k) => {
    h.forEach((c) => {
      typeof c == "function" ? c(k) : c != null && (c.current = k);
    });
  };
}
const xd = () => Ga, Ha = (h, k = !1, c = "TransitionGroup") => {
  const x = [];
  return J.Children.forEach(h, (L) => {
    if (L && typeof L == "object" && "key" in L && L.key)
      x.push(L);
    else if (k)
      throw new Error(`Child elements of <${c} /> must include a \`key\``);
  }), x;
}, In = () => {
}, On = (h) => {
  const k = J.useRef(h);
  return k.current = h, J.useCallback((c) => k.current(c), []);
};
function Ed(h, k, c, x) {
  const L = h.reduce((C, Q) => ({ ...C, [Q.key]: 1 }), {}), U = k.reduce((C, Q) => ({ ...C, [Q.component.key]: 1 }), {}), W = h.filter((C) => !U[C.key]).map(c), b = k.map((C) => ({
    ...C,
    component: h.find(({ key: Q }) => Q === C.component.key) || C.component,
    shouldRender: !!L[C.component.key]
  }));
  return x === "append" ? b.concat(W) : W.concat(b);
}
function Cd(h, k, c) {
  if ((Ga || id) && k && c > 1)
    throw new Error(`Cannot use forwardRef with multiple children in <${h} />`);
}
const _d = "_TransitionGroupChild_1hv1z_1", Nd = {
  TransitionGroupChild: _d
}, Za = {
  enter: !1,
  enterActive: !1,
  exit: !1,
  exitActive: !1,
  interrupted: !1
}, Td = (h) => ({
  ...Za,
  enter: !h
}), Pd = (h, k) => {
  switch (k.type) {
    case "enter-before":
      return {
        enter: !0,
        enterActive: !1,
        exit: !1,
        exitActive: !1,
        interrupted: h.interrupted || h.exit
      };
    case "enter-active":
      return {
        enter: !0,
        enterActive: !0,
        exit: !1,
        exitActive: !1,
        interrupted: !1
      };
    case "exit-before":
      return {
        enter: !1,
        enterActive: !1,
        exit: !0,
        exitActive: !1,
        interrupted: h.interrupted || h.enter
      };
    case "exit-active":
      return {
        enter: !1,
        enterActive: !1,
        exit: !0,
        exitActive: !0,
        interrupted: !1
      };
    case "done":
    default:
      return Za;
  }
}, zd = ({ ref: h, as: k, children: c, className: x, transitionId: L, style: U, preventMountTransition: W, shouldRender: b, enterDuration: C, exitDuration: Q, removeChild: oe, onEnter: Y, onEnterActive: V, onEnterComplete: ee, onExit: ue, onExitActive: K, onExitComplete: $ }) => {
  const [he, we] = J.useReducer(Pd, Td(W || !1)), ke = J.useRef(!1), ce = J.useRef(null), I = J.useRef(C);
  I.current = C;
  const M = J.useRef(Q);
  M.current = Q;
  const ne = J.useRef(null), se = J.useCallback((Ee) => {
    const ve = ce.current;
    if (!(!ve || Ee === ne.current))
      switch (ne.current = Ee, Ee) {
        case "enter":
          Y(ve);
          break;
        case "enter-active":
          V(ve);
          break;
        case "enter-complete":
          ee(ve);
          break;
        case "exit":
          ue(ve);
          break;
        case "exit-active":
          K(ve);
          break;
        case "exit-complete":
          $(ve);
          break;
      }
  }, [Y, V, ee, ue, K, $]);
  return qf.useLayoutEffect(() => {
    if (!b) {
      let je;
      we({ type: "exit-before" }), se("exit");
      const ye = Ba(() => {
        we({ type: "exit-active" }), se("exit-active"), je = window.setTimeout(() => {
          se("exit-complete"), oe();
        }, M.current);
      });
      return () => {
        ye(), je !== void 0 && clearTimeout(je);
      };
    }
    if (W && !ke.current) {
      ke.current = !0;
      return;
    }
    let Ee;
    we({ type: "enter-before" }), se("enter");
    const ve = Ba(() => {
      we({ type: "enter-active" }), se("enter-active"), Ee = window.setTimeout(() => {
        we({ type: "done" }), se("enter-complete");
      }, I.current);
    });
    return () => {
      ve(), Ee !== void 0 && clearTimeout(Ee);
    };
  }, [
    b,
    // This value is immutable after <TransitionGroup> is created, and does not change on re-renders.
    W,
    oe,
    se
  ]), J.useEffect(() => () => {
    ke.current = !1;
  }, []), j.jsx(k, { ref: Sd([ce, h]), className: Il(x, Nd.TransitionGroupChild), "data-transition-id": L, style: U, "data-entering": he.enter ? "" : void 0, "data-entering-active": he.enterActive ? "" : void 0, "data-exiting": he.exit ? "" : void 0, "data-exiting-active": he.exitActive ? "" : void 0, "data-interrupted": he.interrupted ? "" : void 0, children: c });
}, Ld = (h) => {
  const { enterMountDelay: k, preventMountTransition: c } = h, x = !c && k != null ? k : null, [L, U] = J.useState(x == null);
  return yd(() => U(!0), L ? null : x), L ? j.jsx(zd, { ...h }) : null;
}, Rd = (h) => {
  const { ref: k, as: c = "span", children: x, className: L, transitionId: U, style: W, enterDuration: b = 0, exitDuration: C = 0, preventInitialTransition: Q = !0, enterMountDelay: oe, insertMethod: Y = "append", disableAnimations: V = xd() } = h, ee = On(h.onEnter ?? In), ue = On(h.onEnterActive ?? In), K = On(h.onEnterComplete ?? In), $ = On(h.onExit ?? In), he = On(h.onExitActive ?? In), we = On(h.onExitComplete ?? In);
  J.Children.forEach(x, (M) => {
    if (M && !M.key)
      throw new Error("Child elements of <TransitionGroup /> must include a `key`");
  });
  const ke = J.useCallback((M) => ({
    component: M,
    shouldRender: !0,
    removeChild: () => {
      I((ne) => ne.filter((se) => M.key !== se.component.key));
    },
    onEnter: ee,
    onEnterActive: ue,
    onEnterComplete: K,
    onExit: $,
    onExitActive: he,
    onExitComplete: we
  }), [ee, ue, K, $, he, we]), [ce, I] = J.useState(() => Ha(x).map((M) => ({
    ...ke(M),
    // Lock this value to whatever the value was on initial render of the TransitionGroup.
    // It doesn't make sense to change this once it is mounted.
    preventMountTransition: Q
  })));
  return J.useLayoutEffect(() => {
    I((M) => {
      const ne = Ha(x);
      return Ed(ne, M, ke, Y);
    });
  }, [x, Y, ke]), Cd("TransitionGroup", k, J.Children.count(x)), V ? j.jsx(j.Fragment, { children: J.Children.map(x, (M) => j.jsx(
    c,
    {
      // @ts-expect-error -- TS is not happy about this forwardedRef, but it's fine.
      ref: k,
      className: L,
      style: W,
      "data-transition-id": U,
      children: M
    }
  )) }) : j.jsx(j.Fragment, { children: ce.map(({ component: M, ...ne }) => j.jsx(Ld, { ...ne, as: c, className: L, transitionId: U, enterDuration: b, exitDuration: C, enterMountDelay: oe, style: W, ref: k, children: M }, M.key)) });
}, jd = "_Button_1864l_1", Id = "_ButtonInner_1864l_4", Od = "_ButtonLoader_1864l_749", Ii = {
  Button: jd,
  ButtonInner: Id,
  ButtonLoader: Od
}, Wa = (h) => {
  const {
    type: k = "button",
    color: c = "primary",
    variant: x = "solid",
    pill: L = !0,
    uniform: U = !1,
    size: W = "md",
    iconSize: b,
    gutterSize: C,
    loading: Q,
    selected: oe,
    block: Y,
    opticallyAlign: V,
    children: ee,
    className: ue,
    onClick: K,
    disabled: $,
    disabledTone: he,
    // Defaults to `loading` state
    inert: we = Q,
    ...ke
  } = h, ce = $ || we, I = J.useCallback((M) => {
    $ || K?.(M);
  }, [K, $]);
  return j.jsxs("button", {
    type: k,
    className: Il(Ii.Button, ue),
    "data-color": c,
    "data-variant": x,
    "data-pill": L ? "" : void 0,
    "data-uniform": U ? "" : void 0,
    "data-size": W,
    "data-gutter-size": C,
    "data-icon-size": b,
    "data-loading": Q ? "" : void 0,
    "data-selected": oe ? "" : void 0,
    "data-block": Y ? "" : void 0,
    "data-optically-align": V,
    onPointerEnter: cd,
    // Non-visual, accessible disablement
    // NOTE: Do not use literal `inert` because that is incorrect semantically
    disabled: ce,
    "aria-disabled": ce,
    tabIndex: ce ? -1 : void 0,
    "data-disabled": $ ? "" : void 0,
    "data-disabled-tone": $ ? he : void 0,
    onClick: I,
    ...ke,
    children: [j.jsx(Rd, { className: Ii.ButtonLoader, enterDuration: 250, exitDuration: 150, children: Q && j.jsx(kd, {}, "loader") }), j.jsx("span", { className: Ii.ButtonInner, children: Xa(ee) })]
  });
}, Dd = "_TextLink_16uec_1", Md = {
  TextLink: Dd
}, Fd = ((h) => {
  const { children: k, primary: c = !1, underline: x = !c, className: L, target: U, forceExternal: W, as: b, href: C, to: Q, ...oe } = h, Y = W ?? /^https?:\/\//.test(C ?? Q ?? ""), V = md(), ee = b || (Y ? "a" : V), ue = {
    ...oe,
    className: Il(Md.TextLink, L),
    "data-primary": c ? "" : void 0,
    "data-underline": x ? "" : void 0
  };
  if (!C && !Q)
    return (
      // the forwardedRef is lying here, but should be fine. :innocent:
      j.jsx("span", { ...ue, role: "button", children: k })
    );
  const K = {
    ...Y ? { target: "_blank", rel: "noopener noreferrer", href: C ?? Q } : { href: C, to: Q },
    ...ue
  };
  return j.jsx(ee, { ...K, children: k });
});
function Oi(h) {
  const k = h.toolOutput?.data || h.toolOutput || {}, c = k.already_saved ?? k.alreadySaved;
  return {
    ...k,
    alreadySaved: c
  };
}
function Qa() {
  const h = window.openai ?? {};
  return {
    toolInput: h.toolInput ?? null,
    toolOutput: h.toolOutput ?? null
  };
}
function Ad({
  logo: h,
  companyName: k
}) {
  const [c, x] = J.useState(!1);
  return !h || c ? /* @__PURE__ */ j.jsx("div", { className: "text-neutral-400 text-4xl font-bold", children: k[0] || "?" }) : /* @__PURE__ */ j.jsxs(j.Fragment, { children: [
    /* @__PURE__ */ j.jsx(
      "img",
      {
        src: h,
        alt: "",
        className: "absolute inset-0 h-full w-full object-cover opacity-20 filter blur-xl",
        "aria-hidden": "true"
      }
    ),
    /* @__PURE__ */ j.jsx(
      "img",
      {
        src: h,
        alt: `${k} logo`,
        className: "max-h-20 max-w-20 object-contain rounded-md z-10",
        onError: () => x(!0)
      }
    )
  ] });
}
function Ud() {
  const [h, k] = J.useState(Qa), c = Oi(h), [x, L] = J.useState(!1), [U, W] = J.useState(!!c.alreadySaved);
  J.useEffect(() => {
    function V() {
      const ee = Qa();
      k(ee);
      const ue = Oi(ee);
      W(!!ue.alreadySaved);
    }
    return window.addEventListener("openai:set_globals", V), () => {
      window.removeEventListener("openai:set_globals", V);
    };
  }, []);
  const b = !h.toolOutput, C = Oi(h), Q = C.emailsCount?.total ?? C.site?.emailAddresses?.length ?? 0;
  async function oe() {
    if (x || U || !C.domain) return;
    const V = window.openai;
    if (V?.callTool) {
      L(!0);
      try {
        await V.callTool("save", { domain: C.domain }), W(!0);
      } catch (ee) {
        throw new Error(ee instanceof Error ? ee.message : String(ee));
      } finally {
        L(!1);
      }
    }
  }
  function Y(V) {
    if (!V) return;
    const ee = window.openai, ue = new URL(`https://hunter.io/search/${V}`);
    ue.searchParams.set("utm_source", "hunter-chatgpt"), ee?.openExternal ? ee.openExternal({ href: ue.toString() }) : window.open(ue.toString(), "_blank", "noopener,noreferrer");
  }
  return b ? /* @__PURE__ */ j.jsxs("div", { className: "w-full max-w-sm rounded-2xl bg-[var(--color-surface)] border border-[0.5px] border-[var(--color-border-primary-outline)] shadow-[var(--shadow-300)]", children: [
    /* @__PURE__ */ j.jsx("div", { className: "m-2 rounded-xl bg-neutral-100 min-h-[232px] animate-pulse" }),
    /* @__PURE__ */ j.jsxs("div", { className: "p-4 space-y-3 pt-2 animate-pulse", children: [
      /* @__PURE__ */ j.jsxs("div", { className: "flex justify-between items-baseline gap-4", children: [
        /* @__PURE__ */ j.jsx("div", { className: "h-4 w-32 rounded bg-neutral-200" }),
        /* @__PURE__ */ j.jsx("div", { className: "h-3 w-20 rounded bg-neutral-200" })
      ] }),
      /* @__PURE__ */ j.jsx("div", { className: "h-3 w-40 rounded bg-neutral-200" }),
      /* @__PURE__ */ j.jsx("div", { className: "border-t border-dashed border-black/10" }),
      /* @__PURE__ */ j.jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ j.jsx("div", { className: "h-3 w-full rounded bg-neutral-200" }),
        /* @__PURE__ */ j.jsx("div", { className: "h-3 w-5/6 rounded bg-neutral-200" })
      ] }),
      /* @__PURE__ */ j.jsxs("div", { className: "flex gap-3 pt-4", children: [
        /* @__PURE__ */ j.jsx("div", { className: "h-10 flex-1 rounded-full bg-neutral-200" }),
        /* @__PURE__ */ j.jsx("div", { className: "h-10 flex-1 rounded-full bg-neutral-200" })
      ] })
    ] })
  ] }) : /* @__PURE__ */ j.jsxs("div", { className: "w-full max-w-sm rounded-2xl bg-[var(--color-surface)] border border-[0.5px] border-[var(--color-border-primary-outline)] shadow-[var(--shadow-300)]", children: [
    /* @__PURE__ */ j.jsx("div", { className: "relative h-48 rounded-xl overflow-hidden bg-neutral-100 m-2 min-h-[232px]", children: /* @__PURE__ */ j.jsx("div", { className: "relative flex h-full items-center justify-center", children: /* @__PURE__ */ j.jsx(
      Ad,
      {
        logo: C.logo,
        companyName: C.name || "Company"
      }
    ) }) }),
    /* @__PURE__ */ j.jsxs("div", { className: "p-4 space-y-3 pt-2", children: [
      /* @__PURE__ */ j.jsxs("div", { className: "flex justify-between items-baseline", children: [
        /* @__PURE__ */ j.jsx("h1", { className: "text-xl font-medium text", children: C.name || "Unknown Company" }),
        Q > 0 && /* @__PURE__ */ j.jsxs("span", { className: "text-sm whitespace-nowrap ml-4 text-secondary", children: [
          Q,
          " email ",
          Q === 1 ? "address" : "addresses"
        ] })
      ] }),
      /* @__PURE__ */ j.jsxs("span", { className: "block text-sm text-secondary", children: [
        C.domain && /* @__PURE__ */ j.jsxs(j.Fragment, { children: [
          /* @__PURE__ */ j.jsx(Fd, { href: `https://${C.domain}`, target: "_blank", children: C.domain }),
          (C.metrics?.employees || C.location) && " · "
        ] }),
        C.metrics?.employees && /* @__PURE__ */ j.jsxs(j.Fragment, { children: [
          C.metrics.employees,
          " employees",
          C.location && " · "
        ] }),
        C.location && /* @__PURE__ */ j.jsx(j.Fragment, { children: C.location })
      ] }),
      /* @__PURE__ */ j.jsx("div", { className: "border-t border-dashed border-black/10" }),
      C.description && /* @__PURE__ */ j.jsx("p", { className: "text-sm text-secondary", children: C.description }),
      /* @__PURE__ */ j.jsxs("div", { className: "flex gap-3 py-2", children: [
        /* @__PURE__ */ j.jsx(
          Wa,
          {
            className: "before:bg-hunter-600 hover:before:bg-hunter-700",
            color: "primary",
            size: "lg",
            variant: "solid",
            loading: x,
            inert: U,
            onClick: oe,
            children: U ? "Saved" : "Save in Hunter"
          }
        ),
        /* @__PURE__ */ j.jsx(
          Wa,
          {
            color: "secondary",
            size: "lg",
            variant: "soft",
            onClick: () => Y(C.domain),
            children: "View in Hunter"
          }
        )
      ] })
    ] })
  ] });
}
ld.createRoot(document.getElementById("root")).render(
  /* @__PURE__ */ j.jsx(J.StrictMode, { children: /* @__PURE__ */ j.jsx(Ud, {}) })
);
