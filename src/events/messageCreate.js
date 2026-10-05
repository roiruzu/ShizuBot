const { recordChat } = require("../services/activityService");
const { handleMessageXP } = require("../utils/levelingManager");

module.exports = async function messageCreate(message) {
  try { recordChat(message); } catch (error) { console.error("[ACTIVITY CHAT]",error); }
  try { await handleMessageXP(message); } catch (error) { console.error("[LEVEL CHAT]",error); }

  if (!message.guild || message.author.bot) return;
  if (!message.content.toLowerCase().startsWith("!leaderboard")) return;

  const args=message.content.trim().split(/\s+/).slice(1);
  const type=["chat","voice","all"].includes(args[0]) ? args[0] : "all";
  const {getLeaderboard}=require("../services/leaderboardService");
  const {formatDuration,medal}=require("../utils/format");
  const rows=getLeaderboard(message.guild.id,type,10);

  const body=rows.length ? rows.map((row,i)=>{
    if(type==="chat") return `${medal(i)} <@${row.userId}> — **${row.chat_messages} mesaj**`;
    if(type==="voice") return `${medal(i)} <@${row.userId}> — **${formatDuration(row.voice_seconds)}**`;
    return `${medal(i)} <@${row.userId}> — **${row.chat_messages} mesaj** • **${formatDuration(row.voice_seconds)}**`;
  }).join("\n") : "Bu hafta henüz veri yok.";

  await message.reply({content:`⚔️ **SHIZU Haftalık Sıralama**\n${body}`}).catch(()=>{});
};
