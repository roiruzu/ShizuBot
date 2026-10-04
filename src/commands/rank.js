const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const {
    getRankInfo
} = require("../utils/levelingManager");

const {
    getLeaderboard
} = require("../utils/levelingStore");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("rank")
        .setDescription(
            "XP, level ve sıralama bilgini gösterir."
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription(
                    "Bilgilerini görmek istediğin kullanıcı"
                )
                .setRequired(false)
        ),

    async execute(interaction) {

        const target =
            interaction.options.getUser("user") ||
            interaction.user;

        const info =
            getRankInfo(
                interaction.guild.id,
                target.id
            );

        const leaderboard =
            getLeaderboard(
                interaction.guild.id
            );

        const position =
            leaderboard.findIndex(
                user =>
                    user.userId === target.id
            ) + 1;

        const progress =
            Math.min(
                Math.floor(
                    (
                        info.xpInLevel /
                        info.xpNeeded
                    ) * 100
                ),
                100
            );

        const barLength = 10;

        const filled =
            Math.round(
                (
                    progress /
                    100
                ) * barLength
            );

        const progressBar =
            "█".repeat(filled) +
            "░".repeat(
                barLength - filled
            );

        const embed =
            new EmbedBuilder()
                .setTitle(
                    `📊 ${target.username}`
                )
                .setDescription(
                    `**${target.username}** için XP profili`
                )
                .setThumbnail(
                    target.displayAvatarURL({
                        size: 256
                    })
                )
                .setColor(0x5865F2)
                .addFields(
                    {
                        name: "🏆 Level",
                        value:
                            `**${info.level}**`,
                        inline: true
                    },
                    {
                        name: "⭐ Toplam XP",
                        value:
                            `**${info.xp} XP**`,
                        inline: true
                    },
                    {
                        name: "🥇 Sıralama",
                        value:
                            `**#${position || "?"}**`,
                        inline: true
                    },
                    {
                        name: "📈 Level İlerlemesi",
                        value:
                            `${progressBar} **${progress}%**\n` +
                            `**${info.xpInLevel} / ${info.xpNeeded} XP**`,
                        inline: false
                    },
                    {
                        name: "💬 Mesaj",
                        value:
                            `**${info.totalMessages}**`,
                        inline: true
                    },
                    {
                        name: "🎙️ Ses",
                        value:
                            `**${info.voiceMinutes} dakika**`,
                        inline: true
                    }
                )
                .setFooter({
                    text:
                        "Shizu XP Sistemi"
                })
                .setTimestamp();

        await interaction.reply({
            embeds: [embed]
        });
    }
};