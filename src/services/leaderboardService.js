const db = require("../database");
const config = require("../config");
const { currentWeek } = require("./activityService");

function getLeaderboard(guildId, type = "all", limit = 10) {
  return db.getTop(currentWeek(), guildId, type, limit);
}

function getTopThree(guildId, type) {
  return getLeaderboard(guildId, type, 3);
}

function activityScore(row) {
  return row.chat_messages + Math.floor(row.voice_seconds / 60);
}

module.exports = {
  getLeaderboard,
  getTopThree,
  activityScore
};
