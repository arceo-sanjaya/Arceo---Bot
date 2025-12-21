import {
   Browsers,
   makeWASocket,
   useMultiFileAuthState,
   DisconnectReason,
   generateForwardMessageContent,
   generateWAMessageFromContent,
   downloadContentFromMessage,
   makeInMemoryStore,
   jidDecode,
   proto
} from "@whiskeysockets/baileys";
import chalk from "chalk";
import fs from "fs";
import fileType from "file-type";
import os from "os";
import path from "path";
import util from "util";
import { fileURLToPath, pathToFileURL } from "url";
import { parsePhoneNumber } from "libphonenumber-js";

import {
   config
} from "./settings/loader.js";
import {
   connectDatabase
} from "./functions/database.js";
import {
   doFormat,
   checkRaw
} from "./functions/logger.js";
import {
   Log,
   getInput,
   getBuffer,
   getLocalIp,
   parseTime,
   runtime,
   smsg
} from "./functions/utils.js";
import {
   imageToWebp,
   videoToWebp,
   writeExifImg,
   writeExifVid,
   writeExif
} from "./functions/exif.js";

const {
   owner,
   bot,
   sticker,
   system,
   connect
} = config;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, "../");

const SESSION = path.join(connect.session.path, connect.session.name);
const DATABASE = path.join(SESSION, "store.json");
const PLUGIN = path.join(__dirname, "../plugins");
const CACHE = ".cache";
const TRASH = "./data/trash";

[SESSION, PLUGIN, CACHE, TRASH].forEach(dir => {
   if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
   }
});

const STUB = {
   trace: () => {},
   debug: () => {},
   info: () => {},
   warn: () => {},
   error: () => {},
   fatal: () => {},
   child: () => STUB
};

const store = makeInMemoryStore({ logger: STUB });
const PLUGIN_MAP = new Map();
const SPAM_MAP = new Map();

global.db = {
   users: {},
   groups: {},
   settings: {},
   chats: {},
   contacts: {},
   messages: {}
};
global.handler = null;

try {
   if (fs.existsSync(DATABASE)) {
      const data = JSON.parse(fs.readFileSync(DATABASE, "utf-8"));
      global.db = {
         ...global.db,
         users: data.users || {},
         groups: data.groups || {},
         settings: data.settings || {}
      };
      if (data.chats) store.chats = data.chats;
      if (data.contacts) store.contacts = data.contacts;
      if (data.messages) store.messages = data.messages;
   }
} catch (e) {
   console.error("Database Load Error:", { e });
}

const startConnection = async () => {
   const { state, saveCreds } = await useMultiFileAuthState(SESSION);

   const sock = makeWASocket({
      logger: STUB,
      printQRInTerminal: !connect.usePairingCode,
      auth: state,
      browser: Browsers.ubuntu("Chrome"),
      generateHighQualityLinkPreview: true,
      syncFullHistory: true,
      markOnlineOnConnect: true,
      keepAliveIntervalMs: 30000,
      getMessage: async (key) => {
         if (store) {
            const msg = await store.loadMessage(key.remoteJid, key.id);
            return msg?.message || undefined;
         }
         return proto.Message.fromObject({});
      }
   });

   store.bind(sock.ev);
   sock.map = PLUGIN_MAP;

   sock.ev.on("creds.update", saveCreds);

   sock.ev.on("connection.update", async (upd) => {
      const { connection, lastDisconnect } = upd;
      if (connection === "close") {
         const reason = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.statusCode;
         if (reason === DisconnectReason.badSession) {
            Log("Bad Session File, Please Delete Session and Scan Again", "ERROR");
            process.exit(1);
         } else if (reason === DisconnectReason.connectionClosed) {
            Log("Connection Closed, Reconnecting...", "WARN");
            startConnection();
         } else if (reason === DisconnectReason.connectionLost) {
            Log("Connection Lost from Server, reconnecting...", "WARN");
            startConnection();
         } else if (reason === DisconnectReason.connectionReplaced) {
            Log("Connection Replaced, Another New Session Opened, Please Close Current Session First", "ERROR");
            process.exit(1);
         } else if (reason === DisconnectReason.loggedOut) {
            Log("Device Logged Out, Please Delete Session and Scan Again.", "ERROR");
            process.exit(1);
         } else if (reason === DisconnectReason.restartRequired) {
            Log("Restart Required, Restarting...");
            startConnection();
         } else if (reason === DisconnectReason.timedOut) {
            Log("Connection TimedOut, Reconnecting...", "WARN");
            startConnection();
         } else {
            Log(`Unknown DisconnectReason: ${reason}|${connection}`, "ERROR");
            setTimeout(startConnection, 3000);
         }
      } else if (connection === "open") {
         Log("Connected to WhatsApp Server");
      }
   });

   if (connect.usePairingCode && !sock.authState.creds.registered) {
      try {
         let num = bot.number.replace(/[^0-9]/g, "");
         if (!num.startsWith("62")) num = "62" + num.substring(1);

         setTimeout(async () => {
            const code = await sock.requestPairingCode(num, connect.customPairingCode);
            console.log(chalk.blue.bold(" PAIRING CODE :"), chalk.reset(` ${code} \n`));
         }, 2500);
      } catch (e) {
         Log("Error: " + e, "ERROR");
      }
   }

   sock.decodeJid = (jid) => {
      if (!jid) return jid;
      if (/:\d+@/gi.test(jid)) {
         const dec = jidDecode(jid) || {};
         return (dec.user && dec.server && dec.user + "@" + dec.server) || jid;
      }
      return jid;
   };

   sock.getName = async (jid, noContact = false) => {
      const id = sock.decodeJid(jid);
      noContact = sock.withoutContact || noContact;
      let v;

      if (id.endsWith("@g.us")) {
         v = store.contacts[id] || await sock.groupMetadata(id).catch(() => ({}));
         return v.name || v.subject || parsePhoneNumber("+" + id.replace("@s.whatsapp.net", "")).format("INTERNATIONAL");
      }

      v = id === "0@s.whatsapp.net" ? { id, name: "WhatsApp" } : id === sock.decodeJid(sock.user.id) ? sock.user : (store.contacts[id] || {});
      return (noContact ? "" : v.name) || v.subject || v.verifiedName || parsePhoneNumber("+" + id.replace("@s.whatsapp.net", "")).format("INTERNATIONAL");
   };

   sock.getFile = async (PATH, asFile) => {
      let res, fileName;
      let data = Buffer.isBuffer(PATH) ? PATH :
         /^data:.*?\/.*?;base64,/i.test(PATH) ? Buffer.from(PATH.split`,`[1], "base64") :
         /^https?:\/\//.test(PATH) ? await (res = await fetch(PATH)).buffer() :
         fs.existsSync(PATH) ? (fileName = PATH, fs.readFileSync(PATH)) :
         typeof PATH === "string" ? PATH : Buffer.alloc(0);

      if (!Buffer.isBuffer(data)) throw new TypeError("Result is not a buffer");

      const type = await fileType.fromBuffer(data) || { mime: "application/octet-stream", ext: ".bin" };
      if (data && asFile && !fileName) {
         fileName = path.join(__dirname, `${TRASH}/${Date.now()}.${type.ext}`);
         await fs.promises.writeFile(fileName, data);
      }
      return { res, filename: fileName, ...type, data };
   };

   sock.sendMedia = async (jid, path, fileName = "", caption = "", quoted = "", opt = {}) => {
      const t = await sock.getFile(path, true);
      const { mime, data, filename } = t;

      if (t.res && t.res.status !== 200 || data.length <= 65536) {
         try { throw { json: JSON.parse(data.toString()) }; } catch (e) { if (e.json) throw e.json; }
      }

      let type = "", mtype = mime, pFile = filename;
      if (opt.asDocument) type = "document";

      if (opt.asSticker || /webp/.test(mime)) {
         const media = { mimetype: mime, data };
         pFile = await writeExif(media, {
            packname: opt.packname || sticker.name,
            author: opt.author || sticker.author,
            categories: opt.categories || []
         });
         await fs.promises.unlink(filename);
         type = "sticker";
         mtype = "image/webp";
      } else if (/image/.test(mime)) type = "image";
      else if (/video/.test(mime)) type = "video";
      else if (/audio/.test(mime)) type = "audio";
      else type = "document";

      await sock.sendMessage(jid, {
         [type]: { url: pFile },
         caption,
         mimetype: mtype,
         fileName,
         ...opt
      }, { quoted, ...opt });

      return fs.promises.unlink(pFile);
   };

   sock.sendText = (jid, text, quoted = "", opt) => sock.sendMessage(jid, { text, ...opt }, { quoted, ...opt });
   
   sock.sendImage = async (jid, path, caption = "", quoted = "", opt) => {
      const buf = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,` [1], "base64") : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0);
      return await sock.sendMessage(jid, { image: buf, caption, ...opt }, { quoted });
   };

   sock.sendVideo = async (jid, path, caption = "", quoted = "", gif = false, opt) => {
      const buf = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,` [1], "base64") : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0);
      return await sock.sendMessage(jid, { video: buf, caption, gifPlayback: gif, ...opt }, { quoted });
   };

   sock.sendAudio = async (jid, path, ptt = false, quoted = "", opt) => {
      const buf = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,` [1], "base64") : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0);
      return await sock.sendMessage(jid, { audio: buf, ptt, mimetype: "audio/mpeg", ...opt }, { quoted });
   };

   sock.sendSticker = async (jid, path, quoted = "", opt) => {
      const buf = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,` [1], "base64") : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0);
      const mime = await fileType.fromBuffer(buf);
      let sMedia;
      if (mime.ext === "webp") sMedia = buf;
      else if (mime.ext === "mp4") sMedia = await writeExifVid(buf);
      else sMedia = await writeExifImg(buf);
      await sock.sendMessage(jid, { sticker: sMedia, ...opt }, { quoted });
      return sMedia;
   };

   sock.sendDocument = async (jid, path, quoted = "", opt) => {
      const buf = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,` [1], "base64") : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0);
      return await sock.sendMessage(jid, { document: buf, ...opt }, { quoted });
   };

   sock.sendContact = async (jid, conts, quoted = "", opt = {}) => {
      const list = [];
      for (const cid of conts) {
         const name = await sock.getName(cid + "@s.whatsapp.net");
         list.push({
            displayName: name,
            vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${name}\nFN:${name}\nitem1.TEL;waid=${cid}:${cid}\nitem1.X-AB-Label:Mobile\nitem2.EMAIL;type=INTERNET:viooai.sn@gmail.com\nitem2.X-AB-Label:Email\nitem3.URL:https://sanjayasz.web.app\nitem3.X-AB-Label:Instagram\nitem4.ADR:;;Indonesia;;;;\nitem4.X-AB-Label:Region\nEND:VCARD`
         });
      }
      sock.sendMessage(jid, { contacts: { displayName: `${list.length} Contacts`, contacts: list }, ...opt }, { quoted });
   };

   sock.sendImageAsSticker = async (jid, path, quoted, opt = {}) => {
      const b = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,` [1], "base64") : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0);
      const buf = (opt && (opt.packname || opt.author)) ? await writeExifImg(b, opt) : await imageToWebp(b);
      await sock.sendMessage(jid, { sticker: { url: buf }, ...opt }, { quoted });
      return buf;
   };

   sock.sendVideoAsSticker = async (jid, path, quoted, opt = {}) => {
      const b = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,` [1], "base64") : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0);
      const buf = (opt && (opt.packname || opt.author)) ? await writeExifVid(b, opt) : await videoToWebp(b);
      await sock.sendMessage(jid, { sticker: { url: buf }, ...opt }, { quoted });
      return buf;
   };

   sock.imgToSticker = async (jid, path, quoted, opt = {}) => {
      const b = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,` [1], "base64") : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0);
      const buf = (opt && (opt.packname || opt.author)) ? await writeExifImg(b, opt) : await imageToWebp(b);
      await sock.sendMessage(jid, { sticker: { url: buf }, ...opt }, { quoted });
      return buf;
   };

   sock.vidToSticker = async (jid, path, quoted, opt = {}) => {
      const b = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,` [1], "base64") : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0);
      const buf = (opt && (opt.packname || opt.author)) ? await writeExifVid(b, opt) : await videoToWebp(b);
      await sock.sendMessage(jid, { sticker: { url: buf }, ...opt }, { quoted });
      return buf;
   };

   sock.sendStickerFromUrl = async (jid, PATH, quoted, opt = {}) => {
      const t = await sock.getFile(PATH, true);
      const { filename, mime, data } = t;
      const media = { mimetype: mime, data };
      const pFile = await writeExif(media, {
         packname: opt.packname || "",
         author: opt.author || "",
         categories: opt.categories || []
      });
      await fs.promises.unlink(filename);
      await sock.sendMessage(jid, { sticker: { url: pFile } }, { quoted });
      return fs.promises.unlink(pFile);
   };

   sock.public = true;
   sock.serializeM = (m) => smsg(sock, m, store);

   sock.downloadAndSaveMediaMessage = async (msg, fileName, attachExt = true) => {
      const q = msg.msg || msg;
      const mime = q.mimetype || "";
      const mtype = msg.mtype ? msg.mtype.replace(/Message/gi, "") : mime.split("/")[0];
      const stream = await downloadContentFromMessage(q, mtype);
      let buf = Buffer.from([]);
      for await (const chunk of stream) buf = Buffer.concat([buf, chunk]);
      const type = await fileType.fromBuffer(buf);
      const trueName = attachExt ? `${TRASH}/${fileName}.${type.ext}` : `${TRASH}/${fileName}`;
      await fs.writeFileSync(trueName, buf);
      return trueName;
   };

   sock.downloadMediaMessage = async (msg) => {
      const mime = (msg.msg || msg).mimetype || "";
      const mtype = msg.mtype ? msg.mtype.replace(/Message/gi, "") : mime.split("/")[0];
      const stream = await downloadContentFromMessage(msg, mtype);
      let buf = Buffer.from([]);
      for await (const chunk of stream) buf = Buffer.concat([buf, chunk]);
      return buf;
   };

   sock.setStatus = (status) => {
      sock.query({ tag: "iq", attrs: { to: "@s.whatsapp.net", type: "set", xmlns: "status" }, content: [{ tag: "status", attrs: {}, content: Buffer.from(status, "utf-8") }] });
      return status;
   };

   sock.copyNForward = async (jid, message, forceFwd = false, opt = {}) => {
      let vtype;
      if (opt.readViewOnce) {
         message.message = message.message && message.message.ephemeralMessage && message.message.ephemeralMessage.message ? message.message.ephemeralMessage.message : (message.message || undefined);
         vtype = Object.keys(message.message.viewOnceMessage.message)[0];
         delete(message.message && message.message.ignore ? message.message.ignore : (message.message || undefined));
         delete message.message.viewOnceMessage.message[vtype].viewOnce;
         message.message = { ...message.message.viewOnceMessage.message };
      }
      const mtype = Object.keys(message.message)[0];
      const content = await generateForwardMessageContent(message, forceFwd);
      const ctype = Object.keys(content)[0];
      let ctx = {};
      if (mtype != "conversation") ctx = message.message[mtype].contextInfo;
      content[ctype].contextInfo = { ...ctx, ...content[ctype].contextInfo };
      const waMsg = await generateWAMessageFromContent(jid, content, opt ? { ...content[ctype], ...opt, ...(opt.contextInfo ? { contextInfo: { ...content[ctype].contextInfo, ...opt.contextInfo } } : {}) } : {});
      await sock.relayMessage(jid, waMsg.message, { messageId: waMsg.key.id });
      return waMsg;
   };

   sock.ev.on("call", async (cData) => {
      const conf = global.db.settings.antiCall;
      if (!conf) return;

      for (const c of cData) {
         if (c.status === "offer") {
            const caller = c.from;
            if (owner.number.includes(caller.split("@")[0])) continue;

            const isVideo = c.isVideo;
            if ((isVideo && conf.video) || (!isVideo && conf.voice)) {
               if (conf.reject) await sock.rejectCall(c.id, caller);
               if (conf.block) await sock.updateBlockStatus(caller, "block");
               if (conf.log) Log(`Rejected ${isVideo ? "Video" : "Voice"} call from ${caller}`, "WARN");
               if (message.rejectCall) await sock.sendMessage(caller, { text: message.rejectCall });
            }
         }
      }
   });

   sock.ev.on("contacts.update", upd => {
      for (const c of upd) {
         const id = sock.decodeJid(c.id);
         if (store && store.contacts) store.contacts[id] = { id, name: c.notify };
      }
   });

   sock.ev.on("messages.upsert", async (chatUpdate) => {
      if (chatUpdate.type !== "notify") return;
      const message = chatUpdate.messages[0];
      if (!message.message) return;
      if (message.key && message.key.remoteJid === "status@broadcast") return;
      if (!global.handler) return;

      (async () => {
         try {
            message.message = (Object.keys(message.message)[0] === "ephemeralMessage") ? message.message.ephemeralMessage.message : message.message;
            if (message.key.remoteJid.includes("@lid")) message.key.remoteJid = jidDecode(message.key.remoteJid).user + "@s.whatsapp.net";
            if (message.key.fromMe) return;

            const m = smsg(sock, message, store);
            const conf = global.db.settings.antiSpam;

            if (conf && conf.active && !m.key.fromMe) {
               if (!owner.number.includes(m.sender.split("@")[0])) {
                  const now = Date.now();
                  const timeWindow = parseTime(conf.time);
                  const limit = conf.max;

                  let userData = SPAM_MAP.get(m.sender) || { count: 0, last: 0 };

                  if (now - userData.last > timeWindow) {
                     userData = { count: 1, last: now };
                  } else {
                     userData.count++;
                  }

                  SPAM_MAP.set(m.sender, userData);

                  if (userData.count > limit) return;
               }
            }

            global.handler(sock, m, chatUpdate, store);
         } catch (e) {
            console.error(e);
         }
      })();
   });

   return sock;
};

const save = () => {
   try {
      const data = {
         users: global.db.users,
         groups: global.db.groups,
         settings: global.db.settings,
         chats: store.chats,
         contacts: store.contacts,
         messages: store.messages
      };

      fs.writeFileSync(DATABASE, JSON.stringify(data, null, 4));
   } catch (e) {
      console.error(e);
   }
};

const sweep = (dir) => {
   if (!fs.existsSync(dir)) return;
   fs.readdir(dir, (e, files) => {
      if (e) return;
      const now = Date.now();
      const conf = global.db.settings.autoClear;
      const exp = parseTime(conf.time);

      files.forEach(f => {
         const p = path.join(dir, f);
         fs.stat(p, (e, s) => {
            if (e) return;
            if (now > (new Date(s.ctime).getTime() + exp)) fs.unlink(p, () => {});
         });
      });
   });
};

setInterval(save, 25000);
setInterval(() => {
   if (!global.db.settings.autoClear.active) return;
   sweep(CACHE);
   sweep(TRASH);
}, 300000);

import { createRequire } from "module";

const require = createRequire(import.meta.url);

const load = async (isUpdate = false) => {
   try {
      const hPath = path.join(__dirname, "../handler.js");
      const hUrl = pathToFileURL(hPath).href;
      global.handler = (await import(hUrl + (isUpdate ? `?update=${Date.now()}` : ''))).default;
   } catch (e) {
      console.error("Error loading handler:", { e });
   }
};

const plugins = async (dir) => {
   try {
      const files = fs.readdirSync(dir, { withFileTypes: true });
      for (const f of files) {
         const full = path.join(dir, f.name);
         if (f.isDirectory()) {
            await plugins(full);
         } else if (f.name.endsWith(".js")) {
            try {
               const mod = (await import(pathToFileURL(full).href + `?update=${Date.now()}`)).default;
               for (const key in mod) {
                  if (mod[key]?.async && mod[key]?.usage) {
                     const cmds = Array.isArray(mod[key].usage) ? mod[key].usage : [mod[key].usage];
                     cmds.forEach(cmd => PLUGIN_MAP.set(cmd, mod[key]));
                  }
               }
            } catch (e) {
               console.error(`Error plugin ${f.name}:`, { e });
            }
         }
      }
   } catch (e) {
      console.error(`Error plugins:`, { e });
   }
};

const processedFiles = new Set();
const watchAll = (dir) => {
   fs.watch(dir, { recursive: true }, async (evt, name) => {
      if (!name) return;

      const fullPath = path.join(dir, name);
      if (fullPath.includes("node_modules") || fullPath.includes(".npm") || fullPath.includes(".cache") || fullPath.includes("store.json") || fullPath.includes(connect.session.name)) return;

      if (processedFiles.has(fullPath)) return;
      processedFiles.add(fullPath);
      setTimeout(() => processedFiles.delete(fullPath), 200); 

      console.log(chalk.yellow(`ㅤ\nUpdate ${name}\n`));

      if (name.endsWith(".js")) {
         try {
            if (name.includes("handler.js")) {
               await load(true);
            } else if (fullPath.includes("plugins")) {
               const mod = (await import(pathToFileURL(fullPath).href + `?update=${Date.now()}`)).default;
               for (const key in mod) {
                   if (mod[key]?.async && mod[key]?.usage) {
                       const cmds = Array.isArray(mod[key].usage) ? mod[key].usage : [mod[key].usage];
                       cmds.forEach(cmd => PLUGIN_MAP.set(cmd, mod[key]));
                   }
               }
            } else {
               const relativePath = path.relative(__dirname, fullPath);
               if (require.cache[fullPath]) delete require.cache[fullPath]; 
            }
         } catch (e) {
            console.error(`Reload Error ${name}:`, { e });
         }
      }
   });
};

if (!global.isLogModified) {
  const c = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error
  };

  global.isLogModified = true;

  ['log', 'info', 'warn', 'error'].forEach(m => {
    console[m] = (...a) => {
       try {
         return checkRaw(a) ? c[m](...a) : c[m](doFormat(a));
       } catch (e) {
         return c[m](...a);
       }
    };
  });
}

connectDatabase().then(async () => {
   console.log(chalk.blue.bold("ㅤ\n SERVER INFO") + chalk.white.bold(`
  • Platform: ${os.type()}
  • Architecture: ${os.arch()}
  • Node.js: ${process.version}
  • Uptime OS: ${runtime(os.uptime())}
`));
   await load();
   await plugins(PLUGIN);

   Log(`Successfully loaded ${PLUGIN_MAP.size} plugins`, "INFO", { bottom: true });

   await startConnection();
   watchAll(ROOT_DIR);
});

process.on("uncaughtException", e => console.error("Uncaught Exception:", { e }));

process.on("unhandledRejection", (r, p) => console.error("Unhandled Rejection:", r));

fs.unwatchFile(__filename);
fs.watchFile(__filename, () => {
   fs.unwatchFile(__filename);
   console.log(`ㅤ\nUpdate ${__filename}\n`);
   process.exit();
});