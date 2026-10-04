const {
    SlashCommandBuilder,
    PermissionFlagsBits
, MessageFlags} = require("discord.js");

const {
    clearUserWarnings
} = require("../utils/warningsStore");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("clearwarnings")
        .setDescription("Bir kullanÄ±cÄ±nÄ±n tÃ¼m uyarÄ±larÄ±nÄ± siler.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("UyarÄ±larÄ± silinecek kullanÄ±cÄ±")
                .setRequired(true)
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ModerateMembers
        ),

    async execute(interaction) {
        const user =
            interaction.options.getUser("user");

        let removedWarnings;

        try {
            removedWarnings =
                await clearUserWarnings(
                    interaction.guild.id,
                    user.id
                );
        } catch (error) {
            throw new Error(
                `UyarÄ±lar silinemedi: ${error.message}`
            );
        }

        if (removedWarnings.length === 0) {
            return interaction.reply({
                content:
                    `â„¹ï¸ ${user} kullanÄ±cÄ±sÄ±nÄ±n silinecek bir uyarÄ±sÄ± yok.`,
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.reply({
            content:
                `âœ… ${user} kullanÄ±cÄ±sÄ±nÄ±n tÃ¼m uyarÄ±larÄ± silindi.\n` +
                `ğŸ—‘ï¸ Silinen uyarÄ± sayÄ±sÄ±: **${removedWarnings.length}**`,
            flags: MessageFlags.Ephemeral
        });
    }
};
