import Foundation
import Capacitor

/**
 * Please read the Capacitor iOS Plugin Development Guide
 * here: https://capacitorjs.com/docs/plugins/ios
 */
@objc(BetterCrewlinkNativeServicePlugin)
public class BetterCrewlinkNativeServicePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BetterCrewlinkNativeServicePlugin"
    public let jsName = "BetterCrewlinkNativeService"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "echo", returnType: CAPPluginReturnPromise)
    ]
    private let implementation = BetterCrewlinkNativeService()

    @objc func echo(_ call: CAPPluginCall) {
        let value = call.getString("value") ?? ""
        call.resolve([
            "value": implementation.echo(value)
        ])
    }
}
