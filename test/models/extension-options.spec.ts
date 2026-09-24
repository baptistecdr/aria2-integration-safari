import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExtensionOptions } from "@/models/extension-options";
import { Server } from "@/models/server";
import Theme from "@/models/theme";

describe("ExtensionOptions", () => {
  const createMockServer = (overrides?: Partial<Server>): Server =>
    Server.create({
      uuid: "test-uuid",
      name: "Test Server",
      ...overrides,
    });

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("should apply defaults when no data is provided", () => {
      const options = ExtensionOptions.create();

      expect(options).toEqual({
        servers: {},
        excludedProtocols: [],
        excludedSites: [],
        excludedFileTypes: [],
        useCompleteFilePath: false,
        theme: Theme.Auto,
      });
    });

    it("should apply defaults to nested servers", () => {
      const options = ExtensionOptions.create({
        servers: { "server-1": { uuid: "server-1" } as Server },
      });

      expect(options.servers["server-1"]).toEqual(Server.create({ uuid: "server-1" }));
    });

    it("should throw on invalid data", () => {
      expect(() => ExtensionOptions.create({ theme: "invalid" as Theme })).toThrow();
    });
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
      });

      const serialized = ExtensionOptions.serialize(options);
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
      const options = ExtensionOptions.create();
      const serialized = ExtensionOptions.serialize(options);

      await ExtensionOptions.toStorage(options);

      expect(browser.storage.sync.set).toHaveBeenCalledWith({
        options: serialized,
      });
      expect(browser.storage.sync.set).toHaveBeenCalledTimes(1);
    });

    it("should return the same object after saving", async () => {
      const options = ExtensionOptions.create();
      const result = await ExtensionOptions.toStorage(options);

      expect(result).toBe(options);
    });
  });

  describe("addServer", () => {
    it("should add a server and save to storage", async () => {
      const server = createMockServer();
      const options = ExtensionOptions.create();

      const newOptions = await ExtensionOptions.addServer(options, server);

      expect(newOptions.servers[server.uuid]).toEqual(server);
      expect(browser.storage.sync.set).toHaveBeenCalled();
    });

    it("should return a new object", async () => {
      const server = createMockServer();
      const options = ExtensionOptions.create();
      const newOptions = await ExtensionOptions.addServer(options, server);

      expect(newOptions).not.toBe(options);
      expect(options.servers).toEqual({});
    });

    it("should preserve existing servers when adding a new one", async () => {
      const server1 = createMockServer({ uuid: "server-1" });
      const server2 = createMockServer({ uuid: "server-2" });
      const options = ExtensionOptions.create({ servers: { "server-1": server1 } });

      const newOptions = await ExtensionOptions.addServer(options, server2);

      expect(newOptions.servers["server-1"]).toEqual(server1);
      expect(newOptions.servers["server-2"]).toEqual(server2);
    });

    it("should replace existing server with same uuid", async () => {
      const server = createMockServer({ uuid: "server-1", name: "Server 1" });
      const updatedServer = createMockServer({
        uuid: "server-1",
        name: "Updated Server 1",
      });
      const options = ExtensionOptions.create({ servers: { "server-1": server } });

      const newOptions = await ExtensionOptions.addServer(options, updatedServer);

      expect(newOptions.servers["server-1"].name).toBe("Updated Server 1");
    });
  });

  describe("deleteServer", () => {
    it("should delete a server and save to storage", async () => {
      const server = createMockServer();
      const options = ExtensionOptions.create({ servers: { [server.uuid]: server } });

      const newOptions = await ExtensionOptions.deleteServer(options, server);

      expect(newOptions.servers[server.uuid]).toBeUndefined();
      expect(browser.storage.sync.set).toHaveBeenCalled();
    });

    it("should return a new object", async () => {
      const server = createMockServer();
      const options = ExtensionOptions.create({ servers: { [server.uuid]: server } });
      const newOptions = await ExtensionOptions.deleteServer(options, server);

      expect(newOptions).not.toBe(options);
      expect(options.servers[server.uuid]).toEqual(server);
    });

    it("should preserve other servers when deleting one", async () => {
      const server1 = createMockServer({ uuid: "server-1" });
      const server2 = createMockServer({ uuid: "server-2" });
      const options = ExtensionOptions.create({
        servers: {
          "server-1": server1,
          "server-2": server2,
        },
      });

      const newOptions = await ExtensionOptions.deleteServer(options, server1);

      expect(newOptions.servers["server-1"]).toBeUndefined();
      expect(newOptions.servers["server-2"]).toEqual(server2);
    });
  });

  describe("withOverrides", () => {
    it("should apply overrides to a copy of options", () => {
      const originalOptions = ExtensionOptions.create();

      const overriddenOptions = ExtensionOptions.withOverrides(originalOptions, {
        useCompleteFilePath: true,
      });

      expect(overriddenOptions.useCompleteFilePath).toBe(true);
      expect(overriddenOptions).not.toBe(originalOptions);
    });

    it("should not modify original options", () => {
      const originalOptions = ExtensionOptions.create();

      ExtensionOptions.withOverrides(originalOptions, {
        useCompleteFilePath: true,
      });

      expect(originalOptions.useCompleteFilePath).toBe(false);
    });
  });

  describe("fromStorage", () => {
    it("should return options from storage", async () => {
      const server = createMockServer({ uuid: "server-id" });
      const storedOptions = ExtensionOptions.create({
        servers: { "server-id": server },
        excludedProtocols: ["server-id"],
        excludedSites: ["example.com"],
        excludedFileTypes: ["exe"],
        useCompleteFilePath: true,
      });

      vi.mocked(browser.storage.sync.get).mockResolvedValueOnce({
        options: ExtensionOptions.serialize(storedOptions),
      });

      const options = await ExtensionOptions.fromStorage();

      expect(options).toEqual(storedOptions);
    });

    it("should return default options when storage is empty", async () => {
      vi.mocked(browser.storage.sync.get).mockResolvedValueOnce({});

      const options = await ExtensionOptions.fromStorage();

      expect(options).toEqual(ExtensionOptions.create());
    });

    it("should return default options when options field is missing", async () => {
      vi.mocked(browser.storage.sync.get).mockResolvedValueOnce({
        otherField: "value",
      });

      const options = await ExtensionOptions.fromStorage();

      expect(options.servers).toEqual({});
    });

    it("should return default options and log the error when stored options are corrupted", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.mocked(browser.storage.sync.get).mockResolvedValueOnce({
        options: "not valid json{",
      });

      const options = await ExtensionOptions.fromStorage();

      expect(options).toEqual(ExtensionOptions.create());
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("should fill missing properties with defaults", async () => {
      vi.mocked(browser.storage.sync.get).mockResolvedValueOnce({
        options: JSON.stringify({ excludedSites: ["blocked.com"], servers: { "server-1": { uuid: "server-1", host: "nas" } } }),
      });

      const options = await ExtensionOptions.fromStorage();

      expect(options.excludedSites).toEqual(["blocked.com"]);
      expect(options.theme).toBe(Theme.Auto);
      expect(options.servers["server-1"]).toEqual(Server.create({ uuid: "server-1", host: "nas" }));
    });
  });
});
