const {
    EmbedBuilder
} = require("discord.js");

const {
    getUser,
    addXP,
    getRequiredTotalXP,
    getUserRank
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
ROL LEVEL'LERİ
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
EN YÜKSEK ROL LEVEL'İ
==================================================
*/

function getHighestRoleLevel(level) {
    let highest = 0;

    for (const roleLevel of LEVEL_ROLE_LEVELS) {
        if (level >= roleLevel) {
            highest = roleLevel;
        }
    }

    return highest;
}

/*
==================================================
LEVEL ROLLERİNİ GÜNCELLE
==================================================
*/

async function updateLevelRoles(
    guild,
    member,
    level
) {
    try {
        if (!guild || !member) {
            return;
        }

        const highestLevel =
            getHighestRoleLevel(level);

        /*
            Kullanıcının mevcut
            Chat + [X] ve Sesli + [X]
            rollerini bul.
        */

        const currentLevelRoles =
            member.roles.cache.filter(role => {
                return (
                    /^Chat \+ \[\d+\]$/.test(
                        role.name
                    ) ||
                    /^Sesli \+ \[\d+\]$/.test(
                        role.name
                    )
                );
            });

        /*
            Hedef roller
        */

        const targetChatRoleName =
            highestLevel > 0
                ? `Chat + [${highestLevel}]`
                : null;

        const targetVoiceRoleName =
            highestLevel > 0
                ? `Sesli + [${highestLevel}]`
                : null;

        /*
            Eski level rollerini kaldır.
            Hedef roller hariç tutulur.
        */

        for (const role of currentLevelRoles.values()) {
            if (
                role.name !==
                    targetChatRoleName &&
                role.name !==
                    targetVoiceRoleName
            ) {
                try {
                    await member.roles.remove(
                        role,
                        "Level rolü güncellendi."
                    );
                } catch (error) {
                    logger.warn(
                        `⚠️ ${member.user.tag} kullanıcısından ${role.name} rolü kaldırılamadı: ${error.message}`
                    );
                }
            }
        }

        /*
            Level 0 ise rol verme.
        */

        if (highestLevel <= 0) {
            return;
        }

        /*
            CHAT ROLÜ
        */

        const chatRole =
            guild.roles.cache.find(
                role =>
                    role.name ===
                    targetChatRoleName
            );

        if (!chatRole) {
            logger.warn(
                `⚠️ ${targetChatRoleName} rolü bulunamadı.`
            );
        } else {
            if (
                !member.roles.cache.has(
                    chatRole.id
                )
            ) {
                if (
                    chatRole.position <
                    guild.members.me.roles.highest.position
                ) {
                    try {
                        await member.roles.add(
                            chatRole,
                            "Level rolü verildi."
                        );
                    } catch (error) {
                        logger.warn(
                            `⚠️ ${member.user.tag} kullanıcısına ${chatRole.name} verilemedi: ${error.message}`
                        );
                    }
                } else {
                    logger.warn(
                        `⚠️ ${chatRole.name} rolü botun rolünden yukarıda.`
                    );
                }
            }
        }

        /*
            SESLİ ROLÜ
        */

        const voiceRole =
            guild.roles.cache.find(
                role =>
                    role.name ===
                    targetVoiceRoleName
            );

        if (!voiceRole) {
            logger.warn(
                `⚠️ ${targetVoiceRoleName} rolü bulunamadı.`
            );
        } else {
            if (
                !member.roles.cache.has(
                    voiceRole.id
                )
            ) {
                if (
                    voiceRole.position <
                    guild.members.me.roles.highest.position
                ) {
                    try {
                        await member.roles.add(
                            voiceRole,
                            "Level rolü verildi."
                        );
                    } catch (error) {
                        logger.warn(
                            `⚠️ ${member.user.tag} kullanıcısına ${voiceRole.name} verilemedi: ${error.message}`
                        );
                    }
                } else {
                    logger.warn(
                        `⚠️ ${voiceRole.name} rolü botun rolünden yukarıda.`
                    );
                }
            }
        }
    } catch (error) {
        logger.error(
            `❌ Level rolleri güncellenirken hata: ${error.stack || error.message}`
        );
    }
}

/*
==================================================
LEVEL UP MESAJI
==================================================
*/

async function handleLevelUp(
    guild,
    member,
    oldLevel,
    newLevel
) {
    try {
        if (
            !guild ||
            !member ||
            newLevel <= oldLevel
        ) {
            return;
        }

        /*
            Önce rolleri güncelle
        */

        await updateLevelRoles(
            guild,
            member,
            newLevel
        );

        /*
            Level up kanalı
        */

        const channel =
            guild.channels.cache.get(
                LEVEL_UP_CHANNEL_ID
            );

        if (channel) {
            const embed =
                new EmbedBuilder()
                    .setColor(0x8b5cf6)
                    .setTitle("✨ LEVEL ATLANDI!")
                    .setDescription(
                        `🎉 ${member} **Level ${newLevel}** seviyesine ulaştı!`
                    )
                    .addFields(
                        {
                            name: "📈 Eski Level",
                            value:
                                `**${oldLevel}**`,
                            inline: true
                        },
                        {
                            name: "🌙 Yeni Level",
                            value:
                                `**${newLevel}**`,
                            inline: true
                        }
                    )
                    .setThumbnail(
                        member.user.displayAvatarURL({
                            extension: "png",
                            size: 256
                        })
                    )
                    .setFooter({
                        text:
                            "Shizu • Level Sistemi"
                    })
                    .setTimestamp();

            await channel.send({
                embeds: [embed]
            });
        }

        /*
            DM
        */

        try {
            await member.send(
                `✨ Tebrikler! **${guild.name}** sunucusunda **Level ${newLevel}** oldun!`
            );
        } catch {
            /*
                DM kapalıysa sorun değil.
            */
        }

        /*
            Genel log kanalı
        */

        try {
            const logChannel =
                await getOrCreateLogChannel(
                    guild
                );

            if (logChannel) {
                const embed =
                    new EmbedBuilder()
                        .setColor(0x8b5cf6)
                        .setTitle(
                            "📈 Level Atlandı"
                        )
                        .setDescription(
                            `${member} **Level ${oldLevel} → Level ${newLevel}**`
                        )
                        .setTimestamp();

                await logChannel.send({
                    embeds: [embed]
                });
            }
        } catch (error) {
            logger.warn(
                `⚠️ Level log gönderilemedi: ${error.message}`
            );
        }
    } catch (error) {
        logger.error(
            `❌ Level up sistemi hatası: ${error.stack || error.message}`
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
            now - user.lastMessageXP <
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
            addXP(
                guildId,
                userId,
                amount
            );

        /*
            Mesaj sayısını artır
        */

        result.totalMessages =
            (result.totalMessages || 0) + 1;

        /*
            XP zamanını güncelle
        */

        result.lastMessageXP =
            now;

        /*
            Store'a kaydet
        */

        const {
            updateUser
        } = require("./levelingStore");

        updateUser(
            guildId,
            userId,
            {
                totalMessages:
                    result.totalMessages,
                lastMessageXP:
                    result.lastMessageXP
            }
        );

        /*
            Level up
        */

        if (result.leveledUp) {
            const member =
                message.guild.members.cache.get(
                    userId
                );

            if (member) {
                await handleLevelUp(
                    message.guild,
                    member,
                    result.oldLevel,
                    result.newLevel
                );
            }
        } else {
            /*
                Normal XP kazanımında da
                roller eksikse düzelt.
            */

            const member =
                message.guild.members.cache.get(
                    userId
                );

            if (member) {
                await updateLevelRoles(
                    message.guild,
                    member,
                    result.newLevel
                );
            }
        }

        return result;
    } catch (error) {
        logger.error(
            `❌ Mesaj XP hatası: ${error.stack || error.message}`
        );
    }
}

/*
==================================================
VOICE XP
==================================================
*/

async function handleVoiceXP(
    client
) {
    try {
        for (const guild of client.guilds.cache.values()) {
            for (const member of guild.members.cache.values()) {
                if (
                    !member.voice ||
                    !member.voice.channel
                ) {
                    continue;
                }

                if (member.user.bot) {
                    continue;
                }

                /*
                    Mikrofon kapalıysa XP yok.
                    Sağır/deaf ise XP yok.
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
                    now - user.lastVoiceXP <
                        VOICE_INTERVAL
                ) {
                    continue;
                }

                const result =
                    addXP(
                        guildId,
                        userId,
                        VOICE_XP_PER_MINUTE
                    );

                result.voiceMinutes =
                    (result.voiceMinutes || 0) + 1;

                result.lastVoiceXP =
                    now;

                const {
                    updateUser
                } = require("./levelingStore");

                updateUser(
                    guildId,
                    userId,
                    {
                        voiceMinutes:
                            result.voiceMinutes,
                        lastVoiceXP:
                            result.lastVoiceXP
                    }
                );

                if (result.leveledUp) {
                    await handleLevelUp(
                        guild,
                        member,
                        result.oldLevel,
                        result.newLevel
                    );
                } else {
                    await updateLevelRoles(
                        guild,
                        member,
                        result.newLevel
                    );
                }
            }
        }
    } catch (error) {
        logger.error(
            `❌ Ses XP sistemi hatası: ${error.stack || error.message}`
        );
    }
}

/*
==================================================
RANK BİLGİSİ
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

    const level =
        user.level || 0;

    const totalXP =
        user.xp || 0;

    const currentLevelXP =
        getRequiredTotalXP(level);

    const nextLevelXP =
        getRequiredTotalXP(
            level + 1
        );

    const xpInLevel =
        Math.max(
            0,
            totalXP - currentLevelXP
        );

    const xpNeeded =
        Math.max(
            0,
            nextLevelXP - totalXP
        );

    const levelXPRange =
        Math.max(
            1,
            nextLevelXP -
                currentLevelXP
        );

    const progress =
        Math.min(
            100,
            Math.max(
                0,
                (xpInLevel /
                    levelXPRange) *
                    100
            )
        );

    return {
        ...user,

        level,

        xp: totalXP,

        rank:
            getUserRank(
                guildId,
                userId
            ),

        currentLevelXP,

        nextLevelXP,

        xpInLevel,

        xpNeeded,

        progress
    };
}

/*
==================================================
EXPORT
==================================================
*/

module.exports = {
    handleMessageXP,
    handleVoiceXP,
    handleLevelUp,
    updateLevelRoles,
    getRankInfo
};