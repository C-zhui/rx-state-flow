"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useShareStateFlow = exports.getStateFlow = exports.useStateFlow = exports.emitMap = exports.select = exports.configIdSymbol = void 0;
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var react_1 = require("react");
var lodash_es_1 = require("lodash-es");
exports.configIdSymbol = Symbol.for("stateflow@tag");
var defaultConfig = {
    state: {},
    derivation: {},
    clearOnZeroRef: false,
    flows: [],
};
var createStateFlow = function (config, name) {
    if (config === void 0) { config = {}; }
    if (name === void 0) { name = ""; }
    config = lodash_es_1.defaults({}, config, defaultConfig);
    var initState = lodash_es_1.assign({}, config.state, config.derivation);
    var state$ = new rxjs_1.BehaviorSubject(initState);
    var stateAudit20$ = state$.pipe(operators_1.auditTime(20), operators_1.share());
    var setState = function (partialState) {
        var newState = lodash_es_1.assign({}, state$.value, lodash_es_1.isFunction(partialState) ? partialState(state$.value) : partialState);
        if (!lodash_es_1.isEqual(newState, state$.value))
            state$.next(newState);
    };
    var effect = {
        sub: null,
        begin: function () {
            if (!this.sub) {
                this.sub = rxjs_1.of.apply(void 0, (config.flows || [])).pipe(operators_1.mergeMap(function (r) { return r({ state$: stateAudit20$, setState: setState }); }), operators_1.catchError(function (e) {
                    console.error(e);
                    return rxjs_1.of(null);
                }))
                    .subscribe(lodash_es_1.noop);
            }
        },
        stop: function () {
            if (this.sub) {
                this.sub.unsubscribe();
                this.sub = null;
            }
        },
    };
    var refCount = 0;
    var getRefCount = function () { return refCount; };
    var connect = function () {
        if (refCount === 0) {
            effect.begin();
        }
        refCount++;
        return lodash_es_1.once(function () {
            refCount--;
            if (refCount) {
                effect.stop();
            }
        });
    };
    return {
        name: name,
        initState: initState,
        state$: stateAudit20$,
        setState: setState,
        getRefCount: getRefCount,
        connect: connect,
    };
};
// 操作符：用于选择一个观察值
exports.select = function (mapper, deep) {
    if (deep === void 0) { deep = true; }
    return function (source) {
        return source.pipe(operators_1.map(mapper || lodash_es_1.identity), operators_1.distinctUntilChanged(deep ? lodash_es_1.isEqual : lodash_es_1.eq));
    };
};
// 操作符：用于简化设置属性用的
exports.emitMap = function (mapper, receiver) {
    if (mapper === void 0) { mapper = lodash_es_1.identity; }
    if (receiver === void 0) { receiver = lodash_es_1.noop; }
    return function (source) {
        return source.pipe(operators_1.tap(function (a) { return receiver(mapper(a)); }));
    };
};
exports.useStateFlow = function (config) {
    var _a = react_1.useState(function () { return createStateFlow(config); })[0], state$ = _a.state$, connect = _a.connect, api = __rest(_a, ["state$", "connect"]);
    var _b = react_1.useState(api.initState), state = _b[0], setState = _b[1];
    react_1.useEffect(function () {
        var sub = state$.subscribe(setState);
        var disconnect = connect();
        return function () {
            sub.unsubscribe();
            disconnect();
        };
    }, []);
    return __assign({ state: state }, api);
};
exports.getStateFlow = lodash_es_1.memoize(createStateFlow, function (config, name) {
    if (!config[exports.configIdSymbol]) {
        config[exports.configIdSymbol] = ("" + Math.random()).slice(2);
    }
    return config[exports.configIdSymbol] + ("#" + name);
});
exports.useShareStateFlow = function (config, name) {
    if (config === void 0) { config = {}; }
    if (name === void 0) { name = ""; }
    var _a = react_1.useState(function () {
        return exports.getStateFlow(config, name);
    })[0], state$ = _a.state$, connect = _a.connect, api = __rest(_a, ["state$", "connect"]);
    var _b = react_1.useState(api.initState), state = _b[0], setState = _b[1];
    react_1.useEffect(function () {
        var sub = state$.subscribe(setState);
        var disconnect = connect();
        return function () {
            sub.unsubscribe();
            disconnect();
            if (config.clearOnZeroRef && api.getRefCount() === 0) {
                exports.getStateFlow.cache.delete(config[exports.configIdSymbol] + ("#" + name));
            }
        };
    }, []);
    return __assign({ state: state }, api);
};
