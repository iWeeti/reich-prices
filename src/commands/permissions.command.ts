import {
  ApplicationCommandPermissionType,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "./command";

export default {
  data: new SlashCommandBuilder()
    .setName("permissions")
    .addStringOption((o) =>
      o
        .setName("command-id")
        .setRequired(true)
        .setDescription("The command to get the permissions for.")
    )
    .setDescription("Retrieve the custom permissions data for this guild"),
  async execute({ interaction }) {
    const commandId = interaction.options.get("command-id", true)
      .value as string;
    const command = await interaction.guild?.commands.fetch(commandId);
    if (!command) return;
    const permissions = await interaction.guild?.commands.permissions.has({
      command,
      permissionId: process.env.ADMIN_ROLE_ID,
      permissionType: ApplicationCommandPermissionType.Role,
    });

    console.log(permissions);
    await interaction.reply("test");
  },
} satisfies Command;
