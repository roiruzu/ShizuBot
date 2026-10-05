const { recordChat } = require("../services/activityService");

module.exports = async function messageCreate(message) {
  recordChat(message);

  if (!message.guild || message.author.bot) return;

  const prefix = "!";
  if (!message.content.toLowerCase().startsWith(`${prefix}leaderboard`)) return;

  const args = message.content.trim().split(/\s+/).slice(1);
  const type = ["chat", "voice", "all"].includes(args[0]) ? args[0] : "all";

  const { getLeaderboard } = require("../services/leaderboardService");
  const { formatDuration, medal } = require("../utils/format");

  const rows = getLeaderboard(message.guild.id, type, 10);

  const text = rows.length
    ? rows.map((row, i) => {
        if (type === "chat") {
          return `${medal(i)} <@${row.user_id}> — **${row.chat_messages} mesaj**`;
        }

        if (type === "voice") {
          return `${medal(i)} <@${row.user_id}> — **${formatDuration(row.voice_seconds)}**`;
        }

        return `${medal(i)} <@${row.user_id}> — **${row.chat_messages} mesaj** • **${formatDuration(row.voice_seconds)}**`;
      }).join("\n")
    : "Bu hafta henüz veri yok.";

  await message.reply({
    content: `⚔️ **SHIZU Haftalık Sıralama**\n${text}`
  }).catch(() => {});
};
