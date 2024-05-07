import { Client, Events } from "discord.js";
import "dotenv/config";
import { Command, handleCommand, loadCommands } from "./commands/command";
import { logger } from "./lib/logger";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "./lib/database";
import express from "express";
import { generatePriceTableImage } from "./lib/prices";

const client = new Client({
    intents: ["Guilds", "MessageContent", "GuildMembers"],
});

let commands: Map<string, Command> | null = null;

client.on(Events.ClientReady, async () => {
    logger.info(`Client ready on: ${client.user?.tag} (${client.user?.id})`);
    logger.info(`Running database migrations.`);
    await migrate(db, {
        migrationsFolder: "./drizzle",
        migrationsSchema: "_drizzle",
        migrationsTable: "migrations",
    });
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

        await handleCommand(interaction, client, commands);
    }
});

client.login(process.env.TOKEN);

const app = express();

app.get("/:rowId", async (req, res) => {
    const image = await generatePriceTableImage(parseInt(req.params.rowId));

    res.setHeader("Content-Type", "image/png");
    res.send(image);
    res.end();
});

app.listen(3000);
