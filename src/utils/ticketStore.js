
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "../../data");
const FILE_PATH = path.join(DATA_DIR, "tickets.json");

function ensureFile() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(FILE_PATH)) {
        fs.writeFileSync(FILE_PATH, JSON.stringify({}, null, 2), "utf8");
    }
}

function readData() {
    ensureFile();

    try {
        return JSON.parse(fs.readFileSync(FILE_PATH, "utf8"));
    } catch {
        return {};
    }
}

function writeData(data) {
    ensureFile();
    fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), "utf8");
}

function getConfig(guildId) {
    const data = readData();

    return data[guildId]?.config || null;
}

function saveConfig(guildId, config) {
    const data = readData();

    if (!data[guildId]) {
        data[guildId] = {
            config: null,
            nextTicketNumber: 1,
            tickets: {}
        };
    }

    data[guildId].config = config;

    writeData(data);

    return data[guildId].config;
}

function getNextTicketNumber(guildId) {
    const data = readData();

    if (!data[guildId]) {
        data[guildId] = {
            config: null,
            nextTicketNumber: 1,
            tickets: {}
        };
    }

    const number = data[guildId].nextTicketNumber || 1;

    data[guildId].nextTicketNumber = number + 1;

    writeData(data);

    return number;
}

function createTicket(guildId, ticket) {
    const data = readData();

    if (!data[guildId]) {
        data[guildId] = {
            config: null,
            nextTicketNumber: 1,
            tickets: {}
        };
    }

    data[guildId].tickets[ticket.channelId] = ticket;

    writeData(data);

    return ticket;
}

function getTicket(guildId, channelId) {
    const data = readData();

    return data[guildId]?.tickets?.[channelId] || null;
}

function updateTicket(guildId, channelId, updates) {
    const data = readData();

    if (!data[guildId]?.tickets?.[channelId]) {
        return null;
    }

    data[guildId].tickets[channelId] = {
        ...data[guildId].tickets[channelId],
        ...updates
    };

    writeData(data);

    return data[guildId].tickets[channelId];
}

function deleteTicket(guildId, channelId) {
    const data = readData();

    if (!data[guildId]?.tickets?.[channelId]) {
        return false;
    }

    delete data[guildId].tickets[channelId];

    writeData(data);

    return true;
}

function findOpenTicketByUser(guildId, userId) {
    const data = readData();

    const tickets = data[guildId]?.tickets || {};

    return Object.values(tickets).find(
        ticket =>
            ticket.userId === userId &&
            ticket.status === "open"
    ) || null;
}

module.exports = {
    getConfig,
    saveConfig,
    getNextTicketNumber,
    createTicket,
    getTicket,
    updateTicket,
    deleteTicket,
    findOpenTicketByUser
};