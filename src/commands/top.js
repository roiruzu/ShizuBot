const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const {
    getLeaderboard
} = require("../utils/levelingStore");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("top")
        .setDescription(
            "XP liderlik tablosunu gösterir."
        ),

    async execute(interaction) {

        const leaderboard =
            getLeaderboard(
                interaction.guild.id
            ).slice(0, 10);

        if (!leaderboard.length) {

            await interaction.reply({
                content:
                    "📊 Henüz XP kazanan kimse yok."
            });

            return;
        }

        const lines = [];

        for (
            let i = 0;
            i < leaderboard.length;
            i++
        ) {

            const data =
                leaderboard[i];

            const member =
                await interaction.guild.members
                    .fetch(data.userId)
                    .catch(() => null);

            const username =
                member?.user.username ||
                "Bilinmeyen Kullanıcı";

            let medal;

            if (i === 0) {
                medal = "🥇";
            } else if (i === 1) {
                medal = "🥈";
            } else if (i === 2) {
                medal = "🥉";
            } else {
                medal =
                    `**${i + 1}.**`;
            }

            lines.push(
                `${medal} **${username}**\n` +
                `└ 🏆 Level ${data.level} • ⭐ ${data.xp} XP`
            );
        }

        const embed =
            new EmbedBuilder()
                .setTitle(
                    "🏆 Shizu XP Liderlik Tablosu"
                )
                .setDescription(
                    lines.join("\n\n")
                )
                .setColor(0xFEE75C)
                .setFooter({
                    text:
                        `${interaction.guild.name} • İlk 10`
                })
                .setTimestamp();

        await interaction.reply({
            embeds: [embed]
        });
    }
};