const { ActivityType } = require("discord.js");
const config = require("../config");
const { tick } = require("../services/weeklyResetService");

module.exports = async function ready(client) {
  console.log(`SHIZU bot aktif: ${client.user.tag}`);

  client.user.setPresence({
    activities: [
      {
        name: "/top • Haftalık Savaş",
        type: ActivityType.Watching
      }
    ],
    status: "online"
  });

  const guild = client.guilds.cache.get(config.guildId);
  if (!guild) {
    console.error("GUILD_ID ile belirtilen sunucu bulunamadı.");
    return;
  }

  await guild.commands.set(
    [...client.commands.values()].map(command => command.data.toJSON())
  );

  console.log(`Slash komutları ${guild.name} sunucusuna yüklendi.`);

  // Her dakika reset kontrolü.
  setInterval(() => {
    tick(guild).catch(console.error);
  }, 30_000);
};
