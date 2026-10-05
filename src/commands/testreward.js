const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const config = require("../config");
const db = require("../database");
const { currentWeek } = require("../services/activityService");

const data = new SlashCommandBuilder()
  .setName("testreward")
  .setDescription("Haftanın yazılı veya sesli aktif rolünü test eder.")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption(o => o.setName("kategori").setDescription("Test edilecek ödül").setRequired(true)
    .addChoices({ name: "📝 Yazılı Aktif", value: "chat" }, { name: "🎙️ Sesli Aktif", value: "voice" }));

async function execute(interaction) {
  if (!interaction.guild) return interaction.reply({ content: "❌ Bu komut sadece sunucuda kullanılabilir.", flags: 64 });
  await interaction.deferReply({ flags: 64 });

  const type = interaction.options.getString("kategori");
  const roleId = type === "voice" ? config.voiceActivityRoleId : config.chatActivityRoleId;
  const label = type === "voice" ? "Sesli Aktif" : "Yazılı Aktif";
  const rows = type === "voice"
    ? db.getVoiceLeaderboard(currentWeek(), interaction.guild.id, 10)
    : db.getChatLeaderboard(currentWeek(), interaction.guild.id, 10);
  const winner = rows.find(row => interaction.guild.members.cache.get(row.userId)?.user.bot !== true);

  const role = interaction.guild.roles.cache.get(roleId);
  if (!role) return interaction.editReply(`❌ **${label}** rolü bulunamadı: \`${roleId}\``);
  if (!role.editable) return interaction.editReply(`❌ Bot **${role}** rolünü veremez. Bot rolünü bunun üstüne taşı ve **Rolleri Yönet** yetkisini aç.`);
  if (!winner) return interaction.editReply(`⚠️ Bu hafta **${label}** sıralamasında insan kullanıcı yok.`);

  const member = await interaction.guild.members.fetch(winner.userId).catch(() => null);
  if (!member || member.user.bot) return interaction.editReply("❌ Lider kullanıcı bulunamadı veya bot.");

  try {
    if (!member.roles.cache.has(role.id)) await member.roles.add(role, `SHIZU /testreward ${type}`);
    const stat = type === "voice"
      ? `🎙️ **Ses:** ${Math.floor(Number(winner.voice_seconds || 0) / 3600)}sa ${Math.floor((Number(winner.voice_seconds || 0) % 3600) / 60)}dk`
      : `💬 **Mesaj:** ${Number(winner.chat_messages || 0).toLocaleString("tr-TR")}`;
    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xa855f7).setTitle(`🧪 SHIZU — ${label} Rol Testi`).setDescription(`✅ Rol başarıyla verildi.\n\n👑 **Lider:** ${member}\n🎖️ **Rol:** ${role}\n${stat}`).setFooter({ text: "Bu test haftayı sıfırlamaz." }).setTimestamp()] });
  } catch (error) {
    console.error("[TESTREWARD ERROR]", error);
    return interaction.editReply(`❌ Rol verilemedi. Discord hatası: **${error.code || error.message}**`);
  }
}

module.exports = { data, execute };
