export type BoundedJsonBody =
	| { ok: true; value: Record<string, unknown> }
	| { ok: false; reason: "invalid_json" | "too_large" };

export async function readBoundedJsonBody(
	request: Request,
	maximumBytes: number,
): Promise<BoundedJsonBody> {
	const reader = request.body?.getReader();
	if (!reader) {
		return { ok: false, reason: "invalid_json" };
	}

	const chunks: Uint8Array[] = [];
	let totalBytes = 0;

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) {
				break;
			}

			totalBytes += value.byteLength;
			if (totalBytes > maximumBytes) {
				await reader.cancel();
				return { ok: false, reason: "too_large" };
			}
			chunks.push(value);
		}
	} finally {
		reader.releaseLock();
	}

	const body = new Uint8Array(totalBytes);
	let offset = 0;
	for (const chunk of chunks) {
		body.set(chunk, offset);
		offset += chunk.byteLength;
	}

	let value: unknown;
	try {
		value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body));
	} catch {
		return { ok: false, reason: "invalid_json" };
	}

	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return { ok: false, reason: "invalid_json" };
	}

	return { ok: true, value: value as Record<string, unknown> };
}
