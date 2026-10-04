const fs = require("fs");
const path = require("path");

// ============================================================
// LOG DIRECTORIES
// ============================================================

const LOG_DIR = path.join(__dirname, "../../data/logs");
const ARCHIVE_DIR = path.join(LOG_DIR, "archive");

let currentDate = getDateString();

// ============================================================
// DATE
// ============================================================

function getDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// ============================================================
// LOG FILE
// ============================================================

function getLogFile(date = currentDate) {
    return path.join(LOG_DIR, `${date}.log`);
}

// ============================================================
// DIRECTORIES
// ============================================================

function ensureDirectories() {
    fs.mkdirSync(LOG_DIR, {
        recursive: true
    });

    fs.mkdirSync(ARCHIVE_DIR, {
        recursive: true
    });
}

// ============================================================
// ENCODING FIX
// ============================================================

function fixEncoding(value) {
    if (typeof value !== "string") {
        return value;
    }

    // Sadece bozulmuş UTF-8 belirtileri varsa düzelt.
    const badCharacters = [
        "Ã",
        "Â",
        "Ä",
        "Å",
        "â",
        "ð"
    ];

    const hasBadEncoding = badCharacters.some(
        character => value.includes(character)
    );

    if (!hasBadEncoding) {
        return value;
    }

    try {
        const repaired = Buffer
            .from(value, "latin1")
            .toString("utf8");

        // Geçersiz karakter oluştuysa eski değeri koru.
        if (repaired.includes("\uFFFD")) {
            return value;
        }

        return repaired;
    } catch {
        return value;
    }
}

// ============================================================
// SANITIZE
// ============================================================

function sanitize(value) {
    if (value === undefined || value === null) {
        return "";
    }

    let output;

    if (typeof value === "string") {
        output = value;
    } else if (value instanceof Error) {
        output =
            value.stack ||
            value.message ||
            String(value);
    } else {
        try {
            output = JSON.stringify(
                value,
                null,
                2
            );
        } catch {
            output = String(value);
        }
    }

    output = fixEncoding(output);

    // ========================================================
    // HASSAS BİLGİLERİ GİZLE
    // ========================================================

    const sensitiveValues = [
        process.env.DISCORD_TOKEN,
        process.env.BOT_TOKEN,
        process.env.TOKEN,
        process.env.CLIENT_SECRET
    ].filter(Boolean);

    for (const secret of sensitiveValues) {
        output = output
            .split(secret)
            .join("[REDACTED]");
    }

    return output;
}

// ============================================================
// FORMAT ARGUMENTS
// ============================================================

function formatArguments(args) {
    return args
        .map(arg => sanitize(arg))
        .join(" ");
}

// ============================================================
// TIMESTAMP
// ============================================================

function getTimestamp() {
    const now = new Date();

    const date = getDateString(now);

    const time = now.toLocaleTimeString(
        "tr-TR",
        {
            hour12: false
        }
    );

    const milliseconds = String(
        now.getMilliseconds()
    ).padStart(3, "0");

    return `${date} ${time}.${milliseconds}`;
}

// ============================================================
// ARCHIVE OLD LOGS
// ============================================================

function archiveOldLogs() {
    ensureDirectories();

    const today = getDateString();

    let files;

    try {
        files = fs.readdirSync(LOG_DIR);
    } catch (error) {
        process.stderr.write(
            `[LOGGER] Log klasörü okunamadı: ${
                error.stack ||
                error.message
            }\n`,
            "utf8"
        );

        return;
    }

    for (const file of files) {
        // Sadece YYYY-MM-DD.log dosyalarını ele al
        if (!/^\d{4}-\d{2}-\d{2}\.log$/.test(file)) {
            continue;
        }

        const fileDate = file.replace(
            ".log",
            ""
        );

        // Bugünün loguna dokunma
        if (fileDate === today) {
            continue;
        }

        const source = path.join(
            LOG_DIR,
            file
        );

        const year = fileDate.substring(
            0,
            4
        );

        const month = fileDate.substring(
            5,
            7
        );

        const destinationDirectory =
            path.join(
                ARCHIVE_DIR,
                year,
                month
            );

        const destination =
            path.join(
                destinationDirectory,
                file
            );

        try {
            fs.mkdirSync(
                destinationDirectory,
                {
                    recursive: true
                }
            );

            if (
                fs.existsSync(destination)
            ) {
                fs.rmSync(
                    destination,
                    {
                        force: true
                    }
                );
            }

            fs.renameSync(
                source,
                destination
            );

            process.stdout.write(
                `[LOGGER] Eski log arşivlendi: ${file}\n`,
                "utf8"
            );
        } catch (error) {
            process.stderr.write(
                `[LOGGER] Log arşivlenemedi: ${file}\n`,
                "utf8"
            );

            process.stderr.write(
                `${error.stack || error.message}\n`,
                "utf8"
            );
        }
    }
}

// ============================================================
// ROTATE LOG
// ============================================================

function rotateIfNeeded() {
    const newDate = getDateString();

    if (newDate === currentDate) {
        return;
    }

    currentDate = newDate;

    archiveOldLogs();
}

// ============================================================
// WRITE
// ============================================================

function write(level, args) {
    ensureDirectories();
    rotateIfNeeded();

    const timestamp = getTimestamp();
    const message = formatArguments(args);

    const line =
        `[${timestamp}] [${level}] ${message}\n`;

    try {
        // Dosyaya UTF-8
        fs.appendFileSync(
            getLogFile(),
            line,
            {
                encoding: "utf8"
            }
        );

        // Terminal
        if (
            level === "ERROR" ||
            level === "WARN"
        ) {
            process.stderr.write(
                line,
                "utf8"
            );
        } else {
            process.stdout.write(
                line,
                "utf8"
            );
        }
    } catch (error) {
        process.stderr.write(
            `[LOGGER] Log yazılamadı: ${
                error.stack ||
                error.message
            }\n`,
            "utf8"
        );
    }
}

// ============================================================
// LOG LEVELS
// ============================================================

function info(...args) {
    write("INFO", args);
}

function warn(...args) {
    write("WARN", args);
}

function error(...args) {
    write("ERROR", args);
}

function debug(...args) {
    write("DEBUG", args);
}

function success(...args) {
    write("SUCCESS", args);
}

// ============================================================
// INITIALIZE
// ============================================================

function initialize() {
    ensureDirectories();
    archiveOldLogs();
    currentDate = getDateString();
}

// ============================================================
// CONSOLE LOGGER
// ============================================================

function installConsoleLogger() {
    const originalLog = console.log;
    const originalInfo = console.info;
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalDebug = console.debug;

    console.log = (...args) => {
        write("INFO", args);
        originalLog(...args);
    };

    console.info = (...args) => {
        write("INFO", args);
        originalInfo(...args);
    };

    console.warn = (...args) => {
        write("WARN", args);
        originalWarn(...args);
    };

    console.error = (...args) => {
        write("ERROR", args);
        originalError(...args);
    };

    console.debug = (...args) => {
        write("DEBUG", args);
        originalDebug(...args);
    };
}

// ============================================================
// START LOGGER
// ============================================================

initialize();
installConsoleLogger();

// ============================================================
// EXPORT
// ============================================================

module.exports = {
    info,
    warn,
    error,
    debug,
    success,
    initialize,
    archiveOldLogs
};
