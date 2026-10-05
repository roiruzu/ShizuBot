const {
  SlashCommandBuilder,
  EmbedBuilder
} = require("discord.js");
const { getLeaderboard } = require("../services/leaderboardService");
const { getUserStats } = require("../services/activityService");
const { formatDuration, medal } = require("../utils/format");

const data = new SlashCommandBuilder()
  .setName("top")
  .setDescription("Haftalık SHIZU aktivite sıralamasını gösterir.")
  .addStringOption(option =>
    option
      .setName("kategori")
      .setDescription("Sıralama türü")
      .setRequired(false)
      .addChoices(
        { name: "Genel", value: "all" },
        { name: "Yazılı Sohbet", value: "chat" },
        { name: "Sesli Kanal", value: "voice" }
      )
  );

async function execute(interaction) {
  const type = interaction.options.getString("kategori") || "all";
  const rows = getLeaderboard(interaction.guild.id, type, 10);

  const lines = rows.length
    ? rows.map((row, i) => {
        const chat = `${row.chat_messages} mesaj`;
        const voice = formatDuration(row.voice_seconds);

        if (type === "chat") {
          return `${medal(i)} <@${row.user_id}> — **${chat}**`;
        }

        if (type === "voice") {
          return `${medal(i)} <@${row.user_id}> — **${voice}**`;
        }

        return `${medal(i)} <@${row.user_id}> — **${chat}** • **${voice}**`;
      }).join("\n")
    : "Bu hafta henüz aktivite verisi yok.";

  const me = getUserStats(interaction.guild.id, interaction.user.id);

  const embed = new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle("⚔️ SHIZU — Haftalık Sıralama")
    .setDescription(lines)
    .addFields({
      name: "Senin durumun",
      value: `💬 **${me.chat_messages}** mesaj\n🎙️ **${formatDuration(me.voice_seconds)}** sesli aktivite`,
      inline: false
    })
    .setFooter({ text: "Her Pazar 23:59'da sıfırlanır • İlk 3'e özel rol" })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

module.exports = { data, execute };
