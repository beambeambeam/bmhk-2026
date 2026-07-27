import { buttons } from "../buttons.manifest.js";
import { commands } from "../commands.manifest.js";
import { modals } from "../modals.manifest.js";
import { selectMenus } from "../select-menus.manifest.js";
import type { BotClient } from "../types.js";

export async function loadInteractions(client: BotClient): Promise<void> {
    for (const cmd of commands) {
        client.commands.set(cmd.data.name, cmd);
        console.log(`Loaded command: /${cmd.data.name}`);
    }

    for (const btn of buttons) {
        client.buttons.set(btn.customId, btn);
        console.log(`[Interactions] Button: ${btn.customId}`);
    }

    for (const modal of modals) {
        client.modals.set(modal.customId, modal);
        console.log(`[Interactions] Modal: ${modal.customId}`);
    }

    for (const menu of selectMenus) {
        client.selectMenus.set(menu.customId, menu);
        console.log(`[Interactions] Select: ${menu.customId}`);
    }
}
