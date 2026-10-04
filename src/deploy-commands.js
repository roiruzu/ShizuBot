require("dotenv").config();

const {
    REST,
    Routes
} = require("discord.js");

const fs = require("fs");
const path = require("path");

// ===============================
// AYARLAR
// ===============================

const MAX_RETRIES = 5;
const RETRY_DELAY = 5000;

// ===============================
// COMMANDLARI YÜKLE
// ===============================

const commands = [];

const commandsPath = path.join(
    __dirname,
    "commands"
);

if (!fs.existsSync(commandsPath)) {
    console.error(
        "❌ commands klasörü bulunamadı!"
    );

    process.exit(1);
}

const commandFiles = fs
    .readdirSync(commandsPath)
    .filter(file => file.endsWith(".js"));

for (const file of commandFiles) {

    try {

        const filePath =
            path.join(commandsPath, file);

        const command =
            require(filePath);

        if (!command.data) {
            console.warn(
                `⚠️ ${file} içinde "data" bulunamadı.`
            );

            continue;
        }

        commands.push(
            command.data.toJSON()
        );

    } catch (error) {

        console.error(
            `❌ ${file} yüklenemedi:`
        );

        console.error(error);
    }
}

// ===============================
// ENV KONTROL
// ===============================

if (!process.env.DISCORD_TOKEN) {

    console.error(
        "❌ DISCORD_TOKEN bulunamadı!"
    );

    process.exit(1);
}

if (!process.env.CLIENT_ID) {

    console.error(
        "❌ CLIENT_ID bulunamadı!"
    );

    process.exit(1);
}

if (!process.env.GUILD_ID) {

    console.error(
        "❌ GUILD_ID bulunamadı!"
    );

    process.exit(1);
}

// ===============================
// REST
// ===============================

const rest = new REST({
    version: "10"
}).setToken(
    process.env.DISCORD_TOKEN
);

// ===============================
// BEKLEME
// ===============================

function sleep(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

// ===============================
// DEPLOY
// ===============================

async function deployCommands() {

    console.log(
        `🔄 ${commands.length} slash command yükleniyor...`
    );

    for (
        let attempt = 1;
        attempt <= MAX_RETRIES;
        attempt++
    ) {

        try {

            console.log(
                `🌐 Discord API bağlantısı deneniyor... ` +
                `(${attempt}/${MAX_RETRIES})`
            );

            await rest.put(
                Routes.applicationGuildCommands(
                    process.env.CLIENT_ID,
                    process.env.GUILD_ID
                ),
                {
                    body: commands
                }
            );

            console.log("");
            console.log(
                "✅ Slash command'lar başarıyla yüklendi!"
            );

            console.log(
                `📦 Toplam command: ${commands.length}`
            );

            console.log(
                "🎉 /rank ve /top dahil tüm komutlar hazır."
            );

            return;

        } catch (error) {

            console.error("");

            console.error(
                `❌ Deploy denemesi ${attempt}/${MAX_RETRIES} başarısız.`
            );

            console.error(
                `${error.code || "UNKNOWN"}: ${
                    error.message || error
                }`
            );

            // Son denemeyse çık
            if (attempt >= MAX_RETRIES) {

                console.error("");
                console.error(
                    "❌ Slash command deploy başarısız oldu."
                );

                console.error(
                    "Discord API bağlantısı kurulamadı."
                );

                process.exit(1);
            }

            console.log(
                `⏳ ${RETRY_DELAY / 1000} saniye sonra tekrar denenecek...`
            );

            await sleep(RETRY_DELAY);
        }
    }
}

// ===============================
// BAŞLAT
// ===============================

deployCommands();