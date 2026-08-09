#!/usr/bin/env bash
set -euo pipefail

# Builds a signed release AAB for the BetterCrewlink Android app.
#
# Keystore/key passwords are never passed as command-line arguments, never
# written to disk, and never visible in shell history. This script prompts
# for them itself (hidden input) and exports them only for the lifetime of
# the single `./gradlew bundleRelease` subprocess below, then clears them.
#
# (Gradle's own interactive password prompt - the usual alternative - does
# NOT work for AAB signing specifically: FinalizeBundleTask/bundletool
# throws a bare NullPointerException instead of prompting when the
# passwords are null. That's an AGP limitation, not something we can fix
# here, hence this script prompting on Gradle's behalf.)
#
# Usage:
#   ./scripts/build-release-aab.sh --keystore /path/to/release.jks [--alias bcl_key] [--version-code N] [--version-name X.Y.Z]

usage() {
	echo "Usage: $0 --keystore /path/to/release.jks [--alias bcl_key] [--version-code N] [--version-name X.Y.Z]"
	exit 1
}

KEYSTORE=""
ALIAS="bcl_key"
VERSION_CODE=""
VERSION_NAME=""

while [[ $# -gt 0 ]]; do
	case "$1" in
		--keystore) KEYSTORE="$2"; shift 2 ;;
		--alias) ALIAS="$2"; shift 2 ;;
		--version-code) VERSION_CODE="$2"; shift 2 ;;
		--version-name) VERSION_NAME="$2"; shift 2 ;;
		-h|--help) usage ;;
		*) echo "Unknown argument: $1"; usage ;;
	esac
done

[[ -z "$KEYSTORE" ]] && { echo "Missing --keystore"; usage; }
[[ -f "$KEYSTORE" ]] || { echo "Keystore not found at: $KEYSTORE"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRIPT_DIR"

if [[ -f .nvmrc ]] && command -v nvm >/dev/null 2>&1; then
	# shellcheck disable=SC1090
	source "$NVM_DIR/nvm.sh"
	nvm use
fi

if [[ -n "$VERSION_CODE" ]]; then
	echo "==> Setting versionCode to $VERSION_CODE"
	sed -i.bak -E "s/versionCode = [0-9]+/versionCode = $VERSION_CODE/" android/app/build.gradle
	rm -f android/app/build.gradle.bak
	if ! grep -q "versionCode = $VERSION_CODE" android/app/build.gradle; then
		echo "Failed to update versionCode - pattern not found in android/app/build.gradle"
		exit 1
	fi
fi
if [[ -n "$VERSION_NAME" ]]; then
	echo "==> Setting versionName to $VERSION_NAME"
	sed -i.bak -E "s/versionName = \"[^\"]*\"/versionName = \"$VERSION_NAME\"/" android/app/build.gradle
	rm -f android/app/build.gradle.bak
	if ! grep -q "versionName = \"$VERSION_NAME\"" android/app/build.gradle; then
		echo "Failed to update versionName - pattern not found in android/app/build.gradle"
		exit 1
	fi
fi

echo "==> Building web app (ng build --configuration production)"
npx ng build --configuration production

echo "==> Syncing web assets into the Android project (cap sync android)"
npx cap sync android

echo "==> Building signed release AAB"
export RELEASE_STORE_FILE="$(cd "$(dirname "$KEYSTORE")" && pwd)/$(basename "$KEYSTORE")"
export RELEASE_KEY_ALIAS="$ALIAS"

read -r -s -p "Keystore password: " RELEASE_STORE_PASSWORD
echo
read -r -s -p "Key password (press Enter to reuse the keystore password): " RELEASE_KEY_PASSWORD
echo
export RELEASE_STORE_PASSWORD
export RELEASE_KEY_PASSWORD="${RELEASE_KEY_PASSWORD:-$RELEASE_STORE_PASSWORD}"

cleanup() {
	unset RELEASE_STORE_PASSWORD RELEASE_KEY_PASSWORD
}
trap cleanup EXIT

cd android
./gradlew bundleRelease

AAB_PATH="app/build/outputs/bundle/release/app-release.aab"
if [[ -f "$AAB_PATH" ]]; then
	echo ""
	echo "Release AAB built: android/$AAB_PATH"
else
	echo "Build finished but AAB not found at expected path: android/$AAB_PATH"
	exit 1
fi
