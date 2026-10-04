const { SlashCommandBuilder, EmbedBuilder, User } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Kullanıcı bilgilerini gösterir.")
    .addUserOption(o =>
      o.setName("kullanici").setDescription("Bilgileri gösterilecek kullanıcı").setRequired(false)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser("kullanici") || interaction.user;

    const embed = new EmbedBuilder()
      .setTitle(`👤 ${user.tag}`)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: "ID", value: user.id, inline: false },
        { name: "Bot", value: user.bot ? "Evet" : "Hayır", inline: true },
        { name: "Hesap", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`, inline: true }
      );

    await interaction.reply({ embeds: [embed] });
  }
};
