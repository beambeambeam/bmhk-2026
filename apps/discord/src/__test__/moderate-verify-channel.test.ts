import { describe, expect, it } from "vitest";

import { shouldDeleteVerifyChannelMessage } from "../lib/moderate-verify-channel";

describe(shouldDeleteVerifyChannelMessage, () => {
  it("deletes a plain member message in the verify channel", () => {
    const result = shouldDeleteVerifyChannelMessage({
      authorIsBot: false,
      channelId: "channel-verify",
      memberHasAdminRole: false,
      verifyChannelId: "channel-verify",
    });

    expect(result).toBeTruthy();
  });

  it("spares admin-role members", () => {
    const result = shouldDeleteVerifyChannelMessage({
      authorIsBot: false,
      channelId: "channel-verify",
      memberHasAdminRole: true,
      verifyChannelId: "channel-verify",
    });

    expect(result).toBeFalsy();
  });

  it("spares the bot's own messages", () => {
    const result = shouldDeleteVerifyChannelMessage({
      authorIsBot: true,
      channelId: "channel-verify",
      memberHasAdminRole: false,
      verifyChannelId: "channel-verify",
    });

    expect(result).toBeFalsy();
  });

  it("ignores messages in other channels", () => {
    const result = shouldDeleteVerifyChannelMessage({
      authorIsBot: false,
      channelId: "channel-general",
      memberHasAdminRole: false,
      verifyChannelId: "channel-verify",
    });

    expect(result).toBeFalsy();
  });

  it("does nothing when no verify channel is configured yet", () => {
    const result = shouldDeleteVerifyChannelMessage({
      authorIsBot: false,
      channelId: "channel-verify",
      memberHasAdminRole: false,
      verifyChannelId: null,
    });

    expect(result).toBeFalsy();
  });
});
