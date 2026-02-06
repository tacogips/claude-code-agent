import { describe, test, expect } from "vitest";
import {
  isSdkServer,
  isStdioServer,
  isHttpServer,
  isValidMcpServerConfig,
  type McpStdioServerConfig,
  type McpHttpServerConfig,
  type McpSdkServerConfig,
  type McpServerConfig,
} from "./mcp";

describe("MCP Server Config Types", () => {
  describe("McpStdioServerConfig", () => {
    test("should accept valid stdio server config", () => {
      const config: McpStdioServerConfig = {
        type: "stdio",
        command: "node",
        args: ["server.js"],
        env: { API_KEY: "test" },
      };

      expect(config.type).toBe("stdio");
      expect(config.command).toBe("node");
    });

    test("should accept stdio config without optional fields", () => {
      const config: McpStdioServerConfig = {
        type: "stdio",
        command: "/usr/bin/python3",
      };

      expect(config.type).toBe("stdio");
      expect(config.args).toBeUndefined();
      expect(config.env).toBeUndefined();
    });
  });

  describe("McpHttpServerConfig", () => {
    test("should accept valid http server config", () => {
      const config: McpHttpServerConfig = {
        type: "http",
        url: "https://api.example.com/mcp",
        headers: { Authorization: "Bearer token" },
      };

      expect(config.type).toBe("http");
      expect(config.url).toBe("https://api.example.com/mcp");
    });

    test("should accept sse server config", () => {
      const config: McpHttpServerConfig = {
        type: "sse",
        url: "https://sse.example.com",
      };

      expect(config.type).toBe("sse");
      expect(config.headers).toBeUndefined();
    });

    test("should accept http config without optional headers", () => {
      const config: McpHttpServerConfig = {
        type: "http",
        url: "http://localhost:3000",
      };

      expect(config.type).toBe("http");
      expect(config.headers).toBeUndefined();
    });
  });

  describe("McpSdkServerConfig", () => {
    test("should accept valid sdk server config", () => {
      const mockTool = {
        name: "test-tool",
        description: "A test tool",
        inputSchema: { value: "string" },
        handler: async () => ({
          content: [{ type: "text" as const, text: "result" }],
        }),
      };

      const config: McpSdkServerConfig = {
        type: "sdk",
        name: "calculator",
        version: "1.0.0",
        tools: [mockTool],
      };

      expect(config.type).toBe("sdk");
      expect(config.name).toBe("calculator");
      expect(config.version).toBe("1.0.0");
      expect(config.tools).toHaveLength(1);
    });

    test("should accept sdk config without optional version", () => {
      const config: McpSdkServerConfig = {
        type: "sdk",
        name: "my-server",
        tools: [],
      };

      expect(config.type).toBe("sdk");
      expect(config.version).toBeUndefined();
    });
  });

  describe("Type Guards", () => {
    describe("isSdkServer", () => {
      test("should return true for SDK server config", () => {
        const config: McpServerConfig = {
          type: "sdk",
          name: "test",
          tools: [],
        };

        expect(isSdkServer(config)).toBe(true);

        if (isSdkServer(config)) {
          // Type narrowing should work
          expect(config.name).toBe("test");
          expect(config.tools).toBeDefined();
        }
      });

      test("should return false for stdio server config", () => {
        const config: McpServerConfig = {
          type: "stdio",
          command: "node",
        };

        expect(isSdkServer(config)).toBe(false);
      });

      test("should return false for http server config", () => {
        const config: McpServerConfig = {
          type: "http",
          url: "https://example.com",
        };

        expect(isSdkServer(config)).toBe(false);
      });
    });

    describe("isStdioServer", () => {
      test("should return true for stdio server config", () => {
        const config: McpServerConfig = {
          type: "stdio",
          command: "python",
          args: ["server.py"],
        };

        expect(isStdioServer(config)).toBe(true);

        if (isStdioServer(config)) {
          // Type narrowing should work
          expect(config.command).toBe("python");
          expect(config.args).toBeDefined();
        }
      });

      test("should return false for sdk server config", () => {
        const config: McpServerConfig = {
          type: "sdk",
          name: "test",
          tools: [],
        };

        expect(isStdioServer(config)).toBe(false);
      });

      test("should return false for http server config", () => {
        const config: McpServerConfig = {
          type: "http",
          url: "https://example.com",
        };

        expect(isStdioServer(config)).toBe(false);
      });
    });

    describe("isHttpServer", () => {
      test("should return true for http server config", () => {
        const config: McpServerConfig = {
          type: "http",
          url: "https://api.example.com",
          headers: { "X-Custom": "value" },
        };

        expect(isHttpServer(config)).toBe(true);

        if (isHttpServer(config)) {
          // Type narrowing should work
          expect(config.url).toBe("https://api.example.com");
          expect(config.headers).toBeDefined();
        }
      });

      test("should return true for sse server config", () => {
        const config: McpServerConfig = {
          type: "sse",
          url: "https://sse.example.com",
        };

        expect(isHttpServer(config)).toBe(true);

        if (isHttpServer(config)) {
          expect(config.url).toBe("https://sse.example.com");
        }
      });

      test("should return false for stdio server config", () => {
        const config: McpServerConfig = {
          type: "stdio",
          command: "node",
        };

        expect(isHttpServer(config)).toBe(false);
      });

      test("should return false for sdk server config", () => {
        const config: McpServerConfig = {
          type: "sdk",
          name: "test",
          tools: [],
        };

        expect(isHttpServer(config)).toBe(false);
      });
    });
  });

  describe("isValidMcpServerConfig", () => {
    describe("stdio validation", () => {
      test("should validate complete stdio config", () => {
        const config = {
          type: "stdio",
          command: "node",
          args: ["server.js", "--port=3000"],
          env: { NODE_ENV: "production", API_KEY: "secret" },
        };

        expect(isValidMcpServerConfig(config)).toBe(true);
      });

      test("should validate minimal stdio config", () => {
        const config = {
          type: "stdio",
          command: "/usr/bin/python3",
        };

        expect(isValidMcpServerConfig(config)).toBe(true);
      });

      test("should reject stdio config without command", () => {
        const config = {
          type: "stdio",
          args: ["test.js"],
        };

        expect(isValidMcpServerConfig(config)).toBe(false);
      });

      test("should reject stdio config with non-string command", () => {
        const config = {
          type: "stdio",
          command: 123,
        };

        expect(isValidMcpServerConfig(config)).toBe(false);
      });

      test("should reject stdio config with invalid args", () => {
        const config = {
          type: "stdio",
          command: "node",
          args: ["valid", 123, "invalid"],
        };

        expect(isValidMcpServerConfig(config)).toBe(false);
      });

      test("should reject stdio config with invalid env", () => {
        const config = {
          type: "stdio",
          command: "node",
          env: { KEY: 123 },
        };

        expect(isValidMcpServerConfig(config)).toBe(false);
      });
    });

    describe("http/sse validation", () => {
      test("should validate complete http config", () => {
        const config = {
          type: "http",
          url: "https://api.example.com/mcp",
          headers: {
            Authorization: "Bearer token",
            "Content-Type": "application/json",
          },
        };

        expect(isValidMcpServerConfig(config)).toBe(true);
      });

      test("should validate minimal http config", () => {
        const config = {
          type: "http",
          url: "http://localhost:8080",
        };

        expect(isValidMcpServerConfig(config)).toBe(true);
      });

      test("should validate sse config", () => {
        const config = {
          type: "sse",
          url: "https://sse.example.com",
        };

        expect(isValidMcpServerConfig(config)).toBe(true);
      });

      test("should reject http config without url", () => {
        const config = {
          type: "http",
          headers: { Authorization: "Bearer token" },
        };

        expect(isValidMcpServerConfig(config)).toBe(false);
      });

      test("should reject http config with non-string url", () => {
        const config = {
          type: "http",
          url: 12345,
        };

        expect(isValidMcpServerConfig(config)).toBe(false);
      });

      test("should reject http config with invalid headers", () => {
        const config = {
          type: "http",
          url: "https://example.com",
          headers: { "X-Valid": "string", "X-Invalid": 123 },
        };

        expect(isValidMcpServerConfig(config)).toBe(false);
      });
    });

    describe("sdk validation", () => {
      test("should validate complete sdk config", () => {
        const config = {
          type: "sdk",
          name: "calculator",
          version: "1.0.0",
          tools: [
            {
              name: "add",
              description: "Add numbers",
              inputSchema: {},
              handler: async () => ({ content: [] }),
            },
          ],
        };

        expect(isValidMcpServerConfig(config)).toBe(true);
      });

      test("should validate minimal sdk config", () => {
        const config = {
          type: "sdk",
          name: "my-server",
          tools: [],
        };

        expect(isValidMcpServerConfig(config)).toBe(true);
      });

      test("should reject sdk config without name", () => {
        const config = {
          type: "sdk",
          tools: [],
        };

        expect(isValidMcpServerConfig(config)).toBe(false);
      });

      test("should reject sdk config with non-string name", () => {
        const config = {
          type: "sdk",
          name: 123,
          tools: [],
        };

        expect(isValidMcpServerConfig(config)).toBe(false);
      });

      test("should reject sdk config without tools array", () => {
        const config = {
          type: "sdk",
          name: "test",
        };

        expect(isValidMcpServerConfig(config)).toBe(false);
      });

      test("should reject sdk config with non-array tools", () => {
        const config = {
          type: "sdk",
          name: "test",
          tools: "not-an-array",
        };

        expect(isValidMcpServerConfig(config)).toBe(false);
      });

      test("should reject sdk config with non-string version", () => {
        const config = {
          type: "sdk",
          name: "test",
          version: 1.0,
          tools: [],
        };

        expect(isValidMcpServerConfig(config)).toBe(false);
      });
    });

    describe("general validation", () => {
      test("should reject null", () => {
        expect(isValidMcpServerConfig(null)).toBe(false);
      });

      test("should reject undefined", () => {
        expect(isValidMcpServerConfig(undefined)).toBe(false);
      });

      test("should reject non-object values", () => {
        expect(isValidMcpServerConfig("string")).toBe(false);
        expect(isValidMcpServerConfig(123)).toBe(false);
        expect(isValidMcpServerConfig(true)).toBe(false);
      });

      test("should reject object without type", () => {
        const config = {
          name: "test",
          command: "node",
        };

        expect(isValidMcpServerConfig(config)).toBe(false);
      });

      test("should reject object with non-string type", () => {
        const config = {
          type: 123,
          command: "node",
        };

        expect(isValidMcpServerConfig(config)).toBe(false);
      });

      test("should reject object with unknown type", () => {
        const config = {
          type: "unknown-type",
          command: "node",
        };

        expect(isValidMcpServerConfig(config)).toBe(false);
      });
    });
  });

  describe("Type narrowing in practice", () => {
    test("should allow accessing type-specific properties after narrowing", () => {
      const servers: McpServerConfig[] = [
        { type: "stdio", command: "node" },
        { type: "http", url: "https://example.com" },
        { type: "sdk", name: "test", tools: [] },
      ];

      for (const server of servers) {
        if (isStdioServer(server)) {
          // Can access stdio-specific properties
          expect(server.command).toBeDefined();
        } else if (isHttpServer(server)) {
          // Can access http-specific properties
          expect(server.url).toBeDefined();
        } else if (isSdkServer(server)) {
          // Can access sdk-specific properties
          expect(server.name).toBeDefined();
          expect(server.tools).toBeDefined();
        }
      }
    });
  });
});
