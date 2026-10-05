# SHIZU Activity System

Discord.js v14 ile hazırlanmış haftalık **Yazılı Sohbet + Sesli Kanal** aktivite sistemi.

## Özellikler

- Chat aktivitesini haftalık olarak sayar.
- Voice aktivitesini saniye bazında haftalık olarak sayar.
- `/top` komutu.
- `!leaderboard` komutu.
- `/top chat`, `/top voice`, `/top all` filtreleri.
- Her Pazar 23:59'da haftayı kapatır.
- Chat ve voice kategorilerinde ilk 3 kişiye `ACTIVITY_ROLE_ID` rolünü verir.
- Önceki haftanın sonuçlarını SQLite'a kaydeder.
- Chat spamini azaltmak için kullanıcı başına cooldown uygular.
- Bot mesajlarını saymaz.
- Tek başına ses kanalında beklemeyi saymaz.
- AFK kanalını saymaz.
- Sağır/deaf kullanıcıların voice süresini saymaz.
- Bot yeniden başlatılsa bile veriler SQLite'da korunur.
- Sunucu timezone'u `.env` üzerinden ayarlanabilir.

## Kurulum

Node.js 20+ gerekir.

```bash
npm install
```

`.env.example` dosyasını `.env` olarak kopyala ve değerleri doldur:

```env
DISCORD_TOKEN=...
GUILD_ID=...
ACTIVITY_ROLE_ID=1556678194399289356
TIMEZONE=Europe/Istanbul
ANNOUNCEMENT_CHANNEL_ID=...
CHAT_COOLDOWN_SECONDS=10
VOICE_MIN_HUMANS=2
```

Sonra:

```bash
npm start
```

## Discord Developer Portal

Bot için en az şu intentleri aç:

- Guilds
- Guild Messages
- Message Content
- Guild Voice States
- Guild Members

Botu sunucuya davet ederken:
- View Channels
- Send Messages
- Embed Links
- Manage Roles
- Read Message History

izinlerini ver.

**Önemli:** `ACTIVITY_ROLE_ID` rolü botun en yüksek rolünün altında olmalıdır. Bot rolü, ödül rolünü yönetebilecek seviyede olmalı.

## Komutlar

- `/top`
- `/top chat`
- `/top voice`
- `/top all`
- `!leaderboard`
- `!leaderboard chat`
- `!leaderboard voice`
- `!leaderboard all`

## Sayım mantığı

### Chat
- Bot mesajları sayılmaz.
- Çok kısa/boş mesajlar sayılmaz.
- Aynı kullanıcıdan cooldown süresi içinde gelen mesajlar tekrar puanlanmaz.
- Varsayılan cooldown: 10 saniye.

### Voice
- AFK kanalı sayılmaz.
- Kanalda en az 2 insan yoksa süre sayılmaz.
- Kullanıcı server-deaf ise süre sayılmaz.
- Kullanıcı server-mute olsa bile kanalda gerçek bir aktiflik olduğu sürece süre sayılabilir.
- Süre her dakika SQLite'a işlenir.

## Haftalık sıfırlama

Sistem `TIMEZONE` değerine göre haftayı kapatır.

Varsayılan:
`Europe/Istanbul`

Pazar 23:59 sonrasında sistem:
1. Haftalık sonuçları arşivler.
2. İlk 3 chat kullanıcısını belirler.
3. İlk 3 voice kullanıcısını belirler.
4. Ödül rolünü ilk 3'lere verir.
5. Önceki haftanın rolünü, yeni haftanın ilk 3'ünde olmayanlardan kaldırır.
6. Yeni haftayı başlatır.
7. İsteğe bağlı duyuru kanalına sonuçları gönderir.

## Dosya yapısı

```text
shizu-activity-bot/
├── src/
│   ├── index.js
│   ├── config.js
│   ├── database.js
│   ├── commands/
│   │   └── top.js
│   ├── events/
│   │   ├── interactionCreate.js
│   │   ├── messageCreate.js
│   │   ├── ready.js
│   │   └── voiceStateUpdate.js
│   ├── services/
│   │   ├── activityService.js
│   │   ├── leaderboardService.js
│   │   └── weeklyResetService.js
│   └── utils/
│       ├── format.js
│       └── weekly.js
├── data/
│   └── .gitkeep
├── .env.example
├── .gitignore
├── package.json
└── README.md
```
