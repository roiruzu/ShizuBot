const {
    EmbedBuilder,
    PermissionsBitField
} = require("discord.js");

const {
    getUser,
    addChatXP,
    addVoiceXP,
    getRequiredTotalXP,
    getChatRank,
    getVoiceRank
} = require("./levelingStore");

const {
    getOrCreateLogChannel
} = require("./logChannel");

const logger =
    require("./logger");

/*
==================================================
AYARLAR
==================================================
*/

const LEVEL_UP_CHANNEL_ID =
    "1556346871402860624";

const MESSAGE_XP_MIN = 15;
const MESSAGE_XP_MAX = 25;

const MESSAGE_XP_COOLDOWN =
    60 * 1000;

const VOICE_XP_PER_MINUTE = 10;

const VOICE_INTERVAL =
    60 * 1000;

/*
==================================================
ROLLER
==================================================
*/

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

/*
==================================================
RANDOM XP
==================================================
*/

function randomXP(min, max) {
    return Math.floor(
        Math.random() *
            (max - min + 1)
    ) + min;
}

/*
==================================================
EN YÜKSEK ROL
==================================================
*/

function getHighestRoleLevel(level) {
    let highest = 0;

    for (
        const roleLevel
        of LEVEL_ROLE_LEVELS
    ) {
        if (
            level >=
            roleLevel
        ) {
            highest =
                roleLevel;
        }
    }

    return highest;
}

/*
==================================================
ROL GÜNCELLEME
==================================================
*/

async function updateLevelRoles(
    guild,
    member,
    chatLevel,
    voiceLevel
) {
    try {
        if (!guild || !member) {
            return;
        }

        const highestChat =
            getHighestRoleLevel(
                chatLevel
            );

        const highestVoice =
            getHighestRoleLevel(
                voiceLevel
            );

        const targetChatRole =
            highestChat > 0
                ? `Chat + [${highestChat}]`
                : null;

        const targetVoiceRole =
            highestVoice > 0
                ? `Sesli + [${highestVoice}]`
                : null;

        /*
        ==========================================
        ESKİ CHAT ROLLERİ
        ==========================================
        */

        const oldChatRoles =
            member.roles.cache.filter(
                role =>
                    /^Chat \+ \[\d+\]$/
                        .test(
                            role.name
                        )
            );

        for (
            const role
            of oldChatRoles.values()
        ) {
            if (
                role.name !==
                targetChatRole
            ) {
                try {
                    await member.roles.remove(
                        role,
                        "Chat level rolü güncellendi."
                    );
                } catch (error) {
                    logger.warn(
                        `⚠️ Chat rolü kaldırılamadı: ${error.message}`
                    );
                }
            }
        }

        /*
        ==========================================
        ESKİ SESLİ ROLLERİ
        ==========================================
        */

        const oldVoiceRoles =
            member.roles.cache.filter(
                role =>
                    /^Sesli \+ \[\d+\]$/
                        .test(
                            role.name
                        )
            );

        for (
            const role
            of oldVoiceRoles.values()
        ) {
            if (
                role.name !==
                targetVoiceRole
            ) {
                try {
                    await member.roles.remove(
                        role,
                        "Sesli level rolü güncellendi."
                    );
                } catch (error) {
                    logger.warn(
                        `⚠️ Sesli rolü kaldırılamadı: ${error.message}`
                    );
                }
            }
        }

        /*
        ==========================================
        CHAT ROLE
        ==========================================
        */

        if (highestChat > 0) {
            const chatRole =
                guild.roles.cache.find(
                    role =>
                        role.name ===
                        targetChatRole
                );

            if (!chatRole) {
                logger.warn(
                    `⚠️ ${targetChatRole} bulunamadı.`
                );
            } else if (
                chatRole.position >=
                guild.members.me.roles.highest.position
            ) {
                logger.warn(
                    `⚠️ ${targetChatRole} bot rolünün üstünde.`
                );
            } else if (
                !member.roles.cache.has(
                    chatRole.id
                )
            ) {
                try {
                    await member.roles.add(
                        chatRole,
                        "Chat level rolü verildi."
                    );
                } catch (error) {
                    logger.warn(
                        `⚠️ ${targetChatRole} verilemedi: ${error.message}`
                    );
                }
            }
        }

        /*
        ==========================================
        SESLİ ROLE
        ==========================================
        */

        if (highestVoice > 0) {
            const voiceRole =
                guild.roles.cache.find(
                    role =>
                        role.name ===
                        targetVoiceRole
                );

            if (!voiceRole) {
                logger.warn(
                    `⚠️ ${targetVoiceRole} bulunamadı.`
                );
            } else if (
                voiceRole.position >=
                guild.members.me.roles.highest.position
            ) {
                logger.warn(
                    `⚠️ ${targetVoiceRole} bot rolünün üstünde.`
                );
            } else if (
                !member.roles.cache.has(
                    voiceRole.id
                )
            ) {
                try {
                    await member.roles.add(
                        voiceRole,
                        "Sesli level rolü verildi."
                    );
                } catch (error) {
                    logger.warn(
                        `⚠️ ${targetVoiceRole} verilemedi: ${error.message}`
                    );
                }
            }
        }
    } catch (error) {
        logger.error(
            `❌ Level rolleri güncellenirken hata: ${
                error.stack ||
                error.message
            }`
        );
    }
}

/*
==================================================
LEVEL UP BİLDİRİMİ
==================================================
*/

async function sendLevelUpNotification(
    guild,
    member,
    type,
    oldLevel,
    newLevel
) {
    try {
        /*
        ==========================================
        KANALI FETCH ET
        ==========================================
        */

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
            } catch (error) {
                logger.error(
                    `❌ Level bildirim kanalı alınamadı (${LEVEL_UP_CHANNEL_ID}): ${error.message}`
                );
                return;
            }
        }

        if (!channel) {
            logger.error(
                `❌ Level bildirim kanalı bulunamadı: ${LEVEL_UP_CHANNEL_ID}`
            );
            return;
        }

        /*
        ==========================================
        KANAL YETKİSİ
        ==========================================
        */

        const botMember =
            guild.members.me;

        if (!botMember) {
            logger.error(
                "❌ Bot guild member bulunamadı."
            );
            return;
        }

        const permissions =
            channel.permissionsFor(
                botMember
            );

        if (
            !permissions ||
            !permissions.has(
                PermissionsBitField.Flags.ViewChannel
            ) ||
            !permissions.has(
                PermissionsBitField.Flags.SendMessages
            ) ||
            !permissions.has(
                PermissionsBitField.Flags.EmbedLinks
            )
        ) {
            logger.error(
                `❌ Level kanalında botun gerekli yetkileri yok: ${LEVEL_UP_CHANNEL_ID}`
            );
            return;
        }

        /*
        ==========================================
        TÜR
        ==========================================
        */

        const isChat =
            type === "chat";

        const title =
            isChat
                ? "💬 CHAT LEVEL ATLANDI!"
                : "🎧 SESLİ LEVEL ATLANDI!";

        const levelName =
            isChat
                ? "Chat Level"
                : "Sesli Level";

        /*
        ==========================================
        EMBED
        ==========================================
        */

        const embed =
            new EmbedBuilder()
                .setColor(
                    isChat
                        ? 0x8b5cf6
                        : 0x6366f1
                )
                .setTitle(title)
                .setDescription(
                    `🎉 ${member} **${levelName} ${newLevel}** seviyesine ulaştı!`
                )
                .addFields(
                    {
                        name:
                            "📉 Eski Level",
                        value:
                            `**${oldLevel}**`,
                        inline: true
                    },
                    {
                        name:
                            "📈 Yeni Level",
                        value:
                            `**${newLevel}**`,
                        inline: true
                    },
                    {
                        name:
                            "🏆 Sistem",
                        value:
                            isChat
                                ? "Chat XP"
                                : "Sesli XP",
                        inline: true
                    }
                )
                .setThumbnail(
                    member.user.displayAvatarURL(
                        {
                            extension: "png",
                            size: 256
                        }
                    )
                )
                .setFooter({
                    text:
                        "Shizu • Level Sistemi"
                })
                .setTimestamp();

        /*
        ==========================================
        MESAJ GÖNDER
        ==========================================
        */

        await channel.send({
            embeds: [embed]
        });

        logger.info(
            `✅ Level bildirimi gönderildi: ${member.user.tag} | ${type} | ${oldLevel} -> ${newLevel}`
        );
    } catch (error) {
        logger.error(
            `❌ Level bildirim gönderme hatası: ${
                error.stack ||
                error.message
            }`
        );
    }
}

/*
==================================================
LEVEL UP
==================================================
*/

async function handleLevelUp(
    guild,
    member,
    type,
    oldLevel,
    newLevel
) {
    try {
        await sendLevelUpNotification(
            guild,
            member,
            type,
            oldLevel,
            newLevel
        );

        /*
            DM
        */

        try {
            await member.send(
                `🎉 **${guild.name}** sunucusunda ${type === "chat" ? "💬 Chat" : "🎧 Sesli"} Level'in **${newLevel}** oldu!`
            );
        } catch {
            /*
                DM kapalı olabilir.
            */
        }
    } catch (error) {
        logger.error(
            `❌ Level up işlemi hatası: ${error.message}`
        );
    }
}

/*
==================================================
MESAJ XP
==================================================
*/

async function handleMessageXP(
    message
) {
    try {
        if (
            !message.guild ||
            !message.author ||
            message.author.bot
        ) {
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

        /*
            60 saniye cooldown
        */

        if (
            user.lastMessageXP &&
            now -
                user.lastMessageXP <
                MESSAGE_XP_COOLDOWN
        ) {
            return;
        }

        const amount =
            randomXP(
                MESSAGE_XP_MIN,
                MESSAGE_XP_MAX
            );

        const result =
            addChatXP(
                guildId,
                userId,
                amount
            );

        /*
            Mesaj sayısı
        */

        const {
            updateUser
        } = require("./levelingStore");

        updateUser(
            guildId,
            userId,
            {
                totalMessages:
                    (user.totalMessages || 0) + 1,

                lastMessageXP:
                    now
            }
        );

        /*
            Güncel kullanıcı
        */

        const updatedUser =
            getUser(
                guildId,
                userId
            );

        /*
            Chat rollerini güncelle
        */

        const member =
            message.guild.members.cache.get(
                userId
            );

        if (member) {
            await updateLevelRoles(
                message.guild,
                member,
                updatedUser.chatLevel,
                updatedUser.voiceLevel
            );
        }

        /*
            Chat level up
        */

        if (result.leveledUp) {
            await handleLevelUp(
                message.guild,
                member,
                "chat",
                result.oldLevel,
                result.newLevel
            );
        }

        return result;
    } catch (error) {
        logger.error(
            `❌ Chat XP hatası: ${
                error.stack ||
                error.message
            }`
        );
    }
}

/*
==================================================
SES XP
==================================================
*/

async function handleVoiceXP(
    client
) {
    try {
        for (
            const guild
            of client.guilds.cache.values()
        ) {
            for (
                const member
                of guild.members.cache.values()
            ) {
                if (
                    member.user.bot
                ) {
                    continue;
                }

                if (
                    !member.voice ||
                    !member.voice.channel
                ) {
                    continue;
                }

                /*
                    Mikrofon veya kulaklık kapalıysa
                    XP verme.
                */

                if (
                    member.voice.selfMute ||
                    member.voice.serverMute ||
                    member.voice.selfDeaf ||
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
                    );

                const now =
                    Date.now();

                if (
                    user.lastVoiceXP &&
                    now -
                        user.lastVoiceXP <
                        VOICE_INTERVAL
                ) {
                    continue;
                }

                const result =
                    addVoiceXP(
                        guildId,
                        userId,
                        VOICE_XP_PER_MINUTE
                    );

                const {
                    updateUser
                } = require("./levelingStore");

                updateUser(
                    guildId,
                    userId,
                    {
                        voiceMinutes:
                            (user.voiceMinutes || 0) + 1,

                        lastVoiceXP:
                            now
                    }
                );

                const updatedUser =
                    getUser(
                        guildId,
                        userId
                    );

                /*
                    Rolleri güncelle
                */

                await updateLevelRoles(
                    guild,
                    member,
                    updatedUser.chatLevel,
                    updatedUser.voiceLevel
                );

                /*
                    Sesli level up
                */

                if (result.leveledUp) {
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
            `❌ Ses XP hatası: ${
                error.stack ||
                error.message
            }`
        );
    }
}

/*
==================================================
RANK
==================================================
*/

function getRankInfo(
    guildId,
    userId
) {
    const user =
        getUser(
            guildId,
            userId
        );

    const chatLevel =
        user.chatLevel || 0;

    const voiceLevel =
        user.voiceLevel || 0;

    const chatXP =
        user.chatXP || 0;

    const voiceXP =
        user.voiceXP || 0;

    const chatCurrentXP =
        getRequiredTotalXP(
            chatLevel
        );

    const chatNextXP =
        getRequiredTotalXP(
            chatLevel + 1
        );

    const voiceCurrentXP =
        getRequiredTotalXP(
            voiceLevel
        );

    const voiceNextXP =
        getRequiredTotalXP(
            voiceLevel + 1
        );

    const chatXPInLevel =
        Math.max(
            0,
            chatXP -
                chatCurrentXP
        );

    const voiceXPInLevel =
        Math.max(
            0,
            voiceXP -
                voiceCurrentXP
        );

    const chatRange =
        Math.max(
            1,
            chatNextXP -
                chatCurrentXP
        );

    const voiceRange =
        Math.max(
            1,
            voiceNextXP -
                voiceCurrentXP
        );

    return {
        ...user,

        /*
            CHAT
        */

        chatLevel,
        chatXP,

        chatRank:
            getChatRank(
                guildId,
                userId
            ),

        chatCurrentXP,
        chatNextXP,

        chatXPInLevel,

        chatXPNeeded:
            Math.max(
                0,
                chatNextXP -
                    chatXP
            ),

        chatProgress:
            Math.min(
                100,
                Math.max(
                    0,
                    (
                        chatXPInLevel /
                        chatRange
                    ) * 100
                )
            ),

        /*
            SESLİ
        */

        voiceLevel,
        voiceXP,

        voiceRank:
            getVoiceRank(
                guildId,
                userId
            ),

        voiceCurrentXP,
        voiceNextXP,

        voiceXPInLevel,

        voiceXPNeeded:
            Math.max(
                0,
                voiceNextXP -
                    voiceXP
            ),

        voiceProgress:
            Math.min(
                100,
                Math.max(
                    0,
                    (
                        voiceXPInLevel /
                        voiceRange
                    ) * 100
                )
            ),

        /*
            UYUMLULUK
        */

        level:
            chatLevel,

        xp:
            chatXP,

        rank:
            getChatRank(
                guildId,
                userId
            ),

        progress:
            Math.min(
                100,
                Math.max(
                    0,
                    (
                        chatXPInLevel /
                        chatRange
                    ) * 100
                )
            )
    };
}

module.exports = {
    handleMessageXP,
    handleVoiceXP,
    handleLevelUp,
    updateLevelRoles,
    getRankInfo
};