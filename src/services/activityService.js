const db = require('../database');

const voiceSessions = new Map();

function getUserStats(weekKey, guildId, userId) {
    return db.getUserStats(weekKey, guildId, userId);
}

function recordChatMessage(weekKey, guildId, userId, amount = 1) {
    return db.addChatMessages(
        weekKey,
        guildId,
        userId,
        amount
    );
}

function addChatActivity(weekKey, guildId, userId, amount = 1) {
    return recordChatMessage(
        weekKey,
        guildId,
        userId,
        amount
    );
}

function startVoiceSession({
    weekKey,
    guildId,
    userId,
    startedAt = Date.now()
}) {
    const key = `${guildId}:${userId}`;

    if (voiceSessions.has(key)) {
        return false;
    }

    voiceSessions.set(key, {
        weekKey,
        guildId,
        userId,
        startedAt: Number(startedAt)
    });

    return true;
}

function stopVoiceSession(
    guildId,
    userId,
    stoppedAt = Date.now()
) {
    const key = `${guildId}:${userId}`;
    const session = voiceSessions.get(key);

    if (!session) {
        return 0;
    }

    voiceSessions.delete(key);

    const seconds = Math.max(
        0,
        Math.floor(
            (Number(stoppedAt) - session.startedAt) / 1000
        )
    );

    if (seconds > 0) {
        db.addVoiceSeconds(
            session.weekKey,
            session.guildId,
            session.userId,
            seconds
        );
    }

    return seconds;
}

function flushVoiceSession(
    guildId,
    userId,
    now = Date.now()
) {
    const key = `${guildId}:${userId}`;
    const session = voiceSessions.get(key);

    if (!session) {
        return 0;
    }

    const seconds = Math.max(
        0,
        Math.floor(
            (Number(now) - session.startedAt) / 1000
        )
    );

    if (seconds > 0) {
        db.addVoiceSeconds(
            session.weekKey,
            session.guildId,
            session.userId,
            seconds
        );

        session.startedAt = Number(now);
    }

    return seconds;
}

function flushVoiceSessions(now = Date.now()) {
    let totalSeconds = 0;

    for (const session of voiceSessions.values()) {
        const seconds = Math.max(
            0,
            Math.floor(
                (Number(now) - session.startedAt) / 1000
            )
        );

        if (seconds > 0) {
            db.addVoiceSeconds(
                session.weekKey,
                session.guildId,
                session.userId,
                seconds
            );

            session.startedAt = Number(now);
            totalSeconds += seconds;
        }
    }

    return totalSeconds;
}

function endAllVoiceSessions(now = Date.now()) {
    const sessions = [...voiceSessions.values()];
    let totalSeconds = 0;

    for (const session of sessions) {
        totalSeconds += stopVoiceSession(
            session.guildId,
            session.userId,
            now
        );
    }

    return totalSeconds;
}

function isVoiceSessionActive(guildId, userId) {
    return voiceSessions.has(`${guildId}:${userId}`);
}

function getActiveVoiceSessions() {
    return [...voiceSessions.values()].map(session => ({
        ...session
    }));
}

module.exports = {
    getUserStats,
    recordChatMessage,
    addChatActivity,
    startVoiceSession,
    stopVoiceSession,
    flushVoiceSession,
    flushVoiceSessions,
    endAllVoiceSessions,
    isVoiceSessionActive,
    getActiveVoiceSessions
};