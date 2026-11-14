import { readFile, writeFile } from "node:fs/promises";
import { exec as execCallback } from "node:child_process";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { promisify } from "node:util";
import { expect } from "vitest";

const exec = promisify(execCallback);

function quoteShell(value: unknown): string {
  const text = String(value);
  return `'${text.replace(/'/g, `'\\''`)}'`;
}

function buildCommand(
  strings: TemplateStringsArray,
  values: unknown[],
): string {
  let command = strings[0] ?? "";
  for (let i = 0; i < values.length; i += 1) {
    command += quoteShell(values[i]) + (strings[i + 1] ?? "");
  }
  return command;
}

type BunLike = {
  env: Record<string, string | undefined>;
  version: string;
  semver: { satisfies: (_version: string, _range: string) => boolean };
  gc: (_full?: boolean) => void;
  sleep: (ms: number) => Promise<void>;
  file: (path: string) => { text: () => Promise<string> };
  write: (path: string, content: string) => Promise<number>;
  serve: (options: {
    hostname?: string;
    port?: number;
    fetch: (request: Request) => Response | Promise<Response>;
  }) => {
    hostname: string;
    port: number;
    stop: (_closeActiveConnections?: boolean) => Promise<void>;
    reload: (_options?: unknown) => void;
    requestIP: (_request: Request) => { address: string; family: string; port: number };
    upgrade: (_request: Request, _opts?: unknown) => boolean;
  };
  $: (
    strings: TemplateStringsArray,
    ...values: unknown[]
  ) => {
    text: () => Promise<string>;
    quiet: () => Promise<void>;
  };
};

function toRequest(req: IncomingMessage): Request {
  const protocol = "http";
  const host = req.headers.host ?? "127.0.0.1";
  const url = `${protocol}://${host}${req.url ?? "/"}`;
  const method = req.method ?? "GET";
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item);
    } else {
      headers.set(key, value);
    }
  }

  return new Request(url, {
    method,
    headers,
    body: method === "GET" || method === "HEAD" ? undefined : req,
    duplex: "half",
  } as RequestInit);
}

async function sendResponse(
  res: ServerResponse,
  response: Response,
): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  if (response.body === null) {
    res.end();
    return;
  }

  const body = Buffer.from(await response.arrayBuffer());
  res.end(body);
}

if (typeof (globalThis as { Bun?: unknown }).Bun === "undefined") {
  (globalThis as { Bun: BunLike }).Bun = {
    env: process.env,
    version: "1.2.0",
    semver: {
      satisfies: () => false,
    },
    gc: () => {},
    async sleep(ms: number): Promise<void> {
      await new Promise((resolve) => setTimeout(resolve, ms));
    },
    file(path: string): { text: () => Promise<string> } {
      return {
        async text(): Promise<string> {
          return readFile(path, "utf8");
        },
      };
    },
    async write(path: string, content: string): Promise<number> {
      await writeFile(path, content, "utf8");
      return Buffer.byteLength(content, "utf8");
    },
    serve(options: {
      hostname?: string;
      port?: number;
      fetch: (request: Request) => Response | Promise<Response>;
    }): {
      hostname: string;
      port: number;
      stop: (_closeActiveConnections?: boolean) => Promise<void>;
      reload: (_options?: unknown) => void;
      requestIP: (_request: Request) => {
        address: string;
        family: string;
        port: number;
      };
      upgrade: (_request: Request, _opts?: unknown) => boolean;
    } {
      const hostname = options.hostname ?? "127.0.0.1";
      const port = options.port ?? 0;
      const server = createServer(async (req, res) => {
        const request = toRequest(req);
        const response = await options.fetch(request);
        await sendResponse(res, response);
      });
      server.listen(port, hostname);
      const address = server.address();
      const resolvedPort =
        typeof address === "object" && address !== null ? address.port : port;

      return {
        hostname,
        port: resolvedPort,
        async stop(): Promise<void> {
          await new Promise<void>((resolve, reject) => {
            server.close((error) => {
              if (error !== undefined) {
                reject(error);
                return;
              }
              resolve();
            });
          });
        },
        reload: () => {},
        requestIP: () => ({
          address: hostname,
          family: "IPv4",
          port: resolvedPort,
        }),
        upgrade: () => false,
      };
    },
    $(
      strings: TemplateStringsArray,
      ...values: unknown[]
    ): { text: () => Promise<string>; quiet: () => Promise<void> } {
      const command = buildCommand(strings, values);
      return {
        async text(): Promise<string> {
          const { stdout } = await exec(command, { shell: true });
          return stdout;
        },
        async quiet(): Promise<void> {
          await exec(command, { shell: true });
        },
      };
    },
  };
}

expect.extend({
  toBeString(received: unknown) {
    const pass = typeof received === "string";
    return {
      pass,
      message: () =>
        `expected ${String(received)} ${pass ? "not " : ""}to be a string`,
    };
  },
  toStartWith(received: unknown, expected: string) {
    const pass = typeof received === "string" && received.startsWith(expected);
    return {
      pass,
      message: () =>
        `expected ${String(received)} ${pass ? "not " : ""}to start with ${expected}`,
    };
  },
  toBeArray(received: unknown) {
    const pass = Array.isArray(received);
    return {
      pass,
      message: () =>
        `expected ${String(received)} ${pass ? "not " : ""}to be an array`,
    };
  },
});

(expect as { unreachable?: (message?: string) => never }).unreachable = (
  message?: string,
): never => {
  throw new Error(message ?? "Reached unreachable code");
};

declare module "vitest" {
  interface Assertion<T = any> {
    toBeString(): T;
    toStartWith(expected: string): T;
    toBeArray(): T;
  }
  interface AsymmetricMatchersContaining {
    toBeString(): void;
    toStartWith(expected: string): void;
    toBeArray(): void;
  }
}
