// ============================================================
// SHIZU KÜFÜR FİLTRESİ
// ============================================================

const BAD_WORDS = [

    // ========================================================
    // AMK / AMINA KOYAYIM VARYASYONLARI
    // ========================================================

    "amk",
    "amık",
    "amq",
    "aq",
    "a.q",
    "a q",
    "amına koyayım",
    "amina koyayim",
    "amına koyim",
    "amina koyim",
    "amına koyayım",
    "amina koyayim",
    "amınakoyayım",
    "aminakoyayim",
    "amınakoyim",
    "aminakoyim",
    "amınagoyim",
    "aminagoyim",
    "amınakoy",
    "aminakoy",

    // ========================================================
    // AM / AMINA / AMINI VARYASYONLARI
    // ========================================================

    "am",
    "amına",
    "amina",
    "amını",
    "amini",
    "amını sikeyim",
    "amini sikeyim",
    "amına sıçayım",
    "amina sicayim",

    // ========================================================
    // SİK / SİKTİR VARYASYONLARI
    // ========================================================

    "sik",
    "siki",
    "sikin",
    "sikim",
    "sikimi",
    "sikmek",
    "sikti",
    "siktim",
    "siktin",
    "siktiğim",
    "siktigim",
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

    // ========================================================
    // YARRAK / YARAK
    // ========================================================

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

    // ========================================================
    // GÖT VARYASYONLARI
    // ========================================================

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

    // ========================================================
    // OROSPU
    // ========================================================

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

    // ========================================================
    // PİÇ
    // ========================================================

    "piç",
    "pic",
    "piçlik",
    "piclik",
    "piç kurusu",
    "pic kurusu",
    "piç kurusu",
    "piçsin",

    // ========================================================
    // PEZEVENK
    // ========================================================

    "pezevenk",
    "pezevenklik",
    "pezevenkli",

    // ========================================================
    // İBNE
    // ========================================================

    "ibne",
    "ibnelik",
    "ibnesin",
    "ibne herif",

    // ========================================================
    // ŞEREFSİZ
    // ========================================================

    "şerefsiz",
    "serefsiz",
    "şerefsizlik",
    "serefsizlik",
    "şerefsiz herif",

    // ========================================================
    // GERİZEKALI / SALAK / APTAL
    // ========================================================

    "gerizekalı",
    "gerizekali",
    "geri zekalı",
    "geri zekali",
    "gerizekalı",
    "aptal",
    "salak",
    "ahmak",
    "beyinsiz",
    "mal",
    "malsın",
    "malsin",
    "mal herif",

    // ========================================================
    // HAYVAN / AŞAĞILAMA
    // ========================================================

    "hayvan herif",
    "öküz herif",
    "okuz herif",
    "eşek herif",
    "esek herif",

    // ========================================================
    // ANANA / ANNENE YÖNELİK
    // ========================================================

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

    // ========================================================
    // BACI / KARDEŞ / AİLEYE YÖNELİK
    // ========================================================

    "bacını sikeyim",
    "bacini sikeyim",
    "bacını sikerim",
    "bacini sikerim",

    // ========================================================
    // KÜFÜR CÜMLELERİ
    // ========================================================

    "siktir git",
    "siktir lan",
    "siktir olun",
    "siktirin gidin",
    "defol",
    "defol git",
    "cehenneme git",

    // ========================================================
    // İNGİLİZCE YAYGIN KÜFÜRLER
    // ========================================================

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

    // ========================================================
    // YAYGIN CHAT KISALTMALARI
    // ========================================================

    "wtf",
    "stfu",
    "fk",
    "fck",
    "fuk",
    "mf"
];


// ============================================================
// YAZI NORMALİZASYONU
// ============================================================

function normalizeText(text) {

    return text
        .toLocaleLowerCase("tr-TR")

        // Türkçe karakterleri sadeleştir
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")

        // Leetspeak
        .replace(/4/g, "a")
        .replace(/@/g, "a")
        .replace(/3/g, "e")
        .replace(/1/g, "i")
        .replace(/!/g, "i")
        .replace(/0/g, "o")
        .replace(/5/g, "s")
        .replace(/\$/g, "s")

        // Sık kullanılan ayırıcıları kaldır
        .replace(/[._\-*~`]+/g, "")

        // Fazla boşlukları düzelt
        .replace(/\s+/g, " ")

        .trim();
}


// ============================================================
// TEKRAR EDEN HARFLERİ AZALT
// Örnek:
// siiiikkk → sikk
// ooorospu → orospu
// ============================================================

function removeRepeatedCharacters(text) {

    return text.replace(
        /(.)\1{2,}/g,
        "$1$1"
    );
}


// ============================================================
// KÜFÜR KONTROLÜ
// ============================================================

function containsProfanity(text) {

    if (
        !text ||
        typeof text !== "string"
    ) {
        return false;
    }


    let normalized =
        normalizeText(text);


    normalized =
        removeRepeatedCharacters(normalized);


    // ========================================================
    // 1. Normal kelime kontrolü
    // ========================================================

    for (const word of BAD_WORDS) {

        const normalizedWord =
            removeRepeatedCharacters(
                normalizeText(word)
            );


        if (!normalizedWord) {
            continue;
        }


        // Uzun kelimeler için doğrudan içerik kontrolü
        if (
            normalizedWord.length >= 5 &&
            normalized.includes(normalizedWord)
        ) {
            return true;
        }


        // Kısa kelimelerde yanlış pozitifleri azalt
        const escaped =
            normalizedWord.replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
            );


        const regex =
            new RegExp(
                `(^|\\s)${escaped}($|\\s|[!?.,:;])`,
                "i"
            );


        if (regex.test(normalized)) {
            return true;
        }
    }


    // ========================================================
    // 2. Boşluksuz kaçırma denemeleri
    //
    // Örnek:
    // a m k
    // a.m.k
    // a-m-k
    // s i k
    // ========================================================

    const compact =
        normalized.replace(/\s+/g, "");


    const compactBadWords = [
        "amk",
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
        "asshole"
    ];


    for (const word of compactBadWords) {

        const normalizedWord =
            normalizeText(word)
                .replace(/\s+/g, "");


        if (
            normalizedWord &&
            compact.includes(normalizedWord)
        ) {
            return true;
        }
    }


    return false;
}


// ============================================================
// EXPORT
// ============================================================

module.exports = {
    containsProfanity,
    normalizeText
};