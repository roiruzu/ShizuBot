const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags
} = require("discord.js");

const {
    setLevel,
    getRequiredTotalXP
} = require("../utils/levelingStore");

const {
    updateLevelRoles
} = require("../utils/levelingManager");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("setlevel")
        .setDescription("Chat veya sesli level ayarlar.")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        )

        .addUserOption(option =>
            option
                .setName("user")
                .setDescription(
                    "Leveli değiştirilecek kullanıcı"
                )
                .setRequired(true)
        )

        .addStringOption(option =>
            option
                .setName("type")
                .setDescription(
                    "Hangi level ayarlanacak?"
                )
                .setRequired(true)
                .addChoices(
                    {
                        name: "💬 Chat Level",
                        value: "chat"
                    },
                    {
                        name: "🎧 Sesli Level",
                        value: "voice"
                    }
                )
        )

        .addIntegerOption(option =>
            option
                .setName("level")
                .setDescription(
                    "Verilecek level"
                )
                .setMinValue(0)
                .setMaxValue(1000)
                .setRequired(true)
        ),

    async execute(interaction) {
        try {
            if (!interaction.guild) {
                return interaction.reply({
                    content:
                        "❌ Bu komut sadece sunucularda kullanılabilir.",
                    flags:
                        MessageFlags.Ephemeral
                });
            }

            if (
                !interaction.member.permissions.has(
                    PermissionFlagsBits.ManageGuild
                )
            ) {
                return interaction.reply({
                    content:
                        "❌ Bu komutu kullanmak için **Sunucuyu Yönet** yetkisine sahip olmalısın.",
                    flags:
                        MessageFlags.Ephemeral
                });
            }

            const target =
                interaction.options.getMember(
                    "user"
                );

            const type =
                interaction.options.getString(
                    "type"
                );

            const level =
                interaction.options.getInteger(
                    "level"
                );

            if (!target) {
                return interaction.reply({
                    content:
                        "❌ Kullanıcı sunucuda bulunamadı.",
                    flags:
                        MessageFlags.Ephemeral
                });
            }

            /*
                Level ayarla
            */

            const user =
                setLevel(
                    interaction.guild.id,
                    target.id,
                    type,
                    level
                );

            /*
                Mevcut iki sistemi
                birlikte kontrol et
            */

            await updateLevelRoles(
                interaction.guild,
                target,
                user.chatLevel,
                user.voiceLevel
            );

            const xp =
                getRequiredTotalXP(
                    level
                );

            const typeName =
                type === "chat"
                    ? "💬 Chat"
                    : "🎧 Sesli";

            return interaction.reply({
                content:
                    `✅ ${target} kullanıcısının **${typeName} Level'i ${level}** olarak ayarlandı.\n\n` +
                    `✨ XP: **${xp.toLocaleString("tr-TR")} XP**`,
                flags:
                    MessageFlags.Ephemeral
            });
        } catch (error) {
            console.error(
                "❌ setlevel komutu hatası:",
                error
            );

            if (
                interaction.replied ||
                interaction.deferred
            ) {
                return interaction.followUp({
                    content:
                        "❌ Level ayarlanırken bir hata oluştu.",
                    flags:
                        MessageFlags.Ephemeral
                });
            }

            return interaction.reply({
                content:
                    "❌ Level ayarlanırken bir hata oluştu.",
                flags:
                    MessageFlags.Ephemeral
            });
        }
    }
};