const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits
, MessageFlags} = require("discord.js");

const {
    getUserWarnings
} = require("../utils/warningsStore");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("warnings")
        .setDescription("Bir kullanÄ±cÄ±nÄ±n uyarÄ±larÄ±nÄ± gÃ¶sterir.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("UyarÄ±larÄ± gÃ¶sterilecek kullanÄ±cÄ±")
                .setRequired(true)
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ModerateMembers
        ),

    async execute(interaction) {
        const user =
            interaction.options.getUser("user");

        let warnings;

        try {
            warnings = getUserWarnings(
                interaction.guild.id,
                user.id
            );
        } catch (error) {
            throw new Error(
                `UyarÄ±lar okunamadÄ±: ${error.message}`
            );
        }

        if (warnings.length === 0) {
            return interaction.reply({
                content:
                    `âœ… ${user} kullanÄ±cÄ±sÄ±nÄ±n hiÃ§ uyarÄ±sÄ± bulunmuyor.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const description = warnings
            .map(warning => {
                const timestamp =
                    Math.floor(
                        new Date(
                            warning.timestamp
                        ).getTime() / 1000
                    );

                return [
                    `### âš ï¸ UyarÄ± #${warning.id}`,
                    `**Sebep:** ${warning.reason}`,
                    `**Yetkili:** ${warning.moderatorTag}`,
                    `**Tarih:** <t:${timestamp}:F>`
                ].join("\n");
            })
            .join("\n\n");

        const embed = new EmbedBuilder()
            .setColor(0xffcc00)
            .setTitle(
                `âš ï¸ ${user.username} â€” UyarÄ±lar`
            )
            .setThumbnail(
                user.displayAvatarURL({
                    size: 256
                })
            )
            .setDescription(description)
            .setFooter({
                text:
                    `Toplam ${warnings.length} uyarÄ±`
            })
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral
        });
    }
};
