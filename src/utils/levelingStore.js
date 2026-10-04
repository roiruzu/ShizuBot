const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "../../data");
const DATA_FILE = path.join(DATA_DIR, "levels.json");

function ensureFile() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(
            DATA_FILE,
            JSON.stringify({}, null, 2),
            "utf8"
        );
    }
}

function readData() {
    ensureFile();

    try {
        return JSON.parse(
            fs.readFileSync(DATA_FILE, "utf8")
        );
    } catch {
        return {};
    }
}

function writeData(data) {
    ensureFile();

    const tempFile = `${DATA_FILE}.tmp`;

    fs.writeFileSync(
        tempFile,
        JSON.stringify(data, null, 2),
        "utf8"
    );

    fs.renameSync(
        tempFile,
        DATA_FILE
    );
}

/*
==================================================
DEFAULT USER
==================================================
*/

function createDefaultUser() {
    return {
        /*
            CHAT
        */
        chatXP: 0,
        chatLevel: 0,
        totalMessages: 0,
        lastMessageXP: 0,

        /*
            SESLİ
        */
        voiceXP: 0,
        voiceLevel: 0,
        voiceMinutes: 0,
        lastVoiceXP: 0
    };
}

/*
==================================================
GET USER
==================================================
*/

function getUser(guildId, userId) {
    const data = readData();

    if (!data[guildId]) {
        data[guildId] = {};
    }

    if (!data[guildId][userId]) {
        data[guildId][userId] =
            createDefaultUser();

        writeData(data);
    }

    /*
        Eski sistemden kalan kullanıcılar için
        eksik alanları tamamla.
    */

    const user =
        data[guildId][userId];

    if (typeof user.chatXP !== "number") {
        user.chatXP =
            typeof user.xp === "number"
                ? user.xp
                : 0;
    }

    if (typeof user.chatLevel !== "number") {
        user.chatLevel =
            typeof user.level === "number"
                ? user.level
                : calculateLevel(
                    user.chatXP
                );
    }

    if (typeof user.voiceXP !== "number") {
        user.voiceXP = 0;
    }

    if (typeof user.voiceLevel !== "number") {
        user.voiceLevel =
            calculateLevel(
                user.voiceXP
            );
    }

    if (typeof user.totalMessages !== "number") {
        user.totalMessages = 0;
    }

    if (typeof user.voiceMinutes !== "number") {
        user.voiceMinutes = 0;
    }

    if (typeof user.lastMessageXP !== "number") {
        user.lastMessageXP = 0;
    }

    if (typeof user.lastVoiceXP !== "number") {
        user.lastVoiceXP = 0;
    }

    return user;
}

/*
==================================================
UPDATE USER
==================================================
*/

function updateUser(
    guildId,
    userId,
    updates
) {
    const data = readData();

    if (!data[guildId]) {
        data[guildId] = {};
    }

    if (!data[guildId][userId]) {
        data[guildId][userId] =
            createDefaultUser();
    }

    data[guildId][userId] = {
        ...data[guildId][userId],
        ...updates
    };

    writeData(data);

    return data[guildId][userId];
}

/*
==================================================
XP FORMÜLÜ
==================================================
*/

function getRequiredTotalXP(level) {
    if (level <= 0) {
        return 0;
    }

    return Math.floor(
        100 * Math.pow(level, 1.5)
    );
}

/*
==================================================
LEVEL HESAPLA
==================================================
*/

function calculateLevel(xp) {
    if (!xp || xp <= 0) {
        return 0;
    }

    let level = 0;

    while (
        level < 1000 &&
        xp >=
            getRequiredTotalXP(
                level + 1
            )
    ) {
        level++;
    }

    return level;
}

/*
==================================================
CHAT XP
==================================================
*/

function addChatXP(
    guildId,
    userId,
    amount
) {
    const user =
        getUser(
            guildId,
            userId
        );

    const oldLevel =
        calculateLevel(
            user.chatXP
        );

    const newXP =
        user.chatXP + amount;

    const newLevel =
        calculateLevel(
            newXP
        );

    const updated =
        updateUser(
            guildId,
            userId,
            {
                chatXP: newXP,
                chatLevel: newLevel
            }
        );

    return {
        ...updated,

        oldLevel,
        newLevel,

        xp: newXP,
        level: newLevel,

        leveledUp:
            newLevel > oldLevel
    };
}

/*
==================================================
VOICE XP
==================================================
*/

function addVoiceXP(
    guildId,
    userId,
    amount
) {
    const user =
        getUser(
            guildId,
            userId
        );

    const oldLevel =
        calculateLevel(
            user.voiceXP
        );

    const newXP =
        user.voiceXP + amount;

    const newLevel =
        calculateLevel(
            newXP
        );

    const updated =
        updateUser(
            guildId,
            userId,
            {
                voiceXP: newXP,
                voiceLevel: newLevel
            }
        );

    return {
        ...updated,

        oldLevel,
        newLevel,

        xp: newXP,
        level: newLevel,

        leveledUp:
            newLevel > oldLevel
    };
}

/*
==================================================
SET LEVEL
==================================================

type:
    chat
    voice
==================================================
*/

function setLevel(
    guildId,
    userId,
    type,
    level
) {
    level =
        Number(level);

    if (!Number.isInteger(level)) {
        throw new Error(
            "Level tam sayı olmalıdır."
        );
    }

    level =
        Math.max(
            0,
            Math.min(
                1000,
                level
            )
        );

    const xp =
        getRequiredTotalXP(level);

    if (type === "chat") {
        return updateUser(
            guildId,
            userId,
            {
                chatXP: xp,
                chatLevel: level
            }
        );
    }

    if (type === "voice") {
        return updateUser(
            guildId,
            userId,
            {
                voiceXP: xp,
                voiceLevel: level
            }
        );
    }

    throw new Error(
        "Geçersiz level türü."
    );
}

/*
==================================================
TÜM KULLANICILAR
==================================================
*/

function getAllUsers(guildId) {
    const data =
        readData();

    return data[guildId] || {};
}

/*
==================================================
CHAT LEADERBOARD
==================================================
*/

function getChatLeaderboard(
    guildId
) {
    const users =
        getAllUsers(
            guildId
        );

    return Object.entries(users)
        .map(([userId, user]) => ({
            userId,
            ...user
        }))
        .sort((a, b) => {
            if (
                b.chatLevel !==
                a.chatLevel
            ) {
                return (
                    b.chatLevel -
                    a.chatLevel
                );
            }

            return (
                b.chatXP -
                a.chatXP
            );
        });
}

/*
==================================================
VOICE LEADERBOARD
==================================================
*/

function getVoiceLeaderboard(
    guildId
) {
    const users =
        getAllUsers(
            guildId
        );

    return Object.entries(users)
        .map(([userId, user]) => ({
            userId,
            ...user
        }))
        .sort((a, b) => {
            if (
                b.voiceLevel !==
                a.voiceLevel
            ) {
                return (
                    b.voiceLevel -
                    a.voiceLevel
                );
            }

            return (
                b.voiceXP -
                a.voiceXP
            );
        });
}

/*
==================================================
CHAT RANK
==================================================
*/

function getChatRank(
    guildId,
    userId
) {
    const leaderboard =
        getChatLeaderboard(
            guildId
        );

    const index =
        leaderboard.findIndex(
            user =>
                user.userId ===
                userId
        );

    return index === -1
        ? null
        : index + 1;
}

/*
==================================================
VOICE RANK
==================================================
*/

function getVoiceRank(
    guildId,
    userId
) {
    const leaderboard =
        getVoiceLeaderboard(
            guildId
        );

    const index =
        leaderboard.findIndex(
            user =>
                user.userId ===
                userId
        );

    return index === -1
        ? null
        : index + 1;
}

/*
==================================================
ESKİ FONKSİYONLARLA UYUMLULUK
==================================================
*/

function addXP(
    guildId,
    userId,
    amount
) {
    return addChatXP(
        guildId,
        userId,
        amount
    );
}

function getLeaderboard(
    guildId
) {
    return getChatLeaderboard(
        guildId
    );
}

function getUserRank(
    guildId,
    userId
) {
    return getChatRank(
        guildId,
        userId
    );
}

/*
==================================================
EXPORT
==================================================
*/

module.exports = {
    getUser,
    updateUser,

    addXP,
    addChatXP,
    addVoiceXP,

    setLevel,

    calculateLevel,
    getRequiredTotalXP,

    getAllUsers,

    getLeaderboard,
    getChatLeaderboard,
    getVoiceLeaderboard,

    getUserRank,
    getChatRank,
    getVoiceRank
};