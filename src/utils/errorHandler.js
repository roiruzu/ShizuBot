const {
    DiscordAPIError
, MessageFlags} = require("discord.js");

const logger = require("./logger");

function getDiscordErrorMessage(error) {
    if (!(error instanceof DiscordAPIError)) {
        return null;
    }

    switch (error.code) {
        case 50013:
            return {
                message:
                    "âŒ Botun bu iÅŸlemi gerÃ§ekleÅŸtirmek iÃ§in gerekli Discord yetkileri yok.",
                flags: MessageFlags.Ephemeral
            };

        case 50001:
            return {
                message:
                    "âŒ Botun bu kanala veya kaynaÄŸa eriÅŸim izni yok.",
                flags: MessageFlags.Ephemeral
            };

        case 10013:
            return {
                message:
                    "âŒ Belirtilen kullanÄ±cÄ± bulunamadÄ±.",
                flags: MessageFlags.Ephemeral
            };

        case 10007:
            return {
                message:
                    "âŒ Bu kullanÄ±cÄ± sunucuda bulunamadÄ±.",
                flags: MessageFlags.Ephemeral
            };

        case 10008:
            return {
                message:
                    "âŒ Belirtilen mesaj bulunamadÄ± veya daha Ã¶nce silinmiÅŸ.",
                flags: MessageFlags.Ephemeral
            };

        case 10003:
            return {
                message:
                    "âŒ Belirtilen kanal bulunamadÄ±.",
                flags: MessageFlags.Ephemeral
            };

        case 10004:
            return {
                message:
                    "âŒ Sunucu bulunamadÄ±.",
                flags: MessageFlags.Ephemeral
            };

        case 10011:
            return {
                message:
                    "âŒ Belirtilen rol bulunamadÄ±.",
                flags: MessageFlags.Ephemeral
            };

        case 10062:
            return {
                message:
                    "âŒ Bu komutun sÃ¼resi doldu. LÃ¼tfen komutu tekrar kullan.",
                flags: MessageFlags.Ephemeral
            };

        case 40060:
            return {
                message:
                    "âŒ Bu komut iÃ§in zaten bir yanÄ±t gÃ¶nderildi.",
                flags: MessageFlags.Ephemeral
            };

        case 50035:
            return {
                message:
                    "âŒ GÃ¶nderilen bilgiler Discord tarafÄ±ndan kabul edilmedi. Komut seÃ§eneklerini kontrol edip tekrar dene.",
                flags: MessageFlags.Ephemeral
            };

        case 20016:
        case 20028:
            return {
                message:
                    "â³ Ã‡ok fazla iÅŸlem yapÄ±ldÄ±. LÃ¼tfen birkaÃ§ saniye bekleyip tekrar dene.",
                flags: MessageFlags.Ephemeral
            };

        default:
            return {
                message:
                    "âŒ Discord ile iletiÅŸim sÄ±rasÄ±nda beklenmeyen bir hata oluÅŸtu.",
                flags: MessageFlags.Ephemeral
            };
    }
}

function getErrorResponse(error) {
    const discordError =
        getDiscordErrorMessage(error);

    if (discordError) {
        return discordError;
    }

    if (
        error?.code === "ECONNRESET" ||
        error?.code === "ECONNREFUSED" ||
        error?.code === "ETIMEDOUT"
    ) {
        return {
            message:
                "ğŸŒ Discord sunucularÄ±na baÄŸlanÄ±rken geÃ§ici bir baÄŸlantÄ± sorunu oluÅŸtu. LÃ¼tfen biraz sonra tekrar dene.",
            flags: MessageFlags.Ephemeral
        };
    }

    if (error?.name === "AbortError") {
        return {
            message:
                "â±ï¸ Ä°ÅŸlem zaman aÅŸÄ±mÄ±na uÄŸradÄ±. LÃ¼tfen tekrar dene.",
            flags: MessageFlags.Ephemeral
        };
    }

    return {
        message:
            "âŒ Komut Ã§alÄ±ÅŸtÄ±rÄ±lÄ±rken beklenmeyen bir hata oluÅŸtu. LÃ¼tfen biraz sonra tekrar dene.",
        flags: MessageFlags.Ephemeral
    };
}

function logError(
    error,
    interaction = null
) {
    logger.error(
        "â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”"
    );

    logger.error(
        "KOMUT HATASI"
    );

    logger.error(
        "â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”"
    );

    if (interaction) {
        logger.error(
            "Komut:",
            interaction.commandName ||
                "Bilinmiyor"
        );

        logger.error(
            "KullanÄ±cÄ±:",
            interaction.user?.tag ||
                "Bilinmiyor"
        );

        logger.error(
            "User ID:",
            interaction.user?.id ||
                "Bilinmiyor"
        );

        logger.error(
            "Sunucu:",
            interaction.guild?.name ||
                "DM"
        );

        logger.error(
            "Guild ID:",
            interaction.guild?.id ||
                "Bilinmiyor"
        );

        logger.error(
            "Kanal:",
            interaction.channel?.name ||
                "Bilinmiyor"
        );

        logger.error(
            "Channel ID:",
            interaction.channel?.id ||
                "Bilinmiyor"
        );
    }

    logger.error(
        "Hata tipi:",
        error?.name ||
            "Bilinmiyor"
    );

    logger.error(
        "Hata kodu:",
        error?.code ||
            "Yok"
    );

    logger.error(
        "Mesaj:",
        error?.message ||
            error
    );

    if (error?.stack) {
        logger.error(
            "Stack:"
        );

        logger.error(
            error.stack
        );
    }

    logger.error(
        "â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”"
    );
}

async function handleCommandError(
    error,
    interaction
) {
    logError(
        error,
        interaction
    );

    const response =
        getErrorResponse(error);

    try {
        if (
            interaction.replied ||
            interaction.deferred
        ) {
            await interaction.editReply({
                content:
                    response.message
            });

            return;
        }

        await interaction.reply({
            content:
                response.message,
            ephemeral:
                response.ephemeral
        });
    } catch (replyError) {
        logger.error(
            "Hata mesajÄ± kullanÄ±cÄ±ya gÃ¶nderilemedi."
        );

        logger.error(
            replyError
        );
    }
}

module.exports = {
    getDiscordErrorMessage,
    getErrorResponse,
    logError,
    handleCommandError
};
