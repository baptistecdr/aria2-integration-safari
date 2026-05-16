import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ExtensionOptions from "@/models/extension-options";
import type Server from "@/models/server";
import Theme from "@/models/theme";

describe("ExtensionOptions", () => {
  const createMockServer = (overrides?: Partial<Server>): Server =>
    ({
      uuid: "test-uuid",
      name: "Test Server",
      rpcParameters: {},
      ...overrides,
    }) as Server;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("serialize", () => {
    it("should serialize options to JSON string", () => {
      const options = new ExtensionOptions();
      const serialized = options.serialize();

      expect(typeof serialized).toBe("string");
      expect(() => JSON.parse(serialized)).not.toThrow();
      expect(JSON.parse(serialized)).toHaveProperty("servers");
    });

    it("should preserve all properties when serializing", () => {
      const server = createMockServer();
      const options = new ExtensionOptions({ [server.uuid]: server }, ["http"], ["example.com"], ["exe"], true);

      const serialized = options.serialize();
      const parsed = JSON.parse(serialized);

      expect(parsed.servers).toEqual(options.servers);
      expect(parsed.excludedProtocols).toEqual(["http"]);
      expect(parsed.excludedSites).toEqual(["example.com"]);
      expect(parsed.excludedFileTypes).toEqual(["exe"]);
      expect(parsed.useCompleteFilePath).toBe(true);
      expect(parsed.theme).toBe(Theme.Auto);
    });
  });

  describe("toStorage", () => {
    it("should save options to browser storage with correct format", async () => {
      const options = new ExtensionOptions();
      const serialized = options.serialize();

      await options.toStorage();

      expect(browser.storage.sync.set).toHaveBeenCalledWith({
        options: serialized,
      });
      expect(browser.storage.sync.set).toHaveBeenCalledTimes(1);
    });

    it("should return the same instance after saving", async () => {
      const options = new ExtensionOptions();
      const result = await options.toStorage();

      expect(result).toBe(options);
    });
  });

  describe("addServer", () => {
    it("should add a server and save to storage", async () => {
      const server = createMockServer();
      const options = new ExtensionOptions();

      const newOptions = await options.addServer(server);

      expect(newOptions.servers[server.uuid]).toEqual(server);
      expect(browser.storage.sync.set).toHaveBeenCalled();
    });

    it("should return a new instance", async () => {
      const server = createMockServer();
      const options = new ExtensionOptions();
      const newOptions = await options.addServer(server);

      expect(newOptions).not.toBe(options);
    });

    it("should preserve existing servers when adding a new one", async () => {
      const server1 = createMockServer({ uuid: "server-1" });
      const server2 = createMockServer({ uuid: "server-2" });
      const options = new ExtensionOptions({ "server-1": server1 });

      const newOptions = await options.addServer(server2);

      expect(newOptions.servers["server-1"]).toEqual(server1);
      expect(newOptions.servers["server-2"]).toEqual(server2);
    });

    it("should replace existing server with same uuid", async () => {
      const server = createMockServer({ uuid: "server-1", name: "Server 1" });
      const updatedServer = createMockServer({
        uuid: "server-1",
        name: "Updated Server 1",
      });
      const options = new ExtensionOptions({ "server-1": server });

      const newOptions = await options.addServer(updatedServer);

      expect(newOptions.servers["server-1"].name).toBe("Updated Server 1");
    });
  });

  describe("deleteServer", () => {
    it("should delete a server and save to storage", async () => {
      const server = createMockServer();
      const options = new ExtensionOptions({
        [server.uuid]: server,
      });

      const newOptions = await options.deleteServer(server);

      expect(newOptions.servers[server.uuid]).toBeUndefined();
      expect(browser.storage.sync.set).toHaveBeenCalled();
    });

    it("should return a new instance", async () => {
      const server = createMockServer();
      const options = new ExtensionOptions({
        [server.uuid]: server,
      });
      const newOptions = await options.deleteServer(server);

      expect(newOptions).not.toBe(options);
    });

    it("should preserve other servers when deleting one", async () => {
      const server1 = createMockServer({ uuid: "server-1" });
      const server2 = createMockServer({ uuid: "server-2" });
      const options = new ExtensionOptions({
        "server-1": server1,
        "server-2": server2,
      });

      const newOptions = await options.deleteServer(server1);

      expect(newOptions.servers["server-1"]).toBeUndefined();
      expect(newOptions.servers["server-2"]).toEqual(server2);
    });
  });

  describe("withOverrides", () => {
    it("should apply overrides to a copy of options", () => {
      const originalOptions = new ExtensionOptions();

      const overriddenOptions = originalOptions.withOverrides({
        useCompleteFilePath: true,
      });

      expect(overriddenOptions.useCompleteFilePath).toBeTruthy();
      expect(overriddenOptions).not.toBe(originalOptions);
    });

    it("should not modify original options", () => {
      const originalOptions = new ExtensionOptions();

      originalOptions.withOverrides({
        useCompleteFilePath: true,
      });

      expect(originalOptions.useCompleteFilePath).toBeFalsy();
    });
  });

  describe("fromStorage", () => {
    it("should return options from storage", async () => {
      const server = createMockServer({ uuid: "server-id" });
      const storedOptions = new ExtensionOptions({ "server-id": server }, ["server-id"], ["example.com"], ["exe"], true);
      const serialized = storedOptions.serialize();

      vi.mocked(browser.storage.sync.get).mockResolvedValueOnce({
        options: serialized,
      });

      const options = await ExtensionOptions.fromStorage();

      expect(options).toBeInstanceOf(ExtensionOptions);
      expect(options.servers).toEqual(storedOptions.servers);
      expect(options.excludedProtocols).toEqual(storedOptions.excludedProtocols);
      expect(options.excludedSites).toEqual(storedOptions.excludedSites);
      expect(options.excludedFileTypes).toEqual(storedOptions.excludedFileTypes);
      expect(options.useCompleteFilePath).toBe(storedOptions.useCompleteFilePath);
      expect(options.theme).toBe(storedOptions.theme);
    });

    it("should return default options when storage is empty", async () => {
      vi.mocked(browser.storage.sync.get).mockResolvedValueOnce({});

      const options = await ExtensionOptions.fromStorage();

      expect(options).toBeInstanceOf(ExtensionOptions);
      expect(options.servers).toEqual({});
      expect(options.excludedProtocols).toEqual([]);
      expect(options.excludedSites).toEqual([]);
      expect(options.excludedFileTypes).toEqual([]);
      expect(options.useCompleteFilePath).toBe(false);
      expect(options.theme).toBe(Theme.Auto);
    });

    it("should return default options when options field is missing", async () => {
      vi.mocked(browser.storage.sync.get).mockResolvedValueOnce({
        otherField: "value",
      });

      const options = await ExtensionOptions.fromStorage();

      expect(options).toBeInstanceOf(ExtensionOptions);
      expect(options.servers).toEqual({});
    });

    it("should correctly deserialize all properties from storage", async () => {
      const server = createMockServer({ uuid: "server-1" });
      const storedOptions = new ExtensionOptions({ "server-1": server }, ["ftp"], ["blocked.com"], ["zip"], true, Theme.Auto);
      const serialized = storedOptions.serialize();

      vi.mocked(browser.storage.sync.get).mockResolvedValueOnce({
        options: serialized,
      });

      const options = await ExtensionOptions.fromStorage();

      expect(options.servers).toEqual({ "server-1": server });
      expect(options.excludedProtocols).toEqual(["ftp"]);
      expect(options.excludedSites).toEqual(["blocked.com"]);
      expect(options.excludedFileTypes).toEqual(["zip"]);
      expect(options.useCompleteFilePath).toBeTruthy();
      expect(options.theme).toBe(Theme.Auto);
    });
  });
});
