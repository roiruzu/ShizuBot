# SHIZU Discord Bot

Discord.js v14 tabanlı Shizu botu. Haftalık yazılı ve sesli aktivite sıralamaları ayrı tutulur.

## Haftalık aktivite komutları

- `/top` — haftalık yazılı ilk 10'u gösterir.
- `/top kategori:Yazılı Aktif` — haftalık yazılı ilk 10.
- `/top kategori:Sesli Aktif` — haftalık sesli ilk 10.
- `!leaderboard chat` / `!leaderboard voice` — aynı sıralamaların metin sürümü.
- `/rank` — mevcut XP rank kartı.
- `/rank kategori:Yazılı Aktif` / `/rank kategori:Sesli Aktif` — seçilen aktivite kategorisinde kullanıcının sırası ve birinciyle arasındaki fark.
- `!rank chat` / `!rank voice` — haftalık kişisel sıralama metni.
- `/testreward kategori:Yazılı Aktif` / `/testreward kategori:Sesli Aktif` — yalnızca Administrator yetkisiyle ilgili kategorinin mevcut birincisine rol vermeyi test eder; haftayı sıfırlamaz.

## Haftalık ödüller

Pazar günü 23:59'da `Europe/Istanbul` saat dilimine göre:
- Yazılı sıralamada ilk 3 üyeye `CHAT_ACTIVITY_ROLE_ID` rolü verilir.
- Sesli sıralamada ilk 3 üyeye `VOICE_ACTIVITY_ROLE_ID` rolü verilir.
- Her kategorideki ilgili rol, önceki kazanan olmayan üyelerden kaldırılır.
- Duyuru için `ANNOUNCEMENT_CHANNEL_ID` isteğe bağlıdır.

Varsayılan rol kimlikleri `.env.example` içinde bulunur:
- Yazılı: `1554922082146721812`
- Sesli: `1554922275172778065`

## Kurulum

1. Node.js 20 veya üstünü kullan.
2. `.env.example` dosyasını `.env` olarak kopyala.
3. `DISCORD_TOKEN` ve `GUILD_ID` değerlerini doldur.
4. `npm install` çalıştır.
5. Discord Developer Portal → Bot bölümünde **Message Content Intent** ve **Server Members Intent** izinlerini aç.
6. Botun sunucuda **Rolleri Yönet** izni olmalı ve botun en yüksek rolü iki aktivite rolünün üstünde bulunmalı.
7. `npm start` çalıştır.

`.env`, `node_modules`, Git geçmişi ve canlı aktivite/veritabanı dosyaları bu dağıtım arşivine dahil edilmez. Mevcut `.env` dosyanı ayrıca sakla; tokenı GitHub'a yükleme.
