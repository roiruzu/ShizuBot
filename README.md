# Discord Bot Starter

Discord.js v14 tabanlı profesyonel bot başlangıç projesi.

## Özellikler

- Slash command altyapısı
- `/ping`
- `/serverinfo`
- `/userinfo`
- `/clear`
- `/kick`
- `/ban`
- `/timeout`
- `/warn`
- `/warnings`
- `/setwelcome`
- `/setlog`
- Welcome mesajları
- Moderasyon logları
- JSON tabanlı basit veri saklama
- Permission kontrolleri
- Merkezi config sistemi

## Kurulum

1. Node.js 22+ kur.
2. Bu klasörde:
   ```bash
   npm install
   ```
3. `.env.example` dosyasını `.env` olarak kopyala.
4. Token, Client ID ve test sunucusu ID'sini `.env` içine yaz.
5. Botu Discord Developer Portal'dan sunucuna eklerken `bot` ve `applications.commands` scope'larını ver.
6. Gerekli bot intentlerini aç.
7. Slash komutlarını kaydet:
   ```bash
   node src/deploy-commands.js
   ```
8. Botu başlat:
   ```bash
   npm start
   ```

## Not

`.env` dosyanı paylaşma ve GitHub'a yükleme.
