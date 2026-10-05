const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'activity.json');

const EMPTY_DATA = {
    version: 1,
    weekly: {},
    archive: {}
};

function ensureStorage() {
    fs.mkdirSync(DATA_DIR, { recursive: true });

    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(
            DATA_FILE,
            JSON.stringify(EMPTY_DATA, null, 2),
            'utf8'
        );
    }
}

function readData() {
    ensureStorage();

    try {
        return JSON.parse(
            fs.readFileSync(DATA_FILE, 'utf8')
        );
    } catch {
        writeData(EMPTY_DATA);
        return structuredClone(EMPTY_DATA);
    }
}

function writeData(data) {
    ensureStorage();

    const tempFile = `${DATA_FILE}.tmp`;

    fs.writeFileSync(
        tempFile,
        JSON.stringify(data, null, 2),
        'utf8'
    );

    fs.renameSync(tempFile, DATA_FILE);
}

function ensureUser(data, weekKey, guildId, userId) {
    data.weekly[weekKey] ??= {};
    data.weekly[weekKey][guildId] ??= {};

    data.weekly[weekKey][guildId][userId] ??= {
        chat_messages: 0,
        voice_seconds: 0
    };

    return data.weekly[weekKey][guildId][userId];
}

function addChatMessages(
    weekKey,
    guildId,
    userId,
    amount = 1
) {
    const data = readData();

    const user = ensureUser(
        data,
        weekKey,
        guildId,
        userId
    );

    user.chat_messages += Number(amount) || 0;

    writeData(data);

    return user;
}

function addVoiceSeconds(
    weekKey,
    guildId,
    userId,
    seconds
) {
    const data = readData();

    const user = ensureUser(
        data,
        weekKey,
        guildId,
        userId
    );

    user.voice_seconds += Math.max(
        0,
        Math.floor(Number(seconds) || 0)
    );

    writeData(data);

    return user;
}

function getWeekUsers(weekKey, guildId) {
    const data = readData();

    return data.weekly?.[weekKey]?.[guildId] || {};
}

function getUserStats(
    weekKey,
    guildId,
    userId
) {
    const users = getWeekUsers(
        weekKey,
        guildId
    );

    return users[userId] || {
        chat_messages: 0,
        voice_seconds: 0
    };
}

function getChatLeaderboard(
    weekKey,
    guildId,
    limit = 3
) {
    const users = getWeekUsers(
        weekKey,
        guildId
    );

    return Object.entries(users)
        .map(([userId, stats]) => ({
            userId,
            chat_messages:
                Number(stats.chat_messages) || 0,
            voice_seconds:
                Number(stats.voice_seconds) || 0
        }))
        .sort((a, b) =>
            b.chat_messages -
            a.chat_messages
        )
        .slice(0, limit);
}

function getVoiceLeaderboard(
    weekKey,
    guildId,
    limit = 3
) {
    const users = getWeekUsers(
        weekKey,
        guildId
    );

    return Object.entries(users)
        .map(([userId, stats]) => ({
            userId,
            chat_messages:
                Number(stats.chat_messages) || 0,
            voice_seconds:
                Number(stats.voice_seconds) || 0
        }))
        .sort((a, b) =>
            b.voice_seconds -
            a.voice_seconds
        )
        .slice(0, limit);
}

function getOverallLeaderboard(
    weekKey,
    guildId,
    limit = 10
) {
    const users = getWeekUsers(
        weekKey,
        guildId
    );

    return Object.entries(users)
        .map(([userId, stats]) => {
            const chat =
                Number(stats.chat_messages) || 0;

            const voice =
                Number(stats.voice_seconds) || 0;

            return {
                userId,
                chat_messages: chat,
                voice_seconds: voice,
                score:
                    chat +
                    Math.floor(voice / 60)
            };
        })
        .sort((a, b) =>
            b.score - a.score
        )
        .slice(0, limit);
}

function archiveWeek(
    weekKey,
    guildId,
    extra = {}
) {
    const data = readData();

    data.archive[weekKey] ??= {};

    data.archive[weekKey][guildId] = {
        created_at:
            new Date().toISOString(),

        users:
            getWeekUsers(
                weekKey,
                guildId
            ),

        ...extra
    };

    writeData(data);
}

function resetWeek(
    weekKey,
    guildId
) {
    const data = readData();

    if (data.weekly[weekKey]) {
        delete data.weekly[weekKey][guildId];
    }

    writeData(data);
}

module.exports = {
    DATA_FILE,
    readData,
    writeData,
    addChatMessages,
    addVoiceSeconds,
    getWeekUsers,
    getUserStats,
    getChatLeaderboard,
    getVoiceLeaderboard,
    getOverallLeaderboard,
    archiveWeek,
    resetWeek
};