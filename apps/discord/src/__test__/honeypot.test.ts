import { describe, expect, it, vi } from "vitest";

import {
  buildHoneypotLogEmbed,
  createHoneypotEnforcer,
  honeypotPermissionWarnings,
  shouldBanHoneypotPoster,
  validateHoneypotChannels,
} from "../lib/honeypot";
import type { HoneypotIncident, HoneypotPorts } from "../lib/honeypot";

const INCIDENT: HoneypotIncident = {
  accountCreatedAt: new Date("2026-09-01T00:00:00.000Z"),
  channelId: "chan-pot",
  content: "free nitro @everyone http://scam.example",
  userId: "u1",
  username: "spammer",
};

async function succeeds(): Promise<void> {
  await Promise.resolve();
}

function failsWith(message: string): () => Promise<void> {
  return async () => {
    await Promise.reject(new Error(message));
  };
}

function fakePorts(overrides: Partial<HoneypotPorts> = {}) {
  return {
    ban: vi.fn<HoneypotPorts["ban"]>(overrides.ban ?? succeeds),
    deleteMessage: vi.fn<HoneypotPorts["deleteMessage"]>(overrides.deleteMessage ?? succeeds),
    log: vi.fn<HoneypotPorts["log"]>(overrides.log ?? succeeds),
  };
}

describe(shouldBanHoneypotPoster, () => {
  const base = {
    authorIsBot: false,
    channelId: "chan-pot",
    honeypotChannelId: "chan-pot",
    isExempt: false,
  };

  it("bans an ordinary member who posts in the honeypot", () => {
    expect(shouldBanHoneypotPoster(base)).toBeTruthy();
  });

  it.each([
    ["a bot", { authorIsBot: true }],
    ["an exempt admin", { isExempt: true }],
    ["another channel", { channelId: "chan-general" }],
    ["no honeypot configured", { honeypotChannelId: null }],
  ])("spares %s", (_label, override) => {
    expect(shouldBanHoneypotPoster({ ...base, ...override })).toBeFalsy();
  });
});

describe(createHoneypotEnforcer, () => {
  it("bans, deletes the message, then logs the ban", async () => {
    const order: string[] = [];
    const ports = fakePorts({
      ban: async () => {
        order.push("ban");
        await Promise.resolve();
      },
      deleteMessage: async () => {
        order.push("delete");
        await Promise.resolve();
      },
      log: async () => {
        order.push("log");
        await Promise.resolve();
      },
    });

    await createHoneypotEnforcer()(INCIDENT, ports);

    expect(order).toStrictEqual(["ban", "delete", "log"]);
  });

  it("logs a failed ban with the reason and still deletes the message", async () => {
    const ports = fakePorts({
      ban: failsWith("Missing Permissions"),
    });

    await createHoneypotEnforcer()(INCIDENT, ports);

    expect(ports.deleteMessage).toHaveBeenCalledOnce();
    expect(ports.log).toHaveBeenCalledWith({
      incident: INCIDENT,
      outcome: { banned: false, reason: "Missing Permissions" },
    });
  });

  it("still logs when deleting the message fails", async () => {
    const ports = fakePorts({
      deleteMessage: failsWith("Unknown Message"),
    });

    await createHoneypotEnforcer()(INCIDENT, ports);

    expect(ports.log).toHaveBeenCalledWith({ incident: INCIDENT, outcome: { banned: true } });
  });

  it("does not throw when the log channel is unusable", async () => {
    const ports = fakePorts({ log: failsWith("no channel") });

    await expect(createHoneypotEnforcer()(INCIDENT, ports)).resolves.toBeUndefined();
  });

  it("bans and logs a user once when several messages arrive at once, deleting all of them", async () => {
    const enforce = createHoneypotEnforcer();
    const first = fakePorts();
    const second = fakePorts();

    await Promise.all([enforce(INCIDENT, first), enforce(INCIDENT, second)]);

    expect(first.ban).toHaveBeenCalledOnce();
    expect(second.ban).not.toHaveBeenCalled();
    expect(second.log).not.toHaveBeenCalled();
    expect(second.deleteMessage).toHaveBeenCalledOnce();
  });
});

describe(buildHoneypotLogEmbed, () => {
  it("describes a ban with the user, channel and neutralised message text", () => {
    const { data } = buildHoneypotLogEmbed({ incident: INCIDENT, outcome: { banned: true } });

    expect(data.title).toBe("Honeypot: user banned");
    expect(data.fields).toStrictEqual([
      { inline: true, name: "User", value: "<@u1> (spammer)\n`u1`" },
      { inline: true, name: "Channel", value: "<#chan-pot>" },
      { inline: true, name: "Account created", value: "<t:1788220800:R>" },
      { name: "Message", value: "```\nfree nitro @​everyone http://scam.example\n```" },
    ]);
  });

  it("marks a failed ban and includes the reason", () => {
    const { data } = buildHoneypotLogEmbed({
      incident: INCIDENT,
      outcome: { banned: false, reason: "Missing Permissions" },
    });

    expect(data.title).toBe("Honeypot: ban FAILED");
    expect(data.description).toBe("Missing Permissions");
  });

  it("truncates long text, keeps it from closing the code fence, and notes empty text", () => {
    const long = buildHoneypotLogEmbed({
      incident: { ...INCIDENT, content: `\`\`\`${"a".repeat(600)}` },
      outcome: { banned: true },
    }).data.fields?.find((field) => field.name === "Message")?.value;
    const empty = buildHoneypotLogEmbed({
      incident: { ...INCIDENT, content: "" },
      outcome: { banned: true },
    }).data.fields?.find((field) => field.name === "Message")?.value;

    expect(long).toMatch(/^```\n[^`]{500}…\n```$/u);
    expect(empty).toBe("(no text)");
  });
});

describe(validateHoneypotChannels, () => {
  it("accepts two different channels", () => {
    expect(
      validateHoneypotChannels({ honeypotId: "a", logId: "b", verifyChannelId: "c" }),
    ).toBeNull();
  });

  it("rejects using one channel for both", () => {
    expect(validateHoneypotChannels({ honeypotId: "a", logId: "a", verifyChannelId: null })).toBe(
      "The honeypot and log channels must be different.",
    );
  });

  it("rejects the verify channel as honeypot", () => {
    expect(validateHoneypotChannels({ honeypotId: "c", logId: "b", verifyChannelId: "c" })).toBe(
      "The honeypot can't be the verify channel: members legitimately post there.",
    );
  });
});

describe(honeypotPermissionWarnings, () => {
  it("has nothing to say when the bot can do everything", () => {
    expect(
      honeypotPermissionWarnings({
        ban: true,
        deleteInHoneypot: true,
        sendInLog: true,
        viewHoneypot: true,
      }),
    ).toStrictEqual([]);
  });

  it("names each missing permission", () => {
    expect(
      honeypotPermissionWarnings({
        ban: false,
        deleteInHoneypot: false,
        sendInLog: false,
        viewHoneypot: false,
      }),
    ).toStrictEqual([
      "Bot lacks **Ban Members**: bans will fail.",
      "Bot can't see the honeypot channel: it won't notice messages there.",
      "Bot lacks **Manage Messages** in the honeypot channel: messages won't be deleted.",
      "Bot can't send messages in the log channel: bans won't be logged.",
    ]);
  });
});
