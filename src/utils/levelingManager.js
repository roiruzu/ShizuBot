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
const MESSAGE_COOLDOWN = 60 * 1000;

const VOICE_XP = 10;
const VOICE_INTERVAL = 60 * 1000;

// Level-up bildirim kanalı
const LEVEL_UP_CHANNEL_ID = "1556346871402860624";

// ============================================================
// MEVCUT ROL SİSTEMİ
// ============================================================
//
// ÖNEMLİ:
// Bot burada kesinlikle yeni rol oluşturmaz.
//
// Sunucuda zaten bulunan roller:
//
// Chat + [1]
// Chat + [5]
// Chat + [10]
// Chat + [15]
// Chat + [20]
// Chat + [25]
// Chat + [30]
// Chat + [40]
// Chat + [50]
// Chat + [60]
// Chat + [70]
// Chat + [80]
// Chat + [90]
// Chat + [100]
//
// Sesli + [1]
// Sesli + [5]
// Sesli + [10]
// Sesli + [15]
// Sesli + [20]
// Sesli + [25]
// Sesli + [30]
// Sesli + [40]
// Sesli + [50]
// Sesli + [60]
// Sesli + [70]
// Sesli + [80]
// Sesli + [90]
// Sesli + [100]
//
// ============================================================

const LEVEL_ROLE_LEVELS = [
    1,
    5,
    10,
    15,
    20,
    25,
    30,
    40,
    50,
    60,
    70,
    80,
    90,
    100
];

// Eski LEVEL_ROLES export'u başka dosyalarda kullanılıyorsa
// hata vermemesi için korunuyor.
const LEVEL_ROLES = {};

// ============================================================
// RANDOM XP
// ============================================================

function randomXP(min, max) {
    return Math.floor(
        Math.random() * (max - min + 1)
    ) + min;
}

// ============================================================
// SEVİYEYE UYGUN ROLÜ BUL
// ============================================================

function getHighestRoleLevel(level) {

    let highest = null;

    for (const roleLevel of LEVEL_ROLE_LEVELS) {

        if (level >= roleLevel) {
            highest = roleLevel;
        }
    }

    return highest;
}

// ============================================================
// KULLANICIYA CHAT + [X] VE SESLİ + [X] ROLÜ VER
// ============================================================

async function updateLevelRoles(
    guild,
    member,
    level
) {

    try {

        if (!guild || !member) {
            return;
        }

        const botMember = guild.members.me;

        if (!botMember) {
            logger.warn(
                "Bot üyesi bulunamadı, level rolü verilemedi."
            );
            return;
        }

        const highestRoleLevel =
            getHighestRoleLevel(level);

        if (!highestRoleLevel) {
            return;
        }

        const targetChatRoleName =
            `Chat + [${highestRoleLevel}]`;

        const targetVoiceRoleName =
            `Sesli + [${highestRoleLevel}]`;

        // ====================================================
        // HEDEF ROLLERİ BUL
        // ====================================================

        const targetChatRole =
            guild.roles.cache.find(
                role =>
                    role.name === targetChatRoleName
            );

        const targetVoiceRole =
            guild.roles.cache.find(
                role =>
                    role.name === targetVoiceRoleName
            );

        // ====================================================
        // BOTUN YETKİSİNİ KONTROL ET
        // ====================================================

        if (
            targetChatRole &&
            targetChatRole.position >=
            botMember.roles.highest.position
        ) {

            logger.warn(
                `${targetChatRoleName} rolü botun üstünde veya aynı seviyede.`
            );
        }

        if (
            targetVoiceRole &&
            targetVoiceRole.position >=
            botMember.roles.highest.position
        ) {

            logger.warn(
                `${targetVoiceRoleName} rolü botun üstünde veya aynı seviyede.`
            );
        }

        // ====================================================
        // ESKİ CHAT ROLLERİNİ BUL
        // ====================================================

        const oldChatRoles =
            member.roles.cache.filter(
                role =>
                    /^Chat \+ \[\d+\]$/i.test(
                        role.name
                    ) &&
                    role.name !== targetChatRoleName
            );

        // ====================================================
        // ESKİ SESLİ ROLLERİNİ BUL
        // ====================================================

        const oldVoiceRoles =
            member.roles.cache.filter(
                role =>
                    /^Sesli \+ \[\d+\]$/i.test(
                        role.name
                    ) &&
                    role.name !== targetVoiceRoleName
            );

        // ====================================================
        // ESKİ CHAT ROLLERİNİ KALDIR
        // ====================================================

        for (const role of oldChatRoles.values()) {

            if (
                role.position >=
                botMember.roles.highest.position
            ) {
                continue;
            }

            try {

                await member.roles.remove(
                    role,
                    `Shizu XP - Level ${level} Chat rolü güncellendi`
                );

                logger.info(
                    `${member.user.tag} kullanıcısından ${role.name} kaldırıldı.`
                );

            } catch (error) {

                logger.error(
                    `${role.name} kaldırılamadı: ${error.message}`
                );
            }
        }

        // ====================================================
        // ESKİ SESLİ ROLLERİNİ KALDIR
        // ====================================================

        for (const role of oldVoiceRoles.values()) {

            if (
                role.position >=
                botMember.roles.highest.position
            ) {
                continue;
            }

            try {

                await member.roles.remove(
                    role,
                    `Shizu XP - Level ${level} Sesli rolü güncellendi`
                );

                logger.info(
                    `${member.user.tag} kullanıcısından ${role.name} kaldırıldı.`
                );

            } catch (error) {

                logger.error(
                    `${role.name} kaldırılamadı: ${error.message}`
                );
            }
        }

        // ====================================================
        // CHAT ROLÜ VER
        // ====================================================

        if (targetChatRole) {

            if (
                targetChatRole.position <
                botMember.roles.highest.position
            ) {

                if (
                    !member.roles.cache.has(
                        targetChatRole.id
                    )
                ) {

                    try {

                        await member.roles.add(
                            targetChatRole,
                            `Shizu XP - Level ${level}`
                        );

                        logger.info(
                            `${member.user.tag} kullanıcısına ${targetChatRoleName} verildi.`
                        );

                    } catch (error) {

                        logger.error(
                            `${targetChatRoleName} verilemedi: ${error.message}`
                        );
                    }
                }
            }

        } else {

            logger.warn(
                `${targetChatRoleName} bulunamadı. Yeni rol oluşturulmayacak.`
            );
        }

        // ====================================================
        // SESLİ ROLÜ VER
        // ====================================================

        if (targetVoiceRole) {

            if (
                targetVoiceRole.position <
                botMember.roles.highest.position
            ) {

                if (
                    !member.roles.cache.has(
                        targetVoiceRole.id
                    )
                ) {

                    try {

                        await member.roles.add(
                            targetVoiceRole,
                            `Shizu XP - Level ${level}`
                        );

                        logger.info(
                            `${member.user.tag} kullanıcısına ${targetVoiceRoleName} verildi.`
                        );

                    } catch (error) {

                        logger.error(
                            `${targetVoiceRoleName} verilemedi: ${error.message}`
                        );
                    }
                }
            }

        } else {

            logger.warn(
                `${targetVoiceRoleName} bulunamadı. Yeni rol oluşturulmayacak.`
            );
        }

    } catch (error) {

        logger.error(
            `Level rollerini güncelleme hatası: ${error.message}`
        );
    }
}

// ============================================================
// MESAJ XP
// ============================================================

async function handleMessageXP(message) {

    try {

        if (!message.guild) {
            return;
        }

        if (message.author.bot) {
            return;
        }

        const content =
            message.content
                ?.replace(/\s+/g, "")
                .trim();

        if (!content || content.length < 2) {
            return;
        }

        const guildId =
            message.guild.id;

        const userId =
            message.author.id;

        const user =
            getUser(
                guildId,
                userId
            );

        const now =
            Date.now();

        // ====================================================
        // 60 SANİYE COOLDOWN
        // ====================================================

        if (
            user.lastMessageXP &&
            now - user.lastMessageXP <
            MESSAGE_COOLDOWN
        ) {
            return;
        }

        // ====================================================
        // XP
        // ====================================================

        const xp =
            randomXP(
                MESSAGE_MIN_XP,
                MESSAGE_MAX_XP
            );

        const result =
            addXP(
                guildId,
                userId,
                xp
            );

        updateUser(
            guildId,
            userId,
            {
                totalMessages:
                    (result.totalMessages || 0) + 1,

                lastMessageXP: now
            }
        );

        logger.debug(
            `${message.author.tag} mesaj XP aldı: +${xp}`
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
            `Mesaj XP sistemi hatası: ${error.message}`
        );
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

        logger.info(
            `${member.user.tag} Level ${oldLevel} → Level ${newLevel} oldu.`
        );

        // ====================================================
        // CHAT + [X] / SESLİ + [X] ROLLERİ
        // ====================================================

        await updateLevelRoles(
            guild,
            member,
            newLevel
        );

        const roleLevel =
            getHighestRoleLevel(newLevel);

        const chatRoleName =
            roleLevel
                ? `Chat + [${roleLevel}]`
                : "Yok";

        const voiceRoleName =
            roleLevel
                ? `Sesli + [${roleLevel}]`
                : "Yok";

        // ====================================================
        // LEVEL UP KANALI
        // ====================================================

        try {

            const levelUpChannel =
                guild.channels.cache.get(
                    LEVEL_UP_CHANNEL_ID
                );

            if (
                levelUpChannel &&
                levelUpChannel.isTextBased()
            ) {

                const levelUpEmbed =
                    new EmbedBuilder()
                        .setColor(0x8b5cf6)
                        .setTitle(
                            "🎉 LEVEL ATLADI!"
                        )
                        .setDescription(
                            `${member} **Level ${newLevel}** seviyesine ulaştı!`
                        )
                        .setThumbnail(
                            member.user.displayAvatarURL({
                                size: 256
                            })
                        )
                        .addFields(
                            {
                                name: "📊 Eski Level",
                                value:
                                    `**${oldLevel}**`,
                                inline: true
                            },
                            {
                                name: "🏆 Yeni Level",
                                value:
                                    `**${newLevel}**`,
                                inline: true
                            },
                            {
                                name: "💬 Chat Rolü",
                                value:
                                    `**${chatRoleName}**`,
                                inline: true
                            },
                            {
                                name: "🎙️ Sesli Rolü",
                                value:
                                    `**${voiceRoleName}**`,
                                inline: true
                            }
                        )
                        .setFooter({
                            text:
                                "Shizu XP Sistemi"
                        })
                        .setTimestamp();

                await levelUpChannel.send({
                    embeds: [levelUpEmbed]
                });

                logger.info(
                    `📢 Level up bildirimi gönderildi: ${LEVEL_UP_CHANNEL_ID}`
                );
            }

        } catch (error) {

            logger.error(
                `Level up kanal bildirimi gönderilemedi: ${error.message}`
            );
        }

        // ====================================================
        // KULLANICIYA DM
        // ====================================================

        try {

            const embed =
                new EmbedBuilder()
                    .setColor(0x8b5cf6)
                    .setTitle(
                        "🎉 LEVEL ATLADIN!"
                    )
                    .setDescription(
                        `Tebrikler **${member.user.username}**!\n\n` +
                        `✨ Yeni seviyen: **Level ${newLevel}**\n\n` +
                        `💬 Chat rolün: **${chatRoleName}**\n` +
                        `🎙️ Sesli rolün: **${voiceRoleName}**\n\n` +
                        `Shizu ile devam et! 💜`
                    )
                    .setTimestamp();

            await member.send({
                embeds: [embed]
            });

        } catch {
            // DM kapalıysa hata verme
        }

        // ====================================================
        // GENEL LOG KANALI
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

                const logEmbed =
                    new EmbedBuilder()
                        .setColor(0x57F287)
                        .setTitle(
                            "🎉 Level Atlandı"
                        )
                        .addFields(
                            {
                                name: "👤 Kullanıcı",
                                value:
                                    `${member} (${member.user.tag})`,
                                inline: false
                            },
                            {
                                name: "📊 Eski Level",
                                value:
                                    `**${oldLevel}**`,
                                inline: true
                            },
                            {
                                name: "🚀 Yeni Level",
                                value:
                                    `**${newLevel}**`,
                                inline: true
                            },
                            {
                                name: "💬 Chat Rolü",
                                value:
                                    `**${chatRoleName}**`,
                                inline: true
                            },
                            {
                                name: "🎙️ Sesli Rolü",
                                value:
                                    `**${voiceRoleName}**`,
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
    }
}

// ============================================================
// VOICE XP
// ============================================================

async function handleVoiceXP(client) {

    if (!client || !client.guilds) {
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

                // ====================================================
                // AFK KANALI
                // ====================================================

                if (
                    guild.afkChannelId ===
                    channel.id
                ) {
                    continue;
                }

                // ====================================================
                // KANALDAKİ ÜYELER
                // ====================================================

                for (
                    const member of channel.members.values()
                ) {

                    // Bot
                    if (member.user.bot) {
                        continue;
                    }

                    // Voice'da değil
                    if (!member.voice.channelId) {
                        continue;
                    }

                    // Mikrofon kapalı
                    if (member.voice.selfMute) {
                        continue;
                    }

                    // Kulaklık/deaf kapalı
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

                    // Tek başına ise XP yok
                    if (channel.members.size < 2) {
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

                    // ====================================================
                    // 60 SANİYE COOLDOWN
                    // ====================================================

                    if (
                        user.lastVoiceXP &&
                        now - user.lastVoiceXP <
                        VOICE_INTERVAL
                    ) {
                        continue;
                    }

                    // ====================================================
                    // 10 XP
                    // ====================================================

                    const result =
                        addXP(
                            guildId,
                            userId,
                            VOICE_XP
                        );

                    updateUser(
                        guildId,
                        userId,
                        {
                            voiceMinutes:
                                (result.voiceMinutes || 0) + 1,

                            lastVoiceXP: now
                        }
                    );

                    logger.debug(
                        `${member.user.tag} voice XP aldı: +${VOICE_XP}`
                    );

                    // ====================================================
                    // LEVEL UP
                    // ====================================================

                    if (result.leveledUp) {

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
        );

    const level =
        user.level || 0;

    const currentLevelXP =
        getRequiredTotalXP(
            level
        );

    const nextLevelXP =
        getRequiredTotalXP(
            level + 1
        );

    const xpInLevel =
        Math.max(
            0,
            (user.xp || 0) -
            currentLevelXP
        );

    const xpNeeded =
        Math.max(
            0,
            nextLevelXP -
            (user.xp || 0)
        );

    return {
        ...user,

        level,

        currentLevelXP,

        nextLevelXP,

        xpInLevel,

        xpNeeded
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