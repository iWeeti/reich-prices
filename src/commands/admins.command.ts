import {
  ApplicationCommandPermissionType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { type Command } from "./command";

export default {
  data: new SlashCommandBuilder()
    .setName("admins")
    .setDefaultMemberPermissions("0")
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .addUserOption((o) =>
          o.setName("admin").setDescription("The user to give admin to.")
        )
        .setDescription("Adds an admin who can edit the prices.")
    )
    .setDescription("Manage admins"),
  async execute({ interaction }) {
    await interaction.reply({
      content: `\`\`\`json\n${JSON.stringify(
        {
          options: interaction.options.resolved,
          commandName: interaction.commandName,
        },
        null,
        2
      )}\n\`\`\``,
    });
  },
  async setupPermissions({ command, client }) {
    const ownerIds = process.env.OWNERS.split(",");
    if (command.guild) {
      for (const owner of ownerIds) {
        command.guild.commands.permissions.add({
          command: command.id,
          token: process.env.TOKEN,
          permissions: [
            {
              id: owner,
              permission: true,
              type: ApplicationCommandPermissionType.User,
            },
          ],
        });
      }
    }
  },
} satisfies Command;
