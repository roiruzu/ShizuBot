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
    getUser
} = require("../utils/levelingStore");

// ============================================================
// AYARLAR
// ============================================================

const WIDTH = 1100;
const HEIGHT = 420;

const COLORS = {
    background: "#100727",
    background2: "#241044",
    purple: "#a855f7",
    purpleLight: "#c084fc",
    white: "#ffffff",
    text: "#eee7ff",
    muted: "#aa9bc7",
    panel: "#2b1650",
    panel2: "#351a61",
    bar: "#9b5de5",
    barBackground: "#442768"
};

// ============================================================
// YARDIMCI
// ============================================================

function safeNumber(value, fallback = 0) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return fallback;
    }

    return number;
}

function clamp(value, min, max) {
    return Math.min(
        max,
        Math.max(min, value)
    );
}

function roundRect(
    ctx,
    x,
    y,
    width,
    height,
    radius
) {
    const r = Math.min(
        radius,
        width / 2,
        height / 2
    );

    ctx.beginPath();

    ctx.moveTo(
        x + r,
        y
    );

    ctx.lineTo(
        x + width - r,
        y
    );

    ctx.quadraticCurveTo(
        x + width,
        y,
        x + width,
        y + r
    );

    ctx.lineTo(
        x + width,
        y + height - r
    );

    ctx.quadraticCurveTo(
        x + width,
        y + height,
        x + width - r,
        y + height
    );

    ctx.lineTo(
        x + r,
        y + height
    );

    ctx.quadraticCurveTo(
        x,
        y + height,
        x,
        y + height - r
    );

    ctx.lineTo(
        x,
        y + r
    );

    ctx.quadraticCurveTo(
        x,
        y,
        x + r,
        y
    );

    ctx.closePath();
}

function drawText(
    ctx,
    text,
    x,
    y,
    size,
    color = COLORS.white,
    weight = "700"
) {
    ctx.font =
        `${weight} ${size}px Arial`;

    ctx.fillStyle = color;

    ctx.fillText(
        String(text),
        x,
        y
    );
}

function formatNumber(number) {
    return Number(
        safeNumber(number, 0)
    ).toLocaleString("tr-TR");
}

// ============================================================
// AVATAR
// ============================================================

async function getAvatar(user) {
    try {
        const avatarURL =
            user.displayAvatarURL({
                extension: "png",
                size: 256,
                forceStatic: true
            });

        return await loadImage(
            avatarURL
        );

    } catch {
        return null;
    }
}

// ============================================================
// AY
// ============================================================

function drawMoon(ctx) {
    // Glow
    const gradient =
        ctx.createRadialGradient(
            900,
            80,
            10,
            900,
            80,
            120
        );

    gradient.addColorStop(
        0,
        "rgba(210,150,255,0.45)"
    );

    gradient.addColorStop(
        1,
        "rgba(210,150,255,0)"
    );

    ctx.fillStyle = gradient;

    ctx.beginPath();

    ctx.arc(
        900,
        80,
        120,
        0,
        Math.PI * 2
    );

    ctx.fill();

    // Moon
    ctx.fillStyle =
        "#d8a7ff";

    ctx.beginPath();

    ctx.arc(
        900,
        80,
        60,
        0,
        Math.PI * 2
    );

    ctx.fill();

    // Dark overlay = crescent
    ctx.fillStyle =
        COLORS.background;

    ctx.beginPath();

    ctx.arc(
        925,
        65,
        58,
        0,
        Math.PI * 2
    );

    ctx.fill();
}

// ============================================================
// STARS
// ============================================================

function drawStars(ctx) {
    const stars = [
        [80, 40, 2],
        [180, 20, 1],
        [280, 75, 2],
        [410, 35, 1],
        [515, 85, 2],
        [650, 35, 1],
        [760, 110, 2],
        [1000, 35, 1],
        [1040, 120, 2],
        [1080, 60, 1],
        [740, 170, 1],
        [40, 150, 1],
        [330, 130, 1]
    ];

    for (
        const [x, y, size] of stars
    ) {
        ctx.fillStyle =
            "rgba(235,215,255,0.85)";

        ctx.beginPath();

        ctx.arc(
            x,
            y,
            size,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }
}

// ============================================================
// AVATAR CIRCLE
// ============================================================

function drawAvatar(
    ctx,
    avatar,
    x,
    y,
    size
) {
    ctx.save();

    // Glow
    ctx.shadowColor =
        COLORS.purpleLight;

    ctx.shadowBlur = 18;

    ctx.fillStyle =
        COLORS.purple;

    ctx.beginPath();

    ctx.arc(
        x + size / 2,
        y + size / 2,
        size / 2 + 5,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.shadowBlur = 0;

    // Circle
    ctx.beginPath();

    ctx.arc(
        x + size / 2,
        y + size / 2,
        size / 2,
        0,
        Math.PI * 2
    );

    ctx.clip();

    if (avatar) {
        ctx.drawImage(
            avatar,
            x,
            y,
            size,
            size
        );
    } else {
        ctx.fillStyle =
            COLORS.panel2;

        ctx.fillRect(
            x,
            y,
            size,
            size
        );
    }

    ctx.restore();
}

// ============================================================
// XP BAR
// ============================================================

function drawXPBar(
    ctx,
    x,
    y,
    width,
    height,
    progress
) {
    const safeProgress =
        clamp(
            safeNumber(
                progress,
                0
            ),
            0,
            100
        );

    // Background
    ctx.fillStyle =
        COLORS.barBackground;

    roundRect(
        ctx,
        x,
        y,
        width,
        height,
        8
    );

    ctx.fill();

    // Progress
    const fillWidth =
        width *
        (safeProgress / 100);

    if (fillWidth > 0) {
        const gradient =
            ctx.createLinearGradient(
                x,
                y,
                x + width,
                y
            );

        gradient.addColorStop(
            0,
            "#8b5cf6"
        );

        gradient.addColorStop(
            1,
            "#c084fc"
        );

        ctx.fillStyle =
            gradient;

        roundRect(
            ctx,
            x,
            y,
            Math.max(
                height,
                fillWidth
            ),
            height,
            8
        );

        ctx.fill();
    }
}

// ============================================================
// STAT CARD
// ============================================================

function drawStatCard(
    ctx,
    x,
    y,
    width,
    height,
    title,
    value
) {
    ctx.fillStyle =
        "rgba(76,40,118,0.62)";

    roundRect(
        ctx,
        x,
        y,
        width,
        height,
        12
    );

    ctx.fill();

    drawText(
        ctx,
        title,
        x + 18,
        y + 25,
        11,
        COLORS.muted,
        "700"
    );

    drawText(
        ctx,
        value,
        x + 18,
        y + 49,
        18,
        COLORS.text,
        "700"
    );
}

// ============================================================
// RANK NUMARASI
// ============================================================

async function getServerRank(
    guild,
    userId,
    totalXP
) {
    try {
        if (!guild) {
            return 1;
        }

        await guild.members.fetch();

        const users = [];

        for (
            const member of guild.members.cache.values()
        ) {
            if (member.user.bot) {
                continue;
            }

            try {
                const data =
                    getUser(
                        guild.id,
                        member.id
                    );

                const xp =
                    safeNumber(
                        data?.xp,
                        0
                    );

                users.push({
                    id: member.id,
                    xp
                });

            } catch {
                // Kullanıcı verisi yoksa geç
            }
        }

        users.sort(
            (a, b) =>
                b.xp - a.xp
        );

        const index =
            users.findIndex(
                user =>
                    user.id === userId
            );

        if (index === -1) {
            return 1;
        }

        return index + 1;

    } catch {
        return 1;
    }
}

// ============================================================
// RANK CANVAS
// ============================================================

async function createRankCard(
    member,
    info,
    serverRank
) {
    const canvas =
        createCanvas(
            WIDTH,
            HEIGHT
        );

    const ctx =
        canvas.getContext("2d");

    // ========================================================
    // ARKA PLAN
    // ========================================================

    const background =
        ctx.createLinearGradient(
            0,
            0,
            WIDTH,
            HEIGHT
        );

    background.addColorStop(
        0,
        "#0c051c"
    );

    background.addColorStop(
        0.48,
        "#18082f"
    );

    background.addColorStop(
        1,
        "#4b1f78"
    );

    ctx.fillStyle =
        background;

    ctx.fillRect(
        0,
        0,
        WIDTH,
        HEIGHT
    );

    drawStars(ctx);
    drawMoon(ctx);

    // ========================================================
    // ANA PANEL
    // ========================================================

    ctx.fillStyle =
        "rgba(20,8,43,0.42)";

    roundRect(
        ctx,
        2,
        2,
        WIDTH - 4,
        HEIGHT - 4,
        12
    );

    ctx.fill();

    // ========================================================
    // AVATAR
    // ========================================================

    const avatar =
        await getAvatar(
            member.user
        );

    drawAvatar(
        ctx,
        avatar,
        62,
        65,
        105
    );

    // ========================================================
    // USERNAME
    // ========================================================

    const username =
        member.user.username
            .slice(0, 22);

    drawText(
        ctx,
        username,
        185,
        94,
        26,
        COLORS.white,
        "700"
    );

    drawText(
        ctx,
        "SHIZU XP PROFILE",
        185,
        122,
        13,
        COLORS.muted,
        "700"
    );

    // ========================================================
    // LEVEL
    // ========================================================

    const level =
        safeNumber(
            info.level,
            0
        );

    drawText(
        ctx,
        `LEVEL ${level}`,
        62,
        230,
        58,
        COLORS.white,
        "700"
    );

    // ========================================================
    // SERVER RANK
    // ========================================================

    drawText(
        ctx,
        `#${serverRank} SUNUCU SIRALAMASI`,
        65,
        265,
        17,
        COLORS.purpleLight,
        "700"
    );

    // ========================================================
    // XP
    // ========================================================

    const xpInLevel =
        safeNumber(
            info.xpInLevel,
            0
        );

    const xpRequired =
        Math.max(
            1,
            safeNumber(
                info.xpRequired,
                100
            )
        );

    let progress =
        safeNumber(
            info.progress,
            0
        );

    // Eğer manager progress vermediyse
    // burada yeniden hesapla.
    if (
        !Number.isFinite(progress) ||
        progress < 0 ||
        progress > 100
    ) {
        progress =
            (
                xpInLevel /
                xpRequired
            ) * 100;
    }

    progress =
        clamp(
            progress,
            0,
            100
        );

    const xpText =
        `${formatNumber(xpInLevel)} / ${formatNumber(xpRequired)} XP`;

    drawXPBar(
        ctx,
        62,
        300,
        690,
        16,
        progress
    );

    drawText(
        ctx,
        xpText,
        62,
        343,
        13,
        COLORS.muted,
        "700"
    );

    drawText(
        ctx,
        `${Math.round(progress)}%`,
        700,
        343,
        13,
        COLORS.muted,
        "700"
    );

    // ========================================================
    // SAĞ STATLAR
    // ========================================================

    const totalMessages =
        safeNumber(
            info.totalMessages,
            0
        );

    const voiceMinutes =
        safeNumber(
            info.voiceMinutes,
            0
        );

    const totalXP =
        safeNumber(
            info.xp,
            0
        );

    drawStatCard(
        ctx,
        790,
        135,
        250,
        70,
        "MESAJ",
        formatNumber(
            totalMessages
        )
    );

    drawStatCard(
        ctx,
        790,
        220,
        250,
        70,
        "SES",
        `${formatNumber(voiceMinutes)} dk`
    );

    drawStatCard(
        ctx,
        790,
        305,
        250,
        70,
        "TOPLAM XP",
        formatNumber(totalXP)
    );

    // ========================================================
    // SHIZU WATERMARK
    // ========================================================

    drawText(
        ctx,
        "SHIZU",
        975,
        395,
        15,
        COLORS.muted,
        "700"
    );

    // ========================================================
    // BORDER
    // ========================================================

    ctx.strokeStyle =
        "rgba(180,100,255,0.75)";

    ctx.lineWidth = 2;

    roundRect(
        ctx,
        2,
        2,
        WIDTH - 4,
        HEIGHT - 4,
        12
    );

    ctx.stroke();

    return canvas.encode("png");
}

// ============================================================
// COMMAND
// ============================================================

const data =
    new SlashCommandBuilder()
        .setName("rank")
        .setDescription(
            "Shizu XP rank kartını gösterir."
        )
        .addUserOption(
            option =>
                option
                    .setName("user")
                    .setDescription(
                        "Rankını görmek istediğin kullanıcı."
                    )
                    .setRequired(false)
        );

// ============================================================
// EXECUTE
// ============================================================

async function execute(
    interaction
) {
    try {
        if (!interaction.guild) {
            await interaction.reply({
                content:
                    "❌ Bu komut sadece sunucuda kullanılabilir.",
                ephemeral: true
            });

            return;
        }

        await interaction.deferReply();

        // Kullanıcı seçilmişse onu,
        // seçilmemişse komutu kullananı göster.
        const targetUser =
            interaction.options.getUser(
                "user"
            ) ||
            interaction.user;

        // Guild member
        let member;

        try {
            member =
                await interaction.guild.members.fetch(
                    targetUser.id
                );
        } catch {
            member =
                interaction.guild.members.cache.get(
                    targetUser.id
                );
        }

        if (!member) {
            await interaction.editReply({
                content:
                    "❌ Kullanıcı sunucuda bulunamadı."
            });

            return;
        }

        // ====================================================
        // RANK DATA
        // ====================================================

        const info =
            getRankInfo(
                interaction.guild.id,
                targetUser.id
            );

        // ====================================================
        // SERVER RANK
        // ====================================================

        const serverRank =
            await getServerRank(
                interaction.guild,
                targetUser.id,
                info.xp
            );

        // ====================================================
        // CANVAS
        // ====================================================

        const buffer =
            await createRankCard(
                member,
                info,
                serverRank
            );

        const attachment =
            new AttachmentBuilder(
                buffer,
                {
                    name:
                        "shizu-rank.png"
                }
            );

        // ====================================================
        // GÖNDER
        // ====================================================

        await interaction.editReply({
            files: [attachment]
        });

    } catch (error) {
        console.error(
            "Rank komutu hatası:",
            error
        );

        try {
            if (
                interaction.deferred ||
                interaction.replied
            ) {
                await interaction.editReply({
                    content:
                        "❌ Rank kartı oluşturulurken bir hata oluştu."
                });
            } else {
                await interaction.reply({
                    content:
                        "❌ Rank kartı oluşturulurken bir hata oluştu.",
                    ephemeral: true
                });
            }
        } catch {
            // Discord yanıtı artık mümkün değil
        }
    }
}

module.exports = {
    data,
    execute
};