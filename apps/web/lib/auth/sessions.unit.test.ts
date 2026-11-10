import assert from "node:assert/strict";
import { test } from "node:test";
import { sessionDeviceLabel } from "./sessions";

test("session device labels are bounded classifications, never raw user-agent input", () => {
	assert.equal(sessionDeviceLabel(null), "Browser session");
	assert.equal(
		sessionDeviceLabel("Mozilla Macintosh Chrome/150 Safari/537"),
		"Chrome on macOS",
	);
	assert.equal(
		sessionDeviceLabel("Mozilla iPhone Safari/605"),
		"Safari on iOS/iPadOS",
	);
	assert.equal(
		sessionDeviceLabel("Mozilla Android Chrome/150"),
		"Chrome on Android",
	);
	assert.equal(
		sessionDeviceLabel("Mozilla Windows Edg/150 Chrome/150"),
		"Edge on Windows",
	);
	assert.equal(
		sessionDeviceLabel("Mozilla Linux Firefox/149"),
		"Firefox on Linux",
	);
	assert.equal(
		sessionDeviceLabel("private input ".repeat(1000)),
		"Browser session",
	);
});
