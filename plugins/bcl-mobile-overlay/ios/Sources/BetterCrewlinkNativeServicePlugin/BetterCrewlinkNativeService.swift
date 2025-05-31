import Foundation

@objc public class BetterCrewlinkNativeService: NSObject {
    @objc public func echo(_ value: String) -> String {
        print(value)
        return value
    }
}
