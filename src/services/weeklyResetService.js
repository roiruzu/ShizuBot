const config = require("../config");
const db = require("../database");
const { getWeekKey, isResetWindow } = require("../utils/weekly");
const { getTopThree } = require("./leaderboardService");

let lastResetKey = null;

function buildResultRows(guild, rows, type) {
  return rows.map((row, index) => {
    const member = guild.members.cache.get(row.user_id);
    return {
      position: index + 1,
      userId: row.user_id,
      name: member?.displayName || `<@${row.user_id}>`,
      chat: row.chat_messages,
      voice: row.voice_seconds,
      type
    };
  });
}

async function giveRewardRole(guild, winnerIds) {
  const role = guild.roles.cache.get(config.activityRoleId);
  if (!role) {
    console.warn("ACTIVITY_ROLE_ID bulunamadı:", config.activityRoleId);
    return;
  }

  if (!role.editable) {
    console.warn("Ödül rolü bot tarafından yönetilemiyor. Bot rolünü yükselt.");
    return;
  }

  for (const member of guild.members.cache.values()) {
    if (member.user.bot) continue;

    const shouldHave = winnerIds.has(member.id);
    const has = member.roles.cache.has(role.id);

    try {
      if (shouldHave && !has) {
        await member.roles.add(role, "SHIZU haftalık aktivite ödülü");
      } else if (!shouldHave && has) {
        await member.roles.remove(role, "Yeni hafta ödül rolü güncellendi");
      }
    } catch (error) {
      console.error(`Rol güncellenemedi: ${member.id}`, error.message);
    }
  }
}

function resultText(rows, type) {
  if (!rows.length) return "Bu hafta henüz veri oluşmadı.";

  return rows.map((r, i) => {
    const emoji = ["🥇", "🥈", "🥉"][i] || "🏅";
    if (type === "chat") {
      return `${emoji} <@${r.userId}> — **${r.chat} mesaj**`;
    }
    return `${emoji} <@${r.userId}> — **${Math.floor(r.voice / 3600)}s ${Math.floor((r.voice % 3600) / 60)}dk**`;
  }).join("\n");
}

async function resetWeek(guild) {
  const oldWeek = currentWeek();
  const chatWinners = getTopThree(guild.id, "chat");
  const voiceWinners = getTopThree(guild.id, "voice");

  const winnerIds = new Set([
    ...chatWinners.map(x => x.user_id),
    ...voiceWinners.map(x => x.user_id)
  ]);

  await giveRewardRole(guild, winnerIds);

  const archivedAt = new Date().toISOString();
  db.archiveAndReset(oldWeek, guild.id, archivedAt);

  const nextWeek = getWeekKey(new Date(Date.now() + 60 * 1000), config.timezone);
  db.setMeta(`last_reset:${guild.id}`, oldWeek);

  if (config.announcementChannelId) {
    const channel = guild.channels.cache.get(config.announcementChannelId);

    if (channel?.isTextBased()) {
      const { EmbedBuilder } = require("discord.js");

      const embed = new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setTitle("⚔️ SHIZU — Haftalık Savaş Sonuçları")
        .setDescription(
          `**Yazılı Sohbet Savaşı**\n${resultText(chatWinners, "chat")}\n\n` +
          `**Sesli Kanal Savaşı**\n${resultText(voiceWinners, "voice")}\n\n` +
          `Yeni hafta başladı. Zirve için savaşmaya devam!`
        )
        .setTimestamp();

      await channel.send({ embeds: [embed] }).catch(() => {});
    }
  }

  console.log(`Hafta sıfırlandı: ${oldWeek} -> ${nextWeek}`);
}

async function tick(guild) {
  if (!isResetWindow()) return;

  const week = currentWeek();
  if (lastResetKey === week) return;

  const persisted = db.getMeta(`last_reset:${guild.id}`);
  if (persisted === week) {
    lastResetKey = week;
    return;
  }

  lastResetKey = week;
  await resetWeek(guild);
}

module.exports = { tick, resetWeek };
