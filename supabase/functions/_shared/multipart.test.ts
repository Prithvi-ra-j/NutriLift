import { readBoundedMultipart } from "./multipart.ts";

Deno.test("bounded multipart reader accepts small audio uploads", async () => {
  const form = new FormData();
  form.append("audio", new File(["audio"], "voice.m4a", { type: "audio/m4a" }));
  const request = new Request("https://example.test/ai-transcribe", {
    method: "POST",
    body: form,
  });

  const result = await readBoundedMultipart(request, 1024);
  if (result.status !== "ok" || result.formData.getAll("audio").length !== 1) {
    throw new Error("Expected a bounded multipart audio request to be parsed.");
  }
});

Deno.test("bounded multipart reader rejects oversized request bodies before parsing", async () => {
  const form = new FormData();
  form.append("audio", new File([new Uint8Array(66 * 1024)], "voice.m4a", {
    type: "audio/m4a",
  }));
  const request = new Request("https://example.test/ai-transcribe", {
    method: "POST",
    body: form,
  });

  const result = await readBoundedMultipart(request, 1024);
  if (result.status !== "too_large") {
    throw new Error("Expected an oversized multipart request to be rejected.");
  }
});
