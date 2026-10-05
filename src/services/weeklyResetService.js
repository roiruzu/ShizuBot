const { EmbedBuilder } = require("discord.js");
const config = require("../config");
const db = require("../database");
const { getWeekKey, isResetWindow } = require("../utils/weekly");
const { getTopThree } = require("./leaderboardService");
const { currentWeek, endAllVoiceSessions } = require("./activityService");

let lastResetKey=null;

async function giveRewardRole(guild,winnerIds){
  const role=guild.roles.cache.get(config.activityRoleId);
  if(!role){console.warn("ACTIVITY_ROLE_ID bulunamadı:",config.activityRoleId);return;}
  if(!role.editable){console.warn("Ödül rolü bot tarafından yönetilemiyor. Bot rolünü ödül rolünün üstüne taşı.");return;}

  await guild.members.fetch().catch(()=>{});
  for(const member of guild.members.cache.values()){
    if(member.user.bot) continue;
    const shouldHave=winnerIds.has(member.id);
    const has=member.roles.cache.has(role.id);
    try{
      if(shouldHave&&!has) await member.roles.add(role,"SHIZU haftalık aktivite ödülü");
      else if(!shouldHave&&has) await member.roles.remove(role,"Yeni hafta ödül rolü güncellendi");
    }catch(error){console.error(`[ROLE] ${member.id}`,error.message);}
  }
}

function resultText(rows,type){
  if(!rows.length) return "Bu hafta henüz veri oluşmadı.";
  return rows.map((r,i)=>{
    const emoji=["🥇","🥈","🥉"][i]||"🏅";
    if(type==="chat") return `${emoji} <@${r.userId}> — **${r.chat_messages} mesaj**`;
    return `${emoji} <@${r.userId}> — **${Math.floor(r.voice_seconds/3600)}sa ${Math.floor((r.voice_seconds%3600)/60)}dk**`;
  }).join("\n");
}

async function resetWeek(guild,oldWeek=currentWeek()){
  // Aktif ses oturumlarını önce eski haftaya yaz.
  endAllVoiceSessions();

  const chatWinners=getTopThree(guild.id,"chat");
  const voiceWinners=getTopThree(guild.id,"voice");
  const winnerIds=new Set([...chatWinners,...voiceWinners].map(x=>x.userId));

  await giveRewardRole(guild,winnerIds);

  db.archiveWeek(oldWeek,guild.id,{
    chatWinners:chatWinners.map(x=>x.userId),
    voiceWinners:voiceWinners.map(x=>x.userId)
  });
  db.resetWeek(oldWeek,guild.id);
  db.setMeta(`last_reset:${guild.id}`,oldWeek);

  if(config.announcementChannelId){
    const channel=guild.channels.cache.get(config.announcementChannelId);
    if(channel?.isTextBased()){
      const embed=new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setTitle("⚔️ SHIZU — Haftalık Savaş Sonuçları")
        .setDescription(`**Yazılı Sohbet Savaşı**\n${resultText(chatWinners,"chat")}\n\n**Sesli Kanal Savaşı**\n${resultText(voiceWinners,"voice")}\n\nYeni hafta başladı. Zirve için savaşmaya devam!`)
        .setTimestamp();
      await channel.send({embeds:[embed]}).catch(()=>{});
    }
  }

  console.log(`Hafta sıfırlandı: ${oldWeek} -> ${getWeekKey(new Date(Date.now()+60000),config.timezone)}`);
}

async function tick(guild){
  if(!isResetWindow(new Date(),config.timezone)) return;
  const week=currentWeek();
  if(lastResetKey===week) return;
  const persisted=db.getMeta(`last_reset:${guild.id}`);
  if(persisted===week){lastResetKey=week;return;}
  await resetWeek(guild,week);
  lastResetKey=week;
}

module.exports={tick,resetWeek};
