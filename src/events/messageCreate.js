const { recordChat, currentWeek } = require("../services/activityService");
const { handleMessageXP } = require("../utils/levelingManager");
const db = require("../database");
const { formatDuration, medal } = require("../utils/format");

function parseCategory(value) {
  const v = String(value || "").toLowerCase();
  if (["voice", "sesli", "ses"].includes(v)) return "voice";
  return "chat";
}

function getStatsText(type, row) {
  return type === "voice"
    ? `🎙️ **Ses süresi:** ${formatDuration(row.voice_seconds || 0)}`
    : `📝 **Mesaj sayısı:** ${Number(row.chat_messages || 0).toLocaleString("tr-TR")}`;
}

async function handleLeaderboard(message, type) {
  const rows = type === "voice"
    ? db.getVoiceLeaderboard(currentWeek(), message.guild.id, 10)
    : db.getChatLeaderboard(currentWeek(), message.guild.id, 10);

  const filtered = [];
  for (const row of rows) {
    try {
      const member = await message.guild.members.fetch(row.userId);
      if (!member.user.bot) filtered.push(row);
    } catch {}
  }

  const body = filtered.length
    ? filtered.map((row, i) => type === "voice"
      ? `${medal(i)} <@${row.userId}> — **${formatDuration(row.voice_seconds)}**`
      : `${medal(i)} <@${row.userId}> — **${Number(row.chat_messages).toLocaleString("tr-TR")} mesaj**`
    ).join("\n")
    : "Bu hafta henüz aktivite verisi yok.";

  const title = type === "voice" ? "🎙️ SESLİ AKTİFLER — İLK 10" : "📝 YAZILI AKTİFLER — İLK 10";
  await message.reply({ content: `🌙 **SHIZU | ${title}**\n${body}` }).catch(() => {});
}

async function handlePersonalRank(message, type) {
  const rows = type === "voice"
    ? db.getVoiceLeaderboard(currentWeek(), message.guild.id, Number.MAX_SAFE_INTEGER)
    : db.getChatLeaderboard(currentWeek(), message.guild.id, Number.MAX_SAFE_INTEGER);

  const filtered = [];
  for (const row of rows) {
    try {
      const member = await message.guild.members.fetch(row.userId);
      if (!member.user.bot) filtered.push(row);
    } catch {}
  }

  const index = filtered.findIndex(row => row.userId === message.author.id);
  const mine = index >= 0 ? filtered[index] : { chat_messages: 0, voice_seconds: 0 };
  const leader = filtered[0];
  let distance = "Şu an liderlik için ölçülebilir bir fark yok.";
  if (leader && leader.userId !== message.author.id) {
    const gap = type === "voice"
      ? Math.max(0, Number(leader.voice_seconds || 0) - Number(mine.voice_seconds || 0))
      : Math.max(0, Number(leader.chat_messages || 0) - Number(mine.chat_messages || 0));
    distance = type === "voice"
      ? `Lidere kalan fark: **${formatDuration(gap)}**`
      : `Lidere kalan fark: **${gap.toLocaleString("tr-TR")} mesaj**`;
  } else if (leader && leader.userId === message.author.id) {
    distance = "👑 **Zirvedesin! Liderliği koru.**";
  }

  await message.reply({
    content: `🌙 **SHIZU | Haftalık ${type === "voice" ? "Sesli" : "Yazılı"} Rank**\n` +
      `**Sıralaman:** ${index >= 0 ? `#${index + 1}` : "Henüz sıralamada değilsin"}\n` +
      `${getStatsText(type, mine)}\n${distance}\n\nKategori değiştirmek için \`!rank chat\` veya \`!rank voice\` kullan.`
  }).catch(() => {});
}

module.exports = async function messageCreate(message) {
  try { recordChat(message); } catch (error) { console.error("[ACTIVITY CHAT]", error); }
  try { await handleMessageXP(message); } catch (error) { console.error("[LEVEL CHAT]", error); }

  if (!message.guild || message.author.bot) return;
  const content = String(message.content || "").trim();
  if (!content.startsWith("!")) return;

  const [command, ...args] = content.split(/\s+/);
  const name = command.toLowerCase();
  if (name === "!leaderboard") {
    await handleLeaderboard(message, parseCategory(args[0]));
  } else if (name === "!rank") {
    await handlePersonalRank(message, parseCategory(args[0]));
  }
};
