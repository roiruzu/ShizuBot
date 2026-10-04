const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
    EmbedBuilder
} = require("discord.js");

const {
    readWarnings,
    addWarning,
    getNextWarningId
} = require("../utils/warningsStore");

const {
    sendLog
} = require("../utils/logChannel");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("warn")
        .setDescription("Bir kullanıcıyı uyarır.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Uyarılacak kullanıcı")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("Uyarı sebebi")
                .setRequired(false)
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ModerateMembers
        ),

    async execute(interaction) {
        const user =
            interaction.options.getUser("user");

        const reason =
            interaction.options.getString("reason")?.trim() ||
            "Sebep belirtilmedi.";

        // Kendini uyarma
        if (user.id === interaction.user.id) {
            return interaction.reply({
                content: "❌ Kendini uyaramazsın.",
                flags: MessageFlags.Ephemeral
            });
        }

        // Botları uyarma
        if (user.bot) {
            return interaction.reply({
                content: "❌ Botları uyaramazsın.",
                flags: MessageFlags.Ephemeral
            });
        }

        // Hedef kullanıcıyı bul
        const targetMember =
            await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

        if (!targetMember) {
            return interaction.reply({
                content:
                    "❌ Bu kullanıcı sunucuda bulunmuyor.",
                flags: MessageFlags.Ephemeral
            });
        }

        // Sunucu sahibini uyarma
        if (
            targetMember.id ===
            interaction.guild.ownerId
        ) {
            return interaction.reply({
                content:
                    "❌ Sunucu sahibini uyaramazsın.",
                flags: MessageFlags.Ephemeral
            });
        }

        const executorMember =
            interaction.member;

        const botMember =
            interaction.guild.members.me;

        // Yetkili hiyerarşisi
        if (
            executorMember.id !==
                interaction.guild.ownerId &&
            targetMember.roles.highest.position >=
                executorMember.roles.highest.position
        ) {
            return interaction.reply({
                content:
                    "❌ Bu kullanıcı seninle aynı veya senden yüksek role sahip.",
                flags: MessageFlags.Ephemeral
            });
        }

        // Bot hiyerarşisi
        if (
            botMember &&
            targetMember.roles.highest.position >=
                botMember.roles.highest.position
        ) {
            return interaction.reply({
                content:
                    "❌ Bu kullanıcının rolü botun rolüyle aynı veya daha yüksek.",
                flags: MessageFlags.Ephemeral
            });
        }

        // Uyarıları oku
        let warnings;

        try {
            warnings = readWarnings();
        } catch (error) {
            throw new Error(
                `Uyarı veritabanı okunamadı: ${error.message}`
            );
        }

        // Yeni ID
        const nextId =
            getNextWarningId(
                warnings,
                interaction.guild.id,
                user.id
            );

        // Uyarı verisi
        const warning = {
            id: nextId,
            guildId: interaction.guild.id,
            userId: user.id,
            moderator: interaction.user.id,
            moderatorTag: interaction.user.tag,
            reason,
            timestamp:
                new Date().toISOString()
        };

        // Uyarıyı kaydet
        try {
            addWarning(
                interaction.guild.id,
                user.id,
                warning
            );
        } catch (error) {
            throw new Error(
                `Uyarı kaydedilemedi: ${error.message}`
            );
        }

        // Kullanıcıya cevap
        await interaction.reply({
            content:
                `⚠️ ${user} uyarıldı.\n\n` +
                `**Uyarı ID:** #${nextId}\n` +
                `**Sebep:** ${reason}\n` +
                `**Yetkili:** ${interaction.user}`
        });

        // Log embed'i
        const logEmbed =
            new EmbedBuilder()
                .setTitle("⚠️ Kullanıcı Uyarıldı")
                .setDescription(
                    `${user} kullanıcısına uyarı verildi.`
                )
                .addFields(
                    {
                        name: "👤 Kullanıcı",
                        value:
                            `${user}\n` +
                            `\`${user.tag}\`\n` +
                            `ID: \`${user.id}\``,
                        inline: true
                    },
                    {
                        name: "👮 Yetkili",
                        value:
                            `${interaction.user}\n` +
                            `\`${interaction.user.tag}\`\n` +
                            `ID: \`${interaction.user.id}\``,
                        inline: true
                    },
                    {
                        name: "🆔 Uyarı ID",
                        value:
                            `#${nextId}`,
                        inline: true
                    },
                    {
                        name: "📝 Sebep",
                        value:
                            reason,
                        inline: false
                    }
                )
                .setThumbnail(
                    user.displayAvatarURL({
                        dynamic: true,
                        size: 256
                    })
                )
                .setFooter({
                    text:
                        `Shizu • ${interaction.guild.name}`
                })
                .setTimestamp();

        // Log kanalına gönder
        const logSent =
            await sendLog(
                interaction.guild,
                logEmbed
            );

        if (!logSent) {
            console.error(
                "⚠️ /warn çalıştı fakat log mesajı gönderilemedi."
            );
        }
    }
};