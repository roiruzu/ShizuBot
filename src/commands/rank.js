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
// SHIZU RANK CARD
// ============================================================

const WIDTH = 1100;
const HEIGHT = 420;

// ============================================================
// SAFE
// ============================================================

function num(value, fallback = 0) {
    const n = Number(value);

    return Number.isFinite(n)
        ? n
        : fallback;
}

function clamp(
    value,
    min,
    max
) {
    return Math.min(
        max,
        Math.max(
            min,
            value
        )
    );
}

function formatNumber(value) {
    return num(
        value,
        0
    ).toLocaleString("tr-TR");
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
    const r =
        Math.min(
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

// ============================================================
// TEXT
// ============================================================

function text(
    ctx,
    value,
    x,
    y,
    size,
    color,
    weight = "700"
) {
    ctx.font =
        `${weight} ${size}px Arial`;

    ctx.fillStyle =
        color;

    ctx.fillText(
        String(value),
        x,
        y
    );
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

        return await loadImage(
            url
        );

    } catch {
        return null;
    }
}

// ============================================================
// STARS
// ============================================================

function drawStars(ctx) {
    const stars = [
        [55, 42, 1],
        [125, 25, 2],
        [210, 55, 1],
        [300, 28, 2],
        [390, 62, 1],
        [475, 35, 2],
        [560, 72, 1],
        [655, 32, 2],
        [735, 80, 1],
        [810, 38, 2],
        [1010, 35, 1],
        [1050, 90, 2],
        [45, 150, 1],
        [265, 125, 1],
        [600, 140, 1],
        [750, 155, 2]
    ];

    for (
        const star of stars
    ) {
        const x = star[0];
        const y = star[1];
        const size = star[2];

        ctx.fillStyle =
            "rgba(255,255,255,0.8)";

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
            890,
            75,
            5,
            890,
            75,
            130
        );

    glow.addColorStop(
        0,
        "rgba(202,145,255,0.45)"
    );

    glow.addColorStop(
        1,
        "rgba(202,145,255,0)"
    );

    ctx.fillStyle =
        glow;

    ctx.beginPath();

    ctx.arc(
        890,
        75,
        130,
        0,
        Math.PI * 2
    );

    ctx.fill();

    // Ay
    ctx.fillStyle =
        "#d9a8ff";

    ctx.beginPath();

    ctx.arc(
        890,
        75,
        58,
        0,
        Math.PI * 2
    );

    ctx.fill();

    // Karartma
    ctx.fillStyle =
        "#11072a";

    ctx.beginPath();

    ctx.arc(
        915,
        58,
        57,
        0,
        Math.PI * 2
    );

    ctx.fill();
}

// ============================================================
// AVATAR
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
        "#a855f7";

    ctx.shadowBlur =
        25;

    ctx.fillStyle =
        "#a855f7";

    ctx.beginPath();

    ctx.arc(
        x + size / 2,
        y + size / 2,
        size / 2 + 6,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.shadowBlur = 0;

    // Clip
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
// STAT CARD
// ============================================================

function statCard(
    ctx,
    x,
    y,
    width,
    height,
    title,
    value
) {
    ctx.fillStyle =
        "rgba(75,39,115,0.72)";

    roundedRect(
        ctx,
        x,
        y,
        width,
        height,
        12
    );

    ctx.fill();

    text(
        ctx,
        title,
        x + 18,
        y + 23,
        10,
        "#a99bc4"
    );

    text(
        ctx,
        value,
        x + 18,
        y + 49,
        18,
        "#ffffff"
    );
}

// ============================================================
// XP BAR
// ============================================================

function xpBar(
    ctx,
    x,
    y,
    width,
    height,
    progress
) {
    const safeProgress =
        clamp(
            num(
                progress,
                0
            ),
            0,
            100
        );

    // Arka plan
    ctx.fillStyle =
        "#432663";

    roundedRect(
        ctx,
        x,
        y,
        width,
        height,
        8
    );

    ctx.fill();

    // Doluluk
    const fillWidth =
        width *
        (
            safeProgress /
            100
        );

    if (
        fillWidth > 0
    ) {
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
            "#d084ff"
        );

        ctx.fillStyle =
            gradient;

        roundedRect(
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
// SERVER RANK
// ============================================================

async function getServerRank(
    guild,
    userId
) {
    try {
        await guild.members.fetch();

        const list = [];

        for (
            const member of
            guild.members.cache.values()
        ) {
            if (
                member.user.bot
            ) {
                continue;
            }

            const user =
                getUser(
                    guild.id,
                    member.id
                ) || {};

            // ÖNEMLİ:
            // Yeni sistem chatXP kullanıyor.
            const xp =
                num(
                    user.chatXP ??
                    user.xp ??
                    0
                );

            list.push({
                id: member.id,
                xp
            });
        }

        list.sort(
            (a, b) =>
                b.xp - a.xp
        );

        const index =
            list.findIndex(
                item =>
                    item.id ===
                    userId
            );

        return index >= 0
            ? index + 1
            : 1;

    } catch {
        return 1;
    }
}

// ============================================================
// CREATE CARD
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
    // BACKGROUND
    // ========================================================

    const bg =
        ctx.createLinearGradient(
            0,
            0,
            WIDTH,
            HEIGHT
        );

    bg.addColorStop(
        0,
        "#0c051b"
    );

    bg.addColorStop(
        0.45,
        "#17072f"
    );

    bg.addColorStop(
        1,
        "#4a1f76"
    );

    ctx.fillStyle =
        bg;

    ctx.fillRect(
        0,
        0,
        WIDTH,
        HEIGHT
    );

    drawStars(ctx);
    drawMoon(ctx);

    // ========================================================
    // BORDER
    // ========================================================

    ctx.strokeStyle =
        "rgba(174,88,255,0.75)";

    ctx.lineWidth = 2;

    roundedRect(
        ctx,
        2,
        2,
        WIDTH - 4,
        HEIGHT - 4,
        10
    );

    ctx.stroke();

    // ========================================================
    // DATA
    // ========================================================

    const chatXP =
        num(
            info.chatXP ??
            info.xp ??
            0
        );

    const level =
        Math.max(
            0,
            Math.floor(
                num(
                    info.chatLevel ??
                    info.level ??
                    0
                )
            )
        );

    const currentLevelXP =
        num(
            info.currentLevelXP,
            0
        );

    const nextLevelXP =
        num(
            info.nextLevelXP,
            currentLevelXP + 100
        );

    const xpRequired =
        Math.max(
            1,
            nextLevelXP -
            currentLevelXP
        );

    const xpInLevel =
        Math.max(
            0,
            chatXP -
            currentLevelXP
        );

    let progress =
        (
            xpInLevel /
            xpRequired
        ) * 100;

    progress =
        clamp(
            progress,
            0,
            100
        );

    // ========================================================
    // AVATAR
    // ========================================================

    const avatar =
        await loadAvatar(
            member.user
        );

    drawAvatar(
        ctx,
        avatar,
        60,
        65,
        105
    );

    // ========================================================
    // USER
    // ========================================================

    text(
        ctx,
        member.user.username.slice(
            0,
            20
        ),
        185,
        96,
        26,
        "#ffffff"
    );

    text(
        ctx,
        "SHIZU XP PROFILE",
        185,
        123,
        13,
        "#a99bc4"
    );

    // ========================================================
    // LEVEL
    // ========================================================

    text(
        ctx,
        `LEVEL ${level}`,
        60,
        230,
        58,
        "#ffffff"
    );

    // ========================================================
    // SERVER RANK
    // ========================================================

    text(
        ctx,
        `#${serverRank} SUNUCU SIRALAMASI`,
        64,
        264,
        17,
        "#c084fc"
    );

    // ========================================================
    // XP BAR
    // ========================================================

    xpBar(
        ctx,
        60,
        300,
        690,
        17,
        progress
    );

    // ========================================================
    // XP TEXT
    // ========================================================

    text(
        ctx,
        `${formatNumber(xpInLevel)} / ${formatNumber(xpRequired)} XP`,
        60,
        344,
        13,
        "#aaa0bd"
    );

    text(
        ctx,
        `${Math.round(progress)}%`,
        700,
        344,
        13,
        "#aaa0bd"
    );

    // ========================================================
    // RIGHT STATS
    // ========================================================

    const messages =
        num(
            info.totalMessages,
            0
        );

    const voiceMinutes =
        num(
            info.voiceMinutes,
            0
        );

    statCard(
        ctx,
        790,
        135,
        250,
        70,
        "MESAJ",
        formatNumber(
            messages
        )
    );

    statCard(
        ctx,
        790,
        220,
        250,
        70,
        "SES",
        `${formatNumber(
            voiceMinutes
        )} dk`
    );

    statCard(
        ctx,
        790,
        305,
        250,
        70,
        "TOPLAM XP",
        formatNumber(
            chatXP
        )
    );

    // ========================================================
    // SHIZU
    // ========================================================

    text(
        ctx,
        "SHIZU",
        978,
        395,
        14,
        "#a99bc4"
    );

    return canvas.encode(
        "png"
    );
}

// ============================================================
// SLASH COMMAND
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
        if (
            !interaction.guild
        ) {
            await interaction.reply({
                content:
                    "❌ Bu komut sadece sunucuda kullanılabilir.",
                ephemeral: true
            });

            return;
        }

        await interaction.deferReply();

        // ====================================================
        // TARGET
        // ====================================================

        const target =
            interaction.options.getUser(
                "user"
            ) ||
            interaction.user;

        // ====================================================
        // MEMBER
        // ====================================================

        let member;

        try {
            member =
                await interaction.guild.members.fetch(
                    target.id
                );
        } catch {
            member =
                interaction.guild.members.cache.get(
                    target.id
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
        // RANK INFO
        // ====================================================

        const info =
            getRankInfo(
                interaction.guild.id,
                target.id
            );

        // ====================================================
        // SERVER RANK
        // ====================================================

        const serverRank =
            await getServerRank(
                interaction.guild,
                target.id
            );

        // ====================================================
        // CREATE PNG
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
        // SEND
        // ====================================================

        await interaction.editReply({
            files: [
                attachment
            ]
        });

    } catch (error) {
        console.error(
            "[RANK ERROR]",
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