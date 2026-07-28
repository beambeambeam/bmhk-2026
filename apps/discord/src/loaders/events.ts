import type { ClientEvents } from "discord.js";
import { events } from "../events.manifest.js";
import type { BotClient, Event } from "../types.js";

function createListener<K extends keyof ClientEvents>(event: Event<K>) {
  return (...args: ClientEvents[K]) => {
    void event.execute(...args);
  };
}

export function loadEvents(client: BotClient): void {
  for (const event of events) {
    if (!event?.name) {
      continue;
    }

    const listener = createListener(event);

    if (event.once === true) {
      client.once(event.name, listener);
    } else {
      client.on(event.name, listener);
    }

    console.log(`[Events] Registered ${event.once === true ? "once" : "on"} → ${event.name}`);
  }
}
