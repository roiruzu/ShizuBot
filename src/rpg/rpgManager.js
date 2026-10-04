const {
  EmbedBuilder,
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  MessageFlags,
  PermissionsBitField
} = require('discord.js');

const path = require('path');
const fs = require('fs');

const store = require('./rpgStore');
const { ITEMS, RECIPES, ACHIEVEMENTS, EVOLUTIONS } = require('./rpgData');

// ============================================================
// SHIZU RPG — MODERN UI
// Rank sistemindeki koyu + mor atmosferi Discord Embed sistemine
// uyarlayan ortak UI katmanı.
// ============================================================


// ============================================================
// SHIZU RPG — SHIZU UI SYSTEM v3
// Mor / neon / premium dashboard dili.
// Discord Embed sınırları içinde kart, istatistik, progress,
// section ve navigation sistemini ortaklaştırır.
// ============================================================

const COLORS = {
  shizu: 0x8B5CF6,
  shizuDeep: 0x5B21B6,
  violet: 0xA78BFA,
  neon: 0xC084FC,
  blue: 0x6366F1,
  cyan: 0x22D3EE,
  pink: 0xF472B6,
  gold: 0xFBBF24,
  green: 0x34D399,
  red: 0xFB7185,
  dark: 0x171225,
  dark2: 0x211A35,
  muted: 0x6B6280
};

const UI = {
  line: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  divider: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  thin: '────────────────────────────────',
  block: '▰',
  empty: '▱',
  footer: 'SHIZU • ANIME RPG  //  POWERED BY SHIZU',
  icon: '✦'
};

function fmt(value) {
  return Number(value || 0).toLocaleString('tr-TR');
}

function safeName(value) {
  return String(value || 'Bilinmiyor').slice(0, 80);
}

function titleCase(value) {
  return String(value || 'human')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function rarity(value) {
  return ({
    common: 'COMMON',
    uncommon: 'UNCOMMON',
    rare: 'RARE',
    epic: 'EPIC',
    legendary: 'LEGENDARY',
    mythic: 'MYTHIC'
  }[value] || String(value || 'NORMAL').toUpperCase());
}

function rarityIcon(value) {
  return ({
    common: '◆',
    uncommon: '◇',
    rare: '✦',
    epic: '✧',
    legendary: '★',
    mythic: '✹'
  }[value] || '•');
}

function coins(p) {
  return [
    `🪙 **${fmt(p.coins?.animeCoin)}**`,
    `💎 **${fmt(p.coins?.rareCurrency)}**`,
    `🌑 **${fmt(p.coins?.eventCurrency)}**`
  ].join('   ');
}

function progressBar(current, max, size = 12) {
  const value = Math.max(0, Number(current || 0));
  const total = Math.max(1, Number(max || 1));
  const filled = Math.min(size, Math.round((value / total) * size));
  return `${UI.block.repeat(filled)}${UI.empty.repeat(size - filled)}`;
}

function topHeader(member, page, subtitle) {
  const name = member ? safeName(member.displayName) : 'Shizu World';
  return [
    `**SHIZU  /  ANIME RPG**`,
    `\`${page.toUpperCase()}\`  •  ${name}`,
    subtitle || 'Anime evrenindeki yolculuğuna devam et.'
  ].join('\n');
}


const UI_ASSETS = {
  panel: '01_profile.png',
  profile: '01_profile.png',
  inventory: '02_inventory.png',
  achievements: '03_achievements.png',
  merchant: '04_merchant.png',
  craft: '05_craft.png',
  evolution: '06_evolution.png',
  espada: '07_espada.png',
  balance: '01_profile.png'
};

function getUIAsset(page) {
  const filename = UI_ASSETS[page] || UI_ASSETS.panel;
  const filePath = path.join(__dirname, 'ui', filename);
  if (!fs.existsSync(filePath)) return null;
  return { filePath, filename };
}

function imageEmbed(embed, page) {
  const asset = getUIAsset(page);
  if (!asset) return embed;
  embed.setImage(`attachment://${asset.filename}`);
  return embed;
}

function filesForPage(page) {
  const asset = getUIAsset(page);
  if (!asset) return [];
  return [new AttachmentBuilder(asset.filePath, { name: asset.filename })];
}

function baseEmbed({
  color = COLORS.shizu,
  page = 'RPG',
  title,
  subtitle,
  member,
  description,
  footer = UI.footer
}) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${UI.icon}  ${title}`)
    .setDescription(
      `${description || topHeader(member, page, subtitle)}\n\n${UI.line}`
    )
    .setFooter({ text: footer })
    .setTimestamp();

  if (member) {
    embed.setThumbnail(member.displayAvatarURL({ size: 256, extension: 'png' }));
    embed.setAuthor({
      name: `${safeName(member.displayName)} • Shizu RPG`,
      iconURL: member.displayAvatarURL({ size: 64, extension: 'png' })
    });
  }

  imageEmbed(embed, page);
  return embed;
}

function statField(name, value, inline = true) {
  return {
    name,
    value: String(value || '—').slice(0, 1024),
    inline
  };
}

function navRows(active = 'profile') {
  // Özel emoji yok. Unicode emojiler label içinde kullanılıyor.
  const make = (id, label, style = ButtonStyle.Secondary) =>
    new ButtonBuilder()
      .setCustomId(`rpg:${id}`)
      .setLabel(label)
      .setStyle(id === active ? ButtonStyle.Primary : style);

  return [
    new ActionRowBuilder().addComponents(
      make('profile', '👤  Profil'),
      make('inventory', '🎒  Envanter'),
      make('achievements', '🏆  Başarımlar'),
      make('merchant', '🏪  Tüccar'),
      make('craft', '⚒️  Craft')
    ),
    new ActionRowBuilder().addComponents(
      make('evolution', '🧬  Gelişim'),
      make('espada', '⚔️  Espada', ButtonStyle.Danger),
      make('balance', '💰  Bakiye'),
      make('refresh', '↻  Yenile'),
      make('panel', '⌂  Ana Panel')
    )
  ];
}

function panelEmbed(member) {
  const p = store.getPlayer(member.guild.id, member.id);

  const embed = baseEmbed({
    color: COLORS.shizu,
    page: 'Dashboard',
    title: 'SHIZU  •  RPG DASHBOARD',
    member,
    subtitle: 'Karanlık anime evrenine hoş geldin.'
  });

  embed.addFields(
    statField('🧬  KÖKEN', `**${titleCase(p.race)}**`),
    statField('⚔️  GELİŞİM', `**${titleCase(p.evolution)}**`),
    statField('👑  UNVAN', `**${safeName(p.activeTitle || 'Yeni Oyuncu')}**`),
    statField('⭐  ACHIEVEMENT', `**${fmt(p.achievementPoints)} AP**`),
    statField('🪙  ANIME COIN', `**${fmt(p.coins?.animeCoin)}**`),
    statField('💎  RARE', `**${fmt(p.coins?.rareCurrency)}**`),
    statField('🌑  EVENT', `**${fmt(p.coins?.eventCurrency)}**`),
    statField(
      '📊  RPG PROGRESS',
      `${progressBar(p.achievementPoints, Math.max(1000, p.achievementPoints || 1))}\n**${fmt(p.achievementPoints)} AP**`,
      false
    )
  );

  embed.addFields({
    name: '✦  SHIZU MODULES',
    value:
      '👤 Profil  •  🎒 Envanter  •  🏆 Başarımlar\n' +
      '🏪 Tüccar  •  ⚒️ Craft  •  🧬 Gelişim  •  ⚔️ Espada',
    inline: false
  });

  return embed;
}

function profileEmbed(member) {
  const p = store.getPlayer(member.guild.id, member.id);
  const completed = p.completedQuests?.length || 0;
  const unlocked = p.unlockedSystems?.length || 0;

  const embed = baseEmbed({
    color: COLORS.shizu,
    page: 'Profile',
    title: 'PLAYER PROFILE',
    member,
    subtitle: 'Karakter kartın ve Shizu RPG istatistiklerin.'
  });

  embed.addFields(
    statField('🧬  KÖKEN', `**${titleCase(p.race)}**`),
    statField('⚔️  FORM', `**${titleCase(p.evolution)}**`),
    statField('🔄  REBIRTH', `**${fmt(p.rebirths)}**`),
    statField('👑  UNVAN', `**${safeName(p.activeTitle || 'Yeni Oyuncu')}**`),
    statField('⭐  ACHIEVEMENT POINT', `**${fmt(p.achievementPoints)} AP**`),
    statField('🌌  EVREN', `**${titleCase(p.anime)}**`)
  );

  embed.addFields({
    name: '💰  WALLET',
    value:
      `🪙 **${fmt(p.coins?.animeCoin)}** Anime Coin\n` +
      `💎 **${fmt(p.coins?.rareCurrency)}** Rare Currency\n` +
      `🌑 **${fmt(p.coins?.eventCurrency)}** Event Currency`,
    inline: true
  }, {
    name: '📈  PROGRESS',
    value:
      `Görevler  **${fmt(completed)}**\n` +
      `Sistemler  **${fmt(unlocked)}**\n` +
      `Rebirth    **${fmt(p.rebirths)}**`,
    inline: true
  });

  embed.addFields({
    name: '✦  CHARACTER STATUS',
    value:
      `\`${titleCase(p.evolution).toUpperCase()}\`\n` +
      `${progressBar(p.achievementPoints, Math.max(1000, p.achievementPoints || 1))}\n` +
      `**${fmt(p.achievementPoints)} AP**`,
    inline: false
  });

  return embed;
}

function inventoryEmbed(guildId, userId, member) {
  const inv = store.getInventory(guildId, userId);
  const entries = Object.entries(inv).filter(([, amount]) => Number(amount) > 0);

  const embed = baseEmbed({
    color: COLORS.blue,
    page: 'Inventory',
    title: 'INVENTORY',
    member,
    subtitle: entries.length
      ? `${entries.length} farklı eşya • Envanterin kontrol paneli.`
      : 'Envanterin şu anda boş.'
  });

  if (!entries.length) {
    embed.addFields({
      name: '🎒  EMPTY INVENTORY',
      value:
        'Henüz eşyan yok.\n\n' +
        '🏪 Tüccarı ziyaret et veya görevlerden eşya kazan.',
      inline: false
    });
    return embed;
  }

  const chunks = [];
  for (let i = 0; i < entries.length; i += 5) chunks.push(entries.slice(i, i + 5));

  chunks.forEach((chunk, index) => {
    embed.addFields({
      name: `${index === 0 ? '🎒' : '◈'}  ITEM CACHE ${index + 1}`,
      value: chunk.map(([id, amount]) => {
        const item = ITEMS[id] || {};
        return [
          `${rarityIcon(item.rarity)} **${item.name || id}**  × **${fmt(amount)}**`,
          `\`${rarity(item.rarity)}\`  ${item.description || 'RPG eşyası.'}`
        ].join('\n');
      }).join('\n\n'),
      inline: false
    });
  });

  return embed;
}

function merchantEmbed(member) {
  const m = store.getMerchant();

  if (!m.active || m.expiresAt <= Date.now()) {
    return baseEmbed({
      color: COLORS.dark2,
      page: 'Merchant',
      title: 'THE MERCHANT',
      member,
      subtitle: 'Tüccar şu anda dünyada değil.'
    }).addFields({
      name: '◇  MARKET OFFLINE',
      value:
        'Yeni bir stok açıldığında burada görünecek.\n' +
        'Zamanlı stoklar ve world event eşyaları sınırlıdır.',
      inline: false
    });
  }

  const embed = baseEmbed({
    color: COLORS.gold,
    page: 'Merchant',
    title: 'THE MERCHANT',
    member,
    subtitle: `Sınırlı stok • Kapanış <t:${Math.floor(m.expiresAt / 1000)}:R>`
  });

  embed.addFields({
    name: '⏳  MARKET TIMER',
    value: `<t:${Math.floor(m.expiresAt / 1000)}:F>\n<t:${Math.floor(m.expiresAt / 1000)}:R>`,
    inline: true
  }, {
    name: '📦  STOCK',
    value: `**${m.stock.length}** ürün`,
    inline: true
  });

  const lines = m.stock.map((stock, index) => {
    const item = ITEMS[stock.item] || {};
    const remaining = stock.remaining === null ? '∞' : `×${stock.remaining}`;
    return (
      `**${String(index + 1).padStart(2, '0')}**  ${rarityIcon(item.rarity)} **${item.name || stock.item}**\n` +
      `> \`🪙 ${fmt(stock.price)}\`  •  \`${rarity(item.rarity)}\`  •  **${remaining}**`
    );
  });

  const chunks = [];
  for (let i = 0; i < lines.length; i += 5) chunks.push(lines.slice(i, i + 5));

  chunks.forEach((chunk, index) => {
    embed.addFields({
      name: `🏪  ${index === 0 ? 'CURRENT STOCK' : 'MORE STOCK'}  ${index + 1}`,
      value: chunk.join('\n\n'),
      inline: false
    });
  });

  return embed;
}

function merchantComponents() {
  const m = store.getMerchant();
  if (!m.active || m.expiresAt <= Date.now()) return [];

  const options = m.stock
    .map((stock, index) => ({ stock, index }))
    .filter(({ stock }) => stock.remaining !== 0)
    .slice(0, 25)
    .map(({ stock, index }) => {
      const item = ITEMS[stock.item] || {};
      return {
        label: `${index + 1}. ${item.name || stock.item}`.slice(0, 100),
        description: `${fmt(stock.price)} Anime Coin • ${stock.remaining === null ? 'Sınırsız' : `Kalan ${stock.remaining}`}`.slice(0, 100),
        value: String(index)
      };
    });

  if (!options.length) return [];

  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('rpg:buy-select')
        .setPlaceholder('▾  Satın almak için eşya seç')
        .addOptions(options)
    )
  ];
}

function achievementsEmbed(guildId, userId, member) {
  const p = store.getPlayer(guildId, userId);
  const claimed = new Set(p.achievements || []);
  const entries = Object.entries(ACHIEVEMENTS);

  const completed = entries.filter(([id]) => claimed.has(id)).length;
  const percent = entries.length ? Math.round((completed / entries.length) * 100) : 0;

  const embed = baseEmbed({
    color: COLORS.gold,
    page: 'Achievements',
    title: 'ACHIEVEMENTS',
    member,
    subtitle: `${completed}/${entries.length} tamamlandı • ${percent}% koleksiyon`
  });

  embed.addFields({
    name: '⭐  ACHIEVEMENT SCORE',
    value:
      `**${fmt(p.achievementPoints)} AP**\n` +
      `${progressBar(percent, 100)}  **${percent}%**`,
    inline: false
  });

  const lines = entries.map(([id, achievement]) => {
    const done = claimed.has(id);
    const reward = achievement.reward || {};
    const rewards = [
      reward.points ? `⭐ ${reward.points} AP` : null,
      reward.animeCoin ? `🪙 ${fmt(reward.animeCoin)}` : null,
      reward.title ? `👑 ${reward.title}` : null
    ].filter(Boolean).join('  •  ');

    return [
      `${done ? '🟣' : '⚫'} **${achievement.name}**`,
      `> ${achievement.description || 'Gizli başarı.'}`,
      `> ${done ? 'TAMAMLANDI' : 'KİLİTLİ'}  •  ${rewards || 'Ödül bilgisi yok'}`
    ].join('\n');
  });

  for (let i = 0; i < lines.length; i += 3) {
    embed.addFields({
      name: `🏆  ACHIEVEMENT SET ${Math.floor(i / 3) + 1}`,
      value: lines.slice(i, i + 3).join('\n\n'),
      inline: false
    });
  }

  return embed;
}

function craftEmbed(member) {
  const p = store.getPlayer(member.guild.id, member.id);
  const recipes = Object.entries(RECIPES);

  const embed = baseEmbed({
    color: COLORS.cyan,
    page: 'Craft',
    title: 'CRAFT FORGE',
    member,
    subtitle: 'Materyalleri birleştir. Gücünü üret.'
  });

  embed.addFields({
    name: '🪙  AVAILABLE COINS',
    value: `**${fmt(p.coins?.animeCoin)} Anime Coin**`,
    inline: true
  }, {
    name: '⚒️  RECIPES',
    value: `**${recipes.length}** tarif`,
    inline: true
  });

  recipes.forEach(([id, recipe]) => {
    const item = ITEMS[recipe.item] || {};
    const materials = Object.entries(recipe.materials || {})
      .map(([material, amount]) => `\`${material} ×${amount}\``)
      .join('  +  ') || '`Materyal yok`';

    embed.addFields({
      name: `⚒️  ${item.name || id}`,
      value:
        `${item.description || 'Özel craft eşyası.'}\n` +
        `**Gerekli:** ${materials}\n` +
        `**Maliyet:** 🪙 ${fmt(recipe.coins)} Anime Coin`,
      inline: false
    });
  });

  return embed;
}

function craftComponents() {
  const options = Object.entries(RECIPES).map(([id, recipe]) => {
    const item = ITEMS[recipe.item] || {};
    return {
      label: item.name || id,
      description: `${fmt(recipe.coins)} Anime Coin • ${Object.entries(recipe.materials || {}).map(([m, n]) => `${m}×${n}`).join(', ')}`.slice(0, 100),
      value: id
    };
  });

  if (!options.length) return [];

  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('rpg:craft-select')
        .setPlaceholder('▾  Craft tarifini seç')
        .addOptions(options)
    )
  ];
}

function evolutionEmbed(guildId, userId, member) {
  const p = store.getPlayer(guildId, userId);
  const current = p.evolution;
  const next = EVOLUTIONS[current]?.next || [];

  const chain = ['human', 'hollow', 'menos', 'adjuchas', 'vasto_lorde', 'arrancar', 'espada'];
  const currentIndex = Math.max(0, chain.indexOf(current));

  const chainText = chain.map((stage, index) => {
    if (index < currentIndex) return `~~${titleCase(stage)}~~`;
    if (index === currentIndex) return `**🟣 ${titleCase(stage)}**`;
    return `◌ ${titleCase(stage)}`;
  }).join('  →  ');

  const embed = baseEmbed({
    color: COLORS.pink,
    page: 'Evolution',
    title: 'POWER DEVELOPMENT',
    member,
    subtitle: 'Karakterinin dönüşüm ağacını yönet.'
  });

  embed.addFields({
    name: '🧬  CURRENT FORM',
    value:
      `**${titleCase(current)}**\n` +
      `${progressBar(currentIndex, Math.max(1, chain.length - 1), 14)}\n` +
      `Aşama **${currentIndex + 1}/${chain.length}**`,
    inline: false
  }, {
    name: '🌌  EVOLUTION PATH',
    value: chainText,
    inline: false
  });

  embed.addFields({
    name: '✦  NEXT EVOLUTION',
    value: next.length
      ? next.map(target => `🟣 **${titleCase(target)}**  —  ${titleCase(current)} → ${titleCase(target)}`).join('\n')
      : 'Bu formun tanımlı bir sonraki aşaması yok.',
    inline: false
  }, {
    name: '⚠️  REQUIREMENTS',
    value: 'Dönüşümler görev, eşya, AP, coin ve özel şartlara bağlı olabilir.',
    inline: false
  });

  return embed;
}

function evolutionComponents(guildId, userId) {
  const p = store.getPlayer(guildId, userId);
  const next = EVOLUTIONS[p.evolution]?.next || [];
  if (!next.length) return [];

  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('rpg:evolution-select')
        .setPlaceholder('▾  Bir sonraki formu seç')
        .addOptions(next.slice(0, 25).map(target => ({
          label: titleCase(target),
          description: `${titleCase(p.evolution)} → ${titleCase(target)}`.slice(0, 100),
          value: target
        })))
    )
  ];
}

function espadaEmbed(member) {
  const e = store.getEspada();
  const occupied = Object.values(e.slots || {}).filter(Boolean).length;

  const embed = baseEmbed({
    color: COLORS.red,
    page: 'Espada',
    title: 'ESPADA  /  0—9',
    member,
    subtitle: `${occupied}/10 koltuk dolu • Her slot benzersizdir.`
  });

  const slots = Array.from({ length: 10 }, (_, index) => {
    const slot = e.slots[String(index)];
    return slot
      ? `🔴  **${index}**  •  <@${slot.userId}>`
      : `🟣  **${index}**  •  \`AVAILABLE\``;
  });

  embed.addFields({
    name: '⚔️  ESPADA SEATS',
    value: slots.slice(0, 5).join('\n') + '\n\n' + slots.slice(5).join('\n'),
    inline: false
  });

  embed.addFields({
    name: '👑  STATUS',
    value:
      `**${occupied}/10** slot kullanılıyor\n` +
      `${progressBar(occupied, 10, 10)}`,
    inline: true
  }, {
    name: '🔐  REQUIREMENT',
    value: '**Hollow → Arrancar**\nAçık slot bulunmalı.',
    inline: true
  });

  embed.addFields({
    name: '✦  ESPADA SYSTEM',
    value:
      'Her koltuk yalnızca **bir oyuncuya** verilebilir.\n' +
      '10 slot tamamen dolduğunda yeni oyuncular Espada olamaz.',
    inline: false
  });

  return embed;
}

function balanceEmbed(member) {
  const p = store.getPlayer(member.guild.id, member.id);

  return baseEmbed({
    color: COLORS.gold,
    page: 'Balance',
    title: 'WALLET & CURRENCIES',
    member,
    subtitle: 'RPG ekonomindeki tüm para birimleri.'
  }).addFields(
    statField('🪙  ANIME COIN', `**${fmt(p.coins?.animeCoin)}**`, true),
    statField('💎  RARE CURRENCY', `**${fmt(p.coins?.rareCurrency)}**`, true),
    statField('🌑  EVENT CURRENCY', `**${fmt(p.coins?.eventCurrency)}**`, true),
    statField('⭐  ACHIEVEMENT POINT', `**${fmt(p.achievementPoints)} AP**`, false)
  );
}


function viewPayload(interaction, page) {
  const member = interaction.member;
  const guildId = interaction.guild.id;
  const userId = interaction.user.id;

  switch (page) {
    case 'profile':
      return { embeds: [profileEmbed(member)], components: navRows('profile'), files: filesForPage('profile') };
    case 'inventory':
      return { embeds: [inventoryEmbed(guildId, userId, member)], components: navRows('inventory'), files: filesForPage('inventory') };
    case 'merchant':
      return { embeds: [merchantEmbed(member)], components: [...merchantComponents(), ...navRows('merchant')], files: filesForPage('merchant') };
    case 'achievements':
      return { embeds: [achievementsEmbed(guildId, userId, member)], components: navRows('achievements'), files: filesForPage('achievements') };
    case 'craft':
      return { embeds: [craftEmbed(member)], components: [...craftComponents(), ...navRows('craft')], files: filesForPage('craft') };
    case 'evolution':
      return { embeds: [evolutionEmbed(guildId, userId, member)], components: [...evolutionComponents(guildId, userId), ...navRows('evolution')], files: filesForPage('evolution') };
    case 'espada':
      return { embeds: [espadaEmbed(member)], components: navRows('espada'), files: filesForPage('espada') };
    case 'balance':
      return { embeds: [balanceEmbed(member)], components: navRows('balance'), files: filesForPage('balance') };
    default:
      return { embeds: [panelEmbed(member)], components: navRows(), files: filesForPage('panel') };
  }
}

function showPanel(interaction, edit = false) {
  const payload = viewPayload(interaction, 'panel');
  return edit ? interaction.update(payload) : interaction.reply(payload);
}

// ============================================================
// BUTTON / SELECT HANDLER
// ============================================================

async function handleButton(interaction) {
  if (!interaction.isButton() && !interaction.isStringSelectMenu()) return false;
  if (!interaction.customId.startsWith('rpg:')) return false;

  try {
    const id = interaction.customId;

    if (id === 'rpg:panel') return showPanel(interaction, true);
    if (id === 'rpg:profile') return interaction.update(viewPayload(interaction, 'profile'));
    if (id === 'rpg:inventory') return interaction.update(viewPayload(interaction, 'inventory'));
    if (id === 'rpg:merchant') return interaction.update(viewPayload(interaction, 'merchant'));
    if (id === 'rpg:achievements') return interaction.update(viewPayload(interaction, 'achievements'));
    if (id === 'rpg:craft') return interaction.update(viewPayload(interaction, 'craft'));
    if (id === 'rpg:evolution') return interaction.update(viewPayload(interaction, 'evolution'));
    if (id === 'rpg:espada') return interaction.update(viewPayload(interaction, 'espada'));
    if (id === 'rpg:balance') return interaction.update(viewPayload(interaction, 'balance'));
    if (id === 'rpg:refresh') return interaction.update(viewPayload(interaction, 'panel'));

    if (id === 'rpg:buy-select') {
      const name = buy(interaction.guild.id, interaction.user.id, Number(interaction.values[0]));
      return interaction.update({
        embeds: [merchantEmbed(interaction.member)],
        components: [...merchantComponents(), ...navRows('merchant')],
        files: filesForPage('merchant')
      });
    }

    if (id === 'rpg:craft-select') {
      craft(interaction.guild.id, interaction.user.id, interaction.values[0]);
      return interaction.update({
        embeds: [craftEmbed(interaction.member)],
        components: [...craftComponents(), ...navRows('craft')],
        files: filesForPage('craft')
      });
    }

    if (id === 'rpg:evolution-select') {
      evolve(interaction.guild.id, interaction.user.id, interaction.values[0]);
      return interaction.update({
        embeds: [evolutionEmbed(interaction.guild.id, interaction.user.id, interaction.member)],
        components: [...evolutionComponents(interaction.guild.id, interaction.user.id), ...navRows('evolution')],
        files: filesForPage('evolution')
      });
    }
  } catch (error) {
    if (interaction.replied || interaction.deferred) {
      return interaction.followUp({ content: `❌ ${error.message}`, flags: MessageFlags.Ephemeral });
    }
    return replyError(interaction, error.message);
  }

  return false;
}

// ============================================================
// SLASH COMMAND HANDLER
// ============================================================

async function handleCommand(interaction) {
  if (!interaction.isChatInputCommand()) return false;

  if (interaction.commandName === 'rpg') {
    const sub = interaction.options.getSubcommand(false);

    if (!sub || sub === 'panel') return showPanel(interaction, false);
    if (sub === 'profile') return interaction.reply(viewPayload(interaction, 'profile'));
    if (sub === 'inventory') return interaction.reply(viewPayload(interaction, 'inventory'));
    if (sub === 'balance') return interaction.reply(viewPayload(interaction, 'balance'));
    if (sub === 'merchant') return interaction.reply(viewPayload(interaction, 'merchant'));
    if (sub === 'espada') return interaction.reply(viewPayload(interaction, 'espada'));
    if (sub === 'achievements') return interaction.reply(viewPayload(interaction, 'achievements'));

    if (sub === 'buy') {
      return interaction.reply({
        content: `✓ **${buy(interaction.guild.id, interaction.user.id, interaction.options.getInteger('slot') - 1)}** satın alındı.`,
        flags: MessageFlags.Ephemeral
      });
    }

    if (sub === 'craft') {
      return interaction.reply({
        content: `✓ **${craft(interaction.guild.id, interaction.user.id, interaction.options.getString('recipe'))}** üretildi.`,
        flags: MessageFlags.Ephemeral
      });
    }

    if (sub === 'evolve') {
      const player = evolve(interaction.guild.id, interaction.user.id, interaction.options.getString('target'));
      return interaction.reply({
        content: `✦ Gelişim tamamlandı: **${titleCase(player.evolution)}**`,
        flags: MessageFlags.Ephemeral
      });
    }

    if (sub === 'achievement') {
      const achievement = claimAchievement(interaction.guild.id, interaction.user.id, interaction.options.getString('id'));
      return interaction.reply({
        content: `🏆 **${achievement.name}** kazanıldı!`,
        flags: MessageFlags.Ephemeral
      });
    }

    if (sub === 'espada-claim') {
      const slot = claimEspada(interaction.guild.id, interaction.user.id, interaction.options.getInteger('slot'));
      return interaction.reply({
        content: `⚔️ **Espada ${slot}** artık senin!`,
        flags: MessageFlags.Ephemeral
      });
    }
  }

  if (interaction.commandName === 'rpgadmin') {
    if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild)) {
      return replyError(interaction, 'Bu komut için Manage Server gerekli.');
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'merchant') {
      const duration = interaction.options.getInteger('minutes') || 30;
      store.saveMerchant({
        active: true,
        expiresAt: Date.now() + duration * 60000,
        stock: [
          { item: 'hollow_mask', price: 1200, remaining: 1 },
          { item: 'zanpakuto', price: 2500, remaining: 1 },
          { item: 'soul_fragment', price: 150, remaining: 10 },
          { item: 'rare_material', price: 900, remaining: 3 }
        ]
      });
      return interaction.reply({ content: `🏪 Tüccar **${duration} dakika** açıldı.` });
    }

    if (sub === 'give') {
      const user = interaction.options.getUser('user');
      const item = interaction.options.getString('item');
      const amount = interaction.options.getInteger('amount');
      store.addItem(interaction.guild.id, user.id, item, amount);
      return interaction.reply({ content: `🎒 ${user} → ${ITEMS[item]?.name || item} ×${amount}` });
    }

    if (sub === 'coin') {
      const user = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      const player = store.getPlayer(interaction.guild.id, user.id);
      player.coins.animeCoin = Math.max(0, player.coins.animeCoin + amount);
      store.savePlayer(player);
      return interaction.reply({ content: `🪙 ${user} bakiyesi güncellendi.` });
    }
  }

  return false;
}

module.exports = {
  handleButton,
  handleCommand,
  panelEmbed,
  profileEmbed,
  inventoryEmbed,
  achievementsEmbed,
  merchantEmbed,
  craftEmbed,
  evolutionEmbed,
  espadaEmbed,
  store,
  ITEMS,
  UI_ASSETS,
  getUIAsset
};
