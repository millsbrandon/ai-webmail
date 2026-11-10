import assert from "node:assert/strict";
import { test } from "node:test";
import {
	suggestFolderMapping,
	syntheticFolders,
	validateMailboxSetup,
} from "./mailbox-setup";

const valid = {
	displayName: " Synthetic Inbox ",
	address: " TEAM@EXAMPLE.TEST ",
	historyDays: 30,
	folders: {
		inbox: "INBOX",
		sent: "Sent",
		drafts: "Drafts",
		junk: "Junk",
		trash: "Trash",
	},
};

test("mailbox setup normalizes metadata and preserves exact provider folder paths", () => {
	assert.deepEqual(validateMailboxSetup(valid, syntheticFolders), {
		ok: true,
		value: {
			...valid,
			displayName: "Synthetic Inbox",
			address: "team@example.test",
		},
	});
	for (const historyDays of [0, 30, 90, 365]) {
		assert.equal(
			validateMailboxSetup({ ...valid, historyDays }, syntheticFolders).ok,
			true,
		);
	}
});

test("folder suggestions use unambiguous selectable special-use flags, not guessed names", () => {
	assert.deepEqual(suggestFolderMapping(syntheticFolders), valid.folders);
	assert.deepEqual(
		suggestFolderMapping([
			{ path: "INBOX", selectable: true },
			{ path: "Sent", selectable: true },
			{ path: "Drafts", selectable: false, specialUse: "drafts" },
			{ path: "Sent1", selectable: true, specialUse: "sent" },
			{ path: "Sent2", selectable: true, specialUse: "sent" },
		]),
		{ inbox: "INBOX" },
	);
});

test("missing, ambiguous, nonselectable and duplicate folder mappings fail closed", () => {
	for (const folders of [
		{},
		null,
		[],
		{ ...valid.folders, inbox: "Archive" },
		{ ...valid.folders, sent: "Shared" },
		{ ...valid.folders, sent: "Missing" },
		{ ...valid.folders, trash: "Sent" },
		{ ...valid.folders, sent: "sent" },
		{ ...valid.folders, extra: "Archive" },
	]) {
		assert.equal(
			validateMailboxSetup({ ...valid, folders }, syntheticFolders).ok,
			false,
		);
	}
	assert.equal(
		validateMailboxSetup(valid, [...syntheticFolders, syntheticFolders[1]]).ok,
		false,
	);
});

test("metadata validation rejects unsupported inputs and credentials without echoing them", () => {
	for (const input of [
		null,
		[],
		"settings",
		{ ...valid, displayName: "" },
		{ ...valid, displayName: "x".repeat(101) },
		{ ...valid, displayName: "A\nB" },
		{ ...valid, address: "user@-host.test" },
		{ ...valid, address: "a..b@example.test" },
		{ ...valid, address: "user@example.test\ninjected" },
		{ ...valid, address: ".a@example.test" },
		{ ...valid, historyDays: "30" },
		{ ...valid, historyDays: -1 },
		{ ...valid, historyDays: 31 },
		{ ...valid, password: "synthetic-secret-marker" },
		{ ...valid, imapHost: "127.0.0.1" },
	]) {
		const result = validateMailboxSetup(input, syntheticFolders);
		assert.equal(result.ok, false);
		assert.ok(!JSON.stringify(result).includes("synthetic-secret-marker"));
	}
});
