const {
    SlashCommandBuilder,
    PermissionFlagsBits
, MessageFlags} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("timeout")
        .setDescription("Bir kullanÄ±cÄ±ya timeout uygular.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Timeout uygulanacak kullanÄ±cÄ±")
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName("minutes")
                .setDescription("Timeout sÃ¼resi (dakika)")
                .setMinValue(1)
                .setMaxValue(40320)
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("Timeout sebebi")
                .setRequired(false)
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ModerateMembers
        ),

    async execute(interaction) {
        const user =
            interaction.options.getUser("user");

        const minutes =
            interaction.options.getInteger("minutes");

        const reason =
            interaction.options.getString("reason") ||
            "Sebep belirtilmedi.";

        // Ãœyeyi bul
        const member =
            await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

        if (!member) {
            return interaction.reply({
                content:
                    "âŒ Bu kullanÄ±cÄ± sunucuda bulunamadÄ±.",
                flags: MessageFlags.Ephemeral
            });
        }

        // Kendine timeout
        if (
            member.id === interaction.user.id
        ) {
            return interaction.reply({
                content:
                    "âŒ Kendine timeout uygulayamazsÄ±n.",
                flags: MessageFlags.Ephemeral
            });
        }

        // Sunucu sahibi
        if (
            member.id === interaction.guild.ownerId
        ) {
            return interaction.reply({
                content:
                    "âŒ Sunucu sahibine timeout uygulanamaz.",
                flags: MessageFlags.Ephemeral
            });
        }

        // Bot Ã¼yesi
        const botMember =
            await interaction.guild.members.fetchMe();

        // Bot hiyerarÅŸisi
        if (
            member.roles.highest.position >=
            botMember.roles.highest.position
        ) {
            return interaction.reply({
                content:
                    "âŒ Bu kullanÄ±cÄ±ya timeout uygulayamam. KullanÄ±cÄ±nÄ±n en yÃ¼ksek rolÃ¼ benim rolÃ¼mle aynÄ± veya daha yÃ¼ksek.",
                flags: MessageFlags.Ephemeral
            });
        }

        // ModeratÃ¶r hiyerarÅŸisi
        if (
            member.roles.highest.position >=
            interaction.member.roles.highest.position
        ) {
            return interaction.reply({
                content:
                    "âŒ Bu kullanÄ±cÄ±ya timeout uygulayamazsÄ±n. KullanÄ±cÄ±nÄ±n en yÃ¼ksek rolÃ¼ senin rolÃ¼nle aynÄ± veya daha yÃ¼ksek.",
                flags: MessageFlags.Ephemeral
            });
        }

        // DakikayÄ± milisaniyeye Ã§evir
        const duration =
            minutes * 60 * 1000;

        // Timeout
        await member.timeout(
            duration,
            reason
        );

        await interaction.reply({
            content:
                `ğŸ”‡ **${user.tag}** kullanÄ±cÄ±sÄ±na **${minutes} dakika** timeout uygulandÄ±.\n` +
                `ğŸ“ **Sebep:** ${reason}`
        });
    }
};
