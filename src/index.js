require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    Partials,
    Collection,
    MessageFlags,
    EmbedBuilder
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const logger = require("./utils/logger");
const database = require("./utils/database");
const { getOrCreateLogChannel, sendLog } = require("./utils/logChannel");
const { handleCommandError } = require("./utils/errorHandler");
const { handleTicketButton } = require("./utils/ticketManager");
const { containsProfanity } = require("./utils/profanityFilter");

// ============================================================
// CLIENT
// ============================================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences
    ],

    partials: [
        Partials.Channel,
        Partials.Message,
        Partials.GuildMember,
        Partials.User
    ]
});

// ============================================================
// COMMANDS
// ============================================================

client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");

if (fs.existsSync(commandsPath)) {

    const commandFiles = fs
        .readdirSync(commandsPath)
        .filter(file => file.endsWith(".js"));

    for (const file of commandFiles) {

        try {

            const filePath = path.join(commandsPath, file);
            const command = require(filePath);

            if (!command.data || !command.execute) {

                logger.warn(
                    `Geçersiz komut dosyası: ${file}`
                );

                continue;
            }

            client.commands.set(
                command.data.name,
                command
            );

            logger.info(
                `Komut yüklendi: /${command.data.name}`
            );

        } catch (error) {

            logger.error(
                `Komut yüklenemedi: ${file} | ${error.message}`
            );
        }
    }
}

logger.info(
    `Toplam ${client.commands.size} komut yüklendi.`
);

// ============================================================
// READY
// ============================================================

client.once("clientReady", async readyClient => {

    try {

        logger.success(
            `${readyClient.user.tag} olarak Discord'a bağlanıldı.`
        );

        logger.info(
            `Bot ID: ${readyClient.user.id}`
        );

        logger.info(
            `Sunucu sayısı: ${readyClient.guilds.cache.size}`
        );

        readyClient.user.setPresence({
            activities: [
                {
                    name: "Shizu",
                    type: 3
                }
            ],
            status: "online"
        });

        // ====================================================
        // SUNUCULARI BAŞLAT
        // ====================================================

        for (const guild of readyClient.guilds.cache.values()) {

            try {

                await database.loadGuild(guild.id);

                await getOrCreateLogChannel(guild);

                logger.info(
                    `Sunucu hazır: ${guild.name} (${guild.id})`
                );

            } catch (error) {

                logger.error(
                    `Sunucu başlatılamadı: ${guild.name} | ${error.message}`
                );
            }
        }

        logger.success("Shizu başarıyla hazır.");

    } catch (error) {

        logger.error(
            `Ready hatası: ${error.message}`
        );
    }
});

// ============================================================
// INTERACTIONS
// ============================================================

client.on("interactionCreate", async interaction => {

    try {

        // ====================================================
        // BUTTON
        // ====================================================

        if (interaction.isButton()) {

            try {

                const handled =
                    await handleTicketButton(interaction);

                if (handled) {
                    return;
                }

            } catch (error) {

                logger.error(
                    `Ticket buton hatası: ${error.message}`
                );

                if (!interaction.replied && !interaction.deferred) {

                    await interaction.reply({
                        content:
                            "❌ İşlem sırasında bir hata oluştu.",
                        flags: MessageFlags.Ephemeral
                    }).catch(() => {});
                }
            }

            return;
        }

        // ====================================================
        // SLASH COMMAND
        // ====================================================

        if (!interaction.isChatInputCommand()) {
            return;
        }

        const command =
            client.commands.get(interaction.commandName);

        if (!command) {

            logger.warn(
                `Bilinmeyen command kullanıldı: /${interaction.commandName}`
            );

            if (!interaction.replied && !interaction.deferred) {

                await interaction.reply({
                    content:
                        "❌ Bu komut artık mevcut değil.",
                    flags: MessageFlags.Ephemeral
                }).catch(() => {});
            }

            return;
        }

        logger.info(
            `Komut kullanıldı: /${interaction.commandName} | ` +
            `Kullanıcı: ${interaction.user.tag} | ` +
            `Sunucu: ${interaction.guild?.name || "DM"}`
        );

        try {

            await command.execute(interaction);

        } catch (error) {

            await handleCommandError(
                interaction,
                error,
                interaction.commandName
            );
        }

    } catch (error) {

        logger.error(
            `Interaction hatası: ${error.message}`
        );
    }
});

// ============================================================
// KÜFÜR FİLTRESİ
// ============================================================

client.on("messageCreate", async message => {

    try {

        // DM mesajlarını kontrol etme
        if (!message.guild) {
            return;
        }

        // Bot mesajlarını kontrol etme
        if (message.author.bot) {
            return;
        }

        // Küfür yoksa devam etme
        if (!containsProfanity(message.content)) {
            return;
        }

        const originalMessage =
            message.content || "(mesaj içeriği yok)";

        const username =
            message.author.tag || message.author.username;

        const channelName =
            message.channel?.name || "bilinmeyen-kanal";

        // ====================================================
        // MESAJI SİL
        // ====================================================

        const deleted =
            await message.delete().catch(() => null);

        // ====================================================
        // KULLANICIYA UYARI
        // ====================================================

        const warning =
            await message.channel.send({
                content:
                    `⚠️ ${message.author}, lütfen bu sunucuda küfür kullanma.`
            }).catch(() => null);

        if (warning) {

            setTimeout(() => {

                warning
                    .delete()
                    .catch(() => {});

            }, 5000);
        }

        // ====================================================
        // KÜFÜR LOGU
        // ====================================================

        try {

            const logChannel =
                await getOrCreateLogChannel(message.guild);

            if (logChannel) {

                let displayMessage =
                    originalMessage;

                // Discord embed alanı maksimum 1024 karakter
                if (displayMessage.length > 1000) {

                    displayMessage =
                        displayMessage.slice(0, 997) + "...";
                }

                const embed =
                    new EmbedBuilder()
                        .setTitle("🚨 Küfür Filtresi")
                        .setColor(0xED4245)
                        .setDescription(
                            `**${message.author}** tarafından küfür içeren bir mesaj gönderildi.`
                        )
                        .addFields(
                            {
                                name: "👤 Kullanıcı",
                                value:
                                    `${message.author}\n` +
                                    `\`${username}\``,
                                inline: true
                            },
                            {
                                name: "🆔 Kullanıcı ID",
                                value:
                                    `\`${message.author.id}\``,
                                inline: true
                            },
                            {
                                name: "📍 Kanal",
                                value:
                                    `${message.channel}`,
                                inline: true
                            },
                            {
                                name: "💬 Mesaj",
                                value:
                                    `\`\`\`\n${displayMessage}\n\`\`\``,
                                inline: false
                            },
                            {
                                name: "🗑️ Mesaj Durumu",
                                value:
                                    deleted
                                        ? "✅ Mesaj silindi"
                                        : "❌ Mesaj silinemedi",
                                inline: true
                            },
                            {
                                name: "⚠️ İşlem",
                                value:
                                    "Kullanıcıya uyarı gönderildi.",
                                inline: true
                            }
                        )
                        .setThumbnail(
                            message.author.displayAvatarURL({
                                extension: "png",
                                size: 128
                            })
                        )
                        .setFooter({
                            text:
                                `Shizu • Küfür Filtresi | ${message.guild.name}`
                        })
                        .setTimestamp();

                await logChannel
                    .send({
                        embeds: [embed]
                    })
                    .catch(error => {

                        logger.error(
                            `Küfür logu Discord'a gönderilemedi: ${error.message}`
                        );
                    });
            }

        } catch (error) {

            logger.error(
                `Küfür log sistemi hatası: ${error.message}`
            );
        }

        // ====================================================
        // DOSYA LOGU
        // ====================================================

        logger.warn(
            `KÜFÜR FİLTRESİ | ` +
            `Kullanıcı: ${username} | ` +
            `ID: ${message.author.id} | ` +
            `Sunucu: ${message.guild.name} | ` +
            `Kanal: #${channelName} | ` +
            `Mesaj: ${originalMessage}`
        );

    } catch (error) {

        logger.error(
            `Küfür filtresi hatası: ${error.message}`
        );
    }
});

// ============================================================
// MEMBER JOIN
// ============================================================

client.on("guildMemberAdd", async member => {

    try {

        logger.info(
            `Üye katıldı: ${member.user.tag} | ` +
            `${member.guild.name}`
        );

        // ====================================================
        // DATABASE
        // ====================================================

        await database.loadGuild(member.guild.id);

        // ====================================================
        // LOG
        // ====================================================

        await sendLog(
            member.guild,
            "👋 Yeni Üye Katıldı",
            `**${member.user.tag}** sunucuya katıldı.`,
            0x57F287
        );

        // ====================================================
        // WELCOME SYSTEM
        // ====================================================

        let guildData;

        try {

            guildData =
                await database.loadGuild(
                    member.guild.id
                );

        } catch {
            guildData = null;
        }

        if (
            !guildData ||
            !guildData.welcome ||
            !guildData.welcome.enabled
        ) {
            return;
        }

        const welcomeChannelId =
            guildData.welcome.channelId;

        if (!welcomeChannelId) {
            return;
        }

        const welcomeChannel =
            member.guild.channels.cache.get(
                welcomeChannelId
            );

        if (!welcomeChannel) {
            return;
        }

        const welcomeMessage =
            guildData.welcome.message ||
            `👋 Hoş geldin ${member}!`;

        const formattedMessage =
            welcomeMessage
                .replace(
                    /\{user\}/gi,
                    `${member}`
                )
                .replace(
                    /\{username\}/gi,
                    member.user.username
                )
                .replace(
                    /\{server\}/gi,
                    member.guild.name
                );

        await welcomeChannel.send({
            content: formattedMessage
        }).catch(() => {});

    } catch (error) {

        logger.error(
            `guildMemberAdd hatası: ${error.message}`
        );
    }
});

// ============================================================
// MEMBER LEAVE
// ============================================================

client.on("guildMemberRemove", async member => {

    try {

        logger.info(
            `Üye ayrıldı: ${member.user.tag} | ` +
            `${member.guild.name}`
        );

        await sendLog(
            member.guild,
            "👋 Üye Ayrıldı",
            `**${member.user.tag}** sunucudan ayrıldı.`,
            0xED4245
        );

    } catch (error) {

        logger.error(
            `guildMemberRemove hatası: ${error.message}`
        );
    }
});

// ============================================================
// MESSAGE DELETE
// ============================================================

client.on("messageDelete", async message => {

    try {

        if (!message.guild) {
            return;
        }

        if (message.author?.bot) {
            return;
        }

        if (!message.content) {
            return;
        }

        await sendLog(
            message.guild,
            "🗑️ Mesaj Silindi",
            `**${message.author?.tag || "Bilinmeyen kullanıcı"}** tarafından gönderilen mesaj silindi.\n\n` +
            `**Kanal:** ${message.channel}\n` +
            `**Mesaj:** ${message.content.slice(0, 1000)}`,
            0xFEE75C
        );

    } catch (error) {

        logger.error(
            `messageDelete hatası: ${error.message}`
        );
    }
});

// ============================================================
// CLIENT ERROR
// ============================================================

client.on("error", error => {

    logger.error(
        `Discord Client Error: ${error.message}`
    );
});

// ============================================================
// CLIENT WARN
// ============================================================

client.on("warn", warning => {

    logger.warn(
        `Discord Client Warning: ${warning}`
    );
});

// ============================================================
// UNHANDLED REJECTION
// ============================================================

process.on("unhandledRejection", error => {

    logger.error(
        `Unhandled Rejection: ${
            error?.stack || error
        }`
    );
});

// ============================================================
// UNCAUGHT EXCEPTION
// ============================================================

process.on("uncaughtException", error => {

    logger.error(
        `Uncaught Exception: ${
            error?.stack || error
        }`
    );
});

// ============================================================
// NODE WARNING
// ============================================================

process.on("warning", warning => {

    logger.warn(
        `Node Warning: ${warning.message}`
    );
});

// ============================================================
// SHUTDOWN
// ============================================================

async function shutdown(signal) {

    try {

        logger.info(
            `${signal} alındı. Bot kapatılıyor...`
        );

        client.destroy();

        logger.success(
            "Shizu güvenli şekilde kapatıldı."
        );

        process.exit(0);

    } catch (error) {

        logger.error(
            `Shutdown hatası: ${error.message}`
        );

        process.exit(1);
    }
}

process.on(
    "SIGINT",
    () => shutdown("SIGINT")
);

process.on(
    "SIGTERM",
    () => shutdown("SIGTERM")
);

// ============================================================
// LOGIN
// ============================================================

if (!process.env.DISCORD_TOKEN) {

    logger.error(
        "DISCORD_TOKEN bulunamadı! .env dosyasını kontrol et."
    );

    process.exit(1);
}

client.login(
    process.env.DISCORD_TOKEN
).catch(error => {

    logger.error(
        `Discord'a giriş başarısız: ${error.message}`
    );

    process.exit(1);
});