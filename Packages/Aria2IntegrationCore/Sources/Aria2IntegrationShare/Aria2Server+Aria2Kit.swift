import Alamofire
import Aria2IntegrationCore
import Aria2Kit
import Foundation

public struct Aria2RPCError: LocalizedError, Equatable {
    public let code: Int
    public let message: String

    public var errorDescription: String? { "aria2 error \(code): \(message)" }
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
    }

    private func client(configuration: URLSessionConfiguration?) -> Aria2 {
        let session = configuration.map { Session(configuration: $0) } ?? .default
        // aria2 rejects a "token:" parameter when no secret is configured, so pass nil instead of "".
        return Aria2(
            ssl: secure,
            host: host,
            port: UInt16(clamping: port),
            path: path,
            token: secret.isEmpty ? nil : secret,
            session: session
        )
    }

    /// Alamofire only reports transport failures; JSON-RPC errors come back in the body.
    private func call(_ method: Aria2Method, params: [AnyEncodable], configuration: URLSessionConfiguration?) async throws {
        let response = await client(configuration: configuration).call(method: method, params: params)
        let data: Data
        switch response.result {
        case let .success(body):
            data = body
        case let .failure(error):
            // Surface the system error ("Could not connect to the server.") rather than Alamofire's wrapper.
            throw error.underlyingError ?? error
        }
        if let error = try? JSONDecoder().decode(RPCResponse.self, from: data).error {
            throw Aria2RPCError(code: error.code, message: error.message)
        }
    }
}
