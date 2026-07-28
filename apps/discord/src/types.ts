import type {
  AutocompleteInteraction,
  ButtonInteraction,
  ChatInputCommandInteraction,
  Client,
  ClientEvents,
  ModalSubmitInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  StringSelectMenuInteraction,
} from "discord.js";

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export interface BotClient extends Client {
  /** Registered slash commands (populated by the loader). */
  commands: Map<string, Command>;
  /** Registered button handlers keyed by customId prefix. */
  buttons: Map<string, Button>;
  /** Registered modal handlers keyed by customId prefix. */
  modals: Map<string, Modal>;
  /** Registered select-menu handlers keyed by customId prefix. */
  selectMenus: Map<string, SelectMenu>;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export interface Event<K extends keyof ClientEvents = keyof ClientEvents> {
  name: K;
  once?: boolean;
  execute(...args: ClientEvents[K]): Promise<void> | void;
}

// ---------------------------------------------------------------------------
// Interactions
// ---------------------------------------------------------------------------

export type CommandBuilder =
  | SlashCommandBuilder
  | SlashCommandOptionsOnlyBuilder
  | SlashCommandSubcommandsOnlyBuilder
  | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;

export interface Command {
  data: CommandBuilder;
  execute(interaction: ChatInputCommandInteraction): Promise<void> | void;
  autocomplete?(interaction: AutocompleteInteraction): Promise<void> | void;
}

export interface Button {
  /** Matches interactions whose customId starts with this prefix. */
  customId: string;
  execute(interaction: ButtonInteraction): Promise<void> | void;
}

export interface Modal {
  /** Matches interactions whose customId starts with this prefix. */
  customId: string;
  execute(interaction: ModalSubmitInteraction): Promise<void> | void;
}

export interface SelectMenu {
  /** Matches interactions whose customId starts with this prefix. */
  customId: string;
  execute(interaction: StringSelectMenuInteraction): Promise<void> | void;
}
