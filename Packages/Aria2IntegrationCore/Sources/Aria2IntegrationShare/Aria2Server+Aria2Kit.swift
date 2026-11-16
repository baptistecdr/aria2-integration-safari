import Alamofire
import Aria2IntegrationCore
import Aria2Kit
import Foundation

public struct Aria2RPCError: LocalizedError, Equatable {
    public let code: Int
    public let message: String

    public var errorDescription: String? { "aria2 error \(code): \(message)" }
}

/// The server answered, but not like an aria2 JSON-RPC endpoint, or its settings cannot form a URL.
public enum Aria2ServerError: LocalizedError, Equatable {
    case invalidAddress
    case invalidPort(Int)
    case httpStatus(Int)
    case unexpectedResponse

    public var errorDescription: String? {
        switch self {
        case .invalidAddress: "The server address is not valid. Check its host and path."
        case let .invalidPort(port): "The server port \(port) is not valid."
        case let .httpStatus(status): "The server answered with HTTP \(status). Check its path."
        case .unexpectedResponse: "The server did not answer like aria2. Check its host, port and path."
        }
    }
}

extension Aria2Server {
    /// - Parameter configuration: overrides the URL session configuration (used by tests to stub the network).
    public func addUri(_ uri: String, configuration: URLSessionConfiguration? = nil) async throws {
        try await call(.addUri, params: [AnyEncodable([uri]), AnyEncodable(rpcParameters)], configuration: configuration)
    }

    /// - Parameter configuration: overrides the URL session configuration (used by tests to stub the network).
    public func addTorrent(_ torrent: Data, configuration: URLSessionConfiguration? = nil) async throws {
        try await call(.addTorrent, params: [
            AnyEncodable(torrent.base64EncodedString()),
            AnyEncodable([String]()),
            AnyEncodable(rpcParameters),
        ], configuration: configuration)
    }

    private struct RPCResponse: Decodable {
        struct RPCError: Decodable {
            let code: Int
            let message: String
        }

        let error: RPCError?
        let hasResult: Bool

        private enum CodingKeys: String, CodingKey {
            case error, result
        }

        init(from decoder: Decoder) throws {
            let container = try decoder.container(keyedBy: CodingKeys.self)
            error = try container.decodeIfPresent(RPCError.self, forKey: .error)
            hasResult = container.contains(.result)
        }
    }

    private func client(configuration: URLSessionConfiguration?) throws -> Aria2 {
        guard let port = UInt16(exactly: port), port > 0 else {
            throw Aria2ServerError.invalidPort(self.port)
        }
        // Aria2Kit force-unwraps the URL it builds from these parts: check the same string first,
        // and that it really targets the host (a host typed as "http://nas.local" would not).
        let path = path.hasPrefix("/") ? String(path.dropFirst()) : path
        let brackets = CharacterSet(charactersIn: "[]")
        guard let url = URL(string: "\(secure ? "https" : "http")://\(host):\(port)/\(path)"),
              let urlHost = url.host(percentEncoded: false),
              urlHost.trimmingCharacters(in: brackets)
                  .caseInsensitiveCompare(host.trimmingCharacters(in: brackets)) == .orderedSame
        else {
            throw Aria2ServerError.invalidAddress
        }

        let session = configuration.map { Session(configuration: $0) } ?? .default
        // aria2 rejects a "token:" parameter when no secret is configured, so pass nil instead of "".
        return Aria2(
            ssl: secure,
            host: host,
            port: port,
            path: self.path,
            token: secret.isEmpty ? nil : secret,
            session: session
        )
    }

    /// Alamofire only reports transport failures; JSON-RPC errors and HTTP statuses are checked here.
    private func call(_ method: Aria2Method, params: [AnyEncodable], configuration: URLSessionConfiguration?) async throws {
        let response = try await client(configuration: configuration).call(method: method, params: params)
        let data: Data
        switch response.result {
        case let .success(body):
            data = body
        case let .failure(error):
            // Surface the system error ("Could not connect to the server.") rather than Alamofire's wrapper.
            throw error.underlyingError ?? error
        }

        // aria2 sends its errors (e.g. Unauthorized) with an HTTP 400 status, so read the body first.
        let rpcResponse = try? JSONDecoder().decode(RPCResponse.self, from: data)
        if let error = rpcResponse?.error {
            throw Aria2RPCError(code: error.code, message: error.message)
        }
        if let status = response.response?.statusCode, !(200 ..< 300).contains(status) {
            throw Aria2ServerError.httpStatus(status)
        }
        guard rpcResponse?.hasResult == true else {
            throw Aria2ServerError.unexpectedResponse
        }
    }
}
