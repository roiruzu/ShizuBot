const { EmbedBuilder } = require("discord.js");
const config = require("../config");
const db = require("../database");
const { getWeekKey, isResetWindow } = require("../utils/weekly");
const { getTopThree } = require("./leaderboardService");
const { currentWeek, endAllVoiceSessions } = require("./activityService");

let lastResetKey = null;

async function giveCategoryRole(guild, roleId, winnerId, label) {
  const role = guild.roles.cache.get(roleId);
  if (!role) {
    console.warn(`[ROLE] ${label} rolü bulunamadı: ${roleId}`);
    return false;
  }
  if (!role.editable) {
    console.warn(`[ROLE] ${label} rolü bot tarafından yönetilemiyor: ${roleId}`);
    return false;
  }

  await guild.members.fetch().catch(() => {});
  for (const member of guild.members.cache.values()) {
    if (member.user.bot) continue;
    const shouldHave = Boolean(winnerId && member.id === winnerId);
    const has = member.roles.cache.has(role.id);
    try {
      if (shouldHave && !has) {
        await member.roles.add(role, `SHIZU haftalık ${label} ödülü`);
      } else if (!shouldHave && has) {
        await member.roles.remove(role, `SHIZU yeni haftalık ${label} ödülü`);
      }
    } catch (error) {
      console.error(`[ROLE ${label}] ${member.id}`, error.message);
    }
  }
  return true;
}

function resultText(rows, type) {
  if (!rows.length) return "Bu hafta henüz veri oluşmadı.";
  return rows.map((r, i) => {
    const emoji = ["🥇", "🥈", "🥉"][i] || "🏅";
    if (type === "chat") return `${emoji} <@${r.userId}> — **${r.chat_messages} mesaj**`;
    return `${emoji} <@${r.userId}> — **${Math.floor(r.voice_seconds / 3600)}sa ${Math.floor((r.voice_seconds % 3600) / 60)}dk**`;
  }).join("\n");
}

async function resetWeek(guild, oldWeek = currentWeek()) {
  endAllVoiceSessions();

  const chatWinners = getTopThree(guild.id, "chat");
  const voiceWinners = getTopThree(guild.id, "voice");
  const chatWinnerId = chatWinners[0]?.userId || null;
  const voiceWinnerId = voiceWinners[0]?.userId || null;

  await giveCategoryRole(guild, config.chatActivityRoleId, chatWinnerId, "yazılı aktif");
  await giveCategoryRole(guild, config.voiceActivityRoleId, voiceWinnerId, "sesli aktif");

  db.archiveWeek(oldWeek, guild.id, {
    chatWinners: chatWinners.map(x => x.userId),
    voiceWinners: voiceWinners.map(x => x.userId),
    chatWinnerId,
    voiceWinnerId
  });
  db.resetWeek(oldWeek, guild.id);
  db.setMeta(`last_reset:${guild.id}`, oldWeek);

  if (config.announcementChannelId) {
    const channel = guild.channels.cache.get(config.announcementChannelId);
    if (channel?.isTextBased()) {
      const embed = new EmbedBuilder()
        .setColor(0xa855f7)
        .setTitle("🌙 SHIZU — Haftalık Aktifler")
        .setDescription(
          `📝 **Haftanın Yazılı Aktifi**\n${chatWinners[0] ? `<@${chatWinners[0].userId}> — **${chatWinners[0].chat_messages} mesaj**` : "Bu hafta veri yok."}` +
          `\n\n🎙️ **Haftanın Sesli Aktifi**\n${voiceWinners[0] ? `<@${voiceWinners[0].userId}> — **${Math.floor(voiceWinners[0].voice_seconds / 3600)}sa ${Math.floor((voiceWinners[0].voice_seconds % 3600) / 60)}dk**` : "Bu hafta veri yok."}` +
          "\n\nYeni hafta başladı. Zirve için savaşmaya devam!"
        )
        .setTimestamp();
      await channel.send({ embeds: [embed] }).catch(() => {});
    }
  }

  console.log(`Hafta sıfırlandı: ${oldWeek} -> ${getWeekKey(new Date(Date.now() + 60000), config.timezone)}`);
}

async function tick(guild) {
  if (!isResetWindow(new Date(), config.timezone)) return;
  const week = currentWeek();
  if (lastResetKey === week) return;
  const persisted = db.getMeta(`last_reset:${guild.id}`);
  if (persisted === week) { lastResetKey = week; return; }
  await resetWeek(guild, week);
  lastResetKey = week;
}

module.exports = { tick, resetWeek };
