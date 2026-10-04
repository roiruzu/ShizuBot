const {
    SlashCommandBuilder,
    PermissionFlagsBits
, MessageFlags} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("clear")
        .setDescription("Kanaldaki mesajlarÄ± toplu olarak siler.")
        .addIntegerOption(option =>
            option
                .setName("amount")
                .setDescription("Silinecek mesaj sayÄ±sÄ±")
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true)
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageMessages
        ),

    async execute(interaction) {
        const amount =
            interaction.options.getInteger("amount");

        // Kanal kontrolÃ¼
        if (
            !interaction.channel ||
            !interaction.channel.isTextBased()
        ) {
            return interaction.reply({
                content:
                    "âŒ Bu komut burada kullanÄ±lamaz.",
                flags: MessageFlags.Ephemeral
            });
        }

        // MesajlarÄ± sil
        const messages =
            await interaction.channel.bulkDelete(
                amount,
                true
            );

        // SonuÃ§
        await interaction.reply({
            content:
                `ğŸ§¹ **${messages.size}** mesaj silindi.`,
            flags: MessageFlags.Ephemeral
        });
    }
};
