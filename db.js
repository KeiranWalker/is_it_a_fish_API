const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connects to database
const db = new sqlite3.Database(path.resolve(__dirname, 'fishDB.db'));

// Creates table if does not exist
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS fish_or_not (
        thing TEXT PRIMARY KEY,
        is_fish INTEGER DEFAULT 0,
        is_not_fish INTEGER DEFAULT 0
        )
    `);
});

module.exports = db;