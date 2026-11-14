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

// src/interfaces/bun-filesystem.ts
import * as fs from "fs/promises";
import * as path from "path";
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
    const dir = path.dirname(filePath);
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
        const queue = [];
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
            const r = resolver;
            resolver = null;
            r({ value: event, done: false });
          } else {
            queue.push(event);
          }
        });
        return {
          async next() {
            if (closed) {
              return { value: undefined, done: true };
            }
            const queued = queue.shift();
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

// src/interfaces/bun-process-manager.ts
class BunManagedProcess {
  pid;
  subprocess;
  constructor(subprocess) {
    this.subprocess = subprocess;
    this.pid = subprocess.pid;
  }
  get stdout() {
    const stdout = this.subprocess.stdout;
    if (stdout === null) {
      return emptyAsyncIterable();
    }
    return createLineIterator(stdout);
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
      const stdin = subprocess.stdin;
      if (stdin !== null && stdin !== undefined && "getWriter" in stdin) {
        const writer = stdin.getWriter();
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
  constructor(fs2, clock) {
    this.fs = fs2;
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
    const fs2 = this.fs;
    return {
      async release() {
        if (released) {
          return;
        }
        released = true;
        try {
          await fs2.rm(lockPath, { force: true });
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
  constructor(fs2) {
    this.fs = fs2;
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
      const fs2 = await import("fs/promises");
      await fs2.rename(from, to);
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
  constructor(path2) {
    super(`File not found: ${path2}`);
    this.path = path2;
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
  setFile(path2, content) {
    const normalizedPath = this.normalizePath(path2);
    const parentDir = this.getParentPath(normalizedPath);
    this.ensureDirectoryExists(parentDir);
    const existingEntry = this.files.get(normalizedPath);
    this.files.set(normalizedPath, {
      content,
      mtimeMs: this.currentTime,
      ctimeMs: existingEntry?.ctimeMs ?? this.currentTime
    });
  }
  getFile(path2) {
    const normalizedPath = this.normalizePath(path2);
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
    for (const [path2, entry] of this.files) {
      result.set(path2, entry.content);
    }
    return result;
  }
  writeFileSync(path2, content) {
    this.setFile(path2, content);
  }
  appendFileSync(path2, content) {
    const normalizedPath = this.normalizePath(path2);
    const entry = this.files.get(normalizedPath);
    if (entry === undefined) {
      this.setFile(path2, content);
    } else {
      this.files.set(normalizedPath, {
        content: entry.content + content,
        mtimeMs: this.currentTime,
        ctimeMs: entry.ctimeMs
      });
    }
    this.emitWatchEvent(path2, { eventType: "change", filename: path2 });
  }
  setDirectory(path2) {
    this.ensureDirectoryExists(this.normalizePath(path2));
  }
  emitWatchEvent(path2, event) {
    const normalizedPath = this.normalizePath(path2);
    const callbacks = this.watchCallbacks.get(normalizedPath);
    if (callbacks !== undefined) {
      for (const callback of callbacks) {
        callback(event);
      }
    }
  }
  async readFile(path2) {
    const normalizedPath = this.normalizePath(path2);
    const entry = this.files.get(normalizedPath);
    if (entry === undefined) {
      throw new FileNotFoundError(path2);
    }
    return entry.content;
  }
  async writeFile(path2, content) {
    this.setFile(path2, content);
  }
  async exists(path2) {
    const normalizedPath = this.normalizePath(path2);
    return this.files.has(normalizedPath) || this.directories.has(normalizedPath);
  }
  async readDir(path2) {
    const normalizedPath = this.normalizePath(path2);
    if (!this.directories.has(normalizedPath)) {
      throw new FileNotFoundError(path2);
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
  watch(path2) {
    const normalizedPath = this.normalizePath(path2);
    const self = this;
    return {
      [Symbol.asyncIterator]() {
        const queue = [];
        let resolver = null;
        let done = false;
        const callback = (event) => {
          if (done)
            return;
          if (resolver !== null) {
            const r = resolver;
            resolver = null;
            r({ value: event, done: false });
          } else {
            queue.push(event);
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
            const queued = queue.shift();
            if (queued !== undefined) {
              return { value: queued, done: false };
            }
            return new Promise((resolve) => {
              resolver = resolve;
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
  async stat(path2) {
    const normalizedPath = this.normalizePath(path2);
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
    throw new FileNotFoundError(path2);
  }
  async mkdir(path2, options) {
    const normalizedPath = this.normalizePath(path2);
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
  async rm(path2, options) {
    const normalizedPath = this.normalizePath(path2);
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
            throw new Error(`Directory not empty: ${path2}`);
          }
        }
        for (const dirPath of this.directories) {
          if (dirPath !== normalizedPath && dirPath.startsWith(prefix)) {
            throw new Error(`Directory not empty: ${path2}`);
          }
        }
        this.directories.delete(normalizedPath);
      }
      return;
    }
    if (options?.force !== true) {
      throw new FileNotFoundError(path2);
    }
  }
  normalizePath(path2) {
    let normalized = path2.replace(/\/+$/, "") || "/";
    if (!normalized.startsWith("/")) {
      normalized = "/" + normalized;
    }
    return normalized;
  }
  getParentPath(path2) {
    const lastSlash = path2.lastIndexOf("/");
    if (lastSlash <= 0) {
      return "/";
    }
    return path2.slice(0, lastSlash);
  }
  ensureDirectoryExists(path2) {
    if (path2 === "/" || this.directories.has(path2)) {
      return;
    }
    const parentPath = this.getParentPath(path2);
    this.ensureDirectoryExists(parentPath);
    this.directories.add(path2);
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
              await new Promise((resolve) => setTimeout(resolve, delay));
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
              await new Promise((resolve) => setTimeout(resolve, delay));
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
    return new Promise((resolve) => {
      if (this.killed) {
        setImmediate(() => resolve(null));
        return;
      }
      if (exitDelay > 0) {
        const checkInterval = 10;
        let elapsed = 0;
        const intervalId = setInterval(() => {
          elapsed += checkInterval;
          if (this.killed) {
            clearInterval(intervalId);
            resolve(null);
          } else if (elapsed >= exitDelay) {
            clearInterval(intervalId);
            resolve(exitCodeValue);
          }
        }, checkInterval);
      } else {
        setImmediate(() => {
          resolve(this.killed ? null : exitCodeValue);
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
    return new Promise((resolve) => {
      this.sleepResolvers.push({ ms, resolve });
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
  setLockBehavior(path2, behavior) {
    this.behaviors.set(this.normalizePath(path2), behavior);
  }
  simulateContention(path2) {
    const normalized = this.normalizePath(path2);
    this.contentionPaths.add(normalized);
  }
  clearContention(path2) {
    const normalized = this.normalizePath(path2);
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
  normalizePath(path2) {
    return path2.replace(/\/+$/, "") || "/";
  }
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
  async list(filter, sort) {
    let results = Array.from(this.bookmarks.values());
    if (filter) {
      results = results.filter((bookmark) => {
        if (filter.type !== undefined && bookmark.type !== filter.type) {
          return false;
        }
        if (filter.sessionId !== undefined && bookmark.sessionId !== filter.sessionId) {
          return false;
        }
        if (filter.tags !== undefined && filter.tags.length > 0) {
          const hasAllTags = filter.tags.every((tag) => bookmark.tags.includes(tag));
          if (!hasAllTags) {
            return false;
          }
        }
        if (filter.nameContains !== undefined && !bookmark.name.toLowerCase().includes(filter.nameContains.toLowerCase())) {
          return false;
        }
        if (filter.since !== undefined) {
          const sinceDate = typeof filter.since === "string" ? new Date(filter.since) : filter.since;
          const createdDate = new Date(bookmark.createdAt);
          if (createdDate < sinceDate) {
            return false;
          }
        }
        return true;
      });
    }
    if (sort) {
      results.sort((a, b) => {
        const aValue = a[sort.field];
        const bValue = b[sort.field];
        let comparison = 0;
        if (aValue < bValue) {
          comparison = -1;
        } else if (aValue > bValue) {
          comparison = 1;
        }
        return sort.direction === "asc" ? comparison : -comparison;
      });
    }
    if (filter?.offset !== undefined) {
      results = results.slice(filter.offset);
    }
    if (filter?.limit !== undefined) {
      results = results.slice(0, filter.limit);
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
    results.sort((a, b) => {
      const aExactName = a.name.toLowerCase() === query;
      const bExactName = b.name.toLowerCase() === query;
      if (aExactName && !bExactName)
        return -1;
      if (!aExactName && bExactName)
        return 1;
      return a.name.localeCompare(b.name);
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
  async count(filter) {
    return (await this.list(filter)).length;
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
  async list(filter, sort) {
    let results = Array.from(this.groups.values());
    if (filter) {
      results = this.applyFilter(results, filter);
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
    const sessionIndex = group.sessions.findIndex((s) => s.id === sessionId);
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
  async count(filter) {
    if (!filter) {
      return this.groups.size;
    }
    const filtered = this.applyFilter(Array.from(this.groups.values()), filter);
    return filtered.length;
  }
  clear() {
    this.groups.clear();
  }
  applyFilter(groups, filter) {
    let results = groups;
    if (filter.status !== undefined) {
      results = results.filter((g) => g.status === filter.status);
    }
    if (filter.nameContains !== undefined) {
      const searchTerm = filter.nameContains.toLowerCase();
      results = results.filter((g) => g.name.toLowerCase().includes(searchTerm));
    }
    if (filter.since !== undefined) {
      const sinceTime = filter.since.getTime();
      results = results.filter((g) => new Date(g.createdAt).getTime() >= sinceTime);
    }
    if (filter.offset !== undefined) {
      results = results.slice(filter.offset);
    }
    if (filter.limit !== undefined) {
      results = results.slice(0, filter.limit);
    }
    return results;
  }
  applySort(groups, sort) {
    const sorted = [...groups];
    const direction = sort.direction === "asc" ? 1 : -1;
    sorted.sort((a, b) => {
      let compareValue = 0;
      switch (sort.field) {
        case "name":
          compareValue = a.name.localeCompare(b.name);
          break;
        case "createdAt":
          compareValue = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "updatedAt":
          compareValue = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
      }
      return compareValue * direction;
    });
    return sorted;
  }
}
// node_modules/nanoid/index.js
import { webcrypto as crypto } from "crypto";

// node_modules/nanoid/url-alphabet/index.js
var urlAlphabet = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";

// node_modules/nanoid/index.js
var POOL_SIZE_MULTIPLIER = 128;
var pool;
var poolOffset;
function fillPool(bytes) {
  if (!pool || pool.length < bytes) {
    pool = Buffer.allocUnsafe(bytes * POOL_SIZE_MULTIPLIER);
    crypto.getRandomValues(pool);
    poolOffset = 0;
  } else if (poolOffset + bytes > pool.length) {
    crypto.getRandomValues(pool);
    poolOffset = 0;
  }
  poolOffset += bytes;
}
function nanoid(size = 21) {
  fillPool(size |= 0);
  let id = "";
  for (let i = poolOffset - size;i < poolOffset; i++) {
    id += urlAlphabet[pool[i] & 63];
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
    return Array.from(this.queues.values()).filter((queue) => queue.projectPath === projectPath);
  }
  async findByStatus(status) {
    return Array.from(this.queues.values()).filter((queue) => queue.status === status);
  }
  async list(filter, sort) {
    let results = Array.from(this.queues.values());
    if (filter) {
      results = this.applyFilter(results, filter);
    }
    if (sort) {
      results = this.applySort(results, sort);
    }
    return results;
  }
  async save(queue) {
    this.queues.set(queue.id, queue);
  }
  async delete(id) {
    return this.queues.delete(id);
  }
  updateQueue(queueId, update) {
    const queue = this.queues.get(queueId);
    if (!queue) {
      return false;
    }
    const updatedQueue = update(queue);
    if (updatedQueue === null) {
      return false;
    }
    this.queues.set(queueId, updatedQueue);
    return true;
  }
  async addCommand(queueId, command, position) {
    return this.updateQueue(queueId, (queue) => {
      const newCommand = {
        id: `cmd-${nanoid(12)}`,
        status: "pending",
        ...command
      };
      const commands = [...queue.commands];
      const insertPos = position ?? commands.length;
      commands.splice(insertPos, 0, newCommand);
      return {
        ...queue,
        commands,
        updatedAt: new Date().toISOString()
      };
    });
  }
  async updateCommand(queueId, commandIndex, updates) {
    return this.updateQueue(queueId, (queue) => {
      if (commandIndex < 0 || commandIndex >= queue.commands.length) {
        return null;
      }
      const currentCommand = queue.commands[commandIndex];
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
      const commands = [...queue.commands];
      commands[commandIndex] = updatedCommand;
      return {
        ...queue,
        commands,
        updatedAt: new Date().toISOString()
      };
    });
  }
  async removeCommand(queueId, commandIndex) {
    return this.updateQueue(queueId, (queue) => {
      if (commandIndex < 0 || commandIndex >= queue.commands.length) {
        return null;
      }
      const commands = [...queue.commands];
      commands.splice(commandIndex, 1);
      return {
        ...queue,
        commands,
        updatedAt: new Date().toISOString()
      };
    });
  }
  async reorderCommand(queueId, fromIndex, toIndex) {
    return this.updateQueue(queueId, (queue) => {
      if (fromIndex < 0 || fromIndex >= queue.commands.length || toIndex < 0 || toIndex >= queue.commands.length) {
        return null;
      }
      const commands = [...queue.commands];
      const [movedCommand] = commands.splice(fromIndex, 1);
      if (!movedCommand) {
        return null;
      }
      commands.splice(toIndex, 0, movedCommand);
      return {
        ...queue,
        commands,
        updatedAt: new Date().toISOString()
      };
    });
  }
  async count(filter) {
    if (!filter) {
      return this.queues.size;
    }
    const filtered = this.applyFilter(Array.from(this.queues.values()), filter);
    return filtered.length;
  }
  clear() {
    this.queues.clear();
  }
  applyFilter(queues, filter) {
    let results = queues;
    if (filter.projectPath !== undefined) {
      results = results.filter((q) => q.projectPath === filter.projectPath);
    }
    if (filter.status !== undefined) {
      results = results.filter((q) => q.status === filter.status);
    }
    if (filter.nameContains !== undefined) {
      const searchTerm = filter.nameContains.toLowerCase();
      results = results.filter((q) => q.name.toLowerCase().includes(searchTerm));
    }
    if (filter.since !== undefined) {
      const sinceTime = filter.since.getTime();
      results = results.filter((q) => new Date(q.createdAt).getTime() >= sinceTime);
    }
    if (filter.offset !== undefined) {
      results = results.slice(filter.offset);
    }
    if (filter.limit !== undefined) {
      results = results.slice(0, filter.limit);
    }
    return results;
  }
  applySort(queues, sort) {
    const sorted = [...queues];
    const direction = sort.direction === "asc" ? 1 : -1;
    sorted.sort((a, b) => {
      let compareValue = 0;
      switch (sort.field) {
        case "name":
          compareValue = a.name.localeCompare(b.name);
          break;
        case "createdAt":
          compareValue = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "updatedAt":
          compareValue = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case "totalCostUsd":
          compareValue = a.totalCostUsd - b.totalCostUsd;
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
  const defaults = {
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
    ...defaults,
    ...overrides
  };
}
export {
  createTestContainer,
  createProductionContainer
};
