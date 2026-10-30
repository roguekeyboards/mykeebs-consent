// Package consent holds mykeebs' sign-in, consent and logout page, built into
// one file with its logo, fonts, tokens and IdP browser SDK inlined.
package consent

import (
	"bytes"
	_ "embed" // for the page
	"encoding/json"
	"fmt"
)

//go:embed dist/authorize.html
var page []byte

// placeholder marks where the page expects its runtime config, inside a
// <script type="application/json"> element.
var placeholder = []byte("__CONSENT_CONFIG__")

// Config is what the page needs at runtime, which differs per environment.
type Config struct {
	// PublicToken is the IdP's public token for the consent page.
	PublicToken string `json:"publicToken"`
	// IssuerBaseURL is the OIDC issuer the IdP client talks to.
	IssuerBaseURL string `json:"issuerBaseUrl"`
}

// Page renders the page with config filled in. encoding/json escapes <, > and
// &, so no value can end the <script> element it's written into.
func Page(config Config) ([]byte, error) {
	encoded, err := json.Marshal(config)
	if err != nil {
		return nil, fmt.Errorf("encoding consent config: %w", err)
	}
	return bytes.Replace(page, placeholder, encoded, 1), nil
}
