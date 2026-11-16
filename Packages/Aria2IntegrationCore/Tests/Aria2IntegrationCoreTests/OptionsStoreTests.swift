import Foundation
import Testing
@testable import Aria2IntegrationCore

@Suite("OptionsStore")
struct OptionsStoreTests {
    private let suiteName = "Aria2IntegrationCoreTests-\(UUID().uuidString)"
    private let defaults: UserDefaults

    init() {
        defaults = UserDefaults(suiteName: suiteName)!
    }

    private static let serializedOptions = """
    {
      "servers": {
        "b": { "uuid": "b", "name": "zeta", "host": "zeta.lan" },
        "a": { "uuid": "a", "name": "Alpha", "host": "alpha.lan", "secret": "token" },
        "c": { "uuid": "c", "name": "beta", "host": "beta.lan" }
      },
      "excludedProtocols": [],
      "excludedSites": [],
      "excludedFileTypes": [],
      "useCompleteFilePath": false,
      "theme": "auto"
    }
    """

    @Test("Saves the options and reads the servers back sorted by name")
    func savesAndReadsServers() {
        #expect(OptionsStore.save(serializedOptions: Self.serializedOptions, in: defaults))

        let servers = OptionsStore.servers(in: defaults)

        #expect(servers.map(\.name) == ["Alpha", "beta", "zeta"])
        #expect(servers.first?.secret == "token")
    }

    @Test("Overwrites the previous options")
    func overwritesPreviousOptions() {
        OptionsStore.save(serializedOptions: Self.serializedOptions, in: defaults)
        OptionsStore.save(serializedOptions: #"{ "servers": {} }"#, in: defaults)

        #expect(OptionsStore.servers(in: defaults).isEmpty)
    }

    @Test("Returns no server when nothing was synced yet")
    func emptyWhenNothingSaved() {
        #expect(OptionsStore.servers(in: defaults).isEmpty)
    }

    @Test("Returns no server when the stored options are invalid")
    func emptyWhenInvalid() {
        OptionsStore.save(serializedOptions: "not json", in: defaults)

        #expect(OptionsStore.servers(in: defaults).isEmpty)
    }

    @Test("Does nothing without access to the App Group")
    func noAppGroup() {
        #expect(OptionsStore.save(serializedOptions: Self.serializedOptions, in: nil) == false)
        #expect(OptionsStore.servers(in: nil).isEmpty)
    }
}
