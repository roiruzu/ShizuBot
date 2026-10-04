const { MessageFlags } = require('discord.js');
const logger = require("./logger");

function getSafeWarningErrorMessage(error) {
    const message = String(error?.message || "").toLowerCase();

    // JSON bozukluÄŸu
    if (
        message.includes("bozuk json") ||
        message.includes("json") &&
        message.includes("parse")
    ) {
        return "âŒ UyarÄ± verilerinde bir veri bozulmasÄ± tespit edildi. YÃ¶netici konsolu kontrol etmelidir.";
    }

    // JSON dosyasÄ± okunamadÄ±
    if (message.includes("warnings.json okunamadÄ±")) {
        return "âŒ UyarÄ± verileri okunamadÄ±. LÃ¼tfen biraz sonra tekrar dene.";
    }

    // JSON yazma hatasÄ±
    if (message.includes("warnings.json yazÄ±lamadÄ±")) {
        return "âŒ UyarÄ± kaydedilemedi. LÃ¼tfen tekrar dene.";
    }

    // Kilit zaman aÅŸÄ±mÄ±
    if (message.includes("kilidi zaman aÅŸÄ±mÄ±na")) {
        return "â³ UyarÄ± sistemi ÅŸu anda baÅŸka bir iÅŸlem gerÃ§ekleÅŸtiriyor. BirkaÃ§ saniye sonra tekrar dene.";
    }

    // Genel uyarÄ± veritabanÄ± hatalarÄ±
    if (
        message.includes("uyarÄ± veritabanÄ±") ||
        message.includes("uyarÄ±lar okunamadÄ±") ||
        message.includes("uyarÄ± kaydedilemedi") ||
        message.includes("uyarÄ± silinemedi") ||
        message.includes("uyarÄ±lar silinemedi")
    ) {
        return "âŒ UyarÄ± sistemiyle ilgili geÃ§ici bir hata oluÅŸtu. LÃ¼tfen biraz sonra tekrar dene.";
    }

    return "âŒ UyarÄ± komutu Ã§alÄ±ÅŸtÄ±rÄ±lÄ±rken beklenmeyen bir hata oluÅŸtu. LÃ¼tfen biraz sonra tekrar dene.";
}

function logWarningError(error, interaction) {
    logger.error("â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”");
    logger.error("UYARI SÄ°STEMÄ° HATASI");
    logger.error("â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”");

    logger.error(
        "Komut:",
        interaction?.commandName || "Bilinmiyor"
    );

    logger.error(
        "KullanÄ±cÄ±:",
        interaction?.user?.tag || "Bilinmiyor"
    );

    logger.error(
        "User ID:",
        interaction?.user?.id || "Bilinmiyor"
    );

    logger.error(
        "Sunucu:",
        interaction?.guild?.name || "DM"
    );

    logger.error(
        "Guild ID:",
        interaction?.guild?.id || "Bilinmiyor"
    );

    logger.error(
        "Kanal:",
        interaction?.channel?.name || "Bilinmiyor"
    );

    logger.error(
        "Channel ID:",
        interaction?.channel?.id || "Bilinmiyor"
    );

    logger.error(
        "Hata tipi:",
        error?.name || "Bilinmiyor"
    );

    logger.error(
        "Hata kodu:",
        error?.code || "Yok"
    );

    logger.error(
        "Hata mesajÄ±:",
        error?.message || "Mesaj yok"
    );

    if (error?.stack) {
        logger.error("Stack trace:");
        logger.error(error.stack);
    }

    logger.error("â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”");
}

async function handleWarningError(error, interaction) {
    logWarningError(error, interaction);

    const safeMessage =
        getSafeWarningErrorMessage(error);

    try {
        if (
            interaction.replied ||
            interaction.deferred
        ) {
            await interaction.editReply({
                content: safeMessage,
                embeds: []
            });

            return;
        }

        await interaction.reply({
            content: safeMessage,
            flags: MessageFlags.Ephemeral
        });
    } catch (replyError) {
        logger.error(
            "UyarÄ± hata mesajÄ± kullanÄ±cÄ±ya gÃ¶nderilemedi."
        );

        logger.error(
            "Reply hatasÄ±:",
            replyError
        );
    }
}

module.exports = {
    getSafeWarningErrorMessage,
    logWarningError,
    handleWarningError
};
