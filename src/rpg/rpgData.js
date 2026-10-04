const ITEMS = {
  hollow_mask: { name: '🎭 Hollow Mask', rarity: 'rare', price: 1200, stock: 1, anime: 'bleach' },
  soul_fragment: { name: '🧪 Soul Fragment', rarity: 'common', price: 150, anime: 'bleach' },
  rare_material: { name: '⚙️ Rare Material', rarity: 'rare', price: 0, anime: 'bleach' },
  zanpakuto: { name: '⚔️ Zanpakutō', rarity: 'special', price: 2500, stock: 1, anime: 'bleach' },
  soul_blade: { name: '⚔️ Soul Blade', rarity: 'epic', anime: 'bleach' },
  sukuna_finger: { name: '☝️ Sukuna\'s Finger', rarity: 'mythic', price: 5000, anime: 'jujutsu_kaisen' },
  grimoire: { name: '📖 Grimoire', rarity: 'rare', price: 1800, anime: 'black_clover' },
  devil_fruit: { name: '🍈 Devil Fruit', rarity: 'mythic', price: 7000, anime: 'one_piece' }
};
const RECIPES = {
  soul_blade: { item: 'soul_blade', amount: 1, materials: { soul_fragment: 3, rare_material: 1 }, coins: 500 }
};
const QUESTS = {
  hollow_awakening: { name: 'Hollow Awakening', description: 'Hollow dönüşümünün gereksinimlerini tamamla.', reward: { animeCoin: 1000, achievementPoints: 250 }, unlock: 'hollow' }
};
const ACHIEVEMENTS = {
  first_blood: { name: 'FIRST BLOOD', description: 'İlk etkinlik galibiyetini kazan.', reward: { animeCoin: 100, rareMaterial: 1, points: 50 } },
  hollow_awakening: { name: 'HOLLOW AWAKENING', description: 'Hollow ol.', reward: { points: 250, title: 'The Hollow' } }
};
const TITLES = { the_hollow: 'The Hollow', vasto_lorde: 'Vasto Lorde', soul_reaper: 'Soul Reaper', survivor: 'The Survivor' };
const EVOLUTIONS = {
  human: { next: ['hollow', 'shinigami', 'quincy'] },
  hollow: { next: ['menos'] },
  menos: { next: ['adjuchas'] },
  adjuchas: { next: ['vasto_lorde'] },
  vasto_lorde: { next: ['arrancar'] },
  arrancar: { next: ['espada'] }
};
module.exports = { ITEMS, RECIPES, QUESTS, ACHIEVEMENTS, TITLES, EVOLUTIONS };
