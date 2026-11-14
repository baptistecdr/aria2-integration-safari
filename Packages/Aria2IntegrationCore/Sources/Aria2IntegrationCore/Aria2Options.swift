import Foundation

/// The App Group shared by the Safari extension and the native extensions (e.g. the iOS Share Extension).
public enum AppGroup {
    public static let identifier = "group.eu.bcosp.aria2-integration"

    /// `nil` when the current target is not entitled to the App Group (e.g. the macOS extension for now).
    public static var defaults: UserDefaults? {
        guard FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: identifier) != nil else {
            return nil
        }
        return UserDefaults(suiteName: identifier)
    }
}

/// Mirror of the web extension's `Server` model (src/models/server.ts), including its defaults.
public struct Aria2Server: Decodable, Identifiable, Hashable {
    public let uuid: String
    public let name: String
    public let secure: Bool
    public let host: String
    public let port: Int
    public let path: String
    public let secret: String
    public let rpcParameters: [String: String]

    public var id: String { uuid }

    public init(
        uuid: String = UUID().uuidString,
        name: String = "Localhost",
        secure: Bool = false,
        host: String = "localhost",
        port: Int = 6800,
        path: String = "/jsonrpc",
        secret: String = "",
        rpcParameters: [String: String] = [:]
    ) {
        self.uuid = uuid
        self.name = name
        self.secure = secure
        self.host = host
        self.port = port
        self.path = path
        self.secret = secret
        self.rpcParameters = rpcParameters
    }

    private enum CodingKeys: String, CodingKey {
        case uuid, name, secure, host, port, path, secret, rpcParameters
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.init(
            uuid: try container.decode(String.self, forKey: .uuid),
            name: try container.decodeIfPresent(String.self, forKey: .name) ?? "Localhost",
            secure: try container.decodeIfPresent(Bool.self, forKey: .secure) ?? false,
            host: try container.decodeIfPresent(String.self, forKey: .host) ?? "localhost",
            port: try container.decodeIfPresent(Int.self, forKey: .port) ?? 6800,
            path: try container.decodeIfPresent(String.self, forKey: .path) ?? "/jsonrpc",
            secret: try container.decodeIfPresent(String.self, forKey: .secret) ?? "",
            rpcParameters: try container.decodeIfPresent([String: String].self, forKey: .rpcParameters) ?? [:]
        )
    }
}

/// Reads and writes the extension options (serialized by `ExtensionOptions.serialize`) in the App Group.
public enum OptionsStore {
    static let optionsKey = "options"

    private struct StoredOptions: Decodable {
        let servers: [String: Aria2Server]
    }

    @discardableResult
    public static func save(serializedOptions: String, in defaults: UserDefaults? = AppGroup.defaults) -> Bool {
        guard let defaults else { return false }
        defaults.set(serializedOptions, forKey: optionsKey)
        return true
    }

    public static func servers(in defaults: UserDefaults? = AppGroup.defaults) -> [Aria2Server] {
        guard let json = defaults?.string(forKey: optionsKey),
              let options = try? JSONDecoder().decode(StoredOptions.self, from: Data(json.utf8))
        else { return [] }
        return options.servers.values.sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
    }
}
