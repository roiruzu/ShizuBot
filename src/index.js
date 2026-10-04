require("dotenv").config();

const logger = require("./utils/logger");

const {
    Client,
    Collection,
    GatewayIntentBits,
    Partials,
    PermissionsBitField,
    MessageFlags
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const { loadGuild } = require("./utils/database");

const { handleCommandError } = require("./utils/errorHandler");

const { handleWarningError } = require("./utils/warningErrorHandler");

const { getOrCreateLogChannel } = require("./utils/logChannel");

// ============================================================
// ENV CHECK
// ============================================================

if (!process.env.DISCORD_TOKEN) {
    console.error(
        "❌ DISCORD_TOKEN .env dosyasında bulunamadı."
    );

    process.exit(1);
}

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
// COMMAND COLLECTION
// ============================================================

client.commands = new Collection();

// ============================================================
// LOAD COMMANDS
// ============================================================

const commandsPath = path.join(
    __dirname,
    "commands"
);

if (fs.existsSync(commandsPath)) {
    const commandFiles = fs
        .readdirSync(commandsPath)
        .filter(file => file.endsWith(".js"));

    for (const file of commandFiles) {
        const filePath = path.join(
            commandsPath,
            file
        );

        try {
            const command = require(filePath);

            if (!command.data || !command.execute) {
                logger.warn(
                    `Geçersiz command dosyası atlandı: ${file}`
                );

                continue;
            }

            const commandName = command.data.name;

            if (!commandName) {
                logger.warn(
                    `Command adı bulunamadı: ${file}`
                );

                continue;
            }

            if (client.commands.has(commandName)) {
                logger.warn(
                    `Aynı command zaten yüklü: /${commandName}`
                );

                continue;
            }

            client.commands.set(
                commandName,
                command
            );

            logger.info(
                `Command yüklendi: /${commandName}`
            );
        } catch (error) {
            logger.error(
                `Command yüklenemedi: ${file}`
            );

            logger.error(error);
        }
    }
} else {
    logger.warn(
        "Commands klasörü bulunamadı."
    );
}

logger.info(
    `Toplam ${client.commands.size} command yüklendi.`
);

// ============================================================
// CLIENT READY
// ============================================================

client.once(
    "clientReady",
    async () => {
        logger.success(
            `Shizu olarak giriş yapıldı: ${client.user.tag}`
        );

        logger.info(
            `Bot ID: ${client.user.id}`
        );

        logger.info(
            `Sunucu sayısı: ${client.guilds.cache.size}`
        );

        logger.info(
            `Command sayısı: ${client.commands.size}`
        );

        // ====================================================
        // LOG KANALLARINI HAZIRLA
        // ====================================================

        for (
            const guild of client.guilds.cache.values()
        ) {
            try {
                // Bot üyesini yenile
                const botMember =
                    guild.members.me ||
                    await guild.members
                        .fetch(client.user.id)
                        .catch(() => null);

                if (!botMember) {
                    logger.error(
                        `Bot üyesi bulunamadı: ${guild.name}`
                    );

                    continue;
                }

                // Kanal oluşturma yetkisini kontrol et
                if (
                    !botMember.permissions.has(
                        PermissionsBitField.Flags.ManageChannels
                    )
                ) {
                    logger.error(
                        `Log kanalı oluşturulamıyor: Botta Manage Channels yetkisi yok. | ${guild.name}`
                    );

                    continue;
                }

                const logChannel =
                    await getOrCreateLogChannel(
                        guild
                    );

                if (logChannel) {
                    logger.success(
                        `Log kanalı hazır: ${guild.name} | #${logChannel.name} (${logChannel.id})`
                    );
                }
            } catch (error) {
                logger.error(
                    `Log kanalı hazırlanamadı: ${guild.name} (${guild.id})`
                );

                logger.error(error);
            }
        }

        // ====================================================
        // LOAD GUILD DATA
        // ====================================================

        for (
            const guild of client.guilds.cache.values()
        ) {
            try {
                await loadGuild(
                    guild.id
                );

                logger.info(
                    `Guild verisi yüklendi: ${guild.name} (${guild.id})`
                );
            } catch (error) {
                logger.error(
                    `Guild verisi yüklenemedi: ${guild.name} (${guild.id})`
                );

                logger.error(error);
            }
        }

        logger.success(
            "Shizu tamamen aktif."
        );
    }
);

// ============================================================
// SLASH COMMAND HANDLER
// ============================================================

client.on(
    "interactionCreate",
    async interaction => {
        if (!interaction.isChatInputCommand()) {
            return;
        }

        const command =
            client.commands.get(
                interaction.commandName
            );

        // ====================================================
        // UNKNOWN COMMAND
        // ====================================================

        if (!command) {
            logger.warn(
                `Bilinmeyen command kullanıldı: /${interaction.commandName}`
            );

            try {
                if (
                    !interaction.replied &&
                    !interaction.deferred
                ) {
                    await interaction.reply({
                        content:
                            "❌ Bu komut artık mevcut değil.",
                        flags: MessageFlags.Ephemeral
                    });
                }
            } catch (error) {
                logger.error(
                    "Bilinmeyen command yanıtı gönderilemedi."
                );

                logger.error(error);
            }

            return;
        }

        // ====================================================
        // COMMAND START
        // ====================================================

        logger.info(
            `Command çalıştırılıyor: /${interaction.commandName} | ` +
            `Kullanıcı: ${interaction.user.tag} (${interaction.user.id}) | ` +
            `Sunucu: ${interaction.guild?.name || "DM"}`
        );

        try {
            await command.execute(
                interaction
            );

            logger.info(
                `Command başarıyla tamamlandı: /${interaction.commandName} | ` +
                `Kullanıcı: ${interaction.user.tag}`
            );
        } catch (error) {
            // Warning komutları özel hata sistemi
            const warningCommands = [
                "warn",
                "warnings",
                "unwarn",
                "clearwarnings"
            ];

            if (
                warningCommands.includes(
                    interaction.commandName
                )
            ) {
                await handleWarningError(
                    error,
                    interaction
                );

                return;
            }

            // Diğer bütün komutlar
            await handleCommandError(
                error,
                interaction
            );
        }
    }
);

// ============================================================
// MEMBER JOIN
// ============================================================

client.on(
    "guildMemberAdd",
    async member => {
        try {
            logger.info(
                `Üye katıldı: ${member.user.tag} (${member.id}) | ` +
                `Sunucu: ${member.guild.name}`
            );

            const data =
                await loadGuild(
                    member.guild.id
                );

            if (
                !data ||
                !data.welcomeChannel
            ) {
                return;
            }

            const channel =
                member.guild.channels.cache.get(
                    data.welcomeChannel
                );

            if (!channel) {
                logger.warn(
                    `Welcome kanalı bulunamadı: ${data.welcomeChannel}`
                );

                return;
            }

            const welcomeMessage =
                data.welcomeMessage ||
                "👋 Hoş geldin {user}!";

            const message =
                welcomeMessage.replace(
                    /{user}/g,
                    `${member}`
                );

            await channel.send({
                content: message
            });

            logger.info(
                `Welcome mesajı gönderildi: ${member.user.tag}`
            );
        } catch (error) {
            logger.error(
                "guildMemberAdd hatası:"
            );

            logger.error(error);
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
                `Üye ayrıldı: ${member.user.tag} (${member.id}) | ` +
                `Sunucu: ${member.guild.name}`
            );
        } catch (error) {
            logger.error(
                "guildMemberRemove hatası:"
            );

            logger.error(error);
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
            if (message.partial) {
                try {
                    await message.fetch();
                } catch {
                    logger.warn(
                        "Silinen mesaj partial olduğu için fetch edilemedi."
                    );
                }
            }

            if (!message.guild) {
                return;
            }

            logger.info(
                `Mesaj silindi | ` +
                `Sunucu: ${message.guild.name} | ` +
                `Kanal: ${message.channel?.name || "Bilinmiyor"} | ` +
                `Mesaj ID: ${message.id} | ` +
                `Kullanıcı: ${message.author?.tag || "Bilinmiyor"}`
            );
        } catch (error) {
            logger.error(
                "messageDelete hatası:"
            );

            logger.error(error);
        }
    }
);

// ============================================================
// DISCORD CLIENT ERROR
// ============================================================

client.on(
    "error",
    error => {
        logger.error(
            "Discord Client Error:"
        );

        logger.error(error);
    }
);

// ============================================================
// DISCORD CLIENT WARNING
// ============================================================

client.on(
    "warn",
    message => {
        logger.warn(
            `Discord Client Warning: ${message}`
        );
    }
);

// ============================================================
// UNHANDLED REJECTION
// ============================================================

process.on(
    "unhandledRejection",
    reason => {
        logger.error(
            "UNHANDLED REJECTION"
        );

        logger.error(reason);
    }
);

// ============================================================
// UNCAUGHT EXCEPTION
// ============================================================

process.on(
    "uncaughtException",
    error => {
        logger.error(
            "UNCAUGHT EXCEPTION"
        );

        logger.error(error);

        setTimeout(() => {
            process.exit(1);
        }, 1000);
    }
);

// ============================================================
// NODE WARNING
// ============================================================

process.on(
    "warning",
    warning => {
        logger.warn(
            "NODE WARNING"
        );

        logger.warn(
            warning.name
        );

        logger.warn(
            warning.message
        );

        if (warning.stack) {
            logger.warn(
                warning.stack
            );
        }
    }
);

// ============================================================
// SIGINT
// ============================================================

process.on(
    "SIGINT",
    () => {
        logger.info(
            "SIGINT alındı. Shizu kapatılıyor..."
        );

        try {
            client.destroy();
        } catch (error) {
            logger.error(
                "Client kapatılırken hata oluştu."
            );

            logger.error(error);
        }

        process.exit(0);
    }
);

// ============================================================
// SIGTERM
// ============================================================

process.on(
    "SIGTERM",
    () => {
        logger.info(
            "SIGTERM alındı. Shizu kapatılıyor..."
        );

        try {
            client.destroy();
        } catch (error) {
            logger.error(
                "Client kapatılırken hata oluştu."
            );

            logger.error(error);
        }

        process.exit(0);
    }
);

// ============================================================
// LOGIN
// ============================================================

logger.info(
    "Discord'a bağlanılıyor..."
);

client
    .login(
        process.env.DISCORD_TOKEN
    )
    .then(() => {
        logger.info(
            "Discord login isteği başarıyla gönderildi."
        );
    })
    .catch(error => {
        logger.error(
            "Discord login başarısız."
        );

        logger.error(error);

        process.exit(1);
    });