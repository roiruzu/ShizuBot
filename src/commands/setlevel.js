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
        .setDescription("Bir kullanıcının levelini ayarlar.")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Leveli değiştirilecek kullanıcı")
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName("level")
                .setDescription("Verilecek level")
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
                    flags: MessageFlags.Ephemeral
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
                    flags: MessageFlags.Ephemeral
                });
            }

            const target =
                interaction.options.getMember("user");

            const level =
                interaction.options.getInteger("level");

            if (!target) {
                return interaction.reply({
                    content:
                        "❌ Kullanıcı sunucuda bulunamadı.",
                    flags: MessageFlags.Ephemeral
                });
            }

            /*
                Level + XP ayarla
            */
            const user =
                setLevel(
                    interaction.guild.id,
                    target.id,
                    level
                );

            /*
                Chat + [X]
                Sesli + [X]

                rollerini güncelle
            */
            await updateLevelRoles(
                interaction.guild,
                target,
                level
            );

            const xp =
                getRequiredTotalXP(level);

            return interaction.reply({
                content:
                    `✅ ${target} kullanıcısının seviyesi **Level ${level}** olarak ayarlandı.\n\n` +
                    `✨ XP: **${xp.toLocaleString("tr-TR")} XP**`,
                flags: MessageFlags.Ephemeral
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
                    flags: MessageFlags.Ephemeral
                });
            }

            return interaction.reply({
                content:
                    "❌ Level ayarlanırken bir hata oluştu.",
                flags: MessageFlags.Ephemeral
            });
        }
    }
};