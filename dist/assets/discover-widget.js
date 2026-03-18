var Rl = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function Xf(m) {
  return m && m.__esModule && Object.prototype.hasOwnProperty.call(m, "default") ? m.default : m;
}
var To = { exports: {} }, kr = {}, Po = { exports: {} }, X = {};
var La;
function Zf() {
  if (La) return X;
  La = 1;
  var m = Symbol.for("react.element"), k = Symbol.for("react.portal"), c = Symbol.for("react.fragment"), x = Symbol.for("react.strict_mode"), _ = Symbol.for("react.profiler"), F = Symbol.for("react.provider"), W = Symbol.for("react.context"), q = Symbol.for("react.forward_ref"), U = Symbol.for("react.suspense"), J = Symbol.for("react.memo"), le = Symbol.for("react.lazy"), K = Symbol.iterator;
  function $(f) {
    return f === null || typeof f != "object" ? null : (f = K && f[K] || f["@@iterator"], typeof f == "function" ? f : null);
  }
  var ie = { isMounted: function() {
    return !1;
  }, enqueueForceUpdate: function() {
  }, enqueueReplaceState: function() {
  }, enqueueSetState: function() {
  } }, fe = Object.assign, A = {};
  function H(f, v, Q) {
    this.props = f, this.context = v, this.refs = A, this.updater = Q || ie;
  }
  H.prototype.isReactComponent = {}, H.prototype.setState = function(f, v) {
    if (typeof f != "object" && typeof f != "function" && f != null) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
    this.updater.enqueueSetState(this, f, v, "setState");
  }, H.prototype.forceUpdate = function(f) {
    this.updater.enqueueForceUpdate(this, f, "forceUpdate");
  };
  function he() {
  }
  he.prototype = H.prototype;
  function de(f, v, Q) {
    this.props = f, this.context = v, this.refs = A, this.updater = Q || ie;
  }
  var ce = de.prototype = new he();
  ce.constructor = de, fe(ce, H.prototype), ce.isPureReactComponent = !0;
  var ae = Array.isArray, j = Object.prototype.hasOwnProperty, O = { current: null }, te = { key: !0, ref: !0, __self: !0, __source: !0 };
  function ue(f, v, Q) {
    var G, ee = {}, b = null, B = null;
    if (v != null) for (G in v.ref !== void 0 && (B = v.ref), v.key !== void 0 && (b = "" + v.key), v) j.call(v, G) && !te.hasOwnProperty(G) && (ee[G] = v[G]);
    var Y = arguments.length - 2;
    if (Y === 1) ee.children = Q;
    else if (1 < Y) {
      for (var oe = Array(Y), Ae = 0; Ae < Y; Ae++) oe[Ae] = arguments[Ae + 2];
      ee.children = oe;
    }
    if (f && f.defaultProps) for (G in Y = f.defaultProps, Y) ee[G] === void 0 && (ee[G] = Y[G]);
    return { $$typeof: m, type: f, key: b, ref: B, props: ee, _owner: O.current };
  }
  function Ee(f, v) {
    return { $$typeof: m, type: f.type, key: v, ref: f.ref, props: f.props, _owner: f._owner };
  }
  function ge(f) {
    return typeof f == "object" && f !== null && f.$$typeof === m;
  }
  function je(f) {
    var v = { "=": "=0", ":": "=2" };
    return "$" + f.replace(/[=:]/g, function(Q) {
      return v[Q];
    });
  }
  var we = /\/+/g;
  function _e(f, v) {
    return typeof f == "object" && f !== null && f.key != null ? je("" + f.key) : v.toString(36);
  }
  function De(f, v, Q, G, ee) {
    var b = typeof f;
    (b === "undefined" || b === "boolean") && (f = null);
    var B = !1;
    if (f === null) B = !0;
    else switch (b) {
      case "string":
      case "number":
        B = !0;
        break;
      case "object":
        switch (f.$$typeof) {
          case m:
          case k:
            B = !0;
        }
    }
    if (B) return B = f, ee = ee(B), f = G === "" ? "." + _e(B, 0) : G, ae(ee) ? (Q = "", f != null && (Q = f.replace(we, "$&/") + "/"), De(ee, v, Q, "", function(Ae) {
      return Ae;
    })) : ee != null && (ge(ee) && (ee = Ee(ee, Q + (!ee.key || B && B.key === ee.key ? "" : ("" + ee.key).replace(we, "$&/") + "/") + f)), v.push(ee)), 1;
    if (B = 0, G = G === "" ? "." : G + ":", ae(f)) for (var Y = 0; Y < f.length; Y++) {
      b = f[Y];
      var oe = G + _e(b, Y);
      B += De(b, v, Q, oe, ee);
    }
    else if (oe = $(f), typeof oe == "function") for (f = oe.call(f), Y = 0; !(b = f.next()).done; ) b = b.value, oe = G + _e(b, Y++), B += De(b, v, Q, oe, ee);
    else if (b === "object") throw v = String(f), Error("Objects are not valid as a React child (found: " + (v === "[object Object]" ? "object with keys {" + Object.keys(f).join(", ") + "}" : v) + "). If you meant to render a collection of children, use an array instead.");
    return B;
  }
  function qe(f, v, Q) {
    if (f == null) return f;
    var G = [], ee = 0;
    return De(f, G, "", "", function(b) {
      return v.call(Q, b, ee++);
    }), G;
  }
  function Pe(f) {
    if (f._status === -1) {
      var v = f._result;
      v = v(), v.then(function(Q) {
        (f._status === 0 || f._status === -1) && (f._status = 1, f._result = Q);
      }, function(Q) {
        (f._status === 0 || f._status === -1) && (f._status = 2, f._result = Q);
      }), f._status === -1 && (f._status = 0, f._result = v);
    }
    if (f._status === 1) return f._result.default;
    throw f._result;
  }
  var pe = { current: null }, E = { transition: null }, D = { ReactCurrentDispatcher: pe, ReactCurrentBatchConfig: E, ReactCurrentOwner: O };
  function N() {
    throw Error("act(...) is not supported in production builds of React.");
  }
  return X.Children = { map: qe, forEach: function(f, v, Q) {
    qe(f, function() {
      v.apply(this, arguments);
    }, Q);
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
    if (!ge(f)) throw Error("React.Children.only expected to receive a single React element child.");
    return f;
  } }, X.Component = H, X.Fragment = c, X.Profiler = _, X.PureComponent = de, X.StrictMode = x, X.Suspense = U, X.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = D, X.act = N, X.cloneElement = function(f, v, Q) {
    if (f == null) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + f + ".");
    var G = fe({}, f.props), ee = f.key, b = f.ref, B = f._owner;
    if (v != null) {
      if (v.ref !== void 0 && (b = v.ref, B = O.current), v.key !== void 0 && (ee = "" + v.key), f.type && f.type.defaultProps) var Y = f.type.defaultProps;
      for (oe in v) j.call(v, oe) && !te.hasOwnProperty(oe) && (G[oe] = v[oe] === void 0 && Y !== void 0 ? Y[oe] : v[oe]);
    }
    var oe = arguments.length - 2;
    if (oe === 1) G.children = Q;
    else if (1 < oe) {
      Y = Array(oe);
      for (var Ae = 0; Ae < oe; Ae++) Y[Ae] = arguments[Ae + 2];
      G.children = Y;
    }
    return { $$typeof: m, type: f.type, key: ee, ref: b, props: G, _owner: B };
  }, X.createContext = function(f) {
    return f = { $$typeof: W, _currentValue: f, _currentValue2: f, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null }, f.Provider = { $$typeof: F, _context: f }, f.Consumer = f;
  }, X.createElement = ue, X.createFactory = function(f) {
    var v = ue.bind(null, f);
    return v.type = f, v;
  }, X.createRef = function() {
    return { current: null };
  }, X.forwardRef = function(f) {
    return { $$typeof: q, render: f };
  }, X.isValidElement = ge, X.lazy = function(f) {
    return { $$typeof: le, _payload: { _status: -1, _result: f }, _init: Pe };
  }, X.memo = function(f, v) {
    return { $$typeof: J, type: f, compare: v === void 0 ? null : v };
  }, X.startTransition = function(f) {
    var v = E.transition;
    E.transition = {};
    try {
      f();
    } finally {
      E.transition = v;
    }
  }, X.unstable_act = N, X.useCallback = function(f, v) {
    return pe.current.useCallback(f, v);
  }, X.useContext = function(f) {
    return pe.current.useContext(f);
  }, X.useDebugValue = function() {
  }, X.useDeferredValue = function(f) {
    return pe.current.useDeferredValue(f);
  }, X.useEffect = function(f, v) {
    return pe.current.useEffect(f, v);
  }, X.useId = function() {
    return pe.current.useId();
  }, X.useImperativeHandle = function(f, v, Q) {
    return pe.current.useImperativeHandle(f, v, Q);
  }, X.useInsertionEffect = function(f, v) {
    return pe.current.useInsertionEffect(f, v);
  }, X.useLayoutEffect = function(f, v) {
    return pe.current.useLayoutEffect(f, v);
  }, X.useMemo = function(f, v) {
    return pe.current.useMemo(f, v);
  }, X.useReducer = function(f, v, Q) {
    return pe.current.useReducer(f, v, Q);
  }, X.useRef = function(f) {
    return pe.current.useRef(f);
  }, X.useState = function(f) {
    return pe.current.useState(f);
  }, X.useSyncExternalStore = function(f, v, Q) {
    return pe.current.useSyncExternalStore(f, v, Q);
  }, X.useTransition = function() {
    return pe.current.useTransition();
  }, X.version = "18.3.1", X;
}
var Ra;
function Mo() {
  return Ra || (Ra = 1, Po.exports = Zf()), Po.exports;
}
var ja;
function Jf() {
  if (ja) return kr;
  ja = 1;
  var m = Mo(), k = Symbol.for("react.element"), c = Symbol.for("react.fragment"), x = Object.prototype.hasOwnProperty, _ = m.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, F = { key: !0, ref: !0, __self: !0, __source: !0 };
  function W(q, U, J) {
    var le, K = {}, $ = null, ie = null;
    J !== void 0 && ($ = "" + J), U.key !== void 0 && ($ = "" + U.key), U.ref !== void 0 && (ie = U.ref);
    for (le in U) x.call(U, le) && !F.hasOwnProperty(le) && (K[le] = U[le]);
    if (q && q.defaultProps) for (le in U = q.defaultProps, U) K[le] === void 0 && (K[le] = U[le]);
    return { $$typeof: k, type: q, key: $, ref: ie, props: K, _owner: _.current };
  }
  return kr.Fragment = c, kr.jsx = W, kr.jsxs = W, kr;
}
var Ia;
function qf() {
  return Ia || (Ia = 1, To.exports = Jf()), To.exports;
}
var R = qf(), Z = Mo();
const bf = /* @__PURE__ */ Xf(Z);
var jl = {}, zo = { exports: {} }, Je = {}, Lo = { exports: {} }, Ro = {};
var Ma;
function ed() {
  return Ma || (Ma = 1, (function(m) {
    function k(E, D) {
      var N = E.length;
      E.push(D);
      e: for (; 0 < N; ) {
        var f = N - 1 >>> 1, v = E[f];
        if (0 < _(v, D)) E[f] = D, E[N] = v, N = f;
        else break e;
      }
    }
    function c(E) {
      return E.length === 0 ? null : E[0];
    }
    function x(E) {
      if (E.length === 0) return null;
      var D = E[0], N = E.pop();
      if (N !== D) {
        E[0] = N;
        e: for (var f = 0, v = E.length, Q = v >>> 1; f < Q; ) {
          var G = 2 * (f + 1) - 1, ee = E[G], b = G + 1, B = E[b];
          if (0 > _(ee, N)) b < v && 0 > _(B, ee) ? (E[f] = B, E[b] = N, f = b) : (E[f] = ee, E[G] = N, f = G);
          else if (b < v && 0 > _(B, N)) E[f] = B, E[b] = N, f = b;
          else break e;
        }
      }
      return D;
    }
    function _(E, D) {
      var N = E.sortIndex - D.sortIndex;
      return N !== 0 ? N : E.id - D.id;
    }
    if (typeof performance == "object" && typeof performance.now == "function") {
      var F = performance;
      m.unstable_now = function() {
        return F.now();
      };
    } else {
      var W = Date, q = W.now();
      m.unstable_now = function() {
        return W.now() - q;
      };
    }
    var U = [], J = [], le = 1, K = null, $ = 3, ie = !1, fe = !1, A = !1, H = typeof setTimeout == "function" ? setTimeout : null, he = typeof clearTimeout == "function" ? clearTimeout : null, de = typeof setImmediate < "u" ? setImmediate : null;
    typeof navigator < "u" && navigator.scheduling !== void 0 && navigator.scheduling.isInputPending !== void 0 && navigator.scheduling.isInputPending.bind(navigator.scheduling);
    function ce(E) {
      for (var D = c(J); D !== null; ) {
        if (D.callback === null) x(J);
        else if (D.startTime <= E) x(J), D.sortIndex = D.expirationTime, k(U, D);
        else break;
        D = c(J);
      }
    }
    function ae(E) {
      if (A = !1, ce(E), !fe) if (c(U) !== null) fe = !0, Pe(j);
      else {
        var D = c(J);
        D !== null && pe(ae, D.startTime - E);
      }
    }
    function j(E, D) {
      fe = !1, A && (A = !1, he(ue), ue = -1), ie = !0;
      var N = $;
      try {
        for (ce(D), K = c(U); K !== null && (!(K.expirationTime > D) || E && !je()); ) {
          var f = K.callback;
          if (typeof f == "function") {
            K.callback = null, $ = K.priorityLevel;
            var v = f(K.expirationTime <= D);
            D = m.unstable_now(), typeof v == "function" ? K.callback = v : K === c(U) && x(U), ce(D);
          } else x(U);
          K = c(U);
        }
        if (K !== null) var Q = !0;
        else {
          var G = c(J);
          G !== null && pe(ae, G.startTime - D), Q = !1;
        }
        return Q;
      } finally {
        K = null, $ = N, ie = !1;
      }
    }
    var O = !1, te = null, ue = -1, Ee = 5, ge = -1;
    function je() {
      return !(m.unstable_now() - ge < Ee);
    }
    function we() {
      if (te !== null) {
        var E = m.unstable_now();
        ge = E;
        var D = !0;
        try {
          D = te(!0, E);
        } finally {
          D ? _e() : (O = !1, te = null);
        }
      } else O = !1;
    }
    var _e;
    if (typeof de == "function") _e = function() {
      de(we);
    };
    else if (typeof MessageChannel < "u") {
      var De = new MessageChannel(), qe = De.port2;
      De.port1.onmessage = we, _e = function() {
        qe.postMessage(null);
      };
    } else _e = function() {
      H(we, 0);
    };
    function Pe(E) {
      te = E, O || (O = !0, _e());
    }
    function pe(E, D) {
      ue = H(function() {
        E(m.unstable_now());
      }, D);
    }
    m.unstable_IdlePriority = 5, m.unstable_ImmediatePriority = 1, m.unstable_LowPriority = 4, m.unstable_NormalPriority = 3, m.unstable_Profiling = null, m.unstable_UserBlockingPriority = 2, m.unstable_cancelCallback = function(E) {
      E.callback = null;
    }, m.unstable_continueExecution = function() {
      fe || ie || (fe = !0, Pe(j));
    }, m.unstable_forceFrameRate = function(E) {
      0 > E || 125 < E ? console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported") : Ee = 0 < E ? Math.floor(1e3 / E) : 5;
    }, m.unstable_getCurrentPriorityLevel = function() {
      return $;
    }, m.unstable_getFirstCallbackNode = function() {
      return c(U);
    }, m.unstable_next = function(E) {
      switch ($) {
        case 1:
        case 2:
        case 3:
          var D = 3;
          break;
        default:
          D = $;
      }
      var N = $;
      $ = D;
      try {
        return E();
      } finally {
        $ = N;
      }
    }, m.unstable_pauseExecution = function() {
    }, m.unstable_requestPaint = function() {
    }, m.unstable_runWithPriority = function(E, D) {
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
      var N = $;
      $ = E;
      try {
        return D();
      } finally {
        $ = N;
      }
    }, m.unstable_scheduleCallback = function(E, D, N) {
      var f = m.unstable_now();
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
      return v = N + v, E = { id: le++, callback: D, priorityLevel: E, startTime: N, expirationTime: v, sortIndex: -1 }, N > f ? (E.sortIndex = N, k(J, E), c(U) === null && E === c(J) && (A ? (he(ue), ue = -1) : A = !0, pe(ae, N - f))) : (E.sortIndex = v, k(U, E), fe || ie || (fe = !0, Pe(j))), E;
    }, m.unstable_shouldYield = je, m.unstable_wrapCallback = function(E) {
      var D = $;
      return function() {
        var N = $;
        $ = D;
        try {
          return E.apply(this, arguments);
        } finally {
          $ = N;
        }
      };
    };
  })(Ro)), Ro;
}
var Oa;
function td() {
  return Oa || (Oa = 1, Lo.exports = ed()), Lo.exports;
}
var Da;
function nd() {
  if (Da) return Je;
  Da = 1;
  var m = Mo(), k = td();
  function c(e) {
    for (var t = "https://reactjs.org/docs/error-decoder.html?invariant=" + e, n = 1; n < arguments.length; n++) t += "&args[]=" + encodeURIComponent(arguments[n]);
    return "Minified React error #" + e + "; visit " + t + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  var x = /* @__PURE__ */ new Set(), _ = {};
  function F(e, t) {
    W(e, t), W(e + "Capture", t);
  }
  function W(e, t) {
    for (_[e] = t, e = 0; e < t.length; e++) x.add(t[e]);
  }
  var q = !(typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u"), U = Object.prototype.hasOwnProperty, J = /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/, le = {}, K = {};
  function $(e) {
    return U.call(K, e) ? !0 : U.call(le, e) ? !1 : J.test(e) ? K[e] = !0 : (le[e] = !0, !1);
  }
  function ie(e, t, n, r) {
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
  function fe(e, t, n, r) {
    if (t === null || typeof t > "u" || ie(e, t, n, r)) return !0;
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
  function A(e, t, n, r, l, i, o) {
    this.acceptsBooleans = t === 2 || t === 3 || t === 4, this.attributeName = r, this.attributeNamespace = l, this.mustUseProperty = n, this.propertyName = e, this.type = t, this.sanitizeURL = i, this.removeEmptyString = o;
  }
  var H = {};
  "children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(e) {
    H[e] = new A(e, 0, !1, e, null, !1, !1);
  }), [["acceptCharset", "accept-charset"], ["className", "class"], ["htmlFor", "for"], ["httpEquiv", "http-equiv"]].forEach(function(e) {
    var t = e[0];
    H[t] = new A(t, 1, !1, e[1], null, !1, !1);
  }), ["contentEditable", "draggable", "spellCheck", "value"].forEach(function(e) {
    H[e] = new A(e, 2, !1, e.toLowerCase(), null, !1, !1);
  }), ["autoReverse", "externalResourcesRequired", "focusable", "preserveAlpha"].forEach(function(e) {
    H[e] = new A(e, 2, !1, e, null, !1, !1);
  }), "allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(e) {
    H[e] = new A(e, 3, !1, e.toLowerCase(), null, !1, !1);
  }), ["checked", "multiple", "muted", "selected"].forEach(function(e) {
    H[e] = new A(e, 3, !0, e, null, !1, !1);
  }), ["capture", "download"].forEach(function(e) {
    H[e] = new A(e, 4, !1, e, null, !1, !1);
  }), ["cols", "rows", "size", "span"].forEach(function(e) {
    H[e] = new A(e, 6, !1, e, null, !1, !1);
  }), ["rowSpan", "start"].forEach(function(e) {
    H[e] = new A(e, 5, !1, e.toLowerCase(), null, !1, !1);
  });
  var he = /[\-:]([a-z])/g;
  function de(e) {
    return e[1].toUpperCase();
  }
  "accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(e) {
    var t = e.replace(
      he,
      de
    );
    H[t] = new A(t, 1, !1, e, null, !1, !1);
  }), "xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(e) {
    var t = e.replace(he, de);
    H[t] = new A(t, 1, !1, e, "http://www.w3.org/1999/xlink", !1, !1);
  }), ["xml:base", "xml:lang", "xml:space"].forEach(function(e) {
    var t = e.replace(he, de);
    H[t] = new A(t, 1, !1, e, "http://www.w3.org/XML/1998/namespace", !1, !1);
  }), ["tabIndex", "crossOrigin"].forEach(function(e) {
    H[e] = new A(e, 1, !1, e.toLowerCase(), null, !1, !1);
  }), H.xlinkHref = new A("xlinkHref", 1, !1, "xlink:href", "http://www.w3.org/1999/xlink", !0, !1), ["src", "href", "action", "formAction"].forEach(function(e) {
    H[e] = new A(e, 1, !1, e.toLowerCase(), null, !0, !0);
  });
  function ce(e, t, n, r) {
    var l = H.hasOwnProperty(t) ? H[t] : null;
    (l !== null ? l.type !== 0 : r || !(2 < t.length) || t[0] !== "o" && t[0] !== "O" || t[1] !== "n" && t[1] !== "N") && (fe(t, n, l, r) && (n = null), r || l === null ? $(t) && (n === null ? e.removeAttribute(t) : e.setAttribute(t, "" + n)) : l.mustUseProperty ? e[l.propertyName] = n === null ? l.type === 3 ? !1 : "" : n : (t = l.attributeName, r = l.attributeNamespace, n === null ? e.removeAttribute(t) : (l = l.type, n = l === 3 || l === 4 && n === !0 ? "" : "" + n, r ? e.setAttributeNS(r, t, n) : e.setAttribute(t, n))));
  }
  var ae = m.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, j = Symbol.for("react.element"), O = Symbol.for("react.portal"), te = Symbol.for("react.fragment"), ue = Symbol.for("react.strict_mode"), Ee = Symbol.for("react.profiler"), ge = Symbol.for("react.provider"), je = Symbol.for("react.context"), we = Symbol.for("react.forward_ref"), _e = Symbol.for("react.suspense"), De = Symbol.for("react.suspense_list"), qe = Symbol.for("react.memo"), Pe = Symbol.for("react.lazy"), pe = Symbol.for("react.offscreen"), E = Symbol.iterator;
  function D(e) {
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
  var Q = !1;
  function G(e, t) {
    if (!e || Q) return "";
    Q = !0;
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
        } catch (h) {
          var r = h;
        }
        Reflect.construct(e, [], t);
      } else {
        try {
          t.call();
        } catch (h) {
          r = h;
        }
        e.call(t.prototype);
      }
      else {
        try {
          throw Error();
        } catch (h) {
          r = h;
        }
        e();
      }
    } catch (h) {
      if (h && r && typeof h.stack == "string") {
        for (var l = h.stack.split(`
`), i = r.stack.split(`
`), o = l.length - 1, u = i.length - 1; 1 <= o && 0 <= u && l[o] !== i[u]; ) u--;
        for (; 1 <= o && 0 <= u; o--, u--) if (l[o] !== i[u]) {
          if (o !== 1 || u !== 1)
            do
              if (o--, u--, 0 > u || l[o] !== i[u]) {
                var s = `
` + l[o].replace(" at new ", " at ");
                return e.displayName && s.includes("<anonymous>") && (s = s.replace("<anonymous>", e.displayName)), s;
              }
            while (1 <= o && 0 <= u);
          break;
        }
      }
    } finally {
      Q = !1, Error.prepareStackTrace = n;
    }
    return (e = e ? e.displayName || e.name : "") ? v(e) : "";
  }
  function ee(e) {
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
  function b(e) {
    if (e == null) return null;
    if (typeof e == "function") return e.displayName || e.name || null;
    if (typeof e == "string") return e;
    switch (e) {
      case te:
        return "Fragment";
      case O:
        return "Portal";
      case Ee:
        return "Profiler";
      case ue:
        return "StrictMode";
      case _e:
        return "Suspense";
      case De:
        return "SuspenseList";
    }
    if (typeof e == "object") switch (e.$$typeof) {
      case je:
        return (e.displayName || "Context") + ".Consumer";
      case ge:
        return (e._context.displayName || "Context") + ".Provider";
      case we:
        var t = e.render;
        return e = e.displayName, e || (e = t.displayName || t.name || "", e = e !== "" ? "ForwardRef(" + e + ")" : "ForwardRef"), e;
      case qe:
        return t = e.displayName || null, t !== null ? t : b(e.type) || "Memo";
      case Pe:
        t = e._payload, e = e._init;
        try {
          return b(e(t));
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
        return b(t);
      case 8:
        return t === ue ? "StrictMode" : "Mode";
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
  function Y(e) {
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
  function oe(e) {
    var t = e.type;
    return (e = e.nodeName) && e.toLowerCase() === "input" && (t === "checkbox" || t === "radio");
  }
  function Ae(e) {
    var t = oe(e) ? "checked" : "value", n = Object.getOwnPropertyDescriptor(e.constructor.prototype, t), r = "" + e[t];
    if (!e.hasOwnProperty(t) && typeof n < "u" && typeof n.get == "function" && typeof n.set == "function") {
      var l = n.get, i = n.set;
      return Object.defineProperty(e, t, { configurable: !0, get: function() {
        return l.call(this);
      }, set: function(o) {
        r = "" + o, i.call(this, o);
      } }), Object.defineProperty(e, t, { enumerable: n.enumerable }), { getValue: function() {
        return r;
      }, setValue: function(o) {
        r = "" + o;
      }, stopTracking: function() {
        e._valueTracker = null, delete e[t];
      } };
    }
  }
  function Sr(e) {
    e._valueTracker || (e._valueTracker = Ae(e));
  }
  function Do(e) {
    if (!e) return !1;
    var t = e._valueTracker;
    if (!t) return !0;
    var n = t.getValue(), r = "";
    return e && (r = oe(e) ? e.checked ? "true" : "false" : e.value), e = r, e !== n ? (t.setValue(e), !0) : !1;
  }
  function xr(e) {
    if (e = e || (typeof document < "u" ? document : void 0), typeof e > "u") return null;
    try {
      return e.activeElement || e.body;
    } catch {
      return e.body;
    }
  }
  function Il(e, t) {
    var n = t.checked;
    return N({}, t, { defaultChecked: void 0, defaultValue: void 0, value: void 0, checked: n ?? e._wrapperState.initialChecked });
  }
  function Fo(e, t) {
    var n = t.defaultValue == null ? "" : t.defaultValue, r = t.checked != null ? t.checked : t.defaultChecked;
    n = Y(t.value != null ? t.value : n), e._wrapperState = { initialChecked: r, initialValue: n, controlled: t.type === "checkbox" || t.type === "radio" ? t.checked != null : t.value != null };
  }
  function Uo(e, t) {
    t = t.checked, t != null && ce(e, "checked", t, !1);
  }
  function Ml(e, t) {
    Uo(e, t);
    var n = Y(t.value), r = t.type;
    if (n != null) r === "number" ? (n === 0 && e.value === "" || e.value != n) && (e.value = "" + n) : e.value !== "" + n && (e.value = "" + n);
    else if (r === "submit" || r === "reset") {
      e.removeAttribute("value");
      return;
    }
    t.hasOwnProperty("value") ? Ol(e, t.type, n) : t.hasOwnProperty("defaultValue") && Ol(e, t.type, Y(t.defaultValue)), t.checked == null && t.defaultChecked != null && (e.defaultChecked = !!t.defaultChecked);
  }
  function Ao(e, t, n) {
    if (t.hasOwnProperty("value") || t.hasOwnProperty("defaultValue")) {
      var r = t.type;
      if (!(r !== "submit" && r !== "reset" || t.value !== void 0 && t.value !== null)) return;
      t = "" + e._wrapperState.initialValue, n || t === e.value || (e.value = t), e.defaultValue = t;
    }
    n = e.name, n !== "" && (e.name = ""), e.defaultChecked = !!e._wrapperState.initialChecked, n !== "" && (e.name = n);
  }
  function Ol(e, t, n) {
    (t !== "number" || xr(e.ownerDocument) !== e) && (n == null ? e.defaultValue = "" + e._wrapperState.initialValue : e.defaultValue !== "" + n && (e.defaultValue = "" + n));
  }
  var On = Array.isArray;
  function sn(e, t, n, r) {
    if (e = e.options, t) {
      t = {};
      for (var l = 0; l < n.length; l++) t["$" + n[l]] = !0;
      for (n = 0; n < e.length; n++) l = t.hasOwnProperty("$" + e[n].value), e[n].selected !== l && (e[n].selected = l), l && r && (e[n].defaultSelected = !0);
    } else {
      for (n = "" + Y(n), t = null, l = 0; l < e.length; l++) {
        if (e[l].value === n) {
          e[l].selected = !0, r && (e[l].defaultSelected = !0);
          return;
        }
        t !== null || e[l].disabled || (t = e[l]);
      }
      t !== null && (t.selected = !0);
    }
  }
  function Dl(e, t) {
    if (t.dangerouslySetInnerHTML != null) throw Error(c(91));
    return N({}, t, { value: void 0, defaultValue: void 0, children: "" + e._wrapperState.initialValue });
  }
  function Vo(e, t) {
    var n = t.value;
    if (n == null) {
      if (n = t.children, t = t.defaultValue, n != null) {
        if (t != null) throw Error(c(92));
        if (On(n)) {
          if (1 < n.length) throw Error(c(93));
          n = n[0];
        }
        t = n;
      }
      t == null && (t = ""), n = t;
    }
    e._wrapperState = { initialValue: Y(n) };
  }
  function Bo(e, t) {
    var n = Y(t.value), r = Y(t.defaultValue);
    n != null && (n = "" + n, n !== e.value && (e.value = n), t.defaultValue == null && e.defaultValue !== n && (e.defaultValue = n)), r != null && (e.defaultValue = "" + r);
  }
  function Ho(e) {
    var t = e.textContent;
    t === e._wrapperState.initialValue && t !== "" && t !== null && (e.value = t);
  }
  function Wo(e) {
    switch (e) {
      case "svg":
        return "http://www.w3.org/2000/svg";
      case "math":
        return "http://www.w3.org/1998/Math/MathML";
      default:
        return "http://www.w3.org/1999/xhtml";
    }
  }
  function Fl(e, t) {
    return e == null || e === "http://www.w3.org/1999/xhtml" ? Wo(t) : e === "http://www.w3.org/2000/svg" && t === "foreignObject" ? "http://www.w3.org/1999/xhtml" : e;
  }
  var Er, $o = (function(e) {
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
  function Dn(e, t) {
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
  }, qa = ["Webkit", "ms", "Moz", "O"];
  Object.keys(Fn).forEach(function(e) {
    qa.forEach(function(t) {
      t = t + e.charAt(0).toUpperCase() + e.substring(1), Fn[t] = Fn[e];
    });
  });
  function Qo(e, t, n) {
    return t == null || typeof t == "boolean" || t === "" ? "" : n || typeof t != "number" || t === 0 || Fn.hasOwnProperty(e) && Fn[e] ? ("" + t).trim() : t + "px";
  }
  function Ko(e, t) {
    e = e.style;
    for (var n in t) if (t.hasOwnProperty(n)) {
      var r = n.indexOf("--") === 0, l = Qo(n, t[n], r);
      n === "float" && (n = "cssFloat"), r ? e.setProperty(n, l) : e[n] = l;
    }
  }
  var ba = N({ menuitem: !0 }, { area: !0, base: !0, br: !0, col: !0, embed: !0, hr: !0, img: !0, input: !0, keygen: !0, link: !0, meta: !0, param: !0, source: !0, track: !0, wbr: !0 });
  function Ul(e, t) {
    if (t) {
      if (ba[e] && (t.children != null || t.dangerouslySetInnerHTML != null)) throw Error(c(137, e));
      if (t.dangerouslySetInnerHTML != null) {
        if (t.children != null) throw Error(c(60));
        if (typeof t.dangerouslySetInnerHTML != "object" || !("__html" in t.dangerouslySetInnerHTML)) throw Error(c(61));
      }
      if (t.style != null && typeof t.style != "object") throw Error(c(62));
    }
  }
  function Al(e, t) {
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
  function Bl(e) {
    return e = e.target || e.srcElement || window, e.correspondingUseElement && (e = e.correspondingUseElement), e.nodeType === 3 ? e.parentNode : e;
  }
  var Hl = null, an = null, cn = null;
  function Go(e) {
    if (e = ir(e)) {
      if (typeof Hl != "function") throw Error(c(280));
      var t = e.stateNode;
      t && (t = Kr(t), Hl(e.stateNode, e.type, t));
    }
  }
  function Yo(e) {
    an ? cn ? cn.push(e) : cn = [e] : an = e;
  }
  function Xo() {
    if (an) {
      var e = an, t = cn;
      if (cn = an = null, Go(e), t) for (e = 0; e < t.length; e++) Go(t[e]);
    }
  }
  function Zo(e, t) {
    return e(t);
  }
  function Jo() {
  }
  var Wl = !1;
  function qo(e, t, n) {
    if (Wl) return e(t, n);
    Wl = !0;
    try {
      return Zo(e, t, n);
    } finally {
      Wl = !1, (an !== null || cn !== null) && (Jo(), Xo());
    }
  }
  function Un(e, t) {
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
  if (q) try {
    var An = {};
    Object.defineProperty(An, "passive", { get: function() {
      $l = !0;
    } }), window.addEventListener("test", An, An), window.removeEventListener("test", An, An);
  } catch {
    $l = !1;
  }
  function ec(e, t, n, r, l, i, o, u, s) {
    var h = Array.prototype.slice.call(arguments, 3);
    try {
      t.apply(n, h);
    } catch (g) {
      this.onError(g);
    }
  }
  var Vn = !1, Cr = null, _r = !1, Ql = null, tc = { onError: function(e) {
    Vn = !0, Cr = e;
  } };
  function nc(e, t, n, r, l, i, o, u, s) {
    Vn = !1, Cr = null, ec.apply(tc, arguments);
  }
  function rc(e, t, n, r, l, i, o, u, s) {
    if (nc.apply(this, arguments), Vn) {
      if (Vn) {
        var h = Cr;
        Vn = !1, Cr = null;
      } else throw Error(c(198));
      _r || (_r = !0, Ql = h);
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
  function bo(e) {
    if (e.tag === 13) {
      var t = e.memoizedState;
      if (t === null && (e = e.alternate, e !== null && (t = e.memoizedState)), t !== null) return t.dehydrated;
    }
    return null;
  }
  function eu(e) {
    if (Yt(e) !== e) throw Error(c(188));
  }
  function lc(e) {
    var t = e.alternate;
    if (!t) {
      if (t = Yt(e), t === null) throw Error(c(188));
      return t !== e ? null : e;
    }
    for (var n = e, r = t; ; ) {
      var l = n.return;
      if (l === null) break;
      var i = l.alternate;
      if (i === null) {
        if (r = l.return, r !== null) {
          n = r;
          continue;
        }
        break;
      }
      if (l.child === i.child) {
        for (i = l.child; i; ) {
          if (i === n) return eu(l), e;
          if (i === r) return eu(l), t;
          i = i.sibling;
        }
        throw Error(c(188));
      }
      if (n.return !== r.return) n = l, r = i;
      else {
        for (var o = !1, u = l.child; u; ) {
          if (u === n) {
            o = !0, n = l, r = i;
            break;
          }
          if (u === r) {
            o = !0, r = l, n = i;
            break;
          }
          u = u.sibling;
        }
        if (!o) {
          for (u = i.child; u; ) {
            if (u === n) {
              o = !0, n = i, r = l;
              break;
            }
            if (u === r) {
              o = !0, r = i, n = l;
              break;
            }
            u = u.sibling;
          }
          if (!o) throw Error(c(189));
        }
      }
      if (n.alternate !== r) throw Error(c(190));
    }
    if (n.tag !== 3) throw Error(c(188));
    return n.stateNode.current === n ? e : t;
  }
  function tu(e) {
    return e = lc(e), e !== null ? nu(e) : null;
  }
  function nu(e) {
    if (e.tag === 5 || e.tag === 6) return e;
    for (e = e.child; e !== null; ) {
      var t = nu(e);
      if (t !== null) return t;
      e = e.sibling;
    }
    return null;
  }
  var ru = k.unstable_scheduleCallback, lu = k.unstable_cancelCallback, ic = k.unstable_shouldYield, oc = k.unstable_requestPaint, Ne = k.unstable_now, uc = k.unstable_getCurrentPriorityLevel, Kl = k.unstable_ImmediatePriority, iu = k.unstable_UserBlockingPriority, Nr = k.unstable_NormalPriority, sc = k.unstable_LowPriority, ou = k.unstable_IdlePriority, Tr = null, vt = null;
  function ac(e) {
    if (vt && typeof vt.onCommitFiberRoot == "function") try {
      vt.onCommitFiberRoot(Tr, e, void 0, (e.current.flags & 128) === 128);
    } catch {
    }
  }
  var at = Math.clz32 ? Math.clz32 : dc, cc = Math.log, fc = Math.LN2;
  function dc(e) {
    return e >>>= 0, e === 0 ? 32 : 31 - (cc(e) / fc | 0) | 0;
  }
  var Pr = 64, zr = 4194304;
  function Bn(e) {
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
    var r = 0, l = e.suspendedLanes, i = e.pingedLanes, o = n & 268435455;
    if (o !== 0) {
      var u = o & ~l;
      u !== 0 ? r = Bn(u) : (i &= o, i !== 0 && (r = Bn(i)));
    } else o = n & ~l, o !== 0 ? r = Bn(o) : i !== 0 && (r = Bn(i));
    if (r === 0) return 0;
    if (t !== 0 && t !== r && (t & l) === 0 && (l = r & -r, i = t & -t, l >= i || l === 16 && (i & 4194240) !== 0)) return t;
    if ((r & 4) !== 0 && (r |= n & 16), t = e.entangledLanes, t !== 0) for (e = e.entanglements, t &= r; 0 < t; ) n = 31 - at(t), l = 1 << n, r |= e[n], t &= ~l;
    return r;
  }
  function pc(e, t) {
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
  function mc(e, t) {
    for (var n = e.suspendedLanes, r = e.pingedLanes, l = e.expirationTimes, i = e.pendingLanes; 0 < i; ) {
      var o = 31 - at(i), u = 1 << o, s = l[o];
      s === -1 ? ((u & n) === 0 || (u & r) !== 0) && (l[o] = pc(u, t)) : s <= t && (e.expiredLanes |= u), i &= ~u;
    }
  }
  function Gl(e) {
    return e = e.pendingLanes & -1073741825, e !== 0 ? e : e & 1073741824 ? 1073741824 : 0;
  }
  function uu() {
    var e = Pr;
    return Pr <<= 1, (Pr & 4194240) === 0 && (Pr = 64), e;
  }
  function Yl(e) {
    for (var t = [], n = 0; 31 > n; n++) t.push(e);
    return t;
  }
  function Hn(e, t, n) {
    e.pendingLanes |= t, t !== 536870912 && (e.suspendedLanes = 0, e.pingedLanes = 0), e = e.eventTimes, t = 31 - at(t), e[t] = n;
  }
  function hc(e, t) {
    var n = e.pendingLanes & ~t;
    e.pendingLanes = t, e.suspendedLanes = 0, e.pingedLanes = 0, e.expiredLanes &= t, e.mutableReadLanes &= t, e.entangledLanes &= t, t = e.entanglements;
    var r = e.eventTimes;
    for (e = e.expirationTimes; 0 < n; ) {
      var l = 31 - at(n), i = 1 << l;
      t[l] = 0, r[l] = -1, e[l] = -1, n &= ~i;
    }
  }
  function Xl(e, t) {
    var n = e.entangledLanes |= t;
    for (e = e.entanglements; n; ) {
      var r = 31 - at(n), l = 1 << r;
      l & t | e[r] & t && (e[r] |= t), n &= ~l;
    }
  }
  var se = 0;
  function su(e) {
    return e &= -e, 1 < e ? 4 < e ? (e & 268435455) !== 0 ? 16 : 536870912 : 4 : 1;
  }
  var au, Zl, cu, fu, du, Jl = !1, Rr = [], zt = null, Lt = null, Rt = null, Wn = /* @__PURE__ */ new Map(), $n = /* @__PURE__ */ new Map(), jt = [], vc = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");
  function pu(e, t) {
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
        $n.delete(t.pointerId);
    }
  }
  function Qn(e, t, n, r, l, i) {
    return e === null || e.nativeEvent !== i ? (e = { blockedOn: t, domEventName: n, eventSystemFlags: r, nativeEvent: i, targetContainers: [l] }, t !== null && (t = ir(t), t !== null && Zl(t)), e) : (e.eventSystemFlags |= r, t = e.targetContainers, l !== null && t.indexOf(l) === -1 && t.push(l), e);
  }
  function yc(e, t, n, r, l) {
    switch (t) {
      case "focusin":
        return zt = Qn(zt, e, t, n, r, l), !0;
      case "dragenter":
        return Lt = Qn(Lt, e, t, n, r, l), !0;
      case "mouseover":
        return Rt = Qn(Rt, e, t, n, r, l), !0;
      case "pointerover":
        var i = l.pointerId;
        return Wn.set(i, Qn(Wn.get(i) || null, e, t, n, r, l)), !0;
      case "gotpointercapture":
        return i = l.pointerId, $n.set(i, Qn($n.get(i) || null, e, t, n, r, l)), !0;
    }
    return !1;
  }
  function mu(e) {
    var t = Xt(e.target);
    if (t !== null) {
      var n = Yt(t);
      if (n !== null) {
        if (t = n.tag, t === 13) {
          if (t = bo(n), t !== null) {
            e.blockedOn = t, du(e.priority, function() {
              cu(n);
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
      var n = bl(e.domEventName, e.eventSystemFlags, t[0], e.nativeEvent);
      if (n === null) {
        n = e.nativeEvent;
        var r = new n.constructor(n.type, n);
        Vl = r, n.target.dispatchEvent(r), Vl = null;
      } else return t = ir(n), t !== null && Zl(t), e.blockedOn = n, !1;
      t.shift();
    }
    return !0;
  }
  function hu(e, t, n) {
    jr(e) && n.delete(t);
  }
  function gc() {
    Jl = !1, zt !== null && jr(zt) && (zt = null), Lt !== null && jr(Lt) && (Lt = null), Rt !== null && jr(Rt) && (Rt = null), Wn.forEach(hu), $n.forEach(hu);
  }
  function Kn(e, t) {
    e.blockedOn === t && (e.blockedOn = null, Jl || (Jl = !0, k.unstable_scheduleCallback(k.unstable_NormalPriority, gc)));
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
    for (zt !== null && Kn(zt, e), Lt !== null && Kn(Lt, e), Rt !== null && Kn(Rt, e), Wn.forEach(t), $n.forEach(t), n = 0; n < jt.length; n++) r = jt[n], r.blockedOn === e && (r.blockedOn = null);
    for (; 0 < jt.length && (n = jt[0], n.blockedOn === null); ) mu(n), n.blockedOn === null && jt.shift();
  }
  var fn = ae.ReactCurrentBatchConfig, Ir = !0;
  function wc(e, t, n, r) {
    var l = se, i = fn.transition;
    fn.transition = null;
    try {
      se = 1, ql(e, t, n, r);
    } finally {
      se = l, fn.transition = i;
    }
  }
  function kc(e, t, n, r) {
    var l = se, i = fn.transition;
    fn.transition = null;
    try {
      se = 4, ql(e, t, n, r);
    } finally {
      se = l, fn.transition = i;
    }
  }
  function ql(e, t, n, r) {
    if (Ir) {
      var l = bl(e, t, n, r);
      if (l === null) vi(e, t, r, Mr, n), pu(e, r);
      else if (yc(l, e, t, n, r)) r.stopPropagation();
      else if (pu(e, r), t & 4 && -1 < vc.indexOf(e)) {
        for (; l !== null; ) {
          var i = ir(l);
          if (i !== null && au(i), i = bl(e, t, n, r), i === null && vi(e, t, r, Mr, n), i === l) break;
          l = i;
        }
        l !== null && r.stopPropagation();
      } else vi(e, t, r, null, n);
    }
  }
  var Mr = null;
  function bl(e, t, n, r) {
    if (Mr = null, e = Bl(r), e = Xt(e), e !== null) if (t = Yt(e), t === null) e = null;
    else if (n = t.tag, n === 13) {
      if (e = bo(t), e !== null) return e;
      e = null;
    } else if (n === 3) {
      if (t.stateNode.current.memoizedState.isDehydrated) return t.tag === 3 ? t.stateNode.containerInfo : null;
      e = null;
    } else t !== e && (e = null);
    return Mr = e, null;
  }
  function vu(e) {
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
        switch (uc()) {
          case Kl:
            return 1;
          case iu:
            return 4;
          case Nr:
          case sc:
            return 16;
          case ou:
            return 536870912;
          default:
            return 16;
        }
      default:
        return 16;
    }
  }
  var It = null, ei = null, Or = null;
  function yu() {
    if (Or) return Or;
    var e, t = ei, n = t.length, r, l = "value" in It ? It.value : It.textContent, i = l.length;
    for (e = 0; e < n && t[e] === l[e]; e++) ;
    var o = n - e;
    for (r = 1; r <= o && t[n - r] === l[i - r]; r++) ;
    return Or = l.slice(e, 1 < r ? 1 - r : void 0);
  }
  function Dr(e) {
    var t = e.keyCode;
    return "charCode" in e ? (e = e.charCode, e === 0 && t === 13 && (e = 13)) : e = t, e === 10 && (e = 13), 32 <= e || e === 13 ? e : 0;
  }
  function Fr() {
    return !0;
  }
  function gu() {
    return !1;
  }
  function be(e) {
    function t(n, r, l, i, o) {
      this._reactName = n, this._targetInst = l, this.type = r, this.nativeEvent = i, this.target = o, this.currentTarget = null;
      for (var u in e) e.hasOwnProperty(u) && (n = e[u], this[u] = n ? n(i) : i[u]);
      return this.isDefaultPrevented = (i.defaultPrevented != null ? i.defaultPrevented : i.returnValue === !1) ? Fr : gu, this.isPropagationStopped = gu, this;
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
  }, defaultPrevented: 0, isTrusted: 0 }, ti = be(dn), Yn = N({}, dn, { view: 0, detail: 0 }), Sc = be(Yn), ni, ri, Xn, Ur = N({}, Yn, { screenX: 0, screenY: 0, clientX: 0, clientY: 0, pageX: 0, pageY: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, getModifierState: ii, button: 0, buttons: 0, relatedTarget: function(e) {
    return e.relatedTarget === void 0 ? e.fromElement === e.srcElement ? e.toElement : e.fromElement : e.relatedTarget;
  }, movementX: function(e) {
    return "movementX" in e ? e.movementX : (e !== Xn && (Xn && e.type === "mousemove" ? (ni = e.screenX - Xn.screenX, ri = e.screenY - Xn.screenY) : ri = ni = 0, Xn = e), ni);
  }, movementY: function(e) {
    return "movementY" in e ? e.movementY : ri;
  } }), wu = be(Ur), xc = N({}, Ur, { dataTransfer: 0 }), Ec = be(xc), Cc = N({}, Yn, { relatedTarget: 0 }), li = be(Cc), _c = N({}, dn, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }), Nc = be(_c), Tc = N({}, dn, { clipboardData: function(e) {
    return "clipboardData" in e ? e.clipboardData : window.clipboardData;
  } }), Pc = be(Tc), zc = N({}, dn, { data: 0 }), ku = be(zc), Lc = {
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
  }, Rc = {
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
  }, jc = { Alt: "altKey", Control: "ctrlKey", Meta: "metaKey", Shift: "shiftKey" };
  function Ic(e) {
    var t = this.nativeEvent;
    return t.getModifierState ? t.getModifierState(e) : (e = jc[e]) ? !!t[e] : !1;
  }
  function ii() {
    return Ic;
  }
  var Mc = N({}, Yn, { key: function(e) {
    if (e.key) {
      var t = Lc[e.key] || e.key;
      if (t !== "Unidentified") return t;
    }
    return e.type === "keypress" ? (e = Dr(e), e === 13 ? "Enter" : String.fromCharCode(e)) : e.type === "keydown" || e.type === "keyup" ? Rc[e.keyCode] || "Unidentified" : "";
  }, code: 0, location: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, repeat: 0, locale: 0, getModifierState: ii, charCode: function(e) {
    return e.type === "keypress" ? Dr(e) : 0;
  }, keyCode: function(e) {
    return e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
  }, which: function(e) {
    return e.type === "keypress" ? Dr(e) : e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
  } }), Oc = be(Mc), Dc = N({}, Ur, { pointerId: 0, width: 0, height: 0, pressure: 0, tangentialPressure: 0, tiltX: 0, tiltY: 0, twist: 0, pointerType: 0, isPrimary: 0 }), Su = be(Dc), Fc = N({}, Yn, { touches: 0, targetTouches: 0, changedTouches: 0, altKey: 0, metaKey: 0, ctrlKey: 0, shiftKey: 0, getModifierState: ii }), Uc = be(Fc), Ac = N({}, dn, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }), Vc = be(Ac), Bc = N({}, Ur, {
    deltaX: function(e) {
      return "deltaX" in e ? e.deltaX : "wheelDeltaX" in e ? -e.wheelDeltaX : 0;
    },
    deltaY: function(e) {
      return "deltaY" in e ? e.deltaY : "wheelDeltaY" in e ? -e.wheelDeltaY : "wheelDelta" in e ? -e.wheelDelta : 0;
    },
    deltaZ: 0,
    deltaMode: 0
  }), Hc = be(Bc), Wc = [9, 13, 27, 32], oi = q && "CompositionEvent" in window, Zn = null;
  q && "documentMode" in document && (Zn = document.documentMode);
  var $c = q && "TextEvent" in window && !Zn, xu = q && (!oi || Zn && 8 < Zn && 11 >= Zn), Eu = " ", Cu = !1;
  function _u(e, t) {
    switch (e) {
      case "keyup":
        return Wc.indexOf(t.keyCode) !== -1;
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
  function Nu(e) {
    return e = e.detail, typeof e == "object" && "data" in e ? e.data : null;
  }
  var pn = !1;
  function Qc(e, t) {
    switch (e) {
      case "compositionend":
        return Nu(t);
      case "keypress":
        return t.which !== 32 ? null : (Cu = !0, Eu);
      case "textInput":
        return e = t.data, e === Eu && Cu ? null : e;
      default:
        return null;
    }
  }
  function Kc(e, t) {
    if (pn) return e === "compositionend" || !oi && _u(e, t) ? (e = yu(), Or = ei = It = null, pn = !1, e) : null;
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
        return xu && t.locale !== "ko" ? null : t.data;
      default:
        return null;
    }
  }
  var Gc = { color: !0, date: !0, datetime: !0, "datetime-local": !0, email: !0, month: !0, number: !0, password: !0, range: !0, search: !0, tel: !0, text: !0, time: !0, url: !0, week: !0 };
  function Tu(e) {
    var t = e && e.nodeName && e.nodeName.toLowerCase();
    return t === "input" ? !!Gc[e.type] : t === "textarea";
  }
  function Pu(e, t, n, r) {
    Yo(r), t = Wr(t, "onChange"), 0 < t.length && (n = new ti("onChange", "change", null, n, r), e.push({ event: n, listeners: t }));
  }
  var Jn = null, qn = null;
  function Yc(e) {
    Ku(e, 0);
  }
  function Ar(e) {
    var t = gn(e);
    if (Do(t)) return e;
  }
  function Xc(e, t) {
    if (e === "change") return t;
  }
  var zu = !1;
  if (q) {
    var ui;
    if (q) {
      var si = "oninput" in document;
      if (!si) {
        var Lu = document.createElement("div");
        Lu.setAttribute("oninput", "return;"), si = typeof Lu.oninput == "function";
      }
      ui = si;
    } else ui = !1;
    zu = ui && (!document.documentMode || 9 < document.documentMode);
  }
  function Ru() {
    Jn && (Jn.detachEvent("onpropertychange", ju), qn = Jn = null);
  }
  function ju(e) {
    if (e.propertyName === "value" && Ar(qn)) {
      var t = [];
      Pu(t, qn, e, Bl(e)), qo(Yc, t);
    }
  }
  function Zc(e, t, n) {
    e === "focusin" ? (Ru(), Jn = t, qn = n, Jn.attachEvent("onpropertychange", ju)) : e === "focusout" && Ru();
  }
  function Jc(e) {
    if (e === "selectionchange" || e === "keyup" || e === "keydown") return Ar(qn);
  }
  function qc(e, t) {
    if (e === "click") return Ar(t);
  }
  function bc(e, t) {
    if (e === "input" || e === "change") return Ar(t);
  }
  function ef(e, t) {
    return e === t && (e !== 0 || 1 / e === 1 / t) || e !== e && t !== t;
  }
  var ct = typeof Object.is == "function" ? Object.is : ef;
  function bn(e, t) {
    if (ct(e, t)) return !0;
    if (typeof e != "object" || e === null || typeof t != "object" || t === null) return !1;
    var n = Object.keys(e), r = Object.keys(t);
    if (n.length !== r.length) return !1;
    for (r = 0; r < n.length; r++) {
      var l = n[r];
      if (!U.call(t, l) || !ct(e[l], t[l])) return !1;
    }
    return !0;
  }
  function Iu(e) {
    for (; e && e.firstChild; ) e = e.firstChild;
    return e;
  }
  function Mu(e, t) {
    var n = Iu(e);
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
      n = Iu(n);
    }
  }
  function Ou(e, t) {
    return e && t ? e === t ? !0 : e && e.nodeType === 3 ? !1 : t && t.nodeType === 3 ? Ou(e, t.parentNode) : "contains" in e ? e.contains(t) : e.compareDocumentPosition ? !!(e.compareDocumentPosition(t) & 16) : !1 : !1;
  }
  function Du() {
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
  function ai(e) {
    var t = e && e.nodeName && e.nodeName.toLowerCase();
    return t && (t === "input" && (e.type === "text" || e.type === "search" || e.type === "tel" || e.type === "url" || e.type === "password") || t === "textarea" || e.contentEditable === "true");
  }
  function tf(e) {
    var t = Du(), n = e.focusedElem, r = e.selectionRange;
    if (t !== n && n && n.ownerDocument && Ou(n.ownerDocument.documentElement, n)) {
      if (r !== null && ai(n)) {
        if (t = r.start, e = r.end, e === void 0 && (e = t), "selectionStart" in n) n.selectionStart = t, n.selectionEnd = Math.min(e, n.value.length);
        else if (e = (t = n.ownerDocument || document) && t.defaultView || window, e.getSelection) {
          e = e.getSelection();
          var l = n.textContent.length, i = Math.min(r.start, l);
          r = r.end === void 0 ? i : Math.min(r.end, l), !e.extend && i > r && (l = r, r = i, i = l), l = Mu(n, i);
          var o = Mu(
            n,
            r
          );
          l && o && (e.rangeCount !== 1 || e.anchorNode !== l.node || e.anchorOffset !== l.offset || e.focusNode !== o.node || e.focusOffset !== o.offset) && (t = t.createRange(), t.setStart(l.node, l.offset), e.removeAllRanges(), i > r ? (e.addRange(t), e.extend(o.node, o.offset)) : (t.setEnd(o.node, o.offset), e.addRange(t)));
        }
      }
      for (t = [], e = n; e = e.parentNode; ) e.nodeType === 1 && t.push({ element: e, left: e.scrollLeft, top: e.scrollTop });
      for (typeof n.focus == "function" && n.focus(), n = 0; n < t.length; n++) e = t[n], e.element.scrollLeft = e.left, e.element.scrollTop = e.top;
    }
  }
  var nf = q && "documentMode" in document && 11 >= document.documentMode, mn = null, ci = null, er = null, fi = !1;
  function Fu(e, t, n) {
    var r = n.window === n ? n.document : n.nodeType === 9 ? n : n.ownerDocument;
    fi || mn == null || mn !== xr(r) || (r = mn, "selectionStart" in r && ai(r) ? r = { start: r.selectionStart, end: r.selectionEnd } : (r = (r.ownerDocument && r.ownerDocument.defaultView || window).getSelection(), r = { anchorNode: r.anchorNode, anchorOffset: r.anchorOffset, focusNode: r.focusNode, focusOffset: r.focusOffset }), er && bn(er, r) || (er = r, r = Wr(ci, "onSelect"), 0 < r.length && (t = new ti("onSelect", "select", null, t, n), e.push({ event: t, listeners: r }), t.target = mn)));
  }
  function Vr(e, t) {
    var n = {};
    return n[e.toLowerCase()] = t.toLowerCase(), n["Webkit" + e] = "webkit" + t, n["Moz" + e] = "moz" + t, n;
  }
  var hn = { animationend: Vr("Animation", "AnimationEnd"), animationiteration: Vr("Animation", "AnimationIteration"), animationstart: Vr("Animation", "AnimationStart"), transitionend: Vr("Transition", "TransitionEnd") }, di = {}, Uu = {};
  q && (Uu = document.createElement("div").style, "AnimationEvent" in window || (delete hn.animationend.animation, delete hn.animationiteration.animation, delete hn.animationstart.animation), "TransitionEvent" in window || delete hn.transitionend.transition);
  function Br(e) {
    if (di[e]) return di[e];
    if (!hn[e]) return e;
    var t = hn[e], n;
    for (n in t) if (t.hasOwnProperty(n) && n in Uu) return di[e] = t[n];
    return e;
  }
  var Au = Br("animationend"), Vu = Br("animationiteration"), Bu = Br("animationstart"), Hu = Br("transitionend"), Wu = /* @__PURE__ */ new Map(), $u = "abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
  function Mt(e, t) {
    Wu.set(e, t), F(t, [e]);
  }
  for (var pi = 0; pi < $u.length; pi++) {
    var mi = $u[pi], rf = mi.toLowerCase(), lf = mi[0].toUpperCase() + mi.slice(1);
    Mt(rf, "on" + lf);
  }
  Mt(Au, "onAnimationEnd"), Mt(Vu, "onAnimationIteration"), Mt(Bu, "onAnimationStart"), Mt("dblclick", "onDoubleClick"), Mt("focusin", "onFocus"), Mt("focusout", "onBlur"), Mt(Hu, "onTransitionEnd"), W("onMouseEnter", ["mouseout", "mouseover"]), W("onMouseLeave", ["mouseout", "mouseover"]), W("onPointerEnter", ["pointerout", "pointerover"]), W("onPointerLeave", ["pointerout", "pointerover"]), F("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" ")), F("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")), F("onBeforeInput", ["compositionend", "keypress", "textInput", "paste"]), F("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" ")), F("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" ")), F("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
  var tr = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "), of = new Set("cancel close invalid load scroll toggle".split(" ").concat(tr));
  function Qu(e, t, n) {
    var r = e.type || "unknown-event";
    e.currentTarget = n, rc(r, t, void 0, e), e.currentTarget = null;
  }
  function Ku(e, t) {
    t = (t & 4) !== 0;
    for (var n = 0; n < e.length; n++) {
      var r = e[n], l = r.event;
      r = r.listeners;
      e: {
        var i = void 0;
        if (t) for (var o = r.length - 1; 0 <= o; o--) {
          var u = r[o], s = u.instance, h = u.currentTarget;
          if (u = u.listener, s !== i && l.isPropagationStopped()) break e;
          Qu(l, u, h), i = s;
        }
        else for (o = 0; o < r.length; o++) {
          if (u = r[o], s = u.instance, h = u.currentTarget, u = u.listener, s !== i && l.isPropagationStopped()) break e;
          Qu(l, u, h), i = s;
        }
      }
    }
    if (_r) throw e = Ql, _r = !1, Ql = null, e;
  }
  function ve(e, t) {
    var n = t[xi];
    n === void 0 && (n = t[xi] = /* @__PURE__ */ new Set());
    var r = e + "__bubble";
    n.has(r) || (Gu(t, e, 2, !1), n.add(r));
  }
  function hi(e, t, n) {
    var r = 0;
    t && (r |= 4), Gu(n, e, r, t);
  }
  var Hr = "_reactListening" + Math.random().toString(36).slice(2);
  function nr(e) {
    if (!e[Hr]) {
      e[Hr] = !0, x.forEach(function(n) {
        n !== "selectionchange" && (of.has(n) || hi(n, !1, e), hi(n, !0, e));
      });
      var t = e.nodeType === 9 ? e : e.ownerDocument;
      t === null || t[Hr] || (t[Hr] = !0, hi("selectionchange", !1, t));
    }
  }
  function Gu(e, t, n, r) {
    switch (vu(t)) {
      case 1:
        var l = wc;
        break;
      case 4:
        l = kc;
        break;
      default:
        l = ql;
    }
    n = l.bind(null, t, n, e), l = void 0, !$l || t !== "touchstart" && t !== "touchmove" && t !== "wheel" || (l = !0), r ? l !== void 0 ? e.addEventListener(t, n, { capture: !0, passive: l }) : e.addEventListener(t, n, !0) : l !== void 0 ? e.addEventListener(t, n, { passive: l }) : e.addEventListener(t, n, !1);
  }
  function vi(e, t, n, r, l) {
    var i = r;
    if ((t & 1) === 0 && (t & 2) === 0 && r !== null) e: for (; ; ) {
      if (r === null) return;
      var o = r.tag;
      if (o === 3 || o === 4) {
        var u = r.stateNode.containerInfo;
        if (u === l || u.nodeType === 8 && u.parentNode === l) break;
        if (o === 4) for (o = r.return; o !== null; ) {
          var s = o.tag;
          if ((s === 3 || s === 4) && (s = o.stateNode.containerInfo, s === l || s.nodeType === 8 && s.parentNode === l)) return;
          o = o.return;
        }
        for (; u !== null; ) {
          if (o = Xt(u), o === null) return;
          if (s = o.tag, s === 5 || s === 6) {
            r = i = o;
            continue e;
          }
          u = u.parentNode;
        }
      }
      r = r.return;
    }
    qo(function() {
      var h = i, g = Bl(n), w = [];
      e: {
        var y = Wu.get(e);
        if (y !== void 0) {
          var C = ti, P = e;
          switch (e) {
            case "keypress":
              if (Dr(n) === 0) break e;
            case "keydown":
            case "keyup":
              C = Oc;
              break;
            case "focusin":
              P = "focus", C = li;
              break;
            case "focusout":
              P = "blur", C = li;
              break;
            case "beforeblur":
            case "afterblur":
              C = li;
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
              C = wu;
              break;
            case "drag":
            case "dragend":
            case "dragenter":
            case "dragexit":
            case "dragleave":
            case "dragover":
            case "dragstart":
            case "drop":
              C = Ec;
              break;
            case "touchcancel":
            case "touchend":
            case "touchmove":
            case "touchstart":
              C = Uc;
              break;
            case Au:
            case Vu:
            case Bu:
              C = Nc;
              break;
            case Hu:
              C = Vc;
              break;
            case "scroll":
              C = Sc;
              break;
            case "wheel":
              C = Hc;
              break;
            case "copy":
            case "cut":
            case "paste":
              C = Pc;
              break;
            case "gotpointercapture":
            case "lostpointercapture":
            case "pointercancel":
            case "pointerdown":
            case "pointermove":
            case "pointerout":
            case "pointerover":
            case "pointerup":
              C = Su;
          }
          var z = (t & 4) !== 0, Te = !z && e === "scroll", d = z ? y !== null ? y + "Capture" : null : y;
          z = [];
          for (var a = h, p; a !== null; ) {
            p = a;
            var S = p.stateNode;
            if (p.tag === 5 && S !== null && (p = S, d !== null && (S = Un(a, d), S != null && z.push(rr(a, S, p)))), Te) break;
            a = a.return;
          }
          0 < z.length && (y = new C(y, P, null, n, g), w.push({ event: y, listeners: z }));
        }
      }
      if ((t & 7) === 0) {
        e: {
          if (y = e === "mouseover" || e === "pointerover", C = e === "mouseout" || e === "pointerout", y && n !== Vl && (P = n.relatedTarget || n.fromElement) && (Xt(P) || P[St])) break e;
          if ((C || y) && (y = g.window === g ? g : (y = g.ownerDocument) ? y.defaultView || y.parentWindow : window, C ? (P = n.relatedTarget || n.toElement, C = h, P = P ? Xt(P) : null, P !== null && (Te = Yt(P), P !== Te || P.tag !== 5 && P.tag !== 6) && (P = null)) : (C = null, P = h), C !== P)) {
            if (z = wu, S = "onMouseLeave", d = "onMouseEnter", a = "mouse", (e === "pointerout" || e === "pointerover") && (z = Su, S = "onPointerLeave", d = "onPointerEnter", a = "pointer"), Te = C == null ? y : gn(C), p = P == null ? y : gn(P), y = new z(S, a + "leave", C, n, g), y.target = Te, y.relatedTarget = p, S = null, Xt(g) === h && (z = new z(d, a + "enter", P, n, g), z.target = p, z.relatedTarget = Te, S = z), Te = S, C && P) t: {
              for (z = C, d = P, a = 0, p = z; p; p = vn(p)) a++;
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
            C !== null && Yu(w, y, C, z, !1), P !== null && Te !== null && Yu(w, Te, P, z, !0);
          }
        }
        e: {
          if (y = h ? gn(h) : window, C = y.nodeName && y.nodeName.toLowerCase(), C === "select" || C === "input" && y.type === "file") var L = Xc;
          else if (Tu(y)) if (zu) L = bc;
          else {
            L = Jc;
            var I = Zc;
          }
          else (C = y.nodeName) && C.toLowerCase() === "input" && (y.type === "checkbox" || y.type === "radio") && (L = qc);
          if (L && (L = L(e, h))) {
            Pu(w, L, n, g);
            break e;
          }
          I && I(e, y, h), e === "focusout" && (I = y._wrapperState) && I.controlled && y.type === "number" && Ol(y, "number", y.value);
        }
        switch (I = h ? gn(h) : window, e) {
          case "focusin":
            (Tu(I) || I.contentEditable === "true") && (mn = I, ci = h, er = null);
            break;
          case "focusout":
            er = ci = mn = null;
            break;
          case "mousedown":
            fi = !0;
            break;
          case "contextmenu":
          case "mouseup":
          case "dragend":
            fi = !1, Fu(w, n, g);
            break;
          case "selectionchange":
            if (nf) break;
          case "keydown":
          case "keyup":
            Fu(w, n, g);
        }
        var M;
        if (oi) e: {
          switch (e) {
            case "compositionstart":
              var V = "onCompositionStart";
              break e;
            case "compositionend":
              V = "onCompositionEnd";
              break e;
            case "compositionupdate":
              V = "onCompositionUpdate";
              break e;
          }
          V = void 0;
        }
        else pn ? _u(e, n) && (V = "onCompositionEnd") : e === "keydown" && n.keyCode === 229 && (V = "onCompositionStart");
        V && (xu && n.locale !== "ko" && (pn || V !== "onCompositionStart" ? V === "onCompositionEnd" && pn && (M = yu()) : (It = g, ei = "value" in It ? It.value : It.textContent, pn = !0)), I = Wr(h, V), 0 < I.length && (V = new ku(V, e, null, n, g), w.push({ event: V, listeners: I }), M ? V.data = M : (M = Nu(n), M !== null && (V.data = M)))), (M = $c ? Qc(e, n) : Kc(e, n)) && (h = Wr(h, "onBeforeInput"), 0 < h.length && (g = new ku("onBeforeInput", "beforeinput", null, n, g), w.push({ event: g, listeners: h }), g.data = M));
      }
      Ku(w, t);
    });
  }
  function rr(e, t, n) {
    return { instance: e, listener: t, currentTarget: n };
  }
  function Wr(e, t) {
    for (var n = t + "Capture", r = []; e !== null; ) {
      var l = e, i = l.stateNode;
      l.tag === 5 && i !== null && (l = i, i = Un(e, n), i != null && r.unshift(rr(e, i, l)), i = Un(e, t), i != null && r.push(rr(e, i, l))), e = e.return;
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
  function Yu(e, t, n, r, l) {
    for (var i = t._reactName, o = []; n !== null && n !== r; ) {
      var u = n, s = u.alternate, h = u.stateNode;
      if (s !== null && s === r) break;
      u.tag === 5 && h !== null && (u = h, l ? (s = Un(n, i), s != null && o.unshift(rr(n, s, u))) : l || (s = Un(n, i), s != null && o.push(rr(n, s, u)))), n = n.return;
    }
    o.length !== 0 && e.push({ event: t, listeners: o });
  }
  var uf = /\r\n?/g, sf = /\u0000|\uFFFD/g;
  function Xu(e) {
    return (typeof e == "string" ? e : "" + e).replace(uf, `
`).replace(sf, "");
  }
  function $r(e, t, n) {
    if (t = Xu(t), Xu(e) !== t && n) throw Error(c(425));
  }
  function Qr() {
  }
  var yi = null, gi = null;
  function wi(e, t) {
    return e === "textarea" || e === "noscript" || typeof t.children == "string" || typeof t.children == "number" || typeof t.dangerouslySetInnerHTML == "object" && t.dangerouslySetInnerHTML !== null && t.dangerouslySetInnerHTML.__html != null;
  }
  var ki = typeof setTimeout == "function" ? setTimeout : void 0, af = typeof clearTimeout == "function" ? clearTimeout : void 0, Zu = typeof Promise == "function" ? Promise : void 0, cf = typeof queueMicrotask == "function" ? queueMicrotask : typeof Zu < "u" ? function(e) {
    return Zu.resolve(null).then(e).catch(ff);
  } : ki;
  function ff(e) {
    setTimeout(function() {
      throw e;
    });
  }
  function Si(e, t) {
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
  function Ot(e) {
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
  function Ju(e) {
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
  var yn = Math.random().toString(36).slice(2), yt = "__reactFiber$" + yn, lr = "__reactProps$" + yn, St = "__reactContainer$" + yn, xi = "__reactEvents$" + yn, df = "__reactListeners$" + yn, pf = "__reactHandles$" + yn;
  function Xt(e) {
    var t = e[yt];
    if (t) return t;
    for (var n = e.parentNode; n; ) {
      if (t = n[St] || n[yt]) {
        if (n = t.alternate, t.child !== null || n !== null && n.child !== null) for (e = Ju(e); e !== null; ) {
          if (n = e[yt]) return n;
          e = Ju(e);
        }
        return t;
      }
      e = n, n = e.parentNode;
    }
    return null;
  }
  function ir(e) {
    return e = e[yt] || e[St], !e || e.tag !== 5 && e.tag !== 6 && e.tag !== 13 && e.tag !== 3 ? null : e;
  }
  function gn(e) {
    if (e.tag === 5 || e.tag === 6) return e.stateNode;
    throw Error(c(33));
  }
  function Kr(e) {
    return e[lr] || null;
  }
  var Ei = [], wn = -1;
  function Dt(e) {
    return { current: e };
  }
  function ye(e) {
    0 > wn || (e.current = Ei[wn], Ei[wn] = null, wn--);
  }
  function me(e, t) {
    wn++, Ei[wn] = e.current, e.current = t;
  }
  var Ft = {}, Ve = Dt(Ft), Ke = Dt(!1), Zt = Ft;
  function kn(e, t) {
    var n = e.type.contextTypes;
    if (!n) return Ft;
    var r = e.stateNode;
    if (r && r.__reactInternalMemoizedUnmaskedChildContext === t) return r.__reactInternalMemoizedMaskedChildContext;
    var l = {}, i;
    for (i in n) l[i] = t[i];
    return r && (e = e.stateNode, e.__reactInternalMemoizedUnmaskedChildContext = t, e.__reactInternalMemoizedMaskedChildContext = l), l;
  }
  function Ge(e) {
    return e = e.childContextTypes, e != null;
  }
  function Gr() {
    ye(Ke), ye(Ve);
  }
  function qu(e, t, n) {
    if (Ve.current !== Ft) throw Error(c(168));
    me(Ve, t), me(Ke, n);
  }
  function bu(e, t, n) {
    var r = e.stateNode;
    if (t = t.childContextTypes, typeof r.getChildContext != "function") return n;
    r = r.getChildContext();
    for (var l in r) if (!(l in t)) throw Error(c(108, B(e) || "Unknown", l));
    return N({}, n, r);
  }
  function Yr(e) {
    return e = (e = e.stateNode) && e.__reactInternalMemoizedMergedChildContext || Ft, Zt = Ve.current, me(Ve, e), me(Ke, Ke.current), !0;
  }
  function es(e, t, n) {
    var r = e.stateNode;
    if (!r) throw Error(c(169));
    n ? (e = bu(e, t, Zt), r.__reactInternalMemoizedMergedChildContext = e, ye(Ke), ye(Ve), me(Ve, e)) : ye(Ke), me(Ke, n);
  }
  var xt = null, Xr = !1, Ci = !1;
  function ts(e) {
    xt === null ? xt = [e] : xt.push(e);
  }
  function mf(e) {
    Xr = !0, ts(e);
  }
  function Ut() {
    if (!Ci && xt !== null) {
      Ci = !0;
      var e = 0, t = se;
      try {
        var n = xt;
        for (se = 1; e < n.length; e++) {
          var r = n[e];
          do
            r = r(!0);
          while (r !== null);
        }
        xt = null, Xr = !1;
      } catch (l) {
        throw xt !== null && (xt = xt.slice(e + 1)), ru(Kl, Ut), l;
      } finally {
        se = t, Ci = !1;
      }
    }
    return null;
  }
  var Sn = [], xn = 0, Zr = null, Jr = 0, rt = [], lt = 0, Jt = null, Et = 1, Ct = "";
  function qt(e, t) {
    Sn[xn++] = Jr, Sn[xn++] = Zr, Zr = e, Jr = t;
  }
  function ns(e, t, n) {
    rt[lt++] = Et, rt[lt++] = Ct, rt[lt++] = Jt, Jt = e;
    var r = Et;
    e = Ct;
    var l = 32 - at(r) - 1;
    r &= ~(1 << l), n += 1;
    var i = 32 - at(t) + l;
    if (30 < i) {
      var o = l - l % 5;
      i = (r & (1 << o) - 1).toString(32), r >>= o, l -= o, Et = 1 << 32 - at(t) + l | n << l | r, Ct = i + e;
    } else Et = 1 << i | n << l | r, Ct = e;
  }
  function _i(e) {
    e.return !== null && (qt(e, 1), ns(e, 1, 0));
  }
  function Ni(e) {
    for (; e === Zr; ) Zr = Sn[--xn], Sn[xn] = null, Jr = Sn[--xn], Sn[xn] = null;
    for (; e === Jt; ) Jt = rt[--lt], rt[lt] = null, Ct = rt[--lt], rt[lt] = null, Et = rt[--lt], rt[lt] = null;
  }
  var et = null, tt = null, ke = !1, ft = null;
  function rs(e, t) {
    var n = st(5, null, null, 0);
    n.elementType = "DELETED", n.stateNode = t, n.return = e, t = e.deletions, t === null ? (e.deletions = [n], e.flags |= 16) : t.push(n);
  }
  function ls(e, t) {
    switch (e.tag) {
      case 5:
        var n = e.type;
        return t = t.nodeType !== 1 || n.toLowerCase() !== t.nodeName.toLowerCase() ? null : t, t !== null ? (e.stateNode = t, et = e, tt = Ot(t.firstChild), !0) : !1;
      case 6:
        return t = e.pendingProps === "" || t.nodeType !== 3 ? null : t, t !== null ? (e.stateNode = t, et = e, tt = null, !0) : !1;
      case 13:
        return t = t.nodeType !== 8 ? null : t, t !== null ? (n = Jt !== null ? { id: Et, overflow: Ct } : null, e.memoizedState = { dehydrated: t, treeContext: n, retryLane: 1073741824 }, n = st(18, null, null, 0), n.stateNode = t, n.return = e, e.child = n, et = e, tt = null, !0) : !1;
      default:
        return !1;
    }
  }
  function Ti(e) {
    return (e.mode & 1) !== 0 && (e.flags & 128) === 0;
  }
  function Pi(e) {
    if (ke) {
      var t = tt;
      if (t) {
        var n = t;
        if (!ls(e, t)) {
          if (Ti(e)) throw Error(c(418));
          t = Ot(n.nextSibling);
          var r = et;
          t && ls(e, t) ? rs(r, n) : (e.flags = e.flags & -4097 | 2, ke = !1, et = e);
        }
      } else {
        if (Ti(e)) throw Error(c(418));
        e.flags = e.flags & -4097 | 2, ke = !1, et = e;
      }
    }
  }
  function is(e) {
    for (e = e.return; e !== null && e.tag !== 5 && e.tag !== 3 && e.tag !== 13; ) e = e.return;
    et = e;
  }
  function qr(e) {
    if (e !== et) return !1;
    if (!ke) return is(e), ke = !0, !1;
    var t;
    if ((t = e.tag !== 3) && !(t = e.tag !== 5) && (t = e.type, t = t !== "head" && t !== "body" && !wi(e.type, e.memoizedProps)), t && (t = tt)) {
      if (Ti(e)) throw os(), Error(c(418));
      for (; t; ) rs(e, t), t = Ot(t.nextSibling);
    }
    if (is(e), e.tag === 13) {
      if (e = e.memoizedState, e = e !== null ? e.dehydrated : null, !e) throw Error(c(317));
      e: {
        for (e = e.nextSibling, t = 0; e; ) {
          if (e.nodeType === 8) {
            var n = e.data;
            if (n === "/$") {
              if (t === 0) {
                tt = Ot(e.nextSibling);
                break e;
              }
              t--;
            } else n !== "$" && n !== "$!" && n !== "$?" || t++;
          }
          e = e.nextSibling;
        }
        tt = null;
      }
    } else tt = et ? Ot(e.stateNode.nextSibling) : null;
    return !0;
  }
  function os() {
    for (var e = tt; e; ) e = Ot(e.nextSibling);
  }
  function En() {
    tt = et = null, ke = !1;
  }
  function zi(e) {
    ft === null ? ft = [e] : ft.push(e);
  }
  var hf = ae.ReactCurrentBatchConfig;
  function or(e, t, n) {
    if (e = n.ref, e !== null && typeof e != "function" && typeof e != "object") {
      if (n._owner) {
        if (n = n._owner, n) {
          if (n.tag !== 1) throw Error(c(309));
          var r = n.stateNode;
        }
        if (!r) throw Error(c(147, e));
        var l = r, i = "" + e;
        return t !== null && t.ref !== null && typeof t.ref == "function" && t.ref._stringRef === i ? t.ref : (t = function(o) {
          var u = l.refs;
          o === null ? delete u[i] : u[i] = o;
        }, t._stringRef = i, t);
      }
      if (typeof e != "string") throw Error(c(284));
      if (!n._owner) throw Error(c(290, e));
    }
    return e;
  }
  function br(e, t) {
    throw e = Object.prototype.toString.call(t), Error(c(31, e === "[object Object]" ? "object with keys {" + Object.keys(t).join(", ") + "}" : e));
  }
  function us(e) {
    var t = e._init;
    return t(e._payload);
  }
  function ss(e) {
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
    function i(d, a, p) {
      return d.index = p, e ? (p = d.alternate, p !== null ? (p = p.index, p < a ? (d.flags |= 2, a) : p) : (d.flags |= 2, a)) : (d.flags |= 1048576, a);
    }
    function o(d) {
      return e && d.alternate === null && (d.flags |= 2), d;
    }
    function u(d, a, p, S) {
      return a === null || a.tag !== 6 ? (a = So(p, d.mode, S), a.return = d, a) : (a = l(a, p), a.return = d, a);
    }
    function s(d, a, p, S) {
      var L = p.type;
      return L === te ? g(d, a, p.props.children, S, p.key) : a !== null && (a.elementType === L || typeof L == "object" && L !== null && L.$$typeof === Pe && us(L) === a.type) ? (S = l(a, p.props), S.ref = or(d, a, p), S.return = d, S) : (S = El(p.type, p.key, p.props, null, d.mode, S), S.ref = or(d, a, p), S.return = d, S);
    }
    function h(d, a, p, S) {
      return a === null || a.tag !== 4 || a.stateNode.containerInfo !== p.containerInfo || a.stateNode.implementation !== p.implementation ? (a = xo(p, d.mode, S), a.return = d, a) : (a = l(a, p.children || []), a.return = d, a);
    }
    function g(d, a, p, S, L) {
      return a === null || a.tag !== 7 ? (a = un(p, d.mode, S, L), a.return = d, a) : (a = l(a, p), a.return = d, a);
    }
    function w(d, a, p) {
      if (typeof a == "string" && a !== "" || typeof a == "number") return a = So("" + a, d.mode, p), a.return = d, a;
      if (typeof a == "object" && a !== null) {
        switch (a.$$typeof) {
          case j:
            return p = El(a.type, a.key, a.props, null, d.mode, p), p.ref = or(d, null, a), p.return = d, p;
          case O:
            return a = xo(a, d.mode, p), a.return = d, a;
          case Pe:
            var S = a._init;
            return w(d, S(a._payload), p);
        }
        if (On(a) || D(a)) return a = un(a, d.mode, p, null), a.return = d, a;
        br(d, a);
      }
      return null;
    }
    function y(d, a, p, S) {
      var L = a !== null ? a.key : null;
      if (typeof p == "string" && p !== "" || typeof p == "number") return L !== null ? null : u(d, a, "" + p, S);
      if (typeof p == "object" && p !== null) {
        switch (p.$$typeof) {
          case j:
            return p.key === L ? s(d, a, p, S) : null;
          case O:
            return p.key === L ? h(d, a, p, S) : null;
          case Pe:
            return L = p._init, y(
              d,
              a,
              L(p._payload),
              S
            );
        }
        if (On(p) || D(p)) return L !== null ? null : g(d, a, p, S, null);
        br(d, p);
      }
      return null;
    }
    function C(d, a, p, S, L) {
      if (typeof S == "string" && S !== "" || typeof S == "number") return d = d.get(p) || null, u(a, d, "" + S, L);
      if (typeof S == "object" && S !== null) {
        switch (S.$$typeof) {
          case j:
            return d = d.get(S.key === null ? p : S.key) || null, s(a, d, S, L);
          case O:
            return d = d.get(S.key === null ? p : S.key) || null, h(a, d, S, L);
          case Pe:
            var I = S._init;
            return C(d, a, p, I(S._payload), L);
        }
        if (On(S) || D(S)) return d = d.get(p) || null, g(a, d, S, L, null);
        br(a, S);
      }
      return null;
    }
    function P(d, a, p, S) {
      for (var L = null, I = null, M = a, V = a = 0, Oe = null; M !== null && V < p.length; V++) {
        M.index > V ? (Oe = M, M = null) : Oe = M.sibling;
        var re = y(d, M, p[V], S);
        if (re === null) {
          M === null && (M = Oe);
          break;
        }
        e && M && re.alternate === null && t(d, M), a = i(re, a, V), I === null ? L = re : I.sibling = re, I = re, M = Oe;
      }
      if (V === p.length) return n(d, M), ke && qt(d, V), L;
      if (M === null) {
        for (; V < p.length; V++) M = w(d, p[V], S), M !== null && (a = i(M, a, V), I === null ? L = M : I.sibling = M, I = M);
        return ke && qt(d, V), L;
      }
      for (M = r(d, M); V < p.length; V++) Oe = C(M, d, V, p[V], S), Oe !== null && (e && Oe.alternate !== null && M.delete(Oe.key === null ? V : Oe.key), a = i(Oe, a, V), I === null ? L = Oe : I.sibling = Oe, I = Oe);
      return e && M.forEach(function(Gt) {
        return t(d, Gt);
      }), ke && qt(d, V), L;
    }
    function z(d, a, p, S) {
      var L = D(p);
      if (typeof L != "function") throw Error(c(150));
      if (p = L.call(p), p == null) throw Error(c(151));
      for (var I = L = null, M = a, V = a = 0, Oe = null, re = p.next(); M !== null && !re.done; V++, re = p.next()) {
        M.index > V ? (Oe = M, M = null) : Oe = M.sibling;
        var Gt = y(d, M, re.value, S);
        if (Gt === null) {
          M === null && (M = Oe);
          break;
        }
        e && M && Gt.alternate === null && t(d, M), a = i(Gt, a, V), I === null ? L = Gt : I.sibling = Gt, I = Gt, M = Oe;
      }
      if (re.done) return n(
        d,
        M
      ), ke && qt(d, V), L;
      if (M === null) {
        for (; !re.done; V++, re = p.next()) re = w(d, re.value, S), re !== null && (a = i(re, a, V), I === null ? L = re : I.sibling = re, I = re);
        return ke && qt(d, V), L;
      }
      for (M = r(d, M); !re.done; V++, re = p.next()) re = C(M, d, V, re.value, S), re !== null && (e && re.alternate !== null && M.delete(re.key === null ? V : re.key), a = i(re, a, V), I === null ? L = re : I.sibling = re, I = re);
      return e && M.forEach(function(Yf) {
        return t(d, Yf);
      }), ke && qt(d, V), L;
    }
    function Te(d, a, p, S) {
      if (typeof p == "object" && p !== null && p.type === te && p.key === null && (p = p.props.children), typeof p == "object" && p !== null) {
        switch (p.$$typeof) {
          case j:
            e: {
              for (var L = p.key, I = a; I !== null; ) {
                if (I.key === L) {
                  if (L = p.type, L === te) {
                    if (I.tag === 7) {
                      n(d, I.sibling), a = l(I, p.props.children), a.return = d, d = a;
                      break e;
                    }
                  } else if (I.elementType === L || typeof L == "object" && L !== null && L.$$typeof === Pe && us(L) === I.type) {
                    n(d, I.sibling), a = l(I, p.props), a.ref = or(d, I, p), a.return = d, d = a;
                    break e;
                  }
                  n(d, I);
                  break;
                } else t(d, I);
                I = I.sibling;
              }
              p.type === te ? (a = un(p.props.children, d.mode, S, p.key), a.return = d, d = a) : (S = El(p.type, p.key, p.props, null, d.mode, S), S.ref = or(d, a, p), S.return = d, d = S);
            }
            return o(d);
          case O:
            e: {
              for (I = p.key; a !== null; ) {
                if (a.key === I) if (a.tag === 4 && a.stateNode.containerInfo === p.containerInfo && a.stateNode.implementation === p.implementation) {
                  n(d, a.sibling), a = l(a, p.children || []), a.return = d, d = a;
                  break e;
                } else {
                  n(d, a);
                  break;
                }
                else t(d, a);
                a = a.sibling;
              }
              a = xo(p, d.mode, S), a.return = d, d = a;
            }
            return o(d);
          case Pe:
            return I = p._init, Te(d, a, I(p._payload), S);
        }
        if (On(p)) return P(d, a, p, S);
        if (D(p)) return z(d, a, p, S);
        br(d, p);
      }
      return typeof p == "string" && p !== "" || typeof p == "number" ? (p = "" + p, a !== null && a.tag === 6 ? (n(d, a.sibling), a = l(a, p), a.return = d, d = a) : (n(d, a), a = So(p, d.mode, S), a.return = d, d = a), o(d)) : n(d, a);
    }
    return Te;
  }
  var Cn = ss(!0), as = ss(!1), el = Dt(null), tl = null, _n = null, Li = null;
  function Ri() {
    Li = _n = tl = null;
  }
  function ji(e) {
    var t = el.current;
    ye(el), e._currentValue = t;
  }
  function Ii(e, t, n) {
    for (; e !== null; ) {
      var r = e.alternate;
      if ((e.childLanes & t) !== t ? (e.childLanes |= t, r !== null && (r.childLanes |= t)) : r !== null && (r.childLanes & t) !== t && (r.childLanes |= t), e === n) break;
      e = e.return;
    }
  }
  function Nn(e, t) {
    tl = e, Li = _n = null, e = e.dependencies, e !== null && e.firstContext !== null && ((e.lanes & t) !== 0 && (Ye = !0), e.firstContext = null);
  }
  function it(e) {
    var t = e._currentValue;
    if (Li !== e) if (e = { context: e, memoizedValue: t, next: null }, _n === null) {
      if (tl === null) throw Error(c(308));
      _n = e, tl.dependencies = { lanes: 0, firstContext: e };
    } else _n = _n.next = e;
    return t;
  }
  var bt = null;
  function Mi(e) {
    bt === null ? bt = [e] : bt.push(e);
  }
  function cs(e, t, n, r) {
    var l = t.interleaved;
    return l === null ? (n.next = n, Mi(t)) : (n.next = l.next, l.next = n), t.interleaved = n, _t(e, r);
  }
  function _t(e, t) {
    e.lanes |= t;
    var n = e.alternate;
    for (n !== null && (n.lanes |= t), n = e, e = e.return; e !== null; ) e.childLanes |= t, n = e.alternate, n !== null && (n.childLanes |= t), n = e, e = e.return;
    return n.tag === 3 ? n.stateNode : null;
  }
  var At = !1;
  function Oi(e) {
    e.updateQueue = { baseState: e.memoizedState, firstBaseUpdate: null, lastBaseUpdate: null, shared: { pending: null, interleaved: null, lanes: 0 }, effects: null };
  }
  function fs(e, t) {
    e = e.updateQueue, t.updateQueue === e && (t.updateQueue = { baseState: e.baseState, firstBaseUpdate: e.firstBaseUpdate, lastBaseUpdate: e.lastBaseUpdate, shared: e.shared, effects: e.effects });
  }
  function Nt(e, t) {
    return { eventTime: e, lane: t, tag: 0, payload: null, callback: null, next: null };
  }
  function Vt(e, t, n) {
    var r = e.updateQueue;
    if (r === null) return null;
    if (r = r.shared, (ne & 2) !== 0) {
      var l = r.pending;
      return l === null ? t.next = t : (t.next = l.next, l.next = t), r.pending = t, _t(e, n);
    }
    return l = r.interleaved, l === null ? (t.next = t, Mi(r)) : (t.next = l.next, l.next = t), r.interleaved = t, _t(e, n);
  }
  function nl(e, t, n) {
    if (t = t.updateQueue, t !== null && (t = t.shared, (n & 4194240) !== 0)) {
      var r = t.lanes;
      r &= e.pendingLanes, n |= r, t.lanes = n, Xl(e, n);
    }
  }
  function ds(e, t) {
    var n = e.updateQueue, r = e.alternate;
    if (r !== null && (r = r.updateQueue, n === r)) {
      var l = null, i = null;
      if (n = n.firstBaseUpdate, n !== null) {
        do {
          var o = { eventTime: n.eventTime, lane: n.lane, tag: n.tag, payload: n.payload, callback: n.callback, next: null };
          i === null ? l = i = o : i = i.next = o, n = n.next;
        } while (n !== null);
        i === null ? l = i = t : i = i.next = t;
      } else l = i = t;
      n = { baseState: r.baseState, firstBaseUpdate: l, lastBaseUpdate: i, shared: r.shared, effects: r.effects }, e.updateQueue = n;
      return;
    }
    e = n.lastBaseUpdate, e === null ? n.firstBaseUpdate = t : e.next = t, n.lastBaseUpdate = t;
  }
  function rl(e, t, n, r) {
    var l = e.updateQueue;
    At = !1;
    var i = l.firstBaseUpdate, o = l.lastBaseUpdate, u = l.shared.pending;
    if (u !== null) {
      l.shared.pending = null;
      var s = u, h = s.next;
      s.next = null, o === null ? i = h : o.next = h, o = s;
      var g = e.alternate;
      g !== null && (g = g.updateQueue, u = g.lastBaseUpdate, u !== o && (u === null ? g.firstBaseUpdate = h : u.next = h, g.lastBaseUpdate = s));
    }
    if (i !== null) {
      var w = l.baseState;
      o = 0, g = h = s = null, u = i;
      do {
        var y = u.lane, C = u.eventTime;
        if ((r & y) === y) {
          g !== null && (g = g.next = {
            eventTime: C,
            lane: 0,
            tag: u.tag,
            payload: u.payload,
            callback: u.callback,
            next: null
          });
          e: {
            var P = e, z = u;
            switch (y = t, C = n, z.tag) {
              case 1:
                if (P = z.payload, typeof P == "function") {
                  w = P.call(C, w, y);
                  break e;
                }
                w = P;
                break e;
              case 3:
                P.flags = P.flags & -65537 | 128;
              case 0:
                if (P = z.payload, y = typeof P == "function" ? P.call(C, w, y) : P, y == null) break e;
                w = N({}, w, y);
                break e;
              case 2:
                At = !0;
            }
          }
          u.callback !== null && u.lane !== 0 && (e.flags |= 64, y = l.effects, y === null ? l.effects = [u] : y.push(u));
        } else C = { eventTime: C, lane: y, tag: u.tag, payload: u.payload, callback: u.callback, next: null }, g === null ? (h = g = C, s = w) : g = g.next = C, o |= y;
        if (u = u.next, u === null) {
          if (u = l.shared.pending, u === null) break;
          y = u, u = y.next, y.next = null, l.lastBaseUpdate = y, l.shared.pending = null;
        }
      } while (!0);
      if (g === null && (s = w), l.baseState = s, l.firstBaseUpdate = h, l.lastBaseUpdate = g, t = l.shared.interleaved, t !== null) {
        l = t;
        do
          o |= l.lane, l = l.next;
        while (l !== t);
      } else i === null && (l.shared.lanes = 0);
      nn |= o, e.lanes = o, e.memoizedState = w;
    }
  }
  function ps(e, t, n) {
    if (e = t.effects, t.effects = null, e !== null) for (t = 0; t < e.length; t++) {
      var r = e[t], l = r.callback;
      if (l !== null) {
        if (r.callback = null, r = n, typeof l != "function") throw Error(c(191, l));
        l.call(r);
      }
    }
  }
  var ur = {}, gt = Dt(ur), sr = Dt(ur), ar = Dt(ur);
  function en(e) {
    if (e === ur) throw Error(c(174));
    return e;
  }
  function Di(e, t) {
    switch (me(ar, t), me(sr, e), me(gt, ur), e = t.nodeType, e) {
      case 9:
      case 11:
        t = (t = t.documentElement) ? t.namespaceURI : Fl(null, "");
        break;
      default:
        e = e === 8 ? t.parentNode : t, t = e.namespaceURI || null, e = e.tagName, t = Fl(t, e);
    }
    ye(gt), me(gt, t);
  }
  function Tn() {
    ye(gt), ye(sr), ye(ar);
  }
  function ms(e) {
    en(ar.current);
    var t = en(gt.current), n = Fl(t, e.type);
    t !== n && (me(sr, e), me(gt, n));
  }
  function Fi(e) {
    sr.current === e && (ye(gt), ye(sr));
  }
  var Se = Dt(0);
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
  var Ui = [];
  function Ai() {
    for (var e = 0; e < Ui.length; e++) Ui[e]._workInProgressVersionPrimary = null;
    Ui.length = 0;
  }
  var il = ae.ReactCurrentDispatcher, Vi = ae.ReactCurrentBatchConfig, tn = 0, xe = null, Le = null, Ie = null, ol = !1, cr = !1, fr = 0, vf = 0;
  function Be() {
    throw Error(c(321));
  }
  function Bi(e, t) {
    if (t === null) return !1;
    for (var n = 0; n < t.length && n < e.length; n++) if (!ct(e[n], t[n])) return !1;
    return !0;
  }
  function Hi(e, t, n, r, l, i) {
    if (tn = i, xe = t, t.memoizedState = null, t.updateQueue = null, t.lanes = 0, il.current = e === null || e.memoizedState === null ? kf : Sf, e = n(r, l), cr) {
      i = 0;
      do {
        if (cr = !1, fr = 0, 25 <= i) throw Error(c(301));
        i += 1, Ie = Le = null, t.updateQueue = null, il.current = xf, e = n(r, l);
      } while (cr);
    }
    if (il.current = al, t = Le !== null && Le.next !== null, tn = 0, Ie = Le = xe = null, ol = !1, t) throw Error(c(300));
    return e;
  }
  function Wi() {
    var e = fr !== 0;
    return fr = 0, e;
  }
  function wt() {
    var e = { memoizedState: null, baseState: null, baseQueue: null, queue: null, next: null };
    return Ie === null ? xe.memoizedState = Ie = e : Ie = Ie.next = e, Ie;
  }
  function ot() {
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
  function $i(e) {
    var t = ot(), n = t.queue;
    if (n === null) throw Error(c(311));
    n.lastRenderedReducer = e;
    var r = Le, l = r.baseQueue, i = n.pending;
    if (i !== null) {
      if (l !== null) {
        var o = l.next;
        l.next = i.next, i.next = o;
      }
      r.baseQueue = l = i, n.pending = null;
    }
    if (l !== null) {
      i = l.next, r = r.baseState;
      var u = o = null, s = null, h = i;
      do {
        var g = h.lane;
        if ((tn & g) === g) s !== null && (s = s.next = { lane: 0, action: h.action, hasEagerState: h.hasEagerState, eagerState: h.eagerState, next: null }), r = h.hasEagerState ? h.eagerState : e(r, h.action);
        else {
          var w = {
            lane: g,
            action: h.action,
            hasEagerState: h.hasEagerState,
            eagerState: h.eagerState,
            next: null
          };
          s === null ? (u = s = w, o = r) : s = s.next = w, xe.lanes |= g, nn |= g;
        }
        h = h.next;
      } while (h !== null && h !== i);
      s === null ? o = r : s.next = u, ct(r, t.memoizedState) || (Ye = !0), t.memoizedState = r, t.baseState = o, t.baseQueue = s, n.lastRenderedState = r;
    }
    if (e = n.interleaved, e !== null) {
      l = e;
      do
        i = l.lane, xe.lanes |= i, nn |= i, l = l.next;
      while (l !== e);
    } else l === null && (n.lanes = 0);
    return [t.memoizedState, n.dispatch];
  }
  function Qi(e) {
    var t = ot(), n = t.queue;
    if (n === null) throw Error(c(311));
    n.lastRenderedReducer = e;
    var r = n.dispatch, l = n.pending, i = t.memoizedState;
    if (l !== null) {
      n.pending = null;
      var o = l = l.next;
      do
        i = e(i, o.action), o = o.next;
      while (o !== l);
      ct(i, t.memoizedState) || (Ye = !0), t.memoizedState = i, t.baseQueue === null && (t.baseState = i), n.lastRenderedState = i;
    }
    return [i, r];
  }
  function hs() {
  }
  function vs(e, t) {
    var n = xe, r = ot(), l = t(), i = !ct(r.memoizedState, l);
    if (i && (r.memoizedState = l, Ye = !0), r = r.queue, Ki(ws.bind(null, n, r, e), [e]), r.getSnapshot !== t || i || Ie !== null && Ie.memoizedState.tag & 1) {
      if (n.flags |= 2048, pr(9, gs.bind(null, n, r, l, t), void 0, null), Me === null) throw Error(c(349));
      (tn & 30) !== 0 || ys(n, t, l);
    }
    return l;
  }
  function ys(e, t, n) {
    e.flags |= 16384, e = { getSnapshot: t, value: n }, t = xe.updateQueue, t === null ? (t = { lastEffect: null, stores: null }, xe.updateQueue = t, t.stores = [e]) : (n = t.stores, n === null ? t.stores = [e] : n.push(e));
  }
  function gs(e, t, n, r) {
    t.value = n, t.getSnapshot = r, ks(t) && Ss(e);
  }
  function ws(e, t, n) {
    return n(function() {
      ks(t) && Ss(e);
    });
  }
  function ks(e) {
    var t = e.getSnapshot;
    e = e.value;
    try {
      var n = t();
      return !ct(e, n);
    } catch {
      return !0;
    }
  }
  function Ss(e) {
    var t = _t(e, 1);
    t !== null && ht(t, e, 1, -1);
  }
  function xs(e) {
    var t = wt();
    return typeof e == "function" && (e = e()), t.memoizedState = t.baseState = e, e = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: dr, lastRenderedState: e }, t.queue = e, e = e.dispatch = wf.bind(null, xe, e), [t.memoizedState, e];
  }
  function pr(e, t, n, r) {
    return e = { tag: e, create: t, destroy: n, deps: r, next: null }, t = xe.updateQueue, t === null ? (t = { lastEffect: null, stores: null }, xe.updateQueue = t, t.lastEffect = e.next = e) : (n = t.lastEffect, n === null ? t.lastEffect = e.next = e : (r = n.next, n.next = e, e.next = r, t.lastEffect = e)), e;
  }
  function Es() {
    return ot().memoizedState;
  }
  function ul(e, t, n, r) {
    var l = wt();
    xe.flags |= e, l.memoizedState = pr(1 | t, n, void 0, r === void 0 ? null : r);
  }
  function sl(e, t, n, r) {
    var l = ot();
    r = r === void 0 ? null : r;
    var i = void 0;
    if (Le !== null) {
      var o = Le.memoizedState;
      if (i = o.destroy, r !== null && Bi(r, o.deps)) {
        l.memoizedState = pr(t, n, i, r);
        return;
      }
    }
    xe.flags |= e, l.memoizedState = pr(1 | t, n, i, r);
  }
  function Cs(e, t) {
    return ul(8390656, 8, e, t);
  }
  function Ki(e, t) {
    return sl(2048, 8, e, t);
  }
  function _s(e, t) {
    return sl(4, 2, e, t);
  }
  function Ns(e, t) {
    return sl(4, 4, e, t);
  }
  function Ts(e, t) {
    if (typeof t == "function") return e = e(), t(e), function() {
      t(null);
    };
    if (t != null) return e = e(), t.current = e, function() {
      t.current = null;
    };
  }
  function Ps(e, t, n) {
    return n = n != null ? n.concat([e]) : null, sl(4, 4, Ts.bind(null, t, e), n);
  }
  function Gi() {
  }
  function zs(e, t) {
    var n = ot();
    t = t === void 0 ? null : t;
    var r = n.memoizedState;
    return r !== null && t !== null && Bi(t, r[1]) ? r[0] : (n.memoizedState = [e, t], e);
  }
  function Ls(e, t) {
    var n = ot();
    t = t === void 0 ? null : t;
    var r = n.memoizedState;
    return r !== null && t !== null && Bi(t, r[1]) ? r[0] : (e = e(), n.memoizedState = [e, t], e);
  }
  function Rs(e, t, n) {
    return (tn & 21) === 0 ? (e.baseState && (e.baseState = !1, Ye = !0), e.memoizedState = n) : (ct(n, t) || (n = uu(), xe.lanes |= n, nn |= n, e.baseState = !0), t);
  }
  function yf(e, t) {
    var n = se;
    se = n !== 0 && 4 > n ? n : 4, e(!0);
    var r = Vi.transition;
    Vi.transition = {};
    try {
      e(!1), t();
    } finally {
      se = n, Vi.transition = r;
    }
  }
  function js() {
    return ot().memoizedState;
  }
  function gf(e, t, n) {
    var r = $t(e);
    if (n = { lane: r, action: n, hasEagerState: !1, eagerState: null, next: null }, Is(e)) Ms(t, n);
    else if (n = cs(e, t, n, r), n !== null) {
      var l = Qe();
      ht(n, e, r, l), Os(n, t, r);
    }
  }
  function wf(e, t, n) {
    var r = $t(e), l = { lane: r, action: n, hasEagerState: !1, eagerState: null, next: null };
    if (Is(e)) Ms(t, l);
    else {
      var i = e.alternate;
      if (e.lanes === 0 && (i === null || i.lanes === 0) && (i = t.lastRenderedReducer, i !== null)) try {
        var o = t.lastRenderedState, u = i(o, n);
        if (l.hasEagerState = !0, l.eagerState = u, ct(u, o)) {
          var s = t.interleaved;
          s === null ? (l.next = l, Mi(t)) : (l.next = s.next, s.next = l), t.interleaved = l;
          return;
        }
      } catch {
      } finally {
      }
      n = cs(e, t, l, r), n !== null && (l = Qe(), ht(n, e, r, l), Os(n, t, r));
    }
  }
  function Is(e) {
    var t = e.alternate;
    return e === xe || t !== null && t === xe;
  }
  function Ms(e, t) {
    cr = ol = !0;
    var n = e.pending;
    n === null ? t.next = t : (t.next = n.next, n.next = t), e.pending = t;
  }
  function Os(e, t, n) {
    if ((n & 4194240) !== 0) {
      var r = t.lanes;
      r &= e.pendingLanes, n |= r, t.lanes = n, Xl(e, n);
    }
  }
  var al = { readContext: it, useCallback: Be, useContext: Be, useEffect: Be, useImperativeHandle: Be, useInsertionEffect: Be, useLayoutEffect: Be, useMemo: Be, useReducer: Be, useRef: Be, useState: Be, useDebugValue: Be, useDeferredValue: Be, useTransition: Be, useMutableSource: Be, useSyncExternalStore: Be, useId: Be, unstable_isNewReconciler: !1 }, kf = { readContext: it, useCallback: function(e, t) {
    return wt().memoizedState = [e, t === void 0 ? null : t], e;
  }, useContext: it, useEffect: Cs, useImperativeHandle: function(e, t, n) {
    return n = n != null ? n.concat([e]) : null, ul(
      4194308,
      4,
      Ts.bind(null, t, e),
      n
    );
  }, useLayoutEffect: function(e, t) {
    return ul(4194308, 4, e, t);
  }, useInsertionEffect: function(e, t) {
    return ul(4, 2, e, t);
  }, useMemo: function(e, t) {
    var n = wt();
    return t = t === void 0 ? null : t, e = e(), n.memoizedState = [e, t], e;
  }, useReducer: function(e, t, n) {
    var r = wt();
    return t = n !== void 0 ? n(t) : t, r.memoizedState = r.baseState = t, e = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: e, lastRenderedState: t }, r.queue = e, e = e.dispatch = gf.bind(null, xe, e), [r.memoizedState, e];
  }, useRef: function(e) {
    var t = wt();
    return e = { current: e }, t.memoizedState = e;
  }, useState: xs, useDebugValue: Gi, useDeferredValue: function(e) {
    return wt().memoizedState = e;
  }, useTransition: function() {
    var e = xs(!1), t = e[0];
    return e = yf.bind(null, e[1]), wt().memoizedState = e, [t, e];
  }, useMutableSource: function() {
  }, useSyncExternalStore: function(e, t, n) {
    var r = xe, l = wt();
    if (ke) {
      if (n === void 0) throw Error(c(407));
      n = n();
    } else {
      if (n = t(), Me === null) throw Error(c(349));
      (tn & 30) !== 0 || ys(r, t, n);
    }
    l.memoizedState = n;
    var i = { value: n, getSnapshot: t };
    return l.queue = i, Cs(ws.bind(
      null,
      r,
      i,
      e
    ), [e]), r.flags |= 2048, pr(9, gs.bind(null, r, i, n, t), void 0, null), n;
  }, useId: function() {
    var e = wt(), t = Me.identifierPrefix;
    if (ke) {
      var n = Ct, r = Et;
      n = (r & ~(1 << 32 - at(r) - 1)).toString(32) + n, t = ":" + t + "R" + n, n = fr++, 0 < n && (t += "H" + n.toString(32)), t += ":";
    } else n = vf++, t = ":" + t + "r" + n.toString(32) + ":";
    return e.memoizedState = t;
  }, unstable_isNewReconciler: !1 }, Sf = {
    readContext: it,
    useCallback: zs,
    useContext: it,
    useEffect: Ki,
    useImperativeHandle: Ps,
    useInsertionEffect: _s,
    useLayoutEffect: Ns,
    useMemo: Ls,
    useReducer: $i,
    useRef: Es,
    useState: function() {
      return $i(dr);
    },
    useDebugValue: Gi,
    useDeferredValue: function(e) {
      var t = ot();
      return Rs(t, Le.memoizedState, e);
    },
    useTransition: function() {
      var e = $i(dr)[0], t = ot().memoizedState;
      return [e, t];
    },
    useMutableSource: hs,
    useSyncExternalStore: vs,
    useId: js,
    unstable_isNewReconciler: !1
  }, xf = { readContext: it, useCallback: zs, useContext: it, useEffect: Ki, useImperativeHandle: Ps, useInsertionEffect: _s, useLayoutEffect: Ns, useMemo: Ls, useReducer: Qi, useRef: Es, useState: function() {
    return Qi(dr);
  }, useDebugValue: Gi, useDeferredValue: function(e) {
    var t = ot();
    return Le === null ? t.memoizedState = e : Rs(t, Le.memoizedState, e);
  }, useTransition: function() {
    var e = Qi(dr)[0], t = ot().memoizedState;
    return [e, t];
  }, useMutableSource: hs, useSyncExternalStore: vs, useId: js, unstable_isNewReconciler: !1 };
  function dt(e, t) {
    if (e && e.defaultProps) {
      t = N({}, t), e = e.defaultProps;
      for (var n in e) t[n] === void 0 && (t[n] = e[n]);
      return t;
    }
    return t;
  }
  function Yi(e, t, n, r) {
    t = e.memoizedState, n = n(r, t), n = n == null ? t : N({}, t, n), e.memoizedState = n, e.lanes === 0 && (e.updateQueue.baseState = n);
  }
  var cl = { isMounted: function(e) {
    return (e = e._reactInternals) ? Yt(e) === e : !1;
  }, enqueueSetState: function(e, t, n) {
    e = e._reactInternals;
    var r = Qe(), l = $t(e), i = Nt(r, l);
    i.payload = t, n != null && (i.callback = n), t = Vt(e, i, l), t !== null && (ht(t, e, l, r), nl(t, e, l));
  }, enqueueReplaceState: function(e, t, n) {
    e = e._reactInternals;
    var r = Qe(), l = $t(e), i = Nt(r, l);
    i.tag = 1, i.payload = t, n != null && (i.callback = n), t = Vt(e, i, l), t !== null && (ht(t, e, l, r), nl(t, e, l));
  }, enqueueForceUpdate: function(e, t) {
    e = e._reactInternals;
    var n = Qe(), r = $t(e), l = Nt(n, r);
    l.tag = 2, t != null && (l.callback = t), t = Vt(e, l, r), t !== null && (ht(t, e, r, n), nl(t, e, r));
  } };
  function Ds(e, t, n, r, l, i, o) {
    return e = e.stateNode, typeof e.shouldComponentUpdate == "function" ? e.shouldComponentUpdate(r, i, o) : t.prototype && t.prototype.isPureReactComponent ? !bn(n, r) || !bn(l, i) : !0;
  }
  function Fs(e, t, n) {
    var r = !1, l = Ft, i = t.contextType;
    return typeof i == "object" && i !== null ? i = it(i) : (l = Ge(t) ? Zt : Ve.current, r = t.contextTypes, i = (r = r != null) ? kn(e, l) : Ft), t = new t(n, i), e.memoizedState = t.state !== null && t.state !== void 0 ? t.state : null, t.updater = cl, e.stateNode = t, t._reactInternals = e, r && (e = e.stateNode, e.__reactInternalMemoizedUnmaskedChildContext = l, e.__reactInternalMemoizedMaskedChildContext = i), t;
  }
  function Us(e, t, n, r) {
    e = t.state, typeof t.componentWillReceiveProps == "function" && t.componentWillReceiveProps(n, r), typeof t.UNSAFE_componentWillReceiveProps == "function" && t.UNSAFE_componentWillReceiveProps(n, r), t.state !== e && cl.enqueueReplaceState(t, t.state, null);
  }
  function Xi(e, t, n, r) {
    var l = e.stateNode;
    l.props = n, l.state = e.memoizedState, l.refs = {}, Oi(e);
    var i = t.contextType;
    typeof i == "object" && i !== null ? l.context = it(i) : (i = Ge(t) ? Zt : Ve.current, l.context = kn(e, i)), l.state = e.memoizedState, i = t.getDerivedStateFromProps, typeof i == "function" && (Yi(e, t, i, n), l.state = e.memoizedState), typeof t.getDerivedStateFromProps == "function" || typeof l.getSnapshotBeforeUpdate == "function" || typeof l.UNSAFE_componentWillMount != "function" && typeof l.componentWillMount != "function" || (t = l.state, typeof l.componentWillMount == "function" && l.componentWillMount(), typeof l.UNSAFE_componentWillMount == "function" && l.UNSAFE_componentWillMount(), t !== l.state && cl.enqueueReplaceState(l, l.state, null), rl(e, n, l, r), l.state = e.memoizedState), typeof l.componentDidMount == "function" && (e.flags |= 4194308);
  }
  function Pn(e, t) {
    try {
      var n = "", r = t;
      do
        n += ee(r), r = r.return;
      while (r);
      var l = n;
    } catch (i) {
      l = `
Error generating stack: ` + i.message + `
` + i.stack;
    }
    return { value: e, source: t, stack: l, digest: null };
  }
  function Zi(e, t, n) {
    return { value: e, source: null, stack: n ?? null, digest: t ?? null };
  }
  function Ji(e, t) {
    try {
      console.error(t.value);
    } catch (n) {
      setTimeout(function() {
        throw n;
      });
    }
  }
  var Ef = typeof WeakMap == "function" ? WeakMap : Map;
  function As(e, t, n) {
    n = Nt(-1, n), n.tag = 3, n.payload = { element: null };
    var r = t.value;
    return n.callback = function() {
      yl || (yl = !0, po = r), Ji(e, t);
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
        Ji(e, t);
      };
    }
    var i = e.stateNode;
    return i !== null && typeof i.componentDidCatch == "function" && (n.callback = function() {
      Ji(e, t), typeof r != "function" && (Ht === null ? Ht = /* @__PURE__ */ new Set([this]) : Ht.add(this));
      var o = t.stack;
      this.componentDidCatch(t.value, { componentStack: o !== null ? o : "" });
    }), n;
  }
  function Bs(e, t, n) {
    var r = e.pingCache;
    if (r === null) {
      r = e.pingCache = new Ef();
      var l = /* @__PURE__ */ new Set();
      r.set(t, l);
    } else l = r.get(t), l === void 0 && (l = /* @__PURE__ */ new Set(), r.set(t, l));
    l.has(n) || (l.add(n), e = Ff.bind(null, e, t, n), t.then(e, e));
  }
  function Hs(e) {
    do {
      var t;
      if ((t = e.tag === 13) && (t = e.memoizedState, t = t !== null ? t.dehydrated !== null : !0), t) return e;
      e = e.return;
    } while (e !== null);
    return null;
  }
  function Ws(e, t, n, r, l) {
    return (e.mode & 1) === 0 ? (e === t ? e.flags |= 65536 : (e.flags |= 128, n.flags |= 131072, n.flags &= -52805, n.tag === 1 && (n.alternate === null ? n.tag = 17 : (t = Nt(-1, 1), t.tag = 2, Vt(n, t, 1))), n.lanes |= 1), e) : (e.flags |= 65536, e.lanes = l, e);
  }
  var Cf = ae.ReactCurrentOwner, Ye = !1;
  function $e(e, t, n, r) {
    t.child = e === null ? as(t, null, n, r) : Cn(t, e.child, n, r);
  }
  function $s(e, t, n, r, l) {
    n = n.render;
    var i = t.ref;
    return Nn(t, l), r = Hi(e, t, n, r, i, l), n = Wi(), e !== null && !Ye ? (t.updateQueue = e.updateQueue, t.flags &= -2053, e.lanes &= ~l, Tt(e, t, l)) : (ke && n && _i(t), t.flags |= 1, $e(e, t, r, l), t.child);
  }
  function Qs(e, t, n, r, l) {
    if (e === null) {
      var i = n.type;
      return typeof i == "function" && !ko(i) && i.defaultProps === void 0 && n.compare === null && n.defaultProps === void 0 ? (t.tag = 15, t.type = i, Ks(e, t, i, r, l)) : (e = El(n.type, null, r, t, t.mode, l), e.ref = t.ref, e.return = t, t.child = e);
    }
    if (i = e.child, (e.lanes & l) === 0) {
      var o = i.memoizedProps;
      if (n = n.compare, n = n !== null ? n : bn, n(o, r) && e.ref === t.ref) return Tt(e, t, l);
    }
    return t.flags |= 1, e = Kt(i, r), e.ref = t.ref, e.return = t, t.child = e;
  }
  function Ks(e, t, n, r, l) {
    if (e !== null) {
      var i = e.memoizedProps;
      if (bn(i, r) && e.ref === t.ref) if (Ye = !1, t.pendingProps = r = i, (e.lanes & l) !== 0) (e.flags & 131072) !== 0 && (Ye = !0);
      else return t.lanes = e.lanes, Tt(e, t, l);
    }
    return qi(e, t, n, r, l);
  }
  function Gs(e, t, n) {
    var r = t.pendingProps, l = r.children, i = e !== null ? e.memoizedState : null;
    if (r.mode === "hidden") if ((t.mode & 1) === 0) t.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, me(Ln, nt), nt |= n;
    else {
      if ((n & 1073741824) === 0) return e = i !== null ? i.baseLanes | n : n, t.lanes = t.childLanes = 1073741824, t.memoizedState = { baseLanes: e, cachePool: null, transitions: null }, t.updateQueue = null, me(Ln, nt), nt |= e, null;
      t.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, r = i !== null ? i.baseLanes : n, me(Ln, nt), nt |= r;
    }
    else i !== null ? (r = i.baseLanes | n, t.memoizedState = null) : r = n, me(Ln, nt), nt |= r;
    return $e(e, t, l, n), t.child;
  }
  function Ys(e, t) {
    var n = t.ref;
    (e === null && n !== null || e !== null && e.ref !== n) && (t.flags |= 512, t.flags |= 2097152);
  }
  function qi(e, t, n, r, l) {
    var i = Ge(n) ? Zt : Ve.current;
    return i = kn(t, i), Nn(t, l), n = Hi(e, t, n, r, i, l), r = Wi(), e !== null && !Ye ? (t.updateQueue = e.updateQueue, t.flags &= -2053, e.lanes &= ~l, Tt(e, t, l)) : (ke && r && _i(t), t.flags |= 1, $e(e, t, n, l), t.child);
  }
  function Xs(e, t, n, r, l) {
    if (Ge(n)) {
      var i = !0;
      Yr(t);
    } else i = !1;
    if (Nn(t, l), t.stateNode === null) dl(e, t), Fs(t, n, r), Xi(t, n, r, l), r = !0;
    else if (e === null) {
      var o = t.stateNode, u = t.memoizedProps;
      o.props = u;
      var s = o.context, h = n.contextType;
      typeof h == "object" && h !== null ? h = it(h) : (h = Ge(n) ? Zt : Ve.current, h = kn(t, h));
      var g = n.getDerivedStateFromProps, w = typeof g == "function" || typeof o.getSnapshotBeforeUpdate == "function";
      w || typeof o.UNSAFE_componentWillReceiveProps != "function" && typeof o.componentWillReceiveProps != "function" || (u !== r || s !== h) && Us(t, o, r, h), At = !1;
      var y = t.memoizedState;
      o.state = y, rl(t, r, o, l), s = t.memoizedState, u !== r || y !== s || Ke.current || At ? (typeof g == "function" && (Yi(t, n, g, r), s = t.memoizedState), (u = At || Ds(t, n, u, r, y, s, h)) ? (w || typeof o.UNSAFE_componentWillMount != "function" && typeof o.componentWillMount != "function" || (typeof o.componentWillMount == "function" && o.componentWillMount(), typeof o.UNSAFE_componentWillMount == "function" && o.UNSAFE_componentWillMount()), typeof o.componentDidMount == "function" && (t.flags |= 4194308)) : (typeof o.componentDidMount == "function" && (t.flags |= 4194308), t.memoizedProps = r, t.memoizedState = s), o.props = r, o.state = s, o.context = h, r = u) : (typeof o.componentDidMount == "function" && (t.flags |= 4194308), r = !1);
    } else {
      o = t.stateNode, fs(e, t), u = t.memoizedProps, h = t.type === t.elementType ? u : dt(t.type, u), o.props = h, w = t.pendingProps, y = o.context, s = n.contextType, typeof s == "object" && s !== null ? s = it(s) : (s = Ge(n) ? Zt : Ve.current, s = kn(t, s));
      var C = n.getDerivedStateFromProps;
      (g = typeof C == "function" || typeof o.getSnapshotBeforeUpdate == "function") || typeof o.UNSAFE_componentWillReceiveProps != "function" && typeof o.componentWillReceiveProps != "function" || (u !== w || y !== s) && Us(t, o, r, s), At = !1, y = t.memoizedState, o.state = y, rl(t, r, o, l);
      var P = t.memoizedState;
      u !== w || y !== P || Ke.current || At ? (typeof C == "function" && (Yi(t, n, C, r), P = t.memoizedState), (h = At || Ds(t, n, h, r, y, P, s) || !1) ? (g || typeof o.UNSAFE_componentWillUpdate != "function" && typeof o.componentWillUpdate != "function" || (typeof o.componentWillUpdate == "function" && o.componentWillUpdate(r, P, s), typeof o.UNSAFE_componentWillUpdate == "function" && o.UNSAFE_componentWillUpdate(r, P, s)), typeof o.componentDidUpdate == "function" && (t.flags |= 4), typeof o.getSnapshotBeforeUpdate == "function" && (t.flags |= 1024)) : (typeof o.componentDidUpdate != "function" || u === e.memoizedProps && y === e.memoizedState || (t.flags |= 4), typeof o.getSnapshotBeforeUpdate != "function" || u === e.memoizedProps && y === e.memoizedState || (t.flags |= 1024), t.memoizedProps = r, t.memoizedState = P), o.props = r, o.state = P, o.context = s, r = h) : (typeof o.componentDidUpdate != "function" || u === e.memoizedProps && y === e.memoizedState || (t.flags |= 4), typeof o.getSnapshotBeforeUpdate != "function" || u === e.memoizedProps && y === e.memoizedState || (t.flags |= 1024), r = !1);
    }
    return bi(e, t, n, r, i, l);
  }
  function bi(e, t, n, r, l, i) {
    Ys(e, t);
    var o = (t.flags & 128) !== 0;
    if (!r && !o) return l && es(t, n, !1), Tt(e, t, i);
    r = t.stateNode, Cf.current = t;
    var u = o && typeof n.getDerivedStateFromError != "function" ? null : r.render();
    return t.flags |= 1, e !== null && o ? (t.child = Cn(t, e.child, null, i), t.child = Cn(t, null, u, i)) : $e(e, t, u, i), t.memoizedState = r.state, l && es(t, n, !0), t.child;
  }
  function Zs(e) {
    var t = e.stateNode;
    t.pendingContext ? qu(e, t.pendingContext, t.pendingContext !== t.context) : t.context && qu(e, t.context, !1), Di(e, t.containerInfo);
  }
  function Js(e, t, n, r, l) {
    return En(), zi(l), t.flags |= 256, $e(e, t, n, r), t.child;
  }
  var eo = { dehydrated: null, treeContext: null, retryLane: 0 };
  function to(e) {
    return { baseLanes: e, cachePool: null, transitions: null };
  }
  function qs(e, t, n) {
    var r = t.pendingProps, l = Se.current, i = !1, o = (t.flags & 128) !== 0, u;
    if ((u = o) || (u = e !== null && e.memoizedState === null ? !1 : (l & 2) !== 0), u ? (i = !0, t.flags &= -129) : (e === null || e.memoizedState !== null) && (l |= 1), me(Se, l & 1), e === null)
      return Pi(t), e = t.memoizedState, e !== null && (e = e.dehydrated, e !== null) ? ((t.mode & 1) === 0 ? t.lanes = 1 : e.data === "$!" ? t.lanes = 8 : t.lanes = 1073741824, null) : (o = r.children, e = r.fallback, i ? (r = t.mode, i = t.child, o = { mode: "hidden", children: o }, (r & 1) === 0 && i !== null ? (i.childLanes = 0, i.pendingProps = o) : i = Cl(o, r, 0, null), e = un(e, r, n, null), i.return = t, e.return = t, i.sibling = e, t.child = i, t.child.memoizedState = to(n), t.memoizedState = eo, e) : no(t, o));
    if (l = e.memoizedState, l !== null && (u = l.dehydrated, u !== null)) return _f(e, t, o, r, u, l, n);
    if (i) {
      i = r.fallback, o = t.mode, l = e.child, u = l.sibling;
      var s = { mode: "hidden", children: r.children };
      return (o & 1) === 0 && t.child !== l ? (r = t.child, r.childLanes = 0, r.pendingProps = s, t.deletions = null) : (r = Kt(l, s), r.subtreeFlags = l.subtreeFlags & 14680064), u !== null ? i = Kt(u, i) : (i = un(i, o, n, null), i.flags |= 2), i.return = t, r.return = t, r.sibling = i, t.child = r, r = i, i = t.child, o = e.child.memoizedState, o = o === null ? to(n) : { baseLanes: o.baseLanes | n, cachePool: null, transitions: o.transitions }, i.memoizedState = o, i.childLanes = e.childLanes & ~n, t.memoizedState = eo, r;
    }
    return i = e.child, e = i.sibling, r = Kt(i, { mode: "visible", children: r.children }), (t.mode & 1) === 0 && (r.lanes = n), r.return = t, r.sibling = null, e !== null && (n = t.deletions, n === null ? (t.deletions = [e], t.flags |= 16) : n.push(e)), t.child = r, t.memoizedState = null, r;
  }
  function no(e, t) {
    return t = Cl({ mode: "visible", children: t }, e.mode, 0, null), t.return = e, e.child = t;
  }
  function fl(e, t, n, r) {
    return r !== null && zi(r), Cn(t, e.child, null, n), e = no(t, t.pendingProps.children), e.flags |= 2, t.memoizedState = null, e;
  }
  function _f(e, t, n, r, l, i, o) {
    if (n)
      return t.flags & 256 ? (t.flags &= -257, r = Zi(Error(c(422))), fl(e, t, o, r)) : t.memoizedState !== null ? (t.child = e.child, t.flags |= 128, null) : (i = r.fallback, l = t.mode, r = Cl({ mode: "visible", children: r.children }, l, 0, null), i = un(i, l, o, null), i.flags |= 2, r.return = t, i.return = t, r.sibling = i, t.child = r, (t.mode & 1) !== 0 && Cn(t, e.child, null, o), t.child.memoizedState = to(o), t.memoizedState = eo, i);
    if ((t.mode & 1) === 0) return fl(e, t, o, null);
    if (l.data === "$!") {
      if (r = l.nextSibling && l.nextSibling.dataset, r) var u = r.dgst;
      return r = u, i = Error(c(419)), r = Zi(i, r, void 0), fl(e, t, o, r);
    }
    if (u = (o & e.childLanes) !== 0, Ye || u) {
      if (r = Me, r !== null) {
        switch (o & -o) {
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
        l = (l & (r.suspendedLanes | o)) !== 0 ? 0 : l, l !== 0 && l !== i.retryLane && (i.retryLane = l, _t(e, l), ht(r, e, l, -1));
      }
      return wo(), r = Zi(Error(c(421))), fl(e, t, o, r);
    }
    return l.data === "$?" ? (t.flags |= 128, t.child = e.child, t = Uf.bind(null, e), l._reactRetry = t, null) : (e = i.treeContext, tt = Ot(l.nextSibling), et = t, ke = !0, ft = null, e !== null && (rt[lt++] = Et, rt[lt++] = Ct, rt[lt++] = Jt, Et = e.id, Ct = e.overflow, Jt = t), t = no(t, r.children), t.flags |= 4096, t);
  }
  function bs(e, t, n) {
    e.lanes |= t;
    var r = e.alternate;
    r !== null && (r.lanes |= t), Ii(e.return, t, n);
  }
  function ro(e, t, n, r, l) {
    var i = e.memoizedState;
    i === null ? e.memoizedState = { isBackwards: t, rendering: null, renderingStartTime: 0, last: r, tail: n, tailMode: l } : (i.isBackwards = t, i.rendering = null, i.renderingStartTime = 0, i.last = r, i.tail = n, i.tailMode = l);
  }
  function ea(e, t, n) {
    var r = t.pendingProps, l = r.revealOrder, i = r.tail;
    if ($e(e, t, r.children, n), r = Se.current, (r & 2) !== 0) r = r & 1 | 2, t.flags |= 128;
    else {
      if (e !== null && (e.flags & 128) !== 0) e: for (e = t.child; e !== null; ) {
        if (e.tag === 13) e.memoizedState !== null && bs(e, n, t);
        else if (e.tag === 19) bs(e, n, t);
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
    if (me(Se, r), (t.mode & 1) === 0) t.memoizedState = null;
    else switch (l) {
      case "forwards":
        for (n = t.child, l = null; n !== null; ) e = n.alternate, e !== null && ll(e) === null && (l = n), n = n.sibling;
        n = l, n === null ? (l = t.child, t.child = null) : (l = n.sibling, n.sibling = null), ro(t, !1, l, n, i);
        break;
      case "backwards":
        for (n = null, l = t.child, t.child = null; l !== null; ) {
          if (e = l.alternate, e !== null && ll(e) === null) {
            t.child = l;
            break;
          }
          e = l.sibling, l.sibling = n, n = l, l = e;
        }
        ro(t, !0, n, null, i);
        break;
      case "together":
        ro(t, !1, null, null, void 0);
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
  function Nf(e, t, n) {
    switch (t.tag) {
      case 3:
        Zs(t), En();
        break;
      case 5:
        ms(t);
        break;
      case 1:
        Ge(t.type) && Yr(t);
        break;
      case 4:
        Di(t, t.stateNode.containerInfo);
        break;
      case 10:
        var r = t.type._context, l = t.memoizedProps.value;
        me(el, r._currentValue), r._currentValue = l;
        break;
      case 13:
        if (r = t.memoizedState, r !== null)
          return r.dehydrated !== null ? (me(Se, Se.current & 1), t.flags |= 128, null) : (n & t.child.childLanes) !== 0 ? qs(e, t, n) : (me(Se, Se.current & 1), e = Tt(e, t, n), e !== null ? e.sibling : null);
        me(Se, Se.current & 1);
        break;
      case 19:
        if (r = (n & t.childLanes) !== 0, (e.flags & 128) !== 0) {
          if (r) return ea(e, t, n);
          t.flags |= 128;
        }
        if (l = t.memoizedState, l !== null && (l.rendering = null, l.tail = null, l.lastEffect = null), me(Se, Se.current), r) break;
        return null;
      case 22:
      case 23:
        return t.lanes = 0, Gs(e, t, n);
    }
    return Tt(e, t, n);
  }
  var ta, lo, na, ra;
  ta = function(e, t) {
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
  }, lo = function() {
  }, na = function(e, t, n, r) {
    var l = e.memoizedProps;
    if (l !== r) {
      e = t.stateNode, en(gt.current);
      var i = null;
      switch (n) {
        case "input":
          l = Il(e, l), r = Il(e, r), i = [];
          break;
        case "select":
          l = N({}, l, { value: void 0 }), r = N({}, r, { value: void 0 }), i = [];
          break;
        case "textarea":
          l = Dl(e, l), r = Dl(e, r), i = [];
          break;
        default:
          typeof l.onClick != "function" && typeof r.onClick == "function" && (e.onclick = Qr);
      }
      Ul(n, r);
      var o;
      n = null;
      for (h in l) if (!r.hasOwnProperty(h) && l.hasOwnProperty(h) && l[h] != null) if (h === "style") {
        var u = l[h];
        for (o in u) u.hasOwnProperty(o) && (n || (n = {}), n[o] = "");
      } else h !== "dangerouslySetInnerHTML" && h !== "children" && h !== "suppressContentEditableWarning" && h !== "suppressHydrationWarning" && h !== "autoFocus" && (_.hasOwnProperty(h) ? i || (i = []) : (i = i || []).push(h, null));
      for (h in r) {
        var s = r[h];
        if (u = l?.[h], r.hasOwnProperty(h) && s !== u && (s != null || u != null)) if (h === "style") if (u) {
          for (o in u) !u.hasOwnProperty(o) || s && s.hasOwnProperty(o) || (n || (n = {}), n[o] = "");
          for (o in s) s.hasOwnProperty(o) && u[o] !== s[o] && (n || (n = {}), n[o] = s[o]);
        } else n || (i || (i = []), i.push(
          h,
          n
        )), n = s;
        else h === "dangerouslySetInnerHTML" ? (s = s ? s.__html : void 0, u = u ? u.__html : void 0, s != null && u !== s && (i = i || []).push(h, s)) : h === "children" ? typeof s != "string" && typeof s != "number" || (i = i || []).push(h, "" + s) : h !== "suppressContentEditableWarning" && h !== "suppressHydrationWarning" && (_.hasOwnProperty(h) ? (s != null && h === "onScroll" && ve("scroll", e), i || u === s || (i = [])) : (i = i || []).push(h, s));
      }
      n && (i = i || []).push("style", n);
      var h = i;
      (t.updateQueue = h) && (t.flags |= 4);
    }
  }, ra = function(e, t, n, r) {
    n !== r && (t.flags |= 4);
  };
  function mr(e, t) {
    if (!ke) switch (e.tailMode) {
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
  function Tf(e, t, n) {
    var r = t.pendingProps;
    switch (Ni(t), t.tag) {
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
        return r = t.stateNode, Tn(), ye(Ke), ye(Ve), Ai(), r.pendingContext && (r.context = r.pendingContext, r.pendingContext = null), (e === null || e.child === null) && (qr(t) ? t.flags |= 4 : e === null || e.memoizedState.isDehydrated && (t.flags & 256) === 0 || (t.flags |= 1024, ft !== null && (vo(ft), ft = null))), lo(e, t), He(t), null;
      case 5:
        Fi(t);
        var l = en(ar.current);
        if (n = t.type, e !== null && t.stateNode != null) na(e, t, n, r, l), e.ref !== t.ref && (t.flags |= 512, t.flags |= 2097152);
        else {
          if (!r) {
            if (t.stateNode === null) throw Error(c(166));
            return He(t), null;
          }
          if (e = en(gt.current), qr(t)) {
            r = t.stateNode, n = t.type;
            var i = t.memoizedProps;
            switch (r[yt] = t, r[lr] = i, e = (t.mode & 1) !== 0, n) {
              case "dialog":
                ve("cancel", r), ve("close", r);
                break;
              case "iframe":
              case "object":
              case "embed":
                ve("load", r);
                break;
              case "video":
              case "audio":
                for (l = 0; l < tr.length; l++) ve(tr[l], r);
                break;
              case "source":
                ve("error", r);
                break;
              case "img":
              case "image":
              case "link":
                ve(
                  "error",
                  r
                ), ve("load", r);
                break;
              case "details":
                ve("toggle", r);
                break;
              case "input":
                Fo(r, i), ve("invalid", r);
                break;
              case "select":
                r._wrapperState = { wasMultiple: !!i.multiple }, ve("invalid", r);
                break;
              case "textarea":
                Vo(r, i), ve("invalid", r);
            }
            Ul(n, i), l = null;
            for (var o in i) if (i.hasOwnProperty(o)) {
              var u = i[o];
              o === "children" ? typeof u == "string" ? r.textContent !== u && (i.suppressHydrationWarning !== !0 && $r(r.textContent, u, e), l = ["children", u]) : typeof u == "number" && r.textContent !== "" + u && (i.suppressHydrationWarning !== !0 && $r(
                r.textContent,
                u,
                e
              ), l = ["children", "" + u]) : _.hasOwnProperty(o) && u != null && o === "onScroll" && ve("scroll", r);
            }
            switch (n) {
              case "input":
                Sr(r), Ao(r, i, !0);
                break;
              case "textarea":
                Sr(r), Ho(r);
                break;
              case "select":
              case "option":
                break;
              default:
                typeof i.onClick == "function" && (r.onclick = Qr);
            }
            r = l, t.updateQueue = r, r !== null && (t.flags |= 4);
          } else {
            o = l.nodeType === 9 ? l : l.ownerDocument, e === "http://www.w3.org/1999/xhtml" && (e = Wo(n)), e === "http://www.w3.org/1999/xhtml" ? n === "script" ? (e = o.createElement("div"), e.innerHTML = "<script><\/script>", e = e.removeChild(e.firstChild)) : typeof r.is == "string" ? e = o.createElement(n, { is: r.is }) : (e = o.createElement(n), n === "select" && (o = e, r.multiple ? o.multiple = !0 : r.size && (o.size = r.size))) : e = o.createElementNS(e, n), e[yt] = t, e[lr] = r, ta(e, t, !1, !1), t.stateNode = e;
            e: {
              switch (o = Al(n, r), n) {
                case "dialog":
                  ve("cancel", e), ve("close", e), l = r;
                  break;
                case "iframe":
                case "object":
                case "embed":
                  ve("load", e), l = r;
                  break;
                case "video":
                case "audio":
                  for (l = 0; l < tr.length; l++) ve(tr[l], e);
                  l = r;
                  break;
                case "source":
                  ve("error", e), l = r;
                  break;
                case "img":
                case "image":
                case "link":
                  ve(
                    "error",
                    e
                  ), ve("load", e), l = r;
                  break;
                case "details":
                  ve("toggle", e), l = r;
                  break;
                case "input":
                  Fo(e, r), l = Il(e, r), ve("invalid", e);
                  break;
                case "option":
                  l = r;
                  break;
                case "select":
                  e._wrapperState = { wasMultiple: !!r.multiple }, l = N({}, r, { value: void 0 }), ve("invalid", e);
                  break;
                case "textarea":
                  Vo(e, r), l = Dl(e, r), ve("invalid", e);
                  break;
                default:
                  l = r;
              }
              Ul(n, l), u = l;
              for (i in u) if (u.hasOwnProperty(i)) {
                var s = u[i];
                i === "style" ? Ko(e, s) : i === "dangerouslySetInnerHTML" ? (s = s ? s.__html : void 0, s != null && $o(e, s)) : i === "children" ? typeof s == "string" ? (n !== "textarea" || s !== "") && Dn(e, s) : typeof s == "number" && Dn(e, "" + s) : i !== "suppressContentEditableWarning" && i !== "suppressHydrationWarning" && i !== "autoFocus" && (_.hasOwnProperty(i) ? s != null && i === "onScroll" && ve("scroll", e) : s != null && ce(e, i, s, o));
              }
              switch (n) {
                case "input":
                  Sr(e), Ao(e, r, !1);
                  break;
                case "textarea":
                  Sr(e), Ho(e);
                  break;
                case "option":
                  r.value != null && e.setAttribute("value", "" + Y(r.value));
                  break;
                case "select":
                  e.multiple = !!r.multiple, i = r.value, i != null ? sn(e, !!r.multiple, i, !1) : r.defaultValue != null && sn(
                    e,
                    !!r.multiple,
                    r.defaultValue,
                    !0
                  );
                  break;
                default:
                  typeof l.onClick == "function" && (e.onclick = Qr);
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
        if (e && t.stateNode != null) ra(e, t, e.memoizedProps, r);
        else {
          if (typeof r != "string" && t.stateNode === null) throw Error(c(166));
          if (n = en(ar.current), en(gt.current), qr(t)) {
            if (r = t.stateNode, n = t.memoizedProps, r[yt] = t, (i = r.nodeValue !== n) && (e = et, e !== null)) switch (e.tag) {
              case 3:
                $r(r.nodeValue, n, (e.mode & 1) !== 0);
                break;
              case 5:
                e.memoizedProps.suppressHydrationWarning !== !0 && $r(r.nodeValue, n, (e.mode & 1) !== 0);
            }
            i && (t.flags |= 4);
          } else r = (n.nodeType === 9 ? n : n.ownerDocument).createTextNode(r), r[yt] = t, t.stateNode = r;
        }
        return He(t), null;
      case 13:
        if (ye(Se), r = t.memoizedState, e === null || e.memoizedState !== null && e.memoizedState.dehydrated !== null) {
          if (ke && tt !== null && (t.mode & 1) !== 0 && (t.flags & 128) === 0) os(), En(), t.flags |= 98560, i = !1;
          else if (i = qr(t), r !== null && r.dehydrated !== null) {
            if (e === null) {
              if (!i) throw Error(c(318));
              if (i = t.memoizedState, i = i !== null ? i.dehydrated : null, !i) throw Error(c(317));
              i[yt] = t;
            } else En(), (t.flags & 128) === 0 && (t.memoizedState = null), t.flags |= 4;
            He(t), i = !1;
          } else ft !== null && (vo(ft), ft = null), i = !0;
          if (!i) return t.flags & 65536 ? t : null;
        }
        return (t.flags & 128) !== 0 ? (t.lanes = n, t) : (r = r !== null, r !== (e !== null && e.memoizedState !== null) && r && (t.child.flags |= 8192, (t.mode & 1) !== 0 && (e === null || (Se.current & 1) !== 0 ? Re === 0 && (Re = 3) : wo())), t.updateQueue !== null && (t.flags |= 4), He(t), null);
      case 4:
        return Tn(), lo(e, t), e === null && nr(t.stateNode.containerInfo), He(t), null;
      case 10:
        return ji(t.type._context), He(t), null;
      case 17:
        return Ge(t.type) && Gr(), He(t), null;
      case 19:
        if (ye(Se), i = t.memoizedState, i === null) return He(t), null;
        if (r = (t.flags & 128) !== 0, o = i.rendering, o === null) if (r) mr(i, !1);
        else {
          if (Re !== 0 || e !== null && (e.flags & 128) !== 0) for (e = t.child; e !== null; ) {
            if (o = ll(e), o !== null) {
              for (t.flags |= 128, mr(i, !1), r = o.updateQueue, r !== null && (t.updateQueue = r, t.flags |= 4), t.subtreeFlags = 0, r = n, n = t.child; n !== null; ) i = n, e = r, i.flags &= 14680066, o = i.alternate, o === null ? (i.childLanes = 0, i.lanes = e, i.child = null, i.subtreeFlags = 0, i.memoizedProps = null, i.memoizedState = null, i.updateQueue = null, i.dependencies = null, i.stateNode = null) : (i.childLanes = o.childLanes, i.lanes = o.lanes, i.child = o.child, i.subtreeFlags = 0, i.deletions = null, i.memoizedProps = o.memoizedProps, i.memoizedState = o.memoizedState, i.updateQueue = o.updateQueue, i.type = o.type, e = o.dependencies, i.dependencies = e === null ? null : { lanes: e.lanes, firstContext: e.firstContext }), n = n.sibling;
              return me(Se, Se.current & 1 | 2), t.child;
            }
            e = e.sibling;
          }
          i.tail !== null && Ne() > Rn && (t.flags |= 128, r = !0, mr(i, !1), t.lanes = 4194304);
        }
        else {
          if (!r) if (e = ll(o), e !== null) {
            if (t.flags |= 128, r = !0, n = e.updateQueue, n !== null && (t.updateQueue = n, t.flags |= 4), mr(i, !0), i.tail === null && i.tailMode === "hidden" && !o.alternate && !ke) return He(t), null;
          } else 2 * Ne() - i.renderingStartTime > Rn && n !== 1073741824 && (t.flags |= 128, r = !0, mr(i, !1), t.lanes = 4194304);
          i.isBackwards ? (o.sibling = t.child, t.child = o) : (n = i.last, n !== null ? n.sibling = o : t.child = o, i.last = o);
        }
        return i.tail !== null ? (t = i.tail, i.rendering = t, i.tail = t.sibling, i.renderingStartTime = Ne(), t.sibling = null, n = Se.current, me(Se, r ? n & 1 | 2 : n & 1), t) : (He(t), null);
      case 22:
      case 23:
        return go(), r = t.memoizedState !== null, e !== null && e.memoizedState !== null !== r && (t.flags |= 8192), r && (t.mode & 1) !== 0 ? (nt & 1073741824) !== 0 && (He(t), t.subtreeFlags & 6 && (t.flags |= 8192)) : He(t), null;
      case 24:
        return null;
      case 25:
        return null;
    }
    throw Error(c(156, t.tag));
  }
  function Pf(e, t) {
    switch (Ni(t), t.tag) {
      case 1:
        return Ge(t.type) && Gr(), e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
      case 3:
        return Tn(), ye(Ke), ye(Ve), Ai(), e = t.flags, (e & 65536) !== 0 && (e & 128) === 0 ? (t.flags = e & -65537 | 128, t) : null;
      case 5:
        return Fi(t), null;
      case 13:
        if (ye(Se), e = t.memoizedState, e !== null && e.dehydrated !== null) {
          if (t.alternate === null) throw Error(c(340));
          En();
        }
        return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
      case 19:
        return ye(Se), null;
      case 4:
        return Tn(), null;
      case 10:
        return ji(t.type._context), null;
      case 22:
      case 23:
        return go(), null;
      case 24:
        return null;
      default:
        return null;
    }
  }
  var pl = !1, We = !1, zf = typeof WeakSet == "function" ? WeakSet : Set, T = null;
  function zn(e, t) {
    var n = e.ref;
    if (n !== null) if (typeof n == "function") try {
      n(null);
    } catch (r) {
      Ce(e, t, r);
    }
    else n.current = null;
  }
  function io(e, t, n) {
    try {
      n();
    } catch (r) {
      Ce(e, t, r);
    }
  }
  var la = !1;
  function Lf(e, t) {
    if (yi = Ir, e = Du(), ai(e)) {
      if ("selectionStart" in e) var n = { start: e.selectionStart, end: e.selectionEnd };
      else e: {
        n = (n = e.ownerDocument) && n.defaultView || window;
        var r = n.getSelection && n.getSelection();
        if (r && r.rangeCount !== 0) {
          n = r.anchorNode;
          var l = r.anchorOffset, i = r.focusNode;
          r = r.focusOffset;
          try {
            n.nodeType, i.nodeType;
          } catch {
            n = null;
            break e;
          }
          var o = 0, u = -1, s = -1, h = 0, g = 0, w = e, y = null;
          t: for (; ; ) {
            for (var C; w !== n || l !== 0 && w.nodeType !== 3 || (u = o + l), w !== i || r !== 0 && w.nodeType !== 3 || (s = o + r), w.nodeType === 3 && (o += w.nodeValue.length), (C = w.firstChild) !== null; )
              y = w, w = C;
            for (; ; ) {
              if (w === e) break t;
              if (y === n && ++h === l && (u = o), y === i && ++g === r && (s = o), (C = w.nextSibling) !== null) break;
              w = y, y = w.parentNode;
            }
            w = C;
          }
          n = u === -1 || s === -1 ? null : { start: u, end: s };
        } else n = null;
      }
      n = n || { start: 0, end: 0 };
    } else n = null;
    for (gi = { focusedElem: e, selectionRange: n }, Ir = !1, T = t; T !== null; ) if (t = T, e = t.child, (t.subtreeFlags & 1028) !== 0 && e !== null) e.return = t, T = e;
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
    return P = la, la = !1, P;
  }
  function hr(e, t, n) {
    var r = t.updateQueue;
    if (r = r !== null ? r.lastEffect : null, r !== null) {
      var l = r = r.next;
      do {
        if ((l.tag & e) === e) {
          var i = l.destroy;
          l.destroy = void 0, i !== void 0 && io(t, n, i);
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
  function oo(e) {
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
    t !== null && (e.alternate = null, ia(t)), e.child = null, e.deletions = null, e.sibling = null, e.tag === 5 && (t = e.stateNode, t !== null && (delete t[yt], delete t[lr], delete t[xi], delete t[df], delete t[pf])), e.stateNode = null, e.return = null, e.dependencies = null, e.memoizedProps = null, e.memoizedState = null, e.pendingProps = null, e.stateNode = null, e.updateQueue = null;
  }
  function oa(e) {
    return e.tag === 5 || e.tag === 3 || e.tag === 4;
  }
  function ua(e) {
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
  function uo(e, t, n) {
    var r = e.tag;
    if (r === 5 || r === 6) e = e.stateNode, t ? n.nodeType === 8 ? n.parentNode.insertBefore(e, t) : n.insertBefore(e, t) : (n.nodeType === 8 ? (t = n.parentNode, t.insertBefore(e, n)) : (t = n, t.appendChild(e)), n = n._reactRootContainer, n != null || t.onclick !== null || (t.onclick = Qr));
    else if (r !== 4 && (e = e.child, e !== null)) for (uo(e, t, n), e = e.sibling; e !== null; ) uo(e, t, n), e = e.sibling;
  }
  function so(e, t, n) {
    var r = e.tag;
    if (r === 5 || r === 6) e = e.stateNode, t ? n.insertBefore(e, t) : n.appendChild(e);
    else if (r !== 4 && (e = e.child, e !== null)) for (so(e, t, n), e = e.sibling; e !== null; ) so(e, t, n), e = e.sibling;
  }
  var Fe = null, pt = !1;
  function Bt(e, t, n) {
    for (n = n.child; n !== null; ) sa(e, t, n), n = n.sibling;
  }
  function sa(e, t, n) {
    if (vt && typeof vt.onCommitFiberUnmount == "function") try {
      vt.onCommitFiberUnmount(Tr, n);
    } catch {
    }
    switch (n.tag) {
      case 5:
        We || zn(n, t);
      case 6:
        var r = Fe, l = pt;
        Fe = null, Bt(e, t, n), Fe = r, pt = l, Fe !== null && (pt ? (e = Fe, n = n.stateNode, e.nodeType === 8 ? e.parentNode.removeChild(n) : e.removeChild(n)) : Fe.removeChild(n.stateNode));
        break;
      case 18:
        Fe !== null && (pt ? (e = Fe, n = n.stateNode, e.nodeType === 8 ? Si(e.parentNode, n) : e.nodeType === 1 && Si(e, n), Gn(e)) : Si(Fe, n.stateNode));
        break;
      case 4:
        r = Fe, l = pt, Fe = n.stateNode.containerInfo, pt = !0, Bt(e, t, n), Fe = r, pt = l;
        break;
      case 0:
      case 11:
      case 14:
      case 15:
        if (!We && (r = n.updateQueue, r !== null && (r = r.lastEffect, r !== null))) {
          l = r = r.next;
          do {
            var i = l, o = i.destroy;
            i = i.tag, o !== void 0 && ((i & 2) !== 0 || (i & 4) !== 0) && io(n, t, o), l = l.next;
          } while (l !== r);
        }
        Bt(e, t, n);
        break;
      case 1:
        if (!We && (zn(n, t), r = n.stateNode, typeof r.componentWillUnmount == "function")) try {
          r.props = n.memoizedProps, r.state = n.memoizedState, r.componentWillUnmount();
        } catch (u) {
          Ce(n, t, u);
        }
        Bt(e, t, n);
        break;
      case 21:
        Bt(e, t, n);
        break;
      case 22:
        n.mode & 1 ? (We = (r = We) || n.memoizedState !== null, Bt(e, t, n), We = r) : Bt(e, t, n);
        break;
      default:
        Bt(e, t, n);
    }
  }
  function aa(e) {
    var t = e.updateQueue;
    if (t !== null) {
      e.updateQueue = null;
      var n = e.stateNode;
      n === null && (n = e.stateNode = new zf()), t.forEach(function(r) {
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
        var i = e, o = t, u = o;
        e: for (; u !== null; ) {
          switch (u.tag) {
            case 5:
              Fe = u.stateNode, pt = !1;
              break e;
            case 3:
              Fe = u.stateNode.containerInfo, pt = !0;
              break e;
            case 4:
              Fe = u.stateNode.containerInfo, pt = !0;
              break e;
          }
          u = u.return;
        }
        if (Fe === null) throw Error(c(160));
        sa(i, o, l), Fe = null, pt = !1;
        var s = l.alternate;
        s !== null && (s.return = null), l.return = null;
      } catch (h) {
        Ce(l, t, h);
      }
    }
    if (t.subtreeFlags & 12854) for (t = t.child; t !== null; ) ca(t, e), t = t.sibling;
  }
  function ca(e, t) {
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
            Dn(l, "");
          } catch (z) {
            Ce(e, e.return, z);
          }
        }
        if (r & 4 && (l = e.stateNode, l != null)) {
          var i = e.memoizedProps, o = n !== null ? n.memoizedProps : i, u = e.type, s = e.updateQueue;
          if (e.updateQueue = null, s !== null) try {
            u === "input" && i.type === "radio" && i.name != null && Uo(l, i), Al(u, o);
            var h = Al(u, i);
            for (o = 0; o < s.length; o += 2) {
              var g = s[o], w = s[o + 1];
              g === "style" ? Ko(l, w) : g === "dangerouslySetInnerHTML" ? $o(l, w) : g === "children" ? Dn(l, w) : ce(l, g, w, h);
            }
            switch (u) {
              case "input":
                Ml(l, i);
                break;
              case "textarea":
                Bo(l, i);
                break;
              case "select":
                var y = l._wrapperState.wasMultiple;
                l._wrapperState.wasMultiple = !!i.multiple;
                var C = i.value;
                C != null ? sn(l, !!i.multiple, C, !1) : y !== !!i.multiple && (i.defaultValue != null ? sn(
                  l,
                  !!i.multiple,
                  i.defaultValue,
                  !0
                ) : sn(l, !!i.multiple, i.multiple ? [] : "", !1));
            }
            l[lr] = i;
          } catch (z) {
            Ce(e, e.return, z);
          }
        }
        break;
      case 6:
        if (mt(t, e), kt(e), r & 4) {
          if (e.stateNode === null) throw Error(c(162));
          l = e.stateNode, i = e.memoizedProps;
          try {
            l.nodeValue = i;
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
        mt(t, e), kt(e), l = e.child, l.flags & 8192 && (i = l.memoizedState !== null, l.stateNode.isHidden = i, !i || l.alternate !== null && l.alternate.memoizedState !== null || (fo = Ne())), r & 4 && aa(e);
        break;
      case 22:
        if (g = n !== null && n.memoizedState !== null, e.mode & 1 ? (We = (h = We) || g, mt(t, e), We = h) : mt(t, e), kt(e), r & 8192) {
          if (h = e.memoizedState !== null, (e.stateNode.isHidden = h) && !g && (e.mode & 1) !== 0) for (T = e, g = e.child; g !== null; ) {
            for (w = T = g; T !== null; ) {
              switch (y = T, C = y.child, y.tag) {
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
                    pa(w);
                    continue;
                  }
              }
              C !== null ? (C.return = y, T = C) : pa(w);
            }
            g = g.sibling;
          }
          e: for (g = null, w = e; ; ) {
            if (w.tag === 5) {
              if (g === null) {
                g = w;
                try {
                  l = w.stateNode, h ? (i = l.style, typeof i.setProperty == "function" ? i.setProperty("display", "none", "important") : i.display = "none") : (u = w.stateNode, s = w.memoizedProps.style, o = s != null && s.hasOwnProperty("display") ? s.display : null, u.style.display = Qo("display", o));
                } catch (z) {
                  Ce(e, e.return, z);
                }
              }
            } else if (w.tag === 6) {
              if (g === null) try {
                w.stateNode.nodeValue = h ? "" : w.memoizedProps;
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
        mt(t, e), kt(e), r & 4 && aa(e);
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
            r.flags & 32 && (Dn(l, ""), r.flags &= -33);
            var i = ua(e);
            so(e, i, l);
            break;
          case 3:
          case 4:
            var o = r.stateNode.containerInfo, u = ua(e);
            uo(e, u, o);
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
  function Rf(e, t, n) {
    T = e, fa(e);
  }
  function fa(e, t, n) {
    for (var r = (e.mode & 1) !== 0; T !== null; ) {
      var l = T, i = l.child;
      if (l.tag === 22 && r) {
        var o = l.memoizedState !== null || pl;
        if (!o) {
          var u = l.alternate, s = u !== null && u.memoizedState !== null || We;
          u = pl;
          var h = We;
          if (pl = o, (We = s) && !h) for (T = l; T !== null; ) o = T, s = o.child, o.tag === 22 && o.memoizedState !== null ? ma(l) : s !== null ? (s.return = o, T = s) : ma(l);
          for (; i !== null; ) T = i, fa(i), i = i.sibling;
          T = l, pl = u, We = h;
        }
        da(e);
      } else (l.subtreeFlags & 8772) !== 0 && i !== null ? (i.return = l, T = i) : da(e);
    }
  }
  function da(e) {
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
              var i = t.updateQueue;
              i !== null && ps(t, i, r);
              break;
            case 3:
              var o = t.updateQueue;
              if (o !== null) {
                if (n = null, t.child !== null) switch (t.child.tag) {
                  case 5:
                    n = t.child.stateNode;
                    break;
                  case 1:
                    n = t.child.stateNode;
                }
                ps(t, o, n);
              }
              break;
            case 5:
              var u = t.stateNode;
              if (n === null && t.flags & 4) {
                n = u;
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
                var h = t.alternate;
                if (h !== null) {
                  var g = h.memoizedState;
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
          We || t.flags & 512 && oo(t);
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
  function pa(e) {
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
  function ma(e) {
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
            var i = t.return;
            try {
              oo(t);
            } catch (s) {
              Ce(t, i, s);
            }
            break;
          case 5:
            var o = t.return;
            try {
              oo(t);
            } catch (s) {
              Ce(t, o, s);
            }
        }
      } catch (s) {
        Ce(t, t.return, s);
      }
      if (t === e) {
        T = null;
        break;
      }
      var u = t.sibling;
      if (u !== null) {
        u.return = t.return, T = u;
        break;
      }
      T = t.return;
    }
  }
  var jf = Math.ceil, hl = ae.ReactCurrentDispatcher, ao = ae.ReactCurrentOwner, ut = ae.ReactCurrentBatchConfig, ne = 0, Me = null, ze = null, Ue = 0, nt = 0, Ln = Dt(0), Re = 0, vr = null, nn = 0, vl = 0, co = 0, yr = null, Xe = null, fo = 0, Rn = 1 / 0, Pt = null, yl = !1, po = null, Ht = null, gl = !1, Wt = null, wl = 0, gr = 0, mo = null, kl = -1, Sl = 0;
  function Qe() {
    return (ne & 6) !== 0 ? Ne() : kl !== -1 ? kl : kl = Ne();
  }
  function $t(e) {
    return (e.mode & 1) === 0 ? 1 : (ne & 2) !== 0 && Ue !== 0 ? Ue & -Ue : hf.transition !== null ? (Sl === 0 && (Sl = uu()), Sl) : (e = se, e !== 0 || (e = window.event, e = e === void 0 ? 16 : vu(e.type)), e);
  }
  function ht(e, t, n, r) {
    if (50 < gr) throw gr = 0, mo = null, Error(c(185));
    Hn(e, n, r), ((ne & 2) === 0 || e !== Me) && (e === Me && ((ne & 2) === 0 && (vl |= n), Re === 4 && Qt(e, Ue)), Ze(e, r), n === 1 && ne === 0 && (t.mode & 1) === 0 && (Rn = Ne() + 500, Xr && Ut()));
  }
  function Ze(e, t) {
    var n = e.callbackNode;
    mc(e, t);
    var r = Lr(e, e === Me ? Ue : 0);
    if (r === 0) n !== null && lu(n), e.callbackNode = null, e.callbackPriority = 0;
    else if (t = r & -r, e.callbackPriority !== t) {
      if (n != null && lu(n), t === 1) e.tag === 0 ? mf(va.bind(null, e)) : ts(va.bind(null, e)), cf(function() {
        (ne & 6) === 0 && Ut();
      }), n = null;
      else {
        switch (su(r)) {
          case 1:
            n = Kl;
            break;
          case 4:
            n = iu;
            break;
          case 16:
            n = Nr;
            break;
          case 536870912:
            n = ou;
            break;
          default:
            n = Nr;
        }
        n = Ca(n, ha.bind(null, e));
      }
      e.callbackPriority = t, e.callbackNode = n;
    }
  }
  function ha(e, t) {
    if (kl = -1, Sl = 0, (ne & 6) !== 0) throw Error(c(327));
    var n = e.callbackNode;
    if (jn() && e.callbackNode !== n) return null;
    var r = Lr(e, e === Me ? Ue : 0);
    if (r === 0) return null;
    if ((r & 30) !== 0 || (r & e.expiredLanes) !== 0 || t) t = xl(e, r);
    else {
      t = r;
      var l = ne;
      ne |= 2;
      var i = ga();
      (Me !== e || Ue !== t) && (Pt = null, Rn = Ne() + 500, ln(e, t));
      do
        try {
          Of();
          break;
        } catch (u) {
          ya(e, u);
        }
      while (!0);
      Ri(), hl.current = i, ne = l, ze !== null ? t = 0 : (Me = null, Ue = 0, t = Re);
    }
    if (t !== 0) {
      if (t === 2 && (l = Gl(e), l !== 0 && (r = l, t = ho(e, l))), t === 1) throw n = vr, ln(e, 0), Qt(e, r), Ze(e, Ne()), n;
      if (t === 6) Qt(e, r);
      else {
        if (l = e.current.alternate, (r & 30) === 0 && !If(l) && (t = xl(e, r), t === 2 && (i = Gl(e), i !== 0 && (r = i, t = ho(e, i))), t === 1)) throw n = vr, ln(e, 0), Qt(e, r), Ze(e, Ne()), n;
        switch (e.finishedWork = l, e.finishedLanes = r, t) {
          case 0:
          case 1:
            throw Error(c(345));
          case 2:
            on(e, Xe, Pt);
            break;
          case 3:
            if (Qt(e, r), (r & 130023424) === r && (t = fo + 500 - Ne(), 10 < t)) {
              if (Lr(e, 0) !== 0) break;
              if (l = e.suspendedLanes, (l & r) !== r) {
                Qe(), e.pingedLanes |= e.suspendedLanes & l;
                break;
              }
              e.timeoutHandle = ki(on.bind(null, e, Xe, Pt), t);
              break;
            }
            on(e, Xe, Pt);
            break;
          case 4:
            if (Qt(e, r), (r & 4194240) === r) break;
            for (t = e.eventTimes, l = -1; 0 < r; ) {
              var o = 31 - at(r);
              i = 1 << o, o = t[o], o > l && (l = o), r &= ~i;
            }
            if (r = l, r = Ne() - r, r = (120 > r ? 120 : 480 > r ? 480 : 1080 > r ? 1080 : 1920 > r ? 1920 : 3e3 > r ? 3e3 : 4320 > r ? 4320 : 1960 * jf(r / 1960)) - r, 10 < r) {
              e.timeoutHandle = ki(on.bind(null, e, Xe, Pt), r);
              break;
            }
            on(e, Xe, Pt);
            break;
          case 5:
            on(e, Xe, Pt);
            break;
          default:
            throw Error(c(329));
        }
      }
    }
    return Ze(e, Ne()), e.callbackNode === n ? ha.bind(null, e) : null;
  }
  function ho(e, t) {
    var n = yr;
    return e.current.memoizedState.isDehydrated && (ln(e, t).flags |= 256), e = xl(e, t), e !== 2 && (t = Xe, Xe = n, t !== null && vo(t)), e;
  }
  function vo(e) {
    Xe === null ? Xe = e : Xe.push.apply(Xe, e);
  }
  function If(e) {
    for (var t = e; ; ) {
      if (t.flags & 16384) {
        var n = t.updateQueue;
        if (n !== null && (n = n.stores, n !== null)) for (var r = 0; r < n.length; r++) {
          var l = n[r], i = l.getSnapshot;
          l = l.value;
          try {
            if (!ct(i(), l)) return !1;
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
  function Qt(e, t) {
    for (t &= ~co, t &= ~vl, e.suspendedLanes |= t, e.pingedLanes &= ~t, e = e.expirationTimes; 0 < t; ) {
      var n = 31 - at(t), r = 1 << n;
      e[n] = -1, t &= ~r;
    }
  }
  function va(e) {
    if ((ne & 6) !== 0) throw Error(c(327));
    jn();
    var t = Lr(e, 0);
    if ((t & 1) === 0) return Ze(e, Ne()), null;
    var n = xl(e, t);
    if (e.tag !== 0 && n === 2) {
      var r = Gl(e);
      r !== 0 && (t = r, n = ho(e, r));
    }
    if (n === 1) throw n = vr, ln(e, 0), Qt(e, t), Ze(e, Ne()), n;
    if (n === 6) throw Error(c(345));
    return e.finishedWork = e.current.alternate, e.finishedLanes = t, on(e, Xe, Pt), Ze(e, Ne()), null;
  }
  function yo(e, t) {
    var n = ne;
    ne |= 1;
    try {
      return e(t);
    } finally {
      ne = n, ne === 0 && (Rn = Ne() + 500, Xr && Ut());
    }
  }
  function rn(e) {
    Wt !== null && Wt.tag === 0 && (ne & 6) === 0 && jn();
    var t = ne;
    ne |= 1;
    var n = ut.transition, r = se;
    try {
      if (ut.transition = null, se = 1, e) return e();
    } finally {
      se = r, ut.transition = n, ne = t, (ne & 6) === 0 && Ut();
    }
  }
  function go() {
    nt = Ln.current, ye(Ln);
  }
  function ln(e, t) {
    e.finishedWork = null, e.finishedLanes = 0;
    var n = e.timeoutHandle;
    if (n !== -1 && (e.timeoutHandle = -1, af(n)), ze !== null) for (n = ze.return; n !== null; ) {
      var r = n;
      switch (Ni(r), r.tag) {
        case 1:
          r = r.type.childContextTypes, r != null && Gr();
          break;
        case 3:
          Tn(), ye(Ke), ye(Ve), Ai();
          break;
        case 5:
          Fi(r);
          break;
        case 4:
          Tn();
          break;
        case 13:
          ye(Se);
          break;
        case 19:
          ye(Se);
          break;
        case 10:
          ji(r.type._context);
          break;
        case 22:
        case 23:
          go();
      }
      n = n.return;
    }
    if (Me = e, ze = e = Kt(e.current, null), Ue = nt = t, Re = 0, vr = null, co = vl = nn = 0, Xe = yr = null, bt !== null) {
      for (t = 0; t < bt.length; t++) if (n = bt[t], r = n.interleaved, r !== null) {
        n.interleaved = null;
        var l = r.next, i = n.pending;
        if (i !== null) {
          var o = i.next;
          i.next = l, r.next = o;
        }
        n.pending = r;
      }
      bt = null;
    }
    return e;
  }
  function ya(e, t) {
    do {
      var n = ze;
      try {
        if (Ri(), il.current = al, ol) {
          for (var r = xe.memoizedState; r !== null; ) {
            var l = r.queue;
            l !== null && (l.pending = null), r = r.next;
          }
          ol = !1;
        }
        if (tn = 0, Ie = Le = xe = null, cr = !1, fr = 0, ao.current = null, n === null || n.return === null) {
          Re = 1, vr = t, ze = null;
          break;
        }
        e: {
          var i = e, o = n.return, u = n, s = t;
          if (t = Ue, u.flags |= 32768, s !== null && typeof s == "object" && typeof s.then == "function") {
            var h = s, g = u, w = g.tag;
            if ((g.mode & 1) === 0 && (w === 0 || w === 11 || w === 15)) {
              var y = g.alternate;
              y ? (g.updateQueue = y.updateQueue, g.memoizedState = y.memoizedState, g.lanes = y.lanes) : (g.updateQueue = null, g.memoizedState = null);
            }
            var C = Hs(o);
            if (C !== null) {
              C.flags &= -257, Ws(C, o, u, i, t), C.mode & 1 && Bs(i, h, t), t = C, s = h;
              var P = t.updateQueue;
              if (P === null) {
                var z = /* @__PURE__ */ new Set();
                z.add(s), t.updateQueue = z;
              } else P.add(s);
              break e;
            } else {
              if ((t & 1) === 0) {
                Bs(i, h, t), wo();
                break e;
              }
              s = Error(c(426));
            }
          } else if (ke && u.mode & 1) {
            var Te = Hs(o);
            if (Te !== null) {
              (Te.flags & 65536) === 0 && (Te.flags |= 256), Ws(Te, o, u, i, t), zi(Pn(s, u));
              break e;
            }
          }
          i = s = Pn(s, u), Re !== 4 && (Re = 2), yr === null ? yr = [i] : yr.push(i), i = o;
          do {
            switch (i.tag) {
              case 3:
                i.flags |= 65536, t &= -t, i.lanes |= t;
                var d = As(i, s, t);
                ds(i, d);
                break e;
              case 1:
                u = s;
                var a = i.type, p = i.stateNode;
                if ((i.flags & 128) === 0 && (typeof a.getDerivedStateFromError == "function" || p !== null && typeof p.componentDidCatch == "function" && (Ht === null || !Ht.has(p)))) {
                  i.flags |= 65536, t &= -t, i.lanes |= t;
                  var S = Vs(i, u, t);
                  ds(i, S);
                  break e;
                }
            }
            i = i.return;
          } while (i !== null);
        }
        ka(n);
      } catch (L) {
        t = L, ze === n && n !== null && (ze = n = n.return);
        continue;
      }
      break;
    } while (!0);
  }
  function ga() {
    var e = hl.current;
    return hl.current = al, e === null ? al : e;
  }
  function wo() {
    (Re === 0 || Re === 3 || Re === 2) && (Re = 4), Me === null || (nn & 268435455) === 0 && (vl & 268435455) === 0 || Qt(Me, Ue);
  }
  function xl(e, t) {
    var n = ne;
    ne |= 2;
    var r = ga();
    (Me !== e || Ue !== t) && (Pt = null, ln(e, t));
    do
      try {
        Mf();
        break;
      } catch (l) {
        ya(e, l);
      }
    while (!0);
    if (Ri(), ne = n, hl.current = r, ze !== null) throw Error(c(261));
    return Me = null, Ue = 0, Re;
  }
  function Mf() {
    for (; ze !== null; ) wa(ze);
  }
  function Of() {
    for (; ze !== null && !ic(); ) wa(ze);
  }
  function wa(e) {
    var t = Ea(e.alternate, e, nt);
    e.memoizedProps = e.pendingProps, t === null ? ka(e) : ze = t, ao.current = null;
  }
  function ka(e) {
    var t = e;
    do {
      var n = t.alternate;
      if (e = t.return, (t.flags & 32768) === 0) {
        if (n = Tf(n, t, nt), n !== null) {
          ze = n;
          return;
        }
      } else {
        if (n = Pf(n, t), n !== null) {
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
  function on(e, t, n) {
    var r = se, l = ut.transition;
    try {
      ut.transition = null, se = 1, Df(e, t, n, r);
    } finally {
      ut.transition = l, se = r;
    }
    return null;
  }
  function Df(e, t, n, r) {
    do
      jn();
    while (Wt !== null);
    if ((ne & 6) !== 0) throw Error(c(327));
    n = e.finishedWork;
    var l = e.finishedLanes;
    if (n === null) return null;
    if (e.finishedWork = null, e.finishedLanes = 0, n === e.current) throw Error(c(177));
    e.callbackNode = null, e.callbackPriority = 0;
    var i = n.lanes | n.childLanes;
    if (hc(e, i), e === Me && (ze = Me = null, Ue = 0), (n.subtreeFlags & 2064) === 0 && (n.flags & 2064) === 0 || gl || (gl = !0, Ca(Nr, function() {
      return jn(), null;
    })), i = (n.flags & 15990) !== 0, (n.subtreeFlags & 15990) !== 0 || i) {
      i = ut.transition, ut.transition = null;
      var o = se;
      se = 1;
      var u = ne;
      ne |= 4, ao.current = null, Lf(e, n), ca(n, e), tf(gi), Ir = !!yi, gi = yi = null, e.current = n, Rf(n), oc(), ne = u, se = o, ut.transition = i;
    } else e.current = n;
    if (gl && (gl = !1, Wt = e, wl = l), i = e.pendingLanes, i === 0 && (Ht = null), ac(n.stateNode), Ze(e, Ne()), t !== null) for (r = e.onRecoverableError, n = 0; n < t.length; n++) l = t[n], r(l.value, { componentStack: l.stack, digest: l.digest });
    if (yl) throw yl = !1, e = po, po = null, e;
    return (wl & 1) !== 0 && e.tag !== 0 && jn(), i = e.pendingLanes, (i & 1) !== 0 ? e === mo ? gr++ : (gr = 0, mo = e) : gr = 0, Ut(), null;
  }
  function jn() {
    if (Wt !== null) {
      var e = su(wl), t = ut.transition, n = se;
      try {
        if (ut.transition = null, se = 16 > e ? 16 : e, Wt === null) var r = !1;
        else {
          if (e = Wt, Wt = null, wl = 0, (ne & 6) !== 0) throw Error(c(331));
          var l = ne;
          for (ne |= 4, T = e.current; T !== null; ) {
            var i = T, o = i.child;
            if ((T.flags & 16) !== 0) {
              var u = i.deletions;
              if (u !== null) {
                for (var s = 0; s < u.length; s++) {
                  var h = u[s];
                  for (T = h; T !== null; ) {
                    var g = T;
                    switch (g.tag) {
                      case 0:
                      case 11:
                      case 15:
                        hr(8, g, i);
                    }
                    var w = g.child;
                    if (w !== null) w.return = g, T = w;
                    else for (; T !== null; ) {
                      g = T;
                      var y = g.sibling, C = g.return;
                      if (ia(g), g === h) {
                        T = null;
                        break;
                      }
                      if (y !== null) {
                        y.return = C, T = y;
                        break;
                      }
                      T = C;
                    }
                  }
                }
                var P = i.alternate;
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
                T = i;
              }
            }
            if ((i.subtreeFlags & 2064) !== 0 && o !== null) o.return = i, T = o;
            else e: for (; T !== null; ) {
              if (i = T, (i.flags & 2048) !== 0) switch (i.tag) {
                case 0:
                case 11:
                case 15:
                  hr(9, i, i.return);
              }
              var d = i.sibling;
              if (d !== null) {
                d.return = i.return, T = d;
                break e;
              }
              T = i.return;
            }
          }
          var a = e.current;
          for (T = a; T !== null; ) {
            o = T;
            var p = o.child;
            if ((o.subtreeFlags & 2064) !== 0 && p !== null) p.return = o, T = p;
            else e: for (o = a; T !== null; ) {
              if (u = T, (u.flags & 2048) !== 0) try {
                switch (u.tag) {
                  case 0:
                  case 11:
                  case 15:
                    ml(9, u);
                }
              } catch (L) {
                Ce(u, u.return, L);
              }
              if (u === o) {
                T = null;
                break e;
              }
              var S = u.sibling;
              if (S !== null) {
                S.return = u.return, T = S;
                break e;
              }
              T = u.return;
            }
          }
          if (ne = l, Ut(), vt && typeof vt.onPostCommitFiberRoot == "function") try {
            vt.onPostCommitFiberRoot(Tr, e);
          } catch {
          }
          r = !0;
        }
        return r;
      } finally {
        se = n, ut.transition = t;
      }
    }
    return !1;
  }
  function Sa(e, t, n) {
    t = Pn(n, t), t = As(e, t, 1), e = Vt(e, t, 1), t = Qe(), e !== null && (Hn(e, 1, t), Ze(e, t));
  }
  function Ce(e, t, n) {
    if (e.tag === 3) Sa(e, e, n);
    else for (; t !== null; ) {
      if (t.tag === 3) {
        Sa(t, e, n);
        break;
      } else if (t.tag === 1) {
        var r = t.stateNode;
        if (typeof t.type.getDerivedStateFromError == "function" || typeof r.componentDidCatch == "function" && (Ht === null || !Ht.has(r))) {
          e = Pn(n, e), e = Vs(t, e, 1), t = Vt(t, e, 1), e = Qe(), t !== null && (Hn(t, 1, e), Ze(t, e));
          break;
        }
      }
      t = t.return;
    }
  }
  function Ff(e, t, n) {
    var r = e.pingCache;
    r !== null && r.delete(t), t = Qe(), e.pingedLanes |= e.suspendedLanes & n, Me === e && (Ue & n) === n && (Re === 4 || Re === 3 && (Ue & 130023424) === Ue && 500 > Ne() - fo ? ln(e, 0) : co |= n), Ze(e, t);
  }
  function xa(e, t) {
    t === 0 && ((e.mode & 1) === 0 ? t = 1 : (t = zr, zr <<= 1, (zr & 130023424) === 0 && (zr = 4194304)));
    var n = Qe();
    e = _t(e, t), e !== null && (Hn(e, t, n), Ze(e, n));
  }
  function Uf(e) {
    var t = e.memoizedState, n = 0;
    t !== null && (n = t.retryLane), xa(e, n);
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
    r !== null && r.delete(t), xa(e, n);
  }
  var Ea;
  Ea = function(e, t, n) {
    if (e !== null) if (e.memoizedProps !== t.pendingProps || Ke.current) Ye = !0;
    else {
      if ((e.lanes & n) === 0 && (t.flags & 128) === 0) return Ye = !1, Nf(e, t, n);
      Ye = (e.flags & 131072) !== 0;
    }
    else Ye = !1, ke && (t.flags & 1048576) !== 0 && ns(t, Jr, t.index);
    switch (t.lanes = 0, t.tag) {
      case 2:
        var r = t.type;
        dl(e, t), e = t.pendingProps;
        var l = kn(t, Ve.current);
        Nn(t, n), l = Hi(null, t, r, e, l, n);
        var i = Wi();
        return t.flags |= 1, typeof l == "object" && l !== null && typeof l.render == "function" && l.$$typeof === void 0 ? (t.tag = 1, t.memoizedState = null, t.updateQueue = null, Ge(r) ? (i = !0, Yr(t)) : i = !1, t.memoizedState = l.state !== null && l.state !== void 0 ? l.state : null, Oi(t), l.updater = cl, t.stateNode = l, l._reactInternals = t, Xi(t, r, e, n), t = bi(null, t, r, !0, i, n)) : (t.tag = 0, ke && i && _i(t), $e(null, t, l, n), t = t.child), t;
      case 16:
        r = t.elementType;
        e: {
          switch (dl(e, t), e = t.pendingProps, l = r._init, r = l(r._payload), t.type = r, l = t.tag = Bf(r), e = dt(r, e), l) {
            case 0:
              t = qi(null, t, r, e, n);
              break e;
            case 1:
              t = Xs(null, t, r, e, n);
              break e;
            case 11:
              t = $s(null, t, r, e, n);
              break e;
            case 14:
              t = Qs(null, t, r, dt(r.type, e), n);
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
        return r = t.type, l = t.pendingProps, l = t.elementType === r ? l : dt(r, l), qi(e, t, r, l, n);
      case 1:
        return r = t.type, l = t.pendingProps, l = t.elementType === r ? l : dt(r, l), Xs(e, t, r, l, n);
      case 3:
        e: {
          if (Zs(t), e === null) throw Error(c(387));
          r = t.pendingProps, i = t.memoizedState, l = i.element, fs(e, t), rl(t, r, null, n);
          var o = t.memoizedState;
          if (r = o.element, i.isDehydrated) if (i = { element: r, isDehydrated: !1, cache: o.cache, pendingSuspenseBoundaries: o.pendingSuspenseBoundaries, transitions: o.transitions }, t.updateQueue.baseState = i, t.memoizedState = i, t.flags & 256) {
            l = Pn(Error(c(423)), t), t = Js(e, t, r, n, l);
            break e;
          } else if (r !== l) {
            l = Pn(Error(c(424)), t), t = Js(e, t, r, n, l);
            break e;
          } else for (tt = Ot(t.stateNode.containerInfo.firstChild), et = t, ke = !0, ft = null, n = as(t, null, r, n), t.child = n; n; ) n.flags = n.flags & -3 | 4096, n = n.sibling;
          else {
            if (En(), r === l) {
              t = Tt(e, t, n);
              break e;
            }
            $e(e, t, r, n);
          }
          t = t.child;
        }
        return t;
      case 5:
        return ms(t), e === null && Pi(t), r = t.type, l = t.pendingProps, i = e !== null ? e.memoizedProps : null, o = l.children, wi(r, l) ? o = null : i !== null && wi(r, i) && (t.flags |= 32), Ys(e, t), $e(e, t, o, n), t.child;
      case 6:
        return e === null && Pi(t), null;
      case 13:
        return qs(e, t, n);
      case 4:
        return Di(t, t.stateNode.containerInfo), r = t.pendingProps, e === null ? t.child = Cn(t, null, r, n) : $e(e, t, r, n), t.child;
      case 11:
        return r = t.type, l = t.pendingProps, l = t.elementType === r ? l : dt(r, l), $s(e, t, r, l, n);
      case 7:
        return $e(e, t, t.pendingProps, n), t.child;
      case 8:
        return $e(e, t, t.pendingProps.children, n), t.child;
      case 12:
        return $e(e, t, t.pendingProps.children, n), t.child;
      case 10:
        e: {
          if (r = t.type._context, l = t.pendingProps, i = t.memoizedProps, o = l.value, me(el, r._currentValue), r._currentValue = o, i !== null) if (ct(i.value, o)) {
            if (i.children === l.children && !Ke.current) {
              t = Tt(e, t, n);
              break e;
            }
          } else for (i = t.child, i !== null && (i.return = t); i !== null; ) {
            var u = i.dependencies;
            if (u !== null) {
              o = i.child;
              for (var s = u.firstContext; s !== null; ) {
                if (s.context === r) {
                  if (i.tag === 1) {
                    s = Nt(-1, n & -n), s.tag = 2;
                    var h = i.updateQueue;
                    if (h !== null) {
                      h = h.shared;
                      var g = h.pending;
                      g === null ? s.next = s : (s.next = g.next, g.next = s), h.pending = s;
                    }
                  }
                  i.lanes |= n, s = i.alternate, s !== null && (s.lanes |= n), Ii(
                    i.return,
                    n,
                    t
                  ), u.lanes |= n;
                  break;
                }
                s = s.next;
              }
            } else if (i.tag === 10) o = i.type === t.type ? null : i.child;
            else if (i.tag === 18) {
              if (o = i.return, o === null) throw Error(c(341));
              o.lanes |= n, u = o.alternate, u !== null && (u.lanes |= n), Ii(o, n, t), o = i.sibling;
            } else o = i.child;
            if (o !== null) o.return = i;
            else for (o = i; o !== null; ) {
              if (o === t) {
                o = null;
                break;
              }
              if (i = o.sibling, i !== null) {
                i.return = o.return, o = i;
                break;
              }
              o = o.return;
            }
            i = o;
          }
          $e(e, t, l.children, n), t = t.child;
        }
        return t;
      case 9:
        return l = t.type, r = t.pendingProps.children, Nn(t, n), l = it(l), r = r(l), t.flags |= 1, $e(e, t, r, n), t.child;
      case 14:
        return r = t.type, l = dt(r, t.pendingProps), l = dt(r.type, l), Qs(e, t, r, l, n);
      case 15:
        return Ks(e, t, t.type, t.pendingProps, n);
      case 17:
        return r = t.type, l = t.pendingProps, l = t.elementType === r ? l : dt(r, l), dl(e, t), t.tag = 1, Ge(r) ? (e = !0, Yr(t)) : e = !1, Nn(t, n), Fs(t, r, l), Xi(t, r, l, n), bi(null, t, r, !0, e, n);
      case 19:
        return ea(e, t, n);
      case 22:
        return Gs(e, t, n);
    }
    throw Error(c(156, t.tag));
  };
  function Ca(e, t) {
    return ru(e, t);
  }
  function Vf(e, t, n, r) {
    this.tag = e, this.key = n, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.ref = null, this.pendingProps = t, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = r, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
  }
  function st(e, t, n, r) {
    return new Vf(e, t, n, r);
  }
  function ko(e) {
    return e = e.prototype, !(!e || !e.isReactComponent);
  }
  function Bf(e) {
    if (typeof e == "function") return ko(e) ? 1 : 0;
    if (e != null) {
      if (e = e.$$typeof, e === we) return 11;
      if (e === qe) return 14;
    }
    return 2;
  }
  function Kt(e, t) {
    var n = e.alternate;
    return n === null ? (n = st(e.tag, t, e.key, e.mode), n.elementType = e.elementType, n.type = e.type, n.stateNode = e.stateNode, n.alternate = e, e.alternate = n) : (n.pendingProps = t, n.type = e.type, n.flags = 0, n.subtreeFlags = 0, n.deletions = null), n.flags = e.flags & 14680064, n.childLanes = e.childLanes, n.lanes = e.lanes, n.child = e.child, n.memoizedProps = e.memoizedProps, n.memoizedState = e.memoizedState, n.updateQueue = e.updateQueue, t = e.dependencies, n.dependencies = t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }, n.sibling = e.sibling, n.index = e.index, n.ref = e.ref, n;
  }
  function El(e, t, n, r, l, i) {
    var o = 2;
    if (r = e, typeof e == "function") ko(e) && (o = 1);
    else if (typeof e == "string") o = 5;
    else e: switch (e) {
      case te:
        return un(n.children, l, i, t);
      case ue:
        o = 8, l |= 8;
        break;
      case Ee:
        return e = st(12, n, t, l | 2), e.elementType = Ee, e.lanes = i, e;
      case _e:
        return e = st(13, n, t, l), e.elementType = _e, e.lanes = i, e;
      case De:
        return e = st(19, n, t, l), e.elementType = De, e.lanes = i, e;
      case pe:
        return Cl(n, l, i, t);
      default:
        if (typeof e == "object" && e !== null) switch (e.$$typeof) {
          case ge:
            o = 10;
            break e;
          case je:
            o = 9;
            break e;
          case we:
            o = 11;
            break e;
          case qe:
            o = 14;
            break e;
          case Pe:
            o = 16, r = null;
            break e;
        }
        throw Error(c(130, e == null ? e : typeof e, ""));
    }
    return t = st(o, n, t, l), t.elementType = e, t.type = r, t.lanes = i, t;
  }
  function un(e, t, n, r) {
    return e = st(7, e, r, t), e.lanes = n, e;
  }
  function Cl(e, t, n, r) {
    return e = st(22, e, r, t), e.elementType = pe, e.lanes = n, e.stateNode = { isHidden: !1 }, e;
  }
  function So(e, t, n) {
    return e = st(6, e, null, t), e.lanes = n, e;
  }
  function xo(e, t, n) {
    return t = st(4, e.children !== null ? e.children : [], e.key, t), t.lanes = n, t.stateNode = { containerInfo: e.containerInfo, pendingChildren: null, implementation: e.implementation }, t;
  }
  function Hf(e, t, n, r, l) {
    this.tag = t, this.containerInfo = e, this.finishedWork = this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.pendingContext = this.context = null, this.callbackPriority = 0, this.eventTimes = Yl(0), this.expirationTimes = Yl(-1), this.entangledLanes = this.finishedLanes = this.mutableReadLanes = this.expiredLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = Yl(0), this.identifierPrefix = r, this.onRecoverableError = l, this.mutableSourceEagerHydrationData = null;
  }
  function Eo(e, t, n, r, l, i, o, u, s) {
    return e = new Hf(e, t, n, u, s), t === 1 ? (t = 1, i === !0 && (t |= 8)) : t = 0, i = st(3, null, null, t), e.current = i, i.stateNode = e, i.memoizedState = { element: r, isDehydrated: n, cache: null, transitions: null, pendingSuspenseBoundaries: null }, Oi(i), e;
  }
  function Wf(e, t, n) {
    var r = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return { $$typeof: O, key: r == null ? null : "" + r, children: e, containerInfo: t, implementation: n };
  }
  function _a(e) {
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
      if (Ge(n)) return bu(e, n, t);
    }
    return t;
  }
  function Na(e, t, n, r, l, i, o, u, s) {
    return e = Eo(n, r, !0, e, l, i, o, u, s), e.context = _a(null), n = e.current, r = Qe(), l = $t(n), i = Nt(r, l), i.callback = t ?? null, Vt(n, i, l), e.current.lanes = l, Hn(e, l, r), Ze(e, r), e;
  }
  function _l(e, t, n, r) {
    var l = t.current, i = Qe(), o = $t(l);
    return n = _a(n), t.context === null ? t.context = n : t.pendingContext = n, t = Nt(i, o), t.payload = { element: e }, r = r === void 0 ? null : r, r !== null && (t.callback = r), e = Vt(l, t, o), e !== null && (ht(e, l, o, i), nl(e, l, o)), o;
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
  function Ta(e, t) {
    if (e = e.memoizedState, e !== null && e.dehydrated !== null) {
      var n = e.retryLane;
      e.retryLane = n !== 0 && n < t ? n : t;
    }
  }
  function Co(e, t) {
    Ta(e, t), (e = e.alternate) && Ta(e, t);
  }
  function $f() {
    return null;
  }
  var Pa = typeof reportError == "function" ? reportError : function(e) {
    console.error(e);
  };
  function _o(e) {
    this._internalRoot = e;
  }
  Tl.prototype.render = _o.prototype.render = function(e) {
    var t = this._internalRoot;
    if (t === null) throw Error(c(409));
    _l(e, t, null, null);
  }, Tl.prototype.unmount = _o.prototype.unmount = function() {
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
      var t = fu();
      e = { blockedOn: null, target: e, priority: t };
      for (var n = 0; n < jt.length && t !== 0 && t < jt[n].priority; n++) ;
      jt.splice(n, 0, e), n === 0 && mu(e);
    }
  };
  function No(e) {
    return !(!e || e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11);
  }
  function Pl(e) {
    return !(!e || e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11 && (e.nodeType !== 8 || e.nodeValue !== " react-mount-point-unstable "));
  }
  function za() {
  }
  function Qf(e, t, n, r, l) {
    if (l) {
      if (typeof r == "function") {
        var i = r;
        r = function() {
          var h = Nl(o);
          i.call(h);
        };
      }
      var o = Na(t, r, e, 0, null, !1, !1, "", za);
      return e._reactRootContainer = o, e[St] = o.current, nr(e.nodeType === 8 ? e.parentNode : e), rn(), o;
    }
    for (; l = e.lastChild; ) e.removeChild(l);
    if (typeof r == "function") {
      var u = r;
      r = function() {
        var h = Nl(s);
        u.call(h);
      };
    }
    var s = Eo(e, 0, !1, null, null, !1, !1, "", za);
    return e._reactRootContainer = s, e[St] = s.current, nr(e.nodeType === 8 ? e.parentNode : e), rn(function() {
      _l(t, s, n, r);
    }), s;
  }
  function zl(e, t, n, r, l) {
    var i = n._reactRootContainer;
    if (i) {
      var o = i;
      if (typeof l == "function") {
        var u = l;
        l = function() {
          var s = Nl(o);
          u.call(s);
        };
      }
      _l(t, o, e, l);
    } else o = Qf(n, t, e, l, r);
    return Nl(o);
  }
  au = function(e) {
    switch (e.tag) {
      case 3:
        var t = e.stateNode;
        if (t.current.memoizedState.isDehydrated) {
          var n = Bn(t.pendingLanes);
          n !== 0 && (Xl(t, n | 1), Ze(t, Ne()), (ne & 6) === 0 && (Rn = Ne() + 500, Ut()));
        }
        break;
      case 13:
        rn(function() {
          var r = _t(e, 1);
          if (r !== null) {
            var l = Qe();
            ht(r, e, 1, l);
          }
        }), Co(e, 1);
    }
  }, Zl = function(e) {
    if (e.tag === 13) {
      var t = _t(e, 134217728);
      if (t !== null) {
        var n = Qe();
        ht(t, e, 134217728, n);
      }
      Co(e, 134217728);
    }
  }, cu = function(e) {
    if (e.tag === 13) {
      var t = $t(e), n = _t(e, t);
      if (n !== null) {
        var r = Qe();
        ht(n, e, t, r);
      }
      Co(e, t);
    }
  }, fu = function() {
    return se;
  }, du = function(e, t) {
    var n = se;
    try {
      return se = e, t();
    } finally {
      se = n;
    }
  }, Hl = function(e, t, n) {
    switch (t) {
      case "input":
        if (Ml(e, n), t = n.name, n.type === "radio" && t != null) {
          for (n = e; n.parentNode; ) n = n.parentNode;
          for (n = n.querySelectorAll("input[name=" + JSON.stringify("" + t) + '][type="radio"]'), t = 0; t < n.length; t++) {
            var r = n[t];
            if (r !== e && r.form === e.form) {
              var l = Kr(r);
              if (!l) throw Error(c(90));
              Do(r), Ml(r, l);
            }
          }
        }
        break;
      case "textarea":
        Bo(e, n);
        break;
      case "select":
        t = n.value, t != null && sn(e, !!n.multiple, t, !1);
    }
  }, Zo = yo, Jo = rn;
  var Kf = { usingClientEntryPoint: !1, Events: [ir, gn, Kr, Yo, Xo, yo] }, wr = { findFiberByHostInstance: Xt, bundleType: 0, version: "18.3.1", rendererPackageName: "react-dom" }, Gf = { bundleType: wr.bundleType, version: wr.version, rendererPackageName: wr.rendererPackageName, rendererConfig: wr.rendererConfig, overrideHookState: null, overrideHookStateDeletePath: null, overrideHookStateRenamePath: null, overrideProps: null, overridePropsDeletePath: null, overridePropsRenamePath: null, setErrorHandler: null, setSuspenseHandler: null, scheduleUpdate: null, currentDispatcherRef: ae.ReactCurrentDispatcher, findHostInstanceByFiber: function(e) {
    return e = tu(e), e === null ? null : e.stateNode;
  }, findFiberByHostInstance: wr.findFiberByHostInstance || $f, findHostInstancesForRefresh: null, scheduleRefresh: null, scheduleRoot: null, setRefreshHandler: null, getCurrentFiber: null, reconcilerVersion: "18.3.1-next-f1338f8080-20240426" };
  if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
    var Ll = __REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!Ll.isDisabled && Ll.supportsFiber) try {
      Tr = Ll.inject(Gf), vt = Ll;
    } catch {
    }
  }
  return Je.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = Kf, Je.createPortal = function(e, t) {
    var n = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
    if (!No(t)) throw Error(c(200));
    return Wf(e, t, null, n);
  }, Je.createRoot = function(e, t) {
    if (!No(e)) throw Error(c(299));
    var n = !1, r = "", l = Pa;
    return t != null && (t.unstable_strictMode === !0 && (n = !0), t.identifierPrefix !== void 0 && (r = t.identifierPrefix), t.onRecoverableError !== void 0 && (l = t.onRecoverableError)), t = Eo(e, 1, !1, null, null, n, !1, r, l), e[St] = t.current, nr(e.nodeType === 8 ? e.parentNode : e), new _o(t);
  }, Je.findDOMNode = function(e) {
    if (e == null) return null;
    if (e.nodeType === 1) return e;
    var t = e._reactInternals;
    if (t === void 0)
      throw typeof e.render == "function" ? Error(c(188)) : (e = Object.keys(e).join(","), Error(c(268, e)));
    return e = tu(t), e = e === null ? null : e.stateNode, e;
  }, Je.flushSync = function(e) {
    return rn(e);
  }, Je.hydrate = function(e, t, n) {
    if (!Pl(t)) throw Error(c(200));
    return zl(null, e, t, !0, n);
  }, Je.hydrateRoot = function(e, t, n) {
    if (!No(e)) throw Error(c(405));
    var r = n != null && n.hydratedSources || null, l = !1, i = "", o = Pa;
    if (n != null && (n.unstable_strictMode === !0 && (l = !0), n.identifierPrefix !== void 0 && (i = n.identifierPrefix), n.onRecoverableError !== void 0 && (o = n.onRecoverableError)), t = Na(t, null, e, 1, n ?? null, l, !1, i, o), e[St] = t.current, nr(e), r) for (e = 0; e < r.length; e++) n = r[e], l = n._getVersion, l = l(n._source), t.mutableSourceEagerHydrationData == null ? t.mutableSourceEagerHydrationData = [n, l] : t.mutableSourceEagerHydrationData.push(
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
  }, Je.unstable_batchedUpdates = yo, Je.unstable_renderSubtreeIntoContainer = function(e, t, n, r) {
    if (!Pl(n)) throw Error(c(200));
    if (e == null || e._reactInternals === void 0) throw Error(c(38));
    return zl(e, t, n, !1, r);
  }, Je.version = "18.3.1-next-f1338f8080-20240426", Je;
}
var Fa;
function rd() {
  if (Fa) return zo.exports;
  Fa = 1;
  function m() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(m);
      } catch (k) {
        console.error(k);
      }
  }
  return m(), zo.exports = nd(), zo.exports;
}
var Ua;
function ld() {
  if (Ua) return jl;
  Ua = 1;
  var m = rd();
  return jl.createRoot = m.createRoot, jl.hydrateRoot = m.hydrateRoot, jl;
}
var id = ld();
function $a(m) {
  var k, c, x = "";
  if (typeof m == "string" || typeof m == "number") x += m;
  else if (typeof m == "object") if (Array.isArray(m)) {
    var _ = m.length;
    for (k = 0; k < _; k++) m[k] && (c = $a(m[k])) && (x && (x += " "), x += c);
  } else for (c in m) m[c] && (x && (x += " "), x += c);
  return x;
}
function Oo() {
  for (var m, k, c = 0, x = "", _ = arguments.length; c < _; c++) (m = arguments[c]) && (k = $a(m)) && (x && (x += " "), x += k);
  return x;
}
const od = { DEV: !1, MODE: "production" }, Qa = typeof import.meta < "u" ? od : void 0, ud = !!Qa?.DEV, sd = typeof navigator < "u" && /(jsdom|happy-dom)/i.test(navigator.userAgent) || typeof globalThis.happyDOM == "object", Ka = Qa?.MODE === "test" || sd, ad = typeof window < "u", Ga = typeof document < "u", cd = ad && Ga, fd = (m) => {
  const k = m.currentTarget;
  if (!(k instanceof HTMLElement))
    return;
  const c = k.offsetWidth;
  let x = 0.985;
  c <= 80 ? x = 0.96 : c <= 150 ? x = 0.97 : c <= 220 ? x = 0.98 : c > 600 && (x = 0.995), k.style.setProperty("--scale", x.toString());
}, Aa = (m, k) => {
  const c = () => {
    const W = setTimeout(m);
    return () => {
      clearTimeout(W);
    };
  };
  if (!cd || typeof window.requestAnimationFrame != "function" || Ga && document.visibilityState === "hidden")
    return c();
  let _ = 2, F = window.requestAnimationFrame(function W() {
    _ -= 1, _ === 0 ? m() : F = window.requestAnimationFrame(W);
  });
  return () => {
    typeof window.cancelAnimationFrame == "function" && window.cancelAnimationFrame(F);
  };
}, dd = (m) => Object.keys(m).reduce((c, x) => {
  const _ = m[x];
  if (_ || _ === 0) {
    const F = x.startsWith("--") ? "" : "--", W = typeof _ == "number" ? `${_}px` : _;
    c[`${F}${x}`] = W;
  }
  return c;
}, {}), pd = (m) => {
  const k = Z.Children.toArray(m), c = [];
  let x = "";
  const _ = () => {
    x !== "" && (c.push(x), x = "");
  };
  for (const F of k)
    if (!(F == null || typeof F == "boolean")) {
      if (typeof F == "string" || typeof F == "number") {
        x += String(F);
        continue;
      }
      _(), c.push(F);
    }
  return _(), c;
}, Ya = (m) => {
  const k = pd(m), c = Z.Children.count(k);
  return Z.Children.map(k, (x) => {
    if (typeof x == "string" && x.trim())
      return c <= 1 ? x : R.jsx("span", { children: x });
    if (Z.isValidElement(x)) {
      const _ = x, { children: F, ...W } = _.props;
      return F != null ? Z.cloneElement(_, W, Ya(F)) : _;
    }
    return x;
  });
};
Z.createContext(null);
var jo, Va;
function md() {
  if (Va) return jo;
  Va = 1;
  var m = "Expected a function", k = NaN, c = "[object Symbol]", x = /^\s+|\s+$/g, _ = /^[-+]0x[0-9a-f]+$/i, F = /^0b[01]+$/i, W = /^0o[0-7]+$/i, q = parseInt, U = typeof Rl == "object" && Rl && Rl.Object === Object && Rl, J = typeof self == "object" && self && self.Object === Object && self, le = U || J || Function("return this")(), K = Object.prototype, $ = K.toString, ie = Math.max, fe = Math.min, A = function() {
    return le.Date.now();
  };
  function H(j, O, te) {
    var ue, Ee, ge, je, we, _e, De = 0, qe = !1, Pe = !1, pe = !0;
    if (typeof j != "function")
      throw new TypeError(m);
    O = ae(O) || 0, he(te) && (qe = !!te.leading, Pe = "maxWait" in te, ge = Pe ? ie(ae(te.maxWait) || 0, O) : ge, pe = "trailing" in te ? !!te.trailing : pe);
    function E(B) {
      var Y = ue, oe = Ee;
      return ue = Ee = void 0, De = B, je = j.apply(oe, Y), je;
    }
    function D(B) {
      return De = B, we = setTimeout(v, O), qe ? E(B) : je;
    }
    function N(B) {
      var Y = B - _e, oe = B - De, Ae = O - Y;
      return Pe ? fe(Ae, ge - oe) : Ae;
    }
    function f(B) {
      var Y = B - _e, oe = B - De;
      return _e === void 0 || Y >= O || Y < 0 || Pe && oe >= ge;
    }
    function v() {
      var B = A();
      if (f(B))
        return Q(B);
      we = setTimeout(v, N(B));
    }
    function Q(B) {
      return we = void 0, pe && ue ? E(B) : (ue = Ee = void 0, je);
    }
    function G() {
      we !== void 0 && clearTimeout(we), De = 0, ue = _e = Ee = we = void 0;
    }
    function ee() {
      return we === void 0 ? je : Q(A());
    }
    function b() {
      var B = A(), Y = f(B);
      if (ue = arguments, Ee = this, _e = B, Y) {
        if (we === void 0)
          return D(_e);
        if (Pe)
          return we = setTimeout(v, O), E(_e);
      }
      return we === void 0 && (we = setTimeout(v, O)), je;
    }
    return b.cancel = G, b.flush = ee, b;
  }
  function he(j) {
    var O = typeof j;
    return !!j && (O == "object" || O == "function");
  }
  function de(j) {
    return !!j && typeof j == "object";
  }
  function ce(j) {
    return typeof j == "symbol" || de(j) && $.call(j) == c;
  }
  function ae(j) {
    if (typeof j == "number")
      return j;
    if (ce(j))
      return k;
    if (he(j)) {
      var O = typeof j.valueOf == "function" ? j.valueOf() : j;
      j = he(O) ? O + "" : O;
    }
    if (typeof j != "string")
      return j === 0 ? j : +j;
    j = j.replace(x, "");
    var te = F.test(j);
    return te || W.test(j) ? q(j.slice(2), te ? 2 : 8) : _.test(j) ? k : +j;
  }
  return jo = H, jo;
}
md();
var hd = typeof window < "u" ? Z.useLayoutEffect : Z.useEffect;
function vd(m, k) {
  const c = Z.useRef(m);
  hd(() => {
    c.current = m;
  }, [m]), Z.useEffect(() => {
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
const yd = "_LoadingIndicator_7yl6f_1", gd = {
  LoadingIndicator: yd
}, wd = ({ className: m, size: k, strokeWidth: c, style: x, ..._ }) => R.jsx("div", { ..._, className: Oo(gd.LoadingIndicator, m), style: x || dd({
  "indicator-size": k,
  "indicator-stroke": c
}) });
function kd(m) {
  return (k) => {
    m.forEach((c) => {
      typeof c == "function" ? c(k) : c != null && (c.current = k);
    });
  };
}
const Sd = () => Ka, Ba = (m, k = !1, c = "TransitionGroup") => {
  const x = [];
  return Z.Children.forEach(m, (_) => {
    if (_ && typeof _ == "object" && "key" in _ && _.key)
      x.push(_);
    else if (k)
      throw new Error(`Child elements of <${c} /> must include a \`key\``);
  }), x;
}, In = () => {
}, Mn = (m) => {
  const k = Z.useRef(m);
  return k.current = m, Z.useCallback((c) => k.current(c), []);
};
function xd(m, k, c, x) {
  const _ = m.reduce((U, J) => ({ ...U, [J.key]: 1 }), {}), F = k.reduce((U, J) => ({ ...U, [J.component.key]: 1 }), {}), W = m.filter((U) => !F[U.key]).map(c), q = k.map((U) => ({
    ...U,
    component: m.find(({ key: J }) => J === U.component.key) || U.component,
    shouldRender: !!_[U.component.key]
  }));
  return x === "append" ? q.concat(W) : W.concat(q);
}
function Ed(m, k, c) {
  if ((Ka || ud) && k && c > 1)
    throw new Error(`Cannot use forwardRef with multiple children in <${m} />`);
}
const Cd = "_TransitionGroupChild_1hv1z_1", _d = {
  TransitionGroupChild: Cd
}, Xa = {
  enter: !1,
  enterActive: !1,
  exit: !1,
  exitActive: !1,
  interrupted: !1
}, Nd = (m) => ({
  ...Xa,
  enter: !m
}), Td = (m, k) => {
  switch (k.type) {
    case "enter-before":
      return {
        enter: !0,
        enterActive: !1,
        exit: !1,
        exitActive: !1,
        interrupted: m.interrupted || m.exit
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
        interrupted: m.interrupted || m.enter
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
      return Xa;
  }
}, Pd = ({ ref: m, as: k, children: c, className: x, transitionId: _, style: F, preventMountTransition: W, shouldRender: q, enterDuration: U, exitDuration: J, removeChild: le, onEnter: K, onEnterActive: $, onEnterComplete: ie, onExit: fe, onExitActive: A, onExitComplete: H }) => {
  const [he, de] = Z.useReducer(Td, Nd(W || !1)), ce = Z.useRef(!1), ae = Z.useRef(null), j = Z.useRef(U);
  j.current = U;
  const O = Z.useRef(J);
  O.current = J;
  const te = Z.useRef(null), ue = Z.useCallback((Ee) => {
    const ge = ae.current;
    if (!(!ge || Ee === te.current))
      switch (te.current = Ee, Ee) {
        case "enter":
          K(ge);
          break;
        case "enter-active":
          $(ge);
          break;
        case "enter-complete":
          ie(ge);
          break;
        case "exit":
          fe(ge);
          break;
        case "exit-active":
          A(ge);
          break;
        case "exit-complete":
          H(ge);
          break;
      }
  }, [K, $, ie, fe, A, H]);
  return bf.useLayoutEffect(() => {
    if (!q) {
      let je;
      de({ type: "exit-before" }), ue("exit");
      const we = Aa(() => {
        de({ type: "exit-active" }), ue("exit-active"), je = window.setTimeout(() => {
          ue("exit-complete"), le();
        }, O.current);
      });
      return () => {
        we(), je !== void 0 && clearTimeout(je);
      };
    }
    if (W && !ce.current) {
      ce.current = !0;
      return;
    }
    let Ee;
    de({ type: "enter-before" }), ue("enter");
    const ge = Aa(() => {
      de({ type: "enter-active" }), ue("enter-active"), Ee = window.setTimeout(() => {
        de({ type: "done" }), ue("enter-complete");
      }, j.current);
    });
    return () => {
      ge(), Ee !== void 0 && clearTimeout(Ee);
    };
  }, [
    q,
    // This value is immutable after <TransitionGroup> is created, and does not change on re-renders.
    W,
    le,
    ue
  ]), Z.useEffect(() => () => {
    ce.current = !1;
  }, []), R.jsx(k, { ref: kd([ae, m]), className: Oo(x, _d.TransitionGroupChild), "data-transition-id": _, style: F, "data-entering": he.enter ? "" : void 0, "data-entering-active": he.enterActive ? "" : void 0, "data-exiting": he.exit ? "" : void 0, "data-exiting-active": he.exitActive ? "" : void 0, "data-interrupted": he.interrupted ? "" : void 0, children: c });
}, zd = (m) => {
  const { enterMountDelay: k, preventMountTransition: c } = m, x = !c && k != null ? k : null, [_, F] = Z.useState(x == null);
  return vd(() => F(!0), _ ? null : x), _ ? R.jsx(Pd, { ...m }) : null;
}, Ld = (m) => {
  const { ref: k, as: c = "span", children: x, className: _, transitionId: F, style: W, enterDuration: q = 0, exitDuration: U = 0, preventInitialTransition: J = !0, enterMountDelay: le, insertMethod: K = "append", disableAnimations: $ = Sd() } = m, ie = Mn(m.onEnter ?? In), fe = Mn(m.onEnterActive ?? In), A = Mn(m.onEnterComplete ?? In), H = Mn(m.onExit ?? In), he = Mn(m.onExitActive ?? In), de = Mn(m.onExitComplete ?? In);
  Z.Children.forEach(x, (O) => {
    if (O && !O.key)
      throw new Error("Child elements of <TransitionGroup /> must include a `key`");
  });
  const ce = Z.useCallback((O) => ({
    component: O,
    shouldRender: !0,
    removeChild: () => {
      j((te) => te.filter((ue) => O.key !== ue.component.key));
    },
    onEnter: ie,
    onEnterActive: fe,
    onEnterComplete: A,
    onExit: H,
    onExitActive: he,
    onExitComplete: de
  }), [ie, fe, A, H, he, de]), [ae, j] = Z.useState(() => Ba(x).map((O) => ({
    ...ce(O),
    // Lock this value to whatever the value was on initial render of the TransitionGroup.
    // It doesn't make sense to change this once it is mounted.
    preventMountTransition: J
  })));
  return Z.useLayoutEffect(() => {
    j((O) => {
      const te = Ba(x);
      return xd(te, O, ce, K);
    });
  }, [x, K, ce]), Ed("TransitionGroup", k, Z.Children.count(x)), $ ? R.jsx(R.Fragment, { children: Z.Children.map(x, (O) => R.jsx(
    c,
    {
      // @ts-expect-error -- TS is not happy about this forwardedRef, but it's fine.
      ref: k,
      className: _,
      style: W,
      "data-transition-id": F,
      children: O
    }
  )) }) : R.jsx(R.Fragment, { children: ae.map(({ component: O, ...te }) => R.jsx(zd, { ...te, as: c, className: _, transitionId: F, enterDuration: q, exitDuration: U, enterMountDelay: le, style: W, ref: k, children: O }, O.key)) });
}, Rd = "_Button_1864l_1", jd = "_ButtonInner_1864l_4", Id = "_ButtonLoader_1864l_749", Io = {
  Button: Rd,
  ButtonInner: jd,
  ButtonLoader: Id
}, Za = (m) => {
  const {
    type: k = "button",
    color: c = "primary",
    variant: x = "solid",
    pill: _ = !0,
    uniform: F = !1,
    size: W = "md",
    iconSize: q,
    gutterSize: U,
    loading: J,
    selected: le,
    block: K,
    opticallyAlign: $,
    children: ie,
    className: fe,
    onClick: A,
    disabled: H,
    disabledTone: he,
    // Defaults to `loading` state
    inert: de = J,
    ...ce
  } = m, ae = H || de, j = Z.useCallback((O) => {
    H || A?.(O);
  }, [A, H]);
  return R.jsxs("button", {
    type: k,
    className: Oo(Io.Button, fe),
    "data-color": c,
    "data-variant": x,
    "data-pill": _ ? "" : void 0,
    "data-uniform": F ? "" : void 0,
    "data-size": W,
    "data-gutter-size": U,
    "data-icon-size": q,
    "data-loading": J ? "" : void 0,
    "data-selected": le ? "" : void 0,
    "data-block": K ? "" : void 0,
    "data-optically-align": $,
    onPointerEnter: fd,
    // Non-visual, accessible disablement
    // NOTE: Do not use literal `inert` because that is incorrect semantically
    disabled: ae,
    "aria-disabled": ae,
    tabIndex: ae ? -1 : void 0,
    "data-disabled": H ? "" : void 0,
    "data-disabled-tone": H ? he : void 0,
    onClick: j,
    ...ce,
    children: [R.jsx(Ld, { className: Io.ButtonLoader, enterDuration: 250, exitDuration: 150, children: J && R.jsx(wd, {}, "loader") }), R.jsx("span", { className: Io.ButtonInner, children: Ya(ie) })]
  });
}, Ja = (m) => R.jsx("svg", { width: "1em", height: "1em", viewBox: "0 0 24 24", fill: "currentColor", ...m, children: R.jsx("path", { d: "M3 6C3 4.34315 4.34315 3 6 3H12C13.6569 3 15 4.34315 15 6V7H18C19.6569 7 21 8.34315 21 10V19H22C22.5523 19 23 19.4477 23 20C23 20.5523 22.5523 21 22 21H2C1.44772 21 1 20.5523 1 20C1 19.4477 1.44772 19 2 19H3V6ZM5 19H8V17C8 16.4477 8.44772 16 9 16C9.55228 16 10 16.4477 10 17V19H13V6C13 5.44772 12.5523 5 12 5H6C5.44772 5 5 5.44772 5 6V19ZM15 19H19V10C19 9.44772 18.5523 9 18 9H15V19Z", fill: "currentColor" }) }), Md = (m) => R.jsx("svg", { width: "1em", height: "1em", viewBox: "0 0 24 24", fill: "currentColor", ...m, children: R.jsx("path", { fillRule: "evenodd", d: "M18.063 5.674a1 1 0 0 1 .263 1.39l-7.5 11a1 1 0 0 1-1.533.143l-4.5-4.5a1 1 0 1 1 1.414-1.414l3.647 3.647 6.82-10.003a1 1 0 0 1 1.39-.263Z", clipRule: "evenodd" }) }), Od = (m) => R.jsx("svg", { width: "1em", height: "1em", viewBox: "0 0 24 24", fill: "currentColor", ...m, children: R.jsx("path", { fillRule: "evenodd", d: "M12 5a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H6a1 1 0 1 1 0-2h5V6a1 1 0 0 1 1-1Z", clipRule: "evenodd" }) });
function Ha() {
  const m = window.openai ?? {};
  return {
    toolInput: m.toolInput ?? null,
    toolOutput: m.toolOutput ?? null
  };
}
function Dd({
  logo: m,
  companyName: k
}) {
  const [c, x] = Z.useState(!1);
  return !m || c ? /* @__PURE__ */ R.jsx("div", { className: "w-full h-full bg-[var(--color-background-primary-soft-alpha)] flex items-center justify-center overflow-hidden", children: /* @__PURE__ */ R.jsx(Ja, { className: "w-6 h-6 text-tertiary" }) }) : /* @__PURE__ */ R.jsx("div", { className: "w-full h-full bg-[var(--color-surface-primary)]", children: /* @__PURE__ */ R.jsx(
    "img",
    {
      src: m,
      alt: "",
      className: "w-full h-full object-cover",
      onError: () => x(!0)
    }
  ) });
}
function Fd({ company: m }) {
  const k = m.organization || m.domain || "Unknown Company", c = m.emails_count?.total ?? 0, x = c > 0 ? `${c.toLocaleString()} email${c === 1 ? " address" : " addresses"}` : null, _ = m.domain ? `https://company-logo.hunter.io/${m.domain}` : void 0, [F, W] = Z.useState(!1), [q, U] = Z.useState(!!m.already_saved);
  async function J() {
    if (F || q || !m.domain) return;
    const le = window.openai;
    if (le?.callTool) {
      W(!0);
      try {
        await le.callTool("save", { domain: m.domain }), U(!0);
      } catch (K) {
        throw new Error(K instanceof Error ? K.message : String(K));
      } finally {
        W(!1);
      }
    }
  }
  return /* @__PURE__ */ R.jsxs("li", { className: "flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border-primary-soft-alt)] hover:bg-[var(--color-surface-secondary)] transition-colors", children: [
    /* @__PURE__ */ R.jsx("div", { className: "flex-shrink-0 w-[44px] h-[44px] flex items-center justify-center rounded-lg overflow-hidden outline outline-[1.5px] outline-solid outline-[var(--color-border-primary-soft-alt)] -outline-offset-[1.5px]", children: /* @__PURE__ */ R.jsx(Dd, { logo: _, companyName: k }) }),
    /* @__PURE__ */ R.jsxs("div", { className: "flex-1 min-w-0", children: [
      /* @__PURE__ */ R.jsxs("span", { className: "flex items-center", children: [
        /* @__PURE__ */ R.jsx("span", { className: "text text-primary", children: k }),
        m.hiring && /* @__PURE__ */ R.jsx("span", { className: "text-secondary", children: " · Hiring" })
      ] }),
      (x || m.industry || m.location) && /* @__PURE__ */ R.jsxs("span", { className: "text-sm text-secondary flex items-center gap-1 block", children: [
        x && /* @__PURE__ */ R.jsx("span", { className: "whitespace-nowrap", children: x }),
        x && m.industry && /* @__PURE__ */ R.jsx("span", { className: "whitespace-nowrap", "aria-hidden": "true", children: "·" }),
        m.industry && /* @__PURE__ */ R.jsx("span", { className: "truncate", children: m.industry }),
        (x || m.industry) && m.location && /* @__PURE__ */ R.jsx("span", { className: "whitespace-nowrap", "aria-hidden": "true", children: "·" }),
        m.location && /* @__PURE__ */ R.jsx("span", { className: "whitespace-nowrap", children: m.location })
      ] })
    ] }),
    /* @__PURE__ */ R.jsx(
      Za,
      {
        size: "md",
        variant: "soft",
        color: "secondary",
        uniform: !0,
        className: "ml-2",
        loading: F,
        inert: q,
        onClick: J,
        "aria-label": `Add ${k} to saved companies`,
        children: q ? /* @__PURE__ */ R.jsx(Md, {}) : /* @__PURE__ */ R.jsx(Od, {})
      }
    )
  ] });
}
function Ud({ logos: m }) {
  return /* @__PURE__ */ R.jsx("div", { className: "relative w-[44px] h-[44px]", "aria-hidden": "true", children: [
    // Top (on front)
    { index: 0, dx: -6, dy: -6, zClass: "z-10" },
    // Bottom (behind)
    { index: 1, dx: 6, dy: 6, zClass: "z-0" }
  ].map((k) => {
    const c = m[k.index], x = !!c, _ = x ? "bg-[var(--color-text-primary-solid)]" : "bg-[var(--color-background-primary-soft)]";
    return /* @__PURE__ */ R.jsx(
      "div",
      {
        className: `absolute top-1/2 left-1/2 w-[32px] h-[32px] rounded-md overflow-hidden border border-white outline outline-[1.5px] outline-solid outline-[var(--color-border-primary-soft-alt)] -outline-offset-[1.5px] flex items-center justify-center ${_} ${k.zClass}`,
        style: {
          transform: `translate(calc(-50% ${k.dx >= 0 ? "+" : "-"} ${Math.abs(
            k.dx
          )}px), calc(-50% ${k.dy >= 0 ? "+" : "-"} ${Math.abs(k.dy)}px))`
        },
        children: x ? /* @__PURE__ */ R.jsx(
          "img",
          {
            src: c,
            alt: "",
            className: "w-full h-full object-cover"
          }
        ) : /* @__PURE__ */ R.jsx(Ja, { className: "w-6 h-6 text-tertiary" })
      },
      k.index
    );
  }) });
}
function Ad() {
  const [m, k] = Z.useState(Ha), [c, x] = Z.useState([]);
  Z.useEffect(() => {
    function $() {
      k(Ha());
    }
    return window.addEventListener("openai:set_globals", $), () => {
      window.removeEventListener("openai:set_globals", $);
    };
  }, []);
  const _ = m.toolOutput, F = Array.isArray(_?.data) ? _.data : Array.isArray(_) ? _ : [], W = _?.meta?.results ?? F.length, q = _?.meta?.permalink;
  if (Z.useEffect(() => {
    const ie = F.slice(5, 15).filter((A) => !!A.domain).map((A) => `https://company-logo.hunter.io/${A.domain}`);
    (async () => {
      const A = [];
      for (const H of ie) {
        if (A.length >= 2) break;
        await new Promise((de) => {
          const ce = new Image();
          ce.onload = () => de(!0), ce.onerror = () => de(!1), ce.src = H;
        }) && A.push(H);
      }
      x(A);
    })();
  }, [F]), !m.toolOutput)
    return /* @__PURE__ */ R.jsx("span", { className: "text-sm text-secondary", role: "status", "aria-live": "polite", children: "Loading discover results..." });
  if (F.length === 0)
    return /* @__PURE__ */ R.jsx("span", { className: "text-sm text-secondary", role: "status", children: "No companies found." });
  const J = F.slice(0, 5), le = Math.max(0, W - J.length);
  function K() {
    const $ = q || "https://hunter.io/discover";
    let ie = $;
    try {
      const A = new URL($);
      A.searchParams.set("utm_source", "hunter-chatgpt"), ie = A.toString();
    } catch {
    }
    const fe = window.openai;
    fe?.openExternal ? fe.openExternal({ href: ie }) : window.open(ie, "_blank", "noopener,noreferrer");
  }
  return /* @__PURE__ */ R.jsxs("div", { className: "w-full rounded-2xl border border-[0.5px] border-[var(--color-border-primary-outline)] shadow-[var(--shadow-300)] p-4", children: [
    /* @__PURE__ */ R.jsx("div", { className: "mb-2", children: /* @__PURE__ */ R.jsxs("h2", { className: "text-lg font-medium text", children: [
      W.toLocaleString(),
      " ",
      W === 1 ? "company" : "companies",
      " match your filters"
    ] }) }),
    /* @__PURE__ */ R.jsx("ul", { className: "-mx-4 py-1 list-none", children: J.map(($, ie) => /* @__PURE__ */ R.jsx(Fd, { company: $ }, $.domain ?? ie)) }),
    le > 0 && /* @__PURE__ */ R.jsxs("footer", { className: "flex items-center justify-between pt-2", children: [
      /* @__PURE__ */ R.jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ R.jsx(Ud, { logos: c }),
        /* @__PURE__ */ R.jsxs("span", { className: "text-secondary", children: [
          "+ ",
          le.toLocaleString(),
          " more"
        ] })
      ] }),
      /* @__PURE__ */ R.jsx(
        Za,
        {
          color: "primary",
          size: "sm",
          variant: "outline",
          onClick: K,
          children: "Open in Hunter"
        }
      )
    ] })
  ] });
}
const Wa = document.getElementById("root");
Wa && id.createRoot(Wa).render(
  /* @__PURE__ */ R.jsx(Z.StrictMode, { children: /* @__PURE__ */ R.jsx(Ad, {}) })
);
