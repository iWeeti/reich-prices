import {
  SlashCommandBuilder,
  CommandInteraction,
  Client,
  AutocompleteInteraction,
  ApplicationCommand,
  GuildResolvable,
  Guild,
} from "discord.js";
import { glob } from "glob";
import { logger } from "../lib/logger";

export interface Command {
  data: SlashCommandBuilder;
  execute: (options: {
    interaction: CommandInteraction;
    client: Client;
    commands: Map<string, Command>;
  }) => Promise<void>;
  autocomplete?: (options: {
    interaction: AutocompleteInteraction;
    client: Client;
    commands: Map<string, Command>;
  }) => Promise<void>;
  setupPermissions?: (opts: {
    command: ApplicationCommand<{
      guild: GuildResolvable;
    }>;
    client: Client;
    guild: Guild;
  }) => Promise<void>;
}

export async function loadCommands(client: Client) {
  const files = await glob("./src/commands/*.command.{js,ts}");
  logger.debug(JSON.stringify(files, null, 2));

  const commands = new Map<string, Command>();

  const existing = await client.application?.commands.fetch();

  if (existing) {
    for (const command of existing.values()) {
      await command.delete();
    }
  }

  for (const file of files) {
    const command = (
      await import(
        `${file
          .replace("src/commands", "./")
          .replace(/.ts$/, "")
          .replace(/.js$/, "")}`
      )
    ).default as Command;

    commands.set(command.data.name, command);

    const cmd = await client.application?.commands.create(
      command.data,
      process.env.GUILD_ID
    );
    const guild = await client.guilds.fetch(process.env.GUILD_ID);

    if (command.setupPermissions && cmd && guild) {
      logger.info("Setting up permissions.");
      await command.setupPermissions({ command: cmd, client, guild });
    }
    logger.info(`Loaded command: ${command.data.name} (${cmd?.id})`);
  }

  return commands;
}
