import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { before, describe, it } from 'node:test';
import vm from 'node:vm';
import { CONFIG_PLACEHOLDER, SDK_PATH, build } from '../src/build.js';

describe('the built page', () => {
	let page;

	before(() => {
		page = build();
	});

	it('matches the committed dist/authorize.html', () => {
		const committed = readFileSync(join(import.meta.dirname, '../dist/authorize.html'), 'utf8');
		assert.ok(
			page === committed,
			'dist/ is out of date: run `npm run build` and commit the result'
		);
	});

	it('has nothing left to fill in but its config', () => {
		const withoutSDK = page.replace(/<script>.*?<\/script>/s, '');
		assert.doesNotMatch(withoutSDK, /\{\{\w+\}\}/);
		assert.equal(page.split(CONFIG_PLACEHOLDER).length, 2);
	});

	it('titles and brands the page', () => {
		assert.ok(page.includes('<title>mykeebs — Sign in</title>'));
		assert.ok(page.includes('<svg xmlns="http://www.w3.org/2000/svg"'));
		assert.ok(page.includes('aria-label="mykeebs"'));
		assert.ok(page.includes('href="data:image/svg+xml;base64,'));
		assert.ok(page.includes('--accent: #e8a33d;'));
	});

	it('loads nothing from other origins for itself', () => {
		const withoutSDK = page.replace(/<script>.*?<\/script>/s, '');
		assert.doesNotMatch(withoutSDK, /<script[^>]+src=/);
		assert.doesNotMatch(withoutSDK, /url\('https?:/);
		assert.doesNotMatch(withoutSDK, /<link[^>]+stylesheet/);
		assert.ok(!page.includes('fonts.googleapis.com'));
	});

	it('inlines each font weight', () => {
		const faces = [...page.matchAll(/src: url\('data:font\/woff2;base64,/g)];
		assert.equal(faces.length, 7);
	});

	it('names the licences of what it contains', () => {
		const opening = page.slice(0, page.indexOf('<html'));
		for (const text of ['SIL Open Font License', 'JetBrains Mono', 'Inter', '@stytch/vanilla-js']) {
			assert.ok(opening.includes(text), text);
		}
	});

	it('keeps the sign-in controls and legal links', () => {
		assert.ok(page.includes('id="switch-account"'));
		assert.ok(page.includes('Use a different account'));
		assert.ok(page.includes('href="https://mykeebs.com/privacy"'));
		assert.ok(page.includes('href="https://mykeebs.com/terms"'));
	});

	it('has just the three script elements it means to', () => {
		assert.equal(page.match(/<\/script/g).length, 3);
	});

	it('runs the inlined SDK', () => {
		const [, code] = page.match(/<script>(.*?)<\/script>/s);
		assert.equal(typeof loadSDK(code).StytchClient, 'function');
	});
});

describe('the IdP SDK', () => {
	const code = () => readFileSync(SDK_PATH, 'utf8');

	it('defines the global the page reads', () => {
		assert.equal(typeof loadSDK(code()), 'object');
	});

	it('exports the client and the custom elements the page defines', () => {
		const sdk = loadSDK(code());
		for (const name of ['StytchClient', 'StytchUI', 'StytchIdentityProvider']) {
			assert.equal(typeof sdk[name], 'function', name);
		}
	});

	it('exports the OAuth product and the Discord provider', () => {
		const sdk = loadSDK(code());
		assert.equal(typeof sdk.Products?.oauth, 'object');
		assert.equal(sdk.OAuthProviders?.Discord, 'discord');
	});
});

function loadSDK(code) {
	const context = vm.createContext({});
	for (const name of [
		'console',
		'setTimeout',
		'clearTimeout',
		'setInterval',
		'clearInterval',
		'URL',
		'URLSearchParams',
		'TextEncoder',
		'TextDecoder',
		'crypto',
		'fetch',
		'atob',
		'btoa',
		'queueMicrotask',
		'structuredClone',
		'AbortController',
		'Blob',
		'Event',
		'EventTarget'
	]) {
		context[name] = globalThis[name];
	}
	context.HTMLElement = class {};
	context.window = context;
	context.self = context;
	vm.runInContext(code, context);
	return context.stytch;
}
