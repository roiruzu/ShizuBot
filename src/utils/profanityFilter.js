// ============================================================
// SHIZU KÜFÜR FİLTRESİ
// ============================================================

const {
    MessageFlags
} = require("discord.js");

const logger = require("./logger");

// ============================================================
// KÜFÜR LİSTESİ
// ============================================================

const BAD_WORDS = [
    // AMK
    "amk",
    "amık",
    "amq",
    "aq",
    "a.q",
    "a q",
    "amina koyayim",
    "amına koyayım",
    "amina koyim",
    "amına koyim",
    "aminakoyayim",
    "amınakoyayım",
    "aminakoyim",
    "amınakoyim",
    "aminagoyim",
    "amınagoyim",
    "aminakoy",
    "amınakoy",

    // AM
    "am",
    "amina",
    "amına",
    "amini",
    "amını",
    "amını sikeyim",
    "amini sikeyim",
    "amına sıçayım",
    "amina sicayim",

    // SİK
    "sik",
    "siki",
    "sikin",
    "sikim",
    "sikimi",
    "sikmek",
    "sikti",
    "siktim",
    "siktin",
    "siktigim",
    "siktiğim",
    "siktir",
    "siktirgit",
    "siktir git",
    "siktir lan",
    "siktir olun",
    "siktirin",
    "sikeyim",
    "sikerim",
    "siker",
    "sikicem",
    "sikecem",
    "sikeceğim",
    "sikecegim",
    "sikeyim seni",
    "seni sikerim",

    // YARRAK
    "yarrak",
    "yarak",
    "yarrağ",
    "yarrag",
    "yarrağı",
    "yarragi",
    "yarağını",
    "yaragini",
    "yarram",
    "yarramı",
    "yarrami",

    // GÖT
    "göt",
    "got",
    "götünü",
    "gotunu",
    "götüne",
    "gotune",
    "götveren",
    "gotveren",
    "götlek",
    "gotlek",

    // OROSPU
    "orospu",
    "orospuluk",
    "orospuçocuğu",
    "orospu cocugu",
    "orospuçocu",
    "orospu cocu",
    "orospu çocuğu",
    "orospu çocu",
    "orospu evladı",
    "orospu evladi",
    "orospu çocuğusun",
    "orospu cocugusun",

    // PİÇ
    "piç",
    "pic",
    "piçlik",
    "piclik",
    "piç kurusu",
    "pic kurusu",
    "piçsin",

    // PEZEVENK
    "pezevenk",
    "pezevenklik",
    "pezevenkli",

    // İBNE
    "ibne",
    "ibnelik",
    "ibnesin",
    "ibne herif",

    // ŞEREFSİZ
    "şerefsiz",
    "serefsiz",
    "şerefsizlik",
    "serefsizlik",
    "şerefsiz herif",

    // HAKARET
    "gerizekalı",
    "gerizekali",
    "geri zekalı",
    "geri zekali",
    "aptal",
    "salak",
    "ahmak",
    "beyinsiz",
    "mal",
    "malsın",
    "malsin",
    "mal herif",

    // HAYVAN
    "hayvan herif",
    "öküz herif",
    "okuz herif",
    "eşek herif",
    "esek herif",

    // ANNE
    "ananı",
    "anani",
    "ananı sikeyim",
    "anani sikeyim",
    "ananı sikerim",
    "anani sikerim",
    "ananı sik",
    "anani sik",
    "anneni sikeyim",
    "anneni sikerim",

    // BACI
    "bacını sikeyim",
    "bacini sikeyim",
    "bacını sikerim",
    "bacini sikerim",

    // DİĞER
    "defol",
    "defol git",
    "cehenneme git",

    // İNGİLİZCE
    "fuck",
    "fucking",
    "fucker",
    "motherfucker",
    "shit",
    "bullshit",
    "bitch",
    "asshole",
    "dick",
    "dickhead",
    "cocksucker",
    "bastard",

    // CHAT KISALTMALARI
    "wtf",
    "stfu",
    "fck",
    "fuk",
    "mf"
];

// ============================================================
// NORMALİZASYON
// ============================================================

function normalizeText(text) {
    if (
        typeof text !== "string"
    ) {
        return "";
    }

    return text
        .toLocaleLowerCase("tr-TR")

        // Unicode normalize
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )

        // Türkçe özel karakterleri garanti et
        .replace(/ı/g, "i")
        .replace(/İ/g, "i")
        .replace(/ğ/g, "g")
        .replace(/Ğ/g, "g")
        .replace(/ü/g, "u")
        .replace(/Ü/g, "u")
        .replace(/ş/g, "s")
        .replace(/Ş/g, "s")
        .replace(/ö/g, "o")
        .replace(/Ö/g, "o")
        .replace(/ç/g, "c")
        .replace(/Ç/g, "c")

        // Leetspeak
        .replace(/4/g, "a")
        .replace(/@/g, "a")
        .replace(/3/g, "e")
        .replace(/1/g, "i")
        .replace(/!/g, "i")
        .replace(/0/g, "o")
        .replace(/5/g, "s")
        .replace(/\$/g, "s")

        // Ayırıcıları boşluğa çevir
        .replace(
            /[._\-*~`|/\\]+/g,
            " "
        )

        // Fazla boşluk
        .replace(
            /\s+/g,
            " "
        )

        .trim();
}

// ============================================================
// TEKRAR EDEN HARFLER
// ============================================================

function removeRepeatedCharacters(
    text
) {
    return text.replace(
        /(.)\1{2,}/g,
        "$1$1"
    );
}

// ============================================================
// REGEX ESCAPE
// ============================================================

function escapeRegex(text) {
    return text.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );
}

// ============================================================
// KISA KELİMELER
// ============================================================

const SHORT_WORDS = new Set([
    "am",
    "amk",
    "aq",
    "amq",
    "sik",
    "got",
    "mal",
    "pic",
    "ibne",
    "fuck",
    "shit",
    "bitch",
    "dick",
    "wtf",
    "stfu",
    "fck",
    "fuk",
    "mf"
]);

// ============================================================
// COMPACT KELİMELER
// ============================================================

const COMPACT_WORDS = [
    "amk",
    "amq",
    "aq",
    "sik",
    "siktir",
    "orospu",
    "yarrak",
    "yarak",
    "piç",
    "pic",
    "ibne",
    "pezevenk",
    "fuck",
    "shit",
    "bitch",
    "asshole",
    "dick"
];

// ============================================================
// KÜFÜR KONTROLÜ
// ============================================================

function containsProfanity(
    text
) {
    if (
        !text ||
        typeof text !== "string"
    ) {
        return false;
    }

    let normalized =
        normalizeText(text);

    normalized =
        removeRepeatedCharacters(
            normalized
        );

    // ========================================================
    // 1. NORMAL KELİME KONTROLÜ
    // ========================================================

    const words =
        normalized.split(/\s+/);

    for (
        const badWord
        of BAD_WORDS
    ) {
        let normalizedBadWord =
            normalizeText(
                badWord
            );

        normalizedBadWord =
            removeRepeatedCharacters(
                normalizedBadWord
            );

        if (
            !normalizedBadWord
        ) {
            continue;
        }

        // Uzun kelimeler
        if (
            normalizedBadWord.length >= 5
        ) {
            if (
                normalized.includes(
                    normalizedBadWord
                )
            ) {
                return true;
            }

            continue;
        }

        // Kısa kelimelerde sadece
        // ayrı kelime olarak kontrol
        if (
            SHORT_WORDS.has(
                normalizedBadWord
            )
        ) {
            const regex =
                new RegExp(
                    `(^|\\s)${escapeRegex(
                        normalizedBadWord
                    )}($|\\s|[!?.,:;'"()\\[\\]{}])`,
                    "i"
                );

            if (
                regex.test(
                    normalized
                )
            ) {
                return true;
            }
        }

        // Diğer kısa kelimeler
        if (
            words.includes(
                normalizedBadWord
            )
        ) {
            return true;
        }
    }

    // ========================================================
    // 2. AYIRICILARI KALDIRARAK KONTROL
    // ========================================================

    const compact =
        normalized.replace(
            /\s+/g,
            ""
        );

    for (
        const badWord
        of COMPACT_WORDS
    ) {
        const normalizedBadWord =
            normalizeText(
                badWord
            ).replace(
                /\s+/g,
                ""
            );

        if (
            normalizedBadWord &&
            compact.includes(
                normalizedBadWord
            )
        ) {
            return true;
        }
    }

    // ========================================================
    // 3. HARFLERİN ARASINA BOŞLUK / NOKTA
    // ========================================================
    //
    // a m k
    // a.m.k
    // a-m-k
    // s i k
    //
    // ========================================================

    const joined =
        text
            .toLocaleLowerCase(
                "tr-TR"
            )
            .replace(
                /[^a-zA-ZçğıöşüÇĞİÖŞÜ0-9@!$]/g,
                ""
            );

    const joinedNormalized =
        normalizeText(
            joined
        );

    for (
        const badWord
        of COMPACT_WORDS
    ) {
        const normalizedBadWord =
            normalizeText(
                badWord
            ).replace(
                /\s+/g,
                ""
            );

        if (
            normalizedBadWord &&
            joinedNormalized.includes(
                normalizedBadWord
            )
        ) {
            return true;
        }
    }

    return false;
}

// ============================================================
// MESAJI SİL
// ============================================================

async function deleteMessage(
    message
) {
    try {
        if (
            !message ||
            !message.deletable
        ) {
            return false;
        }

        await message.delete();

        return true;

    } catch (error) {
        logger.warn(
            `Küfür mesajı silinemedi: ${error.message}`
        );

        return false;
    }
}

// ============================================================
// UYARI MESAJI
// ============================================================

async function sendWarning(
    message
) {
    try {
        const warning =
            await message.channel.send({
                content:
                    `⚠️ ${message.author}, küfür kullanmak yasaktır!`
            });

        // 5 saniye sonra sil
        setTimeout(
            () => {
                warning
                    .delete()
                    .catch(
                        () => {}
                    );
            },
            5000
        );

    } catch (error) {
        logger.warn(
            `Küfür uyarısı gönderilemedi: ${error.message}`
        );
    }
}

// ============================================================
// LOG
// ============================================================

async function logProfanity(
    message
) {
    try {
        logger.warn(
            `KÜFÜR ENGELLENDİ | ${message.author.tag} | ${message.guild?.name || "Bilinmiyor"} | ${message.channel?.name || "Bilinmiyor"} | ${message.content}`
        );
    } catch {}
}

// ============================================================
// ANA MESAJ KONTROLÜ
// ============================================================
//
// index.js bunu çağırıyor:
//
// profanityFilter.checkMessage(message)
//
// true  = mesaj engellendi
// false = normal mesaj
//
// ============================================================

async function checkMessage(
    message
) {
    try {
        if (
            !message ||
            !message.guild
        ) {
            return false;
        }

        if (
            !message.author ||
            message.author.bot
        ) {
            return false;
        }

        const content =
            String(
                message.content || ""
            );

        if (
            !content.trim()
        ) {
            return false;
        }

        // ====================================================
        // KÜFÜR VAR MI?
        // ====================================================

        const blocked =
            containsProfanity(
                content
            );

        if (!blocked) {
            return false;
        }

        // ====================================================
        // LOG
        // ====================================================

        await logProfanity(
            message
        );

        // ====================================================
        // MESAJI SİL
        // ====================================================

        await deleteMessage(
            message
        );

        // ====================================================
        // UYARI
        // ====================================================

        await sendWarning(
            message
        );

        // ====================================================
        // XP VERİLMEMESİ İÇİN TRUE
        // ====================================================

        return true;

    } catch (error) {
        logger.error(
            `Küfür filtresi hatası: ${error.message}`
        );

        logger.error(
            error
        );

        // Hata olursa normal mesajı
        // engelleme.
        return false;
    }
}

// ============================================================
// EXPORT
// ============================================================

module.exports = {
    BAD_WORDS,
    normalizeText,
    removeRepeatedCharacters,
    containsProfanity,
    checkMessage
};