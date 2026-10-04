require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs=require('fs');const path=require('path');
const commands=[];const dir=path.join(__dirname,'commands');
for(const file of fs.readdirSync(dir).filter(f=>f.endsWith('.js'))){const c=require(path.join(dir,file));if(c.data?.toJSON)commands.push(c.data.toJSON());}
if(!process.env.DISCORD_TOKEN||!process.env.CLIENT_ID)throw new Error('DISCORD_TOKEN ve CLIENT_ID gerekli.');
const rest=new REST({version:'10'}).setToken(process.env.DISCORD_TOKEN);
(async()=>{console.log(`🚀 ${commands.length} komut yükleniyor...`);if(process.env.GUILD_ID){await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID,process.env.GUILD_ID),{body:commands});console.log(`✅ Guild komutları güncellendi: ${process.env.GUILD_ID}`);}else{await rest.put(Routes.applicationCommands(process.env.CLIENT_ID),{body:commands});console.log('✅ Global komutlar güncellendi.');}})().catch(e=>{console.error(e);process.exit(1);});
