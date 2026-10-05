const db = require('../database');

function getLeaderboard(weekKey, guildId, type = 'all', limit = 10) {
    if (type === 'chat') {
        return db.getChatLeaderboard(weekKey, guildId, limit);
    }

    if (type === 'voice') {
        return db.getVoiceLeaderboard(weekKey, guildId, limit);
    }

    return db.getOverallLeaderboard(weekKey, guildId, limit);
}

function getUserStats(weekKey, guildId, userId) {
    return db.getUserStats(weekKey, guildId, userId);
}

function getChatLeaderboard(weekKey, guildId, limit = 3) {
    return db.getChatLeaderboard(weekKey, guildId, limit);
}

function getVoiceLeaderboard(weekKey, guildId, limit = 3) {
    return db.getVoiceLeaderboard(weekKey, guildId, limit);
}

function getOverallLeaderboard(weekKey, guildId, limit = 10) {
    return db.getOverallLeaderboard(weekKey, guildId, limit);
}

function getTopWinners(weekKey, guildId, limit = 3) {
    const chat = getChatLeaderboard(weekKey, guildId, limit);
    const voice = getVoiceLeaderboard(weekKey, guildId, limit);

    return {
        chat,
        voice,
        userIds: [
            ...new Set([
                ...chat.map(x => x.userId),
                ...voice.map(x => x.userId)
            ])
        ]
    };
}

module.exports = {
    getLeaderboard,
    getUserStats,
    getChatLeaderboard,
    getVoiceLeaderboard,
    getOverallLeaderboard,
    getTopWinners,

    // Eski isimlerle çağıran dosyalar için uyumluluk
    getChatTop: getChatLeaderboard,
    getVoiceTop: getVoiceLeaderboard,
    getOverallTop: getOverallLeaderboard,
    getStats: getUserStats
};