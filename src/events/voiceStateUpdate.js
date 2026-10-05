const { recordVoice } = require("../services/activityService");
const config = require("../config");

const sessions = new Map();

function isCountable(state) {
  if (!state.channelId) return false;
  if (state.channel?.isVoiceBased?.() === false) return false;

  // AFK kanalını sayma.
  if (state.channel?.id === state.guild.afkChannelId) return false;

  // Server-deaf kullanıcı gerçek aktiflik göstermiyor kabul edilir.
  if (state.serverDeaf) return false;

  // Kanalda en az N insan olmalı.
  const humans = state.channel.members.filter(member => !member.user.bot).size;
  if (humans < config.voiceMinHumans) return false;

  return true;
}

function start(state) {
  if (!isCountable(state)) return;

  const key = `${state.guild.id}:${state.id}`;

  if (!sessions.has(key)) {
    sessions.set(key, {
      guildId: state.guild.id,
      userId: state.id,
      startedAt: Date.now()
    });
  }
}

function stop(state) {
  const key = `${state.guild.id}:${state.id}`;
  const session = sessions.get(key);

  if (!session) return;

  const seconds = Math.floor((Date.now() - session.startedAt) / 1000);
  recordVoice(session.userId, session.guildId, seconds);
  sessions.delete(key);
}

module.exports = async function voiceStateUpdate(oldState, newState) {
  const key = `${newState.guild.id}:${newState.id}`;

  // Durum değiştiyse mevcut oturumu yeniden değerlendir.
  const wasCounting = sessions.has(key);
  const shouldCount = isCountable(newState);

  if (wasCounting && !shouldCount) {
    stop(newState);
  } else if (!wasCounting && shouldCount) {
    start(newState);
  }

  // Kanal değiştiyse eski oturumun zamanını kapat ve yenisini başlat.
  if (oldState.channelId !== newState.channelId) {
    if (wasCounting) stop(oldState);
    if (shouldCount) start(newState);
  }
};
