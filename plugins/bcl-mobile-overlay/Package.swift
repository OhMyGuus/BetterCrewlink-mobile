// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "BclMobileOverlay",
    platforms: [.iOS(.v14)],
    products: [
        .library(
            name: "BclMobileOverlay",
            targets: ["BetterCrewlinkNativeServicePlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "7.0.0")
    ],
    targets: [
        .target(
            name: "BetterCrewlinkNativeServicePlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm")
            ],
            path: "ios/Sources/BetterCrewlinkNativeServicePlugin"),
        .testTarget(
            name: "BetterCrewlinkNativeServicePluginTests",
            dependencies: ["BetterCrewlinkNativeServicePlugin"],
            path: "ios/Tests/BetterCrewlinkNativeServicePluginTests")
    ]
)