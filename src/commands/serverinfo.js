const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("Sunucu bilgilerini gösterir."),

  async execute(interaction) {
    const guild = interaction.guild;

    const embed = new EmbedBuilder()
      .setTitle(`📊 ${guild.name}`)
      .addFields(
        { name: "👥 Üyeler", value: `${guild.memberCount}`, inline: true },
        { name: "💬 Kanallar", value: `${guild.channels.cache.size}`, inline: true },
        { name: "🚀 Boost", value: `${guild.premiumSubscriptionCount || 0}`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
