require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    Partials,
    Collection,
    EmbedBuilder,
    MessageFlags
} = require("discord.js");

const fs = require("fs");
const path = require("path");

// ===============================
// UTILS
// ===============================

const logger = require("./utils/logger");
const database = require("./utils/database");
const {
    getOrCreateLogChannel
} = require("./utils/logChannel");

const {
    handleCommandError
} = require("./utils/errorHandler");

const {
    handleTicketButton
} = require("./utils/ticketManager");

const {
    containsProfanity
} = require("./utils/profanityFilter");

const {
    handleMessageXP,
    handleVoiceXP,
    getRankInfo
} = require("./utils/levelingManager");

const {
    getUserRank,
    getLeaderboard
} = require("./utils/levelingStore");

// ===============================
// CLIENT
// ===============================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates
    ],

    partials: [
        Partials.Channel,
        Partials.Message,
        Partials.GuildMember,
        Partials.User
    ]
});

// ===============================
// COMMANDS
// ===============================

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
                    `${file} geçersiz command dosyası.`
                );
                continue;
            }

            client.commands.set(
                command.data.name,
                command
            );

            logger.info(
                `Command yüklendi: /${command.data.name}`
            );

        } catch (error) {
            logger.error(
                `${file} yüklenemedi: ${error.message}`
            );
        }
    }
}

logger.info(
    `Toplam ${client.commands.size} slash command yüklendi.`
);

// ===============================
// READY
// ===============================

client.once("clientReady", async () => {
    try {
        logger.success(
            `Shizu giriş yaptı: ${client.user.tag}`
        );

        logger.info(
            `Sunucu sayısı: ${client.guilds.cache.size}`
        );

        client.user.setPresence({
            activities: [
                {
                    name: "Shizu • /rank",
                    type: 0
                }
            ],
            status: "online"
        });

        // Sunucuları başlat
        for (const guild of client.guilds.cache.values()) {
            try {
                await database.loadGuild(guild.id);

                await getOrCreateLogChannel(guild);

                logger.info(
                    `Sunucu hazır: ${guild.name}`
                );

            } catch (error) {
                logger.error(
                    `${guild.name} başlatılırken hata: ${error.message}`
                );
            }
        }

        logger.success(
            "Shizu tamamen hazır!"
        );

    } catch (error) {
        logger.error(
            `Ready hatası: ${error.message}`
        );
    }
});

// ===============================
// INTERACTIONS
// ===============================

client.on("interactionCreate", async interaction => {

    // ===========================
    // TICKET BUTTON
    // ===========================

    if (interaction.isButton()) {
        try {
            const handled =
                await handleTicketButton(interaction);

            if (handled) return;

        } catch (error) {
            logger.error(
                `Ticket button hatası: ${error.message}`
            );

            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({
                        content:
                            "❌ Ticket işlemi sırasında bir hata oluştu.",
                        flags: MessageFlags.Ephemeral
                    });
                } catch {}
            }
        }

        return;
    }

    // ===========================
    // SLASH COMMAND
    // ===========================

    if (!interaction.isChatInputCommand()) {
        return;
    }

    const command =
        client.commands.get(
            interaction.commandName
        );

    if (!command) {
        logger.warn(
            `Bilinmeyen command kullanıldı: /${interaction.commandName}`
        );

        return;
    }

    try {

        await command.execute(
            interaction,
            client
        );

        logger.info(
            `${interaction.user.tag} → /${interaction.commandName}`
        );

    } catch (error) {

        logger.error(
            `/ ${interaction.commandName} hatası: ${error.stack || error.message}`
        );

        try {
            await handleCommandError(
                interaction,
                error
            );
        } catch (handlerError) {
            logger.error(
                `Command error handler hatası: ${handlerError.message}`
            );
        }
    }
});

// ===============================
// MESSAGE CREATE
// ===============================

client.on("messageCreate", async message => {

    if (!message.guild) return;
    if (message.author.bot) return;

    try {

        // ===========================
        // PREFIX RANK
        // ===========================

        if (
            message.content.toLowerCase().trim() ===
            "!rank"
        ) {
            try {

                const info = getRankInfo(
                    message.guild.id,
                    message.author.id
                );

                const rank =
                    getUserRank(
                        message.guild.id,
                        message.author.id
                    );

                const progress =
                    Math.min(
                        10,
                        Math.max(
                            0,
                            Math.floor(
                                (
                                    info.xpInLevel /
                                    Math.max(
                                        1,
                                        info.nextLevelXP -
                                        info.currentLevelXP
                                    )
                                ) * 10
                            )
                        )
                    );

                const progressBar =
                    "🟦".repeat(progress) +
                    "⬛".repeat(10 - progress);

                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setTitle(`📊 ${message.author.username}`)
                    .setThumbnail(
                        message.author.displayAvatarURL({
                            size: 256
                        })
                    )
                    .addFields(
                        {
                            name: "🏆 Level",
                            value: `${info.level}`,
                            inline: true
                        },
                        {
                            name: "✨ XP",
                            value: `${info.xp}`,
                            inline: true
                        },
                        {
                            name: "🥇 Sıralama",
                            value: rank
                                ? `#${rank}`
                                : "Unranked",
                            inline: true
                        },
                        {
                            name: "📈 İlerleme",
                            value:
                                `${progressBar}\n` +
                                `${info.xpInLevel} / ` +
                                `${info.nextLevelXP - info.currentLevelXP} XP`,
                            inline: false
                        },
                        {
                            name: "💬 Mesaj",
                            value:
                                `${info.totalMessages || 0}`,
                            inline: true
                        },
                        {
                            name: "🎙️ Voice",
                            value:
                                `${info.voiceMinutes || 0} dakika`,
                            inline: true
                        }
                    )
                    .setTimestamp();

                await message.reply({
                    embeds: [embed]
                });

            } catch (error) {
                logger.error(
                    `!rank hatası: ${error.message}`
                );
            }

            return;
        }

        // ===========================
        // PREFIX TOP
        // ===========================

        const prefixContent =
            message.content
                .toLowerCase()
                .trim();

        if (
            prefixContent === "!top" ||
            prefixContent === "!leaderboard"
        ) {
            try {

                const leaderboard =
                    getLeaderboard(
                        message.guild.id
                    ).slice(0, 10);

                if (!leaderboard.length) {
                    await message.reply(
                        "📊 Henüz XP sıralamasında kimse yok."
                    );

                    return;
                }

                let description = "";

                for (
                    let i = 0;
                    i < leaderboard.length;
                    i++
                ) {

                    const user =
                        leaderboard[i];

                    const member =
                        await message.guild.members
                            .fetch(user.userId)
                            .catch(() => null);

                    const username =
                        member?.user?.username ||
                        `Bilinmeyen Kullanıcı`;

                    let medal;

                    if (i === 0) medal = "🥇";
                    else if (i === 1) medal = "🥈";
                    else if (i === 2) medal = "🥉";
                    else medal = `**${i + 1}.**`;

                    description +=
                        `${medal} **${username}** — ` +
                        `Level ${user.level} • ` +
                        `${user.xp} XP\n`;
                }

                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setTitle("🏆 Shizu XP Leaderboard")
                    .setDescription(description)
                    .setTimestamp();

                await message.reply({
                    embeds: [embed]
                });

            } catch (error) {
                logger.error(
                    `!top hatası: ${error.message}`
                );
            }

            return;
        }

        // ===========================
        // KÜFÜR FİLTRESİ
        // ===========================

        if (containsProfanity(message.content)) {

            const originalContent =
                message.content;

            let deleted = false;

            try {
                await message.delete();
                deleted = true;
            } catch (error) {
                logger.warn(
                    `Küfürlü mesaj silinemedi: ${error.message}`
                );
            }

            // Uyarı
            try {

                const warning =
                    await message.channel.send({
                        content:
                            `⚠️ ${message.author}, ` +
                            `lütfen küfür kullanma.`
                    });

                setTimeout(async () => {
                    try {
                        await warning.delete();
                    } catch {}
                }, 5000);

            } catch (error) {
                logger.warn(
                    `Küfür uyarısı gönderilemedi: ${error.message}`
                );
            }

            // Log
            try {

                const logChannel =
                    await getOrCreateLogChannel(
                        message.guild
                    );

                if (logChannel) {

                    const safeContent =
                        originalContent.length > 1000
                            ? originalContent.slice(0, 997) + "..."
                            : originalContent;

                    const embed =
                        new EmbedBuilder()
                            .setColor(0xED4245)
                            .setTitle("🚨 Küfür Filtresi")
                            .addFields(
                                {
                                    name: "👤 Kullanıcı",
                                    value:
                                        `${message.author}\n` +
                                        `${message.author.tag}`,
                                    inline: true
                                },
                                {
                                    name: "🆔 ID",
                                    value:
                                        message.author.id,
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
                                        `\`\`\`\n${safeContent}\n\`\`\``,
                                    inline: false
                                },
                                {
                                    name: "🗑️ Silindi",
                                    value:
                                        deleted
                                            ? "Evet"
                                            : "Hayır",
                                    inline: true
                                }
                            )
                            .setTimestamp();

                    await logChannel.send({
                        embeds: [embed]
                    });
                }

            } catch (error) {
                logger.error(
                    `Küfür log hatası: ${error.message}`
                );
            }

            logger.warn(
                `Küfür tespit edildi: ${message.author.tag} → ${originalContent}`
            );

            // Küfürlü mesaja XP verme
            return;
        }

        // ===========================
        // MESSAGE XP
        // ===========================

        try {
            await handleMessageXP(message);
        } catch (error) {
            logger.error(
                `Message XP hatası: ${error.message}`
            );
        }

    } catch (error) {

        logger.error(
            `messageCreate hatası: ${error.stack || error.message}`
        );
    }
});

// ===============================
// VOICE XP
// ===============================

setInterval(async () => {

    try {

        await handleVoiceXP(client);

    } catch (error) {

        logger.error(
            `Voice XP hatası: ${error.message}`
        );
    }

}, 60 * 1000);

// ===============================
// MEMBER JOIN
// ===============================

client.on("guildMemberAdd", async member => {

    try {

        logger.info(
            `${member.user.tag} sunucuya katıldı: ${member.guild.name}`
        );

        const logChannel =
            await getOrCreateLogChannel(
                member.guild
            );

        if (logChannel) {

            const embed =
                new EmbedBuilder()
                    .setColor(0x57F287)
                    .setTitle("📥 Yeni Üye")
                    .setDescription(
                        `${member} sunucuya katıldı.`
                    )
                    .addFields(
                        {
                            name: "👤 Kullanıcı",
                            value:
                                `${member.user.tag}`,
                            inline: true
                        },
                        {
                            name: "🆔 ID",
                            value:
                                member.id,
                            inline: true
                        },
                        {
                            name: "📅 Hesap",
                            value:
                                `<t:${Math.floor(
                                    member.user.createdTimestamp / 1000
                                )}:R>`,
                            inline: true
                        }
                    )
                    .setThumbnail(
                        member.user.displayAvatarURL({
                            size: 256
                        })
                    )
                    .setTimestamp();

            await logChannel.send({
                embeds: [embed]
            });
        }

    } catch (error) {

        logger.error(
            `guildMemberAdd hatası: ${error.message}`
        );
    }
});

// ===============================
// MEMBER LEAVE
// ===============================

client.on("guildMemberRemove", async member => {

    try {

        logger.info(
            `${member.user.tag} sunucudan ayrıldı: ${member.guild.name}`
        );

        const logChannel =
            await getOrCreateLogChannel(
                member.guild
            );

        if (logChannel) {

            const embed =
                new EmbedBuilder()
                    .setColor(0xED4245)
                    .setTitle("📤 Üye Ayrıldı")
                    .setDescription(
                        `${member.user.tag} sunucudan ayrıldı.`
                    )
                    .addFields(
                        {
                            name: "👤 Kullanıcı",
                            value:
                                `${member.user.tag}`,
                            inline: true
                        },
                        {
                            name: "🆔 ID",
                            value:
                                member.id,
                            inline: true
                        }
                    )
                    .setTimestamp();

            await logChannel.send({
                embeds: [embed]
            });
        }

    } catch (error) {

        logger.error(
            `guildMemberRemove hatası: ${error.message}`
        );
    }
});

// ===============================
// MESSAGE DELETE LOG
// ===============================

client.on("messageDelete", async message => {

    try {

        if (!message.guild) return;
        if (message.author?.bot) return;

        const logChannel =
            await getOrCreateLogChannel(
                message.guild
            );

        if (!logChannel) return;

        const content =
            message.content || "Mesaj içeriği alınamadı.";

        const safeContent =
            content.length > 1000
                ? content.slice(0, 997) + "..."
                : content;

        const embed =
            new EmbedBuilder()
                .setColor(0xFEE75C)
                .setTitle("🗑️ Mesaj Silindi")
                .addFields(
                    {
                        name: "👤 Kullanıcı",
                        value:
                            message.author
                                ? `${message.author.tag}`
                                : "Bilinmiyor",
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
                            `\`\`\`\n${safeContent}\n\`\`\``,
                        inline: false
                    }
                )
                .setTimestamp();

        await logChannel.send({
            embeds: [embed]
        });

    } catch (error) {

        logger.error(
            `messageDelete hatası: ${error.message}`
        );
    }
});

// ===============================
// CLIENT ERROR
// ===============================

client.on("error", error => {

    logger.error(
        `Discord client hatası: ${error.stack || error.message}`
    );
});

// ===============================
// CLIENT WARN
// ===============================

client.on("warn", warning => {

    logger.warn(
        `Discord.js uyarısı: ${warning}`
    );
});

// ===============================
// UNHANDLED REJECTION
// ===============================

process.on(
    "unhandledRejection",
    error => {

        logger.error(
            `Unhandled Rejection: ${error?.stack || error}`
        );
    }
);

// ===============================
// UNCAUGHT EXCEPTION
// ===============================

process.on(
    "uncaughtException",
    error => {

        logger.error(
            `Uncaught Exception: ${error.stack || error.message}`
        );
    }
);

// ===============================
// NODE WARNING
// ===============================

process.on(
    "warning",
    warning => {

        logger.warn(
            `Node warning: ${warning.name}: ${warning.message}`
        );
    }
);

// ===============================
// SHUTDOWN
// ===============================

async function shutdown(signal) {

    logger.info(
        `${signal} alındı. Shizu kapatılıyor...`
    );

    try {

        client.destroy();

        logger.info(
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

// ===============================
// LOGIN
// ===============================

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
        `Discord login hatası: ${error.stack || error.message}`
    );

    process.exit(1);
});