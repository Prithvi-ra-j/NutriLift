import { escapeHtml, html } from "../html";

describe("PDF HTML escaping", () => {
  it("escapes all HTML-sensitive characters", () => {
    expect(escapeHtml(`<script>alert("x") & 'y'</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;) &amp; &#39;y&#39;&lt;/script&gt;",
    );
  });

  it("escapes interpolated template values", () => {
    const note = '<script>alert("x")</script> & oats';
    expect(html`<p>${note}</p>`).toBe(
      "<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; oats</p>",
    );
  });
});
