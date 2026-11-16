import Foundation
import Testing
@testable import Aria2IntegrationCore

@Suite("Aria2Server decoding")
struct Aria2ServerDecodingTests {
    private func decode(_ json: String) throws -> Aria2Server {
        try JSONDecoder().decode(Aria2Server.self, from: Data(json.utf8))
    }

    @Test("Decodes a server serialized by the web extension")
    func decodesFullServer() throws {
        // Shape produced by ExtensionOptions.serialize (src/models/server.ts), extra keys included.
        let server = try decode("""
        {
          "uuid": "0b4c5c1e-1d1e-4a57-9a3a-1f0f6a0c1a11",
          "name": "Seedbox",
          "secure": true,
          "host": "seedbox.example.com",
          "port": 443,
          "path": "/rpc",
          "secret": "s3cr3t",
          "rpcParameters": { "dir": "/downloads", "split": "4" },
          "incognitoModeOptions": { "overwriteRpcParameters": false, "rpcParameters": {} }
        }
        """)

        #expect(server == Aria2Server(
            uuid: "0b4c5c1e-1d1e-4a57-9a3a-1f0f6a0c1a11",
            name: "Seedbox",
            secure: true,
            host: "seedbox.example.com",
            port: 443,
            path: "/rpc",
            secret: "s3cr3t",
            rpcParameters: ["dir": "/downloads", "split": "4"]
        ))
        #expect(server.id == server.uuid)
    }

    @Test("Falls back to the same defaults as the zod schema")
    func appliesDefaults() throws {
        let server = try decode(#"{ "uuid": "abc" }"#)

        #expect(server.name == "Localhost")
        #expect(server.secure == false)
        #expect(server.host == "localhost")
        #expect(server.port == 6800)
        #expect(server.path == "/jsonrpc")
        #expect(server.secret == "")
        #expect(server.rpcParameters.isEmpty)
    }

    @Test("Requires a uuid")
    func requiresUUID() {
        #expect(throws: DecodingError.self) {
            try decode(#"{ "name": "No id" }"#)
        }
    }

    @Test("Rejects values of the wrong type")
    func rejectsWrongTypes() {
        #expect(throws: DecodingError.self) {
            try decode(#"{ "uuid": "abc", "port": "6800" }"#)
        }
    }
}
