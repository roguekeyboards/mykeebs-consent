// Builds dist/authorize.html: the sign-in page with everything it needs inlined, so it renders
// with no other requests beyond the IdP's. The only thing left to fill in is the runtime config;
// see consent.go.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const root = join(import.meta.dirname, '..');

const brand = (name) => readFileSync(require.resolve(`@roguekeyboards/mykeebs-brand/${name}`));

export const CONFIG_PLACEHOLDER = '__CONSENT_CONFIG__';

// The SDK's iife bundle. The package's exports don't list it, so it's read by path.
export const SDK_PATH = join(root, 'node_modules/@stytch/vanilla-js/dist/iife/index.js');

// The bundle, unmodified but for keeping an inline script from ending early.
function sdk() {
	return readFileSync(SDK_PATH, 'utf8').replaceAll('</script', '<\\/script');
}

// fonts.css with its woff2 files as data URIs.
function fonts() {
	return brand('fonts.css')
		.toString()
		.replace(/\/\*.*?\*\/\n/s, '')
		.replace(/url\('\.\/(fonts\/[^']+)'\)/g, (_, file) => {
			return `url('data:font/woff2;base64,${brand(file).toString('base64')}')`;
		});
}

const NOTICES = `<!--
  Built by github.com/roguekeyboards/mykeebs-consent. Contains:
  - The mykeebs name, logo, icons and design tokens, under the terms in
    @roguekeyboards/mykeebs-brand's LICENSE, not the MIT license.
  - JetBrains Mono, Copyright 2020 The JetBrains Mono Project Authors
    (https://github.com/JetBrains/JetBrainsMono), and Inter, Copyright 2016 The
    Inter Project Authors (https://github.com/rsms/inter), under the
    SIL Open Font License 1.1: https://openfontlicense.org
  - @stytch/vanilla-js, Copyright Stytch, under the MIT license.
-->`;

/** Renders the page from src/page.html and the installed packages. */
export function build() {
	const parts = {
		favicon: brand('favicon.svg').toString('base64'),
		fonts: fonts(),
		tokens: brand('tokens.css').toString(),
		logo: brand('logo-horizontal-on-dark.svg').toString().trim(),
		sdk: sdk()
	};
	const page = readFileSync(join(root, 'src/page.html'), 'utf8')
		.replace(/<!--.*?-->/s, NOTICES)
		// A function, so a "$" in the inlined text isn't read as a replacement pattern.
		.replace(/\{\{(\w+)\}\}/g, (_, name) => parts[name]);

	if (page.split(CONFIG_PLACEHOLDER).length !== 2) {
		throw new Error(`the page must hold ${CONFIG_PLACEHOLDER} exactly once`);
	}
	return page;
}

if (process.argv[1] === import.meta.filename) {
	mkdirSync(join(root, 'dist'), { recursive: true });
	writeFileSync(join(root, 'dist/authorize.html'), build());
}
