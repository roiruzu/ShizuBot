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

function createDefaultUser() {
    return {
        xp: 0,
        level: 0,
        totalMessages: 0,
        voiceMinutes: 0,
        lastMessageXP: 0,
        lastVoiceXP: 0
    };
}

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

    return data[guildId][userId];
}

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
    Level sistemi:

    Level 0 -> 0 XP
    Level 1 -> 100 XP
    Level 2 -> 283 XP
    Level 3 -> 519 XP
    ...

    Her level için gereken toplam XP:
    100 * level ^ 1.5
*/

function getRequiredTotalXP(level) {

    if (level <= 0) {
        return 0;
    }

    return Math.floor(
        100 * Math.pow(level, 1.5)
    );
}

function calculateLevel(xp) {

    if (!xp || xp <= 0) {
        return 0;
    }

    let level = 0;

    while (
        level < 1000 &&
        xp >= getRequiredTotalXP(level + 1)
    ) {
        level++;
    }

    return level;
}

function addXP(
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
        calculateLevel(user.xp);

    user.xp += amount;

    const newLevel =
        calculateLevel(user.xp);

    user.level =
        newLevel;

    updateUser(
        guildId,
        userId,
        user
    );

    return {
        ...user,
        oldLevel,
        newLevel,
        leveledUp:
            newLevel > oldLevel
    };
}

function getAllUsers(guildId) {

    const data = readData();

    return data[guildId] || {};
}

function getLeaderboard(guildId) {

    const users =
        getAllUsers(guildId);

    return Object.entries(users)
        .map(([userId, user]) => ({
            userId,
            ...user
        }))
        .sort((a, b) => {

            if (b.level !== a.level) {
                return b.level - a.level;
            }

            return b.xp - a.xp;
        });
}

function getUserRank(
    guildId,
    userId
) {

    const leaderboard =
        getLeaderboard(guildId);

    const index =
        leaderboard.findIndex(
            user =>
                user.userId === userId
        );

    return index === -1
        ? null
        : index + 1;
}

module.exports = {
    getUser,
    updateUser,
    addXP,
    calculateLevel,
    getRequiredTotalXP,
    getAllUsers,
    getLeaderboard,
    getUserRank
};