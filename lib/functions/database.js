import fs from "fs";
import database from "better-sqlite3";

import { Log } from "./utils.js";

const DATABASE = "./data";

if (!fs.existsSync(DATABASE)) {
   fs.mkdirSync(DATABASE, {
      recursive: true
   });
}

const db = new database("./data/database.db");
db.pragma("journal_mode = WAL");

global.db = {
   users: {},
   groups: {},
   settings: {},
   others: {}
};

async function connectDatabase() {
   try {
      db.exec(`
         CREATE TABLE IF NOT EXISTS json_store (
            key_id TEXT PRIMARY KEY,
            data_value TEXT
         )
      `);

      const row = db.prepare("SELECT data_value FROM json_store WHERE key_id = ?").get("data");

      if (row) {
         global.db = JSON.parse(row.data_value);
      } else {
         db.prepare("INSERT INTO json_store (key_id, data_value) VALUES (?, ?)").run("data", JSON.stringify(global.db));
      }

      Log("SQLite CONNECTED!", "SYSTEM", { top: true });

      const saveStmt = db.prepare("UPDATE json_store SET data_value = ? WHERE key_id = ?");

      setInterval(() => {
         try {
            if (global.db) {
               saveStmt.run(JSON.stringify(global.db), "data");
            }
         } catch (e) {
            console.error(e);
         }
      }, 60 * 1000);

   } catch (e) {
      throw new Error({ e });
   }
}

export {
   connectDatabase
};