# mykeebs-consent

mykeebs' sign-in, consent and logout page, which [mykeebs-api](https://github.com/roguekeyboards/mykeebs-api) serves at `GET /authorize`. MCP clients and the app both sign in through it.

It's built into one file, `dist/authorize.html`, with the logo, fonts, design tokens and IdP browser SDK inlined, so mykeebs-api has a single thing to embed and the page doesn't depend on any other mykeebs site being up. It's about 570 KB, which is fine for a page people see about once per session.

## How it fits together

- `src/page.html` is the page: its markup, styles and sign-in logic. Change the page here.
- `src/build.js` fills it in from [`@roguekeyboards/mykeebs-brand`](https://github.com/roguekeyboards/mykeebs-brand) and `@stytch/vanilla-js`, and writes `dist/authorize.html`.
- `consent.go` is the Go module mykeebs-api imports. It embeds that file and fills in the two values that differ per environment:

```go
page, err := consent.Page(consent.Config{
	PublicToken:   publicToken,
	IssuerBaseURL: issuerURL,
})
```

The module has no dependencies, so mykeebs-api needs no Node to build. `dist/` is committed because Go fetches modules from their git tags.

## Local setup

Tooling is pinned with [mise](https://mise.jdx.dev). Installing the brand package needs a `GITHUB_PACKAGES_TOKEN` with `read:packages`, set in `mise.local.toml`.

```sh
mise install
eval "$(mise env)" && npm ci
mise run build    # rebuild dist/, then build and vet the module
mise run test     # the Node and Go tests
mise run lint     # prettier, eslint, golangci-lint and actionlint
```

## Changing the page

1. Edit `src/page.html`, then `npm run build`, and commit both.
2. A `feat` or `fix` title makes merging lead to a release PR. Merging that tags the version Go fetches.
3. Renovate bumps the module in mykeebs-api, whose browser tests run the page against a real stack before it deploys. This repo's tests can't sign in for real.

Renovate rebuilds `dist/` when it bumps the brand or the SDK, and titles those PRs `fix`, since they change the page.

## License

The code is [MIT](LICENSE-MIT). The built page also contains the mykeebs brand, fonts and the Stytch SDK under their own terms; see [`LICENSE`](LICENSE).
