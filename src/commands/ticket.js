const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    MessageFlags
} = require("discord.js");

const { saveConfig } = require("../utils/ticketStore");
const logger = require("../utils/logger");

// ============================================================
// TICKET PANEL KANALI
// ============================================================

const TICKET_PANEL_CHANNEL_ID = "1556679317914910860";


// ============================================================
// COMMAND
// ============================================================

module.exports = {

    data: new SlashCommandBuilder()
        .setName("ticket")
        .setDescription("Ticket sistemini yönetir.")

        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild.toString()
        )

        .addSubcommand(subcommand =>
            subcommand
                .setName("setup")
                .setDescription("Ticket sistemini kurar.")

                .addRoleOption(option =>
                    option
                        .setName("support_role")
                        .setDescription(
                            "Ticket destek ekibinin rolü."
                        )
                        .setRequired(true)
                )

                .addChannelOption(option =>
                    option
                        .setName("category")
                        .setDescription(
                            "Ticket kanallarının oluşturulacağı kategori."
                        )
                        .addChannelTypes(
                            ChannelType.GuildCategory
                        )
                        .setRequired(false)
                )
        ),


    // ========================================================
    // EXECUTE
    // ========================================================

    async execute(interaction) {

        // ----------------------------------------------------
        // YETKİ KONTROLÜ
        // ----------------------------------------------------

        if (
            !interaction.memberPermissions.has(
                PermissionFlagsBits.ManageGuild
            )
        ) {

            return interaction.reply({
                content:
                    "❌ Bu komutu kullanmak için **Sunucuyu Yönet** yetkisine sahip olmalısın.",
                flags: MessageFlags.Ephemeral
            });
        }


        // ----------------------------------------------------
        // SUBCOMMAND
        // ----------------------------------------------------

        const subcommand =
            interaction.options.getSubcommand();


        if (subcommand !== "setup") {
            return;
        }


        // ----------------------------------------------------
        // SUNUCU
        // ----------------------------------------------------

        const guild = interaction.guild;


        if (!guild) {

            return interaction.reply({
                content:
                    "❌ Bu komut yalnızca sunucularda kullanılabilir.",
                flags: MessageFlags.Ephemeral
            });
        }


        // ----------------------------------------------------
        // SUPPORT ROLE
        // ----------------------------------------------------

        const supportRole =
            interaction.options.getRole("support_role");


        if (!supportRole) {

            return interaction.reply({
                content:
                    "❌ Destek rolü bulunamadı.",
                flags: MessageFlags.Ephemeral
            });
        }


        // ----------------------------------------------------
        // BOT MEMBER
        // ----------------------------------------------------

        const botMember =
            guild.members.me ||
            await guild.members
                .fetch(interaction.client.user.id)
                .catch(() => null);


        if (!botMember) {

            return interaction.reply({
                content:
                    "❌ Bot sunucu üyesi olarak bulunamadı.",
                flags: MessageFlags.Ephemeral
            });
        }


        // ----------------------------------------------------
        // BOT KANAL YETKİSİ
        // ----------------------------------------------------

        if (
            !botMember.permissions.has(
                PermissionFlagsBits.ManageChannels
            )
        ) {

            return interaction.reply({
                content:
                    "❌ Botta **Kanalları Yönet** yetkisi bulunmuyor.",
                flags: MessageFlags.Ephemeral
            });
        }


        // ----------------------------------------------------
        // PANEL KANALINI BUL
        // ----------------------------------------------------

        const panelChannel =
            await guild.channels
                .fetch(TICKET_PANEL_CHANNEL_ID)
                .catch(() => null);


        if (!panelChannel) {

            return interaction.reply({
                content:
                    `❌ Ticket panel kanalı bulunamadı.\n\n` +
                    `Kanal ID: \`${TICKET_PANEL_CHANNEL_ID}\``,
                flags: MessageFlags.Ephemeral
            });
        }


        // ----------------------------------------------------
        // KANAL TİPİ KONTROLÜ
        // ----------------------------------------------------

        if (
            panelChannel.type !== ChannelType.GuildText &&
            panelChannel.type !== ChannelType.GuildAnnouncement
        ) {

            return interaction.reply({
                content:
                    "❌ Belirtilen ticket paneli kanalı bir yazı kanalı değil.",
                flags: MessageFlags.Ephemeral
            });
        }


        // ----------------------------------------------------
        // BOTUN KANALA MESAJ GÖNDERME YETKİSİ
        // ----------------------------------------------------

        const panelPermissions =
            panelChannel.permissionsFor(botMember);


        if (
            !panelPermissions ||
            !panelPermissions.has(
                PermissionFlagsBits.ViewChannel
            ) ||
            !panelPermissions.has(
                PermissionFlagsBits.SendMessages
            ) ||
            !panelPermissions.has(
                PermissionFlagsBits.EmbedLinks
            )
        ) {

            return interaction.reply({
                content:
                    "❌ Botun ticket panel kanalında gerekli izinleri yok.\n\n" +
                    "Gerekli izinler:\n" +
                    "• Kanalı Gör\n" +
                    "• Mesaj Gönder\n" +
                    "• Bağlantıları Göm",
                flags: MessageFlags.Ephemeral
            });
        }


        // ----------------------------------------------------
        // CATEGORY
        // ----------------------------------------------------

        let category =
            interaction.options.getChannel("category");


        // ----------------------------------------------------
        // CATEGORY YOKSA OLUŞTUR
        // ----------------------------------------------------

        if (!category) {

            try {

                category =
                    await guild.channels.create({
                        name: "🎫・TICKETS",
                        type: ChannelType.GuildCategory
                    });

            } catch (error) {

                logger.error(
                    "Ticket kategorisi oluşturulamadı."
                );

                logger.error(error);

                return interaction.reply({
                    content:
                        "❌ Ticket kategorisi oluşturulamadı. Botun **Kanalları Yönet** yetkisini kontrol et.",
                    flags: MessageFlags.Ephemeral
                });
            }
        }


        // ----------------------------------------------------
        // CATEGORY TİP KONTROLÜ
        // ----------------------------------------------------

        if (
            category.type !== ChannelType.GuildCategory
        ) {

            return interaction.reply({
                content:
                    "❌ Seçilen kategori geçerli değil.",
                flags: MessageFlags.Ephemeral
            });
        }


        // ----------------------------------------------------
        // CONFIG KAYDET
        // ----------------------------------------------------

        saveConfig(guild.id, {

            supportRoleId: supportRole.id,

            categoryId: category.id,

            panelChannelId:
                TICKET_PANEL_CHANNEL_ID,

            setupBy:
                interaction.user.id,

            setupAt:
                new Date().toISOString()
        });


        // ----------------------------------------------------
        // PANEL EMBED
        // ----------------------------------------------------

        const embed =
            new EmbedBuilder()

                .setColor(0x5865F2)

                .setTitle(
                    "🛡️ Shizu Yetkili Başvuruları"
                )

                .setDescription(
                    "Shizu yetkili ekibine katılmak istiyorsan aşağıdaki **Başvuru Yap** butonuna bas.\n" +
                    "Açılan başvuru formunu eksiksiz doldur. Başvurun özel bir kanala iletilecek ve yetkili ekibi tarafından incelenecek.\n\n" +
                    "📌 **Başvuru Bilgisi**\n" +
                    "• Her kullanıcı aynı anda yalnızca bir açık başvuru oluşturabilir.\n" +
                    "• Verdiğin bilgileri doğru ve anlaşılır yaz.\n" +
                    "• Başvurun incelenene kadar beklemen gerekir."
                )

                .addFields(
                    {
                        name: "📝 Yetkili Başvurusu",
                        value:
                            "Formu açmak ve başvurunu göndermek için aşağıdaki butona bas.",
                        inline: false
                    },

                    {
                        name: "🛡️ Destek Ekibi",
                        value:
                            `<@&${supportRole.id}>`,
                        inline: true
                    },

                    {
                        name: "📂 Kategori",
                        value:
                            `${category}`,
                        inline: true
                    }
                )

                .setFooter({
                    text: "Shizu Staff Applications"
                })

                .setTimestamp();


        // ----------------------------------------------------
        // BUTTON
        // ----------------------------------------------------

        const row =
            new ActionRowBuilder()
                .addComponents(

                    new ButtonBuilder()

                        .setCustomId(
                            "ticket_create"
                        )

                        .setLabel(
                            "Başvuru Yap"
                        )

                        .setEmoji(
                            "🎫"
                        )

                        .setStyle(
                            ButtonStyle.Primary
                        )
                );


        // ----------------------------------------------------
        // PANELİ GÖNDER
        // ----------------------------------------------------

        try {

            await panelChannel.send({
                embeds: [embed],
                components: [row]
            });

        } catch (error) {

            logger.error(
                "Ticket paneli gönderilemedi."
            );

            logger.error(error);

            return interaction.reply({
                content:
                    "❌ Ticket paneli kanala gönderilemedi.",
                flags: MessageFlags.Ephemeral
            });
        }


        // ----------------------------------------------------
        // BAŞARILI
        // ----------------------------------------------------

        await interaction.reply({
            content:
                `✅ Ticket sistemi başarıyla kuruldu!\n\n` +
                `📌 Panel kanalı: <#${TICKET_PANEL_CHANNEL_ID}>\n` +
                `🛡️ Destek rolü: ${supportRole}\n` +
                `📂 Ticket kategorisi: ${category}`,
            flags: MessageFlags.Ephemeral
        });


        // ----------------------------------------------------
        // LOG
        // ----------------------------------------------------

        logger.info(
            `Ticket sistemi kuruldu | ` +
            `Sunucu: ${guild.name} (${guild.id}) | ` +
            `Panel: ${TICKET_PANEL_CHANNEL_ID} | ` +
            `Destek rolü: ${supportRole.name} (${supportRole.id}) | ` +
            `Kategori: ${category.name} (${category.id}) | ` +
            `Kurulum: ${interaction.user.tag}`
        );
    }
};