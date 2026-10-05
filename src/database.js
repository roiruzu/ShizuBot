const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");
const config = require("./config");

fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });

const db = new Database(config.databasePath);
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS weekly_activity (
  week_key TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  chat_messages INTEGER NOT NULL DEFAULT 0,
  voice_seconds INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (week_key, guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS weekly_archive (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_key TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  chat_messages INTEGER NOT NULL DEFAULT 0,
  voice_seconds INTEGER NOT NULL DEFAULT 0,
  archived_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`);

const statements = {
  getUser: db.prepare(`
    SELECT * FROM weekly_activity
    WHERE week_key = ? AND guild_id = ? AND user_id = ?
  `),

  upsertUser: db.prepare(`
    INSERT INTO weekly_activity
      (week_key, guild_id, user_id, chat_messages, voice_seconds)
    VALUES (?, ?, ?, 0, 0)
    ON CONFLICT(week_key, guild_id, user_id) DO NOTHING
  `),

  addChat: db.prepare(`
    INSERT INTO weekly_activity
      (week_key, guild_id, user_id, chat_messages, voice_seconds)
    VALUES (?, ?, ?, 1, 0)
    ON CONFLICT(week_key, guild_id, user_id)
    DO UPDATE SET chat_messages = chat_messages + 1
  `),

  addVoice: db.prepare(`
    INSERT INTO weekly_activity
      (week_key, guild_id, user_id, chat_messages, voice_seconds)
    VALUES (?, ?, ?, 0, ?)
    ON CONFLICT(week_key, guild_id, user_id)
    DO UPDATE SET voice_seconds = voice_seconds + excluded.voice_seconds
  `),

  topChat: db.prepare(`
    SELECT user_id, chat_messages, voice_seconds
    FROM weekly_activity
    WHERE week_key = ? AND guild_id = ?
    ORDER BY chat_messages DESC, voice_seconds DESC
    LIMIT ?
  `),

  topVoice: db.prepare(`
    SELECT user_id, chat_messages, voice_seconds
    FROM weekly_activity
    WHERE week_key = ? AND guild_id = ?
    ORDER BY voice_seconds DESC, chat_messages DESC
    LIMIT ?
  `),

  topAll: db.prepare(`
    SELECT
      user_id,
      chat_messages,
      voice_seconds,
      (chat_messages + CAST(voice_seconds / 60 AS INTEGER)) AS activity_score
    FROM weekly_activity
    WHERE week_key = ? AND guild_id = ?
    ORDER BY activity_score DESC, chat_messages DESC, voice_seconds DESC
    LIMIT ?
  `),

  allRows: db.prepare(`
    SELECT * FROM weekly_activity
    WHERE week_key = ? AND guild_id = ?
    ORDER BY chat_messages DESC, voice_seconds DESC
  `),

  deleteWeek: db.prepare(`
    DELETE FROM weekly_activity
    WHERE week_key = ? AND guild_id = ?
  `),

  archive: db.prepare(`
    INSERT INTO weekly_archive
      (week_key, guild_id, user_id, chat_messages, voice_seconds, archived_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `),

  getMeta: db.prepare(`SELECT value FROM meta WHERE key = ?`),

  setMeta: db.prepare(`
    INSERT INTO meta(key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `)
};

function ensureUser(weekKey, guildId, userId) {
  statements.upsertUser.run(weekKey, guildId, userId);
}

function addChat(weekKey, guildId, userId) {
  statements.addChat.run(weekKey, guildId, userId);
}

function addVoice(weekKey, guildId, userId, seconds) {
  if (seconds <= 0) return;
  statements.addVoice.run(weekKey, guildId, userId, Math.floor(seconds));
}

function getUser(weekKey, guildId, userId) {
  return statements.getUser.get(weekKey, guildId, userId);
}

function getTop(weekKey, guildId, type = "all", limit = 10) {
  if (type === "chat") return statements.topChat.all(weekKey, guildId, limit);
  if (type === "voice") return statements.topVoice.all(weekKey, guildId, limit);
  return statements.topAll.all(weekKey, guildId, limit);
}

const archiveAndReset = db.transaction((weekKey, guildId, archivedAt) => {
  const rows = statements.allRows.all(weekKey, guildId);

  for (const row of rows) {
    statements.archive.run(
      row.week_key,
      row.guild_id,
      row.user_id,
      row.chat_messages,
      row.voice_seconds,
      archivedAt
    );
  }

  statements.deleteWeek.run(weekKey, guildId);
  return rows;
});

function getMeta(key) {
  return statements.getMeta.get(key)?.value ?? null;
}

function setMeta(key, value) {
  statements.setMeta.run(key, String(value));
}

module.exports = {
  db,
  ensureUser,
  addChat,
  addVoice,
  getUser,
  getTop,
  archiveAndReset,
  getMeta,
  setMeta
};
