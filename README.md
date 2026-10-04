# Shizu Anime RPG — Entegre Paket

Bu paket mevcut Shizu botuna RPG katmanını eklemek için hazırlanmıştır.

## Kopyalanacak dosyalar
- `src/index.js` → mevcut index.js ile değiştir
- `src/deploy-commands.js` → mevcut deploy dosyanla değiştir
- `src/rpg/` → klasörü komple kopyala
- `src/commands/rpg.js`
- `src/commands/rpgadmin.js`
- `data/rpg/` → kalıcı RPG verileri burada oluşur

## Kurulum
1. Bot klasöründe yedek al.
2. Bu paketteki dosyaları proje köküne kopyala ve üzerine yaz.
3. `.env` içinde `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID` kalsın.
4. Terminalde:
   `node src/deploy-commands.js`
5. Ardından:
   `node src/index.js`

## Kullanım
`/rpg panel`

Panel tamamen butonludur. Profil, envanter, tüccar, görevler, başarımlar, craft, gelişim, Espada ve bakiye tek panelden yönetilir.

Yönetici:
- `/rpgadmin merchant minutes:30`
- `/rpgadmin give user:@... item:hollow_mask amount:1`
- `/rpgadmin coin user:@... amount:1000`
