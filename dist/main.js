// @bun
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __toESM = (mod, isNodeMode, target) => {
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: () => mod[key],
        enumerable: true
      });
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: (newValue) => all[name] = () => newValue
    });
};
var __esm = (fn, res) => () => (fn && (res = fn(fn = 0)), res);
var __require = import.meta.require;

// node_modules/consola/dist/chunks/prompt.mjs
var exports_prompt = {};
__export(exports_prompt, {
  prompt: () => prompt,
  kCancel: () => kCancel
});
import g, { stdin, stdout } from "process";
import f from "readline";
import { WriteStream } from "tty";
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
function requireSrc() {
  if (hasRequiredSrc)
    return src;
  hasRequiredSrc = 1;
  const ESC = "\x1B";
  const CSI = `${ESC}[`;
  const beep = "\x07";
  const cursor = {
    to(x, y) {
      if (!y)
        return `${CSI}${x + 1}G`;
      return `${CSI}${y + 1};${x + 1}H`;
    },
    move(x, y) {
      let ret = "";
      if (x < 0)
        ret += `${CSI}${-x}D`;
      else if (x > 0)
        ret += `${CSI}${x}C`;
      if (y < 0)
        ret += `${CSI}${-y}A`;
      else if (y > 0)
        ret += `${CSI}${y}B`;
      return ret;
    },
    up: (count = 1) => `${CSI}${count}A`,
    down: (count = 1) => `${CSI}${count}B`,
    forward: (count = 1) => `${CSI}${count}C`,
    backward: (count = 1) => `${CSI}${count}D`,
    nextLine: (count = 1) => `${CSI}E`.repeat(count),
    prevLine: (count = 1) => `${CSI}F`.repeat(count),
    left: `${CSI}G`,
    hide: `${CSI}?25l`,
    show: `${CSI}?25h`,
    save: `${ESC}7`,
    restore: `${ESC}8`
  };
  const scroll = {
    up: (count = 1) => `${CSI}S`.repeat(count),
    down: (count = 1) => `${CSI}T`.repeat(count)
  };
  const erase = {
    screen: `${CSI}2J`,
    up: (count = 1) => `${CSI}1J`.repeat(count),
    down: (count = 1) => `${CSI}J`.repeat(count),
    line: `${CSI}2K`,
    lineEnd: `${CSI}K`,
    lineStart: `${CSI}1K`,
    lines(count) {
      let clear = "";
      for (let i = 0;i < count; i++)
        clear += this.line + (i < count - 1 ? cursor.up() : "");
      if (count)
        clear += cursor.left;
      return clear;
    }
  };
  src = { cursor, scroll, erase, beep };
  return src;
}
function requirePicocolors() {
  if (hasRequiredPicocolors)
    return picocolors.exports;
  hasRequiredPicocolors = 1;
  let p = process || {}, argv2 = p.argv || [], env2 = p.env || {};
  let isColorSupported2 = !(!!env2.NO_COLOR || argv2.includes("--no-color")) && (!!env2.FORCE_COLOR || argv2.includes("--color") || p.platform === "win32" || (p.stdout || {}).isTTY && env2.TERM !== "dumb" || !!env2.CI);
  let formatter = (open, close, replace = open) => (input) => {
    let string = "" + input, index = string.indexOf(close, open.length);
    return ~index ? open + replaceClose2(string, close, replace, index) + close : open + string + close;
  };
  let replaceClose2 = (string, close, replace, index) => {
    let result = "", cursor = 0;
    do {
      result += string.substring(cursor, index) + replace;
      cursor = index + close.length;
      index = string.indexOf(close, cursor);
    } while (~index);
    return result + string.substring(cursor);
  };
  let createColors2 = (enabled = isColorSupported2) => {
    let f2 = enabled ? formatter : () => String;
    return {
      isColorSupported: enabled,
      reset: f2("\x1B[0m", "\x1B[0m"),
      bold: f2("\x1B[1m", "\x1B[22m", "\x1B[22m\x1B[1m"),
      dim: f2("\x1B[2m", "\x1B[22m", "\x1B[22m\x1B[2m"),
      italic: f2("\x1B[3m", "\x1B[23m"),
      underline: f2("\x1B[4m", "\x1B[24m"),
      inverse: f2("\x1B[7m", "\x1B[27m"),
      hidden: f2("\x1B[8m", "\x1B[28m"),
      strikethrough: f2("\x1B[9m", "\x1B[29m"),
      black: f2("\x1B[30m", "\x1B[39m"),
      red: f2("\x1B[31m", "\x1B[39m"),
      green: f2("\x1B[32m", "\x1B[39m"),
      yellow: f2("\x1B[33m", "\x1B[39m"),
      blue: f2("\x1B[34m", "\x1B[39m"),
      magenta: f2("\x1B[35m", "\x1B[39m"),
      cyan: f2("\x1B[36m", "\x1B[39m"),
      white: f2("\x1B[37m", "\x1B[39m"),
      gray: f2("\x1B[90m", "\x1B[39m"),
      bgBlack: f2("\x1B[40m", "\x1B[49m"),
      bgRed: f2("\x1B[41m", "\x1B[49m"),
      bgGreen: f2("\x1B[42m", "\x1B[49m"),
      bgYellow: f2("\x1B[43m", "\x1B[49m"),
      bgBlue: f2("\x1B[44m", "\x1B[49m"),
      bgMagenta: f2("\x1B[45m", "\x1B[49m"),
      bgCyan: f2("\x1B[46m", "\x1B[49m"),
      bgWhite: f2("\x1B[47m", "\x1B[49m"),
      blackBright: f2("\x1B[90m", "\x1B[39m"),
      redBright: f2("\x1B[91m", "\x1B[39m"),
      greenBright: f2("\x1B[92m", "\x1B[39m"),
      yellowBright: f2("\x1B[93m", "\x1B[39m"),
      blueBright: f2("\x1B[94m", "\x1B[39m"),
      magentaBright: f2("\x1B[95m", "\x1B[39m"),
      cyanBright: f2("\x1B[96m", "\x1B[39m"),
      whiteBright: f2("\x1B[97m", "\x1B[39m"),
      bgBlackBright: f2("\x1B[100m", "\x1B[49m"),
      bgRedBright: f2("\x1B[101m", "\x1B[49m"),
      bgGreenBright: f2("\x1B[102m", "\x1B[49m"),
      bgYellowBright: f2("\x1B[103m", "\x1B[49m"),
      bgBlueBright: f2("\x1B[104m", "\x1B[49m"),
      bgMagentaBright: f2("\x1B[105m", "\x1B[49m"),
      bgCyanBright: f2("\x1B[106m", "\x1B[49m"),
      bgWhiteBright: f2("\x1B[107m", "\x1B[49m")
    };
  };
  picocolors.exports = createColors2();
  picocolors.exports.createColors = createColors2;
  return picocolors.exports;
}
function J({ onlyFirst: t = false } = {}) {
  const F = ["[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?(?:\\u0007|\\u001B\\u005C|\\u009C))", "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))"].join("|");
  return new RegExp(F, t ? undefined : "g");
}
function T$1(t) {
  if (typeof t != "string")
    throw new TypeError(`Expected a \`string\`, got \`${typeof t}\``);
  return t.replace(Q, "");
}
function O(t) {
  return t && t.__esModule && Object.prototype.hasOwnProperty.call(t, "default") ? t.default : t;
}
function A$1(t, u = {}) {
  if (typeof t != "string" || t.length === 0 || (u = { ambiguousIsNarrow: true, ...u }, t = T$1(t), t.length === 0))
    return 0;
  t = t.replace(FD(), "  ");
  const F = u.ambiguousIsNarrow ? 1 : 2;
  let e2 = 0;
  for (const s of t) {
    const i = s.codePointAt(0);
    if (i <= 31 || i >= 127 && i <= 159 || i >= 768 && i <= 879)
      continue;
    switch (DD.eastAsianWidth(s)) {
      case "F":
      case "W":
        e2 += 2;
        break;
      case "A":
        e2 += F;
        break;
      default:
        e2 += 1;
    }
  }
  return e2;
}
function sD() {
  const t = new Map;
  for (const [u, F] of Object.entries(r)) {
    for (const [e2, s] of Object.entries(F))
      r[e2] = { open: `\x1B[${s[0]}m`, close: `\x1B[${s[1]}m` }, F[e2] = r[e2], t.set(s[0], s[1]);
    Object.defineProperty(r, u, { value: F, enumerable: false });
  }
  return Object.defineProperty(r, "codes", { value: t, enumerable: false }), r.color.close = "\x1B[39m", r.bgColor.close = "\x1B[49m", r.color.ansi = L$1(), r.color.ansi256 = N(), r.color.ansi16m = I(), r.bgColor.ansi = L$1(m), r.bgColor.ansi256 = N(m), r.bgColor.ansi16m = I(m), Object.defineProperties(r, { rgbToAnsi256: { value: (u, F, e2) => u === F && F === e2 ? u < 8 ? 16 : u > 248 ? 231 : Math.round((u - 8) / 247 * 24) + 232 : 16 + 36 * Math.round(u / 255 * 5) + 6 * Math.round(F / 255 * 5) + Math.round(e2 / 255 * 5), enumerable: false }, hexToRgb: { value: (u) => {
    const F = /[a-f\d]{6}|[a-f\d]{3}/i.exec(u.toString(16));
    if (!F)
      return [0, 0, 0];
    let [e2] = F;
    e2.length === 3 && (e2 = [...e2].map((i) => i + i).join(""));
    const s = Number.parseInt(e2, 16);
    return [s >> 16 & 255, s >> 8 & 255, s & 255];
  }, enumerable: false }, hexToAnsi256: { value: (u) => r.rgbToAnsi256(...r.hexToRgb(u)), enumerable: false }, ansi256ToAnsi: { value: (u) => {
    if (u < 8)
      return 30 + u;
    if (u < 16)
      return 90 + (u - 8);
    let F, e2, s;
    if (u >= 232)
      F = ((u - 232) * 10 + 8) / 255, e2 = F, s = F;
    else {
      u -= 16;
      const C = u % 36;
      F = Math.floor(u / 36) / 5, e2 = Math.floor(C / 6) / 5, s = C % 6 / 5;
    }
    const i = Math.max(F, e2, s) * 2;
    if (i === 0)
      return 30;
    let D = 30 + (Math.round(s) << 2 | Math.round(e2) << 1 | Math.round(F));
    return i === 2 && (D += 60), D;
  }, enumerable: false }, rgbToAnsi: { value: (u, F, e2) => r.ansi256ToAnsi(r.rgbToAnsi256(u, F, e2)), enumerable: false }, hexToAnsi: { value: (u) => r.ansi256ToAnsi(r.hexToAnsi256(u)), enumerable: false } }), r;
}
function G(t, u, F) {
  return String(t).normalize().replace(/\r\n/g, `
`).split(`
`).map((e2) => oD(e2, u, F)).join(`
`);
}
function k$1(t, u) {
  if (typeof t == "string")
    return c.aliases.get(t) === u;
  for (const F of t)
    if (F !== undefined && k$1(F, u))
      return true;
  return false;
}
function lD(t, u) {
  if (t === u)
    return;
  const F = t.split(`
`), e2 = u.split(`
`), s = [];
  for (let i = 0;i < Math.max(F.length, e2.length); i++)
    F[i] !== e2[i] && s.push(i);
  return s;
}
function d$1(t, u) {
  const F = t;
  F.isTTY && F.setRawMode(u);
}

class x {
  constructor(u, F = true) {
    h(this, "input"), h(this, "output"), h(this, "_abortSignal"), h(this, "rl"), h(this, "opts"), h(this, "_render"), h(this, "_track", false), h(this, "_prevFrame", ""), h(this, "_subscribers", new Map), h(this, "_cursor", 0), h(this, "state", "initial"), h(this, "error", ""), h(this, "value");
    const { input: e2 = stdin, output: s = stdout, render: i, signal: D, ...C } = u;
    this.opts = C, this.onKeypress = this.onKeypress.bind(this), this.close = this.close.bind(this), this.render = this.render.bind(this), this._render = i.bind(this), this._track = F, this._abortSignal = D, this.input = e2, this.output = s;
  }
  unsubscribe() {
    this._subscribers.clear();
  }
  setSubscriber(u, F) {
    const e2 = this._subscribers.get(u) ?? [];
    e2.push(F), this._subscribers.set(u, e2);
  }
  on(u, F) {
    this.setSubscriber(u, { cb: F });
  }
  once(u, F) {
    this.setSubscriber(u, { cb: F, once: true });
  }
  emit(u, ...F) {
    const e2 = this._subscribers.get(u) ?? [], s = [];
    for (const i of e2)
      i.cb(...F), i.once && s.push(() => e2.splice(e2.indexOf(i), 1));
    for (const i of s)
      i();
  }
  prompt() {
    return new Promise((u, F) => {
      if (this._abortSignal) {
        if (this._abortSignal.aborted)
          return this.state = "cancel", this.close(), u(S);
        this._abortSignal.addEventListener("abort", () => {
          this.state = "cancel", this.close();
        }, { once: true });
      }
      const e2 = new WriteStream(0);
      e2._write = (s, i, D) => {
        this._track && (this.value = this.rl?.line.replace(/\t/g, ""), this._cursor = this.rl?.cursor ?? 0, this.emit("value", this.value)), D();
      }, this.input.pipe(e2), this.rl = f.createInterface({ input: this.input, output: e2, tabSize: 2, prompt: "", escapeCodeTimeout: 50 }), f.emitKeypressEvents(this.input, this.rl), this.rl.prompt(), this.opts.initialValue !== undefined && this._track && this.rl.write(this.opts.initialValue), this.input.on("keypress", this.onKeypress), d$1(this.input, true), this.output.on("resize", this.render), this.render(), this.once("submit", () => {
        this.output.write(srcExports.cursor.show), this.output.off("resize", this.render), d$1(this.input, false), u(this.value);
      }), this.once("cancel", () => {
        this.output.write(srcExports.cursor.show), this.output.off("resize", this.render), d$1(this.input, false), u(S);
      });
    });
  }
  onKeypress(u, F) {
    if (this.state === "error" && (this.state = "active"), F?.name && (!this._track && c.aliases.has(F.name) && this.emit("cursor", c.aliases.get(F.name)), c.actions.has(F.name) && this.emit("cursor", F.name)), u && (u.toLowerCase() === "y" || u.toLowerCase() === "n") && this.emit("confirm", u.toLowerCase() === "y"), u === "\t" && this.opts.placeholder && (this.value || (this.rl?.write(this.opts.placeholder), this.emit("value", this.opts.placeholder))), u && this.emit("key", u.toLowerCase()), F?.name === "return") {
      if (this.opts.validate) {
        const e2 = this.opts.validate(this.value);
        e2 && (this.error = e2 instanceof Error ? e2.message : e2, this.state = "error", this.rl?.write(this.value));
      }
      this.state !== "error" && (this.state = "submit");
    }
    k$1([u, F?.name, F?.sequence], "cancel") && (this.state = "cancel"), (this.state === "submit" || this.state === "cancel") && this.emit("finalize"), this.render(), (this.state === "submit" || this.state === "cancel") && this.close();
  }
  close() {
    this.input.unpipe(), this.input.removeListener("keypress", this.onKeypress), this.output.write(`
`), d$1(this.input, false), this.rl?.close(), this.rl = undefined, this.emit(`${this.state}`, this.value), this.unsubscribe();
  }
  restoreCursor() {
    const u = G(this._prevFrame, process.stdout.columns, { hard: true }).split(`
`).length - 1;
    this.output.write(srcExports.cursor.move(-999, u * -1));
  }
  render() {
    const u = G(this._render(this) ?? "", process.stdout.columns, { hard: true });
    if (u !== this._prevFrame) {
      if (this.state === "initial")
        this.output.write(srcExports.cursor.hide);
      else {
        const F = lD(this._prevFrame, u);
        if (this.restoreCursor(), F && F?.length === 1) {
          const e2 = F[0];
          this.output.write(srcExports.cursor.move(0, e2)), this.output.write(srcExports.erase.lines(1));
          const s = u.split(`
`);
          this.output.write(s[e2]), this._prevFrame = u, this.output.write(srcExports.cursor.move(0, s.length - e2 - 1));
          return;
        }
        if (F && F?.length > 1) {
          const e2 = F[0];
          this.output.write(srcExports.cursor.move(0, e2)), this.output.write(srcExports.erase.down());
          const s = u.split(`
`).slice(e2);
          this.output.write(s.join(`
`)), this._prevFrame = u;
          return;
        }
        this.output.write(srcExports.erase.down());
      }
      this.output.write(u), this.state === "initial" && (this.state = "active"), this._prevFrame = u;
    }
  }
}
function ce() {
  return g.platform !== "win32" ? g.env.TERM !== "linux" : !!g.env.CI || !!g.env.WT_SESSION || !!g.env.TERMINUS_SUBLIME || g.env.ConEmuTask === "{cmd::Cmder}" || g.env.TERM_PROGRAM === "Terminus-Sublime" || g.env.TERM_PROGRAM === "vscode" || g.env.TERM === "xterm-256color" || g.env.TERM === "alacritty" || g.env.TERMINAL_EMULATOR === "JetBrains-JediTerm";
}
async function prompt(message, opts = {}) {
  const handleCancel = (value) => {
    if (typeof value !== "symbol" || value.toString() !== "Symbol(clack:cancel)") {
      return value;
    }
    switch (opts.cancel) {
      case "reject": {
        const error = new Error("Prompt cancelled.");
        error.name = "ConsolaPromptCancelledError";
        if (Error.captureStackTrace) {
          Error.captureStackTrace(error, prompt);
        }
        throw error;
      }
      case "undefined": {
        return;
      }
      case "null": {
        return null;
      }
      case "symbol": {
        return kCancel;
      }
      default:
      case "default": {
        return opts.default ?? opts.initial;
      }
    }
  };
  if (!opts.type || opts.type === "text") {
    return await he({
      message,
      defaultValue: opts.default,
      placeholder: opts.placeholder,
      initialValue: opts.initial
    }).then(handleCancel);
  }
  if (opts.type === "confirm") {
    return await ye({
      message,
      initialValue: opts.initial
    }).then(handleCancel);
  }
  if (opts.type === "select") {
    return await ve({
      message,
      options: opts.options.map((o2) => typeof o2 === "string" ? { value: o2, label: o2 } : o2),
      initialValue: opts.initial
    }).then(handleCancel);
  }
  if (opts.type === "multiselect") {
    return await fe({
      message,
      options: opts.options.map((o2) => typeof o2 === "string" ? { value: o2, label: o2 } : o2),
      required: opts.required,
      initialValues: opts.initial
    }).then(handleCancel);
  }
  throw new Error(`Unknown prompt type: ${opts.type}`);
}
var src, hasRequiredSrc, srcExports, picocolors, hasRequiredPicocolors, picocolorsExports, e, Q, P$1, X, DD, uD = function() {
  return /\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62(?:\uDB40\uDC77\uDB40\uDC6C\uDB40\uDC73|\uDB40\uDC73\uDB40\uDC63\uDB40\uDC74|\uDB40\uDC65\uDB40\uDC6E\uDB40\uDC67)\uDB40\uDC7F|(?:\uD83E\uDDD1\uD83C\uDFFF\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFF\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB-\uDFFE])|(?:\uD83E\uDDD1\uD83C\uDFFE\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFE\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB-\uDFFD\uDFFF])|(?:\uD83E\uDDD1\uD83C\uDFFD\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFD\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|(?:\uD83E\uDDD1\uD83C\uDFFC\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFC\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB\uDFFD-\uDFFF])|(?:\uD83E\uDDD1\uD83C\uDFFB\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFB\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFC-\uDFFF])|\uD83D\uDC68(?:\uD83C\uDFFB(?:\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFF])|\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFF]))|\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFC-\uDFFF])|[\u2695\u2696\u2708]\uFE0F|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD]))?|(?:\uD83C[\uDFFC-\uDFFF])\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFF])|\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFF]))|\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83D\uDC68|(?:\uD83D[\uDC68\uDC69])\u200D(?:\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67]))|\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFF\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFE])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFE\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFD\uDFFF])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFD\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFC\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB\uDFFD-\uDFFF])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|(?:\uD83C\uDFFF\u200D[\u2695\u2696\u2708]|\uD83C\uDFFE\u200D[\u2695\u2696\u2708]|\uD83C\uDFFD\u200D[\u2695\u2696\u2708]|\uD83C\uDFFC\u200D[\u2695\u2696\u2708]|\u200D[\u2695\u2696\u2708])\uFE0F|\u200D(?:(?:\uD83D[\uDC68\uDC69])\u200D(?:\uD83D[\uDC66\uDC67])|\uD83D[\uDC66\uDC67])|\uD83C\uDFFF|\uD83C\uDFFE|\uD83C\uDFFD|\uD83C\uDFFC)?|(?:\uD83D\uDC69(?:\uD83C\uDFFB\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D(?:\uD83D[\uDC68\uDC69])|\uD83D[\uDC68\uDC69])|(?:\uD83C[\uDFFC-\uDFFF])\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D(?:\uD83D[\uDC68\uDC69])|\uD83D[\uDC68\uDC69]))|\uD83E\uDDD1(?:\uD83C[\uDFFB-\uDFFF])\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1)(?:\uD83C[\uDFFB-\uDFFF])|\uD83D\uDC69\u200D\uD83D\uDC69\u200D(?:\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67]))|\uD83D\uDC69(?:\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D(?:\uD83D[\uDC68\uDC69])|\uD83D[\uDC68\uDC69])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFF\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFE\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFD\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFC\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFB\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD]))|\uD83E\uDDD1(?:\u200D(?:\uD83E\uDD1D\u200D\uD83E\uDDD1|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFF\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFE\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFD\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFC\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFB\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD]))|\uD83D\uDC69\u200D\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC69\u200D\uD83D\uDC69\u200D(?:\uD83D[\uDC66\uDC67])|\uD83D\uDC69\u200D\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67])|(?:\uD83D\uDC41\uFE0F\u200D\uD83D\uDDE8|\uD83E\uDDD1(?:\uD83C\uDFFF\u200D[\u2695\u2696\u2708]|\uD83C\uDFFE\u200D[\u2695\u2696\u2708]|\uD83C\uDFFD\u200D[\u2695\u2696\u2708]|\uD83C\uDFFC\u200D[\u2695\u2696\u2708]|\uD83C\uDFFB\u200D[\u2695\u2696\u2708]|\u200D[\u2695\u2696\u2708])|\uD83D\uDC69(?:\uD83C\uDFFF\u200D[\u2695\u2696\u2708]|\uD83C\uDFFE\u200D[\u2695\u2696\u2708]|\uD83C\uDFFD\u200D[\u2695\u2696\u2708]|\uD83C\uDFFC\u200D[\u2695\u2696\u2708]|\uD83C\uDFFB\u200D[\u2695\u2696\u2708]|\u200D[\u2695\u2696\u2708])|\uD83D\uDE36\u200D\uD83C\uDF2B|\uD83C\uDFF3\uFE0F\u200D\u26A7|\uD83D\uDC3B\u200D\u2744|(?:(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD4\uDDD6-\uDDDD])(?:\uD83C[\uDFFB-\uDFFF])|\uD83D\uDC6F|\uD83E[\uDD3C\uDDDE\uDDDF])\u200D[\u2640\u2642]|(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)(?:\uFE0F|\uD83C[\uDFFB-\uDFFF])\u200D[\u2640\u2642]|\uD83C\uDFF4\u200D\u2620|(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD4\uDDD6-\uDDDD])\u200D[\u2640\u2642]|[\xA9\xAE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9\u21AA\u2328\u23CF\u23ED-\u23EF\u23F1\u23F2\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB\u25FC\u2600-\u2604\u260E\u2611\u2618\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2640\u2642\u265F\u2660\u2663\u2665\u2666\u2668\u267B\u267E\u2692\u2694-\u2697\u2699\u269B\u269C\u26A0\u26A7\u26B0\u26B1\u26C8\u26CF\u26D1\u26D3\u26E9\u26F0\u26F1\u26F4\u26F7\u26F8\u2702\u2708\u2709\u270F\u2712\u2714\u2716\u271D\u2721\u2733\u2734\u2744\u2747\u2763\u27A1\u2934\u2935\u2B05-\u2B07\u3030\u303D\u3297\u3299]|\uD83C[\uDD70\uDD71\uDD7E\uDD7F\uDE02\uDE37\uDF21\uDF24-\uDF2C\uDF36\uDF7D\uDF96\uDF97\uDF99-\uDF9B\uDF9E\uDF9F\uDFCD\uDFCE\uDFD4-\uDFDF\uDFF5\uDFF7]|\uD83D[\uDC3F\uDCFD\uDD49\uDD4A\uDD6F\uDD70\uDD73\uDD76-\uDD79\uDD87\uDD8A-\uDD8D\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA\uDECB\uDECD-\uDECF\uDEE0-\uDEE5\uDEE9\uDEF0\uDEF3])\uFE0F|\uD83C\uDFF3\uFE0F\u200D\uD83C\uDF08|\uD83D\uDC69\u200D\uD83D\uDC67|\uD83D\uDC69\u200D\uD83D\uDC66|\uD83D\uDE35\u200D\uD83D\uDCAB|\uD83D\uDE2E\u200D\uD83D\uDCA8|\uD83D\uDC15\u200D\uD83E\uDDBA|\uD83E\uDDD1(?:\uD83C\uDFFF|\uD83C\uDFFE|\uD83C\uDFFD|\uD83C\uDFFC|\uD83C\uDFFB)?|\uD83D\uDC69(?:\uD83C\uDFFF|\uD83C\uDFFE|\uD83C\uDFFD|\uD83C\uDFFC|\uD83C\uDFFB)?|\uD83C\uDDFD\uD83C\uDDF0|\uD83C\uDDF6\uD83C\uDDE6|\uD83C\uDDF4\uD83C\uDDF2|\uD83D\uDC08\u200D\u2B1B|\u2764\uFE0F\u200D(?:\uD83D\uDD25|\uD83E\uDE79)|\uD83D\uDC41\uFE0F|\uD83C\uDFF3\uFE0F|\uD83C\uDDFF(?:\uD83C[\uDDE6\uDDF2\uDDFC])|\uD83C\uDDFE(?:\uD83C[\uDDEA\uDDF9])|\uD83C\uDDFC(?:\uD83C[\uDDEB\uDDF8])|\uD83C\uDDFB(?:\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDEE\uDDF3\uDDFA])|\uD83C\uDDFA(?:\uD83C[\uDDE6\uDDEC\uDDF2\uDDF3\uDDF8\uDDFE\uDDFF])|\uD83C\uDDF9(?:\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDED\uDDEF-\uDDF4\uDDF7\uDDF9\uDDFB\uDDFC\uDDFF])|\uD83C\uDDF8(?:\uD83C[\uDDE6-\uDDEA\uDDEC-\uDDF4\uDDF7-\uDDF9\uDDFB\uDDFD-\uDDFF])|\uD83C\uDDF7(?:\uD83C[\uDDEA\uDDF4\uDDF8\uDDFA\uDDFC])|\uD83C\uDDF5(?:\uD83C[\uDDE6\uDDEA-\uDDED\uDDF0-\uDDF3\uDDF7-\uDDF9\uDDFC\uDDFE])|\uD83C\uDDF3(?:\uD83C[\uDDE6\uDDE8\uDDEA-\uDDEC\uDDEE\uDDF1\uDDF4\uDDF5\uDDF7\uDDFA\uDDFF])|\uD83C\uDDF2(?:\uD83C[\uDDE6\uDDE8-\uDDED\uDDF0-\uDDFF])|\uD83C\uDDF1(?:\uD83C[\uDDE6-\uDDE8\uDDEE\uDDF0\uDDF7-\uDDFB\uDDFE])|\uD83C\uDDF0(?:\uD83C[\uDDEA\uDDEC-\uDDEE\uDDF2\uDDF3\uDDF5\uDDF7\uDDFC\uDDFE\uDDFF])|\uD83C\uDDEF(?:\uD83C[\uDDEA\uDDF2\uDDF4\uDDF5])|\uD83C\uDDEE(?:\uD83C[\uDDE8-\uDDEA\uDDF1-\uDDF4\uDDF6-\uDDF9])|\uD83C\uDDED(?:\uD83C[\uDDF0\uDDF2\uDDF3\uDDF7\uDDF9\uDDFA])|\uD83C\uDDEC(?:\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEE\uDDF1-\uDDF3\uDDF5-\uDDFA\uDDFC\uDDFE])|\uD83C\uDDEB(?:\uD83C[\uDDEE-\uDDF0\uDDF2\uDDF4\uDDF7])|\uD83C\uDDEA(?:\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDED\uDDF7-\uDDFA])|\uD83C\uDDE9(?:\uD83C[\uDDEA\uDDEC\uDDEF\uDDF0\uDDF2\uDDF4\uDDFF])|\uD83C\uDDE8(?:\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDEE\uDDF0-\uDDF5\uDDF7\uDDFA-\uDDFF])|\uD83C\uDDE7(?:\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEF\uDDF1-\uDDF4\uDDF6-\uDDF9\uDDFB\uDDFC\uDDFE\uDDFF])|\uD83C\uDDE6(?:\uD83C[\uDDE8-\uDDEC\uDDEE\uDDF1\uDDF2\uDDF4\uDDF6-\uDDFA\uDDFC\uDDFD\uDDFF])|[#\*0-9]\uFE0F\u20E3|\u2764\uFE0F|(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD4\uDDD6-\uDDDD])(?:\uD83C[\uDFFB-\uDFFF])|(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)(?:\uFE0F|\uD83C[\uDFFB-\uDFFF])|\uD83C\uDFF4|(?:[\u270A\u270B]|\uD83C[\uDF85\uDFC2\uDFC7]|\uD83D[\uDC42\uDC43\uDC46-\uDC50\uDC66\uDC67\uDC6B-\uDC6D\uDC72\uDC74-\uDC76\uDC78\uDC7C\uDC83\uDC85\uDC8F\uDC91\uDCAA\uDD7A\uDD95\uDD96\uDE4C\uDE4F\uDEC0\uDECC]|\uD83E[\uDD0C\uDD0F\uDD18-\uDD1C\uDD1E\uDD1F\uDD30-\uDD34\uDD36\uDD77\uDDB5\uDDB6\uDDBB\uDDD2\uDDD3\uDDD5])(?:\uD83C[\uDFFB-\uDFFF])|(?:[\u261D\u270C\u270D]|\uD83D[\uDD74\uDD90])(?:\uFE0F|\uD83C[\uDFFB-\uDFFF])|[\u270A\u270B]|\uD83C[\uDF85\uDFC2\uDFC7]|\uD83D[\uDC08\uDC15\uDC3B\uDC42\uDC43\uDC46-\uDC50\uDC66\uDC67\uDC6B-\uDC6D\uDC72\uDC74-\uDC76\uDC78\uDC7C\uDC83\uDC85\uDC8F\uDC91\uDCAA\uDD7A\uDD95\uDD96\uDE2E\uDE35\uDE36\uDE4C\uDE4F\uDEC0\uDECC]|\uD83E[\uDD0C\uDD0F\uDD18-\uDD1C\uDD1E\uDD1F\uDD30-\uDD34\uDD36\uDD77\uDDB5\uDDB6\uDDBB\uDDD2\uDDD3\uDDD5]|\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD4\uDDD6-\uDDDD]|\uD83D\uDC6F|\uD83E[\uDD3C\uDDDE\uDDDF]|[\u231A\u231B\u23E9-\u23EC\u23F0\u23F3\u25FD\u25FE\u2614\u2615\u2648-\u2653\u267F\u2693\u26A1\u26AA\u26AB\u26BD\u26BE\u26C4\u26C5\u26CE\u26D4\u26EA\u26F2\u26F3\u26F5\u26FA\u26FD\u2705\u2728\u274C\u274E\u2753-\u2755\u2757\u2795-\u2797\u27B0\u27BF\u2B1B\u2B1C\u2B50\u2B55]|\uD83C[\uDC04\uDCCF\uDD8E\uDD91-\uDD9A\uDE01\uDE1A\uDE2F\uDE32-\uDE36\uDE38-\uDE3A\uDE50\uDE51\uDF00-\uDF20\uDF2D-\uDF35\uDF37-\uDF7C\uDF7E-\uDF84\uDF86-\uDF93\uDFA0-\uDFC1\uDFC5\uDFC6\uDFC8\uDFC9\uDFCF-\uDFD3\uDFE0-\uDFF0\uDFF8-\uDFFF]|\uD83D[\uDC00-\uDC07\uDC09-\uDC14\uDC16-\uDC3A\uDC3C-\uDC3E\uDC40\uDC44\uDC45\uDC51-\uDC65\uDC6A\uDC79-\uDC7B\uDC7D-\uDC80\uDC84\uDC88-\uDC8E\uDC90\uDC92-\uDCA9\uDCAB-\uDCFC\uDCFF-\uDD3D\uDD4B-\uDD4E\uDD50-\uDD67\uDDA4\uDDFB-\uDE2D\uDE2F-\uDE34\uDE37-\uDE44\uDE48-\uDE4A\uDE80-\uDEA2\uDEA4-\uDEB3\uDEB7-\uDEBF\uDEC1-\uDEC5\uDED0-\uDED2\uDED5-\uDED7\uDEEB\uDEEC\uDEF4-\uDEFC\uDFE0-\uDFEB]|\uD83E[\uDD0D\uDD0E\uDD10-\uDD17\uDD1D\uDD20-\uDD25\uDD27-\uDD2F\uDD3A\uDD3F-\uDD45\uDD47-\uDD76\uDD78\uDD7A-\uDDB4\uDDB7\uDDBA\uDDBC-\uDDCB\uDDD0\uDDE0-\uDDFF\uDE70-\uDE74\uDE78-\uDE7A\uDE80-\uDE86\uDE90-\uDEA8\uDEB0-\uDEB6\uDEC0-\uDEC2\uDED0-\uDED6]|(?:[\u231A\u231B\u23E9-\u23EC\u23F0\u23F3\u25FD\u25FE\u2614\u2615\u2648-\u2653\u267F\u2693\u26A1\u26AA\u26AB\u26BD\u26BE\u26C4\u26C5\u26CE\u26D4\u26EA\u26F2\u26F3\u26F5\u26FA\u26FD\u2705\u270A\u270B\u2728\u274C\u274E\u2753-\u2755\u2757\u2795-\u2797\u27B0\u27BF\u2B1B\u2B1C\u2B50\u2B55]|\uD83C[\uDC04\uDCCF\uDD8E\uDD91-\uDD9A\uDDE6-\uDDFF\uDE01\uDE1A\uDE2F\uDE32-\uDE36\uDE38-\uDE3A\uDE50\uDE51\uDF00-\uDF20\uDF2D-\uDF35\uDF37-\uDF7C\uDF7E-\uDF93\uDFA0-\uDFCA\uDFCF-\uDFD3\uDFE0-\uDFF0\uDFF4\uDFF8-\uDFFF]|\uD83D[\uDC00-\uDC3E\uDC40\uDC42-\uDCFC\uDCFF-\uDD3D\uDD4B-\uDD4E\uDD50-\uDD67\uDD7A\uDD95\uDD96\uDDA4\uDDFB-\uDE4F\uDE80-\uDEC5\uDECC\uDED0-\uDED2\uDED5-\uDED7\uDEEB\uDEEC\uDEF4-\uDEFC\uDFE0-\uDFEB]|\uD83E[\uDD0C-\uDD3A\uDD3C-\uDD45\uDD47-\uDD78\uDD7A-\uDDCB\uDDCD-\uDDFF\uDE70-\uDE74\uDE78-\uDE7A\uDE80-\uDE86\uDE90-\uDEA8\uDEB0-\uDEB6\uDEC0-\uDEC2\uDED0-\uDED6])|(?:[#\*0-9\xA9\xAE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9\u21AA\u231A\u231B\u2328\u23CF\u23E9-\u23F3\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB-\u25FE\u2600-\u2604\u260E\u2611\u2614\u2615\u2618\u261D\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2640\u2642\u2648-\u2653\u265F\u2660\u2663\u2665\u2666\u2668\u267B\u267E\u267F\u2692-\u2697\u2699\u269B\u269C\u26A0\u26A1\u26A7\u26AA\u26AB\u26B0\u26B1\u26BD\u26BE\u26C4\u26C5\u26C8\u26CE\u26CF\u26D1\u26D3\u26D4\u26E9\u26EA\u26F0-\u26F5\u26F7-\u26FA\u26FD\u2702\u2705\u2708-\u270D\u270F\u2712\u2714\u2716\u271D\u2721\u2728\u2733\u2734\u2744\u2747\u274C\u274E\u2753-\u2755\u2757\u2763\u2764\u2795-\u2797\u27A1\u27B0\u27BF\u2934\u2935\u2B05-\u2B07\u2B1B\u2B1C\u2B50\u2B55\u3030\u303D\u3297\u3299]|\uD83C[\uDC04\uDCCF\uDD70\uDD71\uDD7E\uDD7F\uDD8E\uDD91-\uDD9A\uDDE6-\uDDFF\uDE01\uDE02\uDE1A\uDE2F\uDE32-\uDE3A\uDE50\uDE51\uDF00-\uDF21\uDF24-\uDF93\uDF96\uDF97\uDF99-\uDF9B\uDF9E-\uDFF0\uDFF3-\uDFF5\uDFF7-\uDFFF]|\uD83D[\uDC00-\uDCFD\uDCFF-\uDD3D\uDD49-\uDD4E\uDD50-\uDD67\uDD6F\uDD70\uDD73-\uDD7A\uDD87\uDD8A-\uDD8D\uDD90\uDD95\uDD96\uDDA4\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA-\uDE4F\uDE80-\uDEC5\uDECB-\uDED2\uDED5-\uDED7\uDEE0-\uDEE5\uDEE9\uDEEB\uDEEC\uDEF0\uDEF3-\uDEFC\uDFE0-\uDFEB]|\uD83E[\uDD0C-\uDD3A\uDD3C-\uDD45\uDD47-\uDD78\uDD7A-\uDDCB\uDDCD-\uDDFF\uDE70-\uDE74\uDE78-\uDE7A\uDE80-\uDE86\uDE90-\uDEA8\uDEB0-\uDEB6\uDEC0-\uDEC2\uDED0-\uDED6])\uFE0F|(?:[\u261D\u26F9\u270A-\u270D]|\uD83C[\uDF85\uDFC2-\uDFC4\uDFC7\uDFCA-\uDFCC]|\uD83D[\uDC42\uDC43\uDC46-\uDC50\uDC66-\uDC78\uDC7C\uDC81-\uDC83\uDC85-\uDC87\uDC8F\uDC91\uDCAA\uDD74\uDD75\uDD7A\uDD90\uDD95\uDD96\uDE45-\uDE47\uDE4B-\uDE4F\uDEA3\uDEB4-\uDEB6\uDEC0\uDECC]|\uD83E[\uDD0C\uDD0F\uDD18-\uDD1F\uDD26\uDD30-\uDD39\uDD3C-\uDD3E\uDD77\uDDB5\uDDB6\uDDB8\uDDB9\uDDBB\uDDCD-\uDDCF\uDDD1-\uDDDD])/g;
}, FD, m = 10, L$1 = (t = 0) => (u) => `\x1B[${u + t}m`, N = (t = 0) => (u) => `\x1B[${38 + t};5;${u}m`, I = (t = 0) => (u, F, e2) => `\x1B[${38 + t};2;${u};${F};${e2}m`, r, tD, eD, iD, v, CD = 39, w$1 = "\x07", W$1 = "[", rD = "]", R = "m", y, V$1 = (t) => `${v.values().next().value}${W$1}${t}${R}`, z = (t) => `${v.values().next().value}${y}${t}${w$1}`, ED = (t) => t.split(" ").map((u) => A$1(u)), _ = (t, u, F) => {
  const e2 = [...u];
  let s = false, i = false, D = A$1(T$1(t[t.length - 1]));
  for (const [C, o] of e2.entries()) {
    const E = A$1(o);
    if (D + E <= F ? t[t.length - 1] += o : (t.push(o), D = 0), v.has(o) && (s = true, i = e2.slice(C + 1).join("").startsWith(y)), s) {
      i ? o === w$1 && (s = false, i = false) : o === R && (s = false);
      continue;
    }
    D += E, D === F && C < e2.length - 1 && (t.push(""), D = 0);
  }
  !D && t[t.length - 1].length > 0 && t.length > 1 && (t[t.length - 2] += t.pop());
}, nD = (t) => {
  const u = t.split(" ");
  let F = u.length;
  for (;F > 0 && !(A$1(u[F - 1]) > 0); )
    F--;
  return F === u.length ? t : u.slice(0, F).join(" ") + u.slice(F).join("");
}, oD = (t, u, F = {}) => {
  if (F.trim !== false && t.trim() === "")
    return "";
  let e2 = "", s, i;
  const D = ED(t);
  let C = [""];
  for (const [E, a] of t.split(" ").entries()) {
    F.trim !== false && (C[C.length - 1] = C[C.length - 1].trimStart());
    let n = A$1(C[C.length - 1]);
    if (E !== 0 && (n >= u && (F.wordWrap === false || F.trim === false) && (C.push(""), n = 0), (n > 0 || F.trim === false) && (C[C.length - 1] += " ", n++)), F.hard && D[E] > u) {
      const B = u - n, p = 1 + Math.floor((D[E] - B - 1) / u);
      Math.floor((D[E] - 1) / u) < p && C.push(""), _(C, a, u);
      continue;
    }
    if (n + D[E] > u && n > 0 && D[E] > 0) {
      if (F.wordWrap === false && n < u) {
        _(C, a, u);
        continue;
      }
      C.push("");
    }
    if (n + D[E] > u && F.wordWrap === false) {
      _(C, a, u);
      continue;
    }
    C[C.length - 1] += a;
  }
  F.trim !== false && (C = C.map((E) => nD(E)));
  const o = [...C.join(`
`)];
  for (const [E, a] of o.entries()) {
    if (e2 += a, v.has(a)) {
      const { groups: B } = new RegExp(`(?:\\${W$1}(?<code>\\d+)m|\\${y}(?<uri>.*)${w$1})`).exec(o.slice(E).join("")) || { groups: {} };
      if (B.code !== undefined) {
        const p = Number.parseFloat(B.code);
        s = p === CD ? undefined : p;
      } else
        B.uri !== undefined && (i = B.uri.length === 0 ? undefined : B.uri);
    }
    const n = iD.codes.get(Number(s));
    o[E + 1] === `
` ? (i && (e2 += z("")), s && n && (e2 += V$1(n))) : a === `
` && (s && n && (e2 += V$1(s)), i && (e2 += z(i)));
  }
  return e2;
}, aD, c, S, AD, pD = (t, u, F) => (u in t) ? AD(t, u, { enumerable: true, configurable: true, writable: true, value: F }) : t[u] = F, h = (t, u, F) => (pD(t, typeof u != "symbol" ? u + "" : u, F), F), fD, bD, mD = (t, u, F) => (u in t) ? bD(t, u, { enumerable: true, configurable: true, writable: true, value: F }) : t[u] = F, Y = (t, u, F) => (mD(t, typeof u != "symbol" ? u + "" : u, F), F), wD, SD, $D = (t, u, F) => (u in t) ? SD(t, u, { enumerable: true, configurable: true, writable: true, value: F }) : t[u] = F, q = (t, u, F) => ($D(t, typeof u != "symbol" ? u + "" : u, F), F), jD, PD, V, u = (t, n) => V ? t : n, le, L, W, C, o, d, k, P, A, T, F, w = (t) => {
  switch (t) {
    case "initial":
    case "active":
      return e.cyan(le);
    case "cancel":
      return e.red(L);
    case "error":
      return e.yellow(W);
    case "submit":
      return e.green(C);
  }
}, B = (t) => {
  const { cursor: n, options: s, style: r2 } = t, i = t.maxItems ?? Number.POSITIVE_INFINITY, a = Math.max(process.stdout.rows - 4, 0), c2 = Math.min(a, Math.max(i, 5));
  let l = 0;
  n >= l + c2 - 3 ? l = Math.max(Math.min(n - c2 + 3, s.length - c2), 0) : n < l + 2 && (l = Math.max(n - 2, 0));
  const $ = c2 < s.length && l > 0, p = c2 < s.length && l + c2 < s.length;
  return s.slice(l, l + c2).map((M, v2, x2) => {
    const j = v2 === 0 && $, E = v2 === x2.length - 1 && p;
    return j || E ? e.dim("...") : r2(M, v2 + l === n);
  });
}, he = (t) => new PD({ validate: t.validate, placeholder: t.placeholder, defaultValue: t.defaultValue, initialValue: t.initialValue, render() {
  const n = `${e.gray(o)}
${w(this.state)} ${t.message}
`, s = t.placeholder ? e.inverse(t.placeholder[0]) + e.dim(t.placeholder.slice(1)) : e.inverse(e.hidden("_")), r2 = this.value ? this.valueWithCursor : s;
  switch (this.state) {
    case "error":
      return `${n.trim()}
${e.yellow(o)} ${r2}
${e.yellow(d)} ${e.yellow(this.error)}
`;
    case "submit":
      return `${n}${e.gray(o)} ${e.dim(this.value || t.placeholder)}`;
    case "cancel":
      return `${n}${e.gray(o)} ${e.strikethrough(e.dim(this.value ?? ""))}${this.value?.trim() ? `
${e.gray(o)}` : ""}`;
    default:
      return `${n}${e.cyan(o)} ${r2}
${e.cyan(d)}
`;
  }
} }).prompt(), ye = (t) => {
  const n = t.active ?? "Yes", s = t.inactive ?? "No";
  return new fD({ active: n, inactive: s, initialValue: t.initialValue ?? true, render() {
    const r2 = `${e.gray(o)}
${w(this.state)} ${t.message}
`, i = this.value ? n : s;
    switch (this.state) {
      case "submit":
        return `${r2}${e.gray(o)} ${e.dim(i)}`;
      case "cancel":
        return `${r2}${e.gray(o)} ${e.strikethrough(e.dim(i))}
${e.gray(o)}`;
      default:
        return `${r2}${e.cyan(o)} ${this.value ? `${e.green(k)} ${n}` : `${e.dim(P)} ${e.dim(n)}`} ${e.dim("/")} ${this.value ? `${e.dim(P)} ${e.dim(s)}` : `${e.green(k)} ${s}`}
${e.cyan(d)}
`;
    }
  } }).prompt();
}, ve = (t) => {
  const n = (s, r2) => {
    const i = s.label ?? String(s.value);
    switch (r2) {
      case "selected":
        return `${e.dim(i)}`;
      case "active":
        return `${e.green(k)} ${i} ${s.hint ? e.dim(`(${s.hint})`) : ""}`;
      case "cancelled":
        return `${e.strikethrough(e.dim(i))}`;
      default:
        return `${e.dim(P)} ${e.dim(i)}`;
    }
  };
  return new jD({ options: t.options, initialValue: t.initialValue, render() {
    const s = `${e.gray(o)}
${w(this.state)} ${t.message}
`;
    switch (this.state) {
      case "submit":
        return `${s}${e.gray(o)} ${n(this.options[this.cursor], "selected")}`;
      case "cancel":
        return `${s}${e.gray(o)} ${n(this.options[this.cursor], "cancelled")}
${e.gray(o)}`;
      default:
        return `${s}${e.cyan(o)} ${B({ cursor: this.cursor, options: this.options, maxItems: t.maxItems, style: (r2, i) => n(r2, i ? "active" : "inactive") }).join(`
${e.cyan(o)}  `)}
${e.cyan(d)}
`;
    }
  } }).prompt();
}, fe = (t) => {
  const n = (s, r2) => {
    const i = s.label ?? String(s.value);
    return r2 === "active" ? `${e.cyan(A)} ${i} ${s.hint ? e.dim(`(${s.hint})`) : ""}` : r2 === "selected" ? `${e.green(T)} ${e.dim(i)}` : r2 === "cancelled" ? `${e.strikethrough(e.dim(i))}` : r2 === "active-selected" ? `${e.green(T)} ${i} ${s.hint ? e.dim(`(${s.hint})`) : ""}` : r2 === "submitted" ? `${e.dim(i)}` : `${e.dim(F)} ${e.dim(i)}`;
  };
  return new wD({ options: t.options, initialValues: t.initialValues, required: t.required ?? true, cursorAt: t.cursorAt, validate(s) {
    if (this.required && s.length === 0)
      return `Please select at least one option.
${e.reset(e.dim(`Press ${e.gray(e.bgWhite(e.inverse(" space ")))} to select, ${e.gray(e.bgWhite(e.inverse(" enter ")))} to submit`))}`;
  }, render() {
    const s = `${e.gray(o)}
${w(this.state)} ${t.message}
`, r2 = (i, a) => {
      const c2 = this.value.includes(i.value);
      return a && c2 ? n(i, "active-selected") : c2 ? n(i, "selected") : n(i, a ? "active" : "inactive");
    };
    switch (this.state) {
      case "submit":
        return `${s}${e.gray(o)} ${this.options.filter(({ value: i }) => this.value.includes(i)).map((i) => n(i, "submitted")).join(e.dim(", ")) || e.dim("none")}`;
      case "cancel": {
        const i = this.options.filter(({ value: a }) => this.value.includes(a)).map((a) => n(a, "cancelled")).join(e.dim(", "));
        return `${s}${e.gray(o)} ${i.trim() ? `${i}
${e.gray(o)}` : ""}`;
      }
      case "error": {
        const i = this.error.split(`
`).map((a, c2) => c2 === 0 ? `${e.yellow(d)} ${e.yellow(a)}` : `   ${a}`).join(`
`);
        return `${s + e.yellow(o)} ${B({ options: this.options, cursor: this.cursor, maxItems: t.maxItems, style: r2 }).join(`
${e.yellow(o)}  `)}
${i}
`;
      }
      default:
        return `${s}${e.cyan(o)} ${B({ options: this.options, cursor: this.cursor, maxItems: t.maxItems, style: r2 }).join(`
${e.cyan(o)}  `)}
${e.cyan(d)}
`;
    }
  } }).prompt();
}, kCancel;
var init_prompt = __esm(() => {
  srcExports = requireSrc();
  picocolors = { exports: {} };
  picocolorsExports = /* @__PURE__ */ requirePicocolors();
  e = /* @__PURE__ */ getDefaultExportFromCjs(picocolorsExports);
  Q = J();
  P$1 = { exports: {} };
  (function(t) {
    var u = {};
    t.exports = u, u.eastAsianWidth = function(e2) {
      var s = e2.charCodeAt(0), i = e2.length == 2 ? e2.charCodeAt(1) : 0, D = s;
      return 55296 <= s && s <= 56319 && 56320 <= i && i <= 57343 && (s &= 1023, i &= 1023, D = s << 10 | i, D += 65536), D == 12288 || 65281 <= D && D <= 65376 || 65504 <= D && D <= 65510 ? "F" : D == 8361 || 65377 <= D && D <= 65470 || 65474 <= D && D <= 65479 || 65482 <= D && D <= 65487 || 65490 <= D && D <= 65495 || 65498 <= D && D <= 65500 || 65512 <= D && D <= 65518 ? "H" : 4352 <= D && D <= 4447 || 4515 <= D && D <= 4519 || 4602 <= D && D <= 4607 || 9001 <= D && D <= 9002 || 11904 <= D && D <= 11929 || 11931 <= D && D <= 12019 || 12032 <= D && D <= 12245 || 12272 <= D && D <= 12283 || 12289 <= D && D <= 12350 || 12353 <= D && D <= 12438 || 12441 <= D && D <= 12543 || 12549 <= D && D <= 12589 || 12593 <= D && D <= 12686 || 12688 <= D && D <= 12730 || 12736 <= D && D <= 12771 || 12784 <= D && D <= 12830 || 12832 <= D && D <= 12871 || 12880 <= D && D <= 13054 || 13056 <= D && D <= 19903 || 19968 <= D && D <= 42124 || 42128 <= D && D <= 42182 || 43360 <= D && D <= 43388 || 44032 <= D && D <= 55203 || 55216 <= D && D <= 55238 || 55243 <= D && D <= 55291 || 63744 <= D && D <= 64255 || 65040 <= D && D <= 65049 || 65072 <= D && D <= 65106 || 65108 <= D && D <= 65126 || 65128 <= D && D <= 65131 || 110592 <= D && D <= 110593 || 127488 <= D && D <= 127490 || 127504 <= D && D <= 127546 || 127552 <= D && D <= 127560 || 127568 <= D && D <= 127569 || 131072 <= D && D <= 194367 || 177984 <= D && D <= 196605 || 196608 <= D && D <= 262141 ? "W" : 32 <= D && D <= 126 || 162 <= D && D <= 163 || 165 <= D && D <= 166 || D == 172 || D == 175 || 10214 <= D && D <= 10221 || 10629 <= D && D <= 10630 ? "Na" : D == 161 || D == 164 || 167 <= D && D <= 168 || D == 170 || 173 <= D && D <= 174 || 176 <= D && D <= 180 || 182 <= D && D <= 186 || 188 <= D && D <= 191 || D == 198 || D == 208 || 215 <= D && D <= 216 || 222 <= D && D <= 225 || D == 230 || 232 <= D && D <= 234 || 236 <= D && D <= 237 || D == 240 || 242 <= D && D <= 243 || 247 <= D && D <= 250 || D == 252 || D == 254 || D == 257 || D == 273 || D == 275 || D == 283 || 294 <= D && D <= 295 || D == 299 || 305 <= D && D <= 307 || D == 312 || 319 <= D && D <= 322 || D == 324 || 328 <= D && D <= 331 || D == 333 || 338 <= D && D <= 339 || 358 <= D && D <= 359 || D == 363 || D == 462 || D == 464 || D == 466 || D == 468 || D == 470 || D == 472 || D == 474 || D == 476 || D == 593 || D == 609 || D == 708 || D == 711 || 713 <= D && D <= 715 || D == 717 || D == 720 || 728 <= D && D <= 731 || D == 733 || D == 735 || 768 <= D && D <= 879 || 913 <= D && D <= 929 || 931 <= D && D <= 937 || 945 <= D && D <= 961 || 963 <= D && D <= 969 || D == 1025 || 1040 <= D && D <= 1103 || D == 1105 || D == 8208 || 8211 <= D && D <= 8214 || 8216 <= D && D <= 8217 || 8220 <= D && D <= 8221 || 8224 <= D && D <= 8226 || 8228 <= D && D <= 8231 || D == 8240 || 8242 <= D && D <= 8243 || D == 8245 || D == 8251 || D == 8254 || D == 8308 || D == 8319 || 8321 <= D && D <= 8324 || D == 8364 || D == 8451 || D == 8453 || D == 8457 || D == 8467 || D == 8470 || 8481 <= D && D <= 8482 || D == 8486 || D == 8491 || 8531 <= D && D <= 8532 || 8539 <= D && D <= 8542 || 8544 <= D && D <= 8555 || 8560 <= D && D <= 8569 || D == 8585 || 8592 <= D && D <= 8601 || 8632 <= D && D <= 8633 || D == 8658 || D == 8660 || D == 8679 || D == 8704 || 8706 <= D && D <= 8707 || 8711 <= D && D <= 8712 || D == 8715 || D == 8719 || D == 8721 || D == 8725 || D == 8730 || 8733 <= D && D <= 8736 || D == 8739 || D == 8741 || 8743 <= D && D <= 8748 || D == 8750 || 8756 <= D && D <= 8759 || 8764 <= D && D <= 8765 || D == 8776 || D == 8780 || D == 8786 || 8800 <= D && D <= 8801 || 8804 <= D && D <= 8807 || 8810 <= D && D <= 8811 || 8814 <= D && D <= 8815 || 8834 <= D && D <= 8835 || 8838 <= D && D <= 8839 || D == 8853 || D == 8857 || D == 8869 || D == 8895 || D == 8978 || 9312 <= D && D <= 9449 || 9451 <= D && D <= 9547 || 9552 <= D && D <= 9587 || 9600 <= D && D <= 9615 || 9618 <= D && D <= 9621 || 9632 <= D && D <= 9633 || 9635 <= D && D <= 9641 || 9650 <= D && D <= 9651 || 9654 <= D && D <= 9655 || 9660 <= D && D <= 9661 || 9664 <= D && D <= 9665 || 9670 <= D && D <= 9672 || D == 9675 || 9678 <= D && D <= 9681 || 9698 <= D && D <= 9701 || D == 9711 || 9733 <= D && D <= 9734 || D == 9737 || 9742 <= D && D <= 9743 || 9748 <= D && D <= 9749 || D == 9756 || D == 9758 || D == 9792 || D == 9794 || 9824 <= D && D <= 9825 || 9827 <= D && D <= 9829 || 9831 <= D && D <= 9834 || 9836 <= D && D <= 9837 || D == 9839 || 9886 <= D && D <= 9887 || 9918 <= D && D <= 9919 || 9924 <= D && D <= 9933 || 9935 <= D && D <= 9953 || D == 9955 || 9960 <= D && D <= 9983 || D == 10045 || D == 10071 || 10102 <= D && D <= 10111 || 11093 <= D && D <= 11097 || 12872 <= D && D <= 12879 || 57344 <= D && D <= 63743 || 65024 <= D && D <= 65039 || D == 65533 || 127232 <= D && D <= 127242 || 127248 <= D && D <= 127277 || 127280 <= D && D <= 127337 || 127344 <= D && D <= 127386 || 917760 <= D && D <= 917999 || 983040 <= D && D <= 1048573 || 1048576 <= D && D <= 1114109 ? "A" : "N";
    }, u.characterLength = function(e2) {
      var s = this.eastAsianWidth(e2);
      return s == "F" || s == "W" || s == "A" ? 2 : 1;
    };
    function F(e2) {
      return e2.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[^\uD800-\uDFFF]/g) || [];
    }
    u.length = function(e2) {
      for (var s = F(e2), i = 0, D = 0;D < s.length; D++)
        i = i + this.characterLength(s[D]);
      return i;
    }, u.slice = function(e2, s, i) {
      textLen = u.length(e2), s = s || 0, i = i || 1, s < 0 && (s = textLen + s), i < 0 && (i = textLen + i);
      for (var D = "", C = 0, o = F(e2), E = 0;E < o.length; E++) {
        var a = o[E], n = u.length(a);
        if (C >= s - (n == 2 ? 1 : 0))
          if (C + n <= i)
            D += a;
          else
            break;
        C += n;
      }
      return D;
    };
  })(P$1);
  X = P$1.exports;
  DD = O(X);
  FD = O(uD);
  r = { modifier: { reset: [0, 0], bold: [1, 22], dim: [2, 22], italic: [3, 23], underline: [4, 24], overline: [53, 55], inverse: [7, 27], hidden: [8, 28], strikethrough: [9, 29] }, color: { black: [30, 39], red: [31, 39], green: [32, 39], yellow: [33, 39], blue: [34, 39], magenta: [35, 39], cyan: [36, 39], white: [37, 39], blackBright: [90, 39], gray: [90, 39], grey: [90, 39], redBright: [91, 39], greenBright: [92, 39], yellowBright: [93, 39], blueBright: [94, 39], magentaBright: [95, 39], cyanBright: [96, 39], whiteBright: [97, 39] }, bgColor: { bgBlack: [40, 49], bgRed: [41, 49], bgGreen: [42, 49], bgYellow: [43, 49], bgBlue: [44, 49], bgMagenta: [45, 49], bgCyan: [46, 49], bgWhite: [47, 49], bgBlackBright: [100, 49], bgGray: [100, 49], bgGrey: [100, 49], bgRedBright: [101, 49], bgGreenBright: [102, 49], bgYellowBright: [103, 49], bgBlueBright: [104, 49], bgMagentaBright: [105, 49], bgCyanBright: [106, 49], bgWhiteBright: [107, 49] } };
  Object.keys(r.modifier);
  tD = Object.keys(r.color);
  eD = Object.keys(r.bgColor);
  [...tD, ...eD];
  iD = sD();
  v = new Set(["\x1B", "\x9B"]);
  y = `${rD}8;;`;
  aD = ["up", "down", "left", "right", "space", "enter", "cancel"];
  c = { actions: new Set(aD), aliases: new Map([["k", "up"], ["j", "down"], ["h", "left"], ["l", "right"], ["\x03", "cancel"], ["escape", "cancel"]]) };
  globalThis.process.platform.startsWith("win");
  S = Symbol("clack:cancel");
  AD = Object.defineProperty;
  fD = class fD extends x {
    get cursor() {
      return this.value ? 0 : 1;
    }
    get _value() {
      return this.cursor === 0;
    }
    constructor(u) {
      super(u, false), this.value = !!u.initialValue, this.on("value", () => {
        this.value = this._value;
      }), this.on("confirm", (F) => {
        this.output.write(srcExports.cursor.move(0, -1)), this.value = F, this.state = "submit", this.close();
      }), this.on("cursor", () => {
        this.value = !this.value;
      });
    }
  };
  bD = Object.defineProperty;
  wD = class extends x {
    constructor(u) {
      super(u, false), Y(this, "options"), Y(this, "cursor", 0), this.options = u.options, this.value = [...u.initialValues ?? []], this.cursor = Math.max(this.options.findIndex(({ value: F }) => F === u.cursorAt), 0), this.on("key", (F) => {
        F === "a" && this.toggleAll();
      }), this.on("cursor", (F) => {
        switch (F) {
          case "left":
          case "up":
            this.cursor = this.cursor === 0 ? this.options.length - 1 : this.cursor - 1;
            break;
          case "down":
          case "right":
            this.cursor = this.cursor === this.options.length - 1 ? 0 : this.cursor + 1;
            break;
          case "space":
            this.toggleValue();
            break;
        }
      });
    }
    get _value() {
      return this.options[this.cursor].value;
    }
    toggleAll() {
      const u = this.value.length === this.options.length;
      this.value = u ? [] : this.options.map((F) => F.value);
    }
    toggleValue() {
      const u = this.value.includes(this._value);
      this.value = u ? this.value.filter((F) => F !== this._value) : [...this.value, this._value];
    }
  };
  SD = Object.defineProperty;
  jD = class jD extends x {
    constructor(u) {
      super(u, false), q(this, "options"), q(this, "cursor", 0), this.options = u.options, this.cursor = this.options.findIndex(({ value: F }) => F === u.initialValue), this.cursor === -1 && (this.cursor = 0), this.changeValue(), this.on("cursor", (F) => {
        switch (F) {
          case "left":
          case "up":
            this.cursor = this.cursor === 0 ? this.options.length - 1 : this.cursor - 1;
            break;
          case "down":
          case "right":
            this.cursor = this.cursor === this.options.length - 1 ? 0 : this.cursor + 1;
            break;
        }
        this.changeValue();
      });
    }
    get _value() {
      return this.options[this.cursor];
    }
    changeValue() {
      this.value = this._value.value;
    }
  };
  PD = class PD extends x {
    get valueWithCursor() {
      if (this.state === "submit")
        return this.value;
      if (this.cursor >= this.value.length)
        return `${this.value}\u2588`;
      const u = this.value.slice(0, this.cursor), [F, ...e$1] = this.value.slice(this.cursor);
      return `${u}${e.inverse(F)}${e$1.join("")}`;
    }
    get cursor() {
      return this._cursor;
    }
    constructor(u) {
      super(u), this.on("finalize", () => {
        this.value || (this.value = u.defaultValue);
      });
    }
  };
  V = ce();
  le = u("\u276F", ">");
  L = u("\u25A0", "x");
  W = u("\u25B2", "x");
  C = u("\u2714", "\u221A");
  o = u("");
  d = u("");
  k = u("\u25CF", ">");
  P = u("\u25CB", " ");
  A = u("\u25FB", "[\u2022]");
  T = u("\u25FC", "[+]");
  F = u("\u25FB", "[ ]");
  `${e.gray(o)}  `;
  kCancel = Symbol.for("cancel");
});

// node_modules/slugify/slugify.js
var require_slugify = __commonJS((exports, module) => {
  (function(name, root, factory) {
    if (typeof exports === "object") {
      module.exports = factory();
      module.exports["default"] = factory();
    } else if (typeof define === "function" && define.amd) {
      define(factory);
    } else {
      root[name] = factory();
    }
  })("slugify", exports, function() {
    var charMap = JSON.parse('{"$":"dollar","%":"percent","&":"and","<":"less",">":"greater","|":"or","\xA2":"cent","\xA3":"pound","\xA4":"currency","\xA5":"yen","\xA9":"(c)","\xAA":"a","\xAE":"(r)","\xBA":"o","\xC0":"A","\xC1":"A","\xC2":"A","\xC3":"A","\xC4":"A","\xC5":"A","\xC6":"AE","\xC7":"C","\xC8":"E","\xC9":"E","\xCA":"E","\xCB":"E","\xCC":"I","\xCD":"I","\xCE":"I","\xCF":"I","\xD0":"D","\xD1":"N","\xD2":"O","\xD3":"O","\xD4":"O","\xD5":"O","\xD6":"O","\xD8":"O","\xD9":"U","\xDA":"U","\xDB":"U","\xDC":"U","\xDD":"Y","\xDE":"TH","\xDF":"ss","\xE0":"a","\xE1":"a","\xE2":"a","\xE3":"a","\xE4":"a","\xE5":"a","\xE6":"ae","\xE7":"c","\xE8":"e","\xE9":"e","\xEA":"e","\xEB":"e","\xEC":"i","\xED":"i","\xEE":"i","\xEF":"i","\xF0":"d","\xF1":"n","\xF2":"o","\xF3":"o","\xF4":"o","\xF5":"o","\xF6":"o","\xF8":"o","\xF9":"u","\xFA":"u","\xFB":"u","\xFC":"u","\xFD":"y","\xFE":"th","\xFF":"y","\u0100":"A","\u0101":"a","\u0102":"A","\u0103":"a","\u0104":"A","\u0105":"a","\u0106":"C","\u0107":"c","\u010C":"C","\u010D":"c","\u010E":"D","\u010F":"d","\u0110":"DJ","\u0111":"dj","\u0112":"E","\u0113":"e","\u0116":"E","\u0117":"e","\u0118":"e","\u0119":"e","\u011A":"E","\u011B":"e","\u011E":"G","\u011F":"g","\u0122":"G","\u0123":"g","\u0128":"I","\u0129":"i","\u012A":"i","\u012B":"i","\u012E":"I","\u012F":"i","\u0130":"I","\u0131":"i","\u0136":"k","\u0137":"k","\u013B":"L","\u013C":"l","\u013D":"L","\u013E":"l","\u0141":"L","\u0142":"l","\u0143":"N","\u0144":"n","\u0145":"N","\u0146":"n","\u0147":"N","\u0148":"n","\u014C":"O","\u014D":"o","\u0150":"O","\u0151":"o","\u0152":"OE","\u0153":"oe","\u0154":"R","\u0155":"r","\u0158":"R","\u0159":"r","\u015A":"S","\u015B":"s","\u015E":"S","\u015F":"s","\u0160":"S","\u0161":"s","\u0162":"T","\u0163":"t","\u0164":"T","\u0165":"t","\u0168":"U","\u0169":"u","\u016A":"u","\u016B":"u","\u016E":"U","\u016F":"u","\u0170":"U","\u0171":"u","\u0172":"U","\u0173":"u","\u0174":"W","\u0175":"w","\u0176":"Y","\u0177":"y","\u0178":"Y","\u0179":"Z","\u017A":"z","\u017B":"Z","\u017C":"z","\u017D":"Z","\u017E":"z","\u018F":"E","\u0192":"f","\u01A0":"O","\u01A1":"o","\u01AF":"U","\u01B0":"u","\u01C8":"LJ","\u01C9":"lj","\u01CB":"NJ","\u01CC":"nj","\u0218":"S","\u0219":"s","\u021A":"T","\u021B":"t","\u0259":"e","\u02DA":"o","\u0386":"A","\u0388":"E","\u0389":"H","\u038A":"I","\u038C":"O","\u038E":"Y","\u038F":"W","\u0390":"i","\u0391":"A","\u0392":"B","\u0393":"G","\u0394":"D","\u0395":"E","\u0396":"Z","\u0397":"H","\u0398":"8","\u0399":"I","\u039A":"K","\u039B":"L","\u039C":"M","\u039D":"N","\u039E":"3","\u039F":"O","\u03A0":"P","\u03A1":"R","\u03A3":"S","\u03A4":"T","\u03A5":"Y","\u03A6":"F","\u03A7":"X","\u03A8":"PS","\u03A9":"W","\u03AA":"I","\u03AB":"Y","\u03AC":"a","\u03AD":"e","\u03AE":"h","\u03AF":"i","\u03B0":"y","\u03B1":"a","\u03B2":"b","\u03B3":"g","\u03B4":"d","\u03B5":"e","\u03B6":"z","\u03B7":"h","\u03B8":"8","\u03B9":"i","\u03BA":"k","\u03BB":"l","\u03BC":"m","\u03BD":"n","\u03BE":"3","\u03BF":"o","\u03C0":"p","\u03C1":"r","\u03C2":"s","\u03C3":"s","\u03C4":"t","\u03C5":"y","\u03C6":"f","\u03C7":"x","\u03C8":"ps","\u03C9":"w","\u03CA":"i","\u03CB":"y","\u03CC":"o","\u03CD":"y","\u03CE":"w","\u0401":"Yo","\u0402":"DJ","\u0404":"Ye","\u0406":"I","\u0407":"Yi","\u0408":"J","\u0409":"LJ","\u040A":"NJ","\u040B":"C","\u040F":"DZ","\u0410":"A","\u0411":"B","\u0412":"V","\u0413":"G","\u0414":"D","\u0415":"E","\u0416":"Zh","\u0417":"Z","\u0418":"I","\u0419":"J","\u041A":"K","\u041B":"L","\u041C":"M","\u041D":"N","\u041E":"O","\u041F":"P","\u0420":"R","\u0421":"S","\u0422":"T","\u0423":"U","\u0424":"F","\u0425":"H","\u0426":"C","\u0427":"Ch","\u0428":"Sh","\u0429":"Sh","\u042A":"U","\u042B":"Y","\u042C":"","\u042D":"E","\u042E":"Yu","\u042F":"Ya","\u0430":"a","\u0431":"b","\u0432":"v","\u0433":"g","\u0434":"d","\u0435":"e","\u0436":"zh","\u0437":"z","\u0438":"i","\u0439":"j","\u043A":"k","\u043B":"l","\u043C":"m","\u043D":"n","\u043E":"o","\u043F":"p","\u0440":"r","\u0441":"s","\u0442":"t","\u0443":"u","\u0444":"f","\u0445":"h","\u0446":"c","\u0447":"ch","\u0448":"sh","\u0449":"sh","\u044A":"u","\u044B":"y","\u044C":"","\u044D":"e","\u044E":"yu","\u044F":"ya","\u0451":"yo","\u0452":"dj","\u0454":"ye","\u0456":"i","\u0457":"yi","\u0458":"j","\u0459":"lj","\u045A":"nj","\u045B":"c","\u045D":"u","\u045F":"dz","\u0490":"G","\u0491":"g","\u0492":"GH","\u0493":"gh","\u049A":"KH","\u049B":"kh","\u04A2":"NG","\u04A3":"ng","\u04AE":"UE","\u04AF":"ue","\u04B0":"U","\u04B1":"u","\u04BA":"H","\u04BB":"h","\u04D8":"AE","\u04D9":"ae","\u04E8":"OE","\u04E9":"oe","\u0531":"A","\u0532":"B","\u0533":"G","\u0534":"D","\u0535":"E","\u0536":"Z","\u0537":"E\'","\u0538":"Y\'","\u0539":"T\'","\u053A":"JH","\u053B":"I","\u053C":"L","\u053D":"X","\u053E":"C\'","\u053F":"K","\u0540":"H","\u0541":"D\'","\u0542":"GH","\u0543":"TW","\u0544":"M","\u0545":"Y","\u0546":"N","\u0547":"SH","\u0549":"CH","\u054A":"P","\u054B":"J","\u054C":"R\'","\u054D":"S","\u054E":"V","\u054F":"T","\u0550":"R","\u0551":"C","\u0553":"P\'","\u0554":"Q\'","\u0555":"O\'\'","\u0556":"F","\u0587":"EV","\u0621":"a","\u0622":"aa","\u0623":"a","\u0624":"u","\u0625":"i","\u0626":"e","\u0627":"a","\u0628":"b","\u0629":"h","\u062A":"t","\u062B":"th","\u062C":"j","\u062D":"h","\u062E":"kh","\u062F":"d","\u0630":"th","\u0631":"r","\u0632":"z","\u0633":"s","\u0634":"sh","\u0635":"s","\u0636":"dh","\u0637":"t","\u0638":"z","\u0639":"a","\u063A":"gh","\u0641":"f","\u0642":"q","\u0643":"k","\u0644":"l","\u0645":"m","\u0646":"n","\u0647":"h","\u0648":"w","\u0649":"a","\u064A":"y","\u064B":"an","\u064C":"on","\u064D":"en","\u064E":"a","\u064F":"u","\u0650":"e","\u0652":"","\u0660":"0","\u0661":"1","\u0662":"2","\u0663":"3","\u0664":"4","\u0665":"5","\u0666":"6","\u0667":"7","\u0668":"8","\u0669":"9","\u067E":"p","\u0686":"ch","\u0698":"zh","\u06A9":"k","\u06AF":"g","\u06CC":"y","\u06F0":"0","\u06F1":"1","\u06F2":"2","\u06F3":"3","\u06F4":"4","\u06F5":"5","\u06F6":"6","\u06F7":"7","\u06F8":"8","\u06F9":"9","\u0E3F":"baht","\u10D0":"a","\u10D1":"b","\u10D2":"g","\u10D3":"d","\u10D4":"e","\u10D5":"v","\u10D6":"z","\u10D7":"t","\u10D8":"i","\u10D9":"k","\u10DA":"l","\u10DB":"m","\u10DC":"n","\u10DD":"o","\u10DE":"p","\u10DF":"zh","\u10E0":"r","\u10E1":"s","\u10E2":"t","\u10E3":"u","\u10E4":"f","\u10E5":"k","\u10E6":"gh","\u10E7":"q","\u10E8":"sh","\u10E9":"ch","\u10EA":"ts","\u10EB":"dz","\u10EC":"ts","\u10ED":"ch","\u10EE":"kh","\u10EF":"j","\u10F0":"h","\u1E62":"S","\u1E63":"s","\u1E80":"W","\u1E81":"w","\u1E82":"W","\u1E83":"w","\u1E84":"W","\u1E85":"w","\u1E9E":"SS","\u1EA0":"A","\u1EA1":"a","\u1EA2":"A","\u1EA3":"a","\u1EA4":"A","\u1EA5":"a","\u1EA6":"A","\u1EA7":"a","\u1EA8":"A","\u1EA9":"a","\u1EAA":"A","\u1EAB":"a","\u1EAC":"A","\u1EAD":"a","\u1EAE":"A","\u1EAF":"a","\u1EB0":"A","\u1EB1":"a","\u1EB2":"A","\u1EB3":"a","\u1EB4":"A","\u1EB5":"a","\u1EB6":"A","\u1EB7":"a","\u1EB8":"E","\u1EB9":"e","\u1EBA":"E","\u1EBB":"e","\u1EBC":"E","\u1EBD":"e","\u1EBE":"E","\u1EBF":"e","\u1EC0":"E","\u1EC1":"e","\u1EC2":"E","\u1EC3":"e","\u1EC4":"E","\u1EC5":"e","\u1EC6":"E","\u1EC7":"e","\u1EC8":"I","\u1EC9":"i","\u1ECA":"I","\u1ECB":"i","\u1ECC":"O","\u1ECD":"o","\u1ECE":"O","\u1ECF":"o","\u1ED0":"O","\u1ED1":"o","\u1ED2":"O","\u1ED3":"o","\u1ED4":"O","\u1ED5":"o","\u1ED6":"O","\u1ED7":"o","\u1ED8":"O","\u1ED9":"o","\u1EDA":"O","\u1EDB":"o","\u1EDC":"O","\u1EDD":"o","\u1EDE":"O","\u1EDF":"o","\u1EE0":"O","\u1EE1":"o","\u1EE2":"O","\u1EE3":"o","\u1EE4":"U","\u1EE5":"u","\u1EE6":"U","\u1EE7":"u","\u1EE8":"U","\u1EE9":"u","\u1EEA":"U","\u1EEB":"u","\u1EEC":"U","\u1EED":"u","\u1EEE":"U","\u1EEF":"u","\u1EF0":"U","\u1EF1":"u","\u1EF2":"Y","\u1EF3":"y","\u1EF4":"Y","\u1EF5":"y","\u1EF6":"Y","\u1EF7":"y","\u1EF8":"Y","\u1EF9":"y","\u2013":"-","\u2018":"\'","\u2019":"\'","\u201C":"\\"","\u201D":"\\"","\u201E":"\\"","\u2020":"+","\u2022":"*","\u2026":"...","\u20A0":"ecu","\u20A2":"cruzeiro","\u20A3":"french franc","\u20A4":"lira","\u20A5":"mill","\u20A6":"naira","\u20A7":"peseta","\u20A8":"rupee","\u20A9":"won","\u20AA":"new shequel","\u20AB":"dong","\u20AC":"euro","\u20AD":"kip","\u20AE":"tugrik","\u20AF":"drachma","\u20B0":"penny","\u20B1":"peso","\u20B2":"guarani","\u20B3":"austral","\u20B4":"hryvnia","\u20B5":"cedi","\u20B8":"kazakhstani tenge","\u20B9":"indian rupee","\u20BA":"turkish lira","\u20BD":"russian ruble","\u20BF":"bitcoin","\u2120":"sm","\u2122":"tm","\u2202":"d","\u2206":"delta","\u2211":"sum","\u221E":"infinity","\u2665":"love","\u5143":"yuan","\u5186":"yen","\uFDFC":"rial","\uFEF5":"laa","\uFEF7":"laa","\uFEF9":"lai","\uFEFB":"la"}');
    var locales = JSON.parse('{"bg":{"\u0419":"Y","\u0426":"Ts","\u0429":"Sht","\u042A":"A","\u042C":"Y","\u0439":"y","\u0446":"ts","\u0449":"sht","\u044A":"a","\u044C":"y"},"de":{"\xC4":"AE","\xE4":"ae","\xD6":"OE","\xF6":"oe","\xDC":"UE","\xFC":"ue","\xDF":"ss","%":"prozent","&":"und","|":"oder","\u2211":"summe","\u221E":"unendlich","\u2665":"liebe"},"es":{"%":"por ciento","&":"y","<":"menor que",">":"mayor que","|":"o","\xA2":"centavos","\xA3":"libras","\xA4":"moneda","\u20A3":"francos","\u2211":"suma","\u221E":"infinito","\u2665":"amor"},"fr":{"%":"pourcent","&":"et","<":"plus petit",">":"plus grand","|":"ou","\xA2":"centime","\xA3":"livre","\xA4":"devise","\u20A3":"franc","\u2211":"somme","\u221E":"infini","\u2665":"amour"},"pt":{"%":"porcento","&":"e","<":"menor",">":"maior","|":"ou","\xA2":"centavo","\u2211":"soma","\xA3":"libra","\u221E":"infinito","\u2665":"amor"},"uk":{"\u0418":"Y","\u0438":"y","\u0419":"Y","\u0439":"y","\u0426":"Ts","\u0446":"ts","\u0425":"Kh","\u0445":"kh","\u0429":"Shch","\u0449":"shch","\u0413":"H","\u0433":"h"},"vi":{"\u0110":"D","\u0111":"d"},"da":{"\xD8":"OE","\xF8":"oe","\xC5":"AA","\xE5":"aa","%":"procent","&":"og","|":"eller","$":"dollar","<":"mindre end",">":"st\xF8rre end"},"nb":{"&":"og","\xC5":"AA","\xC6":"AE","\xD8":"OE","\xE5":"aa","\xE6":"ae","\xF8":"oe"},"it":{"&":"e"},"nl":{"&":"en"},"sv":{"&":"och","\xC5":"AA","\xC4":"AE","\xD6":"OE","\xE5":"aa","\xE4":"ae","\xF6":"oe"}}');
    function replace(string, options) {
      if (typeof string !== "string") {
        throw new Error("slugify: string argument expected");
      }
      options = typeof options === "string" ? { replacement: options } : options || {};
      var locale = locales[options.locale] || {};
      var replacement = options.replacement === undefined ? "-" : options.replacement;
      var trim = options.trim === undefined ? true : options.trim;
      var slug = string.normalize().split("").reduce(function(result, ch) {
        var appendChar = locale[ch];
        if (appendChar === undefined)
          appendChar = charMap[ch];
        if (appendChar === undefined)
          appendChar = ch;
        if (appendChar === replacement)
          appendChar = " ";
        return result + appendChar.replace(options.remove || /[^\w\s$*_+~.()'"!\-:@]+/g, "");
      }, "");
      if (options.strict) {
        slug = slug.replace(/[^A-Za-z0-9\s]/g, "");
      }
      if (trim) {
        slug = slug.trim();
      }
      slug = slug.replace(/\s+/g, replacement);
      if (options.lower) {
        slug = slug.toLowerCase();
      }
      return slug;
    }
    replace.extend = function(customMap) {
      Object.assign(charMap, customMap);
    };
    return replace;
  });
});

// src/sdk/mock-session-runner.ts
import { EventEmitter } from "events";

// src/sdk/types/tool.ts
function isJsonSchema(schema) {
  return typeof schema === "object" && schema !== null && (("type" in schema) || ("properties" in schema));
}
function isSimpleSchema(schema) {
  return !isJsonSchema(schema);
}
function isToolResultContent(value) {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value;
  if (obj["type"] !== "text" && obj["type"] !== "image") {
    return false;
  }
  if (obj["type"] === "text") {
    return typeof obj["text"] === "string" || obj["text"] === undefined;
  }
  return (typeof obj["data"] === "string" || obj["data"] === undefined) && (typeof obj["mimeType"] === "string" || obj["mimeType"] === undefined);
}
function isToolResult(value) {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value;
  if (!Array.isArray(obj["content"])) {
    return false;
  }
  if (!obj["content"].every(isToolResultContent)) {
    return false;
  }
  if (obj["isError"] !== undefined && typeof obj["isError"] !== "boolean") {
    return false;
  }
  return true;
}
// src/sdk/types/mcp.ts
function isSdkServer(config) {
  return config.type === "sdk";
}
function isStdioServer(config) {
  return config.type === "stdio";
}
function isHttpServer(config) {
  return config.type === "http" || config.type === "sse";
}
function isValidMcpServerConfig(config) {
  if (typeof config !== "object" || config === null) {
    return false;
  }
  const configObj = config;
  if (typeof configObj["type"] !== "string") {
    return false;
  }
  const type = configObj["type"];
  if (type === "stdio") {
    return typeof configObj["command"] === "string" && (configObj["args"] === undefined || Array.isArray(configObj["args"]) && configObj["args"].every((arg) => typeof arg === "string")) && (configObj["env"] === undefined || typeof configObj["env"] === "object" && configObj["env"] !== null && Object.values(configObj["env"]).every((v) => typeof v === "string"));
  }
  if (type === "http" || type === "sse") {
    return typeof configObj["url"] === "string" && (configObj["headers"] === undefined || typeof configObj["headers"] === "object" && configObj["headers"] !== null && Object.values(configObj["headers"]).every((v) => typeof v === "string"));
  }
  if (type === "sdk") {
    return typeof configObj["name"] === "string" && (configObj["version"] === undefined || typeof configObj["version"] === "string") && Array.isArray(configObj["tools"]);
  }
  return false;
}
// src/sdk/types/state.ts
function isTerminalState(state) {
  return state === "completed" || state === "failed" || state === "cancelled";
}
function isValidSessionState(value) {
  if (typeof value !== "string") {
    return false;
  }
  const validStates = [
    "idle",
    "starting",
    "running",
    "waiting_tool_call",
    "waiting_permission",
    "paused",
    "completed",
    "failed",
    "cancelled"
  ];
  return validStates.includes(value);
}
// src/sdk/types/protocol.ts
function isJsonRpcMessage(value) {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value;
  if (candidate["jsonrpc"] !== "2.0") {
    return false;
  }
  if (candidate["id"] !== undefined) {
    const id = candidate["id"];
    if (typeof id !== "string" && typeof id !== "number") {
      return false;
    }
  }
  if (candidate["method"] !== undefined && typeof candidate["method"] !== "string") {
    return false;
  }
  if (candidate["params"] !== undefined) {
    if (typeof candidate["params"] !== "object" || candidate["params"] === null) {
      return false;
    }
  }
  if (candidate["result"] !== undefined) {
    if (typeof candidate["result"] !== "object" || candidate["result"] === null) {
      return false;
    }
  }
  if (candidate["error"] !== undefined) {
    const error = candidate["error"];
    if (typeof error !== "object" || error === null) {
      return false;
    }
    const errorObj = error;
    if (typeof errorObj["code"] !== "number" || typeof errorObj["message"] !== "string") {
      return false;
    }
  }
  return true;
}
function isIncomingControlRequest(value) {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value;
  if (candidate["type"] !== "control_request") {
    return false;
  }
  if (typeof candidate["request_id"] !== "string") {
    return false;
  }
  if (typeof candidate["request"] !== "object" || candidate["request"] === null) {
    return false;
  }
  const request = candidate["request"];
  const subtype = request["subtype"];
  return subtype === "mcp_message" || subtype === "can_use_tool" || subtype === "hook_callback";
}
function isControlResponse(value) {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value;
  if (candidate["type"] !== "control_response") {
    return false;
  }
  if (typeof candidate["response"] !== "object" || candidate["response"] === null) {
    return false;
  }
  const response = candidate["response"];
  const subtype = response["subtype"];
  return subtype === "success" || subtype === "error";
}
function isMcpMessageRequest(value) {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value;
  if (candidate["subtype"] !== "mcp_message") {
    return false;
  }
  if (typeof candidate["server_name"] !== "string") {
    return false;
  }
  if (typeof candidate["message"] !== "object" || candidate["message"] === null) {
    return false;
  }
  return isJsonRpcMessage(candidate["message"]);
}
function isSuccessResponse(value) {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value;
  return candidate["subtype"] === "success" && typeof candidate["request_id"] === "string" && typeof candidate["response"] === "object" && candidate["response"] !== null;
}
function isErrorResponse(value) {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value;
  return candidate["subtype"] === "error" && typeof candidate["request_id"] === "string" && typeof candidate["error"] === "string";
}
// src/sdk/mock-session-runner.ts
var DEFAULT_STARTED_AT = "2026-01-01T00:00:00.000Z";
var DEFAULT_COMPLETED_AT = "2026-01-01T00:00:01.000Z";
var DEFAULT_SESSION_DURATION_MS = 1000;

class MockClaudeRunningSession extends EventEmitter {
  sessionId;
  #queue = [];
  #closed = false;
  #state;
  #startedAt;
  #completedAt;
  #toolCallCount;
  #messageCount = 0;
  #waiter;
  #completionResolver;
  #completion;
  constructor(options) {
    super();
    this.sessionId = options.sessionId;
    this.#state = options.state ?? "running";
    this.#startedAt = options.result?.startedAt ?? DEFAULT_STARTED_AT;
    this.#toolCallCount = options.result?.toolCallCount ?? 0;
    this.#completion = new Promise((resolve) => {
      this.#completionResolver = resolve;
    });
    for (const message of options.messages ?? []) {
      this.pushMessage(message);
    }
    if (isTerminalState(this.#state)) {
      const completed = buildSessionResult({
        ...options.result,
        success: getTerminalResultSuccess(this.#state)
      }, this.#getResultFallbacks());
      this.#closed = true;
      this.#applyCompletionStats(completed);
      this.#completionResolver?.(completed);
      this.#completionResolver = undefined;
      return;
    }
    if (options.autoComplete !== false) {
      queueMicrotask(() => {
        this.complete(options.result);
      });
    }
  }
  pushMessage(message) {
    if (this.#closed) {
      throw new Error(`mock claude session '${this.sessionId}' is closed`);
    }
    this.#messageCount += 1;
    this.#queue.push(message);
    this.emit("message", message);
    this.#wake();
  }
  setState(state) {
    if (isTerminalState(state)) {
      this.#finish({ success: getTerminalResultSuccess(state) }, state);
      return;
    }
    const previous = this.#state;
    this.#state = state;
    this.#emitStateChange(previous, state);
  }
  complete(result = {}) {
    this.#finish(result);
  }
  async* messages() {
    while (!this.#closed || this.#queue.length > 0) {
      while (this.#queue.length > 0) {
        const message = this.#queue.shift();
        if (message !== undefined) {
          yield message;
        }
      }
      if (this.#closed) {
        break;
      }
      await new Promise((resolve) => {
        this.#waiter = resolve;
      });
    }
  }
  async waitForCompletion() {
    return await this.#completion;
  }
  async cancel() {
    if (this.#closed) {
      return;
    }
    this.#finish({ success: false }, "cancelled");
  }
  getState() {
    return {
      state: this.#state,
      sessionId: this.sessionId,
      stats: {
        startedAt: this.#startedAt,
        ...this.#completedAt === undefined ? {} : { completedAt: this.#completedAt },
        toolCallCount: this.#toolCallCount,
        messageCount: this.#messageCount
      }
    };
  }
  #wake() {
    const waiter = this.#waiter;
    this.#waiter = undefined;
    waiter?.();
  }
  #finish(result, terminalState) {
    if (this.#closed) {
      return;
    }
    const previous = this.#state;
    this.#closed = true;
    const completed = buildSessionResult(result, this.#getResultFallbacks());
    this.#applyCompletionStats(completed);
    this.#state = terminalState ?? (this.#state === "cancelled" ? "cancelled" : completed.success ? "completed" : "failed");
    this.#emitStateChange(previous, this.#state);
    this.emit("complete", completed);
    this.#completionResolver?.(completed);
    this.#completionResolver = undefined;
    this.#wake();
  }
  #getResultFallbacks() {
    return {
      startedAt: this.#startedAt,
      toolCallCount: this.#toolCallCount,
      messageCount: this.#messageCount
    };
  }
  #applyCompletionStats(result) {
    this.#startedAt = result.stats.startedAt;
    this.#completedAt = result.stats.completedAt;
    this.#toolCallCount = result.stats.toolCallCount;
    this.#messageCount = result.stats.messageCount;
  }
  #emitStateChange(from, to) {
    const change = {
      from,
      to,
      info: this.getState(),
      timestamp: new Date().toISOString()
    };
    this.emit("stateChange", change);
  }
}

class MockClaudeSessionRunner {
  startSessionCalls = [];
  resumeSessionCalls = [];
  #startSessions = [];
  #resumeSessions = [];
  #activeSessions = new Set;
  enqueueStartSession(session) {
    this.#startSessions.push(session);
  }
  enqueueResumeSession(session) {
    this.#resumeSessions.push(session);
  }
  async startSession(config) {
    this.startSessionCalls.push({ config: cloneSessionConfig(config) });
    return this.#activateSession(this.#shiftSession(this.#startSessions, "start"));
  }
  async resumeSession(sessionId, prompt, systemPrompt, attachments) {
    this.resumeSessionCalls.push({
      sessionId,
      ...prompt === undefined ? {} : { prompt },
      ...systemPrompt === undefined ? {} : { systemPrompt: cloneSystemPrompt(systemPrompt) },
      ...attachments === undefined ? {} : { attachments: cloneAttachments(attachments) }
    });
    return this.#activateSession(this.#shiftSession(this.#resumeSessions, "resume"));
  }
  async close() {
    const sessions = Array.from(this.#activeSessions);
    await Promise.all(sessions.map(async (session) => session.cancel()));
    this.#activeSessions.clear();
  }
  getActiveSessions() {
    return Array.from(this.#activeSessions);
  }
  #shiftSession(sessions, kind) {
    const session = sessions.shift();
    if (session === undefined) {
      throw new Error(`mock claude ${kind} session was not enqueued`);
    }
    return session;
  }
  #activateSession(session) {
    if (isTerminalState(session.getState().state)) {
      return session;
    }
    this.#activeSessions.add(session);
    session.once("complete", () => {
      this.#activeSessions.delete(session);
    });
    return session;
  }
}
function createMockClaudeSessionRunner(input = {}) {
  const runner = new MockClaudeSessionRunner;
  for (const session of input.startSessions ?? []) {
    runner.enqueueStartSession(session);
  }
  for (const session of input.resumeSessions ?? []) {
    runner.enqueueResumeSession(session);
  }
  return runner;
}
function buildSessionResult(input, fallbacks = {
  startedAt: DEFAULT_STARTED_AT,
  toolCallCount: 0,
  messageCount: 0
}) {
  const startedAt = input.startedAt ?? fallbacks.startedAt;
  return {
    success: input.success ?? true,
    stats: {
      startedAt,
      completedAt: input.completedAt ?? getDefaultCompletedAt(startedAt),
      toolCallCount: input.toolCallCount ?? fallbacks.toolCallCount,
      messageCount: input.messageCount ?? fallbacks.messageCount
    }
  };
}
function getTerminalResultSuccess(state) {
  return state === "completed";
}
function getDefaultCompletedAt(startedAt) {
  const startedAtMs = Date.parse(startedAt);
  if (Number.isNaN(startedAtMs)) {
    return DEFAULT_COMPLETED_AT;
  }
  return new Date(startedAtMs + DEFAULT_SESSION_DURATION_MS).toISOString();
}
function cloneSessionConfig(config) {
  return {
    prompt: config.prompt,
    ...config.projectPath === undefined ? {} : { projectPath: config.projectPath },
    ...config.resumeSessionId === undefined ? {} : { resumeSessionId: config.resumeSessionId },
    ...config.systemPrompt === undefined ? {} : { systemPrompt: cloneSystemPrompt(config.systemPrompt) },
    ...config.attachments === undefined ? {} : { attachments: cloneAttachments(config.attachments) }
  };
}
function cloneSystemPrompt(systemPrompt) {
  if (typeof systemPrompt === "string") {
    return systemPrompt;
  }
  return systemPrompt.append === undefined ? { preset: systemPrompt.preset } : { preset: systemPrompt.preset, append: systemPrompt.append };
}
function cloneAttachments(attachments) {
  return attachments.map((attachment) => ({ ...attachment }));
}

// src/sdk/group/types.ts
function isTerminalGroupStatus(status) {
  return status === "completed" || status === "failed" || status === "deleted";
}
function canResumeGroup(status) {
  return status === "paused";
}
function isActiveGroup(status) {
  return status === "running";
}
var DEFAULT_BUDGET_CONFIG = {
  maxBudgetUsd: 10,
  onBudgetExceeded: "pause",
  warningThreshold: 0.8
};
var DEFAULT_CONCURRENCY_CONFIG = {
  maxConcurrent: 3,
  respectDependencies: true,
  pauseOnError: true,
  errorThreshold: 2
};
var DEFAULT_SESSION_CONFIG = {
  generateClaudeMd: true,
  generateSettings: false
};
var DEFAULT_GROUP_CONFIG = {
  model: "sonnet",
  maxBudgetUsd: DEFAULT_BUDGET_CONFIG.maxBudgetUsd,
  maxConcurrentSessions: DEFAULT_CONCURRENCY_CONFIG.maxConcurrent,
  onBudgetExceeded: DEFAULT_BUDGET_CONFIG.onBudgetExceeded,
  warningThreshold: DEFAULT_BUDGET_CONFIG.warningThreshold
};
// src/sdk/group/progress.ts
class ProgressAggregator {
  sessionProgress;
  groupStartTime;
  constructor(groupStartTime) {
    this.sessionProgress = new Map;
    this.groupStartTime = groupStartTime;
  }
  updateSession(progress) {
    this.sessionProgress.set(progress.id, progress);
  }
  removeSession(sessionId) {
    this.sessionProgress.delete(sessionId);
  }
  computeProgress(group) {
    const sessions = Array.from(this.sessionProgress.values());
    let completed = 0;
    let running = 0;
    let pending = 0;
    let failed = 0;
    for (const session of group.sessions) {
      switch (session.status) {
        case "completed":
          completed++;
          break;
        case "active":
          running++;
          break;
        case "paused":
          pending++;
          break;
        case "failed":
          failed++;
          break;
      }
    }
    let totalCost = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCacheReadTokens = 0;
    let totalCacheWriteTokens = 0;
    for (const session of sessions) {
      totalCost += session.cost;
      totalInputTokens += session.tokens.input;
      totalOutputTokens += session.tokens.output;
      totalCacheReadTokens += session.tokens.cacheRead ?? 0;
      totalCacheWriteTokens += session.tokens.cacheWrite ?? 0;
    }
    const elapsedTime = this.groupStartTime !== undefined ? Date.now() - this.groupStartTime : undefined;
    let estimatedTimeRemaining;
    if (completed > 0 && elapsedTime !== undefined) {
      const avgTimePerSession = elapsedTime / completed;
      const remainingSessions = pending + running;
      estimatedTimeRemaining = avgTimePerSession * remainingSessions;
    }
    return {
      groupId: group.id,
      totalSessions: group.sessions.length,
      completed,
      running,
      pending,
      failed,
      sessions,
      totalCost,
      totalTokens: {
        input: totalInputTokens,
        output: totalOutputTokens,
        cacheRead: totalCacheReadTokens > 0 ? totalCacheReadTokens : undefined,
        cacheWrite: totalCacheWriteTokens > 0 ? totalCacheWriteTokens : undefined
      },
      elapsedTime,
      estimatedTimeRemaining
    };
  }
  clear() {
    this.sessionProgress.clear();
  }
  getSessionProgress(sessionId) {
    return this.sessionProgress.get(sessionId);
  }
  getAllSessions() {
    return Array.from(this.sessionProgress.values());
  }
}
function createSessionProgress(session) {
  const startedAt = session.startedAt;
  const durationMs = startedAt !== undefined ? Date.now() - new Date(startedAt).getTime() : undefined;
  return {
    id: session.id,
    projectPath: session.projectPath,
    status: session.status,
    cost: session.cost ?? 0,
    tokens: session.tokens ?? { input: 0, output: 0 },
    messageCount: 0,
    startedAt,
    durationMs
  };
}
function calculateBudgetUsage(currentCost, maxBudget) {
  if (maxBudget <= 0) {
    return 0;
  }
  return currentCost / maxBudget * 100;
}
function isBudgetWarning(currentCost, maxBudget, warningThreshold) {
  return currentCost >= maxBudget * warningThreshold;
}
function isBudgetExceeded(currentCost, maxBudget) {
  return currentCost >= maxBudget;
}
// node_modules/consola/dist/core.mjs
var LogLevels = {
  silent: Number.NEGATIVE_INFINITY,
  fatal: 0,
  error: 0,
  warn: 1,
  log: 2,
  info: 3,
  success: 3,
  fail: 3,
  ready: 3,
  start: 3,
  box: 3,
  debug: 4,
  trace: 5,
  verbose: Number.POSITIVE_INFINITY
};
var LogTypes = {
  silent: {
    level: -1
  },
  fatal: {
    level: LogLevels.fatal
  },
  error: {
    level: LogLevels.error
  },
  warn: {
    level: LogLevels.warn
  },
  log: {
    level: LogLevels.log
  },
  info: {
    level: LogLevels.info
  },
  success: {
    level: LogLevels.success
  },
  fail: {
    level: LogLevels.fail
  },
  ready: {
    level: LogLevels.info
  },
  start: {
    level: LogLevels.info
  },
  box: {
    level: LogLevels.info
  },
  debug: {
    level: LogLevels.debug
  },
  trace: {
    level: LogLevels.trace
  },
  verbose: {
    level: LogLevels.verbose
  }
};
function isPlainObject$1(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== null && prototype !== Object.prototype && Object.getPrototypeOf(prototype) !== null) {
    return false;
  }
  if (Symbol.iterator in value) {
    return false;
  }
  if (Symbol.toStringTag in value) {
    return Object.prototype.toString.call(value) === "[object Module]";
  }
  return true;
}
function _defu(baseObject, defaults, namespace = ".", merger) {
  if (!isPlainObject$1(defaults)) {
    return _defu(baseObject, {}, namespace, merger);
  }
  const object = Object.assign({}, defaults);
  for (const key in baseObject) {
    if (key === "__proto__" || key === "constructor") {
      continue;
    }
    const value = baseObject[key];
    if (value === null || value === undefined) {
      continue;
    }
    if (merger && merger(object, key, value, namespace)) {
      continue;
    }
    if (Array.isArray(value) && Array.isArray(object[key])) {
      object[key] = [...value, ...object[key]];
    } else if (isPlainObject$1(value) && isPlainObject$1(object[key])) {
      object[key] = _defu(value, object[key], (namespace ? `${namespace}.` : "") + key.toString(), merger);
    } else {
      object[key] = value;
    }
  }
  return object;
}
function createDefu(merger) {
  return (...arguments_) => arguments_.reduce((p, c) => _defu(p, c, "", merger), {});
}
var defu = createDefu();
function isPlainObject(obj) {
  return Object.prototype.toString.call(obj) === "[object Object]";
}
function isLogObj(arg) {
  if (!isPlainObject(arg)) {
    return false;
  }
  if (!arg.message && !arg.args) {
    return false;
  }
  if (arg.stack) {
    return false;
  }
  return true;
}
var paused = false;
var queue = [];

class Consola {
  options;
  _lastLog;
  _mockFn;
  constructor(options = {}) {
    const types = options.types || LogTypes;
    this.options = defu({
      ...options,
      defaults: { ...options.defaults },
      level: _normalizeLogLevel(options.level, types),
      reporters: [...options.reporters || []]
    }, {
      types: LogTypes,
      throttle: 1000,
      throttleMin: 5,
      formatOptions: {
        date: true,
        colors: false,
        compact: true
      }
    });
    for (const type in types) {
      const defaults = {
        type,
        ...this.options.defaults,
        ...types[type]
      };
      this[type] = this._wrapLogFn(defaults);
      this[type].raw = this._wrapLogFn(defaults, true);
    }
    if (this.options.mockFn) {
      this.mockTypes();
    }
    this._lastLog = {};
  }
  get level() {
    return this.options.level;
  }
  set level(level) {
    this.options.level = _normalizeLogLevel(level, this.options.types, this.options.level);
  }
  prompt(message, opts) {
    if (!this.options.prompt) {
      throw new Error("prompt is not supported!");
    }
    return this.options.prompt(message, opts);
  }
  create(options) {
    const instance = new Consola({
      ...this.options,
      ...options
    });
    if (this._mockFn) {
      instance.mockTypes(this._mockFn);
    }
    return instance;
  }
  withDefaults(defaults) {
    return this.create({
      ...this.options,
      defaults: {
        ...this.options.defaults,
        ...defaults
      }
    });
  }
  withTag(tag) {
    return this.withDefaults({
      tag: this.options.defaults.tag ? this.options.defaults.tag + ":" + tag : tag
    });
  }
  addReporter(reporter) {
    this.options.reporters.push(reporter);
    return this;
  }
  removeReporter(reporter) {
    if (reporter) {
      const i = this.options.reporters.indexOf(reporter);
      if (i !== -1) {
        return this.options.reporters.splice(i, 1);
      }
    } else {
      this.options.reporters.splice(0);
    }
    return this;
  }
  setReporters(reporters) {
    this.options.reporters = Array.isArray(reporters) ? reporters : [reporters];
    return this;
  }
  wrapAll() {
    this.wrapConsole();
    this.wrapStd();
  }
  restoreAll() {
    this.restoreConsole();
    this.restoreStd();
  }
  wrapConsole() {
    for (const type in this.options.types) {
      if (!console["__" + type]) {
        console["__" + type] = console[type];
      }
      console[type] = this[type].raw;
    }
  }
  restoreConsole() {
    for (const type in this.options.types) {
      if (console["__" + type]) {
        console[type] = console["__" + type];
        delete console["__" + type];
      }
    }
  }
  wrapStd() {
    this._wrapStream(this.options.stdout, "log");
    this._wrapStream(this.options.stderr, "log");
  }
  _wrapStream(stream, type) {
    if (!stream) {
      return;
    }
    if (!stream.__write) {
      stream.__write = stream.write;
    }
    stream.write = (data) => {
      this[type].raw(String(data).trim());
    };
  }
  restoreStd() {
    this._restoreStream(this.options.stdout);
    this._restoreStream(this.options.stderr);
  }
  _restoreStream(stream) {
    if (!stream) {
      return;
    }
    if (stream.__write) {
      stream.write = stream.__write;
      delete stream.__write;
    }
  }
  pauseLogs() {
    paused = true;
  }
  resumeLogs() {
    paused = false;
    const _queue = queue.splice(0);
    for (const item of _queue) {
      item[0]._logFn(item[1], item[2]);
    }
  }
  mockTypes(mockFn) {
    const _mockFn = mockFn || this.options.mockFn;
    this._mockFn = _mockFn;
    if (typeof _mockFn !== "function") {
      return;
    }
    for (const type in this.options.types) {
      this[type] = _mockFn(type, this.options.types[type]) || this[type];
      this[type].raw = this[type];
    }
  }
  _wrapLogFn(defaults, isRaw) {
    return (...args) => {
      if (paused) {
        queue.push([this, defaults, args, isRaw]);
        return;
      }
      return this._logFn(defaults, args, isRaw);
    };
  }
  _logFn(defaults, args, isRaw) {
    if ((defaults.level || 0) > this.level) {
      return false;
    }
    const logObj = {
      date: /* @__PURE__ */ new Date,
      args: [],
      ...defaults,
      level: _normalizeLogLevel(defaults.level, this.options.types)
    };
    if (!isRaw && args.length === 1 && isLogObj(args[0])) {
      Object.assign(logObj, args[0]);
    } else {
      logObj.args = [...args];
    }
    if (logObj.message) {
      logObj.args.unshift(logObj.message);
      delete logObj.message;
    }
    if (logObj.additional) {
      if (!Array.isArray(logObj.additional)) {
        logObj.additional = logObj.additional.split(`
`);
      }
      logObj.args.push(`
` + logObj.additional.join(`
`));
      delete logObj.additional;
    }
    logObj.type = typeof logObj.type === "string" ? logObj.type.toLowerCase() : "log";
    logObj.tag = typeof logObj.tag === "string" ? logObj.tag : "";
    const resolveLog = (newLog = false) => {
      const repeated = (this._lastLog.count || 0) - this.options.throttleMin;
      if (this._lastLog.object && repeated > 0) {
        const args2 = [...this._lastLog.object.args];
        if (repeated > 1) {
          args2.push(`(repeated ${repeated} times)`);
        }
        this._log({ ...this._lastLog.object, args: args2 });
        this._lastLog.count = 1;
      }
      if (newLog) {
        this._lastLog.object = logObj;
        this._log(logObj);
      }
    };
    clearTimeout(this._lastLog.timeout);
    const diffTime = this._lastLog.time && logObj.date ? logObj.date.getTime() - this._lastLog.time.getTime() : 0;
    this._lastLog.time = logObj.date;
    if (diffTime < this.options.throttle) {
      try {
        const serializedLog = JSON.stringify([
          logObj.type,
          logObj.tag,
          logObj.args
        ]);
        const isSameLog = this._lastLog.serialized === serializedLog;
        this._lastLog.serialized = serializedLog;
        if (isSameLog) {
          this._lastLog.count = (this._lastLog.count || 0) + 1;
          if (this._lastLog.count > this.options.throttleMin) {
            this._lastLog.timeout = setTimeout(resolveLog, this.options.throttle);
            return;
          }
        }
      } catch {}
    }
    resolveLog(true);
  }
  _log(logObj) {
    for (const reporter of this.options.reporters) {
      reporter.log(logObj, {
        options: this.options
      });
    }
  }
}
function _normalizeLogLevel(input, types = {}, defaultLevel = 3) {
  if (input === undefined) {
    return defaultLevel;
  }
  if (typeof input === "number") {
    return input;
  }
  if (types[input] && types[input].level !== undefined) {
    return types[input].level;
  }
  return defaultLevel;
}
Consola.prototype.add = Consola.prototype.addReporter;
Consola.prototype.remove = Consola.prototype.removeReporter;
Consola.prototype.clear = Consola.prototype.removeReporter;
Consola.prototype.withScope = Consola.prototype.withTag;
Consola.prototype.mock = Consola.prototype.mockTypes;
Consola.prototype.pause = Consola.prototype.pauseLogs;
Consola.prototype.resume = Consola.prototype.resumeLogs;
function createConsola(options = {}) {
  return new Consola(options);
}
// node_modules/consola/dist/shared/consola.DRwqZj3T.mjs
import { formatWithOptions } from "util";
import { sep } from "path";
function parseStack(stack, message) {
  const cwd = process.cwd() + sep;
  const lines = stack.split(`
`).splice(message.split(`
`).length).map((l) => l.trim().replace("file://", "").replace(cwd, ""));
  return lines;
}
function writeStream(data, stream) {
  const write = stream.__write || stream.write;
  return write.call(stream, data);
}
var bracket = (x) => x ? `[${x}]` : "";

class BasicReporter {
  formatStack(stack, message, opts) {
    const indent = "  ".repeat((opts?.errorLevel || 0) + 1);
    return indent + parseStack(stack, message).join(`
${indent}`);
  }
  formatError(err, opts) {
    const message = err.message ?? formatWithOptions(opts, err);
    const stack = err.stack ? this.formatStack(err.stack, message, opts) : "";
    const level = opts?.errorLevel || 0;
    const causedPrefix = level > 0 ? `${"  ".repeat(level)}[cause]: ` : "";
    const causedError = err.cause ? `

` + this.formatError(err.cause, { ...opts, errorLevel: level + 1 }) : "";
    return causedPrefix + message + `
` + stack + causedError;
  }
  formatArgs(args, opts) {
    const _args = args.map((arg) => {
      if (arg && typeof arg.stack === "string") {
        return this.formatError(arg, opts);
      }
      return arg;
    });
    return formatWithOptions(opts, ..._args);
  }
  formatDate(date, opts) {
    return opts.date ? date.toLocaleTimeString() : "";
  }
  filterAndJoin(arr) {
    return arr.filter(Boolean).join(" ");
  }
  formatLogObj(logObj, opts) {
    const message = this.formatArgs(logObj.args, opts);
    if (logObj.type === "box") {
      return `
` + [
        bracket(logObj.tag),
        logObj.title && logObj.title,
        ...message.split(`
`)
      ].filter(Boolean).map((l) => " > " + l).join(`
`) + `
`;
    }
    return this.filterAndJoin([
      bracket(logObj.type),
      bracket(logObj.tag),
      message
    ]);
  }
  log(logObj, ctx) {
    const line = this.formatLogObj(logObj, {
      columns: ctx.options.stdout.columns || 0,
      ...ctx.options.formatOptions
    });
    return writeStream(line + `
`, logObj.level < 2 ? ctx.options.stderr || process.stderr : ctx.options.stdout || process.stdout);
  }
}

// node_modules/consola/dist/index.mjs
import g$1 from "process";

// node_modules/consola/dist/shared/consola.DXBYu-KD.mjs
import * as tty from "tty";
var {
  env = {},
  argv = [],
  platform = ""
} = typeof process === "undefined" ? {} : process;
var isDisabled = "NO_COLOR" in env || argv.includes("--no-color");
var isForced = "FORCE_COLOR" in env || argv.includes("--color");
var isWindows = platform === "win32";
var isDumbTerminal = env.TERM === "dumb";
var isCompatibleTerminal = tty && tty.isatty && tty.isatty(1) && env.TERM && !isDumbTerminal;
var isCI = "CI" in env && (("GITHUB_ACTIONS" in env) || ("GITLAB_CI" in env) || ("CIRCLECI" in env));
var isColorSupported = !isDisabled && (isForced || isWindows && !isDumbTerminal || isCompatibleTerminal || isCI);
function replaceClose(index, string, close, replace, head = string.slice(0, Math.max(0, index)) + replace, tail = string.slice(Math.max(0, index + close.length)), next = tail.indexOf(close)) {
  return head + (next < 0 ? tail : replaceClose(next, tail, close, replace));
}
function clearBleed(index, string, open, close, replace) {
  return index < 0 ? open + string + close : open + replaceClose(index, string, close, replace) + close;
}
function filterEmpty(open, close, replace = open, at = open.length + 1) {
  return (string) => string || !(string === "" || string === undefined) ? clearBleed(("" + string).indexOf(close, at), string, open, close, replace) : "";
}
function init(open, close, replace) {
  return filterEmpty(`\x1B[${open}m`, `\x1B[${close}m`, replace);
}
var colorDefs = {
  reset: init(0, 0),
  bold: init(1, 22, "\x1B[22m\x1B[1m"),
  dim: init(2, 22, "\x1B[22m\x1B[2m"),
  italic: init(3, 23),
  underline: init(4, 24),
  inverse: init(7, 27),
  hidden: init(8, 28),
  strikethrough: init(9, 29),
  black: init(30, 39),
  red: init(31, 39),
  green: init(32, 39),
  yellow: init(33, 39),
  blue: init(34, 39),
  magenta: init(35, 39),
  cyan: init(36, 39),
  white: init(37, 39),
  gray: init(90, 39),
  bgBlack: init(40, 49),
  bgRed: init(41, 49),
  bgGreen: init(42, 49),
  bgYellow: init(43, 49),
  bgBlue: init(44, 49),
  bgMagenta: init(45, 49),
  bgCyan: init(46, 49),
  bgWhite: init(47, 49),
  blackBright: init(90, 39),
  redBright: init(91, 39),
  greenBright: init(92, 39),
  yellowBright: init(93, 39),
  blueBright: init(94, 39),
  magentaBright: init(95, 39),
  cyanBright: init(96, 39),
  whiteBright: init(97, 39),
  bgBlackBright: init(100, 49),
  bgRedBright: init(101, 49),
  bgGreenBright: init(102, 49),
  bgYellowBright: init(103, 49),
  bgBlueBright: init(104, 49),
  bgMagentaBright: init(105, 49),
  bgCyanBright: init(106, 49),
  bgWhiteBright: init(107, 49)
};
function createColors(useColor = isColorSupported) {
  return useColor ? colorDefs : Object.fromEntries(Object.keys(colorDefs).map((key) => [key, String]));
}
var colors = createColors();
function getColor(color, fallback = "reset") {
  return colors[color] || colors[fallback];
}
var ansiRegex = [
  String.raw`[\u001B\u009B][[\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\d\/#&.:=?%@~_]+)*|[a-zA-Z\d]+(?:;[-a-zA-Z\d\/#&.:=?%@~_]*)*)?\u0007)`,
  String.raw`(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))`
].join("|");
function stripAnsi(text) {
  return text.replace(new RegExp(ansiRegex, "g"), "");
}
var boxStylePresets = {
  solid: {
    tl: "\u250C",
    tr: "\u2510",
    bl: "\u2514",
    br: "\u2518",
    h: "\u2500",
    v: "\u2502"
  },
  double: {
    tl: "\u2554",
    tr: "\u2557",
    bl: "\u255A",
    br: "\u255D",
    h: "\u2550",
    v: "\u2551"
  },
  doubleSingle: {
    tl: "\u2553",
    tr: "\u2556",
    bl: "\u2559",
    br: "\u255C",
    h: "\u2500",
    v: "\u2551"
  },
  doubleSingleRounded: {
    tl: "\u256D",
    tr: "\u256E",
    bl: "\u2570",
    br: "\u256F",
    h: "\u2500",
    v: "\u2551"
  },
  singleThick: {
    tl: "\u250F",
    tr: "\u2513",
    bl: "\u2517",
    br: "\u251B",
    h: "\u2501",
    v: "\u2503"
  },
  singleDouble: {
    tl: "\u2552",
    tr: "\u2555",
    bl: "\u2558",
    br: "\u255B",
    h: "\u2550",
    v: "\u2502"
  },
  singleDoubleRounded: {
    tl: "\u256D",
    tr: "\u256E",
    bl: "\u2570",
    br: "\u256F",
    h: "\u2550",
    v: "\u2502"
  },
  rounded: {
    tl: "\u256D",
    tr: "\u256E",
    bl: "\u2570",
    br: "\u256F",
    h: "\u2500",
    v: "\u2502"
  }
};
var defaultStyle = {
  borderColor: "white",
  borderStyle: "rounded",
  valign: "center",
  padding: 2,
  marginLeft: 1,
  marginTop: 1,
  marginBottom: 1
};
function box(text, _opts = {}) {
  const opts = {
    ..._opts,
    style: {
      ...defaultStyle,
      ..._opts.style
    }
  };
  const textLines = text.split(`
`);
  const boxLines = [];
  const _color = getColor(opts.style.borderColor);
  const borderStyle = {
    ...typeof opts.style.borderStyle === "string" ? boxStylePresets[opts.style.borderStyle] || boxStylePresets.solid : opts.style.borderStyle
  };
  if (_color) {
    for (const key in borderStyle) {
      borderStyle[key] = _color(borderStyle[key]);
    }
  }
  const paddingOffset = opts.style.padding % 2 === 0 ? opts.style.padding : opts.style.padding + 1;
  const height = textLines.length + paddingOffset;
  const width = Math.max(...textLines.map((line) => stripAnsi(line).length), opts.title ? stripAnsi(opts.title).length : 0) + paddingOffset;
  const widthOffset = width + paddingOffset;
  const leftSpace = opts.style.marginLeft > 0 ? " ".repeat(opts.style.marginLeft) : "";
  if (opts.style.marginTop > 0) {
    boxLines.push("".repeat(opts.style.marginTop));
  }
  if (opts.title) {
    const title = _color ? _color(opts.title) : opts.title;
    const left = borderStyle.h.repeat(Math.floor((width - stripAnsi(opts.title).length) / 2));
    const right = borderStyle.h.repeat(width - stripAnsi(opts.title).length - stripAnsi(left).length + paddingOffset);
    boxLines.push(`${leftSpace}${borderStyle.tl}${left}${title}${right}${borderStyle.tr}`);
  } else {
    boxLines.push(`${leftSpace}${borderStyle.tl}${borderStyle.h.repeat(widthOffset)}${borderStyle.tr}`);
  }
  const valignOffset = opts.style.valign === "center" ? Math.floor((height - textLines.length) / 2) : opts.style.valign === "top" ? height - textLines.length - paddingOffset : height - textLines.length;
  for (let i = 0;i < height; i++) {
    if (i < valignOffset || i >= valignOffset + textLines.length) {
      boxLines.push(`${leftSpace}${borderStyle.v}${" ".repeat(widthOffset)}${borderStyle.v}`);
    } else {
      const line = textLines[i - valignOffset];
      const left = " ".repeat(paddingOffset);
      const right = " ".repeat(width - stripAnsi(line).length);
      boxLines.push(`${leftSpace}${borderStyle.v}${left}${line}${right}${borderStyle.v}`);
    }
  }
  boxLines.push(`${leftSpace}${borderStyle.bl}${borderStyle.h.repeat(widthOffset)}${borderStyle.br}`);
  if (opts.style.marginBottom > 0) {
    boxLines.push("".repeat(opts.style.marginBottom));
  }
  return boxLines.join(`
`);
}

// node_modules/consola/dist/index.mjs
var r2 = Object.create(null);
var i = (e2) => globalThis.process?.env || import.meta.env || globalThis.Deno?.env.toObject() || globalThis.__env__ || (e2 ? r2 : globalThis);
var o2 = new Proxy(r2, { get(e2, s) {
  return i()[s] ?? r2[s];
}, has(e2, s) {
  const E = i();
  return s in E || s in r2;
}, set(e2, s, E) {
  const B2 = i(true);
  return B2[s] = E, true;
}, deleteProperty(e2, s) {
  if (!s)
    return false;
  const E = i(true);
  return delete E[s], true;
}, ownKeys() {
  const e2 = i(true);
  return Object.keys(e2);
} });
var t = typeof process < "u" && process.env && "development" || "";
var f2 = [["APPVEYOR"], ["AWS_AMPLIFY", "AWS_APP_ID", { ci: true }], ["AZURE_PIPELINES", "SYSTEM_TEAMFOUNDATIONCOLLECTIONURI"], ["AZURE_STATIC", "INPUT_AZURE_STATIC_WEB_APPS_API_TOKEN"], ["APPCIRCLE", "AC_APPCIRCLE"], ["BAMBOO", "bamboo_planKey"], ["BITBUCKET", "BITBUCKET_COMMIT"], ["BITRISE", "BITRISE_IO"], ["BUDDY", "BUDDY_WORKSPACE_ID"], ["BUILDKITE"], ["CIRCLE", "CIRCLECI"], ["CIRRUS", "CIRRUS_CI"], ["CLOUDFLARE_PAGES", "CF_PAGES", { ci: true }], ["CODEBUILD", "CODEBUILD_BUILD_ARN"], ["CODEFRESH", "CF_BUILD_ID"], ["DRONE"], ["DRONE", "DRONE_BUILD_EVENT"], ["DSARI"], ["GITHUB_ACTIONS"], ["GITLAB", "GITLAB_CI"], ["GITLAB", "CI_MERGE_REQUEST_ID"], ["GOCD", "GO_PIPELINE_LABEL"], ["LAYERCI"], ["HUDSON", "HUDSON_URL"], ["JENKINS", "JENKINS_URL"], ["MAGNUM"], ["NETLIFY"], ["NETLIFY", "NETLIFY_LOCAL", { ci: false }], ["NEVERCODE"], ["RENDER"], ["SAIL", "SAILCI"], ["SEMAPHORE"], ["SCREWDRIVER"], ["SHIPPABLE"], ["SOLANO", "TDDIUM"], ["STRIDER"], ["TEAMCITY", "TEAMCITY_VERSION"], ["TRAVIS"], ["VERCEL", "NOW_BUILDER"], ["VERCEL", "VERCEL", { ci: false }], ["VERCEL", "VERCEL_ENV", { ci: false }], ["APPCENTER", "APPCENTER_BUILD_ID"], ["CODESANDBOX", "CODESANDBOX_SSE", { ci: false }], ["CODESANDBOX", "CODESANDBOX_HOST", { ci: false }], ["STACKBLITZ"], ["STORMKIT"], ["CLEAVR"], ["ZEABUR"], ["CODESPHERE", "CODESPHERE_APP_ID", { ci: true }], ["RAILWAY", "RAILWAY_PROJECT_ID"], ["RAILWAY", "RAILWAY_SERVICE_ID"], ["DENO-DEPLOY", "DENO_DEPLOYMENT_ID"], ["FIREBASE_APP_HOSTING", "FIREBASE_APP_HOSTING", { ci: true }]];
function b() {
  if (globalThis.process?.env)
    for (const e2 of f2) {
      const s = e2[1] || e2[0];
      if (globalThis.process?.env[s])
        return { name: e2[0].toLowerCase(), ...e2[2] };
    }
  return globalThis.process?.env?.SHELL === "/bin/jsh" && globalThis.process?.versions?.webcontainer ? { name: "stackblitz", ci: false } : { name: "", ci: false };
}
var l = b();
l.name;
function n(e2) {
  return e2 ? e2 !== "false" : false;
}
var I2 = globalThis.process?.platform || "";
var T2 = n(o2.CI) || l.ci !== false;
var a = n(globalThis.process?.stdout && globalThis.process?.stdout.isTTY);
var g2 = n(o2.DEBUG);
var R2 = t === "test" || n(o2.TEST);
n(o2.MINIMAL);
var A2 = /^win/i.test(I2);
!n(o2.NO_COLOR) && (n(o2.FORCE_COLOR) || (a || A2) && o2.TERM);
var C2 = (globalThis.process?.versions?.node || "").replace(/^v/, "") || null;
Number(C2?.split(".")[0]);
var y2 = globalThis.process || Object.create(null);
var _2 = { versions: {} };
new Proxy(y2, { get(e2, s) {
  if (s === "env")
    return o2;
  if (s in e2)
    return e2[s];
  if (s in _2)
    return _2[s];
} });
var c2 = globalThis.process?.release?.name === "node";
var O2 = !!globalThis.Bun || !!globalThis.process?.versions?.bun;
var D = !!globalThis.Deno;
var L2 = !!globalThis.fastly;
var S2 = !!globalThis.Netlify;
var u2 = !!globalThis.EdgeRuntime;
var N2 = globalThis.navigator?.userAgent === "Cloudflare-Workers";
var F2 = [[S2, "netlify"], [u2, "edge-light"], [N2, "workerd"], [L2, "fastly"], [D, "deno"], [O2, "bun"], [c2, "node"]];
function G2() {
  const e2 = F2.find((s) => s[0]);
  if (e2)
    return { name: e2[1] };
}
var P2 = G2();
P2?.name;
function ansiRegex2({ onlyFirst = false } = {}) {
  const ST = "(?:\\u0007|\\u001B\\u005C|\\u009C)";
  const pattern = [
    `[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?${ST})`,
    "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))"
  ].join("|");
  return new RegExp(pattern, onlyFirst ? undefined : "g");
}
var regex = ansiRegex2();
function stripAnsi2(string) {
  if (typeof string !== "string") {
    throw new TypeError(`Expected a \`string\`, got \`${typeof string}\``);
  }
  return string.replace(regex, "");
}
function isAmbiguous(x2) {
  return x2 === 161 || x2 === 164 || x2 === 167 || x2 === 168 || x2 === 170 || x2 === 173 || x2 === 174 || x2 >= 176 && x2 <= 180 || x2 >= 182 && x2 <= 186 || x2 >= 188 && x2 <= 191 || x2 === 198 || x2 === 208 || x2 === 215 || x2 === 216 || x2 >= 222 && x2 <= 225 || x2 === 230 || x2 >= 232 && x2 <= 234 || x2 === 236 || x2 === 237 || x2 === 240 || x2 === 242 || x2 === 243 || x2 >= 247 && x2 <= 250 || x2 === 252 || x2 === 254 || x2 === 257 || x2 === 273 || x2 === 275 || x2 === 283 || x2 === 294 || x2 === 295 || x2 === 299 || x2 >= 305 && x2 <= 307 || x2 === 312 || x2 >= 319 && x2 <= 322 || x2 === 324 || x2 >= 328 && x2 <= 331 || x2 === 333 || x2 === 338 || x2 === 339 || x2 === 358 || x2 === 359 || x2 === 363 || x2 === 462 || x2 === 464 || x2 === 466 || x2 === 468 || x2 === 470 || x2 === 472 || x2 === 474 || x2 === 476 || x2 === 593 || x2 === 609 || x2 === 708 || x2 === 711 || x2 >= 713 && x2 <= 715 || x2 === 717 || x2 === 720 || x2 >= 728 && x2 <= 731 || x2 === 733 || x2 === 735 || x2 >= 768 && x2 <= 879 || x2 >= 913 && x2 <= 929 || x2 >= 931 && x2 <= 937 || x2 >= 945 && x2 <= 961 || x2 >= 963 && x2 <= 969 || x2 === 1025 || x2 >= 1040 && x2 <= 1103 || x2 === 1105 || x2 === 8208 || x2 >= 8211 && x2 <= 8214 || x2 === 8216 || x2 === 8217 || x2 === 8220 || x2 === 8221 || x2 >= 8224 && x2 <= 8226 || x2 >= 8228 && x2 <= 8231 || x2 === 8240 || x2 === 8242 || x2 === 8243 || x2 === 8245 || x2 === 8251 || x2 === 8254 || x2 === 8308 || x2 === 8319 || x2 >= 8321 && x2 <= 8324 || x2 === 8364 || x2 === 8451 || x2 === 8453 || x2 === 8457 || x2 === 8467 || x2 === 8470 || x2 === 8481 || x2 === 8482 || x2 === 8486 || x2 === 8491 || x2 === 8531 || x2 === 8532 || x2 >= 8539 && x2 <= 8542 || x2 >= 8544 && x2 <= 8555 || x2 >= 8560 && x2 <= 8569 || x2 === 8585 || x2 >= 8592 && x2 <= 8601 || x2 === 8632 || x2 === 8633 || x2 === 8658 || x2 === 8660 || x2 === 8679 || x2 === 8704 || x2 === 8706 || x2 === 8707 || x2 === 8711 || x2 === 8712 || x2 === 8715 || x2 === 8719 || x2 === 8721 || x2 === 8725 || x2 === 8730 || x2 >= 8733 && x2 <= 8736 || x2 === 8739 || x2 === 8741 || x2 >= 8743 && x2 <= 8748 || x2 === 8750 || x2 >= 8756 && x2 <= 8759 || x2 === 8764 || x2 === 8765 || x2 === 8776 || x2 === 8780 || x2 === 8786 || x2 === 8800 || x2 === 8801 || x2 >= 8804 && x2 <= 8807 || x2 === 8810 || x2 === 8811 || x2 === 8814 || x2 === 8815 || x2 === 8834 || x2 === 8835 || x2 === 8838 || x2 === 8839 || x2 === 8853 || x2 === 8857 || x2 === 8869 || x2 === 8895 || x2 === 8978 || x2 >= 9312 && x2 <= 9449 || x2 >= 9451 && x2 <= 9547 || x2 >= 9552 && x2 <= 9587 || x2 >= 9600 && x2 <= 9615 || x2 >= 9618 && x2 <= 9621 || x2 === 9632 || x2 === 9633 || x2 >= 9635 && x2 <= 9641 || x2 === 9650 || x2 === 9651 || x2 === 9654 || x2 === 9655 || x2 === 9660 || x2 === 9661 || x2 === 9664 || x2 === 9665 || x2 >= 9670 && x2 <= 9672 || x2 === 9675 || x2 >= 9678 && x2 <= 9681 || x2 >= 9698 && x2 <= 9701 || x2 === 9711 || x2 === 9733 || x2 === 9734 || x2 === 9737 || x2 === 9742 || x2 === 9743 || x2 === 9756 || x2 === 9758 || x2 === 9792 || x2 === 9794 || x2 === 9824 || x2 === 9825 || x2 >= 9827 && x2 <= 9829 || x2 >= 9831 && x2 <= 9834 || x2 === 9836 || x2 === 9837 || x2 === 9839 || x2 === 9886 || x2 === 9887 || x2 === 9919 || x2 >= 9926 && x2 <= 9933 || x2 >= 9935 && x2 <= 9939 || x2 >= 9941 && x2 <= 9953 || x2 === 9955 || x2 === 9960 || x2 === 9961 || x2 >= 9963 && x2 <= 9969 || x2 === 9972 || x2 >= 9974 && x2 <= 9977 || x2 === 9979 || x2 === 9980 || x2 === 9982 || x2 === 9983 || x2 === 10045 || x2 >= 10102 && x2 <= 10111 || x2 >= 11094 && x2 <= 11097 || x2 >= 12872 && x2 <= 12879 || x2 >= 57344 && x2 <= 63743 || x2 >= 65024 && x2 <= 65039 || x2 === 65533 || x2 >= 127232 && x2 <= 127242 || x2 >= 127248 && x2 <= 127277 || x2 >= 127280 && x2 <= 127337 || x2 >= 127344 && x2 <= 127373 || x2 === 127375 || x2 === 127376 || x2 >= 127387 && x2 <= 127404 || x2 >= 917760 && x2 <= 917999 || x2 >= 983040 && x2 <= 1048573 || x2 >= 1048576 && x2 <= 1114109;
}
function isFullWidth(x2) {
  return x2 === 12288 || x2 >= 65281 && x2 <= 65376 || x2 >= 65504 && x2 <= 65510;
}
function isWide(x2) {
  return x2 >= 4352 && x2 <= 4447 || x2 === 8986 || x2 === 8987 || x2 === 9001 || x2 === 9002 || x2 >= 9193 && x2 <= 9196 || x2 === 9200 || x2 === 9203 || x2 === 9725 || x2 === 9726 || x2 === 9748 || x2 === 9749 || x2 >= 9776 && x2 <= 9783 || x2 >= 9800 && x2 <= 9811 || x2 === 9855 || x2 >= 9866 && x2 <= 9871 || x2 === 9875 || x2 === 9889 || x2 === 9898 || x2 === 9899 || x2 === 9917 || x2 === 9918 || x2 === 9924 || x2 === 9925 || x2 === 9934 || x2 === 9940 || x2 === 9962 || x2 === 9970 || x2 === 9971 || x2 === 9973 || x2 === 9978 || x2 === 9981 || x2 === 9989 || x2 === 9994 || x2 === 9995 || x2 === 10024 || x2 === 10060 || x2 === 10062 || x2 >= 10067 && x2 <= 10069 || x2 === 10071 || x2 >= 10133 && x2 <= 10135 || x2 === 10160 || x2 === 10175 || x2 === 11035 || x2 === 11036 || x2 === 11088 || x2 === 11093 || x2 >= 11904 && x2 <= 11929 || x2 >= 11931 && x2 <= 12019 || x2 >= 12032 && x2 <= 12245 || x2 >= 12272 && x2 <= 12287 || x2 >= 12289 && x2 <= 12350 || x2 >= 12353 && x2 <= 12438 || x2 >= 12441 && x2 <= 12543 || x2 >= 12549 && x2 <= 12591 || x2 >= 12593 && x2 <= 12686 || x2 >= 12688 && x2 <= 12773 || x2 >= 12783 && x2 <= 12830 || x2 >= 12832 && x2 <= 12871 || x2 >= 12880 && x2 <= 42124 || x2 >= 42128 && x2 <= 42182 || x2 >= 43360 && x2 <= 43388 || x2 >= 44032 && x2 <= 55203 || x2 >= 63744 && x2 <= 64255 || x2 >= 65040 && x2 <= 65049 || x2 >= 65072 && x2 <= 65106 || x2 >= 65108 && x2 <= 65126 || x2 >= 65128 && x2 <= 65131 || x2 >= 94176 && x2 <= 94180 || x2 === 94192 || x2 === 94193 || x2 >= 94208 && x2 <= 100343 || x2 >= 100352 && x2 <= 101589 || x2 >= 101631 && x2 <= 101640 || x2 >= 110576 && x2 <= 110579 || x2 >= 110581 && x2 <= 110587 || x2 === 110589 || x2 === 110590 || x2 >= 110592 && x2 <= 110882 || x2 === 110898 || x2 >= 110928 && x2 <= 110930 || x2 === 110933 || x2 >= 110948 && x2 <= 110951 || x2 >= 110960 && x2 <= 111355 || x2 >= 119552 && x2 <= 119638 || x2 >= 119648 && x2 <= 119670 || x2 === 126980 || x2 === 127183 || x2 === 127374 || x2 >= 127377 && x2 <= 127386 || x2 >= 127488 && x2 <= 127490 || x2 >= 127504 && x2 <= 127547 || x2 >= 127552 && x2 <= 127560 || x2 === 127568 || x2 === 127569 || x2 >= 127584 && x2 <= 127589 || x2 >= 127744 && x2 <= 127776 || x2 >= 127789 && x2 <= 127797 || x2 >= 127799 && x2 <= 127868 || x2 >= 127870 && x2 <= 127891 || x2 >= 127904 && x2 <= 127946 || x2 >= 127951 && x2 <= 127955 || x2 >= 127968 && x2 <= 127984 || x2 === 127988 || x2 >= 127992 && x2 <= 128062 || x2 === 128064 || x2 >= 128066 && x2 <= 128252 || x2 >= 128255 && x2 <= 128317 || x2 >= 128331 && x2 <= 128334 || x2 >= 128336 && x2 <= 128359 || x2 === 128378 || x2 === 128405 || x2 === 128406 || x2 === 128420 || x2 >= 128507 && x2 <= 128591 || x2 >= 128640 && x2 <= 128709 || x2 === 128716 || x2 >= 128720 && x2 <= 128722 || x2 >= 128725 && x2 <= 128727 || x2 >= 128732 && x2 <= 128735 || x2 === 128747 || x2 === 128748 || x2 >= 128756 && x2 <= 128764 || x2 >= 128992 && x2 <= 129003 || x2 === 129008 || x2 >= 129292 && x2 <= 129338 || x2 >= 129340 && x2 <= 129349 || x2 >= 129351 && x2 <= 129535 || x2 >= 129648 && x2 <= 129660 || x2 >= 129664 && x2 <= 129673 || x2 >= 129679 && x2 <= 129734 || x2 >= 129742 && x2 <= 129756 || x2 >= 129759 && x2 <= 129769 || x2 >= 129776 && x2 <= 129784 || x2 >= 131072 && x2 <= 196605 || x2 >= 196608 && x2 <= 262141;
}
function validate(codePoint) {
  if (!Number.isSafeInteger(codePoint)) {
    throw new TypeError(`Expected a code point, got \`${typeof codePoint}\`.`);
  }
}
function eastAsianWidth(codePoint, { ambiguousAsWide = false } = {}) {
  validate(codePoint);
  if (isFullWidth(codePoint) || isWide(codePoint) || ambiguousAsWide && isAmbiguous(codePoint)) {
    return 2;
  }
  return 1;
}
var emojiRegex = () => {
  return /[#*0-9]\uFE0F?\u20E3|[\xA9\xAE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9\u21AA\u231A\u231B\u2328\u23CF\u23ED-\u23EF\u23F1\u23F2\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB\u25FC\u25FE\u2600-\u2604\u260E\u2611\u2614\u2615\u2618\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2640\u2642\u2648-\u2653\u265F\u2660\u2663\u2665\u2666\u2668\u267B\u267E\u267F\u2692\u2694-\u2697\u2699\u269B\u269C\u26A0\u26A7\u26AA\u26B0\u26B1\u26BD\u26BE\u26C4\u26C8\u26CF\u26D1\u26E9\u26F0-\u26F5\u26F7\u26F8\u26FA\u2702\u2708\u2709\u270F\u2712\u2714\u2716\u271D\u2721\u2733\u2734\u2744\u2747\u2757\u2763\u27A1\u2934\u2935\u2B05-\u2B07\u2B1B\u2B1C\u2B55\u3030\u303D\u3297\u3299]\uFE0F?|[\u261D\u270C\u270D](?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?|[\u270A\u270B](?:\uD83C[\uDFFB-\uDFFF])?|[\u23E9-\u23EC\u23F0\u23F3\u25FD\u2693\u26A1\u26AB\u26C5\u26CE\u26D4\u26EA\u26FD\u2705\u2728\u274C\u274E\u2753-\u2755\u2795-\u2797\u27B0\u27BF\u2B50]|\u26D3\uFE0F?(?:\u200D\uD83D\uDCA5)?|\u26F9(?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?(?:\u200D[\u2640\u2642]\uFE0F?)?|\u2764\uFE0F?(?:\u200D(?:\uD83D\uDD25|\uD83E\uDE79))?|\uD83C(?:[\uDC04\uDD70\uDD71\uDD7E\uDD7F\uDE02\uDE37\uDF21\uDF24-\uDF2C\uDF36\uDF7D\uDF96\uDF97\uDF99-\uDF9B\uDF9E\uDF9F\uDFCD\uDFCE\uDFD4-\uDFDF\uDFF5\uDFF7]\uFE0F?|[\uDF85\uDFC2\uDFC7](?:\uD83C[\uDFFB-\uDFFF])?|[\uDFC4\uDFCA](?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDFCB\uDFCC](?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDCCF\uDD8E\uDD91-\uDD9A\uDE01\uDE1A\uDE2F\uDE32-\uDE36\uDE38-\uDE3A\uDE50\uDE51\uDF00-\uDF20\uDF2D-\uDF35\uDF37-\uDF43\uDF45-\uDF4A\uDF4C-\uDF7C\uDF7E-\uDF84\uDF86-\uDF93\uDFA0-\uDFC1\uDFC5\uDFC6\uDFC8\uDFC9\uDFCF-\uDFD3\uDFE0-\uDFF0\uDFF8-\uDFFF]|\uDDE6\uD83C[\uDDE8-\uDDEC\uDDEE\uDDF1\uDDF2\uDDF4\uDDF6-\uDDFA\uDDFC\uDDFD\uDDFF]|\uDDE7\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEF\uDDF1-\uDDF4\uDDF6-\uDDF9\uDDFB\uDDFC\uDDFE\uDDFF]|\uDDE8\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDEE\uDDF0-\uDDF7\uDDFA-\uDDFF]|\uDDE9\uD83C[\uDDEA\uDDEC\uDDEF\uDDF0\uDDF2\uDDF4\uDDFF]|\uDDEA\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDED\uDDF7-\uDDFA]|\uDDEB\uD83C[\uDDEE-\uDDF0\uDDF2\uDDF4\uDDF7]|\uDDEC\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEE\uDDF1-\uDDF3\uDDF5-\uDDFA\uDDFC\uDDFE]|\uDDED\uD83C[\uDDF0\uDDF2\uDDF3\uDDF7\uDDF9\uDDFA]|\uDDEE\uD83C[\uDDE8-\uDDEA\uDDF1-\uDDF4\uDDF6-\uDDF9]|\uDDEF\uD83C[\uDDEA\uDDF2\uDDF4\uDDF5]|\uDDF0\uD83C[\uDDEA\uDDEC-\uDDEE\uDDF2\uDDF3\uDDF5\uDDF7\uDDFC\uDDFE\uDDFF]|\uDDF1\uD83C[\uDDE6-\uDDE8\uDDEE\uDDF0\uDDF7-\uDDFB\uDDFE]|\uDDF2\uD83C[\uDDE6\uDDE8-\uDDED\uDDF0-\uDDFF]|\uDDF3\uD83C[\uDDE6\uDDE8\uDDEA-\uDDEC\uDDEE\uDDF1\uDDF4\uDDF5\uDDF7\uDDFA\uDDFF]|\uDDF4\uD83C\uDDF2|\uDDF5\uD83C[\uDDE6\uDDEA-\uDDED\uDDF0-\uDDF3\uDDF7-\uDDF9\uDDFC\uDDFE]|\uDDF6\uD83C\uDDE6|\uDDF7\uD83C[\uDDEA\uDDF4\uDDF8\uDDFA\uDDFC]|\uDDF8\uD83C[\uDDE6-\uDDEA\uDDEC-\uDDF4\uDDF7-\uDDF9\uDDFB\uDDFD-\uDDFF]|\uDDF9\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDED\uDDEF-\uDDF4\uDDF7\uDDF9\uDDFB\uDDFC\uDDFF]|\uDDFA\uD83C[\uDDE6\uDDEC\uDDF2\uDDF3\uDDF8\uDDFE\uDDFF]|\uDDFB\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDEE\uDDF3\uDDFA]|\uDDFC\uD83C[\uDDEB\uDDF8]|\uDDFD\uD83C\uDDF0|\uDDFE\uD83C[\uDDEA\uDDF9]|\uDDFF\uD83C[\uDDE6\uDDF2\uDDFC]|\uDF44(?:\u200D\uD83D\uDFEB)?|\uDF4B(?:\u200D\uD83D\uDFE9)?|\uDFC3(?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D(?:[\u2640\u2642]\uFE0F?(?:\u200D\u27A1\uFE0F?)?|\u27A1\uFE0F?))?|\uDFF3\uFE0F?(?:\u200D(?:\u26A7\uFE0F?|\uD83C\uDF08))?|\uDFF4(?:\u200D\u2620\uFE0F?|\uDB40\uDC67\uDB40\uDC62\uDB40(?:\uDC65\uDB40\uDC6E\uDB40\uDC67|\uDC73\uDB40\uDC63\uDB40\uDC74|\uDC77\uDB40\uDC6C\uDB40\uDC73)\uDB40\uDC7F)?)|\uD83D(?:[\uDC3F\uDCFD\uDD49\uDD4A\uDD6F\uDD70\uDD73\uDD76-\uDD79\uDD87\uDD8A-\uDD8D\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA\uDECB\uDECD-\uDECF\uDEE0-\uDEE5\uDEE9\uDEF0\uDEF3]\uFE0F?|[\uDC42\uDC43\uDC46-\uDC50\uDC66\uDC67\uDC6B-\uDC6D\uDC72\uDC74-\uDC76\uDC78\uDC7C\uDC83\uDC85\uDC8F\uDC91\uDCAA\uDD7A\uDD95\uDD96\uDE4C\uDE4F\uDEC0\uDECC](?:\uD83C[\uDFFB-\uDFFF])?|[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4\uDEB5](?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDD74\uDD90](?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?|[\uDC00-\uDC07\uDC09-\uDC14\uDC16-\uDC25\uDC27-\uDC3A\uDC3C-\uDC3E\uDC40\uDC44\uDC45\uDC51-\uDC65\uDC6A\uDC79-\uDC7B\uDC7D-\uDC80\uDC84\uDC88-\uDC8E\uDC90\uDC92-\uDCA9\uDCAB-\uDCFC\uDCFF-\uDD3D\uDD4B-\uDD4E\uDD50-\uDD67\uDDA4\uDDFB-\uDE2D\uDE2F-\uDE34\uDE37-\uDE41\uDE43\uDE44\uDE48-\uDE4A\uDE80-\uDEA2\uDEA4-\uDEB3\uDEB7-\uDEBF\uDEC1-\uDEC5\uDED0-\uDED2\uDED5-\uDED7\uDEDC-\uDEDF\uDEEB\uDEEC\uDEF4-\uDEFC\uDFE0-\uDFEB\uDFF0]|\uDC08(?:\u200D\u2B1B)?|\uDC15(?:\u200D\uD83E\uDDBA)?|\uDC26(?:\u200D(?:\u2B1B|\uD83D\uDD25))?|\uDC3B(?:\u200D\u2744\uFE0F?)?|\uDC41\uFE0F?(?:\u200D\uD83D\uDDE8\uFE0F?)?|\uDC68(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDC68\uDC69]\u200D\uD83D(?:\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?)|[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?)|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]))|\uD83C(?:\uDFFB(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D\uDC68\uD83C[\uDFFC-\uDFFF])))?|\uDFFC(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D\uDC68\uD83C[\uDFFB\uDFFD-\uDFFF])))?|\uDFFD(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D\uDC68\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])))?|\uDFFE(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D\uDC68\uD83C[\uDFFB-\uDFFD\uDFFF])))?|\uDFFF(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D\uDC68\uD83C[\uDFFB-\uDFFE])))?))?|\uDC69(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?[\uDC68\uDC69]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?|\uDC69\u200D\uD83D(?:\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?))|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]))|\uD83C(?:\uDFFB(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFC-\uDFFF])))?|\uDFFC(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB\uDFFD-\uDFFF])))?|\uDFFD(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])))?|\uDFFE(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB-\uDFFD\uDFFF])))?|\uDFFF(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB-\uDFFE])))?))?|\uDC6F(?:\u200D[\u2640\u2642]\uFE0F?)?|\uDD75(?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?(?:\u200D[\u2640\u2642]\uFE0F?)?|\uDE2E(?:\u200D\uD83D\uDCA8)?|\uDE35(?:\u200D\uD83D\uDCAB)?|\uDE36(?:\u200D\uD83C\uDF2B\uFE0F?)?|\uDE42(?:\u200D[\u2194\u2195]\uFE0F?)?|\uDEB6(?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D(?:[\u2640\u2642]\uFE0F?(?:\u200D\u27A1\uFE0F?)?|\u27A1\uFE0F?))?)|\uD83E(?:[\uDD0C\uDD0F\uDD18-\uDD1F\uDD30-\uDD34\uDD36\uDD77\uDDB5\uDDB6\uDDBB\uDDD2\uDDD3\uDDD5\uDEC3-\uDEC5\uDEF0\uDEF2-\uDEF8](?:\uD83C[\uDFFB-\uDFFF])?|[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD\uDDCF\uDDD4\uDDD6-\uDDDD](?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDDDE\uDDDF](?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDD0D\uDD0E\uDD10-\uDD17\uDD20-\uDD25\uDD27-\uDD2F\uDD3A\uDD3F-\uDD45\uDD47-\uDD76\uDD78-\uDDB4\uDDB7\uDDBA\uDDBC-\uDDCC\uDDD0\uDDE0-\uDDFF\uDE70-\uDE7C\uDE80-\uDE89\uDE8F-\uDEC2\uDEC6\uDECE-\uDEDC\uDEDF-\uDEE9]|\uDD3C(?:\u200D[\u2640\u2642]\uFE0F?|\uD83C[\uDFFB-\uDFFF])?|\uDDCE(?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D(?:[\u2640\u2642]\uFE0F?(?:\u200D\u27A1\uFE0F?)?|\u27A1\uFE0F?))?|\uDDD1(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83E\uDDD1|\uDDD1\u200D\uD83E\uDDD2(?:\u200D\uD83E\uDDD2)?|\uDDD2(?:\u200D\uD83E\uDDD2)?))|\uD83C(?:\uDFFB(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFC-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF])))?|\uDFFC(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB\uDFFD-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF])))?|\uDFFD(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF])))?|\uDFFE(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB-\uDFFD\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF])))?|\uDFFF(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB-\uDFFE]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF])))?))?|\uDEF1(?:\uD83C(?:\uDFFB(?:\u200D\uD83E\uDEF2\uD83C[\uDFFC-\uDFFF])?|\uDFFC(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB\uDFFD-\uDFFF])?|\uDFFD(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])?|\uDFFE(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB-\uDFFD\uDFFF])?|\uDFFF(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB-\uDFFE])?))?)/g;
};
var segmenter = globalThis.Intl?.Segmenter ? new Intl.Segmenter : { segment: (str) => str.split("") };
var defaultIgnorableCodePointRegex = /^\p{Default_Ignorable_Code_Point}$/u;
function stringWidth$1(string, options = {}) {
  if (typeof string !== "string" || string.length === 0) {
    return 0;
  }
  const {
    ambiguousIsNarrow = true,
    countAnsiEscapeCodes = false
  } = options;
  if (!countAnsiEscapeCodes) {
    string = stripAnsi2(string);
  }
  if (string.length === 0) {
    return 0;
  }
  let width = 0;
  const eastAsianWidthOptions = { ambiguousAsWide: !ambiguousIsNarrow };
  for (const { segment: character } of segmenter.segment(string)) {
    const codePoint = character.codePointAt(0);
    if (codePoint <= 31 || codePoint >= 127 && codePoint <= 159) {
      continue;
    }
    if (codePoint >= 8203 && codePoint <= 8207 || codePoint === 65279) {
      continue;
    }
    if (codePoint >= 768 && codePoint <= 879 || codePoint >= 6832 && codePoint <= 6911 || codePoint >= 7616 && codePoint <= 7679 || codePoint >= 8400 && codePoint <= 8447 || codePoint >= 65056 && codePoint <= 65071) {
      continue;
    }
    if (codePoint >= 55296 && codePoint <= 57343) {
      continue;
    }
    if (codePoint >= 65024 && codePoint <= 65039) {
      continue;
    }
    if (defaultIgnorableCodePointRegex.test(character)) {
      continue;
    }
    if (emojiRegex().test(character)) {
      width += 2;
      continue;
    }
    width += eastAsianWidth(codePoint, eastAsianWidthOptions);
  }
  return width;
}
function isUnicodeSupported() {
  const { env: env2 } = g$1;
  const { TERM, TERM_PROGRAM } = env2;
  if (g$1.platform !== "win32") {
    return TERM !== "linux";
  }
  return Boolean(env2.WT_SESSION) || Boolean(env2.TERMINUS_SUBLIME) || env2.ConEmuTask === "{cmd::Cmder}" || TERM_PROGRAM === "Terminus-Sublime" || TERM_PROGRAM === "vscode" || TERM === "xterm-256color" || TERM === "alacritty" || TERM === "rxvt-unicode" || TERM === "rxvt-unicode-256color" || env2.TERMINAL_EMULATOR === "JetBrains-JediTerm";
}
var TYPE_COLOR_MAP = {
  info: "cyan",
  fail: "red",
  success: "green",
  ready: "green",
  start: "magenta"
};
var LEVEL_COLOR_MAP = {
  0: "red",
  1: "yellow"
};
var unicode = isUnicodeSupported();
var s = (c3, fallback) => unicode ? c3 : fallback;
var TYPE_ICONS = {
  error: s("\u2716", "\xD7"),
  fatal: s("\u2716", "\xD7"),
  ready: s("\u2714", "\u221A"),
  warn: s("\u26A0", "\u203C"),
  info: s("\u2139", "i"),
  success: s("\u2714", "\u221A"),
  debug: s("\u2699", "D"),
  trace: s("\u2192", "\u2192"),
  fail: s("\u2716", "\xD7"),
  start: s("\u25D0", "o"),
  log: ""
};
function stringWidth(str) {
  const hasICU = typeof Intl === "object";
  if (!hasICU || !Intl.Segmenter) {
    return stripAnsi(str).length;
  }
  return stringWidth$1(str);
}

class FancyReporter extends BasicReporter {
  formatStack(stack, message, opts) {
    const indent = "  ".repeat((opts?.errorLevel || 0) + 1);
    return `
${indent}` + parseStack(stack, message).map((line) => "  " + line.replace(/^at +/, (m2) => colors.gray(m2)).replace(/\((.+)\)/, (_3, m2) => `(${colors.cyan(m2)})`)).join(`
${indent}`);
  }
  formatType(logObj, isBadge, opts) {
    const typeColor = TYPE_COLOR_MAP[logObj.type] || LEVEL_COLOR_MAP[logObj.level] || "gray";
    if (isBadge) {
      return getBgColor(typeColor)(colors.black(` ${logObj.type.toUpperCase()} `));
    }
    const _type = typeof TYPE_ICONS[logObj.type] === "string" ? TYPE_ICONS[logObj.type] : logObj.icon || logObj.type;
    return _type ? getColor2(typeColor)(_type) : "";
  }
  formatLogObj(logObj, opts) {
    const [message, ...additional] = this.formatArgs(logObj.args, opts).split(`
`);
    if (logObj.type === "box") {
      return box(characterFormat(message + (additional.length > 0 ? `
` + additional.join(`
`) : "")), {
        title: logObj.title ? characterFormat(logObj.title) : undefined,
        style: logObj.style
      });
    }
    const date = this.formatDate(logObj.date, opts);
    const coloredDate = date && colors.gray(date);
    const isBadge = logObj.badge ?? logObj.level < 2;
    const type = this.formatType(logObj, isBadge, opts);
    const tag = logObj.tag ? colors.gray(logObj.tag) : "";
    let line;
    const left = this.filterAndJoin([type, characterFormat(message)]);
    const right = this.filterAndJoin(opts.columns ? [tag, coloredDate] : [tag]);
    const space = (opts.columns || 0) - stringWidth(left) - stringWidth(right) - 2;
    line = space > 0 && (opts.columns || 0) >= 80 ? left + " ".repeat(space) + right : (right ? `${colors.gray(`[${right}]`)} ` : "") + left;
    line += characterFormat(additional.length > 0 ? `
` + additional.join(`
`) : "");
    if (logObj.type === "trace") {
      const _err = new Error("Trace: " + logObj.message);
      line += this.formatStack(_err.stack || "", _err.message);
    }
    return isBadge ? `
` + line + `
` : line;
  }
}
function characterFormat(str) {
  return str.replace(/`([^`]+)`/gm, (_3, m2) => colors.cyan(m2)).replace(/\s+_([^_]+)_\s+/gm, (_3, m2) => ` ${colors.underline(m2)} `);
}
function getColor2(color = "white") {
  return colors[color] || colors.white;
}
function getBgColor(color = "bgWhite") {
  return colors[`bg${color[0].toUpperCase()}${color.slice(1)}`] || colors.bgWhite;
}
function createConsola2(options = {}) {
  let level = _getDefaultLogLevel();
  if (process.env.CONSOLA_LEVEL) {
    level = Number.parseInt(process.env.CONSOLA_LEVEL) ?? level;
  }
  const consola2 = createConsola({
    level,
    defaults: { level },
    stdout: process.stdout,
    stderr: process.stderr,
    prompt: (...args) => Promise.resolve().then(() => (init_prompt(), exports_prompt)).then((m2) => m2.prompt(...args)),
    reporters: options.reporters || [
      options.fancy ?? !(T2 || R2) ? new FancyReporter : new BasicReporter
    ],
    ...options
  });
  return consola2;
}
function _getDefaultLogLevel() {
  if (g2) {
    return LogLevels.debug;
  }
  if (R2) {
    return LogLevels.warn;
  }
  return LogLevels.info;
}
var consola = createConsola2();

// src/logger.ts
function getLogLevel() {
  const env2 = process.env["NODE_ENV"] ?? "development";
  const logLevelEnv = process.env["LOG_LEVEL"];
  if (logLevelEnv !== undefined) {
    const normalizedLevel = logLevelEnv.toLowerCase();
    const level = LogLevels[normalizedLevel];
    if (level !== undefined) {
      return level;
    }
  }
  switch (env2) {
    case "production":
      return LogLevels.info;
    case "test":
      return LogLevels.warn;
    default:
      return LogLevels.debug;
  }
}
function isProduction() {
  return process.env["NODE_ENV"] === "production";
}
var logger = createConsola2({
  level: getLogLevel(),
  ...isProduction() ? {} : { fancy: true }
});
function createTaggedLogger(tag) {
  return logger.withTag(tag);
}

// src/sdk/group/manager.ts
var import_slugify = __toESM(require_slugify(), 1);
var logger2 = createTaggedLogger("group-manager");

class GroupManager {
  container;
  repository;
  eventEmitter;
  constructor(container, repository, eventEmitter) {
    this.container = container;
    this.repository = repository;
    this.eventEmitter = eventEmitter;
  }
  async createGroup(options) {
    const now = this.container.clock.now();
    const timestamp = now.toISOString();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const timeStr = now.toISOString().slice(11, 19).replace(/:/g, "");
    const slug = this.generateSlug(options.name);
    const groupId = `${dateStr}-${timeStr}-${slug}`;
    const config = {
      ...DEFAULT_GROUP_CONFIG,
      ...options.config
    };
    const group = {
      id: groupId,
      name: options.name,
      slug,
      description: options.description,
      status: "created",
      sessions: [],
      config,
      createdAt: timestamp,
      updatedAt: timestamp,
      startedAt: undefined,
      completedAt: undefined
    };
    await this.repository.save(group);
    logger2.info(`Created group ${groupId}`, {
      name: group.name,
      slug: group.slug
    });
    this.eventEmitter.emit("group_created", {
      type: "group_created",
      timestamp,
      groupId,
      name: group.name,
      slug,
      totalSessions: 0
    });
    return group;
  }
  async getGroup(groupId) {
    return this.repository.findById(groupId);
  }
  async listGroups(filter) {
    return this.repository.list(filter);
  }
  async updateGroup(groupId, updates) {
    const existing = await this.repository.findById(groupId);
    if (existing === null) {
      throw new Error(`Group not found: ${groupId}`);
    }
    const now = this.container.clock.now();
    const timestamp = now.toISOString();
    const updated = {
      ...existing,
      ...updates,
      updatedAt: timestamp
    };
    await this.repository.save(updated);
    logger2.info(`Updated group ${groupId}`, {
      status: updated.status
    });
    if (updates.status !== undefined && updates.status !== existing.status) {
      this.emitStatusChangeEvent(updated, timestamp);
    }
    return updated;
  }
  async archiveGroup(groupId) {
    const existing = await this.repository.findById(groupId);
    if (existing === null) {
      throw new Error(`Group not found: ${groupId}`);
    }
    await this.updateGroup(groupId, { status: "archived" });
    logger2.info(`Archived group ${groupId}`);
  }
  async deleteGroup(groupId) {
    const deleted = await this.repository.delete(groupId);
    if (!deleted) {
      throw new Error(`Group not found: ${groupId}`);
    }
    const timestamp = this.container.clock.now().toISOString();
    logger2.info(`Deleted group ${groupId}`);
    this.eventEmitter.emit("group_created", {
      type: "group_created",
      timestamp,
      groupId,
      name: "",
      slug: "",
      totalSessions: 0
    });
  }
  async addSession(groupId, session) {
    const existing = await this.repository.findById(groupId);
    if (existing === null) {
      throw new Error(`Group not found: ${groupId}`);
    }
    const updated = {
      ...existing,
      sessions: [...existing.sessions, session],
      updatedAt: this.container.clock.now().toISOString()
    };
    await this.repository.save(updated);
    logger2.info(`Added session ${session.id} to group ${groupId}`, {
      projectPath: session.projectPath
    });
    return updated;
  }
  async removeSession(groupId, sessionId) {
    const existing = await this.repository.findById(groupId);
    if (existing === null) {
      throw new Error(`Group not found: ${groupId}`);
    }
    const sessionIndex = existing.sessions.findIndex((s2) => s2.id === sessionId);
    if (sessionIndex === -1) {
      throw new Error(`Session not found in group: ${sessionId}`);
    }
    const updated = {
      ...existing,
      sessions: existing.sessions.filter((s2) => s2.id !== sessionId),
      updatedAt: this.container.clock.now().toISOString()
    };
    await this.repository.save(updated);
    logger2.info(`Removed session ${sessionId} from group ${groupId}`);
    return updated;
  }
  async updateSession(groupId, sessionId, updates) {
    const updated = await this.repository.updateSession(groupId, sessionId, updates);
    if (!updated) {
      throw new Error(`Group or session not found: ${groupId}/${sessionId}`);
    }
    const group = await this.repository.findById(groupId);
    if (group === null) {
      throw new Error(`Group not found after update: ${groupId}`);
    }
    const session = group.sessions.find((s2) => s2.id === sessionId);
    if (session === undefined) {
      throw new Error(`Session not found after update: ${sessionId}`);
    }
    logger2.info(`Updated session ${sessionId} in group ${groupId}`, {
      status: session.status
    });
    if (updates.status !== undefined) {
      this.emitSessionStatusEvent(groupId, session);
    }
    return session;
  }
  emitStatusChangeEvent(group, timestamp) {
    const status = group.status;
    if (status === "created") {
      return;
    }
    switch (status) {
      case "running":
        break;
      case "completed": {
        const completedSessions = group.sessions.filter((s2) => s2.status === "completed").length;
        const failedSessions = group.sessions.filter((s2) => s2.status === "failed").length;
        const totalCost = group.sessions.reduce((sum, s2) => sum + (s2.cost ?? 0), 0);
        const elapsedMs = group.startedAt !== undefined && group.completedAt !== undefined ? new Date(group.completedAt).getTime() - new Date(group.startedAt).getTime() : 0;
        this.eventEmitter.emit("group_completed", {
          type: "group_completed",
          timestamp,
          groupId: group.id,
          completedSessions,
          failedSessions,
          totalCostUsd: totalCost,
          elapsedMs
        });
        break;
      }
      case "paused":
        break;
      case "failed": {
        const failedSessions = group.sessions.filter((s2) => s2.status === "failed").length;
        this.eventEmitter.emit("group_failed", {
          type: "group_failed",
          timestamp,
          groupId: group.id,
          failedSessions,
          reason: "Error threshold exceeded"
        });
        break;
      }
      case "archived":
        break;
      case "deleted":
        break;
    }
  }
  emitSessionStatusEvent(groupId, session) {
    const timestamp = this.container.clock.now().toISOString();
    switch (session.status) {
      case "active":
        this.eventEmitter.emit("group_session_started", {
          type: "group_session_started",
          timestamp,
          groupId,
          sessionId: session.id,
          projectPath: session.projectPath,
          prompt: session.prompt
        });
        break;
      case "completed":
      case "failed": {
        const durationMs = session.startedAt !== undefined && session.completedAt !== undefined ? new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime() : 0;
        if (session.status === "completed") {
          this.eventEmitter.emit("group_session_completed", {
            type: "group_session_completed",
            timestamp,
            groupId,
            sessionId: session.id,
            status: "completed",
            costUsd: session.cost,
            durationMs
          });
        } else {
          this.eventEmitter.emit("group_session_failed", {
            type: "group_session_failed",
            timestamp,
            groupId,
            sessionId: session.id,
            error: "Session failed",
            costUsd: session.cost
          });
        }
        break;
      }
      default:
        break;
    }
  }
  generateSlug(name) {
    const cleaned = name.replace(/[^a-z0-9\s]+/gi, "-");
    return import_slugify.default(cleaned, { lower: true, strict: true }).slice(0, 20).replace(/-+$/g, "");
  }
}
// node_modules/neverthrow/dist/index.es.js
var defaultErrorConfig = {
  withStackTrace: false
};
var createNeverThrowError = (message, result, config = defaultErrorConfig) => {
  const data = result.isOk() ? { type: "Ok", value: result.value } : { type: "Err", value: result.error };
  const maybeStack = config.withStackTrace ? new Error().stack : undefined;
  return {
    data,
    message,
    stack: maybeStack
  };
};
function __awaiter(thisArg, _arguments, P3, generator) {
  function adopt(value) {
    return value instanceof P3 ? value : new P3(function(resolve) {
      resolve(value);
    });
  }
  return new (P3 || (P3 = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e2) {
        reject(e2);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e2) {
        reject(e2);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
}
function __values(o3) {
  var s2 = typeof Symbol === "function" && Symbol.iterator, m2 = s2 && o3[s2], i2 = 0;
  if (m2)
    return m2.call(o3);
  if (o3 && typeof o3.length === "number")
    return {
      next: function() {
        if (o3 && i2 >= o3.length)
          o3 = undefined;
        return { value: o3 && o3[i2++], done: !o3 };
      }
    };
  throw new TypeError(s2 ? "Object is not iterable." : "Symbol.iterator is not defined.");
}
function __await(v2) {
  return this instanceof __await ? (this.v = v2, this) : new __await(v2);
}
function __asyncGenerator(thisArg, _arguments, generator) {
  if (!Symbol.asyncIterator)
    throw new TypeError("Symbol.asyncIterator is not defined.");
  var g3 = generator.apply(thisArg, _arguments || []), i2, q2 = [];
  return i2 = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i2[Symbol.asyncIterator] = function() {
    return this;
  }, i2;
  function awaitReturn(f3) {
    return function(v2) {
      return Promise.resolve(v2).then(f3, reject);
    };
  }
  function verb(n2, f3) {
    if (g3[n2]) {
      i2[n2] = function(v2) {
        return new Promise(function(a2, b2) {
          q2.push([n2, v2, a2, b2]) > 1 || resume(n2, v2);
        });
      };
      if (f3)
        i2[n2] = f3(i2[n2]);
    }
  }
  function resume(n2, v2) {
    try {
      step(g3[n2](v2));
    } catch (e2) {
      settle(q2[0][3], e2);
    }
  }
  function step(r3) {
    r3.value instanceof __await ? Promise.resolve(r3.value.v).then(fulfill, reject) : settle(q2[0][2], r3);
  }
  function fulfill(value) {
    resume("next", value);
  }
  function reject(value) {
    resume("throw", value);
  }
  function settle(f3, v2) {
    if (f3(v2), q2.shift(), q2.length)
      resume(q2[0][0], q2[0][1]);
  }
}
function __asyncDelegator(o3) {
  var i2, p;
  return i2 = {}, verb("next"), verb("throw", function(e2) {
    throw e2;
  }), verb("return"), i2[Symbol.iterator] = function() {
    return this;
  }, i2;
  function verb(n2, f3) {
    i2[n2] = o3[n2] ? function(v2) {
      return (p = !p) ? { value: __await(o3[n2](v2)), done: false } : f3 ? f3(v2) : v2;
    } : f3;
  }
}
function __asyncValues(o3) {
  if (!Symbol.asyncIterator)
    throw new TypeError("Symbol.asyncIterator is not defined.");
  var m2 = o3[Symbol.asyncIterator], i2;
  return m2 ? m2.call(o3) : (o3 = typeof __values === "function" ? __values(o3) : o3[Symbol.iterator](), i2 = {}, verb("next"), verb("throw"), verb("return"), i2[Symbol.asyncIterator] = function() {
    return this;
  }, i2);
  function verb(n2) {
    i2[n2] = o3[n2] && function(v2) {
      return new Promise(function(resolve, reject) {
        v2 = o3[n2](v2), settle(resolve, reject, v2.done, v2.value);
      });
    };
  }
  function settle(resolve, reject, d2, v2) {
    Promise.resolve(v2).then(function(v3) {
      resolve({ value: v3, done: d2 });
    }, reject);
  }
}
class ResultAsync {
  constructor(res) {
    this._promise = res;
  }
  static fromSafePromise(promise) {
    const newPromise = promise.then((value) => new Ok(value));
    return new ResultAsync(newPromise);
  }
  static fromPromise(promise, errorFn) {
    const newPromise = promise.then((value) => new Ok(value)).catch((e2) => new Err(errorFn(e2)));
    return new ResultAsync(newPromise);
  }
  static fromThrowable(fn, errorFn) {
    return (...args) => {
      return new ResultAsync((() => __awaiter(this, undefined, undefined, function* () {
        try {
          return new Ok(yield fn(...args));
        } catch (error) {
          return new Err(errorFn ? errorFn(error) : error);
        }
      }))());
    };
  }
  static combine(asyncResultList) {
    return combineResultAsyncList(asyncResultList);
  }
  static combineWithAllErrors(asyncResultList) {
    return combineResultAsyncListWithAllErrors(asyncResultList);
  }
  map(f3) {
    return new ResultAsync(this._promise.then((res) => __awaiter(this, undefined, undefined, function* () {
      if (res.isErr()) {
        return new Err(res.error);
      }
      return new Ok(yield f3(res.value));
    })));
  }
  andThrough(f3) {
    return new ResultAsync(this._promise.then((res) => __awaiter(this, undefined, undefined, function* () {
      if (res.isErr()) {
        return new Err(res.error);
      }
      const newRes = yield f3(res.value);
      if (newRes.isErr()) {
        return new Err(newRes.error);
      }
      return new Ok(res.value);
    })));
  }
  andTee(f3) {
    return new ResultAsync(this._promise.then((res) => __awaiter(this, undefined, undefined, function* () {
      if (res.isErr()) {
        return new Err(res.error);
      }
      try {
        yield f3(res.value);
      } catch (e2) {}
      return new Ok(res.value);
    })));
  }
  orTee(f3) {
    return new ResultAsync(this._promise.then((res) => __awaiter(this, undefined, undefined, function* () {
      if (res.isOk()) {
        return new Ok(res.value);
      }
      try {
        yield f3(res.error);
      } catch (e2) {}
      return new Err(res.error);
    })));
  }
  mapErr(f3) {
    return new ResultAsync(this._promise.then((res) => __awaiter(this, undefined, undefined, function* () {
      if (res.isOk()) {
        return new Ok(res.value);
      }
      return new Err(yield f3(res.error));
    })));
  }
  andThen(f3) {
    return new ResultAsync(this._promise.then((res) => {
      if (res.isErr()) {
        return new Err(res.error);
      }
      const newValue = f3(res.value);
      return newValue instanceof ResultAsync ? newValue._promise : newValue;
    }));
  }
  orElse(f3) {
    return new ResultAsync(this._promise.then((res) => __awaiter(this, undefined, undefined, function* () {
      if (res.isErr()) {
        return f3(res.error);
      }
      return new Ok(res.value);
    })));
  }
  match(ok, _err) {
    return this._promise.then((res) => res.match(ok, _err));
  }
  unwrapOr(t2) {
    return this._promise.then((res) => res.unwrapOr(t2));
  }
  safeUnwrap() {
    return __asyncGenerator(this, arguments, function* safeUnwrap_1() {
      return yield __await(yield __await(yield* __asyncDelegator(__asyncValues(yield __await(this._promise.then((res) => res.safeUnwrap()))))));
    });
  }
  then(successCallback, failureCallback) {
    return this._promise.then(successCallback, failureCallback);
  }
  [Symbol.asyncIterator]() {
    return __asyncGenerator(this, arguments, function* _a() {
      const result = yield __await(this._promise);
      if (result.isErr()) {
        yield yield __await(errAsync(result.error));
      }
      return yield __await(result.value);
    });
  }
}
function errAsync(err) {
  return new ResultAsync(Promise.resolve(new Err(err)));
}
var fromPromise = ResultAsync.fromPromise;
var fromSafePromise = ResultAsync.fromSafePromise;
var fromAsyncThrowable = ResultAsync.fromThrowable;
var combineResultList = (resultList) => {
  let acc = ok([]);
  for (const result of resultList) {
    if (result.isErr()) {
      acc = err(result.error);
      break;
    } else {
      acc.map((list) => list.push(result.value));
    }
  }
  return acc;
};
var combineResultAsyncList = (asyncResultList) => ResultAsync.fromSafePromise(Promise.all(asyncResultList)).andThen(combineResultList);
var combineResultListWithAllErrors = (resultList) => {
  let acc = ok([]);
  for (const result of resultList) {
    if (result.isErr() && acc.isErr()) {
      acc.error.push(result.error);
    } else if (result.isErr() && acc.isOk()) {
      acc = err([result.error]);
    } else if (result.isOk() && acc.isOk()) {
      acc.value.push(result.value);
    }
  }
  return acc;
};
var combineResultAsyncListWithAllErrors = (asyncResultList) => ResultAsync.fromSafePromise(Promise.all(asyncResultList)).andThen(combineResultListWithAllErrors);
var Result;
(function(Result2) {
  function fromThrowable(fn, errorFn) {
    return (...args) => {
      try {
        const result = fn(...args);
        return ok(result);
      } catch (e2) {
        return err(errorFn ? errorFn(e2) : e2);
      }
    };
  }
  Result2.fromThrowable = fromThrowable;
  function combine(resultList) {
    return combineResultList(resultList);
  }
  Result2.combine = combine;
  function combineWithAllErrors(resultList) {
    return combineResultListWithAllErrors(resultList);
  }
  Result2.combineWithAllErrors = combineWithAllErrors;
})(Result || (Result = {}));
function ok(value) {
  return new Ok(value);
}
function err(err2) {
  return new Err(err2);
}
class Ok {
  constructor(value) {
    this.value = value;
  }
  isOk() {
    return true;
  }
  isErr() {
    return !this.isOk();
  }
  map(f3) {
    return ok(f3(this.value));
  }
  mapErr(_f) {
    return ok(this.value);
  }
  andThen(f3) {
    return f3(this.value);
  }
  andThrough(f3) {
    return f3(this.value).map((_value) => this.value);
  }
  andTee(f3) {
    try {
      f3(this.value);
    } catch (e2) {}
    return ok(this.value);
  }
  orTee(_f) {
    return ok(this.value);
  }
  orElse(_f) {
    return ok(this.value);
  }
  asyncAndThen(f3) {
    return f3(this.value);
  }
  asyncAndThrough(f3) {
    return f3(this.value).map(() => this.value);
  }
  asyncMap(f3) {
    return ResultAsync.fromSafePromise(f3(this.value));
  }
  unwrapOr(_v) {
    return this.value;
  }
  match(ok2, _err) {
    return ok2(this.value);
  }
  safeUnwrap() {
    const value = this.value;
    return function* () {
      return value;
    }();
  }
  _unsafeUnwrap(_3) {
    return this.value;
  }
  _unsafeUnwrapErr(config) {
    throw createNeverThrowError("Called `_unsafeUnwrapErr` on an Ok", this, config);
  }
  *[Symbol.iterator]() {
    return this.value;
  }
}

class Err {
  constructor(error) {
    this.error = error;
  }
  isOk() {
    return false;
  }
  isErr() {
    return !this.isOk();
  }
  map(_f) {
    return err(this.error);
  }
  mapErr(f3) {
    return err(f3(this.error));
  }
  andThrough(_f) {
    return err(this.error);
  }
  andTee(_f) {
    return err(this.error);
  }
  orTee(f3) {
    try {
      f3(this.error);
    } catch (e2) {}
    return err(this.error);
  }
  andThen(_f) {
    return err(this.error);
  }
  orElse(f3) {
    return f3(this.error);
  }
  asyncAndThen(_f) {
    return errAsync(this.error);
  }
  asyncAndThrough(_f) {
    return errAsync(this.error);
  }
  asyncMap(_f) {
    return errAsync(this.error);
  }
  unwrapOr(v2) {
    return v2;
  }
  match(_ok, err2) {
    return err2(this.error);
  }
  safeUnwrap() {
    const error = this.error;
    return function* () {
      yield err(error);
      throw new Error("Do not use this generator out of `safeTry`");
    }();
  }
  _unsafeUnwrap(config) {
    throw createNeverThrowError("Called `_unsafeUnwrap` on an Err", this, config);
  }
  _unsafeUnwrapErr(_3) {
    return this.error;
  }
  *[Symbol.iterator]() {
    const self = this;
    yield self;
    return self;
  }
}
var fromThrowable = Result.fromThrowable;

// node_modules/mustache/mustache.mjs
/*!
 * mustache.js - Logic-less {{mustache}} templates with JavaScript
 * http://github.com/janl/mustache.js
 */
var objectToString = Object.prototype.toString;
var isArray = Array.isArray || function isArrayPolyfill(object) {
  return objectToString.call(object) === "[object Array]";
};
function isFunction(object) {
  return typeof object === "function";
}
function typeStr(obj) {
  return isArray(obj) ? "array" : typeof obj;
}
function escapeRegExp(string) {
  return string.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
}
function hasProperty(obj, propName) {
  return obj != null && typeof obj === "object" && propName in obj;
}
function primitiveHasOwnProperty(primitive, propName) {
  return primitive != null && typeof primitive !== "object" && primitive.hasOwnProperty && primitive.hasOwnProperty(propName);
}
var regExpTest = RegExp.prototype.test;
function testRegExp(re, string) {
  return regExpTest.call(re, string);
}
var nonSpaceRe = /\S/;
function isWhitespace(string) {
  return !testRegExp(nonSpaceRe, string);
}
var entityMap = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "/": "&#x2F;",
  "`": "&#x60;",
  "=": "&#x3D;"
};
function escapeHtml(string) {
  return String(string).replace(/[&<>"'`=\/]/g, function fromEntityMap(s2) {
    return entityMap[s2];
  });
}
var whiteRe = /\s*/;
var spaceRe = /\s+/;
var equalsRe = /\s*=/;
var curlyRe = /\s*\}/;
var tagRe = /#|\^|\/|>|\{|&|=|!/;
function parseTemplate(template, tags) {
  if (!template)
    return [];
  var lineHasNonSpace = false;
  var sections = [];
  var tokens = [];
  var spaces = [];
  var hasTag = false;
  var nonSpace = false;
  var indentation = "";
  var tagIndex = 0;
  function stripSpace() {
    if (hasTag && !nonSpace) {
      while (spaces.length)
        delete tokens[spaces.pop()];
    } else {
      spaces = [];
    }
    hasTag = false;
    nonSpace = false;
  }
  var openingTagRe, closingTagRe, closingCurlyRe;
  function compileTags(tagsToCompile) {
    if (typeof tagsToCompile === "string")
      tagsToCompile = tagsToCompile.split(spaceRe, 2);
    if (!isArray(tagsToCompile) || tagsToCompile.length !== 2)
      throw new Error("Invalid tags: " + tagsToCompile);
    openingTagRe = new RegExp(escapeRegExp(tagsToCompile[0]) + "\\s*");
    closingTagRe = new RegExp("\\s*" + escapeRegExp(tagsToCompile[1]));
    closingCurlyRe = new RegExp("\\s*" + escapeRegExp("}" + tagsToCompile[1]));
  }
  compileTags(tags || mustache.tags);
  var scanner = new Scanner(template);
  var start, type, value, chr, token, openSection;
  while (!scanner.eos()) {
    start = scanner.pos;
    value = scanner.scanUntil(openingTagRe);
    if (value) {
      for (var i2 = 0, valueLength = value.length;i2 < valueLength; ++i2) {
        chr = value.charAt(i2);
        if (isWhitespace(chr)) {
          spaces.push(tokens.length);
          indentation += chr;
        } else {
          nonSpace = true;
          lineHasNonSpace = true;
          indentation += " ";
        }
        tokens.push(["text", chr, start, start + 1]);
        start += 1;
        if (chr === `
`) {
          stripSpace();
          indentation = "";
          tagIndex = 0;
          lineHasNonSpace = false;
        }
      }
    }
    if (!scanner.scan(openingTagRe))
      break;
    hasTag = true;
    type = scanner.scan(tagRe) || "name";
    scanner.scan(whiteRe);
    if (type === "=") {
      value = scanner.scanUntil(equalsRe);
      scanner.scan(equalsRe);
      scanner.scanUntil(closingTagRe);
    } else if (type === "{") {
      value = scanner.scanUntil(closingCurlyRe);
      scanner.scan(curlyRe);
      scanner.scanUntil(closingTagRe);
      type = "&";
    } else {
      value = scanner.scanUntil(closingTagRe);
    }
    if (!scanner.scan(closingTagRe))
      throw new Error("Unclosed tag at " + scanner.pos);
    if (type == ">") {
      token = [type, value, start, scanner.pos, indentation, tagIndex, lineHasNonSpace];
    } else {
      token = [type, value, start, scanner.pos];
    }
    tagIndex++;
    tokens.push(token);
    if (type === "#" || type === "^") {
      sections.push(token);
    } else if (type === "/") {
      openSection = sections.pop();
      if (!openSection)
        throw new Error('Unopened section "' + value + '" at ' + start);
      if (openSection[1] !== value)
        throw new Error('Unclosed section "' + openSection[1] + '" at ' + start);
    } else if (type === "name" || type === "{" || type === "&") {
      nonSpace = true;
    } else if (type === "=") {
      compileTags(value);
    }
  }
  stripSpace();
  openSection = sections.pop();
  if (openSection)
    throw new Error('Unclosed section "' + openSection[1] + '" at ' + scanner.pos);
  return nestTokens(squashTokens(tokens));
}
function squashTokens(tokens) {
  var squashedTokens = [];
  var token, lastToken;
  for (var i2 = 0, numTokens = tokens.length;i2 < numTokens; ++i2) {
    token = tokens[i2];
    if (token) {
      if (token[0] === "text" && lastToken && lastToken[0] === "text") {
        lastToken[1] += token[1];
        lastToken[3] = token[3];
      } else {
        squashedTokens.push(token);
        lastToken = token;
      }
    }
  }
  return squashedTokens;
}
function nestTokens(tokens) {
  var nestedTokens = [];
  var collector = nestedTokens;
  var sections = [];
  var token, section;
  for (var i2 = 0, numTokens = tokens.length;i2 < numTokens; ++i2) {
    token = tokens[i2];
    switch (token[0]) {
      case "#":
      case "^":
        collector.push(token);
        sections.push(token);
        collector = token[4] = [];
        break;
      case "/":
        section = sections.pop();
        section[5] = token[2];
        collector = sections.length > 0 ? sections[sections.length - 1][4] : nestedTokens;
        break;
      default:
        collector.push(token);
    }
  }
  return nestedTokens;
}
function Scanner(string) {
  this.string = string;
  this.tail = string;
  this.pos = 0;
}
Scanner.prototype.eos = function eos() {
  return this.tail === "";
};
Scanner.prototype.scan = function scan(re) {
  var match = this.tail.match(re);
  if (!match || match.index !== 0)
    return "";
  var string = match[0];
  this.tail = this.tail.substring(string.length);
  this.pos += string.length;
  return string;
};
Scanner.prototype.scanUntil = function scanUntil(re) {
  var index = this.tail.search(re), match;
  switch (index) {
    case -1:
      match = this.tail;
      this.tail = "";
      break;
    case 0:
      match = "";
      break;
    default:
      match = this.tail.substring(0, index);
      this.tail = this.tail.substring(index);
  }
  this.pos += match.length;
  return match;
};
function Context(view, parentContext) {
  this.view = view;
  this.cache = { ".": this.view };
  this.parent = parentContext;
}
Context.prototype.push = function push(view) {
  return new Context(view, this);
};
Context.prototype.lookup = function lookup(name) {
  var cache = this.cache;
  var value;
  if (cache.hasOwnProperty(name)) {
    value = cache[name];
  } else {
    var context = this, intermediateValue, names, index, lookupHit = false;
    while (context) {
      if (name.indexOf(".") > 0) {
        intermediateValue = context.view;
        names = name.split(".");
        index = 0;
        while (intermediateValue != null && index < names.length) {
          if (index === names.length - 1)
            lookupHit = hasProperty(intermediateValue, names[index]) || primitiveHasOwnProperty(intermediateValue, names[index]);
          intermediateValue = intermediateValue[names[index++]];
        }
      } else {
        intermediateValue = context.view[name];
        lookupHit = hasProperty(context.view, name);
      }
      if (lookupHit) {
        value = intermediateValue;
        break;
      }
      context = context.parent;
    }
    cache[name] = value;
  }
  if (isFunction(value))
    value = value.call(this.view);
  return value;
};
function Writer() {
  this.templateCache = {
    _cache: {},
    set: function set(key, value) {
      this._cache[key] = value;
    },
    get: function get(key) {
      return this._cache[key];
    },
    clear: function clear() {
      this._cache = {};
    }
  };
}
Writer.prototype.clearCache = function clearCache() {
  if (typeof this.templateCache !== "undefined") {
    this.templateCache.clear();
  }
};
Writer.prototype.parse = function parse(template, tags) {
  var cache = this.templateCache;
  var cacheKey = template + ":" + (tags || mustache.tags).join(":");
  var isCacheEnabled = typeof cache !== "undefined";
  var tokens = isCacheEnabled ? cache.get(cacheKey) : undefined;
  if (tokens == undefined) {
    tokens = parseTemplate(template, tags);
    isCacheEnabled && cache.set(cacheKey, tokens);
  }
  return tokens;
};
Writer.prototype.render = function render(template, view, partials, config) {
  var tags = this.getConfigTags(config);
  var tokens = this.parse(template, tags);
  var context = view instanceof Context ? view : new Context(view, undefined);
  return this.renderTokens(tokens, context, partials, template, config);
};
Writer.prototype.renderTokens = function renderTokens(tokens, context, partials, originalTemplate, config) {
  var buffer = "";
  var token, symbol, value;
  for (var i2 = 0, numTokens = tokens.length;i2 < numTokens; ++i2) {
    value = undefined;
    token = tokens[i2];
    symbol = token[0];
    if (symbol === "#")
      value = this.renderSection(token, context, partials, originalTemplate, config);
    else if (symbol === "^")
      value = this.renderInverted(token, context, partials, originalTemplate, config);
    else if (symbol === ">")
      value = this.renderPartial(token, context, partials, config);
    else if (symbol === "&")
      value = this.unescapedValue(token, context);
    else if (symbol === "name")
      value = this.escapedValue(token, context, config);
    else if (symbol === "text")
      value = this.rawValue(token);
    if (value !== undefined)
      buffer += value;
  }
  return buffer;
};
Writer.prototype.renderSection = function renderSection(token, context, partials, originalTemplate, config) {
  var self = this;
  var buffer = "";
  var value = context.lookup(token[1]);
  function subRender(template) {
    return self.render(template, context, partials, config);
  }
  if (!value)
    return;
  if (isArray(value)) {
    for (var j = 0, valueLength = value.length;j < valueLength; ++j) {
      buffer += this.renderTokens(token[4], context.push(value[j]), partials, originalTemplate, config);
    }
  } else if (typeof value === "object" || typeof value === "string" || typeof value === "number") {
    buffer += this.renderTokens(token[4], context.push(value), partials, originalTemplate, config);
  } else if (isFunction(value)) {
    if (typeof originalTemplate !== "string")
      throw new Error("Cannot use higher-order sections without the original template");
    value = value.call(context.view, originalTemplate.slice(token[3], token[5]), subRender);
    if (value != null)
      buffer += value;
  } else {
    buffer += this.renderTokens(token[4], context, partials, originalTemplate, config);
  }
  return buffer;
};
Writer.prototype.renderInverted = function renderInverted(token, context, partials, originalTemplate, config) {
  var value = context.lookup(token[1]);
  if (!value || isArray(value) && value.length === 0)
    return this.renderTokens(token[4], context, partials, originalTemplate, config);
};
Writer.prototype.indentPartial = function indentPartial(partial, indentation, lineHasNonSpace) {
  var filteredIndentation = indentation.replace(/[^ \t]/g, "");
  var partialByNl = partial.split(`
`);
  for (var i2 = 0;i2 < partialByNl.length; i2++) {
    if (partialByNl[i2].length && (i2 > 0 || !lineHasNonSpace)) {
      partialByNl[i2] = filteredIndentation + partialByNl[i2];
    }
  }
  return partialByNl.join(`
`);
};
Writer.prototype.renderPartial = function renderPartial(token, context, partials, config) {
  if (!partials)
    return;
  var tags = this.getConfigTags(config);
  var value = isFunction(partials) ? partials(token[1]) : partials[token[1]];
  if (value != null) {
    var lineHasNonSpace = token[6];
    var tagIndex = token[5];
    var indentation = token[4];
    var indentedValue = value;
    if (tagIndex == 0 && indentation) {
      indentedValue = this.indentPartial(value, indentation, lineHasNonSpace);
    }
    var tokens = this.parse(indentedValue, tags);
    return this.renderTokens(tokens, context, partials, indentedValue, config);
  }
};
Writer.prototype.unescapedValue = function unescapedValue(token, context) {
  var value = context.lookup(token[1]);
  if (value != null)
    return value;
};
Writer.prototype.escapedValue = function escapedValue(token, context, config) {
  var escape = this.getConfigEscape(config) || mustache.escape;
  var value = context.lookup(token[1]);
  if (value != null)
    return typeof value === "number" && escape === mustache.escape ? String(value) : escape(value);
};
Writer.prototype.rawValue = function rawValue(token) {
  return token[1];
};
Writer.prototype.getConfigTags = function getConfigTags(config) {
  if (isArray(config)) {
    return config;
  } else if (config && typeof config === "object") {
    return config.tags;
  } else {
    return;
  }
};
Writer.prototype.getConfigEscape = function getConfigEscape(config) {
  if (config && typeof config === "object" && !isArray(config)) {
    return config.escape;
  } else {
    return;
  }
};
var mustache = {
  name: "mustache.js",
  version: "4.2.0",
  tags: ["{{", "}}"],
  clearCache: undefined,
  escape: undefined,
  parse: undefined,
  render: undefined,
  Scanner: undefined,
  Context: undefined,
  Writer: undefined,
  set templateCache(cache) {
    defaultWriter.templateCache = cache;
  },
  get templateCache() {
    return defaultWriter.templateCache;
  }
};
var defaultWriter = new Writer;
mustache.clearCache = function clearCache2() {
  return defaultWriter.clearCache();
};
mustache.parse = function parse2(template, tags) {
  return defaultWriter.parse(template, tags);
};
mustache.render = function render2(template, view, partials, config) {
  if (typeof template !== "string") {
    throw new TypeError('Invalid template! Template should be a "string" ' + 'but "' + typeStr(template) + '" was given as the first ' + "argument for mustache#render(template, view, partials)");
  }
  return defaultWriter.render(template, view, partials, config);
};
mustache.escape = escapeHtml;
mustache.Scanner = Scanner;
mustache.Context = Context;
mustache.Writer = Writer;
var mustache_default = mustache;

// src/sdk/group/config-generator.ts
var logger3 = createTaggedLogger("config-generator");

class ConfigGenerator {
  container;
  constructor(container) {
    this.container = container;
  }
  async generateSessionConfig(session, group) {
    const sessionConfig = session.config ?? group.config.sessionDefaults;
    const configDir = this.getSessionConfigDir(group.id, session.id);
    const mkdirResult = await this.ensureConfigDir(configDir);
    if (mkdirResult.isErr()) {
      return err(mkdirResult.error);
    }
    let claudeMdPath;
    let settingsPath;
    if (sessionConfig?.generateClaudeMd) {
      const templatePath = sessionConfig.claudeMdTemplate ?? session.template;
      if (templatePath !== undefined) {
        const claudeMdResult = await this.generateClaudeMdFile(configDir, templatePath, session, group);
        if (claudeMdResult.isErr()) {
          return err(claudeMdResult.error);
        }
        claudeMdPath = claudeMdResult.value;
      }
    }
    if (sessionConfig?.generateSettings && sessionConfig.settingsOverride !== undefined) {
      const settingsResult = await this.generateSettingsFile(configDir, sessionConfig.settingsOverride);
      if (settingsResult.isErr()) {
        return err(settingsResult.error);
      }
      settingsPath = settingsResult.value;
    }
    const result = {
      configDir,
      claudeMdPath,
      settingsPath
    };
    logger3.debug("Generated session config", {
      sessionId: session.id,
      configDir,
      claudeMd: result.claudeMdPath !== undefined,
      settings: result.settingsPath !== undefined
    });
    return ok(result);
  }
  generateClaudeMd(template, variables) {
    const originalEscape = mustache_default.escape;
    mustache_default.escape = (text) => text;
    try {
      const parsed = mustache_default.parse(template);
      const allVariableNames = new Set;
      const extractVariables = (tokens) => {
        for (const token of tokens) {
          if (Array.isArray(token)) {
            const [type, name, _start, _end, children] = token;
            if (type === "name" || type === "&") {
              allVariableNames.add(name);
            }
            if (children !== undefined) {
              extractVariables(children);
            }
          }
        }
      };
      extractVariables(parsed);
      const extendedVariables = { ...variables };
      for (const varName of allVariableNames) {
        if (!(varName in variables)) {
          extendedVariables[varName] = `{{${varName}}}`;
        }
      }
      return mustache_default.render(template, extendedVariables);
    } finally {
      mustache_default.escape = originalEscape;
    }
  }
  generateSettings(overrides) {
    const baseSettings = {};
    return {
      ...baseSettings,
      ...overrides
    };
  }
  async resolveTemplate(templatePath) {
    if (templatePath.startsWith("/") || templatePath.startsWith("./")) {
      try {
        const content = await this.container.fileSystem.readFile(templatePath);
        return ok(content);
      } catch (cause) {
        logger3.error("Failed to read template file", {
          path: templatePath,
          error: cause
        });
        return err({ type: "template_read_failed", path: templatePath, cause });
      }
    }
    const templateDir = this.getTemplateDir();
    const fullPath = `${templateDir}/${templatePath}`;
    const exists = await this.container.fileSystem.exists(fullPath);
    if (!exists) {
      logger3.error("Template not found", { path: fullPath });
      return err({ type: "template_not_found", path: fullPath });
    }
    try {
      const content = await this.container.fileSystem.readFile(fullPath);
      return ok(content);
    } catch (cause) {
      logger3.error("Failed to read template file", {
        path: fullPath,
        error: cause
      });
      return err({ type: "template_read_failed", path: fullPath, cause });
    }
  }
  async generateClaudeMdFile(configDir, templatePath, session, group) {
    const templateResult = await this.resolveTemplate(templatePath);
    if (templateResult.isErr()) {
      return err(templateResult.error);
    }
    const variables = {
      session_id: session.id,
      group_id: group.id,
      group_name: group.name,
      project_path: session.projectPath,
      prompt: session.prompt,
      model: group.config.model
    };
    const content = this.generateClaudeMd(templateResult.value, variables);
    const claudeMdPath = `${configDir}/CLAUDE.md`;
    try {
      await this.container.fileSystem.writeFile(claudeMdPath, content);
      logger3.debug("Generated CLAUDE.md", { path: claudeMdPath });
      return ok(claudeMdPath);
    } catch (cause) {
      logger3.error("Failed to write CLAUDE.md", {
        path: claudeMdPath,
        error: cause
      });
      return err({ type: "config_write_failed", path: claudeMdPath, cause });
    }
  }
  async generateSettingsFile(configDir, overrides) {
    const settings = this.generateSettings(overrides);
    const settingsPath = `${configDir}/settings.json`;
    try {
      const content = JSON.stringify(settings, null, 2);
      await this.container.fileSystem.writeFile(settingsPath, content);
      logger3.debug("Generated settings.json", { path: settingsPath });
      return ok(settingsPath);
    } catch (cause) {
      logger3.error("Failed to write settings.json", {
        path: settingsPath,
        error: cause
      });
      return err({ type: "config_write_failed", path: settingsPath, cause });
    }
  }
  async ensureConfigDir(configDir) {
    try {
      const exists = await this.container.fileSystem.exists(configDir);
      if (!exists) {
        await this.container.fileSystem.mkdir(configDir, { recursive: true });
        logger3.debug("Created config directory", { path: configDir });
      }
      return ok(undefined);
    } catch (cause) {
      logger3.error("Failed to create config directory", {
        path: configDir,
        error: cause
      });
      return err({ type: "mkdir_failed", path: configDir, cause });
    }
  }
  getSessionConfigDir(groupId, sessionId) {
    const home = process.env["HOME"] ?? "";
    const xdgDataHome = process.env["XDG_DATA_HOME"] ?? `${home}/.local/share`;
    return `${xdgDataHome}/claude-code-agent/session-groups/${groupId}/sessions/${sessionId}/claude-config`;
  }
  getTemplateDir() {
    const home = process.env["HOME"] ?? "";
    const xdgConfigHome = process.env["XDG_CONFIG_HOME"] ?? `${home}/.config`;
    return `${xdgConfigHome}/claude-code-agent/templates`;
  }
}
// src/errors.ts
class AgentError extends Error {
  constructor(message) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = this.constructor.name;
  }
}

class FileNotFoundError extends AgentError {
  code = "FILE_NOT_FOUND";
  recoverable = false;
  path;
  constructor(path) {
    super(`File not found: ${path}`);
    this.path = path;
  }
}
class ParseError extends AgentError {
  code = "PARSE_ERROR";
  recoverable = true;
  file;
  line;
  details;
  constructor(file, line, details) {
    super(`Parse error in ${file} at line ${line}: ${details}`);
    this.file = file;
    this.line = line;
    this.details = details;
  }
}
class CircularDependencyError extends AgentError {
  code = "CIRCULAR_DEPENDENCY";
  recoverable = false;
  cycle;
  constructor(cycle) {
    super(`Circular dependency detected: ${cycle.join(" -> ")}`);
    this.cycle = cycle;
  }
}

// src/sdk/group/dependency-graph.ts
class DependencyGraph {
  nodes;
  completed;
  failed;
  constructor(sessions) {
    this.nodes = new Map;
    this.completed = new Set;
    this.failed = new Set;
    this.buildGraph(sessions);
    if (this.hasCycles()) {
      const cycle = this.findCycle();
      throw new CircularDependencyError(cycle);
    }
  }
  buildGraph(sessions) {
    for (const session of sessions) {
      const dependencies = new Set(session.dependsOn);
      const dependents = new Set;
      this.nodes.set(session.id, {
        session,
        dependencies,
        dependents
      });
    }
    for (const session of sessions) {
      for (const depId of session.dependsOn) {
        const depNode = this.nodes.get(depId);
        if (depNode !== undefined) {
          const updatedDependents = new Set(depNode.dependents);
          updatedDependents.add(session.id);
          this.nodes.set(depId, {
            ...depNode,
            dependents: updatedDependents
          });
        }
      }
    }
  }
  hasCycles() {
    const visited = new Set;
    const recursionStack = new Set;
    const hasCycleFrom = (nodeId) => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      const node = this.nodes.get(nodeId);
      if (node === undefined) {
        return false;
      }
      for (const depId of Array.from(node.dependencies)) {
        if (!visited.has(depId)) {
          if (hasCycleFrom(depId)) {
            return true;
          }
        } else if (recursionStack.has(depId)) {
          return true;
        }
      }
      recursionStack.delete(nodeId);
      return false;
    };
    for (const nodeId of Array.from(this.nodes.keys())) {
      if (!visited.has(nodeId)) {
        if (hasCycleFrom(nodeId)) {
          return true;
        }
      }
    }
    return false;
  }
  findCycle() {
    const visited = new Set;
    const recursionStack = new Set;
    const path = [];
    const findCycleFrom = (nodeId) => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);
      const node = this.nodes.get(nodeId);
      if (node === undefined) {
        return false;
      }
      for (const depId of Array.from(node.dependencies)) {
        if (!visited.has(depId)) {
          if (findCycleFrom(depId)) {
            return true;
          }
        } else if (recursionStack.has(depId)) {
          return true;
        }
      }
      path.pop();
      recursionStack.delete(nodeId);
      return false;
    };
    for (const nodeId of Array.from(this.nodes.keys())) {
      if (!visited.has(nodeId)) {
        if (findCycleFrom(nodeId)) {
          return path;
        }
      }
    }
    return [];
  }
  getReadySessions() {
    const ready = [];
    for (const node of Array.from(this.nodes.values())) {
      if (this.completed.has(node.session.id) || this.failed.has(node.session.id)) {
        continue;
      }
      if (node.session.status !== "pending") {
        continue;
      }
      const hasFailedDependency = Array.from(node.dependencies).some((depId) => this.failed.has(depId));
      if (hasFailedDependency) {
        continue;
      }
      const allDependenciesCompleted = Array.from(node.dependencies).every((depId) => this.completed.has(depId));
      if (allDependenciesCompleted) {
        ready.push(node.session);
      }
    }
    return ready;
  }
  markCompleted(sessionId) {
    this.completed.add(sessionId);
    this.failed.delete(sessionId);
  }
  markFailed(sessionId) {
    this.failed.add(sessionId);
    this.completed.delete(sessionId);
  }
  getRemainingCount() {
    let count = 0;
    for (const node of Array.from(this.nodes.values())) {
      if (!this.completed.has(node.session.id) && !this.failed.has(node.session.id)) {
        count++;
      }
    }
    return count;
  }
  getBlockedSessions() {
    const blocked = [];
    for (const node of Array.from(this.nodes.values())) {
      if (this.completed.has(node.session.id) || this.failed.has(node.session.id)) {
        continue;
      }
      if (node.session.status !== "pending") {
        continue;
      }
      const waitingOn = [];
      for (const depId of Array.from(node.dependencies)) {
        if (!this.completed.has(depId)) {
          waitingOn.push(depId);
        }
      }
      if (waitingOn.length > 0) {
        blocked.push({
          session: node.session,
          waitingOn
        });
      }
    }
    return blocked;
  }
  getCompleted() {
    return this.completed;
  }
  getFailed() {
    return this.failed;
  }
}
// src/sdk/group/runner-updaters.ts
class GroupUpdater {
  container;
  repository;
  eventEmitter;
  constructor(container, repository, eventEmitter) {
    this.container = container;
    this.repository = repository;
    this.eventEmitter = eventEmitter;
  }
  async updateGroupStatus(currentGroup, status, updates) {
    if (currentGroup === null) {
      return null;
    }
    const timestamp = this.container.clock.now().toISOString();
    const updated = {
      ...currentGroup,
      ...updates,
      status,
      updatedAt: timestamp
    };
    await this.repository.save(updated);
    return updated;
  }
  async updateSessionStatus(currentGroup, progressAggregator, sessionId, status, updates) {
    if (currentGroup === null) {
      return null;
    }
    await this.repository.updateSession(currentGroup.id, sessionId, {
      ...updates,
      status
    });
    const sessionIndex = currentGroup.sessions.findIndex((s2) => s2.id === sessionId);
    if (sessionIndex === -1) {
      return currentGroup;
    }
    const sessions = [...currentGroup.sessions];
    const existingSession = sessions[sessionIndex];
    if (existingSession === undefined) {
      return currentGroup;
    }
    sessions[sessionIndex] = {
      ...existingSession,
      ...updates,
      id: existingSession.id,
      status
    };
    const updatedGroup = {
      ...currentGroup,
      sessions
    };
    if (progressAggregator !== null) {
      const session = updatedGroup.sessions.find((s2) => s2.id === sessionId);
      if (session !== undefined) {
        progressAggregator.updateSession(createSessionProgress(session));
      }
    }
    return updatedGroup;
  }
  async emitDependencyResolved(currentGroup, dependencyGraph, completedSessionId) {
    if (currentGroup === null || dependencyGraph === null) {
      return;
    }
    const timestamp = this.container.clock.now().toISOString();
    for (const session of currentGroup.sessions) {
      if (session.dependsOn.includes(completedSessionId)) {
        const allResolved = session.dependsOn.every((depId) => dependencyGraph.getCompleted().has(depId) || dependencyGraph.getFailed().has(depId));
        if (allResolved) {
          this.eventEmitter.emit("dependency_resolved", {
            type: "dependency_resolved",
            timestamp,
            groupId: currentGroup.id,
            sessionId: session.id,
            resolvedDependencies: session.dependsOn
          });
        }
      }
    }
  }
  emitGroupProgress(currentGroup, progressAggregator) {
    if (currentGroup === null || progressAggregator === null) {
      return;
    }
    const progress = progressAggregator.computeProgress(currentGroup);
    const timestamp = this.container.clock.now().toISOString();
    this.eventEmitter.emit("group_progress", {
      type: "group_progress",
      timestamp,
      groupId: currentGroup.id,
      completed: progress.completed,
      running: progress.running,
      pending: progress.pending,
      failed: progress.failed,
      totalCostUsd: progress.totalCost
    });
  }
}

// src/sdk/group/session-processor.ts
import { createHash } from "crypto";

// src/sdk/claude-args.ts
var PRINT_MODE_FLAGS = new Set([
  "-p",
  "--print",
  "--output-format",
  "--input-format"
]);
function assertNoPrintModeArgs(args, source) {
  const blockedArg = args.find((arg) => {
    if (PRINT_MODE_FLAGS.has(arg)) {
      return true;
    }
    return arg.startsWith("--output-format=") || arg.startsWith("--input-format=");
  });
  if (blockedArg !== undefined) {
    throw new Error(`${source} cannot include Claude Code print-mode argument: ${blockedArg}`);
  }
}

// src/sdk/group/session-processor.ts
var logger4 = createTaggedLogger("session-processor");
async function startGroupSession(session, group, container, configGenerator, resumeFlag) {
  logger4.info(`Starting session ${session.id}`, {
    projectPath: session.projectPath
  });
  const configResult = await configGenerator.generateSessionConfig(session, group);
  if (configResult.isErr()) {
    logger4.error(`Failed to generate config for session ${session.id}`, {
      error: configResult.error
    });
    return null;
  }
  const args = [];
  const claudeSessionId = session.claudeSessionId ?? createDeterministicSessionUuid(session.id);
  if (group.config.additionalArgs !== undefined && group.config.additionalArgs.length > 0) {
    assertNoPrintModeArgs(group.config.additionalArgs, "group additionalArgs");
    args.push(...group.config.additionalArgs);
  }
  if (resumeFlag) {
    args.push("--resume", claudeSessionId);
  } else {
    args.push("--session-id", claudeSessionId);
  }
  args.push(session.prompt);
  const env2 = {
    CLAUDE_CONFIG_DIR: configResult.value.configDir
  };
  const process2 = container.processManager.spawn("claude", args, {
    cwd: session.projectPath,
    env: env2
  });
  return process2;
}
function createDeterministicSessionUuid(sessionId) {
  const hex = createHash("sha256").update(sessionId).digest("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `${(Number.parseInt(hex.slice(16, 18), 16) & 63 | 128).toString(16)}${hex.slice(18, 20)}`,
    hex.slice(20, 32)
  ].join("-");
}
async function processGroupSessionOutput(sessionId, process2) {
  await Promise.all([
    drainLines(process2.stdout, () => {}),
    drainLines(process2.stderr, (line) => {
      logger4.warn(`Session ${sessionId} stderr: ${line}`);
    })
  ]);
}
async function drainLines(lines, onLine) {
  try {
    for await (const line of lines) {
      onLine(line);
    }
  } catch (_error) {
    logger4.debug("process stream closed");
  }
}

// src/sdk/group/runner.ts
var logger5 = createTaggedLogger("group-runner");

class GroupRunner {
  container;
  eventEmitter;
  configGenerator;
  updater;
  state = "idle";
  currentGroup = null;
  currentOptions = {
    maxConcurrent: 3,
    respectDependencies: true,
    pauseOnError: true,
    errorThreshold: 2,
    resume: false
  };
  workers = new Map;
  dependencyGraph = null;
  progressAggregator = null;
  failureCount = 0;
  budgetWarningEmitted = false;
  pauseReason = null;
  interruptSignal = null;
  constructor(container, repository, eventEmitter) {
    this.container = container;
    this.eventEmitter = eventEmitter;
    this.configGenerator = new ConfigGenerator(container);
    this.updater = new GroupUpdater(container, repository, eventEmitter);
  }
  async run(group, options) {
    if (this.state === "running") {
      throw new Error("Runner is already executing a group");
    }
    this.currentGroup = group;
    this.state = "running";
    this.failureCount = 0;
    this.budgetWarningEmitted = false;
    this.pauseReason = null;
    this.workers.clear();
    this.currentOptions = {
      maxConcurrent: options?.maxConcurrent ?? group.config.concurrency?.maxConcurrent ?? group.config.maxConcurrentSessions ?? 3,
      respectDependencies: options?.respectDependencies ?? group.config.concurrency?.respectDependencies ?? true,
      pauseOnError: options?.pauseOnError ?? group.config.concurrency?.pauseOnError ?? true,
      errorThreshold: options?.errorThreshold ?? group.config.concurrency?.errorThreshold ?? 2,
      resume: options?.resume ?? false
    };
    this.dependencyGraph = new DependencyGraph(group.sessions);
    const startTime = this.container.clock.now().getTime();
    this.progressAggregator = new ProgressAggregator(startTime);
    for (const session of group.sessions) {
      this.progressAggregator.updateSession(createSessionProgress(session));
    }
    this.currentGroup = await this.updater.updateGroupStatus(this.currentGroup, "running", {
      startedAt: this.container.clock.now().toISOString()
    });
    const timestamp = this.container.clock.now().toISOString();
    this.eventEmitter.emit("group_started", {
      type: "group_started",
      timestamp,
      groupId: group.id,
      totalSessions: group.sessions.length,
      maxConcurrent: this.currentOptions.maxConcurrent
    });
    logger5.info(`Started group ${group.id}`, {
      sessions: group.sessions.length,
      maxConcurrent: this.currentOptions.maxConcurrent
    });
    await this.executeLoop();
  }
  async pause(reason = "manual") {
    if (this.state !== "running") {
      throw new Error("Cannot pause: runner is not running");
    }
    this.state = "paused";
    this.pauseReason = reason;
    logger5.info(`Pausing group ${this.currentGroup?.id}`, { reason });
    if (this.interruptSignal !== null) {
      this.interruptSignal();
    }
    const killPromises = [];
    const workerSessionIds = Array.from(this.workers.keys());
    for (const [sessionId, worker] of this.workers) {
      logger5.debug(`Sending SIGTERM to session ${sessionId}`);
      worker.process.kill("SIGTERM");
      killPromises.push(worker.process.exitCode.then(() => {
        logger5.debug(`Session ${sessionId} terminated`);
      }));
    }
    await Promise.all(killPromises);
    for (const sessionId of workerSessionIds) {
      this.currentGroup = await this.updater.updateSessionStatus(this.currentGroup, this.progressAggregator, sessionId, "paused");
    }
    this.workers.clear();
    this.currentGroup = await this.updater.updateGroupStatus(this.currentGroup, "paused");
    const groupAfterPause = this.currentGroup;
    if (groupAfterPause === null) {
      return;
    }
    const timestamp = this.container.clock.now().toISOString();
    this.eventEmitter.emit("group_paused", {
      type: "group_paused",
      timestamp,
      groupId: groupAfterPause.id,
      runningSessions: 0,
      reason
    });
  }
  async resume() {
    if (this.state !== "paused") {
      throw new Error("Cannot resume: runner is not paused");
    }
    if (this.currentGroup === null || this.dependencyGraph === null) {
      throw new Error("Cannot resume: no group loaded");
    }
    this.state = "running";
    this.currentOptions = { ...this.currentOptions, resume: true };
    this.pauseReason = null;
    this.currentGroup = await this.updater.updateGroupStatus(this.currentGroup, "running");
    const timestamp = this.container.clock.now().toISOString();
    const pendingSessions = this.dependencyGraph.getRemainingCount();
    if (this.currentGroup !== null) {
      this.eventEmitter.emit("group_resumed", {
        type: "group_resumed",
        timestamp,
        groupId: this.currentGroup.id,
        pendingSessions
      });
      logger5.info(`Resumed group ${this.currentGroup.id}`, { pendingSessions });
    }
    await this.executeLoop();
  }
  async stop() {
    if (this.state !== "running" && this.state !== "paused") {
      throw new Error("Cannot stop: runner is not running or paused");
    }
    this.state = "stopped";
    logger5.info(`Stopping group ${this.currentGroup?.id}`);
    if (this.interruptSignal !== null) {
      this.interruptSignal();
    }
    const workerSessionIds = Array.from(this.workers.keys());
    for (const [sessionId, worker] of this.workers) {
      logger5.debug(`Killing session ${sessionId}`);
      worker.process.kill("SIGKILL");
    }
    const exitPromises = Array.from(this.workers.values()).map((w2) => w2.process.exitCode);
    await Promise.all(exitPromises);
    for (const sessionId of workerSessionIds) {
      this.currentGroup = await this.updater.updateSessionStatus(this.currentGroup, this.progressAggregator, sessionId, "failed");
    }
    this.workers.clear();
    this.currentGroup = await this.updater.updateGroupStatus(this.currentGroup, "failed", {
      completedAt: this.container.clock.now().toISOString()
    });
    const groupAfterStop = this.currentGroup;
    if (groupAfterStop === null) {
      return;
    }
    const timestamp = this.container.clock.now().toISOString();
    const failedSessions = groupAfterStop.sessions.filter((s2) => s2.status === "failed").length;
    this.eventEmitter.emit("group_failed", {
      type: "group_failed",
      timestamp,
      groupId: groupAfterStop.id,
      failedSessions,
      reason: "Manually stopped"
    });
  }
  getProgress() {
    if (this.currentGroup === null || this.progressAggregator === null) {
      return null;
    }
    return this.progressAggregator.computeProgress(this.currentGroup);
  }
  getState() {
    return this.state;
  }
  getPauseReason() {
    return this.pauseReason;
  }
  async executeLoop() {
    while (this.state === "running") {
      if (this.checkBudget()) {
        break;
      }
      if (this.state !== "running") {
        break;
      }
      const readySessions = this.dependencyGraph !== null ? this.dependencyGraph.getReadySessions() : [];
      if (readySessions.length === 0 && this.workers.size === 0) {
        await this.completeGroup();
        break;
      }
      for (const session of readySessions) {
        if (this.workers.size >= this.currentOptions.maxConcurrent) {
          break;
        }
        if (this.state !== "running") {
          break;
        }
        await this.startSession(session);
        if (this.state !== "running") {
          break;
        }
      }
      if (this.state !== "running") {
        break;
      }
      if (this.workers.size > 0) {
        await this.waitForCompletion();
      } else if (readySessions.length === 0 && this.dependencyGraph !== null) {
        const blocked = this.dependencyGraph.getBlockedSessions();
        if (blocked.length > 0) {
          logger5.warn(`Group ${this.currentGroup?.id} has blocked sessions due to failed dependencies`);
          await this.failGroup("Blocked sessions due to failed dependencies");
          break;
        }
      }
    }
  }
  async startSession(session) {
    if (this.currentGroup === null) {
      throw new Error("Cannot start session: no group loaded");
    }
    const group = this.currentGroup;
    const process2 = await startGroupSession(session, group, this.container, this.configGenerator, this.currentOptions.resume);
    if (process2 === null) {
      await this.handleSessionFailure(session.id, "Configuration generation failed");
      return;
    }
    const workerState = {
      session,
      process: process2,
      startedAt: this.container.clock.now().getTime()
    };
    this.workers.set(session.id, workerState);
    const timestamp = this.container.clock.now().toISOString();
    this.currentGroup = await this.updater.updateSessionStatus(this.currentGroup, this.progressAggregator, session.id, "active", {
      startedAt: timestamp
    });
    const groupAfterStart = this.currentGroup;
    if (groupAfterStart === null) {
      return;
    }
    this.eventEmitter.emit("group_session_started", {
      type: "group_session_started",
      timestamp,
      groupId: groupAfterStart.id,
      sessionId: session.id,
      projectPath: session.projectPath,
      prompt: session.prompt
    });
    processGroupSessionOutput(session.id, process2);
  }
  async waitForCompletion() {
    if (this.workers.size === 0) {
      return;
    }
    const completionPromises = Array.from(this.workers.entries()).map(async ([sessionId, worker]) => {
      const exitCode = await worker.process.exitCode;
      return { sessionId, worker, exitCode, interrupted: false };
    });
    const interruptPromise = new Promise((resolve) => {
      this.interruptSignal = () => {
        resolve({ interrupted: true });
      };
    });
    const result = await Promise.race([
      ...completionPromises,
      interruptPromise
    ]);
    this.interruptSignal = null;
    if (result.interrupted === true) {
      return;
    }
    await this.handleSessionCompletion(result);
  }
  async handleSessionCompletion(result) {
    const { sessionId, worker, exitCode } = result;
    const durationMs = this.container.clock.now().getTime() - worker.startedAt;
    this.workers.delete(sessionId);
    const timestamp = this.container.clock.now().toISOString();
    const success = exitCode === 0;
    if (success) {
      if (this.dependencyGraph !== null) {
        this.dependencyGraph.markCompleted(sessionId);
      }
      this.currentGroup = await this.updater.updateSessionStatus(this.currentGroup, this.progressAggregator, sessionId, "completed", {
        completedAt: timestamp
      });
      if (this.currentGroup !== null) {
        this.eventEmitter.emit("group_session_completed", {
          type: "group_session_completed",
          timestamp,
          groupId: this.currentGroup.id,
          sessionId,
          status: "completed",
          durationMs
        });
      }
      logger5.info(`Session ${sessionId} completed`, { durationMs });
      await this.updater.emitDependencyResolved(this.currentGroup, this.dependencyGraph, sessionId);
    } else {
      await this.handleSessionFailure(sessionId, `Process exited with code ${exitCode}`, durationMs);
    }
    this.updater.emitGroupProgress(this.currentGroup, this.progressAggregator);
  }
  async handleSessionFailure(sessionId, error, _durationMs) {
    const timestamp = this.container.clock.now().toISOString();
    if (this.dependencyGraph !== null) {
      this.dependencyGraph.markFailed(sessionId);
    }
    this.currentGroup = await this.updater.updateSessionStatus(this.currentGroup, this.progressAggregator, sessionId, "failed", {
      completedAt: timestamp
    });
    if (this.currentGroup !== null) {
      this.eventEmitter.emit("group_session_failed", {
        type: "group_session_failed",
        timestamp,
        groupId: this.currentGroup.id,
        sessionId,
        error
      });
    }
    logger5.error(`Session ${sessionId} failed`, { error });
    this.failureCount++;
    if (this.currentOptions.pauseOnError && this.failureCount >= this.currentOptions.errorThreshold) {
      logger5.warn(`Error threshold reached (${this.failureCount}/${this.currentOptions.errorThreshold})`);
      await this.pause("error_threshold");
    }
  }
  checkBudget() {
    if (this.currentGroup === null || this.progressAggregator === null) {
      return false;
    }
    const progress = this.progressAggregator.computeProgress(this.currentGroup);
    const config = this.currentGroup.config;
    const currentCost = progress.totalCost;
    const maxBudget = config.maxBudgetUsd;
    if (!this.budgetWarningEmitted && isBudgetWarning(currentCost, maxBudget, config.warningThreshold)) {
      this.budgetWarningEmitted = true;
      const timestamp = this.container.clock.now().toISOString();
      const percentUsed = calculateBudgetUsage(currentCost, maxBudget);
      this.eventEmitter.emit("budget_warning", {
        type: "budget_warning",
        timestamp,
        groupId: this.currentGroup.id,
        currentUsage: currentCost,
        limit: maxBudget,
        percentUsed
      });
      logger5.warn(`Budget warning: ${percentUsed.toFixed(1)}% used`, {
        currentCost,
        maxBudget
      });
    }
    if (isBudgetExceeded(currentCost, maxBudget)) {
      const timestamp = this.container.clock.now().toISOString();
      this.eventEmitter.emit("budget_exceeded", {
        type: "budget_exceeded",
        timestamp,
        groupId: this.currentGroup.id,
        usage: currentCost,
        limit: maxBudget,
        action: config.onBudgetExceeded
      });
      logger5.warn(`Budget exceeded`, { currentCost, maxBudget });
      switch (config.onBudgetExceeded) {
        case "stop":
          this.stop();
          return true;
        case "pause":
          this.pause("budget_exceeded");
          return true;
        case "warn":
          return false;
      }
    }
    return false;
  }
  async completeGroup() {
    this.state = "completed";
    if (this.currentGroup === null || this.progressAggregator === null) {
      return;
    }
    const timestamp = this.container.clock.now().toISOString();
    const group = this.currentGroup;
    const progressAggregator = this.progressAggregator;
    const progress = progressAggregator.computeProgress(group);
    this.currentGroup = await this.updater.updateGroupStatus(group, "completed", {
      completedAt: timestamp
    });
    const groupAfterComplete = this.currentGroup;
    if (groupAfterComplete === null) {
      return;
    }
    this.eventEmitter.emit("group_completed", {
      type: "group_completed",
      timestamp,
      groupId: groupAfterComplete.id,
      completedSessions: progress.completed,
      failedSessions: progress.failed,
      totalCostUsd: progress.totalCost,
      elapsedMs: progress.elapsedTime ?? 0
    });
    logger5.info(`Group ${groupAfterComplete.id} completed`, {
      completed: progress.completed,
      failed: progress.failed,
      totalCost: progress.totalCost
    });
  }
  async failGroup(reason) {
    this.state = "stopped";
    const timestamp = this.container.clock.now().toISOString();
    const failedSessions = this.currentGroup?.sessions.filter((s2) => s2.status === "failed").length ?? 0;
    this.currentGroup = await this.updater.updateGroupStatus(this.currentGroup, "failed", {
      completedAt: timestamp
    });
    const groupAfterFail = this.currentGroup;
    if (groupAfterFail === null) {
      return;
    }
    this.eventEmitter.emit("group_failed", {
      type: "group_failed",
      timestamp,
      groupId: groupAfterFail.id,
      failedSessions,
      reason
    });
    logger5.error(`Group ${groupAfterFail.id} failed`, { reason });
  }
}
// node_modules/mitt/dist/mitt.mjs
function mitt_default(n2) {
  return { all: n2 = n2 || new Map, on: function(t2, e2) {
    var i2 = n2.get(t2);
    i2 ? i2.push(e2) : n2.set(t2, [e2]);
  }, off: function(t2, e2) {
    var i2 = n2.get(t2);
    i2 && (e2 ? i2.splice(i2.indexOf(e2) >>> 0, 1) : n2.set(t2, []));
  }, emit: function(t2, e2) {
    var i2 = n2.get(t2);
    i2 && i2.slice().map(function(n3) {
      n3(e2);
    }), (i2 = n2.get("*")) && i2.slice().map(function(n3) {
      n3(t2, e2);
    });
  } };
}

// src/sdk/events/emitter.ts
var logger6 = createTaggedLogger("events");

class EventEmitter2 {
  emitter = mitt_default();
  onceWrappers = new Map;
  on(event, handler) {
    this.emitter.on(event, handler);
    return {
      unsubscribe: () => {
        this.off(event, handler);
      }
    };
  }
  off(event, handler) {
    this.emitter.off(event, handler);
    const eventOnceWrappers = this.onceWrappers.get(event);
    if (eventOnceWrappers !== undefined) {
      const wrapper = eventOnceWrappers.get(handler);
      if (wrapper !== undefined) {
        this.emitter.off(event, wrapper);
        eventOnceWrappers.delete(handler);
        if (eventOnceWrappers.size === 0) {
          this.onceWrappers.delete(event);
        }
      }
    }
  }
  once(event, handler) {
    const wrapper = (data) => {
      this.emitter.off(event, wrapper);
      const eventOnceWrappers2 = this.onceWrappers.get(event);
      if (eventOnceWrappers2 !== undefined) {
        eventOnceWrappers2.delete(handler);
        if (eventOnceWrappers2.size === 0) {
          this.onceWrappers.delete(event);
        }
      }
      try {
        handler(data);
      } catch (error) {
        logger6.error(`Error in once handler for ${event}:`, error instanceof Error ? error.message : String(error));
      }
    };
    let eventOnceWrappers = this.onceWrappers.get(event);
    if (eventOnceWrappers === undefined) {
      eventOnceWrappers = new Map;
      this.onceWrappers.set(event, eventOnceWrappers);
    }
    eventOnceWrappers.set(handler, wrapper);
    this.emitter.on(event, wrapper);
    return {
      unsubscribe: () => {
        this.off(event, handler);
      }
    };
  }
  emit(event, data) {
    const handlers = this.emitter.all.get(event);
    if (handlers !== undefined && handlers.length > 0) {
      for (const handler of [...handlers]) {
        try {
          handler(data);
        } catch (error) {
          logger6.error(`Error in event handler for ${event}:`, error instanceof Error ? error.message : String(error));
        }
      }
    }
  }
  listenerCount(event) {
    const handlers = this.emitter.all.get(event);
    return handlers?.length ?? 0;
  }
  removeAllListeners(event) {
    if (event !== undefined) {
      const handlers = this.emitter.all.get(event);
      if (handlers !== undefined) {
        handlers.length = 0;
      }
      this.onceWrappers.delete(event);
    } else {
      this.emitter.all.clear();
      this.onceWrappers.clear();
    }
  }
  waitFor(event) {
    return new Promise((resolve) => {
      this.once(event, (data) => {
        resolve(data);
      });
    });
  }
}
function createEventEmitter() {
  return new EventEmitter2;
}
// src/types/message.ts
function hasToolUsePayload(message) {
  return hasToolCalls(message) || message.hasToolUseBlocks === true;
}
function hasToolResultPayload(message) {
  return hasToolResults(message) || message.hasToolResultBlocks === true;
}
function hasToolCalls(message) {
  return message.toolCalls !== undefined && Array.isArray(message.toolCalls) && message.toolCalls.length > 0;
}
function hasToolResults(message) {
  return message.toolResults !== undefined && Array.isArray(message.toolResults) && message.toolResults.length > 0;
}
function isToolRelatedMessage(message) {
  return hasToolUsePayload(message) || hasToolResultPayload(message);
}

// src/sdk/jsonl-parser.ts
function parseJsonl(content, filename = "unknown") {
  const lines = content.split(`
`);
  const results = [];
  for (let i2 = 0;i2 < lines.length; i2++) {
    const line = lines[i2];
    if (line === undefined)
      continue;
    const trimmed = line.trim();
    if (trimmed === "") {
      continue;
    }
    try {
      const parsed = JSON.parse(trimmed);
      results.push(parsed);
    } catch (error) {
      const details = error instanceof Error ? error.message : "Unknown parse error";
      return err(new ParseError(filename, i2 + 1, details));
    }
  }
  return ok(results);
}
function parseJsonlWithRecovery(content, onError, filename = "unknown") {
  const lines = content.split(`
`);
  const results = [];
  for (let i2 = 0;i2 < lines.length; i2++) {
    const line = lines[i2];
    if (line === undefined)
      continue;
    const trimmed = line.trim();
    if (trimmed === "") {
      continue;
    }
    try {
      const parsed = JSON.parse(trimmed);
      results.push(parsed);
    } catch (error) {
      const details = error instanceof Error ? error.message : "Unknown parse error";
      onError(new ParseError(filename, i2 + 1, details));
    }
  }
  return results;
}
function parseJsonLine(line, lineNumber = 1, filename = "unknown") {
  const trimmed = line.trim();
  if (trimmed === "") {
    return err(new ParseError(filename, lineNumber, "Empty line"));
  }
  try {
    const parsed = JSON.parse(trimmed);
    return ok(parsed);
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown parse error";
    return err(new ParseError(filename, lineNumber, details));
  }
}
async function* parseJsonlStream(lines, onError, filename = "unknown") {
  let lineNumber = 0;
  for await (const line of lines) {
    lineNumber++;
    const trimmed = line.trim();
    if (trimmed === "") {
      continue;
    }
    try {
      const parsed = JSON.parse(trimmed);
      yield parsed;
    } catch (error) {
      const details = error instanceof Error ? error.message : "Unknown parse error";
      const parseError = new ParseError(filename, lineNumber, details);
      if (onError !== undefined) {
        onError(parseError);
      } else {
        throw parseError;
      }
    }
  }
}
function toJsonl(objects) {
  return objects.map((obj) => JSON.stringify(obj)).join(`
`);
}
function toJsonLine(object) {
  return JSON.stringify(object);
}

// src/types/session.ts
function toSessionMetadata(session) {
  return {
    id: session.id,
    projectPath: session.projectPath,
    status: session.status,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    messageCount: session.messages.length,
    tokenUsage: session.tokenUsage,
    costUsd: session.costUsd
  };
}

// src/polling/parser.ts
class JsonlStreamParser {
  buffer;
  constructor() {
    this.buffer = "";
  }
  feed(content) {
    this.buffer += content;
    const lines = this.buffer.split(`
`);
    const lastLine = lines.pop();
    this.buffer = lastLine ?? "";
    const events = [];
    for (const line of lines) {
      const event = this.parseLine(line);
      if (event !== null) {
        events.push(event);
      }
    }
    return events;
  }
  flush() {
    if (this.buffer.trim() === "") {
      this.buffer = "";
      return [];
    }
    const event = this.parseLine(this.buffer);
    this.buffer = "";
    return event !== null ? [event] : [];
  }
  parseLine(line) {
    const trimmed = line.trim();
    if (trimmed === "") {
      return null;
    }
    try {
      const raw = JSON.parse(trimmed);
      const event = {
        type: "type" in raw && typeof raw.type === "string" ? raw.type : "unknown",
        raw
      };
      if ("uuid" in raw && typeof raw.uuid === "string") {
        event.uuid = raw.uuid;
      }
      if ("timestamp" in raw && typeof raw.timestamp === "string") {
        event.timestamp = raw.timestamp;
      }
      if ("content" in raw) {
        event.content = raw.content;
      } else if ("message" in raw && typeof raw.message === "object" && raw.message !== null && "content" in raw.message) {
        event.content = raw.message.content;
      }
      return event;
    } catch {
      return null;
    }
  }
}

// src/sdk/session-reader/constants.ts
var UUID_SESSION_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jsonl$/;
function isSessionFile(filename) {
  return UUID_SESSION_PATTERN.test(filename) || filename === "session.jsonl";
}

// src/sdk/session-reader/message-extract.ts
function extractContentBlocks(content) {
  const textParts = [];
  const toolCalls = [];
  const toolResults = [];
  let hasToolUseBlocks = false;
  let hasToolResultBlocks = false;
  for (const block of content) {
    switch (block.type) {
      case "text":
        if (block.text) {
          textParts.push(block.text);
        }
        break;
      case "tool_use":
        hasToolUseBlocks = true;
        if (block.id && block.name) {
          toolCalls.push({
            id: block.id,
            name: block.name,
            input: block.input ?? {}
          });
        }
        break;
      case "tool_result":
        hasToolResultBlocks = true;
        if (block.tool_use_id) {
          const output = typeof block.content === "string" ? block.content : JSON.stringify(block.content ?? "");
          toolResults.push({
            id: block.tool_use_id,
            output,
            isError: block.is_error ?? false
          });
        }
        break;
    }
  }
  return {
    textContent: textParts.join(`
`),
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    toolResults: toolResults.length > 0 ? toolResults : undefined,
    hasToolUseBlocks: hasToolUseBlocks ? true : undefined,
    hasToolResultBlocks: hasToolResultBlocks ? true : undefined
  };
}
function extractMessage(record) {
  const type = record["type"];
  if (type !== "user" && type !== "assistant") {
    return null;
  }
  const message = record["message"];
  if (!message || typeof message !== "object") {
    return null;
  }
  const uuid = record["uuid"];
  const timestamp = record["timestamp"];
  const role = message["role"];
  const content = message["content"];
  if (!uuid || !timestamp || !role || content === undefined) {
    return null;
  }
  let textContent;
  let toolCalls;
  let toolResults;
  let hasToolUseBlocks;
  let hasToolResultBlocks;
  if (typeof content === "string") {
    textContent = content;
  } else if (Array.isArray(content)) {
    const extracted = extractContentBlocks(content);
    textContent = extracted.textContent;
    toolCalls = extracted.toolCalls;
    toolResults = extracted.toolResults;
    hasToolUseBlocks = extracted.hasToolUseBlocks;
    hasToolResultBlocks = extracted.hasToolResultBlocks;
  } else {
    textContent = "";
  }
  return {
    id: uuid,
    role,
    content: textContent,
    timestamp,
    toolCalls,
    toolResults,
    hasToolUseBlocks,
    hasToolResultBlocks
  };
}
function extractTasks(record) {
  const message = record["message"];
  if (!message || typeof message !== "object") {
    return [];
  }
  const content = message["content"];
  if (!Array.isArray(content)) {
    return [];
  }
  for (const block of content) {
    if (typeof block === "object" && block !== null && block.type === "tool_use" && block.name === "TodoWrite") {
      const input = block.input;
      if (!input || typeof input !== "object") {
        continue;
      }
      const todos = input.todos;
      if (!Array.isArray(todos)) {
        continue;
      }
      const tasks = [];
      for (const todo of todos) {
        if (typeof todo !== "object" || todo === null) {
          continue;
        }
        const todoContent = todo["content"];
        const status = todo["status"];
        const activeForm = todo["activeForm"];
        if (typeof todoContent === "string" && typeof status === "string" && (status === "pending" || status === "in_progress" || status === "completed") && typeof activeForm === "string") {
          tasks.push({
            content: todoContent,
            status,
            activeForm
          });
        }
      }
      return tasks;
    }
  }
  return [];
}
function extractUsage(record) {
  const message = record["message"];
  const usage = message?.["usage"];
  if (!usage) {
    return;
  }
  const input = finiteUsageNumber(usage["input_tokens"], 0);
  const output = finiteUsageNumber(usage["output_tokens"], 0);
  const cacheRead = finiteOptionalUsageNumber(usage["cache_read_input_tokens"]);
  const cacheWrite = finiteOptionalUsageNumber(usage["cache_creation_input_tokens"]);
  return {
    input,
    output,
    cacheRead,
    cacheWrite
  };
}
function finiteUsageNumber(value, fallback) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return fallback;
}
function finiteOptionalUsageNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return;
}
function aggregateUsage(usages) {
  if (usages.length === 0) {
    return;
  }
  let totalInput = 0;
  let totalOutput = 0;
  let totalCacheRead = 0;
  let totalCacheWrite = 0;
  for (const usage of usages) {
    totalInput += usage.input;
    totalOutput += usage.output;
    totalCacheRead += usage.cacheRead ?? 0;
    totalCacheWrite += usage.cacheWrite ?? 0;
  }
  return {
    input: totalInput,
    output: totalOutput,
    cacheRead: totalCacheRead > 0 ? totalCacheRead : undefined,
    cacheWrite: totalCacheWrite > 0 ? totalCacheWrite : undefined
  };
}

// src/types/config.ts
function getDefaultConfig() {
  const home = process.env["HOME"] ?? "";
  const xdgDataHome = process.env["XDG_DATA_HOME"] ?? `${home}/.local/share`;
  return {
    claudeDataDir: `${home}/.claude`,
    metadataDir: `${xdgDataHome}/claude-code-agent`,
    claudeExecutable: "claude",
    defaultModel: undefined,
    logging: {
      level: "info",
      json: false,
      file: undefined
    }
  };
}

// src/sdk/session-reader/path-meta.ts
function encodeProjectPath(workingDirectory) {
  return workingDirectory.replace(/\//g, "-");
}
function getDefaultClaudeProjectsDir() {
  const config = getDefaultConfig();
  const claudeDataDir = config.claudeDataDir ?? `${process.env["HOME"] ?? ""}/.claude`;
  return `${claudeDataDir}/projects`;
}
function deriveSessionIdFromPath(path) {
  const parts = path.split("/");
  const filename = parts[parts.length - 1] ?? "unknown.jsonl";
  if (filename === "session.jsonl") {
    const dirName = parts[parts.length - 2];
    return dirName ?? "unknown";
  }
  if (filename.endsWith(".jsonl")) {
    return filename.slice(0, -".jsonl".length);
  }
  return filename;
}
function deriveProjectPath(filePath) {
  const parts = filePath.split("/");
  const projectsIndex = parts.indexOf("projects");
  if (projectsIndex >= 0 && projectsIndex + 1 < parts.length) {
    const encodedPath = parts[projectsIndex + 1];
    if (!encodedPath) {
      return "";
    }
    return encodedPath.replace(/-/g, "/");
  }
  return "";
}
function matchesSessionSource(filePath, source) {
  if (source === "all") {
    return true;
  }
  const filename = filePath.split("/").pop() ?? "";
  if (source === "legacy") {
    return filename === "session.jsonl";
  }
  return UUID_SESSION_PATTERN.test(filename);
}
function matchesWorkingDirectoryPrefix(filePath, workingDirectoryPrefix) {
  const prefix = workingDirectoryPrefix.trim();
  if (prefix === "") {
    return true;
  }
  const projectPath = deriveProjectPath(filePath);
  return projectPath.startsWith(prefix);
}

// src/sdk/session-reader/transcript-search.ts
function tryParseJsonRecord(line) {
  try {
    const parsed = JSON.parse(line);
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}
function matchesRoleFilter(record, role) {
  if (role === "both") {
    return true;
  }
  const type = record["type"];
  if (type === "user" || type === "assistant") {
    return type === role;
  }
  const message = record["message"];
  if (typeof message !== "object" || message === null) {
    return false;
  }
  const messageRole = message["role"];
  return messageRole === role;
}
function collectStringValues(value, output, depth, maxDepth) {
  if (value === null || value === undefined || depth > maxDepth) {
    return;
  }
  if (typeof value === "string") {
    output.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectStringValues(item, output, depth + 1, maxDepth);
    }
    return;
  }
  if (typeof value !== "object") {
    return;
  }
  for (const child of Object.values(value)) {
    collectStringValues(child, output, depth + 1, maxDepth);
  }
}
function extractSearchableText(record) {
  const collected = [];
  collectStringValues(record["message"], collected, 0, 6);
  if (collected.length === 0) {
    collectStringValues(record, collected, 0, 4);
  }
  return collected.join(`
`);
}
function searchTranscriptInContent(sessionId, content, query, options) {
  const caseSensitive = options.caseSensitive ?? false;
  const role = options.role ?? "both";
  const maxMatches = options.maxMatches ?? 1;
  const maxBytes = options.maxBytes;
  const timeoutMs = options.timeoutMs;
  const deadline = timeoutMs !== undefined && timeoutMs >= 0 ? Date.now() + timeoutMs : null;
  const normalizedQuery = caseSensitive ? query : query.toLowerCase();
  const lines = content.split(/\r?\n/);
  let matchCount = 0;
  let scannedBytes = 0;
  let scannedLines = 0;
  let truncated = false;
  let timedOut = false;
  for (const line of lines) {
    if (line.trim() === "") {
      continue;
    }
    if (deadline !== null && Date.now() > deadline) {
      truncated = true;
      timedOut = true;
      break;
    }
    const lineBytes = Buffer.byteLength(line, "utf8") + 1;
    if (maxBytes !== undefined && maxBytes >= 0 && scannedBytes + lineBytes > maxBytes) {
      truncated = true;
      break;
    }
    scannedBytes += lineBytes;
    scannedLines += 1;
    const parsed = tryParseJsonRecord(line);
    if (parsed === null) {
      continue;
    }
    if (!matchesRoleFilter(parsed, role)) {
      continue;
    }
    const searchableText = extractSearchableText(parsed);
    if (searchableText === "") {
      continue;
    }
    const normalizedText = caseSensitive ? searchableText : searchableText.toLowerCase();
    if (normalizedText.includes(normalizedQuery)) {
      matchCount += 1;
      if (maxMatches >= 0 && matchCount >= maxMatches) {
        truncated = scannedLines < lines.length;
        break;
      }
    }
  }
  return {
    sessionId,
    matched: matchCount > 0,
    matchCount,
    scannedBytes,
    scannedLines,
    truncated,
    timedOut
  };
}

// src/sdk/session-reader/session-index-builder.ts
async function buildSessionIndexEntriesFromJsonl(deps, projectDirPath, workingDirectory) {
  const sessionFiles = await deps.findSessionFiles(projectDirPath);
  const entries = [];
  for (const filePath of sessionFiles) {
    try {
      const content = await deps.readFile(filePath);
      const parseResult = parseJsonl(content, filePath);
      if (parseResult.isErr()) {
        continue;
      }
      const lines = parseResult.value;
      let firstPrompt = "";
      let summary = "";
      let sessionId = "";
      let gitBranch = "";
      let firstTimestamp = "";
      let lastTimestamp = "";
      for (const line of lines) {
        if (typeof line !== "object" || line === null) {
          continue;
        }
        const record = line;
        if (!sessionId && typeof record["sessionId"] === "string") {
          sessionId = record["sessionId"];
        }
        if (!gitBranch && typeof record["gitBranch"] === "string") {
          gitBranch = record["gitBranch"];
        }
        if (typeof record["timestamp"] === "string") {
          if (!firstTimestamp) {
            firstTimestamp = record["timestamp"];
          }
          lastTimestamp = record["timestamp"];
        }
        const type = record["type"];
        if (type === "user" && !firstPrompt) {
          const message = record["message"];
          if (message && typeof message === "object") {
            const msgContent = message["content"];
            if (typeof msgContent === "string") {
              firstPrompt = msgContent.slice(0, 200);
            } else if (Array.isArray(msgContent)) {
              for (const block of msgContent) {
                if (typeof block === "object" && block !== null && block["type"] === "text") {
                  const text = block["text"];
                  if (typeof text === "string") {
                    firstPrompt = text.slice(0, 200);
                    break;
                  }
                }
              }
            }
          }
        }
        if (type === "summary") {
          const message = record["message"];
          if (message && typeof message === "object") {
            const msgContent = message["content"];
            if (typeof msgContent === "string") {
              summary = msgContent.slice(0, 200);
            }
          }
        }
      }
      if (!sessionId) {
        sessionId = deriveSessionIdFromPath(filePath);
      }
      const now = new Date().toISOString();
      entries.push({
        sessionId,
        fullPath: filePath,
        firstPrompt,
        summary,
        modified: lastTimestamp || now,
        created: firstTimestamp || now,
        gitBranch,
        projectPath: workingDirectory
      });
    } catch {}
  }
  return entries;
}

// src/sdk/session-reader/reader.ts
class SessionReader {
  fileSystem;
  constructor(container) {
    this.fileSystem = container.fileSystem;
  }
  static encodeProjectPath(workingDirectory) {
    return encodeProjectPath(workingDirectory);
  }
  async readSession(path) {
    let content;
    try {
      content = await this.fileSystem.readFile(path);
    } catch (error) {
      if (error instanceof FileNotFoundError) {
        return err(error);
      }
      return err(new FileNotFoundError(path));
    }
    const parseResult = parseJsonl(content, path);
    if (parseResult.isErr()) {
      return err(parseResult.error);
    }
    const lines = parseResult.value;
    const messages = [];
    const usages = [];
    let sessionId = "";
    let projectPath = "";
    const status = "active";
    let createdAt = "";
    let updatedAt = "";
    let tasks = [];
    for (const line of lines) {
      if (typeof line !== "object" || line === null) {
        continue;
      }
      const record = line;
      const message = extractMessage(record);
      if (message) {
        messages.push(message);
      }
      const type = record["type"];
      if (type === "assistant") {
        const extractedTasks = extractTasks(record);
        if (extractedTasks.length > 0) {
          tasks = extractedTasks;
        }
        const usage = extractUsage(record);
        if (usage) {
          usages.push(usage);
        }
      }
      if (typeof record["sessionId"] === "string") {
        sessionId = record["sessionId"];
      }
      if (!projectPath && typeof record["cwd"] === "string") {
        projectPath = record["cwd"];
      }
      if (typeof record["timestamp"] === "string") {
        if (!createdAt) {
          createdAt = record["timestamp"];
        }
        updatedAt = record["timestamp"];
      }
    }
    if (!projectPath) {
      projectPath = deriveProjectPath(path);
    }
    const now = new Date().toISOString();
    if (createdAt === "") {
      createdAt = now;
    }
    if (updatedAt === "") {
      updatedAt = now;
    }
    if (sessionId === "") {
      sessionId = deriveSessionIdFromPath(path);
    }
    const tokenUsage = aggregateUsage(usages);
    const session = {
      id: sessionId,
      projectPath,
      status,
      createdAt,
      updatedAt,
      messages,
      tasks,
      tokenUsage
    };
    return ok(session);
  }
  async readMessages(path, options) {
    const sessionResult = await this.readSession(path);
    if (sessionResult.isErr()) {
      return err(sessionResult.error);
    }
    if (options?.excludeToolMessages) {
      return ok(sessionResult.value.messages.filter((message) => !isToolRelatedMessage(message)));
    }
    return ok(sessionResult.value.messages);
  }
  async findSessionFiles(projectPath) {
    const sessionFiles = [];
    const pathExists = await this.fileSystem.exists(projectPath);
    if (!pathExists) {
      return sessionFiles;
    }
    try {
      const stat = await this.fileSystem.stat(projectPath);
      if (!stat.isDirectory) {
        const filename = projectPath.split("/").pop() ?? "";
        if (isSessionFile(filename)) {
          return [projectPath];
        }
        return sessionFiles;
      }
    } catch {
      return sessionFiles;
    }
    try {
      const entries = await this.fileSystem.readDir(projectPath);
      for (const entry of entries) {
        const entryPath = `${projectPath}/${entry}`;
        if (isSessionFile(entry)) {
          sessionFiles.push(entryPath);
          continue;
        }
        try {
          const entryStat = await this.fileSystem.stat(entryPath);
          if (entryStat.isDirectory) {
            const subEntries = await this.fileSystem.readDir(entryPath);
            for (const subEntry of subEntries) {
              if (isSessionFile(subEntry)) {
                sessionFiles.push(`${entryPath}/${subEntry}`);
              }
            }
          }
        } catch {}
      }
    } catch {}
    return sessionFiles;
  }
  async listSessions(projectPath) {
    const searchPath = projectPath ?? getDefaultClaudeProjectsDir();
    const sessionPaths = await this.findSessionFiles(searchPath);
    const sessions = [];
    for (const filePath of sessionPaths) {
      const result = await this.readSession(filePath);
      if (result.isOk()) {
        sessions.push(toSessionMetadata(result.value));
      }
    }
    return sessions;
  }
  async getSession(sessionId) {
    const claudeDir = getDefaultClaudeProjectsDir();
    const sessionPaths = await this.findSessionFiles(claudeDir);
    for (const filePath of sessionPaths) {
      const result = await this.readSession(filePath);
      if (result.isOk() && result.value.id === sessionId) {
        return result.value;
      }
    }
    return null;
  }
  async getMessages(sessionId, options) {
    const session = await this.getSession(sessionId);
    if (!session) {
      return [];
    }
    if (options?.excludeToolMessages) {
      return session.messages.filter((message) => !isToolRelatedMessage(message));
    }
    return session.messages;
  }
  async listSessionsByWorkingDirectory(options) {
    const {
      workingDirectory,
      search,
      offset = 0,
      limit = 50,
      sortBy = "modified",
      sortOrder = "desc"
    } = options;
    const encodedPath = SessionReader.encodeProjectPath(workingDirectory);
    const projectDirPath = `${getDefaultClaudeProjectsDir()}/${encodedPath}`;
    let entries = [];
    const indexPath = `${projectDirPath}/sessions-index.json`;
    try {
      const indexContent = await this.fileSystem.readFile(indexPath);
      const index = JSON.parse(indexContent);
      if (Array.isArray(index.entries)) {
        entries = [...index.entries];
      }
    } catch {}
    if (entries.length === 0) {
      entries = await buildSessionIndexEntriesFromJsonl({
        findSessionFiles: (p) => this.findSessionFiles(p),
        readFile: (p) => this.fileSystem.readFile(p)
      }, projectDirPath, workingDirectory);
    }
    if (search) {
      const lowerSearch = search.toLowerCase();
      entries = entries.filter((e2) => e2.firstPrompt.toLowerCase().includes(lowerSearch) || e2.summary.toLowerCase().includes(lowerSearch));
    }
    entries.sort((a2, b2) => {
      const aVal = sortBy === "modified" ? a2.modified : a2.created;
      const bVal = sortBy === "modified" ? b2.modified : b2.created;
      const cmp = aVal.localeCompare(bVal);
      return sortOrder === "asc" ? cmp : -cmp;
    });
    const total = entries.length;
    const paginated = entries.slice(offset, offset + limit);
    return {
      sessions: paginated,
      total,
      offset,
      limit
    };
  }
  async readTranscript(sessionId, options) {
    const filePath = await this.findSessionFilePath(sessionId);
    if (filePath === null) {
      return err(new FileNotFoundError(`Session not found: ${sessionId}`));
    }
    let content;
    try {
      content = await this.fileSystem.readFile(filePath);
    } catch (error) {
      if (error instanceof FileNotFoundError) {
        return err(error);
      }
      return err(new FileNotFoundError(filePath));
    }
    const parser = new JsonlStreamParser;
    const allEvents = parser.feed(content);
    const flushed = parser.flush();
    const events = [...allEvents, ...flushed];
    const total = events.length;
    const usages = [];
    for (const event of events) {
      if (event.type === "assistant") {
        const usage = extractUsage(event.raw);
        if (usage) {
          usages.push(usage);
        }
      }
    }
    const tokenUsage = aggregateUsage(usages);
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? total;
    const paginatedEvents = events.slice(offset, offset + limit);
    if (tokenUsage !== undefined) {
      return ok({ events: paginatedEvents, total, tokenUsage });
    }
    return ok({ events: paginatedEvents, total });
  }
  async readSessionUsage(sessionId) {
    const filePath = await this.findSessionFilePath(sessionId);
    if (filePath === null) {
      return err(new FileNotFoundError(`Session not found: ${sessionId}`));
    }
    let content;
    try {
      content = await this.fileSystem.readFile(filePath);
    } catch (error) {
      if (error instanceof FileNotFoundError) {
        return err(error);
      }
      return err(new FileNotFoundError(filePath));
    }
    const parseResult = parseJsonl(content, filePath);
    if (parseResult.isErr()) {
      return err(parseResult.error);
    }
    const lines = parseResult.value;
    const usages = [];
    for (const line of lines) {
      if (typeof line !== "object" || line === null) {
        continue;
      }
      const record = line;
      const type = record["type"];
      if (type === "assistant") {
        const usage = extractUsage(record);
        if (usage) {
          usages.push(usage);
        }
      }
    }
    const tokenUsage = aggregateUsage(usages);
    return ok(tokenUsage);
  }
  async searchTranscript(sessionId, query, options = {}) {
    const trimmedQuery = query.trim();
    if (trimmedQuery === "") {
      return ok({
        sessionId,
        matched: false,
        matchCount: 0,
        scannedBytes: 0,
        scannedLines: 0,
        truncated: false,
        timedOut: false
      });
    }
    const filePath = await this.findSessionFilePath(sessionId);
    if (filePath === null) {
      return err(new FileNotFoundError(`Session not found: ${sessionId}`));
    }
    let content;
    try {
      content = await this.fileSystem.readFile(filePath);
    } catch (error) {
      if (error instanceof FileNotFoundError) {
        return err(error);
      }
      return err(new FileNotFoundError(filePath));
    }
    return ok(searchTranscriptInContent(sessionId, content, trimmedQuery, options));
  }
  async searchSessions(query, options = {}) {
    const trimmedQuery = query.trim();
    const offset = options.offset ?? 0;
    const limit = options.limit ?? 50;
    if (trimmedQuery === "") {
      return {
        sessionIds: [],
        total: 0,
        offset,
        limit,
        scannedSessions: 0,
        truncated: false,
        timedOut: false
      };
    }
    const searchPath = options.projectPath ?? getDefaultClaudeProjectsDir();
    const allSessionFiles = await this.findSessionFiles(searchPath);
    const source = options.source ?? "all";
    const workingDirectoryPrefix = options.workingDirectoryPrefix;
    const projectPathPrefix = options.projectPathPrefix;
    const sessionFiles = allSessionFiles.filter((filePath) => {
      if (!matchesSessionSource(filePath, source)) {
        return false;
      }
      if (workingDirectoryPrefix !== undefined && !matchesWorkingDirectoryPrefix(filePath, workingDirectoryPrefix)) {
        return false;
      }
      if (projectPathPrefix !== undefined && !matchesWorkingDirectoryPrefix(filePath, projectPathPrefix)) {
        return false;
      }
      return true;
    });
    const matchedSessionIds = [];
    const maxSessions = options.maxSessions;
    const maxSessionsToScan = maxSessions !== undefined && maxSessions >= 0 ? maxSessions : Number.POSITIVE_INFINITY;
    let scannedSessions = 0;
    let truncated = false;
    let timedOut = false;
    for (const filePath of sessionFiles) {
      if (scannedSessions >= maxSessionsToScan) {
        truncated = true;
        break;
      }
      scannedSessions += 1;
      const sid = deriveSessionIdFromPath(filePath);
      let content;
      try {
        content = await this.fileSystem.readFile(filePath);
      } catch {
        continue;
      }
      const searchResult = searchTranscriptInContent(sid, content, trimmedQuery, options);
      if (searchResult.timedOut) {
        timedOut = true;
      }
      if (searchResult.truncated) {
        truncated = true;
      }
      if (searchResult.matched) {
        matchedSessionIds.push(sid);
      }
    }
    const total = matchedSessionIds.length;
    const paginatedSessionIds = matchedSessionIds.slice(offset, offset + limit);
    return {
      sessionIds: paginatedSessionIds,
      total,
      offset,
      limit,
      scannedSessions,
      truncated,
      timedOut
    };
  }
  async findSessionFilePath(sessionId) {
    const claudeDir = getDefaultClaudeProjectsDir();
    const sessionPaths = await this.findSessionFiles(claudeDir);
    for (const filePath of sessionPaths) {
      const derivedId = deriveSessionIdFromPath(filePath);
      if (derivedId === sessionId) {
        return filePath;
      }
    }
    return null;
  }
}
// src/sdk/receiver.ts
import { open, readFile, readdir, stat } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
class SessionUpdateReceiver {
  _sessionId;
  options;
  legacyTranscriptPath;
  projectsRootPath;
  resolvedTranscriptPath = null;
  lastPathLookupAt = 0;
  _isClosed = false;
  _isPolling = false;
  pollingTimer = null;
  fileOffset = 0;
  parser = new JsonlStreamParser;
  updateQueue = [];
  pendingReceive = null;
  firstReceiveHandled = { value: false };
  constructor(sessionId, options) {
    this._sessionId = sessionId;
    const defaultTranscriptPath = join(homedir(), ".claude", "sessions", sessionId, "transcript.jsonl");
    this.options = {
      pollingIntervalMs: options?.pollingIntervalMs ?? 300,
      includeExisting: options?.includeExisting ?? true,
      transcriptPath: options?.transcriptPath
    };
    this.legacyTranscriptPath = defaultTranscriptPath;
    this.projectsRootPath = join(homedir(), ".claude", "projects");
    this.resolvedTranscriptPath = this.options.transcriptPath ?? null;
  }
  get sessionId() {
    return this._sessionId;
  }
  get isClosed() {
    return this._isClosed;
  }
  async receive() {
    if (this._isClosed) {
      return null;
    }
    if (!this._isPolling) {
      await this.startPolling();
    }
    const queued = this.updateQueue.shift();
    if (queued !== undefined) {
      return queued;
    }
    return new Promise((resolve) => {
      this.pendingReceive = resolve;
    });
  }
  close() {
    if (this._isClosed) {
      return;
    }
    this._isClosed = true;
    this._isPolling = false;
    if (this.pollingTimer !== null) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    if (this.pendingReceive !== null) {
      this.pendingReceive(null);
      this.pendingReceive = null;
    }
    this.updateQueue.length = 0;
  }
  async startPolling() {
    this._isPolling = true;
    if (!this.firstReceiveHandled.value) {
      this.firstReceiveHandled.value = true;
      if (this.options.includeExisting) {
        await this.handleIncludeExisting();
      } else {
        await this.skipExistingContent();
      }
    }
    this.pollingTimer = setInterval(() => {
      this.poll();
    }, this.options.pollingIntervalMs);
    this.poll();
  }
  async skipExistingContent() {
    try {
      const transcriptPath = await this.resolveTranscriptPath();
      const fileStat = await stat(transcriptPath);
      this.fileOffset = fileStat.size;
      if (fileStat.size > 0) {
        const existingContent = await readFile(transcriptPath, "utf8");
        this.parser.feed(existingContent);
      }
    } catch {}
  }
  async handleIncludeExisting() {
    try {
      const transcriptPath = await this.resolveTranscriptPath();
      const fileStat = await stat(transcriptPath);
      if (fileStat.size === 0) {
        this.fileOffset = 0;
        return;
      }
      const content = await readFile(transcriptPath, "utf8");
      const events = this.parser.feed(content);
      this.fileOffset = fileStat.size;
      const update = {
        sessionId: this._sessionId,
        newContent: content,
        events,
        timestamp: new Date().toISOString()
      };
      this.enqueueOrResolvePending(update);
    } catch {}
  }
  async poll() {
    if (this._isClosed) {
      return;
    }
    try {
      const transcriptPath = await this.resolveTranscriptPath();
      const fileStat = await stat(transcriptPath);
      if (fileStat.size < this.fileOffset) {
        this.fileOffset = 0;
        this.parser = new JsonlStreamParser;
      }
      if (fileStat.size === this.fileOffset) {
        return;
      }
      const newContent = await this.readRange(transcriptPath, this.fileOffset, fileStat.size - this.fileOffset);
      if (newContent.length === 0) {
        return;
      }
      const events = this.parser.feed(newContent);
      this.fileOffset = fileStat.size;
      const update = {
        sessionId: this._sessionId,
        newContent,
        events,
        timestamp: new Date().toISOString()
      };
      this.enqueueOrResolvePending(update);
    } catch {
      this.fileOffset = 0;
      this.parser = new JsonlStreamParser;
    }
  }
  enqueueOrResolvePending(update) {
    if (this.pendingReceive !== null) {
      const resolver = this.pendingReceive;
      this.pendingReceive = null;
      resolver(update);
    } else {
      this.updateQueue.push(update);
    }
  }
  async resolveTranscriptPath() {
    if (this.options.transcriptPath !== undefined) {
      return this.options.transcriptPath;
    }
    if (this.resolvedTranscriptPath !== null) {
      return this.resolvedTranscriptPath;
    }
    const now = Date.now();
    if (now - this.lastPathLookupAt < 1000) {
      return this.legacyTranscriptPath;
    }
    this.lastPathLookupAt = now;
    if (await this.fileExists(this.legacyTranscriptPath)) {
      this.resolvedTranscriptPath = this.legacyTranscriptPath;
      return this.legacyTranscriptPath;
    }
    const projectSessionFile = await this.findSessionFileInProjects();
    if (projectSessionFile !== null) {
      this.resolvedTranscriptPath = projectSessionFile;
      return projectSessionFile;
    }
    return this.legacyTranscriptPath;
  }
  async fileExists(path) {
    try {
      await stat(path);
      return true;
    } catch {
      return false;
    }
  }
  async findSessionFileInProjects() {
    let projectDirs;
    try {
      projectDirs = await readdir(this.projectsRootPath, {
        withFileTypes: true
      });
    } catch {
      return null;
    }
    const targetFile = `${this._sessionId}.jsonl`;
    for (const entry of projectDirs) {
      if (!entry.isDirectory()) {
        continue;
      }
      const directPath = join(this.projectsRootPath, entry.name, targetFile);
      if (await this.fileExists(directPath)) {
        return directPath;
      }
      const nestedPath = await this.findFileByNameDepthLimited(join(this.projectsRootPath, entry.name), targetFile, 3);
      if (nestedPath !== null) {
        return nestedPath;
      }
    }
    return null;
  }
  async findFileByNameDepthLimited(rootDir, fileName, maxDepth) {
    const queue2 = [{ path: rootDir, depth: 0 }];
    while (queue2.length > 0) {
      const current = queue2.shift();
      if (current === undefined) {
        continue;
      }
      let entries;
      try {
        entries = await readdir(current.path, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        if (entry.isFile() && entry.name === fileName) {
          return join(current.path, entry.name);
        }
        if (entry.isDirectory() && current.depth < maxDepth) {
          queue2.push({
            path: join(current.path, entry.name),
            depth: current.depth + 1
          });
        }
      }
    }
    return null;
  }
  async readRange(path, offset, length) {
    if (length <= 0) {
      return "";
    }
    const fileHandle = await open(path, "r");
    try {
      const buffer = new Uint8Array(length);
      let totalRead = 0;
      while (totalRead < length) {
        const { bytesRead } = await fileHandle.read(buffer, totalRead, length - totalRead, offset + totalRead);
        if (bytesRead === 0) {
          break;
        }
        totalRead += bytesRead;
      }
      return new TextDecoder().decode(buffer.subarray(0, totalRead));
    } finally {
      await fileHandle.close();
    }
  }
}
function createSessionReceiver(sessionId, options) {
  return new SessionUpdateReceiver(sessionId, options);
}
// src/sdk/__fixtures__/mock-receiver.ts
class MockSessionUpdateReceiver {
  _sessionId;
  _isClosed = false;
  updateQueue = [];
  pendingReceive = null;
  constructor(sessionId) {
    this._sessionId = sessionId;
  }
  get sessionId() {
    return this._sessionId;
  }
  get isClosed() {
    return this._isClosed;
  }
  async receive() {
    if (this._isClosed) {
      return null;
    }
    const queued = this.updateQueue.shift();
    if (queued !== undefined) {
      return queued;
    }
    return new Promise((resolve) => {
      this.pendingReceive = resolve;
    });
  }
  close() {
    if (this._isClosed) {
      return;
    }
    this._isClosed = true;
    if (this.pendingReceive !== null) {
      this.pendingReceive(null);
      this.pendingReceive = null;
    }
    this.updateQueue.length = 0;
  }
  pushUpdate(update) {
    if (this._isClosed) {
      throw new Error("Cannot push update to closed mock receiver");
    }
    if (this.pendingReceive !== null) {
      const resolver = this.pendingReceive;
      this.pendingReceive = null;
      resolver(update);
    } else {
      this.updateQueue.push(update);
    }
  }
  pushEvents(events, content) {
    const newContent = content ?? events.map((e2) => JSON.stringify(e2.raw)).join(`
`) + `
`;
    const update = {
      sessionId: this._sessionId,
      newContent,
      events,
      timestamp: new Date().toISOString()
    };
    this.pushUpdate(update);
  }
  get hasPendingReceive() {
    return this.pendingReceive !== null;
  }
  get queueSize() {
    return this.updateQueue.length;
  }
}
function createMockSessionReceiver(sessionId) {
  return new MockSessionUpdateReceiver(sessionId);
}
// src/sdk/markdown-parser/detectors.ts
function isHeading(line) {
  const trimmed = line.trimStart();
  return /^#{1,6}\s+/.test(trimmed);
}
function getHeadingLevel(line) {
  const trimmed = line.trimStart();
  const match = trimmed.match(/^(#{1,6})\s+/);
  if (match === null || match[1] === undefined) {
    return 0;
  }
  return match[1].length;
}
function isCodeFence(line) {
  const trimmed = line.trimStart();
  if (!trimmed.startsWith("```")) {
    return { isFence: false };
  }
  const afterBackticks = trimmed.slice(3);
  if (afterBackticks.length > 0 && afterBackticks.trim().length > 0) {
    return {
      isFence: true,
      language: afterBackticks.trim(),
      isOpening: true
    };
  }
  if (afterBackticks.trim().length === 0) {
    return {
      isFence: true,
      language: "",
      isOpening: true
    };
  }
  return {
    isFence: true,
    isOpening: false
  };
}
function isListItem(line) {
  const trimmed = line.trimStart();
  if (/^[-*+]\s/.test(trimmed)) {
    return true;
  }
  if (/^\d+\.\s/.test(trimmed)) {
    return true;
  }
  return false;
}
function getListItemInfo(line) {
  const leadingSpaces = line.match(/^(\s*)/);
  const depth = leadingSpaces !== null && leadingSpaces[1] !== undefined ? Math.floor(leadingSpaces[1].length / 2) : 0;
  const trimmed = line.trimStart();
  const unorderedMatch = trimmed.match(/^[-*+]\s+(.*)$/);
  if (unorderedMatch !== null && unorderedMatch[1] !== undefined) {
    const content = unorderedMatch[1];
    const checkboxMatch = content.match(/^\[([ xX])\]\s+(.*)$/);
    if (checkboxMatch !== null && checkboxMatch[1] !== undefined && checkboxMatch[2] !== undefined) {
      const isChecked = checkboxMatch[1].toLowerCase() === "x";
      return {
        text: checkboxMatch[2],
        depth,
        checked: isChecked,
        isOrdered: false
      };
    }
    return {
      text: content,
      depth,
      isOrdered: false
    };
  }
  const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/);
  if (orderedMatch !== null && orderedMatch[1] !== undefined) {
    const content = orderedMatch[1];
    const checkboxMatch = content.match(/^\[([ xX])\]\s+(.*)$/);
    if (checkboxMatch !== null && checkboxMatch[1] !== undefined && checkboxMatch[2] !== undefined) {
      const isChecked = checkboxMatch[1].toLowerCase() === "x";
      return {
        text: checkboxMatch[2],
        depth,
        checked: isChecked,
        isOrdered: true
      };
    }
    return {
      text: content,
      depth,
      isOrdered: true
    };
  }
  return null;
}
function isBlockquote(line) {
  const trimmed = line.trimStart();
  return trimmed.startsWith(">");
}
function isTableRow(line) {
  const trimmed = line.trim();
  return /\|/.test(trimmed) && trimmed.length > 1;
}
function isTableSeparator(line) {
  const trimmed = line.trim();
  return /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(trimmed);
}

// src/sdk/markdown-parser/parser.ts
class MarkdownParser {
  content;
  options;
  constructor(content, options = {}) {
    this.content = content;
    this.options = {
      includeRawContent: options.includeRawContent ?? true,
      includeLineNumbers: options.includeLineNumbers ?? true
    };
  }
  parse() {
    const lines = this.splitIntoLines();
    const sections = this.buildSections(lines);
    const metadata = this.buildMetadata(sections);
    return {
      version: "1.0",
      rawContent: this.options.includeRawContent ? this.content : "",
      sections,
      metadata
    };
  }
  splitIntoLines() {
    const lines = this.content.split(`
`);
    return lines.map((content, index) => ({
      content,
      number: index + 1
    }));
  }
  buildSections(lines) {
    const sections = [];
    let currentSectionStart = 0;
    let currentHeading = null;
    let sectionIndex = 0;
    for (let i2 = 0;i2 < lines.length; i2++) {
      const line = lines[i2];
      if (line === undefined)
        continue;
      if (isHeading(line.content)) {
        if (i2 > currentSectionStart) {
          const sectionLines = lines.slice(currentSectionStart, i2);
          const content = this.parseContentBlocks(sectionLines, currentHeading ? 1 : 0);
          sections.push({
            index: sectionIndex++,
            heading: currentHeading,
            content
          });
        }
        currentHeading = this.parseHeading(line);
        currentSectionStart = i2;
      }
    }
    if (currentSectionStart < lines.length) {
      const sectionLines = lines.slice(currentSectionStart);
      const content = this.parseContentBlocks(sectionLines, currentHeading ? 1 : 0);
      sections.push({
        index: sectionIndex,
        heading: currentHeading,
        content
      });
    }
    if (sections.length === 0) {
      sections.push({
        index: 0,
        heading: null,
        content: []
      });
    }
    return sections;
  }
  parseContentBlocks(lines, skipLines) {
    const blocks = [];
    const contentLines = lines.slice(skipLines);
    let i2 = 0;
    while (i2 < contentLines.length) {
      const line = contentLines[i2];
      if (line === undefined) {
        i2++;
        continue;
      }
      if (line.content.trim() === "") {
        i2++;
        continue;
      }
      const blockType = this.detectBlockType(line);
      switch (blockType) {
        case "code_fence": {
          const { block, endIndex } = this.parseCodeBlock(contentLines, i2);
          blocks.push(block);
          i2 = endIndex + 1;
          break;
        }
        case "list": {
          const { block, endIndex } = this.parseList(contentLines, i2);
          blocks.push(block);
          i2 = endIndex + 1;
          break;
        }
        case "blockquote": {
          const { block, endIndex } = this.parseBlockquote(contentLines, i2);
          blocks.push(block);
          i2 = endIndex + 1;
          break;
        }
        case "table": {
          const { block, endIndex } = this.parseTable(contentLines, i2);
          blocks.push(block);
          i2 = endIndex + 1;
          break;
        }
        case "paragraph":
        case "empty":
        default: {
          const { block, endIndex } = this.parseParagraph(contentLines, i2);
          blocks.push(block);
          i2 = endIndex + 1;
          break;
        }
      }
    }
    return blocks;
  }
  detectBlockType(line) {
    if (line.content.trim() === "") {
      return "empty";
    }
    if (isHeading(line.content)) {
      return "heading";
    }
    if (isCodeFence(line.content).isFence) {
      return "code_fence";
    }
    if (isListItem(line.content)) {
      return "list";
    }
    if (isBlockquote(line.content)) {
      return "blockquote";
    }
    if (isTableRow(line.content)) {
      return "table";
    }
    return "paragraph";
  }
  parseHeading(line) {
    const level = getHeadingLevel(line.content);
    const text = line.content.trimStart().replace(/^#{1,6}\s+/, "").trim();
    return {
      level,
      text,
      lineNumber: line.number
    };
  }
  parseCodeBlock(lines, startIndex) {
    const startLine = lines[startIndex];
    if (startLine === undefined) {
      throw new Error("Invalid startIndex for code block");
    }
    const fenceInfo = isCodeFence(startLine.content);
    const language = fenceInfo.language ?? "";
    const codeLines = [];
    let endIndex = startIndex + 1;
    let foundClosing = false;
    while (endIndex < lines.length) {
      const line = lines[endIndex];
      if (line === undefined)
        break;
      if (isCodeFence(line.content).isFence) {
        foundClosing = true;
        break;
      }
      codeLines.push(line.content);
      endIndex++;
    }
    if (!foundClosing && endIndex === lines.length) {
      endIndex = lines.length - 1;
    }
    const endLine = endIndex < lines.length ? lines[endIndex] : lines[lines.length - 1];
    if (endLine === undefined) {
      throw new Error("Invalid code block end line index");
    }
    return {
      block: {
        type: "code",
        code: codeLines.join(`
`),
        language,
        lineStart: startLine.number,
        lineEnd: endLine.number
      },
      endIndex
    };
  }
  parseList(lines, startIndex) {
    const startLine = lines[startIndex];
    if (startLine === undefined) {
      throw new Error("Invalid startIndex for list");
    }
    const firstItemInfo = getListItemInfo(startLine.content);
    if (firstItemInfo === null) {
      throw new Error("Expected list item at startIndex");
    }
    const listType = firstItemInfo.isOrdered ? "ordered" : "unordered";
    const items = [];
    let endIndex = startIndex;
    while (endIndex < lines.length) {
      const line = lines[endIndex];
      if (line === undefined)
        break;
      if (line.content.trim() === "") {
        break;
      }
      const itemInfo = getListItemInfo(line.content);
      if (itemInfo === null) {
        break;
      }
      const listItem = {
        text: itemInfo.text,
        depth: itemInfo.depth
      };
      if (itemInfo.checked !== undefined) {
        listItem.checked = itemInfo.checked;
      }
      items.push(listItem);
      endIndex++;
    }
    return {
      block: {
        type: "list",
        listType,
        items,
        lineStart: startLine.number
      },
      endIndex: endIndex - 1
    };
  }
  parseBlockquote(lines, startIndex) {
    const startLine = lines[startIndex];
    if (startLine === undefined) {
      throw new Error("Invalid startIndex for blockquote");
    }
    const quoteLines = [];
    let endIndex = startIndex;
    while (endIndex < lines.length) {
      const line = lines[endIndex];
      if (line === undefined)
        break;
      if (line.content.trim() === "") {
        break;
      }
      if (!isBlockquote(line.content)) {
        break;
      }
      const quoteContent = line.content.trimStart().replace(/^>\s?/, "");
      quoteLines.push({
        content: quoteContent,
        number: line.number
      });
      endIndex++;
    }
    const content = this.parseContentBlocks(quoteLines, 0);
    return {
      block: {
        type: "blockquote",
        content,
        lineStart: startLine.number
      },
      endIndex: endIndex - 1
    };
  }
  parseTable(lines, startIndex) {
    const startLine = lines[startIndex];
    if (startLine === undefined) {
      throw new Error("Invalid startIndex for table");
    }
    const headerCells = this.parseTableRow(startLine.content);
    let endIndex = startIndex + 1;
    const separatorLine = lines[endIndex];
    if (separatorLine === undefined || !isTableSeparator(separatorLine.content)) {
      return this.parseParagraph(lines, startIndex);
    }
    endIndex++;
    const rows = [];
    while (endIndex < lines.length) {
      const line = lines[endIndex];
      if (line === undefined)
        break;
      if (line.content.trim() === "" || !isTableRow(line.content)) {
        break;
      }
      const cells = this.parseTableRow(line.content);
      rows.push(cells);
      endIndex++;
    }
    return {
      block: {
        type: "table",
        headers: headerCells,
        rows,
        lineStart: startLine.number
      },
      endIndex: endIndex - 1
    };
  }
  parseTableRow(line) {
    const trimmed = line.trim();
    const content = trimmed.replace(/^\||\|$/g, "");
    return content.split("|").map((cell) => cell.trim());
  }
  parseParagraph(lines, startIndex) {
    const startLine = lines[startIndex];
    if (startLine === undefined) {
      throw new Error("Invalid startIndex for paragraph");
    }
    const paragraphLines = [];
    let endIndex = startIndex;
    while (endIndex < lines.length) {
      const line = lines[endIndex];
      if (line === undefined)
        break;
      if (line.content.trim() === "") {
        break;
      }
      if (isCodeFence(line.content).isFence || isListItem(line.content) || isBlockquote(line.content) || endIndex > startIndex && isTableRow(line.content)) {
        break;
      }
      paragraphLines.push(line.content);
      endIndex++;
    }
    const endLine = lines[endIndex - 1];
    return {
      block: {
        type: "paragraph",
        text: paragraphLines.join(`
`),
        lineStart: startLine.number,
        lineEnd: endLine !== undefined ? endLine.number : startLine.number
      },
      endIndex: endIndex - 1
    };
  }
  buildMetadata(sections) {
    const headingLevels = new Set;
    let hasCodeBlocks = false;
    let hasLists = false;
    for (const section of sections) {
      if (section.heading !== null) {
        headingLevels.add(section.heading.level);
      }
      for (const block of section.content) {
        if (block.type === "code") {
          hasCodeBlocks = true;
        } else if (block.type === "list") {
          hasLists = true;
        }
      }
    }
    return {
      sectionCount: sections.length,
      headingLevels: Array.from(headingLevels).sort((a2, b2) => a2 - b2),
      hasCodeBlocks,
      hasLists
    };
  }
}
function parseMarkdown(content, options) {
  const parser = new MarkdownParser(content, options);
  return parser.parse();
}
// src/sdk/file-changes/extractor.ts
import path from "path";
var logger7 = createTaggedLogger("file-changes");

class FileChangeExtractor {
  fileSystem;
  constructor(container) {
    this.fileSystem = container.fileSystem;
  }
  async extractFromSession(sessionId, options) {
    const transcriptPath = this.resolveTranscriptPath(sessionId);
    logger7.debug(`Extracting file changes from: ${transcriptPath}`);
    const result = await this.extractFromTranscript(transcriptPath, options);
    const summary = this.buildSummary(sessionId, result.changedFiles, result.projectPath);
    logger7.debug(`Extracted ${summary.totalFilesChanged} files with ${summary.totalChanges} changes`);
    return summary;
  }
  async extractFromTranscript(transcriptPath, options) {
    const content = await this.fileSystem.readFile(transcriptPath);
    const entries = this.parseTranscript(content);
    const fileMap = new Map;
    let projectPath = "";
    for (const entry of entries) {
      if (entry.type === "session" && typeof entry.raw === "object" && entry.raw !== null && "projectPath" in entry.raw && typeof entry.raw.projectPath === "string") {
        projectPath = entry.raw.projectPath;
      }
      const changes = this.parseToolUse(entry, options);
      for (const change of changes) {
        this.addChangeToMap(fileMap, change, projectPath);
      }
      if (entry.type === "file-history-snapshot") {
        this.enrichWithSnapshot(fileMap, entry.raw);
      }
    }
    const filtered = this.applyFilters(Array.from(fileMap.values()), options);
    const finalProjectPath = projectPath !== "" ? projectPath : this.extractProjectPath(transcriptPath);
    return { changedFiles: filtered, projectPath: finalProjectPath };
  }
  parseToolUse(entry, options) {
    if (entry.type !== "assistant") {
      return [];
    }
    const raw = entry.raw;
    if (!("message" in raw) || typeof raw["message"] !== "object" || raw["message"] === null) {
      return [];
    }
    const message = raw["message"];
    if (!("content" in message) || !Array.isArray(message["content"]) || message["content"].length === 0) {
      return [];
    }
    const changes = [];
    for (const content of message["content"]) {
      if (typeof content !== "object" || content === null || !("type" in content) || content.type !== "tool_use") {
        continue;
      }
      const toolUse = content;
      if (!("name" in toolUse) || typeof toolUse["name"] !== "string") {
        continue;
      }
      const toolName = toolUse["name"];
      if (!this.isModifyingTool(toolName)) {
        continue;
      }
      if (!("input" in toolUse) || typeof toolUse["input"] !== "object") {
        continue;
      }
      const input = toolUse["input"];
      const timestamp = entry.timestamp ?? new Date().toISOString();
      const messageUuid = entry.uuid ?? "unknown";
      if (toolName === "MultiEdit" && "edits" in input && Array.isArray(input["edits"])) {
        for (const edit of input["edits"]) {
          if (typeof edit !== "object" || edit === null) {
            continue;
          }
          const editRecord = edit;
          const filePath = typeof editRecord["file_path"] === "string" ? editRecord["file_path"] : null;
          if (filePath !== null) {
            const change = this.createFileChange(toolName, toolUse, editRecord, timestamp, messageUuid, filePath, options);
            changes.push(change);
          }
        }
      } else {
        const filePath = this.extractFilePath(toolName, input);
        if (filePath !== null) {
          const change = this.createFileChange(toolName, toolUse, input, timestamp, messageUuid, filePath, options);
          changes.push(change);
        }
      }
    }
    return changes;
  }
  extractFilePath(toolName, input) {
    switch (toolName) {
      case "Edit":
      case "Write":
        return typeof input["file_path"] === "string" ? input["file_path"] : null;
      case "NotebookEdit":
        return typeof input["notebook_path"] === "string" ? input["notebook_path"] : null;
      case "MultiEdit":
        if ("edits" in input && Array.isArray(input["edits"]) && input["edits"].length > 0) {
          const firstEdit = input["edits"][0];
          if (typeof firstEdit === "object" && firstEdit !== null && "file_path" in firstEdit && typeof firstEdit["file_path"] === "string") {
            return firstEdit["file_path"];
          }
        }
        return null;
      default:
        return null;
    }
  }
  createFileChange(tool, toolUse, input, timestamp, messageUuid, filePath, options) {
    const toolUseId = typeof toolUse["id"] === "string" ? toolUse["id"] : "unknown";
    let oldContent;
    let newContent = "";
    if (options?.includeContent === true) {
      switch (tool) {
        case "Edit":
          oldContent = typeof input["old_string"] === "string" ? input["old_string"] : undefined;
          newContent = typeof input["new_string"] === "string" ? input["new_string"] : "";
          break;
        case "Write":
          oldContent = undefined;
          newContent = typeof input["content"] === "string" ? input["content"] : "";
          break;
        case "MultiEdit":
          oldContent = typeof input["old_string"] === "string" ? input["old_string"] : undefined;
          newContent = typeof input["new_string"] === "string" ? input["new_string"] : "";
          break;
        case "NotebookEdit":
          newContent = typeof input["content"] === "string" ? input["content"] : "";
          break;
      }
    }
    const change = {
      changeId: `${toolUseId}-${filePath}`,
      filePath,
      tool,
      timestamp,
      oldContent,
      newContent,
      toolUseId,
      messageUuid
    };
    return change;
  }
  addChangeToMap(fileMap, change, projectPath) {
    const filePath = change.filePath;
    if (filePath === "") {
      return;
    }
    const normalizedPath = this.normalizePath(filePath, projectPath);
    const existing = fileMap.get(normalizedPath);
    if (existing !== undefined) {
      const updatedChanges = [...existing.changes, change];
      const toolsUsed = this.mergeToolsUsed(existing.toolsUsed, change.tool);
      const updated = {
        ...existing,
        changeCount: updatedChanges.length,
        lastModified: change.timestamp,
        toolsUsed,
        changes: updatedChanges
      };
      fileMap.set(normalizedPath, updated);
    } else {
      const operation = this.determineOperation(change);
      const newFile = {
        path: normalizedPath,
        operation,
        changeCount: 1,
        firstModified: change.timestamp,
        lastModified: change.timestamp,
        toolsUsed: [change.tool],
        changes: [change]
      };
      fileMap.set(normalizedPath, newFile);
    }
  }
  determineOperation(change) {
    switch (change.tool) {
      case "Write":
        return change.oldContent === undefined ? "created" : "modified";
      case "Edit":
      case "MultiEdit":
      case "NotebookEdit":
        return "modified";
      default:
        return "modified";
    }
  }
  mergeToolsUsed(existing, newTool) {
    if (existing.includes(newTool)) {
      return existing;
    }
    return [...existing, newTool];
  }
  enrichWithSnapshot(fileMap, snapshot) {
    if (typeof snapshot !== "object" || snapshot === null || !("snapshot" in snapshot)) {
      return;
    }
    const snapshotData = snapshot["snapshot"];
    if (!("trackedFileBackups" in snapshotData) || typeof snapshotData["trackedFileBackups"] !== "object" || snapshotData["trackedFileBackups"] === null) {
      return;
    }
    const backups = snapshotData["trackedFileBackups"];
    for (const [filePath, backup] of Object.entries(backups)) {
      const existing = fileMap.get(filePath);
      if (existing === undefined) {
        continue;
      }
      if (typeof backup === "object" && backup !== null && "version" in backup && typeof backup.version === "number" && "backupFileName" in backup && typeof backup.backupFileName === "string") {
        const enriched = {
          ...existing,
          version: backup.version,
          backupFileName: backup.backupFileName
        };
        fileMap.set(filePath, enriched);
      }
    }
  }
  buildSummary(sessionId, changedFiles, projectPath) {
    const totalFilesChanged = changedFiles.length;
    const totalChanges = changedFiles.reduce((sum, file) => sum + file.changeCount, 0);
    const byExtension = {};
    for (const file of changedFiles) {
      const ext = path.extname(file.path);
      const key = ext || "(no extension)";
      byExtension[key] = (byExtension[key] ?? 0) + 1;
    }
    const byDirectory = {};
    for (const file of changedFiles) {
      const dir = path.dirname(file.path);
      byDirectory[dir] = (byDirectory[dir] ?? 0) + 1;
    }
    const timestamps = changedFiles.flatMap((file) => file.changes.map((c3) => c3.timestamp));
    const firstTs = timestamps[0];
    const lastTs = timestamps[timestamps.length - 1];
    const sessionStart = firstTs !== undefined ? firstTs : new Date().toISOString();
    const sessionEnd = lastTs !== undefined ? lastTs : new Date().toISOString();
    const summary = {
      sessionId,
      projectPath,
      totalFilesChanged,
      totalChanges,
      files: changedFiles,
      sessionStart,
      sessionEnd,
      byExtension,
      byDirectory
    };
    return summary;
  }
  normalizePath(filePath, projectPath) {
    const absolute = path.isAbsolute(filePath) ? filePath : path.resolve(projectPath, filePath);
    return path.normalize(absolute);
  }
  parseTranscript(content) {
    const lines = content.split(`
`);
    const entries = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === "") {
        continue;
      }
      try {
        const raw = JSON.parse(trimmed);
        const entry = this.parseEntry(raw);
        entries.push(entry);
      } catch {}
    }
    return entries;
  }
  parseEntry(raw) {
    const record = raw;
    const type = typeof record["type"] === "string" ? record["type"] : "unknown";
    const uuid = typeof record["uuid"] === "string" ? record["uuid"] : undefined;
    const timestamp = typeof record["timestamp"] === "string" ? record["timestamp"] : undefined;
    const content = "content" in record ? record["content"] : undefined;
    return {
      type,
      uuid,
      timestamp,
      content,
      raw
    };
  }
  isModifyingTool(toolName) {
    return toolName === "Edit" || toolName === "Write" || toolName === "MultiEdit" || toolName === "NotebookEdit";
  }
  applyFilters(files, options) {
    let filtered = files;
    if (options?.extensions !== undefined && options.extensions.length > 0) {
      const extensions = options.extensions;
      filtered = filtered.filter((file) => {
        const ext = path.extname(file.path);
        return extensions.includes(ext);
      });
    }
    if (options?.directories !== undefined && options.directories.length > 0) {
      const directories = options.directories;
      filtered = filtered.filter((file) => {
        return directories.some((dir) => file.path.startsWith(dir));
      });
    }
    return filtered;
  }
  resolveTranscriptPath(sessionId) {
    if (sessionId.includes("/") || sessionId.endsWith(".jsonl")) {
      return sessionId;
    }
    const homeDir = process.env["HOME"] ?? process.env["USERPROFILE"] ?? "";
    return path.join(homeDir, ".claude", "projects", sessionId, "session.jsonl");
  }
  extractProjectPath(transcriptPath) {
    const dir = path.dirname(transcriptPath);
    return dir;
  }
}

// src/services/file-lock.ts
import * as os from "os";
var DEFAULT_OPTIONS = {
  timeout: 30000,
  retryInterval: 100,
  maxRetries: 10,
  type: "exclusive"
};
var STALE_LOCK_THRESHOLD_MS = 5 * 60 * 1000;

class FileLockServiceImpl {
  fs;
  clock;
  constructor(fs, clock) {
    this.fs = fs;
    this.clock = clock;
  }
  async acquire(resourcePath, options) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const lockPath = `${resourcePath}.lock`;
    const startTime = this.clock.now().getTime();
    let attempt = 0;
    while (attempt < opts.maxRetries) {
      const elapsed = this.clock.now().getTime() - startTime;
      if (elapsed >= opts.timeout) {
        return {
          success: false,
          reason: "timeout",
          message: `Lock acquisition timed out after ${elapsed}ms (${attempt} attempts)`
        };
      }
      const created = await this.createLockFile(lockPath);
      if (created) {
        return {
          success: true,
          handle: this.createLockHandle(lockPath)
        };
      }
      const lockInfo = await this.readLockInfo(lockPath);
      if (lockInfo === null) {
        await this.cleanStaleLock(lockPath);
        continue;
      }
      if (this.isLockStale(lockInfo)) {
        await this.cleanStaleLock(lockPath);
        continue;
      }
      attempt++;
      if (attempt < opts.maxRetries) {
        const delay = Math.min(opts.retryInterval * 2 ** (attempt - 1), opts.timeout - elapsed);
        if (delay > 0) {
          await this.clock.sleep(delay);
        }
      }
    }
    return {
      success: false,
      reason: "locked",
      message: `Lock is held by another process (tried ${attempt} times)`
    };
  }
  async withLock(resourcePath, fn, options) {
    const result = await this.acquire(resourcePath, options);
    if (!result.success) {
      throw new Error(`Failed to acquire lock: ${result.reason} - ${result.message}`);
    }
    try {
      return await fn();
    } finally {
      await result.handle.release();
    }
  }
  async isLocked(resourcePath) {
    const lockPath = `${resourcePath}.lock`;
    const exists = await this.fs.exists(lockPath);
    if (!exists) {
      return false;
    }
    const lockInfo = await this.readLockInfo(lockPath);
    if (lockInfo === null) {
      return false;
    }
    return !this.isLockStale(lockInfo);
  }
  async createLockFile(lockPath) {
    try {
      const exists = await this.fs.exists(lockPath);
      if (exists) {
        return false;
      }
      const lockInfo = {
        pid: process.pid,
        timestamp: this.clock.timestamp(),
        hostname: os.hostname()
      };
      await this.fs.writeFile(lockPath, JSON.stringify(lockInfo, null, 2));
      const verifyInfo = await this.readLockInfo(lockPath);
      if (verifyInfo === null || verifyInfo.pid !== process.pid) {
        return false;
      }
      return true;
    } catch (error) {
      if (this.isNonRetryableError(error)) {
        throw error;
      }
      return false;
    }
  }
  isNonRetryableError(error) {
    if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "string") {
      const code = error.code;
      return ["EACCES", "ENOENT", "EROFS", "EPERM"].includes(code);
    }
    return false;
  }
  async readLockInfo(lockPath) {
    try {
      const content = await this.fs.readFile(lockPath);
      const parsed = JSON.parse(content);
      if (typeof parsed === "object" && parsed !== null && "pid" in parsed && "timestamp" in parsed && "hostname" in parsed && typeof parsed.pid === "number" && typeof parsed.timestamp === "string" && typeof parsed.hostname === "string") {
        return parsed;
      }
      return null;
    } catch (_error) {
      return null;
    }
  }
  isLockStale(lockInfo) {
    try {
      process.kill(lockInfo.pid, 0);
    } catch (_error) {
      return true;
    }
    const lockTime = new Date(lockInfo.timestamp).getTime();
    const currentTime = this.clock.now().getTime();
    const age = currentTime - lockTime;
    return age > STALE_LOCK_THRESHOLD_MS;
  }
  async cleanStaleLock(lockPath) {
    try {
      await this.fs.rm(lockPath, { force: true });
    } catch (_error) {}
  }
  createLockHandle(lockPath) {
    let released = false;
    const fs = this.fs;
    return {
      async release() {
        if (released) {
          return;
        }
        released = true;
        try {
          await fs.rm(lockPath, { force: true });
        } catch (_error) {}
      },
      isHeld() {
        return !released;
      },
      lockPath
    };
  }
}

// src/services/atomic-writer.ts
class AtomicWriter {
  fs;
  constructor(fs) {
    this.fs = fs;
  }
  async write(filePath, content) {
    const tempPath = this.generateTempPath(filePath);
    try {
      const parentDir = this.getParentDir(filePath);
      await this.fs.mkdir(parentDir, { recursive: true });
      await this.fs.writeFile(tempPath, content);
      await this.renameFile(tempPath, filePath);
    } catch (error) {
      await this.cleanupTempFile(tempPath);
      throw error;
    }
  }
  async writeJson(filePath, data) {
    const content = JSON.stringify(data, null, 2);
    await this.write(filePath, content);
  }
  generateTempPath(filePath) {
    const randomHex = Math.random().toString(16).slice(2, 10);
    return `${filePath}.tmp.${randomHex}`;
  }
  getParentDir(filePath) {
    const lastSlash = filePath.lastIndexOf("/");
    if (lastSlash <= 0) {
      return "/";
    }
    return filePath.slice(0, lastSlash);
  }
  async renameFile(from, to) {
    try {
      const fs = await import("fs/promises");
      await fs.rename(from, to);
    } catch (_error) {
      const content = await this.fs.readFile(from);
      await this.fs.writeFile(to, content);
      await this.fs.rm(from, { force: true });
    }
  }
  async cleanupTempFile(tempPath) {
    try {
      await this.fs.rm(tempPath, { force: true });
    } catch {}
  }
}

// src/sdk/file-changes/index-manager.ts
import path3 from "path";

// node_modules/@isaacs/balanced-match/dist/esm/index.js
var balanced = (a2, b2, str) => {
  const ma = a2 instanceof RegExp ? maybeMatch(a2, str) : a2;
  const mb = b2 instanceof RegExp ? maybeMatch(b2, str) : b2;
  const r3 = ma !== null && mb != null && range(ma, mb, str);
  return r3 && {
    start: r3[0],
    end: r3[1],
    pre: str.slice(0, r3[0]),
    body: str.slice(r3[0] + ma.length, r3[1]),
    post: str.slice(r3[1] + mb.length)
  };
};
var maybeMatch = (reg, str) => {
  const m2 = str.match(reg);
  return m2 ? m2[0] : null;
};
var range = (a2, b2, str) => {
  let begs, beg, left, right = undefined, result;
  let ai = str.indexOf(a2);
  let bi = str.indexOf(b2, ai + 1);
  let i2 = ai;
  if (ai >= 0 && bi > 0) {
    if (a2 === b2) {
      return [ai, bi];
    }
    begs = [];
    left = str.length;
    while (i2 >= 0 && !result) {
      if (i2 === ai) {
        begs.push(i2);
        ai = str.indexOf(a2, i2 + 1);
      } else if (begs.length === 1) {
        const r3 = begs.pop();
        if (r3 !== undefined)
          result = [r3, bi];
      } else {
        beg = begs.pop();
        if (beg !== undefined && beg < left) {
          left = beg;
          right = bi;
        }
        bi = str.indexOf(b2, i2 + 1);
      }
      i2 = ai < bi && ai >= 0 ? ai : bi;
    }
    if (begs.length && right !== undefined) {
      result = [left, right];
    }
  }
  return result;
};

// node_modules/@isaacs/brace-expansion/dist/esm/index.js
var escSlash = "\x00SLASH" + Math.random() + "\x00";
var escOpen = "\x00OPEN" + Math.random() + "\x00";
var escClose = "\x00CLOSE" + Math.random() + "\x00";
var escComma = "\x00COMMA" + Math.random() + "\x00";
var escPeriod = "\x00PERIOD" + Math.random() + "\x00";
var escSlashPattern = new RegExp(escSlash, "g");
var escOpenPattern = new RegExp(escOpen, "g");
var escClosePattern = new RegExp(escClose, "g");
var escCommaPattern = new RegExp(escComma, "g");
var escPeriodPattern = new RegExp(escPeriod, "g");
var slashPattern = /\\\\/g;
var openPattern = /\\{/g;
var closePattern = /\\}/g;
var commaPattern = /\\,/g;
var periodPattern = /\\./g;
var EXPANSION_MAX = 1e5;
function numeric(str) {
  return !isNaN(str) ? parseInt(str, 10) : str.charCodeAt(0);
}
function escapeBraces(str) {
  return str.replace(slashPattern, escSlash).replace(openPattern, escOpen).replace(closePattern, escClose).replace(commaPattern, escComma).replace(periodPattern, escPeriod);
}
function unescapeBraces(str) {
  return str.replace(escSlashPattern, "\\").replace(escOpenPattern, "{").replace(escClosePattern, "}").replace(escCommaPattern, ",").replace(escPeriodPattern, ".");
}
function parseCommaParts(str) {
  if (!str) {
    return [""];
  }
  const parts = [];
  const m2 = balanced("{", "}", str);
  if (!m2) {
    return str.split(",");
  }
  const { pre, body, post } = m2;
  const p = pre.split(",");
  p[p.length - 1] += "{" + body + "}";
  const postParts = parseCommaParts(post);
  if (post.length) {
    p[p.length - 1] += postParts.shift();
    p.push.apply(p, postParts);
  }
  parts.push.apply(parts, p);
  return parts;
}
function expand(str, options = {}) {
  if (!str) {
    return [];
  }
  const { max = EXPANSION_MAX } = options;
  if (str.slice(0, 2) === "{}") {
    str = "\\{\\}" + str.slice(2);
  }
  return expand_(escapeBraces(str), max, true).map(unescapeBraces);
}
function embrace(str) {
  return "{" + str + "}";
}
function isPadded(el) {
  return /^-?0\d/.test(el);
}
function lte(i2, y3) {
  return i2 <= y3;
}
function gte(i2, y3) {
  return i2 >= y3;
}
function expand_(str, max, isTop) {
  const expansions = [];
  const m2 = balanced("{", "}", str);
  if (!m2)
    return [str];
  const pre = m2.pre;
  const post = m2.post.length ? expand_(m2.post, max, false) : [""];
  if (/\$$/.test(m2.pre)) {
    for (let k2 = 0;k2 < post.length && k2 < max; k2++) {
      const expansion = pre + "{" + m2.body + "}" + post[k2];
      expansions.push(expansion);
    }
  } else {
    const isNumericSequence = /^-?\d+\.\.-?\d+(?:\.\.-?\d+)?$/.test(m2.body);
    const isAlphaSequence = /^[a-zA-Z]\.\.[a-zA-Z](?:\.\.-?\d+)?$/.test(m2.body);
    const isSequence = isNumericSequence || isAlphaSequence;
    const isOptions = m2.body.indexOf(",") >= 0;
    if (!isSequence && !isOptions) {
      if (m2.post.match(/,(?!,).*\}/)) {
        str = m2.pre + "{" + m2.body + escClose + m2.post;
        return expand_(str, max, true);
      }
      return [str];
    }
    let n2;
    if (isSequence) {
      n2 = m2.body.split(/\.\./);
    } else {
      n2 = parseCommaParts(m2.body);
      if (n2.length === 1 && n2[0] !== undefined) {
        n2 = expand_(n2[0], max, false).map(embrace);
        if (n2.length === 1) {
          return post.map((p) => m2.pre + n2[0] + p);
        }
      }
    }
    let N3;
    if (isSequence && n2[0] !== undefined && n2[1] !== undefined) {
      const x2 = numeric(n2[0]);
      const y3 = numeric(n2[1]);
      const width = Math.max(n2[0].length, n2[1].length);
      let incr = n2.length === 3 && n2[2] !== undefined ? Math.abs(numeric(n2[2])) : 1;
      let test = lte;
      const reverse = y3 < x2;
      if (reverse) {
        incr *= -1;
        test = gte;
      }
      const pad = n2.some(isPadded);
      N3 = [];
      for (let i2 = x2;test(i2, y3); i2 += incr) {
        let c3;
        if (isAlphaSequence) {
          c3 = String.fromCharCode(i2);
          if (c3 === "\\") {
            c3 = "";
          }
        } else {
          c3 = String(i2);
          if (pad) {
            const need = width - c3.length;
            if (need > 0) {
              const z2 = new Array(need + 1).join("0");
              if (i2 < 0) {
                c3 = "-" + z2 + c3.slice(1);
              } else {
                c3 = z2 + c3;
              }
            }
          }
        }
        N3.push(c3);
      }
    } else {
      N3 = [];
      for (let j = 0;j < n2.length; j++) {
        N3.push.apply(N3, expand_(n2[j], max, false));
      }
    }
    for (let j = 0;j < N3.length; j++) {
      for (let k2 = 0;k2 < post.length && expansions.length < max; k2++) {
        const expansion = pre + N3[j] + post[k2];
        if (!isTop || isSequence || expansion) {
          expansions.push(expansion);
        }
      }
    }
  }
  return expansions;
}

// node_modules/minimatch/dist/esm/assert-valid-pattern.js
var MAX_PATTERN_LENGTH = 1024 * 64;
var assertValidPattern = (pattern) => {
  if (typeof pattern !== "string") {
    throw new TypeError("invalid pattern");
  }
  if (pattern.length > MAX_PATTERN_LENGTH) {
    throw new TypeError("pattern is too long");
  }
};

// node_modules/minimatch/dist/esm/brace-expressions.js
var posixClasses = {
  "[:alnum:]": ["\\p{L}\\p{Nl}\\p{Nd}", true],
  "[:alpha:]": ["\\p{L}\\p{Nl}", true],
  "[:ascii:]": ["\\x" + "00-\\x" + "7f", false],
  "[:blank:]": ["\\p{Zs}\\t", true],
  "[:cntrl:]": ["\\p{Cc}", true],
  "[:digit:]": ["\\p{Nd}", true],
  "[:graph:]": ["\\p{Z}\\p{C}", true, true],
  "[:lower:]": ["\\p{Ll}", true],
  "[:print:]": ["\\p{C}", true],
  "[:punct:]": ["\\p{P}", true],
  "[:space:]": ["\\p{Z}\\t\\r\\n\\v\\f", true],
  "[:upper:]": ["\\p{Lu}", true],
  "[:word:]": ["\\p{L}\\p{Nl}\\p{Nd}\\p{Pc}", true],
  "[:xdigit:]": ["A-Fa-f0-9", false]
};
var braceEscape = (s2) => s2.replace(/[[\]\\-]/g, "\\$&");
var regexpEscape = (s2) => s2.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
var rangesToString = (ranges) => ranges.join("");
var parseClass = (glob, position) => {
  const pos = position;
  if (glob.charAt(pos) !== "[") {
    throw new Error("not in a brace expression");
  }
  const ranges = [];
  const negs = [];
  let i2 = pos + 1;
  let sawStart = false;
  let uflag = false;
  let escaping = false;
  let negate = false;
  let endPos = pos;
  let rangeStart = "";
  WHILE:
    while (i2 < glob.length) {
      const c3 = glob.charAt(i2);
      if ((c3 === "!" || c3 === "^") && i2 === pos + 1) {
        negate = true;
        i2++;
        continue;
      }
      if (c3 === "]" && sawStart && !escaping) {
        endPos = i2 + 1;
        break;
      }
      sawStart = true;
      if (c3 === "\\") {
        if (!escaping) {
          escaping = true;
          i2++;
          continue;
        }
      }
      if (c3 === "[" && !escaping) {
        for (const [cls, [unip, u3, neg]] of Object.entries(posixClasses)) {
          if (glob.startsWith(cls, i2)) {
            if (rangeStart) {
              return ["$.", false, glob.length - pos, true];
            }
            i2 += cls.length;
            if (neg)
              negs.push(unip);
            else
              ranges.push(unip);
            uflag = uflag || u3;
            continue WHILE;
          }
        }
      }
      escaping = false;
      if (rangeStart) {
        if (c3 > rangeStart) {
          ranges.push(braceEscape(rangeStart) + "-" + braceEscape(c3));
        } else if (c3 === rangeStart) {
          ranges.push(braceEscape(c3));
        }
        rangeStart = "";
        i2++;
        continue;
      }
      if (glob.startsWith("-]", i2 + 1)) {
        ranges.push(braceEscape(c3 + "-"));
        i2 += 2;
        continue;
      }
      if (glob.startsWith("-", i2 + 1)) {
        rangeStart = c3;
        i2 += 2;
        continue;
      }
      ranges.push(braceEscape(c3));
      i2++;
    }
  if (endPos < i2) {
    return ["", false, 0, false];
  }
  if (!ranges.length && !negs.length) {
    return ["$.", false, glob.length - pos, true];
  }
  if (negs.length === 0 && ranges.length === 1 && /^\\?.$/.test(ranges[0]) && !negate) {
    const r3 = ranges[0].length === 2 ? ranges[0].slice(-1) : ranges[0];
    return [regexpEscape(r3), false, endPos - pos, false];
  }
  const sranges = "[" + (negate ? "^" : "") + rangesToString(ranges) + "]";
  const snegs = "[" + (negate ? "" : "^") + rangesToString(negs) + "]";
  const comb = ranges.length && negs.length ? "(" + sranges + "|" + snegs + ")" : ranges.length ? sranges : snegs;
  return [comb, uflag, endPos - pos, true];
};

// node_modules/minimatch/dist/esm/unescape.js
var unescape = (s2, { windowsPathsNoEscape = false, magicalBraces = true } = {}) => {
  if (magicalBraces) {
    return windowsPathsNoEscape ? s2.replace(/\[([^\/\\])\]/g, "$1") : s2.replace(/((?!\\).|^)\[([^\/\\])\]/g, "$1$2").replace(/\\([^\/])/g, "$1");
  }
  return windowsPathsNoEscape ? s2.replace(/\[([^\/\\{}])\]/g, "$1") : s2.replace(/((?!\\).|^)\[([^\/\\{}])\]/g, "$1$2").replace(/\\([^\/{}])/g, "$1");
};

// node_modules/minimatch/dist/esm/ast.js
var types = new Set(["!", "?", "+", "*", "@"]);
var isExtglobType = (c3) => types.has(c3);
var startNoTraversal = "(?!(?:^|/)\\.\\.?(?:$|/))";
var startNoDot = "(?!\\.)";
var addPatternStart = new Set(["[", "."]);
var justDots = new Set(["..", "."]);
var reSpecials = new Set("().*{}+?[]^$\\!");
var regExpEscape = (s2) => s2.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
var qmark = "[^/]";
var star = qmark + "*?";
var starNoEmpty = qmark + "+?";

class AST {
  type;
  #root;
  #hasMagic;
  #uflag = false;
  #parts = [];
  #parent;
  #parentIndex;
  #negs;
  #filledNegs = false;
  #options;
  #toString;
  #emptyExt = false;
  constructor(type, parent, options = {}) {
    this.type = type;
    if (type)
      this.#hasMagic = true;
    this.#parent = parent;
    this.#root = this.#parent ? this.#parent.#root : this;
    this.#options = this.#root === this ? options : this.#root.#options;
    this.#negs = this.#root === this ? [] : this.#root.#negs;
    if (type === "!" && !this.#root.#filledNegs)
      this.#negs.push(this);
    this.#parentIndex = this.#parent ? this.#parent.#parts.length : 0;
  }
  get hasMagic() {
    if (this.#hasMagic !== undefined)
      return this.#hasMagic;
    for (const p of this.#parts) {
      if (typeof p === "string")
        continue;
      if (p.type || p.hasMagic)
        return this.#hasMagic = true;
    }
    return this.#hasMagic;
  }
  toString() {
    if (this.#toString !== undefined)
      return this.#toString;
    if (!this.type) {
      return this.#toString = this.#parts.map((p) => String(p)).join("");
    } else {
      return this.#toString = this.type + "(" + this.#parts.map((p) => String(p)).join("|") + ")";
    }
  }
  #fillNegs() {
    if (this !== this.#root)
      throw new Error("should only call on root");
    if (this.#filledNegs)
      return this;
    this.toString();
    this.#filledNegs = true;
    let n2;
    while (n2 = this.#negs.pop()) {
      if (n2.type !== "!")
        continue;
      let p = n2;
      let pp = p.#parent;
      while (pp) {
        for (let i2 = p.#parentIndex + 1;!pp.type && i2 < pp.#parts.length; i2++) {
          for (const part of n2.#parts) {
            if (typeof part === "string") {
              throw new Error("string part in extglob AST??");
            }
            part.copyIn(pp.#parts[i2]);
          }
        }
        p = pp;
        pp = p.#parent;
      }
    }
    return this;
  }
  push(...parts) {
    for (const p of parts) {
      if (p === "")
        continue;
      if (typeof p !== "string" && !(p instanceof AST && p.#parent === this)) {
        throw new Error("invalid part: " + p);
      }
      this.#parts.push(p);
    }
  }
  toJSON() {
    const ret = this.type === null ? this.#parts.slice().map((p) => typeof p === "string" ? p : p.toJSON()) : [this.type, ...this.#parts.map((p) => p.toJSON())];
    if (this.isStart() && !this.type)
      ret.unshift([]);
    if (this.isEnd() && (this === this.#root || this.#root.#filledNegs && this.#parent?.type === "!")) {
      ret.push({});
    }
    return ret;
  }
  isStart() {
    if (this.#root === this)
      return true;
    if (!this.#parent?.isStart())
      return false;
    if (this.#parentIndex === 0)
      return true;
    const p = this.#parent;
    for (let i2 = 0;i2 < this.#parentIndex; i2++) {
      const pp = p.#parts[i2];
      if (!(pp instanceof AST && pp.type === "!")) {
        return false;
      }
    }
    return true;
  }
  isEnd() {
    if (this.#root === this)
      return true;
    if (this.#parent?.type === "!")
      return true;
    if (!this.#parent?.isEnd())
      return false;
    if (!this.type)
      return this.#parent?.isEnd();
    const pl = this.#parent ? this.#parent.#parts.length : 0;
    return this.#parentIndex === pl - 1;
  }
  copyIn(part) {
    if (typeof part === "string")
      this.push(part);
    else
      this.push(part.clone(this));
  }
  clone(parent) {
    const c3 = new AST(this.type, parent);
    for (const p of this.#parts) {
      c3.copyIn(p);
    }
    return c3;
  }
  static #parseAST(str, ast, pos, opt) {
    let escaping = false;
    let inBrace = false;
    let braceStart = -1;
    let braceNeg = false;
    if (ast.type === null) {
      let i3 = pos;
      let acc2 = "";
      while (i3 < str.length) {
        const c3 = str.charAt(i3++);
        if (escaping || c3 === "\\") {
          escaping = !escaping;
          acc2 += c3;
          continue;
        }
        if (inBrace) {
          if (i3 === braceStart + 1) {
            if (c3 === "^" || c3 === "!") {
              braceNeg = true;
            }
          } else if (c3 === "]" && !(i3 === braceStart + 2 && braceNeg)) {
            inBrace = false;
          }
          acc2 += c3;
          continue;
        } else if (c3 === "[") {
          inBrace = true;
          braceStart = i3;
          braceNeg = false;
          acc2 += c3;
          continue;
        }
        if (!opt.noext && isExtglobType(c3) && str.charAt(i3) === "(") {
          ast.push(acc2);
          acc2 = "";
          const ext = new AST(c3, ast);
          i3 = AST.#parseAST(str, ext, i3, opt);
          ast.push(ext);
          continue;
        }
        acc2 += c3;
      }
      ast.push(acc2);
      return i3;
    }
    let i2 = pos + 1;
    let part = new AST(null, ast);
    const parts = [];
    let acc = "";
    while (i2 < str.length) {
      const c3 = str.charAt(i2++);
      if (escaping || c3 === "\\") {
        escaping = !escaping;
        acc += c3;
        continue;
      }
      if (inBrace) {
        if (i2 === braceStart + 1) {
          if (c3 === "^" || c3 === "!") {
            braceNeg = true;
          }
        } else if (c3 === "]" && !(i2 === braceStart + 2 && braceNeg)) {
          inBrace = false;
        }
        acc += c3;
        continue;
      } else if (c3 === "[") {
        inBrace = true;
        braceStart = i2;
        braceNeg = false;
        acc += c3;
        continue;
      }
      if (isExtglobType(c3) && str.charAt(i2) === "(") {
        part.push(acc);
        acc = "";
        const ext = new AST(c3, part);
        part.push(ext);
        i2 = AST.#parseAST(str, ext, i2, opt);
        continue;
      }
      if (c3 === "|") {
        part.push(acc);
        acc = "";
        parts.push(part);
        part = new AST(null, ast);
        continue;
      }
      if (c3 === ")") {
        if (acc === "" && ast.#parts.length === 0) {
          ast.#emptyExt = true;
        }
        part.push(acc);
        acc = "";
        ast.push(...parts, part);
        return i2;
      }
      acc += c3;
    }
    ast.type = null;
    ast.#hasMagic = undefined;
    ast.#parts = [str.substring(pos - 1)];
    return i2;
  }
  static fromGlob(pattern, options = {}) {
    const ast = new AST(null, undefined, options);
    AST.#parseAST(pattern, ast, 0, options);
    return ast;
  }
  toMMPattern() {
    if (this !== this.#root)
      return this.#root.toMMPattern();
    const glob = this.toString();
    const [re, body, hasMagic, uflag] = this.toRegExpSource();
    const anyMagic = hasMagic || this.#hasMagic || this.#options.nocase && !this.#options.nocaseMagicOnly && glob.toUpperCase() !== glob.toLowerCase();
    if (!anyMagic) {
      return body;
    }
    const flags = (this.#options.nocase ? "i" : "") + (uflag ? "u" : "");
    return Object.assign(new RegExp(`^${re}$`, flags), {
      _src: re,
      _glob: glob
    });
  }
  get options() {
    return this.#options;
  }
  toRegExpSource(allowDot) {
    const dot = allowDot ?? !!this.#options.dot;
    if (this.#root === this)
      this.#fillNegs();
    if (!this.type) {
      const noEmpty = this.isStart() && this.isEnd() && !this.#parts.some((s2) => typeof s2 !== "string");
      const src2 = this.#parts.map((p) => {
        const [re, _3, hasMagic, uflag] = typeof p === "string" ? AST.#parseGlob(p, this.#hasMagic, noEmpty) : p.toRegExpSource(allowDot);
        this.#hasMagic = this.#hasMagic || hasMagic;
        this.#uflag = this.#uflag || uflag;
        return re;
      }).join("");
      let start2 = "";
      if (this.isStart()) {
        if (typeof this.#parts[0] === "string") {
          const dotTravAllowed = this.#parts.length === 1 && justDots.has(this.#parts[0]);
          if (!dotTravAllowed) {
            const aps = addPatternStart;
            const needNoTrav = dot && aps.has(src2.charAt(0)) || src2.startsWith("\\.") && aps.has(src2.charAt(2)) || src2.startsWith("\\.\\.") && aps.has(src2.charAt(4));
            const needNoDot = !dot && !allowDot && aps.has(src2.charAt(0));
            start2 = needNoTrav ? startNoTraversal : needNoDot ? startNoDot : "";
          }
        }
      }
      let end = "";
      if (this.isEnd() && this.#root.#filledNegs && this.#parent?.type === "!") {
        end = "(?:$|\\/)";
      }
      const final2 = start2 + src2 + end;
      return [
        final2,
        unescape(src2),
        this.#hasMagic = !!this.#hasMagic,
        this.#uflag
      ];
    }
    const repeated = this.type === "*" || this.type === "+";
    const start = this.type === "!" ? "(?:(?!(?:" : "(?:";
    let body = this.#partsToRegExp(dot);
    if (this.isStart() && this.isEnd() && !body && this.type !== "!") {
      const s2 = this.toString();
      this.#parts = [s2];
      this.type = null;
      this.#hasMagic = undefined;
      return [s2, unescape(this.toString()), false, false];
    }
    let bodyDotAllowed = !repeated || allowDot || dot || !startNoDot ? "" : this.#partsToRegExp(true);
    if (bodyDotAllowed === body) {
      bodyDotAllowed = "";
    }
    if (bodyDotAllowed) {
      body = `(?:${body})(?:${bodyDotAllowed})*?`;
    }
    let final = "";
    if (this.type === "!" && this.#emptyExt) {
      final = (this.isStart() && !dot ? startNoDot : "") + starNoEmpty;
    } else {
      const close = this.type === "!" ? "))" + (this.isStart() && !dot && !allowDot ? startNoDot : "") + star + ")" : this.type === "@" ? ")" : this.type === "?" ? ")?" : this.type === "+" && bodyDotAllowed ? ")" : this.type === "*" && bodyDotAllowed ? `)?` : `)${this.type}`;
      final = start + body + close;
    }
    return [
      final,
      unescape(body),
      this.#hasMagic = !!this.#hasMagic,
      this.#uflag
    ];
  }
  #partsToRegExp(dot) {
    return this.#parts.map((p) => {
      if (typeof p === "string") {
        throw new Error("string type in extglob ast??");
      }
      const [re, _3, _hasMagic, uflag] = p.toRegExpSource(dot);
      this.#uflag = this.#uflag || uflag;
      return re;
    }).filter((p) => !(this.isStart() && this.isEnd()) || !!p).join("|");
  }
  static #parseGlob(glob, hasMagic, noEmpty = false) {
    let escaping = false;
    let re = "";
    let uflag = false;
    for (let i2 = 0;i2 < glob.length; i2++) {
      const c3 = glob.charAt(i2);
      if (escaping) {
        escaping = false;
        re += (reSpecials.has(c3) ? "\\" : "") + c3;
        continue;
      }
      if (c3 === "\\") {
        if (i2 === glob.length - 1) {
          re += "\\\\";
        } else {
          escaping = true;
        }
        continue;
      }
      if (c3 === "[") {
        const [src2, needUflag, consumed, magic] = parseClass(glob, i2);
        if (consumed) {
          re += src2;
          uflag = uflag || needUflag;
          i2 += consumed - 1;
          hasMagic = hasMagic || magic;
          continue;
        }
      }
      if (c3 === "*") {
        re += noEmpty && glob === "*" ? starNoEmpty : star;
        hasMagic = true;
        continue;
      }
      if (c3 === "?") {
        re += qmark;
        hasMagic = true;
        continue;
      }
      re += regExpEscape(c3);
    }
    return [re, unescape(glob), !!hasMagic, uflag];
  }
}

// node_modules/minimatch/dist/esm/escape.js
var escape = (s2, { windowsPathsNoEscape = false, magicalBraces = false } = {}) => {
  if (magicalBraces) {
    return windowsPathsNoEscape ? s2.replace(/[?*()[\]{}]/g, "[$&]") : s2.replace(/[?*()[\]\\{}]/g, "\\$&");
  }
  return windowsPathsNoEscape ? s2.replace(/[?*()[\]]/g, "[$&]") : s2.replace(/[?*()[\]\\]/g, "\\$&");
};

// node_modules/minimatch/dist/esm/index.js
var minimatch = (p, pattern, options = {}) => {
  assertValidPattern(pattern);
  if (!options.nocomment && pattern.charAt(0) === "#") {
    return false;
  }
  return new Minimatch(pattern, options).match(p);
};
var starDotExtRE = /^\*+([^+@!?\*\[\(]*)$/;
var starDotExtTest = (ext) => (f3) => !f3.startsWith(".") && f3.endsWith(ext);
var starDotExtTestDot = (ext) => (f3) => f3.endsWith(ext);
var starDotExtTestNocase = (ext) => {
  ext = ext.toLowerCase();
  return (f3) => !f3.startsWith(".") && f3.toLowerCase().endsWith(ext);
};
var starDotExtTestNocaseDot = (ext) => {
  ext = ext.toLowerCase();
  return (f3) => f3.toLowerCase().endsWith(ext);
};
var starDotStarRE = /^\*+\.\*+$/;
var starDotStarTest = (f3) => !f3.startsWith(".") && f3.includes(".");
var starDotStarTestDot = (f3) => f3 !== "." && f3 !== ".." && f3.includes(".");
var dotStarRE = /^\.\*+$/;
var dotStarTest = (f3) => f3 !== "." && f3 !== ".." && f3.startsWith(".");
var starRE = /^\*+$/;
var starTest = (f3) => f3.length !== 0 && !f3.startsWith(".");
var starTestDot = (f3) => f3.length !== 0 && f3 !== "." && f3 !== "..";
var qmarksRE = /^\?+([^+@!?\*\[\(]*)?$/;
var qmarksTestNocase = ([$0, ext = ""]) => {
  const noext = qmarksTestNoExt([$0]);
  if (!ext)
    return noext;
  ext = ext.toLowerCase();
  return (f3) => noext(f3) && f3.toLowerCase().endsWith(ext);
};
var qmarksTestNocaseDot = ([$0, ext = ""]) => {
  const noext = qmarksTestNoExtDot([$0]);
  if (!ext)
    return noext;
  ext = ext.toLowerCase();
  return (f3) => noext(f3) && f3.toLowerCase().endsWith(ext);
};
var qmarksTestDot = ([$0, ext = ""]) => {
  const noext = qmarksTestNoExtDot([$0]);
  return !ext ? noext : (f3) => noext(f3) && f3.endsWith(ext);
};
var qmarksTest = ([$0, ext = ""]) => {
  const noext = qmarksTestNoExt([$0]);
  return !ext ? noext : (f3) => noext(f3) && f3.endsWith(ext);
};
var qmarksTestNoExt = ([$0]) => {
  const len = $0.length;
  return (f3) => f3.length === len && !f3.startsWith(".");
};
var qmarksTestNoExtDot = ([$0]) => {
  const len = $0.length;
  return (f3) => f3.length === len && f3 !== "." && f3 !== "..";
};
var defaultPlatform = typeof process === "object" && process ? typeof process.env === "object" && process.env && process.env.__MINIMATCH_TESTING_PLATFORM__ || process.platform : "posix";
var path2 = {
  win32: { sep: "\\" },
  posix: { sep: "/" }
};
var sep2 = defaultPlatform === "win32" ? path2.win32.sep : path2.posix.sep;
minimatch.sep = sep2;
var GLOBSTAR = Symbol("globstar **");
minimatch.GLOBSTAR = GLOBSTAR;
var qmark2 = "[^/]";
var star2 = qmark2 + "*?";
var twoStarDot = "(?:(?!(?:\\/|^)(?:\\.{1,2})($|\\/)).)*?";
var twoStarNoDot = "(?:(?!(?:\\/|^)\\.).)*?";
var filter = (pattern, options = {}) => (p) => minimatch(p, pattern, options);
minimatch.filter = filter;
var ext = (a2, b2 = {}) => Object.assign({}, a2, b2);
var defaults = (def) => {
  if (!def || typeof def !== "object" || !Object.keys(def).length) {
    return minimatch;
  }
  const orig = minimatch;
  const m2 = (p, pattern, options = {}) => orig(p, pattern, ext(def, options));
  return Object.assign(m2, {
    Minimatch: class Minimatch extends orig.Minimatch {
      constructor(pattern, options = {}) {
        super(pattern, ext(def, options));
      }
      static defaults(options) {
        return orig.defaults(ext(def, options)).Minimatch;
      }
    },
    AST: class AST2 extends orig.AST {
      constructor(type, parent, options = {}) {
        super(type, parent, ext(def, options));
      }
      static fromGlob(pattern, options = {}) {
        return orig.AST.fromGlob(pattern, ext(def, options));
      }
    },
    unescape: (s2, options = {}) => orig.unescape(s2, ext(def, options)),
    escape: (s2, options = {}) => orig.escape(s2, ext(def, options)),
    filter: (pattern, options = {}) => orig.filter(pattern, ext(def, options)),
    defaults: (options) => orig.defaults(ext(def, options)),
    makeRe: (pattern, options = {}) => orig.makeRe(pattern, ext(def, options)),
    braceExpand: (pattern, options = {}) => orig.braceExpand(pattern, ext(def, options)),
    match: (list, pattern, options = {}) => orig.match(list, pattern, ext(def, options)),
    sep: orig.sep,
    GLOBSTAR
  });
};
minimatch.defaults = defaults;
var braceExpand = (pattern, options = {}) => {
  assertValidPattern(pattern);
  if (options.nobrace || !/\{(?:(?!\{).)*\}/.test(pattern)) {
    return [pattern];
  }
  return expand(pattern);
};
minimatch.braceExpand = braceExpand;
var makeRe = (pattern, options = {}) => new Minimatch(pattern, options).makeRe();
minimatch.makeRe = makeRe;
var match = (list, pattern, options = {}) => {
  const mm = new Minimatch(pattern, options);
  list = list.filter((f3) => mm.match(f3));
  if (mm.options.nonull && !list.length) {
    list.push(pattern);
  }
  return list;
};
minimatch.match = match;
var globMagic = /[?*]|[+@!]\(.*?\)|\[|\]/;
var regExpEscape2 = (s2) => s2.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");

class Minimatch {
  options;
  set;
  pattern;
  windowsPathsNoEscape;
  nonegate;
  negate;
  comment;
  empty;
  preserveMultipleSlashes;
  partial;
  globSet;
  globParts;
  nocase;
  isWindows;
  platform;
  windowsNoMagicRoot;
  regexp;
  constructor(pattern, options = {}) {
    assertValidPattern(pattern);
    options = options || {};
    this.options = options;
    this.pattern = pattern;
    this.platform = options.platform || defaultPlatform;
    this.isWindows = this.platform === "win32";
    this.windowsPathsNoEscape = !!options.windowsPathsNoEscape || options.allowWindowsEscape === false;
    if (this.windowsPathsNoEscape) {
      this.pattern = this.pattern.replace(/\\/g, "/");
    }
    this.preserveMultipleSlashes = !!options.preserveMultipleSlashes;
    this.regexp = null;
    this.negate = false;
    this.nonegate = !!options.nonegate;
    this.comment = false;
    this.empty = false;
    this.partial = !!options.partial;
    this.nocase = !!this.options.nocase;
    this.windowsNoMagicRoot = options.windowsNoMagicRoot !== undefined ? options.windowsNoMagicRoot : !!(this.isWindows && this.nocase);
    this.globSet = [];
    this.globParts = [];
    this.set = [];
    this.make();
  }
  hasMagic() {
    if (this.options.magicalBraces && this.set.length > 1) {
      return true;
    }
    for (const pattern of this.set) {
      for (const part of pattern) {
        if (typeof part !== "string")
          return true;
      }
    }
    return false;
  }
  debug(..._3) {}
  make() {
    const pattern = this.pattern;
    const options = this.options;
    if (!options.nocomment && pattern.charAt(0) === "#") {
      this.comment = true;
      return;
    }
    if (!pattern) {
      this.empty = true;
      return;
    }
    this.parseNegate();
    this.globSet = [...new Set(this.braceExpand())];
    if (options.debug) {
      this.debug = (...args) => console.error(...args);
    }
    this.debug(this.pattern, this.globSet);
    const rawGlobParts = this.globSet.map((s2) => this.slashSplit(s2));
    this.globParts = this.preprocess(rawGlobParts);
    this.debug(this.pattern, this.globParts);
    let set = this.globParts.map((s2, _3, __) => {
      if (this.isWindows && this.windowsNoMagicRoot) {
        const isUNC = s2[0] === "" && s2[1] === "" && (s2[2] === "?" || !globMagic.test(s2[2])) && !globMagic.test(s2[3]);
        const isDrive = /^[a-z]:/i.test(s2[0]);
        if (isUNC) {
          return [...s2.slice(0, 4), ...s2.slice(4).map((ss) => this.parse(ss))];
        } else if (isDrive) {
          return [s2[0], ...s2.slice(1).map((ss) => this.parse(ss))];
        }
      }
      return s2.map((ss) => this.parse(ss));
    });
    this.debug(this.pattern, set);
    this.set = set.filter((s2) => s2.indexOf(false) === -1);
    if (this.isWindows) {
      for (let i2 = 0;i2 < this.set.length; i2++) {
        const p = this.set[i2];
        if (p[0] === "" && p[1] === "" && this.globParts[i2][2] === "?" && typeof p[3] === "string" && /^[a-z]:$/i.test(p[3])) {
          p[2] = "?";
        }
      }
    }
    this.debug(this.pattern, this.set);
  }
  preprocess(globParts) {
    if (this.options.noglobstar) {
      for (let i2 = 0;i2 < globParts.length; i2++) {
        for (let j = 0;j < globParts[i2].length; j++) {
          if (globParts[i2][j] === "**") {
            globParts[i2][j] = "*";
          }
        }
      }
    }
    const { optimizationLevel = 1 } = this.options;
    if (optimizationLevel >= 2) {
      globParts = this.firstPhasePreProcess(globParts);
      globParts = this.secondPhasePreProcess(globParts);
    } else if (optimizationLevel >= 1) {
      globParts = this.levelOneOptimize(globParts);
    } else {
      globParts = this.adjascentGlobstarOptimize(globParts);
    }
    return globParts;
  }
  adjascentGlobstarOptimize(globParts) {
    return globParts.map((parts) => {
      let gs = -1;
      while ((gs = parts.indexOf("**", gs + 1)) !== -1) {
        let i2 = gs;
        while (parts[i2 + 1] === "**") {
          i2++;
        }
        if (i2 !== gs) {
          parts.splice(gs, i2 - gs);
        }
      }
      return parts;
    });
  }
  levelOneOptimize(globParts) {
    return globParts.map((parts) => {
      parts = parts.reduce((set, part) => {
        const prev = set[set.length - 1];
        if (part === "**" && prev === "**") {
          return set;
        }
        if (part === "..") {
          if (prev && prev !== ".." && prev !== "." && prev !== "**") {
            set.pop();
            return set;
          }
        }
        set.push(part);
        return set;
      }, []);
      return parts.length === 0 ? [""] : parts;
    });
  }
  levelTwoFileOptimize(parts) {
    if (!Array.isArray(parts)) {
      parts = this.slashSplit(parts);
    }
    let didSomething = false;
    do {
      didSomething = false;
      if (!this.preserveMultipleSlashes) {
        for (let i2 = 1;i2 < parts.length - 1; i2++) {
          const p = parts[i2];
          if (i2 === 1 && p === "" && parts[0] === "")
            continue;
          if (p === "." || p === "") {
            didSomething = true;
            parts.splice(i2, 1);
            i2--;
          }
        }
        if (parts[0] === "." && parts.length === 2 && (parts[1] === "." || parts[1] === "")) {
          didSomething = true;
          parts.pop();
        }
      }
      let dd = 0;
      while ((dd = parts.indexOf("..", dd + 1)) !== -1) {
        const p = parts[dd - 1];
        if (p && p !== "." && p !== ".." && p !== "**") {
          didSomething = true;
          parts.splice(dd - 1, 2);
          dd -= 2;
        }
      }
    } while (didSomething);
    return parts.length === 0 ? [""] : parts;
  }
  firstPhasePreProcess(globParts) {
    let didSomething = false;
    do {
      didSomething = false;
      for (let parts of globParts) {
        let gs = -1;
        while ((gs = parts.indexOf("**", gs + 1)) !== -1) {
          let gss = gs;
          while (parts[gss + 1] === "**") {
            gss++;
          }
          if (gss > gs) {
            parts.splice(gs + 1, gss - gs);
          }
          let next = parts[gs + 1];
          const p = parts[gs + 2];
          const p2 = parts[gs + 3];
          if (next !== "..")
            continue;
          if (!p || p === "." || p === ".." || !p2 || p2 === "." || p2 === "..") {
            continue;
          }
          didSomething = true;
          parts.splice(gs, 1);
          const other = parts.slice(0);
          other[gs] = "**";
          globParts.push(other);
          gs--;
        }
        if (!this.preserveMultipleSlashes) {
          for (let i2 = 1;i2 < parts.length - 1; i2++) {
            const p = parts[i2];
            if (i2 === 1 && p === "" && parts[0] === "")
              continue;
            if (p === "." || p === "") {
              didSomething = true;
              parts.splice(i2, 1);
              i2--;
            }
          }
          if (parts[0] === "." && parts.length === 2 && (parts[1] === "." || parts[1] === "")) {
            didSomething = true;
            parts.pop();
          }
        }
        let dd = 0;
        while ((dd = parts.indexOf("..", dd + 1)) !== -1) {
          const p = parts[dd - 1];
          if (p && p !== "." && p !== ".." && p !== "**") {
            didSomething = true;
            const needDot = dd === 1 && parts[dd + 1] === "**";
            const splin = needDot ? ["."] : [];
            parts.splice(dd - 1, 2, ...splin);
            if (parts.length === 0)
              parts.push("");
            dd -= 2;
          }
        }
      }
    } while (didSomething);
    return globParts;
  }
  secondPhasePreProcess(globParts) {
    for (let i2 = 0;i2 < globParts.length - 1; i2++) {
      for (let j = i2 + 1;j < globParts.length; j++) {
        const matched = this.partsMatch(globParts[i2], globParts[j], !this.preserveMultipleSlashes);
        if (matched) {
          globParts[i2] = [];
          globParts[j] = matched;
          break;
        }
      }
    }
    return globParts.filter((gs) => gs.length);
  }
  partsMatch(a2, b2, emptyGSMatch = false) {
    let ai = 0;
    let bi = 0;
    let result = [];
    let which = "";
    while (ai < a2.length && bi < b2.length) {
      if (a2[ai] === b2[bi]) {
        result.push(which === "b" ? b2[bi] : a2[ai]);
        ai++;
        bi++;
      } else if (emptyGSMatch && a2[ai] === "**" && b2[bi] === a2[ai + 1]) {
        result.push(a2[ai]);
        ai++;
      } else if (emptyGSMatch && b2[bi] === "**" && a2[ai] === b2[bi + 1]) {
        result.push(b2[bi]);
        bi++;
      } else if (a2[ai] === "*" && b2[bi] && (this.options.dot || !b2[bi].startsWith(".")) && b2[bi] !== "**") {
        if (which === "b")
          return false;
        which = "a";
        result.push(a2[ai]);
        ai++;
        bi++;
      } else if (b2[bi] === "*" && a2[ai] && (this.options.dot || !a2[ai].startsWith(".")) && a2[ai] !== "**") {
        if (which === "a")
          return false;
        which = "b";
        result.push(b2[bi]);
        ai++;
        bi++;
      } else {
        return false;
      }
    }
    return a2.length === b2.length && result;
  }
  parseNegate() {
    if (this.nonegate)
      return;
    const pattern = this.pattern;
    let negate = false;
    let negateOffset = 0;
    for (let i2 = 0;i2 < pattern.length && pattern.charAt(i2) === "!"; i2++) {
      negate = !negate;
      negateOffset++;
    }
    if (negateOffset)
      this.pattern = pattern.slice(negateOffset);
    this.negate = negate;
  }
  matchOne(file, pattern, partial = false) {
    const options = this.options;
    if (this.isWindows) {
      const fileDrive = typeof file[0] === "string" && /^[a-z]:$/i.test(file[0]);
      const fileUNC = !fileDrive && file[0] === "" && file[1] === "" && file[2] === "?" && /^[a-z]:$/i.test(file[3]);
      const patternDrive = typeof pattern[0] === "string" && /^[a-z]:$/i.test(pattern[0]);
      const patternUNC = !patternDrive && pattern[0] === "" && pattern[1] === "" && pattern[2] === "?" && typeof pattern[3] === "string" && /^[a-z]:$/i.test(pattern[3]);
      const fdi = fileUNC ? 3 : fileDrive ? 0 : undefined;
      const pdi = patternUNC ? 3 : patternDrive ? 0 : undefined;
      if (typeof fdi === "number" && typeof pdi === "number") {
        const [fd, pd] = [file[fdi], pattern[pdi]];
        if (fd.toLowerCase() === pd.toLowerCase()) {
          pattern[pdi] = fd;
          if (pdi > fdi) {
            pattern = pattern.slice(pdi);
          } else if (fdi > pdi) {
            file = file.slice(fdi);
          }
        }
      }
    }
    const { optimizationLevel = 1 } = this.options;
    if (optimizationLevel >= 2) {
      file = this.levelTwoFileOptimize(file);
    }
    this.debug("matchOne", this, { file, pattern });
    this.debug("matchOne", file.length, pattern.length);
    for (var fi = 0, pi = 0, fl = file.length, pl = pattern.length;fi < fl && pi < pl; fi++, pi++) {
      this.debug("matchOne loop");
      var p = pattern[pi];
      var f3 = file[fi];
      this.debug(pattern, p, f3);
      if (p === false) {
        return false;
      }
      if (p === GLOBSTAR) {
        this.debug("GLOBSTAR", [pattern, p, f3]);
        var fr = fi;
        var pr = pi + 1;
        if (pr === pl) {
          this.debug("** at the end");
          for (;fi < fl; fi++) {
            if (file[fi] === "." || file[fi] === ".." || !options.dot && file[fi].charAt(0) === ".")
              return false;
          }
          return true;
        }
        while (fr < fl) {
          var swallowee = file[fr];
          this.debug(`
globstar while`, file, fr, pattern, pr, swallowee);
          if (this.matchOne(file.slice(fr), pattern.slice(pr), partial)) {
            this.debug("globstar found match!", fr, fl, swallowee);
            return true;
          } else {
            if (swallowee === "." || swallowee === ".." || !options.dot && swallowee.charAt(0) === ".") {
              this.debug("dot detected!", file, fr, pattern, pr);
              break;
            }
            this.debug("globstar swallow a segment, and continue");
            fr++;
          }
        }
        if (partial) {
          this.debug(`
>>> no match, partial?`, file, fr, pattern, pr);
          if (fr === fl) {
            return true;
          }
        }
        return false;
      }
      let hit;
      if (typeof p === "string") {
        hit = f3 === p;
        this.debug("string match", p, f3, hit);
      } else {
        hit = p.test(f3);
        this.debug("pattern match", p, f3, hit);
      }
      if (!hit)
        return false;
    }
    if (fi === fl && pi === pl) {
      return true;
    } else if (fi === fl) {
      return partial;
    } else if (pi === pl) {
      return fi === fl - 1 && file[fi] === "";
    } else {
      throw new Error("wtf?");
    }
  }
  braceExpand() {
    return braceExpand(this.pattern, this.options);
  }
  parse(pattern) {
    assertValidPattern(pattern);
    const options = this.options;
    if (pattern === "**")
      return GLOBSTAR;
    if (pattern === "")
      return "";
    let m2;
    let fastTest = null;
    if (m2 = pattern.match(starRE)) {
      fastTest = options.dot ? starTestDot : starTest;
    } else if (m2 = pattern.match(starDotExtRE)) {
      fastTest = (options.nocase ? options.dot ? starDotExtTestNocaseDot : starDotExtTestNocase : options.dot ? starDotExtTestDot : starDotExtTest)(m2[1]);
    } else if (m2 = pattern.match(qmarksRE)) {
      fastTest = (options.nocase ? options.dot ? qmarksTestNocaseDot : qmarksTestNocase : options.dot ? qmarksTestDot : qmarksTest)(m2);
    } else if (m2 = pattern.match(starDotStarRE)) {
      fastTest = options.dot ? starDotStarTestDot : starDotStarTest;
    } else if (m2 = pattern.match(dotStarRE)) {
      fastTest = dotStarTest;
    }
    const re = AST.fromGlob(pattern, this.options).toMMPattern();
    if (fastTest && typeof re === "object") {
      Reflect.defineProperty(re, "test", { value: fastTest });
    }
    return re;
  }
  makeRe() {
    if (this.regexp || this.regexp === false)
      return this.regexp;
    const set = this.set;
    if (!set.length) {
      this.regexp = false;
      return this.regexp;
    }
    const options = this.options;
    const twoStar = options.noglobstar ? star2 : options.dot ? twoStarDot : twoStarNoDot;
    const flags = new Set(options.nocase ? ["i"] : []);
    let re = set.map((pattern) => {
      const pp = pattern.map((p) => {
        if (p instanceof RegExp) {
          for (const f3 of p.flags.split(""))
            flags.add(f3);
        }
        return typeof p === "string" ? regExpEscape2(p) : p === GLOBSTAR ? GLOBSTAR : p._src;
      });
      pp.forEach((p, i2) => {
        const next = pp[i2 + 1];
        const prev = pp[i2 - 1];
        if (p !== GLOBSTAR || prev === GLOBSTAR) {
          return;
        }
        if (prev === undefined) {
          if (next !== undefined && next !== GLOBSTAR) {
            pp[i2 + 1] = "(?:\\/|" + twoStar + "\\/)?" + next;
          } else {
            pp[i2] = twoStar;
          }
        } else if (next === undefined) {
          pp[i2 - 1] = prev + "(?:\\/|\\/" + twoStar + ")?";
        } else if (next !== GLOBSTAR) {
          pp[i2 - 1] = prev + "(?:\\/|\\/" + twoStar + "\\/)" + next;
          pp[i2 + 1] = GLOBSTAR;
        }
      });
      const filtered = pp.filter((p) => p !== GLOBSTAR);
      if (this.partial && filtered.length >= 1) {
        const prefixes = [];
        for (let i2 = 1;i2 <= filtered.length; i2++) {
          prefixes.push(filtered.slice(0, i2).join("/"));
        }
        return "(?:" + prefixes.join("|") + ")";
      }
      return filtered.join("/");
    }).join("|");
    const [open2, close] = set.length > 1 ? ["(?:", ")"] : ["", ""];
    re = "^" + open2 + re + close + "$";
    if (this.partial) {
      re = "^(?:\\/|" + open2 + re.slice(1, -1) + close + ")$";
    }
    if (this.negate)
      re = "^(?!" + re + ").+$";
    try {
      this.regexp = new RegExp(re, [...flags].join(""));
    } catch (ex) {
      this.regexp = false;
    }
    return this.regexp;
  }
  slashSplit(p) {
    if (this.preserveMultipleSlashes) {
      return p.split("/");
    } else if (this.isWindows && /^\/\/[^\/]+/.test(p)) {
      return ["", ...p.split(/\/+/)];
    } else {
      return p.split(/\/+/);
    }
  }
  match(f3, partial = this.partial) {
    this.debug("match", f3, this.pattern);
    if (this.comment) {
      return false;
    }
    if (this.empty) {
      return f3 === "";
    }
    if (f3 === "/" && partial) {
      return true;
    }
    const options = this.options;
    if (this.isWindows) {
      f3 = f3.split("\\").join("/");
    }
    const ff = this.slashSplit(f3);
    this.debug(this.pattern, "split", ff);
    const set = this.set;
    this.debug(this.pattern, "set", set);
    let filename = ff[ff.length - 1];
    if (!filename) {
      for (let i2 = ff.length - 2;!filename && i2 >= 0; i2--) {
        filename = ff[i2];
      }
    }
    for (let i2 = 0;i2 < set.length; i2++) {
      const pattern = set[i2];
      let file = ff;
      if (options.matchBase && pattern.length === 1) {
        file = [filename];
      }
      const hit = this.matchOne(file, pattern, partial);
      if (hit) {
        if (options.flipNegate) {
          return true;
        }
        return !this.negate;
      }
    }
    if (options.flipNegate) {
      return false;
    }
    return this.negate;
  }
  static defaults(def) {
    return minimatch.defaults(def).Minimatch;
  }
}
minimatch.AST = AST;
minimatch.Minimatch = Minimatch;
minimatch.escape = escape;
minimatch.unescape = unescape;

// src/sdk/file-changes/index-manager.ts
var logger8 = createTaggedLogger("file-index");

class FileChangeIndex {
  fileSystem;
  clock;
  extractor;
  indexPath;
  lockService;
  atomicWriter;
  fileIndex;
  metadata;
  constructor(container) {
    this.fileSystem = container.fileSystem;
    this.clock = container.clock;
    this.extractor = new FileChangeExtractor(container);
    this.lockService = new FileLockServiceImpl(container.fileSystem, container.clock);
    this.atomicWriter = new AtomicWriter(container.fileSystem);
    const homeDir = process.env["HOME"] ?? process.env["USERPROFILE"] ?? "";
    this.indexPath = path3.join(homeDir, ".local", "claude-code-agent", "index", "file-changes.json");
    this.fileIndex = new Map;
    this.metadata = {
      version: 1,
      lastUpdated: this.clock.now().toISOString(),
      totalSessions: 0,
      totalFiles: 0,
      totalChanges: 0
    };
  }
  async buildIndex(projectPath) {
    logger8.info(`Building file change index${projectPath ? ` for ${projectPath}` : ""}...`);
    this.fileIndex.clear();
    const sessions = await this.findSessions(projectPath);
    logger8.debug(`Found ${sessions.length} sessions to index`);
    let totalChanges = 0;
    for (const sessionId of sessions) {
      try {
        const changes = await this.indexSession(sessionId);
        totalChanges += changes;
      } catch (error) {
        logger8.warn(`Failed to index session ${sessionId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    this.metadata = {
      version: 1,
      lastUpdated: this.clock.now().toISOString(),
      totalSessions: sessions.length,
      totalFiles: this.fileIndex.size,
      totalChanges
    };
    await this.saveIndex();
    logger8.info(`Index built: ${this.metadata.totalSessions} sessions, ${this.metadata.totalFiles} files, ${this.metadata.totalChanges} changes`);
    return this.getStats();
  }
  async lookup(filePath) {
    await this.loadIndex();
    const normalized = path3.normalize(filePath);
    const entries = this.fileIndex.get(normalized);
    if (entries === undefined) {
      return [];
    }
    return entries;
  }
  async lookupPattern(pattern) {
    await this.loadIndex();
    const results = new Map;
    for (const [filePath, entries] of this.fileIndex.entries()) {
      if (this.matchGlob(pattern, filePath)) {
        results.set(filePath, entries);
      }
    }
    return results;
  }
  async getStats() {
    await this.loadIndex();
    const indexSize = await this.calculateIndexSize();
    const stats = {
      totalSessions: this.metadata.totalSessions,
      totalFiles: this.metadata.totalFiles,
      totalChanges: this.metadata.totalChanges,
      lastIndexed: this.metadata.lastUpdated,
      indexSize
    };
    return stats;
  }
  async invalidate(projectPath) {
    if (projectPath === undefined) {
      logger8.info("Invalidating entire file change index");
      this.fileIndex.clear();
      this.metadata = {
        version: 1,
        lastUpdated: this.clock.now().toISOString(),
        totalSessions: 0,
        totalFiles: 0,
        totalChanges: 0
      };
      await this.saveIndex();
    } else {
      logger8.info(`Invalidating file change index for project: ${projectPath}`);
      await this.loadIndex();
      for (const [filePath, entries] of this.fileIndex.entries()) {
        const filtered = entries.filter((entry) => entry.projectPath !== projectPath);
        if (filtered.length === 0) {
          this.fileIndex.delete(filePath);
        } else if (filtered.length !== entries.length) {
          this.fileIndex.set(filePath, filtered);
        }
      }
      await this.recalculateMetadata();
      await this.saveIndex();
    }
  }
  async loadIndex() {
    if (this.fileIndex.size > 0) {
      return;
    }
    const exists = await this.fileSystem.exists(this.indexPath);
    if (!exists) {
      logger8.debug("Index file does not exist, starting with empty index");
      return;
    }
    try {
      const content = await this.fileSystem.readFile(this.indexPath);
      const data = JSON.parse(content);
      this.metadata = data.metadata;
      this.fileIndex.clear();
      for (const [filePath, entries] of Object.entries(data.fileIndex)) {
        this.fileIndex.set(filePath, entries);
      }
      logger8.debug(`Loaded index: ${this.metadata.totalFiles} files, ${this.metadata.totalSessions} sessions`);
    } catch (error) {
      logger8.warn(`Failed to load index: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  async saveIndex() {
    const indexDir = path3.dirname(this.indexPath);
    await this.fileSystem.mkdir(indexDir, { recursive: true });
    await this.lockService.withLock(this.indexPath, async () => {
      const fileIndexObject = {};
      for (const [filePath, entries] of this.fileIndex.entries()) {
        fileIndexObject[filePath] = entries;
      }
      const data = {
        metadata: this.metadata,
        fileIndex: fileIndexObject
      };
      await this.atomicWriter.writeJson(this.indexPath, data);
    });
    logger8.debug(`Index saved to ${this.indexPath}`);
  }
  async indexSession(sessionId) {
    const summary = await this.extractor.extractFromSession(sessionId);
    let changeCount = 0;
    for (const file of summary.files) {
      const entry = {
        sessionId,
        projectPath: summary.projectPath,
        gitBranch: undefined,
        changeCount: file.changeCount,
        firstChange: file.firstModified,
        lastChange: file.lastModified,
        toolsUsed: file.toolsUsed
      };
      const existing = this.fileIndex.get(file.path);
      if (existing === undefined) {
        this.fileIndex.set(file.path, [entry]);
      } else {
        this.fileIndex.set(file.path, [...existing, entry]);
      }
      changeCount += file.changeCount;
    }
    return changeCount;
  }
  matchGlob(pattern, filePath) {
    return minimatch(filePath, pattern, { dot: true });
  }
  async findSessions(projectPath) {
    const homeDir = process.env["HOME"] ?? process.env["USERPROFILE"] ?? "";
    const projectsDir = path3.join(homeDir, ".claude", "projects");
    const exists = await this.fileSystem.exists(projectsDir);
    if (!exists) {
      logger8.warn(`Projects directory does not exist: ${projectsDir}`);
      return [];
    }
    const entries = await this.fileSystem.readDir(projectsDir);
    const sessions = [];
    for (const entry of entries) {
      const sessionPath = path3.join(projectsDir, entry);
      const transcriptPath = path3.join(sessionPath, "session.jsonl");
      const transcriptExists = await this.fileSystem.exists(transcriptPath);
      if (!transcriptExists) {
        continue;
      }
      if (projectPath !== undefined) {}
      sessions.push(entry);
    }
    return sessions;
  }
  async calculateIndexSize() {
    const exists = await this.fileSystem.exists(this.indexPath);
    if (!exists) {
      return 0;
    }
    try {
      const stat2 = await this.fileSystem.stat(this.indexPath);
      return stat2.size;
    } catch {
      return 0;
    }
  }
  async recalculateMetadata() {
    const sessionIds = new Set;
    let totalChanges = 0;
    for (const entries of this.fileIndex.values()) {
      for (const entry of entries) {
        sessionIds.add(entry.sessionId);
        totalChanges += entry.changeCount;
      }
    }
    this.metadata = {
      version: 1,
      lastUpdated: this.clock.now().toISOString(),
      totalSessions: sessionIds.size,
      totalFiles: this.fileIndex.size,
      totalChanges
    };
  }
}

// src/sdk/file-changes/service.ts
import path4 from "path";
var logger9 = createTaggedLogger("file-changes-service");

class FileChangeService {
  extractor;
  index;
  constructor(container) {
    this.extractor = new FileChangeExtractor(container);
    this.index = new FileChangeIndex(container);
  }
  async getSessionChangedFiles(sessionId, options) {
    logger9.debug(`Getting changed files for session: ${sessionId}`);
    const extractOptions = options ? {
      includeContent: options.includeContent,
      extensions: options.extensions,
      directories: options.directories
    } : undefined;
    const summary = await this.extractor.extractFromSession(sessionId, extractOptions);
    logger9.debug(`Found ${summary.totalFilesChanged} files with ${summary.totalChanges} changes`);
    return summary;
  }
  async getFileChangesInSession(sessionId, filePath) {
    logger9.debug(`Getting changes for file ${filePath} in session: ${sessionId}`);
    const summary = await this.extractor.extractFromSession(sessionId, {
      includeContent: true
    });
    const normalizedRequest = path4.normalize(filePath);
    const changedFile = summary.files.find((file) => {
      const normalizedFile = path4.normalize(file.path);
      return normalizedFile === normalizedRequest || normalizedFile.endsWith(normalizedRequest) || normalizedRequest.endsWith(path4.basename(file.path));
    });
    if (changedFile === undefined) {
      logger9.debug(`No changes found for file: ${filePath}`);
      return [];
    }
    logger9.debug(`Found ${changedFile.changes.length} changes`);
    return changedFile.changes;
  }
  async findSessionsByFile(filePath, options) {
    logger9.debug(`Finding sessions that modified file: ${filePath}`);
    const normalizedPath = path4.normalize(filePath);
    const indexEntries = await this.index.lookup(normalizedPath);
    if (indexEntries.length === 0) {
      logger9.debug(`No index entries found, file not in index`);
      return {
        path: normalizedPath,
        totalSessions: 0,
        totalChanges: 0,
        sessions: [],
        firstModified: new Date().toISOString(),
        lastModified: new Date().toISOString()
      };
    }
    let filteredEntries = indexEntries;
    if (options?.projectPath !== undefined) {
      filteredEntries = filteredEntries.filter((entry) => entry.projectPath === options.projectPath);
    }
    if (options?.fromDate !== undefined) {
      const fromDate = options.fromDate;
      filteredEntries = filteredEntries.filter((entry) => entry.lastChange >= fromDate);
    }
    if (options?.toDate !== undefined) {
      const toDate = options.toDate;
      filteredEntries = filteredEntries.filter((entry) => entry.firstChange <= toDate);
    }
    const sortedEntries = [...filteredEntries].sort((a2, b2) => b2.lastChange.localeCompare(a2.lastChange));
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? sortedEntries.length;
    const paginatedEntries = sortedEntries.slice(offset, offset + limit);
    const sessions = [];
    for (const entry of paginatedEntries) {
      const changes = options?.includeContent === true ? await this.getFileChangesInSession(entry.sessionId, normalizedPath) : [];
      const match2 = {
        sessionId: entry.sessionId,
        projectPath: entry.projectPath,
        gitBranch: entry.gitBranch,
        changeCount: entry.changeCount,
        firstChange: entry.firstChange,
        lastChange: entry.lastChange,
        toolsUsed: entry.toolsUsed,
        changes
      };
      sessions.push(match2);
    }
    const totalSessions = filteredEntries.length;
    const totalChanges = filteredEntries.reduce((sum, entry) => sum + entry.changeCount, 0);
    const timestamps = sortedEntries.flatMap((entry) => [
      entry.firstChange,
      entry.lastChange
    ]);
    const oldestTs = timestamps[timestamps.length - 1];
    const newestTs = timestamps[0];
    const firstModified = oldestTs !== undefined ? oldestTs : "";
    const lastModified = newestTs !== undefined ? newestTs : "";
    const history = {
      path: normalizedPath,
      totalSessions,
      totalChanges,
      sessions,
      firstModified,
      lastModified
    };
    logger9.debug(`Found ${totalSessions} sessions with ${totalChanges} changes`);
    return history;
  }
  async findSessionsByFilePattern(pattern, options) {
    logger9.debug(`Finding sessions that modified files matching: ${pattern}`);
    const matchingFiles = await this.index.lookupPattern(pattern);
    if (matchingFiles.size === 0) {
      logger9.debug(`No files match pattern: ${pattern}`);
      return [];
    }
    logger9.debug(`Pattern matched ${matchingFiles.size} files`);
    const histories = [];
    for (const [filePath, _entries] of matchingFiles.entries()) {
      const history = await this.findSessionsByFile(filePath, options);
      histories.push(history);
    }
    const sorted = histories.sort((a2, b2) => b2.lastModified.localeCompare(a2.lastModified));
    return sorted;
  }
  async buildIndex(projectPath) {
    logger9.info(`Building file change index${projectPath ? ` for ${projectPath}` : ""}`);
    const stats = await this.index.buildIndex(projectPath);
    logger9.info(`Index built: ${stats.totalSessions} sessions, ${stats.totalFiles} files`);
    return stats;
  }
  async getIndexStats() {
    return this.index.getStats();
  }
}
// src/sdk/bookmarks/search.ts
class BookmarkSearch {
  constructor(container) {
    new SessionReader(container);
  }
  searchMetadata(query, bookmarks) {
    const normalizedQuery = query.toLowerCase().trim();
    if (normalizedQuery === "") {
      return [];
    }
    const results = [];
    for (const bookmark of bookmarks) {
      if (this.matchMetadata(normalizedQuery, bookmark)) {
        const relevance = this.calculateRelevance(bookmark, "metadata", normalizedQuery);
        results.push({
          bookmark,
          matchType: "metadata",
          matchContext: undefined,
          relevanceScore: relevance
        });
      }
    }
    return results.sort((a2, b2) => b2.relevanceScore - a2.relevanceScore);
  }
  async searchContent(query, bookmarks) {
    const normalizedQuery = query.toLowerCase().trim();
    if (normalizedQuery === "") {
      return [];
    }
    const results = [];
    for (const bookmark of bookmarks) {
      const messages = await this.loadBookmarkMessages(bookmark);
      if (messages.length === 0) {
        continue;
      }
      const match2 = this.matchContent(normalizedQuery, messages);
      if (match2.matches) {
        const relevance = this.calculateRelevance(bookmark, "content", normalizedQuery);
        results.push({
          bookmark,
          matchType: "content",
          matchContext: match2.context,
          relevanceScore: relevance
        });
      }
    }
    return results.sort((a2, b2) => b2.relevanceScore - a2.relevanceScore);
  }
  matchMetadata(query, bookmark) {
    if (bookmark.name.toLowerCase().includes(query)) {
      return true;
    }
    if (bookmark.description?.toLowerCase()?.includes(query) ?? false) {
      return true;
    }
    for (const tag of bookmark.tags) {
      if (tag.toLowerCase().includes(query)) {
        return true;
      }
    }
    return false;
  }
  matchContent(query, messages) {
    for (const message of messages) {
      const content = message.content.toLowerCase();
      if (content.includes(query)) {
        const context = this.extractContext(message.content, query, 100);
        return { matches: true, context };
      }
    }
    return { matches: false };
  }
  calculateRelevance(bookmark, matchType, query) {
    const nameLower = bookmark.name.toLowerCase();
    if (nameLower === query) {
      return 1;
    }
    if (nameLower.includes(query)) {
      const startsWithQuery = nameLower.startsWith(query);
      return startsWithQuery ? 0.9 : 0.8;
    }
    const descLower = bookmark.description?.toLowerCase();
    if (descLower?.includes(query) ?? false) {
      const startsWithQuery = (descLower ?? "").startsWith(query);
      return startsWithQuery ? 0.7 : 0.6;
    }
    for (const tag of bookmark.tags) {
      const tagLower = tag.toLowerCase();
      if (tagLower === query) {
        return 0.7;
      }
      if (tagLower.includes(query)) {
        return 0.6;
      }
    }
    if (matchType === "content") {
      return 0.4;
    }
    return 0.3;
  }
  extractContext(content, query, contextLength) {
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const matchIndex = lowerContent.indexOf(lowerQuery);
    if (matchIndex === -1) {
      return content.length > contextLength ? `${content.slice(0, contextLength)}...` : content;
    }
    const halfContext = Math.floor(contextLength / 2);
    let start = Math.max(0, matchIndex - halfContext);
    let end = Math.min(content.length, matchIndex + query.length + halfContext);
    if (start === 0) {
      end = Math.min(content.length, contextLength);
    } else if (end === content.length) {
      start = Math.max(0, content.length - contextLength);
    }
    let snippet = content.slice(start, end);
    if (start > 0) {
      snippet = `...${snippet}`;
    }
    if (end < content.length) {
      snippet = `${snippet}...`;
    }
    return snippet;
  }
  async loadBookmarkMessages(_bookmark) {
    return [];
  }
}

// src/sdk/bookmarks/manager.ts
class BookmarkManager {
  repository;
  bookmarkSearch;
  sessionReader;
  constructor(container, repository, sessionReader) {
    this.repository = repository;
    this.bookmarkSearch = new BookmarkSearch(container);
    this.sessionReader = sessionReader ?? new SessionReader(container);
  }
  async add(options) {
    this.validateBookmark(options);
    const id = this.generateId();
    const now = new Date().toISOString();
    const bookmark = {
      id,
      type: options.type,
      sessionId: options.sessionId,
      messageId: options.messageId,
      messageRange: options.type === "range" && options.fromMessageId !== undefined && options.toMessageId !== undefined ? {
        fromMessageId: options.fromMessageId,
        toMessageId: options.toMessageId
      } : undefined,
      name: options.name,
      description: options.description,
      tags: options.tags ? [...options.tags] : [],
      createdAt: now,
      updatedAt: now
    };
    await this.repository.save(bookmark);
    return bookmark;
  }
  async get(bookmarkId) {
    return this.repository.findById(bookmarkId);
  }
  async getWithContent(bookmarkId) {
    const bookmark = await this.repository.findById(bookmarkId);
    if (bookmark === null) {
      return null;
    }
    const content = await this.loadContent(bookmark);
    return {
      bookmark,
      content
    };
  }
  async list(filter2) {
    return this.repository.list(filter2);
  }
  async update(bookmarkId, updates) {
    const existing = await this.repository.findById(bookmarkId);
    if (existing === null) {
      throw new Error(`Bookmark not found: ${bookmarkId}`);
    }
    const updatedBookmark = {
      ...existing,
      name: updates.name ?? existing.name,
      description: updates.description ?? existing.description,
      tags: updates.tags ? [...updates.tags] : existing.tags,
      updatedAt: new Date().toISOString()
    };
    await this.repository.update(bookmarkId, {
      name: updatedBookmark.name,
      description: updatedBookmark.description,
      tags: updatedBookmark.tags,
      updatedAt: updatedBookmark.updatedAt
    });
    return updatedBookmark;
  }
  async delete(bookmarkId) {
    return this.repository.delete(bookmarkId);
  }
  async search(query, options) {
    const allBookmarks = await this.repository.list({
      limit: options?.limit
    });
    const metadataResults = this.bookmarkSearch.searchMetadata(query, allBookmarks);
    if (options?.metadataOnly === true) {
      return metadataResults;
    }
    const contentResults = await this.bookmarkSearch.searchContent(query, allBookmarks);
    const resultMap = new Map;
    for (const result of metadataResults) {
      resultMap.set(result.bookmark.id, result);
    }
    for (const result of contentResults) {
      const existing = resultMap.get(result.bookmark.id);
      if (existing === undefined || result.relevanceScore > existing.relevanceScore) {
        resultMap.set(result.bookmark.id, result);
      }
    }
    const combinedResults = Array.from(resultMap.values());
    combinedResults.sort((a2, b2) => b2.relevanceScore - a2.relevanceScore);
    if (options?.limit !== undefined && options.limit > 0) {
      return combinedResults.slice(0, options.limit);
    }
    return combinedResults;
  }
  async addTag(bookmarkId, tag) {
    const existing = await this.repository.findById(bookmarkId);
    if (existing === null) {
      throw new Error(`Bookmark not found: ${bookmarkId}`);
    }
    if (existing.tags.includes(tag)) {
      return existing;
    }
    const updatedTags = [...existing.tags, tag];
    return this.update(bookmarkId, { tags: updatedTags });
  }
  async removeTag(bookmarkId, tag) {
    const existing = await this.repository.findById(bookmarkId);
    if (existing === null) {
      throw new Error(`Bookmark not found: ${bookmarkId}`);
    }
    const updatedTags = existing.tags.filter((t2) => t2 !== tag);
    if (updatedTags.length === existing.tags.length) {
      return existing;
    }
    return this.update(bookmarkId, { tags: updatedTags });
  }
  validateBookmark(options) {
    switch (options.type) {
      case "session":
        if (options.messageId !== undefined) {
          throw new Error("Session bookmarks cannot have messageId. Use type 'message' instead.");
        }
        if (options.fromMessageId !== undefined || options.toMessageId !== undefined) {
          throw new Error("Session bookmarks cannot have message range. Use type 'range' instead.");
        }
        break;
      case "message":
        if (options.messageId === undefined) {
          throw new Error("Message bookmarks require messageId");
        }
        if (options.fromMessageId !== undefined || options.toMessageId !== undefined) {
          throw new Error("Message bookmarks cannot have message range. Use type 'range' instead.");
        }
        break;
      case "range":
        if (options.fromMessageId === undefined || options.toMessageId === undefined) {
          throw new Error("Range bookmarks require both fromMessageId and toMessageId");
        }
        if (options.messageId !== undefined) {
          throw new Error("Range bookmarks cannot have messageId. Use type 'message' instead.");
        }
        break;
      default:
        throw new Error(`Unknown bookmark type: ${String(options.type)}`);
    }
    if (options.name.trim() === "") {
      throw new Error("Bookmark name cannot be empty");
    }
  }
  generateId() {
    return crypto.randomUUID();
  }
  async loadContent(_bookmark) {
    this.sessionReader;
    return [];
  }
}
// src/sdk/activity/hook-types.ts
function parseHookInput(json) {
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch (e2) {
    return err(new Error(`Invalid JSON: ${e2 instanceof Error ? e2.message : String(e2)}`));
  }
  if (typeof parsed !== "object" || parsed === null) {
    return err(new Error("Hook input must be an object"));
  }
  const obj = parsed;
  if (typeof obj["session_id"] !== "string") {
    return err(new Error("Missing or invalid session_id field"));
  }
  if (typeof obj["transcript_path"] !== "string") {
    return err(new Error("Missing or invalid transcript_path field"));
  }
  if (typeof obj["cwd"] !== "string") {
    return err(new Error("Missing or invalid cwd field"));
  }
  if (typeof obj["permission_mode"] !== "string") {
    return err(new Error("Missing or invalid permission_mode field"));
  }
  if (typeof obj["hook_event_name"] !== "string") {
    return err(new Error("Missing or invalid hook_event_name field"));
  }
  const hookEventName = obj["hook_event_name"];
  switch (hookEventName) {
    case "UserPromptSubmit": {
      if (obj["prompt"] !== undefined && typeof obj["prompt"] !== "string") {
        return err(new Error("Invalid prompt field: must be string if present"));
      }
      const result = {
        session_id: obj["session_id"],
        transcript_path: obj["transcript_path"],
        cwd: obj["cwd"],
        permission_mode: obj["permission_mode"],
        hook_event_name: "UserPromptSubmit",
        ...typeof obj["prompt"] === "string" ? { prompt: obj["prompt"] } : {}
      };
      return ok(result);
    }
    case "PermissionRequest": {
      if (typeof obj["tool_name"] !== "string") {
        return err(new Error("Missing or invalid tool_name field"));
      }
      if (typeof obj["tool_input"] !== "object" || obj["tool_input"] === null) {
        return err(new Error("Missing or invalid tool_input field"));
      }
      return ok({
        session_id: obj["session_id"],
        transcript_path: obj["transcript_path"],
        cwd: obj["cwd"],
        permission_mode: obj["permission_mode"],
        hook_event_name: "PermissionRequest",
        tool_name: obj["tool_name"],
        tool_input: obj["tool_input"]
      });
    }
    case "Stop": {
      return ok({
        session_id: obj["session_id"],
        transcript_path: obj["transcript_path"],
        cwd: obj["cwd"],
        permission_mode: obj["permission_mode"],
        hook_event_name: "Stop"
      });
    }
    default:
      return err(new Error(`Unknown hook_event_name: ${String(hookEventName)}`));
  }
}
function isUserPromptSubmit(input) {
  return input.hook_event_name === "UserPromptSubmit";
}
function isPermissionRequest(input) {
  return input.hook_event_name === "PermissionRequest";
}
function isStop(input) {
  return input.hook_event_name === "Stop";
}

// src/sdk/activity/transcript-analyzer.ts
import { open as open2, access, constants } from "fs/promises";
var DEFAULT_MAX_READ_BYTES = 10240;
function createTranscriptAnalyzer(options) {
  const maxReadBytes = options?.maxReadBytes ?? DEFAULT_MAX_READ_BYTES;
  return {
    hasAskUserQuestion: async (transcriptPath) => {
      return hasAskUserQuestionImpl(transcriptPath, maxReadBytes);
    }
  };
}
async function hasAskUserQuestionImpl(transcriptPath, maxReadBytes) {
  try {
    await access(transcriptPath, constants.R_OK);
  } catch {
    return false;
  }
  let fileHandle;
  try {
    fileHandle = await open2(transcriptPath, "r");
    const stat2 = await fileHandle.stat();
    const fileSize = stat2.size;
    if (fileSize === 0) {
      return false;
    }
    const bytesToRead = Math.min(fileSize, maxReadBytes);
    const startPosition = fileSize - bytesToRead;
    const buffer = new Uint8Array(bytesToRead);
    await fileHandle.read(buffer, 0, bytesToRead, startPosition);
    const tailContent = Buffer.from(buffer).toString("utf-8");
    const lines = extractCompleteLines(tailContent);
    return detectAskUserQuestion(lines);
  } catch {
    return false;
  } finally {
    if (fileHandle !== undefined) {
      await fileHandle.close().catch(() => {});
    }
  }
}
function extractCompleteLines(content) {
  const lines = content.split(`
`);
  if (lines.length > 0) {
    lines.shift();
  }
  return lines.filter((line) => line.trim() !== "");
}
function detectAskUserQuestion(lines) {
  for (let i2 = lines.length - 1;i2 >= 0; i2--) {
    const line = lines[i2];
    if (line === undefined) {
      continue;
    }
    try {
      const parsed = JSON.parse(line);
      if (typeof parsed !== "object" || parsed === null) {
        continue;
      }
      const obj = parsed;
      if (obj["type"] === "tool_use" && obj["name"] === "AskUserQuestion") {
        return true;
      }
      if (obj["type"] === "assistant" && "message" in obj) {
        const message = obj["message"];
        if (typeof message === "object" && message !== null && "content" in message) {
          const msgObj = message;
          const content = msgObj["content"];
          if (Array.isArray(content)) {
            for (const block of content) {
              if (typeof block === "object" && block !== null && "type" in block && "name" in block) {
                const blockObj = block;
                if (blockObj["type"] === "tool_use" && blockObj["name"] === "AskUserQuestion") {
                  return true;
                }
              }
            }
          }
        }
      }
    } catch {}
  }
  return false;
}

// src/sdk/activity/store.ts
import path5 from "path";

class ActivityStoreImpl {
  fs;
  clock;
  lockService;
  atomicWriter;
  storagePath;
  cleanupHours;
  constructor(fs, clock, options) {
    this.fs = fs;
    this.clock = clock;
    this.lockService = new FileLockServiceImpl(fs, clock);
    this.atomicWriter = new AtomicWriter(fs);
    this.cleanupHours = options?.cleanupHours ?? 24;
    const dataDir = this.resolveDataDir(options?.dataDir);
    this.storagePath = path5.join(dataDir, "activity.json");
  }
  resolveDataDir(override) {
    if (override !== undefined) {
      return override;
    }
    const home = process.env["HOME"] ?? "/tmp";
    const xdgDataHome = process.env["XDG_DATA_HOME"];
    if (xdgDataHome !== undefined) {
      return path5.join(xdgDataHome, "claude-code-agent");
    }
    return path5.join(home, ".local", "share", "claude-code-agent");
  }
  getStoragePath() {
    return this.storagePath;
  }
  async get(sessionId) {
    return this.lockService.withLock(this.storagePath, async () => {
      const store = await this.loadStore();
      const entry = store.sessions[sessionId];
      if (entry === undefined) {
        return null;
      }
      return {
        sessionId,
        status: entry.status,
        projectPath: entry.projectPath,
        lastUpdated: entry.lastUpdated
      };
    });
  }
  async set(entry) {
    await this.lockService.withLock(this.storagePath, async () => {
      const store = await this.loadStore();
      store.sessions[entry.sessionId] = {
        status: entry.status,
        projectPath: entry.projectPath,
        lastUpdated: entry.lastUpdated
      };
      await this.saveStore(store);
    });
  }
  async list(filter2) {
    return this.lockService.withLock(this.storagePath, async () => {
      const store = await this.loadStore();
      const entries = [];
      for (const [sessionId, entry] of Object.entries(store.sessions)) {
        if (filter2?.status !== undefined && entry.status !== filter2.status) {
          continue;
        }
        entries.push({
          sessionId,
          status: entry.status,
          projectPath: entry.projectPath,
          lastUpdated: entry.lastUpdated
        });
      }
      return entries;
    });
  }
  async remove(sessionId) {
    await this.lockService.withLock(this.storagePath, async () => {
      const store = await this.loadStore();
      if (sessionId in store.sessions) {
        const sessions = { ...store.sessions };
        delete sessions[sessionId];
        const updatedStore = {
          version: "1.0",
          sessions
        };
        await this.saveStore(updatedStore);
      }
    });
  }
  async cleanup() {
    return this.lockService.withLock(this.storagePath, async () => {
      const store = await this.loadStore();
      const now = this.clock.now().getTime();
      const thresholdMs = this.cleanupHours * 60 * 60 * 1000;
      const sessions = {};
      let removedCount = 0;
      for (const [sessionId, entry] of Object.entries(store.sessions)) {
        const lastUpdated = new Date(entry.lastUpdated).getTime();
        const age = now - lastUpdated;
        if (age > thresholdMs) {
          removedCount++;
        } else {
          sessions[sessionId] = entry;
        }
      }
      if (removedCount > 0) {
        const updatedStore = {
          version: "1.0",
          sessions
        };
        await this.saveStore(updatedStore);
      }
      return removedCount;
    });
  }
  async loadStore() {
    const exists = await this.fs.exists(this.storagePath);
    if (!exists) {
      return {
        version: "1.0",
        sessions: {}
      };
    }
    try {
      const content = await this.fs.readFile(this.storagePath);
      const parsed = JSON.parse(content);
      if (this.isValidStore(parsed)) {
        return parsed;
      }
      return {
        version: "1.0",
        sessions: {}
      };
    } catch (_error) {
      return {
        version: "1.0",
        sessions: {}
      };
    }
  }
  isValidStore(value) {
    if (typeof value !== "object" || value === null) {
      return false;
    }
    if (!("version" in value) || !("sessions" in value)) {
      return false;
    }
    if (value.version !== "1.0") {
      return false;
    }
    if (typeof value.sessions !== "object" || value.sessions === null) {
      return false;
    }
    return true;
  }
  async saveStore(store) {
    const dir = path5.dirname(this.storagePath);
    await this.fs.mkdir(dir, { recursive: true });
    await this.atomicWriter.writeJson(this.storagePath, store);
  }
}
function createActivityStore(fs, clock, options) {
  return new ActivityStoreImpl(fs, clock, options);
}

// src/sdk/activity/manager.ts
var logger10 = createTaggedLogger("activity-manager");

class ActivityManager {
  store;
  analyzer;
  clock;
  constructor(fs, clock, options) {
    this.clock = clock;
    this.store = createActivityStore(fs, clock, {
      dataDir: options?.dataDir,
      cleanupHours: options?.cleanupHours
    });
    this.analyzer = createTranscriptAnalyzer(options?.transcriptReadBytes !== undefined ? { maxReadBytes: options.transcriptReadBytes } : undefined);
  }
  async updateFromHook() {
    try {
      const json = await this.readStdin();
      const parseResult = parseHookInput(json);
      if (parseResult.isErr()) {
        logger10.error("Failed to parse hook input:", parseResult.error);
        return;
      }
      await this.update(parseResult.value);
    } catch (error) {
      logger10.error("Failed to update activity from hook:", error);
    }
  }
  async readStdin() {
    return new Promise((resolve, reject) => {
      const chunks = [];
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (chunk) => chunks.push(chunk));
      process.stdin.on("end", () => resolve(chunks.join("")));
      process.stdin.on("error", reject);
    });
  }
  async update(input) {
    try {
      const status = await this.determineStatus(input);
      const entry = {
        sessionId: input.session_id,
        status,
        projectPath: input.cwd,
        lastUpdated: this.clock.now().toISOString()
      };
      await this.store.set(entry);
      logger10.debug(`Updated activity for session ${input.session_id}:`, {
        status,
        projectPath: input.cwd
      });
    } catch (error) {
      logger10.error("Failed to update activity:", error);
    }
  }
  async determineStatus(input) {
    if (isUserPromptSubmit(input)) {
      return "working";
    }
    if (isPermissionRequest(input)) {
      return "waiting_user_response";
    }
    if (isStop(input)) {
      const hasAskUserQuestion = await this.analyzer.hasAskUserQuestion(input.transcript_path);
      if (hasAskUserQuestion) {
        return "waiting_user_response";
      }
      return "idle";
    }
    logger10.warn("Unknown hook event type:", input);
    return "idle";
  }
  async getStatus(sessionId) {
    try {
      return await this.store.get(sessionId);
    } catch (error) {
      logger10.error("Failed to get activity status:", error);
      return null;
    }
  }
  async list(filter2) {
    try {
      return await this.store.list(filter2);
    } catch (error) {
      logger10.error("Failed to list activities:", error);
      return [];
    }
  }
  async isWorking(sessionId) {
    const entry = await this.getStatus(sessionId);
    return entry !== null && entry.status === "working";
  }
  async isWaitingForUser(sessionId) {
    const entry = await this.getStatus(sessionId);
    return entry !== null && entry.status === "waiting_user_response";
  }
  async cleanup() {
    try {
      return await this.store.cleanup();
    } catch (error) {
      logger10.error("Failed to cleanup activities:", error);
      return 0;
    }
  }
}
// src/sdk/queue/manager.ts
var import_slugify2 = __toESM(require_slugify(), 1);
var logger11 = createTaggedLogger("queue-manager");

class QueueManager {
  container;
  repository;
  eventEmitter;
  constructor(container, repository, eventEmitter) {
    this.container = container;
    this.repository = repository;
    this.eventEmitter = eventEmitter;
  }
  async createQueue(options) {
    const now = this.container.clock.now();
    const timestamp = now.toISOString();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const timeStr = now.toISOString().slice(11, 19).replace(/:/g, "");
    const slug = this.generateSlug(options.name ?? "queue");
    const queueId = `${dateStr}-${timeStr}-${slug}`;
    const queue2 = {
      id: queueId,
      name: options.name ?? `Queue ${dateStr}-${timeStr}`,
      projectPath: options.projectPath,
      status: "pending",
      currentSessionId: undefined,
      currentIndex: 0,
      commands: [],
      totalCostUsd: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
      startedAt: undefined,
      completedAt: undefined
    };
    await this.repository.save(queue2);
    logger11.info(`Created queue ${queueId}`, {
      name: queue2.name,
      projectPath: queue2.projectPath
    });
    this.eventEmitter.emit("queue_created", {
      type: "queue_created",
      timestamp,
      queueId: queue2.id,
      name: queue2.name,
      projectPath: queue2.projectPath
    });
    return queue2;
  }
  async getQueue(queueId) {
    return this.repository.findById(queueId);
  }
  async listQueues(options) {
    return this.repository.list(options?.filter, options?.sort);
  }
  async persistQueueSnapshot(queue2) {
    await this.repository.save(queue2);
  }
  async deleteQueue(queueId, force = false) {
    const queue2 = await this.repository.findById(queueId);
    if (queue2 === null) {
      return false;
    }
    if (queue2.status === "running" && !force) {
      throw new Error(`Cannot delete running queue ${queueId}. Use force=true to override.`);
    }
    const deleted = await this.repository.delete(queueId);
    if (deleted) {
      logger11.info(`Deleted queue ${queueId}`, { force });
    }
    return deleted;
  }
  async addCommand(queueId, options) {
    const queue2 = await this.repository.findById(queueId);
    if (queue2 === null) {
      throw new Error(`Queue ${queueId} not found`);
    }
    if (queue2.status !== "pending" && queue2.status !== "paused") {
      throw new Error(`Cannot add commands to queue in ${queue2.status} status`);
    }
    const now = this.container.clock.now().toISOString();
    const command = {
      prompt: options.prompt,
      sessionMode: options.sessionMode ?? "continue",
      sessionId: undefined,
      costUsd: undefined,
      startedAt: undefined,
      completedAt: undefined,
      error: undefined
    };
    const position = options.position ?? queue2.commands.length;
    const added = await this.repository.addCommand(queueId, command, position);
    if (!added) {
      throw new Error(`Failed to add command to queue ${queueId}`);
    }
    const updatedQueue = await this.repository.findById(queueId);
    if (updatedQueue === null) {
      throw new Error(`Queue ${queueId} not found after adding command`);
    }
    const addedCommand = updatedQueue.commands[position];
    if (addedCommand === undefined) {
      throw new Error(`Command not found at position ${position}`);
    }
    logger11.info(`Added command to queue ${queueId}`, {
      commandId: addedCommand.id,
      position,
      sessionMode: options.sessionMode ?? "continue"
    });
    this.eventEmitter.emit("command_added", {
      type: "command_added",
      timestamp: now,
      queueId,
      commandId: addedCommand.id,
      commandIndex: position,
      sessionMode: options.sessionMode ?? "continue"
    });
    return addedCommand;
  }
  async updateCommand(queueId, index, updates) {
    const queue2 = await this.repository.findById(queueId);
    if (queue2 === null) {
      throw new Error(`Queue ${queueId} not found`);
    }
    if (queue2.status !== "pending" && queue2.status !== "paused") {
      throw new Error(`Cannot update commands in queue with ${queue2.status} status`);
    }
    const command = queue2.commands[index];
    if (command === undefined) {
      throw new Error(`Command at index ${index} not found in queue ${queueId}`);
    }
    const updated = await this.repository.updateCommand(queueId, index, updates);
    if (!updated) {
      throw new Error(`Failed to update command at index ${index}`);
    }
    const updatedQueue = await this.repository.findById(queueId);
    if (updatedQueue === null) {
      throw new Error(`Queue ${queueId} not found after update`);
    }
    const updatedCommand = updatedQueue.commands[index];
    if (updatedCommand === undefined) {
      throw new Error(`Command at index ${index} not found after update`);
    }
    logger11.info(`Updated command in queue ${queueId}`, {
      commandId: command.id,
      index,
      updates
    });
    this.eventEmitter.emit("command_updated", {
      type: "command_updated",
      timestamp: this.container.clock.now().toISOString(),
      queueId,
      commandId: command.id,
      commandIndex: index
    });
    return updatedCommand;
  }
  async removeCommand(queueId, index) {
    const queue2 = await this.repository.findById(queueId);
    if (queue2 === null) {
      throw new Error(`Queue ${queueId} not found`);
    }
    if (queue2.status !== "pending" && queue2.status !== "paused") {
      throw new Error(`Cannot remove commands from queue with ${queue2.status} status`);
    }
    const command = queue2.commands[index];
    if (command === undefined) {
      throw new Error(`Command at index ${index} not found in queue ${queueId}`);
    }
    const removed = await this.repository.removeCommand(queueId, index);
    if (!removed) {
      throw new Error(`Failed to remove command at index ${index} from queue ${queueId}`);
    }
    logger11.info(`Removed command from queue ${queueId}`, {
      commandId: command.id,
      index
    });
    this.eventEmitter.emit("command_removed", {
      type: "command_removed",
      timestamp: this.container.clock.now().toISOString(),
      queueId,
      commandId: command.id,
      commandIndex: index
    });
  }
  async reorderCommand(queueId, fromIndex, toIndex) {
    const queue2 = await this.repository.findById(queueId);
    if (queue2 === null) {
      throw new Error(`Queue ${queueId} not found`);
    }
    if (queue2.status !== "pending" && queue2.status !== "paused") {
      throw new Error(`Cannot reorder commands in queue with ${queue2.status} status`);
    }
    const command = queue2.commands[fromIndex];
    if (command === undefined) {
      throw new Error(`Command at index ${fromIndex} not found in queue ${queueId}`);
    }
    const reordered = await this.repository.reorderCommand(queueId, fromIndex, toIndex);
    if (!reordered) {
      throw new Error(`Failed to reorder command in queue ${queueId} from ${fromIndex} to ${toIndex}`);
    }
    logger11.info(`Reordered command in queue ${queueId}`, {
      commandId: command.id,
      fromIndex,
      toIndex
    });
    this.eventEmitter.emit("command_reordered", {
      type: "command_reordered",
      timestamp: this.container.clock.now().toISOString(),
      queueId,
      commandId: command.id,
      fromIndex,
      toIndex
    });
  }
  async toggleSessionMode(queueId, index) {
    const queue2 = await this.repository.findById(queueId);
    if (queue2 === null) {
      throw new Error(`Queue ${queueId} not found`);
    }
    if (queue2.status !== "pending" && queue2.status !== "paused") {
      throw new Error(`Cannot toggle session mode in queue with ${queue2.status} status`);
    }
    const command = queue2.commands[index];
    if (command === undefined) {
      throw new Error(`Command at index ${index} not found in queue ${queueId}`);
    }
    const newMode = command.sessionMode === "continue" ? "new" : "continue";
    const updated = await this.updateCommand(queueId, index, {
      sessionMode: newMode
    });
    logger11.info(`Toggled session mode in queue ${queueId}`, {
      commandId: command.id,
      index,
      oldMode: command.sessionMode,
      newMode
    });
    this.eventEmitter.emit("command_mode_changed", {
      type: "command_mode_changed",
      timestamp: this.container.clock.now().toISOString(),
      queueId,
      commandId: command.id,
      commandIndex: index,
      sessionMode: newMode
    });
    return updated;
  }
  generateSlug(name) {
    const cleaned = name.replace(/[^a-z0-9\s]+/gi, "-");
    return import_slugify2.default(cleaned, { lower: true, strict: true }).slice(0, 20).replace(/-+$/g, "");
  }
}
// src/sdk/queue/runner-updaters.ts
class QueueUpdater {
  container;
  repository;
  constructor(container, repository) {
    this.container = container;
    this.repository = repository;
  }
  async updateQueue(queueId, updater) {
    const queue2 = await this.repository.findById(queueId);
    if (queue2 === null) {
      throw new Error(`Queue ${queueId} not found`);
    }
    const updated = {
      ...updater(queue2),
      updatedAt: this.container.clock.now().toISOString()
    };
    await this.repository.save(updated);
  }
  async updateCommand(queueId, commandIndex, updater) {
    await this.updateQueue(queueId, (queue2) => {
      const command = queue2.commands[commandIndex];
      if (command === undefined) {
        throw new Error(`Command at index ${commandIndex} not found`);
      }
      const updatedCommand = updater(command);
      const updatedCommands = [...queue2.commands];
      updatedCommands[commandIndex] = updatedCommand;
      return {
        ...queue2,
        commands: updatedCommands
      };
    });
  }
  async updateQueueStatus(queueId, status) {
    await this.updateQueue(queueId, (queue2) => ({
      ...queue2,
      status,
      ...status === "running" && queue2.startedAt === undefined ? { startedAt: this.container.clock.now().toISOString() } : {},
      ...status === "completed" || status === "failed" || status === "stopped" ? { completedAt: this.container.clock.now().toISOString() } : {}
    }));
  }
  async updateQueueSessionId(queueId, sessionId) {
    await this.updateQueue(queueId, (queue2) => ({
      ...queue2,
      currentSessionId: sessionId
    }));
  }
  async updateQueueCurrentIndex(queueId, index) {
    await this.updateQueue(queueId, (queue2) => ({
      ...queue2,
      currentIndex: index
    }));
  }
  async updateCommandStatus(queueId, commandIndex, status) {
    await this.updateCommand(queueId, commandIndex, (command) => ({
      ...command,
      status,
      ...status === "running" && command.startedAt === undefined ? { startedAt: this.container.clock.now().toISOString() } : {}
    }));
  }
  async updateCommandSessionId(queueId, commandIndex, sessionId) {
    await this.updateCommand(queueId, commandIndex, (command) => ({
      ...command,
      sessionId
    }));
  }
  async updateCommandCost(queueId, commandIndex, costUsd) {
    await this.updateQueue(queueId, (queue2) => {
      const command = queue2.commands[commandIndex];
      if (command === undefined) {
        throw new Error(`Command at index ${commandIndex} not found`);
      }
      const updatedCommand = {
        ...command,
        costUsd
      };
      const updatedCommands = [...queue2.commands];
      updatedCommands[commandIndex] = updatedCommand;
      const totalCostUsd = updatedCommands.reduce((sum, cmd) => sum + (cmd.costUsd ?? 0), 0);
      return {
        ...queue2,
        commands: updatedCommands,
        totalCostUsd
      };
    });
  }
  async updateCommandCompletedAt(queueId, commandIndex) {
    await this.updateCommand(queueId, commandIndex, (command) => ({
      ...command,
      completedAt: this.container.clock.now().toISOString()
    }));
  }
  async updateCommandError(queueId, commandIndex, error) {
    await this.updateCommand(queueId, commandIndex, (command) => ({
      ...command,
      status: "failed",
      error
    }));
  }
}

// src/sdk/queue/runner.ts
var logger12 = createTaggedLogger("queue-runner");

class QueueRunner {
  container;
  manager;
  eventEmitter;
  updater;
  runningProcesses = new Map;
  pauseRequested = new Map;
  stopRequested = new Map;
  constructor(container, repository, manager, eventEmitter) {
    this.container = container;
    this.manager = manager;
    this.eventEmitter = eventEmitter;
    this.updater = new QueueUpdater(container, repository);
  }
  async run(queueId, options) {
    let queue2 = await this.manager.getQueue(queueId);
    if (queue2 === null) {
      throw new Error(`Queue ${queueId} not found`);
    }
    if (queue2.status !== "pending" && queue2.status !== "paused") {
      throw new Error(`Cannot run queue in ${queue2.status} status`);
    }
    this.pauseRequested.delete(queueId);
    this.stopRequested.delete(queueId);
    await this.updater.updateQueueStatus(queueId, "running");
    const startTime = this.container.clock.now().getTime();
    this.eventEmitter.emit("queue_started", {
      type: "queue_started",
      timestamp: this.container.clock.now().toISOString(),
      queueId,
      totalCommands: queue2.commands.length
    });
    logger12.info(`Starting queue ${queueId}`, {
      totalCommands: queue2.commands.length,
      currentIndex: queue2.currentIndex
    });
    let completedCommands = 0;
    let failedCommands = 0;
    let skippedCommands = 0;
    let totalCostUsd = 0;
    for (let i2 = queue2.currentIndex;i2 < queue2.commands.length; i2++) {
      if (this.pauseRequested.get(queueId) === true) {
        logger12.info(`Pause requested for queue ${queueId}`);
        await this.updater.updateQueueStatus(queueId, "paused");
        this.pauseRequested.delete(queueId);
        const endTime2 = this.container.clock.now().getTime();
        const durationMs2 = endTime2 - startTime;
        this.eventEmitter.emit("queue_paused", {
          type: "queue_paused",
          timestamp: this.container.clock.now().toISOString(),
          queueId,
          currentCommandIndex: i2
        });
        return {
          status: "paused",
          completedCommands,
          failedCommands,
          skippedCommands,
          totalCostUsd,
          totalDurationMs: durationMs2
        };
      }
      if (this.stopRequested.get(queueId) === true) {
        logger12.info(`Stop requested for queue ${queueId}`);
        const updatedQueue = await this.manager.getQueue(queueId);
        if (updatedQueue !== null) {
          for (let j = i2;j < updatedQueue.commands.length; j++) {
            const cmd = updatedQueue.commands[j];
            if (cmd !== undefined && cmd.status === "pending") {
              await this.updater.updateCommandStatus(queueId, j, "skipped");
              skippedCommands++;
            }
          }
        }
        await this.updater.updateQueueStatus(queueId, "stopped");
        this.stopRequested.delete(queueId);
        const endTime2 = this.container.clock.now().getTime();
        const durationMs2 = endTime2 - startTime;
        this.eventEmitter.emit("queue_stopped", {
          type: "queue_stopped",
          timestamp: this.container.clock.now().toISOString(),
          queueId,
          completedCommands,
          totalCommands: queue2.commands.length
        });
        return {
          status: "stopped",
          completedCommands,
          failedCommands,
          skippedCommands,
          totalCostUsd,
          totalDurationMs: durationMs2
        };
      }
      const command = queue2.commands[i2];
      if (command === undefined) {
        logger12.warn(`Command at index ${i2} not found in queue ${queueId}`);
        continue;
      }
      if (command.status !== "pending") {
        if (command.status === "completed") {
          completedCommands++;
          totalCostUsd += command.costUsd ?? 0;
        } else if (command.status === "failed") {
          failedCommands++;
        } else if (command.status === "skipped") {
          skippedCommands++;
        }
        continue;
      }
      try {
        options?.onCommandStart?.(command);
        await this.executeCommand(queueId, i2, queue2);
        const updatedQueue = await this.manager.getQueue(queueId);
        if (updatedQueue === null) {
          throw new Error(`Queue ${queueId} not found after command execution`);
        }
        const updatedCommand = updatedQueue.commands[i2];
        if (updatedCommand === undefined) {
          throw new Error(`Command at index ${i2} not found after execution`);
        }
        if (updatedCommand.status === "completed") {
          completedCommands++;
          totalCostUsd += updatedCommand.costUsd ?? 0;
          options?.onCommandComplete?.(updatedCommand);
        } else if (updatedCommand.status === "failed") {
          failedCommands++;
          const error = updatedCommand.error ?? "Unknown error";
          options?.onCommandFail?.(updatedCommand, error);
          const freshQueue = await this.manager.getQueue(queueId);
          if (freshQueue === null) {
            throw new Error(`Queue ${queueId} not found`);
          }
          const stopOnError = true;
          if (stopOnError) {
            logger12.info(`Stopping queue ${queueId} due to command failure`);
            await this.updater.updateQueueStatus(queueId, "failed");
            for (let j = i2 + 1;j < freshQueue.commands.length; j++) {
              await this.updater.updateCommandStatus(queueId, j, "skipped");
              skippedCommands++;
            }
            const endTime2 = this.container.clock.now().getTime();
            const durationMs2 = endTime2 - startTime;
            this.eventEmitter.emit("queue_failed", {
              type: "queue_failed",
              timestamp: this.container.clock.now().toISOString(),
              queueId,
              failedCommandIndex: i2,
              error
            });
            return {
              status: "failed",
              completedCommands,
              failedCommands,
              skippedCommands,
              totalCostUsd,
              totalDurationMs: durationMs2
            };
          }
        }
        await this.updater.updateQueueCurrentIndex(queueId, i2 + 1);
        const nextQueue = await this.manager.getQueue(queueId);
        if (nextQueue !== null) {
          queue2 = nextQueue;
        }
      } catch (error) {
        logger12.error(`Error executing command in queue ${queueId}:`, error);
        failedCommands++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        await this.updater.updateCommandError(queueId, i2, errorMessage);
        options?.onCommandFail?.(command, errorMessage);
        await this.updater.updateQueueStatus(queueId, "failed");
        for (let j = i2 + 1;j < queue2.commands.length; j++) {
          await this.updater.updateCommandStatus(queueId, j, "skipped");
          skippedCommands++;
        }
        const endTime2 = this.container.clock.now().getTime();
        const durationMs2 = endTime2 - startTime;
        this.eventEmitter.emit("queue_failed", {
          type: "queue_failed",
          timestamp: this.container.clock.now().toISOString(),
          queueId,
          failedCommandIndex: i2,
          error: errorMessage
        });
        return {
          status: "failed",
          completedCommands,
          failedCommands,
          skippedCommands,
          totalCostUsd,
          totalDurationMs: durationMs2
        };
      }
    }
    await this.updater.updateQueueStatus(queueId, "completed");
    const endTime = this.container.clock.now().getTime();
    const durationMs = endTime - startTime;
    this.eventEmitter.emit("queue_completed", {
      type: "queue_completed",
      timestamp: this.container.clock.now().toISOString(),
      queueId,
      completedCommands,
      failedCommands,
      totalCostUsd,
      totalDurationMs: durationMs
    });
    logger12.info(`Queue ${queueId} completed`, {
      completedCommands,
      failedCommands,
      totalCostUsd,
      durationMs
    });
    return {
      status: "completed",
      completedCommands,
      failedCommands,
      skippedCommands,
      totalCostUsd,
      totalDurationMs: durationMs
    };
  }
  async pause(queueId) {
    const queue2 = await this.manager.getQueue(queueId);
    if (queue2 === null) {
      throw new Error(`Queue ${queueId} not found`);
    }
    if (queue2.status !== "running") {
      throw new Error(`Cannot pause queue in ${queue2.status} status`);
    }
    this.pauseRequested.set(queueId, true);
    const process2 = this.runningProcesses.get(queueId);
    if (process2 !== undefined) {
      logger12.info(`Sending SIGTERM to process ${process2.pid} for queue ${queueId}`);
      process2.kill("SIGTERM");
      this.runningProcesses.delete(queueId);
    }
    logger12.info(`Pause requested for queue ${queueId}`);
  }
  async resume(queueId) {
    const queue2 = await this.manager.getQueue(queueId);
    if (queue2 === null) {
      throw new Error(`Queue ${queueId} not found`);
    }
    if (queue2.status !== "paused") {
      throw new Error(`Cannot resume queue in ${queue2.status} status`);
    }
    logger12.info(`Resuming queue ${queueId} from command ${queue2.currentIndex}`);
    this.eventEmitter.emit("queue_resumed", {
      type: "queue_resumed",
      timestamp: this.container.clock.now().toISOString(),
      queueId,
      fromCommandIndex: queue2.currentIndex
    });
    return this.run(queueId);
  }
  async stop(queueId) {
    const queue2 = await this.manager.getQueue(queueId);
    if (queue2 === null) {
      throw new Error(`Queue ${queueId} not found`);
    }
    if (queue2.status !== "running" && queue2.status !== "paused") {
      throw new Error(`Cannot stop queue in ${queue2.status} status`);
    }
    this.stopRequested.set(queueId, true);
    const process2 = this.runningProcesses.get(queueId);
    if (process2 !== undefined) {
      logger12.info(`Sending SIGTERM to process ${process2.pid} for queue ${queueId}`);
      process2.kill("SIGTERM");
      this.runningProcesses.delete(queueId);
    }
    logger12.info(`Stop requested for queue ${queueId}`);
  }
  async executeCommand(queueId, commandIndex, queue2) {
    const command = queue2.commands[commandIndex];
    if (command === undefined) {
      throw new Error(`Command at index ${commandIndex} not found`);
    }
    const shouldStartNewSession = this.shouldStartNewSession(queue2, commandIndex);
    await this.updater.updateCommandStatus(queueId, commandIndex, "running");
    const commandStartTime = this.container.clock.now().getTime();
    this.eventEmitter.emit("command_started", {
      type: "command_started",
      timestamp: this.container.clock.now().toISOString(),
      queueId,
      commandId: command.id,
      commandIndex,
      prompt: command.prompt,
      sessionMode: command.sessionMode,
      isNewSession: shouldStartNewSession
    });
    logger12.info(`Executing command ${commandIndex} in queue ${queueId}`, {
      commandId: command.id,
      sessionMode: command.sessionMode,
      isNewSession: shouldStartNewSession
    });
    const sessionId = shouldStartNewSession ? crypto.randomUUID() : queue2.currentSessionId ?? crypto.randomUUID();
    const args = [];
    if (queue2.additionalArgs !== undefined && queue2.additionalArgs.length > 0) {
      assertNoPrintModeArgs(queue2.additionalArgs, "queue additionalArgs");
      args.push(...queue2.additionalArgs);
    }
    if (!shouldStartNewSession) {
      args.push("--resume", sessionId);
    } else {
      args.push("--session-id", sessionId);
    }
    args.push(command.prompt);
    const process2 = this.container.processManager.spawn("claude", args, {
      cwd: queue2.projectPath
    });
    this.runningProcesses.set(queueId, process2);
    drainProcessOutput(queueId, process2);
    try {
      if (shouldStartNewSession) {
        await this.updater.updateQueueSessionId(queueId, sessionId);
      }
      await this.updater.updateCommandSessionId(queueId, commandIndex, sessionId);
      const exitCode = await process2.exitCode;
      this.runningProcesses.delete(queueId);
      const commandEndTime = this.container.clock.now().getTime();
      const durationMs = commandEndTime - commandStartTime;
      if (exitCode === 0) {
        await this.updater.updateCommandStatus(queueId, commandIndex, "completed");
        await this.updater.updateCommandCompletedAt(queueId, commandIndex);
        const costUsd = 0;
        await this.updater.updateCommandCost(queueId, commandIndex, costUsd);
        this.eventEmitter.emit("command_completed", {
          type: "command_completed",
          timestamp: this.container.clock.now().toISOString(),
          queueId,
          commandId: command.id,
          commandIndex,
          costUsd,
          claudeSessionId: sessionId,
          durationMs
        });
        logger12.info(`Command ${commandIndex} completed in queue ${queueId}`, {
          commandId: command.id,
          durationMs
        });
      } else {
        const errorMessage = `Claude Code exited with code ${exitCode ?? "unknown"}`;
        await this.updater.updateCommandStatus(queueId, commandIndex, "failed");
        await this.updater.updateCommandError(queueId, commandIndex, errorMessage);
        this.eventEmitter.emit("command_failed", {
          type: "command_failed",
          timestamp: this.container.clock.now().toISOString(),
          queueId,
          commandId: command.id,
          commandIndex,
          error: errorMessage,
          durationMs
        });
        logger12.error(`Command ${commandIndex} failed in queue ${queueId}`, {
          commandId: command.id,
          exitCode,
          durationMs
        });
      }
    } catch (error) {
      this.runningProcesses.delete(queueId);
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.updater.updateCommandStatus(queueId, commandIndex, "failed");
      await this.updater.updateCommandError(queueId, commandIndex, errorMessage);
      const commandEndTime = this.container.clock.now().getTime();
      const durationMs = commandEndTime - commandStartTime;
      this.eventEmitter.emit("command_failed", {
        type: "command_failed",
        timestamp: this.container.clock.now().toISOString(),
        queueId,
        commandId: command.id,
        commandIndex,
        error: errorMessage,
        durationMs
      });
      throw error;
    }
  }
  shouldStartNewSession(queue2, commandIndex) {
    if (commandIndex === 0) {
      return true;
    }
    const command = queue2.commands[commandIndex];
    if (command === undefined) {
      return false;
    }
    return command.sessionMode === "new";
  }
}
async function drainProcessOutput(queueId, process2) {
  await Promise.all([
    drainLines2(process2.stdout, (line) => {
      logger12.debug(`Queue ${queueId} stdout: ${line}`);
    }),
    drainLines2(process2.stderr, (line) => {
      logger12.warn(`Queue ${queueId} stderr: ${line}`);
    })
  ]);
}
async function drainLines2(lines, onLine) {
  try {
    for await (const line of lines) {
      onLine(line);
    }
  } catch {}
}
// src/sdk/queue/recovery.ts
var logger13 = createTaggedLogger("queue-recovery");
// src/sdk/tool-versions.ts
var VERSION_COMMANDS = [
  { key: "claude", command: "claude", args: ["--version"] },
  { key: "codex", command: "codex", args: ["--version"] },
  { key: "git", command: "git", args: ["--version"] }
];
var SEMVER_PATTERN = /\b\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?\b/;
function parseVersionFromOutput(output) {
  const match2 = output.match(SEMVER_PATTERN);
  if (match2 === null) {
    return null;
  }
  return match2[0] ?? null;
}
async function collectLines(stream) {
  const lines = [];
  for await (const line of stream) {
    lines.push(line);
  }
  return lines;
}
async function runCommandProbe(processManager, command, args) {
  const process2 = processManager.spawn(command, args);
  const [stdoutLines, stderrLines, exitCode] = await Promise.all([
    collectLines(process2.stdout),
    collectLines(process2.stderr),
    process2.exitCode
  ]);
  return {
    stdoutText: stdoutLines.join(`
`).trim(),
    stderrText: stderrLines.join(`
`).trim(),
    exitCode
  };
}
function formatProbeFailure(command, probeResult) {
  if (probeResult.stderrText.length > 0) {
    return probeResult.stderrText;
  }
  if (probeResult.stdoutText.length > 0) {
    return probeResult.stdoutText;
  }
  return `${command} exited with code ${probeResult.exitCode}`;
}
function getProbeOutputText(probeResult) {
  if (probeResult.stdoutText.length > 0) {
    return probeResult.stdoutText;
  }
  return probeResult.stderrText;
}
function getShellProgramName(shellPath) {
  const normalized = shellPath.replaceAll("\\", "/");
  const segments = normalized.split("/");
  return segments.at(-1)?.toLowerCase() ?? normalized.toLowerCase();
}
function getShellWrappedCommand(command, args) {
  if (command !== "claude") {
    return null;
  }
  const invocation = [command, ...args].join(" ");
  if (process.platform === "win32") {
    return {
      command: process.env["ComSpec"]?.trim() || "cmd.exe",
      args: ["/d", "/s", "/c", invocation]
    };
  }
  const shellPath = process.env["SHELL"]?.trim() || "sh";
  const shellName = getShellProgramName(shellPath);
  const shellArgs = shellName === "bash" || shellName === "zsh" ? ["-lc", invocation] : ["-c", invocation];
  return {
    command: shellPath,
    args: shellArgs
  };
}
async function runShellWrappedFallback(processManager, command, args) {
  const shellCommand = getShellWrappedCommand(command, args);
  if (shellCommand === null) {
    return null;
  }
  try {
    const fallbackProbe = await runCommandProbe(processManager, shellCommand.command, shellCommand.args);
    if (fallbackProbe.exitCode !== 0) {
      return {
        version: null,
        error: `${command} produced empty output; shell fallback failed: ${formatProbeFailure(shellCommand.command, fallbackProbe)}`
      };
    }
    const fallbackOutput = getProbeOutputText(fallbackProbe);
    if (fallbackOutput.length === 0) {
      return {
        version: null,
        error: `${command} produced empty output; shell fallback also produced empty output`
      };
    }
    const version = parseVersionFromOutput(fallbackOutput);
    if (version === null) {
      return {
        version: null,
        error: `${command} version output is malformed: ${fallbackOutput}`
      };
    }
    return { version, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      version: null,
      error: `${command} produced empty output; shell fallback failed: ${message}`
    };
  }
}
async function detectCommandVersion(processManager, command, args) {
  try {
    const probeResult = await runCommandProbe(processManager, command, args);
    if (probeResult.exitCode !== 0) {
      return {
        version: null,
        error: formatProbeFailure(command, probeResult)
      };
    }
    const output = getProbeOutputText(probeResult);
    if (output.length === 0) {
      const fallbackResult = await runShellWrappedFallback(processManager, command, args);
      if (fallbackResult !== null) {
        return fallbackResult;
      }
      return { version: null, error: `${command} produced empty output` };
    }
    const version = parseVersionFromOutput(output);
    if (version === null) {
      return {
        version: null,
        error: `${command} version output is malformed: ${output}`
      };
    }
    return { version, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { version: null, error: message };
  }
}
async function getToolVersions(processManager) {
  const results = await Promise.all(VERSION_COMMANDS.map((versionCommand) => detectCommandVersion(processManager, versionCommand.command, versionCommand.args)));
  return {
    claude: results[0] ?? { version: null, error: "Version check failed" },
    codex: results[1] ?? { version: null, error: "Version check failed" },
    git: results[2] ?? { version: null, error: "Version check failed" }
  };
}
// src/interfaces/bun-process-manager.ts
class BunManagedProcess {
  pid;
  subprocess;
  constructor(subprocess) {
    this.subprocess = subprocess;
    this.pid = subprocess.pid;
  }
  get stdout() {
    const stdout2 = this.subprocess.stdout;
    if (stdout2 === null) {
      return emptyAsyncIterable();
    }
    return createLineIterator(stdout2);
  }
  get stderr() {
    const stderr = this.subprocess.stderr;
    if (stderr === null || stderr === undefined) {
      return emptyAsyncIterable();
    }
    return createLineIterator(stderr);
  }
  get exitCode() {
    return this.subprocess.exited;
  }
  kill(signal) {
    const signalToUse = signal ?? "SIGTERM";
    this.subprocess.kill(signalToUse);
  }
}
function createLineIterator(stream) {
  return {
    [Symbol.asyncIterator]() {
      const reader = stream.getReader();
      const decoder = new TextDecoder;
      let buffer = "";
      let done = false;
      return {
        async next() {
          while (!done) {
            const newlineIndex = buffer.indexOf(`
`);
            if (newlineIndex !== -1) {
              const line = buffer.slice(0, newlineIndex);
              buffer = buffer.slice(newlineIndex + 1);
              return { value: line, done: false };
            }
            const result = await reader.read();
            if (result.done) {
              done = true;
              if (buffer.length > 0) {
                const remaining = buffer;
                buffer = "";
                return { value: remaining, done: false };
              }
              return { value: undefined, done: true };
            }
            buffer += decoder.decode(result.value, { stream: true });
          }
          return { value: undefined, done: true };
        },
        async return() {
          done = true;
          reader.releaseLock();
          return { value: undefined, done: true };
        }
      };
    }
  };
}
function emptyAsyncIterable() {
  return {
    [Symbol.asyncIterator]() {
      return {
        async next() {
          return { value: undefined, done: true };
        }
      };
    }
  };
}

class BunProcessManager {
  spawn(command, args, options) {
    const spawnOptions = {
      stdin: options?.stdin !== undefined ? "pipe" : "ignore",
      stdout: "pipe",
      stderr: "pipe"
    };
    if (options?.cwd !== undefined) {
      spawnOptions.cwd = options.cwd;
    }
    if (options?.env !== undefined) {
      spawnOptions.env = { ...process.env, ...options.env };
    }
    const subprocess = Bun.spawn([command, ...args], spawnOptions);
    if (options?.stdin !== undefined) {
      const stdin2 = subprocess.stdin;
      if (stdin2 !== null && stdin2 !== undefined && "getWriter" in stdin2) {
        const writer = stdin2.getWriter();
        writer.write(new TextEncoder().encode(options.stdin));
        writer.close();
      }
    }
    return new BunManagedProcess(subprocess);
  }
  async kill(pid, signal) {
    const signalToUse = signal ?? "SIGTERM";
    try {
      process.kill(pid, signalToUse);
    } catch (error) {
      if (error instanceof Error && !error.message.includes("ESRCH")) {
        throw error;
      }
    }
  }
}

// src/sdk/credentials/backends/file.ts
import { readFile as readFile3, mkdir as mkdir2, unlink, access as access3, constants as constants2, chmod } from "fs/promises";
import { dirname as dirname2 } from "path";

// src/sdk/credentials/errors.ts
class CredentialError extends Error {
  code;
  constructor(message, code) {
    super(message);
    this.code = code;
    this.name = "CredentialError";
  }
  static notAuthenticated() {
    return new CredentialError("No credentials found", "NOT_AUTHENTICATED");
  }
  static expired() {
    return new CredentialError("Credentials expired", "EXPIRED");
  }
  static invalidFormat(details) {
    return new CredentialError(`Invalid credentials format: ${details}`, "INVALID_FORMAT");
  }
  static fileNotFound(path6) {
    return new CredentialError(`Credentials file not found: ${path6}`, "FILE_NOT_FOUND");
  }
  static keychainDenied() {
    return new CredentialError("Keychain access denied", "KEYCHAIN_ACCESS_DENIED");
  }
  static permissionDenied(path6) {
    return new CredentialError(`Permission denied accessing: ${path6}`, "PERMISSION_DENIED");
  }
  static writeFailed(path6, reason) {
    return new CredentialError(`Failed to write credentials to ${path6}: ${reason}`, "WRITE_FAILED");
  }
  static directoryCreateFailed(path6) {
    return new CredentialError(`Failed to create directory: ${path6}`, "DIRECTORY_CREATE_FAILED");
  }
  static deleteFailed(path6, reason) {
    return new CredentialError(`Failed to delete credentials at ${path6}: ${reason}`, "DELETE_FAILED");
  }
  static invalidCredentialsInput(details) {
    return new CredentialError(`Invalid credentials input: ${details}`, "INVALID_CREDENTIALS_INPUT");
  }
  static storageFull() {
    return new CredentialError("Storage is full", "STORAGE_FULL");
  }
}

// src/sdk/credentials/backends/type-guards.ts
function isValidCredentials(value) {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value;
  if (typeof obj["claudeAiOauth"] !== "object" || obj["claudeAiOauth"] === null) {
    return false;
  }
  const oauth = obj["claudeAiOauth"];
  return typeof oauth["accessToken"] === "string" && typeof oauth["refreshToken"] === "string" && typeof oauth["expiresAt"] === "number" && Array.isArray(oauth["scopes"]) && typeof oauth["subscriptionType"] === "string" && typeof oauth["rateLimitTier"] === "string";
}
function isNodeError(error) {
  return error instanceof Error && "code" in error && typeof error.code === "string";
}

// src/interfaces/bun-filesystem.ts
import * as fs from "fs/promises";
import * as path6 from "path";
import { watch } from "fs";

class BunFileSystem {
  async readFile(filePath) {
    const bun = globalThis;
    if (bun.Bun !== undefined) {
      return bun.Bun.file(filePath).text();
    }
    return fs.readFile(filePath, "utf8");
  }
  async writeFile(filePath, content) {
    const dir = path6.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    const bun = globalThis;
    if (bun.Bun !== undefined) {
      await bun.Bun.write(filePath, content);
      return;
    }
    await fs.writeFile(filePath, content, "utf8");
  }
  async exists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  async readDir(dirPath) {
    return fs.readdir(dirPath);
  }
  watch(watchPath) {
    return {
      [Symbol.asyncIterator]() {
        const queue2 = [];
        let resolver = null;
        let closed = false;
        const watcher = watch(watchPath, (eventType, filename) => {
          if (closed)
            return;
          const event = {
            eventType,
            filename
          };
          if (resolver !== null) {
            const r3 = resolver;
            resolver = null;
            r3({ value: event, done: false });
          } else {
            queue2.push(event);
          }
        });
        return {
          async next() {
            if (closed) {
              return { value: undefined, done: true };
            }
            const queued = queue2.shift();
            if (queued !== undefined) {
              return { value: queued, done: false };
            }
            return new Promise((resolve) => {
              resolver = resolve;
            });
          },
          async return() {
            closed = true;
            watcher.close();
            if (resolver !== null) {
              resolver({ value: undefined, done: true });
            }
            return { value: undefined, done: true };
          }
        };
      }
    };
  }
  async stat(filePath) {
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      mtimeMs: stats.mtimeMs,
      ctimeMs: stats.ctimeMs,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory()
    };
  }
  async mkdir(dirPath, options) {
    await fs.mkdir(dirPath, { recursive: options?.recursive ?? false });
  }
  async rm(targetPath, options) {
    await fs.rm(targetPath, {
      recursive: options?.recursive ?? false,
      force: options?.force ?? false
    });
  }
}

// src/interfaces/system-clock.ts
class SystemClock {
  now() {
    return new Date;
  }
  timestamp() {
    return new Date().toISOString();
  }
  async sleep(ms) {
    const bun = globalThis;
    if (bun.Bun !== undefined) {
      await bun.Bun.sleep(ms);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// src/sdk/credentials/backends/file.ts
class FileCredentialBackend {
  path;
  lockService;
  atomicWriter;
  constructor(path7) {
    this.path = path7;
    const fs2 = new BunFileSystem;
    const clock = new SystemClock;
    this.lockService = new FileLockServiceImpl(fs2, clock);
    this.atomicWriter = new AtomicWriter(fs2);
  }
  async read() {
    try {
      const fileContent = await readFile3(this.path, "utf-8");
      let parsed;
      try {
        parsed = JSON.parse(fileContent);
      } catch (parseError) {
        return err(CredentialError.invalidFormat(`Failed to parse JSON: ${parseError instanceof Error ? parseError.message : "Unknown error"}`));
      }
      if (!isValidCredentials(parsed)) {
        return err(CredentialError.invalidFormat("Missing or invalid claudeAiOauth field"));
      }
      return ok(parsed);
    } catch (error) {
      if (isNodeError(error)) {
        switch (error.code) {
          case "ENOENT":
            return err(CredentialError.fileNotFound(this.path));
          case "EACCES":
            return err(CredentialError.permissionDenied(this.path));
          default:
            return err(CredentialError.invalidFormat(`File system error: ${error.message}`));
        }
      }
      return err(CredentialError.invalidFormat(`Unknown error: ${error instanceof Error ? error.message : "Unknown error"}`));
    }
  }
  async write(credentials) {
    try {
      await this.lockService.withLock(this.path, async () => {
        const dir = dirname2(this.path);
        await mkdir2(dir, { recursive: true, mode: 448 });
        await chmod(dir, 448);
        await this.atomicWriter.writeJson(this.path, credentials);
        await chmod(this.path, 384);
      });
      return ok(undefined);
    } catch (error) {
      if (isNodeError(error)) {
        switch (error.code) {
          case "EACCES":
            return err(CredentialError.permissionDenied(this.path));
          case "ENOSPC":
            return err(CredentialError.storageFull());
          default:
            return err(CredentialError.writeFailed(this.path, error.message));
        }
      }
      return err(CredentialError.writeFailed(this.path, error instanceof Error ? error.message : "Unknown error"));
    }
  }
  async delete() {
    try {
      try {
        await access3(this.path, constants2.F_OK);
      } catch (accessError) {
        if (isNodeError(accessError) && accessError.code === "ENOENT") {
          return ok(undefined);
        }
        throw accessError;
      }
      await this.lockService.withLock(this.path, async () => {
        await unlink(this.path);
      });
      return ok(undefined);
    } catch (error) {
      if (isNodeError(error)) {
        if (error.code === "ENOENT") {
          return ok(undefined);
        }
        if (error.code === "EACCES") {
          return err(CredentialError.permissionDenied(this.path));
        }
        return err(CredentialError.deleteFailed(this.path, error.message));
      }
      return err(CredentialError.deleteFailed(this.path, error instanceof Error ? error.message : "Unknown error"));
    }
  }
  async isWritable() {
    try {
      const dir = dirname2(this.path);
      await access3(dir, constants2.W_OK);
      return true;
    } catch {
      return false;
    }
  }
  getLocation() {
    return this.path;
  }
}
function getDefaultCredentialsPath() {
  const home = process.env["HOME"] ?? "";
  return `${home}/.claude/.credentials.json`;
}

// src/sdk/credentials/backends/keychain.ts
import { exec } from "child_process";
import { promisify } from "util";
var execAsync = promisify(exec);
function escapeShellArg(arg) {
  return "'" + arg.replace(/'/g, "'\\''") + "'";
}

class KeychainCredentialBackend {
  service = "claude-code";
  account = "credentials";
  async read() {
    try {
      const { stdout: stdout2, stderr } = await execAsync(`security find-generic-password -s "${this.service}" -a "${this.account}" -w`);
      if (stderr && stderr.trim().length > 0) {
        if (stderr.includes("could not be found")) {
          return err(CredentialError.notAuthenticated());
        }
        if (stderr.includes("User interaction is not allowed") || stderr.includes("The specified item is no longer valid")) {
          return err(CredentialError.keychainDenied());
        }
      }
      const keychainData = stdout2.trim();
      if (!keychainData) {
        return err(CredentialError.notAuthenticated());
      }
      let parsed;
      try {
        parsed = JSON.parse(keychainData);
      } catch (parseError) {
        return err(CredentialError.invalidFormat(`Failed to parse JSON from keychain: ${parseError instanceof Error ? parseError.message : "Unknown error"}`));
      }
      if (!isValidCredentials(parsed)) {
        return err(CredentialError.invalidFormat("Missing or invalid claudeAiOauth field"));
      }
      return ok(parsed);
    } catch (error) {
      if (isExecError(error)) {
        const stderr = error.stderr ?? "";
        const stdout2 = error.stdout ?? "";
        if (stderr.includes("could not be found") || stdout2.includes("could not be found")) {
          return err(CredentialError.notAuthenticated());
        }
        if (stderr.includes("User interaction is not allowed") || stderr.includes("The specified item is no longer valid") || stderr.includes("access denied")) {
          return err(CredentialError.keychainDenied());
        }
        return err(CredentialError.invalidFormat(`Keychain access error: ${error.message}`));
      }
      return err(CredentialError.invalidFormat(`Unknown error accessing keychain: ${error instanceof Error ? error.message : "Unknown error"}`));
    }
  }
  async write(credentials) {
    try {
      const jsonData = JSON.stringify(credentials);
      const deleteResult = await this.delete();
      if (deleteResult.isErr()) {
        const deleteError = deleteResult.error;
        if (deleteError.code !== "NOT_AUTHENTICATED") {
          return err(deleteError);
        }
      }
      await execAsync(`security add-generic-password -s "${this.service}" -a "${this.account}" -w ${escapeShellArg(jsonData)} -U`);
      return ok(undefined);
    } catch (error) {
      if (isExecError(error)) {
        const stderr = error.stderr ?? "";
        if (stderr.includes("User interaction is not allowed") || stderr.includes("access denied")) {
          return err(CredentialError.keychainDenied());
        }
        return err(CredentialError.writeFailed(this.getLocation(), `Keychain write error: ${error.message}`));
      }
      return err(CredentialError.writeFailed(this.getLocation(), `Unknown error: ${error instanceof Error ? error.message : "Unknown error"}`));
    }
  }
  async delete() {
    try {
      await execAsync(`security delete-generic-password -s "${this.service}" -a "${this.account}"`);
      return ok(undefined);
    } catch (error) {
      if (isExecError(error)) {
        const stderr = error.stderr ?? "";
        if (stderr.includes("could not be found")) {
          return ok(undefined);
        }
        if (stderr.includes("User interaction is not allowed") || stderr.includes("access denied")) {
          return err(CredentialError.keychainDenied());
        }
        return err(CredentialError.deleteFailed(this.getLocation(), `Keychain delete error: ${error.message}`));
      }
      return err(CredentialError.deleteFailed(this.getLocation(), `Unknown error: ${error instanceof Error ? error.message : "Unknown error"}`));
    }
  }
  async isWritable() {
    return true;
  }
  getLocation() {
    return `macOS Keychain (service: ${this.service}, account: ${this.account})`;
  }
}
function isExecError(error) {
  return error instanceof Error && (("stdout" in error) || ("stderr" in error) || ("code" in error));
}

// src/sdk/credentials/backends/index.ts
function detectPlatform() {
  switch (process.platform) {
    case "darwin":
      return "macos";
    case "win32":
      return "windows";
    case "linux":
    default:
      return "linux";
  }
}
function createCredentialBackend(platform2) {
  const detectedPlatform = platform2 ?? detectPlatform();
  switch (detectedPlatform) {
    case "macos":
      return new KeychainCredentialBackend;
    case "linux":
    case "windows":
    default:
      return new FileCredentialBackend(getDefaultCredentialsPath());
  }
}

// src/sdk/credentials/config-reader.ts
import { readFile as readFile4 } from "fs/promises";
function isValidOAuthAccount(value) {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const account = value;
  return typeof account["accountUuid"] === "string" && typeof account["emailAddress"] === "string" && typeof account["displayName"] === "string" && typeof account["organizationUuid"] === "string" && typeof account["organizationName"] === "string" && typeof account["organizationBillingType"] === "string" && typeof account["organizationRole"] === "string";
}
function isValidClaudeConfig(value) {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const config = value;
  if (config["oauthAccount"] !== undefined) {
    return isValidOAuthAccount(config["oauthAccount"]);
  }
  return true;
}
function transformToAccountInfo(raw) {
  const organization = {
    uuid: raw.organizationUuid,
    name: raw.organizationName,
    billingType: raw.organizationBillingType,
    role: raw.organizationRole
  };
  return {
    accountUuid: raw.accountUuid,
    emailAddress: raw.emailAddress,
    displayName: raw.displayName,
    organization
  };
}

class ConfigReader {
  path;
  constructor(path7 = getDefaultConfigPath()) {
    this.path = path7;
  }
  async getAccount() {
    try {
      const content = await readFile4(this.path, "utf-8");
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (parseError) {
        return err(CredentialError.invalidFormat(`Failed to parse JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`));
      }
      if (!isValidClaudeConfig(parsed)) {
        return err(CredentialError.invalidFormat("Invalid config file structure"));
      }
      if (parsed.oauthAccount === undefined) {
        return ok(null);
      }
      const accountInfo = transformToAccountInfo(parsed.oauthAccount);
      return ok(accountInfo);
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
        return ok(null);
      }
      if (error && typeof error === "object" && "code" in error && error.code === "EACCES") {
        return err(CredentialError.permissionDenied(this.path));
      }
      return err(CredentialError.invalidFormat(`Failed to read config: ${error instanceof Error ? error.message : String(error)}`));
    }
  }
}
function getDefaultConfigPath() {
  const home = process.env["HOME"] ?? "";
  return `${home}/.claude.json`;
}

// src/sdk/credentials/stats-reader.ts
import { readFile as readFile5 } from "fs/promises";
class StatsReader {
  path;
  constructor(path7 = getDefaultStatsPath()) {
    this.path = path7;
  }
  async getStats() {
    try {
      const content = await readFile5(this.path, "utf-8");
      const raw = JSON.parse(content);
      if (!isRawStatsCache(raw)) {
        return err(CredentialError.invalidFormat("stats-cache.json"));
      }
      const stats = this.transformToUsageStats(raw);
      return ok(stats);
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") {
        return ok(null);
      }
      if (isNodeError(error) && error.code === "EACCES") {
        return err(CredentialError.permissionDenied(this.path));
      }
      if (error instanceof SyntaxError) {
        return err(CredentialError.invalidFormat("Invalid JSON in stats-cache.json"));
      }
      return err(CredentialError.invalidFormat(`Failed to read stats: ${String(error)}`));
    }
  }
  transformToUsageStats(raw) {
    return {
      totalSessions: raw.totalSessions,
      totalMessages: raw.totalMessages,
      firstSessionDate: new Date(raw.firstSessionDate),
      lastComputedDate: new Date(raw.lastComputedDate),
      modelUsage: this.transformModelUsage(raw.modelUsage),
      dailyActivity: raw.dailyActivity.map((activity) => ({
        date: new Date(activity.date),
        messageCount: activity.messageCount,
        sessionCount: activity.sessionCount,
        toolCallCount: activity.toolCallCount
      })),
      dailyTokens: raw.dailyOutputTokens.map((daily) => {
        const tokensByModel = new Map(Object.entries(daily.tokensByModel));
        const totalTokens = Array.from(tokensByModel.values()).reduce((sum, tokens) => sum + tokens, 0);
        return {
          date: new Date(daily.date),
          tokensByModel,
          totalTokens
        };
      }),
      longestSession: {
        sessionId: raw.longestSession.sessionId,
        durationMs: raw.longestSession.duration,
        messageCount: raw.longestSession.messageCount,
        timestamp: new Date(raw.longestSession.timestamp)
      },
      peakHour: this.findPeakHour(raw.hourCounts)
    };
  }
  transformModelUsage(raw) {
    const map = new Map;
    for (const [model, usage] of Object.entries(raw)) {
      const totalTokens = usage.inputTokens + usage.outputTokens + usage.cacheReadInputTokens + usage.cacheCreationInputTokens;
      map.set(model, {
        model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cacheReadTokens: usage.cacheReadInputTokens,
        cacheWriteTokens: usage.cacheCreationInputTokens,
        totalTokens
      });
    }
    return map;
  }
  findPeakHour(hourCounts) {
    let peakHour = 0;
    let maxCount = 0;
    for (const [hourStr, count] of Object.entries(hourCounts)) {
      if (count > maxCount) {
        maxCount = count;
        peakHour = parseInt(hourStr, 10);
      }
    }
    return peakHour;
  }
}
function getDefaultStatsPath() {
  const home = process.env["HOME"] ?? "";
  return `${home}/.claude/stats-cache.json`;
}
function isRawStatsCache(value) {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value;
  return typeof obj["version"] === "number" && typeof obj["lastComputedDate"] === "string" && Array.isArray(obj["dailyActivity"]) && Array.isArray(obj["dailyOutputTokens"]) && typeof obj["modelUsage"] === "object" && obj["modelUsage"] !== null && typeof obj["totalSessions"] === "number" && typeof obj["totalMessages"] === "number" && typeof obj["longestSession"] === "object" && obj["longestSession"] !== null && typeof obj["firstSessionDate"] === "string" && typeof obj["hourCounts"] === "object" && obj["hourCounts"] !== null;
}

// src/sdk/credentials/reader.ts
class CredentialReader {
  backend;
  configReader;
  statsReader;
  constructor(options) {
    if (options?.configDir !== undefined) {
      const credentialsPath = `${options.configDir}/.credentials.json`;
      this.backend = new FileCredentialBackend(credentialsPath);
    } else {
      this.backend = createCredentialBackend(options?.platform);
    }
    const configPath = options?.configDir ? `${options.configDir}/.claude.json` : undefined;
    this.configReader = new ConfigReader(configPath);
    const statsPath = options?.configDir ? `${options.configDir}/stats-cache.json` : undefined;
    this.statsReader = new StatsReader(statsPath);
  }
  async getCredentials() {
    const result = await this.backend.read();
    if (result.isErr()) {
      const error = result.error;
      if (error.code === "NOT_AUTHENTICATED" || error.code === "FILE_NOT_FOUND") {
        return null;
      }
      return null;
    }
    const credentials = result.value;
    if (!credentials) {
      return null;
    }
    return this.transformCredentials(credentials);
  }
  async getAccount() {
    const result = await this.configReader.getAccount();
    if (result.isErr()) {
      return null;
    }
    return result.value;
  }
  async getStats() {
    const result = await this.statsReader.getStats();
    if (result.isErr()) {
      return null;
    }
    return result.value;
  }
  async isAuthenticated() {
    const creds = await this.getCredentials();
    return creds !== null && !creds.isExpired;
  }
  async getSubscriptionType() {
    const creds = await this.getCredentials();
    return creds?.subscriptionType ?? null;
  }
  transformCredentials(credentials) {
    const oauth = credentials.claudeAiOauth;
    const expiresAt = new Date(oauth.expiresAt);
    const isExpired = expiresAt.getTime() < Date.now();
    return {
      accessToken: oauth.accessToken,
      refreshToken: oauth.refreshToken,
      expiresAt,
      scopes: Object.freeze([...oauth.scopes]),
      subscriptionType: oauth.subscriptionType,
      rateLimitTier: oauth.rateLimitTier,
      isExpired
    };
  }
}
// src/sdk/credentials/validation.ts
var VALID_SUBSCRIPTION_TYPES = [
  "max",
  "pro",
  "free",
  "enterprise",
  "unknown"
];
function validateCredentialsInput(input) {
  if (typeof input !== "object" || input === null) {
    return err(CredentialError.invalidFormat("Input must be an object, got null or non-object"));
  }
  const obj = input;
  if (typeof obj["accessToken"] !== "string") {
    return err(CredentialError.invalidFormat("accessToken must be a string"));
  }
  if (!obj["accessToken"].startsWith("sk-ant-oat01-") && !obj["accessToken"].startsWith("sk-ant-")) {
    return err(CredentialError.invalidFormat('accessToken must start with "sk-ant-oat01-" or "sk-ant-"'));
  }
  if (typeof obj["refreshToken"] !== "string") {
    return err(CredentialError.invalidFormat("refreshToken must be a string"));
  }
  if (!obj["refreshToken"].startsWith("sk-ant-ort01-") && !obj["refreshToken"].startsWith("sk-ant-")) {
    return err(CredentialError.invalidFormat('refreshToken must start with "sk-ant-ort01-" or "sk-ant-"'));
  }
  if (typeof obj["expiresAt"] !== "number") {
    return err(CredentialError.invalidFormat("expiresAt must be a number (Unix timestamp in milliseconds)"));
  }
  if (obj["expiresAt"] <= Date.now()) {
    return err(CredentialError.invalidFormat("Token is expired or has invalid expiration timestamp"));
  }
  if (!Array.isArray(obj["scopes"])) {
    return err(CredentialError.invalidFormat("scopes must be an array"));
  }
  if (obj["scopes"].length === 0) {
    return err(CredentialError.invalidFormat("scopes must be a non-empty array"));
  }
  if (!obj["scopes"].every((scope) => typeof scope === "string")) {
    return err(CredentialError.invalidFormat("all scopes must be strings"));
  }
  if (typeof obj["subscriptionType"] !== "string") {
    return err(CredentialError.invalidFormat("subscriptionType must be a string"));
  }
  if (!VALID_SUBSCRIPTION_TYPES.includes(obj["subscriptionType"])) {
    return err(CredentialError.invalidFormat(`subscriptionType must be one of: ${VALID_SUBSCRIPTION_TYPES.join(", ")}`));
  }
  if (typeof obj["rateLimitTier"] !== "string") {
    return err(CredentialError.invalidFormat("rateLimitTier must be a string"));
  }
  if (obj["rateLimitTier"].length === 0) {
    return err(CredentialError.invalidFormat("rateLimitTier must be a non-empty string"));
  }
  return ok({
    accessToken: obj["accessToken"],
    refreshToken: obj["refreshToken"],
    expiresAt: obj["expiresAt"],
    scopes: obj["scopes"],
    subscriptionType: obj["subscriptionType"],
    rateLimitTier: obj["rateLimitTier"]
  });
}
function validateCredentialsExport(input) {
  if (typeof input !== "object" || input === null) {
    return err(CredentialError.invalidFormat("Export must be an object, got null or non-object"));
  }
  const obj = input;
  if (obj["version"] !== 1) {
    return err(CredentialError.invalidFormat(`Export version must be 1, got ${String(obj["version"])}`));
  }
  if (typeof obj["exportedAt"] !== "string") {
    return err(CredentialError.invalidFormat("exportedAt must be a string"));
  }
  if (typeof obj["credentials"] !== "object" || obj["credentials"] === null) {
    return err(CredentialError.invalidFormat("Export must contain credentials object"));
  }
  const credentialsResult = validateCredentialsInput(obj["credentials"]);
  if (credentialsResult.isErr()) {
    return err(credentialsResult.error);
  }
  return ok({
    version: 1,
    exportedAt: obj["exportedAt"],
    credentials: credentialsResult.value
  });
}

// src/sdk/credentials/writer.ts
class CredentialWriter {
  backend;
  constructor(options) {
    if (options?.configDir !== undefined) {
      const credentialsPath = `${options.configDir}/.credentials.json`;
      this.backend = new FileCredentialBackend(credentialsPath);
    } else {
      this.backend = createCredentialBackend(options?.platform);
    }
  }
  async writeCredentials(input) {
    const validationResult = validateCredentialsInput(input);
    if (validationResult.isErr()) {
      return err(validationResult.error);
    }
    const credentials = {
      claudeAiOauth: validationResult.value
    };
    return this.backend.write(credentials);
  }
  async deleteCredentials() {
    return this.backend.delete();
  }
  async isWritable() {
    return this.backend.isWritable();
  }
  getStorageLocation() {
    return this.backend.getLocation();
  }
}
// src/sdk/credentials/manager.ts
class CredentialManager {
  reader;
  writer;
  constructor(options) {
    const readerOptions = {};
    const writerOptions = {};
    if (options?.configDir !== undefined) {
      readerOptions.configDir = options.configDir;
      writerOptions.configDir = options.configDir;
    }
    if (options?.platform !== undefined) {
      readerOptions.platform = options.platform;
      writerOptions.platform = options.platform;
    }
    this.reader = new CredentialReader(readerOptions);
    this.writer = new CredentialWriter(writerOptions);
  }
  async getCredentials() {
    return this.reader.getCredentials();
  }
  async getAccount() {
    return this.reader.getAccount();
  }
  async getStats() {
    return this.reader.getStats();
  }
  async isAuthenticated() {
    return this.reader.isAuthenticated();
  }
  async getSubscriptionType() {
    return this.reader.getSubscriptionType();
  }
  async writeCredentials(input) {
    return this.writer.writeCredentials(input);
  }
  async deleteCredentials() {
    return this.writer.deleteCredentials();
  }
  async isWritable() {
    return this.writer.isWritable();
  }
  getStorageLocation() {
    return this.writer.getStorageLocation();
  }
  async exportCredentials() {
    const credentials = await this.getCredentials();
    if (credentials === null) {
      return err(CredentialError.notAuthenticated());
    }
    const exported = {
      version: 1,
      exportedAt: new Date().toISOString(),
      credentials: {
        accessToken: credentials.accessToken,
        refreshToken: credentials.refreshToken,
        expiresAt: credentials.expiresAt.getTime(),
        scopes: [...credentials.scopes],
        subscriptionType: credentials.subscriptionType,
        rateLimitTier: credentials.rateLimitTier
      }
    };
    return ok(exported);
  }
  async importCredentials(data) {
    const validationResult = validateCredentialsExport(data);
    if (validationResult.isErr()) {
      return err(validationResult.error);
    }
    return this.writeCredentials(validationResult.value.credentials);
  }
}
// src/sdk/readiness.ts
var DEFAULT_PROBE_PROMPT = "Reply with exactly READY.";
var DEFAULT_TIMEOUT_MS = 20000;
function joinLines(lines) {
  return lines.join(`
`).trim();
}
async function collectLines2(stream) {
  const lines = [];
  for await (const line of stream) {
    lines.push(line);
  }
  return lines;
}
async function waitForExitOrTimeout(process2, processManager, timeoutMs) {
  let timer;
  try {
    return await Promise.race([
      process2.exitCode.then((exitCode) => ({
        exitCode,
        timedOut: false
      })),
      new Promise((resolve) => {
        timer = setTimeout(() => {
          processManager.kill(process2.pid, "SIGTERM").finally(() => resolve({ exitCode: null, timedOut: true }));
        }, timeoutMs);
      })
    ]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}
function classifyProbeFailure(output) {
  const normalized = output.toLowerCase();
  if (normalized.includes("login") || normalized.includes("log in") || normalized.includes("authentication") || normalized.includes("authenticated") || normalized.includes("unauthorized") || normalized.includes("credential") || normalized.includes("access token")) {
    return "auth";
  }
  if (normalized.includes("model") && (normalized.includes("unknown") || normalized.includes("not available") || normalized.includes("not supported") || normalized.includes("not found") || normalized.includes("unsupported") || normalized.includes("access"))) {
    return "model";
  }
  return "unknown";
}
function createInitialAuthReadiness(credentials, storageLocation) {
  if (credentials === null) {
    return {
      state: "missing",
      available: false,
      verified: false,
      storageLocation,
      scopes: [],
      message: "No stored Claude Code credentials were found."
    };
  }
  return {
    state: credentials.isExpired ? "expired" : "configured",
    available: !credentials.isExpired,
    verified: false,
    storageLocation,
    expiresAt: credentials.expiresAt,
    subscriptionType: credentials.subscriptionType,
    scopes: [...credentials.scopes],
    rateLimitTier: credentials.rateLimitTier,
    message: credentials.isExpired ? "Stored credentials are expired." : undefined
  };
}
function buildProbeArgs(model, prompt2) {
  const args = ["--model", model];
  args.push(prompt2 ?? DEFAULT_PROBE_PROMPT);
  return args;
}
async function executeModelProbe(processManager, cliPath, args, spawnOptions, timeoutMs) {
  const requestedModel = getModelArgValue(args);
  try {
    const process2 = processManager.spawn(cliPath, args, spawnOptions);
    const stdoutPromise = collectLines2(process2.stdout);
    const stderrPromise = collectLines2(process2.stderr);
    const exitResult = await waitForExitOrTimeout(process2, processManager, timeoutMs);
    const [stdoutLines, stderrLines] = await Promise.all([
      stdoutPromise,
      stderrPromise
    ]);
    const stdout2 = joinLines(stdoutLines);
    const stderr = joinLines(stderrLines);
    if (exitResult.timedOut) {
      const timeoutMessage = `Probe timed out after ${timeoutMs}ms.`;
      return {
        cli: {
          checked: true,
          available: false,
          command: cliPath,
          exitCode: null,
          message: timeoutMessage
        },
        model: {
          requested: requestedModel,
          checked: true,
          available: false,
          timedOut: true,
          exitCode: null,
          stdout: stdout2,
          stderr,
          failureKind: "timeout",
          message: timeoutMessage,
          commandArgs: [...args]
        }
      };
    }
    if (exitResult.exitCode === 0) {
      return {
        cli: {
          checked: true,
          available: true,
          command: cliPath,
          exitCode: 0
        },
        model: {
          requested: requestedModel,
          checked: true,
          available: true,
          timedOut: false,
          exitCode: 0,
          stdout: stdout2,
          stderr,
          commandArgs: [...args]
        }
      };
    }
    const combinedOutput = [stderr, stdout2].filter((value) => value.length > 0).join(`
`);
    const failureKind = classifyProbeFailure(combinedOutput);
    const failureMessage = combinedOutput.length > 0 ? combinedOutput : `Claude exited with code ${exitResult.exitCode ?? "unknown"}.`;
    return {
      cli: {
        checked: true,
        available: true,
        command: cliPath,
        exitCode: exitResult.exitCode,
        message: failureMessage
      },
      model: {
        requested: requestedModel,
        checked: true,
        available: false,
        timedOut: false,
        exitCode: exitResult.exitCode,
        stdout: stdout2,
        stderr,
        failureKind,
        message: failureMessage,
        commandArgs: [...args]
      }
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      cli: {
        checked: true,
        available: false,
        command: cliPath,
        message
      },
      model: {
        requested: requestedModel,
        checked: true,
        available: false,
        timedOut: false,
        stdout: "",
        stderr: "",
        failureKind: "cli",
        message,
        commandArgs: [...args]
      }
    };
  }
}
function getModelArgValue(args) {
  const modelFlagIndex = args.indexOf("--model");
  if (modelFlagIndex === -1) {
    return null;
  }
  return args[modelFlagIndex + 1] ?? null;
}
async function verifyClaudeReadiness(options = {}) {
  const credentialSource = options.credentialSource ?? new CredentialManager;
  const processManager = options.processManager ?? new BunProcessManager;
  const cliPath = options.cliPath ?? "claude";
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const credentials = await credentialSource.getCredentials();
  let auth = createInitialAuthReadiness(credentials, credentialSource.getStorageLocation());
  const baseResult = {
    ready: auth.available,
    auth,
    cli: {
      checked: false,
      available: false,
      command: cliPath
    },
    model: {
      requested: options.model ?? null,
      checked: false,
      available: false,
      timedOut: false,
      stdout: "",
      stderr: "",
      commandArgs: options.model !== undefined ? buildProbeArgs(options.model, options.prompt) : [],
      message: options.model !== undefined && !auth.available ? "Live model probe was skipped because authentication is unavailable." : undefined
    }
  };
  if (options.model === undefined) {
    return baseResult;
  }
  if (!auth.available) {
    return {
      ...baseResult,
      ready: false
    };
  }
  const args = buildProbeArgs(options.model, options.prompt);
  const probeResult = await executeModelProbe(processManager, cliPath, args, {
    cwd: options.cwd,
    env: options.env
  }, timeoutMs);
  if (probeResult.model.available) {
    auth = {
      ...auth,
      verified: true
    };
    return {
      ready: true,
      auth,
      cli: probeResult.cli,
      model: probeResult.model
    };
  }
  if (probeResult.model.failureKind === "auth") {
    auth = {
      ...auth,
      available: false,
      verified: true,
      message: probeResult.model.message
    };
  } else if (probeResult.cli.available) {
    auth = {
      ...auth,
      verified: true
    };
  }
  return {
    ready: false,
    auth,
    cli: probeResult.cli,
    model: probeResult.model
  };
}
// src/sdk/environment.ts
class ClaudeEnvironment {
  values;
  constructor(values) {
    this.values = Object.freeze({ ...values });
  }
  static from(values) {
    return new ClaudeEnvironment(values);
  }
  toRecord() {
    return { ...this.values };
  }
  merge(additional) {
    const additionalRecord = toClaudeEnvironmentRecord(additional);
    return new ClaudeEnvironment({
      ...this.values,
      ...additionalRecord
    });
  }
}
function defineClaudeEnvironment(values) {
  return ClaudeEnvironment.from(values);
}
function toClaudeEnvironmentRecord(input) {
  if (input === undefined) {
    return;
  }
  if (input instanceof ClaudeEnvironment) {
    return input.toRecord();
  }
  return { ...input };
}
// src/sdk/session-runner.ts
import { EventEmitter as NodeEventEmitter } from "events";
import { mkdir as mkdir3, writeFile as writeFile2, rm as rm2 } from "fs/promises";
import { isAbsolute, resolve as resolve2, dirname as dirname4 } from "path";
import { tmpdir } from "os";

// src/sdk/transport/subprocess.ts
import { dirname as dirname3, resolve } from "path";

// src/sdk/errors.ts
class ClaudeCodeAgentError extends Error {
  code;
  constructor(message, code) {
    super(message);
    this.code = code;
    this.name = "ClaudeCodeAgentError";
    Object.setPrototypeOf(this, ClaudeCodeAgentError.prototype);
  }
}

class CLINotFoundError extends ClaudeCodeAgentError {
  path;
  constructor(path7) {
    super(`Claude Code CLI not found at: ${path7}`, "CLI_NOT_FOUND");
    this.path = path7;
    this.name = "CLINotFoundError";
    Object.setPrototypeOf(this, CLINotFoundError.prototype);
  }
}

class CLIConnectionError extends ClaudeCodeAgentError {
  reason;
  constructor(reason) {
    super(`Failed to connect to Claude Code CLI: ${reason}`, "CLI_CONNECTION");
    this.reason = reason;
    this.name = "CLIConnectionError";
    Object.setPrototypeOf(this, CLIConnectionError.prototype);
  }
}

class ToolExecutionError extends ClaudeCodeAgentError {
  toolName;
  cause;
  constructor(toolName, cause) {
    const message = typeof cause === "string" ? cause : cause.message;
    super(`Tool '${toolName}' failed: ${message}`, "TOOL_EXECUTION");
    this.toolName = toolName;
    this.name = "ToolExecutionError";
    this.cause = typeof cause === "string" ? undefined : cause;
    Object.setPrototypeOf(this, ToolExecutionError.prototype);
  }
}

class ControlProtocolError extends ClaudeCodeAgentError {
  requestId;
  constructor(message, requestId) {
    super(`Control protocol error: ${message}`, "CONTROL_PROTOCOL");
    this.requestId = requestId;
    this.name = "ControlProtocolError";
    Object.setPrototypeOf(this, ControlProtocolError.prototype);
  }
}

class TimeoutError extends ClaudeCodeAgentError {
  operation;
  timeout;
  constructor(operation, timeout) {
    super(`Operation '${operation}' timed out after ${timeout}ms`, "TIMEOUT");
    this.operation = operation;
    this.timeout = timeout;
    this.name = "TimeoutError";
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

class InvalidStateError extends ClaudeCodeAgentError {
  currentState;
  expectedStates;
  constructor(currentState, expectedStates) {
    super(`Invalid state: ${currentState}. Expected one of: ${expectedStates.join(", ")}`, "INVALID_STATE");
    this.currentState = currentState;
    this.expectedStates = expectedStates;
    this.name = "InvalidStateError";
    Object.setPrototypeOf(this, InvalidStateError.prototype);
  }
}
function isClaudeCodeAgentError(error) {
  return error instanceof ClaudeCodeAgentError;
}
function isCLINotFoundError(error) {
  return error instanceof CLINotFoundError;
}
function isCLIConnectionError(error) {
  return error instanceof CLIConnectionError;
}
function isToolExecutionError(error) {
  return error instanceof ToolExecutionError;
}
function isControlProtocolError(error) {
  return error instanceof ControlProtocolError;
}
function isTimeoutError(error) {
  return error instanceof TimeoutError;
}
function isInvalidStateError(error) {
  return error instanceof InvalidStateError;
}

// src/sdk/transport/subprocess.ts
function buildSubprocessCommand(options) {
  const cliPath = options.cliPath ?? "claude";
  const args = [cliPath, "--verbose"];
  if (options.mcpConfig !== undefined) {
    args.push("--mcp-config", JSON.stringify(options.mcpConfig));
  }
  if (options.permissionMode !== undefined) {
    args.push("--permission-mode", options.permissionMode);
  }
  if (options.model !== undefined) {
    args.push("--model", options.model);
  }
  if (options.effort !== undefined) {
    args.push("--effort", options.effort);
  }
  if (options.maxTurns !== undefined) {
    args.push("--max-turns", String(options.maxTurns));
  }
  if (options.systemPrompt !== undefined) {
    args.push("--system-prompt", options.systemPrompt);
  }
  if (options.allowedTools !== undefined && options.allowedTools.length > 0) {
    args.push("--allowed-tools", options.allowedTools.join(","));
  }
  if (options.disallowedTools !== undefined && options.disallowedTools.length > 0) {
    args.push("--disallowed-tools", options.disallowedTools.join(","));
  }
  if (options.resumeSessionId !== undefined) {
    args.push("--resume", options.resumeSessionId);
  }
  if (options.attachmentPaths !== undefined && options.attachmentPaths.length > 0) {
    const directories = Array.from(new Set(options.attachmentPaths.map((path7) => resolve(dirname3(path7)))));
    if (directories.length > 0) {
      args.push("--add-dir", ...directories);
    }
  }
  if (options.additionalArgs !== undefined && options.additionalArgs.length > 0) {
    assertNoPrintModeArgs(options.additionalArgs, "transport additionalArgs");
    args.push(...options.additionalArgs);
  }
  if (options.prompt !== undefined && options.prompt !== "") {
    args.push(options.prompt);
  }
  return args;
}

class SubprocessTransport {
  process = null;
  stdin = null;
  stdout = null;
  stderr = null;
  connected = false;
  closed = false;
  options;
  constructor(options) {
    this.options = options ?? {};
  }
  async connect() {
    if (this.connected) {
      throw new Error("Transport already connected");
    }
    if (this.closed) {
      throw new Error("Cannot connect to closed transport");
    }
    const cliPath = this.options.cliPath ?? "claude";
    const args = this.buildCommand();
    try {
      this.process = Bun.spawn(args, {
        cwd: this.options.cwd ?? process.cwd(),
        env: {
          ...process.env,
          ...this.options.env
        },
        stdin: "pipe",
        stdout: "pipe",
        stderr: "pipe"
      });
      const stdin2 = this.process.stdin;
      const stdout2 = this.process.stdout;
      const stderr = this.process.stderr;
      if (stdin2 === null || stdin2 === undefined || typeof stdin2 === "number") {
        throw new CLIConnectionError("Failed to open stdin pipe");
      }
      if (stdout2 === null || stdout2 === undefined || typeof stdout2 === "number") {
        throw new CLIConnectionError("Failed to open stdout pipe");
      }
      if (stderr === null || stderr === undefined || typeof stderr === "number") {
        throw new CLIConnectionError("Failed to open stderr pipe");
      }
      this.stdin = stdin2;
      this.stdout = stdout2;
      this.stderr = stderr;
      this.readStderr();
      this.connected = true;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("ENOENT") || error.message.includes("not found")) {
          throw new CLINotFoundError(cliPath);
        }
        throw new CLIConnectionError(error.message);
      }
      throw new CLIConnectionError(String(error));
    }
  }
  async write(data) {
    if (!this.connected || this.stdin === null) {
      if (this.closed) {
        throw new Error("Transport closed");
      }
      throw new Error("Transport not connected");
    }
    try {
      this.stdin.write(data + `
`);
      await this.stdin.flush();
    } catch (error) {
      throw new Error(`Failed to write to CLI stdin: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  async* readMessages() {
    if (!this.connected || this.stdout === null) {
      throw new Error("Transport not connected");
    }
    const reader = this.stdout.getReader();
    const decoder = new TextDecoder;
    let buffer = "";
    try {
      while (!this.closed) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(`
`);
        buffer = lines[lines.length - 1] ?? "";
        for (let i2 = 0;i2 < lines.length - 1; i2++) {
          const line = lines[i2];
          if (line === undefined || line.trim() === "") {
            continue;
          }
          try {
            const message = JSON.parse(line);
            yield message;
          } catch (error) {
            console.error(`Failed to parse JSON from CLI: ${error instanceof Error ? error.message : String(error)}`);
            console.error(`Line: ${line}`);
          }
        }
      }
      if (buffer.trim() !== "") {
        try {
          const message = JSON.parse(buffer);
          yield message;
        } catch (error) {
          console.error(`Failed to parse final JSON from CLI: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
  async endInput() {
    if (!this.connected || this.stdin === null) {
      throw new Error("Transport not connected");
    }
    try {
      await this.stdin.end();
      this.stdin = null;
    } catch (error) {
      console.error(`Error closing stdin: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  async close() {
    if (this.closed) {
      return;
    }
    this.closed = true;
    this.connected = false;
    if (this.stdin !== null) {
      try {
        await this.stdin.end();
      } catch {}
      this.stdin = null;
    }
    if (this.process !== null) {
      try {
        this.process.kill();
        const exitPromise = this.process.exited;
        const timeoutPromise = new Promise((resolve2) => setTimeout(resolve2, 5000));
        await Promise.race([exitPromise, timeoutPromise]);
        if (!this.process.killed) {
          this.process.kill(9);
        }
      } catch (error) {
        console.error(`Error terminating CLI process: ${error instanceof Error ? error.message : String(error)}`);
      }
      this.process = null;
    }
    this.stdout = null;
    this.stderr = null;
  }
  isConnected() {
    return this.connected;
  }
  buildCommand() {
    return buildSubprocessCommand(this.options);
  }
  async readStderr() {
    if (this.stderr === null) {
      return;
    }
    const reader = this.stderr.getReader();
    const decoder = new TextDecoder;
    try {
      while (!this.closed) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        const text = decoder.decode(value, { stream: true });
        if (text.trim() !== "") {
          console.error(`[CLI stderr] ${text.trim()}`);
        }
      }
    } catch (error) {
      console.error(`Error reading stderr: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      reader.releaseLock();
    }
  }
}

// src/sdk/control-protocol.ts
import { EventEmitter as EventEmitter3 } from "events";
var logger14 = createTaggedLogger("control-protocol");
function createJsonRpcResponse(id, options) {
  const base = { jsonrpc: "2.0" };
  if (id !== undefined) {
    return { ...base, id, ...options };
  }
  return { ...base, ...options };
}

class ControlProtocolHandler extends EventEmitter3 {
  transport;
  toolRegistries = new Map;
  pendingRequests = new Map;
  defaultTimeout;
  requestIdCounter = 0;
  initialized = false;
  constructor(transport, options) {
    super();
    this.transport = transport;
    this.defaultTimeout = options?.defaultTimeout ?? 30000;
  }
  registerToolRegistry(serverName, registry) {
    if (this.toolRegistries.has(serverName)) {
      throw new Error(`Tool registry for server '${serverName}' is already registered`);
    }
    this.toolRegistries.set(serverName, registry);
    logger14.debug(`Registered tool registry for server: ${serverName}`);
  }
  async initialize() {
    if (this.initialized) {
      throw new ControlProtocolError("Control protocol already initialized");
    }
    logger14.debug("Initializing control protocol");
    const response = await this.sendRequest({ subtype: "initialize" });
    if (response.response.subtype === "error") {
      throw new ControlProtocolError(`Initialization failed: ${response.response.error}`);
    }
    this.initialized = true;
    logger14.info("Control protocol initialized");
  }
  async sendRequest(request, timeout) {
    const requestId = this.generateRequestId();
    const timeoutMs = timeout ?? this.defaultTimeout;
    logger14.debug(`Sending request ${requestId}: ${request.subtype}`);
    const responsePromise = new Promise((resolve2, reject) => {
      const timeoutTimer = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new TimeoutError(`Control request ${request.subtype}`, timeoutMs));
      }, timeoutMs);
      this.pendingRequests.set(requestId, {
        requestId,
        resolve: resolve2,
        reject,
        timeout: timeoutTimer
      });
    });
    const outgoingRequest = {
      type: "control_request",
      request_id: requestId,
      request
    };
    try {
      await this.transport.write(JSON.stringify(outgoingRequest));
    } catch (error) {
      this.pendingRequests.delete(requestId);
      throw new ControlProtocolError(`Failed to send request: ${error instanceof Error ? error.message : String(error)}`, requestId);
    }
    return responsePromise;
  }
  async handleIncomingMessage(msg) {
    try {
      this.emit("message", msg);
      if (isControlResponse(msg)) {
        await this.handleControlResponse(msg);
        return;
      }
      if (isIncomingControlRequest(msg)) {
        await this.handleIncomingControlRequest(msg);
        return;
      }
      if (typeof msg === "object" && msg !== null && "type" in msg && msg.type === "result") {
        const resultMsg = msg;
        const success = resultMsg.subtype === "success" && resultMsg.is_error !== true;
        this.emit("result", {
          success,
          result: resultMsg.result,
          raw: msg
        });
        return;
      }
      if (typeof msg === "object" && msg !== null && "type" in msg && typeof msg.type === "string") {
        return;
      }
      logger14.warn("Unknown message type received", { msg });
    } catch (error) {
      const err2 = error instanceof Error ? error : new Error(String(error));
      logger14.error("Error handling incoming message", { error: err2 });
      this.emit("error", err2);
    }
  }
  async processMessages() {
    logger14.debug("Starting message processing");
    try {
      for await (const msg of this.transport.readMessages()) {
        await this.handleIncomingMessage(msg);
      }
    } catch (error) {
      const err2 = error instanceof Error ? error : new Error(String(error));
      logger14.error("Message processing error", { error: err2 });
      this.emit("error", err2);
      throw err2;
    }
    logger14.debug("Message processing ended");
  }
  cleanup() {
    logger14.debug("Cleaning up control protocol handler");
    for (const pending of this.pendingRequests.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new ControlProtocolError("Control protocol handler cleaned up"));
    }
    this.pendingRequests.clear();
    this.toolRegistries.clear();
    this.initialized = false;
    logger14.info("Control protocol handler cleaned up");
  }
  generateRequestId() {
    this.requestIdCounter += 1;
    return `sdk-req-${this.requestIdCounter}`;
  }
  async handleControlResponse(response) {
    const requestId = response.response.request_id;
    const pending = this.pendingRequests.get(requestId);
    if (pending === undefined) {
      logger14.warn(`Received response for unknown request: ${requestId}`);
      return;
    }
    clearTimeout(pending.timeout);
    this.pendingRequests.delete(requestId);
    if (isSuccessResponse(response.response)) {
      logger14.debug(`Request ${requestId} succeeded`);
      pending.resolve(response);
    } else if (isErrorResponse(response.response)) {
      logger14.debug(`Request ${requestId} failed: ${response.response.error}`);
      pending.reject(new ControlProtocolError(response.response.error, requestId));
    } else {
      pending.reject(new ControlProtocolError("Invalid response subtype", requestId));
    }
  }
  async handleIncomingControlRequest(request) {
    const { request_id, request: payload } = request;
    logger14.debug(`Handling incoming request ${request_id}: ${payload.subtype}`);
    try {
      if (isMcpMessageRequest(payload)) {
        const mcpResponse = await this.handleMcpMessage(payload.server_name, payload.message);
        await this.sendControlResponse(request_id, {
          mcp_response: mcpResponse
        });
      } else if (payload.subtype === "can_use_tool") {
        await this.sendControlResponse(request_id, { allowed: true });
      } else if (payload.subtype === "hook_callback") {
        await this.sendControlResponse(request_id, {});
      } else {
        const exhaustiveCheck = payload;
        throw new Error(`Unknown request subtype: ${exhaustiveCheck.subtype}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger14.error(`Error handling request ${request_id}`, { error });
      await this.sendErrorResponse(request_id, errorMessage);
    }
  }
  async handleMcpMessage(serverName, message) {
    if (!isJsonRpcMessage(message)) {
      throw new ControlProtocolError("Invalid JSON-RPC message");
    }
    const method = message.method;
    if (method === "tools/list") {
      return this.handleToolsListRequest(serverName, message);
    }
    if (method === "tools/call") {
      return this.handleToolsCallRequest(serverName, message);
    }
    return createJsonRpcResponse(message.id, {
      error: {
        code: -32601,
        message: `Method not found: ${method ?? "unknown"}`
      }
    });
  }
  async handleToolsListRequest(serverName, message) {
    const registry = this.toolRegistries.get(serverName);
    if (registry === undefined) {
      return createJsonRpcResponse(message.id, {
        error: {
          code: -32000,
          message: `Server not found: ${serverName}`
        }
      });
    }
    const tools = registry.getToolListForMcp();
    logger14.debug(`Returning ${tools.length} tools for server ${serverName}`);
    return createJsonRpcResponse(message.id, {
      result: { tools }
    });
  }
  async handleToolsCallRequest(serverName, message) {
    const registry = this.toolRegistries.get(serverName);
    if (registry === undefined) {
      return createJsonRpcResponse(message.id, {
        error: {
          code: -32000,
          message: `Server not found: ${serverName}`
        }
      });
    }
    const params = message.params;
    if (params === undefined || typeof params !== "object") {
      return createJsonRpcResponse(message.id, {
        error: {
          code: -32602,
          message: "Invalid params"
        }
      });
    }
    const toolName = params["name"];
    const toolArgs = params["arguments"];
    if (typeof toolName !== "string") {
      return createJsonRpcResponse(message.id, {
        error: {
          code: -32602,
          message: "Missing or invalid tool name"
        }
      });
    }
    if (typeof toolArgs !== "object" || toolArgs === null || Array.isArray(toolArgs)) {
      return createJsonRpcResponse(message.id, {
        error: {
          code: -32602,
          message: "Invalid tool arguments"
        }
      });
    }
    const toolCallInfo = {
      toolUseId: String(message.id ?? "unknown"),
      toolName,
      serverName,
      arguments: toolArgs
    };
    this.emit("toolCall", toolCallInfo);
    try {
      const context = {
        toolUseId: String(message.id ?? "unknown"),
        sessionId: "unknown"
      };
      const result = await registry.handleToolCall(toolName, toolArgs, context);
      const toolResultInfo = {
        toolUseId: context.toolUseId,
        toolName,
        result: { content: result.content },
        isError: result.isError ?? false
      };
      this.emit("toolResult", toolResultInfo);
      logger14.debug(`Tool ${toolName} executed successfully`);
      const resultPayload = {
        content: result.content
      };
      if (result.isError !== undefined) {
        resultPayload.isError = result.isError;
      }
      return createJsonRpcResponse(message.id, { result: resultPayload });
    } catch (error) {
      logger14.error(`Tool ${toolName} execution failed`, { error });
      const errorMessage = error instanceof Error ? error.message : String(error);
      const toolResultInfo = {
        toolUseId: String(message.id ?? "unknown"),
        toolName,
        result: { content: [{ type: "text", text: errorMessage }] },
        isError: true
      };
      this.emit("toolResult", toolResultInfo);
      return createJsonRpcResponse(message.id, {
        result: {
          content: [{ type: "text", text: errorMessage }],
          isError: true
        }
      });
    }
  }
  async sendControlResponse(requestId, response) {
    const controlResponse = {
      type: "control_response",
      response: {
        subtype: "success",
        request_id: requestId,
        response
      }
    };
    await this.transport.write(JSON.stringify(controlResponse));
    logger14.debug(`Sent success response for request ${requestId}`);
  }
  async sendErrorResponse(requestId, error) {
    const controlResponse = {
      type: "control_response",
      response: {
        subtype: "error",
        request_id: requestId,
        error
      }
    };
    await this.transport.write(JSON.stringify(controlResponse));
    logger14.debug(`Sent error response for request ${requestId}: ${error}`);
  }
}

// src/sdk/session-state.ts
import { EventEmitter as EventEmitter4 } from "events";
var VALID_TRANSITIONS = {
  idle: ["starting", "cancelled"],
  starting: ["running", "failed", "cancelled"],
  running: [
    "waiting_tool_call",
    "waiting_permission",
    "paused",
    "completed",
    "failed",
    "cancelled"
  ],
  waiting_tool_call: ["running", "failed", "cancelled"],
  waiting_permission: ["running", "failed", "cancelled"],
  paused: ["running", "cancelled"],
  completed: [],
  failed: [],
  cancelled: []
};

class SessionStateManager extends EventEmitter4 {
  state = "idle";
  stateInfo;
  pendingOperations = new Map;
  constructor(sessionId) {
    super();
    this.stateInfo = {
      state: "idle",
      sessionId,
      stats: {
        toolCallCount: 0,
        messageCount: 0
      }
    };
  }
  transition(newState, metadata) {
    if (!this.isValidTransition(this.state, newState)) {
      const validTargets = VALID_TRANSITIONS[this.state];
      throw new InvalidStateError(this.state, validTargets !== undefined ? Array.from(validTargets) : []);
    }
    const from = this.state;
    this.state = newState;
    this.stateInfo = {
      ...this.stateInfo,
      state: newState,
      ...metadata
    };
    if (isTerminalState(newState)) {
      this.pendingOperations.clear();
      this.stateInfo = {
        ...this.stateInfo,
        pendingToolCall: undefined,
        pendingPermission: undefined
      };
    }
    const change = {
      from,
      to: newState,
      info: this.getState(),
      timestamp: new Date().toISOString()
    };
    this.emit("stateChange", change);
  }
  startToolCall(toolUseId, toolName, serverName, args) {
    const startedAt = new Date().toISOString();
    this.pendingOperations.set(toolUseId, {
      type: "tool_call",
      id: toolUseId,
      startedAt,
      metadata: { toolName, serverName, args }
    });
    const pendingToolCall = {
      toolUseId,
      toolName,
      serverName,
      arguments: args,
      startedAt
    };
    this.transition("waiting_tool_call", {
      pendingToolCall
    });
  }
  completeToolCall(toolUseId) {
    this.pendingOperations.delete(toolUseId);
    const updatedStats = {
      ...this.stateInfo.stats,
      toolCallCount: this.stateInfo.stats.toolCallCount + 1
    };
    this.transition("running", {
      pendingToolCall: undefined,
      stats: updatedStats
    });
  }
  startPermissionRequest(requestId, toolName, input) {
    const startedAt = new Date().toISOString();
    this.pendingOperations.set(requestId, {
      type: "permission",
      id: requestId,
      startedAt,
      metadata: { toolName, input }
    });
    const pendingPermission = {
      requestId,
      toolName,
      toolInput: input
    };
    this.transition("waiting_permission", {
      pendingPermission
    });
  }
  completePermissionRequest(requestId) {
    this.pendingOperations.delete(requestId);
    this.transition("running", {
      pendingPermission: undefined
    });
  }
  incrementMessageCount() {
    const updatedStats = {
      ...this.stateInfo.stats,
      messageCount: this.stateInfo.stats.messageCount + 1
    };
    this.stateInfo = {
      ...this.stateInfo,
      stats: updatedStats
    };
  }
  markStarted() {
    const updatedStats = {
      ...this.stateInfo.stats,
      startedAt: new Date().toISOString()
    };
    this.transition("running", {
      stats: updatedStats
    });
  }
  markCompleted() {
    const updatedStats = {
      ...this.stateInfo.stats,
      completedAt: new Date().toISOString()
    };
    this.transition("completed", {
      stats: updatedStats
    });
  }
  markFailed(_error) {
    this.transition("failed");
  }
  getState() {
    return {
      ...this.stateInfo,
      stats: { ...this.stateInfo.stats },
      pendingToolCall: this.stateInfo.pendingToolCall ? { ...this.stateInfo.pendingToolCall } : undefined,
      pendingPermission: this.stateInfo.pendingPermission ? { ...this.stateInfo.pendingPermission } : undefined
    };
  }
  getCurrentState() {
    return this.state;
  }
  isTerminal() {
    return isTerminalState(this.state);
  }
  waitForState(targetState, timeout) {
    const targetStates = Array.isArray(targetState) ? targetState : [targetState];
    if (targetStates.includes(this.state)) {
      return Promise.resolve(this.getState());
    }
    return new Promise((resolve2, reject) => {
      let timeoutId;
      const stateChangeHandler = (change) => {
        if (targetStates.includes(change.to)) {
          if (timeoutId !== undefined) {
            clearTimeout(timeoutId);
          }
          this.removeListener("stateChange", stateChangeHandler);
          resolve2(change.info);
        }
      };
      this.on("stateChange", stateChangeHandler);
      if (timeout !== undefined) {
        timeoutId = setTimeout(() => {
          this.removeListener("stateChange", stateChangeHandler);
          reject(new TimeoutError(`waitForState(${targetStates.join("|")})`, timeout));
        }, timeout);
      }
    });
  }
  isValidTransition(from, to) {
    const validTargets = VALID_TRANSITIONS[from];
    if (validTargets === undefined) {
      return false;
    }
    return validTargets.includes(to);
  }
}

// src/sdk/tool-registry.ts
function tool(config) {
  return {
    name: config.name,
    description: config.description,
    inputSchema: config.inputSchema,
    handler: config.handler
  };
}
function createSdkMcpServer(options) {
  const config = {
    type: "sdk",
    name: options.name,
    ...options.version !== undefined && { version: options.version },
    tools: options.tools
  };
  return config;
}
function toJsonSchema(schema) {
  if (isJsonSchema(schema)) {
    return schema;
  }
  const properties = {};
  const required = [];
  for (const [key, type] of Object.entries(schema)) {
    properties[key] = { type };
    required.push(key);
  }
  return {
    type: "object",
    properties,
    required
  };
}

class ToolRegistry {
  tools = new Map;
  serverName;
  constructor(serverName) {
    this.serverName = serverName;
  }
  register(tool2) {
    if (this.tools.has(tool2.name)) {
      throw new Error(`Tool '${tool2.name}' is already registered in server '${this.serverName}'`);
    }
    this.tools.set(tool2.name, tool2);
  }
  get(name) {
    return this.tools.get(name);
  }
  list() {
    return Array.from(this.tools.values());
  }
  has(name) {
    return this.tools.has(name);
  }
  async handleToolCall(name, args, context) {
    const tool2 = this.tools.get(name);
    if (tool2 === undefined) {
      throw new ToolExecutionError(name, `Tool '${name}' not found in server '${this.serverName}'`);
    }
    try {
      const result = await tool2.handler(args, context);
      return result;
    } catch (error) {
      if (error instanceof ToolExecutionError) {
        throw error;
      }
      throw new ToolExecutionError(name, error instanceof Error ? error : new Error(String(error)));
    }
  }
  getToolListForMcp() {
    return Array.from(this.tools.values()).map((tool2) => ({
      name: tool2.name,
      description: tool2.description,
      inputSchema: toJsonSchema(tool2.inputSchema)
    }));
  }
}

// src/sdk/session-runner.ts
class RunningSession extends NodeEventEmitter {
  sessionId;
  stateManager;
  protocol;
  transport;
  constructor(sessionId, _agent, transport, protocol, stateManager) {
    super();
    this.sessionId = sessionId;
    this.transport = transport;
    this.protocol = protocol;
    this.stateManager = stateManager;
    this.protocol.on("message", (msg) => this.emit("message", msg));
    this.protocol.on("toolCall", (call) => this.emit("toolCall", call));
    this.protocol.on("toolResult", (result) => this.emit("toolResult", result));
    this.protocol.on("error", (err2) => this.emit("error", err2));
    this.stateManager.on("stateChange", (change) => this.emit("stateChange", change));
  }
  async* messages() {
    const queue2 = [];
    let resolve3 = null;
    let done = false;
    const onMessage = (msg) => {
      if (typeof msg === "object" && msg !== null) {
        queue2.push(msg);
        if (resolve3 !== null) {
          const r3 = resolve3;
          resolve3 = null;
          r3();
        }
      }
    };
    const onDone = () => {
      done = true;
      if (resolve3 !== null) {
        const r3 = resolve3;
        resolve3 = null;
        r3();
      }
    };
    this.protocol.on("message", onMessage);
    this.stateManager.on("stateChange", () => {
      if (this.stateManager.isTerminal()) {
        onDone();
      }
    });
    if (this.stateManager.isTerminal()) {
      return;
    }
    const checkInterval = setInterval(() => {
      if (this.stateManager.isTerminal()) {
        onDone();
      }
    }, 500);
    try {
      while (!done) {
        while (queue2.length > 0) {
          const msg = queue2.shift();
          if (msg !== undefined) {
            yield msg;
          }
          if (this.stateManager.isTerminal()) {
            return;
          }
        }
        if (done)
          break;
        await new Promise((r3) => {
          resolve3 = r3;
        });
      }
      while (queue2.length > 0) {
        const msg = queue2.shift();
        if (msg !== undefined) {
          yield msg;
        }
      }
    } finally {
      clearInterval(checkInterval);
      this.protocol.removeListener("message", onMessage);
    }
  }
  async pause() {
    this.stateManager.transition("paused");
  }
  async resume() {
    this.stateManager.transition("running");
  }
  async cancel() {
    if (this.stateManager.isTerminal()) {
      return;
    }
    try {
      await Promise.race([
        this.protocol.sendRequest({ subtype: "interrupt" }),
        new Promise((resolve3) => setTimeout(resolve3, 3000))
      ]);
    } catch {}
    try {
      if (!this.stateManager.isTerminal()) {
        this.stateManager.transition("cancelled");
      }
    } catch {}
    this.protocol.cleanup();
    await this.transport.close();
  }
  async abort() {
    if (this.stateManager.isTerminal()) {
      return;
    }
    try {
      if (!this.stateManager.isTerminal()) {
        this.stateManager.transition("cancelled");
      }
    } catch {}
    this.protocol.cleanup();
    await this.transport.close();
  }
  async interrupt() {
    if (this.stateManager.isTerminal()) {
      return;
    }
    await this.protocol.sendRequest({ subtype: "interrupt" });
  }
  getState() {
    return this.stateManager.getState();
  }
  async waitForCompletion() {
    const terminalStates = ["completed", "failed", "cancelled"];
    const finalState = await this.stateManager.waitForState(terminalStates);
    const success = finalState.state === "completed";
    const stats = {
      startedAt: finalState.stats.startedAt ?? new Date().toISOString(),
      completedAt: finalState.stats.completedAt ?? new Date().toISOString(),
      toolCallCount: finalState.stats.toolCallCount,
      messageCount: finalState.stats.messageCount
    };
    this.emit("complete", { success, stats });
    return { success, stats };
  }
}

class SessionRunner {
  options;
  toolRegistries = new Map;
  activeSessions = new Map;
  sessionIdCounter = 0;
  constructor(options) {
    this.options = options ?? {};
    this.createToolRegistries();
  }
  async startSession(config) {
    const sessionId = this.generateSessionId();
    let cleanupAttachmentFiles;
    try {
      const transportOptions = this.buildTransportOptions();
      if (config.resumeSessionId !== undefined) {
        transportOptions.resumeSessionId = config.resumeSessionId;
      }
      if (config.systemPrompt !== undefined) {
        const resolvedSystemPrompt = this.resolveSystemPrompt(config.systemPrompt);
        if (resolvedSystemPrompt !== undefined) {
          transportOptions.systemPrompt = resolvedSystemPrompt;
        }
      }
      const attachmentResolution = await this.resolveSessionAttachments(sessionId, config.attachments, config.projectPath);
      cleanupAttachmentFiles = attachmentResolution.cleanup;
      if (attachmentResolution.paths.length > 0) {
        transportOptions.attachmentPaths = attachmentResolution.paths;
      }
      const initialPrompt = this.buildInitialPromptWithAttachments(config.prompt, attachmentResolution.paths);
      const transport = new SubprocessTransport(transportOptions);
      await transport.connect();
      const protocolOptions = this.options.defaultTimeout !== undefined ? { defaultTimeout: this.options.defaultTimeout } : undefined;
      const protocol = new ControlProtocolHandler(transport, protocolOptions);
      for (const [serverName, registry] of this.toolRegistries.entries()) {
        protocol.registerToolRegistry(serverName, registry);
      }
      const stateManager = new SessionStateManager(sessionId);
      protocol.processMessages().then(() => {
        try {
          if (!stateManager.isTerminal()) {
            stateManager.markCompleted();
          }
        } catch {}
      }).catch((err2) => {
        try {
          if (!stateManager.isTerminal()) {
            stateManager.markFailed(err2 instanceof Error ? err2 : new Error(String(err2)));
          }
        } catch {}
      });
      await protocol.initialize();
      if (initialPrompt !== "") {
        await transport.write(JSON.stringify({
          type: "user",
          message: {
            role: "user",
            content: initialPrompt
          }
        }));
      }
      const session = new RunningSession(sessionId, this, transport, protocol, stateManager);
      this.activeSessions.set(sessionId, session);
      stateManager.on("stateChange", (change) => {
        if (change.to === "completed" || change.to === "failed" || change.to === "cancelled") {
          this.activeSessions.delete(sessionId);
        }
      });
      session.on("complete", () => {
        this.activeSessions.delete(sessionId);
        protocol.cleanup();
        transport.close();
        if (cleanupAttachmentFiles !== undefined) {
          cleanupAttachmentFiles();
        }
      });
      protocol.on("result", (result) => {
        if (!stateManager.isTerminal()) {
          if (result.success) {
            stateManager.markCompleted();
          } else {
            stateManager.markFailed(new Error("Session failed"));
          }
        }
      });
      stateManager.transition("starting");
      stateManager.markStarted();
      return session;
    } catch (error) {
      if (cleanupAttachmentFiles !== undefined) {
        await cleanupAttachmentFiles();
      }
      throw error;
    }
  }
  async resumeSession(sessionId, prompt2, systemPrompt, attachments) {
    const config = {
      prompt: prompt2 ?? "",
      resumeSessionId: sessionId
    };
    if (systemPrompt !== undefined) {
      config.systemPrompt = systemPrompt;
    }
    if (attachments !== undefined) {
      config.attachments = attachments;
    }
    return this.startSession(config);
  }
  async close() {
    const closeTasks = Array.from(this.activeSessions.values()).map(async (session) => {
      await session.cancel();
    });
    await Promise.all(closeTasks);
    this.activeSessions.clear();
  }
  getActiveSessions() {
    return Array.from(this.activeSessions.values());
  }
  createToolRegistries() {
    if (this.options.mcpServers === undefined) {
      return;
    }
    for (const [serverName, config] of Object.entries(this.options.mcpServers)) {
      if (isSdkServer(config)) {
        const registry = new ToolRegistry(serverName);
        for (const tool2 of config.tools) {
          registry.register(tool2);
        }
        this.toolRegistries.set(serverName, registry);
      }
    }
  }
  buildMcpConfig() {
    if (this.options.mcpServers === undefined) {
      return {};
    }
    const mcpServers = {};
    for (const [name, config] of Object.entries(this.options.mcpServers)) {
      if (isSdkServer(config)) {
        mcpServers[name] = {
          type: "sdk",
          name: config.name
        };
      } else {
        mcpServers[name] = config;
      }
    }
    return { mcpServers };
  }
  buildTransportOptions() {
    const systemPrompt = this.resolveSystemPrompt(this.options.systemPrompt);
    const options = {};
    if (this.options.mcpServers !== undefined) {
      options.mcpConfig = this.buildMcpConfig();
    }
    if (this.options.cliPath !== undefined)
      options.cliPath = this.options.cliPath;
    if (this.options.cwd !== undefined)
      options.cwd = this.options.cwd;
    const environment = toClaudeEnvironmentRecord(this.options.env);
    if (environment !== undefined)
      options.env = environment;
    if (this.options.permissionMode !== undefined)
      options.permissionMode = this.options.permissionMode;
    if (this.options.model !== undefined)
      options.model = this.options.model;
    if (this.options.effort !== undefined)
      options.effort = this.options.effort;
    if (this.options.maxBudgetUsd !== undefined)
      options.maxBudgetUsd = this.options.maxBudgetUsd;
    if (this.options.maxTurns !== undefined)
      options.maxTurns = this.options.maxTurns;
    if (systemPrompt !== undefined)
      options.systemPrompt = systemPrompt;
    if (this.options.allowedTools !== undefined)
      options.allowedTools = [...this.options.allowedTools];
    if (this.options.disallowedTools !== undefined)
      options.disallowedTools = [...this.options.disallowedTools];
    if (this.options.additionalArgs !== undefined)
      options.additionalArgs = [...this.options.additionalArgs];
    return options;
  }
  resolveSystemPrompt(value) {
    if (typeof value === "string") {
      return value;
    }
    if (value?.preset === "claude_code") {
      return value.append;
    }
    return;
  }
  generateSessionId() {
    this.sessionIdCounter += 1;
    return `sdk-session-${this.sessionIdCounter}`;
  }
  async resolveSessionAttachments(sessionId, attachments, projectPath) {
    if (attachments === undefined || attachments.length === 0) {
      return { paths: [], cleanup: undefined };
    }
    const baseDir = this.resolveAttachmentBaseDir(projectPath);
    const tempDir = resolve2(tmpdir(), "claude-code-agent", "attachments", sessionId);
    const materialized = new Set;
    const paths = [];
    for (const attachment of attachments) {
      if (attachment.path !== undefined && attachment.path !== "") {
        const resolvedPath = this.resolveAttachmentPath(attachment.path, baseDir);
        paths.push(resolvedPath);
        continue;
      }
      if (attachment.content !== undefined) {
        const fileName = this.resolveAttachmentFileName(attachment);
        const destination = resolve2(tempDir, fileName);
        await mkdir3(dirname4(destination), { recursive: true });
        const encoding = attachment.encoding ?? "utf8";
        const data = encoding === "base64" ? Buffer.from(attachment.content, "base64") : Buffer.from(attachment.content, "utf8");
        await writeFile2(destination, new Uint8Array(data));
        materialized.add(destination);
        paths.push(destination);
      }
    }
    const uniquePaths = Array.from(new Set(paths));
    if (materialized.size === 0) {
      return { paths: uniquePaths, cleanup: undefined };
    }
    const cleanup = async () => {
      await rm2(tempDir, { recursive: true, force: true });
    };
    return { paths: uniquePaths, cleanup };
  }
  buildInitialPromptWithAttachments(prompt2, attachmentPaths) {
    if (attachmentPaths.length === 0) {
      return prompt2;
    }
    const attachmentSection = [
      "",
      "Attached files:",
      ...attachmentPaths.map((path7) => `- ${path7}`)
    ].join(`
`);
    return `${prompt2}${attachmentSection}`;
  }
  resolveAttachmentBaseDir(projectPath) {
    if (projectPath !== undefined && projectPath !== "") {
      return resolve2(projectPath);
    }
    if (this.options.cwd !== undefined && this.options.cwd !== "") {
      return resolve2(this.options.cwd);
    }
    return process.cwd();
  }
  resolveAttachmentPath(pathValue, baseDir) {
    if (isAbsolute(pathValue)) {
      return pathValue;
    }
    return resolve2(baseDir, pathValue);
  }
  resolveAttachmentFileName(attachment) {
    if (attachment.fileName !== undefined && attachment.fileName !== "") {
      return attachment.fileName;
    }
    const mimeExt = this.extensionFromMimeType(attachment.mimeType);
    if (mimeExt !== undefined) {
      return `attachment${mimeExt}`;
    }
    return "attachment.bin";
  }
  extensionFromMimeType(mimeType) {
    if (mimeType === undefined || mimeType === "") {
      return;
    }
    const lower = mimeType.toLowerCase();
    if (lower === "image/png")
      return ".png";
    if (lower === "image/jpeg")
      return ".jpg";
    if (lower === "image/gif")
      return ".gif";
    if (lower === "image/webp")
      return ".webp";
    if (lower === "application/pdf")
      return ".pdf";
    if (lower === "text/plain")
      return ".txt";
    const slash = lower.indexOf("/");
    if (slash === -1)
      return;
    const subtype = lower.slice(slash + 1).split(";")[0]?.trim();
    if (subtype === undefined || subtype === "") {
      return;
    }
    const normalizedSubtype = subtype.replace(/[^a-z0-9.+-]/g, "");
    if (normalizedSubtype === "") {
      return;
    }
    return `.${normalizedSubtype}`;
  }
}

// src/sdk/agent.ts
class SdkManager {
  container;
  events;
  sessions;
  groups;
  groupRunner;
  queues;
  queueRunner;
  bookmarks;
  activity;
  constructor(container) {
    this.container = container;
    this.events = new EventEmitter2;
    this.sessions = new SessionReader(container);
    this.groups = new GroupManager(container, container.groupRepository, this.events);
    this.groupRunner = new GroupRunner(container, container.groupRepository, this.events);
    this.queues = new QueueManager(container, container.queueRepository, this.events);
    this.queueRunner = new QueueRunner(container, container.queueRepository, this.queues, this.events);
    this.bookmarks = new BookmarkManager(container, container.bookmarkRepository);
    this.activity = new ActivityManager(container.fileSystem, container.clock);
  }
  static async create(container) {
    const agent = new SdkManager(container);
    return agent;
  }
  parseMarkdown(content) {
    return parseMarkdown(content);
  }
  async getToolVersions() {
    return getToolVersions(this.container.processManager);
  }
}
// src/sdk/client.ts
import { EventEmitter as EventEmitter5 } from "events";
var logger15 = createTaggedLogger("client");

class ClaudeCodeClient extends EventEmitter5 {
  options;
  agent;
  currentSession = null;
  connectionState = "disconnected";
  constructor(options) {
    super();
    this.options = options ?? {};
    this.agent = new SessionRunner(this.options);
  }
  async connect() {
    if (this.connectionState === "connected") {
      logger15.debug("Client already connected");
      return;
    }
    if (this.connectionState === "connecting") {
      logger15.warn("Connection already in progress");
      return;
    }
    this.connectionState = "connecting";
    logger15.info("Connecting client...");
    try {
      this.connectionState = "connected";
      logger15.info("Client connected successfully");
    } catch (error) {
      this.connectionState = "disconnected";
      logger15.error("Failed to connect client", error);
      throw error;
    }
  }
  async query(prompt2, options) {
    if (this.connectionState !== "connected") {
      throw new Error("Client is not connected. Call connect() first.");
    }
    logger15.info("Sending query", { prompt: prompt2.slice(0, 50) + "..." });
    try {
      if (this.currentSession === null) {
        logger15.debug("Starting new session");
        const config = { prompt: prompt2 };
        if (options?.systemPrompt !== undefined) {
          config.systemPrompt = options.systemPrompt;
        }
        this.currentSession = await this.agent.startSession(config);
        this.forwardSessionEvents(this.currentSession);
      } else {
        logger15.warn("Multi-turn continuation not yet implemented, starting new session");
        await this.currentSession.cancel();
        this.currentSession = null;
        const config = { prompt: prompt2 };
        if (options?.systemPrompt !== undefined) {
          config.systemPrompt = options.systemPrompt;
        }
        this.currentSession = await this.agent.startSession(config);
        this.forwardSessionEvents(this.currentSession);
      }
    } catch (error) {
      logger15.error("Failed to send query", error);
      if (this.options.reconnectOnError === true) {
        logger15.info("Attempting reconnection...");
        await this.reconnect();
        await this.query(prompt2, options);
      } else {
        throw error;
      }
    }
  }
  async* receiveResponse() {
    if (this.currentSession === null) {
      throw new Error("No active session. Call query() first.");
    }
    logger15.debug("Receiving response from session", {
      sessionId: this.currentSession.sessionId
    });
    try {
      for await (const message of this.currentSession.messages()) {
        yield message;
      }
    } catch (error) {
      logger15.error("Error receiving response", error);
      throw error;
    } finally {
      if (this.options.keepAlive !== true) {
        logger15.debug("Closing session (keepAlive=false)");
        this.currentSession = null;
      }
    }
  }
  async disconnect() {
    if (this.connectionState === "disconnected") {
      logger15.debug("Client already disconnected");
      return;
    }
    logger15.info("Disconnecting client...");
    try {
      if (this.currentSession !== null) {
        logger15.debug("Cancelling active session");
        await this.currentSession.cancel();
        this.currentSession = null;
      }
      await this.agent.close();
      this.connectionState = "disconnected";
      logger15.info("Client disconnected successfully");
    } catch (error) {
      logger15.error("Error during disconnect", error);
      this.connectionState = "disconnected";
      throw error;
    }
  }
  isConnected() {
    return this.connectionState === "connected";
  }
  getState() {
    if (this.currentSession === null) {
      return null;
    }
    return this.currentSession.getState();
  }
  forwardSessionEvents(session) {
    session.on("message", (msg) => this.emit("message", msg));
    session.on("toolCall", (call) => this.emit("toolCall", call));
    session.on("toolResult", (result) => this.emit("toolResult", result));
    session.on("stateChange", (change) => this.emit("stateChange", change));
    session.on("complete", (result) => this.emit("complete", result));
    session.on("error", (error) => this.emit("error", error));
  }
  async reconnect() {
    logger15.info("Reconnecting client...");
    await this.agent.close();
    this.agent = new SessionRunner(this.options);
    this.currentSession = null;
    this.connectionState = "connected";
    logger15.info("Reconnection successful");
  }
}
// src/test/mocks/filesystem.ts
class MockFileSystem {
  files = new Map;
  directories = new Set(["/"]);
  watchCallbacks = new Map;
  currentTime;
  constructor(initialTime = Date.now()) {
    this.currentTime = initialTime;
  }
  setTime(time) {
    this.currentTime = time;
  }
  advanceTime(ms) {
    this.currentTime += ms;
  }
  setFile(path7, content) {
    const normalizedPath = this.normalizePath(path7);
    const parentDir = this.getParentPath(normalizedPath);
    this.ensureDirectoryExists(parentDir);
    const existingEntry = this.files.get(normalizedPath);
    this.files.set(normalizedPath, {
      content,
      mtimeMs: this.currentTime,
      ctimeMs: existingEntry?.ctimeMs ?? this.currentTime
    });
  }
  getFile(path7) {
    const normalizedPath = this.normalizePath(path7);
    const entry = this.files.get(normalizedPath);
    return entry?.content;
  }
  clearFiles() {
    this.files.clear();
    this.directories.clear();
    this.directories.add("/");
  }
  getFiles() {
    const result = new Map;
    for (const [path7, entry] of this.files) {
      result.set(path7, entry.content);
    }
    return result;
  }
  writeFileSync(path7, content) {
    this.setFile(path7, content);
  }
  appendFileSync(path7, content) {
    const normalizedPath = this.normalizePath(path7);
    const entry = this.files.get(normalizedPath);
    if (entry === undefined) {
      this.setFile(path7, content);
    } else {
      this.files.set(normalizedPath, {
        content: entry.content + content,
        mtimeMs: this.currentTime,
        ctimeMs: entry.ctimeMs
      });
    }
    this.emitWatchEvent(path7, { eventType: "change", filename: path7 });
  }
  setDirectory(path7) {
    this.ensureDirectoryExists(this.normalizePath(path7));
  }
  emitWatchEvent(path7, event) {
    const normalizedPath = this.normalizePath(path7);
    const callbacks = this.watchCallbacks.get(normalizedPath);
    if (callbacks !== undefined) {
      for (const callback of callbacks) {
        callback(event);
      }
    }
  }
  async readFile(path7) {
    const normalizedPath = this.normalizePath(path7);
    const entry = this.files.get(normalizedPath);
    if (entry === undefined) {
      throw new FileNotFoundError(path7);
    }
    return entry.content;
  }
  async writeFile(path7, content) {
    this.setFile(path7, content);
  }
  async exists(path7) {
    const normalizedPath = this.normalizePath(path7);
    return this.files.has(normalizedPath) || this.directories.has(normalizedPath);
  }
  async readDir(path7) {
    const normalizedPath = this.normalizePath(path7);
    if (!this.directories.has(normalizedPath)) {
      throw new FileNotFoundError(path7);
    }
    const entries = [];
    const prefix = normalizedPath === "/" ? "/" : normalizedPath + "/";
    for (const filePath of this.files.keys()) {
      if (filePath.startsWith(prefix)) {
        const relativePath = filePath.slice(prefix.length);
        const firstSlash = relativePath.indexOf("/");
        const entryName = firstSlash === -1 ? relativePath : relativePath.slice(0, firstSlash);
        if (entryName.length > 0 && !entries.includes(entryName)) {
          entries.push(entryName);
        }
      }
    }
    for (const dirPath of this.directories) {
      if (dirPath !== normalizedPath && dirPath.startsWith(prefix)) {
        const relativePath = dirPath.slice(prefix.length);
        const firstSlash = relativePath.indexOf("/");
        const entryName = firstSlash === -1 ? relativePath : relativePath.slice(0, firstSlash);
        if (entryName.length > 0 && !entries.includes(entryName)) {
          entries.push(entryName);
        }
      }
    }
    return entries.sort();
  }
  watch(path7) {
    const normalizedPath = this.normalizePath(path7);
    const self = this;
    return {
      [Symbol.asyncIterator]() {
        const queue2 = [];
        let resolver = null;
        let done = false;
        const callback = (event) => {
          if (done)
            return;
          if (resolver !== null) {
            const r3 = resolver;
            resolver = null;
            r3({ value: event, done: false });
          } else {
            queue2.push(event);
          }
        };
        const callbacks = self.watchCallbacks.get(normalizedPath);
        if (callbacks !== undefined) {
          callbacks.push(callback);
        } else {
          self.watchCallbacks.set(normalizedPath, [callback]);
        }
        return {
          async next() {
            if (done) {
              return { value: undefined, done: true };
            }
            const queued = queue2.shift();
            if (queued !== undefined) {
              return { value: queued, done: false };
            }
            return new Promise((resolve3) => {
              resolver = resolve3;
            });
          },
          async return() {
            done = true;
            const cbs = self.watchCallbacks.get(normalizedPath);
            if (cbs !== undefined) {
              const index = cbs.indexOf(callback);
              if (index !== -1) {
                cbs.splice(index, 1);
              }
            }
            return { value: undefined, done: true };
          }
        };
      }
    };
  }
  async stat(path7) {
    const normalizedPath = this.normalizePath(path7);
    const entry = this.files.get(normalizedPath);
    if (entry !== undefined) {
      return {
        size: Buffer.byteLength(entry.content, "utf-8"),
        mtimeMs: entry.mtimeMs,
        ctimeMs: entry.ctimeMs,
        isFile: true,
        isDirectory: false
      };
    }
    if (this.directories.has(normalizedPath)) {
      return {
        size: 0,
        mtimeMs: this.currentTime,
        ctimeMs: this.currentTime,
        isFile: false,
        isDirectory: true
      };
    }
    throw new FileNotFoundError(path7);
  }
  async mkdir(path7, options) {
    const normalizedPath = this.normalizePath(path7);
    if (options?.recursive === true) {
      this.ensureDirectoryExists(normalizedPath);
    } else {
      const parentPath = this.getParentPath(normalizedPath);
      if (parentPath !== "/" && !this.directories.has(parentPath)) {
        throw new FileNotFoundError(parentPath);
      }
      this.directories.add(normalizedPath);
    }
  }
  async rm(path7, options) {
    const normalizedPath = this.normalizePath(path7);
    if (this.files.has(normalizedPath)) {
      this.files.delete(normalizedPath);
      return;
    }
    if (this.directories.has(normalizedPath)) {
      if (options?.recursive === true) {
        const prefix = normalizedPath === "/" ? "/" : normalizedPath + "/";
        for (const filePath of [...this.files.keys()]) {
          if (filePath.startsWith(prefix)) {
            this.files.delete(filePath);
          }
        }
        for (const dirPath of [...this.directories]) {
          if (dirPath.startsWith(prefix) || dirPath === normalizedPath) {
            this.directories.delete(dirPath);
          }
        }
      } else {
        const prefix = normalizedPath === "/" ? "/" : normalizedPath + "/";
        for (const filePath of this.files.keys()) {
          if (filePath.startsWith(prefix)) {
            throw new Error(`Directory not empty: ${path7}`);
          }
        }
        for (const dirPath of this.directories) {
          if (dirPath !== normalizedPath && dirPath.startsWith(prefix)) {
            throw new Error(`Directory not empty: ${path7}`);
          }
        }
        this.directories.delete(normalizedPath);
      }
      return;
    }
    if (options?.force !== true) {
      throw new FileNotFoundError(path7);
    }
  }
  normalizePath(path7) {
    let normalized = path7.replace(/\/+$/, "") || "/";
    if (!normalized.startsWith("/")) {
      normalized = "/" + normalized;
    }
    return normalized;
  }
  getParentPath(path7) {
    const lastSlash = path7.lastIndexOf("/");
    if (lastSlash <= 0) {
      return "/";
    }
    return path7.slice(0, lastSlash);
  }
  ensureDirectoryExists(path7) {
    if (path7 === "/" || this.directories.has(path7)) {
      return;
    }
    const parentPath = this.getParentPath(path7);
    this.ensureDirectoryExists(parentPath);
    this.directories.add(path7);
  }
}

// src/test/mocks/process-manager.ts
var defaultMockProcessConfig = {
  pid: 1,
  stdout: [],
  stderr: [],
  exitCode: 0,
  lineDelay: 0,
  exitDelay: 0
};

class MockManagedProcess {
  pid;
  config;
  killed = false;
  killSignal;
  constructor(config = {}) {
    this.config = { ...defaultMockProcessConfig, ...config };
    this.pid = this.config.pid;
  }
  wasKilled() {
    return this.killed;
  }
  getKillSignal() {
    return this.killSignal;
  }
  get stdout() {
    const lines = this.config.stdout ?? [];
    const delay = this.config.lineDelay ?? 0;
    const self = this;
    return {
      [Symbol.asyncIterator]() {
        let index = 0;
        return {
          async next() {
            if (self.killed) {
              return { value: undefined, done: true };
            }
            if (index >= lines.length) {
              return { value: undefined, done: true };
            }
            if (delay > 0) {
              await new Promise((resolve3) => setTimeout(resolve3, delay));
            }
            const line = lines[index];
            if (line === undefined) {
              return { value: undefined, done: true };
            }
            index++;
            return { value: line, done: false };
          }
        };
      }
    };
  }
  get stderr() {
    const lines = this.config.stderr ?? [];
    const delay = this.config.lineDelay ?? 0;
    const self = this;
    return {
      [Symbol.asyncIterator]() {
        let index = 0;
        return {
          async next() {
            if (self.killed) {
              return { value: undefined, done: true };
            }
            if (index >= lines.length) {
              return { value: undefined, done: true };
            }
            if (delay > 0) {
              await new Promise((resolve3) => setTimeout(resolve3, delay));
            }
            const line = lines[index];
            if (line === undefined) {
              return { value: undefined, done: true };
            }
            index++;
            return { value: line, done: false };
          }
        };
      }
    };
  }
  get exitCode() {
    const exitDelay = this.config.exitDelay ?? 0;
    const exitCodeValue = this.config.exitCode;
    return new Promise((resolve3) => {
      if (this.killed) {
        setImmediate(() => resolve3(null));
        return;
      }
      if (exitDelay > 0) {
        const checkInterval = 10;
        let elapsed = 0;
        const intervalId = setInterval(() => {
          elapsed += checkInterval;
          if (this.killed) {
            clearInterval(intervalId);
            resolve3(null);
          } else if (elapsed >= exitDelay) {
            clearInterval(intervalId);
            resolve3(exitCodeValue);
          }
        }, checkInterval);
      } else {
        setImmediate(() => {
          resolve3(this.killed ? null : exitCodeValue);
        });
      }
    });
  }
  kill(signal) {
    this.killed = true;
    this.killSignal = signal ?? "SIGTERM";
  }
}

class MockProcessManager {
  spawnHistory = [];
  processConfigs = new Map;
  defaultConfig = { ...defaultMockProcessConfig };
  nextPid = 1;
  killedPids = new Map;
  setProcessConfig(command, config) {
    const existing = this.processConfigs.get(command);
    const fullConfig = {
      ...defaultMockProcessConfig,
      ...config,
      pid: config.pid ?? this.nextPid++
    };
    if (existing !== undefined) {
      existing.push(fullConfig);
    } else {
      this.processConfigs.set(command, [fullConfig]);
    }
  }
  setDefaultConfig(config) {
    this.defaultConfig = { ...defaultMockProcessConfig, ...config };
  }
  getSpawnHistory() {
    return this.spawnHistory;
  }
  clear() {
    this.spawnHistory.length = 0;
    this.processConfigs.clear();
    this.killedPids.clear();
    this.nextPid = 1;
    this.defaultConfig = { ...defaultMockProcessConfig };
  }
  wasKilled(pid) {
    return this.killedPids.get(pid);
  }
  spawn(command, args, options) {
    let config;
    const commandConfigs = this.processConfigs.get(command);
    if (commandConfigs !== undefined && commandConfigs.length > 0) {
      const shifted = commandConfigs.shift();
      if (shifted !== undefined) {
        config = shifted;
      } else {
        config = { ...this.defaultConfig, pid: this.nextPid++ };
      }
    } else {
      config = { ...this.defaultConfig, pid: this.nextPid++ };
    }
    const process2 = new MockManagedProcess(config);
    this.spawnHistory.push({
      command,
      args,
      options,
      process: process2
    });
    return process2;
  }
  async kill(pid, signal) {
    const signalToUse = signal ?? "SIGTERM";
    this.killedPids.set(pid, signalToUse);
    for (const record of this.spawnHistory) {
      if (record.process.pid === pid && !record.process.wasKilled()) {
        record.process.kill(signalToUse);
        return;
      }
    }
  }
}

// src/test/mocks/clock.ts
class MockClock {
  currentTime;
  sleepResolvers = [];
  autoAdvance = false;
  constructor(initialTime = new Date("2026-01-01T00:00:00.000Z")) {
    this.currentTime = new Date(initialTime.getTime());
  }
  now() {
    return new Date(this.currentTime.getTime());
  }
  timestamp() {
    return this.currentTime.toISOString();
  }
  async sleep(ms) {
    if (this.autoAdvance) {
      this.currentTime = new Date(this.currentTime.getTime() + ms);
      return;
    }
    return new Promise((resolve3) => {
      this.sleepResolvers.push({ ms, resolve: resolve3 });
    });
  }
  setTime(time) {
    this.currentTime = new Date(time.getTime());
  }
  setTimeFromString(isoString) {
    this.currentTime = new Date(isoString);
  }
  advance(ms) {
    this.currentTime = new Date(this.currentTime.getTime() + ms);
    let remaining = ms;
    while (remaining > 0 && this.sleepResolvers.length > 0) {
      const next = this.sleepResolvers[0];
      if (next === undefined)
        break;
      if (next.ms <= remaining) {
        remaining -= next.ms;
        this.sleepResolvers.shift();
        next.resolve();
      } else {
        next.ms -= remaining;
        remaining = 0;
      }
    }
  }
  advanceToNextSleep() {
    if (this.sleepResolvers.length === 0) {
      return;
    }
    const next = this.sleepResolvers[0];
    if (next !== undefined) {
      this.advance(next.ms);
    }
  }
  flushAllSleeps() {
    let totalMs = 0;
    for (const resolver of this.sleepResolvers) {
      totalMs += resolver.ms;
      resolver.resolve();
    }
    this.currentTime = new Date(this.currentTime.getTime() + totalMs);
    this.sleepResolvers = [];
  }
  getPendingSleepCount() {
    return this.sleepResolvers.length;
  }
  enableAutoAdvance() {
    this.autoAdvance = true;
    this.flushAllSleeps();
  }
  disableAutoAdvance() {
    this.autoAdvance = false;
  }
  isAutoAdvanceEnabled() {
    return this.autoAdvance;
  }
  getTimeMs() {
    return this.currentTime.getTime();
  }
}

// src/test/mocks/lock.ts
class MockLockHandle {
  lockPath;
  onRelease;
  held = true;
  constructor(lockPath, onRelease) {
    this.lockPath = lockPath;
    this.onRelease = onRelease;
  }
  async release() {
    if (this.held) {
      this.held = false;
      this.onRelease();
    }
  }
  isHeld() {
    return this.held;
  }
}

class MockFileLockService {
  locks = new Map;
  behaviors = new Map;
  contentionPaths = new Set;
  setLockBehavior(path7, behavior) {
    this.behaviors.set(this.normalizePath(path7), behavior);
  }
  simulateContention(path7) {
    const normalized = this.normalizePath(path7);
    this.contentionPaths.add(normalized);
  }
  clearContention(path7) {
    const normalized = this.normalizePath(path7);
    this.contentionPaths.delete(normalized);
  }
  reset() {
    this.locks.clear();
    this.behaviors.clear();
    this.contentionPaths.clear();
  }
  getActiveLocks() {
    return new Map(this.locks);
  }
  async acquire(resourcePath, _options) {
    const normalizedPath = this.normalizePath(resourcePath);
    if (this.contentionPaths.has(normalizedPath)) {
      return {
        success: false,
        reason: "locked",
        message: `Resource is locked: ${resourcePath}`
      };
    }
    if (this.locks.has(normalizedPath)) {
      return {
        success: false,
        reason: "locked",
        message: `Resource is already locked: ${resourcePath}`
      };
    }
    const behavior = this.behaviors.get(normalizedPath) ?? "success";
    switch (behavior) {
      case "timeout":
        return {
          success: false,
          reason: "timeout",
          message: `Lock acquisition timed out for: ${resourcePath}`
        };
      case "error":
        return {
          success: false,
          reason: "error",
          message: `Error acquiring lock for: ${resourcePath}`
        };
      case "success": {
        const handle = new MockLockHandle(resourcePath, () => {
          this.locks.delete(normalizedPath);
        });
        this.locks.set(normalizedPath, handle);
        return {
          success: true,
          handle
        };
      }
      default: {
        const _exhaustive = behavior;
        throw new Error(`Unhandled behavior: ${_exhaustive}`);
      }
    }
  }
  async withLock(resourcePath, fn, options) {
    const result = await this.acquire(resourcePath, options);
    if (!result.success) {
      throw new Error(`Failed to acquire lock: ${result.reason} - ${result.message}`);
    }
    try {
      return await fn();
    } finally {
      await result.handle.release();
    }
  }
  async isLocked(resourcePath) {
    const normalizedPath = this.normalizePath(resourcePath);
    return this.locks.has(normalizedPath) || this.contentionPaths.has(normalizedPath);
  }
  normalizePath(path7) {
    return path7.replace(/\/+$/, "") || "/";
  }
}
// src/repository/in-memory/bookmark-repository.ts
class InMemoryBookmarkRepository {
  bookmarks = new Map;
  async findById(id) {
    return this.bookmarks.get(id) ?? null;
  }
  async findBySession(sessionId) {
    return Array.from(this.bookmarks.values()).filter((bookmark) => bookmark.sessionId === sessionId);
  }
  async findByTag(tag) {
    return Array.from(this.bookmarks.values()).filter((bookmark) => bookmark.tags.includes(tag));
  }
  async list(filter2, sort) {
    let results = Array.from(this.bookmarks.values());
    if (filter2) {
      results = results.filter((bookmark) => {
        if (filter2.type !== undefined && bookmark.type !== filter2.type) {
          return false;
        }
        if (filter2.sessionId !== undefined && bookmark.sessionId !== filter2.sessionId) {
          return false;
        }
        if (filter2.tags !== undefined && filter2.tags.length > 0) {
          const hasAllTags = filter2.tags.every((tag) => bookmark.tags.includes(tag));
          if (!hasAllTags) {
            return false;
          }
        }
        if (filter2.nameContains !== undefined && !bookmark.name.toLowerCase().includes(filter2.nameContains.toLowerCase())) {
          return false;
        }
        if (filter2.since !== undefined) {
          const sinceDate = typeof filter2.since === "string" ? new Date(filter2.since) : filter2.since;
          const createdDate = new Date(bookmark.createdAt);
          if (createdDate < sinceDate) {
            return false;
          }
        }
        return true;
      });
    }
    if (sort) {
      results.sort((a2, b2) => {
        const aValue = a2[sort.field];
        const bValue = b2[sort.field];
        let comparison = 0;
        if (aValue < bValue) {
          comparison = -1;
        } else if (aValue > bValue) {
          comparison = 1;
        }
        return sort.direction === "asc" ? comparison : -comparison;
      });
    }
    if (filter2?.offset !== undefined) {
      results = results.slice(filter2.offset);
    }
    if (filter2?.limit !== undefined) {
      results = results.slice(0, filter2.limit);
    }
    return results;
  }
  async search(options) {
    const query = options.query.toLowerCase();
    const results = [];
    const bookmarks = Array.from(this.bookmarks.values());
    for (const bookmark of bookmarks) {
      if (bookmark.name.toLowerCase().includes(query)) {
        results.push(bookmark);
        continue;
      }
      if (bookmark.description?.toLowerCase()?.includes(query) ?? false) {
        results.push(bookmark);
        continue;
      }
      const matchesTag = bookmark.tags.some((tag) => tag.toLowerCase().includes(query));
      if (matchesTag) {
        results.push(bookmark);
      }
    }
    results.sort((a2, b2) => {
      const aExactName = a2.name.toLowerCase() === query;
      const bExactName = b2.name.toLowerCase() === query;
      if (aExactName && !bExactName)
        return -1;
      if (!aExactName && bExactName)
        return 1;
      return a2.name.localeCompare(b2.name);
    });
    if (options.limit !== undefined) {
      return results.slice(0, options.limit);
    }
    return results;
  }
  async save(bookmark) {
    this.bookmarks.set(bookmark.id, bookmark);
  }
  async update(id, updates) {
    const existing = this.bookmarks.get(id);
    if (existing === undefined) {
      throw new Error(`Bookmark not found: ${id}`);
    }
    const updated = {
      ...existing,
      ...updates,
      id
    };
    this.bookmarks.set(id, updated);
  }
  async delete(id) {
    return this.bookmarks.delete(id);
  }
  async getAllTags() {
    const tags = new Set;
    const bookmarks = Array.from(this.bookmarks.values());
    for (const bookmark of bookmarks) {
      for (const tag of bookmark.tags) {
        tags.add(tag);
      }
    }
    return Array.from(tags).sort();
  }
  async count(filter2) {
    return (await this.list(filter2)).length;
  }
  clear() {
    this.bookmarks.clear();
  }
}
// src/repository/in-memory/group-repository.ts
class InMemoryGroupRepository {
  groups = new Map;
  async findById(id) {
    return this.groups.get(id) ?? null;
  }
  async findByStatus(status) {
    return Array.from(this.groups.values()).filter((group) => group.status === status);
  }
  async list(filter2, sort) {
    let results = Array.from(this.groups.values());
    if (filter2) {
      results = this.applyFilter(results, filter2);
    }
    if (sort) {
      results = this.applySort(results, sort);
    }
    return results;
  }
  async save(group) {
    this.groups.set(group.id, group);
  }
  async delete(id) {
    return this.groups.delete(id);
  }
  async updateSession(groupId, sessionId, updates) {
    const group = this.groups.get(groupId);
    if (!group) {
      return false;
    }
    const sessionIndex = group.sessions.findIndex((s2) => s2.id === sessionId);
    if (sessionIndex === -1) {
      return false;
    }
    const currentSession = group.sessions[sessionIndex];
    if (!currentSession) {
      return false;
    }
    const updatedSession = {
      ...currentSession,
      ...updates
    };
    const updatedSessions = [...group.sessions];
    updatedSessions[sessionIndex] = updatedSession;
    const updatedGroup = {
      ...group,
      sessions: updatedSessions,
      updatedAt: new Date().toISOString()
    };
    this.groups.set(groupId, updatedGroup);
    return true;
  }
  async count(filter2) {
    if (!filter2) {
      return this.groups.size;
    }
    const filtered = this.applyFilter(Array.from(this.groups.values()), filter2);
    return filtered.length;
  }
  clear() {
    this.groups.clear();
  }
  applyFilter(groups, filter2) {
    let results = groups;
    if (filter2.status !== undefined) {
      results = results.filter((g3) => g3.status === filter2.status);
    }
    if (filter2.nameContains !== undefined) {
      const searchTerm = filter2.nameContains.toLowerCase();
      results = results.filter((g3) => g3.name.toLowerCase().includes(searchTerm));
    }
    if (filter2.since !== undefined) {
      const sinceTime = filter2.since.getTime();
      results = results.filter((g3) => new Date(g3.createdAt).getTime() >= sinceTime);
    }
    if (filter2.offset !== undefined) {
      results = results.slice(filter2.offset);
    }
    if (filter2.limit !== undefined) {
      results = results.slice(0, filter2.limit);
    }
    return results;
  }
  applySort(groups, sort) {
    const sorted = [...groups];
    const direction = sort.direction === "asc" ? 1 : -1;
    sorted.sort((a2, b2) => {
      let compareValue = 0;
      switch (sort.field) {
        case "name":
          compareValue = a2.name.localeCompare(b2.name);
          break;
        case "createdAt":
          compareValue = new Date(a2.createdAt).getTime() - new Date(b2.createdAt).getTime();
          break;
        case "updatedAt":
          compareValue = new Date(a2.updatedAt).getTime() - new Date(b2.updatedAt).getTime();
          break;
      }
      return compareValue * direction;
    });
    return sorted;
  }
}
// node_modules/nanoid/index.js
import { webcrypto as crypto2 } from "crypto";

// node_modules/nanoid/url-alphabet/index.js
var urlAlphabet = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";

// node_modules/nanoid/index.js
var POOL_SIZE_MULTIPLIER = 128;
var pool;
var poolOffset;
function fillPool(bytes) {
  if (!pool || pool.length < bytes) {
    pool = Buffer.allocUnsafe(bytes * POOL_SIZE_MULTIPLIER);
    crypto2.getRandomValues(pool);
    poolOffset = 0;
  } else if (poolOffset + bytes > pool.length) {
    crypto2.getRandomValues(pool);
    poolOffset = 0;
  }
  poolOffset += bytes;
}
function nanoid(size = 21) {
  fillPool(size |= 0);
  let id = "";
  for (let i2 = poolOffset - size;i2 < poolOffset; i2++) {
    id += urlAlphabet[pool[i2] & 63];
  }
  return id;
}

// src/repository/in-memory/queue-repository.ts
class InMemoryQueueRepository {
  queues = new Map;
  async findById(id) {
    return this.queues.get(id) ?? null;
  }
  async findByProject(projectPath) {
    return Array.from(this.queues.values()).filter((queue2) => queue2.projectPath === projectPath);
  }
  async findByStatus(status) {
    return Array.from(this.queues.values()).filter((queue2) => queue2.status === status);
  }
  async list(filter2, sort) {
    let results = Array.from(this.queues.values());
    if (filter2) {
      results = this.applyFilter(results, filter2);
    }
    if (sort) {
      results = this.applySort(results, sort);
    }
    return results;
  }
  async save(queue2) {
    this.queues.set(queue2.id, queue2);
  }
  async delete(id) {
    return this.queues.delete(id);
  }
  updateQueue(queueId, update) {
    const queue2 = this.queues.get(queueId);
    if (!queue2) {
      return false;
    }
    const updatedQueue = update(queue2);
    if (updatedQueue === null) {
      return false;
    }
    this.queues.set(queueId, updatedQueue);
    return true;
  }
  async addCommand(queueId, command, position) {
    return this.updateQueue(queueId, (queue2) => {
      const newCommand = {
        id: `cmd-${nanoid(12)}`,
        status: "pending",
        ...command
      };
      const commands = [...queue2.commands];
      const insertPos = position ?? commands.length;
      commands.splice(insertPos, 0, newCommand);
      return {
        ...queue2,
        commands,
        updatedAt: new Date().toISOString()
      };
    });
  }
  async updateCommand(queueId, commandIndex, updates) {
    return this.updateQueue(queueId, (queue2) => {
      if (commandIndex < 0 || commandIndex >= queue2.commands.length) {
        return null;
      }
      const currentCommand = queue2.commands[commandIndex];
      if (!currentCommand) {
        return null;
      }
      const updatedCommand = {
        ...currentCommand,
        ...updates.prompt !== undefined && { prompt: updates.prompt },
        ...updates.sessionMode !== undefined && {
          sessionMode: updates.sessionMode
        }
      };
      const commands = [...queue2.commands];
      commands[commandIndex] = updatedCommand;
      return {
        ...queue2,
        commands,
        updatedAt: new Date().toISOString()
      };
    });
  }
  async removeCommand(queueId, commandIndex) {
    return this.updateQueue(queueId, (queue2) => {
      if (commandIndex < 0 || commandIndex >= queue2.commands.length) {
        return null;
      }
      const commands = [...queue2.commands];
      commands.splice(commandIndex, 1);
      return {
        ...queue2,
        commands,
        updatedAt: new Date().toISOString()
      };
    });
  }
  async reorderCommand(queueId, fromIndex, toIndex) {
    return this.updateQueue(queueId, (queue2) => {
      if (fromIndex < 0 || fromIndex >= queue2.commands.length || toIndex < 0 || toIndex >= queue2.commands.length) {
        return null;
      }
      const commands = [...queue2.commands];
      const [movedCommand] = commands.splice(fromIndex, 1);
      if (!movedCommand) {
        return null;
      }
      commands.splice(toIndex, 0, movedCommand);
      return {
        ...queue2,
        commands,
        updatedAt: new Date().toISOString()
      };
    });
  }
  async count(filter2) {
    if (!filter2) {
      return this.queues.size;
    }
    const filtered = this.applyFilter(Array.from(this.queues.values()), filter2);
    return filtered.length;
  }
  clear() {
    this.queues.clear();
  }
  applyFilter(queues, filter2) {
    let results = queues;
    if (filter2.projectPath !== undefined) {
      results = results.filter((q2) => q2.projectPath === filter2.projectPath);
    }
    if (filter2.status !== undefined) {
      results = results.filter((q2) => q2.status === filter2.status);
    }
    if (filter2.nameContains !== undefined) {
      const searchTerm = filter2.nameContains.toLowerCase();
      results = results.filter((q2) => q2.name.toLowerCase().includes(searchTerm));
    }
    if (filter2.since !== undefined) {
      const sinceTime = filter2.since.getTime();
      results = results.filter((q2) => new Date(q2.createdAt).getTime() >= sinceTime);
    }
    if (filter2.offset !== undefined) {
      results = results.slice(filter2.offset);
    }
    if (filter2.limit !== undefined) {
      results = results.slice(0, filter2.limit);
    }
    return results;
  }
  applySort(queues, sort) {
    const sorted = [...queues];
    const direction = sort.direction === "asc" ? 1 : -1;
    sorted.sort((a2, b2) => {
      let compareValue = 0;
      switch (sort.field) {
        case "name":
          compareValue = a2.name.localeCompare(b2.name);
          break;
        case "createdAt":
          compareValue = new Date(a2.createdAt).getTime() - new Date(b2.createdAt).getTime();
          break;
        case "updatedAt":
          compareValue = new Date(a2.updatedAt).getTime() - new Date(b2.updatedAt).getTime();
          break;
        case "totalCostUsd":
          compareValue = a2.totalCostUsd - b2.totalCostUsd;
          break;
      }
      return compareValue * direction;
    });
    return sorted;
  }
}
// src/container.ts
function createProductionContainer() {
  const fs2 = new BunFileSystem;
  const clock = new SystemClock;
  return {
    fileSystem: fs2,
    processManager: new BunProcessManager,
    clock,
    fileLockService: new FileLockServiceImpl(fs2, clock),
    atomicWriter: new AtomicWriter(fs2),
    groupRepository: new InMemoryGroupRepository,
    queueRepository: new InMemoryQueueRepository,
    bookmarkRepository: new InMemoryBookmarkRepository
  };
}
function createTestContainer(overrides) {
  const fs2 = new MockFileSystem;
  const clock = new MockClock;
  const defaults2 = {
    fileSystem: fs2,
    processManager: new MockProcessManager,
    clock,
    fileLockService: new MockFileLockService,
    atomicWriter: new AtomicWriter(fs2),
    groupRepository: new InMemoryGroupRepository,
    queueRepository: new InMemoryQueueRepository,
    bookmarkRepository: new InMemoryBookmarkRepository
  };
  return {
    ...defaults2,
    ...overrides
  };
}
export {
  verifyClaudeReadiness,
  tool,
  toJsonl,
  toJsonSchema,
  toJsonLine,
  toClaudeEnvironmentRecord,
  parseMarkdown,
  parseJsonlWithRecovery,
  parseJsonlStream,
  parseJsonl,
  parseJsonLine,
  isValidSessionState,
  isValidMcpServerConfig,
  isToolResultContent,
  isToolResult,
  isToolExecutionError,
  isTimeoutError,
  isTerminalState,
  isTerminalGroupStatus,
  isStdioServer,
  isSimpleSchema,
  isSdkServer,
  isJsonSchema,
  isInvalidStateError,
  isHttpServer,
  isControlProtocolError,
  isClaudeCodeAgentError,
  isCLINotFoundError,
  isCLIConnectionError,
  isBudgetWarning,
  isBudgetExceeded,
  isActiveGroup,
  getToolVersions,
  defineClaudeEnvironment,
  createTestContainer,
  createSessionReceiver,
  createSessionProgress,
  createSdkMcpServer,
  createProductionContainer,
  createMockSessionReceiver,
  createMockClaudeSessionRunner,
  createEventEmitter,
  canResumeGroup,
  calculateBudgetUsage,
  ToolRegistry,
  ToolExecutionError,
  TimeoutError,
  SessionUpdateReceiver,
  SessionRunner,
  SessionReader,
  SdkManager,
  RunningSession,
  QueueRunner,
  QueueManager,
  ProgressAggregator,
  MockSessionUpdateReceiver,
  MockClaudeSessionRunner,
  MockClaudeRunningSession,
  InvalidStateError,
  GroupRunner,
  GroupManager,
  FileChangeService,
  FileChangeIndex,
  FileChangeExtractor,
  EventEmitter2 as EventEmitter,
  DependencyGraph,
  DEFAULT_SESSION_CONFIG,
  DEFAULT_GROUP_CONFIG,
  DEFAULT_CONCURRENCY_CONFIG,
  DEFAULT_BUDGET_CONFIG,
  ControlProtocolError,
  ConfigGenerator,
  ClaudeEnvironment,
  ClaudeCodeClient,
  ClaudeCodeAgentError,
  CLINotFoundError,
  CLIConnectionError,
  BookmarkManager,
  ActivityManager
};
