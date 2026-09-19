#!/usr/bin/env node
// Compares mobile's ported desktop schema/constant files (src/app/common,
// src/app/voice/types.ts) against the actual bettercrewlink desktop source, so a
// future desktop change to ILobbySettings/AmongUsState/Player/the map data/the ICE
// or lobby-setting defaults doesn't silently drift out of sync with mobile.
//
// Requires a local checkout of the desktop repo (sibling `../bettercrewlink` by
// default, or $BCL_DESKTOP_REPO). When it isn't available - e.g. a CI job that only
// checks out this repo - the check is skipped (exit 0) rather than failed, since it
// can't do its job without the thing it's comparing against.
//
// Usage: node scripts/check-schema-drift.mjs
// Env:   BCL_DESKTOP_REPO=/path/to/bettercrewlink  BCL_DESKTOP_TAG=v3.2.1

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MOBILE_ROOT = resolve(__dirname, '..');
const DESKTOP_REPO = process.env.BCL_DESKTOP_REPO ?? resolve(MOBILE_ROOT, '../bettercrewlink');
const DESKTOP_TAG = process.env.BCL_DESKTOP_TAG ?? 'v3.2.1';

if (!existsSync(resolve(DESKTOP_REPO, '.git'))) {
	console.log(
		`[check-schema-drift] Desktop repo not found at ${DESKTOP_REPO} (set BCL_DESKTOP_REPO to override). Skipping.`
	);
	process.exit(0);
}

function desktopFile(path) {
	return execFileSync('git', ['-C', DESKTOP_REPO, 'show', `${DESKTOP_TAG}:${path}`], { encoding: 'utf8' });
}

function mobileFile(path) {
	return readFileSync(resolve(MOBILE_ROOT, path), 'utf8');
}

/** Returns the text between the first `{` after `header` and its matching `}`. */
function extractBlock(source, header) {
	const headerIndex = source.search(header);
	if (headerIndex === -1) {
		throw new Error(`Could not find ${header} in source`);
	}
	const openBraceIndex = source.indexOf('{', headerIndex);
	let depth = 0;
	let i = openBraceIndex;
	for (; i < source.length; i++) {
		if (source[i] === '{') depth++;
		else if (source[i] === '}') {
			depth--;
			if (depth === 0) break;
		}
	}
	return source.slice(openBraceIndex + 1, i);
}

/** Top-level `name:` / `name?:` keys of an interface body or object-literal body. */
function fieldNames(blockText) {
	const names = [];
	for (const line of blockText.split('\n')) {
		const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*\??\s*:/.exec(line);
		if (match) names.push(match[1]);
	}
	return names;
}

/** Top-level `Name,` / `Name = value,` members of an enum body. */
function enumMembers(blockText) {
	const names = [];
	for (const line of blockText.split('\n')) {
		const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*(=.*)?,?\s*(\/\/.*)?$/.exec(line.trim());
		if (match && match[1]) names.push(match[1]);
	}
	return names;
}

/** Parses the body of an object literal (as extracted by extractBlock) into a JS value. */
function parseObjectLiteral(blockText) {
	// eslint-disable-next-line no-new-func -- trusted local input (our own repo + a pinned desktop tag), not user data
	return new Function(`"use strict"; return ({${blockText}});`)();
}

function canonicalize(value) {
	if (Array.isArray(value)) return value.map(canonicalize);
	if (value && typeof value === 'object') {
		return Object.keys(value)
			.sort()
			.reduce((acc, key) => {
				acc[key] = canonicalize(value[key]);
				return acc;
			}, {});
	}
	return value;
}

const errors = [];

function checkFieldsExact(label, desktopFields, mobileFields) {
	const missing = desktopFields.filter((f) => !mobileFields.includes(f));
	const extra = mobileFields.filter((f) => !desktopFields.includes(f));
	if (missing.length) errors.push(`${label}: mobile is missing field(s) desktop has: ${missing.join(', ')}`);
	if (extra.length) errors.push(`${label}: mobile has unexpected extra field(s): ${extra.join(', ')}`);
}

function checkFieldsSuperset(label, desktopFields, mobileFields, allowedExtra) {
	const missing = desktopFields.filter((f) => !mobileFields.includes(f));
	const extra = mobileFields.filter((f) => !desktopFields.includes(f) && !allowedExtra.includes(f));
	if (missing.length) errors.push(`${label}: mobile is missing field(s) desktop has: ${missing.join(', ')}`);
	if (extra.length) errors.push(`${label}: mobile has undocumented extra field(s): ${extra.join(', ')}`);
}

/** Compares two extracted object-literal bodies by value, ignoring formatting/key order. */
function checkObjectDeepEqual(label, desktopBlockText, mobileBlockText) {
	const desktopValue = JSON.stringify(canonicalize(parseObjectLiteral(desktopBlockText)));
	const mobileValue = JSON.stringify(canonicalize(parseObjectLiteral(mobileBlockText)));
	if (desktopValue !== mobileValue) {
		errors.push(`${label}: mobile's values no longer match desktop's.`);
	}
}

// --- ILobbySettings (must match exactly, no mobile-only fields) ---
{
	const desktopSrc = desktopFile('src/common/ISettings.d.ts');
	const mobileSrc = mobileFile('src/app/common/ISettings.ts');
	const desktopFieldsList = fieldNames(extractBlock(desktopSrc, /export interface ILobbySettings/));
	const mobileFieldsList = fieldNames(extractBlock(mobileSrc, /export interface ILobbySettings/));
	checkFieldsExact('ILobbySettings', desktopFieldsList, mobileFieldsList);
}

// --- AmongUsState (must match exactly) ---
{
	const desktopSrc = desktopFile('src/common/AmongUsState.ts');
	const mobileSrc = mobileFile('src/app/common/AmongUsState.ts');
	checkFieldsExact(
		'AmongUsState',
		fieldNames(extractBlock(desktopSrc, /export interface AmongUsState/)),
		fieldNames(extractBlock(mobileSrc, /export interface AmongUsState/))
	);

	// --- Player (mobile may add its own `isbetter` flag; nothing else) ---
	checkFieldsSuperset(
		'Player',
		fieldNames(extractBlock(desktopSrc, /export interface Player/)),
		fieldNames(extractBlock(mobileSrc, /export interface Player \{/)),
		['isbetter']
	);

	// --- GameState enum ---
	checkFieldsExact(
		'GameState',
		enumMembers(extractBlock(desktopSrc, /export enum GameState/)),
		enumMembers(extractBlock(mobileSrc, /export enum GameState/))
	);
}

// --- AmongusMap: MapType / CameraLocation enums (map data ported verbatim) ---
{
	const desktopSrc = desktopFile('src/common/AmongusMap.ts');
	const mobileSrc = mobileFile('src/app/common/AmongusMap.ts');
	checkFieldsExact(
		'MapType',
		enumMembers(extractBlock(desktopSrc, /export enum MapType/)),
		enumMembers(extractBlock(mobileSrc, /export enum MapType/))
	);
	checkFieldsExact(
		'CameraLocation',
		enumMembers(extractBlock(desktopSrc, /export enum CameraLocation/)),
		enumMembers(extractBlock(mobileSrc, /export enum CameraLocation/))
	);
}

// --- GameInfo: interface ported verbatim (fields only; mobile fills them with defaults) ---
{
	const desktopSrc = desktopFile('src/common/GameInfo.ts');
	const mobileSrc = mobileFile('src/app/common/GameInfo.ts');
	checkFieldsExact(
		'GameInfo',
		fieldNames(extractBlock(desktopSrc, /export interface GameInfo/)),
		fieldNames(extractBlock(mobileSrc, /export interface GameInfo/))
	);
}

// --- voice/types.ts: defaultLobbySettings + ICE configs ported verbatim ---
{
	const desktopSrc = desktopFile('src/renderer/voice/types.ts');
	const mobileSrc = mobileFile('src/app/voice/types.ts');
	checkObjectDeepEqual(
		'defaultLobbySettings',
		extractBlock(desktopSrc, /export const defaultLobbySettings/),
		extractBlock(mobileSrc, /export const defaultLobbySettings/)
	);
	checkObjectDeepEqual(
		'DEFAULT_ICE_CONFIG',
		extractBlock(desktopSrc, /export const DEFAULT_ICE_CONFIG:/),
		extractBlock(mobileSrc, /export const DEFAULT_ICE_CONFIG:/)
	);
	checkObjectDeepEqual(
		'DEFAULT_ICE_CONFIG_TURN',
		extractBlock(desktopSrc, /export const DEFAULT_ICE_CONFIG_TURN/),
		extractBlock(mobileSrc, /export const DEFAULT_ICE_CONFIG_TURN/)
	);
	checkFieldsExact(
		'ClientPeerConfig',
		fieldNames(extractBlock(desktopSrc, /export interface ClientPeerConfig/)),
		fieldNames(extractBlock(mobileSrc, /export interface ClientPeerConfig/))
	);
}

if (errors.length) {
	console.error(`[check-schema-drift] Found ${errors.length} drift issue(s) against ${DESKTOP_TAG}:\n`);
	for (const error of errors) console.error(`  - ${error}`);
	console.error('\nUpdate the corresponding file(s) under src/app/common or src/app/voice/types.ts to match.');
	process.exit(1);
}

console.log(`[check-schema-drift] OK - mobile's ported schema matches desktop ${DESKTOP_TAG}.`);
