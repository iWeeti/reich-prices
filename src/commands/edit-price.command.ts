import {
  ActionRowBuilder,
  ApplicationCommandPermissionType,
  ModalActionRowComponentBuilder,
  ModalBuilder,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import Fuse from "fuse.js";
import { ItemData, getItemById, getItems } from "../lib/items";
import { type Command } from "./command";
import { logger } from "../lib/logger";

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
    .setDefaultMemberPermissions("0")
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

    await modalSubmitInteraction.reply({
      content: `\`\`\`json\n${JSON.stringify(
        modalSubmitInteraction.fields,
        null,
        2
      )}\n\`\`\``,
    });
  },

  async autocomplete({ interaction }) {
    const focusedValue = interaction.options.getFocused();
    const items = await getItems();
    const fuse = new Fuse(items, {
      keys: ["name"],
    });

    const choices = fuse.search(focusedValue);
    await interaction.respond(
      choices
        .map((choice) => ({
          name: choice.item.name,
          value: choice.item.itemID,
        }))
        .filter((_, i) => i < 25)
    );
  },

  async setupPermissions({ command, guild }) {
    await guild.commands.permissions.set({
      command: command.id,
      token: process.env.TOKEN,
      permissions: [
        {
          permission: true,
          type: ApplicationCommandPermissionType.Role,
          id: process.env.ADMIN_ROLE_ID,
        },
        ...process.env.OWNERS.split(",").map((ownerId) => ({
          permission: true,
          type: ApplicationCommandPermissionType.User,
          id: ownerId,
        })),
      ],
    });
  },
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

  const rows = [
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
    .addComponents(...rows);

  return modal;
}
