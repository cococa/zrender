(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = global || self, factory(global.zrender = {}));
}(this, (function (exports) { 'use strict';

    class Browser {
        constructor() {
            this.firefox = false;
            this.ie = false;
            this.edge = false;
            this.newEdge = false;
            this.weChat = false;
        }
    }
    class Env {
        constructor() {
            this.browser = new Browser();
            this.node = false;
            this.wxa = false;
            this.worker = false;
            this.svgSupported = false;
            this.touchEventsSupported = false;
            this.pointerEventsSupported = false;
            this.domSupported = false;
            this.transformSupported = false;
            this.transform3dSupported = false;
            this.hasGlobalWindow = typeof window !== 'undefined';
        }
    }
    const env = new Env();
    if (typeof wx === 'object' && typeof wx.getSystemInfoSync === 'function') {
        env.wxa = true;
        env.touchEventsSupported = true;
    }
    else if (typeof document === 'undefined' && typeof self !== 'undefined') {
        env.worker = true;
    }
    else if (!env.hasGlobalWindow || 'Deno' in window) {
        env.node = true;
        env.svgSupported = true;
    }
    else {
        detect(navigator.userAgent, env);
    }
    function detect(ua, env) {
        const browser = env.browser;
        const firefox = ua.match(/Firefox\/([\d.]+)/);
        const ie = ua.match(/MSIE\s([\d.]+)/)
            || ua.match(/Trident\/.+?rv:(([\d.]+))/);
        const edge = ua.match(/Edge?\/([\d.]+)/);
        const weChat = (/micromessenger/i).test(ua);
        if (firefox) {
            browser.firefox = true;
            browser.version = firefox[1];
        }
        if (ie) {
            browser.ie = true;
            browser.version = ie[1];
        }
        if (edge) {
            browser.edge = true;
            browser.version = edge[1];
            browser.newEdge = +edge[1].split('.')[0] > 18;
        }
        if (weChat) {
            browser.weChat = true;
        }
        env.svgSupported = typeof SVGRect !== 'undefined';
        env.touchEventsSupported = 'ontouchstart' in window && !browser.ie && !browser.edge;
        env.pointerEventsSupported = 'onpointerdown' in window
            && (browser.edge || (browser.ie && +browser.version >= 11));
        env.domSupported = typeof document !== 'undefined';
        const style = document.documentElement.style;
        env.transform3dSupported = ((browser.ie && 'transition' in style)
            || browser.edge
            || (('WebKitCSSMatrix' in window) && ('m11' in new WebKitCSSMatrix()))
            || 'MozPerspective' in style)
            && !('OTransition' in style);
        env.transformSupported = env.transform3dSupported
            || (browser.ie && +browser.version >= 9);
    }

    const DEFAULT_FONT_SIZE = 12;
    const DEFAULT_FONT_FAMILY = 'sans-serif';
    const DEFAULT_FONT = `${DEFAULT_FONT_SIZE}px ${DEFAULT_FONT_FAMILY}`;
    const OFFSET = 20;
    const SCALE = 100;
    const defaultWidthMapStr = `007LLmW'55;N0500LLLLLLLLLL00NNNLzWW\\\\WQb\\0FWLg\\bWb\\WQ\\WrWWQ000CL5LLFLL0LL**F*gLLLL5F0LF\\FFF5.5N`;
    function getTextWidthMap(mapStr) {
        const map = {};
        if (typeof JSON === 'undefined') {
            return map;
        }
        for (let i = 0; i < mapStr.length; i++) {
            const char = String.fromCharCode(i + 32);
            const size = (mapStr.charCodeAt(i) - OFFSET) / SCALE;
            map[char] = size;
        }
        return map;
    }
    const DEFAULT_TEXT_WIDTH_MAP = getTextWidthMap(defaultWidthMapStr);
    const platformApi = {
        createCanvas() {
            return typeof document !== 'undefined'
                && document.createElement('canvas');
        },
        measureText: (function () {
            let _ctx;
            let _cachedFont;
            return (text, font) => {
                if (!_ctx) {
                    const canvas = platformApi.createCanvas();
                    _ctx = canvas && canvas.getContext('2d');
                }
                if (_ctx) {
                    if (_cachedFont !== font) {
                        _cachedFont = _ctx.font = font || DEFAULT_FONT;
                    }
                    return _ctx.measureText(text);
                }
                else {
                    text = text || '';
                    font = font || DEFAULT_FONT;
                    const res = /((?:\d+)?\.?\d*)px/.exec(font);
                    const fontSize = res && +res[1] || DEFAULT_FONT_SIZE;
                    let width = 0;
                    if (font.indexOf('mono') >= 0) {
                        width = fontSize * text.length;
                    }
                    else {
                        for (let i = 0; i < text.length; i++) {
                            const preCalcWidth = DEFAULT_TEXT_WIDTH_MAP[text[i]];
                            width += preCalcWidth == null ? fontSize : (preCalcWidth * fontSize);
                        }
                    }
                    return { width };
                }
            };
        })(),
        loadImage(src, onload, onerror) {
            const image = new Image();
            image.onload = onload;
            image.onerror = onerror;
            image.src = src;
            return image;
        }
    };
    function setPlatformAPI(newPlatformApis) {
        for (let key in platformApi) {
            if (newPlatformApis[key]) {
                platformApi[key] = newPlatformApis[key];
            }
        }
    }

    const BUILTIN_OBJECT = reduce([
        'Function',
        'RegExp',
        'Date',
        'Error',
        'CanvasGradient',
        'CanvasPattern',
        'Image',
        'Canvas'
    ], (obj, val) => {
        obj['[object ' + val + ']'] = true;
        return obj;
    }, {});
    const TYPED_ARRAY = reduce([
        'Int8',
        'Uint8',
        'Uint8Clamped',
        'Int16',
        'Uint16',
        'Int32',
        'Uint32',
        'Float32',
        'Float64'
    ], (obj, val) => {
        obj['[object ' + val + 'Array]'] = true;
        return obj;
    }, {});
    const objToString = Object.prototype.toString;
    const arrayProto = Array.prototype;
    const nativeForEach = arrayProto.forEach;
    const nativeFilter = arrayProto.filter;
    const nativeSlice = arrayProto.slice;
    const nativeMap = arrayProto.map;
    const ctorFunction = function () { }.constructor;
    const protoFunction = ctorFunction ? ctorFunction.prototype : null;
    const protoKey = '__proto__';
    let idStart = 0x0907;
    function guid() {
        return idStart++;
    }
    function logError(...args) {
        if (typeof console !== 'undefined') {
            console.error.apply(console, args);
        }
    }
    function clone(source) {
        if (source == null || typeof source !== 'object') {
            return source;
        }
        let result = source;
        const typeStr = objToString.call(source);
        if (typeStr === '[object Array]') {
            if (!isPrimitive(source)) {
                result = [];
                for (let i = 0, len = source.length; i < len; i++) {
                    result[i] = clone(source[i]);
                }
            }
        }
        else if (TYPED_ARRAY[typeStr]) {
            if (!isPrimitive(source)) {
                const Ctor = source.constructor;
                if (Ctor.from) {
                    result = Ctor.from(source);
                }
                else {
                    result = new Ctor(source.length);
                    for (let i = 0, len = source.length; i < len; i++) {
                        result[i] = source[i];
                    }
                }
            }
        }
        else if (!BUILTIN_OBJECT[typeStr] && !isPrimitive(source) && !isDom(source)) {
            result = {};
            for (let key in source) {
                if (source.hasOwnProperty(key) && key !== protoKey) {
                    result[key] = clone(source[key]);
                }
            }
        }
        return result;
    }
    function merge(target, source, overwrite) {
        if (!isObject(source) || !isObject(target)) {
            return overwrite ? clone(source) : target;
        }
        for (let key in source) {
            if (source.hasOwnProperty(key) && key !== protoKey) {
                const targetProp = target[key];
                const sourceProp = source[key];
                if (isObject(sourceProp)
                    && isObject(targetProp)
                    && !isArray(sourceProp)
                    && !isArray(targetProp)
                    && !isDom(sourceProp)
                    && !isDom(targetProp)
                    && !isBuiltInObject(sourceProp)
                    && !isBuiltInObject(targetProp)
                    && !isPrimitive(sourceProp)
                    && !isPrimitive(targetProp)) {
                    merge(targetProp, sourceProp, overwrite);
                }
                else if (overwrite || !(key in target)) {
                    target[key] = clone(source[key]);
                }
            }
        }
        return target;
    }
    function mergeAll(targetAndSources, overwrite) {
        let result = targetAndSources[0];
        for (let i = 1, len = targetAndSources.length; i < len; i++) {
            result = merge(result, targetAndSources[i], overwrite);
        }
        return result;
    }
    function extend(target, source) {
        if (Object.assign) {
            Object.assign(target, source);
        }
        else {
            for (let key in source) {
                if (source.hasOwnProperty(key) && key !== protoKey) {
                    target[key] = source[key];
                }
            }
        }
        return target;
    }
    function defaults(target, source, overlay) {
        const keysArr = keys(source);
        for (let i = 0; i < keysArr.length; i++) {
            let key = keysArr[i];
            if ((overlay ? source[key] != null : target[key] == null)) {
                target[key] = source[key];
            }
        }
        return target;
    }
    const createCanvas = platformApi.createCanvas;
    function indexOf(array, value) {
        if (array) {
            if (array.indexOf) {
                return array.indexOf(value);
            }
            for (let i = 0, len = array.length; i < len; i++) {
                if (array[i] === value) {
                    return i;
                }
            }
        }
        return -1;
    }
    function inherits(clazz, baseClazz) {
        const clazzPrototype = clazz.prototype;
        function F() { }
        F.prototype = baseClazz.prototype;
        clazz.prototype = new F();
        for (let prop in clazzPrototype) {
            if (clazzPrototype.hasOwnProperty(prop)) {
                clazz.prototype[prop] = clazzPrototype[prop];
            }
        }
        clazz.prototype.constructor = clazz;
        clazz.superClass = baseClazz;
    }
    function mixin(target, source, override) {
        target = 'prototype' in target ? target.prototype : target;
        source = 'prototype' in source ? source.prototype : source;
        if (Object.getOwnPropertyNames) {
            const keyList = Object.getOwnPropertyNames(source);
            for (let i = 0; i < keyList.length; i++) {
                const key = keyList[i];
                if (key !== 'constructor') {
                    if ((override ? source[key] != null : target[key] == null)) {
                        target[key] = source[key];
                    }
                }
            }
        }
        else {
            defaults(target, source, override);
        }
    }
    function isArrayLike(data) {
        if (!data) {
            return false;
        }
        if (typeof data === 'string') {
            return false;
        }
        return typeof data.length === 'number';
    }
    function each(arr, cb, context) {
        if (!(arr && cb)) {
            return;
        }
        if (arr.forEach && arr.forEach === nativeForEach) {
            arr.forEach(cb, context);
        }
        else if (arr.length === +arr.length) {
            for (let i = 0, len = arr.length; i < len; i++) {
                cb.call(context, arr[i], i, arr);
            }
        }
        else {
            for (let key in arr) {
                if (arr.hasOwnProperty(key)) {
                    cb.call(context, arr[key], key, arr);
                }
            }
        }
    }
    function map(arr, cb, context) {
        if (!arr) {
            return [];
        }
        if (!cb) {
            return slice(arr);
        }
        if (arr.map && arr.map === nativeMap) {
            return arr.map(cb, context);
        }
        else {
            const result = [];
            for (let i = 0, len = arr.length; i < len; i++) {
                result.push(cb.call(context, arr[i], i, arr));
            }
            return result;
        }
    }
    function reduce(arr, cb, memo, context) {
        if (!(arr && cb)) {
            return;
        }
        for (let i = 0, len = arr.length; i < len; i++) {
            memo = cb.call(context, memo, arr[i], i, arr);
        }
        return memo;
    }
    function filter(arr, cb, context) {
        if (!arr) {
            return [];
        }
        if (!cb) {
            return slice(arr);
        }
        if (arr.filter && arr.filter === nativeFilter) {
            return arr.filter(cb, context);
        }
        else {
            const result = [];
            for (let i = 0, len = arr.length; i < len; i++) {
                if (cb.call(context, arr[i], i, arr)) {
                    result.push(arr[i]);
                }
            }
            return result;
        }
    }
    function find(arr, cb, context) {
        if (!(arr && cb)) {
            return;
        }
        for (let i = 0, len = arr.length; i < len; i++) {
            if (cb.call(context, arr[i], i, arr)) {
                return arr[i];
            }
        }
    }
    function keys(obj) {
        if (!obj) {
            return [];
        }
        if (Object.keys) {
            return Object.keys(obj);
        }
        let keyList = [];
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                keyList.push(key);
            }
        }
        return keyList;
    }
    function bindPolyfill(func, context, ...args) {
        return function () {
            return func.apply(context, args.concat(nativeSlice.call(arguments)));
        };
    }
    const bind = (protoFunction && isFunction(protoFunction.bind))
        ? protoFunction.call.bind(protoFunction.bind)
        : bindPolyfill;
    function curry(func, ...args) {
        return function () {
            return func.apply(this, args.concat(nativeSlice.call(arguments)));
        };
    }
    function isArray(value) {
        if (Array.isArray) {
            return Array.isArray(value);
        }
        return objToString.call(value) === '[object Array]';
    }
    function isFunction(value) {
        return typeof value === 'function';
    }
    function isString(value) {
        return typeof value === 'string';
    }
    function isStringSafe(value) {
        return objToString.call(value) === '[object String]';
    }
    function isNumber(value) {
        return typeof value === 'number';
    }
    function isObject(value) {
        const type = typeof value;
        return type === 'function' || (!!value && type === 'object');
    }
    function isBuiltInObject(value) {
        return !!BUILTIN_OBJECT[objToString.call(value)];
    }
    function isTypedArray(value) {
        return !!TYPED_ARRAY[objToString.call(value)];
    }
    function isDom(value) {
        return typeof value === 'object'
            && typeof value.nodeType === 'number'
            && typeof value.ownerDocument === 'object';
    }
    function isGradientObject(value) {
        return value.colorStops != null;
    }
    function isImagePatternObject(value) {
        return value.image != null;
    }
    function isRegExp(value) {
        return objToString.call(value) === '[object RegExp]';
    }
    function eqNaN(value) {
        return value !== value;
    }
    function retrieve(...args) {
        for (let i = 0, len = args.length; i < len; i++) {
            if (args[i] != null) {
                return args[i];
            }
        }
    }
    function retrieve2(value0, value1) {
        return value0 != null
            ? value0
            : value1;
    }
    function retrieve3(value0, value1, value2) {
        return value0 != null
            ? value0
            : value1 != null
                ? value1
                : value2;
    }
    function slice(arr, ...args) {
        return nativeSlice.apply(arr, args);
    }
    function normalizeCssArray(val) {
        if (typeof (val) === 'number') {
            return [val, val, val, val];
        }
        const len = val.length;
        if (len === 2) {
            return [val[0], val[1], val[0], val[1]];
        }
        else if (len === 3) {
            return [val[0], val[1], val[2], val[1]];
        }
        return val;
    }
    function assert(condition, message) {
        if (!condition) {
            throw new Error(message);
        }
    }
    function trim(str) {
        if (str == null) {
            return null;
        }
        else if (typeof str.trim === 'function') {
            return str.trim();
        }
        else {
            return str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
        }
    }
    const primitiveKey = '__ec_primitive__';
    function setAsPrimitive(obj) {
        obj[primitiveKey] = true;
    }
    function isPrimitive(obj) {
        return obj[primitiveKey];
    }
    class MapPolyfill {
        constructor() {
            this.data = {};
        }
        delete(key) {
            const existed = this.has(key);
            if (existed) {
                delete this.data[key];
            }
            return existed;
        }
        has(key) {
            return this.data.hasOwnProperty(key);
        }
        get(key) {
            return this.data[key];
        }
        set(key, value) {
            this.data[key] = value;
            return this;
        }
        keys() {
            return keys(this.data);
        }
        forEach(callback) {
            const data = this.data;
            for (const key in data) {
                if (data.hasOwnProperty(key)) {
                    callback(data[key], key);
                }
            }
        }
    }
    const isNativeMapSupported = typeof Map === 'function';
    function maybeNativeMap() {
        return (isNativeMapSupported ? new Map() : new MapPolyfill());
    }
    class HashMap {
        constructor(obj) {
            const isArr = isArray(obj);
            this.data = maybeNativeMap();
            const thisMap = this;
            (obj instanceof HashMap)
                ? obj.each(visit)
                : (obj && each(obj, visit));
            function visit(value, key) {
                isArr ? thisMap.set(value, key) : thisMap.set(key, value);
            }
        }
        hasKey(key) {
            return this.data.has(key);
        }
        get(key) {
            return this.data.get(key);
        }
        set(key, value) {
            this.data.set(key, value);
            return value;
        }
        each(cb, context) {
            this.data.forEach((value, key) => {
                cb.call(context, value, key);
            });
        }
        keys() {
            const keys = this.data.keys();
            return isNativeMapSupported
                ? Array.from(keys)
                : keys;
        }
        removeKey(key) {
            this.data.delete(key);
        }
    }
    function createHashMap(obj) {
        return new HashMap(obj);
    }
    function concatArray(a, b) {
        const newArray = new a.constructor(a.length + b.length);
        for (let i = 0; i < a.length; i++) {
            newArray[i] = a[i];
        }
        const offset = a.length;
        for (let i = 0; i < b.length; i++) {
            newArray[i + offset] = b[i];
        }
        return newArray;
    }
    function createObject(proto, properties) {
        let obj;
        if (Object.create) {
            obj = Object.create(proto);
        }
        else {
            const StyleCtor = function () { };
            StyleCtor.prototype = proto;
            obj = new StyleCtor();
        }
        if (properties) {
            extend(obj, properties);
        }
        return obj;
    }
    function disableUserSelect(dom) {
        const domStyle = dom.style;
        domStyle.webkitUserSelect = 'none';
        domStyle.userSelect = 'none';
        domStyle.webkitTapHighlightColor = 'rgba(0,0,0,0)';
        domStyle['-webkit-touch-callout'] = 'none';
    }
    function hasOwn(own, prop) {
        return own.hasOwnProperty(prop);
    }
    function noop() { }
    const RADIAN_TO_DEGREE = 180 / Math.PI;

    var util = /*#__PURE__*/Object.freeze({
        __proto__: null,
        guid: guid,
        logError: logError,
        clone: clone,
        merge: merge,
        mergeAll: mergeAll,
        extend: extend,
        defaults: defaults,
        createCanvas: createCanvas,
        indexOf: indexOf,
        inherits: inherits,
        mixin: mixin,
        isArrayLike: isArrayLike,
        each: each,
        map: map,
        reduce: reduce,
        filter: filter,
        find: find,
        keys: keys,
        bind: bind,
        curry: curry,
        isArray: isArray,
        isFunction: isFunction,
        isString: isString,
        isStringSafe: isStringSafe,
        isNumber: isNumber,
        isObject: isObject,
        isBuiltInObject: isBuiltInObject,
        isTypedArray: isTypedArray,
        isDom: isDom,
        isGradientObject: isGradientObject,
        isImagePatternObject: isImagePatternObject,
        isRegExp: isRegExp,
        eqNaN: eqNaN,
        retrieve: retrieve,
        retrieve2: retrieve2,
        retrieve3: retrieve3,
        slice: slice,
        normalizeCssArray: normalizeCssArray,
        assert: assert,
        trim: trim,
        setAsPrimitive: setAsPrimitive,
        isPrimitive: isPrimitive,
        HashMap: HashMap,
        createHashMap: createHashMap,
        concatArray: concatArray,
        createObject: createObject,
        disableUserSelect: disableUserSelect,
        hasOwn: hasOwn,
        noop: noop,
        RADIAN_TO_DEGREE: RADIAN_TO_DEGREE
    });

    function create(x, y) {
        if (x == null) {
            x = 0;
        }
        if (y == null) {
            y = 0;
        }
        return [x, y];
    }
    function copy(out, v) {
        out[0] = v[0];
        out[1] = v[1];
        return out;
    }
    function clone$1(v) {
        return [v[0], v[1]];
    }
    function set(out, a, b) {
        out[0] = a;
        out[1] = b;
        return out;
    }
    function add(out, v1, v2) {
        out[0] = v1[0] + v2[0];
        out[1] = v1[1] + v2[1];
        return out;
    }
    function scaleAndAdd(out, v1, v2, a) {
        out[0] = v1[0] + v2[0] * a;
        out[1] = v1[1] + v2[1] * a;
        return out;
    }
    function sub(out, v1, v2) {
        out[0] = v1[0] - v2[0];
        out[1] = v1[1] - v2[1];
        return out;
    }
    function len(v) {
        return Math.sqrt(lenSquare(v));
    }
    const length = len;
    function lenSquare(v) {
        return v[0] * v[0] + v[1] * v[1];
    }
    const lengthSquare = lenSquare;
    function mul(out, v1, v2) {
        out[0] = v1[0] * v2[0];
        out[1] = v1[1] * v2[1];
        return out;
    }
    function div(out, v1, v2) {
        out[0] = v1[0] / v2[0];
        out[1] = v1[1] / v2[1];
        return out;
    }
    function dot(v1, v2) {
        return v1[0] * v2[0] + v1[1] * v2[1];
    }
    function scale(out, v, s) {
        out[0] = v[0] * s;
        out[1] = v[1] * s;
        return out;
    }
    function normalize(out, v) {
        const d = len(v);
        if (d === 0) {
            out[0] = 0;
            out[1] = 0;
        }
        else {
            out[0] = v[0] / d;
            out[1] = v[1] / d;
        }
        return out;
    }
    function distance(v1, v2) {
        return Math.sqrt((v1[0] - v2[0]) * (v1[0] - v2[0])
            + (v1[1] - v2[1]) * (v1[1] - v2[1]));
    }
    const dist = distance;
    function distanceSquare(v1, v2) {
        return (v1[0] - v2[0]) * (v1[0] - v2[0])
            + (v1[1] - v2[1]) * (v1[1] - v2[1]);
    }
    const distSquare = distanceSquare;
    function negate(out, v) {
        out[0] = -v[0];
        out[1] = -v[1];
        return out;
    }
    function lerp(out, v1, v2, t) {
        out[0] = v1[0] + t * (v2[0] - v1[0]);
        out[1] = v1[1] + t * (v2[1] - v1[1]);
        return out;
    }
    function applyTransform(out, v, m) {
        const x = v[0];
        const y = v[1];
        out[0] = m[0] * x + m[2] * y + m[4];
        out[1] = m[1] * x + m[3] * y + m[5];
        return out;
    }
    function min(out, v1, v2) {
        out[0] = Math.min(v1[0], v2[0]);
        out[1] = Math.min(v1[1], v2[1]);
        return out;
    }
    function max(out, v1, v2) {
        out[0] = Math.max(v1[0], v2[0]);
        out[1] = Math.max(v1[1], v2[1]);
        return out;
    }

    var vector = /*#__PURE__*/Object.freeze({
        __proto__: null,
        create: create,
        copy: copy,
        clone: clone$1,
        set: set,
        add: add,
        scaleAndAdd: scaleAndAdd,
        sub: sub,
        len: len,
        length: length,
        lenSquare: lenSquare,
        lengthSquare: lengthSquare,
        mul: mul,
        div: div,
        dot: dot,
        scale: scale,
        normalize: normalize,
        distance: distance,
        dist: dist,
        distanceSquare: distanceSquare,
        distSquare: distSquare,
        negate: negate,
        lerp: lerp,
        applyTransform: applyTransform,
        min: min,
        max: max
    });

    class Param {
        constructor(target, e) {
            this.target = target;
            this.topTarget = e && e.topTarget;
        }
    }
    class Draggable {
        constructor(handler) {
            this.handler = handler;
            handler.on('mousedown', this._dragStart, this);
            handler.on('mousemove', this._drag, this);
            handler.on('mouseup', this._dragEnd, this);
        }
        _dragStart(e) {
            let draggingTarget = e.target;
            while (draggingTarget && !draggingTarget.draggable) {
                draggingTarget = draggingTarget.parent || draggingTarget.__hostTarget;
            }
            if (draggingTarget) {
                this._draggingTarget = draggingTarget;
                draggingTarget.dragging = true;
                this._x = e.offsetX;
                this._y = e.offsetY;
                this.handler.dispatchToElement(new Param(draggingTarget, e), 'dragstart', e.event);
            }
        }
        _drag(e) {
            const draggingTarget = this._draggingTarget;
            if (draggingTarget) {
                const x = e.offsetX;
                const y = e.offsetY;
                const dx = x - this._x;
                const dy = y - this._y;
                this._x = x;
                this._y = y;
                draggingTarget.drift(dx, dy, e);
                this.handler.dispatchToElement(new Param(draggingTarget, e), 'drag', e.event);
                const dropTarget = this.handler.findHover(x, y, draggingTarget).target;
                const lastDropTarget = this._dropTarget;
                this._dropTarget = dropTarget;
                if (draggingTarget !== dropTarget) {
                    if (lastDropTarget && dropTarget !== lastDropTarget) {
                        this.handler.dispatchToElement(new Param(lastDropTarget, e), 'dragleave', e.event);
                    }
                    if (dropTarget && dropTarget !== lastDropTarget) {
                        this.handler.dispatchToElement(new Param(dropTarget, e), 'dragenter', e.event);
                    }
                }
            }
        }
        _dragEnd(e) {
            const draggingTarget = this._draggingTarget;
            if (draggingTarget) {
                draggingTarget.dragging = false;
            }
            this.handler.dispatchToElement(new Param(draggingTarget, e), 'dragend', e.event);
            if (this._dropTarget) {
                this.handler.dispatchToElement(new Param(this._dropTarget, e), 'drop', e.event);
            }
            this._draggingTarget = null;
            this._dropTarget = null;
        }
    }

    class Eventful {
        constructor(eventProcessors) {
            if (eventProcessors) {
                this._$eventProcessor = eventProcessors;
            }
        }
        on(event, query, handler, context) {
            if (!this._$handlers) {
                this._$handlers = {};
            }
            const _h = this._$handlers;
            if (typeof query === 'function') {
                context = handler;
                handler = query;
                query = null;
            }
            if (!handler || !event) {
                return this;
            }
            const eventProcessor = this._$eventProcessor;
            if (query != null && eventProcessor && eventProcessor.normalizeQuery) {
                query = eventProcessor.normalizeQuery(query);
            }
            if (!_h[event]) {
                _h[event] = [];
            }
            for (let i = 0; i < _h[event].length; i++) {
                if (_h[event][i].h === handler) {
                    return this;
                }
            }
            const wrap = {
                h: handler,
                query: query,
                ctx: (context || this),
                callAtLast: handler.zrEventfulCallAtLast
            };
            const lastIndex = _h[event].length - 1;
            const lastWrap = _h[event][lastIndex];
            (lastWrap && lastWrap.callAtLast)
                ? _h[event].splice(lastIndex, 0, wrap)
                : _h[event].push(wrap);
            return this;
        }
        isSilent(eventName) {
            const _h = this._$handlers;
            return !_h || !_h[eventName] || !_h[eventName].length;
        }
        off(eventType, handler) {
            const _h = this._$handlers;
            if (!_h) {
                return this;
            }
            if (!eventType) {
                this._$handlers = {};
                return this;
            }
            if (handler) {
                if (_h[eventType]) {
                    const newList = [];
                    for (let i = 0, l = _h[eventType].length; i < l; i++) {
                        if (_h[eventType][i].h !== handler) {
                            newList.push(_h[eventType][i]);
                        }
                    }
                    _h[eventType] = newList;
                }
                if (_h[eventType] && _h[eventType].length === 0) {
                    delete _h[eventType];
                }
            }
            else {
                delete _h[eventType];
            }
            return this;
        }
        trigger(eventType, ...args) {
            if (!this._$handlers) {
                return this;
            }
            const _h = this._$handlers[eventType];
            const eventProcessor = this._$eventProcessor;
            if (_h) {
                const argLen = args.length;
                const len = _h.length;
                for (let i = 0; i < len; i++) {
                    const hItem = _h[i];
                    if (eventProcessor
                        && eventProcessor.filter
                        && hItem.query != null
                        && !eventProcessor.filter(eventType, hItem.query)) {
                        continue;
                    }
                    switch (argLen) {
                        case 0:
                            hItem.h.call(hItem.ctx);
                            break;
                        case 1:
                            hItem.h.call(hItem.ctx, args[0]);
                            break;
                        case 2:
                            hItem.h.call(hItem.ctx, args[0], args[1]);
                            break;
                        default:
                            hItem.h.apply(hItem.ctx, args);
                            break;
                    }
                }
            }
            eventProcessor && eventProcessor.afterTrigger
                && eventProcessor.afterTrigger(eventType);
            return this;
        }
        triggerWithContext(type, ...args) {
            if (!this._$handlers) {
                return this;
            }
            const _h = this._$handlers[type];
            const eventProcessor = this._$eventProcessor;
            if (_h) {
                const argLen = args.length;
                const ctx = args[argLen - 1];
                const len = _h.length;
                for (let i = 0; i < len; i++) {
                    const hItem = _h[i];
                    if (eventProcessor
                        && eventProcessor.filter
                        && hItem.query != null
                        && !eventProcessor.filter(type, hItem.query)) {
                        continue;
                    }
                    switch (argLen) {
                        case 0:
                            hItem.h.call(ctx);
                            break;
                        case 1:
                            hItem.h.call(ctx, args[0]);
                            break;
                        case 2:
                            hItem.h.call(ctx, args[0], args[1]);
                            break;
                        default:
                            hItem.h.apply(ctx, args.slice(1, argLen - 1));
                            break;
                    }
                }
            }
            eventProcessor && eventProcessor.afterTrigger
                && eventProcessor.afterTrigger(type);
            return this;
        }
    }

    const LN2 = Math.log(2);
    function determinant(rows, rank, rowStart, rowMask, colMask, detCache) {
        const cacheKey = rowMask + '-' + colMask;
        const fullRank = rows.length;
        if (detCache.hasOwnProperty(cacheKey)) {
            return detCache[cacheKey];
        }
        if (rank === 1) {
            const colStart = Math.round(Math.log(((1 << fullRank) - 1) & ~colMask) / LN2);
            return rows[rowStart][colStart];
        }
        const subRowMask = rowMask | (1 << rowStart);
        let subRowStart = rowStart + 1;
        while (rowMask & (1 << subRowStart)) {
            subRowStart++;
        }
        let sum = 0;
        for (let j = 0, colLocalIdx = 0; j < fullRank; j++) {
            const colTag = 1 << j;
            if (!(colTag & colMask)) {
                sum += (colLocalIdx % 2 ? -1 : 1) * rows[rowStart][j]
                    * determinant(rows, rank - 1, subRowStart, subRowMask, colMask | colTag, detCache);
                colLocalIdx++;
            }
        }
        detCache[cacheKey] = sum;
        return sum;
    }
    function buildTransformer(src, dest) {
        const mA = [
            [src[0], src[1], 1, 0, 0, 0, -dest[0] * src[0], -dest[0] * src[1]],
            [0, 0, 0, src[0], src[1], 1, -dest[1] * src[0], -dest[1] * src[1]],
            [src[2], src[3], 1, 0, 0, 0, -dest[2] * src[2], -dest[2] * src[3]],
            [0, 0, 0, src[2], src[3], 1, -dest[3] * src[2], -dest[3] * src[3]],
            [src[4], src[5], 1, 0, 0, 0, -dest[4] * src[4], -dest[4] * src[5]],
            [0, 0, 0, src[4], src[5], 1, -dest[5] * src[4], -dest[5] * src[5]],
            [src[6], src[7], 1, 0, 0, 0, -dest[6] * src[6], -dest[6] * src[7]],
            [0, 0, 0, src[6], src[7], 1, -dest[7] * src[6], -dest[7] * src[7]]
        ];
        const detCache = {};
        const det = determinant(mA, 8, 0, 0, 0, detCache);
        if (det === 0) {
            return;
        }
        const vh = [];
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                vh[j] == null && (vh[j] = 0);
                vh[j] += ((i + j) % 2 ? -1 : 1)
                    * determinant(mA, 7, i === 0 ? 1 : 0, 1 << i, 1 << j, detCache)
                    / det * dest[i];
            }
        }
        return function (out, srcPointX, srcPointY) {
            const pk = srcPointX * vh[6] + srcPointY * vh[7] + 1;
            out[0] = (srcPointX * vh[0] + srcPointY * vh[1] + vh[2]) / pk;
            out[1] = (srcPointX * vh[3] + srcPointY * vh[4] + vh[5]) / pk;
        };
    }

    const EVENT_SAVED_PROP = '___zrEVENTSAVED';
    function transformCoordWithViewport(out, el, inX, inY, inverse) {
        if (el.getBoundingClientRect && env.domSupported && !isCanvasEl(el)) {
            const saved = el[EVENT_SAVED_PROP] || (el[EVENT_SAVED_PROP] = {});
            const markers = prepareCoordMarkers(el, saved);
            const transformer = preparePointerTransformer(markers, saved, inverse);
            if (transformer) {
                transformer(out, inX, inY);
                return true;
            }
        }
        return false;
    }
    function prepareCoordMarkers(el, saved) {
        let markers = saved.markers;
        if (markers) {
            return markers;
        }
        markers = saved.markers = [];
        const propLR = ['left', 'right'];
        const propTB = ['top', 'bottom'];
        for (let i = 0; i < 4; i++) {
            const marker = document.createElement('div');
            const stl = marker.style;
            const idxLR = i % 2;
            const idxTB = (i >> 1) % 2;
            stl.cssText = [
                'position: absolute',
                'visibility: hidden',
                'padding: 0',
                'margin: 0',
                'border-width: 0',
                'user-select: none',
                'width:0',
                'height:0',
                propLR[idxLR] + ':0',
                propTB[idxTB] + ':0',
                propLR[1 - idxLR] + ':auto',
                propTB[1 - idxTB] + ':auto',
                ''
            ].join('!important;');
            el.appendChild(marker);
            markers.push(marker);
        }
        return markers;
    }
    function preparePointerTransformer(markers, saved, inverse) {
        const transformerName = inverse ? 'invTrans' : 'trans';
        const transformer = saved[transformerName];
        const oldSrcCoords = saved.srcCoords;
        const srcCoords = [];
        const destCoords = [];
        let oldCoordTheSame = true;
        for (let i = 0; i < 4; i++) {
            const rect = markers[i].getBoundingClientRect();
            const ii = 2 * i;
            const x = rect.left;
            const y = rect.top;
            srcCoords.push(x, y);
            oldCoordTheSame = oldCoordTheSame && oldSrcCoords && x === oldSrcCoords[ii] && y === oldSrcCoords[ii + 1];
            destCoords.push(markers[i].offsetLeft, markers[i].offsetTop);
        }
        return (oldCoordTheSame && transformer)
            ? transformer
            : (saved.srcCoords = srcCoords,
                saved[transformerName] = inverse
                    ? buildTransformer(destCoords, srcCoords)
                    : buildTransformer(srcCoords, destCoords));
    }
    function isCanvasEl(el) {
        return el.nodeName.toUpperCase() === 'CANVAS';
    }
    const replaceReg = /([&<>"'])/g;
    const replaceMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        '\'': '&#39;'
    };
    function encodeHTML(source) {
        return source == null
            ? ''
            : (source + '').replace(replaceReg, function (str, c) {
                return replaceMap[c];
            });
    }

    const MOUSE_EVENT_REG = /^(?:mouse|pointer|contextmenu|drag|drop)|click/;
    const _calcOut = [];
    const firefoxNotSupportOffsetXY = env.browser.firefox
        && +env.browser.version.split('.')[0] < 39;
    function clientToLocal(el, e, out, calculate) {
        out = out || {};
        if (calculate) {
            calculateZrXY(el, e, out);
        }
        else if (firefoxNotSupportOffsetXY
            && e.layerX != null
            && e.layerX !== e.offsetX) {
            out.zrX = e.layerX;
            out.zrY = e.layerY;
        }
        else if (e.offsetX != null) {
            out.zrX = e.offsetX;
            out.zrY = e.offsetY;
        }
        else {
            calculateZrXY(el, e, out);
        }
        return out;
    }
    function calculateZrXY(el, e, out) {
        if (env.domSupported && el.getBoundingClientRect) {
            const ex = e.clientX;
            const ey = e.clientY;
            if (isCanvasEl(el)) {
                const box = el.getBoundingClientRect();
                out.zrX = ex - box.left;
                out.zrY = ey - box.top;
                return;
            }
            else {
                if (transformCoordWithViewport(_calcOut, el, ex, ey)) {
                    out.zrX = _calcOut[0];
                    out.zrY = _calcOut[1];
                    return;
                }
            }
        }
        out.zrX = out.zrY = 0;
    }
    function getNativeEvent(e) {
        return e
            || window.event;
    }
    function normalizeEvent(el, e, calculate) {
        e = getNativeEvent(e);
        if (e.zrX != null) {
            return e;
        }
        const eventType = e.type;
        const isTouch = eventType && eventType.indexOf('touch') >= 0;
        if (!isTouch) {
            clientToLocal(el, e, e, calculate);
            const wheelDelta = getWheelDeltaMayPolyfill(e);
            e.zrDelta = wheelDelta ? wheelDelta / 120 : -(e.detail || 0) / 3;
        }
        else {
            const touch = eventType !== 'touchend'
                ? e.targetTouches[0]
                : e.changedTouches[0];
            touch && clientToLocal(el, touch, e, calculate);
        }
        const button = e.button;
        if (e.which == null && button !== undefined && MOUSE_EVENT_REG.test(e.type)) {
            e.which = (button & 1 ? 1 : (button & 2 ? 3 : (button & 4 ? 2 : 0)));
        }
        return e;
    }
    function getWheelDeltaMayPolyfill(e) {
        const rawWheelDelta = e.wheelDelta;
        if (rawWheelDelta) {
            return rawWheelDelta;
        }
        const deltaX = e.deltaX;
        const deltaY = e.deltaY;
        if (deltaX == null || deltaY == null) {
            return rawWheelDelta;
        }
        const delta = deltaY !== 0 ? Math.abs(deltaY) : Math.abs(deltaX);
        const sign = deltaY > 0 ? -1
            : deltaY < 0 ? 1
                : deltaX > 0 ? -1
                    : 1;
        return 3 * delta * sign;
    }
    function addEventListener(el, name, handler, opt) {
        el.addEventListener(name, handler, opt);
    }
    function removeEventListener(el, name, handler, opt) {
        el.removeEventListener(name, handler, opt);
    }
    const stop = function (e) {
        e.preventDefault();
        e.stopPropagation();
        e.cancelBubble = true;
    };

    class GestureMgr {
        constructor() {
            this._track = [];
        }
        recognize(event, target, root) {
            this._doTrack(event, target, root);
            return this._recognize(event);
        }
        clear() {
            this._track.length = 0;
            return this;
        }
        _doTrack(event, target, root) {
            const touches = event.touches;
            if (!touches) {
                return;
            }
            const trackItem = {
                points: [],
                touches: [],
                target: target,
                event: event
            };
            for (let i = 0, len = touches.length; i < len; i++) {
                const touch = touches[i];
                const pos = clientToLocal(root, touch, {});
                trackItem.points.push([pos.zrX, pos.zrY]);
                trackItem.touches.push(touch);
            }
            this._track.push(trackItem);
        }
        _recognize(event) {
            for (let eventName in recognizers) {
                if (recognizers.hasOwnProperty(eventName)) {
                    const gestureInfo = recognizers[eventName](this._track, event);
                    if (gestureInfo) {
                        return gestureInfo;
                    }
                }
            }
        }
    }
    function dist$1(pointPair) {
        const dx = pointPair[1][0] - pointPair[0][0];
        const dy = pointPair[1][1] - pointPair[0][1];
        return Math.sqrt(dx * dx + dy * dy);
    }
    function center(pointPair) {
        return [
            (pointPair[0][0] + pointPair[1][0]) / 2,
            (pointPair[0][1] + pointPair[1][1]) / 2
        ];
    }
    const recognizers = {
        pinch: function (tracks, event) {
            const trackLen = tracks.length;
            if (!trackLen) {
                return;
            }
            const pinchEnd = (tracks[trackLen - 1] || {}).points;
            const pinchPre = (tracks[trackLen - 2] || {}).points || pinchEnd;
            if (pinchPre
                && pinchPre.length > 1
                && pinchEnd
                && pinchEnd.length > 1) {
                let pinchScale = dist$1(pinchEnd) / dist$1(pinchPre);
                !isFinite(pinchScale) && (pinchScale = 1);
                event.pinchScale = pinchScale;
                const pinchCenter = center(pinchEnd);
                event.pinchX = pinchCenter[0];
                event.pinchY = pinchCenter[1];
                return {
                    type: 'pinch',
                    target: tracks[0].target,
                    event: event
                };
            }
        }
    };

    function create$1() {
        return [1, 0, 0, 1, 0, 0];
    }
    function identity(out) {
        out[0] = 1;
        out[1] = 0;
        out[2] = 0;
        out[3] = 1;
        out[4] = 0;
        out[5] = 0;
        return out;
    }
    function copy$1(out, m) {
        out[0] = m[0];
        out[1] = m[1];
        out[2] = m[2];
        out[3] = m[3];
        out[4] = m[4];
        out[5] = m[5];
        return out;
    }
    function mul$1(out, m1, m2) {
        const out0 = m1[0] * m2[0] + m1[2] * m2[1];
        const out1 = m1[1] * m2[0] + m1[3] * m2[1];
        const out2 = m1[0] * m2[2] + m1[2] * m2[3];
        const out3 = m1[1] * m2[2] + m1[3] * m2[3];
        const out4 = m1[0] * m2[4] + m1[2] * m2[5] + m1[4];
        const out5 = m1[1] * m2[4] + m1[3] * m2[5] + m1[5];
        out[0] = out0;
        out[1] = out1;
        out[2] = out2;
        out[3] = out3;
        out[4] = out4;
        out[5] = out5;
        return out;
    }
    function translate(out, a, v) {
        out[0] = a[0];
        out[1] = a[1];
        out[2] = a[2];
        out[3] = a[3];
        out[4] = a[4] + v[0];
        out[5] = a[5] + v[1];
        return out;
    }
    function rotate(out, a, rad, pivot = [0, 0]) {
        const aa = a[0];
        const ac = a[2];
        const atx = a[4];
        const ab = a[1];
        const ad = a[3];
        const aty = a[5];
        const st = Math.sin(rad);
        const ct = Math.cos(rad);
        out[0] = aa * ct + ab * st;
        out[1] = -aa * st + ab * ct;
        out[2] = ac * ct + ad * st;
        out[3] = -ac * st + ct * ad;
        out[4] = ct * (atx - pivot[0]) + st * (aty - pivot[1]) + pivot[0];
        out[5] = ct * (aty - pivot[1]) - st * (atx - pivot[0]) + pivot[1];
        return out;
    }
    function scale$1(out, a, v) {
        const vx = v[0];
        const vy = v[1];
        out[0] = a[0] * vx;
        out[1] = a[1] * vy;
        out[2] = a[2] * vx;
        out[3] = a[3] * vy;
        out[4] = a[4] * vx;
        out[5] = a[5] * vy;
        return out;
    }
    function invert(out, a) {
        const aa = a[0];
        const ac = a[2];
        const atx = a[4];
        const ab = a[1];
        const ad = a[3];
        const aty = a[5];
        let det = aa * ad - ab * ac;
        if (!det) {
            return null;
        }
        det = 1.0 / det;
        out[0] = ad * det;
        out[1] = -ab * det;
        out[2] = -ac * det;
        out[3] = aa * det;
        out[4] = (ac * aty - ad * atx) * det;
        out[5] = (ab * atx - aa * aty) * det;
        return out;
    }
    function clone$2(a) {
        const b = create$1();
        copy$1(b, a);
        return b;
    }

    var matrix = /*#__PURE__*/Object.freeze({
        __proto__: null,
        create: create$1,
        identity: identity,
        copy: copy$1,
        mul: mul$1,
        translate: translate,
        rotate: rotate,
        scale: scale$1,
        invert: invert,
        clone: clone$2
    });

    class Point {
        constructor(x, y) {
            this.x = x || 0;
            this.y = y || 0;
        }
        copy(other) {
            this.x = other.x;
            this.y = other.y;
            return this;
        }
        clone() {
            return new Point(this.x, this.y);
        }
        set(x, y) {
            this.x = x;
            this.y = y;
            return this;
        }
        equal(other) {
            return other.x === this.x && other.y === this.y;
        }
        add(other) {
            this.x += other.x;
            this.y += other.y;
            return this;
        }
        scale(scalar) {
            this.x *= scalar;
            this.y *= scalar;
        }
        scaleAndAdd(other, scalar) {
            this.x += other.x * scalar;
            this.y += other.y * scalar;
        }
        sub(other) {
            this.x -= other.x;
            this.y -= other.y;
            return this;
        }
        dot(other) {
            return this.x * other.x + this.y * other.y;
        }
        len() {
            return Math.sqrt(this.x * this.x + this.y * this.y);
        }
        lenSquare() {
            return this.x * this.x + this.y * this.y;
        }
        normalize() {
            const len = this.len();
            this.x /= len;
            this.y /= len;
            return this;
        }
        distance(other) {
            const dx = this.x - other.x;
            const dy = this.y - other.y;
            return Math.sqrt(dx * dx + dy * dy);
        }
        distanceSquare(other) {
            const dx = this.x - other.x;
            const dy = this.y - other.y;
            return dx * dx + dy * dy;
        }
        negate() {
            this.x = -this.x;
            this.y = -this.y;
            return this;
        }
        transform(m) {
            if (!m) {
                return;
            }
            const x = this.x;
            const y = this.y;
            this.x = m[0] * x + m[2] * y + m[4];
            this.y = m[1] * x + m[3] * y + m[5];
            return this;
        }
        toArray(out) {
            out[0] = this.x;
            out[1] = this.y;
            return out;
        }
        fromArray(input) {
            this.x = input[0];
            this.y = input[1];
        }
        static set(p, x, y) {
            p.x = x;
            p.y = y;
        }
        static copy(p, p2) {
            p.x = p2.x;
            p.y = p2.y;
        }
        static len(p) {
            return Math.sqrt(p.x * p.x + p.y * p.y);
        }
        static lenSquare(p) {
            return p.x * p.x + p.y * p.y;
        }
        static dot(p0, p1) {
            return p0.x * p1.x + p0.y * p1.y;
        }
        static add(out, p0, p1) {
            out.x = p0.x + p1.x;
            out.y = p0.y + p1.y;
        }
        static sub(out, p0, p1) {
            out.x = p0.x - p1.x;
            out.y = p0.y - p1.y;
        }
        static scale(out, p0, scalar) {
            out.x = p0.x * scalar;
            out.y = p0.y * scalar;
        }
        static scaleAndAdd(out, p0, p1, scalar) {
            out.x = p0.x + p1.x * scalar;
            out.y = p0.y + p1.y * scalar;
        }
        static lerp(out, p0, p1, t) {
            const onet = 1 - t;
            out.x = onet * p0.x + t * p1.x;
            out.y = onet * p0.y + t * p1.y;
        }
    }

    const mathMin = Math.min;
    const mathMax = Math.max;
    const lt = new Point();
    const rb = new Point();
    const lb = new Point();
    const rt = new Point();
    const minTv = new Point();
    const maxTv = new Point();
    class BoundingRect {
        constructor(x, y, width, height) {
            if (width < 0) {
                x = x + width;
                width = -width;
            }
            if (height < 0) {
                y = y + height;
                height = -height;
            }
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
        }
        union(other) {
            const x = mathMin(other.x, this.x);
            const y = mathMin(other.y, this.y);
            if (isFinite(this.x) && isFinite(this.width)) {
                this.width = mathMax(other.x + other.width, this.x + this.width) - x;
            }
            else {
                this.width = other.width;
            }
            if (isFinite(this.y) && isFinite(this.height)) {
                this.height = mathMax(other.y + other.height, this.y + this.height) - y;
            }
            else {
                this.height = other.height;
            }
            this.x = x;
            this.y = y;
        }
        applyTransform(m) {
            BoundingRect.applyTransform(this, this, m);
        }
        calculateTransform(b) {
            const a = this;
            const sx = b.width / a.width;
            const sy = b.height / a.height;
            const m = create$1();
            translate(m, m, [-a.x, -a.y]);
            scale$1(m, m, [sx, sy]);
            translate(m, m, [b.x, b.y]);
            return m;
        }
        intersect(b, mtv) {
            if (!b) {
                return false;
            }
            if (!(b instanceof BoundingRect)) {
                b = BoundingRect.create(b);
            }
            const a = this;
            const ax0 = a.x;
            const ax1 = a.x + a.width;
            const ay0 = a.y;
            const ay1 = a.y + a.height;
            const bx0 = b.x;
            const bx1 = b.x + b.width;
            const by0 = b.y;
            const by1 = b.y + b.height;
            let overlap = !(ax1 < bx0 || bx1 < ax0 || ay1 < by0 || by1 < ay0);
            if (mtv) {
                let dMin = Infinity;
                let dMax = 0;
                const d0 = Math.abs(ax1 - bx0);
                const d1 = Math.abs(bx1 - ax0);
                const d2 = Math.abs(ay1 - by0);
                const d3 = Math.abs(by1 - ay0);
                const dx = Math.min(d0, d1);
                const dy = Math.min(d2, d3);
                if (ax1 < bx0 || bx1 < ax0) {
                    if (dx > dMax) {
                        dMax = dx;
                        if (d0 < d1) {
                            Point.set(maxTv, -d0, 0);
                        }
                        else {
                            Point.set(maxTv, d1, 0);
                        }
                    }
                }
                else {
                    if (dx < dMin) {
                        dMin = dx;
                        if (d0 < d1) {
                            Point.set(minTv, d0, 0);
                        }
                        else {
                            Point.set(minTv, -d1, 0);
                        }
                    }
                }
                if (ay1 < by0 || by1 < ay0) {
                    if (dy > dMax) {
                        dMax = dy;
                        if (d2 < d3) {
                            Point.set(maxTv, 0, -d2);
                        }
                        else {
                            Point.set(maxTv, 0, d3);
                        }
                    }
                }
                else {
                    if (dx < dMin) {
                        dMin = dx;
                        if (d2 < d3) {
                            Point.set(minTv, 0, d2);
                        }
                        else {
                            Point.set(minTv, 0, -d3);
                        }
                    }
                }
            }
            if (mtv) {
                Point.copy(mtv, overlap ? minTv : maxTv);
            }
            return overlap;
        }
        contain(x, y) {
            const rect = this;
            return x >= rect.x
                && x <= (rect.x + rect.width)
                && y >= rect.y
                && y <= (rect.y + rect.height);
        }
        clone() {
            return new BoundingRect(this.x, this.y, this.width, this.height);
        }
        copy(other) {
            BoundingRect.copy(this, other);
        }
        plain() {
            return {
                x: this.x,
                y: this.y,
                width: this.width,
                height: this.height
            };
        }
        isFinite() {
            return isFinite(this.x)
                && isFinite(this.y)
                && isFinite(this.width)
                && isFinite(this.height);
        }
        isZero() {
            return this.width === 0 || this.height === 0;
        }
        static create(rect) {
            return new BoundingRect(rect.x, rect.y, rect.width, rect.height);
        }
        static copy(target, source) {
            target.x = source.x;
            target.y = source.y;
            target.width = source.width;
            target.height = source.height;
        }
        static applyTransform(target, source, m) {
            if (!m) {
                if (target !== source) {
                    BoundingRect.copy(target, source);
                }
                return;
            }
            if (m[1] < 1e-5 && m[1] > -1e-5 && m[2] < 1e-5 && m[2] > -1e-5) {
                const sx = m[0];
                const sy = m[3];
                const tx = m[4];
                const ty = m[5];
                target.x = source.x * sx + tx;
                target.y = source.y * sy + ty;
                target.width = source.width * sx;
                target.height = source.height * sy;
                if (target.width < 0) {
                    target.x += target.width;
                    target.width = -target.width;
                }
                if (target.height < 0) {
                    target.y += target.height;
                    target.height = -target.height;
                }
                return;
            }
            lt.x = lb.x = source.x;
            lt.y = rt.y = source.y;
            rb.x = rt.x = source.x + source.width;
            rb.y = lb.y = source.y + source.height;
            lt.transform(m);
            rt.transform(m);
            rb.transform(m);
            lb.transform(m);
            target.x = mathMin(lt.x, rb.x, lb.x, rt.x);
            target.y = mathMin(lt.y, rb.y, lb.y, rt.y);
            const maxX = mathMax(lt.x, rb.x, lb.x, rt.x);
            const maxY = mathMax(lt.y, rb.y, lb.y, rt.y);
            target.width = maxX - target.x;
            target.height = maxY - target.y;
        }
    }

    const SILENT = 'silent';
    function makeEventPacket(eveType, targetInfo, event) {
        return {
            type: eveType,
            event: event,
            target: targetInfo.target,
            topTarget: targetInfo.topTarget,
            cancelBubble: false,
            offsetX: event.zrX,
            offsetY: event.zrY,
            gestureEvent: event.gestureEvent,
            pinchX: event.pinchX,
            pinchY: event.pinchY,
            pinchScale: event.pinchScale,
            wheelDelta: event.zrDelta,
            zrByTouch: event.zrByTouch,
            which: event.which,
            stop: stopEvent
        };
    }
    function stopEvent() {
        stop(this.event);
    }
    class EmptyProxy extends Eventful {
        constructor() {
            super(...arguments);
            this.handler = null;
        }
        dispose() { }
        setCursor() { }
    }
    class HoveredResult {
        constructor(x, y) {
            this.x = x;
            this.y = y;
        }
    }
    const handlerNames = [
        'click', 'dblclick', 'mousewheel', 'mouseout',
        'mouseup', 'mousedown', 'mousemove', 'contextmenu'
    ];
    const tmpRect = new BoundingRect(0, 0, 0, 0);
    class Handler extends Eventful {
        constructor(storage, painter, proxy, painterRoot, pointerSize) {
            super();
            this._hovered = new HoveredResult(0, 0);
            this.storage = storage;
            this.painter = painter;
            this.painterRoot = painterRoot;
            this._pointerSize = pointerSize;
            proxy = proxy || new EmptyProxy();
            this.proxy = null;
            this.setHandlerProxy(proxy);
            this._draggingMgr = new Draggable(this);
        }
        setHandlerProxy(proxy) {
            if (this.proxy) {
                this.proxy.dispose();
            }
            if (proxy) {
                each(handlerNames, function (name) {
                    proxy.on && proxy.on(name, this[name], this);
                }, this);
                proxy.handler = this;
            }
            this.proxy = proxy;
        }
        mousemove(event) {
            const x = event.zrX;
            const y = event.zrY;
            const isOutside = isOutsideBoundary(this, x, y);
            let lastHovered = this._hovered;
            let lastHoveredTarget = lastHovered.target;
            if (lastHoveredTarget && !lastHoveredTarget.__zr) {
                lastHovered = this.findHover(lastHovered.x, lastHovered.y);
                lastHoveredTarget = lastHovered.target;
            }
            const hovered = this._hovered = isOutside ? new HoveredResult(x, y) : this.findHover(x, y);
            const hoveredTarget = hovered.target;
            const proxy = this.proxy;
            proxy.setCursor && proxy.setCursor(hoveredTarget ? hoveredTarget.cursor : 'default');
            if (lastHoveredTarget && hoveredTarget !== lastHoveredTarget) {
                this.dispatchToElement(lastHovered, 'mouseout', event);
            }
            this.dispatchToElement(hovered, 'mousemove', event);
            if (hoveredTarget && hoveredTarget !== lastHoveredTarget) {
                this.dispatchToElement(hovered, 'mouseover', event);
            }
        }
        mouseout(event) {
            const eventControl = event.zrEventControl;
            if (eventControl !== 'only_globalout') {
                this.dispatchToElement(this._hovered, 'mouseout', event);
            }
            if (eventControl !== 'no_globalout') {
                this.trigger('globalout', { type: 'globalout', event: event });
            }
        }
        resize() {
            this._hovered = new HoveredResult(0, 0);
        }
        dispatch(eventName, eventArgs) {
            const handler = this[eventName];
            handler && handler.call(this, eventArgs);
        }
        dispose() {
            this.proxy.dispose();
            this.storage = null;
            this.proxy = null;
            this.painter = null;
        }
        setCursorStyle(cursorStyle) {
            const proxy = this.proxy;
            proxy.setCursor && proxy.setCursor(cursorStyle);
        }
        dispatchToElement(targetInfo, eventName, event) {
            targetInfo = targetInfo || {};
            let el = targetInfo.target;
            if (el && el.silent) {
                return;
            }
            const eventKey = ('on' + eventName);
            const eventPacket = makeEventPacket(eventName, targetInfo, event);
            while (el) {
                el[eventKey]
                    && (eventPacket.cancelBubble = !!el[eventKey].call(el, eventPacket));
                el.trigger(eventName, eventPacket);
                el = el.__hostTarget ? el.__hostTarget : el.parent;
                if (eventPacket.cancelBubble) {
                    break;
                }
            }
            if (!eventPacket.cancelBubble) {
                this.trigger(eventName, eventPacket);
                if (this.painter && this.painter.eachOtherLayer) {
                    this.painter.eachOtherLayer(function (layer) {
                        if (typeof (layer[eventKey]) === 'function') {
                            layer[eventKey].call(layer, eventPacket);
                        }
                        if (layer.trigger) {
                            layer.trigger(eventName, eventPacket);
                        }
                    });
                }
            }
        }
        findHover(x, y, exclude) {
            const list = this.storage.getDisplayList();
            const out = new HoveredResult(x, y);
            setHoverTarget(list, out, x, y, exclude);
            if (this._pointerSize && !out.target) {
                const candidates = [];
                const pointerSize = this._pointerSize;
                const targetSizeHalf = pointerSize / 2;
                const pointerRect = new BoundingRect(x - targetSizeHalf, y - targetSizeHalf, pointerSize, pointerSize);
                for (let i = list.length - 1; i >= 0; i--) {
                    const el = list[i];
                    if (el !== exclude
                        && !el.ignore
                        && !el.ignoreCoarsePointer
                        && (!el.parent || !el.parent.ignoreCoarsePointer)) {
                        tmpRect.copy(el.getBoundingRect());
                        if (el.transform) {
                            tmpRect.applyTransform(el.transform);
                        }
                        if (tmpRect.intersect(pointerRect)) {
                            candidates.push(el);
                        }
                    }
                }
                if (candidates.length) {
                    const rStep = 4;
                    const thetaStep = Math.PI / 12;
                    const PI2 = Math.PI * 2;
                    for (let r = 0; r < targetSizeHalf; r += rStep) {
                        for (let theta = 0; theta < PI2; theta += thetaStep) {
                            const x1 = x + r * Math.cos(theta);
                            const y1 = y + r * Math.sin(theta);
                            setHoverTarget(candidates, out, x1, y1, exclude);
                            if (out.target) {
                                return out;
                            }
                        }
                    }
                }
            }
            return out;
        }
        processGesture(event, stage) {
            if (!this._gestureMgr) {
                this._gestureMgr = new GestureMgr();
            }
            const gestureMgr = this._gestureMgr;
            stage === 'start' && gestureMgr.clear();
            const gestureInfo = gestureMgr.recognize(event, this.findHover(event.zrX, event.zrY, null).target, this.proxy.dom);
            stage === 'end' && gestureMgr.clear();
            if (gestureInfo) {
                const type = gestureInfo.type;
                event.gestureEvent = type;
                let res = new HoveredResult();
                res.target = gestureInfo.target;
                this.dispatchToElement(res, type, gestureInfo.event);
            }
        }
    }
    each(['click', 'mousedown', 'mouseup', 'mousewheel', 'dblclick', 'contextmenu'], function (name) {
        Handler.prototype[name] = function (event) {
            const x = event.zrX;
            const y = event.zrY;
            const isOutside = isOutsideBoundary(this, x, y);
            let hovered;
            let hoveredTarget;
            if (name !== 'mouseup' || !isOutside) {
                hovered = this.findHover(x, y);
                hoveredTarget = hovered.target;
            }
            if (name === 'mousedown') {
                this._downEl = hoveredTarget;
                this._downPoint = [event.zrX, event.zrY];
                this._upEl = hoveredTarget;
            }
            else if (name === 'mouseup') {
                this._upEl = hoveredTarget;
            }
            else if (name === 'click') {
                if (this._downEl !== this._upEl
                    || !this._downPoint
                    || dist(this._downPoint, [event.zrX, event.zrY]) > 4) {
                    return;
                }
                this._downPoint = null;
            }
            this.dispatchToElement(hovered, name, event);
        };
    });
    function isHover(displayable, x, y) {
        if (displayable[displayable.rectHover ? 'rectContain' : 'contain'](x, y)) {
            let el = displayable;
            let isSilent;
            let ignoreClip = false;
            while (el) {
                if (el.ignoreClip) {
                    ignoreClip = true;
                }
                if (!ignoreClip) {
                    let clipPath = el.getClipPath();
                    if (clipPath && !clipPath.contain(x, y)) {
                        return false;
                    }
                }
                if (el.silent) {
                    isSilent = true;
                }
                const hostEl = el.__hostTarget;
                el = hostEl ? hostEl : el.parent;
            }
            return isSilent ? SILENT : true;
        }
        return false;
    }
    function setHoverTarget(list, out, x, y, exclude) {
        for (let i = list.length - 1; i >= 0; i--) {
            const el = list[i];
            let hoverCheckResult;
            if (el !== exclude
                && !el.ignore
                && (hoverCheckResult = isHover(el, x, y))) {
                !out.topTarget && (out.topTarget = el);
                if (hoverCheckResult !== SILENT) {
                    out.target = el;
                    break;
                }
            }
        }
    }
    function isOutsideBoundary(handlerInstance, x, y) {
        const painter = handlerInstance.painter;
        return x < 0 || x > painter.getWidth() || y < 0 || y > painter.getHeight();
    }

    const DEFAULT_MIN_MERGE = 32;
    const DEFAULT_MIN_GALLOPING = 7;
    function minRunLength(n) {
        var r = 0;
        while (n >= DEFAULT_MIN_MERGE) {
            r |= n & 1;
            n >>= 1;
        }
        return n + r;
    }
    function makeAscendingRun(array, lo, hi, compare) {
        var runHi = lo + 1;
        if (runHi === hi) {
            return 1;
        }
        if (compare(array[runHi++], array[lo]) < 0) {
            while (runHi < hi && compare(array[runHi], array[runHi - 1]) < 0) {
                runHi++;
            }
            reverseRun(array, lo, runHi);
        }
        else {
            while (runHi < hi && compare(array[runHi], array[runHi - 1]) >= 0) {
                runHi++;
            }
        }
        return runHi - lo;
    }
    function reverseRun(array, lo, hi) {
        hi--;
        while (lo < hi) {
            var t = array[lo];
            array[lo++] = array[hi];
            array[hi--] = t;
        }
    }
    function binaryInsertionSort(array, lo, hi, start, compare) {
        if (start === lo) {
            start++;
        }
        for (; start < hi; start++) {
            var pivot = array[start];
            var left = lo;
            var right = start;
            var mid;
            while (left < right) {
                mid = left + right >>> 1;
                if (compare(pivot, array[mid]) < 0) {
                    right = mid;
                }
                else {
                    left = mid + 1;
                }
            }
            var n = start - left;
            switch (n) {
                case 3:
                    array[left + 3] = array[left + 2];
                case 2:
                    array[left + 2] = array[left + 1];
                case 1:
                    array[left + 1] = array[left];
                    break;
                default:
                    while (n > 0) {
                        array[left + n] = array[left + n - 1];
                        n--;
                    }
            }
            array[left] = pivot;
        }
    }
    function gallopLeft(value, array, start, length, hint, compare) {
        var lastOffset = 0;
        var maxOffset = 0;
        var offset = 1;
        if (compare(value, array[start + hint]) > 0) {
            maxOffset = length - hint;
            while (offset < maxOffset && compare(value, array[start + hint + offset]) > 0) {
                lastOffset = offset;
                offset = (offset << 1) + 1;
                if (offset <= 0) {
                    offset = maxOffset;
                }
            }
            if (offset > maxOffset) {
                offset = maxOffset;
            }
            lastOffset += hint;
            offset += hint;
        }
        else {
            maxOffset = hint + 1;
            while (offset < maxOffset && compare(value, array[start + hint - offset]) <= 0) {
                lastOffset = offset;
                offset = (offset << 1) + 1;
                if (offset <= 0) {
                    offset = maxOffset;
                }
            }
            if (offset > maxOffset) {
                offset = maxOffset;
            }
            var tmp = lastOffset;
            lastOffset = hint - offset;
            offset = hint - tmp;
        }
        lastOffset++;
        while (lastOffset < offset) {
            var m = lastOffset + (offset - lastOffset >>> 1);
            if (compare(value, array[start + m]) > 0) {
                lastOffset = m + 1;
            }
            else {
                offset = m;
            }
        }
        return offset;
    }
    function gallopRight(value, array, start, length, hint, compare) {
        var lastOffset = 0;
        var maxOffset = 0;
        var offset = 1;
        if (compare(value, array[start + hint]) < 0) {
            maxOffset = hint + 1;
            while (offset < maxOffset && compare(value, array[start + hint - offset]) < 0) {
                lastOffset = offset;
                offset = (offset << 1) + 1;
                if (offset <= 0) {
                    offset = maxOffset;
                }
            }
            if (offset > maxOffset) {
                offset = maxOffset;
            }
            var tmp = lastOffset;
            lastOffset = hint - offset;
            offset = hint - tmp;
        }
        else {
            maxOffset = length - hint;
            while (offset < maxOffset && compare(value, array[start + hint + offset]) >= 0) {
                lastOffset = offset;
                offset = (offset << 1) + 1;
                if (offset <= 0) {
                    offset = maxOffset;
                }
            }
            if (offset > maxOffset) {
                offset = maxOffset;
            }
            lastOffset += hint;
            offset += hint;
        }
        lastOffset++;
        while (lastOffset < offset) {
            var m = lastOffset + (offset - lastOffset >>> 1);
            if (compare(value, array[start + m]) < 0) {
                offset = m;
            }
            else {
                lastOffset = m + 1;
            }
        }
        return offset;
    }
    function TimSort(array, compare) {
        let minGallop = DEFAULT_MIN_GALLOPING;
        let runStart;
        let runLength;
        let stackSize = 0;
        var tmp = [];
        runStart = [];
        runLength = [];
        function pushRun(_runStart, _runLength) {
            runStart[stackSize] = _runStart;
            runLength[stackSize] = _runLength;
            stackSize += 1;
        }
        function mergeRuns() {
            while (stackSize > 1) {
                var n = stackSize - 2;
                if ((n >= 1 && runLength[n - 1] <= runLength[n] + runLength[n + 1])
                    || (n >= 2 && runLength[n - 2] <= runLength[n] + runLength[n - 1])) {
                    if (runLength[n - 1] < runLength[n + 1]) {
                        n--;
                    }
                }
                else if (runLength[n] > runLength[n + 1]) {
                    break;
                }
                mergeAt(n);
            }
        }
        function forceMergeRuns() {
            while (stackSize > 1) {
                var n = stackSize - 2;
                if (n > 0 && runLength[n - 1] < runLength[n + 1]) {
                    n--;
                }
                mergeAt(n);
            }
        }
        function mergeAt(i) {
            var start1 = runStart[i];
            var length1 = runLength[i];
            var start2 = runStart[i + 1];
            var length2 = runLength[i + 1];
            runLength[i] = length1 + length2;
            if (i === stackSize - 3) {
                runStart[i + 1] = runStart[i + 2];
                runLength[i + 1] = runLength[i + 2];
            }
            stackSize--;
            var k = gallopRight(array[start2], array, start1, length1, 0, compare);
            start1 += k;
            length1 -= k;
            if (length1 === 0) {
                return;
            }
            length2 = gallopLeft(array[start1 + length1 - 1], array, start2, length2, length2 - 1, compare);
            if (length2 === 0) {
                return;
            }
            if (length1 <= length2) {
                mergeLow(start1, length1, start2, length2);
            }
            else {
                mergeHigh(start1, length1, start2, length2);
            }
        }
        function mergeLow(start1, length1, start2, length2) {
            var i = 0;
            for (i = 0; i < length1; i++) {
                tmp[i] = array[start1 + i];
            }
            var cursor1 = 0;
            var cursor2 = start2;
            var dest = start1;
            array[dest++] = array[cursor2++];
            if (--length2 === 0) {
                for (i = 0; i < length1; i++) {
                    array[dest + i] = tmp[cursor1 + i];
                }
                return;
            }
            if (length1 === 1) {
                for (i = 0; i < length2; i++) {
                    array[dest + i] = array[cursor2 + i];
                }
                array[dest + length2] = tmp[cursor1];
                return;
            }
            var _minGallop = minGallop;
            var count1;
            var count2;
            var exit;
            while (1) {
                count1 = 0;
                count2 = 0;
                exit = false;
                do {
                    if (compare(array[cursor2], tmp[cursor1]) < 0) {
                        array[dest++] = array[cursor2++];
                        count2++;
                        count1 = 0;
                        if (--length2 === 0) {
                            exit = true;
                            break;
                        }
                    }
                    else {
                        array[dest++] = tmp[cursor1++];
                        count1++;
                        count2 = 0;
                        if (--length1 === 1) {
                            exit = true;
                            break;
                        }
                    }
                } while ((count1 | count2) < _minGallop);
                if (exit) {
                    break;
                }
                do {
                    count1 = gallopRight(array[cursor2], tmp, cursor1, length1, 0, compare);
                    if (count1 !== 0) {
                        for (i = 0; i < count1; i++) {
                            array[dest + i] = tmp[cursor1 + i];
                        }
                        dest += count1;
                        cursor1 += count1;
                        length1 -= count1;
                        if (length1 <= 1) {
                            exit = true;
                            break;
                        }
                    }
                    array[dest++] = array[cursor2++];
                    if (--length2 === 0) {
                        exit = true;
                        break;
                    }
                    count2 = gallopLeft(tmp[cursor1], array, cursor2, length2, 0, compare);
                    if (count2 !== 0) {
                        for (i = 0; i < count2; i++) {
                            array[dest + i] = array[cursor2 + i];
                        }
                        dest += count2;
                        cursor2 += count2;
                        length2 -= count2;
                        if (length2 === 0) {
                            exit = true;
                            break;
                        }
                    }
                    array[dest++] = tmp[cursor1++];
                    if (--length1 === 1) {
                        exit = true;
                        break;
                    }
                    _minGallop--;
                } while (count1 >= DEFAULT_MIN_GALLOPING || count2 >= DEFAULT_MIN_GALLOPING);
                if (exit) {
                    break;
                }
                if (_minGallop < 0) {
                    _minGallop = 0;
                }
                _minGallop += 2;
            }
            minGallop = _minGallop;
            minGallop < 1 && (minGallop = 1);
            if (length1 === 1) {
                for (i = 0; i < length2; i++) {
                    array[dest + i] = array[cursor2 + i];
                }
                array[dest + length2] = tmp[cursor1];
            }
            else if (length1 === 0) {
                throw new Error();
            }
            else {
                for (i = 0; i < length1; i++) {
                    array[dest + i] = tmp[cursor1 + i];
                }
            }
        }
        function mergeHigh(start1, length1, start2, length2) {
            var i = 0;
            for (i = 0; i < length2; i++) {
                tmp[i] = array[start2 + i];
            }
            var cursor1 = start1 + length1 - 1;
            var cursor2 = length2 - 1;
            var dest = start2 + length2 - 1;
            var customCursor = 0;
            var customDest = 0;
            array[dest--] = array[cursor1--];
            if (--length1 === 0) {
                customCursor = dest - (length2 - 1);
                for (i = 0; i < length2; i++) {
                    array[customCursor + i] = tmp[i];
                }
                return;
            }
            if (length2 === 1) {
                dest -= length1;
                cursor1 -= length1;
                customDest = dest + 1;
                customCursor = cursor1 + 1;
                for (i = length1 - 1; i >= 0; i--) {
                    array[customDest + i] = array[customCursor + i];
                }
                array[dest] = tmp[cursor2];
                return;
            }
            var _minGallop = minGallop;
            while (true) {
                var count1 = 0;
                var count2 = 0;
                var exit = false;
                do {
                    if (compare(tmp[cursor2], array[cursor1]) < 0) {
                        array[dest--] = array[cursor1--];
                        count1++;
                        count2 = 0;
                        if (--length1 === 0) {
                            exit = true;
                            break;
                        }
                    }
                    else {
                        array[dest--] = tmp[cursor2--];
                        count2++;
                        count1 = 0;
                        if (--length2 === 1) {
                            exit = true;
                            break;
                        }
                    }
                } while ((count1 | count2) < _minGallop);
                if (exit) {
                    break;
                }
                do {
                    count1 = length1 - gallopRight(tmp[cursor2], array, start1, length1, length1 - 1, compare);
                    if (count1 !== 0) {
                        dest -= count1;
                        cursor1 -= count1;
                        length1 -= count1;
                        customDest = dest + 1;
                        customCursor = cursor1 + 1;
                        for (i = count1 - 1; i >= 0; i--) {
                            array[customDest + i] = array[customCursor + i];
                        }
                        if (length1 === 0) {
                            exit = true;
                            break;
                        }
                    }
                    array[dest--] = tmp[cursor2--];
                    if (--length2 === 1) {
                        exit = true;
                        break;
                    }
                    count2 = length2 - gallopLeft(array[cursor1], tmp, 0, length2, length2 - 1, compare);
                    if (count2 !== 0) {
                        dest -= count2;
                        cursor2 -= count2;
                        length2 -= count2;
                        customDest = dest + 1;
                        customCursor = cursor2 + 1;
                        for (i = 0; i < count2; i++) {
                            array[customDest + i] = tmp[customCursor + i];
                        }
                        if (length2 <= 1) {
                            exit = true;
                            break;
                        }
                    }
                    array[dest--] = array[cursor1--];
                    if (--length1 === 0) {
                        exit = true;
                        break;
                    }
                    _minGallop--;
                } while (count1 >= DEFAULT_MIN_GALLOPING || count2 >= DEFAULT_MIN_GALLOPING);
                if (exit) {
                    break;
                }
                if (_minGallop < 0) {
                    _minGallop = 0;
                }
                _minGallop += 2;
            }
            minGallop = _minGallop;
            if (minGallop < 1) {
                minGallop = 1;
            }
            if (length2 === 1) {
                dest -= length1;
                cursor1 -= length1;
                customDest = dest + 1;
                customCursor = cursor1 + 1;
                for (i = length1 - 1; i >= 0; i--) {
                    array[customDest + i] = array[customCursor + i];
                }
                array[dest] = tmp[cursor2];
            }
            else if (length2 === 0) {
                throw new Error();
            }
            else {
                customCursor = dest - (length2 - 1);
                for (i = 0; i < length2; i++) {
                    array[customCursor + i] = tmp[i];
                }
            }
        }
        return {
            mergeRuns,
            forceMergeRuns,
            pushRun
        };
    }
    function sort(array, compare, lo, hi) {
        if (!lo) {
            lo = 0;
        }
        if (!hi) {
            hi = array.length;
        }
        var remaining = hi - lo;
        if (remaining < 2) {
            return;
        }
        var runLength = 0;
        if (remaining < DEFAULT_MIN_MERGE) {
            runLength = makeAscendingRun(array, lo, hi, compare);
            binaryInsertionSort(array, lo, hi, lo + runLength, compare);
            return;
        }
        var ts = TimSort(array, compare);
        var minRun = minRunLength(remaining);
        do {
            runLength = makeAscendingRun(array, lo, hi, compare);
            if (runLength < minRun) {
                var force = remaining;
                if (force > minRun) {
                    force = minRun;
                }
                binaryInsertionSort(array, lo, lo + force, lo + runLength, compare);
                runLength = force;
            }
            ts.pushRun(lo, runLength);
            ts.mergeRuns();
            remaining -= runLength;
            lo += runLength;
        } while (remaining !== 0);
        ts.forceMergeRuns();
    }

    const REDRAW_BIT = 1;
    const STYLE_CHANGED_BIT = 2;
    const SHAPE_CHANGED_BIT = 4;

    let invalidZErrorLogged = false;
    function logInvalidZError() {
        if (invalidZErrorLogged) {
            return;
        }
        invalidZErrorLogged = true;
        console.warn('z / z2 / zlevel of displayable is invalid, which may cause unexpected errors');
    }
    function shapeCompareFunc(a, b) {
        if (a.zlevel === b.zlevel) {
            if (a.z === b.z) {
                return a.z2 - b.z2;
            }
            return a.z - b.z;
        }
        return a.zlevel - b.zlevel;
    }
    class Storage {
        constructor() {
            this._roots = [];
            this._displayList = [];
            this._displayListLen = 0;
            this.displayableSortFunc = shapeCompareFunc;
        }
        traverse(cb, context) {
            for (let i = 0; i < this._roots.length; i++) {
                this._roots[i].traverse(cb, context);
            }
        }
        getDisplayList(update, includeIgnore) {
            includeIgnore = includeIgnore || false;
            const displayList = this._displayList;
            if (update || !displayList.length) {
                this.updateDisplayList(includeIgnore);
            }
            return displayList;
        }
        updateDisplayList(includeIgnore) {
            this._displayListLen = 0;
            const roots = this._roots;
            const displayList = this._displayList;
            for (let i = 0, len = roots.length; i < len; i++) {
                this._updateAndAddDisplayable(roots[i], null, includeIgnore);
            }
            displayList.length = this._displayListLen;
            sort(displayList, shapeCompareFunc);
        }
        _updateAndAddDisplayable(el, clipPaths, includeIgnore) {
            if (el.ignore && !includeIgnore) {
                return;
            }
            el.beforeUpdate();
            el.update();
            el.afterUpdate();
            const userSetClipPath = el.getClipPath();
            if (el.ignoreClip) {
                clipPaths = null;
            }
            else if (userSetClipPath) {
                if (clipPaths) {
                    clipPaths = clipPaths.slice();
                }
                else {
                    clipPaths = [];
                }
                let currentClipPath = userSetClipPath;
                let parentClipPath = el;
                while (currentClipPath) {
                    currentClipPath.parent = parentClipPath;
                    currentClipPath.updateTransform();
                    clipPaths.push(currentClipPath);
                    parentClipPath = currentClipPath;
                    currentClipPath = currentClipPath.getClipPath();
                }
            }
            if (el.childrenRef) {
                const children = el.childrenRef();
                for (let i = 0; i < children.length; i++) {
                    const child = children[i];
                    if (el.__dirty) {
                        child.__dirty |= REDRAW_BIT;
                    }
                    this._updateAndAddDisplayable(child, clipPaths, includeIgnore);
                }
                el.__dirty = 0;
            }
            else {
                const disp = el;
                if (clipPaths && clipPaths.length) {
                    disp.__clipPaths = clipPaths;
                }
                else if (disp.__clipPaths && disp.__clipPaths.length > 0) {
                    disp.__clipPaths = [];
                }
                if (isNaN(disp.z)) {
                    logInvalidZError();
                    disp.z = 0;
                }
                if (isNaN(disp.z2)) {
                    logInvalidZError();
                    disp.z2 = 0;
                }
                if (isNaN(disp.zlevel)) {
                    logInvalidZError();
                    disp.zlevel = 0;
                }
                this._displayList[this._displayListLen++] = disp;
            }
            const decalEl = el.getDecalElement && el.getDecalElement();
            if (decalEl) {
                this._updateAndAddDisplayable(decalEl, clipPaths, includeIgnore);
            }
            const textGuide = el.getTextGuideLine();
            if (textGuide) {
                this._updateAndAddDisplayable(textGuide, clipPaths, includeIgnore);
            }
            const textEl = el.getTextContent();
            if (textEl) {
                this._updateAndAddDisplayable(textEl, clipPaths, includeIgnore);
            }
        }
        addRoot(el) {
            if (el.__zr && el.__zr.storage === this) {
                return;
            }
            this._roots.push(el);
        }
        delRoot(el) {
            if (el instanceof Array) {
                for (let i = 0, l = el.length; i < l; i++) {
                    this.delRoot(el[i]);
                }
                return;
            }
            const idx = indexOf(this._roots, el);
            if (idx >= 0) {
                this._roots.splice(idx, 1);
            }
        }
        delAllRoots() {
            this._roots = [];
            this._displayList = [];
            this._displayListLen = 0;
            return;
        }
        getRoots() {
            return this._roots;
        }
        dispose() {
            this._displayList = null;
            this._roots = null;
        }
    }

    let requestAnimationFrame;
    requestAnimationFrame = (env.hasGlobalWindow
        && ((window.requestAnimationFrame && window.requestAnimationFrame.bind(window))
            || (window.msRequestAnimationFrame && window.msRequestAnimationFrame.bind(window))
            || window.mozRequestAnimationFrame
            || window.webkitRequestAnimationFrame)) || function (func) {
        return setTimeout(func, 16);
    };
    var requestAnimationFrame$1 = requestAnimationFrame;

    const easingFuncs = {
        linear(k) {
            return k;
        },
        quadraticIn(k) {
            return k * k;
        },
        quadraticOut(k) {
            return k * (2 - k);
        },
        quadraticInOut(k) {
            if ((k *= 2) < 1) {
                return 0.5 * k * k;
            }
            return -0.5 * (--k * (k - 2) - 1);
        },
        cubicIn(k) {
            return k * k * k;
        },
        cubicOut(k) {
            return --k * k * k + 1;
        },
        cubicInOut(k) {
            if ((k *= 2) < 1) {
                return 0.5 * k * k * k;
            }
            return 0.5 * ((k -= 2) * k * k + 2);
        },
        quarticIn(k) {
            return k * k * k * k;
        },
        quarticOut(k) {
            return 1 - (--k * k * k * k);
        },
        quarticInOut(k) {
            if ((k *= 2) < 1) {
                return 0.5 * k * k * k * k;
            }
            return -0.5 * ((k -= 2) * k * k * k - 2);
        },
        quinticIn(k) {
            return k * k * k * k * k;
        },
        quinticOut(k) {
            return --k * k * k * k * k + 1;
        },
        quinticInOut(k) {
            if ((k *= 2) < 1) {
                return 0.5 * k * k * k * k * k;
            }
            return 0.5 * ((k -= 2) * k * k * k * k + 2);
        },
        sinusoidalIn(k) {
            return 1 - Math.cos(k * Math.PI / 2);
        },
        sinusoidalOut(k) {
            return Math.sin(k * Math.PI / 2);
        },
        sinusoidalInOut(k) {
            return 0.5 * (1 - Math.cos(Math.PI * k));
        },
        exponentialIn(k) {
            return k === 0 ? 0 : Math.pow(1024, k - 1);
        },
        exponentialOut(k) {
            return k === 1 ? 1 : 1 - Math.pow(2, -10 * k);
        },
        exponentialInOut(k) {
            if (k === 0) {
                return 0;
            }
            if (k === 1) {
                return 1;
            }
            if ((k *= 2) < 1) {
                return 0.5 * Math.pow(1024, k - 1);
            }
            return 0.5 * (-Math.pow(2, -10 * (k - 1)) + 2);
        },
        circularIn(k) {
            return 1 - Math.sqrt(1 - k * k);
        },
        circularOut(k) {
            return Math.sqrt(1 - (--k * k));
        },
        circularInOut(k) {
            if ((k *= 2) < 1) {
                return -0.5 * (Math.sqrt(1 - k * k) - 1);
            }
            return 0.5 * (Math.sqrt(1 - (k -= 2) * k) + 1);
        },
        elasticIn(k) {
            let s;
            let a = 0.1;
            let p = 0.4;
            if (k === 0) {
                return 0;
            }
            if (k === 1) {
                return 1;
            }
            if (!a || a < 1) {
                a = 1;
                s = p / 4;
            }
            else {
                s = p * Math.asin(1 / a) / (2 * Math.PI);
            }
            return -(a * Math.pow(2, 10 * (k -= 1))
                * Math.sin((k - s) * (2 * Math.PI) / p));
        },
        elasticOut(k) {
            let s;
            let a = 0.1;
            let p = 0.4;
            if (k === 0) {
                return 0;
            }
            if (k === 1) {
                return 1;
            }
            if (!a || a < 1) {
                a = 1;
                s = p / 4;
            }
            else {
                s = p * Math.asin(1 / a) / (2 * Math.PI);
            }
            return (a * Math.pow(2, -10 * k)
                * Math.sin((k - s) * (2 * Math.PI) / p) + 1);
        },
        elasticInOut(k) {
            let s;
            let a = 0.1;
            let p = 0.4;
            if (k === 0) {
                return 0;
            }
            if (k === 1) {
                return 1;
            }
            if (!a || a < 1) {
                a = 1;
                s = p / 4;
            }
            else {
                s = p * Math.asin(1 / a) / (2 * Math.PI);
            }
            if ((k *= 2) < 1) {
                return -0.5 * (a * Math.pow(2, 10 * (k -= 1))
                    * Math.sin((k - s) * (2 * Math.PI) / p));
            }
            return a * Math.pow(2, -10 * (k -= 1))
                * Math.sin((k - s) * (2 * Math.PI) / p) * 0.5 + 1;
        },
        backIn(k) {
            let s = 1.70158;
            return k * k * ((s + 1) * k - s);
        },
        backOut(k) {
            let s = 1.70158;
            return --k * k * ((s + 1) * k + s) + 1;
        },
        backInOut(k) {
            let s = 1.70158 * 1.525;
            if ((k *= 2) < 1) {
                return 0.5 * (k * k * ((s + 1) * k - s));
            }
            return 0.5 * ((k -= 2) * k * ((s + 1) * k + s) + 2);
        },
        bounceIn(k) {
            return 1 - easingFuncs.bounceOut(1 - k);
        },
        bounceOut(k) {
            if (k < (1 / 2.75)) {
                return 7.5625 * k * k;
            }
            else if (k < (2 / 2.75)) {
                return 7.5625 * (k -= (1.5 / 2.75)) * k + 0.75;
            }
            else if (k < (2.5 / 2.75)) {
                return 7.5625 * (k -= (2.25 / 2.75)) * k + 0.9375;
            }
            else {
                return 7.5625 * (k -= (2.625 / 2.75)) * k + 0.984375;
            }
        },
        bounceInOut(k) {
            if (k < 0.5) {
                return easingFuncs.bounceIn(k * 2) * 0.5;
            }
            return easingFuncs.bounceOut(k * 2 - 1) * 0.5 + 0.5;
        }
    };

    const mathPow = Math.pow;
    const mathSqrt = Math.sqrt;
    const EPSILON = 1e-8;
    const EPSILON_NUMERIC = 1e-4;
    const THREE_SQRT = mathSqrt(3);
    const ONE_THIRD = 1 / 3;
    const _v0 = create();
    const _v1 = create();
    const _v2 = create();
    function isAroundZero(val) {
        return val > -EPSILON && val < EPSILON;
    }
    function isNotAroundZero(val) {
        return val > EPSILON || val < -EPSILON;
    }
    function cubicAt(p0, p1, p2, p3, t) {
        const onet = 1 - t;
        return onet * onet * (onet * p0 + 3 * t * p1)
            + t * t * (t * p3 + 3 * onet * p2);
    }
    function cubicDerivativeAt(p0, p1, p2, p3, t) {
        const onet = 1 - t;
        return 3 * (((p1 - p0) * onet + 2 * (p2 - p1) * t) * onet
            + (p3 - p2) * t * t);
    }
    function cubicRootAt(p0, p1, p2, p3, val, roots) {
        const a = p3 + 3 * (p1 - p2) - p0;
        const b = 3 * (p2 - p1 * 2 + p0);
        const c = 3 * (p1 - p0);
        const d = p0 - val;
        const A = b * b - 3 * a * c;
        const B = b * c - 9 * a * d;
        const C = c * c - 3 * b * d;
        let n = 0;
        if (isAroundZero(A) && isAroundZero(B)) {
            if (isAroundZero(b)) {
                roots[0] = 0;
            }
            else {
                const t1 = -c / b;
                if (t1 >= 0 && t1 <= 1) {
                    roots[n++] = t1;
                }
            }
        }
        else {
            const disc = B * B - 4 * A * C;
            if (isAroundZero(disc)) {
                const K = B / A;
                const t1 = -b / a + K;
                const t2 = -K / 2;
                if (t1 >= 0 && t1 <= 1) {
                    roots[n++] = t1;
                }
                if (t2 >= 0 && t2 <= 1) {
                    roots[n++] = t2;
                }
            }
            else if (disc > 0) {
                const discSqrt = mathSqrt(disc);
                let Y1 = A * b + 1.5 * a * (-B + discSqrt);
                let Y2 = A * b + 1.5 * a * (-B - discSqrt);
                if (Y1 < 0) {
                    Y1 = -mathPow(-Y1, ONE_THIRD);
                }
                else {
                    Y1 = mathPow(Y1, ONE_THIRD);
                }
                if (Y2 < 0) {
                    Y2 = -mathPow(-Y2, ONE_THIRD);
                }
                else {
                    Y2 = mathPow(Y2, ONE_THIRD);
                }
                const t1 = (-b - (Y1 + Y2)) / (3 * a);
                if (t1 >= 0 && t1 <= 1) {
                    roots[n++] = t1;
                }
            }
            else {
                const T = (2 * A * b - 3 * a * B) / (2 * mathSqrt(A * A * A));
                const theta = Math.acos(T) / 3;
                const ASqrt = mathSqrt(A);
                const tmp = Math.cos(theta);
                const t1 = (-b - 2 * ASqrt * tmp) / (3 * a);
                const t2 = (-b + ASqrt * (tmp + THREE_SQRT * Math.sin(theta))) / (3 * a);
                const t3 = (-b + ASqrt * (tmp - THREE_SQRT * Math.sin(theta))) / (3 * a);
                if (t1 >= 0 && t1 <= 1) {
                    roots[n++] = t1;
                }
                if (t2 >= 0 && t2 <= 1) {
                    roots[n++] = t2;
                }
                if (t3 >= 0 && t3 <= 1) {
                    roots[n++] = t3;
                }
            }
        }
        return n;
    }
    function cubicExtrema(p0, p1, p2, p3, extrema) {
        const b = 6 * p2 - 12 * p1 + 6 * p0;
        const a = 9 * p1 + 3 * p3 - 3 * p0 - 9 * p2;
        const c = 3 * p1 - 3 * p0;
        let n = 0;
        if (isAroundZero(a)) {
            if (isNotAroundZero(b)) {
                const t1 = -c / b;
                if (t1 >= 0 && t1 <= 1) {
                    extrema[n++] = t1;
                }
            }
        }
        else {
            const disc = b * b - 4 * a * c;
            if (isAroundZero(disc)) {
                extrema[0] = -b / (2 * a);
            }
            else if (disc > 0) {
                const discSqrt = mathSqrt(disc);
                const t1 = (-b + discSqrt) / (2 * a);
                const t2 = (-b - discSqrt) / (2 * a);
                if (t1 >= 0 && t1 <= 1) {
                    extrema[n++] = t1;
                }
                if (t2 >= 0 && t2 <= 1) {
                    extrema[n++] = t2;
                }
            }
        }
        return n;
    }
    function cubicSubdivide(p0, p1, p2, p3, t, out) {
        const p01 = (p1 - p0) * t + p0;
        const p12 = (p2 - p1) * t + p1;
        const p23 = (p3 - p2) * t + p2;
        const p012 = (p12 - p01) * t + p01;
        const p123 = (p23 - p12) * t + p12;
        const p0123 = (p123 - p012) * t + p012;
        out[0] = p0;
        out[1] = p01;
        out[2] = p012;
        out[3] = p0123;
        out[4] = p0123;
        out[5] = p123;
        out[6] = p23;
        out[7] = p3;
    }
    function cubicProjectPoint(x0, y0, x1, y1, x2, y2, x3, y3, x, y, out) {
        let t;
        let interval = 0.005;
        let d = Infinity;
        let prev;
        let next;
        let d1;
        let d2;
        _v0[0] = x;
        _v0[1] = y;
        for (let _t = 0; _t < 1; _t += 0.05) {
            _v1[0] = cubicAt(x0, x1, x2, x3, _t);
            _v1[1] = cubicAt(y0, y1, y2, y3, _t);
            d1 = distSquare(_v0, _v1);
            if (d1 < d) {
                t = _t;
                d = d1;
            }
        }
        d = Infinity;
        for (let i = 0; i < 32; i++) {
            if (interval < EPSILON_NUMERIC) {
                break;
            }
            prev = t - interval;
            next = t + interval;
            _v1[0] = cubicAt(x0, x1, x2, x3, prev);
            _v1[1] = cubicAt(y0, y1, y2, y3, prev);
            d1 = distSquare(_v1, _v0);
            if (prev >= 0 && d1 < d) {
                t = prev;
                d = d1;
            }
            else {
                _v2[0] = cubicAt(x0, x1, x2, x3, next);
                _v2[1] = cubicAt(y0, y1, y2, y3, next);
                d2 = distSquare(_v2, _v0);
                if (next <= 1 && d2 < d) {
                    t = next;
                    d = d2;
                }
                else {
                    interval *= 0.5;
                }
            }
        }
        if (out) {
            out[0] = cubicAt(x0, x1, x2, x3, t);
            out[1] = cubicAt(y0, y1, y2, y3, t);
        }
        return mathSqrt(d);
    }
    function cubicLength(x0, y0, x1, y1, x2, y2, x3, y3, iteration) {
        let px = x0;
        let py = y0;
        let d = 0;
        const step = 1 / iteration;
        for (let i = 1; i <= iteration; i++) {
            let t = i * step;
            const x = cubicAt(x0, x1, x2, x3, t);
            const y = cubicAt(y0, y1, y2, y3, t);
            const dx = x - px;
            const dy = y - py;
            d += Math.sqrt(dx * dx + dy * dy);
            px = x;
            py = y;
        }
        return d;
    }
    function quadraticAt(p0, p1, p2, t) {
        const onet = 1 - t;
        return onet * (onet * p0 + 2 * t * p1) + t * t * p2;
    }
    function quadraticDerivativeAt(p0, p1, p2, t) {
        return 2 * ((1 - t) * (p1 - p0) + t * (p2 - p1));
    }
    function quadraticRootAt(p0, p1, p2, val, roots) {
        const a = p0 - 2 * p1 + p2;
        const b = 2 * (p1 - p0);
        const c = p0 - val;
        let n = 0;
        if (isAroundZero(a)) {
            if (isNotAroundZero(b)) {
                const t1 = -c / b;
                if (t1 >= 0 && t1 <= 1) {
                    roots[n++] = t1;
                }
            }
        }
        else {
            const disc = b * b - 4 * a * c;
            if (isAroundZero(disc)) {
                const t1 = -b / (2 * a);
                if (t1 >= 0 && t1 <= 1) {
                    roots[n++] = t1;
                }
            }
            else if (disc > 0) {
                const discSqrt = mathSqrt(disc);
                const t1 = (-b + discSqrt) / (2 * a);
                const t2 = (-b - discSqrt) / (2 * a);
                if (t1 >= 0 && t1 <= 1) {
                    roots[n++] = t1;
                }
                if (t2 >= 0 && t2 <= 1) {
                    roots[n++] = t2;
                }
            }
        }
        return n;
    }
    function quadraticExtremum(p0, p1, p2) {
        const divider = p0 + p2 - 2 * p1;
        if (divider === 0) {
            return 0.5;
        }
        else {
            return (p0 - p1) / divider;
        }
    }
    function quadraticSubdivide(p0, p1, p2, t, out) {
        const p01 = (p1 - p0) * t + p0;
        const p12 = (p2 - p1) * t + p1;
        const p012 = (p12 - p01) * t + p01;
        out[0] = p0;
        out[1] = p01;
        out[2] = p012;
        out[3] = p012;
        out[4] = p12;
        out[5] = p2;
    }
    function quadraticProjectPoint(x0, y0, x1, y1, x2, y2, x, y, out) {
        let t;
        let interval = 0.005;
        let d = Infinity;
        _v0[0] = x;
        _v0[1] = y;
        for (let _t = 0; _t < 1; _t += 0.05) {
            _v1[0] = quadraticAt(x0, x1, x2, _t);
            _v1[1] = quadraticAt(y0, y1, y2, _t);
            const d1 = distSquare(_v0, _v1);
            if (d1 < d) {
                t = _t;
                d = d1;
            }
        }
        d = Infinity;
        for (let i = 0; i < 32; i++) {
            if (interval < EPSILON_NUMERIC) {
                break;
            }
            const prev = t - interval;
            const next = t + interval;
            _v1[0] = quadraticAt(x0, x1, x2, prev);
            _v1[1] = quadraticAt(y0, y1, y2, prev);
            const d1 = distSquare(_v1, _v0);
            if (prev >= 0 && d1 < d) {
                t = prev;
                d = d1;
            }
            else {
                _v2[0] = quadraticAt(x0, x1, x2, next);
                _v2[1] = quadraticAt(y0, y1, y2, next);
                const d2 = distSquare(_v2, _v0);
                if (next <= 1 && d2 < d) {
                    t = next;
                    d = d2;
                }
                else {
                    interval *= 0.5;
                }
            }
        }
        if (out) {
            out[0] = quadraticAt(x0, x1, x2, t);
            out[1] = quadraticAt(y0, y1, y2, t);
        }
        return mathSqrt(d);
    }
    function quadraticLength(x0, y0, x1, y1, x2, y2, iteration) {
        let px = x0;
        let py = y0;
        let d = 0;
        const step = 1 / iteration;
        for (let i = 1; i <= iteration; i++) {
            let t = i * step;
            const x = quadraticAt(x0, x1, x2, t);
            const y = quadraticAt(y0, y1, y2, t);
            const dx = x - px;
            const dy = y - py;
            d += Math.sqrt(dx * dx + dy * dy);
            px = x;
            py = y;
        }
        return d;
    }

    const regexp = /cubic-bezier\(([0-9,\.e ]+)\)/;
    function createCubicEasingFunc(cubicEasingStr) {
        const cubic = cubicEasingStr && regexp.exec(cubicEasingStr);
        if (cubic) {
            const points = cubic[1].split(',');
            const a = +trim(points[0]);
            const b = +trim(points[1]);
            const c = +trim(points[2]);
            const d = +trim(points[3]);
            if (isNaN(a + b + c + d)) {
                return;
            }
            const roots = [];
            return (p) => {
                return p <= 0
                    ? 0 : p >= 1
                    ? 1
                    : cubicRootAt(0, a, c, 1, p, roots) && cubicAt(0, b, d, 1, roots[0]);
            };
        }
    }

    class Clip {
        constructor(opts) {
            this._inited = false;
            this._startTime = 0;
            this._pausedTime = 0;
            this._paused = false;
            this._life = opts.life || 1000;
            this._delay = opts.delay || 0;
            this.loop = opts.loop || false;
            this.onframe = opts.onframe || noop;
            this.ondestroy = opts.ondestroy || noop;
            this.onrestart = opts.onrestart || noop;
            opts.easing && this.setEasing(opts.easing);
        }
        step(globalTime, deltaTime) {
            if (!this._inited) {
                this._startTime = globalTime + this._delay;
                this._inited = true;
            }
            if (this._paused) {
                this._pausedTime += deltaTime;
                return;
            }
            const life = this._life;
            let elapsedTime = globalTime - this._startTime - this._pausedTime;
            let percent = elapsedTime / life;
            if (percent < 0) {
                percent = 0;
            }
            percent = Math.min(percent, 1);
            const easingFunc = this.easingFunc;
            const schedule = easingFunc ? easingFunc(percent) : percent;
            this.onframe(schedule);
            if (percent === 1) {
                if (this.loop) {
                    const remainder = elapsedTime % life;
                    this._startTime = globalTime - remainder;
                    this._pausedTime = 0;
                    this.onrestart();
                }
                else {
                    return true;
                }
            }
            return false;
        }
        pause() {
            this._paused = true;
        }
        resume() {
            this._paused = false;
        }
        setEasing(easing) {
            this.easing = easing;
            this.easingFunc = isFunction(easing)
                ? easing
                : easingFuncs[easing] || createCubicEasingFunc(easing);
        }
    }

    class Entry {
        constructor(val) {
            this.value = val;
        }
    }
    class LinkedList {
        constructor() {
            this._len = 0;
        }
        insert(val) {
            const entry = new Entry(val);
            this.insertEntry(entry);
            return entry;
        }
        insertEntry(entry) {
            if (!this.head) {
                this.head = this.tail = entry;
            }
            else {
                this.tail.next = entry;
                entry.prev = this.tail;
                entry.next = null;
                this.tail = entry;
            }
            this._len++;
        }
        remove(entry) {
            const prev = entry.prev;
            const next = entry.next;
            if (prev) {
                prev.next = next;
            }
            else {
                this.head = next;
            }
            if (next) {
                next.prev = prev;
            }
            else {
                this.tail = prev;
            }
            entry.next = entry.prev = null;
            this._len--;
        }
        len() {
            return this._len;
        }
        clear() {
            this.head = this.tail = null;
            this._len = 0;
        }
    }
    class LRU {
        constructor(maxSize) {
            this._list = new LinkedList();
            this._maxSize = 10;
            this._map = {};
            this._maxSize = maxSize;
        }
        put(key, value) {
            const list = this._list;
            const map = this._map;
            let removed = null;
            if (map[key] == null) {
                const len = list.len();
                let entry = this._lastRemovedEntry;
                if (len >= this._maxSize && len > 0) {
                    const leastUsedEntry = list.head;
                    list.remove(leastUsedEntry);
                    delete map[leastUsedEntry.key];
                    removed = leastUsedEntry.value;
                    this._lastRemovedEntry = leastUsedEntry;
                }
                if (entry) {
                    entry.value = value;
                }
                else {
                    entry = new Entry(value);
                }
                entry.key = key;
                list.insertEntry(entry);
                map[key] = entry;
            }
            return removed;
        }
        get(key) {
            const entry = this._map[key];
            const list = this._list;
            if (entry != null) {
                if (entry !== list.tail) {
                    list.remove(entry);
                    list.insertEntry(entry);
                }
                return entry.value;
            }
        }
        clear() {
            this._list.clear();
            this._map = {};
        }
        len() {
            return this._list.len();
        }
    }

    const kCSSColorTable = {
        'transparent': [0, 0, 0, 0], 'aliceblue': [240, 248, 255, 1],
        'antiquewhite': [250, 235, 215, 1], 'aqua': [0, 255, 255, 1],
        'aquamarine': [127, 255, 212, 1], 'azure': [240, 255, 255, 1],
        'beige': [245, 245, 220, 1], 'bisque': [255, 228, 196, 1],
        'black': [0, 0, 0, 1], 'blanchedalmond': [255, 235, 205, 1],
        'blue': [0, 0, 255, 1], 'blueviolet': [138, 43, 226, 1],
        'brown': [165, 42, 42, 1], 'burlywood': [222, 184, 135, 1],
        'cadetblue': [95, 158, 160, 1], 'chartreuse': [127, 255, 0, 1],
        'chocolate': [210, 105, 30, 1], 'coral': [255, 127, 80, 1],
        'cornflowerblue': [100, 149, 237, 1], 'cornsilk': [255, 248, 220, 1],
        'crimson': [220, 20, 60, 1], 'cyan': [0, 255, 255, 1],
        'darkblue': [0, 0, 139, 1], 'darkcyan': [0, 139, 139, 1],
        'darkgoldenrod': [184, 134, 11, 1], 'darkgray': [169, 169, 169, 1],
        'darkgreen': [0, 100, 0, 1], 'darkgrey': [169, 169, 169, 1],
        'darkkhaki': [189, 183, 107, 1], 'darkmagenta': [139, 0, 139, 1],
        'darkolivegreen': [85, 107, 47, 1], 'darkorange': [255, 140, 0, 1],
        'darkorchid': [153, 50, 204, 1], 'darkred': [139, 0, 0, 1],
        'darksalmon': [233, 150, 122, 1], 'darkseagreen': [143, 188, 143, 1],
        'darkslateblue': [72, 61, 139, 1], 'darkslategray': [47, 79, 79, 1],
        'darkslategrey': [47, 79, 79, 1], 'darkturquoise': [0, 206, 209, 1],
        'darkviolet': [148, 0, 211, 1], 'deeppink': [255, 20, 147, 1],
        'deepskyblue': [0, 191, 255, 1], 'dimgray': [105, 105, 105, 1],
        'dimgrey': [105, 105, 105, 1], 'dodgerblue': [30, 144, 255, 1],
        'firebrick': [178, 34, 34, 1], 'floralwhite': [255, 250, 240, 1],
        'forestgreen': [34, 139, 34, 1], 'fuchsia': [255, 0, 255, 1],
        'gainsboro': [220, 220, 220, 1], 'ghostwhite': [248, 248, 255, 1],
        'gold': [255, 215, 0, 1], 'goldenrod': [218, 165, 32, 1],
        'gray': [128, 128, 128, 1], 'green': [0, 128, 0, 1],
        'greenyellow': [173, 255, 47, 1], 'grey': [128, 128, 128, 1],
        'honeydew': [240, 255, 240, 1], 'hotpink': [255, 105, 180, 1],
        'indianred': [205, 92, 92, 1], 'indigo': [75, 0, 130, 1],
        'ivory': [255, 255, 240, 1], 'khaki': [240, 230, 140, 1],
        'lavender': [230, 230, 250, 1], 'lavenderblush': [255, 240, 245, 1],
        'lawngreen': [124, 252, 0, 1], 'lemonchiffon': [255, 250, 205, 1],
        'lightblue': [173, 216, 230, 1], 'lightcoral': [240, 128, 128, 1],
        'lightcyan': [224, 255, 255, 1], 'lightgoldenrodyellow': [250, 250, 210, 1],
        'lightgray': [211, 211, 211, 1], 'lightgreen': [144, 238, 144, 1],
        'lightgrey': [211, 211, 211, 1], 'lightpink': [255, 182, 193, 1],
        'lightsalmon': [255, 160, 122, 1], 'lightseagreen': [32, 178, 170, 1],
        'lightskyblue': [135, 206, 250, 1], 'lightslategray': [119, 136, 153, 1],
        'lightslategrey': [119, 136, 153, 1], 'lightsteelblue': [176, 196, 222, 1],
        'lightyellow': [255, 255, 224, 1], 'lime': [0, 255, 0, 1],
        'limegreen': [50, 205, 50, 1], 'linen': [250, 240, 230, 1],
        'magenta': [255, 0, 255, 1], 'maroon': [128, 0, 0, 1],
        'mediumaquamarine': [102, 205, 170, 1], 'mediumblue': [0, 0, 205, 1],
        'mediumorchid': [186, 85, 211, 1], 'mediumpurple': [147, 112, 219, 1],
        'mediumseagreen': [60, 179, 113, 1], 'mediumslateblue': [123, 104, 238, 1],
        'mediumspringgreen': [0, 250, 154, 1], 'mediumturquoise': [72, 209, 204, 1],
        'mediumvioletred': [199, 21, 133, 1], 'midnightblue': [25, 25, 112, 1],
        'mintcream': [245, 255, 250, 1], 'mistyrose': [255, 228, 225, 1],
        'moccasin': [255, 228, 181, 1], 'navajowhite': [255, 222, 173, 1],
        'navy': [0, 0, 128, 1], 'oldlace': [253, 245, 230, 1],
        'olive': [128, 128, 0, 1], 'olivedrab': [107, 142, 35, 1],
        'orange': [255, 165, 0, 1], 'orangered': [255, 69, 0, 1],
        'orchid': [218, 112, 214, 1], 'palegoldenrod': [238, 232, 170, 1],
        'palegreen': [152, 251, 152, 1], 'paleturquoise': [175, 238, 238, 1],
        'palevioletred': [219, 112, 147, 1], 'papayawhip': [255, 239, 213, 1],
        'peachpuff': [255, 218, 185, 1], 'peru': [205, 133, 63, 1],
        'pink': [255, 192, 203, 1], 'plum': [221, 160, 221, 1],
        'powderblue': [176, 224, 230, 1], 'purple': [128, 0, 128, 1],
        'red': [255, 0, 0, 1], 'rosybrown': [188, 143, 143, 1],
        'royalblue': [65, 105, 225, 1], 'saddlebrown': [139, 69, 19, 1],
        'salmon': [250, 128, 114, 1], 'sandybrown': [244, 164, 96, 1],
        'seagreen': [46, 139, 87, 1], 'seashell': [255, 245, 238, 1],
        'sienna': [160, 82, 45, 1], 'silver': [192, 192, 192, 1],
        'skyblue': [135, 206, 235, 1], 'slateblue': [106, 90, 205, 1],
        'slategray': [112, 128, 144, 1], 'slategrey': [112, 128, 144, 1],
        'snow': [255, 250, 250, 1], 'springgreen': [0, 255, 127, 1],
        'steelblue': [70, 130, 180, 1], 'tan': [210, 180, 140, 1],
        'teal': [0, 128, 128, 1], 'thistle': [216, 191, 216, 1],
        'tomato': [255, 99, 71, 1], 'turquoise': [64, 224, 208, 1],
        'violet': [238, 130, 238, 1], 'wheat': [245, 222, 179, 1],
        'white': [255, 255, 255, 1], 'whitesmoke': [245, 245, 245, 1],
        'yellow': [255, 255, 0, 1], 'yellowgreen': [154, 205, 50, 1]
    };
    function clampCssByte(i) {
        i = Math.round(i);
        return i < 0 ? 0 : i > 255 ? 255 : i;
    }
    function clampCssAngle(i) {
        i = Math.round(i);
        return i < 0 ? 0 : i > 360 ? 360 : i;
    }
    function clampCssFloat(f) {
        return f < 0 ? 0 : f > 1 ? 1 : f;
    }
    function parseCssInt(val) {
        let str = val;
        if (str.length && str.charAt(str.length - 1) === '%') {
            return clampCssByte(parseFloat(str) / 100 * 255);
        }
        return clampCssByte(parseInt(str, 10));
    }
    function parseCssFloat(val) {
        let str = val;
        if (str.length && str.charAt(str.length - 1) === '%') {
            return clampCssFloat(parseFloat(str) / 100);
        }
        return clampCssFloat(parseFloat(str));
    }
    function cssHueToRgb(m1, m2, h) {
        if (h < 0) {
            h += 1;
        }
        else if (h > 1) {
            h -= 1;
        }
        if (h * 6 < 1) {
            return m1 + (m2 - m1) * h * 6;
        }
        if (h * 2 < 1) {
            return m2;
        }
        if (h * 3 < 2) {
            return m1 + (m2 - m1) * (2 / 3 - h) * 6;
        }
        return m1;
    }
    function lerpNumber(a, b, p) {
        return a + (b - a) * p;
    }
    function setRgba(out, r, g, b, a) {
        out[0] = r;
        out[1] = g;
        out[2] = b;
        out[3] = a;
        return out;
    }
    function copyRgba(out, a) {
        out[0] = a[0];
        out[1] = a[1];
        out[2] = a[2];
        out[3] = a[3];
        return out;
    }
    const colorCache = new LRU(20);
    let lastRemovedArr = null;
    function putToCache(colorStr, rgbaArr) {
        if (lastRemovedArr) {
            copyRgba(lastRemovedArr, rgbaArr);
        }
        lastRemovedArr = colorCache.put(colorStr, lastRemovedArr || (rgbaArr.slice()));
    }
    function parse(colorStr, rgbaArr) {
        if (!colorStr) {
            return;
        }
        rgbaArr = rgbaArr || [];
        let cached = colorCache.get(colorStr);
        if (cached) {
            return copyRgba(rgbaArr, cached);
        }
        colorStr = colorStr + '';
        let str = colorStr.replace(/ /g, '').toLowerCase();
        if (str in kCSSColorTable) {
            copyRgba(rgbaArr, kCSSColorTable[str]);
            putToCache(colorStr, rgbaArr);
            return rgbaArr;
        }
        const strLen = str.length;
        if (str.charAt(0) === '#') {
            if (strLen === 4 || strLen === 5) {
                const iv = parseInt(str.slice(1, 4), 16);
                if (!(iv >= 0 && iv <= 0xfff)) {
                    setRgba(rgbaArr, 0, 0, 0, 1);
                    return;
                }
                setRgba(rgbaArr, ((iv & 0xf00) >> 4) | ((iv & 0xf00) >> 8), (iv & 0xf0) | ((iv & 0xf0) >> 4), (iv & 0xf) | ((iv & 0xf) << 4), strLen === 5 ? parseInt(str.slice(4), 16) / 0xf : 1);
                putToCache(colorStr, rgbaArr);
                return rgbaArr;
            }
            else if (strLen === 7 || strLen === 9) {
                const iv = parseInt(str.slice(1, 7), 16);
                if (!(iv >= 0 && iv <= 0xffffff)) {
                    setRgba(rgbaArr, 0, 0, 0, 1);
                    return;
                }
                setRgba(rgbaArr, (iv & 0xff0000) >> 16, (iv & 0xff00) >> 8, iv & 0xff, strLen === 9 ? parseInt(str.slice(7), 16) / 0xff : 1);
                putToCache(colorStr, rgbaArr);
                return rgbaArr;
            }
            return;
        }
        let op = str.indexOf('(');
        let ep = str.indexOf(')');
        if (op !== -1 && ep + 1 === strLen) {
            let fname = str.substr(0, op);
            let params = str.substr(op + 1, ep - (op + 1)).split(',');
            let alpha = 1;
            switch (fname) {
                case 'rgba':
                    if (params.length !== 4) {
                        return params.length === 3
                            ? setRgba(rgbaArr, +params[0], +params[1], +params[2], 1)
                            : setRgba(rgbaArr, 0, 0, 0, 1);
                    }
                    alpha = parseCssFloat(params.pop());
                case 'rgb':
                    if (params.length >= 3) {
                        setRgba(rgbaArr, parseCssInt(params[0]), parseCssInt(params[1]), parseCssInt(params[2]), params.length === 3 ? alpha : parseCssFloat(params[3]));
                        putToCache(colorStr, rgbaArr);
                        return rgbaArr;
                    }
                    else {
                        setRgba(rgbaArr, 0, 0, 0, 1);
                        return;
                    }
                case 'hsla':
                    if (params.length !== 4) {
                        setRgba(rgbaArr, 0, 0, 0, 1);
                        return;
                    }
                    params[3] = parseCssFloat(params[3]);
                    hsla2rgba(params, rgbaArr);
                    putToCache(colorStr, rgbaArr);
                    return rgbaArr;
                case 'hsl':
                    if (params.length !== 3) {
                        setRgba(rgbaArr, 0, 0, 0, 1);
                        return;
                    }
                    hsla2rgba(params, rgbaArr);
                    putToCache(colorStr, rgbaArr);
                    return rgbaArr;
                default:
                    return;
            }
        }
        setRgba(rgbaArr, 0, 0, 0, 1);
        return;
    }
    function hsla2rgba(hsla, rgba) {
        const h = (((parseFloat(hsla[0]) % 360) + 360) % 360) / 360;
        const s = parseCssFloat(hsla[1]);
        const l = parseCssFloat(hsla[2]);
        const m2 = l <= 0.5 ? l * (s + 1) : l + s - l * s;
        const m1 = l * 2 - m2;
        rgba = rgba || [];
        setRgba(rgba, clampCssByte(cssHueToRgb(m1, m2, h + 1 / 3) * 255), clampCssByte(cssHueToRgb(m1, m2, h) * 255), clampCssByte(cssHueToRgb(m1, m2, h - 1 / 3) * 255), 1);
        if (hsla.length === 4) {
            rgba[3] = hsla[3];
        }
        return rgba;
    }
    function rgba2hsla(rgba) {
        if (!rgba) {
            return;
        }
        const R = rgba[0] / 255;
        const G = rgba[1] / 255;
        const B = rgba[2] / 255;
        const vMin = Math.min(R, G, B);
        const vMax = Math.max(R, G, B);
        const delta = vMax - vMin;
        const L = (vMax + vMin) / 2;
        let H;
        let S;
        if (delta === 0) {
            H = 0;
            S = 0;
        }
        else {
            if (L < 0.5) {
                S = delta / (vMax + vMin);
            }
            else {
                S = delta / (2 - vMax - vMin);
            }
            const deltaR = (((vMax - R) / 6) + (delta / 2)) / delta;
            const deltaG = (((vMax - G) / 6) + (delta / 2)) / delta;
            const deltaB = (((vMax - B) / 6) + (delta / 2)) / delta;
            if (R === vMax) {
                H = deltaB - deltaG;
            }
            else if (G === vMax) {
                H = (1 / 3) + deltaR - deltaB;
            }
            else if (B === vMax) {
                H = (2 / 3) + deltaG - deltaR;
            }
            if (H < 0) {
                H += 1;
            }
            if (H > 1) {
                H -= 1;
            }
        }
        const hsla = [H * 360, S, L];
        if (rgba[3] != null) {
            hsla.push(rgba[3]);
        }
        return hsla;
    }
    function lift(color, level) {
        const colorArr = parse(color);
        if (colorArr) {
            for (let i = 0; i < 3; i++) {
                if (level < 0) {
                    colorArr[i] = colorArr[i] * (1 - level) | 0;
                }
                else {
                    colorArr[i] = ((255 - colorArr[i]) * level + colorArr[i]) | 0;
                }
                if (colorArr[i] > 255) {
                    colorArr[i] = 255;
                }
                else if (colorArr[i] < 0) {
                    colorArr[i] = 0;
                }
            }
            return stringify(colorArr, colorArr.length === 4 ? 'rgba' : 'rgb');
        }
    }
    function toHex(color) {
        const colorArr = parse(color);
        if (colorArr) {
            return ((1 << 24) + (colorArr[0] << 16) + (colorArr[1] << 8) + (+colorArr[2])).toString(16).slice(1);
        }
    }
    function fastLerp(normalizedValue, colors, out) {
        if (!(colors && colors.length)
            || !(normalizedValue >= 0 && normalizedValue <= 1)) {
            return;
        }
        out = out || [];
        const value = normalizedValue * (colors.length - 1);
        const leftIndex = Math.floor(value);
        const rightIndex = Math.ceil(value);
        const leftColor = colors[leftIndex];
        const rightColor = colors[rightIndex];
        const dv = value - leftIndex;
        out[0] = clampCssByte(lerpNumber(leftColor[0], rightColor[0], dv));
        out[1] = clampCssByte(lerpNumber(leftColor[1], rightColor[1], dv));
        out[2] = clampCssByte(lerpNumber(leftColor[2], rightColor[2], dv));
        out[3] = clampCssFloat(lerpNumber(leftColor[3], rightColor[3], dv));
        return out;
    }
    const fastMapToColor = fastLerp;
    function lerp$1(normalizedValue, colors, fullOutput) {
        if (!(colors && colors.length)
            || !(normalizedValue >= 0 && normalizedValue <= 1)) {
            return;
        }
        const value = normalizedValue * (colors.length - 1);
        const leftIndex = Math.floor(value);
        const rightIndex = Math.ceil(value);
        const leftColor = parse(colors[leftIndex]);
        const rightColor = parse(colors[rightIndex]);
        const dv = value - leftIndex;
        const color = stringify([
            clampCssByte(lerpNumber(leftColor[0], rightColor[0], dv)),
            clampCssByte(lerpNumber(leftColor[1], rightColor[1], dv)),
            clampCssByte(lerpNumber(leftColor[2], rightColor[2], dv)),
            clampCssFloat(lerpNumber(leftColor[3], rightColor[3], dv))
        ], 'rgba');
        return fullOutput
            ? {
                color: color,
                leftIndex: leftIndex,
                rightIndex: rightIndex,
                value: value
            }
            : color;
    }
    const mapToColor = lerp$1;
    function modifyHSL(color, h, s, l) {
        let colorArr = parse(color);
        if (color) {
            colorArr = rgba2hsla(colorArr);
            h != null && (colorArr[0] = clampCssAngle(h));
            s != null && (colorArr[1] = parseCssFloat(s));
            l != null && (colorArr[2] = parseCssFloat(l));
            return stringify(hsla2rgba(colorArr), 'rgba');
        }
    }
    function modifyAlpha(color, alpha) {
        const colorArr = parse(color);
        if (colorArr && alpha != null) {
            colorArr[3] = clampCssFloat(alpha);
            return stringify(colorArr, 'rgba');
        }
    }
    function stringify(arrColor, type) {
        if (!arrColor || !arrColor.length) {
            return;
        }
        let colorStr = arrColor[0] + ',' + arrColor[1] + ',' + arrColor[2];
        if (type === 'rgba' || type === 'hsva' || type === 'hsla') {
            colorStr += ',' + arrColor[3];
        }
        return type + '(' + colorStr + ')';
    }
    function lum(color, backgroundLum) {
        const arr = parse(color);
        return arr
            ? (0.299 * arr[0] + 0.587 * arr[1] + 0.114 * arr[2]) * arr[3] / 255
                + (1 - arr[3]) * backgroundLum
            : 0;
    }
    function random() {
        return stringify([
            Math.round(Math.random() * 255),
            Math.round(Math.random() * 255),
            Math.round(Math.random() * 255)
        ], 'rgb');
    }
    const liftedColorCache = new LRU(100);
    function liftColor(color) {
        if (isString(color)) {
            let liftedColor = liftedColorCache.get(color);
            if (!liftedColor) {
                liftedColor = lift(color, -0.1);
                liftedColorCache.put(color, liftedColor);
            }
            return liftedColor;
        }
        else if (isGradientObject(color)) {
            const ret = extend({}, color);
            ret.colorStops = map(color.colorStops, stop => ({
                offset: stop.offset,
                color: lift(stop.color, -0.1)
            }));
            return ret;
        }
        return color;
    }

    var color = /*#__PURE__*/Object.freeze({
        __proto__: null,
        parse: parse,
        lift: lift,
        toHex: toHex,
        fastLerp: fastLerp,
        fastMapToColor: fastMapToColor,
        lerp: lerp$1,
        mapToColor: mapToColor,
        modifyHSL: modifyHSL,
        modifyAlpha: modifyAlpha,
        stringify: stringify,
        lum: lum,
        random: random,
        liftColor: liftColor
    });

    const mathRound = Math.round;
    function normalizeColor(color) {
        let opacity;
        if (!color || color === 'transparent') {
            color = 'none';
        }
        else if (typeof color === 'string' && color.indexOf('rgba') > -1) {
            const arr = parse(color);
            if (arr) {
                color = 'rgb(' + arr[0] + ',' + arr[1] + ',' + arr[2] + ')';
                opacity = arr[3];
            }
        }
        return {
            color,
            opacity: opacity == null ? 1 : opacity
        };
    }
    const EPSILON$1 = 1e-4;
    function isAroundZero$1(transform) {
        return transform < EPSILON$1 && transform > -EPSILON$1;
    }
    function round3(transform) {
        return mathRound(transform * 1e3) / 1e3;
    }
    function round4(transform) {
        return mathRound(transform * 1e4) / 1e4;
    }
    function getMatrixStr(m) {
        return 'matrix('
            + round3(m[0]) + ','
            + round3(m[1]) + ','
            + round3(m[2]) + ','
            + round3(m[3]) + ','
            + round4(m[4]) + ','
            + round4(m[5])
            + ')';
    }
    const TEXT_ALIGN_TO_ANCHOR = {
        left: 'start',
        right: 'end',
        center: 'middle',
        middle: 'middle'
    };
    function adjustTextY(y, lineHeight, textBaseline) {
        if (textBaseline === 'top') {
            y += lineHeight / 2;
        }
        else if (textBaseline === 'bottom') {
            y -= lineHeight / 2;
        }
        return y;
    }
    function hasShadow(style) {
        return style
            && (style.shadowBlur || style.shadowOffsetX || style.shadowOffsetY);
    }
    function getShadowKey(displayable) {
        const style = displayable.style;
        const globalScale = displayable.getGlobalScale();
        return [
            style.shadowColor,
            (style.shadowBlur || 0).toFixed(2),
            (style.shadowOffsetX || 0).toFixed(2),
            (style.shadowOffsetY || 0).toFixed(2),
            globalScale[0],
            globalScale[1]
        ].join(',');
    }
    function isImagePattern(val) {
        return val && (!!val.image);
    }
    function isSVGPattern(val) {
        return val && (!!val.svgElement);
    }
    function isPattern(val) {
        return isImagePattern(val) || isSVGPattern(val);
    }
    function isLinearGradient(val) {
        return val.type === 'linear';
    }
    function isRadialGradient(val) {
        return val.type === 'radial';
    }
    function isGradient(val) {
        return val && (val.type === 'linear'
            || val.type === 'radial');
    }
    function getIdURL(id) {
        return `url(#${id})`;
    }
    function getPathPrecision(el) {
        const scale = el.getGlobalScale();
        const size = Math.max(scale[0], scale[1]);
        return Math.max(Math.ceil(Math.log(size) / Math.log(10)), 1);
    }
    function getSRTTransformString(transform) {
        const x = transform.x || 0;
        const y = transform.y || 0;
        const rotation = (transform.rotation || 0) * RADIAN_TO_DEGREE;
        const scaleX = retrieve2(transform.scaleX, 1);
        const scaleY = retrieve2(transform.scaleY, 1);
        const skewX = transform.skewX || 0;
        const skewY = transform.skewY || 0;
        const res = [];
        if (x || y) {
            res.push(`translate(${x}px,${y}px)`);
        }
        if (rotation) {
            res.push(`rotate(${rotation})`);
        }
        if (scaleX !== 1 || scaleY !== 1) {
            res.push(`scale(${scaleX},${scaleY})`);
        }
        if (skewX || skewY) {
            res.push(`skew(${mathRound(skewX * RADIAN_TO_DEGREE)}deg, ${mathRound(skewY * RADIAN_TO_DEGREE)}deg)`);
        }
        return res.join(' ');
    }
    const encodeBase64 = (function () {
        if (env.hasGlobalWindow && isFunction(window.btoa)) {
            return function (str) {
                return window.btoa(unescape(encodeURIComponent(str)));
            };
        }
        if (typeof Buffer !== 'undefined') {
            return function (str) {
                return Buffer.from(str).toString('base64');
            };
        }
        return function (str) {
            {
                logError('Base64 isn\'t natively supported in the current environment.');
            }
            return null;
        };
    })();

    const arraySlice = Array.prototype.slice;
    function interpolateNumber(p0, p1, percent) {
        return (p1 - p0) * percent + p0;
    }
    function interpolate1DArray(out, p0, p1, percent) {
        const len = p0.length;
        for (let i = 0; i < len; i++) {
            out[i] = interpolateNumber(p0[i], p1[i], percent);
        }
        return out;
    }
    function interpolate2DArray(out, p0, p1, percent) {
        const len = p0.length;
        const len2 = len && p0[0].length;
        for (let i = 0; i < len; i++) {
            if (!out[i]) {
                out[i] = [];
            }
            for (let j = 0; j < len2; j++) {
                out[i][j] = interpolateNumber(p0[i][j], p1[i][j], percent);
            }
        }
        return out;
    }
    function add1DArray(out, p0, p1, sign) {
        const len = p0.length;
        for (let i = 0; i < len; i++) {
            out[i] = p0[i] + p1[i] * sign;
        }
        return out;
    }
    function add2DArray(out, p0, p1, sign) {
        const len = p0.length;
        const len2 = len && p0[0].length;
        for (let i = 0; i < len; i++) {
            if (!out[i]) {
                out[i] = [];
            }
            for (let j = 0; j < len2; j++) {
                out[i][j] = p0[i][j] + p1[i][j] * sign;
            }
        }
        return out;
    }
    function fillColorStops(val0, val1) {
        const len0 = val0.length;
        const len1 = val1.length;
        const shorterArr = len0 > len1 ? val1 : val0;
        const shorterLen = Math.min(len0, len1);
        const last = shorterArr[shorterLen - 1] || { color: [0, 0, 0, 0], offset: 0 };
        for (let i = shorterLen; i < Math.max(len0, len1); i++) {
            shorterArr.push({
                offset: last.offset,
                color: last.color.slice()
            });
        }
    }
    function fillArray(val0, val1, arrDim) {
        let arr0 = val0;
        let arr1 = val1;
        if (!arr0.push || !arr1.push) {
            return;
        }
        const arr0Len = arr0.length;
        const arr1Len = arr1.length;
        if (arr0Len !== arr1Len) {
            const isPreviousLarger = arr0Len > arr1Len;
            if (isPreviousLarger) {
                arr0.length = arr1Len;
            }
            else {
                for (let i = arr0Len; i < arr1Len; i++) {
                    arr0.push(arrDim === 1 ? arr1[i] : arraySlice.call(arr1[i]));
                }
            }
        }
        const len2 = arr0[0] && arr0[0].length;
        for (let i = 0; i < arr0.length; i++) {
            if (arrDim === 1) {
                if (isNaN(arr0[i])) {
                    arr0[i] = arr1[i];
                }
            }
            else {
                for (let j = 0; j < len2; j++) {
                    if (isNaN(arr0[i][j])) {
                        arr0[i][j] = arr1[i][j];
                    }
                }
            }
        }
    }
    function cloneValue(value) {
        if (isArrayLike(value)) {
            const len = value.length;
            if (isArrayLike(value[0])) {
                const ret = [];
                for (let i = 0; i < len; i++) {
                    ret.push(arraySlice.call(value[i]));
                }
                return ret;
            }
            return arraySlice.call(value);
        }
        return value;
    }
    function rgba2String(rgba) {
        rgba[0] = Math.floor(rgba[0]) || 0;
        rgba[1] = Math.floor(rgba[1]) || 0;
        rgba[2] = Math.floor(rgba[2]) || 0;
        rgba[3] = rgba[3] == null ? 1 : rgba[3];
        return 'rgba(' + rgba.join(',') + ')';
    }
    function guessArrayDim(value) {
        return isArrayLike(value && value[0]) ? 2 : 1;
    }
    const VALUE_TYPE_NUMBER = 0;
    const VALUE_TYPE_1D_ARRAY = 1;
    const VALUE_TYPE_2D_ARRAY = 2;
    const VALUE_TYPE_COLOR = 3;
    const VALUE_TYPE_LINEAR_GRADIENT = 4;
    const VALUE_TYPE_RADIAL_GRADIENT = 5;
    const VALUE_TYPE_UNKOWN = 6;
    function isGradientValueType(valType) {
        return valType === VALUE_TYPE_LINEAR_GRADIENT || valType === VALUE_TYPE_RADIAL_GRADIENT;
    }
    function isArrayValueType(valType) {
        return valType === VALUE_TYPE_1D_ARRAY || valType === VALUE_TYPE_2D_ARRAY;
    }
    let tmpRgba = [0, 0, 0, 0];
    class Track {
        constructor(propName) {
            this.keyframes = [];
            this.discrete = false;
            this._invalid = false;
            this._needsSort = false;
            this._lastFr = 0;
            this._lastFrP = 0;
            this.propName = propName;
        }
        isFinished() {
            return this._finished;
        }
        setFinished() {
            this._finished = true;
            if (this._additiveTrack) {
                this._additiveTrack.setFinished();
            }
        }
        needsAnimate() {
            return this.keyframes.length >= 1;
        }
        getAdditiveTrack() {
            return this._additiveTrack;
        }
        addKeyframe(time, rawValue, easing) {
            this._needsSort = true;
            let keyframes = this.keyframes;
            let len = keyframes.length;
            let discrete = false;
            let valType = VALUE_TYPE_UNKOWN;
            let value = rawValue;
            if (isArrayLike(rawValue)) {
                let arrayDim = guessArrayDim(rawValue);
                valType = arrayDim;
                if (arrayDim === 1 && !isNumber(rawValue[0])
                    || arrayDim === 2 && !isNumber(rawValue[0][0])) {
                    discrete = true;
                }
            }
            else {
                if (isNumber(rawValue) && !eqNaN(rawValue)) {
                    valType = VALUE_TYPE_NUMBER;
                }
                else if (isString(rawValue)) {
                    if (!isNaN(+rawValue)) {
                        valType = VALUE_TYPE_NUMBER;
                    }
                    else {
                        const colorArray = parse(rawValue);
                        if (colorArray) {
                            value = colorArray;
                            valType = VALUE_TYPE_COLOR;
                        }
                    }
                }
                else if (isGradientObject(rawValue)) {
                    const parsedGradient = extend({}, value);
                    parsedGradient.colorStops = map(rawValue.colorStops, colorStop => ({
                        offset: colorStop.offset,
                        color: parse(colorStop.color)
                    }));
                    if (isLinearGradient(rawValue)) {
                        valType = VALUE_TYPE_LINEAR_GRADIENT;
                    }
                    else if (isRadialGradient(rawValue)) {
                        valType = VALUE_TYPE_RADIAL_GRADIENT;
                    }
                    value = parsedGradient;
                }
            }
            if (len === 0) {
                this.valType = valType;
            }
            else if (valType !== this.valType || valType === VALUE_TYPE_UNKOWN) {
                discrete = true;
            }
            this.discrete = this.discrete || discrete;
            const kf = {
                time,
                value,
                rawValue,
                percent: 0
            };
            if (easing) {
                kf.easing = easing;
                kf.easingFunc = isFunction(easing)
                    ? easing
                    : easingFuncs[easing] || createCubicEasingFunc(easing);
            }
            keyframes.push(kf);
            return kf;
        }
        prepare(maxTime, additiveTrack) {
            let kfs = this.keyframes;
            if (this._needsSort) {
                kfs.sort(function (a, b) {
                    return a.time - b.time;
                });
            }
            const valType = this.valType;
            const kfsLen = kfs.length;
            const lastKf = kfs[kfsLen - 1];
            const isDiscrete = this.discrete;
            const isArr = isArrayValueType(valType);
            const isGradient = isGradientValueType(valType);
            for (let i = 0; i < kfsLen; i++) {
                const kf = kfs[i];
                const value = kf.value;
                const lastValue = lastKf.value;
                kf.percent = kf.time / maxTime;
                if (!isDiscrete) {
                    if (isArr && i !== kfsLen - 1) {
                        fillArray(value, lastValue, valType);
                    }
                    else if (isGradient) {
                        fillColorStops(value.colorStops, lastValue.colorStops);
                    }
                }
            }
            if (!isDiscrete
                && valType !== VALUE_TYPE_RADIAL_GRADIENT
                && additiveTrack
                && this.needsAnimate()
                && additiveTrack.needsAnimate()
                && valType === additiveTrack.valType
                && !additiveTrack._finished) {
                this._additiveTrack = additiveTrack;
                const startValue = kfs[0].value;
                for (let i = 0; i < kfsLen; i++) {
                    if (valType === VALUE_TYPE_NUMBER) {
                        kfs[i].additiveValue = kfs[i].value - startValue;
                    }
                    else if (valType === VALUE_TYPE_COLOR) {
                        kfs[i].additiveValue =
                            add1DArray([], kfs[i].value, startValue, -1);
                    }
                    else if (isArrayValueType(valType)) {
                        kfs[i].additiveValue = valType === VALUE_TYPE_1D_ARRAY
                            ? add1DArray([], kfs[i].value, startValue, -1)
                            : add2DArray([], kfs[i].value, startValue, -1);
                    }
                }
            }
        }
        step(target, percent) {
            if (this._finished) {
                return;
            }
            if (this._additiveTrack && this._additiveTrack._finished) {
                this._additiveTrack = null;
            }
            const isAdditive = this._additiveTrack != null;
            const valueKey = isAdditive ? 'additiveValue' : 'value';
            const valType = this.valType;
            const keyframes = this.keyframes;
            const kfsNum = keyframes.length;
            const propName = this.propName;
            const isValueColor = valType === VALUE_TYPE_COLOR;
            let frameIdx;
            const lastFrame = this._lastFr;
            const mathMin = Math.min;
            let frame;
            let nextFrame;
            if (kfsNum === 1) {
                frame = nextFrame = keyframes[0];
            }
            else {
                if (percent < 0) {
                    frameIdx = 0;
                }
                else if (percent < this._lastFrP) {
                    const start = mathMin(lastFrame + 1, kfsNum - 1);
                    for (frameIdx = start; frameIdx >= 0; frameIdx--) {
                        if (keyframes[frameIdx].percent <= percent) {
                            break;
                        }
                    }
                    frameIdx = mathMin(frameIdx, kfsNum - 2);
                }
                else {
                    for (frameIdx = lastFrame; frameIdx < kfsNum; frameIdx++) {
                        if (keyframes[frameIdx].percent > percent) {
                            break;
                        }
                    }
                    frameIdx = mathMin(frameIdx - 1, kfsNum - 2);
                }
                nextFrame = keyframes[frameIdx + 1];
                frame = keyframes[frameIdx];
            }
            if (!(frame && nextFrame)) {
                return;
            }
            this._lastFr = frameIdx;
            this._lastFrP = percent;
            const interval = (nextFrame.percent - frame.percent);
            let w = interval === 0 ? 1 : mathMin((percent - frame.percent) / interval, 1);
            if (nextFrame.easingFunc) {
                w = nextFrame.easingFunc(w);
            }
            let targetArr = isAdditive ? this._additiveValue
                : (isValueColor ? tmpRgba : target[propName]);
            if ((isArrayValueType(valType) || isValueColor) && !targetArr) {
                targetArr = this._additiveValue = [];
            }
            if (this.discrete) {
                target[propName] = w < 1 ? frame.rawValue : nextFrame.rawValue;
            }
            else if (isArrayValueType(valType)) {
                valType === VALUE_TYPE_1D_ARRAY
                    ? interpolate1DArray(targetArr, frame[valueKey], nextFrame[valueKey], w)
                    : interpolate2DArray(targetArr, frame[valueKey], nextFrame[valueKey], w);
            }
            else if (isGradientValueType(valType)) {
                const val = frame[valueKey];
                const nextVal = nextFrame[valueKey];
                const isLinearGradient = valType === VALUE_TYPE_LINEAR_GRADIENT;
                target[propName] = {
                    type: isLinearGradient ? 'linear' : 'radial',
                    x: interpolateNumber(val.x, nextVal.x, w),
                    y: interpolateNumber(val.y, nextVal.y, w),
                    colorStops: map(val.colorStops, (colorStop, idx) => {
                        const nextColorStop = nextVal.colorStops[idx];
                        return {
                            offset: interpolateNumber(colorStop.offset, nextColorStop.offset, w),
                            color: rgba2String(interpolate1DArray([], colorStop.color, nextColorStop.color, w))
                        };
                    }),
                    global: nextVal.global
                };
                if (isLinearGradient) {
                    target[propName].x2 = interpolateNumber(val.x2, nextVal.x2, w);
                    target[propName].y2 = interpolateNumber(val.y2, nextVal.y2, w);
                }
                else {
                    target[propName].r = interpolateNumber(val.r, nextVal.r, w);
                }
            }
            else if (isValueColor) {
                interpolate1DArray(targetArr, frame[valueKey], nextFrame[valueKey], w);
                if (!isAdditive) {
                    target[propName] = rgba2String(targetArr);
                }
            }
            else {
                const value = interpolateNumber(frame[valueKey], nextFrame[valueKey], w);
                if (isAdditive) {
                    this._additiveValue = value;
                }
                else {
                    target[propName] = value;
                }
            }
            if (isAdditive) {
                this._addToTarget(target);
            }
        }
        _addToTarget(target) {
            const valType = this.valType;
            const propName = this.propName;
            const additiveValue = this._additiveValue;
            if (valType === VALUE_TYPE_NUMBER) {
                target[propName] = target[propName] + additiveValue;
            }
            else if (valType === VALUE_TYPE_COLOR) {
                parse(target[propName], tmpRgba);
                add1DArray(tmpRgba, tmpRgba, additiveValue, 1);
                target[propName] = rgba2String(tmpRgba);
            }
            else if (valType === VALUE_TYPE_1D_ARRAY) {
                add1DArray(target[propName], target[propName], additiveValue, 1);
            }
            else if (valType === VALUE_TYPE_2D_ARRAY) {
                add2DArray(target[propName], target[propName], additiveValue, 1);
            }
        }
    }
    class Animator {
        constructor(target, loop, allowDiscreteAnimation, additiveTo) {
            this._tracks = {};
            this._trackKeys = [];
            this._maxTime = 0;
            this._started = 0;
            this._clip = null;
            this._target = target;
            this._loop = loop;
            if (loop && additiveTo) {
                logError('Can\' use additive animation on looped animation.');
                return;
            }
            this._additiveAnimators = additiveTo;
            this._allowDiscrete = allowDiscreteAnimation;
        }
        getMaxTime() {
            return this._maxTime;
        }
        getDelay() {
            return this._delay;
        }
        getLoop() {
            return this._loop;
        }
        getTarget() {
            return this._target;
        }
        changeTarget(target) {
            this._target = target;
        }
        when(time, props, easing) {
            return this.whenWithKeys(time, props, keys(props), easing);
        }
        whenWithKeys(time, props, propNames, easing) {
            const tracks = this._tracks;
            for (let i = 0; i < propNames.length; i++) {
                const propName = propNames[i];
                let track = tracks[propName];
                if (!track) {
                    track = tracks[propName] = new Track(propName);
                    let initialValue;
                    const additiveTrack = this._getAdditiveTrack(propName);
                    if (additiveTrack) {
                        const addtiveTrackKfs = additiveTrack.keyframes;
                        const lastFinalKf = addtiveTrackKfs[addtiveTrackKfs.length - 1];
                        initialValue = lastFinalKf && lastFinalKf.value;
                        if (additiveTrack.valType === VALUE_TYPE_COLOR && initialValue) {
                            initialValue = rgba2String(initialValue);
                        }
                    }
                    else {
                        initialValue = this._target[propName];
                    }
                    if (initialValue == null) {
                        continue;
                    }
                    if (time > 0) {
                        track.addKeyframe(0, cloneValue(initialValue), easing);
                    }
                    this._trackKeys.push(propName);
                }
                track.addKeyframe(time, cloneValue(props[propName]), easing);
            }
            this._maxTime = Math.max(this._maxTime, time);
            return this;
        }
        pause() {
            this._clip.pause();
            this._paused = true;
        }
        resume() {
            this._clip.resume();
            this._paused = false;
        }
        isPaused() {
            return !!this._paused;
        }
        duration(duration) {
            this._maxTime = duration;
            this._force = true;
            return this;
        }
        _doneCallback() {
            this._setTracksFinished();
            this._clip = null;
            const doneList = this._doneCbs;
            if (doneList) {
                const len = doneList.length;
                for (let i = 0; i < len; i++) {
                    doneList[i].call(this);
                }
            }
        }
        _abortedCallback() {
            this._setTracksFinished();
            const animation = this.animation;
            const abortedList = this._abortedCbs;
            if (animation) {
                animation.removeClip(this._clip);
            }
            this._clip = null;
            if (abortedList) {
                for (let i = 0; i < abortedList.length; i++) {
                    abortedList[i].call(this);
                }
            }
        }
        _setTracksFinished() {
            const tracks = this._tracks;
            const tracksKeys = this._trackKeys;
            for (let i = 0; i < tracksKeys.length; i++) {
                tracks[tracksKeys[i]].setFinished();
            }
        }
        _getAdditiveTrack(trackName) {
            let additiveTrack;
            const additiveAnimators = this._additiveAnimators;
            if (additiveAnimators) {
                for (let i = 0; i < additiveAnimators.length; i++) {
                    const track = additiveAnimators[i].getTrack(trackName);
                    if (track) {
                        additiveTrack = track;
                    }
                }
            }
            return additiveTrack;
        }
        start(easing) {
            if (this._started > 0) {
                return;
            }
            this._started = 1;
            const self = this;
            const tracks = [];
            const maxTime = this._maxTime || 0;
            for (let i = 0; i < this._trackKeys.length; i++) {
                const propName = this._trackKeys[i];
                const track = this._tracks[propName];
                const additiveTrack = this._getAdditiveTrack(propName);
                const kfs = track.keyframes;
                const kfsNum = kfs.length;
                track.prepare(maxTime, additiveTrack);
                if (track.needsAnimate()) {
                    if (!this._allowDiscrete && track.discrete) {
                        const lastKf = kfs[kfsNum - 1];
                        if (lastKf) {
                            self._target[track.propName] = lastKf.rawValue;
                        }
                        track.setFinished();
                    }
                    else {
                        tracks.push(track);
                    }
                }
            }
            if (tracks.length || this._force) {
                const clip = new Clip({
                    life: maxTime,
                    loop: this._loop,
                    delay: this._delay || 0,
                    onframe(percent) {
                        self._started = 2;
                        const additiveAnimators = self._additiveAnimators;
                        if (additiveAnimators) {
                            let stillHasAdditiveAnimator = false;
                            for (let i = 0; i < additiveAnimators.length; i++) {
                                if (additiveAnimators[i]._clip) {
                                    stillHasAdditiveAnimator = true;
                                    break;
                                }
                            }
                            if (!stillHasAdditiveAnimator) {
                                self._additiveAnimators = null;
                            }
                        }
                        for (let i = 0; i < tracks.length; i++) {
                            tracks[i].step(self._target, percent);
                        }
                        const onframeList = self._onframeCbs;
                        if (onframeList) {
                            for (let i = 0; i < onframeList.length; i++) {
                                onframeList[i](self._target, percent);
                            }
                        }
                    },
                    ondestroy() {
                        self._doneCallback();
                    }
                });
                this._clip = clip;
                if (this.animation) {
                    this.animation.addClip(clip);
                }
                if (easing) {
                    clip.setEasing(easing);
                }
            }
            else {
                this._doneCallback();
            }
            return this;
        }
        stop(forwardToLast) {
            if (!this._clip) {
                return;
            }
            const clip = this._clip;
            if (forwardToLast) {
                clip.onframe(1);
            }
            this._abortedCallback();
        }
        delay(time) {
            this._delay = time;
            return this;
        }
        during(cb) {
            if (cb) {
                if (!this._onframeCbs) {
                    this._onframeCbs = [];
                }
                this._onframeCbs.push(cb);
            }
            return this;
        }
        done(cb) {
            if (cb) {
                if (!this._doneCbs) {
                    this._doneCbs = [];
                }
                this._doneCbs.push(cb);
            }
            return this;
        }
        aborted(cb) {
            if (cb) {
                if (!this._abortedCbs) {
                    this._abortedCbs = [];
                }
                this._abortedCbs.push(cb);
            }
            return this;
        }
        getClip() {
            return this._clip;
        }
        getTrack(propName) {
            return this._tracks[propName];
        }
        getTracks() {
            return map(this._trackKeys, key => this._tracks[key]);
        }
        stopTracks(propNames, forwardToLast) {
            if (!propNames.length || !this._clip) {
                return true;
            }
            const tracks = this._tracks;
            const tracksKeys = this._trackKeys;
            for (let i = 0; i < propNames.length; i++) {
                const track = tracks[propNames[i]];
                if (track && !track.isFinished()) {
                    if (forwardToLast) {
                        track.step(this._target, 1);
                    }
                    else if (this._started === 1) {
                        track.step(this._target, 0);
                    }
                    track.setFinished();
                }
            }
            let allAborted = true;
            for (let i = 0; i < tracksKeys.length; i++) {
                if (!tracks[tracksKeys[i]].isFinished()) {
                    allAborted = false;
                    break;
                }
            }
            if (allAborted) {
                this._abortedCallback();
            }
            return allAborted;
        }
        saveTo(target, trackKeys, firstOrLast) {
            if (!target) {
                return;
            }
            trackKeys = trackKeys || this._trackKeys;
            for (let i = 0; i < trackKeys.length; i++) {
                const propName = trackKeys[i];
                const track = this._tracks[propName];
                if (!track || track.isFinished()) {
                    continue;
                }
                const kfs = track.keyframes;
                const kf = kfs[firstOrLast ? 0 : kfs.length - 1];
                if (kf) {
                    target[propName] = cloneValue(kf.rawValue);
                }
            }
        }
        __changeFinalValue(finalProps, trackKeys) {
            trackKeys = trackKeys || keys(finalProps);
            for (let i = 0; i < trackKeys.length; i++) {
                const propName = trackKeys[i];
                const track = this._tracks[propName];
                if (!track) {
                    continue;
                }
                const kfs = track.keyframes;
                if (kfs.length > 1) {
                    const lastKf = kfs.pop();
                    track.addKeyframe(lastKf.time, finalProps[propName]);
                    track.prepare(this._maxTime, track.getAdditiveTrack());
                }
            }
        }
    }

    function getTime() {
        return new Date().getTime();
    }
    class Animation extends Eventful {
        constructor(opts) {
            super();
            this._running = false;
            this._time = 0;
            this._pausedTime = 0;
            this._pauseStart = 0;
            this._paused = false;
            opts = opts || {};
            this.stage = opts.stage || {};
        }
        addClip(clip) {
            if (clip.animation) {
                this.removeClip(clip);
            }
            if (!this._head) {
                this._head = this._tail = clip;
            }
            else {
                this._tail.next = clip;
                clip.prev = this._tail;
                clip.next = null;
                this._tail = clip;
            }
            clip.animation = this;
        }
        addAnimator(animator) {
            animator.animation = this;
            const clip = animator.getClip();
            if (clip) {
                this.addClip(clip);
            }
        }
        removeClip(clip) {
            if (!clip.animation) {
                return;
            }
            const prev = clip.prev;
            const next = clip.next;
            if (prev) {
                prev.next = next;
            }
            else {
                this._head = next;
            }
            if (next) {
                next.prev = prev;
            }
            else {
                this._tail = prev;
            }
            clip.next = clip.prev = clip.animation = null;
        }
        removeAnimator(animator) {
            const clip = animator.getClip();
            if (clip) {
                this.removeClip(clip);
            }
            animator.animation = null;
        }
        update(notTriggerFrameAndStageUpdate) {
            const time = getTime() - this._pausedTime;
            const delta = time - this._time;
            let clip = this._head;
            while (clip) {
                const nextClip = clip.next;
                let finished = clip.step(time, delta);
                if (finished) {
                    clip.ondestroy();
                    this.removeClip(clip);
                    clip = nextClip;
                }
                else {
                    clip = nextClip;
                }
            }
            this._time = time;
            if (!notTriggerFrameAndStageUpdate) {
                this.trigger('frame', delta);
                this.stage.update && this.stage.update();
            }
        }
        _startLoop() {
            const self = this;
            this._running = true;
            function step() {
                if (self._running) {
                    requestAnimationFrame$1(step);
                    !self._paused && self.update();
                }
            }
            requestAnimationFrame$1(step);
        }
        start() {
            if (this._running) {
                return;
            }
            this._time = getTime();
            this._pausedTime = 0;
            this._startLoop();
        }
        stop() {
            this._running = false;
        }
        pause() {
            if (!this._paused) {
                this._pauseStart = getTime();
                this._paused = true;
            }
        }
        resume() {
            if (this._paused) {
                this._pausedTime += getTime() - this._pauseStart;
                this._paused = false;
            }
        }
        clear() {
            let clip = this._head;
            while (clip) {
                let nextClip = clip.next;
                clip.prev = clip.next = clip.animation = null;
                clip = nextClip;
            }
            this._head = this._tail = null;
        }
        isFinished() {
            return this._head == null;
        }
        animate(target, options) {
            options = options || {};
            this.start();
            const animator = new Animator(target, options.loop);
            this.addAnimator(animator);
            return animator;
        }
    }

    const TOUCH_CLICK_DELAY = 300;
    const globalEventSupported = env.domSupported;
    const localNativeListenerNames = (function () {
        const mouseHandlerNames = [
            'click', 'dblclick', 'mousewheel', 'wheel', 'mouseout',
            'mouseup', 'mousedown', 'mousemove', 'contextmenu'
        ];
        const touchHandlerNames = [
            'touchstart', 'touchend', 'touchmove'
        ];
        const pointerEventNameMap = {
            pointerdown: 1, pointerup: 1, pointermove: 1, pointerout: 1
        };
        const pointerHandlerNames = map(mouseHandlerNames, function (name) {
            const nm = name.replace('mouse', 'pointer');
            return pointerEventNameMap.hasOwnProperty(nm) ? nm : name;
        });
        return {
            mouse: mouseHandlerNames,
            touch: touchHandlerNames,
            pointer: pointerHandlerNames
        };
    })();
    const globalNativeListenerNames = {
        mouse: ['mousemove', 'mouseup'],
        pointer: ['pointermove', 'pointerup']
    };
    let wheelEventSupported = false;
    function isPointerFromTouch(event) {
        const pointerType = event.pointerType;
        return pointerType === 'pen' || pointerType === 'touch';
    }
    function setTouchTimer(scope) {
        scope.touching = true;
        if (scope.touchTimer != null) {
            clearTimeout(scope.touchTimer);
            scope.touchTimer = null;
        }
        scope.touchTimer = setTimeout(function () {
            scope.touching = false;
            scope.touchTimer = null;
        }, 700);
    }
    function markTouch(event) {
        event && (event.zrByTouch = true);
    }
    function normalizeGlobalEvent(instance, event) {
        return normalizeEvent(instance.dom, new FakeGlobalEvent(instance, event), true);
    }
    function isLocalEl(instance, el) {
        let elTmp = el;
        let isLocal = false;
        while (elTmp && elTmp.nodeType !== 9
            && !(isLocal = elTmp.domBelongToZr
                || (elTmp !== el && elTmp === instance.painterRoot))) {
            elTmp = elTmp.parentNode;
        }
        return isLocal;
    }
    class FakeGlobalEvent {
        constructor(instance, event) {
            this.stopPropagation = noop;
            this.stopImmediatePropagation = noop;
            this.preventDefault = noop;
            this.type = event.type;
            this.target = this.currentTarget = instance.dom;
            this.pointerType = event.pointerType;
            this.clientX = event.clientX;
            this.clientY = event.clientY;
        }
    }
    const localDOMHandlers = {
        mousedown(event) {
            event = normalizeEvent(this.dom, event);
            this.__mayPointerCapture = [event.zrX, event.zrY];
            this.trigger('mousedown', event);
        },
        mousemove(event) {
            event = normalizeEvent(this.dom, event);
            const downPoint = this.__mayPointerCapture;
            if (downPoint && (event.zrX !== downPoint[0] || event.zrY !== downPoint[1])) {
                this.__togglePointerCapture(true);
            }
            this.trigger('mousemove', event);
        },
        mouseup(event) {
            event = normalizeEvent(this.dom, event);
            this.__togglePointerCapture(false);
            this.trigger('mouseup', event);
        },
        mouseout(event) {
            event = normalizeEvent(this.dom, event);
            const element = event.toElement || event.relatedTarget;
            if (!isLocalEl(this, element)) {
                if (this.__pointerCapturing) {
                    event.zrEventControl = 'no_globalout';
                }
                this.trigger('mouseout', event);
            }
        },
        wheel(event) {
            wheelEventSupported = true;
            event = normalizeEvent(this.dom, event);
            this.trigger('mousewheel', event);
        },
        mousewheel(event) {
            if (wheelEventSupported) {
                return;
            }
            event = normalizeEvent(this.dom, event);
            this.trigger('mousewheel', event);
        },
        touchstart(event) {
            event = normalizeEvent(this.dom, event);
            markTouch(event);
            this.__lastTouchMoment = new Date();
            this.handler.processGesture(event, 'start');
            localDOMHandlers.mousemove.call(this, event);
            localDOMHandlers.mousedown.call(this, event);
        },
        touchmove(event) {
            event = normalizeEvent(this.dom, event);
            markTouch(event);
            this.handler.processGesture(event, 'change');
            localDOMHandlers.mousemove.call(this, event);
        },
        touchend(event) {
            event = normalizeEvent(this.dom, event);
            markTouch(event);
            this.handler.processGesture(event, 'end');
            localDOMHandlers.mouseup.call(this, event);
            if (+new Date() - (+this.__lastTouchMoment) < TOUCH_CLICK_DELAY) {
                localDOMHandlers.click.call(this, event);
            }
        },
        pointerdown(event) {
            localDOMHandlers.mousedown.call(this, event);
        },
        pointermove(event) {
            if (!isPointerFromTouch(event)) {
                localDOMHandlers.mousemove.call(this, event);
            }
        },
        pointerup(event) {
            localDOMHandlers.mouseup.call(this, event);
        },
        pointerout(event) {
            if (!isPointerFromTouch(event)) {
                localDOMHandlers.mouseout.call(this, event);
            }
        }
    };
    each(['click', 'dblclick', 'contextmenu'], function (name) {
        localDOMHandlers[name] = function (event) {
            event = normalizeEvent(this.dom, event);
            this.trigger(name, event);
        };
    });
    const globalDOMHandlers = {
        pointermove: function (event) {
            if (!isPointerFromTouch(event)) {
                globalDOMHandlers.mousemove.call(this, event);
            }
        },
        pointerup: function (event) {
            globalDOMHandlers.mouseup.call(this, event);
        },
        mousemove: function (event) {
            this.trigger('mousemove', event);
        },
        mouseup: function (event) {
            const pointerCaptureReleasing = this.__pointerCapturing;
            this.__togglePointerCapture(false);
            this.trigger('mouseup', event);
            if (pointerCaptureReleasing) {
                event.zrEventControl = 'only_globalout';
                this.trigger('mouseout', event);
            }
        }
    };
    function mountLocalDOMEventListeners(instance, scope) {
        const domHandlers = scope.domHandlers;
        if (env.pointerEventsSupported) {
            each(localNativeListenerNames.pointer, function (nativeEventName) {
                mountSingleDOMEventListener(scope, nativeEventName, function (event) {
                    domHandlers[nativeEventName].call(instance, event);
                });
            });
        }
        else {
            if (env.touchEventsSupported) {
                each(localNativeListenerNames.touch, function (nativeEventName) {
                    mountSingleDOMEventListener(scope, nativeEventName, function (event) {
                        domHandlers[nativeEventName].call(instance, event);
                        setTouchTimer(scope);
                    });
                });
            }
            each(localNativeListenerNames.mouse, function (nativeEventName) {
                mountSingleDOMEventListener(scope, nativeEventName, function (event) {
                    event = getNativeEvent(event);
                    if (!scope.touching) {
                        domHandlers[nativeEventName].call(instance, event);
                    }
                });
            });
        }
    }
    function mountGlobalDOMEventListeners(instance, scope) {
        if (env.pointerEventsSupported) {
            each(globalNativeListenerNames.pointer, mount);
        }
        else if (!env.touchEventsSupported) {
            each(globalNativeListenerNames.mouse, mount);
        }
        function mount(nativeEventName) {
            function nativeEventListener(event) {
                event = getNativeEvent(event);
                if (!isLocalEl(instance, event.target)) {
                    event = normalizeGlobalEvent(instance, event);
                    scope.domHandlers[nativeEventName].call(instance, event);
                }
            }
            mountSingleDOMEventListener(scope, nativeEventName, nativeEventListener, { capture: true });
        }
    }
    function mountSingleDOMEventListener(scope, nativeEventName, listener, opt) {
        scope.mounted[nativeEventName] = listener;
        scope.listenerOpts[nativeEventName] = opt;
        addEventListener(scope.domTarget, nativeEventName, listener, opt);
    }
    function unmountDOMEventListeners(scope) {
        const mounted = scope.mounted;
        for (let nativeEventName in mounted) {
            if (mounted.hasOwnProperty(nativeEventName)) {
                removeEventListener(scope.domTarget, nativeEventName, mounted[nativeEventName], scope.listenerOpts[nativeEventName]);
            }
        }
        scope.mounted = {};
    }
    class DOMHandlerScope {
        constructor(domTarget, domHandlers) {
            this.mounted = {};
            this.listenerOpts = {};
            this.touching = false;
            this.domTarget = domTarget;
            this.domHandlers = domHandlers;
        }
    }
    class HandlerDomProxy extends Eventful {
        constructor(dom, painterRoot) {
            super();
            this.__pointerCapturing = false;
            this.dom = dom;
            this.painterRoot = painterRoot;
            this._localHandlerScope = new DOMHandlerScope(dom, localDOMHandlers);
            if (globalEventSupported) {
                this._globalHandlerScope = new DOMHandlerScope(document, globalDOMHandlers);
            }
            mountLocalDOMEventListeners(this, this._localHandlerScope);
        }
        dispose() {
            unmountDOMEventListeners(this._localHandlerScope);
            if (globalEventSupported) {
                unmountDOMEventListeners(this._globalHandlerScope);
            }
        }
        setCursor(cursorStyle) {
            this.dom.style && (this.dom.style.cursor = cursorStyle || 'default');
        }
        __togglePointerCapture(isPointerCapturing) {
            this.__mayPointerCapture = null;
            if (globalEventSupported
                && ((+this.__pointerCapturing) ^ (+isPointerCapturing))) {
                this.__pointerCapturing = isPointerCapturing;
                const globalHandlerScope = this._globalHandlerScope;
                isPointerCapturing
                    ? mountGlobalDOMEventListeners(this, globalHandlerScope)
                    : unmountDOMEventListeners(globalHandlerScope);
            }
        }
    }

    let dpr = 1;
    if (env.hasGlobalWindow) {
        dpr = Math.max(window.devicePixelRatio
            || (window.screen && window.screen.deviceXDPI / window.screen.logicalXDPI)
            || 1, 1);
    }
    const devicePixelRatio = dpr;
    const DARK_MODE_THRESHOLD = 0.4;
    const DARK_LABEL_COLOR = '#333';
    const LIGHT_LABEL_COLOR = '#ccc';
    const LIGHTER_LABEL_COLOR = '#eee';

    const mIdentity = identity;
    const EPSILON$2 = 5e-5;
    function isNotAroundZero$1(val) {
        return val > EPSILON$2 || val < -EPSILON$2;
    }
    const scaleTmp = [];
    const tmpTransform = [];
    const originTransform = create$1();
    const abs = Math.abs;
    class Transformable {
        getLocalTransform(m) {
            return Transformable.getLocalTransform(this, m);
        }
        setPosition(arr) {
            this.x = arr[0];
            this.y = arr[1];
        }
        setScale(arr) {
            this.scaleX = arr[0];
            this.scaleY = arr[1];
        }
        setSkew(arr) {
            this.skewX = arr[0];
            this.skewY = arr[1];
        }
        setOrigin(arr) {
            this.originX = arr[0];
            this.originY = arr[1];
        }
        needLocalTransform() {
            return isNotAroundZero$1(this.rotation)
                || isNotAroundZero$1(this.x)
                || isNotAroundZero$1(this.y)
                || isNotAroundZero$1(this.scaleX - 1)
                || isNotAroundZero$1(this.scaleY - 1)
                || isNotAroundZero$1(this.skewX)
                || isNotAroundZero$1(this.skewY);
        }
        updateTransform() {
            const parentTransform = this.parent && this.parent.transform;
            const needLocalTransform = this.needLocalTransform();
            let m = this.transform;
            if (!(needLocalTransform || parentTransform)) {
                if (m) {
                    mIdentity(m);
                    this.invTransform = null;
                }
                return;
            }
            m = m || create$1();
            if (needLocalTransform) {
                this.getLocalTransform(m);
            }
            else {
                mIdentity(m);
            }
            if (parentTransform) {
                if (needLocalTransform) {
                    mul$1(m, parentTransform, m);
                }
                else {
                    copy$1(m, parentTransform);
                }
            }
            this.transform = m;
            this._resolveGlobalScaleRatio(m);
        }
        _resolveGlobalScaleRatio(m) {
            const globalScaleRatio = this.globalScaleRatio;
            if (globalScaleRatio != null && globalScaleRatio !== 1) {
                this.getGlobalScale(scaleTmp);
                const relX = scaleTmp[0] < 0 ? -1 : 1;
                const relY = scaleTmp[1] < 0 ? -1 : 1;
                const sx = ((scaleTmp[0] - relX) * globalScaleRatio + relX) / scaleTmp[0] || 0;
                const sy = ((scaleTmp[1] - relY) * globalScaleRatio + relY) / scaleTmp[1] || 0;
                m[0] *= sx;
                m[1] *= sx;
                m[2] *= sy;
                m[3] *= sy;
            }
            this.invTransform = this.invTransform || create$1();
            invert(this.invTransform, m);
        }
        getComputedTransform() {
            let transformNode = this;
            const ancestors = [];
            while (transformNode) {
                ancestors.push(transformNode);
                transformNode = transformNode.parent;
            }
            while (transformNode = ancestors.pop()) {
                transformNode.updateTransform();
            }
            return this.transform;
        }
        setLocalTransform(m) {
            if (!m) {
                return;
            }
            let sx = m[0] * m[0] + m[1] * m[1];
            let sy = m[2] * m[2] + m[3] * m[3];
            const rotation = Math.atan2(m[1], m[0]);
            const shearX = Math.PI / 2 + rotation - Math.atan2(m[3], m[2]);
            sy = Math.sqrt(sy) * Math.cos(shearX);
            sx = Math.sqrt(sx);
            this.skewX = shearX;
            this.skewY = 0;
            this.rotation = -rotation;
            this.x = +m[4];
            this.y = +m[5];
            this.scaleX = sx;
            this.scaleY = sy;
            this.originX = 0;
            this.originY = 0;
        }
        decomposeTransform() {
            if (!this.transform) {
                return;
            }
            const parent = this.parent;
            let m = this.transform;
            if (parent && parent.transform) {
                parent.invTransform = parent.invTransform || create$1();
                mul$1(tmpTransform, parent.invTransform, m);
                m = tmpTransform;
            }
            const ox = this.originX;
            const oy = this.originY;
            if (ox || oy) {
                originTransform[4] = ox;
                originTransform[5] = oy;
                mul$1(tmpTransform, m, originTransform);
                tmpTransform[4] -= ox;
                tmpTransform[5] -= oy;
                m = tmpTransform;
            }
            this.setLocalTransform(m);
        }
        getGlobalScale(out) {
            const m = this.transform;
            out = out || [];
            if (!m) {
                out[0] = 1;
                out[1] = 1;
                return out;
            }
            out[0] = Math.sqrt(m[0] * m[0] + m[1] * m[1]);
            out[1] = Math.sqrt(m[2] * m[2] + m[3] * m[3]);
            if (m[0] < 0) {
                out[0] = -out[0];
            }
            if (m[3] < 0) {
                out[1] = -out[1];
            }
            return out;
        }
        transformCoordToLocal(x, y) {
            const v2 = [x, y];
            const invTransform = this.invTransform;
            if (invTransform) {
                applyTransform(v2, v2, invTransform);
            }
            return v2;
        }
        transformCoordToGlobal(x, y) {
            const v2 = [x, y];
            const transform = this.transform;
            if (transform) {
                applyTransform(v2, v2, transform);
            }
            return v2;
        }
        getLineScale() {
            const m = this.transform;
            return m && abs(m[0] - 1) > 1e-10 && abs(m[3] - 1) > 1e-10
                ? Math.sqrt(abs(m[0] * m[3] - m[2] * m[1]))
                : 1;
        }
        copyTransform(source) {
            copyTransform(this, source);
        }
        static getLocalTransform(target, m) {
            m = m || [];
            const ox = target.originX || 0;
            const oy = target.originY || 0;
            const sx = target.scaleX;
            const sy = target.scaleY;
            const ax = target.anchorX;
            const ay = target.anchorY;
            const rotation = target.rotation || 0;
            const x = target.x;
            const y = target.y;
            const skewX = target.skewX ? Math.tan(target.skewX) : 0;
            const skewY = target.skewY ? Math.tan(-target.skewY) : 0;
            if (ox || oy || ax || ay) {
                const dx = ox + ax;
                const dy = oy + ay;
                m[4] = -dx * sx - skewX * dy * sy;
                m[5] = -dy * sy - skewY * dx * sx;
            }
            else {
                m[4] = m[5] = 0;
            }
            m[0] = sx;
            m[3] = sy;
            m[1] = skewY * sx;
            m[2] = skewX * sy;
            rotation && rotate(m, m, rotation);
            m[4] += ox + x;
            m[5] += oy + y;
            return m;
        }
    }
    Transformable.initDefaultProps = (function () {
        const proto = Transformable.prototype;
        proto.scaleX =
            proto.scaleY =
                proto.globalScaleRatio = 1;
        proto.x =
            proto.y =
                proto.originX =
                    proto.originY =
                        proto.skewX =
                            proto.skewY =
                                proto.rotation =
                                    proto.anchorX =
                                        proto.anchorY = 0;
    })();
    const TRANSFORMABLE_PROPS = [
        'x', 'y', 'originX', 'originY', 'anchorX', 'anchorY', 'rotation', 'scaleX', 'scaleY', 'skewX', 'skewY'
    ];
    function copyTransform(target, source) {
        for (let i = 0; i < TRANSFORMABLE_PROPS.length; i++) {
            const propName = TRANSFORMABLE_PROPS[i];
            target[propName] = source[propName];
        }
    }

    let textWidthCache = {};
    function getWidth(text, font) {
        font = font || DEFAULT_FONT;
        let cacheOfFont = textWidthCache[font];
        if (!cacheOfFont) {
            cacheOfFont = textWidthCache[font] = new LRU(500);
        }
        let width = cacheOfFont.get(text);
        if (width == null) {
            width = platformApi.measureText(text, font).width;
            cacheOfFont.put(text, width);
        }
        return width;
    }
    function innerGetBoundingRect(text, font, textAlign, textBaseline) {
        const width = getWidth(text, font);
        const height = getLineHeight(font);
        const x = adjustTextX(0, width, textAlign);
        const y = adjustTextY$1(0, height, textBaseline);
        const rect = new BoundingRect(x, y, width, height);
        return rect;
    }
    function getBoundingRect(text, font, textAlign, textBaseline) {
        const textLines = ((text || '') + '').split('\n');
        const len = textLines.length;
        if (len === 1) {
            return innerGetBoundingRect(textLines[0], font, textAlign, textBaseline);
        }
        else {
            const uniondRect = new BoundingRect(0, 0, 0, 0);
            for (let i = 0; i < textLines.length; i++) {
                const rect = innerGetBoundingRect(textLines[i], font, textAlign, textBaseline);
                i === 0 ? uniondRect.copy(rect) : uniondRect.union(rect);
            }
            return uniondRect;
        }
    }
    function adjustTextX(x, width, textAlign) {
        if (textAlign === 'right') {
            x -= width;
        }
        else if (textAlign === 'center') {
            x -= width / 2;
        }
        return x;
    }
    function adjustTextY$1(y, height, verticalAlign) {
        if (verticalAlign === 'middle') {
            y -= height / 2;
        }
        else if (verticalAlign === 'bottom') {
            y -= height;
        }
        return y;
    }
    function getLineHeight(font) {
        return getWidth('国', font);
    }
    function parsePercent(value, maxValue) {
        if (typeof value === 'string') {
            if (value.lastIndexOf('%') >= 0) {
                return parseFloat(value) / 100 * maxValue;
            }
            return parseFloat(value);
        }
        return value;
    }
    function calculateTextPosition(out, opts, rect) {
        const textPosition = opts.position || 'inside';
        const distance = opts.distance != null ? opts.distance : 5;
        const height = rect.height;
        const width = rect.width;
        const halfHeight = height / 2;
        let x = rect.x;
        let y = rect.y;
        let textAlign = 'left';
        let textVerticalAlign = 'top';
        if (textPosition instanceof Array) {
            x += parsePercent(textPosition[0], rect.width);
            y += parsePercent(textPosition[1], rect.height);
            textAlign = null;
            textVerticalAlign = null;
        }
        else {
            switch (textPosition) {
                case 'left':
                    x -= distance;
                    y += halfHeight;
                    textAlign = 'right';
                    textVerticalAlign = 'middle';
                    break;
                case 'right':
                    x += distance + width;
                    y += halfHeight;
                    textVerticalAlign = 'middle';
                    break;
                case 'top':
                    x += width / 2;
                    y -= distance;
                    textAlign = 'center';
                    textVerticalAlign = 'bottom';
                    break;
                case 'bottom':
                    x += width / 2;
                    y += height + distance;
                    textAlign = 'center';
                    break;
                case 'inside':
                    x += width / 2;
                    y += halfHeight;
                    textAlign = 'center';
                    textVerticalAlign = 'middle';
                    break;
                case 'insideLeft':
                    x += distance;
                    y += halfHeight;
                    textVerticalAlign = 'middle';
                    break;
                case 'insideRight':
                    x += width - distance;
                    y += halfHeight;
                    textAlign = 'right';
                    textVerticalAlign = 'middle';
                    break;
                case 'insideTop':
                    x += width / 2;
                    y += distance;
                    textAlign = 'center';
                    break;
                case 'insideBottom':
                    x += width / 2;
                    y += height - distance;
                    textAlign = 'center';
                    textVerticalAlign = 'bottom';
                    break;
                case 'insideTopLeft':
                    x += distance;
                    y += distance;
                    break;
                case 'insideTopRight':
                    x += width - distance;
                    y += distance;
                    textAlign = 'right';
                    break;
                case 'insideBottomLeft':
                    x += distance;
                    y += height - distance;
                    textVerticalAlign = 'bottom';
                    break;
                case 'insideBottomRight':
                    x += width - distance;
                    y += height - distance;
                    textAlign = 'right';
                    textVerticalAlign = 'bottom';
                    break;
            }
        }
        out = out || {};
        out.x = x;
        out.y = y;
        out.align = textAlign;
        out.verticalAlign = textVerticalAlign;
        return out;
    }

    const PRESERVED_NORMAL_STATE = '__zr_normal__';
    const PRIMARY_STATES_KEYS = TRANSFORMABLE_PROPS.concat(['ignore']);
    const DEFAULT_ANIMATABLE_MAP = reduce(TRANSFORMABLE_PROPS, (obj, key) => {
        obj[key] = true;
        return obj;
    }, { ignore: false });
    let tmpTextPosCalcRes = {};
    let tmpBoundingRect = new BoundingRect(0, 0, 0, 0);
    class Element {
        constructor(props) {
            this.id = guid();
            this.animators = [];
            this.currentStates = [];
            this.states = {};
            this._init(props);
        }
        _init(props) {
            this.attr(props);
        }
        drift(dx, dy, e) {
            switch (this.draggable) {
                case 'horizontal':
                    dy = 0;
                    break;
                case 'vertical':
                    dx = 0;
                    break;
            }
            let m = this.transform;
            if (!m) {
                m = this.transform = [1, 0, 0, 1, 0, 0];
            }
            m[4] += dx;
            m[5] += dy;
            this.decomposeTransform();
            this.markRedraw();
        }
        beforeUpdate() { }
        afterUpdate() { }
        update() {
            this.updateTransform();
            if (this.__dirty) {
                this.updateInnerText();
            }
        }
        updateInnerText(forceUpdate) {
            const textEl = this._textContent;
            if (textEl && (!textEl.ignore || forceUpdate)) {
                if (!this.textConfig) {
                    this.textConfig = {};
                }
                const textConfig = this.textConfig;
                const isLocal = textConfig.local;
                const innerTransformable = textEl.innerTransformable;
                let textAlign;
                let textVerticalAlign;
                let textStyleChanged = false;
                innerTransformable.parent = isLocal ? this : null;
                let innerOrigin = false;
                innerTransformable.copyTransform(textEl);
                if (textConfig.position != null) {
                    let layoutRect = tmpBoundingRect;
                    if (textConfig.layoutRect) {
                        layoutRect.copy(textConfig.layoutRect);
                    }
                    else {
                        layoutRect.copy(this.getBoundingRect());
                    }
                    if (!isLocal) {
                        layoutRect.applyTransform(this.transform);
                    }
                    if (this.calculateTextPosition) {
                        this.calculateTextPosition(tmpTextPosCalcRes, textConfig, layoutRect);
                    }
                    else {
                        calculateTextPosition(tmpTextPosCalcRes, textConfig, layoutRect);
                    }
                    innerTransformable.x = tmpTextPosCalcRes.x;
                    innerTransformable.y = tmpTextPosCalcRes.y;
                    textAlign = tmpTextPosCalcRes.align;
                    textVerticalAlign = tmpTextPosCalcRes.verticalAlign;
                    const textOrigin = textConfig.origin;
                    if (textOrigin && textConfig.rotation != null) {
                        let relOriginX;
                        let relOriginY;
                        if (textOrigin === 'center') {
                            relOriginX = layoutRect.width * 0.5;
                            relOriginY = layoutRect.height * 0.5;
                        }
                        else {
                            relOriginX = parsePercent(textOrigin[0], layoutRect.width);
                            relOriginY = parsePercent(textOrigin[1], layoutRect.height);
                        }
                        innerOrigin = true;
                        innerTransformable.originX = -innerTransformable.x + relOriginX + (isLocal ? 0 : layoutRect.x);
                        innerTransformable.originY = -innerTransformable.y + relOriginY + (isLocal ? 0 : layoutRect.y);
                    }
                }
                if (textConfig.rotation != null) {
                    innerTransformable.rotation = textConfig.rotation;
                }
                const textOffset = textConfig.offset;
                if (textOffset) {
                    innerTransformable.x += textOffset[0];
                    innerTransformable.y += textOffset[1];
                    if (!innerOrigin) {
                        innerTransformable.originX = -textOffset[0];
                        innerTransformable.originY = -textOffset[1];
                    }
                }
                const isInside = textConfig.inside == null
                    ? (typeof textConfig.position === 'string' && textConfig.position.indexOf('inside') >= 0)
                    : textConfig.inside;
                const innerTextDefaultStyle = this._innerTextDefaultStyle || (this._innerTextDefaultStyle = {});
                let textFill;
                let textStroke;
                let autoStroke;
                if (isInside && this.canBeInsideText()) {
                    textFill = textConfig.insideFill;
                    textStroke = textConfig.insideStroke;
                    if (textFill == null || textFill === 'auto') {
                        textFill = this.getInsideTextFill();
                    }
                    if (textStroke == null || textStroke === 'auto') {
                        textStroke = this.getInsideTextStroke(textFill);
                        autoStroke = true;
                    }
                }
                else {
                    textFill = textConfig.outsideFill;
                    textStroke = textConfig.outsideStroke;
                    if (textFill == null || textFill === 'auto') {
                        textFill = this.getOutsideFill();
                    }
                    if (textStroke == null || textStroke === 'auto') {
                        textStroke = this.getOutsideStroke(textFill);
                        autoStroke = true;
                    }
                }
                textFill = textFill || '#000';
                if (textFill !== innerTextDefaultStyle.fill
                    || textStroke !== innerTextDefaultStyle.stroke
                    || autoStroke !== innerTextDefaultStyle.autoStroke
                    || textAlign !== innerTextDefaultStyle.align
                    || textVerticalAlign !== innerTextDefaultStyle.verticalAlign) {
                    textStyleChanged = true;
                    innerTextDefaultStyle.fill = textFill;
                    innerTextDefaultStyle.stroke = textStroke;
                    innerTextDefaultStyle.autoStroke = autoStroke;
                    innerTextDefaultStyle.align = textAlign;
                    innerTextDefaultStyle.verticalAlign = textVerticalAlign;
                    textEl.setDefaultTextStyle(innerTextDefaultStyle);
                }
                textEl.__dirty |= REDRAW_BIT;
                if (textStyleChanged) {
                    textEl.dirtyStyle(true);
                }
            }
        }
        canBeInsideText() {
            return true;
        }
        getInsideTextFill() {
            return '#fff';
        }
        getInsideTextStroke(textFill) {
            return '#000';
        }
        getOutsideFill() {
            return this.__zr && this.__zr.isDarkMode() ? LIGHT_LABEL_COLOR : DARK_LABEL_COLOR;
        }
        getOutsideStroke(textFill) {
            const backgroundColor = this.__zr && this.__zr.getBackgroundColor();
            let colorArr = typeof backgroundColor === 'string' && parse(backgroundColor);
            if (!colorArr) {
                colorArr = [255, 255, 255, 1];
            }
            const alpha = colorArr[3];
            const isDark = this.__zr.isDarkMode();
            for (let i = 0; i < 3; i++) {
                colorArr[i] = colorArr[i] * alpha + (isDark ? 0 : 255) * (1 - alpha);
            }
            colorArr[3] = 1;
            return stringify(colorArr, 'rgba');
        }
        traverse(cb, context) { }
        attrKV(key, value) {
            if (key === 'textConfig') {
                this.setTextConfig(value);
            }
            else if (key === 'textContent') {
                this.setTextContent(value);
            }
            else if (key === 'clipPath') {
                this.setClipPath(value);
            }
            else if (key === 'extra') {
                this.extra = this.extra || {};
                extend(this.extra, value);
            }
            else {
                this[key] = value;
            }
        }
        hide() {
            this.ignore = true;
            this.markRedraw();
        }
        show() {
            this.ignore = false;
            this.markRedraw();
        }
        attr(keyOrObj, value) {
            if (typeof keyOrObj === 'string') {
                this.attrKV(keyOrObj, value);
            }
            else if (isObject(keyOrObj)) {
                let obj = keyOrObj;
                let keysArr = keys(obj);
                for (let i = 0; i < keysArr.length; i++) {
                    let key = keysArr[i];
                    this.attrKV(key, keyOrObj[key]);
                }
            }
            this.markRedraw();
            return this;
        }
        saveCurrentToNormalState(toState) {
            this._innerSaveToNormal(toState);
            const normalState = this._normalState;
            for (let i = 0; i < this.animators.length; i++) {
                const animator = this.animators[i];
                const fromStateTransition = animator.__fromStateTransition;
                if (animator.getLoop() || fromStateTransition && fromStateTransition !== PRESERVED_NORMAL_STATE) {
                    continue;
                }
                const targetName = animator.targetName;
                const target = targetName
                    ? normalState[targetName] : normalState;
                animator.saveTo(target);
            }
        }
        _innerSaveToNormal(toState) {
            let normalState = this._normalState;
            if (!normalState) {
                normalState = this._normalState = {};
            }
            if (toState.textConfig && !normalState.textConfig) {
                normalState.textConfig = this.textConfig;
            }
            this._savePrimaryToNormal(toState, normalState, PRIMARY_STATES_KEYS);
        }
        _savePrimaryToNormal(toState, normalState, primaryKeys) {
            for (let i = 0; i < primaryKeys.length; i++) {
                let key = primaryKeys[i];
                if (toState[key] != null && !(key in normalState)) {
                    normalState[key] = this[key];
                }
            }
        }
        hasState() {
            return this.currentStates.length > 0;
        }
        getState(name) {
            return this.states[name];
        }
        ensureState(name) {
            const states = this.states;
            if (!states[name]) {
                states[name] = {};
            }
            return states[name];
        }
        clearStates(noAnimation) {
            this.useState(PRESERVED_NORMAL_STATE, false, noAnimation);
        }
        useState(stateName, keepCurrentStates, noAnimation, forceUseHoverLayer) {
            const toNormalState = stateName === PRESERVED_NORMAL_STATE;
            const hasStates = this.hasState();
            if (!hasStates && toNormalState) {
                return;
            }
            const currentStates = this.currentStates;
            const animationCfg = this.stateTransition;
            if (indexOf(currentStates, stateName) >= 0 && (keepCurrentStates || currentStates.length === 1)) {
                return;
            }
            let state;
            if (this.stateProxy && !toNormalState) {
                state = this.stateProxy(stateName);
            }
            if (!state) {
                state = (this.states && this.states[stateName]);
            }
            if (!state && !toNormalState) {
                logError(`State ${stateName} not exists.`);
                return;
            }
            if (!toNormalState) {
                this.saveCurrentToNormalState(state);
            }
            const useHoverLayer = !!((state && state.hoverLayer) || forceUseHoverLayer);
            if (useHoverLayer) {
                this._toggleHoverLayerFlag(true);
            }
            this._applyStateObj(stateName, state, this._normalState, keepCurrentStates, !noAnimation && !this.__inHover && animationCfg && animationCfg.duration > 0, animationCfg);
            const textContent = this._textContent;
            const textGuide = this._textGuide;
            if (textContent) {
                textContent.useState(stateName, keepCurrentStates, noAnimation, useHoverLayer);
            }
            if (textGuide) {
                textGuide.useState(stateName, keepCurrentStates, noAnimation, useHoverLayer);
            }
            if (toNormalState) {
                this.currentStates = [];
                this._normalState = {};
            }
            else {
                if (!keepCurrentStates) {
                    this.currentStates = [stateName];
                }
                else {
                    this.currentStates.push(stateName);
                }
            }
            this._updateAnimationTargets();
            this.markRedraw();
            if (!useHoverLayer && this.__inHover) {
                this._toggleHoverLayerFlag(false);
                this.__dirty &= ~REDRAW_BIT;
            }
            return state;
        }
        useStates(states, noAnimation, forceUseHoverLayer) {
            if (!states.length) {
                this.clearStates();
            }
            else {
                const stateObjects = [];
                const currentStates = this.currentStates;
                const len = states.length;
                let notChange = len === currentStates.length;
                if (notChange) {
                    for (let i = 0; i < len; i++) {
                        if (states[i] !== currentStates[i]) {
                            notChange = false;
                            break;
                        }
                    }
                }
                if (notChange) {
                    return;
                }
                for (let i = 0; i < len; i++) {
                    const stateName = states[i];
                    let stateObj;
                    if (this.stateProxy) {
                        stateObj = this.stateProxy(stateName, states);
                    }
                    if (!stateObj) {
                        stateObj = this.states[stateName];
                    }
                    if (stateObj) {
                        stateObjects.push(stateObj);
                    }
                }
                const lastStateObj = stateObjects[len - 1];
                const useHoverLayer = !!((lastStateObj && lastStateObj.hoverLayer) || forceUseHoverLayer);
                if (useHoverLayer) {
                    this._toggleHoverLayerFlag(true);
                }
                const mergedState = this._mergeStates(stateObjects);
                const animationCfg = this.stateTransition;
                this.saveCurrentToNormalState(mergedState);
                this._applyStateObj(states.join(','), mergedState, this._normalState, false, !noAnimation && !this.__inHover && animationCfg && animationCfg.duration > 0, animationCfg);
                const textContent = this._textContent;
                const textGuide = this._textGuide;
                if (textContent) {
                    textContent.useStates(states, noAnimation, useHoverLayer);
                }
                if (textGuide) {
                    textGuide.useStates(states, noAnimation, useHoverLayer);
                }
                this._updateAnimationTargets();
                this.currentStates = states.slice();
                this.markRedraw();
                if (!useHoverLayer && this.__inHover) {
                    this._toggleHoverLayerFlag(false);
                    this.__dirty &= ~REDRAW_BIT;
                }
            }
        }
        isSilent() {
            let isSilent = this.silent;
            let ancestor = this.parent;
            while (!isSilent && ancestor) {
                if (ancestor.silent) {
                    isSilent = true;
                    break;
                }
                ancestor = ancestor.parent;
            }
            return isSilent;
        }
        _updateAnimationTargets() {
            for (let i = 0; i < this.animators.length; i++) {
                const animator = this.animators[i];
                if (animator.targetName) {
                    animator.changeTarget(this[animator.targetName]);
                }
            }
        }
        removeState(state) {
            const idx = indexOf(this.currentStates, state);
            if (idx >= 0) {
                const currentStates = this.currentStates.slice();
                currentStates.splice(idx, 1);
                this.useStates(currentStates);
            }
        }
        replaceState(oldState, newState, forceAdd) {
            const currentStates = this.currentStates.slice();
            const idx = indexOf(currentStates, oldState);
            const newStateExists = indexOf(currentStates, newState) >= 0;
            if (idx >= 0) {
                if (!newStateExists) {
                    currentStates[idx] = newState;
                }
                else {
                    currentStates.splice(idx, 1);
                }
            }
            else if (forceAdd && !newStateExists) {
                currentStates.push(newState);
            }
            this.useStates(currentStates);
        }
        toggleState(state, enable) {
            if (enable) {
                this.useState(state, true);
            }
            else {
                this.removeState(state);
            }
        }
        _mergeStates(states) {
            const mergedState = {};
            let mergedTextConfig;
            for (let i = 0; i < states.length; i++) {
                const state = states[i];
                extend(mergedState, state);
                if (state.textConfig) {
                    mergedTextConfig = mergedTextConfig || {};
                    extend(mergedTextConfig, state.textConfig);
                }
            }
            if (mergedTextConfig) {
                mergedState.textConfig = mergedTextConfig;
            }
            return mergedState;
        }
        _applyStateObj(stateName, state, normalState, keepCurrentStates, transition, animationCfg) {
            const needsRestoreToNormal = !(state && keepCurrentStates);
            if (state && state.textConfig) {
                this.textConfig = extend({}, keepCurrentStates ? this.textConfig : normalState.textConfig);
                extend(this.textConfig, state.textConfig);
            }
            else if (needsRestoreToNormal) {
                if (normalState.textConfig) {
                    this.textConfig = normalState.textConfig;
                }
            }
            const transitionTarget = {};
            let hasTransition = false;
            for (let i = 0; i < PRIMARY_STATES_KEYS.length; i++) {
                const key = PRIMARY_STATES_KEYS[i];
                const propNeedsTransition = transition && DEFAULT_ANIMATABLE_MAP[key];
                if (state && state[key] != null) {
                    if (propNeedsTransition) {
                        hasTransition = true;
                        transitionTarget[key] = state[key];
                    }
                    else {
                        this[key] = state[key];
                    }
                }
                else if (needsRestoreToNormal) {
                    if (normalState[key] != null) {
                        if (propNeedsTransition) {
                            hasTransition = true;
                            transitionTarget[key] = normalState[key];
                        }
                        else {
                            this[key] = normalState[key];
                        }
                    }
                }
            }
            if (!transition) {
                for (let i = 0; i < this.animators.length; i++) {
                    const animator = this.animators[i];
                    const targetName = animator.targetName;
                    if (!animator.getLoop()) {
                        animator.__changeFinalValue(targetName
                            ? (state || normalState)[targetName]
                            : (state || normalState));
                    }
                }
            }
            if (hasTransition) {
                this._transitionState(stateName, transitionTarget, animationCfg);
            }
        }
        _attachComponent(componentEl) {
            if (componentEl.__zr && !componentEl.__hostTarget) {
                {
                    throw new Error('Text element has been added to zrender.');
                }
            }
            if (componentEl === this) {
                {
                    throw new Error('Recursive component attachment.');
                }
            }
            const zr = this.__zr;
            if (zr) {
                componentEl.addSelfToZr(zr);
            }
            componentEl.__zr = zr;
            componentEl.__hostTarget = this;
        }
        _detachComponent(componentEl) {
            if (componentEl.__zr) {
                componentEl.removeSelfFromZr(componentEl.__zr);
            }
            componentEl.__zr = null;
            componentEl.__hostTarget = null;
        }
        getClipPath() {
            return this._clipPath;
        }
        setClipPath(clipPath) {
            if (this._clipPath && this._clipPath !== clipPath) {
                this.removeClipPath();
            }
            this._attachComponent(clipPath);
            this._clipPath = clipPath;
            this.markRedraw();
        }
        removeClipPath() {
            const clipPath = this._clipPath;
            if (clipPath) {
                this._detachComponent(clipPath);
                this._clipPath = null;
                this.markRedraw();
            }
        }
        getTextContent() {
            return this._textContent;
        }
        setTextContent(textEl) {
            const previousTextContent = this._textContent;
            if (previousTextContent === textEl) {
                return;
            }
            if (previousTextContent && previousTextContent !== textEl) {
                this.removeTextContent();
            }
            {
                if (textEl.__zr && !textEl.__hostTarget) {
                    throw new Error('Text element has been added to zrender.');
                }
            }
            textEl.innerTransformable = new Transformable();
            this._attachComponent(textEl);
            this._textContent = textEl;
            this.markRedraw();
        }
        setTextConfig(cfg) {
            if (!this.textConfig) {
                this.textConfig = {};
            }
            extend(this.textConfig, cfg);
            this.markRedraw();
        }
        removeTextConfig() {
            this.textConfig = null;
            this.markRedraw();
        }
        removeTextContent() {
            const textEl = this._textContent;
            if (textEl) {
                textEl.innerTransformable = null;
                this._detachComponent(textEl);
                this._textContent = null;
                this._innerTextDefaultStyle = null;
                this.markRedraw();
            }
        }
        getTextGuideLine() {
            return this._textGuide;
        }
        setTextGuideLine(guideLine) {
            if (this._textGuide && this._textGuide !== guideLine) {
                this.removeTextGuideLine();
            }
            this._attachComponent(guideLine);
            this._textGuide = guideLine;
            this.markRedraw();
        }
        removeTextGuideLine() {
            const textGuide = this._textGuide;
            if (textGuide) {
                this._detachComponent(textGuide);
                this._textGuide = null;
                this.markRedraw();
            }
        }
        markRedraw() {
            this.__dirty |= REDRAW_BIT;
            const zr = this.__zr;
            if (zr) {
                if (this.__inHover) {
                    zr.refreshHover();
                }
                else {
                    zr.refresh();
                }
            }
            if (this.__hostTarget) {
                this.__hostTarget.markRedraw();
            }
        }
        dirty() {
            this.markRedraw();
        }
        _toggleHoverLayerFlag(inHover) {
            this.__inHover = inHover;
            const textContent = this._textContent;
            const textGuide = this._textGuide;
            if (textContent) {
                textContent.__inHover = inHover;
            }
            if (textGuide) {
                textGuide.__inHover = inHover;
            }
        }
        addSelfToZr(zr) {
            if (this.__zr === zr) {
                return;
            }
            this.__zr = zr;
            const animators = this.animators;
            if (animators) {
                for (let i = 0; i < animators.length; i++) {
                    zr.animation.addAnimator(animators[i]);
                }
            }
            if (this._clipPath) {
                this._clipPath.addSelfToZr(zr);
            }
            if (this._textContent) {
                this._textContent.addSelfToZr(zr);
            }
            if (this._textGuide) {
                this._textGuide.addSelfToZr(zr);
            }
        }
        removeSelfFromZr(zr) {
            if (!this.__zr) {
                return;
            }
            this.__zr = null;
            const animators = this.animators;
            if (animators) {
                for (let i = 0; i < animators.length; i++) {
                    zr.animation.removeAnimator(animators[i]);
                }
            }
            if (this._clipPath) {
                this._clipPath.removeSelfFromZr(zr);
            }
            if (this._textContent) {
                this._textContent.removeSelfFromZr(zr);
            }
            if (this._textGuide) {
                this._textGuide.removeSelfFromZr(zr);
            }
        }
        animate(key, loop, allowDiscreteAnimation) {
            let target = key ? this[key] : this;
            {
                if (!target) {
                    logError('Property "'
                        + key
                        + '" is not existed in element '
                        + this.id);
                    return;
                }
            }
            const animator = new Animator(target, loop, allowDiscreteAnimation);
            key && (animator.targetName = key);
            this.addAnimator(animator, key);
            return animator;
        }
        addAnimator(animator, key) {
            const zr = this.__zr;
            const el = this;
            animator.during(function () {
                el.updateDuringAnimation(key);
            }).done(function () {
                const animators = el.animators;
                const idx = indexOf(animators, animator);
                if (idx >= 0) {
                    animators.splice(idx, 1);
                }
            });
            this.animators.push(animator);
            if (zr) {
                zr.animation.addAnimator(animator);
            }
            zr && zr.wakeUp();
        }
        updateDuringAnimation(key) {
            this.markRedraw();
        }
        stopAnimation(scope, forwardToLast) {
            const animators = this.animators;
            const len = animators.length;
            const leftAnimators = [];
            for (let i = 0; i < len; i++) {
                const animator = animators[i];
                if (!scope || scope === animator.scope) {
                    animator.stop(forwardToLast);
                }
                else {
                    leftAnimators.push(animator);
                }
            }
            this.animators = leftAnimators;
            return this;
        }
        animateTo(target, cfg, animationProps) {
            animateTo(this, target, cfg, animationProps);
        }
        animateFrom(target, cfg, animationProps) {
            animateTo(this, target, cfg, animationProps, true);
        }
        _transitionState(stateName, target, cfg, animationProps) {
            const animators = animateTo(this, target, cfg, animationProps);
            for (let i = 0; i < animators.length; i++) {
                animators[i].__fromStateTransition = stateName;
            }
        }
        getBoundingRect() {
            return null;
        }
        getPaintRect() {
            return null;
        }
    }
    Element.initDefaultProps = (function () {
        const elProto = Element.prototype;
        elProto.type = 'element';
        elProto.name = '';
        elProto.ignore =
            elProto.silent =
                elProto.isGroup =
                    elProto.draggable =
                        elProto.dragging =
                            elProto.ignoreClip =
                                elProto.__inHover = false;
        elProto.__dirty = REDRAW_BIT;
        const logs = {};
        function logDeprecatedError(key, xKey, yKey) {
            if (!logs[key + xKey + yKey]) {
                console.warn(`DEPRECATED: '${key}' has been deprecated. use '${xKey}', '${yKey}' instead`);
                logs[key + xKey + yKey] = true;
            }
        }
        function createLegacyProperty(key, privateKey, xKey, yKey) {
            Object.defineProperty(elProto, key, {
                get() {
                    {
                        logDeprecatedError(key, xKey, yKey);
                    }
                    if (!this[privateKey]) {
                        const pos = this[privateKey] = [];
                        enhanceArray(this, pos);
                    }
                    return this[privateKey];
                },
                set(pos) {
                    {
                        logDeprecatedError(key, xKey, yKey);
                    }
                    this[xKey] = pos[0];
                    this[yKey] = pos[1];
                    this[privateKey] = pos;
                    enhanceArray(this, pos);
                }
            });
            function enhanceArray(self, pos) {
                Object.defineProperty(pos, 0, {
                    get() {
                        return self[xKey];
                    },
                    set(val) {
                        self[xKey] = val;
                    }
                });
                Object.defineProperty(pos, 1, {
                    get() {
                        return self[yKey];
                    },
                    set(val) {
                        self[yKey] = val;
                    }
                });
            }
        }
        if (Object.defineProperty) {
            createLegacyProperty('position', '_legacyPos', 'x', 'y');
            createLegacyProperty('scale', '_legacyScale', 'scaleX', 'scaleY');
            createLegacyProperty('origin', '_legacyOrigin', 'originX', 'originY');
        }
    })();
    mixin(Element, Eventful);
    mixin(Element, Transformable);
    function animateTo(animatable, target, cfg, animationProps, reverse) {
        cfg = cfg || {};
        const animators = [];
        animateToShallow(animatable, '', animatable, target, cfg, animationProps, animators, reverse);
        let finishCount = animators.length;
        let doneHappened = false;
        const cfgDone = cfg.done;
        const cfgAborted = cfg.aborted;
        const doneCb = () => {
            doneHappened = true;
            finishCount--;
            if (finishCount <= 0) {
                doneHappened
                    ? (cfgDone && cfgDone())
                    : (cfgAborted && cfgAborted());
            }
        };
        const abortedCb = () => {
            finishCount--;
            if (finishCount <= 0) {
                doneHappened
                    ? (cfgDone && cfgDone())
                    : (cfgAborted && cfgAborted());
            }
        };
        if (!finishCount) {
            cfgDone && cfgDone();
        }
        if (animators.length > 0 && cfg.during) {
            animators[0].during((target, percent) => {
                cfg.during(percent);
            });
        }
        for (let i = 0; i < animators.length; i++) {
            const animator = animators[i];
            if (doneCb) {
                animator.done(doneCb);
            }
            if (abortedCb) {
                animator.aborted(abortedCb);
            }
            if (cfg.force) {
                animator.duration(cfg.duration);
            }
            animator.start(cfg.easing);
        }
        return animators;
    }
    function copyArrShallow(source, target, len) {
        for (let i = 0; i < len; i++) {
            source[i] = target[i];
        }
    }
    function is2DArray(value) {
        return isArrayLike(value[0]);
    }
    function copyValue(target, source, key) {
        if (isArrayLike(source[key])) {
            if (!isArrayLike(target[key])) {
                target[key] = [];
            }
            if (isTypedArray(source[key])) {
                const len = source[key].length;
                if (target[key].length !== len) {
                    target[key] = new (source[key].constructor)(len);
                    copyArrShallow(target[key], source[key], len);
                }
            }
            else {
                const sourceArr = source[key];
                const targetArr = target[key];
                const len0 = sourceArr.length;
                if (is2DArray(sourceArr)) {
                    const len1 = sourceArr[0].length;
                    for (let i = 0; i < len0; i++) {
                        if (!targetArr[i]) {
                            targetArr[i] = Array.prototype.slice.call(sourceArr[i]);
                        }
                        else {
                            copyArrShallow(targetArr[i], sourceArr[i], len1);
                        }
                    }
                }
                else {
                    copyArrShallow(targetArr, sourceArr, len0);
                }
                targetArr.length = sourceArr.length;
            }
        }
        else {
            target[key] = source[key];
        }
    }
    function isValueSame(val1, val2) {
        return val1 === val2
            || isArrayLike(val1) && isArrayLike(val2) && is1DArraySame(val1, val2);
    }
    function is1DArraySame(arr0, arr1) {
        const len = arr0.length;
        if (len !== arr1.length) {
            return false;
        }
        for (let i = 0; i < len; i++) {
            if (arr0[i] !== arr1[i]) {
                return false;
            }
        }
        return true;
    }
    function animateToShallow(animatable, topKey, animateObj, target, cfg, animationProps, animators, reverse) {
        const targetKeys = keys(target);
        const duration = cfg.duration;
        const delay = cfg.delay;
        const additive = cfg.additive;
        const setToFinal = cfg.setToFinal;
        const animateAll = !isObject(animationProps);
        const existsAnimators = animatable.animators;
        let animationKeys = [];
        for (let k = 0; k < targetKeys.length; k++) {
            const innerKey = targetKeys[k];
            const targetVal = target[innerKey];
            if (targetVal != null && animateObj[innerKey] != null
                && (animateAll || animationProps[innerKey])) {
                if (isObject(targetVal)
                    && !isArrayLike(targetVal)
                    && !isGradientObject(targetVal)) {
                    if (topKey) {
                        if (!reverse) {
                            animateObj[innerKey] = targetVal;
                            animatable.updateDuringAnimation(topKey);
                        }
                        continue;
                    }
                    animateToShallow(animatable, innerKey, animateObj[innerKey], targetVal, cfg, animationProps && animationProps[innerKey], animators, reverse);
                }
                else {
                    animationKeys.push(innerKey);
                }
            }
            else if (!reverse) {
                animateObj[innerKey] = targetVal;
                animatable.updateDuringAnimation(topKey);
                animationKeys.push(innerKey);
            }
        }
        let keyLen = animationKeys.length;
        if (!additive && keyLen) {
            for (let i = 0; i < existsAnimators.length; i++) {
                const animator = existsAnimators[i];
                if (animator.targetName === topKey) {
                    const allAborted = animator.stopTracks(animationKeys);
                    if (allAborted) {
                        const idx = indexOf(existsAnimators, animator);
                        existsAnimators.splice(idx, 1);
                    }
                }
            }
        }
        if (!cfg.force) {
            animationKeys = filter(animationKeys, key => !isValueSame(target[key], animateObj[key]));
            keyLen = animationKeys.length;
        }
        if (keyLen > 0
            || (cfg.force && !animators.length)) {
            let revertedSource;
            let reversedTarget;
            let sourceClone;
            if (reverse) {
                reversedTarget = {};
                if (setToFinal) {
                    revertedSource = {};
                }
                for (let i = 0; i < keyLen; i++) {
                    const innerKey = animationKeys[i];
                    reversedTarget[innerKey] = animateObj[innerKey];
                    if (setToFinal) {
                        revertedSource[innerKey] = target[innerKey];
                    }
                    else {
                        animateObj[innerKey] = target[innerKey];
                    }
                }
            }
            else if (setToFinal) {
                sourceClone = {};
                for (let i = 0; i < keyLen; i++) {
                    const innerKey = animationKeys[i];
                    sourceClone[innerKey] = cloneValue(animateObj[innerKey]);
                    copyValue(animateObj, target, innerKey);
                }
            }
            const animator = new Animator(animateObj, false, false, additive ? filter(existsAnimators, animator => animator.targetName === topKey) : null);
            animator.targetName = topKey;
            if (cfg.scope) {
                animator.scope = cfg.scope;
            }
            if (setToFinal && revertedSource) {
                animator.whenWithKeys(0, revertedSource, animationKeys);
            }
            if (sourceClone) {
                animator.whenWithKeys(0, sourceClone, animationKeys);
            }
            animator.whenWithKeys(duration == null ? 500 : duration, reverse ? reversedTarget : target, animationKeys).delay(delay || 0);
            animatable.addAnimator(animator, topKey);
            animators.push(animator);
        }
    }

    class Group extends Element {
        constructor(opts) {
            super();
            this.isGroup = true;
            this._children = [];
            this.attr(opts);
        }
        childrenRef() {
            return this._children;
        }
        children() {
            return this._children.slice();
        }
        childAt(idx) {
            return this._children[idx];
        }
        childOfName(name) {
            const children = this._children;
            for (let i = 0; i < children.length; i++) {
                if (children[i].name === name) {
                    return children[i];
                }
            }
        }
        childCount() {
            return this._children.length;
        }
        add(child) {
            if (child) {
                if (child !== this && child.parent !== this) {
                    this._children.push(child);
                    this._doAdd(child);
                }
                {
                    if (child.__hostTarget) {
                        throw 'This elemenet has been used as an attachment';
                    }
                }
            }
            return this;
        }
        addBefore(child, nextSibling) {
            if (child && child !== this && child.parent !== this
                && nextSibling && nextSibling.parent === this) {
                const children = this._children;
                const idx = children.indexOf(nextSibling);
                if (idx >= 0) {
                    children.splice(idx, 0, child);
                    this._doAdd(child);
                }
            }
            return this;
        }
        replace(oldChild, newChild) {
            const idx = indexOf(this._children, oldChild);
            if (idx >= 0) {
                this.replaceAt(newChild, idx);
            }
            return this;
        }
        replaceAt(child, index) {
            const children = this._children;
            const old = children[index];
            if (child && child !== this && child.parent !== this && child !== old) {
                children[index] = child;
                old.parent = null;
                const zr = this.__zr;
                if (zr) {
                    old.removeSelfFromZr(zr);
                }
                this._doAdd(child);
            }
            return this;
        }
        _doAdd(child) {
            if (child.parent) {
                child.parent.remove(child);
            }
            child.parent = this;
            const zr = this.__zr;
            if (zr && zr !== child.__zr) {
                child.addSelfToZr(zr);
            }
            zr && zr.refresh();
        }
        remove(child) {
            const zr = this.__zr;
            const children = this._children;
            const idx = indexOf(children, child);
            if (idx < 0) {
                return this;
            }
            children.splice(idx, 1);
            child.parent = null;
            if (zr) {
                child.removeSelfFromZr(zr);
            }
            zr && zr.refresh();
            return this;
        }
        removeAll() {
            const children = this._children;
            const zr = this.__zr;
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                if (zr) {
                    child.removeSelfFromZr(zr);
                }
                child.parent = null;
            }
            children.length = 0;
            return this;
        }
        eachChild(cb, context) {
            const children = this._children;
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                cb.call(context, child, i);
            }
            return this;
        }
        traverse(cb, context) {
            for (let i = 0; i < this._children.length; i++) {
                const child = this._children[i];
                const stopped = cb.call(context, child);
                if (child.isGroup && !stopped) {
                    child.traverse(cb, context);
                }
            }
            return this;
        }
        addSelfToZr(zr) {
            super.addSelfToZr(zr);
            for (let i = 0; i < this._children.length; i++) {
                const child = this._children[i];
                child.addSelfToZr(zr);
            }
        }
        removeSelfFromZr(zr) {
            super.removeSelfFromZr(zr);
            for (let i = 0; i < this._children.length; i++) {
                const child = this._children[i];
                child.removeSelfFromZr(zr);
            }
        }
        getBoundingRect(includeChildren) {
            const tmpRect = new BoundingRect(0, 0, 0, 0);
            const children = includeChildren || this._children;
            const tmpMat = [];
            let rect = null;
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                if (child.ignore || child.invisible) {
                    continue;
                }
                const childRect = child.getBoundingRect();
                const transform = child.getLocalTransform(tmpMat);
                if (transform) {
                    BoundingRect.applyTransform(tmpRect, childRect, transform);
                    rect = rect || tmpRect.clone();
                    rect.union(tmpRect);
                }
                else {
                    rect = rect || childRect.clone();
                    rect.union(childRect);
                }
            }
            return rect || tmpRect;
        }
    }
    Group.prototype.type = 'group';

    /*!
    * ZRender, a high performance 2d drawing library.
    *
    * Copyright (c) 2013, Baidu Inc.
    * All rights reserved.
    *
    * LICENSE
    * https://github.com/ecomfe/zrender/blob/master/LICENSE.txt
    */
    const painterCtors = {};
    let instances = {};
    function delInstance(id) {
        delete instances[id];
    }
    function isDarkMode(backgroundColor) {
        if (!backgroundColor) {
            return false;
        }
        if (typeof backgroundColor === 'string') {
            return lum(backgroundColor, 1) < DARK_MODE_THRESHOLD;
        }
        else if (backgroundColor.colorStops) {
            const colorStops = backgroundColor.colorStops;
            let totalLum = 0;
            const len = colorStops.length;
            for (let i = 0; i < len; i++) {
                totalLum += lum(colorStops[i].color, 1);
            }
            totalLum /= len;
            return totalLum < DARK_MODE_THRESHOLD;
        }
        return false;
    }
    class ZRender {
        constructor(id, dom, opts) {
            this._sleepAfterStill = 10;
            this._stillFrameAccum = 0;
            this._needsRefresh = true;
            this._needsRefreshHover = true;
            this._darkMode = false;
            opts = opts || {};
            this.dom = dom;
            this.id = id;
            const storage = new Storage();
            let rendererType = opts.renderer || 'canvas';
            if (!painterCtors[rendererType]) {
                rendererType = keys(painterCtors)[0];
            }
            {
                if (!painterCtors[rendererType]) {
                    throw new Error(`Renderer '${rendererType}' is not imported. Please import it first.`);
                }
            }
            opts.useDirtyRect = opts.useDirtyRect == null
                ? false
                : opts.useDirtyRect;
            const painter = new painterCtors[rendererType](dom, storage, opts, id);
            const ssrMode = opts.ssr || painter.ssrOnly;
            this.storage = storage;
            this.painter = painter;
            const handlerProxy = (!env.node && !env.worker && !ssrMode)
                ? new HandlerDomProxy(painter.getViewportRoot(), painter.root)
                : null;
            const useCoarsePointer = opts.useCoarsePointer;
            const usePointerSize = (useCoarsePointer == null || useCoarsePointer === 'auto')
                ? env.touchEventsSupported
                : !!useCoarsePointer;
            const defaultPointerSize = 44;
            let pointerSize;
            if (usePointerSize) {
                pointerSize = retrieve2(opts.pointerSize, defaultPointerSize);
            }
            this.handler = new Handler(storage, painter, handlerProxy, painter.root, pointerSize);
            this.animation = new Animation({
                stage: {
                    update: ssrMode ? null : () => this._flush(true)
                }
            });
            if (!ssrMode) {
                this.animation.start();
            }
        }
        add(el) {
            if (this._disposed || !el) {
                return;
            }
            this.storage.addRoot(el);
            el.addSelfToZr(this);
            this.refresh();
        }
        remove(el) {
            if (this._disposed || !el) {
                return;
            }
            this.storage.delRoot(el);
            el.removeSelfFromZr(this);
            this.refresh();
        }
        configLayer(zLevel, config) {
            if (this._disposed) {
                return;
            }
            if (this.painter.configLayer) {
                this.painter.configLayer(zLevel, config);
            }
            this.refresh();
        }
        setBackgroundColor(backgroundColor) {
            if (this._disposed) {
                return;
            }
            if (this.painter.setBackgroundColor) {
                this.painter.setBackgroundColor(backgroundColor);
            }
            this.refresh();
            this._backgroundColor = backgroundColor;
            this._darkMode = isDarkMode(backgroundColor);
        }
        getBackgroundColor() {
            return this._backgroundColor;
        }
        setDarkMode(darkMode) {
            this._darkMode = darkMode;
        }
        isDarkMode() {
            return this._darkMode;
        }
        refreshImmediately(fromInside) {
            if (this._disposed) {
                return;
            }
            if (!fromInside) {
                this.animation.update(true);
            }
            this._needsRefresh = false;
            this.painter.refresh();
            this._needsRefresh = false;
        }
        refresh() {
            if (this._disposed) {
                return;
            }
            this._needsRefresh = true;
            this.animation.start();
        }
        flush() {
            if (this._disposed) {
                return;
            }
            this._flush(false);
        }
        _flush(fromInside) {
            let triggerRendered;
            const start = getTime();
            if (this._needsRefresh) {
                triggerRendered = true;
                this.refreshImmediately(fromInside);
            }
            if (this._needsRefreshHover) {
                triggerRendered = true;
                this.refreshHoverImmediately();
            }
            const end = getTime();
            if (triggerRendered) {
                this._stillFrameAccum = 0;
                this.trigger('rendered', {
                    elapsedTime: end - start
                });
            }
            else if (this._sleepAfterStill > 0) {
                this._stillFrameAccum++;
                if (this._stillFrameAccum > this._sleepAfterStill) {
                    this.animation.stop();
                }
            }
        }
        setSleepAfterStill(stillFramesCount) {
            this._sleepAfterStill = stillFramesCount;
        }
        wakeUp() {
            if (this._disposed) {
                return;
            }
            this.animation.start();
            this._stillFrameAccum = 0;
        }
        refreshHover() {
            this._needsRefreshHover = true;
        }
        refreshHoverImmediately() {
            if (this._disposed) {
                return;
            }
            this._needsRefreshHover = false;
            if (this.painter.refreshHover && this.painter.getType() === 'canvas') {
                this.painter.refreshHover();
            }
        }
        resize(opts) {
            if (this._disposed) {
                return;
            }
            opts = opts || {};
            this.painter.resize(opts.width, opts.height);
            this.handler.resize();
        }
        clearAnimation() {
            if (this._disposed) {
                return;
            }
            this.animation.clear();
        }
        getWidth() {
            if (this._disposed) {
                return;
            }
            return this.painter.getWidth();
        }
        getHeight() {
            if (this._disposed) {
                return;
            }
            return this.painter.getHeight();
        }
        setCursorStyle(cursorStyle) {
            if (this._disposed) {
                return;
            }
            this.handler.setCursorStyle(cursorStyle);
        }
        findHover(x, y) {
            if (this._disposed) {
                return;
            }
            return this.handler.findHover(x, y);
        }
        on(eventName, eventHandler, context) {
            if (!this._disposed) {
                this.handler.on(eventName, eventHandler, context);
            }
            return this;
        }
        off(eventName, eventHandler) {
            if (this._disposed) {
                return;
            }
            this.handler.off(eventName, eventHandler);
        }
        trigger(eventName, event) {
            if (this._disposed) {
                return;
            }
            this.handler.trigger(eventName, event);
        }
        clear() {
            if (this._disposed) {
                return;
            }
            const roots = this.storage.getRoots();
            for (let i = 0; i < roots.length; i++) {
                if (roots[i] instanceof Group) {
                    roots[i].removeSelfFromZr(this);
                }
            }
            this.storage.delAllRoots();
            this.painter.clear();
        }
        dispose() {
            if (this._disposed) {
                return;
            }
            this.animation.stop();
            this.clear();
            this.storage.dispose();
            this.painter.dispose();
            this.handler.dispose();
            this.animation =
                this.storage =
                    this.painter =
                        this.handler = null;
            this._disposed = true;
            delInstance(this.id);
        }
    }
    function init(dom, opts) {
        const zr = new ZRender(guid(), dom, opts);
        instances[zr.id] = zr;
        return zr;
    }
    function dispose(zr) {
        zr.dispose();
    }
    function disposeAll() {
        for (let key in instances) {
            if (instances.hasOwnProperty(key)) {
                instances[key].dispose();
            }
        }
        instances = {};
    }
    function getInstance(id) {
        return instances[id];
    }
    function registerPainter(name, Ctor) {
        painterCtors[name] = Ctor;
    }
    let ssrDataGetter;
    function getElementSSRData(el) {
        if (typeof ssrDataGetter === 'function') {
            return ssrDataGetter(el);
        }
    }
    function registerSSRDataGetter(getter) {
        ssrDataGetter = getter;
    }
    const version = '5.6.0';

    const STYLE_MAGIC_KEY = '__zr_style_' + Math.round((Math.random() * 10));
    const DEFAULT_COMMON_STYLE = {
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: '#000',
        opacity: 1,
        blend: 'source-over'
    };
    const DEFAULT_COMMON_ANIMATION_PROPS = {
        style: {
            shadowBlur: true,
            shadowOffsetX: true,
            shadowOffsetY: true,
            shadowColor: true,
            opacity: true
        }
    };
    DEFAULT_COMMON_STYLE[STYLE_MAGIC_KEY] = true;
    const PRIMARY_STATES_KEYS$1 = ['z', 'z2', 'invisible'];
    const PRIMARY_STATES_KEYS_IN_HOVER_LAYER = ['invisible'];
    class Displayable extends Element {
        constructor(props) {
            super(props);
        }
        _init(props) {
            const keysArr = keys(props);
            for (let i = 0; i < keysArr.length; i++) {
                const key = keysArr[i];
                if (key === 'style') {
                    this.useStyle(props[key]);
                }
                else {
                    super.attrKV(key, props[key]);
                }
            }
            if (!this.style) {
                this.useStyle({});
            }
        }
        beforeBrush() { }
        afterBrush() { }
        innerBeforeBrush() { }
        innerAfterBrush() { }
        shouldBePainted(viewWidth, viewHeight, considerClipPath, considerAncestors) {
            const m = this.transform;
            if (this.ignore
                || this.invisible
                || this.style.opacity === 0
                || (this.culling
                    && isDisplayableCulled(this, viewWidth, viewHeight))
                || (m && !m[0] && !m[3])) {
                return false;
            }
            if (considerClipPath && this.__clipPaths) {
                for (let i = 0; i < this.__clipPaths.length; ++i) {
                    if (this.__clipPaths[i].isZeroArea()) {
                        return false;
                    }
                }
            }
            if (considerAncestors && this.parent) {
                let parent = this.parent;
                while (parent) {
                    if (parent.ignore) {
                        return false;
                    }
                    parent = parent.parent;
                }
            }
            return true;
        }
        contain(x, y) {
            return this.rectContain(x, y);
        }
        traverse(cb, context) {
            cb.call(context, this);
        }
        rectContain(x, y) {
            const coord = this.transformCoordToLocal(x, y);
            const rect = this.getBoundingRect();
            return rect.contain(coord[0], coord[1]);
        }
        getPaintRect() {
            let rect = this._paintRect;
            if (!this._paintRect || this.__dirty) {
                const transform = this.transform;
                const elRect = this.getBoundingRect();
                const style = this.style;
                const shadowSize = style.shadowBlur || 0;
                const shadowOffsetX = style.shadowOffsetX || 0;
                const shadowOffsetY = style.shadowOffsetY || 0;
                rect = this._paintRect || (this._paintRect = new BoundingRect(0, 0, 0, 0));
                if (transform) {
                    BoundingRect.applyTransform(rect, elRect, transform);
                }
                else {
                    rect.copy(elRect);
                }
                if (shadowSize || shadowOffsetX || shadowOffsetY) {
                    rect.width += shadowSize * 2 + Math.abs(shadowOffsetX);
                    rect.height += shadowSize * 2 + Math.abs(shadowOffsetY);
                    rect.x = Math.min(rect.x, rect.x + shadowOffsetX - shadowSize);
                    rect.y = Math.min(rect.y, rect.y + shadowOffsetY - shadowSize);
                }
                const tolerance = this.dirtyRectTolerance;
                if (!rect.isZero()) {
                    rect.x = Math.floor(rect.x - tolerance);
                    rect.y = Math.floor(rect.y - tolerance);
                    rect.width = Math.ceil(rect.width + 1 + tolerance * 2);
                    rect.height = Math.ceil(rect.height + 1 + tolerance * 2);
                }
            }
            return rect;
        }
        setPrevPaintRect(paintRect) {
            if (paintRect) {
                this._prevPaintRect = this._prevPaintRect || new BoundingRect(0, 0, 0, 0);
                this._prevPaintRect.copy(paintRect);
            }
            else {
                this._prevPaintRect = null;
            }
        }
        getPrevPaintRect() {
            return this._prevPaintRect;
        }
        animateStyle(loop) {
            return this.animate('style', loop);
        }
        updateDuringAnimation(targetKey) {
            if (targetKey === 'style') {
                this.dirtyStyle();
            }
            else {
                this.markRedraw();
            }
        }
        attrKV(key, value) {
            if (key !== 'style') {
                super.attrKV(key, value);
            }
            else {
                if (!this.style) {
                    this.useStyle(value);
                }
                else {
                    this.setStyle(value);
                }
            }
        }
        setStyle(keyOrObj, value) {
            if (typeof keyOrObj === 'string') {
                this.style[keyOrObj] = value;
            }
            else {
                extend(this.style, keyOrObj);
            }
            this.dirtyStyle();
            return this;
        }
        dirtyStyle(notRedraw) {
            if (!notRedraw) {
                this.markRedraw();
            }
            this.__dirty |= STYLE_CHANGED_BIT;
            if (this._rect) {
                this._rect = null;
            }
        }
        dirty() {
            this.dirtyStyle();
        }
        styleChanged() {
            return !!(this.__dirty & STYLE_CHANGED_BIT);
        }
        styleUpdated() {
            this.__dirty &= ~STYLE_CHANGED_BIT;
        }
        createStyle(obj) {
            return createObject(DEFAULT_COMMON_STYLE, obj);
        }
        useStyle(obj) {
            if (!obj[STYLE_MAGIC_KEY]) {
                obj = this.createStyle(obj);
            }
            if (this.__inHover) {
                this.__hoverStyle = obj;
            }
            else {
                this.style = obj;
            }
            this.dirtyStyle();
        }
        isStyleObject(obj) {
            return obj[STYLE_MAGIC_KEY];
        }
        _innerSaveToNormal(toState) {
            super._innerSaveToNormal(toState);
            const normalState = this._normalState;
            if (toState.style && !normalState.style) {
                normalState.style = this._mergeStyle(this.createStyle(), this.style);
            }
            this._savePrimaryToNormal(toState, normalState, PRIMARY_STATES_KEYS$1);
        }
        _applyStateObj(stateName, state, normalState, keepCurrentStates, transition, animationCfg) {
            super._applyStateObj(stateName, state, normalState, keepCurrentStates, transition, animationCfg);
            const needsRestoreToNormal = !(state && keepCurrentStates);
            let targetStyle;
            if (state && state.style) {
                if (transition) {
                    if (keepCurrentStates) {
                        targetStyle = state.style;
                    }
                    else {
                        targetStyle = this._mergeStyle(this.createStyle(), normalState.style);
                        this._mergeStyle(targetStyle, state.style);
                    }
                }
                else {
                    targetStyle = this._mergeStyle(this.createStyle(), keepCurrentStates ? this.style : normalState.style);
                    this._mergeStyle(targetStyle, state.style);
                }
            }
            else if (needsRestoreToNormal) {
                targetStyle = normalState.style;
            }
            if (targetStyle) {
                if (transition) {
                    const sourceStyle = this.style;
                    this.style = this.createStyle(needsRestoreToNormal ? {} : sourceStyle);
                    if (needsRestoreToNormal) {
                        const changedKeys = keys(sourceStyle);
                        for (let i = 0; i < changedKeys.length; i++) {
                            const key = changedKeys[i];
                            if (key in targetStyle) {
                                targetStyle[key] = targetStyle[key];
                                this.style[key] = sourceStyle[key];
                            }
                        }
                    }
                    const targetKeys = keys(targetStyle);
                    for (let i = 0; i < targetKeys.length; i++) {
                        const key = targetKeys[i];
                        this.style[key] = this.style[key];
                    }
                    this._transitionState(stateName, {
                        style: targetStyle
                    }, animationCfg, this.getAnimationStyleProps());
                }
                else {
                    this.useStyle(targetStyle);
                }
            }
            const statesKeys = this.__inHover ? PRIMARY_STATES_KEYS_IN_HOVER_LAYER : PRIMARY_STATES_KEYS$1;
            for (let i = 0; i < statesKeys.length; i++) {
                let key = statesKeys[i];
                if (state && state[key] != null) {
                    this[key] = state[key];
                }
                else if (needsRestoreToNormal) {
                    if (normalState[key] != null) {
                        this[key] = normalState[key];
                    }
                }
            }
        }
        _mergeStates(states) {
            const mergedState = super._mergeStates(states);
            let mergedStyle;
            for (let i = 0; i < states.length; i++) {
                const state = states[i];
                if (state.style) {
                    mergedStyle = mergedStyle || {};
                    this._mergeStyle(mergedStyle, state.style);
                }
            }
            if (mergedStyle) {
                mergedState.style = mergedStyle;
            }
            return mergedState;
        }
        _mergeStyle(targetStyle, sourceStyle) {
            extend(targetStyle, sourceStyle);
            return targetStyle;
        }
        getAnimationStyleProps() {
            return DEFAULT_COMMON_ANIMATION_PROPS;
        }
    }
    Displayable.initDefaultProps = (function () {
        const dispProto = Displayable.prototype;
        dispProto.type = 'displayable';
        dispProto.invisible = false;
        dispProto.z = 0;
        dispProto.z2 = 0;
        dispProto.zlevel = 0;
        dispProto.culling = false;
        dispProto.cursor = 'pointer';
        dispProto.rectHover = false;
        dispProto.incremental = false;
        dispProto._rect = null;
        dispProto.dirtyRectTolerance = 0;
        dispProto.__dirty = REDRAW_BIT | STYLE_CHANGED_BIT;
    })();
    const tmpRect$1 = new BoundingRect(0, 0, 0, 0);
    const viewRect = new BoundingRect(0, 0, 0, 0);
    function isDisplayableCulled(el, width, height) {
        tmpRect$1.copy(el.getBoundingRect());
        if (el.transform) {
            tmpRect$1.applyTransform(el.transform);
        }
        viewRect.width = width;
        viewRect.height = height;
        return !tmpRect$1.intersect(viewRect);
    }

    const mathMin$1 = Math.min;
    const mathMax$1 = Math.max;
    const mathSin = Math.sin;
    const mathCos = Math.cos;
    const PI2 = Math.PI * 2;
    const start = create();
    const end = create();
    const extremity = create();
    function fromPoints(points, min, max) {
        if (points.length === 0) {
            return;
        }
        let p = points[0];
        let left = p[0];
        let right = p[0];
        let top = p[1];
        let bottom = p[1];
        for (let i = 1; i < points.length; i++) {
            p = points[i];
            left = mathMin$1(left, p[0]);
            right = mathMax$1(right, p[0]);
            top = mathMin$1(top, p[1]);
            bottom = mathMax$1(bottom, p[1]);
        }
        min[0] = left;
        min[1] = top;
        max[0] = right;
        max[1] = bottom;
    }
    function fromLine(x0, y0, x1, y1, min, max) {
        min[0] = mathMin$1(x0, x1);
        min[1] = mathMin$1(y0, y1);
        max[0] = mathMax$1(x0, x1);
        max[1] = mathMax$1(y0, y1);
    }
    const xDim = [];
    const yDim = [];
    function fromCubic(x0, y0, x1, y1, x2, y2, x3, y3, min, max) {
        const cubicExtrema$1 = cubicExtrema;
        const cubicAt$1 = cubicAt;
        let n = cubicExtrema$1(x0, x1, x2, x3, xDim);
        min[0] = Infinity;
        min[1] = Infinity;
        max[0] = -Infinity;
        max[1] = -Infinity;
        for (let i = 0; i < n; i++) {
            const x = cubicAt$1(x0, x1, x2, x3, xDim[i]);
            min[0] = mathMin$1(x, min[0]);
            max[0] = mathMax$1(x, max[0]);
        }
        n = cubicExtrema$1(y0, y1, y2, y3, yDim);
        for (let i = 0; i < n; i++) {
            const y = cubicAt$1(y0, y1, y2, y3, yDim[i]);
            min[1] = mathMin$1(y, min[1]);
            max[1] = mathMax$1(y, max[1]);
        }
        min[0] = mathMin$1(x0, min[0]);
        max[0] = mathMax$1(x0, max[0]);
        min[0] = mathMin$1(x3, min[0]);
        max[0] = mathMax$1(x3, max[0]);
        min[1] = mathMin$1(y0, min[1]);
        max[1] = mathMax$1(y0, max[1]);
        min[1] = mathMin$1(y3, min[1]);
        max[1] = mathMax$1(y3, max[1]);
    }
    function fromQuadratic(x0, y0, x1, y1, x2, y2, min, max) {
        const quadraticExtremum$1 = quadraticExtremum;
        const quadraticAt$1 = quadraticAt;
        const tx = mathMax$1(mathMin$1(quadraticExtremum$1(x0, x1, x2), 1), 0);
        const ty = mathMax$1(mathMin$1(quadraticExtremum$1(y0, y1, y2), 1), 0);
        const x = quadraticAt$1(x0, x1, x2, tx);
        const y = quadraticAt$1(y0, y1, y2, ty);
        min[0] = mathMin$1(x0, x2, x);
        min[1] = mathMin$1(y0, y2, y);
        max[0] = mathMax$1(x0, x2, x);
        max[1] = mathMax$1(y0, y2, y);
    }
    function fromArc(x, y, rx, ry, startAngle, endAngle, anticlockwise, min$1, max$1) {
        const vec2Min = min;
        const vec2Max = max;
        const diff = Math.abs(startAngle - endAngle);
        if (diff % PI2 < 1e-4 && diff > 1e-4) {
            min$1[0] = x - rx;
            min$1[1] = y - ry;
            max$1[0] = x + rx;
            max$1[1] = y + ry;
            return;
        }
        start[0] = mathCos(startAngle) * rx + x;
        start[1] = mathSin(startAngle) * ry + y;
        end[0] = mathCos(endAngle) * rx + x;
        end[1] = mathSin(endAngle) * ry + y;
        vec2Min(min$1, start, end);
        vec2Max(max$1, start, end);
        startAngle = startAngle % (PI2);
        if (startAngle < 0) {
            startAngle = startAngle + PI2;
        }
        endAngle = endAngle % (PI2);
        if (endAngle < 0) {
            endAngle = endAngle + PI2;
        }
        if (startAngle > endAngle && !anticlockwise) {
            endAngle += PI2;
        }
        else if (startAngle < endAngle && anticlockwise) {
            startAngle += PI2;
        }
        if (anticlockwise) {
            const tmp = endAngle;
            endAngle = startAngle;
            startAngle = tmp;
        }
        for (let angle = 0; angle < endAngle; angle += Math.PI / 2) {
            if (angle > startAngle) {
                extremity[0] = mathCos(angle) * rx + x;
                extremity[1] = mathSin(angle) * ry + y;
                vec2Min(min$1, extremity, min$1);
                vec2Max(max$1, extremity, max$1);
            }
        }
    }

    const CMD = {
        M: 1,
        L: 2,
        C: 3,
        Q: 4,
        A: 5,
        Z: 6,
        R: 7
    };
    const tmpOutX = [];
    const tmpOutY = [];
    const min$1 = [];
    const max$1 = [];
    const min2 = [];
    const max2 = [];
    const mathMin$2 = Math.min;
    const mathMax$2 = Math.max;
    const mathCos$1 = Math.cos;
    const mathSin$1 = Math.sin;
    const mathAbs = Math.abs;
    const PI = Math.PI;
    const PI2$1 = PI * 2;
    const hasTypedArray = typeof Float32Array !== 'undefined';
    const tmpAngles = [];
    function modPI2(radian) {
        const n = Math.round(radian / PI * 1e8) / 1e8;
        return (n % 2) * PI;
    }
    function normalizeArcAngles(angles, anticlockwise) {
        let newStartAngle = modPI2(angles[0]);
        if (newStartAngle < 0) {
            newStartAngle += PI2$1;
        }
        let delta = newStartAngle - angles[0];
        let newEndAngle = angles[1];
        newEndAngle += delta;
        if (!anticlockwise && newEndAngle - newStartAngle >= PI2$1) {
            newEndAngle = newStartAngle + PI2$1;
        }
        else if (anticlockwise && newStartAngle - newEndAngle >= PI2$1) {
            newEndAngle = newStartAngle - PI2$1;
        }
        else if (!anticlockwise && newStartAngle > newEndAngle) {
            newEndAngle = newStartAngle + (PI2$1 - modPI2(newStartAngle - newEndAngle));
        }
        else if (anticlockwise && newStartAngle < newEndAngle) {
            newEndAngle = newStartAngle - (PI2$1 - modPI2(newEndAngle - newStartAngle));
        }
        angles[0] = newStartAngle;
        angles[1] = newEndAngle;
    }
    class PathProxy {
        constructor(notSaveData) {
            this.dpr = 1;
            this._xi = 0;
            this._yi = 0;
            this._x0 = 0;
            this._y0 = 0;
            this._len = 0;
            if (notSaveData) {
                this._saveData = false;
            }
            if (this._saveData) {
                this.data = [];
            }
        }
        increaseVersion() {
            this._version++;
        }
        getVersion() {
            return this._version;
        }
        setScale(sx, sy, segmentIgnoreThreshold) {
            segmentIgnoreThreshold = segmentIgnoreThreshold || 0;
            if (segmentIgnoreThreshold > 0) {
                this._ux = mathAbs(segmentIgnoreThreshold / devicePixelRatio / sx) || 0;
                this._uy = mathAbs(segmentIgnoreThreshold / devicePixelRatio / sy) || 0;
            }
        }
        setDPR(dpr) {
            this.dpr = dpr;
        }
        setContext(ctx) {
            this._ctx = ctx;
        }
        getContext() {
            return this._ctx;
        }
        beginPath() {
            this._ctx && this._ctx.beginPath();
            this.reset();
            return this;
        }
        reset() {
            if (this._saveData) {
                this._len = 0;
            }
            if (this._pathSegLen) {
                this._pathSegLen = null;
                this._pathLen = 0;
            }
            this._version++;
        }
        moveTo(x, y) {
            this._drawPendingPt();
            this.addData(CMD.M, x, y);
            this._ctx && this._ctx.moveTo(x, y);
            this._x0 = x;
            this._y0 = y;
            this._xi = x;
            this._yi = y;
            return this;
        }
        lineTo(x, y) {
            const dx = mathAbs(x - this._xi);
            const dy = mathAbs(y - this._yi);
            const exceedUnit = dx > this._ux || dy > this._uy;
            this.addData(CMD.L, x, y);
            if (this._ctx && exceedUnit) {
                this._ctx.lineTo(x, y);
            }
            if (exceedUnit) {
                this._xi = x;
                this._yi = y;
                this._pendingPtDist = 0;
            }
            else {
                const d2 = dx * dx + dy * dy;
                if (d2 > this._pendingPtDist) {
                    this._pendingPtX = x;
                    this._pendingPtY = y;
                    this._pendingPtDist = d2;
                }
            }
            return this;
        }
        bezierCurveTo(x1, y1, x2, y2, x3, y3) {
            this._drawPendingPt();
            this.addData(CMD.C, x1, y1, x2, y2, x3, y3);
            if (this._ctx) {
                this._ctx.bezierCurveTo(x1, y1, x2, y2, x3, y3);
            }
            this._xi = x3;
            this._yi = y3;
            return this;
        }
        quadraticCurveTo(x1, y1, x2, y2) {
            this._drawPendingPt();
            this.addData(CMD.Q, x1, y1, x2, y2);
            if (this._ctx) {
                this._ctx.quadraticCurveTo(x1, y1, x2, y2);
            }
            this._xi = x2;
            this._yi = y2;
            return this;
        }
        arc(cx, cy, r, startAngle, endAngle, anticlockwise) {
            this._drawPendingPt();
            tmpAngles[0] = startAngle;
            tmpAngles[1] = endAngle;
            normalizeArcAngles(tmpAngles, anticlockwise);
            startAngle = tmpAngles[0];
            endAngle = tmpAngles[1];
            let delta = endAngle - startAngle;
            this.addData(CMD.A, cx, cy, r, r, startAngle, delta, 0, anticlockwise ? 0 : 1);
            this._ctx && this._ctx.arc(cx, cy, r, startAngle, endAngle, anticlockwise);
            this._xi = mathCos$1(endAngle) * r + cx;
            this._yi = mathSin$1(endAngle) * r + cy;
            return this;
        }
        arcTo(x1, y1, x2, y2, radius) {
            this._drawPendingPt();
            if (this._ctx) {
                this._ctx.arcTo(x1, y1, x2, y2, radius);
            }
            return this;
        }
        rect(x, y, w, h) {
            this._drawPendingPt();
            this._ctx && this._ctx.rect(x, y, w, h);
            this.addData(CMD.R, x, y, w, h);
            return this;
        }
        closePath() {
            this._drawPendingPt();
            this.addData(CMD.Z);
            const ctx = this._ctx;
            const x0 = this._x0;
            const y0 = this._y0;
            if (ctx) {
                ctx.closePath();
            }
            this._xi = x0;
            this._yi = y0;
            return this;
        }
        fill(ctx) {
            ctx && ctx.fill();
            this.toStatic();
        }
        stroke(ctx) {
            ctx && ctx.stroke();
            this.toStatic();
        }
        len() {
            return this._len;
        }
        setData(data) {
            const len = data.length;
            if (!(this.data && this.data.length === len) && hasTypedArray) {
                this.data = new Float32Array(len);
            }
            for (let i = 0; i < len; i++) {
                this.data[i] = data[i];
            }
            this._len = len;
        }
        appendPath(path) {
            if (!(path instanceof Array)) {
                path = [path];
            }
            const len = path.length;
            let appendSize = 0;
            let offset = this._len;
            for (let i = 0; i < len; i++) {
                appendSize += path[i].len();
            }
            if (hasTypedArray && (this.data instanceof Float32Array)) {
                this.data = new Float32Array(offset + appendSize);
            }
            for (let i = 0; i < len; i++) {
                const appendPathData = path[i].data;
                for (let k = 0; k < appendPathData.length; k++) {
                    this.data[offset++] = appendPathData[k];
                }
            }
            this._len = offset;
        }
        addData(cmd, a, b, c, d, e, f, g, h) {
            if (!this._saveData) {
                return;
            }
            let data = this.data;
            if (this._len + arguments.length > data.length) {
                this._expandData();
                data = this.data;
            }
            for (let i = 0; i < arguments.length; i++) {
                data[this._len++] = arguments[i];
            }
        }
        _drawPendingPt() {
            if (this._pendingPtDist > 0) {
                this._ctx && this._ctx.lineTo(this._pendingPtX, this._pendingPtY);
                this._pendingPtDist = 0;
            }
        }
        _expandData() {
            if (!(this.data instanceof Array)) {
                const newData = [];
                for (let i = 0; i < this._len; i++) {
                    newData[i] = this.data[i];
                }
                this.data = newData;
            }
        }
        toStatic() {
            if (!this._saveData) {
                return;
            }
            this._drawPendingPt();
            const data = this.data;
            if (data instanceof Array) {
                data.length = this._len;
                if (hasTypedArray && this._len > 11) {
                    this.data = new Float32Array(data);
                }
            }
        }
        getBoundingRect() {
            min$1[0] = min$1[1] = min2[0] = min2[1] = Number.MAX_VALUE;
            max$1[0] = max$1[1] = max2[0] = max2[1] = -Number.MAX_VALUE;
            const data = this.data;
            let xi = 0;
            let yi = 0;
            let x0 = 0;
            let y0 = 0;
            let i;
            for (i = 0; i < this._len;) {
                const cmd = data[i++];
                const isFirst = i === 1;
                if (isFirst) {
                    xi = data[i];
                    yi = data[i + 1];
                    x0 = xi;
                    y0 = yi;
                }
                switch (cmd) {
                    case CMD.M:
                        xi = x0 = data[i++];
                        yi = y0 = data[i++];
                        min2[0] = x0;
                        min2[1] = y0;
                        max2[0] = x0;
                        max2[1] = y0;
                        break;
                    case CMD.L:
                        fromLine(xi, yi, data[i], data[i + 1], min2, max2);
                        xi = data[i++];
                        yi = data[i++];
                        break;
                    case CMD.C:
                        fromCubic(xi, yi, data[i++], data[i++], data[i++], data[i++], data[i], data[i + 1], min2, max2);
                        xi = data[i++];
                        yi = data[i++];
                        break;
                    case CMD.Q:
                        fromQuadratic(xi, yi, data[i++], data[i++], data[i], data[i + 1], min2, max2);
                        xi = data[i++];
                        yi = data[i++];
                        break;
                    case CMD.A:
                        const cx = data[i++];
                        const cy = data[i++];
                        const rx = data[i++];
                        const ry = data[i++];
                        const startAngle = data[i++];
                        const endAngle = data[i++] + startAngle;
                        i += 1;
                        const anticlockwise = !data[i++];
                        if (isFirst) {
                            x0 = mathCos$1(startAngle) * rx + cx;
                            y0 = mathSin$1(startAngle) * ry + cy;
                        }
                        fromArc(cx, cy, rx, ry, startAngle, endAngle, anticlockwise, min2, max2);
                        xi = mathCos$1(endAngle) * rx + cx;
                        yi = mathSin$1(endAngle) * ry + cy;
                        break;
                    case CMD.R:
                        x0 = xi = data[i++];
                        y0 = yi = data[i++];
                        const width = data[i++];
                        const height = data[i++];
                        fromLine(x0, y0, x0 + width, y0 + height, min2, max2);
                        break;
                    case CMD.Z:
                        xi = x0;
                        yi = y0;
                        break;
                }
                min(min$1, min$1, min2);
                max(max$1, max$1, max2);
            }
            if (i === 0) {
                min$1[0] = min$1[1] = max$1[0] = max$1[1] = 0;
            }
            return new BoundingRect(min$1[0], min$1[1], max$1[0] - min$1[0], max$1[1] - min$1[1]);
        }
        _calculateLength() {
            const data = this.data;
            const len = this._len;
            const ux = this._ux;
            const uy = this._uy;
            let xi = 0;
            let yi = 0;
            let x0 = 0;
            let y0 = 0;
            if (!this._pathSegLen) {
                this._pathSegLen = [];
            }
            const pathSegLen = this._pathSegLen;
            let pathTotalLen = 0;
            let segCount = 0;
            for (let i = 0; i < len;) {
                const cmd = data[i++];
                const isFirst = i === 1;
                if (isFirst) {
                    xi = data[i];
                    yi = data[i + 1];
                    x0 = xi;
                    y0 = yi;
                }
                let l = -1;
                switch (cmd) {
                    case CMD.M:
                        xi = x0 = data[i++];
                        yi = y0 = data[i++];
                        break;
                    case CMD.L: {
                        const x2 = data[i++];
                        const y2 = data[i++];
                        const dx = x2 - xi;
                        const dy = y2 - yi;
                        if (mathAbs(dx) > ux || mathAbs(dy) > uy || i === len - 1) {
                            l = Math.sqrt(dx * dx + dy * dy);
                            xi = x2;
                            yi = y2;
                        }
                        break;
                    }
                    case CMD.C: {
                        const x1 = data[i++];
                        const y1 = data[i++];
                        const x2 = data[i++];
                        const y2 = data[i++];
                        const x3 = data[i++];
                        const y3 = data[i++];
                        l = cubicLength(xi, yi, x1, y1, x2, y2, x3, y3, 10);
                        xi = x3;
                        yi = y3;
                        break;
                    }
                    case CMD.Q: {
                        const x1 = data[i++];
                        const y1 = data[i++];
                        const x2 = data[i++];
                        const y2 = data[i++];
                        l = quadraticLength(xi, yi, x1, y1, x2, y2, 10);
                        xi = x2;
                        yi = y2;
                        break;
                    }
                    case CMD.A:
                        const cx = data[i++];
                        const cy = data[i++];
                        const rx = data[i++];
                        const ry = data[i++];
                        const startAngle = data[i++];
                        let delta = data[i++];
                        const endAngle = delta + startAngle;
                        i += 1;
                        if (isFirst) {
                            x0 = mathCos$1(startAngle) * rx + cx;
                            y0 = mathSin$1(startAngle) * ry + cy;
                        }
                        l = mathMax$2(rx, ry) * mathMin$2(PI2$1, Math.abs(delta));
                        xi = mathCos$1(endAngle) * rx + cx;
                        yi = mathSin$1(endAngle) * ry + cy;
                        break;
                    case CMD.R: {
                        x0 = xi = data[i++];
                        y0 = yi = data[i++];
                        const width = data[i++];
                        const height = data[i++];
                        l = width * 2 + height * 2;
                        break;
                    }
                    case CMD.Z: {
                        const dx = x0 - xi;
                        const dy = y0 - yi;
                        l = Math.sqrt(dx * dx + dy * dy);
                        xi = x0;
                        yi = y0;
                        break;
                    }
                }
                if (l >= 0) {
                    pathSegLen[segCount++] = l;
                    pathTotalLen += l;
                }
            }
            this._pathLen = pathTotalLen;
            return pathTotalLen;
        }
        rebuildPath(ctx, percent) {
            const d = this.data;
            const ux = this._ux;
            const uy = this._uy;
            const len = this._len;
            let x0;
            let y0;
            let xi;
            let yi;
            let x;
            let y;
            const drawPart = percent < 1;
            let pathSegLen;
            let pathTotalLen;
            let accumLength = 0;
            let segCount = 0;
            let displayedLength;
            let pendingPtDist = 0;
            let pendingPtX;
            let pendingPtY;
            if (drawPart) {
                if (!this._pathSegLen) {
                    this._calculateLength();
                }
                pathSegLen = this._pathSegLen;
                pathTotalLen = this._pathLen;
                displayedLength = percent * pathTotalLen;
                if (!displayedLength) {
                    return;
                }
            }
            lo: for (let i = 0; i < len;) {
                const cmd = d[i++];
                const isFirst = i === 1;
                if (isFirst) {
                    xi = d[i];
                    yi = d[i + 1];
                    x0 = xi;
                    y0 = yi;
                }
                if (cmd !== CMD.L && pendingPtDist > 0) {
                    ctx.lineTo(pendingPtX, pendingPtY);
                    pendingPtDist = 0;
                }
                switch (cmd) {
                    case CMD.M:
                        x0 = xi = d[i++];
                        y0 = yi = d[i++];
                        ctx.moveTo(xi, yi);
                        break;
                    case CMD.L: {
                        x = d[i++];
                        y = d[i++];
                        const dx = mathAbs(x - xi);
                        const dy = mathAbs(y - yi);
                        if (dx > ux || dy > uy) {
                            if (drawPart) {
                                const l = pathSegLen[segCount++];
                                if (accumLength + l > displayedLength) {
                                    const t = (displayedLength - accumLength) / l;
                                    ctx.lineTo(xi * (1 - t) + x * t, yi * (1 - t) + y * t);
                                    break lo;
                                }
                                accumLength += l;
                            }
                            ctx.lineTo(x, y);
                            xi = x;
                            yi = y;
                            pendingPtDist = 0;
                        }
                        else {
                            const d2 = dx * dx + dy * dy;
                            if (d2 > pendingPtDist) {
                                pendingPtX = x;
                                pendingPtY = y;
                                pendingPtDist = d2;
                            }
                        }
                        break;
                    }
                    case CMD.C: {
                        const x1 = d[i++];
                        const y1 = d[i++];
                        const x2 = d[i++];
                        const y2 = d[i++];
                        const x3 = d[i++];
                        const y3 = d[i++];
                        if (drawPart) {
                            const l = pathSegLen[segCount++];
                            if (accumLength + l > displayedLength) {
                                const t = (displayedLength - accumLength) / l;
                                cubicSubdivide(xi, x1, x2, x3, t, tmpOutX);
                                cubicSubdivide(yi, y1, y2, y3, t, tmpOutY);
                                ctx.bezierCurveTo(tmpOutX[1], tmpOutY[1], tmpOutX[2], tmpOutY[2], tmpOutX[3], tmpOutY[3]);
                                break lo;
                            }
                            accumLength += l;
                        }
                        ctx.bezierCurveTo(x1, y1, x2, y2, x3, y3);
                        xi = x3;
                        yi = y3;
                        break;
                    }
                    case CMD.Q: {
                        const x1 = d[i++];
                        const y1 = d[i++];
                        const x2 = d[i++];
                        const y2 = d[i++];
                        if (drawPart) {
                            const l = pathSegLen[segCount++];
                            if (accumLength + l > displayedLength) {
                                const t = (displayedLength - accumLength) / l;
                                quadraticSubdivide(xi, x1, x2, t, tmpOutX);
                                quadraticSubdivide(yi, y1, y2, t, tmpOutY);
                                ctx.quadraticCurveTo(tmpOutX[1], tmpOutY[1], tmpOutX[2], tmpOutY[2]);
                                break lo;
                            }
                            accumLength += l;
                        }
                        ctx.quadraticCurveTo(x1, y1, x2, y2);
                        xi = x2;
                        yi = y2;
                        break;
                    }
                    case CMD.A:
                        const cx = d[i++];
                        const cy = d[i++];
                        const rx = d[i++];
                        const ry = d[i++];
                        let startAngle = d[i++];
                        let delta = d[i++];
                        const psi = d[i++];
                        const anticlockwise = !d[i++];
                        const r = (rx > ry) ? rx : ry;
                        const isEllipse = mathAbs(rx - ry) > 1e-3;
                        let endAngle = startAngle + delta;
                        let breakBuild = false;
                        if (drawPart) {
                            const l = pathSegLen[segCount++];
                            if (accumLength + l > displayedLength) {
                                endAngle = startAngle + delta * (displayedLength - accumLength) / l;
                                breakBuild = true;
                            }
                            accumLength += l;
                        }
                        if (isEllipse && ctx.ellipse) {
                            ctx.ellipse(cx, cy, rx, ry, psi, startAngle, endAngle, anticlockwise);
                        }
                        else {
                            ctx.arc(cx, cy, r, startAngle, endAngle, anticlockwise);
                        }
                        if (breakBuild) {
                            break lo;
                        }
                        if (isFirst) {
                            x0 = mathCos$1(startAngle) * rx + cx;
                            y0 = mathSin$1(startAngle) * ry + cy;
                        }
                        xi = mathCos$1(endAngle) * rx + cx;
                        yi = mathSin$1(endAngle) * ry + cy;
                        break;
                    case CMD.R:
                        x0 = xi = d[i];
                        y0 = yi = d[i + 1];
                        x = d[i++];
                        y = d[i++];
                        const width = d[i++];
                        const height = d[i++];
                        if (drawPart) {
                            const l = pathSegLen[segCount++];
                            if (accumLength + l > displayedLength) {
                                let d = displayedLength - accumLength;
                                ctx.moveTo(x, y);
                                ctx.lineTo(x + mathMin$2(d, width), y);
                                d -= width;
                                if (d > 0) {
                                    ctx.lineTo(x + width, y + mathMin$2(d, height));
                                }
                                d -= height;
                                if (d > 0) {
                                    ctx.lineTo(x + mathMax$2(width - d, 0), y + height);
                                }
                                d -= width;
                                if (d > 0) {
                                    ctx.lineTo(x, y + mathMax$2(height - d, 0));
                                }
                                break lo;
                            }
                            accumLength += l;
                        }
                        ctx.rect(x, y, width, height);
                        break;
                    case CMD.Z:
                        if (drawPart) {
                            const l = pathSegLen[segCount++];
                            if (accumLength + l > displayedLength) {
                                const t = (displayedLength - accumLength) / l;
                                ctx.lineTo(xi * (1 - t) + x0 * t, yi * (1 - t) + y0 * t);
                                break lo;
                            }
                            accumLength += l;
                        }
                        ctx.closePath();
                        xi = x0;
                        yi = y0;
                }
            }
        }
        clone() {
            const newProxy = new PathProxy();
            const data = this.data;
            newProxy.data = data.slice ? data.slice()
                : Array.prototype.slice.call(data);
            newProxy._len = this._len;
            return newProxy;
        }
    }
    PathProxy.CMD = CMD;
    PathProxy.initDefaultProps = (function () {
        const proto = PathProxy.prototype;
        proto._saveData = true;
        proto._ux = 0;
        proto._uy = 0;
        proto._pendingPtDist = 0;
        proto._version = 0;
    })();

    function containStroke(x0, y0, x1, y1, lineWidth, x, y) {
        if (lineWidth === 0) {
            return false;
        }
        const _l = lineWidth;
        let _a = 0;
        let _b = x0;
        if ((y > y0 + _l && y > y1 + _l)
            || (y < y0 - _l && y < y1 - _l)
            || (x > x0 + _l && x > x1 + _l)
            || (x < x0 - _l && x < x1 - _l)) {
            return false;
        }
        if (x0 !== x1) {
            _a = (y0 - y1) / (x0 - x1);
            _b = (x0 * y1 - x1 * y0) / (x0 - x1);
        }
        else {
            return Math.abs(x - x0) <= _l / 2;
        }
        const tmp = _a * x - y + _b;
        const _s = tmp * tmp / (_a * _a + 1);
        return _s <= _l / 2 * _l / 2;
    }

    function containStroke$1(x0, y0, x1, y1, x2, y2, x3, y3, lineWidth, x, y) {
        if (lineWidth === 0) {
            return false;
        }
        const _l = lineWidth;
        if ((y > y0 + _l && y > y1 + _l && y > y2 + _l && y > y3 + _l)
            || (y < y0 - _l && y < y1 - _l && y < y2 - _l && y < y3 - _l)
            || (x > x0 + _l && x > x1 + _l && x > x2 + _l && x > x3 + _l)
            || (x < x0 - _l && x < x1 - _l && x < x2 - _l && x < x3 - _l)) {
            return false;
        }
        const d = cubicProjectPoint(x0, y0, x1, y1, x2, y2, x3, y3, x, y, null);
        return d <= _l / 2;
    }

    function containStroke$2(x0, y0, x1, y1, x2, y2, lineWidth, x, y) {
        if (lineWidth === 0) {
            return false;
        }
        const _l = lineWidth;
        if ((y > y0 + _l && y > y1 + _l && y > y2 + _l)
            || (y < y0 - _l && y < y1 - _l && y < y2 - _l)
            || (x > x0 + _l && x > x1 + _l && x > x2 + _l)
            || (x < x0 - _l && x < x1 - _l && x < x2 - _l)) {
            return false;
        }
        const d = quadraticProjectPoint(x0, y0, x1, y1, x2, y2, x, y, null);
        return d <= _l / 2;
    }

    const PI2$2 = Math.PI * 2;
    function normalizeRadian(angle) {
        angle %= PI2$2;
        if (angle < 0) {
            angle += PI2$2;
        }
        return angle;
    }

    const PI2$3 = Math.PI * 2;
    function containStroke$3(cx, cy, r, startAngle, endAngle, anticlockwise, lineWidth, x, y) {
        if (lineWidth === 0) {
            return false;
        }
        const _l = lineWidth;
        x -= cx;
        y -= cy;
        const d = Math.sqrt(x * x + y * y);
        if ((d - _l > r) || (d + _l < r)) {
            return false;
        }
        if (Math.abs(startAngle - endAngle) % PI2$3 < 1e-4) {
            return true;
        }
        if (anticlockwise) {
            const tmp = startAngle;
            startAngle = normalizeRadian(endAngle);
            endAngle = normalizeRadian(tmp);
        }
        else {
            startAngle = normalizeRadian(startAngle);
            endAngle = normalizeRadian(endAngle);
        }
        if (startAngle > endAngle) {
            endAngle += PI2$3;
        }
        let angle = Math.atan2(y, x);
        if (angle < 0) {
            angle += PI2$3;
        }
        return (angle >= startAngle && angle <= endAngle)
            || (angle + PI2$3 >= startAngle && angle + PI2$3 <= endAngle);
    }

    function windingLine(x0, y0, x1, y1, x, y) {
        if ((y > y0 && y > y1) || (y < y0 && y < y1)) {
            return 0;
        }
        if (y1 === y0) {
            return 0;
        }
        const t = (y - y0) / (y1 - y0);
        let dir = y1 < y0 ? 1 : -1;
        if (t === 1 || t === 0) {
            dir = y1 < y0 ? 0.5 : -0.5;
        }
        const x_ = t * (x1 - x0) + x0;
        return x_ === x ? Infinity : x_ > x ? dir : 0;
    }

    const CMD$1 = PathProxy.CMD;
    const PI2$4 = Math.PI * 2;
    const EPSILON$3 = 1e-4;
    function isAroundEqual(a, b) {
        return Math.abs(a - b) < EPSILON$3;
    }
    const roots = [-1, -1, -1];
    const extrema = [-1, -1];
    function swapExtrema() {
        const tmp = extrema[0];
        extrema[0] = extrema[1];
        extrema[1] = tmp;
    }
    function windingCubic(x0, y0, x1, y1, x2, y2, x3, y3, x, y) {
        if ((y > y0 && y > y1 && y > y2 && y > y3)
            || (y < y0 && y < y1 && y < y2 && y < y3)) {
            return 0;
        }
        const nRoots = cubicRootAt(y0, y1, y2, y3, y, roots);
        if (nRoots === 0) {
            return 0;
        }
        else {
            let w = 0;
            let nExtrema = -1;
            let y0_;
            let y1_;
            for (let i = 0; i < nRoots; i++) {
                let t = roots[i];
                let unit = (t === 0 || t === 1) ? 0.5 : 1;
                let x_ = cubicAt(x0, x1, x2, x3, t);
                if (x_ < x) {
                    continue;
                }
                if (nExtrema < 0) {
                    nExtrema = cubicExtrema(y0, y1, y2, y3, extrema);
                    if (extrema[1] < extrema[0] && nExtrema > 1) {
                        swapExtrema();
                    }
                    y0_ = cubicAt(y0, y1, y2, y3, extrema[0]);
                    if (nExtrema > 1) {
                        y1_ = cubicAt(y0, y1, y2, y3, extrema[1]);
                    }
                }
                if (nExtrema === 2) {
                    if (t < extrema[0]) {
                        w += y0_ < y0 ? unit : -unit;
                    }
                    else if (t < extrema[1]) {
                        w += y1_ < y0_ ? unit : -unit;
                    }
                    else {
                        w += y3 < y1_ ? unit : -unit;
                    }
                }
                else {
                    if (t < extrema[0]) {
                        w += y0_ < y0 ? unit : -unit;
                    }
                    else {
                        w += y3 < y0_ ? unit : -unit;
                    }
                }
            }
            return w;
        }
    }
    function windingQuadratic(x0, y0, x1, y1, x2, y2, x, y) {
        if ((y > y0 && y > y1 && y > y2)
            || (y < y0 && y < y1 && y < y2)) {
            return 0;
        }
        const nRoots = quadraticRootAt(y0, y1, y2, y, roots);
        if (nRoots === 0) {
            return 0;
        }
        else {
            const t = quadraticExtremum(y0, y1, y2);
            if (t >= 0 && t <= 1) {
                let w = 0;
                let y_ = quadraticAt(y0, y1, y2, t);
                for (let i = 0; i < nRoots; i++) {
                    let unit = (roots[i] === 0 || roots[i] === 1) ? 0.5 : 1;
                    let x_ = quadraticAt(x0, x1, x2, roots[i]);
                    if (x_ < x) {
                        continue;
                    }
                    if (roots[i] < t) {
                        w += y_ < y0 ? unit : -unit;
                    }
                    else {
                        w += y2 < y_ ? unit : -unit;
                    }
                }
                return w;
            }
            else {
                const unit = (roots[0] === 0 || roots[0] === 1) ? 0.5 : 1;
                const x_ = quadraticAt(x0, x1, x2, roots[0]);
                if (x_ < x) {
                    return 0;
                }
                return y2 < y0 ? unit : -unit;
            }
        }
    }
    function windingArc(cx, cy, r, startAngle, endAngle, anticlockwise, x, y) {
        y -= cy;
        if (y > r || y < -r) {
            return 0;
        }
        const tmp = Math.sqrt(r * r - y * y);
        roots[0] = -tmp;
        roots[1] = tmp;
        const dTheta = Math.abs(startAngle - endAngle);
        if (dTheta < 1e-4) {
            return 0;
        }
        if (dTheta >= PI2$4 - 1e-4) {
            startAngle = 0;
            endAngle = PI2$4;
            const dir = anticlockwise ? 1 : -1;
            if (x >= roots[0] + cx && x <= roots[1] + cx) {
                return dir;
            }
            else {
                return 0;
            }
        }
        if (startAngle > endAngle) {
            const tmp = startAngle;
            startAngle = endAngle;
            endAngle = tmp;
        }
        if (startAngle < 0) {
            startAngle += PI2$4;
            endAngle += PI2$4;
        }
        let w = 0;
        for (let i = 0; i < 2; i++) {
            const x_ = roots[i];
            if (x_ + cx > x) {
                let angle = Math.atan2(y, x_);
                let dir = anticlockwise ? 1 : -1;
                if (angle < 0) {
                    angle = PI2$4 + angle;
                }
                if ((angle >= startAngle && angle <= endAngle)
                    || (angle + PI2$4 >= startAngle && angle + PI2$4 <= endAngle)) {
                    if (angle > Math.PI / 2 && angle < Math.PI * 1.5) {
                        dir = -dir;
                    }
                    w += dir;
                }
            }
        }
        return w;
    }
    function containPath(path, lineWidth, isStroke, x, y) {
        const data = path.data;
        const len = path.len();
        let w = 0;
        let xi = 0;
        let yi = 0;
        let x0 = 0;
        let y0 = 0;
        let x1;
        let y1;
        for (let i = 0; i < len;) {
            const cmd = data[i++];
            const isFirst = i === 1;
            if (cmd === CMD$1.M && i > 1) {
                if (!isStroke) {
                    w += windingLine(xi, yi, x0, y0, x, y);
                }
            }
            if (isFirst) {
                xi = data[i];
                yi = data[i + 1];
                x0 = xi;
                y0 = yi;
            }
            switch (cmd) {
                case CMD$1.M:
                    x0 = data[i++];
                    y0 = data[i++];
                    xi = x0;
                    yi = y0;
                    break;
                case CMD$1.L:
                    if (isStroke) {
                        if (containStroke(xi, yi, data[i], data[i + 1], lineWidth, x, y)) {
                            return true;
                        }
                    }
                    else {
                        w += windingLine(xi, yi, data[i], data[i + 1], x, y) || 0;
                    }
                    xi = data[i++];
                    yi = data[i++];
                    break;
                case CMD$1.C:
                    if (isStroke) {
                        if (containStroke$1(xi, yi, data[i++], data[i++], data[i++], data[i++], data[i], data[i + 1], lineWidth, x, y)) {
                            return true;
                        }
                    }
                    else {
                        w += windingCubic(xi, yi, data[i++], data[i++], data[i++], data[i++], data[i], data[i + 1], x, y) || 0;
                    }
                    xi = data[i++];
                    yi = data[i++];
                    break;
                case CMD$1.Q:
                    if (isStroke) {
                        if (containStroke$2(xi, yi, data[i++], data[i++], data[i], data[i + 1], lineWidth, x, y)) {
                            return true;
                        }
                    }
                    else {
                        w += windingQuadratic(xi, yi, data[i++], data[i++], data[i], data[i + 1], x, y) || 0;
                    }
                    xi = data[i++];
                    yi = data[i++];
                    break;
                case CMD$1.A:
                    const cx = data[i++];
                    const cy = data[i++];
                    const rx = data[i++];
                    const ry = data[i++];
                    const theta = data[i++];
                    const dTheta = data[i++];
                    i += 1;
                    const anticlockwise = !!(1 - data[i++]);
                    x1 = Math.cos(theta) * rx + cx;
                    y1 = Math.sin(theta) * ry + cy;
                    if (!isFirst) {
                        w += windingLine(xi, yi, x1, y1, x, y);
                    }
                    else {
                        x0 = x1;
                        y0 = y1;
                    }
                    const _x = (x - cx) * ry / rx + cx;
                    if (isStroke) {
                        if (containStroke$3(cx, cy, ry, theta, theta + dTheta, anticlockwise, lineWidth, _x, y)) {
                            return true;
                        }
                    }
                    else {
                        w += windingArc(cx, cy, ry, theta, theta + dTheta, anticlockwise, _x, y);
                    }
                    xi = Math.cos(theta + dTheta) * rx + cx;
                    yi = Math.sin(theta + dTheta) * ry + cy;
                    break;
                case CMD$1.R:
                    x0 = xi = data[i++];
                    y0 = yi = data[i++];
                    const width = data[i++];
                    const height = data[i++];
                    x1 = x0 + width;
                    y1 = y0 + height;
                    if (isStroke) {
                        if (containStroke(x0, y0, x1, y0, lineWidth, x, y)
                            || containStroke(x1, y0, x1, y1, lineWidth, x, y)
                            || containStroke(x1, y1, x0, y1, lineWidth, x, y)
                            || containStroke(x0, y1, x0, y0, lineWidth, x, y)) {
                            return true;
                        }
                    }
                    else {
                        w += windingLine(x1, y0, x1, y1, x, y);
                        w += windingLine(x0, y1, x0, y0, x, y);
                    }
                    break;
                case CMD$1.Z:
                    if (isStroke) {
                        if (containStroke(xi, yi, x0, y0, lineWidth, x, y)) {
                            return true;
                        }
                    }
                    else {
                        w += windingLine(xi, yi, x0, y0, x, y);
                    }
                    xi = x0;
                    yi = y0;
                    break;
            }
        }
        if (!isStroke && !isAroundEqual(yi, y0)) {
            w += windingLine(xi, yi, x0, y0, x, y) || 0;
        }
        return w !== 0;
    }
    function contain(pathProxy, x, y) {
        return containPath(pathProxy, 0, false, x, y);
    }
    function containStroke$4(pathProxy, lineWidth, x, y) {
        return containPath(pathProxy, lineWidth, true, x, y);
    }

    const DEFAULT_PATH_STYLE = defaults({
        fill: '#000',
        stroke: null,
        strokePercent: 1,
        fillOpacity: 1,
        strokeOpacity: 1,
        lineDashOffset: 0,
        lineWidth: 1,
        lineCap: 'butt',
        miterLimit: 10,
        strokeNoScale: false,
        strokeFirst: false
    }, DEFAULT_COMMON_STYLE);
    const DEFAULT_PATH_ANIMATION_PROPS = {
        style: defaults({
            fill: true,
            stroke: true,
            strokePercent: true,
            fillOpacity: true,
            strokeOpacity: true,
            lineDashOffset: true,
            lineWidth: true,
            miterLimit: true
        }, DEFAULT_COMMON_ANIMATION_PROPS.style)
    };
    const pathCopyParams = TRANSFORMABLE_PROPS.concat(['invisible',
        'culling', 'z', 'z2', 'zlevel', 'parent'
    ]);
    class Path extends Displayable {
        constructor(opts) {
            super(opts);
        }
        update() {
            super.update();
            const style = this.style;
            if (style.decal) {
                const decalEl = this._decalEl = this._decalEl || new Path();
                if (decalEl.buildPath === Path.prototype.buildPath) {
                    decalEl.buildPath = ctx => {
                        this.buildPath(ctx, this.shape);
                    };
                }
                decalEl.silent = true;
                const decalElStyle = decalEl.style;
                for (let key in style) {
                    if (decalElStyle[key] !== style[key]) {
                        decalElStyle[key] = style[key];
                    }
                }
                decalElStyle.fill = style.fill ? style.decal : null;
                decalElStyle.decal = null;
                decalElStyle.shadowColor = null;
                style.strokeFirst && (decalElStyle.stroke = null);
                for (let i = 0; i < pathCopyParams.length; ++i) {
                    decalEl[pathCopyParams[i]] = this[pathCopyParams[i]];
                }
                decalEl.__dirty |= REDRAW_BIT;
            }
            else if (this._decalEl) {
                this._decalEl = null;
            }
        }
        getDecalElement() {
            return this._decalEl;
        }
        _init(props) {
            const keysArr = keys(props);
            this.shape = this.getDefaultShape();
            const defaultStyle = this.getDefaultStyle();
            if (defaultStyle) {
                this.useStyle(defaultStyle);
            }
            for (let i = 0; i < keysArr.length; i++) {
                const key = keysArr[i];
                const value = props[key];
                if (key === 'style') {
                    if (!this.style) {
                        this.useStyle(value);
                    }
                    else {
                        extend(this.style, value);
                    }
                }
                else if (key === 'shape') {
                    extend(this.shape, value);
                }
                else {
                    super.attrKV(key, value);
                }
            }
            if (!this.style) {
                this.useStyle({});
            }
        }
        getDefaultStyle() {
            return null;
        }
        getDefaultShape() {
            return {};
        }
        canBeInsideText() {
            return this.hasFill();
        }
        getInsideTextFill() {
            const pathFill = this.style.fill;
            if (pathFill !== 'none') {
                if (isString(pathFill)) {
                    const fillLum = lum(pathFill, 0);
                    if (fillLum > 0.5) {
                        return DARK_LABEL_COLOR;
                    }
                    else if (fillLum > 0.2) {
                        return LIGHTER_LABEL_COLOR;
                    }
                    return LIGHT_LABEL_COLOR;
                }
                else if (pathFill) {
                    return LIGHT_LABEL_COLOR;
                }
            }
            return DARK_LABEL_COLOR;
        }
        getInsideTextStroke(textFill) {
            const pathFill = this.style.fill;
            if (isString(pathFill)) {
                const zr = this.__zr;
                const isDarkMode = !!(zr && zr.isDarkMode());
                const isDarkLabel = lum(textFill, 0) < DARK_MODE_THRESHOLD;
                if (isDarkMode === isDarkLabel) {
                    return pathFill;
                }
            }
        }
        buildPath(ctx, shapeCfg, inBatch) { }
        pathUpdated() {
            this.__dirty &= ~SHAPE_CHANGED_BIT;
        }
        getUpdatedPathProxy(inBatch) {
            !this.path && this.createPathProxy();
            this.path.beginPath();
            this.buildPath(this.path, this.shape, inBatch);
            return this.path;
        }
        createPathProxy() {
            this.path = new PathProxy(false);
        }
        hasStroke() {
            const style = this.style;
            const stroke = style.stroke;
            return !(stroke == null || stroke === 'none' || !(style.lineWidth > 0));
        }
        hasFill() {
            const style = this.style;
            const fill = style.fill;
            return fill != null && fill !== 'none';
        }
        getBoundingRect() {
            let rect = this._rect;
            const style = this.style;
            const needsUpdateRect = !rect;
            if (needsUpdateRect) {
                let firstInvoke = false;
                if (!this.path) {
                    firstInvoke = true;
                    this.createPathProxy();
                }
                let path = this.path;
                if (firstInvoke || (this.__dirty & SHAPE_CHANGED_BIT)) {
                    path.beginPath();
                    this.buildPath(path, this.shape, false);
                    this.pathUpdated();
                }
                rect = path.getBoundingRect();
            }
            this._rect = rect;
            if (this.hasStroke() && this.path && this.path.len() > 0) {
                const rectStroke = this._rectStroke || (this._rectStroke = rect.clone());
                if (this.__dirty || needsUpdateRect) {
                    rectStroke.copy(rect);
                    const lineScale = style.strokeNoScale ? this.getLineScale() : 1;
                    let w = style.lineWidth;
                    if (!this.hasFill()) {
                        const strokeContainThreshold = this.strokeContainThreshold;
                        w = Math.max(w, strokeContainThreshold == null ? 4 : strokeContainThreshold);
                    }
                    if (lineScale > 1e-10) {
                        rectStroke.width += w / lineScale;
                        rectStroke.height += w / lineScale;
                        rectStroke.x -= w / lineScale / 2;
                        rectStroke.y -= w / lineScale / 2;
                    }
                }
                return rectStroke;
            }
            return rect;
        }
        contain(x, y) {
            const localPos = this.transformCoordToLocal(x, y);
            const rect = this.getBoundingRect();
            const style = this.style;
            x = localPos[0];
            y = localPos[1];
            if (rect.contain(x, y)) {
                const pathProxy = this.path;
                if (this.hasStroke()) {
                    let lineWidth = style.lineWidth;
                    let lineScale = style.strokeNoScale ? this.getLineScale() : 1;
                    if (lineScale > 1e-10) {
                        if (!this.hasFill()) {
                            lineWidth = Math.max(lineWidth, this.strokeContainThreshold);
                        }
                        if (containStroke$4(pathProxy, lineWidth / lineScale, x, y)) {
                            return true;
                        }
                    }
                }
                if (this.hasFill()) {
                    return contain(pathProxy, x, y);
                }
            }
            return false;
        }
        dirtyShape() {
            this.__dirty |= SHAPE_CHANGED_BIT;
            if (this._rect) {
                this._rect = null;
            }
            if (this._decalEl) {
                this._decalEl.dirtyShape();
            }
            this.markRedraw();
        }
        dirty() {
            this.dirtyStyle();
            this.dirtyShape();
        }
        animateShape(loop) {
            return this.animate('shape', loop);
        }
        updateDuringAnimation(targetKey) {
            if (targetKey === 'style') {
                this.dirtyStyle();
            }
            else if (targetKey === 'shape') {
                this.dirtyShape();
            }
            else {
                this.markRedraw();
            }
        }
        attrKV(key, value) {
            if (key === 'shape') {
                this.setShape(value);
            }
            else {
                super.attrKV(key, value);
            }
        }
        setShape(keyOrObj, value) {
            let shape = this.shape;
            if (!shape) {
                shape = this.shape = {};
            }
            if (typeof keyOrObj === 'string') {
                shape[keyOrObj] = value;
            }
            else {
                extend(shape, keyOrObj);
            }
            this.dirtyShape();
            return this;
        }
        shapeChanged() {
            return !!(this.__dirty & SHAPE_CHANGED_BIT);
        }
        createStyle(obj) {
            return createObject(DEFAULT_PATH_STYLE, obj);
        }
        _innerSaveToNormal(toState) {
            super._innerSaveToNormal(toState);
            const normalState = this._normalState;
            if (toState.shape && !normalState.shape) {
                normalState.shape = extend({}, this.shape);
            }
        }
        _applyStateObj(stateName, state, normalState, keepCurrentStates, transition, animationCfg) {
            super._applyStateObj(stateName, state, normalState, keepCurrentStates, transition, animationCfg);
            const needsRestoreToNormal = !(state && keepCurrentStates);
            let targetShape;
            if (state && state.shape) {
                if (transition) {
                    if (keepCurrentStates) {
                        targetShape = state.shape;
                    }
                    else {
                        targetShape = extend({}, normalState.shape);
                        extend(targetShape, state.shape);
                    }
                }
                else {
                    targetShape = extend({}, keepCurrentStates ? this.shape : normalState.shape);
                    extend(targetShape, state.shape);
                }
            }
            else if (needsRestoreToNormal) {
                targetShape = normalState.shape;
            }
            if (targetShape) {
                if (transition) {
                    this.shape = extend({}, this.shape);
                    const targetShapePrimaryProps = {};
                    const shapeKeys = keys(targetShape);
                    for (let i = 0; i < shapeKeys.length; i++) {
                        const key = shapeKeys[i];
                        if (typeof targetShape[key] === 'object') {
                            this.shape[key] = targetShape[key];
                        }
                        else {
                            targetShapePrimaryProps[key] = targetShape[key];
                        }
                    }
                    this._transitionState(stateName, {
                        shape: targetShapePrimaryProps
                    }, animationCfg);
                }
                else {
                    this.shape = targetShape;
                    this.dirtyShape();
                }
            }
        }
        _mergeStates(states) {
            const mergedState = super._mergeStates(states);
            let mergedShape;
            for (let i = 0; i < states.length; i++) {
                const state = states[i];
                if (state.shape) {
                    mergedShape = mergedShape || {};
                    this._mergeStyle(mergedShape, state.shape);
                }
            }
            if (mergedShape) {
                mergedState.shape = mergedShape;
            }
            return mergedState;
        }
        getAnimationStyleProps() {
            return DEFAULT_PATH_ANIMATION_PROPS;
        }
        isZeroArea() {
            return false;
        }
        static extend(defaultProps) {
            class Sub extends Path {
                constructor(opts) {
                    super(opts);
                    defaultProps.init && defaultProps.init.call(this, opts);
                }
                getDefaultStyle() {
                    return clone(defaultProps.style);
                }
                getDefaultShape() {
                    return clone(defaultProps.shape);
                }
            }
            for (let key in defaultProps) {
                if (typeof defaultProps[key] === 'function') {
                    Sub.prototype[key] = defaultProps[key];
                }
            }
            return Sub;
        }
    }
    Path.initDefaultProps = (function () {
        const pathProto = Path.prototype;
        pathProto.type = 'path';
        pathProto.strokeContainThreshold = 5;
        pathProto.segmentIgnoreThreshold = 0;
        pathProto.subPixelOptimize = false;
        pathProto.autoBatch = false;
        pathProto.__dirty = REDRAW_BIT | STYLE_CHANGED_BIT | SHAPE_CHANGED_BIT;
    })();

    const CMD$2 = PathProxy.CMD;
    const points = [[], [], []];
    const mathSqrt$1 = Math.sqrt;
    const mathAtan2 = Math.atan2;
    function transformPath(path, m) {
        if (!m) {
            return;
        }
        let data = path.data;
        const len = path.len();
        let cmd;
        let nPoint;
        let i;
        let j;
        let k;
        let p;
        const M = CMD$2.M;
        const C = CMD$2.C;
        const L = CMD$2.L;
        const R = CMD$2.R;
        const A = CMD$2.A;
        const Q = CMD$2.Q;
        for (i = 0, j = 0; i < len;) {
            cmd = data[i++];
            j = i;
            nPoint = 0;
            switch (cmd) {
                case M:
                    nPoint = 1;
                    break;
                case L:
                    nPoint = 1;
                    break;
                case C:
                    nPoint = 3;
                    break;
                case Q:
                    nPoint = 2;
                    break;
                case A:
                    const x = m[4];
                    const y = m[5];
                    const sx = mathSqrt$1(m[0] * m[0] + m[1] * m[1]);
                    const sy = mathSqrt$1(m[2] * m[2] + m[3] * m[3]);
                    const angle = mathAtan2(-m[1] / sy, m[0] / sx);
                    data[i] *= sx;
                    data[i++] += x;
                    data[i] *= sy;
                    data[i++] += y;
                    data[i++] *= sx;
                    data[i++] *= sy;
                    data[i++] += angle;
                    data[i++] += angle;
                    i += 2;
                    j = i;
                    break;
                case R:
                    p[0] = data[i++];
                    p[1] = data[i++];
                    applyTransform(p, p, m);
                    data[j++] = p[0];
                    data[j++] = p[1];
                    p[0] += data[i++];
                    p[1] += data[i++];
                    applyTransform(p, p, m);
                    data[j++] = p[0];
                    data[j++] = p[1];
            }
            for (k = 0; k < nPoint; k++) {
                let p = points[k];
                p[0] = data[i++];
                p[1] = data[i++];
                applyTransform(p, p, m);
                data[j++] = p[0];
                data[j++] = p[1];
            }
        }
        path.increaseVersion();
    }

    const mathSqrt$2 = Math.sqrt;
    const mathSin$2 = Math.sin;
    const mathCos$2 = Math.cos;
    const PI$1 = Math.PI;
    function vMag(v) {
        return Math.sqrt(v[0] * v[0] + v[1] * v[1]);
    }
    function vRatio(u, v) {
        return (u[0] * v[0] + u[1] * v[1]) / (vMag(u) * vMag(v));
    }
    function vAngle(u, v) {
        return (u[0] * v[1] < u[1] * v[0] ? -1 : 1)
            * Math.acos(vRatio(u, v));
    }
    function processArc(x1, y1, x2, y2, fa, fs, rx, ry, psiDeg, cmd, path) {
        const psi = psiDeg * (PI$1 / 180.0);
        const xp = mathCos$2(psi) * (x1 - x2) / 2.0
            + mathSin$2(psi) * (y1 - y2) / 2.0;
        const yp = -1 * mathSin$2(psi) * (x1 - x2) / 2.0
            + mathCos$2(psi) * (y1 - y2) / 2.0;
        const lambda = (xp * xp) / (rx * rx) + (yp * yp) / (ry * ry);
        if (lambda > 1) {
            rx *= mathSqrt$2(lambda);
            ry *= mathSqrt$2(lambda);
        }
        const f = (fa === fs ? -1 : 1)
            * mathSqrt$2((((rx * rx) * (ry * ry))
                - ((rx * rx) * (yp * yp))
                - ((ry * ry) * (xp * xp))) / ((rx * rx) * (yp * yp)
                + (ry * ry) * (xp * xp))) || 0;
        const cxp = f * rx * yp / ry;
        const cyp = f * -ry * xp / rx;
        const cx = (x1 + x2) / 2.0
            + mathCos$2(psi) * cxp
            - mathSin$2(psi) * cyp;
        const cy = (y1 + y2) / 2.0
            + mathSin$2(psi) * cxp
            + mathCos$2(psi) * cyp;
        const theta = vAngle([1, 0], [(xp - cxp) / rx, (yp - cyp) / ry]);
        const u = [(xp - cxp) / rx, (yp - cyp) / ry];
        const v = [(-1 * xp - cxp) / rx, (-1 * yp - cyp) / ry];
        let dTheta = vAngle(u, v);
        if (vRatio(u, v) <= -1) {
            dTheta = PI$1;
        }
        if (vRatio(u, v) >= 1) {
            dTheta = 0;
        }
        if (dTheta < 0) {
            const n = Math.round(dTheta / PI$1 * 1e6) / 1e6;
            dTheta = PI$1 * 2 + (n % 2) * PI$1;
        }
        path.addData(cmd, cx, cy, rx, ry, theta, dTheta, psi, fs);
    }
    const commandReg = /([mlvhzcqtsa])([^mlvhzcqtsa]*)/ig;
    const numberReg = /-?([0-9]*\.)?[0-9]+([eE]-?[0-9]+)?/g;
    function createPathProxyFromString(data) {
        const path = new PathProxy();
        if (!data) {
            return path;
        }
        let cpx = 0;
        let cpy = 0;
        let subpathX = cpx;
        let subpathY = cpy;
        let prevCmd;
        const CMD = PathProxy.CMD;
        const cmdList = data.match(commandReg);
        if (!cmdList) {
            return path;
        }
        for (let l = 0; l < cmdList.length; l++) {
            const cmdText = cmdList[l];
            let cmdStr = cmdText.charAt(0);
            let cmd;
            const p = cmdText.match(numberReg) || [];
            const pLen = p.length;
            for (let i = 0; i < pLen; i++) {
                p[i] = parseFloat(p[i]);
            }
            let off = 0;
            while (off < pLen) {
                let ctlPtx;
                let ctlPty;
                let rx;
                let ry;
                let psi;
                let fa;
                let fs;
                let x1 = cpx;
                let y1 = cpy;
                let len;
                let pathData;
                switch (cmdStr) {
                    case 'l':
                        cpx += p[off++];
                        cpy += p[off++];
                        cmd = CMD.L;
                        path.addData(cmd, cpx, cpy);
                        break;
                    case 'L':
                        cpx = p[off++];
                        cpy = p[off++];
                        cmd = CMD.L;
                        path.addData(cmd, cpx, cpy);
                        break;
                    case 'm':
                        cpx += p[off++];
                        cpy += p[off++];
                        cmd = CMD.M;
                        path.addData(cmd, cpx, cpy);
                        subpathX = cpx;
                        subpathY = cpy;
                        cmdStr = 'l';
                        break;
                    case 'M':
                        cpx = p[off++];
                        cpy = p[off++];
                        cmd = CMD.M;
                        path.addData(cmd, cpx, cpy);
                        subpathX = cpx;
                        subpathY = cpy;
                        cmdStr = 'L';
                        break;
                    case 'h':
                        cpx += p[off++];
                        cmd = CMD.L;
                        path.addData(cmd, cpx, cpy);
                        break;
                    case 'H':
                        cpx = p[off++];
                        cmd = CMD.L;
                        path.addData(cmd, cpx, cpy);
                        break;
                    case 'v':
                        cpy += p[off++];
                        cmd = CMD.L;
                        path.addData(cmd, cpx, cpy);
                        break;
                    case 'V':
                        cpy = p[off++];
                        cmd = CMD.L;
                        path.addData(cmd, cpx, cpy);
                        break;
                    case 'C':
                        cmd = CMD.C;
                        path.addData(cmd, p[off++], p[off++], p[off++], p[off++], p[off++], p[off++]);
                        cpx = p[off - 2];
                        cpy = p[off - 1];
                        break;
                    case 'c':
                        cmd = CMD.C;
                        path.addData(cmd, p[off++] + cpx, p[off++] + cpy, p[off++] + cpx, p[off++] + cpy, p[off++] + cpx, p[off++] + cpy);
                        cpx += p[off - 2];
                        cpy += p[off - 1];
                        break;
                    case 'S':
                        ctlPtx = cpx;
                        ctlPty = cpy;
                        len = path.len();
                        pathData = path.data;
                        if (prevCmd === CMD.C) {
                            ctlPtx += cpx - pathData[len - 4];
                            ctlPty += cpy - pathData[len - 3];
                        }
                        cmd = CMD.C;
                        x1 = p[off++];
                        y1 = p[off++];
                        cpx = p[off++];
                        cpy = p[off++];
                        path.addData(cmd, ctlPtx, ctlPty, x1, y1, cpx, cpy);
                        break;
                    case 's':
                        ctlPtx = cpx;
                        ctlPty = cpy;
                        len = path.len();
                        pathData = path.data;
                        if (prevCmd === CMD.C) {
                            ctlPtx += cpx - pathData[len - 4];
                            ctlPty += cpy - pathData[len - 3];
                        }
                        cmd = CMD.C;
                        x1 = cpx + p[off++];
                        y1 = cpy + p[off++];
                        cpx += p[off++];
                        cpy += p[off++];
                        path.addData(cmd, ctlPtx, ctlPty, x1, y1, cpx, cpy);
                        break;
                    case 'Q':
                        x1 = p[off++];
                        y1 = p[off++];
                        cpx = p[off++];
                        cpy = p[off++];
                        cmd = CMD.Q;
                        path.addData(cmd, x1, y1, cpx, cpy);
                        break;
                    case 'q':
                        x1 = p[off++] + cpx;
                        y1 = p[off++] + cpy;
                        cpx += p[off++];
                        cpy += p[off++];
                        cmd = CMD.Q;
                        path.addData(cmd, x1, y1, cpx, cpy);
                        break;
                    case 'T':
                        ctlPtx = cpx;
                        ctlPty = cpy;
                        len = path.len();
                        pathData = path.data;
                        if (prevCmd === CMD.Q) {
                            ctlPtx += cpx - pathData[len - 4];
                            ctlPty += cpy - pathData[len - 3];
                        }
                        cpx = p[off++];
                        cpy = p[off++];
                        cmd = CMD.Q;
                        path.addData(cmd, ctlPtx, ctlPty, cpx, cpy);
                        break;
                    case 't':
                        ctlPtx = cpx;
                        ctlPty = cpy;
                        len = path.len();
                        pathData = path.data;
                        if (prevCmd === CMD.Q) {
                            ctlPtx += cpx - pathData[len - 4];
                            ctlPty += cpy - pathData[len - 3];
                        }
                        cpx += p[off++];
                        cpy += p[off++];
                        cmd = CMD.Q;
                        path.addData(cmd, ctlPtx, ctlPty, cpx, cpy);
                        break;
                    case 'A':
                        rx = p[off++];
                        ry = p[off++];
                        psi = p[off++];
                        fa = p[off++];
                        fs = p[off++];
                        x1 = cpx, y1 = cpy;
                        cpx = p[off++];
                        cpy = p[off++];
                        cmd = CMD.A;
                        processArc(x1, y1, cpx, cpy, fa, fs, rx, ry, psi, cmd, path);
                        break;
                    case 'a':
                        rx = p[off++];
                        ry = p[off++];
                        psi = p[off++];
                        fa = p[off++];
                        fs = p[off++];
                        x1 = cpx, y1 = cpy;
                        cpx += p[off++];
                        cpy += p[off++];
                        cmd = CMD.A;
                        processArc(x1, y1, cpx, cpy, fa, fs, rx, ry, psi, cmd, path);
                        break;
                }
            }
            if (cmdStr === 'z' || cmdStr === 'Z') {
                cmd = CMD.Z;
                path.addData(cmd);
                cpx = subpathX;
                cpy = subpathY;
            }
            prevCmd = cmd;
        }
        path.toStatic();
        return path;
    }
    class SVGPath extends Path {
        applyTransform(m) { }
    }
    function isPathProxy(path) {
        return path.setData != null;
    }
    function createPathOptions(str, opts) {
        const pathProxy = createPathProxyFromString(str);
        const innerOpts = extend({}, opts);
        innerOpts.buildPath = function (path) {
            if (isPathProxy(path)) {
                path.setData(pathProxy.data);
                const ctx = path.getContext();
                if (ctx) {
                    path.rebuildPath(ctx, 1);
                }
            }
            else {
                const ctx = path;
                pathProxy.rebuildPath(ctx, 1);
            }
        };
        innerOpts.applyTransform = function (m) {
            transformPath(pathProxy, m);
            this.dirtyShape();
        };
        return innerOpts;
    }
    function createFromString(str, opts) {
        return new SVGPath(createPathOptions(str, opts));
    }
    function extendFromString(str, defaultOpts) {
        const innerOpts = createPathOptions(str, defaultOpts);
        class Sub extends SVGPath {
            constructor(opts) {
                super(opts);
                this.applyTransform = innerOpts.applyTransform;
                this.buildPath = innerOpts.buildPath;
            }
        }
        return Sub;
    }
    function mergePath(pathEls, opts) {
        const pathList = [];
        const len = pathEls.length;
        for (let i = 0; i < len; i++) {
            const pathEl = pathEls[i];
            pathList.push(pathEl.getUpdatedPathProxy(true));
        }
        const pathBundle = new Path(opts);
        pathBundle.createPathProxy();
        pathBundle.buildPath = function (path) {
            if (isPathProxy(path)) {
                path.appendPath(pathList);
                const ctx = path.getContext();
                if (ctx) {
                    path.rebuildPath(ctx, 1);
                }
            }
        };
        return pathBundle;
    }
    function clonePath(sourcePath, opts) {
        opts = opts || {};
        const path = new Path();
        if (sourcePath.shape) {
            path.setShape(sourcePath.shape);
        }
        path.setStyle(sourcePath.style);
        if (opts.bakeTransform) {
            transformPath(path.path, sourcePath.getComputedTransform());
        }
        else {
            if (opts.toLocal) {
                path.setLocalTransform(sourcePath.getComputedTransform());
            }
            else {
                path.copyTransform(sourcePath);
            }
        }
        path.buildPath = sourcePath.buildPath;
        path.applyTransform = path.applyTransform;
        path.z = sourcePath.z;
        path.z2 = sourcePath.z2;
        path.zlevel = sourcePath.zlevel;
        return path;
    }

    var path = /*#__PURE__*/Object.freeze({
        __proto__: null,
        createFromString: createFromString,
        extendFromString: extendFromString,
        mergePath: mergePath,
        clonePath: clonePath
    });

    const DEFAULT_IMAGE_STYLE = defaults({
        x: 0,
        y: 0
    }, DEFAULT_COMMON_STYLE);
    const DEFAULT_IMAGE_ANIMATION_PROPS = {
        style: defaults({
            x: true,
            y: true,
            width: true,
            height: true,
            sx: true,
            sy: true,
            sWidth: true,
            sHeight: true
        }, DEFAULT_COMMON_ANIMATION_PROPS.style)
    };
    function isImageLike(source) {
        return !!(source
            && typeof source !== 'string'
            && source.width && source.height);
    }
    class ZRImage extends Displayable {
        createStyle(obj) {
            return createObject(DEFAULT_IMAGE_STYLE, obj);
        }
        _getSize(dim) {
            const style = this.style;
            let size = style[dim];
            if (size != null) {
                return size;
            }
            const imageSource = isImageLike(style.image)
                ? style.image : this.__image;
            if (!imageSource) {
                return 0;
            }
            const otherDim = dim === 'width' ? 'height' : 'width';
            let otherDimSize = style[otherDim];
            if (otherDimSize == null) {
                return imageSource[dim];
            }
            else {
                return imageSource[dim] / imageSource[otherDim] * otherDimSize;
            }
        }
        getWidth() {
            return this._getSize('width');
        }
        getHeight() {
            return this._getSize('height');
        }
        getAnimationStyleProps() {
            return DEFAULT_IMAGE_ANIMATION_PROPS;
        }
        getBoundingRect() {
            const style = this.style;
            if (!this._rect) {
                this._rect = new BoundingRect(style.x || 0, style.y || 0, this.getWidth(), this.getHeight());
            }
            return this._rect;
        }
    }
    ZRImage.prototype.type = 'image';

    class CircleShape {
        constructor() {
            this.cx = 0;
            this.cy = 0;
            this.r = 0;
        }
    }
    class Circle extends Path {
        constructor(opts) {
            super(opts);
        }
        getDefaultShape() {
            return new CircleShape();
        }
        buildPath(ctx, shape) {
            ctx.moveTo(shape.cx + shape.r, shape.cy);
            ctx.arc(shape.cx, shape.cy, shape.r, 0, Math.PI * 2);
        }
    }
    Circle.prototype.type = 'circle';

    function buildPath(ctx, shape) {
        let x = shape.x;
        let y = shape.y;
        let width = shape.width;
        let height = shape.height;
        let r = shape.r;
        let r1;
        let r2;
        let r3;
        let r4;
        if (width < 0) {
            x = x + width;
            width = -width;
        }
        if (height < 0) {
            y = y + height;
            height = -height;
        }
        if (typeof r === 'number') {
            r1 = r2 = r3 = r4 = r;
        }
        else if (r instanceof Array) {
            if (r.length === 1) {
                r1 = r2 = r3 = r4 = r[0];
            }
            else if (r.length === 2) {
                r1 = r3 = r[0];
                r2 = r4 = r[1];
            }
            else if (r.length === 3) {
                r1 = r[0];
                r2 = r4 = r[1];
                r3 = r[2];
            }
            else {
                r1 = r[0];
                r2 = r[1];
                r3 = r[2];
                r4 = r[3];
            }
        }
        else {
            r1 = r2 = r3 = r4 = 0;
        }
        let total;
        if (r1 + r2 > width) {
            total = r1 + r2;
            r1 *= width / total;
            r2 *= width / total;
        }
        if (r3 + r4 > width) {
            total = r3 + r4;
            r3 *= width / total;
            r4 *= width / total;
        }
        if (r2 + r3 > height) {
            total = r2 + r3;
            r2 *= height / total;
            r3 *= height / total;
        }
        if (r1 + r4 > height) {
            total = r1 + r4;
            r1 *= height / total;
            r4 *= height / total;
        }
        ctx.moveTo(x + r1, y);
        ctx.lineTo(x + width - r2, y);
        r2 !== 0 && ctx.arc(x + width - r2, y + r2, r2, -Math.PI / 2, 0);
        ctx.lineTo(x + width, y + height - r3);
        r3 !== 0 && ctx.arc(x + width - r3, y + height - r3, r3, 0, Math.PI / 2);
        ctx.lineTo(x + r4, y + height);
        r4 !== 0 && ctx.arc(x + r4, y + height - r4, r4, Math.PI / 2, Math.PI);
        ctx.lineTo(x, y + r1);
        r1 !== 0 && ctx.arc(x + r1, y + r1, r1, Math.PI, Math.PI * 1.5);
    }

    const round = Math.round;
    function subPixelOptimizeLine(outputShape, inputShape, style) {
        if (!inputShape) {
            return;
        }
        const x1 = inputShape.x1;
        const x2 = inputShape.x2;
        const y1 = inputShape.y1;
        const y2 = inputShape.y2;
        outputShape.x1 = x1;
        outputShape.x2 = x2;
        outputShape.y1 = y1;
        outputShape.y2 = y2;
        const lineWidth = style && style.lineWidth;
        if (!lineWidth) {
            return outputShape;
        }
        if (round(x1 * 2) === round(x2 * 2)) {
            outputShape.x1 = outputShape.x2 = subPixelOptimize(x1, lineWidth, true);
        }
        if (round(y1 * 2) === round(y2 * 2)) {
            outputShape.y1 = outputShape.y2 = subPixelOptimize(y1, lineWidth, true);
        }
        return outputShape;
    }
    function subPixelOptimizeRect(outputShape, inputShape, style) {
        if (!inputShape) {
            return;
        }
        const originX = inputShape.x;
        const originY = inputShape.y;
        const originWidth = inputShape.width;
        const originHeight = inputShape.height;
        outputShape.x = originX;
        outputShape.y = originY;
        outputShape.width = originWidth;
        outputShape.height = originHeight;
        const lineWidth = style && style.lineWidth;
        if (!lineWidth) {
            return outputShape;
        }
        outputShape.x = subPixelOptimize(originX, lineWidth, true);
        outputShape.y = subPixelOptimize(originY, lineWidth, true);
        outputShape.width = Math.max(subPixelOptimize(originX + originWidth, lineWidth, false) - outputShape.x, originWidth === 0 ? 0 : 1);
        outputShape.height = Math.max(subPixelOptimize(originY + originHeight, lineWidth, false) - outputShape.y, originHeight === 0 ? 0 : 1);
        return outputShape;
    }
    function subPixelOptimize(position, lineWidth, positiveOrNegative) {
        if (!lineWidth) {
            return position;
        }
        const doubledPosition = round(position * 2);
        return (doubledPosition + round(lineWidth)) % 2 === 0
            ? doubledPosition / 2
            : (doubledPosition + (positiveOrNegative ? 1 : -1)) / 2;
    }

    class RectShape {
        constructor() {
            this.x = 0;
            this.y = 0;
            this.width = 0;
            this.height = 0;
        }
    }
    const subPixelOptimizeOutputShape = {};
    class Rect extends Path {
        constructor(opts) {
            super(opts);
        }
        getDefaultShape() {
            return new RectShape();
        }
        buildPath(ctx, shape) {
            let x;
            let y;
            let width;
            let height;
            if (this.subPixelOptimize) {
                const optimizedShape = subPixelOptimizeRect(subPixelOptimizeOutputShape, shape, this.style);
                x = optimizedShape.x;
                y = optimizedShape.y;
                width = optimizedShape.width;
                height = optimizedShape.height;
                optimizedShape.r = shape.r;
                shape = optimizedShape;
            }
            else {
                x = shape.x;
                y = shape.y;
                width = shape.width;
                height = shape.height;
            }
            if (!shape.r) {
                ctx.rect(x, y, width, height);
            }
            else {
                buildPath(ctx, shape);
            }
        }
        isZeroArea() {
            return !this.shape.width || !this.shape.height;
        }
    }
    Rect.prototype.type = 'rect';

    class EllipseShape {
        constructor() {
            this.cx = 0;
            this.cy = 0;
            this.rx = 0;
            this.ry = 0;
        }
    }
    class Ellipse extends Path {
        constructor(opts) {
            super(opts);
        }
        getDefaultShape() {
            return new EllipseShape();
        }
        buildPath(ctx, shape) {
            const k = 0.5522848;
            const x = shape.cx;
            const y = shape.cy;
            const a = shape.rx;
            const b = shape.ry;
            const ox = a * k;
            const oy = b * k;
            ctx.moveTo(x - a, y);
            ctx.bezierCurveTo(x - a, y - oy, x - ox, y - b, x, y - b);
            ctx.bezierCurveTo(x + ox, y - b, x + a, y - oy, x + a, y);
            ctx.bezierCurveTo(x + a, y + oy, x + ox, y + b, x, y + b);
            ctx.bezierCurveTo(x - ox, y + b, x - a, y + oy, x - a, y);
            ctx.closePath();
        }
    }
    Ellipse.prototype.type = 'ellipse';

    const subPixelOptimizeOutputShape$1 = {};
    class LineShape {
        constructor() {
            this.x1 = 0;
            this.y1 = 0;
            this.x2 = 0;
            this.y2 = 0;
            this.percent = 1;
        }
    }
    class Line extends Path {
        constructor(opts) {
            super(opts);
        }
        getDefaultStyle() {
            return {
                stroke: "#000",
                fill: null,
            };
        }
        getDefaultShape() {
            return new LineShape();
        }
        buildPath(ctx, shape) {
            let x1;
            let y1;
            let x2;
            let y2;
            if (this.subPixelOptimize) {
                const optimizedShape = subPixelOptimizeLine(subPixelOptimizeOutputShape$1, shape, this.style);
                x1 = optimizedShape.x1;
                y1 = optimizedShape.y1;
                x2 = optimizedShape.x2;
                y2 = optimizedShape.y2;
            }
            else {
                x1 = shape.x1;
                y1 = shape.y1;
                x2 = shape.x2;
                y2 = shape.y2;
            }
            const percent = shape.percent;
            this.drawHandDrawnLine(ctx, x1, y1, x2, y2, 1);
        }
        getRandomOffset(radius) {
            return Math.random() * radius * 2 - radius;
        }
        drawHandDrawnLine(context, x1, y1, x2, y2, roughness = 1) {
            const steps = Math.floor(Math.hypot(x2 - x1, y2 - y1) / 10);
            context.beginPath();
            context.moveTo(x1 + this.getRandomOffset(roughness), y1 + this.getRandomOffset(roughness));
            for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const x = x1 + t * (x2 - x1);
                const y = y1 + t * (y2 - y1);
                context.lineTo(x + this.getRandomOffset(roughness), y + this.getRandomOffset(roughness));
            }
            context.lineTo(x2 + this.getRandomOffset(roughness), y2 + this.getRandomOffset(roughness));
            context.stroke();
        }
        pointAt(p) {
            const shape = this.shape;
            return [
                shape.x1 * (1 - p) + shape.x2 * p,
                shape.y1 * (1 - p) + shape.y2 * p,
            ];
        }
    }
    Line.prototype.type = "line";

    function smoothBezier(points, smooth, isLoop, constraint) {
        const cps = [];
        const v = [];
        const v1 = [];
        const v2 = [];
        let prevPoint;
        let nextPoint;
        let min$1;
        let max$1;
        if (constraint) {
            min$1 = [Infinity, Infinity];
            max$1 = [-Infinity, -Infinity];
            for (let i = 0, len = points.length; i < len; i++) {
                min(min$1, min$1, points[i]);
                max(max$1, max$1, points[i]);
            }
            min(min$1, min$1, constraint[0]);
            max(max$1, max$1, constraint[1]);
        }
        for (let i = 0, len = points.length; i < len; i++) {
            const point = points[i];
            if (isLoop) {
                prevPoint = points[i ? i - 1 : len - 1];
                nextPoint = points[(i + 1) % len];
            }
            else {
                if (i === 0 || i === len - 1) {
                    cps.push(clone$1(points[i]));
                    continue;
                }
                else {
                    prevPoint = points[i - 1];
                    nextPoint = points[i + 1];
                }
            }
            sub(v, nextPoint, prevPoint);
            scale(v, v, smooth);
            let d0 = distance(point, prevPoint);
            let d1 = distance(point, nextPoint);
            const sum = d0 + d1;
            if (sum !== 0) {
                d0 /= sum;
                d1 /= sum;
            }
            scale(v1, v, -d0);
            scale(v2, v, d1);
            const cp0 = add([], point, v1);
            const cp1 = add([], point, v2);
            if (constraint) {
                max(cp0, cp0, min$1);
                min(cp0, cp0, max$1);
                max(cp1, cp1, min$1);
                min(cp1, cp1, max$1);
            }
            cps.push(cp0);
            cps.push(cp1);
        }
        if (isLoop) {
            cps.push(cps.shift());
        }
        return cps;
    }

    function buildPath$1(ctx, shape, closePath) {
        const smooth = shape.smooth;
        let points = shape.points;
        if (points && points.length >= 2) {
            if (smooth) {
                const controlPoints = smoothBezier(points, smooth, closePath, shape.smoothConstraint);
                ctx.moveTo(points[0][0], points[0][1]);
                const len = points.length;
                for (let i = 0; i < (closePath ? len : len - 1); i++) {
                    const cp1 = controlPoints[i * 2];
                    const cp2 = controlPoints[i * 2 + 1];
                    const p = points[(i + 1) % len];
                    ctx.bezierCurveTo(cp1[0], cp1[1], cp2[0], cp2[1], p[0], p[1]);
                }
            }
            else {
                ctx.moveTo(points[0][0], points[0][1]);
                for (let i = 1, l = points.length; i < l; i++) {
                    ctx.lineTo(points[i][0], points[i][1]);
                }
            }
            closePath && ctx.closePath();
        }
    }

    class PolygonShape {
        constructor() {
            this.points = null;
            this.smooth = 0;
            this.smoothConstraint = null;
        }
    }
    class Polygon extends Path {
        constructor(opts) {
            super(opts);
        }
        getDefaultShape() {
            return new PolygonShape();
        }
        buildPath(ctx, shape) {
            buildPath$1(ctx, shape, true);
        }
    }
    Polygon.prototype.type = 'polygon';

    class PolylineShape {
        constructor() {
            this.points = null;
            this.percent = 1;
            this.smooth = 0;
            this.smoothConstraint = null;
        }
    }
    class Polyline extends Path {
        constructor(opts) {
            super(opts);
        }
        getDefaultStyle() {
            return {
                stroke: '#000',
                fill: null
            };
        }
        getDefaultShape() {
            return new PolylineShape();
        }
        buildPath(ctx, shape) {
            buildPath$1(ctx, shape, false);
        }
    }
    Polyline.prototype.type = 'polyline';

    class Gradient {
        constructor(colorStops) {
            this.colorStops = colorStops || [];
        }
        addColorStop(offset, color) {
            this.colorStops.push({
                offset,
                color
            });
        }
    }

    class LinearGradient extends Gradient {
        constructor(x, y, x2, y2, colorStops, globalCoord) {
            super(colorStops);
            this.x = x == null ? 0 : x;
            this.y = y == null ? 0 : y;
            this.x2 = x2 == null ? 1 : x2;
            this.y2 = y2 == null ? 0 : y2;
            this.type = 'linear';
            this.global = globalCoord || false;
        }
    }

    class RadialGradient extends Gradient {
        constructor(x, y, r, colorStops, globalCoord) {
            super(colorStops);
            this.x = x == null ? 0.5 : x;
            this.y = y == null ? 0.5 : y;
            this.r = r == null ? 0.5 : r;
            this.type = 'radial';
            this.global = globalCoord || false;
        }
    }

    const DEFAULT_TSPAN_STYLE = defaults({
        strokeFirst: true,
        font: DEFAULT_FONT,
        x: 0,
        y: 0,
        textAlign: 'left',
        textBaseline: 'top',
        miterLimit: 2
    }, DEFAULT_PATH_STYLE);
    class TSpan extends Displayable {
        hasStroke() {
            const style = this.style;
            const stroke = style.stroke;
            return stroke != null && stroke !== 'none' && style.lineWidth > 0;
        }
        hasFill() {
            const style = this.style;
            const fill = style.fill;
            return fill != null && fill !== 'none';
        }
        createStyle(obj) {
            return createObject(DEFAULT_TSPAN_STYLE, obj);
        }
        setBoundingRect(rect) {
            this._rect = rect;
        }
        getBoundingRect() {
            const style = this.style;
            if (!this._rect) {
                let text = style.text;
                text != null ? (text += '') : (text = '');
                const rect = getBoundingRect(text, style.font, style.textAlign, style.textBaseline);
                rect.x += style.x || 0;
                rect.y += style.y || 0;
                if (this.hasStroke()) {
                    const w = style.lineWidth;
                    rect.x -= w / 2;
                    rect.y -= w / 2;
                    rect.width += w;
                    rect.height += w;
                }
                this._rect = rect;
            }
            return this._rect;
        }
    }
    TSpan.initDefaultProps = (function () {
        const tspanProto = TSpan.prototype;
        tspanProto.dirtyRectTolerance = 10;
    })();
    TSpan.prototype.type = 'tspan';

    function parseXML(svg) {
        if (isString(svg)) {
            const parser = new DOMParser();
            svg = parser.parseFromString(svg, 'text/xml');
        }
        let svgNode = svg;
        if (svgNode.nodeType === 9) {
            svgNode = svgNode.firstChild;
        }
        while (svgNode.nodeName.toLowerCase() !== 'svg' || svgNode.nodeType !== 1) {
            svgNode = svgNode.nextSibling;
        }
        return svgNode;
    }

    let nodeParsers;
    const INHERITABLE_STYLE_ATTRIBUTES_MAP = {
        'fill': 'fill',
        'stroke': 'stroke',
        'stroke-width': 'lineWidth',
        'opacity': 'opacity',
        'fill-opacity': 'fillOpacity',
        'stroke-opacity': 'strokeOpacity',
        'stroke-dasharray': 'lineDash',
        'stroke-dashoffset': 'lineDashOffset',
        'stroke-linecap': 'lineCap',
        'stroke-linejoin': 'lineJoin',
        'stroke-miterlimit': 'miterLimit',
        'font-family': 'fontFamily',
        'font-size': 'fontSize',
        'font-style': 'fontStyle',
        'font-weight': 'fontWeight',
        'text-anchor': 'textAlign',
        'visibility': 'visibility',
        'display': 'display'
    };
    const INHERITABLE_STYLE_ATTRIBUTES_MAP_KEYS = keys(INHERITABLE_STYLE_ATTRIBUTES_MAP);
    const SELF_STYLE_ATTRIBUTES_MAP = {
        'alignment-baseline': 'textBaseline',
        'stop-color': 'stopColor'
    };
    const SELF_STYLE_ATTRIBUTES_MAP_KEYS = keys(SELF_STYLE_ATTRIBUTES_MAP);
    class SVGParser {
        constructor() {
            this._defs = {};
            this._root = null;
        }
        parse(xml, opt) {
            opt = opt || {};
            const svg = parseXML(xml);
            {
                if (!svg) {
                    throw new Error('Illegal svg');
                }
            }
            this._defsUsePending = [];
            let root = new Group();
            this._root = root;
            const named = [];
            const viewBox = svg.getAttribute('viewBox') || '';
            let width = parseFloat((svg.getAttribute('width') || opt.width));
            let height = parseFloat((svg.getAttribute('height') || opt.height));
            isNaN(width) && (width = null);
            isNaN(height) && (height = null);
            parseAttributes(svg, root, null, true, false);
            let child = svg.firstChild;
            while (child) {
                this._parseNode(child, root, named, null, false, false);
                child = child.nextSibling;
            }
            applyDefs(this._defs, this._defsUsePending);
            this._defsUsePending = [];
            let viewBoxRect;
            let viewBoxTransform;
            if (viewBox) {
                const viewBoxArr = splitNumberSequence(viewBox);
                if (viewBoxArr.length >= 4) {
                    viewBoxRect = {
                        x: parseFloat((viewBoxArr[0] || 0)),
                        y: parseFloat((viewBoxArr[1] || 0)),
                        width: parseFloat(viewBoxArr[2]),
                        height: parseFloat(viewBoxArr[3])
                    };
                }
            }
            if (viewBoxRect && width != null && height != null) {
                viewBoxTransform = makeViewBoxTransform(viewBoxRect, { x: 0, y: 0, width: width, height: height });
                if (!opt.ignoreViewBox) {
                    const elRoot = root;
                    root = new Group();
                    root.add(elRoot);
                    elRoot.scaleX = elRoot.scaleY = viewBoxTransform.scale;
                    elRoot.x = viewBoxTransform.x;
                    elRoot.y = viewBoxTransform.y;
                }
            }
            if (!opt.ignoreRootClip && width != null && height != null) {
                root.setClipPath(new Rect({
                    shape: { x: 0, y: 0, width: width, height: height }
                }));
            }
            return {
                root: root,
                width: width,
                height: height,
                viewBoxRect: viewBoxRect,
                viewBoxTransform: viewBoxTransform,
                named: named
            };
        }
        _parseNode(xmlNode, parentGroup, named, namedFrom, isInDefs, isInText) {
            const nodeName = xmlNode.nodeName.toLowerCase();
            let el;
            let namedFromForSub = namedFrom;
            if (nodeName === 'defs') {
                isInDefs = true;
            }
            if (nodeName === 'text') {
                isInText = true;
            }
            if (nodeName === 'defs' || nodeName === 'switch') {
                el = parentGroup;
            }
            else {
                if (!isInDefs) {
                    const parser = nodeParsers[nodeName];
                    if (parser && hasOwn(nodeParsers, nodeName)) {
                        el = parser.call(this, xmlNode, parentGroup);
                        const nameAttr = xmlNode.getAttribute('name');
                        if (nameAttr) {
                            const newNamed = {
                                name: nameAttr,
                                namedFrom: null,
                                svgNodeTagLower: nodeName,
                                el: el
                            };
                            named.push(newNamed);
                            if (nodeName === 'g') {
                                namedFromForSub = newNamed;
                            }
                        }
                        else if (namedFrom) {
                            named.push({
                                name: namedFrom.name,
                                namedFrom: namedFrom,
                                svgNodeTagLower: nodeName,
                                el: el
                            });
                        }
                        parentGroup.add(el);
                    }
                }
                const parser = paintServerParsers[nodeName];
                if (parser && hasOwn(paintServerParsers, nodeName)) {
                    const def = parser.call(this, xmlNode);
                    const id = xmlNode.getAttribute('id');
                    if (id) {
                        this._defs[id] = def;
                    }
                }
            }
            if (el && el.isGroup) {
                let child = xmlNode.firstChild;
                while (child) {
                    if (child.nodeType === 1) {
                        this._parseNode(child, el, named, namedFromForSub, isInDefs, isInText);
                    }
                    else if (child.nodeType === 3 && isInText) {
                        this._parseText(child, el);
                    }
                    child = child.nextSibling;
                }
            }
        }
        _parseText(xmlNode, parentGroup) {
            const text = new TSpan({
                style: {
                    text: xmlNode.textContent
                },
                silent: true,
                x: this._textX || 0,
                y: this._textY || 0
            });
            inheritStyle(parentGroup, text);
            parseAttributes(xmlNode, text, this._defsUsePending, false, false);
            applyTextAlignment(text, parentGroup);
            const textStyle = text.style;
            const fontSize = textStyle.fontSize;
            if (fontSize && fontSize < 9) {
                textStyle.fontSize = 9;
                text.scaleX *= fontSize / 9;
                text.scaleY *= fontSize / 9;
            }
            const font = (textStyle.fontSize || textStyle.fontFamily) && [
                textStyle.fontStyle,
                textStyle.fontWeight,
                (textStyle.fontSize || 12) + 'px',
                textStyle.fontFamily || 'sans-serif'
            ].join(' ');
            textStyle.font = font;
            const rect = text.getBoundingRect();
            this._textX += rect.width;
            parentGroup.add(text);
            return text;
        }
    }
    SVGParser.internalField = (function () {
        nodeParsers = {
            'g': function (xmlNode, parentGroup) {
                const g = new Group();
                inheritStyle(parentGroup, g);
                parseAttributes(xmlNode, g, this._defsUsePending, false, false);
                return g;
            },
            'rect': function (xmlNode, parentGroup) {
                const rect = new Rect();
                inheritStyle(parentGroup, rect);
                parseAttributes(xmlNode, rect, this._defsUsePending, false, false);
                rect.setShape({
                    x: parseFloat(xmlNode.getAttribute('x') || '0'),
                    y: parseFloat(xmlNode.getAttribute('y') || '0'),
                    width: parseFloat(xmlNode.getAttribute('width') || '0'),
                    height: parseFloat(xmlNode.getAttribute('height') || '0')
                });
                rect.silent = true;
                return rect;
            },
            'circle': function (xmlNode, parentGroup) {
                const circle = new Circle();
                inheritStyle(parentGroup, circle);
                parseAttributes(xmlNode, circle, this._defsUsePending, false, false);
                circle.setShape({
                    cx: parseFloat(xmlNode.getAttribute('cx') || '0'),
                    cy: parseFloat(xmlNode.getAttribute('cy') || '0'),
                    r: parseFloat(xmlNode.getAttribute('r') || '0')
                });
                circle.silent = true;
                return circle;
            },
            'line': function (xmlNode, parentGroup) {
                const line = new Line();
                inheritStyle(parentGroup, line);
                parseAttributes(xmlNode, line, this._defsUsePending, false, false);
                line.setShape({
                    x1: parseFloat(xmlNode.getAttribute('x1') || '0'),
                    y1: parseFloat(xmlNode.getAttribute('y1') || '0'),
                    x2: parseFloat(xmlNode.getAttribute('x2') || '0'),
                    y2: parseFloat(xmlNode.getAttribute('y2') || '0')
                });
                line.silent = true;
                return line;
            },
            'ellipse': function (xmlNode, parentGroup) {
                const ellipse = new Ellipse();
                inheritStyle(parentGroup, ellipse);
                parseAttributes(xmlNode, ellipse, this._defsUsePending, false, false);
                ellipse.setShape({
                    cx: parseFloat(xmlNode.getAttribute('cx') || '0'),
                    cy: parseFloat(xmlNode.getAttribute('cy') || '0'),
                    rx: parseFloat(xmlNode.getAttribute('rx') || '0'),
                    ry: parseFloat(xmlNode.getAttribute('ry') || '0')
                });
                ellipse.silent = true;
                return ellipse;
            },
            'polygon': function (xmlNode, parentGroup) {
                const pointsStr = xmlNode.getAttribute('points');
                let pointsArr;
                if (pointsStr) {
                    pointsArr = parsePoints(pointsStr);
                }
                const polygon = new Polygon({
                    shape: {
                        points: pointsArr || []
                    },
                    silent: true
                });
                inheritStyle(parentGroup, polygon);
                parseAttributes(xmlNode, polygon, this._defsUsePending, false, false);
                return polygon;
            },
            'polyline': function (xmlNode, parentGroup) {
                const pointsStr = xmlNode.getAttribute('points');
                let pointsArr;
                if (pointsStr) {
                    pointsArr = parsePoints(pointsStr);
                }
                const polyline = new Polyline({
                    shape: {
                        points: pointsArr || []
                    },
                    silent: true
                });
                inheritStyle(parentGroup, polyline);
                parseAttributes(xmlNode, polyline, this._defsUsePending, false, false);
                return polyline;
            },
            'image': function (xmlNode, parentGroup) {
                const img = new ZRImage();
                inheritStyle(parentGroup, img);
                parseAttributes(xmlNode, img, this._defsUsePending, false, false);
                img.setStyle({
                    image: xmlNode.getAttribute('xlink:href') || xmlNode.getAttribute('href'),
                    x: +xmlNode.getAttribute('x'),
                    y: +xmlNode.getAttribute('y'),
                    width: +xmlNode.getAttribute('width'),
                    height: +xmlNode.getAttribute('height')
                });
                img.silent = true;
                return img;
            },
            'text': function (xmlNode, parentGroup) {
                const x = xmlNode.getAttribute('x') || '0';
                const y = xmlNode.getAttribute('y') || '0';
                const dx = xmlNode.getAttribute('dx') || '0';
                const dy = xmlNode.getAttribute('dy') || '0';
                this._textX = parseFloat(x) + parseFloat(dx);
                this._textY = parseFloat(y) + parseFloat(dy);
                const g = new Group();
                inheritStyle(parentGroup, g);
                parseAttributes(xmlNode, g, this._defsUsePending, false, true);
                return g;
            },
            'tspan': function (xmlNode, parentGroup) {
                const x = xmlNode.getAttribute('x');
                const y = xmlNode.getAttribute('y');
                if (x != null) {
                    this._textX = parseFloat(x);
                }
                if (y != null) {
                    this._textY = parseFloat(y);
                }
                const dx = xmlNode.getAttribute('dx') || '0';
                const dy = xmlNode.getAttribute('dy') || '0';
                const g = new Group();
                inheritStyle(parentGroup, g);
                parseAttributes(xmlNode, g, this._defsUsePending, false, true);
                this._textX += parseFloat(dx);
                this._textY += parseFloat(dy);
                return g;
            },
            'path': function (xmlNode, parentGroup) {
                const d = xmlNode.getAttribute('d') || '';
                const path = createFromString(d);
                inheritStyle(parentGroup, path);
                parseAttributes(xmlNode, path, this._defsUsePending, false, false);
                path.silent = true;
                return path;
            }
        };
    })();
    const paintServerParsers = {
        'lineargradient': function (xmlNode) {
            const x1 = parseInt(xmlNode.getAttribute('x1') || '0', 10);
            const y1 = parseInt(xmlNode.getAttribute('y1') || '0', 10);
            const x2 = parseInt(xmlNode.getAttribute('x2') || '10', 10);
            const y2 = parseInt(xmlNode.getAttribute('y2') || '0', 10);
            const gradient = new LinearGradient(x1, y1, x2, y2);
            parsePaintServerUnit(xmlNode, gradient);
            parseGradientColorStops(xmlNode, gradient);
            return gradient;
        },
        'radialgradient': function (xmlNode) {
            const cx = parseInt(xmlNode.getAttribute('cx') || '0', 10);
            const cy = parseInt(xmlNode.getAttribute('cy') || '0', 10);
            const r = parseInt(xmlNode.getAttribute('r') || '0', 10);
            const gradient = new RadialGradient(cx, cy, r);
            parsePaintServerUnit(xmlNode, gradient);
            parseGradientColorStops(xmlNode, gradient);
            return gradient;
        }
    };
    function parsePaintServerUnit(xmlNode, gradient) {
        const gradientUnits = xmlNode.getAttribute('gradientUnits');
        if (gradientUnits === 'userSpaceOnUse') {
            gradient.global = true;
        }
    }
    function parseGradientColorStops(xmlNode, gradient) {
        let stop = xmlNode.firstChild;
        while (stop) {
            if (stop.nodeType === 1
                && stop.nodeName.toLocaleLowerCase() === 'stop') {
                const offsetStr = stop.getAttribute('offset');
                let offset;
                if (offsetStr && offsetStr.indexOf('%') > 0) {
                    offset = parseInt(offsetStr, 10) / 100;
                }
                else if (offsetStr) {
                    offset = parseFloat(offsetStr);
                }
                else {
                    offset = 0;
                }
                const styleVals = {};
                parseInlineStyle(stop, styleVals, styleVals);
                const stopColor = styleVals.stopColor
                    || stop.getAttribute('stop-color')
                    || '#000000';
                gradient.colorStops.push({
                    offset: offset,
                    color: stopColor
                });
            }
            stop = stop.nextSibling;
        }
    }
    function inheritStyle(parent, child) {
        if (parent && parent.__inheritedStyle) {
            if (!child.__inheritedStyle) {
                child.__inheritedStyle = {};
            }
            defaults(child.__inheritedStyle, parent.__inheritedStyle);
        }
    }
    function parsePoints(pointsString) {
        const list = splitNumberSequence(pointsString);
        const points = [];
        for (let i = 0; i < list.length; i += 2) {
            const x = parseFloat(list[i]);
            const y = parseFloat(list[i + 1]);
            points.push([x, y]);
        }
        return points;
    }
    function parseAttributes(xmlNode, el, defsUsePending, onlyInlineStyle, isTextGroup) {
        const disp = el;
        const inheritedStyle = disp.__inheritedStyle = disp.__inheritedStyle || {};
        const selfStyle = {};
        if (xmlNode.nodeType === 1) {
            parseTransformAttribute(xmlNode, el);
            parseInlineStyle(xmlNode, inheritedStyle, selfStyle);
            if (!onlyInlineStyle) {
                parseAttributeStyle(xmlNode, inheritedStyle, selfStyle);
            }
        }
        disp.style = disp.style || {};
        if (inheritedStyle.fill != null) {
            disp.style.fill = getFillStrokeStyle(disp, 'fill', inheritedStyle.fill, defsUsePending);
        }
        if (inheritedStyle.stroke != null) {
            disp.style.stroke = getFillStrokeStyle(disp, 'stroke', inheritedStyle.stroke, defsUsePending);
        }
        each([
            'lineWidth', 'opacity', 'fillOpacity', 'strokeOpacity', 'miterLimit', 'fontSize'
        ], function (propName) {
            if (inheritedStyle[propName] != null) {
                disp.style[propName] = parseFloat(inheritedStyle[propName]);
            }
        });
        each([
            'lineDashOffset', 'lineCap', 'lineJoin', 'fontWeight', 'fontFamily', 'fontStyle', 'textAlign'
        ], function (propName) {
            if (inheritedStyle[propName] != null) {
                disp.style[propName] = inheritedStyle[propName];
            }
        });
        if (isTextGroup) {
            disp.__selfStyle = selfStyle;
        }
        if (inheritedStyle.lineDash) {
            disp.style.lineDash = map(splitNumberSequence(inheritedStyle.lineDash), function (str) {
                return parseFloat(str);
            });
        }
        if (inheritedStyle.visibility === 'hidden' || inheritedStyle.visibility === 'collapse') {
            disp.invisible = true;
        }
        if (inheritedStyle.display === 'none') {
            disp.ignore = true;
        }
    }
    function applyTextAlignment(text, parentGroup) {
        const parentSelfStyle = parentGroup.__selfStyle;
        if (parentSelfStyle) {
            const textBaseline = parentSelfStyle.textBaseline;
            let zrTextBaseline = textBaseline;
            if (!textBaseline || textBaseline === 'auto') {
                zrTextBaseline = 'alphabetic';
            }
            else if (textBaseline === 'baseline') {
                zrTextBaseline = 'alphabetic';
            }
            else if (textBaseline === 'before-edge' || textBaseline === 'text-before-edge') {
                zrTextBaseline = 'top';
            }
            else if (textBaseline === 'after-edge' || textBaseline === 'text-after-edge') {
                zrTextBaseline = 'bottom';
            }
            else if (textBaseline === 'central' || textBaseline === 'mathematical') {
                zrTextBaseline = 'middle';
            }
            text.style.textBaseline = zrTextBaseline;
        }
        const parentInheritedStyle = parentGroup.__inheritedStyle;
        if (parentInheritedStyle) {
            const textAlign = parentInheritedStyle.textAlign;
            let zrTextAlign = textAlign;
            if (textAlign) {
                if (textAlign === 'middle') {
                    zrTextAlign = 'center';
                }
                text.style.textAlign = zrTextAlign;
            }
        }
    }
    const urlRegex = /^url\(\s*#(.*?)\)/;
    function getFillStrokeStyle(el, method, str, defsUsePending) {
        const urlMatch = str && str.match(urlRegex);
        if (urlMatch) {
            const url = trim(urlMatch[1]);
            defsUsePending.push([el, method, url]);
            return;
        }
        if (str === 'none') {
            str = null;
        }
        return str;
    }
    function applyDefs(defs, defsUsePending) {
        for (let i = 0; i < defsUsePending.length; i++) {
            const item = defsUsePending[i];
            item[0].style[item[1]] = defs[item[2]];
        }
    }
    const numberReg$1 = /-?([0-9]*\.)?[0-9]+([eE]-?[0-9]+)?/g;
    function splitNumberSequence(rawStr) {
        return rawStr.match(numberReg$1) || [];
    }
    const transformRegex = /(translate|scale|rotate|skewX|skewY|matrix)\(([\-\s0-9\.eE,]*)\)/g;
    const DEGREE_TO_ANGLE = Math.PI / 180;
    function parseTransformAttribute(xmlNode, node) {
        let transform = xmlNode.getAttribute('transform');
        if (transform) {
            transform = transform.replace(/,/g, ' ');
            const transformOps = [];
            let mt = null;
            transform.replace(transformRegex, function (str, type, value) {
                transformOps.push(type, value);
                return '';
            });
            for (let i = transformOps.length - 1; i > 0; i -= 2) {
                const value = transformOps[i];
                const type = transformOps[i - 1];
                const valueArr = splitNumberSequence(value);
                mt = mt || create$1();
                switch (type) {
                    case 'translate':
                        translate(mt, mt, [parseFloat(valueArr[0]), parseFloat(valueArr[1] || '0')]);
                        break;
                    case 'scale':
                        scale$1(mt, mt, [parseFloat(valueArr[0]), parseFloat(valueArr[1] || valueArr[0])]);
                        break;
                    case 'rotate':
                        rotate(mt, mt, -parseFloat(valueArr[0]) * DEGREE_TO_ANGLE, [
                            parseFloat(valueArr[1] || '0'),
                            parseFloat(valueArr[2] || '0')
                        ]);
                        break;
                    case 'skewX':
                        const sx = Math.tan(parseFloat(valueArr[0]) * DEGREE_TO_ANGLE);
                        mul$1(mt, [1, 0, sx, 1, 0, 0], mt);
                        break;
                    case 'skewY':
                        const sy = Math.tan(parseFloat(valueArr[0]) * DEGREE_TO_ANGLE);
                        mul$1(mt, [1, sy, 0, 1, 0, 0], mt);
                        break;
                    case 'matrix':
                        mt[0] = parseFloat(valueArr[0]);
                        mt[1] = parseFloat(valueArr[1]);
                        mt[2] = parseFloat(valueArr[2]);
                        mt[3] = parseFloat(valueArr[3]);
                        mt[4] = parseFloat(valueArr[4]);
                        mt[5] = parseFloat(valueArr[5]);
                        break;
                }
            }
            node.setLocalTransform(mt);
        }
    }
    const styleRegex = /([^\s:;]+)\s*:\s*([^:;]+)/g;
    function parseInlineStyle(xmlNode, inheritableStyleResult, selfStyleResult) {
        const style = xmlNode.getAttribute('style');
        if (!style) {
            return;
        }
        styleRegex.lastIndex = 0;
        let styleRegResult;
        while ((styleRegResult = styleRegex.exec(style)) != null) {
            const svgStlAttr = styleRegResult[1];
            const zrInheritableStlAttr = hasOwn(INHERITABLE_STYLE_ATTRIBUTES_MAP, svgStlAttr)
                ? INHERITABLE_STYLE_ATTRIBUTES_MAP[svgStlAttr]
                : null;
            if (zrInheritableStlAttr) {
                inheritableStyleResult[zrInheritableStlAttr] = styleRegResult[2];
            }
            const zrSelfStlAttr = hasOwn(SELF_STYLE_ATTRIBUTES_MAP, svgStlAttr)
                ? SELF_STYLE_ATTRIBUTES_MAP[svgStlAttr]
                : null;
            if (zrSelfStlAttr) {
                selfStyleResult[zrSelfStlAttr] = styleRegResult[2];
            }
        }
    }
    function parseAttributeStyle(xmlNode, inheritableStyleResult, selfStyleResult) {
        for (let i = 0; i < INHERITABLE_STYLE_ATTRIBUTES_MAP_KEYS.length; i++) {
            const svgAttrName = INHERITABLE_STYLE_ATTRIBUTES_MAP_KEYS[i];
            const attrValue = xmlNode.getAttribute(svgAttrName);
            if (attrValue != null) {
                inheritableStyleResult[INHERITABLE_STYLE_ATTRIBUTES_MAP[svgAttrName]] = attrValue;
            }
        }
        for (let i = 0; i < SELF_STYLE_ATTRIBUTES_MAP_KEYS.length; i++) {
            const svgAttrName = SELF_STYLE_ATTRIBUTES_MAP_KEYS[i];
            const attrValue = xmlNode.getAttribute(svgAttrName);
            if (attrValue != null) {
                selfStyleResult[SELF_STYLE_ATTRIBUTES_MAP[svgAttrName]] = attrValue;
            }
        }
    }
    function makeViewBoxTransform(viewBoxRect, boundingRect) {
        const scaleX = boundingRect.width / viewBoxRect.width;
        const scaleY = boundingRect.height / viewBoxRect.height;
        const scale = Math.min(scaleX, scaleY);
        return {
            scale,
            x: -(viewBoxRect.x + viewBoxRect.width / 2) * scale + (boundingRect.x + boundingRect.width / 2),
            y: -(viewBoxRect.y + viewBoxRect.height / 2) * scale + (boundingRect.y + boundingRect.height / 2)
        };
    }
    function parseSVG(xml, opt) {
        const parser = new SVGParser();
        return parser.parse(xml, opt);
    }

    const PI$2 = Math.PI;
    const PI2$5 = PI$2 * 2;
    const mathSin$3 = Math.sin;
    const mathCos$3 = Math.cos;
    const mathACos = Math.acos;
    const mathATan2 = Math.atan2;
    const mathAbs$1 = Math.abs;
    const mathSqrt$3 = Math.sqrt;
    const mathMax$3 = Math.max;
    const mathMin$3 = Math.min;
    const e = 1e-4;
    function intersect(x0, y0, x1, y1, x2, y2, x3, y3) {
        const dx10 = x1 - x0;
        const dy10 = y1 - y0;
        const dx32 = x3 - x2;
        const dy32 = y3 - y2;
        let t = dy32 * dx10 - dx32 * dy10;
        if (t * t < e) {
            return;
        }
        t = (dx32 * (y0 - y2) - dy32 * (x0 - x2)) / t;
        return [x0 + t * dx10, y0 + t * dy10];
    }
    function computeCornerTangents(x0, y0, x1, y1, radius, cr, clockwise) {
        const x01 = x0 - x1;
        const y01 = y0 - y1;
        const lo = (clockwise ? cr : -cr) / mathSqrt$3(x01 * x01 + y01 * y01);
        const ox = lo * y01;
        const oy = -lo * x01;
        const x11 = x0 + ox;
        const y11 = y0 + oy;
        const x10 = x1 + ox;
        const y10 = y1 + oy;
        const x00 = (x11 + x10) / 2;
        const y00 = (y11 + y10) / 2;
        const dx = x10 - x11;
        const dy = y10 - y11;
        const d2 = dx * dx + dy * dy;
        const r = radius - cr;
        const s = x11 * y10 - x10 * y11;
        const d = (dy < 0 ? -1 : 1) * mathSqrt$3(mathMax$3(0, r * r * d2 - s * s));
        let cx0 = (s * dy - dx * d) / d2;
        let cy0 = (-s * dx - dy * d) / d2;
        const cx1 = (s * dy + dx * d) / d2;
        const cy1 = (-s * dx + dy * d) / d2;
        const dx0 = cx0 - x00;
        const dy0 = cy0 - y00;
        const dx1 = cx1 - x00;
        const dy1 = cy1 - y00;
        if (dx0 * dx0 + dy0 * dy0 > dx1 * dx1 + dy1 * dy1) {
            cx0 = cx1;
            cy0 = cy1;
        }
        return {
            cx: cx0,
            cy: cy0,
            x0: -ox,
            y0: -oy,
            x1: cx0 * (radius / r - 1),
            y1: cy0 * (radius / r - 1)
        };
    }
    function normalizeCornerRadius(cr) {
        let arr;
        if (isArray(cr)) {
            const len = cr.length;
            if (!len) {
                return cr;
            }
            if (len === 1) {
                arr = [cr[0], cr[0], 0, 0];
            }
            else if (len === 2) {
                arr = [cr[0], cr[0], cr[1], cr[1]];
            }
            else if (len === 3) {
                arr = cr.concat(cr[2]);
            }
            else {
                arr = cr;
            }
        }
        else {
            arr = [cr, cr, cr, cr];
        }
        return arr;
    }
    function buildPath$2(ctx, shape) {
        let radius = mathMax$3(shape.r, 0);
        let innerRadius = mathMax$3(shape.r0 || 0, 0);
        const hasRadius = radius > 0;
        const hasInnerRadius = innerRadius > 0;
        if (!hasRadius && !hasInnerRadius) {
            return;
        }
        if (!hasRadius) {
            radius = innerRadius;
            innerRadius = 0;
        }
        if (innerRadius > radius) {
            const tmp = radius;
            radius = innerRadius;
            innerRadius = tmp;
        }
        const { startAngle, endAngle } = shape;
        if (isNaN(startAngle) || isNaN(endAngle)) {
            return;
        }
        const { cx, cy } = shape;
        const clockwise = !!shape.clockwise;
        let arc = mathAbs$1(endAngle - startAngle);
        const mod = arc > PI2$5 && arc % PI2$5;
        mod > e && (arc = mod);
        if (!(radius > e)) {
            ctx.moveTo(cx, cy);
        }
        else if (arc > PI2$5 - e) {
            ctx.moveTo(cx + radius * mathCos$3(startAngle), cy + radius * mathSin$3(startAngle));
            ctx.arc(cx, cy, radius, startAngle, endAngle, !clockwise);
            if (innerRadius > e) {
                ctx.moveTo(cx + innerRadius * mathCos$3(endAngle), cy + innerRadius * mathSin$3(endAngle));
                ctx.arc(cx, cy, innerRadius, endAngle, startAngle, clockwise);
            }
        }
        else {
            let icrStart;
            let icrEnd;
            let ocrStart;
            let ocrEnd;
            let ocrs;
            let ocre;
            let icrs;
            let icre;
            let ocrMax;
            let icrMax;
            let limitedOcrMax;
            let limitedIcrMax;
            let xre;
            let yre;
            let xirs;
            let yirs;
            const xrs = radius * mathCos$3(startAngle);
            const yrs = radius * mathSin$3(startAngle);
            const xire = innerRadius * mathCos$3(endAngle);
            const yire = innerRadius * mathSin$3(endAngle);
            const hasArc = arc > e;
            if (hasArc) {
                const cornerRadius = shape.cornerRadius;
                if (cornerRadius) {
                    [icrStart, icrEnd, ocrStart, ocrEnd] = normalizeCornerRadius(cornerRadius);
                }
                const halfRd = mathAbs$1(radius - innerRadius) / 2;
                ocrs = mathMin$3(halfRd, ocrStart);
                ocre = mathMin$3(halfRd, ocrEnd);
                icrs = mathMin$3(halfRd, icrStart);
                icre = mathMin$3(halfRd, icrEnd);
                limitedOcrMax = ocrMax = mathMax$3(ocrs, ocre);
                limitedIcrMax = icrMax = mathMax$3(icrs, icre);
                if (ocrMax > e || icrMax > e) {
                    xre = radius * mathCos$3(endAngle);
                    yre = radius * mathSin$3(endAngle);
                    xirs = innerRadius * mathCos$3(startAngle);
                    yirs = innerRadius * mathSin$3(startAngle);
                    if (arc < PI$2) {
                        const it = intersect(xrs, yrs, xirs, yirs, xre, yre, xire, yire);
                        if (it) {
                            const x0 = xrs - it[0];
                            const y0 = yrs - it[1];
                            const x1 = xre - it[0];
                            const y1 = yre - it[1];
                            const a = 1 / mathSin$3(mathACos((x0 * x1 + y0 * y1) / (mathSqrt$3(x0 * x0 + y0 * y0) * mathSqrt$3(x1 * x1 + y1 * y1))) / 2);
                            const b = mathSqrt$3(it[0] * it[0] + it[1] * it[1]);
                            limitedOcrMax = mathMin$3(ocrMax, (radius - b) / (a + 1));
                            limitedIcrMax = mathMin$3(icrMax, (innerRadius - b) / (a - 1));
                        }
                    }
                }
            }
            if (!hasArc) {
                ctx.moveTo(cx + xrs, cy + yrs);
            }
            else if (limitedOcrMax > e) {
                const crStart = mathMin$3(ocrStart, limitedOcrMax);
                const crEnd = mathMin$3(ocrEnd, limitedOcrMax);
                const ct0 = computeCornerTangents(xirs, yirs, xrs, yrs, radius, crStart, clockwise);
                const ct1 = computeCornerTangents(xre, yre, xire, yire, radius, crEnd, clockwise);
                ctx.moveTo(cx + ct0.cx + ct0.x0, cy + ct0.cy + ct0.y0);
                if (limitedOcrMax < ocrMax && crStart === crEnd) {
                    ctx.arc(cx + ct0.cx, cy + ct0.cy, limitedOcrMax, mathATan2(ct0.y0, ct0.x0), mathATan2(ct1.y0, ct1.x0), !clockwise);
                }
                else {
                    crStart > 0 && ctx.arc(cx + ct0.cx, cy + ct0.cy, crStart, mathATan2(ct0.y0, ct0.x0), mathATan2(ct0.y1, ct0.x1), !clockwise);
                    ctx.arc(cx, cy, radius, mathATan2(ct0.cy + ct0.y1, ct0.cx + ct0.x1), mathATan2(ct1.cy + ct1.y1, ct1.cx + ct1.x1), !clockwise);
                    crEnd > 0 && ctx.arc(cx + ct1.cx, cy + ct1.cy, crEnd, mathATan2(ct1.y1, ct1.x1), mathATan2(ct1.y0, ct1.x0), !clockwise);
                }
            }
            else {
                ctx.moveTo(cx + xrs, cy + yrs);
                ctx.arc(cx, cy, radius, startAngle, endAngle, !clockwise);
            }
            if (!(innerRadius > e) || !hasArc) {
                ctx.lineTo(cx + xire, cy + yire);
            }
            else if (limitedIcrMax > e) {
                const crStart = mathMin$3(icrStart, limitedIcrMax);
                const crEnd = mathMin$3(icrEnd, limitedIcrMax);
                const ct0 = computeCornerTangents(xire, yire, xre, yre, innerRadius, -crEnd, clockwise);
                const ct1 = computeCornerTangents(xrs, yrs, xirs, yirs, innerRadius, -crStart, clockwise);
                ctx.lineTo(cx + ct0.cx + ct0.x0, cy + ct0.cy + ct0.y0);
                if (limitedIcrMax < icrMax && crStart === crEnd) {
                    ctx.arc(cx + ct0.cx, cy + ct0.cy, limitedIcrMax, mathATan2(ct0.y0, ct0.x0), mathATan2(ct1.y0, ct1.x0), !clockwise);
                }
                else {
                    crEnd > 0 && ctx.arc(cx + ct0.cx, cy + ct0.cy, crEnd, mathATan2(ct0.y0, ct0.x0), mathATan2(ct0.y1, ct0.x1), !clockwise);
                    ctx.arc(cx, cy, innerRadius, mathATan2(ct0.cy + ct0.y1, ct0.cx + ct0.x1), mathATan2(ct1.cy + ct1.y1, ct1.cx + ct1.x1), clockwise);
                    crStart > 0 && ctx.arc(cx + ct1.cx, cy + ct1.cy, crStart, mathATan2(ct1.y1, ct1.x1), mathATan2(ct1.y0, ct1.x0), !clockwise);
                }
            }
            else {
                ctx.lineTo(cx + xire, cy + yire);
                ctx.arc(cx, cy, innerRadius, endAngle, startAngle, clockwise);
            }
        }
        ctx.closePath();
    }

    class SectorShape {
        constructor() {
            this.cx = 0;
            this.cy = 0;
            this.r0 = 0;
            this.r = 0;
            this.startAngle = 0;
            this.endAngle = Math.PI * 2;
            this.clockwise = true;
            this.cornerRadius = 0;
        }
    }
    class Sector extends Path {
        constructor(opts) {
            super(opts);
        }
        getDefaultShape() {
            return new SectorShape();
        }
        buildPath(ctx, shape) {
            buildPath$2(ctx, shape);
        }
        isZeroArea() {
            return this.shape.startAngle === this.shape.endAngle
                || this.shape.r === this.shape.r0;
        }
    }
    Sector.prototype.type = 'sector';

    const CMD$3 = PathProxy.CMD;
    function aroundEqual(a, b) {
        return Math.abs(a - b) < 1e-5;
    }
    function pathToBezierCurves(path) {
        const data = path.data;
        const len = path.len();
        const bezierArrayGroups = [];
        let currentSubpath;
        let xi = 0;
        let yi = 0;
        let x0 = 0;
        let y0 = 0;
        function createNewSubpath(x, y) {
            if (currentSubpath && currentSubpath.length > 2) {
                bezierArrayGroups.push(currentSubpath);
            }
            currentSubpath = [x, y];
        }
        function addLine(x0, y0, x1, y1) {
            if (!(aroundEqual(x0, x1) && aroundEqual(y0, y1))) {
                currentSubpath.push(x0, y0, x1, y1, x1, y1);
            }
        }
        function addArc(startAngle, endAngle, cx, cy, rx, ry) {
            const delta = Math.abs(endAngle - startAngle);
            const len = Math.tan(delta / 4) * 4 / 3;
            const dir = endAngle < startAngle ? -1 : 1;
            const c1 = Math.cos(startAngle);
            const s1 = Math.sin(startAngle);
            const c2 = Math.cos(endAngle);
            const s2 = Math.sin(endAngle);
            const x1 = c1 * rx + cx;
            const y1 = s1 * ry + cy;
            const x4 = c2 * rx + cx;
            const y4 = s2 * ry + cy;
            const hx = rx * len * dir;
            const hy = ry * len * dir;
            currentSubpath.push(x1 - hx * s1, y1 + hy * c1, x4 + hx * s2, y4 - hy * c2, x4, y4);
        }
        let x1;
        let y1;
        let x2;
        let y2;
        for (let i = 0; i < len;) {
            const cmd = data[i++];
            const isFirst = i === 1;
            if (isFirst) {
                xi = data[i];
                yi = data[i + 1];
                x0 = xi;
                y0 = yi;
                if (cmd === CMD$3.L || cmd === CMD$3.C || cmd === CMD$3.Q) {
                    currentSubpath = [x0, y0];
                }
            }
            switch (cmd) {
                case CMD$3.M:
                    xi = x0 = data[i++];
                    yi = y0 = data[i++];
                    createNewSubpath(x0, y0);
                    break;
                case CMD$3.L:
                    x1 = data[i++];
                    y1 = data[i++];
                    addLine(xi, yi, x1, y1);
                    xi = x1;
                    yi = y1;
                    break;
                case CMD$3.C:
                    currentSubpath.push(data[i++], data[i++], data[i++], data[i++], xi = data[i++], yi = data[i++]);
                    break;
                case CMD$3.Q:
                    x1 = data[i++];
                    y1 = data[i++];
                    x2 = data[i++];
                    y2 = data[i++];
                    currentSubpath.push(xi + 2 / 3 * (x1 - xi), yi + 2 / 3 * (y1 - yi), x2 + 2 / 3 * (x1 - x2), y2 + 2 / 3 * (y1 - y2), x2, y2);
                    xi = x2;
                    yi = y2;
                    break;
                case CMD$3.A:
                    const cx = data[i++];
                    const cy = data[i++];
                    const rx = data[i++];
                    const ry = data[i++];
                    const startAngle = data[i++];
                    const endAngle = data[i++] + startAngle;
                    i += 1;
                    const anticlockwise = !data[i++];
                    x1 = Math.cos(startAngle) * rx + cx;
                    y1 = Math.sin(startAngle) * ry + cy;
                    if (isFirst) {
                        x0 = x1;
                        y0 = y1;
                        createNewSubpath(x0, y0);
                    }
                    else {
                        addLine(xi, yi, x1, y1);
                    }
                    xi = Math.cos(endAngle) * rx + cx;
                    yi = Math.sin(endAngle) * ry + cy;
                    const step = (anticlockwise ? -1 : 1) * Math.PI / 2;
                    for (let angle = startAngle; anticlockwise ? angle > endAngle : angle < endAngle; angle += step) {
                        const nextAngle = anticlockwise ? Math.max(angle + step, endAngle)
                            : Math.min(angle + step, endAngle);
                        addArc(angle, nextAngle, cx, cy, rx, ry);
                    }
                    break;
                case CMD$3.R:
                    x0 = xi = data[i++];
                    y0 = yi = data[i++];
                    x1 = x0 + data[i++];
                    y1 = y0 + data[i++];
                    createNewSubpath(x1, y0);
                    addLine(x1, y0, x1, y1);
                    addLine(x1, y1, x0, y1);
                    addLine(x0, y1, x0, y0);
                    addLine(x0, y0, x1, y0);
                    break;
                case CMD$3.Z:
                    currentSubpath && addLine(xi, yi, x0, y0);
                    xi = x0;
                    yi = y0;
                    break;
            }
        }
        if (currentSubpath && currentSubpath.length > 2) {
            bezierArrayGroups.push(currentSubpath);
        }
        return bezierArrayGroups;
    }
    function adpativeBezier(x0, y0, x1, y1, x2, y2, x3, y3, out, scale) {
        if (aroundEqual(x0, x1) && aroundEqual(y0, y1) && aroundEqual(x2, x3) && aroundEqual(y2, y3)) {
            out.push(x3, y3);
            return;
        }
        const PIXEL_DISTANCE = 2 / scale;
        const PIXEL_DISTANCE_SQR = PIXEL_DISTANCE * PIXEL_DISTANCE;
        let dx = x3 - x0;
        let dy = y3 - y0;
        const d = Math.sqrt(dx * dx + dy * dy);
        dx /= d;
        dy /= d;
        const dx1 = x1 - x0;
        const dy1 = y1 - y0;
        const dx2 = x2 - x3;
        const dy2 = y2 - y3;
        const cp1LenSqr = dx1 * dx1 + dy1 * dy1;
        const cp2LenSqr = dx2 * dx2 + dy2 * dy2;
        if (cp1LenSqr < PIXEL_DISTANCE_SQR && cp2LenSqr < PIXEL_DISTANCE_SQR) {
            out.push(x3, y3);
            return;
        }
        const projLen1 = dx * dx1 + dy * dy1;
        const projLen2 = -dx * dx2 - dy * dy2;
        const d1Sqr = cp1LenSqr - projLen1 * projLen1;
        const d2Sqr = cp2LenSqr - projLen2 * projLen2;
        if (d1Sqr < PIXEL_DISTANCE_SQR && projLen1 >= 0
            && d2Sqr < PIXEL_DISTANCE_SQR && projLen2 >= 0) {
            out.push(x3, y3);
            return;
        }
        const tmpSegX = [];
        const tmpSegY = [];
        cubicSubdivide(x0, x1, x2, x3, 0.5, tmpSegX);
        cubicSubdivide(y0, y1, y2, y3, 0.5, tmpSegY);
        adpativeBezier(tmpSegX[0], tmpSegY[0], tmpSegX[1], tmpSegY[1], tmpSegX[2], tmpSegY[2], tmpSegX[3], tmpSegY[3], out, scale);
        adpativeBezier(tmpSegX[4], tmpSegY[4], tmpSegX[5], tmpSegY[5], tmpSegX[6], tmpSegY[6], tmpSegX[7], tmpSegY[7], out, scale);
    }
    function pathToPolygons(path, scale) {
        const bezierArrayGroups = pathToBezierCurves(path);
        const polygons = [];
        scale = scale || 1;
        for (let i = 0; i < bezierArrayGroups.length; i++) {
            const beziers = bezierArrayGroups[i];
            const polygon = [];
            let x0 = beziers[0];
            let y0 = beziers[1];
            polygon.push(x0, y0);
            for (let k = 2; k < beziers.length;) {
                const x1 = beziers[k++];
                const y1 = beziers[k++];
                const x2 = beziers[k++];
                const y2 = beziers[k++];
                const x3 = beziers[k++];
                const y3 = beziers[k++];
                adpativeBezier(x0, y0, x1, y1, x2, y2, x3, y3, polygon, scale);
                x0 = x3;
                y0 = y3;
            }
            polygons.push(polygon);
        }
        return polygons;
    }

    function getDividingGrids(dimSize, rowDim, count) {
        const rowSize = dimSize[rowDim];
        const columnSize = dimSize[1 - rowDim];
        const ratio = Math.abs(rowSize / columnSize);
        let rowCount = Math.ceil(Math.sqrt(ratio * count));
        let columnCount = Math.floor(count / rowCount);
        if (columnCount === 0) {
            columnCount = 1;
            rowCount = count;
        }
        const grids = [];
        for (let i = 0; i < rowCount; i++) {
            grids.push(columnCount);
        }
        const currentCount = rowCount * columnCount;
        const remained = count - currentCount;
        if (remained > 0) {
            for (let i = 0; i < remained; i++) {
                grids[i % rowCount] += 1;
            }
        }
        return grids;
    }
    function divideSector(sectorShape, count, outShapes) {
        const r0 = sectorShape.r0;
        const r = sectorShape.r;
        const startAngle = sectorShape.startAngle;
        const endAngle = sectorShape.endAngle;
        const angle = Math.abs(endAngle - startAngle);
        const arcLen = angle * r;
        const deltaR = r - r0;
        const isAngleRow = arcLen > Math.abs(deltaR);
        const grids = getDividingGrids([arcLen, deltaR], isAngleRow ? 0 : 1, count);
        const rowSize = (isAngleRow ? angle : deltaR) / grids.length;
        for (let row = 0; row < grids.length; row++) {
            const columnSize = (isAngleRow ? deltaR : angle) / grids[row];
            for (let column = 0; column < grids[row]; column++) {
                const newShape = {};
                if (isAngleRow) {
                    newShape.startAngle = startAngle + rowSize * row;
                    newShape.endAngle = startAngle + rowSize * (row + 1);
                    newShape.r0 = r0 + columnSize * column;
                    newShape.r = r0 + columnSize * (column + 1);
                }
                else {
                    newShape.startAngle = startAngle + columnSize * column;
                    newShape.endAngle = startAngle + columnSize * (column + 1);
                    newShape.r0 = r0 + rowSize * row;
                    newShape.r = r0 + rowSize * (row + 1);
                }
                newShape.clockwise = sectorShape.clockwise;
                newShape.cx = sectorShape.cx;
                newShape.cy = sectorShape.cy;
                outShapes.push(newShape);
            }
        }
    }
    function divideRect(rectShape, count, outShapes) {
        const width = rectShape.width;
        const height = rectShape.height;
        const isHorizontalRow = width > height;
        const grids = getDividingGrids([width, height], isHorizontalRow ? 0 : 1, count);
        const rowSizeDim = isHorizontalRow ? 'width' : 'height';
        const columnSizeDim = isHorizontalRow ? 'height' : 'width';
        const rowDim = isHorizontalRow ? 'x' : 'y';
        const columnDim = isHorizontalRow ? 'y' : 'x';
        const rowSize = rectShape[rowSizeDim] / grids.length;
        for (let row = 0; row < grids.length; row++) {
            const columnSize = rectShape[columnSizeDim] / grids[row];
            for (let column = 0; column < grids[row]; column++) {
                const newShape = {};
                newShape[rowDim] = row * rowSize;
                newShape[columnDim] = column * columnSize;
                newShape[rowSizeDim] = rowSize;
                newShape[columnSizeDim] = columnSize;
                newShape.x += rectShape.x;
                newShape.y += rectShape.y;
                outShapes.push(newShape);
            }
        }
    }
    function crossProduct2d(x1, y1, x2, y2) {
        return x1 * y2 - x2 * y1;
    }
    function lineLineIntersect(a1x, a1y, a2x, a2y, b1x, b1y, b2x, b2y) {
        const mx = a2x - a1x;
        const my = a2y - a1y;
        const nx = b2x - b1x;
        const ny = b2y - b1y;
        const nmCrossProduct = crossProduct2d(nx, ny, mx, my);
        if (Math.abs(nmCrossProduct) < 1e-6) {
            return null;
        }
        const b1a1x = a1x - b1x;
        const b1a1y = a1y - b1y;
        const p = crossProduct2d(b1a1x, b1a1y, nx, ny) / nmCrossProduct;
        if (p < 0 || p > 1) {
            return null;
        }
        return new Point(p * mx + a1x, p * my + a1y);
    }
    function projPtOnLine(pt, lineA, lineB) {
        const dir = new Point();
        Point.sub(dir, lineB, lineA);
        dir.normalize();
        const dir2 = new Point();
        Point.sub(dir2, pt, lineA);
        const len = dir2.dot(dir);
        return len;
    }
    function addToPoly(poly, pt) {
        const last = poly[poly.length - 1];
        if (last && last[0] === pt[0] && last[1] === pt[1]) {
            return;
        }
        poly.push(pt);
    }
    function splitPolygonByLine(points, lineA, lineB) {
        const len = points.length;
        const intersections = [];
        for (let i = 0; i < len; i++) {
            const p0 = points[i];
            const p1 = points[(i + 1) % len];
            const intersectionPt = lineLineIntersect(p0[0], p0[1], p1[0], p1[1], lineA.x, lineA.y, lineB.x, lineB.y);
            if (intersectionPt) {
                intersections.push({
                    projPt: projPtOnLine(intersectionPt, lineA, lineB),
                    pt: intersectionPt,
                    idx: i
                });
            }
        }
        if (intersections.length < 2) {
            return [{ points }, { points }];
        }
        intersections.sort((a, b) => {
            return a.projPt - b.projPt;
        });
        let splitPt0 = intersections[0];
        let splitPt1 = intersections[intersections.length - 1];
        if (splitPt1.idx < splitPt0.idx) {
            const tmp = splitPt0;
            splitPt0 = splitPt1;
            splitPt1 = tmp;
        }
        const splitPt0Arr = [splitPt0.pt.x, splitPt0.pt.y];
        const splitPt1Arr = [splitPt1.pt.x, splitPt1.pt.y];
        const newPolyA = [splitPt0Arr];
        const newPolyB = [splitPt1Arr];
        for (let i = splitPt0.idx + 1; i <= splitPt1.idx; i++) {
            addToPoly(newPolyA, points[i].slice());
        }
        addToPoly(newPolyA, splitPt1Arr);
        addToPoly(newPolyA, splitPt0Arr);
        for (let i = splitPt1.idx + 1; i <= splitPt0.idx + len; i++) {
            addToPoly(newPolyB, points[i % len].slice());
        }
        addToPoly(newPolyB, splitPt0Arr);
        addToPoly(newPolyB, splitPt1Arr);
        return [{
                points: newPolyA
            }, {
                points: newPolyB
            }];
    }
    function binaryDividePolygon(polygonShape) {
        const points = polygonShape.points;
        const min = [];
        const max = [];
        fromPoints(points, min, max);
        const boundingRect = new BoundingRect(min[0], min[1], max[0] - min[0], max[1] - min[1]);
        const width = boundingRect.width;
        const height = boundingRect.height;
        const x = boundingRect.x;
        const y = boundingRect.y;
        const pt0 = new Point();
        const pt1 = new Point();
        if (width > height) {
            pt0.x = pt1.x = x + width / 2;
            pt0.y = y;
            pt1.y = y + height;
        }
        else {
            pt0.y = pt1.y = y + height / 2;
            pt0.x = x;
            pt1.x = x + width;
        }
        return splitPolygonByLine(points, pt0, pt1);
    }
    function binaryDivideRecursive(divider, shape, count, out) {
        if (count === 1) {
            out.push(shape);
        }
        else {
            const mid = Math.floor(count / 2);
            const sub = divider(shape);
            binaryDivideRecursive(divider, sub[0], mid, out);
            binaryDivideRecursive(divider, sub[1], count - mid, out);
        }
        return out;
    }
    function clone$3(path, count) {
        const paths = [];
        for (let i = 0; i < count; i++) {
            paths.push(clonePath(path));
        }
        return paths;
    }
    function copyPathProps(source, target) {
        target.setStyle(source.style);
        target.z = source.z;
        target.z2 = source.z2;
        target.zlevel = source.zlevel;
    }
    function polygonConvert(points) {
        const out = [];
        for (let i = 0; i < points.length;) {
            out.push([points[i++], points[i++]]);
        }
        return out;
    }
    function split(path, count) {
        const outShapes = [];
        const shape = path.shape;
        let OutShapeCtor;
        switch (path.type) {
            case 'rect':
                divideRect(shape, count, outShapes);
                OutShapeCtor = Rect;
                break;
            case 'sector':
                divideSector(shape, count, outShapes);
                OutShapeCtor = Sector;
                break;
            case 'circle':
                divideSector({
                    r0: 0, r: shape.r, startAngle: 0, endAngle: Math.PI * 2,
                    cx: shape.cx, cy: shape.cy
                }, count, outShapes);
                OutShapeCtor = Sector;
                break;
            default:
                const m = path.getComputedTransform();
                const scale = m ? Math.sqrt(Math.max(m[0] * m[0] + m[1] * m[1], m[2] * m[2] + m[3] * m[3])) : 1;
                const polygons = map(pathToPolygons(path.getUpdatedPathProxy(), scale), poly => polygonConvert(poly));
                const polygonCount = polygons.length;
                if (polygonCount === 0) {
                    binaryDivideRecursive(binaryDividePolygon, {
                        points: polygons[0]
                    }, count, outShapes);
                }
                else if (polygonCount === count) {
                    for (let i = 0; i < polygonCount; i++) {
                        outShapes.push({
                            points: polygons[i]
                        });
                    }
                }
                else {
                    let totalArea = 0;
                    const items = map(polygons, poly => {
                        const min = [];
                        const max = [];
                        fromPoints(poly, min, max);
                        const area = (max[1] - min[1]) * (max[0] - min[0]);
                        totalArea += area;
                        return { poly, area };
                    });
                    items.sort((a, b) => b.area - a.area);
                    let left = count;
                    for (let i = 0; i < polygonCount; i++) {
                        const item = items[i];
                        if (left <= 0) {
                            break;
                        }
                        const selfCount = i === polygonCount - 1
                            ? left
                            : Math.ceil(item.area / totalArea * count);
                        if (selfCount < 0) {
                            continue;
                        }
                        binaryDivideRecursive(binaryDividePolygon, {
                            points: item.poly
                        }, selfCount, outShapes);
                        left -= selfCount;
                    }
                }
                OutShapeCtor = Polygon;
                break;
        }
        if (!OutShapeCtor) {
            return clone$3(path, count);
        }
        const out = [];
        for (let i = 0; i < outShapes.length; i++) {
            const subPath = new OutShapeCtor();
            subPath.setShape(outShapes[i]);
            copyPathProps(path, subPath);
            out.push(subPath);
        }
        return out;
    }

    function alignSubpath(subpath1, subpath2) {
        const len1 = subpath1.length;
        const len2 = subpath2.length;
        if (len1 === len2) {
            return [subpath1, subpath2];
        }
        const tmpSegX = [];
        const tmpSegY = [];
        const shorterPath = len1 < len2 ? subpath1 : subpath2;
        const shorterLen = Math.min(len1, len2);
        const diff = Math.abs(len2 - len1) / 6;
        const shorterBezierCount = (shorterLen - 2) / 6;
        const eachCurveSubDivCount = Math.ceil(diff / shorterBezierCount) + 1;
        const newSubpath = [shorterPath[0], shorterPath[1]];
        let remained = diff;
        for (let i = 2; i < shorterLen;) {
            let x0 = shorterPath[i - 2];
            let y0 = shorterPath[i - 1];
            let x1 = shorterPath[i++];
            let y1 = shorterPath[i++];
            let x2 = shorterPath[i++];
            let y2 = shorterPath[i++];
            let x3 = shorterPath[i++];
            let y3 = shorterPath[i++];
            if (remained <= 0) {
                newSubpath.push(x1, y1, x2, y2, x3, y3);
                continue;
            }
            let actualSubDivCount = Math.min(remained, eachCurveSubDivCount - 1) + 1;
            for (let k = 1; k <= actualSubDivCount; k++) {
                const p = k / actualSubDivCount;
                cubicSubdivide(x0, x1, x2, x3, p, tmpSegX);
                cubicSubdivide(y0, y1, y2, y3, p, tmpSegY);
                x0 = tmpSegX[3];
                y0 = tmpSegY[3];
                newSubpath.push(tmpSegX[1], tmpSegY[1], tmpSegX[2], tmpSegY[2], x0, y0);
                x1 = tmpSegX[5];
                y1 = tmpSegY[5];
                x2 = tmpSegX[6];
                y2 = tmpSegY[6];
            }
            remained -= actualSubDivCount - 1;
        }
        return shorterPath === subpath1 ? [newSubpath, subpath2] : [subpath1, newSubpath];
    }
    function createSubpath(lastSubpathSubpath, otherSubpath) {
        const len = lastSubpathSubpath.length;
        const lastX = lastSubpathSubpath[len - 2];
        const lastY = lastSubpathSubpath[len - 1];
        const newSubpath = [];
        for (let i = 0; i < otherSubpath.length;) {
            newSubpath[i++] = lastX;
            newSubpath[i++] = lastY;
        }
        return newSubpath;
    }
    function alignBezierCurves(array1, array2) {
        let lastSubpath1;
        let lastSubpath2;
        let newArray1 = [];
        let newArray2 = [];
        for (let i = 0; i < Math.max(array1.length, array2.length); i++) {
            const subpath1 = array1[i];
            const subpath2 = array2[i];
            let newSubpath1;
            let newSubpath2;
            if (!subpath1) {
                newSubpath1 = createSubpath(lastSubpath1 || subpath2, subpath2);
                newSubpath2 = subpath2;
            }
            else if (!subpath2) {
                newSubpath2 = createSubpath(lastSubpath2 || subpath1, subpath1);
                newSubpath1 = subpath1;
            }
            else {
                [newSubpath1, newSubpath2] = alignSubpath(subpath1, subpath2);
                lastSubpath1 = newSubpath1;
                lastSubpath2 = newSubpath2;
            }
            newArray1.push(newSubpath1);
            newArray2.push(newSubpath2);
        }
        return [newArray1, newArray2];
    }
    function centroid(array) {
        let signedArea = 0;
        let cx = 0;
        let cy = 0;
        const len = array.length;
        for (let i = 0, j = len - 2; i < len; j = i, i += 2) {
            const x0 = array[j];
            const y0 = array[j + 1];
            const x1 = array[i];
            const y1 = array[i + 1];
            const a = x0 * y1 - x1 * y0;
            signedArea += a;
            cx += (x0 + x1) * a;
            cy += (y0 + y1) * a;
        }
        if (signedArea === 0) {
            return [array[0] || 0, array[1] || 0];
        }
        return [cx / signedArea / 3, cy / signedArea / 3, signedArea];
    }
    function findBestRingOffset(fromSubBeziers, toSubBeziers, fromCp, toCp) {
        const bezierCount = (fromSubBeziers.length - 2) / 6;
        let bestScore = Infinity;
        let bestOffset = 0;
        const len = fromSubBeziers.length;
        const len2 = len - 2;
        for (let offset = 0; offset < bezierCount; offset++) {
            const cursorOffset = offset * 6;
            let score = 0;
            for (let k = 0; k < len; k += 2) {
                let idx = k === 0 ? cursorOffset : ((cursorOffset + k - 2) % len2 + 2);
                const x0 = fromSubBeziers[idx] - fromCp[0];
                const y0 = fromSubBeziers[idx + 1] - fromCp[1];
                const x1 = toSubBeziers[k] - toCp[0];
                const y1 = toSubBeziers[k + 1] - toCp[1];
                const dx = x1 - x0;
                const dy = y1 - y0;
                score += dx * dx + dy * dy;
            }
            if (score < bestScore) {
                bestScore = score;
                bestOffset = offset;
            }
        }
        return bestOffset;
    }
    function reverse(array) {
        const newArr = [];
        const len = array.length;
        for (let i = 0; i < len; i += 2) {
            newArr[i] = array[len - i - 2];
            newArr[i + 1] = array[len - i - 1];
        }
        return newArr;
    }
    function findBestMorphingRotation(fromArr, toArr, searchAngleIteration, searchAngleRange) {
        const result = [];
        let fromNeedsReverse;
        for (let i = 0; i < fromArr.length; i++) {
            let fromSubpathBezier = fromArr[i];
            const toSubpathBezier = toArr[i];
            const fromCp = centroid(fromSubpathBezier);
            const toCp = centroid(toSubpathBezier);
            if (fromNeedsReverse == null) {
                fromNeedsReverse = fromCp[2] < 0 !== toCp[2] < 0;
            }
            const newFromSubpathBezier = [];
            const newToSubpathBezier = [];
            let bestAngle = 0;
            let bestScore = Infinity;
            let tmpArr = [];
            const len = fromSubpathBezier.length;
            if (fromNeedsReverse) {
                fromSubpathBezier = reverse(fromSubpathBezier);
            }
            const offset = findBestRingOffset(fromSubpathBezier, toSubpathBezier, fromCp, toCp) * 6;
            const len2 = len - 2;
            for (let k = 0; k < len2; k += 2) {
                const idx = (offset + k) % len2 + 2;
                newFromSubpathBezier[k + 2] = fromSubpathBezier[idx] - fromCp[0];
                newFromSubpathBezier[k + 3] = fromSubpathBezier[idx + 1] - fromCp[1];
            }
            newFromSubpathBezier[0] = fromSubpathBezier[offset] - fromCp[0];
            newFromSubpathBezier[1] = fromSubpathBezier[offset + 1] - fromCp[1];
            if (searchAngleIteration > 0) {
                const step = searchAngleRange / searchAngleIteration;
                for (let angle = -searchAngleRange / 2; angle <= searchAngleRange / 2; angle += step) {
                    const sa = Math.sin(angle);
                    const ca = Math.cos(angle);
                    let score = 0;
                    for (let k = 0; k < fromSubpathBezier.length; k += 2) {
                        const x0 = newFromSubpathBezier[k];
                        const y0 = newFromSubpathBezier[k + 1];
                        const x1 = toSubpathBezier[k] - toCp[0];
                        const y1 = toSubpathBezier[k + 1] - toCp[1];
                        const newX1 = x1 * ca - y1 * sa;
                        const newY1 = x1 * sa + y1 * ca;
                        tmpArr[k] = newX1;
                        tmpArr[k + 1] = newY1;
                        const dx = newX1 - x0;
                        const dy = newY1 - y0;
                        score += dx * dx + dy * dy;
                    }
                    if (score < bestScore) {
                        bestScore = score;
                        bestAngle = angle;
                        for (let m = 0; m < tmpArr.length; m++) {
                            newToSubpathBezier[m] = tmpArr[m];
                        }
                    }
                }
            }
            else {
                for (let i = 0; i < len; i += 2) {
                    newToSubpathBezier[i] = toSubpathBezier[i] - toCp[0];
                    newToSubpathBezier[i + 1] = toSubpathBezier[i + 1] - toCp[1];
                }
            }
            result.push({
                from: newFromSubpathBezier,
                to: newToSubpathBezier,
                fromCp,
                toCp,
                rotation: -bestAngle
            });
        }
        return result;
    }
    function isCombineMorphing(path) {
        return path.__isCombineMorphing;
    }
    function isMorphing(el) {
        return el.__morphT >= 0;
    }
    const SAVED_METHOD_PREFIX = '__mOriginal_';
    function saveAndModifyMethod(obj, methodName, modifiers) {
        const savedMethodName = SAVED_METHOD_PREFIX + methodName;
        const originalMethod = obj[savedMethodName] || obj[methodName];
        if (!obj[savedMethodName]) {
            obj[savedMethodName] = obj[methodName];
        }
        const replace = modifiers.replace;
        const after = modifiers.after;
        const before = modifiers.before;
        obj[methodName] = function () {
            const args = arguments;
            let res;
            before && before.apply(this, args);
            if (replace) {
                res = replace.apply(this, args);
            }
            else {
                res = originalMethod.apply(this, args);
            }
            after && after.apply(this, args);
            return res;
        };
    }
    function restoreMethod(obj, methodName) {
        const savedMethodName = SAVED_METHOD_PREFIX + methodName;
        if (obj[savedMethodName]) {
            obj[methodName] = obj[savedMethodName];
            obj[savedMethodName] = null;
        }
    }
    function applyTransformOnBeziers(bezierCurves, mm) {
        for (let i = 0; i < bezierCurves.length; i++) {
            const subBeziers = bezierCurves[i];
            for (let k = 0; k < subBeziers.length;) {
                const x = subBeziers[k];
                const y = subBeziers[k + 1];
                subBeziers[k++] = mm[0] * x + mm[2] * y + mm[4];
                subBeziers[k++] = mm[1] * x + mm[3] * y + mm[5];
            }
        }
    }
    function prepareMorphPath(fromPath, toPath) {
        const fromPathProxy = fromPath.getUpdatedPathProxy();
        const toPathProxy = toPath.getUpdatedPathProxy();
        const [fromBezierCurves, toBezierCurves] = alignBezierCurves(pathToBezierCurves(fromPathProxy), pathToBezierCurves(toPathProxy));
        const fromPathTransform = fromPath.getComputedTransform();
        const toPathTransform = toPath.getComputedTransform();
        function updateIdentityTransform() {
            this.transform = null;
        }
        fromPathTransform && applyTransformOnBeziers(fromBezierCurves, fromPathTransform);
        toPathTransform && applyTransformOnBeziers(toBezierCurves, toPathTransform);
        saveAndModifyMethod(toPath, 'updateTransform', { replace: updateIdentityTransform });
        toPath.transform = null;
        const morphingData = findBestMorphingRotation(fromBezierCurves, toBezierCurves, 10, Math.PI);
        const tmpArr = [];
        saveAndModifyMethod(toPath, 'buildPath', { replace(path) {
                const t = toPath.__morphT;
                const onet = 1 - t;
                const newCp = [];
                for (let i = 0; i < morphingData.length; i++) {
                    const item = morphingData[i];
                    const from = item.from;
                    const to = item.to;
                    const angle = item.rotation * t;
                    const fromCp = item.fromCp;
                    const toCp = item.toCp;
                    const sa = Math.sin(angle);
                    const ca = Math.cos(angle);
                    lerp(newCp, fromCp, toCp, t);
                    for (let m = 0; m < from.length; m += 2) {
                        const x0 = from[m];
                        const y0 = from[m + 1];
                        const x1 = to[m];
                        const y1 = to[m + 1];
                        const x = x0 * onet + x1 * t;
                        const y = y0 * onet + y1 * t;
                        tmpArr[m] = (x * ca - y * sa) + newCp[0];
                        tmpArr[m + 1] = (x * sa + y * ca) + newCp[1];
                    }
                    let x0 = tmpArr[0];
                    let y0 = tmpArr[1];
                    path.moveTo(x0, y0);
                    for (let m = 2; m < from.length;) {
                        const x1 = tmpArr[m++];
                        const y1 = tmpArr[m++];
                        const x2 = tmpArr[m++];
                        const y2 = tmpArr[m++];
                        const x3 = tmpArr[m++];
                        const y3 = tmpArr[m++];
                        if (x0 === x1 && y0 === y1 && x2 === x3 && y2 === y3) {
                            path.lineTo(x3, y3);
                        }
                        else {
                            path.bezierCurveTo(x1, y1, x2, y2, x3, y3);
                        }
                        x0 = x3;
                        y0 = y3;
                    }
                }
            } });
    }
    function morphPath(fromPath, toPath, animationOpts) {
        if (!fromPath || !toPath) {
            return toPath;
        }
        const oldDone = animationOpts.done;
        const oldDuring = animationOpts.during;
        prepareMorphPath(fromPath, toPath);
        toPath.__morphT = 0;
        function restoreToPath() {
            restoreMethod(toPath, 'buildPath');
            restoreMethod(toPath, 'updateTransform');
            toPath.__morphT = -1;
            toPath.createPathProxy();
            toPath.dirtyShape();
        }
        toPath.animateTo({
            __morphT: 1
        }, defaults({
            during(p) {
                toPath.dirtyShape();
                oldDuring && oldDuring(p);
            },
            done() {
                restoreToPath();
                oldDone && oldDone();
            }
        }, animationOpts));
        return toPath;
    }
    function hilbert(x, y, minX, minY, maxX, maxY) {
        const bits = 16;
        x = (maxX === minX) ? 0 : Math.round(32767 * (x - minX) / (maxX - minX));
        y = (maxY === minY) ? 0 : Math.round(32767 * (y - minY) / (maxY - minY));
        let d = 0;
        let tmp;
        for (let s = (1 << bits) / 2; s > 0; s /= 2) {
            let rx = 0;
            let ry = 0;
            if ((x & s) > 0) {
                rx = 1;
            }
            if ((y & s) > 0) {
                ry = 1;
            }
            d += s * s * ((3 * rx) ^ ry);
            if (ry === 0) {
                if (rx === 1) {
                    x = s - 1 - x;
                    y = s - 1 - y;
                }
                tmp = x;
                x = y;
                y = tmp;
            }
        }
        return d;
    }
    function sortPaths(pathList) {
        let xMin = Infinity;
        let yMin = Infinity;
        let xMax = -Infinity;
        let yMax = -Infinity;
        const cps = map(pathList, path => {
            const rect = path.getBoundingRect();
            const m = path.getComputedTransform();
            const x = rect.x + rect.width / 2 + (m ? m[4] : 0);
            const y = rect.y + rect.height / 2 + (m ? m[5] : 0);
            xMin = Math.min(x, xMin);
            yMin = Math.min(y, yMin);
            xMax = Math.max(x, xMax);
            yMax = Math.max(y, yMax);
            return [x, y];
        });
        const items = map(cps, (cp, idx) => {
            return {
                cp,
                z: hilbert(cp[0], cp[1], xMin, yMin, xMax, yMax),
                path: pathList[idx]
            };
        });
        return items.sort((a, b) => a.z - b.z).map(item => item.path);
    }
    function defaultDividePath(param) {
        return split(param.path, param.count);
    }
    function createEmptyReturn() {
        return {
            fromIndividuals: [],
            toIndividuals: [],
            count: 0
        };
    }
    function combineMorph(fromList, toPath, animationOpts) {
        let fromPathList = [];
        function addFromPath(fromList) {
            for (let i = 0; i < fromList.length; i++) {
                const from = fromList[i];
                if (isCombineMorphing(from)) {
                    addFromPath(from.childrenRef());
                }
                else if (from instanceof Path) {
                    fromPathList.push(from);
                }
            }
        }
        addFromPath(fromList);
        const separateCount = fromPathList.length;
        if (!separateCount) {
            return createEmptyReturn();
        }
        const dividePath = animationOpts.dividePath || defaultDividePath;
        let toSubPathList = dividePath({
            path: toPath, count: separateCount
        });
        if (toSubPathList.length !== separateCount) {
            console.error('Invalid morphing: unmatched splitted path');
            return createEmptyReturn();
        }
        fromPathList = sortPaths(fromPathList);
        toSubPathList = sortPaths(toSubPathList);
        const oldDone = animationOpts.done;
        const oldDuring = animationOpts.during;
        const individualDelay = animationOpts.individualDelay;
        const identityTransform = new Transformable();
        for (let i = 0; i < separateCount; i++) {
            const from = fromPathList[i];
            const to = toSubPathList[i];
            to.parent = toPath;
            to.copyTransform(identityTransform);
            if (!individualDelay) {
                prepareMorphPath(from, to);
            }
        }
        toPath.__isCombineMorphing = true;
        toPath.childrenRef = function () {
            return toSubPathList;
        };
        function addToSubPathListToZr(zr) {
            for (let i = 0; i < toSubPathList.length; i++) {
                toSubPathList[i].addSelfToZr(zr);
            }
        }
        saveAndModifyMethod(toPath, 'addSelfToZr', {
            after(zr) {
                addToSubPathListToZr(zr);
            }
        });
        saveAndModifyMethod(toPath, 'removeSelfFromZr', {
            after(zr) {
                for (let i = 0; i < toSubPathList.length; i++) {
                    toSubPathList[i].removeSelfFromZr(zr);
                }
            }
        });
        function restoreToPath() {
            toPath.__isCombineMorphing = false;
            toPath.__morphT = -1;
            toPath.childrenRef = null;
            restoreMethod(toPath, 'addSelfToZr');
            restoreMethod(toPath, 'removeSelfFromZr');
        }
        const toLen = toSubPathList.length;
        if (individualDelay) {
            let animating = toLen;
            const eachDone = () => {
                animating--;
                if (animating === 0) {
                    restoreToPath();
                    oldDone && oldDone();
                }
            };
            for (let i = 0; i < toLen; i++) {
                const indivdualAnimationOpts = individualDelay ? defaults({
                    delay: (animationOpts.delay || 0) + individualDelay(i, toLen, fromPathList[i], toSubPathList[i]),
                    done: eachDone
                }, animationOpts) : animationOpts;
                morphPath(fromPathList[i], toSubPathList[i], indivdualAnimationOpts);
            }
        }
        else {
            toPath.__morphT = 0;
            toPath.animateTo({
                __morphT: 1
            }, defaults({
                during(p) {
                    for (let i = 0; i < toLen; i++) {
                        const child = toSubPathList[i];
                        child.__morphT = toPath.__morphT;
                        child.dirtyShape();
                    }
                    oldDuring && oldDuring(p);
                },
                done() {
                    restoreToPath();
                    for (let i = 0; i < fromList.length; i++) {
                        restoreMethod(fromList[i], 'updateTransform');
                    }
                    oldDone && oldDone();
                }
            }, animationOpts));
        }
        if (toPath.__zr) {
            addToSubPathListToZr(toPath.__zr);
        }
        return {
            fromIndividuals: fromPathList,
            toIndividuals: toSubPathList,
            count: toLen
        };
    }
    function separateMorph(fromPath, toPathList, animationOpts) {
        const toLen = toPathList.length;
        let fromPathList = [];
        const dividePath = animationOpts.dividePath || defaultDividePath;
        function addFromPath(fromList) {
            for (let i = 0; i < fromList.length; i++) {
                const from = fromList[i];
                if (isCombineMorphing(from)) {
                    addFromPath(from.childrenRef());
                }
                else if (from instanceof Path) {
                    fromPathList.push(from);
                }
            }
        }
        if (isCombineMorphing(fromPath)) {
            addFromPath(fromPath.childrenRef());
            const fromLen = fromPathList.length;
            if (fromLen < toLen) {
                let k = 0;
                for (let i = fromLen; i < toLen; i++) {
                    fromPathList.push(clonePath(fromPathList[k++ % fromLen]));
                }
            }
            fromPathList.length = toLen;
        }
        else {
            fromPathList = dividePath({ path: fromPath, count: toLen });
            const fromPathTransform = fromPath.getComputedTransform();
            for (let i = 0; i < fromPathList.length; i++) {
                fromPathList[i].setLocalTransform(fromPathTransform);
            }
            if (fromPathList.length !== toLen) {
                console.error('Invalid morphing: unmatched splitted path');
                return createEmptyReturn();
            }
        }
        fromPathList = sortPaths(fromPathList);
        toPathList = sortPaths(toPathList);
        const individualDelay = animationOpts.individualDelay;
        for (let i = 0; i < toLen; i++) {
            const indivdualAnimationOpts = individualDelay ? defaults({
                delay: (animationOpts.delay || 0) + individualDelay(i, toLen, fromPathList[i], toPathList[i])
            }, animationOpts) : animationOpts;
            morphPath(fromPathList[i], toPathList[i], indivdualAnimationOpts);
        }
        return {
            fromIndividuals: fromPathList,
            toIndividuals: toPathList,
            count: toPathList.length
        };
    }

    var morphPath$1 = /*#__PURE__*/Object.freeze({
        __proto__: null,
        alignBezierCurves: alignBezierCurves,
        centroid: centroid,
        isCombineMorphing: isCombineMorphing,
        isMorphing: isMorphing,
        morphPath: morphPath,
        combineMorph: combineMorph,
        separateMorph: separateMorph,
        defaultDividePath: split
    });

    class CompoundPath extends Path {
        constructor() {
            super(...arguments);
            this.type = 'compound';
        }
        _updatePathDirty() {
            const paths = this.shape.paths;
            let dirtyPath = this.shapeChanged();
            for (let i = 0; i < paths.length; i++) {
                dirtyPath = dirtyPath || paths[i].shapeChanged();
            }
            if (dirtyPath) {
                this.dirtyShape();
            }
        }
        beforeBrush() {
            this._updatePathDirty();
            const paths = this.shape.paths || [];
            const scale = this.getGlobalScale();
            for (let i = 0; i < paths.length; i++) {
                if (!paths[i].path) {
                    paths[i].createPathProxy();
                }
                paths[i].path.setScale(scale[0], scale[1], paths[i].segmentIgnoreThreshold);
            }
        }
        buildPath(ctx, shape) {
            const paths = shape.paths || [];
            for (let i = 0; i < paths.length; i++) {
                paths[i].buildPath(ctx, paths[i].shape, true);
            }
        }
        afterBrush() {
            const paths = this.shape.paths || [];
            for (let i = 0; i < paths.length; i++) {
                paths[i].pathUpdated();
            }
        }
        getBoundingRect() {
            this._updatePathDirty.call(this);
            return Path.prototype.getBoundingRect.call(this);
        }
    }

    const m = [];
    class IncrementalDisplayable extends Displayable {
        constructor() {
            super(...arguments);
            this.notClear = true;
            this.incremental = true;
            this._displayables = [];
            this._temporaryDisplayables = [];
            this._cursor = 0;
        }
        traverse(cb, context) {
            cb.call(context, this);
        }
        useStyle() {
            this.style = {};
        }
        getCursor() {
            return this._cursor;
        }
        innerAfterBrush() {
            this._cursor = this._displayables.length;
        }
        clearDisplaybles() {
            this._displayables = [];
            this._temporaryDisplayables = [];
            this._cursor = 0;
            this.markRedraw();
            this.notClear = false;
        }
        clearTemporalDisplayables() {
            this._temporaryDisplayables = [];
        }
        addDisplayable(displayable, notPersistent) {
            if (notPersistent) {
                this._temporaryDisplayables.push(displayable);
            }
            else {
                this._displayables.push(displayable);
            }
            this.markRedraw();
        }
        addDisplayables(displayables, notPersistent) {
            notPersistent = notPersistent || false;
            for (let i = 0; i < displayables.length; i++) {
                this.addDisplayable(displayables[i], notPersistent);
            }
        }
        getDisplayables() {
            return this._displayables;
        }
        getTemporalDisplayables() {
            return this._temporaryDisplayables;
        }
        eachPendingDisplayable(cb) {
            for (let i = this._cursor; i < this._displayables.length; i++) {
                cb && cb(this._displayables[i]);
            }
            for (let i = 0; i < this._temporaryDisplayables.length; i++) {
                cb && cb(this._temporaryDisplayables[i]);
            }
        }
        update() {
            this.updateTransform();
            for (let i = this._cursor; i < this._displayables.length; i++) {
                const displayable = this._displayables[i];
                displayable.parent = this;
                displayable.update();
                displayable.parent = null;
            }
            for (let i = 0; i < this._temporaryDisplayables.length; i++) {
                const displayable = this._temporaryDisplayables[i];
                displayable.parent = this;
                displayable.update();
                displayable.parent = null;
            }
        }
        getBoundingRect() {
            if (!this._rect) {
                const rect = new BoundingRect(Infinity, Infinity, -Infinity, -Infinity);
                for (let i = 0; i < this._displayables.length; i++) {
                    const displayable = this._displayables[i];
                    const childRect = displayable.getBoundingRect().clone();
                    if (displayable.needLocalTransform()) {
                        childRect.applyTransform(displayable.getLocalTransform(m));
                    }
                    rect.union(childRect);
                }
                this._rect = rect;
            }
            return this._rect;
        }
        contain(x, y) {
            const localPos = this.transformCoordToLocal(x, y);
            const rect = this.getBoundingRect();
            if (rect.contain(localPos[0], localPos[1])) {
                for (let i = 0; i < this._displayables.length; i++) {
                    const displayable = this._displayables[i];
                    if (displayable.contain(x, y)) {
                        return true;
                    }
                }
            }
            return false;
        }
    }

    const globalImageCache = new LRU(50);
    function findExistImage(newImageOrSrc) {
        if (typeof newImageOrSrc === 'string') {
            const cachedImgObj = globalImageCache.get(newImageOrSrc);
            return cachedImgObj && cachedImgObj.image;
        }
        else {
            return newImageOrSrc;
        }
    }
    function createOrUpdateImage(newImageOrSrc, image, hostEl, onload, cbPayload) {
        if (!newImageOrSrc) {
            return image;
        }
        else if (typeof newImageOrSrc === 'string') {
            if ((image && image.__zrImageSrc === newImageOrSrc) || !hostEl) {
                return image;
            }
            const cachedImgObj = globalImageCache.get(newImageOrSrc);
            const pendingWrap = { hostEl: hostEl, cb: onload, cbPayload: cbPayload };
            if (cachedImgObj) {
                image = cachedImgObj.image;
                !isImageReady(image) && cachedImgObj.pending.push(pendingWrap);
            }
            else {
                image = platformApi.loadImage(newImageOrSrc, imageOnLoad, imageOnLoad);
                image.__zrImageSrc = newImageOrSrc;
                globalImageCache.put(newImageOrSrc, image.__cachedImgObj = {
                    image: image,
                    pending: [pendingWrap]
                });
            }
            return image;
        }
        else {
            return newImageOrSrc;
        }
    }
    function imageOnLoad() {
        const cachedImgObj = this.__cachedImgObj;
        this.onload = this.onerror = this.__cachedImgObj = null;
        for (let i = 0; i < cachedImgObj.pending.length; i++) {
            const pendingWrap = cachedImgObj.pending[i];
            const cb = pendingWrap.cb;
            cb && cb(this, pendingWrap.cbPayload);
            pendingWrap.hostEl.dirty();
        }
        cachedImgObj.pending.length = 0;
    }
    function isImageReady(image) {
        return image && image.width && image.height;
    }

    const STYLE_REG = /\{([a-zA-Z0-9_]+)\|([^}]*)\}/g;
    function truncateText(text, containerWidth, font, ellipsis, options) {
        if (!containerWidth) {
            return '';
        }
        const textLines = (text + '').split('\n');
        options = prepareTruncateOptions(containerWidth, font, ellipsis, options);
        for (let i = 0, len = textLines.length; i < len; i++) {
            textLines[i] = truncateSingleLine(textLines[i], options);
        }
        return textLines.join('\n');
    }
    function prepareTruncateOptions(containerWidth, font, ellipsis, options) {
        options = options || {};
        let preparedOpts = extend({}, options);
        preparedOpts.font = font;
        ellipsis = retrieve2(ellipsis, '...');
        preparedOpts.maxIterations = retrieve2(options.maxIterations, 2);
        const minChar = preparedOpts.minChar = retrieve2(options.minChar, 0);
        preparedOpts.cnCharWidth = getWidth('国', font);
        const ascCharWidth = preparedOpts.ascCharWidth = getWidth('a', font);
        preparedOpts.placeholder = retrieve2(options.placeholder, '');
        let contentWidth = containerWidth = Math.max(0, containerWidth - 1);
        for (let i = 0; i < minChar && contentWidth >= ascCharWidth; i++) {
            contentWidth -= ascCharWidth;
        }
        let ellipsisWidth = getWidth(ellipsis, font);
        if (ellipsisWidth > contentWidth) {
            ellipsis = '';
            ellipsisWidth = 0;
        }
        contentWidth = containerWidth - ellipsisWidth;
        preparedOpts.ellipsis = ellipsis;
        preparedOpts.ellipsisWidth = ellipsisWidth;
        preparedOpts.contentWidth = contentWidth;
        preparedOpts.containerWidth = containerWidth;
        return preparedOpts;
    }
    function truncateSingleLine(textLine, options) {
        const containerWidth = options.containerWidth;
        const font = options.font;
        const contentWidth = options.contentWidth;
        if (!containerWidth) {
            return '';
        }
        let lineWidth = getWidth(textLine, font);
        if (lineWidth <= containerWidth) {
            return textLine;
        }
        for (let j = 0;; j++) {
            if (lineWidth <= contentWidth || j >= options.maxIterations) {
                textLine += options.ellipsis;
                break;
            }
            const subLength = j === 0
                ? estimateLength(textLine, contentWidth, options.ascCharWidth, options.cnCharWidth)
                : lineWidth > 0
                    ? Math.floor(textLine.length * contentWidth / lineWidth)
                    : 0;
            textLine = textLine.substr(0, subLength);
            lineWidth = getWidth(textLine, font);
        }
        if (textLine === '') {
            textLine = options.placeholder;
        }
        return textLine;
    }
    function estimateLength(text, contentWidth, ascCharWidth, cnCharWidth) {
        let width = 0;
        let i = 0;
        for (let len = text.length; i < len && width < contentWidth; i++) {
            const charCode = text.charCodeAt(i);
            width += (0 <= charCode && charCode <= 127) ? ascCharWidth : cnCharWidth;
        }
        return i;
    }
    function parsePlainText(text, style) {
        text != null && (text += '');
        const overflow = style.overflow;
        const padding = style.padding;
        const font = style.font;
        const truncate = overflow === 'truncate';
        const calculatedLineHeight = getLineHeight(font);
        const lineHeight = retrieve2(style.lineHeight, calculatedLineHeight);
        const bgColorDrawn = !!(style.backgroundColor);
        const truncateLineOverflow = style.lineOverflow === 'truncate';
        let width = style.width;
        let lines;
        if (width != null && (overflow === 'break' || overflow === 'breakAll')) {
            lines = text ? wrapText(text, style.font, width, overflow === 'breakAll', 0).lines : [];
        }
        else {
            lines = text ? text.split('\n') : [];
        }
        const contentHeight = lines.length * lineHeight;
        const height = retrieve2(style.height, contentHeight);
        if (contentHeight > height && truncateLineOverflow) {
            const lineCount = Math.floor(height / lineHeight);
            lines = lines.slice(0, lineCount);
        }
        if (text && truncate && width != null) {
            const options = prepareTruncateOptions(width, font, style.ellipsis, {
                minChar: style.truncateMinChar,
                placeholder: style.placeholder
            });
            for (let i = 0; i < lines.length; i++) {
                lines[i] = truncateSingleLine(lines[i], options);
            }
        }
        let outerHeight = height;
        let contentWidth = 0;
        for (let i = 0; i < lines.length; i++) {
            contentWidth = Math.max(getWidth(lines[i], font), contentWidth);
        }
        if (width == null) {
            width = contentWidth;
        }
        let outerWidth = contentWidth;
        if (padding) {
            outerHeight += padding[0] + padding[2];
            outerWidth += padding[1] + padding[3];
            width += padding[1] + padding[3];
        }
        if (bgColorDrawn) {
            outerWidth = width;
        }
        return {
            lines: lines,
            height: height,
            outerWidth: outerWidth,
            outerHeight: outerHeight,
            lineHeight: lineHeight,
            calculatedLineHeight: calculatedLineHeight,
            contentWidth: contentWidth,
            contentHeight: contentHeight,
            width: width
        };
    }
    class RichTextToken {
    }
    class RichTextLine {
        constructor(tokens) {
            this.tokens = [];
            if (tokens) {
                this.tokens = tokens;
            }
        }
    }
    class RichTextContentBlock {
        constructor() {
            this.width = 0;
            this.height = 0;
            this.contentWidth = 0;
            this.contentHeight = 0;
            this.outerWidth = 0;
            this.outerHeight = 0;
            this.lines = [];
        }
    }
    function parseRichText(text, style) {
        const contentBlock = new RichTextContentBlock();
        text != null && (text += '');
        if (!text) {
            return contentBlock;
        }
        const topWidth = style.width;
        const topHeight = style.height;
        const overflow = style.overflow;
        let wrapInfo = (overflow === 'break' || overflow === 'breakAll') && topWidth != null
            ? { width: topWidth, accumWidth: 0, breakAll: overflow === 'breakAll' }
            : null;
        let lastIndex = STYLE_REG.lastIndex = 0;
        let result;
        while ((result = STYLE_REG.exec(text)) != null) {
            const matchedIndex = result.index;
            if (matchedIndex > lastIndex) {
                pushTokens(contentBlock, text.substring(lastIndex, matchedIndex), style, wrapInfo);
            }
            pushTokens(contentBlock, result[2], style, wrapInfo, result[1]);
            lastIndex = STYLE_REG.lastIndex;
        }
        if (lastIndex < text.length) {
            pushTokens(contentBlock, text.substring(lastIndex, text.length), style, wrapInfo);
        }
        let pendingList = [];
        let calculatedHeight = 0;
        let calculatedWidth = 0;
        const stlPadding = style.padding;
        const truncate = overflow === 'truncate';
        const truncateLine = style.lineOverflow === 'truncate';
        function finishLine(line, lineWidth, lineHeight) {
            line.width = lineWidth;
            line.lineHeight = lineHeight;
            calculatedHeight += lineHeight;
            calculatedWidth = Math.max(calculatedWidth, lineWidth);
        }
        outer: for (let i = 0; i < contentBlock.lines.length; i++) {
            const line = contentBlock.lines[i];
            let lineHeight = 0;
            let lineWidth = 0;
            for (let j = 0; j < line.tokens.length; j++) {
                const token = line.tokens[j];
                const tokenStyle = token.styleName && style.rich[token.styleName] || {};
                const textPadding = token.textPadding = tokenStyle.padding;
                const paddingH = textPadding ? textPadding[1] + textPadding[3] : 0;
                const font = token.font = tokenStyle.font || style.font;
                token.contentHeight = getLineHeight(font);
                let tokenHeight = retrieve2(tokenStyle.height, token.contentHeight);
                token.innerHeight = tokenHeight;
                textPadding && (tokenHeight += textPadding[0] + textPadding[2]);
                token.height = tokenHeight;
                token.lineHeight = retrieve3(tokenStyle.lineHeight, style.lineHeight, tokenHeight);
                token.align = tokenStyle && tokenStyle.align || style.align;
                token.verticalAlign = tokenStyle && tokenStyle.verticalAlign || 'middle';
                if (truncateLine && topHeight != null && calculatedHeight + token.lineHeight > topHeight) {
                    if (j > 0) {
                        line.tokens = line.tokens.slice(0, j);
                        finishLine(line, lineWidth, lineHeight);
                        contentBlock.lines = contentBlock.lines.slice(0, i + 1);
                    }
                    else {
                        contentBlock.lines = contentBlock.lines.slice(0, i);
                    }
                    break outer;
                }
                let styleTokenWidth = tokenStyle.width;
                let tokenWidthNotSpecified = styleTokenWidth == null || styleTokenWidth === 'auto';
                if (typeof styleTokenWidth === 'string' && styleTokenWidth.charAt(styleTokenWidth.length - 1) === '%') {
                    token.percentWidth = styleTokenWidth;
                    pendingList.push(token);
                    token.contentWidth = getWidth(token.text, font);
                }
                else {
                    if (tokenWidthNotSpecified) {
                        const textBackgroundColor = tokenStyle.backgroundColor;
                        let bgImg = textBackgroundColor && textBackgroundColor.image;
                        if (bgImg) {
                            bgImg = findExistImage(bgImg);
                            if (isImageReady(bgImg)) {
                                token.width = Math.max(token.width, bgImg.width * tokenHeight / bgImg.height);
                            }
                        }
                    }
                    const remainTruncWidth = truncate && topWidth != null
                        ? topWidth - lineWidth : null;
                    if (remainTruncWidth != null && remainTruncWidth < token.width) {
                        if (!tokenWidthNotSpecified || remainTruncWidth < paddingH) {
                            token.text = '';
                            token.width = token.contentWidth = 0;
                        }
                        else {
                            token.text = truncateText(token.text, remainTruncWidth - paddingH, font, style.ellipsis, { minChar: style.truncateMinChar });
                            token.width = token.contentWidth = getWidth(token.text, font);
                        }
                    }
                    else {
                        token.contentWidth = getWidth(token.text, font);
                    }
                }
                token.width += paddingH;
                lineWidth += token.width;
                tokenStyle && (lineHeight = Math.max(lineHeight, token.lineHeight));
            }
            finishLine(line, lineWidth, lineHeight);
        }
        contentBlock.outerWidth = contentBlock.width = retrieve2(topWidth, calculatedWidth);
        contentBlock.outerHeight = contentBlock.height = retrieve2(topHeight, calculatedHeight);
        contentBlock.contentHeight = calculatedHeight;
        contentBlock.contentWidth = calculatedWidth;
        if (stlPadding) {
            contentBlock.outerWidth += stlPadding[1] + stlPadding[3];
            contentBlock.outerHeight += stlPadding[0] + stlPadding[2];
        }
        for (let i = 0; i < pendingList.length; i++) {
            const token = pendingList[i];
            const percentWidth = token.percentWidth;
            token.width = parseInt(percentWidth, 10) / 100 * contentBlock.width;
        }
        return contentBlock;
    }
    function pushTokens(block, str, style, wrapInfo, styleName) {
        const isEmptyStr = str === '';
        const tokenStyle = styleName && style.rich[styleName] || {};
        const lines = block.lines;
        const font = tokenStyle.font || style.font;
        let newLine = false;
        let strLines;
        let linesWidths;
        if (wrapInfo) {
            const tokenPadding = tokenStyle.padding;
            let tokenPaddingH = tokenPadding ? tokenPadding[1] + tokenPadding[3] : 0;
            if (tokenStyle.width != null && tokenStyle.width !== 'auto') {
                const outerWidth = parsePercent(tokenStyle.width, wrapInfo.width) + tokenPaddingH;
                if (lines.length > 0) {
                    if (outerWidth + wrapInfo.accumWidth > wrapInfo.width) {
                        strLines = str.split('\n');
                        newLine = true;
                    }
                }
                wrapInfo.accumWidth = outerWidth;
            }
            else {
                const res = wrapText(str, font, wrapInfo.width, wrapInfo.breakAll, wrapInfo.accumWidth);
                wrapInfo.accumWidth = res.accumWidth + tokenPaddingH;
                linesWidths = res.linesWidths;
                strLines = res.lines;
            }
        }
        else {
            strLines = str.split('\n');
        }
        for (let i = 0; i < strLines.length; i++) {
            const text = strLines[i];
            const token = new RichTextToken();
            token.styleName = styleName;
            token.text = text;
            token.isLineHolder = !text && !isEmptyStr;
            if (typeof tokenStyle.width === 'number') {
                token.width = tokenStyle.width;
            }
            else {
                token.width = linesWidths
                    ? linesWidths[i]
                    : getWidth(text, font);
            }
            if (!i && !newLine) {
                const tokens = (lines[lines.length - 1] || (lines[0] = new RichTextLine())).tokens;
                const tokensLen = tokens.length;
                (tokensLen === 1 && tokens[0].isLineHolder)
                    ? (tokens[0] = token)
                    : ((text || !tokensLen || isEmptyStr) && tokens.push(token));
            }
            else {
                lines.push(new RichTextLine([token]));
            }
        }
    }
    function isAlphabeticLetter(ch) {
        let code = ch.charCodeAt(0);
        return code >= 0x20 && code <= 0x24F
            || code >= 0x370 && code <= 0x10FF
            || code >= 0x1200 && code <= 0x13FF
            || code >= 0x1E00 && code <= 0x206F;
    }
    const breakCharMap = reduce(',&?/;] '.split(''), function (obj, ch) {
        obj[ch] = true;
        return obj;
    }, {});
    function isWordBreakChar(ch) {
        if (isAlphabeticLetter(ch)) {
            if (breakCharMap[ch]) {
                return true;
            }
            return false;
        }
        return true;
    }
    function wrapText(text, font, lineWidth, isBreakAll, lastAccumWidth) {
        let lines = [];
        let linesWidths = [];
        let line = '';
        let currentWord = '';
        let currentWordWidth = 0;
        let accumWidth = 0;
        for (let i = 0; i < text.length; i++) {
            const ch = text.charAt(i);
            if (ch === '\n') {
                if (currentWord) {
                    line += currentWord;
                    accumWidth += currentWordWidth;
                }
                lines.push(line);
                linesWidths.push(accumWidth);
                line = '';
                currentWord = '';
                currentWordWidth = 0;
                accumWidth = 0;
                continue;
            }
            const chWidth = getWidth(ch, font);
            const inWord = isBreakAll ? false : !isWordBreakChar(ch);
            if (!lines.length
                ? lastAccumWidth + accumWidth + chWidth > lineWidth
                : accumWidth + chWidth > lineWidth) {
                if (!accumWidth) {
                    if (inWord) {
                        lines.push(currentWord);
                        linesWidths.push(currentWordWidth);
                        currentWord = ch;
                        currentWordWidth = chWidth;
                    }
                    else {
                        lines.push(ch);
                        linesWidths.push(chWidth);
                    }
                }
                else if (line || currentWord) {
                    if (inWord) {
                        if (!line) {
                            line = currentWord;
                            currentWord = '';
                            currentWordWidth = 0;
                            accumWidth = currentWordWidth;
                        }
                        lines.push(line);
                        linesWidths.push(accumWidth - currentWordWidth);
                        currentWord += ch;
                        currentWordWidth += chWidth;
                        line = '';
                        accumWidth = currentWordWidth;
                    }
                    else {
                        if (currentWord) {
                            line += currentWord;
                            currentWord = '';
                            currentWordWidth = 0;
                        }
                        lines.push(line);
                        linesWidths.push(accumWidth);
                        line = ch;
                        accumWidth = chWidth;
                    }
                }
                continue;
            }
            accumWidth += chWidth;
            if (inWord) {
                currentWord += ch;
                currentWordWidth += chWidth;
            }
            else {
                if (currentWord) {
                    line += currentWord;
                    currentWord = '';
                    currentWordWidth = 0;
                }
                line += ch;
            }
        }
        if (!lines.length && !line) {
            line = text;
            currentWord = '';
            currentWordWidth = 0;
        }
        if (currentWord) {
            line += currentWord;
        }
        if (line) {
            lines.push(line);
            linesWidths.push(accumWidth);
        }
        if (lines.length === 1) {
            accumWidth += lastAccumWidth;
        }
        return {
            accumWidth,
            lines: lines,
            linesWidths
        };
    }

    const DEFAULT_RICH_TEXT_COLOR = {
        fill: '#000'
    };
    const DEFAULT_STROKE_LINE_WIDTH = 2;
    const DEFAULT_TEXT_ANIMATION_PROPS = {
        style: defaults({
            fill: true,
            stroke: true,
            fillOpacity: true,
            strokeOpacity: true,
            lineWidth: true,
            fontSize: true,
            lineHeight: true,
            width: true,
            height: true,
            textShadowColor: true,
            textShadowBlur: true,
            textShadowOffsetX: true,
            textShadowOffsetY: true,
            backgroundColor: true,
            padding: true,
            borderColor: true,
            borderWidth: true,
            borderRadius: true
        }, DEFAULT_COMMON_ANIMATION_PROPS.style)
    };
    class ZRText extends Displayable {
        constructor(opts) {
            super();
            this.type = 'text';
            this._children = [];
            this._defaultStyle = DEFAULT_RICH_TEXT_COLOR;
            this.attr(opts);
        }
        childrenRef() {
            return this._children;
        }
        update() {
            super.update();
            if (this.styleChanged()) {
                this._updateSubTexts();
            }
            for (let i = 0; i < this._children.length; i++) {
                const child = this._children[i];
                child.zlevel = this.zlevel;
                child.z = this.z;
                child.z2 = this.z2;
                child.culling = this.culling;
                child.cursor = this.cursor;
                child.invisible = this.invisible;
            }
        }
        updateTransform() {
            const innerTransformable = this.innerTransformable;
            if (innerTransformable) {
                innerTransformable.updateTransform();
                if (innerTransformable.transform) {
                    this.transform = innerTransformable.transform;
                }
            }
            else {
                super.updateTransform();
            }
        }
        getLocalTransform(m) {
            const innerTransformable = this.innerTransformable;
            return innerTransformable
                ? innerTransformable.getLocalTransform(m)
                : super.getLocalTransform(m);
        }
        getComputedTransform() {
            if (this.__hostTarget) {
                this.__hostTarget.getComputedTransform();
                this.__hostTarget.updateInnerText(true);
            }
            return super.getComputedTransform();
        }
        _updateSubTexts() {
            this._childCursor = 0;
            normalizeTextStyle(this.style);
            this.style.rich
                ? this._updateRichTexts()
                : this._updatePlainTexts();
            this._children.length = this._childCursor;
            this.styleUpdated();
        }
        addSelfToZr(zr) {
            super.addSelfToZr(zr);
            for (let i = 0; i < this._children.length; i++) {
                this._children[i].__zr = zr;
            }
        }
        removeSelfFromZr(zr) {
            super.removeSelfFromZr(zr);
            for (let i = 0; i < this._children.length; i++) {
                this._children[i].__zr = null;
            }
        }
        getBoundingRect() {
            if (this.styleChanged()) {
                this._updateSubTexts();
            }
            if (!this._rect) {
                const tmpRect = new BoundingRect(0, 0, 0, 0);
                const children = this._children;
                const tmpMat = [];
                let rect = null;
                for (let i = 0; i < children.length; i++) {
                    const child = children[i];
                    const childRect = child.getBoundingRect();
                    const transform = child.getLocalTransform(tmpMat);
                    if (transform) {
                        tmpRect.copy(childRect);
                        tmpRect.applyTransform(transform);
                        rect = rect || tmpRect.clone();
                        rect.union(tmpRect);
                    }
                    else {
                        rect = rect || childRect.clone();
                        rect.union(childRect);
                    }
                }
                this._rect = rect || tmpRect;
            }
            return this._rect;
        }
        setDefaultTextStyle(defaultTextStyle) {
            this._defaultStyle = defaultTextStyle || DEFAULT_RICH_TEXT_COLOR;
        }
        setTextContent(textContent) {
            {
                throw new Error('Can\'t attach text on another text');
            }
        }
        _mergeStyle(targetStyle, sourceStyle) {
            if (!sourceStyle) {
                return targetStyle;
            }
            const sourceRich = sourceStyle.rich;
            const targetRich = targetStyle.rich || (sourceRich && {});
            extend(targetStyle, sourceStyle);
            if (sourceRich && targetRich) {
                this._mergeRich(targetRich, sourceRich);
                targetStyle.rich = targetRich;
            }
            else if (targetRich) {
                targetStyle.rich = targetRich;
            }
            return targetStyle;
        }
        _mergeRich(targetRich, sourceRich) {
            const richNames = keys(sourceRich);
            for (let i = 0; i < richNames.length; i++) {
                const richName = richNames[i];
                targetRich[richName] = targetRich[richName] || {};
                extend(targetRich[richName], sourceRich[richName]);
            }
        }
        getAnimationStyleProps() {
            return DEFAULT_TEXT_ANIMATION_PROPS;
        }
        _getOrCreateChild(Ctor) {
            let child = this._children[this._childCursor];
            if (!child || !(child instanceof Ctor)) {
                child = new Ctor();
            }
            this._children[this._childCursor++] = child;
            child.__zr = this.__zr;
            child.parent = this;
            return child;
        }
        _updatePlainTexts() {
            const style = this.style;
            const textFont = style.font || DEFAULT_FONT;
            const textPadding = style.padding;
            const text = getStyleText(style);
            const contentBlock = parsePlainText(text, style);
            const needDrawBg = needDrawBackground(style);
            const bgColorDrawn = !!(style.backgroundColor);
            const outerHeight = contentBlock.outerHeight;
            const outerWidth = contentBlock.outerWidth;
            const contentWidth = contentBlock.contentWidth;
            const textLines = contentBlock.lines;
            const lineHeight = contentBlock.lineHeight;
            const defaultStyle = this._defaultStyle;
            const baseX = style.x || 0;
            const baseY = style.y || 0;
            const textAlign = style.align || defaultStyle.align || 'left';
            const verticalAlign = style.verticalAlign || defaultStyle.verticalAlign || 'top';
            let textX = baseX;
            let textY = adjustTextY$1(baseY, contentBlock.contentHeight, verticalAlign);
            if (needDrawBg || textPadding) {
                const boxX = adjustTextX(baseX, outerWidth, textAlign);
                const boxY = adjustTextY$1(baseY, outerHeight, verticalAlign);
                needDrawBg && this._renderBackground(style, style, boxX, boxY, outerWidth, outerHeight);
            }
            textY += lineHeight / 2;
            if (textPadding) {
                textX = getTextXForPadding(baseX, textAlign, textPadding);
                if (verticalAlign === 'top') {
                    textY += textPadding[0];
                }
                else if (verticalAlign === 'bottom') {
                    textY -= textPadding[2];
                }
            }
            let defaultLineWidth = 0;
            let useDefaultFill = false;
            const textFill = getFill('fill' in style
                ? style.fill
                : (useDefaultFill = true, defaultStyle.fill));
            const textStroke = getStroke('stroke' in style
                ? style.stroke
                : (!bgColorDrawn
                    && (!defaultStyle.autoStroke || useDefaultFill))
                    ? (defaultLineWidth = DEFAULT_STROKE_LINE_WIDTH, defaultStyle.stroke)
                    : null);
            const hasShadow = style.textShadowBlur > 0;
            const fixedBoundingRect = style.width != null
                && (style.overflow === 'truncate' || style.overflow === 'break' || style.overflow === 'breakAll');
            const calculatedLineHeight = contentBlock.calculatedLineHeight;
            for (let i = 0; i < textLines.length; i++) {
                const el = this._getOrCreateChild(TSpan);
                const subElStyle = el.createStyle();
                el.useStyle(subElStyle);
                subElStyle.text = textLines[i];
                subElStyle.x = textX;
                subElStyle.y = textY;
                if (textAlign) {
                    subElStyle.textAlign = textAlign;
                }
                subElStyle.textBaseline = 'middle';
                subElStyle.opacity = style.opacity;
                subElStyle.strokeFirst = true;
                if (hasShadow) {
                    subElStyle.shadowBlur = style.textShadowBlur || 0;
                    subElStyle.shadowColor = style.textShadowColor || 'transparent';
                    subElStyle.shadowOffsetX = style.textShadowOffsetX || 0;
                    subElStyle.shadowOffsetY = style.textShadowOffsetY || 0;
                }
                subElStyle.stroke = textStroke;
                subElStyle.fill = textFill;
                if (textStroke) {
                    subElStyle.lineWidth = style.lineWidth || defaultLineWidth;
                    subElStyle.lineDash = style.lineDash;
                    subElStyle.lineDashOffset = style.lineDashOffset || 0;
                }
                subElStyle.font = textFont;
                setSeparateFont(subElStyle, style);
                textY += lineHeight;
                if (fixedBoundingRect) {
                    el.setBoundingRect(new BoundingRect(adjustTextX(subElStyle.x, style.width, subElStyle.textAlign), adjustTextY$1(subElStyle.y, calculatedLineHeight, subElStyle.textBaseline), contentWidth, calculatedLineHeight));
                }
            }
        }
        _updateRichTexts() {
            const style = this.style;
            const text = getStyleText(style);
            const contentBlock = parseRichText(text, style);
            const contentWidth = contentBlock.width;
            const outerWidth = contentBlock.outerWidth;
            const outerHeight = contentBlock.outerHeight;
            const textPadding = style.padding;
            const baseX = style.x || 0;
            const baseY = style.y || 0;
            const defaultStyle = this._defaultStyle;
            const textAlign = style.align || defaultStyle.align;
            const verticalAlign = style.verticalAlign || defaultStyle.verticalAlign;
            const boxX = adjustTextX(baseX, outerWidth, textAlign);
            const boxY = adjustTextY$1(baseY, outerHeight, verticalAlign);
            let xLeft = boxX;
            let lineTop = boxY;
            if (textPadding) {
                xLeft += textPadding[3];
                lineTop += textPadding[0];
            }
            let xRight = xLeft + contentWidth;
            if (needDrawBackground(style)) {
                this._renderBackground(style, style, boxX, boxY, outerWidth, outerHeight);
            }
            const bgColorDrawn = !!(style.backgroundColor);
            for (let i = 0; i < contentBlock.lines.length; i++) {
                const line = contentBlock.lines[i];
                const tokens = line.tokens;
                const tokenCount = tokens.length;
                const lineHeight = line.lineHeight;
                let remainedWidth = line.width;
                let leftIndex = 0;
                let lineXLeft = xLeft;
                let lineXRight = xRight;
                let rightIndex = tokenCount - 1;
                let token;
                while (leftIndex < tokenCount
                    && (token = tokens[leftIndex], !token.align || token.align === 'left')) {
                    this._placeToken(token, style, lineHeight, lineTop, lineXLeft, 'left', bgColorDrawn);
                    remainedWidth -= token.width;
                    lineXLeft += token.width;
                    leftIndex++;
                }
                while (rightIndex >= 0
                    && (token = tokens[rightIndex], token.align === 'right')) {
                    this._placeToken(token, style, lineHeight, lineTop, lineXRight, 'right', bgColorDrawn);
                    remainedWidth -= token.width;
                    lineXRight -= token.width;
                    rightIndex--;
                }
                lineXLeft += (contentWidth - (lineXLeft - xLeft) - (xRight - lineXRight) - remainedWidth) / 2;
                while (leftIndex <= rightIndex) {
                    token = tokens[leftIndex];
                    this._placeToken(token, style, lineHeight, lineTop, lineXLeft + token.width / 2, 'center', bgColorDrawn);
                    lineXLeft += token.width;
                    leftIndex++;
                }
                lineTop += lineHeight;
            }
        }
        _placeToken(token, style, lineHeight, lineTop, x, textAlign, parentBgColorDrawn) {
            const tokenStyle = style.rich[token.styleName] || {};
            tokenStyle.text = token.text;
            const verticalAlign = token.verticalAlign;
            let y = lineTop + lineHeight / 2;
            if (verticalAlign === 'top') {
                y = lineTop + token.height / 2;
            }
            else if (verticalAlign === 'bottom') {
                y = lineTop + lineHeight - token.height / 2;
            }
            const needDrawBg = !token.isLineHolder && needDrawBackground(tokenStyle);
            needDrawBg && this._renderBackground(tokenStyle, style, textAlign === 'right'
                ? x - token.width
                : textAlign === 'center'
                    ? x - token.width / 2
                    : x, y - token.height / 2, token.width, token.height);
            const bgColorDrawn = !!tokenStyle.backgroundColor;
            const textPadding = token.textPadding;
            if (textPadding) {
                x = getTextXForPadding(x, textAlign, textPadding);
                y -= token.height / 2 - textPadding[0] - token.innerHeight / 2;
            }
            const el = this._getOrCreateChild(TSpan);
            const subElStyle = el.createStyle();
            el.useStyle(subElStyle);
            const defaultStyle = this._defaultStyle;
            let useDefaultFill = false;
            let defaultLineWidth = 0;
            const textFill = getFill('fill' in tokenStyle ? tokenStyle.fill
                : 'fill' in style ? style.fill
                    : (useDefaultFill = true, defaultStyle.fill));
            const textStroke = getStroke('stroke' in tokenStyle ? tokenStyle.stroke
                : 'stroke' in style ? style.stroke
                    : (!bgColorDrawn
                        && !parentBgColorDrawn
                        && (!defaultStyle.autoStroke || useDefaultFill)) ? (defaultLineWidth = DEFAULT_STROKE_LINE_WIDTH, defaultStyle.stroke)
                        : null);
            const hasShadow = tokenStyle.textShadowBlur > 0
                || style.textShadowBlur > 0;
            subElStyle.text = token.text;
            subElStyle.x = x;
            subElStyle.y = y;
            if (hasShadow) {
                subElStyle.shadowBlur = tokenStyle.textShadowBlur || style.textShadowBlur || 0;
                subElStyle.shadowColor = tokenStyle.textShadowColor || style.textShadowColor || 'transparent';
                subElStyle.shadowOffsetX = tokenStyle.textShadowOffsetX || style.textShadowOffsetX || 0;
                subElStyle.shadowOffsetY = tokenStyle.textShadowOffsetY || style.textShadowOffsetY || 0;
            }
            subElStyle.textAlign = textAlign;
            subElStyle.textBaseline = 'middle';
            subElStyle.font = token.font || DEFAULT_FONT;
            subElStyle.opacity = retrieve3(tokenStyle.opacity, style.opacity, 1);
            setSeparateFont(subElStyle, tokenStyle);
            if (textStroke) {
                subElStyle.lineWidth = retrieve3(tokenStyle.lineWidth, style.lineWidth, defaultLineWidth);
                subElStyle.lineDash = retrieve2(tokenStyle.lineDash, style.lineDash);
                subElStyle.lineDashOffset = style.lineDashOffset || 0;
                subElStyle.stroke = textStroke;
            }
            if (textFill) {
                subElStyle.fill = textFill;
            }
            const textWidth = token.contentWidth;
            const textHeight = token.contentHeight;
            el.setBoundingRect(new BoundingRect(adjustTextX(subElStyle.x, textWidth, subElStyle.textAlign), adjustTextY$1(subElStyle.y, textHeight, subElStyle.textBaseline), textWidth, textHeight));
        }
        _renderBackground(style, topStyle, x, y, width, height) {
            const textBackgroundColor = style.backgroundColor;
            const textBorderWidth = style.borderWidth;
            const textBorderColor = style.borderColor;
            const isImageBg = textBackgroundColor && textBackgroundColor.image;
            const isPlainOrGradientBg = textBackgroundColor && !isImageBg;
            const textBorderRadius = style.borderRadius;
            const self = this;
            let rectEl;
            let imgEl;
            if (isPlainOrGradientBg || style.lineHeight || (textBorderWidth && textBorderColor)) {
                rectEl = this._getOrCreateChild(Rect);
                rectEl.useStyle(rectEl.createStyle());
                rectEl.style.fill = null;
                const rectShape = rectEl.shape;
                rectShape.x = x;
                rectShape.y = y;
                rectShape.width = width;
                rectShape.height = height;
                rectShape.r = textBorderRadius;
                rectEl.dirtyShape();
            }
            if (isPlainOrGradientBg) {
                const rectStyle = rectEl.style;
                rectStyle.fill = textBackgroundColor || null;
                rectStyle.fillOpacity = retrieve2(style.fillOpacity, 1);
            }
            else if (isImageBg) {
                imgEl = this._getOrCreateChild(ZRImage);
                imgEl.onload = function () {
                    self.dirtyStyle();
                };
                const imgStyle = imgEl.style;
                imgStyle.image = textBackgroundColor.image;
                imgStyle.x = x;
                imgStyle.y = y;
                imgStyle.width = width;
                imgStyle.height = height;
            }
            if (textBorderWidth && textBorderColor) {
                const rectStyle = rectEl.style;
                rectStyle.lineWidth = textBorderWidth;
                rectStyle.stroke = textBorderColor;
                rectStyle.strokeOpacity = retrieve2(style.strokeOpacity, 1);
                rectStyle.lineDash = style.borderDash;
                rectStyle.lineDashOffset = style.borderDashOffset || 0;
                rectEl.strokeContainThreshold = 0;
                if (rectEl.hasFill() && rectEl.hasStroke()) {
                    rectStyle.strokeFirst = true;
                    rectStyle.lineWidth *= 2;
                }
            }
            const commonStyle = (rectEl || imgEl).style;
            commonStyle.shadowBlur = style.shadowBlur || 0;
            commonStyle.shadowColor = style.shadowColor || 'transparent';
            commonStyle.shadowOffsetX = style.shadowOffsetX || 0;
            commonStyle.shadowOffsetY = style.shadowOffsetY || 0;
            commonStyle.opacity = retrieve3(style.opacity, topStyle.opacity, 1);
        }
        static makeFont(style) {
            let font = '';
            if (hasSeparateFont(style)) {
                font = [
                    style.fontStyle,
                    style.fontWeight,
                    parseFontSize(style.fontSize),
                    style.fontFamily || 'sans-serif'
                ].join(' ');
            }
            return font && trim(font) || style.textFont || style.font;
        }
    }
    const VALID_TEXT_ALIGN = { left: true, right: 1, center: 1 };
    const VALID_TEXT_VERTICAL_ALIGN = { top: 1, bottom: 1, middle: 1 };
    const FONT_PARTS = ['fontStyle', 'fontWeight', 'fontSize', 'fontFamily'];
    function parseFontSize(fontSize) {
        if (typeof fontSize === 'string'
            && (fontSize.indexOf('px') !== -1
                || fontSize.indexOf('rem') !== -1
                || fontSize.indexOf('em') !== -1)) {
            return fontSize;
        }
        else if (!isNaN(+fontSize)) {
            return fontSize + 'px';
        }
        else {
            return DEFAULT_FONT_SIZE + 'px';
        }
    }
    function setSeparateFont(targetStyle, sourceStyle) {
        for (let i = 0; i < FONT_PARTS.length; i++) {
            const fontProp = FONT_PARTS[i];
            const val = sourceStyle[fontProp];
            if (val != null) {
                targetStyle[fontProp] = val;
            }
        }
    }
    function hasSeparateFont(style) {
        return style.fontSize != null || style.fontFamily || style.fontWeight;
    }
    function normalizeTextStyle(style) {
        normalizeStyle(style);
        each(style.rich, normalizeStyle);
        return style;
    }
    function normalizeStyle(style) {
        if (style) {
            style.font = ZRText.makeFont(style);
            let textAlign = style.align;
            textAlign === 'middle' && (textAlign = 'center');
            style.align = (textAlign == null || VALID_TEXT_ALIGN[textAlign]) ? textAlign : 'left';
            let verticalAlign = style.verticalAlign;
            verticalAlign === 'center' && (verticalAlign = 'middle');
            style.verticalAlign = (verticalAlign == null || VALID_TEXT_VERTICAL_ALIGN[verticalAlign]) ? verticalAlign : 'top';
            const textPadding = style.padding;
            if (textPadding) {
                style.padding = normalizeCssArray(style.padding);
            }
        }
    }
    function getStroke(stroke, lineWidth) {
        return (stroke == null || lineWidth <= 0 || stroke === 'transparent' || stroke === 'none')
            ? null
            : (stroke.image || stroke.colorStops)
                ? '#000'
                : stroke;
    }
    function getFill(fill) {
        return (fill == null || fill === 'none')
            ? null
            : (fill.image || fill.colorStops)
                ? '#000'
                : fill;
    }
    function getTextXForPadding(x, textAlign, textPadding) {
        return textAlign === 'right'
            ? (x - textPadding[1])
            : textAlign === 'center'
                ? (x + textPadding[3] / 2 - textPadding[1] / 2)
                : (x + textPadding[3]);
    }
    function getStyleText(style) {
        let text = style.text;
        text != null && (text += '');
        return text;
    }
    function needDrawBackground(style) {
        return !!(style.backgroundColor
            || style.lineHeight
            || (style.borderWidth && style.borderColor));
    }

    class ArcShape {
        constructor() {
            this.cx = 0;
            this.cy = 0;
            this.r = 0;
            this.startAngle = 0;
            this.endAngle = Math.PI * 2;
            this.clockwise = true;
        }
    }
    class Arc extends Path {
        constructor(opts) {
            super(opts);
        }
        getDefaultStyle() {
            return {
                stroke: '#000',
                fill: null
            };
        }
        getDefaultShape() {
            return new ArcShape();
        }
        buildPath(ctx, shape) {
            const x = shape.cx;
            const y = shape.cy;
            const r = Math.max(shape.r, 0);
            const startAngle = shape.startAngle;
            const endAngle = shape.endAngle;
            const clockwise = shape.clockwise;
            const unitX = Math.cos(startAngle);
            const unitY = Math.sin(startAngle);
            ctx.moveTo(unitX * r + x, unitY * r + y);
            ctx.arc(x, y, r, startAngle, endAngle, !clockwise);
        }
    }
    Arc.prototype.type = 'arc';

    const out = [];
    class BezierCurveShape {
        constructor() {
            this.x1 = 0;
            this.y1 = 0;
            this.x2 = 0;
            this.y2 = 0;
            this.cpx1 = 0;
            this.cpy1 = 0;
            this.percent = 1;
        }
    }
    function someVectorAt(shape, t, isTangent) {
        const cpx2 = shape.cpx2;
        const cpy2 = shape.cpy2;
        if (cpx2 != null || cpy2 != null) {
            return [
                (isTangent ? cubicDerivativeAt : cubicAt)(shape.x1, shape.cpx1, shape.cpx2, shape.x2, t),
                (isTangent ? cubicDerivativeAt : cubicAt)(shape.y1, shape.cpy1, shape.cpy2, shape.y2, t)
            ];
        }
        else {
            return [
                (isTangent ? quadraticDerivativeAt : quadraticAt)(shape.x1, shape.cpx1, shape.x2, t),
                (isTangent ? quadraticDerivativeAt : quadraticAt)(shape.y1, shape.cpy1, shape.y2, t)
            ];
        }
    }
    class BezierCurve extends Path {
        constructor(opts) {
            super(opts);
        }
        getDefaultStyle() {
            return {
                stroke: '#000',
                fill: null
            };
        }
        getDefaultShape() {
            return new BezierCurveShape();
        }
        buildPath(ctx, shape) {
            let x1 = shape.x1;
            let y1 = shape.y1;
            let x2 = shape.x2;
            let y2 = shape.y2;
            let cpx1 = shape.cpx1;
            let cpy1 = shape.cpy1;
            let cpx2 = shape.cpx2;
            let cpy2 = shape.cpy2;
            let percent = shape.percent;
            if (percent === 0) {
                return;
            }
            ctx.moveTo(x1, y1);
            if (cpx2 == null || cpy2 == null) {
                if (percent < 1) {
                    quadraticSubdivide(x1, cpx1, x2, percent, out);
                    cpx1 = out[1];
                    x2 = out[2];
                    quadraticSubdivide(y1, cpy1, y2, percent, out);
                    cpy1 = out[1];
                    y2 = out[2];
                }
                ctx.quadraticCurveTo(cpx1, cpy1, x2, y2);
            }
            else {
                if (percent < 1) {
                    cubicSubdivide(x1, cpx1, cpx2, x2, percent, out);
                    cpx1 = out[1];
                    cpx2 = out[2];
                    x2 = out[3];
                    cubicSubdivide(y1, cpy1, cpy2, y2, percent, out);
                    cpy1 = out[1];
                    cpy2 = out[2];
                    y2 = out[3];
                }
                ctx.bezierCurveTo(cpx1, cpy1, cpx2, cpy2, x2, y2);
            }
        }
        pointAt(t) {
            return someVectorAt(this.shape, t, false);
        }
        tangentAt(t) {
            const p = someVectorAt(this.shape, t, true);
            return normalize(p, p);
        }
    }
    BezierCurve.prototype.type = 'bezier-curve';

    class DropletShape {
        constructor() {
            this.cx = 0;
            this.cy = 0;
            this.width = 0;
            this.height = 0;
        }
    }
    class Droplet extends Path {
        constructor(opts) {
            super(opts);
        }
        getDefaultShape() {
            return new DropletShape();
        }
        buildPath(ctx, shape) {
            const x = shape.cx;
            const y = shape.cy;
            const a = shape.width;
            const b = shape.height;
            ctx.moveTo(x, y + a);
            ctx.bezierCurveTo(x + a, y + a, x + a * 3 / 2, y - a / 3, x, y - b);
            ctx.bezierCurveTo(x - a * 3 / 2, y - a / 3, x - a, y + a, x, y + a);
            ctx.closePath();
        }
    }
    Droplet.prototype.type = 'droplet';

    class HeartShape {
        constructor() {
            this.cx = 0;
            this.cy = 0;
            this.width = 0;
            this.height = 0;
        }
    }
    class Heart extends Path {
        constructor(opts) {
            super(opts);
        }
        getDefaultShape() {
            return new HeartShape();
        }
        buildPath(ctx, shape) {
            const x = shape.cx;
            const y = shape.cy;
            const a = shape.width;
            const b = shape.height;
            ctx.moveTo(x, y);
            ctx.bezierCurveTo(x + a / 2, y - b * 2 / 3, x + a * 2, y + b / 3, x, y + b);
            ctx.bezierCurveTo(x - a * 2, y + b / 3, x - a / 2, y - b * 2 / 3, x, y);
        }
    }
    Heart.prototype.type = 'heart';

    const PI$3 = Math.PI;
    const sin = Math.sin;
    const cos = Math.cos;
    class IsogonShape {
        constructor() {
            this.x = 0;
            this.y = 0;
            this.r = 0;
            this.n = 0;
        }
    }
    class Isogon extends Path {
        constructor(opts) {
            super(opts);
        }
        getDefaultShape() {
            return new IsogonShape();
        }
        buildPath(ctx, shape) {
            const n = shape.n;
            if (!n || n < 2) {
                return;
            }
            const x = shape.x;
            const y = shape.y;
            const r = shape.r;
            const dStep = 2 * PI$3 / n;
            let deg = -PI$3 / 2;
            ctx.moveTo(x + r * cos(deg), y + r * sin(deg));
            for (let i = 0, end = n - 1; i < end; i++) {
                deg += dStep;
                ctx.lineTo(x + r * cos(deg), y + r * sin(deg));
            }
            ctx.closePath();
            return;
        }
    }
    Isogon.prototype.type = 'isogon';

    class RingShape {
        constructor() {
            this.cx = 0;
            this.cy = 0;
            this.r = 0;
            this.r0 = 0;
        }
    }
    class Ring extends Path {
        constructor(opts) {
            super(opts);
        }
        getDefaultShape() {
            return new RingShape();
        }
        buildPath(ctx, shape) {
            const x = shape.cx;
            const y = shape.cy;
            const PI2 = Math.PI * 2;
            ctx.moveTo(x + shape.r, y);
            ctx.arc(x, y, shape.r, 0, PI2, false);
            ctx.moveTo(x + shape.r0, y);
            ctx.arc(x, y, shape.r0, 0, PI2, true);
        }
    }
    Ring.prototype.type = 'ring';

    const sin$1 = Math.sin;
    const cos$1 = Math.cos;
    const radian = Math.PI / 180;
    class RoseShape {
        constructor() {
            this.cx = 0;
            this.cy = 0;
            this.r = [];
            this.k = 0;
            this.n = 1;
        }
    }
    class Rose extends Path {
        constructor(opts) {
            super(opts);
        }
        getDefaultStyle() {
            return {
                stroke: '#000',
                fill: null
            };
        }
        getDefaultShape() {
            return new RoseShape();
        }
        buildPath(ctx, shape) {
            const R = shape.r;
            const k = shape.k;
            const n = shape.n;
            const x0 = shape.cx;
            const y0 = shape.cy;
            let x;
            let y;
            let r;
            ctx.moveTo(x0, y0);
            for (let i = 0, len = R.length; i < len; i++) {
                r = R[i];
                for (let j = 0; j <= 360 * n; j++) {
                    x = r
                        * sin$1(k / n * j % 360 * radian)
                        * cos$1(j * radian)
                        + x0;
                    y = r
                        * sin$1(k / n * j % 360 * radian)
                        * sin$1(j * radian)
                        + y0;
                    ctx.lineTo(x, y);
                }
            }
        }
    }
    Rose.prototype.type = 'rose';

    const PI$4 = Math.PI;
    const cos$2 = Math.cos;
    const sin$2 = Math.sin;
    class StarShape {
        constructor() {
            this.cx = 0;
            this.cy = 0;
            this.n = 3;
            this.r = 0;
        }
    }
    class Star extends Path {
        constructor(opts) {
            super(opts);
        }
        getDefaultShape() {
            return new StarShape();
        }
        buildPath(ctx, shape) {
            const n = shape.n;
            if (!n || n < 2) {
                return;
            }
            const x = shape.cx;
            const y = shape.cy;
            const r = shape.r;
            let r0 = shape.r0;
            if (r0 == null) {
                r0 = n > 4
                    ? r * cos$2(2 * PI$4 / n) / cos$2(PI$4 / n)
                    : r / 3;
            }
            const dStep = PI$4 / n;
            let deg = -PI$4 / 2;
            const xStart = x + r * cos$2(deg);
            const yStart = y + r * sin$2(deg);
            deg += dStep;
            ctx.moveTo(xStart, yStart);
            for (let i = 0, end = n * 2 - 1, ri; i < end; i++) {
                ri = i % 2 === 0 ? r0 : r;
                ctx.lineTo(x + ri * cos$2(deg), y + ri * sin$2(deg));
                deg += dStep;
            }
            ctx.closePath();
        }
    }
    Star.prototype.type = 'star';

    const cos$3 = Math.cos;
    const sin$3 = Math.sin;
    class TrochoidShape {
        constructor() {
            this.cx = 0;
            this.cy = 0;
            this.r = 0;
            this.r0 = 0;
            this.d = 0;
            this.location = 'out';
        }
    }
    class Trochoid extends Path {
        constructor(opts) {
            super(opts);
        }
        getDefaultStyle() {
            return {
                stroke: '#000',
                fill: null
            };
        }
        getDefaultShape() {
            return new TrochoidShape();
        }
        buildPath(ctx, shape) {
            const R = shape.r;
            const r = shape.r0;
            const d = shape.d;
            const offsetX = shape.cx;
            const offsetY = shape.cy;
            const delta = shape.location === 'out' ? 1 : -1;
            let x1;
            let y1;
            let x2;
            let y2;
            if (shape.location && R <= r) {
                return;
            }
            let num = 0;
            let i = 1;
            let theta;
            x1 = (R + delta * r) * cos$3(0)
                - delta * d * cos$3(0) + offsetX;
            y1 = (R + delta * r) * sin$3(0)
                - d * sin$3(0) + offsetY;
            ctx.moveTo(x1, y1);
            do {
                num++;
            } while ((r * num) % (R + delta * r) !== 0);
            do {
                theta = Math.PI / 180 * i;
                x2 = (R + delta * r) * cos$3(theta)
                    - delta * d * cos$3((R / r + delta) * theta)
                    + offsetX;
                y2 = (R + delta * r) * sin$3(theta)
                    - d * sin$3((R / r + delta) * theta)
                    + offsetY;
                ctx.lineTo(x2, y2);
                i++;
            } while (i <= (r * num) / (R + delta * r) * 360);
        }
    }
    Trochoid.prototype.type = 'trochoid';

    class Pattern {
        constructor(image, repeat) {
            this.image = image;
            this.repeat = repeat;
            this.x = 0;
            this.y = 0;
            this.rotation = 0;
            this.scaleX = 1;
            this.scaleY = 1;
        }
    }

    const extent = [0, 0];
    const extent2 = [0, 0];
    const minTv$1 = new Point();
    const maxTv$1 = new Point();
    class OrientedBoundingRect {
        constructor(rect, transform) {
            this._corners = [];
            this._axes = [];
            this._origin = [0, 0];
            for (let i = 0; i < 4; i++) {
                this._corners[i] = new Point();
            }
            for (let i = 0; i < 2; i++) {
                this._axes[i] = new Point();
            }
            if (rect) {
                this.fromBoundingRect(rect, transform);
            }
        }
        fromBoundingRect(rect, transform) {
            const corners = this._corners;
            const axes = this._axes;
            const x = rect.x;
            const y = rect.y;
            const x2 = x + rect.width;
            const y2 = y + rect.height;
            corners[0].set(x, y);
            corners[1].set(x2, y);
            corners[2].set(x2, y2);
            corners[3].set(x, y2);
            if (transform) {
                for (let i = 0; i < 4; i++) {
                    corners[i].transform(transform);
                }
            }
            Point.sub(axes[0], corners[1], corners[0]);
            Point.sub(axes[1], corners[3], corners[0]);
            axes[0].normalize();
            axes[1].normalize();
            for (let i = 0; i < 2; i++) {
                this._origin[i] = axes[i].dot(corners[0]);
            }
        }
        intersect(other, mtv) {
            let overlapped = true;
            const noMtv = !mtv;
            minTv$1.set(Infinity, Infinity);
            maxTv$1.set(0, 0);
            if (!this._intersectCheckOneSide(this, other, minTv$1, maxTv$1, noMtv, 1)) {
                overlapped = false;
                if (noMtv) {
                    return overlapped;
                }
            }
            if (!this._intersectCheckOneSide(other, this, minTv$1, maxTv$1, noMtv, -1)) {
                overlapped = false;
                if (noMtv) {
                    return overlapped;
                }
            }
            if (!noMtv) {
                Point.copy(mtv, overlapped ? minTv$1 : maxTv$1);
            }
            return overlapped;
        }
        _intersectCheckOneSide(self, other, minTv, maxTv, noMtv, inverse) {
            let overlapped = true;
            for (let i = 0; i < 2; i++) {
                const axis = this._axes[i];
                this._getProjMinMaxOnAxis(i, self._corners, extent);
                this._getProjMinMaxOnAxis(i, other._corners, extent2);
                if (extent[1] < extent2[0] || extent[0] > extent2[1]) {
                    overlapped = false;
                    if (noMtv) {
                        return overlapped;
                    }
                    const dist0 = Math.abs(extent2[0] - extent[1]);
                    const dist1 = Math.abs(extent[0] - extent2[1]);
                    if (Math.min(dist0, dist1) > maxTv.len()) {
                        if (dist0 < dist1) {
                            Point.scale(maxTv, axis, -dist0 * inverse);
                        }
                        else {
                            Point.scale(maxTv, axis, dist1 * inverse);
                        }
                    }
                }
                else if (minTv) {
                    const dist0 = Math.abs(extent2[0] - extent[1]);
                    const dist1 = Math.abs(extent[0] - extent2[1]);
                    if (Math.min(dist0, dist1) < minTv.len()) {
                        if (dist0 < dist1) {
                            Point.scale(minTv, axis, dist0 * inverse);
                        }
                        else {
                            Point.scale(minTv, axis, -dist1 * inverse);
                        }
                    }
                }
            }
            return overlapped;
        }
        _getProjMinMaxOnAxis(dim, corners, out) {
            const axis = this._axes[dim];
            const origin = this._origin;
            const proj = corners[0].dot(axis) + origin[dim];
            let min = proj;
            let max = proj;
            for (let i = 1; i < corners.length; i++) {
                const proj = corners[i].dot(axis) + origin[dim];
                min = Math.min(proj, min);
                max = Math.max(proj, max);
            }
            out[0] = min;
            out[1] = max;
        }
    }

    class DebugRect {
        constructor(style) {
            const dom = this.dom = document.createElement('div');
            dom.className = 'ec-debug-dirty-rect';
            style = extend({}, style);
            extend(style, {
                backgroundColor: 'rgba(0, 0, 255, 0.2)',
                border: '1px solid #00f'
            });
            dom.style.cssText = `
position: absolute;
opacity: 0;
transition: opacity 0.5s linear;
pointer-events: none;
`;
            for (let key in style) {
                if (style.hasOwnProperty(key)) {
                    dom.style[key] = style[key];
                }
            }
        }
        update(rect) {
            const domStyle = this.dom.style;
            domStyle.width = rect.width + 'px';
            domStyle.height = rect.height + 'px';
            domStyle.left = rect.x + 'px';
            domStyle.top = rect.y + 'px';
        }
        hide() {
            this.dom.style.opacity = '0';
        }
        show(autoHideDelay) {
            clearTimeout(this._hideTimeout);
            this.dom.style.opacity = '1';
            this._hideTimeout = setTimeout(() => {
                this.hide();
            }, autoHideDelay || 1000);
        }
    }
    function showDebugDirtyRect(zr, opts) {
        opts = opts || {};
        const painter = zr.painter;
        if (!painter.getLayers) {
            throw new Error('Debug dirty rect can only been used on canvas renderer.');
        }
        if (painter.isSingleCanvas()) {
            throw new Error('Debug dirty rect can only been used on zrender inited with container.');
        }
        const debugViewRoot = document.createElement('div');
        debugViewRoot.style.cssText = `
position:absolute;
left:0;
top:0;
right:0;
bottom:0;
pointer-events:none;
`;
        debugViewRoot.className = 'ec-debug-dirty-rect-container';
        const debugRects = [];
        const dom = zr.dom;
        dom.appendChild(debugViewRoot);
        const computedStyle = getComputedStyle(dom);
        if (computedStyle.position === 'static') {
            dom.style.position = 'relative';
        }
        zr.on('rendered', function () {
            if (painter.getLayers) {
                let idx = 0;
                painter.eachBuiltinLayer((layer) => {
                    if (!layer.debugGetPaintRects) {
                        return;
                    }
                    const paintRects = layer.debugGetPaintRects();
                    for (let i = 0; i < paintRects.length; i++) {
                        if (!paintRects[i].width || !paintRects[i].height) {
                            continue;
                        }
                        if (!debugRects[idx]) {
                            debugRects[idx] = new DebugRect(opts.style);
                            debugViewRoot.appendChild(debugRects[idx].dom);
                        }
                        debugRects[idx].show(opts.autoHideDelay);
                        debugRects[idx].update(paintRects[i]);
                        idx++;
                    }
                });
                for (let i = idx; i < debugRects.length; i++) {
                    debugRects[i].hide();
                }
            }
        });
    }

    function isSafeNum(num) {
        return isFinite(num);
    }
    function createLinearGradient(ctx, obj, rect) {
        let x = obj.x == null ? 0 : obj.x;
        let x2 = obj.x2 == null ? 1 : obj.x2;
        let y = obj.y == null ? 0 : obj.y;
        let y2 = obj.y2 == null ? 0 : obj.y2;
        if (!obj.global) {
            x = x * rect.width + rect.x;
            x2 = x2 * rect.width + rect.x;
            y = y * rect.height + rect.y;
            y2 = y2 * rect.height + rect.y;
        }
        x = isSafeNum(x) ? x : 0;
        x2 = isSafeNum(x2) ? x2 : 1;
        y = isSafeNum(y) ? y : 0;
        y2 = isSafeNum(y2) ? y2 : 0;
        const canvasGradient = ctx.createLinearGradient(x, y, x2, y2);
        return canvasGradient;
    }
    function createRadialGradient(ctx, obj, rect) {
        const width = rect.width;
        const height = rect.height;
        const min = Math.min(width, height);
        let x = obj.x == null ? 0.5 : obj.x;
        let y = obj.y == null ? 0.5 : obj.y;
        let r = obj.r == null ? 0.5 : obj.r;
        if (!obj.global) {
            x = x * width + rect.x;
            y = y * height + rect.y;
            r = r * min;
        }
        x = isSafeNum(x) ? x : 0.5;
        y = isSafeNum(y) ? y : 0.5;
        r = r >= 0 && isSafeNum(r) ? r : 0.5;
        const canvasGradient = ctx.createRadialGradient(x, y, 0, x, y, r);
        return canvasGradient;
    }
    function getCanvasGradient(ctx, obj, rect) {
        const canvasGradient = obj.type === 'radial'
            ? createRadialGradient(ctx, obj, rect)
            : createLinearGradient(ctx, obj, rect);
        const colorStops = obj.colorStops;
        for (let i = 0; i < colorStops.length; i++) {
            canvasGradient.addColorStop(colorStops[i].offset, colorStops[i].color);
        }
        return canvasGradient;
    }
    function isClipPathChanged(clipPaths, prevClipPaths) {
        if (clipPaths === prevClipPaths || (!clipPaths && !prevClipPaths)) {
            return false;
        }
        if (!clipPaths || !prevClipPaths || (clipPaths.length !== prevClipPaths.length)) {
            return true;
        }
        for (let i = 0; i < clipPaths.length; i++) {
            if (clipPaths[i] !== prevClipPaths[i]) {
                return true;
            }
        }
        return false;
    }
    function parseInt10(val) {
        return parseInt(val, 10);
    }
    function getSize(root, whIdx, opts) {
        const wh = ['width', 'height'][whIdx];
        const cwh = ['clientWidth', 'clientHeight'][whIdx];
        const plt = ['paddingLeft', 'paddingTop'][whIdx];
        const prb = ['paddingRight', 'paddingBottom'][whIdx];
        if (opts[wh] != null && opts[wh] !== 'auto') {
            return parseFloat(opts[wh]);
        }
        const stl = document.defaultView.getComputedStyle(root);
        return ((root[cwh] || parseInt10(stl[wh]) || parseInt10(root.style[wh]))
            - (parseInt10(stl[plt]) || 0)
            - (parseInt10(stl[prb]) || 0)) | 0;
    }

    function normalizeLineDash(lineType, lineWidth) {
        if (!lineType || lineType === 'solid' || !(lineWidth > 0)) {
            return null;
        }
        return lineType === 'dashed'
            ? [4 * lineWidth, 2 * lineWidth]
            : lineType === 'dotted'
                ? [lineWidth]
                : isNumber(lineType)
                    ? [lineType] : isArray(lineType) ? lineType : null;
    }
    function getLineDash(el) {
        const style = el.style;
        let lineDash = style.lineDash && style.lineWidth > 0 && normalizeLineDash(style.lineDash, style.lineWidth);
        let lineDashOffset = style.lineDashOffset;
        if (lineDash) {
            const lineScale = (style.strokeNoScale && el.getLineScale) ? el.getLineScale() : 1;
            if (lineScale && lineScale !== 1) {
                lineDash = map(lineDash, function (rawVal) {
                    return rawVal / lineScale;
                });
                lineDashOffset /= lineScale;
            }
        }
        return [lineDash, lineDashOffset];
    }

    const pathProxyForDraw = new PathProxy(true);
    function styleHasStroke(style) {
        const stroke = style.stroke;
        return !(stroke == null || stroke === 'none' || !(style.lineWidth > 0));
    }
    function isValidStrokeFillStyle(strokeOrFill) {
        return typeof strokeOrFill === 'string' && strokeOrFill !== 'none';
    }
    function styleHasFill(style) {
        const fill = style.fill;
        return fill != null && fill !== 'none';
    }
    function doFillPath(ctx, style) {
        if (style.fillOpacity != null && style.fillOpacity !== 1) {
            const originalGlobalAlpha = ctx.globalAlpha;
            ctx.globalAlpha = style.fillOpacity * style.opacity;
            ctx.fill();
            ctx.globalAlpha = originalGlobalAlpha;
        }
        else {
            ctx.fill();
        }
    }
    function doStrokePath(ctx, style) {
        if (style.strokeOpacity != null && style.strokeOpacity !== 1) {
            const originalGlobalAlpha = ctx.globalAlpha;
            ctx.globalAlpha = style.strokeOpacity * style.opacity;
            ctx.stroke();
            ctx.globalAlpha = originalGlobalAlpha;
        }
        else {
            ctx.stroke();
        }
    }
    function createCanvasPattern(ctx, pattern, el) {
        const image = createOrUpdateImage(pattern.image, pattern.__image, el);
        if (isImageReady(image)) {
            const canvasPattern = ctx.createPattern(image, pattern.repeat || 'repeat');
            if (typeof DOMMatrix === 'function'
                && canvasPattern
                && canvasPattern.setTransform) {
                const matrix = new DOMMatrix();
                matrix.translateSelf((pattern.x || 0), (pattern.y || 0));
                matrix.rotateSelf(0, 0, (pattern.rotation || 0) * RADIAN_TO_DEGREE);
                matrix.scaleSelf((pattern.scaleX || 1), (pattern.scaleY || 1));
                canvasPattern.setTransform(matrix);
            }
            return canvasPattern;
        }
    }
    function brushPath(ctx, el, style, inBatch) {
        let hasStroke = styleHasStroke(style);
        let hasFill = styleHasFill(style);
        const strokePercent = style.strokePercent;
        const strokePart = strokePercent < 1;
        const firstDraw = !el.path;
        if ((!el.silent || strokePart) && firstDraw) {
            el.createPathProxy();
        }
        const path = el.path || pathProxyForDraw;
        const dirtyFlag = el.__dirty;
        if (!inBatch) {
            const fill = style.fill;
            const stroke = style.stroke;
            const hasFillGradient = hasFill && !!fill.colorStops;
            const hasStrokeGradient = hasStroke && !!stroke.colorStops;
            const hasFillPattern = hasFill && !!fill.image;
            const hasStrokePattern = hasStroke && !!stroke.image;
            let fillGradient;
            let strokeGradient;
            let fillPattern;
            let strokePattern;
            let rect;
            if (hasFillGradient || hasStrokeGradient) {
                rect = el.getBoundingRect();
            }
            if (hasFillGradient) {
                fillGradient = dirtyFlag
                    ? getCanvasGradient(ctx, fill, rect)
                    : el.__canvasFillGradient;
                el.__canvasFillGradient = fillGradient;
            }
            if (hasStrokeGradient) {
                strokeGradient = dirtyFlag
                    ? getCanvasGradient(ctx, stroke, rect)
                    : el.__canvasStrokeGradient;
                el.__canvasStrokeGradient = strokeGradient;
            }
            if (hasFillPattern) {
                fillPattern = (dirtyFlag || !el.__canvasFillPattern)
                    ? createCanvasPattern(ctx, fill, el)
                    : el.__canvasFillPattern;
                el.__canvasFillPattern = fillPattern;
            }
            if (hasStrokePattern) {
                strokePattern = (dirtyFlag || !el.__canvasStrokePattern)
                    ? createCanvasPattern(ctx, stroke, el)
                    : el.__canvasStrokePattern;
                el.__canvasStrokePattern = fillPattern;
            }
            if (hasFillGradient) {
                ctx.fillStyle = fillGradient;
            }
            else if (hasFillPattern) {
                if (fillPattern) {
                    ctx.fillStyle = fillPattern;
                }
                else {
                    hasFill = false;
                }
            }
            if (hasStrokeGradient) {
                ctx.strokeStyle = strokeGradient;
            }
            else if (hasStrokePattern) {
                if (strokePattern) {
                    ctx.strokeStyle = strokePattern;
                }
                else {
                    hasStroke = false;
                }
            }
        }
        const scale = el.getGlobalScale();
        path.setScale(scale[0], scale[1], el.segmentIgnoreThreshold);
        let lineDash;
        let lineDashOffset;
        if (ctx.setLineDash && style.lineDash) {
            [lineDash, lineDashOffset] = getLineDash(el);
        }
        let needsRebuild = true;
        if (firstDraw || (dirtyFlag & SHAPE_CHANGED_BIT)) {
            path.setDPR(ctx.dpr);
            if (strokePart) {
                path.setContext(null);
            }
            else {
                path.setContext(ctx);
                needsRebuild = false;
            }
            path.reset();
            el.buildPath(path, el.shape, inBatch);
            path.toStatic();
            el.pathUpdated();
        }
        if (needsRebuild) {
            path.rebuildPath(ctx, strokePart ? strokePercent : 1);
        }
        if (lineDash) {
            ctx.setLineDash(lineDash);
            ctx.lineDashOffset = lineDashOffset;
        }
        if (!inBatch) {
            if (style.strokeFirst) {
                if (hasStroke) {
                    doStrokePath(ctx, style);
                }
                if (hasFill) {
                    doFillPath(ctx, style);
                }
            }
            else {
                if (hasFill) {
                    doFillPath(ctx, style);
                }
                if (hasStroke) {
                    doStrokePath(ctx, style);
                }
            }
        }
        if (lineDash) {
            ctx.setLineDash([]);
        }
    }
    function brushImage(ctx, el, style) {
        const image = el.__image = createOrUpdateImage(style.image, el.__image, el, el.onload);
        if (!image || !isImageReady(image)) {
            return;
        }
        const x = style.x || 0;
        const y = style.y || 0;
        let width = el.getWidth();
        let height = el.getHeight();
        const aspect = image.width / image.height;
        if (width == null && height != null) {
            width = height * aspect;
        }
        else if (height == null && width != null) {
            height = width / aspect;
        }
        else if (width == null && height == null) {
            width = image.width;
            height = image.height;
        }
        if (style.sWidth && style.sHeight) {
            const sx = style.sx || 0;
            const sy = style.sy || 0;
            ctx.drawImage(image, sx, sy, style.sWidth, style.sHeight, x, y, width, height);
        }
        else if (style.sx && style.sy) {
            const sx = style.sx;
            const sy = style.sy;
            const sWidth = width - sx;
            const sHeight = height - sy;
            ctx.drawImage(image, sx, sy, sWidth, sHeight, x, y, width, height);
        }
        else {
            ctx.drawImage(image, x, y, width, height);
        }
    }
    function brushText(ctx, el, style) {
        let text = style.text;
        text != null && (text += '');
        if (text) {
            ctx.font = style.font || DEFAULT_FONT;
            ctx.textAlign = style.textAlign;
            ctx.textBaseline = style.textBaseline;
            let lineDash;
            let lineDashOffset;
            if (ctx.setLineDash && style.lineDash) {
                [lineDash, lineDashOffset] = getLineDash(el);
            }
            if (lineDash) {
                ctx.setLineDash(lineDash);
                ctx.lineDashOffset = lineDashOffset;
            }
            if (style.strokeFirst) {
                if (styleHasStroke(style)) {
                    ctx.strokeText(text, style.x, style.y);
                }
                if (styleHasFill(style)) {
                    ctx.fillText(text, style.x, style.y);
                }
            }
            else {
                if (styleHasFill(style)) {
                    ctx.fillText(text, style.x, style.y);
                }
                if (styleHasStroke(style)) {
                    ctx.strokeText(text, style.x, style.y);
                }
            }
            if (lineDash) {
                ctx.setLineDash([]);
            }
        }
    }
    const SHADOW_NUMBER_PROPS = ['shadowBlur', 'shadowOffsetX', 'shadowOffsetY'];
    const STROKE_PROPS = [
        ['lineCap', 'butt'], ['lineJoin', 'miter'], ['miterLimit', 10]
    ];
    function bindCommonProps(ctx, style, prevStyle, forceSetAll, scope) {
        let styleChanged = false;
        if (!forceSetAll) {
            prevStyle = prevStyle || {};
            if (style === prevStyle) {
                return false;
            }
        }
        if (forceSetAll || style.opacity !== prevStyle.opacity) {
            flushPathDrawn(ctx, scope);
            styleChanged = true;
            const opacity = Math.max(Math.min(style.opacity, 1), 0);
            ctx.globalAlpha = isNaN(opacity) ? DEFAULT_COMMON_STYLE.opacity : opacity;
        }
        if (forceSetAll || style.blend !== prevStyle.blend) {
            if (!styleChanged) {
                flushPathDrawn(ctx, scope);
                styleChanged = true;
            }
            ctx.globalCompositeOperation = style.blend || DEFAULT_COMMON_STYLE.blend;
        }
        for (let i = 0; i < SHADOW_NUMBER_PROPS.length; i++) {
            const propName = SHADOW_NUMBER_PROPS[i];
            if (forceSetAll || style[propName] !== prevStyle[propName]) {
                if (!styleChanged) {
                    flushPathDrawn(ctx, scope);
                    styleChanged = true;
                }
                ctx[propName] = ctx.dpr * (style[propName] || 0);
            }
        }
        if (forceSetAll || style.shadowColor !== prevStyle.shadowColor) {
            if (!styleChanged) {
                flushPathDrawn(ctx, scope);
                styleChanged = true;
            }
            ctx.shadowColor = style.shadowColor || DEFAULT_COMMON_STYLE.shadowColor;
        }
        return styleChanged;
    }
    function bindPathAndTextCommonStyle(ctx, el, prevEl, forceSetAll, scope) {
        const style = getStyle(el, scope.inHover);
        const prevStyle = forceSetAll
            ? null
            : (prevEl && getStyle(prevEl, scope.inHover) || {});
        if (style === prevStyle) {
            return false;
        }
        let styleChanged = bindCommonProps(ctx, style, prevStyle, forceSetAll, scope);
        if (forceSetAll || style.fill !== prevStyle.fill) {
            if (!styleChanged) {
                flushPathDrawn(ctx, scope);
                styleChanged = true;
            }
            isValidStrokeFillStyle(style.fill) && (ctx.fillStyle = style.fill);
        }
        if (forceSetAll || style.stroke !== prevStyle.stroke) {
            if (!styleChanged) {
                flushPathDrawn(ctx, scope);
                styleChanged = true;
            }
            isValidStrokeFillStyle(style.stroke) && (ctx.strokeStyle = style.stroke);
        }
        if (forceSetAll || style.opacity !== prevStyle.opacity) {
            if (!styleChanged) {
                flushPathDrawn(ctx, scope);
                styleChanged = true;
            }
            ctx.globalAlpha = style.opacity == null ? 1 : style.opacity;
        }
        if (el.hasStroke()) {
            const lineWidth = style.lineWidth;
            const newLineWidth = lineWidth / ((style.strokeNoScale && el.getLineScale) ? el.getLineScale() : 1);
            if (ctx.lineWidth !== newLineWidth) {
                if (!styleChanged) {
                    flushPathDrawn(ctx, scope);
                    styleChanged = true;
                }
                ctx.lineWidth = newLineWidth;
            }
        }
        for (let i = 0; i < STROKE_PROPS.length; i++) {
            const prop = STROKE_PROPS[i];
            const propName = prop[0];
            if (forceSetAll || style[propName] !== prevStyle[propName]) {
                if (!styleChanged) {
                    flushPathDrawn(ctx, scope);
                    styleChanged = true;
                }
                ctx[propName] = style[propName] || prop[1];
            }
        }
        return styleChanged;
    }
    function bindImageStyle(ctx, el, prevEl, forceSetAll, scope) {
        return bindCommonProps(ctx, getStyle(el, scope.inHover), prevEl && getStyle(prevEl, scope.inHover), forceSetAll, scope);
    }
    function setContextTransform(ctx, el) {
        const m = el.transform;
        const dpr = ctx.dpr || 1;
        if (m) {
            ctx.setTransform(dpr * m[0], dpr * m[1], dpr * m[2], dpr * m[3], dpr * m[4], dpr * m[5]);
        }
        else {
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
    }
    function updateClipStatus(clipPaths, ctx, scope) {
        let allClipped = false;
        for (let i = 0; i < clipPaths.length; i++) {
            const clipPath = clipPaths[i];
            allClipped = allClipped || clipPath.isZeroArea();
            setContextTransform(ctx, clipPath);
            ctx.beginPath();
            clipPath.buildPath(ctx, clipPath.shape);
            ctx.clip();
        }
        scope.allClipped = allClipped;
    }
    function isTransformChanged(m0, m1) {
        if (m0 && m1) {
            return m0[0] !== m1[0]
                || m0[1] !== m1[1]
                || m0[2] !== m1[2]
                || m0[3] !== m1[3]
                || m0[4] !== m1[4]
                || m0[5] !== m1[5];
        }
        else if (!m0 && !m1) {
            return false;
        }
        return true;
    }
    const DRAW_TYPE_PATH = 1;
    const DRAW_TYPE_IMAGE = 2;
    const DRAW_TYPE_TEXT = 3;
    const DRAW_TYPE_INCREMENTAL = 4;
    function canPathBatch(style) {
        const hasFill = styleHasFill(style);
        const hasStroke = styleHasStroke(style);
        return !(style.lineDash
            || !(+hasFill ^ +hasStroke)
            || (hasFill && typeof style.fill !== 'string')
            || (hasStroke && typeof style.stroke !== 'string')
            || style.strokePercent < 1
            || style.strokeOpacity < 1
            || style.fillOpacity < 1);
    }
    function flushPathDrawn(ctx, scope) {
        scope.batchFill && ctx.fill();
        scope.batchStroke && ctx.stroke();
        scope.batchFill = '';
        scope.batchStroke = '';
    }
    function getStyle(el, inHover) {
        return inHover ? (el.__hoverStyle || el.style) : el.style;
    }
    function brushSingle(ctx, el) {
        brush(ctx, el, { inHover: false, viewWidth: 0, viewHeight: 0 }, true);
    }
    function brush(ctx, el, scope, isLast) {
        const m = el.transform;
        if (!el.shouldBePainted(scope.viewWidth, scope.viewHeight, false, false)) {
            el.__dirty &= ~REDRAW_BIT;
            el.__isRendered = false;
            return;
        }
        const clipPaths = el.__clipPaths;
        const prevElClipPaths = scope.prevElClipPaths;
        let forceSetTransform = false;
        let forceSetStyle = false;
        if (!prevElClipPaths || isClipPathChanged(clipPaths, prevElClipPaths)) {
            if (prevElClipPaths && prevElClipPaths.length) {
                flushPathDrawn(ctx, scope);
                ctx.restore();
                forceSetStyle = forceSetTransform = true;
                scope.prevElClipPaths = null;
                scope.allClipped = false;
                scope.prevEl = null;
            }
            if (clipPaths && clipPaths.length) {
                flushPathDrawn(ctx, scope);
                ctx.save();
                updateClipStatus(clipPaths, ctx, scope);
                forceSetTransform = true;
            }
            scope.prevElClipPaths = clipPaths;
        }
        if (scope.allClipped) {
            el.__isRendered = false;
            return;
        }
        el.beforeBrush && el.beforeBrush();
        el.innerBeforeBrush();
        const prevEl = scope.prevEl;
        if (!prevEl) {
            forceSetStyle = forceSetTransform = true;
        }
        let canBatchPath = el instanceof Path
            && el.autoBatch
            && canPathBatch(el.style);
        if (forceSetTransform || isTransformChanged(m, prevEl.transform)) {
            flushPathDrawn(ctx, scope);
            setContextTransform(ctx, el);
        }
        else if (!canBatchPath) {
            flushPathDrawn(ctx, scope);
        }
        const style = getStyle(el, scope.inHover);
        if (el instanceof Path) {
            if (scope.lastDrawType !== DRAW_TYPE_PATH) {
                forceSetStyle = true;
                scope.lastDrawType = DRAW_TYPE_PATH;
            }
            bindPathAndTextCommonStyle(ctx, el, prevEl, forceSetStyle, scope);
            if (!canBatchPath || (!scope.batchFill && !scope.batchStroke)) {
                ctx.beginPath();
            }
            brushPath(ctx, el, style, canBatchPath);
            if (canBatchPath) {
                scope.batchFill = style.fill || '';
                scope.batchStroke = style.stroke || '';
            }
        }
        else {
            if (el instanceof TSpan) {
                if (scope.lastDrawType !== DRAW_TYPE_TEXT) {
                    forceSetStyle = true;
                    scope.lastDrawType = DRAW_TYPE_TEXT;
                }
                bindPathAndTextCommonStyle(ctx, el, prevEl, forceSetStyle, scope);
                brushText(ctx, el, style);
            }
            else if (el instanceof ZRImage) {
                if (scope.lastDrawType !== DRAW_TYPE_IMAGE) {
                    forceSetStyle = true;
                    scope.lastDrawType = DRAW_TYPE_IMAGE;
                }
                bindImageStyle(ctx, el, prevEl, forceSetStyle, scope);
                brushImage(ctx, el, style);
            }
            else if (el.getTemporalDisplayables) {
                if (scope.lastDrawType !== DRAW_TYPE_INCREMENTAL) {
                    forceSetStyle = true;
                    scope.lastDrawType = DRAW_TYPE_INCREMENTAL;
                }
                brushIncremental(ctx, el, scope);
            }
        }
        if (canBatchPath && isLast) {
            flushPathDrawn(ctx, scope);
        }
        el.innerAfterBrush();
        el.afterBrush && el.afterBrush();
        scope.prevEl = el;
        el.__dirty = 0;
        el.__isRendered = true;
    }
    function brushIncremental(ctx, el, scope) {
        let displayables = el.getDisplayables();
        let temporalDisplayables = el.getTemporalDisplayables();
        ctx.save();
        let innerScope = {
            prevElClipPaths: null,
            prevEl: null,
            allClipped: false,
            viewWidth: scope.viewWidth,
            viewHeight: scope.viewHeight,
            inHover: scope.inHover
        };
        let i;
        let len;
        for (i = el.getCursor(), len = displayables.length; i < len; i++) {
            const displayable = displayables[i];
            displayable.beforeBrush && displayable.beforeBrush();
            displayable.innerBeforeBrush();
            brush(ctx, displayable, innerScope, i === len - 1);
            displayable.innerAfterBrush();
            displayable.afterBrush && displayable.afterBrush();
            innerScope.prevEl = displayable;
        }
        for (let i = 0, len = temporalDisplayables.length; i < len; i++) {
            const displayable = temporalDisplayables[i];
            displayable.beforeBrush && displayable.beforeBrush();
            displayable.innerBeforeBrush();
            brush(ctx, displayable, innerScope, i === len - 1);
            displayable.innerAfterBrush();
            displayable.afterBrush && displayable.afterBrush();
            innerScope.prevEl = displayable;
        }
        el.clearTemporalDisplayables();
        el.notClear = true;
        ctx.restore();
    }

    function createDom(id, painter, dpr) {
        const newDom = platformApi.createCanvas();
        const width = painter.getWidth();
        const height = painter.getHeight();
        const newDomStyle = newDom.style;
        if (newDomStyle) {
            newDomStyle.position = 'absolute';
            newDomStyle.left = '0';
            newDomStyle.top = '0';
            newDomStyle.width = width + 'px';
            newDomStyle.height = height + 'px';
            newDom.setAttribute('data-zr-dom-id', id);
        }
        newDom.width = width * dpr;
        newDom.height = height * dpr;
        return newDom;
    }
    class Layer extends Eventful {
        constructor(id, painter, dpr) {
            super();
            this.motionBlur = false;
            this.lastFrameAlpha = 0.7;
            this.dpr = 1;
            this.virtual = false;
            this.config = {};
            this.incremental = false;
            this.zlevel = 0;
            this.maxRepaintRectCount = 5;
            this.__dirty = true;
            this.__firstTimePaint = true;
            this.__used = false;
            this.__drawIndex = 0;
            this.__startIndex = 0;
            this.__endIndex = 0;
            this.__prevStartIndex = null;
            this.__prevEndIndex = null;
            let dom;
            dpr = dpr || devicePixelRatio;
            if (typeof id === 'string') {
                dom = createDom(id, painter, dpr);
            }
            else if (isObject(id)) {
                dom = id;
                id = dom.id;
            }
            this.id = id;
            this.dom = dom;
            const domStyle = dom.style;
            if (domStyle) {
                disableUserSelect(dom);
                dom.onselectstart = () => false;
                domStyle.padding = '0';
                domStyle.margin = '0';
                domStyle.borderWidth = '0';
            }
            this.painter = painter;
            this.dpr = dpr;
        }
        getElementCount() {
            return this.__endIndex - this.__startIndex;
        }
        afterBrush() {
            this.__prevStartIndex = this.__startIndex;
            this.__prevEndIndex = this.__endIndex;
        }
        initContext() {
            this.ctx = this.dom.getContext('2d');
            this.ctx.dpr = this.dpr;
        }
        setUnpainted() {
            this.__firstTimePaint = true;
        }
        createBackBuffer() {
            const dpr = this.dpr;
            this.domBack = createDom('back-' + this.id, this.painter, dpr);
            this.ctxBack = this.domBack.getContext('2d');
            if (dpr !== 1) {
                this.ctxBack.scale(dpr, dpr);
            }
        }
        createRepaintRects(displayList, prevList, viewWidth, viewHeight) {
            if (this.__firstTimePaint) {
                this.__firstTimePaint = false;
                return null;
            }
            const mergedRepaintRects = [];
            const maxRepaintRectCount = this.maxRepaintRectCount;
            let full = false;
            const pendingRect = new BoundingRect(0, 0, 0, 0);
            function addRectToMergePool(rect) {
                if (!rect.isFinite() || rect.isZero()) {
                    return;
                }
                if (mergedRepaintRects.length === 0) {
                    const boundingRect = new BoundingRect(0, 0, 0, 0);
                    boundingRect.copy(rect);
                    mergedRepaintRects.push(boundingRect);
                }
                else {
                    let isMerged = false;
                    let minDeltaArea = Infinity;
                    let bestRectToMergeIdx = 0;
                    for (let i = 0; i < mergedRepaintRects.length; ++i) {
                        const mergedRect = mergedRepaintRects[i];
                        if (mergedRect.intersect(rect)) {
                            const pendingRect = new BoundingRect(0, 0, 0, 0);
                            pendingRect.copy(mergedRect);
                            pendingRect.union(rect);
                            mergedRepaintRects[i] = pendingRect;
                            isMerged = true;
                            break;
                        }
                        else if (full) {
                            pendingRect.copy(rect);
                            pendingRect.union(mergedRect);
                            const aArea = rect.width * rect.height;
                            const bArea = mergedRect.width * mergedRect.height;
                            const pendingArea = pendingRect.width * pendingRect.height;
                            const deltaArea = pendingArea - aArea - bArea;
                            if (deltaArea < minDeltaArea) {
                                minDeltaArea = deltaArea;
                                bestRectToMergeIdx = i;
                            }
                        }
                    }
                    if (full) {
                        mergedRepaintRects[bestRectToMergeIdx].union(rect);
                        isMerged = true;
                    }
                    if (!isMerged) {
                        const boundingRect = new BoundingRect(0, 0, 0, 0);
                        boundingRect.copy(rect);
                        mergedRepaintRects.push(boundingRect);
                    }
                    if (!full) {
                        full = mergedRepaintRects.length >= maxRepaintRectCount;
                    }
                }
            }
            for (let i = this.__startIndex; i < this.__endIndex; ++i) {
                const el = displayList[i];
                if (el) {
                    const shouldPaint = el.shouldBePainted(viewWidth, viewHeight, true, true);
                    const prevRect = el.__isRendered && ((el.__dirty & REDRAW_BIT) || !shouldPaint)
                        ? el.getPrevPaintRect()
                        : null;
                    if (prevRect) {
                        addRectToMergePool(prevRect);
                    }
                    const curRect = shouldPaint && ((el.__dirty & REDRAW_BIT) || !el.__isRendered)
                        ? el.getPaintRect()
                        : null;
                    if (curRect) {
                        addRectToMergePool(curRect);
                    }
                }
            }
            for (let i = this.__prevStartIndex; i < this.__prevEndIndex; ++i) {
                const el = prevList[i];
                const shouldPaint = el && el.shouldBePainted(viewWidth, viewHeight, true, true);
                if (el && (!shouldPaint || !el.__zr) && el.__isRendered) {
                    const prevRect = el.getPrevPaintRect();
                    if (prevRect) {
                        addRectToMergePool(prevRect);
                    }
                }
            }
            let hasIntersections;
            do {
                hasIntersections = false;
                for (let i = 0; i < mergedRepaintRects.length;) {
                    if (mergedRepaintRects[i].isZero()) {
                        mergedRepaintRects.splice(i, 1);
                        continue;
                    }
                    for (let j = i + 1; j < mergedRepaintRects.length;) {
                        if (mergedRepaintRects[i].intersect(mergedRepaintRects[j])) {
                            hasIntersections = true;
                            mergedRepaintRects[i].union(mergedRepaintRects[j]);
                            mergedRepaintRects.splice(j, 1);
                        }
                        else {
                            j++;
                        }
                    }
                    i++;
                }
            } while (hasIntersections);
            this._paintRects = mergedRepaintRects;
            return mergedRepaintRects;
        }
        debugGetPaintRects() {
            return (this._paintRects || []).slice();
        }
        resize(width, height) {
            const dpr = this.dpr;
            const dom = this.dom;
            const domStyle = dom.style;
            const domBack = this.domBack;
            if (domStyle) {
                domStyle.width = width + 'px';
                domStyle.height = height + 'px';
            }
            dom.width = width * dpr;
            dom.height = height * dpr;
            if (domBack) {
                domBack.width = width * dpr;
                domBack.height = height * dpr;
                if (dpr !== 1) {
                    this.ctxBack.scale(dpr, dpr);
                }
            }
        }
        clear(clearAll, clearColor, repaintRects) {
            const dom = this.dom;
            const ctx = this.ctx;
            const width = dom.width;
            const height = dom.height;
            clearColor = clearColor || this.clearColor;
            const haveMotionBLur = this.motionBlur && !clearAll;
            const lastFrameAlpha = this.lastFrameAlpha;
            const dpr = this.dpr;
            const self = this;
            if (haveMotionBLur) {
                if (!this.domBack) {
                    this.createBackBuffer();
                }
                this.ctxBack.globalCompositeOperation = 'copy';
                this.ctxBack.drawImage(dom, 0, 0, width / dpr, height / dpr);
            }
            const domBack = this.domBack;
            function doClear(x, y, width, height) {
                ctx.clearRect(x, y, width, height);
                if (clearColor && clearColor !== 'transparent') {
                    let clearColorGradientOrPattern;
                    if (isGradientObject(clearColor)) {
                        const shouldCache = clearColor.global || (clearColor.__width === width
                            && clearColor.__height === height);
                        clearColorGradientOrPattern = shouldCache
                            && clearColor.__canvasGradient
                            || getCanvasGradient(ctx, clearColor, {
                                x: 0,
                                y: 0,
                                width: width,
                                height: height
                            });
                        clearColor.__canvasGradient = clearColorGradientOrPattern;
                        clearColor.__width = width;
                        clearColor.__height = height;
                    }
                    else if (isImagePatternObject(clearColor)) {
                        clearColor.scaleX = clearColor.scaleX || dpr;
                        clearColor.scaleY = clearColor.scaleY || dpr;
                        clearColorGradientOrPattern = createCanvasPattern(ctx, clearColor, {
                            dirty() {
                                self.setUnpainted();
                                self.painter.refresh();
                            }
                        });
                    }
                    ctx.save();
                    ctx.fillStyle = clearColorGradientOrPattern || clearColor;
                    ctx.fillRect(x, y, width, height);
                    ctx.restore();
                }
                if (haveMotionBLur) {
                    ctx.save();
                    ctx.globalAlpha = lastFrameAlpha;
                    ctx.drawImage(domBack, x, y, width, height);
                    ctx.restore();
                }
            }
            if (!repaintRects || haveMotionBLur) {
                doClear(0, 0, width, height);
            }
            else if (repaintRects.length) {
                each(repaintRects, rect => {
                    doClear(rect.x * dpr, rect.y * dpr, rect.width * dpr, rect.height * dpr);
                });
            }
        }
    }

    const HOVER_LAYER_ZLEVEL = 1e5;
    const CANVAS_ZLEVEL = 314159;
    const EL_AFTER_INCREMENTAL_INC = 0.01;
    const INCREMENTAL_INC = 0.001;
    function isLayerValid(layer) {
        if (!layer) {
            return false;
        }
        if (layer.__builtin__) {
            return true;
        }
        if (typeof (layer.resize) !== 'function'
            || typeof (layer.refresh) !== 'function') {
            return false;
        }
        return true;
    }
    function createRoot(width, height) {
        const domRoot = document.createElement('div');
        domRoot.style.cssText = [
            'position:relative',
            'width:' + width + 'px',
            'height:' + height + 'px',
            'padding:0',
            'margin:0',
            'border-width:0'
        ].join(';') + ';';
        return domRoot;
    }
    class CanvasPainter {
        constructor(root, storage, opts, id) {
            this.type = 'canvas';
            this._zlevelList = [];
            this._prevDisplayList = [];
            this._layers = {};
            this._layerConfig = {};
            this._needsManuallyCompositing = false;
            this.type = 'canvas';
            const singleCanvas = !root.nodeName
                || root.nodeName.toUpperCase() === 'CANVAS';
            this._opts = opts = extend({}, opts || {});
            this.dpr = opts.devicePixelRatio || devicePixelRatio;
            this._singleCanvas = singleCanvas;
            this.root = root;
            const rootStyle = root.style;
            if (rootStyle) {
                disableUserSelect(root);
                root.innerHTML = '';
            }
            this.storage = storage;
            const zlevelList = this._zlevelList;
            this._prevDisplayList = [];
            const layers = this._layers;
            if (!singleCanvas) {
                this._width = getSize(root, 0, opts);
                this._height = getSize(root, 1, opts);
                const domRoot = this._domRoot = createRoot(this._width, this._height);
                root.appendChild(domRoot);
            }
            else {
                const rootCanvas = root;
                let width = rootCanvas.width;
                let height = rootCanvas.height;
                if (opts.width != null) {
                    width = opts.width;
                }
                if (opts.height != null) {
                    height = opts.height;
                }
                this.dpr = opts.devicePixelRatio || 1;
                rootCanvas.width = width * this.dpr;
                rootCanvas.height = height * this.dpr;
                this._width = width;
                this._height = height;
                const mainLayer = new Layer(rootCanvas, this, this.dpr);
                mainLayer.__builtin__ = true;
                mainLayer.initContext();
                layers[CANVAS_ZLEVEL] = mainLayer;
                mainLayer.zlevel = CANVAS_ZLEVEL;
                zlevelList.push(CANVAS_ZLEVEL);
                this._domRoot = root;
            }
        }
        getType() {
            return 'canvas';
        }
        isSingleCanvas() {
            return this._singleCanvas;
        }
        getViewportRoot() {
            return this._domRoot;
        }
        getViewportRootOffset() {
            const viewportRoot = this.getViewportRoot();
            if (viewportRoot) {
                return {
                    offsetLeft: viewportRoot.offsetLeft || 0,
                    offsetTop: viewportRoot.offsetTop || 0
                };
            }
        }
        refresh(paintAll) {
            const list = this.storage.getDisplayList(true);
            const prevList = this._prevDisplayList;
            const zlevelList = this._zlevelList;
            this._redrawId = Math.random();
            this._paintList(list, prevList, paintAll, this._redrawId);
            for (let i = 0; i < zlevelList.length; i++) {
                const z = zlevelList[i];
                const layer = this._layers[z];
                if (!layer.__builtin__ && layer.refresh) {
                    const clearColor = i === 0 ? this._backgroundColor : null;
                    layer.refresh(clearColor);
                }
            }
            if (this._opts.useDirtyRect) {
                this._prevDisplayList = list.slice();
            }
            return this;
        }
        refreshHover() {
            this._paintHoverList(this.storage.getDisplayList(false));
        }
        _paintHoverList(list) {
            let len = list.length;
            let hoverLayer = this._hoverlayer;
            hoverLayer && hoverLayer.clear();
            if (!len) {
                return;
            }
            const scope = {
                inHover: true,
                viewWidth: this._width,
                viewHeight: this._height
            };
            let ctx;
            for (let i = 0; i < len; i++) {
                const el = list[i];
                if (el.__inHover) {
                    if (!hoverLayer) {
                        hoverLayer = this._hoverlayer = this.getLayer(HOVER_LAYER_ZLEVEL);
                    }
                    if (!ctx) {
                        ctx = hoverLayer.ctx;
                        ctx.save();
                    }
                    brush(ctx, el, scope, i === len - 1);
                }
            }
            if (ctx) {
                ctx.restore();
            }
        }
        getHoverLayer() {
            return this.getLayer(HOVER_LAYER_ZLEVEL);
        }
        paintOne(ctx, el) {
            brushSingle(ctx, el);
        }
        _paintList(list, prevList, paintAll, redrawId) {
            if (this._redrawId !== redrawId) {
                return;
            }
            paintAll = paintAll || false;
            this._updateLayerStatus(list);
            const { finished, needsRefreshHover } = this._doPaintList(list, prevList, paintAll);
            if (this._needsManuallyCompositing) {
                this._compositeManually();
            }
            if (needsRefreshHover) {
                this._paintHoverList(list);
            }
            if (!finished) {
                const self = this;
                requestAnimationFrame$1(function () {
                    self._paintList(list, prevList, paintAll, redrawId);
                });
            }
            else {
                this.eachLayer(layer => {
                    layer.afterBrush && layer.afterBrush();
                });
            }
        }
        _compositeManually() {
            const ctx = this.getLayer(CANVAS_ZLEVEL).ctx;
            const width = this._domRoot.width;
            const height = this._domRoot.height;
            ctx.clearRect(0, 0, width, height);
            this.eachBuiltinLayer(function (layer) {
                if (layer.virtual) {
                    ctx.drawImage(layer.dom, 0, 0, width, height);
                }
            });
        }
        _doPaintList(list, prevList, paintAll) {
            const layerList = [];
            const useDirtyRect = this._opts.useDirtyRect;
            for (let zi = 0; zi < this._zlevelList.length; zi++) {
                const zlevel = this._zlevelList[zi];
                const layer = this._layers[zlevel];
                if (layer.__builtin__
                    && layer !== this._hoverlayer
                    && (layer.__dirty || paintAll)) {
                    layerList.push(layer);
                }
            }
            let finished = true;
            let needsRefreshHover = false;
            for (let k = 0; k < layerList.length; k++) {
                const layer = layerList[k];
                const ctx = layer.ctx;
                const repaintRects = useDirtyRect
                    && layer.createRepaintRects(list, prevList, this._width, this._height);
                let start = paintAll ? layer.__startIndex : layer.__drawIndex;
                const useTimer = !paintAll && layer.incremental && Date.now;
                const startTime = useTimer && Date.now();
                const clearColor = layer.zlevel === this._zlevelList[0]
                    ? this._backgroundColor : null;
                if (layer.__startIndex === layer.__endIndex) {
                    layer.clear(false, clearColor, repaintRects);
                }
                else if (start === layer.__startIndex) {
                    const firstEl = list[start];
                    if (!firstEl.incremental || !firstEl.notClear || paintAll) {
                        layer.clear(false, clearColor, repaintRects);
                    }
                }
                if (start === -1) {
                    console.error('For some unknown reason. drawIndex is -1');
                    start = layer.__startIndex;
                }
                let i;
                const repaint = (repaintRect) => {
                    const scope = {
                        inHover: false,
                        allClipped: false,
                        prevEl: null,
                        viewWidth: this._width,
                        viewHeight: this._height
                    };
                    for (i = start; i < layer.__endIndex; i++) {
                        const el = list[i];
                        if (el.__inHover) {
                            needsRefreshHover = true;
                        }
                        this._doPaintEl(el, layer, useDirtyRect, repaintRect, scope, i === layer.__endIndex - 1);
                        if (useTimer) {
                            const dTime = Date.now() - startTime;
                            if (dTime > 15) {
                                break;
                            }
                        }
                    }
                    if (scope.prevElClipPaths) {
                        ctx.restore();
                    }
                };
                if (repaintRects) {
                    if (repaintRects.length === 0) {
                        i = layer.__endIndex;
                    }
                    else {
                        const dpr = this.dpr;
                        for (var r = 0; r < repaintRects.length; ++r) {
                            const rect = repaintRects[r];
                            ctx.save();
                            ctx.beginPath();
                            ctx.rect(rect.x * dpr, rect.y * dpr, rect.width * dpr, rect.height * dpr);
                            ctx.clip();
                            repaint(rect);
                            ctx.restore();
                        }
                    }
                }
                else {
                    ctx.save();
                    repaint();
                    ctx.restore();
                }
                layer.__drawIndex = i;
                if (layer.__drawIndex < layer.__endIndex) {
                    finished = false;
                }
            }
            if (env.wxa) {
                each(this._layers, function (layer) {
                    if (layer && layer.ctx && layer.ctx.draw) {
                        layer.ctx.draw();
                    }
                });
            }
            return {
                finished,
                needsRefreshHover
            };
        }
        _doPaintEl(el, currentLayer, useDirtyRect, repaintRect, scope, isLast) {
            const ctx = currentLayer.ctx;
            if (useDirtyRect) {
                const paintRect = el.getPaintRect();
                if (!repaintRect || paintRect && paintRect.intersect(repaintRect)) {
                    brush(ctx, el, scope, isLast);
                    el.setPrevPaintRect(paintRect);
                }
            }
            else {
                brush(ctx, el, scope, isLast);
            }
        }
        getLayer(zlevel, virtual) {
            if (this._singleCanvas && !this._needsManuallyCompositing) {
                zlevel = CANVAS_ZLEVEL;
            }
            let layer = this._layers[zlevel];
            if (!layer) {
                layer = new Layer('zr_' + zlevel, this, this.dpr);
                layer.zlevel = zlevel;
                layer.__builtin__ = true;
                if (this._layerConfig[zlevel]) {
                    merge(layer, this._layerConfig[zlevel], true);
                }
                else if (this._layerConfig[zlevel - EL_AFTER_INCREMENTAL_INC]) {
                    merge(layer, this._layerConfig[zlevel - EL_AFTER_INCREMENTAL_INC], true);
                }
                if (virtual) {
                    layer.virtual = virtual;
                }
                this.insertLayer(zlevel, layer);
                layer.initContext();
            }
            return layer;
        }
        insertLayer(zlevel, layer) {
            const layersMap = this._layers;
            const zlevelList = this._zlevelList;
            const len = zlevelList.length;
            const domRoot = this._domRoot;
            let prevLayer = null;
            let i = -1;
            if (layersMap[zlevel]) {
                {
                    logError('ZLevel ' + zlevel + ' has been used already');
                }
                return;
            }
            if (!isLayerValid(layer)) {
                {
                    logError('Layer of zlevel ' + zlevel + ' is not valid');
                }
                return;
            }
            if (len > 0 && zlevel > zlevelList[0]) {
                for (i = 0; i < len - 1; i++) {
                    if (zlevelList[i] < zlevel
                        && zlevelList[i + 1] > zlevel) {
                        break;
                    }
                }
                prevLayer = layersMap[zlevelList[i]];
            }
            zlevelList.splice(i + 1, 0, zlevel);
            layersMap[zlevel] = layer;
            if (!layer.virtual) {
                if (prevLayer) {
                    const prevDom = prevLayer.dom;
                    if (prevDom.nextSibling) {
                        domRoot.insertBefore(layer.dom, prevDom.nextSibling);
                    }
                    else {
                        domRoot.appendChild(layer.dom);
                    }
                }
                else {
                    if (domRoot.firstChild) {
                        domRoot.insertBefore(layer.dom, domRoot.firstChild);
                    }
                    else {
                        domRoot.appendChild(layer.dom);
                    }
                }
            }
            layer.painter || (layer.painter = this);
        }
        eachLayer(cb, context) {
            const zlevelList = this._zlevelList;
            for (let i = 0; i < zlevelList.length; i++) {
                const z = zlevelList[i];
                cb.call(context, this._layers[z], z);
            }
        }
        eachBuiltinLayer(cb, context) {
            const zlevelList = this._zlevelList;
            for (let i = 0; i < zlevelList.length; i++) {
                const z = zlevelList[i];
                const layer = this._layers[z];
                if (layer.__builtin__) {
                    cb.call(context, layer, z);
                }
            }
        }
        eachOtherLayer(cb, context) {
            const zlevelList = this._zlevelList;
            for (let i = 0; i < zlevelList.length; i++) {
                const z = zlevelList[i];
                const layer = this._layers[z];
                if (!layer.__builtin__) {
                    cb.call(context, layer, z);
                }
            }
        }
        getLayers() {
            return this._layers;
        }
        _updateLayerStatus(list) {
            this.eachBuiltinLayer(function (layer, z) {
                layer.__dirty = layer.__used = false;
            });
            function updatePrevLayer(idx) {
                if (prevLayer) {
                    if (prevLayer.__endIndex !== idx) {
                        prevLayer.__dirty = true;
                    }
                    prevLayer.__endIndex = idx;
                }
            }
            if (this._singleCanvas) {
                for (let i = 1; i < list.length; i++) {
                    const el = list[i];
                    if (el.zlevel !== list[i - 1].zlevel || el.incremental) {
                        this._needsManuallyCompositing = true;
                        break;
                    }
                }
            }
            let prevLayer = null;
            let incrementalLayerCount = 0;
            let prevZlevel;
            let i;
            for (i = 0; i < list.length; i++) {
                const el = list[i];
                const zlevel = el.zlevel;
                let layer;
                if (prevZlevel !== zlevel) {
                    prevZlevel = zlevel;
                    incrementalLayerCount = 0;
                }
                if (el.incremental) {
                    layer = this.getLayer(zlevel + INCREMENTAL_INC, this._needsManuallyCompositing);
                    layer.incremental = true;
                    incrementalLayerCount = 1;
                }
                else {
                    layer = this.getLayer(zlevel + (incrementalLayerCount > 0 ? EL_AFTER_INCREMENTAL_INC : 0), this._needsManuallyCompositing);
                }
                if (!layer.__builtin__) {
                    logError('ZLevel ' + zlevel + ' has been used by unkown layer ' + layer.id);
                }
                if (layer !== prevLayer) {
                    layer.__used = true;
                    if (layer.__startIndex !== i) {
                        layer.__dirty = true;
                    }
                    layer.__startIndex = i;
                    if (!layer.incremental) {
                        layer.__drawIndex = i;
                    }
                    else {
                        layer.__drawIndex = -1;
                    }
                    updatePrevLayer(i);
                    prevLayer = layer;
                }
                if ((el.__dirty & REDRAW_BIT) && !el.__inHover) {
                    layer.__dirty = true;
                    if (layer.incremental && layer.__drawIndex < 0) {
                        layer.__drawIndex = i;
                    }
                }
            }
            updatePrevLayer(i);
            this.eachBuiltinLayer(function (layer, z) {
                if (!layer.__used && layer.getElementCount() > 0) {
                    layer.__dirty = true;
                    layer.__startIndex = layer.__endIndex = layer.__drawIndex = 0;
                }
                if (layer.__dirty && layer.__drawIndex < 0) {
                    layer.__drawIndex = layer.__startIndex;
                }
            });
        }
        clear() {
            this.eachBuiltinLayer(this._clearLayer);
            return this;
        }
        _clearLayer(layer) {
            layer.clear();
        }
        setBackgroundColor(backgroundColor) {
            this._backgroundColor = backgroundColor;
            each(this._layers, layer => {
                layer.setUnpainted();
            });
        }
        configLayer(zlevel, config) {
            if (config) {
                const layerConfig = this._layerConfig;
                if (!layerConfig[zlevel]) {
                    layerConfig[zlevel] = config;
                }
                else {
                    merge(layerConfig[zlevel], config, true);
                }
                for (let i = 0; i < this._zlevelList.length; i++) {
                    const _zlevel = this._zlevelList[i];
                    if (_zlevel === zlevel || _zlevel === zlevel + EL_AFTER_INCREMENTAL_INC) {
                        const layer = this._layers[_zlevel];
                        merge(layer, layerConfig[zlevel], true);
                    }
                }
            }
        }
        delLayer(zlevel) {
            const layers = this._layers;
            const zlevelList = this._zlevelList;
            const layer = layers[zlevel];
            if (!layer) {
                return;
            }
            layer.dom.parentNode.removeChild(layer.dom);
            delete layers[zlevel];
            zlevelList.splice(indexOf(zlevelList, zlevel), 1);
        }
        resize(width, height) {
            if (!this._domRoot.style) {
                if (width == null || height == null) {
                    return;
                }
                this._width = width;
                this._height = height;
                this.getLayer(CANVAS_ZLEVEL).resize(width, height);
            }
            else {
                const domRoot = this._domRoot;
                domRoot.style.display = 'none';
                const opts = this._opts;
                const root = this.root;
                width != null && (opts.width = width);
                height != null && (opts.height = height);
                width = getSize(root, 0, opts);
                height = getSize(root, 1, opts);
                domRoot.style.display = '';
                if (this._width !== width || height !== this._height) {
                    domRoot.style.width = width + 'px';
                    domRoot.style.height = height + 'px';
                    for (let id in this._layers) {
                        if (this._layers.hasOwnProperty(id)) {
                            this._layers[id].resize(width, height);
                        }
                    }
                    this.refresh(true);
                }
                this._width = width;
                this._height = height;
            }
            return this;
        }
        clearLayer(zlevel) {
            const layer = this._layers[zlevel];
            if (layer) {
                layer.clear();
            }
        }
        dispose() {
            this.root.innerHTML = '';
            this.root =
                this.storage =
                    this._domRoot =
                        this._layers = null;
        }
        getRenderedCanvas(opts) {
            opts = opts || {};
            if (this._singleCanvas && !this._compositeManually) {
                return this._layers[CANVAS_ZLEVEL].dom;
            }
            const imageLayer = new Layer('image', this, opts.pixelRatio || this.dpr);
            imageLayer.initContext();
            imageLayer.clear(false, opts.backgroundColor || this._backgroundColor);
            const ctx = imageLayer.ctx;
            if (opts.pixelRatio <= this.dpr) {
                this.refresh();
                const width = imageLayer.dom.width;
                const height = imageLayer.dom.height;
                this.eachLayer(function (layer) {
                    if (layer.__builtin__) {
                        ctx.drawImage(layer.dom, 0, 0, width, height);
                    }
                    else if (layer.renderToCanvas) {
                        ctx.save();
                        layer.renderToCanvas(ctx);
                        ctx.restore();
                    }
                });
            }
            else {
                const scope = {
                    inHover: false,
                    viewWidth: this._width,
                    viewHeight: this._height
                };
                const displayList = this.storage.getDisplayList(true);
                for (let i = 0, len = displayList.length; i < len; i++) {
                    const el = displayList[i];
                    brush(ctx, el, scope, i === len - 1);
                }
            }
            return imageLayer.dom;
        }
        getWidth() {
            return this._width;
        }
        getHeight() {
            return this._height;
        }
    }

    const mathSin$4 = Math.sin;
    const mathCos$4 = Math.cos;
    const PI$5 = Math.PI;
    const PI2$6 = Math.PI * 2;
    const degree = 180 / PI$5;
    class SVGPathRebuilder {
        reset(precision) {
            this._start = true;
            this._d = [];
            this._str = '';
            this._p = Math.pow(10, precision || 4);
        }
        moveTo(x, y) {
            this._add('M', x, y);
        }
        lineTo(x, y) {
            this._add('L', x, y);
        }
        bezierCurveTo(x, y, x2, y2, x3, y3) {
            this._add('C', x, y, x2, y2, x3, y3);
        }
        quadraticCurveTo(x, y, x2, y2) {
            this._add('Q', x, y, x2, y2);
        }
        arc(cx, cy, r, startAngle, endAngle, anticlockwise) {
            this.ellipse(cx, cy, r, r, 0, startAngle, endAngle, anticlockwise);
        }
        ellipse(cx, cy, rx, ry, psi, startAngle, endAngle, anticlockwise) {
            let dTheta = endAngle - startAngle;
            const clockwise = !anticlockwise;
            const dThetaPositive = Math.abs(dTheta);
            const isCircle = isAroundZero$1(dThetaPositive - PI2$6)
                || (clockwise ? dTheta >= PI2$6 : -dTheta >= PI2$6);
            const unifiedTheta = dTheta > 0 ? dTheta % PI2$6 : (dTheta % PI2$6 + PI2$6);
            let large = false;
            if (isCircle) {
                large = true;
            }
            else if (isAroundZero$1(dThetaPositive)) {
                large = false;
            }
            else {
                large = (unifiedTheta >= PI$5) === !!clockwise;
            }
            const x0 = cx + rx * mathCos$4(startAngle);
            const y0 = cy + ry * mathSin$4(startAngle);
            if (this._start) {
                this._add('M', x0, y0);
            }
            const xRot = Math.round(psi * degree);
            if (isCircle) {
                const p = 1 / this._p;
                const dTheta = (clockwise ? 1 : -1) * (PI2$6 - p);
                this._add('A', rx, ry, xRot, 1, +clockwise, cx + rx * mathCos$4(startAngle + dTheta), cy + ry * mathSin$4(startAngle + dTheta));
                if (p > 1e-2) {
                    this._add('A', rx, ry, xRot, 0, +clockwise, x0, y0);
                }
            }
            else {
                const x = cx + rx * mathCos$4(endAngle);
                const y = cy + ry * mathSin$4(endAngle);
                this._add('A', rx, ry, xRot, +large, +clockwise, x, y);
            }
        }
        rect(x, y, w, h) {
            this._add('M', x, y);
            this._add('l', w, 0);
            this._add('l', 0, h);
            this._add('l', -w, 0);
            this._add('Z');
        }
        closePath() {
            if (this._d.length > 0) {
                this._add('Z');
            }
        }
        _add(cmd, a, b, c, d, e, f, g, h) {
            const vals = [];
            const p = this._p;
            for (let i = 1; i < arguments.length; i++) {
                const val = arguments[i];
                if (isNaN(val)) {
                    this._invalid = true;
                    return;
                }
                vals.push(Math.round(val * p) / p);
            }
            this._d.push(cmd + vals.join(' '));
            this._start = cmd === 'Z';
        }
        generateStr() {
            this._str = this._invalid ? '' : this._d.join('');
            this._d = [];
        }
        getStr() {
            return this._str;
        }
    }

    const NONE = 'none';
    const mathRound$1 = Math.round;
    function pathHasFill(style) {
        const fill = style.fill;
        return fill != null && fill !== NONE;
    }
    function pathHasStroke(style) {
        const stroke = style.stroke;
        return stroke != null && stroke !== NONE;
    }
    const strokeProps = ['lineCap', 'miterLimit', 'lineJoin'];
    const svgStrokeProps = map(strokeProps, prop => `stroke-${prop.toLowerCase()}`);
    function mapStyleToAttrs(updateAttr, style, el, forceUpdate) {
        const opacity = style.opacity == null ? 1 : style.opacity;
        if (el instanceof ZRImage) {
            updateAttr('opacity', opacity);
            return;
        }
        if (pathHasFill(style)) {
            const fill = normalizeColor(style.fill);
            updateAttr('fill', fill.color);
            const fillOpacity = style.fillOpacity != null
                ? style.fillOpacity * fill.opacity * opacity
                : fill.opacity * opacity;
            if (forceUpdate || fillOpacity < 1) {
                updateAttr('fill-opacity', fillOpacity);
            }
        }
        else {
            updateAttr('fill', NONE);
        }
        if (pathHasStroke(style)) {
            const stroke = normalizeColor(style.stroke);
            updateAttr('stroke', stroke.color);
            const strokeScale = style.strokeNoScale
                ? el.getLineScale()
                : 1;
            const strokeWidth = (strokeScale ? (style.lineWidth || 0) / strokeScale : 0);
            const strokeOpacity = style.strokeOpacity != null
                ? style.strokeOpacity * stroke.opacity * opacity
                : stroke.opacity * opacity;
            const strokeFirst = style.strokeFirst;
            if (forceUpdate || strokeWidth !== 1) {
                updateAttr('stroke-width', strokeWidth);
            }
            if (forceUpdate || strokeFirst) {
                updateAttr('paint-order', strokeFirst ? 'stroke' : 'fill');
            }
            if (forceUpdate || strokeOpacity < 1) {
                updateAttr('stroke-opacity', strokeOpacity);
            }
            if (style.lineDash) {
                let [lineDash, lineDashOffset] = getLineDash(el);
                if (lineDash) {
                    lineDashOffset = mathRound$1(lineDashOffset || 0);
                    updateAttr('stroke-dasharray', lineDash.join(','));
                    if (lineDashOffset || forceUpdate) {
                        updateAttr('stroke-dashoffset', lineDashOffset);
                    }
                }
            }
            else if (forceUpdate) {
                updateAttr('stroke-dasharray', NONE);
            }
            for (let i = 0; i < strokeProps.length; i++) {
                const propName = strokeProps[i];
                if (forceUpdate || style[propName] !== DEFAULT_PATH_STYLE[propName]) {
                    const val = style[propName] || DEFAULT_PATH_STYLE[propName];
                    val && updateAttr(svgStrokeProps[i], val);
                }
            }
        }
        else if (forceUpdate) {
            updateAttr('stroke', NONE);
        }
    }

    const SVGNS = 'http://www.w3.org/2000/svg';
    const XLINKNS = 'http://www.w3.org/1999/xlink';
    const XMLNS = 'http://www.w3.org/2000/xmlns/';
    const XML_NAMESPACE = 'http://www.w3.org/XML/1998/namespace';
    const META_DATA_PREFIX = 'ecmeta_';
    function createElement(name) {
        return document.createElementNS(SVGNS, name);
    }
    function createVNode(tag, key, attrs, children, text) {
        return {
            tag,
            attrs: attrs || {},
            children,
            text,
            key
        };
    }
    function createElementOpen(name, attrs) {
        const attrsStr = [];
        if (attrs) {
            for (let key in attrs) {
                const val = attrs[key];
                let part = key;
                if (val === false) {
                    continue;
                }
                else if (val !== true && val != null) {
                    part += `="${val}"`;
                }
                attrsStr.push(part);
            }
        }
        return `<${name} ${attrsStr.join(' ')}>`;
    }
    function createElementClose(name) {
        return `</${name}>`;
    }
    function vNodeToString(el, opts) {
        opts = opts || {};
        const S = opts.newline ? '\n' : '';
        function convertElToString(el) {
            const { children, tag, attrs, text } = el;
            return createElementOpen(tag, attrs)
                + (tag !== 'style' ? encodeHTML(text) : text || '')
                + (children ? `${S}${map(children, child => convertElToString(child)).join(S)}${S}` : '')
                + createElementClose(tag);
        }
        return convertElToString(el);
    }
    function getCssString(selectorNodes, animationNodes, opts) {
        opts = opts || {};
        const S = opts.newline ? '\n' : '';
        const bracketBegin = ` {${S}`;
        const bracketEnd = `${S}}`;
        const selectors = map(keys(selectorNodes), className => {
            return className + bracketBegin + map(keys(selectorNodes[className]), attrName => {
                return `${attrName}:${selectorNodes[className][attrName]};`;
            }).join(S) + bracketEnd;
        }).join(S);
        const animations = map(keys(animationNodes), (animationName) => {
            return `@keyframes ${animationName}${bracketBegin}` + map(keys(animationNodes[animationName]), percent => {
                return percent + bracketBegin + map(keys(animationNodes[animationName][percent]), attrName => {
                    let val = animationNodes[animationName][percent][attrName];
                    if (attrName === 'd') {
                        val = `path("${val}")`;
                    }
                    return `${attrName}:${val};`;
                }).join(S) + bracketEnd;
            }).join(S) + bracketEnd;
        }).join(S);
        if (!selectors && !animations) {
            return '';
        }
        return ['<![CDATA[', selectors, animations, ']]>'].join(S);
    }
    function createBrushScope(zrId) {
        return {
            zrId,
            shadowCache: {},
            patternCache: {},
            gradientCache: {},
            clipPathCache: {},
            defs: {},
            cssNodes: {},
            cssAnims: {},
            cssStyleCache: {},
            cssAnimIdx: 0,
            shadowIdx: 0,
            gradientIdx: 0,
            patternIdx: 0,
            clipPathIdx: 0
        };
    }
    function createSVGVNode(width, height, children, useViewBox) {
        return createVNode('svg', 'root', {
            'width': width,
            'height': height,
            'xmlns': SVGNS,
            'xmlns:xlink': XLINKNS,
            'version': '1.1',
            'baseProfile': 'full',
            'viewBox': useViewBox ? `0 0 ${width} ${height}` : false
        }, children);
    }

    let cssClassIdx = 0;
    function getClassId() {
        return cssClassIdx++;
    }

    const EASING_MAP = {
        cubicIn: '0.32,0,0.67,0',
        cubicOut: '0.33,1,0.68,1',
        cubicInOut: '0.65,0,0.35,1',
        quadraticIn: '0.11,0,0.5,0',
        quadraticOut: '0.5,1,0.89,1',
        quadraticInOut: '0.45,0,0.55,1',
        quarticIn: '0.5,0,0.75,0',
        quarticOut: '0.25,1,0.5,1',
        quarticInOut: '0.76,0,0.24,1',
        quinticIn: '0.64,0,0.78,0',
        quinticOut: '0.22,1,0.36,1',
        quinticInOut: '0.83,0,0.17,1',
        sinusoidalIn: '0.12,0,0.39,0',
        sinusoidalOut: '0.61,1,0.88,1',
        sinusoidalInOut: '0.37,0,0.63,1',
        exponentialIn: '0.7,0,0.84,0',
        exponentialOut: '0.16,1,0.3,1',
        exponentialInOut: '0.87,0,0.13,1',
        circularIn: '0.55,0,1,0.45',
        circularOut: '0,0.55,0.45,1',
        circularInOut: '0.85,0,0.15,1'
    };
    const transformOriginKey = 'transform-origin';
    function buildPathString(el, kfShape, path) {
        const shape = extend({}, el.shape);
        extend(shape, kfShape);
        el.buildPath(path, shape);
        const svgPathBuilder = new SVGPathRebuilder();
        svgPathBuilder.reset(getPathPrecision(el));
        path.rebuildPath(svgPathBuilder, 1);
        svgPathBuilder.generateStr();
        return svgPathBuilder.getStr();
    }
    function setTransformOrigin(target, transform) {
        const { originX, originY } = transform;
        if (originX || originY) {
            target[transformOriginKey] = `${originX}px ${originY}px`;
        }
    }
    const ANIMATE_STYLE_MAP = {
        fill: 'fill',
        opacity: 'opacity',
        lineWidth: 'stroke-width',
        lineDashOffset: 'stroke-dashoffset'
    };
    function addAnimation(cssAnim, scope) {
        const animationName = scope.zrId + '-ani-' + scope.cssAnimIdx++;
        scope.cssAnims[animationName] = cssAnim;
        return animationName;
    }
    function createCompoundPathCSSAnimation(el, attrs, scope) {
        const paths = el.shape.paths;
        const composedAnim = {};
        let cssAnimationCfg;
        let cssAnimationName;
        each(paths, path => {
            const subScope = createBrushScope(scope.zrId);
            subScope.animation = true;
            createCSSAnimation(path, {}, subScope, true);
            const cssAnims = subScope.cssAnims;
            const cssNodes = subScope.cssNodes;
            const animNames = keys(cssAnims);
            const len = animNames.length;
            if (!len) {
                return;
            }
            cssAnimationName = animNames[len - 1];
            const lastAnim = cssAnims[cssAnimationName];
            for (let percent in lastAnim) {
                const kf = lastAnim[percent];
                composedAnim[percent] = composedAnim[percent] || { d: '' };
                composedAnim[percent].d += kf.d || '';
            }
            for (let className in cssNodes) {
                const val = cssNodes[className].animation;
                if (val.indexOf(cssAnimationName) >= 0) {
                    cssAnimationCfg = val;
                }
            }
        });
        if (!cssAnimationCfg) {
            return;
        }
        attrs.d = false;
        const animationName = addAnimation(composedAnim, scope);
        return cssAnimationCfg.replace(cssAnimationName, animationName);
    }
    function getEasingFunc(easing) {
        return isString(easing)
            ? EASING_MAP[easing]
                ? `cubic-bezier(${EASING_MAP[easing]})`
                : createCubicEasingFunc(easing) ? easing : ''
            : '';
    }
    function createCSSAnimation(el, attrs, scope, onlyShape) {
        const animators = el.animators;
        const len = animators.length;
        const cssAnimations = [];
        if (el instanceof CompoundPath) {
            const animationCfg = createCompoundPathCSSAnimation(el, attrs, scope);
            if (animationCfg) {
                cssAnimations.push(animationCfg);
            }
            else if (!len) {
                return;
            }
        }
        else if (!len) {
            return;
        }
        const groupAnimators = {};
        for (let i = 0; i < len; i++) {
            const animator = animators[i];
            const cfgArr = [animator.getMaxTime() / 1000 + 's'];
            const easing = getEasingFunc(animator.getClip().easing);
            const delay = animator.getDelay();
            if (easing) {
                cfgArr.push(easing);
            }
            else {
                cfgArr.push('linear');
            }
            if (delay) {
                cfgArr.push(delay / 1000 + 's');
            }
            if (animator.getLoop()) {
                cfgArr.push('infinite');
            }
            const cfg = cfgArr.join(' ');
            groupAnimators[cfg] = groupAnimators[cfg] || [cfg, []];
            groupAnimators[cfg][1].push(animator);
        }
        function createSingleCSSAnimation(groupAnimator) {
            const animators = groupAnimator[1];
            const len = animators.length;
            const transformKfs = {};
            const shapeKfs = {};
            const finalKfs = {};
            const animationTimingFunctionAttrName = 'animation-timing-function';
            function saveAnimatorTrackToCssKfs(animator, cssKfs, toCssAttrName) {
                const tracks = animator.getTracks();
                const maxTime = animator.getMaxTime();
                for (let k = 0; k < tracks.length; k++) {
                    const track = tracks[k];
                    if (track.needsAnimate()) {
                        const kfs = track.keyframes;
                        let attrName = track.propName;
                        toCssAttrName && (attrName = toCssAttrName(attrName));
                        if (attrName) {
                            for (let i = 0; i < kfs.length; i++) {
                                const kf = kfs[i];
                                const percent = Math.round(kf.time / maxTime * 100) + '%';
                                const kfEasing = getEasingFunc(kf.easing);
                                const rawValue = kf.rawValue;
                                if (isString(rawValue) || isNumber(rawValue)) {
                                    cssKfs[percent] = cssKfs[percent] || {};
                                    cssKfs[percent][attrName] = kf.rawValue;
                                    if (kfEasing) {
                                        cssKfs[percent][animationTimingFunctionAttrName] = kfEasing;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            for (let i = 0; i < len; i++) {
                const animator = animators[i];
                const targetProp = animator.targetName;
                if (!targetProp) {
                    !onlyShape && saveAnimatorTrackToCssKfs(animator, transformKfs);
                }
                else if (targetProp === 'shape') {
                    saveAnimatorTrackToCssKfs(animator, shapeKfs);
                }
            }
            for (let percent in transformKfs) {
                const transform = {};
                copyTransform(transform, el);
                extend(transform, transformKfs[percent]);
                const str = getSRTTransformString(transform);
                const timingFunction = transformKfs[percent][animationTimingFunctionAttrName];
                finalKfs[percent] = str ? {
                    transform: str
                } : {};
                setTransformOrigin(finalKfs[percent], transform);
                if (timingFunction) {
                    finalKfs[percent][animationTimingFunctionAttrName] = timingFunction;
                }
            }
            let path;
            let canAnimateShape = true;
            for (let percent in shapeKfs) {
                finalKfs[percent] = finalKfs[percent] || {};
                const isFirst = !path;
                const timingFunction = shapeKfs[percent][animationTimingFunctionAttrName];
                if (isFirst) {
                    path = new PathProxy();
                }
                let len = path.len();
                path.reset();
                finalKfs[percent].d = buildPathString(el, shapeKfs[percent], path);
                let newLen = path.len();
                if (!isFirst && len !== newLen) {
                    canAnimateShape = false;
                    break;
                }
                if (timingFunction) {
                    finalKfs[percent][animationTimingFunctionAttrName] = timingFunction;
                }
            }
            if (!canAnimateShape) {
                for (let percent in finalKfs) {
                    delete finalKfs[percent].d;
                }
            }
            if (!onlyShape) {
                for (let i = 0; i < len; i++) {
                    const animator = animators[i];
                    const targetProp = animator.targetName;
                    if (targetProp === 'style') {
                        saveAnimatorTrackToCssKfs(animator, finalKfs, (propName) => ANIMATE_STYLE_MAP[propName]);
                    }
                }
            }
            const percents = keys(finalKfs);
            let allTransformOriginSame = true;
            let transformOrigin;
            for (let i = 1; i < percents.length; i++) {
                const p0 = percents[i - 1];
                const p1 = percents[i];
                if (finalKfs[p0][transformOriginKey] !== finalKfs[p1][transformOriginKey]) {
                    allTransformOriginSame = false;
                    break;
                }
                transformOrigin = finalKfs[p0][transformOriginKey];
            }
            if (allTransformOriginSame && transformOrigin) {
                for (const percent in finalKfs) {
                    if (finalKfs[percent][transformOriginKey]) {
                        delete finalKfs[percent][transformOriginKey];
                    }
                }
                attrs[transformOriginKey] = transformOrigin;
            }
            if (filter(percents, (percent) => keys(finalKfs[percent]).length > 0).length) {
                const animationName = addAnimation(finalKfs, scope);
                return `${animationName} ${groupAnimator[0]} both`;
            }
        }
        for (let key in groupAnimators) {
            const animationCfg = createSingleCSSAnimation(groupAnimators[key]);
            if (animationCfg) {
                cssAnimations.push(animationCfg);
            }
        }
        if (cssAnimations.length) {
            const className = scope.zrId + '-cls-' + getClassId();
            scope.cssNodes['.' + className] = {
                animation: cssAnimations.join(',')
            };
            attrs.class = className;
        }
    }

    function createCSSEmphasis(el, attrs, scope) {
        if (!el.ignore) {
            if (el.isSilent()) {
                const style = {
                    'pointer-events': 'none'
                };
                setClassAttribute(style, attrs, scope, true);
            }
            else {
                const emphasisStyle = el.states.emphasis && el.states.emphasis.style
                    ? el.states.emphasis.style
                    : {};
                let fill = emphasisStyle.fill;
                if (!fill) {
                    const normalFill = el.style && el.style.fill;
                    const selectFill = el.states.select
                        && el.states.select.style
                        && el.states.select.style.fill;
                    const fromFill = el.currentStates.indexOf('select') >= 0
                        ? (selectFill || normalFill)
                        : normalFill;
                    if (fromFill) {
                        fill = liftColor(fromFill);
                    }
                }
                let lineWidth = emphasisStyle.lineWidth;
                if (lineWidth) {
                    const scaleX = (!emphasisStyle.strokeNoScale && el.transform)
                        ? el.transform[0]
                        : 1;
                    lineWidth = lineWidth / scaleX;
                }
                const style = {
                    cursor: 'pointer',
                };
                if (fill) {
                    style.fill = fill;
                }
                if (emphasisStyle.stroke) {
                    style.stroke = emphasisStyle.stroke;
                }
                if (lineWidth) {
                    style['stroke-width'] = lineWidth;
                }
                setClassAttribute(style, attrs, scope, true);
            }
        }
    }
    function setClassAttribute(style, attrs, scope, withHover) {
        const styleKey = JSON.stringify(style);
        let className = scope.cssStyleCache[styleKey];
        if (!className) {
            className = scope.zrId + '-cls-' + getClassId();
            scope.cssStyleCache[styleKey] = className;
            scope.cssNodes['.' + className + (withHover ? ':hover' : '')] = style;
        }
        attrs.class = attrs.class ? (attrs.class + ' ' + className) : className;
    }

    const round$1 = Math.round;
    function isImageLike$1(val) {
        return val && isString(val.src);
    }
    function isCanvasLike(val) {
        return val && isFunction(val.toDataURL);
    }
    function setStyleAttrs(attrs, style, el, scope) {
        mapStyleToAttrs((key, val) => {
            const isFillStroke = key === 'fill' || key === 'stroke';
            if (isFillStroke && isGradient(val)) {
                setGradient(style, attrs, key, scope);
            }
            else if (isFillStroke && isPattern(val)) {
                setPattern(el, attrs, key, scope);
            }
            else {
                attrs[key] = val;
            }
            if (isFillStroke && scope.ssr && val === 'none') {
                attrs['pointer-events'] = 'visible';
            }
        }, style, el, false);
        setShadow(el, attrs, scope);
    }
    function setMetaData(attrs, el) {
        const metaData = getElementSSRData(el);
        if (metaData) {
            metaData.each((val, key) => {
                val != null && (attrs[(META_DATA_PREFIX + key).toLowerCase()] = val + '');
            });
            if (el.isSilent()) {
                attrs[META_DATA_PREFIX + 'silent'] = 'true';
            }
        }
    }
    function noRotateScale(m) {
        return isAroundZero$1(m[0] - 1)
            && isAroundZero$1(m[1])
            && isAroundZero$1(m[2])
            && isAroundZero$1(m[3] - 1);
    }
    function noTranslate(m) {
        return isAroundZero$1(m[4]) && isAroundZero$1(m[5]);
    }
    function setTransform(attrs, m, compress) {
        if (m && !(noTranslate(m) && noRotateScale(m))) {
            const mul = compress ? 10 : 1e4;
            attrs.transform = noRotateScale(m)
                ? `translate(${round$1(m[4] * mul) / mul} ${round$1(m[5] * mul) / mul})` : getMatrixStr(m);
        }
    }
    function convertPolyShape(shape, attrs, mul) {
        const points = shape.points;
        const strArr = [];
        for (let i = 0; i < points.length; i++) {
            strArr.push(round$1(points[i][0] * mul) / mul);
            strArr.push(round$1(points[i][1] * mul) / mul);
        }
        attrs.points = strArr.join(' ');
    }
    function validatePolyShape(shape) {
        return !shape.smooth;
    }
    function createAttrsConvert(desc) {
        const normalizedDesc = map(desc, (item) => (typeof item === 'string' ? [item, item] : item));
        return function (shape, attrs, mul) {
            for (let i = 0; i < normalizedDesc.length; i++) {
                const item = normalizedDesc[i];
                const val = shape[item[0]];
                if (val != null) {
                    attrs[item[1]] = round$1(val * mul) / mul;
                }
            }
        };
    }
    const builtinShapesDef = {
        circle: [createAttrsConvert(['cx', 'cy', 'r'])],
        polyline: [convertPolyShape, validatePolyShape],
        polygon: [convertPolyShape, validatePolyShape]
    };
    function hasShapeAnimation(el) {
        const animators = el.animators;
        for (let i = 0; i < animators.length; i++) {
            if (animators[i].targetName === 'shape') {
                return true;
            }
        }
        return false;
    }
    function brushSVGPath(el, scope) {
        const style = el.style;
        const shape = el.shape;
        const builtinShpDef = builtinShapesDef[el.type];
        const attrs = {};
        const needsAnimate = scope.animation;
        let svgElType = 'path';
        const strokePercent = el.style.strokePercent;
        const precision = (scope.compress && getPathPrecision(el)) || 4;
        if (builtinShpDef
            && !scope.willUpdate
            && !(builtinShpDef[1] && !builtinShpDef[1](shape))
            && !(needsAnimate && hasShapeAnimation(el))
            && !(strokePercent < 1)) {
            svgElType = el.type;
            const mul = Math.pow(10, precision);
            builtinShpDef[0](shape, attrs, mul);
        }
        else {
            const needBuildPath = !el.path || el.shapeChanged();
            if (!el.path) {
                el.createPathProxy();
            }
            const path = el.path;
            if (needBuildPath) {
                path.beginPath();
                el.buildPath(path, el.shape);
                el.pathUpdated();
            }
            const pathVersion = path.getVersion();
            const elExt = el;
            let svgPathBuilder = elExt.__svgPathBuilder;
            if (elExt.__svgPathVersion !== pathVersion
                || !svgPathBuilder
                || strokePercent !== elExt.__svgPathStrokePercent) {
                if (!svgPathBuilder) {
                    svgPathBuilder = elExt.__svgPathBuilder = new SVGPathRebuilder();
                }
                svgPathBuilder.reset(precision);
                path.rebuildPath(svgPathBuilder, strokePercent);
                svgPathBuilder.generateStr();
                elExt.__svgPathVersion = pathVersion;
                elExt.__svgPathStrokePercent = strokePercent;
            }
            attrs.d = svgPathBuilder.getStr();
        }
        setTransform(attrs, el.transform);
        setStyleAttrs(attrs, style, el, scope);
        setMetaData(attrs, el);
        scope.animation && createCSSAnimation(el, attrs, scope);
        scope.emphasis && createCSSEmphasis(el, attrs, scope);
        return createVNode(svgElType, el.id + '', attrs);
    }
    function brushSVGImage(el, scope) {
        const style = el.style;
        let image = style.image;
        if (image && !isString(image)) {
            if (isImageLike$1(image)) {
                image = image.src;
            }
            else if (isCanvasLike(image)) {
                image = image.toDataURL();
            }
        }
        if (!image) {
            return;
        }
        const x = style.x || 0;
        const y = style.y || 0;
        const dw = style.width;
        const dh = style.height;
        const attrs = {
            href: image,
            width: dw,
            height: dh
        };
        if (x) {
            attrs.x = x;
        }
        if (y) {
            attrs.y = y;
        }
        setTransform(attrs, el.transform);
        setStyleAttrs(attrs, style, el, scope);
        setMetaData(attrs, el);
        scope.animation && createCSSAnimation(el, attrs, scope);
        return createVNode('image', el.id + '', attrs);
    }
    function brushSVGTSpan(el, scope) {
        const style = el.style;
        let text = style.text;
        text != null && (text += '');
        if (!text || isNaN(style.x) || isNaN(style.y)) {
            return;
        }
        const font = style.font || DEFAULT_FONT;
        const x = style.x || 0;
        const y = adjustTextY(style.y || 0, getLineHeight(font), style.textBaseline);
        const textAlign = TEXT_ALIGN_TO_ANCHOR[style.textAlign]
            || style.textAlign;
        const attrs = {
            'dominant-baseline': 'central',
            'text-anchor': textAlign
        };
        if (hasSeparateFont(style)) {
            let separatedFontStr = '';
            const fontStyle = style.fontStyle;
            const fontSize = parseFontSize(style.fontSize);
            if (!parseFloat(fontSize)) {
                return;
            }
            const fontFamily = style.fontFamily || DEFAULT_FONT_FAMILY;
            const fontWeight = style.fontWeight;
            separatedFontStr += `font-size:${fontSize};font-family:${fontFamily};`;
            if (fontStyle && fontStyle !== 'normal') {
                separatedFontStr += `font-style:${fontStyle};`;
            }
            if (fontWeight && fontWeight !== 'normal') {
                separatedFontStr += `font-weight:${fontWeight};`;
            }
            attrs.style = separatedFontStr;
        }
        else {
            attrs.style = `font: ${font}`;
        }
        if (text.match(/\s/)) {
            attrs['xml:space'] = 'preserve';
        }
        if (x) {
            attrs.x = x;
        }
        if (y) {
            attrs.y = y;
        }
        setTransform(attrs, el.transform);
        setStyleAttrs(attrs, style, el, scope);
        setMetaData(attrs, el);
        scope.animation && createCSSAnimation(el, attrs, scope);
        return createVNode('text', el.id + '', attrs, undefined, text);
    }
    function brush$1(el, scope) {
        if (el instanceof Path) {
            return brushSVGPath(el, scope);
        }
        else if (el instanceof ZRImage) {
            return brushSVGImage(el, scope);
        }
        else if (el instanceof TSpan) {
            return brushSVGTSpan(el, scope);
        }
    }
    function setShadow(el, attrs, scope) {
        const style = el.style;
        if (hasShadow(style)) {
            const shadowKey = getShadowKey(el);
            const shadowCache = scope.shadowCache;
            let shadowId = shadowCache[shadowKey];
            if (!shadowId) {
                const globalScale = el.getGlobalScale();
                const scaleX = globalScale[0];
                const scaleY = globalScale[1];
                if (!scaleX || !scaleY) {
                    return;
                }
                const offsetX = style.shadowOffsetX || 0;
                const offsetY = style.shadowOffsetY || 0;
                const blur = style.shadowBlur;
                const { opacity, color } = normalizeColor(style.shadowColor);
                const stdDx = blur / 2 / scaleX;
                const stdDy = blur / 2 / scaleY;
                const stdDeviation = stdDx + ' ' + stdDy;
                shadowId = scope.zrId + '-s' + scope.shadowIdx++;
                scope.defs[shadowId] = createVNode('filter', shadowId, {
                    'id': shadowId,
                    'x': '-100%',
                    'y': '-100%',
                    'width': '300%',
                    'height': '300%'
                }, [
                    createVNode('feDropShadow', '', {
                        'dx': offsetX / scaleX,
                        'dy': offsetY / scaleY,
                        'stdDeviation': stdDeviation,
                        'flood-color': color,
                        'flood-opacity': opacity
                    })
                ]);
                shadowCache[shadowKey] = shadowId;
            }
            attrs.filter = getIdURL(shadowId);
        }
    }
    function setGradient(style, attrs, target, scope) {
        const val = style[target];
        let gradientTag;
        let gradientAttrs = {
            'gradientUnits': val.global
                ? 'userSpaceOnUse'
                : 'objectBoundingBox'
        };
        if (isLinearGradient(val)) {
            gradientTag = 'linearGradient';
            gradientAttrs.x1 = val.x;
            gradientAttrs.y1 = val.y;
            gradientAttrs.x2 = val.x2;
            gradientAttrs.y2 = val.y2;
        }
        else if (isRadialGradient(val)) {
            gradientTag = 'radialGradient';
            gradientAttrs.cx = retrieve2(val.x, 0.5);
            gradientAttrs.cy = retrieve2(val.y, 0.5);
            gradientAttrs.r = retrieve2(val.r, 0.5);
        }
        else {
            {
                logError('Illegal gradient type.');
            }
            return;
        }
        const colors = val.colorStops;
        const colorStops = [];
        for (let i = 0, len = colors.length; i < len; ++i) {
            const offset = round4(colors[i].offset) * 100 + '%';
            const stopColor = colors[i].color;
            const { color, opacity } = normalizeColor(stopColor);
            const stopsAttrs = {
                'offset': offset
            };
            stopsAttrs['stop-color'] = color;
            if (opacity < 1) {
                stopsAttrs['stop-opacity'] = opacity;
            }
            colorStops.push(createVNode('stop', i + '', stopsAttrs));
        }
        const gradientVNode = createVNode(gradientTag, '', gradientAttrs, colorStops);
        const gradientKey = vNodeToString(gradientVNode);
        const gradientCache = scope.gradientCache;
        let gradientId = gradientCache[gradientKey];
        if (!gradientId) {
            gradientId = scope.zrId + '-g' + scope.gradientIdx++;
            gradientCache[gradientKey] = gradientId;
            gradientAttrs.id = gradientId;
            scope.defs[gradientId] = createVNode(gradientTag, gradientId, gradientAttrs, colorStops);
        }
        attrs[target] = getIdURL(gradientId);
    }
    function setPattern(el, attrs, target, scope) {
        const val = el.style[target];
        const boundingRect = el.getBoundingRect();
        const patternAttrs = {};
        const repeat = val.repeat;
        const noRepeat = repeat === 'no-repeat';
        const repeatX = repeat === 'repeat-x';
        const repeatY = repeat === 'repeat-y';
        let child;
        if (isImagePattern(val)) {
            let imageWidth = val.imageWidth;
            let imageHeight = val.imageHeight;
            let imageSrc;
            const patternImage = val.image;
            if (isString(patternImage)) {
                imageSrc = patternImage;
            }
            else if (isImageLike$1(patternImage)) {
                imageSrc = patternImage.src;
            }
            else if (isCanvasLike(patternImage)) {
                imageSrc = patternImage.toDataURL();
            }
            if (typeof Image === 'undefined') {
                const errMsg = 'Image width/height must been given explictly in svg-ssr renderer.';
                assert(imageWidth, errMsg);
                assert(imageHeight, errMsg);
            }
            else if (imageWidth == null || imageHeight == null) {
                const setSizeToVNode = (vNode, img) => {
                    if (vNode) {
                        const svgEl = vNode.elm;
                        let width = imageWidth || img.width;
                        let height = imageHeight || img.height;
                        if (vNode.tag === 'pattern') {
                            if (repeatX) {
                                height = 1;
                                width /= boundingRect.width;
                            }
                            else if (repeatY) {
                                width = 1;
                                height /= boundingRect.height;
                            }
                        }
                        vNode.attrs.width = width;
                        vNode.attrs.height = height;
                        if (svgEl) {
                            svgEl.setAttribute('width', width);
                            svgEl.setAttribute('height', height);
                        }
                    }
                };
                const createdImage = createOrUpdateImage(imageSrc, null, el, (img) => {
                    noRepeat || setSizeToVNode(patternVNode, img);
                    setSizeToVNode(child, img);
                });
                if (createdImage && createdImage.width && createdImage.height) {
                    imageWidth = imageWidth || createdImage.width;
                    imageHeight = imageHeight || createdImage.height;
                }
            }
            child = createVNode('image', 'img', {
                href: imageSrc,
                width: imageWidth,
                height: imageHeight
            });
            patternAttrs.width = imageWidth;
            patternAttrs.height = imageHeight;
        }
        else if (val.svgElement) {
            child = clone(val.svgElement);
            patternAttrs.width = val.svgWidth;
            patternAttrs.height = val.svgHeight;
        }
        if (!child) {
            return;
        }
        let patternWidth;
        let patternHeight;
        if (noRepeat) {
            patternWidth = patternHeight = 1;
        }
        else if (repeatX) {
            patternHeight = 1;
            patternWidth = patternAttrs.width / boundingRect.width;
        }
        else if (repeatY) {
            patternWidth = 1;
            patternHeight = patternAttrs.height / boundingRect.height;
        }
        else {
            patternAttrs.patternUnits = 'userSpaceOnUse';
        }
        if (patternWidth != null && !isNaN(patternWidth)) {
            patternAttrs.width = patternWidth;
        }
        if (patternHeight != null && !isNaN(patternHeight)) {
            patternAttrs.height = patternHeight;
        }
        const patternTransform = getSRTTransformString(val);
        patternTransform && (patternAttrs.patternTransform = patternTransform);
        let patternVNode = createVNode('pattern', '', patternAttrs, [child]);
        const patternKey = vNodeToString(patternVNode);
        const patternCache = scope.patternCache;
        let patternId = patternCache[patternKey];
        if (!patternId) {
            patternId = scope.zrId + '-p' + scope.patternIdx++;
            patternCache[patternKey] = patternId;
            patternAttrs.id = patternId;
            patternVNode = scope.defs[patternId] = createVNode('pattern', patternId, patternAttrs, [child]);
        }
        attrs[target] = getIdURL(patternId);
    }
    function setClipPath(clipPath, attrs, scope) {
        const { clipPathCache, defs } = scope;
        let clipPathId = clipPathCache[clipPath.id];
        if (!clipPathId) {
            clipPathId = scope.zrId + '-c' + scope.clipPathIdx++;
            const clipPathAttrs = {
                id: clipPathId
            };
            clipPathCache[clipPath.id] = clipPathId;
            defs[clipPathId] = createVNode('clipPath', clipPathId, clipPathAttrs, [brushSVGPath(clipPath, scope)]);
        }
        attrs['clip-path'] = getIdURL(clipPathId);
    }

    function createTextNode(text) {
        return document.createTextNode(text);
    }
    function insertBefore(parentNode, newNode, referenceNode) {
        parentNode.insertBefore(newNode, referenceNode);
    }
    function removeChild(node, child) {
        node.removeChild(child);
    }
    function appendChild(node, child) {
        node.appendChild(child);
    }
    function parentNode(node) {
        return node.parentNode;
    }
    function nextSibling(node) {
        return node.nextSibling;
    }
    function setTextContent(node, text) {
        node.textContent = text;
    }

    const colonChar = 58;
    const xChar = 120;
    const emptyNode = createVNode('', '');
    function isUndef(s) {
        return s === undefined;
    }
    function isDef(s) {
        return s !== undefined;
    }
    function createKeyToOldIdx(children, beginIdx, endIdx) {
        const map = {};
        for (let i = beginIdx; i <= endIdx; ++i) {
            const key = children[i].key;
            if (key !== undefined) {
                {
                    if (map[key] != null) {
                        console.error(`Duplicate key ${key}`);
                    }
                }
                map[key] = i;
            }
        }
        return map;
    }
    function sameVnode(vnode1, vnode2) {
        const isSameKey = vnode1.key === vnode2.key;
        const isSameTag = vnode1.tag === vnode2.tag;
        return isSameTag && isSameKey;
    }
    function createElm(vnode) {
        let i;
        const children = vnode.children;
        const tag = vnode.tag;
        if (isDef(tag)) {
            const elm = (vnode.elm = createElement(tag));
            updateAttrs(emptyNode, vnode);
            if (isArray(children)) {
                for (i = 0; i < children.length; ++i) {
                    const ch = children[i];
                    if (ch != null) {
                        appendChild(elm, createElm(ch));
                    }
                }
            }
            else if (isDef(vnode.text) && !isObject(vnode.text)) {
                appendChild(elm, createTextNode(vnode.text));
            }
        }
        else {
            vnode.elm = createTextNode(vnode.text);
        }
        return vnode.elm;
    }
    function addVnodes(parentElm, before, vnodes, startIdx, endIdx) {
        for (; startIdx <= endIdx; ++startIdx) {
            const ch = vnodes[startIdx];
            if (ch != null) {
                insertBefore(parentElm, createElm(ch), before);
            }
        }
    }
    function removeVnodes(parentElm, vnodes, startIdx, endIdx) {
        for (; startIdx <= endIdx; ++startIdx) {
            const ch = vnodes[startIdx];
            if (ch != null) {
                if (isDef(ch.tag)) {
                    const parent = parentNode(ch.elm);
                    removeChild(parent, ch.elm);
                }
                else {
                    removeChild(parentElm, ch.elm);
                }
            }
        }
    }
    function updateAttrs(oldVnode, vnode) {
        let key;
        const elm = vnode.elm;
        const oldAttrs = oldVnode && oldVnode.attrs || {};
        const attrs = vnode.attrs || {};
        if (oldAttrs === attrs) {
            return;
        }
        for (key in attrs) {
            const cur = attrs[key];
            const old = oldAttrs[key];
            if (old !== cur) {
                if (cur === true) {
                    elm.setAttribute(key, '');
                }
                else if (cur === false) {
                    elm.removeAttribute(key);
                }
                else {
                    if (key === 'style') {
                        elm.style.cssText = cur;
                    }
                    else if (key.charCodeAt(0) !== xChar) {
                        elm.setAttribute(key, cur);
                    }
                    else if (key === 'xmlns:xlink' || key === 'xmlns') {
                        elm.setAttributeNS(XMLNS, key, cur);
                    }
                    else if (key.charCodeAt(3) === colonChar) {
                        elm.setAttributeNS(XML_NAMESPACE, key, cur);
                    }
                    else if (key.charCodeAt(5) === colonChar) {
                        elm.setAttributeNS(XLINKNS, key, cur);
                    }
                    else {
                        elm.setAttribute(key, cur);
                    }
                }
            }
        }
        for (key in oldAttrs) {
            if (!(key in attrs)) {
                elm.removeAttribute(key);
            }
        }
    }
    function updateChildren(parentElm, oldCh, newCh) {
        let oldStartIdx = 0;
        let newStartIdx = 0;
        let oldEndIdx = oldCh.length - 1;
        let oldStartVnode = oldCh[0];
        let oldEndVnode = oldCh[oldEndIdx];
        let newEndIdx = newCh.length - 1;
        let newStartVnode = newCh[0];
        let newEndVnode = newCh[newEndIdx];
        let oldKeyToIdx;
        let idxInOld;
        let elmToMove;
        let before;
        while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
            if (oldStartVnode == null) {
                oldStartVnode = oldCh[++oldStartIdx];
            }
            else if (oldEndVnode == null) {
                oldEndVnode = oldCh[--oldEndIdx];
            }
            else if (newStartVnode == null) {
                newStartVnode = newCh[++newStartIdx];
            }
            else if (newEndVnode == null) {
                newEndVnode = newCh[--newEndIdx];
            }
            else if (sameVnode(oldStartVnode, newStartVnode)) {
                patchVnode(oldStartVnode, newStartVnode);
                oldStartVnode = oldCh[++oldStartIdx];
                newStartVnode = newCh[++newStartIdx];
            }
            else if (sameVnode(oldEndVnode, newEndVnode)) {
                patchVnode(oldEndVnode, newEndVnode);
                oldEndVnode = oldCh[--oldEndIdx];
                newEndVnode = newCh[--newEndIdx];
            }
            else if (sameVnode(oldStartVnode, newEndVnode)) {
                patchVnode(oldStartVnode, newEndVnode);
                insertBefore(parentElm, oldStartVnode.elm, nextSibling(oldEndVnode.elm));
                oldStartVnode = oldCh[++oldStartIdx];
                newEndVnode = newCh[--newEndIdx];
            }
            else if (sameVnode(oldEndVnode, newStartVnode)) {
                patchVnode(oldEndVnode, newStartVnode);
                insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm);
                oldEndVnode = oldCh[--oldEndIdx];
                newStartVnode = newCh[++newStartIdx];
            }
            else {
                if (isUndef(oldKeyToIdx)) {
                    oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx);
                }
                idxInOld = oldKeyToIdx[newStartVnode.key];
                if (isUndef(idxInOld)) {
                    insertBefore(parentElm, createElm(newStartVnode), oldStartVnode.elm);
                }
                else {
                    elmToMove = oldCh[idxInOld];
                    if (elmToMove.tag !== newStartVnode.tag) {
                        insertBefore(parentElm, createElm(newStartVnode), oldStartVnode.elm);
                    }
                    else {
                        patchVnode(elmToMove, newStartVnode);
                        oldCh[idxInOld] = undefined;
                        insertBefore(parentElm, elmToMove.elm, oldStartVnode.elm);
                    }
                }
                newStartVnode = newCh[++newStartIdx];
            }
        }
        if (oldStartIdx <= oldEndIdx || newStartIdx <= newEndIdx) {
            if (oldStartIdx > oldEndIdx) {
                before = newCh[newEndIdx + 1] == null ? null : newCh[newEndIdx + 1].elm;
                addVnodes(parentElm, before, newCh, newStartIdx, newEndIdx);
            }
            else {
                removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx);
            }
        }
    }
    function patchVnode(oldVnode, vnode) {
        const elm = (vnode.elm = oldVnode.elm);
        const oldCh = oldVnode.children;
        const ch = vnode.children;
        if (oldVnode === vnode) {
            return;
        }
        updateAttrs(oldVnode, vnode);
        if (isUndef(vnode.text)) {
            if (isDef(oldCh) && isDef(ch)) {
                if (oldCh !== ch) {
                    updateChildren(elm, oldCh, ch);
                }
            }
            else if (isDef(ch)) {
                if (isDef(oldVnode.text)) {
                    setTextContent(elm, '');
                }
                addVnodes(elm, null, ch, 0, ch.length - 1);
            }
            else if (isDef(oldCh)) {
                removeVnodes(elm, oldCh, 0, oldCh.length - 1);
            }
            else if (isDef(oldVnode.text)) {
                setTextContent(elm, '');
            }
        }
        else if (oldVnode.text !== vnode.text) {
            if (isDef(oldCh)) {
                removeVnodes(elm, oldCh, 0, oldCh.length - 1);
            }
            setTextContent(elm, vnode.text);
        }
    }
    function patch(oldVnode, vnode) {
        if (sameVnode(oldVnode, vnode)) {
            patchVnode(oldVnode, vnode);
        }
        else {
            const elm = oldVnode.elm;
            const parent = parentNode(elm);
            createElm(vnode);
            if (parent !== null) {
                insertBefore(parent, vnode.elm, nextSibling(elm));
                removeVnodes(parent, [oldVnode], 0, 0);
            }
        }
        return vnode;
    }

    let svgId = 0;
    class SVGPainter {
        constructor(root, storage, opts) {
            this.type = 'svg';
            this.refreshHover = createMethodNotSupport('refreshHover');
            this.configLayer = createMethodNotSupport('configLayer');
            this.storage = storage;
            this._opts = opts = extend({}, opts);
            this.root = root;
            this._id = 'zr' + svgId++;
            this._oldVNode = createSVGVNode(opts.width, opts.height);
            if (root && !opts.ssr) {
                const viewport = this._viewport = document.createElement('div');
                viewport.style.cssText = 'position:relative;overflow:hidden';
                const svgDom = this._svgDom = this._oldVNode.elm = createElement('svg');
                updateAttrs(null, this._oldVNode);
                viewport.appendChild(svgDom);
                root.appendChild(viewport);
            }
            this.resize(opts.width, opts.height);
        }
        getType() {
            return this.type;
        }
        getViewportRoot() {
            return this._viewport;
        }
        getViewportRootOffset() {
            const viewportRoot = this.getViewportRoot();
            if (viewportRoot) {
                return {
                    offsetLeft: viewportRoot.offsetLeft || 0,
                    offsetTop: viewportRoot.offsetTop || 0
                };
            }
        }
        getSvgDom() {
            return this._svgDom;
        }
        refresh() {
            if (this.root) {
                const vnode = this.renderToVNode({
                    willUpdate: true
                });
                vnode.attrs.style = 'position:absolute;left:0;top:0;user-select:none';
                patch(this._oldVNode, vnode);
                this._oldVNode = vnode;
            }
        }
        renderOneToVNode(el) {
            return brush$1(el, createBrushScope(this._id));
        }
        renderToVNode(opts) {
            opts = opts || {};
            const list = this.storage.getDisplayList(true);
            const width = this._width;
            const height = this._height;
            const scope = createBrushScope(this._id);
            scope.animation = opts.animation;
            scope.willUpdate = opts.willUpdate;
            scope.compress = opts.compress;
            scope.emphasis = opts.emphasis;
            scope.ssr = this._opts.ssr;
            const children = [];
            const bgVNode = this._bgVNode = createBackgroundVNode(width, height, this._backgroundColor, scope);
            bgVNode && children.push(bgVNode);
            const mainVNode = !opts.compress
                ? (this._mainVNode = createVNode('g', 'main', {}, [])) : null;
            this._paintList(list, scope, mainVNode ? mainVNode.children : children);
            mainVNode && children.push(mainVNode);
            const defs = map(keys(scope.defs), (id) => scope.defs[id]);
            if (defs.length) {
                children.push(createVNode('defs', 'defs', {}, defs));
            }
            if (opts.animation) {
                const animationCssStr = getCssString(scope.cssNodes, scope.cssAnims, { newline: true });
                if (animationCssStr) {
                    const styleNode = createVNode('style', 'stl', {}, [], animationCssStr);
                    children.push(styleNode);
                }
            }
            return createSVGVNode(width, height, children, opts.useViewBox);
        }
        renderToString(opts) {
            opts = opts || {};
            return vNodeToString(this.renderToVNode({
                animation: retrieve2(opts.cssAnimation, true),
                emphasis: retrieve2(opts.cssEmphasis, true),
                willUpdate: false,
                compress: true,
                useViewBox: retrieve2(opts.useViewBox, true)
            }), { newline: true });
        }
        setBackgroundColor(backgroundColor) {
            this._backgroundColor = backgroundColor;
        }
        getSvgRoot() {
            return this._mainVNode && this._mainVNode.elm;
        }
        _paintList(list, scope, out) {
            const listLen = list.length;
            const clipPathsGroupsStack = [];
            let clipPathsGroupsStackDepth = 0;
            let currentClipPathGroup;
            let prevClipPaths;
            let clipGroupNodeIdx = 0;
            for (let i = 0; i < listLen; i++) {
                const displayable = list[i];
                if (!displayable.invisible) {
                    const clipPaths = displayable.__clipPaths;
                    const len = clipPaths && clipPaths.length || 0;
                    const prevLen = prevClipPaths && prevClipPaths.length || 0;
                    let lca;
                    for (lca = Math.max(len - 1, prevLen - 1); lca >= 0; lca--) {
                        if (clipPaths && prevClipPaths
                            && clipPaths[lca] === prevClipPaths[lca]) {
                            break;
                        }
                    }
                    for (let i = prevLen - 1; i > lca; i--) {
                        clipPathsGroupsStackDepth--;
                        currentClipPathGroup = clipPathsGroupsStack[clipPathsGroupsStackDepth - 1];
                    }
                    for (let i = lca + 1; i < len; i++) {
                        const groupAttrs = {};
                        setClipPath(clipPaths[i], groupAttrs, scope);
                        const g = createVNode('g', 'clip-g-' + clipGroupNodeIdx++, groupAttrs, []);
                        (currentClipPathGroup ? currentClipPathGroup.children : out).push(g);
                        clipPathsGroupsStack[clipPathsGroupsStackDepth++] = g;
                        currentClipPathGroup = g;
                    }
                    prevClipPaths = clipPaths;
                    const ret = brush$1(displayable, scope);
                    if (ret) {
                        (currentClipPathGroup ? currentClipPathGroup.children : out).push(ret);
                    }
                }
            }
        }
        resize(width, height) {
            const opts = this._opts;
            const root = this.root;
            const viewport = this._viewport;
            width != null && (opts.width = width);
            height != null && (opts.height = height);
            if (root && viewport) {
                viewport.style.display = 'none';
                width = getSize(root, 0, opts);
                height = getSize(root, 1, opts);
                viewport.style.display = '';
            }
            if (this._width !== width || this._height !== height) {
                this._width = width;
                this._height = height;
                if (viewport) {
                    const viewportStyle = viewport.style;
                    viewportStyle.width = width + 'px';
                    viewportStyle.height = height + 'px';
                }
                if (!isPattern(this._backgroundColor)) {
                    const svgDom = this._svgDom;
                    if (svgDom) {
                        svgDom.setAttribute('width', width);
                        svgDom.setAttribute('height', height);
                    }
                    const bgEl = this._bgVNode && this._bgVNode.elm;
                    if (bgEl) {
                        bgEl.setAttribute('width', width);
                        bgEl.setAttribute('height', height);
                    }
                }
                else {
                    this.refresh();
                }
            }
        }
        getWidth() {
            return this._width;
        }
        getHeight() {
            return this._height;
        }
        dispose() {
            if (this.root) {
                this.root.innerHTML = '';
            }
            this._svgDom =
                this._viewport =
                    this.storage =
                        this._oldVNode =
                            this._bgVNode =
                                this._mainVNode = null;
        }
        clear() {
            if (this._svgDom) {
                this._svgDom.innerHTML = null;
            }
            this._oldVNode = null;
        }
        toDataURL(base64) {
            let str = this.renderToString();
            const prefix = 'data:image/svg+xml;';
            if (base64) {
                str = encodeBase64(str);
                return str && prefix + 'base64,' + str;
            }
            return prefix + 'charset=UTF-8,' + encodeURIComponent(str);
        }
    }
    function createMethodNotSupport(method) {
        return function () {
            {
                logError('In SVG mode painter not support method "' + method + '"');
            }
        };
    }
    function createBackgroundVNode(width, height, backgroundColor, scope) {
        let bgVNode;
        if (backgroundColor && backgroundColor !== 'none') {
            bgVNode = createVNode('rect', 'bg', {
                width,
                height,
                x: '0',
                y: '0'
            });
            if (isGradient(backgroundColor)) {
                setGradient({ fill: backgroundColor }, bgVNode.attrs, 'fill', scope);
            }
            else if (isPattern(backgroundColor)) {
                setPattern({
                    style: {
                        fill: backgroundColor
                    },
                    dirty: noop,
                    getBoundingRect: () => ({ width, height })
                }, bgVNode.attrs, 'fill', scope);
            }
            else {
                const { color, opacity } = normalizeColor(backgroundColor);
                bgVNode.attrs.fill = color;
                opacity < 1 && (bgVNode.attrs['fill-opacity'] = opacity);
            }
        }
        return bgVNode;
    }

    registerPainter('canvas', CanvasPainter);
    registerPainter('svg', SVGPainter);

    exports.Arc = Arc;
    exports.ArcShape = ArcShape;
    exports.BezierCurve = BezierCurve;
    exports.BezierCurveShape = BezierCurveShape;
    exports.BoundingRect = BoundingRect;
    exports.Circle = Circle;
    exports.CircleShape = CircleShape;
    exports.CompoundPath = CompoundPath;
    exports.Displayable = Displayable;
    exports.Droplet = Droplet;
    exports.DropletShape = DropletShape;
    exports.Element = Element;
    exports.Ellipse = Ellipse;
    exports.EllipseShape = EllipseShape;
    exports.Group = Group;
    exports.Heart = Heart;
    exports.HeartShape = HeartShape;
    exports.Image = ZRImage;
    exports.IncrementalDisplayable = IncrementalDisplayable;
    exports.Isogon = Isogon;
    exports.IsogonShape = IsogonShape;
    exports.Line = Line;
    exports.LineShape = LineShape;
    exports.LinearGradient = LinearGradient;
    exports.OrientedBoundingRect = OrientedBoundingRect;
    exports.Path = Path;
    exports.Pattern = Pattern;
    exports.Point = Point;
    exports.Polygon = Polygon;
    exports.PolygonShape = PolygonShape;
    exports.Polyline = Polyline;
    exports.PolylineShape = PolylineShape;
    exports.RadialGradient = RadialGradient;
    exports.Rect = Rect;
    exports.RectShape = RectShape;
    exports.Ring = Ring;
    exports.RingShape = RingShape;
    exports.Rose = Rose;
    exports.RoseShape = RoseShape;
    exports.Sector = Sector;
    exports.SectorShape = SectorShape;
    exports.Star = Star;
    exports.StarShape = StarShape;
    exports.TSpan = TSpan;
    exports.Text = ZRText;
    exports.Trochoid = Trochoid;
    exports.TrochoidShape = TrochoidShape;
    exports.color = color;
    exports.dispose = dispose;
    exports.disposeAll = disposeAll;
    exports.getElementSSRData = getElementSSRData;
    exports.getInstance = getInstance;
    exports.init = init;
    exports.matrix = matrix;
    exports.morph = morphPath$1;
    exports.parseSVG = parseSVG;
    exports.path = path;
    exports.registerPainter = registerPainter;
    exports.registerSSRDataGetter = registerSSRDataGetter;
    exports.setPlatformAPI = setPlatformAPI;
    exports.showDebugDirtyRect = showDebugDirtyRect;
    exports.util = util;
    exports.vector = vector;
    exports.version = version;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=zrender.js.map
