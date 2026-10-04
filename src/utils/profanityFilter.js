const BAD_WORDS = [
    "amk",
    "aq",
    "a.q",
    "orospu",
    "orospuçocuğu",
    "orospu cocugu",
    "siktir",
    "sik",
    "sikerim",
    "sikeyim",
    "yarrak",
    "yarak",
    "piç",
    "pic",
    "pezevenk",
    "ibne",
    "göt",
    "got",
    "ananı sikeyim",
    "ananisikeyim",
    "amına koyayım",
    "amina koyayim",
    "amınakoyim",
    "aminakoyim"
];

function normalizeText(text) {
    return text
        .toLocaleLowerCase("tr-TR")
        .replace(/4/g, "a")
        .replace(/@/g, "a")
        .replace(/3/g, "e")
        .replace(/1/g, "i")
        .replace(/!/g, "i")
        .replace(/0/g, "o")
        .replace(/\$/g, "s")
        .replace(/[._\-*]+/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function containsProfanity(text) {
    if (!text) return false;

    const normalized = normalizeText(text);

    return BAD_WORDS.some(word => {
        const normalizedWord = normalizeText(word);

        const regex = new RegExp(
            `(^|\\s)${normalizedWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|\\s|[!?.,])`,
            "i"
        );

        return regex.test(normalized);
    });
}

module.exports = {
    containsProfanity
};