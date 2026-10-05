# SHIZU Discord Bot

## Kurulum
1. Node.js 20+ (önerilen 22) kullan.
2. `.env.example` dosyasını `.env` olarak kopyala.
3. `.env` içine gerçek `DISCORD_TOKEN`, `GUILD_ID` ve `ACTIVITY_ROLE_ID` yaz.
4. `npm install`
5. `npm start`

## Discord Developer Portal
**Bot > Privileged Gateway Intents** bölümünde şunları aç:
- Message Content Intent
- Server Members Intent

Botu sunucuya davet ederken gerekli slash command kapsamı (`applications.commands`) ve bot kapsamı açık olmalı.

## SHIZU komutları
- `/rank` — XP/rank kartı
- `/top` — haftalık aktivite sıralaması
- `/ping`
- `/serverinfo`
- `/userinfo`
- `/warn`, `/warnings`, `/clearwarning`, `/unwarn`
- `/ban`, `/kick`, `/timeout`, `/clear`
- `/setlevel`, `/setlog`, `/setwelcome`
- `/ticket`
- `/rpg`, `/rpgadmin`

## Aktivite sistemi
- Yazılı mesajlar haftalık aktiviteye kaydedilir.
- Ses aktivitesi, kanalda en az `VOICE_MIN_HUMANS` kişi varsa sayılır.
- `/top` verileri `data/activity.json` içinde tutulur.
- `/rank` verileri `data/levels.json` içinde tutulur.
- `better-sqlite3` kullanılmaz.

## Önemli
Bot rolünü ödül rolünün (`ACTIVITY_ROLE_ID`) üstüne taşı ve botun rol yönetme yetkisi olduğundan emin ol.
