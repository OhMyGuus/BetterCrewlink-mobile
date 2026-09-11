import { ClientPeerConfig } from '../voice/types';

// Hand-rolled equivalent of desktop's Ajv-compiled schema (src/renderer/lib/validateClientPeerConfig.ts).
// Desktop pulls in Ajv + ajv-formats (~120KB) for a validator this small; mobile doesn't need
// a general-purpose JSON Schema engine for one shape, so this checks the same fields by hand.
// Matches Ajv's compiled-validator calling convention (return boolean, read `.errors` after a
// failed call) so callers can be a near-verbatim port of desktop's usage.
export interface ValidationError {
	instancePath: string;
	message: string;
}

export interface ClientPeerConfigValidator {
	(value: unknown): value is ClientPeerConfig;
	errors: ValidationError[] | null;
}

function isValidUrl(value: unknown): value is string {
	if (typeof value !== 'string' || value.length === 0) return false;
	try {
		new URL(value);
		return true;
	} catch {
		return false;
	}
}

function isValidUrls(value: unknown): boolean {
	if (typeof value === 'string') return isValidUrl(value);
	return Array.isArray(value) && value.length > 0 && value.every((url) => isValidUrl(url));
}

function validate(value: unknown): value is ClientPeerConfig {
	const errors: ValidationError[] = [];

	if (typeof value !== 'object' || value === null) {
		errors.push({ instancePath: '', message: 'must be an object' });
		validateClientPeerConfig.errors = errors;
		return false;
	}

	const config = value as Record<string, unknown>;

	if (typeof config.forceRelayOnly !== 'boolean') {
		errors.push({ instancePath: '/forceRelayOnly', message: 'must be a boolean' });
	}

	if (!Array.isArray(config.iceServers)) {
		errors.push({ instancePath: '/iceServers', message: 'must be an array' });
	} else {
		config.iceServers.forEach((server: unknown, index: number) => {
			if (typeof server !== 'object' || server === null) {
				errors.push({ instancePath: `/iceServers/${index}`, message: 'must be an object' });
				return;
			}
			const iceServer = server as Record<string, unknown>;
			if (!isValidUrls(iceServer.urls)) {
				errors.push({ instancePath: `/iceServers/${index}/urls`, message: 'must be a URL or non-empty array of URLs' });
			}
			if (iceServer.username !== undefined && typeof iceServer.username !== 'string') {
				errors.push({ instancePath: `/iceServers/${index}/username`, message: 'must be a string' });
			}
			if (iceServer.credential !== undefined && typeof iceServer.credential !== 'string') {
				errors.push({ instancePath: `/iceServers/${index}/credential`, message: 'must be a string' });
			}
		});
	}

	validateClientPeerConfig.errors = errors.length ? errors : null;
	return errors.length === 0;
}

export const validateClientPeerConfig = validate as ClientPeerConfigValidator;
validateClientPeerConfig.errors = null;
