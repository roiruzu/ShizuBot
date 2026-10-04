const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  MessageFlags,
  PermissionsBitField
} = require('discord.js');

const store = require('./rpgStore');
const { ITEMS, RECIPES, ACHIEVEMENTS, EVOLUTIONS } = require('./rpgData');

// ============================================================
// SHIZU RPG — MODERN UI
// Rank sistemindeki koyu + mor atmosferi Discord Embed sistemine
// uyarlayan ortak UI katmanı.
// ============================================================

const COLORS = {
  purple: 0x8b5cf6,
  purpleDark: 0x4c1d95,
  blue: 0x6366f1,
  cyan: 0x06b6d4,
  gold: 0xf59e0b,
  green: 0x10b981,
  red: 0xef4444,
  pink: 0xec4899,
  neutral: 0x18181b
};

const UI = {
  divider: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  dot: '•',
  empty: '—',
  footer: 'SHIZU RPG  •  Anime Universe'
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
    rare: 'RARE',
    special: 'SPECIAL',
    epic: 'EPIC',
    mythic: 'MYTHIC'
  }[value] || String(value || 'UNKNOWN').toUpperCase());
}

function coins(p) {
  return [
    `🪙 **${fmt(p.coins.animeCoin)}**`,
    `💎 **${fmt(p.coins.rareCurrency)}**`,
    `🌑 **${fmt(p.coins.eventCurrency)}**`
  ].join('   ');
}

function progressBar(current, max, size = 14) {
  const ratio = max <= 0 ? 0 : Math.max(0, Math.min(1, current / max));
  const filled = Math.round(ratio * size);
  return `${'▰'.repeat(filled)}${'▱'.repeat(size - filled)}`;
}

function baseEmbed({ color = COLORS.purple, title, subtitle, member, footer = UI.footer }) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setFooter({ text: footer });

  if (subtitle) embed.setDescription(subtitle);
  if (member) embed.setThumbnail(member.displayAvatarURL({ size: 256 }));
  return embed;
}

function navRows(active = 'profile') {
  // Discord bazen emoji alanını özel emoji gibi yorumlayabiliyor.
  // Bu nedenle panel butonlarında .setEmoji() HİÇ kullanmıyoruz.
  // Unicode emojiler doğrudan label içinde kullanılıyor.
  const button = (id, label, style = ButtonStyle.Secondary) =>
    new ButtonBuilder()
      .setCustomId(`rpg:${id}`)
      .setLabel(label)
      .setStyle(id === active ? ButtonStyle.Primary : style);

  return [
    new ActionRowBuilder().addComponents(
      button('profile', '👤 Profil'),
      button('inventory', '🎒 Envanter'),
      button('achievements', '🏆 Başarımlar'),
      button('merchant', '🏪 Tüccar'),
      button('craft', '⚒️ Craft')
    ),
    new ActionRowBuilder().addComponents(
      button('evolution', '🧬 Gelişim'),
      button('espada', '⚔️ Espada', ButtonStyle.Danger),
      button('balance', '💰 Bakiye'),
      button('refresh', '🔄 Yenile'),
      button('panel', '🏠 Ana Panel')
    )
  ];
}

function panelEmbed(member) {
  const p = store.getPlayer(member.guild.id, member.id);

  return baseEmbed({
    color: COLORS.purple,
    title: '✦ SHIZU  /  ANIME RPG',
    subtitle:
      `**${safeName(member.displayName)}**, anime evrenine hoş geldin.\n` +
      `Aşağıdaki modüllerden birini seçerek macerana devam et.\n\n` +
      `**${titleCase(p.race)}**  ${UI.dot}  **${titleCase(p.evolution)}**  ${UI.dot}  **${safeName(p.activeTitle || 'Yeni Oyuncu')}**\n\n` +
      `${UI.divider}\n` +
      `🪙 ${fmt(p.coins.animeCoin)}   💎 ${fmt(p.coins.rareCurrency)}   🌑 ${fmt(p.coins.eventCurrency)}   ${UI.dot}   ⭐ ${fmt(p.achievementPoints)} AP`,
    member
  });
}

function profileEmbed(member) {
  const p = store.getPlayer(member.guild.id, member.id);

  return baseEmbed({
    color: COLORS.purple,
    title: `👤  ${safeName(member.displayName)}`,
    subtitle: `**${safeName(p.activeTitle || 'Yeni Oyuncu')}**\n${UI.divider}`,
    member
  })
    .addFields(
      {
        name: '🧬 Köken',
        value: `**${titleCase(p.race)}**`,
        inline: true
      },
      {
        name: '⚔️ Gelişim',
        value: `**${titleCase(p.evolution)}**`,
        inline: true
      },
      {
        name: '🔄 Rebirth',
        value: `**${fmt(p.rebirths)}**`,
        inline: true
      },
      {
        name: '🏆 Achievement Point',
        value: `**${fmt(p.achievementPoints)} AP**`,
        inline: true
      },
      {
        name: '💰 Servet',
        value: coins(p),
        inline: false
      },
      {
        name: '🌌 RPG Durumu',
        value: `Anime: **${titleCase(p.anime)}**\nTamamlanan görev: **${p.completedQuests?.length || 0}**\nAçılan sistem: **${p.unlockedSystems?.length || 0}**`,
        inline: false
      }
    );
}

function inventoryEmbed(guildId, userId, member) {
  const inv = store.getInventory(guildId, userId);
  const entries = Object.entries(inv).filter(([, amount]) => Number(amount) > 0);

  const lines = entries.map(([id, amount]) => {
    const item = ITEMS[id] || {};
    return `**${item.name || id}**  ×${fmt(amount)}\n${UI.dot} ${rarity(item.rarity)}  ${item.description || 'RPG eşyası.'}`;
  });

  return baseEmbed({
    color: COLORS.blue,
    title: '🎒  ENVANTER',
    subtitle: entries.length
      ? `Sahip olduğun eşyalar\n${UI.divider}\n${lines.join('\n\n')}`
      : `Envanterin şu anda boş.\n\n${UI.divider}\nTüccarı ziyaret et veya görevlerden eşya kazan.`,
    member
  });
}

function merchantEmbed() {
  const m = store.getMerchant();

  if (!m.active || m.expiresAt <= Date.now()) {
    return baseEmbed({
      color: COLORS.neutral,
      title: '🏪  THE MERCHANT',
      subtitle: `Tüccar şu anda dünyada değil.\n\n${UI.divider}\nYeni bir stok açıldığında burada görünecek.`
    });
  }

  const lines = m.stock.map((stock, index) => {
    const item = ITEMS[stock.item] || {};
    return `**${String(index + 1).padStart(2, '0')}  ${item.name || stock.item}**\n` +
      `${UI.dot} 🪙 ${fmt(stock.price)} Anime Coin   ${UI.dot} ${rarity(item.rarity)}   ${UI.dot} ${stock.remaining === null ? '∞' : `×${stock.remaining}`}`;
  });

  return baseEmbed({
    color: COLORS.gold,
    title: '🏪  THE MERCHANT HAS ARRIVED',
    subtitle: `${UI.divider}\n${lines.join('\n\n')}\n\n${UI.divider}\n⏳ **Kapanıyor:** <t:${Math.floor(m.expiresAt / 1000)}:R>`
  });
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
        description: `🪙 ${fmt(stock.price)} • ${stock.remaining === null ? 'Sınırsız' : `Kalan ${stock.remaining}`}`.slice(0, 100),
        value: String(index)
      };
    });

  if (!options.length) return [];

  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('rpg:buy-select')
        .setPlaceholder('Bir eşya satın al')
        .addOptions(options)
    )
  ];
}

function achievementsEmbed(guildId, userId, member) {
  const p = store.getPlayer(guildId, userId);
  const claimed = new Set(p.achievements || []);

  const lines = Object.entries(ACHIEVEMENTS).map(([id, achievement]) => {
    const done = claimed.has(id);
    const reward = achievement.reward || {};
    const rewards = [
      reward.points ? `⭐ ${reward.points} AP` : null,
      reward.animeCoin ? `🪙 ${fmt(reward.animeCoin)}` : null,
      reward.title ? `👑 ${reward.title}` : null
    ].filter(Boolean).join('  ');

    return `${done ? '✓' : '○'} **${achievement.name}**\n` +
      `${UI.dot} ${achievement.description}\n` +
      `${UI.dot} ${rewards || 'Ödül bilgisi yok'}`;
  });

  return baseEmbed({
    color: COLORS.gold,
    title: '🏆  ACHIEVEMENTS',
    subtitle: `**${fmt(p.achievementPoints)} AP** kazanıldı\n${UI.divider}\n${lines.join('\n\n')}`,
    member
  });
}

function craftEmbed(member) {
  const p = store.getPlayer(member.guild.id, member.id);
  const lines = Object.entries(RECIPES).map(([id, recipe]) => {
    const item = ITEMS[recipe.item] || {};
    const materials = Object.entries(recipe.materials || {})
      .map(([material, amount]) => `${material} ×${amount}`)
      .join('  +  ');

    return `**${item.name || id}**\n${UI.dot} ${materials || 'Materyal yok'}\n${UI.dot} 🪙 ${fmt(recipe.coins)} Anime Coin`;
  });

  return baseEmbed({
    color: COLORS.cyan,
    title: '⚒️  CRAFT / ZANAAT',
    subtitle: `Mevcut Anime Coin: **🪙 ${fmt(p.coins.animeCoin)}**\n${UI.divider}\n${lines.join('\n\n')}\n\nTarif seçerek üretime başlayabilirsin.`,
    member
  });
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
        .setPlaceholder('Bir tarif seç')
        .addOptions(options)
    )
  ];
}

function evolutionEmbed(guildId, userId, member) {
  const p = store.getPlayer(guildId, userId);
  const next = EVOLUTIONS[p.evolution]?.next || [];

  const paths = next.length
    ? next.map(target => `**${titleCase(target)}**\n${UI.dot} Yeni güç aşaması`).join('\n\n')
    : 'Bu aşamanın devam eden bir yolu bulunmuyor.';

  return baseEmbed({
    color: COLORS.pink,
    title: '🧬  POWER DEVELOPMENT',
    subtitle: `Mevcut form\n**${titleCase(p.evolution)}**\n\n${UI.divider}\n\nSonraki gelişimler\n${paths}\n\n${UI.divider}\n⚠️ Dönüşümler görev, eşya, AP ve para şartlarına bağlıdır.`,
    member
  });
}

function evolutionComponents(guildId, userId) {
  const p = store.getPlayer(guildId, userId);
  const next = EVOLUTIONS[p.evolution]?.next || [];
  if (!next.length) return [];

  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('rpg:evolution-select')
        .setPlaceholder('Gelişim seç')
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
  const slots = Array.from({ length: 10 }, (_, index) => {
    const slot = e.slots[String(index)];
    return slot
      ? `**${index}**  🔴  <@${slot.userId}>`
      : `**${index}**  🟢  BOŞ`;
  });

  return baseEmbed({
    color: COLORS.red,
    title: '⚔️  ESPADA  /  0—9',
    subtitle: `10 benzersiz koltuk. Her slot yalnızca bir oyuncuya ait olabilir.\n\n${UI.divider}\n${slots.join('\n')}\n${UI.divider}\n\n**Şart:** Hollow → Arrancar olmalısın.`,
    member
  });
}

function balanceEmbed(member) {
  const p = store.getPlayer(member.guild.id, member.id);
  return baseEmbed({
    color: COLORS.gold,
    title: '💰  WALLET',
    subtitle: `${UI.divider}\n\n🪙 **${fmt(p.coins.animeCoin)}** Anime Coin\n💎 **${fmt(p.coins.rareCurrency)}** Rare Currency\n🌑 **${fmt(p.coins.eventCurrency)}** Event Currency\n\n${UI.divider}\n⭐ **${fmt(p.achievementPoints)} AP**`,
    member
  });
}

function resultEmbed(title, description, color = COLORS.green) {
  return baseEmbed({ color, title, subtitle: description });
}

function replyError(interaction, message) {
  return interaction.reply({
    content: `❌ ${message}`,
    flags: MessageFlags.Ephemeral
  });
}

// ============================================================
// GAME ACTIONS
// ============================================================

function buy(guildId, userId, index) {
  const m = store.getMerchant();
  if (!m.active || m.expiresAt <= Date.now()) throw new Error('Tüccar artık aktif değil.');

  const stock = m.stock[index];
  if (!stock) throw new Error('Geçersiz stok.');
  if (stock.remaining === 0) throw new Error('Bu eşya tükendi.');

  const p = store.getPlayer(guildId, userId);
  if (p.coins.animeCoin < stock.price) throw new Error('Yeterli Anime Coin yok.');

  p.coins.animeCoin -= stock.price;
  store.savePlayer(p);
  store.addItem(guildId, userId, stock.item, 1);

  if (stock.remaining !== null) {
    stock.remaining--;
    store.saveMerchant(m);
  }

  return ITEMS[stock.item]?.name || stock.item;
}

function craft(guildId, userId, id) {
  const recipe = RECIPES[id];
  if (!recipe) throw new Error('Tarif bulunamadı.');

  const p = store.getPlayer(guildId, userId);
  if (p.coins.animeCoin < recipe.coins) throw new Error('Yeterli Anime Coin yok.');
  if (!store.removeItems(guildId, userId, recipe.materials)) throw new Error('Gerekli materyaller eksik.');

  p.coins.animeCoin -= recipe.coins;
  store.savePlayer(p);
  store.addItem(guildId, userId, recipe.item, recipe.amount);

  return ITEMS[recipe.item]?.name || recipe.item;
}

function evolve(guildId, userId, target) {
  const p = store.getPlayer(guildId, userId);
  const next = EVOLUTIONS[p.evolution]?.next || [];

  if (!next.includes(target)) throw new Error('Bu dönüşüm mevcut gelişim yolunda değil.');

  if (target === 'hollow') {
    if (!store.hasItems(guildId, userId, { hollow_mask: 1 })) throw new Error('🎭 Hollow Mask gerekli.');
    if (p.achievementPoints < 250) throw new Error('⭐ 250 Achievement Point gerekli.');
    if (p.coins.animeCoin < 1000) throw new Error('🪙 1000 Anime Coin gerekli.');

    store.removeItems(guildId, userId, { hollow_mask: 1 });
    p.coins.animeCoin -= 1000;
    p.race = 'hollow';
  }

  p.evolution = target;
  store.savePlayer(p);
  return p;
}

function claimAchievement(guildId, userId, id) {
  const achievement = ACHIEVEMENTS[id];
  if (!achievement) throw new Error('Achievement bulunamadı.');

  const p = store.getPlayer(guildId, userId);
  if (p.achievements.includes(id)) throw new Error('Bu achievement zaten alındı.');

  p.achievements.push(id);
  p.achievementPoints += achievement.reward.points || 0;
  if (achievement.reward.animeCoin) p.coins.animeCoin += achievement.reward.animeCoin;
  if (achievement.reward.title) p.activeTitle = achievement.reward.title;
  store.savePlayer(p);

  if (achievement.reward.rareMaterial) {
    store.addItem(guildId, userId, 'rare_material', achievement.reward.rareMaterial);
  }

  return achievement;
}

function claimEspada(guildId, userId, slot) {
  if (slot < 0 || slot > 9) throw new Error('Espada slotu 0-9 olmalı.');

  const p = store.getPlayer(guildId, userId);
  if (p.race !== 'hollow' || p.evolution !== 'arrancar') {
    throw new Error('Espada olmak için Arrancar olmalısın.');
  }

  const e = store.getEspada();
  const key = String(slot);
  if (e.slots[key]) throw new Error(`Espada ${slot} zaten dolu.`);

  e.slots[key] = { guildId, userId, claimedAt: Date.now() };
  store.saveEspada(e);

  p.evolution = 'espada';
  p.activeTitle = `Espada #${slot}`;
  store.savePlayer(p);

  return slot;
}

// ============================================================
// VIEW HELPERS
// ============================================================

function viewPayload(interaction, page) {
  const member = interaction.member;
  const guildId = interaction.guild.id;
  const userId = interaction.user.id;

  switch (page) {
    case 'profile':
      return { embeds: [profileEmbed(member)], components: navRows('profile') };
    case 'inventory':
      return { embeds: [inventoryEmbed(guildId, userId, member)], components: navRows('inventory') };
    case 'merchant':
      return { embeds: [merchantEmbed()], components: [...merchantComponents(), ...navRows('merchant')] };
    case 'achievements':
      return { embeds: [achievementsEmbed(guildId, userId, member)], components: navRows('achievements') };
    case 'craft':
      return { embeds: [craftEmbed(member)], components: [...craftComponents(), ...navRows('craft')] };
    case 'evolution':
      return { embeds: [evolutionEmbed(guildId, userId, member)], components: [...evolutionComponents(guildId, userId), ...navRows('evolution')] };
    case 'espada':
      return { embeds: [espadaEmbed(member)], components: navRows('espada') };
    case 'balance':
      return { embeds: [balanceEmbed(member)], components: navRows('balance') };
    default:
      return { embeds: [panelEmbed(member)], components: navRows() };
  }
}

async function showPanel(interaction, edit = false) {
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
        embeds: [
          resultEmbed('✓  SATIN ALMA TAMAM', `**${name}** envanterine eklendi.\n\n${UI.divider}\nTüccar stoğu aşağıda güncellendi.`, COLORS.green),
          merchantEmbed()
        ],
        components: [...merchantComponents(), ...navRows('merchant')]
      });
    }

    if (id === 'rpg:craft-select') {
      const name = craft(interaction.guild.id, interaction.user.id, interaction.values[0]);
      return interaction.update({
        embeds: [
          resultEmbed('✓  CRAFT TAMAMLANDI', `**${name}** üretildi.\n\n${UI.divider}\nYeni eşyayı envanterinde bulabilirsin.`, COLORS.green)
        ],
        components: navRows('craft')
      });
    }

    if (id === 'rpg:evolution-select') {
      const p = evolve(interaction.guild.id, interaction.user.id, interaction.values[0]);
      return interaction.update({
        embeds: [
          resultEmbed('✦  EVOLUTION COMPLETE', `Yeni formun:\n\n**${titleCase(p.evolution)}**\n\nGücün bir sonraki aşamaya geçti.`, COLORS.pink)
        ],
        components: [...evolutionComponents(interaction.guild.id, interaction.user.id), ...navRows('evolution')]
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
  ITEMS
};
