const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require("discord.js");
const db = require("../utils/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setlog")
    .setDescription("Moderasyon/log kanalını ayarlar.")
    .addChannelOption(o =>
      o.setName("kanal").setDescription("Log kanalını seç")
        .addChannelTypes(ChannelType.GuildText).setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const channel = interaction.options.getChannel("kanal");
    db.updateGuild(interaction.guild.id, { logChannelId: channel.id });
    await interaction.reply(`✅ Log kanalı ${channel} olarak ayarlandı.`);
  }
};
