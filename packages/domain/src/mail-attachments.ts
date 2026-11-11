import type { MailboxScope } from "./mail-reconciliation";
import type { MailboxCapability } from "./mailbox-access";

const maxFilenameLength = 120;
const fallbackFilename = "attachment";
const fallbackMimeType = "application/octet-stream";
const mimeTypePattern =
	/^[a-z0-9][a-z0-9!#$&^_.+-]{0,126}\/[a-z0-9][a-z0-9!#$&^_.+-]{0,126}$/;

// Types that are inert when a browser renders them from a download response.
const inertMimeTypes = new Set([
	"application/pdf",
	"application/zip",
	"application/json",
	"text/plain",
	"text/csv",
	"image/png",
	"image/jpeg",
	"image/gif",
	"image/webp",
]);

function isDisguisingCharacter(character: string): boolean {
	const codePoint = character.codePointAt(0) ?? 0;
	return (
		codePoint <= 0x1f ||
		(codePoint >= 0x7f && codePoint <= 0x9f) ||
		(codePoint >= 0x200b && codePoint <= 0x200f) ||
		(codePoint >= 0x202a && codePoint <= 0x202e) ||
		(codePoint >= 0x2066 && codePoint <= 0x2069) ||
		codePoint === 0xfeff ||
		(codePoint >= 0xd800 && codePoint <= 0xdfff)
	);
}

export function sanitizeAttachmentFilename(
	raw: string | null | undefined,
): string {
	let name = [...(raw ?? "").normalize("NFKC")]
		.filter((character) => !isDisguisingCharacter(character))
		.join("")
		.replace(/[\\/:*?"<>|]+/g, "_")
		.replace(/\s+/g, " ")
		.trim()
		.replace(/^\.+/, "")
		.replace(/[. ]+$/, "");
	if (name.length > maxFilenameLength) {
		const dot = name.lastIndexOf(".");
		const extension = dot > 0 && name.length - dot <= 16 ? name.slice(dot) : "";
		name = name.slice(0, maxFilenameLength - extension.length) + extension;
	}
	return name === "" ? fallbackFilename : name;
}

export function normalizeMimeType(raw: string | null | undefined): string {
	const type = (raw ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
	return mimeTypePattern.test(type) ? type : fallbackMimeType;
}

export type AttachmentRecord = MailboxScope & {
	attachmentId: string;
	messageId: string;
	safeFilename: string;
	mimeType: string;
	size: number;
};

export type DownloadRequest = {
	actor: MailboxScope & { capabilities: readonly MailboxCapability[] };
	attachment: AttachmentRecord;
};

// Callers must derive actor capabilities from a scoped membership lookup,
// never from client input. A mismatch is reported as absence, not as a hint
// that the attachment exists in another mailbox.
export function authorizeAttachmentDownload(request: DownloadRequest): boolean {
	const { actor, attachment } = request;
	return (
		actor.organizationId === attachment.organizationId &&
		actor.mailboxId === attachment.mailboxId &&
		actor.capabilities.includes("read")
	);
}

export function attachmentDownloadHeaders(
	attachment: Pick<AttachmentRecord, "safeFilename" | "mimeType" | "size">,
): Record<string, string> {
	if (!Number.isSafeInteger(attachment.size) || attachment.size < 0) {
		throw new RangeError("Attachment size must be a non-negative safe integer");
	}
	const filename = sanitizeAttachmentFilename(attachment.safeFilename);
	const asciiName = filename.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "_");
	const encoded = encodeURIComponent(filename).replace(
		/['()*]/g,
		(char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
	);
	const type = normalizeMimeType(attachment.mimeType);
	return {
		"Content-Type": inertMimeTypes.has(type) ? type : fallbackMimeType,
		"Content-Length": String(attachment.size),
		"Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encoded}`,
		"X-Content-Type-Options": "nosniff",
		"Content-Security-Policy": "sandbox; default-src 'none'",
		"Cache-Control": "private, no-store",
	};
}
