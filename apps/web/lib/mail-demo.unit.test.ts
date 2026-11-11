import assert from "node:assert/strict";
import test from "node:test";
import {
	demoOrganization,
	getDemoThreadSummaries,
	isSyntheticInboxPreviewEnabled,
} from "./mail-demo";

test("the synthetic mail preview is unavailable in production", () => {
	assert.equal(isSyntheticInboxPreviewEnabled("production"), false);
	assert.equal(isSyntheticInboxPreviewEnabled("development"), true);
});

test("inbox summaries contain only fictional identities and no message bodies", () => {
	assert.ok(
		demoOrganization.members.every((member) =>
			member.email.endsWith(".invalid"),
		),
	);
	assert.ok(demoOrganization.mailbox.address.endsWith(".invalid"));

	const summaries = getDemoThreadSummaries();
	assert.ok(summaries.length > 0);
	assert.ok(
		summaries.every((thread) => thread.senderAddress.endsWith(".invalid")),
	);
	assert.equal("messages" in summaries[0], false);
});
