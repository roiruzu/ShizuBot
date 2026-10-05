const { ActivityType } = require("discord.js");
const config = require("../config");
const { tick } = require("../services/weeklyResetService");
const { handleVoiceXP } = require("../utils/levelingManager");
const { refreshChannel } = require("./voiceStateUpdate");

module.exports = async function ready(client) {
  console.log(`SHIZU bot aktif: ${client.user.tag}`);

  client.user.setPresence({
    activities:[{name:"/top • Haftalık Savaş",type:ActivityType.Watching}],
    status:"online"
  });

  const guild=client.guilds.cache.get(config.guildId);
  if(!guild){console.error("GUILD_ID ile belirtilen sunucu bulunamadı.");return;}

  const commandData = [...client.commands.values()].map(c=>c.data.toJSON());
  await guild.commands.set(commandData);
  console.log(`Slash komutları ${guild.name} sunucusuna yüklendi: ${commandData.map(c=>c.name).join(", ")}`);
  console.log(`SHIZU aktivite haftası: ${require("../services/activityService").currentWeek()}`);

  // Bot yeniden başladığında mevcut ses kanallarını yeniden sayılabilir hale getir.
  for(const channel of guild.channels.cache.values()) {
    if(channel.isVoiceBased?.()) refreshChannel(channel);
  }

  await tick(guild).catch(console.error);

  setInterval(()=>{
    tick(guild).catch(console.error);
  },30_000);

  // Mevcut level sisteminin ses XP'si.
  setInterval(()=>{
    handleVoiceXP(client).catch(console.error);
  },60_000);
};
