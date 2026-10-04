const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../../data/rpg');
const FILES = {
  players: path.join(ROOT, 'players.json'),
  inventory: path.join(ROOT, 'inventory.json'),
  merchant: path.join(ROOT, 'merchant.json'),
  espada: path.join(ROOT, 'espada.json')
};

function ensure() {
  fs.mkdirSync(ROOT, { recursive: true });
  for (const [key, file] of Object.entries(FILES)) {
    if (!fs.existsSync(file)) {
      const initial = key === 'merchant' ? { active: false, expiresAt: 0, stock: [] } : key === 'espada' ? { slots: {} } : {};
      fs.writeFileSync(file, JSON.stringify(initial, null, 2), 'utf8');
    }
  }
}
function read(file) { ensure(); return JSON.parse(fs.readFileSync(file, 'utf8')); }
function write(file, data) { ensure(); const tmp = `${file}.tmp`; fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8'); fs.renameSync(tmp, file); }
function playerKey(guildId, userId) { return `${guildId}:${userId}`; }

function defaultPlayer(guildId, userId) {
  return { guildId, userId, race: 'human', evolution: 'human', anime: 'bleach', coins: { animeCoin: 0, rareCurrency: 0, eventCurrency: 0 }, achievementPoints: 0, activeTitle: null, completedQuests: [], achievements: [], unlockedSystems: [], rebirths: 0 };
}
function getPlayer(guildId, userId) {
  const data = read(FILES.players); const key = playerKey(guildId, userId);
  if (!data[key]) { data[key] = defaultPlayer(guildId, userId); write(FILES.players, data); }
  return data[key];
}
function savePlayer(player) { const data = read(FILES.players); data[playerKey(player.guildId, player.userId)] = player; write(FILES.players, data); return player; }
function getInventory(guildId, userId) { const data = read(FILES.inventory); return data[playerKey(guildId, userId)] || {}; }
function saveInventory(guildId, userId, inventory) { const data = read(FILES.inventory); data[playerKey(guildId, userId)] = inventory; write(FILES.inventory, data); }
function addItem(guildId, userId, itemId, amount = 1) { const inv = getInventory(guildId, userId); inv[itemId] = (inv[itemId] || 0) + amount; if (inv[itemId] <= 0) delete inv[itemId]; saveInventory(guildId, userId, inv); return inv; }
function hasItems(guildId, userId, req = {}) { const inv = getInventory(guildId, userId); return Object.entries(req).every(([id, n]) => (inv[id] || 0) >= n); }
function removeItems(guildId, userId, req = {}) { if (!hasItems(guildId, userId, req)) return false; const inv = getInventory(guildId, userId); for (const [id, n] of Object.entries(req)) { inv[id] -= n; if (inv[id] <= 0) delete inv[id]; } saveInventory(guildId, userId, inv); return true; }
function getMerchant() { return read(FILES.merchant); }
function saveMerchant(data) { write(FILES.merchant, data); }
function getEspada() { return read(FILES.espada); }
function saveEspada(data) { write(FILES.espada, data); }
module.exports = { getPlayer, savePlayer, getInventory, saveInventory, addItem, hasItems, removeItems, getMerchant, saveMerchant, getEspada, saveEspada };
