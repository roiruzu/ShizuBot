const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require("discord.js");
const db = require("../utils/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setwelcome")
    .setDescription("Hoş geldin kanalını ayarlar.")
    .addChannelOption(o =>
      o.setName("kanal").setDescription("Hoş geldin mesajlarının gönderileceği kanal")
        .addChannelTypes(ChannelType.GuildText).setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const channel = interaction.options.getChannel("kanal");
    db.updateGuild(interaction.guild.id, { welcomeChannelId: channel.id });
    await interaction.reply(`✅ Hoş geldin kanalı ${channel} olarak ayarlandı.`);
  }
};
