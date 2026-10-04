const { SlashCommandBuilder } = require('discord.js');
const { handleCommand } = require('../rpg/rpgManager');
const data = new SlashCommandBuilder().setName('rpg').setDescription('🌌 Shizu Anime RPG')
 .addSubcommand(s=>s.setName('panel').setDescription('Modern RPG panelini aç'))
 .addSubcommand(s=>s.setName('profile').setDescription('RPG profilini göster'))
 .addSubcommand(s=>s.setName('inventory').setDescription('Envanterini göster'))
 .addSubcommand(s=>s.setName('balance').setDescription('Bakiyeni göster'))
 .addSubcommand(s=>s.setName('merchant').setDescription('Tüccarı göster'))
 .addSubcommand(s=>s.setName('espada').setDescription('Espada slotlarını göster'))
 .addSubcommand(s=>s.setName('achievements').setDescription('Başarımları göster'))
 .addSubcommand(s=>s.setName('buy').setDescription('Tüccardan eşya al').addIntegerOption(o=>o.setName('slot').setDescription('Stok sıra numarası').setRequired(true).setMinValue(1).setMaxValue(25)))
 .addSubcommand(s=>s.setName('craft').setDescription('Eşya craft et').addStringOption(o=>o.setName('recipe').setDescription('Tarif').setRequired(true).addChoices({name:'Soul Blade',value:'soul_blade'})))
 .addSubcommand(s=>s.setName('evolve').setDescription('Gelişimini değiştir').addStringOption(o=>o.setName('target').setDescription('Hedef').setRequired(true).addChoices({name:'Hollow',value:'hollow'},{name:'Menos',value:'menos'},{name:'Adjuchas',value:'adjuchas'},{name:'Vasto Lorde',value:'vasto_lorde'},{name:'Arrancar',value:'arrancar'})))
 .addSubcommand(s=>s.setName('achievement').setDescription('Achievement al').addStringOption(o=>o.setName('id').setDescription('Achievement').setRequired(true).addChoices({name:'FIRST BLOOD',value:'first_blood'},{name:'HOLLOW AWAKENING',value:'hollow_awakening'})))
 .addSubcommand(s=>s.setName('espada-claim').setDescription('Espada slotu al').addIntegerOption(o=>o.setName('slot').setDescription('0-9').setRequired(true).setMinValue(0).setMaxValue(9)));
module.exports={data,execute:handleCommand};
