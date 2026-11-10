// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "Aria2IntegrationCore",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        // Linked by the Safari extensions: no third-party dependency.
        .library(name: "Aria2IntegrationCore", targets: ["Aria2IntegrationCore"]),
        // Linked by the Share Extension: parses shared items and talks to aria2 through Aria2Kit.
        .library(name: "Aria2IntegrationShare", targets: ["Aria2IntegrationShare"]),
    ],
    dependencies: [
        .package(url: "https://github.com/baptistecdr/Aria2Kit", from: "1.0.7"),
        // Imported directly to inject a URLSession configuration; the version follows Aria2Kit's pin.
        .package(url: "https://github.com/Alamofire/Alamofire", from: "5.12.0"),
    ],
    targets: [
        .target(name: "Aria2IntegrationCore"),
        .target(name: "Aria2IntegrationShare", dependencies: ["Aria2IntegrationCore", "Aria2Kit", "Alamofire"]),
        .testTarget(
            name: "Aria2IntegrationCoreTests",
            dependencies: ["Aria2IntegrationCore", "Aria2IntegrationShare"]
        ),
    ],
    swiftLanguageModes: [.v5]
)
