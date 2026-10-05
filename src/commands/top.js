const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const db = require("../database");
const { currentWeek } = require("../services/activityService");

const WIDTH=1200;
const HEIGHT=950;
const WHITE="#fff";
const MUTED="#a99bc4";
const PURPLE="#a855f7";
const LIGHT="#d8b4fe";

function num(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}
function formatNumber(v){return num(v).toLocaleString("tr-TR");}
function formatTime(s){s=Math.max(0,Math.floor(num(s)));const h=Math.floor(s/3600),m=Math.floor((s%3600)/60);return h?`${h}sa ${m}dk`:`${m}dk`;}
function roundedRect(ctx,x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}
function text(ctx,v,x,y,size,color=WHITE,weight="700"){ctx.font=`${weight} ${size}px Arial`;ctx.fillStyle=color;ctx.fillText(String(v),x,y);}
function center(ctx,v,x,y,size,color=WHITE,weight="700"){ctx.font=`${weight} ${size}px Arial`;ctx.fillStyle=color;ctx.textAlign="center";ctx.fillText(String(v),x,y);ctx.textAlign="left";}
function stars(ctx){for(const [x,y,r] of [[45,35,2],[110,80,1],[190,40,1],[270,95,2],[360,45,1],[440,80,2],[530,30,1],[610,90,1],[700,42,2],[790,100,1],[875,45,1],[960,75,2],[1060,35,1],[1140,95,2],[30,260,1],[1120,280,1],[50,875,2],[1140,850,2]]){ctx.fillStyle="rgba(255,255,255,.7)";ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}}
function moon(ctx){const g=ctx.createRadialGradient(1040,90,5,1040,90,160);g.addColorStop(0,"rgba(168,85,247,.45)");g.addColorStop(1,"rgba(168,85,247,0)");ctx.fillStyle=g;ctx.beginPath();ctx.arc(1040,90,160,0,Math.PI*2);ctx.fill();ctx.fillStyle=LIGHT;ctx.beginPath();ctx.arc(1040,90,58,0,Math.PI*2);ctx.fill();ctx.fillStyle="#120622";ctx.beginPath();ctx.arc(1068,72,57,0,Math.PI*2);ctx.fill();}
async function avatar(user){try{return await loadImage(user.displayAvatarURL({extension:"png",size:128,forceStatic:true}));}catch{return null;}}
function drawAvatar(ctx,img,x,y,size,glow=PURPLE){ctx.save();ctx.shadowColor=glow;ctx.shadowBlur=24;ctx.fillStyle=glow;ctx.beginPath();ctx.arc(x+size/2,y+size/2,size/2+4,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.beginPath();ctx.arc(x+size/2,y+size/2,size/2,0,Math.PI*2);ctx.clip();if(img)ctx.drawImage(img,x,y,size,size);else{ctx.fillStyle="#2a1048";ctx.fillRect(x,y,size,size);}ctx.restore();}
function medal(rank){return ["1","2","3"][rank-1]||String(rank);}
function drawCard(ctx,item,rank,x,y,w,h,img){const grad=ctx.createLinearGradient(x,y,x+w,y+h);grad.addColorStop(0,rank===1?"rgba(126,58,180,.65)":"rgba(48,27,72,.82)");grad.addColorStop(1,"rgba(25,12,42,.95)");ctx.fillStyle=grad;roundedRect(ctx,x,y,w,h,18);ctx.fill();ctx.strokeStyle=rank===1?"rgba(216,180,254,.7)":"rgba(168,85,247,.2)";ctx.lineWidth=rank===1?2:1;roundedRect(ctx,x,y,w,h,18);ctx.stroke();
  center(ctx,medal(rank),x+42,y+43,rank<=3?23:18,rank===1?"#f5d76e":WHITE);
  drawAvatar(ctx,img,x+68,y+10,58,rank===1?"#c084fc":PURPLE);
  text(ctx,item.member.displayName?.slice(0,18)||item.member.user.username.slice(0,18),x+145,y+32,18,WHITE);
  text(ctx,rank===1?"HAFTANIN LİDERİ":"HAFTALIK AKTİVİTE",x+145,y+51,9,MUTED);
  text(ctx,"MESAJ",x+410,y+25,9,MUTED);text(ctx,formatNumber(item.chat_messages),x+410,y+48,16,WHITE);
  text(ctx,"SES",x+555,y+25,9,MUTED);text(ctx,formatTime(item.voice_seconds),x+555,y+48,16,WHITE);
  text(ctx,"SKOR",x+760,y+25,9,MUTED);text(ctx,formatNumber(item.score),x+760,y+48,16,rank===1?LIGHT:WHITE);
}
async function getRows(guild,type){let rows;if(type==="chat")rows=db.getChatLeaderboard(currentWeek(),guild.id,10);else if(type==="voice")rows=db.getVoiceLeaderboard(currentWeek(),guild.id,10);else rows=db.getOverallLeaderboard(currentWeek(),guild.id,10);const out=[];for(const row of rows){try{const member=await guild.members.fetch(row.userId);if(member.user.bot)continue;out.push({...row,member});}catch{}}return out;}
async function render(guild,rows,type){const canvas=createCanvas(WIDTH,HEIGHT),ctx=canvas.getContext("2d");const bg=ctx.createLinearGradient(0,0,WIDTH,HEIGHT);bg.addColorStop(0,"#090312");bg.addColorStop(.45,"#17072f");bg.addColorStop(1,"#421866");ctx.fillStyle=bg;ctx.fillRect(0,0,WIDTH,HEIGHT);stars(ctx);moon(ctx);ctx.strokeStyle="rgba(168,85,247,.65)";ctx.lineWidth=2;roundedRect(ctx,2,2,WIDTH-4,HEIGHT-4,20);ctx.stroke();
  text(ctx,"SHIZU",55,66,30,WHITE);text(ctx,"HAFTALIK SIRALAMA",55,91,12,MUTED);
  const title=type==="chat"?"MESAJ AKTİVİTESİ":type==="voice"?"SES AKTİVİTESİ":"GENEL AKTİVİTE";text(ctx,title,55,135,22,LIGHT);text(ctx,"Her Pazar 23:59  •  İlk 3'e özel rol",55,157,11,MUTED);
  if(!rows.length){roundedRect(ctx,55,205,1090,260,24);ctx.fillStyle="rgba(45,22,65,.75)";ctx.fill();center(ctx,"Bu hafta henüz aktivite verisi yok.",600,320,25,WHITE);center(ctx,"İlk mesajı gönder ve SHIZU sıralamasına gir.",600,360,14,MUTED);text(ctx,"SHIZU",55,910,11,MUTED);return canvas.encode("png");}
  for(const r of rows)r.avatar=await avatar(r.member.user);
  const x=55,w=1090,h=64,gap=8,start=190;for(let i=0;i<rows.length;i++)drawCard(ctx,rows[i],i+1,x,start+i*(h+gap),w,h,rows[i].avatar);
  text(ctx,"SHIZU",55,920,11,MUTED);text(ctx,"ANIME • COMMUNITY • ACTIVITY",900,920,10,MUTED);return canvas.encode("png");
}

const data=new SlashCommandBuilder().setName("top").setDescription("SHIZU haftalık aktivite sıralamasını gösterir.").addStringOption(o=>o.setName("kategori").setDescription("Sıralama türü").setRequired(false).addChoices({name:"Genel",value:"all"},{name:"Yazılı Sohbet",value:"chat"},{name:"Sesli Kanal",value:"voice"}));
async function execute(interaction){try{if(!interaction.guild){await interaction.reply({content:"❌ Bu komut sadece sunucuda kullanılabilir.",flags:64});return;}await interaction.deferReply();const type=interaction.options.getString("kategori")||"all";const rows=await getRows(interaction.guild,type);const buffer=await render(interaction.guild,rows,type);await interaction.editReply({files:[new AttachmentBuilder(buffer,{name:"shizu-leaderboard.png"})]});}catch(error){console.error("[TOP ERROR]",error);const content="❌ Sıralama kartı oluşturulurken bir hata oluştu.";try{if(interaction.deferred||interaction.replied)await interaction.editReply({content});else await interaction.reply({content,flags:64});}catch{}}}
module.exports={data,execute};
