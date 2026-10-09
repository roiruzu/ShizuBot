const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "../../data");
const dbFile = path.join(dataDir, "database.json");

// Data klasörünü oluştur
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Database dosyasını oluştur
if (!fs.existsSync(dbFile)) {
    fs.writeFileSync(
        dbFile,
        JSON.stringify({ guilds: {} }, null, 2),
        "utf8"
    );
}

// Database oku
function read() {
    try {
        return JSON.parse(
            fs.readFileSync(dbFile, "utf8")
        );
    } catch (error) {
        console.error(
            "Database okunamadı:",
            error
        );

        return {
            guilds: {}
        };
    }
}

// Database yaz
function write(data) {
    fs.writeFileSync(
        dbFile,
        JSON.stringify(data, null, 2),
        "utf8"
    );
}

// Sunucu verisini getir
function getGuild(guildId) {
    const data = read();

    if (!data.guilds) {
        data.guilds = {};
    }

    if (!data.guilds[guildId]) {
        data.guilds[guildId] = {
            welcomeChannelId: null,
            logChannelId: null,
            warnings: {}
        };

        write(data);
    }

    return data.guilds[guildId];
}

// index.js tarafından kullanılan isim
function loadGuild(guildId) {
    return getGuild(guildId);
}

// Sunucu verisini güncelle
function updateGuild(guildId, patch) {
    const data = read();

    if (!data.guilds) {
        data.guilds = {};
    }

    if (!data.guilds[guildId]) {
        data.guilds[guildId] = {
            welcomeChannelId: null,
            logChannelId: null,
            warnings: {}
        };
    }

    data.guilds[guildId] = {
        ...data.guilds[guildId],
        ...patch
    };

    write(data);

    return data.guilds[guildId];
}

// Uyarı ekle
function addWarning(guildId, userId, warning) {
    const data = read();

    if (!data.guilds) {
        data.guilds = {};
    }

    if (!data.guilds[guildId]) {
        data.guilds[guildId] = {
            welcomeChannelId: null,
            logChannelId: null,
            warnings: {}
        };
    }

    const guild = data.guilds[guildId];

    if (!guild.warnings) {
        guild.warnings = {};
    }

    if (!guild.warnings[userId]) {
        guild.warnings[userId] = [];
    }

    guild.warnings[userId].push(warning);

    write(data);

    return guild.warnings[userId];
}

// Kullanıcının uyarılarını getir
function getWarnings(guildId, userId) {
    const guild = getGuild(guildId);

    if (!guild.warnings) {
        return [];
    }

    return guild.warnings[userId] || [];
}

module.exports = {
    read,
    write,
    getGuild,
    loadGuild,
    updateGuild,
    addWarning,
    getWarnings
};
