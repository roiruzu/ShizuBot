require("dotenv").config();

const required = ["DISCORD_TOKEN", "GUILD_ID", "ACTIVITY_ROLE_ID"];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Eksik .env değişkeni: ${key}`);
  }
}

module.exports = {
  token: process.env.DISCORD_TOKEN,
  guildId: process.env.GUILD_ID,
  activityRoleId: process.env.ACTIVITY_ROLE_ID,
  timezone: process.env.TIMEZONE || "Europe/Istanbul",
  announcementChannelId: process.env.ANNOUNCEMENT_CHANNEL_ID || null,
  chatCooldownSeconds: Math.max(0, Number(process.env.CHAT_COOLDOWN_SECONDS || 10)),
  voiceMinHumans: Math.max(1, Number(process.env.VOICE_MIN_HUMANS || 2))
};
