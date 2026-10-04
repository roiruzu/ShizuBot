const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const WARNINGS_FILE = path.join(DATA_DIR, "warnings.json");
const LOCK_FILE = path.join(DATA_DIR, "warnings.json.lock");

function ensureDataDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, {
            recursive: true
        });
    }
}

function ensureWarningsFile() {
    ensureDataDirectory();

    if (!fs.existsSync(WARNINGS_FILE)) {
        fs.writeFileSync(
            WARNINGS_FILE,
            JSON.stringify({}, null, 4),
            "utf8"
        );
    }
}

function readWarnings() {
    ensureWarningsFile();

    try {
        const raw = fs.readFileSync(
            WARNINGS_FILE,
            "utf8"
        );

        if (!raw.trim()) {
            return {};
        }

        const data = JSON.parse(raw);

        if (
            typeof data !== "object" ||
            Array.isArray(data) ||
            data === null
        ) {
            throw new Error(
                "warnings.json bozuk JSON yapısına sahip."
            );
        }

        return data;
    } catch (error) {
        throw new Error(
            `warnings.json okunamadı: ${error.message}`
        );
    }
}

function writeWarnings(data) {
    ensureDataDirectory();

    const tempFile =
        `${WARNINGS_FILE}.tmp`;

    try {
        fs.writeFileSync(
            tempFile,
            JSON.stringify(data, null, 4),
            "utf8"
        );

        fs.renameSync(
            tempFile,
            WARNINGS_FILE
        );
    } catch (error) {
        try {
            if (fs.existsSync(tempFile)) {
                fs.unlinkSync(tempFile);
            }
        } catch {}

        throw new Error(
            `warnings.json yazılamadı: ${error.message}`
        );
    }
}

function validateWarning(warning) {
    if (!warning || typeof warning !== "object") {
        return false;
    }

    return Boolean(
        warning.id &&
        warning.guildId &&
        warning.userId &&
        warning.moderator &&
        warning.reason &&
        warning.timestamp
    );
}

function sanitizeWarning(warning) {
    return {
        id: String(warning.id),
        guildId: String(warning.guildId),
        userId: String(warning.userId),
        moderator: String(warning.moderator),
        moderatorTag: String(
            warning.moderatorTag || ""
        ),
        reason: String(
            warning.reason || "Belirtilmedi"
        ),
        timestamp: String(
            warning.timestamp
        )
    };
}

function validateWarningsData(data) {
    if (
        !data ||
        typeof data !== "object" ||
        Array.isArray(data)
    ) {
        throw new Error(
            "Uyarı veritabanı geçersiz."
        );
    }

    for (const [guildId, users] of Object.entries(data)) {
        if (
            !users ||
            typeof users !== "object" ||
            Array.isArray(users)
        ) {
            throw new Error(
                `Uyarı verileri bozuk: ${guildId}`
            );
        }

        for (
            const [userId, warnings]
            of Object.entries(users)
        ) {
            if (!Array.isArray(warnings)) {
                throw new Error(
                    `Uyarı listesi bozuk: ${guildId}/${userId}`
                );
            }

            for (const warning of warnings) {
                if (!validateWarning(warning)) {
                    throw new Error(
                        `Geçersiz uyarı verisi: ${guildId}/${userId}`
                    );
                }
            }
        }
    }

    return true;
}

function getGuildWarnings(
    data,
    guildId
) {
    if (!data[guildId]) {
        data[guildId] = {};
    }

    return data[guildId];
}

function getUserWarnings(
    guildId,
    userId
) {
    const data = readWarnings();

    validateWarningsData(data);

    return (
        data[guildId]?.[userId] || []
    );
}

function getNextWarningId(
    guildId,
    userId
) {
    const warnings =
        getUserWarnings(
            guildId,
            userId
        );

    if (!warnings.length) {
        return "1";
    }

    const ids = warnings
        .map(warning =>
            Number(warning.id)
        )
        .filter(Number.isFinite);

    if (!ids.length) {
        return "1";
    }

    return String(
        Math.max(...ids) + 1
    );
}

function addWarning(
    guildId,
    userId,
    warning
) {
    if (!validateWarning(warning)) {
        throw new Error(
            "Uyarı kaydedilemedi: geçersiz veri."
        );
    }

    const data = readWarnings();

    validateWarningsData(data);

    const guildWarnings =
        getGuildWarnings(
            data,
            guildId
        );

    if (!guildWarnings[userId]) {
        guildWarnings[userId] = [];
    }

    guildWarnings[userId].push(
        sanitizeWarning(warning)
    );

    writeWarnings(data);

    return warning;
}

function removeWarning(
    guildId,
    userId,
    warningId
) {
    const data = readWarnings();

    validateWarningsData(data);

    const warnings =
        data[guildId]?.[userId];

    if (!warnings) {
        return null;
    }

    const index =
        warnings.findIndex(
            warning =>
                String(warning.id) ===
                String(warningId)
        );

    if (index === -1) {
        return null;
    }

    const removed =
        warnings.splice(index, 1)[0];

    if (warnings.length === 0) {
        delete data[guildId][userId];
    }

    if (
        Object.keys(data[guildId]).length === 0
    ) {
        delete data[guildId];
    }

    writeWarnings(data);

    return removed;
}

function clearUserWarnings(
    guildId,
    userId
) {
    const data = readWarnings();

    validateWarningsData(data);

    const warnings =
        data[guildId]?.[userId] || [];

    const count =
        warnings.length;

    if (data[guildId]) {
        delete data[guildId][userId];

        if (
            Object.keys(data[guildId]).length === 0
        ) {
            delete data[guildId];
        }
    }

    writeWarnings(data);

    return count;
}

module.exports = {
    DATA_DIR,
    WARNINGS_FILE,
    LOCK_FILE,

    ensureDataDirectory,
    ensureWarningsFile,

    readWarnings,
    writeWarnings,

    validateWarning,
    validateWarningsData,
    sanitizeWarning,

    getUserWarnings,
    getNextWarningId,

    addWarning,
    removeWarning,
    clearUserWarnings
};