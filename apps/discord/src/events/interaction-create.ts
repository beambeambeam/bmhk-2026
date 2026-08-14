import type {
  AutocompleteInteraction,
  ButtonInteraction,
  ChatInputCommandInteraction,
  Interaction,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
} from "discord.js";
import { DiscordAPIError, MessageFlags } from "discord.js";
import type { BotClient, Event } from "../types.js";

/** Silently drop "Unknown interaction" (10062) — token expired, nothing we can do. */
function isExpired(err: unknown): boolean {
  return err instanceof DiscordAPIError && err.code === 10_062;
}

async function handleCommand(client: BotClient, interaction: ChatInputCommandInteraction) {
  const command = client.commands.get(interaction.commandName);
  if (!command) {
    console.warn(`[InteractionCreate] Unknown command: ${interaction.commandName}`);
    return;
  }
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`[InteractionCreate] Error in /${interaction.commandName}:`, error);
    const reply = { content: "Something went wrong.", flags: [MessageFlags.Ephemeral] as const };
    await (interaction.replied || interaction.deferred
      ? interaction.followUp(reply)
      : interaction.reply(reply));
  }
}

async function handleAutocomplete(client: BotClient, interaction: AutocompleteInteraction) {
  const command = client.commands.get(interaction.commandName);
  if (!command?.autocomplete) {
    return;
  }
  try {
    await command.autocomplete(interaction);
  } catch (error) {
    console.error(`[InteractionCreate] Autocomplete error for /${interaction.commandName}:`, error);
  }
}

async function handleButton(client: BotClient, interaction: ButtonInteraction) {
  const handler = [...client.buttons.values()].find((b) =>
    interaction.customId.startsWith(b.customId),
  );
  if (!handler) {
    return;
  }
  try {
    await handler.execute(interaction);
  } catch (error) {
    if (!isExpired(error)) {
      console.error(`[InteractionCreate] Button error (${interaction.customId}):`, error);
    }
  }
}

async function handleModal(client: BotClient, interaction: ModalSubmitInteraction) {
  const handler = [...client.modals.values()].find((m) =>
    interaction.customId.startsWith(m.customId),
  );
  if (!handler) {
    return;
  }
  try {
    await handler.execute(interaction);
  } catch (error) {
    if (!isExpired(error)) {
      console.error(`[InteractionCreate] Modal error (${interaction.customId}):`, error);
    }
  }
}

async function handleSelectMenu(client: BotClient, interaction: StringSelectMenuInteraction) {
  const handler = [...client.selectMenus.values()].find((s) =>
    interaction.customId.startsWith(s.customId),
  );
  if (!handler) {
    return;
  }
  try {
    await handler.execute(interaction);
  } catch (error) {
    console.error(`[InteractionCreate] SelectMenu error (${interaction.customId}):`, error);
  }
}

const interactionCreate: Event<"interactionCreate"> = {
  async execute(interaction: Interaction) {
    // interaction.client is always the BotClient constructed in index.ts;
    // discord.js just types Interaction#client as the narrower base Client.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const client = interaction.client as unknown as BotClient;

    if (interaction.isChatInputCommand()) {
      await handleCommand(client, interaction);
    } else if (interaction.isAutocomplete()) {
      await handleAutocomplete(client, interaction);
    } else if (interaction.isButton()) {
      await handleButton(client, interaction);
    } else if (interaction.isModalSubmit()) {
      await handleModal(client, interaction);
    } else if (interaction.isStringSelectMenu()) {
      await handleSelectMenu(client, interaction);
    }
  },
  name: "interactionCreate",
};

export default interactionCreate;
