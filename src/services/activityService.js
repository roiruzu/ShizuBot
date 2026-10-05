const config = require("../config");
const db = require("../database");
const { getWeekKey } = require("../utils/weekly");

const lastChat = new Map();

function currentWeek() {
  return getWeekKey(new Date(), config.timezone);
}

function recordChat(message) {
  if (!message.guild || message.author.bot) return false;

  const content = message.content.trim();
  if (content.length < 2) return false;

  const key = `${message.guild.id}:${message.author.id}`;
  const now = Date.now();
  const last = lastChat.get(key) || 0;
  const cooldown = config.chatCooldownSeconds * 1000;

  if (now - last < cooldown) return false;

  lastChat.set(key, now);
  db.addChat(currentWeek(), message.guild.id, message.author.id);
  return true;
}

function recordVoice(userId, guildId, seconds) {
  if (seconds <= 0) return;
  db.addVoice(currentWeek(), guildId, userId, seconds);
}

function getUserStats(guildId, userId) {
  return db.getUser(currentWeek(), guildId, userId) || {
    chat_messages: 0,
    voice_seconds: 0
  };
}

module.exports = {
  currentWeek,
  recordChat,
  recordVoice,
  getUserStats
};
