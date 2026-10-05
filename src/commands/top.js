const {
    SlashCommandBuilder,
    AttachmentBuilder
} = require("discord.js");

const {
    createCanvas,
    loadImage
} = require("@napi-rs/canvas");

const db = require("../database");

// ============================================================
// SHIZU WEEKLY LEADERBOARD
// ============================================================

const WIDTH = 1200;
const HEIGHT = 720;

const PURPLE = "#a855f7";
const LIGHT_PURPLE = "#d8b4fe";
const WHITE = "#ffffff";
const MUTED = "#a99bc4";

// ============================================================
// SAFE
// ============================================================

function num(value, fallback = 0) {
    const n = Number(value);

    return Number.isFinite(n)
        ? n
        : fallback;
}

function formatNumber(value) {
    return num(value)
        .toLocaleString("tr-TR");
}

function formatTime(seconds) {
    seconds = Math.max(
        0,
        Math.floor(num(seconds))
    );

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(
        (seconds % 3600) / 60
    );

    if (hours > 0) {
        return `${hours} sa ${minutes} dk`;
    }

    return `${minutes} dk`;
}

// ============================================================
// ROUNDED RECT
// ============================================================

function roundedRect(
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

    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);

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

// ============================================================
// TEXT
// ============================================================

function text(
    ctx,
    value,
    x,
    y,
    size,
    color = WHITE,
    weight = "700"
) {
    ctx.font =
        `${weight} ${size}px Arial`;

    ctx.fillStyle = color;

    ctx.fillText(
        String(value),
        x,
        y
    );
}

// ============================================================
// CENTER TEXT
// ============================================================

function centerText(
    ctx,
    value,
    x,
    y,
    size,
    color = WHITE,
    weight = "700"
) {
    ctx.font =
        `${weight} ${size}px Arial`;

    ctx.fillStyle = color;

    ctx.textAlign = "center";

    ctx.fillText(
        String(value),
        x,
        y
    );

    ctx.textAlign = "left";
}

// ============================================================
// STARS
// ============================================================

function drawStars(ctx) {
    const stars = [
        [45, 35, 2],
        [110, 80, 1],
        [190, 40, 1],
        [270, 95, 2],
        [360, 45, 1],
        [440, 80, 2],
        [530, 30, 1],
        [610, 90, 1],
        [700, 42, 2],
        [790, 100, 1],
        [875, 45, 1],
        [960, 75, 2],
        [1060, 35, 1],
        [1140, 95, 2],

        [30, 260, 1],
        [120, 310, 2],
        [1120, 280, 1],
        [1160, 360, 2],

        [50, 600, 2],
        [180, 650, 1],
        [1020, 640, 1],
        [1140, 590, 2]
    ];

    for (const [x, y, size] of stars) {
        ctx.fillStyle =
            "rgba(255,255,255,0.75)";

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
// MOON
// ============================================================

function drawMoon(ctx) {
    const glow =
        ctx.createRadialGradient(
            1040,
            100,
            5,
            1040,
            100,
            150
        );

    glow.addColorStop(
        0,
        "rgba(168,85,247,0.45)"
    );

    glow.addColorStop(
        1,
        "rgba(168,85,247,0)"
    );

    ctx.fillStyle = glow;

    ctx.beginPath();

    ctx.arc(
        1040,
        100,
        150,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.fillStyle =
        "#d8b4fe";

    ctx.beginPath();

    ctx.arc(
        1040,
        100,
        58,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.fillStyle =
        "#120622";

    ctx.beginPath();

    ctx.arc(
        1067,
        82,
        57,
        0,
        Math.PI * 2
    );

    ctx.fill();
}

// ============================================================
// AVATAR
// ============================================================

async function loadAvatar(user) {
    try {
        const url =
            user.displayAvatarURL({
                extension: "png",
                size: 256,
                forceStatic: true
            });

        return await loadImage(url);

    } catch {
        return null;
    }
}

function drawAvatar(
    ctx,
    avatar,
    x,
    y,
    size,
    glow = PURPLE
) {
    ctx.save();

    ctx.shadowColor = glow;
    ctx.shadowBlur = 28;

    ctx.fillStyle = glow;

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
            "#28114b";

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
// MEDAL
// ============================================================

function medal(rank) {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";

    return `#${rank}`;
}

// ============================================================
// USER CARD
// ============================================================

function drawUserCard(
    ctx,
    item,
    rank,
    x,
    y,
    width,
    height,
    avatar
) {
    const isFirst = rank === 1;

    const cardGradient =
        ctx.createLinearGradient(
            x,
            y,
            x + width,
            y + height
        );

    if (rank === 1) {
        cardGradient.addColorStop(
            0,
            "rgba(126,58,180,0.62)"
        );

        cardGradient.addColorStop(
            1,
            "rgba(62,25,100,0.82)"
        );
    } else {
        cardGradient.addColorStop(
            0,
            "rgba(48,27,72,0.82)"
        );

        cardGradient.addColorStop(
            1,
            "rgba(27,13,44,0.92)"
        );
    }

    ctx.fillStyle = cardGradient;

    roundedRect(
        ctx,
        x,
        y,
        width,
        height,
        20
    );

    ctx.fill();

    ctx.strokeStyle =
        rank === 1
            ? "rgba(192,132,252,0.65)"
            : "rgba(168,85,247,0.22)";

    ctx.lineWidth =
        rank === 1
            ? 2
            : 1;

    roundedRect(
        ctx,
        x,
        y,
        width,
        height,
        20
    );

    ctx.stroke();

    // Rank

    centerText(
        ctx,
        medal(rank),
        x + 55,
        y + 58,
        rank <= 3 ? 28 : 20,
        rank === 1
            ? "#f5d76e"
            : WHITE
    );

    // Avatar

    drawAvatar(
        ctx,
        avatar,
        x + 90,
        y + 17,
        70,
        rank === 1
            ? "#c084fc"
            : PURPLE
    );

    // Username

    const username =
        item.member.user.username
            .slice(0, 18);

    text(
        ctx,
        username,
        x + 180,
        y + 39,
        20,
        WHITE
    );

    text(
        ctx,
        rank === 1
            ? "HAFTANIN LİDERİ"
            : "HAFTALIK AKTİVİTE",
        x + 180,
        y + 63,
        11,
        MUTED
    );

    // Message

    text(
        ctx,
        "💬",
        x + 410,
        y + 40,
        17,
        WHITE
    );

    text(
        ctx,
        formatNumber(
            item.chat_messages
        ),
        x + 438,
        y + 40,
        17,
        WHITE
    );

    text(
        ctx,
        "mesaj",
        x + 438,
        y + 61,
        10,
        MUTED
    );

    // Voice

    text(
        ctx,
        "🎙",
        x + 550,
        y + 40,
        17,
        WHITE
    );

    text(
        ctx,
        formatTime(
            item.voice_seconds
        ),
        x + 580,
        y + 40,
        17,
        WHITE
    );

    text(
        ctx,
        "ses",
        x + 580,
        y + 61,
        10,
        MUTED
    );

    // Score

    text(
        ctx,
        formatNumber(
            item.score
        ),
        x + width - 120,
        y + 43,
        21,
        rank === 1
            ? "#d8b4fe"
            : WHITE
    );

    text(
        ctx,
        "SKOR",
        x + width - 120,
        y + 63,
        9,
        MUTED
    );
}

// ============================================================
// DATA
// ============================================================

async function getLeaderboard(
    guild,
    weekKey,
    type
) {
    let list;

    if (type === "chat") {
        list =
            db.getChatLeaderboard(
                weekKey,
                guild.id,
                10
            );
    } else if (type === "voice") {
        list =
            db.getVoiceLeaderboard(
                weekKey,
                guild.id,
                10
            );
    } else {
        list =
            db.getOverallLeaderboard(
                weekKey,
                guild.id,
                10
            );
    }

    const result = [];

    for (const item of list) {
        try {
            const member =
                await guild.members.fetch(
                    item.userId
                );

            if (member.user.bot) {
                continue;
            }

            result.push({
                ...item,
                member
            });

        } catch {}
    }

    return result;
}

// ============================================================
// WEEK KEY
// ============================================================

function getWeekKey() {
    const now = new Date();

    const year =
        now.getUTCFullYear();

    const firstDay =
        new Date(
            Date.UTC(
                year,
                0,
                1
            )
        );

    const day =
        Math.floor(
            (
                now -
                firstDay
            ) /
            86400000
        );

    const week =
        Math.ceil(
            (day + firstDay.getUTCDay() + 1) /
            7
        );

    return `${year}-W${String(
        week
    ).padStart(2, "0")}`;
}

// ============================================================
// CREATE LEADERBOARD
// ============================================================

async function createLeaderboard(
    guild,
    list,
    type
) {
    const canvas =
        createCanvas(
            WIDTH,
            HEIGHT
        );

    const ctx =
        canvas.getContext("2d");

    // Background

    const bg =
        ctx.createLinearGradient(
            0,
            0,
            WIDTH,
            HEIGHT
        );

    bg.addColorStop(
        0,
        "#090312"
    );

    bg.addColorStop(
        0.45,
        "#17072f"
    );

    bg.addColorStop(
        1,
        "#421866"
    );

    ctx.fillStyle = bg;

    ctx.fillRect(
        0,
        0,
        WIDTH,
        HEIGHT
    );

    drawStars(ctx);
    drawMoon(ctx);

    // Border

    ctx.strokeStyle =
        "rgba(168,85,247,0.65)";

    ctx.lineWidth = 2;

    roundedRect(
        ctx,
        2,
        2,
        WIDTH - 4,
        HEIGHT - 4,
        18
    );

    ctx.stroke();

    // Header

    text(
        ctx,
        "⚔",
        55,
        70,
        32,
        "#c084fc"
    );

    text(
        ctx,
        "SHIZU",
        100,
        68,
        28,
        WHITE
    );

    text(
        ctx,
        "HAFTALIK SIRALAMA",
        100,
        93,
        12,
        MUTED
    );

    const title =
        type === "chat"
            ? "MESAJ AKTİVİTESİ"
            : type === "voice"
                ? "SES AKTİVİTESİ"
                : "GENEL AKTİVİTE";

    text(
        ctx,
        title,
        55,
        145,
        22,
        LIGHT_PURPLE
    );

    text(
        ctx,
        "Her Pazar 23:59 • İlk 3 özel rol",
        55,
        168,
        11,
        MUTED
    );

    // Empty

    if (!list.length) {
        roundedRect(
            ctx,
            55,
            215,
            1090,
            250,
            24
        );

        ctx.fillStyle =
            "rgba(45,22,65,0.72)";

        ctx.fill();

        centerText(
            ctx,
            "Bu hafta henüz aktivite verisi yok.",
            WIDTH / 2,
            330,
            24,
            WHITE
        );

        centerText(
            ctx,
            "İlk mesajı gönder ve SHIZU sıralamasına gir.",
            WIDTH / 2,
            370,
            14,
            MUTED
        );

        return canvas.encode("png");
    }

    // Load avatars

    for (let i = 0; i < list.length; i++) {
        list[i].avatar =
            await loadAvatar(
                list[i].member.user
            );
    }

    // Cards

    const cardX = 55;
    const cardWidth = 1090;
    const cardHeight = 64;
    const gap = 9;

    for (
        let i = 0;
        i < list.length;
        i++
    ) {
        const item = list[i];

        const rank = i + 1;

        const y =
            195 +
            i *
                (cardHeight + gap);

        drawUserCard(
            ctx,
            item,
            rank,
            cardX,
            y,
            cardWidth,
            cardHeight,
            item.avatar
        );
    }

    // Footer

    text(
        ctx,
        "SHIZU",
        55,
        694,
        12,
        MUTED
    );

    text(
        ctx,
        "Anime • Community • Activity",
        970,
        694,
        10,
        MUTED
    );

    return canvas.encode("png");
}

// ============================================================
// SLASH
// ============================================================

const data =
    new SlashCommandBuilder()
        .setName("top")
        .setDescription(
            "SHIZU haftalık aktivite sıralamasını gösterir."
        )
        .addStringOption(
            option =>
                option
                    .setName("type")
                    .setDescription(
                        "Sıralama türü."
                    )
                    .setRequired(false)
                    .addChoices(
                        {
                            name: "🏆 Genel",
                            value: "all"
                        },
                        {
                            name: "💬 Mesaj",
                            value: "chat"
                        },
                        {
                            name: "🎙️ Ses",
                            value: "voice"
                        }
                    )
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
                flags: 64
            });

            return;
        }

        await interaction.deferReply();

        const type =
            interaction.options.getString(
                "type"
            ) || "all";

        const weekKey =
            getWeekKey();

        const list =
            await getLeaderboard(
                interaction.guild,
                weekKey,
                type
            );

        const buffer =
            await createLeaderboard(
                interaction.guild,
                list,
                type
            );

        const attachment =
            new AttachmentBuilder(
                buffer,
                {
                    name:
                        "shizu-leaderboard.png"
                }
            );

        await interaction.editReply({
            files: [
                attachment
            ]
        });

    } catch (error) {
        console.error(
            "[TOP ERROR]",
            error
        );

        try {
            if (
                interaction.deferred ||
                interaction.replied
            ) {
                await interaction.editReply({
                    content:
                        "❌ Sıralama kartı oluşturulurken bir hata oluştu."
                });
            } else {
                await interaction.reply({
                    content:
                        "❌ Sıralama kartı oluşturulurken bir hata oluştu.",
                    flags: 64
                });
            }
        } catch {}
    }
}

// ============================================================
// EXPORT
// ============================================================

module.exports = {
    data,
    execute
};
