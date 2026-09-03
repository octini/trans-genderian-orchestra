import { createRequire } from "node:module";
var __defProp = Object.defineProperty;
var __returnValue = (v) => v;
function __exportSetter(name, newValue) {
  this[name] = __returnValue.bind(null, newValue);
}
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: __exportSetter.bind(all, name)
    });
};
var __esm = (fn, res) => () => (fn && (res = fn(fn = 0)), res);
var __require = /* @__PURE__ */ createRequire(import.meta.url);

// node_modules/zod/v4/core/core.js
function $constructor(name, initializer, params) {
  function init(inst, def) {
    if (!inst._zod) {
      Object.defineProperty(inst, "_zod", {
        value: {
          def,
          constr: _,
          traits: new Set
        },
        enumerable: false
      });
    }
    if (inst._zod.traits.has(name)) {
      return;
    }
    inst._zod.traits.add(name);
    initializer(inst, def);
    const proto = _.prototype;
    const keys = Object.keys(proto);
    for (let i = 0;i < keys.length; i++) {
      const k = keys[i];
      if (!(k in inst)) {
        inst[k] = proto[k].bind(inst);
      }
    }
  }
  const Parent = params?.Parent ?? Object;

  class Definition extends Parent {
  }
  Object.defineProperty(Definition, "name", { value: name });
  function _(def) {
    var _a2;
    const inst = params?.Parent ? new Definition : this;
    init(inst, def);
    (_a2 = inst._zod).deferred ?? (_a2.deferred = []);
    for (const fn of inst._zod.deferred) {
      fn();
    }
    return inst;
  }
  Object.defineProperty(_, "init", { value: init });
  Object.defineProperty(_, Symbol.hasInstance, {
    value: (inst) => {
      if (params?.Parent && inst instanceof params.Parent)
        return true;
      return inst?._zod?.traits?.has(name);
    }
  });
  Object.defineProperty(_, "name", { value: name });
  return _;
}
function config(newConfig) {
  if (newConfig)
    Object.assign(globalConfig, newConfig);
  return globalConfig;
}
var _a, NEVER, $brand, $ZodAsyncError, $ZodEncodeError, globalConfig;
var init_core = __esm(() => {
  NEVER = /* @__PURE__ */ Object.freeze({
    status: "aborted"
  });
  $brand = Symbol("zod_brand");
  $ZodAsyncError = class $ZodAsyncError extends Error {
    constructor() {
      super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
    }
  };
  $ZodEncodeError = class $ZodEncodeError extends Error {
    constructor(name) {
      super(`Encountered unidirectional transform during encode: ${name}`);
      this.name = "ZodEncodeError";
    }
  };
  (_a = globalThis).__zod_globalConfig ?? (_a.__zod_globalConfig = {});
  globalConfig = globalThis.__zod_globalConfig;
});

// node_modules/zod/v4/core/util.js
var exports_util = {};
__export(exports_util, {
  unwrapMessage: () => unwrapMessage,
  uint8ArrayToHex: () => uint8ArrayToHex,
  uint8ArrayToBase64url: () => uint8ArrayToBase64url,
  uint8ArrayToBase64: () => uint8ArrayToBase64,
  stringifyPrimitive: () => stringifyPrimitive,
  slugify: () => slugify,
  shallowClone: () => shallowClone,
  safeExtend: () => safeExtend,
  required: () => required,
  randomString: () => randomString,
  propertyKeyTypes: () => propertyKeyTypes,
  promiseAllObject: () => promiseAllObject,
  primitiveTypes: () => primitiveTypes,
  prefixIssues: () => prefixIssues,
  pick: () => pick,
  partial: () => partial,
  parsedType: () => parsedType,
  optionalKeys: () => optionalKeys,
  omit: () => omit,
  objectClone: () => objectClone,
  numKeys: () => numKeys,
  nullish: () => nullish,
  normalizeParams: () => normalizeParams,
  mergeDefs: () => mergeDefs,
  merge: () => merge,
  jsonStringifyReplacer: () => jsonStringifyReplacer,
  joinValues: () => joinValues,
  issue: () => issue,
  isPlainObject: () => isPlainObject,
  isObject: () => isObject,
  hexToUint8Array: () => hexToUint8Array,
  getSizableOrigin: () => getSizableOrigin,
  getParsedType: () => getParsedType,
  getLengthableOrigin: () => getLengthableOrigin,
  getEnumValues: () => getEnumValues,
  getElementAtPath: () => getElementAtPath,
  floatSafeRemainder: () => floatSafeRemainder,
  finalizeIssue: () => finalizeIssue,
  extend: () => extend,
  explicitlyAborted: () => explicitlyAborted,
  escapeRegex: () => escapeRegex,
  esc: () => esc,
  defineLazy: () => defineLazy,
  createTransparentProxy: () => createTransparentProxy,
  cloneDef: () => cloneDef,
  clone: () => clone,
  cleanRegex: () => cleanRegex,
  cleanEnum: () => cleanEnum,
  captureStackTrace: () => captureStackTrace,
  cached: () => cached,
  base64urlToUint8Array: () => base64urlToUint8Array,
  base64ToUint8Array: () => base64ToUint8Array,
  assignProp: () => assignProp,
  assertNotEqual: () => assertNotEqual,
  assertNever: () => assertNever,
  assertIs: () => assertIs,
  assertEqual: () => assertEqual,
  assert: () => assert,
  allowsEval: () => allowsEval,
  aborted: () => aborted,
  NUMBER_FORMAT_RANGES: () => NUMBER_FORMAT_RANGES,
  Class: () => Class,
  BIGINT_FORMAT_RANGES: () => BIGINT_FORMAT_RANGES
});
function assertEqual(val) {
  return val;
}
function assertNotEqual(val) {
  return val;
}
function assertIs(_arg) {}
function assertNever(_x) {
  throw new Error("Unexpected value in exhaustive check");
}
function assert(_) {}
function getEnumValues(entries) {
  const numericValues = Object.values(entries).filter((v) => typeof v === "number");
  const values = Object.entries(entries).filter(([k, _]) => numericValues.indexOf(+k) === -1).map(([_, v]) => v);
  return values;
}
function joinValues(array, separator = "|") {
  return array.map((val) => stringifyPrimitive(val)).join(separator);
}
function jsonStringifyReplacer(_, value) {
  if (typeof value === "bigint")
    return value.toString();
  return value;
}
function cached(getter) {
  const set = false;
  return {
    get value() {
      if (!set) {
        const value = getter();
        Object.defineProperty(this, "value", { value });
        return value;
      }
      throw new Error("cached value already set");
    }
  };
}
function nullish(input) {
  return input === null || input === undefined;
}
function cleanRegex(source) {
  const start = source.startsWith("^") ? 1 : 0;
  const end = source.endsWith("$") ? source.length - 1 : source.length;
  return source.slice(start, end);
}
function floatSafeRemainder(val, step) {
  const ratio = val / step;
  const roundedRatio = Math.round(ratio);
  const tolerance = Number.EPSILON * Math.max(Math.abs(ratio), 1);
  if (Math.abs(ratio - roundedRatio) < tolerance)
    return 0;
  return ratio - roundedRatio;
}
function defineLazy(object, key, getter) {
  let value = undefined;
  Object.defineProperty(object, key, {
    get() {
      if (value === EVALUATING) {
        return;
      }
      if (value === undefined) {
        value = EVALUATING;
        value = getter();
      }
      return value;
    },
    set(v) {
      Object.defineProperty(object, key, {
        value: v
      });
    },
    configurable: true
  });
}
function objectClone(obj) {
  return Object.create(Object.getPrototypeOf(obj), Object.getOwnPropertyDescriptors(obj));
}
function assignProp(target, prop, value) {
  Object.defineProperty(target, prop, {
    value,
    writable: true,
    enumerable: true,
    configurable: true
  });
}
function mergeDefs(...defs) {
  const mergedDescriptors = {};
  for (const def of defs) {
    const descriptors = Object.getOwnPropertyDescriptors(def);
    Object.assign(mergedDescriptors, descriptors);
  }
  return Object.defineProperties({}, mergedDescriptors);
}
function cloneDef(schema) {
  return mergeDefs(schema._zod.def);
}
function getElementAtPath(obj, path) {
  if (!path)
    return obj;
  return path.reduce((acc, key) => acc?.[key], obj);
}
function promiseAllObject(promisesObj) {
  const keys = Object.keys(promisesObj);
  const promises = keys.map((key) => promisesObj[key]);
  return Promise.all(promises).then((results) => {
    const resolvedObj = {};
    for (let i = 0;i < keys.length; i++) {
      resolvedObj[keys[i]] = results[i];
    }
    return resolvedObj;
  });
}
function randomString(length = 10) {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  let str = "";
  for (let i = 0;i < length; i++) {
    str += chars[Math.floor(Math.random() * chars.length)];
  }
  return str;
}
function esc(str) {
  return JSON.stringify(str);
}
function slugify(input) {
  return input.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}
function isObject(data) {
  return typeof data === "object" && data !== null && !Array.isArray(data);
}
function isPlainObject(o) {
  if (isObject(o) === false)
    return false;
  const ctor = o.constructor;
  if (ctor === undefined)
    return true;
  if (typeof ctor !== "function")
    return true;
  const prot = ctor.prototype;
  if (isObject(prot) === false)
    return false;
  if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) {
    return false;
  }
  return true;
}
function shallowClone(o) {
  if (isPlainObject(o))
    return { ...o };
  if (Array.isArray(o))
    return [...o];
  if (o instanceof Map)
    return new Map(o);
  if (o instanceof Set)
    return new Set(o);
  return o;
}
function numKeys(data) {
  let keyCount = 0;
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      keyCount++;
    }
  }
  return keyCount;
}
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function clone(inst, def, params) {
  const cl = new inst._zod.constr(def ?? inst._zod.def);
  if (!def || params?.parent)
    cl._zod.parent = inst;
  return cl;
}
function normalizeParams(_params) {
  const params = _params;
  if (!params)
    return {};
  if (typeof params === "string")
    return { error: () => params };
  if (params?.message !== undefined) {
    if (params?.error !== undefined)
      throw new Error("Cannot specify both `message` and `error` params");
    params.error = params.message;
  }
  delete params.message;
  if (typeof params.error === "string")
    return { ...params, error: () => params.error };
  return params;
}
function createTransparentProxy(getter) {
  let target;
  return new Proxy({}, {
    get(_, prop, receiver) {
      target ?? (target = getter());
      return Reflect.get(target, prop, receiver);
    },
    set(_, prop, value, receiver) {
      target ?? (target = getter());
      return Reflect.set(target, prop, value, receiver);
    },
    has(_, prop) {
      target ?? (target = getter());
      return Reflect.has(target, prop);
    },
    deleteProperty(_, prop) {
      target ?? (target = getter());
      return Reflect.deleteProperty(target, prop);
    },
    ownKeys(_) {
      target ?? (target = getter());
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(_, prop) {
      target ?? (target = getter());
      return Reflect.getOwnPropertyDescriptor(target, prop);
    },
    defineProperty(_, prop, descriptor) {
      target ?? (target = getter());
      return Reflect.defineProperty(target, prop, descriptor);
    }
  });
}
function stringifyPrimitive(value) {
  if (typeof value === "bigint")
    return value.toString() + "n";
  if (typeof value === "string")
    return `"${value}"`;
  return `${value}`;
}
function optionalKeys(shape) {
  return Object.keys(shape).filter((k) => {
    return shape[k]._zod.optin === "optional" && shape[k]._zod.optout === "optional";
  });
}
function pick(schema, mask) {
  const currDef = schema._zod.def;
  const checks = currDef.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    throw new Error(".pick() cannot be used on object schemas containing refinements");
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const newShape = {};
      for (const key in mask) {
        if (!(key in currDef.shape)) {
          throw new Error(`Unrecognized key: "${key}"`);
        }
        if (!mask[key])
          continue;
        newShape[key] = currDef.shape[key];
      }
      assignProp(this, "shape", newShape);
      return newShape;
    },
    checks: []
  });
  return clone(schema, def);
}
function omit(schema, mask) {
  const currDef = schema._zod.def;
  const checks = currDef.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    throw new Error(".omit() cannot be used on object schemas containing refinements");
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const newShape = { ...schema._zod.def.shape };
      for (const key in mask) {
        if (!(key in currDef.shape)) {
          throw new Error(`Unrecognized key: "${key}"`);
        }
        if (!mask[key])
          continue;
        delete newShape[key];
      }
      assignProp(this, "shape", newShape);
      return newShape;
    },
    checks: []
  });
  return clone(schema, def);
}
function extend(schema, shape) {
  if (!isPlainObject(shape)) {
    throw new Error("Invalid input to extend: expected a plain object");
  }
  const checks = schema._zod.def.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    const existingShape = schema._zod.def.shape;
    for (const key in shape) {
      if (Object.getOwnPropertyDescriptor(existingShape, key) !== undefined) {
        throw new Error("Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.");
      }
    }
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const _shape = { ...schema._zod.def.shape, ...shape };
      assignProp(this, "shape", _shape);
      return _shape;
    }
  });
  return clone(schema, def);
}
function safeExtend(schema, shape) {
  if (!isPlainObject(shape)) {
    throw new Error("Invalid input to safeExtend: expected a plain object");
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const _shape = { ...schema._zod.def.shape, ...shape };
      assignProp(this, "shape", _shape);
      return _shape;
    }
  });
  return clone(schema, def);
}
function merge(a, b) {
  if (a._zod.def.checks?.length) {
    throw new Error(".merge() cannot be used on object schemas containing refinements. Use .safeExtend() instead.");
  }
  const def = mergeDefs(a._zod.def, {
    get shape() {
      const _shape = { ...a._zod.def.shape, ...b._zod.def.shape };
      assignProp(this, "shape", _shape);
      return _shape;
    },
    get catchall() {
      return b._zod.def.catchall;
    },
    checks: b._zod.def.checks ?? []
  });
  return clone(a, def);
}
function partial(Class, schema, mask) {
  const currDef = schema._zod.def;
  const checks = currDef.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    throw new Error(".partial() cannot be used on object schemas containing refinements");
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const oldShape = schema._zod.def.shape;
      const shape = { ...oldShape };
      if (mask) {
        for (const key in mask) {
          if (!(key in oldShape)) {
            throw new Error(`Unrecognized key: "${key}"`);
          }
          if (!mask[key])
            continue;
          shape[key] = Class ? new Class({
            type: "optional",
            innerType: oldShape[key]
          }) : oldShape[key];
        }
      } else {
        for (const key in oldShape) {
          shape[key] = Class ? new Class({
            type: "optional",
            innerType: oldShape[key]
          }) : oldShape[key];
        }
      }
      assignProp(this, "shape", shape);
      return shape;
    },
    checks: []
  });
  return clone(schema, def);
}
function required(Class, schema, mask) {
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const oldShape = schema._zod.def.shape;
      const shape = { ...oldShape };
      if (mask) {
        for (const key in mask) {
          if (!(key in shape)) {
            throw new Error(`Unrecognized key: "${key}"`);
          }
          if (!mask[key])
            continue;
          shape[key] = new Class({
            type: "nonoptional",
            innerType: oldShape[key]
          });
        }
      } else {
        for (const key in oldShape) {
          shape[key] = new Class({
            type: "nonoptional",
            innerType: oldShape[key]
          });
        }
      }
      assignProp(this, "shape", shape);
      return shape;
    }
  });
  return clone(schema, def);
}
function aborted(x, startIndex = 0) {
  if (x.aborted === true)
    return true;
  for (let i = startIndex;i < x.issues.length; i++) {
    if (x.issues[i]?.continue !== true) {
      return true;
    }
  }
  return false;
}
function explicitlyAborted(x, startIndex = 0) {
  if (x.aborted === true)
    return true;
  for (let i = startIndex;i < x.issues.length; i++) {
    if (x.issues[i]?.continue === false) {
      return true;
    }
  }
  return false;
}
function prefixIssues(path, issues) {
  return issues.map((iss) => {
    var _a2;
    (_a2 = iss).path ?? (_a2.path = []);
    iss.path.unshift(path);
    return iss;
  });
}
function unwrapMessage(message) {
  return typeof message === "string" ? message : message?.message;
}
function finalizeIssue(iss, ctx, config2) {
  const message = iss.message ? iss.message : unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ?? unwrapMessage(ctx?.error?.(iss)) ?? unwrapMessage(config2.customError?.(iss)) ?? unwrapMessage(config2.localeError?.(iss)) ?? "Invalid input";
  const { inst: _inst, continue: _continue, input: _input, ...rest } = iss;
  rest.path ?? (rest.path = []);
  rest.message = message;
  if (ctx?.reportInput) {
    rest.input = _input;
  }
  return rest;
}
function getSizableOrigin(input) {
  if (input instanceof Set)
    return "set";
  if (input instanceof Map)
    return "map";
  if (input instanceof File)
    return "file";
  return "unknown";
}
function getLengthableOrigin(input) {
  if (Array.isArray(input))
    return "array";
  if (typeof input === "string")
    return "string";
  return "unknown";
}
function parsedType(data) {
  const t = typeof data;
  switch (t) {
    case "number": {
      return Number.isNaN(data) ? "nan" : "number";
    }
    case "object": {
      if (data === null) {
        return "null";
      }
      if (Array.isArray(data)) {
        return "array";
      }
      const obj = data;
      if (obj && Object.getPrototypeOf(obj) !== Object.prototype && "constructor" in obj && obj.constructor) {
        return obj.constructor.name;
      }
    }
  }
  return t;
}
function issue(...args) {
  const [iss, input, inst] = args;
  if (typeof iss === "string") {
    return {
      message: iss,
      code: "custom",
      input,
      inst
    };
  }
  return { ...iss };
}
function cleanEnum(obj) {
  return Object.entries(obj).filter(([k, _]) => {
    return Number.isNaN(Number.parseInt(k, 10));
  }).map((el) => el[1]);
}
function base64ToUint8Array(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0;i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
function uint8ArrayToBase64(bytes) {
  let binaryString = "";
  for (let i = 0;i < bytes.length; i++) {
    binaryString += String.fromCharCode(bytes[i]);
  }
  return btoa(binaryString);
}
function base64urlToUint8Array(base64url) {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - base64.length % 4) % 4);
  return base64ToUint8Array(base64 + padding);
}
function uint8ArrayToBase64url(bytes) {
  return uint8ArrayToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function hexToUint8Array(hex) {
  const cleanHex = hex.replace(/^0x/, "");
  if (cleanHex.length % 2 !== 0) {
    throw new Error("Invalid hex string length");
  }
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0;i < cleanHex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(cleanHex.slice(i, i + 2), 16);
  }
  return bytes;
}
function uint8ArrayToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

class Class {
  constructor(..._args) {}
}
var EVALUATING, captureStackTrace, allowsEval, getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return "undefined";
    case "string":
      return "string";
    case "number":
      return Number.isNaN(data) ? "nan" : "number";
    case "boolean":
      return "boolean";
    case "function":
      return "function";
    case "bigint":
      return "bigint";
    case "symbol":
      return "symbol";
    case "object":
      if (Array.isArray(data)) {
        return "array";
      }
      if (data === null) {
        return "null";
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return "promise";
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return "map";
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return "set";
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return "date";
      }
      if (typeof File !== "undefined" && data instanceof File) {
        return "file";
      }
      return "object";
    default:
      throw new Error(`Unknown data type: ${t}`);
  }
}, propertyKeyTypes, primitiveTypes, NUMBER_FORMAT_RANGES, BIGINT_FORMAT_RANGES;
var init_util = __esm(() => {
  init_core();
  EVALUATING = /* @__PURE__ */ Symbol("evaluating");
  captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {};
  allowsEval = /* @__PURE__ */ cached(() => {
    if (globalConfig.jitless) {
      return false;
    }
    if (typeof navigator !== "undefined" && navigator?.userAgent?.includes("Cloudflare")) {
      return false;
    }
    try {
      const F = Function;
      new F("");
      return true;
    } catch (_) {
      return false;
    }
  });
  propertyKeyTypes = /* @__PURE__ */ new Set(["string", "number", "symbol"]);
  primitiveTypes = /* @__PURE__ */ new Set([
    "string",
    "number",
    "bigint",
    "boolean",
    "symbol",
    "undefined"
  ]);
  NUMBER_FORMAT_RANGES = {
    safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
    int32: [-2147483648, 2147483647],
    uint32: [0, 4294967295],
    float32: [-340282346638528860000000000000000000000, 340282346638528860000000000000000000000],
    float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
  };
  BIGINT_FORMAT_RANGES = {
    int64: [/* @__PURE__ */ BigInt("-9223372036854775808"), /* @__PURE__ */ BigInt("9223372036854775807")],
    uint64: [/* @__PURE__ */ BigInt(0), /* @__PURE__ */ BigInt("18446744073709551615")]
  };
});

// node_modules/zod/v4/core/errors.js
function flattenError(error, mapper = (issue2) => issue2.message) {
  const fieldErrors = {};
  const formErrors = [];
  for (const sub of error.issues) {
    if (sub.path.length > 0) {
      fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
      fieldErrors[sub.path[0]].push(mapper(sub));
    } else {
      formErrors.push(mapper(sub));
    }
  }
  return { formErrors, fieldErrors };
}
function formatError(error, mapper = (issue2) => issue2.message) {
  const fieldErrors = { _errors: [] };
  const processError = (error2, path = []) => {
    for (const issue2 of error2.issues) {
      if (issue2.code === "invalid_union" && issue2.errors.length) {
        issue2.errors.map((issues) => processError({ issues }, [...path, ...issue2.path]));
      } else if (issue2.code === "invalid_key") {
        processError({ issues: issue2.issues }, [...path, ...issue2.path]);
      } else if (issue2.code === "invalid_element") {
        processError({ issues: issue2.issues }, [...path, ...issue2.path]);
      } else {
        const fullpath = [...path, ...issue2.path];
        if (fullpath.length === 0) {
          fieldErrors._errors.push(mapper(issue2));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < fullpath.length) {
            const el = fullpath[i];
            const terminal = i === fullpath.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue2));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    }
  };
  processError(error);
  return fieldErrors;
}
function treeifyError(error, mapper = (issue2) => issue2.message) {
  const result = { errors: [] };
  const processError = (error2, path = []) => {
    var _a2, _b;
    for (const issue2 of error2.issues) {
      if (issue2.code === "invalid_union" && issue2.errors.length) {
        issue2.errors.map((issues) => processError({ issues }, [...path, ...issue2.path]));
      } else if (issue2.code === "invalid_key") {
        processError({ issues: issue2.issues }, [...path, ...issue2.path]);
      } else if (issue2.code === "invalid_element") {
        processError({ issues: issue2.issues }, [...path, ...issue2.path]);
      } else {
        const fullpath = [...path, ...issue2.path];
        if (fullpath.length === 0) {
          result.errors.push(mapper(issue2));
          continue;
        }
        let curr = result;
        let i = 0;
        while (i < fullpath.length) {
          const el = fullpath[i];
          const terminal = i === fullpath.length - 1;
          if (typeof el === "string") {
            curr.properties ?? (curr.properties = {});
            (_a2 = curr.properties)[el] ?? (_a2[el] = { errors: [] });
            curr = curr.properties[el];
          } else {
            curr.items ?? (curr.items = []);
            (_b = curr.items)[el] ?? (_b[el] = { errors: [] });
            curr = curr.items[el];
          }
          if (terminal) {
            curr.errors.push(mapper(issue2));
          }
          i++;
        }
      }
    }
  };
  processError(error);
  return result;
}
function toDotPath(_path) {
  const segs = [];
  const path = _path.map((seg) => typeof seg === "object" ? seg.key : seg);
  for (const seg of path) {
    if (typeof seg === "number")
      segs.push(`[${seg}]`);
    else if (typeof seg === "symbol")
      segs.push(`[${JSON.stringify(String(seg))}]`);
    else if (/[^\w$]/.test(seg))
      segs.push(`[${JSON.stringify(seg)}]`);
    else {
      if (segs.length)
        segs.push(".");
      segs.push(seg);
    }
  }
  return segs.join("");
}
function prettifyError(error) {
  const lines = [];
  const issues = [...error.issues].sort((a, b) => (a.path ?? []).length - (b.path ?? []).length);
  for (const issue2 of issues) {
    lines.push(`✖ ${issue2.message}`);
    if (issue2.path?.length)
      lines.push(`  → at ${toDotPath(issue2.path)}`);
  }
  return lines.join(`
`);
}
var initializer = (inst, def) => {
  inst.name = "$ZodError";
  Object.defineProperty(inst, "_zod", {
    value: inst._zod,
    enumerable: false
  });
  Object.defineProperty(inst, "issues", {
    value: def,
    enumerable: false
  });
  inst.message = JSON.stringify(def, jsonStringifyReplacer, 2);
  Object.defineProperty(inst, "toString", {
    value: () => inst.message,
    enumerable: false
  });
}, $ZodError, $ZodRealError;
var init_errors = __esm(() => {
  init_core();
  init_util();
  $ZodError = $constructor("$ZodError", initializer);
  $ZodRealError = $constructor("$ZodError", initializer, { Parent: Error });
});

// node_modules/zod/v4/core/parse.js
var _parse = (_Err) => (schema, value, _ctx, _params) => {
  const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
  const result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise) {
    throw new $ZodAsyncError;
  }
  if (result.issues.length) {
    const e = new (_params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
    captureStackTrace(e, _params?.callee);
    throw e;
  }
  return result.value;
}, parse, _parseAsync = (_Err) => async (schema, value, _ctx, params) => {
  const ctx = _ctx ? { ..._ctx, async: true } : { async: true };
  let result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise)
    result = await result;
  if (result.issues.length) {
    const e = new (params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
    captureStackTrace(e, params?.callee);
    throw e;
  }
  return result.value;
}, parseAsync, _safeParse = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
  const result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise) {
    throw new $ZodAsyncError;
  }
  return result.issues.length ? {
    success: false,
    error: new (_Err ?? $ZodError)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  } : { success: true, data: result.value };
}, safeParse, _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, async: true } : { async: true };
  let result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise)
    result = await result;
  return result.issues.length ? {
    success: false,
    error: new _Err(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  } : { success: true, data: result.value };
}, safeParseAsync, _encode = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
  return _parse(_Err)(schema, value, ctx);
}, encode, _decode = (_Err) => (schema, value, _ctx) => {
  return _parse(_Err)(schema, value, _ctx);
}, decode, _encodeAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
  return _parseAsync(_Err)(schema, value, ctx);
}, encodeAsync, _decodeAsync = (_Err) => async (schema, value, _ctx) => {
  return _parseAsync(_Err)(schema, value, _ctx);
}, decodeAsync, _safeEncode = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
  return _safeParse(_Err)(schema, value, ctx);
}, safeEncode, _safeDecode = (_Err) => (schema, value, _ctx) => {
  return _safeParse(_Err)(schema, value, _ctx);
}, safeDecode, _safeEncodeAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
  return _safeParseAsync(_Err)(schema, value, ctx);
}, safeEncodeAsync, _safeDecodeAsync = (_Err) => async (schema, value, _ctx) => {
  return _safeParseAsync(_Err)(schema, value, _ctx);
}, safeDecodeAsync;
var init_parse = __esm(() => {
  init_core();
  init_errors();
  init_util();
  parse = /* @__PURE__ */ _parse($ZodRealError);
  parseAsync = /* @__PURE__ */ _parseAsync($ZodRealError);
  safeParse = /* @__PURE__ */ _safeParse($ZodRealError);
  safeParseAsync = /* @__PURE__ */ _safeParseAsync($ZodRealError);
  encode = /* @__PURE__ */ _encode($ZodRealError);
  decode = /* @__PURE__ */ _decode($ZodRealError);
  encodeAsync = /* @__PURE__ */ _encodeAsync($ZodRealError);
  decodeAsync = /* @__PURE__ */ _decodeAsync($ZodRealError);
  safeEncode = /* @__PURE__ */ _safeEncode($ZodRealError);
  safeDecode = /* @__PURE__ */ _safeDecode($ZodRealError);
  safeEncodeAsync = /* @__PURE__ */ _safeEncodeAsync($ZodRealError);
  safeDecodeAsync = /* @__PURE__ */ _safeDecodeAsync($ZodRealError);
});

// node_modules/zod/v4/core/regexes.js
var exports_regexes = {};
__export(exports_regexes, {
  xid: () => xid,
  uuid7: () => uuid7,
  uuid6: () => uuid6,
  uuid4: () => uuid4,
  uuid: () => uuid,
  uppercase: () => uppercase,
  unicodeEmail: () => unicodeEmail,
  undefined: () => _undefined,
  ulid: () => ulid,
  time: () => time,
  string: () => string,
  sha512_hex: () => sha512_hex,
  sha512_base64url: () => sha512_base64url,
  sha512_base64: () => sha512_base64,
  sha384_hex: () => sha384_hex,
  sha384_base64url: () => sha384_base64url,
  sha384_base64: () => sha384_base64,
  sha256_hex: () => sha256_hex,
  sha256_base64url: () => sha256_base64url,
  sha256_base64: () => sha256_base64,
  sha1_hex: () => sha1_hex,
  sha1_base64url: () => sha1_base64url,
  sha1_base64: () => sha1_base64,
  rfc5322Email: () => rfc5322Email,
  number: () => number,
  null: () => _null,
  nanoid: () => nanoid,
  md5_hex: () => md5_hex,
  md5_base64url: () => md5_base64url,
  md5_base64: () => md5_base64,
  mac: () => mac,
  lowercase: () => lowercase,
  ksuid: () => ksuid,
  ipv6: () => ipv6,
  ipv4: () => ipv4,
  integer: () => integer,
  idnEmail: () => idnEmail,
  httpProtocol: () => httpProtocol,
  html5Email: () => html5Email,
  hostname: () => hostname,
  hex: () => hex,
  guid: () => guid,
  extendedDuration: () => extendedDuration,
  emoji: () => emoji,
  email: () => email,
  e164: () => e164,
  duration: () => duration,
  domain: () => domain,
  datetime: () => datetime,
  date: () => date,
  cuid2: () => cuid2,
  cuid: () => cuid,
  cidrv6: () => cidrv6,
  cidrv4: () => cidrv4,
  browserEmail: () => browserEmail,
  boolean: () => boolean,
  bigint: () => bigint,
  base64url: () => base64url,
  base64: () => base64
});
function emoji() {
  return new RegExp(_emoji, "u");
}
function timeSource(args) {
  const hhmm = `(?:[01]\\d|2[0-3]):[0-5]\\d`;
  const regex = typeof args.precision === "number" ? args.precision === -1 ? `${hhmm}` : args.precision === 0 ? `${hhmm}:[0-5]\\d` : `${hhmm}:[0-5]\\d\\.\\d{${args.precision}}` : `${hhmm}(?::[0-5]\\d(?:\\.\\d+)?)?`;
  return regex;
}
function time(args) {
  return new RegExp(`^${timeSource(args)}$`);
}
function datetime(args) {
  const time2 = timeSource({ precision: args.precision });
  const opts = ["Z"];
  if (args.local)
    opts.push("");
  if (args.offset)
    opts.push(`([+-](?:[01]\\d|2[0-3]):[0-5]\\d)`);
  const timeRegex = `${time2}(?:${opts.join("|")})`;
  return new RegExp(`^${dateSource}T(?:${timeRegex})$`);
}
function fixedBase64(bodyLength, padding) {
  return new RegExp(`^[A-Za-z0-9+/]{${bodyLength}}${padding}$`);
}
function fixedBase64url(length) {
  return new RegExp(`^[A-Za-z0-9_-]{${length}}$`);
}
var cuid, cuid2, ulid, xid, ksuid, nanoid, duration, extendedDuration, guid, uuid = (version) => {
  if (!version)
    return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
  return new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
}, uuid4, uuid6, uuid7, email, html5Email, rfc5322Email, unicodeEmail, idnEmail, browserEmail, _emoji = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`, ipv4, ipv6, mac = (delimiter) => {
  const escapedDelim = escapeRegex(delimiter ?? ":");
  return new RegExp(`^(?:[0-9A-F]{2}${escapedDelim}){5}[0-9A-F]{2}$|^(?:[0-9a-f]{2}${escapedDelim}){5}[0-9a-f]{2}$`);
}, cidrv4, cidrv6, base64, base64url, hostname, domain, httpProtocol, e164, dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`, date, string = (params) => {
  const regex = params ? `[\\s\\S]{${params?.minimum ?? 0},${params?.maximum ?? ""}}` : `[\\s\\S]*`;
  return new RegExp(`^${regex}$`);
}, bigint, integer, number, boolean, _null, _undefined, lowercase, uppercase, hex, md5_hex, md5_base64, md5_base64url, sha1_hex, sha1_base64, sha1_base64url, sha256_hex, sha256_base64, sha256_base64url, sha384_hex, sha384_base64, sha384_base64url, sha512_hex, sha512_base64, sha512_base64url;
var init_regexes = __esm(() => {
  init_util();
  cuid = /^[cC][0-9a-z]{6,}$/;
  cuid2 = /^[0-9a-z]+$/;
  ulid = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/;
  xid = /^[0-9a-vA-V]{20}$/;
  ksuid = /^[A-Za-z0-9]{27}$/;
  nanoid = /^[a-zA-Z0-9_-]{21}$/;
  duration = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
  extendedDuration = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
  guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
  uuid4 = /* @__PURE__ */ uuid(4);
  uuid6 = /* @__PURE__ */ uuid(6);
  uuid7 = /* @__PURE__ */ uuid(7);
  email = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
  html5Email = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  rfc5322Email = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  unicodeEmail = /^[^\s@"]{1,64}@[^\s@]{1,255}$/u;
  idnEmail = unicodeEmail;
  browserEmail = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
  ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
  cidrv4 = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
  cidrv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
  base64 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
  base64url = /^[A-Za-z0-9_-]*$/;
  hostname = /^(?=.{1,253}\.?$)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[-0-9a-zA-Z]{0,61}[0-9a-zA-Z])?)*\.?$/;
  domain = /^([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  httpProtocol = /^https?$/;
  e164 = /^\+[1-9]\d{6,14}$/;
  date = /* @__PURE__ */ new RegExp(`^${dateSource}$`);
  bigint = /^-?\d+n?$/;
  integer = /^-?\d+$/;
  number = /^-?\d+(?:\.\d+)?$/;
  boolean = /^(?:true|false)$/i;
  _null = /^null$/i;
  _undefined = /^undefined$/i;
  lowercase = /^[^A-Z]*$/;
  uppercase = /^[^a-z]*$/;
  hex = /^[0-9a-fA-F]*$/;
  md5_hex = /^[0-9a-fA-F]{32}$/;
  md5_base64 = /* @__PURE__ */ fixedBase64(22, "==");
  md5_base64url = /* @__PURE__ */ fixedBase64url(22);
  sha1_hex = /^[0-9a-fA-F]{40}$/;
  sha1_base64 = /* @__PURE__ */ fixedBase64(27, "=");
  sha1_base64url = /* @__PURE__ */ fixedBase64url(27);
  sha256_hex = /^[0-9a-fA-F]{64}$/;
  sha256_base64 = /* @__PURE__ */ fixedBase64(43, "=");
  sha256_base64url = /* @__PURE__ */ fixedBase64url(43);
  sha384_hex = /^[0-9a-fA-F]{96}$/;
  sha384_base64 = /* @__PURE__ */ fixedBase64(64, "");
  sha384_base64url = /* @__PURE__ */ fixedBase64url(64);
  sha512_hex = /^[0-9a-fA-F]{128}$/;
  sha512_base64 = /* @__PURE__ */ fixedBase64(86, "==");
  sha512_base64url = /* @__PURE__ */ fixedBase64url(86);
});

// node_modules/zod/v4/core/checks.js
function handleCheckPropertyResult(result, payload, property) {
  if (result.issues.length) {
    payload.issues.push(...prefixIssues(property, result.issues));
  }
}
var $ZodCheck, numericOriginMap, $ZodCheckLessThan, $ZodCheckGreaterThan, $ZodCheckMultipleOf, $ZodCheckNumberFormat, $ZodCheckBigIntFormat, $ZodCheckMaxSize, $ZodCheckMinSize, $ZodCheckSizeEquals, $ZodCheckMaxLength, $ZodCheckMinLength, $ZodCheckLengthEquals, $ZodCheckStringFormat, $ZodCheckRegex, $ZodCheckLowerCase, $ZodCheckUpperCase, $ZodCheckIncludes, $ZodCheckStartsWith, $ZodCheckEndsWith, $ZodCheckProperty, $ZodCheckMimeType, $ZodCheckOverwrite;
var init_checks = __esm(() => {
  init_core();
  init_regexes();
  init_util();
  $ZodCheck = /* @__PURE__ */ $constructor("$ZodCheck", (inst, def) => {
    var _a2;
    inst._zod ?? (inst._zod = {});
    inst._zod.def = def;
    (_a2 = inst._zod).onattach ?? (_a2.onattach = []);
  });
  numericOriginMap = {
    number: "number",
    bigint: "bigint",
    object: "date"
  };
  $ZodCheckLessThan = /* @__PURE__ */ $constructor("$ZodCheckLessThan", (inst, def) => {
    $ZodCheck.init(inst, def);
    const origin = numericOriginMap[typeof def.value];
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      const curr = (def.inclusive ? bag.maximum : bag.exclusiveMaximum) ?? Number.POSITIVE_INFINITY;
      if (def.value < curr) {
        if (def.inclusive)
          bag.maximum = def.value;
        else
          bag.exclusiveMaximum = def.value;
      }
    });
    inst._zod.check = (payload) => {
      if (def.inclusive ? payload.value <= def.value : payload.value < def.value) {
        return;
      }
      payload.issues.push({
        origin,
        code: "too_big",
        maximum: typeof def.value === "object" ? def.value.getTime() : def.value,
        input: payload.value,
        inclusive: def.inclusive,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckGreaterThan = /* @__PURE__ */ $constructor("$ZodCheckGreaterThan", (inst, def) => {
    $ZodCheck.init(inst, def);
    const origin = numericOriginMap[typeof def.value];
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      const curr = (def.inclusive ? bag.minimum : bag.exclusiveMinimum) ?? Number.NEGATIVE_INFINITY;
      if (def.value > curr) {
        if (def.inclusive)
          bag.minimum = def.value;
        else
          bag.exclusiveMinimum = def.value;
      }
    });
    inst._zod.check = (payload) => {
      if (def.inclusive ? payload.value >= def.value : payload.value > def.value) {
        return;
      }
      payload.issues.push({
        origin,
        code: "too_small",
        minimum: typeof def.value === "object" ? def.value.getTime() : def.value,
        input: payload.value,
        inclusive: def.inclusive,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckMultipleOf = /* @__PURE__ */ $constructor("$ZodCheckMultipleOf", (inst, def) => {
    $ZodCheck.init(inst, def);
    inst._zod.onattach.push((inst2) => {
      var _a2;
      (_a2 = inst2._zod.bag).multipleOf ?? (_a2.multipleOf = def.value);
    });
    inst._zod.check = (payload) => {
      if (typeof payload.value !== typeof def.value)
        throw new Error("Cannot mix number and bigint in multiple_of check.");
      const isMultiple = typeof payload.value === "bigint" ? payload.value % def.value === BigInt(0) : floatSafeRemainder(payload.value, def.value) === 0;
      if (isMultiple)
        return;
      payload.issues.push({
        origin: typeof payload.value,
        code: "not_multiple_of",
        divisor: def.value,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckNumberFormat = /* @__PURE__ */ $constructor("$ZodCheckNumberFormat", (inst, def) => {
    $ZodCheck.init(inst, def);
    def.format = def.format || "float64";
    const isInt = def.format?.includes("int");
    const origin = isInt ? "int" : "number";
    const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.format = def.format;
      bag.minimum = minimum;
      bag.maximum = maximum;
      if (isInt)
        bag.pattern = integer;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      if (isInt) {
        if (!Number.isInteger(input)) {
          payload.issues.push({
            expected: origin,
            format: def.format,
            code: "invalid_type",
            continue: false,
            input,
            inst
          });
          return;
        }
        if (!Number.isSafeInteger(input)) {
          if (input > 0) {
            payload.issues.push({
              input,
              code: "too_big",
              maximum: Number.MAX_SAFE_INTEGER,
              note: "Integers must be within the safe integer range.",
              inst,
              origin,
              inclusive: true,
              continue: !def.abort
            });
          } else {
            payload.issues.push({
              input,
              code: "too_small",
              minimum: Number.MIN_SAFE_INTEGER,
              note: "Integers must be within the safe integer range.",
              inst,
              origin,
              inclusive: true,
              continue: !def.abort
            });
          }
          return;
        }
      }
      if (input < minimum) {
        payload.issues.push({
          origin: "number",
          input,
          code: "too_small",
          minimum,
          inclusive: true,
          inst,
          continue: !def.abort
        });
      }
      if (input > maximum) {
        payload.issues.push({
          origin: "number",
          input,
          code: "too_big",
          maximum,
          inclusive: true,
          inst,
          continue: !def.abort
        });
      }
    };
  });
  $ZodCheckBigIntFormat = /* @__PURE__ */ $constructor("$ZodCheckBigIntFormat", (inst, def) => {
    $ZodCheck.init(inst, def);
    const [minimum, maximum] = BIGINT_FORMAT_RANGES[def.format];
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.format = def.format;
      bag.minimum = minimum;
      bag.maximum = maximum;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      if (input < minimum) {
        payload.issues.push({
          origin: "bigint",
          input,
          code: "too_small",
          minimum,
          inclusive: true,
          inst,
          continue: !def.abort
        });
      }
      if (input > maximum) {
        payload.issues.push({
          origin: "bigint",
          input,
          code: "too_big",
          maximum,
          inclusive: true,
          inst,
          continue: !def.abort
        });
      }
    };
  });
  $ZodCheckMaxSize = /* @__PURE__ */ $constructor("$ZodCheckMaxSize", (inst, def) => {
    var _a2;
    $ZodCheck.init(inst, def);
    (_a2 = inst._zod.def).when ?? (_a2.when = (payload) => {
      const val = payload.value;
      return !nullish(val) && val.size !== undefined;
    });
    inst._zod.onattach.push((inst2) => {
      const curr = inst2._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
      if (def.maximum < curr)
        inst2._zod.bag.maximum = def.maximum;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      const size = input.size;
      if (size <= def.maximum)
        return;
      payload.issues.push({
        origin: getSizableOrigin(input),
        code: "too_big",
        maximum: def.maximum,
        inclusive: true,
        input,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckMinSize = /* @__PURE__ */ $constructor("$ZodCheckMinSize", (inst, def) => {
    var _a2;
    $ZodCheck.init(inst, def);
    (_a2 = inst._zod.def).when ?? (_a2.when = (payload) => {
      const val = payload.value;
      return !nullish(val) && val.size !== undefined;
    });
    inst._zod.onattach.push((inst2) => {
      const curr = inst2._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
      if (def.minimum > curr)
        inst2._zod.bag.minimum = def.minimum;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      const size = input.size;
      if (size >= def.minimum)
        return;
      payload.issues.push({
        origin: getSizableOrigin(input),
        code: "too_small",
        minimum: def.minimum,
        inclusive: true,
        input,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckSizeEquals = /* @__PURE__ */ $constructor("$ZodCheckSizeEquals", (inst, def) => {
    var _a2;
    $ZodCheck.init(inst, def);
    (_a2 = inst._zod.def).when ?? (_a2.when = (payload) => {
      const val = payload.value;
      return !nullish(val) && val.size !== undefined;
    });
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.minimum = def.size;
      bag.maximum = def.size;
      bag.size = def.size;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      const size = input.size;
      if (size === def.size)
        return;
      const tooBig = size > def.size;
      payload.issues.push({
        origin: getSizableOrigin(input),
        ...tooBig ? { code: "too_big", maximum: def.size } : { code: "too_small", minimum: def.size },
        inclusive: true,
        exact: true,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckMaxLength = /* @__PURE__ */ $constructor("$ZodCheckMaxLength", (inst, def) => {
    var _a2;
    $ZodCheck.init(inst, def);
    (_a2 = inst._zod.def).when ?? (_a2.when = (payload) => {
      const val = payload.value;
      return !nullish(val) && val.length !== undefined;
    });
    inst._zod.onattach.push((inst2) => {
      const curr = inst2._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
      if (def.maximum < curr)
        inst2._zod.bag.maximum = def.maximum;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      const length = input.length;
      if (length <= def.maximum)
        return;
      const origin = getLengthableOrigin(input);
      payload.issues.push({
        origin,
        code: "too_big",
        maximum: def.maximum,
        inclusive: true,
        input,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckMinLength = /* @__PURE__ */ $constructor("$ZodCheckMinLength", (inst, def) => {
    var _a2;
    $ZodCheck.init(inst, def);
    (_a2 = inst._zod.def).when ?? (_a2.when = (payload) => {
      const val = payload.value;
      return !nullish(val) && val.length !== undefined;
    });
    inst._zod.onattach.push((inst2) => {
      const curr = inst2._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
      if (def.minimum > curr)
        inst2._zod.bag.minimum = def.minimum;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      const length = input.length;
      if (length >= def.minimum)
        return;
      const origin = getLengthableOrigin(input);
      payload.issues.push({
        origin,
        code: "too_small",
        minimum: def.minimum,
        inclusive: true,
        input,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckLengthEquals = /* @__PURE__ */ $constructor("$ZodCheckLengthEquals", (inst, def) => {
    var _a2;
    $ZodCheck.init(inst, def);
    (_a2 = inst._zod.def).when ?? (_a2.when = (payload) => {
      const val = payload.value;
      return !nullish(val) && val.length !== undefined;
    });
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.minimum = def.length;
      bag.maximum = def.length;
      bag.length = def.length;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      const length = input.length;
      if (length === def.length)
        return;
      const origin = getLengthableOrigin(input);
      const tooBig = length > def.length;
      payload.issues.push({
        origin,
        ...tooBig ? { code: "too_big", maximum: def.length } : { code: "too_small", minimum: def.length },
        inclusive: true,
        exact: true,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckStringFormat = /* @__PURE__ */ $constructor("$ZodCheckStringFormat", (inst, def) => {
    var _a2, _b;
    $ZodCheck.init(inst, def);
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.format = def.format;
      if (def.pattern) {
        bag.patterns ?? (bag.patterns = new Set);
        bag.patterns.add(def.pattern);
      }
    });
    if (def.pattern)
      (_a2 = inst._zod).check ?? (_a2.check = (payload) => {
        def.pattern.lastIndex = 0;
        if (def.pattern.test(payload.value))
          return;
        payload.issues.push({
          origin: "string",
          code: "invalid_format",
          format: def.format,
          input: payload.value,
          ...def.pattern ? { pattern: def.pattern.toString() } : {},
          inst,
          continue: !def.abort
        });
      });
    else
      (_b = inst._zod).check ?? (_b.check = () => {});
  });
  $ZodCheckRegex = /* @__PURE__ */ $constructor("$ZodCheckRegex", (inst, def) => {
    $ZodCheckStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      def.pattern.lastIndex = 0;
      if (def.pattern.test(payload.value))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: "regex",
        input: payload.value,
        pattern: def.pattern.toString(),
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckLowerCase = /* @__PURE__ */ $constructor("$ZodCheckLowerCase", (inst, def) => {
    def.pattern ?? (def.pattern = lowercase);
    $ZodCheckStringFormat.init(inst, def);
  });
  $ZodCheckUpperCase = /* @__PURE__ */ $constructor("$ZodCheckUpperCase", (inst, def) => {
    def.pattern ?? (def.pattern = uppercase);
    $ZodCheckStringFormat.init(inst, def);
  });
  $ZodCheckIncludes = /* @__PURE__ */ $constructor("$ZodCheckIncludes", (inst, def) => {
    $ZodCheck.init(inst, def);
    const escapedRegex = escapeRegex(def.includes);
    const pattern = new RegExp(typeof def.position === "number" ? `^.{${def.position}}${escapedRegex}` : escapedRegex);
    def.pattern = pattern;
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.patterns ?? (bag.patterns = new Set);
      bag.patterns.add(pattern);
    });
    inst._zod.check = (payload) => {
      if (payload.value.includes(def.includes, def.position))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: "includes",
        includes: def.includes,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckStartsWith = /* @__PURE__ */ $constructor("$ZodCheckStartsWith", (inst, def) => {
    $ZodCheck.init(inst, def);
    const pattern = new RegExp(`^${escapeRegex(def.prefix)}.*`);
    def.pattern ?? (def.pattern = pattern);
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.patterns ?? (bag.patterns = new Set);
      bag.patterns.add(pattern);
    });
    inst._zod.check = (payload) => {
      if (payload.value.startsWith(def.prefix))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: "starts_with",
        prefix: def.prefix,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckEndsWith = /* @__PURE__ */ $constructor("$ZodCheckEndsWith", (inst, def) => {
    $ZodCheck.init(inst, def);
    const pattern = new RegExp(`.*${escapeRegex(def.suffix)}$`);
    def.pattern ?? (def.pattern = pattern);
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.patterns ?? (bag.patterns = new Set);
      bag.patterns.add(pattern);
    });
    inst._zod.check = (payload) => {
      if (payload.value.endsWith(def.suffix))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: "ends_with",
        suffix: def.suffix,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckProperty = /* @__PURE__ */ $constructor("$ZodCheckProperty", (inst, def) => {
    $ZodCheck.init(inst, def);
    inst._zod.check = (payload) => {
      const result = def.schema._zod.run({
        value: payload.value[def.property],
        issues: []
      }, {});
      if (result instanceof Promise) {
        return result.then((result2) => handleCheckPropertyResult(result2, payload, def.property));
      }
      handleCheckPropertyResult(result, payload, def.property);
      return;
    };
  });
  $ZodCheckMimeType = /* @__PURE__ */ $constructor("$ZodCheckMimeType", (inst, def) => {
    $ZodCheck.init(inst, def);
    const mimeSet = new Set(def.mime);
    inst._zod.onattach.push((inst2) => {
      inst2._zod.bag.mime = def.mime;
    });
    inst._zod.check = (payload) => {
      if (mimeSet.has(payload.value.type))
        return;
      payload.issues.push({
        code: "invalid_value",
        values: def.mime,
        input: payload.value.type,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckOverwrite = /* @__PURE__ */ $constructor("$ZodCheckOverwrite", (inst, def) => {
    $ZodCheck.init(inst, def);
    inst._zod.check = (payload) => {
      payload.value = def.tx(payload.value);
    };
  });
});

// node_modules/zod/v4/core/doc.js
class Doc {
  constructor(args = []) {
    this.content = [];
    this.indent = 0;
    if (this)
      this.args = args;
  }
  indented(fn) {
    this.indent += 1;
    fn(this);
    this.indent -= 1;
  }
  write(arg) {
    if (typeof arg === "function") {
      arg(this, { execution: "sync" });
      arg(this, { execution: "async" });
      return;
    }
    const content = arg;
    const lines = content.split(`
`).filter((x) => x);
    const minIndent = Math.min(...lines.map((x) => x.length - x.trimStart().length));
    const dedented = lines.map((x) => x.slice(minIndent)).map((x) => " ".repeat(this.indent * 2) + x);
    for (const line of dedented) {
      this.content.push(line);
    }
  }
  compile() {
    const F = Function;
    const args = this?.args;
    const content = this?.content ?? [``];
    const lines = [...content.map((x) => `  ${x}`)];
    return new F(...args, lines.join(`
`));
  }
}

// node_modules/zod/v4/core/versions.js
var version;
var init_versions = __esm(() => {
  version = {
    major: 4,
    minor: 4,
    patch: 3
  };
});

// node_modules/zod/v4/core/schemas.js
function isValidBase64(data) {
  if (data === "")
    return true;
  if (/\s/.test(data))
    return false;
  if (data.length % 4 !== 0)
    return false;
  try {
    atob(data);
    return true;
  } catch {
    return false;
  }
}
function isValidBase64URL(data) {
  if (!base64url.test(data))
    return false;
  const base642 = data.replace(/[-_]/g, (c) => c === "-" ? "+" : "/");
  const padded = base642.padEnd(Math.ceil(base642.length / 4) * 4, "=");
  return isValidBase64(padded);
}
function isValidJWT(token, algorithm = null) {
  try {
    const tokensParts = token.split(".");
    if (tokensParts.length !== 3)
      return false;
    const [header] = tokensParts;
    if (!header)
      return false;
    const parsedHeader = JSON.parse(atob(header));
    if ("typ" in parsedHeader && parsedHeader?.typ !== "JWT")
      return false;
    if (!parsedHeader.alg)
      return false;
    if (algorithm && (!("alg" in parsedHeader) || parsedHeader.alg !== algorithm))
      return false;
    return true;
  } catch {
    return false;
  }
}
function handleArrayResult(result, final, index) {
  if (result.issues.length) {
    final.issues.push(...prefixIssues(index, result.issues));
  }
  final.value[index] = result.value;
}
function handlePropertyResult(result, final, key, input, isOptionalIn, isOptionalOut) {
  const isPresent = key in input;
  if (result.issues.length) {
    if (isOptionalIn && isOptionalOut && !isPresent) {
      return;
    }
    final.issues.push(...prefixIssues(key, result.issues));
  }
  if (!isPresent && !isOptionalIn) {
    if (!result.issues.length) {
      final.issues.push({
        code: "invalid_type",
        expected: "nonoptional",
        input: undefined,
        path: [key]
      });
    }
    return;
  }
  if (result.value === undefined) {
    if (isPresent) {
      final.value[key] = undefined;
    }
  } else {
    final.value[key] = result.value;
  }
}
function normalizeDef(def) {
  const keys = Object.keys(def.shape);
  for (const k of keys) {
    if (!def.shape?.[k]?._zod?.traits?.has("$ZodType")) {
      throw new Error(`Invalid element at key "${k}": expected a Zod schema`);
    }
  }
  const okeys = optionalKeys(def.shape);
  return {
    ...def,
    keys,
    keySet: new Set(keys),
    numKeys: keys.length,
    optionalKeys: new Set(okeys)
  };
}
function handleCatchall(proms, input, payload, ctx, def, inst) {
  const unrecognized = [];
  const keySet = def.keySet;
  const _catchall = def.catchall._zod;
  const t = _catchall.def.type;
  const isOptionalIn = _catchall.optin === "optional";
  const isOptionalOut = _catchall.optout === "optional";
  for (const key in input) {
    if (key === "__proto__")
      continue;
    if (keySet.has(key))
      continue;
    if (t === "never") {
      unrecognized.push(key);
      continue;
    }
    const r = _catchall.run({ value: input[key], issues: [] }, ctx);
    if (r instanceof Promise) {
      proms.push(r.then((r2) => handlePropertyResult(r2, payload, key, input, isOptionalIn, isOptionalOut)));
    } else {
      handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut);
    }
  }
  if (unrecognized.length) {
    payload.issues.push({
      code: "unrecognized_keys",
      keys: unrecognized,
      input,
      inst
    });
  }
  if (!proms.length)
    return payload;
  return Promise.all(proms).then(() => {
    return payload;
  });
}
function handleUnionResults(results, final, inst, ctx) {
  for (const result of results) {
    if (result.issues.length === 0) {
      final.value = result.value;
      return final;
    }
  }
  const nonaborted = results.filter((r) => !aborted(r));
  if (nonaborted.length === 1) {
    final.value = nonaborted[0].value;
    return nonaborted[0];
  }
  final.issues.push({
    code: "invalid_union",
    input: final.value,
    inst,
    errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  });
  return final;
}
function handleExclusiveUnionResults(results, final, inst, ctx) {
  const successes = results.filter((r) => r.issues.length === 0);
  if (successes.length === 1) {
    final.value = successes[0].value;
    return final;
  }
  if (successes.length === 0) {
    final.issues.push({
      code: "invalid_union",
      input: final.value,
      inst,
      errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
    });
  } else {
    final.issues.push({
      code: "invalid_union",
      input: final.value,
      inst,
      errors: [],
      inclusive: false
    });
  }
  return final;
}
function mergeValues(a, b) {
  if (a === b) {
    return { valid: true, data: a };
  }
  if (a instanceof Date && b instanceof Date && +a === +b) {
    return { valid: true, data: a };
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const bKeys = Object.keys(b);
    const sharedKeys = Object.keys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return {
          valid: false,
          mergeErrorPath: [key, ...sharedValue.mergeErrorPath]
        };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return { valid: false, mergeErrorPath: [] };
    }
    const newArray = [];
    for (let index = 0;index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return {
          valid: false,
          mergeErrorPath: [index, ...sharedValue.mergeErrorPath]
        };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  }
  return { valid: false, mergeErrorPath: [] };
}
function handleIntersectionResults(result, left, right) {
  const unrecKeys = new Map;
  let unrecIssue;
  for (const iss of left.issues) {
    if (iss.code === "unrecognized_keys") {
      unrecIssue ?? (unrecIssue = iss);
      for (const k of iss.keys) {
        if (!unrecKeys.has(k))
          unrecKeys.set(k, {});
        unrecKeys.get(k).l = true;
      }
    } else {
      result.issues.push(iss);
    }
  }
  for (const iss of right.issues) {
    if (iss.code === "unrecognized_keys") {
      for (const k of iss.keys) {
        if (!unrecKeys.has(k))
          unrecKeys.set(k, {});
        unrecKeys.get(k).r = true;
      }
    } else {
      result.issues.push(iss);
    }
  }
  const bothKeys = [...unrecKeys].filter(([, f]) => f.l && f.r).map(([k]) => k);
  if (bothKeys.length && unrecIssue) {
    result.issues.push({ ...unrecIssue, keys: bothKeys });
  }
  if (aborted(result))
    return result;
  const merged = mergeValues(left.value, right.value);
  if (!merged.valid) {
    throw new Error(`Unmergable intersection. Error path: ` + `${JSON.stringify(merged.mergeErrorPath)}`);
  }
  result.value = merged.data;
  return result;
}
function getTupleOptStart(items, key) {
  for (let i = items.length - 1;i >= 0; i--) {
    if (items[i]._zod[key] !== "optional")
      return i + 1;
  }
  return 0;
}
function handleTupleResult(result, final, index) {
  if (result.issues.length) {
    final.issues.push(...prefixIssues(index, result.issues));
  }
  final.value[index] = result.value;
}
function handleTupleResults(itemResults, final, items, input, optoutStart) {
  for (let i = 0;i < items.length; i++) {
    const r = itemResults[i];
    const isPresent = i < input.length;
    if (r.issues.length) {
      if (!isPresent && i >= optoutStart) {
        final.value.length = i;
        break;
      }
      final.issues.push(...prefixIssues(i, r.issues));
    }
    final.value[i] = r.value;
  }
  for (let i = final.value.length - 1;i >= input.length; i--) {
    if (items[i]._zod.optout === "optional" && final.value[i] === undefined) {
      final.value.length = i;
    } else {
      break;
    }
  }
  return final;
}
function handleMapResult(keyResult, valueResult, final, key, input, inst, ctx) {
  if (keyResult.issues.length) {
    if (propertyKeyTypes.has(typeof key)) {
      final.issues.push(...prefixIssues(key, keyResult.issues));
    } else {
      final.issues.push({
        code: "invalid_key",
        origin: "map",
        input,
        inst,
        issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config()))
      });
    }
  }
  if (valueResult.issues.length) {
    if (propertyKeyTypes.has(typeof key)) {
      final.issues.push(...prefixIssues(key, valueResult.issues));
    } else {
      final.issues.push({
        origin: "map",
        code: "invalid_element",
        input,
        inst,
        key,
        issues: valueResult.issues.map((iss) => finalizeIssue(iss, ctx, config()))
      });
    }
  }
  final.value.set(keyResult.value, valueResult.value);
}
function handleSetResult(result, final) {
  if (result.issues.length) {
    final.issues.push(...result.issues);
  }
  final.value.add(result.value);
}
function handleOptionalResult(result, input) {
  if (input === undefined && (result.issues.length || result.fallback)) {
    return { issues: [], value: undefined };
  }
  return result;
}
function handleDefaultResult(payload, def) {
  if (payload.value === undefined) {
    payload.value = def.defaultValue;
  }
  return payload;
}
function handleNonOptionalResult(payload, inst) {
  if (!payload.issues.length && payload.value === undefined) {
    payload.issues.push({
      code: "invalid_type",
      expected: "nonoptional",
      input: payload.value,
      inst
    });
  }
  return payload;
}
function handlePipeResult(left, next, ctx) {
  if (left.issues.length) {
    left.aborted = true;
    return left;
  }
  return next._zod.run({ value: left.value, issues: left.issues, fallback: left.fallback }, ctx);
}
function handleCodecAResult(result, def, ctx) {
  if (result.issues.length) {
    result.aborted = true;
    return result;
  }
  const direction = ctx.direction || "forward";
  if (direction === "forward") {
    const transformed = def.transform(result.value, result);
    if (transformed instanceof Promise) {
      return transformed.then((value) => handleCodecTxResult(result, value, def.out, ctx));
    }
    return handleCodecTxResult(result, transformed, def.out, ctx);
  } else {
    const transformed = def.reverseTransform(result.value, result);
    if (transformed instanceof Promise) {
      return transformed.then((value) => handleCodecTxResult(result, value, def.in, ctx));
    }
    return handleCodecTxResult(result, transformed, def.in, ctx);
  }
}
function handleCodecTxResult(left, value, nextSchema, ctx) {
  if (left.issues.length) {
    left.aborted = true;
    return left;
  }
  return nextSchema._zod.run({ value, issues: left.issues }, ctx);
}
function handleReadonlyResult(payload) {
  payload.value = Object.freeze(payload.value);
  return payload;
}
function handleRefineResult(result, payload, input, inst) {
  if (!result) {
    const _iss = {
      code: "custom",
      input,
      inst,
      path: [...inst._zod.def.path ?? []],
      continue: !inst._zod.def.abort
    };
    if (inst._zod.def.params)
      _iss.params = inst._zod.def.params;
    payload.issues.push(issue(_iss));
  }
}
var $ZodType, $ZodString, $ZodStringFormat, $ZodGUID, $ZodUUID, $ZodEmail, $ZodURL, $ZodEmoji, $ZodNanoID, $ZodCUID, $ZodCUID2, $ZodULID, $ZodXID, $ZodKSUID, $ZodISODateTime, $ZodISODate, $ZodISOTime, $ZodISODuration, $ZodIPv4, $ZodIPv6, $ZodMAC, $ZodCIDRv4, $ZodCIDRv6, $ZodBase64, $ZodBase64URL, $ZodE164, $ZodJWT, $ZodCustomStringFormat, $ZodNumber, $ZodNumberFormat, $ZodBoolean, $ZodBigInt, $ZodBigIntFormat, $ZodSymbol, $ZodUndefined, $ZodNull, $ZodAny, $ZodUnknown, $ZodNever, $ZodVoid, $ZodDate, $ZodArray, $ZodObject, $ZodObjectJIT, $ZodUnion, $ZodXor, $ZodDiscriminatedUnion, $ZodIntersection, $ZodTuple, $ZodRecord, $ZodMap, $ZodSet, $ZodEnum, $ZodLiteral, $ZodFile, $ZodTransform, $ZodOptional, $ZodExactOptional, $ZodNullable, $ZodDefault, $ZodPrefault, $ZodNonOptional, $ZodSuccess, $ZodCatch, $ZodNaN, $ZodPipe, $ZodCodec, $ZodPreprocess, $ZodReadonly, $ZodTemplateLiteral, $ZodFunction, $ZodPromise, $ZodLazy, $ZodCustom;
var init_schemas = __esm(() => {
  init_checks();
  init_core();
  init_parse();
  init_regexes();
  init_util();
  init_versions();
  init_util();
  $ZodType = /* @__PURE__ */ $constructor("$ZodType", (inst, def) => {
    var _a2;
    inst ?? (inst = {});
    inst._zod.def = def;
    inst._zod.bag = inst._zod.bag || {};
    inst._zod.version = version;
    const checks = [...inst._zod.def.checks ?? []];
    if (inst._zod.traits.has("$ZodCheck")) {
      checks.unshift(inst);
    }
    for (const ch of checks) {
      for (const fn of ch._zod.onattach) {
        fn(inst);
      }
    }
    if (checks.length === 0) {
      (_a2 = inst._zod).deferred ?? (_a2.deferred = []);
      inst._zod.deferred?.push(() => {
        inst._zod.run = inst._zod.parse;
      });
    } else {
      const runChecks = (payload, checks2, ctx) => {
        let isAborted = aborted(payload);
        let asyncResult;
        for (const ch of checks2) {
          if (ch._zod.def.when) {
            if (explicitlyAborted(payload))
              continue;
            const shouldRun = ch._zod.def.when(payload);
            if (!shouldRun)
              continue;
          } else if (isAborted) {
            continue;
          }
          const currLen = payload.issues.length;
          const _ = ch._zod.check(payload);
          if (_ instanceof Promise && ctx?.async === false) {
            throw new $ZodAsyncError;
          }
          if (asyncResult || _ instanceof Promise) {
            asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
              await _;
              const nextLen = payload.issues.length;
              if (nextLen === currLen)
                return;
              if (!isAborted)
                isAborted = aborted(payload, currLen);
            });
          } else {
            const nextLen = payload.issues.length;
            if (nextLen === currLen)
              continue;
            if (!isAborted)
              isAborted = aborted(payload, currLen);
          }
        }
        if (asyncResult) {
          return asyncResult.then(() => {
            return payload;
          });
        }
        return payload;
      };
      const handleCanaryResult = (canary, payload, ctx) => {
        if (aborted(canary)) {
          canary.aborted = true;
          return canary;
        }
        const checkResult = runChecks(payload, checks, ctx);
        if (checkResult instanceof Promise) {
          if (ctx.async === false)
            throw new $ZodAsyncError;
          return checkResult.then((checkResult2) => inst._zod.parse(checkResult2, ctx));
        }
        return inst._zod.parse(checkResult, ctx);
      };
      inst._zod.run = (payload, ctx) => {
        if (ctx.skipChecks) {
          return inst._zod.parse(payload, ctx);
        }
        if (ctx.direction === "backward") {
          const canary = inst._zod.parse({ value: payload.value, issues: [] }, { ...ctx, skipChecks: true });
          if (canary instanceof Promise) {
            return canary.then((canary2) => {
              return handleCanaryResult(canary2, payload, ctx);
            });
          }
          return handleCanaryResult(canary, payload, ctx);
        }
        const result = inst._zod.parse(payload, ctx);
        if (result instanceof Promise) {
          if (ctx.async === false)
            throw new $ZodAsyncError;
          return result.then((result2) => runChecks(result2, checks, ctx));
        }
        return runChecks(result, checks, ctx);
      };
    }
    defineLazy(inst, "~standard", () => ({
      validate: (value) => {
        try {
          const r = safeParse(inst, value);
          return r.success ? { value: r.data } : { issues: r.error?.issues };
        } catch (_) {
          return safeParseAsync(inst, value).then((r) => r.success ? { value: r.data } : { issues: r.error?.issues });
        }
      },
      vendor: "zod",
      version: 1
    }));
  });
  $ZodString = /* @__PURE__ */ $constructor("$ZodString", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = [...inst?._zod.bag?.patterns ?? []].pop() ?? string(inst._zod.bag);
    inst._zod.parse = (payload, _) => {
      if (def.coerce)
        try {
          payload.value = String(payload.value);
        } catch (_2) {}
      if (typeof payload.value === "string")
        return payload;
      payload.issues.push({
        expected: "string",
        code: "invalid_type",
        input: payload.value,
        inst
      });
      return payload;
    };
  });
  $ZodStringFormat = /* @__PURE__ */ $constructor("$ZodStringFormat", (inst, def) => {
    $ZodCheckStringFormat.init(inst, def);
    $ZodString.init(inst, def);
  });
  $ZodGUID = /* @__PURE__ */ $constructor("$ZodGUID", (inst, def) => {
    def.pattern ?? (def.pattern = guid);
    $ZodStringFormat.init(inst, def);
  });
  $ZodUUID = /* @__PURE__ */ $constructor("$ZodUUID", (inst, def) => {
    if (def.version) {
      const versionMap = {
        v1: 1,
        v2: 2,
        v3: 3,
        v4: 4,
        v5: 5,
        v6: 6,
        v7: 7,
        v8: 8
      };
      const v = versionMap[def.version];
      if (v === undefined)
        throw new Error(`Invalid UUID version: "${def.version}"`);
      def.pattern ?? (def.pattern = uuid(v));
    } else
      def.pattern ?? (def.pattern = uuid());
    $ZodStringFormat.init(inst, def);
  });
  $ZodEmail = /* @__PURE__ */ $constructor("$ZodEmail", (inst, def) => {
    def.pattern ?? (def.pattern = email);
    $ZodStringFormat.init(inst, def);
  });
  $ZodURL = /* @__PURE__ */ $constructor("$ZodURL", (inst, def) => {
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      try {
        const trimmed = payload.value.trim();
        if (!def.normalize && def.protocol?.source === httpProtocol.source) {
          if (!/^https?:\/\//i.test(trimmed)) {
            payload.issues.push({
              code: "invalid_format",
              format: "url",
              note: "Invalid URL format",
              input: payload.value,
              inst,
              continue: !def.abort
            });
            return;
          }
        }
        const url = new URL(trimmed);
        if (def.hostname) {
          def.hostname.lastIndex = 0;
          if (!def.hostname.test(url.hostname)) {
            payload.issues.push({
              code: "invalid_format",
              format: "url",
              note: "Invalid hostname",
              pattern: def.hostname.source,
              input: payload.value,
              inst,
              continue: !def.abort
            });
          }
        }
        if (def.protocol) {
          def.protocol.lastIndex = 0;
          if (!def.protocol.test(url.protocol.endsWith(":") ? url.protocol.slice(0, -1) : url.protocol)) {
            payload.issues.push({
              code: "invalid_format",
              format: "url",
              note: "Invalid protocol",
              pattern: def.protocol.source,
              input: payload.value,
              inst,
              continue: !def.abort
            });
          }
        }
        if (def.normalize) {
          payload.value = url.href;
        } else {
          payload.value = trimmed;
        }
        return;
      } catch (_) {
        payload.issues.push({
          code: "invalid_format",
          format: "url",
          input: payload.value,
          inst,
          continue: !def.abort
        });
      }
    };
  });
  $ZodEmoji = /* @__PURE__ */ $constructor("$ZodEmoji", (inst, def) => {
    def.pattern ?? (def.pattern = emoji());
    $ZodStringFormat.init(inst, def);
  });
  $ZodNanoID = /* @__PURE__ */ $constructor("$ZodNanoID", (inst, def) => {
    def.pattern ?? (def.pattern = nanoid);
    $ZodStringFormat.init(inst, def);
  });
  $ZodCUID = /* @__PURE__ */ $constructor("$ZodCUID", (inst, def) => {
    def.pattern ?? (def.pattern = cuid);
    $ZodStringFormat.init(inst, def);
  });
  $ZodCUID2 = /* @__PURE__ */ $constructor("$ZodCUID2", (inst, def) => {
    def.pattern ?? (def.pattern = cuid2);
    $ZodStringFormat.init(inst, def);
  });
  $ZodULID = /* @__PURE__ */ $constructor("$ZodULID", (inst, def) => {
    def.pattern ?? (def.pattern = ulid);
    $ZodStringFormat.init(inst, def);
  });
  $ZodXID = /* @__PURE__ */ $constructor("$ZodXID", (inst, def) => {
    def.pattern ?? (def.pattern = xid);
    $ZodStringFormat.init(inst, def);
  });
  $ZodKSUID = /* @__PURE__ */ $constructor("$ZodKSUID", (inst, def) => {
    def.pattern ?? (def.pattern = ksuid);
    $ZodStringFormat.init(inst, def);
  });
  $ZodISODateTime = /* @__PURE__ */ $constructor("$ZodISODateTime", (inst, def) => {
    def.pattern ?? (def.pattern = datetime(def));
    $ZodStringFormat.init(inst, def);
  });
  $ZodISODate = /* @__PURE__ */ $constructor("$ZodISODate", (inst, def) => {
    def.pattern ?? (def.pattern = date);
    $ZodStringFormat.init(inst, def);
  });
  $ZodISOTime = /* @__PURE__ */ $constructor("$ZodISOTime", (inst, def) => {
    def.pattern ?? (def.pattern = time(def));
    $ZodStringFormat.init(inst, def);
  });
  $ZodISODuration = /* @__PURE__ */ $constructor("$ZodISODuration", (inst, def) => {
    def.pattern ?? (def.pattern = duration);
    $ZodStringFormat.init(inst, def);
  });
  $ZodIPv4 = /* @__PURE__ */ $constructor("$ZodIPv4", (inst, def) => {
    def.pattern ?? (def.pattern = ipv4);
    $ZodStringFormat.init(inst, def);
    inst._zod.bag.format = `ipv4`;
  });
  $ZodIPv6 = /* @__PURE__ */ $constructor("$ZodIPv6", (inst, def) => {
    def.pattern ?? (def.pattern = ipv6);
    $ZodStringFormat.init(inst, def);
    inst._zod.bag.format = `ipv6`;
    inst._zod.check = (payload) => {
      try {
        new URL(`http://[${payload.value}]`);
      } catch {
        payload.issues.push({
          code: "invalid_format",
          format: "ipv6",
          input: payload.value,
          inst,
          continue: !def.abort
        });
      }
    };
  });
  $ZodMAC = /* @__PURE__ */ $constructor("$ZodMAC", (inst, def) => {
    def.pattern ?? (def.pattern = mac(def.delimiter));
    $ZodStringFormat.init(inst, def);
    inst._zod.bag.format = `mac`;
  });
  $ZodCIDRv4 = /* @__PURE__ */ $constructor("$ZodCIDRv4", (inst, def) => {
    def.pattern ?? (def.pattern = cidrv4);
    $ZodStringFormat.init(inst, def);
  });
  $ZodCIDRv6 = /* @__PURE__ */ $constructor("$ZodCIDRv6", (inst, def) => {
    def.pattern ?? (def.pattern = cidrv6);
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      const parts = payload.value.split("/");
      try {
        if (parts.length !== 2)
          throw new Error;
        const [address, prefix] = parts;
        if (!prefix)
          throw new Error;
        const prefixNum = Number(prefix);
        if (`${prefixNum}` !== prefix)
          throw new Error;
        if (prefixNum < 0 || prefixNum > 128)
          throw new Error;
        new URL(`http://[${address}]`);
      } catch {
        payload.issues.push({
          code: "invalid_format",
          format: "cidrv6",
          input: payload.value,
          inst,
          continue: !def.abort
        });
      }
    };
  });
  $ZodBase64 = /* @__PURE__ */ $constructor("$ZodBase64", (inst, def) => {
    def.pattern ?? (def.pattern = base64);
    $ZodStringFormat.init(inst, def);
    inst._zod.bag.contentEncoding = "base64";
    inst._zod.check = (payload) => {
      if (isValidBase64(payload.value))
        return;
      payload.issues.push({
        code: "invalid_format",
        format: "base64",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodBase64URL = /* @__PURE__ */ $constructor("$ZodBase64URL", (inst, def) => {
    def.pattern ?? (def.pattern = base64url);
    $ZodStringFormat.init(inst, def);
    inst._zod.bag.contentEncoding = "base64url";
    inst._zod.check = (payload) => {
      if (isValidBase64URL(payload.value))
        return;
      payload.issues.push({
        code: "invalid_format",
        format: "base64url",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodE164 = /* @__PURE__ */ $constructor("$ZodE164", (inst, def) => {
    def.pattern ?? (def.pattern = e164);
    $ZodStringFormat.init(inst, def);
  });
  $ZodJWT = /* @__PURE__ */ $constructor("$ZodJWT", (inst, def) => {
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      if (isValidJWT(payload.value, def.alg))
        return;
      payload.issues.push({
        code: "invalid_format",
        format: "jwt",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCustomStringFormat = /* @__PURE__ */ $constructor("$ZodCustomStringFormat", (inst, def) => {
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      if (def.fn(payload.value))
        return;
      payload.issues.push({
        code: "invalid_format",
        format: def.format,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodNumber = /* @__PURE__ */ $constructor("$ZodNumber", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = inst._zod.bag.pattern ?? number;
    inst._zod.parse = (payload, _ctx) => {
      if (def.coerce)
        try {
          payload.value = Number(payload.value);
        } catch (_) {}
      const input = payload.value;
      if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) {
        return payload;
      }
      const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? "Infinity" : undefined : undefined;
      payload.issues.push({
        expected: "number",
        code: "invalid_type",
        input,
        inst,
        ...received ? { received } : {}
      });
      return payload;
    };
  });
  $ZodNumberFormat = /* @__PURE__ */ $constructor("$ZodNumberFormat", (inst, def) => {
    $ZodCheckNumberFormat.init(inst, def);
    $ZodNumber.init(inst, def);
  });
  $ZodBoolean = /* @__PURE__ */ $constructor("$ZodBoolean", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = boolean;
    inst._zod.parse = (payload, _ctx) => {
      if (def.coerce)
        try {
          payload.value = Boolean(payload.value);
        } catch (_) {}
      const input = payload.value;
      if (typeof input === "boolean")
        return payload;
      payload.issues.push({
        expected: "boolean",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    };
  });
  $ZodBigInt = /* @__PURE__ */ $constructor("$ZodBigInt", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = bigint;
    inst._zod.parse = (payload, _ctx) => {
      if (def.coerce)
        try {
          payload.value = BigInt(payload.value);
        } catch (_) {}
      if (typeof payload.value === "bigint")
        return payload;
      payload.issues.push({
        expected: "bigint",
        code: "invalid_type",
        input: payload.value,
        inst
      });
      return payload;
    };
  });
  $ZodBigIntFormat = /* @__PURE__ */ $constructor("$ZodBigIntFormat", (inst, def) => {
    $ZodCheckBigIntFormat.init(inst, def);
    $ZodBigInt.init(inst, def);
  });
  $ZodSymbol = /* @__PURE__ */ $constructor("$ZodSymbol", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
      const input = payload.value;
      if (typeof input === "symbol")
        return payload;
      payload.issues.push({
        expected: "symbol",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    };
  });
  $ZodUndefined = /* @__PURE__ */ $constructor("$ZodUndefined", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = _undefined;
    inst._zod.values = new Set([undefined]);
    inst._zod.parse = (payload, _ctx) => {
      const input = payload.value;
      if (typeof input === "undefined")
        return payload;
      payload.issues.push({
        expected: "undefined",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    };
  });
  $ZodNull = /* @__PURE__ */ $constructor("$ZodNull", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = _null;
    inst._zod.values = new Set([null]);
    inst._zod.parse = (payload, _ctx) => {
      const input = payload.value;
      if (input === null)
        return payload;
      payload.issues.push({
        expected: "null",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    };
  });
  $ZodAny = /* @__PURE__ */ $constructor("$ZodAny", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload) => payload;
  });
  $ZodUnknown = /* @__PURE__ */ $constructor("$ZodUnknown", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload) => payload;
  });
  $ZodNever = /* @__PURE__ */ $constructor("$ZodNever", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
      payload.issues.push({
        expected: "never",
        code: "invalid_type",
        input: payload.value,
        inst
      });
      return payload;
    };
  });
  $ZodVoid = /* @__PURE__ */ $constructor("$ZodVoid", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
      const input = payload.value;
      if (typeof input === "undefined")
        return payload;
      payload.issues.push({
        expected: "void",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    };
  });
  $ZodDate = /* @__PURE__ */ $constructor("$ZodDate", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
      if (def.coerce) {
        try {
          payload.value = new Date(payload.value);
        } catch (_err) {}
      }
      const input = payload.value;
      const isDate = input instanceof Date;
      const isValidDate = isDate && !Number.isNaN(input.getTime());
      if (isValidDate)
        return payload;
      payload.issues.push({
        expected: "date",
        code: "invalid_type",
        input,
        ...isDate ? { received: "Invalid Date" } : {},
        inst
      });
      return payload;
    };
  });
  $ZodArray = /* @__PURE__ */ $constructor("$ZodArray", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      if (!Array.isArray(input)) {
        payload.issues.push({
          expected: "array",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      }
      payload.value = Array(input.length);
      const proms = [];
      for (let i = 0;i < input.length; i++) {
        const item = input[i];
        const result = def.element._zod.run({
          value: item,
          issues: []
        }, ctx);
        if (result instanceof Promise) {
          proms.push(result.then((result2) => handleArrayResult(result2, payload, i)));
        } else {
          handleArrayResult(result, payload, i);
        }
      }
      if (proms.length) {
        return Promise.all(proms).then(() => payload);
      }
      return payload;
    };
  });
  $ZodObject = /* @__PURE__ */ $constructor("$ZodObject", (inst, def) => {
    $ZodType.init(inst, def);
    const desc = Object.getOwnPropertyDescriptor(def, "shape");
    if (!desc?.get) {
      const sh = def.shape;
      Object.defineProperty(def, "shape", {
        get: () => {
          const newSh = { ...sh };
          Object.defineProperty(def, "shape", {
            value: newSh
          });
          return newSh;
        }
      });
    }
    const _normalized = cached(() => normalizeDef(def));
    defineLazy(inst._zod, "propValues", () => {
      const shape = def.shape;
      const propValues = {};
      for (const key in shape) {
        const field = shape[key]._zod;
        if (field.values) {
          propValues[key] ?? (propValues[key] = new Set);
          for (const v of field.values)
            propValues[key].add(v);
        }
      }
      return propValues;
    });
    const isObject2 = isObject;
    const catchall = def.catchall;
    let value;
    inst._zod.parse = (payload, ctx) => {
      value ?? (value = _normalized.value);
      const input = payload.value;
      if (!isObject2(input)) {
        payload.issues.push({
          expected: "object",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      }
      payload.value = {};
      const proms = [];
      const shape = value.shape;
      for (const key of value.keys) {
        const el = shape[key];
        const isOptionalIn = el._zod.optin === "optional";
        const isOptionalOut = el._zod.optout === "optional";
        const r = el._zod.run({ value: input[key], issues: [] }, ctx);
        if (r instanceof Promise) {
          proms.push(r.then((r2) => handlePropertyResult(r2, payload, key, input, isOptionalIn, isOptionalOut)));
        } else {
          handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut);
        }
      }
      if (!catchall) {
        return proms.length ? Promise.all(proms).then(() => payload) : payload;
      }
      return handleCatchall(proms, input, payload, ctx, _normalized.value, inst);
    };
  });
  $ZodObjectJIT = /* @__PURE__ */ $constructor("$ZodObjectJIT", (inst, def) => {
    $ZodObject.init(inst, def);
    const superParse = inst._zod.parse;
    const _normalized = cached(() => normalizeDef(def));
    const generateFastpass = (shape) => {
      const doc = new Doc(["shape", "payload", "ctx"]);
      const normalized = _normalized.value;
      const parseStr = (key) => {
        const k = esc(key);
        return `shape[${k}]._zod.run({ value: input[${k}], issues: [] }, ctx)`;
      };
      doc.write(`const input = payload.value;`);
      const ids = Object.create(null);
      let counter = 0;
      for (const key of normalized.keys) {
        ids[key] = `key_${counter++}`;
      }
      doc.write(`const newResult = {};`);
      for (const key of normalized.keys) {
        const id = ids[key];
        const k = esc(key);
        const schema = shape[key];
        const isOptionalIn = schema?._zod?.optin === "optional";
        const isOptionalOut = schema?._zod?.optout === "optional";
        doc.write(`const ${id} = ${parseStr(key)};`);
        if (isOptionalIn && isOptionalOut) {
          doc.write(`
        if (${id}.issues.length) {
          if (${k} in input) {
            payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
              ...iss,
              path: iss.path ? [${k}, ...iss.path] : [${k}]
            })));
          }
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
        } else if (!isOptionalIn) {
          doc.write(`
        const ${id}_present = ${k} in input;
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        if (!${id}_present && !${id}.issues.length) {
          payload.issues.push({
            code: "invalid_type",
            expected: "nonoptional",
            input: undefined,
            path: [${k}]
          });
        }

        if (${id}_present) {
          if (${id}.value === undefined) {
            newResult[${k}] = undefined;
          } else {
            newResult[${k}] = ${id}.value;
          }
        }

      `);
        } else {
          doc.write(`
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
        }
      }
      doc.write(`payload.value = newResult;`);
      doc.write(`return payload;`);
      const fn = doc.compile();
      return (payload, ctx) => fn(shape, payload, ctx);
    };
    let fastpass;
    const isObject2 = isObject;
    const jit = !globalConfig.jitless;
    const allowsEval2 = allowsEval;
    const fastEnabled = jit && allowsEval2.value;
    const catchall = def.catchall;
    let value;
    inst._zod.parse = (payload, ctx) => {
      value ?? (value = _normalized.value);
      const input = payload.value;
      if (!isObject2(input)) {
        payload.issues.push({
          expected: "object",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      }
      if (jit && fastEnabled && ctx?.async === false && ctx.jitless !== true) {
        if (!fastpass)
          fastpass = generateFastpass(def.shape);
        payload = fastpass(payload, ctx);
        if (!catchall)
          return payload;
        return handleCatchall([], input, payload, ctx, value, inst);
      }
      return superParse(payload, ctx);
    };
  });
  $ZodUnion = /* @__PURE__ */ $constructor("$ZodUnion", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "optin", () => def.options.some((o) => o._zod.optin === "optional") ? "optional" : undefined);
    defineLazy(inst._zod, "optout", () => def.options.some((o) => o._zod.optout === "optional") ? "optional" : undefined);
    defineLazy(inst._zod, "values", () => {
      if (def.options.every((o) => o._zod.values)) {
        return new Set(def.options.flatMap((option) => Array.from(option._zod.values)));
      }
      return;
    });
    defineLazy(inst._zod, "pattern", () => {
      if (def.options.every((o) => o._zod.pattern)) {
        const patterns = def.options.map((o) => o._zod.pattern);
        return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
      }
      return;
    });
    const first = def.options.length === 1 ? def.options[0]._zod.run : null;
    inst._zod.parse = (payload, ctx) => {
      if (first) {
        return first(payload, ctx);
      }
      let async = false;
      const results = [];
      for (const option of def.options) {
        const result = option._zod.run({
          value: payload.value,
          issues: []
        }, ctx);
        if (result instanceof Promise) {
          results.push(result);
          async = true;
        } else {
          if (result.issues.length === 0)
            return result;
          results.push(result);
        }
      }
      if (!async)
        return handleUnionResults(results, payload, inst, ctx);
      return Promise.all(results).then((results2) => {
        return handleUnionResults(results2, payload, inst, ctx);
      });
    };
  });
  $ZodXor = /* @__PURE__ */ $constructor("$ZodXor", (inst, def) => {
    $ZodUnion.init(inst, def);
    def.inclusive = false;
    const first = def.options.length === 1 ? def.options[0]._zod.run : null;
    inst._zod.parse = (payload, ctx) => {
      if (first) {
        return first(payload, ctx);
      }
      let async = false;
      const results = [];
      for (const option of def.options) {
        const result = option._zod.run({
          value: payload.value,
          issues: []
        }, ctx);
        if (result instanceof Promise) {
          results.push(result);
          async = true;
        } else {
          results.push(result);
        }
      }
      if (!async)
        return handleExclusiveUnionResults(results, payload, inst, ctx);
      return Promise.all(results).then((results2) => {
        return handleExclusiveUnionResults(results2, payload, inst, ctx);
      });
    };
  });
  $ZodDiscriminatedUnion = /* @__PURE__ */ $constructor("$ZodDiscriminatedUnion", (inst, def) => {
    def.inclusive = false;
    $ZodUnion.init(inst, def);
    const _super = inst._zod.parse;
    defineLazy(inst._zod, "propValues", () => {
      const propValues = {};
      for (const option of def.options) {
        const pv = option._zod.propValues;
        if (!pv || Object.keys(pv).length === 0)
          throw new Error(`Invalid discriminated union option at index "${def.options.indexOf(option)}"`);
        for (const [k, v] of Object.entries(pv)) {
          if (!propValues[k])
            propValues[k] = new Set;
          for (const val of v) {
            propValues[k].add(val);
          }
        }
      }
      return propValues;
    });
    const disc = cached(() => {
      const opts = def.options;
      const map = new Map;
      for (const o of opts) {
        const values = o._zod.propValues?.[def.discriminator];
        if (!values || values.size === 0)
          throw new Error(`Invalid discriminated union option at index "${def.options.indexOf(o)}"`);
        for (const v of values) {
          if (map.has(v)) {
            throw new Error(`Duplicate discriminator value "${String(v)}"`);
          }
          map.set(v, o);
        }
      }
      return map;
    });
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      if (!isObject(input)) {
        payload.issues.push({
          code: "invalid_type",
          expected: "object",
          input,
          inst
        });
        return payload;
      }
      const opt = disc.value.get(input?.[def.discriminator]);
      if (opt) {
        return opt._zod.run(payload, ctx);
      }
      if (def.unionFallback || ctx.direction === "backward") {
        return _super(payload, ctx);
      }
      payload.issues.push({
        code: "invalid_union",
        errors: [],
        note: "No matching discriminator",
        discriminator: def.discriminator,
        options: Array.from(disc.value.keys()),
        input,
        path: [def.discriminator],
        inst
      });
      return payload;
    };
  });
  $ZodIntersection = /* @__PURE__ */ $constructor("$ZodIntersection", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      const left = def.left._zod.run({ value: input, issues: [] }, ctx);
      const right = def.right._zod.run({ value: input, issues: [] }, ctx);
      const async = left instanceof Promise || right instanceof Promise;
      if (async) {
        return Promise.all([left, right]).then(([left2, right2]) => {
          return handleIntersectionResults(payload, left2, right2);
        });
      }
      return handleIntersectionResults(payload, left, right);
    };
  });
  $ZodTuple = /* @__PURE__ */ $constructor("$ZodTuple", (inst, def) => {
    $ZodType.init(inst, def);
    const items = def.items;
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      if (!Array.isArray(input)) {
        payload.issues.push({
          input,
          inst,
          expected: "tuple",
          code: "invalid_type"
        });
        return payload;
      }
      payload.value = [];
      const proms = [];
      const optinStart = getTupleOptStart(items, "optin");
      const optoutStart = getTupleOptStart(items, "optout");
      if (!def.rest) {
        if (input.length < optinStart) {
          payload.issues.push({
            code: "too_small",
            minimum: optinStart,
            inclusive: true,
            input,
            inst,
            origin: "array"
          });
          return payload;
        }
        if (input.length > items.length) {
          payload.issues.push({
            code: "too_big",
            maximum: items.length,
            inclusive: true,
            input,
            inst,
            origin: "array"
          });
        }
      }
      const itemResults = new Array(items.length);
      for (let i = 0;i < items.length; i++) {
        const r = items[i]._zod.run({ value: input[i], issues: [] }, ctx);
        if (r instanceof Promise) {
          proms.push(r.then((rr) => {
            itemResults[i] = rr;
          }));
        } else {
          itemResults[i] = r;
        }
      }
      if (def.rest) {
        let i = items.length - 1;
        const rest = input.slice(items.length);
        for (const el of rest) {
          i++;
          const result = def.rest._zod.run({ value: el, issues: [] }, ctx);
          if (result instanceof Promise) {
            proms.push(result.then((r) => handleTupleResult(r, payload, i)));
          } else {
            handleTupleResult(result, payload, i);
          }
        }
      }
      if (proms.length) {
        return Promise.all(proms).then(() => handleTupleResults(itemResults, payload, items, input, optoutStart));
      }
      return handleTupleResults(itemResults, payload, items, input, optoutStart);
    };
  });
  $ZodRecord = /* @__PURE__ */ $constructor("$ZodRecord", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      if (!isPlainObject(input)) {
        payload.issues.push({
          expected: "record",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      }
      const proms = [];
      const values = def.keyType._zod.values;
      if (values) {
        payload.value = {};
        const recordKeys = new Set;
        for (const key of values) {
          if (typeof key === "string" || typeof key === "number" || typeof key === "symbol") {
            recordKeys.add(typeof key === "number" ? key.toString() : key);
            const keyResult = def.keyType._zod.run({ value: key, issues: [] }, ctx);
            if (keyResult instanceof Promise) {
              throw new Error("Async schemas not supported in object keys currently");
            }
            if (keyResult.issues.length) {
              payload.issues.push({
                code: "invalid_key",
                origin: "record",
                issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
                input: key,
                path: [key],
                inst
              });
              continue;
            }
            const outKey = keyResult.value;
            const result = def.valueType._zod.run({ value: input[key], issues: [] }, ctx);
            if (result instanceof Promise) {
              proms.push(result.then((result2) => {
                if (result2.issues.length) {
                  payload.issues.push(...prefixIssues(key, result2.issues));
                }
                payload.value[outKey] = result2.value;
              }));
            } else {
              if (result.issues.length) {
                payload.issues.push(...prefixIssues(key, result.issues));
              }
              payload.value[outKey] = result.value;
            }
          }
        }
        let unrecognized;
        for (const key in input) {
          if (!recordKeys.has(key)) {
            unrecognized = unrecognized ?? [];
            unrecognized.push(key);
          }
        }
        if (unrecognized && unrecognized.length > 0) {
          payload.issues.push({
            code: "unrecognized_keys",
            input,
            inst,
            keys: unrecognized
          });
        }
      } else {
        payload.value = {};
        for (const key of Reflect.ownKeys(input)) {
          if (key === "__proto__")
            continue;
          if (!Object.prototype.propertyIsEnumerable.call(input, key))
            continue;
          let keyResult = def.keyType._zod.run({ value: key, issues: [] }, ctx);
          if (keyResult instanceof Promise) {
            throw new Error("Async schemas not supported in object keys currently");
          }
          const checkNumericKey = typeof key === "string" && number.test(key) && keyResult.issues.length;
          if (checkNumericKey) {
            const retryResult = def.keyType._zod.run({ value: Number(key), issues: [] }, ctx);
            if (retryResult instanceof Promise) {
              throw new Error("Async schemas not supported in object keys currently");
            }
            if (retryResult.issues.length === 0) {
              keyResult = retryResult;
            }
          }
          if (keyResult.issues.length) {
            if (def.mode === "loose") {
              payload.value[key] = input[key];
            } else {
              payload.issues.push({
                code: "invalid_key",
                origin: "record",
                issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
                input: key,
                path: [key],
                inst
              });
            }
            continue;
          }
          const result = def.valueType._zod.run({ value: input[key], issues: [] }, ctx);
          if (result instanceof Promise) {
            proms.push(result.then((result2) => {
              if (result2.issues.length) {
                payload.issues.push(...prefixIssues(key, result2.issues));
              }
              payload.value[keyResult.value] = result2.value;
            }));
          } else {
            if (result.issues.length) {
              payload.issues.push(...prefixIssues(key, result.issues));
            }
            payload.value[keyResult.value] = result.value;
          }
        }
      }
      if (proms.length) {
        return Promise.all(proms).then(() => payload);
      }
      return payload;
    };
  });
  $ZodMap = /* @__PURE__ */ $constructor("$ZodMap", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      if (!(input instanceof Map)) {
        payload.issues.push({
          expected: "map",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      }
      const proms = [];
      payload.value = new Map;
      for (const [key, value] of input) {
        const keyResult = def.keyType._zod.run({ value: key, issues: [] }, ctx);
        const valueResult = def.valueType._zod.run({ value, issues: [] }, ctx);
        if (keyResult instanceof Promise || valueResult instanceof Promise) {
          proms.push(Promise.all([keyResult, valueResult]).then(([keyResult2, valueResult2]) => {
            handleMapResult(keyResult2, valueResult2, payload, key, input, inst, ctx);
          }));
        } else {
          handleMapResult(keyResult, valueResult, payload, key, input, inst, ctx);
        }
      }
      if (proms.length)
        return Promise.all(proms).then(() => payload);
      return payload;
    };
  });
  $ZodSet = /* @__PURE__ */ $constructor("$ZodSet", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      if (!(input instanceof Set)) {
        payload.issues.push({
          input,
          inst,
          expected: "set",
          code: "invalid_type"
        });
        return payload;
      }
      const proms = [];
      payload.value = new Set;
      for (const item of input) {
        const result = def.valueType._zod.run({ value: item, issues: [] }, ctx);
        if (result instanceof Promise) {
          proms.push(result.then((result2) => handleSetResult(result2, payload)));
        } else
          handleSetResult(result, payload);
      }
      if (proms.length)
        return Promise.all(proms).then(() => payload);
      return payload;
    };
  });
  $ZodEnum = /* @__PURE__ */ $constructor("$ZodEnum", (inst, def) => {
    $ZodType.init(inst, def);
    const values = getEnumValues(def.entries);
    const valuesSet = new Set(values);
    inst._zod.values = valuesSet;
    inst._zod.pattern = new RegExp(`^(${values.filter((k) => propertyKeyTypes.has(typeof k)).map((o) => typeof o === "string" ? escapeRegex(o) : o.toString()).join("|")})$`);
    inst._zod.parse = (payload, _ctx) => {
      const input = payload.value;
      if (valuesSet.has(input)) {
        return payload;
      }
      payload.issues.push({
        code: "invalid_value",
        values,
        input,
        inst
      });
      return payload;
    };
  });
  $ZodLiteral = /* @__PURE__ */ $constructor("$ZodLiteral", (inst, def) => {
    $ZodType.init(inst, def);
    if (def.values.length === 0) {
      throw new Error("Cannot create literal schema with no valid values");
    }
    const values = new Set(def.values);
    inst._zod.values = values;
    inst._zod.pattern = new RegExp(`^(${def.values.map((o) => typeof o === "string" ? escapeRegex(o) : o ? escapeRegex(o.toString()) : String(o)).join("|")})$`);
    inst._zod.parse = (payload, _ctx) => {
      const input = payload.value;
      if (values.has(input)) {
        return payload;
      }
      payload.issues.push({
        code: "invalid_value",
        values: def.values,
        input,
        inst
      });
      return payload;
    };
  });
  $ZodFile = /* @__PURE__ */ $constructor("$ZodFile", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
      const input = payload.value;
      if (input instanceof File)
        return payload;
      payload.issues.push({
        expected: "file",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    };
  });
  $ZodTransform = /* @__PURE__ */ $constructor("$ZodTransform", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.optin = "optional";
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        throw new $ZodEncodeError(inst.constructor.name);
      }
      const _out = def.transform(payload.value, payload);
      if (ctx.async) {
        const output = _out instanceof Promise ? _out : Promise.resolve(_out);
        return output.then((output2) => {
          payload.value = output2;
          payload.fallback = true;
          return payload;
        });
      }
      if (_out instanceof Promise) {
        throw new $ZodAsyncError;
      }
      payload.value = _out;
      payload.fallback = true;
      return payload;
    };
  });
  $ZodOptional = /* @__PURE__ */ $constructor("$ZodOptional", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.optin = "optional";
    inst._zod.optout = "optional";
    defineLazy(inst._zod, "values", () => {
      return def.innerType._zod.values ? new Set([...def.innerType._zod.values, undefined]) : undefined;
    });
    defineLazy(inst._zod, "pattern", () => {
      const pattern = def.innerType._zod.pattern;
      return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : undefined;
    });
    inst._zod.parse = (payload, ctx) => {
      if (def.innerType._zod.optin === "optional") {
        const input = payload.value;
        const result = def.innerType._zod.run(payload, ctx);
        if (result instanceof Promise)
          return result.then((r) => handleOptionalResult(r, input));
        return handleOptionalResult(result, input);
      }
      if (payload.value === undefined) {
        return payload;
      }
      return def.innerType._zod.run(payload, ctx);
    };
  });
  $ZodExactOptional = /* @__PURE__ */ $constructor("$ZodExactOptional", (inst, def) => {
    $ZodOptional.init(inst, def);
    defineLazy(inst._zod, "values", () => def.innerType._zod.values);
    defineLazy(inst._zod, "pattern", () => def.innerType._zod.pattern);
    inst._zod.parse = (payload, ctx) => {
      return def.innerType._zod.run(payload, ctx);
    };
  });
  $ZodNullable = /* @__PURE__ */ $constructor("$ZodNullable", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
    defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
    defineLazy(inst._zod, "pattern", () => {
      const pattern = def.innerType._zod.pattern;
      return pattern ? new RegExp(`^(${cleanRegex(pattern.source)}|null)$`) : undefined;
    });
    defineLazy(inst._zod, "values", () => {
      return def.innerType._zod.values ? new Set([...def.innerType._zod.values, null]) : undefined;
    });
    inst._zod.parse = (payload, ctx) => {
      if (payload.value === null)
        return payload;
      return def.innerType._zod.run(payload, ctx);
    };
  });
  $ZodDefault = /* @__PURE__ */ $constructor("$ZodDefault", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.optin = "optional";
    defineLazy(inst._zod, "values", () => def.innerType._zod.values);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        return def.innerType._zod.run(payload, ctx);
      }
      if (payload.value === undefined) {
        payload.value = def.defaultValue;
        return payload;
      }
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise) {
        return result.then((result2) => handleDefaultResult(result2, def));
      }
      return handleDefaultResult(result, def);
    };
  });
  $ZodPrefault = /* @__PURE__ */ $constructor("$ZodPrefault", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.optin = "optional";
    defineLazy(inst._zod, "values", () => def.innerType._zod.values);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        return def.innerType._zod.run(payload, ctx);
      }
      if (payload.value === undefined) {
        payload.value = def.defaultValue;
      }
      return def.innerType._zod.run(payload, ctx);
    };
  });
  $ZodNonOptional = /* @__PURE__ */ $constructor("$ZodNonOptional", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "values", () => {
      const v = def.innerType._zod.values;
      return v ? new Set([...v].filter((x) => x !== undefined)) : undefined;
    });
    inst._zod.parse = (payload, ctx) => {
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise) {
        return result.then((result2) => handleNonOptionalResult(result2, inst));
      }
      return handleNonOptionalResult(result, inst);
    };
  });
  $ZodSuccess = /* @__PURE__ */ $constructor("$ZodSuccess", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        throw new $ZodEncodeError("ZodSuccess");
      }
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise) {
        return result.then((result2) => {
          payload.value = result2.issues.length === 0;
          return payload;
        });
      }
      payload.value = result.issues.length === 0;
      return payload;
    };
  });
  $ZodCatch = /* @__PURE__ */ $constructor("$ZodCatch", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.optin = "optional";
    defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
    defineLazy(inst._zod, "values", () => def.innerType._zod.values);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        return def.innerType._zod.run(payload, ctx);
      }
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise) {
        return result.then((result2) => {
          payload.value = result2.value;
          if (result2.issues.length) {
            payload.value = def.catchValue({
              ...payload,
              error: {
                issues: result2.issues.map((iss) => finalizeIssue(iss, ctx, config()))
              },
              input: payload.value
            });
            payload.issues = [];
            payload.fallback = true;
          }
          return payload;
        });
      }
      payload.value = result.value;
      if (result.issues.length) {
        payload.value = def.catchValue({
          ...payload,
          error: {
            issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config()))
          },
          input: payload.value
        });
        payload.issues = [];
        payload.fallback = true;
      }
      return payload;
    };
  });
  $ZodNaN = /* @__PURE__ */ $constructor("$ZodNaN", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
      if (typeof payload.value !== "number" || !Number.isNaN(payload.value)) {
        payload.issues.push({
          input: payload.value,
          inst,
          expected: "nan",
          code: "invalid_type"
        });
        return payload;
      }
      return payload;
    };
  });
  $ZodPipe = /* @__PURE__ */ $constructor("$ZodPipe", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "values", () => def.in._zod.values);
    defineLazy(inst._zod, "optin", () => def.in._zod.optin);
    defineLazy(inst._zod, "optout", () => def.out._zod.optout);
    defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        const right = def.out._zod.run(payload, ctx);
        if (right instanceof Promise) {
          return right.then((right2) => handlePipeResult(right2, def.in, ctx));
        }
        return handlePipeResult(right, def.in, ctx);
      }
      const left = def.in._zod.run(payload, ctx);
      if (left instanceof Promise) {
        return left.then((left2) => handlePipeResult(left2, def.out, ctx));
      }
      return handlePipeResult(left, def.out, ctx);
    };
  });
  $ZodCodec = /* @__PURE__ */ $constructor("$ZodCodec", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "values", () => def.in._zod.values);
    defineLazy(inst._zod, "optin", () => def.in._zod.optin);
    defineLazy(inst._zod, "optout", () => def.out._zod.optout);
    defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
    inst._zod.parse = (payload, ctx) => {
      const direction = ctx.direction || "forward";
      if (direction === "forward") {
        const left = def.in._zod.run(payload, ctx);
        if (left instanceof Promise) {
          return left.then((left2) => handleCodecAResult(left2, def, ctx));
        }
        return handleCodecAResult(left, def, ctx);
      } else {
        const right = def.out._zod.run(payload, ctx);
        if (right instanceof Promise) {
          return right.then((right2) => handleCodecAResult(right2, def, ctx));
        }
        return handleCodecAResult(right, def, ctx);
      }
    };
  });
  $ZodPreprocess = /* @__PURE__ */ $constructor("$ZodPreprocess", (inst, def) => {
    $ZodPipe.init(inst, def);
  });
  $ZodReadonly = /* @__PURE__ */ $constructor("$ZodReadonly", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "propValues", () => def.innerType._zod.propValues);
    defineLazy(inst._zod, "values", () => def.innerType._zod.values);
    defineLazy(inst._zod, "optin", () => def.innerType?._zod?.optin);
    defineLazy(inst._zod, "optout", () => def.innerType?._zod?.optout);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        return def.innerType._zod.run(payload, ctx);
      }
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise) {
        return result.then(handleReadonlyResult);
      }
      return handleReadonlyResult(result);
    };
  });
  $ZodTemplateLiteral = /* @__PURE__ */ $constructor("$ZodTemplateLiteral", (inst, def) => {
    $ZodType.init(inst, def);
    const regexParts = [];
    for (const part of def.parts) {
      if (typeof part === "object" && part !== null) {
        if (!part._zod.pattern) {
          throw new Error(`Invalid template literal part, no pattern found: ${[...part._zod.traits].shift()}`);
        }
        const source = part._zod.pattern instanceof RegExp ? part._zod.pattern.source : part._zod.pattern;
        if (!source)
          throw new Error(`Invalid template literal part: ${part._zod.traits}`);
        const start = source.startsWith("^") ? 1 : 0;
        const end = source.endsWith("$") ? source.length - 1 : source.length;
        regexParts.push(source.slice(start, end));
      } else if (part === null || primitiveTypes.has(typeof part)) {
        regexParts.push(escapeRegex(`${part}`));
      } else {
        throw new Error(`Invalid template literal part: ${part}`);
      }
    }
    inst._zod.pattern = new RegExp(`^${regexParts.join("")}$`);
    inst._zod.parse = (payload, _ctx) => {
      if (typeof payload.value !== "string") {
        payload.issues.push({
          input: payload.value,
          inst,
          expected: "string",
          code: "invalid_type"
        });
        return payload;
      }
      inst._zod.pattern.lastIndex = 0;
      if (!inst._zod.pattern.test(payload.value)) {
        payload.issues.push({
          input: payload.value,
          inst,
          code: "invalid_format",
          format: def.format ?? "template_literal",
          pattern: inst._zod.pattern.source
        });
        return payload;
      }
      return payload;
    };
  });
  $ZodFunction = /* @__PURE__ */ $constructor("$ZodFunction", (inst, def) => {
    $ZodType.init(inst, def);
    inst._def = def;
    inst._zod.def = def;
    inst.implement = (func) => {
      if (typeof func !== "function") {
        throw new Error("implement() must be called with a function");
      }
      return function(...args) {
        const parsedArgs = inst._def.input ? parse(inst._def.input, args) : args;
        const result = Reflect.apply(func, this, parsedArgs);
        if (inst._def.output) {
          return parse(inst._def.output, result);
        }
        return result;
      };
    };
    inst.implementAsync = (func) => {
      if (typeof func !== "function") {
        throw new Error("implementAsync() must be called with a function");
      }
      return async function(...args) {
        const parsedArgs = inst._def.input ? await parseAsync(inst._def.input, args) : args;
        const result = await Reflect.apply(func, this, parsedArgs);
        if (inst._def.output) {
          return await parseAsync(inst._def.output, result);
        }
        return result;
      };
    };
    inst._zod.parse = (payload, _ctx) => {
      if (typeof payload.value !== "function") {
        payload.issues.push({
          code: "invalid_type",
          expected: "function",
          input: payload.value,
          inst
        });
        return payload;
      }
      const hasPromiseOutput = inst._def.output && inst._def.output._zod.def.type === "promise";
      if (hasPromiseOutput) {
        payload.value = inst.implementAsync(payload.value);
      } else {
        payload.value = inst.implement(payload.value);
      }
      return payload;
    };
    inst.input = (...args) => {
      const F = inst.constructor;
      if (Array.isArray(args[0])) {
        return new F({
          type: "function",
          input: new $ZodTuple({
            type: "tuple",
            items: args[0],
            rest: args[1]
          }),
          output: inst._def.output
        });
      }
      return new F({
        type: "function",
        input: args[0],
        output: inst._def.output
      });
    };
    inst.output = (output) => {
      const F = inst.constructor;
      return new F({
        type: "function",
        input: inst._def.input,
        output
      });
    };
    return inst;
  });
  $ZodPromise = /* @__PURE__ */ $constructor("$ZodPromise", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      return Promise.resolve(payload.value).then((inner) => def.innerType._zod.run({ value: inner, issues: [] }, ctx));
    };
  });
  $ZodLazy = /* @__PURE__ */ $constructor("$ZodLazy", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "innerType", () => {
      const d = def;
      if (!d._cachedInner)
        d._cachedInner = def.getter();
      return d._cachedInner;
    });
    defineLazy(inst._zod, "pattern", () => inst._zod.innerType?._zod?.pattern);
    defineLazy(inst._zod, "propValues", () => inst._zod.innerType?._zod?.propValues);
    defineLazy(inst._zod, "optin", () => inst._zod.innerType?._zod?.optin ?? undefined);
    defineLazy(inst._zod, "optout", () => inst._zod.innerType?._zod?.optout ?? undefined);
    inst._zod.parse = (payload, ctx) => {
      const inner = inst._zod.innerType;
      return inner._zod.run(payload, ctx);
    };
  });
  $ZodCustom = /* @__PURE__ */ $constructor("$ZodCustom", (inst, def) => {
    $ZodCheck.init(inst, def);
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _) => {
      return payload;
    };
    inst._zod.check = (payload) => {
      const input = payload.value;
      const r = def.fn(input);
      if (r instanceof Promise) {
        return r.then((r2) => handleRefineResult(r2, payload, input, inst));
      }
      handleRefineResult(r, payload, input, inst);
      return;
    };
  });
});

// node_modules/zod/v4/locales/ar.js
function ar_default() {
  return {
    localeError: error()
  };
}
var error = () => {
  const Sizable = {
    string: { unit: "حرف", verb: "أن يحوي" },
    file: { unit: "بايت", verb: "أن يحوي" },
    array: { unit: "عنصر", verb: "أن يحوي" },
    set: { unit: "عنصر", verb: "أن يحوي" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "مدخل",
    email: "بريد إلكتروني",
    url: "رابط",
    emoji: "إيموجي",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "تاريخ ووقت بمعيار ISO",
    date: "تاريخ بمعيار ISO",
    time: "وقت بمعيار ISO",
    duration: "مدة بمعيار ISO",
    ipv4: "عنوان IPv4",
    ipv6: "عنوان IPv6",
    cidrv4: "مدى عناوين بصيغة IPv4",
    cidrv6: "مدى عناوين بصيغة IPv6",
    base64: "نَص بترميز base64-encoded",
    base64url: "نَص بترميز base64url-encoded",
    json_string: "نَص على هيئة JSON",
    e164: "رقم هاتف بمعيار E.164",
    jwt: "JWT",
    template_literal: "مدخل"
  };
  const TypeDictionary = {
    nan: "NaN"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `مدخلات غير مقبولة: يفترض إدخال instanceof ${issue2.expected}، ولكن تم إدخال ${received}`;
        }
        return `مدخلات غير مقبولة: يفترض إدخال ${expected}، ولكن تم إدخال ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `مدخلات غير مقبولة: يفترض إدخال ${stringifyPrimitive(issue2.values[0])}`;
        return `اختيار غير مقبول: يتوقع انتقاء أحد هذه الخيارات: ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return ` أكبر من اللازم: يفترض أن تكون ${issue2.origin ?? "القيمة"} ${adj} ${issue2.maximum.toString()} ${sizing.unit ?? "عنصر"}`;
        return `أكبر من اللازم: يفترض أن تكون ${issue2.origin ?? "القيمة"} ${adj} ${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `أصغر من اللازم: يفترض لـ ${issue2.origin} أن يكون ${adj} ${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `أصغر من اللازم: يفترض لـ ${issue2.origin} أن يكون ${adj} ${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `نَص غير مقبول: يجب أن يبدأ بـ "${issue2.prefix}"`;
        if (_issue.format === "ends_with")
          return `نَص غير مقبول: يجب أن ينتهي بـ "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `نَص غير مقبول: يجب أن يتضمَّن "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `نَص غير مقبول: يجب أن يطابق النمط ${_issue.pattern}`;
        return `${FormatDictionary[_issue.format] ?? issue2.format} غير مقبول`;
      }
      case "not_multiple_of":
        return `رقم غير مقبول: يجب أن يكون من مضاعفات ${issue2.divisor}`;
      case "unrecognized_keys":
        return `معرف${issue2.keys.length > 1 ? "ات" : ""} غريب${issue2.keys.length > 1 ? "ة" : ""}: ${joinValues(issue2.keys, "، ")}`;
      case "invalid_key":
        return `معرف غير مقبول في ${issue2.origin}`;
      case "invalid_union":
        return "مدخل غير مقبول";
      case "invalid_element":
        return `مدخل غير مقبول في ${issue2.origin}`;
      default:
        return "مدخل غير مقبول";
    }
  };
};
var init_ar = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/az.js
function az_default() {
  return {
    localeError: error2()
  };
}
var error2 = () => {
  const Sizable = {
    string: { unit: "simvol", verb: "olmalıdır" },
    file: { unit: "bayt", verb: "olmalıdır" },
    array: { unit: "element", verb: "olmalıdır" },
    set: { unit: "element", verb: "olmalıdır" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "input",
    email: "email address",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO datetime",
    date: "ISO date",
    time: "ISO time",
    duration: "ISO duration",
    ipv4: "IPv4 address",
    ipv6: "IPv6 address",
    cidrv4: "IPv4 range",
    cidrv6: "IPv6 range",
    base64: "base64-encoded string",
    base64url: "base64url-encoded string",
    json_string: "JSON string",
    e164: "E.164 number",
    jwt: "JWT",
    template_literal: "input"
  };
  const TypeDictionary = {
    nan: "NaN"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Yanlış dəyər: gözlənilən instanceof ${issue2.expected}, daxil olan ${received}`;
        }
        return `Yanlış dəyər: gözlənilən ${expected}, daxil olan ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Yanlış dəyər: gözlənilən ${stringifyPrimitive(issue2.values[0])}`;
        return `Yanlış seçim: aşağıdakılardan biri olmalıdır: ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Çox böyük: gözlənilən ${issue2.origin ?? "dəyər"} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "element"}`;
        return `Çox böyük: gözlənilən ${issue2.origin ?? "dəyər"} ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Çox kiçik: gözlənilən ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        return `Çox kiçik: gözlənilən ${issue2.origin} ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Yanlış mətn: "${_issue.prefix}" ilə başlamalıdır`;
        if (_issue.format === "ends_with")
          return `Yanlış mətn: "${_issue.suffix}" ilə bitməlidir`;
        if (_issue.format === "includes")
          return `Yanlış mətn: "${_issue.includes}" daxil olmalıdır`;
        if (_issue.format === "regex")
          return `Yanlış mətn: ${_issue.pattern} şablonuna uyğun olmalıdır`;
        return `Yanlış ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Yanlış ədəd: ${issue2.divisor} ilə bölünə bilən olmalıdır`;
      case "unrecognized_keys":
        return `Tanınmayan açar${issue2.keys.length > 1 ? "lar" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `${issue2.origin} daxilində yanlış açar`;
      case "invalid_union":
        return "Yanlış dəyər";
      case "invalid_element":
        return `${issue2.origin} daxilində yanlış dəyər`;
      default:
        return `Yanlış dəyər`;
    }
  };
};
var init_az = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/be.js
function getBelarusianPlural(count, one, few, many) {
  const absCount = Math.abs(count);
  const lastDigit = absCount % 10;
  const lastTwoDigits = absCount % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return many;
  }
  if (lastDigit === 1) {
    return one;
  }
  if (lastDigit >= 2 && lastDigit <= 4) {
    return few;
  }
  return many;
}
function be_default() {
  return {
    localeError: error3()
  };
}
var error3 = () => {
  const Sizable = {
    string: {
      unit: {
        one: "сімвал",
        few: "сімвалы",
        many: "сімвалаў"
      },
      verb: "мець"
    },
    array: {
      unit: {
        one: "элемент",
        few: "элементы",
        many: "элементаў"
      },
      verb: "мець"
    },
    set: {
      unit: {
        one: "элемент",
        few: "элементы",
        many: "элементаў"
      },
      verb: "мець"
    },
    file: {
      unit: {
        one: "байт",
        few: "байты",
        many: "байтаў"
      },
      verb: "мець"
    }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "увод",
    email: "email адрас",
    url: "URL",
    emoji: "эмодзі",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO дата і час",
    date: "ISO дата",
    time: "ISO час",
    duration: "ISO працягласць",
    ipv4: "IPv4 адрас",
    ipv6: "IPv6 адрас",
    cidrv4: "IPv4 дыяпазон",
    cidrv6: "IPv6 дыяпазон",
    base64: "радок у фармаце base64",
    base64url: "радок у фармаце base64url",
    json_string: "JSON радок",
    e164: "нумар E.164",
    jwt: "JWT",
    template_literal: "увод"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "лік",
    array: "масіў"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Няправільны ўвод: чакаўся instanceof ${issue2.expected}, атрымана ${received}`;
        }
        return `Няправільны ўвод: чакаўся ${expected}, атрымана ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Няправільны ўвод: чакалася ${stringifyPrimitive(issue2.values[0])}`;
        return `Няправільны варыянт: чакаўся адзін з ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          const maxValue = Number(issue2.maximum);
          const unit = getBelarusianPlural(maxValue, sizing.unit.one, sizing.unit.few, sizing.unit.many);
          return `Занадта вялікі: чакалася, што ${issue2.origin ?? "значэнне"} павінна ${sizing.verb} ${adj}${issue2.maximum.toString()} ${unit}`;
        }
        return `Занадта вялікі: чакалася, што ${issue2.origin ?? "значэнне"} павінна быць ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          const minValue = Number(issue2.minimum);
          const unit = getBelarusianPlural(minValue, sizing.unit.one, sizing.unit.few, sizing.unit.many);
          return `Занадта малы: чакалася, што ${issue2.origin} павінна ${sizing.verb} ${adj}${issue2.minimum.toString()} ${unit}`;
        }
        return `Занадта малы: чакалася, што ${issue2.origin} павінна быць ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Няправільны радок: павінен пачынацца з "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Няправільны радок: павінен заканчвацца на "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Няправільны радок: павінен змяшчаць "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Няправільны радок: павінен адпавядаць шаблону ${_issue.pattern}`;
        return `Няправільны ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Няправільны лік: павінен быць кратным ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Нераспазнаны ${issue2.keys.length > 1 ? "ключы" : "ключ"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Няправільны ключ у ${issue2.origin}`;
      case "invalid_union":
        return "Няправільны ўвод";
      case "invalid_element":
        return `Няправільнае значэнне ў ${issue2.origin}`;
      default:
        return `Няправільны ўвод`;
    }
  };
};
var init_be = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/bg.js
function bg_default() {
  return {
    localeError: error4()
  };
}
var error4 = () => {
  const Sizable = {
    string: { unit: "символа", verb: "да съдържа" },
    file: { unit: "байта", verb: "да съдържа" },
    array: { unit: "елемента", verb: "да съдържа" },
    set: { unit: "елемента", verb: "да съдържа" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "вход",
    email: "имейл адрес",
    url: "URL",
    emoji: "емоджи",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO време",
    date: "ISO дата",
    time: "ISO време",
    duration: "ISO продължителност",
    ipv4: "IPv4 адрес",
    ipv6: "IPv6 адрес",
    cidrv4: "IPv4 диапазон",
    cidrv6: "IPv6 диапазон",
    base64: "base64-кодиран низ",
    base64url: "base64url-кодиран низ",
    json_string: "JSON низ",
    e164: "E.164 номер",
    jwt: "JWT",
    template_literal: "вход"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "число",
    array: "масив"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Невалиден вход: очакван instanceof ${issue2.expected}, получен ${received}`;
        }
        return `Невалиден вход: очакван ${expected}, получен ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Невалиден вход: очакван ${stringifyPrimitive(issue2.values[0])}`;
        return `Невалидна опция: очаквано едно от ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Твърде голямо: очаква се ${issue2.origin ?? "стойност"} да съдържа ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "елемента"}`;
        return `Твърде голямо: очаква се ${issue2.origin ?? "стойност"} да бъде ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Твърде малко: очаква се ${issue2.origin} да съдържа ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Твърде малко: очаква се ${issue2.origin} да бъде ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Невалиден низ: трябва да започва с "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Невалиден низ: трябва да завършва с "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Невалиден низ: трябва да включва "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Невалиден низ: трябва да съвпада с ${_issue.pattern}`;
        let invalid_adj = "Невалиден";
        if (_issue.format === "emoji")
          invalid_adj = "Невалидно";
        if (_issue.format === "datetime")
          invalid_adj = "Невалидно";
        if (_issue.format === "date")
          invalid_adj = "Невалидна";
        if (_issue.format === "time")
          invalid_adj = "Невалидно";
        if (_issue.format === "duration")
          invalid_adj = "Невалидна";
        return `${invalid_adj} ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Невалидно число: трябва да бъде кратно на ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Неразпознат${issue2.keys.length > 1 ? "и" : ""} ключ${issue2.keys.length > 1 ? "ове" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Невалиден ключ в ${issue2.origin}`;
      case "invalid_union":
        return "Невалиден вход";
      case "invalid_element":
        return `Невалидна стойност в ${issue2.origin}`;
      default:
        return `Невалиден вход`;
    }
  };
};
var init_bg = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/ca.js
function ca_default() {
  return {
    localeError: error5()
  };
}
var error5 = () => {
  const Sizable = {
    string: { unit: "caràcters", verb: "contenir" },
    file: { unit: "bytes", verb: "contenir" },
    array: { unit: "elements", verb: "contenir" },
    set: { unit: "elements", verb: "contenir" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "entrada",
    email: "adreça electrònica",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "data i hora ISO",
    date: "data ISO",
    time: "hora ISO",
    duration: "durada ISO",
    ipv4: "adreça IPv4",
    ipv6: "adreça IPv6",
    cidrv4: "rang IPv4",
    cidrv6: "rang IPv6",
    base64: "cadena codificada en base64",
    base64url: "cadena codificada en base64url",
    json_string: "cadena JSON",
    e164: "número E.164",
    jwt: "JWT",
    template_literal: "entrada"
  };
  const TypeDictionary = {
    nan: "NaN"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Tipus invàlid: s'esperava instanceof ${issue2.expected}, s'ha rebut ${received}`;
        }
        return `Tipus invàlid: s'esperava ${expected}, s'ha rebut ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Valor invàlid: s'esperava ${stringifyPrimitive(issue2.values[0])}`;
        return `Opció invàlida: s'esperava una de ${joinValues(issue2.values, " o ")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "com a màxim" : "menys de";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Massa gran: s'esperava que ${issue2.origin ?? "el valor"} contingués ${adj} ${issue2.maximum.toString()} ${sizing.unit ?? "elements"}`;
        return `Massa gran: s'esperava que ${issue2.origin ?? "el valor"} fos ${adj} ${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? "com a mínim" : "més de";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Massa petit: s'esperava que ${issue2.origin} contingués ${adj} ${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Massa petit: s'esperava que ${issue2.origin} fos ${adj} ${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Format invàlid: ha de començar amb "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Format invàlid: ha d'acabar amb "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Format invàlid: ha d'incloure "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Format invàlid: ha de coincidir amb el patró ${_issue.pattern}`;
        return `Format invàlid per a ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Número invàlid: ha de ser múltiple de ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Clau${issue2.keys.length > 1 ? "s" : ""} no reconeguda${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Clau invàlida a ${issue2.origin}`;
      case "invalid_union":
        return "Entrada invàlida";
      case "invalid_element":
        return `Element invàlid a ${issue2.origin}`;
      default:
        return `Entrada invàlida`;
    }
  };
};
var init_ca = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/cs.js
function cs_default() {
  return {
    localeError: error6()
  };
}
var error6 = () => {
  const Sizable = {
    string: { unit: "znaků", verb: "mít" },
    file: { unit: "bajtů", verb: "mít" },
    array: { unit: "prvků", verb: "mít" },
    set: { unit: "prvků", verb: "mít" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "regulární výraz",
    email: "e-mailová adresa",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "datum a čas ve formátu ISO",
    date: "datum ve formátu ISO",
    time: "čas ve formátu ISO",
    duration: "doba trvání ISO",
    ipv4: "IPv4 adresa",
    ipv6: "IPv6 adresa",
    cidrv4: "rozsah IPv4",
    cidrv6: "rozsah IPv6",
    base64: "řetězec zakódovaný ve formátu base64",
    base64url: "řetězec zakódovaný ve formátu base64url",
    json_string: "řetězec ve formátu JSON",
    e164: "číslo E.164",
    jwt: "JWT",
    template_literal: "vstup"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "číslo",
    string: "řetězec",
    function: "funkce",
    array: "pole"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Neplatný vstup: očekáváno instanceof ${issue2.expected}, obdrženo ${received}`;
        }
        return `Neplatný vstup: očekáváno ${expected}, obdrženo ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Neplatný vstup: očekáváno ${stringifyPrimitive(issue2.values[0])}`;
        return `Neplatná možnost: očekávána jedna z hodnot ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Hodnota je příliš velká: ${issue2.origin ?? "hodnota"} musí mít ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "prvků"}`;
        }
        return `Hodnota je příliš velká: ${issue2.origin ?? "hodnota"} musí být ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Hodnota je příliš malá: ${issue2.origin ?? "hodnota"} musí mít ${adj}${issue2.minimum.toString()} ${sizing.unit ?? "prvků"}`;
        }
        return `Hodnota je příliš malá: ${issue2.origin ?? "hodnota"} musí být ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Neplatný řetězec: musí začínat na "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Neplatný řetězec: musí končit na "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Neplatný řetězec: musí obsahovat "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Neplatný řetězec: musí odpovídat vzoru ${_issue.pattern}`;
        return `Neplatný formát ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Neplatné číslo: musí být násobkem ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Neznámé klíče: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Neplatný klíč v ${issue2.origin}`;
      case "invalid_union":
        return "Neplatný vstup";
      case "invalid_element":
        return `Neplatná hodnota v ${issue2.origin}`;
      default:
        return `Neplatný vstup`;
    }
  };
};
var init_cs = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/da.js
function da_default() {
  return {
    localeError: error7()
  };
}
var error7 = () => {
  const Sizable = {
    string: { unit: "tegn", verb: "havde" },
    file: { unit: "bytes", verb: "havde" },
    array: { unit: "elementer", verb: "indeholdt" },
    set: { unit: "elementer", verb: "indeholdt" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "input",
    email: "e-mailadresse",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO dato- og klokkeslæt",
    date: "ISO-dato",
    time: "ISO-klokkeslæt",
    duration: "ISO-varighed",
    ipv4: "IPv4-område",
    ipv6: "IPv6-område",
    cidrv4: "IPv4-spektrum",
    cidrv6: "IPv6-spektrum",
    base64: "base64-kodet streng",
    base64url: "base64url-kodet streng",
    json_string: "JSON-streng",
    e164: "E.164-nummer",
    jwt: "JWT",
    template_literal: "input"
  };
  const TypeDictionary = {
    nan: "NaN",
    string: "streng",
    number: "tal",
    boolean: "boolean",
    array: "liste",
    object: "objekt",
    set: "sæt",
    file: "fil"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Ugyldigt input: forventede instanceof ${issue2.expected}, fik ${received}`;
        }
        return `Ugyldigt input: forventede ${expected}, fik ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Ugyldig værdi: forventede ${stringifyPrimitive(issue2.values[0])}`;
        return `Ugyldigt valg: forventede en af følgende ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        const origin = TypeDictionary[issue2.origin] ?? issue2.origin;
        if (sizing)
          return `For stor: forventede ${origin ?? "value"} ${sizing.verb} ${adj} ${issue2.maximum.toString()} ${sizing.unit ?? "elementer"}`;
        return `For stor: forventede ${origin ?? "value"} havde ${adj} ${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        const origin = TypeDictionary[issue2.origin] ?? issue2.origin;
        if (sizing) {
          return `For lille: forventede ${origin} ${sizing.verb} ${adj} ${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `For lille: forventede ${origin} havde ${adj} ${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Ugyldig streng: skal starte med "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Ugyldig streng: skal ende med "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Ugyldig streng: skal indeholde "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Ugyldig streng: skal matche mønsteret ${_issue.pattern}`;
        return `Ugyldig ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Ugyldigt tal: skal være deleligt med ${issue2.divisor}`;
      case "unrecognized_keys":
        return `${issue2.keys.length > 1 ? "Ukendte nøgler" : "Ukendt nøgle"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Ugyldig nøgle i ${issue2.origin}`;
      case "invalid_union":
        return "Ugyldigt input: matcher ingen af de tilladte typer";
      case "invalid_element":
        return `Ugyldig værdi i ${issue2.origin}`;
      default:
        return `Ugyldigt input`;
    }
  };
};
var init_da = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/de.js
function de_default() {
  return {
    localeError: error8()
  };
}
var error8 = () => {
  const Sizable = {
    string: { unit: "Zeichen", verb: "zu haben" },
    file: { unit: "Bytes", verb: "zu haben" },
    array: { unit: "Elemente", verb: "zu haben" },
    set: { unit: "Elemente", verb: "zu haben" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "Eingabe",
    email: "E-Mail-Adresse",
    url: "URL",
    emoji: "Emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO-Datum und -Uhrzeit",
    date: "ISO-Datum",
    time: "ISO-Uhrzeit",
    duration: "ISO-Dauer",
    ipv4: "IPv4-Adresse",
    ipv6: "IPv6-Adresse",
    cidrv4: "IPv4-Bereich",
    cidrv6: "IPv6-Bereich",
    base64: "Base64-codierter String",
    base64url: "Base64-URL-codierter String",
    json_string: "JSON-String",
    e164: "E.164-Nummer",
    jwt: "JWT",
    template_literal: "Eingabe"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "Zahl",
    array: "Array"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Ungültige Eingabe: erwartet instanceof ${issue2.expected}, erhalten ${received}`;
        }
        return `Ungültige Eingabe: erwartet ${expected}, erhalten ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Ungültige Eingabe: erwartet ${stringifyPrimitive(issue2.values[0])}`;
        return `Ungültige Option: erwartet eine von ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Zu groß: erwartet, dass ${issue2.origin ?? "Wert"} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "Elemente"} hat`;
        return `Zu groß: erwartet, dass ${issue2.origin ?? "Wert"} ${adj}${issue2.maximum.toString()} ist`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Zu klein: erwartet, dass ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit} hat`;
        }
        return `Zu klein: erwartet, dass ${issue2.origin} ${adj}${issue2.minimum.toString()} ist`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Ungültiger String: muss mit "${_issue.prefix}" beginnen`;
        if (_issue.format === "ends_with")
          return `Ungültiger String: muss mit "${_issue.suffix}" enden`;
        if (_issue.format === "includes")
          return `Ungültiger String: muss "${_issue.includes}" enthalten`;
        if (_issue.format === "regex")
          return `Ungültiger String: muss dem Muster ${_issue.pattern} entsprechen`;
        return `Ungültig: ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Ungültige Zahl: muss ein Vielfaches von ${issue2.divisor} sein`;
      case "unrecognized_keys":
        return `${issue2.keys.length > 1 ? "Unbekannte Schlüssel" : "Unbekannter Schlüssel"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Ungültiger Schlüssel in ${issue2.origin}`;
      case "invalid_union":
        return "Ungültige Eingabe";
      case "invalid_element":
        return `Ungültiger Wert in ${issue2.origin}`;
      default:
        return `Ungültige Eingabe`;
    }
  };
};
var init_de = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/el.js
function el_default() {
  return {
    localeError: error9()
  };
}
var error9 = () => {
  const Sizable = {
    string: { unit: "χαρακτήρες", verb: "να έχει" },
    file: { unit: "bytes", verb: "να έχει" },
    array: { unit: "στοιχεία", verb: "να έχει" },
    set: { unit: "στοιχεία", verb: "να έχει" },
    map: { unit: "καταχωρήσεις", verb: "να έχει" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "είσοδος",
    email: "διεύθυνση email",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO ημερομηνία και ώρα",
    date: "ISO ημερομηνία",
    time: "ISO ώρα",
    duration: "ISO διάρκεια",
    ipv4: "διεύθυνση IPv4",
    ipv6: "διεύθυνση IPv6",
    mac: "διεύθυνση MAC",
    cidrv4: "εύρος IPv4",
    cidrv6: "εύρος IPv6",
    base64: "συμβολοσειρά κωδικοποιημένη σε base64",
    base64url: "συμβολοσειρά κωδικοποιημένη σε base64url",
    json_string: "συμβολοσειρά JSON",
    e164: "αριθμός E.164",
    jwt: "JWT",
    template_literal: "είσοδος"
  };
  const TypeDictionary = {
    nan: "NaN"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (typeof issue2.expected === "string" && /^[A-Z]/.test(issue2.expected)) {
          return `Μη έγκυρη είσοδος: αναμενόταν instanceof ${issue2.expected}, λήφθηκε ${received}`;
        }
        return `Μη έγκυρη είσοδος: αναμενόταν ${expected}, λήφθηκε ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Μη έγκυρη είσοδος: αναμενόταν ${stringifyPrimitive(issue2.values[0])}`;
        return `Μη έγκυρη επιλογή: αναμενόταν ένα από ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Πολύ μεγάλο: αναμενόταν ${issue2.origin ?? "τιμή"} να έχει ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "στοιχεία"}`;
        return `Πολύ μεγάλο: αναμενόταν ${issue2.origin ?? "τιμή"} να είναι ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Πολύ μικρό: αναμενόταν ${issue2.origin} να έχει ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Πολύ μικρό: αναμενόταν ${issue2.origin} να είναι ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Μη έγκυρη συμβολοσειρά: πρέπει να ξεκινά με "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Μη έγκυρη συμβολοσειρά: πρέπει να τελειώνει με "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Μη έγκυρη συμβολοσειρά: πρέπει να περιέχει "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Μη έγκυρη συμβολοσειρά: πρέπει να ταιριάζει με το μοτίβο ${_issue.pattern}`;
        return `Μη έγκυρο: ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Μη έγκυρος αριθμός: πρέπει να είναι πολλαπλάσιο του ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Άγνωστ${issue2.keys.length > 1 ? "α" : "ο"} κλειδ${issue2.keys.length > 1 ? "ιά" : "ί"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Μη έγκυρο κλειδί στο ${issue2.origin}`;
      case "invalid_union":
        return "Μη έγκυρη είσοδος";
      case "invalid_element":
        return `Μη έγκυρη τιμή στο ${issue2.origin}`;
      default:
        return `Μη έγκυρη είσοδος`;
    }
  };
};
var init_el = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/en.js
function en_default() {
  return {
    localeError: error10()
  };
}
var error10 = () => {
  const Sizable = {
    string: { unit: "characters", verb: "to have" },
    file: { unit: "bytes", verb: "to have" },
    array: { unit: "items", verb: "to have" },
    set: { unit: "items", verb: "to have" },
    map: { unit: "entries", verb: "to have" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "input",
    email: "email address",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO datetime",
    date: "ISO date",
    time: "ISO time",
    duration: "ISO duration",
    ipv4: "IPv4 address",
    ipv6: "IPv6 address",
    mac: "MAC address",
    cidrv4: "IPv4 range",
    cidrv6: "IPv6 range",
    base64: "base64-encoded string",
    base64url: "base64url-encoded string",
    json_string: "JSON string",
    e164: "E.164 number",
    jwt: "JWT",
    template_literal: "input"
  };
  const TypeDictionary = {
    nan: "NaN"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        return `Invalid input: expected ${expected}, received ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Invalid input: expected ${stringifyPrimitive(issue2.values[0])}`;
        return `Invalid option: expected one of ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Too big: expected ${issue2.origin ?? "value"} to have ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elements"}`;
        return `Too big: expected ${issue2.origin ?? "value"} to be ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Too small: expected ${issue2.origin} to have ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Too small: expected ${issue2.origin} to be ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Invalid string: must start with "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Invalid string: must end with "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Invalid string: must include "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Invalid string: must match pattern ${_issue.pattern}`;
        return `Invalid ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Invalid number: must be a multiple of ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Unrecognized key${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Invalid key in ${issue2.origin}`;
      case "invalid_union":
        if (issue2.options && Array.isArray(issue2.options) && issue2.options.length > 0) {
          const opts = issue2.options.map((o) => `'${o}'`).join(" | ");
          return `Invalid discriminator value. Expected ${opts}`;
        }
        return "Invalid input";
      case "invalid_element":
        return `Invalid value in ${issue2.origin}`;
      default:
        return `Invalid input`;
    }
  };
};
var init_en = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/eo.js
function eo_default() {
  return {
    localeError: error11()
  };
}
var error11 = () => {
  const Sizable = {
    string: { unit: "karaktrojn", verb: "havi" },
    file: { unit: "bajtojn", verb: "havi" },
    array: { unit: "elementojn", verb: "havi" },
    set: { unit: "elementojn", verb: "havi" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "enigo",
    email: "retadreso",
    url: "URL",
    emoji: "emoĝio",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO-datotempo",
    date: "ISO-dato",
    time: "ISO-tempo",
    duration: "ISO-daŭro",
    ipv4: "IPv4-adreso",
    ipv6: "IPv6-adreso",
    cidrv4: "IPv4-rango",
    cidrv6: "IPv6-rango",
    base64: "64-ume kodita karaktraro",
    base64url: "URL-64-ume kodita karaktraro",
    json_string: "JSON-karaktraro",
    e164: "E.164-nombro",
    jwt: "JWT",
    template_literal: "enigo"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "nombro",
    array: "tabelo",
    null: "senvalora"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Nevalida enigo: atendiĝis instanceof ${issue2.expected}, riceviĝis ${received}`;
        }
        return `Nevalida enigo: atendiĝis ${expected}, riceviĝis ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Nevalida enigo: atendiĝis ${stringifyPrimitive(issue2.values[0])}`;
        return `Nevalida opcio: atendiĝis unu el ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Tro granda: atendiĝis ke ${issue2.origin ?? "valoro"} havu ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elementojn"}`;
        return `Tro granda: atendiĝis ke ${issue2.origin ?? "valoro"} havu ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Tro malgranda: atendiĝis ke ${issue2.origin} havu ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Tro malgranda: atendiĝis ke ${issue2.origin} estu ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Nevalida karaktraro: devas komenciĝi per "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Nevalida karaktraro: devas finiĝi per "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Nevalida karaktraro: devas inkluzivi "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Nevalida karaktraro: devas kongrui kun la modelo ${_issue.pattern}`;
        return `Nevalida ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Nevalida nombro: devas esti oblo de ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Nekonata${issue2.keys.length > 1 ? "j" : ""} ŝlosilo${issue2.keys.length > 1 ? "j" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Nevalida ŝlosilo en ${issue2.origin}`;
      case "invalid_union":
        return "Nevalida enigo";
      case "invalid_element":
        return `Nevalida valoro en ${issue2.origin}`;
      default:
        return `Nevalida enigo`;
    }
  };
};
var init_eo = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/es.js
function es_default() {
  return {
    localeError: error12()
  };
}
var error12 = () => {
  const Sizable = {
    string: { unit: "caracteres", verb: "tener" },
    file: { unit: "bytes", verb: "tener" },
    array: { unit: "elementos", verb: "tener" },
    set: { unit: "elementos", verb: "tener" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "entrada",
    email: "dirección de correo electrónico",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "fecha y hora ISO",
    date: "fecha ISO",
    time: "hora ISO",
    duration: "duración ISO",
    ipv4: "dirección IPv4",
    ipv6: "dirección IPv6",
    cidrv4: "rango IPv4",
    cidrv6: "rango IPv6",
    base64: "cadena codificada en base64",
    base64url: "URL codificada en base64",
    json_string: "cadena JSON",
    e164: "número E.164",
    jwt: "JWT",
    template_literal: "entrada"
  };
  const TypeDictionary = {
    nan: "NaN",
    string: "texto",
    number: "número",
    boolean: "booleano",
    array: "arreglo",
    object: "objeto",
    set: "conjunto",
    file: "archivo",
    date: "fecha",
    bigint: "número grande",
    symbol: "símbolo",
    undefined: "indefinido",
    null: "nulo",
    function: "función",
    map: "mapa",
    record: "registro",
    tuple: "tupla",
    enum: "enumeración",
    union: "unión",
    literal: "literal",
    promise: "promesa",
    void: "vacío",
    never: "nunca",
    unknown: "desconocido",
    any: "cualquiera"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Entrada inválida: se esperaba instanceof ${issue2.expected}, recibido ${received}`;
        }
        return `Entrada inválida: se esperaba ${expected}, recibido ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Entrada inválida: se esperaba ${stringifyPrimitive(issue2.values[0])}`;
        return `Opción inválida: se esperaba una de ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        const origin = TypeDictionary[issue2.origin] ?? issue2.origin;
        if (sizing)
          return `Demasiado grande: se esperaba que ${origin ?? "valor"} tuviera ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elementos"}`;
        return `Demasiado grande: se esperaba que ${origin ?? "valor"} fuera ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        const origin = TypeDictionary[issue2.origin] ?? issue2.origin;
        if (sizing) {
          return `Demasiado pequeño: se esperaba que ${origin} tuviera ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Demasiado pequeño: se esperaba que ${origin} fuera ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Cadena inválida: debe comenzar con "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Cadena inválida: debe terminar en "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Cadena inválida: debe incluir "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Cadena inválida: debe coincidir con el patrón ${_issue.pattern}`;
        return `Inválido ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Número inválido: debe ser múltiplo de ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Llave${issue2.keys.length > 1 ? "s" : ""} desconocida${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Llave inválida en ${TypeDictionary[issue2.origin] ?? issue2.origin}`;
      case "invalid_union":
        return "Entrada inválida";
      case "invalid_element":
        return `Valor inválido en ${TypeDictionary[issue2.origin] ?? issue2.origin}`;
      default:
        return `Entrada inválida`;
    }
  };
};
var init_es = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/fa.js
function fa_default() {
  return {
    localeError: error13()
  };
}
var error13 = () => {
  const Sizable = {
    string: { unit: "کاراکتر", verb: "داشته باشد" },
    file: { unit: "بایت", verb: "داشته باشد" },
    array: { unit: "آیتم", verb: "داشته باشد" },
    set: { unit: "آیتم", verb: "داشته باشد" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "ورودی",
    email: "آدرس ایمیل",
    url: "URL",
    emoji: "ایموجی",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "تاریخ و زمان ایزو",
    date: "تاریخ ایزو",
    time: "زمان ایزو",
    duration: "مدت زمان ایزو",
    ipv4: "IPv4 آدرس",
    ipv6: "IPv6 آدرس",
    cidrv4: "IPv4 دامنه",
    cidrv6: "IPv6 دامنه",
    base64: "base64-encoded رشته",
    base64url: "base64url-encoded رشته",
    json_string: "JSON رشته",
    e164: "E.164 عدد",
    jwt: "JWT",
    template_literal: "ورودی"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "عدد",
    array: "آرایه"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `ورودی نامعتبر: می‌بایست instanceof ${issue2.expected} می‌بود، ${received} دریافت شد`;
        }
        return `ورودی نامعتبر: می‌بایست ${expected} می‌بود، ${received} دریافت شد`;
      }
      case "invalid_value":
        if (issue2.values.length === 1) {
          return `ورودی نامعتبر: می‌بایست ${stringifyPrimitive(issue2.values[0])} می‌بود`;
        }
        return `گزینه نامعتبر: می‌بایست یکی از ${joinValues(issue2.values, "|")} می‌بود`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `خیلی بزرگ: ${issue2.origin ?? "مقدار"} باید ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "عنصر"} باشد`;
        }
        return `خیلی بزرگ: ${issue2.origin ?? "مقدار"} باید ${adj}${issue2.maximum.toString()} باشد`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `خیلی کوچک: ${issue2.origin} باید ${adj}${issue2.minimum.toString()} ${sizing.unit} باشد`;
        }
        return `خیلی کوچک: ${issue2.origin} باید ${adj}${issue2.minimum.toString()} باشد`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `رشته نامعتبر: باید با "${_issue.prefix}" شروع شود`;
        }
        if (_issue.format === "ends_with") {
          return `رشته نامعتبر: باید با "${_issue.suffix}" تمام شود`;
        }
        if (_issue.format === "includes") {
          return `رشته نامعتبر: باید شامل "${_issue.includes}" باشد`;
        }
        if (_issue.format === "regex") {
          return `رشته نامعتبر: باید با الگوی ${_issue.pattern} مطابقت داشته باشد`;
        }
        return `${FormatDictionary[_issue.format] ?? issue2.format} نامعتبر`;
      }
      case "not_multiple_of":
        return `عدد نامعتبر: باید مضرب ${issue2.divisor} باشد`;
      case "unrecognized_keys":
        return `کلید${issue2.keys.length > 1 ? "های" : ""} ناشناس: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `کلید ناشناس در ${issue2.origin}`;
      case "invalid_union":
        return `ورودی نامعتبر`;
      case "invalid_element":
        return `مقدار نامعتبر در ${issue2.origin}`;
      default:
        return `ورودی نامعتبر`;
    }
  };
};
var init_fa = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/fi.js
function fi_default() {
  return {
    localeError: error14()
  };
}
var error14 = () => {
  const Sizable = {
    string: { unit: "merkkiä", subject: "merkkijonon" },
    file: { unit: "tavua", subject: "tiedoston" },
    array: { unit: "alkiota", subject: "listan" },
    set: { unit: "alkiota", subject: "joukon" },
    number: { unit: "", subject: "luvun" },
    bigint: { unit: "", subject: "suuren kokonaisluvun" },
    int: { unit: "", subject: "kokonaisluvun" },
    date: { unit: "", subject: "päivämäärän" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "säännöllinen lauseke",
    email: "sähköpostiosoite",
    url: "URL-osoite",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO-aikaleima",
    date: "ISO-päivämäärä",
    time: "ISO-aika",
    duration: "ISO-kesto",
    ipv4: "IPv4-osoite",
    ipv6: "IPv6-osoite",
    cidrv4: "IPv4-alue",
    cidrv6: "IPv6-alue",
    base64: "base64-koodattu merkkijono",
    base64url: "base64url-koodattu merkkijono",
    json_string: "JSON-merkkijono",
    e164: "E.164-luku",
    jwt: "JWT",
    template_literal: "templaattimerkkijono"
  };
  const TypeDictionary = {
    nan: "NaN"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Virheellinen tyyppi: odotettiin instanceof ${issue2.expected}, oli ${received}`;
        }
        return `Virheellinen tyyppi: odotettiin ${expected}, oli ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Virheellinen syöte: täytyy olla ${stringifyPrimitive(issue2.values[0])}`;
        return `Virheellinen valinta: täytyy olla yksi seuraavista: ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Liian suuri: ${sizing.subject} täytyy olla ${adj}${issue2.maximum.toString()} ${sizing.unit}`.trim();
        }
        return `Liian suuri: arvon täytyy olla ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Liian pieni: ${sizing.subject} täytyy olla ${adj}${issue2.minimum.toString()} ${sizing.unit}`.trim();
        }
        return `Liian pieni: arvon täytyy olla ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Virheellinen syöte: täytyy alkaa "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Virheellinen syöte: täytyy loppua "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Virheellinen syöte: täytyy sisältää "${_issue.includes}"`;
        if (_issue.format === "regex") {
          return `Virheellinen syöte: täytyy vastata säännöllistä lauseketta ${_issue.pattern}`;
        }
        return `Virheellinen ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Virheellinen luku: täytyy olla luvun ${issue2.divisor} monikerta`;
      case "unrecognized_keys":
        return `${issue2.keys.length > 1 ? "Tuntemattomat avaimet" : "Tuntematon avain"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return "Virheellinen avain tietueessa";
      case "invalid_union":
        return "Virheellinen unioni";
      case "invalid_element":
        return "Virheellinen arvo joukossa";
      default:
        return `Virheellinen syöte`;
    }
  };
};
var init_fi = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/fr.js
function fr_default() {
  return {
    localeError: error15()
  };
}
var error15 = () => {
  const Sizable = {
    string: { unit: "caractères", verb: "avoir" },
    file: { unit: "octets", verb: "avoir" },
    array: { unit: "éléments", verb: "avoir" },
    set: { unit: "éléments", verb: "avoir" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "entrée",
    email: "adresse e-mail",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "date et heure ISO",
    date: "date ISO",
    time: "heure ISO",
    duration: "durée ISO",
    ipv4: "adresse IPv4",
    ipv6: "adresse IPv6",
    cidrv4: "plage IPv4",
    cidrv6: "plage IPv6",
    base64: "chaîne encodée en base64",
    base64url: "chaîne encodée en base64url",
    json_string: "chaîne JSON",
    e164: "numéro E.164",
    jwt: "JWT",
    template_literal: "entrée"
  };
  const TypeDictionary = {
    string: "chaîne",
    number: "nombre",
    int: "entier",
    boolean: "booléen",
    bigint: "grand entier",
    symbol: "symbole",
    undefined: "indéfini",
    null: "null",
    never: "jamais",
    void: "vide",
    date: "date",
    array: "tableau",
    object: "objet",
    tuple: "tuple",
    record: "enregistrement",
    map: "carte",
    set: "ensemble",
    file: "fichier",
    nonoptional: "non-optionnel",
    nan: "NaN",
    function: "fonction"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Entrée invalide : instanceof ${issue2.expected} attendu, ${received} reçu`;
        }
        return `Entrée invalide : ${expected} attendu, ${received} reçu`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Entrée invalide : ${stringifyPrimitive(issue2.values[0])} attendu`;
        return `Option invalide : une valeur parmi ${joinValues(issue2.values, "|")} attendue`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Trop grand : ${TypeDictionary[issue2.origin] ?? "valeur"} doit ${sizing.verb} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "élément(s)"}`;
        return `Trop grand : ${TypeDictionary[issue2.origin] ?? "valeur"} doit être ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Trop petit : ${TypeDictionary[issue2.origin] ?? "valeur"} doit ${sizing.verb} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        return `Trop petit : ${TypeDictionary[issue2.origin] ?? "valeur"} doit être ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Chaîne invalide : doit commencer par "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Chaîne invalide : doit se terminer par "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Chaîne invalide : doit inclure "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Chaîne invalide : doit correspondre au modèle ${_issue.pattern}`;
        return `${FormatDictionary[_issue.format] ?? issue2.format} invalide`;
      }
      case "not_multiple_of":
        return `Nombre invalide : doit être un multiple de ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Clé${issue2.keys.length > 1 ? "s" : ""} non reconnue${issue2.keys.length > 1 ? "s" : ""} : ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Clé invalide dans ${issue2.origin}`;
      case "invalid_union":
        return "Entrée invalide";
      case "invalid_element":
        return `Valeur invalide dans ${issue2.origin}`;
      default:
        return `Entrée invalide`;
    }
  };
};
var init_fr = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/fr-CA.js
function fr_CA_default() {
  return {
    localeError: error16()
  };
}
var error16 = () => {
  const Sizable = {
    string: { unit: "caractères", verb: "avoir" },
    file: { unit: "octets", verb: "avoir" },
    array: { unit: "éléments", verb: "avoir" },
    set: { unit: "éléments", verb: "avoir" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "entrée",
    email: "adresse courriel",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "date-heure ISO",
    date: "date ISO",
    time: "heure ISO",
    duration: "durée ISO",
    ipv4: "adresse IPv4",
    ipv6: "adresse IPv6",
    cidrv4: "plage IPv4",
    cidrv6: "plage IPv6",
    base64: "chaîne encodée en base64",
    base64url: "chaîne encodée en base64url",
    json_string: "chaîne JSON",
    e164: "numéro E.164",
    jwt: "JWT",
    template_literal: "entrée"
  };
  const TypeDictionary = {
    nan: "NaN"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Entrée invalide : attendu instanceof ${issue2.expected}, reçu ${received}`;
        }
        return `Entrée invalide : attendu ${expected}, reçu ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Entrée invalide : attendu ${stringifyPrimitive(issue2.values[0])}`;
        return `Option invalide : attendu l'une des valeurs suivantes ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "≤" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Trop grand : attendu que ${issue2.origin ?? "la valeur"} ait ${adj}${issue2.maximum.toString()} ${sizing.unit}`;
        return `Trop grand : attendu que ${issue2.origin ?? "la valeur"} soit ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? "≥" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Trop petit : attendu que ${issue2.origin} ait ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Trop petit : attendu que ${issue2.origin} soit ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Chaîne invalide : doit commencer par "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Chaîne invalide : doit se terminer par "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Chaîne invalide : doit inclure "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Chaîne invalide : doit correspondre au motif ${_issue.pattern}`;
        return `${FormatDictionary[_issue.format] ?? issue2.format} invalide`;
      }
      case "not_multiple_of":
        return `Nombre invalide : doit être un multiple de ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Clé${issue2.keys.length > 1 ? "s" : ""} non reconnue${issue2.keys.length > 1 ? "s" : ""} : ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Clé invalide dans ${issue2.origin}`;
      case "invalid_union":
        return "Entrée invalide";
      case "invalid_element":
        return `Valeur invalide dans ${issue2.origin}`;
      default:
        return `Entrée invalide`;
    }
  };
};
var init_fr_CA = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/he.js
function he_default() {
  return {
    localeError: error17()
  };
}
var error17 = () => {
  const TypeNames = {
    string: { label: "מחרוזת", gender: "f" },
    number: { label: "מספר", gender: "m" },
    boolean: { label: "ערך בוליאני", gender: "m" },
    bigint: { label: "BigInt", gender: "m" },
    date: { label: "תאריך", gender: "m" },
    array: { label: "מערך", gender: "m" },
    object: { label: "אובייקט", gender: "m" },
    null: { label: "ערך ריק (null)", gender: "m" },
    undefined: { label: "ערך לא מוגדר (undefined)", gender: "m" },
    symbol: { label: "סימבול (Symbol)", gender: "m" },
    function: { label: "פונקציה", gender: "f" },
    map: { label: "מפה (Map)", gender: "f" },
    set: { label: "קבוצה (Set)", gender: "f" },
    file: { label: "קובץ", gender: "m" },
    promise: { label: "Promise", gender: "m" },
    NaN: { label: "NaN", gender: "m" },
    unknown: { label: "ערך לא ידוע", gender: "m" },
    value: { label: "ערך", gender: "m" }
  };
  const Sizable = {
    string: { unit: "תווים", shortLabel: "קצר", longLabel: "ארוך" },
    file: { unit: "בייטים", shortLabel: "קטן", longLabel: "גדול" },
    array: { unit: "פריטים", shortLabel: "קטן", longLabel: "גדול" },
    set: { unit: "פריטים", shortLabel: "קטן", longLabel: "גדול" },
    number: { unit: "", shortLabel: "קטן", longLabel: "גדול" }
  };
  const typeEntry = (t) => t ? TypeNames[t] : undefined;
  const typeLabel = (t) => {
    const e = typeEntry(t);
    if (e)
      return e.label;
    return t ?? TypeNames.unknown.label;
  };
  const withDefinite = (t) => `ה${typeLabel(t)}`;
  const verbFor = (t) => {
    const e = typeEntry(t);
    const gender = e?.gender ?? "m";
    return gender === "f" ? "צריכה להיות" : "צריך להיות";
  };
  const getSizing = (origin) => {
    if (!origin)
      return null;
    return Sizable[origin] ?? null;
  };
  const FormatDictionary = {
    regex: { label: "קלט", gender: "m" },
    email: { label: "כתובת אימייל", gender: "f" },
    url: { label: "כתובת רשת", gender: "f" },
    emoji: { label: "אימוג'י", gender: "m" },
    uuid: { label: "UUID", gender: "m" },
    nanoid: { label: "nanoid", gender: "m" },
    guid: { label: "GUID", gender: "m" },
    cuid: { label: "cuid", gender: "m" },
    cuid2: { label: "cuid2", gender: "m" },
    ulid: { label: "ULID", gender: "m" },
    xid: { label: "XID", gender: "m" },
    ksuid: { label: "KSUID", gender: "m" },
    datetime: { label: "תאריך וזמן ISO", gender: "m" },
    date: { label: "תאריך ISO", gender: "m" },
    time: { label: "זמן ISO", gender: "m" },
    duration: { label: "משך זמן ISO", gender: "m" },
    ipv4: { label: "כתובת IPv4", gender: "f" },
    ipv6: { label: "כתובת IPv6", gender: "f" },
    cidrv4: { label: "טווח IPv4", gender: "m" },
    cidrv6: { label: "טווח IPv6", gender: "m" },
    base64: { label: "מחרוזת בבסיס 64", gender: "f" },
    base64url: { label: "מחרוזת בבסיס 64 לכתובות רשת", gender: "f" },
    json_string: { label: "מחרוזת JSON", gender: "f" },
    e164: { label: "מספר E.164", gender: "m" },
    jwt: { label: "JWT", gender: "m" },
    ends_with: { label: "קלט", gender: "m" },
    includes: { label: "קלט", gender: "m" },
    lowercase: { label: "קלט", gender: "m" },
    starts_with: { label: "קלט", gender: "m" },
    uppercase: { label: "קלט", gender: "m" }
  };
  const TypeDictionary = {
    nan: "NaN"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expectedKey = issue2.expected;
        const expected = TypeDictionary[expectedKey ?? ""] ?? typeLabel(expectedKey);
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? TypeNames[receivedType]?.label ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `קלט לא תקין: צריך להיות instanceof ${issue2.expected}, התקבל ${received}`;
        }
        return `קלט לא תקין: צריך להיות ${expected}, התקבל ${received}`;
      }
      case "invalid_value": {
        if (issue2.values.length === 1) {
          return `ערך לא תקין: הערך חייב להיות ${stringifyPrimitive(issue2.values[0])}`;
        }
        const stringified = issue2.values.map((v) => stringifyPrimitive(v));
        if (issue2.values.length === 2) {
          return `ערך לא תקין: האפשרויות המתאימות הן ${stringified[0]} או ${stringified[1]}`;
        }
        const lastValue = stringified[stringified.length - 1];
        const restValues = stringified.slice(0, -1).join(", ");
        return `ערך לא תקין: האפשרויות המתאימות הן ${restValues} או ${lastValue}`;
      }
      case "too_big": {
        const sizing = getSizing(issue2.origin);
        const subject = withDefinite(issue2.origin ?? "value");
        if (issue2.origin === "string") {
          return `${sizing?.longLabel ?? "ארוך"} מדי: ${subject} צריכה להכיל ${issue2.maximum.toString()} ${sizing?.unit ?? ""} ${issue2.inclusive ? "או פחות" : "לכל היותר"}`.trim();
        }
        if (issue2.origin === "number") {
          const comparison = issue2.inclusive ? `קטן או שווה ל-${issue2.maximum}` : `קטן מ-${issue2.maximum}`;
          return `גדול מדי: ${subject} צריך להיות ${comparison}`;
        }
        if (issue2.origin === "array" || issue2.origin === "set") {
          const verb = issue2.origin === "set" ? "צריכה" : "צריך";
          const comparison = issue2.inclusive ? `${issue2.maximum} ${sizing?.unit ?? ""} או פחות` : `פחות מ-${issue2.maximum} ${sizing?.unit ?? ""}`;
          return `גדול מדי: ${subject} ${verb} להכיל ${comparison}`.trim();
        }
        const adj = issue2.inclusive ? "<=" : "<";
        const be = verbFor(issue2.origin ?? "value");
        if (sizing?.unit) {
          return `${sizing.longLabel} מדי: ${subject} ${be} ${adj}${issue2.maximum.toString()} ${sizing.unit}`;
        }
        return `${sizing?.longLabel ?? "גדול"} מדי: ${subject} ${be} ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const sizing = getSizing(issue2.origin);
        const subject = withDefinite(issue2.origin ?? "value");
        if (issue2.origin === "string") {
          return `${sizing?.shortLabel ?? "קצר"} מדי: ${subject} צריכה להכיל ${issue2.minimum.toString()} ${sizing?.unit ?? ""} ${issue2.inclusive ? "או יותר" : "לפחות"}`.trim();
        }
        if (issue2.origin === "number") {
          const comparison = issue2.inclusive ? `גדול או שווה ל-${issue2.minimum}` : `גדול מ-${issue2.minimum}`;
          return `קטן מדי: ${subject} צריך להיות ${comparison}`;
        }
        if (issue2.origin === "array" || issue2.origin === "set") {
          const verb = issue2.origin === "set" ? "צריכה" : "צריך";
          if (issue2.minimum === 1 && issue2.inclusive) {
            const singularPhrase = issue2.origin === "set" ? "לפחות פריט אחד" : "לפחות פריט אחד";
            return `קטן מדי: ${subject} ${verb} להכיל ${singularPhrase}`;
          }
          const comparison = issue2.inclusive ? `${issue2.minimum} ${sizing?.unit ?? ""} או יותר` : `יותר מ-${issue2.minimum} ${sizing?.unit ?? ""}`;
          return `קטן מדי: ${subject} ${verb} להכיל ${comparison}`.trim();
        }
        const adj = issue2.inclusive ? ">=" : ">";
        const be = verbFor(issue2.origin ?? "value");
        if (sizing?.unit) {
          return `${sizing.shortLabel} מדי: ${subject} ${be} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `${sizing?.shortLabel ?? "קטן"} מדי: ${subject} ${be} ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `המחרוזת חייבת להתחיל ב "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `המחרוזת חייבת להסתיים ב "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `המחרוזת חייבת לכלול "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `המחרוזת חייבת להתאים לתבנית ${_issue.pattern}`;
        const nounEntry = FormatDictionary[_issue.format];
        const noun = nounEntry?.label ?? _issue.format;
        const gender = nounEntry?.gender ?? "m";
        const adjective = gender === "f" ? "תקינה" : "תקין";
        return `${noun} לא ${adjective}`;
      }
      case "not_multiple_of":
        return `מספר לא תקין: חייב להיות מכפלה של ${issue2.divisor}`;
      case "unrecognized_keys":
        return `מפתח${issue2.keys.length > 1 ? "ות" : ""} לא מזוה${issue2.keys.length > 1 ? "ים" : "ה"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key": {
        return `שדה לא תקין באובייקט`;
      }
      case "invalid_union":
        return "קלט לא תקין";
      case "invalid_element": {
        const place = withDefinite(issue2.origin ?? "array");
        return `ערך לא תקין ב${place}`;
      }
      default:
        return `קלט לא תקין`;
    }
  };
};
var init_he = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/hr.js
function hr_default() {
  return {
    localeError: error18()
  };
}
var error18 = () => {
  const Sizable = {
    string: { unit: "znakova", verb: "imati" },
    file: { unit: "bajtova", verb: "imati" },
    array: { unit: "stavki", verb: "imati" },
    set: { unit: "stavki", verb: "imati" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "unos",
    email: "email adresa",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO datum i vrijeme",
    date: "ISO datum",
    time: "ISO vrijeme",
    duration: "ISO trajanje",
    ipv4: "IPv4 adresa",
    ipv6: "IPv6 adresa",
    cidrv4: "IPv4 raspon",
    cidrv6: "IPv6 raspon",
    base64: "base64 kodirani tekst",
    base64url: "base64url kodirani tekst",
    json_string: "JSON tekst",
    e164: "E.164 broj",
    jwt: "JWT",
    template_literal: "unos"
  };
  const TypeDictionary = {
    nan: "NaN",
    string: "tekst",
    number: "broj",
    boolean: "boolean",
    array: "niz",
    object: "objekt",
    set: "skup",
    file: "datoteka",
    date: "datum",
    bigint: "bigint",
    symbol: "simbol",
    undefined: "undefined",
    null: "null",
    function: "funkcija",
    map: "mapa"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Neispravan unos: očekuje se instanceof ${issue2.expected}, a primljeno je ${received}`;
        }
        return `Neispravan unos: očekuje se ${expected}, a primljeno je ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Neispravna vrijednost: očekivano ${stringifyPrimitive(issue2.values[0])}`;
        return `Neispravna opcija: očekivano jedno od ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        const origin = TypeDictionary[issue2.origin] ?? issue2.origin;
        if (sizing)
          return `Preveliko: očekivano da ${origin ?? "vrijednost"} ima ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elemenata"}`;
        return `Preveliko: očekivano da ${origin ?? "vrijednost"} bude ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        const origin = TypeDictionary[issue2.origin] ?? issue2.origin;
        if (sizing) {
          return `Premalo: očekivano da ${origin} ima ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Premalo: očekivano da ${origin} bude ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Neispravan tekst: mora započinjati s "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Neispravan tekst: mora završavati s "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Neispravan tekst: mora sadržavati "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Neispravan tekst: mora odgovarati uzorku ${_issue.pattern}`;
        return `Neispravna ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Neispravan broj: mora biti višekratnik od ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Neprepoznat${issue2.keys.length > 1 ? "i ključevi" : " ključ"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Neispravan ključ u ${TypeDictionary[issue2.origin] ?? issue2.origin}`;
      case "invalid_union":
        return "Neispravan unos";
      case "invalid_element":
        return `Neispravna vrijednost u ${TypeDictionary[issue2.origin] ?? issue2.origin}`;
      default:
        return `Neispravan unos`;
    }
  };
};
var init_hr = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/hu.js
function hu_default() {
  return {
    localeError: error19()
  };
}
var error19 = () => {
  const Sizable = {
    string: { unit: "karakter", verb: "legyen" },
    file: { unit: "byte", verb: "legyen" },
    array: { unit: "elem", verb: "legyen" },
    set: { unit: "elem", verb: "legyen" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "bemenet",
    email: "email cím",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO időbélyeg",
    date: "ISO dátum",
    time: "ISO idő",
    duration: "ISO időintervallum",
    ipv4: "IPv4 cím",
    ipv6: "IPv6 cím",
    cidrv4: "IPv4 tartomány",
    cidrv6: "IPv6 tartomány",
    base64: "base64-kódolt string",
    base64url: "base64url-kódolt string",
    json_string: "JSON string",
    e164: "E.164 szám",
    jwt: "JWT",
    template_literal: "bemenet"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "szám",
    array: "tömb"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Érvénytelen bemenet: a várt érték instanceof ${issue2.expected}, a kapott érték ${received}`;
        }
        return `Érvénytelen bemenet: a várt érték ${expected}, a kapott érték ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Érvénytelen bemenet: a várt érték ${stringifyPrimitive(issue2.values[0])}`;
        return `Érvénytelen opció: valamelyik érték várt ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Túl nagy: ${issue2.origin ?? "érték"} mérete túl nagy ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elem"}`;
        return `Túl nagy: a bemeneti érték ${issue2.origin ?? "érték"} túl nagy: ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Túl kicsi: a bemeneti érték ${issue2.origin} mérete túl kicsi ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Túl kicsi: a bemeneti érték ${issue2.origin} túl kicsi ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Érvénytelen string: "${_issue.prefix}" értékkel kell kezdődnie`;
        if (_issue.format === "ends_with")
          return `Érvénytelen string: "${_issue.suffix}" értékkel kell végződnie`;
        if (_issue.format === "includes")
          return `Érvénytelen string: "${_issue.includes}" értéket kell tartalmaznia`;
        if (_issue.format === "regex")
          return `Érvénytelen string: ${_issue.pattern} mintának kell megfelelnie`;
        return `Érvénytelen ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Érvénytelen szám: ${issue2.divisor} többszörösének kell lennie`;
      case "unrecognized_keys":
        return `Ismeretlen kulcs${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Érvénytelen kulcs ${issue2.origin}`;
      case "invalid_union":
        return "Érvénytelen bemenet";
      case "invalid_element":
        return `Érvénytelen érték: ${issue2.origin}`;
      default:
        return `Érvénytelen bemenet`;
    }
  };
};
var init_hu = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/hy.js
function getArmenianPlural(count, one, many) {
  return Math.abs(count) === 1 ? one : many;
}
function withDefiniteArticle(word) {
  if (!word)
    return "";
  const vowels = ["ա", "ե", "ը", "ի", "ո", "ու", "օ"];
  const lastChar = word[word.length - 1];
  return word + (vowels.includes(lastChar) ? "ն" : "ը");
}
function hy_default() {
  return {
    localeError: error20()
  };
}
var error20 = () => {
  const Sizable = {
    string: {
      unit: {
        one: "նշան",
        many: "նշաններ"
      },
      verb: "ունենալ"
    },
    file: {
      unit: {
        one: "բայթ",
        many: "բայթեր"
      },
      verb: "ունենալ"
    },
    array: {
      unit: {
        one: "տարր",
        many: "տարրեր"
      },
      verb: "ունենալ"
    },
    set: {
      unit: {
        one: "տարր",
        many: "տարրեր"
      },
      verb: "ունենալ"
    }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "մուտք",
    email: "էլ. հասցե",
    url: "URL",
    emoji: "էմոջի",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO ամսաթիվ և ժամ",
    date: "ISO ամսաթիվ",
    time: "ISO ժամ",
    duration: "ISO տևողություն",
    ipv4: "IPv4 հասցե",
    ipv6: "IPv6 հասցե",
    cidrv4: "IPv4 միջակայք",
    cidrv6: "IPv6 միջակայք",
    base64: "base64 ձևաչափով տող",
    base64url: "base64url ձևաչափով տող",
    json_string: "JSON տող",
    e164: "E.164 համար",
    jwt: "JWT",
    template_literal: "մուտք"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "թիվ",
    array: "զանգված"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Սխալ մուտքագրում․ սպասվում էր instanceof ${issue2.expected}, ստացվել է ${received}`;
        }
        return `Սխալ մուտքագրում․ սպասվում էր ${expected}, ստացվել է ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Սխալ մուտքագրում․ սպասվում էր ${stringifyPrimitive(issue2.values[1])}`;
        return `Սխալ տարբերակ․ սպասվում էր հետևյալներից մեկը՝ ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          const maxValue = Number(issue2.maximum);
          const unit = getArmenianPlural(maxValue, sizing.unit.one, sizing.unit.many);
          return `Չափազանց մեծ արժեք․ սպասվում է, որ ${withDefiniteArticle(issue2.origin ?? "արժեք")} կունենա ${adj}${issue2.maximum.toString()} ${unit}`;
        }
        return `Չափազանց մեծ արժեք․ սպասվում է, որ ${withDefiniteArticle(issue2.origin ?? "արժեք")} լինի ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          const minValue = Number(issue2.minimum);
          const unit = getArmenianPlural(minValue, sizing.unit.one, sizing.unit.many);
          return `Չափազանց փոքր արժեք․ սպասվում է, որ ${withDefiniteArticle(issue2.origin)} կունենա ${adj}${issue2.minimum.toString()} ${unit}`;
        }
        return `Չափազանց փոքր արժեք․ սպասվում է, որ ${withDefiniteArticle(issue2.origin)} լինի ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Սխալ տող․ պետք է սկսվի "${_issue.prefix}"-ով`;
        if (_issue.format === "ends_with")
          return `Սխալ տող․ պետք է ավարտվի "${_issue.suffix}"-ով`;
        if (_issue.format === "includes")
          return `Սխալ տող․ պետք է պարունակի "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Սխալ տող․ պետք է համապատասխանի ${_issue.pattern} ձևաչափին`;
        return `Սխալ ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Սխալ թիվ․ պետք է բազմապատիկ լինի ${issue2.divisor}-ի`;
      case "unrecognized_keys":
        return `Չճանաչված բանալի${issue2.keys.length > 1 ? "ներ" : ""}. ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Սխալ բանալի ${withDefiniteArticle(issue2.origin)}-ում`;
      case "invalid_union":
        return "Սխալ մուտքագրում";
      case "invalid_element":
        return `Սխալ արժեք ${withDefiniteArticle(issue2.origin)}-ում`;
      default:
        return `Սխալ մուտքագրում`;
    }
  };
};
var init_hy = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/id.js
function id_default() {
  return {
    localeError: error21()
  };
}
var error21 = () => {
  const Sizable = {
    string: { unit: "karakter", verb: "memiliki" },
    file: { unit: "byte", verb: "memiliki" },
    array: { unit: "item", verb: "memiliki" },
    set: { unit: "item", verb: "memiliki" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "input",
    email: "alamat email",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "tanggal dan waktu format ISO",
    date: "tanggal format ISO",
    time: "jam format ISO",
    duration: "durasi format ISO",
    ipv4: "alamat IPv4",
    ipv6: "alamat IPv6",
    cidrv4: "rentang alamat IPv4",
    cidrv6: "rentang alamat IPv6",
    base64: "string dengan enkode base64",
    base64url: "string dengan enkode base64url",
    json_string: "string JSON",
    e164: "angka E.164",
    jwt: "JWT",
    template_literal: "input"
  };
  const TypeDictionary = {
    nan: "NaN"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Input tidak valid: diharapkan instanceof ${issue2.expected}, diterima ${received}`;
        }
        return `Input tidak valid: diharapkan ${expected}, diterima ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Input tidak valid: diharapkan ${stringifyPrimitive(issue2.values[0])}`;
        return `Pilihan tidak valid: diharapkan salah satu dari ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Terlalu besar: diharapkan ${issue2.origin ?? "value"} memiliki ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elemen"}`;
        return `Terlalu besar: diharapkan ${issue2.origin ?? "value"} menjadi ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Terlalu kecil: diharapkan ${issue2.origin} memiliki ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Terlalu kecil: diharapkan ${issue2.origin} menjadi ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `String tidak valid: harus dimulai dengan "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `String tidak valid: harus berakhir dengan "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `String tidak valid: harus menyertakan "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `String tidak valid: harus sesuai pola ${_issue.pattern}`;
        return `${FormatDictionary[_issue.format] ?? issue2.format} tidak valid`;
      }
      case "not_multiple_of":
        return `Angka tidak valid: harus kelipatan dari ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Kunci tidak dikenali ${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Kunci tidak valid di ${issue2.origin}`;
      case "invalid_union":
        return "Input tidak valid";
      case "invalid_element":
        return `Nilai tidak valid di ${issue2.origin}`;
      default:
        return `Input tidak valid`;
    }
  };
};
var init_id = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/is.js
function is_default() {
  return {
    localeError: error22()
  };
}
var error22 = () => {
  const Sizable = {
    string: { unit: "stafi", verb: "að hafa" },
    file: { unit: "bæti", verb: "að hafa" },
    array: { unit: "hluti", verb: "að hafa" },
    set: { unit: "hluti", verb: "að hafa" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "gildi",
    email: "netfang",
    url: "vefslóð",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO dagsetning og tími",
    date: "ISO dagsetning",
    time: "ISO tími",
    duration: "ISO tímalengd",
    ipv4: "IPv4 address",
    ipv6: "IPv6 address",
    cidrv4: "IPv4 range",
    cidrv6: "IPv6 range",
    base64: "base64-encoded strengur",
    base64url: "base64url-encoded strengur",
    json_string: "JSON strengur",
    e164: "E.164 tölugildi",
    jwt: "JWT",
    template_literal: "gildi"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "númer",
    array: "fylki"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Rangt gildi: Þú slóst inn ${received} þar sem á að vera instanceof ${issue2.expected}`;
        }
        return `Rangt gildi: Þú slóst inn ${received} þar sem á að vera ${expected}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Rangt gildi: gert ráð fyrir ${stringifyPrimitive(issue2.values[0])}`;
        return `Ógilt val: má vera eitt af eftirfarandi ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Of stórt: gert er ráð fyrir að ${issue2.origin ?? "gildi"} hafi ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "hluti"}`;
        return `Of stórt: gert er ráð fyrir að ${issue2.origin ?? "gildi"} sé ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Of lítið: gert er ráð fyrir að ${issue2.origin} hafi ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Of lítið: gert er ráð fyrir að ${issue2.origin} sé ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Ógildur strengur: verður að byrja á "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Ógildur strengur: verður að enda á "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Ógildur strengur: verður að innihalda "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Ógildur strengur: verður að fylgja mynstri ${_issue.pattern}`;
        return `Rangt ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Röng tala: verður að vera margfeldi af ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Óþekkt ${issue2.keys.length > 1 ? "ir lyklar" : "ur lykill"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Rangur lykill í ${issue2.origin}`;
      case "invalid_union":
        return "Rangt gildi";
      case "invalid_element":
        return `Rangt gildi í ${issue2.origin}`;
      default:
        return `Rangt gildi`;
    }
  };
};
var init_is = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/it.js
function it_default() {
  return {
    localeError: error23()
  };
}
var error23 = () => {
  const Sizable = {
    string: { unit: "caratteri", verb: "avere" },
    file: { unit: "byte", verb: "avere" },
    array: { unit: "elementi", verb: "avere" },
    set: { unit: "elementi", verb: "avere" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "input",
    email: "indirizzo email",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "data e ora ISO",
    date: "data ISO",
    time: "ora ISO",
    duration: "durata ISO",
    ipv4: "indirizzo IPv4",
    ipv6: "indirizzo IPv6",
    cidrv4: "intervallo IPv4",
    cidrv6: "intervallo IPv6",
    base64: "stringa codificata in base64",
    base64url: "URL codificata in base64",
    json_string: "stringa JSON",
    e164: "numero E.164",
    jwt: "JWT",
    template_literal: "input"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "numero",
    array: "vettore"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Input non valido: atteso instanceof ${issue2.expected}, ricevuto ${received}`;
        }
        return `Input non valido: atteso ${expected}, ricevuto ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Input non valido: atteso ${stringifyPrimitive(issue2.values[0])}`;
        return `Opzione non valida: atteso uno tra ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Troppo grande: ${issue2.origin ?? "valore"} deve avere ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elementi"}`;
        return `Troppo grande: ${issue2.origin ?? "valore"} deve essere ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Troppo piccolo: ${issue2.origin} deve avere ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Troppo piccolo: ${issue2.origin} deve essere ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Stringa non valida: deve iniziare con "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Stringa non valida: deve terminare con "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Stringa non valida: deve includere "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Stringa non valida: deve corrispondere al pattern ${_issue.pattern}`;
        return `Input non valido: ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Numero non valido: deve essere un multiplo di ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Chiav${issue2.keys.length > 1 ? "i" : "e"} non riconosciut${issue2.keys.length > 1 ? "e" : "a"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Chiave non valida in ${issue2.origin}`;
      case "invalid_union":
        return "Input non valido";
      case "invalid_element":
        return `Valore non valido in ${issue2.origin}`;
      default:
        return `Input non valido`;
    }
  };
};
var init_it = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/ja.js
function ja_default() {
  return {
    localeError: error24()
  };
}
var error24 = () => {
  const Sizable = {
    string: { unit: "文字", verb: "である" },
    file: { unit: "バイト", verb: "である" },
    array: { unit: "要素", verb: "である" },
    set: { unit: "要素", verb: "である" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "入力値",
    email: "メールアドレス",
    url: "URL",
    emoji: "絵文字",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO日時",
    date: "ISO日付",
    time: "ISO時刻",
    duration: "ISO期間",
    ipv4: "IPv4アドレス",
    ipv6: "IPv6アドレス",
    cidrv4: "IPv4範囲",
    cidrv6: "IPv6範囲",
    base64: "base64エンコード文字列",
    base64url: "base64urlエンコード文字列",
    json_string: "JSON文字列",
    e164: "E.164番号",
    jwt: "JWT",
    template_literal: "入力値"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "数値",
    array: "配列"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `無効な入力: instanceof ${issue2.expected}が期待されましたが、${received}が入力されました`;
        }
        return `無効な入力: ${expected}が期待されましたが、${received}が入力されました`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `無効な入力: ${stringifyPrimitive(issue2.values[0])}が期待されました`;
        return `無効な選択: ${joinValues(issue2.values, "、")}のいずれかである必要があります`;
      case "too_big": {
        const adj = issue2.inclusive ? "以下である" : "より小さい";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `大きすぎる値: ${issue2.origin ?? "値"}は${issue2.maximum.toString()}${sizing.unit ?? "要素"}${adj}必要があります`;
        return `大きすぎる値: ${issue2.origin ?? "値"}は${issue2.maximum.toString()}${adj}必要があります`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? "以上である" : "より大きい";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `小さすぎる値: ${issue2.origin}は${issue2.minimum.toString()}${sizing.unit}${adj}必要があります`;
        return `小さすぎる値: ${issue2.origin}は${issue2.minimum.toString()}${adj}必要があります`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `無効な文字列: "${_issue.prefix}"で始まる必要があります`;
        if (_issue.format === "ends_with")
          return `無効な文字列: "${_issue.suffix}"で終わる必要があります`;
        if (_issue.format === "includes")
          return `無効な文字列: "${_issue.includes}"を含む必要があります`;
        if (_issue.format === "regex")
          return `無効な文字列: パターン${_issue.pattern}に一致する必要があります`;
        return `無効な${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `無効な数値: ${issue2.divisor}の倍数である必要があります`;
      case "unrecognized_keys":
        return `認識されていないキー${issue2.keys.length > 1 ? "群" : ""}: ${joinValues(issue2.keys, "、")}`;
      case "invalid_key":
        return `${issue2.origin}内の無効なキー`;
      case "invalid_union":
        return "無効な入力";
      case "invalid_element":
        return `${issue2.origin}内の無効な値`;
      default:
        return `無効な入力`;
    }
  };
};
var init_ja = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/ka.js
function ka_default() {
  return {
    localeError: error25()
  };
}
var error25 = () => {
  const Sizable = {
    string: { unit: "სიმბოლო", verb: "უნდა შეიცავდეს" },
    file: { unit: "ბაიტი", verb: "უნდა შეიცავდეს" },
    array: { unit: "ელემენტი", verb: "უნდა შეიცავდეს" },
    set: { unit: "ელემენტი", verb: "უნდა შეიცავდეს" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "შეყვანა",
    email: "ელ-ფოსტის მისამართი",
    url: "URL",
    emoji: "ემოჯი",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "თარიღი-დრო",
    date: "თარიღი",
    time: "დრო",
    duration: "ხანგრძლივობა",
    ipv4: "IPv4 მისამართი",
    ipv6: "IPv6 მისამართი",
    cidrv4: "IPv4 დიაპაზონი",
    cidrv6: "IPv6 დიაპაზონი",
    base64: "base64-კოდირებული ველი",
    base64url: "base64url-კოდირებული ველი",
    json_string: "JSON ველი",
    e164: "E.164 ნომერი",
    jwt: "JWT",
    template_literal: "შეყვანა"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "რიცხვი",
    string: "ველი",
    boolean: "ბულეანი",
    function: "ფუნქცია",
    array: "მასივი"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `არასწორი შეყვანა: მოსალოდნელი instanceof ${issue2.expected}, მიღებული ${received}`;
        }
        return `არასწორი შეყვანა: მოსალოდნელი ${expected}, მიღებული ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `არასწორი შეყვანა: მოსალოდნელი ${stringifyPrimitive(issue2.values[0])}`;
        return `არასწორი ვარიანტი: მოსალოდნელია ერთ-ერთი ${joinValues(issue2.values, "|")}-დან`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `ზედმეტად დიდი: მოსალოდნელი ${issue2.origin ?? "მნიშვნელობა"} ${sizing.verb} ${adj}${issue2.maximum.toString()} ${sizing.unit}`;
        return `ზედმეტად დიდი: მოსალოდნელი ${issue2.origin ?? "მნიშვნელობა"} იყოს ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `ზედმეტად პატარა: მოსალოდნელი ${issue2.origin} ${sizing.verb} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `ზედმეტად პატარა: მოსალოდნელი ${issue2.origin} იყოს ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `არასწორი ველი: უნდა იწყებოდეს "${_issue.prefix}"-ით`;
        }
        if (_issue.format === "ends_with")
          return `არასწორი ველი: უნდა მთავრდებოდეს "${_issue.suffix}"-ით`;
        if (_issue.format === "includes")
          return `არასწორი ველი: უნდა შეიცავდეს "${_issue.includes}"-ს`;
        if (_issue.format === "regex")
          return `არასწორი ველი: უნდა შეესაბამებოდეს შაბლონს ${_issue.pattern}`;
        return `არასწორი ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `არასწორი რიცხვი: უნდა იყოს ${issue2.divisor}-ის ჯერადი`;
      case "unrecognized_keys":
        return `უცნობი გასაღებ${issue2.keys.length > 1 ? "ები" : "ი"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `არასწორი გასაღები ${issue2.origin}-ში`;
      case "invalid_union":
        return "არასწორი შეყვანა";
      case "invalid_element":
        return `არასწორი მნიშვნელობა ${issue2.origin}-ში`;
      default:
        return `არასწორი შეყვანა`;
    }
  };
};
var init_ka = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/km.js
function km_default() {
  return {
    localeError: error26()
  };
}
var error26 = () => {
  const Sizable = {
    string: { unit: "តួអក្សរ", verb: "គួរមាន" },
    file: { unit: "បៃ", verb: "គួរមាន" },
    array: { unit: "ធាតុ", verb: "គួរមាន" },
    set: { unit: "ធាតុ", verb: "គួរមាន" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "ទិន្នន័យបញ្ចូល",
    email: "អាសយដ្ឋានអ៊ីមែល",
    url: "URL",
    emoji: "សញ្ញាអារម្មណ៍",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "កាលបរិច្ឆេទ និងម៉ោង ISO",
    date: "កាលបរិច្ឆេទ ISO",
    time: "ម៉ោង ISO",
    duration: "រយៈពេល ISO",
    ipv4: "អាសយដ្ឋាន IPv4",
    ipv6: "អាសយដ្ឋាន IPv6",
    cidrv4: "ដែនអាសយដ្ឋាន IPv4",
    cidrv6: "ដែនអាសយដ្ឋាន IPv6",
    base64: "ខ្សែអក្សរអ៊ិកូដ base64",
    base64url: "ខ្សែអក្សរអ៊ិកូដ base64url",
    json_string: "ខ្សែអក្សរ JSON",
    e164: "លេខ E.164",
    jwt: "JWT",
    template_literal: "ទិន្នន័យបញ្ចូល"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "លេខ",
    array: "អារេ (Array)",
    null: "គ្មានតម្លៃ (null)"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `ទិន្នន័យបញ្ចូលមិនត្រឹមត្រូវ៖ ត្រូវការ instanceof ${issue2.expected} ប៉ុន្តែទទួលបាន ${received}`;
        }
        return `ទិន្នន័យបញ្ចូលមិនត្រឹមត្រូវ៖ ត្រូវការ ${expected} ប៉ុន្តែទទួលបាន ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `ទិន្នន័យបញ្ចូលមិនត្រឹមត្រូវ៖ ត្រូវការ ${stringifyPrimitive(issue2.values[0])}`;
        return `ជម្រើសមិនត្រឹមត្រូវ៖ ត្រូវជាមួយក្នុងចំណោម ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `ធំពេក៖ ត្រូវការ ${issue2.origin ?? "តម្លៃ"} ${adj} ${issue2.maximum.toString()} ${sizing.unit ?? "ធាតុ"}`;
        return `ធំពេក៖ ត្រូវការ ${issue2.origin ?? "តម្លៃ"} ${adj} ${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `តូចពេក៖ ត្រូវការ ${issue2.origin} ${adj} ${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `តូចពេក៖ ត្រូវការ ${issue2.origin} ${adj} ${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `ខ្សែអក្សរមិនត្រឹមត្រូវ៖ ត្រូវចាប់ផ្តើមដោយ "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `ខ្សែអក្សរមិនត្រឹមត្រូវ៖ ត្រូវបញ្ចប់ដោយ "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `ខ្សែអក្សរមិនត្រឹមត្រូវ៖ ត្រូវមាន "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `ខ្សែអក្សរមិនត្រឹមត្រូវ៖ ត្រូវតែផ្គូផ្គងនឹងទម្រង់ដែលបានកំណត់ ${_issue.pattern}`;
        return `មិនត្រឹមត្រូវ៖ ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `លេខមិនត្រឹមត្រូវ៖ ត្រូវតែជាពហុគុណនៃ ${issue2.divisor}`;
      case "unrecognized_keys":
        return `រកឃើញសោមិនស្គាល់៖ ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `សោមិនត្រឹមត្រូវនៅក្នុង ${issue2.origin}`;
      case "invalid_union":
        return `ទិន្នន័យមិនត្រឹមត្រូវ`;
      case "invalid_element":
        return `ទិន្នន័យមិនត្រឹមត្រូវនៅក្នុង ${issue2.origin}`;
      default:
        return `ទិន្នន័យមិនត្រឹមត្រូវ`;
    }
  };
};
var init_km = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/kh.js
function kh_default() {
  return km_default();
}
var init_kh = __esm(() => {
  init_km();
});

// node_modules/zod/v4/locales/ko.js
function ko_default() {
  return {
    localeError: error27()
  };
}
var error27 = () => {
  const Sizable = {
    string: { unit: "문자", verb: "to have" },
    file: { unit: "바이트", verb: "to have" },
    array: { unit: "개", verb: "to have" },
    set: { unit: "개", verb: "to have" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "입력",
    email: "이메일 주소",
    url: "URL",
    emoji: "이모지",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO 날짜시간",
    date: "ISO 날짜",
    time: "ISO 시간",
    duration: "ISO 기간",
    ipv4: "IPv4 주소",
    ipv6: "IPv6 주소",
    cidrv4: "IPv4 범위",
    cidrv6: "IPv6 범위",
    base64: "base64 인코딩 문자열",
    base64url: "base64url 인코딩 문자열",
    json_string: "JSON 문자열",
    e164: "E.164 번호",
    jwt: "JWT",
    template_literal: "입력"
  };
  const TypeDictionary = {
    nan: "NaN"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `잘못된 입력: 예상 타입은 instanceof ${issue2.expected}, 받은 타입은 ${received}입니다`;
        }
        return `잘못된 입력: 예상 타입은 ${expected}, 받은 타입은 ${received}입니다`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `잘못된 입력: 값은 ${stringifyPrimitive(issue2.values[0])} 이어야 합니다`;
        return `잘못된 옵션: ${joinValues(issue2.values, "또는 ")} 중 하나여야 합니다`;
      case "too_big": {
        const adj = issue2.inclusive ? "이하" : "미만";
        const suffix = adj === "미만" ? "이어야 합니다" : "여야 합니다";
        const sizing = getSizing(issue2.origin);
        const unit = sizing?.unit ?? "요소";
        if (sizing)
          return `${issue2.origin ?? "값"}이 너무 큽니다: ${issue2.maximum.toString()}${unit} ${adj}${suffix}`;
        return `${issue2.origin ?? "값"}이 너무 큽니다: ${issue2.maximum.toString()} ${adj}${suffix}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? "이상" : "초과";
        const suffix = adj === "이상" ? "이어야 합니다" : "여야 합니다";
        const sizing = getSizing(issue2.origin);
        const unit = sizing?.unit ?? "요소";
        if (sizing) {
          return `${issue2.origin ?? "값"}이 너무 작습니다: ${issue2.minimum.toString()}${unit} ${adj}${suffix}`;
        }
        return `${issue2.origin ?? "값"}이 너무 작습니다: ${issue2.minimum.toString()} ${adj}${suffix}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `잘못된 문자열: "${_issue.prefix}"(으)로 시작해야 합니다`;
        }
        if (_issue.format === "ends_with")
          return `잘못된 문자열: "${_issue.suffix}"(으)로 끝나야 합니다`;
        if (_issue.format === "includes")
          return `잘못된 문자열: "${_issue.includes}"을(를) 포함해야 합니다`;
        if (_issue.format === "regex")
          return `잘못된 문자열: 정규식 ${_issue.pattern} 패턴과 일치해야 합니다`;
        return `잘못된 ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `잘못된 숫자: ${issue2.divisor}의 배수여야 합니다`;
      case "unrecognized_keys":
        return `인식할 수 없는 키: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `잘못된 키: ${issue2.origin}`;
      case "invalid_union":
        return `잘못된 입력`;
      case "invalid_element":
        return `잘못된 값: ${issue2.origin}`;
      default:
        return `잘못된 입력`;
    }
  };
};
var init_ko = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/lt.js
function getUnitTypeFromNumber(number2) {
  const abs = Math.abs(number2);
  const last = abs % 10;
  const last2 = abs % 100;
  if (last2 >= 11 && last2 <= 19 || last === 0)
    return "many";
  if (last === 1)
    return "one";
  return "few";
}
function lt_default() {
  return {
    localeError: error28()
  };
}
var capitalizeFirstCharacter = (text) => {
  return text.charAt(0).toUpperCase() + text.slice(1);
}, error28 = () => {
  const Sizable = {
    string: {
      unit: {
        one: "simbolis",
        few: "simboliai",
        many: "simbolių"
      },
      verb: {
        smaller: {
          inclusive: "turi būti ne ilgesnė kaip",
          notInclusive: "turi būti trumpesnė kaip"
        },
        bigger: {
          inclusive: "turi būti ne trumpesnė kaip",
          notInclusive: "turi būti ilgesnė kaip"
        }
      }
    },
    file: {
      unit: {
        one: "baitas",
        few: "baitai",
        many: "baitų"
      },
      verb: {
        smaller: {
          inclusive: "turi būti ne didesnis kaip",
          notInclusive: "turi būti mažesnis kaip"
        },
        bigger: {
          inclusive: "turi būti ne mažesnis kaip",
          notInclusive: "turi būti didesnis kaip"
        }
      }
    },
    array: {
      unit: {
        one: "elementą",
        few: "elementus",
        many: "elementų"
      },
      verb: {
        smaller: {
          inclusive: "turi turėti ne daugiau kaip",
          notInclusive: "turi turėti mažiau kaip"
        },
        bigger: {
          inclusive: "turi turėti ne mažiau kaip",
          notInclusive: "turi turėti daugiau kaip"
        }
      }
    },
    set: {
      unit: {
        one: "elementą",
        few: "elementus",
        many: "elementų"
      },
      verb: {
        smaller: {
          inclusive: "turi turėti ne daugiau kaip",
          notInclusive: "turi turėti mažiau kaip"
        },
        bigger: {
          inclusive: "turi turėti ne mažiau kaip",
          notInclusive: "turi turėti daugiau kaip"
        }
      }
    }
  };
  function getSizing(origin, unitType, inclusive, targetShouldBe) {
    const result = Sizable[origin] ?? null;
    if (result === null)
      return result;
    return {
      unit: result.unit[unitType],
      verb: result.verb[targetShouldBe][inclusive ? "inclusive" : "notInclusive"]
    };
  }
  const FormatDictionary = {
    regex: "įvestis",
    email: "el. pašto adresas",
    url: "URL",
    emoji: "jaustukas",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO data ir laikas",
    date: "ISO data",
    time: "ISO laikas",
    duration: "ISO trukmė",
    ipv4: "IPv4 adresas",
    ipv6: "IPv6 adresas",
    cidrv4: "IPv4 tinklo prefiksas (CIDR)",
    cidrv6: "IPv6 tinklo prefiksas (CIDR)",
    base64: "base64 užkoduota eilutė",
    base64url: "base64url užkoduota eilutė",
    json_string: "JSON eilutė",
    e164: "E.164 numeris",
    jwt: "JWT",
    template_literal: "įvestis"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "skaičius",
    bigint: "sveikasis skaičius",
    string: "eilutė",
    boolean: "loginė reikšmė",
    undefined: "neapibrėžta reikšmė",
    function: "funkcija",
    symbol: "simbolis",
    array: "masyvas",
    object: "objektas",
    null: "nulinė reikšmė"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Gautas tipas ${received}, o tikėtasi - instanceof ${issue2.expected}`;
        }
        return `Gautas tipas ${received}, o tikėtasi - ${expected}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Privalo būti ${stringifyPrimitive(issue2.values[0])}`;
        return `Privalo būti vienas iš ${joinValues(issue2.values, "|")} pasirinkimų`;
      case "too_big": {
        const origin = TypeDictionary[issue2.origin] ?? issue2.origin;
        const sizing = getSizing(issue2.origin, getUnitTypeFromNumber(Number(issue2.maximum)), issue2.inclusive ?? false, "smaller");
        if (sizing?.verb)
          return `${capitalizeFirstCharacter(origin ?? issue2.origin ?? "reikšmė")} ${sizing.verb} ${issue2.maximum.toString()} ${sizing.unit ?? "elementų"}`;
        const adj = issue2.inclusive ? "ne didesnis kaip" : "mažesnis kaip";
        return `${capitalizeFirstCharacter(origin ?? issue2.origin ?? "reikšmė")} turi būti ${adj} ${issue2.maximum.toString()} ${sizing?.unit}`;
      }
      case "too_small": {
        const origin = TypeDictionary[issue2.origin] ?? issue2.origin;
        const sizing = getSizing(issue2.origin, getUnitTypeFromNumber(Number(issue2.minimum)), issue2.inclusive ?? false, "bigger");
        if (sizing?.verb)
          return `${capitalizeFirstCharacter(origin ?? issue2.origin ?? "reikšmė")} ${sizing.verb} ${issue2.minimum.toString()} ${sizing.unit ?? "elementų"}`;
        const adj = issue2.inclusive ? "ne mažesnis kaip" : "didesnis kaip";
        return `${capitalizeFirstCharacter(origin ?? issue2.origin ?? "reikšmė")} turi būti ${adj} ${issue2.minimum.toString()} ${sizing?.unit}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Eilutė privalo prasidėti "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Eilutė privalo pasibaigti "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Eilutė privalo įtraukti "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Eilutė privalo atitikti ${_issue.pattern}`;
        return `Neteisingas ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Skaičius privalo būti ${issue2.divisor} kartotinis.`;
      case "unrecognized_keys":
        return `Neatpažint${issue2.keys.length > 1 ? "i" : "as"} rakt${issue2.keys.length > 1 ? "ai" : "as"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return "Rastas klaidingas raktas";
      case "invalid_union":
        return "Klaidinga įvestis";
      case "invalid_element": {
        const origin = TypeDictionary[issue2.origin] ?? issue2.origin;
        return `${capitalizeFirstCharacter(origin ?? issue2.origin ?? "reikšmė")} turi klaidingą įvestį`;
      }
      default:
        return "Klaidinga įvestis";
    }
  };
};
var init_lt = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/mk.js
function mk_default() {
  return {
    localeError: error29()
  };
}
var error29 = () => {
  const Sizable = {
    string: { unit: "знаци", verb: "да имаат" },
    file: { unit: "бајти", verb: "да имаат" },
    array: { unit: "ставки", verb: "да имаат" },
    set: { unit: "ставки", verb: "да имаат" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "внес",
    email: "адреса на е-пошта",
    url: "URL",
    emoji: "емоџи",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO датум и време",
    date: "ISO датум",
    time: "ISO време",
    duration: "ISO времетраење",
    ipv4: "IPv4 адреса",
    ipv6: "IPv6 адреса",
    cidrv4: "IPv4 опсег",
    cidrv6: "IPv6 опсег",
    base64: "base64-енкодирана низа",
    base64url: "base64url-енкодирана низа",
    json_string: "JSON низа",
    e164: "E.164 број",
    jwt: "JWT",
    template_literal: "внес"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "број",
    array: "низа"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Грешен внес: се очекува instanceof ${issue2.expected}, примено ${received}`;
        }
        return `Грешен внес: се очекува ${expected}, примено ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Invalid input: expected ${stringifyPrimitive(issue2.values[0])}`;
        return `Грешана опција: се очекува една ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Премногу голем: се очекува ${issue2.origin ?? "вредноста"} да има ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "елементи"}`;
        return `Премногу голем: се очекува ${issue2.origin ?? "вредноста"} да биде ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Премногу мал: се очекува ${issue2.origin} да има ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Премногу мал: се очекува ${issue2.origin} да биде ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Неважечка низа: мора да започнува со "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Неважечка низа: мора да завршува со "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Неважечка низа: мора да вклучува "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Неважечка низа: мора да одгоара на патернот ${_issue.pattern}`;
        return `Invalid ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Грешен број: мора да биде делив со ${issue2.divisor}`;
      case "unrecognized_keys":
        return `${issue2.keys.length > 1 ? "Непрепознаени клучеви" : "Непрепознаен клуч"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Грешен клуч во ${issue2.origin}`;
      case "invalid_union":
        return "Грешен внес";
      case "invalid_element":
        return `Грешна вредност во ${issue2.origin}`;
      default:
        return `Грешен внес`;
    }
  };
};
var init_mk = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/ms.js
function ms_default() {
  return {
    localeError: error30()
  };
}
var error30 = () => {
  const Sizable = {
    string: { unit: "aksara", verb: "mempunyai" },
    file: { unit: "bait", verb: "mempunyai" },
    array: { unit: "elemen", verb: "mempunyai" },
    set: { unit: "elemen", verb: "mempunyai" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "input",
    email: "alamat e-mel",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "tarikh masa ISO",
    date: "tarikh ISO",
    time: "masa ISO",
    duration: "tempoh ISO",
    ipv4: "alamat IPv4",
    ipv6: "alamat IPv6",
    cidrv4: "julat IPv4",
    cidrv6: "julat IPv6",
    base64: "string dikodkan base64",
    base64url: "string dikodkan base64url",
    json_string: "string JSON",
    e164: "nombor E.164",
    jwt: "JWT",
    template_literal: "input"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "nombor"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Input tidak sah: dijangka instanceof ${issue2.expected}, diterima ${received}`;
        }
        return `Input tidak sah: dijangka ${expected}, diterima ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Input tidak sah: dijangka ${stringifyPrimitive(issue2.values[0])}`;
        return `Pilihan tidak sah: dijangka salah satu daripada ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Terlalu besar: dijangka ${issue2.origin ?? "nilai"} ${sizing.verb} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elemen"}`;
        return `Terlalu besar: dijangka ${issue2.origin ?? "nilai"} adalah ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Terlalu kecil: dijangka ${issue2.origin} ${sizing.verb} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Terlalu kecil: dijangka ${issue2.origin} adalah ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `String tidak sah: mesti bermula dengan "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `String tidak sah: mesti berakhir dengan "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `String tidak sah: mesti mengandungi "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `String tidak sah: mesti sepadan dengan corak ${_issue.pattern}`;
        return `${FormatDictionary[_issue.format] ?? issue2.format} tidak sah`;
      }
      case "not_multiple_of":
        return `Nombor tidak sah: perlu gandaan ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Kunci tidak dikenali: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Kunci tidak sah dalam ${issue2.origin}`;
      case "invalid_union":
        return "Input tidak sah";
      case "invalid_element":
        return `Nilai tidak sah dalam ${issue2.origin}`;
      default:
        return `Input tidak sah`;
    }
  };
};
var init_ms = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/nl.js
function nl_default() {
  return {
    localeError: error31()
  };
}
var error31 = () => {
  const Sizable = {
    string: { unit: "tekens", verb: "heeft" },
    file: { unit: "bytes", verb: "heeft" },
    array: { unit: "elementen", verb: "heeft" },
    set: { unit: "elementen", verb: "heeft" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "invoer",
    email: "emailadres",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO datum en tijd",
    date: "ISO datum",
    time: "ISO tijd",
    duration: "ISO duur",
    ipv4: "IPv4-adres",
    ipv6: "IPv6-adres",
    cidrv4: "IPv4-bereik",
    cidrv6: "IPv6-bereik",
    base64: "base64-gecodeerde tekst",
    base64url: "base64 URL-gecodeerde tekst",
    json_string: "JSON string",
    e164: "E.164-nummer",
    jwt: "JWT",
    template_literal: "invoer"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "getal"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Ongeldige invoer: verwacht instanceof ${issue2.expected}, ontving ${received}`;
        }
        return `Ongeldige invoer: verwacht ${expected}, ontving ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Ongeldige invoer: verwacht ${stringifyPrimitive(issue2.values[0])}`;
        return `Ongeldige optie: verwacht één van ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        const longName = issue2.origin === "date" ? "laat" : issue2.origin === "string" ? "lang" : "groot";
        if (sizing)
          return `Te ${longName}: verwacht dat ${issue2.origin ?? "waarde"} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elementen"} ${sizing.verb}`;
        return `Te ${longName}: verwacht dat ${issue2.origin ?? "waarde"} ${adj}${issue2.maximum.toString()} is`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        const shortName = issue2.origin === "date" ? "vroeg" : issue2.origin === "string" ? "kort" : "klein";
        if (sizing) {
          return `Te ${shortName}: verwacht dat ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit} ${sizing.verb}`;
        }
        return `Te ${shortName}: verwacht dat ${issue2.origin} ${adj}${issue2.minimum.toString()} is`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Ongeldige tekst: moet met "${_issue.prefix}" beginnen`;
        }
        if (_issue.format === "ends_with")
          return `Ongeldige tekst: moet op "${_issue.suffix}" eindigen`;
        if (_issue.format === "includes")
          return `Ongeldige tekst: moet "${_issue.includes}" bevatten`;
        if (_issue.format === "regex")
          return `Ongeldige tekst: moet overeenkomen met patroon ${_issue.pattern}`;
        return `Ongeldig: ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Ongeldig getal: moet een veelvoud van ${issue2.divisor} zijn`;
      case "unrecognized_keys":
        return `Onbekende key${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Ongeldige key in ${issue2.origin}`;
      case "invalid_union":
        return "Ongeldige invoer";
      case "invalid_element":
        return `Ongeldige waarde in ${issue2.origin}`;
      default:
        return `Ongeldige invoer`;
    }
  };
};
var init_nl = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/no.js
function no_default() {
  return {
    localeError: error32()
  };
}
var error32 = () => {
  const Sizable = {
    string: { unit: "tegn", verb: "å ha" },
    file: { unit: "bytes", verb: "å ha" },
    array: { unit: "elementer", verb: "å inneholde" },
    set: { unit: "elementer", verb: "å inneholde" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "input",
    email: "e-postadresse",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO dato- og klokkeslett",
    date: "ISO-dato",
    time: "ISO-klokkeslett",
    duration: "ISO-varighet",
    ipv4: "IPv4-område",
    ipv6: "IPv6-område",
    cidrv4: "IPv4-spekter",
    cidrv6: "IPv6-spekter",
    base64: "base64-enkodet streng",
    base64url: "base64url-enkodet streng",
    json_string: "JSON-streng",
    e164: "E.164-nummer",
    jwt: "JWT",
    template_literal: "input"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "tall",
    array: "liste"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Ugyldig input: forventet instanceof ${issue2.expected}, fikk ${received}`;
        }
        return `Ugyldig input: forventet ${expected}, fikk ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Ugyldig verdi: forventet ${stringifyPrimitive(issue2.values[0])}`;
        return `Ugyldig valg: forventet en av ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `For stor(t): forventet ${issue2.origin ?? "value"} til å ha ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elementer"}`;
        return `For stor(t): forventet ${issue2.origin ?? "value"} til å ha ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `For lite(n): forventet ${issue2.origin} til å ha ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `For lite(n): forventet ${issue2.origin} til å ha ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Ugyldig streng: må starte med "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Ugyldig streng: må ende med "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Ugyldig streng: må inneholde "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Ugyldig streng: må matche mønsteret ${_issue.pattern}`;
        return `Ugyldig ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Ugyldig tall: må være et multiplum av ${issue2.divisor}`;
      case "unrecognized_keys":
        return `${issue2.keys.length > 1 ? "Ukjente nøkler" : "Ukjent nøkkel"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Ugyldig nøkkel i ${issue2.origin}`;
      case "invalid_union":
        return "Ugyldig input";
      case "invalid_element":
        return `Ugyldig verdi i ${issue2.origin}`;
      default:
        return `Ugyldig input`;
    }
  };
};
var init_no = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/ota.js
function ota_default() {
  return {
    localeError: error33()
  };
}
var error33 = () => {
  const Sizable = {
    string: { unit: "harf", verb: "olmalıdır" },
    file: { unit: "bayt", verb: "olmalıdır" },
    array: { unit: "unsur", verb: "olmalıdır" },
    set: { unit: "unsur", verb: "olmalıdır" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "giren",
    email: "epostagâh",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO hengâmı",
    date: "ISO tarihi",
    time: "ISO zamanı",
    duration: "ISO müddeti",
    ipv4: "IPv4 nişânı",
    ipv6: "IPv6 nişânı",
    cidrv4: "IPv4 menzili",
    cidrv6: "IPv6 menzili",
    base64: "base64-şifreli metin",
    base64url: "base64url-şifreli metin",
    json_string: "JSON metin",
    e164: "E.164 sayısı",
    jwt: "JWT",
    template_literal: "giren"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "numara",
    array: "saf",
    null: "gayb"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Fâsit giren: umulan instanceof ${issue2.expected}, alınan ${received}`;
        }
        return `Fâsit giren: umulan ${expected}, alınan ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Fâsit giren: umulan ${stringifyPrimitive(issue2.values[0])}`;
        return `Fâsit tercih: mûteberler ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Fazla büyük: ${issue2.origin ?? "value"}, ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elements"} sahip olmalıydı.`;
        return `Fazla büyük: ${issue2.origin ?? "value"}, ${adj}${issue2.maximum.toString()} olmalıydı.`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Fazla küçük: ${issue2.origin}, ${adj}${issue2.minimum.toString()} ${sizing.unit} sahip olmalıydı.`;
        }
        return `Fazla küçük: ${issue2.origin}, ${adj}${issue2.minimum.toString()} olmalıydı.`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Fâsit metin: "${_issue.prefix}" ile başlamalı.`;
        if (_issue.format === "ends_with")
          return `Fâsit metin: "${_issue.suffix}" ile bitmeli.`;
        if (_issue.format === "includes")
          return `Fâsit metin: "${_issue.includes}" ihtivâ etmeli.`;
        if (_issue.format === "regex")
          return `Fâsit metin: ${_issue.pattern} nakşına uymalı.`;
        return `Fâsit ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Fâsit sayı: ${issue2.divisor} katı olmalıydı.`;
      case "unrecognized_keys":
        return `Tanınmayan anahtar ${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `${issue2.origin} için tanınmayan anahtar var.`;
      case "invalid_union":
        return "Giren tanınamadı.";
      case "invalid_element":
        return `${issue2.origin} için tanınmayan kıymet var.`;
      default:
        return `Kıymet tanınamadı.`;
    }
  };
};
var init_ota = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/ps.js
function ps_default() {
  return {
    localeError: error34()
  };
}
var error34 = () => {
  const Sizable = {
    string: { unit: "توکي", verb: "ولري" },
    file: { unit: "بایټس", verb: "ولري" },
    array: { unit: "توکي", verb: "ولري" },
    set: { unit: "توکي", verb: "ولري" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "ورودي",
    email: "بریښنالیک",
    url: "یو آر ال",
    emoji: "ایموجي",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "نیټه او وخت",
    date: "نېټه",
    time: "وخت",
    duration: "موده",
    ipv4: "د IPv4 پته",
    ipv6: "د IPv6 پته",
    cidrv4: "د IPv4 ساحه",
    cidrv6: "د IPv6 ساحه",
    base64: "base64-encoded متن",
    base64url: "base64url-encoded متن",
    json_string: "JSON متن",
    e164: "د E.164 شمېره",
    jwt: "JWT",
    template_literal: "ورودي"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "عدد",
    array: "ارې"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `ناسم ورودي: باید instanceof ${issue2.expected} وای, مګر ${received} ترلاسه شو`;
        }
        return `ناسم ورودي: باید ${expected} وای, مګر ${received} ترلاسه شو`;
      }
      case "invalid_value":
        if (issue2.values.length === 1) {
          return `ناسم ورودي: باید ${stringifyPrimitive(issue2.values[0])} وای`;
        }
        return `ناسم انتخاب: باید یو له ${joinValues(issue2.values, "|")} څخه وای`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `ډیر لوی: ${issue2.origin ?? "ارزښت"} باید ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "عنصرونه"} ولري`;
        }
        return `ډیر لوی: ${issue2.origin ?? "ارزښت"} باید ${adj}${issue2.maximum.toString()} وي`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `ډیر کوچنی: ${issue2.origin} باید ${adj}${issue2.minimum.toString()} ${sizing.unit} ولري`;
        }
        return `ډیر کوچنی: ${issue2.origin} باید ${adj}${issue2.minimum.toString()} وي`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `ناسم متن: باید د "${_issue.prefix}" سره پیل شي`;
        }
        if (_issue.format === "ends_with") {
          return `ناسم متن: باید د "${_issue.suffix}" سره پای ته ورسيږي`;
        }
        if (_issue.format === "includes") {
          return `ناسم متن: باید "${_issue.includes}" ولري`;
        }
        if (_issue.format === "regex") {
          return `ناسم متن: باید د ${_issue.pattern} سره مطابقت ولري`;
        }
        return `${FormatDictionary[_issue.format] ?? issue2.format} ناسم دی`;
      }
      case "not_multiple_of":
        return `ناسم عدد: باید د ${issue2.divisor} مضرب وي`;
      case "unrecognized_keys":
        return `ناسم ${issue2.keys.length > 1 ? "کلیډونه" : "کلیډ"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `ناسم کلیډ په ${issue2.origin} کې`;
      case "invalid_union":
        return `ناسمه ورودي`;
      case "invalid_element":
        return `ناسم عنصر په ${issue2.origin} کې`;
      default:
        return `ناسمه ورودي`;
    }
  };
};
var init_ps = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/pl.js
function pl_default() {
  return {
    localeError: error35()
  };
}
var error35 = () => {
  const Sizable = {
    string: { unit: "znaków", verb: "mieć" },
    file: { unit: "bajtów", verb: "mieć" },
    array: { unit: "elementów", verb: "mieć" },
    set: { unit: "elementów", verb: "mieć" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "wyrażenie",
    email: "adres email",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "data i godzina w formacie ISO",
    date: "data w formacie ISO",
    time: "godzina w formacie ISO",
    duration: "czas trwania ISO",
    ipv4: "adres IPv4",
    ipv6: "adres IPv6",
    cidrv4: "zakres IPv4",
    cidrv6: "zakres IPv6",
    base64: "ciąg znaków zakodowany w formacie base64",
    base64url: "ciąg znaków zakodowany w formacie base64url",
    json_string: "ciąg znaków w formacie JSON",
    e164: "liczba E.164",
    jwt: "JWT",
    template_literal: "wejście"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "liczba",
    array: "tablica"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Nieprawidłowe dane wejściowe: oczekiwano instanceof ${issue2.expected}, otrzymano ${received}`;
        }
        return `Nieprawidłowe dane wejściowe: oczekiwano ${expected}, otrzymano ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Nieprawidłowe dane wejściowe: oczekiwano ${stringifyPrimitive(issue2.values[0])}`;
        return `Nieprawidłowa opcja: oczekiwano jednej z wartości ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Za duża wartość: oczekiwano, że ${issue2.origin ?? "wartość"} będzie mieć ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elementów"}`;
        }
        return `Zbyt duż(y/a/e): oczekiwano, że ${issue2.origin ?? "wartość"} będzie wynosić ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Za mała wartość: oczekiwano, że ${issue2.origin ?? "wartość"} będzie mieć ${adj}${issue2.minimum.toString()} ${sizing.unit ?? "elementów"}`;
        }
        return `Zbyt mał(y/a/e): oczekiwano, że ${issue2.origin ?? "wartość"} będzie wynosić ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Nieprawidłowy ciąg znaków: musi zaczynać się od "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Nieprawidłowy ciąg znaków: musi kończyć się na "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Nieprawidłowy ciąg znaków: musi zawierać "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Nieprawidłowy ciąg znaków: musi odpowiadać wzorcowi ${_issue.pattern}`;
        return `Nieprawidłow(y/a/e) ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Nieprawidłowa liczba: musi być wielokrotnością ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Nierozpoznane klucze${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Nieprawidłowy klucz w ${issue2.origin}`;
      case "invalid_union":
        return "Nieprawidłowe dane wejściowe";
      case "invalid_element":
        return `Nieprawidłowa wartość w ${issue2.origin}`;
      default:
        return `Nieprawidłowe dane wejściowe`;
    }
  };
};
var init_pl = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/pt.js
function pt_default() {
  return {
    localeError: error36()
  };
}
var error36 = () => {
  const Sizable = {
    string: { unit: "caracteres", verb: "ter" },
    file: { unit: "bytes", verb: "ter" },
    array: { unit: "itens", verb: "ter" },
    set: { unit: "itens", verb: "ter" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "padrão",
    email: "endereço de e-mail",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "data e hora ISO",
    date: "data ISO",
    time: "hora ISO",
    duration: "duração ISO",
    ipv4: "endereço IPv4",
    ipv6: "endereço IPv6",
    cidrv4: "faixa de IPv4",
    cidrv6: "faixa de IPv6",
    base64: "texto codificado em base64",
    base64url: "URL codificada em base64",
    json_string: "texto JSON",
    e164: "número E.164",
    jwt: "JWT",
    template_literal: "entrada"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "número",
    null: "nulo"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Tipo inválido: esperado instanceof ${issue2.expected}, recebido ${received}`;
        }
        return `Tipo inválido: esperado ${expected}, recebido ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Entrada inválida: esperado ${stringifyPrimitive(issue2.values[0])}`;
        return `Opção inválida: esperada uma das ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Muito grande: esperado que ${issue2.origin ?? "valor"} tivesse ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elementos"}`;
        return `Muito grande: esperado que ${issue2.origin ?? "valor"} fosse ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Muito pequeno: esperado que ${issue2.origin} tivesse ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Muito pequeno: esperado que ${issue2.origin} fosse ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Texto inválido: deve começar com "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Texto inválido: deve terminar com "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Texto inválido: deve incluir "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Texto inválido: deve corresponder ao padrão ${_issue.pattern}`;
        return `${FormatDictionary[_issue.format] ?? issue2.format} inválido`;
      }
      case "not_multiple_of":
        return `Número inválido: deve ser múltiplo de ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Chave${issue2.keys.length > 1 ? "s" : ""} desconhecida${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Chave inválida em ${issue2.origin}`;
      case "invalid_union":
        return "Entrada inválida";
      case "invalid_element":
        return `Valor inválido em ${issue2.origin}`;
      default:
        return `Campo inválido`;
    }
  };
};
var init_pt = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/ro.js
function ro_default() {
  return {
    localeError: error37()
  };
}
var error37 = () => {
  const Sizable = {
    string: { unit: "caractere", verb: "să aibă" },
    file: { unit: "octeți", verb: "să aibă" },
    array: { unit: "elemente", verb: "să aibă" },
    set: { unit: "elemente", verb: "să aibă" },
    map: { unit: "intrări", verb: "să aibă" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "intrare",
    email: "adresă de email",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "dată și oră ISO",
    date: "dată ISO",
    time: "oră ISO",
    duration: "durată ISO",
    ipv4: "adresă IPv4",
    ipv6: "adresă IPv6",
    mac: "adresă MAC",
    cidrv4: "interval IPv4",
    cidrv6: "interval IPv6",
    base64: "șir codat base64",
    base64url: "șir codat base64url",
    json_string: "șir JSON",
    e164: "număr E.164",
    jwt: "JWT",
    template_literal: "intrare"
  };
  const TypeDictionary = {
    nan: "NaN",
    string: "șir",
    number: "număr",
    boolean: "boolean",
    function: "funcție",
    array: "matrice",
    object: "obiect",
    undefined: "nedefinit",
    symbol: "simbol",
    bigint: "număr mare",
    void: "void",
    never: "never",
    map: "hartă",
    set: "set"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        return `Intrare invalidă: așteptat ${expected}, primit ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Intrare invalidă: așteptat ${stringifyPrimitive(issue2.values[0])}`;
        return `Opțiune invalidă: așteptat una dintre ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Prea mare: așteptat ca ${issue2.origin ?? "valoarea"} ${sizing.verb} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elemente"}`;
        return `Prea mare: așteptat ca ${issue2.origin ?? "valoarea"} să fie ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Prea mic: așteptat ca ${issue2.origin} ${sizing.verb} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Prea mic: așteptat ca ${issue2.origin} să fie ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Șir invalid: trebuie să înceapă cu "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Șir invalid: trebuie să se termine cu "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Șir invalid: trebuie să includă "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Șir invalid: trebuie să se potrivească cu modelul ${_issue.pattern}`;
        return `Format invalid: ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Număr invalid: trebuie să fie multiplu de ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Chei nerecunoscute: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Cheie invalidă în ${issue2.origin}`;
      case "invalid_union":
        return "Intrare invalidă";
      case "invalid_element":
        return `Valoare invalidă în ${issue2.origin}`;
      default:
        return `Intrare invalidă`;
    }
  };
};
var init_ro = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/ru.js
function getRussianPlural(count, one, few, many) {
  const absCount = Math.abs(count);
  const lastDigit = absCount % 10;
  const lastTwoDigits = absCount % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return many;
  }
  if (lastDigit === 1) {
    return one;
  }
  if (lastDigit >= 2 && lastDigit <= 4) {
    return few;
  }
  return many;
}
function ru_default() {
  return {
    localeError: error38()
  };
}
var error38 = () => {
  const Sizable = {
    string: {
      unit: {
        one: "символ",
        few: "символа",
        many: "символов"
      },
      verb: "иметь"
    },
    file: {
      unit: {
        one: "байт",
        few: "байта",
        many: "байт"
      },
      verb: "иметь"
    },
    array: {
      unit: {
        one: "элемент",
        few: "элемента",
        many: "элементов"
      },
      verb: "иметь"
    },
    set: {
      unit: {
        one: "элемент",
        few: "элемента",
        many: "элементов"
      },
      verb: "иметь"
    }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "ввод",
    email: "email адрес",
    url: "URL",
    emoji: "эмодзи",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO дата и время",
    date: "ISO дата",
    time: "ISO время",
    duration: "ISO длительность",
    ipv4: "IPv4 адрес",
    ipv6: "IPv6 адрес",
    cidrv4: "IPv4 диапазон",
    cidrv6: "IPv6 диапазон",
    base64: "строка в формате base64",
    base64url: "строка в формате base64url",
    json_string: "JSON строка",
    e164: "номер E.164",
    jwt: "JWT",
    template_literal: "ввод"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "число",
    array: "массив"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Неверный ввод: ожидалось instanceof ${issue2.expected}, получено ${received}`;
        }
        return `Неверный ввод: ожидалось ${expected}, получено ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Неверный ввод: ожидалось ${stringifyPrimitive(issue2.values[0])}`;
        return `Неверный вариант: ожидалось одно из ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          const maxValue = Number(issue2.maximum);
          const unit = getRussianPlural(maxValue, sizing.unit.one, sizing.unit.few, sizing.unit.many);
          return `Слишком большое значение: ожидалось, что ${issue2.origin ?? "значение"} будет иметь ${adj}${issue2.maximum.toString()} ${unit}`;
        }
        return `Слишком большое значение: ожидалось, что ${issue2.origin ?? "значение"} будет ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          const minValue = Number(issue2.minimum);
          const unit = getRussianPlural(minValue, sizing.unit.one, sizing.unit.few, sizing.unit.many);
          return `Слишком маленькое значение: ожидалось, что ${issue2.origin} будет иметь ${adj}${issue2.minimum.toString()} ${unit}`;
        }
        return `Слишком маленькое значение: ожидалось, что ${issue2.origin} будет ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Неверная строка: должна начинаться с "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Неверная строка: должна заканчиваться на "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Неверная строка: должна содержать "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Неверная строка: должна соответствовать шаблону ${_issue.pattern}`;
        return `Неверный ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Неверное число: должно быть кратным ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Нераспознанн${issue2.keys.length > 1 ? "ые" : "ый"} ключ${issue2.keys.length > 1 ? "и" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Неверный ключ в ${issue2.origin}`;
      case "invalid_union":
        return "Неверные входные данные";
      case "invalid_element":
        return `Неверное значение в ${issue2.origin}`;
      default:
        return `Неверные входные данные`;
    }
  };
};
var init_ru = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/sl.js
function sl_default() {
  return {
    localeError: error39()
  };
}
var error39 = () => {
  const Sizable = {
    string: { unit: "znakov", verb: "imeti" },
    file: { unit: "bajtov", verb: "imeti" },
    array: { unit: "elementov", verb: "imeti" },
    set: { unit: "elementov", verb: "imeti" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "vnos",
    email: "e-poštni naslov",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO datum in čas",
    date: "ISO datum",
    time: "ISO čas",
    duration: "ISO trajanje",
    ipv4: "IPv4 naslov",
    ipv6: "IPv6 naslov",
    cidrv4: "obseg IPv4",
    cidrv6: "obseg IPv6",
    base64: "base64 kodiran niz",
    base64url: "base64url kodiran niz",
    json_string: "JSON niz",
    e164: "E.164 številka",
    jwt: "JWT",
    template_literal: "vnos"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "število",
    array: "tabela"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Neveljaven vnos: pričakovano instanceof ${issue2.expected}, prejeto ${received}`;
        }
        return `Neveljaven vnos: pričakovano ${expected}, prejeto ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Neveljaven vnos: pričakovano ${stringifyPrimitive(issue2.values[0])}`;
        return `Neveljavna možnost: pričakovano eno izmed ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Preveliko: pričakovano, da bo ${issue2.origin ?? "vrednost"} imelo ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elementov"}`;
        return `Preveliko: pričakovano, da bo ${issue2.origin ?? "vrednost"} ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Premajhno: pričakovano, da bo ${issue2.origin} imelo ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Premajhno: pričakovano, da bo ${issue2.origin} ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Neveljaven niz: mora se začeti z "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Neveljaven niz: mora se končati z "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Neveljaven niz: mora vsebovati "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Neveljaven niz: mora ustrezati vzorcu ${_issue.pattern}`;
        return `Neveljaven ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Neveljavno število: mora biti večkratnik ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Neprepoznan${issue2.keys.length > 1 ? "i ključi" : " ključ"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Neveljaven ključ v ${issue2.origin}`;
      case "invalid_union":
        return "Neveljaven vnos";
      case "invalid_element":
        return `Neveljavna vrednost v ${issue2.origin}`;
      default:
        return "Neveljaven vnos";
    }
  };
};
var init_sl = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/sv.js
function sv_default() {
  return {
    localeError: error40()
  };
}
var error40 = () => {
  const Sizable = {
    string: { unit: "tecken", verb: "att ha" },
    file: { unit: "bytes", verb: "att ha" },
    array: { unit: "objekt", verb: "att innehålla" },
    set: { unit: "objekt", verb: "att innehålla" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "reguljärt uttryck",
    email: "e-postadress",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO-datum och tid",
    date: "ISO-datum",
    time: "ISO-tid",
    duration: "ISO-varaktighet",
    ipv4: "IPv4-intervall",
    ipv6: "IPv6-intervall",
    cidrv4: "IPv4-spektrum",
    cidrv6: "IPv6-spektrum",
    base64: "base64-kodad sträng",
    base64url: "base64url-kodad sträng",
    json_string: "JSON-sträng",
    e164: "E.164-nummer",
    jwt: "JWT",
    template_literal: "mall-literal"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "antal",
    array: "lista"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Ogiltig inmatning: förväntat instanceof ${issue2.expected}, fick ${received}`;
        }
        return `Ogiltig inmatning: förväntat ${expected}, fick ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Ogiltig inmatning: förväntat ${stringifyPrimitive(issue2.values[0])}`;
        return `Ogiltigt val: förväntade en av ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `För stor(t): förväntade ${issue2.origin ?? "värdet"} att ha ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "element"}`;
        }
        return `För stor(t): förväntat ${issue2.origin ?? "värdet"} att ha ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `För lite(t): förväntade ${issue2.origin ?? "värdet"} att ha ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `För lite(t): förväntade ${issue2.origin ?? "värdet"} att ha ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Ogiltig sträng: måste börja med "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Ogiltig sträng: måste sluta med "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Ogiltig sträng: måste innehålla "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Ogiltig sträng: måste matcha mönstret "${_issue.pattern}"`;
        return `Ogiltig(t) ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Ogiltigt tal: måste vara en multipel av ${issue2.divisor}`;
      case "unrecognized_keys":
        return `${issue2.keys.length > 1 ? "Okända nycklar" : "Okänd nyckel"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Ogiltig nyckel i ${issue2.origin ?? "värdet"}`;
      case "invalid_union":
        return "Ogiltig input";
      case "invalid_element":
        return `Ogiltigt värde i ${issue2.origin ?? "värdet"}`;
      default:
        return `Ogiltig input`;
    }
  };
};
var init_sv = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/ta.js
function ta_default() {
  return {
    localeError: error41()
  };
}
var error41 = () => {
  const Sizable = {
    string: { unit: "எழுத்துக்கள்", verb: "கொண்டிருக்க வேண்டும்" },
    file: { unit: "பைட்டுகள்", verb: "கொண்டிருக்க வேண்டும்" },
    array: { unit: "உறுப்புகள்", verb: "கொண்டிருக்க வேண்டும்" },
    set: { unit: "உறுப்புகள்", verb: "கொண்டிருக்க வேண்டும்" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "உள்ளீடு",
    email: "மின்னஞ்சல் முகவரி",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO தேதி நேரம்",
    date: "ISO தேதி",
    time: "ISO நேரம்",
    duration: "ISO கால அளவு",
    ipv4: "IPv4 முகவரி",
    ipv6: "IPv6 முகவரி",
    cidrv4: "IPv4 வரம்பு",
    cidrv6: "IPv6 வரம்பு",
    base64: "base64-encoded சரம்",
    base64url: "base64url-encoded சரம்",
    json_string: "JSON சரம்",
    e164: "E.164 எண்",
    jwt: "JWT",
    template_literal: "input"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "எண்",
    array: "அணி",
    null: "வெறுமை"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `தவறான உள்ளீடு: எதிர்பார்க்கப்பட்டது instanceof ${issue2.expected}, பெறப்பட்டது ${received}`;
        }
        return `தவறான உள்ளீடு: எதிர்பார்க்கப்பட்டது ${expected}, பெறப்பட்டது ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `தவறான உள்ளீடு: எதிர்பார்க்கப்பட்டது ${stringifyPrimitive(issue2.values[0])}`;
        return `தவறான விருப்பம்: எதிர்பார்க்கப்பட்டது ${joinValues(issue2.values, "|")} இல் ஒன்று`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `மிக பெரியது: எதிர்பார்க்கப்பட்டது ${issue2.origin ?? "மதிப்பு"} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "உறுப்புகள்"} ஆக இருக்க வேண்டும்`;
        }
        return `மிக பெரியது: எதிர்பார்க்கப்பட்டது ${issue2.origin ?? "மதிப்பு"} ${adj}${issue2.maximum.toString()} ஆக இருக்க வேண்டும்`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `மிகச் சிறியது: எதிர்பார்க்கப்பட்டது ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit} ஆக இருக்க வேண்டும்`;
        }
        return `மிகச் சிறியது: எதிர்பார்க்கப்பட்டது ${issue2.origin} ${adj}${issue2.minimum.toString()} ஆக இருக்க வேண்டும்`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `தவறான சரம்: "${_issue.prefix}" இல் தொடங்க வேண்டும்`;
        if (_issue.format === "ends_with")
          return `தவறான சரம்: "${_issue.suffix}" இல் முடிவடைய வேண்டும்`;
        if (_issue.format === "includes")
          return `தவறான சரம்: "${_issue.includes}" ஐ உள்ளடக்க வேண்டும்`;
        if (_issue.format === "regex")
          return `தவறான சரம்: ${_issue.pattern} முறைபாட்டுடன் பொருந்த வேண்டும்`;
        return `தவறான ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `தவறான எண்: ${issue2.divisor} இன் பலமாக இருக்க வேண்டும்`;
      case "unrecognized_keys":
        return `அடையாளம் தெரியாத விசை${issue2.keys.length > 1 ? "கள்" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `${issue2.origin} இல் தவறான விசை`;
      case "invalid_union":
        return "தவறான உள்ளீடு";
      case "invalid_element":
        return `${issue2.origin} இல் தவறான மதிப்பு`;
      default:
        return `தவறான உள்ளீடு`;
    }
  };
};
var init_ta = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/th.js
function th_default() {
  return {
    localeError: error42()
  };
}
var error42 = () => {
  const Sizable = {
    string: { unit: "ตัวอักษร", verb: "ควรมี" },
    file: { unit: "ไบต์", verb: "ควรมี" },
    array: { unit: "รายการ", verb: "ควรมี" },
    set: { unit: "รายการ", verb: "ควรมี" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "ข้อมูลที่ป้อน",
    email: "ที่อยู่อีเมล",
    url: "URL",
    emoji: "อิโมจิ",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "วันที่เวลาแบบ ISO",
    date: "วันที่แบบ ISO",
    time: "เวลาแบบ ISO",
    duration: "ช่วงเวลาแบบ ISO",
    ipv4: "ที่อยู่ IPv4",
    ipv6: "ที่อยู่ IPv6",
    cidrv4: "ช่วง IP แบบ IPv4",
    cidrv6: "ช่วง IP แบบ IPv6",
    base64: "ข้อความแบบ Base64",
    base64url: "ข้อความแบบ Base64 สำหรับ URL",
    json_string: "ข้อความแบบ JSON",
    e164: "เบอร์โทรศัพท์ระหว่างประเทศ (E.164)",
    jwt: "โทเคน JWT",
    template_literal: "ข้อมูลที่ป้อน"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "ตัวเลข",
    array: "อาร์เรย์ (Array)",
    null: "ไม่มีค่า (null)"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `ประเภทข้อมูลไม่ถูกต้อง: ควรเป็น instanceof ${issue2.expected} แต่ได้รับ ${received}`;
        }
        return `ประเภทข้อมูลไม่ถูกต้อง: ควรเป็น ${expected} แต่ได้รับ ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `ค่าไม่ถูกต้อง: ควรเป็น ${stringifyPrimitive(issue2.values[0])}`;
        return `ตัวเลือกไม่ถูกต้อง: ควรเป็นหนึ่งใน ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "ไม่เกิน" : "น้อยกว่า";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `เกินกำหนด: ${issue2.origin ?? "ค่า"} ควรมี${adj} ${issue2.maximum.toString()} ${sizing.unit ?? "รายการ"}`;
        return `เกินกำหนด: ${issue2.origin ?? "ค่า"} ควรมี${adj} ${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? "อย่างน้อย" : "มากกว่า";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `น้อยกว่ากำหนด: ${issue2.origin} ควรมี${adj} ${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `น้อยกว่ากำหนด: ${issue2.origin} ควรมี${adj} ${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `รูปแบบไม่ถูกต้อง: ข้อความต้องขึ้นต้นด้วย "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `รูปแบบไม่ถูกต้อง: ข้อความต้องลงท้ายด้วย "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `รูปแบบไม่ถูกต้อง: ข้อความต้องมี "${_issue.includes}" อยู่ในข้อความ`;
        if (_issue.format === "regex")
          return `รูปแบบไม่ถูกต้อง: ต้องตรงกับรูปแบบที่กำหนด ${_issue.pattern}`;
        return `รูปแบบไม่ถูกต้อง: ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `ตัวเลขไม่ถูกต้อง: ต้องเป็นจำนวนที่หารด้วย ${issue2.divisor} ได้ลงตัว`;
      case "unrecognized_keys":
        return `พบคีย์ที่ไม่รู้จัก: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `คีย์ไม่ถูกต้องใน ${issue2.origin}`;
      case "invalid_union":
        return "ข้อมูลไม่ถูกต้อง: ไม่ตรงกับรูปแบบยูเนียนที่กำหนดไว้";
      case "invalid_element":
        return `ข้อมูลไม่ถูกต้องใน ${issue2.origin}`;
      default:
        return `ข้อมูลไม่ถูกต้อง`;
    }
  };
};
var init_th = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/tr.js
function tr_default() {
  return {
    localeError: error43()
  };
}
var error43 = () => {
  const Sizable = {
    string: { unit: "karakter", verb: "olmalı" },
    file: { unit: "bayt", verb: "olmalı" },
    array: { unit: "öğe", verb: "olmalı" },
    set: { unit: "öğe", verb: "olmalı" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "girdi",
    email: "e-posta adresi",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO tarih ve saat",
    date: "ISO tarih",
    time: "ISO saat",
    duration: "ISO süre",
    ipv4: "IPv4 adresi",
    ipv6: "IPv6 adresi",
    cidrv4: "IPv4 aralığı",
    cidrv6: "IPv6 aralığı",
    base64: "base64 ile şifrelenmiş metin",
    base64url: "base64url ile şifrelenmiş metin",
    json_string: "JSON dizesi",
    e164: "E.164 sayısı",
    jwt: "JWT",
    template_literal: "Şablon dizesi"
  };
  const TypeDictionary = {
    nan: "NaN"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Geçersiz değer: beklenen instanceof ${issue2.expected}, alınan ${received}`;
        }
        return `Geçersiz değer: beklenen ${expected}, alınan ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Geçersiz değer: beklenen ${stringifyPrimitive(issue2.values[0])}`;
        return `Geçersiz seçenek: aşağıdakilerden biri olmalı: ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Çok büyük: beklenen ${issue2.origin ?? "değer"} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "öğe"}`;
        return `Çok büyük: beklenen ${issue2.origin ?? "değer"} ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Çok küçük: beklenen ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        return `Çok küçük: beklenen ${issue2.origin} ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Geçersiz metin: "${_issue.prefix}" ile başlamalı`;
        if (_issue.format === "ends_with")
          return `Geçersiz metin: "${_issue.suffix}" ile bitmeli`;
        if (_issue.format === "includes")
          return `Geçersiz metin: "${_issue.includes}" içermeli`;
        if (_issue.format === "regex")
          return `Geçersiz metin: ${_issue.pattern} desenine uymalı`;
        return `Geçersiz ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Geçersiz sayı: ${issue2.divisor} ile tam bölünebilmeli`;
      case "unrecognized_keys":
        return `Tanınmayan anahtar${issue2.keys.length > 1 ? "lar" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `${issue2.origin} içinde geçersiz anahtar`;
      case "invalid_union":
        return "Geçersiz değer";
      case "invalid_element":
        return `${issue2.origin} içinde geçersiz değer`;
      default:
        return `Geçersiz değer`;
    }
  };
};
var init_tr = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/uk.js
function uk_default() {
  return {
    localeError: error44()
  };
}
var error44 = () => {
  const Sizable = {
    string: { unit: "символів", verb: "матиме" },
    file: { unit: "байтів", verb: "матиме" },
    array: { unit: "елементів", verb: "матиме" },
    set: { unit: "елементів", verb: "матиме" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "вхідні дані",
    email: "адреса електронної пошти",
    url: "URL",
    emoji: "емодзі",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "дата та час ISO",
    date: "дата ISO",
    time: "час ISO",
    duration: "тривалість ISO",
    ipv4: "адреса IPv4",
    ipv6: "адреса IPv6",
    cidrv4: "діапазон IPv4",
    cidrv6: "діапазон IPv6",
    base64: "рядок у кодуванні base64",
    base64url: "рядок у кодуванні base64url",
    json_string: "рядок JSON",
    e164: "номер E.164",
    jwt: "JWT",
    template_literal: "вхідні дані"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "число",
    array: "масив"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Неправильні вхідні дані: очікується instanceof ${issue2.expected}, отримано ${received}`;
        }
        return `Неправильні вхідні дані: очікується ${expected}, отримано ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Неправильні вхідні дані: очікується ${stringifyPrimitive(issue2.values[0])}`;
        return `Неправильна опція: очікується одне з ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Занадто велике: очікується, що ${issue2.origin ?? "значення"} ${sizing.verb} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "елементів"}`;
        return `Занадто велике: очікується, що ${issue2.origin ?? "значення"} буде ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Занадто мале: очікується, що ${issue2.origin} ${sizing.verb} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Занадто мале: очікується, що ${issue2.origin} буде ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Неправильний рядок: повинен починатися з "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Неправильний рядок: повинен закінчуватися на "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Неправильний рядок: повинен містити "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Неправильний рядок: повинен відповідати шаблону ${_issue.pattern}`;
        return `Неправильний ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Неправильне число: повинно бути кратним ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Нерозпізнаний ключ${issue2.keys.length > 1 ? "і" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Неправильний ключ у ${issue2.origin}`;
      case "invalid_union":
        return "Неправильні вхідні дані";
      case "invalid_element":
        return `Неправильне значення у ${issue2.origin}`;
      default:
        return `Неправильні вхідні дані`;
    }
  };
};
var init_uk = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/ua.js
function ua_default() {
  return uk_default();
}
var init_ua = __esm(() => {
  init_uk();
});

// node_modules/zod/v4/locales/ur.js
function ur_default() {
  return {
    localeError: error45()
  };
}
var error45 = () => {
  const Sizable = {
    string: { unit: "حروف", verb: "ہونا" },
    file: { unit: "بائٹس", verb: "ہونا" },
    array: { unit: "آئٹمز", verb: "ہونا" },
    set: { unit: "آئٹمز", verb: "ہونا" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "ان پٹ",
    email: "ای میل ایڈریس",
    url: "یو آر ایل",
    emoji: "ایموجی",
    uuid: "یو یو آئی ڈی",
    uuidv4: "یو یو آئی ڈی وی 4",
    uuidv6: "یو یو آئی ڈی وی 6",
    nanoid: "نینو آئی ڈی",
    guid: "جی یو آئی ڈی",
    cuid: "سی یو آئی ڈی",
    cuid2: "سی یو آئی ڈی 2",
    ulid: "یو ایل آئی ڈی",
    xid: "ایکس آئی ڈی",
    ksuid: "کے ایس یو آئی ڈی",
    datetime: "آئی ایس او ڈیٹ ٹائم",
    date: "آئی ایس او تاریخ",
    time: "آئی ایس او وقت",
    duration: "آئی ایس او مدت",
    ipv4: "آئی پی وی 4 ایڈریس",
    ipv6: "آئی پی وی 6 ایڈریس",
    cidrv4: "آئی پی وی 4 رینج",
    cidrv6: "آئی پی وی 6 رینج",
    base64: "بیس 64 ان کوڈڈ سٹرنگ",
    base64url: "بیس 64 یو آر ایل ان کوڈڈ سٹرنگ",
    json_string: "جے ایس او این سٹرنگ",
    e164: "ای 164 نمبر",
    jwt: "جے ڈبلیو ٹی",
    template_literal: "ان پٹ"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "نمبر",
    array: "آرے",
    null: "نل"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `غلط ان پٹ: instanceof ${issue2.expected} متوقع تھا، ${received} موصول ہوا`;
        }
        return `غلط ان پٹ: ${expected} متوقع تھا، ${received} موصول ہوا`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `غلط ان پٹ: ${stringifyPrimitive(issue2.values[0])} متوقع تھا`;
        return `غلط آپشن: ${joinValues(issue2.values, "|")} میں سے ایک متوقع تھا`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `بہت بڑا: ${issue2.origin ?? "ویلیو"} کے ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "عناصر"} ہونے متوقع تھے`;
        return `بہت بڑا: ${issue2.origin ?? "ویلیو"} کا ${adj}${issue2.maximum.toString()} ہونا متوقع تھا`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `بہت چھوٹا: ${issue2.origin} کے ${adj}${issue2.minimum.toString()} ${sizing.unit} ہونے متوقع تھے`;
        }
        return `بہت چھوٹا: ${issue2.origin} کا ${adj}${issue2.minimum.toString()} ہونا متوقع تھا`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `غلط سٹرنگ: "${_issue.prefix}" سے شروع ہونا چاہیے`;
        }
        if (_issue.format === "ends_with")
          return `غلط سٹرنگ: "${_issue.suffix}" پر ختم ہونا چاہیے`;
        if (_issue.format === "includes")
          return `غلط سٹرنگ: "${_issue.includes}" شامل ہونا چاہیے`;
        if (_issue.format === "regex")
          return `غلط سٹرنگ: پیٹرن ${_issue.pattern} سے میچ ہونا چاہیے`;
        return `غلط ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `غلط نمبر: ${issue2.divisor} کا مضاعف ہونا چاہیے`;
      case "unrecognized_keys":
        return `غیر تسلیم شدہ کی${issue2.keys.length > 1 ? "ز" : ""}: ${joinValues(issue2.keys, "، ")}`;
      case "invalid_key":
        return `${issue2.origin} میں غلط کی`;
      case "invalid_union":
        return "غلط ان پٹ";
      case "invalid_element":
        return `${issue2.origin} میں غلط ویلیو`;
      default:
        return `غلط ان پٹ`;
    }
  };
};
var init_ur = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/uz.js
function uz_default() {
  return {
    localeError: error46()
  };
}
var error46 = () => {
  const Sizable = {
    string: { unit: "belgi", verb: "bo‘lishi kerak" },
    file: { unit: "bayt", verb: "bo‘lishi kerak" },
    array: { unit: "element", verb: "bo‘lishi kerak" },
    set: { unit: "element", verb: "bo‘lishi kerak" },
    map: { unit: "yozuv", verb: "bo‘lishi kerak" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "kirish",
    email: "elektron pochta manzili",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO sana va vaqti",
    date: "ISO sana",
    time: "ISO vaqt",
    duration: "ISO davomiylik",
    ipv4: "IPv4 manzil",
    ipv6: "IPv6 manzil",
    mac: "MAC manzil",
    cidrv4: "IPv4 diapazon",
    cidrv6: "IPv6 diapazon",
    base64: "base64 kodlangan satr",
    base64url: "base64url kodlangan satr",
    json_string: "JSON satr",
    e164: "E.164 raqam",
    jwt: "JWT",
    template_literal: "kirish"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "raqam",
    array: "massiv"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Noto‘g‘ri kirish: kutilgan instanceof ${issue2.expected}, qabul qilingan ${received}`;
        }
        return `Noto‘g‘ri kirish: kutilgan ${expected}, qabul qilingan ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Noto‘g‘ri kirish: kutilgan ${stringifyPrimitive(issue2.values[0])}`;
        return `Noto‘g‘ri variant: quyidagilardan biri kutilgan ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Juda katta: kutilgan ${issue2.origin ?? "qiymat"} ${adj}${issue2.maximum.toString()} ${sizing.unit} ${sizing.verb}`;
        return `Juda katta: kutilgan ${issue2.origin ?? "qiymat"} ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Juda kichik: kutilgan ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit} ${sizing.verb}`;
        }
        return `Juda kichik: kutilgan ${issue2.origin} ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Noto‘g‘ri satr: "${_issue.prefix}" bilan boshlanishi kerak`;
        if (_issue.format === "ends_with")
          return `Noto‘g‘ri satr: "${_issue.suffix}" bilan tugashi kerak`;
        if (_issue.format === "includes")
          return `Noto‘g‘ri satr: "${_issue.includes}" ni o‘z ichiga olishi kerak`;
        if (_issue.format === "regex")
          return `Noto‘g‘ri satr: ${_issue.pattern} shabloniga mos kelishi kerak`;
        return `Noto‘g‘ri ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Noto‘g‘ri raqam: ${issue2.divisor} ning karralisi bo‘lishi kerak`;
      case "unrecognized_keys":
        return `Noma’lum kalit${issue2.keys.length > 1 ? "lar" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `${issue2.origin} dagi kalit noto‘g‘ri`;
      case "invalid_union":
        return "Noto‘g‘ri kirish";
      case "invalid_element":
        return `${issue2.origin} da noto‘g‘ri qiymat`;
      default:
        return `Noto‘g‘ri kirish`;
    }
  };
};
var init_uz = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/vi.js
function vi_default() {
  return {
    localeError: error47()
  };
}
var error47 = () => {
  const Sizable = {
    string: { unit: "ký tự", verb: "có" },
    file: { unit: "byte", verb: "có" },
    array: { unit: "phần tử", verb: "có" },
    set: { unit: "phần tử", verb: "có" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "đầu vào",
    email: "địa chỉ email",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ngày giờ ISO",
    date: "ngày ISO",
    time: "giờ ISO",
    duration: "khoảng thời gian ISO",
    ipv4: "địa chỉ IPv4",
    ipv6: "địa chỉ IPv6",
    cidrv4: "dải IPv4",
    cidrv6: "dải IPv6",
    base64: "chuỗi mã hóa base64",
    base64url: "chuỗi mã hóa base64url",
    json_string: "chuỗi JSON",
    e164: "số E.164",
    jwt: "JWT",
    template_literal: "đầu vào"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "số",
    array: "mảng"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Đầu vào không hợp lệ: mong đợi instanceof ${issue2.expected}, nhận được ${received}`;
        }
        return `Đầu vào không hợp lệ: mong đợi ${expected}, nhận được ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Đầu vào không hợp lệ: mong đợi ${stringifyPrimitive(issue2.values[0])}`;
        return `Tùy chọn không hợp lệ: mong đợi một trong các giá trị ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Quá lớn: mong đợi ${issue2.origin ?? "giá trị"} ${sizing.verb} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "phần tử"}`;
        return `Quá lớn: mong đợi ${issue2.origin ?? "giá trị"} ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Quá nhỏ: mong đợi ${issue2.origin} ${sizing.verb} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Quá nhỏ: mong đợi ${issue2.origin} ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Chuỗi không hợp lệ: phải bắt đầu bằng "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Chuỗi không hợp lệ: phải kết thúc bằng "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Chuỗi không hợp lệ: phải bao gồm "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Chuỗi không hợp lệ: phải khớp với mẫu ${_issue.pattern}`;
        return `${FormatDictionary[_issue.format] ?? issue2.format} không hợp lệ`;
      }
      case "not_multiple_of":
        return `Số không hợp lệ: phải là bội số của ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Khóa không được nhận dạng: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Khóa không hợp lệ trong ${issue2.origin}`;
      case "invalid_union":
        return "Đầu vào không hợp lệ";
      case "invalid_element":
        return `Giá trị không hợp lệ trong ${issue2.origin}`;
      default:
        return `Đầu vào không hợp lệ`;
    }
  };
};
var init_vi = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/zh-CN.js
function zh_CN_default() {
  return {
    localeError: error48()
  };
}
var error48 = () => {
  const Sizable = {
    string: { unit: "字符", verb: "包含" },
    file: { unit: "字节", verb: "包含" },
    array: { unit: "项", verb: "包含" },
    set: { unit: "项", verb: "包含" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "输入",
    email: "电子邮件",
    url: "URL",
    emoji: "表情符号",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO日期时间",
    date: "ISO日期",
    time: "ISO时间",
    duration: "ISO时长",
    ipv4: "IPv4地址",
    ipv6: "IPv6地址",
    cidrv4: "IPv4网段",
    cidrv6: "IPv6网段",
    base64: "base64编码字符串",
    base64url: "base64url编码字符串",
    json_string: "JSON字符串",
    e164: "E.164号码",
    jwt: "JWT",
    template_literal: "输入"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "数字",
    array: "数组",
    null: "空值(null)"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `无效输入：期望 instanceof ${issue2.expected}，实际接收 ${received}`;
        }
        return `无效输入：期望 ${expected}，实际接收 ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `无效输入：期望 ${stringifyPrimitive(issue2.values[0])}`;
        return `无效选项：期望以下之一 ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `数值过大：期望 ${issue2.origin ?? "值"} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "个元素"}`;
        return `数值过大：期望 ${issue2.origin ?? "值"} ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `数值过小：期望 ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `数值过小：期望 ${issue2.origin} ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `无效字符串：必须以 "${_issue.prefix}" 开头`;
        if (_issue.format === "ends_with")
          return `无效字符串：必须以 "${_issue.suffix}" 结尾`;
        if (_issue.format === "includes")
          return `无效字符串：必须包含 "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `无效字符串：必须满足正则表达式 ${_issue.pattern}`;
        return `无效${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `无效数字：必须是 ${issue2.divisor} 的倍数`;
      case "unrecognized_keys":
        return `出现未知的键(key): ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `${issue2.origin} 中的键(key)无效`;
      case "invalid_union":
        return "无效输入";
      case "invalid_element":
        return `${issue2.origin} 中包含无效值(value)`;
      default:
        return `无效输入`;
    }
  };
};
var init_zh_CN = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/zh-TW.js
function zh_TW_default() {
  return {
    localeError: error49()
  };
}
var error49 = () => {
  const Sizable = {
    string: { unit: "字元", verb: "擁有" },
    file: { unit: "位元組", verb: "擁有" },
    array: { unit: "項目", verb: "擁有" },
    set: { unit: "項目", verb: "擁有" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "輸入",
    email: "郵件地址",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO 日期時間",
    date: "ISO 日期",
    time: "ISO 時間",
    duration: "ISO 期間",
    ipv4: "IPv4 位址",
    ipv6: "IPv6 位址",
    cidrv4: "IPv4 範圍",
    cidrv6: "IPv6 範圍",
    base64: "base64 編碼字串",
    base64url: "base64url 編碼字串",
    json_string: "JSON 字串",
    e164: "E.164 數值",
    jwt: "JWT",
    template_literal: "輸入"
  };
  const TypeDictionary = {
    nan: "NaN"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `無效的輸入值：預期為 instanceof ${issue2.expected}，但收到 ${received}`;
        }
        return `無效的輸入值：預期為 ${expected}，但收到 ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `無效的輸入值：預期為 ${stringifyPrimitive(issue2.values[0])}`;
        return `無效的選項：預期為以下其中之一 ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `數值過大：預期 ${issue2.origin ?? "值"} 應為 ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "個元素"}`;
        return `數值過大：預期 ${issue2.origin ?? "值"} 應為 ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `數值過小：預期 ${issue2.origin} 應為 ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `數值過小：預期 ${issue2.origin} 應為 ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `無效的字串：必須以 "${_issue.prefix}" 開頭`;
        }
        if (_issue.format === "ends_with")
          return `無效的字串：必須以 "${_issue.suffix}" 結尾`;
        if (_issue.format === "includes")
          return `無效的字串：必須包含 "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `無效的字串：必須符合格式 ${_issue.pattern}`;
        return `無效的 ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `無效的數字：必須為 ${issue2.divisor} 的倍數`;
      case "unrecognized_keys":
        return `無法識別的鍵值${issue2.keys.length > 1 ? "們" : ""}：${joinValues(issue2.keys, "、")}`;
      case "invalid_key":
        return `${issue2.origin} 中有無效的鍵值`;
      case "invalid_union":
        return "無效的輸入值";
      case "invalid_element":
        return `${issue2.origin} 中有無效的值`;
      default:
        return `無效的輸入值`;
    }
  };
};
var init_zh_TW = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/yo.js
function yo_default() {
  return {
    localeError: error50()
  };
}
var error50 = () => {
  const Sizable = {
    string: { unit: "àmi", verb: "ní" },
    file: { unit: "bytes", verb: "ní" },
    array: { unit: "nkan", verb: "ní" },
    set: { unit: "nkan", verb: "ní" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "ẹ̀rọ ìbáwọlé",
    email: "àdírẹ́sì ìmẹ́lì",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "àkókò ISO",
    date: "ọjọ́ ISO",
    time: "àkókò ISO",
    duration: "àkókò tó pé ISO",
    ipv4: "àdírẹ́sì IPv4",
    ipv6: "àdírẹ́sì IPv6",
    cidrv4: "àgbègbè IPv4",
    cidrv6: "àgbègbè IPv6",
    base64: "ọ̀rọ̀ tí a kọ́ ní base64",
    base64url: "ọ̀rọ̀ base64url",
    json_string: "ọ̀rọ̀ JSON",
    e164: "nọ́mbà E.164",
    jwt: "JWT",
    template_literal: "ẹ̀rọ ìbáwọlé"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "nọ́mbà",
    array: "akopọ"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Ìbáwọlé aṣìṣe: a ní láti fi instanceof ${issue2.expected}, àmọ̀ a rí ${received}`;
        }
        return `Ìbáwọlé aṣìṣe: a ní láti fi ${expected}, àmọ̀ a rí ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Ìbáwọlé aṣìṣe: a ní láti fi ${stringifyPrimitive(issue2.values[0])}`;
        return `Àṣàyàn aṣìṣe: yan ọ̀kan lára ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Tó pọ̀ jù: a ní láti jẹ́ pé ${issue2.origin ?? "iye"} ${sizing.verb} ${adj}${issue2.maximum} ${sizing.unit}`;
        return `Tó pọ̀ jù: a ní láti jẹ́ ${adj}${issue2.maximum}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Kéré ju: a ní láti jẹ́ pé ${issue2.origin} ${sizing.verb} ${adj}${issue2.minimum} ${sizing.unit}`;
        return `Kéré ju: a ní láti jẹ́ ${adj}${issue2.minimum}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Ọ̀rọ̀ aṣìṣe: gbọ́dọ̀ bẹ̀rẹ̀ pẹ̀lú "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Ọ̀rọ̀ aṣìṣe: gbọ́dọ̀ parí pẹ̀lú "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Ọ̀rọ̀ aṣìṣe: gbọ́dọ̀ ní "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Ọ̀rọ̀ aṣìṣe: gbọ́dọ̀ bá àpẹẹrẹ mu ${_issue.pattern}`;
        return `Aṣìṣe: ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Nọ́mbà aṣìṣe: gbọ́dọ̀ jẹ́ èyà pípín ti ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Bọtìnì àìmọ̀: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Bọtìnì aṣìṣe nínú ${issue2.origin}`;
      case "invalid_union":
        return "Ìbáwọlé aṣìṣe";
      case "invalid_element":
        return `Iye aṣìṣe nínú ${issue2.origin}`;
      default:
        return "Ìbáwọlé aṣìṣe";
    }
  };
};
var init_yo = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/index.js
var exports_locales = {};
__export(exports_locales, {
  zhTW: () => zh_TW_default,
  zhCN: () => zh_CN_default,
  yo: () => yo_default,
  vi: () => vi_default,
  uz: () => uz_default,
  ur: () => ur_default,
  uk: () => uk_default,
  ua: () => ua_default,
  tr: () => tr_default,
  th: () => th_default,
  ta: () => ta_default,
  sv: () => sv_default,
  sl: () => sl_default,
  ru: () => ru_default,
  ro: () => ro_default,
  pt: () => pt_default,
  ps: () => ps_default,
  pl: () => pl_default,
  ota: () => ota_default,
  no: () => no_default,
  nl: () => nl_default,
  ms: () => ms_default,
  mk: () => mk_default,
  lt: () => lt_default,
  ko: () => ko_default,
  km: () => km_default,
  kh: () => kh_default,
  ka: () => ka_default,
  ja: () => ja_default,
  it: () => it_default,
  is: () => is_default,
  id: () => id_default,
  hy: () => hy_default,
  hu: () => hu_default,
  hr: () => hr_default,
  he: () => he_default,
  frCA: () => fr_CA_default,
  fr: () => fr_default,
  fi: () => fi_default,
  fa: () => fa_default,
  es: () => es_default,
  eo: () => eo_default,
  en: () => en_default,
  el: () => el_default,
  de: () => de_default,
  da: () => da_default,
  cs: () => cs_default,
  ca: () => ca_default,
  bg: () => bg_default,
  be: () => be_default,
  az: () => az_default,
  ar: () => ar_default
});
var init_locales = __esm(() => {
  init_ar();
  init_az();
  init_be();
  init_bg();
  init_ca();
  init_cs();
  init_da();
  init_de();
  init_el();
  init_en();
  init_eo();
  init_es();
  init_fa();
  init_fi();
  init_fr();
  init_fr_CA();
  init_he();
  init_hr();
  init_hu();
  init_hy();
  init_id();
  init_is();
  init_it();
  init_ja();
  init_ka();
  init_kh();
  init_km();
  init_ko();
  init_lt();
  init_mk();
  init_ms();
  init_nl();
  init_no();
  init_ota();
  init_ps();
  init_pl();
  init_pt();
  init_ro();
  init_ru();
  init_sl();
  init_sv();
  init_ta();
  init_th();
  init_tr();
  init_ua();
  init_uk();
  init_ur();
  init_uz();
  init_vi();
  init_zh_CN();
  init_zh_TW();
  init_yo();
});

// node_modules/zod/v4/core/registries.js
class $ZodRegistry {
  constructor() {
    this._map = new WeakMap;
    this._idmap = new Map;
  }
  add(schema, ..._meta) {
    const meta = _meta[0];
    this._map.set(schema, meta);
    if (meta && typeof meta === "object" && "id" in meta) {
      this._idmap.set(meta.id, schema);
    }
    return this;
  }
  clear() {
    this._map = new WeakMap;
    this._idmap = new Map;
    return this;
  }
  remove(schema) {
    const meta = this._map.get(schema);
    if (meta && typeof meta === "object" && "id" in meta) {
      this._idmap.delete(meta.id);
    }
    this._map.delete(schema);
    return this;
  }
  get(schema) {
    const p = schema._zod.parent;
    if (p) {
      const pm = { ...this.get(p) ?? {} };
      delete pm.id;
      const f = { ...pm, ...this._map.get(schema) };
      return Object.keys(f).length ? f : undefined;
    }
    return this._map.get(schema);
  }
  has(schema) {
    return this._map.has(schema);
  }
}
function registry() {
  return new $ZodRegistry;
}
var _a2, $output, $input, globalRegistry;
var init_registries = __esm(() => {
  $output = Symbol("ZodOutput");
  $input = Symbol("ZodInput");
  (_a2 = globalThis).__zod_globalRegistry ?? (_a2.__zod_globalRegistry = registry());
  globalRegistry = globalThis.__zod_globalRegistry;
});

// node_modules/zod/v4/core/api.js
function _string(Class2, params) {
  return new Class2({
    type: "string",
    ...normalizeParams(params)
  });
}
function _coercedString(Class2, params) {
  return new Class2({
    type: "string",
    coerce: true,
    ...normalizeParams(params)
  });
}
function _email(Class2, params) {
  return new Class2({
    type: "string",
    format: "email",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _guid(Class2, params) {
  return new Class2({
    type: "string",
    format: "guid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _uuid(Class2, params) {
  return new Class2({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _uuidv4(Class2, params) {
  return new Class2({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v4",
    ...normalizeParams(params)
  });
}
function _uuidv6(Class2, params) {
  return new Class2({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v6",
    ...normalizeParams(params)
  });
}
function _uuidv7(Class2, params) {
  return new Class2({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v7",
    ...normalizeParams(params)
  });
}
function _url(Class2, params) {
  return new Class2({
    type: "string",
    format: "url",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _emoji2(Class2, params) {
  return new Class2({
    type: "string",
    format: "emoji",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _nanoid(Class2, params) {
  return new Class2({
    type: "string",
    format: "nanoid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _cuid(Class2, params) {
  return new Class2({
    type: "string",
    format: "cuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _cuid2(Class2, params) {
  return new Class2({
    type: "string",
    format: "cuid2",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _ulid(Class2, params) {
  return new Class2({
    type: "string",
    format: "ulid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _xid(Class2, params) {
  return new Class2({
    type: "string",
    format: "xid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _ksuid(Class2, params) {
  return new Class2({
    type: "string",
    format: "ksuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _ipv4(Class2, params) {
  return new Class2({
    type: "string",
    format: "ipv4",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _ipv6(Class2, params) {
  return new Class2({
    type: "string",
    format: "ipv6",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _mac(Class2, params) {
  return new Class2({
    type: "string",
    format: "mac",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _cidrv4(Class2, params) {
  return new Class2({
    type: "string",
    format: "cidrv4",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _cidrv6(Class2, params) {
  return new Class2({
    type: "string",
    format: "cidrv6",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _base64(Class2, params) {
  return new Class2({
    type: "string",
    format: "base64",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _base64url(Class2, params) {
  return new Class2({
    type: "string",
    format: "base64url",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _e164(Class2, params) {
  return new Class2({
    type: "string",
    format: "e164",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _jwt(Class2, params) {
  return new Class2({
    type: "string",
    format: "jwt",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _isoDateTime(Class2, params) {
  return new Class2({
    type: "string",
    format: "datetime",
    check: "string_format",
    offset: false,
    local: false,
    precision: null,
    ...normalizeParams(params)
  });
}
function _isoDate(Class2, params) {
  return new Class2({
    type: "string",
    format: "date",
    check: "string_format",
    ...normalizeParams(params)
  });
}
function _isoTime(Class2, params) {
  return new Class2({
    type: "string",
    format: "time",
    check: "string_format",
    precision: null,
    ...normalizeParams(params)
  });
}
function _isoDuration(Class2, params) {
  return new Class2({
    type: "string",
    format: "duration",
    check: "string_format",
    ...normalizeParams(params)
  });
}
function _number(Class2, params) {
  return new Class2({
    type: "number",
    checks: [],
    ...normalizeParams(params)
  });
}
function _coercedNumber(Class2, params) {
  return new Class2({
    type: "number",
    coerce: true,
    checks: [],
    ...normalizeParams(params)
  });
}
function _int(Class2, params) {
  return new Class2({
    type: "number",
    check: "number_format",
    abort: false,
    format: "safeint",
    ...normalizeParams(params)
  });
}
function _float32(Class2, params) {
  return new Class2({
    type: "number",
    check: "number_format",
    abort: false,
    format: "float32",
    ...normalizeParams(params)
  });
}
function _float64(Class2, params) {
  return new Class2({
    type: "number",
    check: "number_format",
    abort: false,
    format: "float64",
    ...normalizeParams(params)
  });
}
function _int32(Class2, params) {
  return new Class2({
    type: "number",
    check: "number_format",
    abort: false,
    format: "int32",
    ...normalizeParams(params)
  });
}
function _uint32(Class2, params) {
  return new Class2({
    type: "number",
    check: "number_format",
    abort: false,
    format: "uint32",
    ...normalizeParams(params)
  });
}
function _boolean(Class2, params) {
  return new Class2({
    type: "boolean",
    ...normalizeParams(params)
  });
}
function _coercedBoolean(Class2, params) {
  return new Class2({
    type: "boolean",
    coerce: true,
    ...normalizeParams(params)
  });
}
function _bigint(Class2, params) {
  return new Class2({
    type: "bigint",
    ...normalizeParams(params)
  });
}
function _coercedBigint(Class2, params) {
  return new Class2({
    type: "bigint",
    coerce: true,
    ...normalizeParams(params)
  });
}
function _int64(Class2, params) {
  return new Class2({
    type: "bigint",
    check: "bigint_format",
    abort: false,
    format: "int64",
    ...normalizeParams(params)
  });
}
function _uint64(Class2, params) {
  return new Class2({
    type: "bigint",
    check: "bigint_format",
    abort: false,
    format: "uint64",
    ...normalizeParams(params)
  });
}
function _symbol(Class2, params) {
  return new Class2({
    type: "symbol",
    ...normalizeParams(params)
  });
}
function _undefined2(Class2, params) {
  return new Class2({
    type: "undefined",
    ...normalizeParams(params)
  });
}
function _null2(Class2, params) {
  return new Class2({
    type: "null",
    ...normalizeParams(params)
  });
}
function _any(Class2) {
  return new Class2({
    type: "any"
  });
}
function _unknown(Class2) {
  return new Class2({
    type: "unknown"
  });
}
function _never(Class2, params) {
  return new Class2({
    type: "never",
    ...normalizeParams(params)
  });
}
function _void(Class2, params) {
  return new Class2({
    type: "void",
    ...normalizeParams(params)
  });
}
function _date(Class2, params) {
  return new Class2({
    type: "date",
    ...normalizeParams(params)
  });
}
function _coercedDate(Class2, params) {
  return new Class2({
    type: "date",
    coerce: true,
    ...normalizeParams(params)
  });
}
function _nan(Class2, params) {
  return new Class2({
    type: "nan",
    ...normalizeParams(params)
  });
}
function _lt(value, params) {
  return new $ZodCheckLessThan({
    check: "less_than",
    ...normalizeParams(params),
    value,
    inclusive: false
  });
}
function _lte(value, params) {
  return new $ZodCheckLessThan({
    check: "less_than",
    ...normalizeParams(params),
    value,
    inclusive: true
  });
}
function _gt(value, params) {
  return new $ZodCheckGreaterThan({
    check: "greater_than",
    ...normalizeParams(params),
    value,
    inclusive: false
  });
}
function _gte(value, params) {
  return new $ZodCheckGreaterThan({
    check: "greater_than",
    ...normalizeParams(params),
    value,
    inclusive: true
  });
}
function _positive(params) {
  return _gt(0, params);
}
function _negative(params) {
  return _lt(0, params);
}
function _nonpositive(params) {
  return _lte(0, params);
}
function _nonnegative(params) {
  return _gte(0, params);
}
function _multipleOf(value, params) {
  return new $ZodCheckMultipleOf({
    check: "multiple_of",
    ...normalizeParams(params),
    value
  });
}
function _maxSize(maximum, params) {
  return new $ZodCheckMaxSize({
    check: "max_size",
    ...normalizeParams(params),
    maximum
  });
}
function _minSize(minimum, params) {
  return new $ZodCheckMinSize({
    check: "min_size",
    ...normalizeParams(params),
    minimum
  });
}
function _size(size, params) {
  return new $ZodCheckSizeEquals({
    check: "size_equals",
    ...normalizeParams(params),
    size
  });
}
function _maxLength(maximum, params) {
  const ch = new $ZodCheckMaxLength({
    check: "max_length",
    ...normalizeParams(params),
    maximum
  });
  return ch;
}
function _minLength(minimum, params) {
  return new $ZodCheckMinLength({
    check: "min_length",
    ...normalizeParams(params),
    minimum
  });
}
function _length(length, params) {
  return new $ZodCheckLengthEquals({
    check: "length_equals",
    ...normalizeParams(params),
    length
  });
}
function _regex(pattern, params) {
  return new $ZodCheckRegex({
    check: "string_format",
    format: "regex",
    ...normalizeParams(params),
    pattern
  });
}
function _lowercase(params) {
  return new $ZodCheckLowerCase({
    check: "string_format",
    format: "lowercase",
    ...normalizeParams(params)
  });
}
function _uppercase(params) {
  return new $ZodCheckUpperCase({
    check: "string_format",
    format: "uppercase",
    ...normalizeParams(params)
  });
}
function _includes(includes, params) {
  return new $ZodCheckIncludes({
    check: "string_format",
    format: "includes",
    ...normalizeParams(params),
    includes
  });
}
function _startsWith(prefix, params) {
  return new $ZodCheckStartsWith({
    check: "string_format",
    format: "starts_with",
    ...normalizeParams(params),
    prefix
  });
}
function _endsWith(suffix, params) {
  return new $ZodCheckEndsWith({
    check: "string_format",
    format: "ends_with",
    ...normalizeParams(params),
    suffix
  });
}
function _property(property, schema, params) {
  return new $ZodCheckProperty({
    check: "property",
    property,
    schema,
    ...normalizeParams(params)
  });
}
function _mime(types, params) {
  return new $ZodCheckMimeType({
    check: "mime_type",
    mime: types,
    ...normalizeParams(params)
  });
}
function _overwrite(tx) {
  return new $ZodCheckOverwrite({
    check: "overwrite",
    tx
  });
}
function _normalize(form) {
  return _overwrite((input) => input.normalize(form));
}
function _trim() {
  return _overwrite((input) => input.trim());
}
function _toLowerCase() {
  return _overwrite((input) => input.toLowerCase());
}
function _toUpperCase() {
  return _overwrite((input) => input.toUpperCase());
}
function _slugify() {
  return _overwrite((input) => slugify(input));
}
function _array(Class2, element, params) {
  return new Class2({
    type: "array",
    element,
    ...normalizeParams(params)
  });
}
function _union(Class2, options, params) {
  return new Class2({
    type: "union",
    options,
    ...normalizeParams(params)
  });
}
function _xor(Class2, options, params) {
  return new Class2({
    type: "union",
    options,
    inclusive: false,
    ...normalizeParams(params)
  });
}
function _discriminatedUnion(Class2, discriminator, options, params) {
  return new Class2({
    type: "union",
    options,
    discriminator,
    ...normalizeParams(params)
  });
}
function _intersection(Class2, left, right) {
  return new Class2({
    type: "intersection",
    left,
    right
  });
}
function _tuple(Class2, items, _paramsOrRest, _params) {
  const hasRest = _paramsOrRest instanceof $ZodType;
  const params = hasRest ? _params : _paramsOrRest;
  const rest = hasRest ? _paramsOrRest : null;
  return new Class2({
    type: "tuple",
    items,
    rest,
    ...normalizeParams(params)
  });
}
function _record(Class2, keyType, valueType, params) {
  return new Class2({
    type: "record",
    keyType,
    valueType,
    ...normalizeParams(params)
  });
}
function _map(Class2, keyType, valueType, params) {
  return new Class2({
    type: "map",
    keyType,
    valueType,
    ...normalizeParams(params)
  });
}
function _set(Class2, valueType, params) {
  return new Class2({
    type: "set",
    valueType,
    ...normalizeParams(params)
  });
}
function _enum(Class2, values, params) {
  const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
  return new Class2({
    type: "enum",
    entries,
    ...normalizeParams(params)
  });
}
function _nativeEnum(Class2, entries, params) {
  return new Class2({
    type: "enum",
    entries,
    ...normalizeParams(params)
  });
}
function _literal(Class2, value, params) {
  return new Class2({
    type: "literal",
    values: Array.isArray(value) ? value : [value],
    ...normalizeParams(params)
  });
}
function _file(Class2, params) {
  return new Class2({
    type: "file",
    ...normalizeParams(params)
  });
}
function _transform(Class2, fn) {
  return new Class2({
    type: "transform",
    transform: fn
  });
}
function _optional(Class2, innerType) {
  return new Class2({
    type: "optional",
    innerType
  });
}
function _nullable(Class2, innerType) {
  return new Class2({
    type: "nullable",
    innerType
  });
}
function _default(Class2, innerType, defaultValue) {
  return new Class2({
    type: "default",
    innerType,
    get defaultValue() {
      return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
    }
  });
}
function _nonoptional(Class2, innerType, params) {
  return new Class2({
    type: "nonoptional",
    innerType,
    ...normalizeParams(params)
  });
}
function _success(Class2, innerType) {
  return new Class2({
    type: "success",
    innerType
  });
}
function _catch(Class2, innerType, catchValue) {
  return new Class2({
    type: "catch",
    innerType,
    catchValue: typeof catchValue === "function" ? catchValue : () => catchValue
  });
}
function _pipe(Class2, in_, out) {
  return new Class2({
    type: "pipe",
    in: in_,
    out
  });
}
function _readonly(Class2, innerType) {
  return new Class2({
    type: "readonly",
    innerType
  });
}
function _templateLiteral(Class2, parts, params) {
  return new Class2({
    type: "template_literal",
    parts,
    ...normalizeParams(params)
  });
}
function _lazy(Class2, getter) {
  return new Class2({
    type: "lazy",
    getter
  });
}
function _promise(Class2, innerType) {
  return new Class2({
    type: "promise",
    innerType
  });
}
function _custom(Class2, fn, _params) {
  const norm = normalizeParams(_params);
  norm.abort ?? (norm.abort = true);
  const schema = new Class2({
    type: "custom",
    check: "custom",
    fn,
    ...norm
  });
  return schema;
}
function _refine(Class2, fn, _params) {
  const schema = new Class2({
    type: "custom",
    check: "custom",
    fn,
    ...normalizeParams(_params)
  });
  return schema;
}
function _superRefine(fn, params) {
  const ch = _check((payload) => {
    payload.addIssue = (issue2) => {
      if (typeof issue2 === "string") {
        payload.issues.push(issue(issue2, payload.value, ch._zod.def));
      } else {
        const _issue = issue2;
        if (_issue.fatal)
          _issue.continue = false;
        _issue.code ?? (_issue.code = "custom");
        _issue.input ?? (_issue.input = payload.value);
        _issue.inst ?? (_issue.inst = ch);
        _issue.continue ?? (_issue.continue = !ch._zod.def.abort);
        payload.issues.push(issue(_issue));
      }
    };
    return fn(payload.value, payload);
  }, params);
  return ch;
}
function _check(fn, params) {
  const ch = new $ZodCheck({
    check: "custom",
    ...normalizeParams(params)
  });
  ch._zod.check = fn;
  return ch;
}
function describe(description) {
  const ch = new $ZodCheck({ check: "describe" });
  ch._zod.onattach = [
    (inst) => {
      const existing = globalRegistry.get(inst) ?? {};
      globalRegistry.add(inst, { ...existing, description });
    }
  ];
  ch._zod.check = () => {};
  return ch;
}
function meta(metadata) {
  const ch = new $ZodCheck({ check: "meta" });
  ch._zod.onattach = [
    (inst) => {
      const existing = globalRegistry.get(inst) ?? {};
      globalRegistry.add(inst, { ...existing, ...metadata });
    }
  ];
  ch._zod.check = () => {};
  return ch;
}
function _stringbool(Classes, _params) {
  const params = normalizeParams(_params);
  let truthyArray = params.truthy ?? ["true", "1", "yes", "on", "y", "enabled"];
  let falsyArray = params.falsy ?? ["false", "0", "no", "off", "n", "disabled"];
  if (params.case !== "sensitive") {
    truthyArray = truthyArray.map((v) => typeof v === "string" ? v.toLowerCase() : v);
    falsyArray = falsyArray.map((v) => typeof v === "string" ? v.toLowerCase() : v);
  }
  const truthySet = new Set(truthyArray);
  const falsySet = new Set(falsyArray);
  const _Codec = Classes.Codec ?? $ZodCodec;
  const _Boolean = Classes.Boolean ?? $ZodBoolean;
  const _String = Classes.String ?? $ZodString;
  const stringSchema = new _String({ type: "string", error: params.error });
  const booleanSchema = new _Boolean({ type: "boolean", error: params.error });
  const codec = new _Codec({
    type: "pipe",
    in: stringSchema,
    out: booleanSchema,
    transform: (input, payload) => {
      let data = input;
      if (params.case !== "sensitive")
        data = data.toLowerCase();
      if (truthySet.has(data)) {
        return true;
      } else if (falsySet.has(data)) {
        return false;
      } else {
        payload.issues.push({
          code: "invalid_value",
          expected: "stringbool",
          values: [...truthySet, ...falsySet],
          input: payload.value,
          inst: codec,
          continue: false
        });
        return {};
      }
    },
    reverseTransform: (input, _payload) => {
      if (input === true) {
        return truthyArray[0] || "true";
      } else {
        return falsyArray[0] || "false";
      }
    },
    error: params.error
  });
  return codec;
}
function _stringFormat(Class2, format, fnOrRegex, _params = {}) {
  const params = normalizeParams(_params);
  const def = {
    ...normalizeParams(_params),
    check: "string_format",
    type: "string",
    format,
    fn: typeof fnOrRegex === "function" ? fnOrRegex : (val) => fnOrRegex.test(val),
    ...params
  };
  if (fnOrRegex instanceof RegExp) {
    def.pattern = fnOrRegex;
  }
  const inst = new Class2(def);
  return inst;
}
var TimePrecision;
var init_api = __esm(() => {
  init_checks();
  init_registries();
  init_schemas();
  init_util();
  TimePrecision = {
    Any: null,
    Minute: -1,
    Second: 0,
    Millisecond: 3,
    Microsecond: 6
  };
});

// node_modules/zod/v4/core/to-json-schema.js
function initializeContext(params) {
  let target = params?.target ?? "draft-2020-12";
  if (target === "draft-4")
    target = "draft-04";
  if (target === "draft-7")
    target = "draft-07";
  return {
    processors: params.processors ?? {},
    metadataRegistry: params?.metadata ?? globalRegistry,
    target,
    unrepresentable: params?.unrepresentable ?? "throw",
    override: params?.override ?? (() => {}),
    io: params?.io ?? "output",
    counter: 0,
    seen: new Map,
    cycles: params?.cycles ?? "ref",
    reused: params?.reused ?? "inline",
    external: params?.external ?? undefined
  };
}
function process2(schema, ctx, _params = { path: [], schemaPath: [] }) {
  var _a3;
  const def = schema._zod.def;
  const seen = ctx.seen.get(schema);
  if (seen) {
    seen.count++;
    const isCycle = _params.schemaPath.includes(schema);
    if (isCycle) {
      seen.cycle = _params.path;
    }
    return seen.schema;
  }
  const result = { schema: {}, count: 1, cycle: undefined, path: _params.path };
  ctx.seen.set(schema, result);
  const overrideSchema = schema._zod.toJSONSchema?.();
  if (overrideSchema) {
    result.schema = overrideSchema;
  } else {
    const params = {
      ..._params,
      schemaPath: [..._params.schemaPath, schema],
      path: _params.path
    };
    if (schema._zod.processJSONSchema) {
      schema._zod.processJSONSchema(ctx, result.schema, params);
    } else {
      const _json = result.schema;
      const processor = ctx.processors[def.type];
      if (!processor) {
        throw new Error(`[toJSONSchema]: Non-representable type encountered: ${def.type}`);
      }
      processor(schema, ctx, _json, params);
    }
    const parent = schema._zod.parent;
    if (parent) {
      if (!result.ref)
        result.ref = parent;
      process2(parent, ctx, params);
      ctx.seen.get(parent).isParent = true;
    }
  }
  const meta2 = ctx.metadataRegistry.get(schema);
  if (meta2)
    Object.assign(result.schema, meta2);
  if (ctx.io === "input" && isTransforming(schema)) {
    delete result.schema.examples;
    delete result.schema.default;
  }
  if (ctx.io === "input" && "_prefault" in result.schema)
    (_a3 = result.schema).default ?? (_a3.default = result.schema._prefault);
  delete result.schema._prefault;
  const _result = ctx.seen.get(schema);
  return _result.schema;
}
function extractDefs(ctx, schema) {
  const root = ctx.seen.get(schema);
  if (!root)
    throw new Error("Unprocessed schema. This is a bug in Zod.");
  const idToSchema = new Map;
  for (const entry of ctx.seen.entries()) {
    const id = ctx.metadataRegistry.get(entry[0])?.id;
    if (id) {
      const existing = idToSchema.get(id);
      if (existing && existing !== entry[0]) {
        throw new Error(`Duplicate schema id "${id}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);
      }
      idToSchema.set(id, entry[0]);
    }
  }
  const makeURI = (entry) => {
    const defsSegment = ctx.target === "draft-2020-12" ? "$defs" : "definitions";
    if (ctx.external) {
      const externalId = ctx.external.registry.get(entry[0])?.id;
      const uriGenerator = ctx.external.uri ?? ((id2) => id2);
      if (externalId) {
        return { ref: uriGenerator(externalId) };
      }
      const id = entry[1].defId ?? entry[1].schema.id ?? `schema${ctx.counter++}`;
      entry[1].defId = id;
      return { defId: id, ref: `${uriGenerator("__shared")}#/${defsSegment}/${id}` };
    }
    if (entry[1] === root) {
      return { ref: "#" };
    }
    const uriPrefix = `#`;
    const defUriPrefix = `${uriPrefix}/${defsSegment}/`;
    const defId = entry[1].schema.id ?? `__schema${ctx.counter++}`;
    return { defId, ref: defUriPrefix + defId };
  };
  const extractToDef = (entry) => {
    if (entry[1].schema.$ref) {
      return;
    }
    const seen = entry[1];
    const { ref, defId } = makeURI(entry);
    seen.def = { ...seen.schema };
    if (defId)
      seen.defId = defId;
    const schema2 = seen.schema;
    for (const key in schema2) {
      delete schema2[key];
    }
    schema2.$ref = ref;
  };
  if (ctx.cycles === "throw") {
    for (const entry of ctx.seen.entries()) {
      const seen = entry[1];
      if (seen.cycle) {
        throw new Error("Cycle detected: " + `#/${seen.cycle?.join("/")}/<root>` + '\n\nSet the `cycles` parameter to `"ref"` to resolve cyclical schemas with defs.');
      }
    }
  }
  for (const entry of ctx.seen.entries()) {
    const seen = entry[1];
    if (schema === entry[0]) {
      extractToDef(entry);
      continue;
    }
    if (ctx.external) {
      const ext = ctx.external.registry.get(entry[0])?.id;
      if (schema !== entry[0] && ext) {
        extractToDef(entry);
        continue;
      }
    }
    const id = ctx.metadataRegistry.get(entry[0])?.id;
    if (id) {
      extractToDef(entry);
      continue;
    }
    if (seen.cycle) {
      extractToDef(entry);
      continue;
    }
    if (seen.count > 1) {
      if (ctx.reused === "ref") {
        extractToDef(entry);
        continue;
      }
    }
  }
}
function finalize(ctx, schema) {
  const root = ctx.seen.get(schema);
  if (!root)
    throw new Error("Unprocessed schema. This is a bug in Zod.");
  const flattenRef = (zodSchema) => {
    const seen = ctx.seen.get(zodSchema);
    if (seen.ref === null)
      return;
    const schema2 = seen.def ?? seen.schema;
    const _cached = { ...schema2 };
    const ref = seen.ref;
    seen.ref = null;
    if (ref) {
      flattenRef(ref);
      const refSeen = ctx.seen.get(ref);
      const refSchema = refSeen.schema;
      if (refSchema.$ref && (ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0")) {
        schema2.allOf = schema2.allOf ?? [];
        schema2.allOf.push(refSchema);
      } else {
        Object.assign(schema2, refSchema);
      }
      Object.assign(schema2, _cached);
      const isParentRef = zodSchema._zod.parent === ref;
      if (isParentRef) {
        for (const key in schema2) {
          if (key === "$ref" || key === "allOf")
            continue;
          if (!(key in _cached)) {
            delete schema2[key];
          }
        }
      }
      if (refSchema.$ref && refSeen.def) {
        for (const key in schema2) {
          if (key === "$ref" || key === "allOf")
            continue;
          if (key in refSeen.def && JSON.stringify(schema2[key]) === JSON.stringify(refSeen.def[key])) {
            delete schema2[key];
          }
        }
      }
    }
    const parent = zodSchema._zod.parent;
    if (parent && parent !== ref) {
      flattenRef(parent);
      const parentSeen = ctx.seen.get(parent);
      if (parentSeen?.schema.$ref) {
        schema2.$ref = parentSeen.schema.$ref;
        if (parentSeen.def) {
          for (const key in schema2) {
            if (key === "$ref" || key === "allOf")
              continue;
            if (key in parentSeen.def && JSON.stringify(schema2[key]) === JSON.stringify(parentSeen.def[key])) {
              delete schema2[key];
            }
          }
        }
      }
    }
    ctx.override({
      zodSchema,
      jsonSchema: schema2,
      path: seen.path ?? []
    });
  };
  for (const entry of [...ctx.seen.entries()].reverse()) {
    flattenRef(entry[0]);
  }
  const result = {};
  if (ctx.target === "draft-2020-12") {
    result.$schema = "https://json-schema.org/draft/2020-12/schema";
  } else if (ctx.target === "draft-07") {
    result.$schema = "http://json-schema.org/draft-07/schema#";
  } else if (ctx.target === "draft-04") {
    result.$schema = "http://json-schema.org/draft-04/schema#";
  } else if (ctx.target === "openapi-3.0") {}
  if (ctx.external?.uri) {
    const id = ctx.external.registry.get(schema)?.id;
    if (!id)
      throw new Error("Schema is missing an `id` property");
    result.$id = ctx.external.uri(id);
  }
  Object.assign(result, root.def ?? root.schema);
  const rootMetaId = ctx.metadataRegistry.get(schema)?.id;
  if (rootMetaId !== undefined && result.id === rootMetaId)
    delete result.id;
  const defs = ctx.external?.defs ?? {};
  for (const entry of ctx.seen.entries()) {
    const seen = entry[1];
    if (seen.def && seen.defId) {
      if (seen.def.id === seen.defId)
        delete seen.def.id;
      defs[seen.defId] = seen.def;
    }
  }
  if (ctx.external) {} else {
    if (Object.keys(defs).length > 0) {
      if (ctx.target === "draft-2020-12") {
        result.$defs = defs;
      } else {
        result.definitions = defs;
      }
    }
  }
  try {
    const finalized = JSON.parse(JSON.stringify(result));
    Object.defineProperty(finalized, "~standard", {
      value: {
        ...schema["~standard"],
        jsonSchema: {
          input: createStandardJSONSchemaMethod(schema, "input", ctx.processors),
          output: createStandardJSONSchemaMethod(schema, "output", ctx.processors)
        }
      },
      enumerable: false,
      writable: false
    });
    return finalized;
  } catch (_err) {
    throw new Error("Error converting schema to JSON.");
  }
}
function isTransforming(_schema, _ctx) {
  const ctx = _ctx ?? { seen: new Set };
  if (ctx.seen.has(_schema))
    return false;
  ctx.seen.add(_schema);
  const def = _schema._zod.def;
  if (def.type === "transform")
    return true;
  if (def.type === "array")
    return isTransforming(def.element, ctx);
  if (def.type === "set")
    return isTransforming(def.valueType, ctx);
  if (def.type === "lazy")
    return isTransforming(def.getter(), ctx);
  if (def.type === "promise" || def.type === "optional" || def.type === "nonoptional" || def.type === "nullable" || def.type === "readonly" || def.type === "default" || def.type === "prefault") {
    return isTransforming(def.innerType, ctx);
  }
  if (def.type === "intersection") {
    return isTransforming(def.left, ctx) || isTransforming(def.right, ctx);
  }
  if (def.type === "record" || def.type === "map") {
    return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
  }
  if (def.type === "pipe") {
    if (_schema._zod.traits.has("$ZodCodec"))
      return true;
    return isTransforming(def.in, ctx) || isTransforming(def.out, ctx);
  }
  if (def.type === "object") {
    for (const key in def.shape) {
      if (isTransforming(def.shape[key], ctx))
        return true;
    }
    return false;
  }
  if (def.type === "union") {
    for (const option of def.options) {
      if (isTransforming(option, ctx))
        return true;
    }
    return false;
  }
  if (def.type === "tuple") {
    for (const item of def.items) {
      if (isTransforming(item, ctx))
        return true;
    }
    if (def.rest && isTransforming(def.rest, ctx))
      return true;
    return false;
  }
  return false;
}
var createToJSONSchemaMethod = (schema, processors = {}) => (params) => {
  const ctx = initializeContext({ ...params, processors });
  process2(schema, ctx);
  extractDefs(ctx, schema);
  return finalize(ctx, schema);
}, createStandardJSONSchemaMethod = (schema, io, processors = {}) => (params) => {
  const { libraryOptions, target } = params ?? {};
  const ctx = initializeContext({ ...libraryOptions ?? {}, target, io, processors });
  process2(schema, ctx);
  extractDefs(ctx, schema);
  return finalize(ctx, schema);
};
var init_to_json_schema = __esm(() => {
  init_registries();
});

// node_modules/zod/v4/core/json-schema-processors.js
function toJSONSchema(input, params) {
  if ("_idmap" in input) {
    const registry2 = input;
    const ctx2 = initializeContext({ ...params, processors: allProcessors });
    const defs = {};
    for (const entry of registry2._idmap.entries()) {
      const [_, schema] = entry;
      process2(schema, ctx2);
    }
    const schemas = {};
    const external = {
      registry: registry2,
      uri: params?.uri,
      defs
    };
    ctx2.external = external;
    for (const entry of registry2._idmap.entries()) {
      const [key, schema] = entry;
      extractDefs(ctx2, schema);
      schemas[key] = finalize(ctx2, schema);
    }
    if (Object.keys(defs).length > 0) {
      const defsSegment = ctx2.target === "draft-2020-12" ? "$defs" : "definitions";
      schemas.__shared = {
        [defsSegment]: defs
      };
    }
    return { schemas };
  }
  const ctx = initializeContext({ ...params, processors: allProcessors });
  process2(input, ctx);
  extractDefs(ctx, input);
  return finalize(ctx, input);
}
var formatMap, stringProcessor = (schema, ctx, _json, _params) => {
  const json = _json;
  json.type = "string";
  const { minimum, maximum, format, patterns, contentEncoding } = schema._zod.bag;
  if (typeof minimum === "number")
    json.minLength = minimum;
  if (typeof maximum === "number")
    json.maxLength = maximum;
  if (format) {
    json.format = formatMap[format] ?? format;
    if (json.format === "")
      delete json.format;
    if (format === "time") {
      delete json.format;
    }
  }
  if (contentEncoding)
    json.contentEncoding = contentEncoding;
  if (patterns && patterns.size > 0) {
    const regexes = [...patterns];
    if (regexes.length === 1)
      json.pattern = regexes[0].source;
    else if (regexes.length > 1) {
      json.allOf = [
        ...regexes.map((regex) => ({
          ...ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0" ? { type: "string" } : {},
          pattern: regex.source
        }))
      ];
    }
  }
}, numberProcessor = (schema, ctx, _json, _params) => {
  const json = _json;
  const { minimum, maximum, format, multipleOf, exclusiveMaximum, exclusiveMinimum } = schema._zod.bag;
  if (typeof format === "string" && format.includes("int"))
    json.type = "integer";
  else
    json.type = "number";
  const exMin = typeof exclusiveMinimum === "number" && exclusiveMinimum >= (minimum ?? Number.NEGATIVE_INFINITY);
  const exMax = typeof exclusiveMaximum === "number" && exclusiveMaximum <= (maximum ?? Number.POSITIVE_INFINITY);
  const legacy = ctx.target === "draft-04" || ctx.target === "openapi-3.0";
  if (exMin) {
    if (legacy) {
      json.minimum = exclusiveMinimum;
      json.exclusiveMinimum = true;
    } else {
      json.exclusiveMinimum = exclusiveMinimum;
    }
  } else if (typeof minimum === "number") {
    json.minimum = minimum;
  }
  if (exMax) {
    if (legacy) {
      json.maximum = exclusiveMaximum;
      json.exclusiveMaximum = true;
    } else {
      json.exclusiveMaximum = exclusiveMaximum;
    }
  } else if (typeof maximum === "number") {
    json.maximum = maximum;
  }
  if (typeof multipleOf === "number")
    json.multipleOf = multipleOf;
}, booleanProcessor = (_schema, _ctx, json, _params) => {
  json.type = "boolean";
}, bigintProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("BigInt cannot be represented in JSON Schema");
  }
}, symbolProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Symbols cannot be represented in JSON Schema");
  }
}, nullProcessor = (_schema, ctx, json, _params) => {
  if (ctx.target === "openapi-3.0") {
    json.type = "string";
    json.nullable = true;
    json.enum = [null];
  } else {
    json.type = "null";
  }
}, undefinedProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Undefined cannot be represented in JSON Schema");
  }
}, voidProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Void cannot be represented in JSON Schema");
  }
}, neverProcessor = (_schema, _ctx, json, _params) => {
  json.not = {};
}, anyProcessor = (_schema, _ctx, _json, _params) => {}, unknownProcessor = (_schema, _ctx, _json, _params) => {}, dateProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Date cannot be represented in JSON Schema");
  }
}, enumProcessor = (schema, _ctx, json, _params) => {
  const def = schema._zod.def;
  const values = getEnumValues(def.entries);
  if (values.every((v) => typeof v === "number"))
    json.type = "number";
  if (values.every((v) => typeof v === "string"))
    json.type = "string";
  json.enum = values;
}, literalProcessor = (schema, ctx, json, _params) => {
  const def = schema._zod.def;
  const vals = [];
  for (const val of def.values) {
    if (val === undefined) {
      if (ctx.unrepresentable === "throw") {
        throw new Error("Literal `undefined` cannot be represented in JSON Schema");
      }
    } else if (typeof val === "bigint") {
      if (ctx.unrepresentable === "throw") {
        throw new Error("BigInt literals cannot be represented in JSON Schema");
      } else {
        vals.push(Number(val));
      }
    } else {
      vals.push(val);
    }
  }
  if (vals.length === 0) {} else if (vals.length === 1) {
    const val = vals[0];
    json.type = val === null ? "null" : typeof val;
    if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") {
      json.enum = [val];
    } else {
      json.const = val;
    }
  } else {
    if (vals.every((v) => typeof v === "number"))
      json.type = "number";
    if (vals.every((v) => typeof v === "string"))
      json.type = "string";
    if (vals.every((v) => typeof v === "boolean"))
      json.type = "boolean";
    if (vals.every((v) => v === null))
      json.type = "null";
    json.enum = vals;
  }
}, nanProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("NaN cannot be represented in JSON Schema");
  }
}, templateLiteralProcessor = (schema, _ctx, json, _params) => {
  const _json = json;
  const pattern = schema._zod.pattern;
  if (!pattern)
    throw new Error("Pattern not found in template literal");
  _json.type = "string";
  _json.pattern = pattern.source;
}, fileProcessor = (schema, _ctx, json, _params) => {
  const _json = json;
  const file = {
    type: "string",
    format: "binary",
    contentEncoding: "binary"
  };
  const { minimum, maximum, mime } = schema._zod.bag;
  if (minimum !== undefined)
    file.minLength = minimum;
  if (maximum !== undefined)
    file.maxLength = maximum;
  if (mime) {
    if (mime.length === 1) {
      file.contentMediaType = mime[0];
      Object.assign(_json, file);
    } else {
      Object.assign(_json, file);
      _json.anyOf = mime.map((m) => ({ contentMediaType: m }));
    }
  } else {
    Object.assign(_json, file);
  }
}, successProcessor = (_schema, _ctx, json, _params) => {
  json.type = "boolean";
}, customProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Custom types cannot be represented in JSON Schema");
  }
}, functionProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Function types cannot be represented in JSON Schema");
  }
}, transformProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Transforms cannot be represented in JSON Schema");
  }
}, mapProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Map cannot be represented in JSON Schema");
  }
}, setProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Set cannot be represented in JSON Schema");
  }
}, arrayProcessor = (schema, ctx, _json, params) => {
  const json = _json;
  const def = schema._zod.def;
  const { minimum, maximum } = schema._zod.bag;
  if (typeof minimum === "number")
    json.minItems = minimum;
  if (typeof maximum === "number")
    json.maxItems = maximum;
  json.type = "array";
  json.items = process2(def.element, ctx, {
    ...params,
    path: [...params.path, "items"]
  });
}, objectProcessor = (schema, ctx, _json, params) => {
  const json = _json;
  const def = schema._zod.def;
  json.type = "object";
  json.properties = {};
  const shape = def.shape;
  for (const key in shape) {
    json.properties[key] = process2(shape[key], ctx, {
      ...params,
      path: [...params.path, "properties", key]
    });
  }
  const allKeys = new Set(Object.keys(shape));
  const requiredKeys = new Set([...allKeys].filter((key) => {
    const v = def.shape[key]._zod;
    if (ctx.io === "input") {
      return v.optin === undefined;
    } else {
      return v.optout === undefined;
    }
  }));
  if (requiredKeys.size > 0) {
    json.required = Array.from(requiredKeys);
  }
  if (def.catchall?._zod.def.type === "never") {
    json.additionalProperties = false;
  } else if (!def.catchall) {
    if (ctx.io === "output")
      json.additionalProperties = false;
  } else if (def.catchall) {
    json.additionalProperties = process2(def.catchall, ctx, {
      ...params,
      path: [...params.path, "additionalProperties"]
    });
  }
}, unionProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  const isExclusive = def.inclusive === false;
  const options = def.options.map((x, i) => process2(x, ctx, {
    ...params,
    path: [...params.path, isExclusive ? "oneOf" : "anyOf", i]
  }));
  if (isExclusive) {
    json.oneOf = options;
  } else {
    json.anyOf = options;
  }
}, intersectionProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  const a = process2(def.left, ctx, {
    ...params,
    path: [...params.path, "allOf", 0]
  });
  const b = process2(def.right, ctx, {
    ...params,
    path: [...params.path, "allOf", 1]
  });
  const isSimpleIntersection = (val) => ("allOf" in val) && Object.keys(val).length === 1;
  const allOf = [
    ...isSimpleIntersection(a) ? a.allOf : [a],
    ...isSimpleIntersection(b) ? b.allOf : [b]
  ];
  json.allOf = allOf;
}, tupleProcessor = (schema, ctx, _json, params) => {
  const json = _json;
  const def = schema._zod.def;
  json.type = "array";
  const prefixPath = ctx.target === "draft-2020-12" ? "prefixItems" : "items";
  const restPath = ctx.target === "draft-2020-12" ? "items" : ctx.target === "openapi-3.0" ? "items" : "additionalItems";
  const prefixItems = def.items.map((x, i) => process2(x, ctx, {
    ...params,
    path: [...params.path, prefixPath, i]
  }));
  const rest = def.rest ? process2(def.rest, ctx, {
    ...params,
    path: [...params.path, restPath, ...ctx.target === "openapi-3.0" ? [def.items.length] : []]
  }) : null;
  if (ctx.target === "draft-2020-12") {
    json.prefixItems = prefixItems;
    if (rest) {
      json.items = rest;
    }
  } else if (ctx.target === "openapi-3.0") {
    json.items = {
      anyOf: prefixItems
    };
    if (rest) {
      json.items.anyOf.push(rest);
    }
    json.minItems = prefixItems.length;
    if (!rest) {
      json.maxItems = prefixItems.length;
    }
  } else {
    json.items = prefixItems;
    if (rest) {
      json.additionalItems = rest;
    }
  }
  const { minimum, maximum } = schema._zod.bag;
  if (typeof minimum === "number")
    json.minItems = minimum;
  if (typeof maximum === "number")
    json.maxItems = maximum;
}, recordProcessor = (schema, ctx, _json, params) => {
  const json = _json;
  const def = schema._zod.def;
  json.type = "object";
  const keyType = def.keyType;
  const keyBag = keyType._zod.bag;
  const patterns = keyBag?.patterns;
  if (def.mode === "loose" && patterns && patterns.size > 0) {
    const valueSchema = process2(def.valueType, ctx, {
      ...params,
      path: [...params.path, "patternProperties", "*"]
    });
    json.patternProperties = {};
    for (const pattern of patterns) {
      json.patternProperties[pattern.source] = valueSchema;
    }
  } else {
    if (ctx.target === "draft-07" || ctx.target === "draft-2020-12") {
      json.propertyNames = process2(def.keyType, ctx, {
        ...params,
        path: [...params.path, "propertyNames"]
      });
    }
    json.additionalProperties = process2(def.valueType, ctx, {
      ...params,
      path: [...params.path, "additionalProperties"]
    });
  }
  const keyValues = keyType._zod.values;
  if (keyValues) {
    const validKeyValues = [...keyValues].filter((v) => typeof v === "string" || typeof v === "number");
    if (validKeyValues.length > 0) {
      json.required = validKeyValues;
    }
  }
}, nullableProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  const inner = process2(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  if (ctx.target === "openapi-3.0") {
    seen.ref = def.innerType;
    json.nullable = true;
  } else {
    json.anyOf = [inner, { type: "null" }];
  }
}, nonoptionalProcessor = (schema, ctx, _json, params) => {
  const def = schema._zod.def;
  process2(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
}, defaultProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  process2(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  json.default = JSON.parse(JSON.stringify(def.defaultValue));
}, prefaultProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  process2(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  if (ctx.io === "input")
    json._prefault = JSON.parse(JSON.stringify(def.defaultValue));
}, catchProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  process2(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  let catchValue;
  try {
    catchValue = def.catchValue(undefined);
  } catch {
    throw new Error("Dynamic catch values are not supported in JSON Schema");
  }
  json.default = catchValue;
}, pipeProcessor = (schema, ctx, _json, params) => {
  const def = schema._zod.def;
  const inIsTransform = def.in._zod.traits.has("$ZodTransform");
  const innerType = ctx.io === "input" ? inIsTransform ? def.out : def.in : def.out;
  process2(innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = innerType;
}, readonlyProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  process2(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  json.readOnly = true;
}, promiseProcessor = (schema, ctx, _json, params) => {
  const def = schema._zod.def;
  process2(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
}, optionalProcessor = (schema, ctx, _json, params) => {
  const def = schema._zod.def;
  process2(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
}, lazyProcessor = (schema, ctx, _json, params) => {
  const innerType = schema._zod.innerType;
  process2(innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = innerType;
}, allProcessors;
var init_json_schema_processors = __esm(() => {
  init_to_json_schema();
  init_util();
  formatMap = {
    guid: "uuid",
    url: "uri",
    datetime: "date-time",
    json_string: "json-string",
    regex: ""
  };
  allProcessors = {
    string: stringProcessor,
    number: numberProcessor,
    boolean: booleanProcessor,
    bigint: bigintProcessor,
    symbol: symbolProcessor,
    null: nullProcessor,
    undefined: undefinedProcessor,
    void: voidProcessor,
    never: neverProcessor,
    any: anyProcessor,
    unknown: unknownProcessor,
    date: dateProcessor,
    enum: enumProcessor,
    literal: literalProcessor,
    nan: nanProcessor,
    template_literal: templateLiteralProcessor,
    file: fileProcessor,
    success: successProcessor,
    custom: customProcessor,
    function: functionProcessor,
    transform: transformProcessor,
    map: mapProcessor,
    set: setProcessor,
    array: arrayProcessor,
    object: objectProcessor,
    union: unionProcessor,
    intersection: intersectionProcessor,
    tuple: tupleProcessor,
    record: recordProcessor,
    nullable: nullableProcessor,
    nonoptional: nonoptionalProcessor,
    default: defaultProcessor,
    prefault: prefaultProcessor,
    catch: catchProcessor,
    pipe: pipeProcessor,
    readonly: readonlyProcessor,
    promise: promiseProcessor,
    optional: optionalProcessor,
    lazy: lazyProcessor
  };
});

// node_modules/zod/v4/core/json-schema-generator.js
class JSONSchemaGenerator {
  get metadataRegistry() {
    return this.ctx.metadataRegistry;
  }
  get target() {
    return this.ctx.target;
  }
  get unrepresentable() {
    return this.ctx.unrepresentable;
  }
  get override() {
    return this.ctx.override;
  }
  get io() {
    return this.ctx.io;
  }
  get counter() {
    return this.ctx.counter;
  }
  set counter(value) {
    this.ctx.counter = value;
  }
  get seen() {
    return this.ctx.seen;
  }
  constructor(params) {
    let normalizedTarget = params?.target ?? "draft-2020-12";
    if (normalizedTarget === "draft-4")
      normalizedTarget = "draft-04";
    if (normalizedTarget === "draft-7")
      normalizedTarget = "draft-07";
    this.ctx = initializeContext({
      processors: allProcessors,
      target: normalizedTarget,
      ...params?.metadata && { metadata: params.metadata },
      ...params?.unrepresentable && { unrepresentable: params.unrepresentable },
      ...params?.override && { override: params.override },
      ...params?.io && { io: params.io }
    });
  }
  process(schema, _params = { path: [], schemaPath: [] }) {
    return process2(schema, this.ctx, _params);
  }
  emit(schema, _params) {
    if (_params) {
      if (_params.cycles)
        this.ctx.cycles = _params.cycles;
      if (_params.reused)
        this.ctx.reused = _params.reused;
      if (_params.external)
        this.ctx.external = _params.external;
    }
    extractDefs(this.ctx, schema);
    const result = finalize(this.ctx, schema);
    const { "~standard": _, ...plainResult } = result;
    return plainResult;
  }
}
var init_json_schema_generator = __esm(() => {
  init_json_schema_processors();
  init_to_json_schema();
});

// node_modules/zod/v4/core/json-schema.js
var exports_json_schema = {};
var init_json_schema = () => {};

// node_modules/zod/v4/core/index.js
var exports_core2 = {};
__export(exports_core2, {
  version: () => version,
  util: () => exports_util,
  treeifyError: () => treeifyError,
  toJSONSchema: () => toJSONSchema,
  toDotPath: () => toDotPath,
  safeParseAsync: () => safeParseAsync,
  safeParse: () => safeParse,
  safeEncodeAsync: () => safeEncodeAsync,
  safeEncode: () => safeEncode,
  safeDecodeAsync: () => safeDecodeAsync,
  safeDecode: () => safeDecode,
  registry: () => registry,
  regexes: () => exports_regexes,
  process: () => process2,
  prettifyError: () => prettifyError,
  parseAsync: () => parseAsync,
  parse: () => parse,
  meta: () => meta,
  locales: () => exports_locales,
  isValidJWT: () => isValidJWT,
  isValidBase64URL: () => isValidBase64URL,
  isValidBase64: () => isValidBase64,
  initializeContext: () => initializeContext,
  globalRegistry: () => globalRegistry,
  globalConfig: () => globalConfig,
  formatError: () => formatError,
  flattenError: () => flattenError,
  finalize: () => finalize,
  extractDefs: () => extractDefs,
  encodeAsync: () => encodeAsync,
  encode: () => encode,
  describe: () => describe,
  decodeAsync: () => decodeAsync,
  decode: () => decode,
  createToJSONSchemaMethod: () => createToJSONSchemaMethod,
  createStandardJSONSchemaMethod: () => createStandardJSONSchemaMethod,
  config: () => config,
  clone: () => clone,
  _xor: () => _xor,
  _xid: () => _xid,
  _void: () => _void,
  _uuidv7: () => _uuidv7,
  _uuidv6: () => _uuidv6,
  _uuidv4: () => _uuidv4,
  _uuid: () => _uuid,
  _url: () => _url,
  _uppercase: () => _uppercase,
  _unknown: () => _unknown,
  _union: () => _union,
  _undefined: () => _undefined2,
  _ulid: () => _ulid,
  _uint64: () => _uint64,
  _uint32: () => _uint32,
  _tuple: () => _tuple,
  _trim: () => _trim,
  _transform: () => _transform,
  _toUpperCase: () => _toUpperCase,
  _toLowerCase: () => _toLowerCase,
  _templateLiteral: () => _templateLiteral,
  _symbol: () => _symbol,
  _superRefine: () => _superRefine,
  _success: () => _success,
  _stringbool: () => _stringbool,
  _stringFormat: () => _stringFormat,
  _string: () => _string,
  _startsWith: () => _startsWith,
  _slugify: () => _slugify,
  _size: () => _size,
  _set: () => _set,
  _safeParseAsync: () => _safeParseAsync,
  _safeParse: () => _safeParse,
  _safeEncodeAsync: () => _safeEncodeAsync,
  _safeEncode: () => _safeEncode,
  _safeDecodeAsync: () => _safeDecodeAsync,
  _safeDecode: () => _safeDecode,
  _regex: () => _regex,
  _refine: () => _refine,
  _record: () => _record,
  _readonly: () => _readonly,
  _property: () => _property,
  _promise: () => _promise,
  _positive: () => _positive,
  _pipe: () => _pipe,
  _parseAsync: () => _parseAsync,
  _parse: () => _parse,
  _overwrite: () => _overwrite,
  _optional: () => _optional,
  _number: () => _number,
  _nullable: () => _nullable,
  _null: () => _null2,
  _normalize: () => _normalize,
  _nonpositive: () => _nonpositive,
  _nonoptional: () => _nonoptional,
  _nonnegative: () => _nonnegative,
  _never: () => _never,
  _negative: () => _negative,
  _nativeEnum: () => _nativeEnum,
  _nanoid: () => _nanoid,
  _nan: () => _nan,
  _multipleOf: () => _multipleOf,
  _minSize: () => _minSize,
  _minLength: () => _minLength,
  _min: () => _gte,
  _mime: () => _mime,
  _maxSize: () => _maxSize,
  _maxLength: () => _maxLength,
  _max: () => _lte,
  _map: () => _map,
  _mac: () => _mac,
  _lte: () => _lte,
  _lt: () => _lt,
  _lowercase: () => _lowercase,
  _literal: () => _literal,
  _length: () => _length,
  _lazy: () => _lazy,
  _ksuid: () => _ksuid,
  _jwt: () => _jwt,
  _isoTime: () => _isoTime,
  _isoDuration: () => _isoDuration,
  _isoDateTime: () => _isoDateTime,
  _isoDate: () => _isoDate,
  _ipv6: () => _ipv6,
  _ipv4: () => _ipv4,
  _intersection: () => _intersection,
  _int64: () => _int64,
  _int32: () => _int32,
  _int: () => _int,
  _includes: () => _includes,
  _guid: () => _guid,
  _gte: () => _gte,
  _gt: () => _gt,
  _float64: () => _float64,
  _float32: () => _float32,
  _file: () => _file,
  _enum: () => _enum,
  _endsWith: () => _endsWith,
  _encodeAsync: () => _encodeAsync,
  _encode: () => _encode,
  _emoji: () => _emoji2,
  _email: () => _email,
  _e164: () => _e164,
  _discriminatedUnion: () => _discriminatedUnion,
  _default: () => _default,
  _decodeAsync: () => _decodeAsync,
  _decode: () => _decode,
  _date: () => _date,
  _custom: () => _custom,
  _cuid2: () => _cuid2,
  _cuid: () => _cuid,
  _coercedString: () => _coercedString,
  _coercedNumber: () => _coercedNumber,
  _coercedDate: () => _coercedDate,
  _coercedBoolean: () => _coercedBoolean,
  _coercedBigint: () => _coercedBigint,
  _cidrv6: () => _cidrv6,
  _cidrv4: () => _cidrv4,
  _check: () => _check,
  _catch: () => _catch,
  _boolean: () => _boolean,
  _bigint: () => _bigint,
  _base64url: () => _base64url,
  _base64: () => _base64,
  _array: () => _array,
  _any: () => _any,
  TimePrecision: () => TimePrecision,
  NEVER: () => NEVER,
  JSONSchemaGenerator: () => JSONSchemaGenerator,
  JSONSchema: () => exports_json_schema,
  Doc: () => Doc,
  $output: () => $output,
  $input: () => $input,
  $constructor: () => $constructor,
  $brand: () => $brand,
  $ZodXor: () => $ZodXor,
  $ZodXID: () => $ZodXID,
  $ZodVoid: () => $ZodVoid,
  $ZodUnknown: () => $ZodUnknown,
  $ZodUnion: () => $ZodUnion,
  $ZodUndefined: () => $ZodUndefined,
  $ZodUUID: () => $ZodUUID,
  $ZodURL: () => $ZodURL,
  $ZodULID: () => $ZodULID,
  $ZodType: () => $ZodType,
  $ZodTuple: () => $ZodTuple,
  $ZodTransform: () => $ZodTransform,
  $ZodTemplateLiteral: () => $ZodTemplateLiteral,
  $ZodSymbol: () => $ZodSymbol,
  $ZodSuccess: () => $ZodSuccess,
  $ZodStringFormat: () => $ZodStringFormat,
  $ZodString: () => $ZodString,
  $ZodSet: () => $ZodSet,
  $ZodRegistry: () => $ZodRegistry,
  $ZodRecord: () => $ZodRecord,
  $ZodRealError: () => $ZodRealError,
  $ZodReadonly: () => $ZodReadonly,
  $ZodPromise: () => $ZodPromise,
  $ZodPreprocess: () => $ZodPreprocess,
  $ZodPrefault: () => $ZodPrefault,
  $ZodPipe: () => $ZodPipe,
  $ZodOptional: () => $ZodOptional,
  $ZodObjectJIT: () => $ZodObjectJIT,
  $ZodObject: () => $ZodObject,
  $ZodNumberFormat: () => $ZodNumberFormat,
  $ZodNumber: () => $ZodNumber,
  $ZodNullable: () => $ZodNullable,
  $ZodNull: () => $ZodNull,
  $ZodNonOptional: () => $ZodNonOptional,
  $ZodNever: () => $ZodNever,
  $ZodNanoID: () => $ZodNanoID,
  $ZodNaN: () => $ZodNaN,
  $ZodMap: () => $ZodMap,
  $ZodMAC: () => $ZodMAC,
  $ZodLiteral: () => $ZodLiteral,
  $ZodLazy: () => $ZodLazy,
  $ZodKSUID: () => $ZodKSUID,
  $ZodJWT: () => $ZodJWT,
  $ZodIntersection: () => $ZodIntersection,
  $ZodISOTime: () => $ZodISOTime,
  $ZodISODuration: () => $ZodISODuration,
  $ZodISODateTime: () => $ZodISODateTime,
  $ZodISODate: () => $ZodISODate,
  $ZodIPv6: () => $ZodIPv6,
  $ZodIPv4: () => $ZodIPv4,
  $ZodGUID: () => $ZodGUID,
  $ZodFunction: () => $ZodFunction,
  $ZodFile: () => $ZodFile,
  $ZodExactOptional: () => $ZodExactOptional,
  $ZodError: () => $ZodError,
  $ZodEnum: () => $ZodEnum,
  $ZodEncodeError: () => $ZodEncodeError,
  $ZodEmoji: () => $ZodEmoji,
  $ZodEmail: () => $ZodEmail,
  $ZodE164: () => $ZodE164,
  $ZodDiscriminatedUnion: () => $ZodDiscriminatedUnion,
  $ZodDefault: () => $ZodDefault,
  $ZodDate: () => $ZodDate,
  $ZodCustomStringFormat: () => $ZodCustomStringFormat,
  $ZodCustom: () => $ZodCustom,
  $ZodCodec: () => $ZodCodec,
  $ZodCheckUpperCase: () => $ZodCheckUpperCase,
  $ZodCheckStringFormat: () => $ZodCheckStringFormat,
  $ZodCheckStartsWith: () => $ZodCheckStartsWith,
  $ZodCheckSizeEquals: () => $ZodCheckSizeEquals,
  $ZodCheckRegex: () => $ZodCheckRegex,
  $ZodCheckProperty: () => $ZodCheckProperty,
  $ZodCheckOverwrite: () => $ZodCheckOverwrite,
  $ZodCheckNumberFormat: () => $ZodCheckNumberFormat,
  $ZodCheckMultipleOf: () => $ZodCheckMultipleOf,
  $ZodCheckMinSize: () => $ZodCheckMinSize,
  $ZodCheckMinLength: () => $ZodCheckMinLength,
  $ZodCheckMimeType: () => $ZodCheckMimeType,
  $ZodCheckMaxSize: () => $ZodCheckMaxSize,
  $ZodCheckMaxLength: () => $ZodCheckMaxLength,
  $ZodCheckLowerCase: () => $ZodCheckLowerCase,
  $ZodCheckLessThan: () => $ZodCheckLessThan,
  $ZodCheckLengthEquals: () => $ZodCheckLengthEquals,
  $ZodCheckIncludes: () => $ZodCheckIncludes,
  $ZodCheckGreaterThan: () => $ZodCheckGreaterThan,
  $ZodCheckEndsWith: () => $ZodCheckEndsWith,
  $ZodCheckBigIntFormat: () => $ZodCheckBigIntFormat,
  $ZodCheck: () => $ZodCheck,
  $ZodCatch: () => $ZodCatch,
  $ZodCUID2: () => $ZodCUID2,
  $ZodCUID: () => $ZodCUID,
  $ZodCIDRv6: () => $ZodCIDRv6,
  $ZodCIDRv4: () => $ZodCIDRv4,
  $ZodBoolean: () => $ZodBoolean,
  $ZodBigIntFormat: () => $ZodBigIntFormat,
  $ZodBigInt: () => $ZodBigInt,
  $ZodBase64URL: () => $ZodBase64URL,
  $ZodBase64: () => $ZodBase64,
  $ZodAsyncError: () => $ZodAsyncError,
  $ZodArray: () => $ZodArray,
  $ZodAny: () => $ZodAny
});
var init_core2 = __esm(() => {
  init_util();
  init_regexes();
  init_locales();
  init_json_schema_processors();
  init_json_schema_generator();
  init_json_schema();
  init_core();
  init_parse();
  init_errors();
  init_schemas();
  init_checks();
  init_versions();
  init_registries();
  init_api();
  init_to_json_schema();
});

// node_modules/zod/v4/classic/checks.js
var exports_checks2 = {};
__export(exports_checks2, {
  uppercase: () => _uppercase,
  trim: () => _trim,
  toUpperCase: () => _toUpperCase,
  toLowerCase: () => _toLowerCase,
  startsWith: () => _startsWith,
  slugify: () => _slugify,
  size: () => _size,
  regex: () => _regex,
  property: () => _property,
  positive: () => _positive,
  overwrite: () => _overwrite,
  normalize: () => _normalize,
  nonpositive: () => _nonpositive,
  nonnegative: () => _nonnegative,
  negative: () => _negative,
  multipleOf: () => _multipleOf,
  minSize: () => _minSize,
  minLength: () => _minLength,
  mime: () => _mime,
  maxSize: () => _maxSize,
  maxLength: () => _maxLength,
  lte: () => _lte,
  lt: () => _lt,
  lowercase: () => _lowercase,
  length: () => _length,
  includes: () => _includes,
  gte: () => _gte,
  gt: () => _gt,
  endsWith: () => _endsWith
});
var init_checks2 = __esm(() => {
  init_core2();
});

// node_modules/zod/v4/classic/iso.js
var exports_iso = {};
__export(exports_iso, {
  time: () => time2,
  duration: () => duration2,
  datetime: () => datetime2,
  date: () => date2,
  ZodISOTime: () => ZodISOTime,
  ZodISODuration: () => ZodISODuration,
  ZodISODateTime: () => ZodISODateTime,
  ZodISODate: () => ZodISODate
});
function datetime2(params) {
  return _isoDateTime(ZodISODateTime, params);
}
function date2(params) {
  return _isoDate(ZodISODate, params);
}
function time2(params) {
  return _isoTime(ZodISOTime, params);
}
function duration2(params) {
  return _isoDuration(ZodISODuration, params);
}
var ZodISODateTime, ZodISODate, ZodISOTime, ZodISODuration;
var init_iso = __esm(() => {
  init_core2();
  init_schemas2();
  ZodISODateTime = /* @__PURE__ */ $constructor("ZodISODateTime", (inst, def) => {
    $ZodISODateTime.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodISODate = /* @__PURE__ */ $constructor("ZodISODate", (inst, def) => {
    $ZodISODate.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodISOTime = /* @__PURE__ */ $constructor("ZodISOTime", (inst, def) => {
    $ZodISOTime.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodISODuration = /* @__PURE__ */ $constructor("ZodISODuration", (inst, def) => {
    $ZodISODuration.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
});

// node_modules/zod/v4/classic/errors.js
var initializer2 = (inst, issues) => {
  $ZodError.init(inst, issues);
  inst.name = "ZodError";
  Object.defineProperties(inst, {
    format: {
      value: (mapper) => formatError(inst, mapper)
    },
    flatten: {
      value: (mapper) => flattenError(inst, mapper)
    },
    addIssue: {
      value: (issue2) => {
        inst.issues.push(issue2);
        inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
      }
    },
    addIssues: {
      value: (issues2) => {
        inst.issues.push(...issues2);
        inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
      }
    },
    isEmpty: {
      get() {
        return inst.issues.length === 0;
      }
    }
  });
}, ZodError, ZodRealError;
var init_errors2 = __esm(() => {
  init_core2();
  init_core2();
  init_util();
  ZodError = /* @__PURE__ */ $constructor("ZodError", initializer2);
  ZodRealError = /* @__PURE__ */ $constructor("ZodError", initializer2, {
    Parent: Error
  });
});

// node_modules/zod/v4/classic/parse.js
var parse3, parseAsync2, safeParse2, safeParseAsync2, encode2, decode2, encodeAsync2, decodeAsync2, safeEncode2, safeDecode2, safeEncodeAsync2, safeDecodeAsync2;
var init_parse2 = __esm(() => {
  init_core2();
  init_errors2();
  parse3 = /* @__PURE__ */ _parse(ZodRealError);
  parseAsync2 = /* @__PURE__ */ _parseAsync(ZodRealError);
  safeParse2 = /* @__PURE__ */ _safeParse(ZodRealError);
  safeParseAsync2 = /* @__PURE__ */ _safeParseAsync(ZodRealError);
  encode2 = /* @__PURE__ */ _encode(ZodRealError);
  decode2 = /* @__PURE__ */ _decode(ZodRealError);
  encodeAsync2 = /* @__PURE__ */ _encodeAsync(ZodRealError);
  decodeAsync2 = /* @__PURE__ */ _decodeAsync(ZodRealError);
  safeEncode2 = /* @__PURE__ */ _safeEncode(ZodRealError);
  safeDecode2 = /* @__PURE__ */ _safeDecode(ZodRealError);
  safeEncodeAsync2 = /* @__PURE__ */ _safeEncodeAsync(ZodRealError);
  safeDecodeAsync2 = /* @__PURE__ */ _safeDecodeAsync(ZodRealError);
});

// node_modules/zod/v4/classic/schemas.js
var exports_schemas2 = {};
__export(exports_schemas2, {
  xor: () => xor,
  xid: () => xid2,
  void: () => _void2,
  uuidv7: () => uuidv7,
  uuidv6: () => uuidv6,
  uuidv4: () => uuidv4,
  uuid: () => uuid2,
  url: () => url,
  unknown: () => unknown,
  union: () => union,
  undefined: () => _undefined3,
  ulid: () => ulid2,
  uint64: () => uint64,
  uint32: () => uint32,
  tuple: () => tuple,
  transform: () => transform,
  templateLiteral: () => templateLiteral,
  symbol: () => symbol,
  superRefine: () => superRefine,
  success: () => success,
  stringbool: () => stringbool,
  stringFormat: () => stringFormat,
  string: () => string2,
  strictObject: () => strictObject,
  set: () => set,
  refine: () => refine,
  record: () => record,
  readonly: () => readonly,
  promise: () => promise,
  preprocess: () => preprocess,
  prefault: () => prefault,
  pipe: () => pipe,
  partialRecord: () => partialRecord,
  optional: () => optional,
  object: () => object,
  number: () => number2,
  nullish: () => nullish2,
  nullable: () => nullable,
  null: () => _null3,
  nonoptional: () => nonoptional,
  never: () => never,
  nativeEnum: () => nativeEnum,
  nanoid: () => nanoid2,
  nan: () => nan,
  meta: () => meta2,
  map: () => map,
  mac: () => mac2,
  looseRecord: () => looseRecord,
  looseObject: () => looseObject,
  literal: () => literal,
  lazy: () => lazy,
  ksuid: () => ksuid2,
  keyof: () => keyof,
  jwt: () => jwt,
  json: () => json,
  ipv6: () => ipv62,
  ipv4: () => ipv42,
  invertCodec: () => invertCodec,
  intersection: () => intersection,
  int64: () => int64,
  int32: () => int32,
  int: () => int,
  instanceof: () => _instanceof,
  httpUrl: () => httpUrl,
  hostname: () => hostname2,
  hex: () => hex2,
  hash: () => hash,
  guid: () => guid2,
  function: () => _function,
  float64: () => float64,
  float32: () => float32,
  file: () => file,
  exactOptional: () => exactOptional,
  enum: () => _enum2,
  emoji: () => emoji2,
  email: () => email2,
  e164: () => e1642,
  discriminatedUnion: () => discriminatedUnion,
  describe: () => describe2,
  date: () => date3,
  custom: () => custom,
  cuid2: () => cuid22,
  cuid: () => cuid3,
  codec: () => codec,
  cidrv6: () => cidrv62,
  cidrv4: () => cidrv42,
  check: () => check,
  catch: () => _catch2,
  boolean: () => boolean2,
  bigint: () => bigint2,
  base64url: () => base64url2,
  base64: () => base642,
  array: () => array,
  any: () => any,
  _function: () => _function,
  _default: () => _default2,
  _ZodString: () => _ZodString,
  ZodXor: () => ZodXor,
  ZodXID: () => ZodXID,
  ZodVoid: () => ZodVoid,
  ZodUnknown: () => ZodUnknown,
  ZodUnion: () => ZodUnion,
  ZodUndefined: () => ZodUndefined,
  ZodUUID: () => ZodUUID,
  ZodURL: () => ZodURL,
  ZodULID: () => ZodULID,
  ZodType: () => ZodType,
  ZodTuple: () => ZodTuple,
  ZodTransform: () => ZodTransform,
  ZodTemplateLiteral: () => ZodTemplateLiteral,
  ZodSymbol: () => ZodSymbol,
  ZodSuccess: () => ZodSuccess,
  ZodStringFormat: () => ZodStringFormat,
  ZodString: () => ZodString,
  ZodSet: () => ZodSet,
  ZodRecord: () => ZodRecord,
  ZodReadonly: () => ZodReadonly,
  ZodPromise: () => ZodPromise,
  ZodPreprocess: () => ZodPreprocess,
  ZodPrefault: () => ZodPrefault,
  ZodPipe: () => ZodPipe,
  ZodOptional: () => ZodOptional,
  ZodObject: () => ZodObject,
  ZodNumberFormat: () => ZodNumberFormat,
  ZodNumber: () => ZodNumber,
  ZodNullable: () => ZodNullable,
  ZodNull: () => ZodNull,
  ZodNonOptional: () => ZodNonOptional,
  ZodNever: () => ZodNever,
  ZodNanoID: () => ZodNanoID,
  ZodNaN: () => ZodNaN,
  ZodMap: () => ZodMap,
  ZodMAC: () => ZodMAC,
  ZodLiteral: () => ZodLiteral,
  ZodLazy: () => ZodLazy,
  ZodKSUID: () => ZodKSUID,
  ZodJWT: () => ZodJWT,
  ZodIntersection: () => ZodIntersection,
  ZodIPv6: () => ZodIPv6,
  ZodIPv4: () => ZodIPv4,
  ZodGUID: () => ZodGUID,
  ZodFunction: () => ZodFunction,
  ZodFile: () => ZodFile,
  ZodExactOptional: () => ZodExactOptional,
  ZodEnum: () => ZodEnum,
  ZodEmoji: () => ZodEmoji,
  ZodEmail: () => ZodEmail,
  ZodE164: () => ZodE164,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodDefault: () => ZodDefault,
  ZodDate: () => ZodDate,
  ZodCustomStringFormat: () => ZodCustomStringFormat,
  ZodCustom: () => ZodCustom,
  ZodCodec: () => ZodCodec,
  ZodCatch: () => ZodCatch,
  ZodCUID2: () => ZodCUID2,
  ZodCUID: () => ZodCUID,
  ZodCIDRv6: () => ZodCIDRv6,
  ZodCIDRv4: () => ZodCIDRv4,
  ZodBoolean: () => ZodBoolean,
  ZodBigIntFormat: () => ZodBigIntFormat,
  ZodBigInt: () => ZodBigInt,
  ZodBase64URL: () => ZodBase64URL,
  ZodBase64: () => ZodBase64,
  ZodArray: () => ZodArray,
  ZodAny: () => ZodAny
});
function _installLazyMethods(inst, group, methods) {
  const proto = Object.getPrototypeOf(inst);
  let installed = _installedGroups.get(proto);
  if (!installed) {
    installed = new Set;
    _installedGroups.set(proto, installed);
  }
  if (installed.has(group))
    return;
  installed.add(group);
  for (const key in methods) {
    const fn = methods[key];
    Object.defineProperty(proto, key, {
      configurable: true,
      enumerable: false,
      get() {
        const bound = fn.bind(this);
        Object.defineProperty(this, key, {
          configurable: true,
          writable: true,
          enumerable: true,
          value: bound
        });
        return bound;
      },
      set(v) {
        Object.defineProperty(this, key, {
          configurable: true,
          writable: true,
          enumerable: true,
          value: v
        });
      }
    });
  }
}
function string2(params) {
  return _string(ZodString, params);
}
function email2(params) {
  return _email(ZodEmail, params);
}
function guid2(params) {
  return _guid(ZodGUID, params);
}
function uuid2(params) {
  return _uuid(ZodUUID, params);
}
function uuidv4(params) {
  return _uuidv4(ZodUUID, params);
}
function uuidv6(params) {
  return _uuidv6(ZodUUID, params);
}
function uuidv7(params) {
  return _uuidv7(ZodUUID, params);
}
function url(params) {
  return _url(ZodURL, params);
}
function httpUrl(params) {
  return _url(ZodURL, {
    protocol: exports_regexes.httpProtocol,
    hostname: exports_regexes.domain,
    ...exports_util.normalizeParams(params)
  });
}
function emoji2(params) {
  return _emoji2(ZodEmoji, params);
}
function nanoid2(params) {
  return _nanoid(ZodNanoID, params);
}
function cuid3(params) {
  return _cuid(ZodCUID, params);
}
function cuid22(params) {
  return _cuid2(ZodCUID2, params);
}
function ulid2(params) {
  return _ulid(ZodULID, params);
}
function xid2(params) {
  return _xid(ZodXID, params);
}
function ksuid2(params) {
  return _ksuid(ZodKSUID, params);
}
function ipv42(params) {
  return _ipv4(ZodIPv4, params);
}
function mac2(params) {
  return _mac(ZodMAC, params);
}
function ipv62(params) {
  return _ipv6(ZodIPv6, params);
}
function cidrv42(params) {
  return _cidrv4(ZodCIDRv4, params);
}
function cidrv62(params) {
  return _cidrv6(ZodCIDRv6, params);
}
function base642(params) {
  return _base64(ZodBase64, params);
}
function base64url2(params) {
  return _base64url(ZodBase64URL, params);
}
function e1642(params) {
  return _e164(ZodE164, params);
}
function jwt(params) {
  return _jwt(ZodJWT, params);
}
function stringFormat(format, fnOrRegex, _params = {}) {
  return _stringFormat(ZodCustomStringFormat, format, fnOrRegex, _params);
}
function hostname2(_params) {
  return _stringFormat(ZodCustomStringFormat, "hostname", exports_regexes.hostname, _params);
}
function hex2(_params) {
  return _stringFormat(ZodCustomStringFormat, "hex", exports_regexes.hex, _params);
}
function hash(alg, params) {
  const enc = params?.enc ?? "hex";
  const format = `${alg}_${enc}`;
  const regex = exports_regexes[format];
  if (!regex)
    throw new Error(`Unrecognized hash format: ${format}`);
  return _stringFormat(ZodCustomStringFormat, format, regex, params);
}
function number2(params) {
  return _number(ZodNumber, params);
}
function int(params) {
  return _int(ZodNumberFormat, params);
}
function float32(params) {
  return _float32(ZodNumberFormat, params);
}
function float64(params) {
  return _float64(ZodNumberFormat, params);
}
function int32(params) {
  return _int32(ZodNumberFormat, params);
}
function uint32(params) {
  return _uint32(ZodNumberFormat, params);
}
function boolean2(params) {
  return _boolean(ZodBoolean, params);
}
function bigint2(params) {
  return _bigint(ZodBigInt, params);
}
function int64(params) {
  return _int64(ZodBigIntFormat, params);
}
function uint64(params) {
  return _uint64(ZodBigIntFormat, params);
}
function symbol(params) {
  return _symbol(ZodSymbol, params);
}
function _undefined3(params) {
  return _undefined2(ZodUndefined, params);
}
function _null3(params) {
  return _null2(ZodNull, params);
}
function any() {
  return _any(ZodAny);
}
function unknown() {
  return _unknown(ZodUnknown);
}
function never(params) {
  return _never(ZodNever, params);
}
function _void2(params) {
  return _void(ZodVoid, params);
}
function date3(params) {
  return _date(ZodDate, params);
}
function array(element, params) {
  return _array(ZodArray, element, params);
}
function keyof(schema) {
  const shape = schema._zod.def.shape;
  return _enum2(Object.keys(shape));
}
function object(shape, params) {
  const def = {
    type: "object",
    shape: shape ?? {},
    ...exports_util.normalizeParams(params)
  };
  return new ZodObject(def);
}
function strictObject(shape, params) {
  return new ZodObject({
    type: "object",
    shape,
    catchall: never(),
    ...exports_util.normalizeParams(params)
  });
}
function looseObject(shape, params) {
  return new ZodObject({
    type: "object",
    shape,
    catchall: unknown(),
    ...exports_util.normalizeParams(params)
  });
}
function union(options, params) {
  return new ZodUnion({
    type: "union",
    options,
    ...exports_util.normalizeParams(params)
  });
}
function xor(options, params) {
  return new ZodXor({
    type: "union",
    options,
    inclusive: false,
    ...exports_util.normalizeParams(params)
  });
}
function discriminatedUnion(discriminator, options, params) {
  return new ZodDiscriminatedUnion({
    type: "union",
    options,
    discriminator,
    ...exports_util.normalizeParams(params)
  });
}
function intersection(left, right) {
  return new ZodIntersection({
    type: "intersection",
    left,
    right
  });
}
function tuple(items, _paramsOrRest, _params) {
  const hasRest = _paramsOrRest instanceof $ZodType;
  const params = hasRest ? _params : _paramsOrRest;
  const rest = hasRest ? _paramsOrRest : null;
  return new ZodTuple({
    type: "tuple",
    items,
    rest,
    ...exports_util.normalizeParams(params)
  });
}
function record(keyType, valueType, params) {
  if (!valueType || !valueType._zod) {
    return new ZodRecord({
      type: "record",
      keyType: string2(),
      valueType: keyType,
      ...exports_util.normalizeParams(valueType)
    });
  }
  return new ZodRecord({
    type: "record",
    keyType,
    valueType,
    ...exports_util.normalizeParams(params)
  });
}
function partialRecord(keyType, valueType, params) {
  const k = clone(keyType);
  k._zod.values = undefined;
  return new ZodRecord({
    type: "record",
    keyType: k,
    valueType,
    ...exports_util.normalizeParams(params)
  });
}
function looseRecord(keyType, valueType, params) {
  return new ZodRecord({
    type: "record",
    keyType,
    valueType,
    mode: "loose",
    ...exports_util.normalizeParams(params)
  });
}
function map(keyType, valueType, params) {
  return new ZodMap({
    type: "map",
    keyType,
    valueType,
    ...exports_util.normalizeParams(params)
  });
}
function set(valueType, params) {
  return new ZodSet({
    type: "set",
    valueType,
    ...exports_util.normalizeParams(params)
  });
}
function _enum2(values, params) {
  const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
  return new ZodEnum({
    type: "enum",
    entries,
    ...exports_util.normalizeParams(params)
  });
}
function nativeEnum(entries, params) {
  return new ZodEnum({
    type: "enum",
    entries,
    ...exports_util.normalizeParams(params)
  });
}
function literal(value, params) {
  return new ZodLiteral({
    type: "literal",
    values: Array.isArray(value) ? value : [value],
    ...exports_util.normalizeParams(params)
  });
}
function file(params) {
  return _file(ZodFile, params);
}
function transform(fn) {
  return new ZodTransform({
    type: "transform",
    transform: fn
  });
}
function optional(innerType) {
  return new ZodOptional({
    type: "optional",
    innerType
  });
}
function exactOptional(innerType) {
  return new ZodExactOptional({
    type: "optional",
    innerType
  });
}
function nullable(innerType) {
  return new ZodNullable({
    type: "nullable",
    innerType
  });
}
function nullish2(innerType) {
  return optional(nullable(innerType));
}
function _default2(innerType, defaultValue) {
  return new ZodDefault({
    type: "default",
    innerType,
    get defaultValue() {
      return typeof defaultValue === "function" ? defaultValue() : exports_util.shallowClone(defaultValue);
    }
  });
}
function prefault(innerType, defaultValue) {
  return new ZodPrefault({
    type: "prefault",
    innerType,
    get defaultValue() {
      return typeof defaultValue === "function" ? defaultValue() : exports_util.shallowClone(defaultValue);
    }
  });
}
function nonoptional(innerType, params) {
  return new ZodNonOptional({
    type: "nonoptional",
    innerType,
    ...exports_util.normalizeParams(params)
  });
}
function success(innerType) {
  return new ZodSuccess({
    type: "success",
    innerType
  });
}
function _catch2(innerType, catchValue) {
  return new ZodCatch({
    type: "catch",
    innerType,
    catchValue: typeof catchValue === "function" ? catchValue : () => catchValue
  });
}
function nan(params) {
  return _nan(ZodNaN, params);
}
function pipe(in_, out) {
  return new ZodPipe({
    type: "pipe",
    in: in_,
    out
  });
}
function codec(in_, out, params) {
  return new ZodCodec({
    type: "pipe",
    in: in_,
    out,
    transform: params.decode,
    reverseTransform: params.encode
  });
}
function invertCodec(codec2) {
  const def = codec2._zod.def;
  return new ZodCodec({
    type: "pipe",
    in: def.out,
    out: def.in,
    transform: def.reverseTransform,
    reverseTransform: def.transform
  });
}
function readonly(innerType) {
  return new ZodReadonly({
    type: "readonly",
    innerType
  });
}
function templateLiteral(parts, params) {
  return new ZodTemplateLiteral({
    type: "template_literal",
    parts,
    ...exports_util.normalizeParams(params)
  });
}
function lazy(getter) {
  return new ZodLazy({
    type: "lazy",
    getter
  });
}
function promise(innerType) {
  return new ZodPromise({
    type: "promise",
    innerType
  });
}
function _function(params) {
  return new ZodFunction({
    type: "function",
    input: Array.isArray(params?.input) ? tuple(params?.input) : params?.input ?? array(unknown()),
    output: params?.output ?? unknown()
  });
}
function check(fn) {
  const ch = new $ZodCheck({
    check: "custom"
  });
  ch._zod.check = fn;
  return ch;
}
function custom(fn, _params) {
  return _custom(ZodCustom, fn ?? (() => true), _params);
}
function refine(fn, _params = {}) {
  return _refine(ZodCustom, fn, _params);
}
function superRefine(fn, params) {
  return _superRefine(fn, params);
}
function _instanceof(cls, params = {}) {
  const inst = new ZodCustom({
    type: "custom",
    check: "custom",
    fn: (data) => data instanceof cls,
    abort: true,
    ...exports_util.normalizeParams(params)
  });
  inst._zod.bag.Class = cls;
  inst._zod.check = (payload) => {
    if (!(payload.value instanceof cls)) {
      payload.issues.push({
        code: "invalid_type",
        expected: cls.name,
        input: payload.value,
        inst,
        path: [...inst._zod.def.path ?? []]
      });
    }
  };
  return inst;
}
function json(params) {
  const jsonSchema = lazy(() => {
    return union([string2(params), number2(), boolean2(), _null3(), array(jsonSchema), record(string2(), jsonSchema)]);
  });
  return jsonSchema;
}
function preprocess(fn, schema) {
  return new ZodPreprocess({
    type: "pipe",
    in: transform(fn),
    out: schema
  });
}
var _installedGroups, ZodType, _ZodString, ZodString, ZodStringFormat, ZodEmail, ZodGUID, ZodUUID, ZodURL, ZodEmoji, ZodNanoID, ZodCUID, ZodCUID2, ZodULID, ZodXID, ZodKSUID, ZodIPv4, ZodMAC, ZodIPv6, ZodCIDRv4, ZodCIDRv6, ZodBase64, ZodBase64URL, ZodE164, ZodJWT, ZodCustomStringFormat, ZodNumber, ZodNumberFormat, ZodBoolean, ZodBigInt, ZodBigIntFormat, ZodSymbol, ZodUndefined, ZodNull, ZodAny, ZodUnknown, ZodNever, ZodVoid, ZodDate, ZodArray, ZodObject, ZodUnion, ZodXor, ZodDiscriminatedUnion, ZodIntersection, ZodTuple, ZodRecord, ZodMap, ZodSet, ZodEnum, ZodLiteral, ZodFile, ZodTransform, ZodOptional, ZodExactOptional, ZodNullable, ZodDefault, ZodPrefault, ZodNonOptional, ZodSuccess, ZodCatch, ZodNaN, ZodPipe, ZodCodec, ZodPreprocess, ZodReadonly, ZodTemplateLiteral, ZodLazy, ZodPromise, ZodFunction, ZodCustom, describe2, meta2, stringbool = (...args) => _stringbool({
  Codec: ZodCodec,
  Boolean: ZodBoolean,
  String: ZodString
}, ...args);
var init_schemas2 = __esm(() => {
  init_core2();
  init_core2();
  init_json_schema_processors();
  init_to_json_schema();
  init_checks2();
  init_iso();
  init_parse2();
  _installedGroups = /* @__PURE__ */ new WeakMap;
  ZodType = /* @__PURE__ */ $constructor("ZodType", (inst, def) => {
    $ZodType.init(inst, def);
    Object.assign(inst["~standard"], {
      jsonSchema: {
        input: createStandardJSONSchemaMethod(inst, "input"),
        output: createStandardJSONSchemaMethod(inst, "output")
      }
    });
    inst.toJSONSchema = createToJSONSchemaMethod(inst, {});
    inst.def = def;
    inst.type = def.type;
    Object.defineProperty(inst, "_def", { value: def });
    inst.parse = (data, params) => parse3(inst, data, params, { callee: inst.parse });
    inst.safeParse = (data, params) => safeParse2(inst, data, params);
    inst.parseAsync = async (data, params) => parseAsync2(inst, data, params, { callee: inst.parseAsync });
    inst.safeParseAsync = async (data, params) => safeParseAsync2(inst, data, params);
    inst.spa = inst.safeParseAsync;
    inst.encode = (data, params) => encode2(inst, data, params);
    inst.decode = (data, params) => decode2(inst, data, params);
    inst.encodeAsync = async (data, params) => encodeAsync2(inst, data, params);
    inst.decodeAsync = async (data, params) => decodeAsync2(inst, data, params);
    inst.safeEncode = (data, params) => safeEncode2(inst, data, params);
    inst.safeDecode = (data, params) => safeDecode2(inst, data, params);
    inst.safeEncodeAsync = async (data, params) => safeEncodeAsync2(inst, data, params);
    inst.safeDecodeAsync = async (data, params) => safeDecodeAsync2(inst, data, params);
    _installLazyMethods(inst, "ZodType", {
      check(...chks) {
        const def2 = this.def;
        return this.clone(exports_util.mergeDefs(def2, {
          checks: [
            ...def2.checks ?? [],
            ...chks.map((ch) => typeof ch === "function" ? { _zod: { check: ch, def: { check: "custom" }, onattach: [] } } : ch)
          ]
        }), { parent: true });
      },
      with(...chks) {
        return this.check(...chks);
      },
      clone(def2, params) {
        return clone(this, def2, params);
      },
      brand() {
        return this;
      },
      register(reg, meta2) {
        reg.add(this, meta2);
        return this;
      },
      refine(check, params) {
        return this.check(refine(check, params));
      },
      superRefine(refinement, params) {
        return this.check(superRefine(refinement, params));
      },
      overwrite(fn) {
        return this.check(_overwrite(fn));
      },
      optional() {
        return optional(this);
      },
      exactOptional() {
        return exactOptional(this);
      },
      nullable() {
        return nullable(this);
      },
      nullish() {
        return optional(nullable(this));
      },
      nonoptional(params) {
        return nonoptional(this, params);
      },
      array() {
        return array(this);
      },
      or(arg) {
        return union([this, arg]);
      },
      and(arg) {
        return intersection(this, arg);
      },
      transform(tx) {
        return pipe(this, transform(tx));
      },
      default(d) {
        return _default2(this, d);
      },
      prefault(d) {
        return prefault(this, d);
      },
      catch(params) {
        return _catch2(this, params);
      },
      pipe(target) {
        return pipe(this, target);
      },
      readonly() {
        return readonly(this);
      },
      describe(description) {
        const cl = this.clone();
        globalRegistry.add(cl, { description });
        return cl;
      },
      meta(...args) {
        if (args.length === 0)
          return globalRegistry.get(this);
        const cl = this.clone();
        globalRegistry.add(cl, args[0]);
        return cl;
      },
      isOptional() {
        return this.safeParse(undefined).success;
      },
      isNullable() {
        return this.safeParse(null).success;
      },
      apply(fn) {
        return fn(this);
      }
    });
    Object.defineProperty(inst, "description", {
      get() {
        return globalRegistry.get(inst)?.description;
      },
      configurable: true
    });
    return inst;
  });
  _ZodString = /* @__PURE__ */ $constructor("_ZodString", (inst, def) => {
    $ZodString.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => stringProcessor(inst, ctx, json, params);
    const bag = inst._zod.bag;
    inst.format = bag.format ?? null;
    inst.minLength = bag.minimum ?? null;
    inst.maxLength = bag.maximum ?? null;
    _installLazyMethods(inst, "_ZodString", {
      regex(...args) {
        return this.check(_regex(...args));
      },
      includes(...args) {
        return this.check(_includes(...args));
      },
      startsWith(...args) {
        return this.check(_startsWith(...args));
      },
      endsWith(...args) {
        return this.check(_endsWith(...args));
      },
      min(...args) {
        return this.check(_minLength(...args));
      },
      max(...args) {
        return this.check(_maxLength(...args));
      },
      length(...args) {
        return this.check(_length(...args));
      },
      nonempty(...args) {
        return this.check(_minLength(1, ...args));
      },
      lowercase(params) {
        return this.check(_lowercase(params));
      },
      uppercase(params) {
        return this.check(_uppercase(params));
      },
      trim() {
        return this.check(_trim());
      },
      normalize(...args) {
        return this.check(_normalize(...args));
      },
      toLowerCase() {
        return this.check(_toLowerCase());
      },
      toUpperCase() {
        return this.check(_toUpperCase());
      },
      slugify() {
        return this.check(_slugify());
      }
    });
  });
  ZodString = /* @__PURE__ */ $constructor("ZodString", (inst, def) => {
    $ZodString.init(inst, def);
    _ZodString.init(inst, def);
    inst.email = (params) => inst.check(_email(ZodEmail, params));
    inst.url = (params) => inst.check(_url(ZodURL, params));
    inst.jwt = (params) => inst.check(_jwt(ZodJWT, params));
    inst.emoji = (params) => inst.check(_emoji2(ZodEmoji, params));
    inst.guid = (params) => inst.check(_guid(ZodGUID, params));
    inst.uuid = (params) => inst.check(_uuid(ZodUUID, params));
    inst.uuidv4 = (params) => inst.check(_uuidv4(ZodUUID, params));
    inst.uuidv6 = (params) => inst.check(_uuidv6(ZodUUID, params));
    inst.uuidv7 = (params) => inst.check(_uuidv7(ZodUUID, params));
    inst.nanoid = (params) => inst.check(_nanoid(ZodNanoID, params));
    inst.guid = (params) => inst.check(_guid(ZodGUID, params));
    inst.cuid = (params) => inst.check(_cuid(ZodCUID, params));
    inst.cuid2 = (params) => inst.check(_cuid2(ZodCUID2, params));
    inst.ulid = (params) => inst.check(_ulid(ZodULID, params));
    inst.base64 = (params) => inst.check(_base64(ZodBase64, params));
    inst.base64url = (params) => inst.check(_base64url(ZodBase64URL, params));
    inst.xid = (params) => inst.check(_xid(ZodXID, params));
    inst.ksuid = (params) => inst.check(_ksuid(ZodKSUID, params));
    inst.ipv4 = (params) => inst.check(_ipv4(ZodIPv4, params));
    inst.ipv6 = (params) => inst.check(_ipv6(ZodIPv6, params));
    inst.cidrv4 = (params) => inst.check(_cidrv4(ZodCIDRv4, params));
    inst.cidrv6 = (params) => inst.check(_cidrv6(ZodCIDRv6, params));
    inst.e164 = (params) => inst.check(_e164(ZodE164, params));
    inst.datetime = (params) => inst.check(datetime2(params));
    inst.date = (params) => inst.check(date2(params));
    inst.time = (params) => inst.check(time2(params));
    inst.duration = (params) => inst.check(duration2(params));
  });
  ZodStringFormat = /* @__PURE__ */ $constructor("ZodStringFormat", (inst, def) => {
    $ZodStringFormat.init(inst, def);
    _ZodString.init(inst, def);
  });
  ZodEmail = /* @__PURE__ */ $constructor("ZodEmail", (inst, def) => {
    $ZodEmail.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodGUID = /* @__PURE__ */ $constructor("ZodGUID", (inst, def) => {
    $ZodGUID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodUUID = /* @__PURE__ */ $constructor("ZodUUID", (inst, def) => {
    $ZodUUID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodURL = /* @__PURE__ */ $constructor("ZodURL", (inst, def) => {
    $ZodURL.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodEmoji = /* @__PURE__ */ $constructor("ZodEmoji", (inst, def) => {
    $ZodEmoji.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodNanoID = /* @__PURE__ */ $constructor("ZodNanoID", (inst, def) => {
    $ZodNanoID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodCUID = /* @__PURE__ */ $constructor("ZodCUID", (inst, def) => {
    $ZodCUID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodCUID2 = /* @__PURE__ */ $constructor("ZodCUID2", (inst, def) => {
    $ZodCUID2.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodULID = /* @__PURE__ */ $constructor("ZodULID", (inst, def) => {
    $ZodULID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodXID = /* @__PURE__ */ $constructor("ZodXID", (inst, def) => {
    $ZodXID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodKSUID = /* @__PURE__ */ $constructor("ZodKSUID", (inst, def) => {
    $ZodKSUID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodIPv4 = /* @__PURE__ */ $constructor("ZodIPv4", (inst, def) => {
    $ZodIPv4.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodMAC = /* @__PURE__ */ $constructor("ZodMAC", (inst, def) => {
    $ZodMAC.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodIPv6 = /* @__PURE__ */ $constructor("ZodIPv6", (inst, def) => {
    $ZodIPv6.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodCIDRv4 = /* @__PURE__ */ $constructor("ZodCIDRv4", (inst, def) => {
    $ZodCIDRv4.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodCIDRv6 = /* @__PURE__ */ $constructor("ZodCIDRv6", (inst, def) => {
    $ZodCIDRv6.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodBase64 = /* @__PURE__ */ $constructor("ZodBase64", (inst, def) => {
    $ZodBase64.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodBase64URL = /* @__PURE__ */ $constructor("ZodBase64URL", (inst, def) => {
    $ZodBase64URL.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodE164 = /* @__PURE__ */ $constructor("ZodE164", (inst, def) => {
    $ZodE164.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodJWT = /* @__PURE__ */ $constructor("ZodJWT", (inst, def) => {
    $ZodJWT.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodCustomStringFormat = /* @__PURE__ */ $constructor("ZodCustomStringFormat", (inst, def) => {
    $ZodCustomStringFormat.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodNumber = /* @__PURE__ */ $constructor("ZodNumber", (inst, def) => {
    $ZodNumber.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => numberProcessor(inst, ctx, json, params);
    _installLazyMethods(inst, "ZodNumber", {
      gt(value, params) {
        return this.check(_gt(value, params));
      },
      gte(value, params) {
        return this.check(_gte(value, params));
      },
      min(value, params) {
        return this.check(_gte(value, params));
      },
      lt(value, params) {
        return this.check(_lt(value, params));
      },
      lte(value, params) {
        return this.check(_lte(value, params));
      },
      max(value, params) {
        return this.check(_lte(value, params));
      },
      int(params) {
        return this.check(int(params));
      },
      safe(params) {
        return this.check(int(params));
      },
      positive(params) {
        return this.check(_gt(0, params));
      },
      nonnegative(params) {
        return this.check(_gte(0, params));
      },
      negative(params) {
        return this.check(_lt(0, params));
      },
      nonpositive(params) {
        return this.check(_lte(0, params));
      },
      multipleOf(value, params) {
        return this.check(_multipleOf(value, params));
      },
      step(value, params) {
        return this.check(_multipleOf(value, params));
      },
      finite() {
        return this;
      }
    });
    const bag = inst._zod.bag;
    inst.minValue = Math.max(bag.minimum ?? Number.NEGATIVE_INFINITY, bag.exclusiveMinimum ?? Number.NEGATIVE_INFINITY) ?? null;
    inst.maxValue = Math.min(bag.maximum ?? Number.POSITIVE_INFINITY, bag.exclusiveMaximum ?? Number.POSITIVE_INFINITY) ?? null;
    inst.isInt = (bag.format ?? "").includes("int") || Number.isSafeInteger(bag.multipleOf ?? 0.5);
    inst.isFinite = true;
    inst.format = bag.format ?? null;
  });
  ZodNumberFormat = /* @__PURE__ */ $constructor("ZodNumberFormat", (inst, def) => {
    $ZodNumberFormat.init(inst, def);
    ZodNumber.init(inst, def);
  });
  ZodBoolean = /* @__PURE__ */ $constructor("ZodBoolean", (inst, def) => {
    $ZodBoolean.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => booleanProcessor(inst, ctx, json, params);
  });
  ZodBigInt = /* @__PURE__ */ $constructor("ZodBigInt", (inst, def) => {
    $ZodBigInt.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => bigintProcessor(inst, ctx, json, params);
    inst.gte = (value, params) => inst.check(_gte(value, params));
    inst.min = (value, params) => inst.check(_gte(value, params));
    inst.gt = (value, params) => inst.check(_gt(value, params));
    inst.gte = (value, params) => inst.check(_gte(value, params));
    inst.min = (value, params) => inst.check(_gte(value, params));
    inst.lt = (value, params) => inst.check(_lt(value, params));
    inst.lte = (value, params) => inst.check(_lte(value, params));
    inst.max = (value, params) => inst.check(_lte(value, params));
    inst.positive = (params) => inst.check(_gt(BigInt(0), params));
    inst.negative = (params) => inst.check(_lt(BigInt(0), params));
    inst.nonpositive = (params) => inst.check(_lte(BigInt(0), params));
    inst.nonnegative = (params) => inst.check(_gte(BigInt(0), params));
    inst.multipleOf = (value, params) => inst.check(_multipleOf(value, params));
    const bag = inst._zod.bag;
    inst.minValue = bag.minimum ?? null;
    inst.maxValue = bag.maximum ?? null;
    inst.format = bag.format ?? null;
  });
  ZodBigIntFormat = /* @__PURE__ */ $constructor("ZodBigIntFormat", (inst, def) => {
    $ZodBigIntFormat.init(inst, def);
    ZodBigInt.init(inst, def);
  });
  ZodSymbol = /* @__PURE__ */ $constructor("ZodSymbol", (inst, def) => {
    $ZodSymbol.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => symbolProcessor(inst, ctx, json, params);
  });
  ZodUndefined = /* @__PURE__ */ $constructor("ZodUndefined", (inst, def) => {
    $ZodUndefined.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => undefinedProcessor(inst, ctx, json, params);
  });
  ZodNull = /* @__PURE__ */ $constructor("ZodNull", (inst, def) => {
    $ZodNull.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => nullProcessor(inst, ctx, json, params);
  });
  ZodAny = /* @__PURE__ */ $constructor("ZodAny", (inst, def) => {
    $ZodAny.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => anyProcessor(inst, ctx, json, params);
  });
  ZodUnknown = /* @__PURE__ */ $constructor("ZodUnknown", (inst, def) => {
    $ZodUnknown.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => unknownProcessor(inst, ctx, json, params);
  });
  ZodNever = /* @__PURE__ */ $constructor("ZodNever", (inst, def) => {
    $ZodNever.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => neverProcessor(inst, ctx, json, params);
  });
  ZodVoid = /* @__PURE__ */ $constructor("ZodVoid", (inst, def) => {
    $ZodVoid.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => voidProcessor(inst, ctx, json, params);
  });
  ZodDate = /* @__PURE__ */ $constructor("ZodDate", (inst, def) => {
    $ZodDate.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => dateProcessor(inst, ctx, json, params);
    inst.min = (value, params) => inst.check(_gte(value, params));
    inst.max = (value, params) => inst.check(_lte(value, params));
    const c = inst._zod.bag;
    inst.minDate = c.minimum ? new Date(c.minimum) : null;
    inst.maxDate = c.maximum ? new Date(c.maximum) : null;
  });
  ZodArray = /* @__PURE__ */ $constructor("ZodArray", (inst, def) => {
    $ZodArray.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => arrayProcessor(inst, ctx, json, params);
    inst.element = def.element;
    _installLazyMethods(inst, "ZodArray", {
      min(n, params) {
        return this.check(_minLength(n, params));
      },
      nonempty(params) {
        return this.check(_minLength(1, params));
      },
      max(n, params) {
        return this.check(_maxLength(n, params));
      },
      length(n, params) {
        return this.check(_length(n, params));
      },
      unwrap() {
        return this.element;
      }
    });
  });
  ZodObject = /* @__PURE__ */ $constructor("ZodObject", (inst, def) => {
    $ZodObjectJIT.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => objectProcessor(inst, ctx, json, params);
    exports_util.defineLazy(inst, "shape", () => {
      return def.shape;
    });
    _installLazyMethods(inst, "ZodObject", {
      keyof() {
        return _enum2(Object.keys(this._zod.def.shape));
      },
      catchall(catchall) {
        return this.clone({ ...this._zod.def, catchall });
      },
      passthrough() {
        return this.clone({ ...this._zod.def, catchall: unknown() });
      },
      loose() {
        return this.clone({ ...this._zod.def, catchall: unknown() });
      },
      strict() {
        return this.clone({ ...this._zod.def, catchall: never() });
      },
      strip() {
        return this.clone({ ...this._zod.def, catchall: undefined });
      },
      extend(incoming) {
        return exports_util.extend(this, incoming);
      },
      safeExtend(incoming) {
        return exports_util.safeExtend(this, incoming);
      },
      merge(other) {
        return exports_util.merge(this, other);
      },
      pick(mask) {
        return exports_util.pick(this, mask);
      },
      omit(mask) {
        return exports_util.omit(this, mask);
      },
      partial(...args) {
        return exports_util.partial(ZodOptional, this, args[0]);
      },
      required(...args) {
        return exports_util.required(ZodNonOptional, this, args[0]);
      }
    });
  });
  ZodUnion = /* @__PURE__ */ $constructor("ZodUnion", (inst, def) => {
    $ZodUnion.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => unionProcessor(inst, ctx, json, params);
    inst.options = def.options;
  });
  ZodXor = /* @__PURE__ */ $constructor("ZodXor", (inst, def) => {
    ZodUnion.init(inst, def);
    $ZodXor.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => unionProcessor(inst, ctx, json, params);
    inst.options = def.options;
  });
  ZodDiscriminatedUnion = /* @__PURE__ */ $constructor("ZodDiscriminatedUnion", (inst, def) => {
    ZodUnion.init(inst, def);
    $ZodDiscriminatedUnion.init(inst, def);
  });
  ZodIntersection = /* @__PURE__ */ $constructor("ZodIntersection", (inst, def) => {
    $ZodIntersection.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => intersectionProcessor(inst, ctx, json, params);
  });
  ZodTuple = /* @__PURE__ */ $constructor("ZodTuple", (inst, def) => {
    $ZodTuple.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => tupleProcessor(inst, ctx, json, params);
    inst.rest = (rest) => inst.clone({
      ...inst._zod.def,
      rest
    });
  });
  ZodRecord = /* @__PURE__ */ $constructor("ZodRecord", (inst, def) => {
    $ZodRecord.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => recordProcessor(inst, ctx, json, params);
    inst.keyType = def.keyType;
    inst.valueType = def.valueType;
  });
  ZodMap = /* @__PURE__ */ $constructor("ZodMap", (inst, def) => {
    $ZodMap.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => mapProcessor(inst, ctx, json, params);
    inst.keyType = def.keyType;
    inst.valueType = def.valueType;
    inst.min = (...args) => inst.check(_minSize(...args));
    inst.nonempty = (params) => inst.check(_minSize(1, params));
    inst.max = (...args) => inst.check(_maxSize(...args));
    inst.size = (...args) => inst.check(_size(...args));
  });
  ZodSet = /* @__PURE__ */ $constructor("ZodSet", (inst, def) => {
    $ZodSet.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => setProcessor(inst, ctx, json, params);
    inst.min = (...args) => inst.check(_minSize(...args));
    inst.nonempty = (params) => inst.check(_minSize(1, params));
    inst.max = (...args) => inst.check(_maxSize(...args));
    inst.size = (...args) => inst.check(_size(...args));
  });
  ZodEnum = /* @__PURE__ */ $constructor("ZodEnum", (inst, def) => {
    $ZodEnum.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => enumProcessor(inst, ctx, json, params);
    inst.enum = def.entries;
    inst.options = Object.values(def.entries);
    const keys = new Set(Object.keys(def.entries));
    inst.extract = (values, params) => {
      const newEntries = {};
      for (const value of values) {
        if (keys.has(value)) {
          newEntries[value] = def.entries[value];
        } else
          throw new Error(`Key ${value} not found in enum`);
      }
      return new ZodEnum({
        ...def,
        checks: [],
        ...exports_util.normalizeParams(params),
        entries: newEntries
      });
    };
    inst.exclude = (values, params) => {
      const newEntries = { ...def.entries };
      for (const value of values) {
        if (keys.has(value)) {
          delete newEntries[value];
        } else
          throw new Error(`Key ${value} not found in enum`);
      }
      return new ZodEnum({
        ...def,
        checks: [],
        ...exports_util.normalizeParams(params),
        entries: newEntries
      });
    };
  });
  ZodLiteral = /* @__PURE__ */ $constructor("ZodLiteral", (inst, def) => {
    $ZodLiteral.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => literalProcessor(inst, ctx, json, params);
    inst.values = new Set(def.values);
    Object.defineProperty(inst, "value", {
      get() {
        if (def.values.length > 1) {
          throw new Error("This schema contains multiple valid literal values. Use `.values` instead.");
        }
        return def.values[0];
      }
    });
  });
  ZodFile = /* @__PURE__ */ $constructor("ZodFile", (inst, def) => {
    $ZodFile.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => fileProcessor(inst, ctx, json, params);
    inst.min = (size, params) => inst.check(_minSize(size, params));
    inst.max = (size, params) => inst.check(_maxSize(size, params));
    inst.mime = (types, params) => inst.check(_mime(Array.isArray(types) ? types : [types], params));
  });
  ZodTransform = /* @__PURE__ */ $constructor("ZodTransform", (inst, def) => {
    $ZodTransform.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => transformProcessor(inst, ctx, json, params);
    inst._zod.parse = (payload, _ctx) => {
      if (_ctx.direction === "backward") {
        throw new $ZodEncodeError(inst.constructor.name);
      }
      payload.addIssue = (issue2) => {
        if (typeof issue2 === "string") {
          payload.issues.push(exports_util.issue(issue2, payload.value, def));
        } else {
          const _issue = issue2;
          if (_issue.fatal)
            _issue.continue = false;
          _issue.code ?? (_issue.code = "custom");
          _issue.input ?? (_issue.input = payload.value);
          _issue.inst ?? (_issue.inst = inst);
          payload.issues.push(exports_util.issue(_issue));
        }
      };
      const output = def.transform(payload.value, payload);
      if (output instanceof Promise) {
        return output.then((output2) => {
          payload.value = output2;
          payload.fallback = true;
          return payload;
        });
      }
      payload.value = output;
      payload.fallback = true;
      return payload;
    };
  });
  ZodOptional = /* @__PURE__ */ $constructor("ZodOptional", (inst, def) => {
    $ZodOptional.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  ZodExactOptional = /* @__PURE__ */ $constructor("ZodExactOptional", (inst, def) => {
    $ZodExactOptional.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  ZodNullable = /* @__PURE__ */ $constructor("ZodNullable", (inst, def) => {
    $ZodNullable.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => nullableProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  ZodDefault = /* @__PURE__ */ $constructor("ZodDefault", (inst, def) => {
    $ZodDefault.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => defaultProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
    inst.removeDefault = inst.unwrap;
  });
  ZodPrefault = /* @__PURE__ */ $constructor("ZodPrefault", (inst, def) => {
    $ZodPrefault.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => prefaultProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  ZodNonOptional = /* @__PURE__ */ $constructor("ZodNonOptional", (inst, def) => {
    $ZodNonOptional.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => nonoptionalProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  ZodSuccess = /* @__PURE__ */ $constructor("ZodSuccess", (inst, def) => {
    $ZodSuccess.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => successProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  ZodCatch = /* @__PURE__ */ $constructor("ZodCatch", (inst, def) => {
    $ZodCatch.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => catchProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
    inst.removeCatch = inst.unwrap;
  });
  ZodNaN = /* @__PURE__ */ $constructor("ZodNaN", (inst, def) => {
    $ZodNaN.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => nanProcessor(inst, ctx, json, params);
  });
  ZodPipe = /* @__PURE__ */ $constructor("ZodPipe", (inst, def) => {
    $ZodPipe.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => pipeProcessor(inst, ctx, json, params);
    inst.in = def.in;
    inst.out = def.out;
  });
  ZodCodec = /* @__PURE__ */ $constructor("ZodCodec", (inst, def) => {
    ZodPipe.init(inst, def);
    $ZodCodec.init(inst, def);
  });
  ZodPreprocess = /* @__PURE__ */ $constructor("ZodPreprocess", (inst, def) => {
    ZodPipe.init(inst, def);
    $ZodPreprocess.init(inst, def);
  });
  ZodReadonly = /* @__PURE__ */ $constructor("ZodReadonly", (inst, def) => {
    $ZodReadonly.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => readonlyProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  ZodTemplateLiteral = /* @__PURE__ */ $constructor("ZodTemplateLiteral", (inst, def) => {
    $ZodTemplateLiteral.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => templateLiteralProcessor(inst, ctx, json, params);
  });
  ZodLazy = /* @__PURE__ */ $constructor("ZodLazy", (inst, def) => {
    $ZodLazy.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => lazyProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.getter();
  });
  ZodPromise = /* @__PURE__ */ $constructor("ZodPromise", (inst, def) => {
    $ZodPromise.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => promiseProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  ZodFunction = /* @__PURE__ */ $constructor("ZodFunction", (inst, def) => {
    $ZodFunction.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => functionProcessor(inst, ctx, json, params);
  });
  ZodCustom = /* @__PURE__ */ $constructor("ZodCustom", (inst, def) => {
    $ZodCustom.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => customProcessor(inst, ctx, json, params);
  });
  describe2 = describe;
  meta2 = meta;
});

// node_modules/zod/v4/classic/compat.js
function setErrorMap(map2) {
  config({
    customError: map2
  });
}
function getErrorMap() {
  return config().customError;
}
var ZodIssueCode, ZodFirstPartyTypeKind;
var init_compat = __esm(() => {
  init_core2();
  ZodIssueCode = {
    invalid_type: "invalid_type",
    too_big: "too_big",
    too_small: "too_small",
    invalid_format: "invalid_format",
    not_multiple_of: "not_multiple_of",
    unrecognized_keys: "unrecognized_keys",
    invalid_union: "invalid_union",
    invalid_key: "invalid_key",
    invalid_element: "invalid_element",
    invalid_value: "invalid_value",
    custom: "custom"
  };
  (function(ZodFirstPartyTypeKind2) {})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
});

// node_modules/zod/v4/classic/from-json-schema.js
function detectVersion(schema, defaultTarget) {
  const $schema = schema.$schema;
  if ($schema === "https://json-schema.org/draft/2020-12/schema") {
    return "draft-2020-12";
  }
  if ($schema === "http://json-schema.org/draft-07/schema#") {
    return "draft-7";
  }
  if ($schema === "http://json-schema.org/draft-04/schema#") {
    return "draft-4";
  }
  return defaultTarget ?? "draft-2020-12";
}
function resolveRef(ref, ctx) {
  if (!ref.startsWith("#")) {
    throw new Error("External $ref is not supported, only local refs (#/...) are allowed");
  }
  const path = ref.slice(1).split("/").filter(Boolean);
  if (path.length === 0) {
    return ctx.rootSchema;
  }
  const defsKey = ctx.version === "draft-2020-12" ? "$defs" : "definitions";
  if (path[0] === defsKey) {
    const key = path[1];
    if (!key || !ctx.defs[key]) {
      throw new Error(`Reference not found: ${ref}`);
    }
    return ctx.defs[key];
  }
  throw new Error(`Reference not found: ${ref}`);
}
function convertBaseSchema(schema, ctx) {
  if (schema.not !== undefined) {
    if (typeof schema.not === "object" && Object.keys(schema.not).length === 0) {
      return z.never();
    }
    throw new Error("not is not supported in Zod (except { not: {} } for never)");
  }
  if (schema.unevaluatedItems !== undefined) {
    throw new Error("unevaluatedItems is not supported");
  }
  if (schema.unevaluatedProperties !== undefined) {
    throw new Error("unevaluatedProperties is not supported");
  }
  if (schema.if !== undefined || schema.then !== undefined || schema.else !== undefined) {
    throw new Error("Conditional schemas (if/then/else) are not supported");
  }
  if (schema.dependentSchemas !== undefined || schema.dependentRequired !== undefined) {
    throw new Error("dependentSchemas and dependentRequired are not supported");
  }
  if (schema.$ref) {
    const refPath = schema.$ref;
    if (ctx.refs.has(refPath)) {
      return ctx.refs.get(refPath);
    }
    if (ctx.processing.has(refPath)) {
      return z.lazy(() => {
        if (!ctx.refs.has(refPath)) {
          throw new Error(`Circular reference not resolved: ${refPath}`);
        }
        return ctx.refs.get(refPath);
      });
    }
    ctx.processing.add(refPath);
    const resolved = resolveRef(refPath, ctx);
    const zodSchema2 = convertSchema(resolved, ctx);
    ctx.refs.set(refPath, zodSchema2);
    ctx.processing.delete(refPath);
    return zodSchema2;
  }
  if (schema.enum !== undefined) {
    const enumValues = schema.enum;
    if (ctx.version === "openapi-3.0" && schema.nullable === true && enumValues.length === 1 && enumValues[0] === null) {
      return z.null();
    }
    if (enumValues.length === 0) {
      return z.never();
    }
    if (enumValues.length === 1) {
      return z.literal(enumValues[0]);
    }
    if (enumValues.every((v) => typeof v === "string")) {
      return z.enum(enumValues);
    }
    const literalSchemas = enumValues.map((v) => z.literal(v));
    if (literalSchemas.length < 2) {
      return literalSchemas[0];
    }
    return z.union([literalSchemas[0], literalSchemas[1], ...literalSchemas.slice(2)]);
  }
  if (schema.const !== undefined) {
    return z.literal(schema.const);
  }
  const type = schema.type;
  if (Array.isArray(type)) {
    const typeSchemas = type.map((t) => {
      const typeSchema = { ...schema, type: t };
      return convertBaseSchema(typeSchema, ctx);
    });
    if (typeSchemas.length === 0) {
      return z.never();
    }
    if (typeSchemas.length === 1) {
      return typeSchemas[0];
    }
    return z.union(typeSchemas);
  }
  if (!type) {
    return z.any();
  }
  let zodSchema;
  switch (type) {
    case "string": {
      let stringSchema = z.string();
      if (schema.format) {
        const format = schema.format;
        if (format === "email") {
          stringSchema = stringSchema.check(z.email());
        } else if (format === "uri" || format === "uri-reference") {
          stringSchema = stringSchema.check(z.url());
        } else if (format === "uuid" || format === "guid") {
          stringSchema = stringSchema.check(z.uuid());
        } else if (format === "date-time") {
          stringSchema = stringSchema.check(z.iso.datetime());
        } else if (format === "date") {
          stringSchema = stringSchema.check(z.iso.date());
        } else if (format === "time") {
          stringSchema = stringSchema.check(z.iso.time());
        } else if (format === "duration") {
          stringSchema = stringSchema.check(z.iso.duration());
        } else if (format === "ipv4") {
          stringSchema = stringSchema.check(z.ipv4());
        } else if (format === "ipv6") {
          stringSchema = stringSchema.check(z.ipv6());
        } else if (format === "mac") {
          stringSchema = stringSchema.check(z.mac());
        } else if (format === "cidr") {
          stringSchema = stringSchema.check(z.cidrv4());
        } else if (format === "cidr-v6") {
          stringSchema = stringSchema.check(z.cidrv6());
        } else if (format === "base64") {
          stringSchema = stringSchema.check(z.base64());
        } else if (format === "base64url") {
          stringSchema = stringSchema.check(z.base64url());
        } else if (format === "e164") {
          stringSchema = stringSchema.check(z.e164());
        } else if (format === "jwt") {
          stringSchema = stringSchema.check(z.jwt());
        } else if (format === "emoji") {
          stringSchema = stringSchema.check(z.emoji());
        } else if (format === "nanoid") {
          stringSchema = stringSchema.check(z.nanoid());
        } else if (format === "cuid") {
          stringSchema = stringSchema.check(z.cuid());
        } else if (format === "cuid2") {
          stringSchema = stringSchema.check(z.cuid2());
        } else if (format === "ulid") {
          stringSchema = stringSchema.check(z.ulid());
        } else if (format === "xid") {
          stringSchema = stringSchema.check(z.xid());
        } else if (format === "ksuid") {
          stringSchema = stringSchema.check(z.ksuid());
        }
      }
      if (typeof schema.minLength === "number") {
        stringSchema = stringSchema.min(schema.minLength);
      }
      if (typeof schema.maxLength === "number") {
        stringSchema = stringSchema.max(schema.maxLength);
      }
      if (schema.pattern) {
        stringSchema = stringSchema.regex(new RegExp(schema.pattern));
      }
      zodSchema = stringSchema;
      break;
    }
    case "number":
    case "integer": {
      let numberSchema = type === "integer" ? z.number().int() : z.number();
      if (typeof schema.minimum === "number") {
        numberSchema = numberSchema.min(schema.minimum);
      }
      if (typeof schema.maximum === "number") {
        numberSchema = numberSchema.max(schema.maximum);
      }
      if (typeof schema.exclusiveMinimum === "number") {
        numberSchema = numberSchema.gt(schema.exclusiveMinimum);
      } else if (schema.exclusiveMinimum === true && typeof schema.minimum === "number") {
        numberSchema = numberSchema.gt(schema.minimum);
      }
      if (typeof schema.exclusiveMaximum === "number") {
        numberSchema = numberSchema.lt(schema.exclusiveMaximum);
      } else if (schema.exclusiveMaximum === true && typeof schema.maximum === "number") {
        numberSchema = numberSchema.lt(schema.maximum);
      }
      if (typeof schema.multipleOf === "number") {
        numberSchema = numberSchema.multipleOf(schema.multipleOf);
      }
      zodSchema = numberSchema;
      break;
    }
    case "boolean": {
      zodSchema = z.boolean();
      break;
    }
    case "null": {
      zodSchema = z.null();
      break;
    }
    case "object": {
      const shape = {};
      const properties = schema.properties || {};
      const requiredSet = new Set(schema.required || []);
      for (const [key, propSchema] of Object.entries(properties)) {
        const propZodSchema = convertSchema(propSchema, ctx);
        shape[key] = requiredSet.has(key) ? propZodSchema : propZodSchema.optional();
      }
      if (schema.propertyNames) {
        const keySchema = convertSchema(schema.propertyNames, ctx);
        const valueSchema = schema.additionalProperties && typeof schema.additionalProperties === "object" ? convertSchema(schema.additionalProperties, ctx) : z.any();
        if (Object.keys(shape).length === 0) {
          zodSchema = z.record(keySchema, valueSchema);
          break;
        }
        const objectSchema2 = z.object(shape).passthrough();
        const recordSchema = z.looseRecord(keySchema, valueSchema);
        zodSchema = z.intersection(objectSchema2, recordSchema);
        break;
      }
      if (schema.patternProperties) {
        const patternProps = schema.patternProperties;
        const patternKeys = Object.keys(patternProps);
        const looseRecords = [];
        for (const pattern of patternKeys) {
          const patternValue = convertSchema(patternProps[pattern], ctx);
          const keySchema = z.string().regex(new RegExp(pattern));
          looseRecords.push(z.looseRecord(keySchema, patternValue));
        }
        const schemasToIntersect = [];
        if (Object.keys(shape).length > 0) {
          schemasToIntersect.push(z.object(shape).passthrough());
        }
        schemasToIntersect.push(...looseRecords);
        if (schemasToIntersect.length === 0) {
          zodSchema = z.object({}).passthrough();
        } else if (schemasToIntersect.length === 1) {
          zodSchema = schemasToIntersect[0];
        } else {
          let result = z.intersection(schemasToIntersect[0], schemasToIntersect[1]);
          for (let i = 2;i < schemasToIntersect.length; i++) {
            result = z.intersection(result, schemasToIntersect[i]);
          }
          zodSchema = result;
        }
        break;
      }
      const objectSchema = z.object(shape);
      if (schema.additionalProperties === false) {
        zodSchema = objectSchema.strict();
      } else if (typeof schema.additionalProperties === "object") {
        zodSchema = objectSchema.catchall(convertSchema(schema.additionalProperties, ctx));
      } else {
        zodSchema = objectSchema.passthrough();
      }
      break;
    }
    case "array": {
      const prefixItems = schema.prefixItems;
      const items = schema.items;
      if (prefixItems && Array.isArray(prefixItems)) {
        const tupleItems = prefixItems.map((item) => convertSchema(item, ctx));
        const rest = items && typeof items === "object" && !Array.isArray(items) ? convertSchema(items, ctx) : undefined;
        if (rest) {
          zodSchema = z.tuple(tupleItems).rest(rest);
        } else {
          zodSchema = z.tuple(tupleItems);
        }
        if (typeof schema.minItems === "number") {
          zodSchema = zodSchema.check(z.minLength(schema.minItems));
        }
        if (typeof schema.maxItems === "number") {
          zodSchema = zodSchema.check(z.maxLength(schema.maxItems));
        }
      } else if (Array.isArray(items)) {
        const tupleItems = items.map((item) => convertSchema(item, ctx));
        const rest = schema.additionalItems && typeof schema.additionalItems === "object" ? convertSchema(schema.additionalItems, ctx) : undefined;
        if (rest) {
          zodSchema = z.tuple(tupleItems).rest(rest);
        } else {
          zodSchema = z.tuple(tupleItems);
        }
        if (typeof schema.minItems === "number") {
          zodSchema = zodSchema.check(z.minLength(schema.minItems));
        }
        if (typeof schema.maxItems === "number") {
          zodSchema = zodSchema.check(z.maxLength(schema.maxItems));
        }
      } else if (items !== undefined) {
        const element = convertSchema(items, ctx);
        let arraySchema = z.array(element);
        if (typeof schema.minItems === "number") {
          arraySchema = arraySchema.min(schema.minItems);
        }
        if (typeof schema.maxItems === "number") {
          arraySchema = arraySchema.max(schema.maxItems);
        }
        zodSchema = arraySchema;
      } else {
        zodSchema = z.array(z.any());
      }
      break;
    }
    default:
      throw new Error(`Unsupported type: ${type}`);
  }
  return zodSchema;
}
function convertSchema(schema, ctx) {
  if (typeof schema === "boolean") {
    return schema ? z.any() : z.never();
  }
  let baseSchema = convertBaseSchema(schema, ctx);
  const hasExplicitType = schema.type || schema.enum !== undefined || schema.const !== undefined;
  if (schema.anyOf && Array.isArray(schema.anyOf)) {
    const options = schema.anyOf.map((s) => convertSchema(s, ctx));
    const anyOfUnion = z.union(options);
    baseSchema = hasExplicitType ? z.intersection(baseSchema, anyOfUnion) : anyOfUnion;
  }
  if (schema.oneOf && Array.isArray(schema.oneOf)) {
    const options = schema.oneOf.map((s) => convertSchema(s, ctx));
    const oneOfUnion = z.xor(options);
    baseSchema = hasExplicitType ? z.intersection(baseSchema, oneOfUnion) : oneOfUnion;
  }
  if (schema.allOf && Array.isArray(schema.allOf)) {
    if (schema.allOf.length === 0) {
      baseSchema = hasExplicitType ? baseSchema : z.any();
    } else {
      let result = hasExplicitType ? baseSchema : convertSchema(schema.allOf[0], ctx);
      const startIdx = hasExplicitType ? 0 : 1;
      for (let i = startIdx;i < schema.allOf.length; i++) {
        result = z.intersection(result, convertSchema(schema.allOf[i], ctx));
      }
      baseSchema = result;
    }
  }
  if (schema.nullable === true && ctx.version === "openapi-3.0") {
    baseSchema = z.nullable(baseSchema);
  }
  if (schema.readOnly === true) {
    baseSchema = z.readonly(baseSchema);
  }
  if (schema.default !== undefined) {
    baseSchema = baseSchema.default(schema.default);
  }
  const extraMeta = {};
  const coreMetadataKeys = ["$id", "id", "$comment", "$anchor", "$vocabulary", "$dynamicRef", "$dynamicAnchor"];
  for (const key of coreMetadataKeys) {
    if (key in schema) {
      extraMeta[key] = schema[key];
    }
  }
  const contentMetadataKeys = ["contentEncoding", "contentMediaType", "contentSchema"];
  for (const key of contentMetadataKeys) {
    if (key in schema) {
      extraMeta[key] = schema[key];
    }
  }
  for (const key of Object.keys(schema)) {
    if (!RECOGNIZED_KEYS.has(key)) {
      extraMeta[key] = schema[key];
    }
  }
  if (Object.keys(extraMeta).length > 0) {
    ctx.registry.add(baseSchema, extraMeta);
  }
  if (schema.description) {
    baseSchema = baseSchema.describe(schema.description);
  }
  return baseSchema;
}
function fromJSONSchema(schema, params) {
  if (typeof schema === "boolean") {
    return schema ? z.any() : z.never();
  }
  let normalized;
  try {
    normalized = JSON.parse(JSON.stringify(schema));
  } catch {
    throw new Error("fromJSONSchema input is not valid JSON (possibly cyclic); use $defs/$ref for recursive schemas");
  }
  const version2 = detectVersion(normalized, params?.defaultTarget);
  const defs = normalized.$defs || normalized.definitions || {};
  const ctx = {
    version: version2,
    defs,
    refs: new Map,
    processing: new Set,
    rootSchema: normalized,
    registry: params?.registry ?? globalRegistry
  };
  return convertSchema(normalized, ctx);
}
var z, RECOGNIZED_KEYS;
var init_from_json_schema = __esm(() => {
  init_registries();
  init_checks2();
  init_iso();
  init_schemas2();
  z = {
    ...exports_schemas2,
    ...exports_checks2,
    iso: exports_iso
  };
  RECOGNIZED_KEYS = /* @__PURE__ */ new Set([
    "$schema",
    "$ref",
    "$defs",
    "definitions",
    "$id",
    "id",
    "$comment",
    "$anchor",
    "$vocabulary",
    "$dynamicRef",
    "$dynamicAnchor",
    "type",
    "enum",
    "const",
    "anyOf",
    "oneOf",
    "allOf",
    "not",
    "properties",
    "required",
    "additionalProperties",
    "patternProperties",
    "propertyNames",
    "minProperties",
    "maxProperties",
    "items",
    "prefixItems",
    "additionalItems",
    "minItems",
    "maxItems",
    "uniqueItems",
    "contains",
    "minContains",
    "maxContains",
    "minLength",
    "maxLength",
    "pattern",
    "format",
    "minimum",
    "maximum",
    "exclusiveMinimum",
    "exclusiveMaximum",
    "multipleOf",
    "description",
    "default",
    "contentEncoding",
    "contentMediaType",
    "contentSchema",
    "unevaluatedItems",
    "unevaluatedProperties",
    "if",
    "then",
    "else",
    "dependentSchemas",
    "dependentRequired",
    "nullable",
    "readOnly"
  ]);
});

// node_modules/zod/v4/classic/coerce.js
var exports_coerce = {};
__export(exports_coerce, {
  string: () => string3,
  number: () => number3,
  date: () => date4,
  boolean: () => boolean3,
  bigint: () => bigint3
});
function string3(params) {
  return _coercedString(ZodString, params);
}
function number3(params) {
  return _coercedNumber(ZodNumber, params);
}
function boolean3(params) {
  return _coercedBoolean(ZodBoolean, params);
}
function bigint3(params) {
  return _coercedBigint(ZodBigInt, params);
}
function date4(params) {
  return _coercedDate(ZodDate, params);
}
var init_coerce = __esm(() => {
  init_core2();
  init_schemas2();
});

// node_modules/zod/v4/classic/external.js
var exports_external = {};
__export(exports_external, {
  xor: () => xor,
  xid: () => xid2,
  void: () => _void2,
  uuidv7: () => uuidv7,
  uuidv6: () => uuidv6,
  uuidv4: () => uuidv4,
  uuid: () => uuid2,
  util: () => exports_util,
  url: () => url,
  uppercase: () => _uppercase,
  unknown: () => unknown,
  union: () => union,
  undefined: () => _undefined3,
  ulid: () => ulid2,
  uint64: () => uint64,
  uint32: () => uint32,
  tuple: () => tuple,
  trim: () => _trim,
  treeifyError: () => treeifyError,
  transform: () => transform,
  toUpperCase: () => _toUpperCase,
  toLowerCase: () => _toLowerCase,
  toJSONSchema: () => toJSONSchema,
  templateLiteral: () => templateLiteral,
  symbol: () => symbol,
  superRefine: () => superRefine,
  success: () => success,
  stringbool: () => stringbool,
  stringFormat: () => stringFormat,
  string: () => string2,
  strictObject: () => strictObject,
  startsWith: () => _startsWith,
  slugify: () => _slugify,
  size: () => _size,
  setErrorMap: () => setErrorMap,
  set: () => set,
  safeParseAsync: () => safeParseAsync2,
  safeParse: () => safeParse2,
  safeEncodeAsync: () => safeEncodeAsync2,
  safeEncode: () => safeEncode2,
  safeDecodeAsync: () => safeDecodeAsync2,
  safeDecode: () => safeDecode2,
  registry: () => registry,
  regexes: () => exports_regexes,
  regex: () => _regex,
  refine: () => refine,
  record: () => record,
  readonly: () => readonly,
  property: () => _property,
  promise: () => promise,
  prettifyError: () => prettifyError,
  preprocess: () => preprocess,
  prefault: () => prefault,
  positive: () => _positive,
  pipe: () => pipe,
  partialRecord: () => partialRecord,
  parseAsync: () => parseAsync2,
  parse: () => parse3,
  overwrite: () => _overwrite,
  optional: () => optional,
  object: () => object,
  number: () => number2,
  nullish: () => nullish2,
  nullable: () => nullable,
  null: () => _null3,
  normalize: () => _normalize,
  nonpositive: () => _nonpositive,
  nonoptional: () => nonoptional,
  nonnegative: () => _nonnegative,
  never: () => never,
  negative: () => _negative,
  nativeEnum: () => nativeEnum,
  nanoid: () => nanoid2,
  nan: () => nan,
  multipleOf: () => _multipleOf,
  minSize: () => _minSize,
  minLength: () => _minLength,
  mime: () => _mime,
  meta: () => meta2,
  maxSize: () => _maxSize,
  maxLength: () => _maxLength,
  map: () => map,
  mac: () => mac2,
  lte: () => _lte,
  lt: () => _lt,
  lowercase: () => _lowercase,
  looseRecord: () => looseRecord,
  looseObject: () => looseObject,
  locales: () => exports_locales,
  literal: () => literal,
  length: () => _length,
  lazy: () => lazy,
  ksuid: () => ksuid2,
  keyof: () => keyof,
  jwt: () => jwt,
  json: () => json,
  iso: () => exports_iso,
  ipv6: () => ipv62,
  ipv4: () => ipv42,
  invertCodec: () => invertCodec,
  intersection: () => intersection,
  int64: () => int64,
  int32: () => int32,
  int: () => int,
  instanceof: () => _instanceof,
  includes: () => _includes,
  httpUrl: () => httpUrl,
  hostname: () => hostname2,
  hex: () => hex2,
  hash: () => hash,
  guid: () => guid2,
  gte: () => _gte,
  gt: () => _gt,
  globalRegistry: () => globalRegistry,
  getErrorMap: () => getErrorMap,
  function: () => _function,
  fromJSONSchema: () => fromJSONSchema,
  formatError: () => formatError,
  float64: () => float64,
  float32: () => float32,
  flattenError: () => flattenError,
  file: () => file,
  exactOptional: () => exactOptional,
  enum: () => _enum2,
  endsWith: () => _endsWith,
  encodeAsync: () => encodeAsync2,
  encode: () => encode2,
  emoji: () => emoji2,
  email: () => email2,
  e164: () => e1642,
  discriminatedUnion: () => discriminatedUnion,
  describe: () => describe2,
  decodeAsync: () => decodeAsync2,
  decode: () => decode2,
  date: () => date3,
  custom: () => custom,
  cuid2: () => cuid22,
  cuid: () => cuid3,
  core: () => exports_core2,
  config: () => config,
  coerce: () => exports_coerce,
  codec: () => codec,
  clone: () => clone,
  cidrv6: () => cidrv62,
  cidrv4: () => cidrv42,
  check: () => check,
  catch: () => _catch2,
  boolean: () => boolean2,
  bigint: () => bigint2,
  base64url: () => base64url2,
  base64: () => base642,
  array: () => array,
  any: () => any,
  _function: () => _function,
  _default: () => _default2,
  _ZodString: () => _ZodString,
  ZodXor: () => ZodXor,
  ZodXID: () => ZodXID,
  ZodVoid: () => ZodVoid,
  ZodUnknown: () => ZodUnknown,
  ZodUnion: () => ZodUnion,
  ZodUndefined: () => ZodUndefined,
  ZodUUID: () => ZodUUID,
  ZodURL: () => ZodURL,
  ZodULID: () => ZodULID,
  ZodType: () => ZodType,
  ZodTuple: () => ZodTuple,
  ZodTransform: () => ZodTransform,
  ZodTemplateLiteral: () => ZodTemplateLiteral,
  ZodSymbol: () => ZodSymbol,
  ZodSuccess: () => ZodSuccess,
  ZodStringFormat: () => ZodStringFormat,
  ZodString: () => ZodString,
  ZodSet: () => ZodSet,
  ZodRecord: () => ZodRecord,
  ZodRealError: () => ZodRealError,
  ZodReadonly: () => ZodReadonly,
  ZodPromise: () => ZodPromise,
  ZodPreprocess: () => ZodPreprocess,
  ZodPrefault: () => ZodPrefault,
  ZodPipe: () => ZodPipe,
  ZodOptional: () => ZodOptional,
  ZodObject: () => ZodObject,
  ZodNumberFormat: () => ZodNumberFormat,
  ZodNumber: () => ZodNumber,
  ZodNullable: () => ZodNullable,
  ZodNull: () => ZodNull,
  ZodNonOptional: () => ZodNonOptional,
  ZodNever: () => ZodNever,
  ZodNanoID: () => ZodNanoID,
  ZodNaN: () => ZodNaN,
  ZodMap: () => ZodMap,
  ZodMAC: () => ZodMAC,
  ZodLiteral: () => ZodLiteral,
  ZodLazy: () => ZodLazy,
  ZodKSUID: () => ZodKSUID,
  ZodJWT: () => ZodJWT,
  ZodIssueCode: () => ZodIssueCode,
  ZodIntersection: () => ZodIntersection,
  ZodISOTime: () => ZodISOTime,
  ZodISODuration: () => ZodISODuration,
  ZodISODateTime: () => ZodISODateTime,
  ZodISODate: () => ZodISODate,
  ZodIPv6: () => ZodIPv6,
  ZodIPv4: () => ZodIPv4,
  ZodGUID: () => ZodGUID,
  ZodFunction: () => ZodFunction,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFile: () => ZodFile,
  ZodExactOptional: () => ZodExactOptional,
  ZodError: () => ZodError,
  ZodEnum: () => ZodEnum,
  ZodEmoji: () => ZodEmoji,
  ZodEmail: () => ZodEmail,
  ZodE164: () => ZodE164,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodDefault: () => ZodDefault,
  ZodDate: () => ZodDate,
  ZodCustomStringFormat: () => ZodCustomStringFormat,
  ZodCustom: () => ZodCustom,
  ZodCodec: () => ZodCodec,
  ZodCatch: () => ZodCatch,
  ZodCUID2: () => ZodCUID2,
  ZodCUID: () => ZodCUID,
  ZodCIDRv6: () => ZodCIDRv6,
  ZodCIDRv4: () => ZodCIDRv4,
  ZodBoolean: () => ZodBoolean,
  ZodBigIntFormat: () => ZodBigIntFormat,
  ZodBigInt: () => ZodBigInt,
  ZodBase64URL: () => ZodBase64URL,
  ZodBase64: () => ZodBase64,
  ZodArray: () => ZodArray,
  ZodAny: () => ZodAny,
  TimePrecision: () => TimePrecision,
  NEVER: () => NEVER,
  $output: () => $output,
  $input: () => $input,
  $brand: () => $brand
});
var init_external = __esm(() => {
  init_core2();
  init_core2();
  init_en();
  init_core2();
  init_json_schema_processors();
  init_from_json_schema();
  init_locales();
  init_iso();
  init_iso();
  init_coerce();
  init_schemas2();
  init_checks2();
  init_errors2();
  init_parse2();
  init_compat();
  config(en_default());
});

// node_modules/zod/index.js
var init_zod = __esm(() => {
  init_external();
  init_external();
});

// src/config.ts
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { fileURLToPath } from "node:url";
function safeWarn(log, message, extra) {
  if (!log)
    return;
  try {
    log("warn", message, extra);
  } catch {}
}
function resolveAgentsDir(opts) {
  if (opts.agentDir)
    return opts.agentDir;
  const configDir = opts.configDir ?? path.join(os.homedir(), ".config", "opencode");
  const subdir = opts.agentsSubdir ?? "agent";
  return path.join(configDir, subdir);
}
function estimateTokens(text) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const words = normalized.length === 0 ? 0 : normalized.split(" ").length;
  const punctuation = (normalized.match(/[^\w\s]/g) ?? []).length;
  return Math.ceil(words + punctuation * 0.25);
}
function stripFrontmatter(content) {
  if (!content.startsWith("---"))
    return content;
  const end = content.indexOf(`
---`, 3);
  if (end === -1)
    return content;
  return content.slice(end + 4);
}
function estimatePromptTokens(content) {
  return estimateTokens(stripFrontmatter(content));
}
function assertPromptUnderBudget(content, fileName) {
  const tokens = estimatePromptTokens(content);
  if (tokens > MAX_PROMPT_TOKENS) {
    throw new Error(`${fileName}: ${tokens} tokens exceeds the ${MAX_PROMPT_TOKENS}-token seat-prompt budget`);
  }
}
async function loadBuiltinPresets() {
  const dir = fileURLToPath(new URL("../assets/presets.json", import.meta.url));
  return JSON.parse(await fs.readFile(dir, "utf-8"));
}
async function loadTgoConfig(options) {
  const builtin = await loadBuiltinPresets();
  const parsed = tgoConfigSchema.parse({
    ...options,
    presets: { ...builtin, ...options?.presets }
  });
  return parsed;
}
async function validateAgentDir(agentDir, log) {
  let checked = 0;
  const files = await fs.readdir(agentDir).catch((err) => {
    const msg = "tgo: validateAgentDir readdir failed";
    if (log)
      safeWarn(log, msg, { agentDir, error: String(err) });
    else
      console.warn(`${msg}: ${String(err)}`, { agentDir });
    return [];
  });
  for (const file2 of files) {
    if (!file2.endsWith(".md"))
      continue;
    const content = await fs.readFile(path.join(agentDir, file2), "utf-8");
    assertPromptUnderBudget(content, file2);
    checked++;
  }
  return checked;
}
var MAX_PROMPT_TOKENS = 1000, BD_ENV, SEATS, PRESET_NAMES, modelRef, seatPreset, boardConfig, styleConfig, setupConfig, watchdogConfig, sessionReuseConfig, terminationConfig, selfUpdateConfig, runsConfig, metricsConfig, recursionConfig, costConfig, tgoConfigSchema;
var init_config = __esm(() => {
  init_zod();
  BD_ENV = {
    ...process.env,
    BD_NON_INTERACTIVE: "1",
    HOME: os.homedir()
  };
  SEATS = [
    "bernstein",
    "horowitz",
    "nas",
    "dylan",
    "nirvana",
    "band-members"
  ];
  PRESET_NAMES = ["balanced", "cheap", "frontier"];
  modelRef = exports_external.object({
    model: exports_external.string().min(1),
    variant: exports_external.string().optional()
  });
  seatPreset = exports_external.object({
    bernstein: modelRef,
    horowitz: modelRef,
    nas: modelRef,
    dylan: modelRef,
    nirvana: modelRef,
    "band-members": modelRef
  });
  boardConfig = exports_external.object({
    enabled: exports_external.boolean().default(true),
    refreshMs: exports_external.number().int().positive().default(5000)
  });
  styleConfig = exports_external.object({
    card: exports_external.enum(["default", "prose", "conversational"]).default("default"),
    enabled: exports_external.boolean().default(true),
    reinforcement: exports_external.boolean().default(false)
  });
  setupConfig = exports_external.object({
    enabled: exports_external.boolean().default(true),
    autoInstallBeads: exports_external.boolean().default(true)
  });
  watchdogConfig = exports_external.object({
    enabled: exports_external.boolean().default(true),
    wallClockMs: exports_external.number().int().positive().default(30 * 60 * 1000),
    idleMs: exports_external.number().int().positive().default(15 * 60 * 1000),
    checkMs: exports_external.number().int().positive().default(10 * 1000),
    stuckLoopTools: exports_external.number().int().positive().default(20),
    stuckLoopMs: exports_external.number().int().positive().default(5 * 60 * 1000)
  });
  sessionReuseConfig = exports_external.object({
    enabled: exports_external.boolean().default(true),
    maxContextTokens: exports_external.number().int().positive().default(1e5)
  });
  terminationConfig = exports_external.object({
    enabled: exports_external.boolean().default(true)
  });
  selfUpdateConfig = exports_external.object({
    enabled: exports_external.boolean().default(true)
  });
  runsConfig = exports_external.object({
    maxAgeMs: exports_external.number().int().positive().default(7 * 24 * 60 * 60 * 1000),
    maxBytes: exports_external.number().int().positive().default(50 * 1024 * 1024),
    maxFiles: exports_external.number().int().positive().default(200),
    heartbeatThresholdMs: exports_external.number().int().positive().default(5 * 60 * 1000)
  });
  metricsConfig = exports_external.object({
    enabled: exports_external.boolean().default(true)
  });
  recursionConfig = exports_external.object({
    enabled: exports_external.boolean().default(true),
    maxDepth: exports_external.number().int().positive().default(4)
  });
  costConfig = exports_external.object({
    enabled: exports_external.boolean().default(true)
  });
  tgoConfigSchema = exports_external.object({
    preset: exports_external.enum(PRESET_NAMES).default("balanced"),
    presets: exports_external.object({
      balanced: seatPreset.optional(),
      cheap: seatPreset.optional(),
      frontier: seatPreset.optional()
    }).optional(),
    style: styleConfig.optional().default(() => ({ card: "default", enabled: true, reinforcement: false })),
    agentDir: exports_external.string().optional(),
    checkVersion: exports_external.boolean().default(true),
    board: boardConfig.optional().default(() => ({ enabled: true, refreshMs: 5000 })),
    setup: setupConfig.optional().default(() => ({ enabled: true, autoInstallBeads: true })),
    watchdog: watchdogConfig.optional().default(() => ({
      enabled: true,
      wallClockMs: 30 * 60 * 1000,
      idleMs: 15 * 60 * 1000,
      checkMs: 10 * 1000,
      stuckLoopTools: 20,
      stuckLoopMs: 5 * 60 * 1000
    })),
    sessionReuse: sessionReuseConfig.optional().default(() => ({ enabled: true, maxContextTokens: 1e5 })),
    termination: terminationConfig.optional().default(() => ({ enabled: true })),
    selfUpdate: selfUpdateConfig.optional().default(() => ({ enabled: true })),
    runs: runsConfig.optional().default(() => ({
      maxAgeMs: 7 * 24 * 60 * 60 * 1000,
      maxBytes: 50 * 1024 * 1024,
      maxFiles: 200,
      heartbeatThresholdMs: 5 * 60 * 1000
    })),
    metrics: metricsConfig.optional().default(() => ({ enabled: true })),
    recursion: recursionConfig.optional().default(() => ({ enabled: true, maxDepth: 4 })),
    cost: costConfig.optional().default(() => ({ enabled: true }))
  });
});

// src/def-snapshot.ts
import * as fs2 from "node:fs/promises";
import * as path2 from "node:path";
function isValidBeadID(id) {
  return VALID_BEAD_ID.test(id);
}
function assertValidBeadID(issueId) {
  if (!isValidBeadID(issueId)) {
    throw new Error(`invalid issueId "${issueId}" — must match ${VALID_BEAD_ID.source} (VALID_BEAD_ID)`);
  }
}
function hashString(s) {
  let hash2 = 2166136261;
  for (let i = 0;i < s.length; i++) {
    hash2 ^= s.charCodeAt(i);
    hash2 = Math.imul(hash2, 16777619);
  }
  return (hash2 >>> 0).toString(16).padStart(8, "0");
}
function defSnapshotPath(repoRoot, issueId) {
  assertValidBeadID(issueId);
  return path2.join(repoRoot, ".tgo", issueId, "def-snapshot.json");
}
function normalizeFivePartSections(packet) {
  const obj = typeof packet.Objective === "string" ? packet.Objective : JSON.stringify(packet.Objective ?? "");
  const files = Array.isArray(packet.Files) ? JSON.stringify(packet.Files) : typeof packet.Files === "string" ? packet.Files : JSON.stringify(packet.Files ?? "");
  const interfaces = typeof packet.Interfaces === "string" ? packet.Interfaces : JSON.stringify(packet.Interfaces ?? "");
  const constraints = typeof packet.Constraints === "string" ? packet.Constraints : JSON.stringify(packet.Constraints ?? "");
  const verification = typeof packet.Verification === "string" ? packet.Verification : JSON.stringify(packet.Verification ?? "");
  return [obj, files, interfaces, constraints, verification];
}
function lengthPrefixJoin(parts) {
  return parts.map((s) => `${s.length}:${s}`).join("");
}
function canonicalizeFivePart(sections, joiner = lengthPrefixJoin) {
  return joiner(sections);
}
function hashFivePartPacket(packet) {
  const sections = normalizeFivePartSections(packet);
  const canonical = canonicalizeFivePart(sections);
  return hashString(canonical);
}
function buildDefSnapshot(opts) {
  if (opts.model === "unknown" || opts.model.trim().length === 0) {
    throw new Error(`buildDefSnapshot: model must be a resolved host-authoritative model, not "unknown"`);
  }
  if (opts.preset.trim().length === 0) {
    throw new Error(`buildDefSnapshot: preset must be non-empty`);
  }
  return {
    promptHash: hashFivePartPacket(opts.packet),
    seatFrontmatterHash: hashString(opts.seatFrontmatter),
    seatFileFound: opts.seatFileFound,
    model: opts.model,
    preset: opts.preset,
    capturedAt: opts.capturedAt ?? new Date().toISOString()
  };
}
function buildDefSnapshotFromPrompt(opts) {
  if (opts.model === "unknown" || opts.model.trim().length === 0) {
    throw new Error(`buildDefSnapshotFromPrompt: model must not be "unknown"`);
  }
  return {
    promptHash: hashString(opts.promptText),
    seatFrontmatterHash: hashString(opts.seatFrontmatter),
    seatFileFound: opts.seatFileFound ?? true,
    model: opts.model,
    preset: opts.preset,
    capturedAt: opts.capturedAt ?? new Date().toISOString()
  };
}
async function writeDefSnapshot(repoRoot, issueId, snapshot, opts) {
  assertValidBeadID(issueId);
  if (snapshot.model === "unknown") {
    throw new Error(`writeDefSnapshot: refusing to write snapshot with model "unknown"`);
  }
  const target = defSnapshotPath(repoRoot, issueId);
  const dir = path2.dirname(target);
  try {
    await fs2.mkdir(dir, { recursive: true });
  } catch {}
  if (!opts?.useLatestDefinitions) {
    const content = JSON.stringify(snapshot, null, 2);
    const tmp2 = path2.join(dir, `.def-snapshot-${hashString(content)}-${process.pid}-${Math.random().toString(36).slice(2)}.tmp`);
    try {
      await fs2.writeFile(tmp2, content, "utf-8");
      if (__defSnapshotFaultDelayMs > 0 && !__defSnapshotFaultFired) {
        __defSnapshotFaultFired = true;
        await new Promise((r) => setTimeout(r, __defSnapshotFaultDelayMs));
      }
      await fs2.link(tmp2, target);
      try {
        await fs2.unlink(tmp2);
      } catch {}
      return true;
    } catch (e) {
      try {
        await fs2.unlink(tmp2);
      } catch {}
      const code = e?.code;
      if (code === "EEXIST")
        return false;
      if (code === "ENOENT") {
        try {
          await fs2.mkdir(dir, { recursive: true });
        } catch {}
        const retryTmp = path2.join(dir, `.def-snapshot-${hashString(content)}-${process.pid}-${Math.random().toString(36).slice(2)}.tmp`);
        try {
          await fs2.writeFile(retryTmp, content, "utf-8");
          await fs2.link(retryTmp, target);
          try {
            await fs2.unlink(retryTmp);
          } catch {}
          return true;
        } catch (e2) {
          try {
            await fs2.unlink(retryTmp);
          } catch {}
          const code2 = e2?.code;
          if (code2 === "EEXIST")
            return false;
          throw e2;
        }
      }
      throw e;
    }
  }
  const tmp = path2.join(dir, `def-snapshot.json.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`);
  try {
    await fs2.writeFile(tmp, JSON.stringify(snapshot, null, 2), "utf-8");
    await fs2.rename(tmp, target);
    return true;
  } catch {
    try {
      await fs2.rm(tmp, { force: true });
    } catch {}
    return false;
  }
}
async function readDefSnapshot(repoRoot, issueId) {
  assertValidBeadID(issueId);
  const target = defSnapshotPath(repoRoot, issueId);
  try {
    const raw = await fs2.readFile(target, "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object")
      return;
    const promptHash = parsed.promptHash;
    const seatFrontmatterHash = parsed.seatFrontmatterHash;
    const model = parsed.model;
    const preset = parsed.preset;
    const capturedAt = parsed.capturedAt;
    const seatFileFound = parsed.seatFileFound;
    if (typeof promptHash !== "string" || !/^[0-9a-f]{8}$/.test(promptHash))
      return;
    if (typeof seatFrontmatterHash !== "string" || !/^[0-9a-f]{8}$/.test(seatFrontmatterHash))
      return;
    if (typeof model !== "string" || model.trim().length === 0 || model === "unknown")
      return;
    if (typeof preset !== "string" || preset.trim().length === 0)
      return;
    if (typeof capturedAt !== "string" || capturedAt.trim().length === 0)
      return;
    let found;
    if (seatFileFound === undefined)
      found = true;
    else if (typeof seatFileFound === "boolean")
      found = seatFileFound;
    else
      return;
    return {
      promptHash,
      seatFrontmatterHash,
      model,
      preset,
      seatFileFound: found,
      capturedAt
    };
  } catch {
    return;
  }
}
async function ensureDefSnapshot(opts) {
  assertValidBeadID(opts.issueId);
  const existing = await readDefSnapshot(opts.repoRoot, opts.issueId);
  if (existing && !opts.useLatestDefinitions)
    return { snapshot: existing, written: false, reused: true };
  let snapshot;
  if (opts.packet !== undefined) {
    snapshot = buildDefSnapshot({
      packet: opts.packet,
      seatFrontmatter: opts.seatFrontmatter,
      seatFileFound: opts.seatFileFound,
      model: opts.model,
      preset: opts.preset,
      capturedAt: opts.capturedAt
    });
  } else if (opts.promptText !== undefined) {
    snapshot = buildDefSnapshotFromPrompt({
      promptText: opts.promptText,
      seatFrontmatter: opts.seatFrontmatter,
      seatFileFound: opts.seatFileFound,
      model: opts.model,
      preset: opts.preset,
      capturedAt: opts.capturedAt
    });
  } else {
    throw new Error("ensureDefSnapshot: either packet or promptText must be provided");
  }
  const written = await writeDefSnapshot(opts.repoRoot, opts.issueId, snapshot, { useLatestDefinitions: opts.useLatestDefinitions });
  if (!written) {
    const attempts = 10;
    const intervalMs = 200;
    for (let attempt = 0;attempt < attempts; attempt++) {
      const retry = await readDefSnapshot(opts.repoRoot, opts.issueId);
      if (retry)
        return { snapshot: retry, written: false, reused: true };
      if (existing)
        return { snapshot: existing, written: false, reused: true };
      if (attempt < attempts - 1)
        await new Promise((r) => setTimeout(r, intervalMs));
    }
    const finalRetry = await readDefSnapshot(opts.repoRoot, opts.issueId);
    if (finalRetry)
      return { snapshot: finalRetry, written: false, reused: true };
    if (existing)
      return { snapshot: existing, written: false, reused: true };
    throw new Error(`def-snapshot convergence failed for ${opts.issueId}: final file absent after 2s poll`);
  }
  return { snapshot, written, reused: false };
}
var VALID_BEAD_ID, __defSnapshotFaultDelayMs = 0, __defSnapshotFaultFired = false;
var init_def_snapshot = __esm(() => {
  VALID_BEAD_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
});

// src/progress.ts
var exports_progress = {};
__export(exports_progress, {
  writeProgress: () => writeProgress,
  updateProgress: () => updateProgress,
  readProgress: () => readProgress,
  progressPath: () => progressPath,
  parseProgress: () => parseProgress,
  isSuspendBlocker: () => isSuspendBlocker,
  formatSuspendBlockerFromReason: () => formatSuspendBlockerFromReason,
  formatProgress: () => formatProgress,
  PROGRESS_LOCK_STALE_MS: () => PROGRESS_LOCK_STALE_MS
});
import * as fs3 from "node:fs/promises";
import * as path3 from "node:path";
function progressPath(repoRoot, issueId) {
  assertValidBeadID(issueId);
  return path3.join(repoRoot, ".tgo", issueId, "progress.md");
}
async function readProgress(repoRoot, issueId) {
  assertValidBeadID(issueId);
  try {
    const target = progressPath(repoRoot, issueId);
    const data = await fs3.readFile(target, "utf-8");
    return data;
  } catch {
    return;
  }
}
async function acquireProgressLock(issueDir, lockPath) {
  try {
    await fs3.mkdir(issueDir, { recursive: true });
  } catch {}
  const ownerToken = `${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}`;
  let acquired = false;
  const tryAcquire = async () => {
    let handle;
    try {
      handle = await fs3.open(lockPath, "wx");
      try {
        await handle.writeFile(ownerToken, "utf-8");
      } catch {}
      acquired = true;
      return true;
    } catch (err) {
      const code = err?.code;
      if (code !== "EEXIST") {
        return false;
      }
      return false;
    } finally {
      if (handle) {
        try {
          await handle.close();
        } catch {}
      }
    }
  };
  let ok = await tryAcquire();
  if (!ok) {
    try {
      const stat2 = await fs3.stat(lockPath);
      const age = Date.now() - stat2.mtimeMs;
      if (age > PROGRESS_LOCK_STALE_MS) {
        try {
          await fs3.unlink(lockPath);
        } catch {}
        ok = await tryAcquire();
        if (!ok)
          return null;
        acquired = true;
      } else {
        return null;
      }
    } catch {
      return null;
    }
  } else {
    acquired = true;
  }
  if (!acquired)
    return null;
  return ownerToken;
}
async function releaseProgressLock(lockPath, ownerToken) {
  try {
    const cur = await fs3.readFile(lockPath, "utf-8");
    if (cur === ownerToken) {
      await fs3.unlink(lockPath);
    }
  } catch {}
}
async function writeProgress(repoRoot, issueId, content) {
  assertValidBeadID(issueId);
  try {
    const issueDir = path3.join(repoRoot, ".tgo", issueId);
    const lockPath = path3.join(issueDir, "progress.lock");
    const targetPath = path3.join(issueDir, "progress.md");
    const ownerToken = await acquireProgressLock(issueDir, lockPath);
    if (!ownerToken)
      return false;
    try {
      await fs3.mkdir(issueDir, { recursive: true });
      const tmp = path3.join(issueDir, `progress.md.${process.pid}.${Date.now()}.tmp`);
      await fs3.writeFile(tmp, content, "utf-8");
      await fs3.rename(tmp, targetPath);
      return true;
    } catch {
      return false;
    } finally {
      await releaseProgressLock(lockPath, ownerToken);
    }
  } catch {
    return false;
  }
}
async function updateProgress(repoRoot, issueId, merge2, log) {
  assertValidBeadID(issueId);
  try {
    const issueDir = path3.join(repoRoot, ".tgo", issueId);
    const lockPath = path3.join(issueDir, "progress.lock");
    const targetPath = path3.join(issueDir, "progress.md");
    const ownerToken = await acquireProgressLock(issueDir, lockPath);
    if (!ownerToken)
      return false;
    try {
      let current;
      try {
        const data = await fs3.readFile(targetPath, "utf-8");
        current = parseProgress(data);
      } catch {
        current = { touchSet: [], decisions: [], blockers: [], extra: {} };
      }
      let next;
      try {
        next = merge2(current);
      } catch (err) {
        if (log)
          safeWarn(log, "tgo: updateProgress merge failed", { error: String(err), repoRoot, issueId });
        else
          console.warn(`tgo: updateProgress merge failed: ${String(err)}`, { repoRoot, issueId });
        return false;
      }
      if (!next.extra)
        next.extra = current.extra ?? {};
      if (!Array.isArray(next.touchSet))
        next.touchSet = [];
      if (!Array.isArray(next.decisions))
        next.decisions = [];
      if (!Array.isArray(next.blockers))
        next.blockers = [];
      const content = formatProgress(next);
      try {
        await fs3.mkdir(issueDir, { recursive: true });
        const tmp = path3.join(issueDir, `progress.md.${process.pid}.${Date.now()}.tmp`);
        await fs3.writeFile(tmp, content, "utf-8");
        await fs3.rename(tmp, targetPath);
        return true;
      } catch {
        return false;
      }
    } finally {
      await releaseProgressLock(lockPath, ownerToken);
    }
  } catch {
    return false;
  }
}
function formatProgress(parts) {
  const lines = [];
  lines.push("## Objective");
  if (parts.objective !== undefined) {
    lines.push(parts.objective);
  }
  lines.push("## Touch set");
  for (const f of parts.touchSet) {
    lines.push(`- ${f}`);
  }
  lines.push("## Decisions");
  for (const d of parts.decisions) {
    lines.push(`- ${d}`);
  }
  lines.push("## Blockers");
  for (const b of parts.blockers) {
    lines.push(`- ${b}`);
  }
  lines.push("## Status");
  if (parts.lastStatus !== undefined) {
    lines.push(parts.lastStatus);
  }
  const extra = parts.extra ?? {};
  for (const [name, items] of Object.entries(extra)) {
    lines.push(`## ${name}`);
    for (const it of items) {
      lines.push(it);
    }
  }
  return lines.join(`
`) + `
`;
}
function parseProgress(content) {
  const result = {
    touchSet: [],
    decisions: [],
    blockers: [],
    extra: {}
  };
  const lines = content.split(/\r?\n/);
  let current = null;
  let currentExtra = null;
  const objectiveLines = [];
  const statusLines = [];
  for (const raw of lines) {
    const trimmed = raw.trim();
    if (trimmed.startsWith("## ")) {
      const headerRaw = trimmed.slice(3).trim();
      const header = headerRaw.toLowerCase();
      if (header === "objective") {
        current = "objective";
        currentExtra = null;
      } else if (header === "touch set") {
        current = "touchSet";
        currentExtra = null;
      } else if (header === "decisions") {
        current = "decisions";
        currentExtra = null;
      } else if (header === "blockers") {
        current = "blockers";
        currentExtra = null;
      } else if (header === "status") {
        current = "status";
        currentExtra = null;
      } else {
        current = null;
        currentExtra = headerRaw;
        if (!(currentExtra in result.extra)) {
          result.extra[currentExtra] = [];
        }
      }
      continue;
    }
    if (currentExtra !== null) {
      result.extra[currentExtra].push(raw);
      continue;
    }
    if (current === null)
      continue;
    if (trimmed === "")
      continue;
    if (current === "objective") {
      objectiveLines.push(raw);
    } else if (current === "status") {
      statusLines.push(raw);
    } else if (current === "touchSet" || current === "decisions" || current === "blockers") {
      if (trimmed.startsWith("- ")) {
        const val = trimmed.slice(2);
        if (current === "touchSet")
          result.touchSet.push(val);
        else if (current === "decisions")
          result.decisions.push(val);
        else
          result.blockers.push(val);
      } else if (trimmed.startsWith("-")) {
        const val = trimmed.slice(1).trim();
        if (val.length > 0) {
          if (current === "touchSet")
            result.touchSet.push(val);
          else if (current === "decisions")
            result.decisions.push(val);
          else
            result.blockers.push(val);
        }
      }
    }
  }
  if (objectiveLines.length > 0) {
    const joined = objectiveLines.join(`
`).trim();
    if (joined.length > 0)
      result.objective = joined;
  }
  if (statusLines.length > 0) {
    const joined = statusLines.join(`
`).trim();
    if (joined.length > 0)
      result.lastStatus = joined;
  }
  for (const key of Object.keys(result.extra)) {
    const items = result.extra[key] ?? [];
    let start = 0;
    let end = items.length;
    while (start < end && items[start].trim() === "")
      start++;
    while (end > start && items[end - 1].trim() === "")
      end--;
    result.extra[key] = items.slice(start, end);
  }
  return result;
}
function isSuspendBlocker(blocker) {
  return blocker.startsWith("⏸ awaiting human:");
}
function formatSuspendBlockerFromReason(reason, requiredFields) {
  const fieldsStr = requiredFields.length > 0 ? requiredFields.join(", ") : "response";
  return `⏸ awaiting human: ${reason} — reply with: ${fieldsStr}`;
}
var PROGRESS_LOCK_STALE_MS = 1e4;
var init_progress = __esm(() => {
  init_config();
  init_def_snapshot();
});

// src/session-reuse.ts
var exports_session_reuse = {};
__export(exports_session_reuse, {
  writeDefSnapshot: () => writeDefSnapshot2,
  upsertSession: () => upsertSession,
  shouldReuseWithSnapshot: () => shouldReuseWithSnapshot,
  shouldReuse: () => shouldReuse,
  saveSessionMap: () => saveSessionMap,
  readDefSnapshot: () => readDefSnapshot2,
  probeSessionReuseCapability: () => probeSessionReuseCapability,
  persistAbortHandback: () => persistAbortHandback,
  loadSessionMap: () => loadSessionMap,
  issueIdBySession: () => issueIdBySession,
  isValidBeadID: () => isValidBeadID,
  hashString: () => hashString2,
  hashSeatFrontmatter: () => hashSeatFrontmatter,
  hashPrompt: () => hashPrompt,
  hashFivePartPacket: () => hashFivePartPacket,
  hashDelegationPacket: () => hashDelegationPacket,
  estimateSessionTokens: () => estimateSessionTokens,
  ensureDefSnapshot: () => ensureDefSnapshot2,
  defSnapshotPath: () => defSnapshotPath2,
  decideReuse: () => decideReuse,
  captureDelegationSession: () => captureDelegationSession,
  buildDefSnapshot: () => buildDefSnapshot2,
  assertValidBeadID: () => assertValidBeadID
});
import * as fs4 from "node:fs/promises";
import * as path4 from "node:path";
function hashPrompt(promptText) {
  return hashString(promptText);
}
function hashSeatFrontmatter(content) {
  return hashString(content);
}
function defSnapshotPath2(repoRoot, issueId) {
  return defSnapshotPath(repoRoot, issueId);
}
function buildDefSnapshot2(opts) {
  return buildDefSnapshotFromPrompt({ promptText: opts.promptText, seatFrontmatter: opts.seatFrontmatter, seatFileFound: opts.seatFileFound ?? true, model: opts.model, preset: opts.preset, capturedAt: opts.capturedAt });
}
function decideReuse(opts) {
  if (opts.useLatestDefinitions === true) {
    return { reuse: false, reason: "useLatestDefinitions opt-in — terminating prior session", terminatePrior: true };
  }
  if (opts.existingSnapshot) {
    if (opts.currentPromptHash && opts.existingSnapshot.promptHash !== opts.currentPromptHash) {
      return { reuse: true, reason: "pinned — snapshot reused despite definition change" };
    }
    return { reuse: true, reason: "pinned — snapshot exists, default reuse" };
  }
  if (opts.estimate < opts.maxContextTokens) {
    return { reuse: true, reason: "within budget (legacy, no snapshot)" };
  }
  return { reuse: false, reason: "context overflow (legacy, no snapshot)" };
}
function shouldReuseWithSnapshot(estimate, maxContextTokens, opts) {
  if (opts?.useLatestDefinitions === true)
    return false;
  if (opts?.snapshot)
    return true;
  return estimate < maxContextTokens;
}
async function loadSessionMap(repoRoot) {
  const target = path4.join(repoRoot, ".tgo", "sessions.json");
  try {
    const raw = await fs4.readFile(target, "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return {};
    const out = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (!value || typeof value !== "object" || Array.isArray(value))
        continue;
      const entry = value;
      if (typeof entry.sessionId !== "string" || !/^ses_[A-Za-z0-9]+$/.test(entry.sessionId))
        continue;
      if (typeof entry.updatedAt !== "string")
        continue;
      if (entry.promptHash !== undefined && (typeof entry.promptHash !== "string" || !/^[0-9a-f]{8}$/.test(entry.promptHash)))
        continue;
      out[key] = {
        sessionId: entry.sessionId,
        delegationId: typeof entry.delegationId === "string" ? entry.delegationId : undefined,
        exitGate: typeof entry.exitGate === "boolean" ? entry.exitGate : undefined,
        updatedAt: entry.updatedAt,
        promptHash: typeof entry.promptHash === "string" ? entry.promptHash : undefined
      };
    }
    return out;
  } catch {
    return {};
  }
}
async function saveSessionMap(repoRoot, map2) {
  const dir = path4.join(repoRoot, ".tgo");
  await fs4.mkdir(dir, { recursive: true });
  const target = path4.join(dir, "sessions.json");
  const tmp = path4.join(dir, `sessions.json.${process.pid}.${Date.now()}.tmp`);
  const payload = JSON.stringify(map2, null, 2);
  await fs4.writeFile(tmp, payload, "utf-8");
  await fs4.rename(tmp, target);
}
function upsertSession(map2, issueId, entry) {
  return { ...map2, [issueId]: entry };
}
function issueIdBySession(map2, sessionId) {
  for (const [issueId, entry] of Object.entries(map2)) {
    if (entry.sessionId === sessionId)
      return issueId;
  }
  return;
}
function parseIssueIdFromDelegationText(text) {
  const quoted = text.match(/["']issueId["']\s*:\s*["']([^"']+)["']/);
  if (quoted && quoted[1]) {
    const v = quoted[1].trim();
    if (v.length > 0)
      return v;
  }
  const plain = text.match(/\bissueId\b\s*[:=]\s*["']?([A-Za-z0-9][A-Za-z0-9-_]*)/);
  if (plain && plain[1]) {
    const v = plain[1].trim();
    if (v.length > 0)
      return v;
  }
  return;
}
async function persistAbortHandback(opts) {
  try {
    let map2 = await loadSessionMap(opts.repoRoot);
    let issueId = issueIdBySession(map2, opts.sessionID);
    if (issueId)
      assertValidBeadID(issueId);
    if (!issueId && opts.fetchSessionMessages) {
      let fetchedIssueId;
      try {
        const messages = await opts.fetchSessionMessages(opts.sessionID);
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
          throw new Error("no messages");
        }
        let firstText;
        let hasUserPart = false;
        for (const msg of messages) {
          if (!msg || msg.role !== "user" || !Array.isArray(msg.parts))
            continue;
          for (const part of msg.parts) {
            if (part && part.type === "text" && typeof part.text === "string") {
              hasUserPart = true;
              if (part.text.trim().length > 0) {
                firstText = part.text;
                break;
              }
            }
          }
          if (firstText)
            break;
        }
        if (!firstText && !hasUserPart) {
          for (const msg of messages) {
            if (!msg || !Array.isArray(msg.parts))
              continue;
            for (const part of msg.parts) {
              if (part && part.type === "text" && typeof part.text === "string" && part.text.trim().length > 0) {
                firstText = part.text;
                break;
              }
            }
            if (firstText)
              break;
          }
        }
        if (!firstText) {
          throw new Error("no text part");
        }
        fetchedIssueId = parseIssueIdFromDelegationText(firstText);
        if (!fetchedIssueId) {
          throw new Error("no issueId in delegation prompt");
        }
      } catch (e) {
        safeWarn(opts.log, `progress handback failed: ${String(e)}`);
        return;
      }
      issueId = fetchedIssueId;
      assertValidBeadID(issueId);
      try {
        const entry = { sessionId: opts.sessionID, updatedAt: new Date().toISOString() };
        const nextMap = upsertSession(map2, issueId, entry);
        await saveSessionMap(opts.repoRoot, nextMap);
        map2 = nextMap;
      } catch (e) {
        safeWarn(opts.log, `progress handback failed: ${String(e)}`);
      }
    }
    if (!issueId)
      return;
    assertValidBeadID(issueId);
    const blocker = `watchdog abort (${opts.reason}) at ${new Date().toISOString()} — session ${opts.sessionID}; re-dispatch may reuse its task_id`;
    const ok = await updateProgress(opts.repoRoot, issueId, (parts) => ({
      ...parts,
      blockers: [...parts.blockers, blocker]
    }), opts.log);
    if (!ok) {
      throw new Error(`writeProgress failed for ${issueId}`);
    }
  } catch (e) {
    safeWarn(opts.log, `progress handback failed: ${String(e)}`);
  }
}
function probeSessionReuseCapability(version2) {
  if (version2 === undefined) {
    return { supported: true, reason: "version unavailable; assuming v1 task tool" };
  }
  const trimmed = version2.trim();
  if (trimmed.length === 0) {
    return { supported: true, reason: "version unavailable; assuming v1 task tool" };
  }
  const majorStr = trimmed.split(".")[0] ?? "";
  const cleaned = majorStr.replace(/^v/i, "");
  const major = Number.parseInt(cleaned, 10);
  if (Number.isNaN(major)) {
    return { supported: true, reason: "version unavailable; assuming v1 task tool" };
  }
  if (major >= 2) {
    return { supported: false, reason: "v2 subagent tool cannot resume sessions" };
  }
  return { supported: true, reason: "v1 task tool supports task_id resume" };
}
function estimateSessionTokens(messages) {
  let total = 0;
  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type === "text" && typeof part.text === "string") {
        total += estimateTokens(part.text);
      }
    }
  }
  return total;
}
function shouldReuse(estimate, maxContextTokens) {
  return estimate < maxContextTokens;
}
async function ensureDefSnapshot2(opts) {
  return ensureDefSnapshot({
    repoRoot: opts.repoRoot,
    issueId: opts.issueId,
    promptText: opts.promptText,
    seatFrontmatter: opts.seatFrontmatter,
    seatFileFound: opts.seatFileFound ?? true,
    model: opts.model,
    preset: opts.preset,
    useLatestDefinitions: opts.useLatestDefinitions,
    capturedAt: opts.capturedAt
  });
}
async function captureDelegationSession(deps) {
  if (!deps.enabled)
    return;
  if (deps.tool !== "task")
    return;
  try {
    const rawInput = deps.input;
    const taskArgs = rawInput && typeof rawInput.args === "object" && rawInput.args !== null ? rawInput.args : rawInput;
    const packet = taskArgs?.delegationPacket && typeof taskArgs.delegationPacket === "object" ? taskArgs.delegationPacket : undefined;
    const issueIdRaw = typeof packet?.issueId === "string" ? packet.issueId.trim() : "";
    const delegationId = typeof packet?.delegationId === "string" ? packet.delegationId.trim() : undefined;
    const outputRec = deps.output;
    const outputText = typeof outputRec?.output === "string" ? outputRec.output : "";
    if (outputText.includes("Background task started")) {
      return;
    }
    if (!issueIdRaw) {
      return;
    }
    if (!isValidBeadID(issueIdRaw)) {
      throw new Error(`invalid issueId "${issueIdRaw}" — must match ${/^[A-Za-z0-9][A-Za-z0-9._-]*$/.source}`);
    }
    const issueId = issueIdRaw;
    let sessionId;
    const meta3 = deps.output?.metadata;
    if (meta3 && typeof meta3 === "object" && typeof meta3.sessionId === "string") {
      const raw = meta3.sessionId;
      if (raw.trim().length > 0)
        sessionId = raw.trim();
    }
    if (!sessionId) {
      const match = outputText.match(/ses_[A-Za-z0-9]+/);
      if (match)
        sessionId = match[0];
    }
    if (!sessionId) {
      return;
    }
    if (!/^ses_[A-Za-z0-9]+$/.test(sessionId)) {
      return;
    }
    let promptHash;
    try {
      const snap = await readDefSnapshot2(deps.repoRoot, issueId);
      if (snap)
        promptHash = snap.promptHash;
    } catch (e) {
      if (String(e).includes("invalid issueId"))
        throw e;
    }
    const map2 = await loadSessionMap(deps.repoRoot);
    const exitGate = typeof packet?.exitGate === "boolean" ? packet.exitGate : undefined;
    const entry = {
      sessionId,
      delegationId,
      updatedAt: new Date().toISOString(),
      ...exitGate !== undefined ? { exitGate } : {},
      ...promptHash ? { promptHash } : {}
    };
    assertValidBeadID(issueId);
    await saveSessionMap(deps.repoRoot, upsertSession(map2, issueId, entry));
  } catch (error51) {
    safeWarn(deps.log, `session-reuse capture failed: ${String(error51)}`);
  }
}
var hashString2, writeDefSnapshot2, readDefSnapshot2, hashDelegationPacket;
var init_session_reuse = __esm(() => {
  init_config();
  init_progress();
  init_def_snapshot();
  hashString2 = hashString;
  writeDefSnapshot2 = writeDefSnapshot;
  readDefSnapshot2 = readDefSnapshot;
  hashDelegationPacket = hashFivePartPacket;
});

// src/metrics.ts
var exports_metrics = {};
__export(exports_metrics, {
  writeMetrics: () => writeMetrics,
  renderQueueLine: () => renderQueueLine,
  readMetrics: () => readMetrics,
  problemsFromRecovery: () => problemsFromRecovery,
  metricsPath: () => metricsPath,
  hasGrowingDepth: () => hasGrowingDepth,
  computeMetrics: () => computeMetrics,
  buildProblemsSection: () => buildProblemsSection
});
import * as fs6 from "node:fs/promises";
import * as path6 from "node:path";
function metricsPath(repoRoot) {
  return path6.join(repoRoot, ".tgo", "metrics.json");
}
async function writeMetrics(repoRoot, snapshot) {
  while (metricsWriteInFlight) {
    try {
      await metricsWriteInFlight;
    } catch {}
    try {
      const existing = await readMetrics(repoRoot);
      if (existing) {
        const existingTs = Date.parse(existing.updatedAt);
        const incomingTs = Date.parse(snapshot.updatedAt);
        if (!Number.isNaN(existingTs) && !Number.isNaN(incomingTs) && incomingTs <= existingTs)
          return;
      }
    } catch {}
    if (!metricsWriteInFlight)
      break;
  }
  const task = (async () => {
    const dir = path6.join(repoRoot, ".tgo");
    await fs6.mkdir(dir, { recursive: true });
    const target = metricsPath(repoRoot);
    try {
      const existing = await readMetrics(repoRoot);
      if (existing) {
        const existingTs = Date.parse(existing.updatedAt);
        const incomingTs = Date.parse(snapshot.updatedAt);
        if (!Number.isNaN(existingTs) && !Number.isNaN(incomingTs) && incomingTs <= existingTs) {
          return;
        }
      }
    } catch {}
    const tmp = path6.join(dir, `metrics.json.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`);
    await fs6.writeFile(tmp, JSON.stringify(snapshot, null, 2), "utf-8");
    try {
      const existing2 = await readMetrics(repoRoot);
      if (existing2) {
        const existingTs2 = Date.parse(existing2.updatedAt);
        const incomingTs2 = Date.parse(snapshot.updatedAt);
        if (!Number.isNaN(existingTs2) && !Number.isNaN(incomingTs2) && incomingTs2 <= existingTs2) {
          try {
            await fs6.unlink(tmp);
          } catch {}
          return;
        }
      }
    } catch {}
    await fs6.rename(tmp, target);
  })();
  metricsWriteInFlight = task;
  try {
    await task;
  } finally {
    if (metricsWriteInFlight === task)
      metricsWriteInFlight = undefined;
  }
}
async function readMetrics(repoRoot) {
  const target = metricsPath(repoRoot);
  try {
    const raw = await fs6.readFile(target, "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return;
    const bySeat = parsed.bySeat;
    const updatedAt = parsed.updatedAt;
    if (!bySeat || typeof bySeat !== "object" || Array.isArray(bySeat))
      return;
    if (typeof updatedAt !== "string")
      return;
    const out = {};
    for (const [seat, v] of Object.entries(bySeat)) {
      if (!v || typeof v !== "object" || Array.isArray(v))
        continue;
      const rec = v;
      if (typeof rec.queueDepth !== "number" || typeof rec.inFlight !== "number" || typeof rec.waitMs !== "number")
        continue;
      out[seat] = { queueDepth: rec.queueDepth, inFlight: rec.inFlight, waitMs: rec.waitMs };
    }
    return { bySeat: out, updatedAt };
  } catch {
    return;
  }
}
function computeMetrics(input) {
  const now = input.now ?? Date.now();
  const readyCount = input.ready.length;
  const seenSessionIds = new Set;
  const streamingBySeat = new Map;
  const perSeatSessions = new Map;
  for (const s of input.streaming) {
    const seat = (s.target ?? "").trim() || "unknown";
    const sid = s.id;
    if (sid && seenSessionIds.has(sid))
      continue;
    if (sid)
      seenSessionIds.add(sid);
    let set2 = perSeatSessions.get(seat);
    if (!set2) {
      set2 = new Set;
      perSeatSessions.set(seat, set2);
    }
    if (sid)
      set2.add(sid);
    const cur = streamingBySeat.get(seat) ?? { count: 0, earliest: undefined };
    cur.count += 1;
    if (s.startedAt !== undefined && Number.isFinite(s.startedAt)) {
      if (cur.earliest === undefined || s.startedAt < cur.earliest)
        cur.earliest = s.startedAt;
    }
    streamingBySeat.set(seat, cur);
  }
  if (input.watchdogTracked && input.shimAgents) {
    for (const t of input.watchdogTracked) {
      if (!t.busy)
        continue;
      const sid = t.sessionID;
      if (seenSessionIds.has(sid))
        continue;
      const seat = input.shimAgents.get(sid);
      if (!seat)
        continue;
      seenSessionIds.add(sid);
      let set2 = perSeatSessions.get(seat);
      if (!set2) {
        set2 = new Set;
        perSeatSessions.set(seat, set2);
      }
      set2.add(sid);
      const cur = streamingBySeat.get(seat) ?? { count: 0, earliest: undefined };
      cur.count += 1;
      streamingBySeat.set(seat, cur);
    }
  }
  const bySeat = {};
  const allSeats = new Set([...SEATS, ...streamingBySeat.keys()]);
  if (input.previous) {
    for (const k of Object.keys(input.previous.bySeat))
      allSeats.add(k);
  }
  for (const seat of allSeats) {
    const info = streamingBySeat.get(seat);
    const inFlight = info?.count ?? 0;
    const waitMs = info?.earliest !== undefined ? Math.max(0, now - info.earliest) : 0;
    const queueDepth = readyCount;
    bySeat[seat] = { queueDepth, inFlight, waitMs };
  }
  return { bySeat, updatedAt: new Date(now).toISOString() };
}
function hasGrowingDepth(previous, current) {
  if (!previous)
    return false;
  for (const [seat, cur] of Object.entries(current.bySeat)) {
    const prev = previous.bySeat[seat];
    if (prev && cur.queueDepth > prev.queueDepth && cur.queueDepth > 0)
      return true;
  }
  return false;
}
function renderQueueLine(snapshot, previous) {
  if (!snapshot)
    return;
  const lines = [];
  const growing = hasGrowingDepth(previous, snapshot);
  for (const seat of Object.keys(snapshot.bySeat).sort()) {
    const m = snapshot.bySeat[seat];
    if (m.queueDepth === 0 && m.inFlight === 0)
      continue;
    const base = `QUEUE: ${seat} ${m.queueDepth} pending`;
    const inFlightPart = m.inFlight > 0 ? ` (${m.inFlight} in-flight, wait ${Math.round(m.waitMs / 1000)}s)` : "";
    const warning = growing && m.queueDepth > (previous?.bySeat[seat]?.queueDepth ?? 0) ? " ⚠️ growing" : "";
    lines.push(`${base}${inFlightPart}${warning}`);
  }
  if (lines.length === 0)
    return;
  return lines.join(`
`);
}
function buildProblemsSection(problems) {
  if (problems.length === 0)
    return;
  const grouped = new Map;
  for (const p of problems) {
    const arr = grouped.get(p.state) ?? [];
    arr.push(p);
    grouped.set(p.state, arr);
  }
  const order = ["stuck", "aborted", "idle", "awaiting"];
  const lines = ["PROBLEMS:"];
  for (const state of order) {
    const arr = grouped.get(state);
    if (!arr || arr.length === 0)
      continue;
    const label = state.toUpperCase();
    for (const e of arr) {
      const note = e.reason ? ` — ${e.reason}` : "";
      lines.push(`- ${e.runId} · ${label}${note}`);
    }
  }
  for (const [state, arr] of grouped) {
    if (order.includes(state))
      continue;
    for (const e of arr) {
      lines.push(`- ${e.runId} · ${state.toUpperCase()} — ${e.reason}`);
    }
  }
  return lines.join(`
`);
}
function problemsFromRecovery(recovery, watchdogProblems) {
  const out = [];
  for (const r of recovery) {
    if (r.reason === "suspended") {
      out.push({ runId: r.runId, state: "awaiting", reason: "suspended — await.json present", lastTs: r.lastHeartbeat });
    } else if (r.reason === "dead-heartbeat") {
      out.push({ runId: r.runId, state: "stuck", reason: `dead heartbeat — last ${r.lastHeartbeat ? new Date(r.lastHeartbeat).toISOString() : "unknown"}`, lastTs: r.lastHeartbeat });
    } else if (r.reason === "aborted") {
      out.push({ runId: r.runId, state: "aborted", reason: "aborted — terminal status", lastTs: r.lastHeartbeat });
    }
  }
  if (watchdogProblems) {
    for (const w of watchdogProblems) {
      const runId = w.issueId ?? w.sessionID;
      out.push({ runId, state: w.state, reason: w.reason });
    }
  }
  return out;
}
var metricsWriteInFlight;
var init_metrics = __esm(() => {
  init_config();
});

// src/runs.ts
var exports_runs = {};
__export(exports_runs, {
  scanRunsForProblems: () => scanRunsForProblems,
  sanitizeCmd: () => sanitizeCmd,
  runsDir: () => runsDir,
  runPath: () => runPath,
  readRunEvents: () => readRunEvents,
  pruneRuns: () => pruneRuns,
  isTerminalStatus: () => isTerminalStatus,
  hashArgs: () => hashArgs,
  hasAwaitJson: () => hasAwaitJson,
  awaitJsonPath: () => awaitJsonPath2,
  appendRunEvent: () => appendRunEvent,
  DEFAULT_PRUNE_MAX_FILES: () => DEFAULT_PRUNE_MAX_FILES,
  DEFAULT_PRUNE_MAX_BYTES: () => DEFAULT_PRUNE_MAX_BYTES,
  DEFAULT_PRUNE_MAX_AGE_MS: () => DEFAULT_PRUNE_MAX_AGE_MS,
  DEFAULT_HEARTBEAT_THRESHOLD_MS: () => DEFAULT_HEARTBEAT_THRESHOLD_MS
});
import * as fs10 from "node:fs/promises";
import * as path10 from "node:path";
function isTerminalStatus(event) {
  return event.type === "status" && typeof event.note === "string" && TERMINAL_NOTES.has(event.note.trim().toLowerCase());
}
function sanitizeCmd(cmd) {
  const stripped = cmd.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  if (stripped.length > 500)
    return stripped.slice(0, 500);
  return stripped;
}
function runsDir(repoRoot) {
  return path10.join(repoRoot, ".tgo", "runs");
}
function runPath(repoRoot, runId) {
  assertValidBeadID(runId);
  return path10.join(runsDir(repoRoot), `${runId}.jsonl`);
}
function awaitJsonPath2(repoRoot, issueId) {
  assertValidBeadID(issueId);
  return path10.join(repoRoot, ".tgo", issueId, "await.json");
}
async function hasAwaitJson(repoRoot, issueId) {
  assertValidBeadID(issueId);
  const p = awaitJsonPath2(repoRoot, issueId);
  try {
    await fs10.stat(p);
    return true;
  } catch {
    return false;
  }
}
async function appendRunEvent(repoRoot, runId, event) {
  assertValidBeadID(runId);
  if (typeof event.ts !== "number" || !Number.isFinite(event.ts)) {
    throw new Error(`appendRunEvent: ts must be finite number for ${runId}`);
  }
  if (event.type !== "step" && event.type !== "heartbeat" && event.type !== "status") {
    throw new Error(`appendRunEvent: invalid type "${event.type}" for ${runId}`);
  }
  if (typeof event.seat !== "string" || event.seat.trim().length === 0) {
    throw new Error(`appendRunEvent: seat must be non-empty string for ${runId}`);
  }
  if (typeof event.tool !== "string" || event.tool.trim().length === 0) {
    throw new Error(`appendRunEvent: tool REQUIRED non-empty for ${runId} (heartbeat uses "heartbeat")`);
  }
  if (typeof event.ok !== "boolean") {
    throw new Error(`appendRunEvent: ok REQUIRED boolean for ${runId}`);
  }
  if (typeof event.issueId !== "string" || event.issueId.trim().length === 0) {
    throw new Error(`appendRunEvent: issueId REQUIRED for ${runId}`);
  }
  assertValidBeadID(event.issueId);
  if (typeof event.argsHash !== "string" || event.argsHash.trim().length === 0) {
    throw new Error(`appendRunEvent: argsHash REQUIRED for ${runId}`);
  }
  if (event.type === "status") {
    const note = (event.note ?? "").trim().toLowerCase();
    if (!TERMINAL_NOTES.has(note)) {
      throw new Error(`appendRunEvent: status RESERVED for terminal notes complete|failed|aborted, got "${event.note}" for ${runId}`);
    }
  }
  if (event.cmd !== undefined) {
    if (typeof event.cmd !== "string")
      throw new Error(`appendRunEvent: cmd must be string for ${runId}`);
    event = { ...event, cmd: sanitizeCmd(event.cmd) };
  }
  const dir = runsDir(repoRoot);
  await fs10.mkdir(dir, { recursive: true });
  const target = runPath(repoRoot, runId);
  const line = JSON.stringify(event) + `
`;
  await fs10.appendFile(target, line, "utf-8");
}
async function readRunEvents(repoRoot, runId) {
  assertValidBeadID(runId);
  const target = runPath(repoRoot, runId);
  try {
    const raw = await fs10.readFile(target, "utf-8");
    if (!raw.trim())
      return [];
    const out = [];
    for (const line of raw.split(`
`)) {
      const t = line.trim();
      if (!t)
        continue;
      try {
        const parsed = JSON.parse(t);
        if (parsed && typeof parsed.ts === "number" && typeof parsed.type === "string" && typeof parsed.seat === "string" && typeof parsed.tool === "string" && typeof parsed.ok === "boolean" && typeof parsed.issueId === "string") {
          out.push(parsed);
        } else {
          if (parsed && typeof parsed.ts === "number" && typeof parsed.type === "string" && typeof parsed.seat === "string") {
            const synthetic = {
              ts: parsed.ts,
              type: parsed.type,
              seat: parsed.seat,
              tool: parsed.tool ?? (parsed.type === "heartbeat" ? "heartbeat" : "unknown"),
              argsHash: parsed.argsHash ?? hashString(""),
              ok: typeof parsed.ok === "boolean" ? parsed.ok : true,
              issueId: parsed.issueId ?? runId,
              note: parsed.note,
              durationMs: parsed.durationMs,
              cmd: parsed.cmd
            };
            out.push(synthetic);
          }
        }
      } catch {}
    }
    return out;
  } catch {
    return [];
  }
}
function hashArgs(args) {
  if (typeof args === "string")
    return hashString(args);
  try {
    return hashString(JSON.stringify(args ?? ""));
  } catch {
    return hashString(String(args));
  }
}
async function scanRunsForProblems(repoRoot, opts = {}) {
  const now = opts.now ?? Date.now();
  const threshold = opts.heartbeatThresholdMs ?? DEFAULT_HEARTBEAT_THRESHOLD_MS;
  const dir = runsDir(repoRoot);
  let files = [];
  try {
    files = await fs10.readdir(dir);
  } catch {
    return [];
  }
  const out = [];
  for (const file2 of files) {
    if (!file2.endsWith(".jsonl"))
      continue;
    const runId = file2.slice(0, -".jsonl".length);
    try {
      assertValidBeadID(runId);
    } catch {
      continue;
    }
    let events = [];
    try {
      events = await readRunEvents(repoRoot, runId);
    } catch (e) {
      safeWarn(opts.log, `scanRunsForProblems read failed for ${runId}`, { error: String(e) });
      continue;
    }
    if (events.length === 0)
      continue;
    const issueId = events[0]?.issueId ?? runId;
    try {
      assertValidBeadID(issueId);
    } catch {
      continue;
    }
    const hasTerminalStatus = events.some(isTerminalStatus);
    const hasAborted = events.some((e) => e.type === "status" && (e.note ?? "").trim().toLowerCase() === "aborted");
    const heartbeats = events.filter((e) => e.type === "heartbeat");
    const lastHeartbeat = heartbeats.length > 0 ? heartbeats[heartbeats.length - 1].ts : undefined;
    const lastEventTs = events.length > 0 ? events[events.length - 1].ts : undefined;
    const heartbeatRef = lastHeartbeat ?? lastEventTs;
    let hasAwait = false;
    try {
      hasAwait = await hasAwaitJson(repoRoot, issueId);
    } catch {}
    if (hasAwait) {
      out.push({ runId, issueId, reason: "suspended", lastHeartbeat: heartbeatRef, hasAwaitJson: true, hasTerminalStatus });
      continue;
    }
    if (hasAborted) {
      out.push({ runId, issueId, reason: "aborted", lastHeartbeat: heartbeatRef, hasAwaitJson: false, hasTerminalStatus });
      continue;
    }
    if (!hasTerminalStatus && heartbeatRef !== undefined && now - heartbeatRef > threshold) {
      out.push({ runId, issueId, reason: "dead-heartbeat", lastHeartbeat: heartbeatRef, hasAwaitJson: false, hasTerminalStatus });
    }
  }
  return out;
}
async function pruneRuns(repoRoot, opts = {}) {
  const key = path10.resolve(repoRoot);
  if (pruneInFlight.has(key))
    return pruneInFlight.get(key);
  const p = (async () => {
    const now = opts.now ?? Date.now();
    const maxAgeMs = opts.maxAgeMs ?? DEFAULT_PRUNE_MAX_AGE_MS;
    const maxBytes = opts.maxBytes ?? DEFAULT_PRUNE_MAX_BYTES;
    const maxFiles = opts.maxFiles ?? DEFAULT_PRUNE_MAX_FILES;
    const dir = runsDir(repoRoot);
    let files = [];
    try {
      files = await fs10.readdir(dir);
    } catch {
      return [];
    }
    const jsonlFiles = files.filter((f) => f.endsWith(".jsonl"));
    const infos = [];
    let totalBytes = 0;
    for (const file2 of jsonlFiles) {
      const runId = file2.slice(0, -".jsonl".length);
      try {
        assertValidBeadID(runId);
      } catch {
        continue;
      }
      const full = path10.join(dir, file2);
      let stat4;
      try {
        const s = await fs10.stat(full);
        stat4 = { mtimeMs: s.mtimeMs, size: s.size };
      } catch {
        continue;
      }
      totalBytes += stat4.size;
      let events = [];
      let hasTerminal = false;
      let lastTs;
      let issueId = runId;
      try {
        events = await readRunEvents(repoRoot, runId);
        hasTerminal = events.some(isTerminalStatus);
        if (events.length > 0) {
          lastTs = events[events.length - 1].ts;
          issueId = events[0]?.issueId ?? runId;
        }
      } catch {}
      try {
        assertValidBeadID(issueId);
      } catch {
        issueId = runId;
      }
      infos.push({ file: file2, runId, issueId, mtimeMs: stat4.mtimeMs, size: stat4.size, events, hasTerminal, lastTs });
    }
    infos.sort((a, b) => a.mtimeMs - b.mtimeMs);
    const toDelete = new Set;
    const heartbeatThreshold = opts.heartbeatThresholdMs ?? DEFAULT_HEARTBEAT_THRESHOLD_MS;
    for (const info of infos) {
      const age = now - info.mtimeMs;
      if (age <= maxAgeMs)
        continue;
      const isActive = !info.hasTerminal && info.lastTs !== undefined && now - info.lastTs <= heartbeatThreshold;
      if (isActive) {
        safeWarn(opts.log, `pruneRuns skipping active run ${info.runId}`, { age, hasTerminal: info.hasTerminal });
        continue;
      }
      let hasAwait = false;
      try {
        hasAwait = await hasAwaitJson(repoRoot, info.issueId);
      } catch {}
      if (hasAwait)
        continue;
      toDelete.add(info.file);
    }
    let remaining = infos.filter((i) => !toDelete.has(i.file));
    let remainingBytes = remaining.reduce((acc, i) => acc + i.size, 0);
    for (const info of [...remaining].sort((a, b) => a.mtimeMs - b.mtimeMs)) {
      if (remaining.length <= maxFiles && remainingBytes <= maxBytes)
        break;
      const isActive = !info.hasTerminal && info.lastTs !== undefined && now - info.lastTs <= heartbeatThreshold;
      if (isActive)
        continue;
      let hasAwait = false;
      try {
        hasAwait = await hasAwaitJson(repoRoot, info.issueId);
      } catch {}
      if (hasAwait)
        continue;
      toDelete.add(info.file);
      remaining = remaining.filter((r) => r.file !== info.file);
      remainingBytes -= info.size;
    }
    const deleted = [];
    for (const file2 of toDelete) {
      const full = path10.join(dir, file2);
      try {
        await fs10.unlink(full);
        deleted.push(file2);
      } catch (e) {
        safeWarn(opts.log, `pruneRuns unlink failed for ${file2}`, { error: String(e) });
      }
    }
    return deleted;
  })();
  pruneInFlight.set(key, p);
  try {
    return await p;
  } finally {
    if (pruneInFlight.get(key) === p)
      pruneInFlight.delete(key);
  }
}
var TERMINAL_NOTES, DEFAULT_HEARTBEAT_THRESHOLD_MS, DEFAULT_PRUNE_MAX_AGE_MS, DEFAULT_PRUNE_MAX_BYTES, DEFAULT_PRUNE_MAX_FILES = 200, pruneInFlight;
var init_runs = __esm(() => {
  init_def_snapshot();
  init_config();
  TERMINAL_NOTES = new Set(["complete", "failed", "aborted"]);
  DEFAULT_HEARTBEAT_THRESHOLD_MS = 5 * 60 * 1000;
  DEFAULT_PRUNE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
  DEFAULT_PRUNE_MAX_BYTES = 50 * 1024 * 1024;
  pruneInFlight = new Map;
});

// src/plugin.ts
init_config();
import { tool } from "@opencode-ai/plugin";

// src/board.ts
init_config();
init_progress();
init_session_reuse();
init_def_snapshot();
import * as crypto from "node:crypto";
import * as fs11 from "node:fs/promises";
import * as path11 from "node:path";

// src/suspend.ts
init_def_snapshot();
init_progress();
import * as fs5 from "node:fs/promises";
import * as path5 from "node:path";
var STYLE_VALUES = ["default", "prose", "conversational"];
var styleQuestionSuspendSchema = {
  type: "object",
  properties: {
    style: { type: "string", enum: [...STYLE_VALUES] },
    reason: { type: "string" }
  },
  required: ["style", "reason"]
};
var styleQuestionResumeSchema = {
  type: "object",
  properties: {
    style: { type: "string", enum: [...STYLE_VALUES] }
  },
  required: ["style"]
};
function awaitJsonPath(repoRoot, issueId) {
  assertValidBeadID(issueId);
  return path5.join(repoRoot, ".tgo", issueId, "await.json");
}
var __suspendFaultDelayMs = 0;
var __suspendFaultFired = false;
var _suspendSeq = 0;
function nextCreatedAt() {
  return `${new Date().toISOString()}#${process.pid}-${_suspendSeq++}-${Math.random().toString(36).slice(2, 5)}`;
}
var awaitLockChains = new Map;
async function withAwaitLock(repoRoot, issueId, fn) {
  assertValidBeadID(issueId);
  const key = `${path5.resolve(repoRoot)}:${issueId}`;
  const prev = awaitLockChains.get(key) ?? Promise.resolve();
  let release;
  const next = new Promise((resolve2) => {
    release = resolve2;
  });
  awaitLockChains.set(key, next);
  await prev;
  try {
    return await fn();
  } finally {
    release();
  }
}
function validateAgainstSchema(data, schema, pathPrefix = "") {
  const errors3 = [];
  const loc = pathPrefix || "value";
  if (schema.enum !== undefined) {
    const found = schema.enum.some((v) => {
      try {
        return JSON.stringify(v) === JSON.stringify(data);
      } catch {
        return v === data;
      }
    });
    if (!found) {
      errors3.push(`${loc}: must be one of ${JSON.stringify(schema.enum)}`);
    }
  }
  if (schema.type !== undefined) {
    const t = schema.type;
    let typeOk = true;
    if (t === "string")
      typeOk = typeof data === "string";
    else if (t === "number")
      typeOk = typeof data === "number" && !Number.isNaN(data);
    else if (t === "integer")
      typeOk = typeof data === "number" && Number.isInteger(data);
    else if (t === "boolean")
      typeOk = typeof data === "boolean";
    else if (t === "null")
      typeOk = data === null;
    else if (t === "array")
      typeOk = Array.isArray(data);
    else if (t === "object")
      typeOk = typeof data === "object" && data !== null && !Array.isArray(data);
    if (!typeOk) {
      errors3.push(`${loc}: expected ${t}, got ${Array.isArray(data) ? "array" : data === null ? "null" : typeof data}`);
      return { valid: false, errors: errors3 };
    }
    if (t === "string" && schema.pattern !== undefined && typeof data === "string") {
      try {
        const re = new RegExp(schema.pattern);
        if (!re.test(data)) {
          errors3.push(`${loc}: does not match pattern ${schema.pattern}`);
        }
      } catch {
        errors3.push(`${loc}: invalid pattern ${schema.pattern}`);
      }
    }
    if (t === "object" && typeof data === "object" && data !== null && !Array.isArray(data)) {
      const obj = data;
      if (Array.isArray(schema.required)) {
        for (const key of schema.required) {
          if (!(key in obj) || obj[key] === undefined) {
            errors3.push(`${loc}.${key}: required`);
          }
        }
      }
      if (schema.properties) {
        for (const [key, sub] of Object.entries(schema.properties)) {
          if (key in obj) {
            const subResult = validateAgainstSchema(obj[key], sub, `${loc}.${key}`);
            errors3.push(...subResult.errors);
          }
        }
      }
    }
    if (t === "array" && Array.isArray(data) && schema.items) {
      for (let i = 0;i < data.length; i++) {
        const subResult = validateAgainstSchema(data[i], schema.items, `${loc}[${i}]`);
        errors3.push(...subResult.errors);
      }
    }
  } else {
    if (schema.required || schema.properties) {
      if (typeof data !== "object" || data === null || Array.isArray(data)) {
        errors3.push(`${loc}: expected object`);
        return { valid: false, errors: errors3 };
      }
      const obj = data;
      if (Array.isArray(schema.required)) {
        for (const key of schema.required) {
          if (!(key in obj) || obj[key] === undefined) {
            errors3.push(`${loc}.${key}: required`);
          }
        }
      }
      if (schema.properties) {
        for (const [key, sub] of Object.entries(schema.properties)) {
          if (key in obj) {
            const subResult = validateAgainstSchema(obj[key], sub, `${loc}.${key}`);
            errors3.push(...subResult.errors);
          }
        }
      }
    }
  }
  return { valid: errors3.length === 0, errors: errors3 };
}
function getRequiredFields(schema) {
  if (Array.isArray(schema.required) && schema.required.length > 0) {
    return [...schema.required];
  }
  if (schema.properties) {
    return Object.keys(schema.properties);
  }
  if (schema.type === "string" || schema.type === "number" || schema.type === "boolean" || schema.type === "integer") {
    return [schema.type];
  }
  return [];
}
function formatSuspendBadge(record2) {
  const fields = getRequiredFields(record2.resumeSchema);
  const fieldsStr = fields.length > 0 ? fields.join(", ") : "response";
  return `⏸ awaiting human: ${record2.reason} — reply with: ${fieldsStr}`;
}
function formatSuspendBlocker(record2) {
  return formatSuspendBadge(record2);
}
async function writeAwaitJson(repoRoot, issueId, record2) {
  assertValidBeadID(issueId);
  if (record2.issueId !== issueId) {
    throw new Error(`writeAwaitJson: record issueId "${record2.issueId}" mismatches path issueId "${issueId}"`);
  }
  return withAwaitLock(repoRoot, issueId, async () => {
    const existing = await readAwaitJson(repoRoot, issueId);
    if (existing)
      return false;
    const target = awaitJsonPath(repoRoot, issueId);
    const dir = path5.dirname(target);
    await fs5.mkdir(dir, { recursive: true });
    const content = JSON.stringify(record2, null, 2);
    const tmp = path5.join(dir, `.await-${hashString(content)}-${process.pid}-${Math.random().toString(36).slice(2)}.tmp`);
    let renamed = false;
    try {
      await fs5.writeFile(tmp, content, "utf-8");
      if (__suspendFaultDelayMs > 0 && !__suspendFaultFired) {
        __suspendFaultFired = true;
        await new Promise((r) => setTimeout(r, __suspendFaultDelayMs));
      }
      await fs5.rename(tmp, target);
      renamed = true;
      return true;
    } finally {
      if (!renamed) {
        try {
          await fs5.unlink(tmp);
        } catch {}
      }
    }
  });
}
async function readAwaitJson(repoRoot, issueId) {
  assertValidBeadID(issueId);
  const target = awaitJsonPath(repoRoot, issueId);
  try {
    const raw = await fs5.readFile(target, "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object")
      return;
    if (typeof parsed.issueId !== "string" || parsed.issueId !== issueId)
      return;
    if (typeof parsed.reason !== "string")
      return;
    if (typeof parsed.createdAt !== "string")
      return;
    if (parsed.suspendSchema === undefined || typeof parsed.suspendSchema !== "object")
      return;
    if (parsed.resumeSchema === undefined || typeof parsed.resumeSchema !== "object")
      return;
    if (parsed.until !== undefined && typeof parsed.until !== "string")
      return;
    if (parsed.sessionId !== undefined && typeof parsed.sessionId !== "string")
      return;
    if (parsed.expired !== undefined && typeof parsed.expired !== "boolean")
      return;
    return parsed;
  } catch {
    return;
  }
}
async function mutateAwaitJson(repoRoot, issueId, expectedCreatedAt, mutate) {
  assertValidBeadID(issueId);
  return withAwaitLock(repoRoot, issueId, async () => {
    const rec = await readAwaitJson(repoRoot, issueId);
    if (!rec)
      return "absent";
    if (rec.createdAt !== expectedCreatedAt)
      return "superseded";
    let mutated;
    try {
      mutated = mutate(rec);
    } catch (e) {
      throw e;
    }
    if (mutated === null) {
      const target2 = awaitJsonPath(repoRoot, issueId);
      try {
        await fs5.unlink(target2);
      } catch (e) {
        const code = e?.code;
        if (code === "ENOENT")
          return "absent";
        throw e;
      }
      return "applied";
    }
    if (mutated.issueId !== issueId) {
      throw new Error(`mutateAwaitJson: mutated issueId "${mutated.issueId}" mismatches "${issueId}"`);
    }
    const target = awaitJsonPath(repoRoot, issueId);
    const dir = path5.dirname(target);
    await fs5.mkdir(dir, { recursive: true });
    const content = JSON.stringify(mutated, null, 2);
    const tmp = path5.join(dir, `.await-mutate-${hashString(content)}-${process.pid}-${Math.random().toString(36).slice(2)}.tmp`);
    let renamed = false;
    try {
      await fs5.writeFile(tmp, content, "utf-8");
      await fs5.rename(tmp, target);
      renamed = true;
      return "applied";
    } finally {
      if (!renamed) {
        try {
          await fs5.unlink(tmp);
        } catch {}
      }
    }
  });
}
async function clearAwaitJson(repoRoot, issueId, expectedCreatedAt) {
  assertValidBeadID(issueId);
  if (expectedCreatedAt === undefined) {
    return withAwaitLock(repoRoot, issueId, async () => {
      const target = awaitJsonPath(repoRoot, issueId);
      try {
        await fs5.unlink(target);
        return true;
      } catch (e) {
        const code = e?.code;
        if (code === "ENOENT")
          return false;
        throw e;
      }
    });
  }
  const result = await mutateAwaitJson(repoRoot, issueId, expectedCreatedAt, () => null);
  return result === "applied";
}
async function suspend(opts) {
  assertValidBeadID(opts.issueId);
  if (!opts.resumeSchema || typeof opts.resumeSchema !== "object" || Array.isArray(opts.resumeSchema)) {
    throw new Error("suspend: resumeSchema is required and must be a non-null object");
  }
  if (!opts.suspendSchema || typeof opts.suspendSchema !== "object" || Array.isArray(opts.suspendSchema)) {
    throw new Error("suspend: suspendSchema is required and must be a non-null object");
  }
  const payloadValidation = validateAgainstSchema(opts.suspendPayload, opts.suspendSchema);
  if (!payloadValidation.valid) {
    throw new Error(`suspend: suspendPayload does not match suspendSchema: ${payloadValidation.errors.join("; ")}`);
  }
  const record2 = {
    issueId: opts.issueId,
    suspendSchema: opts.suspendSchema,
    suspendPayload: opts.suspendPayload,
    resumeSchema: opts.resumeSchema,
    reason: opts.reason,
    createdAt: opts.createdAt ?? nextCreatedAt(),
    ...opts.until ? { until: opts.until } : {},
    ...opts.sessionId ? { sessionId: opts.sessionId } : {}
  };
  const written = await writeAwaitJson(opts.repoRoot, opts.issueId, record2);
  if (written) {
    const blocker = formatSuspendBlocker(record2);
    try {
      await updateProgress(opts.repoRoot, opts.issueId, (parts) => {
        if (!parts.blockers.includes(blocker)) {
          return { ...parts, blockers: [...parts.blockers, blocker] };
        }
        return parts;
      });
    } catch {}
  }
  return { written, record: record2 };
}
function parseProseReply(text) {
  const trimmed = text.trim();
  if (trimmed.length === 0)
    return trimmed;
  try {
    return JSON.parse(trimmed);
  } catch {}
  const jsonMatch = trimmed.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch && jsonMatch[1]) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch {}
  }
  return trimmed;
}
async function listAllAwaits(repoRoot) {
  const tgoDir = path5.join(repoRoot, ".tgo");
  let entries = [];
  try {
    entries = await fs5.readdir(tgoDir);
  } catch {
    return [];
  }
  const out = [];
  for (const entry of entries) {
    try {
      assertValidBeadID(entry);
    } catch {
      continue;
    }
    const rec = await readAwaitJson(repoRoot, entry);
    if (rec)
      out.push(rec);
  }
  return out;
}
function isExpired(record2, nowMs = Date.now()) {
  if (record2.expired === true)
    return true;
  if (!record2.until)
    return false;
  const untilMs = Date.parse(record2.until);
  if (Number.isNaN(untilMs))
    return false;
  return nowMs >= untilMs;
}
async function persistExpiredFlag(repoRoot, scanned) {
  assertValidBeadID(scanned.issueId);
  return withAwaitLock(repoRoot, scanned.issueId, async () => {
    const cur = await readAwaitJson(repoRoot, scanned.issueId);
    if (!cur)
      return false;
    if (cur.createdAt !== scanned.createdAt)
      return false;
    if (cur.expired === true)
      return true;
    const next = { ...cur, expired: true };
    const target = awaitJsonPath(repoRoot, scanned.issueId);
    const dir = path5.dirname(target);
    await fs5.mkdir(dir, { recursive: true });
    const content = JSON.stringify(next, null, 2);
    const tmp = path5.join(dir, `.await-expire-${hashString(content)}-${process.pid}-${Math.random().toString(36).slice(2)}.tmp`);
    let renamed = false;
    try {
      await fs5.writeFile(tmp, content, "utf-8");
      await fs5.rename(tmp, target);
      renamed = true;
      return true;
    } finally {
      if (!renamed) {
        try {
          await fs5.unlink(tmp);
        } catch {}
      }
    }
  });
}
async function scanExpiredAwaits(repoRoot, log, nowMs = Date.now()) {
  const all = await listAllAwaits(repoRoot);
  const newlyExpired = all.filter((r) => r.expired !== true && isExpired(r, nowMs));
  const allExpired = all.filter((r) => isExpired(r, nowMs));
  for (const rec of newlyExpired) {
    let ok = false;
    try {
      ok = await persistExpiredFlag(repoRoot, rec);
    } catch {}
    if (!ok) {
      const cur = await readAwaitJson(repoRoot, rec.issueId);
      if (!cur || cur.createdAt !== rec.createdAt)
        continue;
    }
    const persisted = await readAwaitJson(repoRoot, rec.issueId) ?? { ...rec, expired: true };
    if (persisted.createdAt !== rec.createdAt)
      continue;
    const msg = `tgo: timer expired for ${persisted.issueId} (until ${persisted.until}) — awaiting human: ${persisted.reason}`;
    if (log) {
      try {
        log("warn", msg, { issueId: persisted.issueId, until: persisted.until, reason: persisted.reason });
      } catch {}
    } else {
      console.warn(msg);
    }
  }
  for (const rec of allExpired.filter((r) => r.expired === true)) {
    const msg = `tgo: timer expired (persisted) for ${rec.issueId} (until ${rec.until}) — awaiting human: ${rec.reason}`;
    if (log) {
      try {
        log("warn", msg, { issueId: rec.issueId, until: rec.until, reason: rec.reason });
      } catch {}
    }
  }
  return allExpired;
}

// src/board.ts
init_metrics();

// src/cost.ts
import * as fs7 from "node:fs/promises";
import * as path7 from "node:path";
var WINDOW_LIMITS = {
  fiveHour: 12,
  weekly: 30,
  monthly: 60
};
var MODEL_BUDGETS = {
  "opencode-go/gpt-5.6-luna": { usageMonthlyUsd: 15, listStepUsd: 0.00146 },
  "opencode-go/glm-5.3-flash": { usageMonthlyUsd: 15, listStepUsd: 0.0019 },
  "opencode-go/muse-spark-1.2-contributor": { usageMonthlyUsd: 60, listStepUsd: 0.00027 }
};
function round2(n) {
  return Math.round(n * 100) / 100;
}
function budgetsForModel(model, table = MODEL_BUDGETS) {
  const b = table[model];
  if (!b || typeof b.usageMonthlyUsd !== "number" || b.usageMonthlyUsd <= 0)
    return;
  const factor = b.usageMonthlyUsd / 60;
  return {
    usageMonthlyUsd: b.usageMonthlyUsd,
    fiveHour: round2(WINDOW_LIMITS.fiveHour * factor),
    weekly: round2(WINDOW_LIMITS.weekly * factor),
    monthly: round2(WINDOW_LIMITS.monthly * factor)
  };
}
function spendPct(spendUsd, budgetUsd) {
  if (budgetUsd === undefined || budgetUsd <= 0)
    return;
  return Math.round(spendUsd / budgetUsd * 100);
}
function estimateSpendFromSteps(model, steps, table = MODEL_BUDGETS) {
  const s = table[model]?.listStepUsd;
  if (s === undefined || !Number.isFinite(steps) || steps <= 0)
    return;
  return round2(steps * s);
}
function buildCostLines(input, table = MODEL_BUDGETS) {
  const lines = [];
  const seats = Object.keys(input.seatModels).sort();
  for (const seat of seats) {
    const model = input.seatModels[seat];
    if (!model)
      continue;
    const bw = budgetsForModel(model, table);
    const steps = input.stepsBySeat[seat] ?? 0;
    const spend = estimateSpendFromSteps(model, steps, table);
    if (!bw) {
      lines.push(`COST: ${seat} → ${model}: budget unknown`);
      continue;
    }
    const spendPart = spend !== undefined ? `est. $${spend}` : "no spend data";
    const pct = spend !== undefined ? spendPct(spend, bw.fiveHour) : undefined;
    const pctPart = pct !== undefined ? ` (${pct}% of 5h budget)` : "";
    lines.push(`COST: ${seat} → ${model}: ${spendPart} of $${bw.fiveHour} 5h${pctPart}`);
  }
  return lines;
}
var stepCache;
async function scanSeatSteps(repoRoot, ttlMs = 30000) {
  const now = Date.now();
  if (stepCache && stepCache.repoRoot === repoRoot && now - stepCache.at < ttlMs) {
    return stepCache.bySeat;
  }
  const out = {};
  const dir = path7.join(repoRoot, ".tgo", "runs");
  let files = [];
  try {
    files = await fs7.readdir(dir);
  } catch {
    stepCache = { at: now, repoRoot, bySeat: out };
    return out;
  }
  for (const f of files) {
    if (!f.endsWith(".jsonl"))
      continue;
    let raw = "";
    try {
      raw = await fs7.readFile(path7.join(dir, f), "utf-8");
    } catch {
      continue;
    }
    for (const line of raw.split(`
`)) {
      const t = line.trim();
      if (!t || !t.startsWith("{"))
        continue;
      let ev = null;
      try {
        ev = JSON.parse(t);
      } catch {
        continue;
      }
      if (ev && ev.type === "step" && typeof ev.seat === "string" && ev.seat.trim().length > 0) {
        out[ev.seat] = (out[ev.seat] ?? 0) + 1;
      }
    }
  }
  stepCache = { at: now, repoRoot, bySeat: out };
  return out;
}

// src/convoy.ts
init_def_snapshot();
import * as fs9 from "node:fs/promises";
import * as path9 from "node:path";

// src/manifest.ts
init_def_snapshot();
import * as fs8 from "node:fs/promises";
import * as path8 from "node:path";
var MANIFEST_REL_PATH = ".tgo/manifest.json";
function manifestPath(repoRoot) {
  return path8.join(repoRoot, MANIFEST_REL_PATH);
}

class ManifestScopeConflictError extends Error {
  code = "MANIFEST_SCOPE_CONFLICT";
  conflicts;
  constructor(message, conflicts) {
    super(message);
    this.name = "ManifestScopeConflictError";
    this.conflicts = conflicts;
  }
}
function normalizeScopePath(p) {
  let s = String(p ?? "").trim();
  s = s.replace(/^\.\/+/g, "");
  if (s === "." || s === "./" || s === "")
    return "";
  s = path8.posix.normalize(s);
  s = s.replace(/\/+/g, "/");
  s = s.replace(/^\.\/+/g, "");
  if (s === ".")
    return "";
  s = s.toLowerCase();
  return s;
}
function mergeWaves(waves) {
  const byWave = new Map;
  for (const w of waves) {
    const existing = byWave.get(w.wave);
    if (!existing) {
      byWave.set(w.wave, { wave: w.wave, beads: [...w.beads] });
    } else {
      existing.beads.push(...w.beads);
    }
  }
  return [...byWave.values()];
}
function validateManifest(manifest) {
  const errors3 = [];
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    errors3.push("manifest must be an object with waves[]");
    return { valid: false, errors: errors3 };
  }
  const m = manifest;
  if (!Array.isArray(m.waves)) {
    errors3.push("manifest.waves must be an array");
    return { valid: false, errors: errors3 };
  }
  const waves = [];
  const seenIssueIds = new Set;
  const seenWaveNumbers = new Map;
  for (let wi = 0;wi < m.waves.length; wi++) {
    const w = m.waves[wi];
    if (!w || typeof w !== "object" || Array.isArray(w)) {
      errors3.push(`waves[${wi}] must be an object`);
      continue;
    }
    const waveRec = w;
    const waveNum = waveRec.wave;
    if (typeof waveNum !== "number" || !Number.isInteger(waveNum) || waveNum < 0) {
      errors3.push(`waves[${wi}].wave must be a non-negative integer`);
    }
    if (!Array.isArray(waveRec.beads)) {
      errors3.push(`waves[${wi}].beads must be an array`);
      continue;
    }
    const beads = [];
    for (let bi = 0;bi < waveRec.beads.length; bi++) {
      const b = waveRec.beads[bi];
      if (!b || typeof b !== "object" || Array.isArray(b)) {
        errors3.push(`waves[${wi}].beads[${bi}] must be an object`);
        continue;
      }
      const rec = b;
      const issueId = rec.issueId;
      if (typeof issueId !== "string" || issueId.trim().length === 0) {
        errors3.push(`waves[${wi}].beads[${bi}].issueId must be non-empty string`);
      } else if (!isValidBeadID(issueId.trim())) {
        errors3.push(`waves[${wi}].beads[${bi}].issueId must match VALID_BEAD_ID ${VALID_BEAD_ID.source} — got ${JSON.stringify(issueId)}`);
      } else if (seenIssueIds.has(issueId.trim())) {
        errors3.push(`duplicate issueId ${issueId} across waves`);
      } else {
        seenIssueIds.add(issueId.trim());
      }
      const story = rec.story;
      if (typeof story !== "string" || story.trim().length === 0) {
        errors3.push(`waves[${wi}].beads[${bi}].story must be non-empty string`);
      }
      const scope = rec.scope;
      if (!Array.isArray(scope) || scope.length === 0) {
        errors3.push(`waves[${wi}].beads[${bi}].scope must be non-empty string array`);
      } else {
        for (let si = 0;si < scope.length; si++) {
          const s = scope[si];
          if (typeof s !== "string" || s.trim().length === 0) {
            errors3.push(`waves[${wi}].beads[${bi}].scope[${si}] must be non-empty string`);
          }
        }
        const scopeSet = new Set;
        for (const s of scope) {
          if (typeof s !== "string")
            continue;
          const normalized = normalizeScopePath(s);
          if (scopeSet.has(normalized)) {
            errors3.push(`waves[${wi}].beads[${bi}].scope duplicate ${JSON.stringify(s)} (normalized to ${JSON.stringify(normalized)})`);
          } else
            scopeSet.add(normalized);
        }
      }
      const parallelSet = rec.parallelSet;
      if (typeof parallelSet !== "string" || parallelSet.trim().length === 0) {
        errors3.push(`waves[${wi}].beads[${bi}].parallelSet must be non-empty string`);
      }
      const deps = rec.deps;
      if (!Array.isArray(deps)) {
        errors3.push(`waves[${wi}].beads[${bi}].deps must be an array`);
      } else {
        for (let di = 0;di < deps.length; di++) {
          const d = deps[di];
          if (typeof d !== "string" || d.trim().length === 0) {
            errors3.push(`waves[${wi}].beads[${bi}].deps[${di}] must be non-empty string`);
          } else if (!isValidBeadID(d.trim())) {
            errors3.push(`waves[${wi}].beads[${bi}].deps[${di}] must match VALID_BEAD_ID`);
          }
        }
      }
      if (typeof issueId === "string" && isValidBeadID(issueId.trim()) && typeof story === "string" && story.trim().length > 0 && Array.isArray(scope) && typeof parallelSet === "string" && parallelSet.trim().length > 0 && Array.isArray(deps)) {
        const normalizedScope = scope.map((s) => normalizeScopePath(typeof s === "string" ? s.trim() : String(s))).filter((s) => s.length > 0);
        const bead = {
          issueId: issueId.trim(),
          story: story.trim(),
          scope: normalizedScope,
          parallelSet: parallelSet.trim(),
          deps: deps.map((d) => typeof d === "string" ? d.trim() : String(d))
        };
        if (typeof waveNum === "number" && Number.isInteger(waveNum) && waveNum >= 0) {
          let waveInfo = seenWaveNumbers.get(waveNum);
          if (!waveInfo) {
            waveInfo = { firstIdx: wi, beadsById: new Map };
            seenWaveNumbers.set(waveNum, waveInfo);
          } else {
            const existing = waveInfo.beadsById.get(bead.issueId);
            if (existing) {
              const existingNormalizedScope = [...existing.scope].sort().join(",");
              const newNormalizedScope = [...bead.scope].sort().join(",");
              if (existing.story !== bead.story || existingNormalizedScope !== newNormalizedScope || existing.parallelSet !== bead.parallelSet || existing.deps.join(",") !== bead.deps.join(",")) {
                errors3.push(`duplicate wave ${waveNum} has conflicting bead ${bead.issueId} (waves[${waveInfo.firstIdx}] vs waves[${wi}])`);
              }
            }
          }
          if (!waveInfo.beadsById.has(bead.issueId)) {
            waveInfo.beadsById.set(bead.issueId, bead);
          }
        }
        beads.push(bead);
      }
    }
    if (typeof waveNum === "number" && Number.isInteger(waveNum) && waveNum >= 0) {
      waves.push({ wave: waveNum, beads });
    }
  }
  if (errors3.length > 0)
    return { valid: false, errors: errors3 };
  const mergedWaves = mergeWaves(waves);
  mergedWaves.sort((a, b) => a.wave - b.wave);
  return { valid: true, errors: [], manifest: { waves: mergedWaves } };
}
function checkScopeConflicts(manifest) {
  const conflicts = [];
  const waves = mergeWaves(manifest.waves);
  for (const wave of waves) {
    const bySet = new Map;
    for (const bead of wave.beads) {
      const key = bead.parallelSet;
      const list = bySet.get(key) ?? [];
      list.push(bead);
      bySet.set(key, list);
    }
    for (const [parallelSet, beads] of bySet) {
      for (let i = 0;i < beads.length; i++) {
        for (let j = i + 1;j < beads.length; j++) {
          const a = beads[i];
          const b = beads[j];
          const setA = new Set(a.scope.map(normalizeScopePath));
          const normalizedB = b.scope.map(normalizeScopePath);
          const overlapping = normalizedB.filter((f) => setA.has(f));
          if (overlapping.length > 0) {
            conflicts.push({
              wave: wave.wave,
              parallelSet,
              beads: [a.issueId, b.issueId],
              overlappingFiles: [...new Set(overlapping)]
            });
          }
        }
      }
    }
  }
  return { hasConflict: conflicts.length > 0, conflicts };
}
var manifestCache = new Map;
function invalidateManifestCache(repoRoot) {
  manifestCache.delete(path8.resolve(manifestPath(repoRoot)));
}
async function readManifest(repoRoot) {
  const target = manifestPath(repoRoot);
  const key = path8.resolve(target);
  try {
    const st = await fs8.stat(target);
    const hit = manifestCache.get(key);
    if (hit && hit[0] === st.mtimeMs && hit[1] === st.size)
      return hit[2];
    const raw = await fs8.readFile(target, "utf-8");
    const parsed = JSON.parse(raw);
    const v = validateManifest(parsed);
    const result = v.valid && v.manifest ? v.manifest : undefined;
    manifestCache.set(key, [st.mtimeMs, st.size, result]);
    return result;
  } catch {
    return;
  }
}
async function writeManifestAtomic(repoRoot, manifest) {
  const target = manifestPath(repoRoot);
  const dir = path8.dirname(target);
  await fs8.mkdir(dir, { recursive: true });
  const content = JSON.stringify(manifest, null, 2);
  const tmp = path8.join(dir, `.manifest-${Date.now()}-${process.pid}-${Math.random().toString(36).slice(2)}.tmp`);
  let renamed = false;
  try {
    await fs8.writeFile(tmp, content, "utf-8");
    await fs8.rename(tmp, target);
    renamed = true;
  } finally {
    if (!renamed) {
      try {
        await fs8.unlink(tmp);
      } catch {}
    }
  }
}
async function planManifest(repoRoot, manifest) {
  const v = validateManifest(manifest);
  if (!v.valid || !v.manifest) {
    throw new Error(`manifest validation failed: ${v.errors.join("; ")}`);
  }
  const normalized = v.manifest;
  const conflict = checkScopeConflicts(normalized);
  if (conflict.hasConflict) {
    const details = conflict.conflicts.map((c) => `wave ${c.wave} parallelSet ${JSON.stringify(c.parallelSet)} beads ${c.beads.join(" vs ")} overlap ${c.overlappingFiles.join(", ")}`).join("; ");
    throw new ManifestScopeConflictError(`MANIFEST_SCOPE_CONFLICT: manifest scope conflict: ${details}`, conflict.conflicts);
  }
  await writeManifestAtomic(repoRoot, normalized);
  invalidateManifestCache(repoRoot);
  return normalized;
}
function getManifestRowSyncFromManifest(manifest, issueId) {
  if (!manifest)
    return;
  for (const wave of manifest.waves) {
    for (const bead of wave.beads) {
      if (bead.issueId === issueId)
        return { bead, wave: wave.wave };
    }
  }
  return;
}

// src/convoy.ts
var CONVOY_REL_DIR = ".tgo/convoy";
var CONVOY_STATE_REL = ".tgo/convoy/.state.json";
var MAX_PARALLEL_WAVES = 3;
function convoyStatePath(repoRoot) {
  return path9.join(repoRoot, CONVOY_STATE_REL);
}
function computeScopeHash(waves) {
  const all = new Set;
  for (const w of waves) {
    for (const b of w.beads) {
      for (const s of b.scope) {
        const n = normalizeScopePath(s);
        if (n)
          all.add(n);
      }
    }
  }
  const canonical = [...all].sort().map((s) => `${s.length}:${s}`).join("|");
  return hashString(canonical);
}
function validateConvoyState(state) {
  const errors3 = [];
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    return { valid: false, errors: ["convoy state must be an object"] };
  }
  const s = state;
  if (typeof s.goal !== "string" || s.goal.trim().length === 0) {
    errors3.push("goal must be a non-empty string");
  }
  if (typeof s.remainingBudget !== "number" || !Number.isFinite(s.remainingBudget) || s.remainingBudget < 0) {
    errors3.push("remainingBudget must be a non-negative number");
  }
  if (!Array.isArray(s.completedDeps)) {
    errors3.push("completedDeps must be an array");
  } else {
    for (const d of s.completedDeps) {
      if (typeof d !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(d)) {
        errors3.push(`completedDeps entry ${JSON.stringify(d)} is not a valid bead id`);
      }
    }
  }
  if (!Array.isArray(s.waves) || s.waves.length === 0) {
    errors3.push("waves must be a non-empty array");
  } else {
    if (s.waves.length > MAX_PARALLEL_WAVES) {
      errors3.push(`waves must not exceed ${MAX_PARALLEL_WAVES} (got ${s.waves.length})`);
    }
    const seenWaves = new Set;
    for (const w of s.waves) {
      if (!w || typeof w.wave !== "number") {
        errors3.push("each wave must have a numeric wave number");
        continue;
      }
      if (seenWaves.has(w.wave))
        errors3.push(`duplicate wave number ${w.wave}`);
      seenWaves.add(w.wave);
      if (!Array.isArray(w.beads) || w.beads.length === 0) {
        errors3.push(`wave ${w.wave} must have a non-empty beads array`);
        continue;
      }
      for (const b of w.beads) {
        if (!b || typeof b.issueId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(b.issueId)) {
          errors3.push(`wave ${w.wave} bead issueId ${JSON.stringify(b?.issueId)} is invalid`);
        }
        if (!Array.isArray(b.scope) || b.scope.length === 0) {
          errors3.push(`wave ${w.wave} bead ${b?.issueId} must have a non-empty scope`);
        }
      }
    }
  }
  if (typeof s.scopeHash !== "string" || !/^[0-9a-f]{8}$/.test(s.scopeHash)) {
    errors3.push("scopeHash must be an 8-hex hash string");
  } else if (Array.isArray(s.waves) && errors3.length === 0) {
    const expected = computeScopeHash(s.waves);
    if (s.scopeHash !== expected) {
      errors3.push(`scopeHash mismatch (expected ${expected}, got ${s.scopeHash})`);
    }
  }
  return { valid: errors3.length === 0, errors: errors3 };
}
async function writeConvoyStateAtomic(repoRoot, state) {
  const dir = path9.join(repoRoot, CONVOY_REL_DIR);
  await fs9.mkdir(dir, { recursive: true });
  const target = convoyStatePath(repoRoot);
  const tmp = path9.join(dir, `.state.json.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`);
  await fs9.writeFile(tmp, JSON.stringify(state, null, 2), "utf-8");
  await fs9.rename(tmp, target);
}
async function initConvoy(repoRoot, input) {
  const state = {
    goal: input.goal,
    scopeHash: computeScopeHash(input.waves),
    remainingBudget: input.remainingBudget,
    completedDeps: [],
    waves: input.waves
  };
  const v = validateConvoyState(state);
  if (!v.valid) {
    throw new Error(`CONVOY_INVALID: ${v.errors.join("; ")}`);
  }
  await writeConvoyStateAtomic(repoRoot, state);
  return state;
}
async function readConvoyState(repoRoot) {
  const target = convoyStatePath(repoRoot);
  let raw;
  try {
    raw = await fs9.readFile(target, "utf-8");
  } catch {
    return;
  }
  try {
    const parsed = JSON.parse(raw);
    const v = validateConvoyState(parsed);
    return v.valid ? parsed : undefined;
  } catch {
    return;
  }
}
async function markWaveComplete(repoRoot, completedIssueIds) {
  const state = await readConvoyState(repoRoot);
  if (!state)
    throw new Error("CONVOY_MISSING: no convoy state to update");
  const existing = new Set(state.completedDeps);
  for (const id of completedIssueIds) {
    assertValidBeadID(id);
    existing.add(id);
  }
  const next = { ...state, completedDeps: [...existing] };
  const v = validateConvoyState(next);
  if (!v.valid)
    throw new Error(`CONVOY_INVALID: ${v.errors.join("; ")}`);
  await writeConvoyStateAtomic(repoRoot, next);
  return next;
}
function allWavesComplete(state) {
  const done = new Set(state.completedDeps);
  for (const w of state.waves) {
    for (const b of w.beads) {
      if (!done.has(b.issueId))
        return false;
    }
  }
  return true;
}
function convoyLandingOrder(state) {
  return state.waves.map((w) => w.wave).sort((a, b) => a - b);
}
async function landConvoy(repoRoot, deps) {
  const state = await readConvoyState(repoRoot);
  if (!state)
    return { landed: false, reason: "no convoy state", mergedWaves: [] };
  const v = validateConvoyState(state);
  if (!v.valid)
    return { landed: false, reason: `state invalid: ${v.errors.join("; ")}`, mergedWaves: [] };
  if (state.scopeHash !== computeScopeHash(state.waves)) {
    return { landed: false, reason: "scopeHash mismatch — abort landing", mergedWaves: [] };
  }
  if (!allWavesComplete(state)) {
    return { landed: false, reason: "not all waves complete", mergedWaves: [] };
  }
  const merged = [];
  for (const wave of convoyLandingOrder(state)) {
    const w = state.waves.find((x) => x.wave === wave);
    if (!w)
      continue;
    for (const b of w.beads) {
      const g = await deps.gateCheck(b.issueId);
      if (!g.ok) {
        return { landed: false, reason: `gate blocked ${b.issueId}: ${g.reason ?? "unknown"}`, mergedWaves: merged };
      }
    }
    await deps.mergeWorktree(wave, w.beads.map((b) => b.issueId));
    merged.push(wave);
  }
  return { landed: true, mergedWaves: merged };
}
async function buildConvoySection(repoRoot) {
  const state = await readConvoyState(repoRoot);
  if (!state)
    return;
  const done = new Set(state.completedDeps);
  const lines = [
    `CONVOY: ${state.goal.slice(0, 80)} | budget $${state.remainingBudget} | scope ${state.scopeHash.slice(0, 8)}`
  ];
  for (const w of state.waves) {
    const landed = w.beads.filter((b) => done.has(b.issueId)).length;
    lines.push(`  wave ${w.wave}: ${landed}/${w.beads.length} landed`);
  }
  if (allWavesComplete(state))
    lines.push("  → all waves complete — run tgo_land_convoy to land");
  return lines;
}

// src/board.ts
init_runs();
var BOARD_SENTINEL_START = "<!-- tgo:board -->";
var BOARD_SENTINEL_END = "<!-- /tgo:board -->";
function createShim() {
  return { streaming: new Map, agents: new Map };
}
function parseIssues(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed))
      return [];
    return parsed.map((i) => ({
      id: String(i.id ?? ""),
      title: String(i.title ?? ""),
      priority: typeof i.priority === "number" ? i.priority : 0,
      issueType: i.issue_type,
      parent: i.parent,
      blockedBy: Array.isArray(i.blocked_by) ? i.blocked_by.map(String) : undefined
    })).filter((i) => i.id && i.title);
  } catch {
    return [];
  }
}
function clipTitle(title, max = 70) {
  return title.length > max ? `${title.slice(0, max - 1)}…` : title;
}
function parseMemories(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object")
      return [];
    return Object.entries(parsed).filter(([key]) => key !== "schema_version").map(([key, value]) => ({ key, value: String(value) })).filter((m) => m.value);
  } catch {
    return [];
  }
}
function line(issue2) {
  const prio = `P${issue2.priority}`;
  const epic = issue2.issueType === "epic" ? " · epic" : "";
  return `- ${issue2.id} · ${prio}${epic} · ${clipTitle(issue2.title)}`;
}
function buildBoardText(data, maxListed = 6) {
  const sections = ["## TGO JOB BOARD"];
  if (data.memories.length > 0) {
    sections.push("MEMORIES:", ...data.memories.map((m) => `- ${clipTitle(m.value, 120)}`));
  }
  if (data.inProgress.length > 0) {
    sections.push("IN PROGRESS:", ...data.inProgress.map(line));
  }
  if (data.ready.length > 0) {
    const shown = data.ready.slice(0, maxListed);
    sections.push("READY:", ...shown.map(line));
    if (data.ready.length > shown.length) {
      sections.push(`- … and ${data.ready.length - shown.length} more ready`);
    }
  }
  if (data.blocked.length > 0) {
    const shown = data.blocked.slice(0, maxListed);
    const blocked = shown.map((issue2) => {
      const deps = issue2.blockedBy?.length ? ` ← ${issue2.blockedBy.join(",")}` : "";
      return `${line(issue2)}${deps}`;
    });
    sections.push("BLOCKED:", ...blocked);
    if (data.blocked.length > shown.length) {
      sections.push(`- … and ${data.blocked.length - shown.length} more blocked`);
    }
  }
  if (data.streaming.length > 0) {
    sections.push("STREAMING:", ...data.streaming.map((s) => `- ${s.id} → ${s.target}`));
  }
  if (data.queueLines && data.queueLines.length > 0) {
    sections.push(...data.queueLines);
  }
  if (data.costLines && data.costLines.length > 0) {
    sections.push(...data.costLines);
  }
  if (data.problems && data.problems.length > 0) {
    const probText = buildProblemsSection(data.problems);
    if (probText)
      sections.push(probText);
  }
  return sections.join(`
`);
}
async function getSuspendBadge(issueId, repoRoot) {
  try {
    const rec = await readAwaitJson(repoRoot, issueId);
    if (!rec)
      return;
    const fields = getRequiredFields(rec.resumeSchema);
    const fieldsStr = fields.length > 0 ? fields.join(", ") : "response";
    let badge = `⏸ awaiting human: ${rec.reason} — reply with: ${fieldsStr}`;
    if (rec.expired === true || rec.until && isExpired(rec)) {
      const untilStr = rec.until ?? "unknown";
      badge += ` (timer expired ${untilStr})`;
    }
    return badge;
  } catch {
    return;
  }
}
async function getManifestBoardLine(repoRoot) {
  try {
    const target = path11.join(repoRoot, MANIFEST_REL_PATH);
    const raw = await fs11.readFile(target, "utf-8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.waves))
      return;
    return `manifest: ${MANIFEST_REL_PATH} (${parsed.waves.length} waves)`;
  } catch {
    return;
  }
}
async function buildBoardTextWithHints(data, reusableSet, sessionIdsByIssue, maxListed = 6, repoRoot) {
  const sections = ["## TGO JOB BOARD"];
  if (repoRoot) {
    try {
      const manifestLine = await getManifestBoardLine(repoRoot);
      if (manifestLine)
        sections.push(manifestLine);
    } catch {}
    try {
      const convoyLines = await buildConvoySection(repoRoot);
      if (convoyLines && convoyLines.length > 0)
        sections.push(...convoyLines);
    } catch {}
  }
  if (data.memories.length > 0) {
    sections.push("MEMORIES:", ...data.memories.map((m) => `- ${clipTitle(m.value, 120)}`));
  }
  if (data.inProgress.length > 0) {
    const inProgressLines = [];
    for (const issue2 of data.inProgress) {
      let rendered = line(issue2);
      if (repoRoot) {
        try {
          const snap = await readDefSnapshot(repoRoot, issue2.id);
          if (snap)
            rendered += ` [pinned v${snap.promptHash.slice(0, 8)}]`;
        } catch {}
      }
      inProgressLines.push(rendered);
      if (reusableSet?.has(issue2.id) && sessionIdsByIssue?.has(issue2.id)) {
        const sid = sessionIdsByIssue.get(issue2.id);
        inProgressLines.push(`reusable session ${sid} — pass task_id: "${sid}" on the next task call to continue it.`);
      }
      if (repoRoot) {
        try {
          const p = await readProgress(repoRoot, issue2.id);
          if (p !== undefined)
            inProgressLines.push(`progress: .tgo/${issue2.id}/progress.md`);
        } catch {}
      }
      if (repoRoot) {
        const badge = await getSuspendBadge(issue2.id, repoRoot);
        if (badge)
          inProgressLines.push(badge);
      }
    }
    sections.push("IN PROGRESS:", ...inProgressLines);
  }
  if (data.ready.length > 0) {
    const shown = data.ready.slice(0, maxListed);
    sections.push("READY:", ...shown.map(line));
    if (data.ready.length > shown.length) {
      sections.push(`- … and ${data.ready.length - shown.length} more ready`);
    }
  }
  if (data.blocked.length > 0) {
    const shown = data.blocked.slice(0, maxListed);
    const blocked = shown.map((issue2) => {
      const deps = issue2.blockedBy?.length ? ` ← ${issue2.blockedBy.join(",")}` : "";
      return `${line(issue2)}${deps}`;
    });
    sections.push("BLOCKED:", ...blocked);
    if (data.blocked.length > shown.length) {
      sections.push(`- … and ${data.blocked.length - shown.length} more blocked`);
    }
  }
  if (data.streaming.length > 0) {
    sections.push("STREAMING:", ...data.streaming.map((s) => `- ${s.id} → ${s.target}`));
  }
  if (data.queueLines && data.queueLines.length > 0) {
    sections.push(...data.queueLines);
  }
  if (data.costLines && data.costLines.length > 0) {
    sections.push(...data.costLines);
  }
  if (data.problems && data.problems.length > 0) {
    const probText = buildProblemsSection(data.problems);
    if (probText)
      sections.push(probText);
  }
  return sections.join(`
`);
}
async function renderBoard(run, shim, repoRoot) {
  const [inProgress, ready, blocked, memories] = await Promise.all([
    run("bd list --status in_progress --json"),
    run("bd ready --json"),
    run("bd blocked --json"),
    run("bd memories --json")
  ]);
  if (!inProgress && !ready && !blocked && !memories)
    return;
  if (repoRoot) {
    const text2 = await buildBoardTextWithHints({
      inProgress: parseIssues(inProgress),
      ready: parseIssues(ready),
      blocked: parseIssues(blocked),
      memories: parseMemories(memories),
      streaming: Array.from(shim.streaming, ([id, s]) => ({ id, target: s.target }))
    }, undefined, undefined, 6, repoRoot);
    return `${BOARD_SENTINEL_START}
${text2}
${BOARD_SENTINEL_END}`;
  }
  const text = buildBoardText({
    inProgress: parseIssues(inProgress),
    ready: parseIssues(ready),
    blocked: parseIssues(blocked),
    memories: parseMemories(memories),
    streaming: Array.from(shim.streaming, ([id, s]) => ({ id, target: s.target }))
  });
  return `${BOARD_SENTINEL_START}
${text}
${BOARD_SENTINEL_END}`;
}
function isBoardMessage(message) {
  return message.parts.some((part) => part.text?.includes(BOARD_SENTINEL_START));
}
function stripBoardMessages(messages) {
  let removed = 0;
  for (let i = messages.length - 1;i >= 0; i--) {
    if (isBoardMessage(messages[i])) {
      messages.splice(i, 1);
      removed++;
    }
  }
  return removed;
}
function appendBoardMessage(messages, text, ref) {
  const id = `tgo-board-${crypto.randomUUID()}`;
  const info = {
    id,
    sessionID: ref.sessionID,
    role: "user",
    time: { created: Date.now() },
    agent: ref.agent,
    model: ref.model
  };
  messages.push({
    info,
    parts: [
      {
        id: `tgo-board-part-${crypto.randomUUID()}`,
        sessionID: ref.sessionID,
        messageID: id,
        type: "text",
        text,
        synthetic: true
      }
    ]
  });
}
function deriveContext(messages) {
  for (let i = messages.length - 1;i >= 0; i--) {
    const info = messages[i]?.info;
    if (info?.role === "user" && info.agent) {
      return { sessionID: info.sessionID, agent: info.agent, model: info.model };
    }
  }
  return;
}
var DEFAULT_BOARD_REFRESH_MS = 5000;

class BoardController {
  shim;
  run;
  refreshMs;
  renderCache = new Map;
  sessionEligibility = new Map;
  injectedSessions = new Set;
  agentCache;
  sessionReuse;
  log;
  sessionMessagesCache = new Map;
  sessionMessagesPending = new Map;
  static MAX_SESSION_MESSAGES_CACHE = 32;
  previousMetrics;
  watchdogGetter;
  watchdogProblemsGetter;
  problemsCache = [];
  pruneDone = false;
  runsConfig;
  pruneInFlight;
  scanInFlight = false;
  costGetter;
  constructor(opts) {
    this.run = opts.run;
    this.shim = opts.shim ?? createShim();
    this.refreshMs = opts.refreshMs ?? DEFAULT_BOARD_REFRESH_MS;
    this.sessionReuse = opts.sessionReuse;
    this.log = opts.log;
    this.watchdogGetter = opts.watchdogGetter;
  }
  setWatchdogGetter(getter) {
    this.watchdogGetter = getter;
  }
  setWatchdogProblemsGetter(getter) {
    this.watchdogProblemsGetter = getter;
  }
  setRunsConfig(cfg) {
    this.runsConfig = cfg;
  }
  setCostGetter(getter) {
    this.costGetter = getter;
  }
  setProblems(problems) {
    const map2 = new Map;
    for (const p of problems)
      map2.set(`${p.runId}:${p.state}`, p);
    this.problemsCache = [...map2.values()];
  }
  getProblems() {
    return this.problemsCache;
  }
  async fetchSessionMessagesCached(sid) {
    const now = Date.now();
    const cached2 = this.sessionMessagesCache.get(sid);
    if (cached2 && now - cached2.at < this.refreshMs)
      return cached2.raw;
    const pending = this.sessionMessagesPending.get(sid);
    if (pending)
      return pending;
    const promise2 = (async () => {
      try {
        const raw = await this.sessionReuse.client.session.messages({ path: { id: sid } });
        if (this.sessionMessagesCache.size >= BoardController.MAX_SESSION_MESSAGES_CACHE) {
          const oldest = this.sessionMessagesCache.keys().next().value;
          if (oldest !== undefined)
            this.sessionMessagesCache.delete(oldest);
        }
        this.sessionMessagesCache.set(sid, { raw, at: Date.now() });
        return raw;
      } finally {
        this.sessionMessagesPending.delete(sid);
      }
    })();
    this.sessionMessagesPending.set(sid, promise2);
    return promise2;
  }
  get shimState() {
    return this.shim;
  }
  async loadAgents(client) {
    const now = Date.now();
    if (this.agentCache && now - this.agentCache.at < 30000)
      return this.agentCache.byName;
    const byName = new Map;
    const res = await client.app.agents().catch((err) => {
      const msg = "tgo: board loadAgents failed";
      if (this.log)
        safeWarn(this.log, msg, { error: String(err) });
      else
        console.warn(`${msg}: ${String(err)}`);
      return;
    });
    for (const agent of res?.data ?? []) {
      byName.set(agent.name, agent.mode);
    }
    this.agentCache = { byName, at: now };
    return byName;
  }
  async shouldInject(client, agent) {
    if (!agent)
      return true;
    const agents = await this.loadAgents(client);
    const mode = agents.get(agent);
    if (!mode)
      return true;
    return mode === "primary" || mode === "all";
  }
  async gate(client, input) {
    if (this.injectedSessions.has(input.sessionID))
      return;
    this.injectedSessions.add(input.sessionID);
    const session = await client.session.get({ path: { id: input.sessionID } }).catch((err) => {
      const msg = "tgo: board gate session.get failed";
      if (this.log)
        safeWarn(this.log, msg, { sessionID: input.sessionID, error: String(err) });
      else
        console.warn(`${msg}: ${String(err)}`, { sessionID: input.sessionID });
      return;
    });
    const isPrimary = Boolean(session?.data && Object.prototype.hasOwnProperty.call(session.data, "parentID") && session.data.parentID === null);
    const eligible = isPrimary && await this.shouldInject(client, input.agent);
    this.sessionEligibility.set(input.sessionID, eligible);
  }
  reset(sessionID) {
    this.injectedSessions.delete(sessionID);
    this.renderCache.delete(sessionID);
    this.sessionMessagesCache.clear();
    this.sessionMessagesPending.clear();
  }
  invalidate(sessionID) {
    this.renderCache.delete(sessionID);
    this.sessionMessagesCache.clear();
    this.sessionMessagesPending.clear();
  }
  async buildBoardTextWithHints(data, reusableSet, sessionIdsByIssue, maxListed = 6) {
    return buildBoardTextWithHints(data, reusableSet, sessionIdsByIssue, maxListed, this.sessionReuse?.repoRoot);
  }
  async renderFor(sessionID) {
    const now = Date.now();
    const cached2 = this.renderCache.get(sessionID);
    if (cached2 && now - cached2.at < this.refreshMs)
      return cached2.text;
    const reuseActive = Boolean(this.sessionReuse) && this.sessionReuse.supported === true && this.sessionReuse.enabled !== false;
    if (!reuseActive) {
      const text2 = await renderBoard(this.run, this.shim, this.sessionReuse?.repoRoot);
      if (text2)
        this.renderCache.set(sessionID, { text: text2, at: now });
      return text2;
    }
    const [inProgressRaw, readyRaw, blockedRaw, memoriesRaw] = await Promise.all([
      this.run("bd list --status in_progress --json"),
      this.run("bd ready --json"),
      this.run("bd blocked --json"),
      this.run("bd memories --json")
    ]);
    if (!inProgressRaw && !readyRaw && !blockedRaw && !memoriesRaw)
      return;
    const inProgress = parseIssues(inProgressRaw);
    const ready = parseIssues(readyRaw);
    const blocked = parseIssues(blockedRaw);
    const memories = parseMemories(memoriesRaw);
    const streaming = Array.from(this.shim.streaming, ([id, s]) => ({ id, target: s.target }));
    const repoRootForPrune = this.sessionReuse?.repoRoot;
    if (repoRootForPrune && !this.pruneDone) {
      this.pruneDone = true;
      if (!this.pruneInFlight) {
        this.pruneInFlight = (async () => {
          try {
            const { pruneRuns: pruneRuns2 } = await Promise.resolve().then(() => (init_runs(), exports_runs));
            return await pruneRuns2(repoRootForPrune, {
              now,
              maxAgeMs: this.runsConfig?.maxAgeMs,
              maxBytes: this.runsConfig?.maxBytes,
              maxFiles: this.runsConfig?.maxFiles,
              heartbeatThresholdMs: this.runsConfig?.heartbeatThresholdMs
            });
          } catch {
            return [];
          }
        })();
        this.pruneInFlight.finally(() => {
          this.pruneInFlight = undefined;
        }).catch(() => {});
        await this.pruneInFlight.catch(() => {});
      }
    }
    let queueLines;
    let metricsSnapshot;
    try {
      const repoRootForMetrics = this.sessionReuse?.repoRoot;
      if (repoRootForMetrics) {
        const watchdogTracked = this.watchdogGetter ? this.watchdogGetter() : undefined;
        const previous = this.previousMetrics ?? await readMetrics(repoRootForMetrics).catch(() => {
          return;
        });
        const streamingWithStartedAt = Array.from(this.shim.streaming, ([id, s]) => ({ id, target: s.target, startedAt: s.startedAt }));
        metricsSnapshot = computeMetrics({
          ready,
          blocked,
          streaming: streamingWithStartedAt,
          watchdogTracked,
          shimAgents: this.shim.agents,
          now,
          previous
        });
        await writeMetrics(repoRootForMetrics, metricsSnapshot).catch((e) => {
          safeWarn(this.log, "metrics write failed", { error: String(e) });
        });
        this.previousMetrics = metricsSnapshot;
        const ql = renderQueueLine(metricsSnapshot, previous);
        if (ql)
          queueLines = ql.split(`
`);
      }
    } catch (e) {
      safeWarn(this.log, "queue gauge compute failed", { error: String(e) });
    }
    let costLines;
    try {
      const seatModels = this.costGetter ? this.costGetter() : undefined;
      const repoRootForCost = this.sessionReuse?.repoRoot;
      if (seatModels && repoRootForCost && Object.keys(seatModels).length > 0) {
        const stepsBySeat = await scanSeatSteps(repoRootForCost);
        const lines = buildCostLines({ seatModels, stepsBySeat });
        if (lines.length > 0)
          costLines = lines;
      }
    } catch (e) {
      safeWarn(this.log, "cost surface compute failed", { error: String(e) });
    }
    let problems;
    try {
      if (this.scanInFlight) {
        problems = this.problemsCache.length > 0 ? this.problemsCache : undefined;
      } else {
        this.scanInFlight = true;
        const repoRootForProblems = this.sessionReuse?.repoRoot;
        if (repoRootForProblems) {
          const [recovery] = await Promise.all([
            scanRunsForProblems(repoRootForProblems, { now, heartbeatThresholdMs: this.runsConfig?.heartbeatThresholdMs }).catch(() => [])
          ]);
          const { problemsFromRecovery: problemsFromRecovery2 } = await Promise.resolve().then(() => (init_metrics(), exports_metrics));
          let watchdogProblems;
          if (this.watchdogProblemsGetter) {
            try {
              const probs = this.watchdogProblemsGetter();
              if (probs.length > 0) {
                watchdogProblems = probs.map((p) => ({ sessionID: p.sessionID, issueId: undefined, state: p.state, reason: `watchdog ${p.reason}` }));
                try {
                  const map3 = await (await Promise.resolve().then(() => (init_session_reuse(), exports_session_reuse))).loadSessionMap(repoRootForProblems).catch(() => ({}));
                  for (const wp of watchdogProblems) {
                    for (const [iid, entry] of Object.entries(map3)) {
                      if (entry.sessionId === wp.sessionID) {
                        wp.issueId = iid;
                        break;
                      }
                    }
                  }
                } catch {}
              }
            } catch {}
          }
          const derived = problemsFromRecovery2(recovery, watchdogProblems);
          const dedup = new Map;
          for (const p of derived)
            dedup.set(`${p.runId}:${p.state}`, p);
          const merged = [...dedup.values()];
          if (merged.length > 0)
            problems = merged;
          this.problemsCache = merged;
        } else if (this.problemsCache.length > 0) {
          problems = this.problemsCache;
        }
        this.scanInFlight = false;
      }
    } catch {
      this.scanInFlight = false;
    }
    let reusableSet;
    let sessionIdsByIssue;
    let map2 = {};
    try {
      map2 = await loadSessionMap(this.sessionReuse.repoRoot);
    } catch {
      map2 = {};
    }
    if (map2 && typeof map2 === "object" && Object.keys(map2).length > 0 && inProgress.length > 0) {
      reusableSet = new Set;
      sessionIdsByIssue = new Map;
      for (const issue2 of inProgress) {
        const entry = map2[issue2.id];
        if (!entry || typeof entry.sessionId !== "string" || !entry.sessionId)
          continue;
        const sid = entry.sessionId;
        let raw;
        try {
          raw = await this.fetchSessionMessagesCached(sid);
        } catch (err) {
          const msg = "tgo: board session.messages failed";
          if (this.log)
            safeWarn(this.log, msg, { sessionId: sid, error: String(err) });
          else
            console.warn(`${msg}: ${String(err)}`, { sessionId: sid });
          continue;
        }
        const messages = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
        let estimate;
        try {
          estimate = estimateSessionTokens(messages);
        } catch {
          continue;
        }
        let snapshot;
        try {
          snapshot = await readDefSnapshot(this.sessionReuse.repoRoot, issue2.id);
        } catch {
          snapshot = null;
        }
        if (shouldReuseWithSnapshot(estimate, this.sessionReuse.maxContextTokens, { snapshot: snapshot ?? null })) {
          reusableSet.add(issue2.id);
          sessionIdsByIssue.set(issue2.id, sid);
        }
      }
    }
    const inner = await this.buildBoardTextWithHints({ inProgress, ready, blocked, memories, streaming, queueLines, costLines, problems }, reusableSet, sessionIdsByIssue);
    const text = `${BOARD_SENTINEL_START}
${inner}
${BOARD_SENTINEL_END}`;
    if (text)
      this.renderCache.set(sessionID, { text, at: now });
    return text;
  }
  async transform(messages) {
    const context = deriveContext(messages);
    if (!context)
      return;
    this.shim.agents.set(context.sessionID, context.agent);
    const eligible = this.sessionEligibility.get(context.sessionID) ?? false;
    if (!eligible)
      return;
    stripBoardMessages(messages);
    const text = await this.renderFor(context.sessionID);
    if (text)
      appendBoardMessage(messages, text, context);
  }
}

// src/concision.ts
init_config();

// src/voices.ts
init_zod();
import * as fs12 from "node:fs/promises";
import * as path12 from "node:path";
import { fileURLToPath as fileURLToPath2 } from "node:url";
var voiceCardIdSchema = exports_external.enum(["tgo-default", "tgo-prose", "tgo-conversational"]);
var metaSchema = exports_external.object({
  display_name: exports_external.string().min(1),
  attribution: exports_external.string().min(1),
  exemplar_source: exports_external.string().optional(),
  notes: exports_external.string().optional()
});
var sentenceBucketsSchema = exports_external.object({
  short_1_10w: exports_external.number().int().min(0).max(100).optional(),
  medium_11_24w: exports_external.number().int().min(0).max(100).optional(),
  long_25w_plus: exports_external.number().int().min(0).max(100).optional()
});
var steThresholdsSchema = exports_external.object({
  instruction: exports_external.number().int().positive().optional(),
  descriptive: exports_external.number().int().positive().optional()
});
var syntaxTargetsSchema = exports_external.object({
  sentence_buckets_by_count: sentenceBucketsSchema.optional(),
  mean_words: exports_external.number().optional(),
  median_words: exports_external.number().optional(),
  p90_words: exports_external.number().optional(),
  max_words: exports_external.number().int().positive().optional(),
  long_formation: exports_external.string().optional(),
  ste_thresholds: steThresholdsSchema.optional()
});
var punctuationBudgetsSchema = exports_external.object({
  em_dash_per_100w_max: exports_external.number().optional(),
  em_dash_cluster_flag: exports_external.number().int().optional(),
  sentence_initial_transitions_per_paragraph_max: exports_external.number().int().optional(),
  transitions_exempt_from_flagging: exports_external.array(exports_external.string()).optional(),
  one_device_per_sentence: exports_external.boolean().optional()
});
var rhythmRulesSchema = exports_external.object({
  paragraph_head_discipline: exports_external.string().optional(),
  length_bias: exports_external.enum(["short", "medium", "long"]).optional(),
  variance_follows_emphasis: exports_external.boolean().optional(),
  no_metronome_alternation: exports_external.boolean().optional(),
  linked_clause_requires_verb: exports_external.boolean().optional(),
  fragments: exports_external.string().optional()
});
var antiPatternsThresholdsSchema = exports_external.object({
  hedge_stack_max: exports_external.number().int().optional(),
  hidden_actor_flag: exports_external.string().optional(),
  rule_of_three_cluster: exports_external.number().int().optional(),
  synonym_cycle_window_sentences: exports_external.number().int().optional(),
  novelty_inflation_flag: exports_external.string().optional(),
  false_balance_flag: exports_external.string().optional()
}).passthrough();
var antiPatternsSchema = exports_external.object({
  refs: exports_external.array(exports_external.string()).optional(),
  strictness: exports_external.enum(["low", "medium", "high"]).optional(),
  thresholds: antiPatternsThresholdsSchema.optional()
});
var controlsSchema = exports_external.object({
  off_switch: exports_external.string().optional(),
  exemplar_injection_max: exports_external.number().int().min(0).optional(),
  exemplar_selection: exports_external.string().optional(),
  closer: exports_external.string().optional()
});
var voiceInvariantsSchema = exports_external.object({
  tone: exports_external.string().optional(),
  diction: exports_external.string().optional(),
  syntax_targets: syntaxTargetsSchema.optional(),
  punctuation_budgets: punctuationBudgetsSchema.optional(),
  rhythm_rules: rhythmRulesSchema.optional(),
  perspective: exports_external.string().optional(),
  anti_patterns: antiPatternsSchema.optional(),
  controls: controlsSchema.optional()
});
var templateSchema = exports_external.object({
  shape: exports_external.string().min(1),
  moves: exports_external.array(exports_external.string()),
  constraints: exports_external.array(exports_external.string()).optional()
});
var arcRepertoireSchema = exports_external.object({
  templates: exports_external.array(templateSchema).optional()
});
var exemplarSchema = exports_external.object({
  shape: exports_external.string().min(1),
  person: exports_external.enum(["first", "second", "third"]),
  first_line: exports_external.string().min(1),
  last_line: exports_external.string().min(1),
  text: exports_external.string().min(1)
});
function estimateVoiceTokens(text) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const words = normalized.length === 0 ? 0 : normalized.split(" ").length;
  const punctuation = (normalized.match(/[^\w\s]/g) ?? []).length;
  return Math.ceil(words + punctuation * 0.25);
}
function renderFold(card) {
  const v = card.voice_invariants;
  const parts = [];
  parts.push("## TGO house style — active every turn");
  parts.push("");
  const structure = v.perspective ?? "use active voice. Put condition before command. Use one action per numbered step and complete instructional sentences. Start with the action; restate the state; use no preamble or closer.";
  parts.push(`- Structure — ${structure}`);
  const proseCore = "compress style, never substance. Drop articles only in scan-oriented fragments, not instructional sentences. Preserve qualifiers, negations, numbers, units, identifiers, commands, errors, and explanations needed for correctness, safety, or ambiguity handling. Keep code verbatim. Never invent facts. Use project's own language (ubiquitous language).";
  parts.push(`- Prose — ${proseCore}`);
  if (card.id === "tgo-default" && !v.diction?.includes("judge by clusters")) {
    throw new Error(`renderFold: card ${card.id} diction missing "judge by clusters" — refusing degraded fallback; expected full banned-tell vocabulary`);
  }
  const bannedShort = "Banned tells (judge by clusters, not isolated instances — one however is fine, a run of AI-isms is not): filler, AI-vocab (utilize, leverage, delve, showcase, landscape, testament), marketing adjectives (seamless, robust, cutting-edge, effortless, world-class), pomposities (commence, initiate, furthermore, moreover), adverbs (really, just, literally, truly), modal hedges (it is important to note), rule-of-three, not X, it's Y, synonym-cycling, passive voice, em-dash spam, throat-clearing, chatbot closers (Hope this helps), diff-anchored narration.";
  parts.push(`- ${bannedShort}`);
  const code = v.controls?.closer ?? "smallest working change; never cut tests or errors; report code first.";
  const codeSnippet = code.split(";")[0] ?? code;
  parts.push(`- Code — ${codeSnippet.trim()}; never cut tests, error handling, or security checks to save space; report code first.`);
  parts.push(`- Self-audit — re-read before delivering; cut or rewrite any banned tell without dropping information.`);
  parts.push(`- Off-switch: ${v.controls?.off_switch ?? "stop X / normal mode"} turns this layer off. Break these only when following them breaks correctness.`);
  parts.push(`- Plain-english: abstract-noun subjects banned; circumlocution swaps due to the fact that→because, at this point in time→now, in order to→to; modal ladder should is hedge — use must or state as fact; no sycophancy; priors: Plain Language (ISO 24495-1), Strunk & White, The Elements of Style.`);
  const text = parts.join(`
`);
  if (estimateVoiceTokens(text) > 250) {
    let candidate = parts.slice(0, -1).join(`
`);
    if (estimateVoiceTokens(candidate) <= 250)
      return candidate;
    const words = text.split(/\s+/);
    return words.slice(0, 190).join(" ");
  }
  return text;
}
function renderStyleOverride(card) {
  if (card.id === "tgo-default")
    return "";
  const v = card.voice_invariants;
  const parts = [];
  parts.push(`## TGO voice delta — ${card.id} (layered on default; default spine still applies)`);
  parts.push("");
  if (v.tone)
    parts.push(`- Tone delta: ${v.tone}.`);
  if (v.diction) {
    const snippet = v.diction.length > 160 ? v.diction.slice(0, 160).trim() + "…" : v.diction;
    parts.push(`- Diction delta: ${snippet}`);
  }
  if (v.perspective)
    parts.push(`- Perspective: ${v.perspective}`);
  const r = v.rhythm_rules;
  if (r) {
    const bits = [];
    if (r.paragraph_head_discipline)
      bits.push(r.paragraph_head_discipline);
    if (r.length_bias)
      bits.push(`length bias ${r.length_bias}`);
    if (r.fragments)
      bits.push(r.fragments);
    if (bits.length)
      parts.push(`- Rhythm: ${bits.join("; ")}.`);
  }
  const st = v.syntax_targets;
  if (st?.sentence_buckets_by_count) {
    const b = st.sentence_buckets_by_count;
    parts.push(`- Syntax targets: buckets ${b.short_1_10w}/${b.medium_11_24w}/${b.long_25w_plus}, mean ${st.mean_words} median ${st.median_words} p90 ${st.p90_words} max ${st.max_words} (${st.long_formation ?? "paratactic addition"}).`);
  }
  const pb = v.punctuation_budgets;
  if (pb) {
    parts.push(`- Punctuation: em-dash ${pb.em_dash_per_100w_max ?? "n/a"}/100w cluster ${pb.em_dash_cluster_flag ?? "n/a"}, transitions ${pb.sentence_initial_transitions_per_paragraph_max ?? "n/a"}/para, one device per sentence ${pb.one_device_per_sentence ?? true}.`);
  }
  const arc = card.arc_repertoire?.templates;
  if (arc?.length) {
    const shapes = arc.map((t) => t.shape).join(", ");
    parts.push(`- Arc repertoire (shape-tagged, 1–2 only): ${shapes}.`);
  }
  const ap = v.anti_patterns;
  if (ap) {
    const refs = (ap.refs ?? []).join(", ");
    parts.push(`- Anti-patterns: strictness ${ap.strictness ?? "medium"}; refs [${refs}].`);
  }
  if (v.controls?.closer)
    parts.push(`- Closer: ${v.controls.closer}`);
  const text = parts.join(`
`);
  const tokens = estimateVoiceTokens(text);
  if (tokens > 200) {
    let candidate = text;
    while (estimateVoiceTokens(candidate) > 200 && candidate.split(/\s+/).length > 20) {
      const w = candidate.split(/\s+/);
      candidate = w.slice(0, w.length - 6).join(" ");
    }
    return candidate;
  }
  return text;
}
function renderInstruction(card) {
  const v = card.voice_invariants;
  const parts = [];
  parts.push("## TGO house style — active every turn");
  parts.push("");
  parts.push("This is the amalgamated always-on style layer. It applies to every response in this session, every turn. Follow it unless following it would break correctness (a security warning, an irreversible confirmation, an ambiguity-prone sequence must stay full and clear).");
  parts.push("");
  const perspective = v.perspective ?? "use active voice. Put a controlling condition before its command. Use one action per numbered step and complete instructional sentences. Start with the action; restate the current state; use no preamble, closer, or throat-clearing.";
  parts.push(`- Structure — ${perspective}`);
  const diction = v.diction ?? "";
  parts.push(`- Prose — ${diction}`);
  const controls = v.controls?.closer ?? "smallest working change (YAGNI); never cut tests, error handling, or security checks to save space; code-first reporting (show the change, then the one-line why).";
  parts.push(`- Code (inert if you produce none) — ${controls}`);
  parts.push("");
  const off = v.controls?.off_switch ?? "stop X / normal mode";
  parts.push(`Off-switch: "${off}" turns this whole layer off. Break these rules when following them breaks correctness.`);
  const ste = v.syntax_targets?.ste_thresholds ? `STE thresholds: instruction ${v.syntax_targets.ste_thresholds.instruction}, descriptive ${v.syntax_targets.ste_thresholds.descriptive}.` : "";
  const rhythm = v.rhythm_rules?.paragraph_head_discipline ? `Rhythm: ${v.rhythm_rules.paragraph_head_discipline}; ${v.rhythm_rules.fragments ?? ""}` : "";
  const punct = v.punctuation_budgets?.em_dash_per_100w_max !== undefined ? `Punctuation budgets: em-dash max ${v.punctuation_budgets.em_dash_per_100w_max}/100w, cluster flag ${v.punctuation_budgets.em_dash_cluster_flag}, one device per sentence ${v.punctuation_budgets.one_device_per_sentence}.` : "";
  if (ste || rhythm || punct) {
    parts.push("");
    if (ste)
      parts.push(ste);
    if (rhythm)
      parts.push(rhythm);
    if (punct)
      parts.push(punct);
  }
  const text = parts.join(`
`);
  const tokens = estimateVoiceTokens(text);
  if (tokens < 300) {
    return text + `

Priors reaffirmed: Plain Language (ISO 24495-1) demands concrete subjects, short sentences, and defined terms; Strunk & White, The Elements of Style demands active verbs, concise diction, and omission of needless words.`;
  }
  if (tokens > 500) {
    const words = text.split(/\s+/);
    return words.slice(0, Math.max(0, words.length - 20)).join(" ");
  }
  return text;
}
async function loadVoiceCard(cardId = "tgo-default") {
  const id = cardId.startsWith("tgo-") ? cardId : `tgo-${cardId}`;
  const packageRoot = path12.resolve(path12.dirname(fileURLToPath2(import.meta.url)), "..");
  const file2 = path12.join(packageRoot, "assets", "voices", `${id}.json`);
  const raw = JSON.parse(await fs12.readFile(file2, "utf-8"));
  return voiceCardSchema.parse(raw);
}
var voiceCardSchema = exports_external.object({
  $schema: exports_external.string().optional(),
  id: voiceCardIdSchema,
  version: exports_external.string().regex(/^\d+\.\d+\.\d+$/),
  meta: metaSchema,
  voice_invariants: voiceInvariantsSchema,
  arc_repertoire: arcRepertoireSchema,
  exemplars: exports_external.array(exemplarSchema)
});
var rulePatternSchema = exports_external.object({
  kind: exports_external.enum(["regex"]),
  value: exports_external.string().min(1),
  flags: exports_external.string().optional()
});
var ruleFamilySchema = exports_external.object({
  name: exports_external.string().min(1),
  patterns: exports_external.array(rulePatternSchema),
  severity: exports_external.enum(["low", "medium", "high", "none"]).optional(),
  basis: exports_external.enum(["cluster", "repeated-signal", "strong-evidence"]).optional(),
  thresholds: exports_external.record(exports_external.string(), exports_external.unknown()).optional()
});
var rulePackSchema = exports_external.object({
  $schema: exports_external.string().optional(),
  id: exports_external.string().min(1),
  tier: exports_external.number().int().min(1).max(3),
  false_positive_risk: exports_external.enum(["low", "medium", "high"]),
  gating: exports_external.enum(["always-on", "whitelist", "cluster"]),
  families: exports_external.array(ruleFamilySchema)
});

// src/concision.ts
async function loadVoiceCard2(cardId = "default") {
  return loadVoiceCard(cardId);
}
async function buildVoiceInstruction(cardId = "default") {
  const card = await loadVoiceCard2(cardId);
  return renderInstruction(card);
}
async function buildVoiceOverride(cardId) {
  const card = await loadVoiceCard2(cardId);
  const override = renderStyleOverride(card);
  if (override) {
    const tokens = estimateVoiceTokens(override);
    if (tokens > 200)
      throw new Error(`voice override for ${cardId} exceeds 200 tokens: ${tokens}`);
  }
  return override;
}
var DEFAULT_CONCISION_ENABLED = true;

class ConcisionController {
  enabled;
  cardId;
  primaryCache = new Map;
  instruction;
  defaultInstruction;
  overrideInstruction;
  overrideCardId;
  log;
  constructor(opts) {
    this.enabled = opts.enabled ?? DEFAULT_CONCISION_ENABLED;
    const legacy = opts.register;
    if (opts.cardId !== undefined)
      this.cardId = opts.cardId;
    else if (typeof legacy === "string" && ["default", "prose", "conversational"].includes(legacy))
      this.cardId = legacy;
    else if (typeof legacy === "string")
      this.cardId = "default";
    else
      this.cardId = "default";
    this.log = opts.log;
  }
  async buildInstruction() {
    this.instruction ??= await buildVoiceInstruction(this.cardId);
    return this.instruction;
  }
  async buildDefaultInstruction() {
    this.defaultInstruction ??= await buildVoiceInstruction("default");
    return this.defaultInstruction;
  }
  async buildOverrideInstruction() {
    const normalized = this.cardId.startsWith("tgo-") ? this.cardId : `tgo-${this.cardId}`;
    if (normalized === "tgo-default")
      return;
    if (this.overrideCardId === this.cardId && this.overrideInstruction !== undefined)
      return this.overrideInstruction;
    const ov = await buildVoiceOverride(this.cardId);
    this.overrideCardId = this.cardId;
    this.overrideInstruction = ov || undefined;
    return this.overrideInstruction;
  }
  async isPrimary(client, sessionID) {
    const cached2 = this.primaryCache.get(sessionID);
    if (cached2 !== undefined)
      return cached2;
    const res = await client.session.get({ path: { id: sessionID } }).catch((err) => {
      const msg = "tgo: concision isPrimary session.get failed";
      if (this.log)
        safeWarn(this.log, msg, { sessionID, error: String(err) });
      else
        console.warn(`${msg}: ${String(err)}`, { sessionID });
      return;
    });
    const data = res?.data;
    const primary = Boolean(data && Object.prototype.hasOwnProperty.call(data, "parentID") && data.parentID === null);
    this.primaryCache.set(sessionID, primary);
    return primary;
  }
  reset() {
    this.primaryCache.clear();
    this.instruction = undefined;
    this.defaultInstruction = undefined;
    this.overrideInstruction = undefined;
    this.overrideCardId = undefined;
  }
  async transform(client, input, output) {
    if (!this.enabled)
      return false;
    if (!input.sessionID)
      return false;
    if (!await this.isPrimary(client, input.sessionID))
      return false;
    const defaultInstruction = await this.buildDefaultInstruction();
    if (defaultInstruction)
      output.system.push(defaultInstruction);
    const override = await this.buildOverrideInstruction();
    if (override)
      output.system.push(override);
    return true;
  }
}

// src/drift.ts
import * as fs13 from "node:fs";
import * as path13 from "node:path";
import { fileURLToPath as fileURLToPath3 } from "node:url";
var STE_INSTRUCTION_THRESHOLD = 20;
var STE_DESCRIPTIVE_THRESHOLD = 25;
var instructionPrefix = /^\s*(?:\d+[\.)]\s*|(?:Run|Restart|Set|Check|Verify|Use|Install|Retry|Changed|Ran|Result|Do not|Never|Keep|Clear|If|When|Create|Dispatch|Verify)\b)/i;
function countSteViolations(candidate, mode, thresholds) {
  const instr = thresholds?.instruction ?? STE_INSTRUCTION_THRESHOLD;
  const desc = thresholds?.descriptive ?? STE_DESCRIPTIVE_THRESHOLD;
  const words = candidate.trim() ? candidate.trim().split(/\s+/).filter(Boolean).length : 0;
  const applicable = mode === "tool-heavy";
  if (!applicable || words === 0)
    return { violations: 0, violationsPer100w: 0, applicable, words, sentences: 0 };
  const sentenceList = [...candidate.matchAll(/[^.!?\n]+[.!?]+/g)].map((m) => m[0].trim()).filter(Boolean);
  const sentences = sentenceList.length || (candidate.trim() ? 1 : 0);
  let violations = 0;
  for (const sentence of sentenceList.length ? sentenceList : candidate.trim() ? [candidate.trim()] : []) {
    const sentenceWords = sentence.split(/\s+/).filter(Boolean).length;
    const threshold = instructionPrefix.test(sentence) ? instr : desc;
    if (sentenceWords > threshold)
      violations++;
  }
  const violationsPer100w = words ? violations / words * 100 : 0;
  return { violations, violationsPer100w, applicable, words, sentences };
}
var emptyUncertainty = () => ({ codes: [], message: "", spans: [] });
var overlap = (a, b) => a.start < b.end && b.start < a.end;
var masked = (text, spans) => {
  const chars = text.split("");
  for (const span of spans)
    for (let i = span.start;i < span.end && i < chars.length; i++)
      if (chars[i] !== `
`)
        chars[i] = " ";
  return chars.join("");
};
var packageRoot = path13.resolve(path13.dirname(fileURLToPath3(import.meta.url)), "..");
var loadedPacks = [];
var loadedFamilies = [];
var packLoadError = null;
function loadPacksSync() {
  const ids = ["mechanics", "concision", "voice-cadence"];
  const packs = [];
  const families = [];
  for (const id of ids) {
    const file2 = path13.join(packageRoot, "assets", "rule-packs", `${id}.json`);
    let raw;
    try {
      raw = JSON.parse(fs13.readFileSync(file2, "utf-8"));
    } catch (e) {
      throw new Error(`drift: failed to read pack ${id}: ${String(e)}`);
    }
    const parsed = rulePackSchema.parse(raw);
    const fam = parsed.families.map((f) => ({
      name: f.name,
      packId: parsed.id,
      tier: parsed.tier,
      gating: parsed.gating,
      severity: f.severity ?? "low",
      basis: f.basis ?? (parsed.gating === "always-on" ? "strong-evidence" : "cluster"),
      patterns: f.patterns.map((p) => new RegExp(p.value, p.flags ?? "")),
      thresholds: f.thresholds ?? {}
    }));
    packs.push({ id: parsed.id, tier: parsed.tier, gating: parsed.gating, families: fam });
    families.push(...fam);
  }
  loadedPacks = packs;
  loadedFamilies = families;
}
try {
  loadPacksSync();
} catch (e) {
  packLoadError = String(e);
  console.warn(`drift: pack load failed: ${packLoadError}`);
}
var voiceCardCache = new Map;
function normalizeCardId(id) {
  const withPrefix = id.startsWith("tgo-") ? id : `tgo-${id}`;
  if (withPrefix.startsWith("tgo-test-"))
    return withPrefix;
  if (["tgo-default", "tgo-prose", "tgo-conversational"].includes(withPrefix))
    return withPrefix;
  return "tgo-default";
}
function getVoiceCardSync(cardId) {
  const normalized = normalizeCardId(cardId);
  const cached2 = voiceCardCache.get(normalized);
  if (cached2)
    return cached2;
  const file2 = path13.join(packageRoot, "assets", "voices", `${normalized}.json`);
  const raw = JSON.parse(fs13.readFileSync(file2, "utf-8"));
  const parsed = voiceCardSchema.parse(raw);
  voiceCardCache.set(normalized, parsed);
  return parsed;
}
function resolveCardId(input) {
  if (input.cardId)
    return normalizeCardId(input.cardId);
  const legacy = input.register;
  if (legacy === "concise" || legacy === "natural") {
    return "tgo-default";
  }
  return "tgo-default";
}
function getSteThresholds(card) {
  const st = card?.voice_invariants.syntax_targets?.ste_thresholds;
  return {
    instruction: st?.instruction ?? STE_INSTRUCTION_THRESHOLD,
    descriptive: st?.descriptive ?? STE_DESCRIPTIVE_THRESHOLD
  };
}
function isFamilyIncluded(card, family) {
  const refs = card.voice_invariants.anti_patterns?.refs ?? [];
  if (refs.length === 0)
    return false;
  if (refs.includes(family.packId))
    return true;
  if (refs.includes(family.name))
    return true;
  return false;
}
function parseThresholdNumber(value) {
  if (typeof value === "number")
    return value;
  if (typeof value === "string") {
    const m = value.match(/(\d+(?:\.\d+)?)/);
    if (m)
      return parseFloat(m[1]);
  }
  return;
}
function getThresholdValue(family, card, key) {
  const cardThresholds = card.voice_invariants.anti_patterns?.thresholds ?? {};
  if (key === "em_dash_per_100w_max") {
    const v = card.voice_invariants.punctuation_budgets?.em_dash_per_100w_max;
    if (v !== undefined)
      return v;
  }
  if (key in cardThresholds)
    return cardThresholds[key];
  if (family.thresholds && key in family.thresholds)
    return family.thresholds[key];
  return;
}
function getRequiredCount(family, card) {
  const map2 = {
    "hedge-stacks": "hedge_stack_max",
    "passive-hidden-actor": "hidden_actor_flag",
    "rule-of-three": "rule_of_three_cluster",
    "synonym-cycling": "synonym_cycle_window_sentences",
    "novelty-inflation": "novelty_inflation_flag",
    "false-balance": "false_balance_flag",
    "em-dash-budgets": "em_dash_per_100w_max"
  };
  const key = map2[family.name];
  if (key) {
    const val = getThresholdValue(family, card, key);
    if (val !== undefined) {
      if (key === "hedge_stack_max") {
        const n3 = parseThresholdNumber(val);
        if (n3 !== undefined)
          return n3 + 1;
      }
      const n2 = parseThresholdNumber(val);
      if (n2 !== undefined) {
        if (key === "em_dash_per_100w_max")
          return -1;
        return n2;
      }
    }
  }
  const clusterMin = getThresholdValue(family, card, "cluster_min") ?? family.thresholds.cluster_min;
  const n = parseThresholdNumber(clusterMin);
  if (n !== undefined)
    return n;
  return family.tier === 3 ? 2 : 1;
}
function thresholdsNotMet(family, basis, spans, card, candidateWords) {
  if (family.name === "em-dash-budgets") {
    const rawMax = getThresholdValue(family, card, "em_dash_per_100w_max") ?? 0.5;
    const max = typeof rawMax === "number" ? rawMax : parseThresholdNumber(rawMax) ?? 0.5;
    const count = spans.length;
    const words = candidateWords || 1;
    const per100w = count / words * 100;
    if (per100w <= max) {
      const clusterFlag2 = getThresholdValue(family, card, "em_dash_cluster_flag") ?? family.thresholds.em_dash_cluster_flag ?? 2;
      const flag2 = parseThresholdNumber(clusterFlag2) ?? 2;
      if (count < flag2)
        return true;
      return true;
    }
    const clusterFlag = getThresholdValue(family, card, "em_dash_cluster_flag") ?? family.thresholds.em_dash_cluster_flag ?? 2;
    const flag = parseThresholdNumber(clusterFlag) ?? 2;
    if (count < flag)
      return true;
    return false;
  }
  const required2 = getRequiredCount(family, card);
  if (required2 === -1)
    return false;
  return spans.length < required2;
}
function getCardSuppression(family, basis, spans, input, card, candidateWords) {
  if (family.tier === 1)
    return { suppressed: false };
  if (!isFamilyIncluded(card, family))
    return { suppressed: true, reason: "card marks family non-applicable" };
  const strictness = card.voice_invariants.anti_patterns?.strictness;
  if (strictness === "low" && family.tier === 3 && basis !== "strong-evidence") {
    return { suppressed: true, reason: "card strictness low suppresses voice-cadence without strong evidence" };
  }
  if (thresholdsNotMet(family, basis, spans, card, candidateWords)) {
    return { suppressed: true, reason: "below card threshold" };
  }
  return { suppressed: false };
}
function protectedSpans(input) {
  const spans = (input.taskContext?.protectedSpans ?? []).filter((s) => Number.isInteger(s.start) && Number.isInteger(s.end) && s.start >= 0 && s.end > s.start && s.end <= input.candidate.length).map((s) => ({ ...s }));
  const add = (start, end) => spans.push({ start, end });
  const patterns = [
    /```[\s\S]*?```|`[^`\n]+`/g,
    /^\s*(?:[$>]|(?:npm|bun|pnpm|yarn|git|cargo|python|curl)\s)[^\n]*$/gim,
    /^\s*>[^\n]*$/gm,
    /"[^"\n]+"|(?<![\p{L}\p{N}])'[^'\n]+'/gu,
    /^\s*(?:warning|error):[^\n]*$/gim,
    /\b\d+(?:\.\d+)?\s*(?:ms|s|seconds?|minutes?|hours?|days?|%|tests?|tasks?|waves?|tokens?|bytes?|MB|GB)\b/gi,
    /\b(?:do not|don't|never|must not|cannot|can't|should not|shouldn't)\b[^.!?\n]*/gi,
    /\b(?:because|so that|until|otherwise)\b[^.!?\n]*/gi,
    /\b(?:if|when|unless|only if|provided that|at least|at most|exactly|approximately)\b[^.!?\n]*/gi,
    /\b(?:https?:\/\/|www\.)[^\s)]+/gi,
    /\b[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+\b/g,
    /\b[A-Za-z0-9_-]+@[A-Za-z0-9._-]+\b/g,
    /\b(?:API|APIs|SDK|OAuth|OIDC|JWT|TLS|SSL|SSH|HTTPS|CORS|CSRF|XSS|SQL)\b/g,
    /\b(?:security|authentication|authorization|credentials?|secrets?|tokens?)\b[^.!?\n]*/gi,
    /(?<!\[)\b(?!(?:TODO|PLACEHOLDER|oai_citation|citeturn)\b)(?:[a-z][A-Za-z0-9]*[A-Z][A-Za-z0-9]*|[A-Z][A-Za-z0-9_]*[A-Z][A-Za-z0-9_]*|[A-Za-z_$][\w$]*_[A-Za-z_$][\w$]*|config)\b/g
  ];
  for (const pattern of patterns)
    for (const match of input.candidate.matchAll(pattern))
      add(match.index, match.index + match[0].length);
  const placeholderRanges = [];
  for (const m of input.candidate.matchAll(/\[[^\]]+\]/g))
    placeholderRanges.push({ start: m.index, end: m.index + m[0].length });
  for (const m of input.candidate.matchAll(/\{\{[^}]+\}\}/g))
    placeholderRanges.push({ start: m.index, end: m.index + m[0].length });
  for (const m of input.candidate.matchAll(/<<[^>]+>>/g))
    placeholderRanges.push({ start: m.index, end: m.index + m[0].length });
  for (const m of input.candidate.matchAll(/20\d\d-XX-XX/g))
    placeholderRanges.push({ start: m.index, end: m.index + m[0].length });
  const withoutPlaceholderCode = spans.filter((s) => !placeholderRanges.some((r) => s.start >= r.start && s.end <= r.end));
  return withoutPlaceholderCode.sort((a, b) => a.start - b.start || a.end - b.end).filter((s, i, all) => i === 0 || s.start !== all[i - 1].start || s.end !== all[i - 1].end);
}
function unprotectedSpans(text, regex, protectedList, offset = 0) {
  const localProtected = protectedList.map((span) => ({ start: span.start - offset, end: span.end - offset }));
  const safeText = masked(text, localProtected);
  return [...safeText.matchAll(regex)].flatMap((m) => {
    const whole = { start: m.index + offset, end: m.index + offset + m[0].length };
    if (protectedList.some((span) => overlap(whole, span)))
      return [];
    return [whole];
  });
}
function spansForFamily(family, text, protectedList, offset = 0) {
  let effectiveProtected = protectedList;
  if (family.name === "ai-tracking-params") {
    const urlRegex = /\b(?:https?:\/\/|www\.)[^\s)]+/gi;
    const urlSpans = [];
    for (const m of text.matchAll(urlRegex))
      urlSpans.push({ start: m.index + offset, end: m.index + m[0].length });
    effectiveProtected = protectedList.filter((p) => !urlSpans.some((u) => p.start >= u.start && p.end <= u.end));
  }
  return family.patterns.flatMap((p) => unprotectedSpans(text, p, effectiveProtected, offset)).sort((a, b) => a.start - b.start);
}
function finding(axis, severity, evidence, spans, basis, input, reason, uncertainty = emptyUncertainty(), family, card, candidateWords) {
  let suppressed = false;
  let suppressionReason;
  if (!input.enabled) {
    suppressed = true;
    suppressionReason = "analyzer disabled";
  } else if (reason) {
    suppressed = true;
    suppressionReason = reason;
  } else if (uncertainty.codes.length > 0) {
    suppressed = true;
    suppressionReason = "preservation or correctness concern";
  } else if (family && card) {
    const cs = getCardSuppression(family, basis, spans, input, card, candidateWords ?? 0);
    if (cs.suppressed) {
      suppressed = true;
      suppressionReason = cs.reason;
    }
  } else if (family && !card) {
    suppressed = false;
  } else if (!family && axis === "readability" && card) {
    const strictness = card.voice_invariants.anti_patterns?.strictness;
    if (strictness === "low" && basis !== "strong-evidence") {
      suppressed = true;
      suppressionReason = "card strictness low suppresses voice-cadence without strong evidence";
    }
  }
  return { axis, severity: suppressed ? "none" : severity, evidence, spans, basis, uncertainty, suppressed, ...suppressionReason ? { suppressionReason } : {} };
}
function rank(s) {
  return ["none", "low", "medium", "high"].indexOf(s);
}
function same(a, b) {
  return a.toLowerCase().replace(/\s+/g, " ").trim() === b.toLowerCase().replace(/\s+/g, " ").trim();
}
function analyzeStyleDrift(input) {
  if (packLoadError) {
    throw new Error(`drift packs failed to load: ${packLoadError}`);
  }
  const cardId = resolveCardId(input);
  let card;
  try {
    card = getVoiceCardSync(cardId);
  } catch {
    card = getVoiceCardSync("tgo-default");
  }
  const steThresholds = getSteThresholds(card);
  const protectedContent = protectedSpans(input);
  const suppliedProtected = input.taskContext?.protectedSpans ?? [];
  const invalidProtected = suppliedProtected.filter((s) => !Number.isInteger(s.start) || !Number.isInteger(s.end) || s.start < 0 || s.end <= s.start || s.end > input.candidate.length);
  const sentences = [...input.candidate.matchAll(/[^.!?\n]+[.!?]+/g)].map((m) => ({ text: m[0].trim(), span: { start: m.index, end: m.index + m[0].length } })).filter((x) => x.text.length > 0);
  const findings = [];
  const preservationUncertainty = /\b(?:uncertain|unknown|not sure|cannot verify|can't verify|unable to verify|remains unclear)\b/i.test(input.candidate) ? { codes: ["preservation"], message: "Candidate states that preservation or production behavior remains uncertain.", spans: [] } : emptyUncertainty();
  const candidateWords = input.candidate.trim() ? input.candidate.trim().split(/\s+/).filter(Boolean).length : 0;
  for (let i = 1;i < sentences.length; i++)
    if (same(sentences[i - 1].text, sentences[i].text) && !protectedContent.some((span) => overlap(sentences[i - 1].span, span) || overlap(sentences[i].span, span))) {
      findings.push(finding("response-length", "high", `Consecutive repeated sentence: ${sentences[i].text}`, [sentences[i - 1].span, sentences[i].span], "strong-evidence", input, undefined, preservationUncertainty));
    }
  const familyEvidence = [];
  for (const family of loadedFamilies) {
    const spans = spansForFamily(family, input.candidate, protectedContent, 0).sort((a, b) => a.start - b.start);
    if (spans.length === 0)
      continue;
    if (family.name === "closer") {
      if (input.taskContext?.answerComplete ?? true) {
        findings.push(finding("anti-style-cluster", "medium", "Chatbot closer after the answer is complete", spans, "strong-evidence", input, undefined, preservationUncertainty, family, card, candidateWords));
      }
      continue;
    }
    familyEvidence.push(...spans);
  }
  const sections = [...input.candidate.matchAll(/(?:^|\n\s*\n)([\s\S]*?)(?=\n\s*\n|$)/g)];
  for (const section of sections) {
    const start = section.index + (section[0].length - section[1].length);
    const sectionText = section[1];
    const sectionFamilies = loadedFamilies.filter((f) => f.name !== "closer").map((f) => {
      const spans = spansForFamily(f, sectionText, protectedContent, start).sort((a, b) => a.start - b.start);
      return { family: f, spans };
    }).filter((x) => x.spans.length > 0);
    for (const { family, spans } of sectionFamilies) {
      const packRequired = (() => {
        const v = family.thresholds.cluster_min;
        const n = parseThresholdNumber(v);
        if (n !== undefined)
          return n;
        return family.tier === 3 ? 2 : 1;
      })();
      if (spans.length >= packRequired) {
        let severity;
        if (family.tier === 1)
          severity = family.severity;
        else
          severity = spans.length >= 3 ? "medium" : "low";
        findings.push(finding("anti-style-cluster", severity, `${family.name} tell cluster`, spans, "cluster", input, undefined, preservationUncertainty, family, card, candidateWords));
      }
    }
    const sectionSpans = sectionFamilies.map(({ family, spans }) => [family.name, spans.length]);
    if (sectionSpans.length >= 2 && !sectionSpans.some(([, count]) => count >= 2) && !/(?:^|[.!?]\s+)Not\s+(?!(?:only|just|sure|certain|clear|necessarily|really|today|tomorrow)\b)[^.!?,\n]+,\s*it(?:'|’)s\s+[^.!?,\n]+/.test(sectionText)) {
      const spans = loadedFamilies.filter((f) => f.name !== "closer").flatMap((f) => spansForFamily(f, sectionText, protectedContent, start)).sort((a, b) => a.start - b.start);
      const crossFamilyTier = 3;
      const syntheticFamily = {
        name: "cross-family",
        packId: "voice-cadence",
        tier: crossFamilyTier,
        gating: "cluster",
        severity: "medium",
        basis: "cluster",
        patterns: [],
        thresholds: { cluster_min: 2 }
      };
      findings.push(finding("anti-style-cluster", "medium", "Cross-family anti-style cluster", spans, "cluster", input, undefined, preservationUncertainty, syntheticFamily, card, candidateWords));
    }
  }
  const progressRegex = /\b(?:I|we)\s+(?:changed|updated|implemented|modified|added|removed|ran|verified|checked)\b[^.!?\n]*[.!?]?/gi;
  const progress = unprotectedSpans(input.candidate, progressRegex, protectedContent);
  const paragraphs = [...input.candidate.matchAll(/(?:^|\n\s*\n)([\s\S]*?)(?=\n\s*\n|$)/g)];
  const resultBefore = (end) => /\b(?:result|outcome|current state|now|verified|passed|ready)\s*:/i.test(input.candidate.slice(0, end)) || /\b(?:the result|the outcome|the current state)\b/i.test(input.candidate.slice(0, end));
  for (const paragraph of paragraphs) {
    const start = paragraph.index + paragraph[0].length - paragraph[1].length;
    const text = masked(paragraph[1], protectedContent.map((span) => ({ start: span.start - start, end: span.end - start }))).trim();
    const paragraphProgress = progress.filter((s) => s.start >= start && s.end <= start + paragraph[1].length);
    const onlyProgress = paragraphProgress.length > 0 && text.replace(progressRegex, "").replace(/[\s.!?]+/g, "") === "";
    if (onlyProgress && resultBefore(start)) {
      findings.push(finding("progress-narration", "medium", "Repeated progress narration in status context", paragraphProgress, "strong-evidence", input, undefined, preservationUncertainty));
    }
  }
  for (let i = 1;i < paragraphs.length; i++) {
    const previous = paragraphs[i - 1];
    const current = paragraphs[i];
    const previousStart = previous.index + previous[0].length - previous[1].length;
    const currentStart = current.index + current[0].length - current[1].length;
    const previousText = masked(previous[1], protectedContent.map((span) => ({ start: span.start - previousStart, end: span.end - previousStart }))).trim();
    const currentText = masked(current[1], protectedContent.map((span) => ({ start: span.start - currentStart, end: span.end - currentStart }))).trim();
    if (previousText && currentText && same(previousText, currentText) && !/```|^\s*(?:[$>]|(?:npm|bun|pnpm|yarn|git|cargo|python|curl)\s)/im.test(previous[1] + `
` + current[1])) {
      const previousSpan = { start: previousStart, end: previousStart + previous[1].length };
      const currentSpan = { start: currentStart, end: currentStart + current[1].length };
      findings.push(finding("response-length", "high", `Consecutive repeated paragraph: ${currentText}`, [previousSpan, currentSpan], "strong-evidence", input, undefined, preservationUncertainty));
    }
  }
  const words = candidateWords;
  const baseline = input.taskContext?.baselineTokens ?? null;
  const ratio = baseline && baseline > 0 ? words / baseline : null;
  const repeated = sentences.filter((s, i) => i > 0 && same(sentences[i - 1].text, s.text)).length;
  if (ratio !== null && ratio > 1 && repeated === 0 && familyEvidence.length >= 2)
    findings.push(finding("response-length", ratio >= 1.5 ? "medium" : "low", "Unnecessary material exceeds the matched contract baseline", [{ start: 0, end: input.candidate.length }], "repeated-signal", input, undefined, preservationUncertainty));
  const long = sentences.filter((s) => s.text.split(/\s+/).length > 40);
  if (long.length >= 2)
    findings.push(finding("readability", "low", "Multiple overloaded sentences", long.map((x) => x.span), "cluster", input, undefined, preservationUncertainty, undefined, card, words));
  const required2 = input.taskContext?.requiredPhrases ?? [];
  const retainedRequired = required2.filter((phrase) => input.candidate.includes(phrase)).length;
  const preserved = required2.length ? retainedRequired / required2.length : 1;
  for (const phrase of required2.filter((phrase2) => !input.candidate.includes(phrase2)))
    findings.push(finding("response-length", "none", `Missing required phrase: ${phrase}`, [], "strong-evidence", input, "required content is missing", { codes: ["preservation"], message: "A required phrase is absent from the candidate.", spans: [] }));
  if (invalidProtected.length)
    findings.push(finding("response-length", "none", "Invalid caller-provided protected span", invalidProtected, "strong-evidence", input, "protected span could not be validated", { codes: ["preservation"], message: "Caller-provided protected content has an invalid span.", spans: invalidProtected }));
  findings.sort((a, b) => (a.spans[0]?.start ?? 0) - (b.spans[0]?.start ?? 0) || a.axis.localeCompare(b.axis) || rank(b.severity) - rank(a.severity));
  const actionable = input.enabled && findings.some((f) => !f.suppressed && rank(f.severity) >= 2 && !f.uncertainty.codes.length);
  const aggregateSeverity = input.enabled ? findings.reduce((max, f) => !f.suppressed && !f.uncertainty.codes.length && rank(f.severity) >= 2 && rank(f.severity) > rank(max) ? f.severity : max, "none") : "none";
  const allProtected = input.candidate.trim().length > 0 && Array.from({ length: input.candidate.length }, (_, index) => index).every((index) => /\s/.test(input.candidate[index]) || protectedContent.some((span) => index >= span.start && index < span.end));
  const ste = countSteViolations(input.candidate, input.mode, steThresholds);
  const steLength = {
    value: ste.violationsPer100w,
    violations: ste.violations,
    violationsPer100w: ste.violationsPer100w,
    applicable: ste.applicable,
    unit: "violations-per-100w",
    baseline: null,
    basis: ste.applicable ? `STE soft length: ${steThresholds.instruction}-word instruction / ${steThresholds.descriptive}-word descriptive guidance counted as violations per 100 words (metric only, no gate)` : "STE soft length inert for non-tool-heavy outputs",
    provenance: "proxy"
  };
  const result = {
    input: { attemptID: input.attemptID, cardId, outputClass: input.outputClass, mode: input.mode, enabled: input.enabled, reinforced: input.reinforced },
    findings,
    aggregate: { severity: aggregateSeverity, actionable, reinforcementEligible: actionable && !input.reinforced && findings.every((f) => f.uncertainty.codes.length === 0) },
    metrics: { concision: { value: ratio === null ? 0 : Math.max(0, 1 - ratio), unit: "ratio", baseline, basis: ratio === null ? "no matched baseline" : "candidate token count versus matched baseline" }, readability: { value: sentences.length ? Math.max(0, 1 - long.length / sentences.length) : 1, unit: "score-0-to-1", baseline: null, basis: "sentence-length distribution" }, correctness: { value: preserved, unit: "score-0-to-1", baseline: null, basis: "no rewrite; protected and required content retained" }, preservation: { value: preserved, unit: "score-0-to-1", baseline: null, basis: protectedContent.length ? "protected spans detected and excluded or discounted" : "no protected spans detected" }, steLength },
    protectedContent: { spans: protectedContent, treatment: { mode: allProtected ? "excluded" : protectedContent.length ? "discounted" : "none", reason: allProtected ? "candidate consists of protected content" : protectedContent.length ? "protected content is excluded from style evidence while surrounding material remains analyzable" : "no protected spans detected" } },
    uncertainty: [],
    state: { attemptID: input.attemptID, enabled: input.enabled, reinforced: input.reinforced }
  };
  result.uncertainty = [...findings.flatMap((f) => f.uncertainty), ...preservationUncertainty.codes.length ? [preservationUncertainty] : []].filter((u, i, all) => i === all.findIndex((x) => JSON.stringify(x) === JSON.stringify(u)));
  return result;
}

// src/style-reinforcement.ts
init_config();

// src/fit.ts
var REROUTE_NOT_RETRY = "REROUTE-NOT-RETRY";
var LANE_REJECTION_PATTERNS = [
  /not (my|the) lane/i,
  /out of (my|the) lane/i,
  /wrong (seat|specialist|agent)/i,
  /not the right (seat|specialist|agent)/i,
  /not (a|my) (review|implementation|research|coding|writing) (task|job|role)/i,
  /this (isn'?t|is not) (my|the|a) lane/i
];
function detectLaneRejection(output) {
  return LANE_REJECTION_PATTERNS.some((pattern) => pattern.test(output));
}
function rerouteSignal(seat) {
  const target = seat ? ` for ${seat}` : "";
  return [
    `## ${REROUTE_NOT_RETRY}`,
    `The delegated specialist${target} rejected this task as out of its lane.`,
    "Do NOT retry the same seat — reroute to the correct lane per the lane-card, or re-decompose."
  ].join(`
`);
}
var HEAVY_TRIGGERS = [
  ["ambiguity", "ambiguity"],
  ["missingLocationOrOldValue", "missing location or old value"],
  ["multipleInterpretationsOrFiles", "multiple interpretations or files"],
  ["failedVerification", "failed verification"],
  ["unexpectedDiff", "unexpected diff"],
  ["userVisible", "user-visible impact"],
  ["highBlastRadius", "high blast radius"],
  ["irreversible", "irreversible impact"],
  ["apiSchemaAuthDependencyMigrationSecurityOrDeploymentImpact", "API/schema/auth/dependency/migration/security/deployment impact"],
  ["greenfieldOrUnfamiliar", "greenfield or unfamiliar work"],
  ["agentEscalation", "agent escalation"]
];
function classifyRouting(input) {
  const reasons = HEAVY_TRIGGERS.filter(([key]) => input[key] === true).map(([, reason]) => reason);
  if (reasons.length > 0)
    return { route: "heavy", tiny: false, reasons };
  const tinyRequirements = [
    [input.boundedTouchSet === true && isBoundedTouchSet(input.touchSet), "bounded touch set"],
    [typeof input.transformation === "string" && input.transformation.trim().length > 0, "explicit transformation"],
    [input.reversible === true, "reversible change"],
    [input.deterministicVerification === true, "deterministic verification"]
  ];
  const missing = tinyRequirements.filter(([present]) => !present).map(([, reason]) => reason);
  if (missing.length === 0)
    return { route: "tiny", tiny: true, reasons: [] };
  return { route: "standard", tiny: false, reasons: missing };
}
function isBoundedTouchSet(touchSet) {
  return touchSet !== undefined && touchSet.length === 1 && touchSet.every((file2) => file2.trim().length > 0);
}

class TaskFitController {
  normalize(input, output) {
    if (input.tool !== "task")
      return false;
    if (output.output.includes(REROUTE_NOT_RETRY))
      return false;
    if (!detectLaneRejection(output.output))
      return false;
    const seat = input.args?.subagent_type;
    output.output = `${output.output.trimEnd()}

${rerouteSignal(seat)}`;
    return true;
  }
}

// src/delegation.ts
init_def_snapshot();
var DELEGATION_STYLES = ["default", "prose", "conversational"];
function isDelegationStyle(value) {
  return typeof value === "string" && DELEGATION_STYLES.includes(value);
}
function delegationStyleToVoiceCardId(style) {
  if (style === "prose")
    return "tgo-prose";
  if (style === "conversational")
    return "tgo-conversational";
  return "tgo-default";
}
var ROUTES = ["tiny", "standard", "heavy"];
var FULL_FIELDS = ["Objective", "Files", "Interfaces", "Constraints", "Verification"];
var MINIMAL_FIELDS = ["Objective", "Files", "Verification"];
var LIFECYCLE_FIELDS = ["issueId", "issueStatusObserved", "issueAssigneeObserved", "claimExitCode", "delegationId", "beadsOperator"];
function presentText(value) {
  return typeof value === "string" && value.trim().length > 0;
}
function presentFiles(value) {
  return Array.isArray(value) && value.length > 0 && value.every((file2) => presentText(file2));
}
function fieldValid(field, value) {
  if (field === "Files")
    return presentFiles(value);
  return presentText(value);
}
function verifyClaimObserved(packet) {
  return packet.issueStatusObserved === "in_progress" && typeof packet.issueAssigneeObserved === "string" && packet.issueAssigneeObserved.trim().length > 0 && packet.claimExitCode === 0;
}
function validateDelegationPacket(routing, packet, routedTouchSet) {
  const candidate = routing && typeof routing === "object" ? routing : {};
  const route = candidate.route;
  const value = packet && typeof packet === "object" ? packet : {};
  const routeValid = ROUTES.includes(route);
  const tinyConsistent = typeof candidate.tiny === "boolean" && candidate.tiny === (route === "tiny");
  const fields = route === "tiny" ? MINIMAL_FIELDS : FULL_FIELDS;
  const missing = fields.filter((field) => !(field in value));
  const malformed = fields.filter((field) => (field in value) && !fieldValid(field, value[field]));
  const diagnostics = [];
  if (!routeValid)
    diagnostics.push("route must be exactly tiny, standard, or heavy.");
  if (routeValid && !tinyConsistent)
    diagnostics.push("tiny must be true only for route tiny and false otherwise.");
  if (missing.length > 0)
    diagnostics.push(`Add required field(s): ${missing.join(", ")}.`);
  if (malformed.includes("Files"))
    diagnostics.push("Files must be a non-empty array of named, non-empty paths.");
  for (const field of malformed.filter((name) => name !== "Files")) {
    diagnostics.push(`${field} must be a non-empty structured text field.`);
  }
  if (typeof value.exitGate !== "boolean") {
    if ("exitGate" in value)
      malformed.push("exitGate");
    else
      missing.push("exitGate");
    diagnostics.push("Add exitGate as an explicit boolean; prose claims of success do not count.");
  } else if (value.exitGate !== true) {
    diagnostics.push("Set exitGate to true only when the deterministic verification checks pass.");
  }
  if (route === "tiny" && value.minimal !== true) {
    if ("minimal" in value)
      malformed.push("minimal");
    diagnostics.push("Tiny packets must declare minimal: true to use the proportional minimal path.");
  }
  if (route !== "tiny") {
    for (const field of LIFECYCLE_FIELDS) {
      if (!(field in value)) {
        missing.push(field);
        diagnostics.push(`Add required Beads lifecycle field: ${field}.`);
      } else if (field === "issueStatusObserved") {
        if (value[field] !== "in_progress") {
          malformed.push(field);
          diagnostics.push(`issueStatusObserved must be "in_progress" (observed claim status); got ${JSON.stringify(value[field])}.`);
        }
      } else if (field === "issueAssigneeObserved") {
        if (!presentText(value[field])) {
          malformed.push(field);
          diagnostics.push("issueAssigneeObserved must be a non-empty assignee from observed claim.");
        }
      } else if (field === "claimExitCode") {
        if (value[field] !== 0) {
          malformed.push(field);
          diagnostics.push(`claimExitCode must be 0 (observed claim exit code); got ${JSON.stringify(value[field])}.`);
        }
      } else if (field === "beadsOperator") {
        if (value[field] !== "Bernstein") {
          malformed.push(field);
          diagnostics.push("beadsOperator must be Bernstein; specialists cannot operate Beads.");
        }
      } else if (!presentText(value[field])) {
        malformed.push(field);
        diagnostics.push(`${field} must be non-empty linkage metadata.`);
      }
    }
    if ("issueClaimed" in value && !verifyClaimObserved(value)) {
      diagnostics.push("issueClaimed is forgeable asserted metadata; observed claim fields (issueStatusObserved, issueAssigneeObserved, claimExitCode) are required and must reflect live bd state.");
      if (!malformed.includes("issueStatusObserved") && !missing.includes("issueStatusObserved")) {}
    }
  }
  if ("issueId" in value && typeof value.issueId === "string") {
    const id = value.issueId.trim();
    if (id.length > 0 && !isValidBeadID(id)) {
      if (!malformed.includes("issueId"))
        malformed.push("issueId");
      diagnostics.push(`issueId must match VALID_BEAD_ID ${VALID_BEAD_ID.source} — got ${JSON.stringify(value.issueId)}.`);
    }
  }
  if ("taskId" in value) {
    const taskId = value.taskId;
    if (typeof taskId !== "string" || taskId.trim().length === 0 || !/^ses_[A-Za-z0-9]+$/.test(taskId.trim())) {
      malformed.push("taskId");
      diagnostics.push("taskId must be a session identifier matching ses_<alphanumeric>.");
    }
  }
  if ("progressPath" in value) {
    const progressPath2 = value.progressPath;
    if (typeof progressPath2 !== "string" || progressPath2.trim().length === 0 || !/^\.tgo\/[A-Za-z0-9][A-Za-z0-9._-]*\/progress\.md$/.test(progressPath2.trim())) {
      malformed.push("progressPath");
      diagnostics.push("progressPath must match .tgo/<issueId>/progress.md where <issueId> matches [A-Za-z0-9][A-Za-z0-9._-]*");
    }
  }
  if ("useLatestDefinitions" in value) {
    const v = value.useLatestDefinitions;
    if (typeof v !== "boolean") {
      malformed.push("useLatestDefinitions");
      diagnostics.push("useLatestDefinitions must be a boolean when present (default false = pinned).");
    }
  }
  if ("lane" in value) {
    const lane = value.lane;
    if (lane !== "worktree" && lane !== "inline") {
      malformed.push("lane");
      diagnostics.push('lane must be "worktree" | "inline" when present (default inline).');
    }
  }
  if ("style" in value) {
    const style = value.style;
    if (typeof style !== "string" || !DELEGATION_STYLES.includes(style)) {
      malformed.push("style");
      diagnostics.push(`style must be one of ${DELEGATION_STYLES.join(", ")} when present — got ${JSON.stringify(style)}.`);
    }
  }
  if ("styleSource" in value) {
    const src = value.styleSource;
    if (src !== "explicit" && src !== "packet") {
      malformed.push("styleSource");
      diagnostics.push(`styleSource must be "explicit" | "packet" when present — got ${JSON.stringify(src)}.`);
    }
  }
  if (routedTouchSet !== undefined && "Files" in value && Array.isArray(value.Files)) {
    const allowed = new Set(routedTouchSet ?? []);
    const outside = value.Files.filter((file2) => typeof file2 === "string" && !allowed.has(file2));
    if (outside.length > 0) {
      diagnostics.push("Files must be contained in the routed named touch set.");
      malformed.push("Files");
    }
  }
  return {
    route,
    valid: routeValid && tinyConsistent && missing.length === 0 && malformed.length === 0 && value.exitGate === true && (route !== "tiny" || value.minimal === true),
    missing,
    malformed,
    diagnostics
  };
}
function validateDelegationBoundary(args) {
  if (!args || typeof args !== "object")
    return;
  const value = args;
  if (!("delegationPacket" in value))
    return;
  const routing = classifyRouting(value);
  return validateDelegationPacket(routing, value.delegationPacket, value.touchSet);
}

// src/style-reinforcement.ts
function buildFindingsNudge(findings) {
  const header = "Style pass — fix only the flagged spans; preserve all protected content.";
  const footer = "Override a flag with a one-word reason if it serves rhythm/emphasis/picture/idiom/joke — otherwise apply the fix.";
  if (!findings || findings.length === 0) {
    return `${header}
${footer}`;
  }
  const sorted = [...findings].sort((a, b) => {
    const aStart = a.spans[0]?.start ?? Number.MAX_SAFE_INTEGER;
    const bStart = b.spans[0]?.start ?? Number.MAX_SAFE_INTEGER;
    if (aStart !== bStart)
      return aStart - bStart;
    const axisCmp = a.axis.localeCompare(b.axis);
    if (axisCmp !== 0)
      return axisCmp;
    const rank2 = (s) => ["none", "low", "medium", "high"].indexOf(s);
    return rank2(b.severity) - rank2(a.severity);
  });
  const lines = [];
  lines.push(header);
  for (const f of sorted) {
    const rawFamily = f.family;
    let family;
    if (rawFamily) {
      family = rawFamily;
    } else {
      const m = f.evidence.match(/^(.+?) tell cluster$/);
      if (m)
        family = m[1];
      else if (f.evidence === "Chatbot closer after the answer is complete")
        family = "closer";
      else if (f.evidence === "Cross-family anti-style cluster")
        family = "cross-family";
      else
        family = f.axis;
    }
    const severity = f.severity;
    const basis = f.basis;
    const evidence = f.evidence.replace(/'/g, "\\'");
    lines.push(`- [${family}] (severity ${severity}, basis ${basis}): evidence '${evidence}'`);
    const spansStr = f.spans.map((s) => `${s.start}:${s.end}`).join(", ");
    lines.push(`  spans: [${spansStr}] — rewrite only these spans; keep code/commands/negations/numbers/explanations verbatim.`);
  }
  lines.push(footer);
  return lines.join(`
`);
}
function detectExplicitStyle(text) {
  const patterns = [
    { re: /\bnormal\s+mode\b/gi, value: "clear" },
    { re: /\buse\s+default\b/gi, value: "clear" },
    { re: /\bin\s+default(?:\s+voice)?\b/gi, value: "clear" },
    { re: /\bdefault\s+voice\b/gi, value: "clear" },
    { re: /\buse\s+prose\b/gi, value: "tgo-prose" },
    { re: /\bin\s+prose(?:\s+voice)?\b/gi, value: "tgo-prose" },
    { re: /\bprose\s+voice\b/gi, value: "tgo-prose" },
    { re: /\bswitch\s+to\s+prose\b/gi, value: "tgo-prose" },
    { re: /\bwrite\b[^.!?\n]*\bin\s+prose\b/gi, value: "tgo-prose" },
    { re: /\buse\s+conversational\b/gi, value: "tgo-conversational" },
    { re: /\bin\s+conversational(?:\s+voice)?\b/gi, value: "tgo-conversational" },
    { re: /\bconversational\s+voice\b/gi, value: "tgo-conversational" },
    { re: /\bswitch\s+to\s+conversational\b/gi, value: "tgo-conversational" },
    { re: /\bwrite\b[^.!?\n]*\bin\s+conversational\b/gi, value: "tgo-conversational" }
  ];
  let lastIdx = -1;
  let lastVal = null;
  for (const { re, value } of patterns) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      const idx = m.index;
      if (idx >= lastIdx) {
        lastIdx = idx;
        lastVal = value;
      }
    }
  }
  return lastVal;
}
class StyleReinforcementController {
  sessions = new Map;
  cardId;
  enabled;
  productionEnabled;
  primaryCache = new Map;
  log;
  constructor(opts) {
    this.enabled = opts.enabled ?? true;
    this.productionEnabled = opts.productionEnabled ?? false;
    const legacy = opts.register;
    if (opts.cardId)
      this.cardId = opts.cardId;
    else if (typeof legacy === "string" && (legacy === "prose" || legacy === "conversational"))
      this.cardId = legacy === "prose" ? "tgo-prose" : "tgo-conversational";
    else if (typeof legacy === "string" && legacy === "natural")
      this.cardId = "tgo-default";
    else
      this.cardId = "tgo-default";
    this.log = opts.log;
  }
  state(sessionID) {
    let state = this.sessions.get(sessionID);
    if (!state) {
      state = { reinforced: false, disabled: false, pending: null };
      this.sessions.set(sessionID, state);
    }
    return state;
  }
  noteUserMessage(sessionID, text, responseLineageID, taskContext) {
    const state = this.state(sessionID);
    if (/\b(?:stop\s+\w+|normal\s+mode)\b/i.test(text))
      state.disabled = true;
    const explicit = detectExplicitStyle(text);
    if (explicit === "clear") {
      state.styleOverride = undefined;
    } else if (explicit) {
      state.styleOverride = explicit;
    }
    if (responseLineageID && state.responseLineageID === responseLineageID)
      return;
    if (state.attemptID || state.pending || state.reinforced) {
      state.attemptID = undefined;
      state.reinforced = false;
      state.pending = null;
    }
    state.responseLineageID = responseLineageID;
    state.taskContext = taskContext;
  }
  getStyleOverride(sessionID) {
    return this.state(sessionID).styleOverride;
  }
  getEffectiveStyle(sessionID, packetStyle) {
    const state = this.state(sessionID);
    if (state.styleOverride)
      return state.styleOverride;
    if (typeof packetStyle === "string" && DELEGATION_STYLES.includes(packetStyle)) {
      return delegationStyleToVoiceCardId(packetStyle);
    }
    return this.cardId;
  }
  async isPrimary(client, sessionID) {
    const cached2 = this.primaryCache.get(sessionID);
    if (cached2 !== undefined)
      return cached2;
    const result = await client.session.get({ path: { id: sessionID } }).catch((err) => {
      const msg = "tgo: style-reinforcement isPrimary session.get failed";
      if (this.log)
        safeWarn(this.log, msg, { sessionID, error: String(err) });
      else
        console.warn(`${msg}: ${String(err)}`, { sessionID });
      return;
    });
    const data = result?.data;
    const primary = Boolean(data && Object.prototype.hasOwnProperty.call(data, "parentID") && data.parentID === null);
    this.primaryCache.set(sessionID, primary);
    return primary;
  }
  async noteCompletion(client, input) {
    const { sessionID, messageID, candidate, outputClass = "technical-steps-code", mode = "chat" } = input;
    const state = this.state(sessionID);
    if (!this.productionEnabled || !this.enabled || state.disabled || state.reinforced || state.pending || !await this.isPrimary(client, sessionID))
      return false;
    const lineage = input.responseLineageID ?? state.responseLineageID;
    if (!lineage)
      return false;
    state.attemptID ??= `${sessionID}:${lineage}`;
    if (state.responseLineageID && state.responseLineageID !== lineage)
      return false;
    const context = input.taskContext ?? state.taskContext;
    if (!context || context.preservation !== "known")
      return false;
    const packetStyle = input.packetStyle;
    const cardId = this.getEffectiveStyle(sessionID, packetStyle) ?? this.cardId;
    const result = analyzeStyleDrift({ attemptID: state.attemptID, cardId, outputClass, mode, enabled: true, reinforced: false, candidate, taskContext: context });
    if (!result.aggregate.reinforcementEligible)
      return false;
    const actionable = result.findings.filter((f) => !f.suppressed && (f.severity === "medium" || f.severity === "high") && f.uncertainty.codes.length === 0);
    if (actionable.length === 0)
      return false;
    state.pending = { findings: actionable };
    return true;
  }
  async appendPending(client, sessionID, system) {
    const state = this.state(sessionID);
    if (!state.pending || state.reinforced || state.disabled || !this.enabled || !await this.isPrimary(client, sessionID))
      return false;
    const nudge = buildFindingsNudge(state.pending.findings);
    system.push(nudge);
    state.pending = null;
    state.reinforced = true;
    return true;
  }
  reset(sessionID) {
    if (sessionID) {
      this.sessions.delete(sessionID);
      this.primaryCache.delete(sessionID);
    } else {
      this.sessions.clear();
      this.primaryCache.clear();
    }
  }
}

// src/session.ts
class SessionReconciler {
  shim;
  busy = new Set;
  constructor(opts = {}) {
    this.shim = opts.shim ?? createShim();
  }
  get shimState() {
    return this.shim;
  }
  noteAgent(sessionID, agent) {
    this.shim.agents.set(sessionID, agent);
  }
  onStatus(sessionID, status) {
    if (status === "busy" || status === "retry") {
      this.busy.add(sessionID);
      this.markStreaming(sessionID);
    } else {
      this.busy.delete(sessionID);
      this.shim.streaming.delete(sessionID);
    }
  }
  onIdle(sessionID) {
    this.busy.delete(sessionID);
    this.shim.streaming.delete(sessionID);
  }
  onCompact(sessionID) {
    this.shim.agents.delete(sessionID);
    this.busy.delete(sessionID);
    this.shim.streaming.delete(sessionID);
  }
  isBusy(sessionID) {
    return this.busy.has(sessionID);
  }
  markStreaming(sessionID) {
    const target = this.shim.agents.get(sessionID) ?? "subagent";
    const existing = this.shim.streaming.get(sessionID);
    this.shim.streaming.set(sessionID, {
      target,
      startedAt: existing?.startedAt ?? Date.now()
    });
  }
}
function isPrimarySessionData(data) {
  return Boolean(data && typeof data === "object" && Object.prototype.hasOwnProperty.call(data, "parentID") && data.parentID === null);
}

// src/watchdog.ts
init_def_snapshot();
var WATCHDOG_ABORT_MARKER = "## WATCHDOG-ABORT";
function defaultWallNow() {
  return Date.now();
}
function defaultUptimeNow() {
  return Math.round(process.uptime() * 1000);
}
function toolSignature(tool, input) {
  const t = (tool ?? "").trim();
  let primary = "";
  if (input != null) {
    if (typeof input === "string") {
      primary = input;
    } else if (typeof input === "object") {
      const obj = input;
      const lower = t.toLowerCase();
      const isGrep = lower.includes("grep");
      const isRead = lower.includes("read") || lower === "read";
      const isGlob = lower.includes("glob");
      const isList = lower.includes("list");
      const isBash = lower.includes("bash");
      if (isGrep) {
        const pattern = obj.pattern ?? obj.query;
        const pathVal = obj.path ?? obj.filePath ?? obj.target;
        const patStr = pattern != null ? String(pattern).trim() : "";
        const pathStr = pathVal != null ? String(pathVal).trim() : "";
        if (patStr && pathStr)
          primary = `${patStr}:${pathStr}`;
        else if (patStr)
          primary = patStr;
        else if (pathStr)
          primary = pathStr;
        else {
          try {
            primary = JSON.stringify(input);
          } catch {
            primary = String(input);
          }
        }
      } else if (isRead || isGlob || isList) {
        const pathVal = obj.path ?? obj.filePath ?? obj.target;
        if (pathVal != null && String(pathVal).trim().length > 0) {
          primary = String(pathVal);
        } else {
          try {
            primary = JSON.stringify(input);
          } catch {
            primary = String(input);
          }
        }
      } else if (isBash) {
        const candidate = obj.command ?? obj.cmd ?? (typeof obj.input === "string" ? obj.input : undefined);
        if (candidate != null && String(candidate).trim().length > 0) {
          primary = String(candidate);
        } else {
          try {
            primary = JSON.stringify(input);
          } catch {
            primary = String(input);
          }
        }
      } else {
        try {
          primary = JSON.stringify(input);
        } catch {
          primary = String(input);
        }
      }
    } else {
      primary = String(input);
    }
  }
  const norm = primary.trim();
  if (norm) {
    const hash2 = hashString(norm);
    const prefix = norm.slice(0, 48);
    return `${t || "unknown"}:${prefix}:${hash2}`;
  }
  return t || "unknown";
}

class WatchdogController {
  sessions = new Map;
  timer;
  config;
  deps;
  sleepOffsetMs = 0;
  wallNow;
  uptimeNow;
  lastWallMs;
  lastUptimeMs;
  suspended = new Set;
  hydrationPending = false;
  hydrationPromise = null;
  constructor(config2, deps) {
    this.config = config2;
    this.deps = deps;
    this.wallNow = deps.wallNow ?? defaultWallNow;
    this.uptimeNow = deps.uptimeNow ?? defaultUptimeNow;
    this.lastWallMs = this.wallNow();
    this.lastUptimeMs = this.uptimeNow();
    if (config2.enabled) {
      this.timer = setInterval(() => {
        this.check();
      }, config2.checkMs);
    }
  }
  noteSessionCreated(info) {
    if (!info.id || !info.parentID)
      return;
    if (this.sessions.has(info.id))
      return;
    const now = this.awakeNow();
    this.sessions.set(info.id, {
      sessionID: info.id,
      parentID: info.parentID,
      busy: false,
      busySince: 0,
      lastActivity: now,
      aborted: false,
      notified: false,
      toolInFlight: 0,
      toolStartedAt: 0,
      backgroundInFlight: 0,
      lastProgress: now,
      stuckWindow: [],
      stuckWindowTimes: []
    });
  }
  noteStatus(sessionID, status) {
    const tracked = this.sessions.get(sessionID);
    if (!tracked)
      return;
    const now = this.awakeNow();
    if (status === "busy" || status === "retry") {
      tracked.busy = true;
      tracked.lastActivity = now;
      if (tracked.busySince === 0)
        tracked.busySince = now;
    } else {
      tracked.busy = false;
      tracked.lastActivity = now;
    }
  }
  onIdle(sessionID) {
    this.noteStatus(sessionID, "idle");
  }
  noteActivity(sessionID) {
    const tracked = this.sessions.get(sessionID);
    if (!tracked || tracked.aborted)
      return;
    tracked.lastActivity = this.awakeNow();
  }
  noteToolStart(sessionID, background = false, tool, input) {
    const tracked = this.sessions.get(sessionID);
    if (!tracked || tracked.aborted)
      return;
    let bg = false;
    let toolName = tool;
    let toolInput = input;
    if (typeof background === "string") {
      toolName = background;
      toolInput = tool;
      bg = false;
    } else {
      bg = background;
    }
    if (bg) {
      tracked.backgroundInFlight += 1;
    } else {
      tracked.toolInFlight += 1;
      if (tracked.toolInFlight === 1)
        tracked.toolStartedAt = this.awakeNow();
      const now = this.awakeNow();
      const lower = (toolName ?? "").toLowerCase();
      const isEditTool = lower === "edit" || lower === "write" || lower === "multiedit";
      if (isEditTool) {
        tracked.stuckWindow = [];
        tracked.stuckWindowTimes = [];
        tracked.lastProgress = now;
      } else {
        const sig = toolSignature(toolName ?? "unknown", toolInput);
        tracked.stuckWindow.push(sig);
        tracked.stuckWindowTimes.push(now);
        const max = this.config.stuckLoopTools;
        while (tracked.stuckWindow.length > max) {
          tracked.stuckWindow.shift();
          tracked.stuckWindowTimes.shift();
        }
      }
    }
    tracked.lastActivity = this.awakeNow();
  }
  noteToolEnd(sessionID, background = false, _isProgress = false) {
    const tracked = this.sessions.get(sessionID);
    if (!tracked || tracked.aborted)
      return;
    const now = this.awakeNow();
    if (background) {
      if (tracked.backgroundInFlight > 0)
        tracked.backgroundInFlight -= 1;
    } else if (tracked.toolInFlight > 0) {
      tracked.toolInFlight -= 1;
      if (tracked.toolInFlight === 0)
        tracked.toolStartedAt = 0;
      tracked.lastProgress = now;
      if (_isProgress) {
        tracked.stuckWindow = [];
        tracked.stuckWindowTimes = [];
      }
    } else if (_isProgress) {
      tracked.stuckWindow = [];
      tracked.stuckWindowTimes = [];
      tracked.lastProgress = now;
    }
    tracked.lastActivity = now;
  }
  onCompact(sessionID) {
    this.sessions.delete(sessionID);
    this.suspended.delete(sessionID);
  }
  markSuspended(sessionID) {
    if (!sessionID)
      return;
    this.suspended.add(sessionID);
  }
  markResumed(sessionID) {
    if (!sessionID)
      return;
    this.suspended.delete(sessionID);
  }
  isSuspended(sessionID) {
    return this.suspended.has(sessionID);
  }
  setHydrationPending(pending) {
    this.hydrationPending = pending;
  }
  markHydrationDone() {
    this.hydrationPending = false;
  }
  hydrateSuspended(sessionIds) {
    for (const id of sessionIds) {
      if (id)
        this.suspended.add(id);
    }
  }
  async awaitHydration() {
    if (this.hydrationPromise)
      await this.hydrationPromise;
  }
  get size() {
    return this.sessions.size;
  }
  get tracked() {
    return [...this.sessions.values()].map((s) => ({
      sessionID: s.sessionID,
      parentID: s.parentID,
      busy: s.busy
    }));
  }
  getProblems(now) {
    const checkNow = now ?? this.awakeNow();
    const out = [];
    for (const tracked of this.sessions.values()) {
      if (tracked.aborted)
        continue;
      if (!tracked.busy)
        continue;
      const wallBaseline = Math.max(tracked.busySince, tracked.lastProgress);
      const wallElapsed = checkNow - wallBaseline;
      const idleElapsed = tracked.toolInFlight > 0 ? 0 : checkNow - tracked.lastActivity;
      const wallClockExempt = tracked.backgroundInFlight > 0 && tracked.toolInFlight === 0;
      const windowSize = tracked.stuckWindow.length;
      const distinct = new Set(tracked.stuckWindow).size;
      const windowElapsed = windowSize > 0 && tracked.stuckWindowTimes.length > 0 ? checkNow - tracked.stuckWindowTimes[0] : 0;
      const isStuckLoop = tracked.toolInFlight === 0 && windowSize >= this.config.stuckLoopTools && this.config.stuckLoopTools > 0 && distinct < 3 && windowElapsed >= this.config.stuckLoopMs;
      if (isStuckLoop) {
        out.push({ sessionID: tracked.sessionID, parentID: tracked.parentID, state: "stuck", reason: "stuck-loop" });
      } else if (!wallClockExempt && wallElapsed >= this.config.wallClockMs) {
        out.push({ sessionID: tracked.sessionID, parentID: tracked.parentID, state: "aborted", reason: "wall-clock" });
      } else if (idleElapsed >= this.config.idleMs) {
        out.push({ sessionID: tracked.sessionID, parentID: tracked.parentID, state: "idle", reason: "idle" });
      }
    }
    return out;
  }
  awakeNow() {
    this.tickSleepOffset();
    return this.wallNow() - this.sleepOffsetMs;
  }
  tickSleepOffset() {
    const wall = this.wallNow();
    const uptime = this.uptimeNow();
    const wallGap = wall - this.lastWallMs;
    const uptimeGap = uptime - this.lastUptimeMs;
    this.lastWallMs = wall;
    this.lastUptimeMs = uptime;
    if (wallGap <= 0)
      return;
    if (wallGap >= 5 * this.config.checkMs && uptimeGap < wallGap / 2) {
      const sleepMs = wallGap - uptimeGap;
      this.sleepOffsetMs += sleepMs;
      this.deps.log("warn", `watchdog detected host sleep (${Math.round(sleepMs / 1000)}s); excluded from delegate clocks`, {
        sleepMs,
        wallGap,
        uptimeGap
      });
    }
  }
  async check() {
    if (this.hydrationPending) {
      return;
    }
    const now = this.awakeNow();
    for (const tracked of this.sessions.values()) {
      if (tracked.aborted)
        continue;
      if (!tracked.busy)
        continue;
      if (this.suspended.has(tracked.sessionID))
        continue;
      const now2 = this.awakeNow();
      const wallBaseline = Math.max(tracked.busySince, tracked.lastProgress);
      const wallElapsed = now2 - wallBaseline;
      const wallClockExempt = tracked.backgroundInFlight > 0 && tracked.toolInFlight === 0;
      const idleElapsed = tracked.toolInFlight > 0 ? 0 : now2 - tracked.lastActivity;
      const windowSize = tracked.stuckWindow.length;
      const distinct = new Set(tracked.stuckWindow).size;
      const windowElapsed = windowSize > 0 && tracked.stuckWindowTimes.length > 0 ? now2 - tracked.stuckWindowTimes[0] : 0;
      const isStuckLoop = tracked.toolInFlight === 0 && windowSize >= this.config.stuckLoopTools && this.config.stuckLoopTools > 0 && distinct < 3 && windowElapsed >= this.config.stuckLoopMs;
      if (isStuckLoop) {
        await this.abort(tracked, "stuck-loop", windowElapsed);
      } else if (!wallClockExempt && wallElapsed >= this.config.wallClockMs) {
        await this.abort(tracked, "wall-clock", wallElapsed);
      } else if (idleElapsed >= this.config.idleMs) {
        await this.abort(tracked, "idle", idleElapsed);
      }
    }
  }
  dispose() {
    if (this.timer)
      clearInterval(this.timer);
  }
  async abort(tracked, reason, elapsedMs) {
    tracked.aborted = true;
    tracked.busy = false;
    const signal = {
      sessionID: tracked.sessionID,
      parentID: tracked.parentID,
      reason,
      elapsedMs
    };
    this.deps.log("warn", `watchdog aborting delegated session ${tracked.sessionID}`, {
      reason,
      elapsedMs,
      parentID: tracked.parentID ?? null
    });
    try {
      await this.deps.abort(tracked.sessionID, reason);
    } catch (error51) {
      this.deps.log("error", `watchdog abort call failed for ${tracked.sessionID}`, {
        error: String(error51)
      });
    }
    if (tracked.parentID && !tracked.notified) {
      tracked.notified = true;
      const detail = reason === "stuck-loop" ? `was stuck in a loop (${tracked.stuckWindow.length} tools, ${Math.round(elapsedMs / 1000)}s window, ${new Set(tracked.stuckWindow).size} distinct signatures)` : reason === "idle" ? `stopped producing output (idle ${Math.round(elapsedMs / 1000)}s)` : `exceeded the wall-clock cap (wall ${Math.round(elapsedMs / 1000)}s)`;
      try {
        await this.deps.notifyParent(tracked.parentID, `${WATCHDOG_ABORT_MARKER}
Delegated session ${tracked.sessionID} was aborted by the TGO watchdog (${reason}, ${Math.round(elapsedMs / 1000)}s). It ${detail}. Verify what landed, then re-dispatch it smaller or re-decompose per the lane-card — do not trust the empty result.`);
      } catch (error51) {
        this.deps.log("error", `watchdog parent notify failed for ${tracked.sessionID}`, {
          error: String(error51)
        });
      }
    }
    this.sessions.delete(tracked.sessionID);
  }
}
var DEFAULT_RUN_HEARTBEAT_THRESHOLD_MS = 5 * 60 * 1000;

// src/report.ts
var REPORT_STATUSES = ["complete", "partial", "blocked", "escalate"];
var TASK_STATUSES = ["complete", "bail", "failed", "tripwire"];
var FIELD_NAMES = ["STATUS", "CHANGES", "VERIFIED", "GAPS"];
var FIELD_RE = /(?:^|\n)\s*(?:#{1,6}\s*)?(STATUS|CHANGES|VERIFIED|GAPS|TASK_STATUS|RETRYABLE)\s*:\s*/gi;
function hasFailure(text) {
  const withoutNegatedSuccess = text.replace(/\bno\s+(?:failures?|errors?)\b/gi, "").replace(/\bdid\s+not\s+fail(?:ed|ure|ing)?\b/gi, "");
  return /\b(?:fail(?:ed|ure)?|failing|error|not run|unverified|unknown|did not pass)\b/i.test(withoutNegatedSuccess);
}
function statusTextToTaskStatus(text) {
  if (!text)
    return;
  const lower = text.trim().toLowerCase();
  const asTaxonomy = TASK_STATUSES.find((c) => lower === c);
  if (asTaxonomy)
    return asTaxonomy;
  const asLegacy = REPORT_STATUSES.find((c) => lower === c);
  if (asLegacy) {
    if (asLegacy === "complete")
      return "complete";
    if (asLegacy === "partial")
      return "failed";
    if (asLegacy === "blocked" || asLegacy === "escalate")
      return "tripwire";
  }
  return;
}
function parseTaskReport(raw) {
  const text = typeof raw === "string" ? raw : String(raw ?? "");
  const fields = {};
  const malformed = [];
  const matches = [...text.matchAll(FIELD_RE)];
  for (let i = 0;i < matches.length; i++) {
    const name = matches[i]?.[1]?.toUpperCase();
    const start = (matches[i]?.index ?? 0) + (matches[i]?.[0]?.length ?? 0);
    const value = text.slice(start, matches[i + 1]?.index ?? text.length).trim();
    if (fields[name] !== undefined)
      malformed.push(`${String(name)} (duplicate)`);
    else if (!value)
      malformed.push(String(name));
    else
      fields[name] = value;
  }
  const missing = FIELD_NAMES.filter((name) => fields[name] === undefined);
  const statusText = fields.STATUS?.trim().toLowerCase();
  const status = REPORT_STATUSES.find((candidate) => statusText === candidate);
  const statusIsTaxonomy = TASK_STATUSES.find((candidate) => statusText === candidate);
  if (fields.STATUS !== undefined && !status && !statusIsTaxonomy)
    malformed.push("STATUS");
  const taskStatusText = fields.TASK_STATUS?.trim().toLowerCase();
  const taskStatusFromField = taskStatusText ? TASK_STATUSES.find((c) => taskStatusText === c) : undefined;
  if (fields.TASK_STATUS !== undefined && !taskStatusFromField)
    malformed.push("TASK_STATUS");
  const retryableText = fields.RETRYABLE?.trim().toLowerCase();
  let retryableFromField;
  if (fields.RETRYABLE !== undefined) {
    if (["true", "yes", "1"].includes(retryableText ?? ""))
      retryableFromField = true;
    else if (["false", "no", "0"].includes(retryableText ?? ""))
      retryableFromField = false;
    else
      malformed.push("RETRYABLE");
  }
  const contradictions = [];
  if (status === "complete" && fields.VERIFIED && hasFailure(fields.VERIFIED)) {
    contradictions.push("STATUS complete conflicts with failed or unverified VERIFIED evidence");
  }
  if (status === "complete" && fields.GAPS && !/^\s*(?:none|n\/a|no gaps?)[.!]?\s*$/i.test(fields.GAPS)) {
    contradictions.push("STATUS complete conflicts with non-empty GAPS");
  }
  const exitGate = /exit\s*gate\s*:\s*true(?![\w-])/i.test(fields.VERIFIED ?? "");
  if (!exitGate) {
    malformed.push(/exit\s*gate/i.test(fields.VERIFIED ?? "") ? "VERIFIED exit-gate claim" : "VERIFIED exit-gate evidence");
  } else if (hasFailure(fields.VERIFIED ?? "")) {
    malformed.push("VERIFIED exit-gate claim");
  }
  let taskStatus;
  if (taskStatusFromField) {
    taskStatus = taskStatusFromField;
  } else if (statusIsTaxonomy) {
    taskStatus = statusIsTaxonomy;
  } else if (status) {
    if (status === "complete")
      taskStatus = "complete";
    else if (status === "partial")
      taskStatus = "failed";
    else if (status === "blocked" || status === "escalate")
      taskStatus = "tripwire";
    else
      taskStatus = "failed";
  } else {
    taskStatus = "failed";
  }
  if (fields.STATUS !== undefined && fields.TASK_STATUS !== undefined) {
    const impliedFromStatus = statusTextToTaskStatus(fields.STATUS);
    const impliedFromTask = taskStatusFromField;
    if (impliedFromStatus && impliedFromTask && impliedFromStatus !== impliedFromTask) {
      contradictions.push(`STATUS ${fields.STATUS} conflicts with TASK_STATUS ${fields.TASK_STATUS}`);
    }
  }
  if (taskStatus === "complete" && fields.VERIFIED && hasFailure(fields.VERIFIED)) {
    const msg = "TASK_STATUS complete conflicts with failed or unverified VERIFIED evidence";
    if (!contradictions.includes(msg) && !contradictions.some((c) => c.includes("STATUS complete conflicts"))) {
      contradictions.push(msg);
    }
  }
  if (taskStatus === "complete" && fields.GAPS && !/^\s*(?:none|n\/a|no gaps?)[.!]?\s*$/i.test(fields.GAPS)) {
    const msg = "TASK_STATUS complete conflicts with non-empty GAPS";
    if (!contradictions.includes(msg) && !contradictions.some((c) => c.includes("STATUS complete conflicts with non-empty GAPS"))) {
      contradictions.push(msg);
    }
  }
  let retryable;
  if (retryableFromField !== undefined) {
    retryable = retryableFromField;
  } else {
    if (taskStatus === "failed")
      retryable = true;
    else if (taskStatus === "complete")
      retryable = false;
    else
      retryable = false;
  }
  let taxonomy;
  switch (taskStatus) {
    case "complete":
      taxonomy = { status: "complete", retryable };
      break;
    case "bail":
      taxonomy = { status: "bail", retryable };
      break;
    case "failed":
      taxonomy = { status: "failed", retryable };
      break;
    case "tripwire":
      taxonomy = { status: "tripwire", retryable };
      break;
  }
  const watchdogAborted = /watchdog.{0,40}abort/i.test(text);
  const valid = !watchdogAborted && missing.length === 0 && malformed.length === 0 && contradictions.length === 0;
  let recovery = "retry";
  if (watchdogAborted)
    recovery = "reroute";
  else if (contradictions.length > 0)
    recovery = "escalate";
  else if (taxonomy.status === "bail")
    recovery = "abandon";
  else if (taxonomy.status === "tripwire")
    recovery = "fix-plan";
  else if (fields.GAPS && /clarif(?:y|ication)|ambiguous|unclear|need(?:s)? user/i.test(fields.GAPS))
    recovery = "user-clarification";
  else if (taxonomy.status === "failed")
    recovery = taxonomy.retryable ? "retry" : "escalate";
  else if (taxonomy.status === "complete")
    recovery = "retry";
  else {
    if (status === "blocked" || status === "escalate")
      recovery = "escalate";
  }
  return {
    valid,
    completionSafe: valid && taxonomy.status === "complete" && exitGate,
    exitGate,
    status,
    taxonomy,
    fields,
    raw: text,
    missing,
    malformed,
    contradictions,
    watchdogAborted,
    recovery
  };
}

// src/setup.ts
import * as fs15 from "node:fs/promises";
import * as path15 from "node:path";

// src/build.ts
init_config();
import * as fs14 from "node:fs/promises";
import * as path14 from "node:path";
import { fileURLToPath as fileURLToPath4 } from "node:url";
var packageRoot2 = path14.resolve(path14.dirname(fileURLToPath4(import.meta.url)), "..");
var HOUSE_STYLE_SLOT = "{{TGO_HOUSE_STYLE}}";
var AGENTS_MARKER_BEGIN = "<!-- TGO: thin always-on advice layer";
var AGENTS_MARKER_END = "<!-- END TGO advice layer -->";
var VOICE_CARDS = ["default", "prose", "conversational"];
async function loadVoiceCard3(cardId = "default") {
  const normalized = cardId.startsWith("tgo-") ? cardId : `tgo-${cardId}`;
  const file2 = path14.join(packageRoot2, "assets", "voices", `${normalized}.json`);
  const raw = JSON.parse(await fs14.readFile(file2, "utf-8"));
  return voiceCardSchema.parse(raw);
}
async function loadAgentsFragment() {
  const file2 = path14.join(packageRoot2, "assets", "AGENTS.fragment.md");
  return fs14.readFile(file2, "utf-8");
}
function foldHouseStyle(template, voiceCard) {
  if (!template.includes(HOUSE_STYLE_SLOT))
    return template;
  return template.replace(HOUSE_STYLE_SLOT, voiceCard.trim());
}
async function renderSeats(sourceDir, voiceCardId = "default") {
  const effectiveId = VOICE_CARDS.includes(voiceCardId) ? voiceCardId : "default";
  const card = await loadVoiceCard3(effectiveId);
  const fold = renderFold(card);
  const files = await fs14.readdir(sourceDir).catch((err) => {
    console.warn(`tgo: renderSeats readdir failed: ${String(err)}`, { sourceDir });
    return [];
  });
  const seats = [];
  for (const file2 of files) {
    if (!file2.endsWith(".md"))
      continue;
    const template = await fs14.readFile(path14.join(sourceDir, file2), "utf-8");
    const content = foldHouseStyle(template, fold);
    assertPromptUnderBudget(content, file2);
    seats.push({ fileName: file2, content });
  }
  return seats;
}
async function mergeAgentsFragment(configDir) {
  const fragment = await loadAgentsFragment();
  const dest = path14.join(configDir, "AGENTS.md");
  let existing = "";
  try {
    existing = await fs14.readFile(dest, "utf-8");
  } catch {}
  if (existing.includes(AGENTS_MARKER_BEGIN)) {
    return { action: "unchanged" };
  }
  const wrapped = `${fragment.trim()}
${AGENTS_MARKER_END}
`;
  const next = existing.trimEnd() ? `${existing.trimEnd()}

${wrapped}` : wrapped;
  await fs14.mkdir(configDir, { recursive: true });
  await fs14.writeFile(dest, next, "utf-8");
  return { action: existing ? "appended" : "created" };
}
if (false) {}

// src/setup.ts
class SetupController {
  run;
  hasBd;
  installBd;
  attempted = new Set;
  failureCounts = new Map;
  inflight = new Map;
  static MAX_SETUP_FAILURES = 3;
  constructor(opts) {
    this.run = opts.run;
    this.hasBd = opts.hasBd;
    this.installBd = opts.installBd;
  }
  async readAgents(directory) {
    try {
      return await fs15.readFile(path15.join(directory, "AGENTS.md"), "utf-8");
    } catch {
      return "";
    }
  }
  async missingSteps(directory) {
    const steps = [];
    try {
      await fs15.access(path15.join(directory, ".beads"));
    } catch {
      steps.push("bd init");
    }
    const agents = await this.readAgents(directory);
    const hasBeadsBlock = agents.includes("BEGIN BEADS INTEGRATION");
    if (!hasBeadsBlock)
      steps.push("bd setup opencode");
    const hasTgoFragment = agents.includes(AGENTS_MARKER_BEGIN) && agents.includes(AGENTS_MARKER_END);
    if (!hasTgoFragment)
      steps.push("AGENTS fragment");
    return steps;
  }
  async needsSetup(directory) {
    return (await this.missingSteps(directory)).length > 0;
  }
  async maybeSetup(directory) {
    if (!directory)
      return { action: "failed", error: "no directory" };
    if (this.attempted.has(directory))
      return { action: "already-set-up" };
    const failCount = this.failureCounts.get(directory) ?? 0;
    if (failCount >= SetupController.MAX_SETUP_FAILURES) {
      this.attempted.add(directory);
      return { action: "already-set-up" };
    }
    const existing = this.inflight.get(directory);
    if (existing)
      return existing;
    const promise2 = (async () => {
      let needs;
      try {
        needs = await this.needsSetup(directory);
      } catch (error51) {
        this.failureCounts.set(directory, failCount + 1);
        return { action: "failed", error: String(error51) };
      }
      if (!needs) {
        this.attempted.add(directory);
        this.failureCounts.delete(directory);
        return { action: "already-set-up" };
      }
      try {
        if (!await this.hasBd()) {
          if (this.installBd) {
            try {
              await this.installBd();
            } catch (error51) {
              this.failureCounts.set(directory, failCount + 1);
              return { action: "failed", error: `bd install failed: ${String(error51)}` };
            }
          }
          if (!await this.hasBd()) {
            this.attempted.add(directory);
            this.failureCounts.delete(directory);
            return { action: "no-bd" };
          }
        }
      } catch (error51) {
        this.failureCounts.set(directory, failCount + 1);
        return { action: "failed", error: String(error51) };
      }
      const steps = [];
      let missing;
      try {
        missing = await this.missingSteps(directory);
      } catch (error51) {
        this.failureCounts.set(directory, failCount + 1);
        return { action: "failed", error: String(error51) };
      }
      try {
        for (const step of missing) {
          if (step === "bd init" || step === "bd setup opencode") {
            const result = await this.run(step, directory);
            if (typeof result !== "string" && result.exitCode !== 0) {
              const detail = [result.stderr.trim(), result.stdout.trim()].filter(Boolean).join(`
`);
              throw new Error(`${step} exited ${result.exitCode}${detail ? `: ${detail}` : ""}`);
            }
          } else if (step === "AGENTS fragment") {
            await mergeAgentsFragment(directory);
          }
          steps.push(step);
        }
      } catch (error51) {
        this.failureCounts.set(directory, failCount + 1);
        return { action: "failed", error: String(error51) };
      }
      this.attempted.add(directory);
      this.failureCounts.delete(directory);
      return { action: "completed", steps };
    })().finally(() => this.inflight.delete(directory));
    this.inflight.set(directory, promise2);
    return promise2;
  }
}

// src/permissions.ts
import * as path16 from "node:path";
function resolveWorktreeFamily(...candidates) {
  for (const candidate of candidates) {
    if (!candidate)
      continue;
    const parent = path16.dirname(candidate);
    if (!parent || parent === "/" || parent === ".")
      continue;
    return candidate;
  }
  return;
}
function preapproveExternalDirectory(permission, worktree) {
  if (!worktree)
    return permission ?? {};
  const parent = path16.dirname(worktree);
  if (!parent || parent === "/" || parent === ".")
    return permission ?? {};
  const existingExternal = permission?.external_directory ?? {};
  return {
    ...permission ?? {},
    external_directory: {
      ...existingExternal,
      [`${parent}/*`]: "allow"
    }
  };
}

// src/deps.ts
var DEPENDENCIES = [
  {
    name: "beads",
    kind: "cli",
    summary: "work-unit store + job-board engine (bd CLI)",
    detect: (ctx) => ctx.hasBin("bd").then((bin) => bin !== null),
    install: [
      "curl -fsSL https://raw.githubusercontent.com/gastownhall/beads/main/scripts/install.sh | bash"
    ],
    url: "https://beads.gascity.com/"
  },
  {
    name: "AFT",
    kind: "plugin",
    summary: "symbol-aware code tools (aft_*) — full dependency",
    detect: async (ctx) => await ctx.hasBin("aft") !== null || (await ctx.readConfigText()).includes("@cortexkit/aft-opencode"),
    install: ["npx @cortexkit/aft@latest setup"],
    url: "https://github.com/cortexkit/aft"
  },
  {
    name: "magic-context",
    kind: "plugin",
    summary: "long-term memory + cross-session recall (ctx_*) — full dependency",
    detect: async (ctx) => await ctx.hasBin("magic-context") !== null || (await ctx.readConfigText()).includes("@cortexkit/opencode-magic-context"),
    install: [
      'echo "[tgo] magic-context: will register the plugin (server + TUI sidebar) + write historian config (historian.model from the active preset)."'
    ],
    url: "https://github.com/cortexkit/magic-context"
  },
  {
    name: "context7",
    kind: "mcp",
    summary: "docs lookup MCP (context7_*) — granted to Nas + Dylan",
    detect: async (ctx) => await ctx.hasBin("ctx7") !== null || (await ctx.readConfigText()).includes("context7"),
    install: [
      'echo "[tgo] context7: will register the hosted remote MCP server (server + no local OAuth)."'
    ],
    url: "https://mcp.context7.com/mcp"
  }
];
async function installMissing(statuses, run) {
  const installed = [];
  for (const status of statuses) {
    if (status.present)
      continue;
    for (const cmd of status.install) {
      await run(cmd);
    }
    installed.push(status.name);
  }
  return installed;
}
async function runShellCommand(cmd) {
  const proc = Bun.spawn(["/bin/sh", "-c", cmd], {
    stdout: "inherit",
    stderr: "inherit"
  });
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`dependency install command failed (exit ${code}): ${cmd}`);
  }
}

// src/presets.ts
init_config();
var PRESET_MEMORY_KEY = "tgo.preset";
var BD_MEMORIES_COMMAND = "bd memories --json";
var BAND_LENS_SEATS = ["cobain", "grohl", "novoselic"];
function agentName(seat) {
  return seat === "band-members" ? [...BAND_LENS_SEATS] : [seat];
}
function isPresetName(value) {
  return typeof value === "string" && PRESET_NAMES.includes(value);
}
function resolveActivePreset(config2, memories) {
  const nudged = memories[PRESET_MEMORY_KEY];
  if (isPresetName(nudged))
    return nudged;
  return config2.preset;
}
async function readPresetNudge(run, log) {
  const raw = await run(BD_MEMORIES_COMMAND).catch((err) => {
    const msg = "tgo: readPresetNudge bd memories failed";
    if (log)
      safeWarn(log, msg, { error: String(err) });
    else
      console.warn(`${msg}: ${String(err)}`);
    return "";
  });
  if (!raw)
    return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}
function applyPreset(config2, preset, presets) {
  if (!presets)
    return [];
  const seatMap = presets[preset];
  if (!seatMap)
    return [];
  const applied = [];
  for (const seat of SEATS) {
    const ref = seatMap[seat];
    if (!ref)
      continue;
    for (const name of agentName(seat)) {
      if (!config2.agent)
        config2.agent = {};
      const agent = config2.agent[name] ??= {};
      agent.model = ref.model;
      if (ref.variant)
        agent.variant = ref.variant;
      applied.push(name);
    }
  }
  return applied;
}
function resolveSeatModels(preset, presets) {
  const out = {};
  if (!presets)
    return out;
  const seatMap = presets[preset];
  if (!seatMap)
    return out;
  for (const seat of SEATS) {
    const ref = seatMap[seat];
    if (!ref || !ref.model)
      continue;
    for (const name of agentName(seat))
      out[name] = ref.model;
  }
  return out;
}

// src/plugin.ts
init_session_reuse();
init_def_snapshot();

// src/worktree-lane.ts
init_def_snapshot();
import * as fs16 from "node:fs/promises";
import * as fsSync from "node:fs";
import * as path17 from "node:path";
import * as os2 from "node:os";
function worktreeBranchForIssue(issueId) {
  assertValidBeadID(issueId);
  return `tgo/${issueId}-lane`;
}
function worktreePathForIssue(repoRoot, issueId) {
  assertValidBeadID(issueId);
  const resolved = path17.resolve(repoRoot);
  const parent = path17.dirname(resolved);
  if (!parent || parent === "/" || parent === "." || parent === resolved) {
    return path17.join(resolved, `${issueId}-lane`);
  }
  return path17.join(parent, `${issueId}-lane`);
}
function realpathTargetSafe(resolved) {
  try {
    return fsSync.realpathSync(resolved);
  } catch {}
  let cur = path17.dirname(resolved);
  const tail = [path17.basename(resolved)];
  for (let i = 0;i < 64; i++) {
    try {
      const real = fsSync.realpathSync(cur);
      return tail.length === 0 ? real : path17.join(real, ...tail);
    } catch {}
    const parent = path17.dirname(cur);
    if (parent === cur)
      return;
    tail.unshift(path17.basename(cur));
    cur = parent;
  }
  return;
}
function isPathInsideWorktree(targetPath, worktreePath, repoRoot) {
  if (!targetPath || !worktreePath)
    return false;
  const resolvedWorktree = path17.resolve(worktreePath);
  let resolvedTarget;
  if (path17.isAbsolute(targetPath)) {
    resolvedTarget = path17.resolve(targetPath);
  } else if (targetPath.startsWith("~/")) {
    const home = process.env.HOME ?? os2.homedir();
    resolvedTarget = path17.resolve(home, targetPath.slice(2));
  } else {
    const base = repoRoot ? path17.resolve(repoRoot) : resolvedWorktree;
    resolvedTarget = path17.resolve(base, targetPath);
  }
  if (resolvedTarget === resolvedWorktree)
    return true;
  const realWorktree = realpathTargetSafe(resolvedWorktree);
  if (!realWorktree)
    return false;
  const realTarget = realpathTargetSafe(resolvedTarget);
  if (!realTarget)
    return false;
  if (realTarget === realWorktree)
    return true;
  const prefix = realWorktree.endsWith(path17.sep) ? realWorktree : realWorktree + path17.sep;
  return realTarget.startsWith(prefix);
}
function extractAllFilePathsFromArgs(tool, args) {
  if (!args || typeof args !== "object")
    return [];
  const obj = args;
  if (tool.toLowerCase().includes("bash"))
    return [];
  const out = [];
  const candidates = ["filePath", "path", "target", "file", "filepath"];
  for (const key of candidates) {
    const v = obj[key];
    if (typeof v === "string" && v.trim().length > 0)
      out.push(v.trim());
  }
  if (Array.isArray(obj.edits)) {
    const edits = obj.edits;
    for (const e of edits) {
      if (e && typeof e === "object" && typeof e.filePath === "string") {
        const p = e.filePath.trim();
        if (p)
          out.push(p);
      }
    }
  }
  return out;
}
var MUTATION_VERBS = /\b(rm|rmdir|mv|cp|dd|tee|truncate|chmod|chown|ln|mkdir|touch|shred|mktemp|sed|patch|install|rsync|scp|unlink)\b|\bgit\s+(clean|checkout|restore|reset|stash|apply|rm|mv)\b|\b(npm|bun|pnpm|yarn)\s+(install|uninstall|add|remove|ci)\b/;
function extractCommandTokens(command) {
  const out = [];
  const tokenRe = /"[^"]*"|'[^']*'|[^\s]+/g;
  let m;
  while ((m = tokenRe.exec(command)) !== null) {
    const tok = m[0];
    const cleaned = tok.replace(/^["'`]+/, "").replace(/["'`]+$/, "").replace(/[;|&>)]+$/, "").trim();
    if (cleaned.length > 0)
      out.push(cleaned);
  }
  return out;
}
function isPathLikeToken(token) {
  if (token.startsWith("/") || token.startsWith("~/") || token.startsWith("./") || token.startsWith("../"))
    return true;
  return token.includes("/") && !token.includes("://");
}
function isMutationCommand(command) {
  return MUTATION_VERBS.test(command);
}
function isBashCommandOutsideWorktree(command, worktreePath, repoRoot) {
  if (!command || !worktreePath || !repoRoot)
    return false;
  const resolvedWorktree = path17.resolve(worktreePath);
  const resolvedRepo = path17.resolve(repoRoot);
  const lowerCommand = command.toLowerCase();
  const hasMutationVerb = isMutationCommand(lowerCommand);
  const cwdBase = resolvedRepo;
  let sawPathToken = false;
  const tokens = extractCommandTokens(command);
  for (const raw of tokens) {
    if (!isPathLikeToken(raw))
      continue;
    sawPathToken = true;
    if (raw.includes("$") || raw.includes("`")) {
      if (hasMutationVerb)
        return true;
      continue;
    }
    let resolved;
    if (raw.startsWith("~/")) {
      const home = process.env.HOME ?? os2.homedir();
      resolved = path17.resolve(home, raw.slice(2));
    } else if (path17.isAbsolute(raw)) {
      resolved = path17.resolve(raw);
    } else {
      resolved = path17.resolve(cwdBase, raw);
    }
    const insideWorktree = isPathInsideWorktree(resolved, worktreePath, repoRoot);
    if (insideWorktree)
      continue;
    const insideRepo = resolved === resolvedRepo || resolved.startsWith(resolvedRepo + path17.sep);
    if (insideRepo)
      return true;
    if (/\bcd\b/.test(lowerCommand))
      return true;
    if (hasMutationVerb)
      return true;
  }
  if (hasMutationVerb && !sawPathToken)
    return true;
  return false;
}
function shouldBlockOutsideWorktree(opts) {
  const { tool, args, worktreePath, repoRoot } = opts;
  const lower = tool.toLowerCase();
  if (lower.includes("bash")) {
    const obj = args && typeof args === "object" ? args : {};
    const cmd = obj.command ?? obj.cmd ?? obj.input;
    if (typeof cmd === "string" && cmd.trim().length > 0) {
      if (isBashCommandOutsideWorktree(cmd, worktreePath, repoRoot)) {
        return { block: true, target: cmd, reason: `bash command references path outside worktree at ${worktreePath}` };
      }
      return { block: false };
    }
    return { block: false };
  }
  const filePaths = extractAllFilePathsFromArgs(tool, args);
  if (filePaths.length === 0)
    return { block: false };
  for (const filePath of filePaths) {
    const inside = isPathInsideWorktree(filePath, worktreePath, repoRoot);
    if (!inside) {
      return { block: true, target: filePath, reason: `file ${filePath} is outside worktree at ${worktreePath}` };
    }
  }
  return { block: false };
}
async function defaultRunGit(args, cwd) {
  try {
    if (typeof Bun !== "undefined" && typeof Bun.spawn === "function") {
      const proc = Bun.spawn(args, {
        cwd,
        stdout: "pipe",
        stderr: "pipe"
      });
      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited
      ]);
      return { exitCode, stdout, stderr };
    }
  } catch {}
  const { spawn } = await import("node:child_process");
  return await new Promise((resolve8) => {
    const child = spawn(args[0], args.slice(1), { cwd });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr?.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("close", (code) => resolve8({ exitCode: code ?? 1, stdout, stderr }));
    child.on("error", (err) => resolve8({ exitCode: 1, stdout: "", stderr: String(err) }));
  });
}
async function defaultExists(p) {
  try {
    await fs16.stat(p);
    return true;
  } catch {
    return false;
  }
}
async function ensureWorktreeExists(opts) {
  const { repoRoot, issueId } = opts;
  assertValidBeadID(issueId);
  const worktreePath = opts.worktreePath ?? worktreePathForIssue(repoRoot, issueId);
  const branch = opts.branch ?? worktreeBranchForIssue(issueId);
  const runGit = opts.runGit ?? defaultRunGit;
  const exists = opts.exists ?? defaultExists;
  const log = opts.log;
  assertValidBeadID(issueId);
  try {
    if (await exists(worktreePath)) {
      const valid = await isRegisteredWorktree(worktreePath, runGit, repoRoot);
      if (valid) {
        if (log)
          log("info", `worktree already exists at ${worktreePath} for ${issueId}`, { worktreePath, issueId, branch });
        return { worktreePath, branch, created: false };
      }
      if (log)
        log("warn", `path exists at ${worktreePath} but is not a registered git worktree for ${issueId} — refusing to clobber`, { worktreePath, issueId });
      throw new Error(`worktree lane path ${worktreePath} exists but is not a registered git worktree for ${repoRoot} — remove it or choose another issueId`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("not a registered git worktree"))
      throw e;
  }
  const parent = path17.dirname(worktreePath);
  try {
    await fs16.mkdir(parent, { recursive: true });
  } catch {}
  let branchExists = false;
  try {
    const ref = `refs/heads/${branch}`;
    const res = await runGit(["git", "show-ref", "--verify", ref], repoRoot);
    branchExists = res.exitCode === 0;
  } catch {
    branchExists = false;
  }
  if (!branchExists) {
    try {
      const res = await runGit(["git", "branch", "--list", branch], repoRoot);
      if (res.stdout && res.stdout.trim().length > 0)
        branchExists = true;
    } catch {}
  }
  const worktreeArgs = branchExists ? ["git", "worktree", "add", worktreePath, branch] : ["git", "worktree", "add", worktreePath, "-b", branch];
  try {
    const result = await runGit(worktreeArgs, repoRoot);
    if (result.exitCode === 0) {
      const verified = await isRegisteredWorktree(worktreePath, runGit, repoRoot);
      if (!verified) {
        throw new Error(`git worktree add reported success but ${worktreePath} is not a registered worktree for ${issueId}`);
      }
      if (log)
        log("info", `worktree created at ${worktreePath} branch ${branch} for ${issueId}`, { worktreePath, branch, issueId });
      return { worktreePath, branch, created: true };
    }
    const combined = (result.stdout + " " + result.stderr).toLowerCase();
    if (combined.includes("already exists") || combined.includes("already checked out")) {
      const verified = await isRegisteredWorktree(worktreePath, runGit, repoRoot);
      if (verified)
        return { worktreePath, branch, created: false };
      throw new Error(`worktree lane path ${worktreePath} exists but is not a registered git worktree for ${issueId}`);
    }
    if (!branchExists) {
      const retry = await runGit(["git", "worktree", "add", worktreePath, branch], repoRoot);
      if (retry.exitCode === 0)
        return { worktreePath, branch, created: true };
      const retryCombined = (retry.stdout + " " + retry.stderr).toLowerCase();
      if (retryCombined.includes("already checked out")) {
        return { worktreePath, branch, created: false };
      }
      throw new Error(`git worktree add failed for ${issueId}: ${retry.stderr || retry.stdout}`);
    }
    throw new Error(`git worktree add failed for ${issueId}: ${result.stderr || result.stdout} (exit ${result.exitCode})`);
  } catch (e) {
    try {
      if (await exists(worktreePath) && await isRegisteredWorktree(worktreePath, runGit, repoRoot)) {
        return { worktreePath, branch, created: false };
      }
    } catch {}
    throw e;
  }
}
async function isRegisteredWorktree(worktreePath, runGit, repoRoot) {
  try {
    const res = await runGit(["git", "worktree", "list", "--porcelain"], repoRoot);
    if (res.exitCode !== 0)
      return false;
    const resolvedTarget = path17.resolve(worktreePath);
    for (const line2 of res.stdout.split(`
`)) {
      if (line2.startsWith("worktree ")) {
        const wtPath = line2.slice("worktree ".length).trim();
        if (wtPath && path17.resolve(wtPath) === resolvedTarget)
          return true;
      }
    }
    return false;
  } catch {
    try {
      const st = await fs16.stat(path17.join(worktreePath, ".git"));
      return st.isFile();
    } catch {
      return false;
    }
  }
}
function buildWorktreeViolationMessage(opts) {
  const { sessionID, tool, target, worktreePath, issueId } = opts;
  const issuePart = issueId ? ` for ${issueId}` : "";
  const targetPart = target ? ` Target: ${target}.` : "";
  const isRelativeTarget = Boolean(target && !path17.isAbsolute(target) && !target.startsWith("~/") && !target.startsWith("/"));
  if (isRelativeTarget) {
    return `Worktree lane violation: session ${sessionID}${issuePart} with lane=worktree attempted ${tool} outside worktree.${targetPart} your lane requires worktree ${worktreePath} — ask the orchestrator to re-dispatch with the worktree. Run inside your worktree at ${worktreePath}.`;
  }
  return `Worktree lane violation: session ${sessionID}${issuePart} with lane=worktree attempted ${tool} outside worktree.${targetPart} Run inside your worktree at ${worktreePath}. All mutating operations must be inside ${worktreePath}.`;
}

// src/lifecycle.ts
async function authorizeLifecycleSession(client, sessionID) {
  if (!sessionID || !client.session?.get)
    return false;
  try {
    const result = await client.session.get({ path: { id: sessionID } });
    if (!result?.data || typeof result.data !== "object")
      return false;
    if (!Object.prototype.hasOwnProperty.call(result.data, "parentID"))
      return false;
    const parentID = result.data.parentID;
    return parentID === null;
  } catch {
    return false;
  }
}
function deriveRecoveryFromTaxonomy(report) {
  if (!report)
    return "retry";
  if (report.watchdogAborted)
    return "reroute";
  if (report.contradictions.length > 0)
    return "escalate";
  switch (report.taxonomy.status) {
    case "bail":
      return "abandon";
    case "tripwire":
      return "fix-plan";
    default:
      break;
  }
  const gapsNeedsClarification = report.fields.GAPS && /clarif(?:y|ication)|ambiguous|unclear|need(?:s)? user/i.test(report.fields.GAPS);
  if (gapsNeedsClarification) {
    return "user-clarification";
  }
  switch (report.taxonomy.status) {
    case "failed":
      return report.taxonomy.retryable ? "retry" : "escalate";
    case "complete":
      return "retry";
    default:
      return report.recovery ?? "retry";
  }
}
function gateBlockedWithError(issueId, error51) {
  return {
    passed: false,
    blocked: true,
    reasonCode: "GATE_BLOCKED_CRITICAL",
    reason: `gate evaluation error: ${error51}`,
    findings: [{ axis: "correctness", severity: "CRITICAL", message: `gate evaluation error: ${error51}`, source: "gate", code: "GATE_EVAL_ERROR" }],
    compensation: { title: `Compensate ${issueId} gate error`, body: `Gate evaluation failed for ${issueId}: ${error51}
Create with: bd create --deps discovered-from:${issueId}`, discoveredFrom: issueId, severity: "CRITICAL" },
    skipped: false
  };
}
function evaluateGatedClosure(route, lifecycle, report, gate) {
  const base = evaluateClosure(route, lifecycle, report);
  return applyGateToClosure(base, gate);
}
function shouldRunGate(report) {
  if (!report)
    return false;
  if (report.watchdogAborted)
    return false;
  if (report.taxonomy.status === "bail")
    return false;
  if (report.taxonomy.status !== "complete")
    return false;
  return true;
}
function applyGateToClosure(closure, gate) {
  if (!gate || gate.skipped || !gate.blocked) {
    if (!gate)
      return { ...closure };
    return {
      ...closure,
      gateBlocked: gate.blocked ?? false,
      gateReasonCode: gate.reasonCode,
      gateReason: gate.reason,
      gateFindings: gate.findings ?? undefined,
      gateCompensation: gate.compensation
    };
  }
  const blockedDiagnostics = gate.reason ? [`Exit gate blocked: ${gate.reason}`] : ["Exit gate blocked: CRITICAL findings"];
  const compDiagnostics = gate.compensation ? [`Compensation recommended: ${gate.compensation.title} (discovered-from:${gate.compensation.discoveredFrom}) — bd create with discovered-from link`] : [];
  return {
    canClose: false,
    closureBlocked: true,
    recovery: closure.recovery ?? "escalate",
    missing: [...closure.missing, `gate:${gate.reasonCode}`],
    diagnostics: [...closure.diagnostics, ...blockedDiagnostics, ...compDiagnostics],
    gateBlocked: true,
    gateReasonCode: gate.reasonCode,
    gateReason: gate.reason,
    gateFindings: gate.findings ?? undefined,
    gateCompensation: gate.compensation
  };
}
function evaluateClosure(route, lifecycle, report) {
  if (route === "tiny") {
    const safe = report?.completionSafe === true;
    const recovery2 = deriveRecoveryFromTaxonomy(report);
    return {
      canClose: safe,
      closureBlocked: !safe,
      recovery: safe ? undefined : recovery2,
      missing: safe ? [] : ["parsed completion-safe report"],
      diagnostics: safe ? [] : ["Tiny work needs a parsed completion-safe report."]
    };
  }
  const missing = [];
  const diagnostics = [];
  if (typeof lifecycle.issueId !== "string" || !lifecycle.issueId.trim())
    missing.push("issueId");
  if (lifecycle.issueStatusObserved !== "in_progress") {
    missing.push("issueStatusObserved:in_progress");
    diagnostics.push(`issueStatusObserved must be "in_progress" (observed claim status); got ${JSON.stringify(lifecycle.issueStatusObserved)}.`);
  }
  if (typeof lifecycle.issueAssigneeObserved !== "string" || !lifecycle.issueAssigneeObserved.trim()) {
    missing.push("issueAssigneeObserved");
    diagnostics.push("issueAssigneeObserved must be a non-empty assignee from observed claim.");
  }
  if (lifecycle.claimExitCode !== 0) {
    missing.push("claimExitCode:0");
    diagnostics.push(`claimExitCode must be 0 (observed claim exit code); got ${JSON.stringify(lifecycle.claimExitCode)}.`);
  }
  if (typeof lifecycle.delegationId !== "string" || !lifecycle.delegationId.trim())
    missing.push("delegationId");
  if (lifecycle.beadsOperator !== "Bernstein")
    missing.push("beadsOperator=Bernstein");
  if (lifecycle.reviewComplete !== true)
    missing.push("Horowitz review");
  if (!report)
    missing.push("parsed report");
  else if (!report.completionSafe) {
    diagnostics.push("Specialist report is not completion-safe.");
  }
  if (missing.length)
    diagnostics.push(`Keep issue ${typeof lifecycle.issueId === "string" ? lifecycle.issueId : "open"}; satisfy: ${missing.join(", ")}.`);
  else if (report?.completionSafe !== true)
    diagnostics.push(`Keep issue ${typeof lifecycle.issueId === "string" ? lifecycle.issueId : "open"} open; satisfy: completion-safe report.`);
  const recovery = deriveRecoveryFromTaxonomy(report);
  return {
    canClose: missing.length === 0 && report?.completionSafe === true,
    closureBlocked: missing.length !== 0 || report?.completionSafe !== true,
    recovery: missing.length === 0 && report?.completionSafe === true ? undefined : recovery,
    missing,
    diagnostics
  };
}

// src/exitgate/profile.ts
import * as fs17 from "node:fs/promises";
import * as path18 from "node:path";
var DEFAULT_BLACKLIST = [
  "rm\\s+-rf\\s+/(\\s|$)",
  "rm\\s+-rf\\s+\\*",
  "rm\\s+-rf\\s+~",
  ":\\(\\)\\s*\\{",
  "mkfs",
  "dd\\s+if=",
  ">\\s*/dev/sd[a-z]",
  "chmod\\s+777\\s+/(\\s|$)",
  "shutdown",
  "reboot",
  "init\\s+0"
];
var DEFAULT_GATE_PROFILE = {
  enabled: true,
  toggles: {
    deltaSpec: true,
    triage: true,
    trajectory: true
  },
  blacklist: [...DEFAULT_BLACKLIST],
  trajectory: {
    maxSteps: 250,
    expectedSequence: []
  }
};
function isObject2(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function toGateProfile(raw) {
  if (!isObject2(raw))
    return;
  const enabled = typeof raw.enabled === "boolean" ? raw.enabled : DEFAULT_GATE_PROFILE.enabled;
  const togglesRaw = isObject2(raw.toggles) ? raw.toggles : {};
  const toggles = {
    deltaSpec: typeof togglesRaw.deltaSpec === "boolean" ? togglesRaw.deltaSpec : DEFAULT_GATE_PROFILE.toggles.deltaSpec,
    triage: typeof togglesRaw.triage === "boolean" ? togglesRaw.triage : DEFAULT_GATE_PROFILE.toggles.triage,
    trajectory: typeof togglesRaw.trajectory === "boolean" ? togglesRaw.trajectory : DEFAULT_GATE_PROFILE.toggles.trajectory
  };
  let blacklist;
  if (Array.isArray(raw.blacklist)) {
    const filtered = raw.blacklist.filter((s) => typeof s === "string" && s.trim().length > 0);
    const valid = [];
    for (const p of filtered) {
      if (p.length > 200)
        continue;
      try {
        new RegExp(p, "i");
        valid.push(p);
      } catch {}
    }
    blacklist = valid.length > 0 ? valid : [...DEFAULT_GATE_PROFILE.blacklist];
    if (Array.isArray(raw.blacklist) && raw.blacklist.length === 0)
      blacklist = [];
  } else {
    blacklist = [...DEFAULT_GATE_PROFILE.blacklist];
  }
  const trajRaw = isObject2(raw.trajectory) ? raw.trajectory : {};
  const maxSteps = typeof trajRaw.maxSteps === "number" && Number.isFinite(trajRaw.maxSteps) && trajRaw.maxSteps > 0 ? Math.floor(trajRaw.maxSteps) : DEFAULT_GATE_PROFILE.trajectory.maxSteps;
  const expectedSequence = Array.isArray(trajRaw.expectedSequence) ? trajRaw.expectedSequence.filter((s) => typeof s === "string" && s.trim().length > 0) : DEFAULT_GATE_PROFILE.trajectory.expectedSequence;
  return {
    enabled,
    toggles,
    blacklist,
    trajectory: {
      maxSteps,
      expectedSequence
    }
  };
}
function gateProfilePath(repoRoot) {
  return path18.join(repoRoot, ".tgo", "gate.json");
}
async function loadGateProfile(repoRoot) {
  const target = gateProfilePath(repoRoot);
  try {
    const raw = await fs17.readFile(target, "utf-8");
    const parsed = JSON.parse(raw);
    const profile = toGateProfile(parsed);
    if (profile)
      return profile;
    return { ...DEFAULT_GATE_PROFILE, blacklist: [...DEFAULT_GATE_PROFILE.blacklist] };
  } catch {
    return { ...DEFAULT_GATE_PROFILE, blacklist: [...DEFAULT_GATE_PROFILE.blacklist] };
  }
}
function compileBlacklist(blacklist) {
  const out = [];
  for (const p of blacklist) {
    if (p.length > 200)
      continue;
    try {
      out.push(new RegExp(p, "i"));
    } catch {}
  }
  return out;
}

// src/exitgate/delta-spec.ts
var AMBIGUOUS_MARKERS = [
  { re: /\betc\.?(\s|$|,)/i, reason: "contains etc" },
  { re: /\bappropriate\b/i, reason: "vague term: appropriate" },
  { re: /\bmaybe\b/i, reason: "vague term: maybe" },
  { re: /\bshould\b/i, reason: "weak modal: should (use SHALL/MUST)" },
  { re: /\bTBD\b/i, reason: "placeholder: TBD" },
  { re: /\bTODO\b/i, reason: "placeholder: TODO" },
  { re: /\bas needed\b/i, reason: "vague term: as needed" },
  { re: /\bif needed\b/i, reason: "vague term: if needed" },
  { re: /\bgenerally\b/i, reason: "vague qualifier: generally" },
  { re: /\busually\b/i, reason: "vague qualifier: usually" },
  { re: /\bsome\b.*\b(things|stuff|cases)?/i, reason: "vague quantifier: some" }
];
function isAmbiguous(text) {
  for (const m of AMBIGUOUS_MARKERS) {
    if (m.re.test(text))
      return { ambiguous: true, reason: m.reason };
  }
  return { ambiguous: false };
}
function parseDeltaSpec(specText) {
  const raw = typeof specText === "string" ? specText : String(specText ?? "");
  const lines = raw.split(/\r?\n/);
  const requirements = [];
  const scenarios = [];
  const findings = [];
  let reqCounter = 0;
  for (let i = 0;i < lines.length; i++) {
    const line2 = lines[i] ?? "";
    const upper = line2.toUpperCase();
    const shallIdx = upper.indexOf("SHALL");
    const mustIdx = upper.indexOf("MUST");
    const hasShall = /\bSHALL\b/i.test(line2);
    const hasMust = /\bMUST\b/i.test(line2);
    if (hasShall || hasMust) {
      reqCounter++;
      let kind = "SHALL";
      if (hasShall && hasMust) {
        const sPos = line2.search(/\bSHALL\b/i);
        const mPos = line2.search(/\bMUST\b/i);
        kind = sPos <= mPos ? "SHALL" : "MUST";
      } else if (hasMust) {
        kind = "MUST";
      }
      const amb = isAmbiguous(line2);
      const text = line2.trim();
      requirements.push({
        id: `REQ-${reqCounter}`,
        text,
        kind,
        line: i + 1,
        ambiguous: amb.ambiguous,
        ambiguousReason: amb.reason
      });
      if (amb.ambiguous) {
        findings.push({
          axis: "completeness",
          severity: "WARNING",
          message: `Ambiguous requirement ${`REQ-${reqCounter}`} (line ${i + 1}): ${amb.reason} — "${text.slice(0, 120)}"`,
          source: "delta-spec"
        });
      }
      if (text.length < 20) {
        findings.push({
          axis: "coherence",
          severity: "SUGGESTION",
          message: `Requirement ${`REQ-${reqCounter}`} is unusually short — may be underspecified (line ${i + 1})`,
          source: "delta-spec"
        });
      }
    }
  }
  let scenCounter = 0;
  for (let i = 0;i < lines.length; i++) {
    const line2 = lines[i] ?? "";
    const m = line2.match(/^\s*Scenario\s*[:\-]\s*(.+)\s*$/i);
    if (m) {
      scenCounter++;
      const title = (m[1] ?? "").trim();
      const bodyLines = [];
      for (let j = i + 1;j < lines.length; j++) {
        const nxt = lines[j] ?? "";
        if (/^\s*Scenario\s*[:\-]/i.test(nxt))
          break;
        if (/^\s*#{1,6}\s+/.test(nxt) && bodyLines.length > 3)
          break;
        bodyLines.push(nxt);
        if (bodyLines.length > 20)
          break;
      }
      const body = bodyLines.join(`
`).trim();
      scenarios.push({
        id: `SCN-${scenCounter}`,
        title,
        line: i + 1,
        body
      });
      const hasGWT = /\b(Given|When|Then|And)\b/i.test(body);
      if (!hasGWT && body.length > 0) {
        findings.push({
          axis: "completeness",
          severity: "SUGGESTION",
          message: `Scenario ${`SCN-${scenCounter}`} "${title}" lacks Given/When/Then structure`,
          source: "delta-spec"
        });
      }
      if (body.length === 0) {
        findings.push({
          axis: "completeness",
          severity: "WARNING",
          message: `Scenario ${`SCN-${scenCounter}`} "${title}" has empty body`,
          source: "delta-spec"
        });
      }
    }
  }
  if (requirements.length === 0) {
    findings.push({
      axis: "completeness",
      severity: "WARNING",
      message: "No SHALL/MUST requirement lines found in spec — delta-spec is empty",
      source: "delta-spec"
    });
  }
  if (scenarios.length > 0 && requirements.length === 0) {
    findings.push({
      axis: "coherence",
      severity: "SUGGESTION",
      message: "Spec contains Scenario blocks but no SHALL/MUST requirements — traceability gap",
      source: "delta-spec"
    });
  }
  return {
    requirements,
    scenarios,
    findings,
    raw
  };
}

// src/exitgate/trajectory.ts
init_def_snapshot();
import * as fs18 from "node:fs/promises";
import * as path19 from "node:path";
function isRecord(v) {
  return typeof v === "object" && v !== null;
}
function parseEntry(line2, lineNo) {
  const trimmed = line2.trim();
  if (trimmed.length === 0)
    return;
  try {
    const obj = JSON.parse(trimmed);
    if (!isRecord(obj))
      return;
    const tsRaw = obj.ts;
    if (typeof tsRaw !== "number" || !Number.isFinite(tsRaw))
      return;
    const ts = tsRaw;
    const type = obj.type;
    if (type !== "step" && type !== "heartbeat" && type !== "status")
      return;
    const seat = obj.seat;
    if (typeof seat !== "string" || seat.trim().length === 0)
      return;
    const tool = obj.tool;
    if (typeof tool !== "string" || tool.trim().length === 0)
      return;
    if (type === "heartbeat" && tool !== "heartbeat") {
      return;
    }
    const argsHash = obj.argsHash;
    if (typeof argsHash !== "string" || argsHash.trim().length === 0)
      return;
    const okRaw = obj.ok;
    if (typeof okRaw !== "boolean")
      return;
    const ok = okRaw;
    const durationMsRaw = obj.durationMs;
    let durationMs;
    if (durationMsRaw === undefined)
      durationMs = 0;
    else if (typeof durationMsRaw === "number" && Number.isFinite(durationMsRaw))
      durationMs = durationMsRaw;
    else
      durationMs = 0;
    const noteRaw = obj.note;
    let note;
    if (noteRaw === undefined)
      note = "";
    else if (typeof noteRaw === "string")
      note = noteRaw;
    else
      note = "";
    const issueIdRaw = obj.issueId;
    if (typeof issueIdRaw !== "string" || !isValidBeadID(issueIdRaw))
      return;
    const issueId = issueIdRaw;
    let cmd;
    if ("cmd" in obj && obj.cmd !== undefined && obj.cmd !== null) {
      if (typeof obj.cmd === "string")
        cmd = obj.cmd;
      else
        cmd = undefined;
    }
    return {
      ts,
      type,
      seat,
      tool,
      argsHash,
      ok,
      durationMs,
      note,
      issueId,
      ...cmd !== undefined ? { cmd } : {}
    };
  } catch {
    return;
  }
}
function runLogPath(repoRoot, runId) {
  assertValidBeadID(runId);
  return path19.join(repoRoot, ".tgo", "runs", `${runId}.jsonl`);
}
async function scoreTrajectory(repoRoot, runId, profile = DEFAULT_GATE_PROFILE) {
  const findings = [];
  const target = runLogPath(repoRoot, runId);
  let raw;
  try {
    raw = await fs18.readFile(target, "utf-8");
  } catch (e) {
    const code = e?.code;
    if (code === "ENOENT") {
      return {
        entries: [],
        findings: [
          {
            axis: "completeness",
            severity: "WARNING",
            message: `Trajectory skipped: no run log at .tgo/runs/${runId}.jsonl (writer lands in sibling ticket)`,
            source: "trajectory",
            code: "TRAJECTORY_SKIP_NO_LOG"
          }
        ],
        skipped: true,
        skipReason: "no-log"
      };
    }
    return {
      entries: [],
      findings: [
        {
          axis: "coherence",
          severity: "WARNING",
          message: `Trajectory skipped: unable to read run log (${String(e)})`,
          source: "trajectory",
          code: "TRAJECTORY_SKIP_READ_ERROR"
        }
      ],
      skipped: true,
      skipReason: "read-error"
    };
  }
  const lines = raw.split(/\r?\n/);
  const entries = [];
  for (let i = 0;i < lines.length; i++) {
    const line2 = lines[i];
    if (line2 === undefined || line2.trim().length === 0)
      continue;
    const entry = parseEntry(line2, i + 1);
    if (entry)
      entries.push(entry);
  }
  if (entries.length === 0) {
    findings.push({
      axis: "completeness",
      severity: "WARNING",
      message: "Trajectory: run log exists but contains no valid step entries — skipping trajectory checks",
      source: "trajectory",
      code: "TRAJECTORY_EMPTY"
    });
    return { entries, findings, skipped: true, skipReason: "empty" };
  }
  const hasTerminalStatus = entries.some((e) => e.type === "status");
  if (!hasTerminalStatus) {
    findings.push({
      axis: "completeness",
      severity: "WARNING",
      message: 'Trajectory incomplete: no terminal status line (type:"status") — log may be truncated or writer still in-flight',
      source: "trajectory",
      code: "TRAJECTORY_INCOMPLETE"
    });
  }
  const effectiveBlacklist = profile.blacklist.length > 0 ? profile.blacklist : DEFAULT_GATE_PROFILE.blacklist;
  const blacklistRes = compileBlacklist(effectiveBlacklist);
  for (let idx = 0;idx < entries.length; idx++) {
    const entry = entries[idx];
    const rawHaystack = `${entry.tool} ${entry.cmd ?? ""} ${entry.note}`;
    const haystack = rawHaystack.length > 500 ? rawHaystack.slice(0, 500) : rawHaystack;
    for (const re of blacklistRes) {
      if (re.test(haystack)) {
        findings.push({
          axis: "correctness",
          severity: "CRITICAL",
          message: `Blacklist hard-fail: step ${idx + 1} tool=${entry.tool} matched blacklist /${re.source}/ — note="${entry.note.slice(0, 120)}"`,
          source: "trajectory",
          code: "BLACKLIST_HARD_FAIL"
        });
        break;
      }
    }
  }
  const expected = profile.trajectory.expectedSequence ?? [];
  if (expected.length > 0) {
    const tools = entries.filter((e) => e.type === "step").map((e) => e.tool.toLowerCase());
    let pos = 0;
    for (const hint of expected) {
      const lowerHint = hint.toLowerCase();
      let found = -1;
      for (let i = pos;i < tools.length; i++) {
        if (tools[i]?.includes(lowerHint) || lowerHint.includes(tools[i] ?? "")) {
          found = i;
          break;
        }
      }
      if (found === -1) {
        findings.push({
          axis: "coherence",
          severity: "WARNING",
          message: `Expected tool sequence hint "${hint}" not found in trajectory (tools: ${tools.slice(0, 12).join(", ")})`,
          source: "trajectory",
          code: "EXPECTED_SEQUENCE_MISSING"
        });
        break;
      } else {
        pos = found + 1;
      }
    }
  }
  const maxSteps = profile.trajectory.maxSteps ?? DEFAULT_GATE_PROFILE.trajectory.maxSteps ?? 250;
  const stepCount = entries.filter((e) => e.type === "step").length;
  if (stepCount > maxSteps) {
    findings.push({
      axis: "coherence",
      severity: "WARNING",
      message: `Trajectory efficiency: ${stepCount} steps exceeds maxSteps ${maxSteps}`,
      source: "trajectory",
      code: "EFFICIENCY_MAX_STEPS"
    });
  }
  let maxConsecutive = 1;
  let curConsecutive = 1;
  for (let i = 1;i < entries.length; i++) {
    if (entries[i].tool === entries[i - 1].tool) {
      curConsecutive++;
      maxConsecutive = Math.max(maxConsecutive, curConsecutive);
    } else {
      curConsecutive = 1;
    }
  }
  if (maxConsecutive >= 6) {
    findings.push({
      axis: "coherence",
      severity: "WARNING",
      message: `Trajectory efficiency: ${maxConsecutive} consecutive identical tool calls detected (possible loop)`,
      source: "trajectory",
      code: "EFFICIENCY_LOOP_CONSECUTIVE"
    });
  }
  const failed = entries.filter((e) => e.ok === false).length;
  if (failed > 0 && failed / entries.length > 0.5 && entries.length >= 5) {
    findings.push({
      axis: "correctness",
      severity: "WARNING",
      message: `Trajectory: ${failed}/${entries.length} steps failed (${Math.round(failed / entries.length * 100)}%)`,
      source: "trajectory",
      code: "TRAJECTORY_HIGH_FAILURE_RATE"
    });
  }
  const totalDuration = entries.reduce((sum, e) => sum + (Number.isFinite(e.durationMs) ? e.durationMs : 0), 0);
  if (totalDuration > 30 * 60 * 1000) {
    findings.push({
      axis: "coherence",
      severity: "SUGGESTION",
      message: `Trajectory: total tool duration ${Math.round(totalDuration / 1000)}s exceeds 30m`,
      source: "trajectory",
      code: "TRAJECTORY_LONG_DURATION"
    });
  }
  return {
    entries,
    findings,
    skipped: false
  };
}

// src/exitgate/triage.ts
var AXES = ["completeness", "correctness", "coherence"];
var severityRank = {
  PASS: 0,
  SUGGESTION: 1,
  WARNING: 2,
  CRITICAL: 3
};
function maxSeverity(findings) {
  let max = "PASS";
  let maxRank = 0;
  for (const f of findings) {
    const r = severityRank[f.severity] ?? 0;
    if (r > maxRank) {
      maxRank = r;
      max = f.severity;
    }
  }
  return max;
}
function triageFindings(findings) {
  const perAxis = {
    completeness: { axis: "completeness", severity: "PASS", count: 0, findings: [], hasCritical: false },
    correctness: { axis: "correctness", severity: "PASS", count: 0, findings: [], hasCritical: false },
    coherence: { axis: "coherence", severity: "PASS", count: 0, findings: [], hasCritical: false }
  };
  for (const f of findings) {
    const axis = AXES.includes(f.axis) ? f.axis : "correctness";
    const bucket = perAxis[axis];
    bucket.findings.push(f);
  }
  for (const axis of AXES) {
    const bucket = perAxis[axis];
    bucket.count = bucket.findings.length;
    bucket.severity = maxSeverity(bucket.findings);
    bucket.hasCritical = bucket.findings.some((f) => f.severity === "CRITICAL");
  }
  const allMax = maxSeverity(findings);
  const blocked = findings.some((f) => f.severity === "CRITICAL");
  let reason;
  if (blocked) {
    const critical = findings.filter((f) => f.severity === "CRITICAL");
    const axes = [...new Set(critical.map((f) => f.axis))].join(", ");
    reason = `gate blocked: ${critical.length} CRITICAL finding(s) on ${axes}`;
  }
  return {
    findings: [...findings],
    perAxis,
    blocked,
    highestSeverity: allMax,
    reason
  };
}

// src/exitgate/gate.ts
function shouldSkipForTaxonomy(report) {
  const status = report.taxonomy.status;
  if (status === "bail") {
    return { skip: true, reason: "bail/abandon — human rejection skips gate" };
  }
  if (report.watchdogAborted) {
    return { skip: true, reason: "watchdog abort — reroute, not close" };
  }
  if (status !== "complete") {
    return { skip: true, reason: `${status} — not complete, gate not applicable` };
  }
  return { skip: false };
}
async function runExitGate(input) {
  const profile = input.profile ?? await loadGateProfile(input.repoRoot);
  if (!profile.enabled) {
    const emptyTriage = triageFindings([]);
    return {
      passed: true,
      blocked: false,
      reasonCode: "GATE_SKIPPED_DISABLED",
      reason: "gate disabled via profile.enabled=false",
      triage: emptyTriage,
      findings: [],
      profile,
      skipped: true,
      skipReason: "disabled"
    };
  }
  const taxSkip = shouldSkipForTaxonomy(input.report);
  if (taxSkip.skip) {
    const emptyTriage = triageFindings([]);
    return {
      passed: true,
      blocked: false,
      reasonCode: "GATE_SKIPPED_BAIL",
      reason: `gate skipped: ${taxSkip.reason}`,
      triage: emptyTriage,
      findings: [],
      profile,
      skipped: true,
      skipReason: taxSkip.reason
    };
  }
  const findings = [];
  if (profile.toggles.deltaSpec) {
    const delta = parseDeltaSpec(input.specText);
    for (const f of delta.findings)
      findings.push(f);
  }
  let trajectorySkipped = false;
  if (profile.toggles.trajectory) {
    const traj = await scoreTrajectory(input.repoRoot, input.issueId, profile);
    trajectorySkipped = traj.skipped;
    for (const f of traj.findings)
      findings.push(f);
  }
  let effectiveFindings = findings;
  if (!profile.toggles.triage) {
    effectiveFindings = findings.filter((f) => f.source !== "triage");
  }
  const triage = triageFindings(effectiveFindings);
  if (triage.blocked) {
    return {
      passed: false,
      blocked: true,
      reasonCode: "GATE_BLOCKED_CRITICAL",
      reason: triage.reason,
      triage,
      findings: effectiveFindings,
      trajectorySkipped,
      profile,
      skipped: false,
      compensation: {
        title: `Compensate ${input.issueId} gate failure`,
        body: `Gate blocked ${input.issueId} with ${triage.findings.filter((f) => f.severity === "CRITICAL").length} CRITICAL finding(s):
${triage.findings.filter((f) => f.severity === "CRITICAL").map((f) => `- [${f.axis}/${f.severity}] ${f.message}`).join(`
`)}

Create with: bd create --deps discovered-from:${input.issueId}`,
        discoveredFrom: input.issueId,
        severity: "CRITICAL"
      }
    };
  }
  return {
    passed: true,
    blocked: false,
    reasonCode: "GATE_PASSED",
    triage,
    findings: effectiveFindings,
    trajectorySkipped,
    profile,
    skipped: false
  };
}

// src/tui.ts
var COMMANDS = {
  inProgress: "bd list --status in_progress --json",
  open: "bd list --status open --json",
  pending: "bd list --status pending --json",
  ready: "bd ready --json",
  blocked: "bd blocked --json"
};
function strings(value) {
  if (!Array.isArray(value))
    return [];
  return value.flatMap((item) => {
    if (typeof item === "string" || typeof item === "number")
      return [String(item)];
    if (item && typeof item === "object") {
      const record2 = item;
      const id = record2.id ?? record2.issue_id ?? record2.depends_on;
      return typeof id === "string" || typeof id === "number" ? [String(id)] : [];
    }
    return [];
  });
}
function arrayField(issue2, ...names) {
  for (const name of names) {
    const value = strings(issue2[name]);
    if (value.length)
      return value;
  }
  return [];
}
function parse5(raw) {
  if (!raw.trim())
    return { issues: [], malformed: false };
  try {
    const value = JSON.parse(raw);
    if (Array.isArray(value))
      return { issues: value.filter((item) => !!item && typeof item === "object"), malformed: false };
    if (value && typeof value === "object") {
      const record2 = value;
      for (const key of ["issues", "data", "results"]) {
        if (Array.isArray(record2[key])) {
          return { issues: record2[key].filter((item) => !!item && typeof item === "object"), malformed: false };
        }
      }
    }
  } catch {
    return { issues: [], malformed: true };
  }
  return { issues: [], malformed: true };
}
function normalize(raw, status) {
  const id = raw.id ?? raw.issue_id;
  if (typeof id !== "string" && typeof id !== "number")
    return;
  const title = typeof raw.title === "string" ? raw.title : "(untitled)";
  const priority = typeof raw.priority === "number" || typeof raw.priority === "string" ? raw.priority : "-";
  const assigneeValue = raw.assignee ?? raw.assigned_to;
  const assignee = typeof assigneeValue === "string" ? assigneeValue : "-";
  return {
    id: String(id),
    title,
    status,
    priority,
    assignee,
    blockedBy: arrayField(raw, "blocked_by", "blockedBy", "blocked-by"),
    dependencies: arrayField(raw, "dependencies", "depends_on", "dependsOn", "dependency_edges")
  };
}
async function loadBeadsTui(run) {
  try {
    const entries = await Promise.all(Object.entries(COMMANDS).map(async ([key, command]) => [key, await run(command)]));
    if (entries.every(([, raw]) => !raw.trim())) {
      return { state: "unavailable", message: "Beads snapshot unavailable: bd returned no data" };
    }
    const issues = new Map;
    const statuses = { inProgress: "in_progress", open: "open", pending: "pending", ready: "ready", blocked: "blocked" };
    for (const [key, raw] of entries) {
      const parsed = parse5(raw);
      if (parsed.malformed) {
        return { state: "unavailable", message: `Beads snapshot unavailable: ${key} returned non-empty invalid JSON` };
      }
      for (const item of parsed.issues) {
        const issue2 = normalize(item, statuses[key]);
        if (!issue2)
          continue;
        const existing = issues.get(issue2.id);
        if (!existing) {
          issues.set(issue2.id, issue2);
          continue;
        }
        const statusRank = { ready: 1, open: 2, pending: 3, in_progress: 4, blocked: 5 };
        issues.set(issue2.id, {
          ...existing,
          title: existing.title === "(untitled)" ? issue2.title : existing.title,
          priority: existing.priority === "-" ? issue2.priority : existing.priority,
          assignee: existing.assignee === "-" ? issue2.assignee : existing.assignee,
          status: statusRank[issue2.status] > statusRank[existing.status] ? issue2.status : existing.status,
          blockedBy: [...new Set([...existing.blockedBy, ...issue2.blockedBy])].sort(),
          dependencies: [...new Set([...existing.dependencies, ...issue2.dependencies])].sort()
        });
      }
    }
    const rows = [...issues.values()].sort((a, b) => a.id.localeCompare(b.id));
    return rows.length ? { state: "ready", issues: rows } : { state: "empty", issues: [] };
  } catch (error51) {
    const message = error51 instanceof Error ? error51.message : "bd runner failed";
    return { state: "unavailable", message: `Beads snapshot unavailable: ${message}` };
  }
}
function clip(value, width) {
  return value.length > width ? `${value.slice(0, width - 1)}…` : value;
}
function cell(value, width) {
  return clip(value, width).padEnd(width);
}
function renderBeadsTui(snapshot) {
  if (snapshot.state === "unavailable")
    return `BEADS SNAPSHOT UNAVAILABLE
${snapshot.message}`;
  if (snapshot.state === "empty")
    return `BEADS SNAPSHOT
No ready, open, pending, in_progress, or blocked work.`;
  const header = [cell("ID", 14), cell("TITLE", 32), cell("STATUS", 11), cell("PRIORITY", 8), cell("ASSIGNEE", 16), "EDGES"].join(" | ");
  const rows = snapshot.issues.map((issue2) => {
    const edges = [issue2.blockedBy.length ? `blocked-by: ${issue2.blockedBy.join(",")}` : "", issue2.dependencies.length ? `depends-on: ${issue2.dependencies.join(",")}` : ""].filter(Boolean).join("; ") || "-";
    return [cell(issue2.id, 14), cell(issue2.title, 32), cell(issue2.status, 11), cell(String(issue2.priority), 8), cell(issue2.assignee, 16), edges].join(" | ");
  });
  return ["BEADS SNAPSHOT", header, "-".repeat(header.length), ...rows].join(`
`);
}

// src/version.ts
import * as fs19 from "node:fs/promises";
import * as path20 from "node:path";
import { fileURLToPath as fileURLToPath5 } from "node:url";
var PLUGIN_NPM_NAME = "trans-genderian-orchestra";
var REGISTRY_URL = `https://registry.npmjs.org/${PLUGIN_NPM_NAME}/latest`;
function compareVersions(a, b) {
  const stripBuild = (v) => v.split("+", 1)[0] ?? v;
  const norm = (v) => stripBuild(v.trim().replace(/^v/, ""));
  const parse6 = (v) => {
    const [core2, pre] = norm(v).split("-", 2);
    const parts = core2.split(".").map((p) => {
      const n = Number.parseInt(p, 10);
      return Number.isNaN(n) ? 0 : n;
    });
    return { parts, pre: pre ?? null };
  };
  const pa = parse6(a);
  const pb = parse6(b);
  const len = Math.max(pa.parts.length, pb.parts.length);
  for (let i = 0;i < len; i++) {
    const av = pa.parts[i] ?? 0;
    const bv = pb.parts[i] ?? 0;
    if (av < bv)
      return -1;
    if (av > bv)
      return 1;
  }
  if (pa.pre === pb.pre)
    return 0;
  if (pa.pre === null)
    return 1;
  if (pb.pre === null)
    return -1;
  return pa.pre < pb.pre ? -1 : pa.pre > pb.pre ? 1 : 0;
}
async function readLocalVersion(packageRoot3) {
  const root = packageRoot3 ?? path20.resolve(path20.dirname(fileURLToPath5(import.meta.url)), "..");
  try {
    const raw = await fs19.readFile(path20.join(root, "package.json"), "utf-8");
    const json2 = JSON.parse(raw);
    return typeof json2.version === "string" && json2.version.length > 0 ? json2.version : null;
  } catch {
    return null;
  }
}
async function fetchLatestVersion(opts) {
  const fetchImpl = opts?.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function")
    return null;
  const url2 = opts?.url ?? REGISTRY_URL;
  const timeoutMs = opts?.timeoutMs ?? 3000;
  const controller = new AbortController;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url2, { signal: controller.signal, headers: { accept: "application/json" } });
    if (!res.ok)
      return null;
    const json2 = await res.json();
    return typeof json2.version === "string" && json2.version.length > 0 ? json2.version : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
async function checkVersionDrift(opts) {
  const local = await readLocalVersion(opts?.packageRoot);
  if (!local)
    return null;
  const latest = await fetchLatestVersion({ fetchImpl: opts?.fetchImpl, timeoutMs: opts?.timeoutMs, url: opts?.url });
  if (!latest)
    return null;
  return { local, latest, drift: compareVersions(local, latest) < 0 };
}

// src/termination.ts
function parseCompletionSignal(text) {
  try {
    const input = typeof text === "string" ? text : String(text ?? "");
    let complete = false;
    const lines = input.split(/\r?\n/);
    for (const rawLine of lines) {
      const trimmed = rawLine.trim();
      if (trimmed.length >= 7 && trimmed.slice(0, 7).toLowerCase() === "status:") {
        const value = trimmed.slice(7).trim().toLowerCase();
        if (value === "complete") {
          complete = true;
          break;
        }
      } else if (/^\s*STATUS\s*:/i.test(rawLine)) {
        const colon = rawLine.indexOf(":");
        if (colon !== -1) {
          const value = rawLine.slice(colon + 1).trim().toLowerCase();
          if (value === "complete") {
            complete = true;
            break;
          }
        }
      }
    }
    let exitGate;
    if (/"?exit\s*gate"?\s*:\s*true\b/i.test(input)) {
      exitGate = true;
    } else if (/"?exit\s*gate"?\s*:\s*false\b/i.test(input)) {
      exitGate = false;
    }
    const result = { complete };
    if (exitGate !== undefined)
      result.exitGate = exitGate;
    return result;
  } catch {
    return { complete: false };
  }
}
var and = (...cs) => (i) => cs.every((c) => c(i));
var terminationDecision = and((i) => i.signal.complete, (i) => !i.exitGateRequired || i.signal.exitGate === true, (i) => i.toolCallsAfterCompletion >= 1);

// src/self-update.ts
import * as fs20 from "node:fs/promises";
import * as fsSync2 from "node:fs";
import * as path21 from "node:path";
import * as os3 from "node:os";
var LOCK_STALE_MS = 120000;
var LOCK_FILE = ".tgo-selfupdate.lock";
function resolveCacheRoot(homeDir) {
  const base = process.env.OPENCODE_TEST_HOME ?? process.env.XDG_CACHE_HOME ?? path21.join(homeDir ?? os3.homedir(), ".cache");
  return path21.join(base, "opencode");
}
function slotDirs(cacheRoot, pkgName) {
  const candidates = [
    path21.join(cacheRoot, "packages", `${pkgName}@latest`),
    path21.join(cacheRoot, "packages", pkgName)
  ];
  return candidates.filter((dir) => {
    try {
      return fsSync2.existsSync(dir) && fsSync2.statSync(dir).isDirectory();
    } catch {
      return false;
    }
  });
}
function parseSemver(v) {
  if (typeof v !== "string")
    return null;
  let s = v.trim().replace(/^v/, "");
  if (s.length === 0)
    return null;
  const plusIdx = s.indexOf("+");
  if (plusIdx !== -1) {
    const build = s.slice(plusIdx + 1);
    if (build.length === 0)
      return null;
    const buildIds = build.split(".");
    for (const id of buildIds) {
      if (id.length === 0 || !/^[0-9A-Za-z-]+$/.test(id))
        return null;
    }
    s = s.slice(0, plusIdx);
  }
  let coreStr;
  let preStr = null;
  const dashIdx = s.indexOf("-");
  if (dashIdx !== -1) {
    coreStr = s.slice(0, dashIdx);
    preStr = s.slice(dashIdx + 1);
    if (preStr.length === 0)
      return null;
  } else {
    coreStr = s;
  }
  const coreParts = coreStr.split(".");
  if (coreParts.length !== 3)
    return null;
  const nums = [];
  for (const p of coreParts) {
    if (!/^(0|[1-9]\d*)$/.test(p))
      return null;
    nums.push(parseInt(p, 10));
  }
  let prerelease = null;
  if (preStr !== null) {
    const ids = preStr.split(".");
    for (const id of ids) {
      if (id.length === 0 || !/^[0-9A-Za-z-]+$/.test(id))
        return null;
      if (/^[0-9]+$/.test(id) && !/^(0|[1-9]\d*)$/.test(id))
        return null;
    }
    prerelease = ids;
  }
  return { major: nums[0], minor: nums[1], patch: nums[2], prerelease };
}
function semverGt(a, b) {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb)
    return false;
  if (pa.major !== pb.major)
    return pa.major > pb.major;
  if (pa.minor !== pb.minor)
    return pa.minor > pb.minor;
  if (pa.patch !== pb.patch)
    return pa.patch > pb.patch;
  const aPre = pa.prerelease;
  const bPre = pb.prerelease;
  if (aPre === null && bPre === null)
    return false;
  if (aPre === null && bPre !== null)
    return true;
  if (aPre !== null && bPre === null)
    return false;
  const aA = aPre;
  const bA = bPre;
  const len = Math.min(aA.length, bA.length);
  for (let i = 0;i < len; i++) {
    const aId = aA[i];
    const bId = bA[i];
    if (aId === bId)
      continue;
    const aIsNum = /^[0-9]+$/.test(aId);
    const bIsNum = /^[0-9]+$/.test(bId);
    if (aIsNum && bIsNum) {
      return parseInt(aId, 10) > parseInt(bId, 10);
    }
    if (aIsNum && !bIsNum)
      return false;
    if (!aIsNum && bIsNum)
      return true;
    return aId > bId;
  }
  return aA.length > bA.length;
}
function shouldRefresh(runningVersion, latestVersion) {
  return semverGt(latestVersion, runningVersion);
}
function buildInstallArgs(dir, pkgName) {
  return ["npm", "install", "--prefix", dir, `${pkgName}@latest`, "--save-exact", "--ignore-scripts", "--no-audit", "--no-fund"];
}
async function recoverOrphans(dir) {
  try {
    const dirExists = await fs20.stat(dir).then(() => true).catch(() => false);
    const backup = `${dir}.tgo-backup`;
    const staging = `${dir}.tgo-staging`;
    if (!dirExists) {
      const backupExists = await fs20.stat(backup).then(() => true).catch(() => false);
      if (backupExists) {
        try {
          await fs20.rename(backup, dir);
        } catch {}
      }
      return;
    }
    await rmRf(staging);
    await rmRf(backup);
  } catch {}
}
async function rmRf(p) {
  try {
    await fs20.rm(p, { recursive: true, force: true });
  } catch {}
}
async function copyDir(src, dest) {
  const cp2 = fs20.cp;
  if (typeof cp2 === "function") {
    await cp2.call(fs20, src, dest, { recursive: true, force: true });
    return;
  }
  await fs20.mkdir(dest, { recursive: true });
  const entries = await fs20.readdir(src, { withFileTypes: true });
  for (const e of entries) {
    const s = path21.join(src, e.name);
    const d = path21.join(dest, e.name);
    if (e.isDirectory()) {
      await copyDir(s, d);
    } else if (e.isSymbolicLink()) {
      const target = await fs20.readlink(s);
      await fs20.symlink(target, d);
    } else {
      await fs20.copyFile(s, d);
    }
  }
}
async function selfUpdate(deps) {
  try {
    let latest;
    try {
      latest = await deps.fetchLatest();
    } catch {
      return;
    }
    if (!latest)
      return;
    if (typeof latest !== "string" || latest.trim().length === 0)
      return;
    if (!shouldRefresh(deps.runningVersion, latest))
      return;
    const cacheRoot = resolveCacheRoot(deps.homeDir);
    const dirs = slotDirs(cacheRoot, deps.pkgName);
    if (dirs.length === 0)
      return;
    const nowMs = deps.now ? deps.now().getTime() : Date.now();
    for (const dir of dirs) {
      try {
        await recoverOrphans(dir);
      } catch {}
      const lockPath = path21.join(dir, LOCK_FILE);
      const staging = `${dir}.tgo-staging`;
      const backup = `${dir}.tgo-backup`;
      let ownerToken = null;
      let acquired = false;
      try {
        try {
          await fs20.mkdir(dir, { recursive: true });
        } catch {}
        const token = `${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}`;
        const tryAcquire = async () => {
          let handle;
          try {
            handle = await fs20.open(lockPath, "wx");
            try {
              await handle.writeFile(token, "utf-8");
            } catch {}
            ownerToken = token;
            acquired = true;
            return true;
          } catch (err) {
            const code = err?.code;
            if (code !== "EEXIST")
              return false;
            return false;
          } finally {
            if (handle) {
              try {
                await handle.close();
              } catch {}
            }
          }
        };
        let ok = await tryAcquire();
        if (!ok) {
          try {
            const stat6 = await fs20.stat(lockPath);
            const age = nowMs - stat6.mtimeMs;
            if (age > LOCK_STALE_MS) {
              try {
                await fs20.unlink(lockPath);
              } catch {}
              ok = await tryAcquire();
              if (!ok)
                continue;
            } else {
              continue;
            }
          } catch {
            continue;
          }
        }
        if (!acquired || !ownerToken)
          continue;
        let innerError = null;
        let newVersionForLog = null;
        try {
          try {
            await rmRf(staging);
            await copyDir(dir, staging);
          } catch (e) {
            throw new Error(`self-update staging failed for ${dir}: ${String(e)}`);
          }
          const args = buildInstallArgs(staging, deps.pkgName);
          let result;
          try {
            result = await deps.spawn(args);
          } catch (e) {
            throw new Error(`self-update spawn failed for ${dir}: ${String(e)}`);
          }
          if (result.exitCode !== 0) {
            throw new Error(`self-update failed for ${dir}: exit ${result.exitCode} ${result.stderr || result.stdout}`.trim());
          }
          let newVersion = "";
          try {
            const pkgJsonPath = path21.join(staging, "node_modules", deps.pkgName, "package.json");
            const raw = await fs20.readFile(pkgJsonPath, "utf-8");
            const json2 = JSON.parse(raw);
            newVersion = typeof json2.version === "string" ? json2.version : "";
          } catch (e) {
            throw new Error(`self-update verification failed for ${dir}: ${String(e)}`);
          }
          if (!newVersion) {
            throw new Error(`self-update verification failed for ${dir}: missing version`);
          }
          if (!semverGt(newVersion, deps.runningVersion)) {
            throw new Error(`self-update verification failed for ${dir}: installed ${newVersion} not > ${deps.runningVersion}`);
          }
          newVersionForLog = newVersion;
          try {
            await rmRf(backup);
            await fs20.rename(dir, backup);
            await fs20.rename(staging, dir);
            await rmRf(backup);
          } catch (e) {
            try {
              const backupExists = await fs20.stat(backup).then(() => true).catch(() => false);
              const dirExists = await fs20.stat(dir).then(() => true).catch(() => false);
              if (backupExists && !dirExists) {
                try {
                  await fs20.rename(backup, dir);
                } catch {}
              }
              await rmRf(staging);
            } catch {}
            throw new Error(`self-update swap failed for ${dir}: ${String(e)}`);
          }
          try {
            deps.log("info", `self-updated ${deps.pkgName} to ${newVersionForLog} — restart opencode to activate`);
          } catch {}
        } catch (e) {
          innerError = e;
          try {
            const backupExists = await fs20.stat(backup).then(() => true).catch(() => false);
            const dirExists = await fs20.stat(dir).then(() => true).catch(() => false);
            if (backupExists && !dirExists) {
              try {
                await fs20.rename(backup, dir);
              } catch {}
            }
            await rmRf(staging);
          } catch {}
          try {
            const msg = String(e?.message ?? e);
            if (msg.includes("self-update")) {
              deps.log("warn", msg);
            } else {
              deps.log("warn", `self-update failed for ${dir}: ${String(e)}`);
            }
          } catch {}
        }
      } finally {
        try {
          if (ownerToken) {
            const cur = await fs20.readFile(lockPath, "utf-8").catch(() => "");
            if (cur === ownerToken) {
              await fs20.unlink(lockPath).catch(() => {});
            }
          }
        } catch {}
      }
    }
  } catch {
    return;
  }
}

// src/seat-sync.ts
init_config();
import * as fs21 from "node:fs/promises";
import * as path22 from "node:path";
function parseSteps(content) {
  const m = content.match(/^\s*steps:\s*(\d+)/m);
  return m ? m[1] : null;
}
async function reconcileSeats(assetsAgentsDir, installedAgentsDir, log, _card = "default") {
  const summary = [];
  let renderedSeats;
  try {
    renderedSeats = await renderSeats(assetsAgentsDir, "default");
  } catch (err) {
    safeWarn(log, "tgo: seat sync render failed", { assetsAgentsDir, error: String(err) });
    return summary;
  }
  if (renderedSeats.length === 0) {
    try {
      await fs21.readdir(assetsAgentsDir);
    } catch (err) {
      safeWarn(log, "tgo: seat sync readdir failed", { assetsAgentsDir, error: String(err) });
    }
    if (renderedSeats.length === 0)
      return summary;
  }
  for (const seat of renderedSeats) {
    const file2 = seat.fileName;
    const expectedContent = seat.content;
    const seatName = path22.basename(file2, ".md");
    const installedPath = path22.join(installedAgentsDir, file2);
    let installedContent;
    let installedExists = false;
    try {
      installedContent = await fs21.readFile(installedPath, "utf-8");
      installedExists = true;
    } catch (err) {
      const code = err?.code;
      if (code === "ENOENT") {
        installedExists = false;
        installedContent = undefined;
      } else {
        safeWarn(log, "tgo: seat sync read installed failed", { file: file2, error: String(err) });
        continue;
      }
    }
    if (installedExists && installedContent === expectedContent) {
      continue;
    }
    try {
      await fs21.mkdir(installedAgentsDir, { recursive: true });
    } catch (err) {
      safeWarn(log, "tgo: seat sync mkdir failed", { installedAgentsDir, error: String(err) });
      continue;
    }
    if (installedExists && installedContent !== undefined) {
      try {
        await fs21.writeFile(`${installedPath}.bak`, installedContent, "utf-8");
      } catch (err) {
        safeWarn(log, "tgo: seat sync backup failed", { file: file2, error: String(err) });
        continue;
      }
    }
    const tmp = path22.join(installedAgentsDir, `.${file2}.${process.pid}.${Date.now()}.tmp`);
    try {
      await fs21.writeFile(tmp, expectedContent, "utf-8");
      await fs21.rename(tmp, installedPath);
    } catch (err) {
      safeWarn(log, "tgo: seat sync write failed", { file: file2, error: String(err) });
      try {
        await fs21.rm(tmp, { force: true });
      } catch {}
      continue;
    }
    const oldSteps = installedContent ? parseSteps(installedContent) : null;
    const newSteps = parseSteps(expectedContent);
    let change;
    if (!installedExists) {
      if (newSteps)
        change = `steps →${newSteps}`;
      else
        change = "created";
    } else if (oldSteps && newSteps && oldSteps !== newSteps) {
      change = `steps ${oldSteps}→${newSteps}`;
    } else if (oldSteps && newSteps && oldSteps === newSteps) {
      change = "updated";
    } else {
      change = "updated";
    }
    summary.push(`${seatName} (${change})`);
  }
  return summary;
}

// src/plugin.ts
init_runs();

// src/manifest-hooks.ts
init_def_snapshot();
import * as fs22 from "node:fs/promises";
import * as path23 from "node:path";
async function manifestOnDispatch(opts) {
  const { repoRoot, issueId, packet } = opts;
  if (!isValidBeadID(issueId))
    return { injected: false, packet };
  let manifest;
  try {
    manifest = await readManifest(repoRoot);
  } catch {
    return { injected: false, packet };
  }
  if (!manifest)
    return { injected: false, packet };
  const found = getManifestRowSyncFromManifest(manifest, issueId);
  if (!found)
    return { injected: false, packet };
  const { bead, wave } = found;
  const next = { ...packet };
  next.manifest = {
    issueId: bead.issueId,
    story: bead.story,
    scope: bead.scope,
    parallelSet: bead.parallelSet,
    deps: bead.deps,
    wave
  };
  return { injected: true, packet: next, row: bead, wave };
}
function extractTouchedFilesFromReport(report) {
  const changes = report.fields.CHANGES ?? "";
  if (!changes || changes.trim().length === 0)
    return [];
  const tokens = [];
  const parts = changes.split(/[\n,]+/);
  for (const raw of parts) {
    const trimmed = raw.trim().replace(/^-\s*/, "").trim();
    if (trimmed.length === 0)
      continue;
    if (trimmed.endsWith(":"))
      continue;
    const lower = trimmed.toLowerCase();
    if (lower === "none" || lower === "none." || lower === "n/a")
      continue;
    if (!trimmed.includes("/") && /^[A-Za-z0-9_.-]+$/.test(trimmed) && /[-.]\d/.test(trimmed) && trimmed.length <= 12)
      continue;
    const candidates = trimmed.split(/\s+/).filter(Boolean);
    for (const c of candidates) {
      const cleaned = c.replace(/^[\[`'"({]+|[,\]`'")}\]]+$/g, "").trim();
      if (cleaned.length === 0)
        continue;
      if (cleaned.includes("/") || cleaned.includes(".") || /^[A-Za-z0-9._-]+\.[A-Za-z0-9]+$/.test(cleaned)) {
        tokens.push(cleaned);
      } else if (/^[A-Za-z0-9._\-\/]+$/.test(cleaned) && cleaned.length > 2) {
        if (cleaned.includes("/"))
          tokens.push(cleaned);
      }
    }
  }
  return [...new Set(tokens.map(normalizeScopePath).filter(Boolean))];
}
async function extractTouchedFilesFromRunLog(repoRoot, issueId) {
  try {
    const target = path23.join(repoRoot, ".tgo", "runs", issueId + ".jsonl");
    const raw = await fs22.readFile(target, "utf-8");
    const touched = [];
    for (const line2 of raw.split(`
`)) {
      if (!line2.trim())
        continue;
      let ev = null;
      try {
        ev = JSON.parse(line2);
      } catch {
        continue;
      }
      if (!ev || typeof ev.tool !== "string")
        continue;
      const tool = ev.tool.toLowerCase();
      if (tool !== "edit" && tool !== "write" && tool !== "multiedit")
        continue;
      if (typeof ev.cmd !== "string" || !ev.cmd.trim())
        continue;
      const norm = normalizeScopePath(ev.cmd.trim());
      if (norm)
        touched.push(norm);
    }
    return [...new Set(touched)];
  } catch {
    return;
  }
}
function reportClaimsEdits(changes) {
  if (typeof changes !== "string" || changes.trim().length === 0)
    return false;
  return /(edit|modif|chang|writ|updat)/i.test(changes);
}
function toBailReport(original, mismatchFiles) {
  const bailFields = {
    ...original.fields,
    TASK_STATUS: "bail",
    RETRYABLE: "false"
  };
  return {
    ...original,
    valid: original.valid,
    completionSafe: false,
    exitGate: original.exitGate,
    taxonomy: { status: "bail", retryable: false },
    recovery: "abandon",
    fields: bailFields,
    raw: original.raw + `
[m manifest mismatch: touched outside scope: ${mismatchFiles.join(", ")}]`
  };
}
async function manifestOnComplete(opts) {
  const { repoRoot, issueId, report, touchedFiles } = opts;
  if (!isValidBeadID(issueId))
    return { bail: false, report };
  let manifest;
  try {
    manifest = await readManifest(repoRoot);
  } catch {
    return { bail: false, report };
  }
  if (!manifest)
    return { bail: false, report };
  const found = getManifestRowSyncFromManifest(manifest, issueId);
  if (!found)
    return { bail: false, report };
  const { bead } = found;
  const scopeSet = new Set(bead.scope.map(normalizeScopePath));
  const effectiveTouched = touchedFiles ?? await extractTouchedFilesFromRunLog(repoRoot, issueId);
  const touchedSet = [];
  const srcFiles = effectiveTouched !== undefined ? effectiveTouched : extractTouchedFilesFromReport(report);
  for (const f2 of srcFiles) {
    const nf = normalizeScopePath(f2);
    if (nf && !touchedSet.includes(nf))
      touchedSet.push(nf);
  }
  const touched = [...new Set(touchedSet)];
  if (touched.length === 0) {
    const warning = reportClaimsEdits(report.fields.CHANGES) ? "manifest onComplete: report claims changes but extracted zero touched files — cannot verify scope compliance (UNVERIFIABLE" : undefined;
    return { bail: false, report, row: bead, warning };
  }
  const mismatch = touched.filter((f) => !scopeSet.has(f));
  if (mismatch.length === 0)
    return { bail: false, report, row: bead };
  const bailed = toBailReport(report, mismatch);
  return { bail: true, report: bailed, mismatchFiles: mismatch, row: bead };
}
async function manifestMessageFilter(opts) {
  const { repoRoot, issueId, packet } = opts;
  if (!isValidBeadID(issueId))
    return { filtered: false, packet };
  let manifest;
  try {
    manifest = await readManifest(repoRoot);
  } catch {
    return { filtered: false, packet };
  }
  if (!manifest)
    return { filtered: false, packet };
  const found = getManifestRowSyncFromManifest(manifest, issueId);
  if (!found)
    return { filtered: false, packet };
  const { bead } = found;
  const scopeSet = new Set(bead.scope.map(normalizeScopePath));
  const files = packet.Files;
  if (!Array.isArray(files) || files.length === 0)
    return { filtered: false, packet };
  const original = files.filter((f) => typeof f === "string");
  const kept = original.filter((f) => scopeSet.has(normalizeScopePath(f)));
  const stripped = original.filter((f) => !scopeSet.has(normalizeScopePath(f)));
  if (original.length > 0 && kept.length === 0) {
    return {
      filtered: false,
      packet,
      refused: `manifest scope for ${issueId} excludes all listed files — refusing dispatch (plan error)`
    };
  }
  if (stripped.length === 0)
    return { filtered: false, packet };
  const next = { ...packet, Files: kept };
  return { filtered: true, packet: next, stripped };
}

// src/recursion.ts
var DEFAULT_MAX_DEPTH = 4;
var sessionDepth = new Map;
var sessionParent = new Map;
var sessionIssueId = new Map;
var pendingSpawn = new Map;
function recordDispatch(parentSessionId, issueId) {
  const depth = (sessionDepth.get(parentSessionId) ?? 0) + 1;
  const queue = pendingSpawn.get(parentSessionId) ?? [];
  queue.push({ issueId, depth });
  pendingSpawn.set(parentSessionId, queue);
}
function onChildCreated(childSessionId, parentSessionId) {
  sessionParent.set(childSessionId, parentSessionId);
  const queue = pendingSpawn.get(parentSessionId);
  const entry = queue && queue.length > 0 ? queue.shift() : undefined;
  if (entry && queue && queue.length === 0) {
    pendingSpawn.delete(parentSessionId);
  }
  sessionDepth.set(childSessionId, entry ? entry.depth : (sessionDepth.get(parentSessionId) ?? 0) + 1);
  if (entry && entry.issueId)
    sessionIssueId.set(childSessionId, entry.issueId);
}
function onSessionDeleted(sessionId) {
  sessionDepth.delete(sessionId);
  sessionParent.delete(sessionId);
  sessionIssueId.delete(sessionId);
  pendingSpawn.delete(sessionId);
}
function checkSpawnAllowed(sessionId, issueId, config2) {
  if (config2 && config2.enabled === false)
    return { allowed: true };
  const maxDepth = config2?.maxDepth ?? DEFAULT_MAX_DEPTH;
  const cycleBound = config2?.cycleBound ?? maxDepth;
  const depth = sessionDepth.get(sessionId) ?? 0;
  if (depth >= maxDepth) {
    return {
      allowed: false,
      depth,
      reason: `spawn depth cap exceeded (depth ${depth} >= maxDepth ${maxDepth})`
    };
  }
  if (issueId) {
    let cur = sessionId;
    let steps = 0;
    while (cur !== undefined && steps <= cycleBound) {
      if (sessionIssueId.get(cur) === issueId) {
        return {
          allowed: false,
          depth,
          reason: `spawn cycle detected (${issueId} already in the delegation chain)`
        };
      }
      cur = sessionParent.get(cur);
      steps += 1;
    }
  }
  return { allowed: true, depth: depth + 1 };
}

// src/replay.ts
init_runs();
init_def_snapshot();
function parseReplayIntent(text) {
  const m = /replay\s+([A-Za-z0-9][A-Za-z0-9._-]*)\s+step\s+(\d+)/i.exec(text);
  if (!m)
    return;
  return { runId: m[1], stepIndex: Number.parseInt(m[2], 10) };
}
async function replayStep(repoRoot, runId, stepIndex, opts) {
  const events = await readRunEvents(repoRoot, runId);
  if (events.length === 0) {
    return { ok: false, reason: `no run events for ${runId}`, runId, stepIndex };
  }
  const steps = events.filter((e) => e.type === "step");
  const step = steps[stepIndex];
  if (!step) {
    return { ok: false, reason: `no step ${stepIndex} in run ${runId} (${steps.length} steps)`, runId, stepIndex };
  }
  if (opts?.currentPromptHash) {
    let snapshot;
    try {
      snapshot = await readDefSnapshot(repoRoot, step.issueId);
    } catch {
      snapshot = undefined;
    }
    if (snapshot?.promptHash && opts.currentPromptHash !== snapshot.promptHash) {
      return {
        ok: false,
        reason: "definition drifted — replay rejected",
        runId,
        stepIndex,
        step,
        driftDetected: true
      };
    }
  }
  return {
    ok: true,
    runId,
    stepIndex,
    step,
    inputHash: step.argsHash,
    output: { tool: step.tool, ok: step.ok, note: step.note, cmd: step.cmd, durationMs: step.durationMs }
  };
}
function formatReplayResult(r) {
  if (!r.ok)
    return `step replay rejected: ${r.reason}`;
  const o = r.output;
  const extras = [o.note ? `note=${o.note}` : "", o.cmd ? `cmd=${o.cmd}` : ""].filter(Boolean).join(" ");
  return `step replay ${r.runId}#${r.stepIndex}: tool=${o.tool} ok=${o.ok} inputHash=${r.inputHash}${extras ? ` ${extras}` : ""}`;
}

// src/exitgate/close-gate.ts
async function checkCloseGate(repoRoot, issueId, specText) {
  const syntheticComplete = parseTaskReport(`STATUS: complete
CHANGES: close via sidebar
VERIFIED: exit gate: true; close check
GAPS: none`);
  const gate = await runExitGate({ repoRoot, issueId, specText: specText ?? "", report: syntheticComplete });
  if (gate.blocked) {
    return { allowed: false, gate };
  }
  return { allowed: true, gate };
}

// src/plugin.ts
import * as path24 from "node:path";
import * as os4 from "node:os";
import { fileURLToPath as fileURLToPath6 } from "node:url";
var TgoPlugin = async ({ client, $, project, directory, worktree }, options) => {
  const config2 = await loadTgoConfig(options);
  const appLog = (level, message, extra) => {
    client.app.log({ body: { service: "tgo", level, message, extra } }).catch(() => {});
  };
  const reuseCapability = probeSessionReuseCapability(undefined);
  if (!reuseCapability.supported) {
    appLog("warn", `session reuse disabled: ${reuseCapability.reason}`);
  }
  if (config2.checkVersion !== false) {
    checkVersionDrift().then((drift) => {
      if (drift?.drift) {
        appLog("warn", `TGO update available: installed ${drift.local} < npm ${drift.latest} — self-update will refresh cache on restart; if slot stuck: rm -rf ~/.cache/opencode/packages/trans-genderian-orchestra* and restart (opencode plugin --force is a no-op against exact-pinned slots tgo-6m6)`, { local: drift.local, latest: drift.latest });
      }
    }).catch((err) => {
      appLog("warn", "tgo: version drift check failed", { error: String(err) });
    });
  }
  if (config2.selfUpdate?.enabled !== false) {
    (async () => {
      try {
        const runningVersion = await readLocalVersion() ?? "0.0.0";
        await selfUpdate({
          runningVersion,
          pkgName: PLUGIN_NPM_NAME,
          fetchLatest: () => fetchLatestVersion().then((v) => v ?? undefined),
          spawn: async (args) => {
            try {
              const proc = Bun.spawn(args, {
                stdout: "pipe",
                stderr: "pipe",
                env: BD_ENV
              });
              const [stdout, stderr, exitCode] = await Promise.all([
                new Response(proc.stdout).text(),
                new Response(proc.stderr).text(),
                proc.exited
              ]);
              return { exitCode, stdout, stderr };
            } catch (error51) {
              return { exitCode: 1, stdout: "", stderr: String(error51) };
            }
          },
          log: (level, msg) => appLog(level, msg)
        });
      } catch (err) {
        appLog("warn", "tgo: self-update failed", { error: String(err) });
      }
    })().catch((err) => {
      appLog("warn", "tgo: self-update failed", { error: String(err) });
    });
  }
  const seatDir = resolveAgentsDir({ agentDir: config2.agentDir });
  (async () => {
    try {
      const packageRoot3 = path24.resolve(path24.dirname(fileURLToPath6(import.meta.url)), "..");
      const assetsAgentsDir = path24.join(packageRoot3, "assets", "agents");
      const summary = await reconcileSeats(assetsAgentsDir, seatDir, appLog, "default");
      if (summary.length > 0) {
        let version2 = "unknown";
        try {
          version2 = await readLocalVersion() ?? "unknown";
        } catch {}
        appLog("warn", `tgo: seat frontmatter refreshed to match ${version2}: ${summary.join(", ")}`);
      }
    } catch (err) {
      safeWarn(appLog, "tgo: seat sync failed", { error: String(err) });
    }
  })().catch((err) => {
    safeWarn(appLog, "tgo: seat sync failed", { error: String(err) });
  });
  try {
    const checked = await validateAgentDir(seatDir, appLog);
    if (checked > 0) {
      appLog("info", `validated ${checked} seat prompt(s) under budget (${seatDir})`);
    }
  } catch (error51) {
    appLog("warn", `load-time seat-prompt check skipped: ${String(error51)}`);
  }
  const runBd = async (command) => {
    try {
      const args = command.split(/\s+/);
      return await $`${args}`.env(BD_ENV).nothrow().text();
    } catch {
      return "";
    }
  };
  const board = new BoardController({
    run: runBd,
    refreshMs: config2.board?.refreshMs ?? 5000,
    sessionReuse: {
      repoRoot: directory ?? worktree ?? project?.worktree ?? ".",
      client,
      maxContextTokens: config2.sessionReuse?.maxContextTokens ?? 1e5,
      supported: reuseCapability.supported,
      enabled: config2.sessionReuse?.enabled !== false
    },
    log: appLog
  });
  const reconciler = new SessionReconciler({ shim: board.shimState });
  if (config2.cost?.enabled !== false) {
    try {
      const costPreset = resolveActivePreset(config2, await readPresetNudge(runBd, appLog));
      board.setCostGetter(() => resolveSeatModels(costPreset, config2.presets));
    } catch (e) {
      safeWarn(appLog, "tgo: cost surface init failed", { error: String(e) });
    }
  }
  const concision = new ConcisionController({
    enabled: config2.style?.enabled ?? true,
    cardId: config2.style?.card ? delegationStyleToVoiceCardId(config2.style.card) : "tgo-default",
    log: appLog
  });
  const styleReinforcement = new StyleReinforcementController({
    enabled: config2.style?.enabled ?? true,
    productionEnabled: config2.style?.reinforcement ?? false,
    cardId: config2.style?.card ? delegationStyleToVoiceCardId(config2.style.card) : "tgo-default",
    log: appLog
  });
  const fit = new TaskFitController;
  const runToolStarts = new Map;
  const sessionToRunId = new Map;
  const heartbeatIntervals = new Map;
  function sanitizeCmdForRun(cmd) {
    return cmd.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").slice(0, 500);
  }
  function extractCmd(tool2, args) {
    if (!args || typeof args !== "object")
      return;
    const obj = args;
    const lower = tool2.toLowerCase();
    if (lower.includes("bash")) {
      const c = obj.command ?? obj.cmd ?? obj.input;
      if (typeof c === "string" && c.trim())
        return sanitizeCmdForRun(c);
    }
    if (lower === "edit" || lower === "write" || lower === "multiedit") {
      const p = obj.filePath ?? obj.path ?? obj.target;
      if (typeof p === "string" && p.trim())
        return sanitizeCmdForRun(p);
    }
    return;
  }
  function startHeartbeat(repoRoot, runId, seat) {
    if (heartbeatIntervals.has(runId))
      return;
    const interval = setInterval(() => {
      (async () => {
        try {
          await appendRunEvent(repoRoot, runId, {
            ts: Date.now(),
            type: "heartbeat",
            seat,
            tool: "heartbeat",
            argsHash: hashArgs({}),
            ok: true,
            issueId: runId,
            note: "heartbeat"
          });
        } catch {}
      })();
    }, 30000);
    if (interval.unref)
      interval.unref();
    heartbeatIntervals.set(runId, interval);
  }
  function stopHeartbeat(runId) {
    const iv = heartbeatIntervals.get(runId);
    if (iv) {
      clearInterval(iv);
      heartbeatIntervals.delete(runId);
    }
  }
  const watchdog = new WatchdogController(config2.watchdog, {
    log: appLog,
    abort: async (sessionID, reason) => {
      try {
        const runId = sessionToRunId.get(sessionID);
        if (runId) {
          const seat = board.shimState.agents.get(sessionID) ?? "dylan";
          const repoRoot2 = directory ?? worktree ?? project?.worktree ?? ".";
          await appendRunEvent(repoRoot2, runId, {
            ts: Date.now(),
            type: "status",
            seat,
            tool: "task",
            argsHash: hashArgs({ reason }),
            ok: false,
            issueId: runId,
            note: "aborted"
          });
          try {
            stopHeartbeat(runId);
          } catch {}
        }
      } catch {}
      await client.session.abort({ path: { id: sessionID } });
      try {
        const repoRoot = directory ?? worktree ?? project?.worktree ?? ".";
        await persistAbortHandback({
          repoRoot,
          sessionID,
          reason,
          log: appLog,
          fetchSessionMessages: async (id) => {
            const raw = await client.session.messages({ path: { id } });
            const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : undefined;
            if (!arr)
              return;
            return arr.map((m) => ({ role: m?.info?.role, parts: Array.isArray(m?.parts) ? m.parts : [] }));
          }
        });
      } catch (e) {
        appLog("warn", `progress handback failed: ${String(e)}`);
      }
    },
    notifyParent: async (parentID, text) => {
      await client.session.prompt({
        path: { id: parentID },
        body: {
          parts: [{ type: "text", text, synthetic: true }]
        }
      });
    }
  });
  try {
    board.setWatchdogGetter(() => watchdog.tracked);
    board.setWatchdogProblemsGetter(() => watchdog.getProblems?.() ?? []);
    board.setRunsConfig({
      maxAgeMs: config2.runs?.maxAgeMs,
      maxBytes: config2.runs?.maxBytes,
      maxFiles: config2.runs?.maxFiles,
      heartbeatThresholdMs: config2.runs?.heartbeatThresholdMs
    });
  } catch {}
  (async () => {
    const repoRoot = directory ?? worktree ?? project?.worktree ?? ".";
    try {
      await pruneRuns(repoRoot, {
        maxAgeMs: config2.runs?.maxAgeMs,
        maxBytes: config2.runs?.maxBytes,
        maxFiles: config2.runs?.maxFiles,
        heartbeatThresholdMs: config2.runs?.heartbeatThresholdMs,
        log: appLog
      });
    } catch {}
    try {
      const flags = await scanRunsForProblems(repoRoot, {
        heartbeatThresholdMs: config2.runs?.heartbeatThresholdMs,
        log: appLog
      });
      if (flags.length > 0) {
        const { problemsFromRecovery: problemsFromRecovery2 } = await Promise.resolve().then(() => (init_metrics(), exports_metrics));
        const problems = problemsFromRecovery2(flags);
        try {
          board.setProblems(problems);
        } catch {}
        appLog("warn", `tgo: recovery scan flagged ${flags.length} runs`, { flags });
      }
    } catch (e) {
      safeWarn(appLog, `recovery scan failed: ${String(e)}`);
    }
  })();
  const delegatedSessionIds = new Set;
  const completionSignals = new Map;
  const terminationParentIds = new Map;
  const delegationStyleBySession = new Map;
  const resolvedVoiceCardBySession = new Map;
  const pendingDelegationStyleByParentSession = new Map;
  function rememberDelegationStyleForSession(sessionID, packet) {
    const raw = packet.style;
    if (typeof raw === "string" && isDelegationStyle(raw)) {
      delegationStyleBySession.set(sessionID, raw);
      resolvedVoiceCardBySession.set(sessionID, delegationStyleToVoiceCardId(raw));
      pendingDelegationStyleByParentSession.set(sessionID, raw);
    }
  }
  const worktreeLaneBySession = new Map;
  const pendingWorktreeLaneByParentSession = new Map;
  const pendingWorktreeLaneByIssue = new Map;
  function rememberWorktreeLaneForDelegation(packet, parentSessionId, repoRoot) {
    const laneRaw = packet.lane;
    if (laneRaw === undefined)
      return;
    if (laneRaw !== "worktree" && laneRaw !== "inline")
      return;
    const lane = laneRaw;
    if (lane !== "worktree")
      return;
    const issueIdRaw = packet.issueId;
    if (typeof issueIdRaw !== "string")
      return;
    const issueId = issueIdRaw.trim();
    if (!issueId || !isValidBeadID(issueId))
      return;
    const worktreePath = worktreePathForIssue(repoRoot, issueId);
    pendingWorktreeLaneByParentSession.set(parentSessionId, { lane, issueId, worktreePath });
    pendingWorktreeLaneByIssue.set(issueId, { lane, issueId });
  }
  async function captureWorktreeLaneForChildSession(childSessionId, issueId, repoRoot) {
    const pending = pendingWorktreeLaneByIssue.get(issueId);
    if (!pending || pending.lane !== "worktree")
      return;
    if (!isValidBeadID(issueId))
      return;
    const worktreePath = worktreePathForIssue(repoRoot, issueId);
    worktreeLaneBySession.set(childSessionId, { lane: "worktree", issueId, worktreePath });
    try {
      await ensureWorktreeExists({ repoRoot, issueId, worktreePath, log: appLog });
    } catch (e) {
      safeWarn(appLog, `worktree lane after-capture ensure failed for ${issueId}: ${String(e)}`);
    }
    pendingWorktreeLaneByIssue.delete(issueId);
  }
  async function captureWorktreeLaneForChildSessionViaParent(childSessionId, parentSessionId, repoRoot) {
    const pending = pendingWorktreeLaneByParentSession.get(parentSessionId);
    if (!pending || pending.lane !== "worktree")
      return;
    if (!isValidBeadID(pending.issueId)) {
      pendingWorktreeLaneByParentSession.delete(parentSessionId);
      return;
    }
    const { issueId, worktreePath } = pending;
    worktreeLaneBySession.set(childSessionId, { lane: "worktree", issueId, worktreePath });
    try {
      await ensureWorktreeExists({ repoRoot, issueId, worktreePath, log: appLog });
    } catch (e) {
      safeWarn(appLog, `worktree lane session.created ensure failed for ${issueId}: ${String(e)}`);
    }
    pendingWorktreeLaneByParentSession.delete(parentSessionId);
    pendingWorktreeLaneByIssue.delete(issueId);
  }
  async function enforceWorktreeLaneBeforeHook(input, output) {
    const entry = worktreeLaneBySession.get(input.sessionID);
    if (!entry || entry.lane !== "worktree")
      return;
    const repoRoot = directory ?? worktree ?? project?.worktree ?? ".";
    const worktreePath = entry.worktreePath;
    try {
      await ensureWorktreeExists({ repoRoot, issueId: entry.issueId, worktreePath, log: appLog });
    } catch (e) {
      safeWarn(appLog, `worktree lane ensure failed for ${entry.issueId}: ${String(e)}`);
    }
    const shouldBlock = shouldBlockOutsideWorktree({
      tool: input.tool,
      args: output.args,
      worktreePath,
      repoRoot
    });
    if (shouldBlock.block) {
      const msg = buildWorktreeViolationMessage({
        sessionID: input.sessionID,
        tool: input.tool,
        target: shouldBlock.target,
        worktreePath,
        issueId: entry.issueId
      });
      throw new Error(msg);
    }
  }
  watchdog.setHydrationPending(true);
  try {
    const repoRoot = directory ?? worktree ?? project?.worktree ?? ".";
    let all = [];
    try {
      all = await listAllAwaits(repoRoot);
      const sessionIds = [];
      for (const rec of all) {
        if (rec.sessionId)
          sessionIds.push(rec.sessionId);
        else {
          try {
            const map2 = await loadSessionMap(repoRoot);
            const sid = map2[rec.issueId]?.sessionId;
            if (sid)
              sessionIds.push(sid);
          } catch {}
        }
      }
      if (sessionIds.length > 0)
        watchdog.hydrateSuspended(sessionIds);
    } catch (e) {
      safeWarn(appLog, `suspend hydration failed: ${String(e)}`);
    }
    try {
      const expired = await scanExpiredAwaits(repoRoot, appLog);
      for (const rec of expired) {
        if (rec.sessionId)
          watchdog.markResumed(rec.sessionId);
        try {
          const map2 = await loadSessionMap(repoRoot);
          const sid = map2[rec.issueId]?.sessionId;
          if (sid)
            watchdog.markResumed(sid);
        } catch {}
        appLog("warn", `tgo: expired await ${rec.issueId} transitioned to expired state (removed from suspended set, kept for board)`, {
          issueId: rec.issueId,
          until: rec.until
        });
      }
    } catch (e) {
      safeWarn(appLog, `timer catch-up failed: ${String(e)}`);
    }
  } finally {
    watchdog.markHydrationDone();
  }
  const setup = new SetupController({
    run: async (command, cwd) => {
      try {
        const args = command.split(/\s+/);
        const proc = cwd ? $`${args}`.cwd(cwd) : $`${args}`;
        const completed = await proc.env({ ...process.env, BD_NON_INTERACTIVE: "1", HOME: os4.homedir() }).nothrow();
        return {
          exitCode: completed.exitCode,
          stdout: completed.stdout.toString(),
          stderr: completed.stderr.toString()
        };
      } catch (error51) {
        return { exitCode: 1, stdout: "", stderr: String(error51) };
      }
    },
    hasBd: async () => (Bun.which("bd") ?? null) !== null,
    installBd: config2.setup?.autoInstallBeads === false ? undefined : async () => {
      const beads = DEPENDENCIES.find((d) => d.name === "beads");
      if (!beads)
        return;
      const statuses = [
        {
          name: beads.name,
          kind: beads.kind,
          summary: beads.summary,
          present: false,
          install: beads.install,
          url: beads.url
        }
      ];
      await installMissing(statuses, async (cmd) => {
        await runShellCommand(cmd);
      });
    }
  });
  const debugEvents = process.env.TGO_DEBUG_EVENTS === "1";
  const logEvent = (type, id, extra) => {
    if (!debugEvents)
      return;
    appLog("info", `event ${type} ${id}`, extra);
  };
  const handleSessionCreated = async (info) => {
    if (config2.setup?.enabled === false)
      return;
    if (info.parentID != null)
      return;
    const resolvedDirectory = info.directory ?? directory;
    if (!resolvedDirectory || resolvedDirectory === "/")
      return;
    try {
      const result = await setup.maybeSetup(resolvedDirectory);
      if (result.action === "completed") {
        appLog("info", `per-repo setup: ${result.steps.join(" → ")} (${resolvedDirectory})`);
      }
    } catch (error51) {
      appLog("warn", `per-repo setup failed: ${String(error51)}`);
    }
  };
  return {
    tool: {
      tgo_beads_snapshot: tool({
        description: "Render a read-only Beads work snapshot for the primary session.",
        args: {},
        async execute(_args, context) {
          if (config2.board?.enabled === false) {
            return "Beads snapshot disabled by configuration.";
          }
          const session = await client.session.get({ path: { id: context.sessionID } });
          if (!isPrimarySessionData(session.data)) {
            return "Beads snapshot is available only from a primary session.";
          }
          return renderBeadsTui(await loadBeadsTui(runBd));
        }
      }),
      tgo_wait_for_user: tool({
        description: "Suspend current task awaiting human input — durable wait gate (file-based, survives restart). Provide resumeSchema describing expected reply shape.",
        args: {
          issueId: tool.schema.string(),
          reason: tool.schema.string(),
          suspendSchema: tool.schema.string(),
          suspendPayload: tool.schema.string(),
          resumeSchema: tool.schema.string(),
          until: tool.schema.string().optional()
        },
        async execute(args, context) {
          const repoRoot = directory ?? worktree ?? project?.worktree ?? ".";
          const issueId = String(args.issueId ?? "").trim();
          const reason = String(args.reason ?? "awaiting human").trim();
          let suspendSchema;
          let suspendPayload;
          let resumeSchema;
          const rawSuspendSchema = args.suspendSchema;
          if (typeof rawSuspendSchema !== "string" || rawSuspendSchema.trim().length === 0)
            throw new Error("suspendSchema is required and must be a valid JSON string");
          try {
            suspendSchema = JSON.parse(rawSuspendSchema);
          } catch (e) {
            throw new Error(`invalid JSON for suspendSchema: ${String(e)}`);
          }
          const rawSuspendPayload = args.suspendPayload;
          if (typeof rawSuspendPayload !== "string" || rawSuspendPayload.trim().length === 0)
            throw new Error("suspendPayload is required and must be a valid JSON string");
          try {
            suspendPayload = JSON.parse(rawSuspendPayload);
          } catch (e) {
            throw new Error(`invalid JSON for suspendPayload: ${String(e)}`);
          }
          const rawResumeSchema = args.resumeSchema;
          if (typeof rawResumeSchema !== "string" || rawResumeSchema.trim().length === 0)
            throw new Error("resumeSchema is required and must be a valid JSON string");
          try {
            resumeSchema = JSON.parse(rawResumeSchema);
          } catch (e) {
            throw new Error(`invalid JSON for resumeSchema: ${String(e)}`);
          }
          if (!resumeSchema || typeof resumeSchema !== "object" || Array.isArray(resumeSchema))
            throw new Error("resumeSchema must be a non-null object");
          const until = args.until ? String(args.until) : undefined;
          assertValidBeadID(issueId);
          const result = await suspend({
            repoRoot,
            issueId,
            suspendSchema,
            suspendPayload,
            resumeSchema,
            reason,
            until,
            sessionId: context.sessionID
          });
          if (result.written) {
            watchdog.markSuspended(context.sessionID);
            try {
              board.invalidate(context.sessionID);
            } catch {}
            return `suspended ${issueId}: ⏸ awaiting human: ${reason} — reply with: ${getRequiredFields(resumeSchema).join(", ") || "response"}`;
          } else {
            return `already suspended ${issueId}`;
          }
        }
      }),
      tgo_plan_manifest: tool({
        description: "Write .tgo/manifest.json at PLAN time — validates and pairwise checks same-parallelSet scope overlaps; typed error on conflict (refuse write). Primary-seat only.",
        args: {
          manifestJson: tool.schema.string()
        },
        async execute(args, context) {
          const repoRoot = directory ?? worktree ?? project?.worktree ?? ".";
          const authorized = await authorizeLifecycleSession(client, context.sessionID);
          if (!authorized) {
            throw new Error("tgo_plan_manifest is primary-seat only — delegated seats are read-only for manifests");
          }
          const raw = String(args.manifestJson ?? "").trim();
          if (!raw)
            throw new Error("manifestJson is required and must be a valid JSON string");
          let parsed;
          try {
            parsed = JSON.parse(raw);
          } catch (e) {
            throw new Error(`invalid JSON for manifestJson: ${String(e)}`);
          }
          try {
            const written = await planManifest(repoRoot, parsed);
            try {
              board.invalidate(context.sessionID);
            } catch {}
            return `manifest written: ${MANIFEST_REL_PATH} (${written.waves.length} waves)`;
          } catch (e) {
            if (e instanceof ManifestScopeConflictError) {
              throw new Error(`MANIFEST_SCOPE_CONFLICT: ${e.message}`);
            }
            throw e;
          }
        }
      }),
      tgo_land_convoy: tool({
        description: "Land a convoy: validate .tgo/convoy/.state.json, run per-bead exit-gate checks, then merge wave worktrees in wave order. Primary-seat only. Pass completedIssueIds (comma-separated) to mark complete before landing.",
        args: {
          completedIssueIds: tool.schema.string().optional()
        },
        async execute(args, context) {
          const repoRoot = directory ?? worktree ?? project?.worktree ?? ".";
          const authorized = await authorizeLifecycleSession(client, context.sessionID);
          if (!authorized)
            throw new Error("tgo_land_convoy is primary-seat only — delegated seats cannot land convoys");
          const rawIds = String(args.completedIssueIds ?? "").trim();
          const ids = rawIds ? rawIds.split(",").map((s) => s.trim()).filter(Boolean) : [];
          if (ids.length > 0) {
            try {
              await markWaveComplete(repoRoot, ids);
            } catch (e) {
              throw new Error(`mark complete failed: ${String(e)}`);
            }
          }
          const mergeBranch = async (branch) => {
            try {
              const proc = Bun.spawn(["git", "merge", "--no-ff", "-m", `tgo-convoy: land ${branch}`, branch], { cwd: repoRoot, stdout: "pipe", stderr: "pipe" });
              const code = await proc.exited;
              const stderr = await new Response(proc.stderr).text();
              return { ok: code === 0, err: stderr.trim().slice(0, 400) };
            } catch (e) {
              return { ok: false, err: String(e) };
            }
          };
          const result = await landConvoy(repoRoot, {
            gateCheck: async (issueId) => {
              let specText = "";
              try {
                specText = await runBd(`bd show ${issueId} --json`);
              } catch {}
              try {
                const g = await checkCloseGate(repoRoot, issueId, specText);
                if (!g.allowed)
                  return { ok: false, reason: "exit gate blocked" };
              } catch (e) {
                return { ok: false, reason: `gate check failed: ${String(e)}` };
              }
              return { ok: true };
            },
            mergeWorktree: async (_wave, beadIssueIds) => {
              for (const id of beadIssueIds) {
                const m = await mergeBranch(worktreeBranchForIssue(id));
                if (!m.ok)
                  throw new Error(`merge failed for ${id} (${worktreeBranchForIssue(id)}): ${m.err ?? "unknown"}`);
              }
            }
          });
          try {
            board.invalidate(context.sessionID);
          } catch {}
          if (!result.landed)
            return `convoy landing aborted: ${result.reason}`;
          return `convoy landed (waves [${result.mergedWaves.join(", ")}])`;
        }
      }),
      tgo_init_convoy: tool({
        description: "Create/overwrite a convoy state file at .tgo/convoy/.state.json. Input convoyJson is {goal, remainingBudget, waves:[{wave,beads:[{issueId,scope:[...]}]}]}. Validated (max 3 waves, scopeHash computed from scopes). Primary-seat only.",
        args: {
          convoyJson: tool.schema.string()
        },
        async execute(args, context) {
          const repoRoot = directory ?? worktree ?? project?.worktree ?? ".";
          const authorized = await authorizeLifecycleSession(client, context.sessionID);
          if (!authorized)
            throw new Error("tgo_init_convoy is primary-seat only");
          const raw = String(args.convoyJson ?? "").trim();
          if (!raw)
            throw new Error("convoyJson is required and must be a valid JSON string");
          let parsed;
          try {
            parsed = JSON.parse(raw);
          } catch (e) {
            throw new Error(`invalid JSON for convoyJson: ${String(e)}`);
          }
          const c = parsed;
          try {
            const state = await initConvoy(repoRoot, {
              goal: String(c.goal ?? ""),
              remainingBudget: Number(c.remainingBudget),
              waves: c.waves ?? []
            });
            try {
              board.invalidate(context.sessionID);
            } catch {}
            return `convoy written: ${CONVOY_STATE_REL} (${state.waves.length} waves, scope ${state.scopeHash})`;
          } catch (e) {
            throw new Error(`CONVOY_INVALID: ${String(e)}`);
          }
        }
      })
    },
    event: async ({ event }) => {
      if (event.type === "message.part.updated") {
        const part = event.properties.part;
        if (part?.sessionID)
          watchdog.noteActivity(part.sessionID);
      } else if (event.type === "session.compacted") {
        board.reset(event.properties.sessionID);
        reconciler.onCompact(event.properties.sessionID);
        concision.reset();
        watchdog.onCompact(event.properties.sessionID);
        logEvent("session.compacted", event.properties.sessionID);
      } else if (event.type === "session.status") {
        reconciler.onStatus(event.properties.sessionID, event.properties.status.type);
        watchdog.noteStatus(event.properties.sessionID, event.properties.status.type);
        board.invalidate(event.properties.sessionID);
        logEvent("session.status", event.properties.sessionID, {
          status: event.properties.status.type
        });
      } else if (event.type === "session.idle") {
        reconciler.onIdle(event.properties.sessionID);
        watchdog.onIdle(event.properties.sessionID);
        board.invalidate(event.properties.sessionID);
        logEvent("session.idle", event.properties.sessionID);
      } else if (event.type === "session.created") {
        const info = event.properties.info;
        logEvent("session.created", info.id ?? "?", {
          parentID: info.parentID ?? null
        });
        watchdog.noteSessionCreated(info);
        try {
          if (info.id && info.parentID) {
            const repoRootWt = directory ?? worktree ?? project?.worktree ?? ".";
            await captureWorktreeLaneForChildSessionViaParent(info.id, info.parentID, repoRootWt);
          }
        } catch {}
        try {
          if (info.id && info.parentID) {
            const pendingStyle = pendingDelegationStyleByParentSession.get(info.parentID);
            if (pendingStyle) {
              delegationStyleBySession.set(info.id, pendingStyle);
              resolvedVoiceCardBySession.set(info.id, delegationStyleToVoiceCardId(pendingStyle));
            }
          }
        } catch {}
        try {
          if (info.id && info.parentID) {
            const parentRunId = sessionToRunId.get(info.parentID);
            if (parentRunId)
              sessionToRunId.set(info.id, parentRunId);
          }
        } catch {}
        try {
          if (info.id && info.parentID && info.parentID !== "")
            delegatedSessionIds.add(info.id);
        } catch {}
        try {
          if (info.id)
            terminationParentIds.set(info.id, info.parentID ?? undefined);
        } catch {}
        try {
          if (info.id && info.parentID)
            onChildCreated(info.id, info.parentID);
        } catch {}
        handleSessionCreated(event.properties.info);
      } else if (event.type === "session.deleted") {
        const deletedInfo = event.properties?.info;
        const deletedId = deletedInfo?.id ?? event.properties?.sessionID ?? event.properties?.id;
        if (deletedId) {
          try {
            delegatedSessionIds.delete(deletedId);
          } catch {}
          try {
            completionSignals.delete(deletedId);
          } catch {}
          try {
            terminationParentIds.delete(deletedId);
          } catch {}
          try {
            worktreeLaneBySession.delete(deletedId);
          } catch {}
          try {
            delegationStyleBySession.delete(deletedId);
          } catch {}
          try {
            resolvedVoiceCardBySession.delete(deletedId);
          } catch {}
          try {
            pendingWorktreeLaneByParentSession.delete(deletedId);
          } catch {}
          try {
            pendingDelegationStyleByParentSession.delete(deletedId);
          } catch {}
          try {
            onSessionDeleted(deletedId);
          } catch {}
          try {
            const runId = sessionToRunId.get(deletedId);
            sessionToRunId.delete(deletedId);
            if (runId)
              stopHeartbeat(runId);
          } catch {}
          try {
            watchdog.markResumed(deletedId);
          } catch {}
          try {
            const repoRoot = directory ?? worktree ?? project?.worktree ?? ".";
            let issueId;
            try {
              const map2 = await loadSessionMap(repoRoot);
              issueId = Object.entries(map2).find(([, v]) => v.sessionId === deletedId)?.[0];
            } catch {}
            if (!issueId) {
              try {
                const all = await listAllAwaits(repoRoot);
                const rec = all.find((r) => r.sessionId === deletedId);
                if (rec)
                  issueId = rec.issueId;
              } catch {}
            }
            if (issueId) {
              try {
                const rec = await readAwaitJson(repoRoot, issueId);
                if (!rec) {} else {
                  const existed = await clearAwaitJson(repoRoot, issueId, rec.createdAt);
                  if (existed) {
                    appLog("info", `tgo: cleared orphaned await for deleted session ${deletedId} / ${issueId}`, { sessionID: deletedId, issueId });
                    try {
                      const { updateProgress: updateProgress2 } = await Promise.resolve().then(() => (init_progress(), exports_progress));
                      const rec2 = { reason: "", resumeSchema: {} };
                      await updateProgress2(repoRoot, issueId, (parts) => ({
                        ...parts,
                        blockers: parts.blockers.filter((b) => !b.startsWith("⏸ awaiting human:"))
                      }));
                    } catch {}
                    try {
                      board.invalidate(deletedId);
                    } catch {}
                  }
                }
              } catch (e) {
                safeWarn(appLog, `tgo: failed to clear orphaned await for ${deletedId}: ${String(e)}`);
              }
            }
          } catch (e) {
            safeWarn(appLog, `tgo: session.deleted suspend cleanup failed: ${String(e)}`);
          }
        }
        logEvent("session.deleted", deletedId ?? "?", {});
      }
    },
    config: async (input) => {
      const active = resolveActivePreset(config2, await readPresetNudge(runBd, appLog));
      const applied = applyPreset({ agent: input.agent }, active, config2.presets);
      appLog("info", `preset "${active}" applied to ${applied.length ? applied.join(", ") : "no seats"}`);
      const worktreeRoot = resolveWorktreeFamily(project?.worktree, worktree, directory);
      const nextPermission = preapproveExternalDirectory(input.permission, worktreeRoot);
      if (nextPermission && Object.keys(nextPermission).length > 0) {
        input.permission = nextPermission;
        const parent = worktreeRoot ? path24.dirname(worktreeRoot) : undefined;
        appLog("info", `pre-approved external_directory for worktree family ${parent}/*`, {
          worktreeRoot,
          projectWorktree: project?.worktree ?? null,
          pluginWorktree: worktree ?? null,
          pluginDirectory: directory ?? null
        });
      }
    },
    "chat.message": async (input, output) => {
      try {
        const repoRoot = directory ?? worktree ?? project?.worktree ?? ".";
        const rawText = output.parts.filter((p) => p.type === "text").map((p) => p.text ?? "").join(`
`).trim();
        if (rawText.length > 0) {
          try {
            const intent = parseReplayIntent(rawText);
            if (intent) {
              const result = await replayStep(repoRoot, intent.runId, intent.stepIndex);
              const summary = `tgo: ${formatReplayResult(result)}`;
              appLog("info", `tgo: ${formatReplayResult(result)}`, { runId: intent.runId, stepIndex: intent.stepIndex });
              try {
                await client.session.prompt({
                  path: { id: input.sessionID },
                  body: { parts: [{ type: "text", text: summary, synthetic: true }] }
                });
              } catch {}
            }
          } catch (e) {
            safeWarn(appLog, "tgo: step replay invocation failed", { error: String(e?.message ?? e) });
          }
        }
        if (rawText.length > 0) {
          let issueId;
          try {
            const map2 = await loadSessionMap(repoRoot);
            issueId = Object.entries(map2).find(([, v]) => v.sessionId === input.sessionID)?.[0];
          } catch {}
          let candidateRecs = [];
          if (issueId) {
            const rec = await readAwaitJson(repoRoot, issueId);
            if (rec)
              candidateRecs = [rec];
          }
          if (candidateRecs.length === 0) {
            try {
              const all = await listAllAwaits(repoRoot);
              const sessionMatched = all.filter((r) => r.sessionId === input.sessionID);
              if (sessionMatched.length > 0)
                candidateRecs = sessionMatched;
              else
                candidateRecs = all;
            } catch {}
          }
          const activeRecs = candidateRecs.filter((r) => !r.expired && !isExpired(r));
          if (activeRecs.length === 0) {
            appLog("info", `tgo: chat pass-through — no active await for ${input.sessionID} (all expired or none)`, { sessionID: input.sessionID });
          } else if (activeRecs.length > 0) {
            const parsed = parseProseReply(rawText);
            const valid = [];
            const invalidDetails = [];
            for (const rec of activeRecs) {
              const v = validateAgainstSchema(parsed, rec.resumeSchema);
              if (v.valid)
                valid.push(rec);
              else {
                const required2 = getRequiredFields(rec.resumeSchema).join(", ") || "response";
                invalidDetails.push(`${rec.issueId}: ${v.errors.join("; ")} — reply with: ${required2}`);
              }
            }
            if (valid.length === 0) {
              appLog("info", `tgo: chat pass-through — no candidate matched for ${input.sessionID} — ${invalidDetails.join(" | ")}`, { sessionID: input.sessionID, candidates: activeRecs.map((r) => r.issueId) });
            } else if (valid.length > 1) {
              const ids = valid.map((r) => r.issueId).join(", ");
              appLog("info", `tgo: chat pass-through — ambiguous matches [${ids}] for ${input.sessionID}, leaving all suspended`, { sessionID: input.sessionID, validIds: ids });
            } else {
              const targetRec = valid[0];
              let wakeSucceeded = true;
              let wakeError;
              const delegatedSid = targetRec.sessionId;
              if (delegatedSid && delegatedSid !== input.sessionID) {
                try {
                  await client.session.prompt({
                    path: { id: delegatedSid },
                    body: { parts: [{ type: "text", text: `Resumed for ${targetRec.issueId} with: ${rawText}`, synthetic: true }] }
                  });
                } catch (e) {
                  wakeSucceeded = false;
                  wakeError = e;
                }
              }
              if (!wakeSucceeded) {
                const hint = `wake failed for ${targetRec.issueId}: ${String(wakeError)} — still awaiting human: ${targetRec.reason} — reply with: ${getRequiredFields(targetRec.resumeSchema).join(", ") || "response"}`;
                appLog("error", hint, { issueId: targetRec.issueId, sessionID: input.sessionID, wakeError: String(wakeError) });
                throw new Error(hint);
              }
              const oldCreatedAt = targetRec.createdAt;
              const cleared = await clearAwaitJson(repoRoot, targetRec.issueId, oldCreatedAt);
              if (!cleared) {
                let isSuperseded = false;
                try {
                  const cur = await readAwaitJson(repoRoot, targetRec.issueId);
                  if (cur && cur.createdAt !== oldCreatedAt)
                    isSuperseded = true;
                } catch {}
                if (isSuperseded) {
                  const hint = `resume aborted — superseded by newer suspend for ${targetRec.issueId}`;
                  appLog("warn", hint, { issueId: targetRec.issueId, oldCreatedAt });
                  throw new Error(hint);
                }
                appLog("info", `tgo: concurrent resume converged for ${targetRec.issueId}`, { issueId: targetRec.issueId, sessionID: input.sessionID });
              } else {
                let isNewer = false;
                try {
                  const cur = await readAwaitJson(repoRoot, targetRec.issueId);
                  if (cur && cur.createdAt !== oldCreatedAt)
                    isNewer = true;
                } catch {}
                if (!isNewer) {
                  const badge = formatSuspendBadge(targetRec);
                  const prefix = `⏸ awaiting human: ${targetRec.reason}`;
                  try {
                    const { updateProgress: updateProgress2 } = await Promise.resolve().then(() => (init_progress(), exports_progress));
                    await updateProgress2(repoRoot, targetRec.issueId, (parts) => {
                      const filtered = parts.blockers.filter((b) => b !== badge && !b.startsWith(prefix));
                      return { ...parts, blockers: filtered };
                    });
                  } catch {}
                } else {
                  appLog("info", `tgo: skip blocker clear — newer suspend detected for ${targetRec.issueId}`, { issueId: targetRec.issueId, oldCreatedAt, newIsNewer: true });
                }
              }
              let shouldMarkResumed = true;
              try {
                const cur2 = await readAwaitJson(repoRoot, targetRec.issueId);
                if (cur2 && cur2.createdAt !== oldCreatedAt)
                  shouldMarkResumed = false;
              } catch {}
              if (shouldMarkResumed) {
                if (delegatedSid)
                  watchdog.markResumed(delegatedSid);
                try {
                  const map2 = await loadSessionMap(repoRoot);
                  const sid2 = map2[targetRec.issueId]?.sessionId;
                  if (sid2)
                    watchdog.markResumed(sid2);
                } catch {}
                watchdog.markResumed(input.sessionID);
              } else {
                appLog("info", `tgo: skip watchdog markResumed — newer suspend for ${targetRec.issueId}`, { issueId: targetRec.issueId });
              }
              appLog("info", `tgo: prose resume succeeded for ${targetRec.issueId}`, { issueId: targetRec.issueId, sessionID: input.sessionID, crossSession: delegatedSid !== input.sessionID });
              try {
                board.invalidate(input.sessionID);
              } catch {}
              if (delegatedSid && delegatedSid !== input.sessionID)
                try {
                  board.invalidate(delegatedSid);
                } catch {}
            }
          }
        }
      } catch (e) {
        const msg = String(e?.message ?? e);
        if (msg.includes("resume validation failed") || msg.includes("ambiguous") || msg.includes("wake failed") || msg.includes("reply with:"))
          throw e;
        safeWarn(appLog, `suspend prose hook failed: ${String(e)}`);
      }
      watchdog.noteActivity(input.sessionID);
      if (config2.setup?.enabled !== false && directory && directory !== "/") {
        try {
          const session = await client.session.get({ path: { id: input.sessionID } });
          const data = session?.data ?? session;
          const parentID = data?.parentID;
          if (parentID == null) {
            const result = await setup.maybeSetup(directory);
            if (result.action === "completed") {
              appLog("info", `per-repo setup (chat fallback): ${result.steps.join(" → ")} (${directory})`);
            }
          }
        } catch (error51) {
          appLog("warn", `per-repo setup fallback failed: ${String(error51)}`);
        }
      }
      const text = output.parts.filter((part) => part.type === "text").map((part) => part.text ?? "").join(`
`);
      styleReinforcement.noteUserMessage(input.sessionID, text);
      if (config2.board?.enabled === false)
        return;
      const agent = output.message.agent ?? input.agent;
      reconciler.noteAgent(input.sessionID, agent);
      await board.gate(client, { sessionID: input.sessionID, agent });
    },
    "tool.execute.before": async (input, output) => {
      try {
        const rawDispatch = output?.args;
        const pktDispatch = rawDispatch?.delegationPacket;
        if (pktDispatch && typeof pktDispatch.lane === "string" && pktDispatch.lane === "worktree") {
          const rr = directory ?? worktree ?? project?.worktree ?? ".";
          rememberWorktreeLaneForDelegation(pktDispatch, input.sessionID, rr);
        }
      } catch {}
      try {
        const rawStyle = output?.args;
        const pktStyle = rawStyle?.delegationPacket;
        if (pktStyle)
          rememberDelegationStyleForSession(input.sessionID, pktStyle);
      } catch {}
      try {
        await enforceWorktreeLaneBeforeHook(input, output);
      } catch (e) {
        throw e;
      }
      try {
        if (config2.termination?.enabled !== false && delegatedSessionIds.has(input.sessionID)) {
          const entry = completionSignals.get(input.sessionID);
          if (entry) {
            const exitGateRequired = entry.exitGateRequired ?? false;
            const shouldTerminate = terminationDecision({ signal: entry.signal, exitGateRequired, toolCallsAfterCompletion: 1 });
            if (shouldTerminate) {
              completionSignals.delete(input.sessionID);
              try {
                await client.session.abort({ path: { id: input.sessionID } });
              } catch {}
              try {
                appLog("info", "termination condition met — stopping residual tool calls");
              } catch {}
              try {
                let parentID = terminationParentIds.get(input.sessionID);
                if (!parentID) {
                  try {
                    const sess = await client.session.get({ path: { id: input.sessionID } });
                    const data = sess?.data;
                    parentID = data?.parentID ?? sess?.parentID ?? undefined;
                  } catch {}
                }
                if (parentID) {
                  const truncated = entry.text.slice(0, 2000);
                  await client.session.prompt({
                    path: { id: parentID },
                    body: { parts: [{ type: "text", text: `TGO TERMINATION: completion declared with exit gate satisfied — residual tool call stopped. Report:

${truncated}`, synthetic: true }] }
                  });
                }
              } catch {}
            }
          }
        }
      } catch {}
      const args = output?.args;
      const delegation = input.tool === "task" ? validateDelegationBoundary(args) : undefined;
      if (delegation && !delegation.valid) {
        appLog("error", "delegation packet rejected", delegation);
        throw new Error(`Invalid ${delegation.route} delegation packet: ${delegation.diagnostics.join(" ")}`);
      }
      if (delegation?.valid && delegation.route !== "tiny") {
        const authorized = await authorizeLifecycleSession(client, input.sessionID);
        if (!authorized) {
          throw new Error("Beads lifecycle packets are allowed only from an identified primary session.");
        }
      }
      let manifestRefusal;
      if (delegation?.valid && input.tool === "task") {
        try {
          const rawArgs = output?.args;
          const packet0 = rawArgs?.delegationPacket;
          if (packet0 && typeof packet0.issueId === "string" && isValidBeadID(packet0.issueId.trim())) {
            const issueId = packet0.issueId.trim();
            const repoRoot = directory ?? worktree ?? project?.worktree ?? ".";
            try {
              const disp = await manifestOnDispatch({ repoRoot, issueId, packet: packet0 });
              if (disp.injected) {
                rawArgs.delegationPacket = disp.packet;
                appLog("info", `manifest onDispatch injected row for ${issueId}`, { issueId, wave: disp.wave });
              }
            } catch (e) {
              safeWarn(appLog, `manifest onDispatch failed: ${String(e)}`);
            }
            try {
              const curPacket = rawArgs.delegationPacket;
              const filt = await manifestMessageFilter({ repoRoot, issueId, packet: curPacket });
              if (filt.filtered) {
                rawArgs.delegationPacket = filt.packet;
                appLog("info", `manifest messageFilter stripped ${filt.stripped?.length} files for ${issueId}`, { issueId, stripped: filt.stripped });
              }
              if (filt.refused)
                manifestRefusal = filt.refused;
            } catch (e) {
              safeWarn(appLog, `manifest messageFilter failed: ${String(e)}`);
            }
          }
        } catch (e) {
          safeWarn(appLog, `manifest hooks (dispatch/filter) failed: ${String(e)}`);
        }
      }
      if (manifestRefusal)
        throw new Error(manifestRefusal);
      if (input.tool === "task" && config2.recursion?.enabled !== false) {
        try {
          const rawRec = output?.args;
          const pktRec = rawRec?.delegationPacket;
          const issueIdRec = pktRec && typeof pktRec.issueId === "string" && isValidBeadID(pktRec.issueId.trim()) ? pktRec.issueId.trim() : null;
          const check2 = checkSpawnAllowed(input.sessionID, issueIdRec, config2.recursion);
          if (!check2.allowed) {
            appLog("warn", `tgo-wpl: spawn blocked — ${check2.reason}`, { sessionID: input.sessionID, issueId: issueIdRec, depth: check2.depth });
            throw new Error(`Delegation blocked: ${check2.reason}`);
          }
          recordDispatch(input.sessionID, issueIdRec);
        } catch (e) {
          throw e;
        }
      }
      if (delegation?.valid && input.tool === "task") {
        try {
          const rawArgs = output?.args;
          const packet = rawArgs?.delegationPacket && typeof rawArgs.delegationPacket === "object" ? rawArgs.delegationPacket : undefined;
          if (packet && typeof packet.issueId === "string" && packet.issueId.trim().length > 0) {
            const issueId = packet.issueId.trim();
            if (!isValidBeadID(issueId)) {
              throw new Error(`invalid issueId "${issueId}" — must match VALID_BEAD_ID`);
            }
            const repoRoot = directory ?? worktree ?? project?.worktree ?? ".";
            const useLatest = packet.useLatestDefinitions === true;
            if (useLatest) {
              const map2 = await loadSessionMap(repoRoot);
              const prior = map2[issueId];
              if (prior?.sessionId) {
                try {
                  await client.session.abort({ path: { id: prior.sessionId } });
                } catch (e) {
                  throw new Error(`useLatestDefinitions abort failed for ${issueId}: ${String(e)}`);
                }
              }
            }
            const memories = await readPresetNudge(runBd, appLog);
            const activePreset = resolveActivePreset(config2, memories);
            if (!activePreset || activePreset.trim().length === 0) {
              throw new Error(`host-authoritative preset resolution failed — active preset empty`);
            }
            let seatName;
            try {
              const subagentRaw = rawArgs?.subagent_type;
              if (typeof subagentRaw === "string" && subagentRaw.trim().length > 0)
                seatName = subagentRaw.trim();
            } catch {}
            if (!seatName || seatName.trim().length === 0) {
              throw new Error(`host-authoritative seat resolution failed for preset "${activePreset}" — subagent_type missing`);
            }
            let model;
            const presetMap = config2.presets?.[activePreset];
            if (!presetMap) {
              throw new Error(`host-authoritative model resolution failed for preset "${activePreset}" seat "${seatName}" — preset not found`);
            }
            const direct = presetMap[seatName];
            if (direct?.model)
              model = direct.model;
            else if (["cobain", "grohl", "novoselic"].includes(seatName) && presetMap["band-members"]?.model) {
              model = presetMap["band-members"].model;
            }
            if (!model || model === "unknown" || model.trim().length === 0) {
              throw new Error(`host-authoritative model resolution failed for preset "${activePreset}" seat "${seatName}"`);
            }
            let seatFrontmatter = "";
            let seatFileFound = false;
            try {
              const seatDir2 = resolveAgentsDir({ agentDir: config2.agentDir });
              const p = path24.join(seatDir2, `${seatName}.md`);
              try {
                const fsMod = await import("node:fs/promises");
                seatFrontmatter = await fsMod.readFile(p, "utf-8");
                seatFileFound = true;
              } catch (e) {
                const code = e?.code;
                if (code === "ENOENT") {
                  seatFileFound = false;
                  seatFrontmatter = "";
                } else {
                  seatFileFound = false;
                  seatFrontmatter = "";
                }
              }
            } catch {
              seatFileFound = false;
              seatFrontmatter = "";
            }
            await ensureDefSnapshot({
              repoRoot,
              issueId,
              packet,
              seatFrontmatter,
              seatFileFound,
              model,
              preset: activePreset,
              useLatestDefinitions: useLatest
            });
          }
        } catch (e) {
          safeWarn(appLog, `def-snapshot capture failed: ${String(e)}`);
          throw e;
        }
      }
      try {
        if (delegation?.valid && input.tool === "task") {
          const rawArgs2 = output?.args;
          const pkt2 = rawArgs2?.delegationPacket;
          if (pkt2) {
            const rr2 = directory ?? worktree ?? project?.worktree ?? ".";
            rememberWorktreeLaneForDelegation(pkt2, input.sessionID, rr2);
          }
        }
      } catch {}
      const background = output?.args != null && typeof output.args === "object" && output.args.background === true;
      watchdog.noteToolStart(input.sessionID, background, input.tool, output?.args);
      (async () => {
        try {
          const repoRoot = directory ?? worktree ?? project?.worktree ?? ".";
          let runId;
          let incomingRunId;
          try {
            const rawArgs = output?.args;
            const packet = rawArgs?.delegationPacket;
            if (packet && typeof packet.issueId === "string" && isValidBeadID(packet.issueId.trim())) {
              incomingRunId = packet.issueId.trim();
            }
          } catch {}
          if (incomingRunId) {
            runId = incomingRunId;
            sessionToRunId.set(input.sessionID, runId);
          } else {
            if (sessionToRunId.has(input.sessionID))
              runId = sessionToRunId.get(input.sessionID);
            if (!runId) {
              try {
                const map2 = await loadSessionMap(repoRoot);
                for (const [iid, entry] of Object.entries(map2)) {
                  if (entry.sessionId === input.sessionID) {
                    runId = iid;
                    break;
                  }
                }
              } catch {}
            }
            if (!runId || !isValidBeadID(runId))
              return;
            if (input.tool === "task") {
              sessionToRunId.set(input.sessionID, runId);
            } else if (!sessionToRunId.has(input.sessionID)) {
              sessionToRunId.set(input.sessionID, runId);
            }
          }
          if (!runId || !isValidBeadID(runId))
            return;
          const seat = board.shimState.agents.get(input.sessionID) ?? "dylan";
          const argsHash = hashArgs(output?.args);
          const ts = Date.now();
          const cmd = extractCmd(input.tool, output?.args);
          runToolStarts.set(`${runId}:${input.tool}:${ts}`, ts);
          runToolStarts.set(`${runId}:${input.tool}:last`, ts);
          await appendRunEvent(repoRoot, runId, {
            ts,
            type: "step",
            seat,
            tool: input.tool,
            argsHash,
            ok: true,
            issueId: runId,
            note: `start ${input.tool}`,
            ...cmd ? { cmd } : {}
          });
          try {
            await appendRunEvent(repoRoot, runId, {
              ts,
              type: "heartbeat",
              seat,
              tool: "heartbeat",
              argsHash: hashArgs({}),
              ok: true,
              issueId: runId,
              note: "heartbeat"
            });
          } catch {}
          if (input.tool === "task") {
            try {
              startHeartbeat(repoRoot, runId, seat);
            } catch {}
          }
        } catch {}
      })();
    },
    "tool.execute.after": async (input, output) => {
      const background = input.args != null && typeof input.args === "object" && input.args.background === true;
      const isProgress = input.tool === "edit";
      watchdog.noteToolEnd(input.sessionID, background, isProgress);
      watchdog.noteActivity(input.sessionID);
      (async () => {
        try {
          const repoRoot = directory ?? worktree ?? project?.worktree ?? ".";
          let runId;
          if (sessionToRunId.has(input.sessionID))
            runId = sessionToRunId.get(input.sessionID);
          if (!runId) {
            try {
              const argsRec = input.args;
              const packet = argsRec?.delegationPacket;
              if (packet && typeof packet.issueId === "string" && isValidBeadID(packet.issueId.trim())) {
                runId = packet.issueId.trim();
              }
            } catch {}
          }
          if (!runId) {
            try {
              const map2 = await loadSessionMap(repoRoot);
              for (const [iid, entry] of Object.entries(map2)) {
                if (entry.sessionId === input.sessionID) {
                  runId = iid;
                  break;
                }
              }
            } catch {}
          }
          if (!runId || !isValidBeadID(runId))
            return;
          if (input.tool === "task") {
            sessionToRunId.set(input.sessionID, runId);
          } else if (!sessionToRunId.has(input.sessionID)) {
            sessionToRunId.set(input.sessionID, runId);
          }
          const seat = board.shimState.agents.get(input.sessionID) ?? "dylan";
          const lastKey = `${runId}:${input.tool}:last`;
          const startTs = runToolStarts.get(lastKey);
          const nowTs = Date.now();
          const durationMs = startTs ? nowTs - startTs : undefined;
          if (startTs)
            runToolStarts.delete(lastKey);
          const cmd = extractCmd(input.tool, input.args);
          const argsHash = hashArgs(input.args);
          const okStep = !output?.error;
          await appendRunEvent(repoRoot, runId, {
            ts: nowTs,
            type: "step",
            seat,
            tool: input.tool,
            argsHash,
            ok: okStep,
            issueId: runId,
            durationMs,
            note: `end ${input.tool}`,
            ...cmd ? { cmd } : {}
          });
          if (input.tool === "task") {
            let childSid;
            try {
              const meta3 = output?.metadata;
              if (meta3 && typeof meta3.sessionId === "string" && meta3.sessionId.trim())
                childSid = meta3.sessionId.trim();
            } catch {}
            if (!childSid) {
              try {
                const outText = typeof output?.output === "string" ? output.output : "";
                const m = outText.match(/ses_[A-Za-z0-9]+/);
                if (m)
                  childSid = m[0];
              } catch {}
            }
            if (childSid && /^ses_[A-Za-z0-9]+$/.test(childSid)) {
              sessionToRunId.set(childSid, runId);
              try {
                startHeartbeat(repoRoot, runId, seat);
              } catch {}
            }
            try {
              const outText = typeof output?.output === "string" ? output.output : "";
              let terminal = "complete";
              let okTerminal = true;
              if (outText) {
                try {
                  const report = parseTaskReport(outText);
                  if (!report.valid) {
                    terminal = "failed";
                    okTerminal = false;
                  } else if (report.status === "failed" || report.status === "tripwire") {
                    terminal = "failed";
                    okTerminal = false;
                  } else if (report.status === "bail") {
                    terminal = "aborted";
                    okTerminal = false;
                  } else if (report.watchdogAborted) {
                    terminal = "aborted";
                    okTerminal = false;
                  }
                } catch {
                  terminal = okStep ? "complete" : "failed";
                  okTerminal = okStep;
                }
              } else {
                terminal = okStep ? "complete" : "failed";
                okTerminal = okStep;
              }
              await appendRunEvent(repoRoot, runId, {
                ts: Date.now(),
                type: "status",
                seat,
                tool: "task",
                argsHash: hashArgs(input.args),
                ok: okTerminal,
                issueId: runId,
                note: terminal,
                ...cmd ? { cmd } : {}
              });
              stopHeartbeat(runId);
            } catch {}
          }
        } catch {}
      })();
      if (reuseCapability.supported) {
        await captureDelegationSession({ tool: input.tool, input, output, repoRoot: directory ?? worktree ?? project?.worktree ?? ".", enabled: config2.sessionReuse?.enabled !== false, log: appLog });
      }
      try {
        if (input.tool === "task") {
          const repoRootWt = directory ?? worktree ?? project?.worktree ?? ".";
          const argsRecWt = input.args;
          const packetWt = argsRecWt?.delegationPacket;
          if (packetWt && typeof packetWt.issueId === "string" && packetWt.lane === "worktree") {
            const issueIdWt = packetWt.issueId.trim();
            if (issueIdWt && isValidBeadID(issueIdWt)) {
              let childSidWt;
              const metaWt = output?.metadata;
              if (metaWt && typeof metaWt.sessionId === "string" && metaWt.sessionId.trim())
                childSidWt = metaWt.sessionId.trim();
              if (!childSidWt) {
                const outTextWt = typeof output?.output === "string" ? output.output : "";
                const mWt = outTextWt.match(/ses_[A-Za-z0-9]+/);
                if (mWt)
                  childSidWt = mWt[0];
              }
              if (childSidWt && /^ses_[A-Za-z0-9]+$/.test(childSidWt)) {
                await captureWorktreeLaneForChildSession(childSidWt, issueIdWt, repoRootWt);
              }
            }
          }
        }
      } catch {}
      try {
        if (input.tool === "task") {
          const pendingStyleAfter = pendingDelegationStyleByParentSession.get(input.sessionID);
          if (pendingStyleAfter) {
            const metaAfter = output?.metadata;
            let childSidAfter;
            if (metaAfter && typeof metaAfter.sessionId === "string" && metaAfter.sessionId.trim())
              childSidAfter = metaAfter.sessionId.trim();
            if (!childSidAfter) {
              const outTextAfter = typeof output?.output === "string" ? output.output : "";
              const mAfter = outTextAfter.match(/ses_[A-Za-z0-9]+/);
              if (mAfter)
                childSidAfter = mAfter[0];
            }
            if (childSidAfter && /^ses_[A-Za-z0-9]+$/.test(childSidAfter)) {
              delegationStyleBySession.set(childSidAfter, pendingStyleAfter);
              resolvedVoiceCardBySession.set(childSidAfter, delegationStyleToVoiceCardId(pendingStyleAfter));
            }
          }
        }
      } catch {}
      if (input.tool === "task" && typeof output?.output === "string") {
        let report = parseTaskReport(output.output);
        if (output && typeof output === "object") {
          const metadata = output.metadata && typeof output.metadata === "object" ? output.metadata : {};
          let effectiveArgsForManifest;
          try {
            effectiveArgsForManifest = input.args && typeof input.args === "object" ? input.args : undefined;
            const pktForManifest = effectiveArgsForManifest?.delegationPacket && typeof effectiveArgsForManifest.delegationPacket === "object" ? effectiveArgsForManifest.delegationPacket : undefined;
            const issueIdForManifest = pktForManifest && typeof pktForManifest.issueId === "string" ? String(pktForManifest.issueId).trim() : undefined;
            if (issueIdForManifest && isValidBeadID(issueIdForManifest)) {
              const repoRoot = directory ?? worktree ?? project?.worktree ?? ".";
              const mc = await manifestOnComplete({ repoRoot, issueId: issueIdForManifest, report });
              if (mc.bail) {
                report = mc.report;
                appLog("warn", `manifest scope mismatch → bail for ${issueIdForManifest}`, { issueId: issueIdForManifest, mismatch: mc.mismatchFiles });
              }
              if (mc.warning)
                appLog("warn", mc.warning, { issueId: issueIdForManifest });
            }
          } catch (e) {
            safeWarn(appLog, `manifest onComplete failed: ${String(e)}`);
          }
          output.metadata = { ...metadata, specialistReport: report };
          const args = input.args && typeof input.args === "object" ? input.args : {};
          const packet = args.delegationPacket && typeof args.delegationPacket === "object" ? args.delegationPacket : {};
          const route = classifyRouting(args).route;
          const lifecycle = {
            ...packet,
            reviewComplete: metadata.reviewComplete
          };
          const closureGate = evaluateClosure(route, lifecycle, report);
          output.metadata.closureGate = closureGate;
          if (route !== "tiny") {
            output.metadata.beadsLifecycle = {
              allowed: false,
              action: "metadata-only",
              diagnostics: ["Metadata validation checks observed claim fields (issueStatusObserved, issueAssigneeObserved, claimExitCode) but does not query or mutate Beads; plugin remains metadata-only until host write path proven."]
            };
          }
          if (route !== "tiny" && shouldRunGate(report)) {
            let issueIdForError;
            try {
              const repoRoot = directory ?? worktree ?? project?.worktree ?? ".";
              const specFields = packet;
              const specText = [
                typeof specFields.Objective === "string" ? specFields.Objective : specFields.Objective !== undefined ? JSON.stringify(specFields.Objective) : "",
                Array.isArray(specFields.Files) ? specFields.Files.join(`
`) : typeof specFields.Files === "string" ? specFields.Files : specFields.Files !== undefined ? JSON.stringify(specFields.Files) : "",
                typeof specFields.Interfaces === "string" ? specFields.Interfaces : specFields.Interfaces !== undefined ? JSON.stringify(specFields.Interfaces) : "",
                typeof specFields.Constraints === "string" ? specFields.Constraints : specFields.Constraints !== undefined ? JSON.stringify(specFields.Constraints) : "",
                typeof specFields.Verification === "string" ? specFields.Verification : specFields.Verification !== undefined ? JSON.stringify(specFields.Verification) : ""
              ].filter((s) => s && s.trim().length > 0).join(`

`);
              const issueId = typeof lifecycle.issueId === "string" && String(lifecycle.issueId).trim().length > 0 ? String(lifecycle.issueId).trim() : typeof specFields.issueId === "string" ? String(specFields.issueId).trim() : undefined;
              issueIdForError = issueId;
              if (issueId) {
                const gateResult = await runExitGate({ repoRoot, issueId, specText: specText || String(specFields.Objective ?? ""), report });
                const merged = evaluateGatedClosure(route, lifecycle, report, {
                  passed: gateResult.passed,
                  blocked: gateResult.blocked,
                  reasonCode: gateResult.reasonCode,
                  reason: gateResult.reason,
                  findings: gateResult.findings,
                  compensation: gateResult.compensation,
                  skipped: gateResult.skipped,
                  skipReason: gateResult.skipReason
                });
                output.metadata.closureGate = merged;
                output.metadata.exitGate = gateResult;
                if (gateResult.blocked) {
                  appLog("warn", "exit gate blocked close", { issueId, reason: gateResult.reason, reasonCode: gateResult.reasonCode, findings: gateResult.findings.length });
                }
              }
            } catch (e) {
              const errMsg = String(e);
              appLog("error", "exit gate evaluation failed — blocking close", { issueId: issueIdForError, error: errMsg });
              const blocked = gateBlockedWithError(String(issueIdForError ?? "unknown"), errMsg);
              const merged = evaluateGatedClosure(route, lifecycle, report, blocked);
              output.metadata.closureGate = merged;
              output.metadata.exitGate = blocked;
            }
          }
        }
        if (!report.valid) {
          appLog("warn", "specialist report requires recovery", {
            sessionID: input.sessionID,
            recovery: report.recovery,
            missing: report.missing,
            malformed: report.malformed,
            contradictions: report.contradictions,
            watchdogAborted: report.watchdogAborted,
            raw: report.raw
          });
        }
      }
      await fit.normalize(input, output);
    },
    "experimental.chat.messages.transform": async (_input, output) => {
      try {
        if (config2.termination?.enabled !== false) {
          const msgs = output.messages;
          let lastAssistantText;
          let sessionID;
          for (let i = msgs.length - 1;i >= 0; i--) {
            const m = msgs[i];
            if (!m)
              continue;
            const role = m.info?.role;
            if (role === "assistant") {
              const text = m.parts.filter((p) => p.type === "text").map((p) => p.text ?? "").join(`
`);
              lastAssistantText = text;
              sessionID = m.info?.sessionID;
              break;
            }
          }
          if (lastAssistantText !== undefined && sessionID !== undefined) {
            if (delegatedSessionIds.has(sessionID)) {
              try {
                const signal = parseCompletionSignal(lastAssistantText);
                if (lastAssistantText.trim().length === 0 || signal.complete === false) {
                  completionSignals.delete(sessionID);
                } else if (signal.complete === true) {
                  let exitGateRequired = false;
                  try {
                    const firstUser = msgs.find((msg) => msg.info?.role === "user");
                    const userText = firstUser ? firstUser.parts.filter((p) => p.type === "text").map((p) => p.text ?? "").join(`
`) : "";
                    exitGateRequired = /"?exitGate"?\s*:\s*true/i.test(userText);
                  } catch {
                    exitGateRequired = false;
                  }
                  completionSignals.set(sessionID, { signal, text: lastAssistantText, exitGateRequired });
                }
              } catch {}
            }
          }
        }
      } catch {}
      if (config2.board?.enabled === false)
        return;
      await board.transform(output.messages);
    },
    "experimental.chat.system.transform": async (input, output) => {
      let effective = config2.style?.card ? delegationStyleToVoiceCardId(config2.style.card) : "tgo-default";
      try {
        if (input.sessionID) {
          const packetStyle = delegationStyleBySession.get(input.sessionID);
          const explicit = styleReinforcement.getStyleOverride?.(input.sessionID);
          effective = explicit ?? (packetStyle ? delegationStyleToVoiceCardId(packetStyle) : config2.style?.card ? delegationStyleToVoiceCardId(config2.style.card) : "tgo-default");
          resolvedVoiceCardBySession.set(input.sessionID, effective);
          concision.cardId = effective;
          concision.instruction = undefined;
          styleReinforcement.cardId = config2.style?.card ? delegationStyleToVoiceCardId(config2.style.card) : "tgo-default";
        }
      } catch {}
      const appended = await concision.transform(client, input, output);
      const reinforced = input.sessionID ? await styleReinforcement.appendPending(client, input.sessionID, output.system) : false;
      if (appended) {
        logEvent("concision.appended", input.sessionID ?? "?", {
          style: effective
        });
      }
      if (reinforced)
        logEvent("style_reinforcement.appended", input.sessionID ?? "?", { style: effective });
    },
    "experimental.text.complete": async (input, output) => {
      const packetStyle = input.sessionID ? delegationStyleBySession.get(input.sessionID) : undefined;
      await styleReinforcement.noteCompletion(client, {
        sessionID: input.sessionID,
        messageID: input.messageID,
        candidate: output.text,
        packetStyle
      });
    },
    dispose: async () => {
      watchdog.dispose();
      styleReinforcement.reset();
      for (const iv of heartbeatIntervals.values())
        try {
          clearInterval(iv);
        } catch {}
      heartbeatIntervals.clear();
      sessionToRunId.clear();
      runToolStarts.clear();
      try {
        worktreeLaneBySession.clear();
      } catch {}
      try {
        pendingWorktreeLaneByIssue.clear();
      } catch {}
      try {
        pendingWorktreeLaneByParentSession.clear();
      } catch {}
      try {
        delegationStyleBySession.clear();
      } catch {}
      try {
        resolvedVoiceCardBySession.clear();
      } catch {}
      try {
        pendingDelegationStyleByParentSession.clear();
      } catch {}
    }
  };
};
var plugin_default = TgoPlugin;
export {
  plugin_default as default,
  TgoPlugin
};
