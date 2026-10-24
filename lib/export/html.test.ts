import { escapeHtml, html } from "./html";

describe("HTML escaping", () => {
  it("escapes markup and ampersands in template interpolations", () => {
    const notes = "<script>alert('x')</script> & more";
    expect(html`<p>${notes}</p>`).toBe(
      "<p>&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt; &amp; more</p>"
    );
  });

  it("escapes attribute delimiters", () => {
    expect(escapeHtml(`" onmouseover='alert(1)'`)).toBe(
      "&quot; onmouseover=&#39;alert(1)&#39;"
    );
  });
});
