const { EmbedBuilder } = require("discord.js");
const config = require("../config");
const db = require("../database");
const { getWeekKey, isResetWindow } = require("../utils/weekly");
const { getTopThree } = require("./leaderboardService");
const { currentWeek, endAllVoiceSessions } = require("./activityService");

let lastResetKey = null;

async function giveCategoryRole(guild, roleId, winnerIds, label) {
  const role = guild.roles.cache.get(roleId);
  if (!role) {
    console.warn(`[ROLE] ${label} rolü bulunamadı: ${roleId}`);
    return false;
  }
  if (!role.editable) {
    console.warn(`[ROLE] ${label} rolü bot tarafından yönetilemiyor: ${roleId}`);
    return false;
  }

  const winners = new Set((Array.isArray(winnerIds) ? winnerIds : winnerIds ? [winnerIds] : []).filter(Boolean));
  await guild.members.fetch().catch(() => {});
  for (const member of guild.members.cache.values()) {
    if (member.user.bot) continue;
    const shouldHave = winners.has(member.id);
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
  const chatWinnerIds = chatWinners.map(row => row.userId).slice(0, 3);
  const voiceWinnerIds = voiceWinners.map(row => row.userId).slice(0, 3);
  const chatWinnerId = chatWinnerIds[0] || null;
  const voiceWinnerId = voiceWinnerIds[0] || null;

  // İlk 3 üyeye kategori rolünü verir; bu kategori rolünü önceki kazananlardan kaldırır.
  await giveCategoryRole(guild, config.chatActivityRoleId, chatWinnerIds, "yazılı aktif");
  await giveCategoryRole(guild, config.voiceActivityRoleId, voiceWinnerIds, "sesli aktif");

  db.archiveWeek(oldWeek, guild.id, {
    chatWinners: chatWinnerIds,
    voiceWinners: voiceWinnerIds,
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
          `📝 **Yazılı Sohbet — İlk 3**\n${chatWinners.length ? chatWinners.slice(0, 3).map((row, i) => `${["🥇","🥈","🥉"][i]} <@${row.userId}> — **${row.chat_messages} mesaj**`).join("\n") : "Bu hafta veri yok."}` +
          `\n\n🎙️ **Sesli Kanal — İlk 3**\n${voiceWinners.length ? voiceWinners.slice(0, 3).map((row, i) => `${["🥇","🥈","🥉"][i]} <@${row.userId}> — **${Math.floor(row.voice_seconds / 3600)}sa ${Math.floor((row.voice_seconds % 3600) / 60)}dk**`).join("\n") : "Bu hafta veri yok."}` +
          "\n\nİlk 3 üyeye ilgili kategori rolü verildi. Yeni hafta başladı!"
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
