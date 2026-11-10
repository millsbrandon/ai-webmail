export const folderRoles = [
	"inbox",
	"sent",
	"drafts",
	"junk",
	"trash",
] as const;
export type FolderRole = (typeof folderRoles)[number];
export type FolderMapping = Record<FolderRole, string>;
export type ProviderFolder = {
	path: string;
	selectable: boolean;
	specialUse?: FolderRole;
};

export const syntheticFolders: readonly ProviderFolder[] = [
	{ path: "INBOX", selectable: true, specialUse: "inbox" },
	{ path: "Sent", selectable: true, specialUse: "sent" },
	{ path: "Drafts", selectable: true, specialUse: "drafts" },
	{ path: "Junk", selectable: true, specialUse: "junk" },
	{ path: "Trash", selectable: true, specialUse: "trash" },
	{ path: "Archive", selectable: true },
	{ path: "Shared", selectable: false },
];

export function suggestFolderMapping(folders: readonly ProviderFolder[]) {
	const mapping: Partial<FolderMapping> = {};
	for (const role of folderRoles) {
		const candidates = folders.filter(
			(folder) =>
				folder.selectable &&
				(role === "inbox"
					? folder.path.toUpperCase() === "INBOX"
					: folder.specialUse === role),
		);
		if (candidates.length === 1) mapping[role] = candidates[0].path;
	}
	return mapping;
}

export type SetupInput = {
	displayName: string;
	address: string;
	historyDays: number;
	folders: FolderMapping;
};
export type SetupValidation =
	| { ok: true; value: SetupInput }
	| { ok: false; errors: Record<string, string> };

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function validateMailboxSetup(
	input: unknown,
	availableFolders: readonly ProviderFolder[],
): SetupValidation {
	if (!isRecord(input))
		return {
			ok: false,
			errors: { form: "Mailbox settings must be an object." },
		};
	const errors: Record<string, string> = {};
	if (
		Object.keys(input).some(
			(key) =>
				!["displayName", "address", "historyDays", "folders"].includes(key),
		)
	) {
		errors.form =
			"Only preview settings are accepted. Do not submit credentials or provider settings.";
	}
	const displayName =
		typeof input.displayName === "string" ? input.displayName.trim() : "";
	if (
		!displayName ||
		displayName.length > 100 ||
		Array.from(displayName).some(
			(character) =>
				character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
		)
	) {
		errors.displayName =
			"Use a display name of 1–100 characters without control characters.";
	}
	const address =
		typeof input.address === "string" ? input.address.trim().toLowerCase() : "";
	if (
		address.length > 254 ||
		!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/.test(
			address,
		) ||
		address.includes("..") ||
		address.split("@")[0].length > 64 ||
		address.startsWith(".") ||
		address.includes(".@") ||
		address
			.split("@")[1]
			?.split(".")
			.some(
				(label) =>
					label.startsWith("-") || label.endsWith("-") || label.length > 63,
			)
	) {
		errors.address = "Enter a valid mailbox email address.";
	}
	const historyDays = input.historyDays;
	if (
		typeof historyDays !== "number" ||
		![0, 30, 90, 365].includes(historyDays)
	) {
		errors.historyDays =
			"Choose new messages only, 30 days, 90 days or 365 days.";
	}
	const folders: FolderMapping = {
		inbox: "",
		sent: "",
		drafts: "",
		junk: "",
		trash: "",
	};
	const selected = new Set<string>();
	if (
		!isRecord(input.folders) ||
		Object.keys(input.folders).some(
			(key) => !folderRoles.some((role) => role === key),
		)
	) {
		errors.folders = "Map exactly the five supported folder roles.";
	}
	for (const role of folderRoles) {
		const path = isRecord(input.folders) ? input.folders[role] : undefined;
		const matches = availableFolders.filter(
			(folder) => folder.path === path && folder.selectable,
		);
		if (typeof path !== "string" || matches.length !== 1) {
			errors[role] = "Choose an available selectable folder.";
		} else if (role === "inbox" && path.toUpperCase() !== "INBOX") {
			errors[role] = "Inbox must map to the provider's INBOX.";
		} else if (selected.has(path)) {
			errors[role] = "Each folder role must use a different folder.";
		} else {
			selected.add(path);
			folders[role] = path;
		}
	}
	if (Object.keys(errors).length || typeof historyDays !== "number")
		return { ok: false, errors };
	return { ok: true, value: { displayName, address, historyDays, folders } };
}
