/**
 * Tests for ConfigGenerator.
 *
 * @module sdk/group/config-generator.test
 */

import { describe, test, expect, beforeEach } from "vitest";
import { ConfigGenerator } from "./config-generator";
import { createTestContainer } from "../../container";
import type { Container } from "../../container";
import type { SessionGroup, GroupSession } from "./types";
import { DEFAULT_GROUP_CONFIG } from "./types";

describe("ConfigGenerator", () => {
  let container: Container;
  let generator: ConfigGenerator;

  beforeEach(() => {
    container = createTestContainer();
    generator = new ConfigGenerator(container);
  });

  describe("generateClaudeMd", () => {
    test("substitutes single variable", () => {
      const template = "Hello {{name}}!";
      const variables = { name: "World" };

      const result = generator.generateClaudeMd(template, variables);

      expect(result).toBe("Hello World!");
    });

    test("substitutes multiple variables", () => {
      const template = "{{greeting}} {{name}}, welcome to {{project}}!";
      const variables = {
        greeting: "Hello",
        name: "Alice",
        project: "claude-code-agent",
      };

      const result = generator.generateClaudeMd(template, variables);

      expect(result).toBe("Hello Alice, welcome to claude-code-agent!");
    });

    test("handles variables with spaces in braces", () => {
      const template = "{{ name }} is {{ age }} years old";
      const variables = { name: "Bob", age: "30" };

      const result = generator.generateClaudeMd(template, variables);

      expect(result).toBe("Bob is 30 years old");
    });

    test("handles same variable multiple times", () => {
      const template = "{{name}} said: Hello {{name}}!";
      const variables = { name: "Alice" };

      const result = generator.generateClaudeMd(template, variables);

      expect(result).toBe("Alice said: Hello Alice!");
    });

    test("leaves unmatched variables unchanged", () => {
      const template = "Hello {{name}}, your ID is {{id}}";
      const variables = { name: "Alice" };

      const result = generator.generateClaudeMd(template, variables);

      expect(result).toBe("Hello Alice, your ID is {{id}}");
    });

    test("handles template without variables", () => {
      const template = "This is a plain template";
      const variables = { name: "Alice" };

      const result = generator.generateClaudeMd(template, variables);

      expect(result).toBe("This is a plain template");
    });

    test("handles empty variables", () => {
      const template = "Hello {{name}}!";
      const variables = {};

      const result = generator.generateClaudeMd(template, variables);

      expect(result).toBe("Hello {{name}}!");
    });

    test("handles multiline templates", () => {
      const template = `# {{title}}

Project: {{project}}
Author: {{author}}

## Description
This is a test.`;

      const variables = {
        title: "Test Project",
        project: "claude-code-agent",
        author: "Claude",
      };

      const result = generator.generateClaudeMd(template, variables);

      expect(result).toContain("# Test Project");
      expect(result).toContain("Project: claude-code-agent");
      expect(result).toContain("Author: Claude");
    });
  });

  describe("generateSettings", () => {
    test("returns overrides as settings object", () => {
      const overrides = {
        timeout: 30000,
        enableLogging: true,
        maxRetries: 3,
      };

      const result = generator.generateSettings(overrides);

      expect(result).toEqual(overrides);
    });

    test("handles empty overrides", () => {
      const overrides = {};

      const result = generator.generateSettings(overrides);

      expect(result).toEqual({});
    });

    test("handles nested objects", () => {
      const overrides = {
        logging: {
          level: "debug",
          format: "json",
        },
        timeout: 5000,
      };

      const result = generator.generateSettings(overrides);

      expect(result).toEqual(overrides);
    });
  });

  describe("resolveTemplate", () => {
    test("reads template from absolute file path", async () => {
      const templatePath = "/tmp/test-template.md";
      const templateContent = "# Test Template\n\nHello {{name}}!";

      await container.fileSystem.writeFile(templatePath, templateContent);

      const result = await generator.resolveTemplate(templatePath);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(templateContent);
      }
    });

    test("reads template from relative file path", async () => {
      const templatePath = "./test-template.md";
      const templateContent = "# Relative Template";

      await container.fileSystem.writeFile(templatePath, templateContent);

      const result = await generator.resolveTemplate(templatePath);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(templateContent);
      }
    });

    test("reads template from template directory by name", async () => {
      const home = process.env["HOME"] ?? "";
      const xdgConfigHome = process.env["XDG_CONFIG_HOME"] ?? `${home}/.config`;
      const templateDir = `${xdgConfigHome}/claude-code-agent/templates`;
      const templatePath = `${templateDir}/test-template.md`;
      const templateContent = "# Named Template";

      await container.fileSystem.mkdir(templateDir, { recursive: true });
      await container.fileSystem.writeFile(templatePath, templateContent);

      const result = await generator.resolveTemplate("test-template.md");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(templateContent);
      }
    });

    test("returns error when template file not found", async () => {
      const result = await generator.resolveTemplate(
        "/nonexistent/template.md",
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe("template_read_failed");
      }
    });

    test("returns error when template name not found", async () => {
      const result = await generator.resolveTemplate("nonexistent-template.md");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe("template_not_found");
      }
    });
  });

  describe("generateSessionConfig", () => {
    const mockGroup: SessionGroup = {
      id: "20260106-120000-test-group",
      name: "Test Group",
      slug: "test-group",
      status: "created",
      sessions: [],
      config: {
        ...DEFAULT_GROUP_CONFIG,
        model: "opus",
        sessionDefaults: {
          generateClaudeMd: true,
          generateSettings: false,
          claudeMdTemplate: undefined,
          settingsOverride: undefined,
        },
      },
      createdAt: "2026-01-06T12:00:00Z",
      updatedAt: "2026-01-06T12:00:00Z",
    };

    const mockSession: GroupSession = {
      id: "001-test-session",
      projectPath: "/tmp/test-project",
      prompt: "Test prompt",
      status: "paused",
      dependsOn: [],
      createdAt: "2026-01-06T12:00:00Z",
    };

    test("creates config directory", async () => {
      const session = {
        ...mockSession,
        template: "/tmp/template.md",
      };

      await container.fileSystem.writeFile(
        "/tmp/template.md",
        "# {{group_name}}",
      );

      const result = await generator.generateSessionConfig(session, mockGroup);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const configDirExists = await container.fileSystem.exists(
          result.value.configDir,
        );
        expect(configDirExists).toBe(true);
      }
    });

    test("generates CLAUDE.md when template specified", async () => {
      const templateContent = "# {{group_name}}\n\nProject: {{project_path}}";
      await container.fileSystem.writeFile("/tmp/template.md", templateContent);

      const session = {
        ...mockSession,
        template: "/tmp/template.md",
      };

      const result = await generator.generateSessionConfig(session, mockGroup);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.claudeMdPath).toBeDefined();
        const claudeMdContent = await container.fileSystem.readFile(
          result.value.claudeMdPath!,
        );
        expect(claudeMdContent).toContain("# Test Group");
        expect(claudeMdContent).toContain("Project: /tmp/test-project");
      }
    });

    test("generates settings.json when requested", async () => {
      const group: SessionGroup = {
        ...mockGroup,
        config: {
          ...mockGroup.config,
          sessionDefaults: {
            generateClaudeMd: false,
            generateSettings: true,
            settingsOverride: {
              timeout: 30000,
              enableLogging: true,
            },
          },
        },
      };

      const result = await generator.generateSessionConfig(mockSession, group);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.settingsPath).toBeDefined();
        const settingsContent = await container.fileSystem.readFile(
          result.value.settingsPath!,
        );
        const settings = JSON.parse(settingsContent);
        expect(settings.timeout).toBe(30000);
        expect(settings.enableLogging).toBe(true);
      }
    });

    test("uses session-specific config over group defaults", async () => {
      const templateContent = "Session: {{session_id}}";
      await container.fileSystem.writeFile(
        "/tmp/session-template.md",
        templateContent,
      );

      const session: GroupSession = {
        ...mockSession,
        config: {
          generateClaudeMd: true,
          generateSettings: false,
          claudeMdTemplate: "/tmp/session-template.md",
        },
      };

      const result = await generator.generateSessionConfig(session, mockGroup);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.claudeMdPath).toBeDefined();
        const claudeMdContent = await container.fileSystem.readFile(
          result.value.claudeMdPath!,
        );
        expect(claudeMdContent).toBe("Session: 001-test-session");
      }
    });

    test("substitutes all template variables", async () => {
      const templateContent = `# Group: {{group_name}}
Session: {{session_id}}
Project: {{project_path}}
Prompt: {{prompt}}
Model: {{model}}`;

      await container.fileSystem.writeFile(
        "/tmp/full-template.md",
        templateContent,
      );

      const session = {
        ...mockSession,
        template: "/tmp/full-template.md",
      };

      const result = await generator.generateSessionConfig(session, mockGroup);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const claudeMdContent = await container.fileSystem.readFile(
          result.value.claudeMdPath!,
        );
        expect(claudeMdContent).toContain("Group: Test Group");
        expect(claudeMdContent).toContain("Session: 001-test-session");
        expect(claudeMdContent).toContain("Project: /tmp/test-project");
        expect(claudeMdContent).toContain("Prompt: Test prompt");
        expect(claudeMdContent).toContain("Model: opus");
      }
    });

    test("does not generate CLAUDE.md when generateClaudeMd is false", async () => {
      const group: SessionGroup = {
        ...mockGroup,
        config: {
          ...mockGroup.config,
          sessionDefaults: {
            generateClaudeMd: false,
            generateSettings: false,
          },
        },
      };

      const result = await generator.generateSessionConfig(mockSession, group);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.claudeMdPath).toBeUndefined();
      }
    });

    test("does not generate settings.json when generateSettings is false", async () => {
      const result = await generator.generateSessionConfig(
        mockSession,
        mockGroup,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.settingsPath).toBeUndefined();
      }
    });

    test("returns error when template not found", async () => {
      const session = {
        ...mockSession,
        template: "/nonexistent/template.md",
      };

      const result = await generator.generateSessionConfig(session, mockGroup);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe("template_read_failed");
      }
    });

    test("handles template from template directory", async () => {
      const home = process.env["HOME"] ?? "";
      const xdgConfigHome = process.env["XDG_CONFIG_HOME"] ?? `${home}/.config`;
      const templateDir = `${xdgConfigHome}/claude-code-agent/templates`;
      const templatePath = `${templateDir}/named-template.md`;

      await container.fileSystem.mkdir(templateDir, { recursive: true });
      await container.fileSystem.writeFile(templatePath, "# {{group_name}}");

      const session = {
        ...mockSession,
        template: "named-template.md",
      };

      const result = await generator.generateSessionConfig(session, mockGroup);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.claudeMdPath).toBeDefined();
        const claudeMdContent = await container.fileSystem.readFile(
          result.value.claudeMdPath!,
        );
        expect(claudeMdContent).toBe("# Test Group");
      }
    });
  });
});
