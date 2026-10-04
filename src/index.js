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

const logger =
    require("./utils/logger");

const database =
    require("./utils/database");

const {
    getOrCreateLogChannel,
    sendLog
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
    handleVoiceXP
} = require("./utils/levelingManager");

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

client.commands =
    new Collection();

const commandsPath =
    path.join(
        __dirname,
        "commands"
    );

if (
    fs.existsSync(
        commandsPath
    )
) {

    const commandFiles =
        fs.readdirSync(
            commandsPath
        )
        .filter(
            file =>
                file.endsWith(".js")
        );

    for (
        const file
        of commandFiles
    ) {

        try {

            const filePath =
                path.join(
                    commandsPath,
                    file
                );

            const command =
                require(filePath);

            if (
                !command.data ||
                !command.execute
            ) {

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

client.once(
    "clientReady",
    async readyClient => {

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
                        name:
                            "Shizu • /rank",
                        type: 3
                    }
                ],

                status:
                    "online"
            });

            // =================================================
            // SUNUCULAR
            // =================================================

            for (
                const guild
                of readyClient.guilds.cache.values()
            ) {

                try {

                    await database.loadGuild(
                        guild.id
                    );

                    await getOrCreateLogChannel(
                        guild
                    );

                    logger.info(
                        `Sunucu hazır: ${guild.name} (${guild.id})`
                    );

                } catch (error) {

                    logger.error(
                        `Sunucu başlatılamadı: ${guild.name} | ${error.message}`
                    );
                }
            }

            logger.success(
                "Shizu başarıyla hazır."
            );

        } catch (error) {

            logger.error(
                `Ready hatası: ${error.message}`
            );
        }
    }
);

// ============================================================
// INTERACTIONS
// ============================================================

client.on(
    "interactionCreate",
    async interaction => {

        try {

            // =================================================
            // BUTTON
            // =================================================

            if (
                interaction.isButton()
            ) {

                try {

                    const handled =
                        await handleTicketButton(
                            interaction
                        );

                    if (handled) {
                        return;
                    }

                } catch (error) {

                    logger.error(
                        `Ticket buton hatası: ${error.message}`
                    );

                    if (
                        !interaction.replied &&
                        !interaction.deferred
                    ) {

                        await interaction.reply({

                            content:
                                "❌ İşlem sırasında bir hata oluştu.",

                            flags:
                                MessageFlags.Ephemeral

                        }).catch(() => {});
                    }
                }

                return;
            }

            // =================================================
            // SLASH COMMAND
            // =================================================

            if (
                !interaction.isChatInputCommand()
            ) {
                return;
            }

            const command =
                client.commands.get(
                    interaction.commandName
                );

            if (!command) {

                logger.warn(
                    `Bilinmeyen command: /${interaction.commandName}`
                );

                if (
                    !interaction.replied &&
                    !interaction.deferred
                ) {

                    await interaction.reply({

                        content:
                            "❌ Bu komut mevcut değil.",

                        flags:
                            MessageFlags.Ephemeral

                    }).catch(() => {});
                }

                return;
            }

            logger.info(
                `Komut: /${interaction.commandName} | ` +
                `Kullanıcı: ${interaction.user.tag} | ` +
                `Sunucu: ${interaction.guild?.name || "DM"}`
            );

            try {

                await command.execute(
                    interaction
                );

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
    }
);

// ============================================================
// MESSAGE CREATE
// ============================================================

client.on(
    "messageCreate",
    async message => {

        try {

            if (!message.guild) {
                return;
            }

            if (message.author.bot) {
                return;
            }

            // =================================================
            // RANK PREFIX COMMAND
            // =================================================

            if (
                message.content
                    .trim()
                    .toLowerCase() ===
                "!rank"
            ) {

                const {
                    getRankInfo
                } =
                    require(
                        "./utils/levelingManager"
                    );

                const {
                    getUserRank
                } =
                    require(
                        "./utils/levelingStore"
                    );

                const info =
                    getRankInfo(
                        message.guild.id,
                        message.author.id
                    );

                const position =
                    getUserRank(
                        message.guild.id,
                        message.author.id
                    );

                const progress =
                    Math.min(
                        Math.floor(
                            (
                                info.xpInLevel /
                                info.xpNeeded
                            ) * 100
                        ),
                        100
                    );

                const filled =
                    Math.round(
                        (
                            progress /
                            100
                        ) * 10
                    );

                const bar =
                    "█".repeat(filled) +
                    "░".repeat(
                        10 - filled
                    );

                const embed =
                    new EmbedBuilder()
                        .setTitle(
                            `📊 ${message.author.username}`
                        )
                        .setThumbnail(
                            message.author.displayAvatarURL({
                                size: 256
                            })
                        )
                        .setColor(
                            0x5865F2
                        )
                        .addFields(

                            {
                                name:
                                    "🏆 Level",
                                value:
                                    `**${info.level}**`,
                                inline:
                                    true
                            },

                            {
                                name:
                                    "⭐ XP",
                                value:
                                    `**${info.xp} XP**`,
                                inline:
                                    true
                            },

                            {
                                name:
                                    "🥇 Sıralama",
                                value:
                                    `**#${position || "?"}**`,
                                inline:
                                    true
                            },

                            {
                                name:
                                    "📈 İlerleme",
                                value:
                                    `${bar} **${progress}%**\n` +
                                    `${info.xpInLevel} / ${info.xpNeeded} XP`,
                                inline:
                                    false
                            }
                        )
                        .setFooter({
                            text:
                                "Shizu XP Sistemi"
                        })
                        .setTimestamp();

                await message.reply({
                    embeds: [embed]
                });

                return;
            }

            // =================================================
            // LEADERBOARD PREFIX COMMAND
            // =================================================

            const prefixCommand =
                message.content
                    .trim()
                    .toLowerCase();

            if (
                prefixCommand === "!top" ||
                prefixCommand === "!leaderboard"
            ) {

                const {
                    getLeaderboard
                } =
                    require(
                        "./utils/levelingStore"
                    );

                const leaderboard =
                    getLeaderboard(
                        message.guild.id
                    ).slice(0, 10);

                if (
                    !leaderboard.length
                ) {

                    await message.reply(
                        "📊 Henüz XP kazanan kimse yok."
                    );

                    return;
                }

                const lines = [];

                for (
                    let i = 0;
                    i < leaderboard.length;
                    i++
                ) {

                    const data =
                        leaderboard[i];

                    const member =
                        await message.guild.members
                            .fetch(
                                data.userId
                            )
                            .catch(
                                () => null
                            );

                    const username =
                        member?.user.username ||
                        "Bilinmeyen Kullanıcı";

                    let medal;

                    if (i === 0) {
                        medal = "🥇";
                    } else if (i === 1) {
                        medal = "🥈";
                    } else if (i === 2) {
                        medal = "🥉";
                    } else {
                        medal =
                            `**${i + 1}.**`;
                    }

                    lines.push(
                        `${medal} **${username}** — ` +
                        `Level ${data.level} • ` +
                        `${data.xp} XP`
                    );
                }

                await message.reply(
                    "🏆 **Shizu XP Liderlik Tablosu**\n\n" +
                    lines.join("\n")
                );

                return;
            }

            // =================================================
            // MESSAGE XP
            // =================================================

            await handleMessageXP(
                message
            );

            // =================================================
            // PROFANITY FILTER
            // =================================================

            if (
                !containsProfanity(
                    message.content
                )
            ) {
                return;
            }

            const originalMessage =
                message.content ||
                "(mesaj içeriği yok)";

            const username =
                message.author.tag ||
                message.author.username;

            const channelName =
                message.channel?.name ||
                "bilinmeyen-kanal";

            // =================================================
            // DELETE
            // =================================================

            const deleted =
                await message.delete()
                    .catch(
                        () => null
                    );

            // =================================================
            // WARNING
            // =================================================

            const warning =
                await message.channel.send({

                    content:
                        `⚠️ ${message.author}, lütfen bu sunucuda küfür kullanma.`

                }).catch(
                    () => null
                );

            if (warning) {

                setTimeout(
                    () => {

                        warning
                            .delete()
                            .catch(
                                () => {}
                            );

                    },
                    5000
                );
            }

            // =================================================
            // DISCORD LOG
            // =================================================

            try {

                const logChannel =
                    await getOrCreateLogChannel(
                        message.guild
                    );

                if (logChannel) {

                    let displayMessage =
                        originalMessage;

                    if (
                        displayMessage.length >
                        1000
                    ) {

                        displayMessage =
                            displayMessage.slice(
                                0,
                                997
                            ) + "...";
                    }

                    const embed =
                        new EmbedBuilder()
                            .setTitle(
                                "🚨 Küfür Filtresi"
                            )
                            .setColor(
                                0xED4245
                            )
                            .setDescription(
                                `**${message.author}** tarafından küfür içeren bir mesaj algılandı.`
                            )
                            .addFields(

                                {
                                    name:
                                        "👤 Kullanıcı",
                                    value:
                                        `${message.author}\n` +
                                        `\`${username}\``,
                                    inline:
                                        true
                                },

                                {
                                    name:
                                        "🆔 Kullanıcı ID",
                                    value:
                                        `\`${message.author.id}\``,
                                    inline:
                                        true
                                },

                                {
                                    name:
                                        "📍 Kanal",
                                    value:
                                        `${message.channel}`,
                                    inline:
                                        true
                                },

                                {
                                    name:
                                        "💬 Mesaj",
                                    value:
                                        `\`\`\`\n${displayMessage}\n\`\`\``,
                                    inline:
                                        false
                                },

                                {
                                    name:
                                        "🗑️ Durum",
                                    value:
                                        deleted
                                            ? "✅ Mesaj silindi"
                                            : "❌ Mesaj silinemedi",
                                    inline:
                                        true
                                },

                                {
                                    name:
                                        "⚠️ İşlem",
                                    value:
                                        "Kullanıcı uyarıldı.",
                                    inline:
                                        true
                                }
                            )
                            .setThumbnail(
                                message.author.displayAvatarURL({
                                    size: 128
                                })
                            )
                            .setFooter({
                                text:
                                    `Shizu • Küfür Filtresi | ${message.guild.name}`
                            })
                            .setTimestamp();

                    await logChannel.send({
                        embeds: [embed]
                    }).catch(
                        error => {

                            logger.error(
                                `Küfür logu gönderilemedi: ${error.message}`
                            );
                        }
                    );
                }

            } catch (error) {

                logger.error(
                    `Küfür log sistemi hatası: ${error.message}`
                );
            }

            // =================================================
            // FILE LOG
            // =================================================

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
                `messageCreate hatası: ${error.message}`
            );
        }
    }
);

// ============================================================
// VOICE XP TIMER
// ============================================================

setInterval(
    async () => {

        try {

            await handleVoiceXP(
                client
            );

        } catch (error) {

            logger.error(
                `Voice XP hatası: ${error.message}`
            );
        }

    },
    60 * 1000
);

// ============================================================
// MEMBER JOIN
// ============================================================

client.on(
    "guildMemberAdd",
    async member => {

        try {

            logger.info(
                `Üye katıldı: ${member.user.tag} | ${member.guild.name}`
            );

            await database.loadGuild(
                member.guild.id
            );

            await sendLog(
                member.guild,
                "👋 Yeni Üye Katıldı",
                `**${member.user.tag}** sunucuya katıldı.`,
                0x57F287
            );

            let guildData;

            try {

                guildData =
                    await database.loadGuild(
                        member.guild.id
                    );

            } catch {

                guildData =
                    null;
            }

            if (
                !guildData ||
                !guildData.welcome ||
                !guildData.welcome.enabled
            ) {
                return;
            }

            const channelId =
                guildData.welcome.channelId;

            if (!channelId) {
                return;
            }

            const welcomeChannel =
                member.guild.channels.cache.get(
                    channelId
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
                content:
                    formattedMessage
            }).catch(
                () => {}
            );

        } catch (error) {

            logger.error(
                `guildMemberAdd hatası: ${error.message}`
            );
        }
    }
);

// ============================================================
// MEMBER LEAVE
// ============================================================

client.on(
    "guildMemberRemove",
    async member => {

        try {

            logger.info(
                `Üye ayrıldı: ${member.user.tag} | ${member.guild.name}`
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
    }
);

// ============================================================
// MESSAGE DELETE
// ============================================================

client.on(
    "messageDelete",
    async message => {

        try {

            if (!message.guild) {
                return;
            }

            if (
                message.author?.bot
            ) {
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
    }
);

// ============================================================
// CLIENT ERROR
// ============================================================

client.on(
    "error",
    error => {

        logger.error(
            `Discord Client Error: ${error.message}`
        );
    }
);

// ============================================================
// CLIENT WARNING
// ============================================================

client.on(
    "warn",
    warning => {

        logger.warn(
            `Discord Client Warning: ${warning}`
        );
    }
);

// ============================================================
// UNHANDLED REJECTION
// ============================================================

process.on(
    "unhandledRejection",
    error => {

        logger.error(
            `Unhandled Rejection: ${error?.stack || error}`
        );
    }
);

// ============================================================
// UNCAUGHT EXCEPTION
// ============================================================

process.on(
    "uncaughtException",
    error => {

        logger.error(
            `Uncaught Exception: ${error?.stack || error}`
        );
    }
);

// ============================================================
// NODE WARNING
// ============================================================

process.on(
    "warning",
    warning => {

        logger.warn(
            `Node Warning: ${warning.message}`
        );
    }
);

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
    () =>
        shutdown("SIGINT")
);

process.on(
    "SIGTERM",
    () =>
        shutdown("SIGTERM")
);

// ============================================================
// TOKEN
// ============================================================

if (
    !process.env.DISCORD_TOKEN
) {

    logger.error(
        "DISCORD_TOKEN bulunamadı! .env dosyasını kontrol et."
    );

    process.exit(1);
}

// ============================================================
// LOGIN
// ============================================================

client.login(
    process.env.DISCORD_TOKEN
).catch(
    error => {

        logger.error(
            `Discord'a giriş başarısız: ${error.message}`
        );

        process.exit(1);
    }
);