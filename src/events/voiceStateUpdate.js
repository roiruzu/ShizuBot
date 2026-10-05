const config = require("../config");
const {
  startVoiceSession,
  stopVoiceSession,
  isVoiceSessionActive
} = require("../services/activityService");
const { currentWeek } = require("../services/activityService");

function isCountableMember(member) {
  if (!member || member.user?.bot) return false;
  const voice=member.voice;
  if (!voice?.channelId || !voice.channel) return false;
  if (voice.channel.id === member.guild.afkChannelId) return false;
  if (voice.serverDeaf) return false;
  return true;
}

function channelHasEnoughHumans(channel) {
  if (!channel) return false;
  return channel.members.filter(m => !m.user.bot).size >= config.voiceMinHumans;
}

function shouldCount(member) {
  return isCountableMember(member) && channelHasEnoughHumans(member.voice.channel);
}

function refreshChannel(channel) {
  if (!channel?.members) return;
  for (const member of channel.members.values()) {
    if (member.user.bot) continue;
    const active=isVoiceSessionActive(channel.guild.id,member.id);
    const wanted=shouldCount(member);
    if (wanted && !active) {
      startVoiceSession({weekKey:currentWeek(),guildId:channel.guild.id,userId:member.id});
    } else if (!wanted && active) {
      stopVoiceSession(channel.guild.id,member.id);
    }
  }
}

module.exports = async function voiceStateUpdate(oldState,newState) {
  refreshChannel(oldState.channel);
  refreshChannel(newState.channel);
};

module.exports.refreshChannel = refreshChannel;
