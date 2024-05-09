import {
    ActionRowBuilder,
    AttachmentBuilder,
    Colors,
    ComponentType,
    ModalActionRowComponentBuilder,
    ModalBuilder,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    TextInputBuilder,
    TextInputStyle,
} from "discord.js";
import Fuse from "fuse.js";
import { ItemData, getItemById, getItems } from "../lib/items";
import { type Command } from "./command";
import {
    PriceInsert,
    PriceRowSelect,
    priceRowAdmins,
    prices,
} from "../lib/database/schema";
import {
    generatePriceTableImage,
    getOrCreatePriceRowItem,
    getPriceRows,
} from "../lib/prices";
import { db } from "../lib/database";
import { and, eq } from "drizzle-orm";

export default {
    data: new SlashCommandBuilder()
        .setName("edit-price")
        .addNumberOption((o) =>
            o
                .setAutocomplete(true)
                .setName("item-id")
                .setDescription("The item to edit the price of.")
                .setRequired(true)
        )
        .setDescription("Edits the price of an item."),

    async execute({ interaction }) {
        const itemId = interaction.options.get("item-id", true).value as number;
        const item = await getItemById(itemId);
        const modalCustomId = `${interaction.id}-price-edit-modal`;
        const modal = createPriceEditModal(modalCustomId, item);
        await interaction.showModal(modal);

        const modalSubmitInteraction = await interaction.awaitModalSubmit({
            time: 60_000 * 5,
            filter: (interaction) => {
                return interaction.customId === modalCustomId;
            },
        });

        const adminRows = await db.query.priceRowAdmins.findMany({
            where: eq(priceRowAdmins.userId, interaction.user.id),
            with: {
                priceRow: true,
            },
        });

        if (!adminRows) {
            await modalSubmitInteraction.reply(
                "You don't have any rows you can manage."
            );
            return;
        }
        const rowSelectorCustomId = `row-id;${interaction.id}`;
        const rowSelector = new StringSelectMenuBuilder()
            .setCustomId(rowSelectorCustomId)
            .setPlaceholder("Row")
            .addOptions(
                ...adminRows.map(({ priceRow: row }) => ({
                    label: row.name ?? `N/A (${row.id})`,
                    value: row.id.toString(),
                }))
            )
            .setMinValues(1)
            .setMaxValues(1);

        const msg = await modalSubmitInteraction.reply({
            content: "Select the row you want to save this price to.",
            components: [
                new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                    rowSelector
                ),
            ],
            fetchReply: true,
        });

        let rowId;
        let stringSelectMenuResponse;
        try {
            stringSelectMenuResponse = await msg.awaitMessageComponent({
                componentType: ComponentType.StringSelect,
                time: 60_000,
            });
            rowId = parseInt(stringSelectMenuResponse.values[0]);
        } catch (e) {
            await msg.edit({
                content: "Time expired, please try again.",
                components: [],
            });
            return;
        }

        await stringSelectMenuResponse.reply({
            content: "Saving...",
            components: [],
            embeds: [],
        });

        const priceRowItem = await getOrCreatePriceRowItem({ rowId, itemId });
        const priceData: PriceInsert = {
            priceRowItemId: priceRowItem.id,
            minCount: parseInt(
                modalSubmitInteraction.fields.getTextInputValue(
                    "min-item-count"
                )
            ),
            maxCount: modalSubmitInteraction.fields.getField("max-item-count")
                ? parseInt(
                      modalSubmitInteraction.fields.getTextInputValue(
                          "max-item-count"
                      )
                  )
                : null,
            maxWLs: modalSubmitInteraction.fields.getField("max-wl-count")
                ? parseInt(
                      modalSubmitInteraction.fields.getTextInputValue(
                          "max-wl-count"
                      )
                  )
                : null,
            minWLs: parseInt(
                modalSubmitInteraction.fields.getTextInputValue("min-wl-count")
            ),
        };

        const [insertedPrice] = await db
            .insert(prices)
            .values(priceData)
            .returning();

        const image = await generatePriceTableImage(rowId);

        await stringSelectMenuResponse.channel?.send({
            embeds: [
                {
                    title: "Price Added",
                    description: `Item: ${item.name}\n\nRow: ${
                        adminRows.find((r) => r.priceRowId === rowId)?.priceRow
                            .name
                    }`,
                    fields: [
                        {
                            name: "Min Item Count",
                            value: insertedPrice.minCount.toString(),
                            inline: true,
                        },
                        {
                            name: "Max Item Count",
                            value:
                                insertedPrice.maxCount?.toString() ??
                                insertedPrice.minCount.toString(),
                            inline: true,
                        },
                        {
                            name: "Min WLs",
                            value: insertedPrice.minWLs.toString(),
                        },
                        {
                            name: "Max WLs",
                            value:
                                insertedPrice.maxWLs?.toString() ??
                                insertedPrice.minWLs.toString(),
                        },
                    ],
                    footer: {
                        text: insertedPrice.createdAt.toLocaleString(),
                    },
                    color: Colors.Green,
                },
            ],
            components: [],
            files: [image],
        });
        if (msg.deletable) await msg.delete();
        await stringSelectMenuResponse.deleteReply();
    },

    async autocomplete({ interaction }) {
        const focusedValue = interaction.options.getFocused(true);
        if (focusedValue.name === "item-id") {
            const items = await getItems();
            const fuse = new Fuse(items, {
                keys: ["name"],
            });

            const choices = fuse.search(focusedValue.value, {
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

    async setupPermissions({ command, guild }) {
        // await guild.commands.permissions.set({
        //   command: command.id,
        //   token: process.env.TOKEN,
        //   permissions: [
        //     {
        //       permission: true,
        //       type: ApplicationCommandPermissionType.Role,
        //       id: process.env.ADMIN_ROLE_ID,
        //     },
        //     ...process.env.OWNERS.split(",").map((ownerId) => ({
        //       permission: true,
        //       type: ApplicationCommandPermissionType.User,
        //       id: ownerId,
        //     })),
        //   ],
        // });
    },
    adminOnly: true,
} satisfies Command;

function createPriceEditModal(customId: string, item: ItemData) {
    const itemSelector = new TextInputBuilder()
        .setCustomId("item-id")
        .setLabel("Item ID")
        .setPlaceholder(item.itemID.toString())
        .setValue(item.itemID.toString())
        .setRequired(true)
        .setStyle(TextInputStyle.Short);

    const minItemCount = new TextInputBuilder()
        .setCustomId("min-item-count")
        .setLabel("Min Item Count")
        .setPlaceholder("1")
        .setRequired(true)
        .setStyle(TextInputStyle.Short);

    const maxItemCount = new TextInputBuilder()
        .setCustomId("max-item-count")
        .setLabel("Max Item Count")
        .setPlaceholder("100")
        .setRequired(false)
        .setStyle(TextInputStyle.Short);

    const minWlCount = new TextInputBuilder()
        .setCustomId("min-wl-count")
        .setLabel("Min WL Count")
        .setPlaceholder("200")
        .setRequired(true)
        .setStyle(TextInputStyle.Short);
    const maxWlCount = new TextInputBuilder()
        .setCustomId("max-wl-count")
        .setLabel("Max WL Count")
        .setPlaceholder("1000")
        .setRequired(false)
        .setStyle(TextInputStyle.Short);

    const actionRows = [
        new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
            itemSelector
        ),
        new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
            minItemCount
        ),
        new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
            maxItemCount
        ),
        new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
            minWlCount
        ),
        new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
            maxWlCount
        ),
    ];

    const modal = new ModalBuilder()
        .setTitle("Price Edit")
        .setCustomId(customId)
        .addComponents(...actionRows);

    return modal;
}
