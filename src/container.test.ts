/**
 * Tests for dependency injection container.
 *
 * @module container.test
 */

import { describe, it, expect } from "vitest";
import { createProductionContainer, createTestContainer } from "./container";
import { BunFileSystem } from "./interfaces/bun-filesystem";
import { BunProcessManager } from "./interfaces/bun-process-manager";
import { SystemClock } from "./interfaces/system-clock";
import { MockFileSystem } from "./test/mocks/filesystem";
import { MockProcessManager } from "./test/mocks/process-manager";
import { MockClock } from "./test/mocks/clock";

describe("Container", () => {
  describe("createProductionContainer", () => {
    it("should create container with production implementations", () => {
      const container = createProductionContainer();

      expect(container.fileSystem).toBeInstanceOf(BunFileSystem);
      expect(container.processManager).toBeInstanceOf(BunProcessManager);
      expect(container.clock).toBeInstanceOf(SystemClock);
    });

    it("should create container with all required dependencies", () => {
      const container = createProductionContainer();

      expect(container.fileSystem).toBeDefined();
      expect(container.processManager).toBeDefined();
      expect(container.clock).toBeDefined();
    });

    it("should create new instances on each call", () => {
      const container1 = createProductionContainer();
      const container2 = createProductionContainer();

      expect(container1.fileSystem).not.toBe(container2.fileSystem);
      expect(container1.processManager).not.toBe(container2.processManager);
      expect(container1.clock).not.toBe(container2.clock);
    });
  });

  describe("createTestContainer", () => {
    it("should create container with mock implementations", () => {
      const container = createTestContainer();

      expect(container.fileSystem).toBeInstanceOf(MockFileSystem);
      expect(container.processManager).toBeInstanceOf(MockProcessManager);
      expect(container.clock).toBeInstanceOf(MockClock);
    });

    it("should create container with all required dependencies", () => {
      const container = createTestContainer();

      expect(container.fileSystem).toBeDefined();
      expect(container.processManager).toBeDefined();
      expect(container.clock).toBeDefined();
    });

    it("should create new mock instances on each call", () => {
      const container1 = createTestContainer();
      const container2 = createTestContainer();

      expect(container1.fileSystem).not.toBe(container2.fileSystem);
      expect(container1.processManager).not.toBe(container2.processManager);
      expect(container1.clock).not.toBe(container2.clock);
    });

    it("should allow overriding fileSystem", () => {
      const customFileSystem = new MockFileSystem();
      const container = createTestContainer({
        fileSystem: customFileSystem,
      });

      expect(container.fileSystem).toBe(customFileSystem);
      expect(container.processManager).toBeInstanceOf(MockProcessManager);
      expect(container.clock).toBeInstanceOf(MockClock);
    });

    it("should allow overriding processManager", () => {
      const customProcessManager = new MockProcessManager();
      const container = createTestContainer({
        processManager: customProcessManager,
      });

      expect(container.fileSystem).toBeInstanceOf(MockFileSystem);
      expect(container.processManager).toBe(customProcessManager);
      expect(container.clock).toBeInstanceOf(MockClock);
    });

    it("should allow overriding clock", () => {
      const customClock = new MockClock();
      const container = createTestContainer({
        clock: customClock,
      });

      expect(container.fileSystem).toBeInstanceOf(MockFileSystem);
      expect(container.processManager).toBeInstanceOf(MockProcessManager);
      expect(container.clock).toBe(customClock);
    });

    it("should allow overriding multiple dependencies", () => {
      const customFileSystem = new MockFileSystem();
      const customClock = new MockClock();

      const container = createTestContainer({
        fileSystem: customFileSystem,
        clock: customClock,
      });

      expect(container.fileSystem).toBe(customFileSystem);
      expect(container.processManager).toBeInstanceOf(MockProcessManager);
      expect(container.clock).toBe(customClock);
    });

    it("should allow overriding all dependencies", () => {
      const customFileSystem = new MockFileSystem();
      const customProcessManager = new MockProcessManager();
      const customClock = new MockClock();

      const container = createTestContainer({
        fileSystem: customFileSystem,
        processManager: customProcessManager,
        clock: customClock,
      });

      expect(container.fileSystem).toBe(customFileSystem);
      expect(container.processManager).toBe(customProcessManager);
      expect(container.clock).toBe(customClock);
    });
  });
});
