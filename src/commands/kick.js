const {
    SlashCommandBuilder,
    PermissionFlagsBits
, MessageFlags} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("kick")
        .setDescription("Bir kullanÄ±cÄ±yÄ± sunucudan atar.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("AtÄ±lacak kullanÄ±cÄ±")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("AtÄ±lma sebebi")
                .setRequired(false)
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.KickMembers
        ),

    async execute(interaction) {
        const user = interaction.options.getUser("user");
        const reason =
            interaction.options.getString("reason") ||
            "Sebep belirtilmedi.";

        const member =
            await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

        if (!member) {
            return interaction.reply({
                content: "âŒ Bu kullanÄ±cÄ± sunucuda bulunamadÄ±.",
                flags: MessageFlags.Ephemeral
            });
        }

        if (member.id === interaction.user.id) {
            return interaction.reply({
                content: "âŒ Kendini atamazsÄ±n.",
                flags: MessageFlags.Ephemeral
            });
        }

        if (member.id === interaction.guild.ownerId) {
            return interaction.reply({
                content: "âŒ Sunucu sahibini atamazsÄ±n.",
                flags: MessageFlags.Ephemeral
            });
        }

        const botMember =
            await interaction.guild.members.fetchMe();

        if (
            member.roles.highest.position >=
            botMember.roles.highest.position
        ) {
            return interaction.reply({
                content:
                    "âŒ Bu kullanÄ±cÄ±yÄ± atamam. KullanÄ±cÄ±nÄ±n rolÃ¼ benim rolÃ¼mle aynÄ± veya daha yÃ¼ksek.",
                flags: MessageFlags.Ephemeral
            });
        }

        if (
            member.roles.highest.position >=
            interaction.member.roles.highest.position
        ) {
            return interaction.reply({
                content:
                    "âŒ Bu kullanÄ±cÄ±yÄ± atamazsÄ±n. KullanÄ±cÄ±nÄ±n rolÃ¼ senin rolÃ¼nle aynÄ± veya daha yÃ¼ksek.",
                flags: MessageFlags.Ephemeral
            });
        }

        await member.kick(reason);

        await interaction.reply({
            content:
                `ğŸ‘¢ **${user.tag}** sunucudan atÄ±ldÄ±.\n` +
                `**Sebep:** ${reason}`
        });
    }
};
