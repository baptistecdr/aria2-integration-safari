import Foundation
import Testing
import UniformTypeIdentifiers
@testable import Aria2IntegrationShare

@Suite("SharedPayload")
struct SharedPayloadTests {
    private func item(_ providers: NSItemProvider...) -> NSExtensionItem {
        let item = NSExtensionItem()
        item.attachments = providers
        return item
    }

    private func linkProvider(_ link: String) -> NSItemProvider {
        NSItemProvider(object: NSURL(string: link)!)
    }

    private func temporaryFile(named name: String, contents: Data) throws -> URL {
        let directory = FileManager.default.temporaryDirectory.appending(path: UUID().uuidString)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let file = directory.appending(path: name)
        try contents.write(to: file)
        return file
    }

    private let torrentData = Data("d4:infod4:name6:ubuntuee".utf8)

    @Test("A web link without a suggested name is sent as a URI, not as a torrent")
    func webLinkIsURI() async {
        let link = "https://n3zy9n.debrid.it/dl/5epfbx8e738/Tulsa%20King%20-%20S04E04%20-%20Case%20d%C3%A9part%202160p.DV.HDR.x265-Amen.mkv"
        let provider = linkProvider(link)
        #expect(provider.suggestedName == nil)

        let payload = await SharedPayload.load(from: [item(provider)])

        #expect(payload == .uri(link))
    }

    @Test("A magnet link is sent as a URI")
    func magnetIsURI() async {
        let magnet = "magnet:?xt=urn:btih:c9e15763f722f23e98a29decdfae341b98d53056&dn=ubuntu"

        let payload = await SharedPayload.load(from: [item(linkProvider(magnet))])

        #expect(payload == .uri(magnet))
    }

    @Test("A remote link to a .torrent file is sent as a URI for aria2 to fetch")
    func remoteTorrentLinkIsURI() async {
        let link = "https://releases.ubuntu.com/ubuntu.iso.torrent"

        let payload = await SharedPayload.load(from: [item(linkProvider(link))])

        #expect(payload == .uri(link))
    }

    @Test("A local .torrent file is sent as a torrent")
    func localTorrentFile() async throws {
        let file = try temporaryFile(named: "ubuntu.torrent", contents: torrentData)
        let provider = try #require(NSItemProvider(contentsOf: file))

        let payload = await SharedPayload.load(from: [item(provider)])

        guard case let .torrent(data, name) = payload else {
            Issue.record("Expected a torrent, got \(String(describing: payload))")
            return
        }
        #expect(data == torrentData)
        #expect(name.hasPrefix("ubuntu"))
    }

    @Test("Torrent data typed as org.bittorrent.torrent is sent as a torrent")
    func torrentTypedData() async {
        let provider = NSItemProvider()
        provider.suggestedName = "debian.torrent"
        provider.registerDataRepresentation(forTypeIdentifier: SharedPayload.torrentTypeIdentifier, visibility: .all) { completion in
            completion(self.torrentData, nil)
            return nil
        }

        let payload = await SharedPayload.load(from: [item(provider)])

        #expect(payload == .torrent(torrentData, name: "debian.torrent"))
    }

    @Test("A local file that is not a torrent is rejected")
    func otherLocalFileIsRejected() async throws {
        let file = try temporaryFile(named: "notes.txt", contents: Data("hello".utf8))
        let provider = try #require(NSItemProvider(contentsOf: file))

        let payload = await SharedPayload.load(from: [item(provider)])

        #expect(payload == nil)
    }

    @Test("Nothing shared gives no payload")
    func nothingShared() async {
        #expect(await SharedPayload.load(from: []) == nil)
        #expect(await SharedPayload.load(from: [NSExtensionItem()]) == nil)
    }

    @Test("Skips unsupported attachments and uses the first supported one")
    func firstSupportedAttachment() async {
        let text = NSItemProvider(object: "just some text" as NSString)
        let link = "https://example.com/file.zip"

        let payload = await SharedPayload.load(from: [item(text, linkProvider(link))])

        #expect(payload == .uri(link))
    }

    @Test("Displays the URI or the torrent name")
    func displayText() {
        #expect(SharedPayload.uri("https://example.com/a.zip").displayText == "https://example.com/a.zip")
        #expect(SharedPayload.torrent(torrentData, name: "ubuntu.torrent").displayText == "ubuntu.torrent")
    }
}
