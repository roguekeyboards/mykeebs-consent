package consent

import (
	"bytes"
	"strings"
	"testing"
)

func render(t *testing.T, config Config) string {
	t.Helper()
	out, err := Page(config)
	if err != nil {
		t.Fatal(err)
	}
	return string(out)
}

func TestPageFillsInConfig(t *testing.T) {
	body := render(t, Config{PublicToken: "public-token-abc", IssuerBaseURL: "https://auth.example.com"})
	want := `<script type="application/json" id="config">{"publicToken":"public-token-abc","issuerBaseUrl":"https://auth.example.com"}</script>`
	if !strings.Contains(body, want) {
		t.Errorf("page is missing %s", want)
	}
	if strings.Contains(body, string(placeholder)) {
		t.Error("page still holds the placeholder")
	}
}

func TestPageEscapesConfig(t *testing.T) {
	body := render(t, Config{PublicToken: `"</script><script>alert(1)</script>`})
	if strings.Contains(body, "<script>alert(1)") {
		t.Error("a config value broke out of its script element")
	}
	if !strings.Contains(body, `\"</script>`) {
		t.Error("config value wasn't JSON-escaped")
	}
}

func TestPageLeavesTheEmbeddedPageUnchanged(t *testing.T) {
	before := bytes.Clone(page)
	render(t, Config{PublicToken: "a"})
	if !bytes.Equal(before, page) {
		t.Error("rendering changed the embedded page")
	}
	if bytes.Count(page, placeholder) != 1 {
		t.Errorf("page holds the placeholder %d times, want 1", bytes.Count(page, placeholder))
	}
}

func TestPageRendersEachConfigSeparately(t *testing.T) {
	first := render(t, Config{PublicToken: "first"})
	second := render(t, Config{PublicToken: "second"})
	if !strings.Contains(first, `"first"`) || !strings.Contains(second, `"second"`) || strings.Contains(second, `"first"`) {
		t.Error("renders share state")
	}
}
