const {
    SlashCommandBuilder,
    PermissionFlagsBits
, MessageFlags} = require("discord.js");

const {
    removeWarning
} = require("../utils/warningsStore");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("unwarn")
        .setDescription("Bir kullanÄ±cÄ±nÄ±n belirli uyarÄ±sÄ±nÄ± siler.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("UyarÄ±sÄ± silinecek kullanÄ±cÄ±")
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName("id")
                .setDescription("Silinecek uyarÄ± ID'si")
                .setRequired(true)
                .setMinValue(1)
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ModerateMembers
        ),

    async execute(interaction) {
        const user =
            interaction.options.getUser("user");

        const warningId =
            interaction.options.getInteger("id");

        let removedWarning;

        try {
            removedWarning =
                await removeWarning(
                    interaction.guild.id,
                    user.id,
                    warningId
                );
        } catch (error) {
            throw new Error(
                `UyarÄ± silinemedi: ${error.message}`
            );
        }

        if (!removedWarning) {
            return interaction.reply({
                content:
                    `âŒ ${user} kullanÄ±cÄ±sÄ±na ait **#${warningId}** numaralÄ± uyarÄ± bulunamadÄ±.`,
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.reply({
            content:
                `âœ… ${user} kullanÄ±cÄ±sÄ±nÄ±n **#${warningId}** numaralÄ± uyarÄ±sÄ± silindi.\n` +
                `**Sebep:** ${removedWarning.reason}`,
            flags: MessageFlags.Ephemeral
        });
    }
};
