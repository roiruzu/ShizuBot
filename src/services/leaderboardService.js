const db = require("../database");
const { currentWeek } = require("./activityService");

function getLeaderboard(guildId, type="all", limit=10) {
  return db.getTop(currentWeek(), guildId, type, limit);
}
function getTopThree(guildId,type){return getLeaderboard(guildId,type,3);}
function activityScore(row){return Number(row.chat_messages||0)+Math.floor(Number(row.voice_seconds||0)/60);}
module.exports={getLeaderboard,getTopThree,activityScore};
