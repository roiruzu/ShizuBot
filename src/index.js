const { Client, Collection, GatewayIntentBits, Partials } = require("discord.js");
const config = require("./config");
const topCommand = require("./commands/top");

const client = new Client({
  intents:[
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers
  ],
  partials:[Partials.Channel]
});

client.commands=new Collection();

// Kritik intent kontrolü: mesaj aktivitesi ve XP için Message Content açık olmalıdır.
const REQUIRED_INTENTS = [
  [GatewayIntentBits.Guilds, "Guilds"],
  [GatewayIntentBits.GuildMessages, "GuildMessages"],
  [GatewayIntentBits.MessageContent, "MessageContent"],
  [GatewayIntentBits.GuildVoiceStates, "GuildVoiceStates"],
  [GatewayIntentBits.GuildMembers, "GuildMembers"]
];
const missingIntents = REQUIRED_INTENTS.filter(([flag]) => !(client.options.intents.bitfield & flag)).map(([,name]) => name);
if (missingIntents.length) console.warn(`[INTENT] Eksik intent: ${missingIntents.join(", ")}`);

// Tüm slash komutlarını yükle.
const fs=require("node:fs");
const path=require("node:path");
const commandsPath=path.join(__dirname,"commands");
const commandFiles = fs.readdirSync(commandsPath).filter(f=>f.endsWith(".js"));
for(const file of commandFiles){
  try{
    const command=require(path.join(commandsPath,file));
    if(command?.data?.name && typeof command.execute === "function") client.commands.set(command.data.name,command);
    else console.error(`[COMMAND LOAD] ${file}: data/execute eksik`);
  }catch(error){console.error(`[COMMAND LOAD] ${file}`,error);}
}
console.log(`[COMMAND LOAD] ${client.commands.size}/${commandFiles.length} komut hazır: ${[...client.commands.keys()].join(", ")}`);

// top komutu yüklenmediyse garanti et.
if(!client.commands.has(topCommand.data.name)) client.commands.set(topCommand.data.name,topCommand);

const events={
  messageCreate:require("./events/messageCreate"),
  voiceStateUpdate:require("./events/voiceStateUpdate"),
  interactionCreate:require("./events/interactionCreate")
};

client.once("clientReady", client=>require("./events/ready")(client));
client.on("messageCreate",events.messageCreate);
client.on("voiceStateUpdate",events.voiceStateUpdate);
client.on("interactionCreate",events.interactionCreate);

process.on("unhandledRejection",error=>console.error("Unhandled rejection:",error));
process.on("uncaughtException",error=>console.error("Uncaught exception:",error));

client.login(config.token);
