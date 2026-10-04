const {
    PermissionFlagsBits
} = require("discord.js");

/**
 * Kullanıcının gerekli yetkiye sahip olup olmadığını kontrol eder.
 */
function hasUserPermission(member, permission) {
    return member.permissions.has(permission);
}

/**
 * Botun gerekli yetkiye sahip olup olmadığını kontrol eder.
 */
function hasBotPermission(guild, permission) {
    const me = guild.members.me;

    if (!me) {
        return false;
    }

    return me.permissions.has(permission);
}

/**
 * Kullanıcı ile hedef arasındaki rol hiyerarşisini kontrol eder.
 *
 * Botun hedef kullanıcıdan daha yüksek rolde olması gerekir.
 */
function canModerateTarget(executor, target, botMember) {
    // Sunucu sahibi üzerinde hiyerarşi kontrolü uygulanmaz.
    // Ancak Discord yine de gerekli izinleri kontrol eder.
    if (target.id === target.guild.ownerId) {
        return {
            allowed: false,
            reason: "Sunucu sahibini bu komutla işlemden geçiremezsin."
        };
    }

    // Kullanıcının kendi üzerinde işlem yapmasını engelle.
    if (target.id === executor.id) {
        return {
            allowed: false,
            reason: "Kendin üzerinde bu işlemi kullanamazsın."
        };
    }

    // Botun hedeften yüksek rolde olması gerekir.
    if (
        target.roles.highest.position >=
        botMember.roles.highest.position
    ) {
        return {
            allowed: false,
            reason: "Bu kullanıcı botun rolüyle aynı veya daha yüksek bir role sahip."
        };
    }

    // Komutu kullanan kişi de hedefin üstünde olmalı.
    if (
        target.roles.highest.position >=
        executor.roles.highest.position
    ) {
        return {
            allowed: false,
            reason: "Bu kullanıcı senden aynı veya daha yüksek bir role sahip."
        };
    }

    return {
        allowed: true,
        reason: null
    };
}

/**
 * Genel moderasyon güvenlik kontrolü.
 */
function checkModeration({
    interaction,
    userPermission,
    botPermission,
    target
}) {
    const guild = interaction.guild;
    const executor = interaction.member;
    const botMember = guild.members.me;

    // Sunucu kontrolü
    if (!guild) {
        return {
            allowed: false,
            message: "❌ Bu komut sadece sunucularda kullanılabilir."
        };
    }

    // Bot üyesi bulunamadı
    if (!botMember) {
        return {
            allowed: false,
            message: "❌ Botun sunucu bilgileri alınamadı."
        };
    }

    // Kullanıcı yetkisi
    if (!hasUserPermission(executor, userPermission)) {
        return {
            allowed: false,
            message: "❌ Bu komutu kullanmak için gerekli yetkiye sahip değilsin."
        };
    }

    // Bot yetkisi
    if (!hasBotPermission(guild, botPermission)) {
        return {
            allowed: false,
            message: "❌ Botun bu işlemi gerçekleştirmek için gerekli yetkisi yok."
        };
    }

    // Hedef kontrolü
    if (target) {
        const result = canModerateTarget(
            executor,
            target,
            botMember
        );

        if (!result.allowed) {
            return {
                allowed: false,
                message: `❌ ${result.reason}`
            };
        }
    }

    return {
        allowed: true,
        message: null
    };
}

module.exports = {
    checkModeration,
    hasUserPermission,
    hasBotPermission,
    canModerateTarget
};