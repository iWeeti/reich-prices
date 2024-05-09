import {
    ActionRow,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    CacheType,
    Colors,
    ComponentType,
    EmbedBuilder,
    SlashCommandBuilder,
} from "discord.js";
import { Command } from "./command";
import { db } from "../lib/database";
import {
    priceRowAdmins,
    priceRowItems,
    priceRows,
    prices,
} from "../lib/database/schema";
import { and, eq, inArray } from "drizzle-orm";
import Fuse from "fuse.js";
import { generatePriceTableImage } from "../lib/prices";
import { getItemById, getItems } from "../lib/items";

export default {
    data: new SlashCommandBuilder()
        .setName("rows")
        .addSubcommand((sub) =>
            sub
                .setName("add")
                .addStringOption((o) =>
                    o
                        .setName("name")
                        .setDescription("The name of the new row.")
                        .setRequired(true)
                )
                .setDescription("Add a new row.")
        )
        .addSubcommand((sub) =>
            sub.setName("list").setDescription("Lists the rows.")
        )
        .addSubcommand((sub) =>
            sub
                .setName("admins")
                .setDescription("List the admins for the specified row")
                .addStringOption((o) =>
                    o
                        .setName("row")
                        .setDescription("The row to link to.")
                        .setAutocomplete(true)
                        .setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("image")
                .setDescription("Sends the row's image.")
                .addStringOption((o) =>
                    o
                        .setName("row")
                        .setDescription("The row to get the image for.")
                        .setAutocomplete(true)
                        .setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("remove-item")
                .setDescription(
                    "Removes the item with all the price history stored in this row."
                )
                .addStringOption((o) =>
                    o
                        .setName("row")
                        .setDescription("The row to remove the item from.")
                        .setAutocomplete(true)
                        .setRequired(true)
                )
                .addStringOption((o) =>
                    o
                        .setName("item-id")
                        .setDescription("The item to remove.")
                        .setAutocomplete(true)
                        .setRequired(true)
                )
        )
        .setDescription("Manage the rows."),
    async execute({ interaction }) {
        const subCommand = interaction.options.data[0];

        switch (subCommand.name) {
            case "add": {
                await interaction.deferReply();
                const name = subCommand.options![0].value! as string;
                const [row] = await db
                    .insert(priceRows)
                    .values({
                        name,
                    })
                    .returning();

                await interaction.editReply({
                    embeds: [
                        {
                            title: "Row added",
                            fields: [
                                {
                                    name: "Name",
                                    value: name,
                                },
                            ],
                            color: Colors.Green,
                        },
                    ],
                });
                break;
            }
            case "admins": {
                await interaction.deferReply();
                const rowId = parseInt(
                    subCommand.options?.find((o) => o.name === "row")
                        ?.value as string
                );
                const row = await db.query.priceRows.findFirst({
                    where: eq(priceRows.id, rowId),
                    with: {
                        admins: true,
                    },
                });

                await interaction.editReply({
                    embeds: [
                        {
                            title: `Admins of ${row?.name ?? "N/A"}`,
                            description: row?.admins
                                .map((a) => `<@${a.userId}>`)
                                .join("\n"),
                            color: Colors.Blurple,
                        },
                    ],
                });
                break;
            }
            case "list": {
                await interaction.deferReply();
                const rows = await db.query.priceRows.findMany();

                await interaction.editReply({
                    embeds: [
                        {
                            title: "Rows",
                            description: rows
                                .map(
                                    (row) => `${row.name ?? "N/A"} (${row.id})`
                                )
                                .join("\n"),
                            color: Colors.Blurple,
                        },
                    ],
                });
                break;
            }
            case "image": {
                await interaction.deferReply();
                const rowId = parseInt(
                    interaction.options.get("row")?.value as string
                );
                const image = await generatePriceTableImage(rowId);

                await interaction.editReply({
                    files: [image],
                });
                break;
            }
            case "remove-item": {
                await interaction.deferReply();
                const rowId = parseInt(
                    interaction.options.get("row")?.value as string
                );
                const itemId = parseInt(
                    interaction.options.get("item-id")?.value as string
                );

                const rowAdmin = await db.query.priceRowAdmins.findFirst({
                    where: and(
                        eq(priceRowAdmins.priceRowId, rowId),
                        eq(priceRowAdmins.userId, interaction.user.id)
                    ),
                    with: {
                        priceRow: {
                            columns: {
                                name: true,
                            },
                        },
                    },
                });

                if (!rowAdmin) {
                    await interaction.editReply({
                        content: "You aren't allowed to manage this row.",
                    });
                    return;
                }

                const item = await getItemById(itemId);

                const confirmButton = new ButtonBuilder()
                    .setLabel("Delete")
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji("🗑️")
                    .setCustomId("delete");
                const cancelButton = new ButtonBuilder()
                    .setLabel("Cancel")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji("❌")
                    .setCustomId("cancel");
                const confirmRow =
                    new ActionRowBuilder<ButtonBuilder>().addComponents(
                        confirmButton,
                        cancelButton
                    );

                let result: ButtonInteraction<CacheType>;
                try {
                    result = await (
                        await interaction.editReply({
                            embeds: [
                                {
                                    title: "Confirm",
                                    color: Colors.Green,
                                    description: `Confirm the deletion of the prices for the item \`${item.name}\` from the row \`${rowAdmin.priceRow.name}\`.`,
                                    footer: {
                                        text: "Expires in 30 seconds.",
                                    },
                                },
                            ],
                            components: [confirmRow],
                        })
                    ).awaitMessageComponent({
                        componentType: ComponentType.Button,
                        filter: (i) => i.user.id === interaction.user.id,
                        time: 30_000,
                    });
                } catch {
                    await interaction.editReply({
                        content: "Deletion confirmation expired, try again.",
                    });
                    return;
                }

                if (result.customId !== "delete") {
                    await interaction.editReply("Deletion canceled.");
                    return;
                }

                const priceRowItem = await db
                    .delete(priceRowItems)
                    .where(
                        and(
                            eq(priceRowItems.priceRowId, rowId),
                            eq(priceRowItems.itemId, itemId)
                        )
                    )
                    .returning();

                const embed = new EmbedBuilder()
                    .setTitle("Removed Item")
                    .setDescription(
                        `Removed the item \`${item.name}\` from the row \`${rowAdmin.priceRow.name}\`.`
                    )
                    .setColor(Colors.Green);

                await interaction.editReply({
                    embeds: [embed],
                });
                break;
            }
        }
    },
    async autocomplete({ interaction }) {
        const { value: focusedValue, name } =
            interaction.options.getFocused(true);
        if (name === "row") {
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
        } else if (name === "item-id") {
            const items = await getItems();
            const fuse = new Fuse(items, {
                keys: ["name"],
            });

            const choices = fuse.search(focusedValue, {
                limit: 25,
            });
            await interaction.respond(
                choices.map((choice) => ({
                    name: choice.item.name,
                    value: choice.item.itemID.toString(),
                }))
            );
        }
    },
    ownerOnly: true,
} satisfies Command;
