import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExtensionOptions } from "@/domain/extension-options";
import { Server } from "@/domain/server";
import Theme from "@/domain/theme";

describe("ExtensionOptions", () => {
  const createMockServer = (overrides?: Partial<Server>): Server =>
    Server.create({
      uuid: "test-uuid",
      name: "Test Server",
      ...overrides,
    });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("serialize", () => {
    it("should serialize options to JSON string", () => {
      const options = ExtensionOptions.create();
      const serialized = ExtensionOptions.serialize(options);

      expect(typeof serialized).toBe("string");
      expect(() => JSON.parse(serialized)).not.toThrow();
      expect(JSON.parse(serialized)).toHaveProperty("servers");
    });

    it("should preserve all properties when serializing", () => {
      const server = createMockServer();
      const options = ExtensionOptions.create({
        servers: { [server.uuid]: server },
        excludedProtocols: ["http"],
        excludedSites: ["example.com"],
        excludedFileTypes: ["exe"],
        useCompleteFilePath: true,
        theme: Theme.Dark,
      });

      const serialized = ExtensionOptions.serialize(options);
      const parsed = JSON.parse(serialized);

      expect(parsed.servers).toEqual(options.servers);
      expect(parsed.excludedProtocols).toEqual(["http"]);
      expect(parsed.useCompleteFilePath).toBe(true);
      expect(parsed.theme).toBe("dark");
    });
  });

  describe("withServer", () => {
    it("should add a server", () => {
      const server = createMockServer();
      const options = ExtensionOptions.create();

      const newOptions = ExtensionOptions.withServer(options, server);

      expect(newOptions.servers[server.uuid]).toEqual(server);
    });

    it("should return a new instance", () => {
      const server = createMockServer();
      const options = ExtensionOptions.create();
      const newOptions = ExtensionOptions.withServer(options, server);

      expect(newOptions).not.toBe(options);
    });

    it("should preserve existing servers when adding a new one", () => {
      const server1 = createMockServer({ uuid: "server-1" });
      const server2 = createMockServer({ uuid: "server-2" });
      const options = ExtensionOptions.create({ servers: { "server-1": server1 } });

      const newOptions = ExtensionOptions.withServer(options, server2);

      expect(newOptions.servers["server-1"]).toEqual(server1);
      expect(newOptions.servers["server-2"]).toEqual(server2);
    });

    it("should replace existing server with same uuid", () => {
      const server = createMockServer({ uuid: "server-1", name: "Server 1" });
      const updatedServer = createMockServer({
        uuid: "server-1",
        name: "Updated Server 1",
      });
      const options = ExtensionOptions.create({ servers: { "server-1": server } });

      const newOptions = ExtensionOptions.withServer(options, updatedServer);

      expect(newOptions.servers["server-1"].name).toBe("Updated Server 1");
    });
  });

  describe("withoutServer", () => {
    it("should delete a server", () => {
      const server = createMockServer();
      const options = ExtensionOptions.create({
        servers: { [server.uuid]: server },
      });

      const newOptions = ExtensionOptions.withoutServer(options, server);

      expect(newOptions.servers[server.uuid]).toBeUndefined();
    });

    it("should return a new instance", () => {
      const server = createMockServer();
      const options = ExtensionOptions.create({
        servers: { [server.uuid]: server },
      });
      const newOptions = ExtensionOptions.withoutServer(options, server);

      expect(newOptions).not.toBe(options);
    });

    it("should preserve other servers when deleting one", () => {
      const server1 = createMockServer({ uuid: "server-1" });
      const server2 = createMockServer({ uuid: "server-2" });
      const options = ExtensionOptions.create({
        servers: {
          "server-1": server1,
          "server-2": server2,
        },
      });

      const newOptions = ExtensionOptions.withoutServer(options, server1);

      expect(newOptions.servers["server-1"]).toBeUndefined();
      expect(newOptions.servers["server-2"]).toEqual(server2);
    });
  });

  describe("withOverrides", () => {
    it("should apply overrides to a copy of options", () => {
      const originalOptions = ExtensionOptions.create({ theme: Theme.Light, useCompleteFilePath: false });

      const overriddenOptions = ExtensionOptions.withOverrides(originalOptions, { theme: Theme.Dark });

      expect(overriddenOptions.theme).toBe(Theme.Dark);
      expect(overriddenOptions.useCompleteFilePath).toBe(false);
      expect(overriddenOptions).not.toBe(originalOptions);
    });

    it("should not modify original options", () => {
      const originalOptions = ExtensionOptions.create({ theme: Theme.Light });

      ExtensionOptions.withOverrides(originalOptions, { theme: Theme.Dark });

      expect(originalOptions.theme).toBe(Theme.Light);
    });
  });

  describe("deserialize", () => {
    it("should read what serialize wrote", () => {
      const options = ExtensionOptions.create({ theme: Theme.Dark, servers: { a: createMockServer({ uuid: "a" }) } });

      expect(ExtensionOptions.deserialize(ExtensionOptions.serialize(options))).toEqual(options);
    });

    it("should fill in the defaults of the missing options", () => {
      expect(ExtensionOptions.deserialize("{}")).toEqual(ExtensionOptions.create());
    });

    it("should throw on invalid JSON", () => {
      expect(() => ExtensionOptions.deserialize("{")).toThrow();
    });
  });
});
