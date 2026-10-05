module.exports = async function interactionCreate(interaction) {
  if (!interaction.isChatInputCommand()) return;
  const command=interaction.client.commands.get(interaction.commandName);
  if(!command) return;
  try { await command.execute(interaction); }
  catch(error){
    console.error(error);
    const payload={content:"❌ Komut çalıştırılırken bir hata oluştu.",flags:64};
    if(interaction.replied||interaction.deferred) await interaction.followUp(payload).catch(()=>{});
    else await interaction.reply(payload).catch(()=>{});
  }
};
