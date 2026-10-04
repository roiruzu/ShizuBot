const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { handleCommand } = require('../rpg/rpgManager');
const data = new SlashCommandBuilder().setName('rpgadmin').setDescription('🛠️ RPG yönetim araçları').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
 .addSubcommand(s=>s.setName('merchant').setDescription('Tüccarı aç').addIntegerOption(o=>o.setName('minutes').setDescription('Dakika').setRequired(false).setMinValue(1).setMaxValue(1440)))
 .addSubcommand(s=>s.setName('give').setDescription('Oyuncuya eşya ver').addUserOption(o=>o.setName('user').setDescription('Oyuncu').setRequired(true)).addStringOption(o=>o.setName('item').setDescription('Eşya').setRequired(true).addChoices({name:'Hollow Mask',value:'hollow_mask'},{name:'Soul Fragment',value:'soul_fragment'},{name:'Rare Material',value:'rare_material'},{name:'Zanpakuto',value:'zanpakuto'},{name:'Soul Blade',value:'soul_blade'})).addIntegerOption(o=>o.setName('amount').setDescription('Adet').setRequired(true).setMinValue(1).setMaxValue(1000)))
 .addSubcommand(s=>s.setName('coin').setDescription('Anime Coin ekle/çıkar').addUserOption(o=>o.setName('user').setDescription('Oyuncu').setRequired(true)).addIntegerOption(o=>o.setName('amount').setDescription('Miktar').setRequired(true).setMinValue(-1000000).setMaxValue(1000000)));
module.exports={data,execute:handleCommand};
