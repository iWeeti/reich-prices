import { getItems } from "./lib/items";
import "dotenv/config";
import { Client, Events } from "discord.js";
import { logger } from "./lib/logger";
import { Command, loadCommands } from "./commands/command";

const client = new Client({
  intents: ["Guilds", "MessageContent", "GuildMembers"],
});

let commands: Map<string, Command> | null = null;

client.on(Events.ClientReady, async () => {
  logger.info(`Client ready on: ${client.user?.tag} (${client.user?.id})`);
  commands = await loadCommands(client);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isAutocomplete()) {
    const command = commands?.get(interaction.commandName);
    if (!command) {
      logger.warn(
        `Tried to run autocomplete for a command which doesn't exist: ${interaction.commandName}`
      );
      return;
    }

    if (!command.autocomplete) {
      logger.warn(
        `Tried to run autocomplete for a command that doesn't have autocomplete: ${interaction.commandName}`
      );
      return;
    }

    if (!commands) {
      logger.warn(`Commands not loaded.`);
      return;
    }

    logger.info(`Running autocopmlete for ${interaction.commandName}`);
    await command.autocomplete({ interaction, client, commands });
  }
  if (interaction.isChatInputCommand()) {
    if (!commands) {
      logger.warn(`Commands not loaded yet.`);
      return;
    }

    const command = commands.get(interaction.commandName);

    if (!command) {
      logger.warn(
        `Tried to run a command which doesn't exist: ${interaction.commandName}`
      );
      return;
    }

    try {
      await command.execute({
        interaction,
        client,
        commands,
      });
    } catch (e) {
      logger.error(`Failed to run command: ${interaction.commandName}`);
      console.error(e);
    }
  }
});

client.login(process.env.TOKEN);
