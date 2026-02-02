const sqlite3 = require('/app/node_modules/sqlite3');
const db = new sqlite3.Database('/root/.clawdbot/memory/main.sqlite');

db.serialize(() => {
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
        if (err) {
            console.error(err);
            process.exit(1);
        }

        tables.forEach(table => {
            const tableName = table.name;
            db.all(`SELECT * FROM "${tableName}"`, (err, rows) => {
                if (err) return;
                rows.forEach(row => {
                    const rowStr = JSON.stringify(row);
                    if (rowStr.toLowerCase().includes('anthropic')) {
                        console.log(`Found in table ${tableName}:`, rowStr);
                    }
                });
            });
        });
    });
});

setTimeout(() => db.close(), 5000);
