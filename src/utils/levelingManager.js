const {
    EmbedBuilder,
    ChannelType
} = require("discord.js");

const {
    getUser,
    updateUser,
    addXP,
    getRequiredTotalXP
} = require("./levelingStore");

const {
    getOrCreateLogChannel
} = require("./logChannel");

const logger = require("./logger");

// ============================================================
// AYARLAR
// ============================================================

const MESSAGE_MIN_XP = 15;
const MESSAGE_MAX_XP = 25;

// Aynı kullanıcıya 60 saniyede bir mesaj XP'si
const MESSAGE_COOLDOWN = 60 * 1000;

// Voice XP
const VOICE_XP = 10;
const VOICE_INTERVAL = 60 * 1000;

// Level rolleri
const LEVEL_ROLES = {
    5: "Level 5",
    10: "Level 10",
    20: "Level 20",
    30: "Level 30",
    50: "Level 50",
    75: "Level 75",
    100: "Level 100"
};

// ============================================================
// SAYI GÜVENLİK
// ============================================================

function safeNumber(value, fallback = 0) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return fallback;
    }

    return number;
}

// ============================================================
// XP GEREKSİNİMİ
// ============================================================

function getSafeRequiredXP(level) {
    const safeLevel = Math.max(
        0,
        Math.floor(safeNumber(level, 0))
    );

    const required = safeNumber(
        getRequiredTotalXP(safeLevel),
        0
    );

    return Math.max(0, required);
}

// ============================================================
// RANDOM XP
// ============================================================

function randomXP(min, max) {
    const safeMin = Math.floor(
        safeNumber(min, 0)
    );

    const safeMax = Math.floor(
        safeNumber(max, safeMin)
    );

    if (safeMax <= safeMin) {
        return safeMin;
    }

    return Math.floor(
        Math.random() *
        (safeMax - safeMin + 1)
    ) + safeMin;
}

// ============================================================
// MESAJ XP
// ============================================================

async function handleMessageXP(message) {
    try {
        if (!message) {
            return;
        }

        if (!message.guild) {
            return;
        }

        if (!message.author) {
            return;
        }

        if (message.author.bot) {
            return;
        }

        // Boş / anlamsız mesajlardan XP verme
        const content = String(
            message.content || ""
        )
            .replace(/\s+/g, "")
            .trim();

        if (!content) {
            return;
        }

        if (content.length < 2) {
            return;
        }

        const guildId = message.guild.id;
        const userId = message.author.id;

        const user = getUser(
            guildId,
            userId
        );

        const now = Date.now();

        // ====================================================
        // COOLDOWN
        // ====================================================

        const lastMessageXP = safeNumber(
            user.lastMessageXP,
            0
        );

        if (
            lastMessageXP > 0 &&
            now - lastMessageXP < MESSAGE_COOLDOWN
        ) {
            return;
        }

        // ====================================================
        // XP
        // ====================================================

        const xp = randomXP(
            MESSAGE_MIN_XP,
            MESSAGE_MAX_XP
        );

        const result = addXP(
            guildId,
            userId,
            xp
        );

        if (!result) {
            logger.warn(
                `XP sonucu alınamadı: ${message.author.tag}`
            );

            return;
        }

        // ====================================================
        // MESAJ İSTATİSTİĞİ
        // ====================================================

        const currentMessages = safeNumber(
            result.totalMessages,
            safeNumber(user.totalMessages, 0)
        );

        updateUser(
            guildId,
            userId,
            {
                totalMessages:
                    currentMessages + 1,

                lastMessageXP: now
            }
        );

        logger.debug(
            `${message.author.tag} +${xp} XP aldı.`
        );

        // ====================================================
        // LEVEL UP
        // ====================================================

        if (result.leveledUp) {
            await handleLevelUp(
                message.guild,
                message.member,
                result.oldLevel,
                result.newLevel
            );
        }

    } catch (error) {
        logger.error(
            `Message XP hatası: ${error.message}`
        );

        logger.error(error);
    }
}

// ============================================================
// LEVEL UP
// ============================================================

async function handleLevelUp(
    guild,
    member,
    oldLevel,
    newLevel
) {
    try {
        if (!guild || !member) {
            return;
        }

        const safeOldLevel = safeNumber(
            oldLevel,
            0
        );

        const safeNewLevel = safeNumber(
            newLevel,
            0
        );

        logger.info(
            `${member.user.tag} Level ${safeNewLevel} oldu.`
        );

        // ====================================================
        // LEVEL ROLÜ
        // ====================================================

        const roleName =
            LEVEL_ROLES[safeNewLevel];

        if (roleName) {
            let role =
                guild.roles.cache.find(
                    r => r.name === roleName
                );

            // Rol yoksa oluştur
            if (!role) {
                try {
                    role =
                        await guild.roles.create({
                            name: roleName,
                            reason:
                                `Shizu XP sistemi - Level ${safeNewLevel}`
                        });

                    logger.info(
                        `Yeni level rolü oluşturuldu: ${roleName}`
                    );

                } catch (error) {
                    logger.error(
                        `Level rolü oluşturulamadı: ${error.message}`
                    );
                }
            }

            // =================================================
            // ROLE VER
            // =================================================

            if (
                role &&
                guild.members.me &&
                role.position <
                    guild.members.me.roles.highest.position
            ) {
                try {
                    await member.roles.add(
                        role,
                        `Level ${safeNewLevel} ödülü`
                    );

                    logger.info(
                        `${member.user.tag} kullanıcısına ${roleName} verildi.`
                    );

                } catch (error) {
                    logger.error(
                        `Level rolü verilemedi: ${error.message}`
                    );
                }
            }
        }

        // ====================================================
        // LEVEL UP DM
        // ====================================================

        try {
            const embed =
                new EmbedBuilder()
                    .setColor(0x8b5cf6)
                    .setTitle(
                        "✨ LEVEL ATLADIN!"
                    )
                    .setDescription(
                        `Tebrikler **${member.user.username}**!\n\n` +
                        `🌌 Yeni seviyen: **Level ${safeNewLevel}**\n\n` +
                        `Shizu ile gelişmeye devam et. 💜`
                    )
                    .addFields(
                        {
                            name: "Önceki Level",
                            value:
                                `**${safeOldLevel}**`,
                            inline: true
                        },
                        {
                            name: "Yeni Level",
                            value:
                                `**${safeNewLevel}**`,
                            inline: true
                        }
                    )
                    .setTimestamp();

            await member.send({
                embeds: [embed]
            });

        } catch {
            // DM kapalıysa devam
        }

        // ====================================================
        // LOG KANALI
        // ====================================================

        try {
            const logChannel =
                await getOrCreateLogChannel(
                    guild
                );

            if (logChannel) {
                const logEmbed =
                    new EmbedBuilder()
                        .setColor(0x8b5cf6)
                        .setTitle(
                            "✨ LEVEL ATLANDI"
                        )
                        .addFields(
                            {
                                name: "👤 Kullanıcı",
                                value:
                                    `${member} (${member.user.tag})`,
                                inline: true
                            },
                            {
                                name: "📊 Eski Level",
                                value:
                                    `${safeOldLevel}`,
                                inline: true
                            },
                            {
                                name: "🚀 Yeni Level",
                                value:
                                    `${safeNewLevel}`,
                                inline: true
                            }
                        )
                        .setTimestamp();

                await logChannel.send({
                    embeds: [logEmbed]
                });
            }

        } catch (error) {
            logger.error(
                `Level log gönderilemedi: ${error.message}`
            );
        }

    } catch (error) {
        logger.error(
            `Level up hatası: ${error.message}`
        );

        logger.error(error);
    }
}

// ============================================================
// VOICE XP
// ============================================================

async function handleVoiceXP(client) {
    if (!client) {
        return;
    }

    if (!client.guilds) {
        return;
    }

    for (
        const guild of client.guilds.cache.values()
    ) {
        try {
            const voiceChannels =
                guild.channels.cache.filter(
                    channel =>
                        channel.type ===
                            ChannelType.GuildVoice ||
                        channel.type ===
                            ChannelType.GuildStageVoice
                );

            for (
                const channel of voiceChannels.values()
            ) {
                // AFK kanalında XP yok
                if (
                    guild.afkChannelId ===
                    channel.id
                ) {
                    continue;
                }

                for (
                    const member of
                    channel.members.values()
                ) {
                    // Bot
                    if (member.user.bot) {
                        continue;
                    }

                    // Voice'ta değil
                    if (!member.voice.channelId) {
                        continue;
                    }

                    // Mikrofon kapalı
                    if (member.voice.selfMute) {
                        continue;
                    }

                    // Kullanıcı deaf
                    if (member.voice.selfDeaf) {
                        continue;
                    }

                    // Server mute
                    if (member.voice.serverMute) {
                        continue;
                    }

                    // Server deaf
                    if (member.voice.serverDeaf) {
                        continue;
                    }

                    // Tek başına kanalda ise XP yok
                    if (
                        channel.members.size < 2
                    ) {
                        continue;
                    }

                    const guildId =
                        guild.id;

                    const userId =
                        member.id;

                    const user =
                        getUser(
                            guildId,
                            userId
                        );

                    const now =
                        Date.now();

                    const lastVoiceXP =
                        safeNumber(
                            user.lastVoiceXP,
                            0
                        );

                    if (
                        lastVoiceXP > 0 &&
                        now - lastVoiceXP <
                            VOICE_INTERVAL
                    ) {
                        continue;
                    }

                    // =================================================
                    // VOICE XP
                    // =================================================

                    const result =
                        addXP(
                            guildId,
                            userId,
                            VOICE_XP
                        );

                    if (!result) {
                        continue;
                    }

                    const currentMinutes =
                        safeNumber(
                            result.voiceMinutes,
                            safeNumber(
                                user.voiceMinutes,
                                0
                            )
                        );

                    updateUser(
                        guildId,
                        userId,
                        {
                            voiceMinutes:
                                currentMinutes + 1,

                            lastVoiceXP:
                                now
                        }
                    );

                    logger.debug(
                        `${member.user.tag} voice XP aldı: +${VOICE_XP}`
                    );

                    // =================================================
                    // VOICE LEVEL UP
                    // =================================================

                    if (
                        result.leveledUp
                    ) {
                        await handleLevelUp(
                            guild,
                            member,
                            result.oldLevel,
                            result.newLevel
                        );
                    }
                }
            }

        } catch (error) {
            logger.error(
                `Voice XP sunucu hatası (${guild.name}): ${error.message}`
            );
        }
    }
}

// ============================================================
// RANK BİLGİSİ
// ============================================================

function getRankInfo(
    guildId,
    userId
) {
    const user =
        getUser(
            guildId,
            userId
        ) || {};

    // ========================================================
    // TEMEL DEĞERLER
    // ========================================================

    const totalXP =
        Math.max(
            0,
            safeNumber(
                user.xp,
                0
            )
        );

    const level =
        Math.max(
            0,
            Math.floor(
                safeNumber(
                    user.level,
                    0
                )
            )
        );

    // ========================================================
    // LEVEL XP SINIRLARI
    // ========================================================

    let currentLevelXP =
        getSafeRequiredXP(
            level
        );

    let nextLevelXP =
        getSafeRequiredXP(
            level + 1
        );

    // Bozuk/ters değer koruması
    if (
        nextLevelXP <= currentLevelXP
    ) {
        nextLevelXP =
            currentLevelXP + 100;
    }

    // ========================================================
    // BU LEVELDE KAZANILAN XP
    // ========================================================

    let xpInLevel =
        totalXP -
        currentLevelXP;

    if (
        !Number.isFinite(xpInLevel)
    ) {
        xpInLevel = 0;
    }

    xpInLevel =
        Math.max(
            0,
            xpInLevel
        );

    // ========================================================
    // BU LEVELİN TOPLAM XP İHTİYACI
    // ========================================================

    let xpRequired =
        nextLevelXP -
        currentLevelXP;

    if (
        !Number.isFinite(xpRequired) ||
        xpRequired <= 0
    ) {
        xpRequired = 100;
    }

    // ========================================================
    // SONRAKİ LEVEL'E KALAN XP
    // ========================================================

    let xpNeeded =
        nextLevelXP -
        totalXP;

    if (
        !Number.isFinite(xpNeeded)
    ) {
        xpNeeded = xpRequired;
    }

    xpNeeded =
        Math.max(
            0,
            xpNeeded
        );

    // ========================================================
    // PROGRESS
    // ========================================================

    let progress =
        (
            xpInLevel /
            xpRequired
        ) * 100;

    if (
        !Number.isFinite(progress)
    ) {
        progress = 0;
    }

    progress =
        Math.min(
            100,
            Math.max(
                0,
                progress
            )
        );

    progress =
        Math.round(
            progress
        );

    // ========================================================
    // PROGRESS BAR
    // ========================================================

    const BAR_LENGTH = 12;

    const filled =
        Math.round(
            BAR_LENGTH *
            (progress / 100)
        );

    const empty =
        Math.max(
            0,
            BAR_LENGTH -
            filled
        );

    const progressBar =
        "■".repeat(filled) +
        "□".repeat(empty);

    // ========================================================
    // GERİYE DÖNÜK UYUMLULUK
    // ========================================================

    return {
        ...user,

        // Temel
        level,
        xp: totalXP,

        // Level sınırları
        currentLevelXP,
        nextLevelXP,

        // Bu level
        xpInLevel,
        xpRequired,

        // Sonraki level
        xpNeeded,

        // Alternatif isimler
        currentXP:
            xpInLevel,

        requiredXP:
            xpRequired,

        levelXP:
            xpInLevel,

        levelXPRequired:
            xpRequired,

        remainingXP:
            xpNeeded,

        xpRemaining:
            xpNeeded,

        // Yüzde
        progress,

        progressPercent:
            progress,

        percentage:
            progress,

        // Görsel bar
        progressBar,

        // Kullanıcı istatistikleri
        totalMessages:
            safeNumber(
                user.totalMessages,
                0
            ),

        voiceMinutes:
            safeNumber(
                user.voiceMinutes,
                0
            )
    };
}

// ============================================================
// EXPORT
// ============================================================

module.exports = {
    handleMessageXP,
    handleVoiceXP,
    handleLevelUp,
    getRankInfo,
    LEVEL_ROLES
};