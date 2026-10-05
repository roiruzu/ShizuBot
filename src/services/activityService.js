const config = require("../config");
const db = require("../database");
const { getWeekKey } = require("../utils/weekly");

const lastChat = new Map();
const voiceSessions = new Map();

function currentWeek(date = new Date()) {
  return getWeekKey(date, config.timezone);
}

function recordChat(message) {
  if (!message?.guild || message.author?.bot) return false;
  const content = String(message.content || "").trim();
  if (content.length < 2) return false;

  const key = `${message.guild.id}:${message.author.id}`;
  const now = Date.now();
  const last = lastChat.get(key) || 0;
  if (now - last < config.chatCooldownSeconds * 1000) return false;

  lastChat.set(key, now);
  db.addChatMessages(currentWeek(), message.guild.id, message.author.id, 1);
  return true;
}

function recordChatMessage(weekKey, guildId, userId, amount = 1) {
  return db.addChatMessages(weekKey, guildId, userId, amount);
}
function addChatActivity(weekKey, guildId, userId, amount = 1) {
  return recordChatMessage(weekKey,guildId,userId,amount);
}
function recordVoice(userId, guildId, seconds) {
  if (seconds > 0) db.addVoiceSeconds(currentWeek(), guildId, userId, seconds);
}
function getUserStats(guildId, userId) {
  return db.getUserStats(currentWeek(), guildId, userId);
}

function startVoiceSession({ weekKey = currentWeek(), guildId, userId, startedAt = Date.now() }) {
  const key = `${guildId}:${userId}`;
  if (voiceSessions.has(key)) return false;
  voiceSessions.set(key, { weekKey, guildId, userId, startedAt: Number(startedAt) });
  return true;
}

function stopVoiceSession(guildId, userId, stoppedAt = Date.now()) {
  const key = `${guildId}:${userId}`;
  const session = voiceSessions.get(key);
  if (!session) return 0;
  voiceSessions.delete(key);
  const seconds = Math.max(0, Math.floor((Number(stoppedAt)-session.startedAt)/1000));
  if (seconds > 0) db.addVoiceSeconds(session.weekKey, session.guildId, session.userId, seconds);
  return seconds;
}

function flushVoiceSession(guildId,userId,now=Date.now()) {
  const key=`${guildId}:${userId}`;
  const session=voiceSessions.get(key);
  if(!session) return 0;
  const seconds=Math.max(0,Math.floor((Number(now)-session.startedAt)/1000));
  if(seconds>0){
    db.addVoiceSeconds(session.weekKey,session.guildId,session.userId,seconds);
    session.startedAt=Number(now);
  }
  return seconds;
}

function flushVoiceSessions(now=Date.now()) {
  let total=0;
  for(const session of voiceSessions.values()){
    const seconds=Math.max(0,Math.floor((Number(now)-session.startedAt)/1000));
    if(seconds>0){
      db.addVoiceSeconds(session.weekKey,session.guildId,session.userId,seconds);
      session.startedAt=Number(now);
      total+=seconds;
    }
  }
  return total;
}

function endAllVoiceSessions(now=Date.now()) {
  const sessions=[...voiceSessions.values()];
  let total=0;
  for(const session of sessions) total+=stopVoiceSession(session.guildId,session.userId,now);
  return total;
}

function isVoiceSessionActive(guildId,userId){return voiceSessions.has(`${guildId}:${userId}`);}
function getActiveVoiceSessions(){return [...voiceSessions.values()].map(x=>({...x}));}

module.exports={
  currentWeek,recordChat,recordChatMessage,addChatActivity,recordVoice,getUserStats,
  startVoiceSession,stopVoiceSession,flushVoiceSession,flushVoiceSessions,endAllVoiceSessions,
  isVoiceSessionActive,getActiveVoiceSessions
};
