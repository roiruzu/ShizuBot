const ticketManager = require("../utils/ticketManager");

module.exports = async function interactionCreate(interaction) {
  try {
    if (interaction.isButton()) {
      const handled = await ticketManager.handleTicketButton(interaction);
      if (handled) return;
    }
    if (interaction.isModalSubmit()) {
      const handled = await ticketManager.handleTicketModalSubmit(interaction);
      if (handled) return;
    }
    if (!interaction.isChatInputCommand()) return;
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    const payload = { content: "❌ İşlem sırasında bir hata oluştu.", flags: 64 };
    if (interaction.replied || interaction.deferred) await interaction.followUp(payload).catch(() => {});
    else await interaction.reply(payload).catch(() => {});
  }
};
