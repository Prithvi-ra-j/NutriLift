export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type HtmlInterpolation = string | number | boolean | null | undefined;

export function html(strings: TemplateStringsArray, ...values: HtmlInterpolation[]): string {
  return strings.reduce((result, part, index) => {
    const value = values[index];
    return result + part + (value === null || value === undefined ? "" : escapeHtml(String(value)));
  }, "");
}
