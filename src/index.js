const {
  Client,
  Collection,
  GatewayIntentBits,
  Partials
} = require("discord.js");

const config = require("./config");
const topCommand = require("./commands/top");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

client.commands = new Collection();
client.commands.set(topCommand.data.name, topCommand);

client.once("ready", (...args) =>
  require("./events/ready")(...args)
);

client.on("messageCreate", (...args) =>
  require("./events/messageCreate")(...args)
);

client.on("voiceStateUpdate", (...args) =>
  require("./events/voiceStateUpdate")(...args)
);

client.on("interactionCreate", (...args) =>
  require("./events/interactionCreate")(...args)
);

process.on("unhandledRejection", error => {
  console.error("Unhandled rejection:", error);
});

process.on("uncaughtException", error => {
  console.error("Uncaught exception:", error);
});

client.login(config.token);
