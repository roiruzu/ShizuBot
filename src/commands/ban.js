const {
    SlashCommandBuilder,
    PermissionFlagsBits
, MessageFlags} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Bir kullanÄ±cÄ±yÄ± sunucudan yasaklar.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Yasaklanacak kullanÄ±cÄ±")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("Yasaklama sebebi")
                .setRequired(false)
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.BanMembers
        ),

    async execute(interaction) {
        const user =
            interaction.options.getUser("user");

        const reason =
            interaction.options.getString("reason") ||
            "Sebep belirtilmedi.";

        // KullanÄ±cÄ±yÄ± sunucudan al
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

        // Kendini banlama
        if (
            member.id === interaction.user.id
        ) {
            return interaction.reply({
                content:
                    "âŒ Kendini yasaklayamazsÄ±n.",
                flags: MessageFlags.Ephemeral
            });
        }

        // Sunucu sahibini banlama
        if (
            member.id === interaction.guild.ownerId
        ) {
            return interaction.reply({
                content:
                    "âŒ Sunucu sahibini yasaklayamazsÄ±n.",
                flags: MessageFlags.Ephemeral
            });
        }

        // Bot Ã¼yesi
        const botMember =
            await interaction.guild.members.fetchMe();

        // Botun rolÃ¼ hedefin Ã¼stÃ¼nde olmalÄ±
        if (
            member.roles.highest.position >=
            botMember.roles.highest.position
        ) {
            return interaction.reply({
                content:
                    "âŒ Bu kullanÄ±cÄ±yÄ± yasaklayamam. KullanÄ±cÄ±nÄ±n en yÃ¼ksek rolÃ¼ benim rolÃ¼mle aynÄ± veya daha yÃ¼ksek.",
                flags: MessageFlags.Ephemeral
            });
        }

        // ModeratÃ¶r hedefin Ã¼stÃ¼nde olmalÄ±
        if (
            member.roles.highest.position >=
            interaction.member.roles.highest.position
        ) {
            return interaction.reply({
                content:
                    "âŒ Bu kullanÄ±cÄ±yÄ± yasaklayamazsÄ±n. KullanÄ±cÄ±nÄ±n en yÃ¼ksek rolÃ¼ senin rolÃ¼nle aynÄ± veya daha yÃ¼ksek.",
                flags: MessageFlags.Ephemeral
            });
        }

        // Ban
        await member.ban({
            reason: reason
        });

        await interaction.reply({
            content:
                `ğŸ”¨ **${user.tag}** sunucudan yasaklandÄ±.\n` +
                `ğŸ“ **Sebep:** ${reason}`
        });
    }
};
