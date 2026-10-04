const {
    ChannelType,
    PermissionsBitField
} = require("discord.js");

const LOG_CHANNEL_NAME = "📋・log";

/**
 * Log kanalını bulur.
 */
async function getLogChannel(guild) {
    if (!guild) {
        throw new Error("Guild bulunamadı.");
    }

    let channel = guild.channels.cache.find(
        ch =>
            ch.type === ChannelType.GuildText &&
            ch.name === LOG_CHANNEL_NAME
    );

    // Cache'de yoksa Discord'dan tekrar kontrol et
    if (!channel) {
        try {
            const channels = await guild.channels.fetch();

            channel = channels.find(
                ch =>
                    ch &&
                    ch.type === ChannelType.GuildText &&
                    ch.name === LOG_CHANNEL_NAME
            );
        } catch (error) {
            console.error(
                "Log kanalları alınamadı:",
                error
            );
        }
    }

    return channel || null;
}

/**
 * Log kanalını bulur, yoksa oluşturur.
 */
async function getOrCreateLogChannel(guild) {
    if (!guild) {
        throw new Error("Guild bulunamadı.");
    }

    let channel = await getLogChannel(guild);

    if (channel) {
        return channel;
    }

    channel = await guild.channels.create({
        name: LOG_CHANNEL_NAME,
        type: ChannelType.GuildText,
        reason: "Shizu log sistemi için oluşturuldu.",
        permissionOverwrites: [
            {
                id: guild.roles.everyone.id,
                deny: [
                    PermissionsBitField.Flags.ViewChannel
                ]
            },
            {
                id: guild.members.me.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.EmbedLinks,
                    PermissionsBitField.Flags.AttachFiles,
                    PermissionsBitField.Flags.ReadMessageHistory
                ]
            }
        ]
    });

    console.log(
        `Log kanalı oluşturuldu: ${guild.name} | #${channel.name}`
    );

    return channel;
}

/**
 * Log kanalına mesaj gönderir.
 *
 * Kullanım:
 * await sendLog(guild, embed);
 */
async function sendLog(guild, embed) {
    try {
        const channel = await getOrCreateLogChannel(guild);

        if (!channel) {
            throw new Error(
                "Log kanalı bulunamadı veya oluşturulamadı."
            );
        }

        if (!channel.isTextBased()) {
            throw new Error(
                "Log kanalı mesaj göndermek için uygun değil."
            );
        }

        await channel.send({
            embeds: [embed]
        });

        return true;
    } catch (error) {
        console.error(
            `[LOG] Log mesajı gönderilemedi: ${error.message}`
        );

        return false;
    }
}

module.exports = {
    LOG_CHANNEL_NAME,
    getLogChannel,
    getOrCreateLogChannel,
    sendLog
};