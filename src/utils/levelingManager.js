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

// ===============================
// AYARLAR
// ===============================

const MESSAGE_MIN_XP = 15;
const MESSAGE_MAX_XP = 25;
const MESSAGE_COOLDOWN = 60 * 1000;

const VOICE_XP = 10;
const VOICE_INTERVAL = 60 * 1000;

// Level → Rol
const LEVEL_ROLES = {
    5: "Level 5",
    10: "Level 10",
    20: "Level 20",
    30: "Level 30",
    50: "Level 50",
    75: "Level 75",
    100: "Level 100"
};

// ===============================
// RANDOM XP
// ===============================

function randomXP(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ===============================
// MESAJ XP
// ===============================

async function handleMessageXP(message) {
    if (!message.guild) return;
    if (message.author.bot) return;

    const content = message.content?.replace(/\s+/g, "").trim();

    if (!content || content.length < 2) return;

    const guildId = message.guild.id;
    const userId = message.author.id;

    const user = getUser(guildId, userId);

    const now = Date.now();

    // 60 saniye cooldown
    if (
        user.lastMessageXP &&
        now - user.lastMessageXP < MESSAGE_COOLDOWN
    ) {
        return;
    }

    const xp = randomXP(
        MESSAGE_MIN_XP,
        MESSAGE_MAX_XP
    );

    const result = addXP(
        guildId,
        userId,
        xp
    );

    updateUser(
        guildId,
        userId,
        {
            totalMessages: (result.totalMessages || 0) + 1,
            lastMessageXP: now
        }
    );

    if (result.leveledUp) {
        await handleLevelUp(
            message.guild,
            message.member,
            result.oldLevel,
            result.newLevel
        );
    }
}

// ===============================
// LEVEL UP
// ===============================

async function handleLevelUp(
    guild,
    member,
    oldLevel,
    newLevel
) {
    try {
        logger.info(
            `${member.user.tag} Level ${newLevel} oldu.`
        );

        // Level rolü
        const roleName = LEVEL_ROLES[newLevel];

        if (roleName) {
            let role = guild.roles.cache.find(
                r => r.name === roleName
            );

            // Rol yoksa oluştur
            if (!role) {
                try {
                    role = await guild.roles.create({
                        name: roleName,
                        reason: `Shizu XP sistemi - Level ${newLevel}`
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

            // Rol botun altında ise ver
            if (
                role &&
                guild.members.me &&
                role.position < guild.members.me.roles.highest.position
            ) {
                try {
                    await member.roles.add(
                        role,
                        `Level ${newLevel} ödülü`
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

        // Kullanıcıya DM
        try {
            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle("🎉 LEVEL ATLADIN!")
                .setDescription(
                    `Tebrikler **${member.user.username}**!\n\n` +
                    `✨ Yeni seviyen: **Level ${newLevel}**\n\n` +
                    `Shizu ile sohbet etmeye devam et! 💜`
                )
                .setTimestamp();

            await member.send({
                embeds: [embed]
            });
        } catch {
            // DM kapalıysa hata verme
        }

        // Log kanalı
        try {
            const logChannel =
                await getOrCreateLogChannel(guild);

            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor(0x57F287)
                    .setTitle("🎉 Level Atlandı")
                    .addFields(
                        {
                            name: "👤 Kullanıcı",
                            value: `${member} (${member.user.tag})`,
                            inline: true
                        },
                        {
                            name: "📊 Eski Level",
                            value: `${oldLevel}`,
                            inline: true
                        },
                        {
                            name: "🚀 Yeni Level",
                            value: `${newLevel}`,
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

// ===============================
// VOICE XP
// ===============================

async function handleVoiceXP(client) {
    if (!client || !client.guilds) return;

    for (const guild of client.guilds.cache.values()) {
        try {
            // Sunucudaki voice kanallarını kontrol et
            const voiceChannels = guild.channels.cache.filter(
                channel =>
                    channel.type === ChannelType.GuildVoice ||
                    channel.type === ChannelType.GuildStageVoice
            );

            for (const channel of voiceChannels.values()) {

                // AFK kanalında XP verme
                if (guild.afkChannelId === channel.id) {
                    continue;
                }

                // Kanaldaki üyeler
                for (const member of channel.members.values()) {

                    // Botlara XP verme
                    if (member.user.bot) continue;

                    // Kullanıcı gerçekten voice'da mı?
                    if (!member.voice.channelId) continue;

                    // Mikrofon kapalıysa XP yok
                    if (member.voice.selfMute) continue;

                    // Kullanıcı sağırlaştırılmışsa XP yok
                    if (member.voice.selfDeaf) continue;

                    // Sunucu tarafından mute
                    if (member.voice.serverMute) continue;

                    // Sunucu tarafından deaf
                    if (member.voice.serverDeaf) continue;

                    // Tek başına voice'da ise XP yok
                    if (channel.members.size < 2) continue;

                    const guildId = guild.id;
                    const userId = member.id;

                    const user = getUser(
                        guildId,
                        userId
                    );

                    const now = Date.now();

                    // Son voice XP kontrolü
                    if (
                        user.lastVoiceXP &&
                        now - user.lastVoiceXP < VOICE_INTERVAL
                    ) {
                        continue;
                    }

                    // 10 XP ver
                    const result = addXP(
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

                    // Level atladıysa
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

// ===============================
// RANK BİLGİSİ
// ===============================

function getRankInfo(guildId, userId) {
    const user = getUser(
        guildId,
        userId
    );

    const level = user.level || 0;

    const currentLevelXP =
        getRequiredTotalXP(level);

    const nextLevelXP =
        getRequiredTotalXP(level + 1);

    const xpInLevel =
        Math.max(
            0,
            (user.xp || 0) - currentLevelXP
        );

    const xpNeeded =
        Math.max(
            0,
            nextLevelXP - (user.xp || 0)
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

// ===============================
// EXPORT
// ===============================

module.exports = {
    handleMessageXP,
    handleVoiceXP,
    handleLevelUp,
    getRankInfo,
    LEVEL_ROLES
};