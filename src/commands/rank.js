const {
    SlashCommandBuilder,
    AttachmentBuilder
} = require("discord.js");

const {
    createCanvas,
    loadImage
} = require("@napi-rs/canvas");

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

        await interaction.deferReply();

        const target =
            interaction.options.getUser("user") ||
            interaction.user;

        const info =
            getRankInfo(
                interaction.guild.id,
                target.id
            );

        if (!info) {
            return interaction.editReply(
                "❌ Bu kullanıcı için rank bilgisi bulunamadı."
            );
        }

        const leaderboard =
            getLeaderboard(
                interaction.guild.id
            );

        const position =
            leaderboard.findIndex(
                user =>
                    user.userId === target.id
            ) + 1;

        // ==========================================
        // CANVAS
        // ==========================================

        const width = 1200;
        const height = 500;

        const canvas =
            createCanvas(width, height);

        const ctx =
            canvas.getContext("2d");

        // ==========================================
        // GECE / MOR ARKA PLAN
        // ==========================================

        const background =
            ctx.createLinearGradient(
                0,
                0,
                width,
                height
            );

        background.addColorStop(
            0,
            "#090516"
        );

        background.addColorStop(
            0.45,
            "#160B2E"
        );

        background.addColorStop(
            1,
            "#32105C"
        );

        ctx.fillStyle = background;

        ctx.fillRect(
            0,
            0,
            width,
            height
        );

        // ==========================================
        // MOR GLOW
        // ==========================================

        const glow =
            ctx.createRadialGradient(
                970,
                90,
                20,
                970,
                90,
                400
            );

        glow.addColorStop(
            0,
            "rgba(174, 92, 255, 0.35)"
        );

        glow.addColorStop(
            1,
            "rgba(174, 92, 255, 0)"
        );

        ctx.fillStyle = glow;

        ctx.fillRect(
            600,
            0,
            600,
            450
        );

        // ==========================================
        // AY
        // ==========================================

        ctx.beginPath();

        ctx.arc(
            980,
            105,
            75,
            0,
            Math.PI * 2
        );

        ctx.fillStyle =
            "rgba(215, 181, 255, 0.95)";

        ctx.shadowColor =
            "#B56CFF";

        ctx.shadowBlur = 35;

        ctx.fill();

        ctx.shadowBlur = 0;

        // Ayın önünden koyu parça
        ctx.beginPath();

        ctx.arc(
            1010,
            85,
            75,
            0,
            Math.PI * 2
        );

        ctx.fillStyle =
            "#160B2E";

        ctx.fill();

        // ==========================================
        // YILDIZLAR
        // ==========================================

        const stars = [
            [80, 70, 2],
            [150, 125, 1],
            [220, 55, 2],
            [310, 105, 1],
            [410, 65, 2],
            [500, 130, 1],
            [590, 70, 2],
            [700, 110, 1],
            [790, 50, 2],
            [860, 155, 1],
            [1100, 170, 2],
            [1140, 80, 1]
        ];

        for (const [x, y, size] of stars) {

            ctx.beginPath();

            ctx.arc(
                x,
                y,
                size,
                0,
                Math.PI * 2
            );

            ctx.fillStyle =
                "rgba(255,255,255,0.75)";

            ctx.fill();
        }

        // ==========================================
        // ALT MOR GLOW
        // ==========================================

        const bottomGlow =
            ctx.createLinearGradient(
                0,
                330,
                0,
                500
            );

        bottomGlow.addColorStop(
            0,
            "rgba(157, 66, 255, 0)"
        );

        bottomGlow.addColorStop(
            1,
            "rgba(157, 66, 255, 0.35)"
        );

        ctx.fillStyle = bottomGlow;

        ctx.fillRect(
            0,
            330,
            width,
            170
        );

        // ==========================================
        // AVATAR
        // ==========================================

        const avatarSize = 150;

        const avatarX = 70;
        const avatarY = 90;

        try {

            const avatar =
                await loadImage(
                    target.displayAvatarURL({
                        extension: "png",
                        size: 256
                    })
                );

            // Dış glow
            ctx.beginPath();

            ctx.arc(
                avatarX + avatarSize / 2,
                avatarY + avatarSize / 2,
                avatarSize / 2 + 8,
                0,
                Math.PI * 2
            );

            ctx.fillStyle =
                "#9B5CFF";

            ctx.shadowColor =
                "#A45CFF";

            ctx.shadowBlur = 25;

            ctx.fill();

            ctx.shadowBlur = 0;

            // Yuvarlak avatar
            ctx.save();

            ctx.beginPath();

            ctx.arc(
                avatarX + avatarSize / 2,
                avatarY + avatarSize / 2,
                avatarSize / 2,
                0,
                Math.PI * 2
            );

            ctx.clip();

            ctx.drawImage(
                avatar,
                avatarX,
                avatarY,
                avatarSize,
                avatarSize
            );

            ctx.restore();

        } catch {
            // Avatar yüklenemezse devam et
        }

        // ==========================================
        // KULLANICI ADI
        // ==========================================

        ctx.font =
            "bold 38px Arial";

        ctx.fillStyle =
            "#FFFFFF";

        ctx.fillText(
            target.username,
            260,
            135
        );

        ctx.font =
            "22px Arial";

        ctx.fillStyle =
            "#BDAED3";

        ctx.fillText(
            "SHIZU XP PROFILE",
            260,
            170
        );

        // ==========================================
        // LEVEL
        // ==========================================

        ctx.font =
            "bold 82px Arial";

        ctx.fillStyle =
            "#FFFFFF";

        ctx.fillText(
            `LEVEL ${info.level}`,
            70,
            330
        );

        // ==========================================
        // RANK
        // ==========================================

        ctx.font =
            "bold 28px Arial";

        ctx.fillStyle =
            "#D3A7FF";

        ctx.fillText(
            `🏆 #${position || "?"} SUNUCU SIRALAMASI`,
            70,
            375
        );

        // ==========================================
        // XP BAR
        // ==========================================

        const xpNeeded =
            Math.max(
                info.xpNeeded || 1,
                1
            );

        const progress =
            Math.min(
                Math.max(
                    (info.xpInLevel / xpNeeded) * 100,
                    0
                ),
                100
            );

        const barX = 70;
        const barY = 410;
        const barWidth = 700;
        const barHeight = 25;

        // Arka bar
        ctx.fillStyle =
            "rgba(255,255,255,0.12)";

        ctx.beginPath();

        ctx.roundRect(
            barX,
            barY,
            barWidth,
            barHeight,
            15
        );

        ctx.fill();

        // Dolu bar
        const xpGradient =
            ctx.createLinearGradient(
                barX,
                0,
                barX + barWidth,
                0
            );

        xpGradient.addColorStop(
            0,
            "#8B5CF6"
        );

        xpGradient.addColorStop(
            1,
            "#D946EF"
        );

        ctx.fillStyle =
            xpGradient;

        ctx.beginPath();

        ctx.roundRect(
            barX,
            barY,
            barWidth * (progress / 100),
            barHeight,
            15
        );

        ctx.fill();

        // ==========================================
        // XP TEXT
        // ==========================================

        ctx.font =
            "20px Arial";

        ctx.fillStyle =
            "#E7D9F7";

        ctx.fillText(
            `${info.xpInLevel} / ${info.xpInLevel + info.xpNeeded} XP`,
            70,
            465
        );

        ctx.fillText(
            `${Math.floor(progress)}%`,
            720,
            465
        );

        // ==========================================
        // İSTATİSTİKLER
        // ==========================================

        drawStat(
            ctx,
            850,
            260,
            "💬",
            "MESAJ",
            `${info.totalMessages || 0}`
        );

        drawStat(
            ctx,
            850,
            335,
            "🎙",
            "SES",
            `${info.voiceMinutes || 0} dk`
        );

        drawStat(
            ctx,
            850,
            410,
            "⭐",
            "TOPLAM XP",
            `${info.xp || 0}`
        );

        // ==========================================
        // SHIZU
        // ==========================================

        ctx.font =
            "bold 22px Arial";

        ctx.fillStyle =
            "rgba(255,255,255,0.5)";

        ctx.fillText(
            "SHIZU",
            1080,
            455
        );

        // ==========================================
        // PNG
        // ==========================================

        const buffer =
            await canvas.encode("png");

        const attachment =
            new AttachmentBuilder(
                buffer,
                {
                    name: "shizu-rank.png"
                }
            );

        await interaction.editReply({
            files: [attachment]
        });
    }
};

// ==========================================
// STAT KARTI
// ==========================================

function drawStat(
    ctx,
    x,
    y,
    icon,
    title,
    value
) {

    ctx.fillStyle =
        "rgba(255,255,255,0.07)";

    ctx.beginPath();

    ctx.roundRect(
        x,
        y - 35,
        280,
        60,
        15
    );

    ctx.fill();

    ctx.font =
        "24px Arial";

    ctx.fillStyle =
        "#D6B5FF";

    ctx.fillText(
        icon,
        x + 15,
        y + 5
    );

    ctx.font =
        "bold 14px Arial";

    ctx.fillStyle =
        "#A99AB8";

    ctx.fillText(
        title,
        x + 55,
        y - 5
    );

    ctx.font =
        "bold 20px Arial";

    ctx.fillStyle =
        "#FFFFFF";

    ctx.fillText(
        value,
        x + 55,
        y + 18
    );
}