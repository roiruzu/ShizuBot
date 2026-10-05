const fs = require("node:fs");
const path = require("node:path");

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "activity.json");

const EMPTY_DATA = {
  version: 1,
  weekly: {},
  archive: {},
  meta: {}
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureStorage() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(EMPTY_DATA, null, 2), "utf8");
  }
}

function normalize(data) {
  const result = data && typeof data === "object" ? data : {};
  result.version = 1;
  if (!result.weekly || typeof result.weekly !== "object") result.weekly = {};
  if (!result.archive || typeof result.archive !== "object") result.archive = {};
  if (!result.meta || typeof result.meta !== "object") result.meta = {};
  return result;
}

function readData() {
  ensureStorage();
  try {
    return normalize(JSON.parse(fs.readFileSync(DATA_FILE, "utf8")));
  } catch (error) {
    const backup = `${DATA_FILE}.corrupt-${Date.now()}`;
    try { fs.copyFileSync(DATA_FILE, backup); } catch {}
    writeData(clone(EMPTY_DATA));
    return clone(EMPTY_DATA);
  }
}

function writeData(data) {
  ensureStorage();
  const normalized = normalize(clone(data));
  const temp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(normalized, null, 2), "utf8");
  fs.renameSync(temp, DATA_FILE);
  return normalized;
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

function addChatMessages(weekKey, guildId, userId, amount = 1) {
  const data = readData();
  const user = ensureUser(data, weekKey, guildId, userId);
  user.chat_messages += Math.max(0, Math.floor(Number(amount) || 0));
  writeData(data);
  return clone(user);
}

function addVoiceSeconds(weekKey, guildId, userId, seconds) {
  const data = readData();
  const user = ensureUser(data, weekKey, guildId, userId);
  user.voice_seconds += Math.max(0, Math.floor(Number(seconds) || 0));
  writeData(data);
  return clone(user);
}

function getWeekUsers(weekKey, guildId) {
  const data = readData();
  return clone(data.weekly?.[weekKey]?.[guildId] || {});
}

function getUserStats(weekKey, guildId, userId) {
  const users = getWeekUsers(weekKey, guildId);
  return users[userId] || { chat_messages: 0, voice_seconds: 0 };
}

function mapRows(users) {
  return Object.entries(users).map(([userId, stats]) => {
    const chat_messages = Number(stats.chat_messages) || 0;
    const voice_seconds = Number(stats.voice_seconds) || 0;
    return {
      userId,
      user_id: userId,
      chat_messages,
      voice_seconds,
      score: chat_messages + Math.floor(voice_seconds / 60)
    };
  });
}

function getChatLeaderboard(weekKey, guildId, limit = 10) {
  return mapRows(getWeekUsers(weekKey, guildId))
    .sort((a,b) => b.chat_messages-a.chat_messages || b.voice_seconds-a.voice_seconds || a.userId.localeCompare(b.userId))
    .slice(0, limit);
}

function getVoiceLeaderboard(weekKey, guildId, limit = 10) {
  return mapRows(getWeekUsers(weekKey, guildId))
    .sort((a,b) => b.voice_seconds-a.voice_seconds || b.chat_messages-a.chat_messages || a.userId.localeCompare(b.userId))
    .slice(0, limit);
}

function getOverallLeaderboard(weekKey, guildId, limit = 10) {
  return mapRows(getWeekUsers(weekKey, guildId))
    .sort((a,b) => b.score-a.score || b.chat_messages-a.chat_messages || b.voice_seconds-a.voice_seconds || a.userId.localeCompare(b.userId))
    .slice(0, limit);
}

// Eski API uyumluluğu
function ensureUserLegacy(weekKey, guildId, userId) {
  const data = readData();
  ensureUser(data, weekKey, guildId, userId);
  writeData(data);
}
function addChat(weekKey, guildId, userId) { return addChatMessages(weekKey, guildId, userId, 1); }
function addVoice(weekKey, guildId, userId, seconds) { return addVoiceSeconds(weekKey, guildId, userId, seconds); }
function getUser(weekKey, guildId, userId) { return getUserStats(weekKey, guildId, userId); }
function getTop(weekKey, guildId, type="all", limit=10) {
  if (type === "chat") return getChatLeaderboard(weekKey,guildId,limit);
  if (type === "voice") return getVoiceLeaderboard(weekKey,guildId,limit);
  return getOverallLeaderboard(weekKey,guildId,limit);
}

function archiveWeek(weekKey, guildId, extra = {}) {
  const data = readData();
  data.archive[weekKey] ??= {};
  data.archive[weekKey][guildId] = {
    created_at: new Date().toISOString(),
    users: clone(data.weekly?.[weekKey]?.[guildId] || {}),
    ...clone(extra)
  };
  writeData(data);
  return clone(data.archive[weekKey][guildId]);
}

function resetWeek(weekKey, guildId) {
  const data = readData();
  if (data.weekly[weekKey]) {
    delete data.weekly[weekKey][guildId];
    if (Object.keys(data.weekly[weekKey]).length === 0) delete data.weekly[weekKey];
  }
  writeData(data);
}

function archiveAndReset(weekKey, guildId, archivedAt = new Date().toISOString()) {
  const rows = getOverallLeaderboard(weekKey, guildId, Number.MAX_SAFE_INTEGER);
  archiveWeek(weekKey, guildId, { archived_at: archivedAt, leaderboard: rows });
  resetWeek(weekKey, guildId);
  return rows;
}

function getMeta(key) {
  return readData().meta[key] ?? null;
}
function setMeta(key, value) {
  const data = readData();
  data.meta[key] = String(value);
  writeData(data);
}

module.exports = {
  DATA_FILE, readData, writeData,
  ensureUser: ensureUserLegacy,
  addChatMessages, addVoiceSeconds,
  addChat, addVoice,
  getWeekUsers, getUserStats,
  getChatLeaderboard, getVoiceLeaderboard, getOverallLeaderboard,
  getUser, getTop,
  archiveWeek, resetWeek, archiveAndReset,
  getMeta, setMeta
};
