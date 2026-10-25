const MULTIPART_OVERHEAD_LIMIT = 64 * 1024;

export type BoundedMultipartResult =
  | { status: "ok"; formData: FormData }
  | { status: "too_large" }
  | { status: "invalid" };

export async function readBoundedMultipart(
  request: Request,
  maxFileBytes: number,
): Promise<BoundedMultipartResult> {
  const contentType = request.headers.get("content-type");
  if (!contentType?.toLowerCase().startsWith("multipart/form-data;")) {
    return { status: "invalid" };
  }

  const reader = request.body?.getReader();
  if (!reader) return { status: "invalid" };

  const maxBodyBytes = maxFileBytes + MULTIPART_OVERHEAD_LIMIT;
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > maxBodyBytes) {
        await reader.cancel();
        return { status: "too_large" };
      }
      chunks.push(value);
    }
  } catch {
    return { status: "invalid" };
  }

  const body = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const formData = await new Response(body, {
      headers: { "content-type": contentType },
    }).formData();
    return { status: "ok", formData };
  } catch {
    return { status: "invalid" };
  }
}
