const { EmbedBuilder, ChannelType } = require("discord.js");

const {
    getUser,
    addChatXP,
    addVoiceXP,
    getRequiredTotalXP,
    updateUser
} = require("./levelingStore");

const {
    getOrCreateLogChannel
} = require("./logChannel");

const logger = require("./logger");

// ============================================================
// SHIZU LEVEL SYSTEM
// ============================================================

const MESSAGE_MIN_XP = 15;
const MESSAGE_MAX_XP = 25;

const MESSAGE_COOLDOWN = 60 * 1000;

const VOICE_XP = 10;
const VOICE_INTERVAL = 60 * 1000;

// Level bildirim kanalı
const LEVEL_UP_CHANNEL_ID =
    "1556346871402860624";

// Mevcut level rolleri
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
// SAFE NUMBER
// ============================================================

function safeNumber(value, fallback = 0) {
    const n = Number(value);

    return Number.isFinite(n)
        ? n
        : fallback;
}

// ============================================================
// XP REQUIREMENT
// ============================================================

function safeRequiredXP(level) {
    const safeLevel = Math.max(
        0,
        Math.floor(
            safeNumber(level, 0)
        )
    );

    const required = safeNumber(
        getRequiredTotalXP(safeLevel),
        0
    );

    return Math.max(
        0,
        required
    );
}

// ============================================================
// RANDOM XP
// ============================================================

function randomXP(min, max) {
    const minimum =
        Math.floor(
            safeNumber(min, 0)
        );

    const maximum =
        Math.floor(
            safeNumber(max, minimum)
        );

    if (maximum <= minimum) {
        return minimum;
    }

    return Math.floor(
        Math.random() *
        (maximum - minimum + 1)
    ) + minimum;
}

// ============================================================
// GET CHAT DATA
// ============================================================

function getChatData(guildId, userId) {
    const user =
        getUser(
            guildId,
            userId
        ) || {};

    const chatXP = Math.max(
        0,
        safeNumber(
            user.chatXP ??
            user.xp ??
            0,
            0
        )
    );

    const chatLevel = Math.max(
        0,
        Math.floor(
            safeNumber(
                user.chatLevel ??
                user.level ??
                0,
                0
            )
        )
    );

    return {
        user,
        chatXP,
        chatLevel
    };
}

// ============================================================
// GET VOICE DATA
// ============================================================

function getVoiceData(guildId, userId) {
    const user =
        getUser(
            guildId,
            userId
        ) || {};

    const voiceXP = Math.max(
        0,
        safeNumber(
            user.voiceXP,
            0
        )
    );

    const voiceLevel = Math.max(
        0,
        Math.floor(
            safeNumber(
                user.voiceLevel,
                0
            )
        )
    );

    return {
        user,
        voiceXP,
        voiceLevel
    };
}

// ============================================================
// MESSAGE XP
// ============================================================

async function handleMessageXP(message) {
    try {
        if (!message?.guild) {
            return;
        }

        if (!message.author) {
            return;
        }

        if (message.author.bot) {
            return;
        }

        const content =
            String(
                message.content || ""
            )
                .trim();

        if (
            !content ||
            content.length < 2
        ) {
            return;
        }

        const guildId =
            message.guild.id;

        const userId =
            message.author.id;

        const current =
            getChatData(
                guildId,
                userId
            );

        const now =
            Date.now();

        // ====================================================
        // COOLDOWN
        // ====================================================

        const lastMessageXP =
            safeNumber(
                current.user.lastMessageXP,
                0
            );

        if (
            lastMessageXP > 0 &&
            now - lastMessageXP <
                MESSAGE_COOLDOWN
        ) {
            return;
        }

        // ====================================================
        // XP
        // ====================================================

        const amount =
            randomXP(
                MESSAGE_MIN_XP,
                MESSAGE_MAX_XP
            );

        const result =
            addChatXP(
                guildId,
                userId,
                amount
            );

        if (!result) {
            logger.warn(
                "addChatXP() sonuç döndürmedi."
            );

            return;
        }

        updateUser(
            guildId,
            userId,
            {
                lastMessageXP: now,

                totalMessages:
                    safeNumber(
                        current.user.totalMessages,
                        0
                    ) + 1
            }
        );

        logger.debug(
            `${message.author.tag} +${amount} CHAT XP`
        );

        // ====================================================
        // LEVEL UP
        // ====================================================

        if (result.leveledUp) {
            await handleLevelUp(
                message.guild,
                message.member,
                "chat",
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
// VOICE XP
// ============================================================

async function handleVoiceXP(client) {
    if (!client) {
        return;
    }

    for (
        const guild of client.guilds.cache.values()
    ) {
        try {
            const channels =
                guild.channels.cache.filter(
                    channel =>
                        channel.type ===
                            ChannelType.GuildVoice ||
                        channel.type ===
                            ChannelType.GuildStageVoice
                );

            for (
                const channel of channels.values()
            ) {
                // AFK kanalı
                if (
                    guild.afkChannelId ===
                    channel.id
                ) {
                    continue;
                }

                // Tek kişi = XP yok
                if (
                    channel.members.size < 2
                ) {
                    continue;
                }

                for (
                    const member of
                    channel.members.values()
                ) {
                    if (
                        member.user.bot
                    ) {
                        continue;
                    }

                    if (
                        !member.voice.channelId
                    ) {
                        continue;
                    }

                    // Mikrofon kapalı
                    if (
                        member.voice.selfMute
                    ) {
                        continue;
                    }

                    // Kullanıcı deaf
                    if (
                        member.voice.selfDeaf
                    ) {
                        continue;
                    }

                    // Sunucu mute
                    if (
                        member.voice.serverMute
                    ) {
                        continue;
                    }

                    // Sunucu deaf
                    if (
                        member.voice.serverDeaf
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
                        ) || {};

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
                        addVoiceXP(
                            guildId,
                            userId,
                            VOICE_XP
                        );

                    if (!result) {
                        continue;
                    }

                    updateUser(
                        guildId,
                        userId,
                        {
                            lastVoiceXP: now,

                            voiceMinutes:
                                safeNumber(
                                    user.voiceMinutes,
                                    0
                                ) + 1
                        }
                    );

                    logger.debug(
                        `${member.user.tag} +${VOICE_XP} VOICE XP`
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
                            "voice",
                            result.oldLevel,
                            result.newLevel
                        );
                    }
                }
            }

        } catch (error) {
            logger.error(
                `Voice XP hatası (${guild.name}): ${error.message}`
            );
        }
    }
}

// ============================================================
// LEVEL ROLE
// ============================================================

async function updateLevelRole(
    guild,
    member,
    level
) {
    try {
        if (!guild || !member) {
            return;
        }

        const levels =
            Object.keys(
                LEVEL_ROLES
            )
                .map(Number)
                .sort(
                    (a, b) => a - b
                );

        let highestLevel = null;

        for (
            const requiredLevel of levels
        ) {
            if (
                level >= requiredLevel
            ) {
                highestLevel =
                    requiredLevel;
            }
        }

        if (
            highestLevel === null
        ) {
            return;
        }

        const roleName =
            LEVEL_ROLES[
                highestLevel
            ];

        const role =
            guild.roles.cache.find(
                r =>
                    r.name ===
                    roleName
            );

        if (!role) {
            return;
        }

        const me =
            guild.members.me;

        if (!me) {
            return;
        }

        if (
            role.position >=
            me.roles.highest.position
        ) {
            logger.warn(
                `Bot ${roleName} rolünü veremiyor.`
            );

            return;
        }

        // Eski level rollerini kaldır
        for (
            const oldLevel of levels
        ) {
            const oldRole =
                guild.roles.cache.find(
                    r =>
                        r.name ===
                        LEVEL_ROLES[
                            oldLevel
                        ]
                );

            if (
                oldRole &&
                member.roles.cache.has(
                    oldRole.id
                ) &&
                oldRole.id !== role.id
            ) {
                try {
                    await member.roles.remove(
                        oldRole
                    );
                } catch {}
            }
        }

        if (
            !member.roles.cache.has(
                role.id
            )
        ) {
            await member.roles.add(
                role
            );
        }

    } catch (error) {
        logger.error(
            `Level rolü hatası: ${error.message}`
        );
    }
}

// ============================================================
// LEVEL UP
// ============================================================

async function handleLevelUp(
    guild,
    member,
    type,
    oldLevel,
    newLevel
) {
    try {
        if (!guild || !member) {
            return;
        }

        const safeOld =
            safeNumber(
                oldLevel,
                0
            );

        const safeNew =
            safeNumber(
                newLevel,
                0
            );

        const isVoice =
            type === "voice";

        // ====================================================
        // ROLE
        // ====================================================

        // Chat / voice rolleri ayrı sistemlerdeyse
        // burada sadece klasik level rolü uygulanıyor.
        await updateLevelRole(
            guild,
            member,
            safeNew
        );

        // ====================================================
        // CHANNEL
        // ====================================================

        let channel =
            guild.channels.cache.get(
                LEVEL_UP_CHANNEL_ID
            );

        if (!channel) {
            try {
                channel =
                    await guild.channels.fetch(
                        LEVEL_UP_CHANNEL_ID
                    );
            } catch {}
        }

        if (
            channel &&
            channel.isTextBased()
        ) {
            const me =
                guild.members.me;

            if (
                me &&
                channel
                    .permissionsFor(me)
                    ?.has("ViewChannel") &&
                channel
                    .permissionsFor(me)
                    ?.has("SendMessages")
            ) {
                const embed =
                    new EmbedBuilder()
                        .setColor(
                            isVoice
                                ? 0x22d3ee
                                : 0xa855f7
                        )
                        .setAuthor({
                            name:
                                "SHIZU LEVEL SYSTEM"
                        })
                        .setTitle(
                            isVoice
                                ? "🎧 SESLİ LEVEL ATLANDI!"
                                : "✨ CHAT LEVEL ATLANDI!"
                        )
                        .setDescription(
                            `${member}\n\n` +
                            `**LEVEL ${safeOld}**  →  **LEVEL ${safeNew}**`
                        )
                        .addFields(
                            {
                                name:
                                    isVoice
                                        ? "🎧 Sistem"
                                        : "💬 Sistem",
                                value:
                                    isVoice
                                        ? "Sesli XP"
                                        : "Chat XP",
                                inline: true
                            },
                            {
                                name:
                                    "🚀 Yeni Level",
                                value:
                                    `**${safeNew}**`,
                                inline: true
                            }
                        )
                        .setThumbnail(
                            member.user.displayAvatarURL({
                                extension: "png",
                                size: 128
                            })
                        )
                        .setFooter({
                            text:
                                "SHIZU • XP SYSTEM"
                        })
                        .setTimestamp();

                await channel.send({
                    embeds: [embed]
                });

                logger.info(
                    `Level bildirimi gönderildi: ${member.user.tag} -> ${safeNew}`
                );
            }
        }

        // ====================================================
        // LOG
        // ====================================================

        try {
            const logChannel =
                await getOrCreateLogChannel(
                    guild
                );

            if (
                logChannel &&
                logChannel.isTextBased()
            ) {
                await logChannel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xa855f7)
                            .setTitle(
                                "📈 LEVEL UP"
                            )
                            .setDescription(
                                `${member} **Level ${safeNew}** oldu.`
                            )
                            .addFields(
                                {
                                    name:
                                        "Sistem",
                                    value:
                                        isVoice
                                            ? "Sesli"
                                            : "Chat",
                                    inline: true
                                },
                                {
                                    name:
                                        "Eski",
                                    value:
                                        `${safeOld}`,
                                    inline: true
                                },
                                {
                                    name:
                                        "Yeni",
                                    value:
                                        `${safeNew}`,
                                    inline: true
                                }
                            )
                            .setTimestamp()
                    ]
                });
            }
        } catch {}

    } catch (error) {
        logger.error(
            `handleLevelUp hatası: ${error.message}`
        );
    }
}

// ============================================================
// RANK INFO
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
    // CHAT XP
    // ========================================================

    const chatXP =
        Math.max(
            0,
            safeNumber(
                user.chatXP ??
                user.xp ??
                0
            )
        );

    const chatLevel =
        Math.max(
            0,
            Math.floor(
                safeNumber(
                    user.chatLevel ??
                    user.level ??
                    0
                )
            )
        );

    // ========================================================
    // CHAT XP LIMIT
    // ========================================================

    const currentLevelXP =
        safeRequiredXP(
            chatLevel
        );

    let nextLevelXP =
        safeRequiredXP(
            chatLevel + 1
        );

    if (
        nextLevelXP <=
        currentLevelXP
    ) {
        nextLevelXP =
            currentLevelXP + 100;
    }

    // ========================================================
    // XP INSIDE LEVEL
    // ========================================================

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

    const xpNeeded =
        Math.max(
            0,
            nextLevelXP -
            chatXP
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
        !Number.isFinite(
            progress
        )
    ) {
        progress = 0;
    }

    progress =
        Math.round(
            Math.min(
                100,
                Math.max(
                    0,
                    progress
                )
            )
        );

    // ========================================================
    // VOICE
    // ========================================================

    const voiceXP =
        Math.max(
            0,
            safeNumber(
                user.voiceXP,
                0
            )
        );

    const voiceLevel =
        Math.max(
            0,
            Math.floor(
                safeNumber(
                    user.voiceLevel,
                    0
                )
            )
        );

    // ========================================================
    // RETURN
    // ========================================================

    return {
        ...user,

        // CHAT
        chatXP,
        chatLevel,

        // Eski uyumluluk
        xp: chatXP,
        level: chatLevel,

        // XP hesapları
        currentLevelXP,
        nextLevelXP,
        xpInLevel,
        xpRequired,
        xpNeeded,

        // Alternatif isimler
        currentXP:
            xpInLevel,

        requiredXP:
            xpRequired,

        remainingXP:
            xpNeeded,

        // Progress
        progress,

        progressPercent:
            progress,

        percentage:
            progress,

        // VOICE
        voiceXP,
        voiceLevel,

        // Stats
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