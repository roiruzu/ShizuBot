# SHIZU RPG — PNG UI FINAL

Bu paket mevcut Shizu RPG projesine drop-in olarak hazırlanmıştır.

## Dosyalar

- `src/rpg/rpgManager.js` — PNG UI bağlantılı yeni manager
- `src/rpg/ui/01_profile.png`
- `src/rpg/ui/02_inventory.png`
- `src/rpg/ui/03_achievements.png`
- `src/rpg/ui/04_merchant.png`
- `src/rpg/ui/05_craft.png`
- `src/rpg/ui/06_evolution.png`
- `src/rpg/ui/07_espada.png`

## Kurulum

1. Mevcut:
   `src/rpg/rpgManager.js`
   dosyasını bu paketteki ile değiştir.

2. `src/rpg/ui/` klasörünü oluştur ve 7 PNG'yi içine koy.

3. Botu restart et.

Slash command deploy gerekmez; command isimleri değiştirilmedi.

## Nasıl çalışıyor?

Manager `AttachmentBuilder` ile ilgili PNG'yi Discord mesajına ekler ve:
`attachment://01_profile.png`
gibi embed image olarak bağlar.

Sayfa değiştirildiğinde ilgili PNG yeniden attach edilir:
Profile -> profile PNG
Inventory -> inventory PNG
Achievements -> achievements PNG
Merchant -> merchant PNG
Craft -> craft PNG
Evolution -> evolution PNG
Espada -> espada PNG

Gerçek Discord butonları mesajın altında çalışmaya devam eder.
