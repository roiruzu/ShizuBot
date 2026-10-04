require('dotenv').config();
const logger=require('./utils/logger');
const {Client,Collection,GatewayIntentBits,Partials,MessageFlags,ActivityType}=require('discord.js');
const fs=require('fs');const path=require('path');
const {loadGuild}=require('./utils/database');
const {handleCommandError}=require('./utils/errorHandler');
const {handleButton:rpgButton,handleCommand:rpgCommand}=require('./rpg/rpgManager');
let ticketManager=null, levelingManager=null, profanityFilter=null, logChannel=null;
try{ticketManager=require('./utils/ticketManager');}catch(e){logger.warn('Ticket sistemi yüklenemedi: '+e.message)}
try{levelingManager=require('./utils/levelingManager');}catch(e){logger.warn('Level sistemi yüklenemedi: '+e.message)}
try{profanityFilter=require('./utils/profanityFilter');}catch(e){logger.warn('Profanity filter yüklenemedi: '+e.message)}
try{logChannel=require('./utils/logChannel');}catch(e){logger.warn('Log channel modülü yüklenemedi: '+e.message)}

const client=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMembers,GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent,GatewayIntentBits.GuildPresences,GatewayIntentBits.GuildVoiceStates],partials:[Partials.Channel,Partials.Message,Partials.GuildMember,Partials.User]});
client.commands=new Collection();
const commandsPath=path.join(__dirname,'commands');
for(const file of (fs.existsSync(commandsPath)?fs.readdirSync(commandsPath).filter(f=>f.endsWith('.js')):[])){try{const command=require(path.join(commandsPath,file));if(!command.data||!command.execute){logger.warn(`Geçersiz command: ${file}`);continue;}client.commands.set(command.data.name,command);logger.info(`Command yüklendi: /${command.data.name}`);}catch(e){logger.error(`Command yüklenemedi: ${file}`);logger.error(e);}}

client.once('clientReady',async()=>{logger.success(`Shizu olarak giriş yapıldı: ${client.user.tag}`);client.user.setPresence({activities:[{name:'Shizu Anime RPG • /rpg',type:ActivityType.Playing}],status:'online'});for(const guild of client.guilds.cache.values()){try{await loadGuild(guild.id);if(logChannel?.getOrCreateLogChannel)await logChannel.getOrCreateLogChannel(guild);}catch(e){logger.error(`Guild hazırlama hatası: ${guild.name}`);logger.error(e);}}logger.info(`Command sayısı: ${client.commands.size}`);logger.success('Shizu tamamen aktif.');});

client.on('interactionCreate',async interaction=>{
  try{
    if(interaction.isButton()||interaction.isStringSelectMenu()){
      if(await rpgButton(interaction))return;
      if(ticketManager?.handleTicketButton && await ticketManager.handleTicketButton(interaction))return;
    }
    if(!interaction.isChatInputCommand())return;
    if(interaction.commandName==='rpg'||interaction.commandName==='rpgadmin'){await rpgCommand(interaction);return;}
    const command=client.commands.get(interaction.commandName);if(!command)return;
    logger.info(`Command çalıştırılıyor: /${interaction.commandName} | ${interaction.user.tag}`);
    await command.execute(interaction);logger.info(`Command tamamlandı: /${interaction.commandName}`);
  }catch(error){await handleCommandError(error,interaction);}
});

client.on('messageCreate',async message=>{
  if(!message.guild||message.author.bot)return;
  try{
    if(message.content.trim().toLowerCase()==='!rank'&&levelingManager?.getRankInfo){const i=await levelingManager.getRankInfo(message.guild,message.author);return message.reply({content:`📊 **${message.author.username}**\n💬 Chat Lv.${i.chatLevel} • ${i.chatXP} XP\n🎧 Ses Lv.${i.voiceLevel} • ${i.voiceXP} XP`});}
    if(['!top','!leaderboard'].includes(message.content.trim().toLowerCase())&&levelingManager?.getChatLeaderboard){const rows=levelingManager.getChatLeaderboard(message.guild.id).slice(0,10);return message.reply({content:'🏆 **Chat Leaderboard**\n'+(rows.length?rows.map((r,n)=>`**${n+1}.** <@${r.userId}> — Lv.${r.level} • ${r.xp} XP`).join('\n'):'Henüz veri yok.')});}
    if(profanityFilter?.checkMessage){const blocked=await profanityFilter.checkMessage(message);if(blocked)return;}
    if(levelingManager?.handleMessageXP)await levelingManager.handleMessageXP(message);
  }catch(e){logger.error('messageCreate hatası');logger.error(e);}
});
let voiceBusy=false;setInterval(async()=>{if(voiceBusy||!levelingManager?.handleVoiceXP)return;voiceBusy=true;try{await levelingManager.handleVoiceXP(client);}catch(e){logger.error('Voice XP hatası');logger.error(e);}finally{voiceBusy=false;}},60000);

client.on('guildMemberAdd',async member=>{try{logger.info(`Üye katıldı: ${member.user.tag} (${member.id}) | ${member.guild.name}`);const data=await loadGuild(member.guild.id);if(data?.welcomeChannel){const ch=member.guild.channels.cache.get(data.welcomeChannel);if(ch)await ch.send({content:(data.welcomeMessage||'👋 Hoş geldin {user}!').replace(/{user}/g,`${member}`)});}}catch(e){logger.error('guildMemberAdd hatası');logger.error(e);}});
client.on('guildMemberRemove',member=>logger.info(`Üye ayrıldı: ${member.user.tag} (${member.id}) | ${member.guild.name}`));
client.on('messageDelete',async message=>{try{if(message.partial)await message.fetch().catch(()=>{});logger.info(`Mesaj silindi | ${message.channel?.name||'Bilinmiyor'} | ${message.id}`);}catch(e){logger.error(e);}});
client.on('error',e=>logger.error(e));client.on('warn',m=>logger.warn(`Discord Warning: ${m}`));
process.on('unhandledRejection',e=>{logger.error('UNHANDLED REJECTION');logger.error(e);});process.on('uncaughtException',e=>{logger.error('UNCAUGHT EXCEPTION');logger.error(e);setTimeout(()=>process.exit(1),1000);});
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>{logger.info(`${sig} alındı. Shizu kapatılıyor...`);try{client.destroy();}catch{}process.exit(0);});
if(!process.env.DISCORD_TOKEN){logger.error('DISCORD_TOKEN .env dosyasında bulunamadı.');process.exit(1);}logger.info("Discord'a bağlanılıyor...");client.login(process.env.DISCORD_TOKEN).catch(e=>{logger.error('Discord login başarısız.');logger.error(e);process.exit(1);});
