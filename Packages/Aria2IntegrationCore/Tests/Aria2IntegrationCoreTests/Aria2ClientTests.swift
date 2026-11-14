import Foundation
import Testing
import Aria2IntegrationCore
@testable import Aria2IntegrationShare

/// Answers requests from canned responses registered per host, so suites can run in parallel.
final class StubURLProtocol: URLProtocol {
    enum Response {
        case json(String)
        case failure(URLError.Code)
    }

    private static let lock = NSLock()
    private static var responses: [String: Response] = [:]
    private static var requests: [String: [(request: URLRequest, body: Data)]] = [:]

    static func register(_ response: Response, for host: String) {
        lock.withLock { responses[host] = response }
    }

    static func requests(for host: String) -> [(request: URLRequest, body: Data)] {
        lock.withLock { requests[host] ?? [] }
    }

    static func configuration() -> URLSessionConfiguration {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [StubURLProtocol.self]
        return configuration
    }

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func stopLoading() {}

    override func startLoading() {
        let host = request.url?.host() ?? ""
        let body = request.httpBody ?? Self.read(request.httpBodyStream)
        let response = Self.lock.withLock {
            Self.requests[host, default: []].append((request, body))
            return Self.responses[host]
        }

        switch response {
        case let .json(json):
            let http = HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: ["Content-Type": "application/json"])!
            client?.urlProtocol(self, didReceive: http, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: Data(json.utf8))
            client?.urlProtocolDidFinishLoading(self)
        case let .failure(code):
            client?.urlProtocol(self, didFailWithError: URLError(code))
        case nil:
            client?.urlProtocol(self, didFailWithError: URLError(.cannotFindHost))
        }
    }

    private static func read(_ stream: InputStream?) -> Data {
        guard let stream else { return Data() }
        stream.open()
        defer { stream.close() }
        var data = Data()
        var buffer = [UInt8](repeating: 0, count: 4096)
        while stream.hasBytesAvailable {
            let count = stream.read(&buffer, maxLength: buffer.count)
            guard count > 0 else { break }
            data.append(buffer, count: count)
        }
        return data
    }
}

@Suite("Aria2 client")
struct Aria2ClientTests {
    private static let success = #"{"jsonrpc":"2.0","id":"1","result":"2089b05ecca3d829"}"#

    /// Every test uses its own host so the stub can tell requests apart.
    private func server(secret: String = "", secure: Bool = false, port: Int = 6800, path: String = "/jsonrpc",
                        rpcParameters: [String: String] = [:]) -> Aria2Server {
        Aria2Server(secure: secure, host: "\(UUID().uuidString.lowercased()).test", port: port, path: path,
                    secret: secret, rpcParameters: rpcParameters)
    }

    private func sentRequest(to server: Aria2Server) throws -> (url: URL?, method: String, params: [Any]) {
        let requests = StubURLProtocol.requests(for: server.host)
        try #require(requests.count == 1)
        let json = try #require(try JSONSerialization.jsonObject(with: requests[0].body) as? [String: Any])
        return (requests[0].request.url, json["method"] as? String ?? "", json["params"] as? [Any] ?? [])
    }

    @Test("addUri sends the URI and the RPC parameters without a token when there is no secret")
    func addUriWithoutSecret() async throws {
        let server = server(rpcParameters: ["dir": "/downloads"])
        StubURLProtocol.register(.json(Self.success), for: server.host)

        try await server.addUri("https://example.com/file.mkv", configuration: StubURLProtocol.configuration())

        let request = try sentRequest(to: server)
        #expect(request.url?.absoluteString == "http://\(server.host):6800/jsonrpc")
        #expect(request.method == "aria2.addUri")
        #expect(request.params.count == 2)
        #expect(request.params.first as? [String] == ["https://example.com/file.mkv"])
        #expect(request.params.last as? [String: String] == ["dir": "/downloads"])
    }

    @Test("Sends the secret as the first parameter")
    func addUriWithSecret() async throws {
        let server = server(secret: "s3cr3t")
        StubURLProtocol.register(.json(Self.success), for: server.host)

        try await server.addUri("https://example.com/file.mkv", configuration: StubURLProtocol.configuration())

        let request = try sentRequest(to: server)
        #expect(request.params.count == 3)
        #expect(request.params.first as? String == "token:s3cr3t")
        #expect(request.params[1] as? [String] == ["https://example.com/file.mkv"])
    }

    @Test("Uses HTTPS, the port and the path of the server")
    func usesServerURL() async throws {
        let server = server(secure: true, port: 8443, path: "/aria2/jsonrpc")
        StubURLProtocol.register(.json(Self.success), for: server.host)

        try await server.addUri("https://example.com/file.mkv", configuration: StubURLProtocol.configuration())

        #expect(try sentRequest(to: server).url?.absoluteString == "https://\(server.host):8443/aria2/jsonrpc")
    }

    @Test("addTorrent sends the torrent in base64, no web seed and the RPC parameters")
    func addTorrent() async throws {
        let server = server(rpcParameters: ["dir": "/torrents"])
        StubURLProtocol.register(.json(Self.success), for: server.host)
        let torrent = Data("d4:infod4:name6:ubuntuee".utf8)

        try await server.addTorrent(torrent, configuration: StubURLProtocol.configuration())

        let request = try sentRequest(to: server)
        #expect(request.method == "aria2.addTorrent")
        #expect(request.params.count == 3)
        #expect(request.params[0] as? String == torrent.base64EncodedString())
        #expect((request.params[1] as? [Any])?.isEmpty == true)
        #expect(request.params[2] as? [String: String] == ["dir": "/torrents"])
    }

    @Test("Throws the aria2 error returned in the JSON-RPC body")
    func throwsRPCError() async {
        let server = server(secret: "wrong")
        StubURLProtocol.register(.json(#"{"jsonrpc":"2.0","id":"1","error":{"code":1,"message":"Unauthorized"}}"#), for: server.host)

        await #expect(throws: Aria2RPCError(code: 1, message: "Unauthorized")) {
            try await server.addUri("https://example.com/file.mkv", configuration: StubURLProtocol.configuration())
        }
    }

    @Test("Throws the system error, not Alamofire's wrapper, when the server cannot be reached")
    func throwsTransportError() async {
        let server = server()
        StubURLProtocol.register(.failure(.cannotConnectToHost), for: server.host)

        let error = await #expect(throws: URLError.self) {
            try await server.addUri("https://example.com/file.mkv", configuration: StubURLProtocol.configuration())
        }

        #expect(error?.code == .cannotConnectToHost)
        #expect(error?.localizedDescription.contains("URLSessionTask") == false)
    }

    @Test("Describes aria2 errors for the user")
    func errorDescription() {
        #expect(Aria2RPCError(code: 1, message: "Unauthorized").localizedDescription == "aria2 error 1: Unauthorized")
    }
}
