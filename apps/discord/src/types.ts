import { Client, Collection } from "discord.js";
import type {
  AutocompleteInteraction,
  ButtonInteraction,
  ChatInputCommandInteraction,
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

export class BotClient extends Client {
  /** Registered slash commands (populated by the loader). */
  commands = new Collection<string, Command>();
  /** Registered button handlers keyed by customId prefix. */
  buttons = new Collection<string, Button>();
  /** Registered modal handlers keyed by customId prefix. */
  modals = new Collection<string, Modal>();
  /** Registered select-menu handlers keyed by customId prefix. */
  selectMenus = new Collection<string, SelectMenu>();
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export interface Event<K extends keyof ClientEvents = keyof ClientEvents> {
  name: K;
  once?: boolean;
  // Method shorthand is checked bivariantly, which lets each event.ts declare
  // a narrow Event<"specificName"> while still fitting in Event[] in the loader.
  // oxlint-disable-next-line typescript/method-signature-style
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
  execute: (interaction: ChatInputCommandInteraction) => Promise<void> | void;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void> | void;
}

export interface Button {
  /** Matches interactions whose customId starts with this prefix. */
  customId: string;
  execute: (interaction: ButtonInteraction) => Promise<void> | void;
}

export interface Modal {
  /** Matches interactions whose customId starts with this prefix. */
  customId: string;
  execute: (interaction: ModalSubmitInteraction) => Promise<void> | void;
}

export interface SelectMenu {
  /** Matches interactions whose customId starts with this prefix. */
  customId: string;
  execute: (interaction: StringSelectMenuInteraction) => Promise<void> | void;
}
