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
import path from "path";
import { getUser } from "../lib/user";

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
    adminOnly?: boolean;
    ownerOnly?: boolean;
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
                    .replace(`src${path.sep}commands`, `.${path.sep}`)
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

export async function handleCommand(
    interaction: CommandInteraction,
    client: Client,
    commands: Map<string, Command>
) {
    if (!interaction.isCommand()) return;

    const user = await getUser(interaction.user.id);

    const command = commands.get(interaction.commandName);

    if (!command) {
        logger.warn(
            `Tried to run a non-existing command: ${interaction.commandName}`
        );
        return;
    }

    if (
        (!process.env.OWNERS.split(",").includes(interaction.user.id) && // not owner
            command.adminOnly && // is admin only command
            !user?.isAdmin) || // user is not an admin
        (!process.env.OWNERS.split(",").includes(interaction.user.id) && // not owner
            command.ownerOnly) // owner only command
    ) {
        await interaction.reply({
            content: "You are not allowed to run this command.",
            ephemeral: true,
        });
        return;
    }

    try {
        await command.execute({ interaction, client, commands });
    } catch (e) {
        logger.error(`Failed to run a command: ${command.data.name}`);
        logger.error(e);
    }
}
