const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  MessageFlags,
  PermissionsBitField
} = require('discord.js');
const store = require('./rpgStore');
const { ITEMS, RECIPES, ACHIEVEMENTS, EVOLUTIONS } = require('./rpgData');

const COLORS = { main: 0x7c3aed, dark: 0x111827, gold: 0xf59e0b, green: 0x10b981, red: 0xef4444, blue: 0x3b82f6 };

function coins(p) {
  return `🪙 **${p.coins.animeCoin}** Anime Coin   •   💎 **${p.coins.rareCurrency}** Rare   •   🌑 **${p.coins.eventCurrency}** Event`;
}
function rarity(r) { return ({common:'Common',rare:'Rare',special:'Special',epic:'Epic',mythic:'Mythic'}[r] || r || 'Unknown'); }
function profileEmbed(member) {
  const p = store.getPlayer(member.guild.id, member.id);
  return new EmbedBuilder().setColor(COLORS.main).setTitle(`🌌 ${member.displayName} • Anime RPG`).setDescription(`**${p.activeTitle || 'Yeni Oyuncu'}**\n\n🧬 **Köken:** ${p.race}\n⚔️ **Gelişim:** ${p.evolution}\n⭐ **Achievement Point:** ${p.achievementPoints}\n🔄 **Rebirth:** ${p.rebirths}\n\n${coins(p)}`).setThumbnail(member.displayAvatarURL({size:256})).setFooter({text:'Shizu Anime RPG • Panel'});
}
function panelRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('rpg:profile').setLabel('Profil').setEmoji('👤').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('rpg:inventory').setLabel('Envanter').setEmoji('🎒').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('rpg:merchant').setLabel('Tüccar').setEmoji('🏪').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('rpg:quests').setLabel('Görevler').setEmoji('📜').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('rpg:achievements').setLabel('Başarımlar').setEmoji('🏆').setStyle(ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('rpg:craft').setLabel('Craft').setEmoji('⚒️').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('rpg:evolution').setLabel('Gelişim').setEmoji('🧬').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('rpg:espada').setLabel('Espada').setEmoji('⚔️').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('rpg:balance').setLabel('Bakiye').setEmoji('💰').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('rpg:refresh').setLabel('Yenile').setEmoji('🔄').setStyle(ButtonStyle.Secondary)
    )
  ];
}
function panelEmbed() { return new EmbedBuilder().setColor(COLORS.main).setTitle('🌌 SHIZU • ANIME RPG').setDescription('Anime evrenindeki yolculuğuna buradan devam et.\n\n👤 Profilini incele\n🎒 Eşyalarını yönet\n🏪 Tüccarı takip et\n⚒️ Craft yap\n🧬 Irkını geliştir\n🏆 Başarımlar kazan\n⚔️ Espada için savaş\n\n**Bir bölüm seçmek için aşağıdaki butonları kullan.**').setFooter({text:'Shizu RPG • Butonlu Modern Arayüz'}); }
function invEmbed(guildId,userId) {
  const inv=store.getInventory(guildId,userId); const lines=Object.entries(inv).filter(([,n])=>n>0).map(([id,n])=>`${ITEMS[id]?.name||id} **×${n}**  •  ${rarity(ITEMS[id]?.rarity)}`);
  return new EmbedBuilder().setColor(COLORS.blue).setTitle('🎒 Envanter').setDescription(lines.join('\n') || 'Envanterin şu anda boş.');
}
function merchantEmbed() {
  const m=store.getMerchant(); if(!m.active || m.expiresAt<=Date.now()) return new EmbedBuilder().setColor(COLORS.red).setTitle('🏪 Tüccar Yok').setDescription('Tüccar şu anda dünyada değil.');
  const lines=m.stock.map((s,i)=>`**${i+1}.** ${ITEMS[s.item]?.name||s.item}\n   🪙 ${s.price} • ${s.remaining===null?'∞':`×${s.remaining}`} • ${rarity(ITEMS[s.item]?.rarity)}`).join('\n\n');
  return new EmbedBuilder().setColor(COLORS.gold).setTitle('🏪 THE MERCHANT HAS ARRIVED').setDescription(lines).addFields({name:'⏳ Kalan süre',value:`<t:${Math.floor(m.expiresAt/1000)}:R>`});
}
function evolutionEmbed(guildId,userId) { const p=store.getPlayer(guildId,userId); const next=EVOLUTIONS[p.evolution]?.next||[]; return new EmbedBuilder().setColor(COLORS.main).setTitle('🧬 Güç Gelişimi').setDescription(`Mevcut: **${p.evolution}**\n\nSonraki yollar:\n${next.length?next.map(x=>`• ${x}`).join('\n'):'• Bu aşamanın devamı yok.'}\n\n⚠️ Her dönüşümün kendine özel görev, eşya ve puan şartları vardır.`); }
function achievementsEmbed() { return new EmbedBuilder().setColor(COLORS.gold).setTitle('🏆 Başarımlar').setDescription(Object.entries(ACHIEVEMENTS).map(([id,a])=>`**${a.name}**\n${a.description}\n🎁 ${a.reward.points||0} AP${a.reward.animeCoin?` • 🪙 ${a.reward.animeCoin}`:''}`).join('\n\n')); }
function espadaEmbed() { const e=store.getEspada(); return new EmbedBuilder().setColor(COLORS.red).setTitle('⚔️ ESPADA • 0—9').setDescription(Array.from({length:10},(_,i)=>`**${i}** — ${e.slots[String(i)]?`<@${e.slots[String(i)].userId}> 🔴 DOLU`:'🟢 BOŞ'} `).join('\n')).setFooter({text:'Espada slotları benzersizdir; her slot yalnızca bir oyuncuya aittir.'}); }
function craftComponents(){ return [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('rpg:craft-select').setPlaceholder('Bir tarif seç').addOptions(Object.entries(RECIPES).map(([id,r])=>({label:ITEMS[r.item]?.name||id,description:`${r.coins} Anime Coin • ${Object.entries(r.materials).map(([m,n])=>`${m}×${n}`).join(', ')}`.slice(0,100),value:id})) ))]; }
function merchantComponents(){ const m=store.getMerchant(); if(!m.active||m.expiresAt<=Date.now()) return []; return [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('rpg:buy-select').setPlaceholder('Bir eşya satın al').addOptions(m.stock.filter(s=>s.remaining!==0).slice(0,25).map((s,i)=>({label:`${i+1}. ${ITEMS[s.item]?.name||s.item}`.slice(0,100),description:`${s.price} Anime Coin • ${s.remaining===null?'Sınırsız':`Kalan ${s.remaining}`}`.slice(0,100),value:String(i)}))))]; }
function replyError(i,msg){ return i.reply({content:`❌ ${msg}`,flags:MessageFlags.Ephemeral}); }

function buy(guildId,userId,index){ const m=store.getMerchant(); if(!m.active||m.expiresAt<=Date.now()) throw new Error('Tüccar artık aktif değil.'); const s=m.stock[index]; if(!s) throw new Error('Geçersiz stok.'); if(s.remaining===0) throw new Error('Bu eşya tükendi.'); const p=store.getPlayer(guildId,userId); if(p.coins.animeCoin<s.price) throw new Error('Yeterli Anime Coin yok.'); p.coins.animeCoin-=s.price; store.savePlayer(p); store.addItem(guildId,userId,s.item,1); if(s.remaining!==null){s.remaining--;store.saveMerchant(m);} return ITEMS[s.item]?.name||s.item; }
function craft(guildId,userId,id){ const r=RECIPES[id]; if(!r) throw new Error('Tarif bulunamadı.'); const p=store.getPlayer(guildId,userId); if(p.coins.animeCoin<r.coins) throw new Error('Yeterli Anime Coin yok.'); if(!store.removeItems(guildId,userId,r.materials)) throw new Error('Gerekli materyaller eksik.'); p.coins.animeCoin-=r.coins; store.savePlayer(p); store.addItem(guildId,userId,r.item,r.amount); return ITEMS[r.item]?.name||r.item; }
function evolve(guildId,userId,target){ const p=store.getPlayer(guildId,userId); if(!EVOLUTIONS[p.evolution]?.next.includes(target)) throw new Error('Bu dönüşüm mevcut gelişim yolunda değil.'); if(target==='hollow'){ if(!store.hasItems(guildId,userId,{hollow_mask:1})) throw new Error('🎭 Hollow Mask gerekli.'); if(p.achievementPoints<250) throw new Error('⭐ 250 Achievement Point gerekli.'); if(p.coins.animeCoin<1000) throw new Error('🪙 1000 Anime Coin gerekli.'); store.removeItems(guildId,userId,{hollow_mask:1}); p.coins.animeCoin-=1000; p.race='hollow'; } p.evolution=target; store.savePlayer(p); return p; }
function claimAchievement(guildId,userId,id){ const a=ACHIEVEMENTS[id]; if(!a) throw new Error('Achievement bulunamadı.'); const p=store.getPlayer(guildId,userId); if(p.achievements.includes(id)) throw new Error('Bu achievement zaten alındı.'); p.achievements.push(id); p.achievementPoints+=a.reward.points||0; if(a.reward.animeCoin)p.coins.animeCoin+=a.reward.animeCoin; if(a.reward.title)p.activeTitle=a.reward.title; store.savePlayer(p); if(a.reward.rareMaterial)store.addItem(guildId,userId,'rare_material',a.reward.rareMaterial); return a; }
function claimEspada(guildId,userId,slot){ if(slot<0||slot>9)throw new Error('Espada slotu 0-9 olmalı.'); const p=store.getPlayer(guildId,userId); if(p.race!=='hollow'||p.evolution!=='arrancar')throw new Error('Espada olmak için Arrancar olmalısın.'); const e=store.getEspada(); const key=String(slot); if(e.slots[key])throw new Error(`Espada ${slot} zaten dolu.`); e.slots[key]={guildId,userId,claimedAt:Date.now()};store.saveEspada(e);p.evolution='espada';p.activeTitle=`Espada #${slot}`;store.savePlayer(p);return slot; }

async function showPanel(i,edit=false){ const payload={embeds:[panelEmbed()],components:panelRows()}; return edit?i.update(payload):i.reply(payload); }
async function handleButton(i){ if(!i.isButton()&&!i.isStringSelectMenu())return false; if(!i.customId.startsWith('rpg:'))return false; try{
  const id=i.customId;
  if(id==='rpg:panel')return showPanel(i,false);
  if(id==='rpg:profile')return i.update({embeds:[profileEmbed(i.member)],components:panelRows()});
  if(id==='rpg:inventory')return i.update({embeds:[invEmbed(i.guild.id,i.user.id)],components:panelRows()});
  if(id==='rpg:merchant')return i.update({embeds:[merchantEmbed()],components:[...merchantComponents(),...panelRows()]});
  if(id==='rpg:quests')return i.update({embeds:[new EmbedBuilder().setColor(COLORS.blue).setTitle('📜 Görevler').setDescription('Görev sistemi aktif altyapıda. Hikâye görevleri ve ilerleme adımları burada gösterilecek.')],components:panelRows()});
  if(id==='rpg:achievements')return i.update({embeds:[achievementsEmbed()],components:panelRows()});
  if(id==='rpg:craft')return i.update({embeds:[new EmbedBuilder().setColor(COLORS.main).setTitle('⚒️ Craft').setDescription('Bir tarif seç ve materyallerini kullanarak eşya üret.'),],components:[...craftComponents(),...panelRows()]});
  if(id==='rpg:evolution')return i.update({embeds:[evolutionEmbed(i.guild.id,i.user.id)],components:panelRows()});
  if(id==='rpg:espada')return i.update({embeds:[espadaEmbed()],components:panelRows()});
  if(id==='rpg:balance'){const p=store.getPlayer(i.guild.id,i.user.id);return i.update({embeds:[new EmbedBuilder().setColor(COLORS.gold).setTitle('💰 Bakiye').setDescription(coins(p))],components:panelRows()});}
  if(id==='rpg:refresh')return showPanel(i,true);
  if(id==='rpg:buy-select'){const name=buy(i.guild.id,i.user.id,Number(i.values[0]));return i.update({embeds:[new EmbedBuilder().setColor(COLORS.green).setTitle('✅ Satın alma başarılı').setDescription(`${name} envanterine eklendi.`),merchantEmbed()],components:[...merchantComponents(),...panelRows()]});}
  if(id==='rpg:craft-select'){const name=craft(i.guild.id,i.user.id,i.values[0]);return i.update({embeds:[new EmbedBuilder().setColor(COLORS.green).setTitle('⚒️ Craft tamamlandı').setDescription(`${name} üretildi.`)],components:panelRows()});}
 }catch(e){return i.reply({content:`❌ ${e.message}`,flags:MessageFlags.Ephemeral});} return false; }
async function handleCommand(i){ if(!i.isChatInputCommand())return false; if(i.commandName==='rpg'){const sub=i.options.getSubcommand(false); if(!sub||sub==='panel')return showPanel(i,false); if(sub==='profile')return i.reply({embeds:[profileEmbed(i.member)],components:panelRows()}); if(sub==='inventory')return i.reply({embeds:[invEmbed(i.guild.id,i.user.id)],components:panelRows()}); if(sub==='merchant')return i.reply({embeds:[merchantEmbed()],components:[...merchantComponents(),...panelRows()]}); if(sub==='espada')return i.reply({embeds:[espadaEmbed()],components:panelRows()}); if(sub==='achievements')return i.reply({embeds:[achievementsEmbed()],components:panelRows()}); if(sub==='balance'){const p=store.getPlayer(i.guild.id,i.user.id);return i.reply({embeds:[new EmbedBuilder().setColor(COLORS.gold).setTitle('💰 Bakiye').setDescription(coins(p))],components:panelRows()});} if(sub==='buy')return i.reply({content:`🏪 ${buy(i.guild.id,i.user.id,i.options.getInteger('slot')-1)} satın alındı.`,flags:MessageFlags.Ephemeral}); if(sub==='craft')return i.reply({content:`⚒️ ${craft(i.guild.id,i.user.id,i.options.getString('recipe'))} üretildi.`,flags:MessageFlags.Ephemeral}); if(sub==='evolve')return i.reply({content:`🧬 Gelişim tamamlandı: **${evolve(i.guild.id,i.user.id,i.options.getString('target')).evolution}**`,flags:MessageFlags.Ephemeral}); if(sub==='achievement')return i.reply({content:`🏆 **${claimAchievement(i.guild.id,i.user.id,i.options.getString('id')).name}** kazanıldı!`,flags:MessageFlags.Ephemeral}); if(sub==='espada-claim')return i.reply({content:`⚔️ **Espada ${claimEspada(i.guild.id,i.user.id,i.options.getInteger('slot'))}** artık senin!`,flags:MessageFlags.Ephemeral}); }
 if(i.commandName==='rpgadmin'){if(!i.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild))return replyError(i,'Bu komut için Manage Server gerekli.');const sub=i.options.getSubcommand();if(sub==='merchant'){const duration=i.options.getInteger('minutes')||30;store.saveMerchant({active:true,expiresAt:Date.now()+duration*60000,stock:[{item:'hollow_mask',price:1200,remaining:1},{item:'zanpakuto',price:2500,remaining:1},{item:'soul_fragment',price:150,remaining:10},{item:'rare_material',price:900,remaining:3}]});return i.reply({content:`🏪 Tüccar **${duration} dakika** açıldı.`});}if(sub==='give'){const u=i.options.getUser('user'),item=i.options.getString('item'),amount=i.options.getInteger('amount');store.addItem(i.guild.id,u.id,item,amount);return i.reply({content:`🎒 ${u} → ${ITEMS[item]?.name||item} ×${amount}`});}if(sub==='coin'){const u=i.options.getUser('user'),amount=i.options.getInteger('amount'),p=store.getPlayer(i.guild.id,u.id);p.coins.animeCoin=Math.max(0,p.coins.animeCoin+amount);store.savePlayer(p);return i.reply({content:`🪙 ${u} bakiyesi güncellendi.`});}}
 return false; }
module.exports={handleButton,handleCommand,profileEmbed,store,ITEMS};
