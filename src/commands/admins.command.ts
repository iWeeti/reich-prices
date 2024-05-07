import { Colors, SlashCommandBuilder } from "discord.js";
import { type Command } from "./command";
import { db } from "../lib/database";
import { priceRowAdmins, priceRows, users } from "../lib/database/schema";
import { eq } from "drizzle-orm";
import Fuse from "fuse.js";
import { getOrCreateUser } from "../lib/user";

export default {
    data: new SlashCommandBuilder()
        .setName("admins")
        .addSubcommand((sub) =>
            sub
                .setName("add")
                .addUserOption((o) =>
                    o
                        .setName("admin")
                        .setDescription("The user to give admin to.")
                        .setRequired(true)
                )
                .setDescription("Adds an admin who can edit the prices.")
        )
        .addSubcommand((sub) =>
            sub
                .setName("remove")
                .addUserOption((o) =>
                    o
                        .setName("admin")
                        .setDescription("The user to remove admin from.")
                        .setRequired(true)
                )
                .setDescription("Removes an admin.")
        )
        .addSubcommand((sub) =>
            sub.setName("list").setDescription("Lists the admins.")
        )
        .addSubcommand((sub) =>
            sub
                .setName("link-row")
                .addUserOption((o) =>
                    o
                        .setName("admin")
                        .setDescription("The admin to link.")
                        .setRequired(true)
                )
                .addStringOption((o) =>
                    o
                        .setName("row")
                        .setDescription("The row to link to.")
                        .setAutocomplete(true)
                        .setRequired(true)
                )
                .setDescription("Links the admin to a specified price row.")
        )
        .setDescription("Manage admins"),
    async execute({ interaction }) {
        await interaction.deferReply();
        const subCommand = interaction.options.data[0];

        switch (subCommand.name) {
            case "add": {
                const user = subCommand.options?.find(
                    (o) => o.name === "admin"
                )!.user!;

                await db
                    .insert(users)
                    .values({
                        isAdmin: true,
                        id: user.id,
                    })
                    .onConflictDoUpdate({
                        set: {
                            isAdmin: true,
                        },
                        where: eq(users.id, user.id),
                        target: [users.id],
                    });

                await interaction.editReply({
                    embeds: [
                        {
                            title: "Admin Added",
                            description: `<@${user.id}> is now an admin.`,
                            color: Colors.Green,
                        },
                    ],
                });
                break;
            }
            case "remove": {
                const user = subCommand.options?.find(
                    (o) => o.name === "admin"
                )!.user!;

                await db
                    .insert(users)
                    .values({
                        isAdmin: false,
                        id: user.id,
                    })
                    .onConflictDoUpdate({
                        set: {
                            isAdmin: false,
                        },
                        where: eq(users.id, user.id),
                        target: [users.id],
                    });

                const removedAdmins = await db
                    .delete(priceRowAdmins)
                    .where(eq(priceRowAdmins.userId, user.id))
                    .returning();

                await interaction.editReply({
                    embeds: [
                        {
                            title: "Admin Removed",
                            description: `<@${user.id}> is no longer an admin.\nAdmin was also removed from ${removedAdmins.length} rows.`,
                            color: Colors.Red,
                        },
                    ],
                });
                break;
            }
            case "list": {
                const admins = await db.query.users.findMany({
                    where: eq(users.isAdmin, true),
                });

                await interaction.editReply({
                    embeds: [
                        {
                            title: "Admins",
                            description: admins
                                .map((a) => `<@${a.id}>`)
                                .join("\n"),
                            color: Colors.Blurple,
                        },
                    ],
                });
                break;
            }
            case "link-row": {
                const user = subCommand.options?.find(
                    (o) => o.name === "admin"
                )!.user!;
                const rowId = parseInt(
                    subCommand.options!.find((o) => o.name === "row")!
                        .value! as string
                );

                const row = await db.query.priceRows.findFirst({
                    where: eq(priceRows.id, rowId),
                    columns: {
                        name: true,
                    },
                });
                if (!row) {
                    await interaction.editReply("Row not found.");
                    return;
                }
                const dbUser = await getOrCreateUser(user.id);
                await db.insert(priceRowAdmins).values({
                    priceRowId: rowId,
                    userId: user.id,
                });

                await interaction.editReply({
                    embeds: [
                        {
                            title: "Admin added",
                            description: `Added <@${user.id}> to \`${
                                row.name ?? "N/A"
                            }\``,
                            color: Colors.Green,
                        },
                    ],
                });

                break;
            }
            default: {
                await interaction.editReply({
                    content: `\`\`\`json\n${JSON.stringify(
                        {
                            options: subCommand.options,
                            subCommand: subCommand.name,
                            commandName: interaction.commandName,
                        },
                        null,
                        2
                    )}\n\`\`\``,
                });
            }
        }
    },
    async autocomplete({ interaction }) {
        const focusedValue = interaction.options.getFocused();
        const rows = await db.query.priceRows.findMany({
            columns: { name: true, id: true },
        });
        const fuse = new Fuse(rows, {
            keys: ["name"],
        });

        const choices = fuse.search(focusedValue);
        await interaction.respond(
            choices.map((choice) => ({
                name: choice.item.name ?? "N/A",
                value: choice.item.id.toString(),
            }))
        );
    },
    ownerOnly: true,
} satisfies Command;
