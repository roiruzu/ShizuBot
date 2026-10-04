const {
    ChannelType,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const {
    getConfig,
    getNextTicketNumber,
    createTicket,
    getTicket,
    updateTicket,
    deleteTicket,
    findOpenTicketByUser
} = require("./ticketStore");

const { getOrCreateLogChannel } = require("./logChannel");
const logger = require("./logger");

async function createTicketChannel(interaction) {
    const guild = interaction.guild;
    const user = interaction.user;

    const config = getConfig(guild.id);

    if (!config) {
        await interaction.reply({
            content: "❌ Ticket sistemi henüz kurulmamış.",
            ephemeral: true
        });

        return;
    }

    const existingTicket = findOpenTicketByUser(guild.id, user.id);

    if (existingTicket) {
        const existingChannel = guild.channels.cache.get(
            existingTicket.channelId
        );

        if (existingChannel) {
            await interaction.reply({
                content: `❌ Zaten açık bir ticket'ın var: ${existingChannel}`,
                ephemeral: true
            });

            return;
        }

        deleteTicket(guild.id, existingTicket.channelId);
    }

    const ticketNumber = getNextTicketNumber(guild.id);

    const safeUsername = user.username
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, "")
        .slice(0, 20) || "user";

    const channelName = `ticket-${String(ticketNumber).padStart(4, "0")}-${safeUsername}`;

    const permissionOverwrites = [
        {
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel]
        },
        {
            id: user.id,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.EmbedLinks
            ]
        },
        {
            id: interaction.client.user.id,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.ManageChannels,
                PermissionFlagsBits.ManageMessages,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.EmbedLinks
            ]
        }
    ];

    if (config.supportRoleId) {
        permissionOverwrites.push({
            id: config.supportRoleId,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.EmbedLinks
            ]
        });
    }

    const channelOptions = {
        name: channelName,
        type: ChannelType.GuildText,
        permissionOverwrites,
        topic: `Shizu Ticket | Kullanıcı: ${user.tag} | ID: ${user.id}`
    };

    if (config.categoryId) {
        channelOptions.parent = config.categoryId;
    }

    const channel = await guild.channels.create(channelOptions);

    createTicket(guild.id, {
        channelId: channel.id,
        userId: user.id,
        username: user.tag,
        ticketNumber,
        status: "open",
        claimedBy: null,
        createdAt: new Date().toISOString()
    });

    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle("🎫 Ticket Açıldı")
        .setDescription(
            `Merhaba ${user}, destek ekibi kısa süre içinde seninle ilgilenecek.\n\n` +
            "Sorununu mümkün olduğunca detaylı anlatabilirsin."
        )
        .addFields(
            {
                name: "👤 Kullanıcı",
                value: `${user}`,
                inline: true
            },
            {
                name: "🔢 Ticket",
                value: `#${String(ticketNumber).padStart(4, "0")}`,
                inline: true
            },
            {
                name: "📅 Durum",
                value: "Açık",
                inline: true
            }
        )
        .setFooter({
            text: "Shizu Ticket System"
        })
        .setTimestamp();

    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("ticket_claim")
            .setLabel("Ticket'ı Üstlen")
            .setEmoji("🙋")
            .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
            .setCustomId("ticket_close")
            .setLabel("Ticket'ı Kapat")
            .setEmoji("🔒")
            .setStyle(ButtonStyle.Danger)
    );

    await channel.send({
        content: `${user}${config.supportRoleId ? ` <@&${config.supportRoleId}>` : ""}`,
        embeds: [embed],
        components: [buttons]
    });

    await interaction.reply({
        content: `✅ Ticket'ın oluşturuldu: ${channel}`,
        ephemeral: true
    });

    logger.info(
        `Ticket oluşturuldu | ${guild.name} | ${user.tag} | ${channel.name}`
    );
}

async function claimTicket(interaction) {
    const guild = interaction.guild;
    const channel = interaction.channel;

    const ticket = getTicket(guild.id, channel.id);

    if (!ticket) {
        await interaction.reply({
            content: "❌ Bu kanal bir ticket değil.",
            ephemeral: true
        });

        return;
    }

    const config = getConfig(guild.id);

    if (
        config?.supportRoleId &&
        !interaction.member.roles.cache.has(config.supportRoleId) &&
        !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)
    ) {
        await interaction.reply({
            content: "❌ Bu ticket'ı üstlenmek için destek ekibinde olmalısın.",
            ephemeral: true
        });

        return;
    }

    if (ticket.claimedBy) {
        await interaction.reply({
            content: `❌ Bu ticket zaten <@${ticket.claimedBy}> tarafından üstlenildi.`,
            ephemeral: true
        });

        return;
    }

    updateTicket(guild.id, channel.id, {
        claimedBy: interaction.user.id,
        claimedAt: new Date().toISOString()
    });

    const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setDescription(
            `🙋 Ticket **${interaction.user}** tarafından üstlenildi.`
        );

    await channel.send({
        embeds: [embed]
    });

    await interaction.reply({
        content: "✅ Ticket'ı başarıyla üstlendin.",
        ephemeral: true
    });

    logger.info(
        `Ticket üstlenildi | ${guild.name} | ${channel.name} | ${interaction.user.tag}`
    );
}

async function createTranscript(channel) {
    try {
        const messages = await channel.messages.fetch({
            limit: 100
        });

        const sortedMessages = [...messages.values()].reverse();

        let transcript = "";

        transcript += `SHIZU TICKET TRANSCRIPT\n`;
        transcript += `Kanal: #${channel.name}\n`;
        transcript += `Oluşturulma: ${new Date().toLocaleString("tr-TR")}\n`;
        transcript += `${"=".repeat(70)}\n\n`;

        for (const message of sortedMessages) {
            const time = message.createdAt.toLocaleString("tr-TR");

            let content = message.content || "[Ek / Embed / İçerik]";

            if (message.attachments.size > 0) {
                const attachments = [...message.attachments.values()]
                    .map(file => file.url)
                    .join(", ");

                content += ` | Ekler: ${attachments}`;
            }

            transcript += `[${time}] ${message.author.tag}: ${content}\n`;
        }

        return Buffer.from(transcript, "utf8");
    } catch (error) {
        logger.error("Transcript oluşturulamadı.");
        logger.error(error);

        return Buffer.from(
            "Transcript oluşturulurken hata oluştu.",
            "utf8"
        );
    }
}

async function closeTicket(interaction) {
    const guild = interaction.guild;
    const channel = interaction.channel;

    const ticket = getTicket(guild.id, channel.id);

    if (!ticket) {
        await interaction.reply({
            content: "❌ Bu kanal bir ticket değil.",
            ephemeral: true
        });

        return;
    }

    const config = getConfig(guild.id);

    const isSupport =
        config?.supportRoleId &&
        interaction.member.roles.cache.has(config.supportRoleId);

    const isManager =
        interaction.member.permissions.has(
            PermissionFlagsBits.ManageGuild
        );

    const isOwner = ticket.userId === interaction.user.id;

    if (!isSupport && !isManager && !isOwner) {
        await interaction.reply({
            content: "❌ Bu ticket'ı kapatma yetkin yok.",
            ephemeral: true
        });

        return;
    }

    await interaction.reply({
        content: "🔒 Ticket kapatılıyor...",
        ephemeral: true
    });

    updateTicket(guild.id, channel.id, {
        status: "closed",
        closedBy: interaction.user.id,
        closedAt: new Date().toISOString()
    });

    const transcript = await createTranscript(channel);

    try {
        const logChannel = await getOrCreateLogChannel(guild);

        if (logChannel) {
            const embed = new EmbedBuilder()
                .setColor(0xED4245)
                .setTitle("🔒 Ticket Kapatıldı")
                .addFields(
                    {
                        name: "🎫 Ticket",
                        value: `#${String(ticket.ticketNumber).padStart(4, "0")}`,
                        inline: true
                    },
                    {
                        name: "👤 Kullanıcı",
                        value: `<@${ticket.userId}>`,
                        inline: true
                    },
                    {
                        name: "🔒 Kapatan",
                        value: `${interaction.user}`,
                        inline: true
                    }
                )
                .setTimestamp();

            await logChannel.send({
                embeds: [embed],
                files: [
                    {
                        attachment: transcript,
                        name: `${channel.name}-transcript.txt`
                    }
                ]
            });
        }
    } catch (error) {
        logger.error("Ticket transcript log kanalına gönderilemedi.");
        logger.error(error);
    }

    logger.info(
        `Ticket kapatıldı | ${guild.name} | ${channel.name} | ${interaction.user.tag}`
    );

    setTimeout(async () => {
        try {
            deleteTicket(guild.id, channel.id);
            await channel.delete("Ticket kapatıldı.");
        } catch (error) {
            logger.error("Ticket kanalı silinemedi.");
            logger.error(error);
        }
    }, 3000);
}

async function handleTicketButton(interaction) {
    if (!interaction.isButton()) {
        return false;
    }

    if (interaction.customId === "ticket_create") {
        await createTicketChannel(interaction);
        return true;
    }

    if (interaction.customId === "ticket_claim") {
        await claimTicket(interaction);
        return true;
    }

    if (interaction.customId === "ticket_close") {
        await closeTicket(interaction);
        return true;
    }

    return false;
}

module.exports = {
    createTicketChannel,
    claimTicket,
    closeTicket,
    handleTicketButton
};