const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const config = require("../config");
const db = require("../database");
const { currentWeek } = require("../services/activityService");

const data = new SlashCommandBuilder()
  .setName("testreward")
  .setDescription("Mevcut haftanın liderine ödül rolünü test amaçlı verir.")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

async function execute(interaction) {
  if (!interaction.guild) {
    return interaction.reply({ content: "❌ Bu komut sadece sunucuda kullanılabilir.", flags: 64 });
  }

  await interaction.deferReply({ flags: 64 });

  const role = interaction.guild.roles.cache.get(config.activityRoleId);
  if (!role) {
    return interaction.editReply(
      `❌ Ödül rolü bulunamadı. **ACTIVITY_ROLE_ID** şu anda \`${config.activityRoleId}\`. ` +
      "`.env` içindeki ID'yi kontrol et."
    );
  }

  if (!role.editable) {
    return interaction.editReply(
      "❌ Bot bu rolü veremez. **Sunucu Ayarları → Roller** bölümünden botun rolünü ödül rolünün üstüne taşı ve botta **Rolleri Yönet** yetkisini aç."
    );
  }

  const week = currentWeek();
  const rows = db.getOverallLeaderboard(week, interaction.guild.id, 10);
  const winner = rows.find(row => {
    const member = interaction.guild.members.cache.get(row.userId);
    return member && !member.user.bot;
  });

  if (!winner) {
    return interaction.editReply(
      "⚠️ Bu hafta henüz sıralamada insan kullanıcı yok. Önce normal bir mesaj gönderip tekrar `/testreward` çalıştır."
    );
  }

  const member = await interaction.guild.members.fetch(winner.userId).catch(() => null);
  if (!member) {
    return interaction.editReply("❌ Birinci kullanıcının sunucu üyesi bilgisi alınamadı.");
  }

  if (member.user.bot) {
    return interaction.editReply("❌ Sıralamadaki kullanıcı bir bot, ödül rolü verilmedi.");
  }

  try {
    if (!member.roles.cache.has(role.id)) {
      await member.roles.add(role, "SHIZU /testreward ödül rolü testi");
    }

    const embed = new EmbedBuilder()
      .setColor(0xa855f7)
      .setTitle("🧪 SHIZU — Ödül Rolü Testi")
      .setDescription(`✅ Ödül rolü başarıyla verildi.\n\n👑 **Lider:** ${member}\n🎖️ **Rol:** ${role}\n💬 **Mesaj:** ${Number(winner.chat_messages || 0).toLocaleString("tr-TR")}\n🎙️ **Ses:** ${Math.floor(Number(winner.voice_seconds || 0) / 60)} dk\n⭐ **Skor:** ${Number(winner.score || 0).toLocaleString("tr-TR")}`)
      .setFooter({ text: "Bu komut sadece rol sistemini test eder; haftayı sıfırlamaz." })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error("[TESTREWARD ERROR]", error);
    return interaction.editReply(
      `❌ Rol verilemedi. Discord hatası: **${error.code || error.message}**\n\nBotun rolünün ödül rolünün üstünde olduğundan ve **Rolleri Yönet** yetkisi olduğundan emin ol.`
    );
  }
}

module.exports = { data, execute };
